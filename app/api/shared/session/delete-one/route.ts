//api/session/delete-one/route.ts
import { NextResponse } from "next/server"
import { deleteSession } from "@/lib/session"

export const runtime = "nodejs"

export async function DELETE() {
  await deleteSession()
  return NextResponse.json({ message: "Session deleted" })
}
