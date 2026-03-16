function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function OnlineUsers({ taskStore, users }) {
  const onlineUsers = users ?? taskStore?.onlineUsers ?? [];

  if (!onlineUsers.length) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-300" />
        No one online right now
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
        {onlineUsers.length} online
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onlineUsers.map((user) => {
          const userId = user.id || user._id || user.email;

          return (
            <div
              key={userId}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-600"
              title={user.name || user.email}
            >
              <div className="relative">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  {getInitials(user.name || user.email || "U")}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
              </div>
              <span>{user.name || user.email}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
