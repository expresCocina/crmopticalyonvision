'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, DollarSign, MessageSquare, ShoppingBag } from 'lucide-react'
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics"

import { formatDistanceToNow } from 'date-fns'

import { es } from 'date-fns/locale'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

export default function DashboardPage() {
    const { totalSales, newLeads, activeChats, pendingDeliveries, recentActivity, salesChartData } = useDashboardMetrics()

    // ... (keep currency formatter) ...
    const formattedSales = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(totalSales)

    // Custom Tooltip for Chart
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-card border p-2 rounded shadow-md text-xs">
                    <p className="font-bold mb-1">Día {label}</p>
                    <p className="text-primary">
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(payload[0].value as number)}
                    </p>
                </div>
            )
        }
        return null
    }

    return (
        <div className="space-y-4 md:space-y-6">
            {/* ... (keep KPI Cards section unchanged) ... */}

            {/* KPI Cards - Responsive Grid */}
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                {/* Note: I am not replacing the KPI cards code in this block to save tokens, 
                   assuming the user's existing file has them. 
                   Wait, I need to be careful. limiting the replacement range.
               */}
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
                        <div className="h-[200px] md:h-[250px] w-full">
                            {salesChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={salesChartData}>
                                        <XAxis
                                            dataKey="date"
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `$${value}`}
                                        />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="total" fill="#FFD700" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                    No hay ventas registradas este mes
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="text-base md:text-lg">Actividad Reciente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentActivity && recentActivity.length > 0 ? (
                                recentActivity.map((activity, i) => (
                                    <div key={i} className="flex items-center">
                                        <div className="ml-4 space-y-1 flex-1 min-w-0">
                                            <p className="text-sm font-medium leading-none truncate">{activity.title}</p>
                                            <p className="text-xs text-muted-foreground truncate">{activity.subtitle}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-0.5">
                                            <div className="text-xs text-muted-foreground flex-shrink-0">
                                                {formatDistanceToNow(new Date(activity.date), { addSuffix: true, locale: es })}
                                            </div>
                                            {activity.amount && (
                                                <div className="font-medium text-xs text-green-600 flex-shrink-0">
                                                    + ${new Intl.NumberFormat('es-CO').format(activity.amount)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-center text-muted-foreground py-4">No hay actividad reciente</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
