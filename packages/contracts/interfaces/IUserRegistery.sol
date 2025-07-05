// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IUserRegistry {
    // Structs
    struct User {
        bool isRegistered;
        bool isJournalist;
        uint256 registeredAt;
        uint256 reputation;
        string nationality;
        string[] name;
        string dateOfBirth;
    }

    struct JournalistApplication {
        bool hasApplied;
        string credentialsURI;
        uint256 appliedAt;
    }

    // State queries
    function isRegistered(address user) external view returns (bool);
    function isJournalist(address user) external view returns (bool);
    function getUserInfo(address user)
        external
        view
        returns (
            bool isRegistered,
            bool isJournalist,
            uint256 registeredAt,
            uint256 reputation,
            string memory nationality,
            string[] memory name,
            string memory dateOfBirth
        );
    function getJournalistApplication(address user)
        external
        view
        returns (
            bool hasApplied,
            string memory credentialsURI,
            uint256 appliedAt
        );

    // Mutative functions
    function setSelfVerificationContract(address _selfVerificationContract) external;
    function renounceOwnership() external;
    function registerVerifiedUser(
        address userAddress,
        string memory _nationality,
        string[] memory _name,
        string memory _dateOfBirth
    ) external;
    function applyForJournalist(string calldata credentialsURI) external;
    function updateReputation(address user, int256 reputationChange) external;
}
