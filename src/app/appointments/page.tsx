'use client'

import { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { useAppointments } from "@/hooks/useAppointments"
import { Loader2, Plus, Clock, User } from "lucide-react"
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { AppointmentForm } from "@/components/appointments/AppointmentForm"

export default function AppointmentsPage() {
    const { appointments, loading } = useAppointments()
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    // Simple Weekly Calendar Logic
    const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 })
    const weekDays = Array.from({ length: 6 }).map((_, i) => addDays(startDate, i))

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col space-y-3 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight">Agenda de Citas</h2>
                    <p className="text-sm text-muted-foreground">
                        {format(selectedDate, "MMMM yyyy", { locale: es })}
                    </p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <button className="w-full sm:w-auto bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity min-h-[44px]">
                            <Plus className="h-4 w-4" />
                            Nueva Cita
                        </button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
                        <AppointmentForm onSuccess={() => setIsDialogOpen(false)} />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Week Grid - Responsive */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4 h-full overflow-hidden">
                {weekDays.map((date) => {
                    const dayAppointments = appointments.filter(app =>
                        isSameDay(parseISO(app.scheduled_at), date)
                    )
                    const isToday = isSameDay(date, new Date())

                    return (
                        <div key={date.toString()} className={`flex flex-col h-full min-h-[200px] md:min-h-0 rounded-xl border ${isToday ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
                            <div className={`p-2 md:p-3 text-center border-b ${isToday ? 'border-primary/20' : 'border-border'}`}>
                                <div className="text-xs font-medium text-muted-foreground uppercase">
                                    {format(date, 'EEE', { locale: es })}
                                </div>
                                <div className={`text-lg md:text-xl font-bold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                                    {format(date, 'd')}
                                </div>
                            </div>

                            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                                {dayAppointments.length === 0 && (
                                    <div className="h-20 flex items-center justify-center text-xs text-muted-foreground/50 italic">
                                        Sin citas
                                    </div>
                                )}

                                {dayAppointments.map((app) => (
                                    <Card key={app.id} className="shadow-sm border-l-4 border-l-primary hover:shadow-md transition-all cursor-pointer group">
                                        <CardContent className="p-2 space-y-1">
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                                                <Clock className="h-3 w-3" />
                                                {format(parseISO(app.scheduled_at), 'HH:mm')}
                                            </div>
                                            <div className="font-medium text-xs md:text-sm truncate leading-tight">
                                                {/* @ts-ignore join */}
                                                {app.leads?.full_name || 'Prospecto'}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {/* @ts-ignore join */}
                                                {app.leads?.wa_id}
                                            </div>
                                            <div className="pt-1 flex flex-wrap gap-1">
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${app.status === 'confirmada' ? 'bg-green-100 text-green-700 border-green-200' :
                                                        app.status === 'pendiente' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                                            'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {app.status}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
