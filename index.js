'use strict';

const state = {
  w: null, // box width
  h: null, // box height
  scale: null, // box tile size
  tiles: [], // tiles {x,y,s} added during animation
  animate: {
    scrubbing: false,
    enabled: true,
    t: null,
    total: null,
    phases: [],
  },
};

const animPhases = [
  {name:'wait', time: 200},
  {name:'fill', time: 1000},
  {name:'highlight', time: 800},
  {name:'backfill', time: 1000},
  {name:'fadeout', time: 200},
];
const animPhaseNames = {};
for (let phase of Object.values(animPhases)) {
  animPhaseNames[phase.name] = phase;
}

function updateSize(w,h) {
  state.w = w;
  state.h = h;
  state.scale = gcd(w,h);
  state.tiles = createTiles(w,h);
  initAnim();
  draw();
}

const unitSize = 20; // pixel size of single unit

//----------------------------------------------------------------------
// Canvas
//----------------------------------------------------------------------

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

let canvasW, canvasH;

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  canvasW = window.innerWidth;
  canvasH = window.innerHeight;
  canvas.width = canvasW * ratio;
  canvas.height = canvasH * ratio;
  canvas.style.width = `${canvasW}px`;
  canvas.style.height = `${canvasH}px`;
  ctx.scale(ratio, ratio);
  draw();
}
document.body.onresize = resizeCanvas;

//----------------------------------------------------------------------
// Math
//----------------------------------------------------------------------

// greatest common divisor (via euclidean algorithm)
function gcd(x,y) {
  const a = Math.max(x,y);
  const b = Math.min(x,y);
  return (b === 0) ? a : gcd(b, a % b);
}

//----------------------------------------------------------------------
// Tile Creation
//----------------------------------------------------------------------

// New plan is to make animation easier and as a side benefit make it scrubbable
// so the user can focus on parts they are interested in to learn it better.

// We must first create a list of tiles, easy enough.
// Then we need a draw function that draws all tiles at a given time.

// Timeline:
//           1s?              400ms              1s?
// |----------------------|-----------|------------------------|
// |                      |           |                        |
// | Fill tiles           | Highlight | Backfill large tiles   |
// |                      | last tile |                        |
// |                      |           |                        |
// |----------------------|-----------|------------------------|

// Each tile has its own time markers so it can draw itself at any given time:
// - fillStart
// - fillEnd
// - highlightStart
// - highlightEnd
// - backfillStart
// - backfillEnd

// Time can be distributed linearly based on distance traveled during animation,
// or just equal time for each tile.

function cutSpace({x,y,w,h,lastFillDir}) {
  // Given a `spaceLeft` to fill, we cut out biggest possible square from it and
  // return both parts.
  const spaceLeft = {x,y,w,h};
  const tile = {x,y};
  tile.s = Math.min(w,h)
  if (tile.s === 1) {
    tile.isLast = true; // stop early
  }
  tile.rowsFilled = 0;
  if (w > h)      { spaceLeft.x += tile.s; spaceLeft.w -= tile.s; tile.fillDir = 'x'; }
  else if (w < h) { spaceLeft.y += tile.s; spaceLeft.h -= tile.s; tile.fillDir = 'y'; }
  else         {
    spaceLeft.x += tile.s;
    spaceLeft.y += tile.s;
    spaceLeft.w = spaceLeft.h = 0;
    tile.fillDir = lastFillDir || 'x';
    tile.isLast = true;
  }
  spaceLeft.lastFillDir = tile.fillDir;
  return {tile, spaceLeft};
}

function* allTiles(w,h) {
  let spaceLeft = {x:0, y:0, w, h};
  let tile = {};
  while (!tile.isLast) {
    ({tile, spaceLeft} = cutSpace(spaceLeft));
    yield tile;
  }
}

function addAnimToTiles(tiles) {
  const pause = 2;
  const total = tiles.reduce((sum, {s}) => sum+s+pause, 0);
  // const total = tiles.length;
  let i = 0;
  for (let tile of tiles) {
    tile.fillStart = i/total;
    i += tile.s+pause;
    // i++;
    tile.fillEnd = i/total;
    tile.fillLength = tile.fillEnd - tile.fillStart;
  }
  const scale = tiles[tiles.length-1].s;
  i = 0;
  for (let tile of tiles.slice(0).reverse()) {
    tile.scale = scale;
    if (tile.s === scale) {
      continue;
    }
    tile.backfillStart = i/total;
    i += tile.s;
    tile.backfillEnd = i/total;
    tile.backfillLength = tile.backfillEnd - tile.backfillStart;
  }
}

function createTiles(w,h) {
  const tiles = Array.from(allTiles(w,h));
  addAnimToTiles(tiles);
  return tiles;
}

//----------------------------------------------------------------------
// Draw
//----------------------------------------------------------------------

const unitStroke = 'rgba(40,70,100,0.08)';
const tileStrokeOut = 'rgba(40,70,100,0.1)';
const tileStrokeIn = 'rgba(40,70,100,0.4)';

const boxFill = 'rgba(40,70,100,0.15)';
const tileFill = 'rgba(40,70,100,0.15)';
const boxStroke = '#555';

const successFill = 'rgba(0,255,0,0.4)';
const failureFill = 'rgba(255,0,0,0.4)';

const fontSize = 20;
const smallFontSize = 16;

// draw a simple grid in the given area
function drawGrid(w, h, unit, strokeStyle) {
  ctx.beginPath();
  for (let x=0; x<=w; x+=unit) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y=0; y<=h; y+=unit) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.strokeStyle = strokeStyle;
  ctx.stroke();
}

// draw a tile size indicator at the given point
function drawTileSizeIndicator(x,y,size) {
  const r = size;
  ctx.save();
  ctx.translate(x,y);
  // ctx.rotate(Math.PI/2);
  ctx.beginPath();
  ctx.moveTo(0,-r);
  ctx.lineTo(-r,0);
  ctx.lineTo(0,r);
  ctx.lineTo(r,0);
  ctx.closePath();
  ctx.restore();
}

// draw all tile size indicators at non-coprime points
function drawNonCoprimes(fillStyle) {
  for (let x=1; x<=canvasW/unitSize; x++) {
    for (let y=1; y<=canvasH/unitSize; y++) {
      const {w,h} = state;
      const scale = gcd(x,y);
      if (scale !== 1) {
        drawTileSizeIndicator(x*unitSize,y*unitSize,scale);
        ctx.strokeStyle = (x === w && y === h) ? '#555' : 'rgba(0,0,0,0.05)';
        ctx.stroke();
      }
    }
  }
}

// draw `NxN` inside the given tile
function drawTileLabel(x,y,s) {
  if (s === 1) {
    return;
  }
  ctx.font = `${smallFontSize}px Helvetica`;
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fff';
  // ctx.strokeStyle = boxStroke;
  const tx = (x+s - 0.3) * unitSize;
  const ty = (y+s - 0.3) * unitSize;
  const text = `${s}x${s}`;
  // ctx.strokeText(text, tx, ty);
  ctx.fillText(text, tx, ty);
}

// draw box dimension size labels (and in terms of tiles if applicable)
function drawBoxSizeLabels() {
  const {w,h,scale} = state;
  const pixelW = w * unitSize;
  const pixelH = h * unitSize;

  const pad = unitSize/2;
  ctx.font = `${fontSize}px Helvetica`;
  const activeFill = '#555';

  // show height
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = activeFill;
  ctx.fillText(state.h, pixelW + pad, pixelH/2);

  // show width
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = activeFill;
  ctx.fillText(w, pixelW/2, pixelH + pad + fontSize/2);
}

function drawBoxSizeTileLabels() {
  const {w,h,scale} = state;
  const pixelW = w * unitSize;
  const pixelH = h * unitSize;
  const pad = unitSize/2;

  const inactiveFill = 'rgb(130, 140, 160)';

  let x,y,text,tiles;
  const widthLabelPad = ctx.measureText(w).width;
  const heightLabelPad = ctx.measureText(h).width;
  ctx.font = `${smallFontSize}px Helvetica`;

  // show height in terms of tiles
  if (state.h <= 10) {
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    x = pixelW + 2*pad + heightLabelPad;
    y = pixelH/2;
  } else {
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    x = pixelW + pad;
    y = pixelH/2 + pad*1.5;
  }
  tiles = state.h/scale;
  text = `(${tiles} tile${tiles>1?'s':''} high)`;
  ctx.fillStyle = inactiveFill;
  ctx.fillText(text, x, y);

  // show width in terms of tiles
  if (w <= 10) {
    ctx.textBaseline = 'top';
    ctx.textAlign = w <= 4 ? 'left' : 'center';
    x = pixelW/2;
    y = pixelH + pad + fontSize;
  } else {
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    x = pixelW/2 + pad + widthLabelPad/2;
    y = pixelH + pad + fontSize/2;
  }
  ctx.fillStyle = inactiveFill;
  tiles = w/scale;
  text = `(${tiles} tile${tiles>1?'s':''} wide)`;
  ctx.fillText(text, x, y);

  drawTileLabel(w - scale, h - scale, scale);
}

// draw the current box shape
function drawBox() {
  const {w,h,scale} = state;
  const pixelW = w * unitSize;
  const pixelH = h * unitSize;

  ctx.strokeStyle = boxStroke;
  ctx.fillStyle = boxFill;
  ctx.fillRect(0, 0, pixelW, pixelH);
  ctx.strokeRect(0, 0, pixelW, pixelH);
}

function drawTileGrid() {
  const {w,h,scale} = state;
  const pixelW = w * unitSize;
  const pixelH = h * unitSize;
  drawGrid(canvasW, canvasH, scale*unitSize, tileStrokeOut);
  drawGrid(pixelW, pixelH, scale*unitSize, tileStrokeIn);
  ctx.fillStyle = tileFill;
  ctx.strokeStyle = tileStrokeIn;
  ctx.fillRect(0, 0, pixelW, pixelH);
  ctx.strokeRect(0, 0, pixelW, pixelH);
}

function draw() {
  ctx.clearRect(0,0,canvasW,canvasH);
  drawGrid(canvasW, canvasH, unitSize, unitStroke);
  drawNonCoprimes();
  drawBox();
  drawBoxSizeLabels();
  drawAnimLayer(state.animate.t);
}

//----------------------------------------------------------------------
// Draw Animation
//----------------------------------------------------------------------

function drawTileFill(tile, time) {
  const {fillStart, fillLength} = tile;
  if (time < fillStart) {
    // draw nothing
  } else {
    // draw growing tile
    const t = Math.min(1, (time - fillStart) / fillLength);
    const {x,y,s} = tile;
    const w = s * (tile.fillDir === 'x' ? t : 1);
    const h = s * (tile.fillDir === 'y' ? t : 1);
    ctx.fillStyle = tileFill;
    ctx.strokeStyle = tileStrokeIn;
    ctx.fillRect(x*unitSize, y*unitSize, w*unitSize, h*unitSize);
    ctx.strokeRect(x*unitSize, y*unitSize, w*unitSize, h*unitSize);
    if (t === 1) {
      drawTileLabel(x,y,s);
    }
  }
}

function drawTileHighlight(tile, time) {
  const {x,y,s,scale,isLast} = tile;
  if (isLast) {
    ctx.fillStyle = tileFill;
    ctx.fillRect(x*unitSize, y*unitSize, s*unitSize, s*unitSize);
    ctx.fillStyle = (s === 1) ? failureFill : successFill;
    ctx.fillRect(x*unitSize, y*unitSize, s*unitSize, s*unitSize);
    ctx.strokeStyle = tileStrokeIn;
    ctx.strokeRect(x*unitSize, y*unitSize, s*unitSize, s*unitSize);
    drawTileLabel(x,y,s);
  } else {
    ctx.fillStyle = tileFill;
    ctx.strokeStyle = tileStrokeIn;
    ctx.fillRect(x*unitSize, y*unitSize, s*unitSize, s*unitSize);
    ctx.strokeRect(x*unitSize, y*unitSize, s*unitSize, s*unitSize);
    ctx.save();
    const fade = animPhaseNames.backfill.skip ? 0 : 0.5;
    ctx.globalAlpha *= (time < (1-fade) ? 1 : (1 - time) / fade);
    drawTileLabel(x,y,s);
    ctx.restore();
  }
}

function drawTileBackfill(tile, time) {
  const {x,y,s,scale,fillDir} = tile;
  const {backfillStart, backfillLength} = tile;

  if (tile.isLast) {
    drawTileHighlight(tile, 1);
  }
  else if (backfillStart == null) {
    ctx.fillStyle = tileFill;
    ctx.fillRect(x*unitSize, y*unitSize, s*unitSize, s*unitSize);
    ctx.strokeStyle = tileStrokeIn;
    ctx.strokeRect(x*unitSize, y*unitSize, s*unitSize, s*unitSize);
  }
  else if (time < backfillStart) {
    ctx.fillStyle = tileFill;
    ctx.fillRect(x*unitSize, y*unitSize, s*unitSize, s*unitSize);
    ctx.strokeStyle = tileStrokeIn;
    ctx.strokeRect(x*unitSize, y*unitSize, s*unitSize, s*unitSize);
  }
  else {
    ctx.fillStyle = tileFill;
    ctx.fillRect(x*unitSize, y*unitSize, s*unitSize, s*unitSize);
    ctx.strokeStyle = tileStrokeIn;
    ctx.strokeRect(x*unitSize, y*unitSize, s*unitSize, s*unitSize);

    const t = Math.min(1, (time - backfillStart) / backfillLength);
    const numTiles = s / scale;
    const rowProgress = t * numTiles;
    const rows = Math.ceil(rowProgress);
    const cols = numTiles;
    let lastRowScale = rowProgress % 1;
    if (lastRowScale === 0) {
      lastRowScale = 1;
    }

    ctx.save();
    if (fillDir === 'x')      { ctx.translate((x+s)*unitSize, y*unitSize); ctx.rotate(Math.PI/2); }
    else if (fillDir === 'y') { ctx.translate((x+s)*unitSize, (y+s)*unitSize); ctx.rotate(Math.PI); }
    ctx.strokeStyle = tileStrokeIn;
    for (let row=0; row<rows; row++) {
      const h = scale*unitSize*(row === rows-1 ? lastRowScale : 1);
      for (let col=0; col<cols; col++) {
        const x = col*scale*unitSize;
        const y = row*scale*unitSize;
        const w = scale*unitSize;
        ctx.strokeRect(x, y, w, h);
      }
    }
    ctx.restore();
  }
}

function drawAnimTile(tile, phase, time) {
  switch (phase) {
    case 'fill': drawTileFill(tile, time); break;
    case 'highlight': drawTileHighlight(tile, time); break;
    case 'backfill': drawTileBackfill(tile, time); break;
    case 'fadeout':
      if (time < 1) {
        ctx.save();
        ctx.globalAlpha *= (1-time)/1;
        if (animPhaseNames.backfill.skip) {
          drawTileHighlight(tile, 1);
        } else {
          drawTileBackfill(tile, 1);
        }
        ctx.restore();
      }
      break;
  }
}

//----------------------------------------------------------------------
// Animation Timing
//----------------------------------------------------------------------

function* allPhases() {
  for (let phase of animPhases) {
    if (!phase.skip) {
      yield phase;
    }
  }
}

function getPhase(t) {
  const phases = state.animate.phases;
  let p;
  for (p of phases) {
    if (t < p.time) { return { phase: p.name, time: t / p.time }; }
    t -= p.time;
  }
  return { phase: p.name, time: 1 };
}

function initAnim() {
  const skip = (state.scale === 1 || state.tiles[0].s === state.scale);
  animPhaseNames.backfill.skip = skip
  const phases = Array.from(allPhases());
  const total = phases.reduce((sum, {time}) => sum+time, 0);
  state.animate.phases = phases;
  state.animate.total = total;
  state.animate.t = state.animate.enabled ? 0 : total;
}

function drawAnimLayer(t) {
  const {phase, time} = getPhase(t);
  console.log('phase', phase);
  if (phase === 'wait') {
    return;
  }
  for (let tile of state.tiles) {
    drawAnimTile(tile, phase, time);
  }
  if (phase === 'fadeout') {
    ctx.save();
    ctx.globalAlpha *= time;
    if (state.scale !== 1) {
      drawTileGrid();
      drawBoxSizeTileLabels();
    }
    ctx.restore();
  }
}

function advanceAnim(dt) {
  state.animate.t += dt;
  draw();
}

let lastTime;
function tick(t) {
  let dt;
  if (lastTime) {
    dt = t - lastTime;
  } else {
    dt = 0;
  }
  lastTime = t;
  if (state.animate.t < state.animate.total && !state.animate.scrubbing) {
    advanceAnim(dt);
  }
  window.requestAnimationFrame(tick);
}

//----------------------------------------------------------------------
// Mouse
//----------------------------------------------------------------------

function resizeBoxToMouse(e, resizeW, resizeH) {
  let {w,h} = state;
  if (resizeW) { w = Math.max(1, Math.round(e.offsetX / unitSize)); }
  if (resizeH) { h = Math.max(1, Math.round(e.offsetY / unitSize)); }
  if (state.w !== w || state.h !== h) {
    updateSize(w,h);
  }
}

function canResizeWidth(e) {
  const x = e.offsetX/unitSize;
  const y = e.offsetY/unitSize;
  return Math.abs(x-state.w) < 0.5 && y < state.h + 0.5;
}

function canResizeHeight(e) {
  const x = e.offsetX/unitSize;
  const y = e.offsetY/unitSize;
  return Math.abs(y-state.h) < 0.5 && x < state.w + 0.5;
}

function getCursor(e) {
  const resizeW = canResizeWidth(e);
  const resizeH = canResizeHeight(e);
  let cursor;
  if (state.animate.scrubbing) { cursor = '-webkit-grabbing'; }
  else if (resizeW && resizeH) { cursor = 'nwse-resize'; }
  else if (resizeW)            { cursor = 'ew-resize'; }
  else if (resizeH)            { cursor = 'ns-resize'; }
  else                         { cursor = 'default'; }
  return cursor;
}

function updateCursor(e) {
  const cursor = getCursor(e);
  document.body.style.cursor = cursor;
}

function createMouseEvents() {
  let resizeW = false;
  let resizeH = false;
  let mouseX, mouseY;
  document.body.onkeydown = (e) => {
    if (e.key === 'Shift') {
      state.animate.scrubbing = true;
      state.animate.t = state.animate.total * mouseX / window.innerWidth;
      draw();
      updateCursor(e);
    }
  };
  document.body.onkeyup = (e) => {
    if (e.key === 'Shift') {
      state.animate.scrubbing = false;
      updateCursor(e);
    }
  };
  canvas.onmousedown = (e) => {
    if (e.button !== 0) {
      return;
    }
    updateCursor(e);
    resizeW = canResizeWidth(e);
    resizeH = canResizeHeight(e);
    if (!resizeW && !resizeH) {
      resizeW = true;
      resizeH = true;
    }
    resizeBoxToMouse(e, resizeW, resizeH);
  };
  canvas.onmousemove = (e) => {
    mouseX = e.offsetX;
    mouseY = e.offsetY;
    if (state.animate.scrubbing) {
      state.animate.t = state.animate.total * mouseX / window.innerWidth;
      draw();
    } else if (resizeH || resizeW) {
      resizeBoxToMouse(e, resizeW, resizeH);
    } else {
      updateCursor(e);
    }
  };
  canvas.onmouseup = (e) => {
    if (e.button !== 0) {
      return;
    }
    resizeW = false;
    resizeH = false;
    updateCursor(e);
  };
}

//----------------------------------------------------------------------
// Load
//----------------------------------------------------------------------

updateSize(35,20);
resizeCanvas();
createMouseEvents();
window.requestAnimationFrame(tick);
