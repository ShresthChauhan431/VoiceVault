import { useState, useEffect, Component } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { healthCheck } from './utils/api';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import VerifyPage from './pages/VerifyPage';
import FraudRegistryPage from './pages/FraudRegistryPage';
import MyIdentityPage from './pages/MyIdentityPage';
import ZKDemoPage from './pages/ZKDemoPage';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
          <div className="bg-red-900/30 border border-red-600 rounded-xl p-8 max-w-md text-center">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
            <p className="text-gray-400 mb-4">Is the backend running on port 5000?</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-6 py-2 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function BackendBanner({ show }) {
  if (!show) return null;

  return (
    <div className="bg-yellow-900/80 border-b border-yellow-600 px-4 py-2 text-center">
      <p className="text-yellow-200 text-sm">
        <span className="font-medium">Backend not reachable.</span> Run: <code className="bg-yellow-800 px-2 py-0.5 rounded">cd backend && python app.py</code>
      </p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-950 border-t border-gray-800 py-6 px-4">
      <p className="text-center text-gray-500 text-sm">
        Built for Hackathon · React + Flask + Solidity · 100% Open Source
      </p>
    </footer>
  );
}

function Layout({ children, backendDown }) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <BackendBanner show={backendDown} />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function App() {
  const [backendDown, setBackendDown] = useState(false);

  useEffect(() => {
    const checkBackend = async () => {
      const result = await healthCheck();
      setBackendDown(!!result.error);
    };
    checkBackend();
  }, []);

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Layout backendDown={backendDown}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/registry" element={<FraudRegistryPage />} />
            <Route path="/identity" element={<MyIdentityPage />} />
            <Route path="/zk-demo" element={<ZKDemoPage />} />
          </Routes>
        </Layout>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
