# VoiceVault - Decentralized Voice Identity & Deepfake Detection

VoiceVault is a blockchain-powered voice biometric authentication system that combines AI-driven voice analysis with on-chain identity anchoring. Register your unique voice signature as a soulbound token (SBT) and verify audio authenticity against deepfakes.

## Key Features

- **Voice Registration**: Generate cryptographic fingerprints from voice recordings
- **Deepfake Detection**: AI-powered liveness and spectral artifact analysis
- **On-Chain Identity**: Immutable voice profiles stored on Ethereum (Sepolia)
- **Soulbound Tokens**: Non-transferable ERC-721 tokens representing voice identity
- **Fraud Registry**: Community-driven flagging system for suspicious addresses
- **Forensic Analysis**: Detailed audio reports for investigative purposes

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite, Tailwind CSS, ethers.js v6 |
| **Backend** | Python Flask, SpeechBrain, librosa, web3.py |
| **Blockchain** | Solidity 0.8.20, Hardhat, OpenZeppelin |
| **Network** | Ethereum Sepolia Testnet |
| **AI Models** | SpeechBrain ECAPA-TDNN, Fuzzy Extractor |

## Prerequisites

Before running the project, ensure you have the following installed:

- **Node.js** 18 or higher (for frontend and Hardhat)
- **Python** 3.9 or higher (for backend AI processing)
- **MetaMask** browser extension
- **Sepolia ETH** for gas fees (get from [Sepolia faucet](https://sepoliafaucet.com/))
- **Alchemy or Infura RPC endpoint** (free tier available at [Alchemy](https://www.alchemy.com/))

## How to Run the Project

Follow these steps in order to set up and run VoiceVault locally:

### Step 1: Clone the Repository and Configure Environment

```bash
git clone <repository-url>
cd VoiceVault
```

Create environment files from examples (if provided), or manually create:

**Backend `.env`** (`/backend/.env`):
```env
FLASK_PORT=5001
MOCK_MODE=true
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
PRIVATE_KEY=your_64_character_private_key_without_0x
CONTRACT_ADDRESS=deployed_voicevault_address
VITE_CONTRACT_ADDRESS=deployed_voicevault_address
VITE_SBT_ADDRESS=deployed_sbt_address
VITE_FRAUD_REGISTRY_ADDRESS=deployed_fraud_address
```

**Frontend `.env`** (`/frontend/.env`):
```env
VITE_BACKEND_URL=http://localhost:5001
VITE_CHAIN_ID=11155111
VITE_CONTRACT_ADDRESS=deployed_voicevault_address
VITE_SBT_ADDRESS=deployed_sbt_address
VITE_FRAUD_REGISTRY_ADDRESS=deployed_fraud_address
```

### Step 2: Install Backend Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Mac/Linux
# venv\Scripts\activate   # Windows
pip install -r requirements.txt
cd ..
```

**Note**: If SpeechBrain models fail to download or cause OOM errors, keep `MOCK_MODE=true` in backend/.env.

### Step 3: Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### Step 4: Install Blockchain Dependencies

```bash
cd blockchain
npm install
cd ..
```

### Step 5: Compile Smart Contracts

```bash
cd blockchain
npx hardhat compile
```

Expected output: "Compiled X Solidity files successfully"

### Step 6: Deploy Contracts to Sepolia

**First**, ensure you have:
- Sepolia ETH in your deployer wallet
- `PRIVATE_KEY` and `RPC_URL` set in `/backend/.env`
- Hardhat reads from `../backend/.env`

```bash
cd blockchain
npx hardhat run scripts/deploy.js --network sepolia
```

This will:
1. Deploy VoiceIDSBT (Soulbound Token)
2. Deploy VoiceVault (main registry)
3. Deploy FraudRegistry
4. Write addresses to `deployedAddresses.json`
5. Print all deployed contract addresses

**Save the addresses!** You'll need them in the next step.

### Step 7: Update Environment Files with Deployed Addresses

Copy the deployed addresses from terminal output or `blockchain/deployedAddresses.json`:

```json
{
  "voiceVault": "0x...",
  "voiceIDSBT": "0x...",
  "fraudRegistry": "0x..."
}
```

Update **both** `.env` files:
- `/backend/.env`: Set `CONTRACT_ADDRESS`, `VITE_CONTRACT_ADDRESS`, `VITE_SBT_ADDRESS`, `VITE_FRAUD_REGISTRY_ADDRESS`
- `/frontend/.env`: Set `VITE_CONTRACT_ADDRESS`, `VITE_SBT_ADDRESS`, `VITE_FRAUD_REGISTRY_ADDRESS`

### Step 8: Copy Contract ABIs to Frontend

```bash
# Copy compiled contract ABIs
mkdir -p frontend/src/abi
cp blockchain/artifacts/contracts/VoiceVault.sol/VoiceVault.json frontend/src/abi/
cp blockchain/artifacts/contracts/FraudRegistry.sol/FraudRegistry.json frontend/src/abi/
cp blockchain/artifacts/contracts/VoiceIDSBT.sol/VoiceIDSBT.json frontend/src/abi/
```

### Step 9: Start Backend Server

```bash
cd backend
source venv/bin/activate
python app.py
```

Server starts on `http://localhost:5001`

Test health check:
```bash
curl http://localhost:5001/api/health
# Expected: {"status":"ok","model_loaded":true,"mock_mode":true,"version":"2.0"}
```

### Step 10: Start Frontend Development Server

Open a new terminal window (keep the backend running) and execute:

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173`

Open your browser and navigate to `http://localhost:5173` to use the application.

---

## Quick Start (Alternative Method)

If you have already deployed contracts and configured environment files, you can use the provided scripts:

```bash
# Start both backend and frontend
./start.sh

# Stop all services
./stop.sh
```

## Usage

### Register Your Voice

1. Connect MetaMask to Sepolia
2. Navigate to **Register** page
3. Record the passphrase (3+ seconds)
4. Confirm transaction in MetaMask
5. Wait 15-30 seconds for confirmation
6. Receive your Voice ID SBT!

### Verify a Voice

1. Enter target address (or use your own)
2. Record or upload audio sample
3. Click **Verify Voice**
4. Review authenticity score and deepfake analysis

### Report Fraud

1. Navigate to **Fraud Registry**
2. Enter suspect address
3. Provide evidence description (max 200 chars)
4. Submit on-chain report

## Architecture

```
┌─────────────────┐
│   React App     │  User records voice
│  (localhost:    │  MetaMask signs tx
│     5173)       │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  Flask Backend  │  AI: SpeechBrain ECAPA-TDNN
│  (localhost:    │  Fuzzy Extractor → helper, commitment, salt
│     5001)       │  Deepfake: liveness + spectral checks
└────────┬────────┘
         │ web3.py
         ▼
┌─────────────────┐
│ Ethereum Sepolia│  VoiceVault.sol: stores commitments
│  Smart Contracts│  VoiceIDSBT.sol: mints soulbound tokens
│                 │  FraudRegistry.sol: fraud reports
└─────────────────┘
```

**Flow**:
1. User records voice → sent to Flask
2. Flask extracts 192-dim embedding (SpeechBrain)
3. Fuzzy extractor generates (helper, commitment, salt)
4. Frontend submits to blockchain
5. Smart contract stores commitment + mints SBT
6. Voice now anchored on-chain and queryable

## Security Features

- **No audio stored**: Temp files deleted immediately after processing
- **Strict MIME validation**: Only audio/* files accepted (10MB limit)
- **Duration checks**: 1-60 second audio clips only
- **30s AI timeout**: Prevents DoS on long processing
- **Address validation**: Web3.is_address() before blockchain calls
- **No stack traces**: All errors sanitized in API responses
- **Soulbound tokens**: Non-transferable (can't be sold/stolen)

## Smart Contract Details

### VoiceVault.sol

Main registry storing voice profiles:

```solidity
struct VoiceProfile {
  bytes helperString;   // Fuzzy extractor helper
  bytes32 commitment;   // SHA-256 commitment
  bytes32 salt;         // Enrollment salt
  uint256 registeredAt;
  bool isActive;
  uint256 reportCount;  // Fraud reports
}
```

**Key Functions**:
- `registerVoice()`: Register new voice profile
- `getVoiceProfile()`: Fetch profile data
- `revokeVoice()`: Deactivate profile
- `reportFraud()`: Increment report count

### VoiceIDSBT.sol

Soulbound token (non-transferable ERC-721):
- `_beforeTokenTransfer` reverts on transfers (only mint/burn allowed)
- On-chain metadata with base64-encoded JSON
- One token per address

### FraudRegistry.sol

Public fraud reporting system:
- Stores reports with evidence hash + description (max 200 chars)
- Queryable by suspect address
- Immutable on-chain audit trail

## Testing

### Health Check
```bash
curl http://localhost:5001/api/health
```

### Register Test
```bash
curl -X POST http://localhost:5001/api/register \
  -F 'audio=@path/to/test.wav'
```

### Contract Interaction
```bash
cd blockchain
npx hardhat console --network sepolia
> const VoiceVault = await ethers.getContractFactory('VoiceVault')
> const vault = await VoiceVault.attach('0xYourAddress')
> await vault.getRegisteredCount()
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Backend not starting | Check Python version (3.9+), activate venv, install dependencies |
| Model download fails | Set `MOCK_MODE=true` in backend/.env |
| MetaMask wrong network | Manually add Sepolia (Chain ID: 11155111) |
| Contract call fails | Verify addresses in `.env`, check Sepolia ETH balance |
| CORS errors | Ensure backend on 5001, frontend on 5173 |
| "UNCONFIGURED_NAME" | Contract addresses missing in frontend/.env |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check + model status |
| `/api/register` | POST | Register voice (returns helper/commitment/salt) |
| `/api/verify` | POST | Verify voice against profile |
| `/api/forensic` | POST | Detailed forensic analysis |
| `/api/get_profile` | GET | Fetch profile from blockchain |

## Project Structure

```
VoiceVault/
├── frontend/          # React + Vite frontend application
├── backend/           # Python Flask API server
├── blockchain/        # Solidity smart contracts + Hardhat
├── start.sh          # Start all services
├── stop.sh           # Stop all services
└── README.md         # This file
```

## Dependencies

### Frontend
- React 18+
- Vite 5+
- ethers.js v6
- Tailwind CSS

### Backend
- Flask 3.0+
- SpeechBrain (ECAPA-TDNN model)
- librosa (audio processing)
- web3.py (blockchain interaction)
- PyTorch 2.x

### Blockchain
- Hardhat 2.22+
- Solidity 0.8.20
- OpenZeppelin Contracts 4.9.6

## License

This project is built for educational and hackathon purposes. Refer to individual dependencies for their licenses.

## Acknowledgments

- SpeechBrain for ECAPA-TDNN voice embeddings
- OpenZeppelin for secure smart contract templates
- Hardhat for Ethereum development environment
- Sepolia testnet for free testing

## Demo

View deployed contracts on [Sepolia Etherscan](https://sepolia.etherscan.io/)

Built for decentralized identity. Powered by cryptography and machine learning.
