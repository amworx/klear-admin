import * as React from "react"
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom"
import {
  Droplets,
  LayoutDashboard,
  CalendarDays,
  Users,
  Sparkles,
  Settings2,
  Truck,
  CreditCard,
  Activity,
  CalendarRange,
  Sun,
  Moon,
  Languages,
  LogOut,
  Menu,
} from "lucide-react"

import { useI18n, type TranslationKey } from "@/lib/i18n"
import { useTheme } from "@/components/theme-provider"
import { useAuth } from "@/lib/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

type NavItem = {
  to: string
  label: TranslationKey
  icon: React.ComponentType<{ className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "navOverview", icon: LayoutDashboard },
  { to: "/bookings", label: "navBookings", icon: CalendarDays },
  { to: "/clients", label: "navClients", icon: Users },
  { to: "/services", label: "navServices", icon: Sparkles },
  { to: "/pricing", label: "navPricing", icon: Settings2 },
  { to: "/providers", label: "navProviders", icon: Truck },
  { to: "/payments", label: "navPayments", icon: CreditCard },
  { to: "/live-ops", label: "navLiveOps", icon: Activity },
  { to: "/calendar", label: "navCalendar", icon: CalendarRange },
]

function AppSidebar() {
  const { t, dir } = useI18n()
  return (
    <Sidebar collapsible="icon" side={dir === "rtl" ? "right" : "left"}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link to="/" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Droplets className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">{t("appName")}</span>
                <span className="text-xs text-muted-foreground">
                  {t("appTagline")}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("menu")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    render={
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          cn(isActive && "bg-accent text-accent-foreground")
                        }
                      />
                    }
                  >
                    <item.icon className="size-4" />
                    <span>{t(item.label)}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

function Topbar() {
  const { t, toggleLang, lang } = useI18n()
  const { theme, setTheme } = useTheme()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const signOut = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  }

  const initials = (profile?.full_name || profile?.phone || "A")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger />
      <Separator orientation="vertical" className="ms-2 h-4" />
      <div className="flex flex-1 items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleLang}
          title={t("language")}
          aria-label={t("language")}
        >
          <Languages className="size-4" />
          <span className="sr-only">{lang === "ar" ? "EN" : "عربي"}</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={t("theme")}
          aria-label={t("theme")}
        >
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="rounded-full" />
            }
          >
            <Avatar className="size-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">
                    {profile?.full_name || t("account")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {profile?.phone || ""}
                  </span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="size-4" />
              {t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export function AppShell() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Topbar />
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export { Menu }