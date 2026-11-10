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
exports.CATEGORY_DIRECTORY_NAME = void 0;
exports.listCategoryFiles = listCategoryFiles;
exports.parseCategoryFile = parseCategoryFile;
const fs_1 = require("fs");
const path = __importStar(require("path"));
const errors_1 = require("./errors");
const pathUtils_1 = require("./pathUtils");
exports.CATEGORY_DIRECTORY_NAME = 'categorization-of-content';
/**
 * Lists every category file inside `<projectRoot>/categorization-of-content`,
 * sorted by file name. Throws a descriptive error when the folder is missing
 * or unreadable.
 */
async function listCategoryFiles(projectRoot) {
    const directoryPath = path.join(projectRoot, exports.CATEGORY_DIRECTORY_NAME);
    let entries;
    try {
        entries = await fs_1.promises.readdir(directoryPath, { withFileTypes: true });
    }
    catch (err) {
        const code = err.code;
        if (code === 'ENOENT') {
            throw new Error(`Folder '${exports.CATEGORY_DIRECTORY_NAME}' was not found in the project root.`);
        }
        throw new Error(`Cannot read '${exports.CATEGORY_DIRECTORY_NAME}': ${(0, errors_1.errorMessage)(err)}`);
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
async function parseCategoryFile(absolutePath) {
    let text;
    try {
        const buffer = await fs_1.promises.readFile(absolutePath);
        text = buffer.toString('utf8');
    }
    catch (err) {
        throw new Error(`Cannot read category file '${absolutePath}': ${(0, errors_1.errorMessage)(err)}`);
    }
    const includes = [];
    const excludes = [];
    for (const line of text.split(/\r\n|\n|\r/)) {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed.startsWith('#')) {
            continue;
        }
        if (trimmed.startsWith('!')) {
            const excluded = (0, pathUtils_1.normalizeRelPath)(trimmed.slice(1));
            if (excluded !== '') {
                excludes.push(excluded);
            }
            continue;
        }
        const included = (0, pathUtils_1.normalizeRelPath)(trimmed);
        if (included !== '') {
            includes.push(included);
        }
    }
    return { includes, excludes };
}
//# sourceMappingURL=categoryService.js.map