import { useQueryClient } from "@tanstack/react-query"
import {
  useProviders,
  useProviderJobCounts,
  setProviderAvailable,
} from "@/lib/hooks/queries"
import { useI18n, formatDateTime } from "@/lib/i18n"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import {
  AddUserDialog,
  AddUserTrigger,
} from "@/components/add-user-dialog"
import { Briefcase, CircleDot, Truck } from "lucide-react"
import * as React from "react"

export function ProvidersPage() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const providers = useProviders()
  const jobCounts = useProviderJobCounts()
  const [togglingId, setTogglingId] = React.useState<string | null>(null)

  const activeCount = (providers.data ?? []).filter((p) => p.is_available).length

  const toggleAvailability = async (id: string, value: boolean) => {
    setTogglingId(id)
    try {
      await setProviderAvailable(id, value)
      await queryClient.invalidateQueries({ queryKey: ["providers"] })
      toast.success(t("saved"))
    } catch (error) {
      console.error("setProviderAvailable error:", error)
      toast.error(t("authError"))
    } finally {
      setTogglingId(null)
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
                  <TableHead>{t("availabilityToggle")}</TableHead>
                  <TableHead>{t("assignedJobs")}</TableHead>
                  <TableHead>{t("memberSince")}</TableHead>
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
                        <Switch
                          checked={p.is_available}
                          disabled={togglingId === p.id}
                          onCheckedChange={(v) => toggleAvailability(p.id, v)}
                          aria-label={t("availabilityToggle")}
                        />
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
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}