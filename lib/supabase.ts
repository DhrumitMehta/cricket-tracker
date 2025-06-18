import { createClient } from "@supabase/supabase-js";

// Replace these with your actual Supabase project URL and anon key
// You can find these in your Supabase project settings -> API
const supabaseUrl = "https://wphpxhijptdcmipnvqyz.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwaHB4aGlqcHRkY21pcG52cXl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwOTgwMTgsImV4cCI6MjA2MTY3NDAxOH0.jApPyLSssQKJpR_mYlAxpnUmzC9DsO0uwihQIGB-jfQ";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwaHB4aGlqcHRkY21pcG52cXl6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjA5ODAxOCwiZXhwIjoyMDYxNjc0MDE4fQ.9ct8hiOXfIlz2tQhsgWyvf6fpJl8BaX8JFrSPFZE_Qg";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
