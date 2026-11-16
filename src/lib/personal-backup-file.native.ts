import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { MAX_BACKUP_BYTES } from '@/state/personal-data';

export async function pickPersonalBackupFile(): Promise<{ text: string; name: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: false, copyToCacheDirectory: true });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const file = new File(asset.uri);
  if (Math.max(asset.size ?? 0, file.size) > MAX_BACKUP_BYTES) throw new Error('ファイルは5MB以内にしてください。');
  try { return { name: asset.name, text: await file.text() }; }
  catch { throw new Error('ファイルを読み込めませんでした。別のバックアップを選んでください。'); }
}
