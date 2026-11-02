import { MessageSquare } from "lucide-react";
import streamer from "../assets/login-streamer.webp";
import logo from "../assets/chyron.svg";
import "./LoginPreview.css";

export default function LoginPreview() {
  return (
    <div className="login-preview" aria-hidden="true">
      <img
        className="login-streamer"
        src={streamer}
        alt=""
        fetchPriority="high"
      />
      <div className="login-preview-chat">
        <span className="login-preview-chat-label">
          <MessageSquare />
          Chat
        </span>
        {["violet", "green", "blue", "pink"].map((color) => (
          <div className="login-preview-message" key={color} data-color={color}>
            <i />
            <span>
              <i />
              <i />
            </span>
          </div>
        ))}
      </div>
      <div className="login-preview-summary">
        <img src={logo} alt="" width={28} height={28} />
        <div>
          <span className="login-preview-summary-label">Chat summary</span>
          <p>Chat’s debating the next boss and sharing build tips.</p>
        </div>
      </div>
    </div>
  );
}
