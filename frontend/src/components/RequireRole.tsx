import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { api } from "@services/api";
import { useAuth, type User } from "@hooks/useAuth";

export default function RequireRole({
  role,
  children,
}: {
  role: User["role"];
  children: ReactNode;
}) {
  const [verified, setVerified] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    api
      .get<User>("/auth/me")
      .then(({ data }) => {
        if (active) {
          useAuth.setState({
            user: data,
            isAuthenticated: true,
            isLoading: false,
          });
          setVerified(data);
        }
      })
      .catch(() => {
        if (active) {
          useAuth.getState().clearAuth();
          setVerified(null);
        }
      });
    return () => {
      active = false;
    };
  }, [role]);
  if (verified === undefined)
    return (
      <p role="status" className="p-8">
        Checking your session…
      </p>
    );
  if (!verified)
    return (
      <Navigate
        to={`/auth/${role === "student" ? "student" : "parent"}/login`}
        replace
      />
    );
  if (verified.role !== role)
    return <Navigate to={`/${verified.role}/dashboard`} replace />;
  return <>{children}</>;
}
