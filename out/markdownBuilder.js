"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildFileEntry = buildFileEntry;
exports.buildNotFoundEntry = buildNotFoundEntry;
exports.buildErrorEntry = buildErrorEntry;
exports.assembleOutput = assembleOutput;
const languageDetector_1 = require("./languageDetector");
/**
 * Output assembly.
 *
 * File contents are inserted verbatim between dynamically sized Markdown code
 * fences. Everything this module generates (path heading, fences, separators,
 * the trailing-newline note) lives OUTSIDE the fenced content, so the original
 * text can never be modified by the Markdown structure around it.
 *
 * Fence sizing: the fence is always at least one backtick longer than the
 * longest backtick run inside the content, so embedded Markdown fences or
 * backtick runs can never terminate the block early.
 *
 * Final-newline handling:
 * - Content that ends with '\n' is followed directly by the closing fence. The
 *   bytes between the fences are then exactly the file bytes.
 * - Content that does NOT end with '\n' cannot be represented faithfully — the
 *   closing fence must start on its own line — so one line break is inserted
 *   and an explicit note is appended after the block.
 * - An empty file needs no inserted break: the two fence lines enclose zero
 *   characters, which is exactly its content.
 */
const ENTRY_SEPARATOR = '\n\n---\n\n';
const NO_TRAILING_NEWLINE_NOTE = '\n\n> ⚠️ Note: this file does not end with a newline in its original form. ' +
    'Markdown requires the closing code fence to start on its own line, so exactly one line break was inserted between the content and the closing fence. ' +
    'That inserted line break is NOT part of the file content.';
function buildFileEntry(relativePath, content) {
    const fence = codeFenceFor(content);
    const language = (0, languageDetector_1.detectLanguage)(relativePath);
    const needsFormattingNewline = content.length > 0 && !content.endsWith('\n');
    let entry = `📄 ${inlineCode(relativePath)}\n\n${fence}${language}\n${content}`;
    if (needsFormattingNewline) {
        entry += '\n';
    }
    entry += fence;
    if (needsFormattingNewline) {
        entry += NO_TRAILING_NEWLINE_NOTE;
    }
    return entry;
}
function buildNotFoundEntry(relativePath) {
    return `⚠️ NOT FOUND: ${relativePath}`;
}
function buildErrorEntry(relativePath, message) {
    return `❌ ERROR: ${relativePath} - ${message}`;
}
function assembleOutput(entries) {
    return entries.join(ENTRY_SEPARATOR);
}
function codeFenceFor(content) {
    return '`'.repeat(Math.max(3, maxBacktickRun(content) + 1));
}
function inlineCode(text) {
    const ticks = '`'.repeat(Math.max(1, maxBacktickRun(text) + 1));
    const needsPadding = ticks.length > 1 ||
        text.startsWith('`') ||
        text.endsWith('`') ||
        text.startsWith(' ') ||
        text.endsWith(' ');
    return needsPadding ? `${ticks} ${text} ${ticks}` : `${ticks}${text}${ticks}`;
}
function maxBacktickRun(text) {
    let longest = 0;
    let current = 0;
    for (let i = 0; i < text.length; i++) {
        if (text.charCodeAt(i) === 96 /* ` */) {
            current++;
            if (current > longest) {
                longest = current;
            }
        }
        else {
            current = 0;
        }
    }
    return longest;
}
//# sourceMappingURL=markdownBuilder.js.map