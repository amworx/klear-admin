// Database row types mirroring the Klear Supabase schema (see
// android/klear/supabase/migrations). Keep in sync when the schema changes.

export type UserRole = "customer" | "provider" | "admin"

export type Profile = {
  id: string
  full_name: string | null
  phone: string | null
  /** Global, human-friendly sequential client number (e.g. CL-1001). */
  client_no: string | null
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
  | "on_the_way"
  | "in_progress"
  | "completed"
  | "cancelled"

export type BookingTimeType = "all_day" | "window" | "urgent"

export type ServiceBadgeKey = "popular" | "new" | "best_value"

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
  /** Merchandising discount percent (1-90), null = no discount. */
  discount_percent: number | null
  /** Admin-set merchandising badge shown on the client catalog. */
  badge_key: ServiceBadgeKey | null
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

export type CarAttrDataType = "text" | "select"

/** One option of a `select` car attribute. Carries an optional price factor
 *  (used when the attribute `affects_price`). */
export type CarAttributeOption = {
  value: string
  label_ar: string
  label_en: string
  /** Numeric factor applied to the service base price when this option is set
   *  (only meaningful when the parent attribute `affects_price` is true). */
  factor?: number
}

/** An admin-managed car attribute (the catalog). Maps onto
 *  `car_attributes` in the Klear Supabase schema. */
export type CarAttribute = {
  id: string
  /** Stable lookup key. System attributes use make/model/plate_number/size. */
  key: string
  label_ar: string
  label_en: string
  data_type: CarAttrDataType
  options: CarAttributeOption[]
  /** Whether this attribute is a pricing driver (multiplies the base price). */
  affects_price: boolean
  /** Numeric factor for `text` attributes (or fallback). */
  price_factor: number
  sort_order: number
  is_visible: boolean
  is_required: boolean
  /** Locked built-ins (make/model/plate_number/size) — cannot be deleted. */
  is_system: boolean
  created_at: string
}

/** A per-car value for an attribute (`car_attribute_values`). */
export type CarAttributeValue = {
  id: string
  car_id: string
  attribute_id: string
  value: string
  created_at: string
  updated_at: string
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
  customer: Pick<Profile, "id" | "full_name" | "phone" | "client_no"> | null
  provider: Pick<Profile, "id" | "full_name" | "phone"> | null
  service: Pick<Service, "id" | "name_ar" | "name_en" | "base_price"> | null
  car: Pick<Car, "id" | "make" | "model" | "plate_number" | "size"> | null
  payment: Pick<Payment, "id" | "amount" | "status" | "method"> | null
}

/** A captain's live GPS row from the `captain_locations` table. */
export type CaptainLocation = {
  id: string
  provider_id: string
  lat: number
  lng: number
  active_booking_id: string | null
  updated_at: string
}