-- Enable realtime for bank_reserves table
ALTER TABLE public.bank_reserves REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.bank_reserves;