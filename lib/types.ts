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
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          role: string | null
          email: string | null
          name: string | null
          username: string | null
          avatar_url: string | null
          bio: string | null
          website: string | null
          theme: string | null
          daily_image_quota_remaining: number | null
          quota_last_updated: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          role?: string | null
          email?: string | null
          name?: string | null
          username?: string | null
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          theme?: string | null
          daily_image_quota_remaining?: number | null
          quota_last_updated?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          role?: string | null
          email?: string | null
          name?: string | null
          username?: string | null
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          theme?: string | null
          daily_image_quota_remaining?: number | null
          quota_last_updated?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      subscribe: {
        Row: {
          id: string
          email: string
          mail: string | null
          name: string | null
          is_active: boolean
          subscribe_status: boolean | null
          subscribe_started_date: string | null
          user_id: string | null
          subscribed_at: string
          unsubscribed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          mail?: string | null
          name?: string | null
          is_active?: boolean
          subscribe_status?: boolean | null
          subscribe_started_date?: string | null
          user_id?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          mail?: string | null
          name?: string | null
          is_active?: boolean
          subscribe_status?: boolean | null
          subscribe_started_date?: string | null
          user_id?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      user_widgets: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          html: string
          permissions: string[]
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          html: string
          permissions?: string[]
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          html?: string
          permissions?: string[]
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      widget_grants: {
        Row: {
          user_id: string
          widget_id: string
          permissions: string[]
          enabled: boolean
          granted_at: string
        }
        Insert: {
          user_id: string
          widget_id: string
          permissions?: string[]
          enabled?: boolean
          granted_at?: string
        }
        Update: {
          user_id?: string
          widget_id?: string
          permissions?: string[]
          enabled?: boolean
          granted_at?: string
        }
        Relationships: []
      }
      widget_storage: {
        Row: {
          widget_id: string
          user_id: string
          key: string
          value: Json
          updated_at: string
        }
        Insert: {
          widget_id: string
          user_id: string
          key: string
          value?: Json
          updated_at?: string
        }
        Update: {
          widget_id?: string
          user_id?: string
          key?: string
          value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          id: string
          user_id: string
          name: string
          key_hash: string
          key_prefix: string
          permissions: Json
          last_used_at: string | null
          expires_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          key_hash: string
          key_prefix: string
          permissions?: Json
          last_used_at?: string | null
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          key_hash?: string
          key_prefix?: string
          permissions?: Json
          last_used_at?: string | null
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          id: string
          title: string
          content: string
          excerpt: string | null
          slug: string | null
          featured_image: string | null
          og_image: string | null
          show_featured_image: boolean | null
          published: boolean
          author_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          excerpt?: string | null
          slug?: string | null
          featured_image?: string | null
          og_image?: string | null
          show_featured_image?: boolean | null
          published?: boolean
          author_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          excerpt?: string | null
          slug?: string | null
          featured_image?: string | null
          og_image?: string | null
          show_featured_image?: boolean | null
          published?: boolean
          author_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_post_embeddings: {
        Row: {
          id: string
          post_id: string
          content: string
          embedding: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          content: string
          embedding: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          content?: string
          embedding?: string
          created_at?: string
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          title: string
          system_prompt: string | null
          tokens_used: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          system_prompt?: string | null
          tokens_used?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          system_prompt?: string | null
          tokens_used?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          id: string
          chat_id: string
          role: string
          content: string
          image_url: string | null
          attachments: Json
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          role: string
          content: string
          image_url?: string | null
          attachments?: Json
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          role?: string
          content?: string
          image_url?: string | null
          attachments?: Json
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      chat_message_embeddings: {
        Row: {
          id: string
          chat_id: string
          message_id: string
          content: string
          embedding: string
          created_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          message_id: string
          content: string
          embedding: string
          created_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          message_id?: string
          content?: string
          embedding?: string
          created_at?: string
        }
        Relationships: []
      }
      memory_game_results: {
        Row: {
          id: number
          name: string
          time: number
        }
        Insert: {
          id?: number
          name: string
          time: number
        }
        Update: {
          id?: number
          name?: string
          time?: number
        }
        Relationships: []
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
      validate_api_key: {
        Args: {
          key_hash_param: string
        }
        Returns: {
          user_id: string
          key_id: string
          permissions: Json
          is_valid: boolean
        }[]
      }
      increment_chat_tokens: {
        Args: {
          chat_id: string
          amount: number
        }
        Returns: undefined
      }
      increment_broadcast_stat: {
        Args: {
          target_id: string
          stat_column: string
        }
        Returns: undefined
      }
      match_blog_posts: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          title: string
          content: string
          similarity: number
        }[]
      }
      match_chat_messages: {
        Args: {
          query_embedding: number[]
          match_chat_id: string
          match_threshold: number
          match_count: number
        }
        Returns: {
          message_id: string
          content: string
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
