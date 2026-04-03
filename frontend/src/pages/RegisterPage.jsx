import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useVoiceRegistration } from '../hooks/useVoiceRegistration';
import { getProvider, getVoiceVaultContract } from '../utils/contracts';
import AudioRecorder from '../components/AudioRecorder';

const PASSPHRASE = 'My voice is my password and my identity.';

function StepIndicator({ currentStep, totalSteps = 5 }) {
  return (
    <div className="flex justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full transition-colors ${
            i + 1 === currentStep
              ? 'bg-blue-500'
              : i + 1 < currentStep
              ? 'bg-green-500'
              : 'bg-gray-600'
          }`}
        />
      ))}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function SuccessCheckmark() {
  return (
    <div className="flex justify-center mb-6">
      <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
        <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { address, isConnected, isCorrectNetwork, connectWallet, switchToSepolia, error: walletError, loading: walletLoading } = useWallet();
  const { status: regStatus, txHash, error: regError, register } = useVoiceRegistration();

  const [step, setStep] = useState(1);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [processingMessage, setProcessingMessage] = useState('');
  const [error, setError] = useState(null);

  // Check if user already has a voice profile
  const checkExistingProfile = useCallback(async () => {
    if (!isConnected || !isCorrectNetwork || !address) return;

    setCheckingProfile(true);
    try {
      const provider = getProvider();
      const contract = getVoiceVaultContract(provider);
      const profile = await contract.getVoiceProfile(address);
      
      // Profile is active if it exists and isActive is true
      if (profile && profile.isActive) {
        setHasProfile(true);
        setStep(2);
      } else {
        setHasProfile(false);
        setStep(3);
      }
    } catch {
      // No profile exists, proceed to registration
      setHasProfile(false);
      setStep(3);
    } finally {
      setCheckingProfile(false);
    }
  }, [isConnected, isCorrectNetwork, address]);

  // Auto-advance through wallet steps
  useEffect(() => {
    if (!isConnected) {
      setStep(1);
    } else if (!isCorrectNetwork) {
      setStep(1);
    } else if (step === 1) {
      checkExistingProfile();
    }
  }, [isConnected, isCorrectNetwork, step, checkExistingProfile]);

  // Handle registration status changes
  useEffect(() => {
    if (regStatus === 'processing_ai') {
      setStep(4);
      setProcessingMessage('Analyzing your voice with AI...');
      const timer = setTimeout(() => {
        setProcessingMessage('Generating cryptographic fingerprint...');
      }, 1500);
      return () => clearTimeout(timer);
    } else if (regStatus === 'signing_tx') {
      setProcessingMessage('Please confirm the transaction in your wallet...');
    } else if (regStatus === 'confirming') {
      setProcessingMessage('Confirming on Sepolia blockchain... (15-30 seconds)');
    } else if (regStatus === 'done') {
      setStep(5);
    } else if (regStatus === 'error') {
      setStep(3);
      // Parse error messages
      if (regError?.includes('4001') || regError?.includes('cancelled')) {
        setError('Transaction cancelled. Your voice data was not stored anywhere. Try again.');
      } else if (regError?.includes('network') || regError?.includes('fetch') || regError?.includes('ECONNREFUSED')) {
        setError('Connection error. Is the backend running on port 5000?');
      } else {
        setError(regError);
      }
    }
  }, [regStatus, regError]);

  const handleRecordingComplete = (blob) => {
    setAudioBlob(blob);
    setError(null);
  };

  const handleRegister = async () => {
    if (!audioBlob) return;
    setError(null);
    await register(audioBlob);
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white py-12 px-4">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2">Register Your Voice</h1>
        <p className="text-gray-400 text-center mb-8">Create your on-chain Voice Identity</p>

        <StepIndicator currentStep={step} />

        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
          {/* STEP 1: Wallet Connection */}
          {step === 1 && (
            <div className="text-center">
              {!isConnected ? (
                <>
                  <h2 className="text-xl font-semibold mb-4">Connect Your Wallet</h2>
                  <p className="text-gray-400 mb-6">Connect your Ethereum wallet to get started.</p>
                  <button
                    onClick={connectWallet}
                    disabled={walletLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 flex items-center gap-2 mx-auto transition-colors"
                  >
                    {walletLoading ? <Spinner /> : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    )}
                    {walletLoading ? 'Connecting...' : 'Connect Wallet'}
                  </button>
                  {walletError && (
                    <p className="text-red-400 text-sm mt-4">{walletError}</p>
                  )}
                </>
              ) : !isCorrectNetwork ? (
                <>
                  <h2 className="text-xl font-semibold mb-4">Switch Network</h2>
                  <p className="text-gray-400 mb-2">Connected: <span className="text-white font-mono">{formatAddress(address)}</span></p>
                  <p className="text-yellow-400 mb-6">Please switch to the Sepolia testnet to continue.</p>
                  <button
                    onClick={switchToSepolia}
                    disabled={walletLoading}
                    className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 flex items-center gap-2 mx-auto transition-colors"
                  >
                    {walletLoading ? <Spinner /> : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    )}
                    {walletLoading ? 'Switching...' : 'Switch to Sepolia'}
                  </button>
                  {walletError && (
                    <p className="text-red-400 text-sm mt-4">{walletError}</p>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Spinner />
                  <span className="text-gray-400">Checking registration status...</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Already Registered */}
          {step === 2 && hasProfile && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">You Already Have a Voice ID</h2>
              <p className="text-gray-400 mb-6">Your voice has already been registered on the blockchain.</p>
              <Link
                to="/identity"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-3 transition-colors"
              >
                View Your Identity
              </Link>
            </div>
          )}

          {/* Checking Profile Loading */}
          {step === 2 && checkingProfile && (
            <div className="text-center">
              <Spinner />
              <p className="text-gray-400 mt-4">Checking registration status...</p>
            </div>
          )}

          {/* STEP 3: Record Voice */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-center mb-4">Record Your Voice</h2>
              <p className="text-gray-400 text-center mb-2">Connected: <span className="text-white font-mono">{formatAddress(address)}</span></p>
              
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-400 mb-2">Please read this phrase aloud clearly:</p>
                <p className="text-lg text-white font-medium italic">&ldquo;{PASSPHRASE}&rdquo;</p>
              </div>

              <AudioRecorder
                onRecordingComplete={handleRecordingComplete}
                minDurationSeconds={3}
                label="Record the passphrase"
              />

              {error && (
                <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 mt-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {audioBlob && (
                <button
                  onClick={handleRegister}
                  className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white rounded-lg px-6 py-3 flex items-center justify-center gap-2 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Register My Voice
                </button>
              )}
            </div>
          )}

          {/* STEP 4: Processing */}
          {step === 4 && (
            <div className="text-center py-8">
              <Spinner />
              <p className="text-gray-300 mt-4">{processingMessage}</p>
              {regStatus === 'confirming' && (
                <p className="text-gray-500 text-sm mt-2">Do not close this page.</p>
              )}
            </div>
          )}

          {/* STEP 5: Success */}
          {step === 5 && (
            <div className="text-center py-4">
              <SuccessCheckmark />
              <h2 className="text-2xl font-bold text-green-400 mb-2">Voice ID Issued!</h2>
              <p className="text-gray-400 mb-4">Your Voice Soulbound Token (SBT) has been minted.</p>
              
              {txHash && (
                <div className="bg-gray-800 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-400 mb-1">Transaction Hash</p>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm font-mono break-all"
                  >
                    {txHash}
                  </a>
                </div>
              )}

              <button
                onClick={() => navigate('/verify')}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-3 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
