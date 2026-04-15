import * as ImageManipulator from 'expo-image-manipulator';

/** Longest edge after resize — balances Groq vision detail vs payload size. */
const MAX_EDGE_PX = 1536;
const JPEG_QUALITY = 0.82;

function buildResizeAction(
  width?: number | null,
  height?: number | null,
): ImageManipulator.Action[] {
  const w = width ?? 0;
  const h = height ?? 0;
  if (w > 0 && h > 0) {
    const maxEdge = Math.max(w, h);
    if (maxEdge <= MAX_EDGE_PX) return [];
    const scale = MAX_EDGE_PX / maxEdge;
    return [
      {
        resize: {
          width: Math.max(1, Math.round(w * scale)),
          height: Math.max(1, Math.round(h * scale)),
        },
      },
    ];
  }
  return [{ resize: { width: MAX_EDGE_PX } }];
}

/**
 * Resize (if needed) and compress to JPEG base64 for `body-measurements` edge function.
 */
export async function prepareBodyScanImageBase64(
  uri: string,
  dimensions?: { width?: number | null; height?: number | null },
): Promise<string> {
  const actions = buildResizeAction(dimensions?.width, dimensions?.height);
  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: JPEG_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
  if (!result.base64) {
    throw new Error('Could not process image');
  }
  return result.base64;
}
