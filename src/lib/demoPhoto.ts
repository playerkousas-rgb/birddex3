/**
 * 無相機環境（桌面瀏覽器／預覽 iframe）用嘅示範相。
 * 只係一張畫出嚟嘅風景＋鳥剪影，餵入五問流程畀人睇 UI；
 * 唔係 AI 辨識、唔會入收藏，唔影響真實相片證據流程。
 */
export function makeDemoPhoto(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const sky = ctx.createLinearGradient(0, 0, 0, 310);
  sky.addColorStop(0, '#7ec8e3');
  sky.addColorStop(1, '#e8f4e0');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 640, 310);

  ctx.fillStyle = '#fff4c2';
  ctx.beginPath();
  ctx.arc(525, 78, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#9dc58b';
  ctx.beginPath();
  ctx.moveTo(0, 310);
  ctx.quadraticCurveTo(150, 230, 320, 305);
  ctx.quadraticCurveTo(480, 245, 640, 300);
  ctx.lineTo(640, 480);
  ctx.lineTo(0, 480);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#5f9b62';
  ctx.beginPath();
  ctx.moveTo(0, 370);
  ctx.quadraticCurveTo(210, 330, 400, 380);
  ctx.quadraticCurveTo(520, 350, 640, 385);
  ctx.lineTo(640, 480);
  ctx.lineTo(0, 480);
  ctx.closePath();
  ctx.fill();

  // 樹枝
  ctx.strokeStyle = '#4b3621';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(40, 385);
  ctx.quadraticCurveTo(240, 350, 430, 372);
  ctx.stroke();

  // 手繪小鳥（示範相嘅主角）
  const bx = 320;
  const by = 250;
  ctx.fillStyle = '#263528';
  ctx.beginPath();
  ctx.ellipse(bx, by, 42, 25, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bx + 34, by - 18, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(bx + 49, by - 20);
  ctx.lineTo(bx + 70, by - 15);
  ctx.lineTo(bx + 49, by - 10);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(bx - 38, by);
  ctx.lineTo(bx - 78, by - 16);
  ctx.lineTo(bx - 70, by + 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f6e5bf';
  ctx.beginPath();
  ctx.arc(bx + 39, by - 22, 2.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('BIRD-DEX 示範相 · 用嚟預覽五問', 22, 448);

  return canvas.toDataURL('image/jpeg', 0.82);
}
