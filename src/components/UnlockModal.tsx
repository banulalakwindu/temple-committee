import { useState } from "react";
import { useI18n } from "@/i18n";
import { useApp } from "@/context/AppContext";

export function UnlockModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useI18n();
  const { unlock } = useApp();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>{t("unlockAdmin")}</h3>
        <div className="field">
          <label className="label">{t("password")}</label>
          <input
            className="input"
            type="password"
            value={password}
            autoFocus
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void unlock(password).then((ok) => {
                  if (ok) {
                    setPassword("");
                    setError("");
                    onSuccess();
                  } else setError(t("wrongPassword"));
                });
              }
            }}
          />
        </div>
        {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
        <div className="form-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            {t("cancel")}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              void unlock(password).then((ok) => {
                if (ok) {
                  setPassword("");
                  setError("");
                  onSuccess();
                } else setError(t("wrongPassword"));
              });
            }}
          >
            {t("unlock")}
          </button>
        </div>
      </div>
    </div>
  );
}
