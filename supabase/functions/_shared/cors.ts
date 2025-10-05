// Shared CORS configuration for production hardening
// In production, update the origin to your specific domain(s)
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // TODO: Replace with specific domain in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// Security headers to prevent clickjacking and other attacks
export const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': "frame-ancestors 'none'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

// Combined headers for responses
export const responseHeaders = {
  ...corsHeaders,
  ...securityHeaders,
  'Content-Type': 'application/json',
}

// Generic error messages for production (don't leak implementation details)
export function getErrorMessage(error: unknown, isDevelopment = false): string {
  if (isDevelopment) {
    return error instanceof Error ? error.message : 'Unknown error'
  }
  
  // Generic message for production
  return 'An error occurred processing your request'
}

// Rate limiting helper
export class RateLimiter {
  private requests = new Map<string, number[]>()
  
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}
  
  check(identifier: string): boolean {
    const now = Date.now()
    const timestamps = this.requests.get(identifier) || []
    
    // Filter out old requests
    const recentRequests = timestamps.filter(t => now - t < this.windowMs)
    
    if (recentRequests.length >= this.maxRequests) {
      return false
    }
    
    recentRequests.push(now)
    this.requests.set(identifier, recentRequests)
    
    // Cleanup old entries
    if (this.requests.size > 10000) {
      for (const [key, times] of this.requests.entries()) {
        if (times.every(t => now - t > this.windowMs * 2)) {
          this.requests.delete(key)
        }
      }
    }
    
    return true
  }
}