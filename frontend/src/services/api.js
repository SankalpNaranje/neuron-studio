const API_BASE = 'http://localhost:8000/api';
const WS_BASE = 'ws://localhost:8000/api';

export const fetchConfig = async (projectName) => {
    const res = await fetch(`${API_BASE}/config?project_name=${projectName || 'default'}`);
    if (!res.ok) throw new Error('Failed to fetch config');
    return res.json();
};

export const createTrainingSession = async (config) => {
    const res = await fetch(`${API_BASE}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error('Failed to create training session');
    return res.json();
};

export const evaluateTest = async (projectName, runId) => {
    const res = await fetch(`${API_BASE}/evaluate/test/${projectName}/${runId}`);
    if (!res.ok) throw new Error('Failed to evaluate test data');
    return res.json();
};

export class TrainingWebSocket {
    constructor(sessionId, config, onMetric, onDone, onError) {
        this.ws = new WebSocket(`${WS_BASE}/ws/train/${sessionId}`);
        this.ws.onopen = () => {
            this.ws.send(JSON.stringify(config));
        };
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'metric') onMetric(data);
            else if (data.type === 'done') onDone(data);
            else if (data.type === 'error') onError(data);
        };
        this.ws.onerror = (e) => onError({ message: 'WebSocket connection failed' });
        this.ws.onclose = () => { };
    }
    close() {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.close();
        }
    }
}

// --- Storage API ---

export const saveProjectConfig = async (projectName, config) => {
    const res = await fetch(`${API_BASE}/workspace/projects/${projectName}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
    });
    if (!res.ok) throw new Error('Failed to save project configuration');
    return res.json();
};

export const saveRun = async (projectName, runId) => {
    const res = await fetch(`${API_BASE}/workspace/projects/${projectName}/runs/${runId}/save`, {
        method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to save run model state');
    return res.json();
};

export const createProjectRunFromConfig = async (projectName, config) => {
    const res = await fetch(`${API_BASE}/workspace/projects/${projectName}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
    });
    if (!res.ok) throw new Error('Failed to create run from config');
    return res.json();
};

export const getDownloadModelUrl = (projectName, runId) => {
    return `${API_BASE}/download/${projectName}/${runId}`;
};

// --- Dataset Analysis API ---

export const fetchDatasetPreview = async (projectName, datasetId, n = 5) => {
    const res = await fetch(`${API_BASE}/datasets/${projectName}/${datasetId}/preview?n=${n}`);
    if (!res.ok) throw new Error('Failed to fetch dataset preview');
    return res.json();
};

export const fetchDatasetDistributions = async (projectName, datasetId) => {
    const res = await fetch(`${API_BASE}/datasets/${projectName}/${datasetId}/distributions`);
    if (!res.ok) throw new Error('Failed to fetch distributions');
    return res.json();
};

export const refreshDatasetEda = async (projectName, datasetId) => {
    const res = await fetch(`${API_BASE}/datasets/${projectName}/${datasetId}/refresh-eda`, {
        method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to refresh EDA');
    return res.json();
};

export const renameDataset = async (projectName, datasetId, newName) => {
    const res = await fetch(`${API_BASE}/datasets/${projectName}/${datasetId}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_name: newName }),
    });
    if (!res.ok) throw new Error('Failed to rename dataset');
    return res.json();
};

export const assignDatasetToProject = async (projectName, datasetId, targetProject) => {
    // targetProject is "default" or a project name
    const response = await fetch(`${API_BASE}/datasets/${projectName}/${datasetId}/assign?target_project=${targetProject}`, {
        method: 'PUT',
    });
    if (!response.ok) throw new Error('Failed to assign dataset');
    return response.json();
};

// --- Notebook API ---

export const fetchNotebooks = async (projectName, datasetId) => {
    const res = await fetch(`${API_BASE}/datasets/${projectName}/${datasetId}/notebooks`);
    if (!res.ok) throw new Error('Failed to fetch notebooks');
    return res.json();
};

export const createNotebook = async (projectName, datasetId, name) => {
    const res = await fetch(`${API_BASE}/datasets/${projectName}/${datasetId}/notebooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to create notebook');
    }
    return res.json();
};

export const getNotebookUrl = async (projectName, datasetId, filename) => {
    const res = await fetch(`${API_BASE}/jupyter/notebook-url/${projectName}/${datasetId}/${filename}`);
    if (!res.ok) throw new Error('Failed to get notebook URL');
    return res.json();
};

// --- Jupyter Server API ---

export const getJupyterStatus = async () => {
    const res = await fetch(`${API_BASE}/jupyter/status`);
    if (!res.ok) throw new Error('Failed to get Jupyter status');
    return res.json();
};

export const startJupyter = async () => {
    const res = await fetch(`${API_BASE}/jupyter/start`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to start Jupyter');
    return res.json();
};

export const stopJupyter = async () => {
    const res = await fetch(`${API_BASE}/jupyter/stop`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to stop Jupyter');
    return res.json();
};

