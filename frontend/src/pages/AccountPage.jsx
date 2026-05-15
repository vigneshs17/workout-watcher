import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AccountPage() {
  const { user, logout } = useAuth();
  const navigate          = useNavigate();
  const [copied, setCopied] = useState(false);

  function copyToken() {
    navigator.clipboard.writeText(user.sync_token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen p-6 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Account</h1>
        <button
          onClick={() => navigate("/")}
          className="text-slate-400 text-sm hover:text-white transition-colors"
        >
          ← Dashboard
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 flex flex-col gap-5">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Email</p>
          <p className="text-white">{user?.email}</p>
        </div>

        <div>
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Status</p>
          <span className={`text-sm font-medium ${user?.is_active ? "text-emerald-400" : "text-amber-400"}`}>
            {user?.is_active ? "Active" : "Pending activation"}
          </span>
        </div>

        <div>
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Sync Token</p>
          <p className="text-xs text-slate-400 mb-2">
            Use this token in your Health Auto Export automation.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-slate-900 text-slate-300 text-xs rounded-lg px-3 py-2 font-mono truncate">
              {user?.sync_token}
            </code>
            <button
              onClick={copyToken}
              className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-2 rounded-lg transition-colors shrink-0"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-2 text-slate-500 text-sm hover:text-red-400 transition-colors text-left"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
