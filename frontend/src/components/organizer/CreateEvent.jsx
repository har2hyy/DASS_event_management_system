import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventAPI } from '../../services/api';

const FIELD_TYPES = ['text', 'number', 'email', 'textarea', 'dropdown', 'checkbox', 'file'];
const ALLOWED_TAGS = ['gaming', 'music', 'dance', 'sports', 'coding', 'hacking', 'robotics', 'art', 'photography', 'quizzing', 'film', 'fashion', 'literature'];

const emptyField = () => ({
 label: '', type: 'text', options: [], required: false, order: 0, _tempId: Date.now(),
});

const CreateEvent = () => {
 const navigate = useNavigate();
 const [step, setStep] = useState(1); // 1: basics, 2: type-specific, 3: review
 const [form, setForm] = useState({
 eventName: '', eventDescription: '', eventType: 'Normal',
 eligibility: 'All', registrationDeadline: '', eventStartDate: '', eventEndDate: '',
 registrationLimit: 100, registrationFee: 0, eventTags: [],
 });
 const [formFields, setFormFields] = useState([]);
 const [merch, setMerch] = useState({
 sizes: '', colors: '', variants: '', stock: 0, purchaseLimit: 1,
 });
 const [error, setError] = useState('');
 const [saving, setSaving] = useState(false);

 const handleForm = (e) => setForm({ ...form, [e.target.name]: e.target.value });

 // ── Form builder helpers ──────────────────────────────────────────────────
 const addField = () => setFormFields([...formFields, emptyField()]);
 const removeField = (idx) => setFormFields(formFields.filter((_, i) => i !== idx));
 const updateField = (idx, key, val) =>
 setFormFields(formFields.map((f, i) => (i === idx ? { ...f, [key]: val } : f)));
 const moveField = (idx, dir) => {
 const arr = [...formFields];
 const to = idx + dir;
 if (to < 0 || to >= arr.length) return;
 [arr[idx], arr[to]] = [arr[to], arr[idx]];
 setFormFields(arr);
 };

 // ── Submit ────────────────────────────────────────────────────────────────
 const createDraft = async (publish = false) => {
 setSaving(true);
 setError('');
 try {
 const payload = {
 ...form,
 registrationLimit: Number(form.registrationLimit),
 registrationFee: Number(form.registrationFee),
 eventTags: form.eventTags,
 };

 if (form.eventType === 'Normal') {
 payload.customForm = {
 fields: formFields.map((f, i) => ({
 label: f.label,
 type: f.type,
 options: f.options,
 required: f.required,
 order: i,
 })),
 locked: false,
 };
 } else {
 payload.itemDetails = {
 sizes: merch.sizes.split(',').map((s) => s.trim()).filter(Boolean),
 colors: merch.colors.split(',').map((s) => s.trim()).filter(Boolean),
 variants: merch.variants.split(',').map((s) => s.trim()).filter(Boolean),
 stock: Number(merch.stock),
 purchaseLimit: Number(merch.purchaseLimit),
 };
 }

 const res = await eventAPI.create(payload);
 const eventId = res.data.event._id;

 if (publish) {
 await eventAPI.publish(eventId);
 }

 navigate(`/organizer/events/${eventId}`);
 } catch (err) {
 setError(err.response?.data?.message || 'Failed to create event');
 }
 setSaving(false);
 };

 return (
 <div className="max-w-3xl mx-auto px-4 py-8 md:py-10">
 <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-100 mb-6">Create New Event</h1>

 {/* Step indicators */}
 <div className="flex items-center gap-2 mb-8">
 {['Basic Info', 'Details', 'Review'].map((s, i) => (
 <React.Fragment key={s}>
 <div className={`flex items-center gap-2 ${step > i + 1 ? 'cursor-pointer' : ''}`}
 onClick={() => step > i + 1 && setStep(i + 1)}>
 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
 step === i + 1 ? 'bg-indigo-600 text-white' : step > i + 1 ? 'bg-green-500 text-white' : 'bg-white/10 text-gray-500'
 }`}>
 {step > i + 1 ? '✓' : i + 1}
 </div>
 <span className={`text-sm font-medium ${step === i + 1 ? 'text-indigo-400' : 'text-gray-500'}`}>{s}</span>
 </div>
 {i < 2 && <div className="flex-1 h-0.5 bg-white/10" />}
 </React.Fragment>
 ))}
 </div>

 {error && (
 <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
 )}

 {/* Step 1 */}
 {step === 1 && (
 <div className="bg-[#12122a] rounded-2xl border border-indigo-500/20 p-6 space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-300 mb-1">Event Name *</label>
 <input type="text" name="eventName" value={form.eventName} onChange={handleForm} required
 className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-300 mb-1">Description *</label>
 <textarea name="eventDescription" value={form.eventDescription} onChange={handleForm} rows={4}
 className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-300 mb-1">Event Type *</label>
 <select name="eventType" value={form.eventType} onChange={handleForm}
 className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
 <option value="Normal">Normal (Individual)</option>
 <option value="Merchandise">Merchandise</option>
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-300 mb-1">Eligibility *</label>
 <select name="eligibility" value={form.eligibility} onChange={handleForm}
 className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
 <option value="All">All</option>
 <option value="IIIT Only">IIIT Only</option>
 </select>
 </div>
 </div>
 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-300 mb-1">Start Date *</label>
 <input type="date" name="eventStartDate" value={form.eventStartDate} onChange={handleForm}
 className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-300 mb-1">End Date *</label>
 <input type="date" name="eventEndDate" value={form.eventEndDate} onChange={handleForm}
 className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-300 mb-1">Reg Deadline *</label>
 <input type="date" name="registrationDeadline" value={form.registrationDeadline} onChange={handleForm}
 className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-300 mb-1">Registration Limit</label>
 <input type="number" name="registrationLimit" value={form.registrationLimit} onChange={handleForm} min={1}
 className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-300 mb-1">Registration Fee (₹)</label>
 <input type="number" name="registrationFee" value={form.registrationFee} onChange={handleForm} min={0}
 className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
 </div>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
 <div className="flex flex-wrap gap-2">
 {ALLOWED_TAGS.map((tag) => (
 <button type="button" key={tag}
 onClick={() => setForm((prev) => ({
 ...prev,
 eventTags: prev.eventTags.includes(tag)
 ? prev.eventTags.filter((t) => t !== tag)
 : [...prev.eventTags, tag],
 }))}
 className={`px-3 py-1.5 rounded-full text-xs font-medium border transition capitalize ${
 form.eventTags.includes(tag)
 ? 'bg-indigo-600 text-white border-indigo-600'
 : 'bg-white/5 text-gray-400 border-gray-600 hover:border-indigo-400'
 }`}
 >
 {tag}
 </button>
 ))}
 </div>
 {form.eventTags.length > 0 && (
 <p className="text-xs text-gray-400 mt-1">{form.eventTags.length} tag{form.eventTags.length !== 1 ? 's' : ''} selected</p>
 )}
 </div>
 <button onClick={() => {
 if (!form.eventName || !form.eventDescription || !form.eventStartDate || !form.eventEndDate || !form.registrationDeadline) {
 return setError('Please fill all required fields');
 }
 if (form.eventEndDate < form.eventStartDate) {
 return setError('End date must be on or after start date');
 }
 if (form.registrationDeadline > form.eventEndDate) {
 return setError('Registration deadline must be on or before end date');
 }
 if (Number(form.registrationLimit) < 1) {
 return setError('Registration limit must be at least 1');
 }
 if (Number(form.registrationFee) < 0) {
 return setError('Registration fee cannot be negative');
 }
 setError('');
 setStep(2);
 }}
 className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition">
 Next →
 </button>
 </div>
 )}

 {/* Step 2 — type-specific */}
 {step === 2 && (
 <div className="bg-[#12122a] rounded-2xl border border-indigo-500/20 p-5 md:p-6 space-y-4">
 {form.eventType === 'Normal' ? (
 <>
 <div className="flex items-center justify-between mb-2">
 <h2 className="text-base font-semibold text-gray-200">Custom Registration Form</h2>
 <button onClick={addField}
 className="text-sm bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-500/30 transition">
 + Add Field
 </button>
 </div>
 {formFields.length === 0 && (
 <p className="text-sm text-gray-500 text-center py-6">No fields yet. Add fields above.</p>
 )}
 {formFields.map((field, idx) => (
 <div key={field._tempId} className="border border-white/10 rounded-xl p-4 space-y-3">
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
 <input type="text"
 value={field.options.join(', ')}
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
 </>
 ) : (
 <>
 <h2 className="text-base font-semibold text-gray-200 mb-2">Merchandise Details</h2>
 {[
 ['sizes', 'Sizes (comma-separated)', 'e.g. S, M, L, XL'],
 ['colors', 'Colors (comma-separated)', 'e.g. Black, White'],
 ['variants','Variants (comma-separated)', 'e.g. Standard, Limited'],
 ].map(([k, l, p]) => (
 <div key={k}>
 <label className="block text-sm font-medium text-gray-300 mb-1">{l}</label>
 <input type="text" value={merch[k]}
 onChange={(e) => setMerch({ ...merch, [k]: e.target.value })}
 placeholder={p}
 className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
 </div>
 ))}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-300 mb-1">Stock Quantity</label>
 <input type="number" min={0} value={merch.stock}
 onChange={(e) => setMerch({ ...merch, stock: e.target.value })}
 className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-300 mb-1">Purchase Limit per Person</label>
 <input type="number" min={1} value={merch.purchaseLimit}
 onChange={(e) => setMerch({ ...merch, purchaseLimit: e.target.value })}
 className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
 </div>
 </div>
 </>
 )}

 <div className="flex gap-3 pt-2">
 <button onClick={() => setStep(1)} className="flex-1 border border-white/10 text-gray-400 py-3 rounded-xl hover:bg-white/5 transition">
 ← Back
 </button>
 <button onClick={() => setStep(3)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition">
 Next →
 </button>
 </div>
 </div>
 )}

 {/* Step 3 — review */}
 {step === 3 && (
 <div className="bg-[#12122a] rounded-2xl border border-indigo-500/20 p-5 md:p-6">
 <h2 className="text-base md:text-lg font-semibold text-gray-200 mb-4">Review</h2>
 <div className="space-y-2 text-sm text-gray-300 mb-6">
 <p><span className="text-gray-500">Name:</span> {form.eventName}</p>
 <p><span className="text-gray-500">Type:</span> {form.eventType}</p>
 <p><span className="text-gray-500">Eligibility:</span> {form.eligibility}</p>
 <p><span className="text-gray-500">Dates:</span> {form.eventStartDate} → {form.eventEndDate}</p>
 <p><span className="text-gray-500">Deadline:</span> {form.registrationDeadline}</p>
 <p><span className="text-gray-500">Fee:</span> ₹{form.registrationFee}</p>
 <p><span className="text-gray-500">Limit:</span> {form.registrationLimit}</p>
 {form.eventType === 'Normal' && (
 <p><span className="text-gray-500">Form fields:</span> {formFields.length}</p>
 )}
 </div>
 <div className="flex gap-3">
 <button onClick={() => setStep(2)} className="flex-1 border border-white/10 text-gray-400 py-3 rounded-xl hover:bg-white/5 transition">
 ← Back
 </button>
 <button onClick={() => createDraft(false)} disabled={saving}
 className="flex-1 border border-indigo-500/50 text-indigo-400 py-3 rounded-xl hover:bg-indigo-500/10 transition font-semibold disabled:opacity-60">
 {saving ? '…' : 'Save as Draft'}
 </button>
 <button onClick={() => createDraft(true)} disabled={saving}
 className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-60">
 {saving ? '…' : 'Publish'}
 </button>
 </div>
 </div>
 )}
 </div>
 );
};

export default CreateEvent;
