"""
Deepfake Detection Module
Analyzes audio for signs of synthetic or manipulated voice.
Uses acoustic features to distinguish real voices from AI-generated ones.
"""

import os
import numpy as np
import librosa
from typing import Dict, Any


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
        
        Args:
            file_path: Path to audio file
            
        Returns:
            dict with keys:
                - liveness_score: float 0-1 (higher = more likely real)
                - artifact_score: float 0-1 (higher = more artifacts)
                - deepfake_probability: float 0-1 (higher = more likely fake)
                - is_likely_deepfake: bool
                - details: dict with all analysis details
        """
        # Run both analyses
        liveness_result = self.analyze_liveness(file_path)
        spectral_result = self.spectral_artifact_check(file_path)
        
        liveness_score = liveness_result['liveness_score']
        artifact_score = spectral_result['artifact_score']
        
        # Guaranteed floor — browser mic opus/webm compression
        # causes artificially low jitter/shimmer scores
        # Floor only applies when spectral artifacts are low
        # meaning it is likely a real compressed recording
        try:
            spectral_check = spectral_result.get('artifact_score', 1.0)
            if liveness_score < 0.30 and spectral_check < 0.25:
                liveness_score = 0.30
        except Exception:
            if liveness_score < 0.30:
                liveness_score = 0.30
        
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[LIVENESS] raw={liveness_result['liveness_score']:.3f} "
                    f"artifact={spectral_check:.3f} "
                    f"final={liveness_score:.3f}")
        
        # Combine scores: deepfake_probability = (1 - liveness_score)*0.6 + artifact_score*0.4
        deepfake_probability = (1 - liveness_score) * 0.6 + artifact_score * 0.4
        deepfake_probability = float(np.clip(deepfake_probability, 0.0, 1.0))
        
        # Threshold for classification
        is_likely_deepfake = deepfake_probability > 0.5
        
        return {
            'liveness_score': liveness_score,
            'artifact_score': artifact_score,
            'deepfake_probability': deepfake_probability,
            'is_likely_deepfake': is_likely_deepfake,
            'details': {
                'jitter': liveness_result['jitter'],
                'shimmer': liveness_result['shimmer'],
                'hnr': liveness_result['hnr'],
                'mfcc_delta_cv': spectral_result.get('mfcc_delta_cv', 0),
                'spectral_flatness_std': spectral_result.get('spectral_flatness_std', 0),
                'spectral_suspicious': spectral_result['suspicious']
            }
        }


# Convenience function
def create_detector() -> DeepfakeDetector:
    """Create a new DeepfakeDetector instance."""
    return DeepfakeDetector()
