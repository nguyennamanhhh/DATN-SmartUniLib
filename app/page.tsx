import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">
          Xin chào {user.fullName || user.email}
        </h1>

        <p>Email: {user.email}</p>
        <p>Role: {user.role}</p>
      </div>
    </main>
  );
}