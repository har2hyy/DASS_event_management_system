import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) =>
    location.pathname.startsWith(path) ? 'bg-indigo-700' : 'hover:bg-indigo-700';

  const participantLinks = [
    { to: '/participant/dashboard', label: 'Dashboard' },
    { to: '/participant/events',    label: 'Browse Events' },
    { to: '/participant/organizers',label: 'Clubs' },
    { to: '/participant/profile',   label: 'Profile' },
  ];

  const organizerLinks = [
    { to: '/organizer/dashboard',   label: 'Dashboard' },
    { to: '/organizer/create-event',label: 'Create Event' },
    { to: '/organizer/profile',     label: 'Profile' },
  ];

  const adminLinks = [
    { to: '/admin/dashboard',       label: 'Dashboard' },
    { to: '/admin/organizers',      label: 'Organizers' },
    { to: '/admin/events',          label: 'All Events' },
    { to: '/admin/users',           label: 'Users' },
  ];

  const links = user?.role === 'Participant' ? participantLinks
    : user?.role === 'Organizer' ? organizerLinks
    : user?.role === 'Admin' ? adminLinks
    : [];

  return (
    <nav className="bg-indigo-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold tracking-wide">
          🎉 Felicity 2026
        </Link>

        {user && (
          <div className="flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded text-sm font-medium transition ${isActive(link.to)}`}
              >
                {link.label}
              </Link>
            ))}
            <div className="ml-4 flex items-center gap-2">
              <span className="text-sm text-indigo-200">
                {user.firstName || user.organizerName || 'Admin'}
              </span>
              <button
                onClick={logout}
                className="bg-white text-indigo-600 px-3 py-1.5 rounded text-sm font-semibold hover:bg-indigo-50 transition"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
