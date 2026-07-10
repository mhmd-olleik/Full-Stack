import type { NextConfig } from "next";

const securityHeaders = [
  // Block all search engine indexing
  {
    key: 'X-Robots-Tag',
    value: 'noindex, nofollow, noarchive, nosnippet, noimageindex',
  },
  // Prevent XSS attacks
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  // Prevent MIME type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Prevent clickjacking
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // Control referrer information - hide origin completely
  {
    key: 'Referrer-Policy',
    value: 'no-referrer',
  },
  // Permissions Policy - disable all tracking and ad features
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=(), attribution-reporting=(), run-ad-auction=(), join-ad-interest-group=()',
  },
  // Strict Transport Security (HTTPS only for 2 years)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Content Security Policy - strict but allow necessary resources
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' https://image.tmdb.org data: blob:",
      "frame-src 'self' https://vidlink.pro https://vsembed.ru https://vidsrc-embed.ru https://www.2embed.cc https://2embed.cc https://*.vidlink.pro https://*.vsembed.ru https://*.vidsrc-embed.ru https://*.2embed.cc",
      "connect-src 'self' https://api.themoviedb.org",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  },
  // Prevent DNS prefetching to hide visited links
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'off',
  },
  // Hide download options
  {
    key: 'X-Download-Options',
    value: 'noopen',
  },
  // Cache control for sensitive pages
  {
    key: 'Cache-Control',
    value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
  },
  {
    key: 'Pragma',
    value: 'no-cache',
  },
  {
    key: 'Expires',
    value: '0',
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/**',
      },
    ],
  },
  // Add security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  // Disable powered by header to hide Next.js
  poweredByHeader: false,
};

export default nextConfig;


