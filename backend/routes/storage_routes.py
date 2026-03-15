from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.db_models import DBTrainingProfile
from models import schemas

router = APIRouter()

@router.post("/profiles", response_model=schemas.TrainingProfile)
def create_profile(profile: schemas.TrainingProfileCreate, db: Session = Depends(get_db)):
    db_profile = DBTrainingProfile(
        name=profile.name,
        description=profile.description,
        config=profile.config.model_dump()
    )
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile

@router.get("/profiles", response_model=List[schemas.TrainingProfile])
def read_profiles(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    profiles = db.query(DBTrainingProfile).offset(skip).limit(limit).all()
    return profiles

@router.get("/profiles/{profile_id}", response_model=schemas.TrainingProfile)
def read_profile(profile_id: int, db: Session = Depends(get_db)):
    db_profile = db.query(DBTrainingProfile).filter(DBTrainingProfile.id == profile_id).first()
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return db_profile

@router.delete("/profiles/{profile_id}")
def delete_profile(profile_id: int, db: Session = Depends(get_db)):
    db_profile = db.query(DBTrainingProfile).filter(DBTrainingProfile.id == profile_id).first()
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    db.delete(db_profile)
    db.commit()
    return {"message": "Profile deleted"}
