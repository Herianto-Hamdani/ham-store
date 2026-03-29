const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const remotePatterns = [];

if (supabaseUrl) {
  try {
    const url = new URL(supabaseUrl);
    remotePatterns.push({
      protocol: url.protocol.replace(":", ""),
      hostname: url.hostname,
      port: url.port || undefined,
      pathname: "/storage/v1/object/public/**"
    });
  } catch {
    // Ignore invalid storage URL and keep local image delivery working.
  }
}

const isProduction = process.env.NODE_ENV === "production";
const hasHttpsAppUrl = /^https:\/\//i.test(process.env.APP_URL ?? "");

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  `connect-src 'self' https:${isProduction ? "" : " http: ws: wss:"}`,
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "object-src 'none'",
  ...(isProduction ? ["upgrade-insecure-requests"] : [])
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=()"
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin"
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff"
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN"
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin"
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-site"
  },
  {
    key: "Origin-Agent-Cluster",
    value: "?1"
  },
  ...(isProduction && hasHttpsAppUrl
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload"
        }
      ]
    : [])
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb"
    }
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      },
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          }
        ]
      }
    ];
  },
  async rewrites() {
    return [
      { source: "/katalog", destination: "/" },
      { source: "/index.php", destination: "/" },
      { source: "/product.php", destination: "/product" },
      { source: "/contact.php", destination: "/contact" },
      { source: "/admin/index.php", destination: "/admin/products" },
      { source: "/admin/login.php", destination: "/admin/login" },
      { source: "/admin/accounts.php", destination: "/admin/accounts" },
      { source: "/admin/types.php", destination: "/admin/types" },
      { source: "/admin/type_create.php", destination: "/admin/types/new" },
      { source: "/admin/type_edit.php", destination: "/admin/types" },
      { source: "/admin/settings.php", destination: "/admin/settings" },
      { source: "/admin/template_settings.php", destination: "/admin/template" }
    ];
  }
};

export default nextConfig;
