import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  useClients,
  useClientCars,
  useClientAddresses,
  setClientActive,
} from "@/lib/hooks/queries"
import { useI18n, formatDateTime } from "@/lib/i18n"
import type { Profile } from "@/lib/types"
import {
  PageHeader,
  ErrorState,
  EmptyState,
} from "@/components/layout/page-utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Ban, Search, ShieldCheck } from "lucide-react"

export function ClientsPage() {
  const { t, lang } = useI18n()
  const queryClient = useQueryClient()
  const clients = useClients()

  const [search, setSearch] = React.useState("")
  const [selected, setSelected] = React.useState<Profile | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [blockTarget, setBlockTarget] = React.useState<Profile | null>(null)
  const [busy, setBusy] = React.useState(false)

  const cars = useClientCars(selected?.id ?? "")
  const addresses = useClientAddresses(selected?.id ?? "")

  const filtered = (clients.data ?? []).filter((c) => {
    const q = search.trim().toLowerCase()
    return (
      !q ||
      (c.full_name ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q)
    )
  })

  const toggleBlock = async () => {
    if (!blockTarget) return
    setBusy(true)
    const nextActive = !blockTarget.is_active
    try {
      await setClientActive(blockTarget.id, nextActive)
      await queryClient.invalidateQueries({ queryKey: ["clients"] })
      await queryClient.invalidateQueries({ queryKey: ["overview-stats"] })
      toast.success(nextActive ? t("userUnblocked") : t("userBlocked"))
      setBlockTarget(null)
    } catch (error) {
      console.error("setClientActive error:", error)
      toast.error(t("authError"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("navClients")} description={t("appTagline")} />

      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="ps-9"
        />
      </div>

      {clients.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : clients.isError ? (
        <ErrorState onRetry={() => clients.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState message={t("emptyClients")} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("fullName")}</TableHead>
                <TableHead>{t("phone")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("memberSince")}</TableHead>
                <TableHead className="text-end">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelected(c)
                    setDetailOpen(true)
                  }}
                >
                  <TableCell>{c.full_name || "—"}</TableCell>
                  <TableCell dir="ltr">{c.phone || "—"}</TableCell>
                  <TableCell>
                    {c.is_active ? (
                      <Badge variant="outline" className="text-green-600">
                        {t("active")}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">{t("blocked")}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDateTime(c.created_at)}</TableCell>
                  <TableCell className="text-end" onClick={(e) => e.stopPropagation()}>
                    {c.is_active ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setBlockTarget(c)}
                      >
                        <Ban className="size-4" />
                        {t("block")}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBlockTarget(c)}
                      >
                        <ShieldCheck className="size-4" />
                        {t("unblock")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Client details */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("clientDetails")}</DialogTitle>
            <DialogDescription>
              {selected?.full_name || selected?.phone || "—"}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="space-y-5">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">{t("fullName")}</dt>
                  <dd className="font-medium">{selected.full_name || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("phone")}</dt>
                  <dd className="font-medium" dir="ltr">
                    {selected.phone || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("role")}</dt>
                  <dd className="font-medium">{selected.role}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("status")}</dt>
                  <dd className="font-medium">
                    {selected.is_active ? t("active") : t("blocked")}
                  </dd>
                </div>
              </dl>

              <div>
                <h4 className="mb-2 text-sm font-semibold">{t("cars")}</h4>
                {cars.isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (cars.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">—</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {(cars.data ?? []).map((car) => (
                      <li
                        key={car.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2"
                      >
                        <span>
                          {car.make} {car.model} —{" "}
                          <span dir="ltr">{car.plate_number}</span>
                        </span>
                        <Badge variant="secondary">
                          {lang === "ar"
                            ? car.size === "small"
                              ? "صغير"
                              : car.size === "large"
                                ? "كبير"
                                : "متوسط"
                            : car.size}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold">{t("addresses")}</h4>
                {addresses.isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (addresses.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">—</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {(addresses.data ?? []).map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2"
                      >
                        <span>{a.address}</span>
                        {a.is_default ? (
                          <Badge variant="secondary">{t("active")}</Badge>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              {t("close")}
            </Button>
            {selected?.is_active ? (
              <Button
                variant="destructive"
                onClick={() => {
                  setBlockTarget(selected)
                  setDetailOpen(false)
                }}
              >
                <Ban className="size-4" />
                {t("block")}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setBlockTarget(selected)
                  setDetailOpen(false)
                }}
              >
                <ShieldCheck className="size-4" />
                {t("unblock")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block/unblock confirm */}
      <AlertDialog
        open={!!blockTarget}
        onOpenChange={(open) => {
          if (!open) setBlockTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {blockTarget?.is_active ? t("confirmBlock") : t("confirmUnblock")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {blockTarget?.full_name || blockTarget?.phone || "—"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={toggleBlock} disabled={busy}>
              {busy ? t("verifying") : t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}