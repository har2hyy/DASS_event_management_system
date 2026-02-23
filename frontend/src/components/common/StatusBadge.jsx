import React from 'react';

/**
 * Reusable status badge.
 * @param {string} status - Draft | Published | Ongoing | Completed | Closed | Registered | Attended | Cancelled | Rejected | Pending
 */
const StatusBadge = ({ status }) => {
  const colors = {
    Draft:      'bg-gray-500/20 text-gray-400',
    Published:  'bg-blue-500/20 text-blue-400',
    Ongoing:    'bg-green-500/20 text-green-400',
    Completed:  'bg-purple-500/20 text-purple-400',
    Cancelled:  'bg-red-500/20 text-red-400',
    Registered: 'bg-indigo-500/20 text-indigo-400',
    Attended:   'bg-green-500/20 text-green-400',
    Rejected:   'bg-orange-500/20 text-orange-400',
    Pending:    'bg-yellow-500/20 text-yellow-400',
  };
  return (
    <span className={`inline-block text-xs md:text-sm font-semibold px-2.5 py-0.5 rounded-full ${colors[status] || 'bg-gray-500/20 text-gray-400'}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
