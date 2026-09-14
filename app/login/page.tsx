import { AuthForm } from "@/components/auth-form";
export const dynamic = "force-dynamic";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  return (
    <AuthForm
      message={
        p.access === "denied"
          ? "This account has no access to the configured workspace. Ask your administrator or sign in with a different account."
          : p.link === "expired"
            ? "That link is expired or has already been used. Request a new reset link."
            : ""
      }
    />
  );
}
