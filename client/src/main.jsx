import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Display from './pages/Display.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/display" element={<Display />} />
        <Route path="/display/:displayId" element={<Display />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
