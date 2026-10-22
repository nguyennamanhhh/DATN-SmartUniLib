import { requireRole } from "@/lib/auth";
import { UserLayoutShell } from "@/components/user-layout-shell";

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["STUDENT"]);

  const displayName =
    user.fullName || user.email || "Sinh viên";

  const initial = displayName
    .charAt(0)
    .toUpperCase();

  const header = (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div>
        <p className="text-sm font-medium">
          SmartUniLib
        </p>

        <p className="text-xs text-muted-foreground">
          Cổng sinh viên
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium">
            {displayName}
          </p>

          <p className="text-xs text-muted-foreground">
            {user.email}
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
          {initial}
        </div>
      </div>
    </header>
  );

  return (
    <UserLayoutShell header={header}>
      {children}
    </UserLayoutShell>
  );
}