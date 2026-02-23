import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventAPI, organizerAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';
import ForumDiscussion from '../common/ForumDiscussion';
import FeedbackSection from '../common/FeedbackSection';
import QRScannerAttendance from '../common/QRScannerAttendance';

const EventManagement = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event,        setEvent]        = useState(null);
  const [participants, setParticipants] = useState([]);
  const [analytics,    setAnalytics]    = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState('Overview');
  const [search,       setSearch]       = useState('');
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [error,        setError]        = useState('');
  const [saving,       setSaving]       = useState(false);
  const [editFields,   setEditFields]   = useState({});

  const fetchEvent = useCallback(async () => {
    const res = await eventAPI.getById(id);
    setEvent(res.data.event);
  }, [id]);

  const fetchParticipants = useCallback(async () => {
    try {
      const res = await organizerAPI.getParticipants(id, { search, page, limit: 10 });
      setParticipants(res.data.registrations || []);
      const total = res.data.total || 0;
      setTotalPages(Math.max(1, Math.ceil(total / 10)));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load participants');
      setParticipants([]);
    }
  }, [id, search, page]);

  useEffect(() => {
    (async () => {
      try {
        await fetchEvent();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load event');
      }
      setLoading(false);
    })();
  }, [fetchEvent]);

  useEffect(() => {
    if (tab === 'Participants') fetchParticipants();
    if (tab === 'Analytics' && event?.status === 'Completed') {
      organizerAPI.getDashboard().then((res) => {
        const a = res.data.analytics[id];
        setAnalytics(a || null);
      }).catch(() => {});
    }
  }, [tab, search, page, fetchParticipants]);

  const handleEdit = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await eventAPI.update(id, editFields);
      setEvent(res.data.event);
      setEditFields({});
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    }
    setSaving(false);
  };

  const handleStatusChange = async (newStatus) => {
    setSaving(true);
    setError('');
    try {
      const res = await eventAPI.update(id, { status: newStatus });
      setEvent(res.data.event);
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    }
    setSaving(false);
  };

  const handlePublish = async () => {
    setSaving(true);
    setError('');
    try {
      await eventAPI.publish(id);
      await fetchEvent();
    } catch (err) {
      setError(err.response?.data?.message || 'Publish failed');
    }
    setSaving(false);
  };

  const handleAttendance = async (registrationId, attended) => {
    try {
      await organizerAPI.markAttendance(id, registrationId, { attended: !attended });
      fetchParticipants();
    } catch (err) {
      setError(err.response?.data?.message || 'Attendance update failed');
    }
  };

  const handleCSV = async () => {
    try {
      const res = await organizerAPI.exportCSV(id);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${event?.eventName || 'participants'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'CSV export failed');
    }
  };

  if (loading) return <LoadingSpinner text="Loading event…" />;
  if (!event)  return <div className="text-center mt-20 text-gray-400">Event not found.</div>;

  const isEditable = event.status === 'Draft';
  const isLimitedEdit = event.status === 'Published';
  const isMerchEvent = event.eventType === 'Merchandise';
  const TABS = [
    'Overview', 'Participants',
    ...(isMerchEvent ? ['Payments'] : []),
    'Attendance', 'Discussion', 'Feedback', 'Analytics',
  ];

  return (
    <div className="w-full px-6 lg:px-12 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <button onClick={() => navigate('/organizer/dashboard')}
            className="text-sm text-gray-400 hover:text-gray-600 mb-1">← Back to Dashboard</button>
          <h1 className="text-2xl font-bold text-gray-800">{event.eventName}</h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={event.status} />
            <span className="text-xs text-gray-400">{event.eventType}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {event.status === 'Draft' && (
            <button onClick={handlePublish} disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg font-semibold transition disabled:opacity-60">
              Publish
            </button>
          )}
          {(event.status === 'Published' || event.status === 'Ongoing') && (
            <button onClick={() => handleStatusChange(event.status === 'Published' ? 'Ongoing' : 'Completed')}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg font-semibold transition disabled:opacity-60">
              {event.status === 'Published' ? 'Mark Ongoing' : 'Mark Completed'}
            </button>
          )}
          {event.status === 'Published' && (
            <button onClick={() => handleStatusChange('Cancelled')} disabled={saving}
              className="border border-red-400 text-red-500 hover:bg-red-50 text-sm px-4 py-2 rounded-lg font-semibold transition disabled:opacity-60">
              Cancel Event
            </button>
          )}
          {event.status === 'Ongoing' && (
            <button onClick={() => handleStatusChange('Cancelled')} disabled={saving}
              className="border border-red-400 text-red-500 hover:bg-red-50 text-sm px-4 py-2 rounded-lg font-semibold transition disabled:opacity-60">
              Cancel Event
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
              tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'Overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Registrations', val: `${event.currentRegistrations}/${event.registrationLimit}` },
              { label: 'Fee',           val: `₹${event.registrationFee}` },
              { label: 'Eligibility',   val: event.eligibility },
              { label: 'Deadline',      val: new Date(event.registrationDeadline).toLocaleDateString() },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="text-lg font-bold text-gray-800">{s.val}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-700 mb-3">Edit Event</h3>
            {!isEditable && !isLimitedEdit ? (
              <p className="text-sm text-gray-400">Event can only be edited when Draft or Published.</p>
            ) : (
              <div className="space-y-3">
                {isEditable && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Event Name</label>
                      <input type="text" defaultValue={event.eventName}
                        onChange={(e) => setEditFields({ ...editFields, eventName: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Registration Limit</label>
                      <input type="number" defaultValue={event.registrationLimit}
                        onChange={(e) => setEditFields({ ...editFields, registrationLimit: Number(e.target.value) })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <textarea rows={3} defaultValue={event.eventDescription}
                    onChange={(e) => setEditFields({ ...editFields, eventDescription: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Registration Deadline</label>
                  <input type="date" defaultValue={event.registrationDeadline?.slice(0, 10)}
                    onChange={(e) => setEditFields({ ...editFields, registrationDeadline: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <button onClick={handleEdit} disabled={saving || Object.keys(editFields).length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-5 py-2 rounded-lg font-semibold transition disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PARTICIPANTS ── */}
      {tab === 'Participants' && (
        <div>
          <div className="flex items-center justify-between mb-4 gap-3">
            <input type="text" value={search} placeholder="Search by name or email…"
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <button onClick={handleCSV}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2.5 rounded-xl font-semibold transition">
              Export CSV
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Name', 'Email', 'Ticket ID', 'Registered', 'Attended', 'Action'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {participants.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400">No participants found.</td></tr>
                ) : participants.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.participant ? `${p.participant.firstName} ${p.participant.lastName}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{p.participant?.email || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.ticketId}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.attended ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.attended ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleAttendance(p._id, p.attended)}
                        className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 transition">
                        Toggle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${p === page ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ANALYTICS ── */}
      {tab === 'Analytics' && (
        <div>
          {event.status !== 'Completed' ? (
            <p className="text-gray-400 text-center py-12">Analytics are available after the event is completed.</p>
          ) : analytics ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Total Registrations', val: analytics.totalRegistrations ?? 0 },
                { label: 'Attended',             val: analytics.attended ?? 0 },
                { label: 'Attendance Rate',      val: analytics.totalRegistrations ? `${Math.round((analytics.attended / analytics.totalRegistrations) * 100)}%` : '0%' },
                { label: 'Revenue',              val: `₹${analytics.revenue ?? 0}` },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <p className="text-2xl font-bold text-indigo-600">{s.val}</p>
                  <p className="text-sm text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-12">No analytics data yet.</p>
          )}
        </div>
      )}

      {/* ── PAYMENTS (Merchandise only) ── */}
      {tab === 'Payments' && isMerchEvent && (
        <PaymentsTab eventId={id} onUpdate={fetchParticipants} />
      )}

      {/* ── ATTENDANCE / QR ── */}
      {tab === 'Attendance' && (
        <QRScannerAttendance eventId={id} />
      )}

      {/* ── DISCUSSION FORUM ── */}
      {tab === 'Discussion' && (
        <ForumDiscussion eventId={id} isOrganizer={true} />
      )}

      {/* ── FEEDBACK ── */}
      {tab === 'Feedback' && (
        <FeedbackSection eventId={id} canSubmit={false} />
      )}
    </div>
  );
};

// ── Payments Sub-component ──────────────────────────────────────────────────
const PaymentsTab = ({ eventId, onUpdate }) => {
  const [pendingRegs, setPendingRegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState('');

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const res = await organizerAPI.getParticipants(eventId, { status: 'Pending', limit: 100 });
      setPendingRegs(res.data.registrations || []);
    } catch (err) {
      setError('Failed to load pending payments');
    }
    setLoading(false);
  };

  const handleApprove = async (regId) => {
    setProcessing(regId);
    setError('');
    try {
      await organizerAPI.approvePayment(eventId, regId);
      fetchPending();
      onUpdate?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Approval failed');
    }
    setProcessing('');
  };

  const handleReject = async (regId) => {
    if (!window.confirm('Reject this payment? Stock will be restored.')) return;
    setProcessing(regId);
    setError('');
    try {
      await organizerAPI.rejectPayment(eventId, regId);
      fetchPending();
      onUpdate?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Rejection failed');
    }
    setProcessing('');
  };

  if (loading) return <div className="text-center py-8 text-gray-400">Loading pending payments…</div>;

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
      )}

      {pendingRegs.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No pending payments to review.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-2">{pendingRegs.length} pending payment(s)</p>
          {pendingRegs.map((reg) => (
            <div key={reg._id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-800">
                    {reg.participant ? `${reg.participant.firstName} ${reg.participant.lastName}` : '—'}
                  </p>
                  <p className="text-sm text-gray-500">{reg.participant?.email}</p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    <span>Ticket: <span className="font-mono">{reg.ticketId}</span></span>
                    {reg.merchandiseDetails && (
                      <>
                        {reg.merchandiseDetails.size && <span>Size: {reg.merchandiseDetails.size}</span>}
                        {reg.merchandiseDetails.color && <span>Color: {reg.merchandiseDetails.color}</span>}
                        <span>Qty: {reg.merchandiseDetails.quantity}</span>
                      </>
                    )}
                  </div>
                  {reg.paymentProof && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Payment Proof:</p>
                      {reg.paymentProof.startsWith('data:image') ? (
                        <img src={reg.paymentProof} alt="Payment proof" className="max-h-40 rounded-lg border" />
                      ) : (
                        <a href={reg.paymentProof} target="_blank" rel="noreferrer" className="text-indigo-600 text-xs hover:underline">View proof</a>
                      )}
                    </div>
                  )}
                  {!reg.paymentProof && (
                    <p className="text-xs text-yellow-600 mt-1">⚠ No payment proof uploaded yet</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(reg._id)}
                    disabled={processing === reg._id}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    {processing === reg._id ? '…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(reg._id)}
                    disabled={processing === reg._id}
                    className="border border-red-300 text-red-500 hover:bg-red-50 text-xs px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventManagement;
