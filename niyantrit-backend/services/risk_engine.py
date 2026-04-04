"""
AI Risk Intelligence Engine
Calculates risk scores (0-100) for projects predicting likelihood of delays or fund misuse.
"""
from datetime import datetime, timedelta
from typing import Dict, Optional, List
from sqlalchemy.orm import Session
from models import Project, Complaint, RiskScore, ComplaintCategory, ComplaintStatus
from database import SessionLocal

def calculate_project_risk_score(project_id: int, db: Session) -> Optional[RiskScore]:
    """
    Calculate comprehensive risk score for a project (0-100 scale).
    
    Factors considered:
    1. Complaint frequency & severity (40%)
    2. Fund utilization rate (30%)
    3. Project timeline adherence (20%)
    4. Complaint categories (10%)
    
    Args:
        project_id: Database ID of the project
        db: Database session
        
    Returns:
        RiskScore object with calculated score and factors
    """
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return None
    
    risk_factors = {}
    total_risk = 0
    
    # Factor 1: Complaint Analysis (40% weight)
    complaints = db.query(Complaint).filter(Complaint.project_id == project_id).all()
    complaint_risk = analyze_complaints(complaints, project)
    risk_factors["complaint_risk"] = complaint_risk
    total_risk += complaint_risk * 0.40
    
    # Factor 2: Fund Utilization Analysis (30% weight)
    fund_risk = analyze_fund_utilization(project)
    risk_factors["fund_utilization_risk"] = fund_risk
    total_risk += fund_risk * 0.30
    
    # Factor 3: Timeline Adherence (20% weight)
    timeline_risk = analyze_timeline(project)
    risk_factors["timeline_risk"] = timeline_risk
    total_risk += timeline_risk * 0.20
    
    # Factor 4: Critical Category Complaints (10% weight)
    critical_category_risk = check_critical_categories(complaints)
    risk_factors["critical_category_risk"] = critical_category_risk
    total_risk += critical_category_risk * 0.10
    
    # Determine predicted delay
    predicted_delay = predict_delay_days(complaints, project)
    
    # Determine fund misuse likelihood
    fund_misuse_likelihood = calculate_fund_misuse_likelihood(complaints, project)
    
    # Create or update RiskScore record
    existing_score = db.query(RiskScore).filter(RiskScore.project_id == project_id).first()
    
    if existing_score:
        existing_score.risk_score = total_risk
        existing_score.risk_factors = risk_factors
        existing_score.predicted_delay_days = predicted_delay
        existing_score.fund_misuse_likelihood = fund_misuse_likelihood
        existing_score.last_updated = datetime.utcnow()
        risk_score = existing_score
    else:
        risk_score = RiskScore(
            project_id=project_id,
            risk_score=total_risk,
            risk_factors=risk_factors,
            predicted_delay_days=predicted_delay,
            fund_misuse_likelihood=fund_misuse_likelihood,
            calculated_at=datetime.utcnow()
        )
        db.add(risk_score)
    
    db.commit()
    return risk_score

def analyze_complaints(complaints: List[Complaint], project: Project) -> float:
    """
    Analyze complaint frequency and severity.
    Returns risk score 0-100.
    
    More recent complaints = higher risk
    Higher severity = higher risk
    """
    if not complaints:
        return 0
    
    risk = 0
    now = datetime.utcnow()
    
    for complaint in complaints:
        # Recency factor: complaints in last 7 days are most critical
        days_ago = (now - complaint.created_at).days
        if days_ago <= 7:
            recency_multiplier = 1.0
        elif days_ago <= 14:
            recency_multiplier = 0.8
        elif days_ago <= 30:
            recency_multiplier = 0.6
        else:
            recency_multiplier = 0.4
        
        # Severity factor: use complaint priority/severity field
        severity_component = (complaint.severity / 10.0) * 100 if complaint.severity else 50
        
        # Status factor: unresolved complaints increase risk
        if complaint.status in [ComplaintStatus.PENDING, ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS]:
            status_multiplier = 1.0
        else:
            status_multiplier = 0.3
        
        complaint_risk = severity_component * recency_multiplier * status_multiplier
        risk += complaint_risk
    
    # Normalize to 0-100 scale
    # If more than 5 complaints, cap at 100
    average_risk = min(risk / len(complaints), 100)
    return average_risk

def analyze_fund_utilization(project: Project) -> float:
    """
    Analyze fund utilization rate.
    Risk increases if:
    - Spending way below budget (possible embezzlement or delay)
    - Spending way above budget (overspending)
    
    Returns risk score 0-100.
    """
    total_funds = project.total_funds
    total_spent = project.labour_cost + project.material_cost + project.other_cost
    
    if total_funds == 0:
        return 50  # Default if no budget info
    
    utilization_rate = total_spent / total_funds
    
    # Ideal utilization is close to 100% (all budgeted funds used appropriately)
    # Risk increases the further from 100% we are
    
    if utilization_rate < 0.3:
        # Way below budget - possible embezzlement or major delay
        risk = (1 - utilization_rate) * 150  # Penalize underutilization
    elif utilization_rate < 0.7:
        # Moderate underutilization
        risk = (1 - utilization_rate) * 60
    elif utilization_rate <= 1.1:
        # Near or at budget - ideal
        risk = 10
    else:
        # Over budget
        risk = (utilization_rate - 1.0) * 100
    
    return min(risk, 100)

def analyze_timeline(project: Project) -> float:
    """
    Analyze if project is adhering to timeline.
    
    Returns risk score 0-100.
    """
    if not project.expected_end_date:
        return 30  # Uncertain timeline
    
    now = datetime.utcnow()
    
    # If project is completed, check if it was on time
    if project.actual_end_date:
        delay_days = (project.actual_end_date - project.expected_end_date).days
        if delay_days > 0:
            # Project was delayed
            risk = min((delay_days / 30) * 100, 100)  # 30 days delay = max risk
        else:
            risk = 0  # Project was on time or early
    else:
        # Project ongoing - check if it's tracking on schedule
        if now > project.expected_end_date:
            # Project is already delayed
            delay_days = (now - project.expected_end_date).days
            risk = min((delay_days / 30) * 100, 100)
        else:
            # Check progress: how much time has elapsed vs. how much is done?
            if project.start_date:
                total_duration = (project.expected_end_date - project.start_date).days
                elapsed_duration = (now - project.start_date).days
                
                if total_duration > 0:
                    progress_percentage = (elapsed_duration / total_duration) * 100
                    
                    # Assume linear progress should be achieved
                    # If we're at 50% of time but this is an early-stage project, risk is lower
                    risk = abs(progress_percentage - 50) / 50 * 30  # Low baseline risk
                else:
                    risk = 30
            else:
                risk = 30
    
    return min(risk, 100)

def check_critical_categories(complaints: List[Complaint]) -> float:
    """
    Check for presence of critical complaint categories.
    
    Critical categories: Fund Misuse, Labor Violation, Safety Hazard
    Presence of these increases risk significantly.
    
    Returns risk score 0-100.
    """
    critical_categories = [
        ComplaintCategory.FUND_MISUSE,
        ComplaintCategory.LABOR_VIOLATION,
        ComplaintCategory.SAFETY_HAZARD
    ]
    
    critical_complaint_count = sum(
        1 for c in complaints 
        if c.category in critical_categories and 
        c.status not in [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]
    )
    
    if critical_complaint_count == 0:
        return 0
    elif critical_complaint_count == 1:
        return 40
    elif critical_complaint_count == 2:
        return 75
    else:
        return 100  # 3+ critical complaints = max risk

def predict_delay_days(complaints: List[Complaint], project: Project) -> int:
    """
    Predict number of days project will be delayed based on complaint patterns.
    
    Returns predicted delay in days.
    """
    if not project.expected_end_date:
        return 0
    
    # Count unresolved delays
    delay_complaints = [c for c in complaints if c.category == ComplaintCategory.DELAY]
    unresolved_delays = sum(
        1 for c in delay_complaints 
        if c.status not in [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]
    )
    
    # Base prediction: each unresolved delay complaint = 3-5 days
    base_prediction = unresolved_delays * 4
    
    # Add historical delay if project is already delayed
    if project.actual_end_date and project.actual_end_date > project.expected_end_date:
        historical_delay = (project.actual_end_date - project.expected_end_date).days
        return historical_delay + base_prediction
    elif datetime.utcnow() > project.expected_end_date:
        current_delay = (datetime.utcnow() - project.expected_end_date).days
        return current_delay + base_prediction
    
    return base_prediction

def calculate_fund_misuse_likelihood(complaints: List[Complaint], project: Project) -> float:
    """
    Calculate probability of fund misuse (0-1).
    
    Based on:
    - Presence of fund misuse complaints
    - Unusual fund utilization patterns
    - Project timeline issues
    
    Returns probability 0-1.
    """
    fund_risk = 0.0
    
    # Check for fund misuse complaints
    fund_complaints = [c for c in complaints if c.category == ComplaintCategory.FUND_MISUSE]
    if fund_complaints:
        unresolved = [c for c in fund_complaints if c.status not in [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]]
        if unresolved:
            fund_risk += 0.5  # Significant indicator if unresolved
        else:
            fund_risk += 0.2
    
    # Check fund utilization anomalies
    total_funds = project.total_funds
    total_spent = project.labour_cost + project.material_cost + project.other_cost
    
    if total_funds > 0:
        utilization = total_spent / total_funds
        if utilization < 0.4 or utilization > 1.2:
            fund_risk += 0.3  # Anomalous spending pattern
    
    return min(fund_risk, 1.0)

def get_risk_assessment_summary(risk_score_obj: RiskScore) -> dict:
    """
    Generate a human-readable summary of the risk assessment.
    """
    score = risk_score_obj.risk_score
    
    if score < 20:
        level = "LOW"
        recommendation = "Project is tracking well. Continue standard monitoring."
    elif score < 40:
        level = "MODERATE"
        recommendation = "Monitor project closely. Review complaint handling."
    elif score < 60:
        level = "HIGH"
        recommendation = "Escalate review. Consider additional oversight."
    elif score < 80:
        level = "VERY_HIGH"
        recommendation = "Immediate intervention recommended. Conduct audit."
    else:
        level = "CRITICAL"
        recommendation = "Critical risk detected. Halt disbursements pending investigation."
    
    return {
        "risk_score": score,
        "risk_level": level,
        "recommendation": recommendation,
        "predicted_delay_days": risk_score_obj.predicted_delay_days,
        "fund_misuse_likelihood": risk_score_obj.fund_misuse_likelihood,
        "factors": risk_score_obj.risk_factors
    }
