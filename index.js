'use strict';

const state = {
  w: 30, // box width
  h: 20, // box height
};

const unitSize = 20; // pixel size of single unit

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
resizeCanvas();
document.body.onresize = resizeCanvas;

//----------------------------------------------------------------------
// Draw
//----------------------------------------------------------------------

function gcd(n0, n1) {
  // greatest common divisor (via euclidean algorithm)
  const a = Math.max(n0, n1);
  const b = Math.min(n0, n1);
  return (b === 0) ? a : gcd(b, a % b);
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

function drawGrids() {
  const w = state.w * unitSize;
  const h = state.h * unitSize;
  const scale = gcd(state.w, state.h);
  drawGrid(virtualW, virtualH, unitSize, 'rgba(40,70,100,0.08)');
  if (scale !== 1) {
    drawGrid(virtualW, virtualH, scale*unitSize, `rgba(40,70,100,0.2)`);
    drawGrid(w, h, scale*unitSize, `rgba(40,70,100,0.4)`);
  }
}

function drawBoxLabels() {
  const w = state.w * unitSize;
  const h = state.h * unitSize;
  const scale = gcd(state.w, state.h);

  const pad = unitSize/2;
  const fontSize = 20;
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
  if (scale !== 1) {
    let x,y,text,tiles;
    const widthLabelPad = ctx.measureText(state.w).width;
    const heightLabelPad = ctx.measureText(state.h).width;
    const smallFontSize = 16;
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

    // show tile size
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = activeFill;
    x = (state.w - 0.5) * unitSize;
    y = (state.h - 0.5) * unitSize;
    text = `${scale}x${scale}`;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
  }
}

function drawBox() {
  const w = state.w * unitSize;
  const h = state.h * unitSize;
  const scale = gcd(state.w, state.h);

  ctx.strokeStyle = '#555';
  const opacity = scale === 1 ? 0.15 : 0.3;
  ctx.fillStyle = `rgba(40,70,100,${opacity})`;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeRect(0, 0, w, h);

  drawBoxLabels();
}

function draw() {
  ctx.clearRect(0,0,virtualW,virtualH);
  drawNonCoprimes();
  drawGrids();
  drawBox();
}

//----------------------------------------------------------------------
// Mouse
//----------------------------------------------------------------------

function resizeBoxToMouse(e, resizeW, resizeH) {
  if (resizeW) { state.w = Math.max(1, Math.round(e.offsetX / unitSize)); }
  if (resizeH) { state.h = Math.max(1, Math.round(e.offsetY / unitSize)); }
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

createMouseEvents();
