import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import * as api from '../utils/api';
import { getSigner, getVoiceVaultContract } from '../utils/contracts';

export function useVoiceRegistration() {
  const [status, setStatus] = useState('idle');
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);

  const register = useCallback(async (audioBlob) => {
    setStatus('processing_ai');
    setError(null);
    setTxHash(null);

    try {
      // Step 1: Process audio with AI backend
      const aiResult = await api.registerVoice(audioBlob);
      
      if (aiResult.error) {
        throw new Error(aiResult.error);
      }

      const { helper_string, commitment, salt } = aiResult;

      // Step 2: Sign blockchain transaction
      setStatus('signing_tx');
      
      const signer = await getSigner();
      const contract = getVoiceVaultContract(signer);

      // Convert helper_string to bytes, commitment and salt to bytes32
      const helperBytes = ethers.toUtf8Bytes(helper_string);
      const commitmentBytes32 = commitment.startsWith('0x') ? commitment : `0x${commitment}`;
      const saltBytes32 = salt.startsWith('0x') ? salt : `0x${salt}`;

      const tx = await contract.registerVoice(helperBytes, commitmentBytes32, saltBytes32);

      // Step 3: Wait for confirmation
      setStatus('confirming');
      await tx.wait(1);

      // Step 4: Done
      setTxHash(tx.hash);
      setStatus('done');

    } catch (err) {
      setStatus('error');
      
      if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
        setError('Transaction cancelled.');
      } else {
        setError(err.message || 'Registration failed');
      }
    }
  }, []);

  return {
    status,
    txHash,
    error,
    register
  };
}
