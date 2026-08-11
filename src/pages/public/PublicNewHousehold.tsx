import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconButton } from "@/components/ActionLink";
import { Icons } from "@/components/Icons";
import { emptyHouse, HouseForm, type HouseFormValue } from "@/components/HouseForm";
import { ListPageHeader } from "@/components/ListPage";
import { emptyPerson, PersonForm, type PersonFormValue } from "@/components/PersonForm";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";
import { useI18n } from "@/i18n";
import { api } from "@/lib/api";

function hasName(person: PersonFormValue): boolean {
  return Boolean(person.full_name_en.trim() || person.full_name_si.trim());
}

function hasHouseName(house: HouseFormValue): boolean {
  return Boolean(house.name_en.trim() || house.name_si.trim());
}

export function PublicNewHousehold() {
  const { t } = useI18n();
  const { notify } = useToast();
  const { refreshPendingCount } = useApp();
  const navigate = useNavigate();
  const [house, setHouse] = useState<HouseFormValue>(emptyHouse());
  const [people, setPeople] = useState<PersonFormValue[]>([emptyPerson()]);

  const setPerson = (index: number, next: PersonFormValue) => {
    setPeople((rows) => rows.map((row, i) => (i === index ? next : row)));
  };

  const removePerson = (index: number) => {
    if (people.length <= 1) return;
    setPeople((rows) => rows.filter((_, i) => i !== index));
  };

  const submit = () => {
    if (!hasHouseName(house)) {
      notify(t("householdNeedHouseName"), { tone: "error", scrollTop: true });
      return;
    }
    const named = people.filter(hasName);
    if (!named.length) {
      notify(t("householdNeedPerson"), { tone: "error", scrollTop: true });
      return;
    }
    void api(
      window.electronAPI.createPending({
        requestType: "create_household",
        payload: {
          house,
          people: named.map((p) => ({ ...p, current_house_id: null })),
        },
      }),
    )
      .then(async () => {
        notify(t("submitted"));
        await refreshPendingCount();
        navigate("/public/submitted");
      })
      .catch((e: Error) =>
        notify(e.message || t("saveFailed"), { tone: "error", scrollTop: true }),
      );
  };

  return (
    <div className="page-sheet">
      <ListPageHeader
        title={t("newHousehold")}
        subtitle={t("newHouseholdHint")}
        actions={
          <IconButton
            icon={Icons.arrowLeft()}
            variant="secondary"
            onClick={() => navigate("/public")}
          >
            {t("back")}
          </IconButton>
        }
      />
      <div className="page-sheet-body">
        <section className="household-section">
          <h3 className="household-section-title">{t("houseDetails")}</h3>
          <HouseForm value={house} onChange={setHouse} />
        </section>

        <section className="household-section">
          <div className="household-section-head">
            <h3 className="household-section-title">{t("householdMembers")}</h3>
            <IconButton
              icon={Icons.plus()}
              variant="secondary"
              onClick={() => setPeople((rows) => [...rows, emptyPerson()])}
            >
              {t("addMember")}
            </IconButton>
          </div>
          <p className="household-hint">{t("householdMembersHint")}</p>
          {people.map((person, index) => (
            <div className="household-member" key={index}>
              <div className="household-member-head">
                <strong>
                  {index === 0
                    ? t("headOfHousehold")
                    : `${t("member")} ${index + 1}`}
                </strong>
                {people.length > 1 ? (
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => removePerson(index)}
                  >
                    {t("remove")}
                  </button>
                ) : null}
              </div>
              <PersonForm
                value={person}
                onChange={(next) => setPerson(index, next)}
                hideHouseSelect
              />
            </div>
          ))}
        </section>

        <div className="form-actions">
          <IconButton
            icon={Icons.arrowLeft()}
            variant="secondary"
            onClick={() => navigate("/public")}
          >
            {t("back")}
          </IconButton>
          <IconButton icon={Icons.check()} onClick={submit}>
            {t("save")}
          </IconButton>
        </div>
      </div>
    </div>
  );
}
