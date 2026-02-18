import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerifyOTPRequest {
  email: string;
  otp: string;
  password?: string;
  fullName?: string;
  isSignUp: boolean;
  isSignIn?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp, password, fullName, isSignUp, isSignIn }: VerifyOTPRequest = await req.json();

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ error: "Email and OTP are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the OTP record
    const { data: otpRecord, error: fetchError } = await supabase
      .from("email_otps")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("otp_code", otp)
      .eq("verified", false)
      .single();

    if (fetchError || !otpRecord) {
      console.error("OTP not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired OTP" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if OTP has expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      // Delete expired OTP
      await supabase.from("email_otps").delete().eq("id", otpRecord.id);
      return new Response(
        JSON.stringify({ error: "OTP has expired. Please request a new one." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark OTP as verified
    await supabase
      .from("email_otps")
      .update({ verified: true })
      .eq("id", otpRecord.id);

    // Delete the OTP record after verification
    await supabase.from("email_otps").delete().eq("id", otpRecord.id);

    // Handle Sign In with OTP (passwordless)
    if (isSignIn) {
      // Check if user exists
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error("Error listing users:", listError);
        return new Response(
          JSON.stringify({ error: "Failed to verify user" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

      if (!existingUser) {
        return new Response(
          JSON.stringify({ error: "No account found with this email. Please sign up first." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Generate a magic link for the user to sign in
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email.toLowerCase(),
        options: {
          redirectTo: `${Deno.env.get("SUPABASE_URL")}/auth/v1/callback`,
        }
      });

      if (linkError) {
        console.error("Error generating magic link:", linkError);
        return new Response(
          JSON.stringify({ error: "Failed to sign in" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Return the magic link properties for the client to use
      return new Response(
        JSON.stringify({ 
          success: true, 
          verified: true,
          signIn: true,
          token_hash: linkData.properties?.hashed_token,
          message: "Email verified successfully. Signing you in..." 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (isSignUp) {
      // Create new user
      if (!password) {
        return new Response(
          JSON.stringify({ error: "Password is required for sign up" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
        email: email.toLowerCase(),
        password: password,
        email_confirm: true, // Auto-confirm since we verified via OTP
        user_metadata: {
          full_name: fullName || "",
        },
      });

      if (signUpError) {
        console.error("Sign up error:", signUpError);
        if (signUpError.message.includes("already")) {
          return new Response(
            JSON.stringify({ error: "This email is already registered. Please sign in instead." }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        return new Response(
          JSON.stringify({ error: signUpError.message }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Account created successfully! Please sign in.",
          user: signUpData.user 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } else {
      // For simple verification (step in sign up flow), just return success
      return new Response(
        JSON.stringify({ 
          success: true, 
          verified: true,
          message: "Email verified successfully" 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  } catch (error: any) {
    console.error("Error in verify-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
