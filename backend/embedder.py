"""
Voice Embedder Module
Extracts 192-dimensional voice embeddings using SpeechBrain's ECAPA-TDNN model.
"""

import os
import threading
import numpy as np
import torch
import librosa
from typing import Any, Optional
from dotenv import load_dotenv

load_dotenv()


class VoiceEmbedder:
    """
    Singleton class for voice embedding extraction using ECAPA-TDNN.
    Loads the SpeechBrain model once and reuses it for all embedding requests.
    """
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(VoiceEmbedder, cls).__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        self._initialized = True
        self.model: Optional[Any] = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._model_lock = threading.Lock()
        
        # Get model cache directory from environment
        self.cache_dir = os.getenv("MODEL_CACHE_DIR", "./models")
        os.makedirs(self.cache_dir, exist_ok=True)
        
    def _load_model(self):
        """Lazy load the ECAPA-TDNN model."""
        if self.model is None:
            with self._model_lock:
                if self.model is None:
                    from speechbrain.inference.speaker import EncoderClassifier
                    
                    self.model = EncoderClassifier.from_hparams(
                        source="speechbrain/spkrec-ecapa-voxceleb",
                        savedir=os.path.join(self.cache_dir, "spkrec-ecapa-voxceleb"),
                        run_opts={"device": str(self.device)}
                    )
        return self.model
    
    def preprocess_audio(self, file_path: str) -> torch.Tensor:
        """
        Load and preprocess audio for embedding extraction.
        
        Args:
            file_path: Path to the audio file
            
        Returns:
            Preprocessed audio tensor of shape [1, samples]
            
        Raises:
            ValueError: If silence is detected (RMS energy < 0.01)
            FileNotFoundError: If the audio file doesn't exist
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Audio file not found: {file_path}")
        
        # Load audio at 16kHz mono
        audio, sr = librosa.load(file_path, sr=16000, mono=True)
        
        # DEBUG: Log raw audio stats
        print(f"[DEBUG EMBEDDER] Audio duration: {len(audio)/sr:.2f}s, samples: {len(audio)}")
        print(f"[DEBUG EMBEDDER] Raw audio - min: {audio.min():.4f}, max: {audio.max():.4f}, mean: {audio.mean():.6f}")
        
        # Normalize amplitude to [-1, 1]
        max_amplitude = np.max(np.abs(audio))
        if max_amplitude > 0:
            audio = audio / max_amplitude
        
        # Apply spectral noise gate (subtract mean spectral magnitude)
        # Compute STFT
        stft = librosa.stft(audio, n_fft=2048, hop_length=512)
        magnitude = np.abs(stft)
        
        # Compute mean spectral magnitude (noise floor estimate)
        mean_magnitude = np.mean(magnitude, axis=1, keepdims=True)
        
        # Subtract noise floor (spectral subtraction)
        magnitude_cleaned = np.maximum(magnitude - mean_magnitude * 0.5, 0)
        
        # Reconstruct audio with original phase
        phase = np.angle(stft)
        stft_cleaned = magnitude_cleaned * np.exp(1j * phase)
        audio = librosa.istft(stft_cleaned, hop_length=512)
        
        # Re-normalize after noise reduction
        max_amplitude = np.max(np.abs(audio))
        if max_amplitude > 0:
            audio = audio / max_amplitude
        
        # Silence detection: check RMS energy
        rms_energy = np.sqrt(np.mean(audio ** 2))
        print(f"[DEBUG EMBEDDER] After noise gate - RMS energy: {rms_energy:.4f}, max: {np.max(np.abs(audio)):.4f}")
        
        if rms_energy < 0.01:
            raise ValueError("Silence detected. Please re-record.")
        
        # Convert to torch tensor with shape [1, samples]
        audio_tensor = torch.tensor(audio, dtype=torch.float32).unsqueeze(0)
        
        return audio_tensor
    
    def get_embedding(self, file_path: str) -> np.ndarray:
        """
        Extract a 192-dimensional voice embedding from an audio file.
        
        Args:
            file_path: Path to the audio file
            
        Returns:
            L2-normalized numpy float32 array of shape (192,)
            
        Raises:
            RuntimeError: If model failed to load
        """
        # Preprocess audio
        audio_tensor = self.preprocess_audio(file_path)
        
        # Load model if not already loaded
        model = self._load_model()
        
        # CRITICAL: Verify model actually loaded
        if model is None:
            raise RuntimeError(
                "CRITICAL: SpeechBrain model failed to load. "
                "Set MOCK_MODE=true in .env or ensure speechbrain is properly installed."
            )
        
        # Move audio to device
        audio_tensor = audio_tensor.to(self.device)
        
        # Extract embedding (model is guaranteed non-None after _load_model)
        with torch.no_grad():
            embedding = model.encode_batch(audio_tensor)  # type: ignore
            
        # Convert to numpy and squeeze
        embedding = embedding.squeeze().cpu().numpy()
        
        # DEBUG: Log embedding before normalization
        print(f"[DEBUG EMBEDDER] Raw embedding shape: {embedding.shape}")
        print(f"[DEBUG EMBEDDER] Raw embedding - min: {embedding.min():.4f}, max: {embedding.max():.4f}, mean: {embedding.mean():.6f}")
        
        # L2 normalize
        norm = np.linalg.norm(embedding)
        print(f"[DEBUG EMBEDDER] Embedding L2 norm before normalization: {norm:.4f}")
        
        if norm > 0:
            embedding = embedding / norm
        else:
            print("[WARNING EMBEDDER] Zero norm embedding detected!")
        
        return embedding.astype(np.float32)
    
    @staticmethod
    def cosine_similarity(emb1: np.ndarray, emb2: np.ndarray) -> float:
        """
        Compute cosine similarity between two embeddings.
        
        Args:
            emb1: First embedding (numpy array)
            emb2: Second embedding (numpy array)
            
        Returns:
            Cosine similarity score between 0.0 and 1.0
        """
        # Ensure embeddings are normalized
        emb1_norm = emb1 / (np.linalg.norm(emb1) + 1e-10)
        emb2_norm = emb2 / (np.linalg.norm(emb2) + 1e-10)
        
        # Compute cosine similarity
        similarity = np.dot(emb1_norm, emb2_norm)
        
        # Clamp to [0, 1] range (cosine similarity can be negative for dissimilar vectors)
        # For voice verification, we map [-1, 1] to [0, 1]
        similarity = (similarity + 1.0) / 2.0
        
        return float(np.clip(similarity, 0.0, 1.0))


# Module-level singleton getter
def get_embedder() -> VoiceEmbedder:
    """Get the singleton VoiceEmbedder instance."""
    return VoiceEmbedder()
