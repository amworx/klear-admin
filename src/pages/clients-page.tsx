import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  useClients,
  useClientCars,
  useClientAddresses,
  useClientBookings,
  useClientPayments,
  setClientActive,
  updateClientProfile,
  saveClientCar,
  deleteClientCar,
  saveClientAddress,
  deleteClientAddress,
} from "@/lib/hooks/queries"
import { useI18n, formatDateTime, formatCurrency, type TranslationKey } from "@/lib/i18n"
import type {
  Car,
  Profile,
  UserAddress,
  UserRole,
} from "@/lib/types"
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Ban,
  Car as CarIcon,
  MapPin,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react"

const CAR_SIZES = ["small", "medium", "large"] as const

type CarForm = {
  make: string
  model: string
  plate_number: string
  size: "small" | "medium" | "large"
  is_default: boolean
}

type AddressForm = {
  label: string
  address: string
  lat: string
  lng: string
  is_default: boolean
}

function CarFormFields({
  form,
  onChange,
  t,
}: {
  form: CarForm
  onChange: (patch: Partial<CarForm>) => void
  t: (key: TranslationKey) => string
}) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="car-make">{t("make")}</Label>
          <Input
            id="car-make"
            value={form.make}
            onChange={(e) => onChange({ make: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="car-model">{t("model")}</Label>
          <Input
            id="car-model"
            value={form.model}
            onChange={(e) => onChange({ model: e.target.value })}
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="car-plate">{t("plateNumber")}</Label>
        <Input
          id="car-plate"
          dir="ltr"
          value={form.plate_number}
          onChange={(e) => onChange({ plate_number: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 items-end gap-3">
        <div className="grid gap-1.5">
          <Label>{t("carSize")}</Label>
          <Select
            value={form.size}
            onValueChange={(value) => {
              if (value === "small" || value === "medium" || value === "large") {
                onChange({ size: value })
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CAR_SIZES.map((size) => (
                <SelectItem key={size} value={size}>
                  {t(size === "small" ? "sizeSmall" : size === "large" ? "sizeLarge" : "sizeMedium")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pb-0.5">
          <Switch
            id="car-default"
            checked={form.is_default}
            onCheckedChange={(checked) => onChange({ is_default: checked })}
          />
          <Label htmlFor="car-default">{t("isDefault")}</Label>
        </div>
      </div>
    </div>
  )
}

function AddressFormFields({
  form,
  onChange,
  t,
}: {
  form: AddressForm
  onChange: (patch: Partial<AddressForm>) => void
  t: (key: TranslationKey) => string
}) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="addr-label">{t("label")}</Label>
          <Input
            id="addr-label"
            value={form.label}
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </div>
        <div className="flex items-end gap-2 pb-0.5">
          <Switch
            id="addr-default"
            checked={form.is_default}
            onCheckedChange={(checked) => onChange({ is_default: checked })}
          />
          <Label htmlFor="addr-default">{t("isDefault")}</Label>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="addr-address">{t("addressText")}</Label>
        <Input
          id="addr-address"
          value={form.address}
          onChange={(e) => onChange({ address: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="addr-lat">{t("lat")}</Label>
          <Input
            id="addr-lat"
            dir="ltr"
            value={form.lat}
            onChange={(e) => onChange({ lat: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="addr-lng">{t("lng")}</Label>
          <Input
            id="addr-lng"
            dir="ltr"
            value={form.lng}
            onChange={(e) => onChange({ lng: e.target.value })}
          />
        </div>
      </div>
    </div>
  )
}

export function ClientsPage() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const clients = useClients()

  const [search, setSearch] = React.useState("")
  const [selected, setSelected] = React.useState<Profile | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [blockTarget, setBlockTarget] = React.useState<Profile | null>(null)
  const [busy, setBusy] = React.useState(false)

  const userId = selected?.id ?? ""

  const cars = useClientCars(userId)
  const addresses = useClientAddresses(userId)
  const clientBookings = useClientBookings(userId)
  const clientPayments = useClientPayments(userId)

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

  const invalidateClient = async () => {
    await queryClient.invalidateQueries({ queryKey: ["clients"] })
    await queryClient.invalidateQueries({ queryKey: ["client-cars", userId] })
    await queryClient.invalidateQueries({
      queryKey: ["client-addresses", userId],
    })
    await queryClient.invalidateQueries({ queryKey: ["client-bookings", userId] })
    await queryClient.invalidateQueries({ queryKey: ["client-payments", userId] })
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
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("clientDetails")}</DialogTitle>
            <DialogDescription>
              {selected?.full_name || selected?.phone || "—"}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <Tabs defaultValue="profile">
              <TabsList>
                <TabsTrigger value="profile">{t("tabProfile")}</TabsTrigger>
                <TabsTrigger value="cars">{t("tabCars")}</TabsTrigger>
                <TabsTrigger value="addresses">{t("tabAddresses")}</TabsTrigger>
                <TabsTrigger value="bookings">{t("tabBookings")}</TabsTrigger>
                <TabsTrigger value="payments">{t("tabPayments")}</TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <ProfileTab
                  client={selected}
                  onChanged={invalidateClient}
                  onProfileUpdated={(patch) =>
                    setSelected((prev) => (prev ? { ...prev, ...patch } : prev))
                  }
                />
              </TabsContent>

              <TabsContent value="cars">
                <CarsTab
                  userId={selected.id}
                  cars={cars.data ?? []}
                  loading={cars.isLoading}
                  onChanged={invalidateClient}
                />
              </TabsContent>

              <TabsContent value="addresses">
                <AddressesTab
                  userId={selected.id}
                  addresses={addresses.data ?? []}
                  loading={addresses.isLoading}
                  onChanged={invalidateClient}
                />
              </TabsContent>

              <TabsContent value="bookings">
                <BookingsTab
                  bookings={clientBookings.data ?? []}
                  loading={clientBookings.isLoading}
                />
              </TabsContent>

              <TabsContent value="payments">
                <PaymentsTab
                  payments={clientPayments.data ?? []}
                  loading={clientPayments.isLoading}
                />
              </TabsContent>
            </Tabs>
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

// ---------- Profile tab ----------

function ProfileTab({
  client,
  onChanged,
  onProfileUpdated,
}: {
  client: Profile
  onChanged: () => Promise<void>
  onProfileUpdated?: (patch: Partial<Profile>) => void
}) {
  const { t } = useI18n()
  const [editing, setEditing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState({
    full_name: client.full_name ?? "",
    phone: client.phone ?? "",
    role: client.role,
    address: client.address ?? "",
    is_active: client.is_active,
  })

  const startEdit = () => {
    setForm({
      full_name: client.full_name ?? "",
      phone: client.phone ?? "",
      role: client.role,
      address: client.address ?? "",
      is_active: client.is_active,
    })
    setEditing(true)
  }

  const save = async () => {
    if (!form.full_name.trim()) {
      toast.error(t("authError"))
      return
    }
    setSaving(true)
    try {
      await updateClientProfile(client.id, {
        full_name: form.full_name.trim() || null,
        phone: form.phone.trim() || null,
        role: form.role,
        address: form.address.trim() || null,
        is_active: form.is_active,
      })
      await onChanged()
      onProfileUpdated?.({
        full_name: form.full_name.trim() || null,
        phone: form.phone.trim() || null,
        role: form.role,
        address: form.address.trim() || null,
        is_active: form.is_active,
      })
      toast.success(t("profileUpdated"))
      setEditing(false)
    } catch (error) {
      console.error("updateClientProfile error:", error)
      toast.error(t("authError"))
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <div className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">{t("fullName")}</dt>
            <dd className="font-medium">{client.full_name || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("phone")}</dt>
            <dd className="font-medium" dir="ltr">
              {client.phone || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("role")}</dt>
            <dd className="font-medium">{client.role}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("status")}</dt>
            <dd className="font-medium">
              {client.is_active ? t("active") : t("blocked")}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted-foreground">{t("addressText")}</dt>
            <dd className="font-medium">{client.address || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("memberSince")}</dt>
            <dd className="font-medium">{formatDateTime(client.created_at)}</dd>
          </div>
        </dl>
        <Button variant="outline" onClick={startEdit}>
          <Pencil className="size-4" />
          {t("edit")}
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="profile-name">{t("fullName")}</Label>
          <Input
            id="profile-name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="profile-phone">{t("phone")}</Label>
          <Input
            id="profile-phone"
            dir="ltr"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label>{t("role")}</Label>
          <Select
            value={form.role}
            onValueChange={(value) => {
              if (
                value === "customer" ||
                value === "provider" ||
                value === "admin"
              ) {
                setForm({ ...form, role: value as UserRole })
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customer">customer</SelectItem>
              <SelectItem value="provider">provider</SelectItem>
              <SelectItem value="admin">admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="profile-address">{t("addressText")}</Label>
          <Input
            id="profile-address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="profile-active"
          checked={form.is_active}
          onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
        />
        <Label htmlFor="profile-active">{t("active")}</Label>
      </div>
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>
          {saving ? t("verifying") : t("save")}
        </Button>
        <Button variant="ghost" onClick={() => setEditing(false)}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  )
}

// ---------- Cars tab ----------

function CarsTab({
  userId,
  cars,
  loading,
  onChanged,
}: {
  userId: string
  cars: Car[]
  loading: boolean
  onChanged: () => Promise<void>
}) {
  const { t, lang } = useI18n()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Car | null>(null)
  const [form, setForm] = React.useState<CarForm>({
    make: "",
    model: "",
    plate_number: "",
    size: "medium",
    is_default: false,
  })
  const [saving, setSaving] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<Car | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const openCreate = () => {
    setEditing(null)
    setForm({ make: "", model: "", plate_number: "", size: "medium", is_default: false })
    setFormOpen(true)
  }

  const openEdit = (car: Car) => {
    setEditing(car)
    setForm({
      make: car.make,
      model: car.model,
      plate_number: car.plate_number,
      size: car.size,
      is_default: car.is_default,
    })
    setFormOpen(true)
  }

  const save = async () => {
    if (!form.make.trim() || !form.model.trim() || !form.plate_number.trim()) {
      toast.error(t("authError"))
      return
    }
    setSaving(true)
    try {
      await saveClientCar({
        ...(editing ? { id: editing.id } : {}),
        user_id: userId,
        make: form.make.trim(),
        model: form.model.trim(),
        plate_number: form.plate_number.trim(),
        size: form.size,
        is_default: form.is_default,
      })
      await onChanged()
      toast.success(t("saved"))
      setFormOpen(false)
    } catch (error) {
      console.error("saveClientCar error:", error)
      toast.error(t("authError"))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteClientCar(deleteTarget.id)
      await onChanged()
      toast.success(t("deleted"))
      setDeleteTarget(null)
    } catch (error) {
      console.error("deleteClientCar error:", error)
      toast.error(t("authError"))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          {t("addCar")}
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-16 w-full" />
      ) : cars.length === 0 ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {cars.map((car) => (
            <li
              key={car.id}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2">
                <CarIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {car.make} {car.model} —{" "}
                  <span dir="ltr">{car.plate_number}</span>
                </span>
                {car.is_default ? (
                  <Badge variant="secondary">{t("isDefault")}</Badge>
                ) : null}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <Badge variant="outline">
                  {lang === "ar"
                    ? car.size === "small"
                      ? t("sizeSmall")
                      : car.size === "large"
                        ? t("sizeLarge")
                        : t("sizeMedium")
                    : car.size}
                </Badge>
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(car)}>
                  <Pencil className="size-4" />
                  <span className="sr-only">{t("edit")}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive"
                  onClick={() => setDeleteTarget(car)}
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">{t("delete")}</span>
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {formOpen ? (
        <div className="space-y-3 rounded-md border p-3">
          <h4 className="text-sm font-semibold">
            {editing ? t("editCar") : t("addCar")}
          </h4>
          <CarFormFields
            form={form}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            t={t}
          />
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>
              {saving ? t("verifying") : t("save")}
            </Button>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : null}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `${deleteTarget.make} ${deleteTarget.model} — ${deleteTarget.plate_number}`
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

// ---------- Addresses tab ----------

function AddressesTab({
  userId,
  addresses,
  loading,
  onChanged,
}: {
  userId: string
  addresses: UserAddress[]
  loading: boolean
  onChanged: () => Promise<void>
}) {
  const { t } = useI18n()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<UserAddress | null>(null)
  const [form, setForm] = React.useState<AddressForm>({
    label: "",
    address: "",
    lat: "",
    lng: "",
    is_default: false,
  })
  const [saving, setSaving] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<UserAddress | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const openCreate = () => {
    setEditing(null)
    setForm({ label: "", address: "", lat: "", lng: "", is_default: false })
    setFormOpen(true)
  }

  const openEdit = (a: UserAddress) => {
    setEditing(a)
    setForm({
      label: a.label,
      address: a.address,
      lat: String(a.lat ?? ""),
      lng: String(a.lng ?? ""),
      is_default: a.is_default,
    })
    setFormOpen(true)
  }

  const save = async () => {
    if (!form.label.trim() || !form.address.trim()) {
      toast.error(t("authError"))
      return
    }
    setSaving(true)
    try {
      await saveClientAddress({
        ...(editing ? { id: editing.id } : {}),
        user_id: userId,
        label: form.label.trim(),
        address: form.address.trim(),
        lat: form.lat ? Number(form.lat) : 0,
        lng: form.lng ? Number(form.lng) : 0,
        is_default: form.is_default,
      })
      await onChanged()
      toast.success(t("saved"))
      setFormOpen(false)
    } catch (error) {
      console.error("saveClientAddress error:", error)
      toast.error(t("authError"))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteClientAddress(deleteTarget.id)
      await onChanged()
      toast.success(t("deleted"))
      setDeleteTarget(null)
    } catch (error) {
      console.error("deleteClientAddress error:", error)
      toast.error(t("authError"))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          {t("addAddress")}
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-16 w-full" />
      ) : addresses.length === 0 ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {addresses.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2">
                <MapPin className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {a.label}: {a.address}
                </span>
                {a.is_default ? (
                  <Badge variant="secondary">{t("isDefault")}</Badge>
                ) : null}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(a)}>
                  <Pencil className="size-4" />
                  <span className="sr-only">{t("edit")}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive"
                  onClick={() => setDeleteTarget(a)}
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">{t("delete")}</span>
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {formOpen ? (
        <div className="space-y-3 rounded-md border p-3">
          <h4 className="text-sm font-semibold">
            {editing ? t("editAddress") : t("addAddress")}
          </h4>
          <AddressFormFields
            form={form}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            t={t}
          />
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>
              {saving ? t("verifying") : t("save")}
            </Button>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : null}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `${deleteTarget.label}: ${deleteTarget.address}` : ""}
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

// ---------- Bookings tab ----------

function BookingsTab({
  bookings,
  loading,
}: {
  bookings: ReturnType<typeof useClientBookings> extends { data: infer D }
    ? NonNullable<D>
    : never
  loading: boolean
}) {
  const { t, lang } = useI18n()
  if (loading) return <Skeleton className="h-24 w-full" />
  if (bookings.length === 0) return <p className="text-sm text-muted-foreground">—</p>
  return (
    <div className="max-h-72 overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("service")}</TableHead>
            <TableHead>{t("status")}</TableHead>
            <TableHead>{t("scheduledAt")}</TableHead>
            <TableHead className="text-end">{t("totalPrice")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((b) => (
            <TableRow key={b.id}>
              <TableCell>
                {b.service
                  ? (lang === "ar"
                      ? b.service.name_ar
                      : b.service.name_en) || b.service.name_ar
                  : "—"}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {t(statusKey(b.status))}
                </Badge>
              </TableCell>
              <TableCell>{formatDateTime(b.scheduled_at)}</TableCell>
              <TableCell className="text-end">
                {formatCurrency(b.total_price)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ---------- Payments tab ----------

function PaymentsTab({
  payments,
  loading,
}: {
  payments: ReturnType<typeof useClientPayments> extends { data: infer D }
    ? NonNullable<D>
    : never
  loading: boolean
}) {
  const { t, lang } = useI18n()
  if (loading) return <Skeleton className="h-24 w-full" />
  if (payments.length === 0) return <p className="text-sm text-muted-foreground">—</p>
  return (
    <div className="max-h-72 overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("service")}</TableHead>
            <TableHead>{t("paymentMethod")}</TableHead>
            <TableHead>{t("paymentStatus")}</TableHead>
            <TableHead>{t("date")}</TableHead>
            <TableHead className="text-end">{t("amount")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                {p.booking?.service
                  ? (lang === "ar"
                      ? p.booking.service.name_ar
                      : p.booking.service.name_en) || p.booking.service.name_ar
                  : "—"}
              </TableCell>
              <TableCell dir="ltr">{p.method}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  {t(statusKey(p.status))}
                </Badge>
              </TableCell>
              <TableCell>{formatDateTime(p.created_at)}</TableCell>
              <TableCell className="text-end">
                {formatCurrency(p.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

const STATUS_KEY = {
  pending: "statusPending",
  accepted: "statusAccepted",
  in_progress: "statusInProgress",
  completed: "statusCompleted",
  cancelled: "statusCancelled",
  paid: "statusPaid",
  failed: "statusFailed",
  refunded: "statusRefunded",
} as const

function statusKey(
  status: keyof typeof STATUS_KEY
): (typeof STATUS_KEY)[keyof typeof STATUS_KEY] {
  return STATUS_KEY[status]
}
