
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const unitSize = 20;
const visit = {};

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
  for (let x=1; x<=canvas.width/unitSize; x++) {
    for (let y=1; y<=canvas.height/unitSize; y++) {
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

  drawGrid(canvas.width, canvas.height, unitSize, "rgba(40,70,100,0.08)");
  if (scale !== 1) {
    drawGrid(canvas.width, canvas.height, scale*unitSize, `rgba(40,70,100,0.2)`);
    drawGrid(w, h, scale*unitSize, `rgba(40,70,100,0.4)`);
  }

  ctx.strokeStyle = "#555";
  const opacity = scale === 1 ? 0.15 : 0.3;
  ctx.fillStyle = `rgba(40,70,100,${opacity})`;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeRect(0, 0, w, h);

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
  drawNonCoprimes("rgba(0,0,0,0.1");
  drawBox();
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  draw();
}

resizeCanvas();
document.body.onresize = resizeCanvas;

function resizeBoxToMouse(e) {
  var x = Math.max(1, Math.round(e.offsetX / unitSize));
  var y = Math.max(1, Math.round(e.offsetY / unitSize));
  visit[`${x},${y}`] = true;
  state.w = x;
  state.h = y;
  draw();
}

function createMouseEvents() {
  let down = false;
  canvas.onmousemove = (e) => { if (down) resizeBoxToMouse(e); };
  canvas.onmousedown = (e) => { down = true; resizeBoxToMouse(e); };
  canvas.onmouseup = (e) => { down = false; };
}

createMouseEvents();
