/**
 * Disposable Email Detection Utility
 * Checks if an email address is from a disposable/temporary email service
 */

// Common disposable email domains (regularly updated list)
const DISPOSABLE_DOMAINS = new Set([
  // Popular disposable services
  'inboxes.com',
  'tempmail.com',
  'tempmail.dev',
  'temp-mail.io',
  'temp-mail.org',
  'tempmailo.com',
  'tempmailer.com',
  'tempr.email',
  '10minutemail.com',
  'my10minutemail.com',
  'minuteinbox.com',
  'getnada.com',
  'guerrillamail.com',
  'guerrillamail.info',
  'guerrillamail.biz',
  'guerrillamail.de',
  'guerillamail.org',
  'sharklasers.com',
  'mailinator.com',
  'mailnator.com',
  'yopmail.com',
  'yopmail.net',
  'yopmail.fr',
  'maildrop.cc',
  'mailnesia.com',
  'mailtothis.com',
  'mailcatch.com',
  'mailforspam.com',
  'trashmail.com',
  'trashmail.me',
  'trashmail.se',
  'trashmails.com',
  'dispostable.com',
  'disposablemail.com',
  'burnermail.io',
  'fakermail.com',
  'fakeinbox.com',
  'fakemail.net',
  'rootfest.net',
  'dropmail.me',
  'dropmail.icu',
  'mailsac.com',
  'gufum.com',
  'mvrht.com',
  'vomoto.com',
  'zetmail.com',
  'spam4.me',
  'tempinbox.com',
  'receiveee.com',
  'getairmail.com',
  'emailondeck.com',
  'emailtemp.org',
  'mintemail.com',
  'mailexpire.com',
  'getonemail.com',
  'emailsensei.com',
  'mohmal.com',
  'mohmal.tech',
  'moakt.com',
  'moakt.co',
  'moakt.ws',
  'moakt.cc',
  'tmpmail.net',
  'tmpmail.org',
  'tmpmail.com',
  'throwaway.email',
  'throwawaymail.com',
  'throwam.com',
  '1secmail.com',
  '33mail.com',
  'mail-temporaire.fr',
  'jetable.org',
  'temporary-mail.net',
  'tempail.com',
  'mail7.io',
  'tmail.gg',
  'tmail.ws',
  'gimpmail.com',
])

// Suspicious patterns that might indicate disposable emails
const SUSPICIOUS_PATTERNS = [
  /^temp.*mail/i,
  /^fake.*mail/i,
  /^trash.*mail/i,
  /^throw.*away/i,
  /^disposable/i,
  /^guerrilla/i,
  /^mailinator/i,
  /minute.*mail/i,
  /^burner/i,
  /^spam/i,
]

/**
 * Check if an email is from a disposable email service
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }

  const normalizedEmail = email.toLowerCase().trim()
  
  // Extract domain from email
  const atIndex = normalizedEmail.lastIndexOf('@')
  if (atIndex === -1) {
    return false
  }

  const domain = normalizedEmail.substring(atIndex + 1)

  // Exact or subdomain match against known disposable domains
  for (const listed of DISPOSABLE_DOMAINS) {
    if (domain === listed || domain.endsWith(`.${listed}`)) {
      return true
    }
  }

  // Check against suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(domain)) {
      return true
    }
  }

  return false
}

/**
 * Get a user-friendly error message for disposable email detection
 */
export function getDisposableEmailError(): string {
  return 'Disposable email addresses are not allowed. Please use a permanent email address from a trusted provider (Gmail, Outlook, Yahoo, etc.)'
}
