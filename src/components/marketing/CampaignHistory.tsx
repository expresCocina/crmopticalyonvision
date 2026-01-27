'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Send, TrendingUp, Users } from 'lucide-react'
import { useCampaigns } from '@/hooks/useCampaigns'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function CampaignHistory() {
    const { campaigns, loading, getCampaignStats } = useCampaigns()
    const [stats, setStats] = useState<Record<string, any>>({})

    useEffect(() => {
        const loadStats = async () => {
            const newStats: Record<string, any> = {}
            for (const campaign of campaigns) {
                const campaignStats = await getCampaignStats(campaign.id)
                if (campaignStats) {
                    newStats[campaign.id] = campaignStats
                }
            }
            setStats(newStats)
        }

        if (campaigns.length > 0) {
            loadStats()
        }
    }, [campaigns, getCampaignStats])

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-2xl font-bold">Historial de Campañas</h2>
                <p className="text-sm text-muted-foreground">
                    Revisa el rendimiento de tus campañas anteriores
                </p>
            </div>

            {loading ? (
                <div className="text-center py-8 text-muted-foreground">Cargando historial...</div>
            ) : campaigns.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        No hay campañas enviadas aún. Crea tu primera campaña para comenzar.
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {campaigns.map((campaign) => {
                        const campaignStats = stats[campaign.id]

                        return (
                            <Card key={campaign.id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <CardTitle>{campaign.name}</CardTitle>
                                            <CardDescription className="flex items-center gap-2">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(campaign.created_at), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                                            </CardDescription>
                                        </div>
                                        <Badge variant="secondary">
                                            <Send className="h-3 w-3 mr-1" />
                                            {campaign.sent_count || 0} enviados
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Message Preview */}
                                    <div className="rounded-lg bg-muted p-3">
                                        <p className="text-sm text-muted-foreground mb-1">Mensaje:</p>
                                        <p className="text-sm line-clamp-3">{campaign.message_template}</p>
                                    </div>

                                    {/* Stats */}
                                    {campaignStats && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
                                                <Users className="h-4 w-4 text-blue-600 mb-1" />
                                                <span className="text-2xl font-bold text-blue-600">
                                                    {campaignStats.total}
                                                </span>
                                                <span className="text-xs text-blue-600">Total</span>
                                            </div>
                                            <div className="flex flex-col items-center p-3 bg-green-50 rounded-lg">
                                                <Send className="h-4 w-4 text-green-600 mb-1" />
                                                <span className="text-2xl font-bold text-green-600">
                                                    {campaignStats.sent}
                                                </span>
                                                <span className="text-xs text-green-600">Enviados</span>
                                            </div>
                                            <div className="flex flex-col items-center p-3 bg-purple-50 rounded-lg">
                                                <TrendingUp className="h-4 w-4 text-purple-600 mb-1" />
                                                <span className="text-2xl font-bold text-purple-600">
                                                    {campaignStats.delivered}
                                                </span>
                                                <span className="text-xs text-purple-600">Entregados</span>
                                            </div>
                                            <div className="flex flex-col items-center p-3 bg-orange-50 rounded-lg">
                                                <TrendingUp className="h-4 w-4 text-orange-600 mb-1" />
                                                <span className="text-2xl font-bold text-orange-600">
                                                    {campaignStats.read}
                                                </span>
                                                <span className="text-xs text-orange-600">Leídos</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Target Segment */}
                                    {campaign.target_status && campaign.target_status.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium">Segmentos objetivo:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {campaign.target_status.map((status) => (
                                                    <Badge key={status} variant="outline">
                                                        {status}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
