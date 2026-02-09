import * as FileSystem from 'expo-file-system/legacy';

/** Convert a local image URI to a base64 data URI for upload. */
export async function convertImageToBase64(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  return `data:image/jpeg;base64,${base64}`;
}
