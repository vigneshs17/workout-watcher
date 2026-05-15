import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PendingPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="bg-slate-800 rounded-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-2">Account Pending Activation</h1>
        <p className="text-slate-400 text-sm mb-6">
          Hi {user?.name?.split(" ")[0] ?? "there"}, your account is waiting to be activated.
          To get access, complete payment and your dashboard will be unlocked within 24 hours.
        </p>

        <div className="bg-slate-700 rounded-lg p-4 text-left mb-6">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">How to pay</p>
          {/* TODO: replace with your actual payment instructions */}
          <p className="text-slate-200 text-sm">
            Email <span className="text-blue-400">vignesh1722@gmail.com</span> with subject
            "Workout Dashboard Access" and I'll send you payment details.
          </p>
        </div>

        <button
          onClick={() => { logout(); navigate("/login"); }}
          className="text-slate-500 text-xs hover:text-slate-300 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
