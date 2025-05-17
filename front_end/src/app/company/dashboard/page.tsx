import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const Companypage = () => {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Company Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <div className="font-medium">Business Registration No:</div>
              </div>
              <div>
                <div className="font-medium">Industry:</div>
              </div>
              <div>
                <div className="font-medium">Verification Status:</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">$5380.90</div>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                +18.10%
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Token Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center">
                <div className="mr-2">✅</div>
                <div>Total Minted Tokens - 120</div>
              </div>
              <div className="flex items-center">
                <div className="mr-2">📌</div>
                <div>Listed Tokens - 50</div>
              </div>
              <div className="flex items-center">
                <div className="mr-2">🏆</div>
                <div>Pending Tokens - 12</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Time over Price graph</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Week</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full rounded-md bg-slate-100"></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Latest Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Buyer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>ByeWind</TableCell>
                <TableCell>Jun 24, 2025</TableCell>
                <TableCell>$942.00</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700">
                    In Progress
                  </Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Natali Craig</TableCell>
                <TableCell>Mar 10, 2025</TableCell>
                <TableCell>$881.00</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    Complete
                  </Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Drew Cano</TableCell>
                <TableCell>Nov 10, 2025</TableCell>
                <TableCell>$409.00</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    Pending
                  </Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Orlando Diggs</TableCell>
                <TableCell>Dec 20, 2025</TableCell>
                <TableCell>$953.00</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                    Preparing
                  </Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Andi Lane</TableCell>
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
  );
};

export default Companypage;
