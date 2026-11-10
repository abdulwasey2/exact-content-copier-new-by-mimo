/**
 * Formats any thrown value into a human-readable message without assuming it
 * is an `Error` instance.
 */
export function errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}