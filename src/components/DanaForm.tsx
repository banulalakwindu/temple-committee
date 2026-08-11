import { SearchSelect } from "@/components/SearchSelect";
import { useI18n } from "@/i18n";
import { api, displayName, localDateString } from "@/lib/api";

export type HouseOpt = {
  id: number;
  name_si: string;
  name_en: string;
  house_number: string | null;
};

export type DanaFormValue = {
  houseId: number | null;
  danaType: "heel" | "dawal" | "both";
  startDate: string;
  mode: "once" | "recurring";
  recurrenceType:
    | "monthly"
    | "every_3_months"
    | "every_6_months"
    | "annually"
    | "custom";
  recurrenceInterval: number;
  recurrenceUnit: "days" | "months" | "years";
  endType: "never" | "until" | "count";
  endDate: string;
  occurrenceCount: number;
};

export function emptyDanaForm(startDate?: string): DanaFormValue {
  return {
    houseId: null,
    danaType: "heel",
    startDate: startDate || localDateString(),
    mode: "once",
    recurrenceType: "monthly",
    recurrenceInterval: 1,
    recurrenceUnit: "months",
    endType: "never",
    endDate: "",
    occurrenceCount: 12,
  };
}

type Props = {
  value: DanaFormValue;
  onChange: (next: DanaFormValue) => void;
  /** When editing an existing schedule, house and "both" are locked. */
  editMode?: boolean;
  showFutureWarning?: boolean;
};

export function DanaForm({
  value,
  onChange,
  editMode = false,
  showFutureWarning = false,
}: Props) {
  const { t, locale } = useI18n();

  const set = <K extends keyof DanaFormValue>(key: K, v: DanaFormValue[K]) => {
    onChange({ ...value, [key]: v });
  };

  const houseLabel = (h: HouseOpt) => {
    const name = displayName(h.name_si, h.name_en, locale);
    return h.house_number ? `${name} (#${h.house_number})` : name;
  };

  return (
    <div className="grid-2">
      {showFutureWarning ? (
        <p className="hint dana-future-warning field-full">
          {t("futureOnlyWarning")}
        </p>
      ) : null}

      <div className="field">
        <label className="label">{t("houses")}</label>
        <SearchSelect<HouseOpt>
          value={value.houseId}
          onChange={(id) => set("houseId", id)}
          placeholder={t("selectHouse")}
          emptyLabel="—"
          disabled={editMode}
          getOptionLabel={houseLabel}
          getOptionValue={(h) => h.id}
          loadOptions={async (q) =>
            (await api(
              window.electronAPI.listHouses({ q, archived: "current" }),
            )) as HouseOpt[]
          }
          resolveSelected={async (id) =>
            (await api(window.electronAPI.getHouse(id))) as HouseOpt
          }
        />
      </div>

      <div className="field">
        <label className="label">{t("danaType")}</label>
        <select
          className="select"
          value={editMode ? value.danaType : value.danaType}
          disabled={editMode && value.danaType !== "heel" && value.danaType !== "dawal"}
          onChange={(e) =>
            set(
              "danaType",
              e.target.value as DanaFormValue["danaType"],
            )
          }
        >
          <option value="heel">{t("heelDana")}</option>
          <option value="dawal">{t("dawalDana")}</option>
          {!editMode ? <option value="both">{t("danaBoth")}</option> : null}
        </select>
      </div>

      <div className="field">
        <label className="label">
          {editMode ? t("effectiveFrom") : t("startDate")}
        </label>
        <input
          className="input"
          type="date"
          value={value.startDate}
          min={editMode ? localDateString() : undefined}
          onChange={(e) => set("startDate", e.target.value)}
        />
      </div>

      <div className="field">
        <label className="label">{t("type")}</label>
        <select
          className="select"
          value={value.mode}
          onChange={(e) =>
            set("mode", e.target.value as DanaFormValue["mode"])
          }
        >
          <option value="once">{t("oneTime")}</option>
          <option value="recurring">{t("recurring")}</option>
        </select>
      </div>

      {value.mode === "recurring" ? (
        <>
          <div className="field">
            <label className="label">{t("recurring")}</label>
            <select
              className="select"
              value={value.recurrenceType}
              onChange={(e) =>
                set(
                  "recurrenceType",
                  e.target.value as DanaFormValue["recurrenceType"],
                )
              }
            >
              <option value="monthly">{t("monthly")}</option>
              <option value="every_3_months">{t("every3Months")}</option>
              <option value="every_6_months">{t("every6Months")}</option>
              <option value="annually">{t("annually")}</option>
              <option value="custom">{t("customRecurrence")}</option>
            </select>
          </div>

          {value.recurrenceType === "custom" ? (
            <div className="field">
              <label className="label">{t("repeatEvery")}</label>
              <div className="dana-repeat-row">
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={value.recurrenceInterval}
                  onChange={(e) =>
                    set(
                      "recurrenceInterval",
                      Math.max(1, Number(e.target.value) || 1),
                    )
                  }
                />
                <select
                  className="select"
                  value={value.recurrenceUnit}
                  onChange={(e) =>
                    set(
                      "recurrenceUnit",
                      e.target.value as DanaFormValue["recurrenceUnit"],
                    )
                  }
                >
                  <option value="days">{t("unitDays")}</option>
                  <option value="months">{t("unitMonths")}</option>
                  <option value="years">{t("unitYears")}</option>
                </select>
              </div>
            </div>
          ) : null}

          <div
            className={
              value.endType === "never" && value.recurrenceType === "custom"
                ? "field field-full"
                : "field"
            }
          >
            <label className="label">{t("endCondition")}</label>
            <select
              className="select"
              value={value.endType}
              onChange={(e) =>
                set("endType", e.target.value as DanaFormValue["endType"])
              }
            >
              <option value="never">{t("endNever")}</option>
              <option value="until">{t("endUntil")}</option>
              <option value="count">{t("endCount")}</option>
            </select>
          </div>

          {value.endType === "until" ? (
            <div
              className={`field${
                value.recurrenceType === "custom" ? "" : " field-full"
              }`}
            >
              <label className="label">{t("endDate")}</label>
              <input
                className="input"
                type="date"
                value={value.endDate}
                onChange={(e) => set("endDate", e.target.value)}
              />
            </div>
          ) : null}

          {value.endType === "count" ? (
            <div
              className={`field${
                value.recurrenceType === "custom" ? "" : " field-full"
              }`}
            >
              <label className="label">{t("occurrenceCount")}</label>
              <input
                className="input"
                type="number"
                min={1}
                value={value.occurrenceCount}
                onChange={(e) =>
                  set(
                    "occurrenceCount",
                    Math.max(1, Number(e.target.value) || 1),
                  )
                }
              />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function danaFormToCreateInput(value: DanaFormValue) {
  if (!value.houseId) throw new Error("Household is required");
  if (!value.startDate) throw new Error("Start date is required");
  if (value.mode === "once") {
    return {
      houseId: value.houseId,
      danaType: value.danaType,
      startDate: value.startDate,
      recurrenceType: "once" as const,
      endType: "count" as const,
      occurrenceCount: 1,
    };
  }
  if (value.endType === "until" && !value.endDate) {
    throw new Error("End date is required");
  }
  return {
    houseId: value.houseId,
    danaType: value.danaType,
    startDate: value.startDate,
    recurrenceType: value.recurrenceType,
    recurrenceInterval: value.recurrenceInterval,
    recurrenceUnit: value.recurrenceUnit,
    endType: value.endType,
    endDate: value.endType === "until" ? value.endDate || null : null,
    occurrenceCount:
      value.endType === "count" ? value.occurrenceCount : null,
  };
}
