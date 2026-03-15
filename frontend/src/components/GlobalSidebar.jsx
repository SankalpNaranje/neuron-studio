import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    FolderOpen,
    Cpu,
    Settings,
    HelpCircle,
    Database
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GlobalSidebar() {
    return (
        <aside className="w-16 border-r bg-[#1b1e23] flex flex-col items-center py-4 shrink-0 transition-all duration-300">
            <div className="flex-1 flex flex-col items-center gap-4 w-full">
                <NavLink
                    to="/workspace"
                    className={({ isActive }) => cn(
                        "flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all relative group",
                        isActive ? "bg-white/10 text-orange-500" : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                    title="Workspace"
                >
                    {({ isActive }) => (
                        <React.Fragment>
                            <FolderOpen className="w-5 h-5" />
                            <span className="text-[10px] mt-1 font-medium scale-0 group-hover:scale-100 transition-transform origin-top">Workspace</span>
                            {/* Active indicator */}
                            <div className={cn(
                                "absolute left-0 w-1 bg-orange-500 h-8 rounded-r-full transition-opacity",
                                isActive ? "opacity-100" : "opacity-0"
                            )} />
                        </React.Fragment>
                    )}
                </NavLink>

                <NavLink
                    to="/compute"
                    className={({ isActive }) => cn(
                        "flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all relative group",
                        isActive ? "bg-white/10 text-orange-500" : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                    title="Compute"
                >
                    {({ isActive }) => (
                        <React.Fragment>
                            <Cpu className="w-5 h-5" />
                            <span className="text-[10px] mt-1 font-medium scale-0 group-hover:scale-100 transition-transform origin-top">Compute</span>
                            <div className={cn(
                                "absolute left-0 w-1 bg-orange-500 h-8 rounded-r-full transition-opacity",
                                isActive ? "opacity-100" : "opacity-0"
                            )} />
                        </React.Fragment>
                    )}
                </NavLink>

                <div className="w-8 h-[1px] bg-white/10 my-2" />

                <NavLink
                    to="/data"
                    className={({ isActive }) => cn(
                        "flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all relative group",
                        isActive ? "bg-white/10 text-orange-500" : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                    title="Data"
                >
                    {({ isActive }) => (
                        <React.Fragment>
                            <Database className="w-5 h-5" />
                            <span className="text-[10px] mt-1 font-medium scale-0 group-hover:scale-100 transition-transform origin-top">Data</span>
                            <div className={cn(
                                "absolute left-0 w-1 bg-orange-500 h-8 rounded-r-full transition-opacity",
                                isActive ? "opacity-100" : "opacity-0"
                            )} />
                        </React.Fragment>
                    )}
                </NavLink>
            </div>
        </aside>
    );
}
