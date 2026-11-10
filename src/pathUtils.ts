import * as path from 'path';

/**
 * Path helpers shared by the category parser and the resolver.
 *
 * Every project-relative path is stored and compared in POSIX form (`/`
 * separators, no trailing slash) so that inclusion/exclusion matching and the
 * rendered output behave identically on every operating system.
 */

export function toPosix(input: string): string {
    return input.replace(/\\/g, '/');
}

/**
 * Normalizes a raw line from a category file into its canonical
 * project-relative POSIX form. Returns '' for lines that cannot represent a
 * project-relative path (empty strings, '.', ...). Leading '/' is treated as
 * "relative to the project root", never as an absolute filesystem path.
 */
export function normalizeRelPath(raw: string): string {
    let value = toPosix(raw.trim());
    value = value.replace(/\/{2,}/g, '/');
    while (value.startsWith('/')) {
        value = value.slice(1);
    }
    while (value.startsWith('./')) {
        value = value.slice(2);
    }
    while (value.length > 1 && value.endsWith('/')) {
        value = value.slice(0, -1);
    }
    if (value === '' || value === '.') {
        return '';
    }
    return value;
}

/**
 * Resolves `relativePath` against the project root and returns the absolute
 * path — but only when the result stays inside the project root. Anything that
 * would escape the root (`../`, drive-absolute paths, ...) yields `null`.
 */
export function resolveWithinRoot(projectRoot: string, relativePath: string): string | null {
    const absolute = path.resolve(projectRoot, relativePath);
    const backToRoot = path.relative(projectRoot, absolute);
    if (backToRoot === '') {
        return null;
    }
    if (path.isAbsolute(backToRoot) || backToRoot === '..' || backToRoot.startsWith('..' + path.sep)) {
        return null;
    }
    return absolute;
}

/** True when `targetAbsolute` is the root itself or located inside it. */
export function isInsideRoot(rootAbsolute: string, targetAbsolute: string): boolean {
    const backToRoot = path.relative(rootAbsolute, targetAbsolute);
    if (backToRoot === '') {
        return true;
    }
    return !path.isAbsolute(backToRoot) && backToRoot !== '..' && !backToRoot.startsWith('..' + path.sep);
}