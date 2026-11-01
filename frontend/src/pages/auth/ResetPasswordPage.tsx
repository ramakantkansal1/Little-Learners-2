import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { api } from "@services/api";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      setError("Invalid or missing reset token");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError("");
    try {
      await api.post("/auth/reset-password", {
        token,
        password: data.password,
        confirm_password: data.confirm_password,
      });

      setStatus("success");
    } catch (err: unknown) {
      setStatus("error");
      if (err instanceof Error) {
        setError(err.message);
      } else if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { data?: { error?: { message?: string } } };
        };
        setError(
          axiosError.response?.data?.error?.message || "Something went wrong",
        );
      } else {
        setError("Something went wrong");
      }
    }
  };

  return (
    <div className="space-y-6">
      <Link
        to="/auth/parent/login"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-500 mb-4"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Login
      </Link>

      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-pastel-blue flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-primary-500" />
        </div>
        <h2 className="text-xl font-display font-bold text-gray-900 mb-2">
          Set New Password
        </h2>
        <p className="text-gray-600">Enter your new password below</p>
      </div>

      {status === "success" ? (
        <div className="p-6 rounded-xl bg-green-50 border border-green-200 text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-green-800 mb-1">
            Password Updated
          </h3>
          <p className="text-green-700">
            Your password has been successfully reset.
          </p>
          <Link to="/auth/parent/login" className="btn btn-primary mt-4">
            Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="password" className="label">
              New Password
            </label>
            <div className="relative">
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                id="password"
                className={`input pr-12 ${errors.password ? "input-error" : ""}`}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                disabled={status === "loading"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-sm text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="confirm_password" className="label">
              Confirm Password
            </label>
            <input
              {...register("confirm_password")}
              type={showPassword ? "text" : "password"}
              id="confirm_password"
              className={`input ${errors.confirm_password ? "input-error" : ""}`}
              placeholder="Confirm your password"
              autoComplete="new-password"
              disabled={status === "loading"}
            />
            {errors.confirm_password && (
              <p className="mt-1.5 text-sm text-red-500">
                {errors.confirm_password.message}
              </p>
            )}
          </div>

          {error && (
            <div
              className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={status === "loading"}
          >
            {status === "loading" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
