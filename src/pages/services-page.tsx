import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  useServices,
  upsertService,
  deleteService,
} from "@/lib/hooks/queries"
import { useI18n, formatCurrency } from "@/lib/i18n"
import type { Service } from "@/lib/types"
import {
  PageHeader,
  ErrorState,
  EmptyState,
} from "@/components/layout/page-utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import { Pencil, Plus, Trash2 } from "lucide-react"

type ServiceForm = {
  name_ar: string
  name_en: string
  desc_ar: string
  desc_en: string
  base_price: string
  duration_min: string
  sort: string
  is_active: boolean
  currency: string
}

const EMPTY_FORM: ServiceForm = {
  name_ar: "",
  name_en: "",
  desc_ar: "",
  desc_en: "",
  base_price: "",
  duration_min: "",
  sort: "0",
  is_active: true,
  currency: "SYP",
}

export function ServicesPage() {
  const { t, lang } = useI18n()
  const queryClient = useQueryClient()
  const services = useServices()

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Service | null>(null)
  const [form, setForm] = React.useState<ServiceForm>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<Service | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (s: Service) => {
    setEditing(s)
    setForm({
      name_ar: s.name_ar,
      name_en: s.name_en,
      desc_ar: s.desc_ar ?? "",
      desc_en: s.desc_en ?? "",
      base_price: String(s.base_price),
      duration_min: s.duration_min != null ? String(s.duration_min) : "",
      sort: String(s.sort),
      is_active: s.is_active,
      currency: s.currency,
    })
    setFormOpen(true)
  }

  const save = async () => {
    if (!form.name_ar.trim() || !form.name_en.trim()) {
      toast.error(t("authError"))
      return
    }
    setSaving(true)
    try {
      await upsertService({
        ...(editing ? { id: editing.id } : {}),
        name_ar: form.name_ar.trim(),
        name_en: form.name_en.trim(),
        desc_ar: form.desc_ar.trim() || null,
        desc_en: form.desc_en.trim() || null,
        base_price: Number(form.base_price) || 0,
        duration_min: form.duration_min ? Number(form.duration_min) : null,
        sort: Number(form.sort) || 0,
        is_active: form.is_active,
        currency: form.currency.trim() || "SYP",
      })
      await queryClient.invalidateQueries({ queryKey: ["services"] })
      toast.success(t("save"))
      setFormOpen(false)
    } catch (error) {
      console.error("upsertService error:", error)
      toast.error(t("authError"))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteService(deleteTarget.id)
      await queryClient.invalidateQueries({ queryKey: ["services"] })
      toast.success(t("delete"))
      setDeleteTarget(null)
    } catch (error) {
      console.error("deleteService error:", error)
      toast.error(t("authError"))
    } finally {
      setDeleting(false)
    }
  }

  const set = <K extends keyof ServiceForm>(key: K, value: ServiceForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("navServices")}
        description={t("appTagline")}
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            {t("addService")}
          </Button>
        }
      />

      {services.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : services.isError ? (
        <ErrorState onRetry={() => services.refetch()} />
      ) : (services.data ?? []).length === 0 ? (
        <EmptyState message={t("emptyServices")} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("nameAr")}</TableHead>
                <TableHead>{t("nameEn")}</TableHead>
                <TableHead>{t("basePrice")}</TableHead>
                <TableHead>{t("durationMin")}</TableHead>
                <TableHead>{t("sortOrder")}</TableHead>
                <TableHead>{t("activeToggle")}</TableHead>
                <TableHead className="text-end">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(services.data ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name_ar}</TableCell>
                  <TableCell>{s.name_en}</TableCell>
                  <TableCell>{formatCurrency(s.base_price, s.currency)}</TableCell>
                  <TableCell>{s.duration_min ?? "—"}</TableCell>
                  <TableCell>{s.sort}</TableCell>
                  <TableCell>
                    {s.is_active ? (
                      <Badge variant="outline" className="text-green-600">
                        {t("active")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{t("blocked")}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(s)}
                      >
                        <Pencil className="size-4" />
                        <span className="sr-only">{t("edit")}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(s)}
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">{t("delete")}</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("editService") : t("addService")}
            </DialogTitle>
            <DialogDescription>{t("appTagline")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name_ar">{t("nameAr")}</Label>
              <Input
                id="name_ar"
                value={form.name_ar}
                onChange={(e) => set("name_ar", e.target.value)}
                dir={lang === "ar" ? "rtl" : "ltr"}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name_en">{t("nameEn")}</Label>
              <Input
                id="name_en"
                value={form.name_en}
                onChange={(e) => set("name_en", e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desc_ar">{t("descAr")}</Label>
              <Input
                id="desc_ar"
                value={form.desc_ar}
                onChange={(e) => set("desc_ar", e.target.value)}
                dir={lang === "ar" ? "rtl" : "ltr"}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desc_en">{t("descEn")}</Label>
              <Input
                id="desc_en"
                value={form.desc_en}
                onChange={(e) => set("desc_en", e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="base_price">{t("basePrice")}</Label>
                <Input
                  id="base_price"
                  type="number"
                  min={0}
                  value={form.base_price}
                  onChange={(e) => set("base_price", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="duration_min">{t("durationMin")}</Label>
                <Input
                  id="duration_min"
                  type="number"
                  min={0}
                  value={form.duration_min}
                  onChange={(e) => set("duration_min", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sort">{t("sortOrder")}</Label>
                <Input
                  id="sort"
                  type="number"
                  value={form.sort}
                  onChange={(e) => set("sort", e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">{t("activeToggle")}</Label>
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(v) => set("is_active", v)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
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
              {deleteTarget
                ? lang === "ar"
                  ? deleteTarget.name_ar
                  : deleteTarget.name_en
                : ""}
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