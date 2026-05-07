// Privacy middleware — strips and never logs real IP addresses or location data
const privacyMiddleware = (req, res, next) => {
  // Remove real client IP from request context — replace with anonymized token
  req.clientIp = "0.0.0.0"; // never store real IP

  // Strip forwarded-for headers so they don't leak downstream
  delete req.headers["x-forwarded-for"];
  delete req.headers["x-real-ip"];
  delete req.headers["cf-connecting-ip"];

  // Set strict privacy response headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=(), interest-cohort=()");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; connect-src 'self' wss: https:; img-src 'self' https: data:; script-src 'self' 'unsafe-inline' https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com;"
  );

  next();
};

module.exports = privacyMiddleware;
