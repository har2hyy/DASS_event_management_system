import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles, role }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Support both allowedRoles (array) and role (string)
  const roles = allowedRoles || (role ? [role] : []);
  if (roles.length > 0 && !roles.includes(user.role)) {
    const redirects = { Participant: '/participant/dashboard', Organizer: '/organizer/dashboard', Admin: '/admin/dashboard' };
    return <Navigate to={redirects[user.role] || '/login'} replace />;
  }

  return children;
};

export default ProtectedRoute;
