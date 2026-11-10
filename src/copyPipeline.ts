import { parseCategoryFile } from './categoryService';
import { readFileExact } from './contentReader';
import { errorMessage } from './errors';
import {
    assembleOutput,
    buildErrorEntry,
    buildFileEntry,
    buildNotFoundEntry
} from './markdownBuilder';
import { resolveWorkItems } from './pathResolver';

export interface CopyStats {
    readonly filesCopied: number;
    readonly filesSkipped: number;
    readonly pathsNotFound: number;
}

export interface CopyOutcome {
    readonly output: string;
    readonly stats: CopyStats;
}

/**
 * Runs the whole copy pipeline and returns the assembled Markdown plus
 * statistics. Never throws for per-file problems: individual failures become
 * visible `ERROR` / `NOT FOUND` entries and are counted.
 */
export async function runCopyPipeline(
    projectRoot: string,
    categoryFilePath: string,
    onProgress: (message: string) => void
): Promise<CopyOutcome> {
    onProgress('Reading category file...');
    const paths = await parseCategoryFile(categoryFilePath);

    onProgress('Discovering files...');
    const items = await resolveWorkItems(projectRoot, paths);

    const entries: string[] = [];
    let filesCopied = 0;
    let filesSkipped = 0;
    let pathsNotFound = 0;
    const total = items.length;

    for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const position = `[${index + 1}/${total}]`;

        if (item.kind === 'notFound') {
            onProgress(`${position} Path not found: ${item.relativePath}`);
            entries.push(buildNotFoundEntry(item.relativePath));
            pathsNotFound += 1;
            // Per the specification, missing paths are also counted as skipped.
            filesSkipped += 1;
            continue;
        }

        if (item.kind === 'error') {
            onProgress(`${position} Error: ${item.relativePath}`);
            entries.push(buildErrorEntry(item.relativePath, item.message));
            filesSkipped += 1;
            continue;
        }

        onProgress(`${position} Processing ${item.relativePath}`);
        try {
            const content = await readFileExact(item.absolutePath);
            entries.push(buildFileEntry(item.relativePath, content));
            filesCopied += 1;
        } catch (err) {
            entries.push(buildErrorEntry(item.relativePath, errorMessage(err)));
            filesSkipped += 1;
        }
    }

    return {
        output: assembleOutput(entries),
        stats: { filesCopied, filesSkipped, pathsNotFound }
    };
}