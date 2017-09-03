'use strict';

const state = {
  w: 30, // box width
  h: 20, // box height
  animate: true,
  animating: false,
  filledTiles: [],
  spaceLeft: null,
};

const unitSize = 20; // pixel size of single unit

function delay(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

//----------------------------------------------------------------------
// Canvas
//----------------------------------------------------------------------

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

let virtualW = 0;
let virtualH = 0;
let pixelW = 0;
let pixelH = 0;

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  virtualW = window.innerWidth;
  virtualH = window.innerHeight;
  pixelW = virtualW * ratio;
  pixelH = virtualH * ratio;
  canvas.width = pixelW;
  canvas.height = pixelH;
  canvas.style.width = virtualW + 'px';
  canvas.style.height = virtualH + 'px';
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

function nextSpace({x,y,w,h}) {
  let s = Math.min(w,h);
  if (w > h) { x += s; w -= s; }
  else       { y += s; h -= s; }
  return {x,y,w,h};
}

async function animateTiles(width,height) {
  await delay(400);
  while (true) {
    const {x,y,w,h} = state.spaceLeft;
    const s = Math.min(w,h);
    if (s > 0) {
      state.filledTiles.push({x,y,s});
      state.spaceLeft = nextSpace(state.spaceLeft);
      draw();
      await delay(s*15);
    } else {
      draw();
      break;
    }
  }
  await delay(300);
  state.filledTiles = [];
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

const fontSize = 20;
const smallFontSize = 16;

function shouldShowTiles() {
  const scale = gcd(state.w, state.h);
  return scale !== 1 && !state.animating;
}

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

function drawNonCoprimes(fillStyle) {
  for (let x=1; x<=virtualW/unitSize; x++) {
    for (let y=1; y<=virtualH/unitSize; y++) {
      const scale = gcd(x,y);
      if (scale !== 1) {
        drawTileSizeIndicator(x*unitSize,y*unitSize,scale);
        ctx.strokeStyle = (x === state.w && y === state.h) ? '#555' : 'rgba(0,0,0,0.05)';
        ctx.stroke();
      }
    }
  }
}

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

function drawBoxLabels() {
  const w = state.w * unitSize;
  const h = state.h * unitSize;
  const scale = gcd(state.w, state.h);

  const pad = unitSize/2;
  ctx.font = `${fontSize}px Helvetica`;
  const activeFill = '#555';
  const inactiveFill = 'rgb(130, 140, 160)';

  // show height
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = activeFill;
  ctx.fillText(state.h, w + pad, h/2);

  // show width
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = activeFill;
  ctx.fillText(state.w, w/2, h + pad + fontSize/2);

  // show tile info
  if (shouldShowTiles()) {
    let x,y,text,tiles;
    const widthLabelPad = ctx.measureText(state.w).width;
    const heightLabelPad = ctx.measureText(state.h).width;
    ctx.font = `${smallFontSize}px Helvetica`;

    // show height in terms of tiles
    if (state.h <= 10) {
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      x = w + 2*pad + heightLabelPad;
      y = h/2;
    } else {
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      x = w + pad;
      y = h/2 + pad*1.5;
    }
    tiles = state.h/scale;
    text = `(${tiles} tile${tiles>1?'s':''} high)`;
    ctx.fillStyle = inactiveFill;
    ctx.fillText(text, x, y);

    // show width in terms of tiles
    if (state.w <= 10) {
      ctx.textBaseline = 'top';
      ctx.textAlign = state.w <= 4 ? 'left' : 'center';
      x = w/2;
      y = h + pad + fontSize;
    } else {
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      x = w/2 + pad + widthLabelPad/2;
      y = h + pad + fontSize/2;
    }
    ctx.fillStyle = inactiveFill;
    tiles = state.w/scale;
    text = `(${tiles} tile${tiles>1?'s':''} wide)`;
    ctx.fillText(text, x, y);

    drawTileLabel(state.w - scale, state.h - scale, scale);
  }
}

function drawBox() {
  const w = state.w * unitSize;
  const h = state.h * unitSize;
  const scale = gcd(state.w, state.h);

  ctx.strokeStyle = boxStroke;
  ctx.fillStyle = boxFill;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeRect(0, 0, w, h);
}

function drawTileAnimation() {
  if (shouldShowTiles()) {
    const w = state.w * unitSize;
    const h = state.h * unitSize;
    const scale = gcd(state.w, state.h);
    drawGrid(virtualW, virtualH, scale*unitSize, tileStrokeOut);
    drawGrid(w, h, scale*unitSize, tileStrokeIn);
    ctx.fillStyle = tileFill;
    ctx.strokeStyle = tileStrokeIn;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeRect(0, 0, w, h);
  }
  else {
    for (let {x,y,s} of state.filledTiles) {
      ctx.fillStyle = tileFill;
      ctx.strokeStyle = tileStrokeIn;
      ctx.fillRect(x*unitSize, y*unitSize, s*unitSize, s*unitSize);
      ctx.strokeRect(x*unitSize, y*unitSize, s*unitSize, s*unitSize);
      drawTileLabel(x,y,s);
    }
  }
}

function draw() {
  ctx.clearRect(0,0,virtualW,virtualH);
  drawGrid(virtualW, virtualH, unitSize, unitStroke);
  drawNonCoprimes();
  drawBox();
  drawTileAnimation();
  drawBoxLabels();
}

//----------------------------------------------------------------------
// Mouse
//----------------------------------------------------------------------

async function resizeBoxToMouse(e, resizeW, resizeH) {
  if (resizeW) { state.w = Math.max(1, Math.round(e.offsetX / unitSize)); }
  if (resizeH) { state.h = Math.max(1, Math.round(e.offsetY / unitSize)); }

  if (state.animate) {
    state.filledTiles = [];
    state.spaceLeft = {x:0,y:0,w:state.w,h:state.h};

    if (!state.animating) {
      state.animating = true;
      draw();
      await animateTiles(state.w, state.h);
      state.animating = false;
    }
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
