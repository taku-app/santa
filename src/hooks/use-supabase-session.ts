'use client';

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabaseBrowserClient } from "@/lib/supabase-browser";

export function useSupabaseSession() {
  const supabase = useMemo(() => supabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session ?? null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (isMounted) {
        setSession(currentSession);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return { session, supabase };
}
