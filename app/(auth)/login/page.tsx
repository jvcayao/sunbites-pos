"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";

import { AuthLayout } from "@/components/layouts/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/store/auth";
import { cn } from "@/lib/utils";

import type { ApiError } from "@/types/auth";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const store = useAuthStore();

  const [values, setValues] = useState<Partial<LoginFormData>>({
    email: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ token, user }) => {
      if (user.branches.length === 0) {
        setErrorBanner(
          "Your account has no branch assigned. Contact your administrator.",
        );
        return;
      }

      store.login(token, user);

      if (user.branches.length === 1) {
        store.setActiveBranch(user.branches[0]);
        router.push("/dashboard");
      } else {
        router.push("/branch");
      }
    },
    onError: (error: ApiError) => {
      setErrorBanner(error.message ?? "Login failed. Please try again.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = loginSchema.safeParse(values);
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});
    setErrorBanner(null);
    mutation.mutate(result.data);
  }

  return (
    <AuthLayout>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Welcome back</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to your Sunbites account
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={values.email ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            className={cn(fieldErrors.email && "border-destructive")}
          />
          {fieldErrors.email && (
            <p id="email-error" role="alert" className="text-xs text-destructive">
              {fieldErrors.email[0]}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={values.password ?? ""}
            onChange={(e) =>
              setValues((v) => ({ ...v, password: e.target.value }))
            }
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
            className={cn(fieldErrors.password && "border-destructive")}
          />
          {fieldErrors.password && (
            <p id="password-error" role="alert" className="text-xs text-destructive">
              {fieldErrors.password[0]}
            </p>
          )}
        </div>

        {errorBanner && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {errorBanner}
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        Contact your administrator for password assistance.
      </p>
    </AuthLayout>
  );
}
