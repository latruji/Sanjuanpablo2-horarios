"use client";
import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PanelPortero() {
  const [estado, setEstado] = useState("verificando");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    verificarSuscripcion();
  }, []);

  async function verificarSuscripcion() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setEstado("error");
      setMsg("Este navegador no soporta notificaciones push.");
      return;
    }
    const reg = await navigator.serviceWorker.register("/sw.js");
    const sub = await reg.pushManager.getSubscription();
    setEstado(sub ? "activo" : "inactivo");
  }

  async function activarNotificaciones() {
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setMsg("No diste permiso para notificaciones.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        ),
      });

      await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });

      setEstado("activo");
      setMsg("¡Notificaciones activadas!");
    } catch (err) {
      console.error(err);
      setMsg("Error activando notificaciones: " + err.message);
    }
  }

  return (
    <div className="card">
      {estado === "verificando" && <p>Verificando...</p>}

      {estado === "activo" && (
        <p className="msg-ok">
          ✅ Notificaciones activadas. Vas a recibir un aviso cada vez que se
          cargue un cambio de horario.
        </p>
      )}

      {estado === "inactivo" && (
        <>
          <p>Activá las notificaciones para recibir avisos de horarios.</p>
          <button className="primary" onClick={activarNotificaciones}>
            Activar notificaciones
          </button>
        </>
      )}

      {estado === "error" && <p className="msg-error">{msg}</p>}
      {msg && estado !== "error" && <p className="msg-ok">{msg}</p>}

      <p style={{ fontSize: 13, color: "#666", marginTop: 16 }}>
        Los avisos también se reflejan automáticamente en tu Google Calendar.
      </p>
    </div>
  );
}