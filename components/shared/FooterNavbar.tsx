// components/shared/FooterNavbar.tsx
"use client"

import { ModulesDialog } from "@/components/shared/ModulesDialog"
import { ProfileDropdown } from "./ProfileDropdown"

export function FooterNavbar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/90 backdrop-blur dark:border-gray-800 dark:bg-background/90">
      <div className="flex h-10 w-full max-w-full items-center px-3">
        <div className="flex items-center gap-2">

          <ModulesDialog />
        </div>

        <div className="flex-1" />

        <div className="flex items-center">
          <ProfileDropdown />
        </div>
      </div>
    </nav>
  )
}
