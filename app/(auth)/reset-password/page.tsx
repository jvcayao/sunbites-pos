"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";

import { AuthLayout } from "@/components/layouts/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/auth";
import { cn } from "@/lib/utils";

import type { ApiError } from "@/types/auth";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    password_confirmation: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [values, setValues] = useState<FormData>({
    password: "",
    password_confirmation: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => authApi.resetPassword({ token, email, ...values }),
    onSuccess: () => {
      router.push("/login?reset=1");
    },
    onError: (error: ApiError) => {
      setErrorBanner(
        error.message ?? "Unable to reset password. Please request a new link.",
      );
    },
  });

  if (!token || !email) {
    return (
      <AuthLayout>
        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            This reset link is invalid or has expired.
          </div>
          <Link
            href="/login"
            className="block text-center text-sm text-primary underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = schema.safeParse(values);
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});
    setErrorBanner(null);
    mutation.mutate();
  }

  return (
    <AuthLayout>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">
          Set a new password
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a new password for <span className="font-medium">{email}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={values.password}
            onChange={(e) =>
              setValues((v) => ({ ...v, password: e.target.value }))
            }
            aria-invalid={!!fieldErrors.password}
            aria-describedby={
              fieldErrors.password ? "password-error" : undefined
            }
            className={cn(fieldErrors.password && "border-destructive")}
          />
          {fieldErrors.password && (
            <p
              id="password-error"
              role="alert"
              className="flex items-center gap-1 text-xs text-destructive"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {fieldErrors.password[0]}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password_confirmation">Confirm new password</Label>
          <Input
            id="password_confirmation"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={values.password_confirmation}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                password_confirmation: e.target.value,
              }))
            }
            aria-invalid={!!fieldErrors.password_confirmation}
            aria-describedby={
              fieldErrors.password_confirmation ? "confirm-error" : undefined
            }
            className={cn(
              fieldErrors.password_confirmation && "border-destructive",
            )}
          />
          {fieldErrors.password_confirmation && (
            <p
              id="confirm-error"
              role="alert"
              className="flex items-center gap-1 text-xs text-destructive"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {fieldErrors.password_confirmation[0]}
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

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Resetting…" : "Reset password"}
        </Button>

        <Link
          href="/login"
          className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </form>
    </AuthLayout>
  );
}
