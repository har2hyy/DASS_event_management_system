import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import felicityLogo from '../../assets/felicity_logo.png';
import SplashCursor from '@/components/SplashCursor';
import Silk from '@/components/Silk';

const Register = () => {
 const navigate = useNavigate();
 const { register } = useAuth();
 const [form, setForm] = useState({
 email: '', password: '', confirmPassword: '',
 firstName: '', lastName: '', participantType: 'Non-IIIT', college: '', contactNumber: '',
 });
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);

 const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

 const submit = async (e) => {
 e.preventDefault();
 setError('');
 if (form.password !== form.confirmPassword) return setError('Passwords do not match');
 if (form.password.length < 6) return setError('Password must be at least 6 characters');

 setLoading(true);
 const { confirmPassword, ...data } = form;
 const result = await register(data);
 setLoading(false);
 if (!result.success) return setError(result.message);
 navigate('/participant/onboarding');
 };

 return (
 <div className="min-h-screen relative overflow-hidden bg-black">
 <div style={{ width: '100%', height: '100%', position: 'absolute'}}>
 <Silk
 speed={5}
 scale={1}
 color="rgb(39, 40, 94)"
 noiseIntensity={1.5}
 rotation={0}
 />
 </div>

 <SplashCursor
 SIM_RESOLUTION={128}
 DYE_RESOLUTION={1440}
 DENSITY_DISSIPATION={2}
 VELOCITY_DISSIPATION={2}
 PRESSURE={0.1}
 CURL={0}
 SPLAT_RADIUS={0.45}
 SPLAT_FORCE={3000}
 COLOR_UPDATE_SPEED={1}
 />

 {/* Content overlay — right-aligned */}
 <div className="relative z-50 min-h-screen flex items-center justify-end pr-8 md:pr-16 lg:pr-24 py-8">
 <div
 className="w-full max-w-lg p-8 md:p-10"
 style={{
 background: 'rgba(10, 10, 20, 0.85)',
 backdropFilter: 'blur(16px)',
 WebkitBackdropFilter: 'blur(16px)',
 border: '1px solid rgba(99, 102, 241, 0.4)',
 boxShadow: '0 0 30px rgba(99, 102, 241, 0.25), 0 0 60px rgba(139, 92, 246, 0.15)',
 }}
 >
 <div className="text-right mb-6">
 <img src={felicityLogo} alt="Felicity 2026" className="h-14 md:h-18 ml-auto mb-2" style={{ filter: 'brightness(0) invert(1)' }} />
 <p className="text-gray-400 mt-1">Create your participant account</p>
 </div>

 {error && (
 <div className="bg-red-900/50 border border-red-500/50 text-red-300 px-4 py-3 mb-4 text-sm text-right">
 {error}
 </div>
 )}

 <form onSubmit={submit} className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="text-right">
 <label className="block text-sm font-medium text-gray-300 mb-1">First Name</label>
 <input type="text" name="firstName" value={form.firstName} onChange={handle} required
 className="w-full bg-white/5 border border-gray-600 px-4 py-3 text-sm text-white text-right placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition" />
 </div>
 <div className="text-right">
 <label className="block text-sm font-medium text-gray-300 mb-1">Last Name</label>
 <input type="text" name="lastName" value={form.lastName} onChange={handle} required
 className="w-full bg-white/5 border border-gray-600 px-4 py-3 text-sm text-white text-right placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition" />
 </div>
 </div>

 <div className="text-right">
 <label className="block text-sm font-medium text-gray-300 mb-1">Participant Type</label>
 <select name="participantType" value={form.participantType} onChange={handle}
 className="w-full bg-white/5 border border-gray-600 px-4 py-3 text-sm text-white text-right focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition">
 <option value="IIIT" className="bg-gray-900">IIIT Student</option>
 <option value="Non-IIIT" className="bg-gray-900">Non-IIIT Participant</option>
 </select>
 </div>

 <div className="text-right">
 <label className="block text-sm font-medium text-gray-300 mb-1">
 Email {form.participantType === 'IIIT' && <span className="text-indigo-400 text-xs">(must be @iiit.ac.in)</span>}
 </label>
 <input type="email" name="email" value={form.email} onChange={handle} required
 placeholder={form.participantType === 'IIIT' ? 'student@iiit.ac.in' : 'your@email.com'}
 className="w-full bg-white/5 border border-gray-600 px-4 py-3 text-sm text-white text-right placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition" />
 </div>

 <div className="text-right">
 <label className="block text-sm font-medium text-gray-300 mb-1">College / Organisation</label>
 <input type="text" name="college" value={form.college} onChange={handle}
 className="w-full bg-white/5 border border-gray-600 px-4 py-3 text-sm text-white text-right placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition" />
 </div>

 <div className="text-right">
 <label className="block text-sm font-medium text-gray-300 mb-1">Contact Number</label>
 <input type="tel" name="contactNumber" value={form.contactNumber}
 onChange={(e) => { if (/^[0-9]*$/.test(e.target.value)) handle(e); }}
 pattern="[0-9]{10}" maxLength={10} placeholder="10-digit mobile number"
 className="w-full bg-white/5 border border-gray-600 px-4 py-3 text-sm text-white text-right placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition" />
 </div>

 <div className="text-right">
 <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
 <input type="password" name="password" value={form.password} onChange={handle} required
 className="w-full bg-white/5 border border-gray-600 px-4 py-3 text-sm text-white text-right placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition" />
 </div>

 <div className="text-right">
 <label className="block text-sm font-medium text-gray-300 mb-1">Confirm Password</label>
 <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handle} required
 className="w-full bg-white/5 border border-gray-600 px-4 py-3 text-sm text-white text-right placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition" />
 </div>

 <button type="submit" disabled={loading}
 className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-3 transition border border-indigo-500">
 {loading ? 'Creating account…' : 'Create Account'}
 </button>
 </form>

 <p className="text-right text-sm text-gray-400 mt-6">
 Already have an account?{' '}
 <Link to="/login" className="text-indigo-400 font-medium hover:text-indigo-300 hover:underline">Sign in</Link>
 </p>
 </div>
 </div>
 </div>
 );
};

export default Register;
