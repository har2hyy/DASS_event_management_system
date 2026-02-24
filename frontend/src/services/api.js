import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register:       (data)           => api.post('/auth/register', data),
  login:          (data)           => api.post('/auth/login', data),
  getMe:          ()               => api.get('/auth/me'),
  changePassword: (data)           => api.put('/auth/change-password', data),
};

// ── Events ────────────────────────────────────────────────────────────────────
export const eventAPI = {
  getAll:          (params)        => api.get('/events', { params }),
  getTrending:     ()              => api.get('/events/trending'),
  getTags:         ()              => api.get('/events/tags'),
  getById:         (id)            => api.get(`/events/${id}`),
  create:          (data)          => api.post('/events', data),
  update:          (id, data)      => api.put(`/events/${id}`, data),
  publish:         (id)            => api.put(`/events/${id}/publish`),
  delete:          (id)            => api.delete(`/events/${id}`),
  updateCustomForm:(id, data)      => api.put(`/events/${id}/custom-form`, data),
};

// ── Registrations ─────────────────────────────────────────────────────────────
export const registrationAPI = {
  register:       (eventId, data)  => api.post(`/registrations/${eventId}`, data),
  getMy:          ()               => api.get('/registrations/my'),
  getById:        (id)             => api.get(`/registrations/${id}`),
  cancel:         (id)             => api.delete(`/registrations/${id}`),
  uploadPaymentProof: (id, data)   => api.put(`/registrations/${id}/payment-proof`, data),
};

// ── Participant ───────────────────────────────────────────────────────────────
export const participantAPI = {
  getDashboard:     ()             => api.get('/participant/dashboard'),
  updateProfile:    (data)         => api.put('/participant/profile', data),
  onboarding:       (data)         => api.put('/participant/onboarding', data),
  getOrganizers:    ()             => api.get('/participant/organizers'),
  getOrganizer:     (id)           => api.get(`/participant/organizers/${id}`),
  toggleFollow:     (id)           => api.post(`/participant/follow/${id}`),
};

// ── Organizer ─────────────────────────────────────────────────────────────────
export const organizerAPI = {
  getDashboard:      ()            => api.get('/organizer/dashboard'),
  getProfile:        ()            => api.get('/organizer/profile'),
  updateProfile:     (data)        => api.put('/organizer/profile', data),
  getParticipants:   (id, params)  => api.get(`/organizer/events/${id}/participants`, { params }),
  exportCSV:         (id)          => api.get(`/organizer/events/${id}/participants/export`, { responseType: 'blob' }),
  markAttendance:    (eid, rid, data) => api.put(`/organizer/events/${eid}/attendance/${rid}`, data),
  markAttendanceByScan: (eid, data) => api.post(`/organizer/events/${eid}/attendance-scan`, data),
  getAttendanceStats:   (eid)      => api.get(`/organizer/events/${eid}/attendance-stats`),
  requestPasswordReset: (data)     => api.post('/organizer/password-reset-request', data),
  getPasswordResetRequests: ()     => api.get('/organizer/password-reset-requests'),
  approvePayment:    (eid, rid)    => api.put(`/organizer/events/${eid}/approve-payment/${rid}`),
  rejectPayment:     (eid, rid)    => api.put(`/organizer/events/${eid}/reject-payment/${rid}`),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminAPI = {
  getDashboard:       ()           => api.get('/admin/dashboard'),
  getOrganizers:      ()           => api.get('/admin/organizers'),
  createOrganizer:    (data)       => api.post('/admin/organizers', data),
  deleteOrganizer:    (id)         => api.delete(`/admin/organizers/${id}`),
  resetPassword:      (id, data)   => api.put(`/admin/organizers/${id}/reset-password`, data),
  getUsers:           (params)     => api.get('/admin/users', { params }),
  getAllEvents:        ()           => api.get('/admin/events'),
  deleteEvent:         (id)         => api.delete(`/admin/events/${id}`),
  getPasswordResetRequests: (params) => api.get('/admin/password-reset-requests', { params }),
  approvePasswordReset: (id, data) => api.put(`/admin/password-reset-requests/${id}/approve`, data),
  rejectPasswordReset:  (id, data) => api.put(`/admin/password-reset-requests/${id}/reject`, data),
};

// ── Feedback ──────────────────────────────────────────────────────────────────
export const feedbackAPI = {
  submit: (eventId, data) => api.post(`/feedback/${eventId}`, data),
  get:    (eventId)       => api.get(`/feedback/${eventId}`),
};

// ── Forum ─────────────────────────────────────────────────────────────────────
export const forumAPI = {
  getMessages:   (eventId, params) => api.get(`/forum/${eventId}/messages`, { params }),
  postMessage:   (eventId, data)   => api.post(`/forum/${eventId}/messages`, data),
  togglePin:     (eventId, msgId)  => api.put(`/forum/${eventId}/messages/${msgId}/pin`),
  deleteMessage: (eventId, msgId)  => api.delete(`/forum/${eventId}/messages/${msgId}`),
  react:         (eventId, msgId, data) => api.put(`/forum/${eventId}/messages/${msgId}/react`, data),
};

export default api;
