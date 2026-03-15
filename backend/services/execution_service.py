import subprocess
import tempfile
import os
import time
import psutil
import platform
import sys
from models.schemas import ExecutionResponse, SystemInfo

class ExecutionService:
    @staticmethod
    def run_file(file_path: str, language: str) -> ExecutionResponse:
        start_time = time.time()
        
        # Mapping languages to run commands
        lang_config = {
            "python": {"cmd": [sys.executable]},
            "javascript": {"cmd": ["node"]},
        }
        
        config = lang_config.get(language.lower())
        if not config:
            return ExecutionResponse(
                stdout="",
                stderr=f"Unsupported language: {language}",
                exit_code=1,
                execution_time=0.0
            )

        if not os.path.exists(file_path):
            return ExecutionResponse(
                stdout="",
                stderr=f"File not found: {file_path}",
                exit_code=1,
                execution_time=0.0
            )

        # Execute from the file's directory so relative imports work
        working_dir = os.path.dirname(file_path)

        try:
            process = subprocess.Popen(
                config["cmd"] + [file_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=working_dir,
                text=True
            )
            stdout, stderr = process.communicate(timeout=30) # 30s timeout
            exit_code = process.returncode
        except subprocess.TimeoutExpired:
            process.kill()
            stdout, stderr = "", "Execution timed out (30s limit)"
            exit_code = 124
        except Exception as e:
            stdout, stderr = "", f"Execution error: {str(e)}"
            exit_code = 1

        execution_time = time.time() - start_time
        return ExecutionResponse(
            stdout=stdout,
            stderr=stderr,
            exit_code=exit_code,
            execution_time=round(execution_time, 3)
        )

    @staticmethod
    def get_system_info() -> SystemInfo:
        cpu_percent = psutil.cpu_percent(interval=None)
        memory = psutil.virtual_memory()
        
        return SystemInfo(
            cpu_percent=cpu_percent,
            ram_used_gb=round(memory.used / (1024**3), 2),
            ram_total_gb=round(memory.total / (1024**3), 2),
            ram_percent=memory.percent,
            os_name=platform.system(),
            platform=platform.platform(),
            python_version=platform.python_version()
        )
