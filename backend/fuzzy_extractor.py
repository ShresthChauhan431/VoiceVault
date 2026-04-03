"""
Voice Fuzzy Extractor Module
Implements fuzzy commitment scheme for voice biometric verification.
Allows verification with some tolerance for voice variations.
"""

import os
import hashlib
import secrets
import numpy as np

# Try to import fuzzy_extractor library
try:
    from fuzzy_extractor import FuzzyExtractor
    FUZZY_EXTRACTOR_AVAILABLE = True
except ImportError:
    FUZZY_EXTRACTOR_AVAILABLE = False


class VoiceFuzzyExtractor:
    """
    Implements fuzzy commitment for voice biometrics.
    Converts continuous voice embeddings to binary strings and uses
    error-correcting codes to allow verification with tolerance.
    """
    
    def __init__(self, embedding_dim: int = 192, hamming_threshold: int = 20):
        """
        Initialize the fuzzy extractor.
        
        Args:
            embedding_dim: Dimension of voice embeddings (default: 192 for ECAPA-TDNN)
            hamming_threshold: Maximum Hamming distance for fallback matching (default: 20)
        """
        self.embedding_dim = embedding_dim
        self.hamming_threshold = hamming_threshold
        
        # Initialize fuzzy extractor if available
        # Using Reed-Solomon error correction with reasonable parameters
        if FUZZY_EXTRACTOR_AVAILABLE:
            try:
                # FuzzyExtractor(input_length, hamming_distance, security_level)
                self.extractor = FuzzyExtractor(embedding_dim, hamming_threshold, 128)
            except Exception:
                self.extractor = None
        else:
            self.extractor = None
    
    def quantize_embedding(self, embedding: np.ndarray) -> str:
        """
        Convert a continuous embedding to a binary string.
        
        Args:
            embedding: numpy array of floats (192-dim)
            
        Returns:
            Binary string of length 192 ('0's and '1's)
        """
        if len(embedding) != self.embedding_dim:
            raise ValueError(f"Expected embedding of dimension {self.embedding_dim}, got {len(embedding)}")
        
        # Threshold each float at 0: positive='1', negative/zero='0'
        binary_bits = ['1' if val > 0 else '0' for val in embedding]
        
        return ''.join(binary_bits)
    
    def _binary_string_to_bytes(self, binary_str: str) -> bytes:
        """Convert binary string to bytes."""
        # Pad to multiple of 8
        padded = binary_str.ljust((len(binary_str) + 7) // 8 * 8, '0')
        
        byte_list = []
        for i in range(0, len(padded), 8):
            byte_val = int(padded[i:i+8], 2)
            byte_list.append(byte_val)
        
        return bytes(byte_list)
    
    def _bytes_to_binary_string(self, data: bytes, length: int) -> str:
        """Convert bytes back to binary string of specified length."""
        binary_str = ''.join(format(byte, '08b') for byte in data)
        return binary_str[:length]
    
    def enroll(self, embedding: np.ndarray) -> dict:
        """
        Enroll a voice embedding and generate fuzzy commitment data.
        
        Args:
            embedding: numpy float32 array (192-dim, L2-normalized)
            
        Returns:
            dict with keys:
                - helper_string: hex string for key reconstruction
                - commitment: SHA-256 hash of (key + salt) as hex
                - salt: random 32-byte salt as hex
                
        Note: The raw key is NEVER returned for security.
        """
        # Quantize embedding to binary
        binary_string = self.quantize_embedding(embedding)
        
        # Generate random salt
        salt = secrets.token_bytes(32)
        salt_hex = salt.hex()
        
        if self.extractor is not None:
            try:
                # Use fuzzy extractor library
                binary_bytes = self._binary_string_to_bytes(binary_string)
                key, helper = self.extractor.generate(binary_bytes)
                
                helper_hex = helper.hex() if isinstance(helper, bytes) else helper
                
                # Compute commitment = SHA-256(key + salt)
                commitment_input = key + salt if isinstance(key, bytes) else key.encode() + salt
                commitment = hashlib.sha256(commitment_input).hexdigest()
                
                return {
                    'helper_string': helper_hex,
                    'commitment': commitment,
                    'salt': salt_hex
                }
            except Exception:
                # Fall through to fallback
                pass
        
        # Fallback: store quantized binary as helper_string
        # Generate a deterministic key from the binary string
        key = hashlib.sha256(binary_string.encode()).digest()
        
        # Store the binary string as helper (for Hamming distance comparison later)
        helper_hex = binary_string.encode().hex()
        
        # Compute commitment = SHA-256(key + salt)
        commitment = hashlib.sha256(key + salt).hexdigest()
        
        return {
            'helper_string': helper_hex,
            'commitment': commitment,
            'salt': salt_hex
        }
    
    def _hamming_distance(self, bits1: str, bits2: str) -> int:
        """Compute Hamming distance between two binary strings."""
        if len(bits1) != len(bits2):
            raise ValueError("Binary strings must have same length")
        
        return sum(c1 != c2 for c1, c2 in zip(bits1, bits2))
    
    def verify(self, embedding: np.ndarray, helper_string_hex: str, 
               commitment_hex: str, salt_hex: str) -> bool:
        """
        Verify a voice embedding against stored fuzzy commitment data.
        
        Args:
            embedding: numpy float32 array (192-dim) from new voice sample
            helper_string_hex: helper data from enrollment (hex string)
            commitment_hex: SHA-256 commitment from enrollment (hex string)
            salt_hex: salt from enrollment (hex string)
            
        Returns:
            True if voice matches within tolerance, False otherwise
        """
        # Quantize the new embedding
        new_binary = self.quantize_embedding(embedding)
        
        # Convert salt from hex
        salt = bytes.fromhex(salt_hex)
        
        if self.extractor is not None:
            try:
                # Try fuzzy extractor key reconstruction
                helper = bytes.fromhex(helper_string_hex)
                new_binary_bytes = self._binary_string_to_bytes(new_binary)
                
                reconstructed_key = self.extractor.reproduce(new_binary_bytes, helper)
                
                if reconstructed_key is not None:
                    # Compute commitment with reconstructed key
                    commitment_input = reconstructed_key + salt
                    if isinstance(reconstructed_key, str):
                        commitment_input = reconstructed_key.encode() + salt
                    computed_commitment = hashlib.sha256(commitment_input).hexdigest()
                    
                    return computed_commitment == commitment_hex
            except Exception:
                # Fall through to fallback
                pass
        
        # Fallback: Hamming distance comparison
        try:
            # Decode helper_string back to binary
            stored_binary = bytes.fromhex(helper_string_hex).decode()
            
            # Check if it looks like a binary string
            if len(stored_binary) == self.embedding_dim and all(c in '01' for c in stored_binary):
                # Compute Hamming distance
                distance = self._hamming_distance(new_binary, stored_binary)
                
                if distance <= self.hamming_threshold:
                    # Reconstruct key from original binary (for commitment verification)
                    key = hashlib.sha256(stored_binary.encode()).digest()
                    computed_commitment = hashlib.sha256(key + salt).hexdigest()
                    
                    return computed_commitment == commitment_hex
        except Exception:
            pass
        
        return False
    
    def compute_match_score(self, embedding: np.ndarray, helper_string_hex: str) -> float:
        """
        Compute a match score between a new embedding and stored helper data.
        
        Args:
            embedding: numpy float32 array (192-dim)
            helper_string_hex: helper data from enrollment (hex string)
            
        Returns:
            Match score between 0.0 (no match) and 1.0 (perfect match)
        """
        new_binary = self.quantize_embedding(embedding)
        
        try:
            stored_binary = bytes.fromhex(helper_string_hex).decode()
            
            if len(stored_binary) == self.embedding_dim and all(c in '01' for c in stored_binary):
                distance = self._hamming_distance(new_binary, stored_binary)
                # Convert distance to similarity score
                # Score of 1.0 = perfect match (0 bits different)
                # Score of 0.0 = complete mismatch (192 bits different)
                score = 1.0 - (distance / self.embedding_dim)
                print(f"[DEBUG FUZZY] compute_match_score: Hamming distance = {distance}/{self.embedding_dim}, score = {score:.4f}")
                return max(0.0, score)
        except Exception as e:
            print(f"[DEBUG FUZZY] compute_match_score exception: {e}")
            pass
        
        return 0.0


# Convenience function
def create_fuzzy_extractor(embedding_dim: int = 192, 
                           hamming_threshold: int = 20) -> VoiceFuzzyExtractor:
    """Create a new VoiceFuzzyExtractor instance."""
    return VoiceFuzzyExtractor(embedding_dim, hamming_threshold)
