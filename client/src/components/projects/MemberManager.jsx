import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import Button from "../common/Button";
import Input from "../common/Input";

const roleStyles = {
  manager: "bg-slate-900 text-white",
  member: "bg-slate-100 text-slate-700",
};

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function MemberManager({
  canManage = true,
  members = [],
  onAddMember,
  onRemoveMember,
  owner = null,
}) {
  const [form, setForm] = useState({ email: "", role: "member" });
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState("");

  const normalizedMembers = useMemo(() => {
    const ownerEntry = owner
      ? [
          {
            user: owner,
            role: "owner",
          },
        ]
      : [];

    return [...ownerEntry, ...members];
  }, [members, owner]);

  const handleAddMember = async (event) => {
    event.preventDefault();

    if (!form.email.trim()) {
      toast.error("Email is required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("Enter a valid email address.");
      return;
    }

    if (!onAddMember) {
      toast.error("Add member action is not configured.");
      return;
    }

    try {
      setSubmitting(true);
      await onAddMember(form.email.trim(), form.role);
      toast.success("Member added successfully.");
      setForm({ email: "", role: "member" });
    } catch (error) {
      toast.error(
        error?.response?.data?.error?.message ||
          error?.message ||
          "Unable to add member."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (member) => {
    const userId = member?.user?.id || member?.user?._id;

    if (!userId || !onRemoveMember) {
      return;
    }

    const confirmed = window.confirm(`Remove ${member.user.name} from this project?`);

    if (!confirmed) {
      return;
    }

    try {
      setRemovingId(userId);
      await onRemoveMember(userId);
      toast.success("Member removed.");
    } catch (error) {
      toast.error(
        error?.response?.data?.error?.message ||
          error?.message ||
          "Unable to remove member."
      );
    } finally {
      setRemovingId("");
    }
  };

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Members</h3>
        <p className="mt-1 text-sm text-slate-500">
          Manage who can collaborate in this project.
        </p>
      </div>

      <div className="space-y-3">
        {normalizedMembers.length ? (
          normalizedMembers.map((member) => {
            const user = member.user || {};
            const userId = user.id || user._id || user.email;
            const isOwner = member.role === "owner";

            return (
              <div
                key={userId}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                    {getInitials(user.name || user.email || "U")}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {user.name || "Unnamed user"}
                    </p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-medium",
                      roleStyles[member.role] || "bg-amber-100 text-amber-700",
                    ].join(" ")}
                  >
                    {member.role}
                  </span>

                  {!isOwner && canManage ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={removingId === userId}
                      onClick={() => handleRemoveMember(member)}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
            No members have been added yet.
          </p>
        )}
      </div>

      {canManage ? (
        <form onSubmit={handleAddMember} className="space-y-4 border-t border-slate-100 pt-6">
          <div className="grid gap-4 md:grid-cols-[1fr_180px]">
            <Input
              label="Invite by email"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="teammate@company.com"
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Role</label>
              <select
                value={form.role}
                onChange={(event) =>
                  setForm((current) => ({ ...current, role: event.target.value }))
                }
                className="h-[46px] w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
              >
                <option value="member">Member</option>
                <option value="manager">Manager</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={submitting}>
              Add member
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
