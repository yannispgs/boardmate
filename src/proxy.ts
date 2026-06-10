import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js proxy (formerly "middleware", renamed in Next 16). Runs before every
 * matched route to keep the Supabase session fresh and redirect unauthenticated
 * users to the login page.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match every path except static assets and PWA icons, so auth redirects
     * never block CSS/JS/images:
     * - _next/static, _next/image
     * - favicon.ico, icon.svg, manifest.webmanifest
     * - any image file
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|webp)$).*)",
  ],
};
