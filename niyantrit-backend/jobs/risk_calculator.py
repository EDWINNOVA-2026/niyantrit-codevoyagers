"""
Background Job: Risk Score Recalculation
Periodically recalculates risk scores for all projects.
"""
import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Project
from services.risk_engine import calculate_project_risk_score
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def recalculate_all_risk_scores():
    """Recalculate risk scores for all projects."""
    db = SessionLocal()
    try:
        projects = db.query(Project).all()
        logger.info(f"Starting risk recalculation for {len(projects)} projects")
        
        for project in projects:
            try:
                calculate_project_risk_score(project.id, db)
                logger.info(f"Updated risk score for project {project.project_id}")
            except Exception as e:
                logger.error(f"Error calculating risk for project {project.project_id}: {e}")
        
        logger.info(f"Completed risk recalculation at {datetime.utcnow()}")
    
    finally:
        db.close()

async def risk_calculator_job():
    """Run risk calculator job every 24 hours."""
    while True:
        try:
            await recalculate_all_risk_scores()
            # Wait 24 hours before next calculation
            await asyncio.sleep(86400)
        except Exception as e:
            logger.error(f"Unexpected error in risk_calculator_job: {e}")
            # Retry after 1 hour on error
            await asyncio.sleep(3600)

def start_risk_calculator_background_task():
    """Start the background risk calculator task."""
    try:
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.create_task(risk_calculator_job())
        logger.info("Risk calculator background job started")
    except Exception as e:
        logger.error(f"Failed to start risk calculator job: {e}")
