"""
Seed script to populate the Niyantrit database with test data
Loads 200 projects from niyantrit_projects_dataset_200.json
Creates test users for different roles
"""

import json
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Base, User, Project, Complaint, RiskScore, UserRole, ProjectStatus, ComplaintStatus, ComplaintCategory
from auth import hash_password
from services.risk_engine import calculate_project_risk_score

# Projects dataset path
DATASET_PATH = "../niyantrit_projects_dataset_200.json"

def load_projects_from_json():
    """Load projects from JSON dataset."""
    try:
        with open(DATASET_PATH, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        # Try alternative path
        alt_path = "niyantrit_projects_dataset_200.json"
        try:
            with open(alt_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"⚠️  Dataset file not found at {DATASET_PATH} or {alt_path}")
            return []

def create_test_users(db: Session):
    """Create test users for different roles."""
    test_users = [
        {
            "email": "citizen@test.com",
            "password": "password123",
            "full_name": "John Citizen",
            "role": UserRole.CITIZEN,
            "phone": "+91-9876543210"
        },
        {
            "email": "contractor@test.com",
            "password": "password123",
            "full_name": "Rajesh Contractor",
            "role": UserRole.CONTRACTOR,
            "phone": "+91-9876543211"
        },
        {
            "email": "official@test.com",
            "password": "password123",
            "full_name": "Priya Official",
            "role": UserRole.OFFICIAL,
            "phone": "+91-9876543212"
        },
        {
            "email": "admin@test.com",
            "password": "password123",
            "full_name": "Admin User",
            "role": UserRole.ADMIN,
            "phone": "+91-9876543213"
        }
    ]

    created_users = []
    for user_data in test_users:
        existing_user = db.query(User).filter(User.email == user_data["email"]).first()
        if not existing_user:
            new_user = User(
                email=user_data["email"],
                password_hash=hash_password(user_data["password"]),
                full_name=user_data["full_name"],
                role=user_data["role"],
                phone=user_data["phone"]
            )
            db.add(new_user)
            created_users.append(new_user)
            print(f"✅ Created user: {user_data['email']} ({user_data['role'].value})")
        else:
            created_users.append(existing_user)
            print(f"⏭️  User already exists: {user_data['email']}")

    db.commit()
    return created_users

def seed_projects(db: Session):
    """Seed projects from JSON dataset."""
    projects_data = load_projects_from_json()
    
    if not projects_data:
        print("❌ No projects to seed")
        return

    added_count = 0
    for project_data in projects_data:
        # Check if project already exists
        existing_project = db.query(Project).filter(
            Project.project_id == project_data["project_id"]
        ).first()

        if not existing_project:
            new_project = Project(
                project_id=project_data["project_id"],
                project_name=project_data["project_name"],
                location=project_data["location"],
                status=ProjectStatus.ACTIVE.value,
                total_funds=float(project_data["total_funds"]),
                labour_cost=float(project_data["labour_cost"]),
                material_cost=float(project_data["material_cost"]),
                other_cost=float(project_data["other_cost"]),
                start_date=datetime.utcnow() - timedelta(days=30),
                expected_completion_date=datetime.utcnow() + timedelta(days=180),
                complaint_count=0,
                risk_score=None,
                risk_level="Low"
            )
            db.add(new_project)
            added_count += 1

            # Commit every 50 projects for efficiency
            if added_count % 50 == 0:
                db.commit()
                print(f"📊 Added {added_count} projects...")

    db.commit()
    print(f"✅ Successfully seeded {added_count} projects from dataset")

def calculate_risk_scores(db: Session):
    """Calculate risk scores for all projects."""
    projects = db.query(Project).all()
    
    updated_count = 0
    for project in projects:
        try:
            risk_assessment = calculate_project_risk_score(project, db)
            project.risk_score = risk_assessment.get('risk_score', 0)
            project.risk_level = risk_assessment.get('risk_level', 'Low')
            updated_count += 1

            if updated_count % 50 == 0:
                db.commit()
                print(f"⚙️  Calculated risk scores for {updated_count} projects...")
        except Exception as e:
            print(f"⚠️  Error calculating risk for project {project.id}: {str(e)}")
            continue

    db.commit()
    print(f"✅ Risk scores calculated for {updated_count} projects")

def create_sample_complaints(db: Session, citizen_user: User):
    """Create sample complaints for demonstration."""
    projects = db.query(Project).limit(5).all()
    
    if not projects:
        print("⚠️  No projects found for creating sample complaints")
        return

    sample_complaints = [
        {
            "description": "Safety hazard detected at construction site. No proper scaffolding in place.",
            "category": ComplaintCategory.SAFETY_HAZARD,
            "severity": 8,
            "priority": 9
        },
        {
            "description": "Workers are not being paid on time. Delayed salary for past 2 months.",
            "category": ComplaintCategory.LABOR_VIOLATION,
            "severity": 7,
            "priority": 8
        },
        {
            "description": "Quality of material used is substandard. Concrete strength is compromised.",
            "category": ComplaintCategory.QUALITY_ISSUE,
            "severity": 6,
            "priority": 7
        },
        {
            "description": "Project timeline is not being followed. Already 2 months behind schedule.",
            "category": ComplaintCategory.DELAY,
            "severity": 5,
            "priority": 6
        },
        {
            "description": "Suspicious fund utilization. Bills submitted don't match actual work done.",
            "category": ComplaintCategory.FUND_MISUSE,
            "severity": 9,
            "priority": 10
        }
    ]

    # Collect sample descriptions to check for duplicates
    sample_descriptions = {complaint["description"] for complaint in sample_complaints}
    
    # Find existing sample complaints to avoid duplicates
    existing_sample_complaints = db.query(Complaint).filter(
        Complaint.description.in_(sample_descriptions),
        Complaint.created_by_id == citizen_user.id
    ).all()
    
    existing_descriptions = {complaint.description for complaint in existing_sample_complaints}
    
    added_count = 0
    for idx, (project, complaint_data) in enumerate(zip(projects, sample_complaints)):
        # Skip if complaint already exists
        if complaint_data["description"] in existing_descriptions:
            print(f"⏭️  Sample complaint already exists: {complaint_data['description'][:50]}...")
            continue
            
        new_complaint = Complaint(
            project_id=project.id,
            description=complaint_data["description"],
            category=complaint_data["category"].value,
            nlp_confidence=0.85,
            status=ComplaintStatus.PENDING.value,
            severity=complaint_data["severity"],
            priority=complaint_data["priority"],
            is_voice=False,
            created_by_id=citizen_user.id
        )
        db.add(new_complaint)
        added_count += 1

    db.commit()
    if added_count > 0:
        print(f"✅ Created {added_count} sample complaints")
    else:
        print("ℹ️  All sample complaints already exist")

def main():
    """Main seeding function."""
    print("\n" + "="*60)
    print(" 🌱 Niyantrit Database Seeding Started")
    print("="*60 + "\n")

    # Create tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Step 1: Create test users
        print("📝 Step 1: Creating test users...")
        users = create_test_users(db)
        citizen_user = next((u for u in users if u.role == UserRole.CITIZEN), None)
        if citizen_user is None:
            raise ValueError("No citizen user found after creation. Please check create_test_users()")
        print()

        # Step 2: Seed projects
        print("📊 Step 2: Seeding projects from dataset...")
        seed_projects(db)
        print()

        # Step 3: Calculate risk scores
        print("⚙️  Step 3: Calculating risk scores...")
        calculate_risk_scores(db)
        print()

        # Step 4: Create sample complaints
        print("💬 Step 4: Creating sample complaints...")
        create_sample_complaints(db, citizen_user)
        print()

        # Print summary
        project_count = db.query(Project).count()
        user_count = db.query(User).count()
        complaint_count = db.query(Complaint).count()

        print("="*60)
        print(" ✅ Database Seeding Complete!")
        print("="*60)
        print(f"\n📊 Database Summary:")
        print(f"   ✓ Users created: {user_count}")
        print(f"   ✓ Projects seeded: {project_count}")
        print(f"   ✓ Sample complaints: {complaint_count}")
        print(f"\n👤 Test Credentials:")
        print(f"   Email: citizen@test.com | Password: password123 | Role: Citizen")
        print(f"   Email: contractor@test.com | Password: password123 | Role: Contractor")
        print(f"   Email: official@test.com | Password: password123 | Role: Official")
        print(f"   Email: admin@test.com | Password: password123 | Role: Admin")
        print(f"\n🌐 Access the application:")
        print(f"   Frontend: http://localhost:3000/login.html")
        print(f"   API Docs: http://localhost:8000/docs")
        print("\n" + "="*60 + "\n")

    except Exception as e:
        print(f"\n❌ Error during seeding: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
