import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export default async function middleware(request: import("next/server").NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret:
      process.env.NEXTAUTH_SECRET ??
      (process.env.NODE_ENV === "production" ? undefined : "local-development-secret-change-me")
  });
  const role = token?.role as string | undefined;

  if ((pathname.startsWith("/dashboard") || pathname.startsWith("/account") || pathname.startsWith("/registration")) && !role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/account/:path*", "/registration/:path*"]
};
