"use client";

import { useEffect, useRef, useState } from "react";

/* ════════════════════════════════════════════════════════════════
   KNIGHT ANIMATION PLAYGROUND  —  single file, drop in src/app/page.tsx
   Edit the CONFIG block below to plug in your sprite sheets.
   ════════════════════════════════════════════════════════════════ */

/* ── CONFIG ─────────────────────────────────────────────────── */

/** Folder inside /public holding your sheets. "" = directly in public/, "/sprites" = public/sprites/ */
const SPRITE_DIR = "knight-withArmour";
/** Integer zoom for pixel art. */
const SCALE = 4;
/** Height of the knight himself inside a cell (the "character.size" in your JSON). */
const CHAR_SIZE = 48;
/** Page background behind everything, e.g. "url(/bg.jpg) center / cover". */
const BACKGROUND = "linear-gradient(#2b3a67, #6b4a7a)";
/** How dark the area OUTSIDE the box is (0 = none, 1 = black). */
const DARKEN = 0.72;

type Facing = "east" | "west";

/** Where an animation lives in the image: row, and starting column (default 0). */
type Cell = { row: number; col?: number };

type Sheet = {
  src: string;
  cellWidth: number; // px, one cell in the source image
  cellHeight: number;
  columns: number; // columns in the whole image
  rows: number; // rows in the whole image
  at: Partial<Record<Facing, Cell>>; // where each direction's frames start
  frames: number; // frames in the animation
  fps: number;
};

type Outfit = "armoured" | "bare";

type Action = {
  id: string;
  label: string;
  loop: boolean; // true = repeats (click again to stop), false = plays once, then idle
  sheet: Sheet;
  bareSheet?: Sheet; // optional separate art once the armour is off
  setsOutfit?: Outfit; // outfit applied when a one-shot finishes
};

/** Builds a Sheet from the numbers in your spritesheet JSON (square cells). */
const sheet = (o: {
  file: string;
  cell: number; // spritesheet.cell_size
  columns: number; // spritesheet.columns
  rows: number; // sheet height ÷ cell size
  frames: number; // rows[n].frame_count
  fps: number;
  at: Sheet["at"];
}): Sheet => ({
  src: `${SPRITE_DIR}/${o.file}`,
  cellWidth: o.cell,
  cellHeight: o.cell,
  columns: o.columns,
  rows: o.rows,
  frames: o.frames,
  fps: o.fps,
  at: o.at,
});

/* Walking sheet · 640×240 · 80px cells · 8 columns
     row 0 = 8 rotations   row 1 = walk east (6)   row 2 = walk west (6) */
const WALK_FILE = "knight-walking.png";
const WALKING = sheet({
  file: WALK_FILE, cell: 80, columns: 8, rows: 3, frames: 6, fps: 8,
  at: { east: { row: 1 }, west: { row: 2 } },
});
/* Idle = a single still frame from the rotation row (index 2 = east, 6 = west). */
const IDLE_SHEET = sheet({
  file: WALK_FILE, cell: 80, columns: 8, rows: 3, frames: 1, fps: 1,
  at: { east: { row: 0, col: 2 }, west: { row: 0, col: 6 } },
});

/* "Removing_the_Armour" file · 612×136 · 68px cells · 9 columns
     row 0 = 8 rotations   row 1 = 9 frames facing east
   NOTE: your JSON says this row is the PUSHUPS animation, so it's wired to Pushups. */
const PUSHUPS = sheet({
  file: "knight-doing-pushups.png", cell: 68, columns: 9, rows: 2, frames: 9, fps: 8,
  at: { east: { row: 1 } },
});

/* Not generated yet → these show a placeholder until you add the files and fix the numbers. */
const SHARPEN = sheet({
  file: "sharpen.png", cell: 68, columns: 9, rows: 2, frames: 8, fps: 8,
  at: { east: { row: 1 } },
});
const REMOVE_ARMOUR = sheet({
  file: "knight-undress.png", // or keep "knight-undress.png" and rename my file to match
  cell: 68, columns: 9, rows: 2,
  frames: 9,   // was 8, which would cut off the final rogue frame
  fps: 4,      // was 8; try 3 or 4
  at: { east: { row: 1 } },
});

/** Plays when nothing else is. Not a button. */
const IDLE: Action = { id: "idle", label: "Idle", loop: true, sheet: IDLE_SHEET };

/** The buttons, in order. Copy an entry to add another. */
const ACTIONS: Action[] = [
  { id: "walking", label: "Walking", loop: true, sheet: WALKING },
  { id: "pushups", label: "Pushups", loop: true, sheet: PUSHUPS },
  { id: "sharpen", label: "Sharpen sword", loop: true, sheet: SHARPEN },
  { id: "remove-armour", label: "Remove armour", loop: false, sheet: REMOVE_ARMOUR, setsOutfit: "bare" },
];

/* ── Sprite player ──────────────────────────────────────────── */

function SpriteView({
  sheet,
  facing,
  loop,
  label,
  onDone,
}: {
  sheet: Sheet;
  facing: Facing;
  loop: boolean;
  label: string;
  onDone?: () => void;
}) {
  const [frame, setFrame] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");

  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  // Does the image file exist?
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => !cancelled && setStatus("ready");
    img.onerror = () => !cancelled && setStatus("missing");
    img.src = sheet.src;
    return () => {
      cancelled = true;
    };
  }, [sheet.src]);

  // Frame clock (also drives the placeholder so one-shots still finish).
  useEffect(() => {
    const frameMs = 1000 / sheet.fps;
    let raf = 0;
    let start: number | null = null;
    let shown = 0;
    const tick = (now: number) => {
      if (start === null) start = now;
      const n = Math.floor((now - start) / frameMs);
      if (!loop && n >= sheet.frames) {
        setFrame(sheet.frames - 1);
        onDoneRef.current?.();
        return;
      }
      const next = n % sheet.frames;
      if (next !== shown) {
        shown = next;
        setFrame(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sheet.fps, sheet.frames, loop]);

  const w = sheet.cellWidth * SCALE;
  const h = sheet.cellHeight * SCALE;

  // Pick the row for this direction; if only the opposite direction exists, mirror it.
  const direct = sheet.at[facing];
  const other = sheet.at[facing === "east" ? "west" : "east"];
  const loc: Cell = direct ?? other ?? { row: 0 };
  const flip = !direct && !!other;

  if (status === "ready") {
    return (
      <div
        role="img"
        aria-label={label}
        style={{
          width: w,
          height: h,
          backgroundImage: `url(${sheet.src})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: `${sheet.columns * w}px ${sheet.rows * h}px`,
          backgroundPosition: `${-((loc.col ?? 0) + frame) * w}px ${-loc.row * h}px`,
          imageRendering: "pixelated",
          transform: flip ? "scaleX(-1)" : undefined,
        }}
      />
    );
  }

  // Placeholder until the sprite file exists.
  return (
    <div
      role="img"
      aria-label={`${label} (placeholder)`}
      style={{
        width: w,
        height: h,
        border: "2px dashed #f6c453",
        background: "rgba(246,196,83,.12)",
        color: "#f6c453",
        fontSize: 11,
        lineHeight: 1.6,
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 8,
        boxSizing: "border-box",
        wordBreak: "break-all",
      }}
    >
      <span>{label}</span>
      <span style={{ color: "#fff" }}>
        {frame + 1}/{sheet.frames}
      </span>
      <span style={{ opacity: 0.7 }}>{status === "missing" ? `add ${sheet.src}` : "loading…"}</span>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */

const ALL: Action[] = [IDLE, ...ACTIONS];
const TALLEST_CELL =
  Math.max(...ALL.flatMap((a) => [a.sheet.cellHeight, a.bareSheet?.cellHeight ?? 0])) * SCALE;
/* The knight's feet rest on the ground line (top of the ground = 82% of the box). */
const FEET_Y = (CHAR_SIZE * SCALE) / 2;
const STAGE_MIN_HEIGHT = Math.ceil((FEET_Y + TALLEST_CELL / 2) / 0.78);

const CSS = `
.kn-stage{position:relative;z-index:1;width:100%;aspect-ratio:16/9;overflow:hidden;
  background:#1d2233;border:4px solid #e9e2d0;
  /* the huge spread darkens everything outside the box */
  box-shadow:0 0 0 200vmax rgba(0,0,0,${DARKEN})}
.kn-ground{position:absolute;left:0;right:0;bottom:0;height:18%;background:#3b2f4a;border-top:4px solid #e9e2d0}
/* cells are centred on the knight, so centre the cell and nudge up by half his height */
.kn-actor{position:absolute;left:50%;top:calc(82% - ${FEET_Y}px);transform:translate(-50%,-50%)}
.kn-controls{position:relative;z-index:2;display:flex;flex-wrap:wrap;justify-content:center;gap:12px}
.kn-btn{font:inherit;font-size:12px;padding:12px 16px;color:#f3efe2;background:#1d2233;
  border:3px solid #e9e2d0;box-shadow:4px 4px 0 #000;cursor:pointer}
.kn-btn:hover:not(:disabled){transform:translate(-1px,-1px);box-shadow:5px 5px 0 #000}
.kn-btn:active:not(:disabled){transform:translate(3px,3px);box-shadow:1px 1px 0 #000}
.kn-btn[data-active]{background:#f6c453;color:#14161f;border-color:#f6c453}
.kn-btn[data-quiet]{opacity:.75}
.kn-btn:disabled{opacity:.4;cursor:not-allowed}
.kn-btn:focus-visible{outline:3px solid #f6c453;outline-offset:3px}
`;

export default function Page() {
  const [outfit, setOutfit] = useState<Outfit>("armoured");
  const [facing, setFacing] = useState<Facing>("east");
  const [current, setCurrent] = useState({ id: IDLE.id, run: 0 }); // `run` restarts the animation

  const action = ALL.find((a) => a.id === current.id) ?? IDLE;
  const sheet = outfit === "bare" && action.bareSheet ? action.bareSheet : action.sheet;
  const busy = !action.loop; // a one-shot is playing

  const play = (id: string) => setCurrent((c) => ({ id, run: c.run + 1 }));

  const onDone = () => {
    if (action.setsOutfit) setOutfit(action.setsOutfit);
    play(IDLE.id);
  };

  const onButton = (a: Action) => {
    if (a.loop && current.id === a.id) play(IDLE.id); // looping actions toggle
    else play(a.id);
  };

  return (
    <main
      style={{
        minHeight: "100svh",
        display: "grid",
        placeItems: "center",
        padding: 16,
        overflow: "hidden",
        background: BACKGROUND,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      }}
    >
      <style>{CSS}</style>

      <div style={{ width: "100%", maxWidth: 768, display: "flex", flexDirection: "column", gap: 28 }}>
        <div className="kn-stage" style={{ minHeight: STAGE_MIN_HEIGHT }} aria-live="polite">
          <div className="kn-ground" />
          <div className="kn-actor">
            <SpriteView
              key={`${current.id}-${outfit}-${facing}-${current.run}`}
              sheet={sheet}
              facing={facing}
              loop={action.loop}
              label={action.label}
              onDone={busy ? onDone : undefined}
            />
          </div>
        </div>

        <div className="kn-controls">
          {ACTIONS.map((a) => {
            const active = current.id === a.id;
            const alreadyDone = a.setsOutfit !== undefined && a.setsOutfit === outfit;
            return (
              <button
                key={a.id}
                type="button"
                className="kn-btn"
                aria-pressed={a.loop ? active : undefined}
                data-active={active || undefined}
                disabled={busy || alreadyDone}
                onClick={() => onButton(a)}
              >
                {alreadyDone ? "Armour off" : a.label}
              </button>
            );
          })}
          <button
            type="button"
            className="kn-btn"
            disabled={busy}
            onClick={() => setFacing((f) => (f === "east" ? "west" : "east"))}
          >
            Turn around
          </button>
          <button
            type="button"
            className="kn-btn"
            data-quiet
            onClick={() => {
              setOutfit("armoured");
              setFacing("east");
              play(IDLE.id);
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </main>
  );
}