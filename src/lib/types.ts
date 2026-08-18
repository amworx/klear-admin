// Database row types mirroring the Klear Supabase schema (see
// android/klear/supabase/migrations). Keep in sync when the schema changes.

export type UserRole = "customer" | "provider" | "admin"

export type Profile = {
  id: string
  full_name: string | null
  phone: string | null
  role: UserRole
  is_available: boolean
  created_at: string
  address: string | null
  lat: number | null
  lng: number | null
  is_active: boolean
}

export type BookingStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled"

export type BookingTimeType = "all_day" | "window" | "urgent"

export type Service = {
  id: string
  name_ar: string
  name_en: string
  desc_ar: string | null
  desc_en: string | null
  base_price: number
  currency: string
  is_active: boolean
  sort: number
  duration_min: number | null
}

export type Booking = {
  id: string
  customer_id: string
  provider_id: string | null
  service_id: string
  car_id: string | null
  status: BookingStatus
  time_type: BookingTimeType
  scheduled_at: string
  scheduled_end: string | null
  address: string | null
  lat: number | null
  lng: number | null
  note: string | null
  total_price: number | null
  created_at: string
  updated_at: string
}

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded"

export type Payment = {
  id: string
  booking_id: string
  method: string
  amount: number
  status: PaymentStatus
  reference: string | null
  created_at: string
}

export type Car = {
  id: string
  user_id: string
  make: string
  model: string
  plate_number: string
  size: "small" | "medium" | "large"
  is_default: boolean
  created_at: string
}

export type UserAddress = {
  id: string
  user_id: string
  label: string
  address: string
  lat: number
  lng: number
  is_default: boolean
  created_at: string
  updated_at: string
}

export type AppSettings = {
  id: number
  size_small_factor: number
  size_medium_factor: number
  size_large_factor: number
  urgent_surcharge_pct: number
  service_hours_start: string // HH:mm
  service_hours_end: string // HH:mm
  currency: string
  updated_at: string
}

// Joins used by the dashboard queries.
export type BookingWithRelations = Booking & {
  customer: Pick<Profile, "id" | "full_name" | "phone"> | null
  provider: Pick<Profile, "id" | "full_name" | "phone"> | null
  service: Pick<Service, "id" | "name_ar" | "name_en" | "base_price"> | null
  car: Pick<Car, "id" | "make" | "model" | "plate_number" | "size"> | null
  payment: Pick<Payment, "id" | "amount" | "status" | "method"> | null
}