import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const withSupabaseSession = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .client(async ({ next }) => {
    if (typeof window === "undefined") {
      return next();
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    return next({
      headers: session?.access_token
        ? {
            authorization: `Bearer ${session.access_token}`,
          }
        : undefined,
    });
  })
  .server(async ({ next }) => next());