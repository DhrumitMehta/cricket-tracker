import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wphpxhijptdcmipnvqyz.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwaHB4aGlqcHRkY21pcG52cXl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwOTgwMTgsImV4cCI6MjA2MTY3NDAxOH0.jApPyLSssQKJpR_mYlAxpnUmzC9DsO0uwihQIGB-jfQ";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
