import { useQueryClient } from "@tanstack/react-query"
import {
  useProviders,
  useProviderJobCounts,
  updateProviderProfile,
  deleteProvider,
} from "@/lib/hooks/queries"
import { useI18n, formatDateTime } from "@/lib/i18n"
import type { Profile } from "@/lib/types"
import {
  PageHeader,
  ErrorState,
  EmptyState,
  StatCard,
} from "@/components/layout/page-utils"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
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
import { toast } from "sonner"
import {
  AddUserDialog,
  AddUserTrigger,
} from "@/components/add-user-dialog"
import { Briefcase, CircleDot, Pencil, Trash2, Truck } from "lucide-react"
import * as React from "react"

export function ProvidersPage() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const providers = useProviders()
  const jobCounts = useProviderJobCounts()

  const activeCount = (providers.data ?? []).filter((p) => p.is_available).length

  const [editing, setEditing] = React.useState<Profile | null>(null)
  const [editOpen, setEditOpen] = React.useState(false)
  const [form, setForm] = React.useState({
    full_name: "",
    phone: "",
    is_active: true,
    is_available: true,
  })
  const [saving, setSaving] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<Profile | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const openEdit = (p: Profile) => {
    setEditing(p)
    setForm({
      full_name: p.full_name ?? "",
      phone: p.phone ?? "",
      is_active: p.is_active,
      is_available: p.is_available,
    })
    setEditOpen(true)
  }

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const save = async () => {
    if (!editing) return
    const name = form.full_name.trim()
    if (!name) {
      toast.error(t("authError"))
      return
    }
    setSaving(true)
    try {
      await updateProviderProfile(editing.id, {
        full_name: name,
        phone: form.phone.trim() || null,
        is_active: form.is_active,
        is_available: form.is_available,
      })
      await queryClient.invalidateQueries({ queryKey: ["providers"] })
      toast.success(t("providerUpdated"))
      setEditOpen(false)
    } catch (error) {
      console.error("updateProviderProfile error:", error)
      toast.error(t("authError"))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteProvider(deleteTarget.id)
      await queryClient.invalidateQueries({ queryKey: ["providers"] })
      toast.success(t("providerDeleted"))
      setDeleteTarget(null)
    } catch (error) {
      console.error("deleteProvider error:", error)
      toast.error(t("providerDeleteBlocked"))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          title={t("navProviders")}
          description={t("appTagline")}
        />
        <AddUserDialog
          role="provider"
          trigger={<AddUserTrigger label={t("addProvider")} />}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          title={t("navProviders")}
          value={(providers.data ?? []).length}
          icon={Truck}
        />
        <StatCard
          title={t("availability")}
          value={activeCount}
          icon={CircleDot}
        />
      </div>

      {providers.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : providers.isError ? (
        <ErrorState onRetry={() => providers.refetch()} />
      ) : (providers.data ?? []).length === 0 ? (
        <EmptyState message={t("emptyProviders")} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("navProviders")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("fullName")}</TableHead>
                  <TableHead>{t("phone")}</TableHead>
                  <TableHead>{t("availability")}</TableHead>
                  <TableHead>{t("assignedJobs")}</TableHead>
                  <TableHead>{t("memberSince")}</TableHead>
                  <TableHead className="text-end">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(providers.data ?? []).map((p) => {
                  const counts = jobCounts.data?.[p.id]
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{p.full_name || "—"}</TableCell>
                      <TableCell dir="ltr">{p.phone || "—"}</TableCell>
                      <TableCell>
                        {p.is_available ? (
                          <Badge variant="outline" className="text-green-600">
                            {t("active")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">{t("blocked")}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Briefcase className="size-4 text-muted-foreground" />
                          {counts?.total ?? 0}
                          <span className="text-xs text-muted-foreground">
                            ({counts?.active ?? 0} {t("statusInProgress")})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDateTime(p.created_at)}</TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(p)}
                          >
                            <Pencil className="size-4" />
                            <span className="sr-only">{t("edit")}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => setDeleteTarget(p)}
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only">{t("delete")}</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("editProvider")}</DialogTitle>
            <DialogDescription>{t("appTagline")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="provider_full_name">{t("fullName")}</Label>
              <Input
                id="provider_full_name"
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="provider_phone">{t("phone")}</Label>
              <Input
                id="provider_phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="provider_is_active">{t("accountStatus")}</Label>
              <Switch
                id="provider_is_active"
                checked={form.is_active}
                onCheckedChange={(v) => set("is_active", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="provider_is_available">{t("availabilityToggle")}</Label>
              <Switch
                id="provider_is_available"
                checked={form.is_available}
                onCheckedChange={(v) => set("is_available", v)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? t("verifying") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.full_name ? `${deleteTarget.full_name} — ` : ""}
              {t("deleteProviderConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={remove} disabled={deleting}>
              {deleting ? t("verifying") : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}