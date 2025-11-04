import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CustomButton from "../components/UI/CustomButton";
import UserIcon from "../assets/user.jpg";
import CartIcon from "../assets/cart.png";
import logo from "../assets/logo.jpg";

const Atelier = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [currentConv, setCurrentConv] = useState({ id: Date.now(), messages: [] });
  const [input, setInput] = useState("");
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);

  // timestamp
  const getTimestamp = () => {
    const now = new Date();
    return `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
  };

  //Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentConv.messages]);

  // Send text
  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = {
      sender: "Usuario",
      text: input,
      timestamp: getTimestamp(),
    };

    const botMsg = {
      sender: "Atelier",
      text: "✨ Entendido, pronto te daré una respuesta personalizada.",
      timestamp: getTimestamp(),
    };

    const updatedConv = {
      ...currentConv,
      messages: [...currentConv.messages, userMsg, botMsg],
    };

    setCurrentConv(updatedConv);
    setConversations((prev) => {
      const others = prev.filter((c) => c.id !== currentConv.id);
      return [...others, updatedConv];
    });

    setInput("");
  };

  //Upload image
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const userMsg = {
        sender: "Usuario",
        text: `📷 Imagen subida: ${file.name}`,
        timestamp: getTimestamp(),
      };

      const botMsg = {
        sender: "Atelier",
        text: "🪄 He recibido tu imagen. La analizaré más adelante.",
        timestamp: getTimestamp(),
      };

      const updatedConv = {
        ...currentConv,
        messages: [...currentConv.messages, userMsg, botMsg],
      };

      setCurrentConv(updatedConv);
      setConversations((prev) => {
        const others = prev.filter((c) => c.id !== currentConv.id);
        return [...others, updatedConv];
      });
    }
  };

  //New conversation
  const newConversation = () => {
    setCurrentConv({ id: Date.now(), messages: [] });
  };

  return (
    <div className="h-screen flex flex-col bg-[#F7F8FC] overflow-hidden">
      {/*Fixed header*/}
      <div className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-10 py-4 bg-white shadow-sm border-b border-gray-100">
        <div className="flex-1 flex justify-center items-center gap-3">
          <img src={logo} alt="Atelier Logo" className="h-10 w-auto" />
          <h1 className="text-2xl font-bold text-[#1B1B5E]">ATELIER</h1>
        </div>
        <div className="absolute right-10 flex items-center gap-6">
          <button
            onClick={() => navigate("/")}
            className="text-gray-700 hover:text-primary-600 font-medium transition"
          >
            ← Regresar al main
          </button>
          <img
            src={CartIcon}
            alt="Carrito"
            className="h-6 w-6 object-contain cursor-pointer"
          />
          <img
            src={UserIcon}
            alt="Usuario"
            className="h-9 w-9 rounded-full object-cover cursor-pointer"
          />
        </div>
      </div>

      {/* General body */}
      <div className="flex flex-1 overflow-hidden relative mt-20">
        {/* Sidebar with previous conversations */}
        <div
          className={`bg-white border-r border-gray-200 p-5 overflow-y-auto transition-all duration-300 ${
            sidebarOpen ? "w-64" : "w-0 p-0"
          }`}
        >
          {sidebarOpen && (
            <>
              <h2 className="text-lg font-semibold text-gray-700 mb-3">
                Conversaciones
              </h2>
              {conversations.length === 0 ? (
                <p className="text-sm text-gray-400">No hay conversaciones aún</p>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`p-3 rounded-md cursor-pointer hover:bg-gray-100 ${
                        conv.id === currentConv.id ? "bg-gray-100" : ""
                      }`}
                      onClick={() => setCurrentConv(conv)}
                    >
                      <p className="text-sm font-medium text-gray-700 truncate">
                        Chat {new Date(conv.id).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {conv.messages[conv.messages.length - 1]?.text ||
                          "Sin mensajes"}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <CustomButton
                text="+ Nueva conversación"
                style="secondary"
                extraStyles="mt-5 w-full"
                onClick={newConversation}
              />
            </>
          )}
        </div>

        {/*Toggle sidebar */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white border border-gray-200 rounded-full shadow-md px-2 py-1 text-gray-500 hover:text-primary-600 transition z-10"
        >
          {sidebarOpen ? "◀" : "▶"}
        </button>

        {/*Main area */}
        <div className="flex-1 flex flex-col h-full">
          {/*Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {currentConv.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-700">
                {/* Initial cards with options of what Atelier can do */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl mb-10">
                  <div
                    onClick={() =>
                      setInput("Ayúdame a crear un outfit perfecto para una ocasión especial")
                    }
                    className="flex items-start gap-4 bg-[#F1F3F9] hover:bg-[#E9EBF4] transition rounded-2xl p-6 cursor-pointer shadow-sm"
                  >
                    <div className="text-3xl">💡</div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-800 mb-1">
                        Crea tu outfit perfecto
                      </h3>
                      <p className="text-sm text-gray-600">
                        Si tienes una ocasión especial cerca, puedo ayudarte a
                        encontrar la prenda perfecta.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() =>
                      setInput("Analiza mi look o recomiéndame algo basado en una foto")
                    }
                    className="flex items-start gap-4 bg-[#F1F3F9] hover:bg-[#E9EBF4] transition rounded-2xl p-6 cursor-pointer shadow-sm"
                  >
                    <div className="text-3xl">📷</div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-800 mb-1">
                        Encuentra tu estilo
                      </h3>
                      <p className="text-sm text-gray-600">
                        ube una foto de tu camisa favorita, y te muestro posibles accesorios para combinar.
                      </p>
                    </div>
                  </div>
                </div>

                {/*Welcome text*/}
                <h2 className="text-3xl font-semibold mb-3">
                  Hola, ¿cómo puedo ayudarte hoy?
                </h2>
              </div>
            ) : (
              currentConv.messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${
                    msg.sender === "Usuario" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2 rounded-2xl shadow-sm ${
                      msg.sender === "Usuario"
                        ? "bg-[#1B1B5E] text-white rounded-br-none"
                        : "bg-white text-gray-800 rounded-bl-none"
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span className="text-xs text-gray-400 block mt-1 text-right">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/*Input */}
          <form
            onSubmit={handleSend}
            className="flex items-center bg-[#E9EBF4] rounded-full p-3 px-5 shadow-sm m-5"
          >
            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
              className="text-2xl text-gray-500 hover:text-primary-600 transition mr-3"
            >
              🖼️
            </button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
            />
            <input
              type="text"
              placeholder="Haz una petición o comparte una foto"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-transparent outline-none text-gray-700 text-base placeholder-gray-500"
            />
            <button
              type="submit"
              className="text-2xl text-gray-600 hover:text-primary-600 transition ml-3"
            >
              ➤
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Atelier;
