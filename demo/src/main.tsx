import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <div className="max-w-[900px] mx-auto px-5 pt-6 pb-20">
        <App />
      </div>
    </BrowserRouter>
  </StrictMode>,
)
