import { useI18n, type Locale } from "@/i18n";

export function LangToggle() {
  const { locale, setLocale, t } = useI18n();
  return (
    <select
      className="select"
      style={{ width: "auto" }}
      aria-label={t("lang")}
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
    >
      <option value="si">සිංහල</option>
      <option value="en">English</option>
    </select>
  );
}
