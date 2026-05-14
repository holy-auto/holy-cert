export function FeatureGrid({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid auto-rows-fr grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 ${className}`}>{children}</div>
  );
}
