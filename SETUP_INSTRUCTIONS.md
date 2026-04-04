# VoiceVault - Setup Instructions for Judges/Reviewers

## Quick Start Guide

This document provides streamlined instructions for running VoiceVault locally.

## System Requirements

- Node.js 18+
- Python 3.9+
- MetaMask browser extension
- Sepolia ETH (from faucet)
- Alchemy RPC endpoint (free tier)

## Installation Steps

### 1. Clone and Install Dependencies

```bash
# Clone repository
git clone <repository-url>
cd VoiceVault

# Install backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..

# Install frontend
cd frontend
npm install
cd ..

# Install blockchain tools
cd blockchain
npm install
cd ..
```

### 2. Configure Environment Variables

Create `/backend/.env`:
```env
FLASK_PORT=5001
MOCK_MODE=true
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
PRIVATE_KEY=your_wallet_private_key_without_0x
```

Create `/frontend/.env`:
```env
VITE_BACKEND_URL=http://localhost:5001
VITE_CHAIN_ID=11155111
```

### 3. Deploy Smart Contracts

```bash
cd blockchain
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
```

Copy the deployed addresses and update both `.env` files with contract addresses.

### 4. Copy Contract ABIs

```bash
mkdir -p frontend/src/abi
cp blockchain/artifacts/contracts/VoiceVault.sol/VoiceVault.json frontend/src/abi/
cp blockchain/artifacts/contracts/VoiceIDSBT.sol/VoiceIDSBT.json frontend/src/abi/
cp blockchain/artifacts/contracts/FraudRegistry.sol/FraudRegistry.json frontend/src/abi/
```

### 5. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
python app.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Access the application at `http://localhost:5173`

## Alternative: Using Scripts

If already configured:
```bash
./start.sh  # Start all services
./stop.sh   # Stop all services
```

## Testing the Installation

1. Visit `http://localhost:5173`
2. Connect MetaMask to Sepolia network
3. Register your voice (3+ second recording)
4. Approve the MetaMask transaction
5. Verify the minted Soulbound Token in your wallet

## Common Issues

| Problem | Solution |
|---------|----------|
| Backend won't start | Check Python version (3.9+), activate venv |
| Models won't download | Keep `MOCK_MODE=true` in backend/.env |
| MetaMask wrong network | Add Sepolia manually (Chain ID: 11155111) |
| Contract calls fail | Verify contract addresses in .env files |
| CORS errors | Ensure backend on port 5001, frontend on 5173 |

## Project Architecture

```
Frontend (React) → Flask API → Smart Contracts (Ethereum)
     ↓                ↓              ↓
 ethers.js      SpeechBrain      Sepolia Testnet
                  + librosa
```

## Key Technologies

- **Frontend**: React 18, Vite, ethers.js, Tailwind CSS
- **Backend**: Python Flask, SpeechBrain, librosa, web3.py
- **Blockchain**: Solidity 0.8.20, Hardhat, OpenZeppelin
- **AI**: ECAPA-TDNN voice embeddings, deepfake detection

## Support

For detailed documentation, see the main [README.md](./README.md)

For troubleshooting, check the Troubleshooting section in README.md
