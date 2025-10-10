-- Delete encrypted email for wallet 0xa46923ae83d45e433bbe5dee6b9e787eb5fb9249
DELETE FROM public.encrypted_emails 
WHERE id = 'e5e7c9bc-f16a-44b9-9f02-df16ed232d92';

-- Delete whitelist request for wallet 0xa46923ae83d45e433bbe5dee6b9e787eb5fb9249
DELETE FROM public.whitelist_requests 
WHERE id = '76bdfb3b-89e8-4e97-bbfc-7cf146a29d3f';