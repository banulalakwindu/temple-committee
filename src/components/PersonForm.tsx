import { useI18n } from "@/i18n";

export type PersonFormValue = {
  full_name_si: string;
  full_name_en: string;
  gender: string;
  birthday: string;
  nic: string;
  phone: string;
  occupation_si: string;
  occupation_en: string;
  relationship_in_family: string;
  address_si: string;
  address_en: string;
  notes: string;
  current_house_id: number | null;
  is_active: number;
  custom_field_1: string;
  custom_field_2: string;
  custom_field_3: string;
  custom_field_4: string;
  custom_field_5: string;
};

export const emptyPerson = (): PersonFormValue => ({
  full_name_si: "",
  full_name_en: "",
  gender: "",
  birthday: "",
  nic: "",
  phone: "",
  occupation_si: "",
  occupation_en: "",
  relationship_in_family: "",
  address_si: "",
  address_en: "",
  notes: "",
  current_house_id: null,
  is_active: 1,
  custom_field_1: "",
  custom_field_2: "",
  custom_field_3: "",
  custom_field_4: "",
  custom_field_5: "",
});

type HouseOpt = { id: number; name_si: string; name_en: string };

export function PersonForm({
  value,
  onChange,
  houses,
}: {
  value: PersonFormValue;
  onChange: (v: PersonFormValue) => void;
  houses: HouseOpt[];
}) {
  const { t, locale } = useI18n();
  const set = (key: keyof PersonFormValue, v: string | number | null) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="grid-2">
      <div className="field">
        <label className="label">{t("nameSi")}</label>
        <input className="input" value={value.full_name_si} onChange={(e) => set("full_name_si", e.target.value)} />
      </div>
      <div className="field">
        <label className="label">{t("nameEn")}</label>
        <input className="input" value={value.full_name_en} onChange={(e) => set("full_name_en", e.target.value)} />
      </div>
      <div className="field">
        <label className="label">{t("gender")}</label>
        <select className="select" value={value.gender} onChange={(e) => set("gender", e.target.value)}>
          <option value="">—</option>
          <option value="male">{t("male")}</option>
          <option value="female">{t("female")}</option>
          <option value="other">{t("other")}</option>
        </select>
      </div>
      <div className="field">
        <label className="label">{t("birthday")}</label>
        <input className="input" type="date" value={value.birthday || ""} onChange={(e) => set("birthday", e.target.value)} />
      </div>
      <div className="field">
        <label className="label">{t("nic")}</label>
        <input className="input" value={value.nic} onChange={(e) => set("nic", e.target.value)} />
      </div>
      <div className="field">
        <label className="label">{t("phone")}</label>
        <input className="input" value={value.phone} onChange={(e) => set("phone", e.target.value)} />
      </div>
      <div className="field">
        <label className="label">{t("occupation")} (SI)</label>
        <input className="input" value={value.occupation_si} onChange={(e) => set("occupation_si", e.target.value)} />
      </div>
      <div className="field">
        <label className="label">{t("occupation")} (EN)</label>
        <input className="input" value={value.occupation_en} onChange={(e) => set("occupation_en", e.target.value)} />
      </div>
      <div className="field">
        <label className="label">{t("relationship")}</label>
        <input className="input" value={value.relationship_in_family} onChange={(e) => set("relationship_in_family", e.target.value)} />
      </div>
      <div className="field">
        <label className="label">{t("currentHouse")}</label>
        <select
          className="select"
          value={value.current_house_id ?? ""}
          onChange={(e) =>
            set("current_house_id", e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">—</option>
          {houses.map((h) => (
            <option key={h.id} value={h.id}>
              {locale === "si" ? h.name_si || h.name_en : h.name_en || h.name_si}
            </option>
          ))}
        </select>
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
        <label className="label">{t("notes")}</label>
        <textarea className="textarea" value={value.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>
      <div className="field">
        <label className="label">{t("active")}</label>
        <select className="select" value={value.is_active} onChange={(e) => set("is_active", Number(e.target.value))}>
          <option value={1}>{t("yes")}</option>
          <option value={0}>{t("no")}</option>
        </select>
      </div>
      <div className="field" style={{ gridColumn: "1 / -1" }}>
        <p className="label">{t("todoFormFields")}</p>
      </div>
      {[1, 2, 3, 4, 5].map((n) => {
        const key = `custom_field_${n}` as keyof PersonFormValue;
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
