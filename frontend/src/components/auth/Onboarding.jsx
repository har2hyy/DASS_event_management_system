import React, { useState, useEffect } from 'react';
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
  const [step, setStep] = useState(1); // 1: interests, 2: follow organizers
  const [interests, setInterests] = useState([]);
  const [followedOrganizers, setFollowedOrganizers] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    participantAPI.getOrganizers().then((res) => {
      setOrganizers(res.data.organizers || []);
    }).catch(() => {});
  }, []);

  const toggleInterest = (item) =>
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );

  const toggleFollow = (id) =>
    setFollowedOrganizers((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const submit = async (skip = false) => {
    setLoading(true);
    try {
      const res = await participantAPI.onboarding({
        interests: skip ? [] : interests,
        followedOrganizers: skip ? [] : followedOrganizers,
      });
      updateUser(res.data.user);
      setLoading(false);
      navigate('/participant/dashboard');
    } catch (_) {
      setLoading(false);
      navigate('/participant/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a14] px-4">
      <div className="bg-[#12122a] border border-indigo-500/20 rounded-2xl p-6 md:p-8 w-full max-w-xl">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-100 mb-1">Welcome to Felicity! 🎉</h2>

        {/* Step indicators */}
        <div className="flex items-center gap-2 my-5">
          {['Interests', 'Follow Clubs'].map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  step === i + 1 ? 'bg-indigo-600 text-white' : step > i + 1 ? 'bg-green-500 text-white' : 'bg-white/10 text-gray-500'
                }`}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className={`text-sm font-medium ${step === i + 1 ? 'text-indigo-400' : 'text-gray-500'}`}>{s}</span>
              </div>
              {i < 1 && <div className="flex-1 h-0.5 bg-white/10" />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Interests */}
        {step === 1 && (
          <>
            <p className="text-gray-400 mb-4">Select your areas of interest to get personalised event recommendations.</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {INTERESTS.map((item) => (
                <button
                  key={item}
                  onClick={() => toggleInterest(item)}
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
            <button
              onClick={() => setStep(2)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition"
            >
              Next →
            </button>
          </>
        )}

        {/* Step 2: Follow Organizers */}
        {step === 2 && (
          <>
            <p className="text-gray-400 mb-4">Follow clubs and organizers to see their events first. You can always change this later from your profile.</p>
            {organizers.length === 0 ? (
              <p className="text-gray-500 text-sm mb-6">No organizers available yet.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 mb-6">
                {organizers.map((org) => (
                  <button
                    key={org._id}
                    onClick={() => toggleFollow(org._id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition text-left ${
                      followedOrganizers.includes(org._id)
                        ? 'bg-indigo-600/15 border-indigo-500/50'
                        : 'bg-white/5 border-gray-700 hover:border-indigo-400/40'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      followedOrganizers.includes(org._id) ? 'bg-indigo-600 text-white' : 'bg-white/10 text-gray-400'
                    }`}>
                      {(org.organizerName || 'O')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{org.organizerName}</p>
                      {org.category && <p className="text-xs text-gray-500 truncate">{org.category}</p>}
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
                      followedOrganizers.includes(org._id)
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white/10 text-gray-400'
                    }`}>
                      {followedOrganizers.includes(org._id) ? 'Following' : 'Follow'}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-5 border border-white/10 text-gray-400 hover:bg-white/5 rounded-lg font-medium transition py-3"
              >
                ← Back
              </button>
              <button
                onClick={() => submit(false)} disabled={loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-60"
              >
                {loading ? 'Saving…' : 'Save & Continue'}
              </button>
            </div>
          </>
        )}

        {/* Skip always available */}
        <button
          onClick={() => submit(true)} disabled={loading}
          className="w-full mt-3 text-center text-sm text-gray-500 hover:text-gray-300 transition"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
