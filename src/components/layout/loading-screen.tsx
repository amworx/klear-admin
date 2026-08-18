import { Loader2 } from "lucide-react"
import { useI18n } from "@/lib/i18n"

export function LoadingScreen() {
  const { t } = useI18n()
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-muted/40">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{t("loading")}</p>
    </div>
  )
}