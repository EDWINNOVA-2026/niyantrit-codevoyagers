// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title FundDisbursement
 * @dev Manages fund disbursement milestones with approval workflow and audit trail
 * @notice For use with Niyantrit complaint management system
 */

contract FundDisbursement {
    
    // ============================================================================
    // DATA STRUCTURES
    // ============================================================================
    
    enum MilestoneStatus {
        PENDING,
        PARTIALLY_APPROVED,
        FULLY_APPROVED,
        DISBURSED,
        CANCELLED
    }
    
    struct Milestone {
        uint256 id;
        string name;
        string projectId;
        uint256 fundAmount;
        uint256 approvalThreshold;
        uint256 approvalsReceived;
        MilestoneStatus status;
        uint256 createdAt;
        uint256 disburseDate;
        address createdBy;
        address disburseRecipient;
        bool isDisbursed;
        mapping(address => bool) approvers;
        address[] approvalList;
    }
    
    // ============================================================================
    // STATE VARIABLES
    // ============================================================================
    
    address public owner;
    uint256 public milestoneCounter;
    
    mapping(uint256 => Milestone) public milestones;
    mapping(string => uint256[]) public projectMilestones;
    mapping(address => uint256[]) public userMilestones;
    
    // Roles
    mapping(address => bool) public isOfficial;
    mapping(address => bool) public isAdmin;
    
    // Event logs
    MilestoneEvent[] public eventLog;
    
    struct MilestoneEvent {
        uint256 milestoneId;
        string eventType;
        address indexed actor;
        uint256 timestamp;
        string description;
    }
    
    // ============================================================================
    // EVENTS
    // ============================================================================
    
    event MilestoneCreated(
        uint256 indexed milestoneId,
        string milestone Name,
        string projectId,
        uint256 fundAmount,
        uint256 approvalThreshold,
        address indexed creator,
        uint256 timestamp
    );
    
    event MilestoneApproved(
        uint256 indexed milestoneId,
        address indexed approver,
        uint256 approvalsReceived,
        uint256 approvalThreshold,
        uint256 timestamp
    );
    
    event MilestoneFullyApproved(
        uint256 indexed milestoneId,
        uint256 timestamp
    );
    
    event FundsDisbursed(
        uint256 indexed milestoneId,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );
    
    event MilestoneCancelled(
        uint256 indexed milestoneId,
        address indexed cancelledBy,
        uint256 timestamp
    );
    
    event OfficialAdded(
        address indexed official,
        uint256 timestamp
    );
    
    event OfficialRemoved(
        address indexed official,
        uint256 timestamp
    );
    
    // ============================================================================
    // MODIFIERS
    // ============================================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyOfficial() {
        require(isOfficial[msg.sender], "Only officials can call this function");
        _;
    }
    
    modifier onlyAdminOrOfficial() {
        require(isAdmin[msg.sender] || isOfficial[msg.sender], "Only admins or officials can call this function");
        _;
    }
    
    modifier milestoneExists(uint256 _milestoneId) {
        require(_milestoneId > 0 && _milestoneId <= milestoneCounter, "Milestone does not exist");
        _;
    }
    
    modifier milestoneNotDisbursed(uint256 _milestoneId) {
        require(!milestones[_milestoneId].isDisbursed, "Milestone already disbursed");
        _;
    }
    
    // ============================================================================
    // CONSTRUCTOR
    // ============================================================================
    
    constructor() {
        owner = msg.sender;
        isAdmin[msg.sender] = true;
        milestoneCounter = 0;
    }
    
    // ============================================================================
    // ADMINISTRATION FUNCTIONS
    // ============================================================================
    
    /**
     * @dev Add an official who can approve milestones
     * @param _official Address of the official
     */
    function addOfficial(address _official) external onlyOwner {
        require(_official != address(0), "Invalid address");
        require(!isOfficial[_official], "Already an official");
        
        isOfficial[_official] = true;
        emit OfficialAdded(_official, block.timestamp);
    }
    
    /**
     * @dev Remove an official's approval rights
     * @param _official Address of the official
     */
    function removeOfficial(address _official) external onlyOwner {
        require(isOfficial[_official], "Not an official");
        
        isOfficial[_official] = false;
        emit OfficialRemoved(_official, block.timestamp);
    }
    
    /**
     * @dev Transfer ownership
     * @param _newOwner Address of new owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        owner = _newOwner;
        isAdmin[_newOwner] = true;
    }
    
    // ============================================================================
    // MILESTONE MANAGEMENT FUNCTIONS
    // ============================================================================
    
    /**
     * @dev Create a new fund disbursement milestone
     * @param _name Name of the milestone
     * @param _fundAmount Amount to disburse (in wei)
     * @param _approvalThreshold Number of approvals required
     * @param _projectId Project identifier
     */
    function createMilestone(
        bytes memory _name,
        uint256 _fundAmount,
        uint256 _approvalThreshold,
        bytes memory _projectId
    ) external onlyAdminOrOfficial returns (uint256) {
        
        require(_fundAmount > 0, "Fund amount must be greater than 0");
        require(_approvalThreshold > 0, "Approval threshold must be greater than 0");
        require(_name.length > 0, "Name cannot be empty");
        require(_projectId.length > 0, "Project ID cannot be empty");
        
        milestoneCounter++;
        uint256 newId = milestoneCounter;
        
        Milestone storage m = milestones[newId];
        m.id = newId;
        m.name = string(_name);
        m.projectId = string(_projectId);
        m.fundAmount = _fundAmount;
        m.approvalThreshold = _approvalThreshold;
        m.status = MilestoneStatus.PENDING;
        m.createdAt = block.timestamp;
        m.createdBy = msg.sender;
        m.isDisbursed = false;
        
        projectMilestones[string(_projectId)].push(newId);
        userMilestones[msg.sender].push(newId);
        
        _logEvent(newId, "CREATED", string(abi.encodePacked("Milestone created: ", _name)));
        
        emit MilestoneCreated(
            newId,
            string(_name),
            string(_projectId),
            _fundAmount,
            _approvalThreshold,
            msg.sender,
            block.timestamp
        );
        
        return newId;
    }
    
    /**
     * @dev Official approves a milestone
     * @param _milestoneId ID of the milestone to approve
     */
    function approveMilestone(uint256 _milestoneId)
        external
        onlyOfficial
        milestoneExists(_milestoneId)
        milestoneNotDisbursed(_milestoneId)
    {
        Milestone storage m = milestones[_milestoneId];
        
        require(!m.approvers[msg.sender], "Already approved by this official");
        require(m.status != MilestoneStatus.CANCELLED, "Milestone is cancelled");
        require(m.status != MilestoneStatus.FULLY_APPROVED, "Milestone already fully approved");
        
        // Record approval
        m.approvers[msg.sender] = true;
        m.approvalList.push(msg.sender);
        m.approvalsReceived++;
        
        // Update status
        if (m.approvalsReceived >= m.approvalThreshold) {
            m.status = MilestoneStatus.FULLY_APPROVED;
            _logEvent(_milestoneId, "FULLY_APPROVED", "Milestone fully approved");
            emit MilestoneFullyApproved(_milestoneId, block.timestamp);
        } else {
            m.status = MilestoneStatus.PARTIALLY_APPROVED;
            _logEvent(
                _milestoneId,
                "PARTIALLY_APPROVED",
                string(abi.encodePacked("Approved by official. ", _toString(m.approvalsReceived), "/", _toString(m.approvalThreshold)))
            );
        }
        
        emit MilestoneApproved(
            _milestoneId,
            msg.sender,
            m.approvalsReceived,
            m.approvalThreshold,
            block.timestamp
        );
    }
    
    /**
     * @dev Disburse funds for a fully approved milestone
     * @param _milestoneId ID of the milestone
     * @param _recipient Address to receive funds
     */
    function disburseFunds(uint256 _milestoneId, address _recipient)
        external
        onlyAdminOrOfficial
        milestoneExists(_milestoneId)
        milestoneNotDisbursed(_milestoneId)
    {
        Milestone storage m = milestones[_milestoneId];
        
        require(_recipient != address(0), "Invalid recipient address");
        require(m.status == MilestoneStatus.FULLY_APPROVED, "Milestone not fully approved");
        
        // Mark as disbursed
        m.isDisbursed = true;
        m.status = MilestoneStatus.DISBURSED;
        m.disburseDate = block.timestamp;
        m.disburseRecipient = _recipient;
        
        _logEvent(
            _milestoneId,
            "DISBURSED",
            string(abi.encodePacked("Funds disbursed to ", _addressToString(_recipient)))
        );
        
        emit FundsDisbursed(_milestoneId, _recipient, m.fundAmount, block.timestamp);
    }
    
    /**
     * @dev Cancel a milestone
     * @param _milestoneId ID of the milestone to cancel
     */
    function cancelMilestone(uint256 _milestoneId)
        external
        onlyAdminOrOfficial
        milestoneExists(_milestoneId)
        milestoneNotDisbursed(_milestoneId)
    {
        Milestone storage m = milestones[_milestoneId];
        require(m.status != MilestoneStatus.CANCELLED, "Already cancelled");
        
        m.status = MilestoneStatus.CANCELLED;
        _logEvent(_milestoneId, "CANCELLED", "Milestone cancelled");
        
        emit MilestoneCancelled(_milestoneId, msg.sender, block.timestamp);
    }
    
    // ============================================================================
    // VIEW/QUERY FUNCTIONS
    // ============================================================================
    
    /**
     * @dev Get milestone details
     * @param _milestoneId ID of the milestone
     */
    function getMilestone(uint256 _milestoneId)
        external
        view
        milestoneExists(_milestoneId)
        returns (
            uint256 id,
            string memory name,
            string memory projectId,
            uint256 fundAmount,
            uint256 approvalThreshold,
            uint256 approvalsReceived,
            MilestoneStatus status,
            uint256 createdAt,
            bool isDisbursed
        )
    {
        Milestone storage m = milestones[_milestoneId];
        return (
            m.id,
            m.name,
            m.projectId,
            m.fundAmount,
            m.approvalThreshold,
            m.approvalsReceived,
            m.status,
            m.createdAt,
            m.isDisbursed
        );
    }
    
    /**
     * @dev Get milestones for a project
     * @param _projectId Project identifier
     */
    function getMilestonesByProject(bytes memory _projectId)
        external
        view
        returns (uint256[] memory)
    {
        return projectMilestones[string(_projectId)];
    }
    
    /**
     * @dev Get all milestones created by a user
     * @param _user User address
     */
    function getMilestonesByUser(address _user)
        external
        view
        returns (uint256[] memory)
    {
        return userMilestones[_user];
    }
    
    /**
     * @dev Get approval list for a milestone
     * @param _milestoneId ID of the milestone
     */
    function getApprovalList(uint256 _milestoneId)
        external
        view
        milestoneExists(_milestoneId)
        returns (address[] memory)
    {
        return milestones[_milestoneId].approvalList;
    }
    
    /**
     * @dev Check if official approved a milestone
     * @param _milestoneId ID of the milestone
     * @param _official Address of the official
     */
    function hasApproved(uint256 _milestoneId, address _official)
        external
        view
        milestoneExists(_milestoneId)
        returns (bool)
    {
        return milestones[_milestoneId].approvers[_official];
    }
    
    /**
     * @dev Get event log for a milestone
     */
    function getEventLog(uint256 _milestoneId)
        external
        view
        milestoneExists(_milestoneId)
        returns (MilestoneEvent[] memory)
    {
        // Filter events for this milestone
        MilestoneEvent[] memory filtered = new MilestoneEvent[](eventLog.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < eventLog.length; i++) {
            if (eventLog[i].milestoneId == _milestoneId) {
                filtered[count] = eventLog[i];
                count++;
            }
        }
        
        // Return only filled slots
        MilestoneEvent[] memory result = new MilestoneEvent[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = filtered[i];
        }
        
        return result;
    }
    
    /**
     * @dev Get total number of milestones
     */
    function getTotalMilestoneCount() external view returns (uint256) {
        return milestoneCounter;
    }
    
    // ============================================================================
    // INTERNAL HELPER FUNCTIONS
    // ============================================================================
    
    /**
     * @dev Log an event to the audit trail
     */
    function _logEvent(uint256 _milestoneId, string memory _eventType, string memory _description)
        internal
    {
        eventLog.push(MilestoneEvent({
            milestoneId: _milestoneId,
            eventType: _eventType,
            actor: msg.sender,
            timestamp: block.timestamp,
            description: _description
        }));
    }
    
    /**
     * @dev Convert address to string
     */
    function _addressToString(address _addr) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(_addr[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(_addr[i] & 0x0f)];
        }
        
        return string(str);
    }
    
    /**
     * @dev Convert uint to string
     */
    function _toString(uint256 _value) internal pure returns (string memory) {
        if (_value == 0) return "0";
        
        uint256 temp = _value;
        uint256 digits = 0;
        
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        
        while (_value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + (_value % 10)));
            _value /= 10;
        }
        
        return string(buffer);
    }
    
    // ============================================================================
    // FALLBACK & RECEIVE
    // ============================================================================
    
    // Allow contract to receive ETH (for future payment functionality)
    receive() external payable {}
    
    fallback() external payable {}
}
