import React from "react";
import Modal from "./Modal";

const TermsModal = ({ open, onClose }) => (
  <Modal open={open} onClose={onClose} title="Términos y Condiciones">
    <p className="text-sm text-slate-600 leading-relaxed">
      Aquí van los términos. Reemplazar este texto con los del negocio.
    </p>
  </Modal>
);

export default TermsModal;
