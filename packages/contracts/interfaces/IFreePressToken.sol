// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IFreePressToken {
    // Struct
    struct Lock {
        uint256 amount;
        uint256 unlockTime;
        bytes32 purpose;
    }

    // Token
    function balanceOf(address account) external view returns (uint256);
    function availableBalance(address user) external view returns (uint256);
    function remainingSupply() external view returns (uint256);

    // Authorization
    function authorizeContract(address contractAddress) external;
    function deauthorizeContract(address contractAddress) external;
    function renounceOwnership() external;

    // Claims
    function claimInitialTokens(address user, bool isJournalist) external;

    // Locking
    function lockTokens(address user, uint256 amount, uint256 unlockTime, bytes32 purpose) external;
    function unlockTokens(address user, uint256 lockIndex) external;
    function forceUnlock(address user, uint256 lockIndex) external;
    function transferLocked(address from, address to, uint256 amount, bytes32 purpose) external;
    function getUserLocks(address user) external view returns (Lock[] memory);
    function getUserLockCount(address user) external view returns (uint256);

    // Minting and Burning
    function mintReward(address to, uint256 amount) external;
    function burn(uint256 amount) external;
    function burnFrom(address from, uint256 amount) external;

    // Pausable
    function pause() external;
    function unpause() external;
}
