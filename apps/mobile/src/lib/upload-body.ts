import { Platform } from 'react-native';
import { File } from 'expo-file-system';

// Expo's global fetch accepts Blob/File parts rather than React Native URI objects.
export async function createUploadBody(uri: string, name: string, mimeType: string): Promise<FormData> {
  let file: Blob;
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('The selected file could not be read. Choose it again.');
    file = (await response.blob()).slice(0, undefined, mimeType);
  } else {
    // Keep the native File intact: its slice() currently constructs an unsupported RN Blob.
    file = new File(uri);
    Object.defineProperties(file, { name: { value: name }, type: { value: mimeType } });
  }
  const body = new FormData();
  body.append('file', file, name);
  return body;
}
