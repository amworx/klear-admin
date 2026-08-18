import { useAuth } from "@/lib/hooks/use-auth"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldAlert } from "lucide-react"
import { supabase } from "@/lib/supabase"

export function UnauthorizedPage() {
  const { t } = useI18n()
  const { profile } = useAuth()

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">{t("unauthorized")}</CardTitle>
          <CardDescription>
            {t("unauthorizedMsg")}
            {profile?.full_name ? ` — ${profile.full_name}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button variant="outline" onClick={signOut}>
            {t("signOut")}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}