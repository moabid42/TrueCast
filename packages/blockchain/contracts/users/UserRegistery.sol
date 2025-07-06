// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../interfaces/IAccessManager.sol";
import "../interfaces/IFreePressToken.sol";

/**
 * @title UserRegistry
 * @dev Manages user registration and journalist verification for the FreePress platform
 */
contract UserRegistry {
    IAccessManager public accessManager;
    IFreePressToken public freePressToken;

    address public owner;
    address public selfVerificationContract;

    mapping(address => bool) public isRegistered;
    mapping(address => bool) public isJournalist;
    mapping(address => uint256) public registeredAt;
    mapping(address => uint256) public reputation;
    mapping(address => string) public name;
    mapping(address => string) public nationality;
    mapping(address => string) public dateOfBirth;

    struct JournalistApplication {
        bool hasApplied;
        string credentialsURI;
        uint256 appliedAt;
    }
    mapping(address => JournalistApplication) public journalistApplications;

    uint256 public totalUsers;
    uint256 public totalJournalists;

    event UserRegistered(address indexed user, uint256 timestamp, string name, string nationality, string dateOfBirth);
    event JournalistVerified(address indexed journalist, string credentialsURI);
    event ProfileUpdated(address indexed user, string newMetadataURI);
    event ReputationUpdated(address indexed user, int256 change, uint256 newReputation);
    event SelfVerificationContractUpdated(address indexed newContract);

    error OnlyOwner();
    error OnlySelfVerification();
    error OnlyAuthorizedContract();
    error AlreadyRegistered();
    error NotRegistered();
    error AlreadyJournalist();
    error NotJournalist();
    error InvalidAddress();
    error InvalidURI();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlySelfVerification() {
        if (msg.sender != selfVerificationContract) revert OnlySelfVerification();
        _;
    }

    modifier onlyAuthorizedContract() {
        if (!accessManager.isAuthorizedContract(msg.sender)) revert OnlyAuthorizedContract();
        _;
    }

    constructor(address _accessManager, address _freePressToken) {
        if (_accessManager == address(0) || _freePressToken == address(0)) revert InvalidAddress();
        owner = msg.sender;
        accessManager = IAccessManager(_accessManager);
        freePressToken = IFreePressToken(_freePressToken);
    }

    function setSelfVerificationContract(address _selfVerificationContract) external onlyOwner {
        if (_selfVerificationContract == address(0)) revert InvalidAddress();
        selfVerificationContract = _selfVerificationContract;
        emit SelfVerificationContractUpdated(_selfVerificationContract);
    }

    function renounceOwnership() external onlyOwner {
        owner = address(0);
    }

    function registerVerifiedUser(
        address userAddress,
        string calldata _name,
        string calldata _nationality,
        string calldata _dateOfBirth
    ) external onlySelfVerification {   
        // TODO: Revert
        //if (isRegistered[userAddress]) revert AlreadyRegistered();

        isRegistered[userAddress] = true;
        isJournalist[userAddress] = false;
        registeredAt[userAddress] = block.timestamp;
        reputation[userAddress] = 100;
        name[userAddress] = _name;
        nationality[userAddress] = _nationality;
        dateOfBirth[userAddress] = _dateOfBirth;

        totalUsers++;

        // Grant user role in AccessManager
        accessManager.grantUserRole(userAddress);
        
        // Claim initial tokens for the user
        freePressToken.claimInitialTokens(userAddress, false);

        emit UserRegistered(userAddress, block.timestamp, _name, _nationality, _dateOfBirth);
    }


    function applyForJournalist(string calldata credentialsURI) external {
        if (!isRegistered[msg.sender]) revert NotRegistered();
        if (isJournalist[msg.sender]) revert AlreadyJournalist();
        if (bytes(credentialsURI).length == 0) revert InvalidURI();

        journalistApplications[msg.sender] = JournalistApplication({
            hasApplied: true,
            credentialsURI: credentialsURI,
            appliedAt: block.timestamp
        });

        _verifyJournalist(msg.sender);
    }

    function _verifyJournalist(address journalist) internal {
        JournalistApplication memory app = journalistApplications[journalist];
        isJournalist[journalist] = true;
        totalJournalists++;

        accessManager.verifyJournalist(journalist, app.credentialsURI);
        freePressToken.claimInitialTokens(journalist, true);

        emit JournalistVerified(journalist, app.credentialsURI);
    }

    function updateProfile(string calldata metadataURI) external {
        if (!isRegistered[msg.sender]) revert NotRegistered();
        if (bytes(metadataURI).length == 0) revert InvalidURI();
        emit ProfileUpdated(msg.sender, metadataURI);
    }

    function updateReputation(address user, int256 delta) external onlyAuthorizedContract {
        if (!isRegistered[user]) revert NotRegistered();

        uint256 current = reputation[user];
        uint256 updated;

        if (delta < 0) {
            uint256 down = uint256(-delta);
            updated = current > down ? current - down : 0;
        } else {
            updated = current + uint256(delta);
            if (updated > 1000) updated = 1000;
        }

        reputation[user] = updated;
        emit ReputationUpdated(user, delta, updated);
    }

    function getUserInfo(address user) external view returns (
        bool,
        bool,
        uint256,
        uint256,
        string memory,
        string memory,
        string memory
    ) {
        return (
            isRegistered[user],
            isJournalist[user],
            registeredAt[user],
            reputation[user],
            name[user],
            nationality[user],
            dateOfBirth[user]
        );
    }

    function getUserIdentity(address user) external view returns (
        string memory,
        string memory,
        string memory
    ) {
        require(isRegistered[user], "Not registered");
        return (name[user], nationality[user], dateOfBirth[user]);
    }

    function getJournalistApplication(address user) external view returns (
        bool,
        string memory,
        uint256
    ) {
        JournalistApplication memory app = journalistApplications[user];
        return (app.hasApplied, app.credentialsURI, app.appliedAt);
    }
}
