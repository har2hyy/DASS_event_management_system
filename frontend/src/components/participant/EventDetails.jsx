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

  const handleUnregister = async () => {
    if (!window.confirm('Are you sure you want to unregister from this event?')) return;
    setSubmitting(true);
    setMessage('');
    try {
      await registrationAPI.cancel(myReg._id);
      setMyReg(null);
      setRegistered(false);
      setMessage('✅ You have been unregistered from this event.');
      // Refresh event data to update registration count
      const res = await eventAPI.getById(id);
      setEvent(res.data.event);
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || 'Unregister failed'}`);
    }
    setSubmitting(false);
  };
  const [detailTab, setDetailTab] = useState('details');
  const [forumUnread, setForumUnread] = useState(0);
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

  const deadlineEnd = new Date(event.registrationDeadline);
  deadlineEnd.setHours(23, 59, 59, 999);
  const deadlinePassed  = new Date() > deadlineEnd;
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
      <button onClick={() => navigate(-1)} className="text-sm md:text-base text-indigo-400 hover:underline mb-4 block">
        ← Back
      </button>

      <div className="bg-[#12122a] rounded-2xl border border-indigo-500/20 p-5 md:p-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-100">{event.eventName}</h1>
          <StatusBadge status={event.status} />
        </div>

        <p className="text-indigo-400 font-medium mb-1 md:text-lg">{event.organizer?.organizerName}</p>
        <p className="text-gray-400 mb-6 leading-relaxed">{event.eventDescription}</p>

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
            <div key={d.label} className="bg-white/5 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase">{d.label}</p>
              <p className="font-semibold text-gray-200 mt-0.5">{d.val}</p>
            </div>
          ))}
        </div>

        {event.eventTags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {event.eventTags.map((tag) => (
              <span key={tag} className="bg-indigo-500/20 text-indigo-400 text-xs px-3 py-1 rounded-full">#{tag}</span>
            ))}
          </div>
        )}

        {/* Merchandise item details */}
        {event.eventType === 'Merchandise' && event.itemDetails && (
          <div className="bg-blue-500/10 rounded-xl p-4 mb-6 text-sm text-blue-300">
            <p className="font-semibold mb-2">Merchandise Options</p>
            {event.itemDetails.sizes?.length > 0 && <p>Sizes: {event.itemDetails.sizes.join(', ')}</p>}
            {event.itemDetails.colors?.length > 0 && <p>Colors: {event.itemDetails.colors.join(', ')}</p>}
            {event.itemDetails.variants?.length > 0 && <p>Variants: {event.itemDetails.variants.join(', ')}</p>}
            <p>Max per person: {event.itemDetails.purchaseLimit}</p>
          </div>
        )}

        {/* Blocking messages */}
        {deadlinePassed && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">
            Registration deadline has passed.
          </div>
        )}
        {!deadlinePassed && limitReached && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">
            Registration limit reached.
          </div>
        )}
        {!deadlinePassed && stockExhausted && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">
            Out of stock.
          </div>
        )}

        {/* Success/error message */}
        {message && (
          <div className={`rounded-lg px-4 py-3 mb-4 text-sm ${message.startsWith('✅') ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
            {message}
          </div>
        )}

        {/* Registration Form */}
        {!isBlocked && !registered && user?.role === 'Participant' && (
          <form onSubmit={handleRegistration} className="border-t border-white/10 pt-6 mt-2">
            <h2 className="text-lg font-semibold text-gray-200 mb-4">
              {event.eventType === 'Normal' ? 'Registration Form' : 'Purchase Details'}
            </h2>

            {event.eventType === 'Normal' &&
              event.customForm?.fields?.map((field) => (
                <div key={field._id} className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === 'text' || field.type === 'number' || field.type === 'email' ? (
                    <input type={field.type} required={field.required}
                      onChange={(e) => setRegForm({ ...regForm, [field.label]: e.target.value })}
                      className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  ) : field.type === 'textarea' ? (
                    <textarea required={field.required} rows={3}
                      onChange={(e) => setRegForm({ ...regForm, [field.label]: e.target.value })}
                      className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  ) : field.type === 'dropdown' ? (
                    <select required={field.required}
                      onChange={(e) => setRegForm({ ...regForm, [field.label]: e.target.value })}
                      className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
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
                  ) : field.type === 'file' ? (
                    <div>
                      <input type="file" accept="image/*,.pdf,.doc,.docx,.txt"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => setRegForm({ ...regForm, [field.label]: reader.result });
                          reader.readAsDataURL(file);
                        }}
                        className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      {regForm[field.label] && (
                        <p className="text-xs text-green-400 mt-1">✓ File attached</p>
                      )}
                    </div>
                  ) : null}
                </div>
              ))
            }

            {event.eventType === 'Merchandise' && (
              <div className="grid grid-cols-2 gap-4">
                {event.itemDetails?.sizes?.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Size</label>
                    <select value={merch.size} onChange={(e) => setMerch({ ...merch, size: e.target.value })} required
                      className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">Select size</option>
                      {event.itemDetails.sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                {event.itemDetails?.colors?.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Color</label>
                    <select value={merch.color} onChange={(e) => setMerch({ ...merch, color: e.target.value })} required
                      className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">Select color</option>
                      {event.itemDetails.colors.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
                {event.itemDetails?.variants?.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Variant</label>
                    <select value={merch.variant} onChange={(e) => setMerch({ ...merch, variant: e.target.value })}
                      className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">Select variant</option>
                      {event.itemDetails.variants.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Quantity (max {event.itemDetails?.purchaseLimit || 1})
                  </label>
                  <input type="number" min={1} max={event.itemDetails?.purchaseLimit || 1}
                    value={merch.quantity} onChange={(e) => setMerch({ ...merch, quantity: Number(e.target.value) })}
                    className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            )}

            <button type="submit" disabled={submitting}
              className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition text-base">
              {submitting ? 'Processing…' : event.eventType === 'Merchandise' ? 'Purchase Now' : 'Register'}
            </button>
          </form>
        )}

        {/* Payment Proof upload for pending/rejected merchandise orders */}
        {myReg && ['Pending', 'Rejected'].includes(myReg.status) && event.eventType === 'Merchandise' && (
          <div className="border-t border-white/10 pt-6 mt-4">
            <h2 className="text-lg font-semibold text-gray-200 mb-3">
              {myReg.status === 'Rejected' ? 'Payment Rejected — Upload New Proof' : 'Upload Payment Proof'}
            </h2>
            {myReg.status === 'Rejected' && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-3 text-sm">
                Your previous payment was rejected. Please upload a new payment proof to try again.
              </div>
            )}
            <p className="text-sm text-gray-400 mb-3">
              Upload a screenshot of your payment for organizer approval.
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
                className="flex-1 bg-white/5 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
              />
              <button
                onClick={async () => {
                  if (!paymentProof) return;
                  setUploadingProof(true);
                  try {
                    await registrationAPI.uploadPaymentProof(myReg._id, { paymentProof });
                    setMessage('✅ Payment proof uploaded successfully. Awaiting organizer approval.');
                    // Refresh registration status
                    const regRes = await registrationAPI.getMy();
                    const regs = regRes.data.registrations || [];
                    const updated = regs.find((r) => r.event?._id === id);
                    if (updated) setMyReg(updated);
                  } catch (err) {
                    setMessage(`❌ ${err.response?.data?.message || 'Upload failed'}`);
                  }
                  setUploadingProof(false);
                }}
                disabled={!paymentProof || uploadingProof}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition"
              >
                {uploadingProof ? 'Uploading…' : myReg.status === 'Rejected' ? 'Retry Payment' : 'Upload'}
              </button>
            </div>
            {paymentProof && (
              <img src={paymentProof} alt="Preview" className="mt-3 max-h-40 rounded-lg border" />
            )}
          </div>
        )}

        {/* Filled merchandise details + payment proof for existing merchandise registrations */}
        {myReg && event.eventType === 'Merchandise' && myReg.merchandiseDetails && (
          <div className="border-t border-white/10 pt-6 mt-4">
            <h2 className="text-lg font-semibold text-gray-200 mb-3">Your Order Details</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
              {myReg.merchandiseDetails.size && (
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase">Size</p>
                  <p className="font-semibold text-gray-200 mt-0.5">{myReg.merchandiseDetails.size}</p>
                </div>
              )}
              {myReg.merchandiseDetails.color && (
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase">Color</p>
                  <p className="font-semibold text-gray-200 mt-0.5">{myReg.merchandiseDetails.color}</p>
                </div>
              )}
              {myReg.merchandiseDetails.variant && (
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase">Variant</p>
                  <p className="font-semibold text-gray-200 mt-0.5">{myReg.merchandiseDetails.variant}</p>
                </div>
              )}
              {myReg.merchandiseDetails.quantity && (
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase">Quantity</p>
                  <p className="font-semibold text-gray-200 mt-0.5">{myReg.merchandiseDetails.quantity}</p>
                </div>
              )}
            </div>
            {myReg.paymentProof && (
              <div>
                <p className="text-sm font-medium text-gray-300 mb-2">Payment Proof</p>
                <img src={myReg.paymentProof} alt="Payment proof" className="max-h-64 rounded-xl border border-white/10" />
              </div>
            )}
          </div>
        )}

        {/* Filled form responses for existing normal event registrations */}
        {myReg && event.eventType === 'Normal' && myReg.formResponses && Object.keys(myReg.formResponses).length > 0 && (
          <div className="border-t border-white/10 pt-6 mt-4">
            <h2 className="text-lg font-semibold text-gray-200 mb-3">Your Form Responses</h2>
            <div className="space-y-3 text-sm">
              {Object.entries(myReg.formResponses).map(([key, value]) => (
                <div key={key} className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase">{key}</p>
                  <p className="font-semibold text-gray-200 mt-0.5">
                    {Array.isArray(value) ? value.join(', ') : typeof value === 'string' && value.startsWith('data:') ? (
                      <a href={value} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">View Attachment</a>
                    ) : String(value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Registration status badge for existing registrations */}
        {myReg && (
          <div className="border-t border-white/10 pt-4 mt-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-gray-400">Your registration:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                myReg.status === 'Registered' ? 'bg-green-500/20 text-green-400' :
                myReg.status === 'Attended'   ? 'bg-blue-500/20 text-blue-400' :
                myReg.status === 'Pending'    ? 'bg-yellow-500/20 text-yellow-400' :
                myReg.status === 'Cancelled'  ? 'bg-gray-500/20 text-gray-400' :
                'bg-red-500/20 text-red-400'
              }`}>{myReg.status}</span>
              {myReg.ticketId && <span className="font-mono text-xs text-gray-400">{myReg.ticketId}</span>}
              {['Registered', 'Pending'].includes(myReg.status) && (
                <button
                  onClick={handleUnregister}
                  disabled={submitting}
                  className="ml-auto text-red-400 hover:text-red-300 text-xs font-semibold px-4 py-1.5 rounded-lg border border-red-500/30 hover:bg-red-500/10 transition disabled:opacity-50"
                >
                  {submitting ? 'Unregistering…' : 'Unregister'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs: Discussion & Feedback ── */}
      {['Published', 'Ongoing', 'Completed'].includes(event.status) && (
        <div className="mt-6">
          <div className="flex gap-1 border-b border-white/10 mb-4">
            {['details', 'discussion', 'feedback'].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setDetailTab(t);
                  if (t === 'discussion') setForumUnread(0);
                }}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition -mb-px capitalize relative ${
                  detailTab === t ? 'border-indigo-400 text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {t}
                {t === 'discussion' && forumUnread > 0 && detailTab !== 'discussion' && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {forumUnread > 99 ? '99+' : forumUnread}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Forum always mounted for SSE notifications, hidden when not on discussion tab */}
          <div className={detailTab === 'discussion' ? 'bg-[#12122a] rounded-2xl border border-indigo-500/20 p-6' : 'hidden'}>
            <h2 className="text-lg font-semibold text-gray-200 mb-4">Discussion</h2>
            <ForumDiscussion eventId={id} isOrganizer={false} onNewMessage={() => { if (detailTab !== 'discussion') setForumUnread((c) => c + 1); }} />
          </div>

          {detailTab === 'feedback' && (
            <div className="bg-[#12122a] rounded-2xl border border-indigo-500/20 p-6">
              <h2 className="text-lg font-semibold text-gray-200 mb-4">Feedback</h2>
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
