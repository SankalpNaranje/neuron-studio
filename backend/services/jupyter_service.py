import subprocess
import os
import sys
import time
import signal
import json
import logging
from pathlib import Path
from services.fs_service import FSService

logger = logging.getLogger(__name__)


class JupyterService:
    """Manages a singleton Jupyter notebook server process."""

    _process = None
    _port = 8888
    _token = "neurostudio"
    _base_dir = None

    @classmethod
    def get_base_dir(cls):
        """Return the root data directory where all project datasets live."""
        return FSService.get_safe_path("default")

    @classmethod
    def get_status(cls):
        """Return current Jupyter server status."""
        if cls._process and cls._process.poll() is None:
            return {
                "running": True,
                "port": cls._port,
                "token": cls._token,
                "url": f"http://localhost:{cls._port}",
            }
        return {"running": False}

    @classmethod
    def start(cls, root_dir: str = None):
        """Start the Jupyter notebook server."""
        if cls._process and cls._process.poll() is None:
            return cls.get_status()

        if root_dir:
            cls._base_dir = root_dir
        else:
            cls._base_dir = str(cls.get_base_dir())

        python_exe = sys.executable
        env = os.environ.copy()
        # Ensure the venv Python is used
        env["PYTHONPATH"] = str(Path(__file__).parent.parent.parent / "src")

        cmd = [
            python_exe,
            "-m", "jupyter", "notebook",
            f"--port={cls._port}",
            "--no-browser",
            f"--NotebookApp.token={cls._token}",
            "--NotebookApp.disable_check_xsrf=True",
            f"--notebook-dir={cls._base_dir}",
            # Allow embedding in iframe
            "--NotebookApp.tornado_settings={'headers': {'Content-Security-Policy': \"frame-ancestors 'self' http://localhost:* \"}}",
            # Allow CORS
            f"--NotebookApp.allow_origin=*",
            "--ip=0.0.0.0",
        ]

        try:
            cls._process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0,
                env=env,
            )
            # Give it a moment to start
            time.sleep(2)

            if cls._process.poll() is not None:
                stderr = cls._process.stderr.read().decode() if cls._process.stderr else ""
                logger.error(f"Jupyter failed to start: {stderr}")
                return {"running": False, "error": f"Failed to start: {stderr[-500:]}"}

            logger.info(f"Jupyter server started on port {cls._port}")
            return cls.get_status()

        except Exception as e:
            logger.error(f"Failed to start Jupyter: {e}")
            return {"running": False, "error": str(e)}

    @classmethod
    def stop(cls):
        """Stop the Jupyter notebook server."""
        if cls._process:
            try:
                if os.name == 'nt':
                    cls._process.terminate()
                else:
                    os.killpg(os.getpgid(cls._process.pid), signal.SIGTERM)
                cls._process.wait(timeout=5)
            except Exception:
                try:
                    cls._process.kill()
                except Exception:
                    pass
            cls._process = None
            logger.info("Jupyter server stopped")
        return {"running": False}

    @classmethod
    def get_notebook_url(cls, project_name: str, dataset_id: str, filename: str):
        """Build the URL to open a specific notebook in Jupyter."""
        if not cls._process or cls._process.poll() is not None:
            cls.start()

        # Path relative to the root dir
        # Root dir is the project directory, notebooks are at dataset/<id>/notebooks/<file>
        relative_path = f"dataset/{dataset_id}/notebooks/{filename}"
        return {
            "url": f"http://localhost:{cls._port}/notebooks/{relative_path}?token={cls._token}",
            "token": cls._token,
        }

    @classmethod
    def ensure_running(cls):
        """Ensure Jupyter server is running, start if not."""
        status = cls.get_status()
        if not status["running"]:
            return cls.start()
        return status
