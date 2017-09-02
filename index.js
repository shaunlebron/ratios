
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const unitSize = 20;

function gcd(n0, n1) {
  const a = Math.max(n0, n1);
  const b = Math.min(n0, n1);
  return (b === 0) ? a : gcd(b, a % b);
}

const state = {
  w: 1,
  h: 1,
};

function drawGrid(w, h, unit, strokeStyle) {
  ctx.beginPath();
  for (let x=0; x<=w; x+=unit) {
    ctx.moveTo(x, 0); ctx.lineTo(x, h); // vertical line
  }
  for (let y=0; y<=h; y+=unit) {
    ctx.moveTo(0, y); ctx.lineTo(w, y); // horizontal line
  }
  ctx.strokeStyle = strokeStyle;
  ctx.stroke();
}

function drawBox() {
  ctx.strokeStyle = "#555";
  ctx.fillStyle = "rgba(40,70,100,0.2)";
  const w = state.w * unitSize;
  const h = state.h * unitSize;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeRect(0, 0, w, h);

  const relUnit = gcd(state.w, state.h);
  if (relUnit !== 1) {
    drawGrid(w, h, relUnit*unitSize, "rgba(40,70,100,0.3)");
  }

  const pad = unitSize/2;
  ctx.fillStyle = "#555";
  ctx.font = '20px Helvetica';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(state.h, w + pad, h/2);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  ctx.fillText(state.w, w/2, h + pad);
}

function draw() {
  ctx.clearRect(0,0,canvas.width, canvas.height);
  drawGrid(canvas.width, canvas.height, unitSize, "#f5f5f5");
  drawBox();
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  draw();
}

resizeCanvas();
document.body.onresize = resizeCanvas;

function onMouseUpdate(e, mousedown) {
  if (mousedown) {
    state.w = Math.ceil(e.offsetX / unitSize);
    state.h = Math.ceil(e.offsetY / unitSize);
    draw();
  }
}

function createMouseEvents() {
  let mousedown = false;
  const update = (e) => onMouseUpdate(e, mousedown);
  canvas.onmousemove = update;
  canvas.onmousedown = (e) => { mousedown = true; update(e) };
  canvas.onmouseup = (e) => { mousedown = false; update(e) };
}

createMouseEvents();
