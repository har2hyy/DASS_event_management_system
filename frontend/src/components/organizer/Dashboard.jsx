import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { organizerAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';

const STAT_COLORS = {
  indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
  blue:   'text-blue-600 bg-blue-50 border-blue-100',
  green:  'text-green-600 bg-green-50 border-green-100',
  purple: 'text-purple-600 bg-purple-50 border-purple-100',
};

const OrganizerDashboard = () => {
  const { user } = useAuth();
  const [data,    setData]    = useState({ events: [], analytics: {} });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [filter,  setFilter]  = useState('All');

  useEffect(() => {
    organizerAPI.getDashboard()
      .then((res) => setData(res.data))
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

  const statuses = ['All', 'Draft', 'Published', 'Ongoing', 'Completed', 'Cancelled'];
  const filtered = filter === 'All' ? data.events : data.events.filter((e) => e.status === filter);

  const completedEvents = data.events.filter((e) => e.status === 'Completed');
  const totalRevenue    = completedEvents.reduce((sum, ev) => {
    const a = data.analytics[ev._id.toString()];
    return sum + (a?.revenue || 0);
  }, 0);
  const totalAttended   = completedEvents.reduce((sum, ev) => {
    const a = data.analytics[ev._id.toString()];
    return sum + (a?.attended || 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
    <div className="w-full px-6 lg:px-12 py-8">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-8 mb-8 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{user.organizerName}</h1>
            <p className="text-indigo-100 mt-1">{user.category} — Event Dashboard</p>
          </div>
          <Link to="/organizer/create-event"
            className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-10 py-4 rounded-2xl text-lg font-bold hover:from-green-500 hover:to-emerald-600 transition shadow-xl">
            + Create Event
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Events',   val: data.events.length,                     color: 'indigo', icon: '📊' },
          { label: 'Published',      val: data.events.filter((e) => e.status === 'Published').length, color: 'blue', icon: '🚀' },
          { label: 'Total Revenue',  val: `₹${totalRevenue.toLocaleString()}`,     color: 'green', icon: '💰' },
          { label: 'Total Attended', val: totalAttended,                           color: 'purple', icon: '👥' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-5 shadow-sm border ${STAT_COLORS[s.color]}`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className="text-3xl font-bold">{s.val}</p>
            <p className="text-sm opacity-70 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Events Carousel / Grid */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {statuses.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${filter === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'}`}>
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
          No events in this category.{' '}
          <Link to="/organizer/create-event" className="text-indigo-600 hover:underline">Create one →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((ev) => {
            const analytics = data.analytics[ev._id.toString()] || {};
            return (
              <div key={ev._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-800 line-clamp-2">{ev.eventName}</h3>
                  <StatusBadge status={ev.status} />
                </div>
                <p className="text-xs text-gray-400 mb-1">{ev.eventType}</p>
                <p className="text-xs text-gray-500 mb-3">
                  📅 {new Date(ev.eventStartDate).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  👥 {ev.currentRegistrations}/{ev.registrationLimit} registered
                </p>
                {ev.status === 'Completed' && (
                  <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 rounded-lg p-2 mb-3">
                    <div><span className="text-gray-400">Attended</span><br/><span className="font-semibold">{analytics.attended || 0}</span></div>
                    <div><span className="text-gray-400">Revenue</span><br/><span className="font-semibold">₹{analytics.revenue || 0}</span></div>
                  </div>
                )}
                <Link to={`/organizer/events/${ev._id}`}
                  className="block text-center text-sm bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 transition font-semibold">
                  Manage →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
    </div>
  );
};

export default OrganizerDashboard;
