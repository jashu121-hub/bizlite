'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { ensureProfileAction } from '@/actions/auth'
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
import { createClient } from '@/lib/supabase/client'
import { registerSchema, type RegisterInput } from '@/lib/validations/auth'

export default function RegisterPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = React.useState(false)

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (values: RegisterInput) => {
    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      if (!data.user) {
        toast.error('Registration failed. Please try again.')
        return
      }

      const profileResult = await ensureProfileAction(data.user.id, values.email)
      if (!profileResult.success) {
        toast.error(profileResult.error)
        return
      }

      if (!data.session) {
        toast.success('Check your email to confirm your account, then sign in.')
        router.push('/login')
        return
      }

      toast.success('Account created')
      router.push('/setup')
      router.refresh()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to create account. Please try again.'
      toast.error(
        message.includes('fetch') || message.includes('Supabase is not configured')
          ? 'Server not connected. Add Supabase keys in Vercel Environment Variables, then redeploy.'
          : message,
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Create account</h1>
        <p className="text-sm text-muted-foreground">Start managing your business in minutes</p>
      </div>

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

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
