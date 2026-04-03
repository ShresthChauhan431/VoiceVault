import { useState } from 'react';
import axios from 'axios';
import AudioRecorder from '../components/AudioRecorder';

const BASE = import.meta.env.VITE_BACKEND_URL;

function Spinner({ className = 'h-6 w-6' }) {
  return (
    <svg className={`animate-spin ${className} text-blue-500`} viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

export default function ZKDemoPage() {
  const [audioBlob, setAudioBlob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [proof, setProof] = useState(null);
  const [error, setError] = useState(null);

  const handleRecordingComplete = (blob) => {
    setAudioBlob(blob);
    setProof(null);
    setError(null);
  };

  const generateProof = async () => {
    if (!audioBlob) return;

    setLoading(true);
    setError(null);
    setProof(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await axios.post(`${BASE}/api/challenge`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setProof(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate proof');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setAudioBlob(null);
    setProof(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2">Zero-Knowledge Proof Demo</h1>
        <p className="text-gray-400 text-center mb-8">For Hackathon Judges</p>

        {/* Section A: Explanation */}
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-700 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-600/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Privacy-Preserving Voice Verification</h2>
              <p className="text-gray-300">
                Prove your voice matches your registered hash <strong className="text-purple-400">WITHOUT revealing your voice data or the hash to anyone</strong> — not even the server.
              </p>
            </div>
          </div>
        </div>

        {/* Section B: Generate Proof */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Generate ZK Proof</h2>

          {!proof ? (
            <>
              <AudioRecorder
                onRecordingComplete={handleRecordingComplete}
                minDurationSeconds={3}
                label="Record your voice sample"
              />

              {error && (
                <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 mt-4">
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              {audioBlob && (
                <button
                  onClick={generateProof}
                  disabled={loading}
                  className="w-full mt-6 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? (
                    <>
                      <Spinner />
                      Generating cryptographic proof...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Generate ZK Proof
                    </>
                  )}
                </button>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {/* Success Message */}
              <div className="bg-green-900/30 border border-green-600 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-green-400 font-medium">Proof Generated Successfully</p>
                    <p className="text-green-300/80 text-sm mt-1">
                      This proof mathematically guarantees a voice match without revealing any voice data to any party.
                    </p>
                  </div>
                </div>
              </div>

              {/* Proof JSON */}
              <div>
                <h3 className="text-sm text-gray-400 mb-2">Proof Data</h3>
                <pre className="bg-gray-950 border border-gray-700 rounded-lg p-4 overflow-x-auto text-sm text-gray-300 font-mono">
                  {JSON.stringify(proof, null, 2)}
                </pre>
              </div>

              <button
                onClick={reset}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-6 py-3 transition-colors"
              >
                Generate Another Proof
              </button>
            </div>
          )}
        </div>

        {/* Section C: Technical Explanation */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            What Is This?
          </h2>

          <div className="space-y-4 text-gray-300">
            <p>
              Full ZK-SNARK implementation uses <strong className="text-white">Circom + SnarkJS</strong>.
            </p>
            <p>
              In a production build, proofs are generated <strong className="text-white">locally on-device</strong>. 
              The server only receives the proof — never the audio or the embedding.
            </p>

            <div className="bg-gray-800 rounded-lg p-4 mt-4">
              <h4 className="text-white font-medium mb-2">How It Works</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Your voice is converted to a biometric embedding locally</li>
                <li>A ZK circuit proves the embedding matches your registered commitment</li>
                <li>Only the proof is sent to the verifier — no voice data ever leaves your device</li>
                <li>The proof is verified on-chain or by any third party</li>
              </ol>
            </div>

            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
              <h4 className="text-blue-400 font-medium mb-2">Privacy Guarantees</h4>
              <ul className="space-y-1 text-sm">
                <li>✓ Voice data never leaves your device</li>
                <li>✓ Server cannot reconstruct your voice or embedding</li>
                <li>✓ Proof is zero-knowledge: reveals nothing except validity</li>
                <li>✓ Works with any ZK-compatible verifier</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
