import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventAPI, registrationAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';

const EventDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event,   setEvent]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [regForm, setRegForm] = useState({});
  const [merch,   setMerch]   = useState({ size: '', color: '', variant: '', quantity: 1 });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    eventAPI.getById(id)
      .then((res) => setEvent(res.data.event))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner text="Loading event…" />;
  if (!event) return <div className="text-center py-20 text-gray-400">Event not found</div>;

  const deadlinePassed  = new Date() > new Date(event.registrationDeadline);
  const limitReached    = event.currentRegistrations >= event.registrationLimit;
  const stockExhausted  = event.eventType === 'Merchandise' && event.itemDetails?.stock === 0;
  const isBlocked       = deadlinePassed || limitReached || stockExhausted;

  const handleRegistration = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const payload = event.eventType === 'Normal' ? { formResponses: regForm } : { ...merch };
      await registrationAPI.register(id, payload);
      setRegistered(true);
      setMessage('✅ Registration successful! Check your email for the ticket.');
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || 'Registration failed'}`);
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="text-sm text-indigo-600 hover:underline mb-4 block">
        ← Back
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-800">{event.eventName}</h1>
          <StatusBadge status={event.status} />
        </div>

        <p className="text-indigo-600 font-medium mb-1">{event.organizer?.organizerName}</p>
        <p className="text-gray-600 mb-6 leading-relaxed">{event.eventDescription}</p>

        {/* Details grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 text-sm">
          {[
            { label: 'Type',             val: event.eventType },
            { label: 'Eligibility',      val: event.eligibility },
            { label: 'Start Date',       val: new Date(event.eventStartDate).toLocaleDateString() },
            { label: 'End Date',         val: new Date(event.eventEndDate).toLocaleDateString() },
            { label: 'Deadline',         val: new Date(event.registrationDeadline).toLocaleDateString() },
            { label: 'Fee',              val: event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free' },
            { label: 'Registrations',    val: `${event.currentRegistrations} / ${event.registrationLimit}` },
            ...(event.eventType === 'Merchandise' ? [{ label: 'Stock', val: event.itemDetails?.stock }] : []),
          ].map((d) => (
            <div key={d.label} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 uppercase">{d.label}</p>
              <p className="font-semibold text-gray-700 mt-0.5">{d.val}</p>
            </div>
          ))}
        </div>

        {event.eventTags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {event.eventTags.map((tag) => (
              <span key={tag} className="bg-indigo-50 text-indigo-600 text-xs px-3 py-1 rounded-full">#{tag}</span>
            ))}
          </div>
        )}

        {/* Merchandise item details */}
        {event.eventType === 'Merchandise' && event.itemDetails && (
          <div className="bg-blue-50 rounded-xl p-4 mb-6 text-sm text-blue-800">
            <p className="font-semibold mb-2">Merchandise Options</p>
            {event.itemDetails.sizes?.length > 0 && <p>Sizes: {event.itemDetails.sizes.join(', ')}</p>}
            {event.itemDetails.colors?.length > 0 && <p>Colors: {event.itemDetails.colors.join(', ')}</p>}
            {event.itemDetails.variants?.length > 0 && <p>Variants: {event.itemDetails.variants.join(', ')}</p>}
            <p>Max per person: {event.itemDetails.purchaseLimit}</p>
          </div>
        )}

        {/* Blocking messages */}
        {deadlinePassed && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            Registration deadline has passed.
          </div>
        )}
        {!deadlinePassed && limitReached && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            Registration limit reached.
          </div>
        )}
        {!deadlinePassed && stockExhausted && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            Out of stock.
          </div>
        )}

        {/* Success/error message */}
        {message && (
          <div className={`rounded-lg px-4 py-3 mb-4 text-sm ${message.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message}
          </div>
        )}

        {/* Registration Form */}
        {!isBlocked && !registered && user?.role === 'Participant' && (
          <form onSubmit={handleRegistration} className="border-t pt-6 mt-2">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              {event.eventType === 'Normal' ? 'Registration Form' : 'Purchase Details'}
            </h2>

            {event.eventType === 'Normal' &&
              event.customForm?.fields?.map((field) => (
                <div key={field._id} className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === 'text' || field.type === 'number' || field.type === 'email' ? (
                    <input type={field.type} required={field.required}
                      onChange={(e) => setRegForm({ ...regForm, [field.label]: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  ) : field.type === 'textarea' ? (
                    <textarea required={field.required} rows={3}
                      onChange={(e) => setRegForm({ ...regForm, [field.label]: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  ) : field.type === 'dropdown' ? (
                    <select required={field.required}
                      onChange={(e) => setRegForm({ ...regForm, [field.label]: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                      <option value="">Select…</option>
                      {field.options?.map((op) => <option key={op} value={op}>{op}</option>)}
                    </select>
                  ) : field.type === 'checkbox' ? (
                    <div className="flex flex-wrap gap-3">
                      {field.options?.map((op) => (
                        <label key={op} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" onChange={(e) => {
                            const prev = regForm[field.label] || [];
                            const updated = e.target.checked ? [...prev, op] : prev.filter((v) => v !== op);
                            setRegForm({ ...regForm, [field.label]: updated });
                          }} />
                          {op}
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            }

            {event.eventType === 'Merchandise' && (
              <div className="grid grid-cols-2 gap-4">
                {event.itemDetails?.sizes?.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                    <select value={merch.size} onChange={(e) => setMerch({ ...merch, size: e.target.value })} required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                      <option value="">Select size</option>
                      {event.itemDetails.sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                {event.itemDetails?.colors?.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                    <select value={merch.color} onChange={(e) => setMerch({ ...merch, color: e.target.value })} required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                      <option value="">Select color</option>
                      {event.itemDetails.colors.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
                {event.itemDetails?.variants?.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Variant</label>
                    <select value={merch.variant} onChange={(e) => setMerch({ ...merch, variant: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                      <option value="">Select variant</option>
                      {event.itemDetails.variants.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity (max {event.itemDetails?.purchaseLimit || 1})
                  </label>
                  <input type="number" min={1} max={event.itemDetails?.purchaseLimit || 1}
                    value={merch.quantity} onChange={(e) => setMerch({ ...merch, quantity: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
            )}

            <button type="submit" disabled={submitting}
              className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition">
              {submitting ? 'Processing…' : event.eventType === 'Merchandise' ? 'Purchase Now' : 'Register'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default EventDetails;
