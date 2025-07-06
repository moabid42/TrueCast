// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract JournalistApplication {
    // Application status enum
    enum ApplicationStatus { PENDING, APPROVED, REJECTED }

    // Application struct
    struct Application {
        uint256 id;
        address applicant;
        string title;
        string description;
        string proofHash; // Walrus hash of the proof document
        string proofContentType; // MIME type of the proof document
        uint256 timestamp;
        ApplicationStatus status;
        address reviewer;
        string reviewNotes;
        uint256 reviewTimestamp;
    }

    // State variables
    mapping(uint256 => Application) public applications;
    mapping(address => uint256[]) public applicationsByApplicant;
    mapping(address => bool) public journalists;
    
    uint256 public nextApplicationId = 1;
    address public owner;

    // Events
    event ApplicationSubmitted(uint256 indexed applicationId, address indexed applicant, string title);
    event ApplicationReviewed(uint256 indexed applicationId, address indexed reviewer, ApplicationStatus status, string notes);
    event JournalistAdded(address indexed journalist);
    event JournalistRemoved(address indexed journalist);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    modifier onlyJournalist() {
        require(journalists[msg.sender], "Only journalists can call this");
        _;
    }

    modifier applicationExists(uint256 applicationId) {
        require(applicationId > 0 && applicationId < nextApplicationId, "Application does not exist");
        _;
    }

    modifier onlyApplicant(uint256 applicationId) {
        require(applications[applicationId].applicant == msg.sender, "Only applicant can call this");
        _;
    }

    // Constructor
    constructor() {
        owner = msg.sender;
    }

    // Main Functions

    /**
     * @dev Submit a journalist application
     * @param title Application title
     * @param description Application description
     * @param proofHash Walrus hash of the proof document
     * @param proofContentType MIME type of the proof document
     */
    function submitApplication(
        string memory title,
        string memory description,
        string memory proofHash,
        string memory proofContentType
    ) external returns (uint256) {
        require(!journalists[msg.sender], "Already a journalist");
        
        uint256 applicationId = nextApplicationId++;
        
        Application storage newApplication = applications[applicationId];
        newApplication.id = applicationId;
        newApplication.applicant = msg.sender;
        newApplication.title = title;
        newApplication.description = description;
        newApplication.proofHash = proofHash;
        newApplication.proofContentType = proofContentType;
        newApplication.timestamp = block.timestamp;
        newApplication.status = ApplicationStatus.PENDING;

        applicationsByApplicant[msg.sender].push(applicationId);

        emit ApplicationSubmitted(applicationId, msg.sender, title);
        return applicationId;
    }

    /**
     * @dev Review a journalist application (admin only)
     * @param applicationId The ID of the application
     * @param approved Whether to approve or reject
     * @param notes Review notes
     */
    function reviewApplication(
        uint256 applicationId,
        bool approved,
        string memory notes
    ) external onlyAdmin applicationExists(applicationId) {
        Application storage application = applications[applicationId];
        require(application.status == ApplicationStatus.PENDING, "Application already reviewed");

        application.status = approved ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED;
        application.reviewer = msg.sender;
        application.reviewNotes = notes;
        application.reviewTimestamp = block.timestamp;

        if (approved) {
            journalists[application.applicant] = true;
            emit JournalistAdded(application.applicant);
        }

        emit ApplicationReviewed(applicationId, msg.sender, application.status, notes);
    }

    // Admin Functions

    /**
     * @dev Add a journalist directly (admin only)
     * @param journalist The address to add as journalist
     */
    function addJournalist(address journalist) external onlyAdmin {
        require(!journalists[journalist], "Already a journalist");
        journalists[journalist] = true;
        emit JournalistAdded(journalist);
    }

    /**
     * @dev Remove a journalist (admin only)
     * @param journalist The address to remove as journalist
     */
    function removeJournalist(address journalist) external onlyAdmin {
        require(journalists[journalist], "Not a journalist");
        journalists[journalist] = false;
        emit JournalistRemoved(journalist);
    }



    // Query Functions

    /**
     * @dev Get application details
     * @param applicationId The ID of the application
     * @return Application struct data
     */
    function getApplication(uint256 applicationId) external view applicationExists(applicationId) returns (Application memory) {
        return applications[applicationId];
    }

    /**
     * @dev Get all applications by an applicant
     * @param applicant The applicant's address
     * @return Array of application IDs
     */
    function getApplicationsByApplicant(address applicant) external view returns (uint256[] memory) {
        return applicationsByApplicant[applicant];
    }

    /**
     * @dev Get all pending applications
     * @return Array of application IDs
     */
    function getPendingApplications() external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // First pass: count pending applications
        for (uint256 i = 1; i < nextApplicationId; i++) {
            if (applications[i].status == ApplicationStatus.PENDING) {
                count++;
            }
        }
        
        // Second pass: populate array
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i < nextApplicationId; i++) {
            if (applications[i].status == ApplicationStatus.PENDING) {
                result[index] = i;
                index++;
            }
        }
        
        return result;
    }

    /**
     * @dev Get total number of applications
     * @return Total application count
     */
    function getTotalApplications() external view returns (uint256) {
        return nextApplicationId - 1;
    }

    /**
     * @dev Check if an address is a journalist
     * @param user The address to check
     * @return Boolean indicating if user is a journalist
     */
    function isJournalist(address user) external view returns (bool) {
        return journalists[user];
    }

    /**
     * @dev Check if an address is an admin (only owner is admin)
     * @param user The address to check
     * @return Boolean indicating if user is an admin
     */
    function isAdmin(address user) external view returns (bool) {
        return user == owner;
    }

    // Utility Functions

    /**
     * @dev Get applications by status
     * @param status The status to filter by
     * @return Array of application IDs
     */
    function getApplicationsByStatus(ApplicationStatus status) external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // First pass: count applications with matching status
        for (uint256 i = 1; i < nextApplicationId; i++) {
            if (applications[i].status == status) {
                count++;
            }
        }
        
        // Second pass: populate array
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i < nextApplicationId; i++) {
            if (applications[i].status == status) {
                result[index] = i;
                index++;
            }
        }
        
        return result;
    }
} 