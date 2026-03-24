-- Add phone_number column to clients for WhatsApp notifications
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS phone_number text;

-- E.164 format validation (e.g. +14155551234)
ALTER TABLE public.clients
  ADD CONSTRAINT clients_phone_e164
  CHECK (phone_number IS NULL OR phone_number ~ '^\+[1-9]\d{1,14}$');

-- Comment for clarity
COMMENT ON COLUMN public.clients.phone_number IS 'WhatsApp-capable phone number in E.164 format (e.g. +14155551234)';
