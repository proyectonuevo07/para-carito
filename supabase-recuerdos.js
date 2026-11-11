/* ============================================================================
   RECUERDOS DINÁMICOS CON SUPABASE
   ----------------------------------------------------------------------------
   - Lee la tabla public.recuerdos y agrega páginas al final del libro.
   - Botón secreto con contraseña para publicar desde celular o PC.
   - Sube fotos/videos al bucket público "recuerdos".
   - No modifica nada del libro: solo agrega páginas antes de la carta final.

   Configura aquí arriba si algún día cambias de proyecto.
   ========================================================================== */
(function () {
  'use strict';

  const CONFIG = {
    url: 'https://wrceuwtubsiawltruznq.supabase.co',
    key: 'sb_publishable_UH2UL7j8TklK5WSkgrxmbA_VVp23Q7w',
    tabla: 'recuerdos',
    bucket: 'recuerdos',
    // SHA-256 de la contraseña. Contraseña actual: carito2026
    claveHash: '5171260abd965c8837b2d6fb79c092a4d055aa612e74014ae878cd7855fd61a7',
    maxArchivoMB: 40
  };

  const SQL = `-- 1) Tabla de recuerdos
create table if not exists public.recuerdos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  texto text default '',
  media jsonb not null default '[]'::jsonb,
  stickers jsonb not null default '[]'::jsonb,
  fecha date default current_date,
  creado_en timestamptz not null default now()
);

alter table public.recuerdos enable row level security;

drop policy if exists "recuerdos_lectura" on public.recuerdos;
create policy "recuerdos_lectura" on public.recuerdos
  for select using (true);

drop policy if exists "recuerdos_insertar" on public.recuerdos;
create policy "recuerdos_insertar" on public.recuerdos
  for insert with check (true);

drop policy if exists "recuerdos_borrar" on public.recuerdos;
create policy "recuerdos_borrar" on public.recuerdos
  for delete using (true);

-- 2) Bucket público para las fotos y videos
insert into storage.buckets (id, name, public)
values ('recuerdos', 'recuerdos', true)
on conflict (id) do update set public = true;

drop policy if exists "recuerdos_subir" on storage.objects;
create policy "recuerdos_subir" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'recuerdos');

drop policy if exists "recuerdos_ver" on storage.objects;
create policy "recuerdos_ver" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'recuerdos');

drop policy if exists "recuerdos_eliminar" on storage.objects;
create policy "recuerdos_eliminar" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'recuerdos');`;

  const STICKERS = [
    'snoopy-corazon.png', 'snoopy-corazon-rojo.png', 'snoopy-corazon-doble.png',
    'snoopy-corazon-globos.png', 'snoopy-corazon-manos.png', 'snoopy-flores.png',
    'snoopy-ramo.png', 'snoopy-regalo.png', 'snoopy-deseo.png',
    'snoopy-camara.png', 'snoopy-fotografo.png', 'snoopy-camara-amigos.png',
    'snoopy-vinilo.png', 'snoopy-vinilo-nuevo.png', 'snoopy-audifonos.png',
    'snoopy-sax.png', 'snoopy-libro.png', 'snoopy-carta.png',
    'snoopy-gafas.png', 'snoopy-helado.png', 'snoopy-fresa.png',
    'snoopy-fresas.png', 'snoopy-gato.png', 'snoopy-baile.png',
    'snoopy-porrista.png', 'snoopy-picaro.png', 'snoopy-dino.png',
    'snoopy-tenis.png', 'snoopy-bici.png', 'snoopy-paraguas.png',
    'snoopy-estrella.png', 'snoopy-echado.png', 'snoopy-carita.png',
    'snoopy-lazo.png', 'snoopy-lazo-rosa.png', 'snoopy-telefono.png',
    'snoopy-cama-rosa.png', 'snoopy-presumido.png', 'snoopy-verguenza.png',
    'snoopy-botella.png', 'snoopy-cama.png'
  ];

  const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const ESTADO = {
    sb: null,
    filas: [],
    medios: [],
    stickers: [],
    guardando: false,
    cargando: false,
    errorCarga: null,
    overlay: null,
    passOverlay: null,
    panel: null,
    lista: null,
    status: null,
    setup: null,
    btn: null
  };

  const $ = (sel, raiz) => (raiz || document).querySelector(sel);

  function crear(tag, clase, texto) {
    const nodo = document.createElement(tag);
    if (clase) nodo.className = clase;
    if (texto != null) nodo.textContent = texto;
    return nodo;
  }

  function hoyISO() {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  function formatearFecha(iso) {
    if (!iso) return '';
    const partes = String(iso).slice(0, 10).split('-');
    if (partes.length !== 3) return '';
    const anio = Number(partes[0]);
    const mes = Number(partes[1]);
    const dia = Number(partes[2]);
    if (!anio || !mes || !dia) return '';
    return `${dia} de ${MESES[mes - 1]} de ${anio}`;
  }

  async function sha256(texto) {
    const datos = new TextEncoder().encode(texto);
    if (window.crypto && window.crypto.subtle) {
      const buffer = await window.crypto.subtle.digest('SHA-256', datos);
      return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    // Respaldo muy básico si el navegador no tiene crypto.subtle.
    let hash = 0;
    for (let i = 0; i < texto.length; i += 1) {
      hash = ((hash << 5) - hash) + texto.charCodeAt(i);
      hash |= 0;
    }
    return 'simple:' + hash;
  }

  /* ------------------------------ estilos ------------------------------- */

  function inyectarEstilos() {
    if (document.getElementById('rc-estilos')) return;
    const estilo = document.createElement('style');
    estilo.id = 'rc-estilos';
    estilo.textContent = `
      :root {
        --rc-verde: #1db954;
        --rc-verde-claro: #6ff2a2;
        --rc-tinta: #07130a;
      }

      .rc-admin-btn {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 10060;
        display: grid;
        width: 48px;
        height: 48px;
        place-items: center;
        border: 1px solid rgba(255, 255, 255, 0.28);
        border-radius: 50%;
        background: linear-gradient(160deg, rgba(28, 70, 46, 0.94), rgba(7, 22, 14, 0.96));
        box-shadow: 0 14px 34px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.22);
        color: #d9ffe7;
        cursor: pointer;
        font-size: 21px;
        line-height: 1;
        opacity: 0.5;
        transition: opacity 0.22s ease, transform 0.22s ease;
        -webkit-backdrop-filter: blur(14px) saturate(1.3);
        backdrop-filter: blur(14px) saturate(1.3);
      }
      .rc-admin-btn:hover,
      .rc-admin-btn:focus-visible { opacity: 1; transform: translateY(-2px) scale(1.05); }
      .rc-admin-btn[hidden] { display: none; }

      .rc-overlay {
        position: fixed;
        inset: 0;
        z-index: 10080;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        background:
          radial-gradient(120% 120% at 18% 0%, rgba(23, 78, 49, 0.5), rgba(5, 12, 8, 0.86) 58%, rgba(0, 0, 0, 0.94));
        opacity: 0;
        pointer-events: none;
        visibility: hidden;
        transition: opacity 0.25s ease, visibility 0.25s ease;
        -webkit-backdrop-filter: blur(18px) saturate(1.2);
        backdrop-filter: blur(18px) saturate(1.2);
      }
      .rc-overlay.open { opacity: 1; pointer-events: auto; visibility: visible; }

      .rc-panel {
        position: relative;
        display: flex;
        width: min(720px, 100%);
        max-height: min(90vh, 940px);
        flex-direction: column;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.22);
        border-radius: 26px;
        background: linear-gradient(155deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.05) 42%, rgba(255, 255, 255, 0.09));
        box-shadow: 0 45px 130px rgba(0, 0, 0, 0.62), inset 0 1px 0 rgba(255, 255, 255, 0.32);
        color: #fff8f4;
        transform: translateY(16px) scale(0.98);
        transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
        -webkit-backdrop-filter: blur(30px) saturate(1.4);
        backdrop-filter: blur(30px) saturate(1.4);
      }
      .rc-overlay.open .rc-panel { transform: none; }
      .rc-panel-sm { width: min(420px, 100%); }

      .rc-head {
        display: flex;
        flex: none;
        align-items: center;
        gap: 14px;
        padding: 20px 22px 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      }
      .rc-eyebrow {
        display: block;
        margin-bottom: 4px;
        color: var(--rc-verde-claro);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.24em;
        text-transform: uppercase;
      }
      .rc-title {
        margin: 0;
        font-family: 'Permanent Marker', 'Caveat', cursive;
        font-size: clamp(23px, 4vw, 30px);
        font-weight: 400;
        letter-spacing: 0.01em;
      }
      .rc-close {
        display: grid;
        width: 38px;
        height: 38px;
        margin-left: auto;
        place-items: center;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.08);
        color: inherit;
        cursor: pointer;
        font-size: 16px;
        transition: background 0.2s ease, transform 0.2s ease;
      }
      .rc-close:hover { background: rgba(255, 255, 255, 0.18); transform: rotate(90deg); }

      .rc-body {
        display: flex;
        min-height: 0;
        flex: 1;
        flex-direction: column;
        gap: 16px;
        padding: 18px 22px;
        overflow-y: auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
      }

      .rc-field { display: flex; flex-direction: column; gap: 7px; }
      .rc-label {
        color: rgba(255, 255, 255, 0.78);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.13em;
        text-transform: uppercase;
      }

      .rc-input {
        width: 100%;
        padding: 12px 14px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 14px;
        outline: none;
        background: rgba(3, 10, 6, 0.42);
        color: #fff;
        font: inherit;
        font-size: 15px;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }
      .rc-input::placeholder { color: rgba(255, 255, 255, 0.38); }
      .rc-input:focus {
        border-color: rgba(111, 242, 162, 0.65);
        box-shadow: 0 0 0 3px rgba(29, 185, 84, 0.18);
      }
      .rc-input:disabled { opacity: 0.4; }
      .rc-textarea { min-height: 86px; resize: vertical; line-height: 1.45; }
      input[type="date"].rc-input { color-scheme: dark; }

      .rc-row { display: flex; gap: 12px; }
      .rc-row > * { flex: 1; }

      .rc-media-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }
      .rc-slot {
        position: relative;
        display: flex;
        min-width: 0;
        flex-direction: column;
        gap: 6px;
      }
      .rc-slot-pick {
        display: flex;
        aspect-ratio: 1 / 1;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        border: 1px dashed rgba(255, 255, 255, 0.32);
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.72);
        cursor: pointer;
        font: inherit;
        transition: border-color 0.2s ease, background 0.2s ease;
      }
      .rc-slot-pick:hover { border-color: var(--rc-verde-claro); background: rgba(29, 185, 84, 0.1); }
      .rc-slot-plus { font-size: 24px; line-height: 1; }
      .rc-slot-txt { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; }
      .rc-slot-preview {
        position: relative;
        display: flex;
        aspect-ratio: 1 / 1;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 16px;
        background: rgba(0, 0, 0, 0.34);
      }
      .rc-slot-preview img,
      .rc-slot-preview video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .rc-slot-quitar {
        position: absolute;
        top: 6px;
        right: 6px;
        display: grid;
        width: 26px;
        height: 26px;
        place-items: center;
        border: 0;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.72);
        color: #fff;
        cursor: pointer;
        font-size: 12px;
      }
      .rc-slot-texto { padding: 8px 10px; border-radius: 10px; font-size: 12px; }

      .rc-chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .rc-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 10px;
        border: 1px solid rgba(111, 242, 162, 0.35);
        border-radius: 999px;
        background: rgba(29, 185, 84, 0.16);
        color: #d9ffe7;
        cursor: pointer;
        font-size: 12px;
      }
      .rc-chip b { font-weight: 700; }
      .rc-chip:hover { background: rgba(29, 185, 84, 0.3); }

      .rc-sticker-grid {
        display: grid;
        max-height: 138px;
        grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
        gap: 6px;
        padding: 8px;
        overflow-y: auto;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 14px;
        background: rgba(0, 0, 0, 0.22);
      }
      .rc-sticker-btn {
        display: grid;
        aspect-ratio: 1 / 1;
        place-items: center;
        border: 1px solid transparent;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.06);
        cursor: pointer;
        padding: 3px;
        transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
      }
      .rc-sticker-btn:hover { border-color: rgba(111, 242, 162, 0.55); transform: scale(1.06); }
      .rc-sticker-btn img { width: 100%; height: 100%; object-fit: contain; }

      .rc-list { display: flex; flex-direction: column; gap: 8px; }
      .rc-list-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.05);
      }
      .rc-list-info { min-width: 0; flex: 1; }
      .rc-list-titulo {
        overflow: hidden;
        font-size: 14px;
        font-weight: 700;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .rc-list-meta { color: rgba(255, 255, 255, 0.55); font-size: 11px; }
      .rc-list-borrar {
        flex: none;
        padding: 7px 11px;
        border: 1px solid rgba(255, 120, 120, 0.4);
        border-radius: 10px;
        background: rgba(255, 70, 70, 0.12);
        color: #ffc9c9;
        cursor: pointer;
        font: inherit;
        font-size: 11px;
      }
      .rc-list-borrar:hover { background: rgba(255, 70, 70, 0.28); }
      .rc-list-vacio { color: rgba(255, 255, 255, 0.5); font-size: 13px; }

      .rc-foot {
        display: flex;
        flex: none;
        align-items: center;
        gap: 14px;
        padding: 14px 22px 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.12);
      }
      .rc-status {
        min-width: 0;
        flex: 1;
        color: rgba(255, 255, 255, 0.66);
        font-size: 12px;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }
      .rc-status.error { color: #ffb3b3; }
      .rc-status.ok { color: #9dffbe; }
      .rc-save {
        flex: none;
        padding: 13px 22px;
        border: 1px solid rgba(255, 255, 255, 0.24);
        border-radius: 999px;
        background: linear-gradient(145deg, #2ee06a, #14a544);
        box-shadow: 0 10px 26px rgba(20, 165, 68, 0.35);
        color: #04150a;
        cursor: pointer;
        font: inherit;
        font-size: 14px;
        font-weight: 800;
        letter-spacing: 0.02em;
        transition: transform 0.18s ease, filter 0.18s ease;
      }
      .rc-save:hover { filter: brightness(1.07); transform: translateY(-1px); }
      .rc-save:disabled { cursor: wait; filter: grayscale(0.4); opacity: 0.7; transform: none; }

      .rc-hint { margin: 0 0 4px; color: rgba(255, 255, 255, 0.7); font-size: 13px; line-height: 1.5; }
      .rc-error { margin: 0; color: #ffb3b3; font-size: 12px; }
      .rc-setup {
        padding: 12px 14px;
        border: 1px solid rgba(255, 200, 120, 0.35);
        border-radius: 14px;
        background: rgba(255, 180, 80, 0.1);
        color: #ffe6bd;
        font-size: 12px;
        line-height: 1.5;
      }
      .rc-setup p { margin: 0 0 8px; }
      .rc-setup pre {
        max-height: 190px;
        margin: 8px 0;
        padding: 10px;
        overflow: auto;
        border-radius: 10px;
        background: rgba(0, 0, 0, 0.45);
        color: #d9ffe7;
        font-family: ui-monospace, Consolas, monospace;
        font-size: 11px;
        line-height: 1.45;
        white-space: pre;
      }
      .rc-setup button {
        padding: 7px 12px;
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.1);
        color: inherit;
        cursor: pointer;
        font: inherit;
        font-size: 11px;
      }

      .rc-toast {
        position: fixed;
        left: 50%;
        bottom: 92px;
        z-index: 10100;
        max-width: min(90vw, 460px);
        padding: 12px 18px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 999px;
        background: rgba(8, 24, 15, 0.94);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
        color: #eafff1;
        font-size: 13px;
        opacity: 0;
        text-align: center;
        transform: translate(-50%, 12px);
        transition: opacity 0.25s ease, transform 0.25s ease;
      }
      .rc-toast.show { opacity: 1; transform: translate(-50%, 0); }
      .rc-toast.error { border-color: rgba(255, 120, 120, 0.45); color: #ffd1d1; }

      /* ---------------- páginas dinámicas dentro del libro ---------------- */
      .hoja-dinamica { overflow: visible; }
      .hoja-dinamica .dyn-page {
        justify-content: center;
        gap: 14px;
        padding-bottom: 26px;
      }
      .dyn-titulo { transform: rotate(-1.4deg); }
      .dyn-texto {
        max-width: 96%;
        max-height: 60%;
        margin: 4px auto;
        overflow-y: auto;
        font-size: clamp(15px, 2vw, 21px);
        line-height: 1.32;
        overscroll-behavior: contain;
        white-space: pre-wrap;
        -webkit-overflow-scrolling: touch;
      }
      .dyn-fecha {
        position: absolute;
        right: 6%;
        bottom: 8px;
        left: 6%;
        margin: 0;
        color: #8b4513;
        font-family: 'Special Elite', 'Courier New', monospace;
        font-size: clamp(10px, 1.4vw, 13px);
        letter-spacing: 0.08em;
        text-align: center;
        text-transform: uppercase;
      }
      .dyn-media {
        display: flex;
        width: 100%;
        height: 100%;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
      }
      .dyn-foto-wrap {
        position: relative;
        width: 100%;
        min-height: 0;
        flex: 1;
      }
      .dyn-foto {
        display: flex;
        width: 100%;
        height: 100%;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        padding: 6px 6px 9px;
        border: 0;
        background: #fff;
        box-shadow: 3px 4px 12px rgba(0, 0, 0, 0.26);
        cursor: pointer;
        transform: rotate(-1.6deg);
        transition: transform 0.2s ease;
      }
      .dyn-foto-wrap:nth-child(2n) .dyn-foto { transform: rotate(1.8deg); }
      .dyn-foto-wrap:nth-child(3n) .dyn-foto { transform: rotate(-0.6deg); }
      .dyn-foto:hover { transform: scale(1.02) rotate(0deg); }
      .dyn-foto img,
      .dyn-foto video {
        width: 100%;
        min-height: 0;
        flex: 1;
        border: 1px solid #f0e6d8;
        object-fit: cover;
      }
      .dyn-foto-pie {
        display: block;
        max-width: 100%;
        overflow: hidden;
        color: #333;
        font-family: 'Caveat', cursive;
        font-size: clamp(12px, 1.7vw, 18px);
        line-height: 1.1;
        text-align: center;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .dyn-foto-abrir {
        position: absolute;
        top: 4px;
        right: 4px;
        display: grid;
        width: 24px;
        height: 24px;
        place-items: center;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.6);
        color: #fff;
        font-size: 12px;
        text-decoration: none;
      }
      .dyn-foto-abrir:hover { background: rgba(0, 0, 0, 0.82); }
      .dyn-vacio {
        margin: auto;
        padding: 18px;
        color: #8b4513;
        font-family: 'Caveat', cursive;
        font-size: 20px;
        text-align: center;
      }
      .dyn-sticker {
        position: absolute;
        z-index: 6;
        width: clamp(32px, 5.4vw, 54px);
        height: auto;
        filter: drop-shadow(2px 3px 4px rgba(0, 0, 0, 0.28));
        pointer-events: none;
        user-select: none;
      }

      @media (max-width: 560px) {
        .rc-admin-btn { right: 12px; bottom: 96px; }
        .rc-overlay { padding: 8px; }
        .rc-panel { max-height: 94vh; border-radius: 20px; }
        .rc-body { padding: 14px 16px; }
        .rc-head { padding: 16px 16px 10px; }
        .rc-foot { padding: 12px 16px 16px; }
        .rc-save { width: 100%; }
        .rc-foot { flex-wrap: wrap; }
        .rc-status { flex-basis: 100%; }
        .rc-media-grid { gap: 7px; }
        .rc-slot-texto { font-size: 11px; }
      }
    `;
    document.head.append(estilo);
  }

  /* ------------------------------ avisos -------------------------------- */

  function toast(texto, tipo) {
    const aviso = crear('div', 'rc-toast' + (tipo === 'error' ? ' error' : ''), texto);
    document.body.append(aviso);
    requestAnimationFrame(() => aviso.classList.add('show'));
    window.setTimeout(() => {
      aviso.classList.remove('show');
      window.setTimeout(() => aviso.remove(), 320);
    }, 3400);
  }

  function ponerEstado(texto, tipo) {
    if (!ESTADO.status) return;
    ESTADO.status.textContent = texto || '';
    ESTADO.status.classList.toggle('error', tipo === 'error');
    ESTADO.status.classList.toggle('ok', tipo === 'ok');
  }

  /* --------------------------- conexión y datos ------------------------- */

  function conectar() {
    if (ESTADO.sb) return true;
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      ESTADO.sb = window.supabase.createClient(CONFIG.url, CONFIG.key, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      return true;
    }
    return false;
  }

  async function cargar() {
    if (!conectar()) {
      ESTADO.errorCarga = 'No se pudo cargar la librería de Supabase. Revisa tu conexión a internet.';
      return;
    }
    ESTADO.cargando = true;
    ESTADO.errorCarga = null;
    pintarLista();
    try {
      const respuesta = await ESTADO.sb
        .from(CONFIG.tabla)
        .select('*')
        .order('fecha', { ascending: true })
        .order('creado_en', { ascending: true });
      if (respuesta.error) throw respuesta.error;
      ESTADO.filas = Array.isArray(respuesta.data) ? respuesta.data : [];
      aplicarAlLibro();
      if (ESTADO.panel && ESTADO.panel.classList.contains('open')) {
        ponerEstado(ESTADO.filas.length
          ? `${ESTADO.filas.length} recuerdo${ESTADO.filas.length === 1 ? '' : 's'} publicado${ESTADO.filas.length === 1 ? '' : 's'}.`
          : '', 'ok');
      }
    } catch (error) {
      ESTADO.errorCarga = error && error.message ? error.message : 'No se pudieron cargar los recuerdos.';
      ESTADO.filas = [];
      if (ESTADO.panel && ESTADO.panel.classList.contains('open')) mostrarErrorCarga();
    } finally {
      ESTADO.cargando = false;
      pintarLista();
    }
  }

  function aplicarAlLibro() {
    try {
      if (typeof albumSpreads === 'undefined' || !Array.isArray(albumSpreads)) return;
      const base = albumSpreads.filter((spread) => spread.type !== 'dinamico');
      const dinamicos = ESTADO.filas.map((fila) => ({ type: 'dinamico', recuerdo: fila }));
      if (!dinamicos.length) {
        albumSpreads = base;
      } else {
        const posicionFinal = base.findIndex((spread) => spread.isFinal);
        if (posicionFinal >= 0) {
          albumSpreads = [...base.slice(0, posicionFinal), ...dinamicos, ...base.slice(posicionFinal)];
        } else {
          albumSpreads = [...base, ...dinamicos];
        }
      }

      const estabaEn = typeof idx === 'number' ? idx : 0;
      if (typeof cancelarFlip === 'function') cancelarFlip();
      if (typeof renderAlbum === 'function') {
        renderAlbum();
        if (estabaEn > 0 && typeof mostrarSpread === 'function') {
          mostrarSpread(Math.min(estabaEn, albumSpreads.length - 1));
        }
      }
    } catch (error) {
      console.warn('[Supabase] No se pudieron insertar las páginas:', error);
    }
  }

  /* ------------------------- páginas del libro -------------------------- */

  const POSICIONES_STICKER = [
    { left: '-1%', top: '-1%', giro: -11 },
    { right: '-1%', top: '-1%', giro: 10 },
    { left: '-1%', bottom: '-1%', giro: 7 },
    { right: '-1%', bottom: '-1%', giro: -8 }
  ];

  function pegarStickersDinamicos(hoja, nombres, posiciones) {
    nombres.slice(0, 2).forEach((nombre, i) => {
      const imagen = new Image();
      imagen.src = 'stickers/' + nombre;
      imagen.alt = '';
      imagen.className = 'dyn-sticker';
      const posicion = POSICIONES_STICKER[posiciones[i] % POSICIONES_STICKER.length];
      if (posicion.left) imagen.style.left = posicion.left;
      if (posicion.right) imagen.style.right = posicion.right;
      if (posicion.top) imagen.style.top = posicion.top;
      if (posicion.bottom) imagen.style.bottom = posicion.bottom;
      imagen.style.transform = `rotate(${posicion.giro}deg)`;
      imagen.addEventListener('error', () => imagen.remove(), { once: true });
      hoja.append(imagen);
    });
  }

  function crearFotoDinamica(media, indice) {
    const contenedor = crear('div', 'dyn-foto-wrap');
    const boton = crear('button', 'dyn-foto');
    boton.type = 'button';
    boton.setAttribute('aria-label', media.texto
      ? `Abrir recuerdo: ${media.texto}`
      : `Abrir recuerdo ${indice + 1}`);

    if (media.tipo === 'video') {
      const video = document.createElement('video');
      video.src = media.url;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.setAttribute('muted', '');
      boton.append(video);
    } else {
      const imagen = document.createElement('img');
      imagen.src = media.url;
      imagen.alt = media.texto || `Recuerdo ${indice + 1}`;
      imagen.loading = 'lazy';
      imagen.decoding = 'async';
      boton.append(imagen);
    }

    if (media.texto) {
      boton.append(crear('span', 'dyn-foto-pie', media.texto));
    }

    boton.addEventListener('click', () => {
      if (typeof expandMedia === 'function') {
        expandMedia(media.url, media.tipo || 'image', '', media.texto || '');
      } else {
        window.open(media.url, '_blank', 'noopener');
      }
    });

    const abrir = document.createElement('a');
    abrir.className = 'dyn-foto-abrir';
    abrir.href = media.url;
    abrir.target = '_blank';
    abrir.rel = 'noopener';
    abrir.textContent = '↗';
    abrir.setAttribute('aria-label', 'Abrir la foto completa en otra pestaña');
    abrir.addEventListener('click', (evento) => evento.stopPropagation());

    contenedor.append(boton, abrir);
    return contenedor;
  }

  function pintarSpreadDinamico(spread) {
    const recuerdo = spread.recuerdo || {};
    const izquierda = crear('div', 'hoja izq hoja-dinamica');
    const derecha = crear('div', 'hoja der hoja-dinamica');

    const pagina = crear('div', 'page-container-3 dyn-page');
    pagina.append(crear('div', 'page-kicker', 'Recuerdo nuevo'));
    pagina.append(crear('div', 'page-title dyn-titulo', recuerdo.titulo || 'Nuestro recuerdo'));

    if (recuerdo.texto) {
      const texto = crear('div', 'scrap-text dyn-texto', String(recuerdo.texto));
      const largo = String(recuerdo.texto).length;
      if (largo > 700) texto.style.fontSize = 'clamp(11px, 1.35vw, 15px)';
      else if (largo > 340) texto.style.fontSize = 'clamp(13px, 1.65vw, 18px)';
      pagina.append(texto);
    }

    const fecha = formatearFecha(recuerdo.fecha);
    if (fecha) pagina.append(crear('div', 'dyn-fecha', fecha));
    izquierda.append(pagina);

    const media = Array.isArray(recuerdo.media) ? recuerdo.media.filter((m) => m && m.url).slice(0, 3) : [];
    if (media.length) {
      const contenedor = crear('div', 'dyn-media dyn-media-' + media.length);
      media.forEach((elemento, indice) => contenedor.append(crearFotoDinamica(elemento, indice)));
      derecha.append(contenedor);
    } else {
      derecha.append(crear('div', 'dyn-vacio', 'Esta página es solo texto 💌'));
    }

    const stickers = Array.isArray(recuerdo.stickers) ? recuerdo.stickers.filter(Boolean).slice(0, 4) : [];
    if (stickers.length) {
      pegarStickersDinamicos(izquierda, stickers.filter((_, i) => i % 2 === 0), [0, 2]);
      pegarStickersDinamicos(derecha, stickers.filter((_, i) => i % 2 === 1), [1, 3]);
    }

    return [izquierda, derecha];
  }

  window.pintarSpreadDinamico = pintarSpreadDinamico;
  window.recargarRecuerdosSupabase = cargar;

  /* --------------------------- panel de admin --------------------------- */

  function crearBotonAdmin() {
    const boton = crear('button', 'rc-admin-btn', '✎');
    boton.type = 'button';
    boton.hidden = true;
    boton.title = 'Agregar un recuerdo';
    boton.setAttribute('aria-label', 'Agregar un recuerdo al libro');
    boton.addEventListener('click', solicitarAcceso);
    document.body.append(boton);
    ESTADO.btn = boton;

    const libro = document.getElementById('vista-libro');
    if (libro && window.MutationObserver) {
      const actualizar = () => { boton.hidden = !libro.classList.contains('visible'); };
      new MutationObserver(actualizar).observe(libro, { attributes: true, attributeFilter: ['class'] });
      actualizar();
    } else {
      boton.hidden = false;
    }

    document.addEventListener('keydown', (evento) => {
      if (evento.ctrlKey && evento.shiftKey && evento.key.toLowerCase() === 'a') {
        evento.preventDefault();
        solicitarAcceso();
      }
    });
  }

  function crearOverlayPassword() {
    const overlay = crear('div', 'rc-overlay rc-pass');
    overlay.innerHTML = `
      <div class="rc-panel rc-panel-sm" role="dialog" aria-modal="true" aria-labelledby="rc-pass-title">
        <div class="rc-head">
          <div>
            <span class="rc-eyebrow">Acceso privado</span>
            <h2 class="rc-title" id="rc-pass-title">Solo para Carito</h2>
          </div>
          <button type="button" class="rc-close" data-rc="pass-cerrar" aria-label="Cerrar">✕</button>
        </div>
        <div class="rc-body">
          <p class="rc-hint">Escribe la contraseña para agregar fotos y páginas nuevas al libro.</p>
          <input class="rc-input" type="password" data-rc="pass-input" autocomplete="current-password" placeholder="Contraseña">
          <p class="rc-error" data-rc="pass-error" hidden>Contraseña incorrecta. Inténtalo otra vez.</p>
        </div>
        <div class="rc-foot">
          <span class="rc-status"></span>
          <button type="button" class="rc-save" data-rc="pass-entrar">Entrar</button>
        </div>
      </div>
    `;
    document.body.append(overlay);
    ESTADO.passOverlay = overlay;

    const input = $('[data-rc="pass-input"]', overlay);
    const error = $('[data-rc="pass-error"]', overlay);
    const entrar = $('[data-rc="pass-entrar"]', overlay);
    const cerrar = $('[data-rc="pass-cerrar"]', overlay);

    const intentar = async () => {
      const valor = input.value.trim();
      if (!valor) { input.focus(); return; }
      entrar.disabled = true;
      const hash = await sha256(valor);
      entrar.disabled = false;
      if (hash === CONFIG.claveHash) {
        sessionStorage.setItem('rc-admin', '1');
        error.hidden = true;
        input.value = '';
        cerrarOverlay(overlay);
        abrirPanel();
      } else {
        error.hidden = false;
        input.select();
      }
    };

    entrar.addEventListener('click', intentar);
    input.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter') { evento.preventDefault(); intentar(); }
    });
    cerrar.addEventListener('click', () => cerrarOverlay(overlay));
    overlay.addEventListener('click', (evento) => {
      if (evento.target === overlay) cerrarOverlay(overlay);
    });
  }

  function abrirOverlay(overlay) {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function cerrarOverlay(overlay) {
    overlay.classList.remove('open');
    if (!document.querySelector('.rc-overlay.open')) {
      document.body.style.overflow = '';
    }
  }

  function solicitarAcceso() {
    if (!ESTADO.passOverlay) return;
    if (sessionStorage.getItem('rc-admin') === '1') {
      abrirPanel();
      return;
    }
    abrirOverlay(ESTADO.passOverlay);
    const input = $('[data-rc="pass-input"]', ESTADO.passOverlay);
    const error = $('[data-rc="pass-error"]', ESTADO.passOverlay);
    if (error) error.hidden = true;
    if (input) {
      input.value = '';
      window.setTimeout(() => input.focus(), 120);
    }
  }

  function crearPanel() {
    const overlay = crear('div', 'rc-overlay rc-admin');
    overlay.innerHTML = `
      <div class="rc-panel" role="dialog" aria-modal="true" aria-labelledby="rc-title">
        <div class="rc-head">
          <div>
            <span class="rc-eyebrow">Supabase · recuerdos</span>
            <h2 class="rc-title" id="rc-title">Agregar recuerdo</h2>
          </div>
          <button type="button" class="rc-close" data-rc="cerrar" aria-label="Cerrar">✕</button>
        </div>
        <div class="rc-body">
          <div class="rc-setup" data-rc="setup" hidden></div>
          <label class="rc-field">
            <span class="rc-label">Título de la página</span>
            <input class="rc-input" data-rc="titulo" maxlength="90" placeholder="Ej. Nuestro primer viaje">
          </label>
          <div class="rc-row">
            <label class="rc-field">
              <span class="rc-label">Fecha</span>
              <input class="rc-input" type="date" data-rc="fecha">
            </label>
          </div>
          <label class="rc-field">
            <span class="rc-label">Texto de la página</span>
            <textarea class="rc-input rc-textarea" data-rc="texto" rows="3" maxlength="1500" placeholder="Escribe lo que quieras recordar..."></textarea>
          </label>
          <div class="rc-field">
            <span class="rc-label">Fotos o videos (hasta 3)</span>
            <div class="rc-media-grid" data-rc="media"></div>
          </div>
          <div class="rc-field">
            <span class="rc-label">Stickers (hasta 4, puedes repetir)</span>
            <div class="rc-chips" data-rc="chips"></div>
            <div class="rc-sticker-grid" data-rc="stickers"></div>
          </div>
          <div class="rc-field">
            <span class="rc-label">Recuerdos publicados</span>
            <div class="rc-list" data-rc="lista"></div>
          </div>
        </div>
        <div class="rc-foot">
          <span class="rc-status" data-rc="status"></span>
          <button type="button" class="rc-save" data-rc="guardar">Publicar recuerdo</button>
        </div>
      </div>
    `;
    document.body.append(overlay);
    ESTADO.overlay = overlay;
    ESTADO.panel = overlay;
    ESTADO.lista = $('[data-rc="lista"]', overlay);
    ESTADO.status = $('[data-rc="status"]', overlay);
    ESTADO.setup = $('[data-rc="setup"]', overlay);

    $('[data-rc="cerrar"]', overlay).addEventListener('click', () => cerrarOverlay(overlay));
    overlay.addEventListener('click', (evento) => {
      if (evento.target === overlay) cerrarOverlay(overlay);
    });
    $('[data-rc="guardar"]', overlay).addEventListener('click', guardar);

    construirSlots(overlay);
    construirStickers(overlay);
    pintarChips();
    if (ESTADO.filas.length) pintarLista();
  }

  function construirSlots(overlay) {
    const contenedor = $('[data-rc="media"]', overlay);
    ESTADO.medios = [];
    for (let i = 0; i < 3; i += 1) {
      const slot = crear('div', 'rc-slot');
      slot.innerHTML = `
        <button type="button" class="rc-slot-pick"><span class="rc-slot-plus">＋</span><span class="rc-slot-txt">Foto o video</span></button>
        <input type="file" accept="image/*,video/*" hidden>
        <div class="rc-slot-preview" hidden></div>
        <input type="text" class="rc-input rc-slot-texto" placeholder="Texto de esta foto (opcional)" maxlength="220" disabled>
        <button type="button" class="rc-slot-quitar" hidden aria-label="Quitar archivo">✕</button>
      `;
      const entrada = $('input[type="file"]', slot);
      const elegir = $('.rc-slot-pick', slot);
      const preview = $('.rc-slot-preview', slot);
      const texto = $('.rc-slot-texto', slot);
      const quitar = $('.rc-slot-quitar', slot);
      const medio = { file: null, texto: '', previewUrl: null, slot };

      elegir.addEventListener('click', () => entrada.click());
      entrada.addEventListener('change', () => {
        const archivo = entrada.files && entrada.files[0];
        if (!archivo) return;
        if (archivo.size > CONFIG.maxArchivoMB * 1024 * 1024) {
          toast(`El archivo pesa más de ${CONFIG.maxArchivoMB} MB. Elige uno más pequeño.`, 'error');
          entrada.value = '';
          return;
        }
        if (medio.previewUrl) URL.revokeObjectURL(medio.previewUrl);
        medio.file = archivo;
        medio.previewUrl = URL.createObjectURL(archivo);
        texto.disabled = false;

        preview.replaceChildren();
        if (archivo.type.startsWith('video/')) {
          const video = document.createElement('video');
          video.src = medio.previewUrl;
          video.muted = true;
          video.playsInline = true;
          video.preload = 'metadata';
          preview.append(video);
        } else {
          const imagen = document.createElement('img');
          imagen.src = medio.previewUrl;
          imagen.alt = 'Vista previa';
          preview.append(imagen);
        }
        preview.hidden = false;
        elegir.hidden = true;
        quitar.hidden = false;
      });

      texto.addEventListener('input', () => { medio.texto = texto.value; });

      quitar.addEventListener('click', () => {
        if (medio.previewUrl) URL.revokeObjectURL(medio.previewUrl);
        medio.file = null;
        medio.texto = '';
        medio.previewUrl = null;
        entrada.value = '';
        texto.value = '';
        texto.disabled = true;
        preview.replaceChildren();
        preview.hidden = true;
        elegir.hidden = false;
        quitar.hidden = true;
      });

      ESTADO.medios.push(medio);
      contenedor.append(slot);
    }
  }

  function construirStickers(overlay) {
    const contenedor = $('[data-rc="stickers"]', overlay);
    contenedor.replaceChildren();
    STICKERS.forEach((nombre) => {
      const boton = crear('button', 'rc-sticker-btn');
      boton.type = 'button';
      boton.title = 'Agregar sticker';
      const imagen = document.createElement('img');
      imagen.src = 'stickers/' + nombre;
      imagen.alt = '';
      imagen.loading = 'lazy';
      boton.append(imagen);
      boton.addEventListener('click', () => {
        if (ESTADO.stickers.length >= 4) {
          toast('Máximo 4 stickers por página. Quita uno para cambiar.', 'error');
          return;
        }
        ESTADO.stickers.push(nombre);
        pintarChips();
      });
      contenedor.append(boton);
    });
  }

  function pintarChips() {
    if (!ESTADO.overlay) return;
    const contenedor = $('[data-rc="chips"]', ESTADO.overlay);
    contenedor.replaceChildren();
    if (!ESTADO.stickers.length) {
      contenedor.append(crear('span', 'rc-list-vacio', 'Ningún sticker elegido (opcional).'));
      return;
    }
    ESTADO.stickers.forEach((nombre, indice) => {
      const chip = crear('button', 'rc-chip');
      chip.type = 'button';
      chip.title = 'Quitar este sticker';
      const etiqueta = nombre.replace('snoopy-', '').replace('.png', '').replace(/-/g, ' ');
      chip.append(crear('b', '', etiqueta), crear('span', '', '✕'));
      chip.addEventListener('click', () => {
        ESTADO.stickers.splice(indice, 1);
        pintarChips();
      });
      contenedor.append(chip);
    });
  }

  function pintarLista() {
    if (!ESTADO.lista) return;
    ESTADO.lista.replaceChildren();
    if (ESTADO.cargando) {
      ESTADO.lista.append(crear('div', 'rc-list-vacio', 'Cargando recuerdos...'));
      return;
    }
    if (ESTADO.errorCarga) {
      ESTADO.lista.append(crear('div', 'rc-list-vacio', 'No se pudieron cargar los recuerdos.'));
      return;
    }
    if (!ESTADO.filas.length) {
      ESTADO.lista.append(crear('div', 'rc-list-vacio', 'Todavía no hay páginas nuevas.'));
      return;
    }
    ESTADO.filas.forEach((fila) => {
      const item = crear('div', 'rc-list-item');
      const info = crear('div', 'rc-list-info');
      info.append(crear('div', 'rc-list-titulo', fila.titulo || 'Sin título'));
      const fotos = Array.isArray(fila.media) ? fila.media.length : 0;
      const meta = [formatearFecha(fila.fecha), fotos ? `${fotos} archivo${fotos === 1 ? '' : 's'}` : 'solo texto']
        .filter(Boolean)
        .join(' · ');
      info.append(crear('div', 'rc-list-meta', meta));
      const borrar = crear('button', 'rc-list-borrar', 'Borrar');
      borrar.type = 'button';
      borrar.addEventListener('click', () => borrarRecuerdo(fila));
      item.append(info, borrar);
      ESTADO.lista.append(item);
    });
  }

  function mostrarErrorCarga() {
    if (!ESTADO.setup) return;
    ESTADO.setup.hidden = false;
    ESTADO.setup.replaceChildren();
    const mensaje = ESTADO.errorCarga || '';
    const faltaTabla = /schema cache|does not exist|Could not find the table|relation/i.test(mensaje);
    const parrafo = crear('p', '', faltaTabla
      ? 'Falta crear la tabla y el bucket en Supabase. Abre tu proyecto → SQL Editor → pega esto → Run. Después recarga la página.'
      : `No se pudieron cargar los recuerdos: ${mensaje}`);
    ESTADO.setup.append(parrafo);
    if (faltaTabla) {
      const bloque = crear('pre', '', SQL);
      const copiar = crear('button', '', 'Copiar SQL');
      copiar.type = 'button';
      copiar.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(SQL);
          toast('SQL copiado. Pégalo en Supabase → SQL Editor.');
        } catch {
          toast('No se pudo copiar. Selecciona el texto manualmente.', 'error');
        }
      });
      ESTADO.setup.append(bloque, copiar);
    }
  }

  function abrirPanel() {
    if (!ESTADO.panel) return;
    abrirOverlay(ESTADO.panel);
    const fecha = $('[data-rc="fecha"]', ESTADO.panel);
    if (fecha && !fecha.value) fecha.value = hoyISO();
    if (ESTADO.errorCarga) mostrarErrorCarga();
    else if (ESTADO.setup) ESTADO.setup.hidden = true;
    pintarLista();
    if (!ESTADO.cargando) cargar();
    window.setTimeout(() => {
      const titulo = $('[data-rc="titulo"]', ESTADO.panel);
      if (titulo && !titulo.value) titulo.focus();
    }, 180);
  }

  /* ------------------------------ guardar ------------------------------- */

  function cargarImagen(url) {
    return new Promise((resolver, rechazar) => {
      const imagen = new Image();
      imagen.onload = () => resolver(imagen);
      imagen.onerror = rechazar;
      imagen.src = url;
    });
  }

  async function comprimirImagen(archivo) {
    if (!archivo.type.startsWith('image/') || /gif|svg/i.test(archivo.type)) return archivo;
    let url = '';
    try {
      url = URL.createObjectURL(archivo);
      const imagen = await cargarImagen(url);
      const maximo = 1800;
      const ladoMayor = Math.max(imagen.naturalWidth, imagen.naturalHeight);
      if (ladoMayor <= maximo && archivo.size < 950 * 1024) return archivo;
      const escala = Math.min(1, maximo / ladoMayor);
      const lienzo = document.createElement('canvas');
      lienzo.width = Math.max(1, Math.round(imagen.naturalWidth * escala));
      lienzo.height = Math.max(1, Math.round(imagen.naturalHeight * escala));
      const contexto = lienzo.getContext('2d');
      if (!contexto) return archivo;
      contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
      const blob = await new Promise((resolver) => lienzo.toBlob(resolver, 'image/jpeg', 0.86));
      if (!blob) return archivo;
      const nombre = archivo.name.replace(/\.[^.]+$/, '') + '.jpg';
      return new File([blob], nombre, { type: 'image/jpeg' });
    } catch {
      return archivo;
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  }

  async function subirArchivo(archivo) {
    const limpio = (archivo.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const ruta = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${limpio}`;
    const subida = await ESTADO.sb.storage.from(CONFIG.bucket).upload(ruta, archivo, {
      cacheControl: '31536000',
      upsert: false,
      contentType: archivo.type || undefined
    });
    if (subida.error) throw subida.error;
    const publica = ESTADO.sb.storage.from(CONFIG.bucket).getPublicUrl(ruta);
    return publica.data.publicUrl;
  }

  async function guardar() {
    if (ESTADO.guardando) return;
    if (!conectar()) {
      toast('Sin conexión con Supabase.', 'error');
      ponerEstado('No se pudo conectar con Supabase. Revisa tu internet.', 'error');
      return;
    }
    const titulo = $('[data-rc="titulo"]', ESTADO.panel).value.trim();
    const texto = $('[data-rc="texto"]', ESTADO.panel).value.trim();
    const fecha = $('[data-rc="fecha"]', ESTADO.panel).value;
    if (!titulo) {
      toast('Escribe un título para la página.', 'error');
      $('[data-rc="titulo"]', ESTADO.panel).focus();
      return;
    }

    const conArchivo = ESTADO.medios.filter((medio) => medio.file);
    ESTADO.guardando = true;
    const boton = $('[data-rc="guardar"]', ESTADO.panel);
    boton.disabled = true;
    ponerEstado('Preparando archivos...');

    try {
      const media = [];
      for (let i = 0; i < conArchivo.length; i += 1) {
        const medio = conArchivo[i];
        ponerEstado(`Subiendo archivo ${i + 1} de ${conArchivo.length}...`);
        const preparado = await comprimirImagen(medio.file);
        const url = await subirArchivo(preparado);
        media.push({
          url,
          tipo: (medio.file.type || '').startsWith('video/') ? 'video' : 'image',
          texto: (medio.texto || '').trim()
        });
      }

      ponerEstado('Guardando la página...');
      const insercion = await ESTADO.sb.from(CONFIG.tabla).insert({
        titulo,
        texto,
        media,
        stickers: ESTADO.stickers.slice(0, 4),
        fecha: fecha || null
      });
      if (insercion.error) throw insercion.error;

      limpiarFormulario();
      await cargar();
      ponerEstado('¡Página publicada! Ya aparece en el libro.', 'ok');
      toast('Recuerdo publicado 💌');
    } catch (error) {
      const mensaje = error && error.message ? error.message : String(error);
      let ayuda = mensaje;
      if (/bucket/i.test(mensaje)) {
        ayuda += ' → Falta crear el bucket "recuerdos" (ejecuta el SQL).';
      } else if (/row-level security|policy/i.test(mensaje)) {
        ayuda += ' → Faltan los permisos (políticas RLS) en Supabase.';
      }
      ponerEstado(ayuda, 'error');
      toast('No se pudo publicar. Revisa el mensaje abajo.', 'error');
    } finally {
      ESTADO.guardando = false;
      boton.disabled = false;
    }
  }

  function limpiarFormulario() {
    if (!ESTADO.panel) return;
    $('[data-rc="titulo"]', ESTADO.panel).value = '';
    $('[data-rc="texto"]', ESTADO.panel).value = '';
    $('[data-rc="fecha"]', ESTADO.panel).value = hoyISO();
    ESTADO.stickers = [];
    pintarChips();
    ESTADO.medios.forEach((medio) => {
      if (medio.previewUrl) URL.revokeObjectURL(medio.previewUrl);
      medio.file = null;
      medio.texto = '';
      medio.previewUrl = null;
      const entrada = $('input[type="file"]', medio.slot);
      const elegir = $('.rc-slot-pick', medio.slot);
      const preview = $('.rc-slot-preview', medio.slot);
      const texto = $('.rc-slot-texto', medio.slot);
      const quitar = $('.rc-slot-quitar', medio.slot);
      if (entrada) entrada.value = '';
      if (texto) { texto.value = ''; texto.disabled = true; }
      if (preview) { preview.replaceChildren(); preview.hidden = true; }
      if (elegir) elegir.hidden = false;
      if (quitar) quitar.hidden = true;
    });
  }

  async function borrarRecuerdo(fila) {
    if (!conectar()) return;
    if (!window.confirm(`¿Borrar la página "${fila.titulo || 'sin título'}"?`)) return;
    try {
      const respuesta = await ESTADO.sb.from(CONFIG.tabla).delete().eq('id', fila.id);
      if (respuesta.error) throw respuesta.error;
      if (Array.isArray(fila.media)) {
        const rutas = fila.media
          .map((elemento) => {
            const url = elemento && elemento.url ? String(elemento.url) : '';
            const marca = `/object/public/${CONFIG.bucket}/`;
            const posicion = url.indexOf(marca);
            return posicion >= 0 ? decodeURIComponent(url.slice(posicion + marca.length)) : '';
          })
          .filter(Boolean);
        if (rutas.length) {
          try {
            await ESTADO.sb.storage.from(CONFIG.bucket).remove(rutas);
          } catch (errorArchivos) {
            console.warn('[Supabase] No se pudieron borrar los archivos:', errorArchivos);
          }
        }
      }
      await cargar();
      toast('Página borrada.');
    } catch (error) {
      toast('No se pudo borrar: ' + (error && error.message ? error.message : error), 'error');
    }
  }

  /* ------------------------------- inicio -------------------------------- */

  function iniciar() {
    inyectarEstilos();
    crearBotonAdmin();
    crearOverlayPassword();
    crearPanel();
    cargar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  } else {
    iniciar();
  }
})();
