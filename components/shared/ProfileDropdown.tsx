"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { User, LogOut, Settings, LayoutGrid, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
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

import { ModulesDialog } from "@/components/shared/ModulesDialog"

interface LoginDetails {
  entity_name: string
  entity_address: string
  username: string
}

export function ProfileDropdown() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  const [details, setDetails] = useState<LoginDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/shared/get-login-details")
        if (res.ok) {
          const data = await res.json()
          setDetails(data)
        }
      } catch (err) {
        console.error("Failed to load profile details", err)
      } finally {
        setIsLoading(false)
      }
    }
    loadProfile()
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch("/api/shared/session/delete-one", { method: "DELETE" })
      router.replace("/")
      router.refresh()
    } catch (error) {
      console.error("Logout failed:", error)
    } finally {
      setIsLoggingOut(false)
      setConfirmLogoutOpen(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {/* Label next to trigger for quick recognition */}
      {!isLoading && details && (
        <span className="hidden text-xs font-medium md:block text-muted-foreground">
          {details.username} @ <span className="text-foreground">{details.entity_name}</span>
        </span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="relative flex h-9 w-9 items-center justify-center rounded-full border bg-background hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring">
            <User className="h-5 w-5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64 p-2">
          {details ? (
            <div className="flex flex-col space-y-1 p-2">
              <p className="text-sm font-semibold leading-none">{details.entity_name}</p>
              <p className="text-[10px] leading-none text-muted-foreground truncate">
                {details.entity_address}
              </p>
              <div className="mt-2 inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                User: {details.username}
              </div>
            </div>
          ) : (
            <DropdownMenuLabel>Account</DropdownMenuLabel>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            {/* Modules Switcher */}
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0">
              <div className="flex w-full items-center gap-2 px-2 py-1.5">
                <LayoutGrid className="h-4 w-4 opacity-70" />
                <ModulesDialog trigger="default" triggerClassName="w-full text-left" />
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4 opacity-70" />
              <span>Profile Settings</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Theme Toggle inside Menu */}
          <div className="flex items-center justify-between px-2 py-2">
            <div className="flex items-center gap-2">
              {theme === "dark" ? <Moon className="h-4 w-4 opacity-70" /> : <Sun className="h-4 w-4 opacity-70" />}
              <span className="text-xs">Dark Mode</span>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
            onSelect={() => setConfirmLogoutOpen(true)}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Logout Confirmation */}
      <AlertDialog open={confirmLogoutOpen} onOpenChange={setConfirmLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to log back in to access **{details?.entity_name || "the system"}**.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
              {isLoggingOut ? "Processing..." : "Logout"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}