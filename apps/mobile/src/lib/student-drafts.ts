import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { useAuthStore } from '../stores/auth-store';
import { studentScope, scopeIsCurrent } from './student-scope';

const writes = new Map<string, Promise<unknown>>();
function location(key: string) {
  const scope = studentScope();
  if (!scope.owner || !useAuthStore.getState().isSessionVerified) throw new Error('Reconnect and verify your sign-in to unlock saved drafts.');
  if (!FileSystem.documentDirectory || Platform.OS === 'web') throw new Error('Draft storage requires the iOS or Android app.');
  const directory = `${FileSystem.documentDirectory}lms_student_drafts/${encodeURIComponent(scope.owner)}/`;
  return { scope, directory, path: `${directory}${encodeURIComponent(key)}.json` };
}
type StoredDraft = { owner: string; version: number; data: unknown };
async function versions(path: string) {
  const entries = await Promise.all([0, 1].map(async slot => {
    try { const value = JSON.parse(await FileSystem.readAsStringAsync(`${path}.${slot}`)) as StoredDraft; return { slot, value }; }
    catch { return null; }
  }));
  return entries.filter((entry): entry is { slot: number; value: StoredDraft } => !!entry && typeof entry.value.version === 'number');
}
export async function readStudentDraft<T>(key: string): Promise<T | null> {
  const { scope, path } = location(key);
  await writes.get(path)?.catch(() => {});
  const entries = (await versions(path)).filter(entry => entry.value.owner === scope.owner).sort((a, b) => b.value.version - a.value.version);
  if (!scopeIsCurrent(scope)) throw new Error('Sign-in changed. Reopen this work.');
  return entries[0]?.value.data as T ?? null;
}
export async function writeStudentDraft<T>(key: string, data: T): Promise<void> {
  const { scope, directory, path } = location(key);
  const serialized = JSON.stringify(data);
  const write = (writes.get(path) ?? Promise.resolve()).catch(() => {}).then(async () => {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    const entries = await versions(path);
    // Alternate slots: an interrupted write leaves the last complete version intact.
    const latest = entries.sort((a, b) => b.value.version - a.value.version)[0];
    const slot = latest?.slot === 0 ? 1 : 0;
    const version = Math.max(Date.now(), (latest?.value.version ?? 0) + 1);
    await FileSystem.writeAsStringAsync(`${path}.${slot}`, JSON.stringify({ owner: scope.owner, version, data: JSON.parse(serialized) }));
  });
  writes.set(path, write);
  try { await write; } finally { if (writes.get(path) === write) writes.delete(path); }
}
export function newOperationKey() { return `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
