import React from "react";
import Modal from "./Modal";

const PrivacyModal = ({ open, onClose }) => (
  <Modal open={open} onClose={onClose} title="Política de Privacidad">
    <p className="text-sm text-slate-600 leading-relaxed">
      Aquí va tu política de privacidad. Añade detalles sobre uso de datos y derechos del usuario.
    </p>
  </Modal>
);

export default PrivacyModal;
