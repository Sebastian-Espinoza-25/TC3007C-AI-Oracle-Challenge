import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CustomButton from "../components/UI/CustomButton";

import { AiOutlineHome } from "react-icons/ai";
import { MdOutlineShoppingCart } from "react-icons/md";
import { RiAccountCircleLine, RiLogoutBoxLine } from "react-icons/ri";

import logo from "../assets/logo.jpg";

const Atelier = () => {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [currentConv, setCurrentConv] = useState({
    id: Date.now(),
    messages: [],
  });
  const [input, setInput] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);

  const [showGreeting, setShowGreeting] = useState(false);
  const [showCards, setShowCards] = useState(false);

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

  // Greeting + cards animation
  useEffect(() => {
    setShowGreeting(true);
    const timeout = setTimeout(() => setShowCards(true), 1000);
    return () => clearTimeout(timeout);
  }, []);

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
      text: "✨ Entendido. Pronto te daré una respuesta personalizada.",
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

  // Upload image 
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);

      const userMsg = {
        sender: "Usuario",
      text: (
        <img
          src={preview}
          alt="preview"
          className="max-w-xs rounded-xl shadow-md"
        />
      ),
        timestamp: getTimestamp(),
      };

      const botMsg = {
        sender: "Atelier",
      text: "🪄 Imagen recibida. La analizaré enseguida.",
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
  };

  // New chat
  const newConversation = () => {
    setCurrentConv({ id: Date.now(), messages: [] });
    setShowGreeting(false);
    setShowCards(false);

    // restart animation
    setTimeout(() => setShowGreeting(true), 50);
    setTimeout(() => setShowCards(true), 1050);
  };

  // Logout
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/auth/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F7]">

      {/* Navbar */}
      <div className="w-full py-6 flex justify-center items-center gap-4 bg-white shadow-sm border-b border-gray-200 relative">

        <img src={logo} alt="logo" className="h-10 w-auto" />

          <h1 className="text-2xl font-bold text-[#1B1B5E]">ATELIER</h1>

        <div className="absolute right-10 flex items-center gap-6 text-gray-700">

          {/* Home */}
          <button
            onClick={() => navigate("/")}
            className="text-3xl text-primary-500 hover:text-primary-400 transition"
            title="Inicio"
          >
            <AiOutlineHome />
          </button>

          {/* Cart */}
          <button
            onClick={() => navigate("/cart")}
            className="text-3xl text-primary-500 hover:text-primary-400 transition"
            title="Carrito"
          >
            <MdOutlineShoppingCart />
          </button>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="text-3xl text-primary-500 hover:text-primary-400 transition"
              title="Cuenta"
            >
              <RiAccountCircleLine />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-20">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg text-gray-700"
                >
                  <RiLogoutBoxLine className="text-xl" /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Sidebar */}
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
                        {new Date(conv.id).toLocaleDateString()}
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

        {/* Toggle sidebar */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white border border-gray-200 rounded-full shadow-md px-2 py-1 text-gray-500 hover:text-primary-500 transition z-10"
        >
          {sidebarOpen ? "◀" : "▶"}
        </button>

        {/* Main chat */}
        <div className="flex-1 flex flex-col h-full">

          <div className="flex-1 overflow-y-auto p-6 space-y-3 pb-32">

            {currentConv.messages.length === 0 ? (
              <div className="flex flex-col items-center text-gray-700 mt-20 mb-20">

                {/* Greeting message */}
                <h2
                  className={`
                    text-3xl font-semibold text-primary-500 text-center mb-10
                    transition-all duration-700 ease-out
                    ${showGreeting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
                  `}
                >
                  Hola, ¿cómo puedo ayudarte hoy?
                </h2>

                {/* Suggestions cards */}
                <div
                  className={`
                    grid grid-cols-1 sm:grid-cols-2 gap-8 w-full max-w-5xl mx-auto
                    transition-all duration-700 ease-out
                    ${showCards ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
                  `}
                >

                  {/* Card 1 */}
                  <div
                    onClick={() =>
                      setInput("Ayúdame a crear un outfit perfecto para una ocasión especial")
                    }
                    className="flex items-start gap-4 bg-white border border-neutral-300 hover:border-primary-500 transition rounded-2xl p-6 shadow-md w-full max-w-xl cursor-pointer"
                  >
                    <div className="text-3xl">💡</div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-800 mb-1">Crea tu outfit perfecto</h3>
                      <p className="text-sm text-gray-600">Dime qué ocasión tienes y te recomiendo el look ideal.</p>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div
                    onClick={() =>
                      setInput("Analiza mi look o recomiéndame algo basado en una foto")
                    }
                    className="flex items-start gap-4 bg-white border border-neutral-300 hover:border-primary-500 transition rounded-2xl p-6 shadow-md w-full max-w-xl cursor-pointer"
                  >
                    <div className="text-3xl">📷</div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-800 mb-1">Encuentra tu estilo</h3>
                      <p className="text-sm text-gray-600">Sube una foto de tu outfit y lo analizaré.</p>
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              currentConv.messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.sender === "Usuario" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2 rounded-2xl shadow-sm ${
                      msg.sender === "Usuario"
                        ? "bg-[#1B1B5E] text-white rounded-br-none"
                        : "bg-white text-gray-800 rounded-bl-none"
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span className="text-xs text-gray-300 block mt-1 text-right">{msg.timestamp}</span>
                  </div>
                </div>
              ))
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            className="fixed bottom-4 left-[300px] right-4 flex items-center bg-white rounded-full p-3 px-5 shadow-md border border-neutral-300"
          >
            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
              className="text-2xl text-primary-500 hover:text-primary-400 transition mr-3"
              title="Añadir imagen"
            >
              📎
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
              placeholder="Haz una petición o comparte una foto…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-transparent outline-none text-gray-800 text-base placeholder-gray-500"
            />

            <button type="submit" className="text-2xl text-primary-500 hover:text-primary-400 transition ml-3">
              ➤
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Atelier;
