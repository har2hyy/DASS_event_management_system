import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';

const EventCard = ({ event, linkBase = '/participant/events' }) => {
  const deadline = new Date(event.registrationDeadline);
  const isDeadlinePassed = deadline < new Date();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-800 text-base leading-snug line-clamp-2">
            {event.eventName}
          </h3>
          <StatusBadge status={event.status} />
        </div>

        <p className="text-sm text-indigo-600 font-medium mb-1">
          {event.organizer?.organizerName || 'Unknown Organizer'}
        </p>
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{event.eventDescription}</p>

        <div className="grid grid-cols-2 gap-1 text-xs text-gray-500 mb-3">
          <span>📅 {new Date(event.eventStartDate).toLocaleDateString()}</span>
          <span>🏷️ {event.eventType}</span>
          <span>👥 {event.currentRegistrations}/{event.registrationLimit}</span>
          <span>💰 {event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free'}</span>
        </div>

        {event.eventTags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {event.eventTags.slice(0, 3).map((tag) => (
              <span key={tag} className="bg-indigo-50 text-indigo-600 text-xs px-2 py-0.5 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          {isDeadlinePassed ? (
            <span className="text-xs text-red-500 font-medium">Registration Closed</span>
          ) : (
            <span className="text-xs text-green-600 font-medium">
              Deadline: {deadline.toLocaleDateString()}
            </span>
          )}
          <Link
            to={`${linkBase}/${event._id}`}
            className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            View Details →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
