export type ActionResult<T = undefined> =
  | { success: true; data: T; message?: string }
  | {
      success: false
      error: string
      code?: string
      duplicates?: Array<{
        source: string
        id: string
        label: string
        href: string
        amount: number | null
        date: string | null
        reference: string | null
        vendor: string | null
      }>
    }

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { success: true, data, message }
}

export function fail(
  error: string,
  extras?: {
    code?: string
    duplicates?: Array<{
      source: string
      id: string
      label: string
      href: string
      amount: number | null
      date: string | null
      reference: string | null
      vendor: string | null
    }>
  },
): ActionResult<never> {
  return {
    success: false,
    error,
    ...(extras?.code ? { code: extras.code } : {}),
    ...(extras?.duplicates ? { duplicates: extras.duplicates } : {}),
  }
}
