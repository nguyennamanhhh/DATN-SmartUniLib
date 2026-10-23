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

  const primaryEmail = clerkUser.emailAddresses.find(
    (email) => email.id === clerkUser.primaryEmailAddressId,
  )?.emailAddress;

  const fallbackEmail = clerkUser.emailAddresses[0]?.emailAddress;

  const email = primaryEmail || fallbackEmail;

  if (!email) {
    return null;
  }

  const fullName = [clerkUser.firstName, clerkUser.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

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
