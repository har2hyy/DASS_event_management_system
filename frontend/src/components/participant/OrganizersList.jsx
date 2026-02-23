import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { participantAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

const OrganizersList = () => {
  const { updateUser } = useAuth();
  const [organizers, setOrganizers] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [busy,       setBusy]       = useState(null);

  const load = () =>
    participantAPI.getOrganizers()
      .then((res) => setOrganizers(res.data.organizers))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const toggleFollow = async (id) => {
    setBusy(id);
    try {
      const res = await participantAPI.toggleFollow(id);
      updateUser({ followedOrganizers: res.data.followedOrganizers });
      setOrganizers((prev) =>
        prev.map((o) =>
          o._id === id ? { ...o, isFollowed: !o.isFollowed } : o
        )
      );
    } catch (_) {}
    setBusy(null);
  };

  if (loading) return <LoadingSpinner text="Loading clubs…" />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
    <div className="w-full px-6 lg:px-12 py-8">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl p-8 mb-8 shadow-lg">
        <h1 className="text-3xl font-bold">Clubs & Organizers</h1>
        <p className="text-purple-100 mt-1">Follow your favourite clubs to get event updates</p>
      </div>

      {organizers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No organizers registered yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {organizers.map((org) => (
            <div key={org._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-gray-800">{org.organizerName}</h3>
                <span className="bg-purple-50 text-purple-600 text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                  {org.category}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-4 flex-1 line-clamp-3">{org.description || 'No description provided.'}</p>
              {org.contactEmail && (
                <p className="text-xs text-gray-400 mb-4">✉️ {org.contactEmail}</p>
              )}
              <div className="flex gap-2">
                <Link
                  to={`/participant/organizers/${org._id}`}
                  className="flex-1 text-center text-sm border border-indigo-600 text-indigo-600 py-2 rounded-lg hover:bg-indigo-50 transition"
                >
                  View
                </Link>
                <button
                  onClick={() => toggleFollow(org._id)} disabled={busy === org._id}
                  className={`flex-1 text-sm py-2 rounded-lg font-medium transition ${
                    org.isFollowed
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {busy === org._id ? '…' : org.isFollowed ? 'Unfollow' : 'Follow'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  );
};

export default OrganizersList;
