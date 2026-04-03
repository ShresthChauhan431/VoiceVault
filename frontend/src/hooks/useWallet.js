import { useState, useEffect, useCallback } from 'react';

const SEPOLIA_CHAIN_ID = 11155111;
const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7';

export function useWallet() {
  const [address, setAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [chainId, setChainId] = useState(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkNetwork = useCallback((currentChainId) => {
    const chainIdNum = typeof currentChainId === 'string' 
      ? parseInt(currentChainId, 16) 
      : currentChainId;
    setChainId(chainIdNum);
    setIsCorrectNetwork(chainIdNum === SEPOLIA_CHAIN_ID);
  }, []);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask or compatible wallet not found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
        
        const currentChainId = await window.ethereum.request({ 
          method: 'eth_chainId' 
        });
        checkNetwork(currentChainId);
      }
    } catch (err) {
      if (err.code === 4001) {
        setError('Connection request was rejected');
      } else {
        setError(err.message || 'Failed to connect wallet');
      }
    } finally {
      setLoading(false);
    }
  }, [checkNetwork]);

  const switchToSepolia = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask or compatible wallet not found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }]
      });
    } catch (err) {
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: SEPOLIA_CHAIN_ID_HEX,
              chainName: 'Sepolia Testnet',
              nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://sepolia.infura.io/v3/'],
              blockExplorerUrls: ['https://sepolia.etherscan.io']
            }]
          });
        } catch (addError) {
          setError(addError.message || 'Failed to add Sepolia network');
        }
      } else if (err.code === 4001) {
        setError('Network switch request was rejected');
      } else {
        setError(err.message || 'Failed to switch network');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setAddress(null);
        setIsConnected(false);
      } else {
        setAddress(accounts[0]);
        setIsConnected(true);
      }
    };

    const handleChainChanged = (newChainId) => {
      checkNetwork(newChainId);
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    // Auto-connect if already connected
    if (window.ethereum.selectedAddress) {
      setAddress(window.ethereum.selectedAddress);
      setIsConnected(true);
      window.ethereum.request({ method: 'eth_chainId' }).then(checkNetwork);
    }

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [checkNetwork]);

  return {
    address,
    isConnected,
    chainId,
    isCorrectNetwork,
    connectWallet,
    switchToSepolia,
    error,
    loading
  };
}
