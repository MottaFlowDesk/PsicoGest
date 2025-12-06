"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Calendar,
    CalendarClock,
    Settings,
    User,
    LogOut,
    FileText,
    DollarSign // [NEW] Imported
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface SidebarProps {
    userName: string;
    userAvatar?: string | null;
}

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Pacientes", href: "/dashboard/patients", icon: Users },
    { name: "Agendamentos", href: "/dashboard/appointments", icon: CalendarClock },
    { name: "Calendário", href: "/dashboard/calendar", icon: Calendar },
    { name: "Financeiro", href: "/dashboard/financial", icon: DollarSign }, // [NEW] Added
];

const secondaryNavigation = [
    { name: "Perfil", href: "/dashboard/profile", icon: User },
    { name: "Configurações", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar({ userName, userAvatar }: SidebarProps) {
    const pathname = usePathname();

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
            {/* Logo */}
            <div className="p-6">
                <Link href="/dashboard" className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-600 rounded-lg flex items-center justify-center">
                        <FileText className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-slate-900">PsicoGest</span>
                </Link>
            </div>

            <Separator />

            {/* Main Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {navigation.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== "/dashboard" && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-brand-50 text-brand-700"
                                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <item.icon className={cn(
                                "h-5 w-5",
                                isActive ? "text-brand-600" : "text-slate-400"
                            )} />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <Separator />

            {/* Secondary Navigation */}
            <nav className="px-3 py-4 space-y-1">
                {secondaryNavigation.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-brand-50 text-brand-700"
                                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <item.icon className={cn(
                                "h-5 w-5",
                                isActive ? "text-brand-600" : "text-slate-400"
                            )} />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <Separator />

            {/* User Profile */}
            <div className="p-4">
                <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={userAvatar || undefined} alt={userName} />
                        <AvatarFallback className="bg-brand-100 text-brand-700 font-semibold">
                            {getInitials(userName)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                            {userName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                            Profissional
                        </p>
                    </div>
                    <form action="/api/auth/signout" method="post">
                        <button
                            type="submit"
                            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                            title="Sair"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </form>
                </div>
            </div>
        </aside>
    );
}
