-- Cancellation notices share the encrypted, retryable notification outbox.
ALTER TABLE notification_outbox DROP CONSTRAINT IF EXISTS notification_outbox_kind_check;
ALTER TABLE notification_outbox ADD CONSTRAINT notification_outbox_kind_check
  CHECK (kind IN ('pin_email','completed_email','booking_email','assigned_email','cancelled_email','push'));
