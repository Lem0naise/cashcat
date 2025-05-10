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
      profiles: {
        Row: {
          id: string
          updated_at: string
          name: string | null
          email: string
        }
        Insert: {
          id: string
          updated_at?: string
          name?: string | null
          email: string
        }
        Update: {
          id?: string
          updated_at?: string
          name?: string | null
          email?: string
        }
      }
      categories: {
        Row: {
          id: string
          created_at: string
          name: string
          assigned: number
          spent: number
          goal_amount: number
          group: string
          user_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          assigned: number
          spent: number
          goal_amount: number
          group: string
          user_id: string
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          assigned?: number
          spent?: number
          goal_amount?: number
          group?: string
          user_id?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          date: string
          description: string | null
          vendor: string
          category_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          date: string
          description?: string | null
          vendor: string
          category_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          date?: string
          description?: string | null
          vendor?: string
          category_id?: string | null
          created_at?: string
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
