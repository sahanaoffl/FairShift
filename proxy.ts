import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/src/lib/session-token";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/worker/login") || pathname.startsWith("/admin/login") ||
    pathname.startsWith("/api/auth/") || pathname.startsWith("/api/worker/login")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/worker") || pathname.startsWith("/admin") ||
    pathname.startsWith("/api/worker") || pathname.startsWith("/api/admin")) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = token ? await verifySessionToken(token) : undefined;
    const requiredRole = pathname.startsWith("/admin") || pathname.startsWith("/api/admin") ? "admin" : "worker";
    if (!session || session.role !== requiredRole) {
      if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      const login = requiredRole === "admin" ? "/admin/login" : "/worker/login";
      return NextResponse.redirect(new URL(login, request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/worker/:path*", "/admin/:path*", "/api/worker/:path*", "/api/admin/:path*"],
};
