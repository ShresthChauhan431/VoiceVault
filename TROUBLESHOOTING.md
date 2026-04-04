# Voice Vault Troubleshooting Guide

Quick fixes for common issues with the Voice Vault validation pipeline.

---

## Connection Errors

### "Connection refused" (Port 5001)

**Symptom:**
```
HTTPConnectionPool(host='localhost', port=5001): Failed to establish a new connection: [Errno 61] Connection refused
```

**Solution:**
```bash
cd backend
source venv/bin/activate
export MOCK_MODE=false
python3 app.py
```

Wait for ` AI models loaded successfully!` before running the validator.

---

### "RemoteDisconnected" during enrollment

**Symptom:**
```
('Connection aborted.', RemoteDisconnected('Remote end closed connection without response'))
```

**Cause:** Model loading timeout during first request.

**Solution:** We fixed this by adding eager model loading at startup. If it recurs:

1. Check Flask terminal for errors
2. Ensure ` AI models loaded successfully!` appears before making requests
3. If model loading fails, check disk space and memory

---

## Model Loading Issues

### "Model loaded: False" in health check

**Symptom:**
```
Model loaded: False
```

**Possible Causes:**
1. Model files not downloaded
2. HuggingFace cache corrupted
3. MOCK_MODE=true

**Solution:**
```bash
# Check model files exist
ls -la backend/models/spkrec-ecapa-voxceleb/

# Clear and re-download
rm -rf backend/models/spkrec-ecapa-voxceleb/
rm -rf ~/.cache/huggingface/hub/models--speechbrain--spkrec-ecapa-voxceleb/

# Restart Flask (will auto-download)
cd backend && python3 app.py
```

---

### Flask crashes on "Restarting with stat"

**Symptom:**
```
ImportError: Lazy import of LazyModule(...k2_fsa...) failed
```

**Cause:** Flask debug reloader triggers SpeechBrain k2 import bug.

**Solution:** We fixed this by adding `use_reloader=False`. Verify:
```python
# In backend/app.py line 1149:
app.run(host='0.0.0.0', port=FLASK_PORT, debug=True, use_reloader=False)
```

---

## Accuracy Issues

### TAR too low (genuine users rejected)

**Symptom:**
```
True Acceptance Rate (TAR): 0.0%
```

**Solution:** Lower the threshold:
```bash
python3 validate_accuracy.py --threshold 0.50
```

**Why this happens:**
- Different recording conditions between enrollment and verification
- Background noise differences
- Microphone variations

---

### All samples marked as "Deepfake"

**Symptom:**
```
Status: Deepfake
Liveness: 0.0000
```

**Explanation:** The liveness detector is sensitive. For hackathon demos:
- This is expected behavior for pre-recorded audio files
- Real-time microphone recordings should score higher
- The system is designed to be conservative (reject suspicious audio)

---

## Environment Issues

### PEP 668: "externally-managed-environment"

**Symptom:**
```
error: externally-managed-environment
```

**Solution:** Use the backend venv:
```bash
source backend/venv/bin/activate
python3 validate_accuracy.py
```

---

### Missing 'requests' library

**Symptom:**
```
ModuleNotFoundError: No module named 'requests'
```

**Solution:**
```bash
source backend/venv/bin/activate
# requests is already installed in backend venv
```

---

## Quick Health Check

Run this to verify everything is working:

```bash
# Terminal 1: Start backend
cd backend
source venv/bin/activate
export MOCK_MODE=false
python3 app.py

# Terminal 2: Test health
curl http://localhost:5001/api/health

# Expected output:
# {"mock_mode":false,"model_loaded":true,"status":"ok","version":"2.0"}
```

---

## Rollback Changes

If something breaks, restore original files:

```bash
# Restore app.py startup (remove eager loading)
# Change line 1149 back to:
app.run(host='0.0.0.0', port=FLASK_PORT, debug=True)

# And remove lines 1137-1147 (the model preload block)
```

---

## Emergency: Use Mock Mode

If AI models won't load and you need a demo immediately:

```bash
cd backend
export MOCK_MODE=true
python3 app.py
```

Note: Mock mode returns simulated scores, not real biometric analysis.

---

## Contact

For hackathon support, check the project README or raise an issue.
