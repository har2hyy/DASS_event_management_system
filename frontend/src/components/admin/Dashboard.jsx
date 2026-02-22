import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

const AdminDashboard = () => {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getDashboard()
      .then((res) => setStats(res.data.stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading dashboard…" />;

  const cards = [
    { label: 'Total Participants',  val: stats?.totalParticipants  ?? 0, color: 'indigo' },
    { label: 'Total Organizers',    val: stats?.totalOrganizers    ?? 0, color: 'blue'   },
    { label: 'Total Events',        val: stats?.totalEvents        ?? 0, color: 'purple' },
    { label: 'Total Registrations', val: stats?.totalRegistrations ?? 0, color: 'green'  },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-1">
            <p className={`text-3xl font-bold text-${c.color}-600`}>{c.val}</p>
            <p className="text-sm text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { href: '/admin/organizers', label: 'Manage Organizers', desc: 'Create, view, delete organizer accounts' },
          { href: '/admin/events',     label: 'All Events',        desc: 'View every event across all organizers' },
          { href: '/admin/users',      label: 'All Users',         desc: 'Browse participants and their details'  },
        ].map((link) => (
          <a key={link.href} href={link.href}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-indigo-300 hover:shadow-md transition block">
            <p className="font-semibold text-gray-800">{link.label}</p>
            <p className="text-sm text-gray-400 mt-0.5">{link.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
