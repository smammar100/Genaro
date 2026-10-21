import { AuthProvider } from "@/contexts/auth-context";
import type { getInitialAuth } from "@/lib/auth-initial";

export async function AuthBoundary({
  authPromise,
  children,
}: {
  authPromise: ReturnType<typeof getInitialAuth>;
  children: React.ReactNode;
}) {
  const { user, company } = await authPromise;
  return (
    <AuthProvider initialUser={user} initialCompany={company}>
      {children}
    </AuthProvider>
  );
}
