'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

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
import { APP_NAME } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import { forgotPasswordSchema } from '@/lib/validations/auth'

type ForgotPasswordInput = { email: string }

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = React.useState(false)
  const [sent, setSent] = React.useState(false)

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values: ForgotPasswordInput) => {
    setSubmitting(true)
    try {
      const supabase = createClient()
      const redirectTo = `${window.location.origin}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      setSent(true)
      toast.success(`${APP_NAME} password reset email sent`)
    } catch {
      toast.error('Unable to send reset email. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Reset your {APP_NAME} password</h1>
        <p className="text-sm text-muted-foreground">
          {sent
            ? 'Check your inbox for a reset link.'
            : `Enter your email and we will send you a ${APP_NAME} password reset link.`}
        </p>
      </div>

      {sent ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            If an account exists for <strong>{form.getValues('email')}</strong>, you will receive
            an email shortly.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="you@business.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        </Form>
      )}

      {!sent ? (
        <p className="text-center text-sm text-muted-foreground">
          Remember your password?{' '}
          <Link
            href="/login"
            className="font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400"
          >
            Sign in
          </Link>
        </p>
      ) : null}
    </div>
  )
}
