'use client'

import React, { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { SidebarContent } from './sidebar-content'

export function Header() {
    const [open, setOpen] = useState(false)

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

            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                {/* User Profile */}
                <div className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                    AD
                </div>
            </div>
        </header>
    )
}
