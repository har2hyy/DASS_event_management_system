import React, { useEffect, useState } from 'react';
import { feedbackAPI } from '../../services/api';

const FeedbackSection = ({ eventId, canSubmit = false }) => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchFeedback();
  }, [eventId]);

  const fetchFeedback = async () => {
    try {
      const res = await feedbackAPI.get(eventId);
      setFeedbacks(res.data.feedbacks || []);
      setStats(res.data.stats || null);
    } catch (err) {
      // ok
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setMessage('Please select a rating');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      await feedbackAPI.submit(eventId, { rating, comment: comment.trim() });
      setSubmitted(true);
      setMessage('Thank you for your feedback!');
      fetchFeedback();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to submit feedback');
    }
    setSubmitting(false);
  };

  if (loading) return <div className="text-center py-6 text-gray-400">Loading feedback…</div>;

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && stats.total > 0 && (
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-indigo-600">{stats.averageRating}</p>
              <div className="flex justify-center mt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} className={`text-lg ${s <= Math.round(stats.averageRating) ? 'text-yellow-400' : 'text-gray-200'}`}>
                    ★
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">{stats.total} review{stats.total !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.distribution?.[star] || 0;
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-sm">
                    <span className="w-4 text-right text-gray-500">{star}</span>
                    <span className="text-yellow-400">★</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right text-gray-400 text-xs">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Submit form */}
      {canSubmit && !submitted && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3">Leave Anonymous Feedback</h3>
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                type="button"
                key={s}
                onMouseEnter={() => setHoverRating(s)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(s)}
                className={`text-3xl transition ${
                  s <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-200'
                } hover:scale-110`}
              >
                ★
              </button>
            ))}
            {rating > 0 && (
              <span className="text-sm text-gray-500 ml-2">
                {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
              </span>
            )}
          </div>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience (optional)…"
            maxLength={1000}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
          />
          {message && (
            <p className={`text-sm mb-2 ${message.includes('Thank') ? 'text-green-600' : 'text-red-500'}`}>{message}</p>
          )}
          <button
            type="submit"
            disabled={submitting || rating === 0}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition"
          >
            {submitting ? 'Submitting…' : 'Submit Feedback'}
          </button>
        </form>
      )}

      {submitted && message && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">{message}</div>
      )}

      {/* Feedback list */}
      {feedbacks.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-700">All Feedback</h3>
          {feedbacks.map((fb) => (
            <div key={fb._id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} className={`text-sm ${s <= fb.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                ))}
                <span className="text-xs text-gray-400 ml-2">
                  {new Date(fb.createdAt).toLocaleDateString()}
                </span>
              </div>
              {fb.comment && <p className="text-sm text-gray-600">{fb.comment}</p>}
            </div>
          ))}
        </div>
      )}

      {!canSubmit && feedbacks.length === 0 && (
        <p className="text-gray-400 text-center py-6">No feedback yet.</p>
      )}
    </div>
  );
};

export default FeedbackSection;
