from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, SessionLocal
from models import Base, Complaint

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Home route (optional)
@app.get("/")
def home():
    return {"message": "Backend is running"}

# POST: Save complaint to DB
@app.post("/complaint")
def create_complaint(data: dict):
    db = SessionLocal()

    new_complaint = Complaint(
        description=data.get("description"),
        file=data.get("file")
        
    )

    db.add(new_complaint)
    db.commit()
    db.refresh(new_complaint)

    db.close()

    return {"message": "Complaint saved successfully"}

# GET: Fetch all complaints
@app.get("/complaints")
def get_complaints():
    db = SessionLocal()

    complaints = db.query(Complaint).all()

    result = []
    for c in complaints:
        result.append({
            "id": c.id,
            "description": c.description,
            "file": c.file,
            "status": getattr(c, "status", "Pending")  # safe fallback
        })

    db.close()

    return {"complaints": result}

# UPDATE complaint status
@app.put("/complaint/{complaint_id}")
def update_status(complaint_id: int):
    db = SessionLocal()

    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()

    if complaint:
        complaint.status = "Resolved"
        db.commit()
        db.refresh(complaint)
        db.close()
        return {"message": "Status updated successfully"}

    db.close()
    return {"message": "Complaint not found"}