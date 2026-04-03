"""
Blockchain utilities for interacting with VoiceVault smart contract.

SECURITY NOTES:
- All addresses validated with Web3.is_address() before use
- Contract ABI loaded from compiled artifacts only
- No sensitive data logged
"""

import os
import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any

from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


def validate_address(address: str) -> bool:
    """Validate Ethereum address format."""
    if not address or not isinstance(address, str):
        return False
    return Web3.is_address(address)


def get_contract_abi() -> Dict[str, Any]:
    """Load VoiceVault contract ABI from Hardhat artifacts."""
    abi_path = Path(__file__).parent.parent / "blockchain" / "artifacts" / "contracts" / "VoiceVault.sol" / "VoiceVault.json"
    
    if not abi_path.exists():
        raise FileNotFoundError(f"Contract ABI not found at {abi_path}. Run 'npx hardhat compile' first.")
    
    with open(abi_path) as f:
        artifact = json.load(f)
    
    return artifact["abi"]


def get_web3() -> Web3:
    """Get Web3 instance connected to RPC."""
    rpc_url = os.getenv("RPC_URL")
    if not rpc_url:
        raise ValueError("RPC_URL not set in environment")
    
    return Web3(Web3.HTTPProvider(rpc_url))


def get_contract():
    """Get VoiceVault contract instance."""
    contract_address = os.getenv("CONTRACT_ADDRESS")
    if not contract_address:
        raise ValueError("CONTRACT_ADDRESS not set in environment")
    
    if not validate_address(contract_address):
        raise ValueError("CONTRACT_ADDRESS is not a valid Ethereum address")
    
    w3 = get_web3()
    abi = get_contract_abi()
    
    return w3.eth.contract(address=Web3.to_checksum_address(contract_address), abi=abi)


def get_voice_profile(address: str) -> Optional[Dict[str, Any]]:
    """
    Get voice profile for an address from the blockchain.
    
    Args:
        address: Ethereum address (0x...)
        
    Returns:
        Dict with profile data or None if not found
        
    Raises:
        ValueError: If address is invalid
    """
    # Validate address before any blockchain calls
    if not validate_address(address):
        raise ValueError(f"Invalid Ethereum address: {address}")
    
    try:
        contract = get_contract()
        checksum_address = Web3.to_checksum_address(address)
        
        # Call getVoiceProfile on the contract
        profile = contract.functions.getVoiceProfile(checksum_address).call()
        
        # Profile returns: (helperString, commitment, salt, registeredAt, isActive)
        helper_string, commitment, salt, registered_at, is_active = profile
        
        if not is_active:
            return None
        
        return {
            "helper_string": helper_string.hex() if isinstance(helper_string, bytes) else helper_string,
            "commitment": commitment.hex() if isinstance(commitment, bytes) else commitment,
            "salt": salt.hex() if isinstance(salt, bytes) else salt,
            "registered_at": registered_at,
            "is_active": is_active
        }
        
    except Exception as e:
        # Contract reverts if user not registered
        if "User not registered" in str(e) or "revert" in str(e).lower():
            return None
        logger.error(f"[ERROR] get_voice_profile: {type(e).__name__}")
        raise


def is_registered(address: str) -> bool:
    """
    Check if an address is registered in VoiceVault.
    
    Args:
        address: Ethereum address (0x...)
        
    Returns:
        True if registered, False otherwise
    """
    # Validate address
    if not validate_address(address):
        return False
    
    try:
        contract = get_contract()
        checksum_address = Web3.to_checksum_address(address)
        
        return contract.functions.isRegistered(checksum_address).call()
        
    except Exception as e:
        logger.error(f"[ERROR] is_registered: {type(e).__name__}")
        return False
