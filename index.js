'use strict';

const state = {
  w: 30, // box width
  h: 20, // box height
  scale: gcd(30, 20), // box tile size

  animate: true, // does the user want animations?
  animating: false, // are we animating?
  backfilling: false, // are we backfilling tiles (during animation)
  tiles: [], // tiles {x,y,s} added during animation
  spaceLeft: null, // space remaining to be filled {x,y,w,h} by tiles
};

const unitSize = 20; // pixel size of single unit

// `await delay(100)` to pause inside an async function
function delay(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

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
// Animation
//----------------------------------------------------------------------

function tileBackfilled(tile) {
  // During animation, there is a backfilling phase.
  // Existing tiles that are not the size of the final determined `scale` size
  // will be backfilled.
  // Here we determine if a tile is already filled.
  return (
    tile.s === state.scale ||
    tile.rowsFilled === tile.s / state.scale
  );
}

function cutSpace({x,y,w,h}) {
  // Given a `spaceLeft` to fill, we cut out biggest possible square from it and
  // return both parts.
  const spaceLeft = {x,y,w,h};
  const tile = {x,y};
  tile.s = Math.min(w,h)
  tile.rowsFilled = 0;
  if (w > h) { spaceLeft.x += tile.s; spaceLeft.w -= tile.s; tile.fillDir = 'left'; }
  else       { spaceLeft.y += tile.s; spaceLeft.h -= tile.s; tile.fillDir = 'up'; }
  tile.isLast = Math.min(spaceLeft.w, spaceLeft.h) === 0;
  return {tile, spaceLeft};
}

function backfillableTile() {
  // Returns the first backfillable tile (working backwards from the end).
  for (let i=state.tiles.length-1; i>=0; i--) {
    if (!tileBackfilled(state.tiles[i])) {
      return i;
    }
  }
}

// TODO: create an array of states so we can scrub
async function backfillTiles() {
  while (true) {
    const tile = state.tiles[backfillableTile()];
    if (tile) {
      tile.rowsFilled++;
      draw();
      await delay(20);
    } else {
      break;
    }
  }
}

// TODO: create an array of states so we can scrub
async function fillTiles() {
  while (true) {
    const {x,y,w,h} = state.spaceLeft;
    const s = Math.min(w,h);
    if (s > 0) {
      const {tile,spaceLeft} = cutSpace(state.spaceLeft);
      state.tiles.push(tile);
      state.spaceLeft = spaceLeft;
      draw();
      await delay(s*15);
    }
    else {
      break;
    }
  }
}

async function animateTiles() {
  state.tiles = [];
  state.spaceLeft = {x:0,y:0,w:state.w,h:state.h};

  if (!state.animating) {
    state.animating = true;
    await delay(400);
    await fillTiles();

    state.highlightTile = true;
    draw();
    await delay(800);
    state.highlightTile = false;

    if (state.scale !== 1) {
      state.backfilling = true;
      await backfillTiles();
      state.backfilling = false;
    }
    state.tiles = [];
    state.animating = false;
    draw();
  }
}

//----------------------------------------------------------------------
// Draw
//----------------------------------------------------------------------

const unitStroke = 'rgba(40,70,100,0.08)';
const tileStrokeOut = 'rgba(40,70,100,0.2)';
const tileStrokeIn = 'rgba(40,70,100,0.4)';

const boxFill = 'rgba(40,70,100,0.15)';
const tileFill = 'rgba(40,70,100,0.15)';
const boxStroke = '#555';

const successFill = 'rgba(0,255,0,0.4)';
const failureFill = 'rgba(255,0,0,0.4)';

const fontSize = 20;
const smallFontSize = 16;

// determines if we should draw static tiles
// (not during animation and only when tiles are large enough)
function shouldDrawStaticTiles() {
  const {scale} = state;
  return scale !== 1 && !state.animating;
}

// determines if we should draw the `NxN` label inside the given tile
function shouldDrawTileLabel(tile) {
  const {s, rowsFilled, isLast} = tile;
  const {scale, backfilling} = state;
  if (backfilling) {
    if (s === scale) {
      if (isLast) {
        return true;
      }
    } else {
      if (rowsFilled === 0) {
        return true;
      }
    }
  }
  else {
    return true;
  }
}

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
  ctx.strokeStyle = boxStroke;
  const tx = (x+s - 0.3) * unitSize;
  const ty = (y+s - 0.3) * unitSize;
  const text = `${s}x${s}`;
  ctx.strokeText(text, tx, ty);
  ctx.fillText(text, tx, ty);
}

// draw box dimension size labels (and in terms of tiles if applicable)
function drawBoxLabels() {
  const {w,h,scale} = state;
  const pixelW = w * unitSize;
  const pixelH = h * unitSize;

  const pad = unitSize/2;
  ctx.font = `${fontSize}px Helvetica`;
  const activeFill = '#555';
  const inactiveFill = 'rgb(130, 140, 160)';

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

  // show tile info
  if (shouldDrawStaticTiles()) {
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

// draw all the tile outlines and labels
function drawTiles() {
  const {w,h,scale} = state;
  if (shouldDrawStaticTiles()) {
    const pixelW = w * unitSize;
    const pixelH = h * unitSize;
    drawGrid(canvasW, canvasH, scale*unitSize, tileStrokeOut);
    drawGrid(pixelW, pixelH, scale*unitSize, tileStrokeIn);
    ctx.fillStyle = tileFill;
    ctx.strokeStyle = tileStrokeIn;
    ctx.fillRect(0, 0, pixelW, pixelH);
    ctx.strokeRect(0, 0, pixelW, pixelH);
  }
  else {
    for (let tile of state.tiles) {
      const {x,y,s,isLast} = tile;
      ctx.fillStyle = isLast && state.highlightTile ? (s === 1 ? failureFill : successFill) : tileFill;
      ctx.strokeStyle = tileStrokeIn;
      ctx.fillRect(x*unitSize, y*unitSize, s*unitSize, s*unitSize);
      ctx.strokeRect(x*unitSize, y*unitSize, s*unitSize, s*unitSize);

      // draw rows
      const {rowsFilled, fillDir} = tile;
      if (shouldDrawTileLabel(tile)) {
        drawTileLabel(x,y,s);
      }
      if (rowsFilled > 0) {
        ctx.save();
        if (fillDir === 'left')    { ctx.translate((x+s)*unitSize, y*unitSize); ctx.rotate(Math.PI/2); }
        else if (fillDir === 'up') { ctx.translate((x+s)*unitSize, (y+s)*unitSize); ctx.rotate(Math.PI); }
        for (let row=0; row<rowsFilled; row++) {
          for (let col=0; col<s/scale; col++) {
            ctx.strokeRect(col*unitSize*scale, row*unitSize*scale, scale*unitSize, scale*unitSize);
          }
        }
        ctx.restore();
      }
    }
  }
}

function draw() {
  ctx.clearRect(0,0,canvasW,canvasH);
  drawGrid(canvasW, canvasH, unitSize, unitStroke);
  drawNonCoprimes();
  drawBox();
  drawTiles();
  drawBoxLabels();
}

//----------------------------------------------------------------------
// Mouse
//----------------------------------------------------------------------

function resizeBoxToMouse(e, resizeW, resizeH) {
  if (resizeW) { state.w = Math.max(1, Math.round(e.offsetX / unitSize)); }
  if (resizeH) { state.h = Math.max(1, Math.round(e.offsetY / unitSize)); }
  state.scale = gcd(state.w, state.h);

  if (state.animate) {
    animateTiles();
  }
  draw();
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
  if (resizeW && resizeH) { cursor = 'nwse-resize'; }
  else if (resizeW)       { cursor = 'ew-resize'; }
  else if (resizeH)       { cursor = 'ns-resize'; }
  else                    { cursor = 'default'; }
  return cursor;
}

function updateCursor(e) {
  document.body.style.cursor = getCursor(e);
}

function createMouseEvents() {
  let resizeW = false;
  let resizeH = false;
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
    if (resizeH || resizeW) {
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

resizeCanvas();
createMouseEvents();
