import React, { useEffect, useState, useMemo } from 'react';
import { participantAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';
import { Link } from 'react-router-dom';

const TABS = ['Upcoming', 'Normal', 'Merchandise', 'Completed', 'Cancelled'];

const STAT_COLORS = {
  indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
  purple: 'text-purple-600 bg-purple-50 border-purple-100',
  green:  'text-green-600 bg-green-50 border-green-100',
  red:    'text-red-600 bg-red-50 border-red-100',
};

const ParticipantDashboard = () => {
  const { user } = useAuth();
  const [data, setData]     = useState({ upcoming: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [tab, setTab]       = useState('Upcoming');

  useEffect(() => {
    participantAPI.getDashboard()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const list = useMemo(() => {
    if (tab === 'Upcoming') return data.upcoming;
    if (tab === 'Cancelled') return data.history.filter((r) => ['Cancelled', 'Rejected'].includes(r.status));
    if (tab === 'Completed') return data.history.filter((r) => r.event?.status === 'Completed');
    if (tab === 'Normal') return data.history.filter((r) => r.event?.eventType === 'Normal' && !['Cancelled', 'Rejected'].includes(r.status));
    if (tab === 'Merchandise') return data.history.filter((r) => r.event?.eventType === 'Merchandise' && !['Cancelled', 'Rejected'].includes(r.status));
    return [];
  }, [tab, data]);

  if (loading) return <LoadingSpinner text="Loading dashboard…" />;

  if (error) return (
    <div className="w-full px-6 lg:px-12 py-8">
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 text-center">
        <p className="font-semibold text-lg mb-1">Something went wrong</p>
        <p className="text-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 bg-red-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-red-700 transition">Retry</button>
      </div>
    </div>
  );

  const stats = [
    { label: 'Upcoming', val: data.upcoming.length,   color: 'indigo', icon: '📅' },
    { label: 'Total',    val: data.history.length + data.upcoming.length, color: 'purple', icon: '📊' },
    { label: 'Attended', val: data.history.filter((r) => r.status === 'Attended').length, color: 'green', icon: '✅' },
    { label: 'Cancelled',val: data.history.filter((r) => r.status === 'Cancelled').length, color: 'red', icon: '❌' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
    <div className="w-full px-6 sm:px-10 md:px-16 lg:px-24 py-8 md:py-10">
      {/* Hero */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-6 md:p-8 lg:p-10 mb-8 shadow-lg">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1">
          Welcome back, {user?.firstName || 'Participant'}! 👋
        </h1>
        <p className="text-indigo-100 md:text-lg">Here's your event activity at Felicity 2026</p>
        <div className="mt-5">
          <Link to="/participant/events" className="inline-block bg-gradient-to-r from-green-400 to-emerald-500 text-white px-8 md:px-10 py-3 md:py-4 rounded-xl text-base md:text-lg font-bold hover:from-green-500 hover:to-emerald-600 transition shadow-xl">
            Browse Events →
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-lg md:rounded-xl p-4 md:p-5 shadow-sm border ${STAT_COLORS[s.color]}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl md:text-2xl">{s.icon}</span>
            </div>
            <p className="text-2xl md:text-3xl font-bold">{s.val}</p>
            <p className="text-sm opacity-70 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg md:rounded-xl p-1 w-fit overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${tab === t ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 md:p-12 text-center shadow-sm border border-gray-100">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-gray-500 text-base md:text-lg font-medium">No events in this category yet.</p>
          {tab === 'Upcoming' && (
            <div className="mt-4">
              <Link to="/participant/events" className="inline-block bg-gradient-to-r from-green-400 to-emerald-500 text-white px-8 md:px-10 py-3 md:py-4 rounded-xl text-base md:text-lg font-bold hover:from-green-500 hover:to-emerald-600 transition shadow-xl">
                Browse and register for events →
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {list.map((reg) => (
            <div key={reg._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 hover:shadow-md transition">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Link
                      to={`/participant/events/${reg.event?._id}`}
                      className="font-semibold text-gray-800 hover:text-indigo-600 transition truncate"
                    >
                      {reg.event?.eventName || '—'}
                    </Link>
                    <StatusBadge status={reg.status} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                    <span>🏢 {reg.event?.organizer?.organizerName || '—'}</span>
                    <span>🏷️ {reg.event?.eventType || '—'}</span>
                    <span>📅 {reg.event?.eventStartDate ? new Date(reg.event.eventStartDate).toLocaleDateString() : '—'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/participant/events/${reg.event?._id}`}
                    className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition whitespace-nowrap"
                  >
                    View Event
                  </Link>
                  <Link
                    to={`/participant/ticket/${reg._id}`}
                    className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition whitespace-nowrap"
                  >
                    🎟️ Ticket
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  );
};

export default ParticipantDashboard;
