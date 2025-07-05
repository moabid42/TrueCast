// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ArticleManager {
    // Article status enum
    enum ArticleStatus { DRAFT, UNDER_REVIEW, PUBLISHED, FLAGGED }

    // Article struct
    struct Article {
        uint256 id;
        address author;
        string walrusHash;
        uint256 timestamp;
        ArticleStatus status;
        uint256 stake;
        uint256 version;
        string[] mediaHashes; // Array of Walrus hashes for media attachments
        string metadata; // JSON string for additional metadata
    }

    // State variables
    mapping(uint256 => Article) public articles;
    mapping(address => uint256[]) public articlesByAuthor;
    mapping(uint256 => uint256[]) public articlesByDate; // timestamp => article IDs
    mapping(uint256 => mapping(uint256 => string)) public articleVersions; // articleId => version => walrusHash
    
    uint256 public nextArticleId = 1;
    uint256 public minimumStake = 0.01 ether;
    address public stakingManager;
    
    // Events
    event ArticleCreated(uint256 indexed articleId, address indexed author, string walrusHash, uint256 stake);
    event ArticleUpdated(uint256 indexed articleId, uint256 newVersion, string newWalrusHash);
    event ArticleStatusChanged(uint256 indexed articleId, ArticleStatus oldStatus, ArticleStatus newStatus);
    event StakeAdjusted(uint256 indexed articleId, uint256 oldStake, uint256 newStake);
    event MediaAttached(uint256 indexed articleId, string mediaHash);
    event StakingManagerUpdated(address oldManager, address newManager);

    // Modifiers
    modifier onlyAuthor(uint256 articleId) {
        require(articles[articleId].author == msg.sender, "Not the article author");
        _;
    }

    modifier onlyStakingManager() {
        require(msg.sender == stakingManager, "Only staking manager can call this");
        _;
    }

    modifier articleMustExist(uint256 articleId) {
        require(articleId > 0 && articleId < nextArticleId, "Article does not exist");
        _;
    }

    modifier validStake() {
        require(msg.value >= minimumStake, "Stake below minimum required");
        _;
    }

    // Constructor
    constructor(address _stakingManager) {
        stakingManager = _stakingManager;
    }

    // Main Functions

    /**
     * @dev Creates a new article with minimum stake requirement
     * @param walrusHash The Walrus storage hash for the article content
     * @param metadata JSON string containing article metadata
     */
    function createArticle(
        string memory walrusHash,
        string memory metadata
    ) external payable validStake returns (uint256) {
        uint256 articleId = nextArticleId++;
        
        Article storage newArticle = articles[articleId];
        newArticle.id = articleId;
        newArticle.author = msg.sender;
        newArticle.walrusHash = walrusHash;
        newArticle.timestamp = block.timestamp;
        newArticle.status = ArticleStatus.DRAFT;
        newArticle.stake = msg.value;
        newArticle.version = 1;
        newArticle.metadata = metadata;

        // Store version history
        articleVersions[articleId][1] = walrusHash;

        // Add to author's articles
        articlesByAuthor[msg.sender].push(articleId);

        // Add to date index (using day timestamp)
        uint256 dayTimestamp = (block.timestamp / 86400) * 86400;
        articlesByDate[dayTimestamp].push(articleId);

        emit ArticleCreated(articleId, msg.sender, walrusHash, msg.value);
        return articleId;
    }

    /**
     * @dev Updates an existing article with a new version
     * @param articleId The ID of the article to update
     * @param newWalrusHash The new Walrus storage hash
     * @param newMetadata Updated metadata
     */
    function updateArticle(
        uint256 articleId,
        string memory newWalrusHash,
        string memory newMetadata
    ) external articleMustExist(articleId) onlyAuthor(articleId) {
        Article storage article = articles[articleId];
        require(article.status == ArticleStatus.DRAFT || article.status == ArticleStatus.UNDER_REVIEW, 
                "Cannot update published or flagged articles");

        article.version++;
        article.walrusHash = newWalrusHash;
        article.metadata = newMetadata;

        // Store version history
        articleVersions[articleId][article.version] = newWalrusHash;

        emit ArticleUpdated(articleId, article.version, newWalrusHash);
    }

    /**
     * @dev Changes the status of an article
     * @param articleId The ID of the article
     * @param newStatus The new status
     */
    function changeArticleStatus(
        uint256 articleId,
        ArticleStatus newStatus
    ) external articleMustExist(articleId) {
        Article storage article = articles[articleId];
        require(msg.sender == article.author || msg.sender == stakingManager, 
                "Only author or staking manager can change status");

        ArticleStatus oldStatus = article.status;
        article.status = newStatus;

        emit ArticleStatusChanged(articleId, oldStatus, newStatus);
    }

    /**
     * @dev Adds media attachment to an article
     * @param articleId The ID of the article
     * @param mediaHash Walrus hash of the media file
     */
    function attachMedia(
        uint256 articleId,
        string memory mediaHash
    ) external onlyAuthor(articleId) articleMustExist(articleId) {
        articles[articleId].mediaHashes.push(mediaHash);
        emit MediaAttached(articleId, mediaHash);
    }

    /**
     * @dev Adjusts stake for an article (integration with StakingManager)
     * @param articleId The ID of the article
     * @param newStake The new stake amount
     */
    function adjustStake(
        uint256 articleId,
        uint256 newStake
    ) external onlyStakingManager articleMustExist(articleId) {
        uint256 oldStake = articles[articleId].stake;
        articles[articleId].stake = newStake;
        emit StakeAdjusted(articleId, oldStake, newStake);
    }

    // Query Functions

    /**
     * @dev Gets all articles by a specific author
     * @param author The author's address
     * @return Array of article IDs
     */
    function getArticlesByAuthor(address author) external view returns (uint256[] memory) {
        return articlesByAuthor[author];
    }

    /**
     * @dev Gets all articles created on a specific date
     * @param date Timestamp (will be rounded down to day)
     * @return Array of article IDs
     */
    function getArticlesByDate(uint256 date) external view returns (uint256[] memory) {
        uint256 dayTimestamp = (date / 86400) * 86400;
        return articlesByDate[dayTimestamp];
    }

    /**
     * @dev Gets article details
     * @param articleId The ID of the article
     * @return Article struct data
     */
    function getArticle(uint256 articleId) external view articleMustExist(articleId) returns (Article memory) {
        return articles[articleId];
    }

    /**
     * @dev Gets specific version of an article
     * @param articleId The ID of the article
     * @param version The version number
     * @return Walrus hash for that version
     */
    function getArticleVersion(uint256 articleId, uint256 version) external view returns (string memory) {
        return articleVersions[articleId][version];
    }

    /**
     * @dev Gets all media hashes for an article
     * @param articleId The ID of the article
     * @return Array of media hashes
     */
    function getArticleMedia(uint256 articleId) external view articleMustExist(articleId) returns (string[] memory) {
        return articles[articleId].mediaHashes;
    }

    /**
     * @dev Gets articles by status
     * @param status The status to filter by
     * @return Array of article IDs
     */
    function getArticlesByStatus(ArticleStatus status) external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // First pass: count articles with matching status
        for (uint256 i = 1; i < nextArticleId; i++) {
            if (articles[i].status == status) {
                count++;
            }
        }
        
        // Second pass: populate array
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i < nextArticleId; i++) {
            if (articles[i].status == status) {
                result[index] = i;
                index++;
            }
        }
        
        return result;
    }

    // Admin Functions

    /**
     * @dev Updates the staking manager address
     * @param newStakingManager The new staking manager address
     */
    function updateStakingManager(address newStakingManager) external {
        require(msg.sender == stakingManager, "Only current staking manager can update");
        address oldManager = stakingManager;
        stakingManager = newStakingManager;
        emit StakingManagerUpdated(oldManager, newStakingManager);
    }

    /**
     * @dev Updates the minimum stake requirement
     * @param newMinimumStake The new minimum stake amount
     */
    function updateMinimumStake(uint256 newMinimumStake) external onlyStakingManager {
        minimumStake = newMinimumStake;
    }

    // Utility Functions

    /**
     * @dev Gets the total number of articles
     * @return Total article count
     */
    function getTotalArticles() external view returns (uint256) {
        return nextArticleId - 1;
    }

    /**
     * @dev Checks if an article exists
     * @param articleId The ID to check
     * @return Boolean indicating existence
     */
    function articleExists(uint256 articleId) external view returns (bool) {
        return articleId > 0 && articleId < nextArticleId;
    }

    // Emergency Functions

    /**
     * @dev Emergency function to withdraw contract balance (only staking manager)
     */
    function emergencyWithdraw() external onlyStakingManager {
        payable(stakingManager).transfer(address(this).balance);
    }

    // Allow contract to receive Ether
    receive() external payable {}
    fallback() external payable {}
}
