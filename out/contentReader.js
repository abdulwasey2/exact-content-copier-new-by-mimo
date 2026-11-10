"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readFileExact = readFileExact;
const fs_1 = require("fs");
/**
 * Reads a file in the most faithful way possible.
 *
 * The file is read as a raw byte buffer and decoded as UTF-8 with zero
 * transformation. The returned string is used verbatim downstream: it is never
 * trimmed, never re-indented, never line-split, and its line endings (`\n`,
 * `\r\n`, or a mix), trailing whitespace, blank lines and final-newline state
 * are preserved exactly as stored on disk.
 *
 * NOTE: files are interpreted as UTF-8 text. A UTF-8 BOM, if present, is kept
 * as an ordinary character (U+FEFF) at the start of the content.
 */
async function readFileExact(absolutePath) {
    const buffer = await fs_1.promises.readFile(absolutePath);
    return buffer.toString('utf8');
}
//# sourceMappingURL=contentReader.js.map