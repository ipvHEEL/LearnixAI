import { useEffect, useRef } from 'react';

export default function CanvasBackground() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    let width, height, width_half, height_half;

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      width_half = width * 0.5;
      height_half = height * 0.5;
    }

    resize();
    window.addEventListener('resize', resize);

    // ======= ТВОЙ SCRIPT =======
    window.canvasOptions = {
      autoClear: true,
      autoPushPop: true
    };

    const colorArray = [127, 32, 255, 255];

    const dirs = [
      [0, 0],
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1]
    ];

    let size = 300;
    let size_ = 1 / size;
    let size_half = size * 0.5;

    function draw() {
      ctx.clearRect(0, 0, width, height);

      let time = Date.now() * 0.002;
      let cTime = Math.cos(time);
      let sTime = Math.sin(time);

      let xCount = map(cTime, -1, 1, 60, 100);
      let yCount = map(sTime, -1, 1, 60, 100);
      let m = cTime * 40;

      let offsetX = width_half - size_half;
      let offsetY = height_half - size_half;

      let w = size / xCount;
      let h = size / yCount;

      let middle = createVector(width_half, height_half);

      let imgData = ctx.createImageData(width, height);

      for (let y_ = 1; y_ < yCount; y_++) {
        for (let x_ = 1; x_ < xCount; x_++) {
          let v = createVector(x_ * w, y_ * h).add(offsetX, offsetY);
          let delta = v.copy().sub(middle);
          let distance = delta.mag();

          if (distance < size * 0.25) continue;

          v.add(delta.rotate(time).mult(1 - 3 * (distance * size_)));

          dirs.forEach(([a, b]) => {
            let v2 = createVector(a, b).mult(m).rotate(time).add(v);
            let x = Math.floor(v2.x);
            let y = Math.floor(v2.y);

            if (x < 0 || y < 0 || x >= width || y >= height) return;

            let n = (x + width * y) * 4;
            imgData.data.set(colorArray, n);
          });
        }
      }

      ctx.putImageData(imgData, 0, 0);
      rafRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0
      }}
    />
  );
}
function map(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

function createVector(x = 0, y = 0) {
  return {
    x,
    y,
    add(a, b) {
      if (typeof a === 'object') {
        this.x += a.x;
        this.y += a.y;
      } else {
        this.x += a;
        this.y += b;
      }
      return this;
    },
    sub(v) {
      this.x -= v.x;
      this.y -= v.y;
      return this;
    },
    mult(n) {
      this.x *= n;
      this.y *= n;
      return this;
    },
    mag() {
      return Math.sqrt(this.x ** 2 + this.y ** 2);
    },
    rotate(a) {
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const x = this.x * cos - this.y * sin;
      const y = this.x * sin + this.y * cos;
      this.x = x;
      this.y = y;
      return this;
    },
    copy() {
      return createVector(this.x, this.y);
    }
  };
}
