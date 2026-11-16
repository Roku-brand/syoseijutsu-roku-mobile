export type BackupSummary = { exportedAt: string | null; favorites: number; memos: number; learning: number };
const countArray = (value: unknown) => Array.isArray(value) ? value.length : 0;

/** Display only counts and dates; validation and restoration remain in personal-data. */
export function summarizePersonalBackup(text: string): BackupSummary {
  const envelope = JSON.parse(text);
  if (envelope?.format !== 'shoseijutsuroku-personal-data' || envelope.version !== 1 || !envelope.data || typeof envelope.data !== 'object' || Array.isArray(envelope.data)) throw new Error('処世術禄の対応するバックアップを選んでください。');
  const data = envelope.data;
  return {
    exportedAt: typeof envelope.exportedAt === 'string' && Number.isFinite(Date.parse(envelope.exportedAt)) ? envelope.exportedAt : null,
    favorites: countArray(data.savedIds) + countArray(data.savedTheoryIds) + countArray(data.savedFeatureIds),
    memos: countArray(data.personalMemos),
    learning: data.learningRecords && typeof data.learningRecords === 'object' && !Array.isArray(data.learningRecords) ? Object.keys(data.learningRecords).length : 0,
  };
}
