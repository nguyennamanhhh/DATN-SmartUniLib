import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    return null;
  }

  const fullName = [clerkUser.firstName, clerkUser.lastName]
    .filter(Boolean)
    .join(" ");

  const user = await prisma.user.upsert({
    where: {
      id: userId,
    },
    update: {
      email,
      fullName: fullName || null,
    },
    create: {
      id: userId,
      email,
      fullName: fullName || null,
      role: "STUDENT",
    },
  });

  return user;
}