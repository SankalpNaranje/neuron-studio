from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = "sqlite:///./data/neuron_studio.db"

# Global placeholders
_engine = None
_SessionLocal = None
Base = declarative_base()

def get_engine():
    global _engine
    if _engine is None:
        # Ensure directory exists before creating engine
        data_dir = os.path.dirname(DATABASE_URL.replace("sqlite:///./", ""))
        if data_dir and not os.path.exists(data_dir):
            os.makedirs(data_dir, exist_ok=True)
            
        _engine = create_engine(
            DATABASE_URL, connect_args={"check_same_thread": False}
        )
    return _engine

def get_session_local():
    global _SessionLocal
    if _SessionLocal is None:
        engine = get_engine()
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return _SessionLocal

def get_db():
    # Only import and initialize when needed
    SessionLocal = get_session_local()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initializes the database tables."""
    engine = get_engine()
    # Import models here to avoid circular imports at top level
    from models import db_models
    Base.metadata.create_all(bind=engine)
