/**
 * Performs timing-safe string comparison to prevent timing attacks.
 *
 * This implementation works in both Node.js and Edge Runtime environments.
 * It uses a constant-time comparison algorithm that prevents timing attacks.
 *
 * @param a First string to compare
 * @param b Second string to compare
 * @returns true if strings are equal, false otherwise
 */
export function timingSafeStringCompare(a: string, b: string): boolean {
  // If lengths differ, still do a full comparison to prevent timing leak
  if (a.length !== b.length) {
    // Do a dummy comparison to maintain constant time
    let dummy = 0;
    for (let i = 0; i < a.length; i++) {
      dummy |= a.charCodeAt(i) ^ 'a'.charCodeAt(0);
    }
    return false;
  }

  // Constant-time comparison
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
