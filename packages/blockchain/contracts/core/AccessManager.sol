// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AccessManager
 * @dev Centralized access control for the FreePress platform
 * @notice Manages user roles (regular users and journalists) and contract permissions
 */
contract AccessManager {
    // Constants for roles
    bytes32 public constant JOURNALIST_ROLE = keccak256("JOURNALIST_ROLE");
    bytes32 public constant VERIFIED_USER_ROLE = keccak256("VERIFIED_USER_ROLE");
    
    // Owner (only for initial setup)
    address public owner;
    
    // Platform contracts that can modify roles
    mapping(address => bool) public authorizedContracts;
    
    // Role assignments
    mapping(address => mapping(bytes32 => bool)) private _roles;
    
    // Journalist verification data
    struct JournalistInfo {
        bool isVerified;
        uint256 verifiedAt;
        string metadataURI; // IPFS hash for credentials
    }
    
    mapping(address => JournalistInfo) public journalists;
    
    // Events
    event RoleGranted(address indexed account, bytes32 indexed role);
    event JournalistVerified(address indexed journalist, string metadataURI);
    event ContractAuthorized(address indexed contractAddress);
    event ContractDeauthorized(address indexed contractAddress);
    event OwnershipRenounced();
    
    // Errors
    error OnlyOwner();
    error OnlyAuthorized();
    error AlreadyHasRole();
    error ZeroAddress();
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }
    
    modifier onlyAuthorized() {
        if (!authorizedContracts[msg.sender] && msg.sender != owner) {
            revert OnlyAuthorized();
        }
        _;
    }
    
    constructor() {
        owner = msg.sender;
        // Grant the deployer verified user role
        _grantRole(msg.sender, VERIFIED_USER_ROLE);
    }
    
    /**
     * @dev Authorize a contract to manage roles (only during setup)
     */
    function authorizeContract(address contractAddress) external onlyOwner {
        if (contractAddress == address(0)) revert ZeroAddress();
        authorizedContracts[contractAddress] = true;
        emit ContractAuthorized(contractAddress);
    }
    
    /**
     * @dev Remove contract authorization
     */
    function deauthorizeContract(address contractAddress) external onlyOwner {
        authorizedContracts[contractAddress] = false;
        emit ContractDeauthorized(contractAddress);
    }
    
    /**
     * @dev Renounce ownership after setup is complete
     */
    function renounceOwnership() external onlyOwner {
        owner = address(0);
        emit OwnershipRenounced();
    }
    
    /**
     * @dev Check if an account has a specific role
     */
    function hasRole(address account, bytes32 role) public view returns (bool) {
        return _roles[account][role];
    }
    
    /**
     * @dev Grant verified user role (called by UserRegistry after registration)
     */
    function grantUserRole(address account) external onlyAuthorized {
        _grantRole(account, VERIFIED_USER_ROLE);
    }
    
    /**
     * @dev Verify a journalist (called by verification process)
     * @param journalist Address to verify as journalist
     * @param metadataURI IPFS hash containing journalist credentials
     */
    function verifyJournalist(
        address journalist, 
        string calldata metadataURI
    ) external onlyAuthorized {
        if (journalist == address(0)) revert ZeroAddress();
        
        // Grant journalist role
        _grantRole(journalist, JOURNALIST_ROLE);
        
        // Store journalist info
        journalists[journalist] = JournalistInfo({
            isVerified: true,
            verifiedAt: block.timestamp,
            metadataURI: metadataURI
        });
        
        emit JournalistVerified(journalist, metadataURI);
    }
    
    /**
     * @dev Check if user is a journalist
     */
    function isJournalist(address account) external view returns (bool) {
        return hasRole(account, JOURNALIST_ROLE);
    }
    
    /**
     * @dev Check if user is verified
     */
    function isVerifiedUser(address account) external view returns (bool) {
        return hasRole(account, VERIFIED_USER_ROLE);
    }
    
    /**
     * @dev Get journalist information
     */
    function getJournalistInfo(address journalist) 
        external 
        view 
        returns (bool isVerified, uint256 verifiedAt, string memory metadataURI) 
    {
        JournalistInfo memory info = journalists[journalist];
        return (info.isVerified, info.verifiedAt, info.metadataURI);
    }
    
    /**
     * @dev Internal function to grant a role
     */
    function _grantRole(address account, bytes32 role) internal {
        // TODO: Revert
        // if (_roles[account][role]) revert AlreadyHasRole();
        
        _roles[account][role] = true;
        emit RoleGranted(account, role);
    }
    
    /**
     * @dev Get all contract addresses for verification purposes
     */
    function isAuthorizedContract(address contractAddress) external view returns (bool) {
        return authorizedContracts[contractAddress];
    }
}