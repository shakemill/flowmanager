import React from 'react'
import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import { Toaster } from 'sonner'
import './css/globals.css'
import { Providers } from '@/components/providers'

const manrope = Manrope({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'FlowManager',
  description: 'Gestion du courrier',
  icons: {
    icon: '/images/logos/cub-logo.png',
    apple: '/images/logos/cub-logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        <link rel='icon' href='/images/logos/cub-logo.png' type='image/png' sizes='any' />
        <link rel='apple-touch-icon' href='/images/logos/cub-logo.png' />
        <link rel='manifest' href='/manifest.json' />
        {/* {typeof window !== 'undefined' && <ThemeModeScript />} */}
      </head>
      <body className={`${manrope.className}`}>
        <Providers>
          {children}
          <Toaster richColors position="top-right" closeButton />
        </Providers>
      </body>
    </html>
  )
}
