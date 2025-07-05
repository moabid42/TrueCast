pragma solidity ^0.8.28;

import "../interfaces/IAccessManager.sol";
import "../interfaces/IFreePressToken.sol";

/**
 * @title UserRegistry
 * @dev Manages user registration and journalist verification for the FreePress platform
 * @notice This contract handles user onboarding after Self identity verification
 */
contract UserRegistry {
    // Interfaces
    IAccessManager public accessManager;
    IFreePressToken public freePressToken;
    
    // Owner (only for initial setup)
    address public owner;
    
    // Self verification contract
    address public selfVerificationContract;
    
    // User data structure
    struct User {
        bool isRegistered;
        bool isJournalist;
        uint256 registeredAt;
        uint256 reputation;
        string nationality;
        string[] name;
        string dateOfBirth;
    }
    
    // Mapping from user address to user data
    mapping(address => User) public users;
    
    // Journalist application data
    struct JournalistApplication {
        bool hasApplied;
        string credentialsURI; // IPFS hash for journalist credentials
        uint256 appliedAt;
    }
    
    mapping(address => JournalistApplication) public journalistApplications;
    
    // Statistics
    uint256 public totalUsers;
    uint256 public totalJournalists;
    
    // Events
    event UserRegistered(address indexed user, uint256 timestamp);
    event JournalistVerified(address indexed journalist, string credentialsURI);
    event ProfileUpdated(address indexed user, string newMetadataURI);
    event ReputationUpdated(address indexed user, int256 change, uint256 newReputation);
    event SelfVerificationContractUpdated(address indexed newContract);
    
    // Errors
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
        if (!accessManager.isAuthorizedContract(msg.sender)) {
            revert OnlyAuthorizedContract();
        }
        _;
    }
    
    constructor(address _accessManager, address _freePressToken) {
        if (_accessManager == address(0) || _freePressToken == address(0)) {
            revert InvalidAddress();
        }
        
        owner = msg.sender;
        accessManager = IAccessManager(_accessManager);
        freePressToken = IFreePressToken(_freePressToken);
    }
    
    /**
     * @dev Set the Self verification contract address
     */
    function setSelfVerificationContract(address _selfVerificationContract) external onlyOwner {
        if (_selfVerificationContract == address(0)) revert InvalidAddress();
        selfVerificationContract = _selfVerificationContract;
        emit SelfVerificationContractUpdated(_selfVerificationContract);
    }
    
    /**
     * @dev Renounce ownership after setup
     */
    function renounceOwnership() external onlyOwner {
        owner = address(0);
    }
    
    /**
     * @dev Register a new user after successful Self verification
     * @param userAddress The address of the verified user
     * @notice This function is called by the Self verification contract
     */
    function registerVerifiedUser(address userAddress, string memory _nationality, string[] memory _name, string memory _dateOfBirth) external onlySelfVerification {
        if (users[userAddress].isRegistered) revert AlreadyRegistered();
        
        // Register the user
        users[userAddress] = User({
            isRegistered: true,
            isJournalist: false,
            registeredAt: block.timestamp,
            reputation: 100, // Starting reputation
            nationality: _nationality,
            name: _name,
            dateOfBirth: _dateOfBirth
        });
        
        totalUsers++;
        
        // Grant user role in AccessManager
        accessManager.grantUserRole(userAddress);
        
        // Claim initial tokens for the user
        freePressToken.claimInitialTokens(userAddress, false);
        
        emit UserRegistered(userAddress, block.timestamp);
    }
    
    /**
     * @dev Apply to become a journalist
     * @param credentialsURI IPFS hash containing journalist credentials
     */
    function applyForJournalist(string calldata credentialsURI) external {
        if (!users[msg.sender].isRegistered) revert NotRegistered();
        if (users[msg.sender].isJournalist) revert AlreadyJournalist();
        if (bytes(credentialsURI).length == 0) revert InvalidURI();
        
        journalistApplications[msg.sender] = JournalistApplication({
            hasApplied: true,
            credentialsURI: credentialsURI,
            appliedAt: block.timestamp
        });
        
        // For hackathon: Auto-approve journalists
        // In production, this would go through a verification process
        _verifyJournalist(msg.sender);
    }
    
    /**
     * @dev Internal function to verify a journalist
     */
    function _verifyJournalist(address journalist) internal {
        JournalistApplication memory application = journalistApplications[journalist];
        
        // Update user status
        users[journalist].isJournalist = true;
        totalJournalists++;
        
        // Grant journalist role in AccessManager
        accessManager.verifyJournalist(journalist, application.credentialsURI);
        
        // Claim additional journalist tokens
        // The token contract will check if they already claimed regular user tokens
        // and only give the difference (400 more tokens)
        freePressToken.claimInitialTokens(journalist, true);
        
        emit JournalistVerified(journalist, application.credentialsURI);
    }
    
    /**
     * @dev Update user reputation (called by voting contracts)
     * @param user Address of the user
     * @param reputationChange Positive or negative reputation change
     */
    function updateReputation(address user, int256 reputationChange) external onlyAuthorizedContract {
        if (!users[user].isRegistered) revert NotRegistered();
        
        uint256 currentRep = users[user].reputation;
        uint256 newRep;
        
        if (reputationChange < 0) {
            uint256 decrease = uint256(-reputationChange);
            newRep = currentRep > decrease ? currentRep - decrease : 0;
        } else {
            uint256 increase = uint256(reputationChange);
            newRep = currentRep + increase;
            // Cap at 1000 to prevent overflow
            if (newRep > 1000) newRep = 1000;
        }
        
        users[user].reputation = newRep;
        emit ReputationUpdated(user, reputationChange, newRep);
    }
    
    /**
     * @dev Check if a user is registered
     */
    function isRegistered(address user) external view returns (bool) {
        return users[user].isRegistered;
    }
    
    /**
     * @dev Check if a user is a journalist
     */
    function isJournalist(address user) external view returns (bool) {
        return users[user].isJournalist;
    }
    
    /**
     * @dev Get user information
     */
    function getUserInfo(address user) external view returns (
        bool isRegistered,
        bool isJournalist,
        uint256 registeredAt,
        uint256 reputation,
        string memory nationality,
        string[] memory  name,
        string memory dateOfBirth
    ) {
        User memory userInfo = users[user];
        return (
            userInfo.isRegistered,
            userInfo.isJournalist,
            userInfo.registeredAt,
            userInfo.reputation,
            userInfo.nationality,
            userInfo.name,
            userInfo.dateOfBirth
        );
    }
    
    /**
     * @dev Get journalist application info
     */
    function getJournalistApplication(address user) external view returns (
        bool hasApplied,
        string memory credentialsURI,
        uint256 appliedAt
    ) {
        JournalistApplication memory app = journalistApplications[user];
        return (app.hasApplied, app.credentialsURI, app.appliedAt);
    }
}