import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { createProjectRunFromConfig } from '../services/api';

export default function SaveConfigDialog({ projectName, currentConfig, onSaveSuccess }) {
    const [isSaving, setIsSaving] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await createProjectRunFromConfig(projectName, currentConfig);
            setIsOpen(false);
            if (onSaveSuccess) onSaveSuccess();
        } catch (error) {
            console.error("Failed to save config", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 text-[13px] text-slate-600 border-slate-200 hover:bg-white active:scale-[0.98] flex-1">
                    <Save className="w-3.5 h-3.5 mr-2" />
                    Save Configuration
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Save Configuration Run</DialogTitle>
                    <DialogDescription>
                        This will create a new run folder for the <b>{projectName}</b> project with your current setup. This will NOT start a training session.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 text-slate-600 text-sm">
                    Are you sure you want to generate a new run? It will appear in your Run Dashboard without execution metrics.
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        {isSaving ? "Saving..." : "Create Run Folder"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
