import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Total Portfolio Value</div>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">$5380.90</div>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  +18.10%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Top Performing Token</div>
              <div className="text-2xl font-bold text-green-500">$5380.90</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Worst Performing Token</div>
              <div className="text-2xl font-bold text-red-500">$5380.90</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <Tabs defaultValue="top10">
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="top10">Top 10 Companies</TabsTrigger>
              <TabsTrigger value="lower10">Lower 10 Companies</TabsTrigger>
            </TabsList>

            <TabsContent value="top10" className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground">
                <div>Company Name</div>
                <div>Current Price Per Token</div>
                <div>Price Indicator</div>
              </div>

              <div className="space-y-2">
                {[
                  { name: "ByeWind", price: "$942.00", indicator: "+9.54%", indicatorColor: "text-green-500" },
                  { name: "Natali Craig", price: "$409.00", indicator: "-1.25%", indicatorColor: "text-red-500" },
                  { name: "Drew Cano", price: "$399.00", indicator: "+3.31%", indicatorColor: "text-green-500" },
                  { name: "Orlando Diggs", price: "$321.00", indicator: "+3.3%", indicatorColor: "text-green-500" },
                  { name: "Andi Lane", price: "$309.00", indicator: "-0.56%", indicatorColor: "text-red-500" },
                ].map((company, index) => (
                  <div key={index} className="grid grid-cols-3 items-center gap-4 rounded-md bg-slate-50 p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-slate-300"></div>
                      <span>{company.name}</span>
                    </div>
                    <div>{company.price}</div>
                    <div className="flex items-center justify-between">
                      <span className={company.indicatorColor}>{company.indicator}</span>
                      <Button variant="link" className="text-blue-500 p-0 h-auto">
                        View More Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="lower10" className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground">
                <div>Company Name</div>
                <div>Current Price Per Token</div>
                <div>Price Indicator</div>
              </div>

              <div className="space-y-2">
                {[
                  { name: "Acme Corp", price: "$142.00", indicator: "-12.54%", indicatorColor: "text-red-500" },
                  { name: "Globex Inc", price: "$209.00", indicator: "-8.25%", indicatorColor: "text-red-500" },
                  { name: "Soylent Co", price: "$199.00", indicator: "-5.31%", indicatorColor: "text-red-500" },
                  { name: "Initech LLC", price: "$121.00", indicator: "-7.3%", indicatorColor: "text-red-500" },
                  { name: "Umbrella Corp", price: "$109.00", indicator: "-9.56%", indicatorColor: "text-red-500" },
                ].map((company, index) => (
                  <div key={index} className="grid grid-cols-3 items-center gap-4 rounded-md bg-slate-50 p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-slate-300"></div>
                      <span>{company.name}</span>
                    </div>
                    <div>{company.price}</div>
                    <div className="flex items-center justify-between">
                      <span className={company.indicatorColor}>{company.indicator}</span>
                      <Button variant="link" className="text-blue-500 p-0 h-auto">
                        View More Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
