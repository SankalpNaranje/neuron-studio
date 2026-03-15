import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from models.schemas import TrainingConfig
from services.nn_service import (
    AVAILABLE_OPTIMIZERS,
    AVAILABLE_LOSS_FUNCTIONS,
    AVAILABLE_ACTIVATIONS,
    AVAILABLE_DATASETS,
    create_session,
    get_session_queue,
    remove_session,
    _run_training_sync,
    run_test_evaluation,
)
from services.dataset_service import DatasetService
from fastapi.responses import FileResponse
from services.fs_service import FSService

router = APIRouter()
_executor = ThreadPoolExecutor(max_workers=4)

@router.get("/evaluate/test/{project_name}/{run_id}")
async def evaluate_test(project_name: str, run_id: str):
    """Evaluate a saved model on the test dataset split"""
    return run_test_evaluation(project_name, run_id)

@router.get("/download/{project_name}/{run_id}")
async def download_model(project_name: str, run_id: str):
    """Download model weights .pt file"""
    project_dir = FSService.get_safe_path(project_name)
    file_path = project_dir / "runs" / run_id / "model_weights.pt"
    if not file_path.exists():
        return {"error": "Model file not found"}
    return FileResponse(path=file_path, filename=f"{run_id}_weights.pt", media_type='application/octet-stream')


@router.get("/config")
async def get_config(project_name: str = "default"):
    """Return available optimizers, loss functions, datasets, and activations to the frontend."""
    # Get predefined datasets only if default or all
    if project_name in ("default", "all"):
        datasets = {**AVAILABLE_DATASETS}
    else:
        datasets = {}
    
    # Add custom datasets from project
    custom_datasets = DatasetService.list_datasets(project_name)
    for ds in custom_datasets:
        # Map to format expected by frontend
        datasets[ds["id"]] = {
            "label": ds["name"],
            "description": f"Custom dataset: {ds['name']}",
            "classes": ds.get("classes", 2),
            "features": ds.get("features", 0),
            "raw_dataset": ds # Send full metadata for feature selection
        }

    # Base configurations
    optimizers = {**AVAILABLE_OPTIMIZERS}
    loss_functions = {**AVAILABLE_LOSS_FUNCTIONS}
    activations = {**AVAILABLE_ACTIVATIONS}

    # Merge custom components if not in default project
    if project_name != "default":
        from services.nn_service import get_custom_components
        custom = get_custom_components(project_name)
        
        # Add custom activations
        for act in custom.get("activations", []):
            name = f"custom:{act}"
            activations[name] = {
                "label": f"Custom: {act}",
                "description": f"User-defined activation function: {act}"
            }
            
        # Add custom losses
        for loss in custom.get("losses", []):
            name = f"custom:{loss}"
            loss_functions[name] = {
                "label": f"Custom: {loss}",
                "description": f"User-defined loss function: {loss}"
            }
            
        # Add custom optimizers
        for opt in custom.get("optimizers", []):
            name = f"custom:{opt}"
            optimizers[name] = {
                "label": f"Custom: {opt}",
                "description": f"User-defined optimizer: {opt}",
                "params": [
                    {"name": "learning_rate", "type": "float", "default": 0.01, "label": "Learning Rate"}
                ]
            }

    return {
        "optimizers": optimizers,
        "loss_functions": loss_functions,
        "activations": activations,
        "datasets": datasets,
    }


class TrainRequest(BaseModel):
    project_name: str

@router.post("/train")
async def start_training(req: TrainRequest):
    """Create a training session and return a session_id for WebSocket connection."""
    session_id = create_session()
    return {"session_id": session_id, "project_name": req.project_name}


@router.websocket("/ws/train/{session_id}")
async def websocket_training(websocket: WebSocket, session_id: str):
    """WebSocket endpoint: receives TrainingConfig JSON, streams epoch metrics."""
    await websocket.accept()
    queue = get_session_queue(session_id)

    if queue is None:
        await websocket.send_json({"type": "error", "message": "Invalid session ID"})
        await websocket.close()
        return

    try:
        # Receive the project name and config from the client
        data = await websocket.receive_json()
        project_name = data.get("project_name")
        config_dict = data.get("config")
        
        if not project_name:
            await websocket.send_json({"type": "error", "message": "project_name is required"})
            return

        loop = asyncio.get_event_loop()

        # Run training in a thread pool (CPU-bound work)
        future = loop.run_in_executor(
            _executor, _run_training_sync, queue, loop, project_name, config_dict
        )

        # Stream results from queue to WebSocket
        while True:
            metric = await queue.get()
            await websocket.send_json(metric)
            if metric.get("type") in ("done", "error"):
                break

        await future  # Ensure thread is fully done

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        remove_session(session_id)
        try:
            await websocket.close()
        except Exception:
            pass
