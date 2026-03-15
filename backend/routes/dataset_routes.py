from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import List, Optional
from services.dataset_service import DatasetService
from pydantic import BaseModel

router = APIRouter()

class ConfigUpdateReq(BaseModel):
    feature_cols: List[str]
    target_col: str

class NotebookCreateReq(BaseModel):
    name: str

class RenameReq(BaseModel):
    new_name: str

@router.post("/upload/{project_name}")
async def upload_dataset(project_name: str, file: UploadFile = File(...)):
    if not file.filename.endswith((".csv", ".json")):
        raise HTTPException(status_code=400, detail="Only CSV or JSON files are supported.")
        
    content = await file.read()
    result = DatasetService.process_upload(project_name, content, file.filename)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.get("/{project_name}")
async def list_datasets(project_name: str):
    return DatasetService.list_datasets(project_name)

@router.put("/{project_name}/{dataset_id}/config")
async def update_dataset_config(project_name: str, dataset_id: str, req: ConfigUpdateReq):
    try:
        updated = DatasetService.update_config(project_name, dataset_id, req.feature_cols, req.target_col)
        return updated
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{project_name}/{dataset_id}/preview")
async def get_dataset_preview(project_name: str, dataset_id: str, n: int = 5):
    try:
        return DatasetService.get_preview(project_name, dataset_id, n)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{project_name}/{dataset_id}/distributions")
async def get_dataset_distributions(project_name: str, dataset_id: str):
    try:
        return DatasetService.get_distributions(project_name, dataset_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{project_name}/{dataset_id}/refresh-eda")
async def refresh_eda(project_name: str, dataset_id: str):
    try:
        return DatasetService.refresh_eda(project_name, dataset_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/{project_name}/{dataset_id}/rename")
async def rename_dataset(project_name: str, dataset_id: str, req: RenameReq):
    try:
        return DatasetService.rename_dataset(project_name, dataset_id, req.new_name)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

# --- Notebook endpoints ---
@router.get("/{project_name}/{dataset_id}/notebooks")
async def list_notebooks(project_name: str, dataset_id: str):
    return DatasetService.list_notebooks(project_name, dataset_id)

@router.post("/{project_name}/{dataset_id}/notebooks")
async def create_notebook(project_name: str, dataset_id: str, req: NotebookCreateReq):
    try:
        return DatasetService.create_notebook(project_name, dataset_id, req.name)
    except FileExistsError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/{project_name}/{dataset_id}/assign")
async def assign_dataset(project_name: str, dataset_id: str, target_project: str = None):
    # project_name in URL is the current context
    # target_project is where it's being assigned (query param)
    # If target_project is "default", we set it to None (unassign)
    assign_to = None if target_project == "default" else target_project
    return DatasetService.assign_to_project(dataset_id, assign_to)

