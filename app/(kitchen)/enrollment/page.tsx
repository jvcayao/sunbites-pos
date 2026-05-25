"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { AlertCircle, CheckCircle2, Printer, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { QRCode } from "react-qr-code";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { studentApi } from "@/lib/api/students";
import { useAuthStore } from "@/lib/store/auth";
import { cn } from "@/lib/utils";

import type { ApiError } from "@/types/auth";
import type {
  EnrolledStudentResponse,
  SchoolMonth,
  StudentContactInput,
} from "@/types/student";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCHOOL_MONTH_VALUES = [
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
  "january",
  "february",
  "march",
] as const;

const SCHOOL_MONTH_LABELS: Record<SchoolMonth, string> = {
  june: "June",
  july: "July",
  august: "August",
  september: "September",
  october: "October",
  november: "November",
  december: "December",
  january: "January",
  february: "February",
  march: "March",
};

const SCHOOL_MONTH_ORDER: Record<SchoolMonth, number> = {
  june: 0,
  july: 1,
  august: 2,
  september: 3,
  october: 4,
  november: 5,
  december: 6,
  january: 7,
  february: 8,
  march: 9,
};

/**
 * Counts how many school months fall inclusively between the start and end
 * (wrapping across the academic year boundary). Returns 0 if the range is
 * invalid (end is before start).
 */
function countSubscriptionMonths(
  startMonth: SchoolMonth,
  startYear: number,
  endMonth: SchoolMonth,
  endYear: number
): number {
  const startIdx = SCHOOL_MONTH_ORDER[startMonth];
  const endIdx = SCHOOL_MONTH_ORDER[endMonth];

  // Normalise to an absolute index: year * 10 + month-order
  const startAbs = startYear * 10 + startIdx;
  const endAbs = endYear * 10 + endIdx;

  if (endAbs < startAbs) return 0;
  return endAbs - startAbs + 1;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

// Philippine mobile: 09XXXXXXXXX or +639XXXXXXXXX (11 or 13 digits)
const PH_PHONE_RE = /^(\+639|09)\d{9}$/;

const contactSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(255),
  relationship: z.string().min(1, "Relationship is required"),
  phone: z
    .string()
    .min(1, "Phone is required")
    .regex(PH_PHONE_RE, "Enter a valid PH mobile number (e.g. 09171234567)"),
  address: z.string().min(1, "Address is required").max(500),
  email: z
    .string()
    .email("Valid email required")
    .max(255)
    .optional()
    .or(z.literal("")),
});

const YEAR_MIN = 2020;
const YEAR_MAX = 2099;

const enrollSchema = z.object({
  branch_id: z.number({ error: "Branch is required" }),
  student_number: z
    .string()
    .min(1, "Student number is required")
    .max(50, "Student number is too long"),
  first_name: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name is too long"),
  last_name: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name is too long"),
  grade_level: z.string().min(1, "Grade level is required"),
  section: z.string().max(100).optional(),
  birthday: z
    .string()
    .min(1, "Birthday is required")
    .refine((v) => {
      const d = new Date(v);
      if (isNaN(d.getTime())) return false;
      const now = new Date();
      const minAge = new Date(now.getFullYear() - 20, now.getMonth(), now.getDate());
      const maxAge = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
      // Birthday must be between 2 and 20 years ago (school-age children)
      return d >= minAge && d <= maxAge;
    }, "Please enter a valid birthday (student must be 2–20 years old)"),
  student_type: z.enum(["subscription", "non_subscription"], {
    error: "Please select a type",
  }),
  allergies: z.string().max(1000, "Allergies field is too long").optional(),
  notes: z.string().max(1000, "Notes field is too long").optional(),
  contacts: z.array(contactSchema).min(1, "At least one contact is required"),
  signature: z.string().min(1, "Digital signature is required").max(255),
  permission_meals: z
    .boolean()
    .refine((v) => v === true, "This permission is required"),
  permission_dietary: z
    .boolean()
    .refine((v) => v === true, "This permission is required"),
  subscription_start_month: z.enum(SCHOOL_MONTH_VALUES).optional(),
  subscription_start_year: z
    .number()
    .int()
    .min(YEAR_MIN)
    .max(YEAR_MAX)
    .optional(),
  subscription_end_month: z.enum(SCHOOL_MONTH_VALUES).optional(),
  subscription_end_year: z
    .number()
    .int()
    .min(YEAR_MIN)
    .max(YEAR_MAX)
    .optional(),
});

type EnrollFormData = z.infer<typeof enrollSchema>;

// ---------------------------------------------------------------------------
// Default contact shape
// ---------------------------------------------------------------------------

function emptyContact(): StudentContactInput {
  return {
    full_name: "",
    relationship: "",
    phone: "",
    address: "",
    email: "",
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h2 className="text-xs font-extrabold uppercase tracking-wider text-primary border-b border-border pb-2">
        {title}
      </h2>
      {children}
    </div>
  );
}

function FieldError({ error }: { error?: string[] | string }) {
  const msg = Array.isArray(error) ? error[0] : error;
  if (!msg) return null;
  return (
    <p role="alert" className="mt-1 flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {msg}
    </p>
  );
}

function FormField({
  label,
  htmlFor,
  required,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string[] | string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      <FieldError error={error} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EnrollmentPage() {
  const user = useAuthStore((s) => s.user);
  const activeBranch = useAuthStore((s) => s.activeBranch);

  const isAdmin = user?.roles.includes("admin") ?? false;

  const [branchId, setBranchId] = useState<number | null>(
    activeBranch?.id ?? null
  );
  const [studentType, setStudentType] = useState<
    "subscription" | "non_subscription" | null
  >(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [section, setSection] = useState("");
  const [birthday, setBirthday] = useState("");
  const [allergies, setAllergies] = useState("");
  const [notes, setNotes] = useState("");
  const [contacts, setContacts] = useState<StudentContactInput[]>([
    emptyContact(),
  ]);
  const [permissionMeals, setPermissionMeals] = useState(false);
  const [permissionDietary, setPermissionDietary] = useState(false);
  const [signature, setSignature] = useState("");
  const [subscriptionStartMonth, setSubscriptionStartMonth] = useState<SchoolMonth | "">("");
  const [subscriptionStartYear, setSubscriptionStartYear] = useState<number>(
    new Date().getFullYear()
  );
  const [subscriptionEndMonth, setSubscriptionEndMonth] = useState<SchoolMonth | "">("");
  const [subscriptionEndYear, setSubscriptionEndYear] = useState<number>(
    new Date().getFullYear()
  );
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [enrolledResult, setEnrolledResult] =
    useState<EnrolledStudentResponse | null>(null);

  const { data: formData, isLoading: isLoadingFormData } = useQuery({
    queryKey: ["enrollment-form-data"],
    queryFn: () => studentApi.enrollmentFormData(),
  });

  const mutation = useMutation({
    mutationFn: (data: EnrollFormData) =>
      studentApi.enroll({
        ...data,
        contacts: data.contacts as StudentContactInput[],
      }),
    onSuccess: (result) => {
      setEnrolledResult(result);
    },
    onError: (err: ApiError) => {
      if (err.errors) setErrors(err.errors);
    },
  });

  function resetForm() {
    setBranchId(activeBranch?.id ?? null);
    setStudentType(null);
    setFirstName("");
    setLastName("");
    setStudentNumber("");
    setGradeLevel("");
    setSection("");
    setBirthday("");
    setAllergies("");
    setNotes("");
    setContacts([emptyContact()]);
    setPermissionMeals(false);
    setPermissionDietary(false);
    setSignature("");
    setSubscriptionStartMonth("");
    setSubscriptionStartYear(new Date().getFullYear());
    setSubscriptionEndMonth("");
    setSubscriptionEndYear(new Date().getFullYear());
    setErrors({});
    setEnrolledResult(null);
  }

  function updateContact(
    index: number,
    field: keyof StudentContactInput,
    value: string
  ) {
    setContacts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  }

  function addContact() {
    if (contacts.length < 3) {
      setContacts((prev) => [...prev, emptyContact()]);
    }
  }

  function removeContact(index: number) {
    if (index === 0) return;
    setContacts((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate that subscription students have a period selected
    if (studentType === "subscription") {
      if (!subscriptionStartMonth || !subscriptionEndMonth) {
        setErrors((prev) => ({
          ...prev,
          subscription_start_month: !subscriptionStartMonth
            ? ["Start month is required for subscription students"]
            : [],
          subscription_end_month: !subscriptionEndMonth
            ? ["End month is required for subscription students"]
            : [],
        }));
        return;
      }
    }

    const raw = {
      branch_id: branchId as number,
      student_number: studentNumber,
      first_name: firstName,
      last_name: lastName,
      grade_level: gradeLevel,
      section: section || undefined,
      birthday,
      student_type: studentType as "subscription" | "non_subscription",
      allergies: allergies || undefined,
      notes: notes || undefined,
      contacts,
      signature,
      permission_meals: permissionMeals,
      permission_dietary: permissionDietary,
      ...(studentType === "subscription" &&
      subscriptionStartMonth &&
      subscriptionEndMonth
        ? {
            subscription_start_month: subscriptionStartMonth as SchoolMonth,
            subscription_start_year: subscriptionStartYear,
            subscription_end_month: subscriptionEndMonth as SchoolMonth,
            subscription_end_year: subscriptionEndYear,
          }
        : {}),
    };

    const result = enrollSchema.safeParse(raw);
    if (!result.success) {
      const errorMap: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".");
        if (!errorMap[key]) errorMap[key] = [];
        errorMap[key].push(issue.message);
      }
      setErrors(errorMap);
      toast.error("Please fix the highlighted fields before continuing.");
      return;
    }

    setErrors({});
    mutation.mutate(result.data);
  }

  const today = new Date().toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // ---------------------------------------------------------------------------
  // Success state
  // ---------------------------------------------------------------------------

  if (enrolledResult) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="border border-green-300 bg-green-50 rounded-xl p-6 text-center space-y-4">
          <CheckCircle2
            className="mx-auto text-green-500"
            size={48}
            aria-hidden="true"
          />
          <h1 className="text-2xl font-bold text-green-800">
            Enrollment Successful!
          </h1>
          <p className="text-green-700 text-sm">
            The student has been enrolled and their QR code is ready.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Enrollment Details
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Student Name</p>
              <p className="font-semibold">{enrolledResult.full_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Student Type</p>
              <p className="font-semibold">
                {enrolledResult.student_type === "subscription"
                  ? "Subscription"
                  : "Non-Subscription"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Student Number</p>
              <p className="font-semibold font-mono">
                {enrolledResult.student_number}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Enrollment Date</p>
              <p className="font-semibold">{enrolledResult.enrollment_date}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-primary bg-card p-6 flex flex-col items-center gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
            Student QR Code
          </h2>
          <QRCode value={enrolledResult.qr_code} size={140} />
          <p className="text-xs text-muted-foreground font-mono">
            QR ID: {enrolledResult.qr_code}
          </p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.print()}
              aria-label="Print QR Code"
            >
              <Printer className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Print QR Code
            </Button>
          </div>
        </div>

        <Button
          type="button"
          className="w-full"
          onClick={resetForm}
        >
          <UserPlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Enroll Another Student
        </Button>

        <style>{`@media print { .no-print { display: none !important; } }`}</style>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Form state
  // ---------------------------------------------------------------------------

  return (
    <div className="no-print p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-xs text-muted-foreground">Enrollment</p>
        <h1 className="text-xl font-bold text-foreground">
          Student Enrollment Form
        </h1>
      </div>

      {isLoadingFormData ? (
        <div className="space-y-4">
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* BRANCH */}
          <SectionCard title="Branch">
            {isAdmin ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(formData?.branches ?? []).map((branch) => (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => setBranchId(branch.id)}
                    className={cn(
                      "rounded-lg border p-3 text-left text-sm transition-colors",
                      branchId === branch.id
                        ? "border-primary bg-primary/5 font-semibold text-primary"
                        : "border-border hover:bg-muted/40"
                    )}
                  >
                    {branch.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm font-medium text-foreground">
                {activeBranch?.name ?? "No branch selected"}
              </div>
            )}
            <FieldError error={errors.branch_id} />
          </SectionCard>

          {/* ENROLLMENT TYPE */}
          <SectionCard title="Enrollment Type">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  {
                    value: "subscription",
                    label: "Subscription",
                    description: "Monthly fee-based enrollment",
                  },
                  {
                    value: "non_subscription",
                    label: "Non-Subscription",
                    description: "Wallet-only purchases",
                  },
                ] as const
              ).map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setStudentType(type.value)}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-colors",
                    studentType === type.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/40"
                  )}
                >
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      studentType === type.value
                        ? "text-primary"
                        : "text-foreground"
                    )}
                  >
                    {type.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {type.description}
                  </p>
                </button>
              ))}
            </div>
            <FieldError error={errors.student_type} />
          </SectionCard>

          {/* SUBSCRIPTION PERIOD */}
          {studentType === "subscription" && (
            <SectionCard title="Subscription Period">
              <p className="text-xs text-muted-foreground">
                Select the range of school months to create payment records for
                this student.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label="Start Month"
                  htmlFor="sub-start-month"
                  required
                  error={errors.subscription_start_month}
                >
                  <Select
                    value={subscriptionStartMonth}
                    onValueChange={(v) =>
                      setSubscriptionStartMonth((v as SchoolMonth) ?? "")
                    }
                  >
                    <SelectTrigger
                      id="sub-start-month"
                      aria-invalid={!!errors.subscription_start_month?.length}
                      className={cn(
                        errors.subscription_start_month?.length &&
                          "border-destructive"
                      )}
                    >
                      <SelectValue placeholder="Select month…" />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHOOL_MONTH_VALUES.map((m) => (
                        <SelectItem key={m} value={m}>
                          {SCHOOL_MONTH_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField
                  label="Start Year"
                  htmlFor="sub-start-year"
                  required
                  error={errors.subscription_start_year}
                >
                  <Input
                    id="sub-start-year"
                    type="number"
                    min={YEAR_MIN}
                    max={YEAR_MAX}
                    value={subscriptionStartYear}
                    onChange={(e) =>
                      setSubscriptionStartYear(Number(e.target.value))
                    }
                    aria-invalid={!!errors.subscription_start_year?.length}
                    className={cn(
                      errors.subscription_start_year?.length &&
                        "border-destructive"
                    )}
                  />
                </FormField>

                <FormField
                  label="End Month"
                  htmlFor="sub-end-month"
                  required
                  error={errors.subscription_end_month}
                >
                  <Select
                    value={subscriptionEndMonth}
                    onValueChange={(v) =>
                      setSubscriptionEndMonth((v as SchoolMonth) ?? "")
                    }
                  >
                    <SelectTrigger
                      id="sub-end-month"
                      aria-invalid={!!errors.subscription_end_month?.length}
                      className={cn(
                        errors.subscription_end_month?.length &&
                          "border-destructive"
                      )}
                    >
                      <SelectValue placeholder="Select month…" />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHOOL_MONTH_VALUES.map((m) => (
                        <SelectItem key={m} value={m}>
                          {SCHOOL_MONTH_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField
                  label="End Year"
                  htmlFor="sub-end-year"
                  required
                  error={errors.subscription_end_year}
                >
                  <Input
                    id="sub-end-year"
                    type="number"
                    min={YEAR_MIN}
                    max={YEAR_MAX}
                    value={subscriptionEndYear}
                    onChange={(e) =>
                      setSubscriptionEndYear(Number(e.target.value))
                    }
                    aria-invalid={!!errors.subscription_end_year?.length}
                    className={cn(
                      errors.subscription_end_year?.length &&
                        "border-destructive"
                    )}
                  />
                </FormField>
              </div>

              {subscriptionStartMonth && subscriptionEndMonth && (() => {
                const count = countSubscriptionMonths(
                  subscriptionStartMonth as SchoolMonth,
                  subscriptionStartYear,
                  subscriptionEndMonth as SchoolMonth,
                  subscriptionEndYear
                );
                if (count <= 0) {
                  return (
                    <p className="text-xs text-destructive">
                      End date must be on or after start date.
                    </p>
                  );
                }
                return (
                  <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
                    This will create{" "}
                    <span className="font-bold">{count}</span>{" "}
                    {count === 1 ? "month" : "months"} from{" "}
                    <span className="font-semibold">
                      {SCHOOL_MONTH_LABELS[subscriptionStartMonth as SchoolMonth]}{" "}
                      {subscriptionStartYear}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold">
                      {SCHOOL_MONTH_LABELS[subscriptionEndMonth as SchoolMonth]}{" "}
                      {subscriptionEndYear}
                    </span>
                    .
                  </div>
                );
              })()}
            </SectionCard>
          )}

          {/* STUDENT INFORMATION */}
          <SectionCard title="Student Information">
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
              Photo can be added after enrollment via student profile.
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="First Name"
                htmlFor="first-name"
                required
                error={errors.first_name}
              >
                <Input
                  id="first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  aria-invalid={!!errors.first_name?.length}
                  aria-describedby={
                    errors.first_name?.length ? "first-name-error" : undefined
                  }
                  className={cn(errors.first_name?.length && "border-destructive")}
                />
              </FormField>

              <FormField
                label="Last Name"
                htmlFor="last-name"
                required
                error={errors.last_name}
              >
                <Input
                  id="last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  aria-invalid={!!errors.last_name?.length}
                  className={cn(errors.last_name?.length && "border-destructive")}
                />
              </FormField>

              <FormField
                label="Student Number"
                htmlFor="student-number"
                required
                error={errors.student_number}
              >
                <Input
                  id="student-number"
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  aria-invalid={!!errors.student_number?.length}
                  className={cn(
                    errors.student_number?.length && "border-destructive"
                  )}
                />
              </FormField>

              <FormField
                label="Grade Level"
                htmlFor="grade-level"
                required
                error={errors.grade_level}
              >
                <Select value={gradeLevel} onValueChange={(v) => setGradeLevel(v ?? "")}>
                  <SelectTrigger
                    id="grade-level"
                    aria-invalid={!!errors.grade_level?.length}
                    className={cn(
                      errors.grade_level?.length && "border-destructive"
                    )}
                  >
                    <SelectValue placeholder="Select grade…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(formData?.grade_levels ?? []).map((gl) => (
                      <SelectItem key={gl} value={gl}>
                        {gl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Section" htmlFor="section" error={errors.section}>
                <Input
                  id="section"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="e.g. Section Mabini"
                />
              </FormField>

              <FormField
                label="Birthday"
                htmlFor="birthday"
                required
                error={errors.birthday}
              >
                <Input
                  id="birthday"
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  aria-invalid={!!errors.birthday?.length}
                  className={cn(errors.birthday?.length && "border-destructive")}
                />
              </FormField>
            </div>

            <FormField
              label="Allergies"
              htmlFor="allergies"
              error={errors.allergies}
            >
              <Textarea
                id="allergies"
                rows={2}
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="List any food allergies or dietary restrictions…"
              />
            </FormField>

            <FormField label="Notes" htmlFor="notes" error={errors.notes}>
              <Textarea
                id="notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes for school staff…"
              />
            </FormField>
          </SectionCard>

          {/* PARENT / GUARDIAN */}
          <SectionCard title="Parent / Guardian">
            <div className="space-y-6">
              {contacts.map((contact, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border p-4 space-y-4 relative"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {index === 0 ? "Primary Contact" : `Contact ${index + 1}`}
                    </p>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => removeContact(index)}
                        aria-label={`Remove contact ${index + 1}`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Full Name"
                      htmlFor={`contact-${index}-full-name`}
                      required
                      error={
                        (
                          errors as Record<string, string[]>
                        )[`contacts.${index}.full_name`]
                      }
                    >
                      <Input
                        id={`contact-${index}-full-name`}
                        value={contact.full_name}
                        onChange={(e) =>
                          updateContact(index, "full_name", e.target.value)
                        }
                      />
                    </FormField>

                    <FormField
                      label="Relationship"
                      htmlFor={`contact-${index}-relationship`}
                      required
                      error={
                        (errors as Record<string, string[]>)[
                          `contacts.${index}.relationship`
                        ]
                      }
                    >
                      <Select
                        value={contact.relationship}
                        onValueChange={(v) =>
                          updateContact(index, "relationship", v ?? "")
                        }
                      >
                        <SelectTrigger id={`contact-${index}-relationship`}>
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mother">Mother</SelectItem>
                          <SelectItem value="Father">Father</SelectItem>
                          <SelectItem value="Guardian">Guardian</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField
                      label="Phone"
                      htmlFor={`contact-${index}-phone`}
                      required
                      error={
                        (errors as Record<string, string[]>)[
                          `contacts.${index}.phone`
                        ]
                      }
                    >
                      <Input
                        id={`contact-${index}-phone`}
                        type="tel"
                        value={contact.phone}
                        onChange={(e) =>
                          updateContact(index, "phone", e.target.value)
                        }
                      />
                    </FormField>

                    <FormField
                      label="Email"
                      htmlFor={`contact-${index}-email`}
                      error={
                        (errors as Record<string, string[]>)[
                          `contacts.${index}.email`
                        ]
                      }
                    >
                      <Input
                        id={`contact-${index}-email`}
                        type="email"
                        value={contact.email}
                        onChange={(e) =>
                          updateContact(index, "email", e.target.value)
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        If provided, a portal activation email will be sent to this address.
                      </p>
                    </FormField>
                  </div>

                  <FormField
                    label="Address"
                    htmlFor={`contact-${index}-address`}
                    required
                    error={
                      (errors as Record<string, string[]>)[
                        `contacts.${index}.address`
                      ]
                    }
                  >
                    <Textarea
                      id={`contact-${index}-address`}
                      rows={2}
                      value={contact.address}
                      onChange={(e) =>
                        updateContact(index, "address", e.target.value)
                      }
                    />
                  </FormField>
                </div>
              ))}

              {contacts.length < 3 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={addContact}
                  className="w-full"
                >
                  + Add Another Contact
                </Button>
              )}

            </div>
          </SectionCard>

          {/* PERMISSIONS & ACKNOWLEDGEMENT */}
          <SectionCard title="Permissions & Acknowledgement">
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  id="permission-meals"
                  checked={permissionMeals}
                  onCheckedChange={(checked) =>
                    setPermissionMeals(checked === true)
                  }
                  aria-invalid={!!errors.permission_meals?.length}
                />
                <span className="text-sm text-foreground">
                  I give permission for my child to receive meals provided by
                  Sunbites.
                </span>
              </label>
              <FieldError error={errors.permission_meals} />

              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  id="permission-dietary"
                  checked={permissionDietary}
                  onCheckedChange={(checked) =>
                    setPermissionDietary(checked === true)
                  }
                  aria-invalid={!!errors.permission_dietary?.length}
                />
                <span className="text-sm text-foreground">
                  I acknowledge that Sunbites will be informed of my child&apos;s
                  dietary restrictions and allergies.
                </span>
              </label>
              <FieldError error={errors.permission_dietary} />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                <FormField
                  label="Digital Signature (Type Full Name)"
                  htmlFor="digital-signature"
                  required
                  error={errors.signature}
                >
                  <Input
                    id="digital-signature"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="Type your full name as signature"
                    aria-invalid={!!errors.signature?.length}
                    className={cn(
                      errors.signature?.length && "border-destructive"
                    )}
                  />
                </FormField>

                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    {today}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {mutation.isError && !Object.keys(errors).length && (
            <p role="alert" className="text-sm text-destructive">
              {(mutation.error as ApiError)?.message ??
                "An error occurred. Please try again."}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Submitting…" : "Submit Enrollment"}
          </Button>
        </form>
      )}
    </div>
  );
}
