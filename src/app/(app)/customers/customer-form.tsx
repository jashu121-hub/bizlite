'use client'

import { useEffect, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { customerSchema, type CustomerInput } from '@/lib/validations/customer'
import { cn } from '@/lib/utils'

type CustomerFormProps = {
  initial?: Partial<CustomerInput>
  onSubmit: (data: CustomerInput) => Promise<any>
  onSuccess?: () => void
  onCancel?: () => void
  onDirtyChange?: (dirty: boolean) => void
  className?: string
}

export function CustomerForm({
  initial,
  onSubmit,
  onSuccess,
  onCancel,
  onDirtyChange,
  className,
}: CustomerFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const form = useForm<any>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
      ...initial,
    },
  })

  useEffect(() => {
    onDirtyChange?.(form.formState.isDirty)
  }, [form.formState.isDirty, onDirtyChange])

  return (
    <form
      className={cn('space-y-4', className)}
      onSubmit={form.handleSubmit((data: CustomerInput) =>
        startTransition(async () => {
          const result = await onSubmit(data)
          if (!result.success) {
            toast.error(result.error)
            return
          }
          toast.success(result.message ?? 'Customer saved')
          if (onSuccess) {
            onSuccess()
            router.refresh()
            return
          }
          router.push('/customers')
          router.refresh()
        }),
      )}
    >
      {(
        [
          ['Name', 'name', 'text'],
          ['Phone', 'phone', 'text'],
          ['Email', 'email', 'email'],
        ] as const
      ).map(([label, name, type]) => (
        <div key={name} className="space-y-2">
          <label htmlFor={name}>{label}</label>
          <Input id={name} type={type} {...form.register(name)} />
          <p className="text-sm text-red-600" role="alert">
            {String(form.formState.errors[name]?.message ?? '')}
          </p>
        </div>
      ))}
      <div className="space-y-2">
        <label htmlFor="address">Address</label>
        <Textarea id="address" {...form.register('address')} />
      </div>
      <div className="space-y-2">
        <label htmlFor="notes">Notes</label>
        <Textarea id="notes" {...form.register('notes')} />
      </div>
      <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => (onCancel ? onCancel() : router.back())}
        >
          Cancel
        </Button>
        <Button disabled={pending}>{pending ? 'Saving…' : 'Save customer'}</Button>
      </div>
    </form>
  )
}
