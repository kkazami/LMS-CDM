"use client";

import { useCallback, useState, useEffect } from "react";
import Link from "next/link";
import type { InstituteTheme } from "@/lib/theme";
import { HelpSearchHero } from "@/components/support/HelpSearchHero";
import { FaqCategoryList } from "@/components/support/FaqCategoryList";
import { IcsHelp, IcsHelpGuides } from "@/components/support/IcsHelp";
import { getIcsHelpRole } from "@/lib/ics-help-guides";
import { ContactSupportModal } from "@/components/support/ContactSupportModal";
import { ViewTicketModal } from "@/components/support/ViewTicketModal";
import Button from "@/components/common/Button";
import { withOpacity } from "@/lib/theme";
import { Clock, Loader2, CheckCircle2 } from "lucide-react";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  adminReply: string | null;
  repliedAt: string | null;
  attachment?: { fileName: string } | null;
}

export default function HelpDashboardClient({
  theme,
  role,
}: {
  theme: InstituteTheme;
  role: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [contactQuestion, setContactQuestion] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [ticketsUnavailable, setTicketsUnavailable] = useState(false);
  const helpRole = getIcsHelpRole(theme.code, role);
  const closeContact = useCallback(() => setContactQuestion(null), []);

  const fetchTickets = useCallback(async () => {
    setLoadingTickets(true);
    try {
      const res = await fetch("/api/support-tickets?mine=1");
      if (!res.ok) throw new Error('Tickets unavailable.');
      const data = await res.json();
      setTickets(data.tickets || []);
      setTicketsUnavailable(false);
    } catch {
      setTicketsUnavailable(true);
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return (
    <div className="mx-auto max-w-6xl flex-1 space-y-5 p-4 pt-6 md:p-8">
      {helpRole ? (
        <header>
          <h1 className="text-2xl font-semibold text-primary-theme">Help Center</h1>
          <p className="mt-1 text-sm text-secondary-theme">{helpRole === 'ADMIN' ? 'Find help with accounts, logs, reports, and the Desktop Administrator Console.' : helpRole === 'INSTRUCTOR' ? 'Find help with teaching, attendance, grading, and the mobile app.' : 'Find help with classes, study tools, and the mobile app.'}</p>
        </header>
      ) : <HelpSearchHero theme={theme} role={role} searchQuery={searchQuery} onSearchChange={setSearchQuery} />}

      <div className={`grid grid-cols-1 items-start gap-6 ${helpRole ? 'xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]' : 'lg:grid-cols-3'}`}>
        <div className={`min-w-0 ${helpRole ? '' : 'lg:col-span-2'}`}>
          {helpRole ? <IcsHelp key={helpRole} theme={theme} role={helpRole} onContact={setContactQuestion} /> : (
            <FaqCategoryList theme={theme} role={role} searchQuery={searchQuery} />
          )}
        </div>

        <aside aria-label="Support tickets" className={`min-w-0 space-y-6 ${helpRole ? 'xl:col-start-2 xl:row-span-2 xl:row-start-1' : ''}`}>
          <div 
            className="rounded-2xl border p-6 text-center space-y-4"
            style={{ 
              borderColor: withOpacity(theme.colors.primary, 0.2),
              backgroundColor: withOpacity(theme.colors.primary, 0.02)
            }}
          >
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Still need help?</h3>
            <p className="text-slate-600 dark:text-slate-300">
              Send us a question or tell us what went wrong.
            </p>
            <Button 
              theme={theme} 
              className="w-full"
              onClick={() => setContactQuestion('')}
            >
              Contact support
            </Button>
            <Link href={`/${theme.code}/report-a-problem`} className="inline-flex min-h-11 items-center text-sm font-semibold text-(--institute-ink) underline underline-offset-4">
              Report a problem
            </Link>
          </div>

          {/* My Tickets Section */}
          <div id="my-tickets" className="scroll-mt-20 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">My tickets</h3>
            {loadingTickets ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : ticketsUnavailable ? (
              <div className="space-y-2 rounded-2xl border border-theme bg-surface p-5">
                <p className="text-sm text-secondary-theme">Your tickets couldn’t load.</p>
                <Button theme={theme} type="button" variant="secondary" onClick={fetchTickets}>Try again</Button>
              </div>
            ) : tickets.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#1A1D27] p-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">You haven't submitted any tickets.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-125 overflow-y-auto pr-2">
                {tickets.map((ticket) => (
                  <div 
                    key={ticket.id} 
                    className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1A1D27] p-5 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        ticket.status === 'OPEN' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                        ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                      }`}>
                        {ticket.status.replace("_", " ")}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        <button type="button" className="cursor-pointer text-left wrap-anywhere hover:underline" onClick={() => setSelectedTicket(ticket)}>{ticket.subject}</button>
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{ticket.message}</p>
                    </div>

                    {ticket.adminReply && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-[#141721] border border-slate-200 dark:border-white/5">
                        <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Admin Reply</p>
                        <p className="text-xs text-slate-700 dark:text-slate-300">{ticket.adminReply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
        {helpRole && <IcsHelpGuides role={helpRole} />}
      </div>

      {contactQuestion !== null && (
        <ContactSupportModal theme={theme} onClose={closeContact} onSubmitted={fetchTickets} initialMessage={contactQuestion} />
      )}

      <ViewTicketModal
        theme={theme}
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        ticket={selectedTicket}
      />
    </div>
  );
}
