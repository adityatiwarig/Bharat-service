export async function fetchJson<T>(input: string, init?: RequestInit) {
  const response = await fetch(input, {
    cache: 'no-store',
    ...init,
  });

  const data = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || 'Request failed.');
  }

  return data;
}
