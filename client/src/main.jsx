import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Landing from './pages/Landing.jsx'
import Display from './pages/Display.jsx'
import DisplayEmojis from './pages/DisplayEmojis.jsx'
import DisplayPolls from './pages/DisplayPolls.jsx'
import DisplayTimers from './pages/DisplayTimers.jsx'
import DisplayQA from './pages/DisplayQA.jsx'
import Audience from './pages/Audience.jsx'
import AVTech from './pages/AVTech.jsx'
import Producer from './pages/Producer.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import AuthCallback from './pages/AuthCallback.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AVTechPasswordGate from './components/AVTechPasswordGate.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/test" element={<App />} />
        {/* Authentication routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        {/* Mixed display (emojis + polls) */}
        <Route path="/display" element={<Display />} />
        <Route path="/display/:displayId" element={<Display />} />
        {/* Emoji-only display */}
        <Route path="/display-emojis" element={<DisplayEmojis />} />
        <Route path="/display-emojis/:displayId" element={<DisplayEmojis />} />
        {/* Poll-only display */}
        <Route path="/display-polls" element={<DisplayPolls />} />
        <Route path="/display-polls/:displayId" element={<DisplayPolls />} />
        {/* Timer-only display */}
        <Route path="/display-timers" element={<DisplayTimers />} />
        <Route path="/display-timers/:displayId" element={<DisplayTimers />} />
        {/* Q&A-only display */}
        <Route path="/display-qa" element={<DisplayQA />} />
        <Route path="/display-qa/:displayId" element={<DisplayQA />} />
        <Route path="/audience" element={<Audience />} />
        <Route path="/audience/:eventId" element={<Audience />} />
        {/* Protected routes requiring authentication */}
        <Route path="/avtech/:eventId" element={<AVTechPasswordGate />} />
        <Route path="/producer" element={<ProtectedRoute requiredRole="producer"><Producer /></ProtectedRoute>} />
        <Route path="/producer/:eventId" element={<ProtectedRoute requiredRole="producer"><Producer /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
