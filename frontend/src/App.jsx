import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import GlobalSidebar from './components/GlobalSidebar';
import WorkspaceView from './components/WorkspaceView';
import ComputeView from './components/ComputeView';
import DataView from './components/DataView';
import { cn } from '@/lib/utils';

export default function App() {
  const [backendStatus, setBackendStatus] = React.useState('checking');

  React.useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/health');
        if (res.ok) {
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }
      } catch (e) {
        setBackendStatus('offline');
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen w-full bg-white text-slate-900 antialiased overflow-hidden font-sans">
      <GlobalSidebar />
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <header className="flex items-center justify-between h-12 px-4 border-b bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="Neuron Studio Logo" className="w-9 h-9 object-contain" />
              <span className="text-[14px] font-semibold tracking-tight text-slate-800">
                Neuron<span className="text-orange-600 ml-0.5">Studio</span>
              </span>
            </div>
            <div className="h-4 w-[1px] bg-slate-200" />
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-widest">
              Intelligence from Scratch
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-md border border-slate-100">
              <div className={cn(
                "w-2 h-2 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]",
                backendStatus === 'online' ? "bg-green-500 shadow-green-500/40" : "bg-red-500 shadow-red-500/40"
              )} />
              <span className="text-[11px] font-semibold text-slate-600">
                {backendStatus === 'online' ? 'Backend UP' : 'Backend Offline'}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 relative overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/workspace" replace />} />
            <Route path="/workspace" element={<WorkspaceView />} />
            <Route path="/compute" element={<ComputeView />} />
            <Route path="/data" element={<DataView />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
