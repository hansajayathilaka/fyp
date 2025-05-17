import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function MintNewTokenPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mint New Token</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="tokenCount" className="text-sm font-medium">
                Token Count
              </label>
              <Input id="tokenCount" placeholder="Token Count" className="w-full" />
            </div>

            <div className="space-y-2">
              <label htmlFor="companyAddress" className="text-sm font-medium">
                Company Address
              </label>
              <Input id="companyAddress" placeholder="Metamask Wallet Address" className="w-full" />
            </div>

            <div className="flex justify-end">
              <Button className="w-full sm:w-auto bg-sky-500 hover:bg-sky-600">Submit</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Recently Minted Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date and Time</TableHead>
                <TableHead>Token Count</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Jun 24, 2025</TableCell>
                <TableCell>$942.00</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700">
                    In Progress
                  </Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Mar 10, 2025</TableCell>
                <TableCell>$881.00</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    Complete
                  </Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Nov 10, 2025</TableCell>
                <TableCell>$409.00</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    Pending
                  </Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Dec 20, 2025</TableCell>
                <TableCell>$953.00</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                    Approved
                  </Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Jul 25, 2025</TableCell>
                <TableCell>$907.00</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-red-50 text-red-700">
                    Rejected
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

