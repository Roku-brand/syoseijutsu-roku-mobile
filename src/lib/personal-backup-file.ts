export type PickedBackup = { text: string; name: string };

/** Native platforms resolve the .native implementation; Web retains its direct file input. */
export async function pickPersonalBackupFile(): Promise<PickedBackup | null> {
  throw new Error('ファイル選択を開けませんでした。もう一度お試しください。');
}
