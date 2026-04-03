// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title FraudRegistry
 * @notice Public registry for fraud reports against voice identities
 */
contract FraudRegistry {
    struct FraudReport {
        address reporter;
        address suspect;
        bytes32 evidenceHash;
        string description;
        uint256 timestamp;
        bool verified;
    }

    FraudReport[] public reports;
    mapping(address => uint256[]) public reportsBySuspect;
    address[] private suspectList;
    mapping(address => bool) private isInSuspectList;

    event NewFraudReport(address indexed suspect, uint256 reportId, uint256 timestamp);

    /**
     * @notice Submit a new fraud report
     * @param _suspect Address of the suspected fraudster
     * @param _evidenceHash Hash of the evidence (e.g., IPFS hash)
     * @param _description Brief description of the fraud (max 200 chars)
     */
    function submitReport(
        address _suspect,
        bytes32 _evidenceHash,
        string memory _description
    ) external {
        require(bytes(_description).length <= 200, "Description too long (max 200 chars)");

        uint256 reportId = reports.length;

        reports.push(FraudReport({
            reporter: msg.sender,
            suspect: _suspect,
            evidenceHash: _evidenceHash,
            description: _description,
            timestamp: block.timestamp,
            verified: false
        }));

        reportsBySuspect[_suspect].push(reportId);

        // Add to suspect list if first report for this address
        if (!isInSuspectList[_suspect]) {
            suspectList.push(_suspect);
            isInSuspectList[_suspect] = true;
        }

        emit NewFraudReport(_suspect, reportId, block.timestamp);
    }

    /**
     * @notice Get all reports against a specific suspect
     * @param _suspect Address of the suspect
     * @return Array of FraudReport structs
     */
    function getReportsBySuspect(address _suspect) public view returns (FraudReport[] memory) {
        uint256[] memory reportIds = reportsBySuspect[_suspect];
        FraudReport[] memory result = new FraudReport[](reportIds.length);

        for (uint256 i = 0; i < reportIds.length; i++) {
            result[i] = reports[reportIds[i]];
        }

        return result;
    }

    /**
     * @notice Get the total number of fraud reports
     * @return Total number of reports
     */
    function getTotalReports() public view returns (uint256) {
        return reports.length;
    }

    /**
     * @notice Get all unique suspect addresses
     * @return Array of suspect addresses
     */
    function getAllSuspects() public view returns (address[] memory) {
        return suspectList;
    }

    /**
     * @notice Get the number of reports against a specific suspect
     * @param _suspect Address of the suspect
     * @return Number of reports
     */
    function getReportCountBySuspect(address _suspect) public view returns (uint256) {
        return reportsBySuspect[_suspect].length;
    }

    /**
     * @notice Get a specific report by ID
     * @param _reportId ID of the report
     * @return The FraudReport struct
     */
    function getReport(uint256 _reportId) public view returns (FraudReport memory) {
        require(_reportId < reports.length, "Report does not exist");
        return reports[_reportId];
    }
}
