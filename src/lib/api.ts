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

/** Local calendar date as YYYY-MM-DD (avoids UTC/timezone off-by-one). */
export function localDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** When EN changes, copy into SI if SI was empty or still matched the previous EN. */
export function withMirroredSi<T extends Record<string, unknown>>(
  value: T,
  enKey: keyof T & string,
  siKey: keyof T & string,
  nextEn: string,
): T {
  const prevEn = String(value[enKey] ?? "");
  const prevSi = String(value[siKey] ?? "");
  const shouldMirror = !prevSi.trim() || prevSi === prevEn;
  return {
    ...value,
    [enKey]: nextEn,
    ...(shouldMirror ? { [siKey]: nextEn } : {}),
  };
}
