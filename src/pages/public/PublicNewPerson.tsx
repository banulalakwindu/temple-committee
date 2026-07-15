import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconButton } from "@/components/ActionLink";
import { Icons } from "@/components/Icons";
import { emptyPerson, PersonForm, type PersonFormValue } from "@/components/PersonForm";
import { ListPageHeader } from "@/components/ListPage";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/i18n";
import { api } from "@/lib/api";

export function PublicNewPerson() {
  const { t } = useI18n();
  const { refreshPendingCount } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState<PersonFormValue>(emptyPerson());
  const [houses, setHouses] = useState<{ id: number; name_si: string; name_en: string }[]>([]);

  useEffect(() => {
    void api(window.electronAPI.listHouses({ active: "active" })).then((h) =>
      setHouses(h as typeof houses),
    );
  }, []);

  return (
    <div className="panel">
      <ListPageHeader
        title={t("newPerson")}
        subtitle={t("publicHint")}
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
      <PersonForm value={form} onChange={setForm} houses={houses} />
      <div className="form-actions">
        <IconButton
          icon={Icons.arrowLeft()}
          variant="secondary"
          onClick={() => navigate("/public")}
        >
          {t("back")}
        </IconButton>
        <IconButton
          icon={Icons.check()}
          onClick={() => {
            void api(
              window.electronAPI.createPending({
                requestType: "create_person",
                payload: form,
                targetHouseId: form.current_house_id,
              }),
            ).then(async () => {
              await refreshPendingCount();
              navigate("/public/submitted");
            });
          }}
        >
          {t("save")}
        </IconButton>
      </div>
    </div>
  );
}
