import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Display from './pages/Display.jsx'
import Audience from './pages/Audience.jsx'
import AVTech from './pages/AVTech.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/display" element={<Display />} />
        <Route path="/display/:displayId" element={<Display />} />
        <Route path="/audience" element={<Audience />} />
        <Route path="/audience/:eventId" element={<Audience />} />
        <Route path="/avtech" element={<AVTech />} />
        <Route path="/avtech/:eventId" element={<AVTech />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
