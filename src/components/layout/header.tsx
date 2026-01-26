'use client'

import React, { useState, useEffect } from 'react'
import { Menu, LogOut, User as UserIcon } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { SidebarContent } from './sidebar-content'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'

export function Header() {
    const [open, setOpen] = useState(false)
    const [user, setUser] = useState<User | null>(null)
    const [userRole, setUserRole] = useState<string>('')
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)

            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, full_name')
                    .eq('id', user.id)
                    .single()

                if (profile) {
                    setUserRole(profile.role)
                }
            }
        }
        getUser()
    }, [supabase])

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) {
            toast.error('Error al cerrar sesión')
        } else {
            toast.success('Sesión cerrada')
            router.push('/login')
            router.refresh()
        }
    }

    return (
        <header className="h-14 md:h-16 bg-background border-b border-border flex items-center justify-between px-3 md:px-6 sticky top-0 z-40">
            <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                {/* Mobile Menu */}
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="md:hidden flex-shrink-0">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Abrir menú</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64 p-0 bg-secondary text-secondary-foreground">
                        <div className="h-full flex flex-col">
                            <SidebarContent onNavigate={() => setOpen(false)} />
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Page Title */}
                <h1 className="text-base md:text-xl font-semibold text-foreground truncate">
                    CRM Lyon Visión
                </h1>
            </div>

            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                {/* User Info - Desktop only */}
                {user && (
                    <div className="hidden md:flex flex-col items-end mr-2">
                        <span className="text-xs font-medium text-foreground">
                            {user.email?.split('@')[0]}
                        </span>
                        <span className="text-[10px] text-muted-foreground capitalize">
                            {userRole}
                        </span>
                    </div>
                )}

                {/* User Avatar */}
                <div className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                    <UserIcon className="h-4 w-4" />
                </div>

                {/* Logout Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="flex-shrink-0"
                    title="Cerrar sesión"
                >
                    <LogOut className="h-4 w-4 md:h-5 md:w-5" />
                    <span className="sr-only">Cerrar sesión</span>
                </Button>
            </div>
        </header>
    )
}
