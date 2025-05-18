import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function PeerTransactionsPage() {
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 px-6 pb-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">Peer Transaction</h1>
          </div>

          <form className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="token" className="text-sm font-medium">
                Select Token
              </label>
              <Select>
                <SelectTrigger id="token">
                  <SelectValue placeholder="Token" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="byewind">ByeWind</SelectItem>
                  <SelectItem value="natali">Natali Craig</SelectItem>
                  <SelectItem value="drew">Drew Cano</SelectItem>
                  <SelectItem value="orlando">Orlando Diggs</SelectItem>
                  <SelectItem value="andi">Andi Lane</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="address" className="text-sm font-medium">
                Address to Transfer
              </label>
              <Input id="address" placeholder="Metamask Wallet Address" className="w-full" />
            </div>

            <div className="space-y-2">
              <label htmlFor="tokenCount" className="text-sm font-medium">
                Token Count
              </label>
              <Input id="tokenCount" placeholder="Token Count" className="w-full" />
            </div>

            <div className="pt-2">
              <Button className="w-full bg-green-600 hover:bg-green-700">Submit</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
