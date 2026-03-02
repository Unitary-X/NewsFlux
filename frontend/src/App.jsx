import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminDashboard from './pages/admin/Dashboard';
import StockTable from './pages/admin/StockTable';
import Newspapers from './pages/admin/Newspapers';
import Workers from './pages/admin/Workers';
import Customers from './pages/admin/Customers';
import Subscriptions from './pages/admin/Subscriptions';
import Assignments from './pages/admin/Assignments';
import Billing from './pages/admin/Billing';
import Salaries from './pages/admin/Salaries';
import Reports from './pages/admin/Reports';
import PricingGrid from './pages/admin/PricingGrid';
import Backup from './pages/admin/Backup';
import WorkerDashboard from './pages/worker/Dashboard';
import MySales from './pages/worker/MySales';
import MySalary from './pages/worker/MySalary';
import RouteView from './pages/worker/RouteView';
import SuperAdminDashboard from './pages/superadmin/Dashboard';
import SuperAdminAgencies from './pages/superadmin/Agencies';
import SuperAdminAnalytics from './pages/superadmin/Analytics';
import SuperAdminAuditLogs from './pages/superadmin/AuditLogs';
import SuperAdminSystemHealth from './pages/superadmin/SystemHealth';
import SuperAdminSettings from './pages/superadmin/Settings';
import SuperAdminAnnouncements from './pages/superadmin/Announcements';
import SuperAdminBackup from './pages/superadmin/Backup';
import AdminLayout from './components/admin/AdminLayout';
import SuperAdminLayout from './components/superadmin/SuperAdminLayout';
import ImpersonationBanner from './components/ImpersonationBanner';
import AnnouncementBanner from './components/AnnouncementBanner';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    if (user.role === 'worker') return <Navigate to="/worker" />;
    if (user.role === 'admin') return <Navigate to="/admin" />;
    if (user.role === 'super_admin') return <Navigate to="/superadmin" />;
    return <Navigate to="/login" />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <ImpersonationBanner />
        <AnnouncementBanner />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Admin Routes with Sidebar Layout */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="stock" element={<StockTable />} />
            <Route path="newspapers" element={<Newspapers />} />
            <Route path="workers" element={<Workers />} />
            <Route path="customers" element={<Customers />} />
            <Route path="subscriptions" element={<Subscriptions />} />
            <Route path="assignments" element={<Assignments />} />
            <Route path="billing" element={<Billing />} />
            <Route path="salaries" element={<Salaries />} />
            <Route path="reports" element={<Reports />} />
            <Route path="pricing" element={<PricingGrid />} />
            <Route path="backup" element={<Backup />} />
          </Route>

          {/* Worker Routes */}
          <Route
            path="/worker/*"
            element={
              <ProtectedRoute allowedRoles={['worker']}>
                <Routes>
                  <Route path="/" element={<WorkerDashboard />} />
                  <Route path="/sales" element={<MySales />} />
                  <Route path="/salary" element={<MySalary />} />
                  <Route path="/route" element={<RouteView />} />
                </Routes>
              </ProtectedRoute>
            }
          />

          {/* Super Admin Routes with Sidebar Layout */}
          <Route
            path="/superadmin/*"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <SuperAdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<SuperAdminDashboard />} />
            <Route path="agencies" element={<SuperAdminAgencies />} />
            <Route path="analytics" element={<SuperAdminAnalytics />} />
            <Route path="announcements" element={<SuperAdminAnnouncements />} />
            <Route path="audit-logs" element={<SuperAdminAuditLogs />} />
            <Route path="system" element={<SuperAdminSystemHealth />} />
            <Route path="settings" element={<SuperAdminSettings />} />
            <Route path="backup" element={<SuperAdminBackup />} />
          </Route>

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
