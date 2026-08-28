import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"

/**
 * Subscribes to realtime changes on `bookings` and `captain_locations` so the
 * Live Ops board refreshes without polling. RLS applies to the authenticated
 * realtime channel — admin sees the same rows the board queries do.
 *
 * Returns `isLive`: whether the socket is connected. Cleans up on unmount.
 */
export function useLiveRealtime() {
  const queryClient = useQueryClient()
  const [isLive, setIsLive] = React.useState(false)

  React.useEffect(() => {
    const channel = supabase
      .channel("live-ops-board")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["live-bookings"] })
          queryClient.invalidateQueries({ queryKey: ["pool-bookings"] })
          queryClient.invalidateQueries({ queryKey: ["booking-status-counts"] })
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "captain_locations" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["captain-locations"] })
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setIsLive(true)
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setIsLive(false)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return { isLive }
}
