"use client";
import Modal from "@/components/common/Modal";
import ImportWizard from "./ImportWizard";
import type { InstituteTheme } from "@/lib/theme";
export default function BulkImportModal({
  open,
  theme,
  instituteCode,
  onClose,
  onSuccess,
}: {
  open: boolean;
  theme: InstituteTheme;
  instituteCode: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  return (
    <Modal open={open} title="Bulk Student Import" onClose={onClose}>
      {open && (
        <ImportWizard
          type="STUDENTS"
          theme={theme}
          instituteCode={instituteCode}
          onComplete={() =>
            onSuccess(
              "Student import complete. Invitations can be sent separately.",
            )
          }
        />
      )}
    </Modal>
  );
}
