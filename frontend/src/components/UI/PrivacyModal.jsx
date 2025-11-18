import React from "react";
import Modal from "./Modal";

const PrivacyModal = ({ open, onClose }) => (
  <Modal open={open} onClose={onClose} title="Política de Privacidad">
    <p className="text-sm text-slate-600 leading-relaxed">
      Aquí van las polítics de privacidad. Añadir detalles sobre uso de datos y derechos del usuario.
    </p>
  </Modal>
);

export default PrivacyModal;
