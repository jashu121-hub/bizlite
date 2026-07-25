'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { recordCustomerPaymentAction } from '@/actions/customers'
import { customerPaymentSchema, type CustomerPaymentInput } from '@/lib/validations/customer'
import { todayInputValue } from '@/lib/dates'
import { PAYMENT_METHODS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Props {
  customerId: string
  currency: string
  pendingSales: { id: string; invoiceNumber: string; balancePending: number }[]
}

export function RecordPaymentDialog({ customerId, currency, pendingSales }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const form = useForm<CustomerPaymentInput>({
    resolver: zodResolver(customerPaymentSchema) as never,
    defaultValues: {
      customerId,
      saleId: '',
      date: todayInputValue(),
      amount: '',
      paymentMethod: 'CASH',
      notes: '',
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Record payment</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((data) =>
            startTransition(async () => {
              const result = await recordCustomerPaymentAction({ ...data, customerId })
              if (!result.success) {
                toast.error(result.error)
                return
              }
              toast.success(result.message ?? 'Payment recorded')
              setOpen(false)
              router.refresh()
            }),
          )}
        >
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" {...form.register('date')} />
          </div>
          <div className="space-y-2">
            <Label>Related sale (optional)</Label>
            <Select
              value={form.watch('saleId') || 'none'}
              onValueChange={(v) => form.setValue('saleId', v === 'none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unallocated payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unallocated payment</SelectItem>
                {pendingSales.map((sale) => (
                  <SelectItem key={sale.id} value={sale.id}>
                    {sale.invoiceNumber} · {currency} {sale.balancePending.toFixed(2)} pending
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({currency})</Label>
            <Input id="amount" type="number" step="0.01" min="0" {...form.register('amount')} />
          </div>
          <div className="space-y-2">
            <Label>Payment method</Label>
            <Select
              value={form.watch('paymentMethod')}
              onValueChange={(v) => form.setValue('paymentMethod', v as CustomerPaymentInput['paymentMethod'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...form.register('notes')} />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Saving…' : 'Save payment'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
