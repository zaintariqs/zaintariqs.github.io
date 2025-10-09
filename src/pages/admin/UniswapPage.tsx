import { UniswapSection } from '@/components/dashboard/UniswapSection'

export default function UniswapPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Uniswap Trading
        </h1>
        <p className="text-muted-foreground">
          Trade PKRSC tokens on Uniswap
        </p>
      </div>

      <UniswapSection />
    </div>
  )
}
