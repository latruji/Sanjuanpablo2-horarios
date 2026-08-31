"use client";
import { useState } from "react";

const NIVELES = ["Inicial", "Primario", "Secundario"];

export default function FormularioEvento() {
  const [tipo, setTipo] = useState("entrada_tarde");
  const [nivel, setNivel] = useState("Secundario");
  const [curso, setCurso] = useState("");
  const [fecha, setFecha] = useState("");
  const [horaSalida, setHoraSalida] = useState("");
  const [horaRegreso, setHoraRegreso] = useState("");
  const [destino, setDestino] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const esSalidaEducativa = tipo === "salida_educativa";
  const restringirNivel = !esSalidaEducativa;

  async function handleSubmit(e) {
    e.preventDefault();
    setEnviando(true);
    setResultado(null);

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo,
        nivel,
        curso,
        fecha,
        horaSalida,
        horaRegreso: esSalidaEducativa ? horaRegreso : "",
        destino: esSalidaEducativa ? destino : "",
        observaciones,
      }),
    });

    const data = await res.json();
    setEnviando(false);

    if (res.ok) {
      setResultado({ ok: true, msg: "Evento cargado y avisado a portería." });
      setCurso("");
      setFecha("");
      setHoraSalida("");
      setHoraRegreso("");
      setDestino("");
      setObservaciones("");
    } else {
      setResultado({ ok: false, msg: data.error || "Error desconocido" });
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <label>Tipo de aviso</label>
      <select
        value={tipo}
        onChange={(e) => {
          setTipo(e.target.value);
          if (e.target.value !== "salida_educativa") setNivel("Secundario");
        }}
      >
        <option value="entrada_tarde">Entrada tardía (secundario)</option>
        <option value="salida_anticipada">Salida anticipada (secundario)</option>
        <option value="salida_educativa">Salida educativa (cualquier nivel)</option>
      </select>

      <label>Nivel</label>
      <select
        value={nivel}
        onChange={(e) => setNivel(e.target.value)}
        disabled={restringirNivel}
      >
        {(restringirNivel ? ["Secundario"] : NIVELES).map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>

      <label>Curso / grado (opcional)</label>
      <input
        type="text"
        placeholder="Ej: 3º año A"
        value={curso}
        onChange={(e) => setCurso(e.target.value)}
      />

      <label>Fecha</label>
      <input
        type="date"
        required
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
      />

      <label>{esSalidaEducativa ? "Hora de salida" : "Hora"}</label>
      <input
        type="time"
        required
        value={horaSalida}
        onChange={(e) => setHoraSalida(e.target.value)}
      />

      {esSalidaEducativa && (
        <>
          <label>Hora de regreso (opcional)</label>
          <input
            type="time"
            value={horaRegreso}
            onChange={(e) => setHoraRegreso(e.target.value)}
          />

          <label>Destino</label>
          <input
            type="text"
            placeholder="Ej: Museo de Ciencias"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
          />
        </>
      )}

      <label>Observaciones (opcional)</label>
      <textarea
        value={observaciones}
        onChange={(e) => setObservaciones(e.target.value)}
      />

      <button className="primary" type="submit" disabled={enviando}>
        {enviando ? "Cargando..." : "Cargar aviso"}
      </button>

      {resultado && (
        <p className={resultado.ok ? "msg-ok" : "msg-error"}>{resultado.msg}</p>
      )}
    </form>
  );
}