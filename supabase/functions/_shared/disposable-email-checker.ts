/**
 * Disposable Email Detection Utility
 * Checks if an email address is from a disposable/temporary email service
 */

// Common disposable email domains (regularly updated list)
const DISPOSABLE_DOMAINS = new Set([
  // Popular disposable services
  'inboxes.com',
  'tempmail.com',
  'guerrillamail.com',
  'mailinator.com',
  '10minutemail.com',
  'throwaway.email',
  'getnada.com',
  'maildrop.cc',
  'temp-mail.org',
  'yopmail.com',
  'mohmal.com',
  'fakeinbox.com',
  'trashmail.com',
  'dispostable.com',
  'mintemail.com',
  'mytrashmail.com',
  'sharklasers.com',
  'guerrillamail.info',
  'grr.la',
  'guerrillamail.biz',
  'guerrillamail.de',
  'spam4.me',
  'mailnesia.com',
  'mailtothis.com',
  'mailcatch.com',
  'mailforspam.com',
  'tempinbox.com',
  'receiveee.com',
  'getairmail.com',
  'tempr.email',
  'burnermail.io',
  'emailondeck.com',
  'mailsac.com',
  'gufum.com',
  'mvrht.com',
  'vomoto.com',
  'rootfest.net',
  'zetmail.com',
  'dropmail.me',
  'fakermail.com',
  'disposablemail.com',
  'mailexpire.com',
  'getonemail.com',
  'emailsensei.com',
  'trashmails.com',
  'mohmal.tech',
  'moakt.com',
  'temp-mails.com',
  'tmpmail.net',
  'tmpmail.org',
  'fakemail.net',
  'throwam.com',
  'guerillamail.org',
  'mailnator.com',
  'tempmailer.com',
  'tempmailo.com',
  'emailtemp.org',
  'throwawaymail.com',
  'mailtemp.net',
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

  // Check against known disposable domains
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return true
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
