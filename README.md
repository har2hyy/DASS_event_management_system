# Felicity 2026 — Event Management System

## Table of Contents

1. [Libraries, Frameworks & Modules](#1-libraries-frameworks--modules)
2. [Advanced Features Implemented](#2-advanced-features-implemented)
3. [Setup and Installation Instructions](#3-setup-and-installation-instructions)

---

## 1. Libraries, Frameworks & Modules

### Backend

| Library | Version | Justification |
|---------|---------|---------------|
| **Express** | 5.2.1 | Minimal, unopinionated Node.js web framework. Chosen for its mature routing, middleware ecosystem, and widespread community support. Handles all REST API endpoints. |
| **Mongoose** | 9.2.1 | MongoDB ODM that provides schema validation, middleware hooks, and query building. Enforces data integrity at the application layer (required fields, enums, refs) without needing a relational database. |
| **bcrypt** | 6.0.0 | Industry-standard password hashing using the Blowfish cipher with per-hash salts. Prevents rainbow-table attacks and provides configurable work factor for future-proofing. |
| **jsonwebtoken** | 9.0.3 | Stateless JWT-based authentication. Eliminates server-side session storage, enabling horizontal scaling. Tokens carry role claims for authorization middleware. |
| **cors** | 2.8.6 | Configures Cross-Origin Resource Sharing headers. Required because the frontend (Vite on port 5173) and backend (Express on port 5000) run on different origins during development and different domains in production. |
| **dotenv** | 17.3.1 | Loads environment variables from `.env` files. Keeps secrets (DB URI, JWT secret, SMTP credentials) out of source code. |
| **nodemailer** | 8.0.1 | Sends transactional emails (registration confirmation with QR code, ticket emails). Supports SMTP transport with Gmail App Passwords. Gracefully skips if credentials are not configured. |
| **qrcode** | 1.5.4 | Generates QR code images (as base64 Data URLs) from ticket IDs. Used for attendance scanning — each registration gets a unique QR embedded in the confirmation email and viewable on the ticket page. |
| **multer** | 2.0.2 | Multipart form-data middleware for handling file uploads. Used for payment proof image uploads in merchandise events. |
| **json2csv** | 6.0.0-alpha.2 | Converts JSON arrays to CSV format. Powers the "Export Attendance CSV" feature for organizers to download participant lists and attendance records. |
| **express-validator** | 7.3.1 | Request validation middleware. Validates and sanitizes incoming request data (emails, passwords, required fields) before it reaches controllers. |
| **axios** | 1.13.5 | HTTP client used server-side for potential external API calls (e.g., Discord webhook notifications). Consistent API with the frontend's HTTP client. |

### Frontend

| Library | Version | Justification |
|---------|---------|---------------|
| **React** | 19.2.0 | Component-based UI library. Chosen for its virtual DOM, hooks API, and the largest ecosystem of tooling and community resources for building SPAs. |
| **React Router DOM** | 7.13.0 | Client-side routing for the SPA. Provides protected routes, nested layouts, and URL parameter handling for event/organizer detail pages. |
| **Vite** | 7.3.1 | Build tool and dev server. Chosen over CRA for near-instant HMR, native ES module support, and significantly faster builds. |
| **Tailwind CSS** | 4.2.0 | Utility-first CSS framework. Enables rapid UI development with consistent spacing, colors, and responsive breakpoints without writing custom CSS files. Eliminates class name conflicts. |
| **tw-animate-css** | 1.4.0 | Tailwind CSS plugin providing animation utility classes (pulse, fade, slide). Used for notification banners and loading states. |
| **shadcn/ui** | 3.8.5 | Headless, accessible component primitives built on Radix UI. Provides unstyled, WAI-ARIA compliant components (dialogs, dropdowns) that are styled with Tailwind, avoiding the opinionated styling of full component libraries. |
| **Radix UI** | 1.4.3 | Low-level accessible UI primitives. Foundation for shadcn components — handles focus management, keyboard navigation, and screen reader announcements. |
| **Lucide React** | 0.575.0 | Icon library with tree-shakeable SVG icons. Consistent, clean icon set that integrates with React components without loading unused icons. |
| **Axios** | 1.13.5 | HTTP client with interceptors for attaching JWT tokens to every request, centralized error handling, and request/response transformation. |
| **jsQR** | 1.4.0 | Pure JavaScript QR code decoder. Used as a fallback for browsers that don't support the native BarcodeDetector API, and for decoding QR codes from uploaded image files. |
| **class-variance-authority** | 0.7.1 | Utility for creating variant-based component styles. Used with shadcn to define component variants (primary/secondary buttons, size variants) in a type-safe way. |
| **clsx** / **tailwind-merge** | 2.1.1 / 3.5.0 | Conditional class name joining and Tailwind class deduplication. Prevents conflicting utility classes when merging component defaults with user overrides. |
| **Three.js** / **@react-three/fiber** | 0.167.1 / 9.5.0 | 3D rendering library and React renderer. Used for the animated 3D background on the landing/auth pages to enhance visual appeal. |

### Development Dependencies

| Tool | Version | Purpose |
|------|---------|---------|
| **ESLint** | 9.39.1 | JavaScript linter for code quality and consistency enforcement. |
| **@vitejs/plugin-react** | 5.1.1 | Vite plugin enabling React Fast Refresh for instant HMR during development. |
| **@tailwindcss/vite** | 4.2.0 | Vite integration plugin for Tailwind CSS — processes utility classes at build time. |

---

## 2. Advanced Features Implemented

### Tier A (2 features × 8 marks = 16 marks)

#### A1. QR Code-Based Scanner & Attendance Tracking [8 Marks]

**Feature Selection Justification:** Attendance tracking is central to event management — organizers need a fast, reliable way to verify participants at the door. QR scanning eliminates manual lookup and prevents ticket fraud.

**Design Choices & Implementation:**

- **QR Generation:** Each registration generates a unique ticket ID (`FEL-<timestamp>-<random>`) and a QR code encoding this ID using the `qrcode` library. The QR is embedded inline (as a CID attachment) in the confirmation email via `nodemailer`, and is viewable on the participant's ticket page.
- **Three Scanning Modes:**
  1. **Camera Scan** — Uses the native `BarcodeDetector` API (with `jsQR` as fallback) for real-time camera-based QR scanning.
  2. **Manual Entry** — Ticket ID text input for cases where QR is damaged or unreadable. Supports an override reason field for audit logging.
  3. **File Upload** — Upload a QR image file, decoded client-side using `jsQR` on a canvas element.
- **Attendance Dashboard:** Real-time stats (total registered, checked-in count, check-in rate), recent check-ins list with method badges (scan/manual) and timestamps, collapsible checked-in and not-yet-scanned participant lists.
- **Audit Trail:** Every attendance mark records `attendanceMethod` (scan/manual), `attendanceMarkedBy` (organizer ObjectId), and `overrideReason` for manual overrides.
- **CSV Export:** One-click export of attendance data to CSV using `json2csv`, including ticket ID, participant name, email, status, method, and timestamp.

**Technical Decisions:**
- Used SSE-independent REST endpoints for attendance (POST for mark, GET for stats) rather than WebSocket to keep the architecture simple and stateless.
- Client-side QR decoding (jsQR) avoids sending images to the server, reducing latency and bandwidth usage.
- BarcodeDetector API is preferred when available (native performance) with jsQR as a universal fallback.

---

#### A2. Merchandise Payment Approval Workflow [8 Marks]

**Feature Selection Justification:** Merchandise events require payment verification before order fulfillment. An approval workflow prevents unauthorized access and gives organizers control over order management.

**Design Choices & Implementation:**

- **Registration Flow:** Merchandise registrations start in `Pending` status (no ticket generated yet). Participants submit payment proof (base64 image) which is stored on the registration document.
- **Organizer Approval Dashboard:** Dedicated Payments tab with status filter tabs (Pending / Approved / Rejected / All). Each order shows merchandise details (size, color, variant, quantity), payment proof image, and action buttons.
- **Approval Actions:** Organizers can approve (generates ticket + QR + sends confirmation email, decrements stock) or reject (sets status to Rejected) individual orders.
- **Stock Management:** `itemDetails.stock` on the Event model tracks available inventory. Stock is checked on registration and decremented on approval.
- **Status Badges:** Visual indicators (yellow=Pending, green=Approved, red=Rejected) on each order card.

**Technical Decisions:**
- Payment proof stored as base64 string on the Registration document rather than file system storage, avoiding the need for a separate file hosting service and simplifying deployment.
- Ticket ID generation is deferred for Pending registrations via a pre-save hook condition, ensuring only approved orders receive valid tickets.

---

### Tier B (2 features × 6 marks = 12 marks)

#### B1. Real-Time Discussion Forum [6 Marks]

**Feature Selection Justification:** A real-time discussion forum enables participants to ask questions, share information, and interact around events, building community engagement without requiring external communication platforms.

**Design Choices & Implementation:**

- **Real-Time Messaging:** Server-Sent Events (SSE) via a fetch-based reader with JWT authentication headers. Supports `new_message`, `pin_toggle`, `delete_message`, and `reaction` event types.
- **Message Features:** Post messages (max 2000 chars), reply threading (parentMessage reference), pin/unpin messages (organizer/admin only), soft-delete messages, and emoji reactions (👍 ❤️ 😂 🎉 🔥 👎) with per-user tracking.
- **Moderation:** Organizers and admins can delete any message and pin/unpin announcements. Pinned messages are sorted to the top.
- **Notification System (3 layers):**
  1. **In-forum banner** — Pulsing "X new messages ↓" button when the user is scrolled up, with click-to-scroll-to-bottom.
  2. **Tab badge** — Red count badge on the Discussion tab header when new messages arrive while on another tab (forum stays mounted via CSS `hidden` class to keep SSE connected).
  3. **Browser title flash** — Document title alternates with "💬 New message" when the browser tab is unfocused, resetting on return.

**Technical Decisions:**
- Chose SSE over WebSocket/Socket.io because the forum is unidirectional (server → client for real-time updates, client → server via REST for sending). SSE is simpler, uses standard HTTP, and works through proxies without upgrade negotiation.
- Fetch-based SSE reader instead of native `EventSource` because `EventSource` does not support custom headers (needed for JWT auth).
- Forum component kept always-mounted (hidden via CSS) to maintain SSE connection and enable cross-tab notifications.

---

#### B2. Organizer Password Reset Workflow [6 Marks]

**Feature Selection Justification:** Organizer accounts are created by admins, so organizers cannot self-register. A password reset workflow with admin approval maintains security while providing a recovery mechanism.

**Design Choices & Implementation:**

- **Request Submission:** Organizers submit a password reset request with a reason (max 500 chars) from their profile page.
- **Admin Review Dashboard:** Dedicated admin page with filter tabs (All / Pending / Approved / Rejected). Each request shows organizer name, email, reason, timestamps, and admin comment.
- **Approval Actions:** Admin can approve (sets new password, which is hashed via the User model's pre-save hook) or reject (with optional comment). An auto-generate button creates a random 12-character secure password.
- **Data Model:** `PasswordResetRequest` model stores organizer reference, reason, status, adminComment, resolvedBy, and resolvedAt.

**Technical Decisions:**
- Password reset requires admin approval rather than email-based self-service because organizer accounts are admin-managed entities — this maintains the trust chain.
- The auto-generate password feature uses a character set that excludes ambiguous characters (0/O, 1/l/I) for readability when communicating the temporary password.

---

### Tier C (1 feature × 2 marks = 2 marks)

#### C1. Anonymous Feedback System [2 Marks]

**Feature Selection Justification:** Post-event feedback is essential for organizers to improve future events. Anonymity encourages honest, unbiased responses.

**Design Choices & Implementation:**

- **Anonymous by Design:** The Feedback model stores only `event`, `rating`, `comment`, and `timestamps` — no user/participant reference. The submitter's identity is verified server-side (must have `Attended` status) but never persisted.
- **Star Rating (1–5):** Interactive star picker with hover previews and descriptive labels (Poor / Fair / Good / Very Good / Excellent).
- **Aggregated Statistics:** Average rating (rounded to 1 decimal), total review count, and a distribution bar chart showing the count and percentage for each star level.
- **Filter by Rating:** Clickable star filter buttons (All / 5★ / 4★ / 3★ / 2★ / 1★) above the feedback list. The distribution bars in the stats chart are also clickable as filter shortcuts.

**Technical Decisions:**
- True anonymity at the data layer (no user ObjectId stored) rather than just hiding names in the UI. Even direct database access cannot trace feedback to a participant.
- Client-side filtering since all feedbacks are fetched in one request — avoids extra API round-trips when toggling between star filters.

---

## 3. Setup and Installation Instructions

### Prerequisites

| Tool | Version | Check Command |
|------|---------|---------------|
| Node.js | ≥ 18 | `node --version` |
| npm | ≥ 9 | `npm --version` |
| MongoDB | Local instance or Atlas URI | `mongod --version` |
| Git | Any | `git --version` |

### Step 1 — Start MongoDB

```bash
sudo systemctl start mongod
```

### Step 2 — Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```dotenv
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/felicity
JWT_SECRET=felicity_super_secret_key_change_in_production_2026
JWT_EXPIRE=7d
ADMIN_EMAIL=admin@felicity.com
ADMIN_PASSWORD=Admin@123456

# Email (optional — registration works without it, emails are skipped)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16_char_app_password
EMAIL_FROM=Felicity Events <your_gmail@gmail.com>
```

Start the backend:

```bash
npm run dev
```

Expected output:

```
🚀 Server running on port 5000
✅ MongoDB Connected: localhost
✅ Admin account seeded
```

### Step 3 — Frontend Setup

Open a second terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```dotenv
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Expected output:

```
VITE v7.x.x  ready in 200 ms
➜  Local:   http://localhost:5173/
```

### Step 4 — Access the Application

Open **http://localhost:5173** in a browser.

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Admin | admin@felicity.com | Admin@123456 | Auto-seeded on first run |
| Organizer | — | — | Created by Admin via Manage Organizers |
| Participant | — | — | Self-register at /register |
