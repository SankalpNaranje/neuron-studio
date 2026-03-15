from fastapi import APIRouter, HTTPException
from services.jupyter_service import JupyterService

router = APIRouter()


@router.get("/status")
async def jupyter_status():
    """Get current Jupyter server status."""
    return JupyterService.get_status()


@router.post("/start")
async def jupyter_start():
    """Start the Jupyter notebook server."""
    result = JupyterService.start()
    return result


@router.post("/stop")
async def jupyter_stop():
    """Stop the Jupyter notebook server."""
    return JupyterService.stop()


@router.get("/notebook-url/{project_name}/{dataset_id}/{filename}")
async def get_notebook_url(project_name: str, dataset_id: str, filename: str):
    """Get the URL to open a specific notebook in Jupyter."""
    try:
        return JupyterService.get_notebook_url(project_name, dataset_id, filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
