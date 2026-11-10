import { promises as fs } from 'fs';
import * as path from 'path';

import { errorMessage } from './errors';
import { normalizeRelPath } from './pathUtils';

export const CATEGORY_DIRECTORY_NAME = 'categorization-of-content';

export interface CategoryDefinition {
    readonly fileName: string;
    readonly absolutePath: string;
}

export interface CategoryPaths {
    /** Paths to include, in the order they appear in the category file. */
    readonly includes: string[];
    /** Paths that must never be copied, regardless of what else is included. */
    readonly excludes: string[];
}

/**
 * Lists every category file inside `<projectRoot>/categorization-of-content`,
 * sorted by file name. Throws a descriptive error when the folder is missing
 * or unreadable.
 */
export async function listCategoryFiles(projectRoot: string): Promise<CategoryDefinition[]> {
    const directoryPath = path.join(projectRoot, CATEGORY_DIRECTORY_NAME);

    let entries;
    try {
        entries = await fs.readdir(directoryPath, { withFileTypes: true });
    } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ENOENT') {
            throw new Error(`Folder '${CATEGORY_DIRECTORY_NAME}' was not found in the project root.`);
        }
        throw new Error(`Cannot read '${CATEGORY_DIRECTORY_NAME}': ${errorMessage(err)}`);
    }

    return entries
        .filter((entry) => entry.isFile() || entry.isSymbolicLink())
        .map((entry) => entry.name)
        .sort()
        .map((fileName) => ({ fileName, absolutePath: path.join(directoryPath, fileName) }));
}

/**
 * Parses one category file into inclusion and exclusion lists.
 *
 * Rules:
 * - one path per line, relative to the project root
 * - a leading `!` marks an exclusion (exclusions always win, whatever their order)
 * - a leading `#` marks a comment line
 * - blank lines are ignored
 *
 * Only these configuration lines are trimmed — file contents are never touched.
 */
export async function parseCategoryFile(absolutePath: string): Promise<CategoryPaths> {
    let text: string;
    try {
        const buffer = await fs.readFile(absolutePath);
        text = buffer.toString('utf8');
    } catch (err) {
        throw new Error(`Cannot read category file '${absolutePath}': ${errorMessage(err)}`);
    }

    const includes: string[] = [];
    const excludes: string[] = [];

    for (const line of text.split(/\r\n|\n|\r/)) {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed.startsWith('#')) {
            continue;
        }
        if (trimmed.startsWith('!')) {
            const excluded = normalizeRelPath(trimmed.slice(1));
            if (excluded !== '') {
                excludes.push(excluded);
            }
            continue;
        }
        const included = normalizeRelPath(trimmed);
        if (included !== '') {
            includes.push(included);
        }
    }

    return { includes, excludes };
}