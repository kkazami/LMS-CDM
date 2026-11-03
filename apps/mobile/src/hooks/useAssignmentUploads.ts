import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { studentScope, scopeIsCurrent } from '../lib/student-scope';
import { newOperationKey } from '../lib/student-drafts';
import { uploadStudentFile } from '../lib/student-upload';
import type { DraftAttachment } from './useAssignmentDraft';

export function useAssignmentUploads(setAttachments: (value: React.SetStateAction<DraftAttachment[]>) => Promise<boolean>) {
  const scope = useRef(studentScope()).current;
  const [progress, setProgress] = useState<number | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function upload(file: DraftAttachment) {
    if (controller.current || !scopeIsCurrent(scope)) return;
    const current = new AbortController(); controller.current = current; setProgress(0);
    try {
      const saved = await uploadStudentFile(file.url, file.fileName, file.mimeType || 'application/octet-stream', current.signal, setProgress);
      if (!scopeIsCurrent(scope)) return;
      await setAttachments(previous => previous.map(value => value.url === file.url ? { ...value, url: saved.url, fileName: saved.fileName } : value));
    } catch (error) { Alert.alert('Upload needs attention', error instanceof Error ? error.message : 'Reconnect and retry your upload.'); }
    finally { controller.current = null; setProgress(null); }
  }
  async function stage(uri: string, fileName: string, mimeType: string, size?: number) {
    if (!scope.owner || !scopeIsCurrent(scope) || !FileSystem.documentDirectory) throw new Error('Sign-in changed. Reopen this assignment to attach a file.');
    if (size && size > 25 * 1024 * 1024) throw new Error('Choose a file up to 25 MB.');
    const directory = `${FileSystem.documentDirectory}lms_student_files/${encodeURIComponent(scope.owner)}/`;
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    const copy = `${directory}${newOperationKey()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100)}`;
    await FileSystem.copyAsync({ from: uri, to: copy });
    if (!scopeIsCurrent(scope)) return;
    const file = { url: copy, fileName, type: 'FILE', mimeType };
    const saved = await setAttachments(previous => [...previous, file]);
    if (!saved) throw new Error('The attachment draft could not save. Free device storage before uploading.');
    if (!scopeIsCurrent(scope)) return;
    await upload(file);
  }
  async function pickDocument() {
    try { const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled) { const file = result.assets[0]; await stage(file.uri, file.name, file.mimeType || 'application/octet-stream', file.size); }
    } catch (error) { Alert.alert('Unable to attach file', error instanceof Error ? error.message : 'Try choosing the file again.'); }
  }
  async function pickImage() {
    try { const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: false });
      if (!result.canceled) { const file = result.assets[0]; await stage(file.uri, file.fileName || 'submission.jpg', file.mimeType || 'image/jpeg', file.fileSize); }
    } catch (error) { Alert.alert('Unable to attach image', error instanceof Error ? error.message : 'Try choosing the image again.'); }
  }
  return { pickDocument, pickImage, retryUpload: upload, cancelUpload: () => controller.current?.abort(), uploadProgress: progress };
}
