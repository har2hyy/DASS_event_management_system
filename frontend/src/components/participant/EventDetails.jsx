import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventAPI, registrationAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';
import ForumDiscussion from '../common/ForumDiscussion';
import FeedbackSection from '../common/FeedbackSection';

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
  const [detailTab, setDetailTab] = useState('details');
  const [myReg, setMyReg] = useState(null);
  const [paymentProof, setPaymentProof] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);

  useEffect(() => {
    eventAPI.getById(id)
      .then((res) => setEvent(res.data.event))
      .catch(() => {})
      .finally(() => setLoading(false));

    // Check if already registered
    registrationAPI.getMy()
      .then((res) => {
        const regs = res.data.registrations || [];
        const existing = regs.find((r) => r.event?._id === id);
        if (existing) {
          setMyReg(existing);
          if (['Registered', 'Attended', 'Pending'].includes(existing.status)) {
            setRegistered(true);
          }
        }
      })
      .catch(() => {});
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
      const res = await registrationAPI.register(id, payload);
      setRegistered(true);
      setMyReg(res.data.registration);
      if (event.eventType === 'Merchandise') {
        setMessage('✅ Order placed! Upload payment proof below. Organizer will approve your registration.');
      } else {
        setMessage('✅ Registration successful! Check your email for the ticket.');
      }
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || 'Registration failed'}`);
    }
    setSubmitting(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-6 sm:px-10 md:px-16 lg:px-24 py-8 md:py-10">
      <button onClick={() => navigate(-1)} className="text-sm md:text-base text-indigo-600 hover:underline mb-4 block">
        ← Back
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800">{event.eventName}</h1>
          <StatusBadge status={event.status} />
        </div>

        <p className="text-indigo-600 font-medium mb-1 md:text-lg">{event.organizer?.organizerName}</p>
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
              className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition text-base">
              {submitting ? 'Processing…' : event.eventType === 'Merchandise' ? 'Purchase Now' : 'Register'}
            </button>
          </form>
        )}

        {/* Payment Proof upload for pending merchandise orders */}
        {myReg && myReg.status === 'Pending' && event.eventType === 'Merchandise' && (
          <div className="border-t pt-6 mt-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Upload Payment Proof</h2>
            <p className="text-sm text-gray-500 mb-3">
              Your order is pending approval. Upload a screenshot of your payment to speed up approval.
            </p>
            <div className="flex gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setPaymentProof(reader.result);
                  reader.readAsDataURL(file);
                }}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={async () => {
                  if (!paymentProof) return;
                  setUploadingProof(true);
                  try {
                    await registrationAPI.uploadPaymentProof(myReg._id, { paymentProof });
                    setMessage('✅ Payment proof uploaded successfully.');
                  } catch (err) {
                    setMessage(`❌ ${err.response?.data?.message || 'Upload failed'}`);
                  }
                  setUploadingProof(false);
                }}
                disabled={!paymentProof || uploadingProof}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition"
              >
                {uploadingProof ? 'Uploading…' : 'Upload'}
              </button>
            </div>
            {paymentProof && (
              <img src={paymentProof} alt="Preview" className="mt-3 max-h-40 rounded-lg border" />
            )}
          </div>
        )}

        {/* Registration status badge for existing registrations */}
        {myReg && (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">Your registration:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                myReg.status === 'Registered' ? 'bg-green-100 text-green-700' :
                myReg.status === 'Attended'   ? 'bg-blue-100 text-blue-700' :
                myReg.status === 'Pending'    ? 'bg-yellow-100 text-yellow-700' :
                myReg.status === 'Cancelled'  ? 'bg-gray-100 text-gray-500' :
                'bg-red-100 text-red-700'
              }`}>{myReg.status}</span>
              {myReg.ticketId && <span className="font-mono text-xs text-gray-400">{myReg.ticketId}</span>}
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs: Discussion & Feedback ── */}
      {['Published', 'Ongoing', 'Completed'].includes(event.status) && (
        <div className="mt-6">
          <div className="flex gap-1 border-b border-gray-200 mb-4">
            {['details', 'discussion', 'feedback'].map((t) => (
              <button
                key={t}
                onClick={() => setDetailTab(t)}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition -mb-px capitalize ${
                  detailTab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {detailTab === 'discussion' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Discussion</h2>
              <ForumDiscussion eventId={id} isOrganizer={false} />
            </div>
          )}

          {detailTab === 'feedback' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Feedback</h2>
              <FeedbackSection
                eventId={id}
                canSubmit={myReg?.status === 'Attended'}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EventDetails;
