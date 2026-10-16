import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import type { Role } from "@prisma/client";

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

export async function requireRole(roles: Role[]) {
  const user = await requireUser();

  if (!roles.includes(user.role)) {
    redirect("/");
  }

  return user;
}