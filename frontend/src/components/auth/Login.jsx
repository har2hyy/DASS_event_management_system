import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import felicityLogo from '../../assets/felicity_logo.png';
import SplashCursor from '@/components/SplashCursor';
import Silk from '@/components/Silk';

const Login = () => {
 const navigate = useNavigate();
 const { login } = useAuth();
 const [form, setForm] = useState({ email: '', password: '' });
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);

 const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

 const submit = async (e) => {
 e.preventDefault();
 setError('');
 setLoading(true);
 const result = await login(form.email, form.password);
 setLoading(false);
 if (!result.success) return setError(result.message);

 const role = result.user.role;
 if (role === 'Participant') navigate('/participant/dashboard');
 else if (role === 'Organizer') navigate('/organizer/dashboard');
 else if (role === 'Admin') navigate('/admin/dashboard');
 };

 return (
 <div className="min-h-screen relative overflow-hidden bg-purple">
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
 <div className="relative z-50 min-h-screen flex items-center justify-end pr-8 md:pr-16 lg:pr-24">
 <div
 className="w-full max-w-md p-8 md:p-10"
 style={{
 background: 'rgba(10, 10, 20, 0.85)',
 backdropFilter: 'blur(16px)',
 WebkitBackdropFilter: 'blur(16px)',
 border: '1px solid rgba(99, 102, 241, 0.4)',
 boxShadow: '0 0 30px rgba(99, 102, 241, 0.25), 0 0 60px rgba(139, 92, 246, 0.15)',
 }}
 >
 <div className="text-right mb-8">
 <img src={felicityLogo} alt="Felicity 2026" className="h-16 md:h-20 ml-auto mb-3" style={{ filter: 'brightness(0) invert(1)' }} />
 <p className="text-gray-400 mt-1">Sign in to your account</p>
 </div>

 {error && (
 <div className="bg-red-900/50 border border-red-500/50 text-red-300 px-4 py-3 mb-4 text-sm text-right">
 {error}
 </div>
 )}

 <form onSubmit={submit} className="space-y-4">
 <div className="text-right">
 <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
 <input
 type="email" name="email" value={form.email} onChange={handle} required
 className="w-full bg-white/5 border border-gray-600 px-4 py-3 text-sm text-white text-right placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition"
 placeholder="your@email.com"
 />
 </div>
 <div className="text-right">
 <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
 <input
 type="password" name="password" value={form.password} onChange={handle} required
 className="w-full bg-white/5 border border-gray-600 px-4 py-3 text-sm text-white text-right placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition"
 placeholder="••••••••"
 />
 </div>

 <button
 type="submit" disabled={loading}
 className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-3 transition border border-indigo-500"
 >
 {loading ? 'Signing in…' : 'Sign In'}
 </button>
 </form>

 <p className="text-right text-sm text-gray-400 mt-6">
 New participant?{' '}
 <Link to="/register" className="text-indigo-400 font-medium hover:text-indigo-300 hover:underline">
 Create account
 </Link>
 </p>
 </div>
 </div>
 </div>
 );
};

export default Login;
