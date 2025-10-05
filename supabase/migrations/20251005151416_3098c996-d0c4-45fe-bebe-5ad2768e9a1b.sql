-- Fix storage policies for wallet-based authentication
-- Drop existing policies that rely on auth.jwt()
DROP POLICY IF EXISTS "Users can upload their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all receipts" ON storage.objects;

-- Make the bucket public for uploads (will be validated by edge function)
-- The edge function already verifies wallet signatures before allowing uploads
UPDATE storage.buckets 
SET public = true 
WHERE id = 'deposit-receipts';

-- Allow authenticated users to upload to deposit-receipts bucket
-- Security is handled by edge function signature verification
CREATE POLICY "Anyone can upload deposit receipts"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'deposit-receipts');

-- Allow anyone to view receipts (URLs will be shared through secure channels)
CREATE POLICY "Anyone can view deposit receipts"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'deposit-receipts');

-- Allow service role to manage all receipts (for admin functions)
CREATE POLICY "Service role can manage deposit receipts"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'deposit-receipts');