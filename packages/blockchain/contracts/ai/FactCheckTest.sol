// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract FactChecker {
    struct Result {
      bool    fulfilled;
      string  verdict;
      string  explanation;
    }

    event FactCheckRequested(
      uint256 indexed requestId,
      address indexed requester,
      string uri
    );
    event FactCheckFulfilled(
      uint256 indexed requestId,
      string   verdict,
      string   explanation
    );

    uint256 public nextRequestId = 1;
    mapping(uint256 => Result) public results;

    function requestFactCheck(string calldata uri) external returns (uint256) {
      uint256 id = nextRequestId++;
      emit FactCheckRequested(id, msg.sender, uri);
      return id;
    }

    // only your relayer’s address should be allowed in production
    function fulfillFactCheck(
      uint256 requestId,
      string calldata verdict,
      string calldata explanation
    ) external {
      results[requestId] = Result({
        fulfilled:   true,
        verdict:     verdict,
        explanation: explanation
      });
      emit FactCheckFulfilled(requestId, verdict, explanation);
    }

    /// @notice read back the fact-check
    function getResult(uint256 reque\stId)
      external
      view
      returns (bool fulfilled, string memory verdict, string memory explanation)
    {
      Result storage r = results[requestId];
      return (r.fulfilled, r.verdict, r.explanation);
    }
}
