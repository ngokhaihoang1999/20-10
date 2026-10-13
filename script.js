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

// ====== CẤU HÌNH 20 CONCEPT KHUNG NGHỆ THUẬT CAO CẤP (SANG - XỊN - KHÔNG SẾN) ======
const FRAME_ASPECT_RATIO = 1024 / 1526;
const CONCEPT_DEFS = [
    { concept: 'arch', label: '01. Vòm Lụa', fullLabel: '✨ 01. Vòm Lụa' },
    { concept: 'oval', label: '02. Gương Ngọc', fullLabel: '🪞 02. Gương Hoàng Gia' },
    { concept: 'cathedral', label: '03. Hoa Trà', fullLabel: '🌷 03. Vòm Hoa Trà' },
    { concept: 'scallop', label: '04. Viền Sóng', fullLabel: '☁️ 04. Viền Sóng Mây' },
    { concept: 'hourglass', label: '05. Nguyệt Quế', fullLabel: '🌿 05. Vòng Nguyệt Quế' },
    { concept: 'magazine', label: '06. Tạp Chí', fullLabel: '📖 06. Tạp Chí Vogue' },
    { concept: 'elle_minimal', label: '07. Muse Paris', fullLabel: '🕊️ 07. Muse Paris' },
    { concept: 'runway', label: '08. Hào Quang', fullLabel: '👑 08. Ánh Hào Quang' },
    { concept: 'atelier', label: '09. Couture', fullLabel: '🏷️ 09. Nhãn Couture' },
    { concept: 'polaroid', label: '10. Polaroid', fullLabel: '📸 10. Polaroid Hàn' },
    { concept: 'film_kodak', label: '11. Anh Đào', fullLabel: '🌸 11. Cành Anh Đào' },
    { concept: 'postcard', label: '12. Bưu Thiếp', fullLabel: '💌 12. Bưu Thiếp Paris' },
    { concept: 'scrapbook', label: '13. Cúc Họa Mi', fullLabel: '🌼 13. Cúc Họa Mi' },
    { concept: 'aura', label: '14. Kính Aura', fullLabel: '💎 14. Kính Mờ Aura' },
    { concept: 'aura_arch', label: '15. Vòm Aura', fullLabel: '🌈 15. Vòm Cực Quang' },
    { concept: 'prism', label: '16. Pha Lê', fullLabel: '💠 16. Pha Lê Ánh Sao' },
    { concept: 'floating_shadow', label: '17. Nắng Thu', fullLabel: '☀️ 17. Bóng Nắng Thu' },
    { concept: 'dior', label: '18. Hồng Pháp', fullLabel: '🌹 18. Vườn Hồng Pháp' },
    { concept: 'pearl_lace', label: '19. Ngọc Trai', fullLabel: '🦪 19. Chuỗi Ngọc Trai' },
    { concept: 'celestial', label: '20. Ánh Trăng', fullLabel: '🌙 20. Vũ Khúc Ánh Trăng' }
];

const framesConfig = CONCEPT_DEFS.map((c, idx) => ({
    id: idx,
    concept: c.concept,
    path: '',
    thumbPath: '',
    label: c.label,
    fullLabel: c.fullLabel,
    isConcept: true
}));

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

// ====== BỘ VẼ 20 CONCEPT KHUNG HÌNH NGHỆ THUẬT CAO CẤP (1024 x 1526) ======
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

function traceOvalWindowPath(ctx, cx, cy, rx, ry) {
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.closePath();
}

function traceLotusArchWindowPath(ctx, x, y, w, h, br) {
    const midX = x + w / 2;
    const shoulderY = y + w * 0.44;
    ctx.moveTo(x, shoulderY);
    ctx.bezierCurveTo(x, y + w * 0.14, midX - w * 0.18, y + w * 0.05, midX, y);
    ctx.bezierCurveTo(midX + w * 0.18, y + w * 0.05, x + w, y + w * 0.14, x + w, shoulderY);
    ctx.lineTo(x + w, y + h - br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + br, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - br);
    ctx.closePath();
}

function traceScallopWindowPath(ctx, x, y, w, h, nx, ny, amp) {
    const dx = w / nx;
    const dy = h / ny;
    ctx.moveTo(x, y);
    for (let i = 0; i < nx; i++) {
        const sx = x + i * dx;
        ctx.quadraticCurveTo(sx + dx * 0.5, y - amp, sx + dx, y);
    }
    for (let i = 0; i < ny; i++) {
        const sy = y + i * dy;
        ctx.quadraticCurveTo(x + w + amp, sy + dy * 0.5, x + w, sy + dy);
    }
    for (let i = nx; i > 0; i--) {
        const sx = x + i * dx;
        ctx.quadraticCurveTo(sx - dx * 0.5, y + h + amp, sx - dx, y + h);
    }
    for (let i = ny; i > 0; i--) {
        const sy = y + i * dy;
        ctx.quadraticCurveTo(x - amp, sy - dy * 0.5, x, sy - dy);
    }
    ctx.closePath();
}

function traceConcaveWindowPath(ctx, x, y, w, h, cr) {
    ctx.moveTo(x + cr, y);
    ctx.lineTo(x + w - cr, y);
    ctx.quadraticCurveTo(x + w - cr, y + cr, x + w, y + cr);
    ctx.lineTo(x + w, y + h - cr);
    ctx.quadraticCurveTo(x + w - cr, y + h - cr, x + w - cr, y + h);
    ctx.lineTo(x + cr, y + h);
    ctx.quadraticCurveTo(x + cr, y + h - cr, x, y + h - cr);
    ctx.lineTo(x, y + cr);
    ctx.quadraticCurveTo(x + cr, y + cr, x + cr, y);
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

// Hàm chuẩn hóa đường bao cửa sổ ảnh của từng Concept (dùng chung cho cả bước cắt ảnh và bước phủ khung)
function traceConceptPhotoWindow(ctx, concept, targetW, originH, scale) {
    if (concept === 'arch' || concept === 'aura_arch') {
        const winX = Math.floor(68 * scale);
        const winY = Math.floor(68 * scale);
        traceArchWindowPath(ctx, winX, winY, targetW - winX * 2, originH - Math.floor(92 * scale), 34 * scale);
    } else if (concept === 'oval') {
        traceOvalWindowPath(ctx, targetW / 2, originH * 0.495, 424 * scale, 668 * scale);
    } else if (concept === 'cathedral') {
        const winX = Math.floor(70 * scale);
        const winY = Math.floor(60 * scale);
        traceLotusArchWindowPath(ctx, winX, winY, targetW - winX * 2, originH - Math.floor(86 * scale), 34 * scale);
    } else if (concept === 'scallop') {
        const winX = Math.floor(78 * scale);
        const winY = Math.floor(78 * scale);
        traceScallopWindowPath(ctx, winX, winY, targetW - winX * 2, originH - Math.floor(104 * scale), 8, 12, 16 * scale);
    } else if (concept === 'hourglass') {
        const winX = Math.floor(78 * scale);
        const winY = Math.floor(76 * scale);
        traceArchWindowPath(ctx, winX, winY, targetW - winX * 2, originH - Math.floor(104 * scale), 38 * scale);
    } else if (concept === 'elle_minimal') {
        const winX = Math.floor(90 * scale);
        const winY = Math.floor(166 * scale);
        traceRoundedWindowPath(ctx, winX, winY, targetW - winX * 2, originH - Math.floor(236 * scale), 10 * scale);
    } else if (concept === 'atelier') {
        const winX = Math.floor(72 * scale);
        const winY = Math.floor(88 * scale);
        traceRoundedWindowPath(ctx, winX, winY, targetW - winX * 2, originH - Math.floor(114 * scale), 6 * scale);
    } else if (concept === 'polaroid') {
        const winX = Math.floor(88 * scale);
        const winY = Math.floor(98 * scale);
        traceRoundedWindowPath(ctx, winX, winY, targetW - winX * 2, originH - Math.floor(245 * scale), 12 * scale);
    } else if (concept === 'film_kodak') {
        const winX = Math.floor(72 * scale);
        const winY = Math.floor(72 * scale);
        traceRoundedWindowPath(ctx, winX, winY, targetW - winX * 2, originH - Math.floor(100 * scale), 28 * scale);
    } else if (concept === 'postcard') {
        const winX = Math.floor(78 * scale);
        const winY = Math.floor(82 * scale);
        traceRoundedWindowPath(ctx, winX, winY, targetW - winX * 2, originH - Math.floor(110 * scale), 16 * scale);
    } else if (concept === 'scrapbook') {
        const winX = Math.floor(76 * scale);
        const winY = Math.floor(84 * scale);
        traceRoundedWindowPath(ctx, winX, winY, targetW - winX * 2, originH - Math.floor(118 * scale), 22 * scale);
    } else if (concept === 'aura') {
        const winX = Math.floor(66 * scale);
        const winY = Math.floor(66 * scale);
        traceRoundedWindowPath(ctx, winX, winY, targetW - winX * 2, originH - Math.floor(96 * scale), 32 * scale);
    } else if (concept === 'prism') {
        const winX = Math.floor(66 * scale);
        const winY = Math.floor(66 * scale);
        traceChamferWindowPath(ctx, winX, winY, targetW - winX * 2, originH - Math.floor(96 * scale), 56 * scale);
    } else if (concept === 'floating_shadow') {
        const winX = Math.floor(72 * scale);
        const winY = Math.floor(72 * scale);
        traceRoundedWindowPath(ctx, winX, winY, targetW - winX * 2, originH - Math.floor(98 * scale), 24 * scale);
    } else if (concept === 'dior') {
        const winX = Math.floor(66 * scale);
        const winY = Math.floor(66 * scale);
        traceChamferWindowPath(ctx, winX, winY, targetW - winX * 2, originH - Math.floor(94 * scale), 46 * scale);
    } else if (concept === 'pearl_lace') {
        const winX = Math.floor(74 * scale);
        const winY = Math.floor(82 * scale);
        traceRoundedWindowPath(ctx, winX, winY, targetW - winX * 2, originH - Math.floor(108 * scale), 36 * scale);
    } else if (concept === 'celestial') {
        const winX = Math.floor(70 * scale);
        const winY = Math.floor(70 * scale);
        traceArchWindowPath(ctx, winX, winY, targetW - winX * 2, originH - Math.floor(96 * scale), 32 * scale);
    } else {
        // magazine, runway: ảnh tràn viền
        ctx.rect(0, 0, targetW, originH);
    }
}

// ====== BỘ HÀM VẼ HOA LÁ NGHỆ THUẬT (WATERCOLOR + GOLD LINE-ART BOTANICALS) ======
function drawWatercolorBotanicalLeaf(ctx, x, y, len, wid, angle, fillColor, veinColor, alpha = 0.65) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(len * 0.3, -wid, len * 0.75, -wid * 0.85, len, 0);
    ctx.bezierCurveTo(len * 0.75, wid * 0.85, len * 0.3, wid, 0, 0);
    ctx.closePath();

    ctx.fillStyle = fillColor;
    ctx.globalAlpha = alpha;
    ctx.fill();

    ctx.globalAlpha = Math.min(1, alpha + 0.25);
    ctx.strokeStyle = veinColor;
    ctx.lineWidth = Math.max(0.8, len * 0.032);
    ctx.stroke();

    // Sống lá ánh kim ở giữa
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.5, -wid * 0.08, len * 0.86, 0);
    ctx.stroke();
    ctx.restore();
}

// Đóa Hoa Trà / Mẫu Đơn 3D nhiều lớp cánh màu nước viền vàng kim
function drawLayeredCamellia(ctx, cx, cy, radius, theme) {
    ctx.save();
    ctx.translate(cx, cy);

    // 4 chiếc lá xanh ngọc viền vàng lấp ló phía sau đóa hoa
    const leafAngles = [-0.65, 0.55, 2.35, -2.45];
    leafAngles.forEach((la, idx) => {
        const lLen = radius * (idx % 2 === 0 ? 1.45 : 1.25);
        drawWatercolorBotanicalLeaf(ctx, 0, 0, lLen, lLen * 0.42, la, theme.leafColor, theme.goldAccent, 0.72);
    });

    // Hào quang phấn hồng dịu nhẹ dưới cánh hoa
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.15);
    glow.addColorStop(0, theme.flowerMain);
    glow.addColorStop(0.6, theme.flowerSoft);
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.globalAlpha = 0.32;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2);
    ctx.fill();

    // 3 Tầng cánh hoa Trà xếp xoáy tròn
    const layers = [
        { count: 8, r: radius, w: radius * 0.56, fill: theme.flowerSoft, alpha: 0.88, rot: 0 },
        { count: 7, r: radius * 0.74, w: radius * 0.46, fill: theme.flowerMain, alpha: 0.75, rot: 0.42 },
        { count: 5, r: radius * 0.46, w: radius * 0.34, fill: '#fff7fa', alpha: 0.94, rot: 0.85 }
    ];

    layers.forEach(layer => {
        for (let i = 0; i < layer.count; i++) {
            ctx.save();
            ctx.rotate(layer.rot + (i * Math.PI * 2) / layer.count);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(-layer.w, -layer.r * 0.35, -layer.w * 0.85, -layer.r * 0.98, 0, -layer.r);
            ctx.bezierCurveTo(layer.w * 0.85, -layer.r * 0.98, layer.w, -layer.r * 0.35, 0, 0);
            ctx.closePath();

            ctx.fillStyle = layer.fill;
            ctx.globalAlpha = layer.alpha;
            ctx.fill();

            ctx.globalAlpha = 0.88;
            ctx.strokeStyle = theme.goldAccent;
            ctx.lineWidth = Math.max(0.9, radius * 0.032);
            ctx.stroke();
            ctx.restore();
        }
    });

    // Nhụy hoa ánh kim hoàng gia
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.goldAccent;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.14, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI * 2) / 8;
        const sr = radius * 0.23;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * sr, Math.sin(a) * sr, radius * 0.045, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// Bông Hoa Anh Đào 5 cánh khuyết tim chi tiết cao cấp
function drawDetailedSakuraBloom(ctx, cx, cy, radius, rot, theme) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);

    for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI * 2) / 5);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-radius * 0.56, -radius * 0.34, -radius * 0.52, -radius * 0.96, -radius * 0.13, -radius);
        ctx.lineTo(0, -radius * 0.81);
        ctx.lineTo(radius * 0.13, -radius);
        ctx.bezierCurveTo(radius * 0.52, -radius * 0.96, radius * 0.56, -radius * 0.34, 0, 0);
        ctx.closePath();

        const pGrad = ctx.createLinearGradient(0, 0, 0, -radius);
        pGrad.addColorStop(0, theme.flowerMain);
        pGrad.addColorStop(0.55, theme.flowerSoft);
        pGrad.addColorStop(1, '#ffffff');
        ctx.fillStyle = pGrad;
        ctx.globalAlpha = 0.92;
        ctx.fill();

        ctx.strokeStyle = theme.goldAccent;
        ctx.lineWidth = Math.max(0.8, radius * 0.03);
        ctx.stroke();
        ctx.restore();
    }

    // Nhụy tơ mảnh mai ở tâm hoa anh đào
    ctx.strokeStyle = theme.goldAccent;
    ctx.fillStyle = theme.goldAccent;
    ctx.lineWidth = Math.max(0.8, radius * 0.03);
    for (let i = 0; i < 7; i++) {
        const a = (i * Math.PI * 2) / 7 + 0.2;
        const rEnd = radius * 0.36;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * rEnd, Math.sin(a) * rEnd);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(Math.cos(a) * rEnd, Math.sin(a) * rEnd, radius * 0.055, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// Cành Hoa Anh Đào vươn từ góc khung
function drawSakuraBranchCorner(ctx, cx, cy, scale, flipX, flipY, theme) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(flipX, flipY);

    // Thân cành đào uyển chuyển
    ctx.strokeStyle = theme.goldAccent;
    ctx.lineCap = 'round';
    ctx.lineWidth = 4.2 * scale;
    ctx.beginPath();
    ctx.moveTo(0, 20 * scale);
    ctx.bezierCurveTo(65 * scale, 28 * scale, 135 * scale, 65 * scale, 215 * scale, 125 * scale);
    ctx.stroke();

    ctx.lineWidth = 2.4 * scale;
    ctx.beginPath();
    ctx.moveTo(75 * scale, 36 * scale);
    ctx.quadraticCurveTo(130 * scale, 12 * scale, 185 * scale, 28 * scale);
    ctx.moveTo(95 * scale, 48 * scale);
    ctx.quadraticCurveTo(65 * scale, 115 * scale, 88 * scale, 175 * scale);
    ctx.stroke();

    // Lá non xanh biếc
    drawWatercolorBotanicalLeaf(ctx, 115 * scale, 52 * scale, 36 * scale, 15 * scale, 0.2, theme.leafColor, theme.goldAccent, 0.75);
    drawWatercolorBotanicalLeaf(ctx, 64 * scale, 78 * scale, 34 * scale, 14 * scale, 1.35, theme.leafColor, theme.goldAccent, 0.75);
    drawWatercolorBotanicalLeaf(ctx, 168 * scale, 92 * scale, 32 * scale, 13 * scale, 0.55, theme.leafColor, theme.goldAccent, 0.72);

    // Các đóa hoa anh đào lớn nhỏ nở dọc theo cành
    drawDetailedSakuraBloom(ctx, 68 * scale, 42 * scale, 42 * scale, 0.15, theme);
    drawDetailedSakuraBloom(ctx, 145 * scale, 74 * scale, 32 * scale, -0.35, theme);
    drawDetailedSakuraBloom(ctx, 162 * scale, 26 * scale, 24 * scale, 0.4, theme);
    drawDetailedSakuraBloom(ctx, 82 * scale, 136 * scale, 26 * scale, 0.6, theme);
    drawDetailedSakuraBloom(ctx, 208 * scale, 120 * scale, 21 * scale, -0.2, theme);

    // Cánh hoa anh đào rơi lất phất trong gió
    const petals = [
        { x: 245, y: 72, r: 12, a: 0.6 },
        { x: 195, y: 165, r: 14, a: -0.4 },
        { x: 128, y: 195, r: 10, a: 1.1 }
    ];
    petals.forEach(p => {
        ctx.save();
        ctx.translate(p.x * scale, p.y * scale);
        ctx.rotate(p.a);
        ctx.fillStyle = theme.flowerSoft;
        ctx.strokeStyle = theme.goldAccent;
        ctx.lineWidth = 1 * scale;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r * scale, p.r * 0.55 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    });

    ctx.restore();
}

// Lá Ngân Hạnh (Ginkgo Biloba) mùa thu mạ vàng
function drawGinkgoLeaf(ctx, x, y, size, angle, theme) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Cuống lá mảnh
    ctx.strokeStyle = theme.goldAccent;
    ctx.lineWidth = Math.max(1.2, size * 0.045);
    ctx.beginPath();
    ctx.moveTo(0, size * 0.35);
    ctx.quadraticCurveTo(-size * 0.05, size * 0.1, 0, 0);
    ctx.stroke();

    // Tán lá hình quạt xẻ đôi ở giữa
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-size * 0.65, -size * 0.25, -size * 0.85, -size * 0.82, -size * 0.22, -size * 0.95);
    ctx.quadraticCurveTo(-size * 0.06, -size * 0.92, 0, -size * 0.68);
    ctx.quadraticCurveTo(size * 0.06, -size * 0.92, size * 0.22, -size * 0.95);
    ctx.bezierCurveTo(size * 0.85, -size * 0.82, size * 0.65, -size * 0.25, 0, 0);
    ctx.closePath();

    const gGrad = ctx.createLinearGradient(0, 0, 0, -size);
    gGrad.addColorStop(0, theme.goldAccent);
    gGrad.addColorStop(0.6, theme.flowerSoft);
    gGrad.addColorStop(1, '#fffdf5');
    ctx.fillStyle = gGrad;
    ctx.globalAlpha = 0.85;
    ctx.fill();

    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = theme.goldAccent;
    ctx.lineWidth = Math.max(1, size * 0.032);
    ctx.stroke();

    // Các đường gân quạt mảnh
    ctx.globalAlpha = 0.45;
    for (let i = -3; i <= 3; i++) {
        if (i === 0) continue;
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.05);
        ctx.lineTo(i * size * 0.14, -size * 0.78);
        ctx.stroke();
    }
    ctx.restore();
}

// Nhành Hoa Oải Hương (Lavender Spike)
function drawLavenderSpike(ctx, x, y, len, angle, theme) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.strokeStyle = theme.leafColor;
    ctx.lineWidth = Math.max(1.2, len * 0.018);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.04, -len * 0.5, 0, -len);
    ctx.stroke();

    const tiers = 6;
    for (let i = 1; i <= tiers; i++) {
        const ty = -len * (0.28 + (i / tiers) * 0.68);
        const budR = len * (0.068 - i * 0.005);
        [-1, 1].forEach(side => {
            ctx.save();
            ctx.translate(side * budR * 0.85, ty);
            ctx.rotate(side * 0.45);
            ctx.fillStyle = i % 2 === 0 ? theme.flowerMain : theme.flowerSoft;
            ctx.strokeStyle = theme.goldAccent;
            ctx.lineWidth = Math.max(0.6, len * 0.008);
            ctx.beginPath();
            ctx.ellipse(0, 0, budR * 0.62, budR * 1.25, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        });
    }
    ctx.restore();
}

// Đóa Cúc Họa Mi 12 cánh trắng kem nhụy vàng
function drawRichChamomileDaisy(ctx, cx, cy, radius, theme) {
    ctx.save();
    ctx.translate(cx, cy);
    const petals = 12;
    for (let i = 0; i < petals; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI * 2) / petals);
        ctx.beginPath();
        ctx.ellipse(0, -radius * 0.64, radius * 0.21, radius * 0.46, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#fffdfa';
        ctx.fill();
        ctx.strokeStyle = theme.goldAccent;
        ctx.lineWidth = Math.max(0.8, radius * 0.032);
        ctx.stroke();
        ctx.restore();
    }

    const cGrad = ctx.createRadialGradient(-radius * 0.08, -radius * 0.08, 0, 0, 0, radius * 0.32);
    cGrad.addColorStop(0, '#ffe885');
    cGrad.addColorStop(0.7, theme.goldAccent);
    cGrad.addColorStop(1, theme.borderPrimary);
    ctx.fillStyle = cGrad;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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
        { t: 22, dy: -4, a: -0.65, len: 24 },
        { t: 36, dy: -6, a: 0.55, len: 22 },
        { t: 54, dy: -8, a: -0.58, len: 22 },
        { t: 70, dy: -8, a: 0.48, len: 19 },
        { t: 88, dy: -6, a: -0.35, len: 16 }
    ];
    leafPairs.forEach(lp => {
        drawWatercolorBotanicalLeaf(
            ctx,
            lp.t * scale,
            lp.dy * scale,
            lp.len * scale,
            lp.len * 0.34 * scale,
            lp.a,
            theme.leafColor,
            theme.goldAccent,
            0.62
        );
    });
    ctx.restore();
}

function drawFineLineRoseCorner(ctx, cx, cy, scale, flipX, flipY, theme) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(flipX, flipY);

    drawFineBotanicalSprig(ctx, 12 * scale, 10 * scale, scale * 1.15, 0.16, theme);
    drawFineBotanicalSprig(ctx, 10 * scale, 12 * scale, scale * 1.15, 1.4, theme);

    // Đóa hồng Anh Quốc (Watercolor + Gold Line-Art)
    ctx.translate(22 * scale, 22 * scale);

    // Các lớp cánh màu nước mềm phía dưới
    const petalWash = [
        { r: 30, count: 6, col: theme.flowerSoft, alpha: 0.65, off: 0.2 },
        { r: 21, count: 5, col: theme.flowerMain, alpha: 0.48, off: 0.8 },
        { r: 12, count: 4, col: '#ffffff', alpha: 0.72, off: 0.4 }
    ];
    petalWash.forEach(pw => {
        for (let i = 0; i < pw.count; i++) {
            const ang = pw.off + (i * Math.PI * 2) / pw.count;
            ctx.save();
            ctx.rotate(ang);
            ctx.fillStyle = pw.col;
            ctx.globalAlpha = pw.alpha;
            ctx.beginPath();
            ctx.arc(0, -pw.r * 0.35 * scale, pw.r * 0.55 * scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    });

    // Đường nét mảnh nhũ vàng xoáy tâm hoa hồng
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = theme.goldAccent;
    ctx.lineWidth = 1.9 * scale;
    ctx.lineCap = 'round';

    const rings = [
        { r: 7, petals: 3, offset: 0.2 },
        { r: 14, petals: 5, offset: 0.8 },
        { r: 22, petals: 6, offset: 0.4 },
        { r: 30, petals: 7, offset: 1.1 }
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

    ctx.fillStyle = theme.goldAccent;
    ctx.beginPath();
    ctx.arc(0, 0, 3.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawLustrousPearl(ctx, x, y, r, theme) {
    ctx.save();
    ctx.fillStyle = '#fff9f5';
    ctx.strokeStyle = theme.borderSecondary;
    ctx.lineWidth = Math.max(0.6, r * 0.16);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawStarburstFlare(ctx, cx, cy, outerR, theme, colorOverride) {
    ctx.save();
    ctx.translate(cx, cy);
    const col = colorOverride || theme.goldAccent;
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, outerR);
    glow.addColorStop(0, '#ffffff');
    glow.addColorStop(0.35, col);
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, outerR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    drawFourPointStarPath(ctx, 0, 0, outerR * 0.95);
    ctx.fill();
    ctx.rotate(Math.PI / 4);
    drawFourPointStarPath(ctx, 0, 0, outerR * 0.5);
    ctx.fill();
    ctx.restore();
}

function drawCrescentMoon(ctx, cx, cy, r, angle, color) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0.25 * Math.PI, 1.75 * Math.PI, false);
    ctx.arc(r * 0.38, 0, r * 0.82, 1.68 * Math.PI, 0.32 * Math.PI, true);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawWashiTape(ctx, cx, cy, w, h, angle, theme) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const hw = w / 2;
    const hh = h / 2;
    ctx.beginPath();
    ctx.moveTo(-hw, -hh);
    ctx.lineTo(hw, -hh);
    const teeth = 6;
    for (let i = 0; i <= teeth; i++) {
        const ty = -hh + (i / teeth) * h;
        const tx = hw + (i % 2 === 0 ? 0 : -w * 0.03);
        ctx.lineTo(tx, ty);
    }
    ctx.lineTo(-hw, hh);
    for (let i = teeth; i >= 0; i--) {
        const ty = -hh + (i / teeth) * h;
        const tx = -hw + (i % 2 === 0 ? 0 : w * 0.03);
        ctx.lineTo(tx, ty);
    }
    ctx.closePath();

    ctx.fillStyle = theme.flowerSoft;
    ctx.globalAlpha = 0.65;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.78)';
    ctx.lineWidth = Math.max(1, h * 0.035);
    ctx.stroke();

    ctx.clip();
    ctx.strokeStyle = theme.goldAccent;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = Math.max(1, h * 0.045);
    const step = Math.max(6, w * 0.1);
    for (let sx = -w; sx < w; sx += step) {
        ctx.beginPath();
        ctx.moveTo(sx, -hh - 10);
        ctx.lineTo(sx + h * 0.6, hh + 10);
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

    ctx.lineWidth = Math.max(1, radius * 0.05);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = Math.max(0.8, radius * 0.028);
    ctx.setLineDash([radius * 0.11, radius * 0.09]);
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

// Hàm tô nền lụa bên ngoài cửa sổ ảnh bằng quy tắc evenodd (giữ trong suốt 100% vùng ảnh)
function fillMatteOutsideWindow(ctx, concept, targetW, originH, scale, colorTop, colorBottom) {
    ctx.beginPath();
    ctx.rect(0, 0, targetW, originH);
    traceConceptPhotoWindow(ctx, concept, targetW, originH, scale);
    const grad = ctx.createLinearGradient(0, 0, 0, originH);
    grad.addColorStop(0, colorTop);
    grad.addColorStop(1, colorBottom);
    ctx.fillStyle = grad;
    ctx.fill('evenodd');
}

function renderConceptOverlayToCtx(ctx, concept, targetW, originH, theme, isStep2Overlay) {
    const scale = targetW / 1024;
    ctx.save();

    if (concept === 'arch') {
        // 01. VÒM LỤA (Roman Arch Gallery)
        const winX = Math.floor(68 * scale);
        const winY = Math.floor(68 * scale);
        const winW = targetW - winX * 2;
        const winH = originH - Math.floor(92 * scale);
        const bottomR = Math.floor(34 * scale);

        fillMatteOutsideWindow(ctx, 'arch', targetW, originH, scale, theme.canvasBgMid, theme.canvasBgEnd);

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

    } else if (concept === 'oval') {
        // 02. GƯƠNG HOÀNG GIA (Royal Cameo Oval Mirror)
        const cx = targetW / 2;
        const cy = originH * 0.495;
        const rx = 424 * scale;
        const ry = 668 * scale;

        fillMatteOutsideWindow(ctx, 'oval', targetW, originH, scale, '#fffdf9', theme.canvasBgEnd);

        const m = 34 * scale;
        ctx.strokeStyle = theme.borderSecondary;
        ctx.lineWidth = 1.5 * scale;
        ctx.strokeRect(m, m, targetW - m * 2, originH - m * 2);

        drawFineLineRoseCorner(ctx, m, m, scale * 0.92, 1, 1, theme);
        drawFineLineRoseCorner(ctx, targetW - m, m, scale * 0.92, -1, 1, theme);
        drawFineLineRoseCorner(ctx, m, originH - m, scale * 0.92, 1, -1, theme);
        drawFineLineRoseCorner(ctx, targetW - m, originH - m, scale * 0.92, -1, -1, theme);

        ctx.beginPath();
        traceOvalWindowPath(ctx, cx, cy, rx, ry);
        ctx.strokeStyle = theme.goldAccent;
        ctx.lineWidth = 4 * scale;
        ctx.stroke();

        ctx.beginPath();
        traceOvalWindowPath(ctx, cx, cy, rx + 14 * scale, ry + 14 * scale);
        ctx.strokeStyle = theme.borderPrimary;
        ctx.lineWidth = 1.6 * scale;
        ctx.stroke();

        const pearls = 44;
        for (let i = 0; i < pearls; i++) {
            const a = (i / pearls) * Math.PI * 2;
            const px = cx + Math.cos(a) * (rx + 7 * scale);
            const py = cy + Math.sin(a) * (ry + 7 * scale);
            drawLustrousPearl(ctx, px, py, 4.5 * scale, theme);
        }

        drawSilkRibbonBow(ctx, cx, cy - ry - 12 * scale, 38 * scale, theme);

    } else if (concept === 'cathedral') {
        // 03. VÒM HOA TRÀ PHÁP (Chanel Camellia Blooms & Lotus Arch - MẪU HOA LÁ 1)
        const winX = Math.floor(70 * scale);
        const winY = Math.floor(60 * scale);
        const winW = targetW - winX * 2;
        const winH = originH - Math.floor(86 * scale);
        const br = 34 * scale;

        fillMatteOutsideWindow(ctx, 'cathedral', targetW, originH, scale, theme.canvasBgMid, theme.canvasBgEnd);

        ctx.beginPath();
        traceLotusArchWindowPath(ctx, winX, winY, winW, winH, br);
        const lotusGrad = ctx.createLinearGradient(winX, winY, winX + winW, winY + winH);
        lotusGrad.addColorStop(0, theme.borderPrimary);
        lotusGrad.addColorStop(0.5, theme.goldAccent);
        lotusGrad.addColorStop(1, theme.borderPrimary);
        ctx.strokeStyle = lotusGrad;
        ctx.lineWidth = 3.8 * scale;
        ctx.stroke();

        const off = 12 * scale;
        ctx.beginPath();
        traceLotusArchWindowPath(ctx, winX - off, winY - off, winW + off * 2, winH + off * 2, br + 8 * scale);
        ctx.strokeStyle = theme.goldAccent;
        ctx.lineWidth = 1.5 * scale;
        ctx.stroke();

        // Đóa Hoa Trà đa tầng cánh + cành lá xanh ngọc ở 2 góc vòm trên và góc dưới
        drawFineBotanicalSprig(ctx, 74 * scale, 88 * scale, scale * 1.35, 0.25, theme);
        drawFineBotanicalSprig(ctx, targetW - 74 * scale, 88 * scale, scale * 1.35, Math.PI - 0.25, theme);

        drawLayeredCamellia(ctx, 88 * scale, 96 * scale, 52 * scale, theme);
        drawLayeredCamellia(ctx, targetW - 88 * scale, 96 * scale, 52 * scale, theme);

        // Khóm hoa trà nhỏ ở hai góc chân khung
        drawLayeredCamellia(ctx, winX + 18 * scale, winY + winH - 18 * scale, 38 * scale, theme);
        drawLayeredCamellia(ctx, winX + winW - 18 * scale, winY + winH - 18 * scale, 38 * scale, theme);

        drawStarburstFlare(ctx, targetW / 2, winY, 20 * scale, theme);

    } else if (concept === 'scallop') {
        // 04. VIỀN SÓNG MÂY (Korean Scalloped Cloud Frame)
        const winX = Math.floor(78 * scale);
        const winY = Math.floor(78 * scale);
        const winW = targetW - winX * 2;
        const winH = originH - Math.floor(104 * scale);

        fillMatteOutsideWindow(ctx, 'scallop', targetW, originH, scale, '#fffcf8', theme.canvasBgEnd);

        ctx.beginPath();
        traceScallopWindowPath(ctx, winX, winY, winW, winH, 8, 12, 16 * scale);
        ctx.strokeStyle = theme.borderPrimary;
        ctx.lineWidth = 3.4 * scale;
        ctx.stroke();

        ctx.save();
        ctx.beginPath();
        traceScallopWindowPath(ctx, winX - 10 * scale, winY - 10 * scale, winW + 20 * scale, winH + 20 * scale, 8, 12, 18 * scale);
        ctx.strokeStyle = theme.goldAccent;
        ctx.lineWidth = 1.8 * scale;
        ctx.setLineDash([6 * scale, 6 * scale]);
        ctx.stroke();
        ctx.restore();

        drawSilkRibbonBow(ctx, targetW / 2, winY - 14 * scale, 32 * scale, theme);
        ctx.fillStyle = theme.goldAccent;
        drawFourPointStarPath(ctx, 44 * scale, 44 * scale, 10 * scale);
        ctx.fill();
        drawFourPointStarPath(ctx, targetW - 44 * scale, 44 * scale, 10 * scale);
        ctx.fill();

    } else if (concept === 'hourglass') {
        // 05. VÒNG NGUYỆT QUẾ & MẪU ĐƠN (Royal Eucalyptus & Peony Wreath - MẪU HOA LÁ 2)
        const winX = Math.floor(78 * scale);
        const winY = Math.floor(76 * scale);
        const winW = targetW - winX * 2;
        const winH = originH - Math.floor(104 * scale);
        const br = 38 * scale;

        fillMatteOutsideWindow(ctx, 'hourglass', targetW, originH, scale, '#fffefb', theme.canvasBgEnd);

        ctx.beginPath();
        traceArchWindowPath(ctx, winX, winY, winW, winH, br);
        ctx.strokeStyle = theme.goldAccent;
        ctx.lineWidth = 3.6 * scale;
        ctx.stroke();

        ctx.beginPath();
        traceArchWindowPath(ctx, winX - 12 * scale, winY - 12 * scale, winW + 24 * scale, winH + 24 * scale, br + 8 * scale);
        ctx.strokeStyle = theme.borderSecondary;
        ctx.lineWidth = 1.5 * scale;
        ctx.stroke();

        // Hai nhánh lá Nguyệt Quế / Khuynh Diệp (Eucalyptus & Olive Garland) chạy dọc 2 sườn khung
        const leafSteps = 12;
        for (let i = 0; i < leafSteps; i++) {
            const t = i / (leafSteps - 1);
            const ly = winY + 260 * scale + t * (winH - 310 * scale);
            const sway = Math.sin(t * Math.PI) * 8 * scale;

            // Nhánh bên trái
            const lx = winX - 6 * scale - sway;
            drawWatercolorBotanicalLeaf(ctx, lx, ly, 42 * scale, 16 * scale, -1.95, theme.leafColor, theme.goldAccent, 0.74);
            drawWatercolorBotanicalLeaf(ctx, lx, ly, 36 * scale, 14 * scale, -1.15, theme.flowerSoft, theme.goldAccent, 0.62);
            if (i % 2 === 1) drawLustrousPearl(ctx, lx - 14 * scale, ly - 10 * scale, 5 * scale, theme);

            // Nhánh bên phải
            const rx = winX + winW + 6 * scale + sway;
            drawWatercolorBotanicalLeaf(ctx, rx, ly, 42 * scale, 16 * scale, -1.19, theme.leafColor, theme.goldAccent, 0.74);
            drawWatercolorBotanicalLeaf(ctx, rx, ly, 36 * scale, 14 * scale, -1.99, theme.flowerSoft, theme.goldAccent, 0.62);
            if (i % 2 === 1) drawLustrousPearl(ctx, rx + 14 * scale, ly - 10 * scale, 5 * scale, theme);
        }

        // Đóa Mẫu Đơn nở ở hai bên sườn dưới và chính giữa chân khung
        drawLayeredCamellia(ctx, winX - 4 * scale, winY + winH - 95 * scale, 38 * scale, theme);
        drawLayeredCamellia(ctx, winX + winW + 4 * scale, winY + winH - 95 * scale, 38 * scale, theme);

        drawFineBotanicalSprig(ctx, targetW / 2 - 15 * scale, winY + winH, scale * 1.25, -0.12, theme);
        drawFineBotanicalSprig(ctx, targetW / 2 + 15 * scale, winY + winH, scale * 1.25, Math.PI + 0.12, theme);
        drawLayeredCamellia(ctx, targetW / 2, winY + winH - 4 * scale, 46 * scale, theme);

        drawStarburstFlare(ctx, targetW / 2, winY, 18 * scale, theme);

    } else if (concept === 'magazine') {
        // 06. BÌA TẠP CHÍ THỜI TRANG (Vogue / La Beauté)
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

        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 10 * scale;

        ctx.font = `600 ${Math.floor(17 * scale)}px "Montserrat", sans-serif`;
        ctx.fillText('B T L M V N   •   S P E C I A L   E D I T I O N   2 0 . 1 0', targetW / 2, 78 * scale);

        ctx.font = `italic 700 ${Math.floor(74 * scale)}px "Cormorant Garamond", serif`;
        ctx.fillText('L A   B E A U T É', targetW / 2, 146 * scale);

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

    } else if (concept === 'elle_minimal') {
        // 07. MUSE PARIS (Kinfolk / Parisian Editorial Gallery)
        const winX = Math.floor(90 * scale);
        const winY = Math.floor(166 * scale);
        const winW = targetW - winX * 2;
        const winH = originH - Math.floor(236 * scale);

        fillMatteOutsideWindow(ctx, 'elle_minimal', targetW, originH, scale, '#fbf9f5', theme.canvasBgMid);

        ctx.strokeStyle = theme.borderPrimary;
        ctx.lineWidth = 2.4 * scale;
        ctx.beginPath();
        traceRoundedWindowPath(ctx, winX, winY, winW, winH, 10 * scale);
        ctx.stroke();

        ctx.strokeStyle = theme.goldAccent;
        ctx.lineWidth = 1.2 * scale;
        ctx.strokeRect(winX - 14 * scale, winY - 14 * scale, winW + 28 * scale, winH + 28 * scale);

        ctx.textAlign = 'center';
        ctx.fillStyle = theme.textTop;
        ctx.font = `italic 700 ${Math.floor(54 * scale)}px "Cormorant Garamond", serif`;
        ctx.fillText('M U S E   D ’ O C T O B R E', targetW / 2, 82 * scale);

        ctx.fillStyle = theme.recipientColor;
        ctx.font = `600 ${Math.floor(16 * scale)}px "Montserrat", sans-serif`;
        ctx.fillText('—   W O M E N   O F   B T L M V N   •   2 0 . 1 0   —', targetW / 2, 126 * scale);

        ctx.fillStyle = theme.textMid;
        ctx.font = `italic 500 ${Math.floor(22 * scale)}px "Playfair Display", serif`;
        ctx.textAlign = 'left';
        ctx.fillText('No. 2010 — Autumn Portrait', winX, winY + winH + 42 * scale);
        ctx.textAlign = 'right';
        ctx.fillText('Oct. 20 ♥', winX + winW, winY + winH + 42 * scale);

    } else if (concept === 'runway') {
        // 08. ÁNH HÀO QUANG (Runway Spotlight & Inner Floating Gold Arch)
        const botScrim = ctx.createLinearGradient(0, originH - 170 * scale, 0, originH);
        botScrim.addColorStop(0, 'rgba(255, 255, 255, 0)');
        botScrim.addColorStop(1, theme.canvasBgStart);
        ctx.fillStyle = botScrim;
        ctx.fillRect(0, originH - 170 * scale, targetW, 170 * scale);

        const inX = 48 * scale;
        const inY = 58 * scale;
        const inW = targetW - inX * 2;
        const inH = originH - 96 * scale;

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.28)';
        ctx.shadowBlur = 12 * scale;
        ctx.beginPath();
        traceArchWindowPath(ctx, inX, inY, inW, inH, 28 * scale);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3 * scale;
        ctx.stroke();

        ctx.beginPath();
        traceArchWindowPath(ctx, inX + 12 * scale, inY + 12 * scale, inW - 24 * scale, inH - 24 * scale, 22 * scale);
        ctx.strokeStyle = theme.goldAccent;
        ctx.lineWidth = 1.8 * scale;
        ctx.stroke();
        ctx.restore();

        drawStarburstFlare(ctx, targetW / 2, inY, 24 * scale, theme, '#ffffff');
        drawStarburstFlare(ctx, inX, inY + inW / 2, 16 * scale, theme);
        drawStarburstFlare(ctx, inX + inW, inY + inW / 2, 16 * scale, theme);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = 10 * scale;
        ctx.font = `700 ${Math.floor(18 * scale)}px "Montserrat", sans-serif`;
        ctx.fillText('✦   Q U E E N   O F   O C T O B E R   •   2 0 / 1 0   ✦', targetW / 2, inH + 18 * scale);
        ctx.restore();

    } else if (concept === 'atelier') {
        // 09. NHÃN COUTURE (Chanel / Celine Haute Couture Plaque)
        const winX = Math.floor(72 * scale);
        const winY = Math.floor(88 * scale);
        const winW = targetW - winX * 2;
        const winH = originH - Math.floor(114 * scale);

        fillMatteOutsideWindow(ctx, 'atelier', targetW, originH, scale, '#ffffff', theme.canvasBgMid);

        ctx.strokeStyle = theme.textTop;
        ctx.lineWidth = 4.2 * scale;
        ctx.strokeRect(winX, winY, winW, winH);

        ctx.strokeStyle = theme.goldAccent;
        ctx.lineWidth = 1.6 * scale;
        ctx.strokeRect(winX - 12 * scale, winY - 12 * scale, winW + 24 * scale, winH + 24 * scale);

        const tagW = 460 * scale;
        const tagH = 74 * scale;
        const tagX = (targetW - tagW) / 2;
        const tagY = winY - tagH / 2;

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.12)';
        ctx.shadowBlur = 14 * scale;
        ctx.shadowOffsetY = 4 * scale;
        ctx.beginPath();
        traceChamferWindowPath(ctx, tagX, tagY, tagW, tagH, 14 * scale);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();

        ctx.beginPath();
        traceChamferWindowPath(ctx, tagX, tagY, tagW, tagH, 14 * scale);
        ctx.strokeStyle = theme.textTop;
        ctx.lineWidth = 2.4 * scale;
        ctx.stroke();

        ctx.beginPath();
        traceChamferWindowPath(ctx, tagX + 6 * scale, tagY + 6 * scale, tagW - 12 * scale, tagH - 12 * scale, 10 * scale);
        ctx.strokeStyle = theme.goldAccent;
        ctx.lineWidth = 1.2 * scale;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = theme.textTop;
        ctx.font = `700 ${Math.floor(20 * scale)}px "Playfair Display", serif`;
        ctx.fillText('B T L M V N   A T E L I E R', targetW / 2, tagY + 30 * scale);
        ctx.fillStyle = theme.recipientColor;
        ctx.font = `600 ${Math.floor(13 * scale)}px "Montserrat", sans-serif`;
        ctx.fillText('HAUTE COUTURE  •  20.10 EDITION', targetW / 2, tagY + 54 * scale);

    } else if (concept === 'polaroid') {
        // 10. POLAROID HÀN QUỐC & BĂNG KEO WASHI
        const cardX = Math.floor(54 * scale);
        const cardY = Math.floor(62 * scale);
        const cardW = targetW - cardX * 2;
        const cardH = originH - Math.floor(78 * scale);

        const winX = Math.floor(88 * scale);
        const winY = Math.floor(98 * scale);
        const winW = targetW - winX * 2;
        const winH = originH - Math.floor(245 * scale);
        const winR = Math.floor(12 * scale);

        ctx.beginPath();
        ctx.rect(0, 0, targetW, originH);
        traceRoundedWindowPath(ctx, cardX, cardY, cardW, cardH, 18 * scale);
        const paperGrad = ctx.createLinearGradient(0, 0, 0, originH);
        paperGrad.addColorStop(0, '#f9f6f0');
        paperGrad.addColorStop(1, theme.canvasBgMid);
        ctx.fillStyle = paperGrad;
        ctx.fill('evenodd');

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

        drawWashiTape(ctx, cardX + 64 * scale, cardY + 12 * scale, 165 * scale, 42 * scale, -0.42, theme);
        drawWashiTape(ctx, cardX + cardW - 64 * scale, cardY + 12 * scale, 165 * scale, 42 * scale, 0.42, theme);

        const footerMidY = winY + winH + (cardY + cardH - (winY + winH)) / 2;
        ctx.fillStyle = theme.textMid;
        ctx.font = `italic 600 ${Math.floor(32 * scale)}px "Cormorant Garamond", serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('October 20th  —  Radiant Memories ♥', winX + 12 * scale, footerMidY);

        drawPostmarkStamp(ctx, winX + winW - 64 * scale, footerMidY - 8 * scale, 44 * scale, theme);

    } else if (concept === 'film_kodak') {
        // 11. CÀNH ĐÀO SAKURA MÙA XUÂN (Kyoto Sakura Blossoms & Falling Petals - MẪU HOA LÁ 3)
        const winX = Math.floor(72 * scale);
        const winY = Math.floor(72 * scale);
        const winW = targetW - winX * 2;
        const winH = originH - Math.floor(100 * scale);

        fillMatteOutsideWindow(ctx, 'film_kodak', targetW, originH, scale, '#fff9fb', theme.canvasBgEnd);

        // Viền kép vàng ánh kim & hồng phấn quanh cửa sổ
        ctx.beginPath();
        traceRoundedWindowPath(ctx, winX, winY, winW, winH, 28 * scale);
        ctx.strokeStyle = theme.goldAccent;
        ctx.lineWidth = 3.5 * scale;
        ctx.stroke();

        ctx.beginPath();
        traceRoundedWindowPath(ctx, winX - 12 * scale, winY - 12 * scale, winW + 24 * scale, winH + 24 * scale, 34 * scale);
        ctx.strokeStyle = theme.flowerSoft;
        ctx.lineWidth = 1.8 * scale;
        ctx.stroke();

        // Cành Hoa Anh Đào nở rộ vươn từ góc trên-phải và góc dưới-trái
        drawSakuraBranchCorner(ctx, targetW - 28 * scale, 28 * scale, scale * 1.08, -1, 1, theme);
        drawSakuraBranchCorner(ctx, 28 * scale, originH - 42 * scale, scale * 1.05, 1, -1, theme);

        // Điểm xuyết hoa đào nhỏ ở góc trên-trái
        drawDetailedSakuraBloom(ctx, winX + 8 * scale, winY + 8 * scale, 26 * scale, 0.3, theme);

    } else if (concept === 'postcard') {
        // 12. BƯU THIẾP PARIS (Air-Mail Postcard & Vintage Stamp)
        const winX = Math.floor(78 * scale);
        const winY = Math.floor(82 * scale);
        const winW = targetW - winX * 2;
        const winH = originH - Math.floor(110 * scale);

        fillMatteOutsideWindow(ctx, 'postcard', targetW, originH, scale, '#fdfaf4', theme.canvasBgMid);

        ctx.save();
        const stripeW = 16 * scale;
        ctx.beginPath();
        ctx.rect(0, 0, targetW, originH);
        ctx.rect(stripeW, stripeW, targetW - stripeW * 2, originH - stripeW * 2);
        ctx.clip('evenodd');

        const step = 44 * scale;
        for (let pos = -originH; pos < targetW + originH; pos += step) {
            ctx.fillStyle = (Math.floor(pos / step) % 2 === 0) ? theme.flowerMain : theme.borderPrimary;
            ctx.globalAlpha = 0.55;
            ctx.beginPath();
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos + 22 * scale, 0);
            ctx.lineTo(pos - originH + 22 * scale, originH);
            ctx.lineTo(pos - originH, originH);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        ctx.beginPath();
        traceRoundedWindowPath(ctx, winX, winY, winW, winH, 16 * scale);
        ctx.strokeStyle = theme.borderPrimary;
        ctx.lineWidth = 3 * scale;
        ctx.stroke();

        ctx.save();
        ctx.translate(winX + winW - 76 * scale, winY + 78 * scale);
        ctx.rotate(0.1);
        const sw = 136 * scale;
        const sh = 162 * scale;
        ctx.shadowColor = 'rgba(0,0,0,0.16)';
        ctx.shadowBlur = 12 * scale;
        ctx.beginPath();
        traceScallopWindowPath(ctx, -sw / 2, -sh / 2, sw, sh, 6, 7, 5 * scale);
        ctx.fillStyle = '#fffdf8';
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = theme.goldAccent;
        ctx.lineWidth = 1.5 * scale;
        ctx.stroke();

        ctx.fillStyle = theme.canvasBgEnd;
        ctx.fillRect(-sw / 2 + 12 * scale, -sh / 2 + 12 * scale, sw - 24 * scale, sh - 24 * scale);
        ctx.strokeStyle = theme.borderPrimary;
        ctx.strokeRect(-sw / 2 + 12 * scale, -sh / 2 + 12 * scale, sw - 24 * scale, sh - 24 * scale);

        drawSakuraFlower(ctx, 0, -10 * scale, 28 * scale, theme.flowerMain, theme.goldAccent);
        ctx.fillStyle = theme.textTop;
        ctx.font = `700 ${Math.floor(18 * scale)}px "Playfair Display", serif`;
        ctx.textAlign = 'center';
        ctx.fillText('20 • 10', 0, sh / 2 - 26 * scale);
        ctx.restore();

        drawPostmarkStamp(ctx, winX + winW - 145 * scale, winY + 125 * scale, 42 * scale, theme);

    } else if (concept === 'scrapbook') {
        // 13. VƯỜN CÚC HỌA MI, OẢI HƯƠNG & LÁ NGÂN HẠNH (Botanical Herbarium - MẪU HOA LÁ 4)
        const winX = Math.floor(76 * scale);
        const winY = Math.floor(84 * scale);
        const winW = targetW - winX * 2;
        const winH = originH - Math.floor(118 * scale);

        fillMatteOutsideWindow(ctx, 'scrapbook', targetW, originH, scale, '#fdfbf6', theme.canvasBgEnd);

        // Viền khung giấy thảo mộc đôi thanh nhã
        ctx.beginPath();
        traceRoundedWindowPath(ctx, winX, winY, winW, winH, 22 * scale);
        ctx.strokeStyle = theme.borderPrimary;
        ctx.lineWidth = 3.2 * scale;
        ctx.stroke();

        ctx.beginPath();
        traceRoundedWindowPath(ctx, winX - 12 * scale, winY - 12 * scale, winW + 24 * scale, winH + 24 * scale, 28 * scale);
        ctx.strokeStyle = theme.goldAccent;
        ctx.lineWidth = 1.4 * scale;
        ctx.stroke();

        // Cụm thảo mộc góc trên-trái: Lá Ngân Hạnh vàng + Nhành Oải Hương + Cúc Họa Mi
        drawGinkgoLeaf(ctx, winX + 35 * scale, winY + 45 * scale, 78 * scale, 0.65, theme);
        drawGinkgoLeaf(ctx, winX + 75 * scale, winY + 18 * scale, 62 * scale, 1.15, theme);
        drawLavenderSpike(ctx, winX + 18 * scale, winY + 135 * scale, 130 * scale, 0.22, theme);
        drawLavenderSpike(ctx, winX + 42 * scale, winY + 25 * scale, 125 * scale, 1.32, theme);
        drawRichChamomileDaisy(ctx, winX + 16 * scale, winY + 18 * scale, 40 * scale, theme);
        drawRichChamomileDaisy(ctx, winX + 72 * scale, winY + 52 * scale, 26 * scale, theme);

        // Cụm thảo mộc góc dưới-phải: Lá Ngân Hạnh + Oải Hương + Cúc Họa Mi
        const brX = winX + winW;
        const brY = winY + winH;
        drawGinkgoLeaf(ctx, brX - 35 * scale, brY - 45 * scale, 78 * scale, -2.45, theme);
        drawGinkgoLeaf(ctx, brX - 75 * scale, brY - 18 * scale, 62 * scale, -1.95, theme);
        drawLavenderSpike(ctx, brX - 18 * scale, brY - 135 * scale, 130 * scale, -2.92, theme);
        drawLavenderSpike(ctx, brX - 42 * scale, brY - 25 * scale, 125 * scale, -1.82, theme);
        drawRichChamomileDaisy(ctx, brX - 16 * scale, brY - 18 * scale, 40 * scale, theme);
        drawRichChamomileDaisy(ctx, brX - 72 * scale, brY - 52 * scale, 26 * scale, theme);

        // Dải Washi Tape thảo mộc ở góc trên-phải
        drawWashiTape(ctx, brX - 46 * scale, winY + 10 * scale, 150 * scale, 38 * scale, 0.42, theme);

    } else if (concept === 'aura' || concept === 'aura_arch' || concept === 'prism') {
        // 14, 15, 16: NHÓM KÍNH MỜ AURA & PHA LÊ (Blurred Photo Aura + Glassmorphism)
        const winX = Math.floor(66 * scale);
        const winY = Math.floor(66 * scale);
        const winW = targetW - winX * 2;
        const winH = originH - Math.floor(96 * scale);

        if (isStep2Overlay) {
            ctx.beginPath();
            ctx.rect(0, 0, targetW, originH);
            traceConceptPhotoWindow(ctx, concept, targetW, originH, scale);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.56)';
            ctx.fill('evenodd');
        }

        const slabX = Math.floor(38 * scale);
        const slabY = Math.floor(38 * scale);
        const slabW = targetW - slabX * 2;
        const slabH = originH - Math.floor(42 * scale);

        ctx.beginPath();
        if (concept === 'aura_arch') {
            traceArchWindowPath(ctx, slabX, slabY, slabW, slabH, 42 * scale);
        } else if (concept === 'prism') {
            traceChamferWindowPath(ctx, slabX, slabY, slabW, slabH, 68 * scale);
        } else {
            traceRoundedWindowPath(ctx, slabX, slabY, slabW, slabH, 44 * scale);
        }
        traceConceptPhotoWindow(ctx, concept, targetW, originH, scale);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.34)';
        ctx.fill('evenodd');

        ctx.beginPath();
        if (concept === 'aura_arch') {
            traceArchWindowPath(ctx, slabX, slabY, slabW, slabH, 42 * scale);
        } else if (concept === 'prism') {
            traceChamferWindowPath(ctx, slabX, slabY, slabW, slabH, 68 * scale);
        } else {
            traceRoundedWindowPath(ctx, slabX, slabY, slabW, slabH, 44 * scale);
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.lineWidth = 2.6 * scale;
        ctx.stroke();

        ctx.beginPath();
        traceConceptPhotoWindow(ctx, concept, targetW, originH, scale);
        const glassGrad = ctx.createLinearGradient(winX, winY, winX + winW, winY + winH);
        glassGrad.addColorStop(0, '#ffffff');
        glassGrad.addColorStop(0.5, concept === 'prism' ? theme.goldAccent : theme.borderSecondary);
        glassGrad.addColorStop(1, '#ffffff');
        ctx.strokeStyle = glassGrad;
        ctx.lineWidth = 3.4 * scale;
        ctx.stroke();

        if (concept === 'aura_arch') {
            drawStarburstFlare(ctx, targetW / 2, winY, 22 * scale, theme, '#ffffff');
        } else if (concept === 'prism') {
            drawStarburstFlare(ctx, winX + 56 * scale, winY, 20 * scale, theme, '#ffffff');
            drawStarburstFlare(ctx, winX + winW - 56 * scale, winY, 20 * scale, theme, '#ffffff');
            drawStarburstFlare(ctx, winX, winY + 56 * scale, 16 * scale, theme);
            drawStarburstFlare(ctx, winX + winW, winY + winH - 56 * scale, 16 * scale, theme);
        } else {
            drawStarburstFlare(ctx, winX + 20 * scale, winY + 20 * scale, 16 * scale, theme, '#ffffff');
            drawStarburstFlare(ctx, winX + winW - 20 * scale, winY + winH - 20 * scale, 16 * scale, theme, '#ffffff');
        }

    } else if (concept === 'floating_shadow') {
        // 17. BÓNG NẮNG THU (Golden Hour Sunbeam & Floating Gallery)
        const winX = Math.floor(72 * scale);
        const winY = Math.floor(72 * scale);
        const winW = targetW - winX * 2;
        const winH = originH - Math.floor(98 * scale);

        ctx.save();
        const beam = ctx.createLinearGradient(0, 0, targetW, originH * 0.75);
        beam.addColorStop(0, 'rgba(255, 236, 185, 0.28)');
        beam.addColorStop(0.35, 'rgba(255, 245, 220, 0.12)');
        beam.addColorStop(0.65, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = beam;
        ctx.fillRect(winX, winY, winW, winH);
        ctx.restore();

        fillMatteOutsideWindow(ctx, 'floating_shadow', targetW, originH, scale, '#fffcf5', theme.canvasBgEnd);

        ctx.beginPath();
        traceRoundedWindowPath(ctx, winX, winY, winW, winH, 24 * scale);
        ctx.strokeStyle = theme.goldAccent;
        ctx.lineWidth = 3.2 * scale;
        ctx.stroke();

        ctx.beginPath();
        traceRoundedWindowPath(ctx, winX - 12 * scale, winY - 12 * scale, winW + 24 * scale, winH + 24 * scale, 30 * scale);
        ctx.strokeStyle = theme.borderSecondary;
        ctx.lineWidth = 1.4 * scale;
        ctx.stroke();

        drawFineBotanicalSprig(ctx, winX + winW - 110 * scale, winY - 10 * scale, scale * 1.15, 0.25, theme);
        drawFineBotanicalSprig(ctx, winX + 110 * scale, winY + winH + 10 * scale, scale * 1.15, Math.PI + 0.25, theme);

    } else if (concept === 'dior') {
        // 18. VƯỜN HỒNG PHÁP DIOR (French Rose Garden & Gold Octagon - MẪU HOA LÁ 5)
        const winX = Math.floor(66 * scale);
        const winY = Math.floor(66 * scale);
        const winW = targetW - winX * 2;
        const winH = originH - Math.floor(94 * scale);
        const chamf = Math.floor(46 * scale);

        fillMatteOutsideWindow(ctx, 'dior', targetW, originH, scale, '#fffdf9', theme.canvasBgMid);

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

        // Khóm Hoa Hồng Anh Quốc (Watercolor + Gold Line-Art) nở rộ ở cả 4 góc khung nước hoa Pháp
        drawFineLineRoseCorner(ctx, winX - 8 * scale, winY - 8 * scale, scale * 1.32, 1, 1, theme);
        drawFineLineRoseCorner(ctx, winX + winW + 8 * scale, winY + winH + 8 * scale, scale * 1.32, -1, -1, theme);
        drawFineLineRoseCorner(ctx, winX + winW + 4 * scale, winY - 4 * scale, scale * 0.92, -1, 1, theme);
        drawFineLineRoseCorner(ctx, winX - 4 * scale, winY + winH + 4 * scale, scale * 0.92, 1, -1, theme);

    } else if (concept === 'pearl_lace') {
        // 19. CHUỖI NGỌC TRAI (Tiffany Pearl Beaded Frame & Silk Bow)
        const winX = Math.floor(74 * scale);
        const winY = Math.floor(82 * scale);
        const winW = targetW - winX * 2;
        const winH = originH - Math.floor(108 * scale);

        fillMatteOutsideWindow(ctx, 'pearl_lace', targetW, originH, scale, '#fffcfd', theme.canvasBgEnd);

        ctx.beginPath();
        traceRoundedWindowPath(ctx, winX, winY, winW, winH, 36 * scale);
        ctx.strokeStyle = theme.goldAccent;
        ctx.lineWidth = 3 * scale;
        ctx.stroke();

        // Đính chuỗi hạt ngọc trai 3D dọc theo 4 cạnh khung
        const pearlR = 6.2 * scale;
        const nx = 18;
        const ny = 28;
        for (let i = 1; i < nx; i++) {
            const px = winX + (i / nx) * winW;
            drawLustrousPearl(ctx, px, winY - 8 * scale, pearlR, theme);
            drawLustrousPearl(ctx, px, winY + winH + 8 * scale, pearlR, theme);
        }
        for (let j = 1; j < ny; j++) {
            const py = winY + (j / ny) * winH;
            drawLustrousPearl(ctx, winX - 8 * scale, py, pearlR, theme);
            drawLustrousPearl(ctx, winX + winW + 8 * scale, py, pearlR, theme);
        }

        drawSilkRibbonBow(ctx, targetW / 2, winY - 12 * scale, 42 * scale, theme);
        drawLustrousPearl(ctx, targetW / 2, winY + 6 * scale, 8 * scale, theme);

    } else if (concept === 'celestial') {
        // 20. VŨ KHÚC ÁNH TRĂNG (Celestial Moon, Constellations & Starlight)
        const winX = Math.floor(70 * scale);
        const winY = Math.floor(70 * scale);
        const winW = targetW - winX * 2;
        const winH = originH - Math.floor(96 * scale);
        const br = 32 * scale;

        fillMatteOutsideWindow(ctx, 'celestial', targetW, originH, scale, '#fffdf7', theme.canvasBgEnd);

        ctx.beginPath();
        traceArchWindowPath(ctx, winX, winY, winW, winH, br);
        ctx.strokeStyle = theme.goldAccent;
        ctx.lineWidth = 3.8 * scale;
        ctx.stroke();

        ctx.beginPath();
        traceArchWindowPath(ctx, winX - 12 * scale, winY - 12 * scale, winW + 24 * scale, winH + 24 * scale, br + 8 * scale);
        ctx.strokeStyle = theme.borderPrimary;
        ctx.lineWidth = 1.4 * scale;
        ctx.stroke();

        // Trăng lưỡi liềm ánh kim ở góc trên-trái + Chòm sao nối dây vàng ở góc trên-phải
        drawCrescentMoon(ctx, 108 * scale, 112 * scale, 36 * scale, -0.35, theme.goldAccent);
        drawStarburstFlare(ctx, 148 * scale, 84 * scale, 14 * scale, theme);

        // Chòm sao bắc đẩu góc trên phải
        const stars = [
            [targetW - 180 * scale, 64 * scale],
            [targetW - 125 * scale, 82 * scale],
            [targetW - 86 * scale, 128 * scale],
            [targetW - 62 * scale, 185 * scale]
        ];
        ctx.save();
        ctx.strokeStyle = theme.goldAccent;
        ctx.lineWidth = 1.4 * scale;
        ctx.setLineDash([4 * scale, 4 * scale]);
        ctx.beginPath();
        stars.forEach(([sx, sy], idx) => {
            if (idx === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        });
        ctx.stroke();
        ctx.restore();

        stars.forEach(([sx, sy], idx) => {
            drawStarburstFlare(ctx, sx, sy, (idx % 2 === 0 ? 13 : 9) * scale, theme);
        });

        drawStarburstFlare(ctx, targetW / 2, winY - 12 * scale, 18 * scale, theme);
    }

    ctx.restore();
}

const fullOverlayCache = {};

function buildConceptDataUrlAtSize(conceptKey, theme, w, h) {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const offCtx = offCanvas.getContext('2d');
    renderConceptOverlayToCtx(offCtx, conceptKey, w, h, theme, true);
    return offCanvas.toDataURL('image/png');
}

function getFullConceptOverlayDataUrl(conceptKey) {
    const cacheKey = `${currentColorTheme}_${conceptKey}`;
    if (!fullOverlayCache[cacheKey]) {
        const theme = COLOR_THEMES[currentColorTheme] || COLOR_THEMES.emerald;
        fullOverlayCache[cacheKey] = buildConceptDataUrlAtSize(conceptKey, theme, 1024, 1526);
    }
    return fullOverlayCache[cacheKey];
}

function refreshConceptFramesForTheme() {
    const theme = COLOR_THEMES[currentColorTheme] || COLOR_THEMES.emerald;
    framesConfig.forEach(config => {
        if (config.isConcept && config.concept) {
            const thumbUrl = buildConceptDataUrlAtSize(config.concept, theme, 160, 238);
            config.thumbPath = thumbUrl;
            const thumb = document.querySelector(`.frame-thumb-box[data-frame-thumb="${config.id}"]`);
            if (thumb) {
                thumb.style.backgroundImage = `url('${thumbUrl}')`;
            }
        }
    });
    updateFrameOverlay();
}

function preloadFrames() {
    const theme = COLOR_THEMES[currentColorTheme] || COLOR_THEMES.emerald;
    framesConfig.forEach(config => {
        config.thumbPath = buildConceptDataUrlAtSize(config.concept, theme, 160, 238);
    });
}
preloadFrames();

// Bản đồ phối hợp tự động (Khung chữ + Tông màu) chuẩn Haute Couture cho 20 mẫu khung ảnh
const CONCEPT_HARMONY_MAP = {
    arch:            { border: 'hearts',  theme: 'emerald',   label: 'Ngọc Bích & Pha Lê' },
    oval:            { border: 'ribbon',  theme: 'blush',     label: 'Hồng Đào & Ngọc Trai' },
    cathedral:       { border: 'sakura',  theme: 'blush',     label: 'Hồng Đào & Hoa Trà' },
    magazine:        { border: 'vintage', theme: 'champagne', label: 'Kem Vàng & Hồng Pháp' },
    hourglass:       { border: 'daisy',   theme: 'emerald',   label: 'Ngọc Bích & Nguyệt Quế' },
    runway:          { border: 'hearts',  theme: 'champagne', label: 'Kem Vàng & Pha Lê' },
    atelier:         { border: 'vintage', theme: 'rosegold',  label: 'Rose Gold & Hồng Pháp' },
    scallop:         { border: 'ribbon',  theme: 'blush',     label: 'Hồng Đào & Ngọc Trai' },
    dior:            { border: 'vintage', theme: 'rosegold',  label: 'Rose Gold & Hồng Pháp' },
    pearl_lace:      { border: 'ribbon',  theme: 'lavender',  label: 'Tím Thơ & Ngọc Trai' },
    film_kodak:      { border: 'sakura',  theme: 'blush',     label: 'Hồng Đào & Anh Đào' },
    polaroid:        { border: 'ribbon',  theme: 'rosegold',  label: 'Rose Gold & Nơ Lụa' },
    scrapbook:       { border: 'daisy',   theme: 'champagne', label: 'Kem Vàng & Cúc Họa Mi' },
    aura:            { border: 'hearts',  theme: 'lavender',  label: 'Tím Thơ & Pha Lê' },
    aura_arch:       { border: 'hearts',  theme: 'blush',     label: 'Hồng Đào & Pha Lê' },
    prism:           { border: 'hearts',  theme: 'emerald',   label: 'Ngọc Bích & Pha Lê' },
    floating_shadow: { border: 'daisy',   theme: 'emerald',   label: 'Ngọc Bích & Nguyệt Quế' },
    postcard:        { border: 'vintage', theme: 'rosegold',  label: 'Rose Gold & Hồng Pháp' },
    celestial:       { border: 'hearts',  theme: 'champagne', label: 'Kem Vàng & Tinh Tú' },
    elle_minimal:    { border: 'daisy',   theme: 'lavender',  label: 'Tím Thơ & Thảo Mộc' }
};

let floatingBadgeTimer = null;

function showCardFloatingBadge(text) {
    const badge = document.getElementById('card-floating-badge');
    if (!badge) return;
    badge.textContent = text;
    badge.classList.add('visible');
    if (floatingBadgeTimer) clearTimeout(floatingBadgeTimer);
    floatingBadgeTimer = setTimeout(() => {
        badge.classList.remove('visible');
    }, 1450);
}

// Cuộn mượt phần tử đang chọn ra chính giữa thanh trượt ngang (không bao giờ làm giật trang)
function scrollChipIntoCenter(el) {
    if (!el) return;
    const scroller = el.closest('.frame-carousel, .filter-carousel, .concept-chips, .topic-chips, .style-chips, .color-swatches');
    if (!scroller || scroller.clientWidth <= 0) return;
    const elRect = el.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    if (scrollerRect.width <= 0) return;
    const delta = (elRect.left + elRect.width / 2) - (scrollerRect.left + scrollerRect.width / 2);
    scroller.scrollTo({
        left: Math.max(0, scroller.scrollLeft + delta),
        behavior: 'smooth'
    });
}

function syncBorderChipsUI(borderStyle, shouldScroll = false) {
    document.querySelectorAll('#border-style-chips .style-chip').forEach(c => {
        const isActive = c.getAttribute('data-border') === borderStyle;
        c.classList.toggle('active', isActive);
        if (isActive && shouldScroll) {
            scrollChipIntoCenter(c);
        }
    });
}

function syncColorSwatchesUI(themeKey, shouldScroll = false) {
    document.querySelectorAll('#color-theme-swatches .color-swatch-btn').forEach(b => {
        const isActive = b.getAttribute('data-theme') === themeKey;
        b.classList.toggle('active', isActive);
        if (isActive && shouldScroll) {
            scrollChipIntoCenter(b);
        }
    });
}

function selectFrameById(frameId, shouldRedrawStep3 = false, slideDir = 0, autoHarmonize = true) {
    const total = framesConfig.length;
    currentSelectedFrameId = ((frameId % total) + total) % total;
    const cfg = framesConfig[currentSelectedFrameId] || framesConfig[0];

    // Tự động phối hợp cả Kiểu viền hộp lời chúc & Tông màu ăn khớp với mẫu khung vừa chọn
    if (autoHarmonize && cfg && CONCEPT_HARMONY_MAP[cfg.concept]) {
        const harmony = CONCEPT_HARMONY_MAP[cfg.concept];
        currentBorderStyle = harmony.border;
        syncBorderChipsUI(currentBorderStyle, false);

        if (COLOR_THEMES[harmony.theme] && currentColorTheme !== harmony.theme) {
            currentColorTheme = harmony.theme;
            syncColorSwatchesUI(currentColorTheme, false);
        }
    }

    document.querySelectorAll('#frame-list .frame-item').forEach((el, idx) => {
        const isActive = idx === currentSelectedFrameId;
        el.classList.toggle('active', isActive);
        if (isActive && step2 && step2.classList.contains('active')) {
            scrollChipIntoCenter(el);
        }
    });

    document.querySelectorAll('#step3-concept-chips .concept-chip, #step3-classic-frame-chips .concept-chip').forEach(btn => {
        const id = Number(btn.getAttribute('data-frame-id'));
        const isActive = id === currentSelectedFrameId;
        btn.classList.toggle('active', isActive);
        if (isActive && shouldRedrawStep3 && step3 && step3.classList.contains('active')) {
            scrollChipIntoCenter(btn);
        }
    });

    updateFrameOverlay();

    if (shouldRedrawStep3 && currentUserImage) {
        drawCanvasImageText(finalResultCanvas, true);
        if (slideDir !== 0 && cardShowcase) {
            cardShowcase.style.transform = '';
            cardShowcase.classList.remove('reveal-playing', 'pulse-playing', 'slide-next', 'slide-prev');
            void cardShowcase.offsetWidth;
            cardShowcase.classList.add(slideDir > 0 ? 'slide-next' : 'slide-prev');
        } else {
            triggerCardPulse();
        }
        if (cfg) {
            const harmony = CONCEPT_HARMONY_MAP[cfg.concept];
            showCardFloatingBadge(harmony ? `✨ ${cfg.fullLabel} • ${harmony.label}` : `✨ ${cfg.fullLabel}`);
        }
    }
}

function renderFrameList() {
    frameList.innerHTML = '';
    const row1Chips = document.getElementById('step3-concept-chips');
    const row2Chips = document.getElementById('step3-classic-frame-chips');
    if (row1Chips) row1Chips.innerHTML = '';
    if (row2Chips) row2Chips.innerHTML = '';

    framesConfig.forEach((f, i) => {
        // 1. Item trong Carousel Bước 2 (dùng ảnh thu nhỏ 160x238 siêu tốc)
        const div = document.createElement('div');
        div.className = `frame-item is-concept ${i === currentSelectedFrameId ? 'active' : ''}`;
        div.innerHTML = `
            <div class="frame-thumb-box" data-frame-thumb="${i}" style="width:100%; height:44px; background: url('${f.thumbPath}') center/contain no-repeat; margin-bottom:3px;"></div>
            <span>${f.label}</span>
        `;
        div.onclick = () => selectFrameById(i, false, 0, true);
        frameList.appendChild(div);

        // 2. Chia đều 20 mẫu vào 2 hàng chọn nhanh ở Bước 3 (Hàng 1: 01-10, Hàng 2: 11-20)
        const targetRow = i < 10 ? row1Chips : row2Chips;
        if (targetRow) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `concept-chip ${i === currentSelectedFrameId ? 'active' : ''}`;
            btn.setAttribute('data-frame-id', String(i));
            btn.textContent = f.fullLabel;
            btn.onclick = () => {
                const dir = i > currentSelectedFrameId ? 1 : (i < currentSelectedFrameId ? -1 : 0);
                selectFrameById(i, true, dir, true);
            };
            targetRow.appendChild(btn);
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
        const targetBtn = e.currentTarget;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        targetBtn.classList.add('active');
        currentSelectedFilter = targetBtn.getAttribute('data-filter');
        applyFilterToPreview();
        scrollChipIntoCenter(targetBtn);
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
                const activeFrameEl = document.querySelector('#frame-list .frame-item.active');
                if (activeFrameEl) scrollChipIntoCenter(activeFrameEl);
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
    const cfg = framesConfig[currentSelectedFrameId] || framesConfig[0];
    if (frameOverlayEl && cfg) {
        frameOverlayEl.src = getFullConceptOverlayDataUrl(cfg.concept);
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

// ====== BƯỚC 2 -> BƯỚC 3: ĐẠI HOA TRÀ COUTURE 3D Ở GIỮA MÀN HÌNH (VỪA XOÁY VỪA XÒE BUNG CÁNH) ======
function ensureGiantSwirlingFlowerBuilt() {
    const core = document.getElementById('bloom-flower-core');
    if (!core || core.children.length > 0) return;

    const ringsConfig = [
        {
            className: 'ring-sepals',
            count: 8,
            pw: 'min(22vmin, 122px)',
            ph: 'min(45vmin, 248px)',
            delay: '0s',
            svg: `<svg viewBox="-50 -200 100 210"><defs><linearGradient id="sepalG" x1="0" y1="1" x2="0.8" y2="0"><stop offset="0%" stop-color="#074d3b"/><stop offset="55%" stop-color="#1f8e70"/><stop offset="100%" stop-color="#8fe0c4"/></linearGradient></defs><path d="M0,0 C-36,-48 -42,-136 0,-196 C42,-136 36,-48 0,0 Z" fill="url(#sepalG)" stroke="#ecc56a" stroke-width="2.2"/><path d="M0,-8 Q2,-95 0,-182" fill="none" stroke="#f7df94" stroke-width="1.5" opacity="0.85"/></svg>`
        },
        {
            className: 'ring-outer',
            count: 12,
            pw: 'min(26vmin, 144px)',
            ph: 'min(44vmin, 242px)',
            delay: '0.04s',
            svg: `<svg viewBox="-65 -200 130 210"><defs><radialGradient id="outerPG" cx="50%" cy="88%" r="88%"><stop offset="0%" stop-color="#c93b6b"/><stop offset="48%" stop-color="#f48fb1"/><stop offset="86%" stop-color="#ffe6ee"/><stop offset="100%" stop-color="#ffffff"/></radialGradient></defs><path d="M0,0 C-52,-38 -62,-142 -16,-188 C-5,-198 0,-186 0,-186 C0,-186 5,-198 16,-188 C62,-142 52,-38 0,0 Z" fill="url(#outerPG)" stroke="#f3cf78" stroke-width="2"/><path d="M0,-12 Q-6,-95 -4,-168 M0,-12 Q6,-95 4,-168" fill="none" stroke="#ffffff" stroke-width="1.1" opacity="0.55"/></svg>`
        },
        {
            className: 'ring-mid',
            count: 10,
            pw: 'min(22vmin, 120px)',
            ph: 'min(36vmin, 198px)',
            delay: '0.09s',
            svg: `<svg viewBox="-60 -175 120 185"><defs><radialGradient id="midPG" cx="50%" cy="85%" r="85%"><stop offset="0%" stop-color="#b8295c"/><stop offset="45%" stop-color="#ec6f99"/><stop offset="88%" stop-color="#ffdbe7"/><stop offset="100%" stop-color="#fff9fb"/></radialGradient></defs><path d="M0,0 C-46,-32 -54,-120 -13,-162 C-4,-170 0,-160 0,-160 C0,-160 4,-170 13,-162 C54,-120 46,-32 0,0 Z" fill="url(#midPG)" stroke="#f5d787" stroke-width="1.8"/></svg>`
        },
        {
            className: 'ring-inner',
            count: 8,
            pw: 'min(18vmin, 98px)',
            ph: 'min(28vmin, 152px)',
            delay: '0.14s',
            svg: `<svg viewBox="-52 -145 104 155"><defs><radialGradient id="innerPG" cx="50%" cy="82%" r="82%"><stop offset="0%" stop-color="#df5282"/><stop offset="52%" stop-color="#f9bfd3"/><stop offset="100%" stop-color="#ffffff"/></radialGradient></defs><path d="M0,0 C-38,-26 -44,-98 -10,-132 C0,-140 10,-132 10,-132 C44,-98 38,-26 0,0 Z" fill="url(#innerPG)" stroke="#f7df98" stroke-width="1.6"/></svg>`
        },
        {
            className: 'ring-core',
            count: 6,
            pw: 'min(13vmin, 72px)',
            ph: 'min(19vmin, 104px)',
            delay: '0.18s',
            svg: `<svg viewBox="-42 -105 84 115"><defs><radialGradient id="corePG" cx="50%" cy="80%" r="80%"><stop offset="0%" stop-color="#eb6a96"/><stop offset="55%" stop-color="#fde4ed"/><stop offset="100%" stop-color="#ffffff"/></radialGradient></defs><path d="M0,0 C-30,-20 -34,-72 -8,-96 C0,-102 8,-96 8,-96 C34,-72 30,-20 0,0 Z" fill="url(#corePG)" stroke="#fae5a8" stroke-width="1.5"/></svg>`
        }
    ];

    ringsConfig.forEach((rc, rIdx) => {
        const ringEl = document.createElement('div');
        ringEl.className = `bloom-ring ${rc.className}`;
        const offsetAngle = (rIdx % 2 === 1) ? (180 / rc.count) : 0;

        for (let i = 0; i < rc.count; i++) {
            const slot = document.createElement('div');
            slot.className = 'bloom-petal-slot';
            const deg = (i * 360) / rc.count + offsetAngle;
            slot.style.transform = `rotate(${deg}deg)`;

            const blade = document.createElement('div');
            blade.className = 'bloom-petal-blade';
            blade.style.setProperty('--pw', rc.pw);
            blade.style.setProperty('--ph', rc.ph);
            blade.style.setProperty('--pdelay', rc.delay);
            blade.innerHTML = rc.svg;

            slot.appendChild(blade);
            ringEl.appendChild(slot);
        }
        core.appendChild(ringEl);
    });

    // Đài nhụy vàng 24K xoáy sáng rực ở chính tâm bông hoa
    const crown = document.createElement('div');
    crown.className = 'bloom-crown-stamen';
    crown.innerHTML = `
        <svg viewBox="-80 -80 160 160">
            <defs>
                <radialGradient id="crownCoreGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="#ffffff"/>
                    <stop offset="45%" stop-color="#fff2b2"/>
                    <stop offset="80%" stop-color="#e2a829"/>
                    <stop offset="100%" stop-color="rgba(226,168,41,0)"/>
                </radialGradient>
            </defs>
            <circle cx="0" cy="0" r="64" fill="url(#crownCoreGlow)" opacity="0.9"/>
            <circle cx="0" cy="0" r="42" fill="none" stroke="#fff6c4" stroke-width="2" stroke-dasharray="4 6"/>
            <circle cx="0" cy="0" r="22" fill="#e5b242" stroke="#ffffff" stroke-width="2"/>
            <path d="M0,-58 L6,-12 L58,0 L6,12 L0,58 L-6,12 L-58,0 L-6,-12 Z" fill="#ffffff"/>
            <path d="M-38,-38 L-6,-10 L38,-38 L10,-6 L38,38 L6,10 L-38,38 L-10,6 Z" fill="#fff3bd" opacity="0.9"/>
            <circle cx="0" cy="-42" r="5" fill="#fffdf2"/>
            <circle cx="30" cy="-30" r="4.5" fill="#fffdf2"/>
            <circle cx="42" cy="0" r="5" fill="#fffdf2"/>
            <circle cx="30" cy="30" r="4.5" fill="#fffdf2"/>
            <circle cx="0" cy="42" r="5" fill="#fffdf2"/>
            <circle cx="-30" cy="30" r="4.5" fill="#fffdf2"/>
            <circle cx="-42" cy="0" r="5" fill="#fffdf2"/>
            <circle cx="-30" cy="-30" r="4.5" fill="#fffdf2"/>
        </svg>
    `;
    core.appendChild(crown);
}

function populateCoutureBloomVortex() {
    ensureGiantSwirlingFlowerBuilt();
    const vortexLayer = document.getElementById('bloom-vortex-layer');
    if (!vortexLayer) return;
    vortexLayer.innerHTML = '';

    const count = 22;
    for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'couture-vortex-item';
        const isStar = i % 3 === 0;
        const size = isStar ? (22 + (i % 3) * 8) : (32 + (i % 4) * 9);
        el.style.setProperty('--item-size', `${size}px`);

        if (isStar) {
            el.innerHTML = `<svg viewBox="-20 -20 40 40"><path d="M0,-18 Q2,-2 18,0 Q2,2 0,18 Q-2,2 -18,0 Q-2,-2 0,-18 Z" fill="#fffdf7" stroke="#e5c158" stroke-width="1.2"/></svg>`;
        } else {
            const gid = `vp-${i}`;
            el.innerHTML = `<svg viewBox="-24 -36 48 44"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff8fa"/><stop offset="55%" stop-color="#f8bbd0"/><stop offset="100%" stop-color="#d85a7f"/></linearGradient></defs><path d="M0,4 C-16,-6 -22,-22 -7,-33 L0,-27 L7,-33 C22,-22 16,-6 0,4 Z" fill="url(#${gid})" stroke="#f3d27a" stroke-width="1"/></svg>`;
        }

        const baseAngle = (i / count) * Math.PI * 2;
        const spiralA1 = baseAngle + 0.55;
        const spiralA2 = baseAngle + 1.25;
        const spiralA3 = baseAngle + 1.95;
        const d1 = 85 + (i % 4) * 24;
        const d2 = 175 + (i % 5) * 32;
        const d3 = 280 + (i % 4) * 48;

        el.style.setProperty('--tx1', `${Math.cos(spiralA1) * d1}px`);
        el.style.setProperty('--ty1', `${Math.sin(spiralA1) * d1}px`);
        el.style.setProperty('--tx2', `${Math.cos(spiralA2) * d2}px`);
        el.style.setProperty('--ty2', `${Math.sin(spiralA2) * d2}px`);
        el.style.setProperty('--tx3', `${Math.cos(spiralA3) * d3}px`);
        el.style.setProperty('--ty3', `${Math.sin(spiralA3) * d3}px`);
        el.style.setProperty('--r1', `${(i * 55) % 180 - 90}deg`);
        el.style.setProperty('--r2', `${(i * 105) % 360 - 180}deg`);
        el.style.setProperty('--r3', `${(i * 165) % 540 - 270}deg`);
        el.style.animationDelay = `${(i % 6) * 0.04}s`;
        vortexLayer.appendChild(el);
    }
}

document.getElementById('generate-final-btn').addEventListener('click', () => {
    if (!cropperObj) return;

    const btn = document.getElementById('generate-final-btn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = "🌸 Đang nở hoa...";
    btn.disabled = true;

    const overlay = document.getElementById('transition-overlay');
    populateCoutureBloomVortex();

    overlay.classList.remove('playing');
    void overlay.offsetWidth;
    overlay.classList.add('playing');
    setTimeout(() => overlay.classList.remove('playing'), 2450);

    setTimeout(() => {
        const targetW = 1024;
        const targetH = 1526;

        const canvas = cropperObj.getCroppedCanvas({ width: targetW, height: targetH });
        const img = new Image();
        img.onload = function () {
            currentUserImage = img;
            // Chỉ bốc câu chúc mới ở lần đầu tạo thiệp; khi quay lại Bước 2 đổi khung thì giữ nguyên câu chúc!
            if (!hasGeneratedQuoteOnce || (!currentAIQuote && !customWishText)) {
                currentAIQuote = getNextQuoteByTopic(currentTopic);
                hasGeneratedQuoteOnce = true;
            }

            // Đồng bộ kiểu viền hộp lời chúc & màu sắc theo mẫu khung đang chọn
            const cfg = framesConfig[currentSelectedFrameId] || framesConfig[0];
            if (cfg && CONCEPT_HARMONY_MAP[cfg.concept]) {
                const harmony = CONCEPT_HARMONY_MAP[cfg.concept];
                currentBorderStyle = harmony.border;
                syncBorderChipsUI(currentBorderStyle, false);
                if (COLOR_THEMES[harmony.theme]) {
                    currentColorTheme = harmony.theme;
                    syncColorSwatchesUI(currentColorTheme, false);
                }
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
                        cardShowcase.classList.remove('reveal-playing', 'pulse-playing', 'slide-next', 'slide-prev');
                        void cardShowcase.offsetWidth;
                        cardShowcase.classList.add('reveal-playing');
                    }
                    // Cuộn chip mẫu đang chọn ra chính giữa thanh trượt ở Bước 3
                    const activeChip = document.querySelector('#step3-concept-chips .concept-chip.active, #step3-classic-frame-chips .concept-chip.active');
                    if (activeChip) {
                        setTimeout(() => scrollChipIntoCenter(activeChip), 80);
                    }
                });
                setTimeout(() => triggerCelebrationBurst(), 260);
            }, 820);
        };
        img.src = canvas.toDataURL('image/jpeg', 0.95);
    }, 140);
});

// ====== BẢNG ĐIỀU KHIỂN 3 TAB, VUỐT ĐỔI MẪU & CHẠM TRỰC TIẾP SỬA LỜI CHÚC TẠI BƯỚC 3 ======
function triggerCardPulse() {
    if (!cardShowcase) return;
    cardShowcase.style.transform = '';
    cardShowcase.classList.remove('reveal-playing', 'pulse-playing', 'slide-next', 'slide-prev');
    void cardShowcase.offsetWidth;
    cardShowcase.classList.add('pulse-playing');
}

// Mở Modal sửa Tiêu đề & Lời chúc kèm hiệu ứng hạt lấp lánh
function openTextEditModalWithSparkle(clientX, clientY) {
    if (typeof clientX === 'number' && typeof clientY === 'number' && clientX > 0 && clientY > 0) {
        spawnTouchSparkle(clientX, clientY, 7);
    }
    recipientInput.value = recipientName;
    recipientCount.textContent = `${recipientName.length}/45`;
    const activeText = getActiveQuoteText();
    customWishInput.value = activeText;
    wishCharCount.textContent = `${activeText.length}/160`;
    textEditModal.style.display = 'flex';
}

// Nút mũi tên Trái / Phải cạnh tấm thiệp ở Bước 3
const prevFrameBtn = document.getElementById('prev-frame-btn');
const nextFrameBtn = document.getElementById('next-frame-btn');
if (prevFrameBtn) {
    prevFrameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectFrameById(currentSelectedFrameId - 1, true, -1, true);
    });
}
if (nextFrameBtn) {
    nextFrameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectFrameById(currentSelectedFrameId + 1, true, 1, true);
    });
}

// Vuốt ngang (Swipe Left / Right) trên vùng thiệp để đổi 20 mẫu khung + Chạm trực tiếp vào vùng lời chúc để sửa chữ (không có box thừa)
const resultCanvasWrap = document.getElementById('result-canvas-wrap');
if (resultCanvasWrap && cardShowcase) {
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let isPointerTracking = false;
    let lastTouchEndTime = 0;

    resultCanvasWrap.addEventListener('touchstart', (e) => {
        if (!e.touches || e.touches.length !== 1) return;
        if (e.target.closest('.card-nav-arrow')) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
        isPointerTracking = true;
    }, { passive: true });

    resultCanvasWrap.addEventListener('touchmove', (e) => {
        if (!isPointerTracking || !e.touches || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) {
            const clampedDx = Math.max(-42, Math.min(42, dx * 0.35));
            cardShowcase.style.transform = `translate3d(${clampedDx}px, 0, 0) rotate(${clampedDx * 0.04}deg)`;
        }
    }, { passive: true });

    resultCanvasWrap.addEventListener('touchend', (e) => {
        if (!isPointerTracking || !e.changedTouches || e.changedTouches.length === 0) return;
        isPointerTracking = false;
        cardShowcase.style.transform = '';

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const dx = endX - startX;
        const dy = endY - startY;
        const elapsed = Date.now() - startTime;

        // 1. Nếu vuốt ngang đủ ngưỡng -> chuyển mẫu khung mượt mà
        if (Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(dy) * 1.15) {
            lastTouchEndTime = Date.now();
            if (dx < 0) {
                selectFrameById(currentSelectedFrameId + 1, true, 1, true);
            } else {
                selectFrameById(currentSelectedFrameId - 1, true, -1, true);
            }
            return;
        }

        // 2. Nếu là chạm nhẹ (Tap nhanh < 350ms, không di chuyển) vào phần hộp lời chúc ở dưới tấm thiệp -> mở ngay Modal sửa chữ
        if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && elapsed < 350) {
            const rect = cardShowcase.getBoundingClientRect();
            if (rect.height > 0 && endX >= rect.left && endX <= rect.right && endY >= rect.top && endY <= rect.bottom) {
                const relY = (endY - rect.top) / rect.height;
                if (relY >= 0.64) {
                    lastTouchEndTime = Date.now();
                    openTextEditModalWithSparkle(endX, endY);
                }
            }
        }
    }, { passive: true });

    // Hỗ trợ cả thao tác kéo/chạm bằng chuột trên Desktop
    let mouseDownX = 0;
    let mouseDownY = 0;
    let isMouseDown = false;

    cardShowcase.addEventListener('mousedown', (e) => {
        if (Date.now() - lastTouchEndTime < 500) return;
        mouseDownX = e.clientX;
        mouseDownY = e.clientY;
        isMouseDown = true;
    });

    window.addEventListener('mouseup', (e) => {
        if (!isMouseDown) return;
        isMouseDown = false;
        if (Date.now() - lastTouchEndTime < 500) return;

        const dx = e.clientX - mouseDownX;
        const dy = e.clientY - mouseDownY;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
            if (dx < 0) {
                selectFrameById(currentSelectedFrameId + 1, true, 1, true);
            } else {
                selectFrameById(currentSelectedFrameId - 1, true, -1, true);
            }
            return;
        }

        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
            const rect = cardShowcase.getBoundingClientRect();
            if (rect.height > 0 && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
                const relY = (e.clientY - rect.top) / rect.height;
                if (relY >= 0.64) {
                    openTextEditModalWithSparkle(e.clientX, e.clientY);
                }
            }
        }
    });
}

// Chuyển đổi giữa 3 Tab tại Bước 3 (kèm tự động cuộn chip đang active ra giữa)
document.querySelectorAll('.deck-tab').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
        const targetId = tabBtn.getAttribute('data-tab');
        document.querySelectorAll('.deck-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.deck-pane').forEach(p => p.classList.remove('active'));
        tabBtn.classList.add('active');
        const pane = document.getElementById(targetId);
        if (pane) {
            pane.classList.add('active');
            setTimeout(() => {
                pane.querySelectorAll('.concept-chip.active, .topic-chip.active, .style-chip.active, .color-swatch-btn.active').forEach(el => {
                    scrollChipIntoCenter(el);
                });
            }, 30);
        }
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
        scrollChipIntoCenter(chip);
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

document.getElementById('open-text-modal-btn').addEventListener('click', (e) => {
    openTextEditModalWithSparkle(e.clientX, e.clientY);
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

// 4. Chọn Kiểu viền lãng mạn, Tông màu nữ tính & Nút "🪄 Tự phối hợp gu"
document.querySelectorAll('#border-style-chips .style-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        const borderVal = chip.getAttribute('data-border');
        if (!borderVal) return;
        currentBorderStyle = borderVal;
        syncBorderChipsUI(borderVal, true);
        drawCanvasImageText(finalResultCanvas, true);
        triggerCardPulse();
        showCardFloatingBadge(`🌸 Khung chữ: ${chip.textContent.trim()}`);
    });
});

document.querySelectorAll('.color-swatch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const themeKey = btn.getAttribute('data-theme');
        if (!themeKey || !COLOR_THEMES[themeKey]) return;
        currentColorTheme = themeKey;
        syncColorSwatchesUI(themeKey, true);
        refreshConceptFramesForTheme();
        drawCanvasImageText(finalResultCanvas, true);
        triggerCardPulse();
        showCardFloatingBadge(`🎨 Tông màu: ${btn.textContent.trim()}`);
    });
});

// Nút "🪄 Tự phối hợp gu": Sử dụng đúng 100% mã màu ('emerald', 'blush', 'rosegold', 'lavender', 'champagne') & viền hộp chữ
const CURATED_HARMONY_SETS = [
    { border: 'sakura',  theme: 'blush',     label: '🪄 Hoa Đào & Hồng Đào' },
    { border: 'vintage', theme: 'rosegold',  label: '🪄 Hồng Pháp & Rose Gold' },
    { border: 'daisy',   theme: 'emerald',   label: '🪄 Nguyệt Quế & Ngọc Bích' },
    { border: 'hearts',  theme: 'champagne', label: '🪄 Pha Lê & Kem Vàng' },
    { border: 'ribbon',  theme: 'lavender',  label: '🪄 Ngọc Trai & Tím Thơ' },
    { border: 'sakura',  theme: 'emerald',   label: '🪄 Hoa Trà & Ngọc Bích' },
    { border: 'vintage', theme: 'champagne', label: '🪄 Hồng Pháp & Kem Vàng' },
    { border: 'ribbon',  theme: 'blush',     label: '🪄 Ngọc Trai & Hồng Đào' }
];
let harmonyIndex = 0;

const magicHarmonyBtn = document.getElementById('magic-harmony-btn');
if (magicHarmonyBtn) {
    magicHarmonyBtn.addEventListener('click', (e) => {
        // Chọn tổ hợp khác với tổ hợp hiện tại để mỗi lần bấm đều thấy sự thay đổi tức thì
        let combo = CURATED_HARMONY_SETS[harmonyIndex % CURATED_HARMONY_SETS.length];
        if (combo.border === currentBorderStyle && combo.theme === currentColorTheme) {
            harmonyIndex++;
            combo = CURATED_HARMONY_SETS[harmonyIndex % CURATED_HARMONY_SETS.length];
        }
        harmonyIndex++;

        currentBorderStyle = combo.border;
        currentColorTheme = combo.theme;

        syncBorderChipsUI(currentBorderStyle, true);
        syncColorSwatchesUI(currentColorTheme, true);
        refreshConceptFramesForTheme();

        drawCanvasImageText(finalResultCanvas, true);
        triggerCardPulse();
        showCardFloatingBadge(combo.label);

        if (cardShowcase) {
            const rect = cardShowcase.getBoundingClientRect();
            spawnTouchSparkle(
                e.clientX || (rect.left + rect.width / 2),
                e.clientY || (rect.top + rect.height * 0.78),
                8
            );
        }
    });
}

// 5. Nút "‹ Căn lại ảnh" (Quay về Bước 2 giữ nguyên ảnh & giữ nguyên câu chúc)
document.getElementById('back-step2-btn').addEventListener('click', () => {
    step3.classList.remove('active');
    step2.classList.add('active');
    requestAnimationFrame(() => {
        fitPreviewAreaToStage();
        const activeFrameEl = document.querySelector('#frame-list .frame-item.active');
        if (activeFrameEl) scrollChipIntoCenter(activeFrameEl);
    });
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
    const concept = selectedConfig.concept || 'arch';

    const targetW = 1024;
    const originH = 1526;
    const scale = targetW / 1024;
    const textSpaceHeight = Math.floor(originH * 0.35);
    const targetH = isFinal ? originH + textSpaceHeight : originH;

    const theme = COLOR_THEMES[currentColorTheme] || COLOR_THEMES.emerald;
    const ctx = targetCanvas.getContext('2d');
    targetCanvas.width = targetW;
    targetCanvas.height = targetH;

    if (concept === 'aura' || concept === 'aura_arch' || concept === 'prism') {
        // ====== NHÓM KÍNH MỜ AURA & PHA LÊ (14, 15, 16): NỀN MỜ TỪ CHÍNH ẢNH NGƯỜI DÙNG PHỦ TOÀN BỘ THIỆP ======
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

        // Đổ bóng khối kính nổi và cắt ảnh chính sắc nét bên trong cửa sổ kính
        ctx.save();
        ctx.shadowColor = 'rgba(10, 30, 24, 0.26)';
        ctx.shadowBlur = 32 * scale;
        ctx.shadowOffsetY = 12 * scale;
        ctx.beginPath();
        traceConceptPhotoWindow(ctx, concept, targetW, originH, scale);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        traceConceptPhotoWindow(ctx, concept, targetW, originH, scale);
        ctx.clip();
        if (currentSelectedFilter !== 'none') ctx.filter = currentSelectedFilter;
        ctx.drawImage(currentUserImage, 0, 0, targetW, originH);
        ctx.filter = 'none';
        ctx.restore();

        renderConceptOverlayToCtx(ctx, concept, targetW, originH, theme, false);

    } else {
        // ====== 17 MẪU KHUNG NGHỆ THUẬT CÒN LẠI ======
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

        // 2. Cắt ảnh người dùng chính xác theo cửa sổ của từng mẫu và áp bộ lọc màu
        ctx.save();
        ctx.beginPath();
        traceConceptPhotoWindow(ctx, concept, targetW, originH, scale);
        ctx.clip();
        if (currentSelectedFilter !== 'none') {
            ctx.filter = currentSelectedFilter;
        }
        ctx.drawImage(currentUserImage, 0, 0, targetW, originH);
        ctx.filter = 'none';
        ctx.restore();

        // 3. Vẽ trực tiếp lớp thiết kế Concept sắc nét lên Canvas
        renderConceptOverlayToCtx(ctx, concept, targetW, originH, theme, false);

        // 4. Đường viền mảnh bao quanh toàn bộ tấm thiệp (tạo sự liền khối từ đỉnh xuống đáy)
        if (isFinal && concept !== 'polaroid' && concept !== 'film_kodak' && concept !== 'postcard' && concept !== 'scrapbook') {
            ctx.save();
            const outerM = Math.floor(20 * scale);
            ctx.strokeStyle = theme.borderSecondary;
            ctx.lineWidth = 1.5 * scale;
            ctx.strokeRect(outerM, outerM, targetW - outerM * 2, targetH - outerM * 2);
            ctx.restore();
        }
    }

    // 4. Vẽ hộp lời chúc nghệ thuật đồng bộ với 20 mẫu khung phía trên
    const activeQuote = getActiveQuoteText();
    if (isFinal && activeQuote) {
        const marginX = Math.floor(targetW * 0.056);
        const boxX = marginX;
        const boxY = originH + Math.floor(textSpaceHeight * 0.085);
        const boxW = targetW - marginX * 2;
        const boxH = Math.floor(textSpaceHeight * 0.82);
        const radius = Math.floor(targetW * 0.034);

        // Cầu nối trang sức (Ornamental Bridge) kết nối khung ảnh phía trên với hộp lời chúc phía dưới
        drawOrnamentalBridge(ctx, targetW / 2, originH, boxY, scale, theme, concept);

        drawRomanticQuoteBox(ctx, boxX, boxY, boxW, boxH, radius, scale, theme, currentBorderStyle, concept);

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

// Cầu nối trang sức giữa khung ảnh trên và hộp lời chúc dưới
function drawOrnamentalBridge(ctx, centerX, originH, boxY, scale, theme, concept) {
    const midY = (originH + boxY) / 2;
    ctx.save();
    const lineGrad = ctx.createLinearGradient(centerX - 240 * scale, midY, centerX + 240 * scale, midY);
    lineGrad.addColorStop(0, 'rgba(255,255,255,0)');
    lineGrad.addColorStop(0.2, theme.borderSecondary);
    lineGrad.addColorStop(0.5, theme.goldAccent);
    lineGrad.addColorStop(0.8, theme.borderSecondary);
    lineGrad.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 1.8 * scale;
    ctx.beginPath();
    ctx.moveTo(centerX - 230 * scale, midY);
    ctx.lineTo(centerX - 32 * scale, midY);
    ctx.moveTo(centerX + 32 * scale, midY);
    ctx.lineTo(centerX + 230 * scale, midY);
    ctx.stroke();

    // Ngọc trai 3D hai bên cầu nối
    drawLustrousPearl(ctx, centerX - 38 * scale, midY, 5 * scale);
    drawLustrousPearl(ctx, centerX + 38 * scale, midY, 5 * scale);

    if (concept === 'aura' || concept === 'aura_arch' || concept === 'prism' || concept === 'celestial') {
        drawStarburstFlare(ctx, centerX, midY, 20 * scale, theme.goldAccent);
    } else {
        ctx.fillStyle = theme.goldAccent;
        drawFourPointStarPath(ctx, centerX, midY, 13 * scale);
        ctx.fill();
    }
    ctx.restore();
}

// ====== 5 KIỂU VIỀN HỘP LỜI CHÚC HAUTE COUTURE RÕ NÉT TRÊN MỌI MÀN HÌNH ======
function createBoxPath(ctx, x, y, w, h, r, style) {
    ctx.beginPath();
    if (style === 'vintage') {
        // Khung góc khuyết lõm quý tộc Pháp (ăn khớp với 04, 07, 09, 18)
        traceConcaveWindowPath(ctx, x, y, w, h, r * 1.05);
    } else if (style === 'hearts') {
        // Khung bát giác vát kim cương pha lê (ăn khớp với 01, 06, 14, 15, 16, 19)
        traceChamferWindowPath(ctx, x, y, w, h, r * 1.08);
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
        ctx.closePath();
    }
}

function drawRomanticQuoteBox(ctx, boxX, boxY, boxW, boxH, radius, scale, theme, style, concept) {
    ctx.save();

    const isGlassConcept = concept === 'aura' || concept === 'aura_arch' || concept === 'prism';

    ctx.shadowColor = theme.shadowRgba;
    ctx.shadowBlur = (isGlassConcept ? 32 : 26) * scale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 9 * scale;

    createBoxPath(ctx, boxX, boxY, boxW, boxH, radius, style);
    const bgGrad = ctx.createLinearGradient(0, boxY, 0, boxY + boxH);
    if (isGlassConcept) {
        bgGrad.addColorStop(0, 'rgba(255, 255, 255, 0.90)');
        bgGrad.addColorStop(1, 'rgba(255, 250, 246, 0.84)');
    } else {
        bgGrad.addColorStop(0, theme.boxFillStart);
        bgGrad.addColorStop(1, theme.boxFillEnd);
    }
    ctx.fillStyle = bgGrad;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Viền ngoài mạ vàng & màu chủ đạo sắc nét
    const borderGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
    borderGrad.addColorStop(0, theme.borderPrimary);
    borderGrad.addColorStop(0.35, theme.goldAccent);
    borderGrad.addColorStop(0.65, theme.borderPrimary);
    borderGrad.addColorStop(1, theme.goldAccent);
    ctx.lineWidth = Math.max(2.5, 3.8 * scale);
    ctx.strokeStyle = borderGrad;
    ctx.stroke();

    // Đường chỉ vàng mảnh bên trong tạo chiều sâu Haute Couture
    const inset = Math.floor(13 * scale);
    createBoxPath(ctx, boxX + inset, boxY + inset, boxW - inset * 2, boxH - inset * 2, Math.max(6, radius - inset * 0.55), style);
    ctx.lineWidth = Math.max(1.2, 1.6 * scale);
    ctx.strokeStyle = theme.goldAccent;
    ctx.stroke();

    // Dấu ngoặc kép chìm tinh tế
    ctx.save();
    ctx.font = `italic 700 ${Math.floor(96 * scale)}px "Playfair Display", serif`;
    ctx.fillStyle = theme.flowerSoft;
    ctx.globalAlpha = style === 'vintage' ? 0.2 : 0.13;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('“', boxX + 28 * scale, boxY + 12 * scale);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('”', boxX + boxW - 28 * scale, boxY + boxH - 4 * scale);
    ctx.restore();

    const midY = boxY + boxH / 2;
    const midX = boxX + boxW / 2;

    if (style === 'sakura') {
        // 🌸 Hoa Đào & Trà: Cụm Hoa Trà My đa tầng lớn & cành Anh Đào Watercolor đính góc đối xứng
        drawFineBotanicalSprig(ctx, boxX + 22 * scale, boxY + 42 * scale, 58 * scale, 0.42, 1, theme);
        drawFineBotanicalSprig(ctx, boxX + boxW - 22 * scale, boxY + boxH - 42 * scale, 58 * scale, -2.72, -1, theme);

        drawLayeredCamellia(ctx, boxX + 16 * scale, boxY + 14 * scale, 42 * scale, theme);
        drawDetailedSakuraBloom(ctx, boxX + 64 * scale, boxY + 8 * scale, 24 * scale, theme, 0.3);
        drawDetailedSakuraBloom(ctx, boxX + 10 * scale, boxY + 62 * scale, 22 * scale, theme, -0.4);

        drawLayeredCamellia(ctx, boxX + boxW - 16 * scale, boxY + boxH - 14 * scale, 42 * scale, theme);
        drawDetailedSakuraBloom(ctx, boxX + boxW - 64 * scale, boxY + boxH - 8 * scale, 24 * scale, theme, -0.3);
        drawDetailedSakuraBloom(ctx, boxX + boxW - 10 * scale, boxY + boxH - 62 * scale, 22 * scale, theme, 0.4);

        // Điểm hoa anh đào & ngọc trai hai bên hông
        drawLustrousPearl(ctx, boxX + boxW - 20 * scale, boxY + 20 * scale, 7.5 * scale);
        drawLustrousPearl(ctx, boxX + 20 * scale, boxY + boxH - 20 * scale, 7.5 * scale);
        drawDetailedSakuraBloom(ctx, boxX + 16 * scale, midY, 20 * scale, theme, 0.15);
        drawDetailedSakuraBloom(ctx, boxX + boxW - 16 * scale, midY, 20 * scale, theme, -0.15);

    } else if (style === 'ribbon') {
        // 🦪 Ngọc Trai & Nơ: Nơ lụa hoàng gia lớn đính ngọc trai ở đỉnh + chuỗi ngọc trai 3D viền quanh hộp
        drawSilkRibbonBow(ctx, midX, boxY + 2 * scale, 52 * scale, theme);
        drawLustrousPearl(ctx, midX, boxY + 4 * scale, 9.5 * scale);

        // Chuỗi ngọc trai dọc hai bên hông & 4 góc
        const pearlOffsets = [-72, -48, -24, 0, 24, 48, 72];
        pearlOffsets.forEach((off, idx) => {
            const pr = (idx === 3 ? 8.5 : (idx % 2 === 1 ? 6.5 : 5)) * scale;
            drawLustrousPearl(ctx, boxX, midY + off * scale, pr);
            drawLustrousPearl(ctx, boxX + boxW, midY + off * scale, pr);
        });

        const topPearlOffsets = [-160, -110, 110, 160];
        topPearlOffsets.forEach(off => {
            drawLustrousPearl(ctx, midX + off * scale, boxY, 5.5 * scale);
            drawLustrousPearl(ctx, midX + off * scale, boxY + boxH, 5.5 * scale);
        });

        const cPts = [
            [boxX + 22 * scale, boxY + 22 * scale],
            [boxX + boxW - 22 * scale, boxY + 22 * scale],
            [boxX + 22 * scale, boxY + boxH - 22 * scale],
            [boxX + boxW - 22 * scale, boxY + boxH - 22 * scale]
        ];
        cPts.forEach(([px, py]) => drawLustrousPearl(ctx, px, py, 7.5 * scale));

    } else if (style === 'hearts') {
        // ✨ Pha Lê & Sao: Khung bát giác vát kim cương + vương miện ánh sao 8 cánh lấp lánh
        drawStarburstFlare(ctx, midX, boxY, 32 * scale, theme.goldAccent);
        drawLustrousPearl(ctx, midX - 42 * scale, boxY, 6 * scale);
        drawLustrousPearl(ctx, midX + 42 * scale, boxY, 6 * scale);

        drawStarburstFlare(ctx, boxX + 26 * scale, boxY + 26 * scale, 24 * scale, theme.goldAccent);
        drawStarburstFlare(ctx, boxX + boxW - 26 * scale, boxY + 26 * scale, 24 * scale, theme.goldAccent);
        drawStarburstFlare(ctx, boxX + 26 * scale, boxY + boxH - 26 * scale, 24 * scale, theme.goldAccent);
        drawStarburstFlare(ctx, boxX + boxW - 26 * scale, boxY + boxH - 26 * scale, 24 * scale, theme.goldAccent);

        ctx.fillStyle = theme.goldAccent;
        drawFourPointStarPath(ctx, boxX + 18 * scale, midY, 15 * scale);
        ctx.fill();
        drawFourPointStarPath(ctx, boxX + boxW - 18 * scale, midY, 15 * scale);
        ctx.fill();
        drawFourPointStarPath(ctx, midX, boxY + boxH, 14 * scale);
        ctx.fill();

    } else if (style === 'daisy') {
        // 🌿 Nguyệt Quế & Cúc: Vòng nguyệt quế vàng, lá bạch quả Ginkgo, oải hương & Cúc Họa Mi lớn hai bên
        drawFineBotanicalSprig(ctx, boxX + 16 * scale, midY + 75 * scale, 98 * scale, -Math.PI * 0.48, 1, theme);
        drawFineBotanicalSprig(ctx, boxX + boxW - 16 * scale, midY + 75 * scale, 98 * scale, -Math.PI * 0.52, -1, theme);

        drawGinkgoLeaf(ctx, boxX + 16 * scale, boxY + 28 * scale, 34 * scale, 0.55, theme);
        drawGinkgoLeaf(ctx, boxX + boxW - 16 * scale, boxY + 28 * scale, 34 * scale, -0.55, theme);

        drawLavenderSpike(ctx, boxX + 16 * scale, boxY + boxH - 20 * scale, 68 * scale, -0.45, theme);
        drawLavenderSpike(ctx, boxX + boxW - 16 * scale, boxY + boxH - 20 * scale, 68 * scale, 0.45, theme);

        drawRichChamomileDaisy(ctx, boxX + 16 * scale, midY, 28 * scale, theme);
        drawRichChamomileDaisy(ctx, boxX + boxW - 16 * scale, midY, 28 * scale, theme);

    } else if (style === 'vintage') {
        // 🌹 Hồng Pháp: Khung góc khuyết cổ điển + Hoa Hồng Pháp Watercolor nét cọ vàng 24K cỡ lớn
        drawFineLineRoseCorner(ctx, boxX + 20 * scale, boxY + 20 * scale, 44 * scale, 0.25, theme);
        drawFineLineRoseCorner(ctx, boxX + boxW - 20 * scale, boxY + boxH - 20 * scale, 44 * scale, Math.PI + 0.25, theme);

        drawFineBotanicalSprig(ctx, boxX + boxW - 24 * scale, boxY + 24 * scale, 52 * scale, 2.35, -1, theme);
        drawFineBotanicalSprig(ctx, boxX + 24 * scale, boxY + boxH - 24 * scale, 52 * scale, -0.75, 1, theme);

        drawLustrousPearl(ctx, boxX + 16 * scale, midY, 7 * scale);
        drawLustrousPearl(ctx, boxX + boxW - 16 * scale, midY, 7 * scale);
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
