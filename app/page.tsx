import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (user.role === "STUDENT") {
    redirect("/dashboard");
  }

  if (
    user.role === "ADMIN" ||
    user.role === "LIBRARIAN"
  ) {
    redirect("/admin");
  }

  redirect("/sign-in");
}