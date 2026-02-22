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
  getById:         (id)            => api.get(`/events/${id}`),
  create:          (data)          => api.post('/events', data),
  update:          (id, data)      => api.put(`/events/${id}`, data),
  publish:         (id)            => api.put(`/events/${id}/publish`),
  delete:          (id)            => api.delete(`/events/${id}`),
  updateCustomForm:(id, data)      => api.put(`/events/${id}/custom-form`, data),
};

// ── Registrations ─────────────────────────────────────────────────────────────
export const registrationAPI = {
  register:   (eventId, data)  => api.post(`/registrations/${eventId}`, data),
  getMy:      ()               => api.get('/registrations/my'),
  getById:    (id)             => api.get(`/registrations/${id}`),
  cancel:     (id)             => api.delete(`/registrations/${id}`),
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
};

export default api;
