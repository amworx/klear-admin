import * as React from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { useI18n } from "@/lib/i18n"
import { useAuth } from "@/lib/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Droplets, Loader2 } from "lucide-react"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { status } = useAuth()
  const [step, setStep] = React.useState<"email" | "otp">("email")
  const [email, setEmail] = React.useState("")
  const [otp, setOtp] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [verifying, setVerifying] = React.useState(false)
  const [emailError, setEmailError] = React.useState<string | null>(null)

  // Redirect as soon as auth state becomes signedIn. This covers both the
  // post-verifyOtp race (profile fetch is async, so navigate() alone bounces
  // back through ProtectedRoute) and reloading /login with a stored session.
  React.useEffect(() => {
    if (status === "signedIn") {
      navigate("/", { replace: true })
    }
  }, [status, navigate])

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = email.trim()
    if (!EMAIL_RE.test(value)) {
      setEmailError(t("invalidEmail"))
      return
    }
    setEmailError(null)
    setSending(true)
    const { error } = await supabase.auth.signInWithOtp({ email: value })
    setSending(false)
    if (error) {
      console.error("signInWithOtp error:", error.message)
      toast.error(t("authError"))
      return
    }
    setStep("otp")
    toast.success(t("codeSent"))
  }

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length < 8) return
    setVerifying(true)
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp,
      type: "email",
    })
    setVerifying(false)
    if (error) {
      console.error("verifyOtp error:", error.message)
      toast.error(t("authError"))
    }
    // On success the useAuth effect above redirects once state is signedIn.
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Droplets className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">{t("loginTitle")}</CardTitle>
          <CardDescription>{t("loginSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" ? (
            <form onSubmit={sendCode} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  autoComplete="email"
                  aria-invalid={!!emailError}
                />
                {emailError ? (
                  <p className="text-sm text-destructive">{emailError}</p>
                ) : null}
              </div>
              <Button type="submit" className="w-full" disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t("verifying")}
                  </>
                ) : (
                  t("sendCode")
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">{t("enterCode")}</Label>
                <div className="flex justify-center py-2">
                  <InputOTP
                    id="otp"
                    maxLength={8}
                    value={otp}
                    onChange={setOtp}
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 8 }).map((_, index) => (
                        <InputOTPSlot key={index} index={index} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  {email.trim()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setStep("email")
                    setOtp("")
                  }}
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={verifying || otp.length < 6}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {t("verifying")}
                    </>
                  ) : (
                    t("confirm")
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}