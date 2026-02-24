import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventAPI, organizerAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';
import ForumDiscussion from '../common/ForumDiscussion';
import FeedbackSection from '../common/FeedbackSection';
import QRScannerAttendance from '../common/QRScannerAttendance';

const FIELD_TYPES = ['text', 'number', 'email', 'textarea', 'dropdown', 'checkbox', 'file'];
const ALLOWED_TAGS = ['gaming', 'music', 'dance', 'sports', 'coding', 'hacking', 'robotics', 'art', 'photography', 'quizzing', 'film', 'fashion', 'literature'];
const emptyField = () => ({
  label: '', type: 'text', options: [], required: false, order: 0, _tempId: Date.now() + Math.random(),
});

const EventManagement = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event,        setEvent]        = useState(null);
  const [participants, setParticipants] = useState([]);
  const [analytics,    setAnalytics]    = useState(null);
  const [forumUnread,  setForumUnread]  = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState('Overview');
  const [search,       setSearch]       = useState('');
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [error,        setError]        = useState('');
  const [saving,       setSaving]       = useState(false);
  const [editFields,   setEditFields]   = useState({});
  const [expandedReg,  setExpandedReg]  = useState(null);

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

  const handleDeleteEvent = async () => {
    if (!window.confirm('⚠️ Are you sure you want to PERMANENTLY DELETE this event? This will remove ALL registrations, messages, and feedback. This action cannot be undone.')) return;
    setSaving(true);
    setError('');
    try {
      await eventAPI.delete(id);
      navigate('/organizer/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
    setSaving(false);
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
    <div className="w-full px-6 sm:px-10 md:px-16 lg:px-24 py-8 md:py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <button onClick={() => navigate('/organizer/dashboard')}
            className="text-sm md:text-base text-gray-500 hover:text-gray-300 mb-1">← Back to Dashboard</button>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-100">{event.eventName}</h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={event.status} />
            <span className="text-xs text-gray-400">{event.eventType}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {event.status === 'Draft' && (
            <button onClick={handlePublish} disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-5 py-2.5 rounded-lg font-semibold transition disabled:opacity-60">
              Publish
            </button>
          )}
          {event.status === 'Published' && (
            <button onClick={() => handleStatusChange('Ongoing')} disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-5 py-2.5 rounded-lg font-semibold transition disabled:opacity-60">
              Mark Ongoing
            </button>
          )}
          {event.status === 'Ongoing' && (
            <button onClick={() => handleStatusChange('Completed')} disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-5 py-2.5 rounded-lg font-semibold transition disabled:opacity-60">
              Mark Completed
            </button>
          )}
          {['Published', 'Ongoing'].includes(event.status) && (
            <button onClick={() => { if (window.confirm('Cancel this event? All active registrations will be cancelled and participants notified.')) handleStatusChange('Cancelled'); }} disabled={saving}
              className="border border-red-400 text-red-400 hover:bg-red-500/10 text-sm px-5 py-2.5 rounded-lg font-semibold transition disabled:opacity-60">
              Cancel Event
            </button>
          )}
          {event.status === 'Draft' && (
            <button onClick={handleDeleteEvent} disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white text-sm px-5 py-2.5 rounded-lg font-semibold transition disabled:opacity-60">
              🗑 Delete
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => { setTab(t); if (t === 'Discussion') setForumUnread(0); }}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition -mb-px whitespace-nowrap relative ${
              tab === t ? 'border-indigo-400 text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}>
            {t}
            {t === 'Discussion' && forumUnread > 0 && tab !== 'Discussion' && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {forumUnread > 99 ? '99+' : forumUnread}
              </span>
            )}
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
              <div key={s.label} className="bg-[#12122a] rounded-lg md:rounded-xl p-3 md:p-4 border border-indigo-500/20">
                <p className="text-base md:text-lg font-bold text-gray-100">{s.val}</p>
                <p className="text-xs md:text-sm text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-[#12122a] rounded-xl p-4 md:p-5 border border-indigo-500/20">
            <h3 className="font-semibold text-gray-200 mb-3 text-base md:text-lg">Edit Event</h3>
            {!isEditable && !isLimitedEdit ? (
              <p className="text-sm text-gray-500">
                {['Ongoing', 'Completed'].includes(event.status)
                  ? 'No edits allowed — only status changes are permitted.'
                  : 'Cancelled events cannot be edited.'}
              </p>
            ) : (
              <div className="space-y-4">
                {/* ── DRAFT: all fields ── */}
                {isEditable && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Event Name</label>
                      <input type="text" defaultValue={event.eventName}
                        onChange={(e) => setEditFields((prev) => ({ ...prev, eventName: e.target.value }))}
                        className="w-full bg-white/5 border border-gray-600 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                      <textarea rows={3} defaultValue={event.eventDescription}
                        onChange={(e) => setEditFields((prev) => ({ ...prev, eventDescription: e.target.value }))}
                        className="w-full bg-white/5 border border-gray-600 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Event Type</label>
                        <select defaultValue={event.eventType}
                          onChange={(e) => setEditFields((prev) => ({ ...prev, eventType: e.target.value }))}
                          className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value="Normal">Normal</option>
                          <option value="Merchandise">Merchandise</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Eligibility</label>
                        <select defaultValue={event.eligibility}
                          onChange={(e) => setEditFields((prev) => ({ ...prev, eligibility: e.target.value }))}
                          className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value="All">All</option>
                          <option value="IIIT Only">IIIT Only</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Start Date</label>
                        <input type="date" defaultValue={event.eventStartDate?.slice(0, 10)}
                          onChange={(e) => setEditFields((prev) => ({ ...prev, eventStartDate: e.target.value }))}
                          className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">End Date</label>
                        <input type="date" defaultValue={event.eventEndDate?.slice(0, 10)}
                          onChange={(e) => setEditFields((prev) => ({ ...prev, eventEndDate: e.target.value }))}
                          className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Reg Deadline</label>
                        <input type="date" defaultValue={event.registrationDeadline?.slice(0, 10)}
                          onChange={(e) => setEditFields((prev) => ({ ...prev, registrationDeadline: e.target.value }))}
                          className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Registration Limit</label>
                        <input type="number" min={1} defaultValue={event.registrationLimit}
                          onChange={(e) => setEditFields((prev) => ({ ...prev, registrationLimit: Number(e.target.value) }))}
                          className="w-full bg-white/5 border border-gray-600 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Registration Fee (₹)</label>
                        <input type="number" min={0} defaultValue={event.registrationFee}
                          onChange={(e) => setEditFields((prev) => ({ ...prev, registrationFee: Number(e.target.value) }))}
                          className="w-full bg-white/5 border border-gray-600 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-2">Tags</label>
                      <div className="flex flex-wrap gap-2">
                        {ALLOWED_TAGS.map((tag) => {
                          const current = editFields.eventTags || event.eventTags || [];
                          const selected = current.includes(tag);
                          return (
                            <button type="button" key={tag}
                              onClick={() => setEditFields((prev) => ({
                                ...prev,
                                eventTags: selected ? current.filter((t) => t !== tag) : [...current, tag],
                              }))}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition capitalize ${
                                selected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white/5 text-gray-400 border-gray-600 hover:border-indigo-400'
                              }`}>
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* ── PUBLISHED: limited fields ── */}
                {isLimitedEdit && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                      <textarea rows={3} defaultValue={event.eventDescription}
                        onChange={(e) => setEditFields((prev) => ({ ...prev, eventDescription: e.target.value }))}
                        className="w-full bg-white/5 border border-gray-600 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Registration Deadline <span className="text-gray-600">(can only extend)</span>
                      </label>
                      <input type="date" defaultValue={event.registrationDeadline?.slice(0, 10)}
                        min={event.registrationDeadline?.slice(0, 10)}
                        onChange={(e) => setEditFields((prev) => ({ ...prev, registrationDeadline: e.target.value }))}
                        className="w-full bg-white/5 border border-gray-600 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Registration Limit <span className="text-gray-600">(can only increase, currently {event.registrationLimit})</span>
                      </label>
                      <input type="number" defaultValue={event.registrationLimit}
                        min={event.registrationLimit}
                        onChange={(e) => setEditFields((prev) => ({ ...prev, registrationLimit: Number(e.target.value) }))}
                        className="w-full bg-white/5 border border-gray-600 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </>
                )}

                <button onClick={handleEdit} disabled={saving || Object.keys(editFields).length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm md:text-base px-6 py-2.5 rounded-lg font-semibold transition disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          {/* ── FORM BUILDER (Draft + Normal only) ── */}
          {isEditable && (editFields.eventType || event.eventType) === 'Normal' && (
            <FormBuilderSection event={event} onSave={fetchEvent} />
          )}

          {/* ── MERCH DETAILS (Draft only) ── */}
          {isEditable && (editFields.eventType || event.eventType) === 'Merchandise' && (
            <MerchEditSection event={event} onSave={fetchEvent} />
          )}
        </div>
      )}

      {/* ── PARTICIPANTS ── */}
      {tab === 'Participants' && (
        <div>
          <div className="flex items-center justify-between mb-4 gap-3">
            <input type="text" value={search} placeholder="Search by name or email…"
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="flex-1 bg-white/5 border border-gray-600 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <button onClick={handleCSV}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-5 py-3 rounded-xl font-semibold transition">
              Export CSV
            </button>
          </div>

          <div className="bg-[#12122a] rounded-xl border border-indigo-500/20 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  {['Name', 'Email', 'Ticket ID', 'Registered', 'Status', ...(event.eventType === 'Normal' && event.customForm?.fields?.length ? ['Responses'] : []), ...(event.eventType === 'Merchandise' ? ['Order Details'] : [])].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {participants.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-500">No participants found.</td></tr>
                ) : participants.map((p) => (
                  <React.Fragment key={p._id}>
                    <tr className="hover:bg-white/5 transition">
                      <td className="px-4 py-3 font-medium text-gray-200">{p.participant ? `${p.participant.firstName} ${p.participant.lastName}` : '—'}</td>
                      <td className="px-4 py-3 text-gray-400">{p.participant?.email || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.ticketId || '—'}</td>
                      <td className="px-4 py-3 text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.status === 'Registered' ? 'bg-green-500/20 text-green-400' :
                          p.status === 'Attended'   ? 'bg-blue-500/20 text-blue-400' :
                          p.status === 'Pending'    ? 'bg-yellow-500/20 text-yellow-400' :
                          p.status === 'Cancelled'  ? 'bg-gray-500/20 text-gray-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>{p.status}</span>
                      </td>
                      {event.eventType === 'Normal' && event.customForm?.fields?.length > 0 && (
                        <td className="px-4 py-3">
                          {p.formResponses && Object.keys(p.formResponses).length > 0 ? (
                            <button
                              onClick={() => setExpandedReg(expandedReg === p._id ? null : p._id)}
                              className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-lg hover:bg-indigo-500/10 transition"
                            >
                              {expandedReg === p._id ? 'Hide' : 'View'}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-600">—</span>
                          )}
                        </td>
                      )}
                      {event.eventType === 'Merchandise' && (
                        <td className="px-4 py-3">
                          {p.merchandiseDetails && (p.merchandiseDetails.size || p.merchandiseDetails.color || p.merchandiseDetails.variant || p.merchandiseDetails.quantity) ? (
                            <button
                              onClick={() => setExpandedReg(expandedReg === p._id ? null : p._id)}
                              className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-lg hover:bg-indigo-500/10 transition"
                            >
                              {expandedReg === p._id ? 'Hide' : 'View'}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-600">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                    {expandedReg === p._id && event.eventType === 'Normal' && p.formResponses && (
                      <tr>
                        <td colSpan={7} className="px-4 py-3 bg-white/[0.02]">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            {Object.entries(p.formResponses).map(([label, value]) => (
                              <div key={label} className="bg-white/5 rounded-lg px-3 py-2">
                                <p className="text-xs text-gray-500 uppercase">{label}</p>
                                {typeof value === 'string' && value.startsWith('data:') ? (
                                  <a href={value} download={label} className="text-indigo-400 text-xs hover:underline">📎 Download file</a>
                                ) : Array.isArray(value) ? (
                                  <p className="text-gray-200 mt-0.5">{value.join(', ')}</p>
                                ) : (
                                  <p className="text-gray-200 mt-0.5">{String(value)}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                    {expandedReg === p._id && event.eventType === 'Merchandise' && p.merchandiseDetails && (
                      <tr>
                        <td colSpan={7} className="px-4 py-3 bg-white/[0.02]">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                            {p.merchandiseDetails.size && (
                              <div className="bg-white/5 rounded-lg px-3 py-2">
                                <p className="text-xs text-gray-500 uppercase">Size</p>
                                <p className="text-gray-200 mt-0.5">{p.merchandiseDetails.size}</p>
                              </div>
                            )}
                            {p.merchandiseDetails.color && (
                              <div className="bg-white/5 rounded-lg px-3 py-2">
                                <p className="text-xs text-gray-500 uppercase">Color</p>
                                <p className="text-gray-200 mt-0.5">{p.merchandiseDetails.color}</p>
                              </div>
                            )}
                            {p.merchandiseDetails.variant && (
                              <div className="bg-white/5 rounded-lg px-3 py-2">
                                <p className="text-xs text-gray-500 uppercase">Variant</p>
                                <p className="text-gray-200 mt-0.5">{p.merchandiseDetails.variant}</p>
                              </div>
                            )}
                            {p.merchandiseDetails.quantity && (
                              <div className="bg-white/5 rounded-lg px-3 py-2">
                                <p className="text-xs text-gray-500 uppercase">Quantity</p>
                                <p className="text-gray-200 mt-0.5">{p.merchandiseDetails.quantity}</p>
                              </div>
                            )}
                            {p.paymentProof && (
                              <div className="bg-white/5 rounded-lg px-3 py-2 col-span-2 sm:col-span-4">
                                <p className="text-xs text-gray-500 uppercase mb-1">Payment Proof</p>
                                <img src={p.paymentProof} alt="Payment proof" className="max-h-40 rounded-lg border border-white/10" />
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${p === page ? 'bg-indigo-600 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}>
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
                <div key={s.label} className="bg-[#12122a] rounded-lg md:rounded-xl p-4 md:p-5 border border-indigo-500/20">
                  <p className="text-xl md:text-2xl font-bold text-indigo-400">{s.val}</p>
                  <p className="text-xs md:text-sm text-gray-400">{s.label}</p>
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
      <div className={tab === 'Discussion' ? '' : 'hidden'}>
        <ForumDiscussion eventId={id} isOrganizer={true} onNewMessage={() => { if (tab !== 'Discussion') setForumUnread((c) => c + 1); }} />
      </div>

      {/* ── FEEDBACK ── */}
      {tab === 'Feedback' && (
        <FeedbackSection eventId={id} canSubmit={false} />
      )}
    </div>
  );
};

// ── Payments Sub-component ──────────────────────────────────────────────────
const PaymentsTab = ({ eventId, onUpdate }) => {
  const [regs, setRegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending'); // 'Pending' | 'Registered' | 'Rejected' | 'All'

  const fetchRegs = async () => {
    try {
      const params = statusFilter === 'All' ? { limit: 200 } : { status: statusFilter, limit: 200 };
      const res = await organizerAPI.getParticipants(eventId, params);
      setRegs(res.data.registrations || []);
    } catch (err) {
      setError('Failed to load payments');
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchRegs();
  }, [statusFilter]);

  const handleApprove = async (regId) => {
    setProcessing(regId);
    setError('');
    try {
      await organizerAPI.approvePayment(eventId, regId);
      fetchRegs();
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
      fetchRegs();
      onUpdate?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Rejection failed');
    }
    setProcessing('');
  };

  if (loading) return <div className="text-center py-8 text-gray-400">Loading payments…</div>;

  return (
    <div>
      {/* Status filter tabs */}
      <div className="flex gap-1 border-b border-white/10 mb-5">
        {['Pending', 'Registered', 'Rejected', 'All'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition -mb-px whitespace-nowrap ${
              statusFilter === s ? 'border-indigo-400 text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}>
            {s === 'Registered' ? 'Approved' : s}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
      )}

      {regs.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No {statusFilter === 'All' ? '' : statusFilter.toLowerCase()} orders found.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-2">{regs.length} order(s)</p>
          {regs.map((reg) => (
            <div key={reg._id} className="bg-[#12122a] rounded-xl p-3 md:p-4 border border-indigo-500/20">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-200">
                      {reg.participant ? `${reg.participant.firstName} ${reg.participant.lastName}` : '—'}
                    </p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      reg.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      reg.status === 'Registered' ? 'bg-green-500/20 text-green-400' :
                      reg.status === 'Rejected' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>{reg.status === 'Registered' ? 'Approved' : reg.status}</span>
                  </div>
                  <p className="text-sm text-gray-400">{reg.participant?.email}</p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    <span>Ticket: <span className="font-mono">{reg.ticketId || '(pending)'}</span></span>
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
                        <img src={reg.paymentProof} alt="Payment proof" className="max-h-40 rounded-lg border border-white/10" />
                      ) : (
                        <a href={reg.paymentProof} target="_blank" rel="noreferrer" className="text-indigo-400 text-xs hover:underline">View proof</a>
                      )}
                    </div>
                  )}
                  {!reg.paymentProof && reg.status === 'Pending' && (
                    <p className="text-xs text-yellow-400 mt-1">⚠ No payment proof uploaded yet</p>
                  )}
                </div>
                {reg.status === 'Pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(reg._id)}
                      disabled={processing === reg._id}
                      className="bg-green-600 hover:bg-green-700 text-white text-xs md:text-sm px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                    >
                      {processing === reg._id ? '…' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(reg._id)}
                      disabled={processing === reg._id}
                      className="border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs md:text-sm px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// FORM BUILDER sub-component (Draft + Normal events only)
// ═══════════════════════════════════════════════════════════════════════════════
const FormBuilderSection = ({ event, onSave }) => {
  const [fields, setFields] = useState(
    (event.customForm?.fields || []).map((f) => ({ ...f, _tempId: f._id || Date.now() + Math.random() }))
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState('');
  const isLocked = event.customForm?.locked;

  const addField    = () => setFields([...fields, emptyField()]);
  const removeField = (idx) => setFields(fields.filter((_, i) => i !== idx));
  const updateField = (idx, key, val) =>
    setFields(fields.map((f, i) => (i === idx ? { ...f, [key]: val } : f)));
  const moveField   = (idx, dir) => {
    const arr = [...fields];
    const to = idx + dir;
    if (to < 0 || to >= arr.length) return;
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    setFields(arr);
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      await eventAPI.updateCustomForm(event._id, {
        fields: fields.map((f, i) => ({
          label: f.label, type: f.type, options: f.options, required: f.required, order: i,
        })),
      });
      setMsg('✅ Form saved');
      onSave?.();
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message || 'Save failed'}`);
    }
    setSaving(false);
  };

  return (
    <div className="bg-[#12122a] rounded-xl p-4 md:p-5 border border-indigo-500/20">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-200 text-base md:text-lg">
          Custom Registration Form
          {isLocked && <span className="ml-2 text-xs text-yellow-400 font-normal">🔒 Locked (registrations exist)</span>}
        </h3>
        {!isLocked && (
          <button onClick={addField}
            className="text-sm bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-500/30 transition">
            + Add Field
          </button>
        )}
      </div>

      {isLocked ? (
        <div>
          <p className="text-sm text-gray-500 mb-3">Form cannot be modified after the first registration.</p>
          {fields.length === 0 ? (
            <p className="text-sm text-gray-600">No custom fields defined.</p>
          ) : (
            <div className="space-y-2">
              {fields.map((f, idx) => (
                <div key={f._tempId} className="bg-white/5 rounded-lg px-3 py-2 flex items-center gap-3 text-sm">
                  <span className="text-gray-500 w-6">{idx + 1}.</span>
                  <span className="text-gray-200 font-medium">{f.label || '(untitled)'}</span>
                  <span className="text-gray-500">{f.type}</span>
                  {f.required && <span className="text-red-400 text-xs">required</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {fields.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-6">No fields yet. Click "+ Add Field" above.</p>
          )}
          {fields.map((field, idx) => (
            <div key={field._tempId} className="border border-white/10 rounded-xl p-4 space-y-3 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">Field {idx + 1}</span>
                <div className="flex gap-1">
                  <button onClick={() => moveField(idx, -1)} className="text-gray-500 hover:text-gray-300 px-1">↑</button>
                  <button onClick={() => moveField(idx, 1)} className="text-gray-500 hover:text-gray-300 px-1">↓</button>
                  <button onClick={() => removeField(idx)} className="text-red-400 hover:text-red-300 px-1">✕</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Label</label>
                  <input type="text" value={field.label}
                    onChange={(e) => updateField(idx, 'label', e.target.value)}
                    className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
                  <select value={field.type} onChange={(e) => updateField(idx, 'type', e.target.value)}
                    className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              {(field.type === 'dropdown' || field.type === 'checkbox') && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Options (comma-separated)</label>
                  <input type="text" value={field.options.join(', ')}
                    onChange={(e) => updateField(idx, 'options', e.target.value.split(',').map((s) => s.trim()))}
                    className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input type="checkbox" checked={field.required}
                  onChange={(e) => updateField(idx, 'required', e.target.checked)} />
                Required
              </label>
            </div>
          ))}
          <div className="flex items-center gap-3 mt-2">
            <button onClick={handleSave} disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-6 py-2.5 rounded-lg font-semibold transition disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Form'}
            </button>
            {msg && <span className={`text-sm ${msg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{msg}</span>}
          </div>
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MERCHANDISE EDIT sub-component (Draft only)
// ═══════════════════════════════════════════════════════════════════════════════
const MerchEditSection = ({ event, onSave }) => {
  const details = event.itemDetails || {};
  const [merch, setMerch] = useState({
    sizes:         (details.sizes || []).join(', '),
    colors:        (details.colors || []).join(', '),
    variants:      (details.variants || []).join(', '),
    stock:         details.stock ?? 0,
    purchaseLimit: details.purchaseLimit ?? 1,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState('');

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      await eventAPI.update(event._id, {
        itemDetails: {
          sizes:         merch.sizes.split(',').map((s) => s.trim()).filter(Boolean),
          colors:        merch.colors.split(',').map((s) => s.trim()).filter(Boolean),
          variants:      merch.variants.split(',').map((s) => s.trim()).filter(Boolean),
          stock:         Number(merch.stock),
          purchaseLimit: Number(merch.purchaseLimit),
        },
      });
      setMsg('✅ Merch details saved');
      onSave?.();
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message || 'Save failed'}`);
    }
    setSaving(false);
  };

  return (
    <div className="bg-[#12122a] rounded-xl p-4 md:p-5 border border-indigo-500/20">
      <h3 className="font-semibold text-gray-200 mb-3 text-base md:text-lg">Merchandise Details</h3>
      <div className="space-y-3">
        {[
          ['sizes', 'Sizes (comma-separated)', 'e.g. S, M, L, XL'],
          ['colors', 'Colors (comma-separated)', 'e.g. Black, White'],
          ['variants', 'Variants (comma-separated)', 'e.g. Standard, Limited'],
        ].map(([k, l, p]) => (
          <div key={k}>
            <label className="block text-xs font-medium text-gray-400 mb-1">{l}</label>
            <input type="text" value={merch[k]}
              onChange={(e) => setMerch({ ...merch, [k]: e.target.value })}
              placeholder={p}
              className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Stock Quantity</label>
            <input type="number" min={0} value={merch.stock}
              onChange={(e) => setMerch({ ...merch, stock: e.target.value })}
              className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Purchase Limit per Person</label>
            <input type="number" min={1} value={merch.purchaseLimit}
              onChange={(e) => setMerch({ ...merch, purchaseLimit: e.target.value })}
              className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-6 py-2.5 rounded-lg font-semibold transition disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Merch Details'}
          </button>
          {msg && <span className={`text-sm ${msg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{msg}</span>}
        </div>
      </div>
    </div>
  );
};

export default EventManagement;
