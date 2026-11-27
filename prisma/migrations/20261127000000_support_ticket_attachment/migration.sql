BEGIN;

CREATE TABLE public."SupportTicketAttachment" (
    "ticketId" TEXT PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    CONSTRAINT "SupportTicketAttachment_ticketId_fkey"
        FOREIGN KEY ("ticketId") REFERENCES public."SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lms_web_runtime_v1') THEN
        GRANT SELECT, INSERT ON TABLE public."SupportTicketAttachment" TO lms_web_runtime_v1;
    END IF;
END $$;

COMMIT;
