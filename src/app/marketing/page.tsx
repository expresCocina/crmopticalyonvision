'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TemplateManager } from '@/components/marketing/TemplateManager'
import { CampaignBuilder } from '@/components/marketing/CampaignBuilder'
import { CampaignHistory } from '@/components/marketing/CampaignHistory'
import { FileText, Send, History } from 'lucide-react'

export default function MarketingPage() {
    const [activeTab, setActiveTab] = useState('templates')

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Marketing</h1>
                <p className="text-muted-foreground">
                    Gestiona plantillas, crea campañas y analiza resultados
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                    <TabsTrigger value="templates" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="hidden sm:inline">Plantillas</span>
                    </TabsTrigger>
                    <TabsTrigger value="campaigns" className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        <span className="hidden sm:inline">Campañas</span>
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <History className="h-4 w-4" />
                        <span className="hidden sm:inline">Historial</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="templates" className="space-y-4">
                    <TemplateManager />
                </TabsContent>

                <TabsContent value="campaigns" className="space-y-4">
                    <CampaignBuilder />
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                    <CampaignHistory />
                </TabsContent>
            </Tabs>
        </div>
    )
}
