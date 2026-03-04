import Link from 'next/link'

const FEATURES = [
  {
    title: 'Drag-and-Drop Kanban',
    description: 'Move items between stages with real-time persistence and stage health indicators.',
    color: 'var(--blue)',
  },
  {
    title: 'Monte Carlo Simulation',
    description: 'Run 1,000+ iterations to forecast pipeline outcomes with 95% confidence intervals.',
    color: 'var(--purple)',
  },
  {
    title: 'Sensitivity Analysis',
    description: 'Discover which conversion rate has the biggest impact on your throughput.',
    color: 'var(--green)',
  },
  {
    title: 'Bottleneck Detection',
    description: 'Heat map visualization shows exactly where items get stuck in your pipeline.',
    color: 'var(--red)',
  },
  {
    title: '6 Industry Templates',
    description: 'Sales, Content, Hiring, Product Launch, Onboarding, and Support -- ready to go.',
    color: 'var(--amber)',
  },
  {
    title: 'Export Everything',
    description: 'Download your pipeline data as CSV or JSON for external analysis.',
    color: 'var(--cyan)',
  },
] as const

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6"
          style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}
        >
          Pick &amp; Shovel Suite -- Product #4
        </div>
        <h1 className="text-5xl font-black mb-4 leading-tight">
          Pipeline<br />
          <span style={{ color: 'var(--blue)' }}>Simulator</span>
        </h1>
        <p
          className="text-lg max-w-2xl mx-auto mb-8"
          style={{ color: 'var(--text-secondary)' }}
        >
          A universal pipeline management engine that models any multi-stage process.
          Detect bottlenecks, forecast outcomes, and run what-if scenarios with
          Monte Carlo simulation.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-bold text-lg transition-all hover:scale-105"
          style={{ background: 'var(--blue)' }}
        >
          Open Dashboard
        </Link>
      </div>

      {/* Features Grid */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-xl"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderTop: `3px solid ${feature.color}`,
              }}
            >
              <h3 className="text-base font-bold mb-2">{feature.title}</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div
        className="py-16"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
      >
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-black text-center mb-10">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Pick a Template',
                desc: 'Choose from 6 industry templates or create a custom pipeline with your own stages.',
              },
              {
                step: '2',
                title: 'Add & Move Items',
                desc: 'Drag items between stages. The simulator tracks every transition and calculates metrics.',
              },
              {
                step: '3',
                title: 'Simulate & Forecast',
                desc: 'Run Monte Carlo simulations to predict outcomes and identify which levers matter most.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-lg mx-auto mb-4"
                  style={{ background: 'var(--blue)' }}
                >
                  {item.step}
                </div>
                <h3 className="font-bold mb-2">{item.title}</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
        Pipeline Simulator -- Part of the Pick &amp; Shovel Suite
      </div>
    </div>
  )
}
