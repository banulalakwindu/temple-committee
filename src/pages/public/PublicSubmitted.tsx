import { ActionLink } from "@/components/ActionLink";
import { Icons } from "@/components/Icons";
import { useI18n } from "@/i18n";

export function PublicSubmitted() {
  const { t } = useI18n();
  return (
    <div className="panel" style={{ textAlign: "center", padding: "2.5rem" }}>
      <h2>{t("submitted")}</h2>
      <p>{t("submittedHint")}</p>
      <ActionLink to="/public" icon={Icons.home()}>
        {t("home")}
      </ActionLink>
    </div>
  );
}
