-- Add birthday column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN birthday date;

-- Add unique constraint to username for unique nicknames
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_username_unique UNIQUE (username);