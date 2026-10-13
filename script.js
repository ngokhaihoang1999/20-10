const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');
const fxCanvas = document.getElementById('fx-canvas');
const fxCtx = fxCanvas.getContext('2d');

// --- PHÁT HIỆN MÔI TRƯỜNG TRÌNH DUYỆT (MOBILE / IN-APP BROWSER) ---
function isInAppBrowser() {
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    return /Telegram|FBAN|FBAV|Instagram|Messenger|Line|Zalo|TikTok/i.test(ua);
}

function isIOSDevice() {
    const ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isMobileDevice() {
    const ua = navigator.userAgent || '';
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || isIOSDevice();
}

function checkInAppBrowser() {
    if (isInAppBrowser()) {
        const warning = document.getElementById('browser-warning');
        if (warning) warning.style.display = 'flex';
    }
}
window.addEventListener('DOMContentLoaded', checkInAppBrowser);

// ====== HỆ THỐNG HẠT NỀN ĐA TẦNG & HIỆU ỨNG CHẠM TAY (TỐI ƯU 60FPS MOBILE) ======
let bgWidth = window.innerWidth;
let bgHeight = window.innerHeight;
let bgParticles = [];
let bokehOrbs = [];
let sparkles = [];
let fxParticles = [];
let fxAnimating = false;

function initCanvasSizes() {
    bgWidth = bgCanvas.width = fxCanvas.width = window.innerWidth;
    bgHeight = bgCanvas.height = fxCanvas.height = window.innerHeight;
    fitPreviewAreaToStage();
    fitCardShowcaseToWrap();
}
window.addEventListener('resize', initCanvasSizes, { passive: true });

// Lớp 1: Đốm sáng Bokeh mềm mại (dùng radial gradient, không dùng shadowBlur để tránh lag)
class BokehOrb {
    constructor() {
        this.reset(true);
    }
    reset(initial = false) {
        this.x = Math.random() * bgWidth;
        this.y = initial ? Math.random() * bgHeight : bgHeight + 60;
        this.radius = Math.random() * 32 + 18;
        this.vy = -(Math.random() * 0.35 + 0.12);
        this.vx = (Math.random() - 0.5) * 0.25;
        this.phase = Math.random() * Math.PI * 2;
        this.baseAlpha = Math.random() * 0.16 + 0.08;
        const colors = ['255, 192, 208', '255, 255, 255', '168, 230, 207', '255, 218, 230'];
        this.rgb = colors[Math.floor(Math.random() * colors.length)];
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.phase += 0.02;
        if (this.y < -this.radius * 2) this.reset(false);
    }
    draw(ctx) {
        const alpha = this.baseAlpha + Math.sin(this.phase) * 0.04;
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        grad.addColorStop(0, `rgba(${this.rgb}, ${Math.max(0.02, alpha)})`);
        grad.addColorStop(1, `rgba(${this.rgb}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Lớp 2: Cánh hoa anh đào rơi lượn sóng 3D mềm mại
class SakuraPetal {
    constructor() {
        this.reset(true);
    }
    reset(initial = false) {
        this.x = Math.random() * bgWidth;
        this.y = initial ? Math.random() * bgHeight : -24;
        this.size = Math.random() * 11 + 7;
        this.vy = Math.random() * 1.2 + 0.85;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.swayAmp = Math.random() * 0.9 + 0.3;
        this.swaySpeed = Math.random() * 0.025 + 0.012;
        this.swayAngle = Math.random() * Math.PI * 2;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.03;
        this.tilt = Math.random() * Math.PI * 2;
        this.tiltSpeed = Math.random() * 0.025 + 0.01;
        this.color = ['#ffb7c5', '#ffc8d6', '#ffdde6', '#ff9ebb', '#ffffff'][Math.floor(Math.random() * 5)];
        this.opacity = Math.random() * 0.45 + 0.42;
    }
    update() {
        this.swayAngle += this.swaySpeed;
        this.tilt += this.tiltSpeed;
        this.x += this.vx + Math.sin(this.swayAngle) * this.swayAmp;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;
        if (this.y > bgHeight + 25 || this.x > bgWidth + 30 || this.x < -30) {
            this.reset(false);
        }
    }
    draw(ctx) {
        const s = this.size;
        const flipY = 0.45 + Math.abs(Math.cos(this.tilt)) * 0.55;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(1, flipY);
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.5);
        ctx.bezierCurveTo(-s * 0.55, s * 0.2, -s * 0.5, -s * 0.35, -s * 0.12, -s * 0.5);
        ctx.lineTo(0, -s * 0.36);
        ctx.lineTo(s * 0.12, -s * 0.5);
        ctx.bezierCurveTo(s * 0.5, -s * 0.35, s * 0.55, s * 0.2, 0, s * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

// Lớp 3: Ánh sao 4 cánh lấp lánh
class TwinkleStar {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * bgWidth;
        this.y = Math.random() * bgHeight;
        this.size = Math.random() * 5 + 3.5;
        this.phase = Math.random() * Math.PI * 2;
        this.speed = Math.random() * 0.04 + 0.02;
        this.color = Math.random() > 0.4 ? '#fff6d6' : '#ffe4ee';
    }
    update() {
        this.phase += this.speed;
        if (this.phase > Math.PI * 2) {
            this.phase -= Math.PI * 2;
            if (Math.random() < 0.25) {
                this.x = Math.random() * bgWidth;
                this.y = Math.random() * bgHeight;
            }
        }
    }
    draw(ctx) {
        const s = (Math.sin(this.phase) * 0.5 + 0.5) * this.size;
        if (s < 0.8) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.globalAlpha = Math.min(0.85, (s / this.size) * 0.8);
        ctx.fillStyle = this.color;
        drawFourPointStarPath(ctx, 0, 0, s);
        ctx.fill();
        ctx.restore();
    }
}

function drawFourPointStarPath(ctx, cx, cy, r) {
    const inner = r * 0.26;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(cx + inner, cy - inner, cx + r, cy);
    ctx.quadraticCurveTo(cx + inner, cy + inner, cx, cy + r);
    ctx.quadraticCurveTo(cx - inner, cy + inner, cx - r, cy);
    ctx.quadraticCurveTo(cx - inner, cy - inner, cx, cy - r);
    ctx.closePath();
}

function initBgParticles() {
    const mobile = isMobileDevice();
    const petalCount = mobile ? 22 : 34;
    const bokehCount = mobile ? 6 : 10;
    const starCount = mobile ? 9 : 14;

    bgParticles = [];
    bokehOrbs = [];
    sparkles = [];
    for (let i = 0; i < bokehCount; i++) bokehOrbs.push(new BokehOrb());
    for (let i = 0; i < petalCount; i++) bgParticles.push(new SakuraPetal());
    for (let i = 0; i < starCount; i++) sparkles.push(new TwinkleStar());
}

function animateBg() {
    if (!document.hidden) {
        bgCtx.clearRect(0, 0, bgWidth, bgHeight);
        for (let i = 0; i < bokehOrbs.length; i++) {
            bokehOrbs[i].update();
            bokehOrbs[i].draw(bgCtx);
        }
        for (let i = 0; i < bgParticles.length; i++) {
            bgParticles[i].update();
            bgParticles[i].draw(bgCtx);
        }
        for (let i = 0; i < sparkles.length; i++) {
            sparkles[i].update();
            sparkles[i].draw(bgCtx);
        }
    }
    requestAnimationFrame(animateBg);
}

// ====== HIỆU ỨNG CHẠM TAY NỞ HOA & PHÁO HOA CHÚC MỪNG (FX CANVAS) ======
function spawnTouchSparkle(x, y, count = 2) {
    if (fxParticles.length > 50) return;
    const palette = ['#ff8da8', '#ffd166', '#ffb7c5', '#7be0b8', '#ffffff'];
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2.2 + 0.6;
        fxParticles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.5,
            gravity: 0.04,
            size: Math.random() * 5.5 + 3.5,
            rotation: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.12,
            alpha: 1,
            decay: Math.random() * 0.024 + 0.02,
            color: palette[Math.floor(Math.random() * palette.length)],
            shape: Math.random() > 0.45 ? 'star' : 'heart'
        });
    }
    startFxLoop();
}

function triggerCelebrationBurst() {
    const palette = ['#ff6b9d', '#ffd166', '#ff9ebb', '#52b788', '#f48fb1', '#ffe57f'];
    const total = isMobileDevice() ? 30 : 44;
    for (let i = 0; i < total; i++) {
        const fromLeft = i % 2 === 0;
        const startX = fromLeft ? bgWidth * 0.08 : bgWidth * 0.92;
        const startY = bgHeight * 0.55 + (Math.random() - 0.5) * 80;
        const angle = fromLeft
            ? (-Math.PI * 0.36 + (Math.random() - 0.5) * 0.42)
            : (-Math.PI * 0.64 + (Math.random() - 0.5) * 0.42);
        const speed = Math.random() * 6.5 + 5;
        fxParticles.push({
            x: startX,
            y: startY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            gravity: 0.16,
            size: Math.random() * 6.5 + 4.5,
            rotation: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.18,
            alpha: 1,
            decay: Math.random() * 0.011 + 0.009,
            color: palette[i % palette.length],
            shape: i % 3 === 0 ? 'heart' : (i % 3 === 1 ? 'star' : 'petal')
        });
    }
    startFxLoop();
}

function startFxLoop() {
    if (fxAnimating) return;
    fxAnimating = true;
    requestAnimationFrame(animateFx);
}

function animateFx() {
    fxCtx.clearRect(0, 0, bgWidth, bgHeight);
    for (let i = fxParticles.length - 1; i >= 0; i--) {
        const p = fxParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.985;
        p.rotation += p.vRot;
        p.alpha -= p.decay;

        if (p.alpha <= 0.02) {
            fxParticles.splice(i, 1);
            continue;
        }

        fxCtx.save();
        fxCtx.translate(p.x, p.y);
        fxCtx.rotate(p.rotation);
        fxCtx.globalAlpha = p.alpha;
        fxCtx.fillStyle = p.color;

        if (p.shape === 'star') {
            drawFourPointStarPath(fxCtx, 0, 0, p.size);
            fxCtx.fill();
        } else if (p.shape === 'heart') {
            drawMiniHeartPath(fxCtx, 0, 0, p.size);
            fxCtx.fill();
        } else {
            fxCtx.beginPath();
            fxCtx.ellipse(0, 0, p.size * 0.55, p.size * 0.9, 0, 0, Math.PI * 2);
            fxCtx.fill();
        }
        fxCtx.restore();
    }

    if (fxParticles.length > 0) {
        requestAnimationFrame(animateFx);
    } else {
        fxCtx.clearRect(0, 0, bgWidth, bgHeight);
        fxAnimating = false;
    }
}

function drawMiniHeartPath(ctx, cx, cy, size) {
    const s = size * 0.55;
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.8);
    ctx.bezierCurveTo(cx - s * 1.4, cy - s * 0.1, cx - s * 0.8, cy - s * 1.2, cx, cy - s * 0.45);
    ctx.bezierCurveTo(cx + s * 0.8, cy - s * 1.2, cx + s * 1.4, cy - s * 0.1, cx, cy + s * 0.8);
    ctx.closePath();
}

let lastSparkleTime = 0;
window.addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (now - lastSparkleTime < 40) return;
    if (e.target && e.target.closest('#preview-area-wrap')) return;
    lastSparkleTime = now;
    spawnTouchSparkle(e.clientX, e.clientY, 1);
}, { passive: true });

window.addEventListener('pointerdown', (e) => {
    if (e.target && e.target.closest('#preview-area-wrap')) return;
    spawnTouchSparkle(e.clientX, e.clientY, 3);
}, { passive: true });

// ====== CẤU HÌNH 5 CONCEPT MỚI (SANG - XỊN - KHÔNG SẾN) + 10 KHUNG CŨ ======
const FRAME_ASPECT_RATIO = 1024 / 1526;
const CONCEPT_DEFS = [
    { concept: 'arch', label: '✨ C1: Vòm Lụa', fullLabel: '✨ C1: Vòm Lụa (Arch)' },
    { concept: 'magazine', label: '✨ C2: Tạp Chí', fullLabel: '✨ C2: Tạp Chí Vogue' },
    { concept: 'polaroid', label: '✨ C3: Polaroid', fullLabel: '✨ C3: Polaroid Hàn' },
    { concept: 'aura', label: '✨ C4: Kính Aura', fullLabel: '✨ C4: Kính Mờ Aura' },
    { concept: 'dior', label: '✨ C5: Dior Gold', fullLabel: '✨ C5: Dior Line-Art' }
];

const framesConfig = [];
CONCEPT_DEFS.forEach((c, idx) => {
    framesConfig.push({
        id: idx,
        concept: c.concept,
        path: '',
        label: c.label,
        fullLabel: c.fullLabel,
        isConcept: true
    });
});
for (let i = 1; i <= 10; i++) {
    framesConfig.push({
        id: CONCEPT_DEFS.length + i - 1,
        concept: null,
        path: `khung/khung ${i}.png?v=3.0`,
        label: `Khung ${i}`,
        fullLabel: `🖼️ Khung ${i}`,
        isConcept: false
    });
}

const uploadWrapper = document.getElementById('upload-wrapper');
uploadWrapper.classList.add('ready');

// ====== QUẢN LÝ LỜI CHÚC THEO CHỦ ĐỀ (KHÔNG LẶP LẠI) ======
const TOPIC_RANGES = {
    all: [[0, 199]],
    warm: [[0, 53]],
    selflove: [[54, 63], [114, 123]],
    work: [[64, 73], [144, 153]],
    beauty: [[74, 83], [0, 23]],
    friends: [[84, 93], [134, 143]],
    family: [[94, 103]],
    autumn: [[104, 113]],
    fun: [[124, 133]]
};

const topicDecks = {};

function getTopicIndices(topic) {
    const ranges = TOPIC_RANGES[topic] || TOPIC_RANGES.all;
    const indices = [];
    const maxIdx = wishes2010.length - 1;
    ranges.forEach(([start, end]) => {
        for (let i = start; i <= Math.min(end, maxIdx); i++) {
            indices.push(i);
        }
    });
    return indices.length ? indices : [0];
}

function getNextQuoteByTopic(topic = 'all') {
    if (!topicDecks[topic] || topicDecks[topic].length === 0) {
        const pool = getTopicIndices(topic);
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        topicDecks[topic] = pool;
    }
    let idx = topicDecks[topic].pop();
    if (wishes2010[idx] === currentAIQuote && topicDecks[topic].length > 0) {
        const nextIdx = topicDecks[topic].pop();
        topicDecks[topic].unshift(idx);
        idx = nextIdx;
    }
    return wishes2010[idx];
}

// ====== 5 BẢNG MÀU NỮ TÍNH ======
const COLOR_THEMES = {
    emerald: {
        canvasBgStart: '#ffffff',
        canvasBgMid: '#f3fbf7',
        canvasBgEnd: '#ddf4ea',
        boxFillStart: 'rgba(255, 255, 255, 0.97)',
        boxFillEnd: 'rgba(232, 248, 240, 0.95)',
        borderPrimary: '#2c9678',
        borderSecondary: '#a3dfc8',
        flowerMain: '#f06292',
        flowerSoft: '#f8bbd0',
        leafColor: '#4db699',
        goldAccent: '#e2b049',
        textTop: '#074a3a',
        textMid: '#0f7b5f',
        textBottom: '#08453a',
        recipientColor: '#c23868',
        shadowRgba: 'rgba(15, 115, 88, 0.16)'
    },
    blush: {
        canvasBgStart: '#ffffff',
        canvasBgMid: '#fff6f9',
        canvasBgEnd: '#fde2ec',
        boxFillStart: 'rgba(255, 255, 255, 0.98)',
        boxFillEnd: 'rgba(255, 236, 243, 0.95)',
        borderPrimary: '#d85a88',
        borderSecondary: '#f6bdd1',
        flowerMain: '#e91e63',
        flowerSoft: '#f8bbd0',
        leafColor: '#66bb9a',
        goldAccent: '#e5b548',
        textTop: '#6b1839',
        textMid: '#9c2756',
        textBottom: '#5a1330',
        recipientColor: '#0f7b5f',
        shadowRgba: 'rgba(200, 65, 115, 0.16)'
    },
    rosegold: {
        canvasBgStart: '#ffffff',
        canvasBgMid: '#fff8f4',
        canvasBgEnd: '#fbe7dc',
        boxFillStart: 'rgba(255, 255, 255, 0.98)',
        boxFillEnd: 'rgba(253, 240, 233, 0.95)',
        borderPrimary: '#c6735d',
        borderSecondary: '#eec2b4',
        flowerMain: '#e57373',
        flowerSoft: '#ffccbc',
        leafColor: '#6ea892',
        goldAccent: '#d69c3a',
        textTop: '#59251a',
        textMid: '#823b2b',
        textBottom: '#4a1d14',
        recipientColor: '#b53f58',
        shadowRgba: 'rgba(180, 95, 75, 0.16)'
    },
    lavender: {
        canvasBgStart: '#ffffff',
        canvasBgMid: '#faf6ff',
        canvasBgEnd: '#ece0fa',
        boxFillStart: 'rgba(255, 255, 255, 0.98)',
        boxFillEnd: 'rgba(244, 236, 253, 0.95)',
        borderPrimary: '#8e5eb3',
        borderSecondary: '#d3b7ea',
        flowerMain: '#ba68c8',
        flowerSoft: '#f48fb1',
        leafColor: '#64b096',
        goldAccent: '#dfb249',
        textTop: '#391b52',
        textMid: '#5c307d',
        textBottom: '#2f1544',
        recipientColor: '#b03872',
        shadowRgba: 'rgba(125, 75, 165, 0.16)'
    },
    champagne: {
        canvasBgStart: '#ffffff',
        canvasBgMid: '#fffdf6',
        canvasBgEnd: '#f8eed5',
        boxFillStart: 'rgba(255, 255, 255, 0.98)',
        boxFillEnd: 'rgba(253, 248, 233, 0.95)',
        borderPrimary: '#c29629',
        borderSecondary: '#e8d089',
        flowerMain: '#eb6a92',
        flowerSoft: '#f8bbd0',
        leafColor: '#4c9e81',
        goldAccent: '#d4a017',
        textTop: '#084738',
        textMid: '#594214',
        textBottom: '#084738',
        recipientColor: '#b83564',
        shadowRgba: 'rgba(175, 135, 40, 0.16)'
    }
};

// ====== TRẠNG THÁI ỨNG DỤNG ======
let currentUserImage = null;
let cropperObj = null;
let currentScaleX = 1;
let currentAIQuote = "";
let hasGeneratedQuoteOnce = false;
let currentTopic = 'all';
let isCustomWishActive = false;
let customWishText = "";
let recipientName = "";
let currentBorderStyle = 'sakura';
let currentColorTheme = 'emerald';
let currentSelectedFrameId = 0;
let loadedFrameImages = [];

const step1 = document.getElementById('step-1');
const step2 = document.getElementById('step-2');
const step3 = document.getElementById('step-3');
const finalResultCanvas = document.getElementById('final-result-canvas');
const finalResultImg = document.getElementById('final-result-img');
const cardShowcase = document.getElementById('card-showcase');
const frameList = document.getElementById('frame-list');
const frameOverlayEl = document.getElementById('frame-overlay');

// Tính toán kích thước khung Bước 2 chuẩn tỷ lệ 1024 x 1526 tuyệt đối trên mọi màn hình
function fitPreviewAreaToStage() {
    if (!step2 || !step2.classList.contains('active')) return;
    const stage = document.querySelector('.preview-stage');
    const previewArea = document.getElementById('preview-area-wrap');
    if (!stage || !previewArea) return;
    const availW = stage.clientWidth - 4;
    const availH = stage.clientHeight - 4;
    if (availW <= 0 || availH <= 0) return;

    let w = availH * FRAME_ASPECT_RATIO;
    let h = availH;
    if (w > availW) {
        w = availW;
        h = availW / FRAME_ASPECT_RATIO;
    }
    previewArea.style.width = `${Math.floor(w)}px`;
    previewArea.style.height = `${Math.floor(h)}px`;
}

// Tính toán kích thước hiển thị thực tế để luôn nhìn thấy TRỌN VẸN 100% tấm thiệp ở Bước 3
function fitCardShowcaseToWrap() {
    if (!step3 || !step3.classList.contains('active')) return;
    const wrap = document.querySelector('.result-canvas-wrap');
    if (!wrap || !cardShowcase) return;
    const availW = wrap.clientWidth - 4;
    const availH = wrap.clientHeight - 4;
    if (availW <= 0 || availH <= 0) return;

    const cw = finalResultCanvas.width || 1024;
    const ch = finalResultCanvas.height || 2060;
    const cardRatio = cw / ch;

    let w = availH * cardRatio;
    let h = availH;
    if (w > availW) {
        w = availW;
        h = availW / cardRatio;
    }
    cardShowcase.style.width = `${Math.floor(w)}px`;
    cardShowcase.style.height = `${Math.floor(h)}px`;
}

initCanvasSizes();
initBgParticles();
animateBg();

// ====== BỘ VẼ 5 CONCEPT KHUNG HÌNH CAO CẤP (1024 x 1526) ======
function traceArchWindowPath(ctx, x, y, w, h, bottomRadius) {
    const rTop = w / 2;
    const archCenterX = x + rTop;
    const archCenterY = y + rTop;
    const br = Math.min(bottomRadius, w * 0.15);
    ctx.moveTo(x, archCenterY);
    ctx.arc(archCenterX, archCenterY, rTop, Math.PI, 0, false);
    ctx.lineTo(x + w, y + h - br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + br, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - br);
    ctx.closePath();
}

function traceRoundedWindowPath(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function traceChamferWindowPath(ctx, x, y, w, h, c) {
    ctx.moveTo(x + c, y);
    ctx.lineTo(x + w - c, y);
    ctx.lineTo(x + w, y + c);
    ctx.lineTo(x + w, y + h - c);
    ctx.lineTo(x + w - c, y + h);
    ctx.lineTo(x + c, y + h);
    ctx.lineTo(x, y + h - c);
    ctx.lineTo(x, y + c);
    ctx.closePath();
}

function drawFineBotanicalSprig(ctx, cx, cy, scale, angle, theme) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.strokeStyle = theme.goldAccent;
    ctx.lineWidth = 2 * scale;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(38 * scale, -18 * scale, 96 * scale, -6 * scale);
    ctx.stroke();

    const leafPairs = [
        { t: 22, dy: -4, a: -0.65, len: 22 },
        { t: 36, dy: -6, a: 0.55, len: 20 },
        { t: 54, dy: -8, a: -0.58, len: 20 },
        { t: 70, dy: -8, a: 0.48, len: 17 },
        { t: 88, dy: -6, a: -0.35, len: 15 }
    ];
    leafPairs.forEach(lp => {
        ctx.save();
        ctx.translate(lp.t * scale, lp.dy * scale);
        ctx.rotate(lp.a);
        ctx.fillStyle = theme.flowerSoft;
        ctx.globalAlpha = 0.32;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(lp.len * 0.5 * scale, -lp.len * 0.28 * scale, lp.len * scale, 0);
        ctx.quadraticCurveTo(lp.len * 0.5 * scale, lp.len * 0.28 * scale, 0, 0);
        ctx.fill();
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = theme.goldAccent;
        ctx.lineWidth = 1.4 * scale;
        ctx.stroke();
        ctx.restore();
    });
    ctx.restore();
}

function drawFineLineRoseCorner(ctx, cx, cy, scale, flipX, flipY, theme) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(flipX, flipY);

    // Nhánh lá mảnh nghệ thuật
    drawFineBotanicalSprig(ctx, 10 * scale, 8 * scale, scale * 1.05, 0.18, theme);
    drawFineBotanicalSprig(ctx, 8 * scale, 10 * scale, scale * 1.05, 1.38, theme);

    // Bông hồng Anh Quốc vẽ nét mảnh (Fine-Line Botanical Ink)
    ctx.translate(18 * scale, 18 * scale);
    ctx.fillStyle = theme.flowerSoft;
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.arc(0, 0, 28 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.92;
    ctx.strokeStyle = theme.goldAccent;
    ctx.lineWidth = 1.8 * scale;
    ctx.lineCap = 'round';

    const rings = [
        { r: 7, petals: 3, offset: 0.2 },
        { r: 14, petals: 5, offset: 0.8 },
        { r: 22, petals: 6, offset: 0.4 },
        { r: 29, petals: 7, offset: 1.1 }
    ];
    rings.forEach(ring => {
        for (let i = 0; i < ring.petals; i++) {
            const a1 = ring.offset + (i * Math.PI * 2) / ring.petals;
            const a2 = a1 + (Math.PI * 2) / (ring.petals * 1.18);
            const r = ring.r * scale;
            ctx.beginPath();
            ctx.arc(0, 0, r, a1, a2);
            ctx.stroke();
        }
    });

    ctx.fillStyle = theme.borderPrimary;
    ctx.beginPath();
    ctx.arc(0, 0, 3 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawWashiTape(ctx, cx, cy, w, h, angle, theme) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    ctx.shadowColor = 'rgba(0,0,0,0.08)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    // Đường cắt răng cưa 2 đầu băng keo Washi
    const hw = w / 2;
    const hh = h / 2;
    ctx.beginPath();
    ctx.moveTo(-hw, -hh);
    ctx.lineTo(hw, -hh);
    const teeth = 6;
    for (let i = 0; i <= teeth; i++) {
        const ty = -hh + (i / teeth) * h;
        const tx = hw + (i % 2 === 0 ? 0 : -5);
        ctx.lineTo(tx, ty);
    }
    ctx.lineTo(-hw, hh);
    for (let i = teeth; i >= 0; i--) {
        const ty = -hh + (i / teeth) * h;
        const tx = -hw + (i % 2 === 0 ? 0 : 5);
        ctx.lineTo(tx, ty);
    }
    ctx.closePath();

    ctx.fillStyle = theme.flowerSoft;
    ctx.globalAlpha = 0.62;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Họa tiết kẻ sọc chéo mảnh ánh kim trên băng keo Washi
    ctx.clip();
    ctx.strokeStyle = theme.goldAccent;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 2;
    for (let sx = -w; sx < w; sx += 16) {
        ctx.beginPath();
        ctx.moveTo(sx, -hh - 10);
        ctx.lineTo(sx + 24, hh + 10);
        ctx.stroke();
    }
    ctx.restore();
}

function drawPostmarkStamp(ctx, cx, cy, radius, theme) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.2);
    ctx.globalAlpha = 0.82;
    ctx.strokeStyle = theme.borderPrimary;
    ctx.fillStyle = theme.borderPrimary;

    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.84, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = `700 ${Math.floor(radius * 0.24)}px "Montserrat", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('WOMEN\'S DAY', 0, -radius * 0.42);
    ctx.font = `italic 700 ${Math.floor(radius * 0.46)}px "Playfair Display", serif`;
    ctx.fillText('20•10', 0, radius * 0.04);
    ctx.font = `600 ${Math.floor(radius * 0.2)}px "Montserrat", sans-serif`;
    ctx.fillText('★ BTLMVN ★', 0, radius * 0.46);
    ctx.restore();
}

function renderConceptOverlayToCtx(ctx, concept, targetW, originH, theme, isStep2Overlay) {
    const scale = targetW / 1024;
    ctx.save();

    if (concept === 'arch') {
        // C1: VÒM LỤA NGHỆ THUẬT (Arch Gallery)
        const winX = Math.floor(68 * scale);
        const winY = Math.floor(68 * scale);
        const winW = targetW - winX * 2;
        const winH = originH - Math.floor(92 * scale);
        const bottomR = Math.floor(34 * scale);

        // Tô nền lụa bên ngoài cửa sổ vòm bằng quy tắc evenodd (bên trong vòm trong suốt 100%)
        ctx.beginPath();
        ctx.rect(0, 0, targetW, originH);
        traceArchWindowPath(ctx, winX, winY, winW, winH, bottomR);
        const matteGrad = ctx.createLinearGradient(0, 0, 0, originH);
        matteGrad.addColorStop(0, theme.canvasBgMid);
        matteGrad.addColorStop(0.65, theme.canvasBgEnd);
        matteGrad.addColorStop(1, theme.canvasBgMid);
        ctx.fillStyle = matteGrad;
        ctx.fill('evenodd');

        // Viền chỉ đôi ánh kim ôm quanh vòm
        ctx.beginPath();
        traceArchWindowPath(ctx, winX, winY, winW, winH, bottomR);
        const archGrad = ctx.createLinearGradient(winX, winY, winX + winW, winY + winH);
        archGrad.addColorStop(0, theme.goldAccent);
        archGrad.addColorStop(0.5, theme.borderPrimary);
        archGrad.addColorStop(1, theme.goldAccent);
        ctx.strokeStyle = archGrad;
        ctx.lineWidth = 3.6 * scale;
        ctx.stroke();

        const inOff = 12 * scale;
        ctx.beginPath();
        traceArchWindowPath(ctx, winX - inOff, winY - inOff, winW + inOff * 2, winH + inOff * 2, bottomR + 8 * scale);
        ctx.strokeStyle = theme.borderSecondary;
        ctx.lineWidth = 1.5 * scale;
        ctx.stroke();

        // Hoa lá nét mảnh ở 2 góc trên của vòm + Ngôi sao kim cương đỉnh vòm
        drawFineBotanicalSprig(ctx, 42 * scale, 96 * scale, scale * 1.15, -0.35, theme);
        ctx.save();
        ctx.translate(targetW, 0);
        ctx.scale(-1, 1);
        drawFineBotanicalSprig(ctx, 42 * scale, 96 * scale, scale * 1.15, -0.35, theme);
        ctx.restore();

        ctx.fillStyle = theme.goldAccent;
        drawFourPointStarPath(ctx, targetW / 2, winY - 12 * scale, 14 * scale);
        ctx.fill();
        drawFourPointStarPath(ctx, 88 * scale, 52 * scale, 9 * scale);
        ctx.fill();
        drawFourPointStarPath(ctx, targetW - 88 * scale, 52 * scale, 9 * scale);
        ctx.fill();

    } else if (concept === 'magazine') {
        // C2: BÌA TẠP CHÍ THỜI TRANG (Vogue / Elle Editorial)
        // Lớp phủ mờ nhẹ ở đỉnh ảnh để nổi bật chữ tạp chí và chuyển sắc mượt ở đáy ảnh
        const topScrim = ctx.createLinearGradient(0, 0, 0, 290 * scale);
        topScrim.addColorStop(0, 'rgba(12, 28, 24, 0.42)');
        topScrim.addColorStop(0.65, 'rgba(12, 28, 24, 0.12)');
        topScrim.addColorStop(1, 'rgba(12, 28, 24, 0)');
        ctx.fillStyle = topScrim;
        ctx.fillRect(0, 0, targetW, 290 * scale);

        const botScrim = ctx.createLinearGradient(0, originH - 180 * scale, 0, originH);
        botScrim.addColorStop(0, 'rgba(255, 255, 255, 0)');
        botScrim.addColorStop(0.75, 'rgba(255, 255, 255, 0.55)');
        botScrim.addColorStop(1, theme.canvasBgStart);
        ctx.fillStyle = botScrim;
        ctx.fillRect(0, originH - 180 * scale, targetW, 180 * scale);

        // Khung viền mảnh đôi Editorial chạy sát mép ảnh
        const m = 34 * scale;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
        ctx.lineWidth = 2.2 * scale;
        ctx.strokeRect(m, m, targetW - m * 2, originH - m * 2);

        const m2 = 44 * scale;
        ctx.strokeStyle = theme.goldAccent;
        ctx.globalAlpha = 0.75;
        ctx.lineWidth = 1.1 * scale;
        ctx.strokeRect(m2, m2, targetW - m2 * 2, originH - m2 * 2);
        ctx.globalAlpha = 1;

        // Typography bìa tạp chí sang trọng
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 10 * scale;

        ctx.font = `600 ${Math.floor(17 * scale)}px "Montserrat", sans-serif`;
        ctx.fillText('B T L M V N   •   S P E C I A L   E D I T I O N   2 0 . 1 0', targetW / 2, 78 * scale);

        ctx.font = `italic 700 ${Math.floor(74 * scale)}px "Cormorant Garamond", serif`;
        ctx.fillText('L A   B E A U T É', targetW / 2, 146 * scale);

        // Đường kẻ mảnh & ngôi sao dưới tiêu đề tạp chí
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.4 * scale;
        ctx.beginPath();
        ctx.moveTo(targetW / 2 - 140 * scale, 174 * scale);
        ctx.lineTo(targetW / 2 - 18 * scale, 174 * scale);
        ctx.moveTo(targetW / 2 + 18 * scale, 174 * scale);
        ctx.lineTo(targetW / 2 + 140 * scale, 174 * scale);
        ctx.stroke();

        ctx.fillStyle = theme.goldAccent;
        drawFourPointStarPath(ctx, targetW / 2, 174 * scale, 8 * scale);
        ctx.fill();
        ctx.restore();

    } else if (concept === 'polaroid') {
        // C3: POLAROID HÀN QUỐC & BĂNG KEO WASHI (Life4Cuts / Analog Film)
        const cardX = Math.floor(54 * scale);
        const cardY = Math.floor(62 * scale);
        const cardW = targetW - cardX * 2;
        const cardH = originH - Math.floor(78 * scale);

        const winX = Math.floor(88 * scale);
        const winY = Math.floor(98 * scale);
        const winW = targetW - winX * 2;
        const winH = originH - Math.floor(245 * scale);
        const winR = Math.floor(12 * scale);

        // 1. Nền giấy mỹ thuật bên ngoài tấm Polaroid
        ctx.beginPath();
        ctx.rect(0, 0, targetW, originH);
        traceRoundedWindowPath(ctx, cardX, cardY, cardW, cardH, 18 * scale);
        const paperGrad = ctx.createLinearGradient(0, 0, 0, originH);
        paperGrad.addColorStop(0, '#f9f6f0');
        paperGrad.addColorStop(1, theme.canvasBgMid);
        ctx.fillStyle = paperGrad;
        ctx.fill('evenodd');

        // 2. Phần khung trắng Polaroid (bên ngoài cửa sổ ảnh winX..winW)
        ctx.save();
        ctx.shadowColor = 'rgba(15, 35, 28, 0.15)';
        ctx.shadowBlur = 24 * scale;
        ctx.shadowOffsetY = 8 * scale;
        ctx.beginPath();
        traceRoundedWindowPath(ctx, cardX, cardY, cardW, cardH, 18 * scale);
        traceRoundedWindowPath(ctx, winX, winY, winW, winH, winR);
        ctx.fillStyle = '#ffffff';
        ctx.fill('evenodd');
        ctx.restore();

        // Viền mảnh quanh tấm Polaroid & quanh cửa sổ ảnh
        ctx.beginPath();
        traceRoundedWindowPath(ctx, cardX, cardY, cardW, cardH, 18 * scale);
        ctx.strokeStyle = theme.borderSecondary;
        ctx.lineWidth = 1.6 * scale;
        ctx.stroke();

        ctx.beginPath();
        traceRoundedWindowPath(ctx, winX, winY, winW, winH, winR);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.lineWidth = 1.5 * scale;
        ctx.stroke();

        // 3. Hai dải băng keo Washi dán ở góc trên Polaroid
        drawWashiTape(ctx, cardX + 64 * scale, cardY + 12 * scale, 165 * scale, 42 * scale, -0.42, theme);
        drawWashiTape(ctx, cardX + cardW - 64 * scale, cardY + 12 * scale, 165 * scale, 42 * scale, 0.42, theme);

        // 4. Chữ ký tay & Dấu mộc bưu điện 20.10 ở lề dưới Polaroid
        const footerMidY = winY + winH + (cardY + cardH - (winY + winH)) / 2;
        ctx.fillStyle = theme.textMid;
        ctx.font = `italic 600 ${Math.floor(32 * scale)}px "Cormorant Garamond", serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('October 20th  —  Radiant Memories ♥', winX + 12 * scale, footerMidY);

        drawPostmarkStamp(ctx, winX + winW - 64 * scale, footerMidY - 8 * scale, 44 * scale, theme);

    } else if (concept === 'aura') {
        // C4: KÍNH MỜ AURA (Frosted Glassmorphism)
        const winX = Math.floor(66 * scale);
        const winY = Math.floor(66 * scale);
        const winW = targetW - winX * 2;
        const winH = originH - Math.floor(96 * scale);
        const winR = Math.floor(32 * scale);

        if (isStep2Overlay) {
            // Ở Bước 2: phủ lớp kính mờ bán trong suốt ở viền ngoài để người dùng thấy rõ khung kính
            ctx.beginPath();
            ctx.rect(0, 0, targetW, originH);
            traceRoundedWindowPath(ctx, winX, winY, winW, winH, winR);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.58)';
            ctx.fill('evenodd');
        }

        // Khung kính ngoài (Outer Glass Slab)
        const slabX = Math.floor(38 * scale);
        const slabY = Math.floor(38 * scale);
        const slabW = targetW - slabX * 2;
        const slabH = originH - Math.floor(42 * scale);
        ctx.beginPath();
        traceRoundedWindowPath(ctx, slabX, slabY, slabW, slabH, 44 * scale);
        traceRoundedWindowPath(ctx, winX, winY, winW, winH, winR);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.34)';
        ctx.fill('evenodd');

        ctx.beginPath();
        traceRoundedWindowPath(ctx, slabX, slabY, slabW, slabH, 44 * scale);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.lineWidth = 2.6 * scale;
        ctx.stroke();

        // Viền sáng Specular ôm sát cửa sổ ảnh
        ctx.beginPath();
        traceRoundedWindowPath(ctx, winX, winY, winW, winH, winR);
        const glassGrad = ctx.createLinearGradient(winX, winY, winX + winW, winY + winH);
        glassGrad.addColorStop(0, '#ffffff');
        glassGrad.addColorStop(0.5, theme.borderSecondary);
        glassGrad.addColorStop(1, '#ffffff');
        ctx.strokeStyle = glassGrad;
        ctx.lineWidth = 3.2 * scale;
        ctx.stroke();

        // Ánh sao lấp lánh trên viền kính
        ctx.fillStyle = '#ffffff';
        drawFourPointStarPath(ctx, winX + 18 * scale, winY + 18 * scale, 14 * scale);
        ctx.fill();
        drawFourPointStarPath(ctx, winX + winW - 18 * scale, winY + winH - 18 * scale, 14 * scale);
        ctx.fill();

    } else if (concept === 'dior') {
        // C5: DIOR / JO MALONE FINE-LINE BOTANICAL (Khung vát kim cương & Hoa hồng nét mảnh ánh kim)
        const winX = Math.floor(66 * scale);
        const winY = Math.floor(66 * scale);
        const winW = targetW - winX * 2;
        const winH = originH - Math.floor(94 * scale);
        const chamf = Math.floor(46 * scale);

        ctx.beginPath();
        ctx.rect(0, 0, targetW, originH);
        traceChamferWindowPath(ctx, winX, winY, winW, winH, chamf);
        const diorMatte = ctx.createLinearGradient(0, 0, 0, originH);
        diorMatte.addColorStop(0, '#fffdf9');
        diorMatte.addColorStop(1, theme.canvasBgMid);
        ctx.fillStyle = diorMatte;
        ctx.fill('evenodd');

        // Hệ viền 3 lớp Art-Deco ánh kim
        ctx.beginPath();
        traceChamferWindowPath(ctx, winX, winY, winW, winH, chamf);
        const goldGrad = ctx.createLinearGradient(winX, winY, winX + winW, winY + winH);
        goldGrad.addColorStop(0, theme.goldAccent);
        goldGrad.addColorStop(0.5, theme.borderPrimary);
        goldGrad.addColorStop(1, theme.goldAccent);
        ctx.strokeStyle = goldGrad;
        ctx.lineWidth = 3.6 * scale;
        ctx.stroke();

        const off1 = 10 * scale;
        ctx.beginPath();
        traceChamferWindowPath(ctx, winX - off1, winY - off1, winW + off1 * 2, winH + off1 * 2, chamf + 6 * scale);
        ctx.strokeStyle = theme.goldAccent;
        ctx.lineWidth = 1.3 * scale;
        ctx.stroke();

        const off2 = 22 * scale;
        ctx.strokeStyle = theme.borderSecondary;
        ctx.lineWidth = 1.1 * scale;
        ctx.strokeRect(winX - off2, winY - off2, winW + off2 * 2, winH + off2 * 2);

        // Hoa hồng Anh Quốc nét mảnh ánh kim ở góc trên-trái và dưới-phải
        drawFineLineRoseCorner(ctx, winX - 6 * scale, winY - 6 * scale, scale * 1.18, 1, 1, theme);
        drawFineLineRoseCorner(ctx, winX + winW + 6 * scale, winY + winH + 6 * scale, scale * 1.18, -1, -1, theme);
    }

    ctx.restore();
}

function buildConceptOverlayDataUrl(conceptKey, theme) {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 1024;
    offCanvas.height = 1526;
    const offCtx = offCanvas.getContext('2d');
    renderConceptOverlayToCtx(offCtx, conceptKey, 1024, 1526, theme, true);
    return offCanvas.toDataURL('image/png');
}

function refreshConceptFramesForTheme() {
    const theme = COLOR_THEMES[currentColorTheme] || COLOR_THEMES.emerald;
    framesConfig.forEach(config => {
        if (config.isConcept && config.concept) {
            const dataUrl = buildConceptOverlayDataUrl(config.concept, theme);
            config.path = dataUrl;
            const img = new Image();
            img.src = dataUrl;
            loadedFrameImages[config.id] = img;
            const thumb = document.querySelector(`.frame-thumb-box[data-frame-thumb="${config.id}"]`);
            if (thumb) {
                thumb.style.backgroundImage = `url('${dataUrl}')`;
            }
        }
    });
    updateFrameOverlay();
}

function preloadFrames() {
    const theme = COLOR_THEMES[currentColorTheme] || COLOR_THEMES.emerald;
    framesConfig.forEach(config => {
        const img = new Image();
        if (config.isConcept && config.concept) {
            config.path = buildConceptOverlayDataUrl(config.concept, theme);
        }
        img.src = config.path;
        loadedFrameImages[config.id] = img;
    });
}
preloadFrames();

function selectFrameById(frameId, shouldRedrawStep3 = false) {
    currentSelectedFrameId = frameId;

    document.querySelectorAll('#frame-list .frame-item').forEach((el, idx) => {
        el.classList.toggle('active', idx === frameId);
    });
    document.querySelectorAll('#step3-concept-chips .concept-chip, #step3-classic-frame-chips .style-chip').forEach(btn => {
        const id = Number(btn.getAttribute('data-frame-id'));
        btn.classList.toggle('active', id === frameId);
    });

    updateFrameOverlay();

    if (shouldRedrawStep3 && currentUserImage) {
        drawCanvasImageText(finalResultCanvas, true);
        triggerCardPulse();
    }
}

function renderFrameList() {
    frameList.innerHTML = '';
    const step3ConceptChips = document.getElementById('step3-concept-chips');
    const step3ClassicChips = document.getElementById('step3-classic-frame-chips');
    if (step3ConceptChips) step3ConceptChips.innerHTML = '';
    if (step3ClassicChips) step3ClassicChips.innerHTML = '';

    framesConfig.forEach((f, i) => {
        // 1. Item trong Carousel Bước 2
        const div = document.createElement('div');
        div.className = `frame-item ${f.isConcept ? 'is-concept' : ''} ${i === currentSelectedFrameId ? 'active' : ''}`;
        div.innerHTML = `
            <div class="frame-thumb-box" data-frame-thumb="${i}" style="width:100%; height:44px; background: url('${f.path}') center/contain no-repeat; margin-bottom:3px;"></div>
            <span>${f.label}</span>
        `;
        div.onclick = () => selectFrameById(i, false);
        frameList.appendChild(div);

        // 2. Chip chọn nhanh trực tiếp ở Bước 3
        if (f.isConcept && step3ConceptChips) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `concept-chip ${i === currentSelectedFrameId ? 'active' : ''}`;
            btn.setAttribute('data-frame-id', String(i));
            btn.textContent = f.fullLabel;
            btn.onclick = () => selectFrameById(i, true);
            step3ConceptChips.appendChild(btn);
        } else if (!f.isConcept && step3ClassicChips) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `style-chip ${i === currentSelectedFrameId ? 'active' : ''}`;
            btn.setAttribute('data-frame-id', String(i));
            btn.textContent = f.fullLabel;
            btn.onclick = () => selectFrameById(i, true);
            step3ClassicChips.appendChild(btn);
        }
    });
}
renderFrameList();

let originalImgSrc = null;
let currentSelectedFilter = 'none';

function applyFilterToPreview() {
    const previewImgs = document.querySelectorAll('.cropper-canvas img, .cropper-view-box img');
    previewImgs.forEach(img => {
        img.style.filter = currentSelectedFilter;
    });
}

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentSelectedFilter = e.currentTarget.getAttribute('data-filter');
        applyFilterToPreview();
    });
});

// Nút Lật ảnh gương & Xoay 90° (nằm ngoài khung hình ở Bước 2)
document.getElementById('flip-h-btn').addEventListener('click', () => {
    if (!cropperObj) return;
    currentScaleX = -currentScaleX;
    cropperObj.scaleX(currentScaleX);
});

document.getElementById('rotate-btn').addEventListener('click', () => {
    if (!cropperObj) return;
    cropperObj.rotate(90);
    const cont = cropperObj.getContainerData();
    cropperObj.setCropBoxData({ left: 0, top: 0, width: cont.width, height: cont.height });
});

async function handleImageInput(e) {
    const file = e.target.files[0];
    if (!file) return;

    currentScaleX = 1;
    hasGeneratedQuoteOnce = false;

    step1.classList.remove('active');
    step2.classList.add('active');

    const reader = new FileReader();
    reader.onload = function (event) {
        originalImgSrc = event.target.result;
        requestAnimationFrame(() => {
            fitPreviewAreaToStage();
            setTimeout(() => {
                fitPreviewAreaToStage();
                initCropper();
                initScrollHints();
            }, 60);
        });
    };
    reader.readAsDataURL(file);
}

function initCropper() {
    const imageEl = document.getElementById('cropper-image');
    imageEl.src = originalImgSrc;

    updateFrameOverlay();

    if (cropperObj) cropperObj.destroy();
    cropperObj = new Cropper(imageEl, {
        aspectRatio: FRAME_ASPECT_RATIO,
        viewMode: 3, // Giữ ảnh luôn lấp đầy 100% khung hình, không bao giờ làm hụt hay lẹm khung
        dragMode: 'move',
        autoCropArea: 1,
        cropBoxMovable: false,
        cropBoxResizable: false,
        toggleDragModeOnDblclick: false,
        guides: false,
        center: false,
        highlight: false,
        background: false,
        modal: false,
        ready: function () {
            const cont = cropperObj.getContainerData();
            cropperObj.setCropBoxData({ left: 0, top: 0, width: cont.width, height: cont.height });
            applyFilterToPreview();

            const hint = document.getElementById('drag-hint');
            hint.classList.remove('hidden');

            const hideHint = () => hint.classList.add('hidden');
            const previewArea = document.getElementById('preview-area-wrap');
            previewArea.addEventListener('touchstart', hideHint, { once: true, passive: true });
            previewArea.addEventListener('mousedown', hideHint, { once: true });
        }
    });
}

// Cập nhật trực tiếp lớp ảnh khung nằm phủ trên #preview-area-wrap (không bị Cropper cắt lẹm)
function updateFrameOverlay() {
    if (frameOverlayEl && framesConfig[currentSelectedFrameId]) {
        frameOverlayEl.src = framesConfig[currentSelectedFrameId].path;
    }
}

document.getElementById('upload-btn').addEventListener('change', handleImageInput);
document.getElementById('selfie-btn').addEventListener('change', handleImageInput);

document.getElementById('cancel-btn').addEventListener('click', () => {
    step2.classList.remove('active');
    step1.classList.add('active');
    document.getElementById('upload-btn').value = '';
    document.getElementById('selfie-btn').value = '';
});

// ====== BƯỚC 2 -> BƯỚC 3: HOÀN THIỆN THIỆP ======
document.getElementById('generate-final-btn').addEventListener('click', () => {
    if (!cropperObj) return;

    const btn = document.getElementById('generate-final-btn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = "🌸 Đang tạo...";
    btn.disabled = true;

    const overlay = document.getElementById('transition-overlay');
    overlay.querySelectorAll('.fly-petal').forEach(el => el.remove());

    const petals = ['🌸', '🌺', '🌷', '🌹', '💮', '✿', '🌼', '💐'];
    const count = 14;
    for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'fly-petal';
        el.textContent = petals[i % petals.length];
        const angle = (i / count) * Math.PI * 2;
        const d1 = 60 + Math.random() * 40;
        const d2 = 110 + Math.random() * 60;
        const d3 = 160 + Math.random() * 80;
        el.style.setProperty('--tx1', `${Math.cos(angle) * d1}px`);
        el.style.setProperty('--ty1', `${Math.sin(angle) * d1}px`);
        el.style.setProperty('--tx2', `${Math.cos(angle) * d2}px`);
        el.style.setProperty('--ty2', `${Math.sin(angle) * d2}px`);
        el.style.setProperty('--tx3', `${Math.cos(angle) * d3}px`);
        el.style.setProperty('--ty3', `${Math.sin(angle) * d3}px`);
        el.style.setProperty('--r1', `${Math.random() * 120 - 60}deg`);
        el.style.setProperty('--r2', `${Math.random() * 240 - 120}deg`);
        el.style.setProperty('--r3', `${Math.random() * 360 - 180}deg`);
        el.style.animationDelay = `${Math.random() * 0.25}s`;
        overlay.appendChild(el);
    }

    overlay.classList.remove('playing');
    void overlay.offsetWidth;
    overlay.classList.add('playing');
    setTimeout(() => overlay.classList.remove('playing'), 2300);

    setTimeout(() => {
        const frameImg = loadedFrameImages[currentSelectedFrameId];
        const targetW = (frameImg && frameImg.naturalWidth) ? frameImg.naturalWidth : 1024;
        const targetH = (frameImg && frameImg.naturalHeight) ? frameImg.naturalHeight : 1526;

        const canvas = cropperObj.getCroppedCanvas({ width: targetW, height: targetH });
        const img = new Image();
        img.onload = function () {
            currentUserImage = img;
            // Chỉ bốc câu chúc mới ở lần đầu tạo thiệp; khi quay lại Bước 2 đổi khung thì giữ nguyên câu chúc!
            if (!hasGeneratedQuoteOnce || (!currentAIQuote && !customWishText)) {
                currentAIQuote = getNextQuoteByTopic(currentTopic);
                hasGeneratedQuoteOnce = true;
            }

            ensureQuoteFont().then(() => {
                drawCanvasImageText(finalResultCanvas, true);
            });

            setTimeout(() => {
                step2.classList.remove('active');
                step3.classList.add('active');
                btn.innerHTML = originalHTML;
                btn.disabled = false;

                requestAnimationFrame(() => {
                    fitCardShowcaseToWrap();
                    if (cardShowcase) {
                        cardShowcase.classList.remove('reveal-playing');
                        void cardShowcase.offsetWidth;
                        cardShowcase.classList.add('reveal-playing');
                    }
                });
                setTimeout(() => triggerCelebrationBurst(), 250);
            }, 680);
        };
        img.src = canvas.toDataURL('image/jpeg', 0.95);
    }, 140);
});

// ====== BẢNG ĐIỀU KHIỂN 2 TAB & MODAL TẠI BƯỚC 3 ======
function triggerCardPulse() {
    if (!cardShowcase) return;
    cardShowcase.classList.remove('reveal-playing', 'pulse-playing');
    void cardShowcase.offsetWidth;
    cardShowcase.classList.add('pulse-playing');
}

// Chuyển đổi giữa Tab "💌 Lời chúc & Tên" và Tab "🌸 Viền & Màu hộp chữ"
document.querySelectorAll('.deck-tab').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
        const targetId = tabBtn.getAttribute('data-tab');
        document.querySelectorAll('.deck-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.deck-pane').forEach(p => p.classList.remove('active'));
        tabBtn.classList.add('active');
        const pane = document.getElementById(targetId);
        if (pane) pane.classList.add('active');
        requestAnimationFrame(fitCardShowcaseToWrap);
    });
});

// 1. Nút "🎲 Đổi câu chúc khác"
document.getElementById('shuffle-quote-btn').addEventListener('click', () => {
    isCustomWishActive = false;
    currentAIQuote = getNextQuoteByTopic(currentTopic);
    drawCanvasImageText(finalResultCanvas, true);
    triggerCardPulse();

    if (cardShowcase) {
        const rect = cardShowcase.getBoundingClientRect();
        spawnTouchSparkle(rect.left + rect.width * 0.5, rect.top + rect.height * 0.8, 5);
    }
});

// 2. Chọn Chủ đề lời chúc
document.querySelectorAll('.topic-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.topic-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentTopic = chip.getAttribute('data-topic');
        isCustomWishActive = false;
        currentAIQuote = getNextQuoteByTopic(currentTopic);
        drawCanvasImageText(finalResultCanvas, true);
        triggerCardPulse();
    });
});

// 3. Modal "✍️ Tiêu đề / Tự viết"
const textEditModal = document.getElementById('text-edit-modal');
const recipientInput = document.getElementById('recipient-input');
const recipientCount = document.getElementById('recipient-count');
const customWishInput = document.getElementById('custom-wish-input');
const wishCharCount = document.getElementById('wish-char-count');

document.getElementById('open-text-modal-btn').addEventListener('click', () => {
    recipientInput.value = recipientName;
    recipientCount.textContent = `${recipientName.length}/45`;
    const activeText = getActiveQuoteText();
    customWishInput.value = activeText;
    wishCharCount.textContent = `${activeText.length}/160`;
    textEditModal.style.display = 'flex';
});

document.getElementById('close-text-modal').addEventListener('click', () => {
    textEditModal.style.display = 'none';
});

textEditModal.addEventListener('click', (e) => {
    if (e.target === textEditModal) textEditModal.style.display = 'none';
});

recipientInput.addEventListener('input', (e) => {
    recipientCount.textContent = `${e.target.value.length}/45`;
});

customWishInput.addEventListener('input', (e) => {
    wishCharCount.textContent = `${e.target.value.length}/160`;
});

document.getElementById('modal-random-wish-btn').addEventListener('click', () => {
    const suggested = getNextQuoteByTopic(currentTopic);
    customWishInput.value = suggested;
    wishCharCount.textContent = `${suggested.length}/160`;
});

document.getElementById('modal-clear-wish-btn').addEventListener('click', () => {
    customWishInput.value = '';
    wishCharCount.textContent = '0/160';
    customWishInput.focus();
});

document.getElementById('apply-text-modal-btn').addEventListener('click', () => {
    recipientName = recipientInput.value.trim();
    const typedWish = customWishInput.value.trim();
    if (typedWish) {
        customWishText = typedWish;
        isCustomWishActive = true;
    } else {
        isCustomWishActive = false;
    }
    textEditModal.style.display = 'none';
    drawCanvasImageText(finalResultCanvas, true);
    triggerCardPulse();
});

// 4. Chọn Kiểu viền lãng mạn & Tông màu nữ tính
document.querySelectorAll('#border-style-chips .style-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('#border-style-chips .style-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentBorderStyle = chip.getAttribute('data-border');
        drawCanvasImageText(finalResultCanvas, true);
        triggerCardPulse();
    });
});

document.querySelectorAll('.color-swatch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentColorTheme = btn.getAttribute('data-theme');
        refreshConceptFramesForTheme();
        drawCanvasImageText(finalResultCanvas, true);
        triggerCardPulse();
    });
});

// 5. Nút "‹ Căn lại ảnh" (Quay về Bước 2 giữ nguyên ảnh & giữ nguyên câu chúc)
document.getElementById('back-step2-btn').addEventListener('click', () => {
    step3.classList.remove('active');
    step2.classList.add('active');
    requestAnimationFrame(fitPreviewAreaToStage);
});

// 6. Nút "📷 Ảnh mới" (Quay về Bước 1 chọn ảnh mới)
document.getElementById('redo-btn').addEventListener('click', () => {
    step3.classList.remove('active');
    step1.classList.add('active');
    document.getElementById('upload-btn').value = '';
    document.getElementById('selfie-btn').value = '';
    currentUserImage = null;
    hasGeneratedQuoteOnce = false;
});

// ====== LƯU & CHIA SẺ THIỆP (CHUẨN iOS / ANDROID / TELEGRAM - CHỈ GỬI ẢNH) ======
const saveGuideModal = document.getElementById('save-guide-modal');
const saveModalImg = document.getElementById('save-modal-img');
document.getElementById('close-save-modal').addEventListener('click', () => {
    saveGuideModal.style.display = 'none';
});
saveGuideModal.addEventListener('click', (e) => {
    if (e.target === saveGuideModal) saveGuideModal.style.display = 'none';
});

function showSaveFallbackModal() {
    if (finalResultImg && finalResultImg.src) {
        saveModalImg.src = finalResultImg.src;
        saveGuideModal.style.display = 'flex';
    }
}

document.getElementById('download-btn').addEventListener('click', () => {
    if (!finalResultCanvas) return;

    finalResultCanvas.toBlob(async (blob) => {
        if (!blob) {
            showSaveFallbackModal();
            return;
        }

        const file = new File([blob], 'Thiep_20_10.jpg', { type: 'image/jpeg' });

        // Ưu tiên 1: Trên iOS / Android, gọi Web Share API CHỈ VỚI FILE ẢNH (không truyền text/url)
        if (isMobileDevice() && navigator.canShare && navigator.share) {
            try {
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file] });
                    return;
                }
            } catch (err) {
                if (err && err.name === 'AbortError') return;
            }
        }

        // Ưu tiên 2: Nếu mở trong Telegram/Zalo WebView hoặc iOS không hỗ trợ Web Share file
        if (isInAppBrowser() || isIOSDevice()) {
            showSaveFallbackModal();
            return;
        }

        // Ưu tiên 3: Tải trực tiếp qua Blob URL trên Desktop / Android Chrome
        try {
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = 'Thiep_20_10.jpg';
            link.href = blobUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        } catch (e) {
            showSaveFallbackModal();
        }
    }, 'image/jpeg', 0.95);
});

// ====== VẼ THIỆP & HỘP LỜI CHÚC LÃNG MẠN TRÊN CANVAS ======
function formatRecipientLine(rawTitle) {
    return (rawTitle || '').trim();
}

function getActiveQuoteText() {
    if (isCustomWishActive && (customWishText || '').trim()) {
        return customWishText.trim();
    }
    return currentAIQuote || wishes2010[0];
}

function drawCanvasImageText(targetCanvas, isFinal) {
    if (!currentUserImage) return;

    const selectedConfig = framesConfig[currentSelectedFrameId] || framesConfig[0];
    const frameImg = loadedFrameImages[currentSelectedFrameId];
    if (!selectedConfig.isConcept && (!frameImg || !frameImg.complete)) {
        setTimeout(() => drawCanvasImageText(targetCanvas, isFinal), 80);
        return;
    }

    const targetW = 1024;
    const originH = 1526;
    const scale = targetW / 1024;
    const textSpaceHeight = Math.floor(originH * 0.35);
    const targetH = isFinal ? originH + textSpaceHeight : originH;

    const theme = COLOR_THEMES[currentColorTheme] || COLOR_THEMES.emerald;
    const ctx = targetCanvas.getContext('2d');
    targetCanvas.width = targetW;
    targetCanvas.height = targetH;

    if (selectedConfig.isConcept && selectedConfig.concept === 'aura') {
        // ====== CONCEPT 4: KÍNH MỜ AURA (NỀN MỜ TỪ CHÍNH ẢNH NGƯỜI DÙNG PHỦ TOÀN BỘ THIỆP) ======
        ctx.save();
        ctx.fillStyle = theme.canvasBgMid;
        ctx.fillRect(0, 0, targetW, targetH);

        ctx.filter = 'blur(42px) saturate(1.32) brightness(1.04)';
        const bleed = 80 * scale;
        ctx.drawImage(currentUserImage, -bleed, -bleed, targetW + bleed * 2, targetH + bleed * 2);
        ctx.filter = 'none';

        const veilGrad = ctx.createLinearGradient(0, 0, 0, targetH);
        veilGrad.addColorStop(0, 'rgba(255, 255, 255, 0.24)');
        veilGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0.32)');
        veilGrad.addColorStop(1, theme.boxFillEnd);
        ctx.fillStyle = veilGrad;
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.restore();

        // Đổ bóng khối kính nổi và cắt ảnh chính sắc nét bên trong cửa sổ kính bo tròn
        const winX = Math.floor(66 * scale);
        const winY = Math.floor(66 * scale);
        const winW = targetW - winX * 2;
        const winH = originH - Math.floor(96 * scale);
        const winR = Math.floor(32 * scale);

        ctx.save();
        ctx.shadowColor = 'rgba(10, 30, 24, 0.26)';
        ctx.shadowBlur = 32 * scale;
        ctx.shadowOffsetY = 12 * scale;
        ctx.beginPath();
        traceRoundedWindowPath(ctx, winX, winY, winW, winH, winR);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        traceRoundedWindowPath(ctx, winX, winY, winW, winH, winR);
        ctx.clip();
        if (currentSelectedFilter !== 'none') ctx.filter = currentSelectedFilter;
        ctx.drawImage(currentUserImage, 0, 0, targetW, originH);
        ctx.filter = 'none';
        ctx.restore();

        renderConceptOverlayToCtx(ctx, 'aura', targetW, originH, theme, false);

    } else if (selectedConfig.isConcept) {
        // ====== CÁC CONCEPT C1 (ARCH), C2 (MAGAZINE), C3 (POLAROID), C5 (DIOR) ======
        // 1. Vẽ nền liền mạch toàn tấm thiệp
        const fullGrad = ctx.createLinearGradient(0, 0, 0, targetH);
        fullGrad.addColorStop(0, theme.canvasBgStart);
        fullGrad.addColorStop(0.5, theme.canvasBgMid);
        fullGrad.addColorStop(1, theme.canvasBgEnd);
        ctx.fillStyle = fullGrad;
        ctx.fillRect(0, 0, targetW, targetH);

        if (isFinal) {
            drawBottomAmbientDecor(ctx, targetW, originH, textSpaceHeight, scale, theme);
        }

        // 2. Vẽ ảnh người dùng đã cắt kèm bộ lọc màu
        ctx.save();
        if (selectedConfig.concept === 'polaroid') {
            const winX = Math.floor(88 * scale);
            const winY = Math.floor(98 * scale);
            const winW = targetW - winX * 2;
            const winH = originH - Math.floor(245 * scale);
            ctx.beginPath();
            traceRoundedWindowPath(ctx, winX, winY, winW, winH, 12 * scale);
            ctx.clip();
        }
        if (currentSelectedFilter !== 'none') {
            ctx.filter = currentSelectedFilter;
        }
        ctx.drawImage(currentUserImage, 0, 0, targetW, originH);
        ctx.filter = 'none';
        ctx.restore();

        // 3. Vẽ trực tiếp lớp thiết kế Concept sắc nét lên Canvas
        renderConceptOverlayToCtx(ctx, selectedConfig.concept, targetW, originH, theme, false);

        // 4. Đường viền mảnh bao quanh toàn bộ tấm thiệp (tạo sự liền khối từ đỉnh xuống đáy)
        if (isFinal && (selectedConfig.concept === 'arch' || selectedConfig.concept === 'dior' || selectedConfig.concept === 'magazine')) {
            ctx.save();
            const outerM = Math.floor(22 * scale);
            ctx.strokeStyle = theme.borderSecondary;
            ctx.lineWidth = 1.6 * scale;
            ctx.strokeRect(outerM, outerM, targetW - outerM * 2, targetH - outerM * 2);
            ctx.restore();
        }
    } else {
        // ====== 10 KHUNG ẢNH PNG TRUYỀN THỐNG ======
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetW, originH);

        if (isFinal) {
            const bottomGrad = ctx.createLinearGradient(0, originH, 0, targetH);
            bottomGrad.addColorStop(0, theme.canvasBgStart);
            bottomGrad.addColorStop(0.32, theme.canvasBgMid);
            bottomGrad.addColorStop(1, theme.canvasBgEnd);
            ctx.fillStyle = bottomGrad;
            ctx.fillRect(0, originH, targetW, textSpaceHeight);

            drawBottomAmbientDecor(ctx, targetW, originH, textSpaceHeight, scale, theme);
        }

        if (currentSelectedFilter !== 'none') {
            ctx.filter = currentSelectedFilter;
        }
        ctx.drawImage(currentUserImage, 0, 0, targetW, originH);
        ctx.filter = 'none';

        ctx.drawImage(frameImg, 0, 0, targetW, originH);
    }

    // 4. Vẽ hộp lời chúc nghệ thuật
    const activeQuote = getActiveQuoteText();
    if (isFinal && activeQuote) {
        const marginX = Math.floor(targetW * 0.056);
        const boxX = marginX;
        const boxY = originH + Math.floor(textSpaceHeight * 0.085);
        const boxW = targetW - marginX * 2;
        const boxH = Math.floor(textSpaceHeight * 0.82);
        const radius = Math.floor(targetW * 0.034);

        drawRomanticQuoteBox(ctx, boxX, boxY, boxW, boxH, radius, scale, theme, currentBorderStyle);

        const recipientLine = formatRecipientLine(recipientName);
        const layout = fitQuoteInBox(ctx, activeQuote, recipientLine, boxW, boxH, scale, currentBorderStyle);

        drawQuoteContent(ctx, boxX, boxY, boxW, boxH, layout, theme, scale);
    }

    // Đồng bộ sang thẻ <img> và căn lại đúng tỷ lệ hiển thị trọn vẹn 100% trên màn hình
    if (isFinal && finalResultImg) {
        try {
            const dataUrl = targetCanvas.toDataURL('image/jpeg', 0.95);
            finalResultImg.src = dataUrl;
            if (saveModalImg && saveGuideModal.style.display !== 'none') {
                saveModalImg.src = dataUrl;
            }
            fitCardShowcaseToWrap();
        } catch (e) {
            console.error(e);
        }
    }
}

function drawBottomAmbientDecor(ctx, targetW, originH, textSpaceHeight, scale, theme) {
    ctx.save();
    const spots = [
        { x: 0.08, y: 0.22, r: 42 },
        { x: 0.92, y: 0.25, r: 48 },
        { x: 0.14, y: 0.85, r: 36 },
        { x: 0.88, y: 0.82, r: 40 },
        { x: 0.5, y: 0.92, r: 52 }
    ];
    spots.forEach(s => {
        const cx = targetW * s.x;
        const cy = originH + textSpaceHeight * s.y;
        const rad = s.r * scale;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, theme.flowerSoft);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}

// ====== 5 KIỂU VIỀN HỘP LỜI CHÚC THANH LỊCH & TINH TẾ ======
function createBoxPath(ctx, x, y, w, h, r, style) {
    ctx.beginPath();
    if (style === 'vintage') {
        const cr = r * 0.85;
        ctx.moveTo(x + cr, y);
        ctx.lineTo(x + w - cr, y);
        ctx.arcTo(x + w - cr, y + cr, x + w, y + cr, cr);
        ctx.lineTo(x + w, y + h - cr);
        ctx.arcTo(x + w - cr, y + h - cr, x + w - cr, y + h, cr);
        ctx.lineTo(x + cr, y + h);
        ctx.arcTo(x + cr, y + h - cr, x, y + h - cr, cr);
        ctx.lineTo(x, y + cr);
        ctx.arcTo(x + cr, y + cr, x + cr, y, cr);
    } else {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
    }
    ctx.closePath();
}

function drawRomanticQuoteBox(ctx, boxX, boxY, boxW, boxH, radius, scale, theme, style) {
    ctx.save();

    ctx.shadowColor = theme.shadowRgba;
    ctx.shadowBlur = 24 * scale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8 * scale;

    createBoxPath(ctx, boxX, boxY, boxW, boxH, radius, style);
    const bgGrad = ctx.createLinearGradient(0, boxY, 0, boxY + boxH);
    bgGrad.addColorStop(0, theme.boxFillStart);
    bgGrad.addColorStop(1, theme.boxFillEnd);
    ctx.fillStyle = bgGrad;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    const borderGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
    borderGrad.addColorStop(0, theme.borderPrimary);
    borderGrad.addColorStop(0.5, theme.borderSecondary);
    borderGrad.addColorStop(1, theme.borderPrimary);
    ctx.lineWidth = Math.max(2, 3.2 * scale);
    ctx.strokeStyle = borderGrad;
    ctx.stroke();

    const inset = Math.floor(11 * scale);
    createBoxPath(ctx, boxX + inset, boxY + inset, boxW - inset * 2, boxH - inset * 2, Math.max(6, radius - inset * 0.6), style);
    ctx.lineWidth = Math.max(1, 1.3 * scale);
    ctx.strokeStyle = theme.borderSecondary;
    ctx.stroke();

    ctx.save();
    ctx.font = `italic 700 ${Math.floor(96 * scale)}px "Playfair Display", serif`;
    ctx.fillStyle = theme.flowerSoft;
    ctx.globalAlpha = style === 'vintage' ? 0.2 : 0.12;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('“', boxX + 22 * scale, boxY + 8 * scale);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('”', boxX + boxW - 22 * scale, boxY + boxH - 2 * scale);
    ctx.restore();

    const midY = boxY + boxH / 2;
    const midX = boxX + boxW / 2;

    if (style === 'sakura') {
        drawSakuraCluster(ctx, boxX + 26 * scale, midY, 17 * scale, theme);
        drawSakuraCluster(ctx, boxX + boxW - 26 * scale, midY, 17 * scale, theme);
        drawCornerPearls(ctx, boxX, boxY, boxW, boxH, scale, theme);
    } else if (style === 'ribbon') {
        drawSilkRibbonBow(ctx, midX, boxY + 2 * scale, 34 * scale, theme);
        drawCornerPearls(ctx, boxX, boxY, boxW, boxH, scale, theme);
        drawSakuraFlower(ctx, boxX + 24 * scale, midY, 12 * scale, theme.flowerMain, theme.goldAccent);
        drawSakuraFlower(ctx, boxX + boxW - 24 * scale, midY, 12 * scale, theme.flowerMain, theme.goldAccent);
    } else if (style === 'hearts') {
        drawRomanticHeartsCluster(ctx, midX, boxY + 2 * scale, 18 * scale, theme);
        drawCornerStars(ctx, boxX, boxY, boxW, boxH, scale, theme);
        drawRomanticHeartsCluster(ctx, boxX + 25 * scale, midY, 14 * scale, theme);
        drawRomanticHeartsCluster(ctx, boxX + boxW - 25 * scale, midY, 14 * scale, theme);
    } else if (style === 'daisy') {
        drawDaisyVineSide(ctx, boxX + 25 * scale, midY, scale, -1, theme);
        drawDaisyVineSide(ctx, boxX + boxW - 25 * scale, midY, scale, 1, theme);
        drawCornerPearls(ctx, boxX, boxY, boxW, boxH, scale, theme);
    } else if (style === 'vintage') {
        drawVintageCornerFlourishes(ctx, boxX, boxY, boxW, boxH, scale, theme);
        drawSakuraFlower(ctx, boxX + 24 * scale, midY, 13 * scale, theme.flowerMain, theme.goldAccent);
        drawSakuraFlower(ctx, boxX + boxW - 24 * scale, midY, 13 * scale, theme.flowerMain, theme.goldAccent);
    }

    ctx.restore();
}

function drawSakuraFlower(ctx, cx, cy, radius, petalColor, centerColor) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = petalColor;
    for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI * 2) / 5 - Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-radius * 0.55, -radius * 0.35, -radius * 0.48, -radius * 0.98, -radius * 0.12, -radius);
        ctx.lineTo(0, -radius * 0.82);
        ctx.lineTo(radius * 0.12, -radius);
        ctx.bezierCurveTo(radius * 0.48, -radius * 0.98, radius * 0.55, -radius * 0.35, 0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    ctx.fillStyle = centerColor;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.22, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * radius * 0.34, Math.sin(a) * radius * 0.34, radius * 0.07, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawLeaf(ctx, x, y, angle, length, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(length * 0.5, -length * 0.36, length, 0);
    ctx.quadraticCurveTo(length * 0.5, length * 0.36, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawSakuraCluster(ctx, cx, cy, size, theme) {
    ctx.save();
    ctx.globalAlpha = 0.88;
    drawLeaf(ctx, cx, cy - size * 0.5, -Math.PI * 0.42, size * 1.15, theme.leafColor);
    drawLeaf(ctx, cx, cy + size * 0.5, Math.PI * 0.42, size * 1.15, theme.leafColor);
    drawSakuraFlower(ctx, cx, cy, size, theme.flowerMain, theme.goldAccent);
    drawSakuraFlower(ctx, cx, cy - size * 1.35, size * 0.52, theme.flowerSoft, theme.goldAccent);
    drawSakuraFlower(ctx, cx, cy + size * 1.35, size * 0.52, theme.flowerSoft, theme.goldAccent);
    ctx.restore();
}

function drawSilkRibbonBow(ctx, cx, cy, size, theme) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = theme.flowerMain;
    ctx.lineWidth = size * 0.12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-size * 0.2, 0);
    ctx.bezierCurveTo(-size * 0.9, size * 0.5, -size * 1.5, -size * 0.18, -size * 2.1, size * 0.3);
    ctx.moveTo(size * 0.2, 0);
    ctx.bezierCurveTo(size * 0.9, size * 0.5, size * 1.5, -size * 0.18, size * 2.1, size * 0.3);
    ctx.stroke();

    ctx.fillStyle = theme.flowerSoft;
    ctx.strokeStyle = theme.flowerMain;
    ctx.lineWidth = size * 0.06;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-size * 0.9, -size * 0.65, -size * 1.1, size * 0.5, 0, size * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(size * 0.9, -size * 0.65, size * 1.1, size * 0.5, 0, size * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = theme.flowerMain;
    ctx.beginPath();
    ctx.ellipse(0, size * 0.04, size * 0.18, size * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawCornerPearls(ctx, boxX, boxY, boxW, boxH, scale, theme) {
    const corners = [
        [boxX + 22 * scale, boxY + 22 * scale],
        [boxX + boxW - 22 * scale, boxY + 22 * scale],
        [boxX + 22 * scale, boxY + boxH - 22 * scale],
        [boxX + boxW - 22 * scale, boxY + boxH - 22 * scale]
    ];
    ctx.save();
    corners.forEach(([x, y]) => {
        ctx.fillStyle = theme.goldAccent;
        ctx.beginPath();
        ctx.arc(x, y, 4 * scale, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}

function drawRomanticHeartsCluster(ctx, cx, cy, size, theme) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.12);
    ctx.fillStyle = theme.flowerMain;
    drawMiniHeartPath(ctx, -size * 0.22, 0, size * 1.1);
    ctx.fill();

    ctx.rotate(0.28);
    ctx.fillStyle = theme.flowerSoft;
    ctx.strokeStyle = theme.flowerMain;
    ctx.lineWidth = size * 0.08;
    drawMiniHeartPath(ctx, size * 0.35, -size * 0.12, size * 0.82);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function drawCornerStars(ctx, boxX, boxY, boxW, boxH, scale, theme) {
    const pts = [
        [boxX + 26 * scale, boxY + 26 * scale, 9 * scale],
        [boxX + boxW - 26 * scale, boxY + 26 * scale, 9 * scale],
        [boxX + 26 * scale, boxY + boxH - 26 * scale, 9 * scale],
        [boxX + boxW - 26 * scale, boxY + boxH - 26 * scale, 9 * scale]
    ];
    ctx.save();
    ctx.fillStyle = theme.goldAccent;
    pts.forEach(([x, y, r]) => {
        drawFourPointStarPath(ctx, x, y, r);
        ctx.fill();
    });
    ctx.restore();
}

function drawDaisyFlower(ctx, cx, cy, radius, petalColor, centerColor) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = petalColor;
    const petals = 10;
    for (let i = 0; i < petals; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI * 2) / petals);
        ctx.beginPath();
        ctx.ellipse(0, -radius * 0.62, radius * 0.22, radius * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    ctx.fillStyle = centerColor;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawDaisyVineSide(ctx, cx, cy, scale, dir, theme) {
    ctx.save();
    const hSpan = 60 * scale;
    ctx.strokeStyle = theme.leafColor;
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(cx, cy - hSpan);
    ctx.quadraticCurveTo(cx + dir * 10 * scale, cy, cx, cy + hSpan);
    ctx.stroke();

    drawLeaf(ctx, cx, cy - 34 * scale, dir > 0 ? -0.5 : -2.6, 15 * scale, theme.leafColor);
    drawLeaf(ctx, cx, cy + 34 * scale, dir > 0 ? 0.5 : 2.6, 15 * scale, theme.leafColor);
    drawDaisyFlower(ctx, cx + dir * 3 * scale, cy, 14 * scale, theme.flowerMain, theme.goldAccent);
    drawDaisyFlower(ctx, cx - dir * 2 * scale, cy - 44 * scale, 9 * scale, theme.flowerSoft, theme.goldAccent);
    drawDaisyFlower(ctx, cx - dir * 2 * scale, cy + 44 * scale, 9 * scale, theme.flowerSoft, theme.goldAccent);
    ctx.restore();
}

function drawVintageCornerFlourishes(ctx, boxX, boxY, boxW, boxH, scale, theme) {
    const corners = [
        [boxX + 22 * scale, boxY + 22 * scale, 1, 1],
        [boxX + boxW - 22 * scale, boxY + 22 * scale, -1, 1],
        [boxX + 22 * scale, boxY + boxH - 22 * scale, 1, -1],
        [boxX + boxW - 22 * scale, boxY + boxH - 22 * scale, -1, -1]
    ];
    ctx.save();
    ctx.strokeStyle = theme.borderPrimary;
    ctx.lineWidth = 2 * scale;
    corners.forEach(([x, y, sx, sy]) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(sx, sy);
        ctx.beginPath();
        ctx.moveTo(0, 26 * scale);
        ctx.quadraticCurveTo(0, 0, 26 * scale, 0);
        ctx.stroke();
        drawFourPointStarPath(ctx, 10 * scale, 10 * scale, 5 * scale);
        ctx.fillStyle = theme.goldAccent;
        ctx.fill();
        ctx.restore();
    });
    ctx.restore();
}

// ====== THUẬT TOÁN ĐO ĐẠC & CO CHỮ TỰ ĐỘNG (TIÊU ĐỀ LỚN NỔI BẬT + LỜI CHÚC KHÔNG XUNG ĐỘT & KHÔNG TRÀN KHUNG) ======
const QUOTE_LINE_HEIGHT = 1.48;
const TITLE_LINE_HEIGHT = 1.24;

function quoteFont(size) {
    return `italic 500 ${size}px "Playfair Display", serif`;
}

function recipientFont(size) {
    return `700 ${size}px "Playfair Display", serif`;
}

function ensureQuoteFont() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.race([
        Promise.all([
            document.fonts.load(quoteFont(56), 'Chúc mừng 20/10'),
            document.fonts.load(recipientFont(64), 'Happy Women Day 20/10'),
            document.fonts.load('italic 700 68px "Cormorant Garamond", serif', 'LA BEAUTÉ')
        ]),
        new Promise(resolve => setTimeout(resolve, 2000))
    ]).catch(() => {});
}
ensureQuoteFont().then(() => {
    refreshConceptFramesForTheme();
});

function inkWidth(ctx, s) {
    const m = ctx.measureText(s);
    const ink = (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || 0);
    return Math.max(m.width, ink);
}

function wrapLines(ctx, text, maxWidth) {
    const paragraphs = String(text || '').split(/\n+/).map(p => p.trim()).filter(Boolean);
    const allLines = [];

    for (const para of paragraphs) {
        const words = para.split(/\s+/).filter(Boolean);
        let line = '';
        for (const word of words) {
            const test = line ? line + ' ' + word : word;
            if (inkWidth(ctx, test) <= maxWidth) {
                line = test;
                continue;
            }
            if (line) allLines.push(line);
            if (inkWidth(ctx, word) > maxWidth) {
                let chunk = '';
                for (const ch of word) {
                    if (chunk && inkWidth(ctx, chunk + ch) > maxWidth) {
                        allLines.push(chunk);
                        chunk = ch;
                    } else {
                        chunk += ch;
                    }
                }
                line = chunk;
            } else {
                line = word;
            }
        }
        if (line) allLines.push(line);
    }
    return allLines.length ? allLines : [''];
}

function fitQuoteInBox(ctx, text, recipientLine, boxW, boxH, scale, borderStyle) {
    const hasTopOrnament = borderStyle === 'ribbon' || borderStyle === 'hearts';
    const padTop = Math.floor(boxH * (hasTopOrnament ? 0.125 : 0.095));
    const padBottom = Math.floor(boxH * 0.095);
    const maxH = boxH - padTop - padBottom;
    const minSize = Math.max(10, Math.floor(14 * scale));
    let layout = null;

    for (let fontSize = Math.floor(54 * scale); fontSize >= minSize; fontSize--) {
        const padX = Math.max(Math.floor(boxW * 0.072), Math.ceil(54 * scale));
        const maxWidth = boxW - padX * 2;

        let recFontSize = 0;
        let titleLines = [];
        let titleLineHeight = 0;
        let dividerSpace = 0;
        let recBlockH = 0;
        let widestTitle = 0;

        if (recipientLine) {
            // Tăng kích cỡ dòng Tiêu đề lớn vượt trội (~1.3x câu chúc, tối đa 68px trên canvas 1024)
            recFontSize = Math.min(Math.floor(68 * scale), Math.floor(fontSize * 1.32));
            const minSingleLineTitle = Math.max(Math.floor(18 * scale), Math.floor(fontSize * 1.12));
            ctx.font = recipientFont(recFontSize);

            // Nếu tiêu đề hơi dài, giảm nhẹ xuống tối thiểu 1.12x fontSize để ưu tiên nằm trên 1 dòng to rõ
            while (recFontSize > minSingleLineTitle && inkWidth(ctx, recipientLine) > maxWidth) {
                recFontSize--;
                ctx.font = recipientFont(recFontSize);
            }

            // Nếu tiêu đề rất dài vẫn vượt maxWidth, giữ cỡ chữ lớn (1.16x fontSize) và tự động ngắt thành 2 dòng cân đối
            if (inkWidth(ctx, recipientLine) > maxWidth) {
                recFontSize = Math.min(Math.floor(62 * scale), Math.floor(fontSize * 1.16));
                ctx.font = recipientFont(recFontSize);
                titleLines = wrapLines(ctx, recipientLine, maxWidth);
            } else {
                titleLines = [recipientLine];
            }

            titleLineHeight = Math.floor(recFontSize * TITLE_LINE_HEIGHT);
            dividerSpace = Math.floor(fontSize * 0.62);
            recBlockH = titleLines.length * titleLineHeight + dividerSpace;
            widestTitle = Math.max(...titleLines.map(l => inkWidth(ctx, l)));
        }

        ctx.font = quoteFont(fontSize);
        const lines = wrapLines(ctx, text, maxWidth);
        const lineHeight = Math.floor(fontSize * QUOTE_LINE_HEIGHT);
        const widest = Math.max(...lines.map(l => inkWidth(ctx, l)));
        const totalTextH = recBlockH + lines.length * lineHeight;

        layout = {
            fontSize,
            lines,
            lineHeight,
            recipientLine,
            titleLines,
            titleLineHeight,
            dividerSpace,
            recFontSize,
            recBlockH,
            padX,
            padTop,
            padBottom,
            maxWidth,
            maxH,
            totalTextH
        };

        if (totalTextH <= maxH && widest <= maxWidth && widestTitle <= maxWidth) break;
    }
    return layout;
}

function drawQuoteContent(ctx, boxX, boxY, boxW, boxH, layout, theme, scale) {
    const centerX = boxX + boxW / 2;
    const usableCenterY = boxY + layout.padTop + (boxH - layout.padTop - layout.padBottom) / 2;
    const startBlockY = usableCenterY - layout.totalTextH / 2;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let quoteStartY = startBlockY + layout.lineHeight / 2;

    if (layout.recipientLine && layout.titleLines && layout.titleLines.length > 0 && layout.recFontSize > 0) {
        ctx.save();
        ctx.font = recipientFont(layout.recFontSize);
        ctx.fillStyle = theme.recipientColor;
        ctx.shadowColor = theme.shadowRgba;
        ctx.shadowBlur = Math.floor(layout.recFontSize * 0.22);
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = Math.floor(layout.recFontSize * 0.05);

        const firstTitleY = startBlockY + layout.titleLineHeight / 2;
        layout.titleLines.forEach((tLine, idx) => {
            ctx.fillText(tLine, centerX, firstTitleY + idx * layout.titleLineHeight, layout.maxWidth);
        });
        ctx.restore();

        // Đường kẻ trang trí kim cương mảnh ngăn cách rõ ràng giữa Tiêu đề và Lời chúc
        const titleBottomY = startBlockY + layout.titleLines.length * layout.titleLineHeight;
        const divY = titleBottomY + layout.dividerSpace * 0.48;
        const divW = Math.min(layout.maxWidth * 0.42, 240 * scale);
        const divGrad = ctx.createLinearGradient(centerX - divW / 2, divY, centerX + divW / 2, divY);
        divGrad.addColorStop(0, 'rgba(0,0,0,0)');
        divGrad.addColorStop(0.5, theme.borderPrimary);
        divGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.strokeStyle = divGrad;
        ctx.lineWidth = Math.max(1, 1.6 * scale);
        ctx.beginPath();
        ctx.moveTo(centerX - divW / 2, divY);
        ctx.lineTo(centerX + divW / 2, divY);
        ctx.stroke();

        // Điểm nhấn thoi ánh kim ở tâm đường ngăn cách
        ctx.save();
        ctx.fillStyle = theme.goldAccent;
        drawFourPointStarPath(ctx, centerX, divY, 5.5 * scale);
        ctx.fill();
        ctx.restore();

        quoteStartY = startBlockY + layout.recBlockH + layout.lineHeight / 2;
    }

    const textBlockH = layout.lines.length * layout.lineHeight;
    const textGrad = ctx.createLinearGradient(0, quoteStartY - layout.lineHeight / 2, 0, quoteStartY + textBlockH);
    textGrad.addColorStop(0, theme.textTop);
    textGrad.addColorStop(0.5, theme.textMid);
    textGrad.addColorStop(1, theme.textBottom);

    ctx.shadowColor = theme.shadowRgba;
    ctx.shadowBlur = Math.floor(layout.fontSize * 0.3);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = Math.floor(layout.fontSize * 0.06);

    ctx.font = quoteFont(layout.fontSize);
    ctx.fillStyle = textGrad;

    layout.lines.forEach((line, i) => {
        ctx.fillText(line, centerX, quoteStartY + i * layout.lineHeight, layout.maxWidth);
    });

    ctx.restore();
}

// ====== SCROLL HINT LOGIC ======
function setupScrollHint(scrollEl, wrapEl) {
    if (!scrollEl || !wrapEl) return;

    scrollEl.addEventListener('scroll', () => {
        const atEnd = scrollEl.scrollLeft + scrollEl.clientWidth >= scrollEl.scrollWidth - 10;
        wrapEl.classList.toggle('scrolled-end', atEnd);
    }, { passive: true });

    setTimeout(() => {
        const maxPeek = Math.min(70, scrollEl.scrollWidth - scrollEl.clientWidth);
        if (maxPeek <= 0) {
            wrapEl.classList.add('scrolled-end');
            return;
        }
        scrollEl.scrollTo({ left: maxPeek, behavior: 'smooth' });
        setTimeout(() => scrollEl.scrollTo({ left: 0, behavior: 'smooth' }), 500);
    }, 400);
}

function initScrollHints() {
    setupScrollHint(
        document.getElementById('frame-carousel-scroll'),
        document.getElementById('frame-hint-wrap')
    );
    setupScrollHint(
        document.getElementById('filter-carousel-scroll'),
        document.getElementById('filter-hint-wrap')
    );
}
