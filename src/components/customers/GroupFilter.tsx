'use client'

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useCustomerGroups } from '@/hooks/useCustomerGroups'
import { Tag } from 'lucide-react'

interface GroupFilterProps {
    selectedGroupId: string | null
    onGroupChange: (groupId: string | null) => void
}

export function GroupFilter({ selectedGroupId, onGroupChange }: GroupFilterProps) {
    const { groups } = useCustomerGroups()

    return (
        <Select
            value={selectedGroupId || 'all'}
            onValueChange={(value) => onGroupChange(value === 'all' ? null : value)}
        >
            <SelectTrigger className="w-[180px]">
                <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span>
                        {selectedGroupId && selectedGroupId !== 'all'
                            ? groups.find((g) => g.id === selectedGroupId)?.name
                            : 'Todos los grupos'}
                    </span>
                </div>
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todos los grupos</SelectItem>
                {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                        <div className="flex items-center gap-2">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: group.color }}
                            />
                            {group.name}
                            <span className="text-xs text-muted-foreground ml-1">
                                ({group.member_count || 0})
                            </span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
