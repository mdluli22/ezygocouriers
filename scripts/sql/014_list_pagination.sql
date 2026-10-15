CREATE INDEX IF NOT EXISTS deliveries_customer_cursor ON deliveries(customer_id, id DESC);
CREATE INDEX IF NOT EXISTS deliveries_driver_cursor ON deliveries(assigned_driver_id, id DESC);
CREATE INDEX IF NOT EXISTS deliveries_status_cursor ON deliveries(status, id DESC);
CREATE INDEX IF NOT EXISTS users_role_cursor ON users(role, id DESC);
