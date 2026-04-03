# Test Audio Files for Voice Vault Validation

This directory contains audio samples for validating Voice Vault's accuracy.

## Required Files

| Filename | Purpose | Description |
|----------|---------|-------------|
| `userA_real_1.wav` | **Enrollment** | Primary voice sample for User A (3-10 seconds) |
| `userA_real_2.wav` | Genuine Test | Different recording of User A (same person) |
| `userB_imposter.wav` | Imposter Test | Recording of a different person (User B) |
| `deepfake_A_clone.wav` | Deepfake Test | AI-generated clone of User A's voice |

## Optional Files (for extended testing)

| Filename | Purpose |
|----------|---------|
| `userA_real_3.wav` | Additional genuine sample |
| `userA_real_4.wav` | Additional genuine sample |
| `userC_imposter.wav` | Additional imposter (third person) |
| `userD_imposter.wav` | Additional imposter (fourth person) |
| `deepfake_A_clone_2.wav` | Additional deepfake sample |

## Audio Requirements

- **Format**: WAV or MP3 (WAV preferred)
- **Duration**: 3-10 seconds of clear speech
- **Quality**: 16kHz+ sample rate, mono or stereo
- **Content**: Speaking naturally (any words/phrases)
- **Environment**: Quiet room, minimal background noise

## Recording Tips

1. **Enrollment Sample** (userA_real_1.wav):
   - Record in a quiet room
   - Speak clearly for 5+ seconds
   - This is your "ground truth" reference

2. **Genuine Test Sample** (userA_real_2.wav):
   - Same person as enrollment
   - Record at a different time/session
   - Slightly different tone is okay (this tests tolerance)

3. **Imposter Samples** (userB_imposter.wav, userC_imposter.wav):
   - Different people
   - Record in similar conditions to enrollment
   - Speak similar duration

4. **Deepfake Sample** (deepfake_A_clone.wav):
   - AI-generated voice cloning User A
   - Can be created using services like:
     - ElevenLabs
     - Resemble.ai
     - VALL-E (open source)
   - Should sound like User A but is synthetic

## Running the Validation

```bash
# From project root directory
cd /path/to/VoiceVault

# Ensure backend is running with MOCK_MODE=false
cd backend && source venv/bin/activate
export MOCK_MODE=false
python app.py

# In another terminal, run validation
cd /path/to/VoiceVault
python validate_accuracy.py

# Or with custom options
python validate_accuracy.py --backend-url http://localhost:5001 --threshold 0.75
```

## Expected Results

For a well-functioning system:

| Test Type | Expected Score | Expected Status |
|-----------|----------------|-----------------|
| Genuine (userA_real_2) | >75% | Authentic |
| Imposter (userB_imposter) | <50% | Deepfake |
| Deepfake (deepfake_A_clone) | <60% | Deepfake |

## Troubleshooting

### Low Genuine Scores
- Re-record enrollment with clearer audio
- Ensure quiet environment
- Check microphone quality

### High Imposter Scores
- Verify MOCK_MODE=false in backend
- Check that imposters are truly different people
- Review backend logs for embedding values

### Files Not Found
- Ensure filenames match exactly (case-sensitive)
- Files must be in `test_audio/` directory
- Check file extensions (.wav not .WAV)

## Generated Files

After running validation, these files are created:

| File | Description |
|------|-------------|
| `enrollment_data.json` | Enrollment credentials (helper_string, commitment, salt) |
| `accuracy_report.md` | Full validation report with metrics |

---

*Voice Vault Accuracy Validation Pipeline*
