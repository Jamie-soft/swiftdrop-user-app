import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type Listener = (s: AuthState) => void;

export type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

let state: AuthState = { session: null, user: null, loading: true };
const listeners = new Set<Listener>();

function setState(next: Partial<AuthState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l(state));
}

let initialized = false;
function init() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  // Fire auth listener FIRST.
  supabase.auth.onAuthStateChange((_event, session) => {
    console.log("[auth] state change:", _event, session?.user?.email ?? null);
    setState({ session, user: session?.user ?? null, loading: false });
  });

  supabase.auth.getSession().then(({ data }) => {
    setState({
      session: data.session,
      user: data.session?.user ?? null,
      loading: false,
    });
  });
}

export function useAuth(): AuthState {
  const [, force] = useState(0);
  useEffect(() => {
    init();
    const l: Listener = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return state;
}

export async function signUp(email: string, password: string) {
  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/home` : undefined;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) {
    console.error("[auth] signup failed:", error);
    throw error;
  }
  console.log("[auth] signup ok:", data.user?.email);
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    console.error("[auth] signin failed:", error);
    throw error;
  }
  console.log("[auth] signin ok:", data.user?.email);
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("[auth] signout failed:", error);
    throw error;
  }
  console.log("[auth] signout ok");
}
