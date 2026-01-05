import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-md p-3 space-y-2">
      <header className="flex items-start justify-between">
        <div className="space-y-0.5">
          <div className="text-lg font-semibold leading-tight">JEF Wallets</div>
          <div className="text-xs text-muted-foreground leading-tight">
            Credits in PHP (₱) for fast payments
          </div>
        </div>
        <Badge variant="secondary" className="text-[11px]">
          Beta
        </Badge>
      </header>

      <Card className="rounded-2xl">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm">Available Credits</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-semibold leading-none">₱ —</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Sign in to view your balance.
              </div>
            </div>
            <Button asChild size="sm" className="h-8 rounded-xl">
              <Link href="/wallets/sign-in">Sign in</Link>
            </Button>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="secondary" className="h-10 rounded-xl justify-start">
              <Link href="/wallets/top-up">Top up</Link>
            </Button>
            <Button asChild variant="secondary" className="h-10 rounded-xl justify-start">
              <Link href="/wallets/send">Send</Link>
            </Button>
            <Button asChild variant="secondary" className="h-10 rounded-xl justify-start">
              <Link href="/wallets/pay">Pay</Link>
            </Button>
            <Button asChild variant="secondary" className="h-10 rounded-xl justify-start">
              <Link href="/wallets/history">History</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm">Quick Pay</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          <div className="text-[11px] text-muted-foreground leading-tight">
            Pay by QR, reference, or merchant code.
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button asChild className="h-10 rounded-xl">
              <Link href="/wallets/pay/qr">Scan QR</Link>
            </Button>
            <Button asChild variant="outline" className="h-10 rounded-xl">
              <Link href="/wallets/pay/code">Enter code</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm">Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="text-[11px] text-muted-foreground leading-tight">
            No activity to show.
          </div>
        </CardContent>
      </Card>

      <footer className="text-[11px] text-muted-foreground leading-tight px-1">
        Tip: Credits are stored as wallet balance and used for payments inside JEF.
      </footer>
    </main>
  );
}
