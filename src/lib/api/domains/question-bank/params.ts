export function appendArrayParams(q: URLSearchParams, key: string, values?: string[]) {
  for (const value of values ?? []) {
    if (value.trim()) q.append(key, value.trim());
  }
}
