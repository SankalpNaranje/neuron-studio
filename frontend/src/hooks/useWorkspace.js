import { useState, useEffect, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'neuron_studio_workspace_v2';
const ROOT_KEY = 'root';

const CATEGORIES = [
    { id: 'activations', label: 'Activations', icon: 'Zap' },
    { id: 'losses', label: 'Loss Functions', icon: 'Target' },
    { id: 'optimizers', label: 'Optimizers', icon: 'Settings2' },
    { id: 'custom_components', label: 'Custom Components', icon: 'Puzzle' }
];

const initialData = [
    {
        title: 'user.neuronstudio',
        key: ROOT_KEY,
        type: 'root',
        children: []
    }
];

export function useWorkspace() {
    const [treeData, setTreeData] = useState(initialData);
    const [isLoading, setIsLoading] = useState(true);

    const fetchTree = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch('http://localhost:8000/api/workspace/tree');
            if (res.ok) {
                const data = await res.json();
                setTreeData(data);
            }
        } catch (e) {
            console.error("Failed to fetch workspace tree:", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTree();
    }, [fetchTree]);

    const findNode = useCallback((key, nodes = treeData) => {
        for (const node of nodes) {
            if (node.key === key) return node;
            if (node.children) {
                const found = findNode(key, node.children);
                if (found) return found;
            }
        }
        return null;
    }, [treeData]);

    const addProject = useCallback(async (name) => {
        try {
            const res = await fetch('http://localhost:8000/api/workspace/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (res.ok) {
                const data = await res.json();
                await fetchTree(); // Refresh tree from server
                return data.key;
            } else {
                const errorData = await res.json();
                alert(`Error creating project: ${errorData.detail}`);
            }
        } catch (e) {
            console.error("Failed to create project:", e);
        }
        return null;
    }, [fetchTree]);

    const addFile = useCallback(async (parentKey, title, content = '', isNeuroCode = false) => {
        // Default to .py for NeuroCode if no extension provided
        const defaultExt = isNeuroCode ? 'py' : 'js';
        const extension = title.includes('.') ? title.split('.').pop() : defaultExt;
        const name = title.includes('.') ? title : `${title}.${extension}`;

        try {
            const res = await fetch('http://localhost:8000/api/workspace/files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parent_path: parentKey, name, content })
            });
            if (res.ok) {
                const data = await res.json();
                await fetchTree();
                return data.key;
            } else {
                const errorData = await res.json();
                alert(`Error adding file: ${errorData.detail}`);
            }
        } catch (e) {
            console.error("Failed to create file:", e);
        }
        return null;
    }, [fetchTree]);

    const renameNode = useCallback(async (key, newTitle) => {
        try {
            const res = await fetch('http://localhost:8000/api/workspace/rename', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: key, new_name: newTitle })
            });
            if (res.ok) {
                await fetchTree();
            } else {
                const errorData = await res.json();
                alert(`Error renaming: ${errorData.detail}`);
            }
        } catch (e) {
            console.error("Failed to rename node:", e);
        }
    }, [fetchTree]);

    const updateFileContent = useCallback(async (fileKey, content) => {
        try {
            // Optimistic update
            setTreeData(prev => {
                const newData = JSON.parse(JSON.stringify(prev));
                const updateNode = (nodes) => {
                    for (const node of nodes) {
                        if (node.key === fileKey) {
                            node.content = content;
                            node.lastModified = new Date().toISOString();
                            return true;
                        }
                        if (node.children && updateNode(node.children)) return true;
                    }
                    return false;
                };
                updateNode(newData);
                return newData;
            });

            const res = await fetch('http://localhost:8000/api/workspace/files', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_path: fileKey, content })
            });
            if (!res.ok) {
                const errorData = await res.json();
                console.error(`Error saving file: ${errorData.detail}`);
                await fetchTree(); // Revert optimistic update
            }
        } catch (e) {
            console.error("Failed to save file content:", e);
        }
    }, [fetchTree]);

    const deleteNode = useCallback(async (key) => {
        if (key === ROOT_KEY) return;
        try {
            const res = await fetch('http://localhost:8000/api/workspace/nodes', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: key })
            });
            if (res.ok) {
                await fetchTree();
            } else {
                const errorData = await res.json();
                alert(`Error deleting: ${errorData.detail}`);
            }
        } catch (e) {
            console.error("Failed to delete node:", e);
        }
    }, [fetchTree]);

    const getMetadata = useCallback((key) => {
        const node = findNode(key);
        if (!node) return null;

        const stats = {
            name: node.title,
            type: node.type,
            lastModified: node.lastModified || 'Just now',
            count: 0,
            subStats: {}
        };

        if (node.type === 'root') {
            stats.count = node.children?.length || 0;
            stats.label = 'Projects';
        } else if (node.type === 'project') {
            node.children?.forEach(cat => {
                stats.subStats[cat.title] = cat.children?.length || 0;
            });
            stats.label = 'Categories';
        } else if (node.type === 'category') {
            stats.count = node.children?.length || 0;
            stats.label = 'Files';
        } else if (node.type === 'file') {
            stats.label = 'Language';
            stats.count = node.extension?.toUpperCase() || 'JS';
        }

        return stats;
    }, [findNode]);

    const getPath = useCallback((key) => {
        const path = [];
        const trace = (nodes, currentPath) => {
            for (const node of nodes) {
                if (node.key === key) {
                    path.push(...currentPath, node);
                    return true;
                }
                if (node.children && trace(node.children, [...currentPath, node])) {
                    return true;
                }
            }
            return false;
        }
        trace(treeData, []);
        return path;
    }, [treeData]);

    return {
        treeData,
        isLoading,
        addProject,
        addFile,
        renameNode,
        updateFileContent,
        deleteNode,
        getMetadata,
        getPath,
        findNode,
        rootKey: ROOT_KEY
    };
}
