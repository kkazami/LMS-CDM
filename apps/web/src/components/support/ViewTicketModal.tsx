import { X, Clock } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  category?: string;
  status: string;
  createdAt: string;
  adminReply: string | null;
  repliedAt: string | null;
}

export function ViewTicketModal({
  isOpen,
  onClose,
  ticket,
  theme,
}: {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  theme: InstituteTheme;
}) {
  if (!isOpen || !ticket) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 page-enter">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-white dark:bg-[#141721] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-full">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/5">
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Ticket Details</h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                ticket.status === 'OPEN' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
              }`}>
                {ticket.status.replace("_", " ")}
              </span>
              {ticket.category && (
                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                  {ticket.category}
                </span>
              )}
            </div>
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {new Date(ticket.createdAt).toLocaleString()}
            </span>
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{ticket.subject}</h3>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A1D27] border border-slate-200 dark:border-white/5">
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {ticket.message}
              </p>
            </div>
          </div>

          {ticket.adminReply && (
            <div>
              <h4 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                Admin Response
              </h4>
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10">
                <p className="text-sm text-indigo-900 dark:text-indigo-100 whitespace-pre-wrap leading-relaxed">
                  {ticket.adminReply}
                </p>
                {ticket.repliedAt && (
                  <p className="text-xs text-indigo-400 dark:text-indigo-500 mt-3 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(ticket.repliedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
