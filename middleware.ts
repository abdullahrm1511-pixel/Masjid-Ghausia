import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

function isAdminRole(role?: string | null) {
  return role === "REGISTRATION_ADMIN" || role === "ADMIN" || role === "SUPER_ADMIN";
}

function canAccessAdminPath(pathname: string, role?: string | null) {
  if (!isAdminRole(role)) return false;
  if (role !== "REGISTRATION_ADMIN") return true;
  return pathname === "/admin" || pathname.startsWith("/admin/registrations");
}

export default async function middleware(request: import("next/server").NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret:
      process.env.NEXTAUTH_SECRET ??
      (process.env.NODE_ENV === "production" ? undefined : "local-development-secret-change-me")
  });
  const role = token?.role as string | undefined;

  if (pathname.startsWith("/admin") && !canAccessAdminPath(pathname, role)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if ((pathname.startsWith("/dashboard") || pathname.startsWith("/account") || pathname.startsWith("/registration")) && !role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/account/:path*", "/registration/:path*"]
};
