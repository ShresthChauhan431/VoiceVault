import { Link } from 'react-router-dom';

const problemCards = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    text: 'Voice cloning takes under 5 seconds with modern AI tools.'
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    text: 'Deepfake voice scams are a rapidly growing threat.'
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    text: "Your voice ID is locked inside corporate databases you don't control."
  }
];

const howItWorks = [
  {
    step: 1,
    title: 'Register',
    description: 'Record your voice. AI generates a cryptographic fingerprint. Only the fingerprint is stored on the blockchain. Your audio is never saved.'
  },
  {
    step: 2,
    title: 'Verify',
    description: 'Submit any suspicious audio. Multi-layer AI analysis runs in milliseconds.'
  },
  {
    step: 3,
    title: 'Trust',
    description: 'On-chain immutability means no server admin can tamper with your identity.'
  }
];

const features = [
  { title: 'Fuzzy Extractor Security', icon: '🔐', description: 'Noise-tolerant biometric matching' },
  { title: 'Soulbound Token Identity', icon: '🎭', description: 'Non-transferable on-chain identity' },
  { title: 'Fraud Registry', icon: '🚨', description: 'Community-driven threat database' },
  { title: 'Forensic Voice Analysis', icon: '🔬', description: 'Deep spectral analysis tools' },
  { title: 'ZK-SNARK Privacy', icon: '🛡️', description: 'Prove identity without revealing data' },
  { title: 'Real-time Deepfake Detection', icon: '⚡', description: 'Millisecond response time' }
];

export default function LandingPage() {
  return (
    <div className="bg-gray-950 text-white">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Your Voice. Your Identity.
            </span>
            <br />
            <span className="text-white">On-Chain.</span>
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Voice Vault uses AI and blockchain to detect deepfakes and verify authentic voices — in real time. 
            No company controls your identity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-8 py-4 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Register My Voice
            </Link>
            <Link
              to="/verify"
              className="bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg px-8 py-4 transition-colors flex items-center justify-center gap-2 border border-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Verify a Voice
            </Link>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16 px-4 bg-gray-900/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              The Problem
            </span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {problemCards.map((card, i) => (
              <div
                key={i}
                className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center"
              >
                <div className="text-red-400 flex justify-center mb-4">{card.icon}</div>
                <p className="text-gray-300">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              How It Works
            </span>
          </h2>
          <div className="space-y-8">
            {howItWorks.map(({ step, title, description }) => (
              <div key={step} className="flex gap-6 items-start">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-xl font-bold">
                  {step}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
                  <p className="text-gray-400">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 bg-gray-900/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Features
            </span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition-colors"
              >
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-1">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Blockchain */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Why Blockchain?
            </span>
          </h2>
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-xl p-8">
            <div className="space-y-4 text-gray-300">
              <p>
                <span className="text-white font-medium">Banks lock your voice ID in their database.</span>
                <br />
                If they get hacked, your biometric is compromised forever.
                <br />
                If they ban you, your identity disappears.
              </p>
              <p className="pt-4 text-white">
                Voice Vault makes your voice identity a <span className="text-blue-400 font-medium">portable asset</span> under your sole control.
              </p>
              <ul className="space-y-2 pt-4">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  No single company can delete it.
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  No server admin can alter it.
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  One identity across banking, messaging, and government services.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Secure Your Voice?</h2>
          <p className="text-gray-400 mb-8">Join the decentralized identity revolution.</p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-8 py-4 transition-colors"
          >
            Get Started
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
