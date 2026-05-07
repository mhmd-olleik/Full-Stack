import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../../context/AuthContext";
import { IoMdChatbubbles } from "react-icons/io";
import { BsChatDotsFill, BsPeopleFill, BsImageFill, BsShieldCheck } from "react-icons/bs";
import { MdOutlineMarkChatRead } from "react-icons/md";
import { HiStatusOnline } from "react-icons/hi";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      await loginWithGoogle(credentialResponse.credential);
      toast.success("Welcome! 🎉");
    } catch (err) {
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: <BsChatDotsFill />, text: "Real-time messaging" },
    { icon: <BsPeopleFill />, text: "Group chats" },
    { icon: <BsImageFill />, text: "File & image sharing" },
    { icon: <MdOutlineMarkChatRead />, text: "Read receipts" },
    { icon: <HiStatusOnline />, text: "Online status" },
    { icon: <BsShieldCheck />, text: "Privacy first" },
  ];

  return (
    <div className="login-page">
      {/* Background orbs */}
      <div className="login-bg-orb login-bg-orb--green" />
      <div className="login-bg-orb login-bg-orb--blue" />
      <div className="login-bg-orb login-bg-orb--purple" />

      <div className="login-card">
        <div className="login-logo">
          <IoMdChatbubbles size={36} />
        </div>
        <h1>ChatApp</h1>
        <p>
          Real-time messaging, instantly.<br />
          Connect with anyone, anywhere.
        </p>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "16px" }}>
            <div className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : (
          <div className="google-btn-wrap">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => toast.error("Google login failed")}
              useOneTap
              shape="pill"
              theme="filled_black"
              size="large"
              text="continue_with"
              width="340"
            />
          </div>
        )}

        <div className="features-grid">
          {features.map((f) => (
            <div className="feature-card" key={f.text}>
              {f.icon}
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
