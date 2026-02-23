import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import felicityLogo from '../../assets/felicity_logo.png';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) =>
    location.pathname.startsWith(path) ? 'bg-indigo-700' : 'hover:bg-indigo-700/60';

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
    <nav className="bg-[#0d0d1a]/95 text-white shadow-lg sticky top-0 z-50 border-b border-indigo-500/20 backdrop-blur-md">
      <div className="w-full px-6 sm:px-10 md:px-16 lg:px-24">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Left: Brand */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={felicityLogo} alt="Felicity 2026" className="h-8 md:h-10" style={{ filter: 'brightness(0) invert(1)' }} />
          </Link>

          {/* Center: Nav links (desktop) */}
          {user && (
            <div className="hidden md:flex items-center gap-1 mx-6">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-2 text-sm font-medium transition ${location.pathname.startsWith(link.to) ? 'text-indigo-400 bg-indigo-500/10 border-b-2 border-indigo-400' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right: User info + logout (desktop) */}
          {user && (
            <div className="hidden md:flex items-center gap-3 shrink-0">
              <span className="text-sm text-indigo-200 font-medium">
                {user.firstName || user.organizerName || 'Admin'}
              </span>
              <button
                onClick={logout}
                className="border border-indigo-500/50 text-indigo-400 px-5 py-2 text-sm font-semibold hover:bg-indigo-500/20 transition"
              >
                Logout
              </button>
            </div>
          )}

          {/* Mobile hamburger */}
          {user && (
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 hover:bg-white/10 transition"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {user && mobileOpen && (
        <div className="md:hidden border-t border-indigo-500/20 bg-[#0d0d1a]/98">
          <div className="px-4 py-3 space-y-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 text-sm font-medium transition ${location.pathname.startsWith(link.to) ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 mt-2 border-t border-indigo-500/20 flex items-center justify-between">
              <span className="text-sm text-gray-400">
                {user.firstName || user.organizerName || 'Admin'}
              </span>
              <button
                onClick={logout}
                className="border border-indigo-500/50 text-indigo-400 px-5 py-2 text-sm font-semibold hover:bg-indigo-500/20 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
