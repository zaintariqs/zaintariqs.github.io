import { MarketMakerSection } from '@/components/dashboard/MarketMakerSection'

export default function MarketMakerPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Market Maker Bot
        </h1>
        <p className="text-muted-foreground">
          Configure and monitor the automated market maker
        </p>
      </div>

      <MarketMakerSection />
    </div>
  )
}
