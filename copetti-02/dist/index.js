// src/core/types.ts
var DEFAULT_CONFIG = {
  width: 800,
  height: 400,
  backgroundColor: "#0f0f14",
  gridColor: "#1a1a24",
  upColor: "#26a69a",
  downColor: "#ef5350"
};
// src/core/canvas.ts
class Canvas {
  element;
  ctx;
  dpr;
  constructor(element, width, height) {
    this.element = element;
    const ctx = element.getContext("2d");
    if (ctx === null) {
      throw new Error("Failed to get 2D context");
    }
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
    this.resize(width, height);
  }
  resize(width, height) {
    this.element.width = width * this.dpr;
    this.element.height = height * this.dpr;
    this.element.style.width = `${width}px`;
    this.element.style.height = `${height}px`;
    this.ctx.scale(this.dpr, this.dpr);
  }
  clear(color) {
    const w = this.element.width / this.dpr;
    const h = this.element.height / this.dpr;
    if (color !== undefined) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(0, 0, w, h);
    } else {
      this.ctx.clearRect(0, 0, w, h);
    }
  }
  fillRect(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }
  line(x1, y1, x2, y2, color, width = 1) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }
  text(str, x, y, color, font = "12px monospace") {
    this.ctx.fillStyle = color;
    this.ctx.font = font;
    this.ctx.fillText(str, x, y);
  }
  getContext() {
    return this.ctx;
  }
  getBounds() {
    return {
      x: 0,
      y: 0,
      width: this.element.width / this.dpr,
      height: this.element.height / this.dpr
    };
  }
}
function createCanvas(element, width, height) {
  return new Canvas(element, width, height);
}
// src/core/scale.ts
class LinearScale {
  config;
  constructor(config) {
    this.config = config;
  }
  toPixel(value) {
    const { domainMin, domainMax, rangeMin, rangeMax } = this.config;
    const domainSpan = domainMax - domainMin;
    if (domainSpan === 0)
      return rangeMin;
    const ratio = (value - domainMin) / domainSpan;
    return rangeMin + ratio * (rangeMax - rangeMin);
  }
  toValue(pixel) {
    const { domainMin, domainMax, rangeMin, rangeMax } = this.config;
    const rangeSpan = rangeMax - rangeMin;
    if (rangeSpan === 0)
      return domainMin;
    const ratio = (pixel - rangeMin) / rangeSpan;
    return domainMin + ratio * (domainMax - domainMin);
  }
  update(config) {
    this.config = { ...this.config, ...config };
  }
  getConfig() {
    return this.config;
  }
}
function createScale(config) {
  return new LinearScale(config);
}
function createYScale(min, max, height, padding = 10) {
  return new LinearScale({
    domainMin: min,
    domainMax: max,
    rangeMin: height - padding,
    rangeMax: padding
  });
}
function createXScale(min, max, width, padding = 60) {
  return new LinearScale({
    domainMin: min,
    domainMax: max,
    rangeMin: padding,
    rangeMax: width - padding
  });
}
// src/core/candlestick.ts
var DEFAULT_CANDLE_CONFIG = {
  upColor: "#26a69a",
  downColor: "#ef5350",
  wickWidth: 1,
  bodyWidth: 8
};
function drawCandles(canvas, candles, xScale, yScale, config = DEFAULT_CANDLE_CONFIG) {
  const ctx = canvas.getContext();
  for (let i = 0;i < candles.length; i++) {
    const candle = candles[i];
    if (candle === undefined)
      continue;
    const x = xScale.toPixel(i);
    const isUp = candle.close >= candle.open;
    const color = isUp ? config.upColor : config.downColor;
    const highY = yScale.toPixel(candle.high);
    const lowY = yScale.toPixel(candle.low);
    ctx.strokeStyle = color;
    ctx.lineWidth = config.wickWidth;
    ctx.beginPath();
    ctx.moveTo(x, highY);
    ctx.lineTo(x, lowY);
    ctx.stroke();
    const openY = yScale.toPixel(candle.open);
    const closeY = yScale.toPixel(candle.close);
    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.max(Math.abs(closeY - openY), 1);
    const halfWidth = config.bodyWidth / 2;
    ctx.fillStyle = color;
    ctx.fillRect(x - halfWidth, bodyTop, config.bodyWidth, bodyHeight);
  }
}
function getPriceRange(candles) {
  if (candles.length === 0) {
    return { min: 0, max: 100 };
  }
  let min = Infinity;
  let max = -Infinity;
  for (const candle of candles) {
    if (candle.low < min)
      min = candle.low;
    if (candle.high > max)
      max = candle.high;
  }
  const range = max - min;
  const padding = range * 0.1;
  return {
    min: min - padding,
    max: max + padding
  };
}
// src/core/grid.ts
var DEFAULT_GRID_CONFIG = {
  color: "#1a1a24",
  lineWidth: 1,
  horizontalLines: 5,
  verticalLines: 10
};
function drawGrid(canvas, xScale, yScale, config = DEFAULT_GRID_CONFIG) {
  const ctx = canvas.getContext();
  const bounds = canvas.getBounds();
  ctx.strokeStyle = config.color;
  ctx.lineWidth = config.lineWidth;
  const xConfig = xScale.getConfig();
  const yConfig = yScale.getConfig();
  const hStep = (yConfig.domainMax - yConfig.domainMin) / config.horizontalLines;
  for (let i = 0;i <= config.horizontalLines; i++) {
    const value = yConfig.domainMin + i * hStep;
    const y = yScale.toPixel(value);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(bounds.width, y);
    ctx.stroke();
  }
  const vStep = (xConfig.domainMax - xConfig.domainMin) / config.verticalLines;
  for (let i = 0;i <= config.verticalLines; i++) {
    const value = xConfig.domainMin + i * vStep;
    const x = xScale.toPixel(value);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, bounds.height);
    ctx.stroke();
  }
}
// src/core/chart.ts
class Chart {
  config;
  canvas;
  xScale;
  yScale;
  candles = [];
  constructor(element, config = DEFAULT_CONFIG) {
    this.config = config;
    this.canvas = createCanvas(element, config.width, config.height);
    this.xScale = createXScale(0, 50, config.width);
    this.yScale = createYScale(0, 100, config.height);
  }
  setData(candles) {
    this.candles = candles;
    this.updateScales();
    this.render();
  }
  updateScales() {
    const count = this.candles.length;
    if (count === 0)
      return;
    const { min, max } = getPriceRange(this.candles);
    this.xScale = createXScale(0, count - 1, this.config.width);
    this.yScale = createYScale(min, max, this.config.height);
  }
  render() {
    this.canvas.clear(this.config.backgroundColor);
    drawGrid(this.canvas, this.xScale, this.yScale, {
      color: this.config.gridColor,
      lineWidth: 1,
      horizontalLines: 5,
      verticalLines: 10
    });
    if (this.candles.length > 0) {
      drawCandles(this.canvas, this.candles, this.xScale, this.yScale, {
        upColor: this.config.upColor,
        downColor: this.config.downColor,
        wickWidth: 1,
        bodyWidth: 8
      });
    }
  }
  resize(width, height) {
    this.canvas.resize(width, height);
    this.updateScales();
    this.render();
  }
  getCanvas() {
    return this.canvas.getContext().canvas;
  }
}
function createChart(element, config) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  return new Chart(element, mergedConfig);
}
export {
  getPriceRange,
  drawGrid,
  drawCandles,
  createYScale,
  createXScale,
  createScale,
  createChart,
  createCanvas,
  LinearScale,
  DEFAULT_GRID_CONFIG,
  DEFAULT_CONFIG,
  DEFAULT_CANDLE_CONFIG,
  Chart,
  Canvas
};
