# Setup, Running & Deployment Guide

**Felicity Event Management System**

---

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Running Locally](#2-running-locally)
3. [Environment Variables Reference](#3-environment-variables-reference)
4. [Test Accounts & Manual Testing](#4-test-accounts--manual-testing)
5. [Deploying to Production](#5-deploying-to-production)
   - [Step 1 — MongoDB Atlas](#step-1--mongodb-atlas)
   - [Step 2 — Deploy Backend to Render](#step-2--deploy-backend-to-render)
   - [Step 3 — Deploy Frontend to Vercel](#step-3--deploy-frontend-to-vercel)
   - [Step 4 — Wire everything together](#step-4--wire-everything-together)
   - [Step 5 — deployment.txt](#step-5--deploymenttxt)
6. [What To Do Next (Part 2 Advanced Features)](#6-what-to-do-next-part-2-advanced-features)
7. [Submission Checklist](#7-submission-checklist)

---

## 1. Prerequisites

| Tool | Version needed | Check |
|------|----------------|-------|
| Node.js | ≥ 18 | `node --version` |
| npm | ≥ 9 | `npm --version` |
| MongoDB | local OR Atlas URI | `mongod --version` or Atlas account |
| Git | any | `git --version` |

**Install Node.js** (if missing):
```bash
curl -fsSL https://fnm.vercel.app/install | bash
fnm install 20
```

**Install MongoDB locally** (Ubuntu / Linux Mint):
```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
  sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] \
  https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

sudo apt-get update && sudo apt-get install -y mongodb-org
sudo systemctl start mongod && sudo systemctl enable mongod
```

---

## 2. Running Locally

### Step 1 — Start MongoDB
```bash
sudo systemctl start mongod
# verify it's running
sudo systemctl status mongod | grep Active
```

### Step 2 — Backend
Open a terminal and run:
```bash
cd backend
npm install          # first time only
npm run dev          # starts nodemon on port 5000
```

Expected output:
```
🚀 Server running on port 5000
✅ MongoDB Connected: localhost
✅ Admin account seeded   (only on first run)
```

### Step 3 — Frontend
Open a **second terminal** and run:
```bash
cd frontend
npm install          # first time only
npm run dev          # starts Vite on port 5173
```

Expected output:
```
VITE v7.x.x  ready in 200 ms
➜  Local:   http://localhost:5173/
```

### Step 4 — Open the app
Go to **http://localhost:5173**

The root URL auto-redirects based on login state:
- Not logged in → `/login`
- Admin → `/admin/dashboard`
- Organizer → `/organizer/dashboard`
- Participant → `/participant/dashboard`

### Stopping the servers
- Press `Ctrl+C` in each terminal
- Optionally stop MongoDB: `sudo systemctl stop mongod`

---

## 3. Environment Variables Reference

### `backend/.env`

```dotenv
# ── Database ──────────────────────────────────────────────────
# Local MongoDB:
MONGODB_URI=mongodb://localhost:27017/felicity

# MongoDB Atlas (production):
# MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/felicity?retryWrites=true&w=majority

# ── JWT ───────────────────────────────────────────────────────
JWT_SECRET=felicity_super_secret_key_change_in_production_2026
JWT_EXPIRE=7d

# ── Admin seed account ────────────────────────────────────────
# Created automatically on first run if no Admin exists in DB
ADMIN_EMAIL=admin@felicity.com
ADMIN_PASSWORD=Admin@123456

# ── Email (Nodemailer via Gmail App Password) ─────────────────
# To enable: create an App Password at myaccount.google.com/apppasswords
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16_char_app_password
EMAIL_FROM=Felicity Events <your_gmail@gmail.com>

# ── Server ────────────────────────────────────────────────────
PORT=5000
NODE_ENV=development
```

> **Note:** Email is optional for local dev. If `EMAIL_USER`/`EMAIL_PASS` are not set, the backend skips sending the email but registration still succeeds.

### `frontend/.env`

```dotenv
# Points the frontend API client at the backend
# Local:
VITE_API_URL=http://localhost:5000/api

# Production (fill after deploying backend to Render):
# VITE_API_URL=https://your-app-name.onrender.com/api
```

---

## 4. Test Accounts & Manual Testing

After the first backend startup, these accounts are available:

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Admin | `admin@felicity.com` | `Admin@123456` | Auto-seeded |
| Organizer | — | — | Create via Admin → Manage Organizers |
| Participant | — | — | Self-register at `/register` |

### Recommended test flow (in order)

```
1. Login as Admin → Manage Organizers → Create organizer
   (e.g. email: techclub@college.com, password: Club@123)

2. Logout → Login as Organizer (techclub@college.com)
   → Create Event (Normal, fill all steps, Publish)

3. Logout → Register as Participant (/register)
   → Browse Events → find the event → Register
   → Check My Dashboard → click Ticket ID → view QR

4. Login back as Organizer → Dashboard → click Manage on the event
   → Participants tab → tick Attended → Export CSV

5. Login as Admin → Dashboard (stats should reflect new data)
```

### Testing via curl

```bash
# 1. Register participant
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@iiit.ac.in","password":"Alice@123","firstName":"Alice",
       "lastName":"Smith","participantType":"IIIT","college":"IIIT Hyderabad"}'

# 2. Login
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@felicity.com","password":"Admin@123456"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 3. Admin dashboard
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/admin/dashboard
```

---

## 5. Deploying to Production

Deployment is **required** by the assignment (5 marks). Follow these steps exactly.

---

### Step 1 — MongoDB Atlas

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and create a free account.
2. Create a new **Project** → **Build a Cluster** → choose **M0 Free Tier**.
3. Choose a region (e.g., AWS Mumbai for low latency).
4. Create a database user:
   - **Database Access** → **Add New Database User**
   - Username: `felicity_admin`, Password: generate a strong one, save it.
5. Whitelist all IPs (for Render to connect):
   - **Network Access** → **Add IP Address** → `0.0.0.0/0` (Allow from anywhere)
6. Get your connection string:
   - **Clusters** → **Connect** → **Connect your application**
   - Copy the URI, it looks like:
     ```
     mongodb+srv://felicity_admin:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
     ```
7. Replace `<password>` with your actual password, and add `/felicity` before `?`:
   ```
   mongodb+srv://felicity_admin:YOURPASS@cluster0.abcde.mongodb.net/felicity?retryWrites=true&w=majority
   ```
8. **Update `backend/.env`:**
   ```dotenv
   MONGODB_URI=mongodb+srv://felicity_admin:YOURPASS@cluster0.abcde.mongodb.net/felicity?retryWrites=true&w=majority
   ```

---

### Step 2 — Deploy Backend to Render

1. Push your project to a **GitHub repository**.
   ```bash
   cd /home/harshyy/Desktop/DASS/ass_1
   git init
   git add .
   git commit -m "Initial commit"
   # create a repo on github.com, then:
   git remote add origin https://github.com/YOUR_USERNAME/felicity.git
   git push -u origin main
   ```

2. Go to [render.com](https://render.com) → Sign up → **New Web Service**.

3. Connect your GitHub repo.

4. Configure the service:
   | Setting | Value |
   |---------|-------|
   | Name | `felicity-backend` |
   | Root Directory | `backend` |
   | Environment | `Node` |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Instance Type | Free |

5. Add **Environment Variables** in Render dashboard (same as `backend/.env`):
   - `MONGODB_URI` → your Atlas URI
   - `JWT_SECRET` → a long random string (generate: `openssl rand -base64 48`)
   - `JWT_EXPIRE` → `7d`
   - `ADMIN_EMAIL` → `admin@felicity.com`
   - `ADMIN_PASSWORD` → `Admin@123456`
   - `NODE_ENV` → `production`
   - `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` → your Gmail SMTP creds (optional)

6. Click **Create Web Service**. Wait for deploy (2–5 min).

7. Note your backend URL, e.g.: `https://felicity-backend.onrender.com`

8. Test it:
   ```bash
   curl https://felicity-backend.onrender.com/
   # should return: {"message":"Felicity API is running 🚀"}
   ```

> **⚠️ Free tier note:** Render free tier spins down after 15 min of inactivity. The first request after spin-down takes ~30 sec. This is acceptable for assignment evaluation.

---

### Step 3 — Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub.

2. Click **Add New Project** → Import your GitHub repo.

3. Configure:
   | Setting | Value |
   |---------|-------|
   | Framework Preset | Vite |
   | Root Directory | `frontend` |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |

4. Add **Environment Variable**:
   - `VITE_API_URL` → `https://felicity-backend.onrender.com/api`

5. Click **Deploy**. Wait 1–2 min.

6. Note your frontend URL, e.g.: `https://felicity-xxxx.vercel.app`

7. **Update `backend` CORS** to allow your Vercel domain. In `backend/server.js`:

   ```javascript
   // Replace the current app.use(cors()) line with:
   app.use(cors({
     origin: [
       'http://localhost:5173',
       'https://felicity-xxxx.vercel.app',   // ← your actual Vercel URL
     ],
     credentials: true,
   }));
   ```

   Commit and push — Render auto-deploys the update.

---

### Step 4 — Wire everything together

After both services are live, verify the full flow:

```bash
# Test backend health
curl https://felicity-backend.onrender.com/

# Test admin login on live backend
curl -X POST https://felicity-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@felicity.com","password":"Admin@123456"}'
```

Open your Vercel URL in a browser → login as Admin → everything should work identically to local.

---

### Step 5 — deployment.txt

Create this file at the project root before zipping for submission:

```
Frontend URL: https://felicity-xxxx.vercel.app
Backend URL:  https://felicity-backend.onrender.com
```

```bash
cat > /home/harshyy/Desktop/DASS/ass_1/deployment.txt << 'EOF'
Frontend URL: https://<YOUR-VERCEL-APP>.vercel.app
Backend URL:  https://<YOUR-RENDER-APP>.onrender.com
Database:     MongoDB Atlas (cloud.mongodb.com)
EOF
```

---

## 6. What To Do Next (Part 2 Advanced Features)

Part 2 requires **30 more marks** via tiered advanced features. Recommended picks (see README.md § 6 for full analysis):

### Tier A — QR Scanner & Attendance Tracking (8 marks)

**What to add:**
1. Install `html5-qrcode` in frontend: `npm install html5-qrcode`
2. Create `frontend/src/components/organizer/QRScanner.jsx` — uses device camera or image upload to decode QR
3. On scan, call `PUT /api/organizer/events/:eid/attendance/:rid` with the decoded ticketId
4. Reject if already attended (return 400 with "Already scanned")
5. Show live scanned vs. pending count

**Backend changes needed:**
- `organizerController.js` → `markAttendanceByTicket(ticketId)` — finds Registration by ticketId, checks `attended`, sets `attended: true + attendanceTimestamp`
- Add route: `POST /api/organizer/events/:id/scan`

---

### Tier A — Merchandise Payment Approval Workflow (8 marks)

**What to add:**

`multer` is already installed. Changes needed:

1. **Backend — Registration model:** Add `paymentStatus: 'Pending'|'Approved'|'Rejected'` and `paymentProof: String (URL)` fields
2. **Backend — registrationController.js:** On merchandise register, set `paymentStatus: 'Pending'`, don't generate QR yet
3. **Backend — new route:** `POST /api/registrations/:id/payment-proof` — accepts `multipart/form-data` image, saves file (or uploads to Cloudinary), sets `paymentProof` URL
4. **Backend — organizerController.js:** Add `getPaymentOrders(eventId)` and `approvePayment(registrationId)` / `rejectPayment(registrationId)`. On approval: decrement stock, generate QR, send email
5. **Frontend — Organizer EventManagement.jsx:** Add "Payment Approvals" tab showing orders with proof image, Approve/Reject buttons
6. **Frontend — Participant EventDetails.jsx:** After merchandise registration, show payment proof upload step

---

### Tier B — Organizer Password Reset Workflow (6 marks)

**What to add:**

1. **Backend — new model:** `PasswordResetRequest` `{ organizer (ref User), reason, status: 'Pending'|'Approved'|'Rejected', adminComment, createdAt }`
2. **Backend — new routes:**
   - `POST /api/organizer/password-reset-request` — organizer submits reason
   - `GET /api/admin/password-reset-requests` — admin views all
   - `PUT /api/admin/password-reset-requests/:id/approve` — generate new password, return to admin
   - `PUT /api/admin/password-reset-requests/:id/reject` — set rejected + comment
3. **Frontend — Organizer Profile.jsx:** Add "Request Password Reset" button with reason textarea
4. **Frontend — Admin:** New page `PasswordResetRequests.jsx` with table showing pending requests, approve/reject actions
5. **Frontend — Admin Navbar:** Add "Password Reset Requests" link

---

### Tier B — Real-Time Discussion Forum (6 marks)

**What to add:**

1. Install Socket.io:
   ```bash
   cd backend && npm install socket.io
   cd frontend && npm install socket.io-client
   ```
2. **Backend — new model:** `ForumMessage` `{ event, author (ref User), text, isPinned, isAnnouncement, reactions, replyTo, createdAt }`
3. **Backend — server.js:** Wrap Express with `http.createServer`, attach `socket.io`. On new message: broadcast to all in `event:${eventId}` room
4. **Backend — new routes:** `GET /api/events/:id/forum` (history), `DELETE /api/events/:id/forum/:msgId` (organizer only)
5. **Frontend — EventDetails.jsx:** Add forum panel below event info. Connect socket on mount, join event room, show message history, real-time append on `message` event

---

### Tier C — Add to Calendar Integration (2 marks)

**What to add (frontend only, ~2 hours):**

1. Install: `npm install ics`
2. In `TicketView.jsx`, add two buttons:
   - **"Add to Google Calendar"** — builds a URL:
     ```javascript
     const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
       `&text=${encodeURIComponent(event.eventName)}` +
       `&dates=${startFormatted}/${endFormatted}` +
       `&details=${encodeURIComponent(event.eventDescription)}`;
     window.open(gcalUrl);
     ```
   - **"Download .ics"** — uses `ics` package to generate an iCal file, triggers browser download
3. No backend changes needed.

---

## 7. Submission Checklist

Before zipping and submitting:

- [ ] All features in Part 1 working locally
- [ ] Part 2 advanced features implemented (see § 6)
- [ ] MongoDB URI updated to **Atlas** (not `localhost`)
- [ ] Backend deployed to **Render** — base URL confirmed working
- [ ] Frontend deployed to **Vercel** — production URL loads and works
- [ ] CORS in `server.js` updated with Vercel URL
- [ ] `deployment.txt` at root with both URLs filled in
- [ ] `README.md` updated with your roll number and actual deployed URLs
- [ ] ZIP structure matches: `<roll_no>/backend/`, `<roll_no>/frontend/`, `<roll_no>/README.md`, `<roll_no>/deployment.txt`
- [ ] `node_modules/` and `dist/` **not** in the ZIP (check `.gitignore`)

### Creating the ZIP

```bash
cd /home/harshyy/Desktop/DASS

# Replace 2022XXXX with your actual roll number
cp -r ass_1 2022XXXX
rm -rf 2022XXXX/backend/node_modules
rm -rf 2022XXXX/frontend/node_modules
rm -rf 2022XXXX/frontend/dist
zip -r 2022XXXX.zip 2022XXXX/
```

The resulting `2022XXXX.zip` is your submission file.
