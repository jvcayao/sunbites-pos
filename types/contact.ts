export type PortalStatus = "activated" | "pending_activation" | "no_email";

export interface StudentContact {
  id: number;
  student_id: number;
  full_name: string;
  relationship: string;
  phone: string;
  address: string;
  email: string | null;
  is_primary: boolean;
  portal_status: PortalStatus;
}

export interface CreateContactPayload {
  full_name: string;
  relationship: string;
  phone: string;
  address: string;
  email?: string;
  is_primary?: boolean;
}

export type UpdateContactPayload = Partial<CreateContactPayload>;
