"use client";

import { useState } from "react";
import type { InstituteTheme } from "@/lib/theme";
import { HelpSearchHero } from "@/components/support/HelpSearchHero";
import { FaqCategoryList } from "@/components/support/FaqCategoryList";
import { ContactSupportModal } from "@/components/support/ContactSupportModal";
import Button from "@/components/common/Button";
import { withOpacity } from "@/lib/theme";

export default function HelpDashboardClient({
  theme,
  role,
}: {
  theme: InstituteTheme;
  role: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-6xl mx-auto">
      <HelpSearchHero 
        theme={theme} 
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
        </div>
      </div>

      <ContactSupportModal 
        theme={theme} 
        isOpen={isContactModalOpen} 
        onClose={() => setIsContactModalOpen(false)} 
      />
    </div>
  );
}
