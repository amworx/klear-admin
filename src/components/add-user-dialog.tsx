import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  createUserAccount,
} from "@/lib/hooks/queries"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { UserPlus } from "lucide-react"

type Role = "customer" | "provider"

const ROLE_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

/**
 * Shared dialog used by the Clients and Providers pages to create a new
 * account (auth user + profile) with a fixed role. The actual creation runs
 * in the `admin-create-user` edge function with the service role; the browser
 * only holds the anon key and the admin's JWT.
 */
export function AddUserDialog({
  role,
  trigger,
}: {
  role: Role
  trigger: React.ReactNode
}) {
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const [open, setOpen] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [fullName, setFullName] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  const reset = () => {
    setEmail("")
    setFullName("")
    setPhone("")
  }

  const submit = async () => {
    const normalized = email.trim().toLowerCase()
    if (!ROLE_RE.test(normalized)) {
      toast.error(t("invalidEmail"))
      return
    }
    setSaving(true)
    try {
      await createUserAccount({
        email: normalized,
        full_name: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
        role,
      })
      toast.success(t("userCreated"))
      setOpen(false)
      reset()
      // Refresh both lists: the created profile shows up in whichever page
      // lists that role, and the overview counters include customers.
      await queryClient.invalidateQueries({ queryKey: ["clients"] })
      await queryClient.invalidateQueries({ queryKey: ["providers"] })
      await queryClient.invalidateQueries({ queryKey: ["overview-stats"] })
    } catch (error) {
      const message = error instanceof Error ? error.message : ""
      toast.error(/already exists/i.test(message) ? t("emailExists") : t("authError"))
      console.error("createUserAccount error:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {role === "customer" ? t("addClient") : t("addProvider")}
            </DialogTitle>
            <DialogDescription>{t("appTagline")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="new-user-email">{t("email")}</Label>
              <Input
                id="new-user-email"
                type="email"
                dir="ltr"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="new-user-name">{t("fullName")}</Label>
              <Input
                id="new-user-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="new-user-phone">{t("phone")}</Label>
              <Input
                id="new-user-phone"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? t("verifying") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Convenience trigger: a primary button with the add icon. */
export function AddUserTrigger({
  label,
}: {
  label: string
}) {
  return (
    <Button>
      <UserPlus className="size-4" />
      {label}
    </Button>
  )
}