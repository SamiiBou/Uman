import axios from "axios";

export async function sendNotificationPermission(granted, token) {
  try {
    await axios.post(
      `${import.meta.env.VITE_BACKEND_URL || "https://uman.onrender.com"}/api/users/notifications/permission`,
      { granted },
      {
        timeout: 10000,
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    console.log("[notif] Permission état envoyé au backend:", granted);
  } catch (err) {
    console.warn("[notif] Impossible d’envoyer l’état au backend:", err);
  }
}
