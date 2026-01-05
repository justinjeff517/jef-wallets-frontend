/* app/layout.tsx */
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "next-themes"
import { FooterNavbar } from "@/components/shared/FooterNavbar"
import { HeaderNavbar } from "@/components/shared/HeaderNavbar"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Wallets",
  description: "JEF Wallets",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const moduleName =
    (process.env.MODULE_NAME || "").trim() ||
    (process.env.NEXT_PUBLIC_MODULE_NAME || "").trim() ||
    ""

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <HeaderNavbar title={moduleName || undefined} titleFallback="Module" />
          <main>{children}</main>
          <FooterNavbar />
        </ThemeProvider>
      </body>
    </html>
  )
}
