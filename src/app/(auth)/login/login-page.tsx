'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { friendlyAuthError } from '@/lib/auth-errors'
import { APP_NAME } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [submitting, setSubmitting] = React.useState(false)

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const finishLogin = async (
    email: string,
    password: string,
    welcome = `Welcome back to ${APP_NAME}`,
  ) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(friendlyAuthError(error.message))
      return false
    }
    toast.success(welcome)
    const next = searchParams.get('next')
    router.push(next && next.startsWith('/') ? next : '/dashboard')
    router.refresh()
    return true
  }

  const onSubmit = async (values: LoginInput) => {
    setSubmitting(true)
    try {
      await finishLogin(values.email, values.password)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to sign in. Please try again.'
      toast.error(friendlyAuthError(message))
    } finally {
      setSubmitting(false)
    }
  }

  const onDemoLogin = async () => {
    setSubmitting(true)
    try {
      await finishLogin('demo@bizlite.app', 'Demo1234!', 'Demo mode unlocked')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to open demo. Please try again.'
      toast.error(friendlyAuthError(message))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Welcome to {APP_NAME}</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to manage your business with {APP_NAME}.
        </p>
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
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <Input type="password" autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={submitting}
        onClick={() => void onDemoLogin()}
      >
        {submitting ? 'Opening demo…' : 'Try demo (no signup)'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        New to {APP_NAME}?{' '}
        <Link
          href="/register"
          className="font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400"
        >
          Create an account
        </Link>
      </p>
    </div>
  )
}
