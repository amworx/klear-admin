/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { supabase } from "@/lib/supabase"
import type { Profile } from "@/lib/types"

export type AuthState = {
  status: "loading" | "signedOut" | "signedIn"
  profile: Profile | null
  isAdmin: boolean
}

type AuthContextValue = AuthState & {
  refresh: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle()
  if (error) {
    console.error("fetchProfile error:", error.message)
    return null
  }
  return data
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    status: "loading",
    profile: null,
    isAdmin: false,
  })

  const refresh = React.useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.user) {
      setState({ status: "signedOut", profile: null, isAdmin: false })
      return
    }
    const profile = await fetchProfile(session.user.id)
    setState({
      status: "signedIn",
      profile,
      isAdmin: profile?.role === "admin",
    })
  }, [])

  React.useEffect(() => {
    let active = true

    const applySession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!active) return
      if (!session?.user) {
        setState({ status: "signedOut", profile: null, isAdmin: false })
        return
      }
      const profile = await fetchProfile(session.user.id)
      if (!active) return
      setState({
        status: "signedIn",
        profile,
        isAdmin: profile?.role === "admin",
      })
    }

    applySession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      if (!session?.user) {
        setState({ status: "signedOut", profile: null, isAdmin: false })
        return
      }
      // Profile fetch happens after sign-in; use a short async follow-up so
      // the profile row is guaranteed to exist on first login.
      setTimeout(async () => {
        const profile = await fetchProfile(session.user.id)
        if (!active) return
        setState({
          status: "signedIn",
          profile,
          isAdmin: profile?.role === "admin",
        })
      }, 0)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const value = React.useMemo(
    () => ({ ...state, refresh }),
    [state, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}