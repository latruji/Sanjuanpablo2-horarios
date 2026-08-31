"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import FormularioEvento from "./FormularioEvento";
import PanelPortero from "./PanelPortero";

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <div className="container">
      <div className="header">
        <img src="/logo.png" alt="Logo Instituto San Juan Pablo II" />
        <h1>Instituto San Juan Pablo II<br />Aviso de horarios</h1>
      </div>

      {status === "loading" && <p>Cargando...</p>}

      {status === "unauthenticated" && (
        <div className="card">
          <p>Ingresá con tu cuenta de Google autorizada.</p>
          <button className="google" onClick={() => signIn("google")}>
            Iniciar sesión con Google
          </button>
        </div>
      )}

      {status === "authenticated" && !session.role && (
        <div className="card">
          <p className="msg-error">
            Tu cuenta ({session.user.email}) no está autorizada para usar esta
            app. Pedí que te agreguen a la lista correspondiente.
          </p>
          <button className="google" onClick={() => signOut()}>
            Cerrar sesión
          </button>
        </div>
      )}

      {status === "authenticated" && session.role === "admin" && (
        <>
          <p>
            Hola, {session.user.name} <span className="badge">Administración</span>
          </p>
          <FormularioEvento />
          <button className="google" onClick={() => signOut()}>
            Cerrar sesión
          </button>
        </>
      )}

      {status === "authenticated" && session.role === "portero" && (
        <>
          <p>
            Hola, {session.user.name} <span className="badge">Portería</span>
          </p>
          <PanelPortero />
          <button className="google" onClick={() => signOut()}>
            Cerrar sesión
          </button>
        </>
      )}
    </div>
  );
}