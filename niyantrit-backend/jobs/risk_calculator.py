"""
Background Job: Risk Score Recalculation
Periodically recalculates risk scores for all projects.
"""
import asyncio
import threading
from datetime import datetime
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Project
from services.risk_engine import calculate_project_risk_score
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def recalculate_all_risk_scores():
    """Recalculate risk scores for all projects (synchronous)."""
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
    """Run risk calculator job every 24 hours (async wrapper)."""
    while True:
        try:
            recalculate_all_risk_scores()
            # Wait 24 hours before next calculation
            await asyncio.sleep(86400)
        except Exception as e:
            logger.error(f"Unexpected error in risk_calculator_job: {e}")
            # Retry after 1 hour on error
            await asyncio.sleep(3600)

def start_risk_calculator_background_task():
    """Start the background risk calculator task in a daemon thread."""
    try:
        def run_async_loop():
            """Run async event loop in a dedicated thread."""
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(risk_calculator_job())
            finally:
                loop.close()
        
        # Start risk calculator in a daemon thread
        thread = threading.Thread(target=run_async_loop, daemon=True)
        thread.start()
        logger.info("Risk calculator background job started in daemon thread")
    except Exception as e:
        logger.error(f"Failed to start risk calculator job: {e}")
