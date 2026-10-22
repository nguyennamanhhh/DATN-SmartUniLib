import { requireRole } from "@/lib/auth";
import { AdminLayoutShell } from "@/components/admin-layout-shell";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireRole([
    "ADMIN",
    "LIBRARIAN",
  ]);

  const displayName =
    user.fullName || user.email || "Quản trị viên";

  const initial = displayName
    .charAt(0)
    .toUpperCase();

  const header = (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-4 sm:px-6 lg:px-8">
      <div>
        <p className="text-xs text-muted-foreground">
          Người quản trị
        </p>

        <p className="font-semibold">
          {displayName}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium">
            {user.fullName || "Quản trị viên"}
          </p>

          <p className="text-xs text-muted-foreground">
            {user.email}
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
          {initial}
        </div>

        <div className="hidden rounded-md bg-gray-100 px-3 py-1 text-xs font-medium sm:block">
          {user.role}
        </div>
      </div>
    </header>
  );

  return (
    <AdminLayoutShell header={header}>
      {children}
    </AdminLayoutShell>
  );
}