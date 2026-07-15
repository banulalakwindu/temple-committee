import { Link } from "react-router-dom";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Icons } from "@/components/Icons";
import { useI18n } from "@/i18n";
import logoMark from "@/assets/logo-mark.png";

export function PublicHome() {
  const { t } = useI18n();
  return (
    <div>
      <section className="hero-search panel">
        <div className="hero-intro">
          <div className="hero-mark-wrap" aria-hidden>
            <img className="hero-mark" src={logoMark} alt="" />
          </div>
          <div className="hero-copy">
            <h2>{t("publicTagline")}</h2>
            <p>{t("publicHint")}</p>
          </div>
        </div>
        <GlobalSearch autoFocus large />
        <div className="action-grid">
          <Link className="action-card primary" to="/public/search">
            <span className="action-card-ico">{Icons.search({ size: 22 })}</span>
            <strong>{t("findMe")}</strong>
            <p className="action-card-desc">{t("findMeHint")}</p>
          </Link>
          <Link className="action-card accent" to="/public/new-person">
            <span className="action-card-ico">{Icons.userPlus({ size: 22 })}</span>
            <strong>{t("newPerson")}</strong>
            <p className="action-card-desc">{t("newPersonHint")}</p>
          </Link>
          <Link className="action-card soft" to="/public/new-house">
            <span className="action-card-ico">{Icons.homePlus({ size: 22 })}</span>
            <strong>{t("newHouse")}</strong>
            <p className="action-card-desc">{t("newHouseHint")}</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
