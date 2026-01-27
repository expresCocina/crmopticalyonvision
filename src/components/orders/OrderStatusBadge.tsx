import { OrderStatus } from '@/hooks/useOrders'
import { cn } from '@/lib/utils'

interface OrderStatusBadgeProps {
    status: OrderStatus
    className?: string
}

const statusConfig = {
    pendiente: {
        label: 'Pendiente',
        color: 'bg-gray-100 text-gray-700 border-gray-300',
        icon: '⏳'
    },
    en_estudio: {
        label: 'En Estudio',
        color: 'bg-blue-100 text-blue-700 border-blue-300',
        icon: '🔍'
    },
    en_entrega: {
        label: 'En Entrega',
        color: 'bg-orange-100 text-orange-700 border-orange-300',
        icon: '🚚'
    },
    entregada: {
        label: 'Entregada',
        color: 'bg-green-100 text-green-700 border-green-300',
        icon: '✅'
    }
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
    const config = statusConfig[status]

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border',
                config.color,
                className
            )}
        >
            <span>{config.icon}</span>
            <span>{config.label}</span>
        </span>
    )
}
