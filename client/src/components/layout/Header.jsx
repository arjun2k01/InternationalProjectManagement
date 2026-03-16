import { useState } from "react";
import toast from "react-hot-toast";

import Button from "../common/Button";

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function Header({
  appName = "ProjectFlow",
  authStore,
  onMenuClick,
}) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const user = authStore?.user;

  const handleLogout = async () => {
    if (!authStore?.logout) {
      return;
    }

    try {
      setIsLoggingOut(true);
      await authStore.logout();
      toast.success("Logged out successfully.");
    } catch (error) {
      toast.error(error?.response?.data?.error?.message || error?.message || "Logout failed.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 lg:hidden"
            aria-label="Open navigation"
          >
            <MenuIcon />
          </button>

          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Workspace</p>
            <h1 className="text-lg font-semibold text-slate-900">{appName}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-900">{user?.name || "Guest User"}</p>
            <p className="text-xs text-slate-500">{user?.email || "No session"}</p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
            {getInitials(user?.name || "GU")}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleLogout}
            loading={isLoggingOut}
          >
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
