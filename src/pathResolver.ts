import { promises as fs } from 'fs';
import * as path from 'path';

import { CategoryPaths } from './categoryService';
import { errorMessage } from './errors';
import { isInsideRoot, normalizeRelPath, resolveWithinRoot } from './pathUtils';

/**
 * A resolved unit of work, produced before any content is read so that the
 * progress indicator can report accurate totals.
 */
export type WorkItem =
    | { readonly kind: 'file'; readonly relativePath: string; readonly absolutePath: string }
    | { readonly kind: 'notFound'; readonly relativePath: string }
    | { readonly kind: 'error'; readonly relativePath: string; readonly message: string };

/**
 * Turns the parsed category paths into an ordered list of work items.
 *
 * Guarantees:
 * - Exclusions always win, in any order, for direct includes and for files
 *   discovered through recursive folder traversal.
 * - Folder contents are discovered recursively and sorted alphabetically by
 *   their project-relative paths.
 * - Every file is scheduled at most once, even when several included paths
 *   point to it.
 * - Nothing outside the project root is ever read: lexical containment is
 *   enforced first, and symbolic links are re-checked against their real path.
 * - Missing paths and unreadable paths become `notFound` / `error` items
 *   instead of aborting the run.
 */
export async function resolveWorkItems(
    projectRoot: string,
    paths: CategoryPaths
): Promise<WorkItem[]> {
    const items: WorkItem[] = [];
    const scheduledFiles = new Set<string>();
    const visitedDirectories = new Set<string>();
    const rootReal = await realPathOrFallback(projectRoot);

    const isExcluded = (relativePath: string): boolean => {
        for (const excluded of paths.excludes) {
            if (relativePath === excluded || relativePath.startsWith(excluded + '/')) {
                return true;
            }
        }
        return false;
    };

    const scheduleFile = (relativePath: string, absolutePath: string): void => {
        if (scheduledFiles.has(relativePath)) {
            return;
        }
        scheduledFiles.add(relativePath);
        items.push({ kind: 'file', relativePath, absolutePath });
    };

    const collectDirectory = async (
        directoryAbsolute: string,
        directoryRelative: string
    ): Promise<void> => {
        const collected: Array<{ relativePath: string; absolutePath: string }> = [];

        const walk = async (walkAbsolute: string, walkRelative: string): Promise<void> => {
            const realDirectory = await safeRealPath(walkAbsolute);
            if (realDirectory === null) {
                items.push({
                    kind: 'error',
                    relativePath: walkRelative,
                    message: 'Cannot resolve the real path of the directory'
                });
                return;
            }
            if (!isInsideRoot(rootReal, realDirectory)) {
                items.push({
                    kind: 'error',
                    relativePath: walkRelative,
                    message: 'Directory resolves outside the project root'
                });
                return;
            }
            if (visitedDirectories.has(realDirectory)) {
                return;
            }
            visitedDirectories.add(realDirectory);

            let entries;
            try {
                entries = await fs.readdir(walkAbsolute, { withFileTypes: true });
            } catch (err) {
                items.push({
                    kind: 'error',
                    relativePath: walkRelative,
                    message: `Cannot read directory: ${errorMessage(err)}`
                });
                return;
            }

            for (const entry of entries) {
                const childRelative = walkRelative === '' ? entry.name : `${walkRelative}/${entry.name}`;

                // Exclusions win for folders and files alike, and nothing beneath an
                // excluded folder is ever visited.
                if (isExcluded(childRelative)) {
                    continue;
                }

                const childAbsolute = path.join(walkAbsolute, entry.name);

                if (entry.isDirectory()) {
                    await walk(childAbsolute, childRelative);
                    continue;
                }
                if (entry.isFile()) {
                    collected.push({ relativePath: childRelative, absolutePath: childAbsolute });
                    continue;
                }
                if (entry.isSymbolicLink()) {
                    await handleSymbolicLink(childAbsolute, childRelative);
                    continue;
                }
                // Sockets, FIFOs and device nodes are silently ignored.
            }
        };

        const handleSymbolicLink = async (
            linkAbsolute: string,
            linkRelative: string
        ): Promise<void> => {
            let linkStats;
            try {
                linkStats = await fs.stat(linkAbsolute);
            } catch {
                items.push({ kind: 'error', relativePath: linkRelative, message: 'Broken symbolic link' });
                return;
            }
            if (linkStats.isDirectory()) {
                await walk(linkAbsolute, linkRelative);
                return;
            }
            if (linkStats.isFile()) {
                const realFile = await safeRealPath(linkAbsolute);
                if (realFile === null || !isInsideRoot(rootReal, realFile)) {
                    items.push({
                        kind: 'error',
                        relativePath: linkRelative,
                        message: 'Symbolic link resolves outside the project root'
                    });
                    return;
                }
                collected.push({ relativePath: linkRelative, absolutePath: linkAbsolute });
            }
        };

        await walk(directoryAbsolute, directoryRelative);

        // Files discovered inside one folder are sorted alphabetically by their
        // project-relative paths before being scheduled.
        collected.sort((a, b) =>
            a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0
        );
        for (const file of collected) {
            scheduleFile(file.relativePath, file.absolutePath);
        }
    };

    for (const include of paths.includes) {
        const includeRelative = normalizeRelPath(include);
        if (includeRelative === '') {
            continue;
        }
        // A path that is itself excluded is never copied, even if listed directly.
        if (isExcluded(includeRelative)) {
            continue;
        }

        const includeAbsolute = resolveWithinRoot(projectRoot, includeRelative);
        if (includeAbsolute === null) {
            items.push({
                kind: 'error',
                relativePath: includeRelative,
                message: 'Path is outside the project root'
            });
            continue;
        }

        let stats;
        try {
            stats = await fs.stat(includeAbsolute);
        } catch (err) {
            const code = (err as NodeJS.ErrnoException).code;
            if (code === 'ENOENT' || code === 'ENOTDIR') {
                items.push({ kind: 'notFound', relativePath: includeRelative });
            } else {
                items.push({
                    kind: 'error',
                    relativePath: includeRelative,
                    message: `Cannot access path: ${errorMessage(err)}`
                });
            }
            continue;
        }

        if (stats.isFile()) {
            const realFile = await safeRealPath(includeAbsolute);
            if (realFile === null || !isInsideRoot(rootReal, realFile)) {
                items.push({
                    kind: 'error',
                    relativePath: includeRelative,
                    message: 'Symbolic link resolves outside the project root'
                });
                continue;
            }
            scheduleFile(includeRelative, includeAbsolute);
        } else if (stats.isDirectory()) {
            await collectDirectory(includeAbsolute, includeRelative);
        } else {
            items.push({
                kind: 'error',
                relativePath: includeRelative,
                message: 'Not a regular file or directory'
            });
        }
    }

    return items;
}

async function safeRealPath(absolutePath: string): Promise<string | null> {
    try {
        return await fs.realpath(absolutePath);
    } catch {
        return null;
    }
}

async function realPathOrFallback(absolutePath: string): Promise<string> {
    return (await safeRealPath(absolutePath)) ?? path.resolve(absolutePath);
}