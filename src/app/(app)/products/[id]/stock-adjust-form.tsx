'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { adjustStockAction } from '@/actions/products'
import { NumberInput } from '@/components/shared/number-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { todayInputValue } from '@/lib/dates'
import { stockAdjustmentSchema } from '@/lib/validations/product'

export function StockAdjustForm({
  productId,
  onDone,
}: {
  productId: string
  onDone: () => void
}) {
  const [pending, startTransition] = useTransition()
  const form = useForm<any>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      productId,
      type: 'ADD',
      quantity: 1,
      date: todayInputValue(),
      notes: '',
    },
  })

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((data) =>
        startTransition(async () => {
          const result = await adjustStockAction(data)
          if (!result.success) {
            toast.error(result.error)
            return
          }
          toast.success(result.message ?? 'Stock updated')
          onDone()
        }),
      )}
    >
      <input type="hidden" {...form.register('productId')} />
      <select className="h-10 w-full rounded-md border bg-transparent px-3" {...form.register('type')}>
        <option value="ADD">Add stock</option>
        <option value="REDUCE">Reduce stock</option>
      </select>
      <NumberInput
        integer
        min={1}
        placeholder="1"
        value={form.watch('quantity')}
        onChange={(value) =>
          form.setValue('quantity', value === '' ? '' : Number(value), {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      />
      <Input type="date" {...form.register('date')} />
      <Textarea placeholder="Reason or notes" {...form.register('notes')} />
      <Button disabled={pending} className="w-full">
        {pending ? 'Updating…' : 'Update stock'}
      </Button>
    </form>
  )
}
