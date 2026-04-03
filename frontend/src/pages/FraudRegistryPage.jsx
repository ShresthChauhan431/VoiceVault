import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';
import { getProvider, getSigner, getVoiceVaultContract, getFraudRegistryContract } from '../utils/contracts';

function Spinner({ className = 'h-6 w-6' }) {
  return (
    <svg className={`animate-spin ${className} text-blue-500`} viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function RiskBadge({ reportCount }) {
  if (reportCount >= 3) {
    return (
      <span className="px-2 py-1 text-xs font-medium rounded bg-red-900/50 text-red-400 border border-red-600">
        HIGH RISK
      </span>
    );
  }
  if (reportCount >= 1) {
    return (
      <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-900/50 text-yellow-400 border border-yellow-600">
        FLAGGED
      </span>
    );
  }
  return null;
}

function formatAddress(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatDate(timestamp) {
  return new Date(Number(timestamp) * 1000).toLocaleDateString();
}

export default function FraudRegistryPage() {
  const { isConnected, isCorrectNetwork } = useWallet();

  const [flaggedAddresses, setFlaggedAddresses] = useState([]);
  const [expandedAddress, setExpandedAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [suspectAddress, setSuspectAddress] = useState('');
  const [evidence, setEvidence] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const loadRegistry = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const provider = getProvider();
      const voiceVault = getVoiceVaultContract(provider);
      const fraudRegistry = getFraudRegistryContract(provider);

      // Get flagged addresses from VoiceVault
      let addresses = [];
      try {
        addresses = await voiceVault.getFlaggedAddresses();
      } catch {
        // Contract might not have this function or no flagged addresses
        addresses = [];
      }

      // Get reports for each address
      const addressData = await Promise.all(
        addresses.map(async (addr) => {
          try {
            const reports = await fraudRegistry.getReportsBySuspect(addr);
            const lastReport = reports.length > 0 ? reports[reports.length - 1] : null;
            return {
              address: addr,
              reportCount: reports.length,
              lastReported: lastReport?.timestamp || 0,
              reports: reports.map(r => ({
                reporter: r.reporter,
                timestamp: r.timestamp,
                evidenceHash: r.evidenceHash,
                description: r.description
              }))
            };
          } catch {
            return {
              address: addr,
              reportCount: 0,
              lastReported: 0,
              reports: []
            };
          }
        })
      );

      setFlaggedAddresses(addressData);
    } catch (err) {
      setError(err.message || 'Failed to load fraud registry');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRegistry();
  }, [loadRegistry]);

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!suspectAddress || !evidence) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const signer = await getSigner();
      const voiceVault = getVoiceVaultContract(signer);
      const fraudRegistry = getFraudRegistryContract(signer);

      // Generate evidence hash
      const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes(evidence));

      // Submit to both contracts
      const tx1 = await fraudRegistry.submitReport(suspectAddress, evidenceHash, evidence);
      const tx2 = await voiceVault.reportFraud(suspectAddress, evidenceHash);

      await Promise.all([tx1.wait(1), tx2.wait(1)]);

      setSubmitSuccess({
        message: 'Report submitted on-chain.',
        txHash: tx1.hash
      });
      setSuspectAddress('');
      setEvidence('');
      loadRegistry();
    } catch (err) {
      if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
        setSubmitError('Transaction cancelled.');
      } else {
        setSubmitError(err.message || 'Failed to submit report');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2">Fraud Registry</h1>
        <p className="text-gray-400 text-center mb-8">On-chain record of flagged addresses</p>

        {/* Section A: Registry Feed */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Registry Feed</h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
              <span className="ml-3 text-gray-400">Loading registry...</span>
            </div>
          ) : error ? (
            <div className="bg-red-900/50 border border-red-600 rounded-lg p-4">
              <p className="text-red-400">{error}</p>
            </div>
          ) : flaggedAddresses.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-300">No flagged addresses found.</p>
              <p className="text-gray-500">The registry is clean.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-400 mb-4">
                {flaggedAddresses.length} address{flaggedAddresses.length !== 1 ? 'es' : ''} flagged on-chain
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400">Address</th>
                      <th className="text-left py-3 px-4 text-gray-400">Reports</th>
                      <th className="text-left py-3 px-4 text-gray-400">Last Reported</th>
                      <th className="text-left py-3 px-4 text-gray-400">Risk</th>
                      <th className="text-left py-3 px-4 text-gray-400">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {flaggedAddresses.map((item) => (
                      <>
                        <tr key={item.address} className="hover:bg-gray-800/50">
                          <td className="py-3 px-4 font-mono text-white">
                            {formatAddress(item.address)}
                          </td>
                          <td className="py-3 px-4 text-white">{item.reportCount}</td>
                          <td className="py-3 px-4 text-gray-400">
                            {item.lastReported ? formatDate(item.lastReported) : 'N/A'}
                          </td>
                          <td className="py-3 px-4">
                            <RiskBadge reportCount={item.reportCount} />
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => setExpandedAddress(expandedAddress === item.address ? null : item.address)}
                              className="text-blue-400 hover:text-blue-300 text-sm"
                            >
                              {expandedAddress === item.address ? 'Hide' : 'View Details'}
                            </button>
                          </td>
                        </tr>
                        {expandedAddress === item.address && item.reports.length > 0 && (
                          <tr key={`${item.address}-details`}>
                            <td colSpan={5} className="bg-gray-800/50 px-4 py-3">
                              <div className="space-y-3">
                                {item.reports.map((report, idx) => (
                                  <div key={idx} className="bg-gray-900 rounded-lg p-3 text-sm">
                                    <div className="flex justify-between mb-1">
                                      <span className="text-gray-400">Reporter: {formatAddress(report.reporter)}</span>
                                      <span className="text-gray-500">{formatDate(report.timestamp)}</span>
                                    </div>
                                    <p className="text-gray-300">{report.description || 'No description provided'}</p>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Section B: Report a Fraudster */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Report a Fraudster</h2>

          {!isConnected || !isCorrectNetwork ? (
            <p className="text-gray-400">Connect your wallet to Sepolia to submit reports.</p>
          ) : (
            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Suspect Wallet Address</label>
                <input
                  type="text"
                  value={suspectAddress}
                  onChange={(e) => setSuspectAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Evidence Description
                  <span className="float-right text-gray-500">{evidence.length}/200</span>
                </label>
                <textarea
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value.slice(0, 200))}
                  placeholder="Describe the fraudulent activity..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Legal Warning */}
              <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-red-300 text-sm">
                    Only submit reports for genuine fraudulent activity. False reports may have legal consequences.
                  </p>
                </div>
              </div>

              {submitError && (
                <div className="bg-red-900/50 border border-red-600 rounded-lg p-4">
                  <p className="text-red-400">{submitError}</p>
                </div>
              )}

              {submitSuccess && (
                <div className="bg-green-900/50 border border-green-600 rounded-lg p-4">
                  <p className="text-green-400 mb-2">{submitSuccess.message}</p>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${submitSuccess.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm font-mono break-all"
                  >
                    {submitSuccess.txHash}
                  </a>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !suspectAddress || !evidence}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 flex items-center justify-center gap-2 transition-colors"
              >
                {submitting ? (
                  <>
                    <Spinner className="h-5 w-5" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Submit Report
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
