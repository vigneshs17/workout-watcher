import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { API } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [error, setError] = useState(null);

  async function handleSuccess({ credential }) {
    setError(null);
    try {
      const res = await fetch(`${API}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      if (!res.ok) throw new Error("Authentication failed");
      const { jwt } = await res.json();
      await login(jwt);
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Workout Dashboard</h1>
        <p className="text-slate-400 text-sm">Sign in to view your data</p>
      </div>

      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => setError("Google sign-in failed")}
        theme="filled_black"
        shape="pill"
        size="large"
      />

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
