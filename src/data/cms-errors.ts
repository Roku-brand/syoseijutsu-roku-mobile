export function cmsErrorMessage(cause: unknown) {
  if (cause && typeof cause === 'object') {
    const error = cause as { message?: unknown; code?: string };
    if (error.code === '23505') return '同じURL名が使われています。別のURL名を指定してください。編集内容は保持しています。';
    if (typeof error.message === 'string' && error.message.trim()) {
      if (error.message === 'owner_required') return 'オーナー権限を確認できませんでした。ログイン状態を確認してください。';
      return error.message;
    }
  }
  return '操作を完了できませんでした。編集内容は保持しています。通信環境を確認して、もう一度お試しください。';
}
