import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconButton } from "@/components/ActionLink";
import { Icons } from "@/components/Icons";
import { emptyPerson, PersonForm, type PersonFormValue } from "@/components/PersonForm";
import { ListPageHeader } from "@/components/ListPage";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";
import { useI18n } from "@/i18n";
import { api } from "@/lib/api";

export function PublicNewPerson() {
  const { t } = useI18n();
  const { notify } = useToast();
  const { refreshPendingCount } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState<PersonFormValue>(emptyPerson());

  return (
    <div className="page-sheet">
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
      <div className="page-sheet-body">
        <PersonForm value={form} onChange={setForm} />
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
              )
                .then(async () => {
                  notify(t("submitted"));
                  await refreshPendingCount();
                  navigate("/public/submitted");
                })
                .catch((e: Error) =>
                  notify(e.message || t("saveFailed"), {
                    tone: "error",
                    scrollTop: true,
                  }),
                );
            }}
          >
            {t("save")}
          </IconButton>
        </div>
      </div>
    </div>
  );
}
