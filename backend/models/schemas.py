from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import datetime

class LayerConfig(BaseModel):
    neurons: int
    activation: str = "RELU"
    weight_regularizer_l1: float = 0.0
    weight_regularizer_l2: float = 0.0
    bias_regularizer_l1: float = 0.0
    bias_regularizer_l2: float = 0.0

class TrainingConfig(BaseModel):
    layers: List[LayerConfig]
    dataset: str = "SPIRAL"
    input_features: int = 2
    feature_names: List[str] = []
    loss: str = "CATEGORICAL_CROSS_ENTROPY"
    optimizer: str = "ADAM"
    optimizer_params: Dict[str, Any] = {}
    epochs: int = 10000
    log_every: int = 100
    train_split: float = 0.7
    val_split: float = 0.15
    test_split: float = 0.15

class TrainingSession(BaseModel):
    session_id: str

class EpochMetric(BaseModel):
    epoch: int
    accuracy: float
    loss: float
    learning_rate: float
    log_line: str

class ExecutionRequest(BaseModel):
    code: str
    language: str

class ExecutionResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    execution_time: float

class SystemInfo(BaseModel):
    cpu_percent: float
    ram_used_gb: float
    ram_total_gb: float
    ram_percent: float
    os_name: str
    platform: str
    python_version: str

# --- Storage Schemas ---

class TrainingProfileCreate(BaseModel):
    name: str
    description: Optional[str] = None
    config: TrainingConfig

class TrainingProfile(TrainingProfileCreate):
    id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

class TrainingHistory(BaseModel):
    id: int
    profile_id: int
    final_accuracy: float
    final_loss: float
    epochs_completed: int
    metrics_summary: Dict[str, Any]
    timestamp: datetime.datetime

    class Config:
        from_attributes = True
