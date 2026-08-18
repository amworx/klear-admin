import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import type {
  AppSettings,
  Booking,
  BookingWithRelations,
  Car,
  Payment,
  Profile,
  Service,
  UserAddress,
} from "@/lib/types"

// ---------- Overview ----------

export function useOverviewStats() {
  return useQuery({
    queryKey: ["overview-stats"],
    queryFn: async () => {
      const [bookingsRes, paymentsRes, profilesRes] = await Promise.all([
        supabase.from("bookings").select("status, total_price"),
        supabase
          .from("payments")
          .select("amount, status")
          .eq("status", "paid"),
        supabase
          .from("profiles")
          .select("role, is_active")
          .eq("role", "customer"),
      ])

      const bookings = bookingsRes.data ?? []
      const paidPayments = paymentsRes.data ?? []
      const customers = profilesRes.data ?? []

      const revenue = paidPayments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      )
      const byStatus = bookings.reduce<Record<string, number>>((acc, b) => {
        acc[b.status] = (acc[b.status] ?? 0) + 1
        return acc
      }, {})

      return {
        totalBookings: bookings.length,
        pendingBookings: byStatus.pending ?? 0,
        completedBookings: byStatus.completed ?? 0,
        cancelledBookings: byStatus.cancelled ?? 0,
        totalRevenue: revenue,
        activeClients: customers.filter((c) => c.is_active).length,
        totalClients: customers.length,
        bookingsByStatus: byStatus,
      }
    },
  })
}

export function useRecentBookings(limit = 8) {
  return useQuery({
    queryKey: ["recent-bookings", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `*,
          customer:profiles!bookings_customer_id_fkey(id, full_name, phone),
          service:services(id, name_ar, name_en, base_price)`
        )
        .order("created_at", { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []) as BookingWithRelations[]
    },
  })
}

export function useMonthlyRevenue() {
  return useQuery({
    queryKey: ["monthly-revenue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("amount, created_at")
        .eq("status", "paid")
        .gte(
          "created_at",
          new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1).toISOString()
        )
        .order("created_at", { ascending: true })
      if (error) throw error
      return (data ?? []) as { amount: number; created_at: string }[]
    },
  })
}

// ---------- Bookings ----------

export function useBookings() {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `*,
          customer:profiles!bookings_customer_id_fkey(id, full_name, phone),
          provider:profiles!bookings_provider_id_fkey(id, full_name, phone),
          service:services(id, name_ar, name_en, base_price),
          car:cars(id, make, model, plate_number, size),
          payment:payments(id, amount, status, method)`
        )
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as BookingWithRelations[]
    },
  })
}

export function useUpdateBooking() {
  return useQuery({
    queryKey: ["bookings", "noop"],
    queryFn: () => null,
    enabled: false,
  })
}

export async function updateBooking(
  id: string,
  patch: Partial<Booking>
): Promise<void> {
  const { error } = await supabase.from("bookings").update(patch).eq("id", id)
  if (error) throw error
}

// ---------- Clients ----------

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "customer")
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as Profile[]
    },
  })
}

export function useClientCars(userId: string) {
  return useQuery({
    queryKey: ["client-cars", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cars")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as Car[]
    },
  })
}

export function useClientAddresses(userId: string) {
  return useQuery({
    queryKey: ["client-addresses", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as UserAddress[]
    },
  })
}

export async function setClientActive(
  userId: string,
  isActive: boolean
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId)
  if (error) throw error
}

export async function updateClientProfile(
  userId: string,
  patch: Partial<Profile>
): Promise<void> {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId)
  if (error) throw error
}

// Create a client/provider account. Requires admin (the edge function verifies
// the caller's role server-side and creates the auth user + profile with the
// service role — the browser only ever holds the anon key).
export async function createUserAccount(input: {
  email: string
  full_name?: string
  phone?: string
  role: "customer" | "provider"
}): Promise<{ id: string }> {
  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: input,
  })
  if (error) throw error
  if (!data?.success || !data?.profile?.id) {
    throw new Error(data?.error || "Failed to create account")
  }
  return { id: data.profile.id }
}

export function useClientBookings(userId: string) {
  return useQuery({
    queryKey: ["client-bookings", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `*,
          service:services(id, name_ar, name_en, base_price),
          car:cars(id, make, model, plate_number, size),
          payment:payments(id, amount, status, method)`
        )
        .eq("customer_id", userId)
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as BookingWithRelations[]
    },
  })
}

export function useClientPayments(userId: string) {
  return useQuery({
    queryKey: ["client-payments", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(
          `*,
          booking:bookings(id, service_id, status,
            service:services(id, name_ar, name_en))`
        )
        .eq("booking.customer_id", userId)
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as (Payment & {
        booking: {
          id: string
          status: string
          service: { id: string; name_ar: string; name_en: string } | null
        } | null
      })[]
    },
  })
}

// ---------- Client details: cars & addresses CRUD ----------

// When a car is set as default, the partial unique index
// cars_one_default_per_user requires every other car of that user to be
// unset first. We clear defaults (all rows when creating, or all except the
// edited row when updating), then upsert. Each call is idempotent.
export async function saveClientCar(car: Partial<Car>): Promise<void> {
  if (car.is_default && car.user_id) {
    let query = supabase
      .from("cars")
      .update({ is_default: false })
      .eq("user_id", car.user_id)
    if (car.id) {
      query = query.neq("id", car.id)
    }
    const { error: clearError } = await query
    if (clearError) throw clearError
  }
  const { error } = await supabase.from("cars").upsert(car)
  if (error) throw error
}

export async function deleteClientCar(id: string): Promise<void> {
  const { error } = await supabase.from("cars").delete().eq("id", id)
  if (error) throw error
}

export async function saveClientAddress(
  address: Partial<UserAddress>
): Promise<void> {
  if (address.is_default && address.user_id) {
    let query = supabase
      .from("user_addresses")
      .update({ is_default: false })
      .eq("user_id", address.user_id)
    if (address.id) {
      query = query.neq("id", address.id)
    }
    const { error: clearError } = await query
    if (clearError) throw clearError
  }
  const { error } = await supabase.from("user_addresses").upsert(address)
  if (error) throw error
}

export async function deleteClientAddress(id: string): Promise<void> {
  const { error } = await supabase.from("user_addresses").delete().eq("id", id)
  if (error) throw error
}

// ---------- Services ----------

export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("sort", { ascending: true })
      if (error) throw error
      return (data ?? []) as Service[]
    },
  })
}

export async function upsertService(service: Partial<Service>): Promise<void> {
  const { error } = await supabase.from("services").upsert(service)
  if (error) throw error
}

export async function deleteService(id: string): Promise<void> {
  const { error } = await supabase.from("services").delete().eq("id", id)
  if (error) throw error
}

// ---------- Pricing & Settings ----------

export function useAppSettings() {
  return useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle()
      if (error) throw error
      return data as AppSettings | null
    },
  })
}

export async function updateAppSettings(
  patch: Partial<AppSettings>
): Promise<void> {
  const { error } = await supabase.from("app_settings").update(patch).eq("id", 1)
  if (error) throw error
}

// ---------- Providers ----------

export function useProviders() {
  return useQuery({
    queryKey: ["providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "provider")
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as Profile[]
    },
  })
}

export function useProviderJobCounts() {
  return useQuery({
    queryKey: ["provider-job-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("provider_id, status")
        .not("provider_id", "is", null)
      if (error) throw error
      const counts: Record<string, { total: number; active: number }> = {}
      for (const b of data ?? []) {
        if (!counts[b.provider_id]) {
          counts[b.provider_id] = { total: 0, active: 0 }
        }
        counts[b.provider_id].total += 1
        if (
          b.status === "pending" ||
          b.status === "accepted" ||
          b.status === "in_progress"
        ) {
          counts[b.provider_id].active += 1
        }
      }
      return counts
    },
  })
}

// ---------- Payments ----------

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(
          `*,
          booking:bookings(id, customer_id, service_id, status,
            customer:profiles!bookings_customer_id_fkey(id, full_name, phone),
            service:services(id, name_ar, name_en))`
        )
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as (Payment & {
        booking: {
          id: string
          customer_id: string
          status: string
          customer: { id: string; full_name: string | null; phone: string | null } | null
          service: { id: string; name_ar: string; name_en: string } | null
        } | null
      })[]
    },
  })
}

export async function updatePaymentStatus(
  id: string,
  status: Payment["status"]
): Promise<void> {
  const { error } = await supabase.from("payments").update({ status }).eq("id", id)
  if (error) throw error
}