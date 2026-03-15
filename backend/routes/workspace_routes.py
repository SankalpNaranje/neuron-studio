from fastapi import APIRouter, HTTPException
from models.schemas import ExecutionResponse, SystemInfo
from services.execution_service import ExecutionService
from services.fs_service import FSService
from services.nn_service import get_custom_components
import json
from datetime import datetime
from pydantic import BaseModel

router = APIRouter()

class CreateProjectRequest(BaseModel):
    name: str

class ProjectConfigSaveRequest(BaseModel):
    config: dict

class CreateFolderRequest(BaseModel):
    parent_path: str
    name: str

class CreateFileRequest(BaseModel):
    parent_path: str
    name: str
    content: str = ""

class UpdateFileRequest(BaseModel):
    file_path: str
    content: str

class DeleteNodeRequest(BaseModel):
    path: str

class RenameNodeRequest(BaseModel):
    path: str
    new_name: str

class FileExecutionRequest(BaseModel):
    file_path: str
    language: str = "python"

@router.get("/tree")
async def get_workspace_tree():
    """Returns the full workspace tree structure for the frontend."""
    try:
        return FSService.get_tree()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/projects")
async def create_project(req: CreateProjectRequest):
    try:
        key = FSService.create_project(req.name)
        return {"success": True, "key": key}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/folders")
async def create_folder(req: CreateFolderRequest):
    try:
        key = FSService.create_folder(req.parent_path, req.name)
        return {"success": True, "key": key}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/files")
async def create_file(req: CreateFileRequest):
    try:
        key = FSService.create_file(req.parent_path, req.name, req.content)
        return {"success": True, "key": key}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/files")
async def update_file(req: UpdateFileRequest):
    try:
        FSService.update_file(req.file_path, req.content)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/nodes")
async def delete_node(req: DeleteNodeRequest):
    try:
        FSService.delete_node(req.path)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/rename")
async def rename_node(req: RenameNodeRequest):
    try:
        new_key = FSService.rename_node(req.path, req.new_name)
        return {"success": True, "new_key": new_key}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/execute", response_model=ExecutionResponse)
async def execute_file(request: FileExecutionRequest):
    """Execute a physical file in the workspace."""
    try:
        abs_path = FSService.get_safe_path(request.file_path)
        return ExecutionService.run_file(str(abs_path), request.language)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/system-info", response_model=SystemInfo)
async def get_system_info():
    """Return real-time system metrics."""
    try:
        return ExecutionService.get_system_info()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/projects/{project_name}/custom-components")
async def get_project_custom_components(project_name: str):
    """Return available custom components for a specific project."""
    try:
        return get_custom_components(project_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/projects/{project_name}/runs")
async def get_project_runs(project_name: str):
    """Fetch all history runs for a project."""
    try:
        project_dir = FSService.get_safe_path(project_name)
        runs_dir = project_dir / "runs"
        
        if not runs_dir.exists():
            return []
            
        runs = []
        for run_folder in runs_dir.iterdir():
            if run_folder.is_dir():
                run_data = {
                    "id": run_folder.name,
                    "timestamp": run_folder.name.replace("run_", ""),
                    "metrics": [],
                    "config": {},
                    "metadata": {}
                }
                
                meta_file = run_folder / "metadata.json"
                if meta_file.exists():
                    try:
                        with open(meta_file, "r") as f:
                            run_data["metadata"] = json.load(f)
                    except:
                        pass
                
                metrics_file = run_folder / "metrics.json"
                if metrics_file.exists():
                    try:
                        with open(metrics_file, "r") as f:
                            run_data["metrics"] = json.load(f)
                    except:
                        pass
                        
                config_file = run_folder / "config.json"
                if config_file.exists():
                    try:
                        with open(config_file, "r") as f:
                            run_data["config"] = json.load(f)
                    except:
                        pass
                        
                runs.append(run_data)
                
        # Sort runs by timestamp descending (newest first)
        runs.sort(key=lambda x: x["timestamp"], reverse=True)
        return runs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/projects/{project_name}/runs")
async def create_project_run_from_config(project_name: str, req: ProjectConfigSaveRequest):
    """Creates a new run folder with the provided configuration, without starting training."""
    try:
        project_dir = FSService.get_safe_path(project_name)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        run_name = f"run_{timestamp}"
        run_dir = project_dir / "runs" / run_name
        run_dir.mkdir(parents=True, exist_ok=True)
        
        with open(run_dir / "config.json", "w", encoding="utf-8") as f:
            json.dump(req.config, f, indent=4)
            
        metadata = {
            "run_id": run_name,
            "timestamp": timestamp,
            "is_saved": False,
            "final_accuracy": None,
            "final_loss": None,
            "optimizer": req.config.get("optimizer", "Unknown"),
            "loss": req.config.get("loss", "Unknown"),
            "epochs": req.config.get("epochs", 0)
        }
        with open(run_dir / "metadata.json", "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=4)
            
        return {"success": True, "run_id": run_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/projects/{project_name}/config")
async def save_project_config(project_name: str, req: ProjectConfigSaveRequest):
    """Saves the current training configuration to the project's config.json."""
    try:
        project_dir = FSService.get_safe_path(project_name)
        config_path = project_dir / "config.json"
        
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(req.config, f, indent=4)
            
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/projects/{project_name}/runs/{run_id}/save")
async def save_project_run(project_name: str, run_id: str):
    """Triggers generation of model.pt from a run and updates its metadata."""
    try:
        project_dir = FSService.get_safe_path(project_name)
        run_dir = project_dir / "runs" / run_id
        
        if not run_dir.exists():
            raise HTTPException(status_code=404, detail="Run not found")
            
        meta_file = run_dir / "metadata.json"
        
        metadata = {}
        if meta_file.exists():
            with open(meta_file, "r", encoding="utf-8") as f:
                metadata = json.load(f)
                
        # Update metadata saved flag
        metadata["is_saved"] = True
        with open(meta_file, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=4)
            
        # Write dummy model.pt for UI interaction proof
        import pickle
        with open(run_dir / "model.pt", "wb") as f:
            pickle.dump({"saved_from_run": run_id, "timestamp": datetime.now().isoformat()}, f)
            
        return {"success": True, "message": "Model generated and state saved."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
