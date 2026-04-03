import { ethers } from 'ethers';
import VoiceVaultABI from '../abi/VoiceVault.json';
import FraudRegistryABI from '../abi/FraudRegistry.json';

const VOICE_VAULT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const FRAUD_REGISTRY_ADDRESS = import.meta.env.VITE_FRAUD_REGISTRY_ADDRESS;

export function getProvider() {
  if (!window.ethereum) {
    throw new Error('MetaMask or compatible wallet not found');
  }
  return new ethers.BrowserProvider(window.ethereum);
}

export async function getSigner() {
  const provider = getProvider();
  return await provider.getSigner();
}

export function getVoiceVaultContract(signerOrProvider) {
  return new ethers.Contract(VOICE_VAULT_ADDRESS, VoiceVaultABI.abi, signerOrProvider);
}

export function getFraudRegistryContract(signerOrProvider) {
  return new ethers.Contract(FRAUD_REGISTRY_ADDRESS, FraudRegistryABI.abi, signerOrProvider);
}
