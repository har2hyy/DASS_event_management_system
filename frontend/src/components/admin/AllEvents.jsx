import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';

const AllEvents = () => {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    adminAPI.getAllEvents()
      .then((res) => setEvents(res.data.events))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading events…" />;

  const filtered = events.filter((ev) =>
    ev.eventName.toLowerCase().includes(search.toLowerCase()) ||
    (ev.organizer?.organizerName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
    <div className="w-full px-6 sm:px-10 md:px-16 lg:px-24 py-8 md:py-10">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-6 md:p-8 lg:p-10 mb-8 shadow-lg">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">All Events</h1>
        <p className="text-indigo-100 mt-1 md:text-lg">View and monitor all events across organizers</p>
      </div>

      <input type="text" value={search} placeholder="Search by event name or organizer…"
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-6" />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Event Name', 'Organizer', 'Type', 'Status', 'Registered', 'Fee', 'Start Date'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">No events found.</td></tr>
            ) : filtered.map((ev) => (
              <tr key={ev._id} className="hover:bg-gray-50/50 transition">
                <td className="px-4 py-3 font-medium text-gray-800 max-w-xs truncate">{ev.eventName}</td>
                <td className="px-4 py-3 text-gray-500">{ev.organizer?.organizerName || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{ev.eventType}</td>
                <td className="px-4 py-3"><StatusBadge status={ev.status} /></td>
                <td className="px-4 py-3 text-gray-500">{ev.currentRegistrations}/{ev.registrationLimit}</td>
                <td className="px-4 py-3 text-gray-500">₹{ev.registrationFee}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(ev.eventStartDate).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
};

export default AllEvents;
