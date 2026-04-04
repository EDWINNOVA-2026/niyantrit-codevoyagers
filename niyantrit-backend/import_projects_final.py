"""Import project records from projects_final.json into the SQLite database.

This script maps external dataset fields to the existing Project ORM schema
and performs an upsert by Project.project_id.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path
from typing import Any

from database import SessionLocal
from models import (
    Complaint,
    ComplaintRouting,
    FundDisbursement,
    Media,
    Project,
    ProjectStatus,
    RiskScore,
)


DEFAULT_INPUT_PATHS = [
    Path(r"C:/Users/ADMIN/Downloads/projects_final.json"),
    Path(__file__).resolve().parents[1] / "projects_final.json",
    Path(__file__).resolve().parents[1] / "niyantrit_projects_dataset_200.json",
]


def resolve_input_path() -> Path:
    for candidate in DEFAULT_INPUT_PATHS:
        if candidate.exists():
            return candidate
    raise FileNotFoundError(
        "No input JSON found. Expected one of: "
        + ", ".join(str(path) for path in DEFAULT_INPUT_PATHS)
    )


def parse_date(value: Any) -> datetime | None:
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None
    return datetime.strptime(text, "%Y-%m-%d")


def map_status(raw_status: str) -> ProjectStatus:
    normalized = (raw_status or "").strip().lower()
    if normalized == "ongoing":
        return ProjectStatus.ACTIVE
    if normalized in {"tendered", "sanctioned"}:
        return ProjectStatus.PLANNING
    if normalized == "completed":
        return ProjectStatus.COMPLETED
    return ProjectStatus.PLANNING


def build_location(record: dict[str, Any]) -> str:
    parts = [
        record.get("ward"),
        record.get("village"),
        record.get("taluk"),
        record.get("district"),
        record.get("state"),
    ]
    return ", ".join(str(part).strip() for part in parts if part)


def project_cost_breakdown(record: dict[str, Any]) -> tuple[float, float, float, float]:
    revised = float(record.get("revised_cost") or 0)
    estimated = float(record.get("estimated_cost") or 0)
    total = revised if revised > 0 else estimated
    labour = round(total * 0.35, 2)
    material = round(total * 0.50, 2)
    other = round(total - labour - material, 2)
    return total, labour, material, other


def load_records(input_path: Path) -> list[dict[str, Any]]:
    with input_path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    if not isinstance(payload, list):
        raise ValueError("Input JSON must contain a list of project objects")

    return payload


def prune_other_projects(db, keep_project_codes: set[str]) -> dict[str, int]:
    obsolete_project_ids = [
        row[0]
        for row in db.query(Project.id)
        .filter(~Project.project_id.in_(keep_project_codes))
        .all()
    ]

    if not obsolete_project_ids:
        return {
            "projects": 0,
            "complaints": 0,
            "complaint_routings": 0,
            "risk_scores": 0,
            "media": 0,
            "fund_disbursements": 0,
        }

    obsolete_complaint_ids = [
        row[0]
        for row in db.query(Complaint.id)
        .filter(Complaint.project_id.in_(obsolete_project_ids))
        .all()
    ]

    deleted_routings = 0
    deleted_media_from_complaints = 0

    if obsolete_complaint_ids:
        deleted_routings = (
            db.query(ComplaintRouting)
            .filter(ComplaintRouting.complaint_id.in_(obsolete_complaint_ids))
            .delete(synchronize_session=False)
        )
        deleted_media_from_complaints = (
            db.query(Media)
            .filter(Media.complaint_id.in_(obsolete_complaint_ids))
            .delete(synchronize_session=False)
        )

    deleted_media_from_projects = (
        db.query(Media)
        .filter(Media.project_id.in_(obsolete_project_ids))
        .delete(synchronize_session=False)
    )
    deleted_risk_scores = (
        db.query(RiskScore)
        .filter(RiskScore.project_id.in_(obsolete_project_ids))
        .delete(synchronize_session=False)
    )
    deleted_fund_disbursements = (
        db.query(FundDisbursement)
        .filter(FundDisbursement.project_id.in_(obsolete_project_ids))
        .delete(synchronize_session=False)
    )
    deleted_complaints = (
        db.query(Complaint)
        .filter(Complaint.project_id.in_(obsolete_project_ids))
        .delete(synchronize_session=False)
    )
    deleted_projects = (
        db.query(Project)
        .filter(Project.id.in_(obsolete_project_ids))
        .delete(synchronize_session=False)
    )

    return {
        "projects": deleted_projects,
        "complaints": deleted_complaints,
        "complaint_routings": deleted_routings,
        "risk_scores": deleted_risk_scores,
        "media": deleted_media_from_complaints + deleted_media_from_projects,
        "fund_disbursements": deleted_fund_disbursements,
    }


def run_import(prune_others: bool = False) -> None:
    input_path = resolve_input_path()
    records = load_records(input_path)
    keep_project_codes = set()

    db = SessionLocal()
    inserted = 0
    updated = 0
    prune_summary = {
        "projects": 0,
        "complaints": 0,
        "complaint_routings": 0,
        "risk_scores": 0,
        "media": 0,
        "fund_disbursements": 0,
    }

    try:
        for index, record in enumerate(records, start=1):
            project_code = str(record.get("project_code") or "").strip()
            if not project_code:
                continue

            keep_project_codes.add(project_code)

            total, labour, material, other = project_cost_breakdown(record)

            values = {
                "project_name": record.get("project_name") or project_code,
                "location": build_location(record),
                "latitude": float(record["latitude"]) if record.get("latitude") is not None else None,
                "longitude": float(record["longitude"]) if record.get("longitude") is not None else None,
                "contractor_id": f"DEPT-{record.get('department_id', 'NA')}",
                "total_funds": total,
                "labour_cost": labour,
                "material_cost": material,
                "other_cost": other,
                "status": map_status(str(record.get("status") or "")),
                "start_date": parse_date(record.get("start_date")),
                "expected_end_date": parse_date(record.get("expected_completion_date")),
                "actual_end_date": parse_date(record.get("actual_completion_date")),
            }

            existing = db.query(Project).filter(Project.project_id == project_code).first()

            if existing:
                for key, value in values.items():
                    setattr(existing, key, value)
                updated += 1
            else:
                db.add(Project(project_id=project_code, **values))
                inserted += 1

            if index % 50 == 0:
                db.commit()

        if prune_others:
            prune_summary = prune_other_projects(db, keep_project_codes)

        db.commit()
    finally:
        db.close()

    print(f"Imported from: {input_path}")
    print(f"Records processed: {len(records)}")
    print(f"Inserted: {inserted}")
    print(f"Updated: {updated}")
    if prune_others:
        print("Pruned rows:")
        print(f"  Projects removed: {prune_summary['projects']}")
        print(f"  Complaints removed: {prune_summary['complaints']}")
        print(f"  Complaint routings removed: {prune_summary['complaint_routings']}")
        print(f"  Risk scores removed: {prune_summary['risk_scores']}")
        print(f"  Media rows removed: {prune_summary['media']}")
        print(f"  Fund disbursements removed: {prune_summary['fund_disbursements']}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import projects_final.json into the database")
    parser.add_argument(
        "--prune-others",
        action="store_true",
        help="Remove project rows (and dependent rows) not present in the input file",
    )
    args = parser.parse_args()

    run_import(prune_others=args.prune_others)