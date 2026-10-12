import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Checks server-side whether the signed-in (verified) user is listed in the admins table. */
export const getAdminStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("is_current_user_admin");
    if (error) {
      console.error("Admin check failed", error);
      return { isAdmin: false };
    }
    return { isAdmin: data === true };
  });
