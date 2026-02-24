import React, { useEffect, useState, useCallback, useRef } from 'react';
import { eventAPI } from '../../services/api';
import EventCard from '../common/EventCard';
import LoadingSpinner from '../common/LoadingSpinner';

const EVENT_TYPES = ['Normal', 'Merchandise'];
const ELIGIBILITIES = ['IIIT Only', 'All'];
const ALLOWED_TAGS = ['gaming', 'music', 'dance', 'sports', 'coding', 'hacking', 'robotics', 'art', 'photography', 'quizzing', 'film', 'fashion', 'literature'];

const BrowseEvents = () => {
  const [events,   setEvents]   = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [type,     setType]     = useState('');
  const [eligibility, setEligibility] = useState('');
  const [startDate,   setStartDate]   = useState('');
  const [endDate,     setEndDate]     = useState('');
  const [followed,    setFollowed]    = useState(false);
  const [tag,          setTag]         = useState('');
  const [page,   setPage] = useState(1);
  const [total,  setTotal] = useState(0);
  const debounceRef = useRef(null);

  const fetchEvents = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 12 };
      if (search)     params.search = search;
      if (type)       params.type = type;
      if (eligibility)params.eligibility = eligibility;
      if (startDate)  params.startDate = startDate;
      if (endDate)    params.endDate = endDate;
      if (followed)   params.followed = 'true';
      if (tag)        params.tag = tag;

      const res = await eventAPI.getAll(params);
      setEvents(res.data.events);
      setTotal(res.data.total);
      setPage(p);
    } catch (_) {}
    setLoading(false);
  }, [search, type, eligibility, startDate, endDate, followed, tag]);

  useEffect(() => {
    eventAPI.getTrending().then((res) => setTrending(res.data.events || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchEvents(1), 400);
    return () => clearTimeout(debounceRef.current);
  }, [fetchEvents]);

  const clearFilters = () => {
    setSearch(''); setType(''); setEligibility('');
    setStartDate(''); setEndDate(''); setFollowed(false); setTag('');
  };

  return (
    <div className="min-h-screen bg-[#0a0a14]">
    <div className="w-full px-6 sm:px-10 md:px-16 lg:px-24 py-8 md:py-10">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-6 md:p-8 lg:p-10 mb-8 shadow-[0_0_50px_rgba(99,102,241,0.35)]">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">Browse Events</h1>
        <p className="text-indigo-100 mt-1 md:text-lg">Discover and register for Felicity 2026 events</p>
      </div>

      {/* Trending strip */}
      {trending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-orange-600 uppercase tracking-wide mb-3">
            🔥 Trending (last 24h)
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {trending.map((ev) => (
              <div key={ev._id} className="bg-gradient-to-r from-orange-400 to-pink-500 text-white rounded-xl p-4 min-w-[220px] max-w-[220px] flex-shrink-0">
                <p className="font-semibold text-sm line-clamp-2">{ev.eventName}</p>
                <p className="text-xs opacity-80 mt-1">{ev.organizer?.organizerName}</p>
                <p className="text-xs opacity-80 mt-1">{ev.currentRegistrations} registrations</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-[#12122a] rounded-xl border border-indigo-500/20 p-4 md:p-5 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text" placeholder="Search events or organizers…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-white/5 border border-gray-600 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="bg-white/5 border border-gray-600 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All Types</option>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={eligibility} onChange={(e) => setEligibility(e.target.value)}
            className="bg-white/5 border border-gray-600 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All Eligibility</option>
            {ELIGIBILITIES.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={tag} onChange={(e) => setTag(e.target.value)}
            className="bg-white/5 border border-gray-600 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All Tags</option>
            {ALLOWED_TAGS.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-3 mt-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">From:</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="bg-white/5 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">To:</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="bg-white/5 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input type="checkbox" checked={followed} onChange={(e) => setFollowed(e.target.checked)}
              className="rounded" />
            Followed Clubs Only
          </label>
          <button onClick={clearFilters} className="text-sm text-indigo-400 hover:underline ml-auto">
            Clear filters
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <LoadingSpinner text="Loading events…" />
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No events found matching your criteria.</div>
      ) : (
        <>
          <p className="text-sm text-gray-400 mb-4">{total} event{total !== 1 ? 's' : ''} found</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((ev) => <EventCard key={ev._id} event={ev} />)}
          </div>

          {/* Pagination */}
          {total > 12 && (
            <div className="flex justify-center gap-2 mt-8">
              <button onClick={() => fetchEvents(page - 1)} disabled={page === 1}
                className="px-5 py-2.5 border border-white/10 rounded-lg text-sm text-gray-300 disabled:opacity-40 hover:bg-white/5">
                ← Prev
              </button>
              <span className="px-4 py-2.5 text-sm text-gray-400">Page {page} of {Math.ceil(total / 12)}</span>
              <button onClick={() => fetchEvents(page + 1)} disabled={page >= Math.ceil(total / 12)}
                className="px-5 py-2.5 border border-white/10 rounded-lg text-sm text-gray-300 disabled:opacity-40 hover:bg-white/5">
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
    </div>
  );
};

export default BrowseEvents;
