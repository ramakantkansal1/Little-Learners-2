import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@hooks/useAuth";
import { api } from "@services/api";

const registerSchema = z
  .object({
    full_name: z.string().min(1, "Full name is required").max(255),
    email: z.string().email("Please enter a valid email address"),
    phone_number: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number")
      .optional()
      .or(z.literal("")),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
    accept_terms: z.literal(true, {
      errorMap: () => ({ message: "You must accept the terms and conditions" }),
    }),
    accept_privacy: z.literal(true, {
      errorMap: () => ({ message: "You must accept the privacy policy" }),
    }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function ParentRegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { setAuth, isLoading } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setError("");
    try {
      // Normalize empty phone number to null for backend compatibility
      const payload = {
        ...data,
        phone_number: data.phone_number === "" ? null : data.phone_number,
      };
      const response = await api.post("/auth/parent/register", payload);

      const result = response.data;

      if (result.user_id) {
        // If email verification is required, redirect to login
        if (result.email_verification_required) {
          navigate("/auth/parent/login?verified=false", { replace: true });
          return;
        }

        // Auto-login if verified
        const loginResponse = await api.post("/auth/parent/login", {
          email: data.email,
          password: data.password,
          remember_me: false,
        });

        const loginResult = loginResponse.data;
        if (loginResult.access_token) {
          // Backend returns TokenResponse directly (not wrapped in ApiResponse)
          setAuth(
            loginResult.user,
            loginResult.access_token,
            loginResult.refresh_token,
          );
          navigate("/parent/dashboard", { replace: true });
        } else {
          navigate("/auth/parent/login", { replace: true });
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { data?: { error?: { message?: string } } };
        };
        setError(
          axiosError.response?.data?.error?.message || "Registration failed",
        );
      } else {
        setError("Registration failed. Please try again.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="full_name" className="label">
          Full Name
        </label>
        <input
          {...register("full_name")}
          type="text"
          id="full_name"
          className={`input ${errors.full_name ? "input-error" : ""}`}
          placeholder="Your full name"
          autoComplete="name"
          disabled={isLoading}
        />
        {errors.full_name && (
          <p className="mt-1.5 text-sm text-red-500">
            {errors.full_name.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="label">
          Email Address
        </label>
        <input
          {...register("email")}
          type="email"
          id="email"
          className={`input ${errors.email ? "input-error" : ""}`}
          placeholder="parent@example.com"
          autoComplete="email"
          disabled={isLoading}
        />
        {errors.email && (
          <p className="mt-1.5 text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="phone_number" className="label">
          Phone Number (Optional)
        </label>
        <input
          {...register("phone_number")}
          type="tel"
          id="phone_number"
          className={`input ${errors.phone_number ? "input-error" : ""}`}
          placeholder="+91 98765 43210"
          autoComplete="tel"
          disabled={isLoading}
        />
        {errors.phone_number && (
          <p className="mt-1.5 text-sm text-red-500">
            {errors.phone_number.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <div className="relative">
          <input
            {...register("password")}
            type={showPassword ? "text" : "password"}
            id="password"
            className={`input pr-12 ${errors.password ? "input-error" : ""}`}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            disabled={isLoading}
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
          disabled={isLoading}
        />
        {errors.confirm_password && (
          <p className="mt-1.5 text-sm text-red-500">
            {errors.confirm_password.message}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            {...register("accept_terms")}
            type="checkbox"
            className="w-4 h-4 mt-0.5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            required
          />
          <div className="text-sm text-gray-600">
            I agree to the{" "}
            <Link to="/terms" className="text-primary-500 hover:underline">
              Terms of Service
            </Link>
          </div>
        </label>
        {errors.accept_terms && (
          <p className="text-sm text-red-500 ml-7">
            {errors.accept_terms.message}
          </p>
        )}

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            {...register("accept_privacy")}
            type="checkbox"
            className="w-4 h-4 mt-0.5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            required
          />
          <div className="text-sm text-gray-600">
            I agree to the{" "}
            <Link to="/privacy" className="text-primary-500 hover:underline">
              Privacy Policy
            </Link>
          </div>
        </label>
        {errors.accept_privacy && (
          <p className="text-sm text-red-500 ml-7">
            {errors.accept_privacy.message}
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
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Creating account...
          </>
        ) : (
          "Create Account"
        )}
      </button>
    </form>
  );
}
