"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCopyPipeline = runCopyPipeline;
const categoryService_1 = require("./categoryService");
const contentReader_1 = require("./contentReader");
const errors_1 = require("./errors");
const markdownBuilder_1 = require("./markdownBuilder");
const pathResolver_1 = require("./pathResolver");
/**
 * Runs the whole copy pipeline and returns the assembled Markdown plus
 * statistics. Never throws for per-file problems: individual failures become
 * visible `ERROR` / `NOT FOUND` entries and are counted.
 */
async function runCopyPipeline(projectRoot, categoryFilePath, onProgress) {
    onProgress('Reading category file...');
    const paths = await (0, categoryService_1.parseCategoryFile)(categoryFilePath);
    onProgress('Discovering files...');
    const items = await (0, pathResolver_1.resolveWorkItems)(projectRoot, paths);
    const entries = [];
    let filesCopied = 0;
    let filesSkipped = 0;
    let pathsNotFound = 0;
    const total = items.length;
    for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const position = `[${index + 1}/${total}]`;
        if (item.kind === 'notFound') {
            onProgress(`${position} Path not found: ${item.relativePath}`);
            entries.push((0, markdownBuilder_1.buildNotFoundEntry)(item.relativePath));
            pathsNotFound += 1;
            // Per the specification, missing paths are also counted as skipped.
            filesSkipped += 1;
            continue;
        }
        if (item.kind === 'error') {
            onProgress(`${position} Error: ${item.relativePath}`);
            entries.push((0, markdownBuilder_1.buildErrorEntry)(item.relativePath, item.message));
            filesSkipped += 1;
            continue;
        }
        onProgress(`${position} Processing ${item.relativePath}`);
        try {
            const content = await (0, contentReader_1.readFileExact)(item.absolutePath);
            entries.push((0, markdownBuilder_1.buildFileEntry)(item.relativePath, content));
            filesCopied += 1;
        }
        catch (err) {
            entries.push((0, markdownBuilder_1.buildErrorEntry)(item.relativePath, (0, errors_1.errorMessage)(err)));
            filesSkipped += 1;
        }
    }
    return {
        output: (0, markdownBuilder_1.assembleOutput)(entries),
        stats: { filesCopied, filesSkipped, pathsNotFound }
    };
}
//# sourceMappingURL=copyPipeline.js.map