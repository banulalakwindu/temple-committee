import { EmptyState } from "@/components/ListPage";
import { useI18n } from "@/i18n";
import { displayName } from "@/lib/api";

export type PublicPayment = {
  id: number;
  payment_date: string;
  type_name_si: string;
  type_name_en: string;
  subject_type?: "person" | "house";
  person_name_si?: string;
  person_name_en?: string;
};

export function PublicPaymentsSection({
  payments,
  showPerson = false,
  hideTitle = false,
}: {
  payments: PublicPayment[];
  showPerson?: boolean;
  hideTitle?: boolean;
}) {
  const { t, locale } = useI18n();

  return (
    <div className={hideTitle ? undefined : "public-docs-section"}>
      {!hideTitle ? <h3>{t("payments")}</h3> : null}
      {!payments.length ? (
        <EmptyState message={t("noPaymentsFront")} />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t("paymentDate")}</th>
                <th>{t("paymentType")}</th>
                {showPerson ? <th>{t("people")}</th> : null}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.payment_date}</td>
                  <td>{displayName(p.type_name_si, p.type_name_en, locale)}</td>
                  {showPerson ? (
                    <td>
                      {p.subject_type === "house"
                        ? t("house")
                        : displayName(
                            p.person_name_si,
                            p.person_name_en,
                            locale,
                          ) || "—"}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
