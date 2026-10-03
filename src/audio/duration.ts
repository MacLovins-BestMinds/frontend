/**
 * Настоящая длительность записи. В приложении её отдаёт сам плеер, поэтому здесь всегда null;
 * в браузере работает duration.web.ts.
 */
export function useRealDuration(_uri: string | null): number | null {
  return null;
}
