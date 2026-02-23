import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Common
import Navbar          from './components/common/Navbar';
import ProtectedRoute  from './components/common/ProtectedRoute';
import LoadingSpinner  from './components/common/LoadingSpinner';

// Auth
import Login      from './components/auth/Login';
import Register   from './components/auth/Register';
import Onboarding from './components/auth/Onboarding';

// Participant
import ParticipantDashboard from './components/participant/Dashboard';
import BrowseEvents         from './components/participant/BrowseEvents';
import EventDetails         from './components/participant/EventDetails';
import TicketView           from './components/participant/TicketView';
import ParticipantProfile   from './components/participant/Profile';
import OrganizersList       from './components/participant/OrganizersList';
import OrganizerDetail      from './components/participant/OrganizerDetail';

// Organizer
import OrganizerDashboard from './components/organizer/Dashboard';
import CreateEvent        from './components/organizer/CreateEvent';
import EventManagement    from './components/organizer/EventManagement';
import OrganizerProfile   from './components/organizer/Profile';

// Admin
import AdminDashboard   from './components/admin/Dashboard';
import ManageOrganizers from './components/admin/ManageOrganizers';
import AllEvents        from './components/admin/AllEvents';
import AllUsers              from './components/admin/AllUsers';
import PasswordResetRequests from './components/admin/PasswordResetRequests';

const RootRedirect = () => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user.role === 'Admin')     return <Navigate to="/admin/dashboard"     replace />;
  if (user.role === 'Organizer') return <Navigate to="/organizer/dashboard" replace />;
  return <Navigate to="/participant/dashboard" replace />;
};

const App = () => {
  const { loading } = useAuth();

  if (loading) return <LoadingSpinner text="Loading…" />;

  return (
    <>
      <Navbar />
      <Routes>
        {/* Root */}
        <Route path="/" element={<RootRedirect />} />

        {/* Public */}
        <Route path="/login"    element={<Login />}    />
        <Route path="/register" element={<Register />} />

        {/* Participant */}
        <Route path="/participant/onboarding" element={
          <ProtectedRoute allowedRoles={['Participant']}><Onboarding /></ProtectedRoute>
        } />
        <Route path="/participant/dashboard" element={
          <ProtectedRoute allowedRoles={['Participant']}><ParticipantDashboard /></ProtectedRoute>
        } />
        <Route path="/participant/events" element={
          <ProtectedRoute allowedRoles={['Participant']}><BrowseEvents /></ProtectedRoute>
        } />
        <Route path="/participant/events/:id" element={
          <ProtectedRoute allowedRoles={['Participant']}><EventDetails /></ProtectedRoute>
        } />
        <Route path="/participant/ticket/:id" element={
          <ProtectedRoute allowedRoles={['Participant']}><TicketView /></ProtectedRoute>
        } />
        <Route path="/participant/profile" element={
          <ProtectedRoute allowedRoles={['Participant']}><ParticipantProfile /></ProtectedRoute>
        } />
        <Route path="/participant/organizers" element={
          <ProtectedRoute allowedRoles={['Participant']}><OrganizersList /></ProtectedRoute>
        } />
        <Route path="/participant/organizers/:id" element={
          <ProtectedRoute allowedRoles={['Participant']}><OrganizerDetail /></ProtectedRoute>
        } />

        {/* Organizer */}
        <Route path="/organizer/dashboard" element={
          <ProtectedRoute allowedRoles={['Organizer']}><OrganizerDashboard /></ProtectedRoute>
        } />
        <Route path="/organizer/create-event" element={
          <ProtectedRoute allowedRoles={['Organizer']}><CreateEvent /></ProtectedRoute>
        } />
        <Route path="/organizer/events/:id" element={
          <ProtectedRoute allowedRoles={['Organizer']}><EventManagement /></ProtectedRoute>
        } />
        <Route path="/organizer/profile" element={
          <ProtectedRoute allowedRoles={['Organizer']}><OrganizerProfile /></ProtectedRoute>
        } />

        {/* Admin */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRoles={['Admin']}><AdminDashboard /></ProtectedRoute>
        } />
        <Route path="/admin/organizers" element={
          <ProtectedRoute allowedRoles={['Admin']}><ManageOrganizers /></ProtectedRoute>
        } />
        <Route path="/admin/events" element={
          <ProtectedRoute allowedRoles={['Admin']}><AllEvents /></ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute allowedRoles={['Admin']}><AllUsers /></ProtectedRoute>
        } />        <Route path="/admin/password-resets" element={
          <ProtectedRoute allowedRoles={['Admin']}><PasswordResetRequests /></ProtectedRoute>
        }/>
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default App;
