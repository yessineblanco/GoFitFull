/**
 * Body scan images for the edge function — uses only expo-image-picker output (no expo-image-manipulator).
 * `expo-image-manipulator` needs native code; dev clients must be rebuilt after adding it, which breaks
 * existing installs. Compression here is via picker `quality` in the screen.
 */

/** Picker compression — balances payload size vs detail for Groq vision. */
export const BODY_SCAN_PICKER_QUALITY = 0.68;

export function assertUsableScanBase64(base64: string | undefined | null): string {
  if (!base64 || base64.length < 800) {
    throw new Error('Image is too small or missing. Try again with a clearer photo.');
  }
  return base64;
}
