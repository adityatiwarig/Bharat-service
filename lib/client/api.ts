const inflightGetRequests = new Map<string, Promise<unknown>>();

function getRequestMethod(init?: RequestInit) {
  return (init?.method || 'GET').toUpperCase();
}

function getRequestCacheKey(input: string, init?: RequestInit) {
  const method = getRequestMethod(init);
  const headers = init?.headers ? JSON.stringify(init.headers) : '';
  return `${method}:${input}:${headers}`;
}

async function executeJsonRequest<T>(input: string, init?: RequestInit) {
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

export async function fetchJson<T>(input: string, init?: RequestInit) {
  const method = getRequestMethod(init);
  const canDeduplicate = method === 'GET' && !init?.body;

  if (!canDeduplicate) {
    return executeJsonRequest<T>(input, init);
  }

  const cacheKey = getRequestCacheKey(input, init);
  const existing = inflightGetRequests.get(cacheKey);

  if (existing) {
    return existing as Promise<T>;
  }

  const request = executeJsonRequest<T>(input, init).finally(() => {
    inflightGetRequests.delete(cacheKey);
  });

  inflightGetRequests.set(cacheKey, request);
  return request;
}
