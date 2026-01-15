/* app/layout.tsx */
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "next-themes"
import { HeaderNavbar } from "@/components/shared/HeaderNavbar"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

function asStr(v: unknown) {
  return typeof v === "string" ? v.trim() : ""
}

const MODULE_NAME = asStr(process.env.MODULE_NAME)

export const metadata: Metadata = {
  title: MODULE_NAME,
  description: "Main Messaging System of JEF",
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="min-h-dvh">
            <HeaderNavbar title={MODULE_NAME || undefined} titleFallback="Module" />
            <main>{props.children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
