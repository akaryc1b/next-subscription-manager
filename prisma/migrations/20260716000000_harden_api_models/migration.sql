-- API/model hardening: enums, indexes, bounded user agents, config uniqueness/status, passkey uniqueness.
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');
CREATE TYPE "SecurityEventType" AS ENUM (
  'admin_auth_missing',
  'admin_auth_invalid_session',
  'admin_auth_forbidden',
  'auth_failure',
  'auth_sign_in_success',
  'activation_token_missing',
  'activation_token_invalid',
  'activation_token_used',
  'activation_token_expired',
  'activation_setup_invalid_request',
  'activation_setup_rejected',
  'activation_setup_success',
  'subscription_token_invalid',
  'subscription_denied'
);
CREATE TYPE "SecuritySeverity" AS ENUM ('info', 'warning', 'error', 'critical');

ALTER TABLE "users" DROP COLUMN IF EXISTS "password";
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole" USING "role"::"UserRole";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user';

ALTER TABLE "configs" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "configs" ADD COLUMN "is_validated" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "configs_user_id_name_key" ON "configs"("user_id", "name");

ALTER TABLE "access_logs" ALTER COLUMN "user_agent" TYPE VARCHAR(512) USING left("user_agent", 512);
CREATE INDEX "access_logs_subscription_id_accessed_at_idx" ON "access_logs"("subscription_id", "accessed_at");
CREATE INDEX "access_logs_accessed_at_idx" ON "access_logs"("accessed_at");

ALTER TABLE "security_events" ALTER COLUMN "type" TYPE "SecurityEventType" USING "type"::"SecurityEventType";
ALTER TABLE "security_events" ALTER COLUMN "severity" DROP DEFAULT;
ALTER TABLE "security_events" ALTER COLUMN "severity" TYPE "SecuritySeverity" USING "severity"::"SecuritySeverity";
ALTER TABLE "security_events" ALTER COLUMN "severity" SET DEFAULT 'info';
ALTER TABLE "security_events" ALTER COLUMN "user_agent" TYPE VARCHAR(512) USING left("user_agent", 512);

DROP INDEX IF EXISTS "passkey_credentialID_idx";
CREATE UNIQUE INDEX "passkey_credentialID_key" ON "passkey"("credentialID");
