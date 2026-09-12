-- Traducciones ES/EN/PT para el widget "Pedido Flash" dentro del mensaje de comunidad
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES

-- ==========================================
-- ESPAÑOL (base)
-- ==========================================
('es', 'comunidad', 'attach_offer',      '+ Agregar Pedido Flash'),
('es', 'comunidad', 'offer_title',       'Pedido Flash'),
('es', 'comunidad', 'offer_wa_intro',    'Hola! Quiero pedir esto de tu Pedido Flash'),
('es', 'comunidad', 'offer_wa_total',    'Total'),
('es', 'comunidad', 'offer_wa_btn',      'Pedir por WhatsApp'),
('es', 'comunidad', 'offer_select_hint','Elegí algo'),
('es', 'comunidad', 'offer_no_wa',       'Sin WhatsApp'),

-- ==========================================
-- INGLÉS
-- ==========================================
('en', 'comunidad', 'attach_offer',      '+ Add Flash Order'),
('en', 'comunidad', 'offer_title',       'Flash Order'),
('en', 'comunidad', 'offer_wa_intro',    'Hi! I want to order this from your Flash Order'),
('en', 'comunidad', 'offer_wa_total',    'Total'),
('en', 'comunidad', 'offer_wa_btn',      'Order via WhatsApp'),
('en', 'comunidad', 'offer_select_hint','Pick something'),
('en', 'comunidad', 'offer_no_wa',       'No WhatsApp'),

-- ==========================================
-- PORTUGUÉS
-- ==========================================
('pt', 'comunidad', 'attach_offer',      '+ Adicionar Pedido Flash'),
('pt', 'comunidad', 'offer_title',       'Pedido Flash'),
('pt', 'comunidad', 'offer_wa_intro',    'Oi! Quero pedir isso do seu Pedido Flash'),
('pt', 'comunidad', 'offer_wa_total',    'Total'),
('pt', 'comunidad', 'offer_wa_btn',      'Pedir pelo WhatsApp'),
('pt', 'comunidad', 'offer_select_hint','Escolha algo'),
('pt', 'comunidad', 'offer_no_wa',       'Sem WhatsApp')

ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
