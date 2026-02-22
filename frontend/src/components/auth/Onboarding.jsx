import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { participantAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const INTERESTS = [
  'Music', 'Dance', 'Drama', 'Photography', 'Coding', 'Robotics',
  'Art', 'Literature', 'Quizzing', 'Gaming', 'Sports', 'Film',
  'Fashion', 'Food', 'Finance', 'Social Impact',
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
    } catch (_) {}
    setLoading(false);
    navigate('/participant/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Welcome to Felicity! 🎉</h2>
        <p className="text-gray-500 mb-6">Select your areas of interest to get personalised event recommendations.</p>

        <div className="flex flex-wrap gap-2 mb-8">
          {INTERESTS.map((item) => (
            <button
              key={item}
              onClick={() => toggle(item)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                interests.includes(item)
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => submit(false)} disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Save & Continue'}
          </button>
          <button
            onClick={() => submit(true)} disabled={loading}
            className="px-6 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg font-medium transition"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
