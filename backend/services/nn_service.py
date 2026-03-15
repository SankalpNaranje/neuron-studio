import asyncio
import uuid
import sys
import os
import json
import time
import numpy as np
import pickle
import importlib.util
from datetime import datetime
from services.fs_service import FSService
from models.schemas import TrainingConfig
from typing import Optional

# Add project root to path so core modules are importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'Engine'))

from nnfs.datasets import spiral_data, vertical_data

from Engine.custom_neural_network.core.Layer.layer_dense import Layer_Dense
from Engine.custom_neural_network.core.Activation_Fn.relu import Relu_Activation
from Engine.custom_neural_network.core.Activation_Fn.softmax import Softmax_Activation
from Engine.custom_neural_network.core.Loss_Fn.combined import Softmax_Cross_Entropy_Combined
from Engine.custom_neural_network.core.Optimizers.sgd import Optimizer_SGD
from Engine.custom_neural_network.core.Optimizers.sdg_momentum import Optimizer_SGD as Optimizer_SGD_Momentum
from Engine.custom_neural_network.core.Optimizers.adagrad import Optimizer_AdaGrad
from Engine.custom_neural_network.core.Optimizers.rms_prop import Optimizer_RMSProp
from Engine.custom_neural_network.core.Optimizers.adam import Optimizer_Adam

# ---------------------------------------------------------------------------
# Metadata registry
# ---------------------------------------------------------------------------
AVAILABLE_DATASETS = {
    "SPIRAL": {
        "label": "Spiral Data",
        "description": "3 classes, non-linear spiral data. Excellent for testing classification.",
        "default_features": 2,
        "classes": 3
    },
    "VERTICAL": {
        "label": "Vertical Data",
        "description": "3 classes, vertically separated data.",
        "default_features": 2,
        "classes": 3
    }
}

AVAILABLE_OPTIMIZERS = {
    "SGD": {
        "label": "SGD (Vanilla)",
        "description": "Basic Stochastic Gradient Descent without learning rate decay.",
        "params": [
            {"name": "learning_rate", "type": "float", "default": 1.0, "label": "Learning Rate"}
        ],
    },
    "SGD_LR": {
        "label": "SGD with Decay",
        "description": "SGD with learning rate decay over iterations.",
        "params": [
            {"name": "learning_rate", "type": "float", "default": 1.0, "label": "Learning Rate"},
            {"name": "decay", "type": "float", "default": 1e-3, "label": "Decay"},
        ],
    },
    "SGD_MOMENTUM": {
        "label": "SGD with Momentum",
        "description": "SGD with momentum and optional learning rate decay.",
        "params": [
            {"name": "learning_rate", "type": "float", "default": 1.0, "label": "Learning Rate"},
            {"name": "decay", "type": "float", "default": 1e-3, "label": "Decay"},
            {"name": "momentum_factor", "type": "float", "default": 0.9, "label": "Momentum"},
        ],
    },
    "ADAGRAD": {
        "label": "AdaGrad",
        "description": "Adaptive Gradient optimizer — adapts learning rate per parameter.",
        "params": [
            {"name": "learning_rate", "type": "float", "default": 1.0, "label": "Learning Rate"},
            {"name": "decay", "type": "float", "default": 1e-4, "label": "Decay"},
            {"name": "epsilon", "type": "float", "default": 1e-7, "label": "Epsilon"},
        ],
    },
    "RMSPROP": {
        "label": "RMSProp",
        "description": "Root Mean Square Propagation with adaptive learning rates.",
        "params": [
            {"name": "learning_rate", "type": "float", "default": 0.01, "label": "Learning Rate"},
            {"name": "decay", "type": "float", "default": 1e-5, "label": "Decay"},
            {"name": "epsilon", "type": "float", "default": 1e-7, "label": "Epsilon"},
            {"name": "rho", "type": "float", "default": 0.999, "label": "Rho"},
        ],
    },
    "ADAM": {
        "label": "Adam",
        "description": "Adaptive Moment Estimation — combines momentum and RMSProp.",
        "params": [
            {"name": "learning_rate", "type": "float", "default": 0.02, "label": "Learning Rate"},
            {"name": "decay", "type": "float", "default": 1e-5, "label": "Decay"},
            {"name": "epsilon", "type": "float", "default": 1e-7, "label": "Epsilon"},
            {"name": "beta_1", "type": "float", "default": 0.9, "label": "Beta 1"},
            {"name": "beta_2", "type": "float", "default": 0.999, "label": "Beta 2"},
        ],
    },
}

AVAILABLE_LOSS_FUNCTIONS = {
    "CATEGORICAL_CROSS_ENTROPY": {
        "label": "Categorical Cross-Entropy",
        "description": "Standard loss for multi-class classification. Includes Softmax activation.",
    },
}

AVAILABLE_ACTIVATIONS = {
    "RELU": {"label": "ReLU", "description": "Rectified Linear Unit — max(0,x)"},
    "SOFTMAX": {"label": "Softmax", "description": "Output layer activation (Probabilities)"},
    "NONE": {"label": "None", "description": "Linear activation — f(x) = x"},
}

# ---------------------------------------------------------------------------
# Factories & Dynamic Loading
# ---------------------------------------------------------------------------
def _load_custom_component(project_dir, category, file_name):
    """
    Dynamically loads a python module from the project's custom directory.
    category: 'activations', 'losses', 'optimizers'
    """
    custom_dir = project_dir / "custom" / category
    file_path = custom_dir / file_name
    
    if not file_path.exists():
        raise FileNotFoundError(f"Custom component {file_name} not found in {custom_dir}")
        
    module_name = f"custom_nn_{category}_{file_name.replace('.py', '')}"
    
    spec = importlib.util.spec_from_file_location(module_name, str(file_path))
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    
    # Try to find the class in the module
    # We assume the class name either exactly matches the file name (e.g. MyRelu -> myrelu.py)
    # or it's the only class defined that doesn't start with '_'
    import inspect
    classes = [m for m in inspect.getmembers(module, inspect.isclass) if m[1].__module__ == module_name]
    
    if not classes:
        raise ValueError(f"No valid class found in {file_path}")
        
    # Return the first class found defined in this module
    return classes[0][1]

def get_custom_components(project_name: str) -> dict:
    """Returns a dictionary of custom components available in the project."""
    project_dir = FSService.get_safe_path(project_name)
    custom_dir = project_dir / "custom"
    
    result = {
        "activations": [],
        "losses": [],
        "optimizers": []
    }
    
    if not custom_dir.exists():
        return result
        
    for category in result.keys():
        cat_dir = custom_dir / category
        if cat_dir.exists():
            for f in cat_dir.iterdir():
                if f.is_file() and f.name.endswith(".py"):
                    result[category].append(f.name)
                    
    return result

def _get_activation_class(name: str, project_dir=None):
    if name.startswith("custom:"):
        _, file_name = name.split(":", 1)
        return _load_custom_component(project_dir, "activations", file_name)
        
    if name == "RELU":
        return Relu_Activation
    elif name == "SOFTMAX":
        return Softmax_Activation
    return None  # None means linear

def _load_dataset_split(project_name, dataset_id, split_name="train", feature_names=None):
    """Loads a specific split from the centralized storage."""
    from services.dataset_service import DatasetService
    ds_root = DatasetService.get_datasets_dir()
    ds_path = ds_root / dataset_id / split_name / "data.csv"
    
    if not ds_path.exists():
        # Maybe it's a custom dataset that hasn't been split yet?
        main_csv_path = ds_root / dataset_id / f"{dataset_id.split('_')[0]}.csv"
        # Try any CSV in the folder if the guess fails
        if not main_csv_path.exists():
            ds_dir = ds_root / dataset_id
            if ds_dir.exists():
                csvs = list(ds_dir.glob("*.csv"))
                if csvs:
                    main_csv_path = csvs[0]
        
        if main_csv_path.exists():
            import pandas as pd
            df = pd.read_csv(main_csv_path)
            meta_path = ds_root / dataset_id / "metadata.json"
            meta = {}
            if meta_path.exists():
                with open(meta_path, "r") as f:
                    meta = json.load(f)
            
            DatasetService.prepare_splits(ds_root / dataset_id, df, meta)
            # Try reloading now that splits should exist
            if not ds_path.exists():
                 return None, None
        else:
            return None, None
        
    import pandas as pd
    df = pd.read_csv(ds_path)
    
    # Check for string data in features/target if it's a custom dataset
    has_strings = False
    for col in df.columns:
        if df[col].dtype == 'object' or (not df.empty and isinstance(df[col].iloc[0], str)):
            has_strings = True
            break
            
    if has_strings:
        ds_dir = project_dir / "dataset" / dataset_id
        csvs = list(ds_dir.glob("*.csv"))
        if csvs:
            main_csv_path = csvs[0]
            from services.dataset_service import DatasetService
            meta_path = ds_dir / "metadata.json"
            meta = {}
            if meta_path.exists():
                with open(meta_path, "r") as f: meta = json.load(f)
            DatasetService.prepare_splits(ds_dir, pd.read_csv(main_csv_path), meta)
            # Re-read corrected data
            df = pd.read_csv(ds_path)

    # Load metadata to find target column
    meta_path = ds_root / dataset_id / "metadata.json"
    target_col = "target"
    feature_cols = []
    
    if meta_path.exists():
        with open(meta_path, "r") as f:
            meta = json.load(f)
            target_col = meta.get("target", target_col)
            feature_cols = meta.get("selected_features", [])

    if feature_names and len(feature_names) > 0:
        feature_cols = feature_names
    elif not feature_cols:
        feature_cols = [c for c in df.columns if c != target_col]
        
    # Validation
    feature_cols = [f for f in feature_cols if f in df.columns]
        
    X = df[feature_cols].values.astype(np.float32)
    y = df[target_col].values
    
    return X, y

def _build_optimizer(name: str, params: dict, project_dir=None):
    if name.startswith("custom:"):
        _, file_name = name.split(":", 1)
        # Custom optimizers currently take kwargs based on params
        OptClass = _load_custom_component(project_dir, "optimizers", file_name)
        return OptClass(**params)

    p = {k: float(v) for k, v in params.items()}
    if name == "SGD":
        return Optimizer_SGD(learning_rate=p.get("learning_rate", 1.0))
    elif name == "SGD_LR":
        return Optimizer_SGD(
            learning_rate=p.get("learning_rate", 1.0),
            decay=p.get("decay", 1e-3),
        )
    elif name == "SGD_MOMENTUM":
        return Optimizer_SGD_Momentum(
            learning_rate=p.get("learning_rate", 1.0),
            decay=p.get("decay", 1e-3),
            momentum=p.get("momentum_factor", 0.9),
        )
    elif name == "ADAGRAD":
        return Optimizer_AdaGrad(
            learning_rate=p.get("learning_rate", 1.0),
            decay=p.get("decay", 1e-4),
            epsilon=p.get("epsilon", 1e-7),
        )
    elif name == "RMSPROP":
        return Optimizer_RMSProp(
            learning_rate=p.get("learning_rate", 0.01),
            decay=p.get("decay", 1e-5),
            epsilon=p.get("epsilon", 1e-7),
            rho=p.get("rho", 0.999),
        )
    elif name == "ADAM":
        return Optimizer_Adam(
            learning_rate=p.get("learning_rate", 0.02),
            decay=p.get("decay", 1e-5),
            epsilon=p.get("epsilon", 1e-7),
            beta_1=p.get("beta_1", 0.9),
            beta_2=p.get("beta_2", 0.999),
        )
    else:
        raise ValueError(f"Unknown optimizer: {name}")


_sessions: dict[str, asyncio.Queue] = {}

def create_session() -> str:
    session_id = str(uuid.uuid4())
    _sessions[session_id] = asyncio.Queue()
    return session_id

def get_session_queue(session_id: str) -> asyncio.Queue | None:
    return _sessions.get(session_id)

def remove_session(session_id: str):
    _sessions.pop(session_id, None)


def _run_training_sync(queue: asyncio.Queue, loop: asyncio.AbstractEventLoop, project_name: str, config_dict: dict = None):
    try:
        import nnfs
        nnfs.init()

        # Resolve paths
        project_dir = FSService.get_safe_path(project_name)
        
        if config_dict is None:
            config_path = project_dir / "config.json"
            if not config_path.exists():
                raise FileNotFoundError(f"config.json not found in project '{project_name}'")

            with open(config_path, "r", encoding="utf-8") as f:
                config_dict = json.load(f)
            
        config = TrainingConfig(**config_dict)
        
        # Setup Run Directory
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        run_name = f"run_{timestamp}"
        run_dir = project_dir / "runs" / run_name
        run_dir.mkdir(parents=True, exist_ok=True)
        
        # Save snapshot
        snapshot_path = run_dir / "config.json"
        with open(snapshot_path, "w", encoding="utf-8") as f:
            json.dump(config_dict, f, indent=4)
            
        # Create metadata
        metadata = {
            "run_id": run_name,
            "timestamp": timestamp,
            "is_saved": False,
            "final_accuracy": None,
            "final_loss": None,
            "optimizer": config.optimizer,
            "loss": config.loss,
            "epochs": config.epochs
        }
        with open(run_dir / "metadata.json", "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=4)
            
        metrics_log = []

        # Load dataset
        X, y = None, None
        
        from services.dataset_service import DatasetService
        ds_root = DatasetService.get_datasets_dir()
        
        # Check if it's a custom dataset with physical splits
        if config.dataset not in AVAILABLE_DATASETS:
            X_train, y_train = _load_dataset_split(project_name, config.dataset, "train", config.feature_names)
            X_test, y_test = _load_dataset_split(project_name, config.dataset, "test", config.feature_names)
            
            # If still None, maybe need to re-encode/split if it was a string dataset
            if X_train is None:
                # Try a forced split repair if directory exists
                ds_dir = ds_root / config.dataset
                if ds_dir.exists():
                     # Dummy call to trigger auto-split in _load_dataset_split
                     _load_dataset_split(project_name, config.dataset, "train", config.feature_names)
                     X_train, y_train = _load_dataset_split(project_name, config.dataset, "train", config.feature_names)
                     X_test, y_test = _load_dataset_split(project_name, config.dataset, "test", config.feature_names)

            if X_train is not None:
                X, y = X_train, y_train
                X_val, y_val = X_test, y_test
            else:
                raise FileNotFoundError(f"Dataset '{config.dataset}' not found or could not be initialized.")
        else:
            # Predefined Datasets
            # The user wants physical splits for predefined too
            ds_id = f"PREDEFINED_{config.dataset}"
            X_train, y_train = _load_dataset_split(project_name, ds_id, "train", config.feature_names)
            X_test, y_test = _load_dataset_split(project_name, ds_id, "test", config.feature_names)
            
            if X_train is None:
                # Generate and save splits first
                if config.dataset == "SPIRAL":
                    X, y = spiral_data(samples=100, classes=3)
                else:
                    X, y = vertical_data(samples=100, classes=3)
                
                # Mock metadata for prepare_splits
                import pandas as pd
                ds_dir = ds_root / ds_id
                ds_dir.mkdir(parents=True, exist_ok=True)
                df = pd.DataFrame(X, columns=[f"feat_{i}" for i in range(X.shape[1])])
                df["target"] = y
                DatasetService.prepare_splits(ds_dir, df, {})
                
                # Reload
                X_train, y_train = _load_dataset_split(project_name, ds_id, "train", config.feature_names)
                X_test, y_test = _load_dataset_split(project_name, ds_id, "test", config.feature_names)

            X_val, y_val = X_test, y_test
                
        y_train_flat = y_train if len(y_train.shape) == 1 else np.argmax(y_train, axis=1)
        y_val_flat = y_val if len(y_val.shape) == 1 else np.argmax(y_val, axis=1)
        y_test_flat = y_test if len(y_test.shape) == 1 else np.argmax(y_test, axis=1)

        # Detect number of classes
        unique_labels = np.unique(np.concatenate([y_train_flat, y_test_flat]))
        num_classes = len(unique_labels)

        # Build layers and activations
        layers = []
        activations = []
        num_config_layers = len(config.layers)
        
        current_input_dim = config.input_features
        for i, lc in enumerate(config.layers):
            neurons = lc.neurons
            # Ensure the mapping of inputs and outputs is correct.
            # As per user script nn_2.py, the last layer must match the number of classes.
            if i == num_config_layers - 1:
                neurons = num_classes
                
            layer = Layer_Dense(
                current_input_dim, 
                neurons,
                weight_regularizer_l1=lc.weight_regularizer_l1,
                weight_regularizer_l2=lc.weight_regularizer_l2,
                bias_regularizer_l1=lc.bias_regularizer_l1,
                bias_regularizer_l2=lc.bias_regularizer_l2
            )
            layers.append(layer)
            
            # activation_class can be None for linear
            act_class = _get_activation_class(lc.activation, project_dir)
            activations.append(act_class() if act_class else None)
            
            current_input_dim = neurons

        # Check if loss is custom
        if config.loss.startswith("custom:"):
            _, file_name = config.loss.split(":", 1)
            LossClass = _load_custom_component(project_dir, "losses", file_name)
            loss_activation = LossClass()
        else:
            loss_activation = Softmax_Cross_Entropy_Combined()
            
        optimizer = _build_optimizer(config.optimizer, config.optimizer_params, project_dir)
        optimizer.set_parameters([layer for layer in layers if hasattr(layer, 'weights')])

        log_every = max(1, config.log_every)

        for epoch in range(config.epochs + 1):
            # ---- Forward pass ----
            # Logic matches user snippet:
            # dense1.forward -> activation1.forward -> dense2.forward -> loss_activation.forward
            
            current_vals = X_train
            
            # Forward through all layers EXCEPT the last one if it has Softmax
            for i in range(len(layers) - 1):
                layers[i].forward(current_vals)
                current_vals = layers[i].output
                if activations[i]:
                    activations[i].forward(current_vals)
                    current_vals = activations[i].output
            
            # Last Dense layer
            last_layer_idx = len(layers) - 1
            layers[last_layer_idx].forward(current_vals)
            
            # Final forward through combined activation/loss
            # This handles the Softmax activation internally.
            data_loss = loss_activation.forward(layers[last_layer_idx].output, y_train_flat)

            # Calculate Regularization Loss
            regularization_loss = 0
            for lyr in layers:
                if hasattr(loss_activation, 'regularization_loss'):
                    regularization_loss += loss_activation.regularization_loss(lyr)
                    
            loss = data_loss + regularization_loss

            # Metrics
            predictions = np.argmax(loss_activation.output, axis=1)
            accuracy = float(np.mean(predictions == y_train_flat))
            loss_val = float(loss)
            data_loss_val = float(data_loss)
            reg_loss_val = float(regularization_loss)

            lr = float(getattr(optimizer, 'current_learning_rate', 
                               getattr(optimizer, 'learning_rate', 0.0)))

            # ---- Backward pass ----
            # MUST happen before validation pass to avoid state clobbering
            loss_activation.backward(y_train_flat)
            dinputs = loss_activation.dinputs

            # Backprop through last Dense layer
            layers[last_layer_idx].backward(dinputs)
            dinputs = layers[last_layer_idx].dinputs

            # Backprop through remaining layers in reverse
            for i in range(len(layers) - 2, -1, -1):
                if activations[i]:
                    activations[i].backward(dinputs)
                    dinputs = activations[i].dinputs
                layers[i].backward(dinputs)
                dinputs = layers[i].dinputs

            # ---- Optimizer step ----
            optimizer.step()
            optimizer.zero_grad()

            if epoch % log_every == 0:
                # Validation Pass (Done after backward to not clobber state)
                current_val = X_val
                if len(X_val) > 0:
                    for i in range(len(layers) - 1):
                        layers[i].forward(current_val)
                        current_val = layers[i].output
                        if activations[i]:
                            activations[i].forward(current_val)
                            current_val = activations[i].output
                    
                    layers[last_layer_idx].forward(current_val)
                    val_data_loss = loss_activation.forward(layers[last_layer_idx].output, y_val_flat)
                    val_reg_loss = 0
                    for lyr in layers:
                        if hasattr(loss_activation, 'regularization_loss'):
                            val_reg_loss += loss_activation.regularization_loss(lyr)
                    val_loss = float(val_data_loss + val_reg_loss)
                    
                    val_predictions = np.argmax(loss_activation.output, axis=1)
                    val_accuracy = float(np.mean(val_predictions == y_val_flat))
                else:
                    val_loss = 0.0
                    val_accuracy = 0.0

                log_line = f"epoch: {epoch:>6} | acc: {accuracy:.4f} | loss: {loss_val:.4f} (val_acc: {val_accuracy:.4f}) | lr: {lr:.8f}"
                metric = {
                    "type": "metric",
                    "epoch": epoch,
                    "accuracy": accuracy,
                    "loss": loss_val,
                    "val_accuracy": val_accuracy,
                    "val_loss": val_loss,
                    "learning_rate": lr,
                    "log_line": log_line,
                    "total_epochs": config.epochs,
                }
                metrics_log.append({
                    "epoch": epoch,
                    "accuracy": accuracy,
                    "loss": loss_val,
                    "val_accuracy": val_accuracy,
                    "val_loss": val_loss,
                    "learning_rate": lr
                })
                asyncio.run_coroutine_threadsafe(queue.put(metric), loop).result()

                # Write logs to file incrementally
                with open(run_dir / "logs.txt", "a", encoding="utf-8") as lf:
                    lf.write(log_line + "\n")

            if epoch == config.epochs:
                break

        # ---- Test / Final Validation ----
        current_test = X_test
        if len(X_test) > 0:
            for i in range(len(layers) - 1):
                layers[i].forward(current_test)
                current_test = layers[i].output
                if activations[i]:
                    activations[i].forward(current_test)
                    current_test = activations[i].output
            layers[last_layer_idx].forward(current_test)
            test_loss = float(loss_activation.forward(layers[last_layer_idx].output, y_test_flat))
            test_predictions = np.argmax(loss_activation.output, axis=1)
            test_accuracy = float(np.mean(test_predictions == y_test_flat))
        else:
            test_loss = 0.0
            test_accuracy = 0.0

        # Export Model Weights
        model_state = {}
        for i, lyr in enumerate(layers):
            model_state[f'layer_{i}'] = {
                'weights': lyr.weights.tolist() if hasattr(lyr, 'weights') else None,
                'biases': lyr.biases.tolist() if hasattr(lyr, 'biases') else None
            }
        
        with open(run_dir / "model_weights.pt", "wb") as f:
            pickle.dump(model_state, f)

        # Update metadata.json with final stats
        metadata["final_accuracy"] = accuracy
        metadata["final_loss"] = loss_val
        metadata["test_accuracy"] = test_accuracy
        metadata["test_loss"] = test_loss
        with open(run_dir / "metadata.json", "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=4)

        # Save final metrics
        with open(run_dir / "metrics.json", "w", encoding="utf-8") as f:
            json.dump(metrics_log, f, indent=4)

        asyncio.run_coroutine_threadsafe(
            queue.put({"type": "done", "run_id": run_name, "message": f"Training complete! Saved to {run_name}"}), loop
        ).result()

    except Exception as e:
        import traceback
        traceback.print_exc()
        asyncio.run_coroutine_threadsafe(
            queue.put({"type": "error", "message": f"Service Error: {str(e)}"}), loop
        ).result()


def run_test_evaluation(project_name: str, run_id: str):
    """Evaluates a saved model's weights on the test data split."""
    try:
        project_dir = FSService.get_safe_path(project_name)
        run_dir = project_dir / "runs" / run_id
        
        if not run_dir.exists():
            return {"error": "Run not found"}
            
        # Load Config
        with open(run_dir / "config.json", "r") as f:
            config_dict = json.load(f)
        config = TrainingConfig(**config_dict)
        
        # Load Weights
        with open(run_dir / "model_weights.pt", "rb") as f:
            model_state = pickle.load(f)
            
        # Load Test Split
        ds_id = config.dataset if config.dataset not in AVAILABLE_DATASETS else f"PREDEFINED_{config.dataset}"
        X_test, y_test = _load_dataset_split(project_name, ds_id, "test", config.feature_names)
        
        if X_test is None:
            return {"error": "Test split not found"}
            
        import pandas as pd
        y_test_flat = y_test if len(y_test.shape) == 1 else np.argmax(y_test, axis=1)
        unique_labels = np.unique(y_test_flat)
        num_classes = len(unique_labels)

        # Reconstruct model from weights
        layers = []
        activations = []
        current_input_dim = config.input_features
        
        for i, lc in enumerate(config.layers):
            neurons = lc.neurons
            if i == len(config.layers) - 1:
                neurons = num_classes # Force last layer to match classes
                
            layer = Layer_Dense(current_input_dim, neurons)
            state = model_state.get(f'layer_{i}')
            if state:
                layer.weights = np.array(state['weights'])
                layer.biases = np.array(state['biases'])
            layers.append(layer)
            
            act_class = _get_activation_class(lc.activation, project_dir)
            activations.append(act_class() if act_class else None)
            current_input_dim = neurons

        loss_activation = Softmax_Cross_Entropy_Combined()
        
        # Forward pass on test data
        current_val = X_test
        for i in range(len(layers) - 1):
            layers[i].forward(current_val)
            current_val = layers[i].output
            if activations[i]:
                activations[i].forward(current_val)
                current_val = activations[i].output
        
        layers[-1].forward(current_val)
        test_loss = loss_activation.forward(layers[-1].output, y_test_flat)
        test_predictions = np.argmax(loss_activation.output, axis=1)
        test_accuracy = float(np.mean(test_predictions == y_test_flat))
        
        return {
            "test_accuracy": test_accuracy,
            "test_loss": float(test_loss),
            "samples": len(X_test)
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
