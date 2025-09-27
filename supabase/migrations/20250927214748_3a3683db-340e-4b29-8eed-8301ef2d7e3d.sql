-- Create enum for redemption status
CREATE TYPE public.redemption_status AS ENUM ('pending', 'burn_confirmed', 'processing', 'completed', 'failed');

-- Create redemptions table
CREATE TABLE public.redemptions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    pkrsc_amount DECIMAL(18, 6) NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_title TEXT NOT NULL,
    burn_address TEXT NOT NULL DEFAULT '0x000000000000000000000000000000000000dEaD',
    transaction_hash TEXT,
    status redemption_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own redemptions" 
ON public.redemptions 
FOR SELECT 
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own redemptions" 
ON public.redemptions 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own redemptions" 
ON public.redemptions 
FOR UPDATE 
USING (auth.uid()::text = user_id::text);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_redemptions_updated_at
    BEFORE UPDATE ON public.redemptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();