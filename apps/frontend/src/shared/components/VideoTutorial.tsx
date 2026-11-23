// apps/frontend/src/shared/components/VideoTutorial.tsx
//
// Botón "Ver video tutorial" que abre el video en un diálogo. La dirección se
// configura con VITE_VIDEO_TUTORIAL_URL (YouTube, Vimeo o un archivo .mp4/.webm,
// por ejemplo /video/tutorial.mp4 dentro de public/). Sin dirección no se muestra.

import { useId, useRef, useState } from 'react';

export const VIDEO_TUTORIAL_URL: string = import.meta.env.VITE_VIDEO_TUTORIAL_URL ?? '';

type Fuente = { tipo: 'iframe'; src: string } | { tipo: 'video'; src: string };

/** Convierte la dirección configurada en algo que se pueda incrustar. */
export function fuenteVideo(url: string): Fuente | null {
  const limpia = url.trim();
  if (!limpia) return null;
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(limpia)) return { tipo: 'video', src: limpia };
  const youtube = limpia.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{6,})/i);
  if (youtube) return { tipo: 'iframe', src: `https://www.youtube-nocookie.com/embed/${youtube[1]}?rel=0` };
  const vimeo = limpia.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return { tipo: 'iframe', src: `https://player.vimeo.com/video/${vimeo[1]}` };
  return /^https:\/\//i.test(limpia) ? { tipo: 'iframe', src: limpia } : null;
}

export function VideoTutorial({ url = VIDEO_TUTORIAL_URL, variante = 'tarjeta' }: { url?: string; variante?: 'tarjeta' | 'enlace' }) {
  const fuente = fuenteVideo(url);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [abierto, setAbierto] = useState(false);
  const tituloId = useId();
  if (!fuente) return null;

  function abrir() { setAbierto(true); dialogRef.current?.showModal(); }
  function cerrar() { dialogRef.current?.close(); }

  return (
    <>
      <button type="button" className={`video-tutorial-btn video-tutorial-btn--${variante}`} onClick={abrir} aria-haspopup="dialog">
        <span className="video-tutorial-play" aria-hidden="true">▶</span>
        <span className="video-tutorial-texto"><b>Ver video tutorial</b>{variante === 'tarjeta' && <small>Cómo usar la plataforma</small>}</span>
      </button>
      <dialog ref={dialogRef} className="report-dialog video-tutorial-dialog" aria-labelledby={tituloId}
        onClose={() => setAbierto(false)} onClick={e => { if (e.target === e.currentTarget) cerrar(); }}>
        <div className="video-tutorial-head">
          <h2 id={tituloId}>Video tutorial</h2>
          <button type="button" className="secondary" onClick={cerrar}>Cerrar</button>
        </div>
        {/* El reproductor solo existe con el diálogo abierto: al cerrar, el video se detiene. */}
        {abierto && <div className="video-tutorial-marco">
          {fuente.tipo === 'video'
            ? <video src={fuente.src} controls autoPlay preload="metadata" aria-label="Video tutorial de la plataforma" />
            : <iframe src={fuente.src} title="Video tutorial de la plataforma" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}
        </div>}
      </dialog>
    </>
  );
}
