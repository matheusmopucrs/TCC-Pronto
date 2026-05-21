import { Link, useLocation } from "@tanstack/react-router";

const navItems = [
  { to: "/", label: "Introduction", section: "01" },
  { to: "/dados-iniciais", label: "Company Data", section: "02" },
  { to: "/previsoes", label: "Predictions", section: "03" },
] as const;

export function SiteSidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="hidden lg:flex w-72 shrink-0 border-r border-hairline py-12 px-8 flex-col justify-between bg-paper">
      <div>
        <Link to="/" className="block mb-16">
          <div className="font-serif text-xl font-medium tracking-tight text-ink">
            Ockham <span className="text-ink-muted italic font-normal">Intelligence</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mt-2">
            Quant Forecast Briefing
          </div>
        </Link>

        <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-4">
          Sections
        </div>
        <ul className="flex flex-col gap-5 text-sm">
          {navItems.map((item) => {
            const active = pathname === item.to;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={`group flex items-baseline gap-3 transition-colors ${
                    active ? "text-ink font-medium" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  <span className="font-mono text-[10px] tracking-widest">{item.section}</span>
                  <span className="relative">
                    {item.label}
                    {active && (
                      <span className="absolute -left-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent" />
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
        Pipeline v.1.0.0
        <div className="mt-1 normal-case tracking-normal text-ink-muted/80">
          tcc-finance · LSTM + XGBoost
        </div>
      </div>
    </aside>
  );
}
