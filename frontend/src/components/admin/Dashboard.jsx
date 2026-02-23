import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

const STAT_COLORS = {
  indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
  blue:   'text-blue-600 bg-blue-50 border-blue-100',
  purple: 'text-purple-600 bg-purple-50 border-purple-100',
  green:  'text-green-600 bg-green-50 border-green-100',
};

const AdminDashboard = () => {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    adminAPI.getDashboard()
      .then((res) => setStats(res.data.stats))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading dashboard…" />;
  if (error) return (
    <div className="w-full px-6 lg:px-12 py-8">
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 text-center">
        <p className="font-semibold">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg text-sm">Retry</button>
      </div>
    </div>
  );

  const cards = [
    { label: 'Total Participants',  val: stats?.totalParticipants  ?? 0, color: 'indigo', icon: '👥' },
    { label: 'Total Organizers',    val: stats?.totalOrganizers    ?? 0, color: 'blue',   icon: '🏢' },
    { label: 'Total Events',        val: stats?.totalEvents        ?? 0, color: 'purple', icon: '🎉' },
    { label: 'Total Registrations', val: stats?.totalRegistrations ?? 0, color: 'green',  icon: '🎫' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
    <div className="w-full px-6 lg:px-12 py-8">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-8 mb-8 shadow-lg">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-indigo-100 mt-1">System overview for Felicity 2026</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-2xl p-6 shadow-sm border flex flex-col gap-1 ${STAT_COLORS[c.color]}`}>
            <span className="text-2xl mb-1">{c.icon}</span>
            <p className="text-3xl font-bold">{c.val}</p>
            <p className="text-sm opacity-70">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { href: '/admin/organizers',      label: 'Manage Organizers',  desc: 'Create, view, delete organizer accounts',       icon: '🏢' },
          { href: '/admin/events',          label: 'All Events',         desc: 'View every event across all organizers',        icon: '🎉' },
          { href: '/admin/users',           label: 'All Users',          desc: 'Browse participants and their details',         icon: '👥' },
          { href: '/admin/password-resets', label: 'Password Resets',    desc: 'Review organizer password reset requests',      icon: '🔑' },
        ].map((link) => (
          <Link key={link.href} to={link.href}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-indigo-300 hover:shadow-md transition block group">
            <span className="text-3xl block mb-3">{link.icon}</span>
            <p className="font-semibold text-gray-800 group-hover:text-indigo-600 transition">{link.label}</p>
            <p className="text-sm text-gray-400 mt-1">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
    </div>
  );
};

export default AdminDashboard;
