
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProofRequestPage } from './pages/ProofRequestPage';
import QRCodePage from './pages/QRCodePage';
import VerificationPage from './pages/VerificationPage';
import VerificationResultsPage from './pages/VerificationResultsPage';
import SettingsPage from './pages/SettingsPage';
import TestPage from './pages/TestPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<ProofRequestPage />} />
          <Route path="/qr/:proofRequestId" element={<QRCodePage />} />
          <Route path="/verify/:proofRequestId" element={<VerificationPage />} />
          <Route path="/test/:proofRequestId" element={<TestPage />} />
          <Route path="/results" element={<VerificationResultsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;