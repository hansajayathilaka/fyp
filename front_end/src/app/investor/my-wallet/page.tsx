import { Card, CardContent } from "@/components/ui/card"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function WalletPage() {
  // Sample wallet data
  const walletItems = [
    { token: "ByeWind", tokenPrice: "$50", totalPrice: "$942.00" },
    { token: "Natali Craig", tokenPrice: "$10.55", totalPrice: "$881.00" },
    { token: "Drew Cano", tokenPrice: "$56.00", totalPrice: "$409.00" },
    { token: "Orlando Diggs", tokenPrice: "$20.00", totalPrice: "$953.00" },
    { token: "Andi Lane", tokenPrice: "$45.00", totalPrice: "$907.00" },
  ]

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">My Wallet</h1>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-5 w-5" />
          <span className="sr-only">More options</span>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-3 gap-4 p-4 text-sm font-medium text-muted-foreground">
            <div>Token</div>
            <div>Token Price</div>
            <div>Total Price</div>
          </div>
          <div className="divide-y">
            {walletItems.map((item, index) => (
              <div key={index} className="grid grid-cols-3 items-center gap-4 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-slate-300"></div>
                  <span>{item.token}</span>
                </div>
                <div>{item.tokenPrice}</div>
                <div>{item.totalPrice}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
