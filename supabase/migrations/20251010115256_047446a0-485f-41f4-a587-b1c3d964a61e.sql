-- Initialize promotional reserves for welcome bonuses
INSERT INTO public.bank_reserves (reserve_type, amount, updated_by)
VALUES ('promotional', 100000, 'system')
ON CONFLICT DO NOTHING;