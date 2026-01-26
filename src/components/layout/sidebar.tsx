'use client'

import React from 'react'
import { SidebarContent } from './sidebar-content'

export function Sidebar() {
    return (
        <aside className="hidden md:flex w-64 bg-secondary text-secondary-foreground h-screen flex-col border-r border-border sticky top-0">
            <SidebarContent />
        </aside>
    )
}
