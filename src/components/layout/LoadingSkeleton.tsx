export function LoadingSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-24">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Graph skeleton */}
        <div className="lg:col-span-3 glass-panel p-8 h-[500px] relative overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 600 400">
            {/* Skeleton nodes */}
            {[
              { cx: 300, cy: 200, r: 20 },
              { cx: 150, cy: 120, r: 14 },
              { cx: 450, cy: 120, r: 14 },
              { cx: 200, cy: 300, r: 12 },
              { cx: 400, cy: 300, r: 12 },
              { cx: 100, cy: 250, r: 10 },
              { cx: 500, cy: 250, r: 10 },
              { cx: 250, cy: 80, r: 10 },
              { cx: 350, cy: 340, r: 10 },
            ].map((node, i) => (
              <g key={i}>
                <line
                  x1={300}
                  y1={200}
                  x2={node.cx}
                  y2={node.cy}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth={1}
                  className="animate-skeleton-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r={node.r}
                  fill="rgba(255,255,255,0.08)"
                  className="animate-skeleton-pulse"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              </g>
            ))}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-mono text-sm text-smoke-grey animate-skeleton-pulse">
              Resolving dependency tree...
            </p>
          </div>
        </div>

        {/* Summary skeleton */}
        <div className="lg:col-span-2 glass-panel p-8 space-y-6">
          <div className="h-6 w-40 bg-white/5 rounded animate-skeleton-pulse" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-4 bg-white/5 rounded animate-skeleton-pulse"
                style={{
                  width: `${100 - i * 15}%`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
          <div className="h-8 bg-white/5 rounded-full animate-skeleton-pulse" style={{ animationDelay: "0.5s" }} />
          <div className="space-y-3 pt-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 bg-white/5 rounded-lg animate-skeleton-pulse"
                style={{ animationDelay: `${0.6 + i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
