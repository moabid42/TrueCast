// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;


contract FactCheckTest {
    /// @notice Emitted when a fact‐check is requested
    event FactCheckRequested(
        uint256 indexed requestId,
        address indexed requester,
        string claim
    );
    /// @notice Emitted when a fact‐check is fulfilled
    event FactCheckFulfilled(
        uint256 indexed requestId,
        string verdict,
        string explanation
    );

    uint256 public nextRequestId = 1;

    /// @notice Request a fact‐check on your given claim
    function requestFactCheck(string memory claim) public returns (uint256) {
        uint256 id = nextRequestId++;
        emit FactCheckRequested(id, msg.sender, claim);
        return id;
    }

    /// @notice Fulfill a previously requested fact‐check
    function fulfillFactCheck(
        uint256 requestId,
        string memory verdict,
        string memory explanation
    ) public {
        emit FactCheckFulfilled(requestId, verdict, explanation);
    }

    /// @notice Convenience method to do both in one tx with dummy data
    function testFactCheck() external {
        // 1) Emit the request, capturing the new requestId
        uint256 id = requestFactCheck("The Eiffel Tower is in Berlin");

        // 2) Immediately emit a dummy fulfillment using the same id
        fulfillFactCheck(
            id,
            "REFUTED",
            "Dummy: Eiffel Tower is in Paris, not Berlin."
        );
    }
}