import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { participantAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import EventCard from '../common/EventCard';

const OrganizerDetail = () => {
 const { id } = useParams();
 const navigate = useNavigate();
 const [data, setData] = useState(null);
 const [loading, setLoading] = useState(true);
 const [tab, setTab] = useState('upcoming');

 useEffect(() => {
 participantAPI.getOrganizer(id)
 .then((res) => setData(res.data))
 .catch(() => {})
 .finally(() => setLoading(false));
 }, [id]);

 if (loading) return <LoadingSpinner />;
 if (!data) return <div className="text-center py-20 text-gray-400">Organizer not found</div>;

 const { organizer, upcomingEvents, pastEvents } = data;

 return (
 <div className="w-full px-6 lg:px-12 py-8">
 <button onClick={() => navigate(-1)} className="text-sm text-indigo-400 hover:underline mb-4 block">
 ← Back
 </button>

 {/* Organizer Info */}
 <div className="bg-[#12122a] rounded-2xl border border-indigo-500/20 p-6 mb-6">
 <div className="flex items-start justify-between gap-4 mb-2">
 <h1 className="text-2xl font-bold text-gray-100">{organizer.organizerName}</h1>
 <span className="bg-purple-500/20 text-purple-400 text-sm px-3 py-1 rounded-full font-medium">
 {organizer.category}
 </span>
 </div>
 {organizer.description && <p className="text-gray-400 mb-3">{organizer.description}</p>}
 {organizer.contactEmail && (
 <p className="text-sm text-gray-500">✉️ {organizer.contactEmail}</p>
 )}
 </div>

 {/* Events tabs */}
 <div className="flex gap-1 mb-5 bg-white/5 rounded-xl p-1 w-fit">
 {[['upcoming', `Upcoming (${upcomingEvents.length})`], ['past', `Past (${pastEvents.length})`]].map(([t, l]) => (
 <button key={t} onClick={() => setTab(t)}
 className={`px-5 py-2 rounded-lg text-sm font-medium transition ${tab === t ? 'bg-indigo-600 shadow text-white' : 'text-gray-400 hover:text-gray-200'}`}>
 {l}
 </button>
 ))}
 </div>

 {(tab === 'upcoming' ? upcomingEvents : pastEvents).length === 0 ? (
 <div className="text-center py-10 text-gray-400">No {tab} events.</div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
 {(tab === 'upcoming' ? upcomingEvents : pastEvents).map((ev) => (
 <EventCard key={ev._id} event={ev} />
 ))}
 </div>
 )}
 </div>
 );
};

export default OrganizerDetail;
