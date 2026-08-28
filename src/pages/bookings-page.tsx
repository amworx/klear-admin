import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  useBookings,
  useProviders,
  updateBooking,
} from "@/lib/hooks/queries"
import { useI18n, formatCurrency, formatDateTime } from "@/lib/i18n"
import type { BookingStatus, BookingWithRelations } from "@/lib/types"
import {
  PageHeader,
  ErrorState,
  EmptyState,
} from "@/components/layout/page-utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Search, ArrowLeft, ArrowRight, ChevronRight } from "lucide-react"

const STATUS_OPTIONS: BookingStatus[] = [
  "pending",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
]

const STATUS_BADGE: Record<BookingStatus, string> = {
  pending: "bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300",
  accepted: "bg-blue-500/15 text-blue-700 hover:bg-blue-500/15 dark:text-blue-300",
  on_the_way: "bg-violet-500/15 text-violet-700 hover:bg-violet-500/15 dark:text-violet-300",
  in_progress: "bg-indigo-500/15 text-indigo-700 hover:bg-indigo-500/15 dark:text-indigo-300",
  completed: "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300",
  cancelled: "bg-slate-500/15 text-slate-600 hover:bg-slate-500/15 dark:text-slate-300",
}

export function BookingsPage() {
  const { t, lang } = useI18n()
  const queryClient = useQueryClient()
  const bookings = useBookings()
  const providers = useProviders()

  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [selected, setSelected] = React.useState<BookingWithRelations | null>(
    null
  )
  const [newStatus, setNewStatus] = React.useState<BookingStatus>("pending")
  const [newProvider, setNewProvider] = React.useState<string>("none")
  const [saving, setSaving] = React.useState(false)

  const statusLabel: Record<string, string> = {
    pending: t("statusPending"),
    accepted: t("statusAccepted"),
    in_progress: t("statusInProgress"),
    completed: t("statusCompleted"),
    cancelled: t("statusCancelled"),
  }

  const filtered = (bookings.data ?? []).filter((b) => {
    const q = search.trim().toLowerCase()
    const matchesSearch =
      !q ||
      (b.customer?.full_name ?? "").toLowerCase().includes(q) ||
      (b.customer?.phone ?? "").toLowerCase().includes(q) ||
      (b.customer?.client_no ?? "").toLowerCase().includes(q) ||
      (b.service?.name_ar ?? "").toLowerCase().includes(q) ||
      (b.service?.name_en ?? "").toLowerCase().includes(q) ||
      (b.address ?? "").toLowerCase().includes(q)
    const matchesStatus = statusFilter === "all" || b.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const openDetails = (b: BookingWithRelations) => {
    setSelected(b)
    setNewStatus(b.status)
    setNewProvider(b.provider_id ?? "none")
  }

  const saveChanges = async () => {
    if (!selected) return
    setSaving(true)
    const patch: Record<string, unknown> = {}
    if (newStatus !== selected.status) patch.status = newStatus
    if (newProvider === "none") patch.provider_id = null
    else if (newProvider !== (selected.provider_id ?? "none"))
      patch.provider_id = newProvider
    if (Object.keys(patch).length === 0) {
      setSaving(false)
      return
    }
    try {
      await updateBooking(selected.id, patch)
      await queryClient.invalidateQueries({ queryKey: ["bookings"] })
      await queryClient.invalidateQueries({ queryKey: ["overview-stats"] })
      await queryClient.invalidateQueries({ queryKey: ["provider-job-counts"] })
      toast.success(t("save"))
      setSelected((cur) =>
        cur ? { ...cur, status: newStatus, provider_id: newProvider === "none" ? null : newProvider } : cur
      )
    } catch (error) {
      console.error("updateBooking error:", error)
      toast.error(t("authError"))
    } finally {
      setSaving(false)
    }
  }

  const BackIcon = lang === "ar" ? ArrowRight : ArrowLeft

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("navBookings")} description={t("appTagline")} />

      <div className="h-[calc(100vh-11rem)] min-h-[28rem] overflow-hidden rounded-lg border bg-background">
        {/* Email-client style 3-column split: [list] [detail] */}
        <div className="grid h-full grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          {/* Column 2 — master list */}
          <div
            className={`flex min-w-0 flex-col border-e ${
              selected ? "hidden md:flex" : "flex"
            }`}
          >
            <div className="flex flex-col gap-2 border-b p-3">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="ps-9"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v ?? "all")}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder={t("status")}>
                    {(value) =>
                      value === "all" || value === null
                        ? t("all")
                        : statusLabel[String(value)] ?? t("status")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("all")}</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabel[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {bookings.isLoading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : bookings.isError ? (
                <div className="p-3">
                  <ErrorState onRetry={() => bookings.refetch()} />
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-3">
                  <EmptyState message={t("emptyBookings")} />
                </div>
              ) : (
                <ul className="divide-y">
                  {filtered.map((b) => {
                    const isActive = selected?.id === b.id
                    return (
                      <li key={b.id}>
                        <button
                          onClick={() => openDetails(b)}
                          className={`flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-accent/60 ${
                            isActive
                              ? "bg-accent text-accent-foreground"
                              : "text-foreground"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-medium">
                                {b.customer?.full_name ||
                                  b.customer?.phone ||
                                  "—"}
                              </span>
                              <span className="shrink-0 text-xs font-semibold tabular-nums">
                                {formatCurrency(b.total_price)}
                              </span>
                            </div>
                            <div className="mt-0.5 truncate text-xs text-muted-foreground">
                              {lang === "ar" ? b.service?.name_ar : b.service?.name_en}
                              {" · "}
                              {formatDateTime(b.scheduled_at)}
                            </div>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <Badge
                                variant="secondary"
                                className={`border-0 ${STATUS_BADGE[b.status]}`}
                              >
                                {statusLabel[b.status]}
                              </Badge>
                              {b.customer?.client_no ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                                  <span className="opacity-70">
                                    {t("clientId")}:
                                  </span>
                                  <span className="font-semibold">
                                    {b.customer.client_no}
                                  </span>
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <ChevronRight className="size-4 shrink-0 opacity-50 rtl:rotate-180" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Column 3 — detail pane */}
          <div className={`min-w-0 ${selected ? "flex" : "hidden md:flex"}`}>
            {selected ? (
              <div className="flex w-full flex-col">
                <div className="flex items-center gap-2 border-b p-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setSelected(null)}
                    aria-label={t("close")}
                  >
                    <BackIcon className="size-4" />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-sm font-semibold">
                        {selected.customer?.full_name ||
                          selected.customer?.phone ||
                          "—"}
                      </h2>
                      {selected.customer?.client_no ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          <span className="opacity-70">{t("clientId")}:</span>
                          <span className="font-semibold">
                            {selected.customer.client_no}
                          </span>
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDateTime(selected.created_at)}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`border-0 ${STATUS_BADGE[selected.status]}`}
                  >
                    {statusLabel[selected.status]}
                  </Badge>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="space-y-6 p-4">
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-muted-foreground">{t("customer")}</dt>
                        <dd className="flex flex-wrap items-center gap-2 font-medium">
                          <span>
                            {selected.customer?.full_name ||
                              selected.customer?.phone ||
                              "—"}
                          </span>
                          {selected.customer?.client_no ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                              <span className="opacity-70">
                                {t("clientId")}:
                              </span>
                              <span className="font-semibold">
                                {selected.customer.client_no}
                              </span>
                            </span>
                          ) : null}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{t("service")}</dt>
                        <dd className="font-medium">
                          {lang === "ar"
                            ? selected.service?.name_ar
                            : selected.service?.name_en}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{t("scheduledAt")}</dt>
                        <dd className="font-medium">
                          {formatDateTime(selected.scheduled_at)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{t("totalPrice")}</dt>
                        <dd className="font-medium">
                          {formatCurrency(selected.total_price)}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">{t("address")}</dt>
                        <dd className="font-medium">{selected.address || "—"}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">{t("notes")}</dt>
                        <dd className="whitespace-pre-wrap font-medium">
                          {selected.note || "—"}
                        </dd>
                      </div>
                    </dl>

                    <div className="rounded-lg border">
                      <div className="border-b px-4 py-3">
                        <h3 className="text-sm font-semibold">
                          {t("bookingDetails")}
                        </h3>
                      </div>
                      <div className="grid gap-4 p-4">
                        <div className="grid gap-1.5">
                          <label className="text-sm font-medium">
                            {t("updateStatus")}
                          </label>
                          <Select
                            value={newStatus}
                            onValueChange={(v) =>
                              v && setNewStatus(v as BookingStatus)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue>
                                {(value) =>
                                  statusLabel[String(value)] ?? t("status")
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {statusLabel[s]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-1.5">
                          <label className="text-sm font-medium">
                            {t("assignedProvider")}
                          </label>
                          <Select
                            value={newProvider}
                            onValueChange={(v) =>
                              setNewProvider(v ?? "none")
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue>
                                {(value) => {
                                  const v = String(value ?? "none")
                                  if (v === "none" || !v) return t("noProvider")
                                  const p = (providers.data ?? []).find(
                                    (p) => p.id === v
                                  )
                                  return p
                                    ? p.full_name || p.phone || p.id
                                    : t("noProvider")
                                }}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                {t("noProvider")}
                              </SelectItem>
                              {(providers.data ?? []).map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.full_name || p.phone || p.id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          onClick={saveChanges}
                          disabled={saving}
                          className="w-full"
                        >
                          {saving ? t("verifying") : t("save")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <ChevronRight className="size-5 text-muted-foreground rtl:rotate-180" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("selectABooking")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
