'use client'

import React from 'react'
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

const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Pipeline de Ventas', href: '/pipeline', icon: Users },
    { label: 'Chat Center', href: '/chat', icon: MessageSquare },
    { label: 'Agenda', href: '/appointments', icon: Calendar },
    { label: 'Clínica', href: '/clinical', icon: ClipboardList },
    { label: 'Ventas', href: '/purchases', icon: ShoppingBag },
    { label: 'Marketing', href: '/marketing', icon: BarChart3 },
]

export function Sidebar() {
    const pathname = usePathname()

    return (
        <aside className="w-64 bg-secondary text-secondary-foreground h-screen flex flex-col border-r border-border">
            {/* Branding Header */}
            <div className="h-16 flex items-center px-6 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <Glasses className="h-6 w-6 text-primary" />
                    <span className="font-bold text-lg tracking-tight">Lyon Visión</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            {/* Footer / Settings */}
            <div className="p-4 border-t border-white/10">
                <Link
                    href="/settings"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5"
                >
                    <Settings className="h-4 w-4" />
                    Configuración
                </Link>
            </div>
        </aside>
    )
}
