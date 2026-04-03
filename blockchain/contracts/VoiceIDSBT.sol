// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title VoiceIDSBT
 * @notice Soulbound Token for Voice Vault identity verification
 * @dev Non-transferable ERC721 token that can only be minted/burned by VoiceVault contract
 */
contract VoiceIDSBT is ERC721 {
    using Strings for uint256;

    address public vaultAddress;
    bool private _vaultAddressSet;
    address private immutable _deployer;

    mapping(address => uint256) public addressToTokenId;
    uint256 private _nextTokenId = 1;

    error TransferNotAllowed();
    error VaultAddressAlreadySet();
    error OnlyDeployer();
    error OnlyVault();

    modifier onlyVault() {
        if (msg.sender != vaultAddress) revert OnlyVault();
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        address _vaultAddress
    ) ERC721(name, symbol) {
        _deployer = msg.sender;
        if (_vaultAddress != address(0)) {
            vaultAddress = _vaultAddress;
            _vaultAddressSet = true;
        }
    }

    /**
     * @notice Set the vault address (can only be called once by deployer)
     * @param _addr Address of the VoiceVault contract
     */
    function setVaultAddress(address _addr) external {
        if (msg.sender != _deployer) revert OnlyDeployer();
        if (_vaultAddressSet) revert VaultAddressAlreadySet();
        
        vaultAddress = _addr;
        _vaultAddressSet = true;
    }

    /**
     * @notice Override to prevent transfers (soulbound)
     * @dev Only allows minting (from == address(0)) and burning (to == address(0))
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        // Allow minting (from == 0) and burning (to == 0)
        if (from != address(0) && to != address(0)) {
            revert TransferNotAllowed();
        }
    }

    /**
     * @notice Mint a new soulbound token
     * @param to Address to mint the token to
     * @param tokenId Token ID to mint
     */
    function mint(address to, uint256 tokenId) external onlyVault {
        addressToTokenId[to] = tokenId;
        _safeMint(to, tokenId);
    }

    /**
     * @notice Mint with auto-incrementing token ID
     * @param to Address to mint the token to
     * @return tokenId The minted token ID
     */
    function mintAuto(address to) external onlyVault returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        addressToTokenId[to] = tokenId;
        _safeMint(to, tokenId);
        return tokenId;
    }

    /**
     * @notice Burn a soulbound token
     * @param tokenId Token ID to burn
     */
    function burn(uint256 tokenId) external onlyVault {
        address owner = ownerOf(tokenId);
        delete addressToTokenId[owner];
        _burn(tokenId);
    }

    /**
     * @notice Get the token URI with on-chain metadata
     * @param tokenId Token ID
     * @return Base64-encoded JSON metadata
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        _requireMinted(tokenId);

        string memory json = string(
            abi.encodePacked(
                '{"name":"Voice Vault ID #',
                tokenId.toString(),
                '","description":"Soulbound Voice Identity Token",',
                '"attributes":[',
                '{"trait_type":"Status","value":"Active"},',
                '{"trait_type":"Protocol","value":"Voice Vault v2"}',
                ']}'
            )
        );

        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(bytes(json))
            )
        );
    }

    /**
     * @notice Get the next token ID that will be minted
     * @return The next token ID
     */
    function getNextTokenId() public view returns (uint256) {
        return _nextTokenId;
    }
}
