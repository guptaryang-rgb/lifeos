import { NextRequest, NextResponse } from 'next/server';

// ── Rate Limiting (in-memory, per-IP) ──────────────────
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const AUTH_RATE_LIMIT = 10; // 10 attempts per minute for auth endpoints
const API_RATE_LIMIT = 60; // 60 requests per minute for general API

function checkRateLimit(ip: string, limit: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  entry.count++;
  if (entry.count > limit) return false;
  return true;
}

// Clean up old entries periodically (prevent memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) rateLimitMap.delete(key);
  }
}, 60 * 1000);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  // ── CSRF Protection ────────────────────────────
  // For state-changing requests to API routes, verify the origin matches our app.
  // Skip for GET/HEAD/OPTIONS, NextAuth routes (own CSRF), and webhook routes (signature verification).
  if (pathname.startsWith('/api/')) {
    const method = request.method.toUpperCase();
    const isStateChanging = !['GET', 'HEAD', 'OPTIONS'].includes(method);
    const isNextAuthRoute = pathname.startsWith('/api/auth/');
    const isWebhookRoute = pathname.startsWith('/api/webhooks/');

    if (isStateChanging && !isNextAuthRoute && !isWebhookRoute) {
      const origin = request.headers.get('origin');
      const referer = request.headers.get('referer');
      const appOrigin = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const allowedCsrfOrigins = [
        appOrigin,
        'http://localhost:3000',
        'http://localhost:4000',
        'capacitor://localhost',
        'ionic://localhost',
      ];

      const originMatch = origin && allowedCsrfOrigins.includes(origin);
      const refererMatch = referer && allowedCsrfOrigins.some(o => referer.startsWith(o));

      if (!originMatch && !refererMatch) {
        return NextResponse.json(
          { error: 'CSRF validation failed. Request origin is not allowed.' },
          { status: 403 }
        );
      }
    }
  }

  // ── Rate Limiting ──────────────────────────────
  if (pathname.startsWith('/api/')) {
    const isAuthEndpoint = pathname === '/api/login' || pathname === '/api/register';
    const limit = isAuthEndpoint ? AUTH_RATE_LIMIT : API_RATE_LIMIT;

    if (!checkRateLimit(`${ip}:${pathname}`, limit)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }
  }

  // ── CORS ───────────────────────────────────────
  const response = NextResponse.next();
  const origin = request.headers.get('origin');

  // Allow same-origin and capacitor:// for mobile app
  const allowedOrigins = [
    process.env.NEXTAUTH_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:4000',
    'capacitor://localhost',
    'ionic://localhost',
  ];

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: response.headers });
  }

  // ── Security Headers ───────────────────────────
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(self)');

  // HSTS only in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // CSP - permissive enough for the app but blocks common attacks
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // needed for Next.js dev
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://generativelanguage.googleapis.com https://api.stripe.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; ')
  );

  return response;
}

// Only run middleware on API routes and pages (skip static files)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|icons|manifest\\.json|service-worker\\.js).*)',
  ],
};
