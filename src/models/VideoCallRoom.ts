
export interface VideoCallRoom {
  id: string;
  code: string;
  admin_id: string;
  created_at: string;
  last_activity: string;
  active: boolean;
}

export interface VideoCallParticipant {
  id: string;
  user_id: string;
  room_id: string;
  joined_at: string;
  is_admin?: boolean;
  approved: boolean;
  profiles?: {
    name: string;
    profile_pic: string | null;
  } | null;
}

export interface JoinRequest {
  id: string;
  user_id: string;
  room_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profiles?: {
    name: string;
    profile_pic: string | null;
  } | null;
}
