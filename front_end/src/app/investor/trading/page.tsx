import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Check, X } from "lucide-react"

export default function TradingPage() {
  // Sample available tokens data
  const availableTokens = [
    { company: "Company 1", value: "$5380.90", change: "+18.10%" },
    { company: "Company 1", value: "$5380.90", change: "+18.10%" },
    { company: "Company 2", value: "$5380.90", change: "+18.10%" },
  ]

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Available Tokens */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Available Tokens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableTokens.map((token, index) => (
              <div key={index} className="rounded-lg bg-green-50 p-4">
                <div className="mb-2 text-sm font-medium text-muted-foreground">{token.company}</div>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{token.value}</div>
                  <Badge variant="outline" className="bg-green-100 text-green-700">
                    {token.change}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Market Insights and Tradings */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Market Insights and Tradings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Total Token Value */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-green-50 p-4">
                <div className="mb-2 text-sm font-medium text-muted-foreground">Total Token Value</div>
                <div className="text-2xl font-bold">$5380.90</div>
              </div>
              <div className="rounded-lg bg-green-50 p-4">
                <div className="mb-2 text-sm font-medium text-muted-foreground">Time over Price graph</div>
                <div className="h-16 w-full rounded bg-white p-2">
                  {/* Simple line chart representation */}
                  <svg viewBox="0 0 100 20" className="h-full w-full">
                    <polyline
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="1"
                      points="0,15 10,12 20,8 30,10 40,6 50,9 60,5 70,7 80,4 90,6 100,3"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Current Orders */}
            <div className="rounded-lg bg-green-50 p-4">
              <div className="mb-3 text-sm font-medium text-muted-foreground">Current Orders</div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Buying Order Count - 120</span>
                </div>
                <div className="flex items-center gap-2">
                  <X className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Selling Order Count - 50</span>
                </div>
              </div>
            </div>

            {/* Place Your Order */}
            <div className="rounded-lg bg-green-50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-medium text-muted-foreground">Place Your Order</div>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="h-8 rounded-full bg-green-500 px-4 text-xs hover:bg-green-600">
                    Buy
                  </Button>
                </div>
              </div>
              <form className="space-y-3">
                <Input placeholder="Token Count" className="bg-white" />
                <Input placeholder="Price per Token" className="bg-white" />
                <Input placeholder="Total Price" className="bg-white" />
                <Button className="w-full bg-green-600 hover:bg-green-700">Buy Now</Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-semibold">Transaction History</CardTitle>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-5 w-5" />
            <span className="sr-only">More options</span>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center text-muted-foreground">No transactions yet</div>
        </CardContent>
      </Card>
    </div>
  )
}
