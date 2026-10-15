-- Transactional booking and assignment notifications use the existing encrypted outbox.
ALTER TABLE notification_outbox DROP CONSTRAINT IF EXISTS notification_outbox_kind_check;
ALTER TABLE notification_outbox ADD CONSTRAINT notification_outbox_kind_check
  CHECK (kind IN ('pin_email','completed_email','booking_email','assigned_email','push'));
