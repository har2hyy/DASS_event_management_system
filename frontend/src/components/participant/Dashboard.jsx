import React, { useEffect, useState } from 'react';
import { participantAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';
import { Link } from 'react-router-dom';

const TABS = ['Upcoming', 'Normal', 'Merchandise', 'Completed', 'Cancelled'];

const ParticipantDashboard = () => {
  const { user } = useAuth();
  const [data, setData]     = useState({ upcoming: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState('Upcoming');

  useEffect(() => {
    participantAPI.getDashboard()
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading dashboard…" />;

  const getList = () => {
    setLoading(false);
    if (tab === 'Upcoming') return data.upcoming;
    if (tab === 'Cancelled') return data.history.filter((r) => ['Cancelled', 'Rejected'].includes(r.status));
    if (tab === 'Completed') return data.history.filter((r) => r.event?.status === 'Completed');
    if (tab === 'Normal') return data.history.filter((r) => r.event?.eventType === 'Normal' && !['Cancelled', 'Rejected'].includes(r.status));
    if (tab === 'Merchandise') return data.history.filter((r) => r.event?.eventType === 'Merchandise' && !['Cancelled', 'Rejected'].includes(r.status));
    return [];
  };

  const list = getList();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome back, {user.firstName}! 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">Here's your event activity</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Upcoming', val: data.upcoming.length,   color: 'indigo' },
          { label: 'Total',    val: data.history.length + data.upcoming.length, color: 'purple' },
          { label: 'Attended', val: data.history.filter((r) => r.status === 'Attended').length, color: 'green' },
          { label: 'Cancelled',val: data.history.filter((r) => r.status === 'Cancelled').length, color: 'red' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className={`text-2xl font-bold text-${s.color}-600`}>{s.val}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center text-gray-400">
          No events in this category yet.
          {tab === 'Upcoming' && (
            <div className="mt-4">
              <Link to="/participant/events" className="text-indigo-600 font-medium hover:underline">
                Browse and register for events →
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Event</th>
                <th className="text-left px-4 py-3">Organizer</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Ticket ID</th>
                <th className="text-left px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((reg) => (
                <tr key={reg._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {reg.event?.eventName || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {reg.event?.organizer?.organizerName || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {reg.event?.eventType || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={reg.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/participant/ticket/${reg._id}`}
                      className="text-indigo-600 hover:underline font-mono text-xs"
                    >
                      {reg.ticketId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {reg.event?.eventStartDate
                      ? new Date(reg.event.eventStartDate).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ParticipantDashboard;
