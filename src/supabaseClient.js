import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://yxeoxxocqbgzitwbcgoj.supabase.co'
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4ZW94eG9jcWJneml0d2JjZ29qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NzIzOTIsImV4cCI6MjA3NTE0ODM5Mn0.qU0IYrFhgRFpK4ycQe4L7wHy_AwiRogb0fYfLYeBY8k'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)