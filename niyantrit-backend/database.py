import os

from sqlalchemy import create_engine, inspect
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv(override=True)

DEFAULT_SQLITE_URL = "sqlite:///./niyantrit.db"
FALLBACK_DATABASE_URL = os.getenv("FALLBACK_DATABASE_URL", DEFAULT_SQLITE_URL).strip() or DEFAULT_SQLITE_URL


def _create_engine(database_url: str):
    engine_kwargs = {
        "pool_pre_ping": True,
    }
    if database_url.startswith("sqlite"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}
    elif database_url.startswith("postgresql"):
        # Fail fast when local Postgres is down so API requests don't hang.
        engine_kwargs["connect_args"] = {"connect_timeout": 3}

    return create_engine(database_url, **engine_kwargs)


def _has_expected_schema(db_engine) -> bool:
    expected_tables = {"users", "projects", "complaints", "risk_scores"}
    expected_project_columns = {
        "project_id",
        "project_name",
        "location",
        "total_funds",
        "labour_cost",
        "material_cost",
        "other_cost",
        "status",
    }

    try:
        inspector = inspect(db_engine)
        available_tables = set(inspector.get_table_names())
        if not expected_tables.issubset(available_tables):
            return False

        available_project_columns = {
            column["name"] for column in inspector.get_columns("projects")
        }
        return expected_project_columns.issubset(available_project_columns)
    except SQLAlchemyError:
        return False


def _resolve_database_url() -> str:
    configured_database_url = os.getenv("DATABASE_URL", DEFAULT_SQLITE_URL).strip() or DEFAULT_SQLITE_URL
    if configured_database_url.startswith("sqlite"):
        return configured_database_url

    try:
        compatibility_engine = _create_engine(configured_database_url)
        try:
            if _has_expected_schema(compatibility_engine):
                return configured_database_url
        finally:
            compatibility_engine.dispose()
    except SQLAlchemyError:
        # Gracefully fall back when the configured DB is unreachable.
        return FALLBACK_DATABASE_URL

    return FALLBACK_DATABASE_URL

DATABASE_URL = _resolve_database_url()
engine = _create_engine(DATABASE_URL)

SessionLocal = sessionmaker(bind=engine)

Base = declarative_base()