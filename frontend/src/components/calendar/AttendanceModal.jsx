import React from "react";
import { FormModal } from "../ui/FormModal.jsx";
export function AttendanceModal({ children, onClose, title, busy = false }) {
  return (
    <FormModal busy={busy} open title={title} onClose={onClose} closeLabel="Fechar chamada">
      {children}
    </FormModal>
  );
}
