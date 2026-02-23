import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { organizerAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';

const STAT_COLORS = {
  indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
  blue:   'text-blue-400 bg-blue-500/10 border-blue-500/30',
  green:  'text-green-400 bg-green-500/10 border-green-500/30',
  purple: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
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
    <div className="min-h-screen bg-[#0a0a14]">
    <div className="w-full px-6 sm:px-10 md:px-16 lg:px-24 py-8 md:py-10">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-6 md:p-8 lg:p-10 mb-8 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">{user.organizerName}</h1>
            <p className="text-indigo-100 mt-1 md:text-lg">{user.category} — Event Dashboard</p>
          </div>
          <Link to="/organizer/create-event"
            className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-8 md:px-10 py-3 md:py-4 rounded-xl text-base md:text-lg font-bold hover:from-green-500 hover:to-emerald-600 transition shadow-xl text-center">
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
          <div key={s.label} className={`rounded-lg md:rounded-xl p-4 md:p-5 shadow-sm border ${STAT_COLORS[s.color]}`}>
            <div className="text-xl md:text-2xl mb-1">{s.icon}</div>
            <p className="text-2xl md:text-3xl font-bold">{s.val}</p>
            <p className="text-sm opacity-70 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Events Carousel / Grid */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {statuses.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${filter === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white/5 text-gray-400 border-gray-600 hover:border-indigo-400'}`}>
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-[#12122a] rounded-xl border border-indigo-500/20">
          No events in this category.{' '}
          <Link to="/organizer/create-event" className="text-indigo-400 hover:underline">Create one →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((ev) => {
            const analytics = data.analytics[ev._id.toString()] || {};
            return (
              <div key={ev._id} className="bg-[#12122a] rounded-xl border border-indigo-500/20 p-5 hover:border-indigo-500/40 transition">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-100 line-clamp-2">{ev.eventName}</h3>
                  <StatusBadge status={ev.status} />
                </div>
                <p className="text-xs text-gray-500 mb-1">{ev.eventType}</p>
                <p className="text-xs text-gray-400 mb-3">
                  📅 {new Date(ev.eventStartDate).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-400 mb-3">
                  👥 {ev.currentRegistrations}/{ev.registrationLimit} registered
                </p>
                {ev.status === 'Completed' && (
                  <div className="grid grid-cols-2 gap-2 text-xs bg-white/5 rounded-lg p-2 mb-3">
                    <div><span className="text-gray-500">Attended</span><br/><span className="font-semibold text-gray-200">{analytics.attended || 0}</span></div>
                    <div><span className="text-gray-500">Revenue</span><br/><span className="font-semibold text-gray-200">₹{analytics.revenue || 0}</span></div>
                  </div>
                )}
                <Link to={`/organizer/events/${ev._id}`}
                  className="block text-center text-sm md:text-base bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition font-semibold">
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
