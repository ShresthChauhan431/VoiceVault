import { ethers } from 'ethers';
import VoiceVaultABI from '../abi/VoiceVault.json';
import FraudRegistryABI from '../abi/FraudRegistry.json';

const VOICE_VAULT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const FRAUD_REGISTRY_ADDRESS = import.meta.env.VITE_FRAUD_REGISTRY_ADDRESS;
const SBT_ADDRESS = import.meta.env.VITE_SBT_ADDRESS;

// Validate address format
function validateAddress(address, name) {
  if (!address || address === '' || address === 'undefined') {
    throw new Error(`${name} is not configured. Check your .env file.`);
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`${name} is invalid: ${address}`);
  }
  return address;
}

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
  const address = validateAddress(VOICE_VAULT_ADDRESS, 'VITE_CONTRACT_ADDRESS');
  return new ethers.Contract(address, VoiceVaultABI.abi, signerOrProvider);
}

export function getFraudRegistryContract(signerOrProvider) {
  const address = validateAddress(FRAUD_REGISTRY_ADDRESS, 'VITE_FRAUD_REGISTRY_ADDRESS');
  return new ethers.Contract(address, FraudRegistryABI.abi, signerOrProvider);
}

export function getSBTAddress() {
  return validateAddress(SBT_ADDRESS, 'VITE_SBT_ADDRESS');
}

export function getContractAddresses() {
  return {
    voiceVault: VOICE_VAULT_ADDRESS,
    fraudRegistry: FRAUD_REGISTRY_ADDRESS,
    sbt: SBT_ADDRESS
  };
}
