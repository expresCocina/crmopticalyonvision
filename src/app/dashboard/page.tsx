'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, DollarSign, MessageSquare, ShoppingBag } from 'lucide-react'
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics"

export default function DashboardPage() {
    const { totalSales, newLeads, activeChats, pendingDeliveries } = useDashboardMetrics()

    // Format currency
    const formattedSales = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(totalSales)

    return (
        <div className="space-y-4 md:space-y-6">
            {/* KPI Cards - Responsive Grid */}
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Ventas Totales (Mes)
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl md:text-2xl font-bold">{formattedSales}</div>
                        <p className="text-xs text-muted-foreground">
                            Actualizado en tiempo real
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Leads Nuevos
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-xl md:text-2xl font-bold ${newLeads > 0 ? 'text-green-600' : ''}`}>
                            +{newLeads}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Potenciales clientes sin contactar
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Consultas Activas
                        </CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-xl md:text-2xl font-bold ${activeChats > 0 ? 'text-blue-600' : ''}`}>
                            {activeChats}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Mensajes recientes
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Pendientes Entrega
                        </CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-xl md:text-2xl font-bold ${pendingDeliveries > 0 ? 'text-orange-600' : ''}`}>
                            {pendingDeliveries}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Órdenes pagadas no entregadas
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section - Stack on Mobile */}
            <div className="grid gap-3 md:gap-4 grid-cols-1 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle className="text-base md:text-lg">Resumen de Ventas</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[200px] md:h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                            Gráfico de Ventas (Recharts / Tremor)
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="text-base md:text-lg">Actividad Reciente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center">
                                <div className="ml-4 space-y-1 flex-1 min-w-0">
                                    <p className="text-sm font-medium leading-none truncate">Juan Pérez</p>
                                    <p className="text-xs text-muted-foreground truncate">Nuevo Lead - WhatsApp</p>
                                </div>
                                <div className="ml-auto font-medium text-xs text-muted-foreground flex-shrink-0">Hace 2m</div>
                            </div>
                            <div className="flex items-center">
                                <div className="ml-4 space-y-1 flex-1 min-w-0">
                                    <p className="text-sm font-medium leading-none truncate">Maria Gomez</p>
                                    <p className="text-xs text-muted-foreground truncate">Compra finalizada</p>
                                </div>
                                <div className="ml-auto font-medium text-xs text-primary flex-shrink-0">+ $450,000</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
