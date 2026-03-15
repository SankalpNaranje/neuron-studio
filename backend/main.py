import sys
import os

# Ensure the project's src/ is on the path for core module imports
# sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.nn_routes import router as nn_router
from routes.workspace_routes import router as workspace_router
from routes.storage_routes import router as storage_router
from routes.dataset_routes import router as dataset_router
from routes.jupyter_routes import router as jupyter_router
from database import init_db

app = FastAPI(
    title="Neuron Studio API",
    description="FastAPI backend for the custom neural network builder",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(nn_router, prefix="/api")
app.include_router(workspace_router, prefix="/api/workspace")
app.include_router(storage_router, prefix="/api/storage")
app.include_router(dataset_router, prefix="/api/datasets")
app.include_router(jupyter_router, prefix="/api/jupyter")

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/")
async def root():
    return {"status": "Neuron Studio API is running \ud83e\udde0"}

@app.get("/api/health")
async def health():
    return {"status": "online"}
