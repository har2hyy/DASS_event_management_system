import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { participantAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const INTERESTS = [
  'Gaming', 'Music', 'Dance', 'Sports', 'Coding', 'Hacking', 'Robotics',
  'Art', 'Photography', 'Quizzing', 'Film', 'Fashion', 'Literature',
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggle = (item) =>
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );

  const submit = async (skip = false) => {
    setLoading(true);
    try {
      const res = await participantAPI.onboarding({ interests: skip ? [] : interests });
      updateUser(res.data.user);
      setLoading(false);
      navigate('/participant/dashboard');
    } catch (_) {
      setLoading(false);
      navigate('/participant/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a14]">
      <div className="bg-[#12122a] border border-indigo-500/20 rounded-2xl p-6 md:p-8 w-full max-w-xl">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-100 mb-1">Welcome to Felicity! 🎉</h2>
        <p className="text-gray-400 mb-6">Select your areas of interest to get personalised event recommendations.</p>

        <div className="flex flex-wrap gap-2 mb-8">
          {INTERESTS.map((item) => (
            <button
              key={item}
              onClick={() => toggle(item)}
              className={`px-4 py-2.5 rounded-full text-sm font-medium border transition ${
                interests.includes(item)
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white/5 text-gray-400 border-gray-600 hover:border-indigo-400'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => submit(false)} disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Save & Continue'}
          </button>
          <button
            onClick={() => submit(true)} disabled={loading}
            className="px-6 border border-white/10 text-gray-400 hover:bg-white/5 rounded-lg font-medium transition"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
