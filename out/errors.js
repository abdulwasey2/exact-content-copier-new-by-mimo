"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMessage = errorMessage;
/**
 * Formats any thrown value into a human-readable message without assuming it
 * is an `Error` instance.
 */
function errorMessage(err) {
    return err instanceof Error ? err.message : String(err);
}
//# sourceMappingURL=errors.js.map