export interface AnnouncementData {
  announcement_id: number;
  title: string | null;
  message: string;
  sender_name: string;
  sent_at: string;
}

export interface PreRegistrationData {
  pre_registration_id: number;
  student_name: string;
  branch_name: string;
  enrollment_type: string;
  submitted_at: string;
}

export type StaffNotification =
  | {
      id: string;
      type: "App\\Notifications\\AnnouncementNotification";
      data: AnnouncementData;
      read_at: string | null;
      created_at: string;
    }
  | {
      id: string;
      type: "App\\Notifications\\PreRegistrationNotification";
      data: PreRegistrationData;
      read_at: string | null;
      created_at: string;
    };

export interface StaffNotificationListResponse {
  data: StaffNotification[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface StaffUnreadCountResponse {
  count: number;
}
