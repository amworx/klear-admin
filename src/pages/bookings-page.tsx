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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Search } from "lucide-react"

const STATUS_OPTIONS: BookingStatus[] = [
  "pending",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
]

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
  const [detailOpen, setDetailOpen] = React.useState(false)
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
    setDetailOpen(true)
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
      setDetailOpen(false)
      return
    }
    try {
      await updateBooking(selected.id, patch)
      await queryClient.invalidateQueries({ queryKey: ["bookings"] })
      await queryClient.invalidateQueries({ queryKey: ["overview-stats"] })
      await queryClient.invalidateQueries({ queryKey: ["provider-job-counts"] })
      toast.success(t("save"))
      setDetailOpen(false)
    } catch (error) {
      console.error("updateBooking error:", error)
      toast.error(t("authError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("navBookings")} description={t("appTagline")} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="ps-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={t("status")} />
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

      {bookings.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : bookings.isError ? (
        <ErrorState onRetry={() => bookings.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState message={t("emptyBookings")} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("customer")}</TableHead>
                <TableHead>{t("service")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("scheduledAt")}</TableHead>
                <TableHead>{t("provider")}</TableHead>
                <TableHead className="text-end">{t("amount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((b) => (
                <TableRow
                  key={b.id}
                  className="cursor-pointer"
                  onClick={() => openDetails(b)}
                >
                  <TableCell>
                    {b.customer?.full_name || b.customer?.phone || "—"}
                  </TableCell>
                  <TableCell>
                    {lang === "ar" ? b.service?.name_ar : b.service?.name_en}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{statusLabel[b.status]}</Badge>
                  </TableCell>
                  <TableCell>{formatDateTime(b.scheduled_at)}</TableCell>
                  <TableCell>
                    {b.provider?.full_name || t("noProvider")}
                  </TableCell>
                  <TableCell className="text-end">
                    {formatCurrency(b.total_price)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("bookingDetails")}</DialogTitle>
            <DialogDescription>
              {formatDateTime(selected?.created_at ?? null)}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">{t("customer")}</dt>
                  <dd className="font-medium">
                    {selected.customer?.full_name ||
                      selected.customer?.phone ||
                      "—"}
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
                  <dd className="font-medium">{selected.note || "—"}</dd>
                </div>
              </dl>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("updateStatus")}</label>
                <Select
                  value={newStatus}
                  onValueChange={(v) => v && setNewStatus(v as BookingStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
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

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("assignedProvider")}
                </label>
                <Select value={newProvider} onValueChange={(v) => setNewProvider(v ?? "none")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("noProvider")}</SelectItem>
                    {(providers.data ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name || p.phone || p.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              {t("close")}
            </Button>
            <Button onClick={saveChanges} disabled={saving}>
              {saving ? t("verifying") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}