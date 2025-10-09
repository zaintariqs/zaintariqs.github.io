import { WhitelistingRequests } from '@/components/dashboard/WhitelistingRequests'

export default function WhitelistingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Whitelisting Management
        </h1>
        <p className="text-muted-foreground">
          Review and approve whitelist requests
        </p>
      </div>

      <WhitelistingRequests />
    </div>
  )
}
