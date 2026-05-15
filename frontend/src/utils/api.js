export const API = import.meta.env.VITE_API_URL || "https://workout-watcher.onrender.com";

export function authFetch(path, opts = {}) {
  const jwt = localStorage.getItem("jwt");
  return fetch(`${API}${path}`, {
    ...opts,
    headers: {
      ...opts.headers,
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
  });
}
