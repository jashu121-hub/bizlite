import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'

import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/sonner'
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_PAGE_TITLE,
  APP_SHORT_NAME,
  THEME_COLOR,
} from '@/lib/constants'

import './globals.css'

const plusJakarta = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta',
  subsets: ['latin'],
  display: 'swap',
  preload: true,
})

export const metadata: Metadata = {
  title: {
    default: APP_PAGE_TITLE,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_SHORT_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_SHORT_NAME,
  },
  openGraph: {
    title: APP_PAGE_TITLE,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    type: 'website',
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/favicon.svg',
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-dvh w-full max-w-none overflow-x-hidden font-sans">
        <Providers>
          {children}
          <Toaster richColors closeButton position="top-center" />
        </Providers>
      </body>
    </html>
  )
}
