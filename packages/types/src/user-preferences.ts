export interface UserPreferences {

  // Display
  display_theme?: "system" | "light" | "dark";

  // Email Notifications
  email_frequency?: "immediate" | "daily_digest";
  email_allow_notifications?: boolean;

  // General Comments
  notif_comment_on_post?: boolean;
  notif_comment_mention?: boolean;
  notif_comment_private?: boolean;

  // Student Notifications
  notif_student_teacher_posts?: boolean;
  notif_student_returned_work?: boolean;
  notif_student_invitations?: boolean;
  notif_student_due_dates?: boolean;

  // Professor Notifications
  notif_prof_late_subs?: boolean;
  notif_prof_resubs?: boolean;
  notif_prof_coteach_invites?: boolean;
  notif_prof_scheduled_posts?: boolean;
  notif_prof_private_comments?: boolean;

  // Admin System Alerts
  notif_admin_new_users?: boolean;
  notif_admin_system_errors?: boolean;
  notif_admin_announcements?: boolean;

  // Class specific overrides (dynamic string keys mapped to boolean)
  [key: `notif_class_${string}`]: boolean | undefined;
}
