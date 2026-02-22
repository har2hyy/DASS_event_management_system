# Felicity Event Management System

**Assignment 1 — Design & Analysis of Software Systems**
**Roll No:** `<YOUR_ROLL_NUMBER>`

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Libraries & Frameworks — with Justification](#3-libraries--frameworks--with-justification)
4. [Architecture & Design Decisions](#4-architecture--design-decisions)
5. [Part 1: Core Features Implemented](#5-part-1-core-features-implemented)
6. [Part 2: Advanced Features](#6-part-2-advanced-features)
7. [Folder Structure](#7-folder-structure)
8. [Data Models](#8-data-models)
9. [API Reference](#9-api-reference)
10. [Setup & Installation (Local)](#10-setup--installation-local)
11. [Deployment](#11-deployment)

---

## 1. Project Overview

Felicity is a centralized event management platform for fests. It replaces the chaos of Google Forms, WhatsApp groups, and spreadsheets with a structured, role-based system covering three user types — **Participant**, **Organizer**, and **Admin**.

Key capabilities:
- Participants browse published events, register with custom forms, track tickets with QR codes, and follow organizers
- Organizers create and manage events with a dynamic form builder, track attendance, and export participant data as CSV
- Admins manage the full platform — provision organizer accounts, view all events and users, and monitor platform-wide statistics

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20.x |
| Backend | Express.js 5.x |
| Database | MongoDB (Atlas for production, local for development) |
| ODM | Mongoose 9.x |
| Frontend | React 19 via Vite 7 |
| Styling | Tailwind CSS v4 |
| Auth | JSON Web Tokens (JWT) + bcrypt |

---

## 3. Libraries & Frameworks — with Justification

### Backend

| Package | Version | Justification |
|---------|---------|--------------|
| `express` | ^5.2.1 | Industry-standard minimal Node.js framework. Chosen over Fastify/Koa for its ecosystem maturity, middleware richness, and straightforward routing. v5 brings native async error propagation without wrapping try-catch blocks. |
| `mongoose` | ^9.2.1 | ODM (Object Document Mapper) for MongoDB. Provides schema validation, middleware hooks (pre-save for bcrypt), virtuals, and relationship population — removing significant boilerplate. Preferred over raw `mongodb` driver for its type safety and schema enforcement. |
| `dotenv` | ^17.3.1 | Loads environment variables from `.env` into `process.env` at runtime. Essential for keeping credentials out of source code and supporting different configs per environment (dev/prod). |
| `bcrypt` | ^6.0.0 | Industry-standard adaptive hash function for password storage. Uses salted hashing with a configurable work factor (cost 10), making brute-force attacks computationally expensive. Chosen over `argon2` for wider deployment support. |
| `jsonwebtoken` | ^9.0.3 | Stateless JWT authentication. Tokens are self-contained (encode role + user ID), allowing the backend to verify requests without a session store. This enables horizontal scaling. 7-day expiry with localStorage persistence on the client. |
| `cors` | ^2.8.6 | Configures Cross-Origin Resource Sharing headers so the React frontend (port 5173 in dev, separate domain in prod) can call the Express API. |
| `express-validator` | ^7.3.1 | Declarative request body validation and sanitization middleware. Used on auth routes to enforce email format, password strength, and required fields — preventing malformed data from reaching the database. |
| `nodemailer` | ^8.0.1 | SMTP email client. Sends ticket confirmation emails (with QR code and ticket details) to participants after registration. Configured with Gmail SMTP App Password. Errors are caught and logged non-fatally so registration still succeeds even if email is unconfigured. |
| `qrcode` | ^1.5.4 | Generates QR codes as base64-encoded PNG DataURLs. Each ticket embeds a QR encoding the ticket ID — enabling organizer scanning for attendance. Stored in the Registration document to avoid regeneration overhead. |
| `multer` | ^2.0.2 | Multipart form-data middleware for handling file uploads (e.g., payment proof images for merchandise payment approval workflow in Part 2). Configured with `memoryStorage` for flexible cloud upload support. |
| `json2csv` | ^6.0.0-alpha.2 | Converts a JavaScript array of objects to CSV format. Used in the organizer participant export feature — returns a `text/csv` response directly without writing temp files. |
| `axios` | ^1.13.5 | HTTP client used server-side to fire the Discord webhook POST when an organizer publishes an event. Errors are caught non-fatally so they don't block the publish action. |
| `nodemon` | ^3.1.14 | Dev-only: restarts the Node process automatically on file changes. Removes the need to manually kill and restart the server during development. |

### Frontend

| Package | Version | Justification |
|---------|---------|--------------|
| `react` + `react-dom` | ^19.2.0 | Component-based UI library. React 19 with concurrent rendering, hooks-based state, and context API covers all UI needs. Chosen per assignment requirement. |
| `vite` | ^7.3.1 | Build tool and dev server. Vite offers near-instant cold starts via native ES modules, HMR in milliseconds, and a fast production build via Rollup — significantly better DX than CRA/Webpack. |
| `@vitejs/plugin-react` | ^5.1.1 | Vite plugin providing Babel-based Fast Refresh for React components, preserving component state during HMR. |
| `react-router-dom` | ^7.13.0 | Client-side routing library. Provides `<Routes>`, `<Route>`, `<Navigate>` and hooks (`useParams`, `useNavigate`) for the single-page app navigation model. v7 has full async loader support and type safety improvements. |
| `axios` | ^1.13.5 | HTTP client for API calls. Chosen over native `fetch` for its automatic JSON serialization/deserialization, request/response interceptors (used to attach JWT and handle 401 auto-logout centrally), and cleaner error handling. |
| `tailwindcss` | ^4.0 | Utility-first CSS framework. Configuration-free in v4 (uses `@import "tailwindcss"` — no `tailwind.config.js` needed). Provides consistent design tokens (spacing, color, typography) and eliminates context-switching between JS and CSS files. Much smaller bundle than component libraries (MUI/Chakra) since only used utilities are included. |
| `@tailwindcss/vite` | ^4.2.0 | Official Vite plugin for Tailwind CSS v4. Integrates Tailwind's JIT compiler directly into the Vite pipeline via a single plugin, removing the need for a PostCSS configuration file. |

---

## 4. Architecture & Design Decisions

### Single User Collection with Role Discriminator
All three user types (Participant, Organizer, Admin) are stored in a single `users` MongoDB collection. Role-specific fields use conditional `required` validators (`required: function() { return this.role === 'Participant'; }`). This avoids `JOIN`-like cross-collection lookups for auth and keeps the codebase simple.

**Alternative considered:** Separate collections per role. Rejected because it complicates the auth middleware (must query three collections to find a user by email) and produces nearly identical schemas.

### JWT Stateless Authentication
Tokens are signed with `jsonwebtoken`, stored in `localStorage`, and attached as `Authorization: Bearer <token>` headers. The `protect` middleware verifies the signature and role on every protected request.

**No refresh token:** For academic scope, a 7-day expiry is acceptable. A production system would use short-lived access tokens (15 min) + refresh tokens stored in httpOnly cookies.

### Form Lock after First Registration
Custom registration forms are locked (`customForm.locked = true`) once the first participant registers. This prevents organizers from modifying the form in a way that invalidates existing responses. The frontend disables the form builder when `locked = true`.

### Ticket ID Format
Auto-generated as `FEL-{base36(timestamp)}-{4-char random}` (e.g., `FEL-MLXTMFLK-FFAV`). Avoids the `uuid` dependency, is human-readable/speakable, and is unique with negligible collision probability.

### Non-blocking Side Effects
Email sending (Nodemailer) and Discord webhook posting (Axios) are fire-and-forget — errors are caught and logged but never propagate to the HTTP response. This ensures registration/publish always succeeds even if third-party services are misconfigured.

### Trending Algorithm
`getTrending` uses a MongoDB aggregation pipeline that counts registrations created in the last 24 hours, groups by event, sorts descending, limits to 5, and populates event details. Runs on every browse request (not cached) — acceptable at academic scale.

---

## 5. Part 1: Core Features Implemented

### 5.1 Authentication & Security ✅ [8 Marks]

| Feature | Status | Notes |
|---------|--------|-------|
| Participant registration (IIIT email validation) | ✅ | Email domain must contain `iiit` |
| Non-IIIT participant registration | ✅ | Any valid email |
| Organizer provisioned by Admin only | ✅ | No self-registration endpoint |
| Admin seeded on startup | ✅ | `utils/seedAdmin.js` runs after DB connect |
| Passwords hashed with bcrypt | ✅ | Cost factor 10, pre-save hook |
| JWT-based auth on all protected routes | ✅ | `protect` + `authorize` middleware |
| Role-based access (RBAC) | ✅ | `ProtectedRoute` in frontend + `authorize()` in backend |
| Session persistence across browser restarts | ✅ | Token in `localStorage`, loaded on app mount |
| Logout clears tokens | ✅ | `localStorage.removeItem('token')` + context reset |

### 5.2 User Onboarding & Preferences ✅ [3 Marks]

| Feature | Status | Notes |
|---------|--------|-------|
| Post-signup interest selection | ✅ | Bubble UI, skippable |
| Interest preferences stored in DB | ✅ | `interests[]` array on User |
| Editable from Profile page | ✅ | Toggle bubbles on Profile page |
| Influences event ordering | ✅ | Browse Events shows followed organizer events first when filter applied |

### 5.3 Event Types & Attributes ✅ [4 Marks]

| Feature | Status | Notes |
|---------|--------|-------|
| Normal event (individual registration) | ✅ | Custom form builder |
| Merchandise event (individual purchase) | ✅ | Sizes, colors, variants, stock, purchaseLimit |
| All required event fields present | ✅ | Name, desc, type, eligibility, dates, limit, fee, organizer, tags |
| Custom form (Normal) | ✅ | Dynamic fields: text/number/email/textarea/dropdown/checkbox/file |
| Item details (Merchandise) | ✅ | sizes[], colors[], variants[], stock, purchaseLimit |

### 5.4 Participant Features ✅ [22 Marks]

| Feature | Status | Notes |
|---------|--------|-------|
| Navigation (Dashboard, Browse, Organizers, Profile, Logout) | ✅ | Role-aware Navbar |
| My Events Dashboard — Upcoming tab | ✅ | All registered future events |
| My Events Dashboard — Normal/Merchandise/Completed/Cancelled tabs | ✅ | Full history tabbed |
| Browse Events — text search | ✅ | MongoDB `$text` index on eventName + description + tags |
| Browse Events — Trending (Top 5 / 24h) | ✅ | Aggregation pipeline |
| Browse Events — filters (type, eligibility, date range, followed clubs) | ✅ | Composable query params |
| Event Details page | ✅ | Full info, registration/purchase button |
| Blocking: deadline passed | ✅ | Button disabled + warning |
| Blocking: registration limit / stock exhausted | ✅ | Button disabled + warning |
| Normal event registration with custom form | ✅ | Dynamic form rendered from event schema |
| Merchandise purchase with size/color/variant picker | ✅ | Stock decremented on purchase |
| Ticket with unique ID and QR code | ✅ | `FEL-xxx` ID, PNG QR base64 |
| Ticket confirmation email | ✅ | Nodemailer, non-blocking |
| Ticket accessible in Participation History | ✅ | Clickable ticket ID → TicketView page |
| Participant Profile — editable fields | ✅ | Name, contact, college, interests, followed clubs |
| Participant Profile — non-editable fields | ✅ | Email, participantType |
| Participant Profile — password change | ✅ | Requires current password |
| Clubs/Organizers listing page | ✅ | All organizers with follow/unfollow |
| Organizer Detail page | ✅ | Info + upcoming/past event tabs |

### 5.5 Organizer Features ✅ [18 Marks]

| Feature | Status | Notes |
|---------|--------|-------|
| Navigation (Dashboard, Create Event, Profile, Logout) | ✅ | Role-aware Navbar |
| Events carousel / grid with status filter | ✅ | All 5 statuses: Draft/Published/Ongoing/Completed/Closed |
| Event Analytics (completed events) | ✅ | Registrations, attendance, attendance %, revenue |
| Event Detail — Overview tab | ✅ | Name, type, status, fees, dates, eligibility, reg count |
| Event Detail — Participants tab | ✅ | Searchable + paginated table |
| Event Detail — Attendance marking | ✅ | Toggle per participant |
| Event Detail — Export CSV | ✅ | `json2csv`, streams as `text/csv` |
| Event Detail — Analytics tab | ✅ | Available once Completed |
| Event Creation — Draft → Publish flow | ✅ | 3-step multi-page form |
| Event Creation — Form Builder (Normal) | ✅ | Add/remove/reorder fields, mark required/optional |
| Event Creation — Item Details (Merchandise) | ✅ | sizes, colors, variants, stock, purchaseLimit |
| Form locked after first registration | ✅ | `customForm.locked = true` on first registration |
| Editing rules per status | ✅ | Draft: full edit; Published: desc/deadline/limit; Ongoing+: status only |
| Organizer Profile — editable fields | ✅ | Name, category, description, contact email/number |
| Organizer Profile — Discord webhook | ✅ | Fires on event publish via axios POST |
| Password change | ✅ | Via auth endpoint |

### 5.6 Admin Features ✅ [6 Marks]

| Feature | Status | Notes |
|---------|--------|-------|
| Navigation (Dashboard, Manage Organizers, All Events, All Users, Logout) | ✅ | Role-aware Navbar |
| Dashboard stats | ✅ | Total participants, organizers, events, registrations |
| Create organizer account | ✅ | Modal form, immediate login enabled |
| View all organizers | ✅ | Searchable table |
| Delete organizer | ✅ | Confirmation modal, permanent delete |
| Reset organizer password | ✅ | Admin sets new password via modal |
| View all events | ✅ | Searchable, shows organizer name + status |
| View all users | ✅ | Role-filterable user list |

---

## 6. Part 2: Advanced Features

> **⚠️ Part 2 (Advanced Features) has not been implemented yet.** The core system (Part 1) is fully implemented and tested. Part 2 advanced features are the next development phase.

### Recommended Feature Selections

Based on implementation complexity, assessment marks value, and code reuse with the existing codebase:

#### Tier A — Choose 2 (16 marks total)
| Feature | Marks | Recommendation | Reason |
|---------|-------|---------------|--------|
| QR Scanner & Attendance Tracking | 8 | ✅ **Recommended** | The QR code infrastructure (generation, storage) is already built. Only the scanner UI (`html5-qrcode` lib) and duplicate-scan rejection logic need to be added. High marks, low added complexity. |
| Merchandise Payment Approval Workflow | 8 | ✅ **Recommended** | Multer (file uploads) is already installed. Registration and Merchandise models need a `paymentStatus` field and `paymentProof` URL. Adds organizer approval tab and participant payment upload UI. |
| Hackathon Team Registration | 8 | Not recommended | Requires a completely new Team model, invite code system, multi-user registration logic, and team dashboard — largest implementation scope. |

#### Tier B — Choose 2 (12 marks total)
| Feature | Marks | Recommendation | Reason |
|---------|-------|---------------|--------|
| Organizer Password Reset Workflow | 6 | ✅ **Recommended** | Pure CRUD — a `PasswordResetRequest` model, admin approval view, and auto-generated password. No new dependencies needed. |
| Real-Time Discussion Forum | 6 | ✅ **Recommended** | Requires `socket.io` on both ends. Event Details page already exists; adding a chat panel below the event info is straightforward. |
| Team Chat | 6 | Not recommended | Depends on Tier A Feature 1 (Team Registration) which is the most complex feature. |

#### Tier C — Choose 1 (2 marks)
| Feature | Marks | Recommendation | Reason |
|---------|-------|---------------|--------|
| Add to Calendar Integration | 2 | ✅ **Recommended** | No backend changes. Generate `.ics` file from event dates client-side using `ics` npm package. Google Calendar URL is a simple query string. Single afternoon of work. |
| Anonymous Feedback System | 2 | Alt option | Needs a new Feedback model, rating UI, and organizer view. More code but straightforward. |
| Bot Protection | 2 | Not recommended | Requires a Google reCAPTCHA account + API key coordination, and adds friction to the registration UX. |

---

## 7. Folder Structure

```
<roll_no>/
├── backend/
│   ├── config/
│   │   └── db.js                  # Mongoose connection
│   ├── controllers/
│   │   ├── adminController.js
│   │   ├── authController.js
│   │   ├── eventController.js
│   │   ├── organizerController.js
│   │   ├── participantController.js
│   │   └── registrationController.js
│   ├── middleware/
│   │   └── auth.js                # protect + authorize middleware
│   ├── models/
│   │   ├── Event.js
│   │   ├── Registration.js
│   │   └── User.js
│   ├── routes/
│   │   ├── admin.js
│   │   ├── auth.js
│   │   ├── events.js
│   │   ├── organizer.js
│   │   ├── participant.js
│   │   └── registrations.js
│   ├── utils/
│   │   ├── email.js               # Nodemailer helper
│   │   └── seedAdmin.js           # Auto-provisions Admin on startup
│   ├── .env                       # Environment variables (not committed)
│   ├── .gitignore
│   ├── package.json
│   └── server.js                  # Express app entry point
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   ├── AllEvents.jsx
│   │   │   │   ├── AllUsers.jsx
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   └── ManageOrganizers.jsx
│   │   │   ├── auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── Onboarding.jsx
│   │   │   │   └── Register.jsx
│   │   │   ├── common/
│   │   │   │   ├── EventCard.jsx
│   │   │   │   ├── LoadingSpinner.jsx
│   │   │   │   ├── Navbar.jsx
│   │   │   │   ├── ProtectedRoute.jsx
│   │   │   │   └── StatusBadge.jsx
│   │   │   ├── organizer/
│   │   │   │   ├── CreateEvent.jsx
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── EventManagement.jsx
│   │   │   │   └── Profile.jsx
│   │   │   └── participant/
│   │   │       ├── BrowseEvents.jsx
│   │   │       ├── Dashboard.jsx
│   │   │       ├── EventDetails.jsx
│   │   │       ├── OrganizerDetail.jsx
│   │   │       ├── OrganizersList.jsx
│   │   │       ├── Profile.jsx
│   │   │       └── TicketView.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Global auth state + login/logout
│   │   ├── services/
│   │   │   └── api.js             # Axios instance + all API namespaces
│   │   ├── App.jsx                # Route tree
│   │   ├── index.css              # Tailwind import
│   │   └── main.jsx               # ReactDOM root, providers
│   ├── .env
│   ├── package.json
│   └── vite.config.js
│
├── README.md                      ← this file
└── deployment.txt                 ← fill in after deploying
```

---

## 8. Data Models

### User Schema
```
role: 'Participant' | 'Organizer' | 'Admin'
email, password (hashed)

// Participant-specific
firstName, lastName, participantType ('IIIT'|'Non-IIIT')
college, contactNumber, interests[], followedOrganizers[]
onboardingDone, rollNumber

// Organizer-specific
organizerName, category, description
contactEmail, contactNumber, discordWebhook
```

### Event Schema
```
eventName, eventDescription, eventType ('Normal'|'Merchandise')
eligibility ('All'|'IIIT Only')
registrationDeadline, eventStartDate, eventEndDate
registrationLimit, currentRegistrations, registrationFee
organizer (ref: User), eventTags[]
status: 'Draft' | 'Published' | 'Ongoing' | 'Completed' | 'Closed'

// Normal-specific
customForm: { fields[], locked: Boolean }
  field: { label, type, options[], required, order }

// Merchandise-specific
itemDetails: { sizes[], colors[], variants[], stock, purchaseLimit }
```

### Registration Schema
```
participant (ref: User), event (ref: Event)
ticketId (auto: FEL-{base36ts}-{rand4})
qrCode (base64 PNG DataURL)
status: 'Registered' | 'Cancelled'
formResponses: [{ label, value }]
merchandiseDetails: { size, color, variant, quantity }
attended, attendanceTimestamp
```

---

## 9. API Reference

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/api/auth/register` | No | — | Register participant |
| POST | `/api/auth/login` | No | — | Login (all roles) |
| GET | `/api/auth/me` | Yes | Any | Get current user |
| PUT | `/api/auth/change-password` | Yes | Any | Change password |
| GET | `/api/events` | Yes | Any | Browse/search events |
| GET | `/api/events/trending` | Yes | Any | Top 5 in last 24h |
| GET | `/api/events/:id` | Yes | Any | Event detail |
| POST | `/api/events` | Yes | Organizer | Create event |
| PUT | `/api/events/:id` | Yes | Organizer | Update event |
| PUT | `/api/events/:id/publish` | Yes | Organizer | Publish event |
| PUT | `/api/events/:id/custom-form` | Yes | Organizer | Update form fields |
| DELETE | `/api/events/:id` | Yes | Organizer | Delete draft |
| POST | `/api/registrations/:eventId` | Yes | Participant | Register for event |
| GET | `/api/registrations/my` | Yes | Participant | My registrations |
| GET | `/api/registrations/:id` | Yes | Participant | Single registration |
| DELETE | `/api/registrations/:id` | Yes | Participant | Cancel registration |
| GET | `/api/participant/dashboard` | Yes | Participant | Upcoming + history |
| PUT | `/api/participant/profile` | Yes | Participant | Update profile |
| PUT | `/api/participant/onboarding` | Yes | Participant | Set interests |
| GET | `/api/participant/organizers` | Yes | Participant | List all organizers |
| GET | `/api/participant/organizers/:id` | Yes | Participant | Organizer detail |
| POST | `/api/participant/follow/:id` | Yes | Participant | Follow/unfollow toggle |
| GET | `/api/organizer/dashboard` | Yes | Organizer | Dashboard + analytics |
| GET | `/api/organizer/profile` | Yes | Organizer | Get profile |
| PUT | `/api/organizer/profile` | Yes | Organizer | Update profile |
| GET | `/api/organizer/events/:id/participants` | Yes | Organizer | Participant list |
| GET | `/api/organizer/events/:id/participants/export` | Yes | Organizer | CSV export |
| PUT | `/api/organizer/events/:id/attendance/:rid` | Yes | Organizer | Mark attendance |
| GET | `/api/admin/dashboard` | Yes | Admin | Platform stats |
| GET | `/api/admin/organizers` | Yes | Admin | List organizers |
| POST | `/api/admin/organizers` | Yes | Admin | Create organizer |
| DELETE | `/api/admin/organizers/:id` | Yes | Admin | Delete organizer |
| PUT | `/api/admin/organizers/:id/reset-password` | Yes | Admin | Reset password |
| GET | `/api/admin/users` | Yes | Admin | List all users |
| GET | `/api/admin/events` | Yes | Admin | List all events |

---

## 10. Setup & Installation (Local)

See [SETUP_AND_DEPLOYMENT.md](SETUP_AND_DEPLOYMENT.md) for the full guide.

**Quick start:**
```bash
# 1. Start MongoDB
sudo systemctl start mongod

# 2. Backend
cd backend && npm install && npm run dev

# 3. Frontend (new terminal)
cd frontend && npm install && npm run dev
```

Open http://localhost:5173 — login as Admin: `admin@felicity.com` / `Admin@123456`

---

## 11. Deployment

| Layer | Platform | URL |
|-------|----------|-----|
| Frontend | Vercel | `<fill after deploying>` |
| Backend | Render | `<fill after deploying>` |
| Database | MongoDB Atlas | `<your cluster>` |

See [SETUP_AND_DEPLOYMENT.md](SETUP_AND_DEPLOYMENT.md) § Deployment for step-by-step instructions.
