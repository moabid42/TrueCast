// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAccessManager {
    // Struct
    struct JournalistInfo {
        bool isVerified;
        uint256 verifiedAt;
        string metadataURI;
    }

    // Constants (optional: you can define them in your consuming contract too)
    function JOURNALIST_ROLE() external view returns (bytes32);
    function VERIFIED_USER_ROLE() external view returns (bytes32);

    // Role checks
    function hasRole(address account, bytes32 role) external view returns (bool);
    function isJournalist(address account) external view returns (bool);
    function isVerifiedUser(address account) external view returns (bool);

    // Role management
    function grantUserRole(address account) external;
    function verifyJournalist(address journalist, string calldata metadataURI) external;

    // Ownership and authorization
    function authorizeContract(address contractAddress) external;
    function deauthorizeContract(address contractAddress) external;
    function renounceOwnership() external;
    function isAuthorizedContract(address contractAddress) external view returns (bool);

    // Journalist info
    function getJournalistInfo(address journalist)
        external
        view
        returns (
            bool isVerified,
            uint256 verifiedAt,
            string memory metadataURI
        );
}
