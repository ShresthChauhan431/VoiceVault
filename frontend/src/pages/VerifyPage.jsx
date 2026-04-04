import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../hooks/useWallet';
import { getProvider, getVoiceVaultContract } from '../utils/contracts';
import { verifyVoice, forensicAnalysis, getStoredEnrollment } from '../utils/api';
import { ethers } from 'ethers';
import AudioRecorder from '../components/AudioRecorder';

function LoadingSkeleton({ lines = 3 }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-700 rounded"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
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

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 font-medium transition-colors ${
        active
          ? 'text-white border-b-2 border-blue-500'
          : 'text-gray-400 hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

function SubTabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm rounded-lg transition-colors ${
        active
          ? 'bg-gray-700 text-white'
          : 'bg-gray-800 text-gray-400 hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

function ResultCard({ score, isDeepfake, verdict, result }) {
  let color, icon, title, subtitle;

  // Check if any individual metric row is red (for amber override)
  const hasRedMetric = result && (
    (result.liveness_score !== undefined && result.liveness_score < 0.70) ||
    (result.artifact_score !== undefined && result.artifact_score > 0.30) ||
    (result.fuzzy_match === false)
  );

  // Verdict-driven display logic
  const v = (verdict || '').toLowerCase();

  if (v === 'authentic' && score >= 40 && !isDeepfake) {
    // Override: if any metric row is red, force amber instead of green
    if (hasRedMetric) {
      color = '#FBBF24';
      title = 'AUTHENTIC';
      subtitle = 'Identity verified, but some metrics flagged.';
      icon = (
        <svg className="w-16 h-16" fill="none" stroke={color} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    } else {
      color = '#10B981';
      title = 'AUTHENTIC';
      subtitle = 'Identity verified.';
      icon = (
        <svg className="w-16 h-16" fill="none" stroke={color} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    }
  } else if (v === 'uncertain') {
    color = '#FBBF24';
    title = 'LOW CONFIDENCE';
    subtitle = 'Verification passed with low confidence.';
    icon = (
      <svg className="w-16 h-16" fill="none" stroke={color} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  } else if (v === 'deepfake_detected') {
    color = '#EF4444';
    title = 'DEEPFAKE DETECTED';
    subtitle = 'This audio is not authentic.';
    icon = (
      <svg className="w-16 h-16" fill="none" stroke={color} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  } else {
    // 'rejected' or fallback
    color = '#EF4444';
    title = 'REJECTED';
    subtitle = 'Voice verification failed.';
    icon = (
      <svg className="w-16 h-16" fill="none" stroke={color} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    );
  }

  return (
    <div 
      className="text-center p-8 rounded-xl border-2 animate-fadeIn"
      style={{ borderColor: color, backgroundColor: `${color}15` }}
    >
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="text-2xl font-bold mb-1" style={{ color }}>{title}</h3>
      <p className="text-4xl font-bold text-white mb-2">{Math.round(score)}%</p>
      <p className="text-gray-300">{subtitle}</p>
    </div>
  );
}

function ResultTable({ result }) {
  const getAssessment = (score) => {
    // Thresholds aligned with backend: 40/25 (new scoring formula)
    if (score >= 40) return { text: 'HIGH', color: 'text-green-400' };
    if (score >= 25) return { text: 'LOW', color: 'text-yellow-400' };
    return { text: 'REJ', color: 'text-red-400' };
  };

  const overall = getAssessment(result.score);
  const livenessAssessment = result.liveness_score >= 0.70 ? 'Natural' : 'Synthetic';
  const spectralAssessment = result.artifact_score <= 0.30 ? 'Clean' : 'Artifacts';

  return (
    <div className="mt-6 bg-gray-800 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-700">
            <th className="text-left px-4 py-3 text-gray-300">Metric</th>
            <th className="text-left px-4 py-3 text-gray-300">Result</th>
            <th className="text-left px-4 py-3 text-gray-300">Assessment</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          <tr>
            <td className="px-4 py-3 text-gray-400">Fuzzy Match</td>
            <td className="px-4 py-3 text-white">{result.fuzzy_match ? 'Pass' : 'Fail'}</td>
            <td className={`px-4 py-3 ${result.fuzzy_match ? 'text-green-400' : 'text-red-400'}`}>
              {result.fuzzy_match ? 'Matched' : 'No Match'}
            </td>
          </tr>
          <tr>
            <td className="px-4 py-3 text-gray-400">Liveness Score</td>
            <td className="px-4 py-3 text-white">{Math.round((result.liveness_score || 0) * 100)}%</td>
            <td className={`px-4 py-3 ${result.liveness_score >= 0.70 ? 'text-green-400' : 'text-red-400'}`}>
              {livenessAssessment}
            </td>
          </tr>
          <tr>
            <td className="px-4 py-3 text-gray-400">Spectral Check</td>
            <td className="px-4 py-3 text-white">{Math.round(100 - (result.artifact_score || 0) * 100)}%</td>
            <td className={`px-4 py-3 ${result.artifact_score <= 0.30 ? 'text-green-400' : 'text-orange-400'}`}>
              {spectralAssessment}
            </td>
          </tr>
          <tr className="bg-gray-750">
            <td className="px-4 py-3 text-gray-300 font-medium">Overall</td>
            <td className="px-4 py-3 text-white font-bold">{Math.round(result.score)}%</td>
            <td className={`px-4 py-3 font-bold ${overall.color}`}>{overall.text}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ForensicReport({ report }) {
  const downloadReport = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forensic-report-${report.report_id || Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Report Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Report ID:</span>
            <p className="text-white font-mono">{report.report_id || 'N/A'}</p>
          </div>
          <div>
            <span className="text-gray-400">Timestamp:</span>
            <p className="text-white">{report.timestamp || new Date().toISOString()}</p>
          </div>
          <div>
            <span className="text-gray-400">Similarity Score:</span>
            <p className="text-white font-bold">{Math.round(report.similarity_score || report.score || 0)}%</p>
          </div>
          <div>
            <span className="text-gray-400">Fuzzy Match:</span>
            <p className={report.fuzzy_match ? 'text-green-400' : 'text-red-400'}>
              {report.fuzzy_match ? 'Matched' : 'No Match'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Liveness Analysis</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 text-gray-400">Parameter</th>
              <th className="text-left py-2 text-gray-400">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            <tr>
              <td className="py-2 text-gray-300">Jitter</td>
              <td className="py-2 text-white">{report.liveness?.jitter?.toFixed(4) || 'N/A'}</td>
            </tr>
            <tr>
              <td className="py-2 text-gray-300">Shimmer</td>
              <td className="py-2 text-white">{report.liveness?.shimmer?.toFixed(4) || 'N/A'}</td>
            </tr>
            <tr>
              <td className="py-2 text-gray-300">HNR (Harmonics-to-Noise)</td>
              <td className="py-2 text-white">{report.liveness?.hnr?.toFixed(2) || 'N/A'} dB</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Spectral Artifact Score</h3>
        <p className="text-3xl font-bold text-white">{Math.round(report.artifact_score || 0)}%</p>
        <p className="text-sm text-gray-400 mt-1">
          {(report.artifact_score || 0) <= 30 ? 'No significant artifacts detected' : 'Potential synthetic artifacts present'}
        </p>
      </div>

      {report.assessment && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Overall Assessment</h3>
          <p className="text-gray-300">{report.assessment}</p>
        </div>
      )}

      <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h4 className="text-yellow-500 font-medium mb-1">Legal Disclaimer</h4>
            <p className="text-yellow-200/80 text-sm">
              This report is for investigative purposes only. It is not admissible as standalone legal evidence. 
              Consult a certified forensic audio expert for legal proceedings.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={downloadReport}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-3 flex items-center justify-center gap-2 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download Report
      </button>
    </div>
  );
}

export default function VerifyPage() {
  const { address, isConnected } = useWallet();

  const [activeTab, setActiveTab] = useState('verify');
  const [targetAddress, setTargetAddress] = useState('');
  const [useOwnAddress, setUseOwnAddress] = useState(false);
  const [profileStatus, setProfileStatus] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [usingLocalStorage, setUsingLocalStorage] = useState(false);

  const [audioInputMode, setAudioInputMode] = useState('record');
  const [audioBlob, setAudioBlob] = useState(null);
  const [fileName, setFileName] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [forensicReport, setForensicReport] = useState(null);
  const [error, setError] = useState(null);

  const effectiveAddress = useOwnAddress && isConnected ? address : targetAddress;

  // Check profile when address changes - fetch directly from blockchain
  // For "verify my own voice", first try localStorage (works before blockchain)
  const checkProfile = useCallback(async (addr, isOwnVoice = false) => {
    // When verifying own voice, first check localStorage for enrollment data
    if (isOwnVoice) {
      const storedEnrollment = getStoredEnrollment();
      if (storedEnrollment) {
        console.log('[VerifyPage] Using localStorage enrollment data');
        setProfileStatus('Using locally stored enrollment (session-based verification)');
        setProfileData({
          helperString: storedEnrollment.helperString,
          commitment: storedEnrollment.commitment,
          salt: storedEnrollment.salt
        });
        setUsingLocalStorage(true);
        setCheckingProfile(false);
        return;
      }
    }

    setUsingLocalStorage(false);

    if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      setProfileStatus(null);
      setProfileData(null);
      return;
    }

    setCheckingProfile(true);
    setProfileStatus(null);
    setProfileData(null);

    try {
      const provider = getProvider();
      const contract = getVoiceVaultContract(provider);
      
      // getVoiceProfile returns: (helperString, commitment, salt, registeredAt, isActive)
      const profile = await contract.getVoiceProfile(addr);
      
      // Destructure the tuple return
      const [helperString, commitment, salt, registeredAt, isActive] = profile;

      if (isActive) {
        const registeredDate = new Date(Number(registeredAt) * 1000).toLocaleDateString();
        setProfileStatus(`Profile found. Registered on ${registeredDate}.`);
        
        // helperString is bytes, commitment and salt are bytes32
        // Convert to proper format for verification API
        setProfileData({
          helperString: typeof helperString === 'string' ? helperString : ethers.hexlify(helperString),
          commitment: commitment,
          salt: salt
        });
      } else {
        setProfileStatus('No profile found for this address.');
        setProfileData(null);
      }
    } catch {
      setProfileStatus('No profile found for this address.');
      setProfileData(null);
    } finally {
      setCheckingProfile(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkProfile(effectiveAddress, useOwnAddress && isConnected);
    }, 300);
    return () => clearTimeout(timer);
  }, [effectiveAddress, checkProfile, useOwnAddress, isConnected]);

  useEffect(() => {
    if (useOwnAddress && isConnected) {
      setTargetAddress(address);
    }
  }, [useOwnAddress, isConnected, address]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioBlob(file);
      setFileName(file.name);
    }
  };

  const handleRecordingComplete = (blob) => {
    setAudioBlob(blob);
    setFileName('');
  };

  const handleVerify = async () => {
    if (!audioBlob || !profileData) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await verifyVoice(
        audioBlob,
        profileData.helperString,
        profileData.commitment,
        profileData.salt
      );

      if (response.error) {
        throw new Error(response.error);
      }

      setResult(response);
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForensic = async () => {
    if (!audioBlob || !profileData) return;

    setLoading(true);
    setError(null);
    setForensicReport(null);

    try {
      const response = await forensicAnalysis(
        audioBlob,
        profileData.helperString,
        profileData.commitment,
        profileData.salt
      );

      if (response.error) {
        throw new Error(response.error);
      }

      setForensicReport(response);
    } catch (err) {
      setError(err.message || 'Forensic analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setForensicReport(null);
    setAudioBlob(null);
    setFileName('');
    setError(null);
  };

  const canSubmit = audioBlob && profileData && !loading;

  return (
    <div className="min-h-screen bg-gray-950 text-white py-12 px-4">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Voice Verification</h1>

        {/* Tab Navigation */}
        <div className="flex justify-center border-b border-gray-700 mb-8">
          <TabButton active={activeTab === 'verify'} onClick={() => { setActiveTab('verify'); reset(); }}>
            Verify a Voice
          </TabButton>
          <TabButton active={activeTab === 'forensic'} onClick={() => { setActiveTab('forensic'); reset(); }}>
            Forensic Analysis
          </TabButton>
        </div>

        {/* Show results or input form */}
        {result ? (
          <div className="space-y-6">
            <ResultCard score={result.score} isDeepfake={result.is_deepfake} verdict={result.status} result={result} />
            <ResultTable result={result} />
            {(() => {
              const v = (result.status || '').toLowerCase();
              let mainText = '';
              let isWarning = false;

              if (v === 'rejected' || v === 'deepfake_detected') {
                isWarning = true;
                if (result.liveness_score < 0.15 && result.artifact_score < 0.25) {
                  mainText = 'Liveness check failed. Try re-recording in a quieter environment with a better microphone.';
                } else if (result.artifact_score >= 0.40) {
                  mainText = 'High spectral artifacts detected. Voice appears AI-generated or synthesized.';
                } else if (result.artifact_score >= 0.25 && result.artifact_score < 0.40) {
                  mainText = 'Moderate audio artifacts detected. Voice may be synthetic or a replay attack.';
                } else if (result.cosine_similarity < 0.20) {
                  mainText = 'Speaker identity mismatch. This voice does not match the registered profile.';
                } else if (result.fuzzy_match === false && result.liveness_score >= 0.15) {
                  mainText = 'Voice pattern did not match enrolled template. Please try again or re-register.';
                } else {
                  mainText = 'Voice verification failed. Identity could not be confirmed.';
                }
              } else if (v === 'uncertain') {
                mainText = 'Verification passed with low confidence. Consider re-recording for a stronger match.';
              } else if (v === 'authentic') {
                mainText = 'Voice verification passed. Identity confirmed.';
              } else {
                mainText = result.recommendation || '';
              }

              return mainText ? (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-gray-300 font-medium mb-1">
                    {isWarning ? 'Why This Failed' : 'Recommendation'}
                  </h4>
                  <p className={isWarning ? 'text-red-400 font-medium' : 'text-white'}>
                    {mainText}
                  </p>
                  {result.rejection_reason && (
                    <p className="text-gray-400 text-sm mt-2">
                      Gate: {result.rejection_reason}
                    </p>
                  )}
                </div>
              ) : null;
            })()}
            <button
              onClick={reset}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-6 py-3 transition-colors"
            >
              Verify Another
            </button>
          </div>
        ) : forensicReport ? (
          <div>
            <ForensicReport report={forensicReport} />
            <button
              onClick={reset}
              className="w-full mt-6 bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-6 py-3 transition-colors"
            >
              Analyze Another
            </button>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-6">
            {/* Section A: Target Address */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Target Address</h2>
              
              {isConnected && (
                <label className="flex items-center gap-2 mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useOwnAddress}
                    onChange={(e) => setUseOwnAddress(e.target.checked)}
                    className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-300">Verify against my own voice</span>
                </label>
              )}

              <input
                type="text"
                value={targetAddress}
                onChange={(e) => { setTargetAddress(e.target.value); setUseOwnAddress(false); }}
                placeholder="Enter Ethereum address of registered user (0x...)"
                disabled={useOwnAddress}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />

              {checkingProfile && (
                <div className="flex items-center gap-2 mt-2">
                  <Spinner className="h-4 w-4" />
                  <span className="text-gray-400 text-sm">Checking profile...</span>
                </div>
              )}

              {!checkingProfile && profileStatus && (
                <p className={`text-sm mt-2 ${profileData ? (usingLocalStorage ? 'text-blue-400' : 'text-green-400') : 'text-red-400'}`}>
                  {profileData ? (
                    <>✓ {profileStatus}{usingLocalStorage && ' (No blockchain required)'}</>
                  ) : (
                    <>✗ {profileStatus} Registration required before verification.</>
                  )}
                </p>
              )}
            </div>

            {/* Section B: Audio Input */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Audio Sample</h2>
              
              <div className="flex gap-2 mb-4">
                <SubTabButton active={audioInputMode === 'record'} onClick={() => setAudioInputMode('record')}>
                  Record Live
                </SubTabButton>
                <SubTabButton active={audioInputMode === 'upload'} onClick={() => setAudioInputMode('upload')}>
                  Upload File
                </SubTabButton>
              </div>

              {audioInputMode === 'record' ? (
                <AudioRecorder
                  onRecordingComplete={handleRecordingComplete}
                  minDurationSeconds={3}
                  label="Record voice sample"
                />
              ) : (
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".wav,.mp3,.m4a,.webm,audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="audio-upload"
                  />
                  <label htmlFor="audio-upload" className="cursor-pointer">
                    <svg className="w-12 h-12 text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-gray-400 mb-1">Click to upload audio file</p>
                    <p className="text-gray-500 text-sm">.wav, .mp3, .m4a, .webm</p>
                  </label>
                  {fileName && (
                    <p className="mt-4 text-green-400 text-sm">
                      Selected: {fileName}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-900/50 border border-red-600 rounded-lg p-4">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {/* Section C: Submit Button */}
            {activeTab === 'verify' ? (
              <button
                onClick={handleVerify}
                disabled={!canSubmit}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Spinner />
                    Running AI analysis...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Verify Voice
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleForensic}
                disabled={!canSubmit}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Spinner />
                    Running forensic analysis...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Run Forensic Analysis
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
