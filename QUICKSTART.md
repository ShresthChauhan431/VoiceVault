# Voice Vault - Quick Reference Card

## 🚀 Quick Start Commands

### Option 1: Automated Start
```bash
./start.sh
```

### Option 2: Manual Start
```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
python app.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Then open: **http://localhost:5173**

---

## 🌐 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/register` | POST | Register voice (multipart/form-data) |
| `/api/verify` | POST | Verify voice against profile |
| `/api/forensic` | POST | Detailed deepfake analysis |
| `/api/get_profile` | GET | Get on-chain profile by address |

---

## 📝 Environment Variables

### Backend (.env in /backend/)
```bash
FLASK_PORT=5001
MOCK_MODE=true
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
CONTRACT_ADDRESS=0x...
PRIVATE_KEY=0x...  # For deployment only
```

### Frontend (.env in /frontend/)
```bash
VITE_BACKEND_URL=http://localhost:5001
VITE_CHAIN_ID=11155111
VITE_CONTRACT_ADDRESS=0x...
VITE_SBT_ADDRESS=0x...
VITE_FRAUD_REGISTRY_ADDRESS=0x...
```

---

## 🔗 Smart Contract Addresses (Sepolia)

After deployment, update these in both .env files:

- **VoiceVault**: Main registry
- **VoiceIDSBT**: Soulbound token
- **FraudRegistry**: Fraud reports

Find in: `blockchain/deployedAddresses.json`

---

## 🧪 Testing Workflows

### 1. Register Voice
1. Navigate to Register page
2. Connect MetaMask (switch to Sepolia)
3. Record voice (3+ seconds)
4. Click "Register My Voice"
5. Confirm MetaMask transaction
6. Wait 15-30s for confirmation

### 2. Verify Voice
1. Navigate to Verify page
2. Enter target address (or use own)
3. Record voice sample
4. Click "Verify Voice"
5. View authentication result

### 3. Report Fraud
1. Navigate to Fraud Registry
2. Enter suspect address
3. Add description (max 200 chars)
4. Submit report
5. Confirm transaction

---

## 🐛 Common Issues & Fixes

### Backend won't start
```bash
# Check if port 5001 is in use
lsof -ti:5001 | xargs kill -9

# Reinstall dependencies
cd backend
pip install -r requirements.txt
```

### Frontend CORS error
Check backend/.env:
```bash
FLASK_PORT=5001  # Must match
```

Check frontend/.env:
```bash
VITE_BACKEND_URL=http://localhost:5001
```

### MetaMask wrong network
- Chain ID must be: `11155111` (Sepolia)
- App will prompt to switch automatically
- Or switch manually in MetaMask

### Model fails to load
Set in backend/.env:
```bash
MOCK_MODE=true
```

Then restart Flask.

### Contract call fails
1. Check contract addresses in both .env files
2. Verify you're on Sepolia network
3. Check you have Sepolia ETH
4. View transaction on Etherscan for details

---

## 📊 Port Configuration

| Service | Port | URL |
|---------|------|-----|
| Flask Backend | 5001 | http://localhost:5001 |
| Vite Frontend | 5173 | http://localhost:5173 |
| Hardhat Node | 8545 | (optional local testing) |

**Note**: Port 5000 blocked by macOS AirPlay, using 5001 instead.

---

## 🔐 Security Features

✅ Audio stored in RAM only (SpooledTemporaryFile)  
✅ 10MB file size limit  
✅ 1-60 second duration validation  
✅ Strict MIME type whitelist  
✅ 30-second AI processing timeout  
✅ Ethereum address validation  
✅ No stack traces in API responses  
✅ Memory cleanup with gc.collect()  

---

## 📚 Documentation Files

- **README.md**: Full setup guide
- **SUMMARY.md**: Project overview
- **TESTING_CHECKLIST.md**: QA checklist
- **start.sh**: Quick start script

---

## 🔧 Build Commands

### Compile Contracts
```bash
cd blockchain
npx hardhat compile
```

### Deploy to Sepolia
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network sepolia
```

### Build Frontend
```bash
cd frontend
npm run build
```

### Run Backend Tests (if implemented)
```bash
cd backend
pytest
```

---

## 💡 Key Concepts

### Fuzzy Extractor
Generates cryptographic key from biometric data with error tolerance.

### Commitment
SHA-256 hash stored on-chain. Reveals nothing about voice, but proves enrollment.

### Soulbound Token (SBT)
Non-transferable NFT proving identity ownership.

### Helper String
Public data allowing key regeneration during verification.

---

## 🎯 Success Metrics

Voice Vault is working correctly when:

✅ Backend health check returns `{"status": "ok"}`  
✅ MetaMask connects and switches to Sepolia  
✅ Voice registration completes with TX hash  
✅ Etherscan shows transaction confirmed  
✅ Verification returns score (0-100)  
✅ Fraud reports appear in registry  

---

## 🆘 Support

**Issues Found?**

1. Check TESTING_CHECKLIST.md
2. Review error in browser console (F12)
3. Check Flask terminal output
4. Verify .env configuration
5. Ensure Sepolia ETH in wallet

**Still stuck?**

Check the full README.md for detailed troubleshooting.

---

**Last Updated**: 2026-04-03  
**Version**: 1.0.0  
**Status**: Production-ready for demo ✅
