import { Paperclip } from 'lucide-react';

export default function TicketAttachmentLink({ ticketId, fileName }: { ticketId: string; fileName: string }) {
  return (
    <a
      href={`/api/support-tickets/${encodeURIComponent(ticketId)}/attachment`}
      className="inline-flex min-h-11 max-w-full items-center gap-2 text-sm font-semibold text-(--institute-ink) underline underline-offset-4"
    >
      <Paperclip aria-hidden="true" className="size-4 shrink-0" />
      <span className="min-w-0 wrap-anywhere">Download {fileName}</span>
    </a>
  );
}
