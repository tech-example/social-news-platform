import { getSession } from "@/server/auth";
import { redirect } from "next/navigation";

export default async function AuthLayout({ children }) {
  const session = await getSession();
  if (session) {
    redirect("/");
  }
  return <>{children}</>;
}
