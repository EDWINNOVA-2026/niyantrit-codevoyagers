from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Boolean, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum

# Enums for role and status
class UserRole(str, enum.Enum):
    CITIZEN = "Citizen"
    CONTRACTOR = "Contractor"
    OFFICIAL = "Official"
    ADMIN = "Admin"

class ComplaintStatus(str, enum.Enum):
    PENDING = "Pending"
    ASSIGNED = "Assigned"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"
    CLOSED = "Closed"

class ComplaintCategory(str, enum.Enum):
    LABOR_VIOLATION = "Labor Violation"
    FUND_MISUSE = "Fund Misuse"
    SAFETY_HAZARD = "Safety Hazard"
    QUALITY_ISSUE = "Quality Issue"
    DELAY = "Delay"
    ENVIRONMENTAL = "Environmental"
    OTHER = "Other"

class ProjectStatus(str, enum.Enum):
    PLANNING = "Planning"
    ACTIVE = "Active"
    DELAYED = "Delayed"
    COMPLETED = "Completed"
    ON_HOLD = "On Hold"

class MediaVerificationStatus(str, enum.Enum):
    UNVERIFIED = "Unverified"
    VERIFIED = "Verified"
    SUSPICIOUS = "Suspicious"
    FLAGGED = "Flagged"

class DisbursementStatus(str, enum.Enum):
    PENDING = "Pending"
    PARTIALLY_APPROVED = "Partially Approved"
    FULLY_APPROVED = "Fully Approved"
    DISBURSED = "Disbursed"
    CANCELLED = "Cancelled"

# User Table
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    full_name = Column(String, nullable=True)
    role = Column(SQLEnum(UserRole), default=UserRole.CITIZEN)
    location_jurisdiction = Column(String, nullable=True)  # For officials managing specific regions
    phone = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    # Relationships
    complaints_created = relationship("Complaint", back_populates="created_by", foreign_keys="Complaint.created_by_id")
    complaints_assigned = relationship("ComplaintRouting", back_populates="assigned_official")
    media_uploaded = relationship("Media", back_populates="uploaded_by")
    complaint_supports = relationship("ComplaintSupport", back_populates="user")
    notification_tokens = relationship("NotificationToken", back_populates="user")

# Project Table
class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, unique=True, index=True)
    project_name = Column(String, index=True)
    location = Column(String)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    contractor_id = Column(String)
    total_funds = Column(Float)
    labour_cost = Column(Float)
    material_cost = Column(Float)
    other_cost = Column(Float)
    status = Column(SQLEnum(ProjectStatus), default=ProjectStatus.PLANNING)
    start_date = Column(DateTime, nullable=True)
    expected_end_date = Column(DateTime, nullable=True)
    actual_end_date = Column(DateTime, nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    complaints = relationship("Complaint", back_populates="project")
    risk_scores = relationship("RiskScore", back_populates="project")
    media = relationship("Media", back_populates="project")

# Enhanced Complaint Table
class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), index=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), index=True)
    
    # Original complaint data
    description = Column(String)
    transcribed_text = Column(String, nullable=True)  # From voice input
    formal_complaint_text = Column(String, nullable=True)  # AI-enhanced formal version
    voice_file_path = Column(String, nullable=True)  # Path to voice recording

    # Structured contractor update fields
    milestone_name = Column(String, nullable=True)
    work_summary = Column(String, nullable=True)
    next_action = Column(String, nullable=True)
    blockers = Column(String, nullable=True)
    target_date = Column(String, nullable=True)  # ISO date string (YYYY-MM-DD)
    progress_update = Column(Float, nullable=True)  # 0-100
    reported_material_cost = Column(Float, nullable=True)
    reported_labour_cost = Column(Float, nullable=True)
    is_contractor_update = Column(Boolean, default=False)
    
    # Categorization and routing
    category = Column(SQLEnum(ComplaintCategory), nullable=True)
    nlp_confidence_score = Column(Float, nullable=True)  # 0-1 confidence of category assignment
    
    # Priority and severity
    priority = Column(Integer, default=5)  # 0-10 scale
    severity = Column(Integer, default=5)  # 0-10 scale
    
    # Status tracking
    status = Column(SQLEnum(ComplaintStatus), default=ComplaintStatus.PENDING)
    file = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    
    # Relationships
    project = relationship("Project", back_populates="complaints")
    created_by = relationship("User", back_populates="complaints_created", foreign_keys=[created_by_id])
    routing = relationship("ComplaintRouting", back_populates="complaint")
    media = relationship("Media", back_populates="complaint")
    supports = relationship(
        "ComplaintSupport",
        back_populates="complaint",
        cascade="all, delete-orphan",
    )


class ComplaintSupport(Base):
    __tablename__ = "complaint_supports"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint(
            "complaint_id",
            "user_id",
            name="uq_complaint_support_complaint_user",
        ),
    )

    complaint = relationship("Complaint", back_populates="supports")
    user = relationship("User", back_populates="complaint_supports")


class NotificationToken(Base):
    __tablename__ = "notification_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    token = Column(String, unique=True, index=True)
    platform = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="notification_tokens")

# Complaint Routing & Assignment Table
class ComplaintRouting(Base):
    __tablename__ = "complaint_routings"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), index=True)
    assigned_official_id = Column(Integer, ForeignKey("users.id"), index=True)
    
    routed_category = Column(SQLEnum(ComplaintCategory))
    confidence_score = Column(Float)  # 0-1 NLP confidence
    routing_notes = Column(String, nullable=True)
    
    assigned_date = Column(DateTime, default=datetime.utcnow)
    completed_date = Column(DateTime, nullable=True)
    
    # Relationships
    complaint = relationship("Complaint", back_populates="routing")
    assigned_official = relationship("User", back_populates="complaints_assigned")

# Risk Score Table
class RiskScore(Base):
    __tablename__ = "risk_scores"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), index=True)
    
    risk_score = Column(Float)  # 0-100 scale
    risk_factors = Column(JSON)  # Dict of factors contributing to risk
    
    predicted_delay_days = Column(Integer, nullable=True)
    fund_misuse_likelihood = Column(Float, nullable=True)  # 0-1 probability
    
    calculated_at = Column(DateTime, default=datetime.utcnow)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="risk_scores")

# Media Upload & Verification Table
class Media(Base):
    __tablename__ = "media"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), index=True)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=True)
    
    file_path = Column(String)
    file_type = Column(String)  # image/jpeg, image/png, video/mp4, etc.
    file_size = Column(Integer)
    
    # EXIF metadata
    exif_data = Column(JSON, nullable=True)  # Extracted EXIF metadata
    capture_timestamp = Column(DateTime, nullable=True)
    capture_latitude = Column(Float, nullable=True)
    capture_longitude = Column(Float, nullable=True)
    capture_camera_model = Column(String, nullable=True)
    
    # Verification results
    verification_status = Column(SQLEnum(MediaVerificationStatus), default=MediaVerificationStatus.UNVERIFIED)
    verification_confidence = Column(Float, nullable=True)  # 0-1 confidence
    verification_notes = Column(String, nullable=True)
    
    # Flags
    is_suspicious = Column(Boolean, default=False)
    locations_match = Column(Boolean, nullable=True)  # GPS vs project location
    timestamp_valid = Column(Boolean, nullable=True)  # Timestamp vs complaint date
    
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    verified_at = Column(DateTime, nullable=True)
    
    # Relationships
    project = relationship("Project", back_populates="media")
    uploaded_by = relationship("User", back_populates="media_uploaded")
    complaint = relationship("Complaint", back_populates="media")


# Fund Disbursement Tracking Table
class FundDisbursement(Base):
    __tablename__ = "fund_disbursements"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), index=True)
    
    # Milestone details
    milestone_name = Column(String)
    fund_amount = Column(Float)
    
    # Approval tracking
    approval_threshold = Column(Integer, default=1)
    approval_count = Column(Integer, default=0)
    status = Column(SQLEnum(DisbursementStatus), default=DisbursementStatus.PENDING)
    
    # Blockchain integration
    blockchain_tx_hash = Column(String, nullable=True)  # Ethereum transaction hash
    milestone_contract_id = Column(Integer, nullable=True)  # ID on smart contract
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    disbursed_date = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="fund_disbursements")


# Update Project model to include fund disbursements relationship
Project.fund_disbursements = relationship("FundDisbursement", back_populates="project")