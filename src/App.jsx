// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import ProtectedRoute from './components/shared/ProtectedRoute'
import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import SetPassword from './pages/auth/SetPassword'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/dashboard/Dashboard'
import Bookings from './pages/bookings/Bookings'
import BookingDetail from './pages/bookings/BookingDetail'
import NewBooking from './pages/bookings/NewBooking'
import DispatchMap from './pages/bookings/DispatchMap'
import Passengers from './pages/clients/Passengers'
import PassengerDetail from './pages/clients/PassengerDetail'
import Drivers from './pages/fleet/Drivers'
import Vehicles from './pages/fleet/Vehicles'
import Users from './pages/user-management/Users'
import RolesPermissions from './pages/admin-settings/RolesPermissions'
import ActivityLog from './pages/activity-log/ActivityLog'
import Profile from './pages/profile/Profile'
import AppSettings from './pages/app-settings/AppSettings'
import Countries      from './pages/countries/Countries'
import AppPassengers  from './pages/app-data/AppPassengers'
import Communications from './pages/communications/Communications'

// Stub placeholder — phases 3-7 mein replace hoga
const Stub = ({ name }) => (
  <div style={{ padding: 32, fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' }}>
    {name} — Coming in next phase
  </div>
)

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: 'var(--font-body)', fontSize: '14px',
            background: '#fff', color: '#111',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)', borderRadius: '10px',
          },
          success: { iconTheme: { primary: '#3DB87A', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#E8533A', secondary: '#fff' } },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/login"           element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/set-password"    element={<SetPassword />} />

        {/* Protected */}
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"    element={<Dashboard />} />
          <Route path="bookings"      element={<Bookings />} />
          <Route path="bookings/new"  element={<NewBooking />} />
          <Route path="bookings/:id"  element={<BookingDetail />} />
          <Route path="dispatch"     element={<DispatchMap />} />
          <Route path="drivers"      element={<Drivers />} />
          <Route path="drivers/:id"  element={<Stub name="Driver Detail" />} />
          <Route path="vehicles"     element={<Vehicles />} />
          <Route path="vehicles/:id" element={<Stub name="Vehicle Detail" />} />
          <Route path="passengers"   element={<Passengers />} />
          <Route path="passengers/:id" element={<PassengerDetail />} />
          <Route path="app-settings" element={<AppSettings />} />
          <Route path="countries" element={<Countries />} />
          <Route path="app-passengers" element={<AppPassengers />} />
          <Route path="communications" element={<Communications />} />
          <Route path="roles"        element={<RolesPermissions />} />
          <Route path="users"        element={<Users />} />
          <Route path="activity-log" element={<ActivityLog />} />
          <Route path="profile"      element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  )
}

export default App
