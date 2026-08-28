import {
  useLiveBookings,
  usePoolBookings,
  useCaptainLocations,
  useBookingStatusCounts,
} from "@/lib/hooks/queries"
import { useLiveRealtime } from "@/lib/hooks/use-live-realtime"
import { useI18n, formatCurrency, formatDateTime } from "@/lib/i18n"
import type { BookingWithRelations, CaptainLocation } from "@/lib/types"
import {
  PageHeader,
  StatCard,
  ErrorState,
  EmptyState,
} from "@/components/layout/page-utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  CarFront,
  MapPin,
  Radio,
  Route,
  Wrench,
} from "lucide-react"

/**
 * Live Operations board.
 *
 * A real-time view of what's happening right now: captains on their way,
 * washes in progress, and the open pool of unassigned requests waiting for a
 * captain to claim them. A single realtime channel refreshes bookings and
 * captain GPS rows as they change.
 */
export function LiveOpsPage() {
  const { t, lang } = useI18n()
  const { isLive } = useLiveRealtime()

  const live = useLiveBookings()
  const pool = usePoolBookings()
  const locations = useCaptainLocations()
  const counts = useBookingStatusCounts()

  const liveBookings = live.data ?? []
  const poolBookings = pool.data ?? []
  const statusCounts = counts.data ?? {}

  // Keep only the newest GPS row per captain (the query returns all history).
  const byProvider = new Map<string, CaptainLocation>()
  for (const loc of locations.data ?? []) {
    const existing = byProvider.get(loc.provider_id)
    if (!existing || new Date(loc.updated_at) > new Date(existing.updated_at)) {
      byProvider.set(loc.provider_id, loc)
    }
  }

  const onTheWay = statusCounts.on_the_way ?? 0
  const inProgress = statusCounts.in_progress ?? 0
  const poolCount = poolBookings.length

  const statusMeta = (status: BookingWithRelations["status"]) => {
    switch (status) {
      case "on_the_way":
        return { label: t("liveStatusOnTheWay"), variant: "secondary" as const }
      case "in_progress":
        return { label: t("liveStatusInProgress"), variant: "default" as const }
      case "accepted":
        return { label: t("liveStatusAccepted"), variant: "outline" as const }
      default:
        return { label: t("status"), variant: "outline" as const }
    }
  }

  const locFor = (providerId: string | null) =>
    providerId ? byProvider.get(providerId) : undefined

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("liveBoard")}
        description={t("liveBoardDesc")}
        actions={
          <Badge variant={isLive ? "default" : "outline"} className="gap-1.5">
            <span
              className={`size-1.5 rounded-full ${
                isLive ? "bg-primary" : "bg-muted-foreground"
              }`}
            />
            {isLive ? t("liveConnected") : t("liveDisconnected")}
          </Badge>
        }
      />

      {/* Live stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("liveOnTheWay")}
          value={onTheWay}
          icon={Route}
        />
        <StatCard
          title={t("liveWashing")}
          value={inProgress}
          icon={Wrench}
        />
        <StatCard title={t("livePool")} value={poolCount} icon={Radio} />
        <StatCard
          title={t("liveActiveBookings")}
          value={liveBookings.length}
          icon={CarFront}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Live washes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("liveActiveBookings")}</CardTitle>
          </CardHeader>
          <CardContent>
            {live.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : live.isError ? (
              <ErrorState onRetry={() => live.refetch()} />
            ) : liveBookings.length === 0 ? (
              <EmptyState message={t("liveEmptyLive")} />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("liveCaptainName")}</TableHead>
                      <TableHead>{t("service")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                      <TableHead>{t("liveWashPoint")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liveBookings.map((b) => {
                      const loc = locFor(b.provider_id)
                      const meta = statusMeta(b.status)
                      return (
                        <TableRow key={b.id}>
                          <TableCell>
                            {b.provider?.full_name || t("noProvider")}
                          </TableCell>
                          <TableCell>
                            {lang === "ar"
                              ? b.service?.name_ar
                              : b.service?.name_en}
                          </TableCell>
                          <TableCell>
                            <Badge variant={meta.variant}>{meta.label}</Badge>
                          </TableCell>
                          <TableCell>
                            {loc ? (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="size-3" />
                                {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Open pool */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("livePool")}</CardTitle>
          </CardHeader>
          <CardContent>
            {pool.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : pool.isError ? (
              <ErrorState onRetry={() => pool.refetch()} />
            ) : poolBookings.length === 0 ? (
              <EmptyState message={t("liveEmptyPool")} />
            ) : (
              <div className="flex flex-col gap-3">
                {poolBookings.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-lg border p-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {b.customer?.full_name || b.customer?.phone || "—"}
                        {b.customer?.client_no
                          ? " (" + b.customer.client_no + ")"
                          : ""}
                      </span>
                      <Badge variant="outline" className="shrink-0">
                        {formatCurrency(b.total_price)}
                      </Badge>
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      {lang === "ar" ? b.service?.name_ar : b.service?.name_en}
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDateTime(b.scheduled_at)}</span>
                      {b.lat != null && b.lng != null ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {b.lat.toFixed(4)}, {b.lng.toFixed(4)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
