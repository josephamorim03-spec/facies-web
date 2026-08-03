export function appendArrayParams(q: URLSearchParams, key: string, values?: string[] | null) {
  for (const value of values ?? []) {
    if (value.trim()) q.append(key, value.trim());
  }
}
