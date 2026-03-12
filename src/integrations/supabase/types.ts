export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          area: string | null
          city: string
          country: string | null
          created_at: string
          display_name: string | null
          district: string | null
          flatNumber: string | null
          full_name: string
          id: string
          is_default: boolean
          latitude: number | null
          longitude: number | null
          phone: string
          pincode: string
          state: string
          user_id: string
        }
        Insert: {
          address_line1?: string
          address_line2?: string | null
          area?: string | null
          city?: string
          country?: string | null
          created_at?: string
          display_name?: string | null
          district?: string | null
          flatNumber?: string | null
          full_name?: string
          id?: string
          is_default?: boolean
          latitude?: number | null
          longitude?: number | null
          phone?: string
          pincode?: string
          state?: string
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          area?: string | null
          city?: string
          country?: string | null
          created_at?: string
          display_name?: string | null
          district?: string | null
          flatNumber?: string | null
          full_name?: string
          id?: string
          is_default?: boolean
          latitude?: number | null
          longitude?: number | null
          phone?: string
          pincode?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          id: string
          image_path: string | null
          image_url: string
          is_active: boolean
          link_url: string | null
          sort_order: number
          subtitle: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_path?: string | null
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_path?: string | null
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          id: string
          order_id: string | null
          redeemed_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          id?: string
          order_id?: string | null
          redeemed_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          id?: string
          order_id?: string | null
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          current_uses: number | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          max_uses_per_user: number | null
          min_order_value: number | null
          used_count: number
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_order_value?: number | null
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_order_value?: number | null
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      delivery_settings: {
        Row: {
          base_charge: number
          free_delivery_above: number | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          base_charge?: number
          free_delivery_above?: number | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          base_charge?: number
          free_delivery_above?: number | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      gst_settings: {
        Row: {
          business_address: string
          business_name: string
          created_at: string
          gst_enabled: boolean
          gst_number: string
          id: string
          invoice_counter: number
          invoice_prefix: string
          state: string
          supported_gst_rates: number[] | null
          updated_at: string
        }
        Insert: {
          business_address?: string
          business_name?: string
          created_at?: string
          gst_enabled?: boolean
          gst_number?: string
          id?: string
          invoice_counter?: number
          invoice_prefix?: string
          state?: string
          supported_gst_rates?: number[] | null
          updated_at?: string
        }
        Update: {
          business_address?: string
          business_name?: string
          created_at?: string
          gst_enabled?: boolean
          gst_number?: string
          id?: string
          invoice_counter?: number
          invoice_prefix?: string
          state?: string
          supported_gst_rates?: number[] | null
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          business_address: string
          business_name: string
          cgst_amount: number | null
          created_at: string
          customer_address: string
          customer_gst_number: string | null
          customer_name: string
          delivery_charge: number
          gst_number: string
          gst_type: string
          id: string
          igst_amount: number | null
          invoice_date: string
          invoice_number: string
          invoice_pdf_path: string | null
          items: Json
          order_id: string
          sgst_amount: number | null
          subtotal: number
          total_amount: number
          total_tax: number
          updated_at: string
        }
        Insert: {
          business_address: string
          business_name: string
          cgst_amount?: number | null
          created_at?: string
          customer_address: string
          customer_gst_number?: string | null
          customer_name: string
          delivery_charge?: number
          gst_number: string
          gst_type: string
          id?: string
          igst_amount?: number | null
          invoice_date?: string
          invoice_number?: string
          invoice_pdf_path?: string | null
          items?: Json
          order_id: string
          sgst_amount?: number | null
          subtotal: number
          total_amount: number
          total_tax: number
          updated_at?: string
        }
        Update: {
          business_address?: string
          business_name?: string
          cgst_amount?: number | null
          created_at?: string
          customer_address?: string
          customer_gst_number?: string | null
          customer_name?: string
          delivery_charge?: number
          gst_number?: string
          gst_type?: string
          id?: string
          igst_amount?: number | null
          invoice_date?: string
          invoice_number?: string
          invoice_pdf_path?: string | null
          items?: Json
          order_id?: string
          sgst_amount?: number | null
          subtotal?: number
          total_amount?: number
          total_tax?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          cgst_amount: number | null
          gst_amount: number
          gst_percentage: number | null
          hsn_code: string | null
          id: string
          igst_amount: number | null
          order_id: string
          product_base_price: number | null
          product_gst_percentage: number | null
          product_id: string | null
          product_name: string
          product_price: number
          quantity: number
          sgst_amount: number | null
          tax_inclusive: boolean | null
          total: number
        }
        Insert: {
          cgst_amount?: number | null
          gst_amount?: number
          gst_percentage?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          order_id: string
          product_base_price?: number | null
          product_gst_percentage?: number | null
          product_id?: string | null
          product_name: string
          product_price: number
          quantity?: number
          sgst_amount?: number | null
          tax_inclusive?: boolean | null
          total?: number
        }
        Update: {
          cgst_amount?: number | null
          gst_amount?: number
          gst_percentage?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          order_id?: string
          product_base_price?: number | null
          product_gst_percentage?: number | null
          product_id?: string | null
          product_name?: string
          product_price?: number
          quantity?: number
          sgst_amount?: number | null
          tax_inclusive?: boolean | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cart_hash: string | null
          cgst_amount: number | null
          coupon_code: string | null
          courier_name: string | null
          created_at: string
          delivery_address: Json | null
          delivery_charge: number
          delivery_state: string | null
          discount: number
          gst_amount: number
          gst_percentage: number | null
          gst_type: string | null
          id: string
          igst_amount: number | null
          invoice_generated: boolean
          invoice_number: string | null
          invoice_path: string | null
          notes: string | null
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_mode: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          sgst_amount: number | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_payment_id: string | null
          subtotal: number
          total: number
          tracking_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cart_hash?: string | null
          cgst_amount?: number | null
          coupon_code?: string | null
          courier_name?: string | null
          created_at?: string
          delivery_address?: Json | null
          delivery_charge?: number
          delivery_state?: string | null
          discount?: number
          gst_amount?: number
          gst_percentage?: number | null
          gst_type?: string | null
          id?: string
          igst_amount?: number | null
          invoice_generated?: boolean
          invoice_number?: string | null
          invoice_path?: string | null
          notes?: string | null
          order_number: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_mode?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          sgst_amount?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_id?: string | null
          subtotal?: number
          total?: number
          tracking_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cart_hash?: string | null
          cgst_amount?: number | null
          coupon_code?: string | null
          courier_name?: string | null
          created_at?: string
          delivery_address?: Json | null
          delivery_charge?: number
          delivery_state?: string | null
          discount?: number
          gst_amount?: number
          gst_percentage?: number | null
          gst_type?: string | null
          id?: string
          igst_amount?: number | null
          invoice_generated?: boolean
          invoice_number?: string | null
          invoice_path?: string | null
          notes?: string | null
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_mode?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          sgst_amount?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_id?: string | null
          subtotal?: number
          total?: number
          tracking_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_logs: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          order_id: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          order_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          order_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          created_at: string
          description: string
          id: string
          product_id: string
          rating: number
          user_id: string
          user_name: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          product_id: string
          rating: number
          user_id: string
          user_name?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          product_id?: string
          rating?: number
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          average_rating: number | null
          category_id: string | null
          compare_price: number | null
          created_at: string
          created_at_updated: boolean | null
          description: string | null
          gst_percentage: number
          hsn_code: string | null
          id: string
          image_path: string | null
          image_url: string | null
          images: string[] | null
          is_available: boolean
          is_featured: boolean
          name: string
          price: number
          review_count: number | null
          stock_quantity: number
          tax_inclusive: boolean
          unit: string | null
          updated_at: string
          user_id: string | null
          weight: string | null
          weight_kg: number
        }
        Insert: {
          average_rating?: number | null
          category_id?: string | null
          compare_price?: number | null
          created_at?: string
          created_at_updated?: boolean | null
          description?: string | null
          gst_percentage?: number
          hsn_code?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          images?: string[] | null
          is_available?: boolean
          is_featured?: boolean
          name: string
          price?: number
          review_count?: number | null
          stock_quantity?: number
          tax_inclusive?: boolean
          unit?: string | null
          updated_at?: string
          user_id?: string | null
          weight?: string | null
          weight_kg?: number
        }
        Update: {
          average_rating?: number | null
          category_id?: string | null
          compare_price?: number | null
          created_at?: string
          created_at_updated?: boolean | null
          description?: string | null
          gst_percentage?: number
          hsn_code?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          images?: string[] | null
          is_available?: boolean
          is_featured?: boolean
          name?: string
          price?: number
          review_count?: number | null
          stock_quantity?: number
          tax_inclusive?: boolean
          unit?: string | null
          updated_at?: string
          user_id?: string | null
          weight?: string | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shipping_regions: {
        Row: {
          base_charge: number
          free_delivery_above: number | null
          gst_type: string | null
          id: string
          is_enabled: boolean
          per_kg_rate: number
          region_key: string
          region_name: string
          sort_order: number
          states: string[]
          updated_at: string
        }
        Insert: {
          base_charge?: number
          free_delivery_above?: number | null
          gst_type?: string | null
          id?: string
          is_enabled?: boolean
          per_kg_rate?: number
          region_key: string
          region_name: string
          sort_order?: number
          states?: string[]
          updated_at?: string
        }
        Update: {
          base_charge?: number
          free_delivery_above?: number | null
          gst_type?: string | null
          id?: string
          is_enabled?: boolean
          per_kg_rate?: number
          region_key?: string
          region_name?: string
          sort_order?: number
          states?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          address: string | null
          email: string | null
          gst_enabled: boolean
          gst_inclusive: boolean
          gst_number: string | null
          gst_percentage: number
          id: string
          phone: string | null
          store_name: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          email?: string | null
          gst_enabled?: boolean
          gst_inclusive?: boolean
          gst_number?: string | null
          gst_percentage?: number
          id?: string
          phone?: string | null
          store_name?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          email?: string | null
          gst_enabled?: boolean
          gst_inclusive?: boolean
          gst_number?: string | null
          gst_percentage?: number
          id?: string
          phone?: string | null
          store_name?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      product_review_stats: {
        Row: {
          average_rating: number | null
          five_star: number | null
          four_star: number | null
          one_star: number | null
          product_id: string | null
          three_star: number | null
          total_reviews: number | null
          two_star: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      public_banners: {
        Row: {
          created_at: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          link_url: string | null
          sort_order: number | null
          subtitle: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
        }
        Relationships: []
      }
      public_gst_settings: {
        Row: {
          gst_enabled: boolean | null
          state: string | null
          supported_gst_rates: number[] | null
        }
        Insert: {
          gst_enabled?: boolean | null
          state?: string | null
          supported_gst_rates?: number[] | null
        }
        Update: {
          gst_enabled?: boolean | null
          state?: string | null
          supported_gst_rates?: number[] | null
        }
        Relationships: []
      }
      public_product_reviews: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          product_id: string | null
          rating: number | null
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          product_id?: string | null
          rating?: number | null
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          product_id?: string | null
          rating?: number | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      public_store_settings: {
        Row: {
          gst_enabled: boolean | null
          gst_inclusive: boolean | null
          gst_percentage: number | null
          store_name: string | null
        }
        Insert: {
          gst_enabled?: boolean | null
          gst_inclusive?: boolean | null
          gst_percentage?: number | null
          store_name?: string | null
        }
        Update: {
          gst_enabled?: boolean | null
          gst_inclusive?: boolean | null
          gst_percentage?: number | null
          store_name?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_gst: {
        Args: {
          p_gst_percentage: number
          p_price: number
          p_tax_inclusive: boolean
        }
        Returns: {
          base_amount: number
          gst_amount: number
          total_amount: number
        }[]
      }
      generate_invoice_number: { Args: never; Returns: string }
      get_gst_type_for_state: { Args: { p_state: string }; Returns: string }
      get_review_user_name: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          _action: string
          _new_data?: Json
          _old_data?: Json
          _record_id: string
          _table_name: string
        }
        Returns: undefined
      }
      redeem_coupon: {
        Args: { _coupon_code: string; _order_id: string; _user_id: string }
        Returns: boolean
      }
      redeem_coupon_atomic: {
        Args: { _coupon_code: string; _order_id: string; _user_id: string }
        Returns: boolean
      }
      validate_coupon: {
        Args: { _coupon_code: string; _order_total: number; _user_id: string }
        Returns: {
          coupon_id: string
          discount_type: string
          discount_value: number
          error_message: string
          is_valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      payment_method: "stripe" | "cod"
      payment_status: "pending" | "paid" | "failed" | "refunded"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      payment_method: ["stripe", "cod"],
      payment_status: ["pending", "paid", "failed", "refunded"],
    },
  },
} as const
