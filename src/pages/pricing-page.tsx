import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAppSettings, updateAppSettings } from "@/lib/hooks/queries"
import { useI18n } from "@/lib/i18n"
import type { AppSettings } from "@/lib/types"
import { PageHeader, ErrorState } from "@/components/layout/page-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

type SettingsForm = {
  size_small_factor: string
  size_medium_factor: string
  size_large_factor: string
  urgent_surcharge_pct: string
  service_hours_start: string
  service_hours_end: string
  currency: string
  service_center_lat: string
  service_center_lng: string
  service_radius_km: string
}

function formFromSettings(s: AppSettings): SettingsForm {
  return {
    size_small_factor: String(s.size_small_factor),
    size_medium_factor: String(s.size_medium_factor),
    size_large_factor: String(s.size_large_factor),
    urgent_surcharge_pct: String(s.urgent_surcharge_pct),
    service_hours_start: s.service_hours_start.slice(0, 5),
    service_hours_end: s.service_hours_end.slice(0, 5),
    currency: s.currency,
    service_center_lat: s.service_center_lat != null ? String(s.service_center_lat) : "",
    service_center_lng: s.service_center_lng != null ? String(s.service_center_lng) : "",
    service_radius_km: s.service_radius_km != null ? String(s.service_radius_km) : "",
  }
}

export function PricingPage() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const settings = useAppSettings()

  if (settings.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("pricingSettings")} />
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (settings.isError || !settings.data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("pricingSettings")} />
        <ErrorState onRetry={() => settings.refetch()} />
      </div>
    )
  }

  return (
    <PricingForm
      key={settings.data.updated_at}
      settings={settings.data}
      onSaved={() => queryClient.invalidateQueries({ queryKey: ["app-settings"] })}
    />
  )
}

function PricingForm({
  settings,
  onSaved,
}: {
  settings: AppSettings
  onSaved: () => Promise<void>
}) {
  const { t } = useI18n()
  const [form, setForm] = React.useState<SettingsForm>(() =>
    formFromSettings(settings)
  )
  const [saving, setSaving] = React.useState(false)

  const save = async () => {
    setSaving(true)
    const patch: Partial<AppSettings> = {
      size_small_factor: Number(form.size_small_factor) || 0,
      size_medium_factor: Number(form.size_medium_factor) || 0,
      size_large_factor: Number(form.size_large_factor) || 0,
      urgent_surcharge_pct: Number(form.urgent_surcharge_pct) || 0,
      service_hours_start: `${form.service_hours_start}:00`,
      service_hours_end: `${form.service_hours_end}:00`,
      currency: form.currency.trim() || "SYP",
      service_center_lat: form.service_center_lat.trim() === "" ? null : Number(form.service_center_lat),
      service_center_lng: form.service_center_lng.trim() === "" ? null : Number(form.service_center_lng),
      service_radius_km: form.service_radius_km.trim() === "" ? null : Number(form.service_radius_km),
    } as unknown as Partial<AppSettings>
    try {
      await updateAppSettings(patch)
      await onSaved()
      toast.success(t("settingsSaved"))
    } catch (error) {
      console.error("updateAppSettings error:", error)
      toast.error(t("authError"))
    } finally {
      setSaving(false)
    }
  }

  const set = (key: keyof SettingsForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("pricingSettings")}
        description={t("appTagline")}
        actions={
          <Button onClick={save} disabled={saving}>
            {saving ? t("verifying") : t("save")}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("sizeFactors")}</CardTitle>
            <CardDescription>
              {t("sizeFactors")} · {t("currency")}: {form.currency}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="small">{t("smallFactor")}</Label>
              <Input
                id="small"
                type="number"
                step="0.05"
                min="0"
                value={form.size_small_factor}
                onChange={(e) => set("size_small_factor", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="medium">{t("mediumFactor")}</Label>
              <Input
                id="medium"
                type="number"
                step="0.05"
                min="0"
                value={form.size_medium_factor}
                onChange={(e) => set("size_medium_factor", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="large">{t("largeFactor")}</Label>
              <Input
                id="large"
                type="number"
                step="0.05"
                min="0"
                value={form.size_large_factor}
                onChange={(e) => set("size_large_factor", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("urgentSurcharge")}</CardTitle>
            <CardDescription>{t("urgentSurcharge")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="surcharge">{t("urgentSurcharge")}</Label>
              <Input
                id="surcharge"
                type="number"
                step="1"
                min="0"
                value={form.urgent_surcharge_pct}
                onChange={(e) => set("urgent_surcharge_pct", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">{t("currency")}</Label>
              <Input
                id="currency"
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
                dir="ltr"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("serviceHours")}</CardTitle>
            <CardDescription>{t("serviceHours")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="start">{t("startTime")}</Label>
              <Input
                id="start"
                type="time"
                value={form.service_hours_start}
                onChange={(e) => set("service_hours_start", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end">{t("endTime")}</Label>
              <Input
                id="end"
                type="time"
                value={form.service_hours_end}
                onChange={(e) => set("service_hours_end", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("serviceArea")}</CardTitle>
            <CardDescription>{t("serviceAreaDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="lat">{t("serviceCenterLat")}</Label>
              <Input
                id="lat"
                type="number"
                step="0.0001"
                placeholder="36.5114"
                value={form.service_center_lat}
                onChange={(e) => set("service_center_lat", e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lng">{t("serviceCenterLng")}</Label>
              <Input
                id="lng"
                type="number"
                step="0.0001"
                placeholder="36.8681"
                value={form.service_center_lng}
                onChange={(e) => set("service_center_lng", e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="radius">{t("serviceRadius")}</Label>
              <Input
                id="radius"
                type="number"
                min="0"
                placeholder="15"
                value={form.service_radius_km}
                onChange={(e) => set("service_radius_km", e.target.value)}
                dir="ltr"
              />
            </div>
            <p className="sm:col-span-3 text-xs text-muted-foreground">
              {t("serviceAreaAfrinHint")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}