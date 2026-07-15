import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { I18nProvider } from "@/i18n";
import { AdminShell } from "@/shell/AdminShell";
import { PublicShell } from "@/shell/PublicShell";
import { Dashboard } from "@/pages/admin/Dashboard";
import { HousesPage } from "@/pages/admin/HousesPage";
import { HouseDetail } from "@/pages/admin/HouseDetail";
import { PeoplePage } from "@/pages/admin/PeoplePage";
import { PersonDetail } from "@/pages/admin/PersonDetail";
import { PendingPage } from "@/pages/admin/PendingPage";
import { AttendancePage } from "@/pages/admin/AttendancePage";
import { DocumentsPage } from "@/pages/admin/DocumentsPage";
import { ReportsPage } from "@/pages/admin/ReportsPage";
import { SettingsPage } from "@/pages/admin/SettingsPage";
import { PublicHome } from "@/pages/public/PublicHome";
import { PublicSearch } from "@/pages/public/PublicSearch";
import { PublicPerson } from "@/pages/public/PublicPerson";
import { PublicHouse } from "@/pages/public/PublicHouse";
import { PublicNewPerson } from "@/pages/public/PublicNewPerson";
import { PublicNewHouse } from "@/pages/public/PublicNewHouse";
import { PublicSubmitted } from "@/pages/public/PublicSubmitted";

export default function App() {
  return (
    <I18nProvider>
      <AppProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/public" replace />} />
            <Route path="/public" element={<PublicShell />}>
              <Route index element={<PublicHome />} />
              <Route path="search" element={<PublicSearch />} />
              <Route path="person/:id" element={<PublicPerson />} />
              <Route path="house/:id" element={<PublicHouse />} />
              <Route path="new-person" element={<PublicNewPerson />} />
              <Route path="new-house" element={<PublicNewHouse />} />
              <Route path="submitted" element={<PublicSubmitted />} />
            </Route>
            <Route path="/admin" element={<AdminShell />}>
              <Route index element={<Dashboard />} />
              <Route path="houses" element={<HousesPage />} />
              <Route path="houses/:id" element={<HouseDetail />} />
              <Route path="people" element={<PeoplePage />} />
              <Route path="people/:id" element={<PersonDetail />} />
              <Route path="pending" element={<PendingPage />} />
              <Route path="pending/:id" element={<PendingPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </HashRouter>
      </AppProvider>
    </I18nProvider>
  );
}
