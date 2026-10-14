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
    const params = new URLSearchParams(window.location.search);
    if (params.has('card')) return; // Người nhận mở link thiệp 3D trong Telegram/Zalo sẽ vào thẳng bì thiệp, không hiện cảnh báo selfie
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

// Lớp 1: Đốm sáng Bokeh Ngọc Bích & Hoa Đào mềm mại (dùng radial gradient, không dùng shadowBlur để tránh lag)
class BokehOrb {
    constructor() {
        this.reset(true);
    }
    reset(initial = false) {
        this.x = Math.random() * bgWidth;
        this.y = initial ? Math.random() * bgHeight : bgHeight + 60;
        this.radius = Math.random() * 44 + 24;
        this.vy = -(Math.random() * 0.35 + 0.12);
        this.vx = (Math.random() - 0.5) * 0.25;
        this.phase = Math.random() * Math.PI * 2;
        this.baseAlpha = Math.random() * 0.18 + 0.10;
        const colors = ['64, 186, 146', '112, 214, 178', '154, 232, 204', '255, 198, 214', '255, 255, 255'];
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
    { concept: 'hourglass', label: '05. Vòm Lá', fullLabel: '🌿 05. Vòng Nguyệt Quế' },
    { concept: 'magazine', label: '06. Tạp Chí', fullLabel: '📖 06. Tạp Chí Vogue' },
    { concept: 'elle_minimal', label: '07. Muse Pháp', fullLabel: '🕊️ 07. Muse Paris' },
    { concept: 'runway', label: '08. Hào Quang', fullLabel: '👑 08. Ánh Hào Quang' },
    { concept: 'atelier', label: '09. Couture', fullLabel: '🏷️ 09. Nhãn Couture' },
    { concept: 'polaroid', label: '10. Polaroid', fullLabel: '📸 10. Polaroid Hàn' },
    { concept: 'film_kodak', label: '11. Anh Đào', fullLabel: '🌸 11. Cành Anh Đào' },
    { concept: 'postcard', label: '12. Bưu Thiếp', fullLabel: '💌 12. Bưu Thiếp Paris' },
    { concept: 'scrapbook', label: '13. Họa Mi', fullLabel: '🌼 13. Cúc Họa Mi' },
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
    warm: [[0, 53], [154, 163], [194, 199]],
    selflove: [[54, 63], [114, 123], [184, 193]],
    work: [[64, 73], [144, 153]],
    beauty: [[74, 83], [0, 23], [174, 183]],
    friends: [[84, 93], [134, 143], [164, 173]],
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
let currentWishMode = 'surprise'; // 'surprise' (Bất ngờ khi bấm Tạo thiệp) | 'custom' (Tự soạn / Tặng người khác)
let isCustomWishActive = false;
let customWishText = "";
let recipientName = "";
let currentBorderStyle = 'sakura';
let currentColorTheme = 'emerald';
let currentSelectedFrameId = 0;
let loadedFrameImages = [];

const FULL_CARD_ASPECT_RATIO = 1024 / 2060;
const step1 = document.getElementById('step-1');
const step2 = document.getElementById('step-2');
const step3 = document.getElementById('step-3');
const step2FullCardPreview = document.getElementById('step2-full-card-preview');
const step2WishCanvas = document.getElementById('step2-wish-canvas');
const finalResultCanvas = document.getElementById('final-result-canvas');
const finalResultImg = document.getElementById('final-result-img');
const cardShowcase = document.getElementById('card-showcase');
const frameList = document.getElementById('frame-list');
const frameOverlayEl = document.getElementById('frame-overlay');

// Tính toán kích thước khung xem trước TRỌN VẸN TẤM THIỆP (1024 x 2060) ngay tại Bước 2
function fitPreviewAreaToStage() {
    if (!step2 || !step2.classList.contains('active')) return;
    const stage = document.querySelector('.preview-stage');
    const targetBox = step2FullCardPreview || document.getElementById('preview-area-wrap');
    if (!stage || !targetBox) return;
    const availW = stage.clientWidth - 8;
    const availH = stage.clientHeight - 4;
    if (availW <= 0 || availH <= 0) return;

    const ratio = step2FullCardPreview ? FULL_CARD_ASPECT_RATIO : FRAME_ASPECT_RATIO;
    let w = availH * ratio;
    let h = availH;
    if (w > availW) {
        w = availW;
        h = availW / ratio;
    }
    targetBox.style.width = `${Math.floor(w)}px`;
    targetBox.style.height = `${Math.floor(h)}px`;
}

// Tính toán kích thước hiển thị thực tế để luôn nhìn thấy TRỌN VẸN 100% tấm thiệp ở Bước 3
function fitCardShowcaseToWrap() {
    if (!step3 || !step3.classList.contains('active')) return;
    const wrap = document.querySelector('.result-canvas-wrap');
    if (!wrap || !cardShowcase) return;
    const availW = wrap.clientWidth - 8;
    const availH = wrap.clientHeight - 6;
    if (availW <= 0 || availH <= 0) return;

    // Luôn ưu tiên tỉ lệ chuẩn của thiệp dọc (1024 / 2060) hoặc tỉ lệ ảnh thật đã tải xong;
    // TUYỆT ĐỐI không dùng kích thước mặc định 300x150 của canvas khi mở từ link người nhận!
    let cardRatio = FULL_CARD_ASPECT_RATIO;
    if (finalResultImg && finalResultImg.complete && finalResultImg.naturalWidth > 100 && finalResultImg.naturalHeight > 100) {
        cardRatio = finalResultImg.naturalWidth / finalResultImg.naturalHeight;
    } else if (finalResultCanvas && finalResultCanvas.width >= 500 && finalResultCanvas.height >= 500) {
        cardRatio = finalResultCanvas.width / finalResultCanvas.height;
    }

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
    const safeTheme = (theme && typeof theme === 'object') ? theme : (COLOR_THEMES[currentColorTheme] || COLOR_THEMES.emerald);
    ctx.save();
    ctx.fillStyle = '#fff9f5';
    ctx.strokeStyle = safeTheme.borderSecondary || '#e8d089';
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
    const safeTheme = (theme && typeof theme === 'object') ? theme : (COLOR_THEMES[currentColorTheme] || COLOR_THEMES.emerald);
    const col = (typeof theme === 'string') ? theme : (colorOverride || safeTheme.goldAccent || '#e2b049');
    ctx.save();
    ctx.translate(cx, cy);
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

const TOPIC_LABELS_MAP = {
    all: 'Ngẫu nhiên mọi chủ đề',
    warm: 'Ấm áp yêu thương',
    beauty: 'Xinh đẹp rạng ngời',
    selflove: 'Yêu thương bản thân',
    work: 'Thành công rực rỡ',
    fun: 'Vui nhộn đáng yêu',
    friends: 'Tình bạn gắn kết',
    family: 'Gia đình hạnh phúc',
    autumn: 'Mùa thu dịu dàng'
};

let floatingBadgeTimer = null;

function showCardFloatingBadge(text) {
    if (!step3 || !step3.classList.contains('active')) return;
    const badge = document.getElementById('step3-floating-badge');
    if (!badge) return;
    badge.textContent = text;
    badge.classList.add('visible');
    if (floatingBadgeTimer) clearTimeout(floatingBadgeTimer);
    floatingBadgeTimer = setTimeout(() => {
        badge.classList.remove('visible');
    }, 1600);
}

// Cuộn mượt phần tử đang chọn ra chính giữa thanh trượt ngang (không bao giờ làm giật trang)
function scrollChipIntoCenter(el) {
    if (!el) return;
    const scroller = el.closest('.frame-carousel, .filter-carousel, .concept-chips, .topic-chips, .style-chips, .color-swatches, .recipient-preset-chips');
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

// Vẽ nội dung Phong Ấn Bất Ngờ (khi người dùng chọn chế độ "🌸 Câu chúc ngẫu nhiên" hoặc "✨ Lời chúc dành cho bạn") - Chữ to rõ, cân đối trên cả điện thoại và máy tính
function drawMysterySurpriseContent(ctx, boxX, boxY, boxW, boxH, theme, scale) {
    const centerX = boxX + boxW / 2;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 1. Dòng tiêu đề trên cùng lớn rõ
    const topTitle = window.isSelfOracleMode
        ? '✨ Dành Cho Bạn ✨'
        : ((recipientName || '').trim() || '🌸 Câu Chúc Ngẫu Nhiên 🌸');
    const titleFontPx = Math.floor(68 * scale);
    ctx.font = recipientFont(titleFontPx);
    ctx.fillStyle = theme.recipientColor;
    ctx.shadowColor = theme.shadowRgba;
    ctx.shadowBlur = Math.floor(10 * scale);
    ctx.fillText(topTitle, centerX, boxY + boxH * 0.22, boxW * 0.92);

    // 2. Đường kẻ kim cương ánh vàng ở giữa
    const divY = boxY + boxH * 0.38;
    const divW = Math.min(boxW * 0.56, 360 * scale);
    const divGrad = ctx.createLinearGradient(centerX - divW / 2, divY, centerX + divW / 2, divY);
    divGrad.addColorStop(0, 'rgba(0,0,0,0)');
    divGrad.addColorStop(0.5, theme.goldAccent);
    divGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 2.4 * scale;
    ctx.beginPath();
    ctx.moveTo(centerX - divW / 2, divY);
    ctx.lineTo(centerX + divW / 2, divY);
    ctx.stroke();

    ctx.fillStyle = theme.goldAccent;
    drawFourPointStarPath(ctx, centerX, divY, 9.5 * scale);
    ctx.fill();

    // 3. Dòng thông điệp bí mật ở trung tâm hộp chữ: "Lời chúc bất ngờ nhân dịp 20.10 từ BTLMVN"
    const surpriseLine = 'Lời chúc bất ngờ nhân dịp 20.10 từ BTLMVN';
    let bodyFontPx = Math.floor(52 * scale);
    ctx.font = quoteFont(bodyFontPx);
    while (bodyFontPx > Math.floor(38 * scale) && ctx.measureText(surpriseLine).width > boxW * 0.92) {
        bodyFontPx -= 1;
        ctx.font = quoteFont(bodyFontPx);
    }
    const textGrad = ctx.createLinearGradient(0, boxY + boxH * 0.46, 0, boxY + boxH * 0.74);
    textGrad.addColorStop(0, theme.textTop);
    textGrad.addColorStop(0.5, theme.textMid);
    textGrad.addColorStop(1, theme.textBottom);
    ctx.fillStyle = textGrad;

    ctx.fillText(surpriseLine, centerX, boxY + boxH * 0.60, boxW * 0.92);

    // 4. Dòng ghi chú phía dưới to rõ, dễ đọc
    const bottomHint = window.isSelfOracleMode
        ? '✦ Căn ảnh & chỉnh màu rồi bấm Nhận lời chúc ✦'
        : `✦ Chủ đề: ${TOPIC_LABELS_MAP[currentTopic] || 'Ngẫu nhiên'}  •  Chạm để tự viết ✦`;
    ctx.font = `700 ${Math.floor(35 * scale)}px "Montserrat", sans-serif`;
    ctx.fillStyle = theme.borderPrimary;
    ctx.globalAlpha = 0.95;
    ctx.fillText(bottomHint, centerX, boxY + boxH * 0.85, boxW * 0.92);

    ctx.restore();
}

// Vẽ trực tiếp phần Hộp Lời Chúc (1024 x 534) ngay dưới khung ảnh ở Bước 2 (Tốc độ < 2ms, chuẩn tỷ lệ 100%)
function renderStep2WishPreview() {
    if (!step2WishCanvas) return;
    const targetW = 1024;
    const originH = 1526;
    const textSpaceHeight = Math.floor(originH * 0.35); // 534
    const scale = 1;

    if (step2WishCanvas.width !== targetW) step2WishCanvas.width = targetW;
    if (step2WishCanvas.height !== textSpaceHeight) step2WishCanvas.height = textSpaceHeight;

    const selectedConfig = framesConfig[currentSelectedFrameId] || framesConfig[0];
    const concept = selectedConfig.concept || 'arch';
    const theme = COLOR_THEMES[currentColorTheme] || COLOR_THEMES.emerald;

    const ctx = step2WishCanvas.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, targetW, textSpaceHeight);

    // Dịch hệ trục tọa độ lên -originH để tái sử dụng chính xác 100% các hàm vẽ hộp lời chúc của Bước 3
    ctx.translate(0, -originH);

    const targetH = originH + textSpaceHeight;
    const fullGrad = ctx.createLinearGradient(0, 0, 0, targetH);
    fullGrad.addColorStop(0, theme.canvasBgStart);
    fullGrad.addColorStop(0.5, theme.canvasBgMid);
    fullGrad.addColorStop(1, theme.canvasBgEnd);
    ctx.fillStyle = fullGrad;
    ctx.fillRect(0, originH, targetW, textSpaceHeight);

    drawBottomAmbientDecor(ctx, targetW, originH, textSpaceHeight, scale, theme);

    if (concept !== 'polaroid' && concept !== 'film_kodak' && concept !== 'postcard' && concept !== 'scrapbook') {
        ctx.save();
        const outerM = Math.floor(20 * scale);
        ctx.strokeStyle = theme.borderSecondary;
        ctx.lineWidth = 1.5 * scale;
        ctx.strokeRect(outerM, outerM, targetW - outerM * 2, targetH - outerM * 2);
        ctx.restore();
    }

    const marginX = Math.floor(targetW * 0.056);
    const boxX = marginX;
    const boxY = originH + Math.floor(textSpaceHeight * 0.085);
    const boxW = targetW - marginX * 2;
    const boxH = Math.floor(textSpaceHeight * 0.82);
    const radius = Math.floor(targetW * 0.034);

    drawOrnamentalBridge(ctx, targetW / 2, originH, boxY, scale, theme, concept);
    drawRomanticQuoteBox(ctx, boxX, boxY, boxW, boxH, radius, scale, theme, currentBorderStyle, concept);

    if (currentWishMode === 'surprise') {
        drawMysterySurpriseContent(ctx, boxX, boxY, boxW, boxH, theme, scale);
    } else {
        if (!currentAIQuote && !customWishText) {
            currentAIQuote = getNextQuoteByTopic(currentTopic);
        }
        const activeQuote = getActiveQuoteText();
        const recipientLine = formatRecipientLine(recipientName);
        const layout = fitQuoteInBox(ctx, activeQuote, recipientLine, boxW, boxH, scale, currentBorderStyle);
        drawQuoteContent(ctx, boxX, boxY, boxW, boxH, layout, theme, scale);
    }

    ctx.restore();
}

// Chuyển đổi rõ ràng giữa 2 chế độ: (1) "surprise" (Nhận bất ngờ khi bấm Tạo thiệp) vs (2) "custom" (Tự sửa / Tặng người khác)
function setWishMode(mode, shouldPulse = true) {
    currentWishMode = (mode === 'custom') ? 'custom' : 'surprise';

    const surpriseBtn = document.getElementById('wish-mode-surprise-btn');
    const customBtn = document.getElementById('wish-mode-custom-btn');
    const surpriseSubrow = document.getElementById('wish-surprise-subrow');
    const customSubrow = document.getElementById('wish-custom-subrow');
    const createBtnSub = document.getElementById('create-btn-sub');

    if (surpriseBtn) surpriseBtn.classList.toggle('active', currentWishMode === 'surprise');
    if (customBtn) customBtn.classList.toggle('active', currentWishMode === 'custom');

    if (surpriseSubrow) {
        surpriseSubrow.style.display = currentWishMode === 'surprise' ? '' : 'none';
    }
    if (customSubrow) {
        customSubrow.style.display = currentWishMode === 'custom' ? 'grid' : 'none';
    }
    if (createBtnSub) {
        createBtnSub.textContent = currentWishMode === 'surprise'
            ? '(Mở lời chúc bất ngờ 🌸)'
            : '(Hoàn tất thiệp của bạn ✨)';
    }

    if (currentWishMode === 'custom' && !currentAIQuote && !customWishText) {
        currentAIQuote = getNextQuoteByTopic(currentTopic);
    }

    renderStep2WishPreview();
    if (shouldPulse) {
        triggerCardPulse();
    }
}

// Chuyển trang Lưới khung ảnh (Trang 1: Mẫu 01-10 | Trang 2: Mẫu 11-20)
function setFrameGridPage(page) {
    const pageNum = Number(page) === 2 ? 2 : 1;
    const grid1 = document.getElementById('step3-concept-chips');
    const grid2 = document.getElementById('step3-classic-frame-chips');
    if (grid1) grid1.style.display = pageNum === 1 ? 'grid' : 'none';
    if (grid2) grid2.style.display = pageNum === 2 ? 'grid' : 'none';

    document.querySelectorAll('.frame-page-btn').forEach(btn => {
        btn.classList.toggle('active', Number(btn.getAttribute('data-frame-page')) === pageNum);
    });
}

function selectFrameById(frameId, shouldAnimate = false, slideDir = 0, autoHarmonize = true) {
    const total = framesConfig.length;
    currentSelectedFrameId = ((frameId % total) + total) % total;
    const cfg = framesConfig[currentSelectedFrameId] || framesConfig[0];

    // Tự động lật đúng trang lưới khung (01-10 hoặc 11-20) chứa mẫu đang chọn
    setFrameGridPage(currentSelectedFrameId < 10 ? 1 : 2);

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
    });

    document.querySelectorAll('#step3-concept-chips .concept-chip, #step3-classic-frame-chips .concept-chip').forEach(btn => {
        const id = Number(btn.getAttribute('data-frame-id'));
        const isActive = id === currentSelectedFrameId;
        btn.classList.toggle('active', isActive);
    });

    updateFrameOverlay();
    renderStep2WishPreview();

    if (step3 && step3.classList.contains('active') && currentUserImage) {
        drawCanvasImageText(finalResultCanvas, true);
    }

    if (shouldAnimate) {
        const targetStage = (step3 && step3.classList.contains('active')) ? cardShowcase : step2FullCardPreview;
        if (slideDir !== 0 && targetStage) {
            targetStage.style.transform = '';
            targetStage.classList.remove('reveal-playing', 'pulse-playing', 'slide-next', 'slide-prev');
            void targetStage.offsetWidth;
            targetStage.classList.add(slideDir > 0 ? 'slide-next' : 'slide-prev');
        } else {
            triggerCardPulse();
        }
    }
}

function renderFrameList() {
    if (frameList) frameList.innerHTML = '';
    const row1Chips = document.getElementById('step3-concept-chips');
    const row2Chips = document.getElementById('step3-classic-frame-chips');
    if (row1Chips) row1Chips.innerHTML = '';
    if (row2Chips) row2Chips.innerHTML = '';

    framesConfig.forEach((f, i) => {
        if (frameList) {
            const div = document.createElement('div');
            div.className = `frame-item is-concept ${i === currentSelectedFrameId ? 'active' : ''}`;
            div.innerHTML = `
                <div class="frame-thumb-box" data-frame-thumb="${i}" style="width:100%; height:44px; background: url('${f.thumbPath}') center/contain no-repeat; margin-bottom:3px;"></div>
                <span>${f.label}</span>
            `;
            div.onclick = () => selectFrameById(i, true, 0, true);
            frameList.appendChild(div);
        }

        // Chia 20 mẫu vào 2 trang Lưới 5x2 (Trang 1: 01-10, Trang 2: 11-20) để bấm chọn trực tiếp không cần kéo ngang
        const targetRow = i < 10 ? row1Chips : row2Chips;
        if (targetRow) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `concept-chip ${i === currentSelectedFrameId ? 'active' : ''}`;
            btn.setAttribute('data-frame-id', String(i));
            const numStr = String(i + 1).padStart(2, '0');
            const shortName = f.label.replace(/^\d+\.\s*/, '');
            btn.innerHTML = `<span class="chip-idx">Mẫu ${numStr}</span><span class="chip-txt">${shortName}</span>`;
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
let currentFilterIntensity = 100;

function getEffectiveFilterCss(rawFilter = currentSelectedFilter, intensityPct = currentFilterIntensity) {
    if (!rawFilter || rawFilter === 'none') return 'none';
    const pct = Math.max(0, Math.min(100, Number(intensityPct)));
    if (pct <= 0) return 'none';
    if (pct >= 99.9) return rawFilter;
    const t = pct / 100;
    return rawFilter.replace(/(brightness|contrast|saturate|sepia|hue-rotate)\(([-+]?\d*\.?\d+)(deg)?\)/g, (_, fn, numStr, unit) => {
        const val = parseFloat(numStr);
        if (Number.isNaN(val)) return `${fn}(${numStr}${unit || ''})`;
        if (fn === 'brightness' || fn === 'contrast' || fn === 'saturate') {
            const interp = 1 + (val - 1) * t;
            return `${fn}(${interp.toFixed(3)})`;
        }
        if (fn === 'sepia') {
            const interp = val * t;
            return `${fn}(${interp.toFixed(3)})`;
        }
        if (fn === 'hue-rotate') {
            const interp = val * t;
            return `${fn}(${interp.toFixed(2)}${unit || 'deg'})`;
        }
        return `${fn}(${numStr}${unit || ''})`;
    });
}

function syncFilterIntensityUI() {
    const slider = document.getElementById('filter-intensity-slider');
    const valLabel = document.getElementById('filter-intensity-value');
    const row = document.getElementById('filter-intensity-row');
    const isNone = !currentSelectedFilter || currentSelectedFilter === 'none';
    const displayPct = isNone ? 0 : Math.round(Math.max(0, Math.min(100, currentFilterIntensity)));

    if (slider) {
        slider.value = String(displayPct);
        slider.style.background = `linear-gradient(90deg, #0f7b5f 0%, #d4af37 ${displayPct}%, #dbece5 ${displayPct}%, #dbece5 100%)`;
    }
    if (valLabel) {
        valLabel.textContent = isNone ? 'Gốc' : `${displayPct}%`;
    }
    if (row) {
        row.classList.toggle('is-disabled', isNone);
    }
}

function applyFilterToPreview() {
    const effectiveCss = getEffectiveFilterCss();
    const previewImgs = document.querySelectorAll('.cropper-canvas img, .cropper-view-box img');
    previewImgs.forEach(img => {
        img.style.filter = effectiveCss;
    });
    syncFilterIntensityUI();
}

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetBtn = e.currentTarget;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        targetBtn.classList.add('active');
        currentSelectedFilter = targetBtn.getAttribute('data-filter') || 'none';
        if (currentSelectedFilter !== 'none' && currentFilterIntensity <= 5) {
            currentFilterIntensity = 100;
        }
        applyFilterToPreview();
        scrollChipIntoCenter(targetBtn);
    });
});

document.getElementById('filter-intensity-slider')?.addEventListener('input', (e) => {
    const nextVal = Math.max(0, Math.min(100, Number(e.target.value)));
    currentFilterIntensity = nextVal;
    // Nếu đang ở "✨ Gốc" mà người dùng kéo thanh mức độ filter -> Tự động kích hoạt bộ lọc "🌸 Hồng đào" để thấy hiệu ứng ngay lập tức
    if ((!currentSelectedFilter || currentSelectedFilter === 'none') && nextVal > 0) {
        const firstColorFilterBtn = document.querySelector('#filter-list .filter-btn:not([data-filter="none"])');
        if (firstColorFilterBtn) {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            firstColorFilterBtn.classList.add('active');
            currentSelectedFilter = firstColorFilterBtn.getAttribute('data-filter') || 'none';
        }
    }
    applyFilterToPreview();
});

function handleFlipHorizontal() {
    if (!cropperObj) return;
    currentScaleX = -currentScaleX;
    cropperObj.scaleX(currentScaleX);
}

function handleRotate90() {
    if (!cropperObj) return;
    cropperObj.rotate(90);
    const cont = cropperObj.getContainerData();
    cropperObj.setCropBoxData({ left: 0, top: 0, width: cont.width, height: cont.height });
}

document.getElementById('flip-h-btn')?.addEventListener('click', handleFlipHorizontal);
document.getElementById('flip-h-btn-2')?.addEventListener('click', handleFlipHorizontal);
document.getElementById('rotate-btn')?.addEventListener('click', handleRotate90);
document.getElementById('rotate-btn-2')?.addEventListener('click', handleRotate90);

document.getElementById('reset-crop-btn')?.addEventListener('click', () => {
    if (!cropperObj) return;
    currentScaleX = 1;
    cropperObj.reset();
    const cont = cropperObj.getContainerData();
    cropperObj.setCropBoxData({ left: 0, top: 0, width: cont.width, height: cont.height });
    showCardFloatingBadge('🎯 Đã căn giữa lại ảnh');
});

// Tự động cắt & căn chỉnh ảnh chân dung chuẩn tỷ lệ 1024x1526 (ưu tiên phần đầu & khuôn mặt ở 36% từ đỉnh) cho chế độ "Lời chúc dành cho bạn"
function createAutoCroppedPortraitCanvas(rawImg, targetW = 1024, targetH = 1526) {
    const c = document.createElement('canvas');
    c.width = targetW;
    c.height = targetH;
    const ctx = c.getContext('2d');
    const sw = rawImg.naturalWidth || rawImg.width || targetW;
    const sh = rawImg.naturalHeight || rawImg.height || targetH;
    const targetRatio = targetW / targetH;
    const srcRatio = sw / sh;

    let cropW = sw;
    let cropH = sh;
    let sx = 0;
    let sy = 0;

    if (srcRatio > targetRatio) {
        cropW = sh * targetRatio;
        sx = (sw - cropW) * 0.5;
    } else {
        cropH = sw / targetRatio;
        sy = (sh - cropH) * 0.34;
    }

    ctx.drawImage(rawImg, sx, sy, cropW, cropH, 0, 0, targetW, targetH);
    return c;
}

// Tạo huy chương tròn chứa ảnh chân dung người dùng (đã áp đúng Filter & Mức độ Filter đã chọn) để gắn trong Lõi Sao Băng
function buildSkyOracleUserThumbCanvas(rawImg) {
    const size = 220;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    const sw = rawImg.naturalWidth || rawImg.width || size;
    const sh = rawImg.naturalHeight || rawImg.height || size;
    const s = Math.min(sw, sh);
    const sx = (sw - s) * 0.5;
    const sy = (sh - s) * 0.32;
    const effFilter = getEffectiveFilterCss();

    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (effFilter !== 'none') ctx.filter = effFilter;
    ctx.drawImage(rawImg, sx, sy, s, s, 0, 0, size, size);
    ctx.filter = 'none';
    ctx.restore();
    return c;
}

// Tạo Bức Ảnh Chân Dung Chữ Nhật Bo Góc Vàng 24K (240x358) từ ảnh đã căn chỉnh & áp Filter của người dùng
// để trình diễn liền mạch quá trình: Bức Ảnh Chữ Nhật -> Cuộn Hoá Thành Lõi Sao Băng -> Mở Ra Thành Tấm Thiệp Trong Bì Thư!
function buildSkyOracleUserCardPhotoCanvas(rawImg) {
    const w = 240;
    const h = 358;
    const r = 20;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    const effFilter = getEffectiveFilterCss();

    ctx.save();
    traceRoundedWindowPath(ctx, 4, 4, w - 8, h - 8, r);
    ctx.clip();
    if (effFilter !== 'none') ctx.filter = effFilter;
    ctx.drawImage(rawImg, 0, 0, rawImg.width || w, rawImg.height || h, 4, 4, w - 8, h - 8);
    ctx.filter = 'none';
    ctx.restore();

    // Viền Vàng Hoàng Kim 24K bao quanh bức ảnh
    ctx.save();
    const borderGrad = ctx.createLinearGradient(0, 0, w, h);
    borderGrad.addColorStop(0, '#fff4b8');
    borderGrad.addColorStop(0.5, '#d4af37');
    borderGrad.addColorStop(1, '#fff3b0');
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 4.5;
    traceRoundedWindowPath(ctx, 4, 4, w - 8, h - 8, r);
    ctx.stroke();
    ctx.restore();
    return c;
}

window.isSelfOracleMode = false;
window.skyOracleUserThumbCanvas = null;
window.skyOracleUserCardPhotoCanvas = null;
let cachedSelfOracleCommonOverlayUrl = '';

// Tạo Khuôn Chung Của Thiệp (Universal Common Card Frame Overlay 1024 x 1526) cho chế độ "Lời chúc dành cho bạn":
// Hiển thị đúng vùng cửa sổ ảnh chuẩn của cả 20 mẫu khung (winX = 68, winY = 58, winW = 888, winH = 1410) kèm viền chỉ vàng 24K & đường căn vòm thanh lịch mà không tiết lộ trước khung ngẫu nhiên nào sẽ được chọn!
function buildSelfOracleCommonFrameOverlayDataUrl() {
    if (cachedSelfOracleCommonOverlayUrl) return cachedSelfOracleCommonOverlayUrl;
    const W = 1024;
    const H = 1526;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');

    const winX = 68;
    const winY = 58;
    const winW = W - winX * 2; // 888
    const winH = H - winY * 2; // 1410
    const r = 46;

    // 1. Nền lụa ngọc trai sang trọng bao ngoài cửa sổ ảnh chung
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    traceRoundedWindowPath(ctx, winX, winY, winW, winH, r);
    ctx.fillStyle = '#f8f5ef';
    ctx.fill('evenodd');

    const matteGrad = ctx.createLinearGradient(0, 0, W, H);
    matteGrad.addColorStop(0, 'rgba(232, 246, 239, 0.92)');
    matteGrad.addColorStop(0.5, 'rgba(255, 250, 243, 0.95)');
    matteGrad.addColorStop(1, 'rgba(235, 245, 240, 0.92)');
    ctx.fillStyle = matteGrad;
    ctx.fill('evenodd');
    ctx.restore();

    // 2. Bóng đổ chiều sâu mềm mại vào mép trong cửa sổ ảnh
    ctx.save();
    ctx.beginPath();
    traceRoundedWindowPath(ctx, winX, winY, winW, winH, r);
    ctx.clip();
    ctx.strokeStyle = 'rgba(10, 56, 40, 0.22)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    traceRoundedWindowPath(ctx, winX - 3, winY - 3, winW + 6, winH + 6, r + 3);
    ctx.stroke();

    // Đường vòm gợi ý mảnh ánh kim bên trong cửa sổ giúp người dùng căn gương mặt ở vị trí đẹp nhất cho cả khung chữ nhật lẫn khung vòm/oval
    ctx.save();
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = 'rgba(246, 211, 101, 0.48)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    const archR = winW * 0.46;
    ctx.arc(W / 2, winY + archR + 28, archR, Math.PI, 0, false);
    ctx.stroke();
    ctx.restore();
    ctx.restore();

    // 3. Viền Kép Vàng Kim 24K & Ngọc Bích quanh cửa sổ khuôn chung
    const goldGrad = ctx.createLinearGradient(winX, winY, winX + winW, winY + winH);
    goldGrad.addColorStop(0, '#d4af37');
    goldGrad.addColorStop(0.28, '#fff3b8');
    goldGrad.addColorStop(0.55, '#c59227');
    goldGrad.addColorStop(0.82, '#fff1b0');
    goldGrad.addColorStop(1, '#b8861b');

    ctx.save();
    ctx.strokeStyle = goldGrad;
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    traceRoundedWindowPath(ctx, winX, winY, winW, winH, r);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(15, 123, 95, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    traceRoundedWindowPath(ctx, winX - 11, winY - 11, winW + 22, winH + 22, r + 8);
    ctx.stroke();

    // 4. Hoa văn sao 4 cánh ánh vàng ở 4 góc & đỉnh khuôn chung
    ctx.fillStyle = '#d4af37';
    drawFourPointStarPath(ctx, W / 2, winY, 15);
    ctx.fill();
    drawFourPointStarPath(ctx, W / 2, winY + winH, 13);
    ctx.fill();
    drawFourPointStarPath(ctx, winX + 18, winY + 18, 11);
    ctx.fill();
    drawFourPointStarPath(ctx, winX + winW - 18, winY + 18, 11);
    ctx.fill();
    drawFourPointStarPath(ctx, winX + 18, winY + winH - 18, 11);
    ctx.fill();
    drawFourPointStarPath(ctx, winX + winW - 18, winY + winH - 18, 11);
    ctx.fill();
    ctx.restore();

    cachedSelfOracleCommonOverlayUrl = c.toDataURL('image/png');
    return cachedSelfOracleCommonOverlayUrl;
}

// Hàm bốc thăm ngẫu nhiên Khung + Viền + Tông màu + Lời chúc + Hiệu ứng mở 3D cho luồng "Lời chúc dành cho bạn"
// (GIỮ NGUYÊN 100% Filter màu & Mức độ Filter mà người dùng đã tự chọn!)
function applyRandomSelfOracleArtSelections() {
    currentSelectedFrameId = Math.floor(Math.random() * framesConfig.length);
    const cfg = framesConfig[currentSelectedFrameId] || framesConfig[0];

    const themeKeys = ['emerald', 'blush', 'rosegold', 'lavender', 'champagne'];
    const borderKeys = ['sakura', 'ribbon', 'hearts', 'daisy', 'vintage'];
    const motionKeys = ['bloom', 'butterflies', 'ribbon', 'galaxy', 'sakura', 'hearts'];

    if (cfg && CONCEPT_HARMONY_MAP[cfg.concept] && Math.random() < 0.65) {
        const harmony = CONCEPT_HARMONY_MAP[cfg.concept];
        currentBorderStyle = harmony.border;
        currentColorTheme = harmony.theme;
    } else {
        currentBorderStyle = borderKeys[Math.floor(Math.random() * borderKeys.length)];
        currentColorTheme = themeKeys[Math.floor(Math.random() * themeKeys.length)];
    }

    const randomMotion = motionKeys[Math.floor(Math.random() * motionKeys.length)];
    window.currentMotionEffect = randomMotion;

    isCustomWishActive = false;
    customWishText = '';
    recipientName = '';
    currentTopic = 'all';
    currentAIQuote = getNextQuoteByTopic('all');
    hasGeneratedQuoteOnce = true;
    customLinkTitle = '🌸 Lời chúc 20.10 dành cho bạn ✨';
    const titleInp = document.getElementById('custom-link-title-input');
    const titleCnt = document.getElementById('link-title-char-count');
    if (titleInp) titleInp.value = customLinkTitle;
    if (titleCnt) titleCnt.textContent = `${customLinkTitle.length}/70`;

    syncBorderChipsUI(currentBorderStyle, false);
    syncColorSwatchesUI(currentColorTheme, false);
    refreshConceptFramesForTheme();
    return randomMotion;
}

async function handleImageInput(e) {
    const file = e.target.files[0];
    if (!file) return;

    currentScaleX = 1;
    hasGeneratedQuoteOnce = false;

    // Cả 2 nhánh ("Lời chúc dành cho bạn" và "Soạn lời chúc cho người thân") đều vào Bước 2 để người dùng tự tay căn góc ảnh + chỉnh Filter theo khuôn chung của thiệp!
    window.isSelfOracleMode = (window.selectedCreationFlow === 'self');
    document.body.classList.toggle('self-oracle-mode', window.isSelfOracleMode);

    const headerTitleEl = document.querySelector('#step-2 .step2-header-title');
    const generateBtnEl = document.getElementById('generate-final-btn');

    if (window.isSelfOracleMode) {
        if (headerTitleEl) headerTitleEl.textContent = '✨ Căn Chỉnh Ảnh 🌸';
        if (generateBtnEl) generateBtnEl.textContent = 'Nhận lời chúc';
        currentWishMode = 'surprise';
        currentBorderStyle = 'sakura';
        currentColorTheme = 'emerald';
        syncFilterIntensityUI();
    } else {
        if (headerTitleEl) headerTitleEl.textContent = '✨ Thiết Kế Thiệp 🌸';
        if (generateBtnEl) generateBtnEl.textContent = 'Tạo thiệp';
        syncFilterIntensityUI();
        // Đồng bộ viền & màu sắc theo khung hiện tại ngay khi vào Xưởng Thiết Kế Bước 2
        const cfg = framesConfig[currentSelectedFrameId] || framesConfig[0];
        if (cfg && CONCEPT_HARMONY_MAP[cfg.concept]) {
            const harmony = CONCEPT_HARMONY_MAP[cfg.concept];
            currentBorderStyle = harmony.border;
            currentColorTheme = harmony.theme;
            syncBorderChipsUI(currentBorderStyle, false);
            syncColorSwatchesUI(currentColorTheme, false);
        }
    }

    // Giữ Bước 1 hiển thị ổn định trong ~35ms lúc Bước 2 dựng ngầm Cropper + Canvas phía dưới (không bao giờ chớp màn hình)
    step2.classList.remove('step2-morph-from', 'step2-morph-to', 'step2-morph-active', 'step2-ui-hidden', 'step2-ui-revealing');
    step2.classList.add('active', 'step2-preloading');

    if (originalImgSrc && originalImgSrc.startsWith('blob:')) {
        URL.revokeObjectURL(originalImgSrc);
    }
    originalImgSrc = URL.createObjectURL(file);

    fitPreviewAreaToStage();
    renderStep2WishPreview();
    initCropper();
    initScrollHints();

    const activeChip = document.querySelector('#step3-concept-chips .concept-chip.active, #step3-classic-frame-chips .concept-chip.active');
    if (activeChip) scrollChipIntoCenter(activeChip);
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
            if (hint) {
                hint.classList.remove('hidden');
                const hideHint = () => hint.classList.add('hidden');
                const previewArea = document.getElementById('preview-area-wrap');
                if (previewArea) {
                    previewArea.addEventListener('touchstart', hideHint, { once: true, passive: true });
                    previewArea.addEventListener('mousedown', hideHint, { once: true });
                }
            }

            if (typeof window.onStep2CropperReadyForMorph === 'function') {
                window.onStep2CropperReadyForMorph();
            } else {
                step1.classList.remove('active');
                step2.classList.remove('step2-preloading');
            }
        }
    });
}

// Cập nhật trực tiếp lớp ảnh khung nằm phủ trên #preview-area-wrap (không bị Cropper cắt lẹm)
function updateFrameOverlay() {
    if (!frameOverlayEl) return;
    try {
        if (window.isSelfOracleMode) {
            frameOverlayEl.src = buildSelfOracleCommonFrameOverlayDataUrl();
            return;
        }
        const cfg = framesConfig[currentSelectedFrameId] || framesConfig[0];
        if (cfg) {
            frameOverlayEl.src = getFullConceptOverlayDataUrl(cfg.concept);
        }
    } catch (_) {}
}

document.getElementById('upload-btn').addEventListener('change', handleImageInput);
document.getElementById('selfie-btn').addEventListener('change', handleImageInput);

document.getElementById('cancel-btn').addEventListener('click', () => {
    document.body.classList.remove('self-oracle-mode');
    step2.classList.remove('active', 'step2-preloading', 'step2-morph-from', 'step2-morph-to');
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

// Khởi tạo các hạt đom đóm vàng & cánh hoa lụa bay quanh thiệp ở Sân khấu Bước 3
function initShowcaseAmbientOrbs() {
    const container = document.getElementById('showcase-ambient-orbs');
    if (!container || container.children.length > 0) return;

    const orbs = [
        { x: '6%',  y: '14%', s: '15px', c: '#f6d365', sym: '✦', dur: '4.2s', del: '0s',   dx: '10px',  dy: '-18px' },
        { x: '91%', y: '18%', s: '14px', c: '#f48fb1', sym: '🌸', dur: '5.1s', del: '0.6s', dx: '-12px', dy: '-22px' },
        { x: '5%',  y: '46%', s: '12px', c: '#ffe89e', sym: '•',  dur: '3.8s', del: '1.1s', dx: '14px',  dy: '-16px' },
        { x: '93%', y: '48%', s: '16px', c: '#f6d365', sym: '✦', dur: '4.6s', del: '0.3s', dx: '-10px', dy: '-20px' },
        { x: '8%',  y: '78%', s: '14px', c: '#f48fb1', sym: '✿', dur: '5.4s', del: '1.5s', dx: '12px',  dy: '-24px' },
        { x: '90%', y: '82%', s: '15px', c: '#ffe89e', sym: '✦', dur: '4.0s', del: '0.9s', dx: '-14px', dy: '-18px' },
        { x: '16%', y: '6%',  s: '13px', c: '#f6d365', sym: '•',  dur: '4.8s', del: '1.8s', dx: '8px',   dy: '14px'  },
        { x: '84%', y: '7%',  s: '14px', c: '#f48fb1', sym: '🌸', dur: '5.2s', del: '0.4s', dx: '-9px',  dy: '16px'  },
        { x: '14%', y: '92%', s: '13px', c: '#f6d365', sym: '✦', dur: '4.4s', del: '2.1s', dx: '11px',  dy: '-15px' },
        { x: '85%', y: '93%', s: '13px', c: '#f48fb1', sym: '✿', dur: '4.9s', del: '1.2s', dx: '-11px', dy: '-16px' }
    ];

    orbs.forEach(o => {
        const span = document.createElement('span');
        span.className = 'showcase-orb';
        span.textContent = o.sym;
        span.style.setProperty('--ox', o.x);
        span.style.setProperty('--oy', o.y);
        span.style.setProperty('--osize', o.s);
        span.style.setProperty('--ocolor', o.c);
        span.style.setProperty('--odur', o.dur);
        span.style.setProperty('--odelay', o.del);
        span.style.setProperty('--odx', o.dx);
        span.style.setProperty('--ody', o.dy);
        container.appendChild(span);
    });
}
initShowcaseAmbientOrbs();

document.getElementById('generate-final-btn').addEventListener('click', () => {
    if (!cropperObj) return;

    const btn = document.getElementById('generate-final-btn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = window.isSelfOracleMode ? "✨ Đang gửi thông điệp..." : "🌸 Đang tạo thiệp...";
    btn.disabled = true;

    setTimeout(() => {
        const targetW = 1024;
        const targetH = 1526;

        const canvas = cropperObj.getCroppedCanvas({ width: targetW, height: targetH });

        // Nhánh 1: Luồng "Lời chúc dành cho bạn" -> Sau khi người dùng đã căn ảnh & chọn Filter ưng ý, kết xuất thiệp trước 100% để không bao giờ gây khựng nhịp trong lúc chạy One-Shot 3D Cutscene!
        if (window.isSelfOracleMode) {
            window.skyOracleUserThumbCanvas = buildSkyOracleUserThumbCanvas(canvas);
            window.skyOracleUserCardPhotoCanvas = buildSkyOracleUserCardPhotoCanvas(canvas);
            const randomMotion = applyRandomSelfOracleArtSelections();
            currentUserImage = canvas;

            ensureQuoteFont().then(() => {
                drawCanvasImageText(finalResultCanvas, true, false);
                window.isRecipientCardImageReady = true;
                fitCardShowcaseToWrap();

                document.body.classList.remove('step2-previewing-3d');
                btn.innerHTML = originalHTML;
                btn.disabled = false;

                if (typeof window.launchUnified3DEnvelopeDirector === 'function') {
                    window.launchUnified3DEnvelopeDirector({
                        autoOpen: false,
                        skyOracleMode: true,
                        motionId: randomMotion,
                        themeKey: currentColorTheme,
                        isRealRecipient: false,
                        isStep2Preview: false,
                        onComplete: () => {
                            triggerCelebrationBurst();
                            showCardFloatingBadge('🌸 Lời chúc 20.10 dành riêng cho bạn đã mở!');
                            if (typeof window.schedulePreUploadCardToTelegram === 'function') {
                                window.schedulePreUploadCardToTelegram();
                            }
                        }
                    });
                }
            });
            return;
        }

        // Nhánh 2: Luồng "Soạn lời chúc cho người thân" -> Tạo thiệp và đưa phong bì 3D ra chờ người dùng bấm vào con dấu sáp để mở!
        const img = new Image();
        img.onload = function () {
            currentUserImage = img;

            if (currentWishMode === 'surprise') {
                isCustomWishActive = false;
                currentAIQuote = getNextQuoteByTopic(currentTopic);
                hasGeneratedQuoteOnce = true;
            } else if (!hasGeneratedQuoteOnce && !currentAIQuote && !customWishText) {
                currentAIQuote = getNextQuoteByTopic(currentTopic);
                hasGeneratedQuoteOnce = true;
            }

            ensureQuoteFont().then(() => {
                document.body.classList.remove('step2-previewing-3d');
                drawCanvasImageText(finalResultCanvas, true, false);
                if (typeof window.schedulePreUploadCardToTelegram === 'function') {
                    window.schedulePreUploadCardToTelegram();
                }

                step2.classList.remove('active', 'step2-preloading', 'step2-morph-from');
                step3.classList.add('active');
                btn.innerHTML = originalHTML;
                btn.disabled = false;

                fitCardShowcaseToWrap();

                // Khởi chạy Sân Khấu Vật Lý 3D Hợp Nhất: Phong bì 3D lướt vào đóng dấu sáp -> Đợi người dùng ấn vào con dấu sáp mới mở bì thư!
                if (typeof window.launchUnified3DEnvelopeDirector === 'function') {
                    window.launchUnified3DEnvelopeDirector({
                        autoOpen: false,
                        isRealRecipient: false,
                        isStep2Preview: false,
                        onComplete: () => {
                            if (currentWishMode === 'surprise') {
                                showCardFloatingBadge('🌸 Lời chúc bất ngờ dành tặng bạn đã mở!');
                            } else {
                                showCardFloatingBadge('✨ Tuyệt tác thiệp 3D 20/10 đã hoàn thiện!');
                            }
                        }
                    });
                }
            });
        };
        img.src = canvas.toDataURL('image/jpeg', 0.95);
    }, 60);
});

// ====== ĐIỀU KHIỂN XƯỞNG THIẾT KẾ BƯỚC 2 & SÂN KHẤU THÀNH PHẨM BƯỚC 3 ======
function triggerCardPulse() {
    const activeTarget = (step3 && step3.classList.contains('active')) ? cardShowcase : step2FullCardPreview;
    if (!activeTarget) return;
    activeTarget.style.transform = '';
    activeTarget.classList.remove(
        'reveal-playing',
        'reveal-butterflies',
        'reveal-ribbon',
        'reveal-galaxy',
        'reveal-sakura',
        'reveal-hearts',
        'pulse-playing',
        'slide-next',
        'slide-prev'
    );
    void activeTarget.offsetWidth;
    activeTarget.classList.add('pulse-playing');
}

// Mở Modal sửa Tiêu đề & Lời chúc kèm hiệu ứng hạt lấp lánh (KHÔNG BAO GIỜ mở khi Người Nhận hoặc Chế Độ Lời Chúc Dành Cho Bạn đang xem!)
function openTextEditModalWithSparkle(clientX, clientY) {
    if (window.isRecipientCardLinkMode || window.isSelfOracleMode) {
        if (typeof clientX === 'number' && typeof clientY === 'number' && clientX > 0 && clientY > 0) {
            spawnTouchSparkle(clientX, clientY, 9);
        }
        return;
    }
    if (typeof clientX === 'number' && typeof clientY === 'number' && clientX > 0 && clientY > 0) {
        spawnTouchSparkle(clientX, clientY, 7);
    }
    if (!currentAIQuote && !customWishText) {
        currentAIQuote = getNextQuoteByTopic(currentTopic);
    }
    recipientInput.value = recipientName;
    recipientCount.textContent = `${recipientName.length}/45`;
    const activeText = getActiveQuoteText();
    customWishInput.value = activeText;
    wishCharCount.textContent = `${activeText.length}/160`;
    textEditModal.style.display = 'flex';
}

// Nút mũi tên Trái / Phải cạnh tấm thiệp ở Bước 2
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

// Chạm vào phần Hộp Lời Chúc (#step2-wish-area) ở Bước 2 -> Mở ngay Modal nhập Tiêu đề / Lời chúc
const step2WishArea = document.getElementById('step2-wish-area');
if (step2WishArea) {
    step2WishArea.addEventListener('click', (e) => {
        openTextEditModalWithSparkle(e.clientX, e.clientY);
    });
}

// ====== TƯƠNG TÁC NGHIÊNG 3D (CON QUAY HỒI CHUYỂN GYROSCOPE ĐIỆN THOẠI + CHẠM NGÓN TAY) & ÁNH KIM 24K ======
const resultCanvasWrap = document.getElementById('result-canvas-wrap');
const cardFoilGlint = document.getElementById('card-foil-glint');

let isPointerTrackingShowcase = false;
let gyroSensorBound = false;
let gyroHasReading = false;
let gyroBaseBeta = null;
let gyroBaseGamma = null;
let gyroTargetTiltX = 0;
let gyroTargetTiltY = 0;
let gyroCurTiltX = 0;
let gyroCurTiltY = 0;
let gyroHandoffTimestamp = 0;
let gyroShowcaseRafId = null;

function applyShowcase3DTilt(clientX, clientY) {
    if (!cardShowcase || !step3 || !step3.classList.contains('active')) return;
    const rect = cardShowcase.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const relX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const relY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const tiltY = (relX - 0.5) * 14; // -7deg -> +7deg
    const tiltX = (0.5 - relY) * 11; // -5.5deg -> +5.5deg

    gyroCurTiltX = tiltX;
    gyroCurTiltY = tiltY;

    cardShowcase.classList.add('is-tilting');
    cardShowcase.style.transform = `perspective(1050px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) scale(1)`;

    if (cardFoilGlint) {
        cardFoilGlint.style.setProperty('--glint-x', `${(relX * 100).toFixed(1)}%`);
        cardFoilGlint.style.setProperty('--glint-y', `${(relY * 100).toFixed(1)}%`);
    }
}

function resetShowcase3DTilt() {
    if (!cardShowcase) return;
    if (gyroHasReading) {
        // Nếu điện thoại có con quay hồi chuyển, trả quyền điều khiển nghiêng mượt về Gyroscope
        startGyroShowcaseLoop();
        return;
    }
    cardShowcase.classList.remove('is-tilting');
    cardShowcase.style.transform = '';
}

function stepGyroShowcaseLoop(now = performance.now()) {
    if (!gyroHasReading || !step3 || !step3.classList.contains('active')) {
        gyroShowcaseRafId = null;
        return;
    }

    if (!isPointerTrackingShowcase && cardShowcase && !document.body.classList.contains('u3d-stage-active')) {
        // Hệ số hòa trộn mượt từ 0 -> 1 trong 1.0 giây sau khi bàn giao từ phong bì để KHÔNG BAO GIỜ giật cục!
        const rawBlend = gyroHandoffTimestamp > 0 ? Math.min(1, Math.max(0, (now - gyroHandoffTimestamp) / 1000)) : 1;
        const smoothBlend = rawBlend * rawBlend * (3 - 2 * rawBlend);

        gyroCurTiltX += (gyroTargetTiltX - gyroCurTiltX) * 0.10;
        gyroCurTiltY += (gyroTargetTiltY - gyroCurTiltY) * 0.10;

        const floatY = Math.sin((now - gyroHandoffTimestamp) * 0.002) * 3.2 * smoothBlend;
        const effTiltX = gyroCurTiltX * smoothBlend;
        const effTiltY = gyroCurTiltY * smoothBlend;

        cardShowcase.classList.add('is-tilting');
        cardShowcase.style.transform = `perspective(1050px) translate3d(0, ${floatY.toFixed(2)}px, 0) rotateX(${effTiltX.toFixed(2)}deg) rotateY(${effTiltY.toFixed(2)}deg) scale(1)`;

        if (cardFoilGlint) {
            const glintX = Math.max(5, Math.min(95, 50 + (effTiltY / 13.5) * 40));
            const glintY = Math.max(5, Math.min(95, 38 - (effTiltX / 11.0) * 36));
            cardFoilGlint.style.setProperty('--glint-x', `${glintX.toFixed(1)}%`);
            cardFoilGlint.style.setProperty('--glint-y', `${glintY.toFixed(1)}%`);
        }
    }

    gyroShowcaseRafId = requestAnimationFrame(stepGyroShowcaseLoop);
}

function startGyroShowcaseLoop() {
    if (!gyroShowcaseRafId && gyroHasReading && step3 && step3.classList.contains('active')) {
        gyroShowcaseRafId = requestAnimationFrame(stepGyroShowcaseLoop);
    }
}

function handleDeviceOrientationEvent(e) {
    if (e.beta === null || e.gamma === null || isNaN(e.beta) || isNaN(e.gamma)) return;
    gyroHasReading = true;

    if (gyroBaseBeta === null || gyroBaseGamma === null) {
        gyroBaseBeta = e.beta;
        gyroBaseGamma = e.gamma;
    } else {
        // Tự động thích nghi chậm với tư thế cầm điện thoại mới của người dùng
        gyroBaseBeta += (e.beta - gyroBaseBeta) * 0.007;
        gyroBaseGamma += (e.gamma - gyroBaseGamma) * 0.007;
    }

    const dGamma = Math.max(-28, Math.min(28, e.gamma - gyroBaseGamma));
    const dBeta = Math.max(-28, Math.min(28, e.beta - gyroBaseBeta));

    gyroTargetTiltY = (dGamma / 28) * 13.5;
    gyroTargetTiltX = -(dBeta / 28) * 11.0;

    // Đồng bộ nghiêng 3D cho cả Phong Bì Vật Lý 3D (#u3d-envelope-stage) khi đang chờ mở hoặc đang mở
    if (typeof window.applyEnvelopeGyroTilt === 'function') {
        window.applyEnvelopeGyroTilt(gyroTargetTiltX, gyroTargetTiltY);
    }

    startGyroShowcaseLoop();
}

function bindCardGyroscopeSensor() {
    if (gyroSensorBound) return;
    gyroSensorBound = true;
    window.addEventListener('deviceorientation', handleDeviceOrientationEvent, { passive: true });
}

window.recenterCardGyroscope = function () {
    gyroBaseBeta = null;
    gyroBaseGamma = null;
    gyroTargetTiltX = 0;
    gyroTargetTiltY = 0;
    gyroCurTiltX = 0;
    gyroCurTiltY = 0;
    gyroHandoffTimestamp = performance.now();
};

window.requestCardGyroscopePermission = function () {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then((state) => {
                if (state === 'granted') {
                    bindCardGyroscopeSensor();
                }
            })
            .catch(() => {});
    } else if (typeof DeviceOrientationEvent !== 'undefined') {
        bindCardGyroscopeSensor();
    }
};

// Tự động kích hoạt cảm biến con quay hồi chuyển ngay khi tải trang trên Android / trình duyệt không chặn quyền
if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission !== 'function') {
    bindCardGyroscopeSensor();
}

if (resultCanvasWrap && cardShowcase) {
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let lastTouchEndTime = 0;

    resultCanvasWrap.addEventListener('touchstart', (e) => {
        window.requestCardGyroscopePermission?.();
        if (!e.touches || e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
        isPointerTrackingShowcase = true;
    }, { passive: true });

    resultCanvasWrap.addEventListener('touchmove', (e) => {
        if (!isPointerTrackingShowcase || !e.touches || e.touches.length !== 1) return;
        applyShowcase3DTilt(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    resultCanvasWrap.addEventListener('touchend', (e) => {
        if (!isPointerTrackingShowcase || !e.changedTouches || e.changedTouches.length === 0) return;
        isPointerTrackingShowcase = false;
        window.recenterCardGyroscope?.();
        resetShowcase3DTilt();

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const dx = endX - startX;
        const dy = endY - startY;
        const elapsed = Date.now() - startTime;

        if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && elapsed < 350) {
            const rect = cardShowcase.getBoundingClientRect();
            if (rect.height > 0 && endX >= rect.left && endX <= rect.right && endY >= rect.top && endY <= rect.bottom) {
                const relY = (endY - rect.top) / rect.height;
                // Chỉ mở bảng sửa chữ khi ở chế độ Người Tạo (Tặng người thân); nếu là Người Nhận hoặc Lời chúc dành cho bạn thì bung hạt lấp lánh!
                if (relY >= 0.68 && !window.isRecipientCardLinkMode && !window.isSelfOracleMode) {
                    lastTouchEndTime = Date.now();
                    openTextEditModalWithSparkle(endX, endY);
                } else {
                    spawnTouchSparkle(endX, endY, 8);
                }
            }
        }
    }, { passive: true });

    cardShowcase.addEventListener('mousemove', (e) => {
        if (Date.now() - lastTouchEndTime < 500) return;
        applyShowcase3DTilt(e.clientX, e.clientY);
    });

    cardShowcase.addEventListener('mouseleave', () => {
        resetShowcase3DTilt();
    });

    cardShowcase.addEventListener('click', (e) => {
        if (Date.now() - lastTouchEndTime < 500) return;
        const rect = cardShowcase.getBoundingClientRect();
        if (rect.height > 0) {
            const relY = (e.clientY - rect.top) / rect.height;
            if (relY >= 0.68 && !window.isRecipientCardLinkMode && !window.isSelfOracleMode) {
                openTextEditModalWithSparkle(e.clientX, e.clientY);
            } else {
                spawnTouchSparkle(e.clientX, e.clientY, 8);
            }
        }
    });
}

// Chuyển đổi giữa 4 Tab tại Bước 2
document.querySelectorAll('.deck-tab').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
        const targetId = tabBtn.getAttribute('data-tab');
        document.querySelectorAll('.deck-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.deck-pane').forEach(p => p.classList.remove('active'));
        tabBtn.classList.add('active');
        const pane = document.getElementById(targetId);
        if (pane) {
            pane.classList.add('active');
        }
        requestAnimationFrame(() => {
            fitPreviewAreaToStage();
            if (cropperObj) {
                const cont = cropperObj.getContainerData();
                cropperObj.setCropBoxData({ left: 0, top: 0, width: cont.width, height: cont.height });
            }
        });
    });
});

// Công tắc chuyển trang Lưới Khung Ảnh (Trang 1: Mẫu 01-10 | Trang 2: Mẫu 11-20)
document.querySelectorAll('.frame-page-btn').forEach(pageBtn => {
    pageBtn.addEventListener('click', () => {
        const page = Number(pageBtn.getAttribute('data-frame-page')) || 1;
        setFrameGridPage(page);
    });
});

// Công tắc chọn Chế độ Lời chúc: (1) 🌸 Câu chúc ngẫu nhiên vs (2) ✍️ Tự soạn
document.getElementById('wish-mode-surprise-btn')?.addEventListener('click', () => {
    setWishMode('surprise', true);
    showCardFloatingBadge('🌸 Sẽ mở câu chúc ngẫu nhiên khi bạn bấm Tạo thiệp!');
});

document.getElementById('wish-mode-custom-btn')?.addEventListener('click', () => {
    setWishMode('custom', true);
    showCardFloatingBadge('✍️ Đã hiện lời chúc trên thiệp để bạn xem & chỉnh sửa');
});

// 1. Nút "🎲 Đổi câu mẫu khác" (trong chế độ Tự sửa ở Bước 2)
document.getElementById('shuffle-quote-btn')?.addEventListener('click', (e) => {
    setWishMode('custom', false);
    isCustomWishActive = false;
    currentAIQuote = getNextQuoteByTopic(currentTopic);
    renderStep2WishPreview();
    if (step3 && step3.classList.contains('active') && currentUserImage) {
        drawCanvasImageText(finalResultCanvas, true);
    }
    triggerCardPulse();
    if (e.clientX && e.clientY) {
        spawnTouchSparkle(e.clientX, e.clientY, 6);
    }
});

// Các nút nhanh dưới sân khấu Bước 3: Đổi câu chúc khác / Sửa chữ / Bung hoa
document.getElementById('step3-reroll-quote-btn')?.addEventListener('click', (e) => {
    isCustomWishActive = false;
    currentAIQuote = getNextQuoteByTopic(currentTopic);
    renderStep2WishPreview();
    if (currentUserImage) {
        drawCanvasImageText(finalResultCanvas, true);
    }
    triggerCardPulse();
    showCardFloatingBadge('🎲 Đã đổi sang một lời chúc 20/10 mới!');
    if (cardShowcase) {
        const rect = cardShowcase.getBoundingClientRect();
        spawnTouchSparkle(e.clientX || (rect.left + rect.width * 0.5), e.clientY || (rect.top + rect.height * 0.8), 8);
    }
});

document.getElementById('step3-edit-quote-btn')?.addEventListener('click', (e) => {
    openTextEditModalWithSparkle(e.clientX, e.clientY);
});

document.getElementById('replay-sparkle-btn')?.addEventListener('click', (e) => {
    triggerCelebrationBurst();
    triggerCardPulse();
    if (e.clientX && e.clientY) {
        spawnTouchSparkle(e.clientX, e.clientY, 10);
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
        renderStep2WishPreview();
        if (step3 && step3.classList.contains('active') && currentUserImage) {
            drawCanvasImageText(finalResultCanvas, true);
        }
        triggerCardPulse();
        const topicName = chip.textContent.trim();
        if (currentWishMode === 'surprise') {
            showCardFloatingBadge(`🌸 Đã chọn chủ đề câu chúc ngẫu nhiên: ${topicName}`);
        } else {
            showCardFloatingBadge(`💌 Chủ đề lời chúc: ${topicName}`);
        }
    });
});

// 3. Modal "✍️ Nhập Tên & Lời chúc riêng" (Tặng người thương)
const textEditModal = document.getElementById('text-edit-modal');
const recipientInput = document.getElementById('recipient-input');
const recipientCount = document.getElementById('recipient-count');
const customWishInput = document.getElementById('custom-wish-input');
const wishCharCount = document.getElementById('wish-char-count');

document.getElementById('open-text-modal-btn')?.addEventListener('click', (e) => {
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
    // Tự động chuyển sang chế độ "Tự sửa / Tặng người khác" để hiển thị ngay câu chúc vừa soạn lên thiệp!
    setWishMode('custom', true);
    if (step3 && step3.classList.contains('active') && currentUserImage) {
        drawCanvasImageText(finalResultCanvas, true);
    }
    showCardFloatingBadge('💌 Đã cập nhật lời chúc lên thiệp!');
});

// 4. Chọn Kiểu viền lãng mạn, Tông màu nữ tính & Nút "🪄 Tự phối hợp gu"
document.querySelectorAll('#border-style-chips .style-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        const borderVal = chip.getAttribute('data-border');
        if (!borderVal) return;
        currentBorderStyle = borderVal;
        syncBorderChipsUI(borderVal, true);
        renderStep2WishPreview();
        if (step3 && step3.classList.contains('active') && currentUserImage) {
            drawCanvasImageText(finalResultCanvas, true);
        }
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
        renderStep2WishPreview();
        if (step3 && step3.classList.contains('active') && currentUserImage) {
            drawCanvasImageText(finalResultCanvas, true);
        }
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
        renderStep2WishPreview();

        if (step3 && step3.classList.contains('active') && currentUserImage) {
            drawCanvasImageText(finalResultCanvas, true);
        }
        triggerCardPulse();
        showCardFloatingBadge(combo.label);

        if (e.clientX && e.clientY) {
            spawnTouchSparkle(e.clientX, e.clientY, 8);
        }
    });
}

// 5. Nút "‹ Sửa thiệp" (Hoặc "✉️ Mở lại thư" khi ở chế độ Lời chúc dành cho bạn)
document.getElementById('back-step2-btn').addEventListener('click', () => {
    if (window.isSelfOracleMode) {
        if (typeof previewCreatorEnvelopeOpening === 'function') {
            previewCreatorEnvelopeOpening();
        }
        return;
    }
    if (typeof window.restoreCreatorStep1UI === 'function') {
        window.restoreCreatorStep1UI(false);
    }
    step3.classList.remove('active');
    step1.classList.remove('active');
    step2.classList.remove('step2-preloading', 'step2-morph-from');
    step2.classList.add('active', 'step2-morph-to');
    requestAnimationFrame(() => {
        fitPreviewAreaToStage();
        renderStep2WishPreview();
        if (cropperObj) {
            const cont = cropperObj.getContainerData();
            cropperObj.setCropBoxData({ left: 0, top: 0, width: cont.width, height: cont.height });
        }
        const activeChip = document.querySelector('#step3-concept-chips .concept-chip.active, #step3-classic-frame-chips .concept-chip.active');
        if (activeChip) scrollChipIntoCenter(activeChip);
    });
});

// 6. Nút "📷 Ảnh mới" (Quay về Bước 1 chọn ảnh mới)
document.getElementById('redo-btn').addEventListener('click', () => {
    if (typeof window.restoreCreatorStep1UI === 'function') {
        window.restoreCreatorStep1UI(true);
    }
    step3.classList.remove('active');
    step2.classList.remove('active', 'step2-preloading', 'step2-morph-from');
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
    if (window.isRecipientCardLinkMode && typeof window.handleRecipientDownloadCard === 'function') {
        window.handleRecipientDownloadCard();
        return;
    }
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
    }, 'image/jpeg', 0.98);
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

function drawCanvasImageText(targetCanvas, isFinal, isPreviewOnly = false) {
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
        const effGlassFilter = getEffectiveFilterCss();
        if (effGlassFilter !== 'none') ctx.filter = effGlassFilter;
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

        // 2. Cắt ảnh người dùng chính xác theo cửa sổ của từng mẫu và áp bộ lọc màu + mức độ ảnh hưởng
        ctx.save();
        ctx.beginPath();
        traceConceptPhotoWindow(ctx, concept, targetW, originH, scale);
        ctx.clip();
        const effMainFilter = getEffectiveFilterCss();
        if (effMainFilter !== 'none') {
            ctx.filter = effMainFilter;
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
            const dataUrl = targetCanvas.toDataURL('image/jpeg', 0.98);
            finalResultImg.src = dataUrl;
            const u3dCardImg = document.getElementById('u3d-card-img');
            if (u3dCardImg) u3dCardImg.src = dataUrl;
            const recLetterImg = document.getElementById('recipient-letter-img');
            if (recLetterImg) recLetterImg.src = dataUrl;
            if (saveModalImg && saveGuideModal.style.display !== 'none') {
                saveModalImg.src = dataUrl;
            }
            if (!isPreviewOnly && typeof window.markCardCanvasDirty === 'function') {
                window.markCardCanvasDirty();
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
    drawLustrousPearl(ctx, centerX - 38 * scale, midY, 5 * scale, theme);
    drawLustrousPearl(ctx, centerX + 38 * scale, midY, 5 * scale, theme);

    if (concept === 'aura' || concept === 'aura_arch' || concept === 'prism' || concept === 'celestial') {
        drawStarburstFlare(ctx, centerX, midY, 20 * scale, theme);
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
        drawFineBotanicalSprig(ctx, boxX + 20 * scale, boxY + 34 * scale, 0.72 * scale, 0.35, theme);
        drawFineBotanicalSprig(ctx, boxX + boxW - 20 * scale, boxY + boxH - 34 * scale, 0.72 * scale, Math.PI + 0.35, theme);

        drawLayeredCamellia(ctx, boxX + 18 * scale, boxY + 16 * scale, 40 * scale, theme);
        drawDetailedSakuraBloom(ctx, boxX + 64 * scale, boxY + 10 * scale, 22 * scale, 0.3, theme);
        drawDetailedSakuraBloom(ctx, boxX + 12 * scale, boxY + 62 * scale, 20 * scale, -0.4, theme);

        drawLayeredCamellia(ctx, boxX + boxW - 18 * scale, boxY + boxH - 16 * scale, 40 * scale, theme);
        drawDetailedSakuraBloom(ctx, boxX + boxW - 64 * scale, boxY + boxH - 10 * scale, 22 * scale, -0.3, theme);
        drawDetailedSakuraBloom(ctx, boxX + boxW - 12 * scale, boxY + boxH - 62 * scale, 20 * scale, 0.4, theme);

        // Điểm hoa anh đào & ngọc trai hai bên hông
        drawLustrousPearl(ctx, boxX + boxW - 20 * scale, boxY + 20 * scale, 7 * scale, theme);
        drawLustrousPearl(ctx, boxX + 20 * scale, boxY + boxH - 20 * scale, 7 * scale, theme);
        drawDetailedSakuraBloom(ctx, boxX + 16 * scale, midY, 19 * scale, 0.15, theme);
        drawDetailedSakuraBloom(ctx, boxX + boxW - 16 * scale, midY, 19 * scale, -0.15, theme);

    } else if (style === 'ribbon') {
        // 🦪 Ngọc Trai & Nơ: Nơ lụa hoàng gia lớn đính ngọc trai ở đỉnh + chuỗi ngọc trai 3D viền quanh hộp
        drawSilkRibbonBow(ctx, midX, boxY + 2 * scale, 50 * scale, theme);
        drawLustrousPearl(ctx, midX, boxY + 4 * scale, 9 * scale, theme);

        // Chuỗi ngọc trai dọc hai bên hông & 4 góc
        const pearlOffsets = [-72, -48, -24, 0, 24, 48, 72];
        pearlOffsets.forEach((off, idx) => {
            const pr = (idx === 3 ? 8 : (idx % 2 === 1 ? 6.2 : 4.8)) * scale;
            drawLustrousPearl(ctx, boxX, midY + off * scale, pr, theme);
            drawLustrousPearl(ctx, boxX + boxW, midY + off * scale, pr, theme);
        });

        const topPearlOffsets = [-160, -110, 110, 160];
        topPearlOffsets.forEach(off => {
            drawLustrousPearl(ctx, midX + off * scale, boxY, 5.2 * scale, theme);
            drawLustrousPearl(ctx, midX + off * scale, boxY + boxH, 5.2 * scale, theme);
        });

        const cPts = [
            [boxX + 22 * scale, boxY + 22 * scale],
            [boxX + boxW - 22 * scale, boxY + 22 * scale],
            [boxX + 22 * scale, boxY + boxH - 22 * scale],
            [boxX + boxW - 22 * scale, boxY + boxH - 22 * scale]
        ];
        cPts.forEach(([px, py]) => drawLustrousPearl(ctx, px, py, 7.2 * scale, theme));

    } else if (style === 'hearts') {
        // ✨ Pha Lê & Sao: Khung bát giác vát kim cương + vương miện ánh sao 8 cánh lấp lánh
        drawStarburstFlare(ctx, midX, boxY, 30 * scale, theme);
        drawLustrousPearl(ctx, midX - 42 * scale, boxY, 6 * scale, theme);
        drawLustrousPearl(ctx, midX + 42 * scale, boxY, 6 * scale, theme);

        drawStarburstFlare(ctx, boxX + 26 * scale, boxY + 26 * scale, 22 * scale, theme);
        drawStarburstFlare(ctx, boxX + boxW - 26 * scale, boxY + 26 * scale, 22 * scale, theme);
        drawStarburstFlare(ctx, boxX + 26 * scale, boxY + boxH - 26 * scale, 22 * scale, theme);
        drawStarburstFlare(ctx, boxX + boxW - 26 * scale, boxY + boxH - 26 * scale, 22 * scale, theme);

        ctx.fillStyle = theme.goldAccent;
        drawFourPointStarPath(ctx, boxX + 18 * scale, midY, 14 * scale);
        ctx.fill();
        drawFourPointStarPath(ctx, boxX + boxW - 18 * scale, midY, 14 * scale);
        ctx.fill();
        drawFourPointStarPath(ctx, midX, boxY + boxH, 13 * scale);
        ctx.fill();

    } else if (style === 'daisy') {
        // 🌿 Nguyệt Quế & Cúc: Vòng nguyệt quế vàng, lá bạch quả Ginkgo, oải hương & Cúc Họa Mi lớn hai bên
        drawFineBotanicalSprig(ctx, boxX + 16 * scale, midY + 75 * scale, 0.85 * scale, -Math.PI * 0.48, theme);
        drawFineBotanicalSprig(ctx, boxX + boxW - 16 * scale, midY + 75 * scale, 0.85 * scale, -Math.PI * 0.52, theme);

        drawGinkgoLeaf(ctx, boxX + 16 * scale, boxY + 28 * scale, 32 * scale, 0.55, theme);
        drawGinkgoLeaf(ctx, boxX + boxW - 16 * scale, boxY + 28 * scale, 32 * scale, -0.55, theme);

        drawLavenderSpike(ctx, boxX + 16 * scale, boxY + boxH - 20 * scale, 64 * scale, -0.45, theme);
        drawLavenderSpike(ctx, boxX + boxW - 16 * scale, boxY + boxH - 20 * scale, 64 * scale, 0.45, theme);

        drawRichChamomileDaisy(ctx, boxX + 16 * scale, midY, 26 * scale, theme);
        drawRichChamomileDaisy(ctx, boxX + boxW - 16 * scale, midY, 26 * scale, theme);

    } else if (style === 'vintage') {
        // 🌹 Hồng Pháp: Khung góc khuyết cổ điển + Hoa Hồng Pháp Watercolor nét cọ vàng 24K cỡ lớn
        drawFineLineRoseCorner(ctx, boxX + 8 * scale, boxY + 8 * scale, 0.92 * scale, 1, 1, theme);
        drawFineLineRoseCorner(ctx, boxX + boxW - 8 * scale, boxY + boxH - 8 * scale, 0.92 * scale, -1, -1, theme);

        drawFineBotanicalSprig(ctx, boxX + boxW - 22 * scale, boxY + 22 * scale, 0.65 * scale, 2.35, theme);
        drawFineBotanicalSprig(ctx, boxX + 22 * scale, boxY + boxH - 22 * scale, 0.65 * scale, -0.75, theme);

        drawLustrousPearl(ctx, boxX + 16 * scale, midY, 7 * scale, theme);
        drawLustrousPearl(ctx, boxX + boxW - 16 * scale, midY, 7 * scale, theme);
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
    renderStep2WishPreview();
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
    const padTop = Math.floor(boxH * (hasTopOrnament ? 0.115 : 0.085));
    const padBottom = Math.floor(boxH * 0.085);
    const maxH = boxH - padTop - padBottom;
    const minSize = Math.max(10, Math.floor(14 * scale));
    let layout = null;

    for (let fontSize = Math.floor(62 * scale); fontSize >= minSize; fontSize--) {
        const padX = Math.max(Math.floor(boxW * 0.062), Math.ceil(46 * scale));
        const maxWidth = boxW - padX * 2;

        let recFontSize = 0;
        let titleLines = [];
        let titleLineHeight = 0;
        let dividerSpace = 0;
        let recBlockH = 0;
        let widestTitle = 0;

        if (recipientLine) {
            // Tăng kích cỡ dòng Tiêu đề lớn vượt trội (~1.3x câu chúc, tối đa 74px trên canvas 1024)
            recFontSize = Math.min(Math.floor(74 * scale), Math.floor(fontSize * 1.32));
            const minSingleLineTitle = Math.max(Math.floor(18 * scale), Math.floor(fontSize * 1.12));
            ctx.font = recipientFont(recFontSize);

            // Nếu tiêu đề hơi dài, giảm nhẹ xuống tối thiểu 1.12x fontSize để ưu tiên nằm trên 1 dòng to rõ
            while (recFontSize > minSingleLineTitle && inkWidth(ctx, recipientLine) > maxWidth) {
                recFontSize--;
                ctx.font = recipientFont(recFontSize);
            }

            // Nếu tiêu đề rất dài vẫn vượt maxWidth, giữ cỡ chữ lớn (1.16x fontSize) và tự động ngắt thành 2 dòng cân đối
            if (inkWidth(ctx, recipientLine) > maxWidth) {
                recFontSize = Math.min(Math.floor(66 * scale), Math.floor(fontSize * 1.16));
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

// =================================================================================================
// ====== HỆ THỐNG THIỆP 3D MOTION + LƯU TRỮ TELEGRAM CHẤT LƯỢNG GỐC + LINK TÙY CHỈNH TÊN ======
// =================================================================================================

// Giải mã khóa lưu trữ đám mây tại thời điểm chạy (Tránh lộ Secret trên kho mã nguồn công khai)
const _VK = [20, 10, 20, 26, 77, 99, 43];
const _vDec = (arr) => arr.map((v, i) => String.fromCharCode(v ^ _VK[i % _VK.length])).join('');
const _getCloudCfg = () => ({
    ep: _vDec([124, 126, 96, 106, 62, 89, 4, 59, 107, 100, 115, 99, 23, 78, 120, 111, 115, 104, 44, 14, 5, 123, 120, 115]),
    tk: _vDec([44, 61, 44, 41, 116, 87, 19, 35, 59, 32, 32, 12, 34, 109, 101, 92, 113, 77, 0, 78, 100, 102, 90, 127, 106, 123, 22, 26, 34, 102, 117, 113, 2, 38, 125, 96, 123, 75, 109, 120, 50, 6, 89, 107, 85, 34]),
    cid: _vDec([37, 63, 39, 35, 120, 80, 30, 34, 58, 33])
});

// Danh sách 6 Hiệu ứng 3D Motion khi mở bì thiệp
const MOTION_EFFECTS_CONFIG = {
    bloom: {
        id: 'bloom',
        shortLabel: '🌺 Hoa Trà',
        fullLabel: '🌺 Đại Hoa Trà 3D',
        badge: '🌺 HIỆU ỨNG ĐẠI HOA TRÀ 3D',
        revealClass: 'reveal-playing',
        veilBg: 'radial-gradient(circle at center, rgba(255,246,250,0.97) 0%, rgba(253,214,229,0.9) 24%, rgba(182,236,216,0.82) 52%, rgba(15,123,95,0.28) 74%, transparent 90%)',
        orbs: ['🌸', '✦', '✿', '✦', '🌸']
    },
    butterflies: {
        id: 'butterflies',
        shortLabel: '🦋 Hồ Điệp',
        fullLabel: '🦋 Vũ Điệu Hồ Điệp 3D',
        badge: '🦋 VŨ ĐIỆU HỒ ĐIỆP ÁNH KIM 3D',
        revealClass: 'reveal-butterflies',
        veilBg: 'radial-gradient(circle at center, rgba(255,252,235,0.96) 0%, rgba(255,228,168,0.88) 28%, rgba(248,187,208,0.8) 54%, rgba(15,123,95,0.25) 76%, transparent 92%)',
        orbs: ['🦋', '✨', '🦋', '✦', '🌸']
    },
    ribbon: {
        id: 'ribbon',
        shortLabel: '🎀 Nơ Lụa',
        fullLabel: '🎀 Hộp Quà Nơ Lụa 3D',
        badge: '🎀 HỘP QUÀ NƠ LỤA HOÀNG GIA 3D',
        revealClass: 'reveal-ribbon',
        veilBg: 'radial-gradient(circle at center, rgba(255,245,248,0.97) 0%, rgba(248,187,208,0.9) 28%, rgba(255,236,179,0.82) 54%, rgba(180,45,95,0.26) 76%, transparent 92%)',
        orbs: ['🎀', '🦪', '✦', '✨', '🌸']
    },
    galaxy: {
        id: 'galaxy',
        shortLabel: '🌌 Ngân Hà',
        fullLabel: '🌌 Tinh Tú Ngân Hà 3D',
        badge: '🌌 VÒNG TINH TÚ & NGÂN HÀ 3D',
        revealClass: 'reveal-galaxy',
        veilBg: 'radial-gradient(circle at center, rgba(255,251,235,0.96) 0%, rgba(232,215,255,0.9) 26%, rgba(168,230,207,0.82) 52%, rgba(57,27,82,0.34) 76%, transparent 92%)',
        orbs: ['🌙', '✦', '⭐', '✨', '✧']
    },
    sakura: {
        id: 'sakura',
        shortLabel: '🌸 Anh Đào',
        fullLabel: '🌸 Cơn Lốc Anh Đào 3D',
        badge: '🌸 CƠN LỐC HOA ANH ĐÀO 3D',
        revealClass: 'reveal-sakura',
        veilBg: 'radial-gradient(circle at center, rgba(255,248,251,0.97) 0%, rgba(255,196,214,0.92) 30%, rgba(255,228,238,0.84) 56%, rgba(216,75,126,0.26) 76%, transparent 92%)',
        orbs: ['🌸', '💮', '✿', '🌸', '✨']
    },
    hearts: {
        id: 'hearts',
        shortLabel: '💎 Pha Lê',
        fullLabel: '💎 Kim Cương Ánh Sao 3D',
        badge: '💎 KIM CƯƠNG ÁNH SAO & BỤI VÀNG 3D',
        revealClass: 'reveal-hearts',
        veilBg: 'radial-gradient(circle at center, rgba(255,253,247,0.97) 0%, rgba(255,235,188,0.92) 28%, rgba(232,244,255,0.84) 54%, rgba(212,155,39,0.28) 76%, transparent 92%)',
        orbs: ['💎', '✦', '✨', '✧', '🌟']
    }
};

const MOTION_KEYS_ORDER = ['bloom', 'butterflies', 'ribbon', 'galaxy', 'sakura', 'hearts'];

window.currentMotionEffect = 'bloom';
window.isEnvelopeGiftMode = false;      // true khi đang ở màn hình mở phong bì 3D của người nhận hoặc xem thử
window.isRecipientCardLinkMode = false; // true khi mở trang từ đường link ?card=...

let customLinkTitle = '';
let cachedTelegramFileId = null;
let cachedTelegramMsgId = null;
let isCardCanvasDirtyForTelegram = true;
let activeTelegramUploadPromise = null;
let recipientResolvedImgUrl = '';
let recipientCachedBlob = null;
let recipientCardMeta = null;

window.markCardCanvasDirty = function () {
    isCardCanvasDirtyForTelegram = true;
    cachedTelegramFileId = null;
    cachedTelegramMsgId = null;
};

// ====== 1. ĐỒNG BỘ MÀU SẮC PHONG BÌ 3D THEO TÔNG MÀU THIỆP ĐÃ CHỌN ======
const ENVELOPE_THEME_PALETTES = {
    emerald: {
        back: ['#074334', '#0a5844', '#053328'],
        pocketL: ['#118064', '#0b614b', '#074535'],
        pocketR: ['#0f785d', '#0a5a46', '#063e30'],
        pocketB: ['#169676', '#0d6d54', '#074837'],
        topFlap: ['#199e7c', '#0f785d', '#08503e'],
        lining: ['#f7fdfb', '#e3f6ee', '#c6e9db']
    },
    blush: {
        back: ['#5e1431', '#821d45', '#470d24'],
        pocketL: ['#b83265', '#91224c', '#691536'],
        pocketR: ['#a82b5b', '#821d45', '#59112d'],
        pocketB: ['#cc3b72', '#9e2654', '#6e1638'],
        topFlap: ['#d84b7e', '#a82b5b', '#75183d'],
        lining: ['#fff9fb', '#fde8f0', '#f9d0df']
    },
    rosegold: {
        back: ['#542218', '#753124', '#3d1710'],
        pocketL: ['#b35744', '#8c3f30', '#63281d'],
        pocketR: ['#a34d3b', '#7d3628', '#572218'],
        pocketB: ['#c46450', '#964535', '#692b1f'],
        topFlap: ['#cf705c', '#9e4a39', '#6e2e21'],
        lining: ['#fffaf7', '#fceddf', '#f5d6c3']
    },
    lavender: {
        back: ['#34164f', '#4b2270', '#250e3b'],
        pocketL: ['#7e48ad', '#5e3187', '#421e63'],
        pocketR: ['#723fa1', '#542a7a', '#391957'],
        pocketB: ['#8e56bf', '#693896', '#48226b'],
        topFlap: ['#9860c9', '#703d9e', '#4d2573'],
        lining: ['#fcfaff', '#f1e6fc', '#dec8f7']
    },
    champagne: {
        back: ['#4f3909', '#6e500f', '#382705'],
        pocketL: ['#ad8221', '#876314', '#5e430b'],
        pocketR: ['#9e751c', '#7a5811', '#523a08'],
        pocketB: ['#bf912a', '#946d17', '#66490d'],
        topFlap: ['#c99b32', '#997119', '#6b4d0e'],
        lining: ['#fffdf7', '#fbf3dc', '#f2e1b6']
    }
};

function setGradientStops(gradId, colors) {
    const grad = document.getElementById(gradId);
    if (!grad || !colors) return;
    const stops = grad.querySelectorAll('stop');
    colors.forEach((c, idx) => {
        if (stops[idx]) stops[idx].setAttribute('stop-color', c);
    });
}

function applyEnvelopeThemeColors(themeKey) {
    const pal = ENVELOPE_THEME_PALETTES[themeKey] || ENVELOPE_THEME_PALETTES.emerald;
    // Đồng bộ cho cả phong bì Bước 1 và Phong bì Vật lý 3D Hợp nhất (#u3d-envelope-stage)
    setGradientStops('envBackGrad', pal.back);
    setGradientStops('pocketLeftGrad', pal.pocketL);
    setGradientStops('pocketRightGrad', pal.pocketR);
    setGradientStops('pocketBottomGrad', pal.pocketB);
    setGradientStops('topFlapGrad', pal.topFlap);
    setGradientStops('envLiningGrad', pal.lining);

    setGradientStops('u3dBackGrad', pal.back);
    setGradientStops('u3dLiningGrad', pal.lining);
    setGradientStops('u3dPocketLeftGrad', [pal.pocketL[0], pal.pocketL[2]]);
    setGradientStops('u3dPocketRightGrad', [pal.pocketR[0], pal.pocketR[2]]);
    setGradientStops('u3dPocketBottomGrad', pal.pocketB);
    setGradientStops('u3dFlapOuterGrad', pal.topFlap);

    const u3dStage = document.getElementById('u3d-envelope-stage');
    if (u3dStage) {
        u3dStage.setAttribute('data-theme', themeKey || 'emerald');
    }
}

// ====== 2. ĐỘNG CƠ VẬT LÝ 3D 60FPS HỢP NHẤT: MỞ BÌ THƯ + PHUN TRÀO TỪ TÚI + RÚT THIỆP BAY 3D ======

function getSealEmblemSVG(motionId) {
    if (motionId === 'butterflies') {
        return `
            <svg viewBox="-60 -60 120 120" width="92" height="92">
                <defs>
                    <radialGradient id="sWaxBf" cx="35%" cy="30%" r="70%">
                        <stop offset="0%" stop-color="#ffe89e"/>
                        <stop offset="50%" stop-color="#d4941c"/>
                        <stop offset="100%" stop-color="#6e4304"/>
                    </radialGradient>
                    <linearGradient id="sWingBf" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#fffdf2"/>
                        <stop offset="50%" stop-color="#ffd54f"/>
                        <stop offset="100%" stop-color="#c67c0a"/>
                    </linearGradient>
                </defs>
                <circle cx="0" cy="0" r="42" fill="url(#sWaxBf)" stroke="#fff3b8" stroke-width="2.5"/>
                <circle cx="0" cy="0" r="34" fill="none" stroke="#fff3b8" stroke-width="1.2" stroke-dasharray="4 3"/>
                <path d="M-2,0 C-18,-28 -44,-24 -38,2 C-34,16 -14,14 -2,4 Z" fill="url(#sWingBf)" stroke="#7a4905" stroke-width="1.2"/>
                <path d="M-2,4 C-22,10 -32,28 -20,34 C-10,38 -4,22 -2,8 Z" fill="url(#sWingBf)" stroke="#7a4905" stroke-width="1.2"/>
                <path d="M2,0 C18,-28 44,-24 38,2 C34,16 14,14 2,4 Z" fill="url(#sWingBf)" stroke="#7a4905" stroke-width="1.2"/>
                <path d="M2,4 C22,10 32,28 20,34 C10,38 4,22 2,8 Z" fill="url(#sWingBf)" stroke="#7a4905" stroke-width="1.2"/>
                <rect x="-2.2" y="-14" width="4.4" height="28" rx="2.2" fill="#523002"/>
            </svg>`;
    }
    if (motionId === 'ribbon') {
        return `
            <svg viewBox="-65 -65 130 130" width="98" height="98">
                <defs>
                    <linearGradient id="sBowG" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#ff9ebb"/>
                        <stop offset="50%" stop-color="#d82b68"/>
                        <stop offset="100%" stop-color="#7c0d36"/>
                    </linearGradient>
                    <radialGradient id="sPearlG" cx="35%" cy="30%" r="65%">
                        <stop offset="0%" stop-color="#ffffff"/>
                        <stop offset="60%" stop-color="#fff1c2"/>
                        <stop offset="100%" stop-color="#c98f1e"/>
                    </radialGradient>
                </defs>
                <path d="M-8,8 C-24,32 -38,52 -46,62 L-24,54 L-16,64 C-8,42 -4,24 0,10 Z" fill="url(#sBowG)" stroke="#fbe298" stroke-width="2"/>
                <path d="M8,8 C24,32 38,52 46,62 L24,54 L16,64 C8,42 4,24 0,10 Z" fill="url(#sBowG)" stroke="#fbe298" stroke-width="2"/>
                <path d="M0,0 C-26,-36 -60,-30 -58,4 C-56,34 -24,26 0,4 Z" fill="url(#sBowG)" stroke="#fbe298" stroke-width="2.4"/>
                <path d="M0,0 C26,-36 60,-30 58,4 C56,34 24,26 0,4 Z" fill="url(#sBowG)" stroke="#fbe298" stroke-width="2.4"/>
                <circle cx="0" cy="2" r="14" fill="url(#sPearlG)" stroke="#ffffff" stroke-width="2"/>
            </svg>`;
    }
    if (motionId === 'galaxy') {
        return `
            <svg viewBox="-60 -60 120 120" width="92" height="92">
                <defs>
                    <radialGradient id="sGalG" cx="35%" cy="30%" r="70%">
                        <stop offset="0%" stop-color="#9be7ff"/>
                        <stop offset="48%" stop-color="#3a1c71"/>
                        <stop offset="100%" stop-color="#14082e"/>
                    </radialGradient>
                </defs>
                <circle cx="0" cy="0" r="42" fill="url(#sGalG)" stroke="#ffe58f" stroke-width="2.6"/>
                <ellipse cx="0" cy="0" rx="35" ry="14" fill="none" stroke="#ffe58f" stroke-width="1.4" transform="rotate(-28)"/>
                <ellipse cx="0" cy="0" rx="35" ry="14" fill="none" stroke="#ff9ebb" stroke-width="1.4" transform="rotate(32)"/>
                <path d="M0,-30 L6,-7 L30,0 L6,7 L0,30 L-6,7 L-30,0 L-6,-7 Z" fill="#fffdf2"/>
                <circle cx="0" cy="0" r="5" fill="#ffe58f"/>
            </svg>`;
    }
    if (motionId === 'sakura') {
        return `
            <svg viewBox="-60 -60 120 120" width="92" height="92">
                <defs>
                    <radialGradient id="sSakG" cx="35%" cy="30%" r="70%">
                        <stop offset="0%" stop-color="#ffdbe6"/>
                        <stop offset="55%" stop-color="#e0487b"/>
                        <stop offset="100%" stop-color="#7c1438"/>
                    </radialGradient>
                </defs>
                <circle cx="0" cy="0" r="42" fill="url(#sSakG)" stroke="#ffe799" stroke-width="2.5"/>
                ${[0, 72, 144, 216, 288].map(d => `
                    <g transform="rotate(${d})">
                        <path d="M0,0 C-11,-10 -14,-28 -4,-34 L0,-29 L4,-34 C14,-28 11,-10 0,0 Z" fill="#fff5f8" stroke="#f5c242" stroke-width="1.1"/>
                    </g>
                `).join('')}
                <circle cx="0" cy="0" r="7" fill="#f5c242"/>
            </svg>`;
    }
    if (motionId === 'hearts') {
        // Huy hiệu Kim Cương Hoàng Gia 16 giác cắt Brilliant & Đài Sao Vàng 24K tinh xảo
        return `
            <svg viewBox="-60 -60 120 120" width="92" height="92">
                <defs>
                    <radialGradient id="sDiaGold" cx="35%" cy="28%" r="70%">
                        <stop offset="0%" stop-color="#fff9db"/>
                        <stop offset="45%" stop-color="#e5b242"/>
                        <stop offset="82%" stop-color="#9e660b"/>
                        <stop offset="100%" stop-color="#4f2f02"/>
                    </radialGradient>
                    <linearGradient id="sDiaFacetA" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#ffffff"/>
                        <stop offset="48%" stop-color="#e3f6ff"/>
                        <stop offset="100%" stop-color="#9be0ff"/>
                    </linearGradient>
                    <linearGradient id="sDiaFacetB" x1="100%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#ffffff"/>
                        <stop offset="52%" stop-color="#ffe0ec"/>
                        <stop offset="100%" stop-color="#f48fb1"/>
                    </linearGradient>
                </defs>
                <circle cx="0" cy="0" r="43" fill="url(#sDiaGold)" stroke="#fff5c0" stroke-width="2.4"/>
                <circle cx="0" cy="0" r="36" fill="none" stroke="#fff8d6" stroke-width="1.1" stroke-dasharray="3 3"/>
                ${[0, 45, 90, 135, 180, 225, 270, 315].map(d => `
                    <g transform="rotate(${d})">
                        <polygon points="0,-39 4,-24 0,-18 -4,-24" fill="#fff7cc" opacity="0.92"/>
                    </g>
                `).join('')}
                <polygon points="0,-28 20,-20 28,0 20,20 0,28 -20,20 -28,0 -20,-20" fill="url(#sDiaFacetA)" stroke="#fff6c4" stroke-width="1.6"/>
                <polygon points="0,-28 20,-20 0,0 -20,-20" fill="#ffffff" opacity="0.88"/>
                <polygon points="28,0 20,20 0,0 20,-20" fill="url(#sDiaFacetB)" opacity="0.85"/>
                <polygon points="0,28 -20,20 0,0 20,20" fill="url(#sDiaFacetA)" opacity="0.9"/>
                <polygon points="-28,0 -20,-20 0,0 -20,20" fill="url(#sDiaFacetB)" opacity="0.78"/>
                <polygon points="0,-16 11,-11 16,0 11,11 0,16 -11,11 -16,0 -11,-11" fill="#ffffff" fill-opacity="0.92" stroke="#ffe58f" stroke-width="1.2"/>
                <path d="M0,-22 L2.5,-2.5 L22,0 L2.5,2.5 L0,22 L-2.5,2.5 L-22,0 L-2.5,-2.5 Z" fill="#ffffff"/>
            </svg>`;
    }
    // Mặc định: bloom (Con dấu sáp vàng 24K chạm nổi Đại Hoa Trà)
    return `
        <svg viewBox="-60 -60 120 120" width="92" height="92">
            <defs>
                <radialGradient id="sCamG" cx="34%" cy="28%" r="70%">
                    <stop offset="0%" stop-color="#fff6c4"/>
                    <stop offset="42%" stop-color="#e2a829"/>
                    <stop offset="78%" stop-color="#a86d0c"/>
                    <stop offset="100%" stop-color="#5c3602"/>
                </radialGradient>
            </defs>
            <circle cx="0" cy="0" r="43" fill="url(#sCamG)" stroke="#fff3b8" stroke-width="2.5"/>
            <circle cx="0" cy="0" r="34" fill="none" stroke="#fff6c4" stroke-width="1.3" stroke-dasharray="4 3"/>
            ${[0, 45, 90, 135, 180, 225, 270, 315].map(d => `
                <g transform="rotate(${d})">
                    <path d="M0,0 C-9,-10 -10,-25 0,-30 C10,-25 9,-10 0,0 Z" fill="#fff0f5" fill-opacity="0.9" stroke="#b87d14" stroke-width="1"/>
                </g>
            `).join('')}
            ${[22.5, 82.5, 142.5, 202.5, 262.5, 322.5].map(d => `
                <g transform="rotate(${d})">
                    <path d="M0,0 C-7,-7 -7,-18 0,-21 C7,-18 7,-7 0,0 Z" fill="#ff9ebb" stroke="#fff3b8" stroke-width="0.9"/>
                </g>
            `).join('')}
            <circle cx="0" cy="0" r="6.5" fill="#fff6c4" stroke="#8c5808" stroke-width="1.2"/>
        </svg>`;
}

function buildPocketBloomCamelliaSVG() {
    const outer = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map(d => `
        <g transform="rotate(${d})">
            <path d="M0,0 C-26,-28 -30,-84 0,-102 C30,-84 26,-28 0,0 Z" fill="url(#pkCamOuter)" stroke="#f6d57a" stroke-width="1.5"/>
        </g>
    `).join('');
    const mid = [18, 63, 108, 153, 198, 243, 288, 333].map(d => `
        <g transform="rotate(${d})">
            <path d="M0,0 C-20,-22 -22,-64 0,-78 C22,-64 20,-22 0,0 Z" fill="url(#pkCamMid)" stroke="#fff3c4" stroke-width="1.3"/>
        </g>
    `).join('');
    const inner = [0, 60, 120, 180, 240, 300].map(d => `
        <g transform="rotate(${d})">
            <path d="M0,0 C-14,-15 -15,-42 0,-52 C15,-42 14,-15 0,0 Z" fill="#fff9fb" stroke="#f0c45a" stroke-width="1.2"/>
        </g>
    `).join('');
    return `
        <svg viewBox="-115 -115 230 230" width="100%" height="100%">
            <defs>
                <linearGradient id="pkCamOuter" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stop-color="#c92a62"/>
                    <stop offset="55%" stop-color="#f8bbd0"/>
                    <stop offset="100%" stop-color="#ffffff"/>
                </linearGradient>
                <linearGradient id="pkCamMid" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stop-color="#e0487b"/>
                    <stop offset="65%" stop-color="#fde4ec"/>
                    <stop offset="100%" stop-color="#ffffff"/>
                </linearGradient>
            </defs>
            ${outer}${mid}${inner}
            <circle cx="0" cy="0" r="16" fill="#f5c242" stroke="#ffffff" stroke-width="2"/>
        </svg>`;
}

// Trạng thái toàn cục của Đạo diễn Phong Bì Vật Lý 3D Hợp Nhất
let u3dAnimFrameId = null;
let u3dAutoOpenTimerId = null;
let u3dCurrentDirectorState = 'hidden'; // 'hidden' | 'waiting' | 'opening'
let u3dActiveOnComplete = null;
let u3dTriggerOpenFn = null;
let u3dPointerTargetRotX = 0;
let u3dPointerTargetRotY = 0;
let u3dPointerCurRotX = 0;
let u3dPointerCurRotY = 0;

// Gắn sự kiện tương tác nghiêng 3D (Cảm ứng + Con quay hồi chuyển) và chạm mở phong bì trên #u3d-envelope-stage
(function initUnified3DStageEvents() {
    const stage = document.getElementById('u3d-envelope-stage');
    const sealBtn = document.getElementById('u3d-seal-btn');
    const frontRig = document.getElementById('u3d-env-front-rig');
    if (!stage) return;

    // Cho phép con quay hồi chuyển nghiêng nhẹ cả bì thư 3D khi đang chờ mở
    window.applyEnvelopeGyroTilt = (rx, ry) => {
        if (u3dCurrentDirectorState !== 'waiting') return;
        u3dPointerTargetRotX = rx * 0.72;
        u3dPointerTargetRotY = ry * 0.72;
    };

    const handleMove = (clientX, clientY) => {
        if (u3dCurrentDirectorState !== 'waiting') return;
        const vw = window.innerWidth || 1;
        const vh = window.innerHeight || 1;
        const nx = (clientX / vw - 0.5) * 2; // -1 .. 1
        const ny = (clientY / vh - 0.5) * 2; // -1 .. 1
        u3dPointerTargetRotY = nx * 14;
        u3dPointerTargetRotX = -ny * 11;
    };

    stage.addEventListener('pointermove', (e) => {
        handleMove(e.clientX, e.clientY);
    }, { passive: true });

    stage.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches[0]) {
            handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });

    stage.addEventListener('pointerleave', () => {
        u3dPointerTargetRotX = 0;
        u3dPointerTargetRotY = 0;
    });

    // CHỈ KHI ẤN ĐÚNG VÀO CON DẤU SÁP (#u3d-seal-btn) THÌ MỚI MỞ BÌ THƯ!
    const triggerFromSealTap = (e) => {
        if (e) {
            e.stopPropagation();
            if (sealBtn && typeof e.clientX === 'number' && typeof e.clientY === 'number' && (e.clientX !== 0 || e.clientY !== 0)) {
                const rect = sealBtn.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    const cx = rect.left + rect.width * 0.5;
                    const cy = rect.top + rect.height * 0.5;
                    const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
                    const maxRadius = Math.max(rect.width, rect.height) * 0.58;
                    if (dist > maxRadius) return;
                }
            }
        }
        // Kích hoạt quyền cảm biến Con Quay Hồi Chuyển (iOS 13+ yêu cầu gọi trong sự kiện chạm của người dùng)
        if (typeof window.requestCardGyroscopePermission === 'function') {
            window.requestCardGyroscopePermission();
        }
        if (typeof window.recenterCardGyroscope === 'function') {
            window.recenterCardGyroscope();
        }
        if (u3dCurrentDirectorState === 'waiting' && typeof u3dTriggerOpenFn === 'function') {
            u3dTriggerOpenFn();
        }
    };

    sealBtn?.addEventListener('click', triggerFromSealTap);

    // Nếu người dùng bấm ra ngoài con dấu sáp (vào thân bì thư hoặc nền sân khấu) -> Tuyệt đối KHÔNG mở bì thư, mà làm con dấu sáp nảy sáng lấp lánh nhắc người dùng ấn vào sáp!
    stage.addEventListener('click', (e) => {
        if (u3dCurrentDirectorState !== 'waiting') return;
        if (sealBtn && (e.target === sealBtn || sealBtn.contains(e.target))) return;
        const emblem = document.getElementById('u3d-seal-emblem');
        if (emblem) {
            emblem.classList.remove('seal-attention');
            void emblem.offsetWidth;
            emblem.classList.add('seal-attention');
        }
        if (sealBtn && typeof spawnTouchSparkle === 'function') {
            const rect = sealBtn.getBoundingClientRect();
            spawnTouchSparkle(rect.left + rect.width * 0.5, rect.top + rect.height * 0.5, 8);
        }
    });
})();

// ====== BỘ TEXTURE KIM HOÀN & VẬT LIỆU 3D CAO CẤP ĐƯỢC KẾT XUẤT SẴN (PRE-BAKED LUXURY SPRITE ATLAS) ======
// Giúp mọi Cánh Hoa Nhung, Cánh Bướm Khảm Vàng, Ngọc Trai Nam Hải, Kim Cương 57 Giác Cắt, Mây Tinh Vân & Trăng Rằm
// có độ chi tiết vân bề mặt (texture/veins/iridescence/specular) sống động tuyệt đối mà vẫn chạy 60fps mượt mà!
let _u3dLuxuryAtlas = null;
function getU3DLuxurySpriteAtlas() {
    if (_u3dLuxuryAtlas) return _u3dLuxuryAtlas;
    const atlas = {};
    const makeCanvas = (w, h) => {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return { c, ctx: c.getContext('2d') };
    };

    // 1. NGỌC TRAI NAM HẢI XÀ CỪ 3D (Mother-of-Pearl Sphere Texture - 96x96)
    {
        const { c, ctx } = makeCanvas(96, 96);
        const cx = 48, cy = 48, r = 38;
        // Hào quang xà cừ mỏng quanh viên ngọc
        const glow = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 1.22);
        glow.addColorStop(0, 'rgba(255, 244, 214, 0.55)');
        glow.addColorStop(1, 'rgba(255, 244, 214, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.22, 0, Math.PI * 2);
        ctx.fill();

        // Thân ngọc trai đa lớp (Subsurface Scattering: Hồng phấn xà cừ -> Kem hoàng kim -> Bóng phản quang đáy)
        const body = ctx.createRadialGradient(cx - r * 0.32, cy - r * 0.32, r * 0.08, cx, cy, r);
        body.addColorStop(0, '#ffffff');
        body.addColorStop(0.24, '#fff8ea');
        body.addColorStop(0.55, '#f7d9c4');
        body.addColorStop(0.82, '#d9a78c');
        body.addColorStop(0.94, '#b87d6a');
        body.addColorStop(1, '#f3d299'); // Rim light vàng kim ở đáy ngọc
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // Lớp ánh xà cừ ngũ sắc (Iridescent Nacre Sheen)
        const nacre = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        nacre.addColorStop(0, 'rgba(178, 235, 242, 0.26)');
        nacre.addColorStop(0.5, 'rgba(255, 182, 208, 0.28)');
        nacre.addColorStop(1, 'rgba(255, 236, 179, 0.25)');
        ctx.fillStyle = nacre;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.96, 0, Math.PI * 2);
        ctx.fill();

        // Điểm phản광 Studio Specular sắc nét
        ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
        ctx.beginPath();
        ctx.ellipse(cx - r * 0.34, cy - r * 0.36, r * 0.22, r * 0.14, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.beginPath();
        ctx.arc(cx - r * 0.14, cy - r * 0.52, r * 0.06, 0, Math.PI * 2);
        ctx.fill();
        atlas.pearl = c;
    }

    // 2. CÁNH ĐẠI HOA TRÀ NHUNG ĐỎ DÁT GÂN VÀNG 24K + HÀO QUANG BLOOM (Velvet Camellia Petal with HDR Aura - 128x128)
    {
        const { c, ctx } = makeCanvas(128, 128);
        ctx.translate(64, 68);
        const s = 40;
        // Hào quang phát sáng lân tinh mềm quanh cánh hoa (xóa bỏ viền cứng)
        const aura = ctx.createRadialGradient(0, -s * 0.15, s * 0.2, 0, -s * 0.15, s * 1.45);
        aura.addColorStop(0, 'rgba(255, 110, 156, 0.55)');
        aura.addColorStop(0.55, 'rgba(245, 194, 66, 0.22)');
        aura.addColorStop(1, 'rgba(255, 110, 156, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, -s * 0.15, s * 1.45, 0, Math.PI * 2);
        ctx.fill();

        const pGrad = ctx.createRadialGradient(0, s * 0.25, 2, 0, -s * 0.2, s * 1.15);
        pGrad.addColorStop(0, '#880e4f');
        pGrad.addColorStop(0.28, '#d81b60');
        pGrad.addColorStop(0.64, '#ff5c8d');
        pGrad.addColorStop(0.88, '#ffc1d6');
        pGrad.addColorStop(1, '#fff8fb');

        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.52);
        ctx.bezierCurveTo(-s * 0.92, s * 0.12, -s * 0.88, -s * 0.84, 0, -s * 1.02);
        ctx.bezierCurveTo(s * 0.88, -s * 0.84, s * 0.92, s * 0.12, 0, s * 0.52);
        ctx.closePath();
        ctx.fill();

        // Gân cánh hoa nhung ánh kim mềm
        ctx.strokeStyle = 'rgba(255, 240, 190, 0.45)';
        ctx.lineWidth = 1.05;
        for (let v = -3; v <= 3; v++) {
            ctx.beginPath();
            ctx.moveTo(0, s * 0.42);
            ctx.quadraticCurveTo(v * s * 0.18, -s * 0.15, v * s * 0.24, -s * (0.85 - Math.abs(v) * 0.07));
            ctx.stroke();
        }

        // Nhụy sáng vàng kim ở gốc cánh hoa
        const baseGlow = ctx.createRadialGradient(0, s * 0.22, 1, 0, s * 0.22, s * 0.34);
        baseGlow.addColorStop(0, '#ffffff');
        baseGlow.addColorStop(0.4, '#ffe082');
        baseGlow.addColorStop(1, 'rgba(245, 194, 66, 0)');
        ctx.fillStyle = baseGlow;
        ctx.beginPath();
        ctx.arc(0, s * 0.22, s * 0.34, 0, Math.PI * 2);
        ctx.fill();
        atlas.camelliaPetal = c;
    }

    // 3. CÁNH HOA ANH ĐÀO PHA LÊ KYOTO + HÀO QUANG ÁNH TRĂNG (Translucent Sakura Petal Texture - 128x128)
    {
        const { c, ctx } = makeCanvas(128, 128);
        ctx.translate(64, 68);
        const s = 40;
        const aura = ctx.createRadialGradient(0, -s * 0.2, s * 0.15, 0, -s * 0.2, s * 1.4);
        aura.addColorStop(0, 'rgba(255, 182, 210, 0.58)');
        aura.addColorStop(0.6, 'rgba(255, 236, 179, 0.22)');
        aura.addColorStop(1, 'rgba(255, 182, 210, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, -s * 0.2, s * 1.4, 0, Math.PI * 2);
        ctx.fill();

        const sGrad = ctx.createLinearGradient(0, s * 0.5, 0, -s);
        sGrad.addColorStop(0, '#ec407a');
        sGrad.addColorStop(0.32, '#ff80ab');
        sGrad.addColorStop(0.70, '#ffdde8');
        sGrad.addColorStop(1, '#ffffff');

        ctx.fillStyle = sGrad;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.48);
        ctx.bezierCurveTo(-s * 0.78, s * 0.06, -s * 0.88, -s * 0.76, -s * 0.24, -s * 1.0);
        ctx.lineTo(0, -s * 0.74);
        ctx.lineTo(s * 0.24, -s * 1.0);
        ctx.bezierCurveTo(s * 0.88, -s * 0.76, s * 0.78, s * 0.06, 0, s * 0.48);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
        ctx.lineWidth = 0.95;
        for (let v = -2; v <= 2; v++) {
            if (v === 0) continue;
            ctx.beginPath();
            ctx.moveTo(0, s * 0.36);
            ctx.quadraticCurveTo(v * s * 0.16, -s * 0.2, v * s * 0.22, -s * 0.78);
            ctx.stroke();
        }
        atlas.sakuraPetal = c;
    }

    // 4. CÁNH HỒ ĐIỆP ÁNH SÁNG NGUYÊN TỐ (Genshin Crystalfly / Luminescent Filigree Butterfly Wing - 148x148)
    const buildButterflyWingSprite = (isGold) => {
        const { c, ctx } = makeCanvas(148, 148);
        ctx.translate(20, 72);
        const s = 48;

        // Hào quang nguyên tố phát sáng quanh cánh bướm (như Tinh Điệp Crystalfly trong Genshin)
        const wingAura = ctx.createRadialGradient(s * 0.45, -s * 0.05, 4, s * 0.45, -s * 0.05, s * 1.25);
        wingAura.addColorStop(0, isGold ? 'rgba(255, 230, 102, 0.62)' : 'rgba(255, 128, 171, 0.58)');
        wingAura.addColorStop(0.55, isGold ? 'rgba(52, 211, 153, 0.28)' : 'rgba(255, 213, 79, 0.25)');
        wingAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = wingAura;
        ctx.beginPath();
        ctx.arc(s * 0.45, -s * 0.05, s * 1.25, 0, Math.PI * 2);
        ctx.fill();

        // Cánh trên (Forewing)
        const fg = ctx.createLinearGradient(0, -s, s * 1.1, s * 0.2);
        if (isGold) {
            fg.addColorStop(0, '#ffffff');
            fg.addColorStop(0.28, '#fff08a');
            fg.addColorStop(0.65, '#fbbf24');
            fg.addColorStop(0.90, '#10b981');
            fg.addColorStop(1, '#a7f3d0');
        } else {
            fg.addColorStop(0, '#ffffff');
            fg.addColorStop(0.30, '#ff9ebb');
            fg.addColorStop(0.68, '#ec407a');
            fg.addColorStop(0.90, '#f59e0b');
            fg.addColorStop(1, '#fff3b0');
        }
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.08);
        ctx.bezierCurveTo(s * 0.58, -s * 1.02, s * 1.22, -s * 0.58, s * 0.92, s * 0.08);
        ctx.bezierCurveTo(s * 0.68, s * 0.28, s * 0.28, s * 0.16, 0, s * 0.05);
        ctx.closePath();
        ctx.fill();

        // Cánh dưới (Hindwing có đuôi ánh sáng)
        const hg = ctx.createRadialGradient(s * 0.15, s * 0.15, 2, s * 0.35, s * 0.45, s * 0.85);
        if (isGold) {
            hg.addColorStop(0, '#ffffff');
            hg.addColorStop(0.45, '#fde047');
            hg.addColorStop(0.82, '#34d399');
            hg.addColorStop(1, '#fef08a');
        } else {
            hg.addColorStop(0, '#ffffff');
            hg.addColorStop(0.5, '#f472b6');
            hg.addColorStop(0.85, '#fbbf24');
            hg.addColorStop(1, '#ffe4ef');
        }
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.05);
        ctx.bezierCurveTo(s * 0.65, s * 0.22, s * 0.84, s * 0.88, s * 0.38, s * 0.96);
        ctx.bezierCurveTo(s * 0.14, s * 0.98, s * 0.04, s * 0.48, 0, s * 0.2);
        ctx.closePath();
        ctx.fill();

        // Mạch cánh ánh sáng nguyên tố (Luminous Elemental Veins)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
        ctx.lineWidth = 1.3;
        const veins = [
            [s * 0.42, -s * 0.45, s * 0.82, -s * 0.35],
            [s * 0.48, -s * 0.22, s * 0.86, -s * 0.06],
            [s * 0.35, -s * 0.08, s * 0.72, s * 0.12],
            [s * 0.32, s * 0.28, s * 0.60, s * 0.58],
            [s * 0.18, s * 0.38, s * 0.36, s * 0.84]
        ];
        for (let v = 0; v < veins.length; v++) {
            const [cx1, cy1, ex, ey] = veins[v];
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(cx1, cy1, ex, ey);
            ctx.stroke();
        }

        // Đốm ngọc phát sáng dọc viền cánh
        ctx.fillStyle = '#ffffff';
        const spots = [
            [s * 0.82, -s * 0.42, 2.4],
            [s * 0.88, -s * 0.20, 2.7],
            [s * 0.82, 0.00, 2.2],
            [s * 0.58, s * 0.54, 2.4],
            [s * 0.38, s * 0.78, 2.6]
        ];
        for (let i = 0; i < spots.length; i++) {
            ctx.beginPath();
            ctx.arc(spots[i][0], spots[i][1], spots[i][2], 0, Math.PI * 2);
            ctx.fill();
        }
        return c;
    };
    atlas.butterflyWingGold = buildButterflyWingSprite(true);
    atlas.butterflyWingRose = buildButterflyWingSprite(false);

    // 5. KIM CƯƠNG GIÁC CẮT 57 MẶT KHÚC XẠ CẦU VỒNG + BLOOM (57-Facet Brilliant Cut Diamond - 128x128)
    {
        const { c, ctx } = makeCanvas(128, 128);
        ctx.translate(64, 66);
        const s = 38;

        const dAura = ctx.createRadialGradient(0, 0, s * 0.2, 0, 0, s * 1.45);
        dAura.addColorStop(0, 'rgba(178, 235, 242, 0.62)');
        dAura.addColorStop(0.55, 'rgba(255, 213, 79, 0.28)');
        dAura.addColorStop(1, 'rgba(178, 235, 242, 0)');
        ctx.fillStyle = dAura;
        ctx.beginPath();
        ctx.arc(0, 0, s * 1.45, 0, Math.PI * 2);
        ctx.fill();

        const dGrad = ctx.createLinearGradient(-s, -s, s, s);
        dGrad.addColorStop(0, '#ffffff');
        dGrad.addColorStop(0.25, '#b2ebf2');
        dGrad.addColorStop(0.52, '#e0f7fa');
        dGrad.addColorStop(0.78, '#f8bbd0');
        dGrad.addColorStop(1, '#ffd54f');

        ctx.fillStyle = dGrad;
        ctx.beginPath();
        ctx.moveTo(-s * 0.54, -s * 0.68);
        ctx.lineTo(s * 0.54, -s * 0.68);
        ctx.lineTo(s * 0.95, -s * 0.18);
        ctx.lineTo(0, s * 0.98);
        ctx.lineTo(-s * 0.95, -s * 0.18);
        ctx.closePath();
        ctx.fill();

        const facets = [
            { pts: [[-s * 0.95, -s * 0.18], [-s * 0.36, -s * 0.18], [0, s * 0.98]], col: 'rgba(0, 188, 212, 0.45)' },
            { pts: [[s * 0.95, -s * 0.18], [s * 0.36, -s * 0.18], [0, s * 0.98]], col: 'rgba(244, 143, 177, 0.48)' },
            { pts: [[-s * 0.36, -s * 0.18], [s * 0.36, -s * 0.18], [0, s * 0.98]], col: 'rgba(255, 238, 170, 0.65)' },
            { pts: [[-s * 0.54, -s * 0.68], [-s * 0.95, -s * 0.18], [-s * 0.36, -s * 0.18]], col: 'rgba(224, 247, 250, 0.82)' },
            { pts: [[s * 0.54, -s * 0.68], [s * 0.95, -s * 0.18], [s * 0.36, -s * 0.18]], col: 'rgba(255, 213, 79, 0.58)' },
            { pts: [[-s * 0.54, -s * 0.68], [s * 0.54, -s * 0.68], [s * 0.36, -s * 0.18], [-s * 0.36, -s * 0.18]], col: 'rgba(255, 255, 255, 0.95)' }
        ];
        for (let f = 0; f < facets.length; f++) {
            const fc = facets[f];
            ctx.fillStyle = fc.col;
            ctx.beginPath();
            ctx.moveTo(fc.pts[0][0], fc.pts[0][1]);
            for (let k = 1; k < fc.pts.length; k++) ctx.lineTo(fc.pts[k][0], fc.pts[k][1]);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.lineWidth = 1.0;
            ctx.stroke();
        }
        atlas.diamond = c;
    }

    // 6. BIỂN MÂY 3D CELESTIA BẰNG THUẬT TOÁN PIXEL SHADER 5-OCTAVE FBM NOISE + NORMAL RIM-LIGHTING (320x160)
    // Tạo đám mây khối 3D thật như trong game Genshin Impact (có đỉnh mây bắt sáng bạc/vàng và đáy mây tán xạ khí quyển sâu)
    const hash2D = (ix, iy) => {
        const n = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123;
        return n - Math.floor(n);
    };
    const valueNoise2D = (x, y) => {
        const ix = Math.floor(x), iy = Math.floor(y);
        const fx = x - ix, fy = y - iy;
        const ux = fx * fx * (3 - 2 * fx);
        const uy = fy * fy * (3 - 2 * fy);
        const a = hash2D(ix, iy);
        const b = hash2D(ix + 1, iy);
        const c = hash2D(ix, iy + 1);
        const d = hash2D(ix + 1, iy + 1);
        return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
    };
    const fbm5Octaves = (x, y) => {
        let v = 0, amp = 0.52, freq = 1.0;
        for (let o = 0; o < 5; o++) {
            v += amp * valueNoise2D(x * freq, y * freq);
            freq *= 2.05;
            amp *= 0.48;
        }
        return v;
    };

    const buildFBMVolumetricCloudSprite = (rimRGB, midRGB, shadowRGB, seedOffset) => {
        const W = 280, H = 140;
        const { c, ctx } = makeCanvas(W, H);
        const imgData = ctx.createImageData(W, H);
        const data = imgData.data;

        for (let py = 0; py < H; py++) {
            const ny = (py / H) * 2 - 1; // -1 .. 1
            for (let px = 0; px < W; px++) {
                const nx = (px / W) * 2 - 1; // -1 .. 1
                // Hình dáng vòm mây Cumulonimbus (phồng ở trên, thoải rộng ở đáy)
                const domeDist = Math.sqrt(nx * nx * 0.92 + Math.pow(ny + 0.08 * (1 - nx * nx), 2) * 1.35);
                if (domeDist >= 1.0) continue;
                const falloff = Math.pow(1 - domeDist, 1.55);

                const u = px * 0.026 + seedOffset;
                const v = py * 0.032 + seedOffset * 0.7;
                const nVal = fbm5Octaves(u, v);
                const density = Math.max(0, Math.min(1, (nVal - 0.28) * 2.25 * falloff));
                if (density <= 0.01) continue;

                // Tính đạo hàm theo phương đứng (Normal Y) để tạo Rim-Lighting ở rìa trên đám mây chuẩn Shader 3D!
                const nAbove = fbm5Octaves(u, v - 0.14);
                const topLight = Math.max(0, Math.min(1, (density - (nAbove - 0.28) * 2.25 * falloff) * 2.4 + (0.48 - py / H) * 0.75));
                const bellyShadow = Math.max(0, Math.min(1, (py / H - 0.35) * 1.45));

                const r = midRGB[0] * (1 - bellyShadow) + shadowRGB[0] * bellyShadow + (rimRGB[0] - midRGB[0]) * topLight;
                const g = midRGB[1] * (1 - bellyShadow) + shadowRGB[1] * bellyShadow + (rimRGB[1] - midRGB[1]) * topLight;
                const b = midRGB[2] * (1 - bellyShadow) + shadowRGB[2] * bellyShadow + (rimRGB[2] - midRGB[2]) * topLight;

                const idx = (py * W + px) * 4;
                data[idx]     = Math.min(255, Math.max(0, r | 0));
                data[idx + 1] = Math.min(255, Math.max(0, g | 0));
                data[idx + 2] = Math.min(255, Math.max(0, b | 0));
                data[idx + 3] = Math.min(255, (Math.pow(density, 0.82) * 235) | 0);
            }
        }
        ctx.putImageData(imgData, 0, 0);
        return c;
    };

    // 4 Biển Mây 3D FBM với Normal Rim-Lighting chuẩn Celestia Genshin Impact
    atlas.cloudGold    = buildFBMVolumetricCloudSprite([255, 252, 225], [245, 190, 82],  [52, 34, 48],  11.3);
    atlas.cloudRose    = buildFBMVolumetricCloudSprite([255, 235, 245], [228, 105, 158], [28, 22, 46],  27.8);
    atlas.cloudEmerald = buildFBMVolumetricCloudSprite([230, 255, 245], [52, 198, 152],  [10, 38, 36],  43.1);
    atlas.cloudAstral  = buildFBMVolumetricCloudSprite([235, 248, 255], [96, 165, 250],  [18, 24, 58],  64.5);

    // 7. TRĂNG RẰM HOÀNG KIM CÓ VÂN ĐÁ QUÝ FBM SHADER (Textured Celestial Full Moon - 256x256)
    {
        const { c, ctx } = makeCanvas(256, 256);
        const cx = 128, cy = 128, r = 82;
        const corona = ctx.createRadialGradient(cx, cy, r * 0.82, cx, cy, 126);
        corona.addColorStop(0, 'rgba(255, 250, 220, 0.92)');
        corona.addColorStop(0.42, 'rgba(255, 204, 112, 0.42)');
        corona.addColorStop(1, 'rgba(255, 182, 208, 0)');
        ctx.fillStyle = corona;
        ctx.beginPath();
        ctx.arc(cx, cy, 126, 0, Math.PI * 2);
        ctx.fill();

        const mGrad = ctx.createRadialGradient(cx - 22, cy - 22, 8, cx, cy, r);
        mGrad.addColorStop(0, '#ffffff');
        mGrad.addColorStop(0.45, '#fff9e2');
        mGrad.addColorStop(0.82, '#ffe094');
        mGrad.addColorStop(1, '#f5b041');
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = mGrad;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

        const maria = [
            { x: cx - 24, y: cy - 12, rx: 28, ry: 20, rot: 0.3 },
            { x: cx + 16, y: cy - 24, rx: 22, ry: 16, rot: -0.4 },
            { x: cx + 22, y: cy + 14, rx: 26, ry: 22, rot: 0.5 },
            { x: cx - 12, y: cy + 28, rx: 18, ry: 14, rot: -0.2 }
        ];
        for (let m = 0; m < maria.length; m++) {
            const mr = maria[m];
            const mg = ctx.createRadialGradient(mr.x, mr.y, 2, mr.x, mr.y, mr.rx);
            mg.addColorStop(0, 'rgba(198, 138, 56, 0.32)');
            mg.addColorStop(1, 'rgba(198, 138, 56, 0)');
            ctx.fillStyle = mg;
            ctx.beginPath();
            ctx.ellipse(mr.x, mr.y, mr.rx, mr.ry, mr.rot, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        atlas.fullMoon = c;
    }

    _u3dLuxuryAtlas = atlas;
    return atlas;
}

// Hàm vẽ các thực thể Vật Lý 3D trên 2 lớp Canvas (Sau thiệp & Trước thiệp) với Texture Kim Hoàn Pre-Baked
function draw3DProjectedParticle(ctx, p, cx, cy, focal) {
    const depth = focal - p.z;
    if (depth <= 80) return;
    const scale = focal / depth;
    const sx = cx + p.x * scale;
    const sy = cy + p.y * scale;
    const atlas = getU3DLuxurySpriteAtlas();

    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(scale, scale);
    ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));

    if (p.type === 'shard') {
        ctx.rotate(p.rz);
        ctx.scale(Math.max(0.24, Math.cos(p.rx)), Math.max(0.24, Math.sin(p.ry)));
        const s = p.size;
        // Mảnh pha lê/vàng 24K đa giác có mặt cắt ánh kim 2 tông
        ctx.fillStyle = p.color || '#f5c242';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.85, -s * 0.2);
        ctx.lineTo(s * 0.5, s * 0.9);
        ctx.lineTo(-s * 0.7, s * 0.6);
        ctx.lineTo(-s * 0.9, -s * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Mặt phản quang sáng trắng bên trong mảnh vỡ
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.85);
        ctx.lineTo(s * 0.65, -s * 0.15);
        ctx.lineTo(0, s * 0.25);
        ctx.closePath();
        ctx.fill();
    } else if (p.type === 'butterfly') {
        const heading = Math.atan2(p.vy, p.vx) + Math.PI / 2;
        ctx.rotate(heading * 0.35 + Math.sin(p.phase * 0.5) * 0.2);
        const wingCos = Math.max(0.14, Math.abs(Math.cos(p.flapPhase)));
        const s = p.size;
        const wingSprite = p.isGold ? atlas.butterflyWingGold : atlas.butterflyWingRose;
        const drawScale = s / 48;

        [-1, 1].forEach(dir => {
            ctx.save();
            ctx.scale(dir * wingCos * drawScale, drawScale);
            ctx.drawImage(wingSprite, -18, -68);
            ctx.restore();
        });

        // Thân bướm kim hoàn 3D & râu vàng
        ctx.fillStyle = '#fff3b0';
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.max(1.5, s * 0.09), s * 0.36, 0, 0, Math.PI * 2);
        ctx.fill();
    } else if (p.type === 'petal') {
        ctx.rotate(p.rz);
        const tiltX = Math.max(0.28, Math.abs(Math.cos(p.rx)));
        const tiltY = Math.max(0.32, Math.abs(Math.sin(p.ry)));
        ctx.scale(tiltX, tiltY);
        const s = p.size;
        const sprite = p.isSakura ? atlas.sakuraPetal : atlas.camelliaPetal;
        const drawR = s * 1.35;
        ctx.drawImage(sprite, -drawR, -drawR, drawR * 2, drawR * 2);
    } else if (p.type === 'pearl') {
        const drawR = p.size * 1.28;
        ctx.drawImage(atlas.pearl, -drawR, -drawR, drawR * 2, drawR * 2);
    } else if (p.type === 'diamond') {
        ctx.rotate(p.rz);
        const turnX = Math.max(0.48, Math.abs(Math.cos(p.ry)));
        const s = p.size;
        const drawR = s * 1.42;

        ctx.save();
        ctx.scale(turnX, 1);
        ctx.drawImage(atlas.diamond, -drawR, -drawR, drawR * 2, drawR * 2);
        ctx.restore();

        // Tia chớp lấp lánh 4 cánh mảnh ở đỉnh viên kim cương
        const glint = 0.55 + 0.45 * Math.sin(p.phase * 2.5);
        const gs = s * 0.85 * glint;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.42 - gs);
        ctx.lineTo(gs * 0.14, -s * 0.42 - gs * 0.14);
        ctx.lineTo(gs, -s * 0.42);
        ctx.lineTo(gs * 0.14, -s * 0.42 + gs * 0.14);
        ctx.lineTo(0, -s * 0.42 + gs);
        ctx.lineTo(-gs * 0.14, -s * 0.42 + gs * 0.14);
        ctx.lineTo(-gs, -s * 0.42);
        ctx.lineTo(-gs * 0.14, -s * 0.42 - gs * 0.14);
        ctx.closePath();
        ctx.fill();
    } else if (p.type === 'bokeh') {
        const r = p.size;
        ctx.fillStyle = p.bokehColor || 'rgba(255, 232, 156, 0.38)';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 250, 224, 0.52)';
        ctx.lineWidth = 0.85;
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
        ctx.beginPath();
        ctx.arc(-r * 0.22, -r * 0.22, r * 0.36, 0, Math.PI * 2);
        ctx.fill();
    } else if (p.type === 'star') {
        if (p.hasTrail && (Math.abs(p.vx) + Math.abs(p.vy) > 40)) {
            const ang = Math.atan2(p.vy, p.vx);
            ctx.save();
            ctx.rotate(ang);
            ctx.strokeStyle = 'rgba(255, 232, 142, 0.38)';
            ctx.lineWidth = p.size * 0.56;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-p.size * 4.2, 0);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.lineWidth = p.size * 0.22;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-p.size * 2.8, 0);
            ctx.stroke();
            ctx.restore();
        }
        ctx.rotate(p.rz);
        const s = p.size;
        // Hào quang tâm sao
        ctx.fillStyle = 'rgba(255, 230, 128, 0.38)';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.72, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fffef5';
        ctx.strokeStyle = p.color || '#f5c242';
        ctx.lineWidth = 0.95;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.18, -s * 0.18);
        ctx.lineTo(s, 0);
        ctx.lineTo(s * 0.18, s * 0.18);
        ctx.lineTo(0, s);
        ctx.lineTo(-s * 0.18, s * 0.18);
        ctx.lineTo(-s, 0);
        ctx.lineTo(-s * 0.18, -s * 0.18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    ctx.restore();
}

// Vẽ Vòng Quỹ Đạo Thiên Văn Khắc Vạch Độ & Chòm Sao 3D (Engraved Astrolabe Gyroscope Ring)
function drawSplit3DRing(ctxBack, ctxFront, ring, cx, cy, focal, cardZ) {
    if (ring.alpha <= 0.01) return;
    const steps = 64;
    const cosX = Math.cos(ring.rx), sinX = Math.sin(ring.rx);
    const cosY = Math.cos(ring.ry), sinY = Math.sin(ring.ry);
    const cosZ = Math.cos(ring.rz), sinZ = Math.sin(ring.rz);

    const pts = [];
    for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const x0 = Math.cos(a) * ring.radius;
        const y0 = Math.sin(a) * ring.radius;

        const y1 = y0 * cosX;
        const z1 = y0 * sinX;
        const x1 = x0;

        const x2 = x1 * cosY + z1 * sinY;
        const z2 = -x1 * sinY + z1 * cosY;
        const y2 = y1;

        const x3 = x2 * cosZ - y2 * sinZ + ring.cx;
        const y3 = x2 * sinZ + y2 * cosZ + ring.cy;
        const z3 = z2 + ring.cz;

        const depth = Math.max(120, focal - z3);
        const s = focal / depth;
        pts.push({
            sx: cx + x3 * s,
            sy: cy + y3 * s,
            z: z3,
            s
        });
    }

    [
        { ctx: ctxBack, isFront: false },
        { ctx: ctxFront, isFront: true }
    ].forEach(({ ctx, isFront }) => {
        ctx.save();
        // 1. Dải chỉ vàng kim liên kết chòm sao (Engraved Celestial Filigree Arc)
        ctx.lineCap = 'round';
        for (let i = 1; i < pts.length; i++) {
            const p0 = pts[i - 1];
            const p1 = pts[i];
            const belongs = isFront ? (p1.z >= cardZ) : (p1.z < cardZ);
            if (!belongs) continue;
            if (ring.dashed && i % 3 === 0) continue;
            ctx.globalAlpha = Math.max(0, Math.min(1, ring.alpha * 0.42));
            ctx.strokeStyle = ring.color;
            ctx.lineWidth = Math.max(0.8, ring.lineWidth * p1.s * 0.65);
            ctx.beginPath();
            ctx.moveTo(p0.sx, p0.sy);
            ctx.lineTo(p1.sx, p1.sy);
            ctx.stroke();
        }

        // 2. Các nút tinh tú & hạt kim hoàn đính dọc trên vành thiên văn
        for (let i = 0; i < pts.length - 1; i += 2) {
            const p = pts[i];
            const belongs = isFront ? (p.z >= cardZ) : (p.z < cardZ);
            if (!belongs) continue;
            const isMajorNode = i % 8 === 0;
            const wave = 0.5 + 0.5 * Math.sin((i / pts.length) * Math.PI * 4 + ring.rz * 2);
            const rSize = (ring.lineWidth * (isMajorNode ? 1.55 : 0.95)) * (0.7 + 0.45 * wave) * p.s;

            ctx.globalAlpha = Math.max(0, Math.min(1, ring.alpha * 0.30 * wave));
            ctx.fillStyle = ring.glowColor || ring.color;
            ctx.beginPath();
            ctx.arc(p.sx, p.sy, rSize * 2.3, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = Math.max(0, Math.min(1, ring.alpha * (0.65 + 0.35 * wave)));
            ctx.fillStyle = isMajorNode ? '#ffffff' : ring.color;
            ctx.beginPath();
            ctx.arc(p.sx, p.sy, rSize * 0.92, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    });
}

// Vẽ Dải Lụa Satin Thêu Chỉ Vàng 24K 3D (3D Woven Silk Satin & Gold-Thread Ribbon Streamer)
function drawSplit3DRibbonHelix(ctxBack, ctxFront, ribbon, cx, cy, focal, cardZ) {
    if (ribbon.alpha <= 0.01) return;
    const segs = 38;
    const pts = [];
    for (let i = 0; i <= segs; i++) {
        const u = i / segs;
        if (u > ribbon.progress) break;
        const theta = ribbon.baseAngle + u * Math.PI * 3.2 + ribbon.phase;
        const rad = ribbon.startRadius * (1 - u * 0.25) + Math.sin(u * Math.PI) * 55;
        const wx = ribbon.originX + Math.cos(theta) * rad;
        const wy = ribbon.originY - u * ribbon.heightSpan + Math.sin(u * Math.PI * 2) * 18;
        const wz = Math.sin(theta) * rad;

        const depth = Math.max(120, focal - wz);
        const s = focal / depth;
        // Độ nghiêng mặt lụa theo góc xoắn 3D để tạo hiệu ứng lụa lật mặt (3D Twist Ribbon Width)
        const ribbonTwist = 0.38 + 0.62 * Math.abs(Math.cos(theta * 0.85));
        pts.push({
            sx: cx + wx * s,
            sy: cy + wy * s,
            z: wz,
            w: (15 * (1 - u * 0.42)) * s * ribbonTwist,
            sheen: Math.pow(Math.max(0, Math.sin(theta)), 2)
        });
    }

    [
        { ctx: ctxBack, isFront: false },
        { ctx: ctxFront, isFront: true }
    ].forEach(({ ctx, isFront }) => {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 1; i < pts.length; i++) {
            const p0 = pts[i - 1];
            const p1 = pts[i];
            const belongs = isFront ? (p1.z >= cardZ) : (p1.z < cardZ);
            if (!belongs) continue;

            // 1. Viền chỉ vàng kim 24K hai bên mép dải lụa
            ctx.globalAlpha = Math.max(0, Math.min(1, ribbon.alpha * 0.92));
            ctx.strokeStyle = '#ffd54f';
            ctx.lineWidth = p1.w + 2.4;
            ctx.beginPath();
            ctx.moveTo(p0.sx, p0.sy);
            ctx.lineTo(p1.sx, p1.sy);
            ctx.stroke();

            // 2. Thân lụa satin chính
            ctx.strokeStyle = ribbon.color;
            ctx.lineWidth = p1.w;
            ctx.beginPath();
            ctx.moveTo(p0.sx, p0.sy);
            ctx.lineTo(p1.sx, p1.sy);
            ctx.stroke();

            // 3. Bóng phản quang lụa (Satin Specular Highlight khi mặt lụa đón ánh sáng)
            ctx.globalAlpha = Math.max(0, Math.min(1, ribbon.alpha * (0.35 + 0.60 * p1.sheen)));
            ctx.strokeStyle = '#fff8dc';
            ctx.lineWidth = Math.max(1.1, p1.w * 0.34);
            ctx.beginPath();
            ctx.moveTo(p0.sx, p0.sy);
            ctx.lineTo(p1.sx, p1.sy);
            ctx.stroke();
        }
        ctx.restore();
    });
}

// Vẽ Hiệu Ứng Khởi Động / Tụ Năng Lượng Hồi Hộp quanh Con Dấu Sáp theo từng chế độ (0.00s -> 0.88s)
function drawSealWindupEffect(ctx, modeId, w, cx, cy, sealScreenY) {
    if (w <= 0 || w >= 1) return;
    ctx.save();
    ctx.translate(cx, sealScreenY);

    const fadeOut = w > 0.84 ? (1 - w) / 0.16 : 1;
    const baseAlpha = Math.min(1, w * 2.5) * fadeOut;

    // Vầng hào quang năng lượng ấm áp lan tỏa từ tâm ấn sáp (không dùng vòng kẻ nét đứt)
    const auraR = 46 + Math.sin(w * Math.PI) * 28;
    ctx.globalAlpha = baseAlpha * 0.26;
    ctx.fillStyle = '#ffe58f';
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, Math.PI * 2);
    ctx.fill();

    if (modeId === 'bloom') {
        // Đại Hoa Trà: 2 tầng cánh hoa trà hồng-vàng bung nở xoay quanh ấn sáp
        ctx.rotate(w * Math.PI * 1.8);
        const petalCount = 8;
        const ringR = 36 + Math.sin(w * Math.PI) * 16;
        for (let i = 0; i < petalCount; i++) {
            const a = (i / petalCount) * Math.PI * 2;
            ctx.save();
            ctx.rotate(a);
            ctx.globalAlpha = baseAlpha * 0.85;
            ctx.fillStyle = i % 2 === 0 ? '#ff80ab' : '#ffd54f';
            ctx.beginPath();
            ctx.moveTo(0, -ringR + 10);
            ctx.bezierCurveTo(-9, -ringR, -8, -ringR - 14, 0, -ringR - 18);
            ctx.bezierCurveTo(8, -ringR - 14, 9, -ringR, 0, -ringR + 10);
            ctx.fill();
            ctx.restore();
        }
    } else if (modeId === 'butterflies') {
        // Hồ Điệp Vàng: Đôi cánh ánh kim khổng lồ vỗ nhịp nhàng hai bên ấn sáp trước khi hóa đàn bướm bay lên
        const wingFlap = Math.max(0.18, Math.abs(Math.cos(w * Math.PI * 9.5)));
        const span = (44 + w * 38);
        ctx.globalAlpha = baseAlpha * 0.85;
        ctx.strokeStyle = '#fff59d';
        ctx.fillStyle = 'rgba(255, 213, 79, 0.34)';
        ctx.lineWidth = 1.8;

        [-1, 1].forEach(dir => {
            ctx.save();
            ctx.scale(dir * wingFlap, 1);
            ctx.beginPath();
            ctx.moveTo(0, -6);
            ctx.bezierCurveTo(span * 0.65, -span * 1.05, span * 1.25, -span * 0.5, span * 0.92, span * 0.12);
            ctx.bezierCurveTo(span * 0.65, span * 0.35, span * 0.25, span * 0.2, 0, span * 0.08);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, span * 0.08);
            ctx.bezierCurveTo(span * 0.7, span * 0.28, span * 0.82, span * 0.9, span * 0.38, span * 0.95);
            ctx.bezierCurveTo(span * 0.15, span * 0.95, span * 0.05, span * 0.5, 0, span * 0.2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        });
    } else if (modeId === 'ribbon') {
        // Ruy-Băng Lụa: Cánh nơ lụa hồng hoàng gia & chuỗi hạt ngọc trai phát sáng xoay hội tụ
        ctx.rotate(w * Math.PI * 1.6);
        const pearlCount = 10;
        const r = 42 + Math.sin(w * Math.PI) * 14;
        for (let i = 0; i < pearlCount; i++) {
            const a = (i / pearlCount) * Math.PI * 2;
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r;
            ctx.globalAlpha = baseAlpha * 0.35;
            ctx.fillStyle = '#ff80ab';
            ctx.beginPath();
            ctx.arc(px, py, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = baseAlpha * 0.92;
            ctx.fillStyle = i % 2 === 0 ? '#fff9e6' : '#ffb2c9';
            ctx.beginPath();
            ctx.arc(px, py, 4.2, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (modeId === 'galaxy') {
        // Ngân Hà Sao: Chòm sao 4 cánh lấp lánh xoáy hội tụ vào tâm ấn sáp
        ctx.rotate(w * Math.PI * 2.8);
        const starCount = 8;
        const r = 58 - w * 18;
        for (let i = 0; i < starCount; i++) {
            const a = (i / starCount) * Math.PI * 2;
            ctx.save();
            ctx.rotate(a);
            ctx.translate(0, -r);
            const s = (i % 2 === 0 ? 11 : 7) * (0.7 + 0.3 * Math.sin(w * 12 + i));
            ctx.globalAlpha = baseAlpha * 0.92;
            ctx.fillStyle = i % 2 === 0 ? '#ffe58f' : '#80deea';
            ctx.beginPath();
            ctx.moveTo(0, -s);
            ctx.lineTo(s * 0.24, -s * 0.24);
            ctx.lineTo(s, 0);
            ctx.lineTo(s * 0.24, s * 0.24);
            ctx.lineTo(0, s);
            ctx.lineTo(-s * 0.24, s * 0.24);
            ctx.lineTo(-s, 0);
            ctx.lineTo(-s * 0.24, -s * 0.24);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    } else if (modeId === 'sakura') {
        // Lốc Anh Đào: 5 cánh hoa anh đào 3D hồng phấn xoáy tròn quanh ấn sáp
        ctx.rotate(w * Math.PI * 3.2);
        const petals = 5;
        const ringR = 38 + Math.sin(w * Math.PI) * 14;
        for (let i = 0; i < petals; i++) {
            ctx.save();
            ctx.rotate((i / petals) * Math.PI * 2);
            ctx.translate(0, -ringR);
            ctx.rotate(0.45);
            ctx.globalAlpha = baseAlpha * 0.88;
            ctx.fillStyle = '#ffb2c9';
            const s = 9.5;
            ctx.beginPath();
            ctx.moveTo(0, s);
            ctx.bezierCurveTo(-s * 0.85, s * 0.3, -s * 0.75, -s * 0.75, -s * 0.22, -s);
            ctx.lineTo(0, -s * 0.65);
            ctx.lineTo(s * 0.22, -s);
            ctx.bezierCurveTo(s * 0.75, -s * 0.75, s * 0.85, s * 0.3, 0, s);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    } else if (modeId === 'hearts') {
        // Kim Cương Sao: Viên pha lê 8 cạnh & tia sao khúc xạ lấp lánh (không vẽ khung dây thô)
        ctx.rotate(w * Math.PI * 1.5);
        const gemCount = 8;
        const r = 42 + Math.sin(w * Math.PI * 2) * 10;
        for (let i = 0; i < gemCount; i++) {
            ctx.save();
            ctx.rotate((i / gemCount) * Math.PI * 2);
            ctx.translate(0, -r);
            const s = i % 2 === 0 ? 9 : 6.5;
            ctx.globalAlpha = baseAlpha * 0.9;
            ctx.fillStyle = i % 2 === 0 ? '#e0f7fa' : '#ffd54f';
            ctx.beginPath();
            ctx.moveTo(0, -s * 1.3);
            ctx.lineTo(s * 0.75, 0);
            ctx.lineTo(0, s * 1.3);
            ctx.lineTo(-s * 0.75, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    ctx.restore();
}

// Vẽ Biểu Tượng Kim Hoàn 3D Kết Tinh ở tâm màn hình (Sử dụng Pre-Baked Luxury Sprite Atlas sống động tuyệt đối!)
function drawSummonCenterMotif(ctx, modeId, t, cx, cy) {
    const atlas = getU3DLuxurySpriteAtlas();
    ctx.save();
    ctx.translate(cx, cy);

    const pulse = 1 + Math.sin(t * 4.5) * 0.10;
    // 1. Hào quang lõi kim hoàn đa lớp
    const coreGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 88 * pulse);
    coreGrad.addColorStop(0, 'rgba(255, 253, 232, 0.92)');
    coreGrad.addColorStop(0.32, 'rgba(255, 224, 130, 0.48)');
    coreGrad.addColorStop(0.68, 'rgba(244, 143, 177, 0.22)');
    coreGrad.addColorStop(1, 'rgba(244, 143, 177, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 88 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // 2. Vòng Pháp Trận Tinh Tú Khắc Vàng 24K (Engraved 24K Gold Filigree Mandala)
    for (let k = 0; k < 3; k++) {
        ctx.save();
        ctx.rotate(t * (k % 2 === 0 ? 2.4 : -1.9) + (k * Math.PI * 2) / 3);
        ctx.globalAlpha = 0.88 - k * 0.16;
        ctx.strokeStyle = k === 0 ? '#fff4b8' : (k === 1 ? '#f5c242' : '#ff9ebb');
        ctx.lineWidth = 2.4 - k * 0.4;
        ctx.lineCap = 'round';
        const rad = 48 + k * 14;
        ctx.beginPath();
        ctx.arc(0, 0, rad, 0, Math.PI * 0.78);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, rad, Math.PI, Math.PI * 1.78);
        ctx.stroke();

        // Điểm ngọc trai trên vành pháp trận
        ctx.drawImage(atlas.pearl, rad - 6, -6, 12, 12);
        ctx.drawImage(atlas.pearl, -rad - 6, -6, 12, 12);
        ctx.restore();
    }

    // 3. Biểu tượng chủ đề 3D với Texture Kim Hoàn / Nhung Lụa thật ở chính tâm
    ctx.globalAlpha = 0.98;
    if (modeId === 'butterflies') {
        const wingCos = Math.max(0.18, Math.abs(Math.cos(t * 11)));
        const drawScale = (38 * pulse) / 48;
        ctx.rotate(Math.sin(t * 2.5) * 0.18);
        [-1, 1].forEach(dir => {
            ctx.save();
            ctx.scale(dir * wingCos * drawScale, drawScale);
            ctx.drawImage(atlas.butterflyWingGold, -18, -68);
            ctx.restore();
        });
        ctx.fillStyle = '#fff3b0';
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.2, 14 * pulse, 0, 0, Math.PI * 2);
        ctx.fill();
    } else if (modeId === 'hearts') {
        ctx.rotate(Math.sin(t * 2.2) * 0.22);
        const drawR = 42 * pulse;
        ctx.drawImage(atlas.diamond, -drawR, -drawR, drawR * 2, drawR * 2);
    } else if (modeId === 'galaxy') {
        ctx.rotate(t * 1.8);
        const s = 34 * pulse;
        for (let k = 0; k < 2; k++) {
            ctx.save();
            if (k === 1) ctx.rotate(Math.PI / 4);
            ctx.fillStyle = k === 0 ? '#ffffff' : '#ffd700';
            ctx.strokeStyle = '#7dd3fc';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(0, -s);
            ctx.quadraticCurveTo(5, -5, s, 0);
            ctx.quadraticCurveTo(5, 5, 0, s);
            ctx.quadraticCurveTo(-5, 5, -s, 0);
            ctx.quadraticCurveTo(-5, -5, 0, -s);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
        ctx.drawImage(atlas.pearl, -10, -10, 20, 20);
    } else if (modeId === 'ribbon') {
        ctx.rotate(Math.sin(t * 3) * 0.15);
        const s = 28 * pulse;
        // 4 cánh nơ lụa satin ánh kim + chuỗi ngọc trai Nam Hải
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + t * 1.5;
            ctx.drawImage(atlas.pearl, Math.cos(a) * 32 - 8, Math.sin(a) * 32 - 8, 16, 16);
        }
        [-1, 1].forEach(dir => {
            ctx.save();
            ctx.scale(dir, 1);
            ctx.drawImage(atlas.camelliaPetal, 4, -22, 34, 34);
            ctx.restore();
        });
        ctx.drawImage(atlas.pearl, -14, -14, 28, 28);
    } else {
        // bloom hoặc sakura: Đóa Đại Hoa Trà 8 cánh nhung đỏ hoặc Hoa Anh Đào 5 cánh pha lê nở bung đa lớp
        ctx.rotate(t * 1.35);
        const petals = modeId === 'sakura' ? 5 : 8;
        const sprite = modeId === 'sakura' ? atlas.sakuraPetal : atlas.camelliaPetal;
        const pSize = (modeId === 'sakura' ? 26 : 24) * pulse;
        for (let i = 0; i < petals; i++) {
            ctx.save();
            ctx.rotate((i / petals) * Math.PI * 2);
            ctx.translate(0, -pSize * 0.62);
            ctx.drawImage(sprite, -pSize, -pSize, pSize * 2, pSize * 2);
            ctx.restore();
        }
        ctx.drawImage(atlas.pearl, -11, -11, 22, 22);
    }

    ctx.restore();
}


// Trạng thái sẵn sàng 100% của ảnh thiệp người nhận (Chống tuyệt đối hiện tượng mở ra ảnh đen hoặc icon lỗi ảnh)
window.isRecipientCardImageReady = false;

// ====== ĐẠO DIỄN SÂN KHẤU PHONG BÌ VẬT LÝ 3D HỢP NHẤT ======
window.launchUnified3DEnvelopeDirector = function (options = {}) {
    const {
        autoOpen = false,
        autoOpenDelay = 320,
        title = '',
        motionId = window.currentMotionEffect || 'bloom',
        themeKey = currentColorTheme || 'emerald',
        isRealRecipient = window.isRecipientCardLinkMode || false,
        isStep2Preview = false,
        waitForCardReady = false,
        skyOracleMode = false,
        onComplete = null
    } = options;

    const stage = document.getElementById('u3d-envelope-stage');
    const backdrop = document.getElementById('u3d-backdrop');
    const backRig = document.getElementById('u3d-env-back-rig');
    const frontRig = document.getElementById('u3d-env-front-rig');
    const floorShadow = document.getElementById('u3d-env-floor-shadow');
    const flapFront = document.getElementById('u3d-flap-front-actor');
    const flapBack = document.getElementById('u3d-flap-back-actor');
    const pocketLight = document.getElementById('u3d-pocket-light');
    const pocketBloomCore = document.getElementById('u3d-pocket-bloom-core');
    const sealBtn = document.getElementById('u3d-seal-btn');
    const sealEmblem = document.getElementById('u3d-seal-emblem');
    const ribbonStraps = document.getElementById('u3d-ribbon-straps');
    const cardActor = document.getElementById('u3d-card-actor');
    const cardInner = document.getElementById('u3d-card-inner');
    const cardImg = document.getElementById('u3d-card-img');
    const cardSpecular = document.getElementById('u3d-card-specular');
    const backSpecular = document.getElementById('u3d-back-specular');
    const canvasBack = document.getElementById('u3d-canvas-back');
    const canvasFront = document.getElementById('u3d-canvas-front');

    if (!stage || !backRig || !frontRig || !cardActor || !canvasBack || !canvasFront) return;

    // Hủy vòng lặp cũ nếu đang chạy
    if (u3dAnimFrameId) {
        cancelAnimationFrame(u3dAnimFrameId);
        u3dAnimFrameId = null;
    }
    if (u3dAutoOpenTimerId) {
        clearTimeout(u3dAutoOpenTimerId);
        u3dAutoOpenTimerId = null;
    }

    u3dActiveOnComplete = onComplete;
    setMotionEffect(motionId, false);
    applyEnvelopeThemeColors(themeKey);

    const cfg = MOTION_EFFECTS_CONFIG[motionId] || MOTION_EFFECTS_CONFIG.bloom;
    stage.setAttribute('data-motion', cfg.id);
    stage.setAttribute('data-theme', themeKey);
    document.body.setAttribute('data-recipient-theme', themeKey);

    // Ẩn tuyệt đối 100% các nút chức năng bên dưới trong lúc đang ở màn hình Bì Thư 3D
    document.body.classList.add('u3d-stage-active');
    document.body.classList.toggle('step2-previewing-3d', !!isStep2Preview);

    // Đồng bộ giao diện Bước 3 nằm ngay bên dưới sân khấu 3D để đo tọa độ đích 1 lần duy nhất
    window.isEnvelopeGiftMode = true;
    window.isRecipientCardLinkMode = !!isRealRecipient;
    document.body.classList.toggle('recipient-mode', !!isRealRecipient);

    const creatorTopbar = document.getElementById('creator-topbar');
    const creatorQuickBar = document.getElementById('creator-quick-bar');
    const recipientLuxuryDock = document.getElementById('recipient-luxury-dock');
    const dlLabel = document.getElementById('download-btn-label');
    const backStep2Btn = document.getElementById('back-step2-btn');
    const step3MainTitle = document.getElementById('step3-main-title');
    const step3FloatingBadge = document.getElementById('step3-floating-badge');
    const openShareLinkModalBtn = document.getElementById('open-share-link-modal-btn');

    if (isStep2Preview) {
        if (creatorTopbar) creatorTopbar.style.display = 'none';
        if (creatorQuickBar) creatorQuickBar.style.display = 'none';
        if (recipientLuxuryDock) recipientLuxuryDock.style.display = 'none';
    } else if (isRealRecipient) {
        if (creatorTopbar) creatorTopbar.style.display = 'none';
        if (creatorQuickBar) creatorQuickBar.style.display = 'none';
        if (recipientLuxuryDock) recipientLuxuryDock.style.display = 'flex';
        if (dlLabel) dlLabel.textContent = 'Lưu thiệp';
    } else if (window.isSelfOracleMode) {
        // Chế độ "Lời chúc dành cho bạn": Mọi thứ ngẫu nhiên 100%, ẩn thanh sửa nhanh, giữ nút Lưu link xem lại & Mở lại
        if (creatorTopbar) creatorTopbar.style.display = 'grid';
        if (creatorQuickBar) creatorQuickBar.style.display = 'none';
        if (recipientLuxuryDock) recipientLuxuryDock.style.display = 'none';
        if (step3FloatingBadge) step3FloatingBadge.style.display = 'none';
        if (backStep2Btn) backStep2Btn.innerHTML = '✉️ Mở lại';
        if (step3MainTitle) step3MainTitle.textContent = '✨ Dành Cho Bạn 🌸';
        if (openShareLinkModalBtn) openShareLinkModalBtn.innerHTML = '<span class="icon">🔗</span> Lưu link xem lại';
        if (dlLabel) dlLabel.textContent = 'Lưu ảnh';
    } else {
        if (creatorTopbar) creatorTopbar.style.display = 'grid';
        if (creatorQuickBar) creatorQuickBar.style.display = 'grid';
        if (recipientLuxuryDock) recipientLuxuryDock.style.display = 'none';
        if (step3FloatingBadge) step3FloatingBadge.style.display = '';
        if (backStep2Btn) backStep2Btn.innerHTML = '‹ Sửa thiệp';
        if (step3MainTitle) step3MainTitle.textContent = '✨ Thiệp 20/10 🌸';
        if (openShareLinkModalBtn) openShareLinkModalBtn.innerHTML = '<span class="icon">🔗</span> Tạo link gửi tặng';
        if (dlLabel) dlLabel.textContent = 'Lưu ảnh';
    }

    step1?.classList.remove('active');
    step2?.classList.remove('active', 'step2-preloading', 'step2-morph-from');
    step3?.classList.add('active');
    fitCardShowcaseToWrap();

    // Giữ #card-showcase ở mức opacity 0.001 (thay vì 0) để trình duyệt di động luôn giữ sẵn texture ảnh trên GPU, không bao giờ bị chớp màn hình khi bàn giao!
    if (cardShowcase) {
        cardShowcase.classList.remove('is-tilting');
        cardShowcase.style.opacity = '0.001';
        cardShowcase.style.transform = 'translate3d(0, 0, 0) scale(1)';
    }
    if (cardSpecular) {
        cardSpecular.style.opacity = '0';
    }

    // Đồng bộ ảnh mặt trước của tấm thiệp 3D nằm trong phong bì (Chỉ gán khi đã có ảnh thật hợp lệ)
    if (cardImg && !isRealRecipient) {
        const finalSrc = finalResultImg ? finalResultImg.getAttribute('src') : '';
        if (finalSrc && !finalSrc.startsWith('data:image/gif')) {
            cardImg.src = finalResultImg.src;
        } else if (finalResultCanvas && finalResultCanvas.width > 0) {
            try {
                cardImg.src = finalResultCanvas.toDataURL('image/jpeg', 0.92);
            } catch (_) {}
        }
    }

    if (sealEmblem) {
        sealEmblem.innerHTML = getSealEmblemSVG(cfg.id);
        sealEmblem.style.transform = '';
    }
    if (pocketBloomCore) {
        pocketBloomCore.innerHTML = cfg.id === 'bloom' ? buildPocketBloomCamelliaSVG() : '';
        pocketBloomCore.style.opacity = '0';
        pocketBloomCore.style.transform = 'scale(0.15)';
    }

    // Kiểm tra xem cần chạy Pha Triệu Hồi 3D (Summoning) chờ tải xong ảnh thiệp trước khi hiện Phong Bì & Ấn Sáp hay không
    const needSummonPrelude = !!(waitForCardReady || (isRealRecipient && !window.isRecipientCardImageReady));

    stage.classList.remove('is-summoning', 'is-arriving', 'is-opening', 'pocket-cleared', 'handing-off');
    stage.style.display = 'block';
    if (backdrop) backdrop.style.opacity = '0';
    if (flapFront) {
        flapFront.style.display = 'block';
        flapFront.style.transform = 'perspective(1200px) rotateX(0deg)';
    }
    if (flapBack) {
        flapBack.style.display = 'none';
        flapBack.style.transform = 'perspective(1200px) rotateX(180deg)';
    }
    if (pocketLight) {
        pocketLight.style.opacity = '0';
        pocketLight.style.transform = 'scaleY(0.2) scaleX(0.6)';
    }
    const strapEls = {
        hL: ribbonStraps ? ribbonStraps.querySelector('.u3d-strap-h-left') : null,
        hR: ribbonStraps ? ribbonStraps.querySelector('.u3d-strap-h-right') : null,
        vT: ribbonStraps ? ribbonStraps.querySelector('.u3d-strap-v-top') : null,
        vB: ribbonStraps ? ribbonStraps.querySelector('.u3d-strap-v-bottom') : null
    };
    Object.values(strapEls).forEach(s => {
        if (s) {
            s.style.transform = '';
            s.style.opacity = '1';
        }
    });

    // Chuẩn bị 2 lớp Canvas Vật Lý 3D (Giới hạn dpr <= 1.5 để đạt tốc độ 60-120fps mượt tuyệt đối trên điện thoại)
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let curVw = window.innerWidth;
    let curVh = window.innerHeight;
    canvasBack.width = Math.round(curVw * dpr);
    canvasBack.height = Math.round(curVh * dpr);
    canvasFront.width = Math.round(curVw * dpr);
    canvasFront.height = Math.round(curVh * dpr);
    const ctxBack = canvasBack.getContext('2d');
    const ctxFront = canvasFront.getContext('2d');

    // ĐO TỌA ĐỘ ĐÍCH #card-showcase MỘT LẦN DUY NHẤT NGOÀI VÒNG LẶP ĐỂ CHỐNG REFLOW (LAYOUT THRASHING)
    let cachedTargetRect = null;
    let cachedEnvBaseW = 356;
    function measureTargetShowcaseOnce() {
        curVw = window.innerWidth;
        curVh = window.innerHeight;
        cachedEnvBaseW = (backRig && backRig.offsetWidth > 120)
            ? backRig.offsetWidth
            : Math.min(356, curVw * 0.86);
        if (cardShowcase) {
            cardShowcase.classList.remove('is-tilting');
            cardShowcase.style.transform = 'translate3d(0, 0, 0) scale(1)';
        }
        fitCardShowcaseToWrap();
        const rawRect = cardShowcase ? cardShowcase.getBoundingClientRect() : null;
        if (rawRect && rawRect.width > 40 && rawRect.height > rawRect.width * 1.3) {
            cachedTargetRect = {
                left: rawRect.left,
                top: rawRect.top,
                width: rawRect.width,
                height: rawRect.height
            };
        } else {
            const wrap = document.querySelector('.result-canvas-wrap');
            const wrapRect = wrap ? wrap.getBoundingClientRect() : null;
            if (wrapRect && wrapRect.width > 60 && wrapRect.height > 60) {
                const availW = wrapRect.width - 8;
                const availH = wrapRect.height - 6;
                let w = availH * FULL_CARD_ASPECT_RATIO;
                let h = availH;
                if (w > availW) {
                    w = availW;
                    h = availW / FULL_CARD_ASPECT_RATIO;
                }
                if (cardShowcase) {
                    cardShowcase.style.width = `${Math.floor(w)}px`;
                    cardShowcase.style.height = `${Math.floor(h)}px`;
                }
                cachedTargetRect = {
                    left: wrapRect.left + (wrapRect.width - w) * 0.5,
                    top: wrapRect.top + (wrapRect.height - h) * 0.5,
                    width: w,
                    height: h
                };
            } else {
                const fallbackH = Math.min(curVh * 0.72, 620);
                const fallbackW = fallbackH * FULL_CARD_ASPECT_RATIO;
                cachedTargetRect = {
                    left: (curVw - fallbackW) * 0.5,
                    top: (curVh - fallbackH) * 0.5,
                    width: fallbackW,
                    height: fallbackH
                };
            }
        }
        // Khóa cố định width/height của cardActor 1 lần duy nhất; mọi biến thiên kích thước dùng GPU scale()!
        cardActor.style.width = `${cachedTargetRect.width.toFixed(1)}px`;
        cardActor.style.height = `${cachedTargetRect.height.toFixed(1)}px`;
    }
    measureTargetShowcaseOnce();
    window.u3dRefreshTargetRect = measureTargetShowcaseOnce;

    // Các biến trạng thái Vật Lý 60fps:
    // - 'sky_oracle'    : Motion thuần 100% "Chờ đợi thông điệp từ trên trời" (hạt ngọc chân dung bay lên đỉnh trời -> cổng ánh sáng thiên hà + sóng tín hiệu hạ xuống, không dùng chữ)
    // - 'sky_descending': Bì thư 3D từ cổng trời lướt dọc cột sáng hạ xuống chính giữa sân khấu + Ấn Sáp Vàng giáng xuống đóng dấu
    // - 'summoning'     : Vũ điệu Motion 3D kết tinh (ẩn Phong Bì & Ấn Sáp trong lúc chờ tải xong ảnh 100%, không dùng chữ Loading)
    // - 'arriving'      : Ảnh đã sẵn sàng -> Phong Bì 3D lướt vào + Ấn Sáp Vàng giáng xuống đóng dấu sẵn sàng
    // - 'waiting'       : Phong Bì & Ấn Sáp đã sẵn sàng 100%, chờ người dùng chạm mở
    // - 'opening'       : Đang mở phong bì & rút thiệp 3D
    let summonStartTime = null;
    let arriveStartTime = null;
    let openStartTime = null;
    let lastFrameTime = null;
    let summonSpawnAccum = 0;
    let hasSpawnedArrivalStamp = false;

    if (skyOracleMode) {
        u3dCurrentDirectorState = 'sky_oracle';
        stage.classList.add('is-summoning');
        backRig.style.opacity = '0';
        frontRig.style.opacity = '0';
        frontRig.style.pointerEvents = 'none';
        if (sealBtn) {
            sealBtn.style.opacity = '0';
            sealBtn.style.pointerEvents = 'none';
            sealBtn.style.transform = 'translate3d(0, -40px, 0) scale(2.4)';
        }
    } else if (needSummonPrelude) {
        u3dCurrentDirectorState = 'summoning';
        stage.classList.add('is-summoning');
        backRig.style.opacity = '0';
        frontRig.style.opacity = '0';
        frontRig.style.pointerEvents = 'none';
        if (sealBtn) {
            sealBtn.style.opacity = '0';
            sealBtn.style.pointerEvents = 'none';
            sealBtn.style.transform = 'translate3d(0, -40px, 0) scale(2.4)';
        }
    } else if (!autoOpen) {
        u3dCurrentDirectorState = 'arriving';
        stage.classList.add('is-arriving');
        backRig.style.opacity = '0';
        frontRig.style.opacity = '0';
        frontRig.style.pointerEvents = 'none';
        if (sealBtn) {
            sealBtn.style.opacity = '0';
            sealBtn.style.pointerEvents = 'none';
            sealBtn.style.transform = 'translate3d(0, -40px, 0) scale(2.4)';
        }
    } else {
        u3dCurrentDirectorState = 'waiting';
        backRig.style.opacity = '1';
        frontRig.style.opacity = '1';
        frontRig.style.pointerEvents = 'none';
        if (sealBtn) {
            sealBtn.style.opacity = '1';
            sealBtn.style.pointerEvents = 'auto';
            sealBtn.style.transform = 'translate3d(0,0,0) scale(1)';
        }
    }

    u3dPointerTargetRotX = 0;
    u3dPointerTargetRotY = 0;
    u3dPointerCurRotX = 0;
    u3dPointerCurRotY = 0;

    // Biến vật lý Bản lề Nắp Thư (Damped Spring Oscillator)
    let flapAngle = 0;
    let flapVel = 0;

    // Danh sách thực thể Vật Lý 3D
    const particles = [];
    const rings3D = [];
    const ribbons3D = [];
    const escortButterflies = [];
    const summonRings = [
        { cx: 0, cy: 0, cz: 0, radius: 96, rx: 1.05, ry: 0.3, rz: 0, vrx: 0.7, vry: 1.6, vrz: 2.4, color: '#ffe898', glowColor: '#f5c242', lineWidth: 2.2, dashed: false, alpha: 0.9 },
        { cx: 0, cy: 0, cz: 0, radius: 124, rx: -0.85, ry: 0.9, rz: 0.5, vrx: -1.3, vry: 0.85, vrz: -1.9, color: '#ff9ebb', glowColor: '#d84b7e', lineWidth: 1.8, dashed: true, alpha: 0.82 },
        { cx: 0, cy: 0, cz: 0, radius: 152, rx: 0.45, ry: -1.1, rz: -0.4, vrx: 0.95, vry: -1.4, vrz: 1.6, color: '#b2ebf2', glowColor: '#4dd0e1', lineWidth: 1.6, dashed: false, alpha: 0.75 }
    ];
    // ====== HỆ THỐNG ĐẠO DIỄN GÓC QUAY 3D GACHA 5 SAO (GENSHIN IMPACT WISH CINEMATIC ENGINE - 6 CHỦ ĐỀ 3D ĐỘC BẢN) ======
    const SKY_GACHA_THEMES = {
        bloom: {
            skyTopGlow: 'rgba(255, 226, 152, 0.56)',
            skyMidNebula: 'rgba(216, 58, 111, 0.36)',
            skyDeepVeil: 'rgba(8, 38, 30, 0.68)',
            beamCore: 'rgba(255, 245, 210, 1)',
            beamMid: 'rgba(255, 138, 178, 0.85)',
            beamEdge: 'rgba(216, 58, 111, 0.42)',
            cometAwakenCore: '#fffef5',
            cometAwakenHalo: '#ff5c8d',
            cometAwakenGold: '#ffd54f',
            trailHelixA: '#ff6f9c',
            trailHelixB: '#ffd54f',
            ringColorA: '#ffd54f',
            ringColorB: '#ff80ab',
            ringColorC: '#ffb2c9',
            petalMid: '#ff6f9c',
            petalEnd: '#ad1457',
            isSakura: false
        },
        butterflies: {
            skyTopGlow: 'rgba(255, 244, 178, 0.58)',
            skyMidNebula: 'rgba(16, 185, 129, 0.36)',
            skyDeepVeil: 'rgba(4, 34, 26, 0.72)',
            beamCore: 'rgba(255, 252, 218, 1)',
            beamMid: 'rgba(255, 213, 79, 0.88)',
            beamEdge: 'rgba(52, 211, 153, 0.46)',
            cometAwakenCore: '#fffff4',
            cometAwakenHalo: '#ffd54f',
            cometAwakenGold: '#34d399',
            trailHelixA: '#ffd54f',
            trailHelixB: '#34d399',
            ringColorA: '#ffe57f',
            ringColorB: '#6ee7b7',
            ringColorC: '#ffd54f',
            petalMid: '#ffd54f',
            petalEnd: '#d97706',
            isSakura: false
        },
        ribbon: {
            skyTopGlow: 'rgba(255, 238, 206, 0.56)',
            skyMidNebula: 'rgba(236, 72, 153, 0.35)',
            skyDeepVeil: 'rgba(12, 36, 30, 0.68)',
            beamCore: 'rgba(255, 248, 228, 1)',
            beamMid: 'rgba(244, 114, 182, 0.86)',
            beamEdge: 'rgba(251, 191, 36, 0.44)',
            cometAwakenCore: '#fffdf9',
            cometAwakenHalo: '#f472b6',
            cometAwakenGold: '#fbbf24',
            trailHelixA: '#f472b6',
            trailHelixB: '#fde68a',
            ringColorA: '#fde68a',
            ringColorB: '#f472b6',
            ringColorC: '#ffffff',
            petalMid: '#f48fb1',
            petalEnd: '#c2185b',
            isSakura: false
        },
        galaxy: {
            skyTopGlow: 'rgba(224, 247, 250, 0.58)',
            skyMidNebula: 'rgba(139, 92, 246, 0.38)',
            skyDeepVeil: 'rgba(5, 26, 34, 0.74)',
            beamCore: 'rgba(255, 252, 224, 1)',
            beamMid: 'rgba(125, 211, 252, 0.86)',
            beamEdge: 'rgba(192, 132, 252, 0.46)',
            cometAwakenCore: '#ffffff',
            cometAwakenHalo: '#ffd700',
            cometAwakenGold: '#38bdf8',
            trailHelixA: '#ffd700',
            trailHelixB: '#7dd3fc',
            ringColorA: '#ffd700',
            ringColorB: '#7dd3fc',
            ringColorC: '#e879f9',
            petalMid: '#ce93d8',
            petalEnd: '#6a1b9a',
            isSakura: false
        },
        sakura: {
            skyTopGlow: 'rgba(255, 240, 218, 0.60)',
            skyMidNebula: 'rgba(255, 164, 196, 0.38)',
            skyDeepVeil: 'rgba(9, 34, 30, 0.68)',
            beamCore: 'rgba(255, 250, 235, 1)',
            beamMid: 'rgba(255, 182, 208, 0.88)',
            beamEdge: 'rgba(255, 224, 130, 0.44)',
            cometAwakenCore: '#fff9fb',
            cometAwakenHalo: '#ffb2c9',
            cometAwakenGold: '#ffe082',
            trailHelixA: '#ffb2c9',
            trailHelixB: '#ffe082',
            ringColorA: '#ffb2c9',
            ringColorB: '#ffe082',
            ringColorC: '#ffdce8',
            petalMid: '#ffb2c9',
            petalEnd: '#e91e63',
            isSakura: true
        },
        hearts: {
            skyTopGlow: 'rgba(224, 247, 250, 0.60)',
            skyMidNebula: 'rgba(244, 143, 177, 0.34)',
            skyDeepVeil: 'rgba(6, 36, 32, 0.70)',
            beamCore: 'rgba(255, 255, 255, 1)',
            beamMid: 'rgba(178, 235, 242, 0.88)',
            beamEdge: 'rgba(255, 213, 79, 0.48)',
            cometAwakenCore: '#ffffff',
            cometAwakenHalo: '#80deea',
            cometAwakenGold: '#ffd54f',
            trailHelixA: '#80deea',
            trailHelixB: '#ffd54f',
            ringColorA: '#e0f7fa',
            ringColorB: '#ffd54f',
            ringColorC: '#ff9ebb',
            petalMid: '#f8bbd0',
            petalEnd: '#ec407a',
            isSakura: false
        }
    };
    const skyTheme = SKY_GACHA_THEMES[cfg.id] || SKY_GACHA_THEMES.bloom;

    // 3 Vòng Tinh Cầu 3D xoay quanh Cổng Trời Thiên Đỉnh (tọa độ thế giới 3D: x=0, y=-420, z=-920)
    const skyZenithRings = [
        { cx: 0, cy: -420, cz: -920, radius: 145, rx: 1.18, ry: 0.22, rz: 0, vrx: 0.65, vry: 1.75, vrz: 3.1, color: skyTheme.ringColorA, glowColor: '#f5c242', lineWidth: 2.6, dashed: false, alpha: 0.96 },
        { cx: 0, cy: -420, cz: -920, radius: 210, rx: -1.05, ry: 0.68, rz: 0.4, vrx: -1.35, vry: 1.05, vrz: -2.4, color: skyTheme.ringColorB, glowColor: '#d84b7e', lineWidth: 2.1, dashed: true, alpha: 0.88 },
        { cx: 0, cy: -420, cz: -920, radius: 275, rx: 0.92, ry: -0.82, rz: -0.5, vrx: 0.95, vry: -1.45, vrz: 2.1, color: skyTheme.ringColorC, glowColor: '#4dd0e1', lineWidth: 1.8, dashed: false, alpha: 0.82 }
    ];

    // Khởi tạo 96 Ngôi Sao Vũ Trụ 3D đa tầng chiều sâu (Parallax Depth Layers) cho cả Góc Chiếu 3D & Pha Whip-Pan Chéo Tốc Độ Cao
    const skyBgStars = [];
    for (let s = 0; s < 96; s++) {
        skyBgStars.push({
            x: (Math.random() - 0.5) * 2400,
            y: -1050 + Math.random() * 1850,
            z: -1600 + Math.random() * 1800,
            u: Math.random(),
            v: Math.random(),
            depthLayer: 0.28 + (s % 6) * 0.18,
            size: 1.4 + Math.random() * 3.2,
            twinklePhase: Math.random() * Math.PI * 2,
            twinkleSpeed: 3.0 + Math.random() * 5.0,
            isCross: s % 5 === 0,
            color: s % 3 === 0 ? skyTheme.ringColorA : (s % 3 === 1 ? '#ffffff' : skyTheme.ringColorB)
        });
    }

    // Khởi tạo 22 Tầng Biển Mây Khối 3D FBM (Volumetric FBM Cloud Sea & Diagonal Cloud Corridor)
    const skyClouds3D = [];
    for (let c = 0; c < 22; c++) {
        const layerT = c / 21;
        skyClouds3D.push({
            x: (c % 2 === 0 ? -1 : 1) * (140 + (c % 5) * 135) + (Math.random() - 0.5) * 140,
            y: -460 + layerT * 680 + (Math.random() - 0.5) * 60,
            z: -1200 + layerT * 1320,
            u: (c / 22 + Math.random() * 0.08) % 1,
            v: 0.08 + (c % 7) * 0.13 + (Math.random() - 0.5) * 0.05,
            depthLayer: 0.45 + (c % 5) * 0.28,
            w: 480 + (c % 4) * 135,
            h: 270 + (c % 4) * 75,
            driftSpd: (c % 2 === 0 ? 1 : -1) * (20 + (c % 4) * 8),
            variant: c % 3 === 0 ? 'gold' : 'primary',
            alpha: 0.48 + (c % 3) * 0.14
        });
    }

    // Khởi tạo 58 Vệt Xé Gió Chéo Gacha (Genshin Diagonal Whip Speed-Streaks & Z-Warp Streaks)
    const skySpeedLines = [];
    for (let l = 0; l < 58; l++) {
        const ang = (l / 58) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
        const rad = 110 + Math.random() * 420;
        skySpeedLines.push({
            ang,
            rad,
            u: Math.random(),
            laneOffset: (Math.random() - 0.5) * 1.35,
            zOffset: Math.random() * 1400,
            speed: 1850 + Math.random() * 1350,
            len: 190 + Math.random() * 290,
            thickness: 1.2 + Math.random() * 2.4,
            color: l % 3 === 0 ? '#ffffff' : (l % 3 === 1 ? skyTheme.trailHelixA : '#ffd700')
        });
    }

    const skyMeteorTrailPts = [];
    const skyRipples = [];
    const skyShockwaves = [];
    let skyRippleAccum = 0.48;
    let skyParticleAccum = 0;
    let skyWhipScrollDist = 0;
    let hasTriggeredZenithFlash = false;
    let hasTriggeredCut2Flash = false;
    let hasTriggeredAwakeningBoom = false;
    let hasTriggeredCut3Flash = false;
    let hasTriggeredLensCrash = false;
    let hasTriggeredImpactSupernova = false;
    let hasSpawnedSealBreak = false;
    let hasSpawnedMainBurst = false;
    let hasHandedOffCard = false;
    let streamSpawnAccum = 0;
    let windupSpawnAccum = 0;
    let isClipPathNone = false;

    // Mốc thời gian Đạo Diễn lúc mở bì thư:
    const WINDUP_END = 0.88;
    const EXTRACT_START = 0.98;
    const EXTRACT_END = 2.32;
    const PRESENT_END = 2.94;

    // Khởi tạo 14 hạt đom đóm / ánh sao lơ lửng nhẹ quanh phong bì lúc chờ mở
    for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * Math.PI * 2;
        const radX = 140 + (i % 3) * 42;
        const radY = 105 + (i % 4) * 30;
        particles.push({
            type: i % 3 === 0 ? 'star' : 'bokeh',
            hasTrail: false,
            x: Math.cos(ang) * radX,
            y: Math.sin(ang) * radY,
            z: (Math.random() - 0.5) * 160,
            vx: (Math.random() - 0.5) * 16,
            vy: -12 - Math.random() * 16,
            vz: (Math.random() - 0.5) * 18,
            gravity: -6,
            drag: 0.2,
            vortex: 0.4,
            flutter: 22,
            phase: Math.random() * Math.PI * 2,
            size: i % 3 === 0 ? (6 + Math.random() * 4) : (9 + Math.random() * 9),
            bokehColor: i % 2 === 0 ? 'rgba(255, 232, 156, 0.42)' : 'rgba(255, 182, 208, 0.38)',
            rx: 0, ry: 0, rz: Math.random() * 6,
            vrx: 0, vry: 0, vrz: 1.5,
            alpha: 0.85,
            life: 0,
            maxLife: 12
        });
    }

    // Khởi tạo hàm kích hoạt mở phong bì vật lý 3D (CHỈ cho phép mở khi đã ở trạng thái 'waiting' và ảnh đã sẵn sàng 100%)
    const startEnvelopePhysicsOpen = () => {
        if (u3dCurrentDirectorState !== 'waiting') return;
        if (isRealRecipient && !window.isRecipientCardImageReady) return;
        beginOpenSequence();
    };

    function beginOpenSequence() {
        if (u3dCurrentDirectorState === 'opening') return;
        measureTargetShowcaseOnce();
        u3dCurrentDirectorState = 'opening';
        openStartTime = performance.now();
        stage.classList.add('is-opening');
        if (frontRig) frontRig.style.pointerEvents = 'none';
        if (sealBtn) sealBtn.style.pointerEvents = 'none';
    }

    u3dTriggerOpenFn = startEnvelopePhysicsOpen;

    if (autoOpen && u3dCurrentDirectorState === 'waiting') {
        u3dAutoOpenTimerId = setTimeout(() => {
            startEnvelopePhysicsOpen();
        }, autoOpenDelay);
    }

    // ====== BỘ PHÉP CHIẾU CAMERA ĐIỆN ẢNH 3D (VIRTUAL 3D CINEMATIC CAMERA RIG) ======
    function project3DWithCam(wx, wy, wz, cam, screenCx, screenCy) {
        let dx = wx - cam.x;
        let dy = wy - cam.y;
        let dz = wz - cam.z;

        if (cam.yaw !== 0) {
            const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
            const nx = dx * cy - dz * sy;
            const nz = dx * sy + dz * cy;
            dx = nx;
            dz = nz;
        }
        if (cam.pitch !== 0) {
            const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
            const ny = dy * cp - dz * sp;
            const nz = dy * sp + dz * cp;
            dy = ny;
            dz = nz;
        }
        if (cam.roll !== 0) {
            const cr = Math.cos(cam.roll), sr = Math.sin(cam.roll);
            const nx = dx * cr - dy * sr;
            const ny = dx * sr + dy * cr;
            dx = nx;
            dy = ny;
        }

        const depth = cam.fov - dz;
        if (depth <= 65) return null;
        const scale = cam.fov / depth;
        return {
            sx: screenCx + dx * scale + (cam.shakeX || 0),
            sy: screenCy + dy * scale + (cam.shakeY || 0),
            scale,
            depth,
            cz: dz
        };
    }

    // ====== KỊCH BẢN ONE-SHOT CAMERA LIỀN MẠCH CÓ SPEED-RAMPING (6.20 GIÂY - KHÔNG HARD CUT!) ======
    // Pha 1 (0.00s -> 1.45s): Bức Ảnh Chữ Nhật cuộn hoá thành Lõi Sao (Slow-Mo 0.42x) rồi bay vút lên Cổng Trời Thiên Đỉnh (Fast 1.82x)
    // Pha 2 (1.45s -> 2.65s): Lõi Sao chạm Cổng Trời, nhận Lời Chúc Vàng 5 Sao & uốn vòng cung 180° (Apex U-Turn) trong Bullet-Time Slow-Mo (0.28x)
    // Pha 3 (2.65s -> 4.85s): Máy quay tăng tốc vượt mặt & BỌC QUA ĐẦU SAO (Front-Lead Orbit), luôn nhìn ngược về Đầu Sao để quay trọn cả Đầu Sao lẫn Biển Mây 3D cuồn cuộn phía dưới (Nhanh 1.78x -> Chậm 0.34x -> Nhanh 1.92x)
    // Pha 4 (4.85s -> 6.20s): Sao băng 5 Sao lao tới tâm ống kính và mở tung từ Lõi Sao thành Lá Thư Ánh Kim trước khi gói vào Phong Bì 3D!
    function computeSkyGachaCamera(elapsed) {
        const cam = {
            x: 0, y: 0, z: 0,
            pitch: 0, yaw: 0, roll: 0,
            fov: 700,
            shakeX: 0, shakeY: 0,
            cut: 1,
            zoom: 1.0,
            whipSpeedMult: 1.0,
            orbitBlend: 0
        };

        if (elapsed < 1.45) {
            cam.cut = 1;
            // 0.00s -> 0.50s: Slow-Mo (0.42x) ngắm Bức Ảnh cuộn thành Lõi Sao; 0.50s -> 1.45s: Speed-Ramp (1.82x) Tilt-Up mượt mà theo Sao bay lên Cổng Trời!
            const p = Math.max(0, Math.min(1, (elapsed - 0.36) / 1.09));
            const whipEase = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
            cam.whipSpeedMult = elapsed < 0.48 ? 0.42 : (0.42 + 1.40 * Math.sin(p * Math.PI * 0.5));
            cam.x = Math.sin(elapsed * 2.2) * 10 * (1 - whipEase);
            cam.y = 48 - 102 * whipEase;
            cam.z = 115 - 175 * whipEase;
            cam.pitch = 0.15 - 0.53 * whipEase; // Từ +0.15 (nhìn ngang biển mây) ngước mượt lên -0.38 (Cổng Trời Thiên Đỉnh)
            cam.roll = -0.035 * Math.sin(p * Math.PI);
            cam.fov = 680 + 60 * whipEase;
        } else if (elapsed < 2.65) {
            cam.cut = 2;
            // PHA 2 (1.45s -> 2.65s): ĐỈNH TRỜI BULLET-TIME SLOW-MOTION & VÒNG CUNG U-TURN 180° (KHÔNG CẮT CẢNH!)
            const p = (elapsed - 1.45) / 1.20; // 0 -> 1
            const smoothP = p * p * (3 - 2 * p);
            // Speed-Ramp: Chậm lại ở đỉnh cổng trời (1.55s -> 2.15s: 0.28x) để ngắm Sao nhận Phép Màu Vàng 5 Sao & uốn vòng cung 180°, sau đó tăng tốc lao xuống!
            if (elapsed < 2.15) {
                cam.whipSpeedMult = 0.28;
            } else {
                const accelP = (elapsed - 2.15) / 0.50;
                cam.whipSpeedMult = 0.28 + 1.50 * (accelP * accelP);
            }
            cam.x = Math.sin(smoothP * Math.PI) * 26;
            cam.y = -54 + 34 * smoothP;
            cam.z = -60 + 40 * smoothP;
            // Máy quay nâng nhẹ lên đỉnh rồi nghiêng dần theo vòng cung U-Turn của ngôi sao
            cam.pitch = -0.38 + 0.22 * smoothP;
            cam.roll = -0.07 * Math.sin(smoothP * Math.PI);
            cam.fov = 740 - 30 * smoothP;
            cam.zoom = 1.0 + 0.28 * Math.sin(smoothP * Math.PI);

            if (elapsed >= 1.88 && elapsed < 2.32) {
                const damper = Math.pow(1 - (elapsed - 1.88) / 0.44, 2);
                cam.shakeX = Math.sin(elapsed * 135) * 12 * damper;
                cam.shakeY = Math.cos(elapsed * 120) * 10 * damper;
            }
        } else if (elapsed < 4.85) {
            cam.cut = 3;
            // PHA 3 (2.65s -> 4.85s): MÁY QUAY VƯỢT MẶT & BỌC QUA ĐẦU SAO (FRONT-LEAD ORBIT), LUÔN NHÌN VỀ ĐẦU SAO & CẢNH VẬT BIỂN MÂY PHÍA DƯỚI!
            const p = (elapsed - 2.65) / 2.20; // 0 -> 1
            // orbitBlend: 0 -> 1 trong 0.65s đầu (2.65s -> 3.30s) khi máy quay vượt lên bọc qua mũi sao băng!
            const orbitP = Math.min(1, (elapsed - 2.65) / 0.68);
            cam.orbitBlend = orbitP * orbitP * (3 - 2 * orbitP);

            // Speed-Ramping Nghệ Thuật:
            // - 2.65s -> 3.32s: Tăng tốc vượt mặt & bọc đầu sao (1.78x)
            // - 3.32s -> 4.18s: Slow-Motion Điện Ảnh (0.34x) cận cảnh đối diện Đầu Sao 5 Sao & Biển Mây Khối 3D cuồn cuộn phía dưới
            // - 4.18s -> 4.85s: Vọt tốc độ cao (1.92x) lao về điểm kết tinh!
            if (elapsed < 3.32) {
                cam.whipSpeedMult = 1.78;
                cam.zoom = 1.12 + 0.52 * cam.orbitBlend;
            } else if (elapsed < 4.18) {
                const slowP = (elapsed - 3.32) / 0.86;
                cam.whipSpeedMult = 0.34 + 0.12 * Math.cos(slowP * Math.PI);
                cam.zoom = 1.64 + 0.14 * Math.sin(slowP * Math.PI);
            } else {
                const fastP = (elapsed - 4.18) / 0.67;
                cam.whipSpeedMult = 0.46 + 1.48 * (fastP * fastP);
                cam.zoom = 1.64 - 0.48 * (fastP * fastP);
            }

            cam.pitch = -0.16 + 0.28 * cam.orbitBlend;
            cam.roll = 0.16 * Math.sin(p * Math.PI * 2);
            cam.fov = 710;
            cam.shakeX = Math.sin(elapsed * 78) * (2.4 * Math.min(1.2, cam.whipSpeedMult));
            cam.shakeY = Math.cos(elapsed * 72) * (2.0 * Math.min(1.2, cam.whipSpeedMult));
        } else {
            cam.cut = 4;
            // PHA 4 (4.85s -> 6.20s): ĐÓN ĐẦU SAO BĂNG TẠI TÂM ỐNG KÍNH & MỞ TUNG THÀNH LÁ THƯ ÁNH KIM (STAR-TO-LETTER UNVEIL)
            const p = (elapsed - 4.85) / 1.35;
            const settleEase = Math.min(1, p / 0.35);
            cam.orbitBlend = 1 - settleEase * 0.5;
            cam.x = 0;
            cam.y = 0;
            cam.z = 0;
            cam.pitch = 0.12 * (1 - settleEase);
            cam.roll = 0;
            cam.fov = 690;
            cam.whipSpeedMult = elapsed < 5.26 ? 1.65 : 0.35;
            if (elapsed < 5.26) {
                const cp = (elapsed - 4.85) / 0.41;
                const tremor = cp * cp * 10;
                cam.shakeX = Math.sin(elapsed * 135) * tremor;
                cam.shakeY = Math.cos(elapsed * 120) * tremor;
            } else if (elapsed < 5.62) {
                const damper = Math.pow(1 - (elapsed - 5.26) / 0.36, 2);
                cam.shakeX = Math.sin(elapsed * 125) * 14 * damper;
                cam.shakeY = Math.cos(elapsed * 110) * 11 * damper;
            }
        }
        return cam;
    }

    // ====== THấu KÍNH QUANG HỌC ANAMORPHIC & LỤC GIÁC GENSHIN (HDR ADDITIVE OPTICAL LENS FLARE) ======
    function drawGenshinOpticalLensFlare(ctx, fx, fy, screenCx, screenCy, intensity, isGold5Star, scaleMult = 1) {
        if (intensity <= 0.02) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const primaryHex = isGold5Star ? '#ffd700' : '#38bdf8';
        const secondaryHex = isGold5Star ? skyTheme.cometAwakenHalo : '#c084fc';
        const coreWhite = isGold5Star ? '#fffef2' : '#e0f7fa';

        // 1. Tia chớp ngang Anamorphic xuyên màn hình (Horizontal Anamorphic Streak)
        const streakW = (isGold5Star ? 460 : 290) * scaleMult * (0.7 + 0.3 * intensity);
        const streakH = (isGold5Star ? 8.5 : 5.2) * scaleMult;
        const hGrad = ctx.createRadialGradient(fx, fy, 1, fx, fy, streakW);
        hGrad.addColorStop(0, coreWhite);
        hGrad.addColorStop(0.18, primaryHex);
        hGrad.addColorStop(0.55, isGold5Star ? 'rgba(255, 160, 0, 0.32)' : 'rgba(56, 189, 248, 0.28)');
        hGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.globalAlpha = Math.min(1, intensity * 0.95);
        ctx.save();
        ctx.translate(fx, fy);
        ctx.scale(1, streakH / streakW);
        ctx.fillStyle = hGrad;
        ctx.beginPath();
        ctx.arc(0, 0, streakW, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 2. Tia chớp chéo chữ X sắc lẹm (4-Point Starburst Spikes)
        for (let k = 0; k < 2; k++) {
            ctx.save();
            ctx.translate(fx, fy);
            ctx.rotate(k === 0 ? -0.66 : 0.91);
            const diagW = streakW * (k === 0 ? 0.58 : 0.38);
            const diagH = streakH * 0.55;
            ctx.scale(1, diagH / diagW);
            ctx.globalAlpha = Math.min(1, intensity * 0.72);
            ctx.fillStyle = hGrad;
            ctx.beginPath();
            ctx.arc(0, 0, diagW, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 3. Chuỗi 6 Bóng Ma Thấu Kính Lục Giác (Hexagonal Aperture Ghost Reflections) dọc trục tâm ống kính
        const axisDx = screenCx - fx;
        const axisDy = screenCy - fy;
        const ghostFactors = [-0.28, 0.35, 0.68, 1.15, 1.52, 1.95];
        const ghostRadii = [22, 14, 34, 18, 46, 28];
        for (let g = 0; g < ghostFactors.length; g++) {
            const gf = ghostFactors[g];
            const gx = fx + axisDx * gf;
            const gy = fy + axisDy * gf;
            const gr = ghostRadii[g] * scaleMult;
            ctx.save();
            ctx.translate(gx, gy);
            ctx.rotate(gf * 1.4);
            ctx.globalAlpha = Math.min(1, intensity * (g % 2 === 0 ? 0.26 : 0.18));
            ctx.fillStyle = g % 2 === 0 ? primaryHex : secondaryHex;
            ctx.strokeStyle = coreWhite;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            for (let v = 0; v < 6; v++) {
                const va = (v / 6) * Math.PI * 2;
                const vx = Math.cos(va) * gr;
                const vy = Math.sin(va) * gr;
                if (v === 0) ctx.moveTo(vx, vy);
                else ctx.lineTo(vx, vy);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();
    }

    // ====== DẢI ĐUÔI SAO BĂNG PLASMA 3 LỚP VUỐT NHỌN HDR (3-LAYER TAPERED HDR PLASMA COMET RIBBON) ======
    function drawGenshinTaperedCometRibbon(ctx, headX, headY, tailDirX, tailDirY, tailLen, headRadius, elapsed, isGold5Star) {
        const atlas = getU3DLuxurySpriteAtlas();
        const perpX = -tailDirY;
        const perpY = tailDirX;
        const segments = 28;

        const spinePts = [];
        for (let i = 0; i <= segments; i++) {
            const u = i / segments; // 0 = tại đầu sao băng, 1 = chót đuôi xa tắp
            const dist = u * tailLen;
            // Sóng nhiễu động FBM Plasma cuộn dọc theo thân đuôi sao băng
            const wave = Math.sin(u * 11.5 - elapsed * 24.0) * (u * 22) + Math.cos(u * 6.2 - elapsed * 15.0) * (u * 12);
            spinePts.push({
                x: headX + tailDirX * dist + perpX * wave,
                y: headY + tailDirY * dist + perpY * wave,
                u
            });
        }

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Ba lớp dải lụa năng lượng vuốt nhọn (Tapered Polygon Strips):
        // Lớp 0: Hào quang Tinh Vân Nguyên Tố rộng ngoài cùng
        // Lớp 1: Thân Plasma Hoàng Kim 24K / Thiên Thanh rực cháy ở giữa
        // Lớp 2: Lõi Laser Trắng Kim Cương sắc lẹm ở chính tâm
        const layers = [
            {
                widthMult: 2.35,
                alpha: 0.44,
                c0: isGold5Star ? skyTheme.cometAwakenHalo : '#a855f7',
                c1: isGold5Star ? skyTheme.trailHelixA : '#38bdf8',
                c2: 'rgba(0, 0, 0, 0)'
            },
            {
                widthMult: 1.18,
                alpha: 0.85,
                c0: isGold5Star ? '#ffd700' : '#38bdf8',
                c1: isGold5Star ? '#ff9900' : '#6366f1',
                c2: 'rgba(0, 0, 0, 0)'
            },
            {
                widthMult: 0.42,
                alpha: 0.98,
                c0: '#ffffff',
                c1: isGold5Star ? '#fff6b3' : '#bae6fd',
                c2: 'rgba(0, 0, 0, 0)'
            }
        ];

        const endPt = spinePts[segments];
        for (let l = 0; l < layers.length; l++) {
            const ly = layers[l];
            const grad = ctx.createLinearGradient(headX, headY, endPt.x, endPt.y);
            grad.addColorStop(0, ly.c0);
            grad.addColorStop(0.42, ly.c1);
            grad.addColorStop(1, ly.c2);

            ctx.globalAlpha = ly.alpha;
            ctx.fillStyle = grad;
            ctx.beginPath();
            for (let i = 0; i <= segments; i++) {
                const pt = spinePts[i];
                const taper = Math.pow(1 - pt.u, 0.72) * (0.9 + 0.1 * Math.sin(pt.u * 18 - elapsed * 28));
                const halfW = headRadius * ly.widthMult * taper;
                const lx = pt.x + perpX * halfW;
                const lyPos = pt.y + perpY * halfW;
                if (i === 0) ctx.moveTo(lx, lyPos);
                else ctx.lineTo(lx, lyPos);
            }
            for (let i = segments; i >= 0; i--) {
                const pt = spinePts[i];
                const taper = Math.pow(1 - pt.u, 0.72) * (0.9 + 0.1 * Math.sin(pt.u * 18 - elapsed * 28));
                const halfW = headRadius * ly.widthMult * taper;
                const rx = pt.x - perpX * halfW;
                const ryPos = pt.y - perpY * halfW;
                ctx.lineTo(rx, ryPos);
            }
            ctx.closePath();
            ctx.fill();
        }

        // 2 Dải Xoắn Kép Lụa Ánh Sáng (Double-Helix Energy Ribbons) quấn quanh đuôi sao băng
        for (let strand = 0; strand < 2; strand++) {
            ctx.beginPath();
            for (let i = 0; i <= segments; i++) {
                const pt = spinePts[i];
                const helixPhase = pt.u * 15.0 - elapsed * 22.0 + strand * Math.PI;
                const amp = headRadius * 1.45 * Math.pow(1 - pt.u, 0.65) * Math.sin(helixPhase);
                const hx = pt.x + perpX * amp;
                const hy = pt.y + perpY * amp;
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.globalAlpha = 0.78;
            ctx.strokeStyle = strand === 0 ? (isGold5Star ? '#fffef0' : '#e0f7fa') : (isGold5Star ? skyTheme.trailHelixB : '#f472b6');
            ctx.lineWidth = Math.max(1.5, headRadius * 0.16);
            ctx.stroke();
        }

        ctx.restore();

        // Đính các thực thể 3D có Texture Kim Hoàn (Cánh Hoa, Ngọc Trai, Kim Cương, Hồ Điệp) cuốn dọc theo luồng khí xoáy của đuôi sao băng!
        ctx.save();
        for (let i = 2; i < segments; i += 3) {
            const pt = spinePts[i];
            const swirl = Math.cos(pt.u * 14 - elapsed * 20 + i) * headRadius * 1.15 * (1 - pt.u * 0.6);
            const sx = pt.x + perpX * swirl;
            const sy = pt.y + perpY * swirl;
            const spSize = Math.max(6, headRadius * 0.52 * (1 - pt.u * 0.65));
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(elapsed * 8 + i * 1.3);
            ctx.globalAlpha = (1 - pt.u) * 0.92;
            if (cfg.id === 'bloom' || cfg.id === 'sakura') {
                const spr = cfg.id === 'sakura' ? atlas.sakuraPetal : atlas.camelliaPetal;
                ctx.drawImage(spr, -spSize, -spSize, spSize * 2, spSize * 2);
            } else if (cfg.id === 'ribbon') {
                ctx.drawImage(atlas.pearl, -spSize * 0.65, -spSize * 0.65, spSize * 1.3, spSize * 1.3);
            } else if (cfg.id === 'hearts') {
                ctx.drawImage(atlas.diamond, -spSize * 0.85, -spSize * 0.85, spSize * 1.7, spSize * 1.7);
            } else if (cfg.id === 'butterflies') {
                const wingSpr = isGold5Star ? atlas.butterflyWingGold : atlas.butterflyWingRose;
                ctx.drawImage(wingSpr, -spSize, -spSize, spSize * 2, spSize * 2);
            }
            ctx.restore();
        }
        ctx.restore();
    }

    // Vẽ bầu trời 3D One-Shot, Biển Mây Khối FBM Celestia phía dưới, Cổng Trời Thiên Đỉnh & Hiện tượng Thiên Văn đặc trưng của 6 Chủ Đề 3D
    function drawHeavenlySkyBeamsAndPortal(ctxB, ctxF, elapsed, intensity, screenCx, screenCy, vw, vh, camOverride) {
        if (intensity <= 0.01) return;
        const atlas = getU3DLuxurySpriteAtlas();
        const cam = camOverride || { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0, fov: 700, shakeX: 0, shakeY: 0, cut: 1, zoom: 1.0, orbitBlend: 0 };
        const gateProj = project3DWithCam(0, -420, -920, cam, screenCx, screenCy) || { sx: screenCx, sy: vh * 0.16, scale: 0.44 };
        // Ở Pha 3 (khi máy quay bọc qua đầu sao nhìn ngược lên đầu sao và biển mây phía dưới), Cổng Trời nằm ở phía trên đầu sao băng!
        const orbitBlend = cam.orbitBlend || 0;
        const skyCx = gateProj.sx * (1 - orbitBlend * 0.35) + (vw * 0.56) * (orbitBlend * 0.35);
        const skyCy = gateProj.sy * (1 - orbitBlend * 0.45) + (vh * 0.14) * (orbitBlend * 0.45);

        // 1. Nền vòm trời đêm vũ trụ 3D sâu thẳm & tinh vân theo từng chủ đề (ctxBack)
        ctxB.save();
        const skyVeilGrad = ctxB.createRadialGradient(skyCx, skyCy, 14, screenCx, vh * 0.5, Math.max(vw, vh) * 0.96);
        skyVeilGrad.addColorStop(0, skyTheme.skyTopGlow);
        skyVeilGrad.addColorStop(0.30, skyTheme.skyMidNebula);
        skyVeilGrad.addColorStop(0.66, `rgba(6, 28, 38, ${(0.76 * intensity).toFixed(3)})`);
        skyVeilGrad.addColorStop(1, skyTheme.skyDeepVeil);
        ctxB.globalAlpha = intensity;
        ctxB.fillStyle = skyVeilGrad;
        ctxB.fillRect(0, 0, vw, vh);

        // 1B. Hiện tượng Bầu Trời Độc Bản có Texture cao cấp theo từng Chủ Đề 3D
        if (cfg.id === 'sakura') {
            const moonDrawR = Math.min(vw, vh) * 0.25 * (0.85 + gateProj.scale * 0.5);
            ctxB.save();
            ctxB.globalAlpha = intensity * 0.94;
            ctxB.drawImage(atlas.fullMoon, skyCx - moonDrawR, skyCy - moonDrawR * 0.78, moonDrawR * 2, moonDrawR * 2);
            ctxB.restore();
        } else if (cfg.id === 'butterflies') {
            ctxB.save();
            ctxB.globalCompositeOperation = 'lighter';
            for (let a = 0; a < 3; a++) {
                ctxB.globalAlpha = (0.32 - a * 0.07) * intensity;
                ctxB.strokeStyle = a % 2 === 0 ? '#34d399' : '#ffd54f';
                ctxB.lineWidth = (46 - a * 9) * gateProj.scale * 1.8;
                ctxB.lineCap = 'round';
                ctxB.beginPath();
                const baseY = skyCy + (a - 1) * 48;
                ctxB.moveTo(0, baseY + Math.sin(elapsed * 1.8 + a) * 35);
                ctxB.bezierCurveTo(
                    vw * 0.33, baseY - 70 * Math.cos(elapsed * 1.4 + a),
                    vw * 0.66, baseY + 70 * Math.sin(elapsed * 1.6 + a),
                    vw, baseY - Math.cos(elapsed * 1.5 + a) * 35
                );
                ctxB.stroke();
            }
            ctxB.restore();
        } else if (cfg.id === 'hearts') {
            ctxB.save();
            ctxB.globalCompositeOperation = 'lighter';
            for (let c = -2; c <= 2; c++) {
                const px = skyCx + c * vw * 0.14;
                const pilH = vh * (0.48 - Math.abs(c) * 0.06);
                const pilW = (22 - Math.abs(c) * 3) * (0.85 + 0.15 * Math.sin(elapsed * 4 + c));
                const pilGrad = ctxB.createLinearGradient(px, skyCy - 40, px, skyCy + pilH);
                pilGrad.addColorStop(0, `rgba(224, 247, 250, ${(0.55 * intensity).toFixed(3)})`);
                pilGrad.addColorStop(0.5, `rgba(255, 192, 218, ${(0.28 * intensity).toFixed(3)})`);
                pilGrad.addColorStop(1, 'rgba(224, 247, 250, 0)');
                ctxB.fillStyle = pilGrad;
                ctxB.fillRect(px - pilW * 0.5, skyCy - 40, pilW, pilH);
            }
            ctxB.restore();
        }

        const primaryCloudSprite = (cfg.id === 'butterflies') ? atlas.cloudEmerald : ((cfg.id === 'galaxy' || cfg.id === 'hearts') ? atlas.cloudAstral : atlas.cloudRose);

        // ====== PHA 3 (2.65s -> 4.85s): GÓC MÁY BỌC QUA ĐẦU SAO NHÌN NGƯỢC VỀ ĐẦU SAO & TOÀN CẢNH BIỂN MÂY 3D CUỒN CUỘN PHÍA DƯỚI! ======
        if (cam.cut === 3) {
            const isGoldNow = true;
            const spanW = Math.hypot(vw, vh) * 1.38;

            // 1. Vẽ 96 Ngôi Sao Vũ Trụ lao vút từ dưới lên trên tạo cảm giác Đầu Sao đang bổ nhào xuống thế giới bên dưới!
            ctxB.save();
            ctxB.globalCompositeOperation = 'lighter';
            for (let s = 0; s < skyBgStars.length; s++) {
                const st = skyBgStars[s];
                const laneX = (st.v - 0.5) * vw * 1.25;
                const flowY = vh - ((st.u * vh * 1.3 + skyWhipScrollDist * st.depthLayer * 0.48) % (vh * 1.3));
                const sx = screenCx + laneX + (cam.shakeX || 0);
                const sy = flowY + (cam.shakeY || 0);
                if (sx < -40 || sx > vw + 40 || sy < -40 || sy > vh + 40) continue;

                const streakLen = Math.max(4, 26 * st.depthLayer * cam.whipSpeedMult);
                ctxB.globalAlpha = Math.min(1, intensity * (0.45 + 0.45 * st.depthLayer));
                ctxB.strokeStyle = s % 2 === 0 ? '#ffe57f' : st.color;
                ctxB.lineWidth = Math.max(1.0, st.size * 0.68 * st.depthLayer);
                ctxB.beginPath();
                ctxB.moveTo(sx, sy);
                ctxB.lineTo(sx - laneX * 0.04, sy + streakLen);
                ctxB.stroke();
            }
            ctxB.restore();

            // 2. Vẽ Thung Lũng Biển Mây Khối 3D FBM Phía Dưới Đầu Sao (Panoramic 3D Cloudscape Rushing Underneath the Meteor Head!)
            // Các tầng mây nở rộng và rẽ sang 2 bên phía dưới đầu sao khi camera lùi phía trước mũi sao băng!
            for (let c = 0; c < skyClouds3D.length; c++) {
                const cl = skyClouds3D[c];
                const cycle = ((cl.u + (skyWhipScrollDist * 0.00038 * cl.depthLayer)) % 1);
                // Mây trôi từ đáy/chân trời phía dưới ngược lên và tỏa rộng sang 2 bên theo luật phối cảnh 3D
                const persp = 0.42 + cycle * 1.15;
                const sideSign = c % 2 === 0 ? -1 : 1;
                const cx = screenCx + sideSign * (0.12 + Math.abs(cl.v - 0.5) * 0.85) * vw * persp + (cam.shakeX || 0);
                const cy = vh * (0.98 - cycle * 0.72) + (cam.shakeY || 0);
                const cw = cl.w * (0.48 + cl.depthLayer * 0.55) * persp;
                const ch = cl.h * (0.48 + cl.depthLayer * 0.55) * persp;
                if (cx + cw * 0.5 < -90 || cx - cw * 0.5 > vw + 90 || cy + ch * 0.5 < -90 || cy - ch * 0.5 > vh + 90) continue;

                const targetCtx = (c % 5 === 0 && cycle > 0.62) ? ctxF : ctxB;
                targetCtx.save();
                targetCtx.translate(cx, cy);
                targetCtx.rotate(-cam.roll * 0.55);
                targetCtx.globalAlpha = Math.min(1, cl.alpha * intensity * Math.sin(cycle * Math.PI) * (targetCtx === ctxF ? 0.58 : 0.92));
                const spr = (isGoldNow && (cl.variant === 'gold' || c % 2 === 0)) ? atlas.cloudGold : primaryCloudSprite;
                targetCtx.drawImage(spr, -cw * 0.5, -ch * 0.5, cw, ch);
                targetCtx.restore();
            }
            ctxB.restore();
            return;
        }

        // ====== PHA 1, PHA 2 & PHA 4: BIỂN MÂY KHỐI FBM CELESTIA (3D CLOUD SEA HORIZON) & CỔNG TRỜI THIÊN ĐỈNH ======
        const horizonY = screenCy + (cam.pitch + 0.08) * vh * 1.45;

        // Vẽ 22 Tầng Mây Khối FBM trải dài tạo thành Đại Hải Vân Celestia (Cloud Sea Horizon)
        for (let c = 0; c < skyClouds3D.length; c++) {
            const cl = skyClouds3D[c];
            const curX = cl.x + Math.sin(elapsed * 0.55 + c) * cl.driftSpd;
            const pr = project3DWithCam(curX, cl.y, cl.z, cam, screenCx, screenCy);
            if (!pr) continue;
            const cw = cl.w * pr.scale * 1.15;
            const ch = cl.h * pr.scale * 1.10;
            if (pr.sx + cw < -60 || pr.sx - cw > vw + 60 || pr.sy + ch < -60 || pr.sy - ch > vh + 60) continue;

            ctxB.save();
            ctxB.translate(pr.sx, pr.sy);
            ctxB.rotate(-cam.roll * 0.75);
            ctxB.globalAlpha = Math.min(1, cl.alpha * intensity);
            const sprite = (cl.variant === 'gold' || elapsed >= 4.80) ? atlas.cloudGold : primaryCloudSprite;
            ctxB.drawImage(sprite, -cw * 0.5, -ch * 0.5, cw, ch);
            ctxB.restore();
        }

        // Vẽ Dải Đại Hải Vân Chân Trời (Foreground Celestia Cloud Sea Bank) ở Cut 1 & Cut 4
        if (horizonY < vh + 220) {
            for (let b = -2; b <= 2; b++) {
                const bx = screenCx + b * vw * 0.26 + Math.sin(elapsed * 0.8 + b) * 28 + (cam.shakeX || 0);
                const by = horizonY + Math.abs(b) * 18 + (b % 2) * 22 + (cam.shakeY || 0);
                const bw = vw * 0.52;
                const bh = bw * 0.56;
                ctxB.save();
                ctxB.globalAlpha = Math.min(1, 0.88 * intensity);
                const seaSprite = (Math.abs(b) % 2 === 1 || elapsed >= 4.80) ? atlas.cloudGold : primaryCloudSprite;
                ctxB.drawImage(seaSprite, bx - bw * 0.5, by - bh * 0.35, bw, bh);
                ctxB.restore();
            }
        }

        // 5 Luồng Ánh Sáng Thiên Sứ (Volumetric God Rays) chiếu từ Cổng Trời Thiên Đỉnh
        const beamConfigs = [
            { spread: -0.38, topW: 18, botW: vw * 0.34, alpha: 0.22, phase: 0.2 },
            { spread: -0.18, topW: 24, botW: vw * 0.44, alpha: 0.32, phase: 1.4 },
            { spread: 0.00,  topW: 38, botW: vw * 0.58, alpha: 0.48, phase: 2.7 },
            { spread: 0.18,  topW: 24, botW: vw * 0.44, alpha: 0.32, phase: 4.1 },
            { spread: 0.38,  topW: 18, botW: vw * 0.34, alpha: 0.22, phase: 5.3 }
        ];
        const beamEndY = vh * 0.96;
        ctxB.save();
        ctxB.globalCompositeOperation = 'lighter';
        for (let b = 0; b < beamConfigs.length; b++) {
            const bc = beamConfigs[b];
            const sway = Math.sin(elapsed * 2.1 + bc.phase) * 0.045 - cam.roll * 0.45;
            const endCx = skyCx + (bc.spread + sway) * vw;
            const breathe = 0.82 + 0.18 * Math.sin(elapsed * 3.4 + bc.phase);
            const bAlpha = bc.alpha * breathe * intensity;

            const beamGrad = ctxB.createLinearGradient(skyCx, skyCy - 10, endCx, beamEndY);
            beamGrad.addColorStop(0, skyTheme.beamCore.replace('1)', `${Math.min(1, bAlpha * 1.35).toFixed(3)})`));
            beamGrad.addColorStop(0.34, skyTheme.beamMid.replace(/0\.\d+\)/, `${(bAlpha * 0.92).toFixed(3)})`));
            beamGrad.addColorStop(0.70, skyTheme.beamEdge.replace(/0\.\d+\)/, `${(bAlpha * 0.48).toFixed(3)})`));
            beamGrad.addColorStop(1, 'rgba(255, 232, 166, 0)');

            ctxB.fillStyle = beamGrad;
            ctxB.beginPath();
            ctxB.moveTo(skyCx - bc.topW * 0.5, skyCy - 8);
            ctxB.lineTo(skyCx + bc.topW * 0.5, skyCy - 8);
            ctxB.lineTo(endCx + bc.botW * 0.5, beamEndY);
            ctxB.lineTo(endCx - bc.botW * 0.5, beamEndY);
            ctxB.closePath();
            ctxB.fill();
        }
        ctxB.restore();

        // Vẽ 96 Ngôi Sao Vũ Trụ 3D có Parallax thật theo Camera
        for (let s = 0; s < skyBgStars.length; s++) {
            const st = skyBgStars[s];
            const sp = project3DWithCam(st.x, st.y, st.z, cam, screenCx, screenCy);
            if (!sp || sp.sx < -20 || sp.sx > vw + 20 || sp.sy < -20 || sp.sy > vh + 20) continue;
            const tw = 0.45 + 0.55 * Math.sin(elapsed * st.twinkleSpeed + st.twinklePhase);
            const r = Math.max(0.8, st.size * sp.scale * tw);
            ctxB.globalAlpha = Math.min(1, intensity * tw * 0.92);
            ctxB.fillStyle = st.color;
            ctxB.beginPath();
            ctxB.arc(sp.sx, sp.sy, r, 0, Math.PI * 2);
            ctxB.fill();
            if (st.isCross && r > 1.3) {
                ctxB.strokeStyle = '#ffffff';
                ctxB.lineWidth = 0.9;
                ctxB.beginPath();
                ctxB.moveTo(sp.sx - r * 3.0, sp.sy);
                ctxB.lineTo(sp.sx + r * 3.0, sp.sy);
                ctxB.moveTo(sp.sx, sp.sy - r * 3.0);
                ctxB.lineTo(sp.sx, sp.sy + r * 3.0);
                ctxB.stroke();
            }
        }
        ctxB.restore();

        // 2. Tâm Cổng Trời Thiên Đỉnh (Celestia Astral Gate) trên ctxFront
        ctxF.save();
        ctxF.translate(skyCx, skyCy);
        ctxF.rotate(-cam.roll);
        ctxF.globalCompositeOperation = 'lighter';
        const corePulse = (1 + 0.16 * Math.sin(elapsed * 6.2)) * (0.78 + gateProj.scale * 0.68);
        const coronaR = 138 * corePulse;
        const coronaGrad = ctxF.createRadialGradient(0, 0, 3, 0, 0, coronaR);
        coronaGrad.addColorStop(0, `rgba(255, 255, 245, ${(0.98 * intensity).toFixed(3)})`);
        coronaGrad.addColorStop(0.26, `rgba(255, 232, 148, ${(0.82 * intensity).toFixed(3)})`);
        coronaGrad.addColorStop(0.60, skyTheme.skyMidNebula.replace(/0\.\d+\)/, `${(0.46 * intensity).toFixed(3)})`));
        coronaGrad.addColorStop(1, 'rgba(255, 232, 148, 0)');
        ctxF.fillStyle = coronaGrad;
        ctxF.beginPath();
        ctxF.arc(0, 0, coronaR, 0, Math.PI * 2);
        ctxF.fill();

        ctxF.save();
        ctxF.globalAlpha = Math.min(1, intensity * 0.88);
        ctxF.rotate(elapsed * 0.65);
        if (cfg.id === 'bloom' || cfg.id === 'sakura') {
            const pCount = cfg.id === 'sakura' ? 5 : 8;
            const pSpr = cfg.id === 'sakura' ? atlas.sakuraPetal : atlas.camelliaPetal;
            const pR = 28 * corePulse;
            for (let i = 0; i < pCount; i++) {
                ctxF.save();
                ctxF.rotate((i / pCount) * Math.PI * 2);
                ctxF.translate(0, -pR * 0.72);
                ctxF.drawImage(pSpr, -pR, -pR, pR * 2, pR * 2);
                ctxF.restore();
            }
        } else if (cfg.id === 'hearts') {
            const dR = 40 * corePulse;
            ctxF.drawImage(atlas.diamond, -dR, -dR, dR * 2, dR * 2);
        } else if (cfg.id === 'ribbon') {
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2;
                ctxF.drawImage(atlas.pearl, Math.cos(a) * 36 * corePulse - 7, Math.sin(a) * 36 * corePulse - 7, 14, 14);
            }
        }

        for (let k = 0; k < 2; k++) {
            ctxF.save();
            if (k === 1) ctxF.rotate(Math.PI / 4);
            const rayLen = (k === 0 ? 66 : 42) * corePulse;
            const rayW = k === 0 ? 6.2 : 4.0;
            ctxF.fillStyle = k === 0 ? '#fffef4' : skyTheme.ringColorA;
            ctxF.beginPath();
            ctxF.moveTo(0, -rayLen);
            ctxF.quadraticCurveTo(rayW, -rayW, rayLen, 0);
            ctxF.quadraticCurveTo(rayW, rayW, 0, rayLen);
            ctxF.quadraticCurveTo(-rayW, rayW, -rayLen, 0);
            ctxF.quadraticCurveTo(-rayW, -rayW, 0, -rayLen);
            ctxF.closePath();
            ctxF.fill();
            ctxF.restore();
        }
        ctxF.restore();
        ctxF.restore();
    }

    // Vẽ Vòng Tinh Cầu Khắc Chòm Sao 3D qua Phép Chiếu Camera 3D (có HDR Additive Glow)
    function drawCamera3DRing(ctxB, ctxF, ring, cam, screenCx, screenCy) {
        if (ring.alpha <= 0.01) return;
        const steps = 56;
        const cosX = Math.cos(ring.rx), sinX = Math.sin(ring.rx);
        const cosY = Math.cos(ring.ry), sinY = Math.sin(ring.ry);
        const cosZ = Math.cos(ring.rz), sinZ = Math.sin(ring.rz);

        const projPts = [];
        for (let i = 0; i <= steps; i++) {
            const a = (i / steps) * Math.PI * 2;
            const x0 = Math.cos(a) * ring.radius;
            const y0 = Math.sin(a) * ring.radius;

            const y1 = y0 * cosX;
            const z1 = y0 * sinX;
            const x1 = x0;

            const x2 = x1 * cosY + z1 * sinY;
            const z2 = -x1 * sinY + z1 * cosY;
            const y2 = y1;

            const wx = x2 * cosZ - y2 * sinZ + ring.cx;
            const wy = x2 * sinZ + y2 * cosZ + ring.cy;
            const wz = z2 + ring.cz;

            const pr = project3DWithCam(wx, wy, wz, cam, screenCx, screenCy);
            projPts.push(pr);
        }

        for (let i = 1; i < projPts.length; i++) {
            const p0 = projPts[i - 1];
            const p1 = projPts[i];
            if (!p0 || !p1) continue;
            if (ring.dashed && i % 3 === 0) continue;
            const ctx = p1.cz < ring.cz ? ctxB : ctxF;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.max(0, Math.min(1, ring.alpha * 0.52));
            ctx.strokeStyle = ring.color;
            ctx.lineWidth = Math.max(0.95, ring.lineWidth * p1.scale * 0.9);
            ctx.beginPath();
            ctx.moveTo(p0.sx, p0.sy);
            ctx.lineTo(p1.sx, p1.sy);
            ctx.stroke();
            ctx.restore();
        }

        for (let i = 0; i < projPts.length - 1; i += 2) {
            const pr = projPts[i];
            if (!pr) continue;
            const ctx = pr.cz < ring.cz ? ctxB : ctxF;
            const isMajor = i % 8 === 0;
            const wave = 0.45 + 0.55 * Math.sin((i / steps) * Math.PI * 4 + ring.rz * 2);
            const rSize = Math.max(1.2, ring.lineWidth * pr.scale * (isMajor ? 1.95 : 1.3) * (0.65 + 0.55 * wave));

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.max(0, Math.min(1, ring.alpha * 0.42 * wave));
            ctx.fillStyle = ring.glowColor || ring.color;
            ctx.beginPath();
            ctx.arc(pr.sx, pr.sy, rSize * 2.4, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = Math.max(0, Math.min(1, ring.alpha * (0.68 + 0.32 * wave)));
            ctx.fillStyle = isMajor ? '#ffffff' : ring.color;
            ctx.beginPath();
            ctx.arc(pr.sx, pr.sy, rSize * 0.95, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // ====== VẼ ĐẦU SAO BĂNG 5 SAO GENSHIN IMPACT (CÓ CHÂN DUNG NGƯỜI DÙNG TRONG LÕI SAO) & HỘ VỆ NGUYÊN TỐ 3D ĐỘC BẢN ======
    function drawGenshin5StarMeteorScreenCore(ctxF, sx, sy, scale, elapsed, isAwakened5Star, cam, screenCx, screenCy) {
        const atlas = getU3DLuxurySpriteAtlas();
        const s = Math.max(0.35, Math.min(9.5, scale));

        // 1. Vẽ Thấu Kính Quang Học Anamorphic & 6 Bóng Ma Lục Giác (Hexagonal Optical Lens Flare)
        drawGenshinOpticalLensFlare(ctxF, sx, sy, screenCx, screenCy, isAwakened5Star ? 0.96 : 0.72, isAwakened5Star, Math.min(2.4, s * 0.95));

        // 2. Vẽ Hộ Vệ 3D / Pháp Trận Tinh Cầu Quay Quanh Đầu Sao Băng theo từng Chủ Đề (Đặc biệt rực rỡ ở Pha 3 khi Camera bọc qua Đầu Sao!)
        const orbitCam = { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: cam.roll || 0, fov: 680, shakeX: 0, shakeY: 0 };
        if (cfg.id === 'butterflies') {
            const bCount = cam.cut === 3 ? 6 : 4;
            for (let b = 0; b < bCount; b++) {
                const orbAng = elapsed * 5.8 + (b * Math.PI * 2) / bCount;
                const orbRad = (58 + (b % 2) * 18) * s;
                const bx = Math.cos(orbAng) * orbRad;
                const by = Math.sin(orbAng * 1.3) * (orbRad * 0.64);
                const bz = Math.sin(orbAng) * 45;
                draw3DProjectedParticle(ctxF, {
                    type: 'butterfly',
                    isGold: b % 2 === 0 || isAwakened5Star,
                    x: bx,
                    y: by,
                    z: bz,
                    vx: -Math.sin(orbAng) * 140,
                    vy: Math.cos(orbAng) * 140,
                    phase: elapsed * 4.5 + b,
                    flapPhase: elapsed * 42 + b * 1.7,
                    size: (18 + (b % 2) * 6) * Math.min(1.85, s * 0.85),
                    alpha: 0.98
                }, sx, sy, 680);
            }
        } else {
            for (let r = 0; r < 2; r++) {
                drawCamera3DRing(ctxF, ctxF, {
                    cx: 0,
                    cy: 0,
                    cz: 0,
                    radius: (50 + r * 26) * Math.min(2.2, s),
                    rx: elapsed * (4.2 - r * 1.5),
                    ry: elapsed * (2.9 + r * 1.9),
                    rz: elapsed * 4.6,
                    color: isAwakened5Star ? '#ffd700' : '#38bdf8',
                    glowColor: isAwakened5Star ? skyTheme.cometAwakenHalo : '#c084fc',
                    lineWidth: 2.3,
                    alpha: 0.92
                }, orbitCam, sx, sy);
            }
        }

        // 3. Hào Quang Đa Lớp HDR Additive ('lighter') của Lõi Sao 5 Sao
        ctxF.save();
        ctxF.translate(sx, sy);
        ctxF.scale(s, s);
        ctxF.globalCompositeOperation = 'lighter';

        const coreColor = '#ffffff';
        const midColor = isAwakened5Star ? '#ffd700' : '#38bdf8';
        const outerColor = isAwakened5Star ? skyTheme.cometAwakenHalo : '#a855f7';

        // Vòng Tán Sắc Thấu Kính (Chromatic Aberration Iris Ring)
        ctxF.save();
        ctxF.globalAlpha = isAwakened5Star ? 0.54 : 0.38;
        ctxF.strokeStyle = isAwakened5Star ? '#ffd54f' : '#7dd3fc';
        ctxF.lineWidth = 2.4;
        ctxF.beginPath();
        ctxF.arc(0, 0, isAwakened5Star ? 68 : 50, 0, Math.PI * 2);
        ctxF.stroke();
        ctxF.strokeStyle = '#ff80ab';
        ctxF.lineWidth = 1.4;
        ctxF.beginPath();
        ctxF.arc(0, 0, isAwakened5Star ? 72 : 53, 0, Math.PI * 2);
        ctxF.stroke();
        ctxF.restore();

        // Quả cầu Plasma HDR 3 lớp
        const haloR = isAwakened5Star ? 112 : 78;
        const grad = ctxF.createRadialGradient(0, 0, 4, 0, 0, haloR);
        grad.addColorStop(0, coreColor);
        grad.addColorStop(0.22, midColor);
        grad.addColorStop(0.56, outerColor);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctxF.fillStyle = grad;
        ctxF.beginPath();
        ctxF.arc(0, 0, haloR, 0, Math.PI * 2);
        ctxF.fill();

        // Biểu tượng 3D có Texture Kim Hoàn / Nhung Lụa xoay ở chính tâm Lõi Sao Băng
        ctxF.save();
        ctxF.rotate(elapsed * 5.2);
        if (cfg.id === 'bloom' || cfg.id === 'sakura') {
            const petalCount = cfg.id === 'sakura' ? 5 : 8;
            const pSprite = cfg.id === 'sakura' ? atlas.sakuraPetal : atlas.camelliaPetal;
            const pR = 28;
            for (let i = 0; i < petalCount; i++) {
                ctxF.save();
                ctxF.rotate((i / petalCount) * Math.PI * 2);
                ctxF.translate(0, -22);
                ctxF.drawImage(pSprite, -pR, -pR, pR * 2, pR * 2);
                ctxF.restore();
            }
        } else if (cfg.id === 'hearts') {
            ctxF.drawImage(atlas.diamond, -44, -44, 88, 88);
        } else if (cfg.id === 'ribbon') {
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                ctxF.drawImage(atlas.pearl, Math.cos(a) * 28 - 8, Math.sin(a) * 28 - 8, 16, 16);
            }
        }

        // Ngôi sao 8 cánh Hoàng Kim 24K / Thiên Thanh sắc lẹm ở tâm
        for (let k = 0; k < 2; k++) {
            ctxF.save();
            if (k === 1) ctxF.rotate(Math.PI / 4);
            const rL = k === 0 ? 58 : 38;
            const rW = k === 0 ? 7.2 : 4.6;
            ctxF.fillStyle = k === 0 ? '#ffffff' : (isAwakened5Star ? '#ffd700' : '#7dd3fc');
            ctxF.beginPath();
            ctxF.moveTo(0, -rL);
            ctxF.quadraticCurveTo(rW, -rW, rL, 0);
            ctxF.quadraticCurveTo(rW, rW, 0, rL);
            ctxF.quadraticCurveTo(-rW, rW, -rL, 0);
            ctxF.quadraticCurveTo(-rW, -rW, 0, -rL);
            ctxF.closePath();
            ctxF.fill();
            ctxF.restore();
        }
        ctxF.restore();
        ctxF.restore();

        // 4. Huy Chương Chân Dung Người Dùng nằm gọn trong Lõi Sao Băng (giúp người xem luôn thấy rõ bức hình của mình đang bay trong Đầu Sao!)
        if (window.skyOracleUserThumbCanvas && s < 3.6) {
            ctxF.save();
            ctxF.translate(sx, sy);
            ctxF.scale(s, s);
            ctxF.globalAlpha = Math.max(0.18, Math.min(0.92, 1 - (s - 1.8) * 0.45));
            const portR = 23;
            ctxF.drawImage(window.skyOracleUserThumbCanvas, -portR, -portR, portR * 2, portR * 2);
            ctxF.strokeStyle = isAwakened5Star ? '#ffd700' : '#7dd3fc';
            ctxF.lineWidth = 2.2;
            ctxF.beginPath();
            ctxF.arc(0, 0, portR, 0, Math.PI * 2);
            ctxF.stroke();
            ctxF.restore();
        }
    }

    // ====== VẼ QUÁ TRÌNH HOÁ THÂN LOGIC Ở CUỐI CẢNH 4: LÕI SAO MỞ TUNG THÀNH LÁ THƯ ÁNH KIM (ẢNH + DÒNG CHỮ VÀNG) & GẤP PHONG BÌ LỤA 3D ======
    function drawStarToLetterEnvelopeWeave(ctxF, cx, cy, wp, elapsed) {
        // wp: 0.0 -> 1.0 (từ 5.26s -> 6.20s)
        const unfoldP = Math.min(1, wp / 0.58);
        const easeUnfold = 1 - Math.pow(1 - unfoldP, 3);
        const envWrapP = Math.max(0, Math.min(1, (wp - 0.42) / 0.58));

        const cardW = 190 * (0.28 + 0.72 * easeUnfold);
        const cardH = 282 * (0.28 + 0.72 * easeUnfold);
        const cornerR = 18 + (1 - easeUnfold) * 65;

        ctxF.save();
        ctxF.translate(cx, cy);

        // 1. Hào quang kết tinh phía sau Lá Thư Ánh Kim
        ctxF.save();
        ctxF.globalCompositeOperation = 'lighter';
        const glowGrad = ctxF.createRadialGradient(0, 0, 12, 0, 0, Math.max(cardW, cardH) * 0.95);
        glowGrad.addColorStop(0, 'rgba(255, 255, 240, 0.95)');
        glowGrad.addColorStop(0.45, 'rgba(255, 215, 0, 0.65)');
        glowGrad.addColorStop(1, 'rgba(255, 180, 0, 0)');
        ctxF.fillStyle = glowGrad;
        ctxF.beginPath();
        ctxF.arc(0, 0, Math.max(cardW, cardH) * 0.95, 0, Math.PI * 2);
        ctxF.fill();
        ctxF.restore();

        // 2. Thân Lá Thư Ngọc Trai Ánh Kim mở ra từ Lõi Sao
        ctxF.save();
        traceRoundedWindowPath(ctxF, -cardW * 0.5, -cardH * 0.5, cardW, cardH, cornerR);
        const paperGrad = ctxF.createLinearGradient(-cardW * 0.5, -cardH * 0.5, cardW * 0.5, cardH * 0.5);
        paperGrad.addColorStop(0, '#fffdf7');
        paperGrad.addColorStop(0.5, '#fff6dc');
        paperGrad.addColorStop(1, '#f9e8b2');
        ctxF.fillStyle = paperGrad;
        ctxF.fill();
        ctxF.lineWidth = 3.2;
        ctxF.strokeStyle = '#d4af37';
        ctxF.stroke();
        ctxF.clip();

        // 2A. Hiển thị Bức Ảnh đã chỉnh Filter của người dùng ở nửa trên Lá Thư
        const photoSrc = window.skyOracleUserCardPhotoCanvas || window.skyOracleUserThumbCanvas;
        if (photoSrc) {
            const pw = cardW * 0.84;
            const ph = cardH * 0.58;
            ctxF.drawImage(photoSrc, -pw * 0.5, -cardH * 0.44, pw, ph);
            ctxF.strokeStyle = 'rgba(212, 175, 55, 0.85)';
            ctxF.lineWidth = 1.8;
            ctxF.strokeRect(-pw * 0.5, -cardH * 0.44, pw, ph);
        }

        // 2B. Ba dòng Thư Pháp Ánh Vàng 24K đang tự động khắc lời chúc 20.10 lên nửa dưới Lá Thư
        const writeP = Math.max(0, Math.min(1, (wp - 0.16) / 0.62));
        for (let line = 0; line < 3; line++) {
            const lineP = Math.max(0, Math.min(1, (writeP - line * 0.22) / 0.48));
            if (lineP <= 0) continue;
            const maxLineW = cardW * (line === 2 ? 0.52 : 0.72);
            const curLineW = maxLineW * lineP;
            const ly = cardH * (0.21 + line * 0.085);
            ctxF.strokeStyle = line === 0 ? '#b8861b' : '#d4af37';
            ctxF.lineWidth = line === 0 ? 3.2 : 2.2;
            ctxF.lineCap = 'round';
            ctxF.beginPath();
            ctxF.moveTo(-maxLineW * 0.5, ly);
            ctxF.lineTo(-maxLineW * 0.5 + curLineW, ly);
            ctxF.stroke();
        }
        ctxF.restore();

        // 3. Cánh Phong Bì Lụa Ánh Kim bắt đầu ôm lấy Lá Thư ở nửa cuối (wp: 0.42 -> 1.0) để chuyển giao mượt sang Phong Bì 3D thật!
        if (envWrapP > 0.01) {
            const envW = cardW * (1.16 + 0.14 * envWrapP);
            const envH = cardH * 0.62;
            const pocketY = cardH * 0.52 * (1 - envWrapP);
            ctxF.save();
            ctxF.globalAlpha = Math.min(1, envWrapP * 1.15);
            ctxF.translate(0, pocketY);
            ctxF.fillStyle = 'rgba(15, 92, 70, 0.88)';
            ctxF.strokeStyle = '#ffd700';
            ctxF.lineWidth = 2.6;
            traceRoundedWindowPath(ctxF, -envW * 0.5, -envH * 0.35, envW, envH, 14);
            ctxF.fill();
            ctxF.stroke();
            ctxF.restore();
        }

        ctxF.restore();
    }

    // Sinh các hạt Tinh Tú 3D (Hồ điệp vàng, Cánh hoa anh đào/hoa trà, Kim cương, Ngọc trai, Sao băng)
    function spawnSkyMeteorWakeParticle(originX, originY, originZ, isAwakened5Star, burstMultiplier = 1) {
        let pType = 'star';
        const r = Math.random();
        if (cfg.id === 'butterflies') {
            pType = r < 0.62 ? 'butterfly' : (r < 0.86 ? 'star' : 'bokeh');
        } else if (cfg.id === 'bloom') {
            pType = r < 0.65 ? 'petal' : (r < 0.88 ? 'star' : 'bokeh');
        } else if (cfg.id === 'sakura') {
            pType = r < 0.70 ? 'petal' : (r < 0.90 ? 'star' : 'bokeh');
        } else if (cfg.id === 'ribbon') {
            pType = r < 0.56 ? 'pearl' : (r < 0.84 ? 'star' : 'petal');
        } else if (cfg.id === 'hearts') {
            pType = r < 0.62 ? 'diamond' : (r < 0.88 ? 'star' : 'shard');
        } else {
            pType = r < 0.60 ? 'star' : (r < 0.84 ? 'shard' : 'bokeh');
        }

        const spread = 28 * burstMultiplier;
        const spd = (110 + Math.random() * 165) * burstMultiplier;
        const ang1 = Math.random() * Math.PI * 2;
        const ang2 = (Math.random() - 0.5) * Math.PI;

        particles.push({
            type: pType,
            isGold: isAwakened5Star || Math.random() < 0.68,
            isSakura: skyTheme.isSakura,
            hasTrail: pType === 'star',
            x: originX + (Math.random() - 0.5) * spread,
            y: originY + (Math.random() - 0.5) * spread,
            z: originZ + (Math.random() - 0.5) * spread,
            vx: Math.cos(ang1) * Math.cos(ang2) * spd,
            vy: Math.sin(ang2) * spd - 20,
            vz: Math.sin(ang1) * Math.cos(ang2) * spd,
            gravity: pType === 'petal' ? 28 : 14,
            drag: 0.65,
            vortex: 1.35,
            flutter: 76,
            phase: Math.random() * 6,
            flapPhase: Math.random() * 6,
            flapSpeed: 46,
            size: pType === 'butterfly' ? (15 + Math.random() * 8) : (pType === 'diamond' ? (12 + Math.random() * 6) : (pType === 'pearl' ? (7 + Math.random() * 4) : (9 + Math.random() * 6))),
            color: isAwakened5Star ? '#ffd700' : '#7dd3fc',
            colorMid: skyTheme.petalMid,
            colorEnd: skyTheme.petalEnd,
            tintA: '#e0f7fa',
            tintB: isAwakened5Star ? '#fff3b8' : '#fce4ec',
            bokehColor: isAwakened5Star ? 'rgba(255, 230, 128, 0.52)' : 'rgba(125, 211, 252, 0.48)',
            rx: Math.random() * 5, ry: Math.random() * 5, rz: Math.random() * 5,
            vrx: (Math.random() - 0.5) * 8, vry: (Math.random() - 0.5) * 8, vrz: (Math.random() - 0.5) * 8,
            alpha: 1,
            life: 0,
            maxLife: 1.30 + Math.random() * 0.55
        });
    }


    // Hàm tạo hạt năng lượng xoáy hội tụ vào tâm trong pha Triệu Hồi (Summoning Prelude)
    function spawnSummonVortexParticle() {
        const ang = Math.random() * Math.PI * 2;
        const dist = 185 + Math.random() * 95;
        const px = Math.cos(ang) * dist;
        const py = Math.sin(ang) * dist;
        const tangX = -Math.sin(ang);
        const tangY = Math.cos(ang);
        const inwardSpd = 190 + Math.random() * 75;
        const swirlSpd = 155 + Math.random() * 65;

        let pType = 'petal';
        if (cfg.id === 'butterflies') pType = Math.random() < 0.65 ? 'butterfly' : 'star';
        else if (cfg.id === 'ribbon') pType = Math.random() < 0.65 ? 'pearl' : 'star';
        else if (cfg.id === 'galaxy') pType = 'star';
        else if (cfg.id === 'hearts') pType = Math.random() < 0.7 ? 'diamond' : 'star';
        else pType = Math.random() < 0.75 ? 'petal' : 'star';

        particles.push({
            type: pType,
            isGold: true,
            isSakura: cfg.id === 'sakura',
            hasTrail: pType === 'star',
            x: px,
            y: py,
            z: (Math.random() - 0.5) * 180,
            vx: -Math.cos(ang) * inwardSpd + tangX * swirlSpd,
            vy: -Math.sin(ang) * inwardSpd + tangY * swirlSpd,
            vz: (Math.random() - 0.5) * 90,
            gravity: 0,
            drag: 0.45,
            vortex: 0,
            flutter: 35,
            phase: Math.random() * 6,
            flapPhase: Math.random() * 6,
            flapSpeed: 42,
            size: pType === 'butterfly' ? 13 : (pType === 'diamond' ? 9 : (pType === 'pearl' ? 6 : 9)),
            colorMid: cfg.id === 'sakura' ? '#ffb2c9' : '#f48fb1',
            colorEnd: cfg.id === 'sakura' ? '#d83a6f' : '#ad1457',
            tintA: '#e0f7fa',
            tintB: '#fce4ec',
            rx: Math.random() * 5, ry: Math.random() * 5, rz: Math.random() * 5,
            vrx: 5, vry: 6, vrz: 5,
            alpha: 1,
            life: 0,
            maxLife: 0.88
        });
    }

    // Hàm tạo hạt năng lượng hội tụ / thức tỉnh quanh Con Dấu Sáp trong pha Khởi Động (0.00s -> 0.88s)
    function spawnWindupSealParticle(sealWorldY, w) {
        const ang = Math.random() * Math.PI * 2;
        if (cfg.id === 'butterflies') {
            particles.push({
                type: 'butterfly',
                isGold: true,
                x: (Math.random() - 0.5) * 32,
                y: sealWorldY + (Math.random() - 0.5) * 24,
                z: 50 + Math.random() * 35,
                vx: Math.cos(ang) * (70 + w * 90),
                vy: -80 - Math.random() * 90,
                vz: 60 + Math.random() * 60,
                gravity: -40,
                drag: 0.9,
                vortex: 1.5,
                flutter: 110,
                phase: Math.random() * 6,
                flapPhase: Math.random() * 6,
                flapSpeed: 46,
                size: 10 + Math.random() * 6,
                rx: 0, ry: 0, rz: 0, vrx: 0, vry: 0, vrz: 0,
                alpha: 1,
                life: 0,
                maxLife: 0.95
            });
        } else if (cfg.id === 'galaxy' || cfg.id === 'hearts') {
            const dist = 95 + Math.random() * 55;
            const px = Math.cos(ang) * dist;
            const py = sealWorldY + Math.sin(ang) * dist;
            particles.push({
                type: cfg.id === 'hearts' ? 'diamond' : 'star',
                hasTrail: false,
                x: px,
                y: py,
                z: 45 + Math.random() * 30,
                vx: -Math.cos(ang) * 210,
                vy: -(py - sealWorldY) * 2.2,
                vz: 20,
                gravity: 0,
                drag: 0.4,
                vortex: 0,
                flutter: 0,
                phase: Math.random() * 6,
                size: cfg.id === 'hearts' ? 7 : 6,
                tintA: '#e0f7fa',
                tintB: '#fce4ec',
                rx: Math.random() * 4, ry: Math.random() * 4, rz: Math.random() * 4,
                vrx: 5, vry: 6, vrz: 6,
                alpha: 1,
                life: 0,
                maxLife: 0.48
            });
        } else {
            const r = 24 + Math.random() * 28;
            particles.push({
                type: cfg.id === 'ribbon' ? 'pearl' : 'petal',
                isSakura: cfg.id === 'sakura',
                x: Math.cos(ang) * r,
                y: sealWorldY + Math.sin(ang) * r,
                z: 48 + Math.random() * 30,
                vx: -Math.sin(ang) * 140,
                vy: Math.cos(ang) * 140 - 40,
                vz: 40,
                gravity: -20,
                drag: 0.8,
                vortex: 0,
                flutter: 60,
                phase: Math.random() * 6,
                size: cfg.id === 'ribbon' ? 5 : 8,
                colorMid: cfg.id === 'sakura' ? '#ffb2c9' : '#f48fb1',
                colorEnd: cfg.id === 'sakura' ? '#d83a6f' : '#ad1457',
                rx: Math.random() * 5, ry: Math.random() * 5, rz: Math.random() * 5,
                vrx: 6, vry: 6, vrz: 6,
                alpha: 1,
                life: 0,
                maxLife: 0.72
            });
        }
    }

    // Hàm tạo vụ nổ Mảnh Sáp Vàng / Kim Cương 3D khi phong ấn vỡ tung (t = WINDUP_END)
    function spawnSealBreakExplosion(originY) {
        const count = 18;
        for (let i = 0; i < count; i++) {
            const ang = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
            const spd = 230 + Math.random() * 340;
            particles.push({
                type: cfg.id === 'ribbon' ? 'pearl' : (cfg.id === 'hearts' ? 'diamond' : 'shard'),
                x: (Math.random() - 0.5) * 16,
                y: originY + 10,
                z: 45 + Math.random() * 40,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd - 220,
                vz: 120 + Math.random() * 220,
                gravity: 920,
                drag: 1.4,
                vortex: 0,
                flutter: 0,
                phase: Math.random() * 6,
                size: cfg.id === 'ribbon' ? (5 + Math.random() * 4) : (7 + Math.random() * 5),
                tintA: '#e0f7fa',
                tintB: '#fce4ec',
                rx: Math.random() * Math.PI * 2,
                ry: Math.random() * Math.PI * 2,
                rz: Math.random() * Math.PI * 2,
                vrx: (Math.random() - 0.5) * 14,
                vry: (Math.random() - 0.5) * 14,
                vrz: (Math.random() - 0.5) * 12,
                color: i % 2 === 0 ? '#f5c242' : '#d84b7e',
                alpha: 1,
                life: 0,
                maxLife: 1.05 + Math.random() * 0.35
            });
        }
    }

    // Hàm phun trào Vật Lý 3D từ chính Miệng Túi Chữ V của Phong Bì (t = EXTRACT_START)
    function spawnPocketMouthEruption(mouthY) {
        if (cfg.id === 'butterflies') {
            for (let i = 0; i < 24; i++) {
                const fanAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.45;
                const spd = 330 + Math.random() * 390;
                particles.push({
                    type: 'butterfly',
                    isGold: i % 3 !== 0,
                    x: (Math.random() - 0.5) * 115,
                    y: mouthY + 20,
                    z: (Math.random() - 0.5) * 230,
                    vx: Math.cos(fanAngle) * spd,
                    vy: Math.sin(fanAngle) * spd - 130,
                    vz: (Math.random() - 0.5) * 320,
                    gravity: -65,
                    drag: 1.25,
                    vortex: 2.2,
                    flutter: 170,
                    phase: Math.random() * Math.PI * 2,
                    flapPhase: Math.random() * Math.PI * 2,
                    flapSpeed: 38 + Math.random() * 14,
                    size: 15 + Math.random() * 12,
                    rx: 0, ry: 0, rz: 0, vrx: 0, vry: 0, vrz: 0,
                    alpha: 1,
                    life: 0,
                    maxLife: 2.5 + Math.random() * 0.6
                });
            }
            [-1, 1].forEach(sx => {
                [-1, 1].forEach(sy => {
                    escortButterflies.push({
                        sx, sy,
                        flapPhase: Math.random() * Math.PI,
                        flapSpeed: 42,
                        size: 24
                    });
                });
            });
        } else if (cfg.id === 'ribbon') {
            const colors = ['#e02f6e', '#f5c242', '#ff74a4', '#d49b27'];
            for (let r = 0; r < 4; r++) {
                ribbons3D.push({
                    baseAngle: (r * Math.PI) / 2,
                    phase: 0,
                    originX: 0,
                    originY: mouthY + 40,
                    startRadius: 132 + (r % 2) * 26,
                    heightSpan: 430,
                    progress: 0,
                    alpha: 1,
                    color: colors[r]
                });
            }
            for (let i = 0; i < 32; i++) {
                const isPearl = i % 2 === 0;
                const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.3;
                const spd = 360 + Math.random() * 400;
                particles.push({
                    type: isPearl ? 'pearl' : 'star',
                    hasTrail: false,
                    x: (Math.random() - 0.5) * 110,
                    y: mouthY + 15,
                    z: (Math.random() - 0.5) * 240,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd,
                    vz: (Math.random() - 0.5) * 300,
                    gravity: isPearl ? 500 : 170,
                    drag: 1.1,
                    vortex: 1.8,
                    flutter: 55,
                    phase: Math.random() * 6,
                    size: isPearl ? (6 + Math.random() * 5) : (9 + Math.random() * 7),
                    rx: 0, ry: 0, rz: Math.random() * 6,
                    vrx: 0, vry: 0, vrz: (Math.random() - 0.5) * 8,
                    alpha: 1,
                    life: 0,
                    maxLife: 2.3 + Math.random() * 0.6
                });
            }
        } else if (cfg.id === 'galaxy') {
            rings3D.push(
                { cx: 0, cy: mouthY, cz: 0, radius: 40, targetRadius: 210, rx: 1.05, ry: 0.25, rz: 0, vrx: 0.35, vry: 1.45, vrz: 2.1, color: '#ffe898', glowColor: '#f5c242', lineWidth: 2.4, dashed: false, alpha: 1 },
                { cx: 0, cy: mouthY, cz: 0, radius: 35, targetRadius: 185, rx: -0.85, ry: 0.95, rz: 0.4, vrx: -1.2, vry: 0.65, vrz: -1.8, color: '#ff9ebb', glowColor: '#d84b7e', lineWidth: 1.9, dashed: true, alpha: 1 },
                { cx: 0, cy: mouthY, cz: 0, radius: 45, targetRadius: 238, rx: 0.35, ry: -1.1, rz: -0.6, vrx: 0.85, vry: -1.35, vrz: 1.5, color: '#9be7ff', glowColor: '#4dd0e1', lineWidth: 1.7, dashed: false, alpha: 0.9 }
            );
            for (let i = 0; i < 34; i++) {
                const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.65;
                const spd = 350 + Math.random() * 440;
                particles.push({
                    type: 'star',
                    hasTrail: i % 2 === 0,
                    x: (Math.random() - 0.5) * 100,
                    y: mouthY + 10,
                    z: (Math.random() - 0.5) * 260,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd,
                    vz: (Math.random() - 0.5) * 360,
                    gravity: 40,
                    drag: 1.35,
                    vortex: 2.4,
                    flutter: 85,
                    phase: Math.random() * 6,
                    size: 8 + Math.random() * 9,
                    rx: 0, ry: 0, rz: 0, vrx: 0, vry: 0, vrz: 4,
                    alpha: 1,
                    life: 0,
                    maxLife: 2.4 + Math.random() * 0.6
                });
            }
        } else if (cfg.id === 'hearts') {
            rings3D.push(
                { cx: 0, cy: mouthY, cz: 0, radius: 42, targetRadius: 205, rx: 1.12, ry: 0.22, rz: 0, vrx: 0.28, vry: 1.15, vrz: 1.8, color: '#fff6c4', glowColor: '#f5c242', lineWidth: 2.0, dashed: false, alpha: 0.92 },
                { cx: 0, cy: mouthY, cz: 0, radius: 38, targetRadius: 180, rx: -0.95, ry: -0.35, rz: 0.5, vrx: -0.45, vry: 0.95, vrz: -1.5, color: '#e0f7fa', glowColor: '#80deea', lineWidth: 1.6, dashed: true, alpha: 0.85 }
            );
            const tints = [
                ['#e0f7fa', '#fce4ec'],
                ['#fff9c4', '#f8bbd0'],
                ['#e8eaf6', '#fff3e0'],
                ['#f3e5f5', '#e0f2f1']
            ];
            for (let i = 0; i < 36; i++) {
                const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
                const spd = 320 + Math.random() * 410;
                const pType = i % 3 === 0 ? 'bokeh' : (i % 4 === 0 ? 'star' : 'diamond');
                const pair = tints[i % tints.length];
                particles.push({
                    type: pType,
                    hasTrail: pType === 'star',
                    x: (Math.random() - 0.5) * 120,
                    y: mouthY + 18,
                    z: (Math.random() - 0.5) * 240,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd - 90,
                    vz: (Math.random() - 0.5) * 320,
                    gravity: pType === 'bokeh' ? -70 : -35,
                    drag: 1.25,
                    vortex: 1.85,
                    flutter: 120,
                    phase: Math.random() * Math.PI * 2,
                    size: pType === 'bokeh' ? (12 + Math.random() * 12) : (pType === 'diamond' ? (9 + Math.random() * 8) : (8 + Math.random() * 7)),
                    tintA: pair[0],
                    tintB: pair[1],
                    bokehColor: i % 2 === 0 ? 'rgba(255, 236, 168, 0.45)' : 'rgba(224, 247, 250, 0.45)',
                    rx: Math.random() * 6,
                    ry: Math.random() * 6,
                    rz: (Math.random() - 0.5) * 0.6,
                    vrx: (Math.random() - 0.5) * 5,
                    vry: (Math.random() - 0.5) * 7,
                    vrz: (Math.random() - 0.5) * 3,
                    alpha: 1,
                    life: 0,
                    maxLife: 2.5 + Math.random() * 0.6
                });
            }
        } else {
            const isSakura = cfg.id === 'sakura';
            const total = isSakura ? 48 : 42;
            for (let i = 0; i < total; i++) {
                const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
                const spd = 330 + Math.random() * 440;
                particles.push({
                    type: (!isSakura && i % 6 === 0) ? 'star' : 'petal',
                    isSakura,
                    hasTrail: false,
                    x: (Math.random() - 0.5) * 125,
                    y: mouthY + 24,
                    z: (Math.random() - 0.5) * 250,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd - 110,
                    vz: (Math.random() - 0.5) * 330,
                    gravity: isSakura ? -70 : 90,
                    drag: 1.3,
                    vortex: isSakura ? 3.2 : 2.1,
                    flutter: 155,
                    phase: Math.random() * 6,
                    size: isSakura ? (10 + Math.random() * 8) : (12 + Math.random() * 9),
                    colorMid: isSakura ? '#ffb2c9' : '#f48fb1',
                    colorEnd: isSakura ? '#d83a6f' : '#ad1457',
                    rx: Math.random() * 6,
                    ry: Math.random() * 6,
                    rz: Math.random() * 6,
                    vrx: (Math.random() - 0.5) * 9,
                    vry: (Math.random() - 0.5) * 9,
                    vrz: (Math.random() - 0.5) * 7,
                    alpha: 1,
                    life: 0,
                    maxLife: 2.5 + Math.random() * 0.6
                });
            }
        }
    }

    // Vòng lặp Vật Lý 60fps chính của Đạo Diễn Phong Bì 3D Hợp Nhất (ZERO REFLOW, ZERO ALLOCATION)
    function stepPhysicsDirector(now) {
        if (lastFrameTime === null) lastFrameTime = now;
        const dt = Math.min(0.033, Math.max(0.004, (now - lastFrameTime) / 1000));
        lastFrameTime = now;

        const screenCx = curVw * 0.5;
        const screenCy = curVh * 0.5;
        const envBaseW = cachedEnvBaseW;
        const envBaseH = envBaseW * 0.694;
        const envBaseCy = curVh * 0.50;
        const focal = 920;

        ctxBack.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctxBack.clearRect(0, 0, curVw, curVh);
        ctxFront.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctxFront.clearRect(0, 0, curVw, curVh);

        const targetRect = cachedTargetRect;
        const baseW = targetRect.width;
        const baseH = targetRect.height;

        const pocketScale = Math.min(0.86, (envBaseW * 0.76) / baseW);
        const cardInPocketW = baseW * pocketScale;
        const cardInPocketH = baseH * pocketScale;

        // ====== TRẠNG THÁI 0-SKY-A: ĐẠI CẢNH ONE-SHOT SPEED-RAMP "TỪ BỨC ẢNH HOÁ THÀNH BỨC THƯ 3D" (6.20 GIÂY LIỀN MẠCH) ======
        if (u3dCurrentDirectorState === 'sky_oracle') {
            if (summonStartTime === null) summonStartTime = now;
            const summonElapsed = Math.max(0, (now - summonStartTime) / 1000);
            const SKY_ORACLE_TOTAL = 6.20;
            const atlas = getU3DLuxurySpriteAtlas();

            backRig.style.opacity = '0';
            frontRig.style.opacity = '0';
            cardActor.style.opacity = '0';

            try {
            // 1. Tính Góc Máy One-Shot Liền Mạch & Speed-Ramping (Nhanh - Chậm tuỳ cảnh)
            const cam = computeSkyGachaCamera(summonElapsed);
            const isAwakened5Star = summonElapsed >= 1.92;
            if (cam.cut === 2 || cam.cut === 3) {
                skyWhipScrollDist += dt * 2250 * cam.whipSpeedMult;
            }

            // 2. Vẽ Bầu Trời Vũ Trụ, Biển Mây Khối FBM Celestia phía dưới & Cổng Trời Thiên Đỉnh (Hiển thị rõ ngay từ Frame 1!)
            const portalIntensity = Math.max(0.28, Math.min(1, (summonElapsed + 0.08) / 0.30));
            drawHeavenlySkyBeamsAndPortal(ctxBack, ctxFront, summonElapsed, portalIntensity, screenCx, screenCy, curVw, curVh, cam);

            // 3. Vẽ 3 Vòng Tinh Cầu Chòm Sao 3D xoay quanh Cổng Trời Thiên Đỉnh (ở Pha 1, Pha 2 và Pha 4)
            if (cam.cut === 1 || cam.cut === 2 || cam.cut === 4) {
                for (let r = 0; r < skyZenithRings.length; r++) {
                    const zr = skyZenithRings[r];
                    const speedBoost = (summonElapsed >= 1.45 && summonElapsed <= 2.25) ? 2.2 : 1.0;
                    zr.rx += zr.vrx * dt * speedBoost;
                    zr.ry += zr.vry * dt * speedBoost;
                    zr.rz += zr.vrz * dt * speedBoost;
                    zr.radius = (135 + r * 62) + Math.sin(summonElapsed * 4.0 + r) * 14;
                    drawCamera3DRing(ctxBack, ctxFront, zr, cam, screenCx, screenCy);
                }
            }

            // =========================================================================
            // PHA 1 (0.00s -> 1.45s): "PHOTO CONDENSATION & SKYWARD ASCENT"
            // 0.00s -> 0.52s (Slow-Mo 0.42x): Bức ảnh chữ nhật của người dùng được dải lụa vàng quấn quanh, cuộn hoá thành Lõi Tinh Tú!
            // 0.52s -> 1.45s (Speed-Ramp 1.82x): Lõi Tinh Tú mang theo bức ảnh phóng vút từ Biển Mây lên thẳng Cổng Trời Thiên Đỉnh!
            // =========================================================================
            if (cam.cut === 1) {
                const condenseP = Math.max(0, Math.min(1, summonElapsed / 0.52));
                const easeCondense = condenseP * condenseP * (3 - 2 * condenseP);
                const ascendP = Math.max(0, Math.min(1, (summonElapsed - 0.42) / 1.03));
                const easeAscend = ascendP < 0.5 ? 2 * ascendP * ascendP : 1 - Math.pow(-2 * ascendP + 2, 2) / 2;

                const medWx = Math.sin(ascendP * Math.PI) * 24 * (1 - easeAscend);
                const medWy = 110 + (-420 - 110) * easeAscend;
                const medWz = 150 + (-920 - 150) * easeAscend;
                const medProj = project3DWithCam(medWx, medWy, medWz, cam, screenCx, screenCy);

                if (medProj) {
                    const medScale = Math.max(0.22, medProj.scale * Math.max(0.36, Math.min(1, (summonElapsed + 0.05) / 0.14)));

                    // Khi bắt đầu phóng lên (ascendP > 0.02), vẽ Dải Đuôi Sao Băng phóng thẳng từ dưới biển mây lên theo Lõi Tinh Tú
                    if (ascendP > 0.02) {
                        drawGenshinTaperedCometRibbon(
                            ctxFront,
                            medProj.sx,
                            medProj.sy,
                            0,
                            1,
                            Math.min(curVh * 0.55, 390 * medScale * (0.25 + ascendP)),
                            Math.max(14, 46 * medScale),
                            summonElapsed,
                            false
                        );
                    }

                    ctxFront.save();
                    ctxFront.translate(medProj.sx, medProj.sy);

                    // Hào quang hội tụ khi Bức Ảnh cuộn thành Lõi Sao
                    ctxFront.save();
                    ctxFront.globalCompositeOperation = 'lighter';
                    const haloR = Math.max(24, (115 - 22 * easeCondense) * medScale);
                    const haloGrad = ctxFront.createRadialGradient(0, 0, 4, 0, 0, haloR);
                    haloGrad.addColorStop(0, 'rgba(255, 255, 245, 1)');
                    haloGrad.addColorStop(0.38, 'rgba(255, 215, 0, 0.82)');
                    haloGrad.addColorStop(0.72, 'rgba(56, 189, 248, 0.46)');
                    haloGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
                    ctxFront.fillStyle = haloGrad;
                    ctxFront.beginPath();
                    ctxFront.arc(0, 0, haloR, 0, Math.PI * 2);
                    ctxFront.fill();
                    ctxFront.restore();

                    // Giai đoạn 0.00s -> 0.52s: Bức ảnh chữ nhật (window.skyOracleUserCardPhotoCanvas) thu gọn & bo tròn dần thành Huy Chương Tinh Tú!
                    if (condenseP < 0.96 && window.skyOracleUserCardPhotoCanvas) {
                        const rectAlpha = 1 - Math.pow(condenseP, 1.8);
                        const rectScale = Math.max(0.18, (1 - easeCondense * 0.52) * medScale);
                        const rw = 165 * rectScale;
                        const rh = 246 * rectScale;
                        ctxFront.save();
                        ctxFront.globalAlpha = rectAlpha;
                        ctxFront.rotate(easeCondense * 0.35);
                        ctxFront.drawImage(window.skyOracleUserCardPhotoCanvas, -rw * 0.5, -rh * 0.5, rw, rh);
                        ctxFront.restore();
                    }

                    // Huy chương tròn chứa ảnh chân dung trong Lõi Sao Băng hiện rõ dần khi ảnh chữ nhật cuộn lại
                    if (window.skyOracleUserThumbCanvas) {
                        const drawR = Math.max(2, (66 - 14 * easeAscend) * medScale * (0.45 + 0.55 * easeCondense));
                        ctxFront.save();
                        ctxFront.globalAlpha = Math.max(0, Math.min(1, condenseP * 1.45));
                        ctxFront.drawImage(window.skyOracleUserThumbCanvas, -drawR, -drawR, drawR * 2, drawR * 2);
                        ctxFront.strokeStyle = '#ffd700';
                        ctxFront.lineWidth = Math.max(1.8, 3.4 * medScale);
                        ctxFront.beginPath();
                        ctxFront.arc(0, 0, drawR, 0, Math.PI * 2);
                        ctxFront.stroke();
                        for (let b = 0; b < 8; b++) {
                            const ba = (b / 8) * Math.PI * 2 + summonElapsed * 3.4;
                            const pr = Math.max(1.5, 5.6 * medScale);
                            ctxFront.drawImage(atlas.pearl, Math.cos(ba) * drawR - pr, Math.sin(ba) * drawR - pr, pr * 2, pr * 2);
                        }
                        ctxFront.restore();
                    }
                    ctxFront.restore();

                    if (Math.random() < 0.72) {
                        spawnSkyMeteorWakeParticle(medWx, medWy, medWz, false, 0.55);
                    }
                }
            }

            // =========================================================================
            // PHA 2 (1.45s -> 2.65s): "BULLET-TIME APEX BLESSING & 180° U-TURN AT CELESTIAL GATE"
            // Không cắt cảnh! Lõi Sao bay vào tâm Cổng Trời Thiên Đỉnh trong Slow-Motion (0.28x),
            // hấp thụ Dải Lời Chúc Vàng 20.10 tại t=1.92s để thức tỉnh thành Sao Băng 5 Sao Hoàng Kim,
            // rồi uốn một vòng cung Parabol 180° mượt mà ngay trên đỉnh trời để chúc mũi lao xuống thế giới bên dưới!
            // =========================================================================
            if (cam.cut === 2) {
                const uP = (summonElapsed - 1.45) / 1.20; // 0 -> 1
                const gateProj = project3DWithCam(0, -420, -920, cam, screenCx, screenCy) || { sx: screenCx, sy: curVh * 0.22, scale: 0.52 };

                // Quỹ đạo Vòng Cung Parabol 180° (Apex U-Turn Arch) ngay tại Cổng Trời:
                // uP = 0.0 -> 0.40: Bay lên chạm đỉnh Cổng Trời; uP = 0.40 -> 1.0: Uốn vòng cung 180° hướng mũi xuống dưới!
                const archAngle = Math.PI - uP * Math.PI; // PI (trái-dưới cổng trời) -> PI/2 (đỉnh cổng trời) -> 0 (phải-dưới cổng trời)
                const archRx = Math.min(curVw * 0.22, 135);
                const archRy = Math.min(curVh * 0.14, 92);
                const meteorSx = gateProj.sx - Math.cos(archAngle) * archRx * Math.sin(uP * Math.PI) + (cam.shakeX || 0);
                const meteorSy = gateProj.sy - Math.sin(archAngle) * archRy + (uP > 0.55 ? Math.pow((uP - 0.55) / 0.45, 2) * curVh * 0.22 : 0) + (cam.shakeY || 0);

                // Hướng vận tốc tiếp tuyến dọc theo vòng cung 180° (từ bay lên -> ngang ở đỉnh -> chúc đầu lao xuống!)
                const tangentAngle = -Math.PI * 0.5 + uP * Math.PI * 0.92; // -90° (bay lên) -> +75° (chúc đầu lao xuống)
                const tailAngle = tangentAngle + Math.PI; // Đuôi sao băng luôn vươn ngược lại phía sau theo đúng tiếp tuyến vòng cung!
                const tailDirX = Math.cos(tailAngle);
                const tailDirY = Math.sin(tailAngle);

                // Vẽ Dải Đuôi Sao Băng uốn theo vòng cung U-Turn trên đỉnh trời
                drawGenshinTaperedCometRibbon(
                    ctxFront,
                    meteorSx,
                    meteorSy,
                    tailDirX,
                    tailDirY,
                    Math.min(curVh * 0.65, (isAwakened5Star ? 420 : 280) * cam.zoom),
                    (isAwakened5Star ? 38 : 28) * cam.zoom,
                    summonElapsed,
                    isAwakened5Star
                );

                // Từ 1.50s -> 1.92s: Dải Lụa Chữ Vàng Lời Chúc 20.10 từ Cổng Trời Thiên Đỉnh xoáy hội tụ vào Lõi Sao (Singularity Blessing)
                if (summonElapsed >= 1.50 && summonElapsed < 1.92) {
                    const sp = (summonElapsed - 1.50) / 0.42;
                    const implosionR = (1 - sp * sp) * 165 + 16;
                    ctxFront.save();
                    ctxFront.translate(meteorSx, meteorSy);
                    ctxFront.globalCompositeOperation = 'lighter';
                    ctxFront.strokeStyle = '#ffd700';
                    ctxFront.lineWidth = 3.2 + sp * 5.0;
                    ctxFront.beginPath();
                    ctxFront.arc(0, 0, implosionR, 0, Math.PI * 2);
                    ctxFront.stroke();
                    ctxFront.restore();
                }

                // TẠI ĐỈNH VÒNG CUNG (t = 1.92s): THỨC TỈNH 5 SAO HOÀNG KIM (5-STAR GOLDEN AWAKENING SUPERNOVA)!
                if (isAwakened5Star && !hasTriggeredAwakeningBoom) {
                    hasTriggeredAwakeningBoom = true;
                    for (let k = 0; k < 34; k++) {
                        spawnSkyMeteorWakeParticle(0, -420, -920, true, 1.75);
                    }
                    skyShockwaves.push({
                        wx: 0, wy: -420, wz: -920,
                        rx: 1.05, ry: -0.25, rz: 0.2,
                        radius: 24, maxRadius: 560,
                        life: 0, maxLife: 0.82,
                        color: '#ffd700', glow: '#ffffff'
                    });
                    skyShockwaves.push({
                        wx: 0, wy: -420, wz: -920,
                        rx: -0.82, ry: 0.45, rz: -0.3,
                        radius: 18, maxRadius: 440,
                        life: 0, maxLife: 0.72,
                        color: skyTheme.ringColorA, glow: '#ffd700'
                    });
                }

                if (summonElapsed >= 1.92 && summonElapsed < 2.36) {
                    const ap = (summonElapsed - 1.92) / 0.44;
                    const aAlpha = Math.pow(1 - ap, 1.85);
                    ctxFront.save();
                    ctxFront.globalCompositeOperation = 'lighter';
                    const goldWash = ctxFront.createRadialGradient(meteorSx, meteorSy, 10, meteorSx, meteorSy, Math.max(curVw, curVh) * 0.78);
                    goldWash.addColorStop(0, `rgba(255, 255, 240, ${(aAlpha * 0.92).toFixed(3)})`);
                    goldWash.addColorStop(0.34, `rgba(255, 215, 0, ${(aAlpha * 0.68).toFixed(3)})`);
                    goldWash.addColorStop(1, 'rgba(255, 160, 0, 0)');
                    ctxFront.fillStyle = goldWash;
                    ctxFront.fillRect(0, 0, curVw, curVh);
                    ctxFront.restore();
                }

                drawGenshin5StarMeteorScreenCore(ctxFront, meteorSx, meteorSy, (isAwakened5Star ? 1.15 : 0.88) * cam.zoom, summonElapsed, isAwakened5Star, cam, screenCx, screenCy);
            }

            // =========================================================================
            // PHA 3 (2.65s -> 4.85s): "CAMERA OVERTAKE & FRONT-LEAD ORBIT LOOKING BACK AT METEOR HEAD + CLOUD SEA BELOW"
            // Máy quay tăng tốc vượt qua thân sao, BỌC QUA ĐẦU SAO và luôn khoá ống kính nhìn ngược về Đầu Sao,
            // giúp thấy rõ Đầu Sao Băng 5 Sao (cùng bức ảnh chân dung & hộ vệ 3D) đang lao tới trên nền Biển Mây Khối 3D cuồn cuộn phía dưới!
            // =========================================================================
            if (cam.cut === 3) {
                const c3p = (summonElapsed - 2.65) / 2.20; // 0 -> 1
                const orbitBlend = cam.orbitBlend || 0;

                // Khi máy quay bọc qua đầu sao (orbitBlend: 0 -> 1):
                // Đầu Sao Băng được đặt ở tỷ lệ vàng phía trên-giữa khung hình (để toàn bộ 60% khung hình phía dưới mở rộng quay cảnh Biển Mây 3D cuồn cuộn bên dưới!),
                // còn Đuôi Sao Băng vươn ngược lên đỉnh trời phía sau Đầu Sao!
                const swayX = Math.sin(c3p * Math.PI * 2) * curVw * 0.06;
                const swayY = Math.cos(c3p * Math.PI * 2) * curVh * 0.04;
                const meteorSx = screenCx + swayX + (cam.shakeX || 0);
                const meteorSy = curVh * (0.44 - 0.05 * orbitBlend) + swayY + (cam.shakeY || 0);

                // Hướng đuôi sao băng: khi mới vào Pha 3 hơi nghiêng chéo (-1.15 rad), sau khi máy quay bọc ra chính diện đầu sao thì vươn ngược lên bầu trời phía sau (-PI/2)
                const tailAngle = -1.12 * (1 - orbitBlend) + (-Math.PI * 0.5 + Math.sin(c3p * Math.PI * 2) * 0.16) * orbitBlend;
                const tailDirX = Math.cos(tailAngle);
                const tailDirY = Math.sin(tailAngle);
                const tailPerpX = -tailDirY;
                const tailPerpY = tailDirX;

                // 1. Vẽ Vệt Xé Gió Điện Ảnh (Speed-Lines) biến thiên theo Speed-Ramping (Nhanh 1.78x -> Chậm 0.34x -> Nhanh 1.92x)
                const spanDiag = Math.hypot(curVw, curVh) * 1.35;
                ctxFront.save();
                ctxFront.globalCompositeOperation = 'lighter';
                ctxFront.lineCap = 'round';
                for (let l = 0; l < skySpeedLines.length; l++) {
                    const sl = skySpeedLines[l];
                    const distAlong = ((sl.u * spanDiag + skyWhipScrollDist * (sl.speed / 1850)) % spanDiag) - spanDiag * 0.5;
                    const laneDist = sl.laneOffset * Math.max(curVw, curVh) * 0.58;
                    const lx = screenCx + tailDirX * distAlong + tailPerpX * laneDist;
                    const ly = screenCy + tailDirY * distAlong + tailPerpY * laneDist;
                    const sLen = sl.len * cam.whipSpeedMult * 1.15;
                    ctxFront.globalAlpha = 0.42 * Math.min(1, cam.whipSpeedMult * 0.85);
                    ctxFront.strokeStyle = sl.color;
                    ctxFront.lineWidth = sl.thickness * 1.25;
                    ctxFront.beginPath();
                    ctxFront.moveTo(lx, ly);
                    ctxFront.lineTo(lx + tailDirX * sLen, ly + tailDirY * sLen);
                    ctxFront.stroke();
                }
                ctxFront.restore();

                // 2. Vẽ Dải Đuôi Sao Băng Plasma 3 Lớp vươn ngược từ Đầu Sao lên phía Cổng Trời phía sau
                const tailLength = curVh * (0.78 - 0.18 * orbitBlend);
                const headBaseRadius = 44 * cam.zoom;
                drawGenshinTaperedCometRibbon(
                    ctxFront,
                    meteorSx,
                    meteorSy,
                    tailDirX,
                    tailDirY,
                    tailLength,
                    headBaseRadius,
                    summonElapsed,
                    true
                );

                // 3. Phun các Thực Thể 3D Chủ Đề (Hồ điệp vàng, Cánh hoa nhung, Anh đào, Kim cương, Ngọc trai) bay tạt qua ống kính!
                skyParticleAccum += dt;
                const spawnInterval = 0.022;
                if (skyParticleAccum >= spawnInterval) {
                    skyParticleAccum = 0;
                    const worldX = (meteorSx - screenCx);
                    const worldY = (meteorSy - screenCy);
                    spawnSkyMeteorWakeParticle(worldX, worldY, (Math.random() - 0.5) * 140, true, 1.25);
                    const newestP = particles[particles.length - 1];
                    if (newestP) {
                        const slipSpd = (520 + Math.random() * 440) * Math.max(0.45, cam.whipSpeedMult);
                        newestP.vx += tailDirX * slipSpd;
                        newestP.vy += tailDirY * slipSpd;
                    }
                }

                // 4. Vẽ Đầu Sao Băng 5 Sao (chứa Chân Dung Người Dùng & Hộ Vệ Nguyên Tố 3D xoay quanh mũi sao) đang lao thẳng về phía máy quay!
                drawGenshin5StarMeteorScreenCore(ctxFront, meteorSx, meteorSy, cam.zoom, summonElapsed, true, cam, screenCx, screenCy);
            }

            // =========================================================================
            // PHA 4 (4.85s -> 6.20s): "LENS ARRIVAL & STAR-TO-LETTER ALCHEMY"
            // 4.85s -> 5.26s: Sao băng 5 Sao lao tới chính giữa ống kính!
            // 5.26s -> 6.20s: Từ tâm Hào Quang 5 Sao, Lõi Sao mở tung thành Lá Thư Ánh Kim (có ảnh của bạn + 3 dòng chữ vàng lời chúc)
            // và được Cánh Phong Bì Lụa ôm lấy trước khi bàn giao sang Phong Bì 3D đóng dấu sáp vàng 24K!
            // =========================================================================
            if (cam.cut === 4) {
                if (summonElapsed < 5.26) {
                    const cp = (summonElapsed - 4.85) / 0.41;
                    const expScale = 1.25 + Math.pow(cp, 2.4) * 5.6;
                    const crashSx = screenCx + (cam.shakeX || 0);
                    const crashSy = screenCy - (1 - cp * cp) * curVh * 0.12 + (cam.shakeY || 0);

                    ctxFront.save();
                    ctxFront.globalCompositeOperation = 'lighter';
                    ctxFront.lineCap = 'round';
                    for (let l = 0; l < 32; l++) {
                        const sl = skySpeedLines[l];
                        const rInner = (45 + (l % 5) * 32) * (0.4 + cp * 1.6);
                        const rOuter = rInner + (135 + (l % 4) * 80) * (0.5 + cp * 2.0);
                        ctxFront.globalAlpha = Math.min(1, (0.35 + cp * 0.65));
                        ctxFront.strokeStyle = l % 2 === 0 ? '#ffd700' : '#ffffff';
                        ctxFront.lineWidth = 1.6 + cp * 3.2;
                        ctxFront.beginPath();
                        ctxFront.moveTo(crashSx + Math.cos(sl.ang) * rInner, crashSy + Math.sin(sl.ang) * rInner);
                        ctxFront.lineTo(crashSx + Math.cos(sl.ang) * rOuter, crashSy + Math.sin(sl.ang) * rOuter);
                        ctxFront.stroke();
                    }
                    ctxFront.restore();

                    drawGenshin5StarMeteorScreenCore(ctxFront, crashSx, crashSy, expScale, summonElapsed, true, cam, screenCx, screenCy);
                } else {
                    if (!hasTriggeredImpactSupernova) {
                        hasTriggeredImpactSupernova = true;
                        for (let k = 0; k < 36; k++) {
                            spawnSkyMeteorWakeParticle(0, 0, (Math.random() - 0.5) * 200, true, 1.95);
                        }
                        skyShockwaves.push({
                            wx: 0, wy: 0, wz: 0,
                            rx: 1.12, ry: 0.18, rz: 0,
                            radius: 26, maxRadius: 540,
                            life: 0, maxLife: 0.72,
                            color: '#ffd700', glow: '#ffffff'
                        });
                    }

                    const wp = (summonElapsed - 5.26) / 0.94; // 0 -> 1
                    ctxFront.save();
                    const washAlpha = wp < 0.22 ? (0.68 + (wp / 0.22) * 0.24) : (0.92 - (wp - 0.22) * 0.45);
                    const washGrad = ctxFront.createRadialGradient(screenCx, screenCy, 10, screenCx, screenCy, Math.max(curVw, curVh) * 0.85);
                    washGrad.addColorStop(0, `rgba(255, 254, 245, ${washAlpha.toFixed(3)})`);
                    washGrad.addColorStop(0.45, `rgba(255, 232, 145, ${(washAlpha * 0.82).toFixed(3)})`);
                    washGrad.addColorStop(1, `rgba(255, 195, 55, ${(washAlpha * 0.55).toFixed(3)})`);
                    ctxFront.fillStyle = washGrad;
                    ctxFront.fillRect(0, 0, curVw, curVh);
                    ctxFront.restore();

                    // Vẽ Đại Pháp Trận Kim Hoàn 3D làm nền và quá trình Lõi Sao mở tung thành Lá Thư Ánh Kim!
                    drawSummonCenterMotif(ctxFront, cfg.id, summonElapsed - 5.05, screenCx + (cam.shakeX || 0), screenCy + (cam.shakeY || 0));
                    drawStarToLetterEnvelopeWeave(ctxFront, screenCx + (cam.shakeX || 0), screenCy + (cam.shakeY || 0), wp, summonElapsed);
                }
            }

            // 7. Cập nhật & Vẽ các Vòng Sóng Xung Kích 3D (skyShockwaves)
            const ringCam = (cam.cut === 3)
                ? { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: cam.roll || 0, fov: 700, shakeX: cam.shakeX, shakeY: cam.shakeY }
                : cam;
            for (let sIdx = skyShockwaves.length - 1; sIdx >= 0; sIdx--) {
                const sw = skyShockwaves[sIdx];
                sw.life += dt;
                if (sw.life >= sw.maxLife) {
                    skyShockwaves.splice(sIdx, 1);
                    continue;
                }
                const prog = sw.life / sw.maxLife;
                const easeSw = 1 - Math.pow(1 - prog, 2.6);
                sw.radius = 24 + (sw.maxRadius - 24) * easeSw;
                sw.rz += dt * 2.8;
                drawCamera3DRing(ctxBack, ctxFront, {
                    cx: sw.wx, cy: sw.wy, cz: sw.wz,
                    radius: sw.radius,
                    rx: sw.rx, ry: sw.ry, rz: sw.rz,
                    color: sw.color,
                    glowColor: sw.glow,
                    lineWidth: 3.4 * (1 - prog * 0.65),
                    dashed: false,
                    alpha: (1 - prog) * 0.96
                }, ringCam, screenCx, screenCy);
            }

            // 8. Cập nhật & Vẽ toàn bộ Hạt Vật Lý 3D có Texture Kim Hoàn (ZERO HEAP ALLOCATION!)
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.life += dt;
                if (p.life >= p.maxLife) {
                    particles.splice(i, 1);
                    continue;
                }
                const dragFactor = Math.max(0, 1 - p.drag * dt);
                p.vx *= dragFactor;
                p.vy *= dragFactor;
                p.vz *= dragFactor;
                p.vy += p.gravity * dt;
                if (p.flutter > 0) {
                    p.phase += dt * 5.2;
                    p.vx += Math.sin(p.phase) * p.flutter * dt;
                }
                if (p.type === 'butterfly') p.flapPhase += p.flapSpeed * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.z += p.vz * dt;
                p.rx += p.vrx * dt;
                p.ry += p.vry * dt;
                p.rz += p.vrz * dt;
                const lr = p.life / p.maxLife;
                p.alpha = lr < 0.14 ? lr / 0.14 : (lr > 0.72 ? (1 - lr) / 0.28 : 1);

                const pr = project3DWithCam(p.x, p.y, p.z, ringCam, screenCx, screenCy);
                if (pr) {
                    const origX = p.x, origY = p.y, origZ = p.z;
                    p.x = (pr.sx - screenCx) / pr.scale;
                    p.y = (pr.sy - screenCy) / pr.scale;
                    p.z = ringCam.fov - ringCam.fov / pr.scale;
                    draw3DProjectedParticle(pr.cz < 0 ? ctxBack : ctxFront, p, screenCx, screenCy, ringCam.fov);
                    p.x = origX;
                    p.y = origY;
                    p.z = origZ;
                }
            }

            } catch (skyErr) {
                console.error('Sky Oracle frame error:', skyErr);
            }

            // Khi hoàn tất trọn vẹn 6.20 giây Đại Cảnh One-Shot 3D & ảnh thiệp đã kết xuất xong 100% -> Chuyển sang Pha Phong Bì 3D Khép Lại & Đóng Dấu Sáp Vàng 24K!
            if (window.isRecipientCardImageReady && summonElapsed >= SKY_ORACLE_TOTAL) {
                if (cardImg && finalResultImg && finalResultImg.src) {
                    cardImg.src = finalResultImg.src;
                }
                u3dCurrentDirectorState = 'sky_descending';
                arriveStartTime = now;
                stage.classList.remove('is-summoning');
                stage.classList.add('is-arriving');
            }

            u3dAnimFrameId = requestAnimationFrame(stepPhysicsDirector);
            return;
        }

        // ====== TRẠNG THÁI 0-SKY-B: MÀN SƯƠNG HOÀNG KIM 5 SAO TAN MỞ, PHONG BÌ 3D HIỆN RA & ĐÓNG DẤU SÁP VÀNG 24K (1.18 GIÂY) ======
        if (u3dCurrentDirectorState === 'sky_descending') {
            if (arriveStartTime === null) arriveStartTime = now;
            const arriveElapsed = Math.max(0, (now - arriveStartTime) / 1000);
            const SKY_DESCEND_TOTAL = 1.18;

            // Giữ nền trời 3D dịu dần mượt mà khi Phong Bì 3D hiện ra ở chính tâm sân khấu
            const beamFade = Math.max(0, 1 - Math.pow(arriveElapsed / SKY_DESCEND_TOTAL, 1.55));
            drawHeavenlySkyBeamsAndPortal(ctxBack, ctxFront, 6.20 + arriveElapsed, beamFade, screenCx, screenCy, curVw, curVh);

            // Màn Sương Hoàng Kim 5 Sao (Golden Washout Veil) từ cuối Cut 4 tan dần mượt mà trong 0.58s đầu của sky_descending
            if (arriveElapsed < 0.58) {
                const veilFade = Math.pow(1 - arriveElapsed / 0.58, 1.75) * 0.72;
                ctxFront.save();
                ctxFront.globalCompositeOperation = 'lighter';
                const veilGrad = ctxFront.createRadialGradient(screenCx, screenCy, 12, screenCx, screenCy, Math.max(curVw, curVh) * 0.8);
                veilGrad.addColorStop(0, `rgba(255, 254, 240, ${veilFade.toFixed(3)})`);
                veilGrad.addColorStop(0.5, `rgba(255, 224, 130, ${(veilFade * 0.75).toFixed(3)})`);
                veilGrad.addColorStop(1, 'rgba(255, 195, 55, 0)');
                ctxFront.fillStyle = veilGrad;
                ctxFront.fillRect(0, 0, curVw, curVh);
                ctxFront.restore();
            }

            // Pha 1 (0.00s -> 0.84s): Phong bì 3D kết tinh từ tâm Hào Quang 5 Sao và xoay 3D uyển chuyển vào giữa màn hình
            const envP = Math.min(1, arriveElapsed / 0.84);
            const easeEnv = 1 - Math.pow(1 - envP, 3);

            // Pha 2 (0.66s -> 1.18s): Phong Ấn Vàng 24K từ trên giáng xuống đóng dấu lên nắp phong bì
            const sealP = Math.max(0, Math.min(1, (arriveElapsed - 0.66) / 0.52));
            let sealScale = 2.5;
            let sealTy = -56;
            let sealOp = 0;
            let envRecoilY = 0;

            if (sealP > 0) {
                if (sealP < 0.62) {
                    const downP = sealP / 0.62;
                    const easeDown = downP * downP;
                    sealScale = 2.5 - 1.58 * easeDown;
                    sealTy = -56 * (1 - easeDown);
                    sealOp = Math.min(1, downP * 1.85);
                } else {
                    const bounceP = (sealP - 0.62) / 0.38;
                    sealScale = 0.92 + 0.08 * Math.sin(bounceP * Math.PI * 0.5);
                    sealTy = 0;
                    sealOp = 1;
                    envRecoilY = Math.sin(bounceP * Math.PI) * 6;
                    if (!hasSpawnedArrivalStamp) {
                        hasSpawnedArrivalStamp = true;
                        const envMouthWorldY0 = (envBaseCy - envBaseH * 0.24) - screenCy;
                        const sealWorldY0 = envMouthWorldY0 + envBaseH * 0.28;
                        spawnSealBreakExplosion(sealWorldY0);
                    }
                }
            }

            const envScale = 0.32 + 0.68 * easeEnv;
            const envTx = Math.sin(envP * Math.PI) * 14 * (1 - easeEnv);
            const envTy = -52 * (1 - easeEnv) + envRecoilY;
            const envRx = 34 * (1 - easeEnv) + 6;
            const envRy = -20 * (1 - easeEnv);
            const envRz = 6 * (1 - easeEnv);
            const envOp = Math.min(1, envP * 2.4);

            const envTransform = `perspective(1400px) translate3d(${envTx.toFixed(1)}px, ${envTy.toFixed(1)}px, 0px) scale(${envScale.toFixed(3)}) rotateX(${envRx.toFixed(2)}deg) rotateY(${envRy.toFixed(2)}deg) rotateZ(${envRz.toFixed(2)}deg)`;
            backRig.style.transform = envTransform;
            frontRig.style.transform = envTransform;
            backRig.style.opacity = envOp.toFixed(2);
            frontRig.style.opacity = envOp.toFixed(2);

            if (sealBtn) {
                sealBtn.style.opacity = sealOp.toFixed(2);
                sealBtn.style.transform = `translate3d(0px, ${sealTy.toFixed(1)}px, 0px) scale(${sealScale.toFixed(3)})`;
            }

            if (floorShadow) {
                floorShadow.style.opacity = (envOp * easeEnv).toFixed(2);
                floorShadow.style.transform = `scale(${envScale.toFixed(3)})`;
            }

            cardActor.style.opacity = '0';

            if (envP < 0.84 && Math.random() < 0.72) {
                spawnSkyMeteorWakeParticle(envTx + (Math.random() - 0.5) * 140 * envScale, envTy + (Math.random() - 0.5) * 60 * envScale, (Math.random() - 0.5) * 120, true, 0.75);
            }

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.life += dt;
                if (p.life >= p.maxLife) {
                    particles.splice(i, 1);
                    continue;
                }
                const dragFactor = Math.max(0, 1 - p.drag * dt);
                p.vx *= dragFactor;
                p.vy *= dragFactor;
                p.vz *= dragFactor;
                p.vy += p.gravity * dt;
                if (p.type === 'butterfly') p.flapPhase += p.flapSpeed * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.z += p.vz * dt;
                p.rx += p.vrx * dt;
                p.ry += p.vry * dt;
                p.rz += p.vrz * dt;
                const lr = p.life / p.maxLife;
                p.alpha = lr < 0.15 ? lr / 0.15 : (lr > 0.7 ? (1 - lr) / 0.3 : 1);
                draw3DProjectedParticle(p.z < 0 ? ctxBack : ctxFront, p, screenCx, screenCy, focal);
            }

            if (arriveElapsed >= SKY_DESCEND_TOTAL) {
                u3dCurrentDirectorState = 'waiting';
                stage.classList.remove('is-arriving');
                frontRig.style.pointerEvents = 'none';
                if (sealBtn) {
                    sealBtn.style.opacity = '1';
                    sealBtn.style.transform = 'translate3d(0,0,0) scale(1)';
                    sealBtn.style.pointerEvents = 'auto';
                }
            }

            u3dAnimFrameId = requestAnimationFrame(stepPhysicsDirector);
            return;
        }


        // ====== TRẠNG THÁI 0A: TRIỆU HỒI THIỆP BẰNG MOTION 3D (KHI ĐANG TẢI ẢNH TỪ LINK - KHÔNG DÙNG CHỮ LOADING!) ======
        if (u3dCurrentDirectorState === 'summoning') {
            if (summonStartTime === null) summonStartTime = now;
            const summonElapsed = Math.max(0, (now - summonStartTime) / 1000);
            backRig.style.opacity = '0';
            frontRig.style.opacity = '0';
            cardActor.style.opacity = '0';

            // 1. Vẽ 3 Vòng Quỹ Đạo Ánh Sáng 3D xoay kết tinh quanh tâm sân khấu
            for (let r = 0; r < summonRings.length; r++) {
                const sr = summonRings[r];
                sr.rx += sr.vrx * dt;
                sr.ry += sr.vry * dt;
                sr.rz += sr.vrz * dt;
                sr.radius = (88 + r * 26) + Math.sin(summonElapsed * 3.4 + r) * 12;
                drawSplit3DRing(ctxBack, ctxFront, sr, screenCx, screenCy, focal, 0);
            }

            // 2. Sinh các hạt 3D theo chủ đề xoáy hội tụ từ ngoài vào tâm
            summonSpawnAccum += dt;
            if (summonSpawnAccum >= 0.045) {
                summonSpawnAccum = 0;
                spawnSummonVortexParticle();
                spawnSummonVortexParticle();
            }

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.life += dt;
                if (p.life >= p.maxLife) {
                    particles.splice(i, 1);
                    continue;
                }
                const dragFactor = Math.max(0, 1 - p.drag * dt);
                p.vx *= dragFactor;
                p.vy *= dragFactor;
                p.vz *= dragFactor;
                if (p.type === 'butterfly') p.flapPhase += p.flapSpeed * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.z += p.vz * dt;
                p.rx += p.vrx * dt;
                p.ry += p.vry * dt;
                p.rz += p.vrz * dt;
                const lr = p.life / p.maxLife;
                p.alpha = lr < 0.18 ? lr / 0.18 : (lr > 0.72 ? (1 - lr) / 0.28 : 1);
                draw3DProjectedParticle(p.z < 0 ? ctxBack : ctxFront, p, screenCx, screenCy, focal);
            }

            // 3. Vẽ Biểu Tượng Ánh Sáng 3D của chủ đề đang kết tinh tại tâm
            drawSummonCenterMotif(ctxFront, cfg.id, summonElapsed, screenCx, screenCy);

            // Ngay khi ảnh thiệp đã tải & giải mã xong 100% (và hoàn thành tối thiểu 0.72s nhịp điệu mở màn) -> Chuyển sang pha Phong Bì Lướt Vào & Đóng Dấu Sáp!
            if (window.isRecipientCardImageReady && summonElapsed >= 0.72) {
                u3dCurrentDirectorState = 'arriving';
                arriveStartTime = now;
                stage.classList.remove('is-summoning');
                stage.classList.add('is-arriving');
                spawnSealBreakExplosion(0);
            }

            u3dAnimFrameId = requestAnimationFrame(stepPhysicsDirector);
            return;
        }

        // ====== TRẠNG THÁI 0B: PHONG BÌ 3D LƯỚT VÀO & CON DẤU SÁP VÀNG GIÁNG XUỐNG ĐÓNG DẤU SẴN SÀNG ======
        if (u3dCurrentDirectorState === 'arriving') {
            if (arriveStartTime === null) arriveStartTime = now;
            const arriveElapsed = Math.max(0, (now - arriveStartTime) / 1000);
            const ARRIVE_TOTAL = 0.76;

            // Pha 1 (0.00s -> 0.48s): Phong bì 3D kết tinh và lướt từ chiều sâu 3D vào giữa sân khấu
            const envP = Math.min(1, arriveElapsed / 0.48);
            const easeEnv = 1 - Math.pow(1 - envP, 3);

            // Pha 2 (0.36s -> 0.76s): Con dấu sáp vàng 3D từ trên cao giáng xuống đóng dấu vào nắp phong bì (tại t = 0.60s)
            const sealP = Math.max(0, Math.min(1, (arriveElapsed - 0.36) / 0.40));
            let sealScale = 2.45;
            let sealTy = -42;
            let sealOp = 0;
            let envRecoilY = 0;

            if (sealP > 0) {
                if (sealP < 0.62) {
                    const downP = sealP / 0.62;
                    const easeDown = downP * downP;
                    sealScale = 2.45 - 1.53 * easeDown; // 2.45 -> 0.92
                    sealTy = -42 * (1 - easeDown);
                    sealOp = Math.min(1, downP * 1.8);
                } else {
                    const bounceP = (sealP - 0.62) / 0.38;
                    sealScale = 0.92 + 0.08 * Math.sin(bounceP * Math.PI * 0.5);
                    sealTy = 0;
                    sealOp = 1;
                    envRecoilY = Math.sin(bounceP * Math.PI) * 5.5;
                    if (!hasSpawnedArrivalStamp) {
                        hasSpawnedArrivalStamp = true;
                        const envMouthWorldY0 = (envBaseCy - envBaseH * 0.24) - screenCy;
                        const sealWorldY0 = envMouthWorldY0 + envBaseH * 0.28;
                        spawnSealBreakExplosion(sealWorldY0);
                    }
                }
            }

            const envScale = 0.54 + 0.46 * easeEnv;
            const envTy = (1 - easeEnv) * -36 + envRecoilY;
            const envRx = 32 * (1 - easeEnv) + 6;
            const envRy = -16 * (1 - easeEnv);
            const envRz = (1 - easeEnv) * -6;
            const envOp = Math.min(1, envP * 1.65);

            const envTransform = `perspective(1400px) translate3d(0px, ${envTy.toFixed(1)}px, 0px) scale(${envScale.toFixed(3)}) rotateX(${envRx.toFixed(2)}deg) rotateY(${envRy.toFixed(2)}deg) rotateZ(${envRz.toFixed(2)}deg)`;
            backRig.style.transform = envTransform;
            frontRig.style.transform = envTransform;
            backRig.style.opacity = envOp.toFixed(2);
            frontRig.style.opacity = envOp.toFixed(2);

            if (sealBtn) {
                sealBtn.style.opacity = sealOp.toFixed(2);
                sealBtn.style.transform = `translate3d(0px, ${sealTy.toFixed(1)}px, 0px) scale(${sealScale.toFixed(3)})`;
            }

            if (floorShadow) {
                floorShadow.style.opacity = envOp.toFixed(2);
                floorShadow.style.transform = `scale(${envScale.toFixed(3)})`;
            }

            cardActor.style.opacity = '0';

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.life += dt;
                if (p.life >= p.maxLife) {
                    particles.splice(i, 1);
                    continue;
                }
                const dragFactor = Math.max(0, 1 - p.drag * dt);
                p.vx *= dragFactor;
                p.vy *= dragFactor;
                p.vz *= dragFactor;
                p.vy += p.gravity * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.z += p.vz * dt;
                p.rx += p.vrx * dt;
                p.ry += p.vry * dt;
                p.rz += p.vrz * dt;
                const lr = p.life / p.maxLife;
                p.alpha = lr < 0.15 ? lr / 0.15 : (lr > 0.7 ? (1 - lr) / 0.3 : 1);
                draw3DProjectedParticle(p.z < 0 ? ctxBack : ctxFront, p, screenCx, screenCy, focal);
            }

            if (arriveElapsed >= ARRIVE_TOTAL) {
                u3dCurrentDirectorState = 'waiting';
                stage.classList.remove('is-arriving');
                frontRig.style.pointerEvents = 'none';
                if (sealBtn) {
                    sealBtn.style.opacity = '1';
                    sealBtn.style.transform = 'translate3d(0,0,0) scale(1)';
                    sealBtn.style.pointerEvents = 'auto';
                }
            }

            u3dAnimFrameId = requestAnimationFrame(stepPhysicsDirector);
            return;
        }

        // ====== TRẠNG THÁI 1: PHONG BÌ & ẤN SÁP ĐÃ SẴN SÀNG 100%, CHỜ NGƯỜI NHẬN CHẠM MỞ ======
        if (u3dCurrentDirectorState === 'waiting') {
            const floatT = now * 0.0022;
            const idleY = Math.sin(floatT) * 7;
            const idleRotZ = Math.cos(floatT * 0.7) * 1.2;

            u3dPointerCurRotX += (u3dPointerTargetRotX - u3dPointerCurRotX) * Math.min(1, dt * 10);
            u3dPointerCurRotY += (u3dPointerTargetRotY - u3dPointerCurRotY) * Math.min(1, dt * 10);

            const rx = 6 + u3dPointerCurRotX;
            const ry = u3dPointerCurRotY;
            const rz = idleRotZ;

            const envTransform = `perspective(1400px) translate3d(0px, ${idleY.toFixed(1)}px, 0px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
            backRig.style.transform = envTransform;
            frontRig.style.transform = envTransform;
            backRig.style.opacity = '1';
            frontRig.style.opacity = '1';

            if (floorShadow) {
                floorShadow.style.transform = `translate3d(${(ry * 1.4).toFixed(1)}px, ${(-idleY * 0.5).toFixed(1)}px, 0) scale(${(1 - idleY * 0.006).toFixed(3)})`;
            }

            // Đặt tấm thiệp nằm gọn bên trong túi chữ V của phong bì bằng GPU transform + scale
            const cardLeft = screenCx - cardInPocketW * 0.5;
            const cardTop = envBaseCy - envBaseH * 0.36 + idleY;
            const envBottomY = envBaseCy + envBaseH * 0.445 + idleY;
            const bottomClipUnscaled = Math.max(0, ((cardTop + cardInPocketH) - envBottomY) / pocketScale);

            cardActor.style.opacity = '0';
            cardActor.style.transform = `translate3d(${cardLeft.toFixed(1)}px, ${cardTop.toFixed(1)}px, 0px) scale(${pocketScale.toFixed(4)})`;
            cardActor.style.clipPath = `inset(0px 0px ${bottomClipUnscaled.toFixed(1)}px 0px)`;
            isClipPathNone = false;

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.phase += dt * 2.2;
                p.x += Math.sin(p.phase) * 14 * dt;
                p.y += Math.cos(p.phase * 0.8) * 12 * dt;
                p.rz += p.vrz * dt;
                draw3DProjectedParticle(ctxBack, p, screenCx, screenCy, focal);
            }

            u3dAnimFrameId = requestAnimationFrame(stepPhysicsDirector);
            return;
        }

        // ====== TRẠNG THÁI 2: KHỞI ĐỘNG SÁP THƯ HỒI HỘP -> BẬT NẮP -> RÚT THIỆP TỪ TỪ 0%->100% KHỎI BÌ THƯ ======
        if (!openStartTime) openStartTime = now;
        const elapsed = Math.max(0, (now - openStartTime) / 1000);
        const envMouthWorldY = (envBaseCy - envBaseH * 0.24) - screenCy;
        const sealWorldY = envMouthWorldY + envBaseH * 0.28;

        // ---------------------------------------------------------------------------------
        // PHA A (0.00s -> 0.88s): KHỞI ĐỘNG / VẬN ĐỘNG HỒI HỘP TRÊN CON DẤU SÁP THEO TỪNG CHẾ ĐỘ
        // ---------------------------------------------------------------------------------
        const w = Math.min(1, elapsed / WINDUP_END);

        if (elapsed < WINDUP_END) {
            // Con dấu sáp & biểu tượng trung tâm vận động riêng biệt theo đúng chủ đề hiệu ứng đã chọn
            let sealScale = 1;
            let sealRotZ = 0;
            let sealTx = 0;
            let sealTy = 0;
            let emblemTransform = '';

            if (cfg.id === 'bloom') {
                // Đại Hoa Trà: 3 nhịp đập trái tim dồn dập + hoa trà xoay lấy đà ngược chiều kim đồng hồ rồi bùng nở
                const beat = Math.abs(Math.sin(w * Math.PI * 3.5));
                sealScale = 1 + 0.22 * beat * w;
                sealRotZ = w < 0.35 ? (w / 0.35) * 16 : 16 - ((w - 0.35) / 0.65) * 52;
                sealTx = Math.sin(elapsed * 55) * 2.5 * w * w;
            } else if (cfg.id === 'butterflies') {
                // Hồ Điệp Vàng: Cánh bướm vàng trên ấn sáp vỗ cánh nhanh dần như đang thức giấc muốn bay vọt khỏi sáp
                const wingScaleX = 0.32 + 0.68 * Math.abs(Math.cos(w * Math.PI * 10));
                sealScale = 1 + 0.18 * w;
                sealTy = -Math.abs(Math.sin(w * Math.PI * 5)) * 8 * w;
                sealRotZ = Math.sin(w * Math.PI * 8) * 6 * w;
                emblemTransform = `scaleX(${wingScaleX.toFixed(2)}) scaleY(${(1 + 0.12 * w).toFixed(2)})`;
            } else if (cfg.id === 'ribbon') {
                // Ruy-Băng Lụa: (0 -> 0.42) Nút nơ thắt căng lấy đà; (0.42 -> 1.0) 4 dải lụa tuột mở bay vút ra 4 phía!
                if (w < 0.42) {
                    const tw = w / 0.42;
                    sealScale = 1 - 0.08 * Math.sin(tw * Math.PI) + 0.15 * tw;
                    sealRotZ = -18 * Math.sin(tw * Math.PI * 0.5);
                } else {
                    const uw = (w - 0.42) / 0.58;
                    const easeUw = 1 - Math.pow(1 - uw, 2.6);
                    sealScale = 1.07 + 0.25 * easeUw;
                    sealRotZ = -18 + easeUw * 140;
                    const op = `${Math.max(0, 1 - easeUw * 1.15).toFixed(2)}`;
                    if (strapEls.hL) { strapEls.hL.style.transform = `translateX(${(-easeUw * 115).toFixed(1)}px) rotateZ(${(-easeUw * 22).toFixed(1)}deg) scaleX(${(1 - easeUw * 0.65).toFixed(2)})`; strapEls.hL.style.opacity = op; }
                    if (strapEls.hR) { strapEls.hR.style.transform = `translateX(${(easeUw * 115).toFixed(1)}px) rotateZ(${(easeUw * 22).toFixed(1)}deg) scaleX(${(1 - easeUw * 0.65).toFixed(2)})`; strapEls.hR.style.opacity = op; }
                    if (strapEls.vT) { strapEls.vT.style.transform = `translateY(${(-easeUw * 95).toFixed(1)}px) scaleY(${(1 - easeUw * 0.65).toFixed(2)})`; strapEls.vT.style.opacity = op; }
                    if (strapEls.vB) { strapEls.vB.style.transform = `translateY(${(easeUw * 95).toFixed(1)}px) scaleY(${(1 - easeUw * 0.65).toFixed(2)})`; strapEls.vB.style.opacity = op; }
                }
            } else if (cfg.id === 'galaxy') {
                // Ngân Hà Sao: La bàn thiên văn quay gia tốc như con quay hồi chuyển tụ năng lượng vũ trụ
                sealScale = 1 + 0.24 * (w * w);
                sealRotZ = Math.pow(w, 2.2) * 420;
            } else if (cfg.id === 'sakura') {
                // Lốc Anh Đào: Con dấu xoay cuốn theo tâm bão hoa anh đào + rung nhịp gió xuân
                sealScale = 1 + 0.20 * Math.sin(w * Math.PI * 0.8);
                sealRotZ = Math.pow(w, 1.9) * 320;
                sealTx = Math.cos(elapsed * 42) * 3.5 * w;
                sealTy = Math.sin(elapsed * 42) * 3.5 * w;
            } else if (cfg.id === 'hearts') {
                // Kim Cương Sao: Viên kim cương 16 giác cắt rung cộng hưởng pha lê tần số cao & lóe sáng đa diện
                const crystalPulse = Math.sin(w * Math.PI * 7);
                sealScale = 1 + 0.24 * w + 0.08 * Math.abs(crystalPulse);
                sealRotZ = crystalPulse * 14 * w;
                sealTx = Math.sin(elapsed * 75) * 3.2 * w * w;
                emblemTransform = `rotateZ(${(w * 90).toFixed(1)}deg) scale(${(1 + 0.15 * Math.abs(crystalPulse)).toFixed(2)})`;
            }

            if (sealBtn) {
                sealBtn.style.opacity = '1';
                sealBtn.style.transform = `translate3d(${sealTx.toFixed(1)}px, ${sealTy.toFixed(1)}px, 0) scale(${sealScale.toFixed(3)}) rotateZ(${sealRotZ.toFixed(1)}deg)`;
            }
            if (sealEmblem) {
                sealEmblem.style.transform = emblemTransform;
            }

            // Phun các hạt mồi thức tỉnh quanh con dấu sáp trong lúc khởi động hồi hộp
            windupSpawnAccum += dt;
            if (windupSpawnAccum >= 0.065) {
                windupSpawnAccum = 0;
                spawnWindupSealParticle(sealWorldY, w);
            }
        } else {
            // Sau t = 0.88s: Phong ấn vỡ tung & bay vọt lên khi nắp thư bật mở
            if (sealBtn) {
                const sp = Math.min(1, (elapsed - WINDUP_END) / 0.22);
                sealBtn.style.opacity = `${(1 - sp).toFixed(2)}`;
                sealBtn.style.transform = `translate3d(0, ${(-sp * 48).toFixed(1)}px, 0) scale(${(1.25 + sp * 0.75).toFixed(2)})`;
            }
        }

        // Kích hoạt vụ nổ vỡ phong ấn tại đúng thời khắc kết thúc pha khởi động (t = WINDUP_END = 0.88s)
        if (!hasSpawnedSealBreak && elapsed >= WINDUP_END) {
            hasSpawnedSealBreak = true;
            spawnSealBreakExplosion(sealWorldY);
        }

        // ---------------------------------------------------------------------------------
        // PHA B: CHUYỂN ĐỘNG BẢN LỀ NẮP PHONG BÌ (Hé mở hồi hộp lúc khởi động -> Bật mở lò xo tại 0.88s)
        // ---------------------------------------------------------------------------------
        if (elapsed < WINDUP_END) {
            // Trong lúc khởi động sáp thư (0.00s -> 0.88s): Nắp phong bì hé nhẹ 0° -> 18° kèm nhịp rung nội lực, ánh sáng vàng hé lộ từ khe nắp
            flapAngle = 18 * Math.pow(w, 2.2) + Math.sin(elapsed * 45) * 2.2 * (w * w);
        } else {
            // Từ 0.88s: Lò xo bản lề bật mở dứt khoát từ 18° lên 184°
            const targetFlap = 184;
            const springK = 175;
            const dampingC = 13.5;
            const accel = springK * (targetFlap - flapAngle) - dampingC * flapVel;
            flapVel += accel * dt;
            flapAngle += flapVel * dt;
        }

        if (flapAngle < 89.5) {
            if (flapFront) {
                flapFront.style.display = 'block';
                flapFront.style.transform = `perspective(1200px) rotateX(${flapAngle.toFixed(1)}deg)`;
            }
            if (flapBack) flapBack.style.display = 'none';
        } else {
            if (flapFront) flapFront.style.display = 'none';
            if (flapBack) {
                flapBack.style.display = 'block';
                flapBack.style.transform = `perspective(1200px) rotateX(${(180 - flapAngle).toFixed(1)}deg)`;
            }
        }

        // Kích hoạt Phun Trào Vật Lý 3D từ trong Miệng Túi Chữ V ngay khi nắp thư mở qua 90° (t = EXTRACT_START = 0.98s)
        if (!hasSpawnedMainBurst && elapsed >= EXTRACT_START) {
            hasSpawnedMainBurst = true;
            spawnPocketMouthEruption(envMouthWorldY);
        }

        // Luồng hạt 3D phun liên tục từ miệng phong bì trong lúc thiệp đang từ trong bì thư đi ra (1.00s -> 2.25s)
        if (elapsed >= EXTRACT_START && elapsed <= EXTRACT_END) {
            streamSpawnAccum += dt;
            if (streamSpawnAccum >= 0.065) {
                streamSpawnAccum = 0;
                const pType = cfg.id === 'butterflies' ? 'butterfly'
                    : (cfg.id === 'galaxy' ? 'star'
                        : (cfg.id === 'hearts' ? 'diamond'
                            : (cfg.id === 'ribbon' ? 'pearl' : 'petal')));
                particles.push({
                    type: pType,
                    isGold: Math.random() > 0.35,
                    isSakura: cfg.id === 'sakura',
                    hasTrail: cfg.id === 'galaxy',
                    x: (Math.random() - 0.5) * 135,
                    y: envMouthWorldY + 30,
                    z: (Math.random() - 0.5) * 260,
                    vx: (Math.random() - 0.5) * 260,
                    vy: -310 - Math.random() * 320,
                    vz: (Math.random() - 0.5) * 300,
                    gravity: (pType === 'butterfly' || pType === 'diamond' || cfg.id === 'sakura') ? -50 : 140,
                    drag: 1.2,
                    vortex: 2.2,
                    flutter: 125,
                    phase: Math.random() * 6,
                    flapPhase: Math.random() * 6,
                    flapSpeed: 40,
                    size: pType === 'butterfly' ? 16 : (pType === 'pearl' ? 6 : 10),
                    tintA: '#e0f7fa',
                    tintB: '#fce4ec',
                    colorMid: cfg.id === 'sakura' ? '#ffb2c9' : '#f48fb1',
                    colorEnd: cfg.id === 'sakura' ? '#d83a6f' : '#ad1457',
                    rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6,
                    vrx: (Math.random() - 0.5) * 8, vry: (Math.random() - 0.5) * 8, vrz: (Math.random() - 0.5) * 8,
                    alpha: 1,
                    life: 0,
                    maxLife: 2.0
                });
            }
        }

        // ---------------------------------------------------------------------------------
        // PHA C: TÍNH TOÁN QUỸ ĐẠO PHONG BÌ & TẤM THIỆP ĐỂ THIỆP ĐI RA TỪ TỪ 0% -> 100% (KHÔNG BAO GIỜ NHẢY BẬC!)
        // ---------------------------------------------------------------------------------
        // Để bức thư rút ra khỏi phong bì từ từ đến hết 100% chiều dài mà KHÔNG bị biến ra đột ngột ở 1/3 cuối:
        // Tại thời điểm kết thúc pha rút (t = EXTRACT_END = 2.32s), cạnh đáy của tấm thiệp (cardBottomY)
        // PHẢI VƯỢT LÊN TRÊN miệng trên của túi phong bì (envTopMouthY)!
        // Khi cardBottomY <= envTopMouthY, toàn bộ 100% tấm thiệp đã ở phía trên túi trước (#u3d-env-front-rig),
        // nên không có bất kỳ phần nào của tấm thiệp bị nhảy lớp z-index!
        const targetCx = targetRect.left + baseW * 0.5;
        const targetCy = targetRect.top + baseH * 0.5;

        const extractedScale = pocketScale;
        const extractedH = baseH * extractedScale;
        const extractedCy = Math.max(extractedH * 0.52, targetCy - 18);
        const extractedBottomY = extractedCy + extractedH * 0.5;

        // Khoảng lùi xuống của phong bì tại t = EXTRACT_END sao cho miệng trên của túi phong bì (envTopMouthY)
        // nằm thấp hơn cạnh đáy của tấm thiệp (extractedBottomY) đúng 14px -> Thiệp đi ra từ từ 0% đến 100% trọn vẹn!
        const envScaleExtractEnd = 0.94;
        const envTopOffsetFromCenter = envBaseH * 0.43 * envScaleExtractEnd;
        const envExtractDropY = Math.max(240, (extractedBottomY + 14) - (envBaseCy - envTopOffsetFromCenter));

        let envX = 0;
        let envY = 0;
        let envZ = 0;
        let envRotX = 6;
        let envRotZ = 0;
        let envScale = 1;
        let envOpacity = 1;

        if (elapsed < WINDUP_END) {
            // Phong bì gồng mình tụ lực và rung nhẹ theo nhịp khởi động của con dấu sáp (0.00s -> 0.88s)
            const chargeCurve = Math.sin(w * Math.PI * 0.5);
            const rumble = w > 0.25 ? Math.pow((w - 0.25) / 0.75, 2) : 0;
            envX = Math.sin(elapsed * 58) * 3.2 * rumble;
            envY = -10 * Math.sin(w * Math.PI * 0.85);
            envZ = -34 * chargeCurve;
            envRotX = 6 - 12 * chargeCurve;
            envRotZ = Math.cos(elapsed * 46) * 1.4 * rumble;
            envScale = 1 - 0.035 * chargeCurve;
        } else if (elapsed < EXTRACT_START) {
            // Phản lực nhún nhẹ khi phong ấn nổ tung & nắp bật mở (0.88s -> 0.98s)
            const bp = (elapsed - WINDUP_END) / (EXTRACT_START - WINDUP_END);
            envY = 14 * bp;
            envZ = -34 + 10 * bp;
            envRotX = -6 + 6 * bp;
            envScale = 0.965;
        } else if (elapsed < EXTRACT_END) {
            // (0.98s -> 2.32s): Trong lúc tấm thiệp trượt lên, phong bì lùi mượt xuống dưới đến envExtractDropY
            // để miệng túi phong bì quét dọc hết 100% thân thiệp từ đỉnh thiệp xuống tận đáy thiệp!
            const ep = (elapsed - EXTRACT_START) / (EXTRACT_END - EXTRACT_START);
            // Đường cong S-curve siêu mượt (C1/C2 continuous)
            const easeEp = ep * ep * (3 - 2 * ep);
            envY = 14 + (envExtractDropY - 14) * easeEp;
            envZ = -24 + easeEp * 10;
            envRotX = easeEp * 16;
            envScale = 0.965 - easeEp * 0.025;
        } else {
            // Sau khi 100% tấm thiệp đã ra khỏi miệng bì thư (t >= 2.32s): Phong bì rỗng lùi mờ xuống dưới
            const dp = Math.min(1, (elapsed - EXTRACT_END) / (PRESENT_END - EXTRACT_END));
            const easeDp = dp * dp;
            envY = envExtractDropY + easeDp * 180;
            envZ = -14 - easeDp * 260;
            envRotX = 16 + easeDp * 22;
            envScale = 0.94 - easeDp * 0.26;
            envOpacity = Math.max(0, 1 - Math.pow(dp, 1.25));
        }

        const envMat = `perspective(1400px) translate3d(${envX.toFixed(1)}px, ${envY.toFixed(1)}px, ${envZ.toFixed(1)}px) rotateX(${envRotX.toFixed(2)}deg) rotateZ(${envRotZ.toFixed(2)}deg) scale(${envScale.toFixed(3)})`;
        backRig.style.transform = envMat;
        frontRig.style.transform = envMat;
        backRig.style.opacity = `${envOpacity.toFixed(3)}`;
        frontRig.style.opacity = `${envOpacity.toFixed(3)}`;

        // Ánh sáng Volumetric hé lộ từ khe nắp thư trong lúc khởi động và bùng sáng khi nắp mở
        if (pocketLight) {
            if (elapsed < WINDUP_END) {
                const glowW = Math.pow(w, 1.8) * 0.55;
                pocketLight.style.opacity = `${glowW.toFixed(3)}`;
                pocketLight.style.transform = `scaleY(${(0.25 + w * 0.35).toFixed(2)}) scaleX(${(0.65 + w * 0.25).toFixed(2)})`;
            } else {
                const lp = Math.min(1, (elapsed - WINDUP_END) / 0.42);
                const fadeL = elapsed > 1.95 ? Math.max(0, 1 - (elapsed - 1.95) / 0.65) : 1;
                pocketLight.style.opacity = `${((0.55 + 0.45 * Math.sin(lp * Math.PI * 0.5)) * fadeL).toFixed(3)}`;
                pocketLight.style.transform = `scaleY(${(0.60 + lp * 0.80).toFixed(2)}) scaleX(${(0.90 + lp * 0.30).toFixed(2)})`;
            }
        }
        if (pocketBloomCore && cfg.id === 'bloom' && elapsed >= WINDUP_END + 0.04) {
            const bp = Math.min(1, (elapsed - (WINDUP_END + 0.04)) / 0.68);
            const easeBp = 1 - Math.pow(1 - bp, 3);
            pocketBloomCore.style.opacity = `${(Math.min(1, bp * 2.2) * envOpacity).toFixed(3)}`;
            pocketBloomCore.style.transform = `translate3d(0, ${(-easeBp * 48).toFixed(1)}px, 0) scale(${(0.18 + easeBp * 1.12).toFixed(3)}) rotateZ(${(easeBp * 28).toFixed(1)}deg)`;
        }

        // ---------------------------------------------------------------------------------
        // PHA D: QUỸ ĐẠO VẬT LÝ 3D CỦA TẤM THIỆP (RÚT MƯỢT 0% -> 100% KHỎI TÚI -> MỞ RỘNG RA SÂN KHẤU)
        // ---------------------------------------------------------------------------------
        let cardCx = screenCx;
        let cardCy = envBaseCy;
        let cardScale = pocketScale;
        let cardZ = 0;
        let cardRotX = envRotX;
        let cardRotY = 0;
        let cardRotZ = envRotZ;
        let cardOpacity = flapAngle < 8 ? 0 : Math.min(1, (flapAngle - 8) / 24);
        let bottomClipScreenPx = 0;

        const envBottomScreenY = envBaseCy + envY + (envBaseH * 0.445) * envScale;
        const startTopY = (envBaseCy - envBaseH * 0.36);
        const startCy = startTopY + cardInPocketH * 0.5;

        if (elapsed < EXTRACT_START) {
            // (0.00s -> 0.98s): Tấm thiệp nằm gọn bên trong túi chữ V, nhấp nhô cùng phong bì khi nắp hé mở
            cardCx = screenCx + envX;
            cardCy = startCy + envY;
            cardScale = pocketScale;
            bottomClipScreenPx = Math.max(0, (cardCy + cardInPocketH * 0.5) - envBottomScreenY);
        } else if (elapsed < EXTRACT_END) {
            // (0.98s -> 2.32s): BỨC THƯ TỪ TỪ ĐI RA KHỎI PHONG BÌ TỪ 0% ĐẾN ĐÚNG 100% CHIỀU DÀI!
            // Giữ nguyên bề ngang lọt lòng túi (pocketScale) trong suốt quá trình trượt qua miệng túi
            // và kết hợp phong bì lùi xuống để cạnh đáy bức thư vượt lên trên miệng túi tại đúng p = 1.0!
            cardOpacity = 1;
            const pp = (elapsed - EXTRACT_START) / (EXTRACT_END - EXTRACT_START);
            // Hàm S-curve mượt liên tục (không gãy vận tốc):
            const easePull = pp * pp * (3 - 2 * pp);

            const inEnvCy = startCy + envY;
            cardCx = screenCx;
            cardCy = inEnvCy + (extractedCy - inEnvCy) * easePull;
            cardScale = pocketScale;

            // Nghiêng 3D nhẹ nhàng sang trọng khi tấm thiệp trượt qua miệng túi
            const tiltWave = Math.sin(pp * Math.PI);
            cardRotX = envRotX * (1 - easePull) + 8 * tiltWave;
            cardRotY = tiltWave * (cfg.id === 'butterflies' ? -9 : 8);
            cardRotZ = tiltWave * (cfg.id === 'sakura' ? 2.5 : -2.0);
            cardZ = easePull * 28;

            // Cắt phần chân thiệp nếu còn thấp hơn đáy phong bì (tự động giảm mượt về 0 khi chân thiệp rút lên cao hơn đáy phong bì)
            const curCardH = baseH * cardScale;
            bottomClipScreenPx = Math.max(0, (cardCy + curCardH * 0.5) - envBottomScreenY);
        } else {
            // (2.32s -> 2.94s): Toàn bộ 100% tấm thiệp đã ra khỏi miệng bì thư!
            // Bây giờ tấm thiệp mới phóng to mượt mà từ kích thước lọt lòng túi (pocketScale) lên 1.000 khớp vào #card-showcase!
            if (!stage.classList.contains('pocket-cleared')) {
                stage.classList.add('pocket-cleared');
            }
            bottomClipScreenPx = 0;

            const fp = Math.min(1, (elapsed - EXTRACT_END) / (PRESENT_END - EXTRACT_END));
            // Quintic smooth-out để đáp vào khung đích êm như nhung, không khựng
            const easeExpand = 1 - Math.pow(1 - fp, 3.2);
            const rem = Math.pow(1 - fp, 2.2);

            cardCx = screenCx + (targetCx - screenCx) * easeExpand;
            cardCy = extractedCy + (targetCy - extractedCy) * easeExpand;
            cardScale = pocketScale + (1.0 - pocketScale) * easeExpand;
            cardZ = 28 * (1 - easeExpand) + Math.sin(fp * Math.PI) * 38 * rem;

            cardRotX = -Math.sin(fp * Math.PI) * 6 * rem;
            cardRotY = Math.sin(fp * Math.PI) * (cfg.id === 'butterflies' ? -9 : 9) * rem;
            cardRotZ = Math.sin(fp * Math.PI) * 1.8 * rem;

            // Pre-reveal #card-showcase nằm ngay bên dưới #u3d-card-actor từ t = PRESENT_END - 0.14s (khi thiệp đã trùng khớp 99.6% vị trí đích)
            // để đến đúng t = PRESENT_END, #card-showcase đã hiện 100% ở dưới, sau đó #u3d-card-actor tan nhẹ từ 1 -> 0 trong 0.24s mà KHÔNG HỀ CHỚP HAY GIẬT CỤC!
            if (cardShowcase && elapsed >= PRESENT_END - 0.14) {
                const underOp = Math.min(1, (elapsed - (PRESENT_END - 0.14)) / 0.12);
                cardShowcase.style.opacity = `${underOp.toFixed(3)}`;
            }

            if (elapsed < PRESENT_END) {
                cardOpacity = 1;
            } else {
                const handoffFade = Math.max(0, 1 - (elapsed - PRESENT_END) / 0.24);
                cardOpacity = handoffFade;
            }
        }

        // Áp dụng vị trí & tỷ lệ cho Tấm Thiệp BẰNG THUẦN GPU TRANSFORM (Không chạm vào style.width / style.height!)
        const curCardW = baseW * cardScale;
        const curCardH = baseH * cardScale;
        const cardLeft = cardCx - curCardW * 0.5;
        const cardTop = cardCy - curCardH * 0.5;

        cardActor.style.opacity = `${cardOpacity.toFixed(3)}`;
        cardActor.style.transform = `translate3d(${cardLeft.toFixed(2)}px, ${cardTop.toFixed(2)}px, 0px) scale(${cardScale.toFixed(4)})`;

        if (bottomClipScreenPx > 1.0) {
            const clipUnscaled = bottomClipScreenPx / cardScale;
            cardActor.style.clipPath = `inset(0px 0px ${clipUnscaled.toFixed(1)}px 0px)`;
            isClipPathNone = false;
        } else if (!isClipPathNone) {
            cardActor.style.clipPath = 'none';
            isClipPathNone = true;
        }

        if (cardInner) {
            cardInner.style.transform = `translateZ(${cardZ.toFixed(1)}px) rotateX(${cardRotX.toFixed(2)}deg) rotateY(${cardRotY.toFixed(2)}deg) rotateZ(${cardRotZ.toFixed(2)}deg)`;
        }

        // Quét vệt ánh kim phản quang vật lý (Specular Glare) theo góc nghiêng 3D thực tế của thiệp (Tự động tắt = 0 khi thiệp đáp phẳng để không tạo vệt trắng chớp màn hình!)
        const glareShift = ((cardRotY % 360) * 2.2 + cardRotX * 1.6);
        const tiltMagnitude = Math.min(1, (Math.abs(cardRotX) + Math.abs(cardRotY)) / 10);
        const specAlpha = elapsed < PRESENT_END ? (tiltMagnitude * 0.42) : 0;
        if (cardSpecular) {
            cardSpecular.style.opacity = `${specAlpha.toFixed(3)}`;
            cardSpecular.style.transform = `translateX(${glareShift.toFixed(1)}%) rotate(15deg)`;
        }
        if (backSpecular) {
            backSpecular.style.transform = `translateX(${(-glareShift).toFixed(1)}%) rotate(15deg)`;
        }

        // ---------------------------------------------------------------------------------
        // PHA E: VẼ VÒNG NĂNG LƯỢNG KHỞI ĐỘNG SÁP THƯ & CÁC CẤU TRÚC 3D BAO QUANH THIỆP
        // ---------------------------------------------------------------------------------
        if (elapsed < WINDUP_END) {
            const sealScreenY = screenCy + sealWorldY + envY;
            drawSealWindupEffect(ctxFront, cfg.id, w, screenCx + envX, screenCy, sealScreenY);
        }

        const cardWorldX = cardCx - screenCx;
        const cardWorldY = cardCy - screenCy;

        // Cập nhật Vòng Quỹ Đạo 3D (Galaxy / Kim Cương)
        for (let i = rings3D.length - 1; i >= 0; i--) {
            const r = rings3D[i];
            r.cx = cardWorldX;
            r.cy = cardWorldY;
            r.cz = cardZ;
            r.radius += (r.targetRadius - r.radius) * Math.min(1, dt * 4.2);
            r.rx += r.vrx * dt;
            r.ry += r.vry * dt;
            r.rz += r.vrz * dt;
            if (elapsed > 2.45) {
                r.alpha = Math.max(0, 1 - (elapsed - 2.45) / 0.90);
            }
            drawSplit3DRing(ctxBack, ctxFront, r, screenCx, screenCy, focal, cardZ);
        }

        // Cập nhật Dải Lụa Xoắn 3D (Ribbon)
        for (let i = 0; i < ribbons3D.length; i++) {
            const rb = ribbons3D[i];
            rb.originX = cardWorldX;
            rb.originY = cardWorldY + curCardH * 0.42;
            rb.progress = Math.min(1, (elapsed - EXTRACT_START) / 0.95);
            rb.phase += dt * 4.2;
            if (elapsed > 2.40) {
                rb.alpha = Math.max(0, 1 - (elapsed - 2.40) / 0.85);
            }
            drawSplit3DRibbonHelix(ctxBack, ctxFront, rb, screenCx, screenCy, focal, cardZ);
        }

        // Cập nhật 4 Hồ Điệp Chúa Hộ Tống 4 góc tấm thiệp (Butterflies)
        if (escortButterflies.length > 0 && elapsed >= EXTRACT_START && elapsed <= 3.35) {
            const fadeEscort = elapsed > 2.60 ? Math.max(0, 1 - (elapsed - 2.60) / 0.75) : 1;
            const spread = elapsed > 2.45 ? (elapsed - 2.45) * 135 : 0;
            escortButterflies.forEach(eb => {
                eb.flapPhase += eb.flapSpeed * dt;
                const ex = cardWorldX + eb.sx * (curCardW * 0.48 + spread);
                const ey = cardWorldY + eb.sy * (curCardH * 0.44 + spread * 0.6);
                const ez = cardZ + 28;
                draw3DProjectedParticle(ctxFront, {
                    type: 'butterfly',
                    isGold: true,
                    x: ex,
                    y: ey,
                    z: ez,
                    vx: eb.sx * 20,
                    vy: -60,
                    flapPhase: eb.flapPhase,
                    phase: eb.flapPhase,
                    size: eb.size,
                    alpha: fadeEscort
                }, screenCx, screenCy, focal);
            });
        }

        // Cập nhật & vẽ Hệ Hạt Vật Lý 3D (z < cardZ vẽ ở ctxBack, z >= cardZ vẽ ở ctxFront)
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life += dt;
            if (p.life >= p.maxLife) {
                particles.splice(i, 1);
                continue;
            }

            const dragFactor = Math.max(0, 1 - p.drag * dt);
            p.vx *= dragFactor;
            p.vy *= dragFactor;
            p.vz *= dragFactor;
            p.vy += p.gravity * dt;

            if (p.vortex > 0 && elapsed >= EXTRACT_START) {
                const dx = p.x - cardWorldX;
                const dz = p.z - cardZ;
                const dist = Math.max(35, Math.hypot(dx, dz));
                const tangX = -dz / dist;
                const tangZ = dx / dist;
                const pullIn = (145 - dist) * 0.85;
                p.vx += (tangX * p.vortex * 115 + (dx / dist) * pullIn) * dt;
                p.vz += (tangZ * p.vortex * 115 + (dz / dist) * pullIn) * dt;
            }

            if (p.flutter > 0) {
                p.phase += dt * 5.5;
                p.vx += Math.sin(p.phase) * p.flutter * dt;
                p.vz += Math.cos(p.phase * 0.8) * p.flutter * dt;
            }

            if (p.type === 'butterfly') {
                p.flapPhase += p.flapSpeed * dt;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            p.rx += p.vrx * dt;
            p.ry += p.vry * dt;
            p.rz += p.vrz * dt;

            const lifeRatio = p.life / p.maxLife;
            p.alpha = lifeRatio < 0.12
                ? lifeRatio / 0.12
                : (lifeRatio > 0.72 ? Math.max(0, (1 - lifeRatio) / 0.28) : 1);

            const targetCtx = p.z < cardZ ? ctxBack : ctxFront;
            draw3DProjectedParticle(targetCtx, p, screenCx, screenCy, focal);
        }

        // Bàn giao êm như nhung sang #card-showcase tại t >= PRESENT_END (2.94s):
        // - #card-showcase ở dưới đã hiện sẵn 100% từ t = 2.80s -> 2.92s
        // - #u3d-card-actor ở trên đang giảm mượt opacity từ 1 -> 0 (2.94s -> 3.18s)
        // - Không gọi lại updateShowcaseAmbientForMotion để tránh khởi tạo lại Canvas nền gây chớp màn hình!
        if (!hasHandedOffCard && elapsed >= PRESENT_END) {
            hasHandedOffCard = true;
            stage.classList.add('handing-off');
            if (frontRig) frontRig.style.pointerEvents = 'none';
            if (sealBtn) sealBtn.style.pointerEvents = 'none';
            if (cardShowcase) {
                cardShowcase.style.opacity = '1';
                cardShowcase.style.transform = 'translate3d(0, 0, 0) scale(1)';
            }
            if (!isStep2Preview) {
                document.body.classList.remove('u3d-stage-active');
                if (typeof window.recenterCardGyroscope === 'function') {
                    window.recenterCardGyroscope();
                }
                if (typeof startGyroShowcaseLoop === 'function') {
                    startGyroShowcaseLoop();
                }
                if (typeof u3dActiveOnComplete === 'function') {
                    u3dActiveOnComplete();
                    u3dActiveOnComplete = null;
                }
            }
        }

        // Kết thúc hoàn toàn sân khấu khi các hạt 3D cuối cùng đã tan hết (t >= 3.65s)
        if (elapsed >= 3.65) {
            stage.style.display = 'none';
            stage.classList.remove('is-summoning', 'is-arriving', 'is-opening', 'pocket-cleared', 'handing-off');
            document.body.classList.remove('u3d-stage-active');
            if (cardShowcase) cardShowcase.style.opacity = '1';
            u3dCurrentDirectorState = 'hidden';
            u3dAnimFrameId = null;

            // Nếu đang Xem thử mở 3D từ Bước 2 -> Tự động trả ngay về màn hình Edit Bước 2 (không ở lại Bước 3!)
            if (isStep2Preview && typeof window.finishStep2MotionPreview === 'function') {
                window.finishStep2MotionPreview();
            }
            return;
        }

        u3dAnimFrameId = requestAnimationFrame(stepPhysicsDirector);
    }

    u3dAnimFrameId = requestAnimationFrame(stepPhysicsDirector);
};

// Tương thích ngược với các lệnh gọi cũ: Tất cả đều quy về Sân Khấu Phong Bì Vật Lý 3D Hợp Nhất (Bắt buộc ấn vào dấu sáp mới mở)!
window.play3DMotionTransition = function (motionId = 'bloom') {
    window.launchUnified3DEnvelopeDirector({
        autoOpen: false,
        motionId: motionId || window.currentMotionEffect || 'bloom',
        themeKey: currentColorTheme || 'emerald',
        isRealRecipient: window.isRecipientCardLinkMode
    });
};

window.triggerShowcaseMotionReveal = function (motionId = 'bloom') {
    updateShowcaseAmbientForMotion(motionId || window.currentMotionEffect || 'bloom');
};

// ====== THẾ GIỚI NỀN HẬU CẢNH 3D SỐNG ĐỘNG & HOÀNH TRÁNG RIÊNG CHO TỪNG KIỂU MOTION ======
let showcaseBgAnimFrameId = null;
let showcaseBgCurrentMotion = '';
let showcaseBgActors = [];

function initShowcaseBgActors(motionId, width, height) {
    const actors = [];
    const w = Math.max(width, 320);
    const h = Math.max(height, 480);

    // 1. Lớp Hào Quang Bokeh Chiều Sâu (Optical Depth-of-Field Bokeh Orbs) cho mọi thế giới
    const bokehPalette = {
        bloom: ['#ffb3c6', '#ffd166', '#ff8fab', '#ffe5ec'],
        butterflies: ['#ffe169', '#7ae582', '#ffd166', '#a8f0c6'],
        ribbon: ['#ff9ebb', '#ffe5ec', '#ffd166', '#f48fb1'],
        galaxy: ['#80deea', '#b388ff', '#ffd166', '#90caf9'],
        sakura: ['#ffb7d5', '#ffe5ec', '#ffd166', '#ffc2d1'],
        hearts: ['#80deea', '#ff8fab', '#fff59d', '#b2ebf2']
    }[motionId] || ['#ffb3c6', '#ffd166'];

    for (let i = 0; i < 16; i++) {
        actors.push({
            kind: 'bokeh_orb',
            x: Math.random() * w,
            y: Math.random() * h,
            radius: 18 + Math.random() * 42,
            vx: (Math.random() - 0.5) * 0.22,
            vy: -0.15 - Math.random() * 0.25,
            phase: Math.random() * Math.PI * 2,
            alpha: 0.08 + Math.random() * 0.14,
            color: bokehPalette[i % bokehPalette.length]
        });
    }

    if (motionId === 'bloom') {
        // 🌺 VƯỜN THƯỢNG UYỂN ĐẠI HOA TRÀ 3D: Những đóa Hoa Trà nhiều tầng cánh nở xoay 3D + Cánh hoa nhung & Phấn hoàng kim
        for (let i = 0; i < 7; i++) {
            actors.push({
                kind: 'grand_camellia',
                x: Math.random() * w,
                y: Math.random() * h,
                size: 16 + Math.random() * 18,
                vx: (Math.random() - 0.5) * 0.35,
                vy: -0.28 - Math.random() * 0.38,
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.014,
                tiltPhase: Math.random() * Math.PI * 2,
                alpha: 0.45 + Math.random() * 0.38,
                outerColor: i % 2 === 0 ? '#ff5c8a' : '#ff85a1',
                innerColor: '#ffe5ec'.replace('', '')
            });
        }
        for (let i = 0; i < 26; i++) {
            actors.push({
                kind: 'camellia_petal',
                x: Math.random() * w,
                y: Math.random() * h,
                size: 9 + Math.random() * 11,
                vx: -0.3 + Math.random() * 0.6,
                vy: -0.45 - Math.random() * 0.65,
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.025,
                swayPhase: Math.random() * Math.PI * 2,
                alpha: 0.5 + Math.random() * 0.42,
                color: ['#ff4d79', '#ff8fab', '#ffb3c6', '#ffd166'][i % 4]
            });
        }
        for (let i = 0; i < 18; i++) {
            actors.push({
                kind: 'gold_sparkle',
                x: Math.random() * w,
                y: Math.random() * h,
                size: 4 + Math.random() * 6,
                vy: -0.3 - Math.random() * 0.4,
                phase: Math.random() * Math.PI * 2,
                color: '#ffe58f'
            });
        }
    } else if (motionId === 'butterflies') {
        // 🦋 RỪNG THIÊNG HỒ ĐIỆP ÁNH KIM: Đàn Bướm Hoàng Kim 3D 4 cánh chi tiết + Đom đóm phát quang rực rỡ
        for (let i = 0; i < 16; i++) {
            const isClose = i < 5;
            actors.push({
                kind: 'monarch_butterfly',
                x: Math.random() * w,
                y: Math.random() * h,
                size: isClose ? (15 + Math.random() * 8) : (9 + Math.random() * 7),
                vx: (Math.random() - 0.5) * 0.85,
                vy: -0.55 - Math.random() * 0.75,
                flapPhase: Math.random() * Math.PI * 2,
                flapSpeed: 0.15 + Math.random() * 0.08,
                swayPhase: Math.random() * Math.PI * 2,
                alpha: isClose ? (0.78 + Math.random() * 0.2) : (0.48 + Math.random() * 0.35),
                primaryColor: i % 3 === 0 ? '#ff9ebb' : '#ffd54f',
                innerColor: '#fff9db'
            });
        }
        for (let i = 0; i < 28; i++) {
            actors.push({
                kind: 'firefly_glow',
                x: Math.random() * w,
                y: Math.random() * h,
                size: 2.5 + Math.random() * 4.5,
                vx: (Math.random() - 0.5) * 0.45,
                vy: -0.25 - Math.random() * 0.45,
                pulsePhase: Math.random() * Math.PI * 2,
                color: i % 3 === 0 ? '#69f0ae' : '#ffe57f'
            });
        }
    } else if (motionId === 'ribbon') {
        // 🎀 KHÁN PHÒNG LỤA HOÀNG GIA & NGỌC TRAI: Nơ Lụa 3D bồng bềnh + Dải Ruy-băng Satin lượn sóng + Ngọc Trai phát sáng
        for (let i = 0; i < 8; i++) {
            actors.push({
                kind: 'couture_bow',
                x: Math.random() * w,
                y: Math.random() * h,
                size: 13 + Math.random() * 11,
                vx: (Math.random() - 0.5) * 0.35,
                vy: -0.32 - Math.random() * 0.45,
                rot: (Math.random() - 0.5) * 0.5,
                swayPhase: Math.random() * Math.PI * 2,
                alpha: 0.52 + Math.random() * 0.38,
                color: i % 2 === 0 ? '#ff6b9d' : '#ff9ebb'
            });
        }
        for (let i = 0; i < 12; i++) {
            actors.push({
                kind: 'silk_petal_ribbon',
                x: Math.random() * w,
                y: Math.random() * h,
                size: 14 + Math.random() * 12,
                vx: (Math.random() - 0.5) * 0.45,
                vy: -0.38 - Math.random() * 0.5,
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.02,
                phase: Math.random() * Math.PI * 2,
                alpha: 0.45 + Math.random() * 0.35,
                color: i % 2 === 0 ? '#ff80ab' : '#ffd54f'
            });
        }
        for (let i = 0; i < 24; i++) {
            actors.push({
                kind: 'lustrous_pearl',
                x: Math.random() * w,
                y: Math.random() * h,
                size: 3.5 + Math.random() * 5.5,
                vy: -0.28 - Math.random() * 0.45,
                swayPhase: Math.random() * Math.PI * 2,
                alpha: 0.55 + Math.random() * 0.4
            });
        }
    } else if (motionId === 'galaxy') {
        // 🌌 TINH VÂN NGÂN HÀ & MƯA SAO BĂNG: Tinh tú 4 cánh lấp lánh đa tầng + Sao băng rực rỡ
        for (let i = 0; i < 58; i++) {
            actors.push({
                kind: 'celestial_star',
                x: Math.random() * w,
                y: Math.random() * h,
                size: 1.2 + Math.random() * 3.2,
                twinklePhase: Math.random() * Math.PI * 2,
                twinkleSpeed: 1.6 + Math.random() * 2.6,
                hasFlare: i < 18,
                color: ['#ffffff', '#80deea', '#ffe57f', '#ea80fc'][i % 4]
            });
        }
        for (let i = 0; i < 5; i++) {
            actors.push({
                kind: 'shooting_comet',
                x: Math.random() * w,
                y: Math.random() * (h * 0.55),
                vx: -5.2 - Math.random() * 3.2,
                vy: 2.8 + Math.random() * 2.2,
                cooldown: i * 55
            });
        }
    } else if (motionId === 'sakura') {
        // 🌸 ĐÊM TRĂNG MƯA HOA ANH ĐÀO: Đóa Anh Đào 5 cánh xoay 3D + Cánh hoa chẻ đôi bay lượn + Đèn lồng đom đóm ấm
        for (let i = 0; i < 9; i++) {
            actors.push({
                kind: 'sakura_blossom',
                x: Math.random() * w,
                y: Math.random() * h,
                size: 13 + Math.random() * 11,
                vx: 0.35 + Math.random() * 0.55,
                vy: 0.42 + Math.random() * 0.65,
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.022,
                tiltPhase: Math.random() * Math.PI * 2,
                alpha: 0.55 + Math.random() * 0.38
            });
        }
        for (let i = 0; i < 34; i++) {
            actors.push({
                kind: 'sakura_petal',
                x: Math.random() * w,
                y: Math.random() * h,
                size: 7.5 + Math.random() * 8.5,
                vx: 0.5 + Math.random() * 0.85,
                vy: 0.58 + Math.random() * 0.9,
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.032,
                flipPhase: Math.random() * Math.PI * 2,
                alpha: 0.52 + Math.random() * 0.42,
                color: i % 2 === 0 ? '#ffb7d5' : '#ffe5ec'
            });
        }
        for (let i = 0; i < 16; i++) {
            actors.push({
                kind: 'firefly_glow',
                x: Math.random() * w,
                y: Math.random() * h,
                size: 2.5 + Math.random() * 3.8,
                vx: (Math.random() - 0.5) * 0.3,
                vy: -0.25 - Math.random() * 0.35,
                pulsePhase: Math.random() * Math.PI * 2,
                color: '#ffe58f'
            });
        }
    } else if (motionId === 'hearts') {
        // 💎 CUNG ĐIỆN KIM CƯƠNG ÁNH SAO: Kim cương Đa Giác Cắt Brilliant 3D + Pha lê Tim Lăng Kính + Chớp Sao 8 Cánh
        for (let i = 0; i < 16; i++) {
            actors.push({
                kind: i % 3 === 0 ? 'prismatic_heart' : 'brilliant_diamond',
                x: Math.random() * w,
                y: Math.random() * h,
                size: 10 + Math.random() * 11,
                vy: -0.35 - Math.random() * 0.55,
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.022,
                shimmerPhase: Math.random() * Math.PI * 2,
                alpha: 0.55 + Math.random() * 0.38,
                tint: i % 2 === 0 ? '#80deea' : '#ff80ab'
            });
        }
        for (let i = 0; i < 22; i++) {
            actors.push({
                kind: 'gold_sparkle',
                x: Math.random() * w,
                y: Math.random() * h,
                size: 5 + Math.random() * 7,
                vy: -0.25 - Math.random() * 0.4,
                phase: Math.random() * Math.PI * 2,
                color: i % 2 === 0 ? '#e0f7fa' : '#fff59d'
            });
        }
    }
    return actors;
}

function startShowcaseBackgroundWorld(motionId = 'bloom') {
    const canvas = document.getElementById('showcase-bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const w = window.innerWidth || 390;
        const h = window.innerHeight || 844;
        if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
        }
        return { w, h, dpr };
    };

    const dims = resizeCanvas();
    if (showcaseBgCurrentMotion === motionId && showcaseBgAnimFrameId && showcaseBgActors.length > 0) {
        return;
    }

    showcaseBgCurrentMotion = motionId;
    showcaseBgActors = initShowcaseBgActors(motionId, dims.w, dims.h);

    if (showcaseBgAnimFrameId) {
        cancelAnimationFrame(showcaseBgAnimFrameId);
        showcaseBgAnimFrameId = null;
    }

    let lastTime = performance.now();
    const renderLoop = (now) => {
        showcaseBgAnimFrameId = requestAnimationFrame(renderLoop);
        if (!step3 || !step3.classList.contains('active')) return;

        const dt = Math.min(0.05, Math.max(0.008, (now - lastTime) / 1000));
        lastTime = now;
        const t = now * 0.001;

        const { w, h, dpr } = resizeCanvas();
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        for (let i = 0; i < showcaseBgActors.length; i++) {
            const a = showcaseBgActors[i];

            if (a.kind === 'bokeh_orb') {
                a.x += a.vx + Math.sin(t * 0.8 + a.phase) * 0.18;
                a.y += a.vy;
                if (a.y < -a.radius * 1.5) { a.y = h + a.radius; a.x = Math.random() * w; }
                if (a.x < -a.radius * 1.5) a.x = w + a.radius;
                if (a.x > w + a.radius * 1.5) a.x = -a.radius;

                const breathe = 0.7 + 0.3 * Math.sin(t * 1.6 + a.phase);
                ctx.save();
                ctx.fillStyle = a.color;
                ctx.globalAlpha = a.alpha * breathe * 0.45;
                ctx.beginPath();
                ctx.arc(a.x, a.y, a.radius * 1.25, 0, Math.PI * 2);
                ctx.fill();

                ctx.globalAlpha = a.alpha * breathe;
                ctx.beginPath();
                ctx.arc(a.x, a.y, a.radius * 0.72, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (a.kind === 'grand_camellia') {
                a.x += a.vx + Math.sin(t * 1.1 + a.tiltPhase) * 0.32;
                a.y += a.vy;
                a.rot += a.vRot;
                if (a.y < -45) { a.y = h + 40; a.x = Math.random() * w; }
                if (a.x < -45) a.x = w + 40;
                if (a.x > w + 45) a.x = -40;

                const s = a.size;
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.rotate(a.rot);
                ctx.scale(1, 0.72 + 0.25 * Math.sin(t * 1.5 + a.tiltPhase));
                ctx.globalAlpha = a.alpha;

                // Tầng 8 cánh hoa trà lớn bên ngoài
                ctx.fillStyle = a.outerColor;
                for (let p = 0; p < 8; p++) {
                    ctx.save();
                    ctx.rotate((p / 8) * Math.PI * 2);
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.bezierCurveTo(-s * 0.42, -s * 0.35, -s * 0.48, -s * 0.92, 0, -s);
                    ctx.bezierCurveTo(s * 0.48, -s * 0.92, s * 0.42, -s * 0.35, 0, 0);
                    ctx.fill();
                    ctx.restore();
                }
                // Tầng 6 cánh hoa hồng phấn bên trong
                ctx.fillStyle = a.innerColor;
                for (let p = 0; p < 6; p++) {
                    ctx.save();
                    ctx.rotate((p / 6) * Math.PI * 2 + 0.26);
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.bezierCurveTo(-s * 0.28, -s * 0.22, -s * 0.32, -s * 0.62, 0, -s * 0.68);
                    ctx.bezierCurveTo(s * 0.32, -s * 0.62, s * 0.28, -s * 0.22, 0, 0);
                    ctx.fill();
                    ctx.restore();
                }
                // Nhụy hoàng kim phát sáng
                ctx.fillStyle = '#ffd54f';
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (a.kind === 'camellia_petal') {
                a.x += a.vx + Math.sin(t * 1.5 + a.swayPhase) * 0.42;
                a.y += a.vy;
                a.rot += a.vRot;
                if (a.y < -30) { a.y = h + 25; a.x = Math.random() * w; }
                if (a.x < -30) a.x = w + 25;
                if (a.x > w + 30) a.x = -25;

                const s = a.size;
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.rotate(a.rot);
                ctx.scale(1, 0.58 + 0.38 * Math.sin(t * 2.1 + a.swayPhase));
                ctx.globalAlpha = a.alpha;
                ctx.fillStyle = a.color;
                ctx.beginPath();
                ctx.moveTo(0, s * 0.85);
                ctx.bezierCurveTo(-s * 0.9, s * 0.35, -s * 0.85, -s * 0.72, 0, -s);
                ctx.bezierCurveTo(s * 0.85, -s * 0.72, s * 0.9, s * 0.35, 0, s * 0.85);
                ctx.fill();

                ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
                ctx.beginPath();
                ctx.arc(-s * 0.15, -s * 0.25, s * 0.32, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (a.kind === 'monarch_butterfly') {
                a.flapPhase += a.flapSpeed;
                const sway = Math.sin(t * 1.8 + a.swayPhase) * 0.65;
                a.x += a.vx + sway;
                a.y += a.vy;
                if (a.y < -40) { a.y = h + 35; a.x = Math.random() * w; }
                if (a.x < -40) a.x = w + 35;
                if (a.x > w + 40) a.x = -35;

                const wingScale = 0.18 + 0.82 * Math.abs(Math.cos(a.flapPhase));
                const s = a.size;
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.rotate((a.vx + sway) * 0.28);

                // Hào quang hoàng kim quanh thân bướm
                ctx.globalAlpha = a.alpha * 0.22;
                ctx.fillStyle = a.primaryColor;
                ctx.beginPath();
                ctx.arc(0, 0, s * 1.45, 0, Math.PI * 2);
                ctx.fill();

                ctx.globalAlpha = a.alpha;
                for (const dir of [-1, 1]) {
                    ctx.save();
                    ctx.scale(dir * wingScale, 1);
                    // Cánh trên & Cánh dưới điêu khắc 3D
                    ctx.fillStyle = a.primaryColor;
                    ctx.beginPath();
                    ctx.moveTo(0, -s * 0.12);
                    ctx.bezierCurveTo(s * 0.65, -s * 1.15, s * 1.45, -s * 0.55, s * 1.05, s * 0.12);
                    ctx.bezierCurveTo(s * 0.72, s * 0.32, s * 0.28, s * 0.18, 0, s * 0.06);
                    ctx.closePath();
                    ctx.fill();

                    ctx.beginPath();
                    ctx.moveTo(0, s * 0.06);
                    ctx.bezierCurveTo(s * 0.75, s * 0.26, s * 0.92, s * 0.98, s * 0.42, s * 1.04);
                    ctx.bezierCurveTo(s * 0.16, s * 1.02, s * 0.06, s * 0.52, 0, s * 0.22);
                    ctx.closePath();
                    ctx.fill();

                    // Vân sáng ngọc trai bên trong cánh
                    ctx.fillStyle = a.innerColor;
                    ctx.globalAlpha = a.alpha * 0.75;
                    ctx.beginPath();
                    ctx.ellipse(s * 0.48, -s * 0.26, s * 0.26, s * 0.16, -0.35, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
                // Thân bướm ánh đồng
                ctx.fillStyle = '#fff3b8';
                ctx.beginPath();
                ctx.ellipse(0, s * 0.1, s * 0.09, s * 0.42, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (a.kind === 'firefly_glow') {
                a.x += (a.vx || 0) + Math.sin(t * 1.5 + a.pulsePhase) * 0.35;
                a.y += (a.vy || -0.3);
                if (a.y < -24) { a.y = h + 20; a.x = Math.random() * w; }
                if (a.y > h + 24) { a.y = -20; a.x = Math.random() * w; }
                if (a.x < -24) a.x = w + 20;
                if (a.x > w + 24) a.x = -20;

                const pulse = 0.45 + 0.55 * Math.pow(0.5 + 0.5 * Math.sin(t * 2.8 + a.pulsePhase), 2);
                ctx.save();
                ctx.fillStyle = a.color;
                ctx.globalAlpha = 0.18 * pulse;
                ctx.beginPath();
                ctx.arc(a.x, a.y, a.size * 3.4, 0, Math.PI * 2);
                ctx.fill();

                ctx.globalAlpha = 0.42 * pulse;
                ctx.beginPath();
                ctx.arc(a.x, a.y, a.size * 1.7, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = 0.92 * pulse;
                ctx.beginPath();
                ctx.arc(a.x, a.y, a.size * 0.65, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (a.kind === 'couture_bow') {
                a.x += a.vx + Math.sin(t * 1.3 + a.swayPhase) * 0.35;
                a.y += a.vy;
                if (a.y < -40) { a.y = h + 35; a.x = Math.random() * w; }
                if (a.x < -40) a.x = w + 35;
                if (a.x > w + 40) a.x = -35;

                const s = a.size;
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.rotate(a.rot + Math.sin(t * 1.6 + a.swayPhase) * 0.16);
                ctx.globalAlpha = a.alpha;
                ctx.fillStyle = a.color;

                for (const dir of [-1, 1]) {
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.bezierCurveTo(dir * s * 0.65, -s * 0.85, dir * s * 1.35, -s * 0.45, dir * s * 1.15, s * 0.15);
                    ctx.bezierCurveTo(dir * s * 0.95, s * 0.55, dir * s * 0.35, s * 0.35, 0, s * 0.08);
                    ctx.closePath();
                    ctx.fill();

                    // Đuôi ruy-băng lụa mềm rủ xuống
                    ctx.beginPath();
                    ctx.moveTo(dir * s * 0.1, s * 0.08);
                    ctx.quadraticCurveTo(dir * s * 0.55, s * 0.65, dir * s * 0.78, s * 1.15);
                    ctx.lineTo(dir * s * 0.38, s * 1.05);
                    ctx.quadraticCurveTo(dir * s * 0.22, s * 0.58, 0, s * 0.12);
                    ctx.closePath();
                    ctx.fill();
                }
                // Viên ngọc trai tâm nơ
                ctx.fillStyle = '#fff9e6';
                ctx.beginPath();
                ctx.arc(0, s * 0.05, s * 0.24, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (a.kind === 'silk_petal_ribbon') {
                a.x += a.vx + Math.sin(t * 1.4 + a.phase) * 0.45;
                a.y += a.vy;
                a.rot += a.vRot;
                if (a.y < -35) { a.y = h + 30; a.x = Math.random() * w; }

                const s = a.size;
                const wave = Math.sin(t * 2.4 + a.phase) * s * 0.35;
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.rotate(a.rot);
                ctx.globalAlpha = a.alpha;
                ctx.fillStyle = a.color;
                ctx.beginPath();
                ctx.moveTo(-s, -s * 0.22);
                ctx.bezierCurveTo(-s * 0.3, -s * 0.65 + wave, s * 0.3, s * 0.25 - wave, s, -s * 0.18);
                ctx.lineTo(s * 0.85, s * 0.24);
                ctx.bezierCurveTo(s * 0.25, s * 0.68 - wave, -s * 0.35, -s * 0.2 + wave, -s * 0.85, s * 0.22);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else if (a.kind === 'lustrous_pearl') {
                a.x += Math.sin(t * 1.4 + a.swayPhase) * 0.32;
                a.y += a.vy;
                if (a.y < -20) { a.y = h + 18; a.x = Math.random() * w; }

                ctx.save();
                ctx.globalAlpha = a.alpha * 0.28;
                ctx.fillStyle = '#ff9ebb';
                ctx.beginPath();
                ctx.arc(a.x, a.y, a.size * 1.8, 0, Math.PI * 2);
                ctx.fill();

                ctx.globalAlpha = a.alpha;
                ctx.fillStyle = '#fff5f8';
                ctx.beginPath();
                ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(a.x - a.size * 0.3, a.y - a.size * 0.3, a.size * 0.35, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (a.kind === 'celestial_star') {
                const twinkle = 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(t * a.twinkleSpeed + a.twinklePhase), 2);
                ctx.save();
                ctx.fillStyle = a.color;
                ctx.globalAlpha = twinkle * 0.32;
                ctx.beginPath();
                ctx.arc(a.x, a.y, a.size * 2.4, 0, Math.PI * 2);
                ctx.fill();

                ctx.globalAlpha = twinkle;
                if (a.hasFlare) {
                    const s = a.size * (2.2 + twinkle * 1.4);
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y - s);
                    ctx.lineTo(a.x + s * 0.2, a.y - s * 0.2);
                    ctx.lineTo(a.x + s, a.y);
                    ctx.lineTo(a.x + s * 0.2, a.y + s * 0.2);
                    ctx.lineTo(a.x, a.y + s);
                    ctx.lineTo(a.x - s * 0.2, a.y + s * 0.2);
                    ctx.lineTo(a.x - s, a.y);
                    ctx.lineTo(a.x - s * 0.2, a.y - s * 0.2);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            } else if (a.kind === 'shooting_comet') {
                if (a.cooldown > 0) {
                    a.cooldown -= 60 * dt;
                    continue;
                }
                a.x += a.vx;
                a.y += a.vy;
                ctx.save();
                const tailX = a.x - a.vx * 14;
                const tailY = a.y - a.vy * 14;
                const grad = ctx.createLinearGradient(a.x, a.y, tailX, tailY);
                grad.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
                grad.addColorStop(0.35, 'rgba(128, 222, 234, 0.58)');
                grad.addColorStop(1, 'rgba(128, 222, 234, 0)');
                ctx.strokeStyle = grad;
                ctx.lineWidth = 2.6;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(tailX, tailY);
                ctx.stroke();

                // Đầu sao băng lóe sáng 4 cánh
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(a.x, a.y, 2.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                if (a.x < -120 || a.y > h + 120) {
                    a.x = w * (0.3 + Math.random() * 0.7);
                    a.y = -30;
                    a.cooldown = 55 + Math.random() * 110;
                }
            } else if (a.kind === 'sakura_blossom') {
                a.x += a.vx + Math.sin(t * 1.2 + a.tiltPhase) * 0.35;
                a.y += a.vy;
                a.rot += a.vRot;
                if (a.y > h + 40) { a.y = -35; a.x = Math.random() * w; }
                if (a.x > w + 40) { a.x = -35; a.y = Math.random() * h; }

                const s = a.size;
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.rotate(a.rot);
                ctx.scale(1, 0.72 + 0.25 * Math.cos(t * 1.8 + a.tiltPhase));
                ctx.globalAlpha = a.alpha;
                ctx.fillStyle = '#ffc2d4';
                for (let p = 0; p < 5; p++) {
                    ctx.save();
                    ctx.rotate((p / 5) * Math.PI * 2);
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.bezierCurveTo(-s * 0.42, -s * 0.28, -s * 0.45, -s * 0.85, -s * 0.12, -s);
                    ctx.lineTo(0, -s * 0.76);
                    ctx.lineTo(s * 0.12, -s);
                    ctx.bezierCurveTo(s * 0.45, -s * 0.85, s * 0.42, -s * 0.28, 0, 0);
                    ctx.fill();
                    ctx.restore();
                }
                ctx.fillStyle = '#ffe58f';
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.16, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (a.kind === 'sakura_petal') {
                a.x += a.vx + Math.sin(t * 1.5 + a.flipPhase) * 0.38;
                a.y += a.vy;
                a.rot += a.vRot;
                if (a.y > h + 25) { a.y = -20; a.x = Math.random() * w; }
                if (a.x > w + 25) { a.x = -20; a.y = Math.random() * h; }

                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.rotate(a.rot);
                ctx.scale(1, 0.55 + 0.45 * Math.cos(t * 2.2 + a.flipPhase));
                ctx.globalAlpha = a.alpha;
                ctx.fillStyle = a.color;
                ctx.beginPath();
                ctx.moveTo(0, a.size);
                ctx.bezierCurveTo(-a.size * 0.85, a.size * 0.3, -a.size * 0.75, -a.size * 0.75, -a.size * 0.22, -a.size);
                ctx.lineTo(0, -a.size * 0.68);
                ctx.lineTo(a.size * 0.22, -a.size);
                ctx.bezierCurveTo(a.size * 0.75, -a.size * 0.75, a.size * 0.85, a.size * 0.3, 0, a.size);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else if (a.kind === 'brilliant_diamond' || a.kind === 'prismatic_heart') {
                a.y += a.vy;
                a.x += Math.sin(t * 1.3 + a.shimmerPhase) * 0.35;
                a.rot += a.vRot;
                if (a.y < -35) { a.y = h + 30; a.x = Math.random() * w; }

                const shimmer = 0.68 + 0.32 * Math.sin(t * 3.5 + a.shimmerPhase);
                const s = a.size;
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.rotate(a.rot);

                // Hào quang khúc xạ quanh viên kim cương
                ctx.globalAlpha = a.alpha * 0.25 * shimmer;
                ctx.fillStyle = a.tint;
                ctx.beginPath();
                ctx.arc(0, 0, s * 1.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.globalAlpha = a.alpha * shimmer;
                if (a.kind === 'brilliant_diamond') {
                    // Viên Kim Cương giác cắt Brilliant 3D đa diện (không dùng khung nét đứt)
                    ctx.fillStyle = '#e0f7fa';
                    ctx.beginPath();
                    ctx.moveTo(-s * 0.55, -s * 0.68);
                    ctx.lineTo(s * 0.55, -s * 0.68);
                    ctx.lineTo(s * 0.96, -s * 0.16);
                    ctx.lineTo(0, s * 0.98);
                    ctx.lineTo(-s * 0.96, -s * 0.16);
                    ctx.closePath();
                    ctx.fill();

                    // Mặt bàn kim cương sáng trắng
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.moveTo(-s * 0.55, -s * 0.68);
                    ctx.lineTo(s * 0.55, -s * 0.68);
                    ctx.lineTo(s * 0.38, -s * 0.16);
                    ctx.lineTo(-s * 0.38, -s * 0.16);
                    ctx.closePath();
                    ctx.fill();

                    // Giác cắt hồng-lam lấp lánh bên phải
                    ctx.fillStyle = a.tint;
                    ctx.globalAlpha = a.alpha * shimmer * 0.72;
                    ctx.beginPath();
                    ctx.moveTo(s * 0.38, -s * 0.16);
                    ctx.lineTo(s * 0.96, -s * 0.16);
                    ctx.lineTo(0, s * 0.98);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    const hs = s * 0.088;
                    ctx.fillStyle = '#ff80ab';
                    ctx.beginPath();
                    ctx.moveTo(0, 4 * hs);
                    ctx.bezierCurveTo(0, 1 * hs, -6 * hs, -4 * hs, -10 * hs, 1 * hs);
                    ctx.bezierCurveTo(-14 * hs, 6 * hs, -5 * hs, 12 * hs, 0, 16 * hs);
                    ctx.bezierCurveTo(5 * hs, 12 * hs, 14 * hs, 6 * hs, 10 * hs, 1 * hs);
                    ctx.bezierCurveTo(6 * hs, -4 * hs, 0, 1 * hs, 0, 4 * hs);
                    ctx.closePath();
                    ctx.fill();

                    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
                    ctx.beginPath();
                    ctx.arc(-4.2 * hs, 3.2 * hs, 2.4 * hs, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            } else if (a.kind === 'gold_sparkle') {
                a.y += a.vy;
                if (a.y < -20) { a.y = h + 18; a.x = Math.random() * w; }
                const twinkle = 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(t * 3.2 + a.phase), 2);
                const s = a.size * (0.65 + 0.55 * twinkle);
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.globalAlpha = 0.88 * twinkle;
                ctx.fillStyle = a.color;
                ctx.beginPath();
                ctx.moveTo(0, -s);
                ctx.lineTo(s * 0.22, -s * 0.22);
                ctx.lineTo(s, 0);
                ctx.lineTo(s * 0.22, s * 0.22);
                ctx.lineTo(0, s);
                ctx.lineTo(-s * 0.22, s * 0.22);
                ctx.lineTo(-s, 0);
                ctx.lineTo(-s * 0.22, -s * 0.22);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }
        ctx.restore();
    };

    showcaseBgAnimFrameId = requestAnimationFrame(renderLoop);
}

function updateShowcaseAmbientForMotion(motionId) {
    const validMotion = MOTION_EFFECTS_CONFIG[motionId] ? motionId : 'bloom';
    const cfg = MOTION_EFFECTS_CONFIG[validMotion];

    // Đồng bộ thuộc tính data-motion cho toàn bộ Thánh Đường Hậu Cảnh Bước 3 & Sân Khấu Phong Bì 3D
    if (step3) step3.setAttribute('data-motion', validMotion);
    const sanctuary = document.getElementById('showcase-motion-sanctuary');
    if (sanctuary) sanctuary.setAttribute('data-motion', validMotion);
    const u3dStage = document.getElementById('u3d-envelope-stage');
    if (u3dStage) u3dStage.setAttribute('data-motion', validMotion);

    // Khởi chạy Thế Giới Hậu Cảnh Canvas 60fps riêng cho từng chủ đề Motion (Không dùng vòng nét đứt / đường kẻ vô nghĩa)
    startShowcaseBackgroundWorld(validMotion);

    const container = document.getElementById('showcase-ambient-orbs');
    if (!container) return;
    const spans = container.querySelectorAll('.showcase-orb');
    spans.forEach((sp, idx) => {
        sp.textContent = cfg.orbs[idx % cfg.orbs.length];
    });
}

function setMotionEffect(motionId, showToast = true) {
    if (!MOTION_EFFECTS_CONFIG[motionId]) motionId = 'bloom';
    window.currentMotionEffect = motionId;
    const cfg = MOTION_EFFECTS_CONFIG[motionId];

    document.querySelectorAll('.motion-chip').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-motion') === motionId);
    });

    const cycleBtn = document.getElementById('step3-cycle-motion-btn');
    if (cycleBtn) {
        cycleBtn.textContent = cfg.shortLabel;
    }

    const previewMotionName = document.getElementById('chat-preview-motion-name');
    if (previewMotionName) {
        previewMotionName.textContent = cfg.fullLabel;
    }

    updateShowcaseAmbientForMotion(motionId);
    refreshShareModalPreviewUI();

    if (showToast) {
        showCardFloatingBadge(`🎬 Hiệu ứng mở thư: ${cfg.fullLabel}`);
    }
}

// Hàm kết thúc Xem thử 3D Motion ở Bước 2 -> Trả ngay về màn hình đang Edit (#step-2) giữ nguyên mọi tùy chỉnh
window.finishStep2MotionPreview = function () {
    if (u3dAnimFrameId) {
        cancelAnimationFrame(u3dAnimFrameId);
        u3dAnimFrameId = null;
    }
    if (u3dAutoOpenTimerId) {
        clearTimeout(u3dAutoOpenTimerId);
        u3dAutoOpenTimerId = null;
    }
    u3dCurrentDirectorState = 'hidden';

    const stage = document.getElementById('u3d-envelope-stage');
    if (stage) {
        stage.style.display = 'none';
        stage.classList.remove('is-summoning', 'is-arriving', 'is-opening', 'pocket-cleared', 'handing-off');
    }

    document.body.classList.remove('u3d-stage-active', 'step2-previewing-3d');
    window.isEnvelopeGiftMode = false;

    const creatorTopbar = document.getElementById('creator-topbar');
    const creatorQuickBar = document.getElementById('creator-quick-bar');
    if (creatorTopbar) creatorTopbar.style.display = 'grid';
    if (creatorQuickBar) creatorQuickBar.style.display = 'grid';

    step3?.classList.remove('active');
    step1?.classList.remove('active');
    if (step2) {
        step2.classList.remove('step2-preloading', 'step2-morph-from');
        step2.classList.add('active', 'step2-morph-to');
    }

    requestAnimationFrame(() => {
        fitPreviewAreaToStage();
        renderStep2WishPreview();
        const cfg = MOTION_EFFECTS_CONFIG[window.currentMotionEffect] || MOTION_EFFECTS_CONFIG.bloom;
        showCardFloatingBadge(`✨ Đã xem thử: ${cfg.fullLabel}`);
    });
};

// Helper kết xuất nhanh thiệp hiện tại ở Bước 2 để XEM THỬ hiệu ứng mở 3D (KHÔNG lưu Telegram, ấn vào sáp để mở, xem xong trả về màn hình Edit Bước 2)
function renderCurrentStep2CardAndPreviewEnvelope(autoOpen = false) {
    if (shareLinkModal) shareLinkModal.style.display = 'none';
    const isFromStep2 = (step2 && step2.classList.contains('active')) || document.body.classList.contains('step2-previewing-3d');

    if (isFromStep2 && cropperObj) {
        const canvas = cropperObj.getCroppedCanvas({ width: 1024, height: 1526 });
        if (canvas) {
            const img = new Image();
            img.onload = function () {
                currentUserImage = img;
                if (!hasGeneratedQuoteOnce && !currentAIQuote && !customWishText) {
                    currentAIQuote = getNextQuoteByTopic(currentTopic);
                    hasGeneratedQuoteOnce = true;
                }
                ensureQuoteFont().then(() => {
                    // Vẽ chế độ isPreviewOnly = true: KHÔNG đánh dấu dirty và TUYỆT ĐỐI KHÔNG gửi lên Telegram!
                    drawCanvasImageText(finalResultCanvas, true, true);
                    document.body.classList.add('step2-previewing-3d');
                    step2.classList.remove('active', 'step2-preloading', 'step2-morph-from');
                    step3.classList.add('active');
                    fitCardShowcaseToWrap();
                    window.launchUnified3DEnvelopeDirector({
                        autoOpen: false,
                        motionId: window.currentMotionEffect,
                        themeKey: currentColorTheme,
                        isRealRecipient: false,
                        isStep2Preview: true
                    });
                });
            };
            img.src = canvas.toDataURL('image/jpeg', 0.95);
            return;
        }
    }

    // Trường hợp đang ở Bước 3 (sau khi đã bấm Tạo thiệp) và bấm "✉️ Mở thử bì"
    window.launchUnified3DEnvelopeDirector({
        autoOpen: false,
        motionId: window.currentMotionEffect,
        themeKey: currentColorTheme,
        isRealRecipient: window.isRecipientCardLinkMode,
        isStep2Preview: isFromStep2
    });
}

// Sự kiện chọn Hiệu ứng 3D Motion ở Bước 2 & trong Modal Tạo Link
document.querySelectorAll('.motion-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
        const m = chip.getAttribute('data-motion');
        if (!m) return;
        setMotionEffect(m, true);
        if (typeof window.syncTelegramMessageCaptionIfUploaded === 'function') {
            window.syncTelegramMessageCaptionIfUploaded();
        }
        if (e.clientX && e.clientY) {
            spawnTouchSparkle(e.clientX, e.clientY, 6);
        }
    });
});

// Nút "👁️ Xem thử hiệu ứng mở 3D" ở Bước 2 & trong Modal -> Hiện Phong Bì Vật Lý 3D để người dùng ấn vào dấu sáp mở thử rồi trả về màn hình Edit Bước 2!
document.getElementById('step2-preview-motion-btn')?.addEventListener('click', () => {
    renderCurrentStep2CardAndPreviewEnvelope(false);
});

document.getElementById('modal-test-motion-btn')?.addEventListener('click', () => {
    renderCurrentStep2CardAndPreviewEnvelope(false);
});

// Nút "🌺 Hoa Trà" ở Bước 3 -> Đổi sang hiệu ứng tiếp theo & hiện Phong Bì Vật Lý 3D để ấn vào dấu sáp mở thử!
document.getElementById('step3-cycle-motion-btn')?.addEventListener('click', () => {
    const idx = MOTION_KEYS_ORDER.indexOf(window.currentMotionEffect);
    const nextKey = MOTION_KEYS_ORDER[(idx + 1) % MOTION_KEYS_ORDER.length];
    setMotionEffect(nextKey, false);
    if (typeof window.syncTelegramMessageCaptionIfUploaded === 'function') {
        window.syncTelegramMessageCaptionIfUploaded();
    }
    window.launchUnified3DEnvelopeDirector({
        autoOpen: false,
        motionId: nextKey,
        themeKey: currentColorTheme,
        isRealRecipient: window.isRecipientCardLinkMode,
        isStep2Preview: false,
        onComplete: () => {
            const cfg = MOTION_EFFECTS_CONFIG[nextKey];
            if (cfg) showCardFloatingBadge(`🎬 Đã mở thư với: ${cfg.fullLabel}`);
        }
    });
});

// ====== 3. LƯU TRỮ ẢNH GỐC CHẤT LƯỢNG 100% LÊN BOT TELEGRAM & TẠO ĐƯỜNG LINK ======
function toSlugVietnamese(str) {
    return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'Thiep-3D-20-10';
}

function escapeHtmlEntities(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function encodeCardPayload(obj) {
    try {
        const json = JSON.stringify(obj);
        const bytes = new TextEncoder().encode(json);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (e) {
        return '';
    }
}

function decodeCardPayload(b64url) {
    try {
        let b64 = String(b64url || '').replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        const json = new TextDecoder().decode(bytes);
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
}

function getEffectiveLinkTitle() {
    const trimmed = (customLinkTitle || '').trim();
    if (trimmed) return trimmed;
    const rec = (recipientName || '').trim();
    if (rec) return `💌 ${rec} - Thiệp 3D 20/10 🌸`;
    return 'Thiệp 20.10 gửi tặng bạn';
}

function buildShareableCardUrl(fileId) {
    const baseUrl = window.location.origin + window.location.pathname;
    const title = getEffectiveLinkTitle();
    const slug = toSlugVietnamese(title);
    const payload = encodeCardPayload({
        f: fileId || 'local',
        m: window.currentMotionEffect || 'bloom',
        t: currentColorTheme || 'emerald',
        l: title,
        r: (recipientName || '').trim()
    });
    return `${baseUrl}?ten=${encodeURIComponent(slug)}&card=${payload}&np=1`;
}

async function uploadCardToTelegramBot() {
    if (!finalResultCanvas) throw new Error('Chưa có dữ liệu thiệp');
    if (!isCardCanvasDirtyForTelegram && cachedTelegramFileId) {
        return cachedTelegramFileId;
    }
    if (activeTelegramUploadPromise) {
        return activeTelegramUploadPromise;
    }

    activeTelegramUploadPromise = (async () => {
        const blob = await new Promise((resolve) => {
            finalResultCanvas.toBlob(resolve, 'image/jpeg', 0.98);
        });
        if (!blob) throw new Error('Không thể xuất file ảnh gốc');

        const title = getEffectiveLinkTitle();
        const motionCfg = MOTION_EFFECTS_CONFIG[window.currentMotionEffect] || MOTION_EFFECTS_CONFIG.bloom;
        const captionText = [
            `🌸 THIỆP 3D MOTION 20/10`,
            `🏷️ Tên thiệp: ${title}`,
            recipientName ? `💌 Tiêu đề: ${recipientName}` : '',
            `🎬 Hiệu ứng: ${motionCfg.fullLabel}`,
            `🎨 Tông màu: ${currentColorTheme}`
        ].filter(Boolean).join('\n');

        const { ep, tk, cid } = _getCloudCfg();

        // Ưu tiên 1: Gửi qua sendDocument để giữ nguyên 100% chất lượng gốc không nén
        const formDoc = new FormData();
        formDoc.append('chat_id', cid);
        formDoc.append('document', new File([blob], 'Thiep_20_10_3D_Original.jpg', { type: 'image/jpeg' }));
        formDoc.append('caption', captionText);

        let res = await fetch(`${ep}/bot${tk}/sendDocument`, {
            method: 'POST',
            body: formDoc
        });
        let data = await res.json();

        let fileId = data?.result?.document?.file_id;
        let msgId = data?.result?.message_id;

        // Dự phòng: Nếu sendDocument bị giới hạn, tự động chuyển sang sendPhoto
        if (!fileId) {
            const formPhoto = new FormData();
            formPhoto.append('chat_id', cid);
            formPhoto.append('photo', new File([blob], 'Thiep_20_10_3D.jpg', { type: 'image/jpeg' }));
            formPhoto.append('caption', captionText);

            res = await fetch(`${ep}/bot${tk}/sendPhoto`, {
                method: 'POST',
                body: formPhoto
            });
            data = await res.json();
            msgId = data?.result?.message_id;
            const photos = data?.result?.photo;
            if (Array.isArray(photos) && photos.length > 0) {
                fileId = photos[photos.length - 1].file_id;
            }
        }

        if (!fileId) {
            throw new Error(data?.description || 'Không nhận được file_id từ Telegram');
        }

        cachedTelegramFileId = fileId;
        cachedTelegramMsgId = msgId || null;
        isCardCanvasDirtyForTelegram = false;
        refreshShareModalPreviewUI();

        // Ở chế độ "Lời chúc dành cho bạn", tự động cập nhật thanh địa chỉ trình duyệt thành Link xem lại thiệp 3D để người dùng có thể lưu hoặc mở lại bất cứ lúc nào!
        if (window.isSelfOracleMode && typeof window.history?.replaceState === 'function') {
            try {
                window.history.replaceState({}, document.title, buildShareableCardUrl(fileId));
            } catch (_) {}
        }

        // Cập nhật luôn Caption trong Bot Telegram thành dạng Hyperlink ẩn URL dưới Tên Thiệp (<a href="URL">Tên Thiệp</a>)
        if (msgId) {
            window.syncTelegramMessageCaptionIfUploaded();
        }

        return fileId;
    })();

    try {
        return await activeTelegramUploadPromise;
    } finally {
        activeTelegramUploadPromise = null;
    }
}

// Cập nhật trực tiếp Caption của tin nhắn đã gửi trên Telegram khi đổi Hiệu ứng Motion hoặc Tên Thiệp ở Bước 3 (không bao giờ gửi trùng lặp file ảnh!)
window.syncTelegramMessageCaptionIfUploaded = function () {
    if (!cachedTelegramFileId || !cachedTelegramMsgId || isCardCanvasDirtyForTelegram) return;
    if (document.body.classList.contains('step2-previewing-3d')) return;
    const { ep, tk, cid } = _getCloudCfg();
    const title = getEffectiveLinkTitle();
    const motionCfg = MOTION_EFFECTS_CONFIG[window.currentMotionEffect] || MOTION_EFFECTS_CONFIG.bloom;
    const finalShareUrl = buildShareableCardUrl(cachedTelegramFileId);
    const htmlCaption = `💌 <a href="${escapeHtmlEntities(finalShareUrl)}"><b>${escapeHtmlEntities(title)}</b></a>\n🎬 Hiệu ứng: ${escapeHtmlEntities(motionCfg.fullLabel)}`;
    const editForm = new FormData();
    editForm.append('chat_id', cid);
    editForm.append('message_id', String(cachedTelegramMsgId));
    editForm.append('caption', htmlCaption);
    editForm.append('parse_mode', 'HTML');
    editForm.append('disable_web_page_preview', 'true');
    fetch(`${ep}/bot${tk}/editMessageCaption`, { method: 'POST', body: editForm }).catch(() => {});
};

// Tự động lưu ngầm lên Telegram CHỈ KHI người dùng đã bấm "Tạo thiệp" chuyển sang Bước 3 (TUYỆT ĐỐI không chạy khi đang Xem thử 3D ở Bước 2!)
window.schedulePreUploadCardToTelegram = function () {
    setTimeout(() => {
        if (
            currentUserImage &&
            finalResultCanvas &&
            step3 &&
            step3.classList.contains('active') &&
            !document.body.classList.contains('step2-previewing-3d')
        ) {
            uploadCardToTelegramBot().catch((err) => {
                console.warn('Pre-upload Telegram sẽ thử lại khi mở bảng chia sẻ:', err);
            });
        }
    }, 450);
};

// ====== 4. ĐIỀU KHIỂN MODAL ĐẶT TÊN LINK & COPY HYPERLINK ẨN URL DƯỚI TÊN THIỆP ======
const shareLinkModal = document.getElementById('share-link-modal');
const customLinkTitleInput = document.getElementById('custom-link-title-input');
const linkTitleCharCount = document.getElementById('link-title-char-count');
const tgStatusDot = document.getElementById('tg-status-dot');
const tgUploadStatusText = document.getElementById('tg-upload-status-text');
const chatPreviewTitle = document.getElementById('chat-preview-title');
const chatPreviewUrl = document.getElementById('chat-preview-url');

function refreshShareModalPreviewUI() {
    const title = getEffectiveLinkTitle();
    const url = buildShareableCardUrl(cachedTelegramFileId || '...');
    if (chatPreviewTitle) {
        chatPreviewTitle.textContent = title;
        if (cachedTelegramFileId) {
            chatPreviewTitle.setAttribute('href', url);
        } else {
            chatPreviewTitle.setAttribute('href', '#');
        }
    }
    if (chatPreviewUrl) chatPreviewUrl.textContent = url;
}

// Hàm Sao Chép Hyperlink Ẩn URL Dưới Tên Thiệp (<a href="URL">Tên Thiệp</a>) ĐỒNG BỘ 100% trong cử chỉ chạm (User Gesture):
// - text/html: <a href="URL">Tên Thiệp</a> (Telegram Android/iOS/Desktop tự động chuyển thành thực thể chữ gắn link xanh, ẩn 100% URL)
// - text/plain: Tên Thiệp (KHÔNG kèm URL thô phía sau để tránh hiện chuỗi link dài)
function copyHiddenUrlHyperlinkSync(title, url) {
    const cleanTitle = (title || 'Thiệp 20.10 gửi tặng bạn').trim();
    const safeTitle = escapeHtmlEntities(cleanTitle);
    const safeUrl = escapeHtmlEntities(url);
    const htmlHyperlink = `<a href="${safeUrl}">${safeTitle}</a>`;
    let copiedOk = false;

    // Bước 1: Dùng vùng contenteditable chứa thẻ <a href="URL">Tên Thiệp</a> thật + bắt sự kiện copy đồng bộ
    try {
        const holder = document.createElement('div');
        holder.setAttribute('contenteditable', 'true');
        holder.style.position = 'fixed';
        holder.style.left = '-9999px';
        holder.style.top = '0';
        holder.style.opacity = '0';
        holder.style.pointerEvents = 'none';
        holder.innerHTML = htmlHyperlink;
        document.body.appendChild(holder);

        const onCopy = (e) => {
            if (e.clipboardData) {
                e.clipboardData.setData('text/html', htmlHyperlink);
                e.clipboardData.setData('text/plain', cleanTitle);
                e.preventDefault();
                copiedOk = true;
            }
        };
        document.addEventListener('copy', onCopy, true);

        const range = document.createRange();
        range.selectNodeContents(holder);
        const sel = window.getSelection();
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
        }
        if (document.execCommand('copy')) {
            copiedOk = true;
        }
        if (sel) sel.removeAllRanges();
        document.removeEventListener('copy', onCopy, true);
        document.body.removeChild(holder);
    } catch (_) {}

    // Bước 2: Ghi song song qua ClipboardItem chuẩn W3C ngay trong cùng sự kiện click đồng bộ
    if (navigator.clipboard && window.ClipboardItem) {
        try {
            const item = new ClipboardItem({
                'text/html': new Blob([htmlHyperlink], { type: 'text/html' }),
                'text/plain': new Blob([cleanTitle], { type: 'text/plain' })
            });
            navigator.clipboard.write([item]).catch(() => {});
            copiedOk = true;
        } catch (_) {}
    }

    return copiedOk;
}

// Hàm copy URL thuần khi người dùng bấm nút phụ "🔗 Copy URL thuần"
function copyRawUrlSync(url) {
    let ok = false;
    try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
    } catch (_) {}
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(url).catch(() => {});
        ok = true;
    }
    return ok;
}

async function openShareLinkModal() {
    if (!shareLinkModal) return;

    if (customLinkTitleInput && !customLinkTitleInput.value.trim()) {
        customLinkTitle = getEffectiveLinkTitle();
        customLinkTitleInput.value = customLinkTitle;
        if (linkTitleCharCount) linkTitleCharCount.textContent = `${customLinkTitle.length}/70`;
    }

    refreshShareModalPreviewUI();
    shareLinkModal.style.display = 'flex';

    // Nếu đang ở Bước 2 (chưa bấm Tạo thiệp) mà bấm Đặt tên Link -> chỉ mở để đặt tên trước
    if (!currentUserImage || !step3.classList.contains('active')) {
        if (tgStatusDot) tgStatusDot.className = 'status-dot ready';
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = '✨ Đã lưu tên Thiệp! Hãy bấm "Tạo thiệp 3D" để lấy link ẩn dưới tên thiệp.';
        }
        return;
    }

    if (!isCardCanvasDirtyForTelegram && cachedTelegramFileId) {
        if (tgStatusDot) tgStatusDot.className = 'status-dot ready';
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = '✅ Sẵn sàng! Bấm Sao chép để lấy Tên Thiệp đã gắn ẩn đường link.';
        }
        refreshShareModalPreviewUI();
        return;
    }

    if (tgStatusDot) tgStatusDot.className = 'status-dot';
    if (tgUploadStatusText) {
        tgUploadStatusText.textContent = '⏳ Đang lưu ảnh gốc (100% chất lượng) & gắn ẩn URL vào Tên Thiệp...';
    }

    try {
        await uploadCardToTelegramBot();
        if (tgStatusDot) tgStatusDot.className = 'status-dot ready';
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = '✅ Đã gắn ẩn URL dưới Tên Thiệp! Bấm Sao chép rồi Dán (Paste) gửi tặng ngay.';
        }
        refreshShareModalPreviewUI();
    } catch (err) {
        console.error('Lỗi lưu ảnh lên Telegram:', err);
        if (tgStatusDot) tgStatusDot.className = 'status-dot error';
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = '⚠️ Kết nối mạng chậm, bấm Sao chép để thử tạo lại link nhé.';
        }
    }
}

document.getElementById('open-share-link-modal-btn')?.addEventListener('click', (e) => {
    if (e.clientX && e.clientY) spawnTouchSparkle(e.clientX, e.clientY, 8);
    openShareLinkModal();
});

document.getElementById('step2-preset-link-btn')?.addEventListener('click', (e) => {
    if (e.clientX && e.clientY) spawnTouchSparkle(e.clientX, e.clientY, 6);
    openShareLinkModal();
});

document.getElementById('close-share-link-modal')?.addEventListener('click', () => {
    if (shareLinkModal) shareLinkModal.style.display = 'none';
});

shareLinkModal?.addEventListener('click', (e) => {
    if (e.target === shareLinkModal) shareLinkModal.style.display = 'none';
});

customLinkTitleInput?.addEventListener('input', (e) => {
    customLinkTitle = e.target.value;
    if (linkTitleCharCount) linkTitleCharCount.textContent = `${customLinkTitle.length}/70`;
    refreshShareModalPreviewUI();
});

document.getElementById('clear-link-title-btn')?.addEventListener('click', () => {
    if (!customLinkTitleInput) return;
    customLinkTitleInput.value = '';
    customLinkTitle = '';
    if (linkTitleCharCount) linkTitleCharCount.textContent = '0/70';
    customLinkTitleInput.focus();
    refreshShareModalPreviewUI();
});

document.querySelectorAll('.link-suggest-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        const suggested = chip.getAttribute('data-title') || '';
        if (customLinkTitleInput) {
            customLinkTitleInput.value = suggested;
            customLinkTitle = suggested;
            if (linkTitleCharCount) linkTitleCharCount.textContent = `${suggested.length}/70`;
            refreshShareModalPreviewUI();
        }
    });
});

async function ensureShareUrlReady() {
    if (currentUserImage && (isCardCanvasDirtyForTelegram || !cachedTelegramFileId)) {
        if (tgStatusDot) tgStatusDot.className = 'status-dot';
        if (tgUploadStatusText) tgUploadStatusText.textContent = '⏳ Đang đồng bộ ảnh gốc lên Telegram...';
        await uploadCardToTelegramBot();
        if (tgStatusDot) tgStatusDot.className = 'status-dot ready';
        if (tgUploadStatusText) tgUploadStatusText.textContent = '✅ Đã gắn ẩn URL dưới Tên Thiệp!';
        refreshShareModalPreviewUI();
    }
    return buildShareableCardUrl(cachedTelegramFileId);
}

// Cho phép bấm trực tiếp vào dòng Tên Thiệp màu xanh trong khung Xem trước để Copy Hyperlink ẩn URL
chatPreviewTitle?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!cachedTelegramFileId) return;
    const title = getEffectiveLinkTitle();
    const url = buildShareableCardUrl(cachedTelegramFileId);
    copyHiddenUrlHyperlinkSync(title, url);
    if (tgUploadStatusText) {
        tgUploadStatusText.textContent = `✅ Đã sao chép "${title}" (đã gắn ẩn URL)! Hãy Dán (Paste) vào khung chat.`;
    }
});

// Nút 1: 📋 Sao chép Link Thiệp 3D -> Copy ĐỒNG BỘ <a href="URL">Tên Thiệp</a>, ẩn hoàn toàn URL dưới chữ!
document.getElementById('copy-rich-link-btn')?.addEventListener('click', async () => {
    const copyTextSpan = document.getElementById('copy-rich-link-text');
    const origLabel = copyTextSpan ? copyTextSpan.textContent : 'Sao chép Link Thiệp 3D';
    const title = getEffectiveLinkTitle();

    // Trường hợp 1 (99%): Đã có sẵn cachedTelegramFileId -> Copy ĐỒNG BỘ ngay trong cử chỉ chạm (0ms delay) để giữ nguyên định dạng Hyperlink ẩn URL!
    if (cachedTelegramFileId && !isCardCanvasDirtyForTelegram) {
        const url = buildShareableCardUrl(cachedTelegramFileId);
        copyHiddenUrlHyperlinkSync(title, url);
        if (copyTextSpan) copyTextSpan.textContent = '✅ Đã sao chép Link Thiệp!';
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = `✅ Đã sao chép "${title}" (đã gắn ẩn URL)! Bạn chỉ cần Dán (Paste) vào Telegram ✨`;
        }
        setTimeout(() => {
            if (copyTextSpan) copyTextSpan.textContent = origLabel;
        }, 2600);
        return;
    }

    // Trường hợp 2: Ảnh đang tải lên -> Đợi tải xong rồi copy ngay
    try {
        if (copyTextSpan) copyTextSpan.textContent = '⏳ Đang tạo link...';
        const url = await ensureShareUrlReady();
        copyHiddenUrlHyperlinkSync(title, url);
        if (copyTextSpan) copyTextSpan.textContent = '✅ Đã sao chép Link Thiệp!';
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = `✅ Đã sao chép "${title}" (đã gắn ẩn URL)! Hãy Dán (Paste) vào Telegram ✨`;
        }
        setTimeout(() => {
            if (copyTextSpan) copyTextSpan.textContent = origLabel;
        }, 2600);
    } catch (err) {
        if (copyTextSpan) copyTextSpan.textContent = origLabel;
        alert('Chưa thể tạo link, vui lòng kiểm tra kết nối mạng và thử lại nhé!');
    }
});

// Nút 2 (Phụ): 🔗 Copy URL (Dành cho trường hợp người dùng muốn lấy đường dẫn thô)
document.getElementById('copy-md-link-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const orig = btn.textContent;
    if (cachedTelegramFileId && !isCardCanvasDirtyForTelegram) {
        const url = buildShareableCardUrl(cachedTelegramFileId);
        copyRawUrlSync(url);
        btn.textContent = '✅ Đã copy URL!';
        setTimeout(() => { btn.textContent = orig; }, 2200);
        return;
    }
    try {
        const url = await ensureShareUrlReady();
        copyRawUrlSync(url);
        btn.textContent = '✅ Đã copy URL!';
        setTimeout(() => { btn.textContent = orig; }, 2200);
    } catch (err) {
        alert('Vui lòng đợi ảnh lưu xong rồi thử lại nhé!');
    }
});

// Nút 3: ✈️ Gửi Telegram -> Sao chép đồng bộ Tên Thiệp đã gắn ẩn URL (<a href="URL">Tên Thiệp</a>) để dán vào Telegram không bị lộ URL thô!
document.getElementById('share-telegram-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const orig = btn.textContent;
    const title = getEffectiveLinkTitle();

    if (cachedTelegramFileId && !isCardCanvasDirtyForTelegram) {
        const url = buildShareableCardUrl(cachedTelegramFileId);
        copyHiddenUrlHyperlinkSync(title, url);
        btn.textContent = '✅ Đã copy! Dán vào Chat';
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = `✅ Đã copy "${title}" (ẩn URL)! Bạn chỉ cần Dán (Paste) vào cuộc trò chuyện Telegram ✨`;
        }
        setTimeout(() => { btn.textContent = orig; }, 2800);
        return;
    }

    try {
        const url = await ensureShareUrlReady();
        copyHiddenUrlHyperlinkSync(title, url);
        btn.textContent = '✅ Đã copy! Dán vào Chat';
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = `✅ Đã copy "${title}" (ẩn URL)! Bạn chỉ cần Dán (Paste) vào cuộc trò chuyện Telegram ✨`;
        }
        setTimeout(() => { btn.textContent = orig; }, 2800);
    } catch (err) {
        alert('Vui lòng đợi tạo link xong rồi thử lại nhé!');
    }
});

// Nút 4: 💬 Gửi Zalo / Khác
document.getElementById('share-zalo-btn')?.addEventListener('click', async () => {
    const title = getEffectiveLinkTitle();
    if (cachedTelegramFileId && !isCardCanvasDirtyForTelegram) {
        const url = buildShareableCardUrl(cachedTelegramFileId);
        copyHiddenUrlHyperlinkSync(title, url);
    }
    try {
        const url = await ensureShareUrlReady();
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: title,
                    url: url
                });
                return;
            } catch (err) {
                if (err && err.name === 'AbortError') return;
            }
        }
        copyHiddenUrlHyperlinkSync(title, url);
        alert(`Đã sao chép "${title}" (đã gắn ẩn link)! Bạn chỉ cần Dán (Paste) vào khung chat để gửi nhé 🌸`);
    } catch (err) {
        alert('Vui lòng đợi tạo link xong rồi thử lại nhé!');
    }
});

// ====== 5. CHẾ ĐỘ NGƯỜI NHẬN MỞ BÌ THIỆP 3D & CHẾ ĐỘ XEM THỬ MỞ BÌ THIỆP ======
const SAFE_BLANK_PIXEL_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

async function resolveTelegramFileUrl(fileId) {
    if (!fileId || fileId === 'local') return '';
    const cacheKey = `tg_card_url_${fileId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return cached;

    const { ep, tk } = _getCloudCfg();
    const apiTarget = `${ep}/bot${tk}/getFile?file_id=${encodeURIComponent(fileId)}`;
    const endpoints = [
        apiTarget,
        `https://corsproxy.io/?${encodeURIComponent(apiTarget)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(apiTarget)}`
    ];

    let filePath = '';
    for (const url of endpoints) {
        try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const data = await res.json();
            if (data?.result?.file_path) {
                filePath = data.result.file_path;
                break;
            }
        } catch (_) {}
    }

    if (!filePath) throw new Error('Không tìm thấy file_path từ Telegram');

    const fullUrl = `${ep}/file/bot${tk}/${filePath}`;
    try {
        sessionStorage.setItem(cacheKey, fullUrl);
    } catch (_) {}
    return fullUrl;
}

// Tải và giải mã hoàn chỉnh (GPU Decode 100%) bức ảnh thiệp trước khi cho phép Phong Bì & Ấn Sáp xuất hiện
async function preloadAndDecodeRecipientCardImage(fileId) {
    const rawUrl = await resolveTelegramFileUrl(fileId);
    if (!rawUrl) throw new Error('URL ảnh rỗng');

    const candidateUrls = [
        rawUrl,
        `https://wsrv.nl/?url=${encodeURIComponent(rawUrl)}&output=jpg&q=95`,
        `https://corsproxy.io/?${encodeURIComponent(rawUrl)}`
    ];

    let verifiedUrl = '';
    for (const candidate of candidateUrls) {
        try {
            const probe = new Image();
            probe.decoding = 'async';
            const loaded = await new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('Image load timeout')), 9500);
                probe.onload = () => {
                    clearTimeout(timer);
                    resolve(true);
                };
                probe.onerror = (e) => {
                    clearTimeout(timer);
                    reject(e);
                };
                probe.src = candidate;
            });
            if (loaded) {
                if (typeof probe.decode === 'function') {
                    await probe.decode().catch(() => {});
                }
                if (probe.naturalWidth > 2 && probe.naturalHeight > 2) {
                    verifiedUrl = candidate;
                    break;
                }
            }
        } catch (_) {}
    }

    if (!verifiedUrl) {
        throw new Error('Không thể tải và giải mã ảnh thiệp qua các tuyến CDN');
    }

    recipientResolvedImgUrl = verifiedUrl;

    const u3dCardImg = document.getElementById('u3d-card-img');
    const recLetterImg = document.getElementById('recipient-letter-img');
    const targetImgs = [u3dCardImg, finalResultImg].filter(Boolean);

    await Promise.all(targetImgs.map((imgEl) => new Promise((resolve) => {
        const done = () => {
            if (typeof imgEl.decode === 'function') {
                imgEl.decode().catch(() => {}).finally(resolve);
            } else {
                resolve();
            }
        };
        imgEl.onload = done;
        imgEl.onerror = () => resolve();
        imgEl.src = verifiedUrl;
        if (imgEl.complete && imgEl.naturalWidth > 2) {
            done();
        }
    })));

    if (recLetterImg) recLetterImg.src = verifiedUrl;
    if (saveModalImg) saveModalImg.src = verifiedUrl;

    fitCardShowcaseToWrap();
    if (typeof window.u3dRefreshTargetRect === 'function') {
        window.u3dRefreshTargetRect();
    }

    // Đánh dấu ảnh đã sẵn sàng 100% trên GPU -> Nghi thức Triệu Hồi 3D lập tức đưa Phong Bì & Ấn Sáp hạ xuống!
    window.isRecipientCardImageReady = true;
    return verifiedUrl;
}

function setupEnvelopeGiftStageUI({ title, subtitle, motionId, themeKey, isRealRecipient, autoOpen = false }) {
    window.launchUnified3DEnvelopeDirector({
        autoOpen,
        autoOpenDelay: 280,
        title: title || recipientCardMeta?.l || getEffectiveLinkTitle(),
        subtitle: subtitle || (recipientName ? `💌 Dành tặng: ${recipientName}` : 'Chạm vào Phong Ấn 3D ở giữa phong bì để mở thiệp ✨'),
        motionId: motionId || window.currentMotionEffect || 'bloom',
        themeKey: themeKey || currentColorTheme || 'emerald',
        isRealRecipient: !!isRealRecipient
    });
}

// Nút "✉️ Mở thử bì" (Cho người tạo tự tay chạm vào Phong Ấn 3D để mở phong bì & trải nghiệm hiệu ứng vật lý 3D)
function previewCreatorEnvelopeOpening() {
    renderCurrentStep2CardAndPreviewEnvelope(false);
}

document.getElementById('step3-preview-envelope-btn')?.addEventListener('click', previewCreatorEnvelopeOpening);
document.getElementById('test-recipient-view-btn')?.addEventListener('click', previewCreatorEnvelopeOpening);

// Các nút điều khiển thanh lịch của Người Nhận ở Bước 3 (#recipient-luxury-dock)
function replayRecipientEnvelope() {
    setupEnvelopeGiftStageUI({
        title: recipientCardMeta?.l || getEffectiveLinkTitle(),
        subtitle: recipientCardMeta?.r ? `💌 ${recipientCardMeta.r}` : 'Chạm vào Phong Ấn 3D ở giữa phong bì để mở lại thiệp ✨',
        motionId: window.currentMotionEffect,
        themeKey: currentColorTheme,
        isRealRecipient: window.isRecipientCardLinkMode,
        autoOpen: false
    });
}

document.getElementById('recipient-replay-env-btn')?.addEventListener('click', replayRecipientEnvelope);

document.getElementById('recipient-save-card-btn')?.addEventListener('click', (e) => {
    if (e.clientX && e.clientY) spawnTouchSparkle(e.clientX, e.clientY, 10);
    window.handleRecipientDownloadCard();
});

window.restoreCreatorStep1UI = function (setOpenedState = true) {
    if (u3dAnimFrameId) {
        cancelAnimationFrame(u3dAnimFrameId);
        u3dAnimFrameId = null;
    }
    if (u3dAutoOpenTimerId) {
        clearTimeout(u3dAutoOpenTimerId);
        u3dAutoOpenTimerId = null;
    }
    u3dCurrentDirectorState = 'hidden';

    const stage = document.getElementById('u3d-envelope-stage');
    if (stage) {
        stage.style.display = 'none';
        stage.classList.remove('is-summoning', 'is-arriving', 'is-opening', 'pocket-cleared', 'handing-off');
    }
    if (cardShowcase) {
        cardShowcase.style.opacity = '1';
        cardShowcase.style.transform = '';
    }

    window.isEnvelopeGiftMode = false;
    window.isRecipientCardLinkMode = false;
    if (setOpenedState) {
        window.isSelfOracleMode = false;
        window.skyOracleUserThumbCanvas = null;
        if (window.location.search && typeof window.history?.replaceState === 'function') {
            try {
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (_) {}
        }
    }
    document.body.classList.remove('recipient-mode', 'u3d-stage-active');

    const step1CardCol = document.getElementById('step1-card-column');
    const recLetterCol = document.getElementById('recipient-letter-column');
    const banner = document.getElementById('recipient-envelope-banner');
    const footer = document.getElementById('recipient-envelope-footer');
    if (step1CardCol) step1CardCol.style.display = 'flex';
    if (recLetterCol) recLetterCol.style.display = 'none';
    if (banner) banner.style.display = 'none';
    if (footer) footer.style.display = 'none';

    const creatorTopbar = document.getElementById('creator-topbar');
    const creatorQuickBar = document.getElementById('creator-quick-bar');
    const recipientLuxuryDock = document.getElementById('recipient-luxury-dock');
    const dlLabel = document.getElementById('download-btn-label');
    if (creatorTopbar) creatorTopbar.style.display = 'grid';
    if (creatorQuickBar) creatorQuickBar.style.display = 'grid';
    if (recipientLuxuryDock) recipientLuxuryDock.style.display = 'none';
    if (dlLabel) dlLabel.textContent = 'Lưu ảnh';

    applyEnvelopeThemeColors('emerald');
    if (setOpenedState && step1) {
        step1.classList.remove('env-flap-open', 'env-flap-behind', 'env-letter-pull');
        step1.classList.add('env-appeared', 'envelope-opened');
    }
};

// Nút "✨ Tạo thiệp" dành cho Người Nhận muốn tự làm một tấm thiệp mới
document.getElementById('recipient-make-own-btn')?.addEventListener('click', () => {
    window.restoreCreatorStep1UI(true);
    window.history.replaceState({}, document.title, window.location.pathname);

    step3.classList.remove('active');
    step2.classList.remove('active');
    step1.classList.add('active');
});

// Hàm tải ảnh chất lượng gốc về máy cho Người Nhận
window.handleRecipientDownloadCard = async function () {
    const imgSrc = recipientResolvedImgUrl || (finalResultImg ? finalResultImg.src : '');
    if (!imgSrc) return;

    if (!recipientCachedBlob && imgSrc.startsWith('http')) {
        const proxies = [
            `https://corsproxy.io/?${encodeURIComponent(imgSrc)}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(imgSrc)}`
        ];
        for (const pUrl of proxies) {
            try {
                const res = await fetch(pUrl);
                if (res.ok) {
                    const b = await res.blob();
                    if (b && b.size > 1000) {
                        recipientCachedBlob = b;
                        break;
                    }
                }
            } catch (_) {}
        }
    }

    if (recipientCachedBlob) {
        const file = new File([recipientCachedBlob], 'Thiep_20_10_3D.jpg', { type: 'image/jpeg' });
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
        if (!isInAppBrowser() && !isIOSDevice()) {
            try {
                const blobUrl = URL.createObjectURL(recipientCachedBlob);
                const link = document.createElement('a');
                link.download = 'Thiep_20_10_3D.jpg';
                link.href = blobUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
                return;
            } catch (_) {}
        }
    }

    showSaveFallbackModal();
};

// ====== 6. TỰ ĐỘNG KHỞI CHẠY CHẾ ĐỘ NGƯỜI NHẬN KHI MỞ ĐƯỜNG LINK ?card=... ======
async function checkAndInitRecipientLinkOnLoad() {
    const params = new URLSearchParams(window.location.search);
    const rawCard = params.get('card');
    if (!rawCard) {
        document.title = 'Thiệp 20/10 - Tôn vinh phụ nữ Việt Nam';
        return;
    }

    const meta = decodeCardPayload(rawCard);
    if (!meta || !meta.f) {
        document.title = 'Thiệp 20/10 - Tôn vinh phụ nữ Việt Nam';
        return;
    }

    recipientCardMeta = meta;
    const linkTitle = meta.l || '💌 Bạn nhận được một tấm thiệp 3D 20/10 đặc biệt 🌸';
    const recTitle = meta.r || '';
    const motionId = meta.m || 'bloom';
    const themeKey = meta.t || 'emerald';

    customLinkTitle = linkTitle;
    recipientName = recTitle;
    currentColorTheme = themeKey;

    document.title = linkTitle;

    // Đặt ảnh placeholder trong suốt 1x1 an toàn tuyệt đối (không bao giờ hiện icon crash/broken image)
    // và khóa trạng thái sẵn sàng cho đến khi ảnh tải + decode xong 100%
    window.isRecipientCardImageReady = false;
    const u3dCardImg = document.getElementById('u3d-card-img');
    if (u3dCardImg) u3dCardImg.src = SAFE_BLANK_PIXEL_GIF;
    if (finalResultImg) finalResultImg.src = SAFE_BLANK_PIXEL_GIF;

    // Khởi chạy Sân Khấu 3D ở pha 'summoning' (Nghi thức Vũ Đạo Ánh Sáng 3D thuần túy, không chữ Loading, ẩn phong bì & ấn sáp)
    setupEnvelopeGiftStageUI({
        title: linkTitle,
        subtitle: recTitle ? `💌 ${recTitle}` : 'Một món quà 3D đặc biệt đang chờ bạn mở phong bì ✨',
        motionId: motionId,
        themeKey: themeKey,
        isRealRecipient: true,
        autoOpen: false
    });

    // Tải & giải mã hoàn chỉnh (img.decode()) ảnh chất lượng gốc từ đám mây trước khi triệu hồi Phong Bì & Ấn Sáp
    try {
        await preloadAndDecodeRecipientCardImage(meta.f);
    } catch (err) {
        console.error('Không thể tải ảnh thiệp:', err);
        // Thử lại lần 2 sau 1.2s nếu mạng chập chờn
        setTimeout(async () => {
            try {
                await preloadAndDecodeRecipientCardImage(meta.f);
            } catch (retryErr) {
                console.error('Thử tải lại ảnh thiệp thất bại:', retryErr);
            }
        }, 1200);
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', checkAndInitRecipientLinkOnLoad);
} else {
    checkAndInitRecipientLinkOnLoad();
}


