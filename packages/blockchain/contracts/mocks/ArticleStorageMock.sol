// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ArticleStorageMock {
    mapping(uint256 => bool) public exists;

    function setArticleExists(uint256 articleId, bool value) external {
        exists[articleId] = value;
    }

    function articleExists(uint256 articleId) external view returns (bool) {
        return exists[articleId];
    }

    function getArticle(uint256 articleId) external view returns (
        string memory title,
        string memory content,
        string memory ipfsHash,
        address author,
        uint256 timestamp,
        bool isActive
    ) {
        require(exists[articleId], "Article does not exist in mock");
        return ("Title", "Content", "QmHash", address(0x123), 1234567890, true);
    }
} 