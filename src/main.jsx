// src/main.jsx
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CountryProvider } from './context/CountryContext'
import './index.css'
import App from './App'

// StrictMode removed — causes double useEffect in dev which breaks auth init
createRoot(document.getElementById('root')).render(
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <AuthProvider>
      <CountryProvider>
        <App />
      </CountryProvider>
    </AuthProvider>
  </BrowserRouter>
)
