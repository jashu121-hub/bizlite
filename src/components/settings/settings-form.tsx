'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { LogOut } from 'lucide-react'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { updateSettingsAction } from '@/actions/settings'
import { useLogout } from '@/components/layout/use-logout'
import { InstallAppButton } from '@/components/shared/install-app-button'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Separator } from '@/components/ui/separator'
import { APP_NAME, CURRENCIES } from '@/lib/constants'

const settingsFormSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(120),
  ownerName: z.string().min(1, 'Owner name is required').max(120),
  phone: z.string().max(40).optional().or(z.literal('')),
  currency: z.string().min(3).max(3),
  costingMode: z.enum(['INVENTORY', 'SIMPLE']),
})

type SettingsFormValues = z.infer<typeof settingsFormSchema>

interface SettingsFormProps {
  defaultValues: SettingsFormValues
}

export function SettingsForm({ defaultValues }: SettingsFormProps) {
  const { logout, loading: loggingOut } = useLogout()
  const [submitting, setSubmitting] = React.useState(false)

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues,
  })

  const onSubmit = async (values: SettingsFormValues) => {
    setSubmitting(true)
    try {
      const result = await updateSettingsAction(values)
      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(result.message ?? 'Settings saved')
    } catch {
      toast.error('Unable to save settings. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business profile</CardTitle>
          <CardDescription>Update your business details and default currency.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business name</FormLabel>
                    <FormControl>
                      <Input autoComplete="organization" {...field} />
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
                      <Input autoComplete="name" {...field} />
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
                      <Input type="tel" autoComplete="tel" {...field} />
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
                    <Select onValueChange={field.onChange} value={field.value}>
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

              <FormField
                control={form.control}
                name="costingMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costing mode</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select costing mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="INVENTORY">
                          Inventory Costing — COGS from sale-line unit costs
                        </SelectItem>
                        <SelectItem value="SIMPLE">
                          Simple Costing — COGS from entered Production Cost expenses
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Do not mix modes. Inventory mode keeps sale-time unit costs. Simple mode uses
                      period Production Cost expenses as Profit and Loss COGS.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save changes'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance & app</CardTitle>
          <CardDescription>
            Customize how {APP_NAME} looks and install it on your device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-sm text-muted-foreground">Switch between light and dark mode</p>
            </div>
            <ThemeToggle />
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
            <div>
              <p className="text-sm font-medium">Install app</p>
              <p className="text-sm text-muted-foreground">Add {APP_NAME} to your home screen</p>
            </div>
            <InstallAppButton variant="outline" />
          </div>

          <Separator />

          <Button
            type="button"
            variant="outline"
            className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
            onClick={() => void logout()}
            disabled={loggingOut}
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? 'Logging out…' : 'Log out'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
