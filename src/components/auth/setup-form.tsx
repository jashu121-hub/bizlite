'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { completeSetupAction } from '@/actions/settings'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CURRENCIES, DEFAULT_CURRENCY } from '@/lib/constants'

const setupFormSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(120),
  ownerName: z.string().min(1, 'Owner name is required').max(120),
  phone: z.string().max(40).optional().or(z.literal('')),
  currency: z.string().min(3).max(3),
})

type SetupFormValues = z.infer<typeof setupFormSchema>

export function SetupForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = React.useState(false)

  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupFormSchema),
    defaultValues: {
      businessName: '',
      ownerName: '',
      phone: '',
      currency: DEFAULT_CURRENCY,
    },
  })

  const onSubmit = async (values: SetupFormValues) => {
    setSubmitting(true)
    try {
      const result = await completeSetupAction(values)
      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(result.message ?? 'Setup complete')
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Unable to complete setup. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="businessName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business name</FormLabel>
              <FormControl>
                <Input placeholder="Acme Trading LLC" autoComplete="organization" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ownerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner name</FormLabel>
              <FormControl>
                <Input placeholder="Your full name" autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Phone <span className="font-normal text-muted-foreground">(optional)</span>
              </FormLabel>
              <FormControl>
                <Input type="tel" placeholder="+971 50 000 0000" autoComplete="tel" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Saving…' : 'Complete setup'}
        </Button>
      </form>
    </Form>
  )
}
