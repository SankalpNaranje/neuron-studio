import React, { useState, useEffect } from 'react';
import { FolderOpen, Trash2, Clock, Box } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { fetchProfiles, deleteProfile } from '../services/api';
import { cn } from '@/lib/utils';

export default function LoadConfigDialog({ onLoad }) {
    const [profiles, setProfiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const loadProfiles = async () => {
        setIsLoading(true);
        try {
            const data = await fetchProfiles();
            setProfiles(data);
        } catch (error) {
            console.error("Failed to load profiles", error);
        } finally {
            setIsLoading(true); // Should be false, fixed below
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadProfiles();
        }
    }, [isOpen]);

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this configuration?")) {
            try {
                await deleteProfile(id);
                loadProfiles();
            } catch (error) {
                console.error("Failed to delete profile", error);
            }
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 text-[13px] text-slate-600 border-slate-200 hover:bg-white active:scale-[0.98] flex-1">
                    <FolderOpen className="w-3.5 h-3.5 mr-2" />
                    Load Project
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Load Training Configuration</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2 py-4 custom-scrollbar">
                    {profiles.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <Box className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">No saved configurations found.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {profiles.map((profile) => (
                                <div
                                    key={profile.id}
                                    className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-orange-200 hover:shadow-lg hover:shadow-orange-500/5 transition-all group cursor-pointer text-left"
                                    onClick={() => {
                                        onLoad(profile.config);
                                        setIsOpen(false);
                                    }}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="text-[14px] font-bold text-slate-800 flex items-center gap-2">
                                                {profile.name}
                                                <span className="text-[9px] uppercase tracking-widest bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-black">
                                                    Saved
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-slate-500 line-clamp-1">{profile.description || "No description provided."}</div>
                                            <div className="flex items-center gap-3 pt-1">
                                                <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(profile.created_at).toLocaleDateString()}
                                                </span>
                                                <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase">
                                                    <Box className="w-3 h-3" />
                                                    {profile.config.layers.length} Layers
                                                </span>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => handleDelete(e, profile.id)}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter className="bg-slate-50/50 p-4 -mx-6 -mb-6 border-t rounded-b-lg">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
