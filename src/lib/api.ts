export async function api<T>(
  call: Promise<{ ok: true; data: T } | { ok: false; error: string }>,
): Promise<T> {
  const res = await call;
  if (!res.ok) throw new Error(res.error);
  return res.data;
}

export function displayName(
  si: string | null | undefined,
  en: string | null | undefined,
  locale: string,
): string {
  if (locale === "si") return si || en || "—";
  return en || si || "—";
}
