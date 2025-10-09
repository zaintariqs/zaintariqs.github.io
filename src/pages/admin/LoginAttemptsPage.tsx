import LoginAttempts from '@/components/dashboard/LoginAttempts'

export default function LoginAttemptsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Login Attempts
        </h1>
        <p className="text-white/70">
          Monitor user login activity and security
        </p>
      </div>

      <LoginAttempts />
    </div>
  )
}
