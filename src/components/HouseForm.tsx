import { useEffect, useMemo, useState } from "react";
import { SearchSelect } from "@/components/SearchSelect";
import { useI18n } from "@/i18n";
import { api, displayName, withMirroredSi } from "@/lib/api";

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
  custom_field_1: "",
  custom_field_2: "",
  custom_field_3: "",
  custom_field_4: "",
  custom_field_5: "",
});

type Village = { id: number; name_si: string; name_en: string };

const OTHER_VILLAGE_ID = -1;

export function HouseForm({
  value,
  onChange,
}: {
  value: HouseFormValue;
  onChange: (v: HouseFormValue) => void;
}) {
  const { t, locale } = useI18n();
  const [villages, setVillages] = useState<Village[]>([]);
  const [villageId, setVillageId] = useState<number | null>(null);

  const set = (key: keyof HouseFormValue, v: string | number) =>
    onChange({ ...value, [key]: v });

  const setEn = (
    enKey: "name_en" | "address_en" | "village_en",
    siKey: "name_si" | "address_si" | "village_si",
    nextEn: string,
  ) => onChange(withMirroredSi(value, enKey, siKey, nextEn));

  useEffect(() => {
    void api(window.electronAPI.listVillages())
      .then((rows) => setVillages(rows as Village[]))
      .catch(() => setVillages([]));
  }, []);

  useEffect(() => {
    if (!villages.length) {
      if (value.village_si || value.village_en) setVillageId(OTHER_VILLAGE_ID);
      return;
    }
    const match = villages.find(
      (v) =>
        (value.village_si &&
          (v.name_si === value.village_si || v.name_en === value.village_si)) ||
        (value.village_en &&
          (v.name_en === value.village_en || v.name_si === value.village_en)),
    );
    if (match) setVillageId(match.id);
    else if (value.village_si || value.village_en) setVillageId(OTHER_VILLAGE_ID);
    else setVillageId(null);
  }, [villages, value.village_si, value.village_en]);

  const villageOptions = useMemo(
    () => [
      ...villages,
      {
        id: OTHER_VILLAGE_ID,
        name_si: t("other"),
        name_en: t("other"),
      },
    ],
    [villages, t],
  );

  const isOther = villageId === OTHER_VILLAGE_ID;

  return (
    <div className="grid-2">
      <div className="field field-full">
        <label className="label">{t("houseNumber")}</label>
        <input
          className="input"
          value={value.house_number}
          onChange={(e) => set("house_number", e.target.value)}
        />
      </div>
      <div className="field">
        <label className="label">{t("nameEn")}</label>
        <input
          className="input"
          value={value.name_en}
          onChange={(e) => setEn("name_en", "name_si", e.target.value)}
        />
      </div>
      <div className="field">
        <label className="label">{t("nameSi")}</label>
        <input
          className="input"
          value={value.name_si}
          onChange={(e) => set("name_si", e.target.value)}
        />
      </div>
      <div className="field">
        <label className="label">{t("addressEn")}</label>
        <textarea
          className="textarea"
          value={value.address_en}
          onChange={(e) => setEn("address_en", "address_si", e.target.value)}
        />
      </div>
      <div className="field">
        <label className="label">{t("addressSi")}</label>
        <textarea
          className="textarea"
          value={value.address_si}
          onChange={(e) => set("address_si", e.target.value)}
        />
      </div>
      <div className="field field-full">
        <label className="label">{t("village")}</label>
        <SearchSelect<Village>
          value={villageId}
          onChange={(id) => {
            setVillageId(id);
            if (id == null) {
              onChange({ ...value, village_si: "", village_en: "" });
              return;
            }
            if (id === OTHER_VILLAGE_ID) {
              return;
            }
            const v = villages.find((x) => x.id === id);
            if (v) {
              onChange({
                ...value,
                village_si: v.name_si,
                village_en: v.name_en,
              });
            }
          }}
          placeholder={t("selectVillage")}
          emptyLabel="—"
          options={villageOptions}
          getOptionLabel={(v) =>
            v.id === OTHER_VILLAGE_ID
              ? t("other")
              : displayName(v.name_si, v.name_en, locale)
          }
          getOptionValue={(v) => v.id}
        />
      </div>
      {isOther ? (
        <>
          <div className="field">
            <label className="label">{t("village")} (EN)</label>
            <input
              className="input"
              value={value.village_en}
              onChange={(e) => setEn("village_en", "village_si", e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label">{t("village")} (SI)</label>
            <input
              className="input"
              value={value.village_si}
              onChange={(e) => set("village_si", e.target.value)}
            />
          </div>
        </>
      ) : null}
      <div className="field field-full">
        <label className="label">{t("phone")}</label>
        <input
          className="input"
          value={value.telephone}
          onChange={(e) => set("telephone", e.target.value)}
        />
      </div>
      <div className="field field-full">
        <label className="label">{t("notes")}</label>
        <textarea
          className="textarea"
          value={value.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>
      <div className="field field-full">
        <p className="label">{t("todoFormFields")}</p>
      </div>
      {[1, 2, 3, 4, 5].map((n) => {
        const key = `custom_field_${n}` as keyof HouseFormValue;
        const isLastOdd = n === 5;
        return (
          <div
            className={`field${isLastOdd ? " field-full" : ""}`}
            key={key}
          >
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
