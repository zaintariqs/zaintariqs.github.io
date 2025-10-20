import { BalancerSection } from '@/components/dashboard/BalancerSection'

export default function BalancerPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Balancer Trading
        </h1>
        <p className="text-white/70">
          Trade PKRSC tokens on Balancer
        </p>
      </div>

      <BalancerSection />
    </div>
  )
}
