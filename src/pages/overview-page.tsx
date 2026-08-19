import { Link } from "react-router-dom"
import {
  useOverviewStats,
  useRecentBookings,
  useMonthlyRevenue,
} from "@/lib/hooks/queries"
import { useI18n, formatCurrency } from "@/lib/i18n"
import {
  PageHeader,
  StatCard,
  ErrorState,
  EmptyState,
} from "@/components/layout/page-utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import {
  Wallet,
  CalendarDays,
  Users,
  Clock,
  ArrowRight,
} from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
  pending: "var(--chart-4)",
  accepted: "var(--chart-3)",
  in_progress: "var(--chart-2)",
  completed: "var(--chart-1)",
  cancelled: "var(--chart-5)",
}

export function OverviewPage() {
  const { t, lang } = useI18n()
  const stats = useOverviewStats()
  const recent = useRecentBookings(8)
  const monthly = useMonthlyRevenue()

  const statusLabel: Record<string, string> = {
    pending: t("statusPending"),
    accepted: t("statusAccepted"),
    in_progress: t("statusInProgress"),
    completed: t("statusCompleted"),
    cancelled: t("statusCancelled"),
  }

  const pieData = Object.entries(stats.data?.bookingsByStatus ?? {}).map(
    ([name, value]) => ({ name: statusLabel[name] ?? name, value })
  )

  const monthlyData = (monthly.data ?? []).reduce<
    Record<string, { month: string; revenue: number }>
  >((acc, p) => {
    const d = new Date(p.created_at)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const month = new Intl.DateTimeFormat(lang === "ar" ? "ar-SY" : "en-US", {
      month: "short",
    }).format(d)
    if (!acc[key]) {
      acc[key] = { month, revenue: 0 }
    }
    acc[key].revenue += Number(p.amount)
    return acc
  }, {})
  const barData = Object.values(monthlyData)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("navOverview")} description={t("appTagline")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title={t("totalRevenue")}
              value={formatCurrency(stats.data?.totalRevenue)}
              icon={Wallet}
            />
            <StatCard
              title={t("totalBookings")}
              value={stats.data?.totalBookings ?? 0}
              icon={CalendarDays}
            />
            <StatCard
              title={t("activeClients")}
              value={stats.data?.activeClients ?? 0}
              icon={Users}
            />
            <StatCard
              title={t("pendingBookings")}
              value={stats.data?.pendingBookings ?? 0}
              icon={Clock}
            />
          </>
        )}
      </div>

      {stats.isError ? (
        <ErrorState onRetry={() => stats.refetch()} />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("monthlyRevenue")}</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {monthly.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : monthly.isError ? (
              <ErrorState onRetry={() => monthly.refetch()} />
            ) : barData.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    width={60}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("bookingsByStatus")}</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {stats.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : pieData.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {pieData.map((_entry, index) => (
                      <Cell
                        key={index}
                        fill={
                          STATUS_COLORS[
                            Object.keys(stats.data?.bookingsByStatus ?? {})[
                              index
                            ]
                          ] ?? "var(--chart-1)"
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("recentBookings")}</CardTitle>
            <CardDescription>{t("navBookings")}</CardDescription>
          </div>
          <Button variant="outline" size="sm" render={<Link to="/bookings" />}>
            {t("viewAll")}
            <ArrowRight className="size-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {recent.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recent.isError ? (
            <ErrorState onRetry={() => recent.refetch()} />
          ) : (recent.data ?? []).length === 0 ? (
            <EmptyState message={t("emptyBookings")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("customer")}</TableHead>
                  <TableHead>{t("service")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead className="text-end">{t("amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(recent.data ?? []).map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      {b.customer?.full_name || b.customer?.phone || "—"}
                    </TableCell>
                    <TableCell>
                      {lang === "ar" ? b.service?.name_ar : b.service?.name_en}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {statusLabel[b.status] ?? b.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Intl.DateTimeFormat(
                        lang === "ar" ? "ar-SY" : "en-US",
                        { dateStyle: "medium", timeStyle: "short" }
                      ).format(new Date(b.created_at))}
                    </TableCell>
                    <TableCell className="text-end">
                      {formatCurrency(b.total_price)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-16" />
      </CardContent>
    </Card>
  )
}