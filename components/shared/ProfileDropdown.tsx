"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { User } from "lucide-react"
import { useTheme } from "next-themes"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type SessionState = { emp: string | null; ent: string | null }

export function ProfileDropdown() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  const [session, setSession] = useState<SessionState>({ emp: null, ent: null })
  const [isValid, setIsValid] = useState(false)

  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("/api/shared/session/validate", {
          cache: "no-store",
          credentials: "include",
        })
        const data = await res.json().catch(() => null)

        const valid = !!data?.is_valid
        setIsValid(valid)

        if (valid && data?.payload) {
          setSession({
            emp: data.payload.employee_number?.toString() || null,
            ent: data.payload.entity_number?.toString() || null,
          })
        } else {
          setSession({ emp: null, ent: null })
        }
      } catch (err) {
        console.error("Session validation failed", err)
        setIsValid(false)
        setSession({ emp: null, ent: null })
      }
    }

    fetchSession()
  }, [])

  const canLogout = useMemo(() => {
    return isValid && (session.emp || session.ent) && !isLoggingOut
  }, [isValid, session.emp, session.ent, isLoggingOut])

  const handleLogout = async () => {
    if (!canLogout) return
    setIsLoggingOut(true)

    try {
      const res = await fetch("/api/shared/session/delete-one", {
        method: "DELETE",
        credentials: "include",
        cache: "no-store",
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => "")
        throw new Error(`Logout failed (${res.status}): ${txt}`)
      }

      setSession({ emp: null, ent: null })
      setIsValid(false)
      setConfirmLogoutOpen(false)

      router.replace("/")

      // HARD reload to guarantee all client/server state resets
      window.location.reload()
    } catch (error) {
      console.error("Logout failed:", error)
      setConfirmLogoutOpen(false)
      router.replace("/")
      window.location.reload()
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="font-mono">{session.emp ?? "Profile"}</span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted hover:bg-muted/80 focus:ring-2 focus:ring-ring transition"
            aria-label="Open profile menu"
          >
            <User className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>Account</DropdownMenuLabel>

          {(session.emp || session.ent) && (
            <div className="px-2 pb-2 text-[10px] text-muted-foreground">
              {session.emp && (
                <div>
                  Emp: <span className="font-mono">{session.emp}</span>
                </div>
              )}
              {session.ent && (
                <div>
                  Ent: <span className="font-mono">{session.ent}</span>
                </div>
              )}
            </div>
          )}

          {!isValid && (
            <div className="px-2 pb-2 text-[10px] text-muted-foreground">
              Session invalid (logout disabled)
            </div>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem>Profile Settings</DropdownMenuItem>

          <DropdownMenuItem
            disabled={!isValid}
            onSelect={(e) => {
              e.preventDefault()
              if (!isValid) return
              setConfirmLogoutOpen(true)
            }}
          >
            Logout
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs">Dark Mode</span>
            <Switch checked={theme === "dark"} onCheckedChange={(s) => setTheme(s ? "dark" : "light")} />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={confirmLogoutOpen}
        onOpenChange={(open) => {
          if (!isValid && open) return
          setConfirmLogoutOpen(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              {isValid ? "Are you sure you want to sign out?" : "Session is invalid. Logout is disabled."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoggingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              disabled={!canLogout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
