import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import StockTable from './pages/admin/StockTable';
import Newspapers from './pages/admin/Newspapers';
import Workers from './pages/admin/Workers';
import Customers from './pages/admin/Customers';
import WorkerDashboard from './pages/worker/Dashboard';
import SuperAdminDashboard from './pages/superadmin/Dashboard';
import AdminLayout from './components/admin/AdminLayout';

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
        <Routes>
          <Route path="/login" element={<Login />} />

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
          </Route>

          {/* Worker Routes */}
          <Route
            path="/worker/*"
            element={
              <ProtectedRoute allowedRoles={['worker']}>
                <Routes>
                  <Route path="/" element={<WorkerDashboard />} />
                </Routes>
              </ProtectedRoute>
            }
          />

          {/* Super Admin Routes */}
          <Route
            path="/superadmin/*"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <Routes>
                  <Route path="/" element={<SuperAdminDashboard />} />
                </Routes>
              </ProtectedRoute>
            }
          />

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
