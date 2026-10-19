"use client";

import { useState, useEffect } from "react";
import type { InstituteTheme } from "@/lib/theme";
import { HelpSearchHero } from "@/components/support/HelpSearchHero";
import { FaqCategoryList } from "@/components/support/FaqCategoryList";
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
}

export default function HelpDashboardClient({
  theme,
  role,
}: {
  theme: InstituteTheme;
  role: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/support-tickets");
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleTicketSubmitted = () => {
    setIsContactModalOpen(false);
    fetchTickets();
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-6xl mx-auto">
      <HelpSearchHero 
        theme={theme}
        role={role}
        searchQuery={searchQuery} 
        onSearchChange={setSearchQuery} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <FaqCategoryList 
            theme={theme} 
            role={role} 
            searchQuery={searchQuery} 
          />
        </div>

        <div className="space-y-6">
          <div 
            className="rounded-2xl border p-6 text-center space-y-4"
            style={{ 
              borderColor: withOpacity(theme.colors.primary, 0.2),
              backgroundColor: withOpacity(theme.colors.primary, 0.02)
            }}
          >
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Still need help?</h3>
            <p className="text-slate-600 dark:text-slate-300">
              Can't find what you're looking for? Our support team is here to assist you.
            </p>
            <Button 
              theme={theme} 
              className="w-full"
              onClick={() => setIsContactModalOpen(true)}
            >
              Contact Support
            </Button>
          </div>

          {/* My Tickets Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">My Support Tickets</h3>
            {loadingTickets ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
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
                    onClick={() => setSelectedTicket(ticket)}
                    className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1A1D27] p-5 shadow-sm space-y-3 cursor-pointer hover:border-slate-300 dark:hover:border-white/10 transition-colors"
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
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{ticket.subject}</h4>
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
        </div>
      </div>

      <ContactSupportModal 
        theme={theme} 
        isOpen={isContactModalOpen} 
        onClose={handleTicketSubmitted} 
      />

      <ViewTicketModal
        theme={theme}
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        ticket={selectedTicket}
      />
    </div>
  );
}
