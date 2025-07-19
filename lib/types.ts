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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}