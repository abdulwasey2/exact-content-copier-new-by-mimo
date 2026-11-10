"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveWorkItems = resolveWorkItems;
const fs_1 = require("fs");
const path = __importStar(require("path"));
const errors_1 = require("./errors");
const pathUtils_1 = require("./pathUtils");
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
async function resolveWorkItems(projectRoot, paths) {
    const items = [];
    const scheduledFiles = new Set();
    const visitedDirectories = new Set();
    const rootReal = await realPathOrFallback(projectRoot);
    const isExcluded = (relativePath) => {
        for (const excluded of paths.excludes) {
            if (relativePath === excluded || relativePath.startsWith(excluded + '/')) {
                return true;
            }
        }
        return false;
    };
    const scheduleFile = (relativePath, absolutePath) => {
        if (scheduledFiles.has(relativePath)) {
            return;
        }
        scheduledFiles.add(relativePath);
        items.push({ kind: 'file', relativePath, absolutePath });
    };
    const collectDirectory = async (directoryAbsolute, directoryRelative) => {
        const collected = [];
        const walk = async (walkAbsolute, walkRelative) => {
            const realDirectory = await safeRealPath(walkAbsolute);
            if (realDirectory === null) {
                items.push({
                    kind: 'error',
                    relativePath: walkRelative,
                    message: 'Cannot resolve the real path of the directory'
                });
                return;
            }
            if (!(0, pathUtils_1.isInsideRoot)(rootReal, realDirectory)) {
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
                entries = await fs_1.promises.readdir(walkAbsolute, { withFileTypes: true });
            }
            catch (err) {
                items.push({
                    kind: 'error',
                    relativePath: walkRelative,
                    message: `Cannot read directory: ${(0, errors_1.errorMessage)(err)}`
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
        const handleSymbolicLink = async (linkAbsolute, linkRelative) => {
            let linkStats;
            try {
                linkStats = await fs_1.promises.stat(linkAbsolute);
            }
            catch {
                items.push({ kind: 'error', relativePath: linkRelative, message: 'Broken symbolic link' });
                return;
            }
            if (linkStats.isDirectory()) {
                await walk(linkAbsolute, linkRelative);
                return;
            }
            if (linkStats.isFile()) {
                const realFile = await safeRealPath(linkAbsolute);
                if (realFile === null || !(0, pathUtils_1.isInsideRoot)(rootReal, realFile)) {
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
        collected.sort((a, b) => a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0);
        for (const file of collected) {
            scheduleFile(file.relativePath, file.absolutePath);
        }
    };
    for (const include of paths.includes) {
        const includeRelative = (0, pathUtils_1.normalizeRelPath)(include);
        if (includeRelative === '') {
            continue;
        }
        // A path that is itself excluded is never copied, even if listed directly.
        if (isExcluded(includeRelative)) {
            continue;
        }
        const includeAbsolute = (0, pathUtils_1.resolveWithinRoot)(projectRoot, includeRelative);
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
            stats = await fs_1.promises.stat(includeAbsolute);
        }
        catch (err) {
            const code = err.code;
            if (code === 'ENOENT' || code === 'ENOTDIR') {
                items.push({ kind: 'notFound', relativePath: includeRelative });
            }
            else {
                items.push({
                    kind: 'error',
                    relativePath: includeRelative,
                    message: `Cannot access path: ${(0, errors_1.errorMessage)(err)}`
                });
            }
            continue;
        }
        if (stats.isFile()) {
            const realFile = await safeRealPath(includeAbsolute);
            if (realFile === null || !(0, pathUtils_1.isInsideRoot)(rootReal, realFile)) {
                items.push({
                    kind: 'error',
                    relativePath: includeRelative,
                    message: 'Symbolic link resolves outside the project root'
                });
                continue;
            }
            scheduleFile(includeRelative, includeAbsolute);
        }
        else if (stats.isDirectory()) {
            await collectDirectory(includeAbsolute, includeRelative);
        }
        else {
            items.push({
                kind: 'error',
                relativePath: includeRelative,
                message: 'Not a regular file or directory'
            });
        }
    }
    return items;
}
async function safeRealPath(absolutePath) {
    try {
        return await fs_1.promises.realpath(absolutePath);
    }
    catch {
        return null;
    }
}
async function realPathOrFallback(absolutePath) {
    return (await safeRealPath(absolutePath)) ?? path.resolve(absolutePath);
}
//# sourceMappingURL=pathResolver.js.map