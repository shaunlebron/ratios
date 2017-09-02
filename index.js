
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const unitSize = 20;

const state = {
  width: 0,
  height: 0,
};

function drawGrid() {
  ctx.beginPath();
  const right = canvas.width;
  const bottom = canvas.height;
  for (let x=0; x<right; x+=unitSize) {
    for (let y=0; y<bottom; y+=unitSize) {
      ctx.moveTo(x, 0); ctx.lineTo(x, bottom); // vertical line
      ctx.moveTo(0, y); ctx.lineTo(right, y); // horizontal line
    }
  }
  ctx.strokeStyle = "#f5f5f5";
  ctx.stroke();
}

function drawBox() {
  ctx.strokeStyle = "#555";
  ctx.fillStyle = "rgba(40,70,100,0.2)";
  const w = state.width * unitSize;
  const h = state.height * unitSize;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeRect(0, 0, w, h);

  const pad = unitSize/2;
  ctx.fillStyle = "#555";
  ctx.font = '20px Helvetica';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(state.height, w + pad, h/2);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  ctx.fillText(state.width, w/2, h + pad);
}

function draw() {
  ctx.clearRect(0,0,canvas.width, canvas.height);
  drawGrid();
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
    state.width = Math.ceil(e.offsetX / unitSize);
    state.height = Math.ceil(e.offsetY / unitSize);
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
