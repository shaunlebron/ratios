
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const unitSize = 20;

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
  canvas.style.width = virtualW + "px";
  canvas.style.height = virtualH + "px";
  ctx.scale(ratio, ratio);
  draw();
}

function gcd(n0, n1) {
  const a = Math.max(n0, n1);
  const b = Math.min(n0, n1);
  return (b === 0) ? a : gcd(b, a % b);
}

const state = {
  w: 30,
  h: 20,
};

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

function drawNonCoprimes(fillStyle) {
  for (let x=1; x<=virtualW/unitSize; x++) {
    for (let y=1; y<=virtualH/unitSize; y++) {
      const scale = gcd(x,y);
      if (scale !== 1) {
        const r = scale;
        ctx.beginPath();
        ctx.strokeStyle = (x === state.w && y === state.h) ? "#555" : fillStyle;
        ctx.ellipse(x*unitSize,y*unitSize,r,r,0,0,Math.PI*2);
        ctx.stroke();
      }
    }
  }
}

function drawBox() {
  const w = state.w * unitSize;
  const h = state.h * unitSize;

  const scale = gcd(state.w, state.h);

  drawGrid(virtualW, virtualH, unitSize, "rgba(40,70,100,0.08)");
  if (scale !== 1) {
    drawGrid(virtualW, virtualH, scale*unitSize, `rgba(40,70,100,0.2)`);
    drawGrid(w, h, scale*unitSize, `rgba(40,70,100,0.4)`);
  }

  ctx.strokeStyle = "#555";
  const opacity = scale === 1 ? 0.15 : 0.3;
  ctx.fillStyle = `rgba(40,70,100,${opacity})`;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeRect(0, 0, w, h);

  const pad = unitSize/2;
  const fontSize = 20;
  ctx.font = `${fontSize}px Helvetica`;
  const activeFill = "#555";
  const inactiveFill = "rgb(130, 140, 160)";

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = activeFill;
  ctx.fillText(state.h, w + pad, h/2);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = activeFill;
  ctx.fillText(state.w, w/2, h + pad + fontSize/2);

  if (scale !== 1) {
    const widthLabelPad = ctx.measureText(state.w).width;
    const heightLabelPad = ctx.measureText(state.h).width;
    const smallFontSize = 16;
    ctx.font = `${smallFontSize}px Helvetica`;

    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = inactiveFill;
    let tiles = state.h/scale;
    ctx.fillText(`(${tiles} tile${tiles>1?'s':''} high)`, w + pad, h/2 + pad*1.5);

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = inactiveFill;
    tiles = state.w/scale;
    ctx.fillText(`(${tiles} tile${tiles>1?'s':''} wide)`, w/2 + pad + widthLabelPad/2, h + pad + fontSize/2);

    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = activeFill;
    const x = (state.w - 0.5) * unitSize;
    const y = (state.h - 0.5) * unitSize;
    const text = `${scale}x${scale}`;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
  }
}

function draw() {
  ctx.clearRect(0,0,virtualW,virtualH);
  drawNonCoprimes("rgba(0,0,0,0.1");
  drawBox();
}

resizeCanvas();
document.body.onresize = resizeCanvas;

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
