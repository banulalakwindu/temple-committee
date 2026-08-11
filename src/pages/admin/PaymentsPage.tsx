import { useEffect, useState } from "react";
import {
  EmptyState,
  FilterBar,
  ListPageHeader,
  ResultMeta,
} from "@/components/ListPage";
import { SearchSelect } from "@/components/SearchSelect";
import { useConfirm } from "@/context/ConfirmContext";
import { useToast } from "@/context/ToastContext";
import { useI18n } from "@/i18n";
import { api, displayName, localDateString } from "@/lib/api";

type PayType = {
  id: number;
  name_si: string;
  name_en: string;
  amount: number;
};

type House = {
  id: number;
  name_si: string;
  name_en: string;
  house_number: string | null;
};

type Person = {
  id: number;
  full_name_si: string;
  full_name_en: string;
  current_house_id: number | null;
};

type PaymentRow = {
  id: number;
  subject_type: "person" | "house";
  payment_date: string;
  amount: number;
  type_name_si: string;
  type_name_en: string;
  notes: string;
  person_name_si?: string;
  person_name_en?: string;
  house_name_si?: string;
  house_name_en?: string;
  house_number?: string | null;
};

const OTHER_TYPE_ID = -1;

function formatAmount(n: number): string {
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function PaymentsPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const { confirm } = useConfirm();

  const [types, setTypes] = useState<PayType[]>([]);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [adding, setAdding] = useState(false);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterTypeId, setFilterTypeId] = useState<number | null>(null);
  const [filterHouseId, setFilterHouseId] = useState<number | null>(null);
  const [filterPersonId, setFilterPersonId] = useState<number | null>(null);
  const [filterSubject, setFilterSubject] = useState<"" | "person" | "house">(
    "",
  );

  const [subjectType, setSubjectType] = useState<"person" | "house">("person");
  const [personId, setPersonId] = useState<number | null>(null);
  const [houseId, setHouseId] = useState<number | null>(null);
  const [paymentTypeId, setPaymentTypeId] = useState<number | null>(null);
  const [otherNameEn, setOtherNameEn] = useState("");
  const [otherNameSi, setOtherNameSi] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(localDateString());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const isOther = paymentTypeId === OTHER_TYPE_ID;
  const typeOptions: PayType[] = [
    ...types,
    { id: OTHER_TYPE_ID, name_si: t("other"), name_en: t("other"), amount: 0 },
  ];

  const houseLabel = (h: House) => {
    const name = displayName(h.name_si, h.name_en, locale);
    return h.house_number ? `${name} (#${h.house_number})` : name;
  };

  const loadTypes = () => {
    void api(window.electronAPI.listPaymentTypes()).then((d) => {
      const list = d as PayType[];
      setTypes(list);
      setPaymentTypeId((prev) => prev ?? list[0]?.id ?? OTHER_TYPE_ID);
    });
  };

  const loadList = () => {
    void api(
      window.electronAPI.listPayments({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        paymentTypeId: filterTypeId,
        houseId: filterHouseId,
        personId: filterPersonId,
        subjectType: filterSubject || null,
      }),
    ).then((d) => setRows(d as PaymentRow[]));
  };

  useEffect(() => {
    loadTypes();
  }, []);

  useEffect(() => {
    if (!adding) loadList();
  }, [
    adding,
    dateFrom,
    dateTo,
    filterTypeId,
    filterHouseId,
    filterPersonId,
    filterSubject,
  ]);

  useEffect(() => {
    if (!paymentTypeId || paymentTypeId === OTHER_TYPE_ID) return;
    const pt = types.find((x) => x.id === paymentTypeId);
    if (pt) setAmount(String(pt.amount));
  }, [paymentTypeId, types]);

  const resetForm = () => {
    setSubjectType("person");
    setPersonId(null);
    setHouseId(null);
    setPaymentTypeId(types[0]?.id ?? OTHER_TYPE_ID);
    setOtherNameEn("");
    setOtherNameSi("");
    setAmount(types[0] ? String(types[0].amount) : "");
    setPaymentDate(localDateString());
    setNotes("");
  };

  const savePayment = () => {
    setSaving(true);
    void (async () => {
      try {
        await api(
          window.electronAPI.createPayment({
            subject_type: subjectType,
            person_id: subjectType === "person" ? personId : null,
            house_id: subjectType === "house" ? houseId : null,
            payment_type_id: paymentTypeId,
            type_name_si: isOther ? otherNameSi : undefined,
            type_name_en: isOther ? otherNameEn : undefined,
            amount: amount === "" ? null : Number(amount),
            payment_date: paymentDate,
            notes,
          }),
        );
        notify(t("paymentCreated"));
        setAdding(false);
        resetForm();
        loadList();
      } catch (e) {
        notify(e instanceof Error ? e.message : t("saveFailed"), {
          tone: "error",
          scrollTop: true,
        });
      } finally {
        setSaving(false);
      }
    })();
  };

  const canSave =
    !!paymentDate &&
    (subjectType === "person" ? !!personId : !!houseId) &&
    (isOther
      ? !!(otherNameEn.trim() || otherNameSi.trim()) && amount !== ""
      : !!paymentTypeId);

  if (adding) {
    return (
      <div>
        <ListPageHeader
          title={t("addPayment")}
          actions={
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setAdding(false);
                resetForm();
              }}
            >
              {t("back")}
            </button>
          }
        />
        <div className="panel">
          <div className="grid-2">
            <div className="field">
              <label className="label">{t("paymentFor")}</label>
              <select
                className="select"
                value={subjectType}
                onChange={(e) => {
                  const v = e.target.value as "person" | "house";
                  setSubjectType(v);
                  setPersonId(null);
                  setHouseId(null);
                }}
              >
                <option value="person">{t("person")}</option>
                <option value="house">{t("house")}</option>
              </select>
            </div>
            <div className="field">
              <label className="label">{t("paymentDate")}</label>
              <input
                className="input"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            {subjectType === "person" ? (
              <div className="field field-full">
                <label className="label">{t("people")}</label>
                <SearchSelect<Person>
                  value={personId}
                  onChange={setPersonId}
                  placeholder={t("search")}
                  emptyLabel="—"
                  getOptionLabel={(p) =>
                    displayName(p.full_name_si, p.full_name_en, locale)
                  }
                  getOptionValue={(p) => p.id}
                  loadOptions={async (q) =>
                    (await api(
                      window.electronAPI.listPeople({ q }),
                    )) as Person[]
                  }
                  resolveSelected={async (id) =>
                    (await api(window.electronAPI.getPerson(id))) as Person
                  }
                />
              </div>
            ) : (
              <div className="field field-full">
                <label className="label">{t("houses")}</label>
                <SearchSelect<House>
                  value={houseId}
                  onChange={setHouseId}
                  placeholder={t("selectHouse")}
                  emptyLabel="—"
                  getOptionLabel={houseLabel}
                  getOptionValue={(h) => h.id}
                  loadOptions={async (q) =>
                    (await api(
                      window.electronAPI.listHouses({ q }),
                    )) as House[]
                  }
                  resolveSelected={async (id) =>
                    (await api(window.electronAPI.getHouse(id))) as House
                  }
                />
              </div>
            )}
            <div className="field">
              <label className="label">{t("paymentType")}</label>
              <SearchSelect<PayType>
                value={paymentTypeId}
                onChange={(id) => {
                  setPaymentTypeId(id);
                  if (id === OTHER_TYPE_ID) {
                    setAmount("");
                  }
                }}
                placeholder={t("paymentType")}
                clearable={false}
                options={typeOptions}
                getOptionLabel={(tp) =>
                  tp.id === OTHER_TYPE_ID
                    ? t("other")
                    : `${displayName(tp.name_si, tp.name_en, locale)} (${formatAmount(tp.amount)})`
                }
                getOptionValue={(tp) => tp.id}
              />
            </div>
            <div className="field">
              <label className="label">{t("paymentAmount")}</label>
              <input
                className="input"
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            {isOther ? (
              <>
                <div className="field">
                  <label className="label">{t("nameEn")}</label>
                  <input
                    className="input"
                    value={otherNameEn}
                    onChange={(e) => {
                      const next = e.target.value;
                      setOtherNameEn(next);
                      setOtherNameSi((si) =>
                        !si.trim() || si === otherNameEn ? next : si,
                      );
                    }}
                  />
                </div>
                <div className="field">
                  <label className="label">{t("nameSi")}</label>
                  <input
                    className="input"
                    value={otherNameSi}
                    onChange={(e) => setOtherNameSi(e.target.value)}
                  />
                </div>
              </>
            ) : null}
            <div className="field field-full">
              <label className="label">{t("notes")}</label>
              <textarea
                className="textarea"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setAdding(false);
                resetForm();
              }}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              className="btn"
              disabled={saving || !canSave}
              onClick={savePayment}
            >
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ListPageHeader
        title={t("payments")}
        actions={
          <button
            type="button"
            className="btn btn-icon"
            onClick={() => {
              resetForm();
              setAdding(true);
            }}
          >
            <span className="btn-ico">+</span>
            <span>{t("addPayment")}</span>
          </button>
        }
      />

      <FilterBar
        clearLabel={t("clearFilters")}
        onClear={() => {
          setDateFrom("");
          setDateTo("");
          setFilterTypeId(null);
          setFilterHouseId(null);
          setFilterPersonId(null);
          setFilterSubject("");
        }}
      >
        <div className="field">
          <label className="label">{t("dateFrom")}</label>
          <input
            className="input"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="label">{t("dateTo")}</label>
          <input
            className="input"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="label">{t("paymentFor")}</label>
          <select
            className="select"
            value={filterSubject}
            onChange={(e) =>
              setFilterSubject(e.target.value as "" | "person" | "house")
            }
          >
            <option value="">{t("all")}</option>
            <option value="person">{t("person")}</option>
            <option value="house">{t("house")}</option>
          </select>
        </div>
        <div className="field">
          <label className="label">{t("paymentType")}</label>
          <SearchSelect<PayType>
            value={filterTypeId}
            onChange={setFilterTypeId}
            placeholder={t("all")}
            emptyLabel={t("all")}
            options={types}
            getOptionLabel={(tp) => displayName(tp.name_si, tp.name_en, locale)}
            getOptionValue={(tp) => tp.id}
          />
        </div>
        <div className="field">
          <label className="label">{t("houses")}</label>
          <SearchSelect<House>
            value={filterHouseId}
            onChange={setFilterHouseId}
            placeholder={t("selectHouse")}
            emptyLabel={t("all")}
            getOptionLabel={houseLabel}
            getOptionValue={(h) => h.id}
            loadOptions={async (q) =>
              (await api(window.electronAPI.listHouses({ q }))) as House[]
            }
            resolveSelected={async (id) =>
              (await api(window.electronAPI.getHouse(id))) as House
            }
          />
        </div>
        <div className="field">
          <label className="label">{t("people")}</label>
          <SearchSelect<Person>
            value={filterPersonId}
            onChange={setFilterPersonId}
            placeholder={t("search")}
            emptyLabel={t("all")}
            getOptionLabel={(p) =>
              displayName(p.full_name_si, p.full_name_en, locale)
            }
            getOptionValue={(p) => p.id}
            loadOptions={async (q) =>
              (await api(window.electronAPI.listPeople({ q }))) as Person[]
            }
            resolveSelected={async (id) =>
              (await api(window.electronAPI.getPerson(id))) as Person
            }
          />
        </div>
      </FilterBar>

      <ResultMeta count={rows.length} label={t("results")} />
      <div className="panel table-wrap">
        {!rows.length ? (
          <EmptyState message={t("emptyPaymentsHint")} />
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>{t("paymentDate")}</th>
                <th>{t("paymentType")}</th>
                <th>{t("paymentFor")}</th>
                <th>{t("paymentAmount")}</th>
                <th>{t("notes")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.payment_date}</td>
                  <td>
                    {displayName(r.type_name_si, r.type_name_en, locale)}
                  </td>
                  <td>
                    {r.subject_type === "person"
                      ? displayName(
                          r.person_name_si,
                          r.person_name_en,
                          locale,
                        )
                      : (() => {
                          const name = displayName(
                            r.house_name_si,
                            r.house_name_en,
                            locale,
                          );
                          return r.house_number
                            ? `${name} (#${r.house_number})`
                            : name;
                        })()}
                  </td>
                  <td>{formatAmount(r.amount)}</td>
                  <td>{r.notes || "—"}</td>
                  <td>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => {
                        void confirm({
                          message: t("confirmDeletePayment"),
                          confirmLabel: t("delete"),
                          tone: "danger",
                        }).then((ok) => {
                          if (!ok) return;
                          void api(window.electronAPI.deletePayment(r.id))
                            .then(() => {
                              notify(t("paymentDeleted"));
                              loadList();
                            })
                            .catch((e: Error) =>
                              notify(e.message || t("saveFailed"), {
                                tone: "error",
                                scrollTop: true,
                              }),
                            );
                        });
                      }}
                    >
                      {t("delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
