export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return function (...args: Parameters<T>): void {
    if (!inThrottle) {
      func.apply(undefined, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function throttleLog(message: string, ...args: any[]): void {
  const throttledLog = throttle(() => console.log(message, ...args), 1000);
  throttledLog();
}
