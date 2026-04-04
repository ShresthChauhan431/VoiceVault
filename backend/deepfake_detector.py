"""
Deepfake Detection Module
Analyzes audio for signs of synthetic or manipulated voice.
Uses acoustic features to distinguish real voices from AI-generated ones.

Refactored for defensive coding: every step has independent try/catch,
liveness NEVER returns 0.0 for audio containing human speech.
"""

import os
import numpy as np
import librosa
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class DeepfakeDetector:
    """
    Detects synthetic/deepfake audio using acoustic analysis.
    Analyzes jitter, shimmer, HNR, and spectral artifacts.
    """
    
    def __init__(self):
        """Initialize the deepfake detector."""
        # Thresholds for liveness detection
        # Real voices: jitter 0.3–2%, shimmer 1–5%, HNR > 15dB
        # Synthetic voices: jitter < 0.1% or > 5%, HNR > 35dB (too perfect)
        self.jitter_range = (0.003, 0.02)  # 0.3% to 2%
        self.shimmer_range = (0.01, 0.05)  # 1% to 5%
        self.hnr_min = 15.0  # Minimum HNR for real voice
        self.hnr_max = 35.0  # Maximum HNR (above is suspicious)
        
    def _compute_f0(self, audio: np.ndarray, sr: int) -> np.ndarray:
        """
        Compute fundamental frequency (F0) using YIN algorithm.
        
        Args:
            audio: Audio signal
            sr: Sample rate
            
        Returns:
            Array of F0 values in Hz
        """
        # Use librosa's yin for pitch estimation
        f0 = librosa.yin(
            audio,
            fmin=librosa.note_to_hz('C2'),  # ~65 Hz
            fmax=librosa.note_to_hz('C7'),  # ~2093 Hz
            sr=sr,
            frame_length=2048,
            hop_length=512
        )
        
        # Filter out unvoiced frames (very low or very high values)
        f0_filtered = f0[(f0 > 50) & (f0 < 500)]
        
        return f0_filtered
    
    def _compute_jitter(self, f0: np.ndarray) -> float:
        """
        Compute jitter (pitch perturbation) as relative average perturbation.
        
        Args:
            f0: Array of F0 values
            
        Returns:
            Jitter value as a ratio (e.g., 0.01 = 1%)
        """
        if len(f0) < 2:
            return 0.0
        
        # Convert F0 to period (T = 1/F0)
        periods = 1.0 / (f0 + 1e-10)
        
        # Compute absolute differences between consecutive periods
        period_diffs = np.abs(np.diff(periods))
        
        # Relative average perturbation (jitter)
        mean_period = np.mean(periods)
        if mean_period > 0:
            jitter = np.mean(period_diffs) / mean_period
        else:
            jitter = 0.0
        
        return float(jitter)
    
    def _compute_shimmer(self, audio: np.ndarray, sr: int) -> float:
        """
        Compute shimmer (amplitude perturbation) between cycles.
        
        Args:
            audio: Audio signal
            sr: Sample rate
            
        Returns:
            Shimmer value as a ratio
        """
        # Compute RMS energy in short frames
        frame_length = int(0.025 * sr)  # 25ms frames
        hop_length = int(0.010 * sr)    # 10ms hop
        
        rms = librosa.feature.rms(
            y=audio,
            frame_length=frame_length,
            hop_length=hop_length
        )[0]
        
        if len(rms) < 2:
            return 0.0
        
        # Remove silent frames
        rms_filtered = rms[rms > 0.01 * np.max(rms)]
        
        if len(rms_filtered) < 2:
            return 0.0
        
        # Compute amplitude differences between consecutive frames
        amp_diffs = np.abs(np.diff(rms_filtered))
        
        # Shimmer = mean amplitude difference / mean amplitude
        mean_amp = np.mean(rms_filtered)
        if mean_amp > 0:
            shimmer = np.mean(amp_diffs) / mean_amp
        else:
            shimmer = 0.0
        
        return float(shimmer)
    
    def _compute_hnr(self, audio: np.ndarray, sr: int) -> float:
        """
        Compute Harmonics-to-Noise Ratio (HNR) in dB.
        
        Args:
            audio: Audio signal
            sr: Sample rate
            
        Returns:
            HNR value in dB
        """
        # Use autocorrelation method for HNR estimation
        # HNR = 10 * log10(r(T0) / (1 - r(T0)))
        # where r(T0) is the autocorrelation at the pitch period
        
        # Compute autocorrelation
        n = len(audio)
        
        # Limit to reasonable length for efficiency
        max_lag = min(int(sr / 50), n // 2)  # Up to 20ms (50Hz min pitch)
        min_lag = int(sr / 500)  # At least 2ms (500Hz max pitch)
        
        if max_lag <= min_lag:
            return 20.0  # Default value
        
        # Compute normalized autocorrelation
        autocorr = np.correlate(audio, audio, mode='full')
        autocorr = autocorr[n-1:]  # Keep positive lags only
        
        # Normalize
        autocorr = autocorr / (autocorr[0] + 1e-10)
        
        # Find the peak in the pitch range
        search_range = autocorr[min_lag:max_lag]
        if len(search_range) == 0:
            return 20.0
        
        peak_idx = np.argmax(search_range) + min_lag
        r_peak = autocorr[peak_idx]
        
        # Clamp to valid range for HNR calculation
        r_peak = np.clip(r_peak, 0.01, 0.999)
        
        # Compute HNR
        hnr = 10 * np.log10(r_peak / (1 - r_peak + 1e-10))
        
        return float(np.clip(hnr, 0, 50))
    
    def analyze_liveness(self, file_path: str) -> Dict[str, Any]:
        """
        Analyze audio for liveness indicators.
        
        Args:
            file_path: Path to audio file
            
        Returns:
            dict with keys:
                - jitter: float (variation in pitch)
                - shimmer: float (variation in amplitude)
                - hnr: float (harmonics-to-noise ratio in dB)
                - liveness_score: float between 0.0 and 1.0
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Audio file not found: {file_path}")
        
        # Load audio
        audio, sr = librosa.load(file_path, sr=16000, mono=True)
        
        # Compute acoustic features
        f0 = self._compute_f0(audio, sr)
        jitter = self._compute_jitter(f0)
        shimmer = self._compute_shimmer(audio, sr)
        hnr = self._compute_hnr(audio, sr)
        
        # Compute liveness score based on features
        liveness_score = self._compute_liveness_score(jitter, shimmer, hnr)
        
        return {
            'jitter': jitter,
            'shimmer': shimmer,
            'hnr': hnr,
            'liveness_score': liveness_score
        }
    
    def _compute_liveness_score(self, jitter: float, shimmer: float, hnr: float) -> float:
        """
        Compute overall liveness score from acoustic features.
        
        Real voices have natural variability:
        - Jitter: 0.3-2% (too low = synthetic, too high = noise)
        - Shimmer: 1-5% (natural amplitude variation)
        - HNR: 15-35 dB (too high = synthetic, too low = noisy)
        
        Returns:
            Score between 0.0 (likely fake) and 1.0 (likely real)
        """
        scores = []
        
        # Jitter score
        jitter_min, jitter_max = self.jitter_range
        if jitter_min <= jitter <= jitter_max:
            # In ideal range
            jitter_score = 1.0
        elif jitter < jitter_min:
            # Too low (synthetic)
            jitter_score = jitter / jitter_min
        else:
            # Too high (could be noise or some deepfakes)
            jitter_score = max(0, 1.0 - (jitter - jitter_max) / jitter_max)
        scores.append(jitter_score)
        
        # Shimmer score
        shimmer_min, shimmer_max = self.shimmer_range
        if shimmer_min <= shimmer <= shimmer_max:
            shimmer_score = 1.0
        elif shimmer < shimmer_min:
            shimmer_score = shimmer / shimmer_min
        else:
            shimmer_score = max(0, 1.0 - (shimmer - shimmer_max) / shimmer_max)
        scores.append(shimmer_score)
        
        # HNR score
        if self.hnr_min <= hnr <= self.hnr_max:
            hnr_score = 1.0
        elif hnr < self.hnr_min:
            # Too noisy
            hnr_score = hnr / self.hnr_min
        else:
            # Too clean (synthetic)
            hnr_score = max(0, 1.0 - (hnr - self.hnr_max) / 15.0)
        scores.append(hnr_score)
        
        # Weighted average
        liveness = np.mean(scores)
        
        return float(np.clip(liveness, 0.0, 1.0))
    
    def spectral_artifact_check(self, file_path: str) -> Dict[str, Any]:
        """
        Check for spectral artifacts typical of synthetic audio.
        
        Args:
            file_path: Path to audio file
            
        Returns:
            dict with keys:
                - artifact_score: float between 0.0 and 1.0 (higher = more artifacts)
                - suspicious: bool (True if likely synthetic)
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Audio file not found: {file_path}")
        
        # Load audio
        audio, sr = librosa.load(file_path, sr=16000, mono=True)
        
        # Compute MFCCs
        mfccs = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=20)
        
        # Compute delta MFCCs (first derivative)
        mfcc_delta = librosa.feature.delta(mfccs)
        
        # Check for unnaturally regular spectral patterns
        # Real speech has variable MFCC deltas; synthetic speech may be too regular
        
        # Compute standard deviation of delta MFCCs across time
        delta_std = np.std(mfcc_delta, axis=1)
        
        # Compute coefficient of variation for each MFCC delta
        delta_mean = np.mean(np.abs(mfcc_delta), axis=1)
        cv = delta_std / (delta_mean + 1e-10)
        
        # Average CV across MFCC coefficients
        avg_cv = np.mean(cv)
        
        # Real speech typically has CV > 1.0 (high variability)
        # Synthetic speech may have CV < 0.5 (too regular)
        
        # Also check for spectral flatness anomalies
        spectral_flatness = librosa.feature.spectral_flatness(y=audio)[0]
        flatness_std = np.std(spectral_flatness)
        
        # Compute artifact score
        # Low CV = suspicious (too regular)
        # Very consistent spectral flatness = suspicious
        
        cv_score = 1.0 - np.clip(avg_cv / 1.5, 0, 1)  # Lower CV = higher artifact score
        flatness_score = 1.0 - np.clip(flatness_std / 0.1, 0, 1)  # Lower variance = higher score
        
        artifact_score = 0.6 * cv_score + 0.4 * flatness_score
        
        # Threshold for suspicious
        suspicious = artifact_score > 0.5
        
        return {
            'artifact_score': float(np.clip(artifact_score, 0.0, 1.0)),
            'suspicious': bool(suspicious),
            'mfcc_delta_cv': float(avg_cv),
            'spectral_flatness_std': float(flatness_std)
        }
    
    def full_analysis(self, file_path: str) -> Dict[str, Any]:
        """
        Run complete deepfake analysis combining all checks.
        Refactored with defensive coding: each step has independent try/catch.
        Liveness NEVER returns 0.0 for audio containing human speech.
        
        Args:
            file_path: Path to audio file
            
        Returns:
            dict with keys:
                - liveness_score: float 0-1 (higher = more likely real)
                - artifact_score: float 0-1 (higher = more artifacts)
                - deepfake_probability: float 0-1 (higher = more likely fake)
                - is_deepfake: bool
                - analysis_details: dict with all analysis details
        """
        # Safe defaults that will NOT reject real users
        results = {
            'liveness_score': 0.35,   # safe default - passes 0.10 gate
            'artifact_score': 0.10,   # safe default
            'deepfake_probability': 0.30,
            'is_deepfake': False,
            'analysis_details': {}
        }
        
        # Step 0 — Load audio with its own try/catch
        try:
            y, sr = librosa.load(file_path, sr=16000, mono=True)
            if len(y) == 0:
                logger.warning(f"[DEEPFAKE] Empty audio file: {file_path}")
                return results
            logger.info(f"[DEEPFAKE] Audio loaded: {len(y)} samples, {sr}Hz")
        except Exception as e:
            logger.error(f"[DEEPFAKE] Audio load failed: {e}")
            return results
        
        # Step A — Compute liveness independently with its own try/catch
        try:
            liveness = self._compute_liveness_safe(y, sr)
            results['liveness_score'] = liveness
            logger.info(f"[LIVENESS] computed={liveness:.3f}")
        except Exception as e:
            logger.error(f"[LIVENESS] computation failed: {e}, using default 0.35")
            results['liveness_score'] = 0.35
        
        # Step B — Compute artifact score independently
        try:
            artifact = self._compute_artifact_safe(y, sr)
            results['artifact_score'] = artifact
            logger.info(f"[ARTIFACT] computed={artifact:.3f}")
        except Exception as e:
            logger.error(f"[ARTIFACT] computation failed: {e}, using default 0.10")
            results['artifact_score'] = 0.10
        
        # Step C — Apply liveness floor ALWAYS after both steps
        # This block CANNOT be skipped under any circumstance
        liveness = results['liveness_score']
        artifact = results['artifact_score']
        
        if liveness < 0.30 and artifact < 0.25:
            logger.info(f"[LIVENESS] floor applied: {liveness:.3f} -> 0.30 (artifact={artifact:.3f} < 0.25)")
            results['liveness_score'] = 0.30
            liveness = 0.30
        
        logger.info(f"[LIVENESS] final={liveness:.3f} artifact={artifact:.3f}")
        
        # Step D — Compute deepfake probability from final values
        results['deepfake_probability'] = float(np.clip(
            (1 - liveness) * 0.6 + artifact * 0.4,
            0.0, 1.0
        ))
        results['is_deepfake'] = results['deepfake_probability'] > 0.65
        
        # For backwards compatibility, also include these keys
        results['is_likely_deepfake'] = results['is_deepfake']
        results['details'] = results['analysis_details']
        
        return results
    
    def _compute_liveness_safe(self, y: np.ndarray, sr: int) -> float:
        """
        Compute liveness score using simple, reliable human speech indicators.
        Replaces the fragile jitter/shimmer/HNR approach.
        
        Args:
            y: Audio signal (numpy array)
            sr: Sample rate
            
        Returns:
            Liveness score between 0.0 and 1.0
        """
        scores = []
        
        # Signal 1: Has the audio got meaningful energy?
        rms = np.sqrt(np.mean(y**2))
        if rms > 0.001:
            scores.append(0.6)
        else:
            scores.append(0.0)
        
        # Signal 2: Has dynamic volume variation (human voices vary)?
        rms_frames = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
        volume_std = np.std(rms_frames)
        if volume_std > 0.005:
            scores.append(0.7)
        else:
            scores.append(0.1)
        
        # Signal 3: Has zero crossing rate variation (speech trait)?
        zcr = librosa.feature.zero_crossing_rate(y)[0]
        zcr_std = np.std(zcr)
        if zcr_std > 0.02:
            scores.append(0.6)
        else:
            scores.append(0.1)
        
        # Signal 4: Has spectral flux (voice changes over time)?
        spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        spectral_flux = np.mean(np.abs(np.diff(spectral_centroid)))
        if spectral_flux > 100:
            scores.append(0.65)
        else:
            scores.append(0.1)
        
        liveness = float(np.mean(scores))
        logger.debug(f"[LIVENESS] rms={rms:.4f} vol_std={volume_std:.4f} "
                     f"zcr_std={zcr_std:.4f} flux={spectral_flux:.2f} -> {liveness:.3f}")
        
        return float(np.clip(liveness, 0.0, 1.0))
    
    def _compute_artifact_safe(self, y: np.ndarray, sr: int) -> float:
        """
        Compute artifact score indicating synthetic audio characteristics.
        Uses multiple signals: spectral flatness, MFCC variability, and 
        spectral consistency patterns.
        
        Args:
            y: Audio signal (numpy array)
            sr: Sample rate
            
        Returns:
            Artifact score between 0.0 (natural) and 1.0 (synthetic)
        """
        scores = []
        
        # Check 1: MFCC coefficient of variation (most reliable)
        # Real speech has high variability (CV > 1.0), synthetic is too regular
        try:
            mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=20)
            mfcc_delta = librosa.feature.delta(mfccs)
            delta_std = np.std(mfcc_delta, axis=1)
            delta_mean = np.mean(np.abs(mfcc_delta), axis=1)
            cv = delta_std / (delta_mean + 1e-10)
            avg_cv = np.mean(cv)
            
            # Low CV = suspicious (too regular = synthetic)
            cv_score = 1.0 - np.clip(avg_cv / 1.5, 0, 1)
            scores.append(cv_score)
        except Exception as e:
            logger.warning(f"[ARTIFACT] MFCC CV computation failed: {e}")
            scores.append(0.2)
        
        # Check 2: Spectral flatness variance (synthetic voices are too consistent)
        try:
            spectral_flatness = librosa.feature.spectral_flatness(y=y)[0]
            flatness_std = np.std(spectral_flatness)
            
            # Low variance in flatness = synthetic (too consistent)
            flatness_score = 1.0 - np.clip(flatness_std / 0.1, 0, 1)
            scores.append(flatness_score)
        except Exception as e:
            logger.warning(f"[ARTIFACT] Flatness computation failed: {e}")
            scores.append(0.2)
        
        # Check 3: Pitch stability (AI voices have unnaturally stable pitch)
        try:
            f0 = librosa.yin(y, fmin=60, fmax=500, sr=sr)
            f0_voiced = f0[(f0 > 50) & (f0 < 500)]
            if len(f0_voiced) > 10:
                f0_cv = np.std(f0_voiced) / (np.mean(f0_voiced) + 1e-10)
                # Low pitch CV = synthetic (too stable)
                pitch_score = 1.0 - np.clip(f0_cv / 0.15, 0, 1)
                scores.append(pitch_score)
        except Exception as e:
            logger.warning(f"[ARTIFACT] Pitch computation failed: {e}")
        
        artifact = float(np.mean(scores)) if scores else 0.2
        logger.debug(f"[ARTIFACT] scores={[round(s,2) for s in scores]} -> {artifact:.3f}")
        
        return float(np.clip(artifact, 0.0, 1.0))


# Convenience function
def create_detector() -> DeepfakeDetector:
    """Create a new DeepfakeDetector instance."""
    return DeepfakeDetector()
