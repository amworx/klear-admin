import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  type Day,
} from "date-fns"
import {
  useCalendarBookings,
  useCaptainLocations,
  useProviders,
  updateBooking,
} from "@/lib/hooks/queries"
import { useI18n, formatCurrency, formatDateTime, type TranslationKey } from "@/lib/i18n"
import type { Booking, BookingStatus, BookingWithRelations, CaptainLocation } from "@/lib/types"
import {
  PageHeader,
  ErrorState,
  EmptyState,
} from "@/components/layout/page-utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CalendarRange,
  Car,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Localisation helpers (Gregorian calendar, Arabic-first, RTL-safe)
// ---------------------------------------------------------------------------

const WEEK_START: Record<string, Day> = { ar: 6, en: 1 } // Sat (ar) / Mon (en)

type T = ReturnType<typeof useI18n>["t"]

function weekdayLabel(t: T, date: Date): string {
  return t(("calWeekday" + getDay(date)) as TranslationKey)
}

function monthLabel(t: T, date: Date): string {
  return t(("calMonth" + (date.getMonth() + 1)) as TranslationKey)
}

function timeOfDay(date: Date): string {
  return format(date, "HH:mm")
}

function isWeekend(date: Date, lang: string): boolean {
  const d = getDay(date)
  return lang === "ar" ? d === 5 /* Friday */ : d === 0 || d === 6
}

// ---------------------------------------------------------------------------
// Status metadata
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: BookingStatus[] = [
  "pending",
  "accepted",
  "on_the_way",
  "in_progress",
  "completed",
  "cancelled",
]

function statusLabelKey(status: BookingStatus): TranslationKey {
  return (
    {
      pending: "statusPending",
      accepted: "statusAccepted",
      on_the_way: "statusOnTheWay",
      in_progress: "statusInProgress",
      completed: "statusCompleted",
      cancelled: "statusCancelled",
    }[status] ?? "status"
  ) as TranslationKey
}

type StatusStyle = { label: string; dot: string; chip: string }

function statusStyle(status: BookingStatus, t: T): StatusStyle {
  const label =
    {
      pending: t("statusPending"),
      accepted: t("statusAccepted"),
      on_the_way: t("statusOnTheWay"),
      in_progress: t("statusInProgress"),
      completed: t("statusCompleted"),
      cancelled: t("statusCancelled"),
    }[status] ?? t("status")

  const dot: Record<BookingStatus, string> = {
    pending: "bg-amber-500",
    accepted: "bg-blue-500",
    on_the_way: "bg-violet-500",
    in_progress: "bg-emerald-500",
    completed: "bg-slate-500",
    cancelled: "bg-red-500",
  }
  const chip: Record<BookingStatus, string> = {
    pending: "bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-300",
    accepted: "bg-blue-500/15 text-blue-700 hover:bg-blue-500/25 dark:text-blue-300",
    on_the_way: "bg-violet-500/15 text-violet-700 hover:bg-violet-500/25 dark:text-violet-300",
    in_progress: "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300",
    completed: "bg-slate-500/15 text-slate-700 hover:bg-slate-500/25 dark:text-slate-300",
    cancelled: "bg-red-500/15 text-red-700 hover:bg-red-500/25 dark:text-red-300",
  }
  return { label, dot: dot[status], chip: chip[status] }
}

function StatusPill({ status }: { status: BookingStatus }) {
  const { t } = useI18n()
  const s = statusStyle(status, t)
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={cn("size-2 rounded-full", s.dot)} />
      {s.label}
    </span>
  )
}

function BookingChip({
  booking,
  onSelect,
  showTime = true,
}: {
  booking: BookingWithRelations
  onSelect: (b: BookingWithRelations) => void
  showTime?: boolean
}) {
  const { t, lang } = useI18n()
  const s = statusStyle(booking.status, t)
  const title =
    (booking.customer?.full_name || booking.customer?.phone || "") +
    " · " +
    (lang === "ar" ? booking.service?.name_ar : booking.service?.name_en)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onSelect(booking)
      }}
      title={title}
      className={cn(
        "flex w-full cursor-pointer items-center gap-1.5 truncate rounded-md px-1.5 py-1 text-left text-xs font-medium transition-colors",
        s.chip
      )}
    >
      <span className="truncate">
        {showTime ? timeOfDay(parseISO(booking.scheduled_at)) + " " : ""}
        {booking.customer?.full_name ||
          booking.customer?.phone ||
          t("calCustomerName")}
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Booking control dialog (shared by every view)
// ---------------------------------------------------------------------------

function BookingDialog({
  booking,
  providers,
  open,
  onOpenChange,
}: {
  booking: BookingWithRelations | null
  providers: { id: string; full_name: string | null; phone: string | null }[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t, lang } = useI18n()
  const queryClient = useQueryClient()
  const [newStatus, setNewStatus] = React.useState<BookingStatus>(
    () => booking?.status ?? "pending"
  )
  const [newProvider, setNewProvider] = React.useState<string>(
    () => booking?.provider_id ?? "none"
  )
  const [saving, setSaving] = React.useState(false)

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["calendar-bookings"] })
    await queryClient.invalidateQueries({ queryKey: ["bookings"] })
    await queryClient.invalidateQueries({ queryKey: ["overview-stats"] })
    await queryClient.invalidateQueries({ queryKey: ["provider-job-counts"] })
    await queryClient.invalidateQueries({ queryKey: ["live-bookings"] })
    await queryClient.invalidateQueries({ queryKey: ["pool-bookings"] })
  }

  const saveChanges = async () => {
    if (!booking) return
    setSaving(true)
    const patch: Partial<Booking> = {}
    if (newStatus !== booking.status) patch.status = newStatus
    if (newProvider === "none") patch.provider_id = null
    else if (newProvider !== (booking.provider_id ?? "none"))
      patch.provider_id = newProvider
    if (Object.keys(patch).length === 0) {
      setSaving(false)
      onOpenChange(false)
      return
    }
    try {
      await updateBooking(booking.id, patch)
      await invalidate()
      toast.success(t("save"))
      onOpenChange(false)
    } catch (error) {
      console.error("updateBooking error:", error)
      toast.error(t("authError"))
    } finally {
      setSaving(false)
    }
  }

  if (!booking) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("bookingDetails")}</DialogTitle>
          <DialogDescription>
            {formatDateTime(booking.scheduled_at)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">{t("customer")}</dt>
              <dd className="font-medium">
                {booking.customer?.full_name || booking.customer?.phone || "—"}
                {booking.customer?.client_no
                  ? " (" + booking.customer.client_no + ")"
                  : ""}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("service")}</dt>
              <dd className="font-medium">
                {lang === "ar" ? booking.service?.name_ar : booking.service?.name_en}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("calCar")}</dt>
              <dd className="font-medium">
                {booking.car
                  ? `${booking.car.make} ${booking.car.model} · ${booking.car.plate_number}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("totalPrice")}</dt>
              <dd className="font-medium">
                {formatCurrency(booking.total_price)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("scheduledAt")}</dt>
              <dd className="font-medium">
                {formatDateTime(booking.scheduled_at)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("status")}</dt>
              <dd className="flex items-center gap-2">
                <StatusPill status={booking.status} />
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground">{t("address")}</dt>
              <dd className="font-medium">{booking.address || "—"}</dd>
            </div>
            {booking.note ? (
              <div className="col-span-2">
                <dt className="text-muted-foreground">{t("notes")}</dt>
                <dd className="font-medium">{booking.note}</dd>
              </div>
            ) : null}
          </dl>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium">{t("updateStatus")}</label>
            <Select
              value={newStatus}
              onValueChange={(v) => v && setNewStatus(v as BookingStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value) => t(statusLabelKey((value ?? "pending") as BookingStatus))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(statusLabelKey(s))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium">{t("assignedProvider")}</label>
            <Select value={newProvider} onValueChange={(v) => setNewProvider(v ?? "none")}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value) => {
                    const v = String(value ?? "none")
                    if (v === "none" || !v) return t("noProvider")
                    const p = providers.find((p) => p.id === v)
                    return p ? p.full_name || p.phone || p.id : t("noProvider")
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("noProvider")}</SelectItem>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name || p.phone || p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("close")}
          </Button>
          <Button onClick={saveChanges} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {saving ? t("verifying") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Month view
// ---------------------------------------------------------------------------

function MonthView({
  cursor,
  bookings,
  onSelect,
}: {
  cursor: Date
  bookings: BookingWithRelations[]
  onSelect: (b: BookingWithRelations) => void
}) {
  const { t, lang } = useI18n()
  const weekStartsOn = WEEK_START[lang] ?? 1
  const monthStart = startOfMonth(cursor)
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn }),
    end: endOfWeek(endOfMonth(monthStart), { weekStartsOn }),
  })
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))

  return (
    <Card>
      <CardHeader className="border-b pb-3">
        <div className="grid grid-cols-7 text-center text-xs font-semibold text-muted-foreground">
          {weeks[0].map((d) => (
            <div key={d.toISOString()} className="py-1">
              {weekdayLabel(t, d)}
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-7 divide-x divide-y divide-border border-t">
          {days.map((day) => {
            const inMonth = isSameMonth(day, monthStart)
            const dayBookings = bookings.filter((b) =>
              isSameDay(parseISO(b.scheduled_at), day)
            )
            const MAX = 3
            const visible = dayBookings.slice(0, MAX)
            const hidden = dayBookings.length - visible.length
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "flex min-h-24 flex-col gap-1 p-1.5",
                  !inMonth && "bg-muted/40",
                  isWeekend(day, lang) && "bg-muted/20"
                )}
              >
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs",
                    isToday(day) &&
                      "bg-primary font-semibold text-primary-foreground",
                    !isToday(day) && "text-muted-foreground"
                  )}
                >
                  {format(day, "d")}
                </div>
                {visible.map((b) => (
                  <BookingChip key={b.id} booking={b} onSelect={onSelect} />
                ))}
                {hidden > 0 ? (
                  <button
                    type="button"
                    onClick={() => onSelect(dayBookings[0] as BookingWithRelations)}
                    className="cursor-pointer px-1.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    {t("calMore").replace("{count}", String(hidden))}
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Week / Day timeline (shared card grid)
// ---------------------------------------------------------------------------

function DayCard({
  day,
  bookings,
  onSelect,
}: {
  day: Date
  bookings: BookingWithRelations[]
  onSelect: (b: BookingWithRelations) => void
}) {
  const { t } = useI18n()
  const dayBookings = bookings
    .filter((b) => isSameDay(parseISO(b.scheduled_at), day))
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm">{weekdayLabel(t, day)}</CardTitle>
        <Badge variant={isToday(day) ? "default" : "outline"} className="shrink-0">
          {format(day, "d")} {monthLabel(t, day)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {dayBookings.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {t("calNoBookings")}
          </p>
        ) : (
          dayBookings.map((b) => (
            <BookingChip key={b.id} booking={b} onSelect={onSelect} />
          ))
        )}
      </CardContent>
    </Card>
  )
}

function WeekView({
  cursor,
  bookings,
  onSelect,
}: {
  cursor: Date
  bookings: BookingWithRelations[]
  onSelect: (b: BookingWithRelations) => void
}) {
  const { lang } = useI18n()
  const weekStartsOn = WEEK_START[lang] ?? 1
  const days = eachDayOfInterval({
    start: startOfWeek(cursor, { weekStartsOn }),
    end: endOfWeek(cursor, { weekStartsOn }),
  })
  // Group bookings by day to avoid re-filtering per card while keeping typing.
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {days.map((day) => (
        <DayCard key={day.toISOString()} day={day} bookings={bookings} onSelect={onSelect} />
      ))}
    </div>
  )
}

function DayView({
  cursor,
  bookings,
  onSelect,
}: {
  cursor: Date
  bookings: BookingWithRelations[]
  onSelect: (b: BookingWithRelations) => void
}) {
  const { t } = useI18n()
  const dayBookings = bookings
    .filter((b) => isSameDay(parseISO(b.scheduled_at), cursor))
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {weekdayLabel(t, cursor)} {format(cursor, "d")} {monthLabel(t, cursor)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {dayBookings.length === 0 ? (
          <EmptyState message={t("calNoBookings")} />
        ) : (
          dayBookings.map((b) => (
            <BookingChip key={b.id} booking={b} onSelect={onSelect} />
          ))
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Agenda view
// ---------------------------------------------------------------------------

function AgendaView({
  rangeLabel,
  bookings,
  onSelect,
}: {
  rangeLabel: string
  bookings: BookingWithRelations[]
  onSelect: (b: BookingWithRelations) => void
}) {
  const { t, lang } = useI18n()
  const sorted = [...bookings].sort((a, b) =>
    a.scheduled_at.localeCompare(b.scheduled_at)
  )
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{rangeLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <EmptyState message={t("calNoBookings")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="px-2 py-2 text-start font-medium">{t("calTime")}</th>
                  <th className="px-2 py-2 text-start font-medium">{t("calCustomerName")}</th>
                  <th className="px-2 py-2 text-start font-medium">{t("service")}</th>
                  <th className="px-2 py-2 text-start font-medium">{t("provider")}</th>
                  <th className="px-2 py-2 text-start font-medium">{t("status")}</th>
                  <th className="px-2 py-2 text-start font-medium">{t("amount")}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((b) => {
                  const st = parseISO(b.scheduled_at)
                  return (
                    <tr
                      key={b.id}
                      className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                      onClick={() => onSelect(b)}
                    >
                      <td className="px-2 py-2">
                        <div className="text-xs text-muted-foreground">
                          {weekdayLabel(t, st)}{" "}
                          {format(st, "d")} {monthLabel(t, st)}
                        </div>
                        <div className="font-medium">{timeOfDay(st)}</div>
                      </td>
                      <td className="px-2 py-2">
                        {b.customer?.full_name || b.customer?.phone || "—"}
                        {b.customer?.client_no ? " (" + b.customer.client_no + ")" : ""}
                      </td>
                      <td className="px-2 py-2">
                        {lang === "ar" ? b.service?.name_ar : b.service?.name_en}
                      </td>
                      <td className="px-2 py-2">{b.provider?.full_name || "—"}</td>
                      <td className="px-2 py-2">
                        <StatusPill status={b.status} />
                      </td>
                      <td className="px-2 py-2 text-end">
                        {formatCurrency(b.total_price)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Captains (movements) view
// ---------------------------------------------------------------------------

function CaptainsView({
  bookings,
  locations,
}: {
  bookings: BookingWithRelations[]
  locations: CaptainLocation[]
}) {
  const { t, lang } = useI18n()
  const { data: providers = [], isLoading, isError, refetch } = useProviders()

  // Newest GPS row per captain.
  const byProvider = new Map<string, CaptainLocation>()
  for (const loc of locations) {
    const existing = byProvider.get(loc.provider_id)
    if (!existing || new Date(loc.updated_at) > new Date(existing.updated_at)) {
      byProvider.set(loc.provider_id, loc)
    }
  }

  // Bookings grouped by assigned provider (movements in the range).
  const byCaptain = new Map<string, BookingWithRelations[]>()
  for (const b of bookings) {
    if (!b.provider_id) continue
    const list = byCaptain.get(b.provider_id) ?? []
    list.push(b)
    byCaptain.set(b.provider_id, list)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {isLoading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))
      ) : isError ? (
        <div className="lg:col-span-2">
          <ErrorState onRetry={() => refetch()} />
        </div>
      ) : providers.length === 0 ? (
        <div className="lg:col-span-2">
          <EmptyState message={t("emptyProviders")} />
        </div>
      ) : (
        providers.map((p) => {
          const loc = byProvider.get(p.id)
          const assignments = byCaptain.get(p.id) ?? []
          return (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Users className="size-4" />
                  </span>
                  {p.full_name || p.phone || p.id}
                </CardTitle>
                <Badge variant={p.is_available ? "default" : "outline"}>
                  {p.is_available ? t("active") : t("availability")}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-4 shrink-0" />
                  {loc ? (
                    <span>
                      {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}{" "}
                      <span className="text-xs">· {formatDateTime(loc.updated_at)}</span>
                    </span>
                  ) : (
                    <span>{t("calNoLocation")}</span>
                  )}
                </div>
                <div>
                  <div className="mb-1.5 flex items-center gap-2 text-sm font-medium">
                    <Car className="size-4 text-muted-foreground" />
                    {t("calAssignments")}
                    <span className="text-muted-foreground">({assignments.length})</span>
                  </div>
                  {assignments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("calNoAssignments")}</p>
                  ) : (
                    <div className="space-y-1">
                      {assignments.map((b) => (
                        <div key={b.id} className="rounded-md border px-2 py-1 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-medium">
                              {lang === "ar" ? b.service?.name_ar : b.service?.name_en}
                            </span>
                            <StatusPill status={b.status} />
                          </div>
                          <div className="text-muted-foreground">
                            {formatDateTime(b.scheduled_at)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

type ViewKey = "month" | "week" | "day" | "agenda" | "captains"

export function CalendarPage() {
  const { t, lang } = useI18n()
  const [view, setView] = React.useState<ViewKey>("month")
  const [cursor, setCursor] = React.useState<Date>(new Date())
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [captainFilter, setCaptainFilter] = React.useState<string>("all")
  const [selected, setSelected] = React.useState<BookingWithRelations | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const weekStartsOn = WEEK_START[lang] ?? 1

  // Compute the visible range from the current view + cursor.
  const range = React.useMemo(() => {
    switch (view) {
      case "month":
        return {
          start: startOfWeek(startOfMonth(cursor), { weekStartsOn }),
          end: endOfWeek(endOfMonth(cursor), { weekStartsOn }),
        }
      case "week":
        return {
          start: startOfWeek(cursor, { weekStartsOn }),
          end: endOfWeek(cursor, { weekStartsOn }),
        }
      case "day":
        return { start: startOfDay(cursor), end: endOfDay(cursor) }
      case "agenda":
        return {
          start: startOfWeek(cursor, { weekStartsOn }),
          end: endOfWeek(cursor, { weekStartsOn }),
        }
      case "captains":
        return { start: startOfMonth(cursor), end: endOfMonth(cursor) }
    }
  }, [view, cursor, weekStartsOn])

  const bookingsQuery = useCalendarBookings(range.start.toISOString(), range.end.toISOString())
  const locationsQuery = useCaptainLocations()
  const { data: providers = [] } = useProviders()

  const navigate = (dir: 1 | -1) => {
    setCursor((c) =>
      view === "month"
        ? addMonths(c, dir)
        : view === "week" || view === "agenda"
          ? addWeeks(c, dir)
          : addDays(c, dir)
    )
  }

  const rangeLabel = React.useMemo(() => {
    const s = range.start
    const e = range.end
    const hasYear = s.getFullYear() !== e.getFullYear()
    return `${format(s, "d")} ${monthLabel(t, s)}${hasYear ? " " + s.getFullYear() : ""} — ${format(e, "d")} ${monthLabel(t, e)} ${e.getFullYear()}`
  }, [range, t])

  const filtered = (bookingsQuery.data ?? []).filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false
    if (captainFilter !== "all" && b.provider_id !== captainFilter) return false
    return true
  })

  const openBooking = (b: BookingWithRelations) => {
    setSelected(b)
    setDialogOpen(true)
  }

  const monthTitle = `${monthLabel(t, cursor)} ${cursor.getFullYear()}`
  const dayTitle =
    view === "day"
      ? `${weekdayLabel(t, cursor)} ${format(cursor, "d")} ${monthLabel(t, cursor)}`
      : ""

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("calendarTitle")} description={t("calendarDesc")} />

      {/* View + navigation toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(-1)}
              title={t("calPrev")}
              aria-label={t("calPrev")}
            >
              {lang === "ar" ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronLeft className="size-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(1)}
              title={t("calNext")}
              aria-label={t("calNext")}
            >
              {lang === "ar" ? (
                <ChevronLeft className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </Button>
            <Button variant="outline" onClick={() => setCursor(new Date())}>
              {t("calToday")}
            </Button>
            <div className="ms-2 text-sm font-semibold">
              {view === "month" ? monthTitle : view === "day" ? dayTitle : rangeLabel}
            </div>
          </div>

          <Tabs value={view} onValueChange={(v) => setView((v as ViewKey) ?? "month")}>
            <TabsList>
              <TabsTrigger value="month">{t("calMonth")}</TabsTrigger>
              <TabsTrigger value="week">{t("calWeek")}</TabsTrigger>
              <TabsTrigger value="day">{t("calDay")}</TabsTrigger>
              <TabsTrigger value="agenda">{t("calAgenda")}</TabsTrigger>
              <TabsTrigger value="captains">{t("calCaptains")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Filters + count */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={t("status")}>
                {(value) =>
                  value === "all" || value === null
                    ? t("calFilterStatus")
                    : t(statusLabelKey((value as BookingStatus) ?? "pending"))
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("calFilterStatus")}</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(statusLabelKey(s))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={captainFilter} onValueChange={(v) => setCaptainFilter(v ?? "all")}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={t("provider")}>
                {(value) => {
                  const v = String(value ?? "all")
                  if (v === "all" || !v) return t("calFilterCaptain")
                  const p = providers.find((p) => p.id === v)
                  return p ? p.full_name || p.phone || p.id : t("calFilterCaptain")
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("calFilterCaptain")}</SelectItem>
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name || p.phone || p.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {bookingsQuery.isLoading ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              {t("loading")}
            </span>
          ) : (
            <Badge variant="outline" className="gap-1.5">
              <CalendarRange className="size-3" />
              {t("calBookingsOn")}: {filtered.length}
            </Badge>
          )}
        </div>
      </div>

      {/* View body */}
      {bookingsQuery.isError ? (
        <ErrorState onRetry={() => bookingsQuery.refetch()} />
      ) : bookingsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : view === "month" ? (
        <MonthView cursor={cursor} bookings={filtered} onSelect={openBooking} />
      ) : view === "week" ? (
        <WeekView cursor={cursor} bookings={filtered} onSelect={openBooking} />
      ) : view === "day" ? (
        <DayView cursor={cursor} bookings={filtered} onSelect={openBooking} />
      ) : view === "agenda" ? (
        <AgendaView rangeLabel={rangeLabel} bookings={filtered} onSelect={openBooking} />
      ) : (
        <CaptainsView bookings={filtered} locations={locationsQuery.data ?? []} />
      )}

      <BookingDialog
        key={selected?.id ?? "none"}
        booking={selected}
        providers={providers}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
