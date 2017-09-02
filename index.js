
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const unitSize = 20;

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

function draw() {
  drawGrid();
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  draw();
}

resizeCanvas();
document.body.onresize = resizeCanvas;
