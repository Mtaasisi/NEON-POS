SELECT * FROM purchase_order_payments WHERE purchase_order_id = (SELECT id FROM lats_purchase_orders WHERE po_number = 'PO-1763231644894');
