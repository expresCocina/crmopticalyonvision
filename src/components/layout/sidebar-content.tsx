'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    MessageSquare,
    Users,
    Calendar,
    ClipboardList,
    ShoppingBag,
    BarChart3,
    Settings,
    Glasses
} from 'lucide-react'

export const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Pipeline de Ventas', href: '/pipeline', icon: Users },
    { label: 'Chat Center', href: '/chat', icon: MessageSquare },
    { label: 'Agenda', href: '/appointments', icon: Calendar },
    { label: 'Clínica', href: '/clinical', icon: ClipboardList },
    { label: 'Ventas', href: '/purchases', icon: ShoppingBag },
    { label: 'Marketing', href: '/marketing', icon: BarChart3 },
]

interface SidebarContentProps {
    onNavigate?: () => void
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
    const pathname = usePathname()

    return (
        <>
            {/* Branding Header */}
            <div className="h-16 flex items-center px-6 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <Glasses className="h-6 w-6 text-primary" />
                    <span className="font-bold text-lg tracking-tight">Lyon Visión</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onNavigate}
                            className={cn(
                                "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px]",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <item.icon className="h-5 w-5 flex-shrink-0" />
                            <span className="truncate">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>

            {/* Footer / Settings */}
            <div className="p-4 border-t border-white/10">
                <Link
                    href="/settings"
                    onClick={onNavigate}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 min-h-[44px]"
                >
                    <Settings className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate">Configuración</span>
                </Link>
            </div>
        </>
    )
}
