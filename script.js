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
}
window.addEventListener('resize', initCanvasSizes, { passive: true });
initCanvasSizes();

// Lớp 1: Đốm sáng Bokeh mềm mại (dùng radial gradient tạo sẵn, không dùng shadowBlur để tránh lag)
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
        // Vẽ cánh hoa anh đào có khía chữ V nhẹ ở đầu cánh
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
    const petalCount = mobile ? 24 : 36;
    const bokehCount = mobile ? 7 : 11;
    const starCount = mobile ? 10 : 16;

    bgParticles = [];
    bokehOrbs = [];
    sparkles = [];
    for (let i = 0; i < bokehCount; i++) bokehOrbs.push(new BokehOrb());
    for (let i = 0; i < petalCount; i++) bgParticles.push(new SakuraPetal());
    for (let i = 0; i < starCount; i++) sparkles.push(new TwinkleStar());
}
initBgParticles();

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
animateBg();

// ====== HIỆU ỨNG CHẠM TAY NỞ HOA & PHÁO HOA CHÚC MỪNG (FX CANVAS) ======
function spawnTouchSparkle(x, y, count = 2) {
    if (fxParticles.length > 55) return;
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
            size: Math.random() * 6 + 4,
            rotation: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.12,
            alpha: 1,
            decay: Math.random() * 0.022 + 0.02,
            color: palette[Math.floor(Math.random() * palette.length)],
            shape: Math.random() > 0.45 ? 'star' : 'heart'
        });
    }
    startFxLoop();
}

function triggerCelebrationBurst() {
    const palette = ['#ff6b9d', '#ffd166', '#ff9ebb', '#52b788', '#f48fb1', '#ffe57f'];
    const total = isMobileDevice() ? 34 : 48;
    for (let i = 0; i < total; i++) {
        const fromLeft = i % 2 === 0;
        const startX = fromLeft ? bgWidth * 0.08 : bgWidth * 0.92;
        const startY = bgHeight * 0.62 + (Math.random() - 0.5) * 80;
        const angle = fromLeft
            ? (-Math.PI * 0.38 + (Math.random() - 0.5) * 0.45)
            : (-Math.PI * 0.62 + (Math.random() - 0.5) * 0.45);
        const speed = Math.random() * 7 + 5.5;
        fxParticles.push({
            x: startX,
            y: startY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            gravity: 0.16,
            size: Math.random() * 7 + 5,
            rotation: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.18,
            alpha: 1,
            decay: Math.random() * 0.01 + 0.009,
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

// Lắng nghe chạm/vuốt màn hình tạo hiệu ứng hoa & sao (bỏ qua khi đang kéo ảnh Cropper để 100% mượt)
let lastSparkleTime = 0;
window.addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (now - lastSparkleTime < 36) return;
    if (e.target && e.target.closest('#preview-area-wrap')) return;
    lastSparkleTime = now;
    spawnTouchSparkle(e.clientX, e.clientY, 1);
}, { passive: true });

window.addEventListener('pointerdown', (e) => {
    if (e.target && e.target.closest('#preview-area-wrap')) return;
    spawnTouchSparkle(e.clientX, e.clientY, 4);
}, { passive: true });

// ====== CẤU HÌNH KHUNG ẢNH ======
const framesConfig = [];
for (let i = 1; i <= 10; i++) {
    framesConfig.push({
        id: i - 1,
        path: `khung/khung ${i}.png?v=3.0`,
        label: `Khung ${i}`
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
        // Xáo bài Fisher-Yates
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

// ====== 5 BẢNG MÀU NỮ TÍNH & 5 KIỂU VIỀN LÃNG MẠN ======
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
let lastNonCustomTopic = 'all';
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

// Tải trước các hình ảnh khung để render canvas mượt
function preloadFrames() {
    framesConfig.forEach(config => {
        const img = new Image();
        img.src = config.path;
        loadedFrameImages[config.id] = img;
    });
}
preloadFrames();

function renderFrameList() {
    frameList.innerHTML = '';
    framesConfig.forEach((f, i) => {
        const div = document.createElement('div');
        div.className = `frame-item ${i === 0 ? 'active' : ''}`;
        div.innerHTML = `
            <div style="width:100%; height:55px; background: url('${f.path}') center/contain no-repeat; margin-bottom:5px;"></div>
            <span style="font-size:0.75rem">${f.label}</span>
        `;
        div.onclick = () => {
            document.querySelectorAll('.frame-item').forEach(el => el.classList.remove('active'));
            div.classList.add('active');
            currentSelectedFrameId = i;
            updateFrameOverlay();
        };
        frameList.appendChild(div);
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

// Nút Lật gương & Xoay 90° cho ảnh Selfie
document.getElementById('flip-h-btn').addEventListener('click', () => {
    if (!cropperObj) return;
    currentScaleX = -currentScaleX;
    cropperObj.scaleX(currentScaleX);
});

document.getElementById('rotate-btn').addEventListener('click', () => {
    if (!cropperObj) return;
    cropperObj.rotate(90);
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
        setTimeout(() => {
            initCropper();
            initScrollHints();
        }, 100);
    };
    reader.readAsDataURL(file);
}

function initCropper() {
    const imageEl = document.getElementById('cropper-image');
    imageEl.src = originalImgSrc;

    const initialFrame = loadedFrameImages[currentSelectedFrameId];
    const initialRatio = (initialFrame && initialFrame.complete && initialFrame.naturalWidth)
        ? (initialFrame.naturalWidth / initialFrame.naturalHeight)
        : (1024 / 1536);

    if (cropperObj) cropperObj.destroy();
    cropperObj = new Cropper(imageEl, {
        aspectRatio: initialRatio,
        viewMode: 1,
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
            updateFrameOverlay();
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

function updateFrameOverlay() {
    if (!cropperObj) return;
    const cropBox = document.querySelector('.cropper-crop-box');
    const frameImg = loadedFrameImages[currentSelectedFrameId];

    if (frameImg && frameImg.complete && frameImg.naturalWidth) {
        cropperObj.setAspectRatio(frameImg.naturalWidth / frameImg.naturalHeight);
    }

    if (cropBox) {
        let overlay = document.getElementById('frame-overlay');
        if (!overlay) {
            overlay = document.createElement('img');
            overlay.id = 'frame-overlay';
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = '10';
            cropBox.appendChild(overlay);
        }
        overlay.src = framesConfig[currentSelectedFrameId].path;
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
    btn.innerHTML = "🌸 Đang tạo thiệp...";
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
        const targetH = (frameImg && frameImg.naturalHeight) ? frameImg.naturalHeight : 1536;

        const canvas = cropperObj.getCroppedCanvas({ width: targetW, height: targetH });
        const img = new Image();
        img.onload = function () {
            currentUserImage = img;
            // Chỉ random lời chúc ở lần tạo đầu tiên; nếu quay lại Bước 2 đổi khung thì giữ nguyên câu chúc!
            if (!hasGeneratedQuoteOnce || !currentAIQuote) {
                currentAIQuote = getNextQuoteByTopic(currentTopic === 'custom' ? 'all' : currentTopic);
                hasGeneratedQuoteOnce = true;
            }

            ensureQuoteFont().then(() => {
                drawCanvasImageText(finalResultCanvas, true);
            });

            setTimeout(() => {
                closeAllDrawers();
                step2.classList.remove('active');
                step3.classList.add('active');
                btn.innerHTML = originalHTML;
                btn.disabled = false;

                // Hiệu ứng Grand Reveal 3D & Pháo hoa chúc mừng
                if (cardShowcase) {
                    cardShowcase.classList.remove('reveal-playing');
                    void cardShowcase.offsetWidth;
                    cardShowcase.classList.add('reveal-playing');
                }
                setTimeout(() => triggerCelebrationBurst(), 280);
            }, 700);
        };
        img.src = canvas.toDataURL('image/jpeg', 0.95);
    }, 150);
});

// ====== THANH CÔNG CỤ TUỲ CHỈNH TẠI BƯỚC 3 ======
function triggerCardPulse() {
    if (!cardShowcase) return;
    cardShowcase.classList.remove('reveal-playing', 'pulse-playing');
    void cardShowcase.offsetWidth;
    cardShowcase.classList.add('pulse-playing');
}

function closeAllDrawers() {
    document.querySelectorAll('.custom-drawer').forEach(d => d.classList.remove('open'));
    document.querySelectorAll('.tool-pill[data-panel]').forEach(b => b.classList.remove('active'));
}

document.querySelectorAll('.tool-pill[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => {
        const panelId = btn.getAttribute('data-panel');
        const panel = document.getElementById(panelId);
        const isOpen = panel.classList.contains('open');
        closeAllDrawers();
        if (!isOpen) {
            panel.classList.add('open');
            btn.classList.add('active');
        }
    });
});

document.querySelectorAll('.drawer-close').forEach(btn => {
    btn.addEventListener('click', () => closeAllDrawers());
});

// 1. Nút "🎲 Đổi lời chúc" ngay tại Bước 3
document.getElementById('shuffle-quote-btn').addEventListener('click', () => {
    if (currentTopic === 'custom') {
        currentTopic = lastNonCustomTopic || 'all';
        document.querySelectorAll('.topic-chip').forEach(c => {
            c.classList.toggle('active', c.getAttribute('data-topic') === currentTopic);
        });
        document.getElementById('custom-wish-group').style.display = 'none';
    }
    currentAIQuote = getNextQuoteByTopic(currentTopic);
    drawCanvasImageText(finalResultCanvas, true);
    triggerCardPulse();

    // Bắn nhẹ vài hạt lấp lánh trên mặt thiệp
    if (cardShowcase) {
        const rect = cardShowcase.getBoundingClientRect();
        spawnTouchSparkle(rect.left + rect.width * 0.5, rect.top + rect.height * 0.78, 6);
    }
});

// 2. Nút "🎨 Đổi khung" (Quay về Bước 2 giữ nguyên ảnh & giữ nguyên lời chúc)
document.getElementById('back-step2-btn').addEventListener('click', () => {
    closeAllDrawers();
    step3.classList.remove('active');
    step2.classList.add('active');
});

// 3. Ô nhập Tên người nhận
const recipientInput = document.getElementById('recipient-input');
const recipientCount = document.getElementById('recipient-count');
let redrawTimer = null;

function scheduleRedraw() {
    clearTimeout(redrawTimer);
    redrawTimer = setTimeout(() => {
        drawCanvasImageText(finalResultCanvas, true);
    }, 60);
}

recipientInput.addEventListener('input', (e) => {
    recipientName = e.target.value;
    recipientCount.textContent = `${recipientName.length}/35`;
    scheduleRedraw();
});

// 4. Chọn Chủ đề lời chúc & Tự viết lời chúc
const customWishGroup = document.getElementById('custom-wish-group');
const customWishInput = document.getElementById('custom-wish-input');
const wishCharCount = document.getElementById('wish-char-count');

document.querySelectorAll('.topic-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.topic-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const topic = chip.getAttribute('data-topic');
        currentTopic = topic;

        if (topic === 'custom') {
            customWishGroup.style.display = 'block';
            if (!customWishInput.value.trim()) {
                customWishInput.value = currentAIQuote;
                customWishText = currentAIQuote;
                wishCharCount.textContent = `${customWishInput.value.length}/160`;
            }
            customWishInput.focus();
            scheduleRedraw();
        } else {
            lastNonCustomTopic = topic;
            customWishGroup.style.display = 'none';
            currentAIQuote = getNextQuoteByTopic(topic);
            drawCanvasImageText(finalResultCanvas, true);
            triggerCardPulse();
        }
    });
});

customWishInput.addEventListener('input', (e) => {
    customWishText = e.target.value;
    wishCharCount.textContent = `${customWishText.length}/160`;
    scheduleRedraw();
});

// 5. Chọn Kiểu viền lãng mạn & Tông màu nữ tính
document.querySelectorAll('.style-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.style-chip').forEach(c => c.classList.remove('active'));
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
        drawCanvasImageText(finalResultCanvas, true);
        triggerCardPulse();
    });
});

// 6. Nút "↩️ Tạo mới" (Làm lại từ Bước 1)
document.getElementById('redo-btn').addEventListener('click', () => {
    closeAllDrawers();
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

        // Ưu tiên 1: Trên thiết bị di động (iOS / Android), gọi Web Share API CHỈ VỚI FILE ẢNH (không truyền text/url)
        if (isMobileDevice() && navigator.canShare && navigator.share) {
            try {
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file] });
                    return;
                }
            } catch (err) {
                if (err && err.name === 'AbortError') return; // Người dùng tự đóng bảng share
            }
        }

        // Ưu tiên 2: Nếu đang trong trình duyệt nội bộ (Telegram/Zalo...) trên iOS hoặc Web Share bị chặn
        if (isInAppBrowser() || isIOSDevice()) {
            showSaveFallbackModal();
            return;
        }

        // Ưu tiên 3: Tải file trực tiếp qua Blob URL trên Desktop / Android Chrome
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
function formatRecipientLine(rawName) {
    const clean = (rawName || '').trim();
    if (!clean) return '';
    if (/^(thân\s+gửi|thân\s+tặng|gửi|tặng|kính\s+gửi|kính\s+tặng|chúc\s+mừng|chúc)/i.test(clean)) {
        return `🌸 ${clean} 🌸`;
    }
    return `🌸 Thân gửi ${clean} 🌸`;
}

function getActiveQuoteText() {
    if (currentTopic === 'custom') {
        const trimmed = (customWishText || '').trim();
        return trimmed || currentAIQuote || wishes2010[0];
    }
    return currentAIQuote || wishes2010[0];
}

function drawCanvasImageText(targetCanvas, isFinal) {
    if (!currentUserImage) return;

    const frameImg = loadedFrameImages[currentSelectedFrameId];
    if (!frameImg || !frameImg.complete) {
        setTimeout(() => drawCanvasImageText(targetCanvas, isFinal), 100);
        return;
    }

    const targetW = frameImg.naturalWidth || 1024;
    const originH = frameImg.naturalHeight || 1536;
    const scale = targetW / 1024;
    const textSpaceHeight = Math.floor(originH * 0.35);
    const targetH = isFinal ? originH + textSpaceHeight : originH;

    const theme = COLOR_THEMES[currentColorTheme] || COLOR_THEMES.emerald;
    const ctx = targetCanvas.getContext('2d');
    targetCanvas.width = targetW;
    targetCanvas.height = targetH;

    // 1. Vẽ nền vùng ảnh trên (#ffffff) và vùng mở rộng bên dưới chuyển sắc liền mạch từ #ffffff
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, originH);

    if (isFinal) {
        const bottomGrad = ctx.createLinearGradient(0, originH, 0, targetH);
        bottomGrad.addColorStop(0, theme.canvasBgStart);
        bottomGrad.addColorStop(0.32, theme.canvasBgMid);
        bottomGrad.addColorStop(1, theme.canvasBgEnd);
        ctx.fillStyle = bottomGrad;
        ctx.fillRect(0, originH, targetW, textSpaceHeight);

        // Điểm xuyết bokeh & cánh hoa chìm nhẹ ở nền ngoài hộp lời chúc
        drawBottomAmbientDecor(ctx, targetW, originH, textSpaceHeight, scale, theme);
    }

    // 2. Vẽ ảnh người dùng đã cắt kèm bộ lọc màu
    if (currentSelectedFilter !== 'none') {
        ctx.filter = currentSelectedFilter;
    }
    ctx.drawImage(currentUserImage, 0, 0, targetW, originH);
    ctx.filter = 'none';

    // 3. Vẽ khung ảnh PNG trong suốt đè lên
    ctx.drawImage(frameImg, 0, 0, targetW, originH);

    // 4. Vẽ hộp lời chúc nghệ thuật
    const activeQuote = getActiveQuoteText();
    if (isFinal && activeQuote) {
        const marginX = Math.floor(targetW * 0.058);
        const boxX = marginX;
        const boxY = originH + Math.floor(textSpaceHeight * 0.09);
        const boxW = targetW - marginX * 2;
        const boxH = Math.floor(textSpaceHeight * 0.81);
        const radius = Math.floor(targetW * 0.036);

        // Vẽ khung nền & viền theo kiểu đã chọn
        drawRomanticQuoteBox(ctx, boxX, boxY, boxW, boxH, radius, scale, theme, currentBorderStyle);

        // Tính toán kích thước & ngắt dòng chống tràn tuyệt đối (tính cả Tên người nhận + Lời chúc)
        const recipientLine = formatRecipientLine(recipientName);
        const layout = fitQuoteInBox(ctx, activeQuote, recipientLine, boxW, boxH, scale, currentBorderStyle);

        // Vẽ nội dung chữ
        drawQuoteContent(ctx, boxX, boxY, boxW, boxH, layout, theme, scale);
    }

    // Đồng bộ sang thẻ <img> để iOS / Android / Telegram có thể nhấn giữ lưu ảnh trực tiếp
    if (isFinal && finalResultImg) {
        try {
            const dataUrl = targetCanvas.toDataURL('image/jpeg', 0.95);
            finalResultImg.src = dataUrl;
            if (saveModalImg && saveGuideModal.style.display !== 'none') {
                saveModalImg.src = dataUrl;
            }
        } catch (e) {
            console.error(e);
        }
    }
}

// Trang trí nền bokeh & cánh hoa mờ xung quanh hộp chữ
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

// ====== 5 KIỂU VIỀN HỘP LỜI CHÚC NỮ TÍNH & LÃNG MẠN ======
function createBoxPath(ctx, x, y, w, h, r, style) {
    ctx.beginPath();
    if (style === 'vintage') {
        // Góc vát cong thư tình Pháp (Inverted Scallop Corners)
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

    // Đổ bóng dịu dưới hộp chữ
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

    // Tắt bóng để vẽ các nét viền sắc nét
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Viền chính
    const borderGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
    borderGrad.addColorStop(0, theme.borderPrimary);
    borderGrad.addColorStop(0.5, theme.borderSecondary);
    borderGrad.addColorStop(1, theme.borderPrimary);
    ctx.lineWidth = Math.max(2, 3.8 * scale);
    ctx.strokeStyle = borderGrad;
    ctx.stroke();

    // Viền mảnh bên trong tạo độ sâu thanh lịch
    const inset = Math.floor(10 * scale);
    createBoxPath(ctx, boxX + inset, boxY + inset, boxW - inset * 2, boxH - inset * 2, Math.max(6, radius - inset * 0.6), style);
    ctx.lineWidth = Math.max(1, 1.5 * scale);
    ctx.strokeStyle = theme.borderSecondary;
    if (style === 'daisy') {
        ctx.setLineDash([8 * scale, 6 * scale]);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Dấu ngoặc kép nghệ thuật chìm trong nền hộp
    ctx.save();
    ctx.font = `italic 700 ${Math.floor(110 * scale)}px "Playfair Display", serif`;
    ctx.fillStyle = theme.flowerSoft;
    ctx.globalAlpha = style === 'vintage' ? 0.25 : 0.14;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('“', boxX + 24 * scale, boxY + 8 * scale);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('”', boxX + boxW - 24 * scale, boxY + boxH - 2 * scale);
    ctx.restore();

    // Vẽ họa tiết đặc trưng theo từng kiểu viền nữ tính
    const midY = boxY + boxH / 2;
    const midX = boxX + boxW / 2;

    if (style === 'sakura') {
        // 🌸 Hoa anh đào 5 cánh & lá non hai bên + nụ hoa ở góc
        drawSakuraCluster(ctx, boxX + 36 * scale, midY, 22 * scale, theme);
        drawSakuraCluster(ctx, boxX + boxW - 36 * scale, midY, 22 * scale, theme);
        drawSakuraFlower(ctx, boxX + 26 * scale, boxY + 24 * scale, 11 * scale, theme.flowerSoft, theme.goldAccent);
        drawSakuraFlower(ctx, boxX + boxW - 26 * scale, boxY + boxH - 24 * scale, 11 * scale, theme.flowerSoft, theme.goldAccent);
    } else if (style === 'ribbon') {
        // 🎀 Nơ ruy băng lụa mềm mại trên đỉnh hộp + ngọc trai góc + hoa nhỏ hai bên
        drawSilkRibbonBow(ctx, midX, boxY + 2 * scale, 44 * scale, theme);
        drawSakuraFlower(ctx, boxX + 34 * scale, midY, 15 * scale, theme.flowerMain, theme.goldAccent);
        drawSakuraFlower(ctx, boxX + boxW - 34 * scale, midY, 15 * scale, theme.flowerMain, theme.goldAccent);
        drawCornerPearls(ctx, boxX, boxY, boxW, boxH, scale, theme);
    } else if (style === 'hearts') {
        // 💕 Trái tim đôi lồng nhau & ánh sao 4 cánh
        drawRomanticHeartsCluster(ctx, midX, boxY + 2 * scale, 22 * scale, theme);
        drawRomanticHeartsCluster(ctx, boxX + 36 * scale, midY, 19 * scale, theme);
        drawRomanticHeartsCluster(ctx, boxX + boxW - 36 * scale, midY, 19 * scale, theme);
        drawCornerStars(ctx, boxX, boxY, boxW, boxH, scale, theme);
    } else if (style === 'daisy') {
        // 🌿 Nhành lá & hoa cúc họa mi ôm hai bên sườn hộp
        drawDaisyVineSide(ctx, boxX + 36 * scale, midY, scale, -1, theme);
        drawDaisyVineSide(ctx, boxX + boxW - 36 * scale, midY, scale, 1, theme);
    } else if (style === 'vintage') {
        // 🌷 Thiệp ren hoa Pháp với họa tiết uốn lượn 4 góc & hoa hồng nhỏ hai bên
        drawVintageCornerFlourishes(ctx, boxX, boxY, boxW, boxH, scale, theme);
        drawSakuraFlower(ctx, boxX + 36 * scale, midY, 16 * scale, theme.flowerMain, theme.goldAccent);
        drawSakuraFlower(ctx, boxX + boxW - 36 * scale, midY, 16 * scale, theme.flowerMain, theme.goldAccent);
    }

    ctx.restore();
}

// --- Các hàm vẽ họa tiết hoa lá, nơ lụa, trái tim bằng Vector Canvas ---
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
    // Nhụy hoa vàng
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
    // Dải ruy băng lượn sóng hai bên đỉnh hộp
    ctx.strokeStyle = theme.flowerMain;
    ctx.lineWidth = size * 0.14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-size * 0.2, 0);
    ctx.bezierCurveTo(-size * 0.9, size * 0.55, -size * 1.5, -size * 0.2, -size * 2.2, size * 0.35);
    ctx.moveTo(size * 0.2, 0);
    ctx.bezierCurveTo(size * 0.9, size * 0.55, size * 1.5, -size * 0.2, size * 2.2, size * 0.35);
    ctx.stroke();

    // Hai cánh nơ lụa phồng
    ctx.fillStyle = theme.flowerSoft;
    ctx.strokeStyle = theme.flowerMain;
    ctx.lineWidth = size * 0.07;

    // Cánh nơ trái
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-size * 0.95, -size * 0.7, -size * 1.15, size * 0.55, 0, size * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cánh nơ phải
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(size * 0.95, -size * 0.7, size * 1.15, size * 0.55, 0, size * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Nút thắt nơ ở tâm
    ctx.fillStyle = theme.flowerMain;
    ctx.beginPath();
    ctx.ellipse(0, size * 0.04, size * 0.2, size * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawCornerPearls(ctx, boxX, boxY, boxW, boxH, scale, theme) {
    const corners = [
        [boxX + 24 * scale, boxY + 24 * scale],
        [boxX + boxW - 24 * scale, boxY + 24 * scale],
        [boxX + 24 * scale, boxY + boxH - 24 * scale],
        [boxX + boxW - 24 * scale, boxY + boxH - 24 * scale]
    ];
    ctx.save();
    corners.forEach(([x, y]) => {
        ctx.fillStyle = theme.goldAccent;
        ctx.beginPath();
        ctx.arc(x, y, 4.5 * scale, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}

function drawRomanticHeartsCluster(ctx, cx, cy, size, theme) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.12);
    ctx.fillStyle = theme.flowerMain;
    drawMiniHeartPath(ctx, -size * 0.22, 0, size * 1.15);
    ctx.fill();

    ctx.rotate(0.28);
    ctx.fillStyle = theme.flowerSoft;
    ctx.strokeStyle = theme.flowerMain;
    ctx.lineWidth = size * 0.08;
    drawMiniHeartPath(ctx, size * 0.35, -size * 0.12, size * 0.85);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function drawCornerStars(ctx, boxX, boxY, boxW, boxH, scale, theme) {
    const pts = [
        [boxX + 28 * scale, boxY + 28 * scale, 10 * scale],
        [boxX + boxW - 28 * scale, boxY + 28 * scale, 10 * scale],
        [boxX + 28 * scale, boxY + boxH - 28 * scale, 10 * scale],
        [boxX + boxW - 28 * scale, boxY + boxH - 28 * scale, 10 * scale]
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
    const hSpan = 72 * scale;
    ctx.strokeStyle = theme.leafColor;
    ctx.lineWidth = 2.2 * scale;
    ctx.beginPath();
    ctx.moveTo(cx, cy - hSpan);
    ctx.quadraticCurveTo(cx + dir * 12 * scale, cy, cx, cy + hSpan);
    ctx.stroke();

    drawLeaf(ctx, cx, cy - 42 * scale, dir > 0 ? -0.5 : -2.6, 18 * scale, theme.leafColor);
    drawLeaf(ctx, cx, cy + 42 * scale, dir > 0 ? 0.5 : 2.6, 18 * scale, theme.leafColor);
    drawDaisyFlower(ctx, cx + dir * 4 * scale, cy, 18 * scale, theme.flowerMain, theme.goldAccent);
    drawDaisyFlower(ctx, cx - dir * 2 * scale, cy - 52 * scale, 11 * scale, theme.flowerSoft, theme.goldAccent);
    drawDaisyFlower(ctx, cx - dir * 2 * scale, cy + 52 * scale, 11 * scale, theme.flowerSoft, theme.goldAccent);
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

// ====== THUẬT TOÁN ĐO ĐẠC & CO CHỮ TỰ ĐỘNG (ĐẢM BẢO 100% KHÔNG TRÀN HỘP) ======
const QUOTE_LINE_HEIGHT = 1.5;

function quoteFont(size) {
    return `italic 500 ${size}px "Playfair Display", serif`;
}

function recipientFont(size) {
    return `600 ${size}px "Montserrat", sans-serif`;
}

function ensureQuoteFont() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.race([
        Promise.all([
            document.fonts.load(quoteFont(56), 'Chúc mừng 20/10'),
            document.fonts.load(recipientFont(36), 'Thân gửi')
        ]),
        new Promise(resolve => setTimeout(resolve, 2000))
    ]).catch(() => {});
}
ensureQuoteFont();

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
    const padTop = Math.floor(boxH * (hasTopOrnament ? 0.14 : 0.105));
    const padBottom = Math.floor(boxH * 0.105);
    const maxH = boxH - padTop - padBottom;
    const minSize = Math.max(10, Math.floor(14 * scale));
    let layout = null;

    for (let fontSize = Math.floor(54 * scale); fontSize >= minSize; fontSize--) {
        const padX = Math.max(Math.floor(boxW * 0.088), Math.ceil(66 * scale));
        const maxWidth = boxW - padX * 2;

        // Đo dòng Tên người nhận (nếu có)
        let recFontSize = 0;
        let recBlockH = 0;
        if (recipientLine) {
            recFontSize = Math.max(Math.floor(16 * scale), Math.floor(fontSize * 0.72));
            ctx.font = recipientFont(recFontSize);
            while (recFontSize > 12 * scale && inkWidth(ctx, recipientLine) > maxWidth) {
                recFontSize--;
                ctx.font = recipientFont(recFontSize);
            }
            recBlockH = Math.floor(recFontSize * 1.65);
        }

        // Đo các dòng lời chúc
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
            recFontSize,
            recBlockH,
            padX,
            padTop,
            padBottom,
            maxWidth,
            maxH,
            totalTextH
        };

        if (totalTextH <= maxH && widest <= maxWidth) break;
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

    // 1. Vẽ dòng Tên người nhận (nếu có)
    if (layout.recipientLine && layout.recFontSize > 0) {
        const recY = startBlockY + layout.recFontSize * 0.55;
        ctx.font = recipientFont(layout.recFontSize);
        ctx.fillStyle = theme.recipientColor;
        ctx.fillText(layout.recipientLine, centerX, recY, layout.maxWidth);

        // Đường kẻ mảnh trang trí ngăn cách Tên người nhận và Lời chúc
        const divY = startBlockY + layout.recFontSize * 1.22;
        const divW = Math.min(layout.maxWidth * 0.36, 200 * scale);
        const divGrad = ctx.createLinearGradient(centerX - divW / 2, divY, centerX + divW / 2, divY);
        divGrad.addColorStop(0, 'rgba(0,0,0,0)');
        divGrad.addColorStop(0.5, theme.borderPrimary);
        divGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.strokeStyle = divGrad;
        ctx.lineWidth = Math.max(1, 1.5 * scale);
        ctx.beginPath();
        ctx.moveTo(centerX - divW / 2, divY);
        ctx.lineTo(centerX + divW / 2, divY);
        ctx.stroke();

        quoteStartY = startBlockY + layout.recBlockH + layout.lineHeight / 2;
    }

    // 2. Vẽ các dòng Lời chúc với gradient màu chữ & bóng chữ nhẹ
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
