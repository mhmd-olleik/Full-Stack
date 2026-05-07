import { useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./components/Auth/LoginPage";
import Sidebar from "./components/Sidebar/Sidebar";
import ChatWindow from "./components/Chat/ChatWindow";
import OnboardingModal from "./components/shared/OnboardingModal";
import "./index.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function App() {
  const { user, loading } = useAuth();
  const [activeChatId, setActiveChatId] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);

  if (loading) {
    return (
      <div className="app-loader">
        <div className="app-loader-content">
          <div className="app-loader-logo">💬</div>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <Toaster position="top-right" toastOptions={{
          style: { background: "#131d2e", color: "#eaf0f6", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", fontSize: "14px" },
          success: { iconTheme: { primary: "#00e676", secondary: "#000" } },
        }} />
        <LoginPage />
      </GoogleOAuthProvider>
    );
  }

  const handleChatSelect = (chat) => {
    setActiveChatId(chat._id);
    setShowSidebar(false);
  };

  const handleBack = () => {
    setShowSidebar(true);
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Toaster position="top-right" toastOptions={{
        style: { background: "#131d2e", color: "#eaf0f6", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", fontSize: "14px" },
        success: { iconTheme: { primary: "#00e676", secondary: "#000" } },
      }} />

      {user && !user.onboardingDone && <OnboardingModal />}

      <div className="app-layout">
        <div className={`sidebar-wrapper ${!showSidebar ? "mobile-hidden" : ""}`}>
          <Sidebar onChatSelect={handleChatSelect} activeChatId={activeChatId} />
        </div>
        <div className={`chat-wrapper ${showSidebar ? "mobile-hidden" : ""}`}>
          <ChatWindow onBack={handleBack} />
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
