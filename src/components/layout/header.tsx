'use client'

import React from 'react'

export function Header() {
    return (
        <header className="h-16 bg-background border-b border-border flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
                {/* Placeholder for Breadcrumbs or Page Title */}
                <h1 className="text-xl font-semibold text-foreground">
                    Dashboard
                </h1>
            </div>

            <div className="flex items-center gap-4">
                {/* User Profile / Notifications Placeholder */}
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary">
                    AD
                </div>
            </div>
        </header>
    )
}
