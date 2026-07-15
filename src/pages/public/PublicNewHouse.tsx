import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconButton } from "@/components/ActionLink";
import { Icons } from "@/components/Icons";
import { emptyHouse, HouseForm, type HouseFormValue } from "@/components/HouseForm";
import { ListPageHeader } from "@/components/ListPage";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/i18n";
import { api } from "@/lib/api";

export function PublicNewHouse() {
  const { t } = useI18n();
  const { refreshPendingCount } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState<HouseFormValue>(emptyHouse());

  return (
    <div className="panel">
      <ListPageHeader
        title={t("newHouse")}
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
      <HouseForm value={form} onChange={setForm} />
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
                requestType: "create_house",
                payload: form,
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
