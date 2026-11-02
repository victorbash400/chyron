export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(
    path,
    body === undefined
      ? { cache: "no-store" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  if (response.status === 401)
    window.dispatchEvent(new Event("chyron:session-expired"));
  const result = response.status === 204 ? null : await response.json();
  if (!response.ok)
    throw new Error(result?.error ?? `Request failed (${response.status}).`);
  return result as T;
}
