-- Add market maker address to special addresses
INSERT INTO public.special_addresses (address, label, label_type) 
VALUES ('0x65706aa69b3613bfc6926561ef332118d20cbc41', 'MARKET MAKER ADDRESS', 'market-maker')
ON CONFLICT (address) DO UPDATE SET 
  label = EXCLUDED.label,
  label_type = EXCLUDED.label_type,
  updated_at = now();