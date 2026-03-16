import { NavLink } from "react-router-dom";

const defaultItems = [{ to: "/projects", label: "Projects" }];

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M5 5h5v5H5V5Zm9 0h5v5h-5V5ZM5 14h5v5H5v-5Zm9 0h5v5h-5v-5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Sidebar({ isOpen, items = defaultItems, onClose }) {
  return (
    <>
      <div
        className={[
          "fixed inset-0 z-30 bg-slate-950/25 backdrop-blur-sm transition-opacity duration-200 lg:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={onClose}
      />

      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white px-4 py-6 transition-transform duration-200 lg:static lg:z-0 lg:w-72 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="mb-8 px-2">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
            Navigation
          </p>
        </div>

        <nav className="space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                ].join(" ")
              }
            >
              <GridIcon />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
