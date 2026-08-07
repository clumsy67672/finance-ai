export default function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill="#0f172a" />
        <path
          d="M9 11h14a2.5 2.5 0 0 1 2.5 2.5v6A2.5 2.5 0 0 1 23 22h-6l-4 3.5v-3.5H9A2.5 2.5 0 0 1 6.5 19.5v-6A2.5 2.5 0 0 1 9 11z"
          fill="#ffffff"
        />
        <polyline
          points="11 20 15.5 15 18.5 18 23 13"
          fill="none"
          stroke="#10b981"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-xl font-semibold text-slate-900">Family Finance</span>
    </div>
  );
}
