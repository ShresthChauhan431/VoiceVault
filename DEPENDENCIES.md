# Voice Vault Dependencies

## Backend (Flask API)

Located in `backend/venv`. Install with:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Required Packages

| Package | Version | Purpose |
|---------|---------|---------|
| flask | latest | Web framework |
| flask-cors | latest | CORS support |
| librosa | latest | Audio processing |
| speechbrain | 1.1.0+ | ECAPA-TDNN voice embeddings |
| torch | 2.0+ | Deep learning framework |
| torchaudio | 2.0+ | Audio processing for PyTorch |
| numpy | latest | Numerical computing |
| scipy | latest | Scientific computing |
| web3 | latest | Ethereum interaction |
| python-dotenv | latest | Environment variables |
| soundfile | latest | Audio file I/O |
| pydub | latest | Audio manipulation |

## Validation Script

The `validate_accuracy.py` script uses the backend venv:

```bash
source backend/venv/bin/activate
python3 validate_accuracy.py
```

### macOS Notes (PEP 668)

macOS restricts system Python modifications. Use one of these approaches:

**Option A: Use Backend venv (Recommended)**
```bash
source backend/venv/bin/activate
python3 validate_accuracy.py
```

**Option B: Create Separate venv**
```bash
python3 -m venv validation-venv
source validation-venv/bin/activate
pip install requests numpy scipy
python3 validate_accuracy.py
```

**Option C: Override System Protection (Not Recommended)**
```bash
python3 -m pip install --break-system-packages requests numpy scipy
```

## Model Files

The SpeechBrain ECAPA-TDNN model is downloaded automatically on first run:
- Location: `backend/models/spkrec-ecapa-voxceleb/`
- Size: ~90MB
- Source: HuggingFace Hub

Model files are symlinked to `~/.cache/huggingface/hub/` for efficiency.

## Verification

Test that all dependencies are installed:

```bash
cd backend
source venv/bin/activate
python3 -c "
import torch
import speechbrain
import librosa
import numpy
import scipy
print('PyTorch:', torch.__version__)
print('SpeechBrain:', speechbrain.__version__)
print('All dependencies OK')
"
```
