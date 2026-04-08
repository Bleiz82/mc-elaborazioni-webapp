/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Login from './pages/auth/Login';
import AdminLayout from './layouts/AdminLayout';
import ClientLayout from './layouts/ClientLayout';
import AdminDashboard from './pages/admin/Dashboard';
import ClientsList from './pages/admin/ClientsList';
import ClientDetails from './pages/admin/ClientDetails';
import AdminDeadlines from './pages/admin/Deadlines';
import AdminDocuments from './pages/admin/Documents';
import AdminPayments from './pages/admin/Payments';
import AdminCollaborators from './pages/admin/Collaborators';
import AdminReports from './pages/admin/Reports';
import AdminSettings from './pages/admin/Settings';
import PracticesKanban from './pages/admin/PracticesKanban';
import AISubagents from './pages/admin/AISubagents';
import Communications from './pages/admin/Communications';
import ClientHome from './pages/client/Home';
import ClientDocuments from './pages/client/Documents';
import ClientDeadlines from './pages/client/Deadlines';
import ClientPayments from './pages/client/Payments';
import ClientChat from './pages/client/Chat';

// Placeholder pages
const Placeholder = ({ title }: { title: string }) => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
    <p className="text-slate-500 mt-2">Pagina in costruzione...</p>
  </div>
);

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div></div>;
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to={profile.role === 'client' ? '/client/home' : '/admin/dashboard'} replace />;
  }

  return <>{children}</>;
};

const RootRedirect = () => {
  const { user, profile, loading } = useAuth();
  
  if (loading) return null;
  
  if (!user || !profile) return <Navigate to="/login" replace />;
  
  if (profile.role === 'client') return <Navigate to="/client/home" replace />;
  return <Navigate to="/admin/dashboard" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin', 'collaborator']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="clients" element={<ClientsList />} />
            <Route path="clients/:id" element={<ClientDetails />} />
            <Route path="deadlines" element={<AdminDeadlines />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="documents" element={<AdminDocuments />} />
            <Route path="practices" element={<PracticesKanban />} />
            <Route path="communications" element={<Communications />} />
            <Route path="collaborators" element={<AdminCollaborators />} />
            <Route path="ai-subagents" element={<AISubagents />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Client Routes */}
          <Route path="/client" element={
            <ProtectedRoute allowedRoles={['client']}>
              <ClientLayout />
            </ProtectedRoute>
          }>
            <Route path="home" element={<ClientHome />} />
            <Route path="documents" element={<ClientDocuments />} />
            <Route path="deadlines" element={<ClientDeadlines />} />
            <Route path="payments" element={<ClientPayments />} />
            <Route path="practices" element={<Placeholder title="Le Mie Pratiche" />} />
            <Route path="chat" element={<ClientChat />} />
            <Route path="profile" element={<Placeholder title="Profilo" />} />
          </Route>
        </Routes>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}
