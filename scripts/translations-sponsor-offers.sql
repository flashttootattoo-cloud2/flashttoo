-- Traducciones ES/EN/PT para la biblioteca de ofertas "Pedido Flash" en el menú de marcas
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES

-- ==========================================
-- ESPAÑOL (base)
-- ==========================================
('es', 'sponsor_menu', 'offers',           'Pedido Flash'),
('es', 'comunidad',    'no_offers_hint',   'Todavía no armaste ninguna oferta. Creá una desde tu menú → Pedido Flash.'),

('es', 'offers', 'title',           'Pedido Flash'),
('es', 'offers', 'loading',         'Cargando...'),
('es', 'offers', 'description',    'Armá ofertas con ítems y precios. Después, al publicar en la comunidad, elegís cuál adjuntar.'),
('es', 'offers', 'new_btn',         'Nueva oferta'),
('es', 'offers', 'name_placeholder','Nombre de la oferta (ej: Promo agujas)'),
('es', 'offers', 'whatsapp_placeholder','WhatsApp para recibir estos pedidos (ej: 5491122334455)'),
('es', 'offers', 'item_placeholder','Ítem'),
('es', 'offers', 'price_placeholder','Precio'),
('es', 'offers', 'add_item',        'Agregar ítem'),
('es', 'offers', 'cancel_btn',      'Cancelar'),
('es', 'offers', 'saving',          'Guardando...'),
('es', 'offers', 'save_btn',        'Guardar oferta'),
('es', 'offers', 'your_offers',     'Tus ofertas guardadas'),
('es', 'offers', 'no_offers',       'Todavía no armaste ninguna oferta.'),
('es', 'offers', 'delete_btn',      'Borrar'),

-- ==========================================
-- INGLÉS
-- ==========================================
('en', 'sponsor_menu', 'offers',           'Flash Order'),
('en', 'comunidad',    'no_offers_hint',   'You haven''t created an offer yet. Create one from your menu → Flash Order.'),

('en', 'offers', 'title',           'Flash Order'),
('en', 'offers', 'loading',         'Loading...'),
('en', 'offers', 'description',    'Create offers with items and prices. Then, when posting in the community, pick which one to attach.'),
('en', 'offers', 'new_btn',         'New offer'),
('en', 'offers', 'name_placeholder','Offer name (e.g. Needle promo)'),
('en', 'offers', 'whatsapp_placeholder','WhatsApp to receive these orders (e.g. 5491122334455)'),
('en', 'offers', 'item_placeholder','Item'),
('en', 'offers', 'price_placeholder','Price'),
('en', 'offers', 'add_item',        'Add item'),
('en', 'offers', 'cancel_btn',      'Cancel'),
('en', 'offers', 'saving',          'Saving...'),
('en', 'offers', 'save_btn',        'Save offer'),
('en', 'offers', 'your_offers',     'Your saved offers'),
('en', 'offers', 'no_offers',       'You haven''t created any offers yet.'),
('en', 'offers', 'delete_btn',      'Delete'),

-- ==========================================
-- PORTUGUÉS
-- ==========================================
('pt', 'sponsor_menu', 'offers',           'Pedido Flash'),
('pt', 'comunidad',    'no_offers_hint',   'Você ainda não criou nenhuma oferta. Crie uma no seu menu → Pedido Flash.'),

('pt', 'offers', 'title',           'Pedido Flash'),
('pt', 'offers', 'loading',         'Carregando...'),
('pt', 'offers', 'description',    'Monte ofertas com itens e preços. Depois, ao publicar na comunidade, escolha qual anexar.'),
('pt', 'offers', 'new_btn',         'Nova oferta'),
('pt', 'offers', 'name_placeholder','Nome da oferta (ex: Promoção de agulhas)'),
('pt', 'offers', 'whatsapp_placeholder','WhatsApp para receber esses pedidos (ex: 5491122334455)'),
('pt', 'offers', 'item_placeholder','Item'),
('pt', 'offers', 'price_placeholder','Preço'),
('pt', 'offers', 'add_item',        'Adicionar item'),
('pt', 'offers', 'cancel_btn',      'Cancelar'),
('pt', 'offers', 'saving',          'Salvando...'),
('pt', 'offers', 'save_btn',        'Salvar oferta'),
('pt', 'offers', 'your_offers',     'Suas ofertas salvas'),
('pt', 'offers', 'no_offers',       'Você ainda não criou nenhuma oferta.'),
('pt', 'offers', 'delete_btn',      'Excluir')

ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
