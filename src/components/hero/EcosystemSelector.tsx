import type { Ecosystem } from "@/types/dependency";
import { cn } from "@/lib/utils";

const ECOSYSTEMS: { value: Ecosystem; label: string }[] = [
  { value: "npm", label: "npm" },
  { value: "pypi", label: "PyPI" },
  { value: "go", label: "Go" },
  { value: "maven", label: "Maven" },
  { value: "cargo", label: "Cargo" },
];

export function EcosystemSelector({
  value,
  onChange,
}: {
  value: Ecosystem;
  onChange: (eco: Ecosystem) => void;
}) {
  return (
    <div className="flex rounded-xl overflow-hidden border border-glass-border bg-abyss/50">
      {ECOSYSTEMS.map((eco) => (
        <button
          key={eco.value}
          onClick={() => onChange(eco.value)}
          className={cn(
            "px-4 py-2 font-mono text-sm transition-all duration-200 cursor-pointer",
            value === eco.value
              ? "bg-crimson/20 text-crimson border-crimson/30"
              : "text-smoke-grey hover:text-ash-white hover:bg-white/5"
          )}
        >
          {eco.label}
        </button>
      ))}
    </div>
  );
}
