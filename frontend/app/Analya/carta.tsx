"use client";

import { useEffect, useRef, useState } from "react";

const VIDEO_ID = "UsTyHACiPPk";

type Stage = "cerrada" | "abriendo" | "abierta";

export default function CartaAnalya() {
  const [stage, setStage] = useState<Stage>("cerrada");
  const [musica, setMusica] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function abrir() {
    if (stage !== "cerrada") return;
    setStage("abriendo");
    setMusica(true);
    timer.current = setTimeout(() => setStage("abierta"), 1100);
  }

  return (
    <main className="carta-page">
      {stage !== "abierta" ? (
        <div className="carta-escena">
          <button
            type="button"
            className={`carta-sobre carta-sobre--${stage}`}
            onClick={abrir}
            aria-label="Abrir la carta para Analya"
          >
            <span className="carta-papel" aria-hidden="true">
              <span className="carta-papel-corazon">❤</span>
            </span>
            <span className="carta-solapa" aria-hidden="true" />
            <span className="carta-sello" aria-hidden="true">
              ❤
            </span>
          </button>
          <p className="carta-destinataria">Para Analya</p>
          <p className="carta-instruccion">
            {stage === "abriendo" ? "Abriendo…" : "Toca la carta para abrirla 💌"}
          </p>
        </div>
      ) : (
        <article className="carta-abierta">
          <p className="ania-heart" aria-hidden="true">
            ❤
          </p>
          <h1>Hola Analya soy Josh deberíamos casarnos</h1>
          <p className="carta-firma">— Josh</p>
          <button
            type="button"
            className="carta-musica-boton"
            onClick={() => setMusica((valor) => !valor)}
            aria-pressed={musica}
          >
            {musica ? "⏸ Pausar la canción" : "▶ Reproducir la canción"}
          </button>
        </article>
      )}

      {musica ? (
        <iframe
          className="carta-audio"
          src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&loop=1&playlist=${VIDEO_ID}&rel=0`}
          title="Canción de fondo para Analya"
          allow="autoplay; encrypted-media"
          aria-hidden="true"
          tabIndex={-1}
        />
      ) : null}
    </main>
  );
}
