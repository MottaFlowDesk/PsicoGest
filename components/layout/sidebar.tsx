"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Calendar,
    CalendarClock,
    Settings,
    LogOut,
    FileText,
    DollarSign,
    BrainCircuit,
    X,
    BarChart3,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "./sidebar-store";

interface SidebarProps {
    userName: string;
    userAvatar?: string | null;
}

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Pacientes", href: "/dashboard/patients", icon: Users },
    { name: "Calendário", href: "/dashboard/calendar", icon: Calendar },
    { name: "Sessões", href: "/dashboard/appointments", icon: CalendarClock },
    { name: "Financeiro", href: "/dashboard/financial", icon: DollarSign },
    { name: "Prontuários", href: "/dashboard/medical-records", icon: FileText },
    { name: "Relatórios", href: "/dashboard/reports", icon: BarChart3 },
];

const secondaryNavigation = [
    { name: "Configurações", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar({ userName, userAvatar }: SidebarProps) {
    const pathname = usePathname();
    const { isOpen, close } = useSidebarStore();

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
                    onClick={close}
                />
            )}

            <aside className={cn(
                "fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b border-slate-100 justify-between">
                    <Link href="/dashboard" className="flex items-center gap-2 text-brand-600" onClick={close}>
                        <BrainCircuit size={28} />
                        <span className="font-bold text-xl tracking-tight text-slate-800">PsicoGest</span>
                    </Link>
                    {/* Close Button for Mobile */}
                    <button onClick={close} className="lg:hidden text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href !== "/dashboard" && pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={close}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-brand-50 text-brand-700"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <item.icon size={20} className="shrink-0" />
                                {item.name}
                            </Link>
                        );
                    })}

                    <div className="pt-6 pb-2">
                        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Sistema
                        </p>
                    </div>

                    {secondaryNavigation.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href);

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={close}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-brand-50 text-brand-700"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <item.icon size={20} className="shrink-0" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Profile */}
                <div className="p-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <Avatar className="h-9 w-9 ring-2 ring-white shadow-sm">
                            <AvatarImage src={userAvatar || undefined} alt={userName} className="object-cover" />
                            <AvatarFallback className="bg-brand-100 text-brand-700 font-semibold text-sm">
                                {getInitials(userName)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{userName}</p>
                            <p className="text-xs text-slate-500 truncate">Profissional</p>
                        </div>
                    </div>

                    <form action="/api/auth/signout" method="post">
                        <button
                            type="submit"
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <LogOut size={18} />
                            Sair do Sistema
                        </button>
                    </form>
                </div>
            </aside>
        </>
    );
}
