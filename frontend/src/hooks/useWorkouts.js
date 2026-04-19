import { useState, useEffect } from "react";

const API = "https://workout-watcher.onrender.com";

export function useWorkouts() {
  const [workouts, setWorkouts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    fetch(`${API}/api/workouts?limit=2000`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setWorkouts(data))
      .catch((e)   => setError(e.message))
      .finally(()  => setLoading(false));
  }, []);

  return { workouts, loading, error };
}
