import React from "react";
import Modal from "./Modal";

const TermsModal = ({ open, onClose }) => (
  <Modal open={open} onClose={onClose} title="Términos y Condiciones">
    <p className="text-sm text-slate-600 leading-relaxed">
      Aquí van tus términos. Puedes reemplazar este texto con los de tu negocio.
    </p>
  </Modal>
);

export default TermsModal;
