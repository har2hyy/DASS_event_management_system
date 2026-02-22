import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { organizerAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';

const OrganizerDashboard = () => {
  const { user } = useAuth();
  const [data,    setData]    = useState({ events: [], analytics: {} });
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('All');

  useEffect(() => {
    organizerAPI.getDashboard()
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading dashboard…" />;

  const statuses = ['All', 'Draft', 'Published', 'Ongoing', 'Completed', 'Closed'];
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {user.organizerName} — Dashboard
          </h1>
          <p className="text-gray-500 text-sm">{user.category}</p>
        </div>
        <Link to="/organizer/create-event"
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
          + Create Event
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Events',   val: data.events.length,                     color: 'indigo' },
          { label: 'Published',      val: data.events.filter((e) => e.status === 'Published').length, color: 'blue' },
          { label: 'Total Revenue',  val: `₹${totalRevenue.toLocaleString()}`,     color: 'green' },
          { label: 'Total Attended', val: totalAttended,                           color: 'purple' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className={`text-2xl font-bold text-${s.color}-600`}>{s.val}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
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
                  className="block text-center text-sm bg-indigo-50 text-indigo-600 py-2 rounded-lg hover:bg-indigo-100 transition font-medium">
                  Manage →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrganizerDashboard;
