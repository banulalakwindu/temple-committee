import { EmptyState } from "@/components/ListPage";
import { useI18n } from "@/i18n";
import { displayName } from "@/lib/api";

export type PublicDocument = {
  id: number;
  person_id: number;
  issue_date: string;
  issued_by: string;
  remarks: string;
  document_other?: string | null;
  person_name_si?: string;
  person_name_en?: string;
  type_name_si?: string;
  type_name_en?: string;
};

function docTypeLabel(
  d: PublicDocument,
  locale: string,
): string {
  if (d.type_name_si || d.type_name_en) {
    return displayName(d.type_name_si, d.type_name_en, locale);
  }
  return d.document_other?.trim() || "—";
}

export function PublicDocumentsSection({
  docs,
  showPerson = false,
  hideTitle = false,
}: {
  docs: PublicDocument[];
  /** House view: show which family member received the document */
  showPerson?: boolean;
  hideTitle?: boolean;
}) {
  const { t, locale } = useI18n();

  return (
    <div className={hideTitle ? undefined : "public-docs-section"}>
      {!hideTitle ? <h3>{t("documents")}</h3> : null}
      {!docs.length ? (
        <EmptyState message={t("noDocumentsFront")} />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t("issueDate")}</th>
                {showPerson ? <th>{t("people")}</th> : null}
                <th>{t("documentType")}</th>
                <th>{t("issuedBy")}</th>
                <th>{t("remarks")}</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td>{d.issue_date}</td>
                  {showPerson ? (
                    <td>
                      {displayName(d.person_name_si, d.person_name_en, locale) ||
                        "—"}
                    </td>
                  ) : null}
                  <td>{docTypeLabel(d, locale)}</td>
                  <td>{d.issued_by || "—"}</td>
                  <td>{d.remarks || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
