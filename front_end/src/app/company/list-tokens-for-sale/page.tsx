import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Trash2 } from "lucide-react"

export default function ListTokensPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">List Tokens for Sale</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Time over Price graph</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-md border px-2 py-1">
              <span className="text-xs">Week</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-3"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
            <div className="flex items-center gap-1 rounded-md border px-2 py-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-3"
              >
                <path d="M3 16h18" />
                <path d="M3 8h18" />
                <path d="M12 4v16" />
              </svg>
            </div>
            <div className="flex items-center gap-1 rounded-md border px-2 py-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-3"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full rounded-md bg-slate-100">
            {/* This would be replaced with an actual chart component */}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top 10 Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date and Time</TableHead>
                  <TableHead>Token Count</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Buyer address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Jun 24, 2025</TableCell>
                  <TableCell>50</TableCell>
                  <TableCell className="text-purple-500">$100</TableCell>
                  <TableCell className="truncate max-w-[100px]">0x1a2...</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Mar 10, 2025</TableCell>
                  <TableCell>100</TableCell>
                  <TableCell className="text-green-500">$50</TableCell>
                  <TableCell className="truncate max-w-[100px]">0x3b4...</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Nov 10, 2025</TableCell>
                  <TableCell>20</TableCell>
                  <TableCell className="text-blue-500">$150</TableCell>
                  <TableCell className="truncate max-w-[100px]">0x5c6...</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Dec 20, 2025</TableCell>
                  <TableCell>30</TableCell>
                  <TableCell className="text-yellow-500">$85</TableCell>
                  <TableCell className="truncate max-w-[100px]">0x7d8...</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Jul 25, 2025</TableCell>
                  <TableCell>60</TableCell>
                  <TableCell className="text-purple-500">$100</TableCell>
                  <TableCell className="truncate max-w-[100px]">0x9e0...</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sell Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="totalCount" className="text-sm font-medium">
                  Total Count to be sold
                </label>
                <Input id="totalCount" placeholder="Token Count" />
              </div>

              <div className="space-y-2">
                <label htmlFor="sellingPrice" className="text-sm font-medium">
                  Selling Price
                </label>
                <Input id="sellingPrice" placeholder="Selling price" />
              </div>

              <div className="space-y-2">
                <label htmlFor="tokenCount" className="text-sm font-medium">
                  Token Count to sell
                </label>
                <Input id="tokenCount" placeholder="Metamask Wallet Address" />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="destructive">Remove</Button>
                <Button className="bg-sky-500 hover:bg-sky-600">Submit</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Selling Order Insights</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Created at 2025.05.17 11.42 AM</p>
              <div className="text-2xl font-bold">100 Tokens</div>
              <div className="text-xl font-semibold text-sky-500">$100</div>
            </div>
            <div className="relative h-24 w-24">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-12 w-12 rounded-full bg-white"></div>
              </div>
              <svg viewBox="0 0 100 100" className="h-full w-full rotate-[-90deg]">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="10"
                  strokeDasharray="251.2"
                  strokeDashoffset="62.8"
                />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
