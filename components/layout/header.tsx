"use client";

import { Menu, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSidebarStore } from "./sidebar-store";
import { NewAppointmentDialog } from "@/components/appointments/new-appointment-dialog";
import { NotificationBell } from "@/components/notifications/notification-bell";

interface HeaderProps {
    onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
    const { toggle } = useSidebarStore();

    return (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40">
            <button
                onClick={toggle}
                className="lg:hidden text-slate-500 hover:text-slate-700 p-2 -ml-2 transition-colors"
                aria-label="Abrir menu"
            >
                <Menu size={24} />
            </button>

            <div className="flex-1 max-w-xl ml-4 lg:ml-0">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-slate-400" />
                    </div>
                    <Input
                        type="text"
                        placeholder="Buscar pacientes, prontuários..."
                        className="pl-11 pr-4 py-2.5 bg-slate-50 border-slate-200 focus-visible:ring-brand-500 focus-visible:ring-2"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3 ml-4">
                <NotificationBell />
                <NewAppointmentDialog
                    className="hidden sm:flex items-center gap-1 bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
                />
            </div>
        </header>
    );
}
