import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/AppShell';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Approvals } from './pages/Approvals';
import { Verification } from './pages/Verification';
import { Users } from './pages/Users';
import { AddUser } from './pages/AddUser';
import { PendingTopups } from './pages/PendingTopups';
import { SupportChat } from './pages/SupportChat';
import { AssistantRequests } from './pages/AssistantRequests';
import { ContactMessages } from './pages/ContactMessages';
import { Transactions } from './pages/Transactions';
import { Expenses } from './pages/Expenses';
import { SendSms } from './pages/SendSms';
import { BulkSms } from './pages/BulkSms';
import { SmsSettings } from './pages/SmsSettings';
import { SmsAnalytics } from './pages/SmsAnalytics';
import { Settings } from './pages/Settings';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppShell>
                <Dashboard />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/approvals"
          element={
            <ProtectedRoute>
              <AppShell>
                <Approvals />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/verification"
          element={
            <ProtectedRoute>
              <AppShell>
                <Verification />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <AppShell>
                <Users />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/new"
          element={
            <ProtectedRoute>
              <AppShell>
                <AddUser />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pending-topups"
          element={
            <ProtectedRoute>
              <AppShell>
                <PendingTopups />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/support-chat"
          element={
            <ProtectedRoute>
              <AppShell>
                <SupportChat />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assistant-requests"
          element={
            <ProtectedRoute>
              <AppShell>
                <AssistantRequests />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/contact-messages"
          element={
            <ProtectedRoute>
              <AppShell>
                <ContactMessages />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <AppShell>
                <Transactions />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/expenses"
          element={
            <ProtectedRoute>
              <AppShell>
                <Expenses />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sms"
          element={
            <ProtectedRoute>
              <AppShell>
                <SendSms />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sms/marketing"
          element={
            <ProtectedRoute>
              <AppShell>
                <BulkSms />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sms/settings"
          element={
            <ProtectedRoute>
              <AppShell>
                <SmsSettings />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sms/analytics"
          element={
            <ProtectedRoute>
              <AppShell>
                <SmsAnalytics />
              </AppShell>
            </ProtectedRoute>
          }
        />
        {/* The flat paths these screens used to live at, kept working so a
            bookmark or a link in an old message still lands on the page. */}
        <Route path="/sms-marketing" element={<Navigate to="/sms/marketing" replace />} />
        <Route path="/sms-analytics" element={<Navigate to="/sms/analytics" replace />} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AppShell>
                <Settings />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
