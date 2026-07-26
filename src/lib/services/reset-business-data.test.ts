import { describe, expect, it } from 'vitest'
import { z } from 'zod'

const resetSchema = z.object({
  mode: z.enum(['transactions', 'full']),
  confirmation: z
    .string()
    .refine((value) => value.trim() === 'RESET', 'Type RESET to confirm'),
})

describe('reset business data confirmation', () => {
  it('accepts exact RESET confirmation', () => {
    expect(
      resetSchema.safeParse({ mode: 'transactions', confirmation: 'RESET' }).success,
    ).toBe(true)
  })

  it('rejects incorrect confirmation text', () => {
    expect(
      resetSchema.safeParse({ mode: 'full', confirmation: 'reset' }).success,
    ).toBe(false)
    expect(
      resetSchema.safeParse({ mode: 'full', confirmation: 'DELETE' }).success,
    ).toBe(false)
  })
})
