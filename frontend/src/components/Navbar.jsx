import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';

const navLinks = [
  { path: '/register', label: 'Register' },
  { path: '/verify', label: 'Verify' },
  { path: '/registry', label: 'Fraud Registry' },
  { path: '/identity', label: 'My Identity' },
  { path: '/zk-demo', label: 'ZK Demo' }
];

export default function Navbar() {
  const location = useLocation();
  const { address, isConnected, isCorrectNetwork, connectWallet, switchToSepolia, loading } = useWallet();

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <nav className="sticky top-0 z-50 bg-gray-950 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span className="text-xl font-bold text-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              Voice<span className="text-blue-500">Vault</span>
            </span>
          </Link>

          {/* Center Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === path
                    ? 'text-white bg-gray-800'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Wallet Button */}
          <div>
            {!isConnected ? (
              <button
                onClick={connectWallet}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                )}
                Connect Wallet
              </button>
            ) : !isCorrectNetwork ? (
              <button
                onClick={switchToSepolia}
                disabled={loading}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Wrong Network
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="text-sm text-white font-mono">{formatAddress(address)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden pb-3 flex flex-wrap gap-2">
          {navLinks.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                location.pathname === path
                  ? 'text-white bg-gray-800'
                  : 'text-gray-400 hover:text-white bg-gray-800/50'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
