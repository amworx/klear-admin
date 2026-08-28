import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  useCarAttributes,
  upsertCarAttribute,
  deleteCarAttribute,
  reorderCarAttribute,
} from "@/lib/hooks/queries"
import { useI18n } from "@/lib/i18n"
import type { CarAttribute, CarAttributeOption } from "@/lib/types"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import {
  ArrowDown,
  ArrowUp,
  Pencil,
  Plus,
  Trash2,
  DollarSign,
} from "lucide-react"

type AttrOption = {
  value: string
  label_ar: string
  label_en: string
  factor: string
}

type AttrForm = {
  key: string
  label_ar: string
  label_en: string
  tooltip_ar: string
  tooltip_en: string
  data_type: "text" | "select"
  options: AttrOption[]
  affects_price: boolean
  price_factor: string
  is_visible: boolean
  is_required: boolean
}

const EMPTY_FORM: AttrForm = {
  key: "",
  label_ar: "",
  label_en: "",
  tooltip_ar: "",
  tooltip_en: "",
  data_type: "text",
  options: [],
  affects_price: false,
  price_factor: "1.0",
  is_visible: true,
  is_required: false,
}

export function CarAttributesPage() {
  const { t, lang } = useI18n()
  const queryClient = useQueryClient()
  const attributes = useCarAttributes()

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<CarAttribute | null>(null)
  const [form, setForm] = React.useState<AttrForm>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<CarAttribute | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const [busyId, setBusyId] = React.useState<string | null>(null)

  const list = (attributes.data ?? []).sort((a, b) => a.sort_order - b.sort_order)

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (a: CarAttribute) => {
    setEditing(a)
    setForm({
      key: a.key,
      label_ar: a.label_ar,
      label_en: a.label_en,
      tooltip_ar: a.tooltip_ar ?? "",
      tooltip_en: a.tooltip_en ?? "",
      data_type: a.data_type,
      options: a.options.map((o) => ({
        value: o.value,
        label_ar: o.label_ar,
        label_en: o.label_en,
        factor: o.factor != null ? String(o.factor) : "1.0",
      })),
      affects_price: a.affects_price,
      price_factor: String(a.price_factor),
      is_visible: a.is_visible,
      is_required: a.is_required,
    })
    setFormOpen(true)
  }

  const set = <K extends keyof AttrForm>(key: K, value: AttrForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const setOption = (index: number, patch: Partial<AttrOption>) =>
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) => (i === index ? { ...o, ...patch } : o)),
    }))

  const addOption = () =>
    setForm((f) => ({
      ...f,
      options: [
        ...f.options,
        { value: "", label_ar: "", label_en: "", factor: "1.0" },
      ],
    }))

  const removeOption = (index: number) =>
    setForm((f) => ({
      ...f,
      options: f.options.filter((_, i) => i !== index),
    }))

  const save = async () => {
    if (!form.label_ar.trim() || !form.label_en.trim() || !form.key.trim()) {
      toast.error(t("authError"))
      return
    }
    const options: CarAttributeOption[] = form.options
      .filter((o) => o.value.trim())
      .map((o) => ({
        value: o.value.trim(),
        label_ar: o.label_ar.trim() || o.value.trim(),
        label_en: o.label_en.trim() || o.value.trim(),
        factor:
          form.affects_price && o.factor !== ""
            ? Number(o.factor) || 1
            : undefined,
      }))
    setSaving(true)
    try {
      await upsertCarAttribute({
        ...(editing ? { id: editing.id } : {}),
        key:
          form.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_") ||
          editing?.key ||
          "",
        label_ar: form.label_ar.trim(),
        label_en: form.label_en.trim(),
        tooltip_ar: form.tooltip_ar.trim() || null,
        tooltip_en: form.tooltip_en.trim() || null,
        data_type: form.data_type,
        options,
        affects_price: form.affects_price,
        price_factor:
          form.affects_price && form.price_factor !== ""
            ? Number(form.price_factor) || 1
            : 1,
        is_visible: form.is_visible,
        is_required: form.is_required,
      })
      await queryClient.invalidateQueries({ queryKey: ["car-attributes"] })
      toast.success(t("attributeSaved"))
      setFormOpen(false)
    } catch (error) {
      console.error("upsertCarAttribute error:", error)
      toast.error(t("authError"))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteCarAttribute(deleteTarget.id)
      await queryClient.invalidateQueries({ queryKey: ["car-attributes"] })
      toast.success(t("attributeDeleted"))
      setDeleteTarget(null)
    } catch (error) {
      console.error("deleteCarAttribute error:", error)
      toast.error(t("authError"))
    } finally {
      setDeleting(false)
    }
  }

  const move = async (index: number, direction: -1 | 1) => {
    const target = list[index + direction]
    if (!target) return
    const current = list[index]
    setBusyId(current.id)
    try {
      // Swap sort orders atomically enough for a table this size.
      await reorderCarAttribute({ id: current.id, sortOrder: target.sort_order })
      await reorderCarAttribute({ id: target.id, sortOrder: current.sort_order })
      await queryClient.invalidateQueries({ queryKey: ["car-attributes"] })
    } catch (error) {
      console.error("reorderCarAttribute error:", error)
      toast.error(t("authError"))
    } finally {
      setBusyId(null)
    }
  }

  const onDelete = (a: CarAttribute) => {
    if (a.is_system) {
      toast.error(t("attrSystemLocked"))
      return
    }
    setDeleteTarget(a)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("carAttributesTitle")}
        description={t("carAttributesDesc")}
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            {t("addAttribute")}
          </Button>
        }
      />

      {attributes.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : attributes.isError ? (
        <ErrorState onRetry={() => attributes.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState message={t("attributesEmpty")} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead dir="ltr">{t("sortOrder")}</TableHead>
                <TableHead dir="ltr">{t("attrKey")}</TableHead>
                <TableHead>{t("nameAr")}</TableHead>
                <TableHead dir="ltr">{t("nameEn")}</TableHead>
                <TableHead>{t("attrType")}</TableHead>
                <TableHead>{t("attrVisible")}</TableHead>
                <TableHead>{t("attrRequired")}</TableHead>
                <TableHead>{t("attrAffectsPrice")}</TableHead>
                <TableHead className="text-end">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((a, index) => (
                <TableRow key={a.id}>
                  <TableCell dir="ltr">{a.sort_order}</TableCell>
                  <TableCell dir="ltr">
                    <span className="font-mono text-xs">{a.key}</span>
                    {a.is_system ? (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Badge
                              variant="secondary"
                              className="ms-2 cursor-help"
                            >
                              {t("attrSystem")}
                            </Badge>
                          }
                        />
                        <TooltipContent side="top">
                          {t("attrSystemTooltip")}
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                  </TableCell>
                  <TableCell>{a.label_ar}</TableCell>
                  <TableCell dir="ltr">{a.label_en}</TableCell>
                  <TableCell>
                    {a.data_type === "select" ? t("typeSelect") : t("typeText")}
                  </TableCell>
                  <TableCell>
                    {a.is_visible ? (
                      <Badge variant="outline" className="text-green-600">
                        {t("active")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{t("blocked")}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {a.is_required ? (
                      <Badge variant="outline">{t("attrRequired")}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {a.affects_price ? (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Badge
                              variant="outline"
                              className="cursor-help text-amber-600"
                            >
                              <DollarSign className="size-3" />
                              ×{a.price_factor}
                            </Badge>
                          }
                        />
                        <TooltipContent side="top">
                          {t("attrAffectsPriceTooltip")} ×{a.price_factor}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={index === 0 || busyId === a.id}
                        onClick={() => move(index, -1)}
                        aria-label={t("attrUp")}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={index === list.length - 1 || busyId === a.id}
                        onClick={() => move(index, 1)}
                        aria-label={t("attrDown")}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(a)}
                      >
                        <Pencil className="size-4" />
                        <span className="sr-only">{t("edit")}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => onDelete(a)}
                        disabled={a.is_system}
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

      {/* Add / edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("editAttribute") : t("addAttribute")}
            </DialogTitle>
            <DialogDescription>{t("carAttributesDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="attr_label_ar">{t("nameAr")}</Label>
                <Input
                  id="attr_label_ar"
                  value={form.label_ar}
                  onChange={(e) => set("label_ar", e.target.value)}
                  dir={lang === "ar" ? "rtl" : "ltr"}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="attr_label_en">{t("nameEn")}</Label>
                <Input
                  id="attr_label_en"
                  value={form.label_en}
                  onChange={(e) => set("label_en", e.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="attr_key">{t("attrKey")}</Label>
                <Input
                  id="attr_key"
                  value={form.key}
                  disabled={!!editing}
                  onChange={(e) => set("key", e.target.value)}
                  dir="ltr"
                  placeholder="color"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="attr_tooltip_ar">تلميح (عربي)</Label>
                <Input
                  id="attr_tooltip_ar"
                  value={form.tooltip_ar}
                  onChange={(e) => set("tooltip_ar", e.target.value)}
                  dir="rtl"
                  placeholder="اشرح للعميل ما تعنيه هذه الخاصية"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="attr_tooltip_en">Tooltip (English)</Label>
                <Input
                  id="attr_tooltip_en"
                  value={form.tooltip_en}
                  onChange={(e) => set("tooltip_en", e.target.value)}
                  dir="ltr"
                  placeholder="Explain this attribute to the customer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>{t("attrType")}</Label>
                <Select
                  value={form.data_type}
                  onValueChange={(v) =>
                    set("data_type", v === "select" ? "select" : "text")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">{t("typeText")}</SelectItem>
                    <SelectItem value="select">{t("typeSelect")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 pb-0.5">
                <Switch
                  id="attr_affects_price"
                  checked={form.affects_price}
                  onCheckedChange={(v) => set("affects_price", v)}
                />
                <Label htmlFor="attr_affects_price">
                  {t("attrAffectsPrice")}
                </Label>
              </div>
            </div>

            {form.affects_price && form.data_type === "text" ? (
              <div className="grid max-w-xs gap-2">
                <Label htmlFor="attr_price_factor">{t("attrPriceFactor")}</Label>
                <Input
                  id="attr_price_factor"
                  type="number"
                  step="0.05"
                  min={0}
                  value={form.price_factor}
                  onChange={(e) => set("price_factor", e.target.value)}
                  dir="ltr"
                />
              </div>
            ) : null}

            {form.data_type === "select" ? (
              <div className="grid gap-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <Label>{t("attrOptions")}</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addOption}>
                    <Plus className="size-4" />
                    {t("addOption")}
                  </Button>
                </div>
                {form.options.map((o, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-12 items-center gap-2 rounded-md border p-2"
                  >
                    <div className="col-span-3">
                      <Label className="text-xs">{t("attrOptionValue")}</Label>
                      <Input
                        value={o.value}
                        onChange={(e) => setOption(i, { value: e.target.value })}
                        dir="ltr"
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">{t("attrOptionLabelAr")}</Label>
                      <Input
                        value={o.label_ar}
                        onChange={(e) => setOption(i, { label_ar: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">{t("attrOptionLabelEn")}</Label>
                      <Input
                        value={o.label_en}
                        onChange={(e) => setOption(i, { label_en: e.target.value })}
                        dir="ltr"
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">{t("attrOptionFactor")}</Label>
                      <Input
                        value={o.factor}
                        disabled={!form.affects_price}
                        onChange={(e) => setOption(i, { factor: e.target.value })}
                        dir="ltr"
                        type="number"
                        step="0.05"
                        min={0}
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => removeOption(i)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex items-center justify-between">
              <Label htmlFor="attr_visible">{t("attrVisible")}</Label>
              <Switch
                id="attr_visible"
                checked={form.is_visible}
                onCheckedChange={(v) => set("is_visible", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="attr_required">{t("attrRequired")}</Label>
              <Switch
                id="attr_required"
                checked={form.is_required}
                onCheckedChange={(v) => set("is_required", v)}
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
            <AlertDialogTitle>{t("deleteAttributeConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? lang === "ar"
                  ? deleteTarget.label_ar
                  : deleteTarget.label_en
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
