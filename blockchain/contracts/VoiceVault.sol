// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title VoiceVault
 * @notice Main identity registry for Voice Vault - stores voice biometric commitments
 */
contract VoiceVault {
    struct VoiceProfile {
        bytes helperString;     // Fuzzy extractor helper data
        bytes32 commitment;     // SHA-256 commitment of the secret key
        bytes32 salt;           // Salt used during enrollment
        uint256 registeredAt;   // block.timestamp of enrollment
        uint256 updatedAt;      // block.timestamp of last update
        bool isActive;          // Whether this profile is valid
        uint256 reportCount;    // Number of fraud reports against this address
    }

    mapping(address => VoiceProfile) public voiceProfiles;
    mapping(address => bool) public isRegistered;
    address[] internal registeredAddresses;

    event VoiceRegistered(address indexed user, uint256 timestamp);
    event VoiceRevoked(address indexed user, uint256 timestamp);
    event VoiceUpdated(address indexed user, uint256 timestamp);
    event FraudReported(address indexed reporter, address indexed suspect, bytes32 evidenceHash);

    /**
     * @notice Register a new voice profile
     * @param _helperString Fuzzy extractor helper data
     * @param _commitment SHA-256 commitment of the secret key
     * @param _salt Salt used during enrollment
     */
    function registerVoice(
        bytes memory _helperString,
        bytes32 _commitment,
        bytes32 _salt
    ) external {
        require(
            !isRegistered[msg.sender] || !voiceProfiles[msg.sender].isActive,
            "Voice already registered and active"
        );

        voiceProfiles[msg.sender] = VoiceProfile({
            helperString: _helperString,
            commitment: _commitment,
            salt: _salt,
            registeredAt: block.timestamp,
            updatedAt: block.timestamp,
            isActive: true,
            reportCount: 0
        });

        if (!isRegistered[msg.sender]) {
            isRegistered[msg.sender] = true;
            registeredAddresses.push(msg.sender);
        }

        emit VoiceRegistered(msg.sender, block.timestamp);
    }

    /**
     * @notice Get a user's voice profile
     * @param _user Address of the user
     * @return helperString Fuzzy extractor helper data
     * @return commitment SHA-256 commitment
     * @return salt Salt used during enrollment
     * @return registeredAt Registration timestamp
     * @return isActive Whether profile is active
     */
    function getVoiceProfile(address _user)
        public
        view
        returns (
            bytes memory helperString,
            bytes32 commitment,
            bytes32 salt,
            uint256 registeredAt,
            bool isActive
        )
    {
        require(isRegistered[_user], "User not registered");
        VoiceProfile storage profile = voiceProfiles[_user];
        return (
            profile.helperString,
            profile.commitment,
            profile.salt,
            profile.registeredAt,
            profile.isActive
        );
    }

    /**
     * @notice Revoke the caller's voice profile
     */
    function revokeVoice() external {
        require(isRegistered[msg.sender], "Not registered");
        require(voiceProfiles[msg.sender].isActive, "Voice already revoked");

        voiceProfiles[msg.sender].isActive = false;
        voiceProfiles[msg.sender].updatedAt = block.timestamp;

        emit VoiceRevoked(msg.sender, block.timestamp);
    }

    /**
     * @notice Update the caller's voice profile
     * @param _newHelper New fuzzy extractor helper data
     * @param _newCommitment New SHA-256 commitment
     * @param _newSalt New salt
     */
    function updateVoice(
        bytes memory _newHelper,
        bytes32 _newCommitment,
        bytes32 _newSalt
    ) external {
        require(isRegistered[msg.sender], "Not registered");
        require(voiceProfiles[msg.sender].isActive, "Voice is revoked");

        VoiceProfile storage profile = voiceProfiles[msg.sender];
        profile.helperString = _newHelper;
        profile.commitment = _newCommitment;
        profile.salt = _newSalt;
        profile.updatedAt = block.timestamp;

        emit VoiceUpdated(msg.sender, block.timestamp);
    }

    /**
     * @notice Report fraud against a suspect address
     * @param _suspect Address of the suspect
     * @param _evidenceHash Hash of the evidence
     */
    function reportFraud(address _suspect, bytes32 _evidenceHash) external {
        require(isRegistered[_suspect], "Suspect not registered");

        voiceProfiles[_suspect].reportCount++;

        emit FraudReported(msg.sender, _suspect, _evidenceHash);
    }

    /**
     * @notice Get all addresses with 3 or more fraud reports
     * @return flagged Array of flagged addresses
     */
    function getFlaggedAddresses() public view returns (address[] memory) {
        uint256 count = 0;
        
        // First pass: count flagged addresses
        for (uint256 i = 0; i < registeredAddresses.length; i++) {
            if (voiceProfiles[registeredAddresses[i]].reportCount >= 3) {
                count++;
            }
        }

        // Second pass: populate result array
        address[] memory flagged = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < registeredAddresses.length; i++) {
            if (voiceProfiles[registeredAddresses[i]].reportCount >= 3) {
                flagged[index] = registeredAddresses[i];
                index++;
            }
        }

        return flagged;
    }

    /**
     * @notice Get the total number of registered addresses
     * @return Total count of registered addresses
     */
    function getRegisteredCount() public view returns (uint256) {
        return registeredAddresses.length;
    }
}
