export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_conversations: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          subject: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          subject?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          subject?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_private_messages: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
          mentions: string[] | null
          message: string | null
          recipient_id: string | null
          sender_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          mentions?: string[] | null
          message?: string | null
          recipient_id?: string | null
          sender_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          mentions?: string[] | null
          message?: string | null
          recipient_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_private_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "admin_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      community_chats: {
        Row: {
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
          message: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          message?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          message?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      group_invitations: {
        Row: {
          created_at: string
          group_id: string
          id: string
          invitee_id: string
          inviter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          invitee_id: string
          inviter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_group_invitations_group"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invitations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          banned: boolean | null
          group_id: string
          id: string
          is_admin: boolean | null
          joined_at: string
          user_id: string
        }
        Insert: {
          banned?: boolean | null
          group_id: string
          id?: string
          is_admin?: boolean | null
          joined_at?: string
          user_id: string
        }
        Update: {
          banned?: boolean | null
          group_id?: string
          id?: string
          is_admin?: boolean | null
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_voice_calls: {
        Row: {
          active: boolean
          created_at: string
          group_id: string
          id: string
          started_by: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          group_id: string
          id?: string
          started_by: string
        }
        Update: {
          active?: boolean
          created_at?: string
          group_id?: string
          id?: string
          started_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_voice_calls_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          code: string
          created_at: string
          id: string
          is_private: boolean
          name: string
          password: string | null
          profile_pic: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_private?: boolean
          name: string
          password?: string | null
          profile_pic?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_private?: boolean
          name?: string
          password?: string | null
          profile_pic?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string | null
          content_type: string
          created_at: string
          deleted_by: string | null
          file_url: string | null
          group_id: string
          id: string
          is_deleted: boolean
          is_system_message: boolean | null
          user_id: string
        }
        Insert: {
          content?: string | null
          content_type?: string
          created_at?: string
          deleted_by?: string | null
          file_url?: string | null
          group_id: string
          id?: string
          is_deleted?: boolean
          is_system_message?: boolean | null
          user_id: string
        }
        Update: {
          content?: string | null
          content_type?: string
          created_at?: string
          deleted_by?: string | null
          file_url?: string | null
          group_id?: string
          id?: string
          is_deleted?: boolean
          is_system_message?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string
          group_id: string | null
          id: string
          invitation_id: string | null
          read: boolean
          recipient_id: string
          sender_id: string | null
          type: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id?: string | null
          id?: string
          invitation_id?: string | null
          read?: boolean
          recipient_id: string
          sender_id?: string | null
          type: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string | null
          id?: string
          invitation_id?: string | null
          read?: boolean
          recipient_id?: string
          sender_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_notifications_group"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_notifications_invitation"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "group_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "group_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          allow_download: boolean
          comments_count: number
          content: string | null
          created_at: string
          id: string
          likes_count: number
          media_types: string[] | null
          media_urls: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_download?: boolean
          comments_count?: number
          content?: string | null
          created_at?: string
          id?: string
          likes_count?: number
          media_types?: string[] | null
          media_urls?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_download?: boolean
          comments_count?: number
          content?: string | null
          created_at?: string
          id?: string
          likes_count?: number
          media_types?: string[] | null
          media_urls?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string
          banned: boolean | null
          country: string | null
          date_joined: string
          dob: string | null
          id: string
          last_login: string
          name: string
          profile_pic: string | null
        }
        Insert: {
          account_status?: string
          banned?: boolean | null
          country?: string | null
          date_joined?: string
          dob?: string | null
          id: string
          last_login?: string
          name: string
          profile_pic?: string | null
        }
        Update: {
          account_status?: string
          banned?: boolean | null
          country?: string | null
          date_joined?: string
          dob?: string | null
          id?: string
          last_login?: string
          name?: string
          profile_pic?: string | null
        }
        Relationships: []
      }
      voice_call_participants: {
        Row: {
          call_id: string
          id: string
          joined_at: string
          left_at: string | null
          user_id: string
        }
        Insert: {
          call_id: string
          id?: string
          joined_at?: string
          left_at?: string | null
          user_id: string
        }
        Update: {
          call_id?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_call_participants_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "group_voice_calls"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_group_call: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: string
      }
      generate_random_code: {
        Args: { length: number }
        Returns: string
      }
      get_active_group_call: {
        Args: { p_group_id: string }
        Returns: string
      }
      get_active_rooms: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          code: string
          admin_id: string
          last_activity: string
          participant_count: number
        }[]
      }
      get_call_group_id: {
        Args: { p_call_id: string }
        Returns: string
      }
      get_room_join_requests: {
        Args: { room_id_param: string }
        Returns: {
          id: string
          user_id: string
          room_id: string
          status: string
          created_at: string
          user_name: string
          profile_pic: string
        }[]
      }
      get_room_participants: {
        Args: { room_id_param: string }
        Returns: {
          id: string
          user_id: string
          room_id: string
          joined_at: string
          is_admin: boolean
          approved: boolean
          user_name: string
          profile_pic: string
        }[]
      }
      handle_join_request: {
        Args: { request_id_param: string; approve: boolean }
        Returns: boolean
      }
      join_voice_call: {
        Args: { p_call_id: string; p_user_id: string }
        Returns: string
      }
      leave_voice_call: {
        Args: { p_call_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
