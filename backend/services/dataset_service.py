import os
import json
import pandas as pd
import numpy as np
from datetime import datetime
from services.fs_service import FSService
from typing import Optional
from pathlib import Path

class DatasetService:
    @staticmethod
    def get_datasets_dir(project_name="default"):
        """Returns the centralized datasets directory under the default project."""
        root_dir = FSService.get_root_dir()
        datasets_dir = root_dir / "default" / "dataset"
        datasets_dir.mkdir(parents=True, exist_ok=True)
        return datasets_dir

    @staticmethod
    def migrate_datasets_to_default_project():
        """Moves datasets from project-specific and global folders to default/dataset."""
        root_dir = FSService.get_root_dir()
        target_dir = root_dir / "default" / "dataset"
        target_dir.mkdir(parents=True, exist_ok=True)
        
        if not root_dir.exists():
            return
            
        # 1. Migrate from old global 'dataset' folder if it exists
        old_global_dir = root_dir / "dataset"
        if old_global_dir.exists() and old_global_dir != target_dir:
            for item in old_global_dir.iterdir():
                if item.is_dir():
                    dest = target_dir / item.name
                    if not dest.exists():
                        try:
                            import shutil
                            shutil.move(str(item), str(dest))
                        except Exception as e:
                            print(f"Failed to migrate global dataset {item}: {e}")
            # Clean up old global dir if empty
            try:
                if not any(old_global_dir.iterdir()):
                    old_global_dir.rmdir()
            except Exception: pass

        # 2. Migrate from other projects
        for project_item in root_dir.iterdir():
            if project_item.is_dir() and project_item.name != "default":
                project_ds_dir = project_item / "dataset"
                if project_ds_dir.exists():
                    for ds_item in project_ds_dir.iterdir():
                        if ds_item.is_dir():
                            dest = target_dir / ds_item.name
                            if not dest.exists():
                                try:
                                    import shutil
                                    shutil.move(str(ds_item), str(dest))
                                except Exception as e:
                                    print(f"Failed to migrate {ds_item}: {e}")
                            else:
                                # Already migrated or conflict
                                pass

    @staticmethod
    def process_upload(project_name, file_content: bytes, filename: str):
        ds_dir = DatasetService.get_datasets_dir(project_name)
        ds_id = filename.rsplit('.', 1)[0] + "_" + datetime.now().strftime("%Y%m%d%H%M%S")
        specific_ds_dir = ds_dir / ds_id
        specific_ds_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = specific_ds_dir / filename
        with open(file_path, "wb") as f:
            f.write(file_content)

        try:
            if filename.endswith(".csv"):
                df = pd.read_csv(file_path)
            elif filename.endswith(".json"):
                df = pd.read_json(file_path)
            else:
                return {"error": "Unsupported format"}
                
        except Exception as e:
            return {"error": f"Failed to parse file: {str(e)}"}

        metadata = DatasetService.generate_eda(df, filename, ds_id)
        
        # Physical 80/20 Split
        DatasetService.prepare_splits(specific_ds_dir, df, metadata)
        
        with open(specific_ds_dir / "metadata.json", "w") as f:
            json.dump(metadata, f, indent=4)

        return metadata

    @staticmethod
    def encode_categorical_columns(df: pd.DataFrame):
        """Convert string/object columns to integer categories. Returns df and mappings."""
        mappings = {}
        for col in df.columns:
            if df[col].dtype == 'object' or isinstance(df[col].iloc[0], str):
                # Only convert if it's a string
                col_data = df[col].astype('category')
                mappings[col] = {
                    "labels": list(col_data.cat.categories),
                    "mapping": {str(cat): i for i, cat in enumerate(col_data.cat.categories)}
                }
                df[col] = col_data.cat.codes
        return df, mappings

    @staticmethod
    def prepare_splits(ds_dir, df, metadata):
        """Physically split dataset into 80% train and 20% test folders."""
        train_dir = ds_dir / "train"
        test_dir = ds_dir / "test"
        train_dir.mkdir(exist_ok=True)
        test_dir.mkdir(exist_ok=True)

        # Encode if necessary
        df, mappings = DatasetService.encode_categorical_columns(df)
        if mappings:
            metadata["label_mappings"] = mappings

        # Shuffle
        df_shuffled = df.sample(frac=1, random_state=42).reset_index(drop=True)
        split_idx = int(len(df_shuffled) * 0.8)
        
        train_df = df_shuffled.iloc[:split_idx]
        test_df = df_shuffled.iloc[split_idx:]

        # Save as CSV for easy loading later
        train_df.to_csv(train_dir / "data.csv", index=False)
        test_df.to_csv(test_dir / "data.csv", index=False)
        
        metadata["has_splits"] = True
        return True

    @staticmethod
    def generate_eda(df: pd.DataFrame, file_name: str, ds_id: str):
        rows, cols = df.shape
        missing = int(df.isnull().sum().sum())
        duplicates = int(df.duplicated().sum())

        num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()

        # Try to infer target based on uniqueness or common naming
        target_col = None
        for col in df.columns:
            if col.lower() in ['target', 'label', 'class', 'y']:
                target_col = col
                break
                
        if not target_col and len(cat_cols) > 0:
            target_col = cat_cols[-1]
        elif not target_col:
            target_col = df.columns[-1]

        # Feature types
        feature_types = {}
        for col in df.columns:
            dt = str(df[col].dtype)
            if df[col].nunique() < 10:
                feature_types[col] = "categorical"
            elif "int" in dt or "float" in dt:
                feature_types[col] = "numerical"
            else:
                feature_types[col] = "text/other"

        # Statistical Summary (only for numeric to avoid errors and truncate output size)
        stats = {}
        for col in num_cols:
            desc = df[col].describe()
            # Handle NaN/Inf in stats
            stats[col] = {
                "mean": float(desc.get("mean", 0)) if not pd.isna(desc.get("mean")) else 0,
                "std": float(desc.get("std", 0)) if not pd.isna(desc.get("std")) else 0,
                "min": float(desc.get("min", 0)) if not pd.isna(desc.get("min")) else 0,
                "max": float(desc.get("max", 0)) if not pd.isna(desc.get("max")) else 0
            }

        # Correlation Matrix
        corr_matrix = {}
        if len(num_cols) > 1:
            try:
                # Replace NaN with 0 or drop them for JSON compliance
                corr_df = df[num_cols].corr().fillna(0)
                for c1 in num_cols:
                    corr_matrix[c1] = {c2: float(corr_df.loc[c1, c2]) for c2 in num_cols}
            except:
                pass

        # Target Distribution
        target_dist = {}
        problem_type = "classification"
        try:
            if target_col:
                if df[target_col].nunique() < 20: 
                    counts = df[target_col].value_counts()
                    target_dist = {str(k): int(v) for k, v in counts.items()}
                else:
                    problem_type = "regression"
                    # We might sample a histogram for regression, omitted for brevity
        except Exception:
            pass

        return {
            "id": ds_id,
            "name": file_name,
            "uploaded_at": datetime.now().isoformat(),
            "rows": rows,
            "columns": cols,
            "missing_values": missing,
            "duplicates": duplicates,
            "numerical_features": num_cols,
            "categorical_features": cat_cols,
            "target": target_col,
            "problem_type": problem_type,
            "assigned_project": None,
            "eda": {
                "stats": stats,
                "correlation": corr_matrix,
                "target_distribution": target_dist,
                "feature_types": feature_types
            }
        }

    @staticmethod
    def find_dataset_dir(dataset_id: str) -> Optional[Path]:
        """Locates the physical directory of a dataset in the global storage."""
        ds_dir = DatasetService.get_datasets_dir() / dataset_id
        if ds_dir.exists():
            return ds_dir
        return None

    @staticmethod
    def list_datasets(project_name="default"):
        """Lists datasets from global storage, filtered by assignment."""
        ds_dir = DatasetService.get_datasets_dir()
        
        datasets = []
        if ds_dir.exists():
            for d in ds_dir.iterdir():
                if d.is_dir():
                    meta_path = d / "metadata.json"
                    if meta_path.exists():
                        try:
                            with open(meta_path, "r") as f:
                                meta = json.load(f)
                                
                                assigned = meta.get("assigned_project")
                                
                                # Filtering logic:
                                if project_name == "all":
                                    pass
                                elif project_name == "default":
                                    # ONLY show datasets that are NOT assigned to any specific project
                                    if assigned is not None and assigned != "default" and assigned != "":
                                        continue
                                else:
                                    # ONLY show datasets assigned to THIS specific project
                                    if assigned != project_name:
                                        continue

                                # Map internal keys to frontend expectations
                                meta["features"] = meta.get("features_count", meta.get("columns", 0))
                                if "classes" not in meta and "eda" in meta and "target_distribution" in meta["eda"]:
                                    meta["classes"] = len(meta["eda"]["target_distribution"])
                                elif "classes" not in meta:
                                    meta["classes"] = 0
                                datasets.append(meta)
                        except:
                            pass
        return sorted(datasets, key=lambda x: x.get('uploaded_at', ''), reverse=True)

    @staticmethod
    def assign_to_project(dataset_id: str, project_name: Optional[str]):
        """Updates the assigned_project field in dataset metadata."""
        ds_dir = DatasetService.find_dataset_dir(dataset_id)
        if not ds_dir:
            raise FileNotFoundError(f"Dataset {dataset_id} not found")
            
        meta_path = ds_dir / "metadata.json"
        
        if not meta_path.exists():
            raise FileNotFoundError(f"Dataset {dataset_id} metadata not found")
            
        with open(meta_path, "r") as f:
            metadata = json.load(f)
            
        metadata["assigned_project"] = project_name
        
        with open(meta_path, "w") as f:
            json.dump(metadata, f, indent=4)
            
        return metadata

    @staticmethod
    def update_config(project_name, dataset_id, feature_cols, target_col):
        ds_dir = DatasetService.find_dataset_dir(dataset_id)
        if not ds_dir:
            raise FileNotFoundError("Dataset not found")
            
        meta_path = ds_dir / "metadata.json"
        
        if not meta_path.exists():
            raise FileNotFoundError("Dataset not found")
            
        with open(meta_path, "r") as f:
            metadata = json.load(f)
            
        metadata["selected_features"] = feature_cols
        metadata["target"] = target_col
        
        # update problem type dynamically
        try:
            if metadata["eda"]["feature_types"].get(target_col) == "categorical":
                metadata["problem_type"] = "classification"
            else:
                metadata["problem_type"] = "regression"
        except:
            pass

        with open(meta_path, "w") as f:
            json.dump(metadata, f, indent=4)
            
        return metadata

    @staticmethod
    def get_preview(project_name, dataset_id, n=5):
        """Return top n rows of the raw dataset as JSON records."""
        ds_dir = DatasetService.find_dataset_dir(dataset_id)
        if not ds_dir:
            raise FileNotFoundError("Dataset not found")

        # Find the original CSV/JSON
        csv_files = list(ds_dir.glob("*.csv"))
        json_files = list(ds_dir.glob("*.json"))
        # Exclude metadata.json
        json_files = [f for f in json_files if f.name != "metadata.json"]

        df = None
        if csv_files:
            df = pd.read_csv(csv_files[0])
        elif json_files:
            df = pd.read_json(json_files[0])
        
        if df is None:
            raise FileNotFoundError("No data file found in dataset directory")

        columns = df.columns.tolist()
        rows = df.head(n).to_dict(orient="records")
        # Sanitize NaN/Inf values for JSON
        for row in rows:
            for k, v in row.items():
                if isinstance(v, float) and (pd.isna(v) or np.isinf(v)):
                    row[k] = None
        return {"columns": columns, "rows": rows}

    @staticmethod
    def get_distributions(project_name, dataset_id, bins=20):
        """Compute histogram bin data for all numerical features."""
        ds_dir = DatasetService.find_dataset_dir(dataset_id)
        if not ds_dir:
            raise FileNotFoundError("Dataset not found")

        csv_files = list(ds_dir.glob("*.csv"))
        json_files = [f for f in ds_dir.glob("*.json") if f.name != "metadata.json"]

        df = None
        if csv_files:
            df = pd.read_csv(csv_files[0])
        elif json_files:
            df = pd.read_json(json_files[0])

        if df is None:
            raise FileNotFoundError("No data file found")

        num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        distributions = {}
        for col in num_cols:
            data = df[col].dropna().values
            if len(data) == 0:
                continue
            counts, bin_edges = np.histogram(data, bins=bins)
            distributions[col] = {
                "counts": counts.tolist(),
                "bin_edges": bin_edges.tolist(),
                "mean": float(np.mean(data)),
                "std": float(np.std(data)),
            }
        return distributions

    @staticmethod
    def refresh_eda(project_name, dataset_id):
        """Re-read the dataset file and regenerate EDA + metadata."""
        ds_dir = DatasetService.find_dataset_dir(dataset_id)
        if not ds_dir:
            raise FileNotFoundError("Dataset not found")

        meta_path = ds_dir / "metadata.json"
        old_meta = {}
        if meta_path.exists():
            with open(meta_path, "r") as f:
                old_meta = json.load(f)

        csv_files = list(ds_dir.glob("*.csv"))
        json_files = [f for f in ds_dir.glob("*.json") if f.name != "metadata.json"]

        df = None
        filename = ""
        if csv_files:
            df = pd.read_csv(csv_files[0])
            filename = csv_files[0].name
        elif json_files:
            df = pd.read_json(json_files[0])
            filename = json_files[0].name

        if df is None:
            raise FileNotFoundError("No data file found")

        new_meta = DatasetService.generate_eda(df, filename, dataset_id)
        # Preserve user selections from old metadata
        if "selected_features" in old_meta:
            new_meta["selected_features"] = old_meta["selected_features"]
        if "target" in old_meta and old_meta["target"]:
            new_meta["target"] = old_meta["target"]
        if "assigned_project" in old_meta:
            new_meta["assigned_project"] = old_meta["assigned_project"]

        # Re-split data
        DatasetService.prepare_splits(ds_dir, df, new_meta)

        with open(meta_path, "w") as f:
            json.dump(new_meta, f, indent=4)

        return new_meta

    @staticmethod
    def rename_dataset(project_name, dataset_id, new_name):
        """Rename the dataset file and update metadata."""
        ds_dir = DatasetService.find_dataset_dir(dataset_id)
        if not ds_dir:
            raise FileNotFoundError("Dataset not found")

        meta_path = ds_dir / "metadata.json"
        if not meta_path.exists():
            raise FileNotFoundError("Metadata not found")

        with open(meta_path, "r") as f:
            meta = json.load(f)

        old_filename = meta.get("name", "")
        if not old_filename:
            # Try to guess from files
            csvs = list(ds_dir.glob("*.csv"))
            if csvs: old_filename = csvs[0].name
            else:
                 jsons = [f for f in ds_dir.glob("*.json") if f.name != "metadata.json"]
                 if jsons: old_filename = jsons[0].name

        # Determine new filename extension
        ext = ".csv"
        if "." in old_filename:
            ext = "." + old_filename.rsplit(".", 1)[1]
        
        new_filename = new_name if new_name.endswith(ext) else new_name + ext
        
        # Rename physical file
        if old_filename and (ds_dir / old_filename).exists():
            (ds_dir / old_filename).rename(ds_dir / new_filename)
        
        # Update metadata
        meta["name"] = new_filename
        with open(meta_path, "w") as f:
            json.dump(meta, f, indent=4)
            
        return meta

    @staticmethod
    def list_notebooks(project_name, dataset_id):
        """List all .ipynb notebook files for a dataset."""
        ds_dir = DatasetService.find_dataset_dir(dataset_id)
        if not ds_dir:
            return []
        nb_dir = ds_dir / "notebooks"
        if not nb_dir.exists():
            return []
        notebooks = []
        for f in sorted(nb_dir.iterdir()):
            if f.is_file() and f.name.endswith(".ipynb"):
                stat = f.stat()
                notebooks.append({
                    "filename": f.name,
                    "size": stat.st_size,
                    "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                })
        return notebooks

    @staticmethod
    def create_notebook(project_name, dataset_id, name):
        """Create a new Jupyter notebook (.ipynb) with boilerplate for this dataset."""
        ds_dir = DatasetService.find_dataset_dir(dataset_id)
        if not ds_dir:
            raise FileNotFoundError("Dataset not found")
        nb_dir = ds_dir / "notebooks"
        nb_dir.mkdir(parents=True, exist_ok=True)

        # Find the dataset file for the import path
        csv_files = list(ds_dir.glob("*.csv"))
        data_file = csv_files[0].name if csv_files else "data.csv"

        safe_name = name if name.endswith(".ipynb") else name + ".ipynb"
        nb_path = nb_dir / safe_name

        if nb_path.exists():
            raise FileExistsError(f"Notebook '{safe_name}' already exists")

        # Create a proper .ipynb notebook structure
        notebook = {
            "nbformat": 4,
            "nbformat_minor": 5,
            "metadata": {
                "kernelspec": {
                    "display_name": "Python 3",
                    "language": "python",
                    "name": "python3"
                },
                "language_info": {
                    "name": "python",
                    "version": "3.10.0"
                }
            },
            "cells": [
                {
                    "cell_type": "markdown",
                    "metadata": {},
                    "source": [f"# Notebook: {name}\n", f"Dataset: `{data_file}`"]
                },
                {
                    "cell_type": "code",
                    "metadata": {},
                    "source": [
                        "import pandas as pd\n",
                        "import numpy as np\n",
                        "import os\n",
                        "\n",
                        f"# Load the dataset\n",
                        f"df = pd.read_csv(os.path.join('..', '{data_file}'))\n",
                        "df.head()"
                    ],
                    "execution_count": None,
                    "outputs": []
                }
            ]
        }

        with open(nb_path, "w", encoding="utf-8") as f:
            json.dump(notebook, f, indent=2)

        return {"filename": safe_name, "path": str(nb_path)}

    @staticmethod
    def get_notebook_path(project_name, dataset_id, filename):
        """Get the full path to a notebook file."""
        ds_dir = DatasetService.find_dataset_dir(dataset_id)
        if not ds_dir:
            raise FileNotFoundError("Dataset not found")
        nb_path = ds_dir / "notebooks" / filename
        if not nb_path.exists():
            raise FileNotFoundError(f"Notebook '{filename}' not found")
        return str(nb_path)

