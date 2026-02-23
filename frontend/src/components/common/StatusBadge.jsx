import React from 'react';

/**
 * Reusable status badge.
 * @param {string} status - Draft | Published | Ongoing | Completed | Closed | Registered | Attended | Cancelled | Rejected | Pending
 */
const StatusBadge = ({ status }) => {
  const colors = {
    Draft:      'bg-gray-100 text-gray-600',
    Published:  'bg-blue-100 text-blue-700',
    Ongoing:    'bg-green-100 text-green-700',
    Completed:  'bg-purple-100 text-purple-700',
    Cancelled:  'bg-red-100 text-red-600',
    Registered: 'bg-indigo-100 text-indigo-700',
    Attended:   'bg-green-100 text-green-700',
    Rejected:   'bg-orange-100 text-orange-600',
    Pending:    'bg-yellow-100 text-yellow-700',
  };
  return (
    <span className={`inline-block text-xs md:text-sm font-semibold px-2.5 py-0.5 rounded-full ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
