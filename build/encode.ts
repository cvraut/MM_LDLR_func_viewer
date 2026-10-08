/**
 * build/encode.ts
 * ----------------------------------------------------------------------------
 * Typed arrays are stored in the page as base64 strings: ~3x smaller than
 * JSON number arrays and decoded with zero parsing (see src/data/decode.ts).
 * Byte order is little-endian, which is what every browser uses.
 */
export function b64(arr: Uint8Array | Uint32Array | Float32Array): string {
  return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString('base64');
}
