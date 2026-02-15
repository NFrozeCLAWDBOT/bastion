import type { Ecosystem } from "@/types/dependency";
import { UploadPanel } from "./UploadPanel";

export function HeroSection({
  onAnalyse,
  isAnalysing,
}: {
  onAnalyse: (manifest: string, ecosystem: Ecosystem) => void;
  isAnalysing: boolean;
}) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Video background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/bastion_hero_v2_loop.mp4" type="video/mp4" />
      </video>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-abyss/60 via-transparent to-abyss z-10" />

      {/* Crimson gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-crimson/10 rounded-full blur-3xl z-10" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-crimson/5 rounded-full blur-3xl z-10" />

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center px-6 w-full">
        <h1 className="font-mono text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-ash-white mb-4">
          BASTION
        </h1>
        <p className="text-lg md:text-xl text-smoke-grey mb-12 max-w-lg text-center">
          See what's hiding in your dependencies
        </p>

        <UploadPanel onAnalyse={onAnalyse} isAnalysing={isAnalysing} />
      </div>
    </section>
  );
}
