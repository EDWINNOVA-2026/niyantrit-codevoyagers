from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
import json
import os
import io
import uuid

from database import engine, SessionLocal
from models import Base, User, Project, Complaint, ComplaintRouting, RiskScore, Media
from models import UserRole, ComplaintStatus, ComplaintCategory, ProjectStatus, MediaVerificationStatus
from auth import hash_password, verify_password, create_tokens, verify_token
from middleware.auth_middleware import (
    get_db, get_current_user, require_admin, require_official, 
    require_citizen_or_contractor, require_any_role
)
from services.complaint_router import classify_complaint, get_routing_recommendations, enhance_complaint_text
from services.risk_engine import calculate_project_risk_score, get_risk_assessment_summary
from services.speech_to_text import transcribe_audio_stream
from services.text_enhancement import enhance_complaint_text as enhance_text, check_complaint_completeness
from services.media_verification import verify_image, verify_video
from services.geolocation import (
    extract_location_from_exif, get_location_from_ip, 
    verify_location_proximity, geocode_address, calculate_distance
)
from services.blockchain_logger import (
    create_milestone, approve_milestone, disburse_funds,
    get_milestone_history, get_network_info
)

# Pydantic models for request/response
from pydantic import BaseModel

class UserRegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "Citizen"
    phone: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class ComplaintSubmitRequest(BaseModel):
    project_id: int
    description: str
    severity: Optional[int] = 5
    file: Optional[str] = None

class ComplaintResponse(BaseModel):
    id: int
    project_id: int
    description: str
    category: Optional[str]
    status: str
    priority: int
    severity: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ProjectResponse(BaseModel):
    id: int
    project_id: str
    project_name: str
    location: str
    total_funds: float
    status: str
    
    class Config:
        from_attributes = True

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Niyantrit Complaint Intelligence API",
    description="AI-powered complaint management and risk scoring for construction projects",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# HEALTH CHECK ENDPOINTS
# ============================================================================

@app.get("/")
def home():
    """Health check endpoint."""
    return {"message": "Niyantrit Backend is running", "version": "1.0.0"}

@app.get("/health")
def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "services": {
            "database": "connected",
            "api": "operational"
        }
    }

# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@app.post("/auth/register")
def register(request: UserRegisterRequest, db: Session = Depends(get_db)):
    """Register a new user."""
    
    # Check if user exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate role
    try:
        role = UserRole(request.role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join([r.value for r in UserRole])}"
        )
    
    # Create new user
    hashed_password = hash_password(request.password)
    new_user = User(
        email=request.email,
        password_hash=hashed_password,
        full_name=request.full_name,
        role=role,
        phone=request.phone
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "message": "User registered successfully",
        "user_id": new_user.id,
        "email": new_user.email,
        "role": new_user.role.value
    }

@app.post("/auth/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login and get JWT tokens."""
    
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    tokens = create_tokens(user.id, user.email, user.role.value)
    
    return {
        "access_token": tokens.access_token,
        "refresh_token": tokens.refresh_token,
        "token_type": "bearer",
        "user": {
            "user_id": user.id,
            "email": user.email,
            "role": user.role.value,
            "full_name": user.full_name
        }
    }

@app.get("/auth/me")
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return {
        "user_id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.value,
        "phone": current_user.phone,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at
    }

# ============================================================================
# PROJECT ENDPOINTS
# ============================================================================

def init_projects_from_json(db: Session):
    """Initialize projects from the JSON dataset if they don't exist."""
    
    existing_count = db.query(Project).count()
    if existing_count > 0:
        return  # Already initialized
    
    try:
        json_path = os.path.join(os.path.dirname(__file__), "..", "niyantrit_projects_dataset_200.json")
        
        if not os.path.exists(json_path):
            print(f"Projects JSON not found at {json_path}")
            return
        
        with open(json_path, 'r') as f:
            projects_data = json.load(f)
        
        for proj in projects_data:
            existing = db.query(Project).filter(Project.project_id == proj['project_id']).first()
            if not existing:
                new_project = Project(
                    project_id=proj['project_id'],
                    project_name=proj['project_name'],
                    location=proj['location'],
                    contractor_id=proj['contractor_id'],
                    total_funds=float(proj['total_funds']),
                    labour_cost=float(proj['labour_cost']),
                    material_cost=float(proj['material_cost']),
                    other_cost=float(proj['other_cost']),
                    status=ProjectStatus.ACTIVE
                )
                db.add(new_project)
        
        db.commit()
        print(f"Initialized {db.query(Project).count()} projects from JSON")
    
    except Exception as e:
        print(f"Error initializing projects: {e}")

@app.get("/projects", response_model=List[dict])
def get_projects(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of all projects with risk scores."""
    
    init_projects_from_json(db)
    
    projects = db.query(Project).offset(skip).limit(limit).all()
    
    result = []
    for project in projects:
        # Get latest risk score
        risk_score = db.query(RiskScore).filter(
            RiskScore.project_id == project.id
        ).order_by(RiskScore.calculated_at.desc()).first()
        
        result.append({
            "id": project.id,
            "project_id": project.project_id,
            "project_name": project.project_name,
            "location": project.location,
            "total_funds": project.total_funds,
            "status": project.status.value,
            "risk_score": risk_score.risk_score if risk_score else None,
            "risk_level": "UNKNOWN" if not risk_score else (
                "LOW" if risk_score.risk_score < 20 else
                "MODERATE" if risk_score.risk_score < 40 else
                "HIGH" if risk_score.risk_score < 60 else
                "VERY_HIGH" if risk_score.risk_score < 80 else "CRITICAL"
            )
        })
    
    return result

@app.get("/projects/{project_id}")
def get_project_detail(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific project."""
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get risk score
    risk_score = db.query(RiskScore).filter(
        RiskScore.project_id == project_id
    ).order_by(RiskScore.calculated_at.desc()).first()
    
    # Get complaints
    complaints = db.query(Complaint).filter(Complaint.project_id == project_id).all()
    
    risk_assessment = {}
    if risk_score:
        risk_assessment = get_risk_assessment_summary(risk_score)
    
    return {
        "id": project.id,
        "project_id": project.project_id,
        "project_name": project.project_name,
        "location": project.location,
        "total_funds": project.total_funds,
        "labour_cost": project.labour_cost,
        "material_cost": project.material_cost,
        "other_cost": project.other_cost,
        "status": project.status.value,
        "complaint_count": len(complaints),
        "risk_assessment": risk_assessment if risk_score else None,
        "created_date": project.created_date
    }

# ============================================================================
# COMPLAINT ENDPOINTS
# ============================================================================

def get_any_role(current_user: User = Depends(get_current_user)):
    """Allow any authenticated user."""
    return current_user

@app.post("/complaints/submit-text")
def submit_text_complaint(
    request: ComplaintSubmitRequest,
    current_user: User = Depends(get_any_role),
    db: Session = Depends(get_db)
):
    """Submit a text-based complaint."""
    
    # Verify project exists
    project = db.query(Project).filter(Project.id == request.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Enhance complaint text
    formal_text = enhance_text(request.description, add_structure=True)
    
    # Classify complaint
    category, confidence = classify_complaint(formal_text)
    
    # Create complaint
    new_complaint = Complaint(
        project_id=request.project_id,
        created_by_id=current_user.id,
        description=request.description,
        formal_complaint_text=formal_text,
        category=category,
        nlp_confidence_score=confidence,
        severity=request.severity,
        priority=int(confidence * 10),  # Higher confidence = higher priority
        file=request.file
    )
    
    db.add(new_complaint)
    db.commit()
    db.refresh(new_complaint)
    
    # Auto-route complaint if category identified
    if category:
        routing_info = get_routing_recommendations(category, project.location, formal_text)
        
        # In a real system, find the appropriate official
        # For now, assign to first available official (placeholder)
        official = db.query(User).filter(User.role == UserRole.OFFICIAL).first()
        
        if official:
            routing = ComplaintRouting(
                complaint_id=new_complaint.id,
                assigned_official_id=official.id,
                routed_category=category,
                confidence_score=confidence,
                routing_notes=f"Auto-routed to {routing_info['department']}"
            )
            db.add(routing)
    
    db.commit()
    
    # Recalculate project risk
    calculate_project_risk_score(request.project_id, db)
    
    return {
        "complaint_id": new_complaint.id,
        "status": "submitted",
        "category": category.value if category else None,
        "confidence": confidence,
        "formal_text_preview": formal_text[:200] + "..." if len(formal_text) > 200 else formal_text
    }

@app.post("/complaints/submit-voice")
async def submit_voice_complaint(
    project_id: int = Form(...),
    severity: int = Form(5),
    audio_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a voice-based complaint."""
    
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Save audio file to disk
    temp_audio_path = f"./complaint_audio_{current_user.id}_{datetime.utcnow().timestamp()}.wav"
    
    try:
        contents = await audio_file.read()
        
        # Write audio file to disk
        try:
            with open(temp_audio_path, 'wb') as f:
                f.write(contents)
        except IOError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to save audio file: {str(e)}"
            )
        
        # Transcribe audio
        transcribed_text = transcribe_audio_stream(
            contents,
            language_code="en-IN",
            filename=audio_file.filename,
            content_type=audio_file.content_type,
        )
        
        if not transcribed_text:
            raise HTTPException(
                status_code=400,
                detail="Failed to transcribe audio. Please try again or use text submission."
            )
        
        # Enhance transcribed text
        formal_text = enhance_text(transcribed_text, add_structure=True)
        
        # Classify complaint
        category, confidence = classify_complaint(formal_text)
        
        # Create complaint
        new_complaint = Complaint(
            project_id=project_id,
            created_by_id=current_user.id,
            description=transcribed_text,
            transcribed_text=transcribed_text,
            formal_complaint_text=formal_text,
            voice_file_path=temp_audio_path,
            category=category,
            nlp_confidence_score=confidence,
            severity=severity,
            priority=int(confidence * 10),
        )
        
        db.add(new_complaint)
        db.commit()
        db.refresh(new_complaint)
        
        # Auto-route
        if category:
            official = db.query(User).filter(User.role == UserRole.OFFICIAL).first()
            if official:
                routing = ComplaintRouting(
                    complaint_id=new_complaint.id,
                    assigned_official_id=official.id,
                    routed_category=category,
                    confidence_score=confidence
                )
                db.add(routing)
        
        db.commit()
        
        # Recalculate risk
        calculate_project_risk_score(project_id, db)
        
        return {
            "complaint_id": new_complaint.id,
            "status": "submitted",
            "transcribed_text": transcribed_text,
            "category": category.value if category else None,
            "confidence": confidence
        }
    
    finally:
        # Clean up temp file on error only (keep on success for the /audio endpoint)
        pass  # File is kept for retrieval via /complaints/{complaint_id}/audio endpoint

@app.get("/complaints")
def get_complaints(
    project_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of complaints with optional filtering."""
    
    query = db.query(Complaint)
    
    if project_id:
        query = query.filter(Complaint.project_id == project_id)
    
    if status_filter:
        try:
            status_enum = ComplaintStatus(status_filter)
            query = query.filter(Complaint.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status filter: '{status_filter}'. Valid options are: {', '.join([s.value for s in ComplaintStatus])}"
            )
    
    complaints = query.offset(skip).limit(limit).all()
    
    result = []
    for c in complaints:
        result.append({
            "id": c.id,
            "project_id": c.project_id,
            "description": c.description,
            "formal_text": c.formal_complaint_text,
            "category": c.category.value if c.category else None,
            "status": c.status.value,
            "priority": c.priority,
            "severity": c.severity,
            "created_at": c.created_at,
            "created_by": c.created_by.full_name if c.created_by else None
        })
    
    return result

@app.get("/complaints/{complaint_id}")
def get_complaint_detail(
    complaint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a complaint."""
    
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    # Check completeness
    completeness = check_complaint_completeness(complaint.formal_complaint_text or complaint.description)
    
    return {
        "id": complaint.id,
        "project_id": complaint.project_id,
        "description": complaint.description,
        "formal_text": complaint.formal_complaint_text,
        "category": complaint.category.value if complaint.category else None,
        "status": complaint.status.value,
        "priority": complaint.priority,
        "severity": complaint.severity,
        "nlp_confidence": complaint.nlp_confidence_score,
        "created_at": complaint.created_at,
        "created_by": complaint.created_by.full_name if complaint.created_by else None,
        "routing": [
            {
                "assigned_to": r.assigned_official.full_name,
                "assigned_date": r.assigned_date,
                "routing_notes": r.routing_notes
            } for r in complaint.routing
        ] if complaint.routing else [],
        "completeness_check": completeness
    }

@app.put("/complaints/{complaint_id}/resolve")
def resolve_complaint(
    complaint_id: int,
    resolution_notes: str = Form(...),
    current_user: User = Depends(require_official),
    db: Session = Depends(get_db)
):
    """Mark a complaint as resolved."""
    
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    complaint.status = ComplaintStatus.RESOLVED
    complaint.resolved_at = datetime.utcnow()
    complaint.resolution_notes = resolution_notes  # Persist resolution notes
    
    db.commit()
    
    # Recalculate project risk
    calculate_project_risk_score(complaint.project_id, db)
    
    return {
        "message": "Complaint marked as resolved",
        "complaint_id": complaint_id,
        "status": complaint.status.value
    }

# ============================================================================
# MEDIA & VOICE FILE ENDPOINTS
# ============================================================================

@app.get("/complaints/{complaint_id}/audio")
def get_complaint_audio(
    complaint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve audio file for a voice complaint."""
    
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    if not complaint.voice_file_path:
        raise HTTPException(status_code=404, detail="No audio file for this complaint")
    
    # Check file exists
    if not os.path.exists(complaint.voice_file_path):
        raise HTTPException(status_code=404, detail="Audio file not found on server")
    
    return FileResponse(
        complaint.voice_file_path,
        media_type="audio/wav",
        filename=f"complaint_{complaint_id}_audio.wav"
    )

@app.post("/complaints/{complaint_id}/verify-media")
async def verify_complaint_media(
    complaint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify media attached to a complaint."""
    
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    # Get all media for this complaint
    media_items = db.query(Media).filter(Media.complaint_id == complaint_id).all()
    
    if not media_items:
        return {"complaint_id": complaint_id, "media_count": 0, "message": "No media found"}
    
    results = []
    for media in media_items:
        if os.path.exists(media.file_path):
            with open(media.file_path, 'rb') as f:
                file_data = f.read()
            
            # Verify based on file type
            if media.file_type.startswith('image/'):
                verification = verify_image(file_data, media.file_path)
            elif media.file_type.startswith('video/'):
                verification = verify_video(file_data, media.file_path)
            else:
                verification = {"status": "skipped", "reason": "Unsupported file type"}
            
            # Update database with verification results
            media.verification_status = MediaVerificationStatus(verification.get("verification_status", "UNVERIFIED"))
            media.verification_confidence = verification.get("confidence")
            media.verification_notes = str(verification.get("flags", []))
            
            # Extract and store EXIF/metadata
            if verification.get("exif_data"):
                media.exif_data = verification["exif_data"]
            
            # Extract and store geolocation if available
            if verification.get("geo_location"):
                media.capture_latitude = verification["geo_location"].get("latitude")
                media.capture_longitude = verification["geo_location"].get("longitude")
            
            # Handle timestamp
            if verification.get("timestamp"):
                try:
                    media.capture_timestamp = datetime.fromisoformat(verification["timestamp"])
                except (ValueError, TypeError):
                    # Timestamp parsing failed, leave as None
                    pass
            
            results.append({
                "media_id": media.id,
                "file_type": media.file_type,
                "verification_status": verification.get("verification_status"),
                "confidence": verification.get("confidence"),
                "flags": verification.get("flags", []),
                "tampering_score": verification.get("tampering_score"),
                "location": verification.get("geo_location")
            })
    
    db.commit()
    
    return {
        "complaint_id": complaint_id,
        "media_count": len(results),
        "media_verification": results
    }

# ============================================================================
# GEOLOCATION ENDPOINTS
# ============================================================================

@app.post("/projects/{project_id}/geo-tag")
def add_geolocation_to_project(
    project_id: int,
    latitude: float,
    longitude: float,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Add or update geolocation for a project."""
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project.latitude = latitude
    project.longitude = longitude
    project.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "project_id": project_id,
        "location": project.location,
        "latitude": latitude,
        "longitude": longitude,
        "message": "Project geolocation updated"
    }

@app.get("/projects/{project_id}/media-map")
def get_project_media_map(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all geo-tagged media for a project for map visualization."""
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get all media with geolocation for this project
    media_items = db.query(Media).filter(
        Media.project_id == project_id,
        Media.capture_latitude.isnot(None),
        Media.capture_longitude.isnot(None)
    ).all()
    
    media_points = []
    for media in media_items:
        media_points.append({
            "media_id": media.id,
            "latitude": media.capture_latitude,
            "longitude": media.capture_longitude,
            "file_type": media.file_type,
            "uploaded_at": media.uploaded_at.isoformat(),
            "verification_status": media.verification_status.value if media.verification_status else None,
            "complaint_id": media.complaint_id
        })
    
    return {
        "project_id": project_id,
        "project_location": {
            "latitude": project.latitude,
            "longitude": project.longitude
        },
        "geo_tagged_media_count": len(media_points),
        "media_points": media_points
    }

@app.get("/complaints/{complaint_id}/geo-verification")
def verify_complaint_location(
    complaint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify if complaint location matches project location."""
    
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    project = complaint.project
    if not project or not project.latitude or not project.longitude:
        return {
            "complaint_id": complaint_id,
            "verification": "INCOMPLETE",
            "reason": "Project location not set"
        }
    
    # Get media with geolocation
    media_items = db.query(Media).filter(
        Media.complaint_id == complaint_id,
        Media.capture_latitude.isnot(None),
        Media.capture_longitude.isnot(None)
    ).all()
    
    if not media_items:
        return {
            "complaint_id": complaint_id,
            "verification": "INCOMPLETE",
            "reason": "No geo-tagged media found"
        }
    
    verifications = []
    for media in media_items:
        distance = calculate_distance(
            media.capture_latitude,
            media.capture_longitude,
            project.latitude,
            project.longitude
        )
        
        is_valid = distance <= 10.0  # 10km radius
        
        verifications.append({
            "media_id": media.id,
            "distance_km": round(distance, 2),
            "is_valid": is_valid,
            "complaint_location": {
                "latitude": media.capture_latitude,
                "longitude": media.capture_longitude
            },
            "project_location": {
                "latitude": project.latitude,
                "longitude": project.longitude
            }
        })
    
    # Overall verification
    all_valid = all(v["is_valid"] for v in verifications)
    
    return {
        "complaint_id": complaint_id,
        "verification": "VERIFIED" if all_valid else "SUSPICIOUS",
        "media_verifications": verifications,
        "recommendation": "Accept" if all_valid else "Review - location mismatch detected"
    }

# ============================================================================
# BLOCKCHAIN & FUND TRACKING ENDPOINTS
# ============================================================================

@app.post("/projects/{project_id}/fund-milestone")
def create_fund_milestone(
    project_id: int,
    milestone_name: str = Form(...),
    fund_amount: float = Form(...),
    approval_threshold: int = Form(1),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create a new fund disbursement milestone on blockchain."""
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if fund_amount <= 0:
        raise HTTPException(status_code=400, detail="Fund amount must be positive")
    
    if approval_threshold <= 0:
        raise HTTPException(status_code=400, detail="Approval threshold must be positive")
    
    # Create on blockchain
    blockchain_result = create_milestone(
        project.project_id,
        milestone_name,
        int(fund_amount),
        approval_threshold
    )
    
    # Store locally for reference
    from models import FundDisbursement
    
    milestone = FundDisbursement(
        project_id=project_id,
        milestone_name=milestone_name,
        fund_amount=fund_amount,
        approval_threshold=approval_threshold,
        status="PENDING",
        blockchain_tx_hash=blockchain_result.get("transaction_hash") if blockchain_result.get("status") == "success" else None
    )
    
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    
    return {
        "milestone_id": milestone.id,
        "milestone_name": milestone_name,
        "fund_amount": fund_amount,
        "approval_threshold": approval_threshold,
        "status": milestone.status,
        "blockchain": blockchain_result,
        "created_at": milestone.created_at.isoformat()
    }

@app.post("/fund-disbursements/{milestone_id}/approve")
def approve_fund_milestone(
    milestone_id: int,
    current_user: User = Depends(require_official),
    db: Session = Depends(get_db)
):
    """Official approves a fund disbursement milestone."""
    
    from models import FundDisbursement
    
    milestone = db.query(FundDisbursement).filter(FundDisbursement.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    if milestone.status == "DISBURSED":
        raise HTTPException(status_code=400, detail="Milestone already disbursed")
    
    # Log approval on blockchain
    blockchain_result = approve_milestone(milestone_id, current_user.id)
    
    # Update local approval count
    milestone.approval_count = (milestone.approval_count or 0) + 1
    
    if milestone.approval_count >= milestone.approval_threshold:
        milestone.status = "FULLY_APPROVED"
    else:
        milestone.status = "PARTIALLY_APPROVED"
    
    db.commit()
    
    return {
        "milestone_id": milestone_id,
        "approvals": milestone.approval_count,
        "required": milestone.approval_threshold,
        "status": milestone.status,
        "blockchain": blockchain_result,
        "approved_by": current_user.email
    }

@app.post("/fund-disbursements/{milestone_id}/disburse")
def execute_fund_disbursement(
    milestone_id: int,
    recipient_address: str = Form(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Execute fund disbursement for approved milestone."""
    
    from models import FundDisbursement
    
    milestone = db.query(FundDisbursement).filter(FundDisbursement.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    if milestone.status == "DISBURSED":
        raise HTTPException(status_code=400, detail="Already disbursed")
    
    if milestone.status != "FULLY_APPROVED":
        raise HTTPException(status_code=400, detail="Milestone not fully approved")
    
    # Execute on blockchain
    blockchain_result = disburse_funds(milestone_id, recipient_address)
    
    # Update local record
    milestone.status = "DISBURSED"
    milestone.disbursed_date = datetime.utcnow()
    milestone.blockchain_tx_hash = blockchain_result.get("transaction_hash")
    
    db.commit()
    
    return {
        "milestone_id": milestone_id,
        "fund_amount": milestone.fund_amount,
        "recipient": recipient_address,
        "status": milestone.status,
        "blockchain": blockchain_result,
        "disbursed_at": milestone.disbursed_date.isoformat()
    }

@app.get("/fund-disbursements/by-project/{project_id}")
def get_project_fund_history(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get fund disbursement history for a project."""
    
    from models import FundDisbursement
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    milestones = db.query(FundDisbursement).filter(FundDisbursement.project_id == project_id).all()
    
    history = [
        {
            "milestone_id": m.id,
            "milestone_name": m.milestone_name,
            "fund_amount": m.fund_amount,
            "status": m.status,
            "approval_count": m.approval_count,
            "required_approvals": m.approval_threshold,
            "created_at": m.created_at.isoformat(),
            "disbursed_at": m.disbursed_date.isoformat() if m.disbursed_date else None,
            "blockchain_tx": m.blockchain_tx_hash
        }
        for m in milestones
    ]
    
    return {
        "project_id": project_id,
        "total_milestones": len(history),
        "total_funds_approved": sum(m["fund_amount"] for m in history if m["status"] in ["FULLY_APPROVED", "DISBURSED"]),
        "total_funds_disbursed": sum(m["fund_amount"] for m in history if m["status"] == "DISBURSED"),
        "milestones": history
    }

@app.get("/blockchain/network-info")
def get_blockchain_network_info(
    current_user: User = Depends(require_admin)
):
    """Get Ethereum network information."""
    
    return get_network_info()

# ============================================================================
# RISK SCORING ENDPOINTS
# ============================================================================

@app.get("/projects/{project_id}/risk-assessment")
def get_risk_assessment(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed risk assessment for a project."""
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get or calculate risk score
    risk_score = db.query(RiskScore).filter(
        RiskScore.project_id == project_id
    ).order_by(RiskScore.calculated_at.desc()).first()
    
    if not risk_score:
        risk_score = calculate_project_risk_score(project_id, db)
    
    if risk_score:
        assessment = get_risk_assessment_summary(risk_score)
        return {
            "project_id": project.project_id,
            "assessment": assessment,
            "calculated_at": risk_score.calculated_at
        }
    
    raise HTTPException(status_code=500, detail="Failed to calculate risk assessment")

@app.get("/dashboard/metrics")
def get_dashboard_metrics(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get dashboard metrics for admins."""
    
    total_projects = db.query(Project).count()
    total_complaints = db.query(Complaint).count()
    resolved_complaints = db.query(Complaint).filter(
        Complaint.status == ComplaintStatus.RESOLVED
    ).count()
    
    pending_complaints = db.query(Complaint).filter(
        Complaint.status == ComplaintStatus.PENDING
    ).count()
    
    high_risk_projects = db.query(RiskScore.project_id).filter(
        RiskScore.risk_score >= 70
    ).distinct(RiskScore.project_id).count()
    
    return {
        "total_projects": total_projects,
        "total_complaints": total_complaints,
        "resolved_complaints": resolved_complaints,
        "pending_complaints": pending_complaints,
        "resolution_rate": (resolved_complaints / max(total_complaints, 1)) * 100,
        "high_risk_projects": high_risk_projects,
        "average_complaint_severity": db.query(func.avg(Complaint.severity)).scalar() or 0
    }