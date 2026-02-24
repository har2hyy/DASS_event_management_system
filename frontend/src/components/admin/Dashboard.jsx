import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

const STAT_COLORS = {
  indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
  blue:   'text-blue-400 bg-blue-500/10 border-blue-500/30',
  purple: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  green:  'text-green-400 bg-green-500/10 border-green-500/30',
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
      <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-6 text-center">
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
    <div className="min-h-screen bg-[#0a0a14]">
    <div className="w-full px-6 sm:px-10 md:px-16 lg:px-24 py-8 md:py-10">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-6 md:p-8 lg:p-10 mb-8 shadow-[0_0_50px_rgba(99,102,241,0.35)]">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">Admin Dashboard</h1>
        <p className="text-indigo-100 mt-1 md:text-lg">System overview for Felicity 2026</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-lg md:rounded-2xl p-4 md:p-6 shadow-sm border flex flex-col gap-1 ${STAT_COLORS[c.color]}`}>
            <span className="text-2xl mb-1">{c.icon}</span>
            <p className="text-2xl md:text-3xl font-bold">{c.val}</p>
            <p className="text-xs md:text-sm opacity-70">{c.label}</p>
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
            className="bg-[#12122a] rounded-2xl p-5 md:p-6 border border-indigo-500/20 hover:border-indigo-400/50 hover:shadow-lg hover:shadow-indigo-500/10 transition block group">
            <span className="text-3xl block mb-3">{link.icon}</span>
            <p className="font-semibold text-gray-200 group-hover:text-indigo-400 transition">{link.label}</p>
            <p className="text-sm text-gray-500 mt-1">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
    </div>
  );
};

export default AdminDashboard;
