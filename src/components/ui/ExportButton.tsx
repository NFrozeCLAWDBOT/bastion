import { cn } from "@/lib/utils";

export function ExportButton({
  onClick,
  children,
  className,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "glass-panel-hover px-4 py-2 font-mono text-sm text-smoke-grey",
        "hover:text-ash-white disabled:opacity-40 disabled:cursor-not-allowed",
        "flex items-center gap-2 cursor-pointer",
        className
      )}
    >
      {children}
    </button>
  );
}
