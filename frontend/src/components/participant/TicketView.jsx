import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { registrationAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';

const TicketView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reg,     setReg]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    registrationAPI.getById(id)
      .then((res) => setReg(res.data.registration))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!reg) return <div className="text-center py-20 text-gray-400">Ticket not found</div>;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 md:py-10">
      <button onClick={() => navigate(-1)} className="text-sm md:text-base text-indigo-600 hover:underline mb-4 block">
        ← Back
      </button>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-indigo-600 mb-1">🎫 Your Ticket</h1>
          <p className="text-gray-500">Felicity 2026</p>
        </div>

        {reg.qrCode && (
          <div className="flex justify-center mb-6">
            <img src={reg.qrCode} alt="QR Code" className="w-40 h-40 rounded-xl border border-gray-200" />
          </div>
        )}

        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Ticket ID</span>
            <span className="font-mono font-semibold text-gray-800">{reg.ticketId}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Event</span>
            <span className="font-semibold text-gray-800">{reg.event?.eventName}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Organizer</span>
            <span className="text-gray-700">{reg.event?.organizer?.organizerName}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Date</span>
            <span className="text-gray-700">{new Date(reg.event?.eventStartDate).toDateString()}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Participant</span>
            <span className="text-gray-700">
              {reg.participant?.firstName} {reg.participant?.lastName}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Status</span>
            <StatusBadge status={reg.status} />
          </div>
          {reg.event?.eventType === 'Merchandise' && reg.merchandiseDetails && (
            <>
              {reg.merchandiseDetails.size && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Size</span>
                  <span className="text-gray-700">{reg.merchandiseDetails.size}</span>
                </div>
              )}
              {reg.merchandiseDetails.color && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Color</span>
                  <span className="text-gray-700">{reg.merchandiseDetails.color}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Quantity</span>
                <span className="text-gray-700">{reg.merchandiseDetails.quantity}</span>
              </div>
            </>
          )}
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Registered At</span>
            <span className="text-gray-700">{new Date(reg.createdAt).toLocaleString()}</span>
          </div>
        </div>

        {reg.status === 'Registered' && (
          <p className="text-center text-xs text-gray-400 mt-6">
            Show this QR code at the venue for entry.
          </p>
        )}
      </div>
    </div>
  );
};

export default TicketView;
