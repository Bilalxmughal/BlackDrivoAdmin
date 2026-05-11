# BlackDrivo Admin Portal

Premium Black Taxi Fleet Management System — React + Firebase + Leaflet

---

## 📁 Project Structure

```
BlackDrivoAdmin/
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/                    # Images, logos
│   │
│   ├── context/
│   │   └── AuthContext.jsx        # Global auth state (Firebase onAuthStateChanged)
│   │
│   ├── firebase/
│   │   ├── config.js              # Firebase init (reads from .env)
│   │   ├── auth.js                # Login, logout, reset, activity logging
│   │   └── firestore.js           # Shared Firestore helpers (added Phase 2+)
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.jsx      # Main wrapper (Sidebar + TopBar + Outlet)
│   │   │   ├── Sidebar.jsx        # Collapsible left nav (Phase 2)
│   │   │   └── TopBar.jsx         # Top header with date/search/user (Phase 2)
│   │   └── shared/
│   │       ├── ProtectedRoute.jsx # Auth guard
│   │       ├── Modal.jsx          # Reusable popup modal
│   │       ├── Table.jsx          # Reusable sortable table
│   │       └── Badge.jsx          # Status badges (Active/Pending/Completed)
│   │
│   ├── hooks/
│   │   ├── useFirestore.js        # CRUD hooks for Firestore collections
│   │   └── usePermissions.js      # Role-based access checker
│   │
│   ├── utils/
│   │   ├── formatters.js          # Date, currency, phone formatters
│   │   └── constants.js           # App-wide constants (cities, roles, etc.)
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── Login.jsx          # Login page
│   │   │   ├── Login.module.css   # ← same Auth.module.css shared
│   │   │   ├── ForgotPassword.jsx # Send reset email
│   │   │   └── SetPassword.jsx    # Confirm new password (oobCode from URL)
│   │   │
│   │   ├── dashboard/
│   │   │   ├── Dashboard.jsx      # Main stats, trips, income tracker
│   │   │   └── Dashboard.module.css
│   │   │
│   │   ├── bookings/
│   │   │   ├── Orders.jsx         # All bookings table with filters
│   │   │   ├── Orders.module.css
│   │   │   ├── OrderDetail.jsx    # Single booking detail page
│   │   │   └── DispatchMap.jsx    # Live map — all active fleet
│   │   │
│   │   ├── clients/
│   │   │   ├── Passengers.jsx     # Passenger list + filters
│   │   │   ├── Passengers.module.css
│   │   │   ├── PassengerDetail.jsx
│   │   │   └── forms/
│   │   │       ├── AddPassengerForm.jsx
│   │   │       └── AddPassengerForm.module.css
│   │   │
│   │   ├── fleet/
│   │   │   ├── Cars.jsx
│   │   │   ├── Cars.module.css
│   │   │   ├── CarDetail.jsx
│   │   │   ├── Drivers.jsx
│   │   │   ├── Drivers.module.css
│   │   │   ├── DriverDetail.jsx
│   │   │   └── forms/
│   │   │       ├── AddCarForm.jsx
│   │   │       ├── AddCarForm.module.css
│   │   │       ├── AddDriverForm.jsx
│   │   │       └── AddDriverForm.module.css
│   │   │
│   │   ├── app-settings/
│   │   │   ├── UserAppComms.jsx   # Send in-app notification to passengers
│   │   │   └── DriverAppComms.jsx # Send in-app notification to drivers
│   │   │
│   │   ├── admin-settings/
│   │   │   └── RolesPermissions.jsx  # Role CRUD + page-level access control
│   │   │
│   │   ├── user-management/
│   │   │   ├── Users.jsx
│   │   │   └── forms/
│   │   │       ├── AddUserForm.jsx
│   │   │       └── AddUserForm.module.css
│   │   │
│   │   ├── activity-log/
│   │   │   └── ActivityLog.jsx    # Full audit trail + comment system
│   │   │
│   │   └── profile/
│   │       ├── Profile.jsx        # Edit info, reset password, login history
│   │       └── Profile.module.css
│   │
│   ├── App.jsx                    # Router with all routes
│   ├── main.jsx                   # Entry point
│   └── index.css                  # Global CSS variables + reset
│
├── .env                           # Firebase keys (NOT committed)
├── .env.example                   # Template for .env
├── .gitignore
├── vercel.json                    # SPA redirect for Vercel
├── vite.config.js
├── package.json
└── README.md
```

---

## 🚀 Installation

### Step 1 — Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/BlackDrivoAdmin.git
cd BlackDrivoAdmin
npm install
```

### Step 2 — Firebase Setup
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add Project** → Name it `blackdrivo-admin`
3. Go to **Project Settings → General → Your Apps → Web App**
4. Register app, copy config values

### Step 3 — Create .env file
```bash
cp .env.example .env
```
Fill in your Firebase values in `.env`

### Step 4 — Firebase Services to Enable
In Firebase Console:
- **Authentication** → Sign-in methods → Enable **Email/Password**
- **Firestore Database** → Create database → Start in **test mode** (secure rules later)
- **Storage** → Get started

### Step 5 — Run Locally
```bash
npm run dev
```
Open: http://localhost:5173

---

## ☁️ Deploy to Vercel

### Step 1
```bash
npm install -g vercel
vercel login
```

### Step 2
```bash
vercel
```
Follow prompts:
- Framework: **Vite**
- Build command: `npm run build`
- Output dir: `dist`

### Step 3 — Add Environment Variables in Vercel
Go to your Vercel project → **Settings → Environment Variables**
Add all 6 `VITE_FIREBASE_*` variables from your `.env`

### Step 4 — Redeploy
```bash
vercel --prod
```

---

## 🔐 Roles & Access

| Role       | Access Level |
|------------|-------------|
| Super Admin | Full access to all pages |
| Admin       | All except Roles Settings |
| Ops         | Bookings, Fleet, Dispatch |
| Dispatcher  | Bookings + Dispatch Map only |
| Finance     | Dashboard + Reports only |

---

## 🎨 Theme

| Token | Value |
|-------|-------|
| Background | `#F2F2F0` |
| Card | `#FFFFFF` |
| Accent | `#E8533A` |
| Green | `#3DB87A` |
| Font Display | Syne |
| Font Body | DM Sans |

---

## 📦 Tech Stack

| Tech | Purpose |
|------|---------|
| React 18 + Vite | Frontend framework |
| React Router v6 | Routing |
| Firebase Auth | Authentication |
| Firestore | Database |
| Firebase Storage | Document/image uploads |
| Leaflet + React-Leaflet | Free map (no API key) |
| Recharts | Charts & graphs |
| React Hot Toast | Notifications |
| Lucide React | Icons |
| CSS Modules | Scoped styles |
