export interface Announcement {
  id: number;
  title: string | null;
  message_preview: string;
  sender_name: string;
  recipient_type: "parents" | "staff";
  recipient_count: number;
  read_count: number;
  created_at: string;
}

export interface AnnouncementRecipient {
  id: string;
  name: string;
  read_at: string | null;
}

export interface AnnouncementDetail {
  id: number;
  title: string | null;
  message: string;
  sender_name: string;
  recipient_type: "parents" | "staff";
  recipient_count: number;
  created_at: string;
  recipients: AnnouncementRecipient[];
}

export interface AnnouncementListResponse {
  data: Announcement[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface CreateAnnouncementPayload {
  title?: string;
  message: string;
  recipient_type: "parents" | "staff";
  recipient_ids: number[];
}
