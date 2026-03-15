from sqlalchemy import Column, Integer, String, Float, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime

class DBTrainingProfile(Base):
    """Stores a saved configuration for a neural network."""
    __tablename__ = "training_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    
    # Stored as JSON for simplicity in local app
    config = Column(JSON) 
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationship to history
    history = relationship("DBTrainingHistory", back_populates="profile")

class DBTrainingHistory(Base):
    """Stores the results of a training run."""
    __tablename__ = "training_history"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("training_profiles.id"))
    
    # Final metrics
    final_accuracy = Column(Float)
    final_loss = Column(Float)
    epochs_completed = Column(Integer)
    
    # Full history can be large, maybe store summary or path to a CSV/JSON file
    # For now, we'll store the final snapshot
    metrics_summary = Column(JSON) 
    
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    profile = relationship("DBTrainingProfile", back_populates="history")
