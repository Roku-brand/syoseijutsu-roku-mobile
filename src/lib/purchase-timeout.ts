export function purchaseTimeout<T>(task: Promise<T>, milliseconds = 20000,
  message = '通信がタイムアウトしました。購入済みの場合は再購入せず「購入を復元」をお試しください。'): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), milliseconds);
    task.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}
