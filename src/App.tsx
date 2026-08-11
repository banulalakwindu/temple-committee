import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppTitleBar } from "@/components/AppTitleBar";
import { WelcomeModal } from "@/components/WelcomeModal";
import { AppProvider } from "@/context/AppContext";
import { ConfirmProvider } from "@/context/ConfirmContext";
import { ToastProvider } from "@/context/ToastContext";
import { TableDensityBoot } from "@/hooks/useTableDensity";
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
import { DanaPage } from "@/pages/admin/DanaPage";
import { EventsPage } from "@/pages/admin/EventsPage";
import { TasksPage } from "@/pages/admin/TasksPage";
import { DocumentsPage } from "@/pages/admin/DocumentsPage";
import { PaymentsPage } from "@/pages/admin/PaymentsPage";
import { TempleInfoPage } from "@/pages/admin/TempleInfoPage";
import { SettingsPage } from "@/pages/admin/SettingsPage";
import { PublicHome } from "@/pages/public/PublicHome";
import { PublicSearch } from "@/pages/public/PublicSearch";
import { PublicPerson } from "@/pages/public/PublicPerson";
import { PublicHouse } from "@/pages/public/PublicHouse";
import { PublicNewPerson } from "@/pages/public/PublicNewPerson";
import { PublicNewHousehold } from "@/pages/public/PublicNewHousehold";
import { PublicSubmitted } from "@/pages/public/PublicSubmitted";

export default function App() {
  return (
    <I18nProvider>
      <AppProvider>
        <ToastProvider>
          <ConfirmProvider>
            <TableDensityBoot />
            <HashRouter>
              <div className="desktop-frame">
                <AppTitleBar />
                <div className="desktop-body">
                  <Routes>
                    <Route path="/" element={<Navigate to="/public" replace />} />
                    <Route path="/public" element={<PublicShell />}>
                      <Route index element={<PublicHome />} />
                      <Route path="search" element={<PublicSearch />} />
                      <Route path="person/:id" element={<PublicPerson />} />
                      <Route path="house/:id" element={<PublicHouse />} />
                      <Route path="new-person" element={<PublicNewPerson />} />
                      <Route path="new-household" element={<PublicNewHousehold />} />
                      <Route
                        path="new-house"
                        element={<Navigate to="/public/new-household" replace />}
                      />
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
                      <Route path="dana" element={<DanaPage />} />
                      <Route path="events" element={<EventsPage />} />
                      <Route path="tasks" element={<TasksPage />} />
                      <Route path="documents" element={<DocumentsPage />} />
                      <Route path="payments" element={<PaymentsPage />} />
                      <Route path="temple-info" element={<TempleInfoPage />} />
                      <Route path="settings" element={<SettingsPage />} />
                    </Route>
                  </Routes>
                </div>
                <WelcomeModal />
              </div>
            </HashRouter>
          </ConfirmProvider>
        </ToastProvider>
      </AppProvider>
    </I18nProvider>
  );
}
