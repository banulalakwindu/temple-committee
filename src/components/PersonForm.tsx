import { SearchSelect } from "@/components/SearchSelect";
import { useI18n } from "@/i18n";
import { api, displayName, withMirroredSi } from "@/lib/api";

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
  daham_school_child: number;
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
  daham_school_child: 0,
  custom_field_1: "",
  custom_field_2: "",
  custom_field_3: "",
  custom_field_4: "",
  custom_field_5: "",
});

type HouseOpt = { id: number; name_si: string; name_en: string; house_number?: string | null };

export function PersonForm({
  value,
  onChange,
  hideHouseSelect = false,
}: {
  value: PersonFormValue;
  onChange: (v: PersonFormValue) => void;
  /** Hide house picker (e.g. new household — house is created with the request). */
  hideHouseSelect?: boolean;
}) {
  const { t, locale } = useI18n();
  const set = (key: keyof PersonFormValue, v: string | number | null) =>
    onChange({ ...value, [key]: v });

  const setEn = (
    enKey: "full_name_en" | "occupation_en" | "address_en",
    siKey: "full_name_si" | "occupation_si" | "address_si",
    nextEn: string,
  ) => onChange(withMirroredSi(value, enKey, siKey, nextEn));

  const houseLabel = (h: HouseOpt) => {
    const name = displayName(h.name_si, h.name_en, locale);
    return h.house_number ? `${name} (#${h.house_number})` : name;
  };

  return (
    <div className="grid-2">
      <div className="field">
        <label className="label">{t("nameEn")}</label>
        <input
          className="input"
          value={value.full_name_en}
          onChange={(e) => setEn("full_name_en", "full_name_si", e.target.value)}
        />
      </div>
      <div className="field">
        <label className="label">{t("nameSi")}</label>
        <input
          className="input"
          value={value.full_name_si}
          onChange={(e) => set("full_name_si", e.target.value)}
        />
      </div>
      <div className="field">
        <label className="label">{t("gender")}</label>
        <select
          className="select"
          value={value.gender}
          onChange={(e) => set("gender", e.target.value)}
        >
          <option value="">—</option>
          <option value="male">{t("male")}</option>
          <option value="female">{t("female")}</option>
          <option value="other">{t("other")}</option>
        </select>
      </div>
      <div className="field">
        <label className="label">{t("birthday")}</label>
        <input
          className="input"
          type="date"
          value={value.birthday || ""}
          onChange={(e) => set("birthday", e.target.value)}
        />
      </div>
      <div className="field field-full">
        <label className="check-label">
          <input
            type="checkbox"
            checked={!!value.daham_school_child}
            onChange={(e) =>
              set("daham_school_child", e.target.checked ? 1 : 0)
            }
          />
          <span>{t("dahamSchoolChild")}</span>
        </label>
      </div>
      <div className="field">
        <label className="label">{t("nic")}</label>
        <input
          className="input"
          value={value.nic}
          onChange={(e) => set("nic", e.target.value)}
        />
      </div>
      <div className="field">
        <label className="label">{t("phone")}</label>
        <input
          className="input"
          value={value.phone}
          onChange={(e) => set("phone", e.target.value)}
        />
      </div>
      <div className="field">
        <label className="label">{t("occupation")} (EN)</label>
        <input
          className="input"
          value={value.occupation_en}
          onChange={(e) =>
            setEn("occupation_en", "occupation_si", e.target.value)
          }
        />
      </div>
      <div className="field">
        <label className="label">{t("occupation")} (SI)</label>
        <input
          className="input"
          value={value.occupation_si}
          onChange={(e) => set("occupation_si", e.target.value)}
        />
      </div>
      {!hideHouseSelect ? (
        <>
          <div className="field">
            <label className="label">{t("relationship")}</label>
            <input
              className="input"
              value={value.relationship_in_family}
              onChange={(e) => set("relationship_in_family", e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label">{t("currentHouse")}</label>
            <SearchSelect<HouseOpt>
              value={value.current_house_id}
              onChange={(id) => set("current_house_id", id)}
              placeholder={t("selectHouse")}
              emptyLabel="—"
              getOptionLabel={houseLabel}
              getOptionValue={(h) => h.id}
              loadOptions={async (q) =>
                (await api(
                  window.electronAPI.listHouses({ q }),
                )) as HouseOpt[]
              }
              resolveSelected={async (id) =>
                (await api(window.electronAPI.getHouse(id))) as HouseOpt
              }
            />
          </div>
        </>
      ) : (
        <div className="field field-full">
          <label className="label">{t("relationship")}</label>
          <input
            className="input"
            value={value.relationship_in_family}
            onChange={(e) => set("relationship_in_family", e.target.value)}
          />
        </div>
      )}
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
        const key = `custom_field_${n}` as keyof PersonFormValue;
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
