import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export type OrderStatus = 'pendiente' | 'en_estudio' | 'en_entrega' | 'entregada'

export interface Order {
    id: string
    lead_id: string
    product_summary: string | null
    amount: number
    currency: string
    status: string
    order_status: OrderStatus
    delivery_notes: string | null
    delivered_at: string | null
    delivery_date: string | null
    is_delivered: boolean
    created_at: string
    leads: {
        full_name: string | null
        wa_id: string
    } | null
}

export function useOrders() {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const fetchOrders = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('purchases')
            .select(`
                *,
                leads (
                    full_name,
                    wa_id
                )
            `)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching orders:', error)
            toast.error('Error al cargar órdenes')
        } else {
            setOrders(data as Order[])
        }
        setLoading(false)
    }

    const updateOrderStatus = async (orderId: string, newStatus: OrderStatus, notes?: string) => {
        const updateData: any = {
            order_status: newStatus
        }

        if (notes) {
            updateData.delivery_notes = notes
        }

        const { error } = await supabase
            .from('purchases')
            .update(updateData)
            .eq('id', orderId)

        if (error) {
            console.error('Error updating order status:', error)
            toast.error('Error al actualizar estado de orden')
            return false
        }

        toast.success('Estado de orden actualizado')

        // If marked as delivered, send WhatsApp notification
        if (newStatus === 'entregada') {
            await sendDeliveryNotification(orderId)
        }

        await fetchOrders()
        return true
    }

    const sendDeliveryNotification = async (orderId: string) => {
        try {
            // Get order details
            const order = orders.find(o => o.id === orderId)
            if (!order || !order.leads) return

            // Call whatsapp-outbound function
            const { error } = await supabase.functions.invoke('whatsapp-outbound', {
                body: {
                    lead_id: order.lead_id,
                    message: `¡Hola ${order.leads.full_name || 'estimado cliente'}! 👋

Su orden ha sido entregada satisfactoriamente. ✅

Producto: ${order.product_summary || 'su pedido'}

Gracias por su compra en Óptica Lyon Visión.

Si tiene alguna pregunta, no dude en contactarnos.`
                }
            })

            if (error) {
                console.error('Error sending delivery notification:', error)
                toast.error('Orden actualizada pero no se pudo enviar notificación WhatsApp')
            } else {
                toast.success('Notificación enviada al cliente')
            }
        } catch (err) {
            console.error('Exception sending notification:', err)
        }
    }

    useEffect(() => {
        fetchOrders()

        // Subscribe to realtime changes
        const channel = supabase
            .channel('orders-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'purchases'
                },
                () => {
                    fetchOrders()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    return {
        orders,
        loading,
        updateOrderStatus,
        fetchOrders
    }
}
