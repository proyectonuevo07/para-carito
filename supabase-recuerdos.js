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
    tablaReacciones: 'reacciones',
    tablaAjustes: 'ajustes',
    bucket: 'recuerdos',
    // SHA-256 de la contraseña. Contraseña actual: carito2026
    claveHash: '5171260abd965c8837b2d6fb79c092a4d055aa612e74014ae878cd7855fd61a7',
    maxArchivoMB: 40,
    firma: 'Carito',
    maxAudioSeg: 30
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

-- Columnas nuevas (no rompe nada si ya existían)
alter table public.recuerdos add column if not exists orden numeric default 0;
alter table public.recuerdos add column if not exists audio jsonb;
alter table public.recuerdos add column if not exists cancion text;
alter table public.recuerdos add column if not exists abrir_desde date;

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

drop policy if exists "recuerdos_editar" on public.recuerdos;
create policy "recuerdos_editar" on public.recuerdos
  for update using (true) with check (true);

-- 2) Reacciones: texto o audio, por foto o por página
create table if not exists public.reacciones (
  id uuid primary key default gen_random_uuid(),
  recuerdo_id uuid not null references public.recuerdos(id) on delete cascade,
  indice int not null default -1,
  media_url text,
  nombre text default 'Carito',
  texto text default '',
  audio_url text,
  audio_dur int,
  creado_en timestamptz not null default now()
);

alter table public.reacciones add column if not exists media_url text;
alter table public.reacciones add column if not exists audio_dur int;

alter table public.reacciones enable row level security;

drop policy if exists "reacciones_lectura" on public.reacciones;
create policy "reacciones_lectura" on public.reacciones
  for select using (true);

drop policy if exists "reacciones_insertar" on public.reacciones;
create policy "reacciones_insertar" on public.reacciones
  for insert with check (true);

drop policy if exists "reacciones_borrar" on public.reacciones;
create policy "reacciones_borrar" on public.reacciones
  for delete using (true);

drop policy if exists "reacciones_editar" on public.reacciones;
create policy "reacciones_editar" on public.reacciones
  for update using (true) with check (true);

-- 3) Ajustes: fechas especiales, contador, etc.
create table if not exists public.ajustes (
  clave text primary key,
  valor jsonb
);

alter table public.ajustes enable row level security;

drop policy if exists "ajustes_lectura" on public.ajustes;
create policy "ajustes_lectura" on public.ajustes
  for select using (true);

drop policy if exists "ajustes_insertar" on public.ajustes;
create policy "ajustes_insertar" on public.ajustes
  for insert with check (true);

drop policy if exists "ajustes_editar" on public.ajustes;
create policy "ajustes_editar" on public.ajustes
  for update using (true) with check (true);

drop policy if exists "ajustes_borrar" on public.ajustes;
create policy "ajustes_borrar" on public.ajustes
  for delete using (true);

-- 4) Bucket público para las fotos y videos
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

  // Fechas que no quiero olvidar. Para agregar una: copia una línea y cámbiala.
  const FECHAS = {
    inicio: '2022-11-20',
    inicioTexto: '20 de noviembre de 2022',
    eventos: [
      { mes: 12, dia: 9, icono: '🎂', titulo: 'Cumpleaños de Carito', nota: 'El día en que llegaste al mundo', desde: 2010, cumple: true },
      { mes: 2, dia: 21, icono: '🎈', titulo: 'Mi cumpleaños', nota: 'Y yo llegué para conocerte', desde: 2010, cumple: true },
      { mes: 2, dia: 14, icono: '💌', titulo: 'San Valentín', nota: 'El día de los enamorados' },
      { mes: 9, dia: 21, icono: '🌻', titulo: 'Flores amarillas', nota: 'Porque me acuerdo de ti' },
      { mes: 11, dia: 20, icono: '📸', titulo: 'Nuestra primera foto', nota: 'Donde empezó todo', desde: 2022 }
    ]
  };

  const ESTADO = {
    sb: null,
    filas: [],
    reacciones: [],
    ajustes: {},
    medios: [],
    stickers: [],
    editando: null,
    guardando: false,
    cargando: false,
    errorCarga: null,
    faltaReacciones: false,
    mensajeReacciones: '',
    overlay: null,
    passOverlay: null,
    panel: null,
    lista: null,
    status: null,
    setup: null,
    btn: null,
    hojaReacciones: null,
    grabadora: null
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

  function formatearFechaCorta(iso) {
    if (!iso) return '';
    const partes = String(iso).slice(0, 10).split('-');
    if (partes.length !== 3) return '';
    const mes = Number(partes[1]);
    if (!mes) return '';
    return `${Number(partes[2])} ${MESES[mes - 1].slice(0, 3)} ${partes[0]}`;
  }

  // Las páginas con "orden" van primero, en ese orden; las antiguas siguen por fecha.
  function ordenarFilas(filas) {
    return [...filas].sort((a, b) => {
      const oa = Number(a.orden);
      const ob = Number(b.orden);
      const tieneA = Number.isFinite(oa) && oa > 0;
      const tieneB = Number.isFinite(ob) && ob > 0;
      if (tieneA && tieneB) return oa - ob;
      if (tieneA !== tieneB) return tieneA ? -1 : 1;
      const fa = String(a.fecha || '') + String(a.creado_en || '');
      const fb = String(b.fecha || '') + String(b.creado_en || '');
      return fa.localeCompare(fb);
    });
  }

  function reaccionesDe(recuerdoId, indice, mediaUrl) {
    return ESTADO.reacciones.filter((r) => {
      if (r.recuerdo_id !== recuerdoId) return false;
      if (mediaUrl) return r.media_url ? r.media_url === mediaUrl : Number(r.indice) === Number(indice);
      return Number(r.indice) === Number(indice) && !r.media_url;
    });
  }

  function contarReacciones(recuerdoId, indice, mediaUrl) {
    return reaccionesDe(recuerdoId, indice, mediaUrl).length;
  }

  function nombreVisitante() {
    try {
      return localStorage.getItem('rc-nombre') || CONFIG.firma;
    } catch {
      return CONFIG.firma;
    }
  }

  function recordarNombre(nombre) {
    const limpio = String(nombre || '').trim().slice(0, 40);
    if (!limpio) return;
    try {
      localStorage.setItem('rc-nombre', limpio);
    } catch {
      // Si el navegador bloquea localStorage, no pasa nada.
    }
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
        display: flex;
        width: 100%;
        min-height: 0;
        flex: 1;
        flex-direction: column;
        gap: 3px;
      }
      .dyn-foto-wrap .dyn-foto { flex: 1; min-height: 0; }
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

      /* ------------------ reacciones visibles en el libro ----------------- */
      .dyn-reac-lista {
        display: flex;
        width: 100%;
        max-width: 100%;
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
        padding: 1px 3px 0;
        overflow: hidden;
      }
      .dyn-reac-lista.en-pagina { max-width: 92%; margin: 0 auto; }
      .dyn-reac-item {
        display: flex;
        max-width: 100%;
        min-height: 0;
        align-items: center;
        gap: 5px;
        overflow: hidden;
      }
      .dyn-reac-autor {
        flex: none;
        color: #a03e2c;
        font-family: 'Caveat', cursive;
        font-size: clamp(10px, 1.35vw, 14px);
        font-weight: 700;
        line-height: 1;
      }
      .dyn-reac-txt {
        overflow: hidden;
        color: #4a3728;
        font-family: 'Caveat', cursive;
        font-size: clamp(11px, 1.6vw, 17px);
        line-height: 1.05;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .dyn-reac-mas {
        padding: 0;
        border: 0;
        background: none;
        color: #a03e2c;
        cursor: pointer;
        font-family: 'Caveat', cursive;
        font-size: clamp(10px, 1.4vw, 14px);
        text-decoration: underline;
        text-decoration-style: dotted;
      }

      /* ------------------------- página de fechas ------------------------ */
      .hoja-fechas { overflow: visible; }
      .fechas-page {
        display: flex;
        height: 100%;
        flex-direction: column;
        justify-content: center;
        gap: 10px;
        padding: 6% 7% 26px;
        text-align: center;
      }
      .fechas-kicker {
        color: #b0603f;
        font-family: 'Special Elite', 'Courier New', monospace;
        font-size: clamp(9px, 1.1vw, 12px);
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }
      .fechas-titulo {
        margin: 0;
        color: #2f1b12;
        font-family: 'Caveat', cursive;
        font-size: clamp(24px, 3.6vw, 40px);
        line-height: 1;
        transform: rotate(-1.2deg);
      }
      .fechas-contador {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        margin: 4px 0 0;
      }
      .fechas-numero {
        color: #b23a48;
        font-family: 'Caveat', cursive;
        font-size: clamp(52px, 11vw, 92px);
        font-weight: 700;
        line-height: 0.9;
        text-shadow: 2px 3px 0 rgba(178, 58, 72, 0.14);
      }
      .fechas-numero-label {
        color: #6d4c41;
        font-family: 'Special Elite', 'Courier New', monospace;
        font-size: clamp(10px, 1.3vw, 13px);
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .fechas-desglose {
        margin: 2px auto 0;
        color: #8b4513;
        font-family: 'Caveat', cursive;
        font-size: clamp(16px, 2.2vw, 24px);
      }
      .fechas-nota {
        max-width: 88%;
        margin: 2px auto 0;
        color: #5d4037;
        font-family: 'Caveat', cursive;
        font-size: clamp(14px, 1.9vw, 20px);
        line-height: 1.15;
      }
      .fechas-firma {
        margin-top: auto;
        padding-top: 6px;
        color: #a03e2c;
        font-family: 'Caveat', cursive;
        font-size: clamp(16px, 2.2vw, 26px);
        transform: rotate(-2deg);
      }
      .fechas-lista {
        display: flex;
        width: 100%;
        flex-direction: column;
        gap: 7px;
        margin: 2px 0 0;
        padding: 0;
        list-style: none;
      }
      .fechas-item {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 8px;
        padding: 5px 10px;
        border: 1px dashed rgba(139, 69, 19, 0.24);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.55);
        text-align: left;
      }
      .fechas-item.proximo {
        border-style: solid;
        border-color: rgba(178, 58, 72, 0.45);
        background: rgba(255, 238, 230, 0.9);
        box-shadow: 0 4px 10px rgba(178, 58, 72, 0.12);
      }
      .fechas-item-icono { font-size: clamp(15px, 2vw, 21px); line-height: 1; }
      .fechas-item-titulo {
        color: #3e2723;
        font-family: 'Caveat', cursive;
        font-size: clamp(14px, 1.9vw, 20px);
        line-height: 1.05;
      }
      .fechas-item-fecha {
        color: #8d6e63;
        font-family: 'Special Elite', 'Courier New', monospace;
        font-size: clamp(8px, 1vw, 10px);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .fechas-item-cuando {
        color: #b23a48;
        font-family: 'Caveat', cursive;
        font-size: clamp(13px, 1.7vw, 18px);
        line-height: 1;
        text-align: right;
        white-space: nowrap;
      }
      .fechas-item-cuando.hoy { font-weight: 700; }
      .fechas-celebrar {
        align-self: center;
        margin-top: 6px;
        padding: 7px 18px;
        border: 1px solid rgba(178, 58, 72, 0.4);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.8);
        color: #b23a48;
        cursor: pointer;
        font-family: 'Caveat', cursive;
        font-size: clamp(15px, 2vw, 20px);
        transition: background 0.18s ease, transform 0.18s ease;
      }
      .fechas-celebrar:hover { background: #fff; transform: scale(1.03); }

      /* ------------------------------ confeti ---------------------------- */
      .rc-confeti {
        position: fixed;
        z-index: 10070;
        inset: 0;
        overflow: hidden;
        pointer-events: none;
      }
      .rc-confeti i {
        position: absolute;
        top: -18px;
        display: block;
        width: 8px;
        height: 13px;
        border-radius: 2px;
        animation: rc-caer linear forwards;
      }
      @keyframes rc-caer {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(105vh) rotate(620deg); opacity: 0.9; }
      }

      /* ------------------- audio estilo WhatsApp ------------------- */
      .rc-audio {
        display: inline-flex;
        max-width: 100%;
        align-items: center;
        gap: 9px;
        padding: 7px 13px 7px 8px;
        border: 0;
        border-radius: 999px;
        background: linear-gradient(160deg, #3ce27f, #12a24b);
        box-shadow: 0 6px 16px rgba(18, 162, 75, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.34);
        color: #04150a;
        cursor: pointer;
        font: inherit;
        font-size: 12px;
        transition: filter 0.18s ease, transform 0.18s ease;
      }
      .rc-audio:hover { filter: brightness(1.06); }
      .rc-audio:active { transform: scale(0.98); }
      .rc-audio.mini {
        gap: 5px;
        padding: 3px 9px 3px 3px;
        font-size: 10px;
        box-shadow: 0 2px 6px rgba(18, 162, 75, 0.2);
      }
      .rc-audio.mini .rc-audio-icono { width: 18px; height: 18px; font-size: 8px; }
      .rc-audio.mini .rc-audio-barras { height: 12px; gap: 1px; }
      .rc-audio.mini .rc-audio-barras i { width: 1.5px; }
      .rc-audio-icono {
        display: grid;
        width: 26px;
        height: 26px;
        flex: none;
        place-items: center;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.55);
        font-size: 10px;
      }
      .rc-audio-barras {
        display: flex;
        height: 17px;
        align-items: center;
        gap: 2px;
      }
      .rc-audio-barras i {
        display: block;
        width: 2px;
        border-radius: 2px;
        background: currentColor;
        opacity: 0.5;
      }
      .rc-audio.on .rc-audio-barras i { animation: rc-pulso 0.9s ease-in-out infinite alternate; }
      @keyframes rc-pulso {
        from { transform: scaleY(0.4); }
        to { transform: scaleY(1); }
      }
      .rc-audio-dur {
        font-variant-numeric: tabular-nums;
        font-weight: 800;
        letter-spacing: 0.02em;
      }
      .rc-audio-voz { font-size: 10px; opacity: 0.7; }

      /* --------------------- reacciones en el libro --------------------- */
      .dyn-reac {
        position: absolute;
        top: 3px;
        left: 3px;
        z-index: 9;
        display: inline-flex;
        min-width: 24px;
        align-items: center;
        justify-content: center;
        gap: 3px;
        padding: 3px 6px;
        border: 0;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.94);
        box-shadow: 0 2px 7px rgba(0, 0, 0, 0.22);
        color: #c2185b;
        cursor: pointer;
        font: inherit;
        font-size: 11px;
        font-weight: 800;
        line-height: 1;
        opacity: 0.9;
        transition: transform 0.15s ease, opacity 0.15s ease;
      }
      .dyn-reac:hover { opacity: 1; transform: scale(1.12); }
      .dyn-reac.nueva { animation: rc-latido 1.8s ease-in-out infinite; }
      @keyframes rc-latido {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.14); }
      }

      .dyn-reac-linea {
        display: inline-flex;
        align-self: center;
        align-items: center;
        gap: 6px;
        margin-top: 2px;
        padding: 5px 13px;
        border: 1px dashed rgba(139, 69, 19, 0.32);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.55);
        color: #a03e2c;
        cursor: pointer;
        font: inherit;
        font-family: 'Caveat', cursive;
        font-size: clamp(13px, 1.6vw, 17px);
        transition: background 0.18s ease;
      }
      .dyn-reac-linea:hover { background: #fff; }

      .dyn-audio { display: flex; justify-content: center; margin: 2px 0 0; }

      /* --------------------- panel de reacciones --------------------- */
      .rc-reac-lista { display: flex; flex-direction: column; gap: 10px; }
      .rc-reac-item {
        padding: 10px 12px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.06);
      }
      .rc-reac-cabeza {
        display: flex;
        align-items: baseline;
        gap: 8px;
        margin-bottom: 5px;
      }
      .rc-reac-nombre { font-size: 13px; font-weight: 800; }
      .rc-reac-fecha { margin-left: auto; color: rgba(255, 255, 255, 0.45); font-size: 10px; }
      .rc-reac-texto { margin: 0; font-size: 14px; line-height: 1.4; overflow-wrap: anywhere; }
      .rc-reac-vacio { color: rgba(255, 255, 255, 0.5); font-size: 13px; }

      .rc-grabar {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border: 1px solid rgba(255, 120, 120, 0.42);
        border-radius: 999px;
        background: rgba(255, 70, 70, 0.14);
        color: #ffd1d1;
        cursor: pointer;
        font: inherit;
        font-size: 13px;
      }
      .rc-grabar:hover { background: rgba(255, 70, 70, 0.26); }
      .rc-grabar[hidden] { display: none; }
      .rc-punto {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: #ff4b4b;
        animation: rc-late 1s steps(2) infinite;
      }
      @keyframes rc-late { 50% { opacity: 0.15; } }
      .rc-timer { font-variant-numeric: tabular-nums; font-weight: 800; }
      .rc-audio-preview { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }

      .rc-mini {
        display: grid;
        width: 32px;
        height: 32px;
        place-items: center;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 9px;
        background: rgba(255, 255, 255, 0.07);
        color: #eafff1;
        cursor: pointer;
        font: inherit;
        font-size: 13px;
        transition: background 0.15s ease;
      }
      .rc-mini:hover { background: rgba(255, 255, 255, 0.17); }
      .rc-mini:disabled { opacity: 0.22; cursor: default; }

      .rc-modo {
        padding: 5px 11px;
        border: 1px solid rgba(255, 209, 102, 0.4);
        border-radius: 999px;
        background: rgba(255, 209, 102, 0.16);
        color: #ffe3a1;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .rc-modo[hidden] { display: none; }

      .rc-btn-sec {
        flex: none;
        padding: 11px 18px;
        border: 1px solid rgba(255, 255, 255, 0.22);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        color: inherit;
        cursor: pointer;
        font: inherit;
        font-size: 13px;
      }
      .rc-btn-sec:hover { background: rgba(255, 255, 255, 0.16); }
      .rc-btn-sec[hidden] { display: none; }

      .rc-field-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }

      .rc-slot-ord { display: flex; justify-content: center; gap: 4px; }
      .rc-slot-ord button {
        display: grid;
        width: 27px;
        height: 24px;
        place-items: center;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 7px;
        background: rgba(255, 255, 255, 0.08);
        color: #eafff1;
        cursor: pointer;
        font: inherit;
        font-size: 11px;
        line-height: 1;
      }
      .rc-slot-ord button:hover { background: rgba(29, 185, 84, 0.28); }
      .rc-slot-ord button:disabled { opacity: 0.2; cursor: default; }
      .rc-slot-principal { color: #ffd166 !important; border-color: rgba(255, 209, 102, 0.45) !important; }

      .rc-list-acciones { display: flex; flex: none; align-items: center; gap: 5px; }
      .rc-list-item.edicion {
        border-color: rgba(111, 242, 162, 0.55);
        background: rgba(29, 185, 84, 0.13);
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
        .dyn-reac { min-width: 26px; padding: 4px 7px; font-size: 10px; }
        .rc-reac-item { padding: 9px 10px; }
        .rc-modo { display: none; }
        .dyn-reac-lista { gap: 1px; }
        .fechas-page { gap: 7px; padding: 4% 5% 22px; }
        .fechas-numero { font-size: clamp(44px, 16vw, 68px); }
        .fechas-item {
          grid-template-columns: auto minmax(0, 1fr);
          gap: 2px 5px;
          padding: 4px 6px;
        }
        .fechas-item-icono { grid-row: 1 / span 2; align-self: center; font-size: 12px; }
        .fechas-item-titulo { font-size: 12px; }
        .fechas-item-fecha { font-size: 7.5px; }
        .fechas-item-cuando {
          grid-column: 2;
          font-size: 11px;
          text-align: left;
        }
        .fechas-lista { gap: 4px; }
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
      const [respuesta, respuestaReacciones] = await Promise.all([
        ESTADO.sb.from(CONFIG.tabla).select('*'),
        ESTADO.sb.from(CONFIG.tablaReacciones).select('*')
      ]);
      if (respuesta.error) throw respuesta.error;
      ESTADO.filas = ordenarFilas(Array.isArray(respuesta.data) ? respuesta.data : []);
      ESTADO.faltaReacciones = Boolean(respuestaReacciones.error);
      ESTADO.mensajeReacciones = respuestaReacciones.error && respuestaReacciones.error.message
        ? respuestaReacciones.error.message
        : '';
      ESTADO.reacciones = respuestaReacciones.error || !Array.isArray(respuestaReacciones.data)
        ? []
        : respuestaReacciones.data;
      aplicarAlLibro();
      if (ESTADO.panel && ESTADO.panel.classList.contains('open')) {
        const total = ESTADO.reacciones.length;
        const partes = [`${ESTADO.filas.length} recuerdo${ESTADO.filas.length === 1 ? '' : 's'} publicado${ESTADO.filas.length === 1 ? '' : 's'}`];
        if (total) partes.push(`${total} reacción${total === 1 ? '' : 'es'}`);
        ponerEstado(partes.join(' · ') + '.', 'ok');
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
      const base = albumSpreads.filter((spread) => spread.type !== 'dinamico' && spread.type !== 'fechas');
      const conFechas = [{ type: 'fechas' }, ...base];
      const dinamicos = ESTADO.filas.map((fila) => ({ type: 'dinamico', recuerdo: fila }));
      if (!dinamicos.length) {
        albumSpreads = conFechas;
      } else {
        const posicionFinal = conFechas.findIndex((spread) => spread.isFinal);
        if (posicionFinal >= 0) {
          albumSpreads = [...conFechas.slice(0, posicionFinal), ...dinamicos, ...conFechas.slice(posicionFinal)];
        } else {
          albumSpreads = [...conFechas, ...dinamicos];
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

  /* --------------------------- nuestras fechas -------------------------- */

  function hoyCero() {
    const ahora = new Date();
    return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  }

  function diasDesde(iso) {
    const partes = String(iso || '').slice(0, 10).split('-').map(Number);
    if (partes.length !== 3 || !partes[0]) return 0;
    const inicio = new Date(partes[0], partes[1] - 1, partes[2]);
    return Math.max(0, Math.round((hoyCero() - inicio) / 86400000));
  }

  function desgloseDesde(iso) {
    const partes = String(iso || '').slice(0, 10).split('-').map(Number);
    if (partes.length !== 3 || !partes[0]) return { anios: 0, meses: 0, dias: 0 };
    const hoy = hoyCero();
    let anios = hoy.getFullYear() - partes[0];
    let meses = hoy.getMonth() - (partes[1] - 1);
    let dias = hoy.getDate() - partes[2];
    if (dias < 0) {
      meses -= 1;
      dias += new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
    }
    if (meses < 0) {
      anios -= 1;
      meses += 12;
    }
    return { anios: Math.max(0, anios), meses: Math.max(0, meses), dias: Math.max(0, dias) };
  }

  function proximoEvento(evento) {
    const hoy = hoyCero();
    let anio = hoy.getFullYear();
    let fecha = new Date(anio, evento.mes - 1, evento.dia);
    if (fecha < hoy) {
      anio += 1;
      fecha = new Date(anio, evento.mes - 1, evento.dia);
    }
    return Object.assign({}, evento, {
      anio,
      fecha,
      dias: Math.round((fecha - hoy) / 86400000),
      edad: evento.desde ? anio - evento.desde : null
    });
  }

  function eventosOrdenados() {
    return FECHAS.eventos
      .map(proximoEvento)
      .sort((a, b) => (a.dias - b.dias) || (a.mes - b.mes) || (a.dia - b.dia));
  }

  function esDiaEspecial() {
    return eventosOrdenados().some((evento) => evento.dias === 0);
  }

  function lanzarConfeti(cantidad) {
    const colores = ['#b23a48', '#ffd166', '#6ff2a2', '#1db954', '#ff9aa2', '#8ecae6', '#ffffff'];
    const capa = crear('div', 'rc-confeti');
    const total = Math.max(20, Math.min(200, Number(cantidad) || 90));
    for (let i = 0; i < total; i += 1) {
      const papel = document.createElement('i');
      papel.style.left = `${Math.random() * 100}vw`;
      papel.style.background = colores[Math.floor(Math.random() * colores.length)];
      papel.style.animationDelay = `${Math.random() * 0.7}s`;
      papel.style.animationDuration = `${2.4 + Math.random() * 1.8}s`;
      papel.style.width = `${5 + Math.random() * 5}px`;
      papel.style.height = `${9 + Math.random() * 8}px`;
      capa.append(papel);
    }
    document.body.append(capa);
    window.setTimeout(() => capa.remove(), 5600);
  }

  function pintarSpreadFechas() {
    const izquierda = crear('div', 'hoja izq hoja-fechas');
    const derecha = crear('div', 'hoja der hoja-fechas');

    const total = diasDesde(FECHAS.inicio);
    const { anios, meses, dias } = desgloseDesde(FECHAS.inicio);
    const eventos = eventosOrdenados();
    const proximo = eventos[0];

    const paginaIzq = crear('div', 'fechas-page');
    paginaIzq.append(crear('div', 'fechas-kicker', 'Nuestros días'));
    paginaIzq.append(crear('h3', 'fechas-titulo', `Desde el ${FECHAS.inicioTexto}`));
    const contador = crear('div', 'fechas-contador');
    contador.append(crear('div', 'fechas-numero', total.toLocaleString('es-CO')));
    contador.append(crear('div', 'fechas-numero-label', 'días desde nuestra primera foto'));
    paginaIzq.append(contador);
    paginaIzq.append(crear('div', 'fechas-desglose', `${anios} años, ${meses} meses y ${dias} días`));
    paginaIzq.append(crear('div', 'fechas-nota', 'Y todavía me faltan muchísimos días más a tu lado.'));
    paginaIzq.append(crear('div', 'fechas-firma', `Con todo mi amor, ${CONFIG.firma}`));
    izquierda.append(paginaIzq);

    const paginaDer = crear('div', 'fechas-page');
    paginaDer.append(crear('div', 'fechas-kicker', 'Fechas que no quiero olvidar'));
    paginaDer.append(crear('h3', 'fechas-titulo', 'Nuestro calendario'));

    const lista = crear('ul', 'fechas-lista');
    eventos.forEach((evento, posicion) => {
      const item = crear('li', 'fechas-item' + (posicion === 0 ? ' proximo' : ''));
      item.append(crear('span', 'fechas-item-icono', evento.icono || '💛'));
      const centro = crear('div', 'fechas-item-centro');
      centro.append(crear('div', 'fechas-item-titulo', evento.titulo));
      const fechaTexto = `${evento.dia} de ${MESES[evento.mes - 1]}${evento.edad ? (evento.cumple ? ` · cumple ${evento.edad}` : ` · ${evento.edad} años`) : ''}`;
      centro.append(crear('div', 'fechas-item-fecha', fechaTexto));
      item.append(centro);
      const cuando = evento.dias === 0
        ? '¡es hoy!'
        : evento.dias === 1 ? 'mañana' : `faltan ${evento.dias} días`;
      item.append(crear('span', 'fechas-item-cuando' + (evento.dias === 0 ? ' hoy' : ''), cuando));
      lista.append(item);
    });
    paginaDer.append(lista);

    const celebrar = crear('button', 'fechas-celebrar', 'Celebrar 🎉');
    celebrar.type = 'button';
    celebrar.title = 'Un poquito de confeti';
    celebrar.addEventListener('click', () => lanzarConfeti(110));
    paginaDer.append(celebrar);

    const proximoTexto = proximo.dias === 0
      ? `Hoy es ${proximo.titulo}.`
      : `Lo próximo: ${proximo.titulo}, en ${proximo.dias} día${proximo.dias === 1 ? '' : 's'}.`;
    paginaDer.append(crear('div', 'fechas-nota', proximoTexto));

    derecha.append(paginaDer);

    pegarStickersDinamicos(izquierda, ['snoopy-corazon.png'], [3]);

    if (esDiaEspecial() && !sessionStorage.getItem('rc-confeti')) {
      sessionStorage.setItem('rc-confeti', '1');
      window.setTimeout(() => lanzarConfeti(100), 900);
    }

    return [izquierda, derecha];
  }

  window.pintarSpreadFechas = pintarSpreadFechas;

  /* --------------------- audio (notas de voz) --------------------------- */

  let audioActual = null;
  let botonAudioActual = null;

  function formatearSegundos(seg) {
    const total = Math.max(0, Math.round(Number(seg) || 0));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  function pararAudioActual() {
    if (audioActual) {
      try { audioActual.pause(); } catch { /* ya estaba parado */ }
      audioActual = null;
    }
    if (botonAudioActual) {
      botonAudioActual.classList.remove('on');
      const icono = $('.rc-audio-icono', botonAudioActual);
      if (icono) icono.textContent = '▶';
      const tiempo = $('.rc-audio-dur', botonAudioActual);
      if (tiempo && botonAudioActual.dataset.duracion) {
        tiempo.textContent = botonAudioActual.dataset.duracion;
      }
    }
    botonAudioActual = null;
  }

  function crearBurbujaAudio(url, duracion, etiqueta, compacto) {
    const boton = crear('button', 'rc-audio' + (compacto ? ' mini' : ''));
    boton.type = 'button';
    boton.setAttribute('aria-label', 'Reproducir nota de voz');
    const inicial = duracion ? formatearSegundos(duracion) : '0:00';
    boton.dataset.duracion = inicial;

    const icono = crear('span', 'rc-audio-icono', '▶');
    const barras = crear('span', 'rc-audio-barras');
    let semilla = 7;
    for (let i = 0; i < String(url).length; i += 1) {
      semilla = (semilla * 31 + String(url).charCodeAt(i)) % 9973;
    }
    for (let i = 0; i < 10; i += 1) {
      const barra = document.createElement('i');
      barra.style.height = `${5 + ((semilla >> (i % 8)) % 13)}px`;
      barras.append(barra);
    }
    const tiempo = crear('span', 'rc-audio-dur', inicial);
    boton.append(icono, barras, tiempo);
    if (etiqueta) boton.append(crear('span', 'rc-audio-voz', etiqueta));

    boton.addEventListener('click', (evento) => {
      evento.stopPropagation();
      evento.preventDefault();
      if (botonAudioActual === boton) {
        pararAudioActual();
        return;
      }
      pararAudioActual();
      if (typeof pausarMusicaParaVideo === 'function') pausarMusicaParaVideo();
      const audio = new Audio(url);
      audioActual = audio;
      botonAudioActual = boton;
      boton.classList.add('on');
      icono.textContent = '❚❚';

      audio.addEventListener('loadedmetadata', () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          const texto = formatearSegundos(audio.duration);
          boton.dataset.duracion = texto;
          tiempo.textContent = texto;
        }
      });
      audio.addEventListener('timeupdate', () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          tiempo.textContent = formatearSegundos(audio.duration - audio.currentTime);
        }
      });
      audio.addEventListener('ended', () => {
        pararAudioActual();
        if (typeof reanudarMusicaTrasVideo === 'function') reanudarMusicaTrasVideo();
      });
      audio.play().catch(() => {
        pararAudioActual();
        toast('No se pudo reproducir el audio.', 'error');
      });
    });

    return boton;
  }

  /* ------------------------- páginas del libro -------------------------- */

  const POSICIONES_STICKER = [
    { left: '2%', top: '6%', giro: -11 },
    { right: '1%', top: '1%', giro: 10 },
    { left: '1%', bottom: '1%', giro: 7 },
    { right: '1%', bottom: '1%', giro: -8 }
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

  function crearListaReacciones(recuerdo, indice, mediaUrl, maximo, enPagina) {
    if (!recuerdo || !recuerdo.id) return null;
    const reacciones = reaccionesDe(recuerdo.id, indice, mediaUrl);
    if (!reacciones.length) return null;
    const limite = maximo || 2;
    const lista = crear('div', 'dyn-reac-lista' + (enPagina ? ' en-pagina' : ''));
    reacciones.slice(0, limite).forEach((reaccion) => {
      const item = crear('div', 'dyn-reac-item');
      item.append(crear('span', 'dyn-reac-autor', primeraPalabra(reaccion.nombre || CONFIG.firma)));
      if (reaccion.texto) {
        item.append(crear('span', 'dyn-reac-txt', reaccion.texto));
      } else if (reaccion.audio_url) {
        item.append(crearBurbujaAudio(reaccion.audio_url, reaccion.audio_dur, '', true));
      }
      lista.append(item);
    });
    if (reacciones.length > limite) {
      const mas = crear('button', 'dyn-reac-mas', `y ${reacciones.length - limite} más…`);
      mas.type = 'button';
      mas.addEventListener('click', (evento) => {
        evento.stopPropagation();
        abrirReacciones(recuerdo, indice, '', mediaUrl || '');
      });
      lista.append(mas);
    }
    return lista;
  }

  function primeraPalabra(nombre) {
    return String(nombre || CONFIG.firma).trim().split(/\s+/)[0].slice(0, 14);
  }

  function crearFotoDinamica(media, indice, recuerdo) {
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

    if (recuerdo && recuerdo.id) {
      const cuantas = contarReacciones(recuerdo.id, indice, media.url);
      const reac = crear('button', 'dyn-reac' + (cuantas ? '' : ' nueva'), cuantas ? `❤ ${cuantas}` : '♡');
      reac.type = 'button';
      reac.title = cuantas
        ? 'Ver las reacciones de esta foto'
        : 'Reaccionar a esta foto (texto o audio)';
      reac.setAttribute('aria-label', reac.title);
      reac.addEventListener('click', (evento) => {
        evento.stopPropagation();
        abrirReacciones(recuerdo, indice, media.texto || '', media.url);
      });
      contenedor.append(reac);
    }

    const lista = crearListaReacciones(recuerdo, indice, media.url, 2, false);
    if (lista) contenedor.append(lista);

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

    if (recuerdo.audio && recuerdo.audio.url) {
      const lineaAudio = crear('div', 'dyn-audio');
      lineaAudio.append(crearBurbujaAudio(recuerdo.audio.url, recuerdo.audio.duracion, 'nota de voz'));
      pagina.append(lineaAudio);
    }

    if (recuerdo.id) {
      const listaPagina = crearListaReacciones(recuerdo, -1, '', 3, true);
      if (listaPagina) pagina.append(listaPagina);
      const cuantas = contarReacciones(recuerdo.id, -1);
      const linea = crear('button', 'dyn-reac-linea', cuantas
        ? `❤ ${cuantas} · añadir la mía`
        : '＋ reaccionar a esta página');
      linea.type = 'button';
      linea.addEventListener('click', () => abrirReacciones(recuerdo, -1, ''));
      pagina.append(linea);
    }

    const fecha = formatearFecha(recuerdo.fecha);
    if (fecha) pagina.append(crear('div', 'dyn-fecha', fecha));
    izquierda.append(pagina);

    const media = Array.isArray(recuerdo.media) ? recuerdo.media.filter((m) => m && m.url).slice(0, 3) : [];
    if (media.length) {
      const contenedor = crear('div', 'dyn-media dyn-media-' + media.length);
      media.forEach((elemento, indice) => contenedor.append(crearFotoDinamica(elemento, indice, recuerdo)));
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

  /* ---------------------------- reacciones ------------------------------ */

  function crearHojaReacciones() {
    const overlay = crear('div', 'rc-overlay rc-reacciones');
    overlay.innerHTML = `
      <div class="rc-panel rc-panel-sm" role="dialog" aria-modal="true" aria-labelledby="rc-reac-title">
        <div class="rc-head">
          <div>
            <span class="rc-eyebrow">Reacciones</span>
            <h2 class="rc-title" id="rc-reac-title" data-rc="reac-titulo">Esta página</h2>
          </div>
          <button type="button" class="rc-close" data-rc="reac-cerrar" aria-label="Cerrar">✕</button>
        </div>
        <div class="rc-body">
          <div class="rc-reac-lista" data-rc="reac-lista"></div>
          <label class="rc-field">
            <span class="rc-label">Tu nombre</span>
            <input class="rc-input" data-rc="reac-nombre" maxlength="40" placeholder="¿Quién eres?">
          </label>
          <label class="rc-field">
            <span class="rc-label">Mensaje (opcional)</span>
            <textarea class="rc-input rc-textarea" data-rc="reac-texto" rows="2" maxlength="220" placeholder="Escribe algo corto..."></textarea>
          </label>
          <div class="rc-field">
            <span class="rc-label">O graba tu voz (máx. ${CONFIG.maxAudioSeg} s)</span>
            <div class="rc-audio-preview" data-rc="reac-audio"></div>
          </div>
        </div>
        <div class="rc-foot">
          <span class="rc-status" data-rc="reac-status"></span>
          <button type="button" class="rc-save" data-rc="reac-enviar">Enviar</button>
        </div>
      </div>
    `;
    document.body.append(overlay);
    ESTADO.hojaReacciones = overlay;

    $('[data-rc="reac-cerrar"]', overlay).addEventListener('click', () => {
      detenerGrabacion(true);
      cerrarOverlay(overlay);
    });
    overlay.addEventListener('click', (evento) => {
      if (evento.target === overlay) {
        detenerGrabacion(true);
        cerrarOverlay(overlay);
      }
    });
    $('[data-rc="reac-enviar"]', overlay).addEventListener('click', enviarReaccion);
  }

  function abrirReacciones(recuerdo, indice, textoFoto, mediaUrl) {
    if (!conectar()) {
      toast('Sin conexión con Supabase.', 'error');
      return;
    }
    if (!ESTADO.hojaReacciones) crearHojaReacciones();
    const overlay = ESTADO.hojaReacciones;
    ESTADO.reacContexto = { recuerdo, indice, textoFoto, mediaUrl: mediaUrl || '' };
    detenerGrabacion(true);
    const nombre = $('[data-rc="reac-nombre"]', overlay);
    if (nombre) nombre.value = nombreVisitante();
    $('[data-rc="reac-texto"]', overlay).value = '';
    $('[data-rc="reac-status"]', overlay).textContent = '';
    $('[data-rc="reac-status"]', overlay).className = 'rc-status';
    pintarHojaReacciones();
    pintarGrabadora();
    abrirOverlay(overlay);
    window.setTimeout(() => {
      const campo = $('[data-rc="reac-texto"]', overlay);
      if (campo) campo.focus();
    }, 220);
  }

  function pintarHojaReacciones() {
    const overlay = ESTADO.hojaReacciones;
    const contexto = ESTADO.reacContexto;
    if (!overlay || !contexto) return;
    const { recuerdo, indice, textoFoto, mediaUrl } = contexto;

    const titulo = $('[data-rc="reac-titulo"]', overlay);
    if (titulo) {
      titulo.textContent = indice >= 0
        ? (textoFoto ? textoFoto.slice(0, 48) : 'Una foto de esta página')
        : 'Esta página';
    }

    const lista = $('[data-rc="reac-lista"]', overlay);
    lista.replaceChildren();
    const reacciones = reaccionesDe(recuerdo.id, indice, mediaUrl);
    if (!reacciones.length) {
      lista.append(crear('div', 'rc-reac-vacio', indice >= 0
        ? 'Todavía nadie ha reaccionado a esta foto.'
        : 'Todavía nadie ha reaccionado a esta página.'));
      return;
    }

    const esAdmin = sessionStorage.getItem('rc-admin') === '1';
    reacciones.forEach((reaccion) => {
      const item = crear('div', 'rc-reac-item');
      const cabeza = crear('div', 'rc-reac-cabeza');
      cabeza.append(crear('span', 'rc-reac-nombre', reaccion.nombre || CONFIG.firma));
      cabeza.append(crear('span', 'rc-reac-fecha', formatearFechaCorta(reaccion.creado_en ? String(reaccion.creado_en).slice(0, 10) : '')));
      if (esAdmin) {
        const borrar = crear('button', 'rc-mini', '🗑');
        borrar.type = 'button';
        borrar.title = 'Borrar esta reacción';
        borrar.style.width = '24px';
        borrar.style.height = '24px';
        borrar.style.fontSize = '11px';
        borrar.addEventListener('click', () => borrarReaccion(reaccion));
        cabeza.append(borrar);
      }
      item.append(cabeza);
      if (reaccion.texto) item.append(crear('p', 'rc-reac-texto', reaccion.texto));
      if (reaccion.audio_url) {
        const audio = crearBurbujaAudio(reaccion.audio_url, reaccion.audio_dur, 'nota de voz');
        item.append(audio);
      }
      lista.append(item);
    });
  }

  /* --------------------------- grabar audio ----------------------------- */

  function pintarGrabadora() {
    const overlay = ESTADO.hojaReacciones;
    if (!overlay) return;
    const contenedor = $('[data-rc="reac-audio"]', overlay);
    contenedor.replaceChildren();

    if (ESTADO.grabadora && ESTADO.grabadora.grabando) {
      const boton = crear('button', 'rc-grabar rc-grabando');
      boton.type = 'button';
      boton.append(crear('span', 'rc-punto'));
      const texto = crear('span', '', 'Grabando… ');
      const timer = crear('span', 'rc-timer', '0:00');
      boton.append(texto, timer);
      boton.title = 'Toca para terminar';
      boton.addEventListener('click', () => detenerGrabacion());
      contenedor.append(boton);
      ESTADO.grabadora.timerTexto = timer;
      return;
    }

    if (ESTADO.grabadora && ESTADO.grabadora.blob) {
      const audio = crearBurbujaAudio(ESTADO.grabadora.url, ESTADO.grabadora.duracion, 'tu nota de voz');
      const borrar = crear('button', 'rc-mini', '✕');
      borrar.type = 'button';
      borrar.title = 'Borrar y grabar otra';
      borrar.addEventListener('click', () => {
        detenerGrabacion(true);
        pintarGrabadora();
      });
      contenedor.append(audio, borrar);
      return;
    }

    const boton = crear('button', 'rc-grabar');
    boton.type = 'button';
    boton.append(crear('span', '', '🎤'), crear('span', '', 'Grabar audio'));
    boton.addEventListener('click', iniciarGrabacion);
    contenedor.append(boton);
  }

  async function iniciarGrabacion() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast('Este navegador no permite grabar audio. Puedes enviar solo texto.', 'error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tipos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
      const tipo = tipos.find((t) => {
        try { return MediaRecorder.isTypeSupported(t); } catch { return false; }
      }) || '';
      const grabadora = tipo ? new MediaRecorder(stream, { mimeType: tipo }) : new MediaRecorder(stream);
      const trozos = [];
      const estado = {
        grabando: true,
        recorder: grabadora,
        stream,
        trozos,
        inicio: Date.now(),
        duracion: 0,
        url: null,
        blob: null,
        timerTexto: null,
        intervalo: null,
        timeout: null
      };
      ESTADO.grabadora = estado;

      grabadora.addEventListener('dataavailable', (evento) => {
        if (evento.data && evento.data.size) trozos.push(evento.data);
      });
      grabadora.addEventListener('stop', () => {
        stream.getTracks().forEach((pista) => pista.stop());
        if (!trozos.length) {
          ESTADO.grabadora = null;
          pintarGrabadora();
          return;
        }
        const blob = new Blob(trozos, { type: grabadora.mimeType || 'audio/webm' });
        estado.blob = blob;
        estado.url = URL.createObjectURL(blob);
        estado.duracion = Math.max(1, Math.round((Date.now() - estado.inicio) / 1000));
        estado.grabando = false;
        pintarGrabadora();
      });

      grabadora.start();
      pintarGrabadora();
      estado.intervalo = window.setInterval(() => {
        const seg = Math.min(CONFIG.maxAudioSeg, Math.floor((Date.now() - estado.inicio) / 1000));
        if (estado.timerTexto) estado.timerTexto.textContent = formatearSegundos(seg);
      }, 250);
      estado.timeout = window.setTimeout(() => detenerGrabacion(), CONFIG.maxAudioSeg * 1000);
    } catch (error) {
      console.warn('[Supabase] Micrófono:', error);
      toast('No se pudo usar el micrófono. Revisa el permiso del navegador.', 'error');
    }
  }

  function detenerGrabacion(descartar) {
    const estado = ESTADO.grabadora;
    if (!estado) return;
    if (estado.intervalo) window.clearInterval(estado.intervalo);
    if (estado.timeout) window.clearTimeout(estado.timeout);
    if (estado.recorder && estado.recorder.state !== 'inactive') {
      try { estado.recorder.stop(); } catch { /* ya se detuvo */ }
    }
    if (estado.stream) estado.stream.getTracks().forEach((pista) => pista.stop());
    if (descartar) {
      if (estado.url) URL.revokeObjectURL(estado.url);
      ESTADO.grabadora = null;
      pintarGrabadora();
    }
  }

  async function enviarReaccion() {
    const overlay = ESTADO.hojaReacciones;
    const contexto = ESTADO.reacContexto;
    if (!overlay || !contexto) return;
    const { recuerdo, indice, mediaUrl } = contexto;
    const nombre = ($('[data-rc="reac-nombre"]', overlay).value || '').trim() || CONFIG.firma;
    const texto = ($('[data-rc="reac-texto"]', overlay).value || '').trim();
    const grabadora = ESTADO.grabadora;
    const estado = $('[data-rc="reac-status"]', overlay);
    const boton = $('[data-rc="reac-enviar"]', overlay);

    if (!texto && !(grabadora && grabadora.blob)) {
      toast('Escribe algo o graba un audio.', 'error');
      return;
    }

    boton.disabled = true;
    estado.className = 'rc-status';
    estado.textContent = 'Enviando...';
    try {
      let audioUrl = null;
      let audioDur = null;
      if (grabadora && grabadora.blob) {
        const tipo = grabadora.blob.type || 'audio/webm';
        const ext = /mp4|m4a|aac/.test(tipo) ? 'm4a' : /ogg/.test(tipo) ? 'ogg' : 'webm';
        const archivo = new File([grabadora.blob], `voz-${Date.now()}.${ext}`, { type: tipo });
        audioUrl = await subirArchivo(archivo);
        audioDur = grabadora.duracion;
      }

      const respuesta = await ESTADO.sb.from(CONFIG.tablaReacciones).insert({
        recuerdo_id: recuerdo.id,
        indice,
        media_url: mediaUrl || null,
        nombre,
        texto,
        audio_url: audioUrl,
        audio_dur: audioDur
      }).select().single();
      if (respuesta.error) throw respuesta.error;

      recordarNombre(nombre);
      if (respuesta.data) ESTADO.reacciones.push(respuesta.data);
      detenerGrabacion(true);
      $('[data-rc="reac-texto"]', overlay).value = '';
      pintarHojaReacciones();
      pintarGrabadora();
      estado.className = 'rc-status ok';
      estado.textContent = '¡Enviado!';
      toast('Reacción guardada 💌');
      aplicarAlLibro();
    } catch (error) {
      estado.className = 'rc-status error';
      estado.textContent = (error && error.message ? error.message : String(error)) +
        (/bucket/i.test(String(error && error.message)) ? ' → Falta el bucket "recuerdos".' : '');
      toast('No se pudo enviar la reacción.', 'error');
    } finally {
      boton.disabled = false;
    }
  }

  async function borrarReaccion(reaccion) {
    if (!window.confirm('¿Borrar esta reacción?')) return;
    try {
      const respuesta = await ESTADO.sb.from(CONFIG.tablaReacciones).delete().eq('id', reaccion.id);
      if (respuesta.error) throw respuesta.error;
      ESTADO.reacciones = ESTADO.reacciones.filter((r) => r.id !== reaccion.id);
      if (reaccion.audio_url) {
        const ruta = rutaDeUrl(reaccion.audio_url);
        if (ruta) {
          try { await ESTADO.sb.storage.from(CONFIG.bucket).remove([ruta]); } catch { /* da igual */ }
        }
      }
      pintarHojaReacciones();
      aplicarAlLibro();
      toast('Reacción borrada.');
    } catch (error) {
      toast('No se pudo borrar: ' + (error && error.message ? error.message : error), 'error');
    }
  }

  function rutaDeUrl(url) {
    const marca = `/object/public/${CONFIG.bucket}/`;
    const posicion = String(url || '').indexOf(marca);
    return posicion >= 0 ? decodeURIComponent(String(url).slice(posicion + marca.length)) : '';
  }

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
          <span class="rc-modo" data-rc="modo" hidden>Editando</span>
          <button type="button" class="rc-close" data-rc="cerrar" aria-label="Cerrar">✕</button>
        </div>
        <div class="rc-body">
          <div class="rc-setup" data-rc="setup" hidden></div>
          <div class="rc-setup" data-rc="aviso" hidden></div>
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
            <div class="rc-field-top">
              <span class="rc-label">Recuerdos publicados</span>
              <button type="button" class="rc-btn-sec" data-rc="respaldo" style="padding:6px 12px;font-size:11px">Descargar respaldo</button>
            </div>
            <div class="rc-list" data-rc="lista"></div>
          </div>
        </div>
        <div class="rc-foot">
          <span class="rc-status" data-rc="status"></span>
          <button type="button" class="rc-btn-sec" data-rc="cancelar" hidden>Cancelar</button>
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
    $('[data-rc="cancelar"]', overlay).addEventListener('click', salirEdicion);
    $('[data-rc="respaldo"]', overlay).addEventListener('click', descargarRespaldo);

    pintarSlots();
    construirStickers(overlay);
    pintarChips();
    if (ESTADO.filas.length) pintarLista();
  }

  function crearMedioVacio() {
    return { file: null, url: '', tipo: '', texto: '', previewUrl: '' };
  }

  function pintarSlots() {
    if (!ESTADO.panel) return;
    const contenedor = $('[data-rc="media"]', ESTADO.panel);
    contenedor.replaceChildren();
    ESTADO.medios.forEach((medio, indice) => {
      contenedor.append(slotLleno(medio, indice));
    });
    for (let i = ESTADO.medios.length; i < 3; i += 1) {
      contenedor.append(slotVacio(i));
    }
  }

  function slotVacio(posicion) {
    const slot = crear('div', 'rc-slot');
    slot.innerHTML = `
      <button type="button" class="rc-slot-pick"><span class="rc-slot-plus">＋</span><span class="rc-slot-txt">Foto o video</span></button>
      <input type="file" accept="image/*,video/*" hidden>
    `;
    const entrada = $('input[type="file"]', slot);
    const elegir = $('.rc-slot-pick', slot);
    elegir.addEventListener('click', () => entrada.click());
    entrada.addEventListener('change', () => {
      const archivo = entrada.files && entrada.files[0];
      if (!archivo) return;
      if (archivo.size > CONFIG.maxArchivoMB * 1024 * 1024) {
        toast(`El archivo pesa más de ${CONFIG.maxArchivoMB} MB. Elige uno más pequeño.`, 'error');
        entrada.value = '';
        return;
      }
      ESTADO.medios[posicion] = {
        file: archivo,
        url: '',
        tipo: archivo.type.startsWith('video/') ? 'video' : 'image',
        texto: '',
        previewUrl: URL.createObjectURL(archivo)
      };
      pintarSlots();
    });
    return slot;
  }

  function slotLleno(medio, indice) {
    const slot = crear('div', 'rc-slot');
    const preview = crear('div', 'rc-slot-preview');
    const fuente = medio.previewUrl || medio.url;
    if ((medio.tipo || '') === 'video') {
      const video = document.createElement('video');
      video.src = fuente;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      preview.append(video);
    } else {
      const imagen = document.createElement('img');
      imagen.src = fuente;
      imagen.alt = 'Vista previa';
      preview.append(imagen);
    }

    const quitar = crear('button', 'rc-slot-quitar', '✕');
    quitar.type = 'button';
    quitar.setAttribute('aria-label', 'Quitar archivo');
    quitar.addEventListener('click', () => {
      if (medio.previewUrl) URL.revokeObjectURL(medio.previewUrl);
      ESTADO.medios.splice(indice, 1);
      pintarSlots();
    });
    preview.append(quitar);

    const orden = crear('div', 'rc-slot-ord');
    const izquierda = crear('button', '', '←');
    izquierda.type = 'button';
    izquierda.title = 'Mover antes';
    izquierda.disabled = indice === 0;
    izquierda.addEventListener('click', () => moverMedio(indice, -1));
    const principal = crear('button', indice === 0 ? 'rc-slot-principal' : '', '★');
    principal.type = 'button';
    principal.title = 'Poner como principal';
    principal.disabled = indice === 0;
    principal.addEventListener('click', () => moverMedio(indice, 0));
    const derecha = crear('button', '', '→');
    derecha.type = 'button';
    derecha.title = 'Mover después';
    derecha.disabled = indice === ESTADO.medios.length - 1;
    derecha.addEventListener('click', () => moverMedio(indice, 1));
    orden.append(izquierda, principal, derecha);

    const texto = crear('input', 'rc-input rc-slot-texto');
    texto.type = 'text';
    texto.placeholder = 'Texto de esta foto (opcional)';
    texto.maxLength = 220;
    texto.value = medio.texto || '';
    texto.addEventListener('input', () => { medio.texto = texto.value; });

    slot.append(preview, orden, texto);
    return slot;
  }

  function moverMedio(desde, direccion) {
    if (!ESTADO.medios[desde]) return;
    if (direccion === 0) {
      const [medio] = ESTADO.medios.splice(desde, 1);
      ESTADO.medios.unshift(medio);
    } else {
      const destino = desde + direccion;
      if (destino < 0 || destino >= ESTADO.medios.length) return;
      const [medio] = ESTADO.medios.splice(desde, 1);
      ESTADO.medios.splice(destino, 0, medio);
    }
    pintarSlots();
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
    ESTADO.filas.forEach((fila, posicion) => {
      const item = crear('div', 'rc-list-item' + (ESTADO.editando && ESTADO.editando.id === fila.id ? ' edicion' : ''));
      const info = crear('div', 'rc-list-info');
      info.append(crear('div', 'rc-list-titulo', fila.titulo || 'Sin título'));
      const fotos = Array.isArray(fila.media) ? fila.media.length : 0;
      const cuantas = ESTADO.reacciones.filter((r) => r.recuerdo_id === fila.id).length;
      const meta = [
        formatearFecha(fila.fecha),
        fotos ? `${fotos} archivo${fotos === 1 ? '' : 's'}` : 'solo texto',
        cuantas ? `❤ ${cuantas}` : ''
      ].filter(Boolean).join(' · ');
      info.append(crear('div', 'rc-list-meta', meta));

      const acciones = crear('div', 'rc-list-acciones');

      const subir = crear('button', 'rc-mini', '↑');
      subir.type = 'button';
      subir.title = 'Mover antes en el libro';
      subir.disabled = posicion === 0;
      subir.addEventListener('click', () => moverPagina(posicion, -1));

      const bajar = crear('button', 'rc-mini', '↓');
      bajar.type = 'button';
      bajar.title = 'Mover después en el libro';
      bajar.disabled = posicion === ESTADO.filas.length - 1;
      bajar.addEventListener('click', () => moverPagina(posicion, 1));

      const editar = crear('button', 'rc-mini', '✎');
      editar.type = 'button';
      editar.title = 'Editar esta página';
      editar.addEventListener('click', () => cargarEnFormulario(fila));

      const borrar = crear('button', 'rc-list-borrar', 'Borrar');
      borrar.type = 'button';
      borrar.addEventListener('click', () => borrarRecuerdo(fila));

      acciones.append(subir, bajar, editar, borrar);
      item.append(info, acciones);
      ESTADO.lista.append(item);
    });
  }

  function rellenarSql(contenedor, mensaje, conSql) {
    contenedor.replaceChildren();
    contenedor.append(crear('p', '', mensaje));
    if (!conSql) return;
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
    contenedor.append(bloque, copiar);
  }

  function mostrarErrorCarga() {
    if (!ESTADO.setup) return;
    ESTADO.setup.hidden = false;
    const mensaje = ESTADO.errorCarga || '';
    const faltaTabla = /schema cache|does not exist|Could not find the table|relation/i.test(mensaje);
    rellenarSql(ESTADO.setup, faltaTabla
      ? 'Falta crear la tabla y el bucket en Supabase. Abre tu proyecto → SQL Editor → pega esto → Run. Después recarga la página.'
      : `No se pudieron cargar los recuerdos: ${mensaje}`, faltaTabla);
  }

  function mostrarAvisoSql() {
    if (!ESTADO.panel) return;
    const aviso = $('[data-rc="aviso"]', ESTADO.panel);
    if (!aviso) return;
    if (!ESTADO.faltaReacciones) {
      aviso.hidden = true;
      aviso.replaceChildren();
      return;
    }
    aviso.hidden = false;
    rellenarSql(aviso,
      'Falta activar las reacciones y el orden de las páginas. Abre Supabase → SQL Editor, pega el SQL nuevo y dale Run. Después recarga la página.',
      true);
  }

  function abrirPanel() {
    if (!ESTADO.panel) return;
    if (!ESTADO.panel.classList.contains('open')) {
      ESTADO.editando = null;
      limpiarFormulario();
    }
    abrirOverlay(ESTADO.panel);
    const fecha = $('[data-rc="fecha"]', ESTADO.panel);
    if (fecha && !fecha.value) fecha.value = hoyISO();
    if (ESTADO.errorCarga) mostrarErrorCarga();
    else if (ESTADO.setup) ESTADO.setup.hidden = true;
    mostrarAvisoSql();
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

    const usables = ESTADO.medios.filter((medio) => medio && (medio.file || medio.url));
    const editando = ESTADO.editando;
    ESTADO.guardando = true;
    const boton = $('[data-rc="guardar"]', ESTADO.panel);
    boton.disabled = true;
    ponerEstado('Preparando archivos...');

    try {
      const media = [];
      let subidos = 0;
      for (let i = 0; i < usables.length; i += 1) {
        const medio = usables[i];
        let url = medio.url || '';
        let tipo = medio.tipo || 'image';
        if (medio.file) {
          subidos += 1;
          ponerEstado(`Subiendo archivo ${subidos}...`);
          const preparado = await comprimirImagen(medio.file);
          url = await subirArchivo(preparado);
          tipo = (medio.file.type || '').startsWith('video/') ? 'video' : 'image';
        }
        if (url) media.push({ url, tipo, texto: (medio.texto || '').trim() });
      }

      const datos = {
        titulo,
        texto,
        media,
        stickers: ESTADO.stickers.slice(0, 4),
        fecha: fecha || null
      };

      ponerEstado('Guardando la página...');
      if (editando) {
        const cambio = await ESTADO.sb.from(CONFIG.tabla).update(datos).eq('id', editando.id);
        if (cambio.error) throw cambio.error;
        const antes = (Array.isArray(editando.media) ? editando.media : [])
          .map((m) => rutaDeUrl(m && m.url))
          .filter(Boolean);
        const despues = media.map((m) => rutaDeUrl(m.url)).filter(Boolean);
        const sobrantes = antes.filter((ruta) => !despues.includes(ruta));
        if (sobrantes.length) {
          try { await ESTADO.sb.storage.from(CONFIG.bucket).remove(sobrantes); } catch { /* da igual */ }
        }
      } else {
        const maximo = ESTADO.filas.reduce((max, fila) => Math.max(max, Number(fila.orden) || 0), 0);
        const ordenNuevo = maximo > 0 ? maximo + 10 : 0;
        let insercion = await ESTADO.sb.from(CONFIG.tabla).insert({ ...datos, orden: ordenNuevo });
        if (insercion.error && /orden/i.test(insercion.error.message || '')) {
          // Si todavía no existe la columna de orden, guardamos igual.
          insercion = await ESTADO.sb.from(CONFIG.tabla).insert(datos);
        }
        if (insercion.error) throw insercion.error;
      }

      limpiarFormulario();
      await cargar();
      ponerEstado(editando ? '¡Página actualizada!' : '¡Página publicada! Ya aparece en el libro.', 'ok');
      toast(editando ? 'Cambios guardados 💌' : 'Recuerdo publicado 💌');
    } catch (error) {
      const mensaje = error && error.message ? error.message : String(error);
      let ayuda = mensaje;
      if (/bucket/i.test(mensaje)) {
        ayuda += ' → Falta crear el bucket "recuerdos" (ejecuta el SQL).';
      } else if (/row-level security|policy/i.test(mensaje)) {
        ayuda += ' → Faltan los permisos (políticas RLS) en Supabase.';
      } else if (/column .* does not exist|schema cache/i.test(mensaje)) {
        ayuda += ' → Ejecuta el SQL nuevo del panel en Supabase.';
      }
      ponerEstado(ayuda, 'error');
      toast('No se pudo guardar. Revisa el mensaje abajo.', 'error');
    } finally {
      ESTADO.guardando = false;
      boton.disabled = false;
    }
  }

  function actualizarModoPanel() {
    if (!ESTADO.panel) return;
    const editando = Boolean(ESTADO.editando);
    const modo = $('[data-rc="modo"]', ESTADO.panel);
    const titulo = document.getElementById('rc-title');
    const guardarBtn = $('[data-rc="guardar"]', ESTADO.panel);
    const cancelar = $('[data-rc="cancelar"]', ESTADO.panel);
    if (modo) modo.hidden = !editando;
    if (titulo) titulo.textContent = editando ? 'Editar recuerdo' : 'Agregar recuerdo';
    if (guardarBtn) guardarBtn.textContent = editando ? 'Guardar cambios' : 'Publicar recuerdo';
    if (cancelar) cancelar.hidden = !editando;
  }

  function cargarEnFormulario(fila) {
    if (!ESTADO.panel) return;
    ESTADO.editando = fila;
    $('[data-rc="titulo"]', ESTADO.panel).value = fila.titulo || '';
    $('[data-rc="texto"]', ESTADO.panel).value = fila.texto || '';
    $('[data-rc="fecha"]', ESTADO.panel).value = fila.fecha ? String(fila.fecha).slice(0, 10) : hoyISO();
    ESTADO.stickers = Array.isArray(fila.stickers) ? fila.stickers.filter(Boolean).slice(0, 4) : [];
    ESTADO.medios = (Array.isArray(fila.media) ? fila.media : [])
      .filter((m) => m && m.url)
      .slice(0, 3)
      .map((m) => ({
        file: null,
        url: m.url,
        tipo: m.tipo || 'image',
        texto: m.texto || '',
        previewUrl: ''
      }));
    pintarChips();
    pintarSlots();
    actualizarModoPanel();
    pintarLista();
    ponerEstado(`Editando "${fila.titulo || 'sin título'}".`, 'ok');
    const cuerpo = $('.rc-body', ESTADO.panel);
    if (cuerpo) cuerpo.scrollTop = 0;
    const titulo = $('[data-rc="titulo"]', ESTADO.panel);
    if (titulo) {
      titulo.focus();
      titulo.select();
    }
  }

  function salirEdicion() {
    ESTADO.editando = null;
    limpiarFormulario();
    pintarLista();
    toast('Edición cancelada.');
  }

  async function moverPagina(posicion, direccion) {
    const destino = posicion + direccion;
    if (!conectar() || destino < 0 || destino >= ESTADO.filas.length) return;
    const filas = [...ESTADO.filas];
    const [fila] = filas.splice(posicion, 1);
    filas.splice(destino, 0, fila);
    const cambios = filas.map((f, i) => ({ id: f.id, orden: (i + 1) * 10 }));
    ESTADO.filas = filas.map((f, i) => ({ ...f, orden: (i + 1) * 10 }));
    pintarLista();
    aplicarAlLibro();
    try {
      const resultados = await Promise.all(cambios.map((cambio) =>
        ESTADO.sb.from(CONFIG.tabla).update({ orden: cambio.orden }).eq('id', cambio.id)));
      const fallo = resultados.find((r) => r.error);
      if (fallo) throw fallo.error;
      toast('Orden guardado.');
    } catch (error) {
      const mensaje = error && error.message ? error.message : String(error);
      toast(/column|schema cache/i.test(mensaje)
        ? 'Falta la columna de orden: ejecuta el SQL nuevo del panel.'
        : 'No se pudo guardar el nuevo orden.', 'error');
      await cargar();
    }
  }

  function limpiarFormulario() {
    if (!ESTADO.panel) return;
    $('[data-rc="titulo"]', ESTADO.panel).value = '';
    $('[data-rc="texto"]', ESTADO.panel).value = '';
    $('[data-rc="fecha"]', ESTADO.panel).value = hoyISO();
    ESTADO.stickers = [];
    ESTADO.medios.forEach((medio) => {
      if (medio && medio.previewUrl) URL.revokeObjectURL(medio.previewUrl);
    });
    ESTADO.medios = [];
    ESTADO.editando = null;
    pintarChips();
    pintarSlots();
    actualizarModoPanel();
    ponerEstado('', '');
  }

  function descargarRespaldo() {
    const datos = {
      exportado: new Date().toISOString(),
      recuerdos: ESTADO.filas,
      reacciones: ESTADO.reacciones,
      ajustes: ESTADO.ajustes
    };
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `respaldo-libro-${hoyISO()}.json`;
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('Respaldo descargado.');
  }

  async function borrarRecuerdo(fila) {
    if (!conectar()) return;
    if (!window.confirm(`¿Borrar la página "${fila.titulo || 'sin título'}"?`)) return;
    try {
      const respuesta = await ESTADO.sb.from(CONFIG.tabla).delete().eq('id', fila.id);
      if (respuesta.error) throw respuesta.error;

      const rutas = [];
      (Array.isArray(fila.media) ? fila.media : []).forEach((elemento) => {
        const ruta = rutaDeUrl(elemento && elemento.url);
        if (ruta) rutas.push(ruta);
      });
      ESTADO.reacciones
        .filter((reaccion) => reaccion.recuerdo_id === fila.id)
        .forEach((reaccion) => {
          const ruta = rutaDeUrl(reaccion.audio_url);
          if (ruta) rutas.push(ruta);
        });
      if (rutas.length) {
        try {
          await ESTADO.sb.storage.from(CONFIG.bucket).remove(rutas);
        } catch (errorArchivos) {
          console.warn('[Supabase] No se pudieron borrar los archivos:', errorArchivos);
        }
      }

      if (ESTADO.editando && ESTADO.editando.id === fila.id) {
        ESTADO.editando = null;
        limpiarFormulario();
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
