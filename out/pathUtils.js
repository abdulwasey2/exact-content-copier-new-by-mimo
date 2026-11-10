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
exports.toPosix = toPosix;
exports.normalizeRelPath = normalizeRelPath;
exports.resolveWithinRoot = resolveWithinRoot;
exports.isInsideRoot = isInsideRoot;
const path = __importStar(require("path"));
/**
 * Path helpers shared by the category parser and the resolver.
 *
 * Every project-relative path is stored and compared in POSIX form (`/`
 * separators, no trailing slash) so that inclusion/exclusion matching and the
 * rendered output behave identically on every operating system.
 */
function toPosix(input) {
    return input.replace(/\\/g, '/');
}
/**
 * Normalizes a raw line from a category file into its canonical
 * project-relative POSIX form. Returns '' for lines that cannot represent a
 * project-relative path (empty strings, '.', ...). Leading '/' is treated as
 * "relative to the project root", never as an absolute filesystem path.
 */
function normalizeRelPath(raw) {
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
function resolveWithinRoot(projectRoot, relativePath) {
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
function isInsideRoot(rootAbsolute, targetAbsolute) {
    const backToRoot = path.relative(rootAbsolute, targetAbsolute);
    if (backToRoot === '') {
        return true;
    }
    return !path.isAbsolute(backToRoot) && backToRoot !== '..' && !backToRoot.startsWith('..' + path.sep);
}
//# sourceMappingURL=pathUtils.js.map