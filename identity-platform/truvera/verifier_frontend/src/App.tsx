
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProofRequestPage } from './pages/ProofRequestPage';
import QRCodePage from './pages/QRCodePage';
import VerificationPage from './pages/VerificationPage';
import VerificationResultsPage from './pages/VerificationResultsPage';
import TestPage from './pages/TestPage';

function App() {
  return (
    <Router>
      <div className="App min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<ProofRequestPage />} />
          <Route path="/qr/:proofRequestId" element={<QRCodePage />} />
          <Route path="/verify/:proofRequestId" element={<VerificationPage />} />
          <Route path="/test/:proofRequestId" element={<TestPage />} />
          <Route path="/results" element={<VerificationResultsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;