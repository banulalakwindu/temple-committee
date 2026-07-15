import { useI18n } from "@/i18n";

export type HouseFormValue = {
  house_number: string;
  name_si: string;
  name_en: string;
  address_si: string;
  address_en: string;
  village_si: string;
  village_en: string;
  telephone: string;
  notes: string;
  is_active: number;
  custom_field_1: string;
  custom_field_2: string;
  custom_field_3: string;
  custom_field_4: string;
  custom_field_5: string;
};

export const emptyHouse = (): HouseFormValue => ({
  house_number: "",
  name_si: "",
  name_en: "",
  address_si: "",
  address_en: "",
  village_si: "",
  village_en: "",
  telephone: "",
  notes: "",
  is_active: 1,
  custom_field_1: "",
  custom_field_2: "",
  custom_field_3: "",
  custom_field_4: "",
  custom_field_5: "",
});

export function HouseForm({
  value,
  onChange,
}: {
  value: HouseFormValue;
  onChange: (v: HouseFormValue) => void;
}) {
  const { t } = useI18n();
  const set = (key: keyof HouseFormValue, v: string | number) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="grid-2">
      <div className="field">
        <label className="label">{t("houseNumber")}</label>
        <input className="input" value={value.house_number} onChange={(e) => set("house_number", e.target.value)} />
      </div>
      <div className="field">
        <label className="label">{t("active")}</label>
        <select className="select" value={value.is_active} onChange={(e) => set("is_active", Number(e.target.value))}>
          <option value={1}>{t("yes")}</option>
          <option value={0}>{t("no")}</option>
        </select>
      </div>
      <div className="field">
        <label className="label">{t("nameSi")}</label>
        <input className="input" value={value.name_si} onChange={(e) => set("name_si", e.target.value)} />
      </div>
      <div className="field">
        <label className="label">{t("nameEn")}</label>
        <input className="input" value={value.name_en} onChange={(e) => set("name_en", e.target.value)} />
      </div>
      <div className="field">
        <label className="label">{t("addressSi")}</label>
        <textarea className="textarea" value={value.address_si} onChange={(e) => set("address_si", e.target.value)} />
      </div>
      <div className="field">
        <label className="label">{t("addressEn")}</label>
        <textarea className="textarea" value={value.address_en} onChange={(e) => set("address_en", e.target.value)} />
      </div>
      <div className="field">
        <label className="label">{t("village")} (SI)</label>
        <input className="input" value={value.village_si} onChange={(e) => set("village_si", e.target.value)} />
      </div>
      <div className="field">
        <label className="label">{t("village")} (EN)</label>
        <input className="input" value={value.village_en} onChange={(e) => set("village_en", e.target.value)} />
      </div>
      <div className="field">
        <label className="label">{t("phone")}</label>
        <input className="input" value={value.telephone} onChange={(e) => set("telephone", e.target.value)} />
      </div>
      <div className="field">
        <label className="label">{t("notes")}</label>
        <textarea className="textarea" value={value.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>
      <div className="field" style={{ gridColumn: "1 / -1" }}>
        <p className="label">{t("todoFormFields")}</p>
      </div>
      {[1, 2, 3, 4, 5].map((n) => {
        const key = `custom_field_${n}` as keyof HouseFormValue;
        return (
          <div className="field" key={key}>
            <label className="label">
              {t("customField")} {n}
            </label>
            <input
              className="input"
              value={String(value[key] ?? "")}
              onChange={(e) => set(key, e.target.value)}
            />
          </div>
        );
      })}
    </div>
  );
}
