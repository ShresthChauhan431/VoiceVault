"""
Voice Embedder Module
Extracts 192-dimensional voice embeddings using SpeechBrain's ECAPA-TDNN model.
"""

import os
import threading
import numpy as np
import torch
import librosa
from typing import Any, Optional, Dict
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
        self._model_loaded = False
        self._model_name = "speechbrain/spkrec-ecapa-voxceleb"
        self._embedding_dim = 192
        
        # Get model cache directory from environment
        self.cache_dir = os.getenv("MODEL_CACHE_DIR", "./models")
        
        # Auto-create cache directory if it doesn't exist
        if not os.path.exists(self.cache_dir):
            print(f"[EMBEDDER] Creating model cache directory: {self.cache_dir}")
            os.makedirs(self.cache_dir, exist_ok=True)
        
    def _load_model(self):
        """Lazy load the ECAPA-TDNN model."""
        if self.model is None:
            with self._model_lock:
                if self.model is None:
                    print(f"[EMBEDDER] Starting model load: {self._model_name}")
                    print(f"[EMBEDDER] Cache directory: {self.cache_dir}")
                    print(f"[EMBEDDER] Device: {self.device}")
                    
                    from speechbrain.inference.speaker import EncoderClassifier
                    
                    self.model = EncoderClassifier.from_hparams(
                        source=self._model_name,
                        savedir=os.path.join(self.cache_dir, "spkrec-ecapa-voxceleb"),
                        run_opts={"device": str(self.device)}
                    )
                    
                    print(f"[EMBEDDER] Model loaded successfully!")
                    
                    # Run self-test with silent 1-second dummy tensor
                    self._run_self_test()
                    
                    self._model_loaded = True
        return self.model
    
    def _run_self_test(self):
        """Run self-test to verify model produces correct embedding shape."""
        print("[EMBEDDER] Running self-test...")
        
        try:
            # Create a 1-second silent audio tensor (16kHz)
            dummy_audio = torch.zeros(1, 16000, dtype=torch.float32).to(self.device)
            
            # Add tiny noise to avoid complete silence
            dummy_audio += torch.randn_like(dummy_audio) * 0.001
            
            with torch.no_grad():
                test_embedding = self.model.encode_batch(dummy_audio)
            
            test_embedding = test_embedding.squeeze().cpu().numpy()
            
            if test_embedding.shape != (self._embedding_dim,):
                print(f"[EMBEDDER] WARNING: Expected embedding shape ({self._embedding_dim},), got {test_embedding.shape}")
                raise RuntimeError(f"Model self-test failed: expected shape ({self._embedding_dim},), got {test_embedding.shape}")
            
            print(f"[EMBEDDER] Self-test PASSED: embedding shape = {test_embedding.shape}")
            
        except Exception as e:
            print(f"[EMBEDDER] Self-test FAILED: {e}")
            raise RuntimeError(f"Model self-test failed: {e}")
    
    def get_model_status(self) -> Dict[str, Any]:
        """
        Get current model status.
        
        Returns:
            Dict with keys: loaded, model_name, embedding_dim
        """
        return {
            'loaded': self._model_loaded and self.model is not None,
            'model_name': self._model_name,
            'embedding_dim': self._embedding_dim
        }
    
    def preprocess_audio(self, file_path: str) -> torch.Tensor:
        """
        Load and preprocess audio for embedding extraction with strict standardization.
        
        Args:
            file_path: Path to the audio file
            
        Returns:
            Preprocessed audio tensor of shape [1, samples]
            
        Raises:
            ValueError: If audio too short after silence removal
            FileNotFoundError: If the audio file doesn't exist
            
        Note: This preprocessing is applied identically for both registration 
              and verification to ensure consistent embeddings.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Audio file not found: {file_path}")
        
        sr = 16000  # Target sample rate
        
        # Step 1: Load audio at exactly 16kHz mono
        audio, _ = librosa.load(file_path, sr=sr, mono=True)
        print(f"[EMBEDDER] Loaded audio: {len(audio)/sr:.2f}s, {len(audio)} samples")
        
        # Step 2: Trim leading and trailing silence
        audio, _ = librosa.effects.trim(audio, top_db=20)
        print(f"[EMBEDDER] After trim: {len(audio)/sr:.2f}s")
        
        # Step 3: Check minimum length (1 second)
        if len(audio) < sr:
            raise ValueError("Audio too short after silence removal. Please record at least 2 seconds of speech.")
        
        # Step 4: Normalize to consistent RMS level
        target_rms = 0.05
        current_rms = np.sqrt(np.mean(audio ** 2))
        if current_rms > 0:
            audio = audio * (target_rms / current_rms)
        audio = np.clip(audio, -1.0, 1.0)
        print(f"[EMBEDDER] After RMS normalization: rms={np.sqrt(np.mean(audio**2)):.4f}")
        
        # Step 5: If audio > 8 seconds, take middle 6 seconds
        if len(audio) > sr * 8:
            start = (len(audio) - sr * 6) // 2
            audio = audio[start: start + sr * 6]
            print(f"[EMBEDDER] Trimmed to middle 6s: {len(audio)/sr:.2f}s")
        
        # Step 6: Convert to torch tensor with shape [1, samples]
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
        
        Returns raw cosine similarity in [0.0, 1.0] range.
        Typical ECAPA-TDNN values:
            - Same speaker re-recording: 0.35-0.50
            - Different speaker: 0.15-0.30
            - AI clone of same speaker: 0.40-0.55 (often higher than real!)
            - Identical audio: 1.0
        """
        # Ensure embeddings are normalized
        emb1_norm = emb1 / (np.linalg.norm(emb1) + 1e-8)
        emb2_norm = emb2 / (np.linalg.norm(emb2) + 1e-8)
        
        # Compute raw cosine similarity (dot product of normalized vectors)
        raw = float(np.dot(emb1_norm, emb2_norm))
        
        # Clamp to [0, 1] - negative cosine means very different, treat as 0
        clamped = max(0.0, raw)
        
        print(f"[EMBEDDER] Cosine: raw={raw:.4f}, clamped={clamped:.4f}")
        return clamped


# Module-level singleton getter
def get_embedder() -> VoiceEmbedder:
    """Get the singleton VoiceEmbedder instance."""
    return VoiceEmbedder()
