import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { usePayments, updatePaymentStatus } from "@/lib/hooks/queries"
import { useI18n, formatCurrency, formatDateTime } from "@/lib/i18n"
import {
  PageHeader,
  ErrorState,
  EmptyState,
  StatCard,
} from "@/components/layout/page-utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { CheckCircle2, CreditCard, Wallet } from "lucide-react"

export function PaymentsPage() {
  const { t, lang } = useI18n()
  const queryClient = useQueryClient()
  const payments = usePayments()
  const [busyId, setBusyId] = React.useState<string | null>(null)

  const paidTotal = (payments.data ?? [])
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const statusLabel: Record<string, string> = {
    pending: t("statusPending"),
    paid: t("statusPaid"),
    failed: t("statusFailed"),
    refunded: t("statusRefunded"),
  }

  const markPaid = async (id: string) => {
    setBusyId(id)
    try {
      await updatePaymentStatus(id, "paid")
      await queryClient.invalidateQueries({ queryKey: ["payments"] })
      await queryClient.invalidateQueries({ queryKey: ["overview-stats"] })
      toast.success(t("statusPaid"))
    } catch (error) {
      console.error("updatePaymentStatus error:", error)
      toast.error(t("authError"))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("navPayments")} description={t("appTagline")} />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          title={t("totalRevenue")}
          value={formatCurrency(paidTotal)}
          icon={Wallet}
        />
        <StatCard
          title={t("navPayments")}
          value={(payments.data ?? []).length}
          icon={CreditCard}
        />
      </div>

      {payments.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : payments.isError ? (
        <ErrorState onRetry={() => payments.refetch()} />
      ) : (payments.data ?? []).length === 0 ? (
        <EmptyState message={t("emptyPayments")} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("customer")}</TableHead>
                <TableHead>{t("service")}</TableHead>
                <TableHead>{t("paymentMethod")}</TableHead>
                <TableHead>{t("paymentStatus")}</TableHead>
                <TableHead>{t("date")}</TableHead>
                <TableHead className="text-end">{t("amount")}</TableHead>
                <TableHead className="text-end">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(payments.data ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.booking?.customer?.full_name ||
                      p.booking?.customer?.phone ||
                      "—"}
                  </TableCell>
                  <TableCell>
                    {lang === "ar"
                      ? p.booking?.service?.name_ar
                      : p.booking?.service?.name_en}
                  </TableCell>
                  <TableCell>{p.method}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {statusLabel[p.status] ?? p.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateTime(p.created_at)}</TableCell>
                  <TableCell className="text-end">
                    {formatCurrency(p.amount)}
                  </TableCell>
                  <TableCell className="text-end">
                    {p.status === "pending" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === p.id}
                        onClick={() => markPaid(p.id)}
                      >
                        <CheckCircle2 className="size-4" />
                        {t("markPaid")}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {p.reference || "—"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}