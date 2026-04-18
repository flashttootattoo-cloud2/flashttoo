export type UserRole = "client" | "tattoo_artist" | "administradorgeneral";
export type PlanType = "free" | "pro" | "studio" | "basic" | "premium"; // basic/premium = legacy
export type ReservationStatus = "pending" | "confirmed" | "rejected" | "completed";
export type MessageStatus = "sent" | "read";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  instagram: string | null;
  plan: PlanType;
  plan_expires_at: string | null;
  designs_count: number;
  followers_count: number;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ad {
  id: string;
  brand_name: string;
  image_url: string;
  contact_url: string | null;
  city: string | null;
  is_active: boolean;
  clicks_count: number;
  views_count: number;
  created_at: string;
}

export interface Design {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  image_url: string;
  width_cm: number | null;
  height_cm: number | null;
  price: number | null;
  currency: string;
  style: string | null;
  body_part: string | null;
  is_available: boolean;
  is_flash: boolean;
  is_archived: boolean;
  is_pinned: boolean;
  is_admin_hidden: boolean;
  artist_tag: string | null;
  views_count: number;
  likes_count: number;
  created_at: string;
  updated_at: string;
  artist?: Profile;
  tags?: Tag[];
}

export interface Tag {
  id: string;
  name: string;
}

export interface DesignImage {
  id: string;
  design_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface Reservation {
  id: string;
  design_id: string;
  client_id: string;
  artist_id: string;
  status: ReservationStatus;
  message: string | null;
  preferred_date: string | null;
  created_at: string;
  updated_at: string;
  design?: Design;
  client?: Profile;
  artist?: Profile;
}

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  other_user?: Profile;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  status: MessageStatus;
  created_at: string;
  sender?: Profile;
}

export interface Plan {
  id: string;
  name: string;
  type: PlanType;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: string[];
  max_designs: number | null;
  has_stats: boolean;
  has_priority_listing: boolean;
  has_verified_badge: boolean;
}

export interface ArtistStats {
  total_views: number;
  total_likes: number;
  total_reservations: number;
  designs_count: number;
  profile_visits: number;
  top_designs: Design[];
  views_by_day: { date: string; count: number }[];
  reservations_by_month: { month: string; count: number }[];
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
      designs: {
        Row: Design;
        Insert: Partial<Design> & { artist_id: string; image_url: string; title: string };
        Update: Partial<Design>;
      };
      reservations: {
        Row: Reservation;
        Insert: Partial<Reservation> & { design_id: string; client_id: string; artist_id: string };
        Update: Partial<Reservation>;
      };
      conversations: {
        Row: Conversation;
        Insert: Partial<Conversation> & { participant_1: string; participant_2: string };
        Update: Partial<Conversation>;
      };
      messages: {
        Row: Message;
        Insert: Partial<Message> & { conversation_id: string; sender_id: string; content: string };
        Update: Partial<Message>;
      };
    };
  };
};
