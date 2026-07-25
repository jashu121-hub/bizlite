'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CurrencyInput } from '@/components/shared/currency-input'
import { expenseSchema, type ExpenseInput } from '@/lib/validations/expense'
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@/lib/constants'
import { todayInputValue } from '@/lib/dates'

export function ExpenseForm({ currency, initial, onSubmit }: { currency: string; initial?: Partial<ExpenseInput>; onSubmit: (data: ExpenseInput) => Promise<any> }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const form = useForm<any>({ resolver: zodResolver(expenseSchema), defaultValues: { date: todayInputValue(), category: 'OTHER', description: '', amount: '0', paymentMethod: 'CASH', notes: '', ...initial } })
  const submit = (data: ExpenseInput) => startTransition(async () => {
    const result = await onSubmit(data)
    if (!result.success) { toast.error(result.error); return }
    toast.success(result.message ?? 'Expense saved'); router.push('/expenses'); router.refresh()
  })
  return <form onSubmit={form.handleSubmit(submit)} className="mx-auto max-w-2xl space-y-5">
    <div className="grid gap-5 sm:grid-cols-2"><Field label="Date" error={String(form.formState.errors.date?.message ?? '')}><Input type="date" {...form.register('date')} /></Field><Field label="Category" error={String(form.formState.errors.category?.message ?? '')}><select className="h-10 w-full rounded-md border bg-transparent px-3" {...form.register('category')}>{EXPENSE_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select></Field></div>
    <Field label="Description" error={String(form.formState.errors.description?.message ?? '')}><Input placeholder="What was this expense for?" {...form.register('description')} /></Field>
    <div className="grid gap-5 sm:grid-cols-2"><Field label={`Amount (${currency})`} error={String(form.formState.errors.amount?.message ?? '')}><CurrencyInput currency={currency} value={form.watch('amount')} onChange={(value) => form.setValue('amount', value, { shouldValidate: true })} /></Field><Field label="Payment method"><select className="h-10 w-full rounded-md border bg-transparent px-3" {...form.register('paymentMethod')}>{PAYMENT_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</select></Field></div>
    <Field label="Notes"><Textarea {...form.register('notes')} /></Field>
    <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button><Button disabled={pending}>{pending ? 'Saving…' : 'Save expense'}</Button></div>
  </form>
}
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}{error && <p className="text-sm text-red-600">{error}</p>}</div> }
