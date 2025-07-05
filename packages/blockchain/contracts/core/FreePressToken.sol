// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title FreePressToken
 * @dev ERC20 token with locking mechanism for voting and staking
 * @notice This token is used for voting and rewards in the FreePress platform
 */
contract FreePressToken is ERC20, ERC20Pausable, ReentrancyGuard {
    // Constants
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant INITIAL_USER_TOKENS = 100 * 10**18; // 100 tokens per user
    uint256 public constant INITIAL_JOURNALIST_TOKENS = 500 * 10**18; // 500 tokens per journalist

    // Contract addresses that can lock/unlock tokens
    mapping(address => bool) public authorizedContracts;
    
    // Track if user has claimed initial tokens
    mapping(address => bool) public hasClaimedTokens;
    
    // Owner (only for initial setup)
    address public owner;

    // Locking mechanism
    struct Lock {
        uint256 amount;
        uint256 unlockTime;
        bytes32 purpose; // e.g., "VOTING", "ARTICLE_STAKE"
    }

    // User address => array of locks
    mapping(address => Lock[]) public userLocks;
    
    // User address => total locked amount
    mapping(address => uint256) public totalLocked;
    
    // Purpose-specific locked amounts for analytics
    mapping(bytes32 => uint256) public totalLockedByPurpose;

    // Events
    event TokensLocked(address indexed user, uint256 amount, uint256 unlockTime, bytes32 purpose);
    event TokensUnlocked(address indexed user, uint256 amount, bytes32 purpose);
    event LockedTransfer(address indexed from, address indexed to, uint256 amount, bytes32 purpose);
    event TokensClaimed(address indexed user, uint256 amount, bool isJournalist);
    event TokensBurned(address indexed from, uint256 amount);
    event ContractAuthorized(address indexed contractAddress);
    event ContractDeauthorized(address indexed contractAddress);

    // Errors
    error InsufficientUnlockedBalance(uint256 requested, uint256 available);
    error InvalidUnlockTime();
    error LockNotFound();
    error UnauthorizedAccess();
    error AlreadyClaimed();
    error ZeroAmount();
    error ZeroAddress();
    error OnlyOwner();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyAuthorized() {
        if (!authorizedContracts[msg.sender]) revert UnauthorizedAccess();
        _;
    }

    constructor() ERC20("FreePress Token", "FPT") {
        owner = msg.sender;
        
        // Mint initial supply to contract itself for distribution
        _mint(address(this), INITIAL_SUPPLY);
    }

    /**
     * @dev Authorize a contract to lock/unlock tokens (only during setup)
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
    }

    /**
     * @dev Claim initial tokens (called by UserRegistry)
     */
    function claimInitialTokens(address user, bool isJournalist) external onlyAuthorized {
        if (hasClaimedTokens[user]) revert AlreadyClaimed();
        
        uint256 amount = isJournalist ? INITIAL_JOURNALIST_TOKENS : INITIAL_USER_TOKENS;
        hasClaimedTokens[user] = true;
        
        _transfer(address(this), user, amount);
        emit TokensClaimed(user, amount, isJournalist);
    }

    /**
     * @dev Returns the available (unlocked) balance of a user
     */
    function availableBalance(address user) public view returns (uint256) {
        return balanceOf(user) - totalLocked[user];
    }

    /**
     * @dev Lock tokens for a specific purpose
     * @param user Address whose tokens to lock
     * @param amount Amount of tokens to lock
     * @param unlockTime Timestamp when tokens can be unlocked
     * @param purpose Identifier for the lock purpose (e.g., "VOTING", "ARTICLE_STAKE")
     */
    function lockTokens(
        address user,
        uint256 amount,
        uint256 unlockTime,
        bytes32 purpose
    ) external onlyAuthorized nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (user == address(0)) revert ZeroAddress();
        if (unlockTime <= block.timestamp) revert InvalidUnlockTime();
        if (availableBalance(user) < amount) {
            revert InsufficientUnlockedBalance(amount, availableBalance(user));
        }

        userLocks[user].push(Lock({
            amount: amount,
            unlockTime: unlockTime,
            purpose: purpose
        }));

        totalLocked[user] += amount;
        totalLockedByPurpose[purpose] += amount;

        emit TokensLocked(user, amount, unlockTime, purpose);
    }

    /**
     * @dev Unlock tokens that have passed their unlock time
     * @param user Address whose tokens to unlock
     * @param lockIndex Index of the lock in the user's lock array
     */
    function unlockTokens(address user, uint256 lockIndex) external nonReentrant {
        if (lockIndex >= userLocks[user].length) revert LockNotFound();
        
        Lock memory lock = userLocks[user][lockIndex];
        
        // Only the user or authorized contracts can unlock
        if (msg.sender != user && !authorizedContracts[msg.sender]) {
            revert UnauthorizedAccess();
        }
        
        // Check if unlock time has passed
        if (block.timestamp < lock.unlockTime) {
            revert InvalidUnlockTime();
        }

        // Remove the lock by swapping with last element and popping
        uint256 lastIndex = userLocks[user].length - 1;
        if (lockIndex != lastIndex) {
            userLocks[user][lockIndex] = userLocks[user][lastIndex];
        }
        userLocks[user].pop();

        totalLocked[user] -= lock.amount;
        totalLockedByPurpose[lock.purpose] -= lock.amount;

        emit TokensUnlocked(user, lock.amount, lock.purpose);
    }

    /**
     * @dev Force unlock tokens (only for authorized contracts, e.g., for vote resolution)
     */
    function forceUnlock(address user, uint256 lockIndex) external onlyAuthorized nonReentrant {
        if (lockIndex >= userLocks[user].length) revert LockNotFound();
        
        Lock memory lock = userLocks[user][lockIndex];

        // Remove the lock
        uint256 lastIndex = userLocks[user].length - 1;
        if (lockIndex != lastIndex) {
            userLocks[user][lockIndex] = userLocks[user][lastIndex];
        }
        userLocks[user].pop();

        totalLocked[user] -= lock.amount;
        totalLockedByPurpose[lock.purpose] -= lock.amount;

        emit TokensUnlocked(user, lock.amount, lock.purpose);
    }

    /**
     * @dev Transfer locked tokens from one user to another (for rewards distribution)
     * @param from Address to transfer from
     * @param to Address to transfer to
     * @param amount Amount to transfer
     * @param purpose Purpose of the original lock
     */
    function transferLocked(
        address from,
        address to,
        uint256 amount,
        bytes32 purpose
    ) external onlyAuthorized nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (to == address(0)) revert ZeroAddress();
        
        // Find and remove locks totaling the required amount
        uint256 remainingAmount = amount;
        uint256 i = 0;
        
        while (i < userLocks[from].length && remainingAmount > 0) {
            Lock storage lock = userLocks[from][i];
            
            if (lock.purpose == purpose) {
                if (lock.amount <= remainingAmount) {
                    // Use entire lock
                    remainingAmount -= lock.amount;
                    totalLocked[from] -= lock.amount;
                    totalLockedByPurpose[purpose] -= lock.amount;
                    
                    // Remove lock
                    uint256 lastIndex = userLocks[from].length - 1;
                    if (i != lastIndex) {
                        userLocks[from][i] = userLocks[from][lastIndex];
                    }
                    userLocks[from].pop();
                } else {
                    // Use part of lock
                    lock.amount -= remainingAmount;
                    totalLocked[from] -= remainingAmount;
                    totalLockedByPurpose[purpose] -= remainingAmount;
                    remainingAmount = 0;
                    i++;
                }
            } else {
                i++;
            }
        }
        
        if (remainingAmount > 0) {
            revert InsufficientUnlockedBalance(amount, amount - remainingAmount);
        }
        
        // Transfer the tokens
        _transfer(from, to, amount);
        
        emit LockedTransfer(from, to, amount, purpose);
    }

    /**
     * @dev Get all locks for a user
     */
    function getUserLocks(address user) external view returns (Lock[] memory) {
        return userLocks[user];
    }

    /**
     * @dev Get number of locks for a user
     */
    function getUserLockCount(address user) external view returns (uint256) {
        return userLocks[user].length;
    }

    /**
     * @dev Mint rewards to users (only authorized contracts)
     */
    function mintReward(address to, uint256 amount) external onlyAuthorized {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        
        // Mint from remaining supply in contract
        _transfer(address(this), to, amount);
    }

    /**
     * @dev Burn tokens from an account (for penalties)
     */
    function burn(uint256 amount) external {
        if (availableBalance(msg.sender) < amount) {
            revert InsufficientUnlockedBalance(amount, availableBalance(msg.sender));
        }
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }

    /**
     * @dev Burn tokens from another account (for penalties by authorized contracts)
     */
    function burnFrom(address from, uint256 amount) external onlyAuthorized {
        if (availableBalance(from) < amount) {
            revert InsufficientUnlockedBalance(amount, availableBalance(from));
        }
        _burn(from, amount);
        emit TokensBurned(from, amount);
    }

    /**
     * @dev Pause token transfers (emergency use only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause token transfers
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Get remaining tokens in contract (for distribution)
     */
    function remainingSupply() external view returns (uint256) {
        return balanceOf(address(this));
    }

    /**
     * @dev Override _update to check for locked tokens and handle pausable
     * This replaces the old _beforeTokenTransfer in OpenZeppelin v5
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20Pausable, ERC20) {
        if (from != address(0) && amount > 0) {
            if (availableBalance(from) < amount) {
                revert InsufficientUnlockedBalance(amount, availableBalance(from));
            }
        }

        super._beforeTokenTransfer(from, to, amount);
    }

}