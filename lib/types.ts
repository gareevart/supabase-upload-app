export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      sent_mails: {
        Row: {
          id: string
          subject: string
          content: Json
          content_html: string | null
          recipients: string[]
          status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
          scheduled_for: string | null
          created_at: string
          updated_at: string
          user_id: string | null
          sent_at: string | null
          broadcast_id: string | null
          total_recipients: number
          opened_count: number | null
          clicked_count: number | null
        }
        Insert: {
          id?: string
          subject: string
          content: Json
          content_html?: string | null
          recipients: string[]
          status?: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
          scheduled_for?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string | null
          sent_at?: string | null
          broadcast_id?: string | null
          total_recipients?: number
          opened_count?: number | null
          clicked_count?: number | null
        }
        Update: {
          id?: string
          subject?: string
          content?: Json
          content_html?: string | null
          recipients?: string[]
          status?: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
          scheduled_for?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string | null
          sent_at?: string | null
          broadcast_id?: string | null
          total_recipients?: number
          opened_count?: number | null
          clicked_count?: number | null
        }
      }
      profiles: {
        Row: {
          id: string
          role: string | null
          email: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          role?: string | null
          email?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          role?: string | null
          email?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      tags: {
        Row: {
          id: string
          name: string
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
          created_at?: string
          updated_at?: string
        }
      }
      images: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_path: string
          file_size: number | null
          mime_type: string | null
          public_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          mime_type?: string | null
          public_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          mime_type?: string | null
          public_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      image_tags: {
        Row: {
          id: string
          image_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          id?: string
          image_id: string
          tag_id: string
          created_at?: string
        }
        Update: {
          id?: string
          image_id?: string
          tag_id?: string
          created_at?: string
        }
      }
      subscribe: {
        Row: {
          id: string
          email: string
          name: string | null
          is_active: boolean
          subscribed_at: string
          unsubscribed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          is_active?: boolean
          subscribed_at?: string
          unsubscribed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          is_active?: boolean
          subscribed_at?: string
          unsubscribed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      broadcast_groups: {
        Row: {
          id: string
          name: string
          description: string | null
          user_id: string | null
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          user_id?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          user_id?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      group_subscribers: {
        Row: {
          id: string
          group_id: string
          subscriber_id: string
          added_at: string
        }
        Insert: {
          id?: string
          group_id: string
          subscriber_id: string
          added_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          subscriber_id?: string
          added_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_group_emails: {
        Args: {
          group_id_param: string
        }
        Returns: string[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
