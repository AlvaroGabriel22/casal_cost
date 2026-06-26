import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { ProtectedRoute } from '../routes/ProtectedRoute';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { IndividualDashboardPage } from '../pages/IndividualDashboardPage';
import { IndividualStatementPage } from '../pages/IndividualStatementPage';
import { CoupleDashboardPage } from '../pages/CoupleDashboardPage';
import { ExpensesPage } from '../pages/ExpensesPage';
import { ExpenseFormPage } from '../pages/ExpenseFormPage';
import { IncomesPage } from '../pages/IncomesPage';
import { InstallmentsPage } from '../pages/InstallmentsPage';
import { InvestmentsPage } from '../pages/InvestmentsPage';
import { BankStatementImportPage } from '../pages/BankStatementImportPage';
import { AssistantPage } from '../pages/AssistantPage';
import { FinancialSettingsPage } from '../pages/FinancialSettingsPage';
import { PermissionsPage } from '../pages/PermissionsPage';
import { CouplePage } from '../pages/CouplePage';
import { ProfilePage } from '../pages/ProfilePage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard/individual" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard/individual" element={<IndividualDashboardPage />} />
          <Route path="/statement/individual" element={<IndividualStatementPage />} />
          <Route path="/statement/import" element={<BankStatementImportPage />} />
          <Route path="/dashboard/couple" element={<CoupleDashboardPage />} />
          <Route path="/expenses/individual" element={<ExpensesPage scope="INDIVIDUAL" />} />
          <Route path="/expenses/couple" element={<ExpensesPage scope="SHARED" />} />
          <Route path="/expenses/new" element={<ExpenseFormPage />} />
          <Route path="/installments" element={<InstallmentsPage />} />
          <Route path="/investments/individual" element={<InvestmentsPage scope="INDIVIDUAL" />} />
          <Route path="/investments/couple" element={<InvestmentsPage scope="COUPLE" />} />
          <Route path="/assistente" element={<AssistantPage />} />
          <Route path="/incomes" element={<IncomesPage />} />
          <Route path="/couple" element={<CouplePage />} />
          <Route path="/permissions" element={<PermissionsPage />} />
          <Route path="/settings/financial" element={<FinancialSettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
