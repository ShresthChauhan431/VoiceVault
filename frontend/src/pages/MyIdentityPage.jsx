import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { getProvider, getSigner, getVoiceVaultContract } from '../utils/contracts';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4 py-4">
      <div className="h-6 bg-gray-700 rounded w-1/3 mx-auto" />
      <div className="h-12 bg-gray-700 rounded w-2/3 mx-auto" />
      <div className="h-16 bg-gray-700 rounded w-full" />
      <div className="h-16 bg-gray-700 rounded w-full" />
    </div>
  );
}

function Spinner({ className = 'h-6 w-6' }) {
  return (
    <svg className={`animate-spin ${className} text-blue-500`} viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function ConfirmModal({ isOpen, onClose, onConfirm, loading }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full">
        <h3 className="text-xl font-semibold text-white mb-4">Revoke Voice ID?</h3>
        <p className="text-gray-400 mb-6">
          This action is irreversible. Your Voice ID will be permanently deleted and your SBT will be burned. 
          You will need to register again to get a new Voice ID.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white rounded-lg px-4 py-3 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg px-4 py-3 flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Spinner className="h-5 w-5" />
                Revoking...
              </>
            ) : (
              'Yes, Revoke'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyIdentityPage() {
  const { address, isConnected, isCorrectNetwork, connectWallet } = useWallet();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revoked, setRevoked] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!isConnected || !address) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const provider = getProvider();
      const contract = getVoiceVaultContract(provider);
      
      // getVoiceProfile returns: (helperString, commitment, salt, registeredAt, isActive)
      const profileData = await contract.getVoiceProfile(address);
      const [, , , registeredAt, isActive] = profileData;

      if (isActive) {
        setProfile({
          isActive: isActive,
          registeredAt: new Date(Number(registeredAt) * 1000)
        });
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [isConnected, address]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleRevoke = async () => {
    setRevoking(true);

    try {
      const signer = await getSigner();
      const contract = getVoiceVaultContract(signer);
      const tx = await contract.revokeVoice();
      await tx.wait(1);

      setRevoked(true);
      setShowConfirm(false);
      setProfile(null);
    } catch (err) {
      if (err.code !== 4001 && err.code !== 'ACTION_REJECTED') {
        setError(err.message || 'Failed to revoke Voice ID');
      }
    } finally {
      setRevoking(false);
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white py-12 px-4">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">My Identity</h1>

        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
          {!isConnected ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">Connect your wallet to view your Voice ID.</p>
              <button
                onClick={connectWallet}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-3 transition-colors"
              >
                Connect Wallet
              </button>
            </div>
          ) : !isCorrectNetwork ? (
            <div className="text-center py-8">
              <p className="text-yellow-400">Please switch to Sepolia network.</p>
            </div>
          ) : loading ? (
            <LoadingSkeleton />
          ) : revoked ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-300 mb-2">Voice ID Revoked</h2>
              <p className="text-gray-400 mb-6">Your SBT has been burned.</p>
              <Link
                to="/register"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-3 transition-colors"
              >
                Register New Voice ID
              </Link>
            </div>
          ) : profile ? (
            <div>
              {/* Wallet Address */}
              <div className="text-center mb-6">
                <p className="text-sm text-gray-400 mb-1">Connected Wallet</p>
                <p className="text-lg font-mono text-white">{formatAddress(address)}</p>
              </div>

              {/* Active Badge */}
              <div className="flex justify-center mb-6">
                <span className="px-4 py-2 rounded-full bg-green-900/50 text-green-400 border border-green-600 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Voice ID Active
                </span>
              </div>

              {/* Registration Date */}
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-400">Registered on</p>
                <p className="text-white">{profile.registeredAt.toLocaleDateString()} at {profile.registeredAt.toLocaleTimeString()}</p>
              </div>

              {/* SBT Info */}
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <p className="text-gray-300 text-sm">
                  Your SBT token is bound to this wallet and cannot be transferred.
                </p>
              </div>

              {/* Etherscan Link */}
              {CONTRACT_ADDRESS && (
                <a
                  href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-gray-800 rounded-lg p-4 mb-6 hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">View Contract on Etherscan</span>
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                </a>
              )}

              {/* Danger Zone */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-red-400 font-medium mb-3">Danger Zone</h3>
                <button
                  onClick={() => setShowConfirm(true)}
                  className="w-full border border-red-600 text-red-400 hover:bg-red-600 hover:text-white rounded-lg px-6 py-3 transition-colors"
                >
                  Revoke My Voice ID
                </button>
              </div>

              {error && (
                <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 mt-4">
                  <p className="text-red-400">{error}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-300 mb-2">No Voice ID Found</h2>
              <p className="text-gray-400 mb-6">This wallet has not registered a Voice ID.</p>
              <Link
                to="/register"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-3 transition-colors"
              >
                Register Your Voice
              </Link>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleRevoke}
        loading={revoking}
      />
    </div>
  );
}
