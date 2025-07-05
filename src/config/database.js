const { createClient } = require("@supabase/supabase-js");

// Supabase configuration
const supabaseUrl =
  process.env.SUPABASE_URL || "https://qeyjfzcxpmkyawkdsctx.supabase.co";
const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFleWpmemN4cG1reWF3a2RzY3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNjk4NTMsImV4cCI6MjA2MjY0NTg1M30.PnRB-9P5L_LCWZqSg89H8C82bWqFq-MJnBmyvPXm2rk";

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
