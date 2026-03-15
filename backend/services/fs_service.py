import os
import shutil
import json
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

class FSService:
    """
    Handles all local file system operations securely.
    Ensures all paths are within the NeuronStudio workspace root.
    """
    
    @classmethod
    def get_root_dir(cls) -> Path:
        """Get the root workspace directory, creating it if it doesn't exist."""
        # Use the actual project data directory in the user's home folder
        root = Path.home() / "NeuronStudio" / "workspaces"
        root.mkdir(parents=True, exist_ok=True)
        return root

    @classmethod
    def get_safe_path(cls, rel_path: str) -> Path:
        """
        Converts a relative path to an absolute path inside the workspace.
        Raises ValueError if there's a path traversal attempt.
        """
        root = cls.get_root_dir()
        if not rel_path or rel_path.strip() == "":
            return root
            
        # Clean the path and resolve it
        clean_path = rel_path.lstrip("/").lstrip("\\")
        
        # The frontend uses "user.neuronstudio" as the root node name
        if clean_path.startswith("user.neuronstudio"):
            clean_path = clean_path[len("user.neuronstudio"):].lstrip("/").lstrip("\\")
            
        target_path = (root / clean_path).resolve()
        
        # Security: ensure the resolved path starts with the root path
        try:
            target_path.relative_to(root.resolve())
        except ValueError:
            raise ValueError("Path traversal denied: Access outside workspace root is forbidden.")
            
        return target_path

    @classmethod
    def create_project(cls, name: str) -> str:
        """
        Creates a new project structure and returns the relative path key.
        """
        if not name:
            raise ValueError("Project name cannot be empty")
            
        project_dir = cls.get_safe_path(name)
        if project_dir.exists():
            raise ValueError(f"A project or folder named '{name}' already exists.")
            
        # Create main directory
        project_dir.mkdir(parents=True)
        
        # Create required subdirectories
        (project_dir / "runs").mkdir()
        
        custom_dir = project_dir / "custom"
        custom_dir.mkdir()
        activations_dir = custom_dir / "activations"
        activations_dir.mkdir()
        losses_dir = custom_dir / "losses"
        losses_dir.mkdir()
        optimizers_dir = custom_dir / "optimizers"
        optimizers_dir.mkdir()

        # Generate main.py
        main_py_path = project_dir / "main.py"
        main_py_content = 'from backend.services.nn_service import run_training\n\nif __name__ == "__main__":\n    run_training()'
        with open(main_py_path, "w", encoding="utf-8") as f:
            f.write(main_py_content)

        # Generate custom_activation.py
        act_path = activations_dir / "custom_activation.py"
        act_content = (
            "from custom_neural_network.core.Activation_Fn.base_activation import BaseActivation\n\n"
            "class CustomActivation(BaseActivation):\n"
            "    def forward(self, inputs):\n"
            "        # TODO: Implement forward pass. Must set self.output\n"
            "        raise NotImplementedError\n\n"
            "    def backward(self, dvalues):\n"
            "        # TODO: Implement backward pass. Must set self.dinputs\n"
            "        raise NotImplementedError\n"
        )
        with open(act_path, "w", encoding="utf-8") as f:
            f.write(act_content)

        # Generate custom_loss.py
        loss_path = losses_dir / "custom_loss.py"
        loss_content = (
            "from custom_neural_network.core.Loss_Fn.base_loss import BaseLoss\n\n"
            "class CustomLoss(BaseLoss):\n"
            "    def forward(self, y_pred, y_true):\n"
            "        # TODO: Implement forward pass. Return average loss\n"
            "        raise NotImplementedError\n\n"
            "    def backward(self, dvalues, y_true):\n"
            "        # TODO: Implement backward pass. Must set self.dinputs\n"
            "        raise NotImplementedError\n"
        )
        with open(loss_path, "w", encoding="utf-8") as f:
            f.write(loss_content)

        # Generate custom_optimizer.py
        opt_path = optimizers_dir / "custom_optimizer.py"
        opt_content = (
            "from custom_neural_network.core.Optimizers.base_optimizer import BaseOptimizer\n\n"
            "class CustomOptimizer(BaseOptimizer):\n"
            "    def set_parameters(self, layers):\n"
            "        # TODO: Attach model layers to the optimizer\n"
            "        raise NotImplementedError\n\n"
            "    def step(self):\n"
            "        # TODO: Perform one optimization step. Update all parameters\n"
            "        raise NotImplementedError\n\n"
            "    def zero_grad(self):\n"
            "        # TODO: Reset gradients after parameter update\n"
            "        raise NotImplementedError\n"
        )
        with open(opt_path, "w", encoding="utf-8") as f:
            f.write(opt_content)
        
        # Create default config.json
        default_config = {
            "name": name,
            "dataset": "SPIRAL",
            "input_features": 2,
            "loss": "CATEGORICAL_CROSS_ENTROPY",
            "optimizer": "ADAM",
            "optimizer_params": {
                "learning_rate": 0.02
            },
            "epochs": 1000,
            "log_every": 100,
            "layers": [
                {
                    "neurons": 8,
                    "activation": "RELU"
                },
                {
                    "neurons": 8,
                    "activation": "RELU"
                },
                {
                    "neurons": 3,
                    "activation": "SOFTMAX"
                }
            ]
        }
        
        config_path = project_dir / "config.json"
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(default_config, f, indent=4)
            
        return name

    @classmethod
    def create_folder(cls, parent_path: str, name: str) -> str:
        """Creates a subfolder and returns the new relative path key."""
        parent_dir = cls.get_safe_path(parent_path)
        if not parent_dir.is_dir():
            raise ValueError(f"Parent path '{parent_path}' is not a directory.")
            
        new_dir = parent_dir / name
        if new_dir.exists():
            raise ValueError(f"A folder or file named '{name}' already exists in this location.")
            
        new_dir.mkdir()
        return str(new_dir.relative_to(cls.get_root_dir())).replace("\\", "/")

    @classmethod
    def create_file(cls, parent_path: str, name: str, content: str = "") -> str:
        """Creates a file with optional content and returns the relative path key."""
        parent_dir = cls.get_safe_path(parent_path)
        if not parent_dir.is_dir():
             raise ValueError(f"Parent path '{parent_path}' is not a directory.")
             
        new_file = parent_dir / name
        if new_file.exists():
            raise ValueError(f"A file or folder named '{name}' already exists in this location.")
            
        with open(new_file, "w", encoding="utf-8") as f:
            f.write(content)
            
        return str(new_file.relative_to(cls.get_root_dir())).replace("\\", "/")

    @classmethod
    def update_file(cls, file_path: str, content: str):
        """Updates the content of an existing file."""
        target_file = cls.get_safe_path(file_path)
        if not target_file.is_file():
            raise ValueError(f"Path '{file_path}' is not a valid file.")
            
        with open(target_file, "w", encoding="utf-8") as f:
            f.write(content)

    @classmethod
    def delete_node(cls, path: str):
        """Deletes a file or directory."""
        target = cls.get_safe_path(path)
        if not target.exists():
            return # Idempotent deletion
            
        if target == cls.get_root_dir():
            raise ValueError("Cannot delete the workspace root.")
            
        if target.is_dir():
            shutil.rmtree(target)
        else:
            target.unlink()

    @classmethod
    def rename_node(cls, path: str, new_name: str) -> str:
        """Renames a file or directory and returns the new relative path."""
        target = cls.get_safe_path(path)
        if not target.exists():
            raise ValueError(f"Path '{path}' does not exist.")
            
        if target == cls.get_root_dir():
             raise ValueError("Cannot rename the workspace root.")
             
        # new_name should be just the basename, not a path
        if "/" in new_name or "\\" in new_name:
            raise ValueError("New name cannot contain path separators.")
            
        new_target = target.parent / new_name
        if new_target.exists():
             raise ValueError(f"A file or folder named '{new_name}' already exists here.")
             
        target.rename(new_target)
        return str(new_target.relative_to(cls.get_root_dir())).replace("\\", "/")

    @classmethod
    def read_file(cls, file_path: str) -> str:
        """Reads file content."""
        target = cls.get_safe_path(file_path)
        if not target.is_file():
            raise ValueError(f"Path '{file_path}' is not a file.")
            
        with open(target, "r", encoding="utf-8") as f:
            return f.read()

    @classmethod
    def get_tree(cls) -> List[Dict[str, Any]]:
        """
        Builds a JSON tree of the workspace compatible with the frontend.
        """
        root_dir = cls.get_root_dir()
        
        def _build_node(path: Path) -> Dict[str, Any]:
            rel_key = "root" if path == root_dir else str(path.relative_to(root_dir)).replace("\\", "/")
            
            node = {
                "title": "user.neuronstudio" if path == root_dir else path.name,
                "key": rel_key,
                "type": "root" if path == root_dir else ("category" if path.is_dir() else "file")
            }
            
            # Additional frontend properties
            if path.is_file():
                node["isLeaf"] = True
                ext = path.suffix.lstrip(".")
                node["extension"] = ext
                # Only preload text files, ignore binary like .pt
                if ext in ["js", "json", "py", "css", "html", "txt", "md"]:
                    try:
                        node["content"] = cls.read_file(rel_key)
                    except Exception:
                        node["content"] = "// Could not read file content"
                else:
                    node["content"] = f"// Binary or unsupported file: {path.name}"
                
                # Check if it was meant to be neurocode (simplistic check)
                node["isNeuroCode"] = ext == "py"
                
                if path.name == "main.py" and path.parent.parent == root_dir:
                    node["readOnly"] = True
                
                # Format last modified
                try:
                    mtime = path.stat().st_mtime
                    from datetime import datetime
                    node["lastModified"] = datetime.fromtimestamp(mtime).isoformat()
                except Exception:
                    node["lastModified"] = "Unknown"
            else:
                # Directory
                # The frontend categorizes project roots differently
                if path.parent == root_dir and path != root_dir and path.name != "dataset":
                    node["type"] = "project"
                elif path.parent.parent == root_dir and path.name in ["dataset", "runs", "models", "custom"]:
                    node["categoryId"] = path.name
                elif path.parent.name == "custom" and path.parent.parent.parent == root_dir and path.name in ["activations", "losses", "optimizers"]:
                    node["categoryId"] = path.name
                    
                children = []
                for child in sorted(path.iterdir(), key=lambda x: (x.is_file(), x.name.lower())):
                    children.append(_build_node(child))
                node["children"] = children
                
            return node

        # Fulfill initial array structure for frontend
        root_node = _build_node(root_dir)
        return [root_node]
