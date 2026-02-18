-- Create table to store email OTP codes
CREATE TABLE public.email_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_email_otps_email ON public.email_otps(email);
CREATE INDEX idx_email_otps_expires_at ON public.email_otps(expires_at);

-- Enable RLS
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for OTP creation before auth)
CREATE POLICY "Allow anonymous OTP creation"
ON public.email_otps
FOR INSERT
WITH CHECK (true);

-- Allow anonymous select for verification
CREATE POLICY "Allow anonymous OTP verification"
ON public.email_otps
FOR SELECT
USING (true);

-- Allow anonymous updates for marking as verified
CREATE POLICY "Allow anonymous OTP updates"
ON public.email_otps
FOR UPDATE
USING (true);

-- Allow anonymous deletes for cleanup
CREATE POLICY "Allow anonymous OTP deletion"
ON public.email_otps
FOR DELETE
USING (true);