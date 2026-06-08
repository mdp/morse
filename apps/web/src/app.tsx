import { Navigate, Route, Routes } from 'react-router-dom';
import { SiteHeader } from './components/site-nav';
import BeatTheBotPage from './pages/beat-the-bot-page';
import DecodePage from './pages/decode-page';
import FaqPage from './pages/faq-page';
import LandingPage from './pages/landing-page';

export default function App() {
  return (
    <>
      <SiteHeader />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/decode" element={<DecodePage />} />
        <Route path="/beat" element={<Navigate to="/beat-the-bot" replace />} />
        <Route path="/beat-the-bot" element={<BeatTheBotPage />} />
        <Route path="/faq" element={<FaqPage />} />
      </Routes>
    </>
  );
}
