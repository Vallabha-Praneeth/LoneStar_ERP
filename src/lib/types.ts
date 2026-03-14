export type UserRole = "admin" | "driver" | "client";

export interface Profile {
  id: string;
  role: UserRole;
  username: string;
  display_name: string;
  email: string | null;
  client_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  title: string;
  campaign_date: string;
  route_code: string | null;
  status: "draft" | "pending" | "active" | "completed";
  client_id: string;
  driver_profile_id: string | null;
  internal_notes: string | null;
  driver_daily_wage: number | null;
  transport_cost: number | null;
  other_cost: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DriverShift {
  id: string;
  campaign_id: string;
  driver_profile_id: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignPhoto {
  id: string;
  campaign_id: string;
  uploaded_by: string;
  storage_path: string;
  note: string | null;
  submitted_at: string;
  captured_at: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
}
