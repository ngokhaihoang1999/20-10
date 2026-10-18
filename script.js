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

// =====================================================================================
// BỘ ĐIỀU TIẾT HIỆU NĂNG THÔNG MINH TOÀN CỤC 3 TẦNG (window.DevicePerfGovernor)
//   - Tầng 1: Nhận diện phần cứng thực tế (WebGL Unmasked GPU Renderer, CPU Cores, RAM, WebView)
//             Nhận biết chính xác Flagship (OPPO Find X9 Immortalis-G925 / Adreno 730-830 / Apple Pro / RTX)
//   - Tầng 2: Micro-Benchmark Canvas 2D + Đo tần số quét thực tế (120Hz / 90Hz / 60Hz / 30Hz Battery Saver)
//   - Tầng 3: Giám sát EMA Frame-Time thời gian thực & Điều tiết mật độ hạt động (Dynamic Load Scaling)
//             Đảm bảo MỌI ANIMATION LUÔN TIẾP DIỄN LIÊN TỤC (không bao giờ đóng băng) mà vẫn mượt 60-120fps!
// =====================================================================================
window.DevicePerfGovernor = (function () {
    let profile = null;
    const transitions = {};

    const rafProbe = {
        samples: [],
        lastTs: 0,
        done: false,
        running: false,
        medianMs: 16.67,
        p85Ms: 16.67,
        refreshHz: 60,
        is30HzCapped: false,
        isJittery: false
    };

    function detectGpuCapability() {
        let renderer = '';
        let gpuTier = 2; // 0: Low/Eco, 1: Mid, 2: High, 3: Ultra Flagship
        try {
            const c = document.createElement('canvas');
            c.width = 1;
            c.height = 1;
            const gl = c.getContext('webgl', { powerPreference: 'default', failIfMajorPerformanceCaveat: false })
                || c.getContext('experimental-webgl');
            if (!gl) {
                return { renderer: 'no-webgl', gpuTier: 0 };
            }
            const dbg = gl.getExtension('WEBGL_debug_renderer_info');
            renderer = String((dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) || '');
            const loseExt = gl.getExtension('WEBGL_lose_context');
            if (loseExt) loseExt.loseContext();
        } catch (_) {
            return { renderer: 'error', gpuTier: 1 };
        }

        const r = renderer.toLowerCase();
        const cores = navigator.hardwareConcurrency || 4;
        const mem = navigator.deviceMemory || 0;
        const rawDpr = window.devicePixelRatio || 1;
        if (
            /swiftshader|llvmpipe|software|basic render|microsoft basic/i.test(r) ||
            /mali-4|mali-t|mali-g3|mali-g51|mali-g52|mali-g57/i.test(r) ||
            /adreno[^0-9]*(3\d\d|4\d\d|5\d\d|610|612|615|616|618|619)/i.test(r) ||
            /powervr|img ge8|img bxe/i.test(r) ||
            /apple a(7|8|9|10|11)\b/i.test(r) ||
            /hd graphics (400|405|500|505|510|515|520|530|610|615|620)/i.test(r)
        ) {
            gpuTier = 0;
        } else if (
            /adreno[^0-9]*(620|630|640|642|650|660|710|720)/i.test(r) ||
            /mali-g(68|71|72|76|77|78|610)/i.test(r) ||
            /apple a(12|13|14)\b/i.test(r) ||
            /uhd graphics|iris/i.test(r)
        ) {
            gpuTier = 1;
        } else if (
            /immortalis|mali-g(715|720|9\d\d)|maleoon|xclipse\s*9|adreno[^0-9]*(730|735|740|750|8\d\d)/i.test(r) ||
            /apple m[1-9]|apple a(15|16|17|18|19)\b/i.test(r) ||
            /rtx|radeon rx|geforce gtx (16|20|30|40)|arc/i.test(r)
        ) {
            gpuTier = 3;
        } else if (/apple gpu/i.test(r)) {
            const maxDim = Math.max(window.screen ? window.screen.width : 390, window.screen ? window.screen.height : 844);
            if (maxDim <= 736 || rawDpr < 2.5) {
                gpuTier = 1;
            } else if (maxDim >= 844 && rawDpr >= 3) {
                gpuTier = 3;
            } else {
                gpuTier = 2;
            }
        } else if (cores >= 8 && (mem === 0 || mem >= 6) && rawDpr >= 2.2) {
            // Chrome Android (kể cả trên OPPO Find X9 / Flagship Android 15+) đôi khi ẩn tên GPU thành chuỗi chung (Vulkan/ANGLE/Mali)
            // Nếu có >= 8 nhân CPU, RAM >= 6GB và màn hình độ phân giải cao (DPR >= 2.2) mà không nằm trong danh sách GPU yếu -> Nhận diện chuẩn Flagship Tier 3!
            gpuTier = 3;
        }
        return { renderer, gpuTier };
    }

    function runMicroBench() {
        try {
            const c = document.createElement('canvas');
            c.width = 160;
            c.height = 160;
            const g = c.getContext('2d');
            if (!g) return 2.2;
            const pass = (n) => {
                const bg = g.createLinearGradient(0, 0, 0, 160);
                bg.addColorStop(0, '#093024');
                bg.addColorStop(1, '#186a52');
                g.fillStyle = bg;
                g.fillRect(0, 0, 160, 160);
                for (let i = 0; i < n; i++) {
                    const x = 16 + (i % 5) * 28;
                    const y = 20 + ((i / 5) | 0) * 30;
                    g.beginPath();
                    g.moveTo(x, y);
                    g.quadraticCurveTo(x - 12, y - 10, x + 22, y - 18);
                    g.quadraticCurveTo(x + 12, y - 10, x, y);
                    g.closePath();
                    g.fill();
                }
            };
            pass(4);
            pass(4);
            const t0 = performance.now();
            pass(18);
            return Math.max(0.08, performance.now() - t0);
        } catch (_) {
            return 1.2;
        }
    }

    function syncBodyDataset(prof) {
        if (document.body) {
            document.body.setAttribute('data-perf-tier', String(prof.tier));
            document.body.setAttribute('data-perf-quality', String(prof.qualityTier));
            document.body.setAttribute('data-perf-hz', String(prof.refreshHz || 60));
        }
    }

    function recompute(prof) {
        const rawDpr = window.devicePixelRatio || 1;
        let qualityTier = 2; // 0: Eco, 1: Balanced, 2: High, 3: Ultra Flagship

        if (
            prof.gpuTier === 0 ||
            prof.cores <= 4 ||
            (prof.memory > 0 && prof.memory <= 3) ||
            prof.benchMs > 4.5 ||
            (rafProbe.is30HzCapped && prof.benchMs > 2.8)
        ) {
            qualityTier = 0;
        } else if (
            prof.gpuTier === 3 &&
            !rafProbe.is30HzCapped &&
            (prof.memory === 0 || prof.memory >= 6)
        ) {
            // Các dòng máy Flagship (như OPPO Find X9 / Immortalis-G925 / Adreno 730-830 / Apple Pro)
            // luôn được cấp quyền Ultra Flagship (qualityTier = 3) để chạy full 100% hiệu ứng mà không bị nhiễu bởi độ trễ nạp trang ban đầu!
            qualityTier = 3;
        } else if (
            prof.gpuTier === 1 ||
            rafProbe.is30HzCapped ||
            prof.benchMs > 2.6 ||
            (prof.isMobile && prof.memory > 0 && prof.memory <= 4)
        ) {
            qualityTier = 1;
        } else {
            qualityTier = 2;
        }

        const tier = Math.min(2, qualityTier); // Tương thích ngược 100% với tier 0 | 1 | 2 của wish-bloom.js
        prof.qualityTier = qualityTier;
        prof.tier = tier;
        prof.isUltraFlagship = qualityTier === 3;
        prof.isLowEnd = tier === 0;
        prof.is30HzCapped = rafProbe.is30HzCapped;
        prof.refreshHz = rafProbe.refreshHz;
        prof.rafMedianMs = rafProbe.medianMs;
        prof.targetFrameMs = rafProbe.refreshHz >= 90 ? (1000 / rafProbe.refreshHz) : 16.67;

        prof.worldDpr = qualityTier === 3
            ? Math.min(rawDpr, prof.isMobile ? 1.35 : 1.5)
            : (tier === 2 ? Math.min(rawDpr, prof.isMobile ? 1.25 : 1.42) : (tier === 1 ? Math.min(rawDpr, 1.05) : Math.min(rawDpr, 0.85)));
        prof.directorDpr = qualityTier === 3
            ? Math.min(rawDpr, 1.5)
            : (tier === 2 ? Math.min(rawDpr, 1.38) : (tier === 1 ? Math.min(rawDpr, 1.2) : Math.min(rawDpr, 1.0)));
        prof.bgDpr = qualityTier >= 2
            ? Math.min(rawDpr, 1.35)
            : (tier === 1 ? Math.min(rawDpr, 1.15) : 1.0);

        syncBodyDataset(prof);
        return prof;
    }

    function startPassiveProbe() {
        if (rafProbe.running || rafProbe.done || typeof requestAnimationFrame !== 'function') return;
        rafProbe.running = true;
        let warmupFrames = 8; // Bỏ qua 8 frame đầu lúc trình duyệt vừa parse HTML/CSS để đo đúng tần số quét thật (60/90/120Hz)
        function tick(now) {
            if (document.hidden) {
                rafProbe.lastTs = 0;
                requestAnimationFrame(tick);
                return;
            }
            if (warmupFrames > 0) {
                warmupFrames--;
                rafProbe.lastTs = now;
                requestAnimationFrame(tick);
                return;
            }
            if (rafProbe.lastTs > 0) {
                const dt = now - rafProbe.lastTs;
                if (dt > 3.5 && dt < 120) {
                    rafProbe.samples.push(dt);
                }
            }
            rafProbe.lastTs = now;
            if (rafProbe.samples.length < 24) {
                requestAnimationFrame(tick);
            } else {
                const sorted = rafProbe.samples.slice().sort((a, b) => a - b);
                const mid = sorted[sorted.length >> 1] || 16.67;
                const p85 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.85))] || mid;
                rafProbe.medianMs = mid;
                rafProbe.p85Ms = p85;
                rafProbe.is30HzCapped = mid > 26.5 && mid < 42.0;
                rafProbe.refreshHz = mid < 9.8 ? 120 : (mid < 13.2 ? 90 : (rafProbe.is30HzCapped ? 30 : 60));
                rafProbe.isJittery = !rafProbe.is30HzCapped && p85 > 26.0;
                rafProbe.done = true;
                rafProbe.running = false;
                if (profile) recompute(profile);
            }
        }
        requestAnimationFrame(tick);
    }

    function getProfile() {
        if (profile) return profile;
        const isInApp = isInAppBrowser();
        const isIOS = isIOSDevice();
        const isMobile = isMobileDevice();
        const cores = navigator.hardwareConcurrency || 4;
        const memory = navigator.deviceMemory || 0;
        const gpu = detectGpuCapability();
        const benchMs = runMicroBench();

        profile = {
            cores,
            memory,
            isInApp,
            isIOS,
            isMobile,
            gpuRenderer: gpu.renderer,
            gpuTier: gpu.gpuTier,
            benchMs,
            tier: 1,
            qualityTier: 2,
            isUltraFlagship: false,
            isLowEnd: false,
            is30HzCapped: rafProbe.is30HzCapped,
            refreshHz: rafProbe.refreshHz,
            rafMedianMs: rafProbe.medianMs,
            targetFrameMs: 16.67,
            emaFrameMs: 16.67,
            emaRenderMs: 3.5,
            dynamicScale: 1.0,
            worldDpr: 1.15,
            directorDpr: 1.25,
            bgDpr: 1.15
        };
        return recompute(profile);
    }

    function beginTransition(tag, durationMs = 700) {
        transitions[tag] = performance.now() + durationMs;
    }

    function endTransition(tag) {
        if (tag) {
            delete transitions[tag];
        }
    }

    function isTransitionActive(tag) {
        const now = performance.now();
        if (tag) {
            return (transitions[tag] || 0) > now;
        }
        for (const k in transitions) {
            if (transitions[k] > now) return true;
        }
        return false;
    }

    function reportFrame(dtMs, renderMs = 0) {
        const prof = getProfile();
        if (dtMs > 3 && dtMs < 140) {
            prof.emaFrameMs = prof.emaFrameMs * 0.88 + dtMs * 0.12;
        }
        if (renderMs > 0 && renderMs < 100) {
            prof.emaRenderMs = prof.emaRenderMs * 0.85 + renderMs * 0.15;
        }
        const budget = prof.is30HzCapped ? 33.3 : 16.8;
        const pressure = Math.max(prof.emaFrameMs / budget, (prof.emaRenderMs * 1.45) / budget);
        let targetScale = 1.0;
        if (pressure > 1.45) {
            targetScale = prof.isUltraFlagship ? 0.85 : 0.45;
        } else if (pressure > 1.20) {
            targetScale = prof.isUltraFlagship ? 0.94 : 0.68;
        } else if (pressure > 1.02) {
            targetScale = prof.isUltraFlagship ? 1.0 : 0.85;
        }
        prof.dynamicScale = prof.dynamicScale * 0.90 + targetScale * 0.10;
        return prof.dynamicScale;
    }

    // Trả về tỷ lệ hạt nền cần vẽ (0.35 -> 1.0) theo trạng thái hiện tại:
    // KHÔNG BAO GIỜ trả về 0 để mọi hoạt ảnh nền luôn tiếp diễn liên tục 100%!
    function getBgBudget(phase = 'idle') {
        const prof = getProfile();
        if (prof.qualityTier === 3) {
            return 1.0; // Máy Ultra Flagship (như OPPO Find X9) luôn chạy full 100% hạt nền ở mọi pha
        }
        const baseByTier = prof.tier === 2 ? 0.92 : (prof.tier === 1 ? 0.72 : 0.50);
        let phaseMult = 1.0;
        if (phase === 'morph' || isTransitionActive('step2-morph')) {
            phaseMult = prof.tier === 2 ? 0.85 : (prof.tier === 1 ? 0.65 : 0.48);
        } else if (phase === 'arriving' || phase === 'wish_stamp' || phase === 'sky_descending' || phase === 'summoning') {
            phaseMult = prof.tier === 2 ? 0.85 : (prof.tier === 1 ? 0.65 : 0.48);
        } else if (phase === 'opening_peak') {
            phaseMult = prof.tier === 2 ? 0.80 : (prof.tier === 1 ? 0.60 : 0.45);
        }
        return Math.max(0.35, Math.min(1.0, baseByTier * phaseMult * prof.dynamicScale));
    }

    function getParticleCount(baseCount, minCount = 4, phase = 'idle') {
        const budget = getBgBudget(phase);
        return Math.max(minCount, Math.round(baseCount * budget));
    }

    startPassiveProbe();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => getProfile(), { once: true });
    } else {
        getProfile();
    }

    return {
        getProfile,
        recompute: () => recompute(getProfile()),
        beginTransition,
        endTransition,
        isTransitionActive,
        reportFrame,
        getBgBudget,
        getParticleCount
    };
})();

function checkInAppBrowser() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('card')) return; // Người nhận mở link thiệp 3D trong Telegram/Zalo sẽ vào thẳng bì thiệp, không hiện cảnh báo selfie
    if (isInAppBrowser()) {
        const warning = document.getElementById('browser-warning');
        if (warning) warning.style.display = 'flex';
    }
}
window.addEventListener('DOMContentLoaded', checkInAppBrowser);

// ====== HỆ THỐNG HẠT NỀN ĐA TẦNG & HIỆU ỨNG CHẠM TAY (SPRITE-ACCELERATED 60/120FPS LIÊN TỤC) ======
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

// Lớp 1: Đốm sáng Bokeh Ngọc Bích & Hoa Đào mềm mại (dùng Sprite pre-rendered, 0ms gradient per frame)
const _bokehOrbSpriteCache = {};
function getBokehOrbSprite(rgb) {
    if (_bokehOrbSpriteCache[rgb]) return _bokehOrbSpriteCache[rgb];
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const gctx = c.getContext('2d');
    const grad = gctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${rgb}, 1)`);
    grad.addColorStop(1, `rgba(${rgb}, 0)`);
    gctx.fillStyle = grad;
    gctx.beginPath();
    gctx.arc(32, 32, 32, 0, Math.PI * 2);
    gctx.fill();
    _bokehOrbSpriteCache[rgb] = c;
    return c;
}

// Pre-bake Sprite Cánh Hoa Anh Đào & Sao 4 Cánh 1 lần duy nhất khi khởi tạo:
// Thay thế hoàn toàn 40+ lệnh bezierCurveTo/quadraticCurveTo mỗi frame bằng drawImage(sprite) trên GPU (<0.12ms/frame),
// giúp hoa rơi trên #bg-canvas chạy xuyên suốt quá trình Morph Bước 1 -> Bước 2 mà KHÔNG cần tạm dừng!
const _sakuraPetalSpriteCache = {};
function getSakuraPetalSprite(color) {
    if (_sakuraPetalSpriteCache[color]) return _sakuraPetalSpriteCache[color];
    const c = document.createElement('canvas');
    c.width = 48;
    c.height = 48;
    const g = c.getContext('2d');
    const s = 34;
    g.translate(24, 24);
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, s * 0.5);
    g.bezierCurveTo(-s * 0.55, s * 0.2, -s * 0.5, -s * 0.35, -s * 0.12, -s * 0.5);
    g.lineTo(0, -s * 0.36);
    g.lineTo(s * 0.12, -s * 0.5);
    g.bezierCurveTo(s * 0.5, -s * 0.35, s * 0.55, s * 0.2, 0, s * 0.5);
    g.closePath();
    g.fill();
    _sakuraPetalSpriteCache[color] = c;
    return c;
}

const _twinkleStarSpriteCache = {};
function getTwinkleStarSprite(color) {
    if (_twinkleStarSpriteCache[color]) return _twinkleStarSpriteCache[color];
    const c = document.createElement('canvas');
    c.width = 36;
    c.height = 36;
    const g = c.getContext('2d');
    g.fillStyle = color;
    drawFourPointStarPath(g, 18, 18, 15);
    g.fill();
    _twinkleStarSpriteCache[color] = c;
    return c;
}

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
        this.sprite = getBokehOrbSprite(this.rgb);
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.phase += 0.02;
        if (this.y < -this.radius * 2) this.reset(false);
    }
    draw(ctx) {
        const alpha = Math.max(0.02, this.baseAlpha + Math.sin(this.phase) * 0.04);
        const r = this.radius;
        ctx.globalAlpha = alpha;
        ctx.drawImage(this.sprite, this.x - r, this.y - r, r * 2, r * 2);
    }
}

// Lớp 2: Cánh hoa anh đào rơi lượn sóng 3D mềm mại (vẽ qua GPU Sprite)
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
        this.sprite = getSakuraPetalSprite(this.color);
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
        const s = this.size * 1.41;
        const flipY = 0.45 + Math.abs(Math.cos(this.tilt)) * 0.55;
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        ctx.setTransform(cos, sin, -sin * flipY, cos * flipY, this.x, this.y);
        ctx.globalAlpha = this.opacity;
        ctx.drawImage(this.sprite, -s * 0.5, -s * 0.5, s, s);
    }
}

// Lớp 3: Ánh sao 4 cánh lấp lánh (vẽ qua GPU Sprite)
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
        this.sprite = getTwinkleStarSprite(this.color);
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
        const d = s * 2.3;
        ctx.globalAlpha = Math.min(0.85, (s / this.size) * 0.8);
        ctx.drawImage(this.sprite, this.x - d * 0.5, this.y - d * 0.5, d, d);
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
    const prof = window.DevicePerfGovernor ? window.DevicePerfGovernor.getProfile() : null;
    const mobile = isMobileDevice();
    const tierScale = prof ? (prof.qualityTier === 3 ? 1.05 : (prof.tier === 2 ? 1.0 : (prof.tier === 1 ? 0.78 : 0.58))) : 1.0;
    const petalCount = Math.max(10, Math.round((mobile ? 22 : 34) * tierScale));
    const bokehCount = Math.max(4, Math.round((mobile ? 6 : 10) * tierScale));
    const starCount = Math.max(5, Math.round((mobile ? 9 : 14) * tierScale));

    bgParticles = [];
    bokehOrbs = [];
    sparkles = [];
    for (let i = 0; i < bokehCount; i++) bokehOrbs.push(new BokehOrb());
    for (let i = 0; i < petalCount; i++) bgParticles.push(new SakuraPetal());
    for (let i = 0; i < starCount; i++) sparkles.push(new TwinkleStar());
}

let _lastBgAnimTs = 0;
function animateBg(now) {
    // Chỉ nghỉ khi #bg-canvas bị che khuất hoàn toàn bởi Sân khấu 3D hoặc Bước 3 (nơi có #showcase-bg-canvas riêng).
    // Trong suốt Bước 1, quá trình Morph Bước 1 -> Bước 2, và Bước 2: Hoa rơi & Bokeh LUÔN CHẠY LIÊN TỤC 100%,
    // được điều tiết thông minh bởi DevicePerfGovernor + Sprite GPU (<0.12ms/frame)!
    const isCoveredByStep3 = document.body.classList.contains('u3d-stage-active') || (step3 && step3.classList.contains('active'));
    if (!document.hidden && !isCoveredByStep3) {
        const t0 = performance.now();
        const dtMs = _lastBgAnimTs > 0 ? (t0 - _lastBgAnimTs) : 16.67;
        _lastBgAnimTs = t0;

        const phase = window.isStep2Morphing ? 'morph' : 'idle';
        const budget = window.DevicePerfGovernor ? window.DevicePerfGovernor.getBgBudget(phase) : 1.0;
        const activeBokeh = Math.max(3, Math.ceil(bokehOrbs.length * budget));
        const activePetals = Math.max(8, Math.ceil(bgParticles.length * budget));
        const activeStars = Math.max(4, Math.ceil(sparkles.length * budget));

        bgCtx.setTransform(1, 0, 0, 1, 0, 0);
        bgCtx.clearRect(0, 0, bgWidth, bgHeight);

        for (let i = 0; i < bokehOrbs.length; i++) {
            bokehOrbs[i].update();
            if (i < activeBokeh) bokehOrbs[i].draw(bgCtx);
        }
        for (let i = 0; i < bgParticles.length; i++) {
            bgParticles[i].update();
            if (i < activePetals) bgParticles[i].draw(bgCtx);
        }
        bgCtx.setTransform(1, 0, 0, 1, 0, 0);
        for (let i = 0; i < sparkles.length; i++) {
            sparkles[i].update();
            if (i < activeStars) sparkles[i].draw(bgCtx);
        }
        bgCtx.globalAlpha = 1;

        if (window.DevicePerfGovernor) {
            window.DevicePerfGovernor.reportFrame(dtMs, performance.now() - t0);
        }
    } else {
        _lastBgAnimTs = 0;
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
    window.CardAudio?.playCelebrationBurst();
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
            shape: i % 3 === 0 ? 'heart' : (i % 3 === 1 ? 'star' : 'petal' )
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
            fxParticles[i] = fxParticles[fxParticles.length - 1];
            fxParticles.pop();
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
    if (document.body.classList.contains('u3d-stage-active')) return;
    const now = performance.now();
    if (now - lastSparkleTime < 40) return;
    if (e.target && e.target.closest('#preview-area-wrap')) return;
    lastSparkleTime = now;
    spawnTouchSparkle(e.clientX, e.clientY, 1);
    if (e.pointerType === 'touch' || e.buttons > 0) {
        window.CardAudio?.playTouchSparkle(e.clientX);
    }
}, { passive: true });

window.addEventListener('pointerdown', (e) => {
    if (document.body.classList.contains('u3d-stage-active')) return;
    if (e.target && e.target.closest('#preview-area-wrap')) return;
    spawnTouchSparkle(e.clientX, e.clientY, 3);
    if (!e.target || !e.target.closest('button, input, textarea, label, a, #hero-fan-showcase')) {
        window.CardAudio?.playTouchSparkle(e.clientX);
    }
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
    all: [[0, 399]],
    warm: [[0, 53], [154, 163], [194, 259], [385, 399]],
    selflove: [[54, 63], [114, 123], [184, 193], [260, 284]],
    work: [[64, 73], [144, 153], [285, 309]],
    beauty: [[74, 83], [0, 23], [174, 183], [200, 229], [310, 334]],
    friends: [[84, 93], [134, 143], [164, 173], [335, 354]],
    family: [[94, 103], [355, 369]],
    autumn: [[104, 113], [385, 399]],
    fun: [[124, 133], [370, 384]]
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
    },
    ruby: {
        canvasBgStart: '#ffffff',
        canvasBgMid: '#fff5f7',
        canvasBgEnd: '#fdd8e0',
        boxFillStart: 'rgba(255, 255, 255, 0.98)',
        boxFillEnd: 'rgba(254, 232, 237, 0.95)',
        borderPrimary: '#b81438',
        borderSecondary: '#f2a7b8',
        flowerMain: '#c4193f',
        flowerSoft: '#f9bec9',
        leafColor: '#4d9e7d',
        goldAccent: '#e5b548',
        textTop: '#59071a',
        textMid: '#8a0d2a',
        textBottom: '#420412',
        recipientColor: '#0f7b5f',
        shadowRgba: 'rgba(165, 20, 52, 0.16)'
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
    ctx.fillText(window.isSelfOracleMode ? '★ VIETNAM ★' : '★ BTLMVN ★', 0, radius * 0.46);
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
        // Khung phủ xem trước ở Bước 2 hiển thị ở kích thước ~220x328 CSS px (Bản in cuối ở Bước 3 vẽ trực tiếp 1024x1526 qua renderConceptOverlayToCtx).
        // Kết xuất lớp phủ xem trước ở 512x763 giữ chuẩn Retina 2.3x nhưng giảm 75% thời gian nén/giải mã PNG!
        fullOverlayCache[cacheKey] = buildConceptDataUrlAtSize(conceptKey, theme, 512, 763);
    }
    return fullOverlayCache[cacheKey];
}

function refreshConceptFramesForTheme() {
    if (frameList) {
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
    }
    updateFrameOverlay();
}

function preloadFrames() {
    if (!frameList) return;
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
    const maxLineW = boxW - Math.max(Math.floor(boxW * 0.096), Math.ceil(92 * scale));

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 1. Dòng tiêu đề trên cùng lớn rõ (tự co cỡ chữ nếu dài để tuyệt đối không tràn)
    const topTitle = window.isSelfOracleMode
        ? ((recipientName || '').trim() || 'Mừng ngày Phụ nữ Việt Nam')
        : ((recipientName || '').trim() || '🌸 Câu Chúc Ngẫu Nhiên 🌸');
    let titleFontPx = Math.floor(66 * scale);
    ctx.font = recipientFont(titleFontPx);
    while (titleFontPx > Math.floor(34 * scale) && inkWidth(ctx, topTitle) > maxLineW) {
        titleFontPx -= 1;
        ctx.font = recipientFont(titleFontPx);
    }
    ctx.fillStyle = theme.recipientColor;
    ctx.shadowColor = theme.shadowRgba;
    ctx.shadowBlur = Math.floor(10 * scale);
    ctx.fillText(topTitle, centerX, boxY + boxH * 0.22, maxLineW);

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

    // 3. Dòng thông điệp bí mật ở trung tâm hộp chữ (luồng cá nhân không nhắc tới BTLMVN)
    const surpriseLine = window.isSelfOracleMode
        ? 'Lời chúc bất ngờ nhân ngày Phụ nữ Việt Nam 20.10'
        : 'Lời chúc bất ngờ nhân dịp 20.10 từ BTLMVN';
    let bodyFontPx = Math.floor(56 * scale);
    ctx.font = quoteFont(bodyFontPx);
    while (bodyFontPx > Math.floor(32 * scale) && inkWidth(ctx, surpriseLine) > maxLineW) {
        bodyFontPx -= 1;
        ctx.font = quoteFont(bodyFontPx);
    }
    const textGrad = ctx.createLinearGradient(0, boxY + boxH * 0.46, 0, boxY + boxH * 0.74);
    textGrad.addColorStop(0, theme.textTop);
    textGrad.addColorStop(0.5, theme.textMid);
    textGrad.addColorStop(1, theme.textBottom);
    ctx.fillStyle = textGrad;

    ctx.fillText(surpriseLine, centerX, boxY + boxH * 0.60, maxLineW);

    // 4. Dòng ghi chú phía dưới to rõ, dễ đọc
    const bottomHint = window.isSelfOracleMode
        ? '✦ Căn ảnh & làm đẹp rồi bấm Nhận lời chúc ✦'
        : `✦ Chủ đề: ${TOPIC_LABELS_MAP[currentTopic] || 'Ngẫu nhiên'}  •  Chạm để tự viết ✦`;
    let hintFontPx = Math.floor(36 * scale);
    ctx.font = `700 ${hintFontPx}px "Montserrat", sans-serif`;
    while (hintFontPx > Math.floor(22 * scale) && inkWidth(ctx, bottomHint) > maxLineW) {
        hintFontPx -= 1;
        ctx.font = `700 ${hintFontPx}px "Montserrat", sans-serif`;
    }
    ctx.fillStyle = theme.borderPrimary;
    ctx.globalAlpha = 0.95;
    ctx.fillText(bottomHint, centerX, boxY + boxH * 0.85, maxLineW);

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

    const marginX = Math.floor(targetW * 0.038);
    const boxX = marginX;
    const boxY = originH + Math.floor(textSpaceHeight * 0.068);
    const boxW = targetW - marginX * 2;
    const boxH = Math.floor(textSpaceHeight * 0.875);
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
let currentBokehIntensity = 0;
let currentSkinIntensity = 0;
let currentLipIntensity = 0;
let currentLipShade = 'none';

const LIP_SHADES_CONFIG = {
    none:       { label: 'Gốc',       rgb: null,            softRgb: null,            mulAlpha: 0,    softAlpha: 0 },
    peach:      { label: 'Hồng đào',  rgb: [232, 82, 114],  softRgb: [255, 132, 158], mulAlpha: 0.46, softAlpha: 0.56 },
    cherry:     { label: 'Đỏ cherry', rgb: [198, 22, 54],   softRgb: [242, 66, 96],   mulAlpha: 0.54, softAlpha: 0.48 },
    terracotta: { label: 'Cam đất',   rgb: [196, 68, 42],   softRgb: [238, 118, 86],  mulAlpha: 0.50, softAlpha: 0.52 },
    rosewood:   { label: 'Hồng đất',  rgb: [174, 62, 86],   softRgb: [220, 114, 136], mulAlpha: 0.50, softAlpha: 0.50 },
    wine:       { label: 'Đỏ rượu',   rgb: [136, 16, 42],   softRgb: [194, 46, 76],   mulAlpha: 0.60, softAlpha: 0.44 }
};

// Các chỉ số Landmark chuẩn của MediaPipe FaceMesh (478 điểm) cho Môi ngoài, Môi trong (trừ răng/miệng), Viền mặt, Mắt & Chân mày
const MP_OUTER_LIP_INDICES = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];
const MP_INNER_LIP_INDICES = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];
const MP_LOWER_LIP_GLOSS_INDICES = [14, 317, 402, 318, 321, 405, 314, 17, 84, 181, 91, 88, 178, 87];
const MP_FACE_OVAL_INDICES = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
const MP_LEFT_EYE_INDICES = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7];
const MP_RIGHT_EYE_INDICES = [263, 466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249];
const MP_LEFT_BROW_INDICES = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
const MP_RIGHT_BROW_INDICES = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276];

// Trạng thái bộ đệm tiền kết xuất (Pre-baked Offscreen Layers) cho ảnh đang chỉnh ở Bước 2
const beautyEngineState = {
    photoToken: 0,
    srcImg: null,
    workW: 0,
    workH: 0,
    layersReady: false,
    landmarksResolved: false,
    segmenterResolved: false,
    detectedFaces: null,
    personMaskFloat: null,
    personMaskW: 0,
    personMaskH: 0,
    heuristicInfo: null,
    faceRoi: null,
    lipRoi: null,
    baseCanvas: null,
    subjectMaskCanvas: null,
    bokehLayerCanvas: null,
    skinRetouchLayerCanvas: null,
    lipMaskCanvas: null,
    lipHighlightMaskCanvas: null,
    lipLayerCanvas: null,
    builtLipShade: 'none',
    retouchCanvasEl: null,
    viewBoxImgEl: null,
    viewBoxObserver: null,
    compositeRafId: 0
};

let _mpBeautyAIPromise = null;
let _mpBeautyAIInstances = null;

function ensureMediaPipeBeautyAI() {
    if (_mpBeautyAIInstances) return Promise.resolve(_mpBeautyAIInstances);
    if (_mpBeautyAIPromise) return _mpBeautyAIPromise;

    _mpBeautyAIPromise = (async () => {
        try {
            const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs');
            const filesetResolver = await vision.FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
            );

            // 1. Khởi tạo FaceLandmarker (478 điểm 3D cho viền Môi, Mắt, Chân mày, Khuôn mặt)
            let landmarker = null;
            try {
                landmarker = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
                    baseOptions: {
                        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                        delegate: 'GPU'
                    },
                    runningMode: 'IMAGE',
                    numFaces: 3
                });
            } catch (_) {
                try {
                    landmarker = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
                        baseOptions: {
                            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                            delegate: 'CPU'
                        },
                        runningMode: 'IMAGE',
                        numFaces: 3
                    });
                } catch (_e2) {}
            }

            // 2. Khởi tạo ImageSegmenter (Mô hình Selfie Segmenter 243KB của Google chuyên tách toàn thân + cánh tay dang rộng + bàn tay + mái tóc)
            let segmenter = null;
            if (vision.ImageSegmenter) {
                try {
                    segmenter = await vision.ImageSegmenter.createFromOptions(filesetResolver, {
                        baseOptions: {
                            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
                            delegate: 'GPU'
                        },
                        runningMode: 'IMAGE',
                        outputCategoryMask: false,
                        outputConfidenceMasks: true
                    });
                } catch (_) {
                    try {
                        segmenter = await vision.ImageSegmenter.createFromOptions(filesetResolver, {
                            baseOptions: {
                                modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
                                delegate: 'CPU'
                            },
                            runningMode: 'IMAGE',
                            outputCategoryMask: false,
                            outputConfidenceMasks: true
                        });
                    } catch (_e3) {}
                }
            }

            if (!landmarker && !segmenter) {
                _mpBeautyAIPromise = null;
                return null;
            }
            _mpBeautyAIInstances = { landmarker, segmenter };
            return _mpBeautyAIInstances;
        } catch (err) {
            _mpBeautyAIPromise = null;
            return null;
        }
    })();
    return _mpBeautyAIPromise;
}

// Sprite đĩa Bokeh quang học khẩu lớn f/1.4 (tâm dịu + viền ánh sáng quang học tinh tế)
let _opticalApertureBokehSprite = null;
function getOpticalApertureBokehSprite() {
    if (_opticalApertureBokehSprite) return _opticalApertureBokehSprite;
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 96;
    const g = c.getContext('2d');
    const rad = g.createRadialGradient(48, 48, 0, 48, 48, 46);
    rad.addColorStop(0, 'rgba(255, 253, 245, 0.36)');
    rad.addColorStop(0.68, 'rgba(255, 248, 232, 0.44)');
    rad.addColorStop(0.86, 'rgba(255, 255, 250, 0.72)');
    rad.addColorStop(0.95, 'rgba(255, 245, 220, 0.25)');
    rad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    g.fillStyle = rad;
    g.beginPath();
    g.arc(48, 48, 46, 0, Math.PI * 2);
    g.fill();
    _opticalApertureBokehSprite = c;
    return c;
}

function isAnyBeautyRetouchActive() {
    return (
        currentBokehIntensity > 0 ||
        currentSkinIntensity > 0 ||
        (currentLipIntensity > 0 && currentLipShade && currentLipShade !== 'none')
    );
}

function getBeautyRetouchSignature() {
    const lipVal = (currentLipShade && currentLipShade !== 'none') ? `${currentLipShade}:${Math.round(currentLipIntensity)}` : 'none:0';
    return `bk:${Math.round(currentBokehIntensity)}|sk:${Math.round(currentSkinIntensity)}|lp:${lipVal}`;
}

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

function updateSliderTrackFill(sliderEl, pct, activeStartColor = '#0f7b5f', activeEndColor = '#d4af37', emptyColor = '#dbece5') {
    if (!sliderEl) return;
    const clamped = Math.round(Math.max(0, Math.min(100, pct)));
    sliderEl.value = String(clamped);
    sliderEl.style.background = `linear-gradient(90deg, ${activeStartColor} 0%, ${activeEndColor} ${clamped}%, ${emptyColor} ${clamped}%, ${emptyColor} 100%)`;
}

function syncFilterIntensityUI() {
    // 1. Slider Filter màu
    const filterSlider = document.getElementById('filter-intensity-slider');
    const filterValLabel = document.getElementById('filter-intensity-value');
    const filterRow = document.getElementById('filter-intensity-row');
    const isFilterNone = !currentSelectedFilter || currentSelectedFilter === 'none' || currentFilterIntensity <= 0;
    const filterPct = isFilterNone ? 0 : Math.round(Math.max(0, Math.min(100, currentFilterIntensity)));

    updateSliderTrackFill(filterSlider, filterPct, '#0f7b5f', '#d4af37', '#dbece5');
    if (filterValLabel) filterValLabel.textContent = isFilterNone ? 'Gốc' : `${filterPct}%`;
    if (filterRow) filterRow.classList.toggle('is-disabled', isFilterNone);

    // 2. Slider Xóa phông ống kính (Bokeh f/1.4)
    const bokehSlider = document.getElementById('bokeh-intensity-slider');
    const bokehValLabel = document.getElementById('bokeh-intensity-value');
    const bokehRow = document.getElementById('bokeh-intensity-row');
    const bokehPct = Math.round(Math.max(0, Math.min(100, currentBokehIntensity)));

    updateSliderTrackFill(bokehSlider, bokehPct, '#0f7b5f', '#d4af37', '#dbece5');
    if (bokehValLabel) bokehValLabel.textContent = bokehPct <= 0 ? 'Tắt' : `${bokehPct}%`;
    if (bokehRow) bokehRow.classList.toggle('is-disabled', bokehPct <= 0);

    // 3. Slider Tô son môi
    const lipSlider = document.getElementById('lip-intensity-slider');
    const lipValLabel = document.getElementById('lip-intensity-value');
    const lipRow = document.getElementById('lip-intensity-row');
    const isLipNone = !currentLipShade || currentLipShade === 'none' || currentLipIntensity <= 0;
    const lipPct = isLipNone ? 0 : Math.round(Math.max(0, Math.min(100, currentLipIntensity)));

    updateSliderTrackFill(lipSlider, lipPct, '#d84b7e', '#e2b049', '#f5dce5');
    if (lipValLabel) lipValLabel.textContent = isLipNone ? 'Gốc' : `${lipPct}%`;
    if (lipRow) lipRow.classList.toggle('is-disabled', isLipNone);

    // 4. Slider Mịn sáng da
    const skinSlider = document.getElementById('skin-intensity-slider');
    const skinValLabel = document.getElementById('skin-intensity-value');
    const skinRow = document.getElementById('skin-intensity-row');
    const skinPct = Math.round(Math.max(0, Math.min(100, currentSkinIntensity)));

    updateSliderTrackFill(skinSlider, skinPct, '#d84b7e', '#e2b049', '#f5dce5');
    if (skinValLabel) skinValLabel.textContent = skinPct <= 0 ? 'Tắt' : `${skinPct}%`;
    if (skinRow) skinRow.classList.toggle('is-disabled', skinPct <= 0);

    // Đồng bộ chấm sáng báo hiệu trên 2 nút Sub-tab (🎨 Màu & Xóa phông | 💄 Mịn da & Tô son)
    const colorTabBtn = document.getElementById('beauty-subtab-color-btn');
    const makeupTabBtn = document.getElementById('beauty-subtab-makeup-btn');
    if (colorTabBtn) colorTabBtn.classList.toggle('has-active-fx', !isFilterNone || bokehPct > 0);
    if (makeupTabBtn) makeupTabBtn.classList.toggle('has-active-fx', !isLipNone || skinPct > 0);
}

// Giải phóng bộ nhớ các lớp Canvas của ảnh cũ ngay khi đổi ảnh
function disposeBeautyEngineLayers() {
    beautyEngineState.photoToken++;
    if (beautyEngineState.compositeRafId) {
        cancelAnimationFrame(beautyEngineState.compositeRafId);
        beautyEngineState.compositeRafId = 0;
    }
    if (beautyEngineState.viewBoxObserver) {
        beautyEngineState.viewBoxObserver.disconnect();
        beautyEngineState.viewBoxObserver = null;
    }
    ['baseCanvas', 'subjectMaskCanvas', 'bokehLayerCanvas', 'skinRetouchLayerCanvas', 'lipMaskCanvas', 'lipHighlightMaskCanvas', 'lipLayerCanvas'].forEach(k => {
        const cv = beautyEngineState[k];
        if (cv) {
            cv.width = 0;
            cv.height = 0;
            beautyEngineState[k] = null;
        }
    });
    beautyEngineState.srcImg = null;
    beautyEngineState.workW = 0;
    beautyEngineState.workH = 0;
    beautyEngineState.layersReady = false;
    beautyEngineState.landmarksResolved = false;
    beautyEngineState.segmenterResolved = false;
    beautyEngineState.detectedFaces = null;
    beautyEngineState.personMaskFloat = null;
    beautyEngineState.personMaskW = 0;
    beautyEngineState.personMaskH = 0;
    beautyEngineState.heuristicInfo = null;
    beautyEngineState.faceRoi = null;
    beautyEngineState.lipRoi = null;
    beautyEngineState.builtLipShade = 'none';
    beautyEngineState.retouchCanvasEl = null;
    beautyEngineState.viewBoxImgEl = null;
}

// Phân tích cực nhanh (<2.5ms trên lưới 180px) để xác định tâm chủ thể, sắc độ da thích ứng, màu trang phục thân người, cánh tay dang rộng & điểm sáng hậu cảnh
function analyzePhotoHeuristicsFast(baseCanvas) {
    const sw = 180;
    const sh = Math.max(60, Math.round((baseCanvas.height / Math.max(1, baseCanvas.width)) * sw));
    const c = document.createElement('canvas');
    c.width = sw;
    c.height = sh;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(baseCanvas, 0, 0, sw, sh);
    const imgData = ctx.getImageData(0, 0, sw, sh);
    const d = imgData.data;

    let skinSumX = 0, skinSumY = 0, skinWeightSum = 0;
    let skinCrSum = 0, skinCbSum = 0;
    let minSkinX = sw, maxSkinX = 0, minSkinY = sh, maxSkinY = 0;

    // 1. Tìm vùng da người (YCbCr + RGB redness) ưu tiên vùng trung tâm ảnh để định vị khuôn mặt chính
    for (let y = Math.floor(sh * 0.05); y < Math.floor(sh * 0.88); y += 2) {
        const ny = y / sh;
        const centerBiasY = 1 - Math.abs(ny - 0.38) * 0.88;
        for (let x = Math.floor(sw * 0.06); x < Math.floor(sw * 0.94); x += 2) {
            const nx = x / sw;
            const centerBiasX = 1 - Math.abs(nx - 0.5) * 1.05;
            if (centerBiasX <= 0.1 || centerBiasY <= 0.1) continue;

            const idx = (y * sw + x) * 4;
            const r = d[idx], g = d[idx + 1], b = d[idx + 2];
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            if (r > 80 && g > 36 && b > 18 && r > g && r > b && (maxC - minC) > 11) {
                const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
                const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
                if (cr >= 131 && cr <= 180 && cb >= 75 && cb <= 132) {
                    const w = centerBiasX * centerBiasY;
                    skinSumX += x * w;
                    skinSumY += y * w;
                    skinCrSum += cr * w;
                    skinCbSum += cb * w;
                    skinWeightSum += w;
                    if (x < minSkinX) minSkinX = x;
                    if (x > maxSkinX) maxSkinX = x;
                    if (y < minSkinY) minSkinY = y;
                    if (y > maxSkinY) maxSkinY = y;
                }
            }
        }
    }

    let faceCx = 0.5;
    let faceCy = 0.35;
    let faceRx = 0.20;
    let faceRy = 0.18;
    let meanSkinCr = 151;
    let meanSkinCb = 104;

    if (skinWeightSum > 14) {
        faceCx = Math.max(0.20, Math.min(0.80, (skinSumX / skinWeightSum) / sw));
        faceCy = Math.max(0.15, Math.min(0.65, (skinSumY / skinWeightSum) / sh));
        meanSkinCr = skinCrSum / skinWeightSum;
        meanSkinCb = skinCbSum / skinWeightSum;
        const spanW = (maxSkinX - minSkinX) / sw;
        const spanH = (maxSkinY - minSkinY) / sh;
        faceRx = Math.max(0.12, Math.min(0.28, spanW * 0.36));
        faceRy = Math.max(0.12, Math.min(0.26, spanH * 0.32));
    }

    // 2. Lấy mẫu màu trang phục thân người (Torso Clothing Color) ngay dưới cổ để nhận diện tay áo dài dang rộng
    let clothR = 128, clothG = 128, clothB = 128, clothCr = 128, clothCb = 128, clothValid = false;
    const torsoY0 = Math.max(0, Math.min(sh - 1, Math.floor((faceCy + faceRy * 1.35) * sh)));
    const torsoY1 = Math.max(torsoY0 + 1, Math.min(sh, Math.ceil((faceCy + faceRy * 2.55) * sh)));
    const torsoX0 = Math.max(0, Math.floor((faceCx - faceRx * 0.85) * sw));
    const torsoX1 = Math.min(sw, Math.ceil((faceCx + faceRx * 0.85) * sw));
    let cSumR = 0, cSumG = 0, cSumB = 0, cCount = 0;
    for (let y = torsoY0; y < torsoY1; y += 2) {
        for (let x = torsoX0; x < torsoX1; x += 2) {
            const idx = (y * sw + x) * 4;
            cSumR += d[idx];
            cSumG += d[idx + 1];
            cSumB += d[idx + 2];
            cCount++;
        }
    }
    if (cCount > 6) {
        clothR = cSumR / cCount;
        clothG = cSumG / cCount;
        clothB = cSumB / cCount;
        clothCb = 128 - 0.168736 * clothR - 0.331264 * clothG + 0.5 * clothB;
        clothCr = 128 + 0.5 * clothR - 0.418688 * clothG - 0.081312 * clothB;
        clothValid = true;
    }

    // 3. Quét các cụm da ở vùng biên trái/phải (cánh tay, cổ tay, bàn tay giơ cao hoặc dang rộng ra ngoài thân người)
    // để dựng Cầu nối Giải phẫu Vai -> Cánh tay -> Bàn tay (Anatomical Arm Bridge)
    const armClusters = [];
    const sectorBuckets = Array.from({ length: 12 }, () => ({ sumX: 0, sumY: 0, count: 0, maxDist: 0 }));
    const shLeftX = faceCx - faceRx * 1.15;
    const shRightX = faceCx + faceRx * 1.15;
    const shY = faceCy + faceRy * 1.25;

    for (let y = Math.floor(sh * 0.05); y < Math.floor(sh * 0.96); y += 2) {
        const ny = y / sh;
        for (let x = 2; x < sw - 2; x += 2) {
            const nx = x / sw;
            // Chỉ xét các điểm nằm ngoài trục mặt/thân chính
            if (Math.abs(nx - faceCx) < faceRx * 1.18 && ny > faceCy - faceRy * 1.1) continue;

            const idx = (y * sw + x) * 4;
            const r = d[idx], g = d[idx + 1], b = d[idx + 2];
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            if (r > 72 && g > 34 && b > 16 && r > g && r > b && (maxC - minC) > 10) {
                const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
                const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
                const distAdapt = Math.hypot(cr - meanSkinCr, cb - meanSkinCb);
                if ((cr >= 130 && cr <= 182 && cb >= 74 && cb <= 134) && distAdapt < 24) {
                    const isLeft = nx < faceCx;
                    const refX = isLeft ? shLeftX : shRightX;
                    const dx = nx - refX;
                    const dy = ny - shY;
                    const dist = Math.hypot(dx, dy);
                    if (dist > faceRx * 0.35 && dist < faceRx * 4.8) {
                        const angle = Math.atan2(dy, dx); // [-PI, PI]
                        const bIdx = Math.max(0, Math.min(11, Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 12)));
                        const bucket = sectorBuckets[bIdx];
                        bucket.sumX += nx;
                        bucket.sumY += ny;
                        bucket.count++;
                        if (dist > bucket.maxDist) bucket.maxDist = dist;
                    }
                }
            }
        }
    }

    for (let i = 0; i < sectorBuckets.length; i++) {
        const b = sectorBuckets[i];
        if (b.count >= 3) {
            const hx = b.sumX / b.count;
            const hy = b.sumY / b.count;
            const isLeft = hx < faceCx;
            armClusters.push({
                sx: isLeft ? shLeftX : shRightX,
                sy: shY,
                hx,
                hy
            });
        }
    }

    // 4. Tìm vùng môi tự nhiên dự phòng (trong nửa dưới khuôn mặt)
    let lipCx = faceCx;
    let lipCy = Math.min(0.82, faceCy + faceRy * 0.46);
    let lipRx = faceRx * 0.36;
    let lipRy = faceRy * 0.14;

    const searchX0 = Math.max(4, Math.floor((faceCx - faceRx * 0.55) * sw));
    const searchX1 = Math.min(sw - 4, Math.ceil((faceCx + faceRx * 0.55) * sw));
    const searchY0 = Math.max(4, Math.floor((faceCy + faceRy * 0.12) * sh));
    const searchY1 = Math.min(sh - 4, Math.ceil((faceCy + faceRy * 0.85) * sh));

    let lipSumX = 0, lipSumY = 0, lipWTotal = 0;
    for (let y = searchY0; y <= searchY1; y++) {
        for (let x = searchX0; x <= searchX1; x++) {
            const idx = (y * sw + x) * 4;
            const r = d[idx], g = d[idx + 1], b = d[idx + 2];
            if (r > 70 && r > g * 1.18 && g < 195) {
                const redness = (r - g * 0.72 - b * 0.28);
                if (redness > 36) {
                    const w = redness * redness;
                    lipSumX += x * w;
                    lipSumY += y * w;
                    lipWTotal += w;
                }
            }
        }
    }
    if (lipWTotal > 2500) {
        lipCx = (lipSumX / lipWTotal) / sw;
        lipCy = (lipSumY / lipWTotal) / sh;
    }

    // 5. Tìm tối đa 26 điểm sáng nổi bật ở hậu cảnh để tạo hiệu ứng Bokeh khẩu lớn f/1.4
    const highlights = [];
    const step = 6;
    for (let y = step; y < sh - step; y += step) {
        const ny = y / sh;
        for (let x = step; x < sw - step; x += step) {
            const nx = x / sw;
            const dxFace = (nx - faceCx) / (faceRx * 1.5);
            const dyFace = (ny - faceCy) / (faceRy * 1.5);
            const dxBody = (nx - faceCx) / (faceRx * 2.1);
            const dyBody = (ny - (faceCy + faceRy * 1.9)) / (faceRy * 2.2);
            if (dxFace * dxFace + dyFace * dyFace < 1.0 || dxBody * dxBody + dyBody * dyBody < 0.85) continue;

            const idx = (y * sw + x) * 4;
            const r = d[idx], g = d[idx + 1], b = d[idx + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            if (lum > 188) {
                const idxL = (y * sw + (x - step)) * 4;
                const idxR = (y * sw + (x + step)) * 4;
                const lumNeighbor = 0.299 * (d[idxL] + d[idxR]) * 0.5 + 0.587 * (d[idxL + 1] + d[idxR + 1]) * 0.5 + 0.114 * (d[idxL + 2] + d[idxR + 2]) * 0.5;
                const contrast = lum - lumNeighbor;
                if (lum > 220 || contrast > 16) {
                    highlights.push({
                        nx,
                        ny,
                        score: lum + contrast * 1.4,
                        r: Math.min(255, r + 24),
                        g: Math.min(255, g + 20),
                        b: Math.min(255, b + 16),
                        radiusFactor: 0.026 + ((x * 13 + y * 7) % 10) * 0.0032
                    });
                }
            }
        }
    }
    highlights.sort((a, b) => b.score - a.score);
    c.width = 0;
    c.height = 0;

    return {
        faceCx,
        faceCy,
        faceRx,
        faceRy,
        meanSkinCr,
        meanSkinCb,
        clothR,
        clothG,
        clothB,
        clothCr,
        clothCb,
        clothValid,
        armClusters,
        lipCx,
        lipCy,
        lipRx,
        lipRy,
        highlights: highlights.slice(0, 26)
    };
}

// Tính toán Khung Bao Khuôn Mặt (Face ROI) & Khung Bao Đôi Môi (Lip ROI) ở ĐỘ PHÂN GIẢI GỐC 1:1
// giúp dù người dùng phóng zoom 3x - 5x vào khuôn mặt nhỏ trong ảnh tập thể thì Da và Môi vẫn sắc nét 100%!
function computeFaceAndLipROIs() {
    const srcImg = beautyEngineState.srcImg;
    if (!srcImg) return;
    const natW = srcImg.naturalWidth || srcImg.width || beautyEngineState.workW || 1024;
    const natH = srcImg.naturalHeight || srcImg.height || beautyEngineState.workH || 1526;
    const faces = beautyEngineState.detectedFaces;
    const info = beautyEngineState.heuristicInfo;

    let fMinX = 1, fMaxX = 0, fMinY = 1, fMaxY = 0;
    let lMinX = 1, lMaxX = 0, lMinY = 1, lMaxY = 0;

    if (faces && faces.length > 0) {
        faces.forEach(landmarks => {
            MP_FACE_OVAL_INDICES.forEach(idx => {
                const pt = landmarks[idx];
                if (!pt) return;
                if (pt.x < fMinX) fMinX = pt.x;
                if (pt.x > fMaxX) fMaxX = pt.x;
                if (pt.y < fMinY) fMinY = pt.y;
                if (pt.y > fMaxY) fMaxY = pt.y;
            });
            MP_OUTER_LIP_INDICES.forEach(idx => {
                const pt = landmarks[idx];
                if (!pt) return;
                if (pt.x < lMinX) lMinX = pt.x;
                if (pt.x > lMaxX) lMaxX = pt.x;
                if (pt.y < lMinY) lMinY = pt.y;
                if (pt.y > lMaxY) lMaxY = pt.y;
            });
        });
        const fPadX = Math.max(0.06, (fMaxX - fMinX) * 0.45);
        const fPadTop = Math.max(0.06, (fMaxY - fMinY) * 0.45);
        const fPadBot = Math.max(0.08, (fMaxY - fMinY) * 0.85); // Bao gồm cả vùng cổ dưới cằm
        fMinX = Math.max(0, fMinX - fPadX);
        fMaxX = Math.min(1, fMaxX + fPadX);
        fMinY = Math.max(0, fMinY - fPadTop);
        fMaxY = Math.min(1, fMaxY + fPadBot);

        const lPadX = Math.max(0.018, (lMaxX - lMinX) * 0.38);
        const lPadY = Math.max(0.018, (lMaxY - lMinY) * 0.52);
        lMinX = Math.max(0, lMinX - lPadX);
        lMaxX = Math.min(1, lMaxX + lPadX);
        lMinY = Math.max(0, lMinY - lPadY);
        lMaxY = Math.min(1, lMaxY + lPadY);
    } else if (info) {
        fMinX = Math.max(0, info.faceCx - info.faceRx * 1.65);
        fMaxX = Math.min(1, info.faceCx + info.faceRx * 1.65);
        fMinY = Math.max(0, info.faceCy - info.faceRy * 1.55);
        fMaxY = Math.min(1, info.faceCy + info.faceRy * 2.15);

        lMinX = Math.max(0, info.lipCx - info.lipRx * 1.65);
        lMaxX = Math.min(1, info.lipCx + info.lipRx * 1.65);
        lMinY = Math.max(0, info.lipCy - info.lipRy * 1.85);
        lMaxY = Math.min(1, info.lipCy + info.lipRy * 1.85);
    } else {
        fMinX = 0.15; fMaxX = 0.85; fMinY = 0.10; fMaxY = 0.80;
        lMinX = 0.32; lMaxX = 0.68; lMinY = 0.36; lMaxY = 0.62;
    }

    const fNw = Math.max(0.08, fMaxX - fMinX);
    const fNh = Math.max(0.08, fMaxY - fMinY);
    const fRawW = Math.round(fNw * natW);
    const fRawH = Math.round(fNh * natH);
    const fScale = Math.min(1, 960 / Math.max(1, fRawW, fRawH));
    beautyEngineState.faceRoi = {
        nx: fMinX,
        ny: fMinY,
        nw: fNw,
        nh: fNh,
        w: Math.max(64, Math.round(fRawW * fScale)),
        h: Math.max(64, Math.round(fRawH * fScale))
    };

    const lNw = Math.max(0.04, lMaxX - lMinX);
    const lNh = Math.max(0.03, lMaxY - lMinY);
    const lRawW = Math.round(lNw * natW);
    const lRawH = Math.round(lNh * natH);
    const lScale = Math.min(1, 640 / Math.max(1, lRawW, lRawH));
    beautyEngineState.lipRoi = {
        nx: lMinX,
        ny: lMinY,
        nw: lNw,
        nh: lNh,
        w: Math.max(48, Math.round(lRawW * lScale)),
        h: Math.max(32, Math.round(lRawH * lScale))
    };
}

function traceLandmarkPolygon(ctx, landmarks, indices, W, H, roi = null) {
    if (!landmarks || !indices || indices.length === 0) return;
    const rx = roi ? roi.nx : 0;
    const ry = roi ? roi.ny : 0;
    const rw = roi ? roi.nw : 1;
    const rh = roi ? roi.nh : 1;
    for (let i = 0; i < indices.length; i++) {
        const pt = landmarks[indices[i]];
        if (!pt) continue;
        const x = ((pt.x - rx) / rw) * W;
        const y = ((pt.y - ry) / rh) * H;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
}

// Dựng Mặt nạ Bảo vệ Chủ thể Toàn thân + Cánh tay dang rộng + Bàn tay + Tóc (Subject Protection Mask)
// Kết hợp 3 lớp: (1) AI Selfie Segmenter toàn thân + (2) Nhận diện da & tay áo thích ứng trên toàn chiều ngang ảnh + (3) Cầu nối giải phẫu Vai - Cánh tay
function buildSubjectProtectionMask(W, H) {
    const baseCv = beautyEngineState.baseCanvas;
    if (!baseCv || W <= 0 || H <= 0) return null;

    if (!beautyEngineState.subjectMaskCanvas) {
        beautyEngineState.subjectMaskCanvas = document.createElement('canvas');
    }
    const maskCv = beautyEngineState.subjectMaskCanvas;
    maskCv.width = W;
    maskCv.height = H;
    const mCtx = maskCv.getContext('2d');
    mCtx.clearRect(0, 0, W, H);

    const info = beautyEngineState.heuristicInfo;
    const faces = beautyEngineState.detectedFaces;

    // LỚP 1: Quét lưới nhanh (160x240) kết hợp AI Selfie Segmenter (nếu đã sẵn sàng) + Bảo vệ toàn bộ vùng Da (cánh tay trần, bàn tay, ngón tay dang rộng) & Tay áo
    const segW = Math.min(220, Math.max(120, Math.round(W * 0.28)));
    const segH = Math.min(300, Math.max(120, Math.round(H * 0.28)));
    const smallCv = document.createElement('canvas');
    smallCv.width = segW;
    smallCv.height = segH;
    const sCtx = smallCv.getContext('2d', { willReadFrequently: true });
    sCtx.drawImage(baseCv, 0, 0, segW, segH);
    const imgData = sCtx.getImageData(0, 0, segW, segH);
    const d = imgData.data;

    const pmFloat = beautyEngineState.personMaskFloat;
    const pmW = beautyEngineState.personMaskW;
    const pmH = beautyEngineState.personMaskH;
    const hasNeuralSeg = Boolean(pmFloat && pmW > 0 && pmH > 0);

    const meanCr = info ? info.meanSkinCr : 151;
    const meanCb = info ? info.meanSkinCb : 104;
    const clothValid = info ? info.clothValid : false;
    const clothCr = info ? info.clothCr : 128;
    const clothCb = info ? info.clothCb : 128;
    const clothR = info ? info.clothR : 128;
    const clothG = info ? info.clothG : 128;
    const clothB = info ? info.clothB : 128;
    const faceCy = info ? info.faceCy : 0.35;
    const faceRy = info ? info.faceRy : 0.18;

    for (let y = 0; y < segH; y++) {
        const ny = y / segH;
        for (let x = 0; x < segW; x++) {
            const nx = x / segW;
            const idx = (y * segW + x) * 4;
            const r = d[idx], g = d[idx + 1], b = d[idx + 2];

            let alpha = 0;

            // 1A. Điểm tin cậy từ mạng nơ-ron MediaPipe Selfie Segmenter (nhận diện chính xác cả người, tóc, quần áo và cánh tay dang rộng)
            if (hasNeuralSeg) {
                const sx = Math.min(pmW - 1, Math.floor(nx * pmW));
                const sy = Math.min(pmH - 1, Math.floor(ny * pmH));
                const conf = pmFloat[sy * pmW + sx] || 0;
                // Ngưỡng bảo vệ nhạy (bắt đầu từ 0.15) để giữ trọn vẹn cánh tay, cổ tay và ngón tay đưa ra xa ở mép ảnh
                if (conf > 0.15) {
                    const neuralA = Math.min(1, (conf - 0.15) / 0.33);
                    alpha = Math.max(alpha, Math.round(neuralA * 255));
                }
            }

            // 1B. Bảo vệ tuyệt đối mọi điểm ảnh mang sắc độ Da người (Cánh tay, Bàn tay, Ngón tay dang rộng ra biên trái/phải)
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            if (r > 70 && g > 32 && b > 15 && r > g && r > b && (maxC - minC) > 10 && ny >= faceCy - faceRy * 1.6) {
                const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
                const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
                if (cr >= 130 && cr <= 182 && cb >= 74 && cb <= 134) {
                    const distSkin = Math.hypot(cr - meanCr, cb - meanCb);
                    if (distSkin < 22) {
                        const skinA = Math.min(1, 1 - Math.max(0, distSkin - 11) / 11);
                        alpha = Math.max(alpha, Math.round(skinA * 255));
                    }
                }
            }

            // 1C. Bảo vệ vùng Tay áo / Trang phục đồng màu với thân áo kéo dài sang hai bên
            if (clothValid && ny >= faceCy + faceRy * 0.45 && alpha < 240) {
                const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
                const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
                const chromaDist = Math.hypot(cr - clothCr, cb - clothCb);
                const rgbDist = (Math.abs(r - clothR) + Math.abs(g - clothG) + Math.abs(b - clothB)) / 3;
                if (chromaDist < 12 && rgbDist < 34) {
                    const clothA = Math.min(1, (1 - chromaDist / 12) * (1 - rgbDist / 34));
                    alpha = Math.max(alpha, Math.round(clothA * 235));
                }
            }

            d[idx] = 0;
            d[idx + 1] = 0;
            d[idx + 2] = 0;
            d[idx + 3] = alpha;
        }
    }
    sCtx.putImageData(imgData, 0, 0);

    // Phóng mượt mặt nạ phân đoạn kết hợp làm mịn biên quang học
    mCtx.save();
    mCtx.imageSmoothingEnabled = true;
    mCtx.imageSmoothingQuality = 'high';
    mCtx.filter = `blur(${Math.max(3.5, Math.min(W, H) * 0.0065).toFixed(1)}px)`;
    mCtx.drawImage(smallCv, 0, 0, W, H);

    // LỚP 2: Vẽ Cầu nối Giải phẫu Vai -> Cánh tay -> Bàn tay (Anatomical Arm Bridge)
    // Đảm bảo nếu người dùng mặc áo dài tay / tay áo hoa văn và dang rộng cánh tay, toàn bộ ống tay nối từ vai ra bàn tay không bao giờ bị xóa phông!
    if (info && info.armClusters && info.armClusters.length > 0) {
        mCtx.lineCap = 'round';
        mCtx.lineJoin = 'round';
        mCtx.strokeStyle = 'rgba(0, 0, 0, 0.96)';
        const armWidth = Math.max(W * 0.09, info.faceRx * W * 0.92);
        mCtx.lineWidth = armWidth;
        info.armClusters.forEach(cl => {
            mCtx.beginPath();
            mCtx.moveTo(cl.sx * W, cl.sy * H);
            // Điểm uốn khuỷu tay nhẹ tự nhiên
            const midX = (cl.sx + cl.hx) * 0.5 * W;
            const midY = ((cl.sy + cl.hy) * 0.5 + 0.03) * H;
            mCtx.quadraticCurveTo(midX, midY, cl.hx * W, cl.hy * H);
            mCtx.stroke();
        });
    }

    // LỚP 3: Khung lõi Đầu, Mái tóc, Cổ & Bờ vai (Chỉ dựng khung lõi đầy đặn khi chưa có Neural Segmenter, hoặc khóa cứng vùng mặt & tóc 100%)
    const drawSubjectCore = (cx, cy, rx, ry, fullBodyFallback) => {
        const headGrad = mCtx.createRadialGradient(cx, cy - ry * 0.08, Math.min(rx, ry) * 0.78, cx, cy - ry * 0.08, Math.max(rx, ry) * (fullBodyFallback ? 1.68 : 1.32));
        headGrad.addColorStop(0, 'rgba(0,0,0,1)');
        headGrad.addColorStop(0.65, 'rgba(0,0,0,0.98)');
        headGrad.addColorStop(1, 'rgba(0,0,0,0)');
        mCtx.fillStyle = headGrad;
        mCtx.beginPath();
        mCtx.arc(cx, cy - ry * 0.08, Math.max(rx, ry) * (fullBodyFallback ? 1.68 : 1.32), 0, Math.PI * 2);
        mCtx.fill();

        if (fullBodyFallback) {
            const bodyCy = cy + ry * 2.15;
            const bodyRx = rx * 2.35;
            const bodyRy = ry * 2.75;
            mCtx.save();
            mCtx.translate(cx, bodyCy);
            mCtx.scale(1, bodyRy / Math.max(1, bodyRx));
            const bodyGrad = mCtx.createRadialGradient(0, 0, bodyRx * 0.52, 0, 0, bodyRx * 1.18);
            bodyGrad.addColorStop(0, 'rgba(0,0,0,1)');
            bodyGrad.addColorStop(0.66, 'rgba(0,0,0,0.95)');
            bodyGrad.addColorStop(0.88, 'rgba(0,0,0,0.42)');
            bodyGrad.addColorStop(1, 'rgba(0,0,0,0)');
            mCtx.fillStyle = bodyGrad;
            mCtx.beginPath();
            mCtx.arc(0, 0, bodyRx * 1.18, 0, Math.PI * 2);
            mCtx.fill();
            mCtx.restore();
        }
    };

    if (faces && faces.length > 0) {
        faces.forEach(landmarks => {
            let minX = 1, maxX = 0, minY = 1, maxY = 0;
            MP_FACE_OVAL_INDICES.forEach(idx => {
                const pt = landmarks[idx];
                if (!pt) return;
                if (pt.x < minX) minX = pt.x;
                if (pt.x > maxX) maxX = pt.x;
                if (pt.y < minY) minY = pt.y;
                if (pt.y > maxY) maxY = pt.y;
            });
            const cx = ((minX + maxX) * 0.5) * W;
            const cy = ((minY + maxY) * 0.5) * H;
            const rx = Math.max(W * 0.10, ((maxX - minX) * 0.5) * W);
            const ry = Math.max(H * 0.10, ((maxY - minY) * 0.5) * H);
            drawSubjectCore(cx, cy, rx, ry, !hasNeuralSeg);
        });
    } else if (info) {
        drawSubjectCore(info.faceCx * W, info.faceCy * H, info.faceRx * W, info.faceRy * H, !hasNeuralSeg);
    }

    mCtx.restore();
    smallCv.width = 0;
    smallCv.height = 0;
    return maskCv;
}

// Dựng lớp Xóa phông ống kính khẩu lớn f/1.4 (Chủ thể + cánh tay có alpha = 0 trong suốt tuyệt đối để nhìn xuyên thẳng xuống ảnh gốc 100% độ nét!)
function buildBokehLayer() {
    const W = beautyEngineState.workW;
    const H = beautyEngineState.workH;
    const baseCv = beautyEngineState.baseCanvas;
    if (!baseCv || W <= 0 || H <= 0) return;

    if (!beautyEngineState.bokehLayerCanvas) {
        beautyEngineState.bokehLayerCanvas = document.createElement('canvas');
    }
    const bokehCv = beautyEngineState.bokehLayerCanvas;
    bokehCv.width = W;
    bokehCv.height = H;
    const bCtx = bokehCv.getContext('2d');
    bCtx.clearRect(0, 0, W, H);

    // 1. Tạo ảnh nền mờ ống kính tiêu cự lớn thông qua hạ mẫu + Gaussian blur mượt
    const smallW = Math.max(64, Math.round(W * 0.28));
    const smallH = Math.max(64, Math.round(H * 0.28));
    const smallCv = document.createElement('canvas');
    smallCv.width = smallW;
    smallCv.height = smallH;
    const sCtx = smallCv.getContext('2d');
    sCtx.imageSmoothingEnabled = true;
    sCtx.imageSmoothingQuality = 'high';
    sCtx.filter = 'blur(5.5px) saturate(1.14) contrast(1.03)';
    sCtx.drawImage(baseCv, -6, -6, smallW + 12, smallH + 12);
    sCtx.filter = 'none';

    bCtx.save();
    bCtx.imageSmoothingEnabled = true;
    bCtx.imageSmoothingQuality = 'high';
    bCtx.drawImage(smallCv, 0, 0, W, H);
    smallCv.width = 0;
    smallCv.height = 0;

    // 2. Vẽ các đĩa sáng Bokeh quang học khẩu lớn (Optical Specular Bokeh Highlights) ở hậu cảnh
    const info = beautyEngineState.heuristicInfo;
    if (info && info.highlights && info.highlights.length > 0) {
        const bokehSprite = getOpticalApertureBokehSprite();
        const minDim = Math.min(W, H);
        bCtx.globalCompositeOperation = 'screen';
        for (let i = 0; i < info.highlights.length; i++) {
            const hl = info.highlights[i];
            const rad = minDim * hl.radiusFactor;
            const cx = hl.nx * W;
            const cy = hl.ny * H;
            bCtx.globalAlpha = 0.28 + Math.min(0.28, (hl.score - 190) / 220);
            bCtx.drawImage(bokehSprite, cx - rad, cy - rad, rad * 2, rad * 2);
        }
        bCtx.globalCompositeOperation = 'source-over';
        bCtx.globalAlpha = 1;
    }

    // 3. Khoét trong suốt (destination-out) toàn bộ Chủ thể + Cánh tay dang rộng + Bàn tay + Tóc
    // để ảnh gốc độ phân giải 100% bên dưới hiển thị sắc nét tuyệt đối không mất 1 pixel nào!
    const subjectMaskCv = buildSubjectProtectionMask(W, H);
    if (subjectMaskCv) {
        bCtx.globalCompositeOperation = 'destination-out';
        bCtx.drawImage(subjectMaskCv, 0, 0);
    }
    bCtx.restore();
}

// Dựng lớp Mịn da & Sáng hồng chọn lọc trên KHUNG BAO KHUÔN MẶT ĐỘ PHÂN GIẢI GỐC (High-Res Face ROI)
// Không hạ độ phân giải toàn ảnh, giữ nguyên 100% độ sắc nét của mắt, lông mi, chân mày, sống mũi, môi & tóc ngay cả khi zoom 4x!
function buildSkinRetouchLayer() {
    const srcImg = beautyEngineState.srcImg;
    if (!srcImg) return;
    if (!beautyEngineState.faceRoi) computeFaceAndLipROIs();
    const roi = beautyEngineState.faceRoi;
    if (!roi || roi.w <= 0 || roi.h <= 0) return;

    const natW = srcImg.naturalWidth || srcImg.width || beautyEngineState.workW;
    const natH = srcImg.naturalHeight || srcImg.height || beautyEngineState.workH;
    const W = roi.w;
    const H = roi.h;

    if (!beautyEngineState.skinRetouchLayerCanvas) {
        beautyEngineState.skinRetouchLayerCanvas = document.createElement('canvas');
    }
    const skinCv = beautyEngineState.skinRetouchLayerCanvas;
    skinCv.width = W;
    skinCv.height = H;
    const sCtx = skinCv.getContext('2d');
    sCtx.clearRect(0, 0, W, H);

    // 1. Trích xuất trực tiếp vùng Khuôn mặt từ ảnh gốc độ phân giải đầy đủ (natW x natH)
    const sx = Math.max(0, Math.round(roi.nx * natW));
    const sy = Math.max(0, Math.round(roi.ny * natH));
    const sw = Math.min(natW - sx, Math.round(roi.nw * natW));
    const sh = Math.min(natH - sy, Math.round(roi.nh * natH));
    if (sw <= 4 || sh <= 4) return;

    sCtx.save();
    sCtx.imageSmoothingEnabled = true;
    sCtx.imageSmoothingQuality = 'high';
    // Làm mịn lỗ chân lông siêu vi ở đúng độ phân giải HD của khuôn mặt (không thu nhỏ 0.36x gây bệt mờ như trước)
    const poreBlurPx = Math.max(1.4, Math.min(2.8, Math.min(W, H) * 0.0038));
    sCtx.filter = `blur(${poreBlurPx.toFixed(1)}px) brightness(1.045) contrast(0.98) saturate(1.04)`;
    sCtx.drawImage(srcImg, sx, sy, sw, sh, 0, 0, W, H);
    sCtx.filter = 'none';

    // Phủ một lớp phấn hồng đào mỏng nhẹ (Rosy Porcelain Glow)
    sCtx.globalCompositeOperation = 'soft-light';
    sCtx.fillStyle = 'rgba(255, 214, 226, 0.25)';
    sCtx.fillRect(0, 0, W, H);
    sCtx.globalCompositeOperation = 'source-over';

    // 2. Tạo mặt nạ da chọn lọc bảo toàn chi tiết biên cao tần (Edge-Preserving Skin Mask)
    const maskW = Math.max(80, Math.min(240, Math.round(W * 0.45)));
    const maskH = Math.max(80, Math.min(240, Math.round(H * 0.45)));
    const tmpCv = document.createElement('canvas');
    tmpCv.width = maskW;
    tmpCv.height = maskH;
    const tCtx = tmpCv.getContext('2d', { willReadFrequently: true });
    tCtx.drawImage(srcImg, sx, sy, sw, sh, 0, 0, maskW, maskH);
    const imgData = tCtx.getImageData(0, 0, maskW, maskH);
    const d = imgData.data;

    const info = beautyEngineState.heuristicInfo;
    const meanCr = info ? info.meanSkinCr : 151;
    const meanCb = info ? info.meanSkinCb : 104;

    for (let y = 1; y < maskH - 1; y++) {
        for (let x = 1; x < maskW - 1; x++) {
            const idx = (y * maskW + x) * 4;
            const r = d[idx], g = d[idx + 1], b = d[idx + 2];
            let alpha = 0;

            if (r > 75 && g > 35 && b > 18 && r > g && r > b) {
                const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
                const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
                if (cr >= 130 && cr <= 180 && cb >= 74 && cb <= 133) {
                    const distCr = Math.abs(cr - meanCr) / 24;
                    const distCb = Math.abs(cb - meanCb) / 26;
                    const chromaScore = Math.max(0, 1 - Math.max(distCr, distCb));

                    // Bảo toàn tuyệt đối độ sắc nét của lông mi, chân mày, sống mũi, viền hàm, tóc
                    const idxR = idx + 4;
                    const idxD = idx + maskW * 4;
                    const edgeDiff = (Math.abs(r - d[idxR]) + Math.abs(g - d[idxR + 1]) + Math.abs(r - d[idxD]) + Math.abs(g - d[idxD + 1])) * 0.25;
                    const edgeKeep = Math.max(0, Math.min(1, 1 - (edgeDiff - 7) / 20));
                    alpha = Math.round(chromaScore * edgeKeep * 255);
                }
            }
            d[idx] = 0;
            d[idx + 1] = 0;
            d[idx + 2] = 0;
            d[idx + 3] = alpha;
        }
    }
    tCtx.putImageData(imgData, 0, 0);

    // Làm mềm biên mặt nạ da và khoét bỏ 100% vùng Mắt, Chân mày, Môi trên hệ tọa độ Face ROI
    const fullMaskCv = document.createElement('canvas');
    fullMaskCv.width = W;
    fullMaskCv.height = H;
    const fmCtx = fullMaskCv.getContext('2d');
    fmCtx.filter = 'blur(3.5px)';
    fmCtx.drawImage(tmpCv, 0, 0, W, H);
    fmCtx.filter = 'none';

    const faces = beautyEngineState.detectedFaces;
    if (faces && faces.length > 0) {
        fmCtx.save();
        fmCtx.globalCompositeOperation = 'destination-out';
        fmCtx.filter = 'blur(2.5px)';
        fmCtx.fillStyle = '#000';
        faces.forEach(landmarks => {
            fmCtx.beginPath();
            traceLandmarkPolygon(fmCtx, landmarks, MP_LEFT_EYE_INDICES, W, H, roi);
            traceLandmarkPolygon(fmCtx, landmarks, MP_RIGHT_EYE_INDICES, W, H, roi);
            traceLandmarkPolygon(fmCtx, landmarks, MP_LEFT_BROW_INDICES, W, H, roi);
            traceLandmarkPolygon(fmCtx, landmarks, MP_RIGHT_BROW_INDICES, W, H, roi);
            traceLandmarkPolygon(fmCtx, landmarks, MP_OUTER_LIP_INDICES, W, H, roi);
            fmCtx.fill();
        });
        fmCtx.restore();
    }

    sCtx.globalCompositeOperation = 'destination-in';
    sCtx.drawImage(fullMaskCv, 0, 0);
    sCtx.restore();

    tmpCv.width = 0;
    tmpCv.height = 0;
    fullMaskCv.width = 0;
    fullMaskCv.height = 0;
}

// Dựng mặt nạ Môi (Lip Alpha Mask) trên KHUNG BAO ĐÔI MÔI ĐỘ PHÂN GIẢI GỐC 1:1 (Lip ROI)
function buildLipMasks() {
    const srcImg = beautyEngineState.srcImg;
    if (!srcImg) return;
    if (!beautyEngineState.lipRoi) computeFaceAndLipROIs();
    const roi = beautyEngineState.lipRoi;
    if (!roi || roi.w <= 0 || roi.h <= 0) return;

    const W = roi.w;
    const H = roi.h;

    if (!beautyEngineState.lipMaskCanvas) {
        beautyEngineState.lipMaskCanvas = document.createElement('canvas');
    }
    if (!beautyEngineState.lipHighlightMaskCanvas) {
        beautyEngineState.lipHighlightMaskCanvas = document.createElement('canvas');
    }
    const maskCv = beautyEngineState.lipMaskCanvas;
    const glossCv = beautyEngineState.lipHighlightMaskCanvas;
    maskCv.width = W;
    maskCv.height = H;
    glossCv.width = W;
    glossCv.height = H;

    const mCtx = maskCv.getContext('2d');
    const gCtx = glossCv.getContext('2d');
    mCtx.clearRect(0, 0, W, H);
    gCtx.clearRect(0, 0, W, H);

    const faces = beautyEngineState.detectedFaces;
    const featherPx = Math.max(1.5, Math.min(4.5, Math.min(W, H) * 0.022));

    if (faces && faces.length > 0) {
        mCtx.save();
        mCtx.filter = `blur(${featherPx.toFixed(1)}px)`;
        mCtx.fillStyle = '#ffffff';
        faces.forEach(landmarks => {
            mCtx.beginPath();
            traceLandmarkPolygon(mCtx, landmarks, MP_OUTER_LIP_INDICES, W, H, roi);
            traceLandmarkPolygon(mCtx, landmarks, MP_INNER_LIP_INDICES, W, H, roi);
            mCtx.fill('evenodd');
        });
        mCtx.restore();

        // Lớp ánh bóng satin nhẹ ở lòng môi dưới
        gCtx.save();
        gCtx.filter = `blur(${(featherPx * 1.6).toFixed(1)}px)`;
        gCtx.fillStyle = 'rgba(255, 245, 248, 0.55)';
        faces.forEach(landmarks => {
            gCtx.beginPath();
            traceLandmarkPolygon(gCtx, landmarks, MP_LOWER_LIP_GLOSS_INDICES, W, H, roi);
            gCtx.fill();
        });
        gCtx.restore();
    } else if (beautyEngineState.heuristicInfo) {
        const natW = srcImg.naturalWidth || srcImg.width || beautyEngineState.workW;
        const natH = srcImg.naturalHeight || srcImg.height || beautyEngineState.workH;
        const sx = Math.max(0, Math.round(roi.nx * natW));
        const sy = Math.max(0, Math.round(roi.ny * natH));
        const sw = Math.min(natW - sx, Math.round(roi.nw * natW));
        const sh = Math.min(natH - sy, Math.round(roi.nh * natH));

        if (sw > 4 && sh > 4) {
            const subCv = document.createElement('canvas');
            subCv.width = W;
            subCv.height = H;
            const subCtx = subCv.getContext('2d', { willReadFrequently: true });
            subCtx.drawImage(srcImg, sx, sy, sw, sh, 0, 0, W, H);
            const imgD = subCtx.getImageData(0, 0, W, H);
            const d = imgD.data;

            const cx = W * 0.5;
            const cy = H * 0.5;
            const rx = W * 0.38;
            const ry = H * 0.34;

            for (let y = 0; y < H; y++) {
                const dy = (y - cy) / ry;
                for (let x = 0; x < W; x++) {
                    const dx = (x - cx) / rx;
                    const radial = 1 - Math.sqrt(dx * dx + dy * dy);
                    const idx = (y * W + x) * 4;
                    let a = 0;
                    if (radial > 0) {
                        const r = d[idx], g = d[idx + 1], b = d[idx + 2];
                        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                        const redness = r - g * 0.72 - b * 0.28;
                        if (lum > 45 && lum < 215 && redness > 26) {
                            const redFactor = Math.min(1, (redness - 24) / 34);
                            a = Math.round(Math.min(1, radial * 1.35) * redFactor * 235);
                        }
                    }
                    d[idx] = 255;
                    d[idx + 1] = 255;
                    d[idx + 2] = 255;
                    d[idx + 3] = a;
                }
            }
            subCtx.putImageData(imgD, 0, 0);
            mCtx.save();
            mCtx.filter = `blur(${featherPx.toFixed(1)}px)`;
            mCtx.drawImage(subCv, 0, 0);
            mCtx.restore();
            subCv.width = 0;
            subCv.height = 0;
        }
    }
    beautyEngineState.builtLipShade = 'none';
}

// Kết xuất lớp màu son theo mã màu đã chọn trực tiếp từ vùng Môi độ phân giải gốc 1:1 (Lip ROI) (<0.4ms)
function rebuildLipShadeLayer(shadeKey = currentLipShade) {
    const srcImg = beautyEngineState.srcImg;
    const roi = beautyEngineState.lipRoi;
    const maskCv = beautyEngineState.lipMaskCanvas;
    if (!srcImg || !roi || !maskCv || roi.w <= 0 || roi.h <= 0) return;

    const cfg = LIP_SHADES_CONFIG[shadeKey] || LIP_SHADES_CONFIG.none;
    if (!cfg.rgb || shadeKey === 'none') {
        beautyEngineState.builtLipShade = 'none';
        return;
    }

    const W = roi.w;
    const H = roi.h;
    const natW = srcImg.naturalWidth || srcImg.width || beautyEngineState.workW;
    const natH = srcImg.naturalHeight || srcImg.height || beautyEngineState.workH;
    const sx = Math.max(0, Math.round(roi.nx * natW));
    const sy = Math.max(0, Math.round(roi.ny * natH));
    const sw = Math.min(natW - sx, Math.round(roi.nw * natW));
    const sh = Math.min(natH - sy, Math.round(roi.nh * natH));
    if (sw <= 2 || sh <= 2) return;

    if (!beautyEngineState.lipLayerCanvas) {
        beautyEngineState.lipLayerCanvas = document.createElement('canvas');
    }
    const lipCv = beautyEngineState.lipLayerCanvas;
    if (lipCv.width !== W || lipCv.height !== H) {
        lipCv.width = W;
        lipCv.height = H;
    }
    const lCtx = lipCv.getContext('2d');
    lCtx.clearRect(0, 0, W, H);

    lCtx.save();
    lCtx.imageSmoothingEnabled = true;
    lCtx.imageSmoothingQuality = 'high';
    // Lấy mẫu vân môi trực tiếp từ ảnh gốc độ phân giải 1:1 để khi zoom cận cảnh môi vẫn nét căng
    lCtx.drawImage(srcImg, sx, sy, sw, sh, 0, 0, W, H);

    // Lớp 1: Multiply giúp màu son thấm sâu vào sắc môi thật và giữ nguyên nếp vân môi
    lCtx.globalCompositeOperation = 'multiply';
    lCtx.globalAlpha = cfg.mulAlpha;
    lCtx.fillStyle = `rgb(${cfg.rgb[0]}, ${cfg.rgb[1]}, ${cfg.rgb[2]})`;
    lCtx.fillRect(0, 0, W, H);

    // Lớp 2: Soft-Light tạo sắc son tươi tắn, căng mọng tự nhiên
    lCtx.globalCompositeOperation = 'soft-light';
    lCtx.globalAlpha = cfg.softAlpha;
    lCtx.fillStyle = `rgb(${cfg.softRgb[0]}, ${cfg.softRgb[1]}, ${cfg.softRgb[2]})`;
    lCtx.fillRect(0, 0, W, H);

    // Lớp 3: Ánh bóng lụa satin nhẹ ở lòng môi dưới
    if (beautyEngineState.lipHighlightMaskCanvas) {
        lCtx.globalCompositeOperation = 'screen';
        lCtx.globalAlpha = 0.24;
        lCtx.drawImage(beautyEngineState.lipHighlightMaskCanvas, 0, 0, W, H);
    }

    // Cắt chính xác theo mặt nạ môi đã làm mềm biên
    lCtx.globalCompositeOperation = 'destination-in';
    lCtx.globalAlpha = 1;
    lCtx.drawImage(maskCv, 0, 0, W, H);
    lCtx.restore();

    beautyEngineState.builtLipShade = shadeKey;
}

// Đảm bảo các lớp tiền kết xuất đã sẵn sàng (gọi đồng bộ nếu người dùng kéo thanh trượt ngay lập tức)
function ensureBeautyLayersReadySync() {
    if (beautyEngineState.layersReady && beautyEngineState.baseCanvas) {
        if (currentLipShade !== 'none' && beautyEngineState.builtLipShade !== currentLipShade) {
            rebuildLipShadeLayer(currentLipShade);
        }
        return true;
    }
    const srcImg = beautyEngineState.srcImg || (cropperObj && cropperObj.image) || document.getElementById('cropper-image');
    if (!srcImg) return false;
    const natW = srcImg.naturalWidth || srcImg.width || 0;
    const natH = srcImg.naturalHeight || srcImg.height || 0;
    if (natW <= 0 || natH <= 0) return false;

    const prof = window.DevicePerfGovernor ? window.DevicePerfGovernor.getProfile() : null;
    const maxWorkDim = prof ? (prof.qualityTier >= 2 ? 960 : (prof.tier === 1 ? 820 : 680)) : 900;
    const scale = Math.min(1, maxWorkDim / Math.max(natW, natH));
    const W = Math.max(64, Math.round(natW * scale));
    const H = Math.max(64, Math.round(natH * scale));

    beautyEngineState.srcImg = srcImg;
    beautyEngineState.workW = W;
    beautyEngineState.workH = H;

    if (!beautyEngineState.baseCanvas) {
        beautyEngineState.baseCanvas = document.createElement('canvas');
    }
    beautyEngineState.baseCanvas.width = W;
    beautyEngineState.baseCanvas.height = H;
    const baseCtx = beautyEngineState.baseCanvas.getContext('2d');
    baseCtx.imageSmoothingEnabled = true;
    baseCtx.imageSmoothingQuality = 'high';
    baseCtx.drawImage(srcImg, 0, 0, W, H);

    if (!beautyEngineState.heuristicInfo) {
        beautyEngineState.heuristicInfo = analyzePhotoHeuristicsFast(beautyEngineState.baseCanvas);
    }
    computeFaceAndLipROIs();
    buildBokehLayer();
    buildSkinRetouchLayer();
    buildLipMasks();
    if (currentLipShade && currentLipShade !== 'none') {
        rebuildLipShadeLayer(currentLipShade);
    }
    beautyEngineState.layersReady = true;
    return true;
}

// Trích xuất mặt nạ người toàn thân (bao gồm cả cánh tay dang rộng) từ kết quả MediaPipe ImageSegmenter
function extractPersonForegroundFloatMask(segResult, info) {
    if (!segResult || !segResult.confidenceMasks || segResult.confidenceMasks.length === 0) return null;
    const masks = segResult.confidenceMasks;
    let chosenIdx = masks.length > 1 ? 1 : 0;
    const m0 = masks[chosenIdx];
    if (!m0 || typeof m0.getAsFloat32Array !== 'function') {
        masks.forEach(m => { try { if (m && typeof m.close === 'function') m.close(); } catch (_) {} });
        return null;
    }

    const mw = m0.width || 0;
    const mh = m0.height || 0;
    if (mw <= 0 || mh <= 0) {
        masks.forEach(m => { try { if (m && typeof m.close === 'function') m.close(); } catch (_) {} });
        return null;
    }

    const rawArr = m0.getAsFloat32Array();
    const copyArr = new Float32Array(rawArr.length);
    copyArr.set(rawArr);

    // Kiểm tra tự động xem kênh mask đang là Chủ thể (1.0 ở giữa mặt) hay Nền (1.0 ở 2 góc trên) để không bao giờ bị ngược mask
    const fcx = Math.max(0, Math.min(mw - 1, Math.floor((info ? info.faceCx : 0.5) * mw)));
    const fcy = Math.max(0, Math.min(mh - 1, Math.floor((info ? info.faceCy : 0.38) * mh)));
    const centerVal = copyArr[fcy * mw + fcx] || 0;
    const cornerVal = ((copyArr[2] || 0) + (copyArr[mw - 3] || 0)) * 0.5;
    if (cornerVal > centerVal + 0.25) {
        for (let i = 0; i < copyArr.length; i++) {
            copyArr[i] = 1 - copyArr[i];
        }
    }

    masks.forEach(m => { try { if (m && typeof m.close === 'function') m.close(); } catch (_) {} });
    return { data: copyArr, width: mw, height: mh };
}

// Tiền kết xuất theo từng lát nhỏ (Time-Sliced) sau khi Morph xong + Nâng cấp ngầm bằng MediaPipe FaceLandmarker & SelfieSegmenter
function schedulePhotoBeautyPrebake(srcImg) {
    const token = ++beautyEngineState.photoToken;
    beautyEngineState.srcImg = srcImg;
    beautyEngineState.layersReady = false;
    beautyEngineState.landmarksResolved = false;
    beautyEngineState.segmenterResolved = false;
    beautyEngineState.detectedFaces = null;
    beautyEngineState.personMaskFloat = null;
    beautyEngineState.personMaskW = 0;
    beautyEngineState.personMaskH = 0;
    beautyEngineState.heuristicInfo = null;
    beautyEngineState.faceRoi = null;
    beautyEngineState.lipRoi = null;
    beautyEngineState.builtLipShade = 'none';

    const runSlicedPrebake = () => {
        if (token !== beautyEngineState.photoToken) return;
        const natW = srcImg.naturalWidth || srcImg.width || 0;
        const natH = srcImg.naturalHeight || srcImg.height || 0;
        if (natW <= 0 || natH <= 0) return;

        const prof = window.DevicePerfGovernor ? window.DevicePerfGovernor.getProfile() : null;
        const maxWorkDim = prof ? (prof.qualityTier >= 2 ? 960 : (prof.tier === 1 ? 820 : 680)) : 900;
        const scale = Math.min(1, maxWorkDim / Math.max(natW, natH));
        const W = Math.max(64, Math.round(natW * scale));
        const H = Math.max(64, Math.round(natH * scale));

        beautyEngineState.workW = W;
        beautyEngineState.workH = H;

        if (!beautyEngineState.baseCanvas) {
            beautyEngineState.baseCanvas = document.createElement('canvas');
        }
        beautyEngineState.baseCanvas.width = W;
        beautyEngineState.baseCanvas.height = H;
        const baseCtx = beautyEngineState.baseCanvas.getContext('2d');
        baseCtx.imageSmoothingEnabled = true;
        baseCtx.imageSmoothingQuality = 'high';
        baseCtx.drawImage(srcImg, 0, 0, W, H);
        beautyEngineState.heuristicInfo = analyzePhotoHeuristicsFast(beautyEngineState.baseCanvas);
        computeFaceAndLipROIs();

        requestAnimationFrame(() => {
            if (token !== beautyEngineState.photoToken) return;
            if (!beautyEngineState.layersReady) {
                buildBokehLayer();
            }
            requestAnimationFrame(() => {
                if (token !== beautyEngineState.photoToken) return;
                if (!beautyEngineState.layersReady) {
                    buildSkinRetouchLayer();
                    buildLipMasks();
                    if (currentLipShade && currentLipShade !== 'none') {
                        rebuildLipShadeLayer(currentLipShade);
                    }
                    beautyEngineState.layersReady = true;
                }
                if (isAnyBeautyRetouchActive()) {
                    scheduleBeautyPreviewComposite();
                }

                // Nâng cấp ngầm bằng MediaPipe FaceLandmarker (478 điểm 3D) + ImageSegmenter (Selfie Segmenter tách cánh tay & toàn thân)
                ensureMediaPipeBeautyAI().then(ai => {
                    if (!ai || token !== beautyEngineState.photoToken || !beautyEngineState.baseCanvas) return;
                    let needsRebuild = false;

                    try {
                        if (ai.landmarker) {
                            const res = ai.landmarker.detect(beautyEngineState.baseCanvas);
                            if (res && res.faceLandmarks && res.faceLandmarks.length > 0) {
                                beautyEngineState.detectedFaces = res.faceLandmarks;
                                beautyEngineState.landmarksResolved = true;
                                computeFaceAndLipROIs();
                                needsRebuild = true;
                            }
                        }
                    } catch (_) {}

                    try {
                        if (ai.segmenter) {
                            const segRes = ai.segmenter.segment(beautyEngineState.baseCanvas);
                            const extracted = extractPersonForegroundFloatMask(segRes, beautyEngineState.heuristicInfo);
                            if (extracted) {
                                beautyEngineState.personMaskFloat = extracted.data;
                                beautyEngineState.personMaskW = extracted.width;
                                beautyEngineState.personMaskH = extracted.height;
                                beautyEngineState.segmenterResolved = true;
                                needsRebuild = true;
                            }
                        }
                    } catch (_) {}

                    if (needsRebuild && token === beautyEngineState.photoToken) {
                        buildBokehLayer();
                        buildSkinRetouchLayer();
                        buildLipMasks();
                        if (currentLipShade && currentLipShade !== 'none') {
                            rebuildLipShadeLayer(currentLipShade);
                        }
                        if (isAnyBeautyRetouchActive()) {
                            scheduleBeautyPreviewComposite();
                        }
                    }
                });
            });
        });
    };

    // Chờ hiệu ứng Morph Bước 1 -> Bước 2 (660ms) hoàn tất rồi mới tiền kết xuất ngầm để khung hình chuyển cảnh mượt 100%
    setTimeout(() => {
        if (token !== beautyEngineState.photoToken) return;
        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(runSlicedPrebake, { timeout: 600 });
        } else {
            runSlicedPrebake();
        }
    }, 680);
}

// Đồng bộ tức thì vị trí, kích thước, góc xoay và lật gương của .cropper-retouch-canvas khớp 100% với .cropper-view-box img
function syncRetouchCanvasTransform() {
    const viewImg = beautyEngineState.viewBoxImgEl;
    const retouchCv = beautyEngineState.retouchCanvasEl;
    if (!viewImg || !retouchCv) return;

    retouchCv.style.width = viewImg.style.width;
    retouchCv.style.height = viewImg.style.height;
    retouchCv.style.marginLeft = viewImg.style.marginLeft;
    retouchCv.style.marginTop = viewImg.style.marginTop;
    retouchCv.style.transform = viewImg.style.transform;
    retouchCv.style.transformOrigin = viewImg.style.transformOrigin;
}

function mountRetouchCanvasInCropper() {
    const viewBox = document.querySelector('.cropper-view-box');
    const viewImg = viewBox ? viewBox.querySelector('img') : null;
    if (!viewBox || !viewImg) return;

    let retouchCv = viewBox.querySelector('.cropper-retouch-canvas');
    if (!retouchCv) {
        retouchCv = document.createElement('canvas');
        retouchCv.className = 'cropper-retouch-canvas';
        viewBox.appendChild(retouchCv);
    }

    beautyEngineState.viewBoxImgEl = viewImg;
    beautyEngineState.retouchCanvasEl = retouchCv;
    syncRetouchCanvasTransform();

    if (beautyEngineState.viewBoxObserver) {
        beautyEngineState.viewBoxObserver.disconnect();
    }
    beautyEngineState.viewBoxObserver = new MutationObserver(() => {
        syncRetouchCanvasTransform();
    });
    beautyEngineState.viewBoxObserver.observe(viewImg, {
        attributes: true,
        attributeFilter: ['style', 'class']
    });
}

// KIẾN TRÚC TRANSPARENT DELTA OVERLAY:
// Tuyệt đối KHÔNG ẩn thẻ <img> gốc (viewImg luôn giữ opacity = 1) và KHÔNG vẽ baseCanvas độ phân giải thấp đè lên ảnh!
// Lớp retouchCv chỉ vẽ phần hiệu ứng trong suốt (Hậu cảnh Bokeh + Mịn da nhẹ + Môi ROI độ phân giải cao) nằm trên viewImg,
// giúp toàn bộ mắt, tóc, quần áo, cánh tay và chi tiết ảnh gốc giữ nguyên 100% độ phân giải gốc dù người dùng phóng zoom 3x - 5x!
function renderBeautyPreviewComposite() {
    beautyEngineState.compositeRafId = 0;
    const effectiveCss = getEffectiveFilterCss();
    const viewImg = beautyEngineState.viewBoxImgEl || document.querySelector('.cropper-view-box img');
    const retouchCv = beautyEngineState.retouchCanvasEl;

    if (viewImg) {
        viewImg.style.opacity = '1';
        viewImg.style.filter = effectiveCss;
    }

    if (!isAnyBeautyRetouchActive()) {
        if (retouchCv) {
            retouchCv.style.display = 'none';
            retouchCv.style.filter = 'none';
        }
        return;
    }

    if (!ensureBeautyLayersReadySync() || !retouchCv || !beautyEngineState.baseCanvas) {
        return;
    }

    const srcImg = beautyEngineState.srcImg;
    const natW = (srcImg && (srcImg.naturalWidth || srcImg.width)) || beautyEngineState.workW;
    const natH = (srcImg && (srcImg.naturalHeight || srcImg.height)) || beautyEngineState.workH;
    const maxPreviewDim = 1360;
    const pScale = Math.min(1, maxPreviewDim / Math.max(1, natW, natH));
    const W = Math.max(beautyEngineState.workW, Math.round(natW * pScale));
    const H = Math.max(beautyEngineState.workH, Math.round(natH * pScale));

    if (retouchCv.width !== W || retouchCv.height !== H) {
        retouchCv.width = W;
        retouchCv.height = H;
    }

    const ctx = retouchCv.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.globalCompositeOperation = 'source-over';

    // 1. Lớp Xóa phông ống kính (Chủ thể + cánh tay có alpha = 0 trong suốt hoàn toàn nên không chạm vào độ nét của người!)
    if (currentBokehIntensity > 0 && beautyEngineState.bokehLayerCanvas) {
        ctx.globalAlpha = Math.max(0, Math.min(1, currentBokehIntensity / 100));
        ctx.drawImage(beautyEngineState.bokehLayerCanvas, 0, 0, W, H);
    }

    // 2. Lớp Mịn sáng da (Vẽ đúng vào khung bao Face ROI độ phân giải cao, giữ nguyên lỗ chân lông tự nhiên & chi tiết sắc nét)
    if (currentSkinIntensity > 0 && beautyEngineState.skinRetouchLayerCanvas && beautyEngineState.faceRoi) {
        const fRoi = beautyEngineState.faceRoi;
        ctx.globalAlpha = Math.max(0, Math.min(1, (currentSkinIntensity / 100) * 0.56));
        ctx.drawImage(
            beautyEngineState.skinRetouchLayerCanvas,
            fRoi.nx * W,
            fRoi.ny * H,
            fRoi.nw * W,
            fRoi.nh * H
        );
    }

    // 3. Lớp Tô son môi (Vẽ đúng vào khung bao Lip ROI độ phân giải gốc 1:1)
    if (currentLipIntensity > 0 && currentLipShade && currentLipShade !== 'none' && beautyEngineState.lipRoi) {
        if (beautyEngineState.builtLipShade !== currentLipShade) {
            rebuildLipShadeLayer(currentLipShade);
        }
        if (beautyEngineState.lipLayerCanvas) {
            const lRoi = beautyEngineState.lipRoi;
            ctx.globalAlpha = Math.max(0, Math.min(1, (currentLipIntensity / 100) * 0.90));
            ctx.drawImage(
                beautyEngineState.lipLayerCanvas,
                lRoi.nx * W,
                lRoi.ny * H,
                lRoi.nw * W,
                lRoi.nh * H
            );
        }
    }

    ctx.globalAlpha = 1;
    syncRetouchCanvasTransform();
    retouchCv.style.filter = effectiveCss;
    retouchCv.style.display = 'block';
}

function scheduleBeautyPreviewComposite() {
    syncFilterIntensityUI();
    if (!beautyEngineState.compositeRafId) {
        beautyEngineState.compositeRafId = requestAnimationFrame(renderBeautyPreviewComposite);
    }
}

function applyFilterToPreview() {
    scheduleBeautyPreviewComposite();
}

// Áp trực tiếp các lớp Làm đẹp (Xóa phông + Mịn da Face ROI + Tô son Lip ROI) lên Canvas ĐÃ CẮT ở độ phân giải đích (1024x1526)
// theo đúng ma trận phóng zoom / xoay / lật của Cropper mà KHÔNG cần tạo Canvas trung gian toàn ảnh, bảo toàn 100% độ nét gốc khi zoom sâu!
function compositeBeautyLayersOntoCroppedCanvas(croppedCanvas, cropperInstance) {
    if (!croppedCanvas || !cropperInstance || !isAnyBeautyRetouchActive()) return croppedCanvas;
    if (!ensureBeautyLayersReadySync()) return croppedCanvas;

    const imageData = cropperInstance.imageData;
    const canvasData = cropperInstance.canvasData;
    const cropBoxData = cropperInstance.cropBoxData;
    if (!imageData || !canvasData || !cropBoxData || !cropBoxData.width || !cropBoxData.height) {
        return croppedCanvas;
    }

    const outW = croppedCanvas.width;
    const outH = croppedCanvas.height;
    const width = imageData.width;
    const height = imageData.height;
    const left = cropBoxData.left - canvasData.left - imageData.left;
    const top = cropBoxData.top - canvasData.top - imageData.top;
    const rotate = imageData.rotate || 0;
    const scaleX = imageData.scaleX || 1;
    const scaleY = imageData.scaleY || 1;

    const ctx = croppedCanvas.getContext('2d');
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Biến đổi hệ tọa độ khớp chính xác 100% với khung nhìn .cropper-view-box đã phóng zoom / xoay / lật
    ctx.scale(outW / cropBoxData.width, outH / cropBoxData.height);
    ctx.translate(-left + width * 0.5, -top + height * 0.5);
    if (rotate) {
        ctx.rotate((rotate * Math.PI) / 180);
    }
    if (scaleX !== 1 || scaleY !== 1) {
        ctx.scale(scaleX, scaleY);
    }

    const imgX0 = -width * 0.5;
    const imgY0 = -height * 0.5;

    // 1. Vẽ lớp Hậu cảnh Xóa phông Bokeh (Chủ thể + cánh tay có alpha = 0 nên người trên croppedCanvas giữ nguyên 100% độ nét gốc!)
    if (currentBokehIntensity > 0 && beautyEngineState.bokehLayerCanvas) {
        ctx.globalAlpha = Math.max(0, Math.min(1, currentBokehIntensity / 100));
        ctx.drawImage(beautyEngineState.bokehLayerCanvas, imgX0, imgY0, width, height);
    }

    // 2. Vẽ lớp Mịn sáng da trên vùng Face ROI độ phân giải cao
    if (currentSkinIntensity > 0 && beautyEngineState.skinRetouchLayerCanvas && beautyEngineState.faceRoi) {
        const fRoi = beautyEngineState.faceRoi;
        ctx.globalAlpha = Math.max(0, Math.min(1, (currentSkinIntensity / 100) * 0.56));
        ctx.drawImage(
            beautyEngineState.skinRetouchLayerCanvas,
            imgX0 + fRoi.nx * width,
            imgY0 + fRoi.ny * height,
            fRoi.nw * width,
            fRoi.nh * height
        );
    }

    // 3. Vẽ lớp Tô son môi trên vùng Lip ROI độ phân giải gốc 1:1
    if (currentLipIntensity > 0 && currentLipShade && currentLipShade !== 'none' && beautyEngineState.lipRoi) {
        if (beautyEngineState.builtLipShade !== currentLipShade) {
            rebuildLipShadeLayer(currentLipShade);
        }
        if (beautyEngineState.lipLayerCanvas) {
            const lRoi = beautyEngineState.lipRoi;
            ctx.globalAlpha = Math.max(0, Math.min(1, (currentLipIntensity / 100) * 0.90));
            ctx.drawImage(
                beautyEngineState.lipLayerCanvas,
                imgX0 + lRoi.nx * width,
                imgY0 + lRoi.ny * height,
                lRoi.nw * width,
                lRoi.nh * height
            );
        }
    }

    ctx.restore();
    return croppedCanvas;
}

// Chuyển đổi giữa 2 ngăn trong Tab Làm Đẹp: (1) 🎨 Màu & Xóa phông | (2) 💄 Mịn da & Tô son
document.querySelectorAll('.beauty-subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetPaneId = btn.getAttribute('data-beauty-pane');
        document.querySelectorAll('.beauty-subtab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('#tab-filter .beauty-subpane').forEach(pane => {
            const isMatch = pane.id === targetPaneId;
            pane.classList.toggle('active', isMatch);
            pane.style.display = isMatch ? 'flex' : 'none';
        });
    });
});

// 1. Sự kiện chọn Bộ lọc màu & kéo Slider Filter màu
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

// 2. Sự kiện kéo Slider Xóa phông ống kính (Bokeh khẩu lớn f/1.4)
document.getElementById('bokeh-intensity-slider')?.addEventListener('input', (e) => {
    currentBokehIntensity = Math.max(0, Math.min(100, Number(e.target.value)));
    scheduleBeautyPreviewComposite();
});

// 3. Sự kiện chọn Sắc son & kéo Slider Tô son môi
document.querySelectorAll('.lip-shade-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetBtn = e.currentTarget;
        document.querySelectorAll('.lip-shade-btn').forEach(b => b.classList.remove('active'));
        targetBtn.classList.add('active');
        const shade = targetBtn.getAttribute('data-lip') || 'none';
        currentLipShade = shade;
        if (shade === 'none') {
            currentLipIntensity = 0;
        } else if (currentLipIntensity <= 5) {
            currentLipIntensity = 65; // Mặc định độ đậm tự nhiên 65% khi chạm chọn màu son
        }
        if (beautyEngineState.layersReady && shade !== 'none') {
            rebuildLipShadeLayer(shade);
        }
        scheduleBeautyPreviewComposite();
    });
});

document.getElementById('lip-intensity-slider')?.addEventListener('input', (e) => {
    const nextVal = Math.max(0, Math.min(100, Number(e.target.value)));
    currentLipIntensity = nextVal;
    // Nếu đang ở "✨ Môi gốc" mà người dùng kéo thanh Tô son -> Tự động chọn màu "🌸 Hồng đào"
    if ((!currentLipShade || currentLipShade === 'none') && nextVal > 0) {
        const firstLipBtn = document.querySelector('#lip-shade-list .lip-shade-btn[data-lip="peach"]');
        if (firstLipBtn) {
            document.querySelectorAll('.lip-shade-btn').forEach(b => b.classList.remove('active'));
            firstLipBtn.classList.add('active');
            currentLipShade = 'peach';
        }
    }
    scheduleBeautyPreviewComposite();
});

// 4. Sự kiện kéo Slider Mịn sáng da
document.getElementById('skin-intensity-slider')?.addEventListener('input', (e) => {
    currentSkinIntensity = Math.max(0, Math.min(100, Number(e.target.value)));
    scheduleBeautyPreviewComposite();
});

function handleFlipHorizontal() {
    if (!cropperObj) return;
    currentScaleX = -currentScaleX;
    cropperObj.scaleX(currentScaleX);
    syncRetouchCanvasTransform();
}

function handleRotate90() {
    if (!cropperObj) return;
    cropperObj.rotate(90);
    const cont = cropperObj.getContainerData();
    cropperObj.setCropBoxData({ left: 0, top: 0, width: cont.width, height: cont.height });
    syncRetouchCanvasTransform();
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
    syncRetouchCanvasTransform();
    showCardFloatingBadge('🎯 Đã căn giữa lại ảnh');
});

// Tự động cắt & căn chỉnh ảnh chân dung chuẩn tỷ lệ 1024x1526 (ưu tiên phần đầu & khuôn mặt ở 36% từ đỉnh) cho chế độ "Lời chúc dành cho bạn"
function createAutoCroppedPortraitCanvas(rawImg, targetW = 1024, targetH = 1526) {
    const c = document.createElement('canvas');
    c.width = targetW;
    c.height = targetH;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
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
window.presetSelfOracleMotion = null;
let cachedSelfOracleCommonOverlayUrl = '';

// Tạo Khuôn Chung Của Thiệp (Universal Common Card Frame Overlay) cho chế độ "Lời chúc dành cho bạn":
// Hiển thị đúng vùng cửa sổ ảnh chuẩn của cả 20 mẫu khung (winX = 68, winY = 58, winW = 888, winH = 1410) kèm viền chỉ vàng 24K & đường căn vòm thanh lịch mà không tiết lộ trước khung ngẫu nhiên nào sẽ được chọn!
// Kết xuất ở độ phân giải Retina 512 x 763 (scale 0.5 từ hệ quy chiếu 1024 x 1526) giúp giảm 75% thời gian nén/giải mã PNG trong lúc Morph sang trang Edit!
function buildSelfOracleCommonFrameOverlayDataUrl() {
    if (cachedSelfOracleCommonOverlayUrl) return cachedSelfOracleCommonOverlayUrl;
    const W = 1024;
    const H = 1526;
    const scale = 0.5;
    const c = document.createElement('canvas');
    c.width = Math.round(W * scale);
    c.height = Math.round(H * scale);
    const ctx = c.getContext('2d');
    ctx.scale(scale, scale);

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

// Tiền kết xuất ngầm khuôn chung, khung mặc định & Atlas 3D ngay lúc trang rảnh ở Bước 1 để khi chọn ảnh vào Bước 2 và Xem thử 3D có sẵn tức thì (0ms)
if (typeof window !== 'undefined') {
    const warmCommonOverlay = () => {
        try {
            buildSelfOracleCommonFrameOverlayDataUrl();
            const defaultCfg = framesConfig[currentSelectedFrameId] || framesConfig[0];
            if (defaultCfg && defaultCfg.concept) {
                getFullConceptOverlayDataUrl(defaultCfg.concept);
            }
            if (typeof getU3DLuxurySpriteAtlas === 'function') {
                getU3DLuxurySpriteAtlas();
            }
        } catch (_) {}
    };
    if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(warmCommonOverlay, { timeout: 1500 });
    } else {
        setTimeout(warmCommonOverlay, 900);
    }
}

// Giữ nguyên 100% file ảnh gốc (URL.createObjectURL trực tiếp, không nén lại) cho mọi ảnh điện thoại & máy ảnh (tới 8192px)
// để bảo toàn tuyệt đối từng điểm ảnh khi người dùng phóng zoom sâu (2x - 5x) vào khuôn mặt trong ảnh chụp xa / ảnh tập thể!
async function normalizeInputPhotoForCropper(file) {
    const MAX_DIM = 8192;
    try {
        if (typeof window.createImageBitmap === 'function') {
            const bmp = await window.createImageBitmap(file);
            const w = bmp.width || 0;
            const h = bmp.height || 0;
            if (w <= 0 || h <= 0 || Math.max(w, h) <= MAX_DIM) {
                if (typeof bmp.close === 'function') bmp.close();
                return URL.createObjectURL(file);
            }
            const scale = MAX_DIM / Math.max(w, h);
            const targetW = Math.max(1, Math.round(w * scale));
            const targetH = Math.max(1, Math.round(h * scale));
            const off = document.createElement('canvas');
            off.width = targetW;
            off.height = targetH;
            const oCtx = off.getContext('2d');
            oCtx.imageSmoothingEnabled = true;
            oCtx.imageSmoothingQuality = 'high';
            oCtx.drawImage(bmp, 0, 0, targetW, targetH);
            if (typeof bmp.close === 'function') bmp.close();

            const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/jpeg', 0.99));
            if (blob) return URL.createObjectURL(blob);
        }
    } catch (_) {}
    return URL.createObjectURL(file);
}

// Ánh xạ 1-1 giữa Hoa Trung Tâm trên mặt hồ và Màu Bì Thư / Thiệp (Hoa màu gì -> 4 cánh xếp bì thư màu đó)
const FLOWER_MOTION_TO_COLOR_THEME = {
    bloom: 'blush',          // 🌺 Hoa Trà Hồng Nhung Phấn Đào -> Bì thư Hồng Phấn Đào
    butterflies: 'champagne',// 🦋 Sen Hoàng Kim Hồ Điệp -> Bì thư Vàng Hoàng Kim
    ribbon: 'lavender',      // 🎀 Mẫu Đơn Lụa Tím Oải Hương -> Bì thư Tím Hoàng Gia
    sakura: 'emerald',       // 🌸 Thanh Liên Ngọc Bích -> Bì thư Xanh Ngọc Lục Bảo
    hearts: 'rosegold',      // 🌷 Tulip Cam Đào Nắng Mai -> Bì thư Cam Đào Rose-Gold
    galaxy: 'ruby'           // 🌹 Hồng Pháp Đỏ Rượu Vang -> Bì thư Đỏ Nhung Ruby
};

let shuffledFlowerMotionDeck = [];
let lastPickedFlowerMotion = '';

function pickNextRandomFlowerMotion() {
    const allMotions = ['bloom', 'butterflies', 'ribbon', 'galaxy', 'sakura', 'hearts'];
    if (shuffledFlowerMotionDeck.length === 0) {
        shuffledFlowerMotionDeck = allMotions.slice();
        for (let i = shuffledFlowerMotionDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = shuffledFlowerMotionDeck[i];
            shuffledFlowerMotionDeck[i] = shuffledFlowerMotionDeck[j];
            shuffledFlowerMotionDeck[j] = tmp;
        }
        // Đảm bảo đầu bộ bài mới không trùng với màu hoa vừa xuất hiện ở cuối bộ bài cũ
        if (shuffledFlowerMotionDeck[shuffledFlowerMotionDeck.length - 1] === lastPickedFlowerMotion && shuffledFlowerMotionDeck.length > 1) {
            const first = shuffledFlowerMotionDeck[0];
            shuffledFlowerMotionDeck[0] = shuffledFlowerMotionDeck[shuffledFlowerMotionDeck.length - 1];
            shuffledFlowerMotionDeck[shuffledFlowerMotionDeck.length - 1] = first;
        }
    }
    const picked = shuffledFlowerMotionDeck.pop();
    lastPickedFlowerMotion = picked;
    return picked;
}

const SELF_ORACLE_TITLES = [
    'Mừng ngày Phụ nữ Việt Nam',
    'Mừng ngày Phụ nữ VN 20.10',
    'Chúc mừng ngày Phụ nữ VN',
    'Chúc mừng ngày Phụ nữ Việt Nam',
    'Rạng rỡ ngày Phụ nữ Việt Nam',
    'Tôn vinh Phụ nữ Việt Nam',
    'Mừng ngày Phụ nữ VN',
    'Ngọt ngào ngày Phụ nữ VN',
    'Chúc mừng ngày 20 tháng 10',
    'Dịu dàng sắc hương 20.10',
    'Tháng Mười rạng rỡ sắc hương',
    'Tôn vinh phái đẹp ngày 20.10'
];

let shuffledSelfOracleTitleDeck = [];
let lastPickedSelfOracleTitle = '';

function pickNextSelfOracleTitle() {
    if (shuffledSelfOracleTitleDeck.length === 0) {
        shuffledSelfOracleTitleDeck = SELF_ORACLE_TITLES.slice();
        for (let i = shuffledSelfOracleTitleDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = shuffledSelfOracleTitleDeck[i];
            shuffledSelfOracleTitleDeck[i] = shuffledSelfOracleTitleDeck[j];
            shuffledSelfOracleTitleDeck[j] = tmp;
        }
        if (shuffledSelfOracleTitleDeck[shuffledSelfOracleTitleDeck.length - 1] === lastPickedSelfOracleTitle && shuffledSelfOracleTitleDeck.length > 1) {
            const first = shuffledSelfOracleTitleDeck[0];
            shuffledSelfOracleTitleDeck[0] = shuffledSelfOracleTitleDeck[shuffledSelfOracleTitleDeck.length - 1];
            shuffledSelfOracleTitleDeck[shuffledSelfOracleTitleDeck.length - 1] = first;
        }
    }
    const picked = shuffledSelfOracleTitleDeck.pop();
    lastPickedSelfOracleTitle = picked;
    return picked;
}

// Hàm bốc thăm ngẫu nhiên Khung + Viền + Tông màu + Lời chúc + Hiệu ứng mở 3D cho luồng "Lời chúc dành cho bạn"
// (GIỮ NGUYÊN 100% Filter màu & Mức độ Filter mà người dùng đã tự chọn!)
function applyRandomSelfOracleArtSelections(presetMotion) {
    currentSelectedFrameId = Math.floor(Math.random() * framesConfig.length);
    const cfg = framesConfig[currentSelectedFrameId] || framesConfig[0];

    const borderKeys = ['sakura', 'ribbon', 'hearts', 'daisy', 'vintage'];
    const motionKeys = ['bloom', 'butterflies', 'ribbon', 'galaxy', 'sakura', 'hearts'];

    if (cfg && CONCEPT_HARMONY_MAP[cfg.concept] && Math.random() < 0.65) {
        const harmony = CONCEPT_HARMONY_MAP[cfg.concept];
        currentBorderStyle = harmony.border;
    } else {
        currentBorderStyle = borderKeys[Math.floor(Math.random() * borderKeys.length)];
    }

    const randomMotion = (presetMotion && motionKeys.includes(presetMotion)) ? presetMotion : pickNextRandomFlowerMotion();
    window.currentMotionEffect = randomMotion;
    // Hoa màu gì thì 4 cánh xếp thành bì thư & thiệp bên trong mang đúng màu đó 100%
    currentColorTheme = FLOWER_MOTION_TO_COLOR_THEME[randomMotion] || 'blush';

    isCustomWishActive = false;
    customWishText = '';
    if (!recipientName || !SELF_ORACLE_TITLES.includes(recipientName)) {
        recipientName = pickNextSelfOracleTitle();
    }
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
    // Tuyệt đối không gọi refreshConceptFramesForTheme() / updateFrameOverlay() lúc đang rời Bước 2 sang Bước 3 để tránh nghẽn CPU!
    return randomMotion;
}

let step2WarmupTimerId = 0;

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
        recipientName = pickNextSelfOracleTitle();
        window.presetSelfOracleMotion = pickNextRandomFlowerMotion();
        currentColorTheme = FLOWER_MOTION_TO_COLOR_THEME[window.presetSelfOracleMotion] || 'blush';
        syncFilterIntensityUI();
    } else {
        if (headerTitleEl) headerTitleEl.textContent = '✨ Thiết Kế Thiệp 🌸';
        if (generateBtnEl) generateBtnEl.textContent = 'Tạo thiệp';
        window.presetSelfOracleMotion = null;
        const recipientInpEl = document.getElementById('recipient-input');
        recipientName = recipientInpEl ? recipientInpEl.value.trim() : '';
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

    window.isStep2Morphing = true;
    const normalizedBlobUrl = await normalizeInputPhotoForCropper(file);

    // Giữ Bước 1 hiển thị ổn định trong lúc Bước 2 dựng ngầm Cropper + giải mã Texture GPU phía dưới (không bao giờ chớp màn hình)
    step2.classList.remove('step2-morph-from', 'step2-morph-to', 'step2-morph-settled', 'step2-morph-active', 'step2-ui-hidden', 'step2-ui-revealing');
    step2.classList.add('active', 'step2-preloading');

    if (originalImgSrc && originalImgSrc.startsWith('blob:')) {
        URL.revokeObjectURL(originalImgSrc);
    }
    originalImgSrc = normalizedBlobUrl;

    fitPreviewAreaToStage();
    renderStep2WishPreview();
    initCropper();

    // Hoãn toàn bộ tác vụ đọc kích thước cuộn ngang (initScrollHints, scrollChipIntoCenter) và mở khóa độ phân giải GPU Rasterization sang SAU KHI hiệu ứng Morph hoàn tất (660ms)!
    window.onStep2MorphComplete = () => {
        window.onStep2MorphComplete = null;
        step2.classList.add('step2-morph-settled');
        if (!window.isSelfOracleMode) {
            initScrollHints();
            const activeChip = document.querySelector('#step3-concept-chips .concept-chip.active, #step3-classic-frame-chips .concept-chip.active');
            if (activeChip) scrollChipIntoCenter(activeChip);
        }
    };

    if (step2WarmupTimerId) clearTimeout(step2WarmupTimerId);
    step2WarmupTimerId = setTimeout(() => {
        step2WarmupTimerId = 0;
        step2.classList.add('step2-morph-settled');
        const warmStep3Assets = () => {
            try {
                if (window.isSelfOracleMode && window.WishBloomCutscene && window.presetSelfOracleMotion) {
                    window.WishBloomCutscene.prepare(window.presetSelfOracleMotion);
                } else if (typeof getU3DLuxurySpriteAtlas === 'function') {
                    getU3DLuxurySpriteAtlas();
                }
            } catch (_) {}
        };
        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(warmStep3Assets, { timeout: 1200 });
        } else {
            warmStep3Assets();
        }
    }, 850);
}

function initCropper() {
    const imageEl = document.getElementById('cropper-image');
    imageEl.decoding = 'async';
    imageEl.src = originalImgSrc;

    updateFrameOverlay();

    disposeBeautyEngineLayers();
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
        checkOrientation: false,
        checkCrossOrigin: false,
        crop: function () {
            syncRetouchCanvasTransform();
        },
        ready: function () {
            const cont = cropperObj.getContainerData();
            cropperObj.setCropBoxData({ left: 0, top: 0, width: cont.width, height: cont.height });
            mountRetouchCanvasInCropper();
            applyFilterToPreview();
            schedulePhotoBeautyPrebake(imageEl);

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

            // Đảm bảo cả ảnh trong .cropper-view-box lẫn lớp khung #frame-overlay đã giải mã & đẩy xong Texture lên GPU
            // TRƯỚC KHI bắt đầu hiệu ứng Morph từ Bước 1 sang Bước 2 (loại bỏ 100% khựng khung hình đầu trên Android/iOS)!
            const decodePromises = [];
            const viewBoxImg = document.querySelector('.cropper-view-box img');
            if (viewBoxImg && typeof viewBoxImg.decode === 'function') {
                decodePromises.push(viewBoxImg.decode().catch(() => {}));
            }
            if (frameOverlayEl && typeof frameOverlayEl.decode === 'function') {
                decodePromises.push(frameOverlayEl.decode().catch(() => {}));
            }

            const startMorphNow = () => {
                if (typeof window.onStep2CropperReadyForMorph === 'function') {
                    window.onStep2CropperReadyForMorph();
                } else {
                    window.isStep2Morphing = false;
                    step1.classList.remove('active');
                    step2.classList.remove('step2-preloading');
                    step2.classList.add('step2-morph-settled');
                }
            };

            if (decodePromises.length > 0) {
                let settled = false;
                const done = () => {
                    if (settled) return;
                    settled = true;
                    startMorphNow();
                };
                Promise.all(decodePromises).then(done, done);
                setTimeout(done, 140);
            } else {
                startMorphNow();
            }
        }
    });

    // Kết xuất trực tiếp vùng ảnh đã phóng zoom / xoay / lật từ thẻ <img> gốc độ phân giải đầy đủ (12MP - 48MP) sang Canvas đích (1024x1526)
    // mà KHÔNG qua Canvas trung gian getSourceCanvas của Cropper, sau đó ghép trực tiếp các lớp Xóa phông + Mịn da Face ROI + Tô son Lip ROI!
    const origGetCroppedCanvas = cropperObj.getCroppedCanvas.bind(cropperObj);
    cropperObj.getCroppedCanvas = function (options) {
        try {
            const imageData = this.imageData;
            const canvasData = this.canvasData;
            const cropBoxData = this.cropBoxData;
            const rawImg = this.image || imageEl;

            if (this.ready && this.cropped && imageData && canvasData && cropBoxData && cropBoxData.width > 0 && cropBoxData.height > 0 && rawImg) {
                const outW = Math.round((options && options.width) || 1024);
                const outH = Math.round((options && options.height) || 1526);
                const outCv = document.createElement('canvas');
                outCv.width = outW;
                outCv.height = outH;
                const ctx = outCv.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                const width = imageData.width;
                const height = imageData.height;
                const left = cropBoxData.left - canvasData.left - imageData.left;
                const top = cropBoxData.top - canvasData.top - imageData.top;
                const rotate = imageData.rotate || 0;
                const scaleX = imageData.scaleX || 1;
                const scaleY = imageData.scaleY || 1;

                ctx.save();
                ctx.scale(outW / cropBoxData.width, outH / cropBoxData.height);
                ctx.translate(-left + width * 0.5, -top + height * 0.5);
                if (rotate) {
                    ctx.rotate((rotate * Math.PI) / 180);
                }
                if (scaleX !== 1 || scaleY !== 1) {
                    ctx.scale(scaleX, scaleY);
                }
                // Vẽ trực tiếp từ thẻ <img> gốc độ phân giải cảm biến (không mất 1 pixel nào khi zoom sâu!)
                ctx.drawImage(rawImg, -width * 0.5, -height * 0.5, width, height);
                ctx.restore();

                if (isAnyBeautyRetouchActive()) {
                    compositeBeautyLayersOntoCroppedCanvas(outCv, this);
                }
                return outCv;
            }
        } catch (err) {
            console.warn('Direct high-res getCroppedCanvas fallback:', err);
        }

        const fallbackCv = origGetCroppedCanvas(options);
        if (fallbackCv && isAnyBeautyRetouchActive()) {
            compositeBeautyLayersOntoCroppedCanvas(fallbackCv, this);
        }
        return fallbackCv;
    };
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
    disposeBeautyEngineLayers();
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
    if (step2WarmupTimerId) {
        clearTimeout(step2WarmupTimerId);
        step2WarmupTimerId = null;
    }

    const btn = document.getElementById('generate-final-btn');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;

    // Nhánh 1: Luồng "Lời chúc dành cho bạn" -> CHUYỂN CẢNH NGAY TRONG KHUNG HÌNH BẤM NÚT:
    // Màn đêm & đốm sáng ước nguyện (.wish-prelude) chạy 220ms trên GPU compositor hoàn toàn rảnh luồng chính,
    // sau đó mới cắt ảnh (<4ms) và vào thẳng Đại cảnh "Nụ Hoa Ước Nguyện".
    // Việc vẽ chữ + mã hóa JPEG lá thư bên trong phong bì được hoãn tới khi phong bì đóng kín chờ mở!
    if (window.isSelfOracleMode) {
        const motionKeys = ['bloom', 'butterflies', 'ribbon', 'galaxy', 'sakura', 'hearts'];
        const presetMotion = window.presetSelfOracleMotion || motionKeys[Math.floor(Math.random() * motionKeys.length)];
        const cinematic = window.WishBloomCutscene || null;
        const preludeReady = cinematic ? cinematic.beginPrelude(presetMotion) : Promise.resolve();
        if (!cinematic) btn.innerHTML = "✨ Đang gửi thông điệp...";

        const restoreBtn = () => {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        };

        // Chờ 225ms để .wish-prelude fade-in 100% mượt mà trên GPU trước khi vào Đại cảnh "Nụ Hoa Ước Nguyện"
        // (Hoãn cả getCroppedCanvas lẫn drawCanvasImageText sang sau khi phong bì đóng sáp, chia làm 2 nhịp RAF để 0ms khựng!)
        setTimeout(() => {
            window.skyOracleUserThumbCanvas = null;
            window.skyOracleUserCardPhotoCanvas = null;
            const randomMotion = applyRandomSelfOracleArtSelections(presetMotion);

            let cardCropDone = false;
            let cardDrawDone = false;
            window.hasPendingDeferredCardRender = true;
            window.ensureFinalCardRenderedOnce = (immediate = false) => {
                if (cardDrawDone) return;
                const doCrop = () => {
                    if (cardCropDone) return;
                    cardCropDone = true;
                    try {
                        if (cropperObj) {
                            const canvas = cropperObj.getCroppedCanvas({
                                width: 1024,
                                height: 1526,
                                imageSmoothingEnabled: true,
                                imageSmoothingQuality: 'high'
                            });
                            if (canvas) {
                                canvas._renderId = Date.now();
                                currentUserImage = canvas;
                            }
                        }
                    } catch (cropErr) {
                        console.error('Self oracle crop error:', cropErr);
                    }
                };
                const doDraw = () => {
                    if (cardDrawDone) return;
                    cardDrawDone = true;
                    window.hasPendingDeferredCardRender = false;
                    try {
                        if (currentUserImage) {
                            drawCanvasImageText(finalResultCanvas, true, false);
                            window.isRecipientCardImageReady = true;
                        }
                        if (typeof getU3DLuxurySpriteAtlas === 'function') getU3DLuxurySpriteAtlas();
                    } catch (e) {
                        console.error('Deferred final card render error:', e);
                    }
                };

                if (immediate) {
                    doCrop();
                    doDraw();
                } else {
                    doCrop();
                    requestAnimationFrame(() => doDraw());
                }
            };

            Promise.all([ensureQuoteFont(), preludeReady]).then(() => {
                if (cinematic) cinematic.prepare(randomMotion);
                fitCardShowcaseToWrap();
                document.body.classList.remove('step2-previewing-3d');
                restoreBtn();

                if (typeof window.launchUnified3DEnvelopeDirector === 'function') {
                    window.launchUnified3DEnvelopeDirector({
                        autoOpen: false,
                        skyOracleMode: true,
                        motionId: randomMotion,
                        themeKey: currentColorTheme,
                        isRealRecipient: false,
                        isStep2Preview: false,
                        onComplete: () => {
                            if (typeof window.ensureFinalCardRenderedOnce === 'function') {
                                window.ensureFinalCardRenderedOnce(true);
                            }
                            triggerCelebrationBurst();
                            showCardFloatingBadge('🌸 Lời chúc 20.10 dành riêng cho bạn đã mở!');
                            if (typeof window.schedulePreUploadCardToTelegram === 'function') {
                                window.schedulePreUploadCardToTelegram();
                            }
                        }
                    });
                } else {
                    window.ensureFinalCardRenderedOnce(true);
                    if (cinematic) cinematic.endPrelude();
                }
            }).catch((err) => {
                console.error('Self oracle render error:', err);
                if (cinematic) cinematic.endPrelude();
                restoreBtn();
            });
        }, 225);
        return;
    }

    // Nhánh 2: Luồng "Soạn lời chúc cho người thân" -> Khởi chạy Sân Khấu Phong Bì 3D & Đóng dấu sáp NGAY LẬP TỨC ở 60-120fps!
    // Tác vụ cắt ảnh (getCroppedCanvas 1024x1526) + vẽ chữ + nén JPEG (drawCanvasImageText) được chia làm 2 lát nhỏ (micro-slices) chạy sau khi đóng sáp xong!
    if (currentWishMode === 'surprise') {
        isCustomWishActive = false;
        currentAIQuote = getNextQuoteByTopic(currentTopic);
        hasGeneratedQuoteOnce = true;
    } else if (!hasGeneratedQuoteOnce && !currentAIQuote && !customWishText) {
        currentAIQuote = getNextQuoteByTopic(currentTopic);
        hasGeneratedQuoteOnce = true;
    }

    let giftCropDone = false;
    let giftCardRendered = false;
    window.hasPendingDeferredCardRender = true;
    window.ensureFinalCardRenderedOnce = (immediate = false) => {
        if (giftCardRendered) return;
        const doCrop = () => {
            if (giftCropDone) return;
            giftCropDone = true;
            try {
                if (cropperObj) {
                    const canvas = cropperObj.getCroppedCanvas({
                        width: 1024,
                        height: 1526,
                        imageSmoothingEnabled: true,
                        imageSmoothingQuality: 'high'
                    });
                    if (canvas) {
                        canvas._renderId = Date.now();
                        currentUserImage = canvas;
                    }
                }
            } catch (err) {
                console.error('Deferred gift crop error:', err);
            }
        };
        const doDraw = () => {
            if (giftCardRendered) return;
            giftCardRendered = true;
            window.hasPendingDeferredCardRender = false;
            try {
                if (currentUserImage) {
                    drawCanvasImageText(finalResultCanvas, true, false);
                    window.isRecipientCardImageReady = true;
                }
            } catch (err) {
                console.error('Deferred gift card render error:', err);
            }
        };

        if (immediate) {
            doCrop();
            doDraw();
        } else {
            doCrop();
            requestAnimationFrame(() => doDraw());
        }
    };

    ensureQuoteFont().then(() => {
        document.body.classList.remove('step2-previewing-3d');
        step2.classList.remove('active', 'step2-preloading', 'step2-morph-from');
        step3.classList.add('active');
        btn.innerHTML = originalHTML;
        btn.disabled = false;

        fitCardShowcaseToWrap();

        if (typeof window.launchUnified3DEnvelopeDirector === 'function') {
            window.launchUnified3DEnvelopeDirector({
                autoOpen: false,
                isRealRecipient: false,
                isStep2Preview: false,
                onComplete: () => {
                    if (typeof window.ensureFinalCardRenderedOnce === 'function') {
                        window.ensureFinalCardRenderedOnce();
                    }
                    if (currentWishMode === 'surprise') {
                        showCardFloatingBadge('🌸 Lời chúc bất ngờ dành tặng bạn đã mở!');
                    } else {
                        showCardFloatingBadge('✨ Tuyệt tác thiệp 3D 20/10 đã hoàn thiện!');
                    }
                    if (typeof window.schedulePreUploadCardToTelegram === 'function') {
                        window.schedulePreUploadCardToTelegram();
                    }
                }
            });
        } else {
            window.ensureFinalCardRenderedOnce();
            if (typeof window.schedulePreUploadCardToTelegram === 'function') {
                window.schedulePreUploadCardToTelegram();
            }
        }
    });
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
    const activeText = formatWishForInputIfLibraryPoem(getActiveQuoteText());
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
    const suggested = formatWishForInputIfLibraryPoem(getNextQuoteByTopic(currentTopic));
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
    disposeBeautyEngineLayers();
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
    const trimmed = (rawTitle || '').trim();
    if (trimmed) return trimmed;
    if (window.isSelfOracleMode) {
        recipientName = pickNextSelfOracleTitle();
        return recipientName;
    }
    return '';
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
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (concept === 'aura' || concept === 'aura_arch' || concept === 'prism') {
        // ====== NHÓM KÍNH MỜ AURA & PHA LÊ (14, 15, 16): NỀN MỜ TỪ CHÍNH ẢNH NGƯỜI DÙNG PHỦ TOÀN BỘ THIỆP ======
        // Tối ưu hoá tốc độ: Thay vì chạy filter blur(42px) trực tiếp trên độ phân giải 1024x2060 (tốn 350-600ms trên Android),
        // hạ mẫu xuống offscreen canvas 64x128 + blur(3px) rồi phóng mượt lên toàn khung (<1ms, hiệu ứng thị giác tương đương 100%).
        ctx.save();
        ctx.fillStyle = theme.canvasBgMid;
        ctx.fillRect(0, 0, targetW, targetH);

        if (!window._auraBlurScratchCanvas) {
            window._auraBlurScratchCanvas = document.createElement('canvas');
        }
        const blurCv = window._auraBlurScratchCanvas;
        const bw = 64, bh = 128;
        if (blurCv.width !== bw || blurCv.height !== bh) {
            blurCv.width = bw;
            blurCv.height = bh;
        }
        const bctx = blurCv.getContext('2d');
        bctx.clearRect(0, 0, bw, bh);
        bctx.filter = 'blur(3px) saturate(1.32) brightness(1.04)';
        bctx.drawImage(currentUserImage, -4, -6, bw + 8, bh + 12);
        bctx.filter = 'none';

        const bleed = 40 * scale;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(blurCv, -bleed, -bleed, targetW + bleed * 2, targetH + bleed * 2);

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
        const marginX = Math.floor(targetW * 0.038);
        const boxX = marginX;
        const boxY = originH + Math.floor(textSpaceHeight * 0.068);
        const boxW = targetW - marginX * 2;
        const boxH = Math.floor(textSpaceHeight * 0.875);
        const radius = Math.floor(targetW * 0.032);

        // Cầu nối trang sức (Ornamental Bridge) kết nối khung ảnh phía trên với hộp lời chúc phía dưới
        drawOrnamentalBridge(ctx, targetW / 2, originH, boxY, scale, theme, concept);

        drawRomanticQuoteBox(ctx, boxX, boxY, boxW, boxH, radius, scale, theme, currentBorderStyle, concept);

        const recipientLine = formatRecipientLine(recipientName);
        const layout = fitQuoteInBox(ctx, activeQuote, recipientLine, boxW, boxH, scale, currentBorderStyle);

        drawQuoteContent(ctx, boxX, boxY, boxW, boxH, layout, theme, scale);
    }

    // Đồng bộ sang thẻ <img> và căn lại đúng tỷ lệ hiển thị trọn vẹn 100% trên màn hình:
    // Khi đang chạy Sân Khấu 3D (u3d-stage-active), dùng toBlob() bất đồng bộ trên luồng C++ Worker (<0.3ms main thread)
    // thay vì toDataURL() đồng bộ (gây nghẽn 35ms) để mọi animation tiếp diễn mượt 60-120fps tuyệt đối!
    if (isFinal && finalResultImg) {
        try {
            const applyCardUrl = (urlStr) => {
                if (!urlStr) return;
                targetCanvas._cachedDataUrl = urlStr;
                finalResultImg.src = urlStr;
                const u3dCardImg = document.getElementById('u3d-card-img');
                if (u3dCardImg) {
                    u3dCardImg.src = urlStr;
                    if (typeof u3dCardImg.decode === 'function') {
                        u3dCardImg.decode().catch(() => {});
                    }
                }
                const recLetterImg = document.getElementById('recipient-letter-img');
                if (recLetterImg) recLetterImg.src = urlStr;
                if (saveModalImg && saveGuideModal.style.display !== 'none') {
                    saveModalImg.src = urlStr;
                }
            };

            targetCanvas._cachedDataUrl = null;
            if (document.body.classList.contains('u3d-stage-active') && typeof targetCanvas.toBlob === 'function') {
                targetCanvas.toBlob((blob) => {
                    if (!blob) return;
                    if (targetCanvas._lastObjectUrl) {
                        URL.revokeObjectURL(targetCanvas._lastObjectUrl);
                    }
                    const blobUrl = URL.createObjectURL(blob);
                    targetCanvas._lastObjectUrl = blobUrl;
                    applyCardUrl(blobUrl);
                }, 'image/jpeg', 0.98);
            } else {
                const dataUrl = targetCanvas.toDataURL('image/jpeg', 0.98);
                applyCardUrl(dataUrl);
            }

            if (!isPreviewOnly && typeof window.markCardCanvasDirty === 'function') {
                const imgTag = currentUserImage ? `${currentUserImage.width}x${currentUserImage.height}_${String(currentUserImage.src || currentUserImage._renderId || '').slice(-48)}` : '';
                const renderSig = `${currentSelectedFrameId}|${currentColorTheme}|${currentBorderStyle}|${getEffectiveFilterCss()}|${getBeautyRetouchSignature()}|${activeQuote}|${recipientName}|${imgTag}`;
                if (window._lastFinalCardRenderSig !== renderSig) {
                    window._lastFinalCardRenderSig = renderSig;
                    window.markCardCanvasDirty();
                }
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

// ====== THUẬT TOÁN ĐO ĐẠC & CO CHỮ TỰ ĐỘNG (TIÊU ĐỀ LỚN NỔI BẬT + LỜI CHÚC CỠ LỚN RÕ NÉT KHÔNG TRÀN KHUNG) ======
const QUOTE_LINE_HEIGHT = 1.28;
const TITLE_LINE_HEIGHT = 1.16;

function quoteFont(size) {
    return `italic 600 ${size}px "Playfair Display", serif`;
}

function recipientFont(size) {
    return `700 ${size}px "Playfair Display", serif`;
}

function ensureQuoteFont() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.race([
        Promise.all([
            document.fonts.load(quoteFont(64), 'Chúc mừng 20/10'),
            document.fonts.load(recipientFont(72), 'Happy Women Day 20/10'),
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
    return Math.ceil(Math.max(m.width, ink) * 1.02);
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

function balanceWrapLines(ctx, text, maxWidth, initialLines) {
    const targetCount = initialLines.length;
    if (targetCount <= 1) return initialLines;
    const widths = initialLines.map(l => inkWidth(ctx, l));
    const maxInitial = Math.max(...widths);
    const lastW = widths[widths.length - 1];
    // Chỉ cân chỉnh lại độ rộng dòng khi dòng cuối bị cụt lẻ chữ (< 62% dòng rộng nhất), giữ khối chữ luôn trải rộng sang trọng (>= 82% maxWidth)
    if (lastW >= maxInitial * 0.62) return initialLines;

    let low = Math.ceil(maxWidth * 0.82);
    let high = maxWidth;
    let best = initialLines;
    for (let step = 0; step < 6; step++) {
        const mid = Math.floor((low + high) / 2);
        const candidate = wrapLines(ctx, text, mid);
        const widest = Math.max(...candidate.map(l => inkWidth(ctx, l)));
        if (candidate.length <= targetCount && widest <= maxWidth) {
            best = candidate;
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    return best;
}

let _libraryPoemMap = null;

function normalizePoemKey(str) {
    return String(str || '')
        .replace(/[,.;!?]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function capitalizeVerse(str) {
    const s = String(str || '').trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function split28WordsToLucBatLines(rawPoem) {
    const words = String(rawPoem || '').trim().split(/\s+/).filter(Boolean);
    if (words.length !== 28) return null;
    const l1 = capitalizeVerse(words.slice(0, 6).join(' ').replace(/[,;:]+$/, ''));
    const b1 = capitalizeVerse(words.slice(6, 14).join(' '));
    const l2 = capitalizeVerse(words.slice(14, 20).join(' ').replace(/[,;:]+$/, ''));
    const b2 = capitalizeVerse(words.slice(20, 28).join(' '));
    return [l1, b1, l2, b2];
}

function getLibraryPoemMap() {
    if (_libraryPoemMap) return _libraryPoemMap;
    _libraryPoemMap = new Map();
    if (typeof wishes2010 !== 'undefined' && Array.isArray(wishes2010)) {
        wishes2010.forEach((poem) => {
            const lines = split28WordsToLucBatLines(poem);
            if (lines) {
                _libraryPoemMap.set(normalizePoemKey(poem), lines);
            }
        });
    }
    return _libraryPoemMap;
}

function getLucBatLinesIfLibraryPoem(text) {
    if (!text) return null;
    const map = getLibraryPoemMap();
    return map.get(normalizePoemKey(text)) || null;
}

function formatWishForInputIfLibraryPoem(text) {
    const lines = getLucBatLinesIfLibraryPoem(text);
    return lines ? lines.join('\n') : String(text || '');
}

function fitQuoteInBox(ctx, text, recipientLine, boxW, boxH, scale, borderStyle) {
    const hasTopOrnament = borderStyle === 'ribbon' || borderStyle === 'hearts';
    const padTop = Math.floor(boxH * (hasTopOrnament ? 0.092 : 0.068));
    const padBottom = Math.floor(boxH * 0.068);
    const maxH = boxH - padTop - padBottom;
    const padX = Math.max(Math.floor(boxW * 0.048), Math.ceil(46 * scale));
    const maxWidth = boxW - padX * 2;
    const minSize = Math.max(12, Math.floor(16 * scale));
    const lucBatLines = getLucBatLinesIfLibraryPoem(text);

    const evaluateAtSize = (fontSize) => {
        let recFontSize = 0;
        let titleLines = [];
        let titleLineHeight = 0;
        let titleInkH = 0;
        let dividerSpace = 0;
        let recBlockH = 0;
        let widestTitle = 0;

        if (recipientLine) {
            const maxTitleFont = lucBatLines ? Math.floor(58 * scale) : Math.floor(76 * scale);
            const titleScaleRatio = lucBatLines ? 1.10 : 1.16;
            recFontSize = Math.min(maxTitleFont, Math.floor(fontSize * titleScaleRatio));
            const minSingleLineTitle = lucBatLines
                ? Math.floor(20 * scale)
                : Math.max(Math.floor(22 * scale), Math.floor(fontSize * 0.82));
            ctx.font = recipientFont(recFontSize);

            while (recFontSize > minSingleLineTitle && inkWidth(ctx, recipientLine) > maxWidth) {
                recFontSize--;
                ctx.font = recipientFont(recFontSize);
            }

            if (inkWidth(ctx, recipientLine) > maxWidth) {
                recFontSize = Math.min(Math.floor(54 * scale), Math.floor(fontSize * 1.0));
                ctx.font = recipientFont(recFontSize);
                titleLines = wrapLines(ctx, recipientLine, maxWidth);
            } else {
                titleLines = [recipientLine];
            }

            titleLineHeight = Math.floor(recFontSize * TITLE_LINE_HEIGHT);
            titleInkH = (titleLines.length - 1) * titleLineHeight + Math.ceil(recFontSize * 1.08);
            dividerSpace = Math.floor(fontSize * (lucBatLines ? 0.44 : 0.50));
            recBlockH = titleInkH + dividerSpace;
            widestTitle = Math.max(...titleLines.map(l => inkWidth(ctx, l)));
        }

        ctx.font = quoteFont(fontSize);
        const lines = lucBatLines ? lucBatLines.slice() : wrapLines(ctx, text, maxWidth);
        const effectiveQuoteLH = (lucBatLines && recipientLine) ? 1.24 : QUOTE_LINE_HEIGHT;
        const lineHeight = Math.floor(fontSize * effectiveQuoteLH);
        const quoteInkH = (lines.length - 1) * lineHeight + Math.ceil(fontSize * 1.12);
        const widest = Math.max(...lines.map(l => inkWidth(ctx, l)));
        const totalTextH = recBlockH + quoteInkH;
        const fits = totalTextH <= maxH && widest <= maxWidth && widestTitle <= maxWidth;

        return {
            fits,
            fontSize,
            lines,
            lineHeight,
            quoteInkH,
            recipientLine,
            titleLines,
            titleLineHeight,
            titleInkH,
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
    };

    let bestAny = null;
    let bestFourLines = null;
    let bestThreeLines = null;

    for (let fontSize = Math.floor(78 * scale); fontSize >= minSize; fontSize--) {
        const candidate = evaluateAtSize(fontSize);
        if (!bestAny) bestAny = candidate;
        if (candidate.fits) {
            if (lucBatLines) {
                bestAny = candidate;
                break;
            }
            if (!bestAny.fits) bestAny = candidate;
            if (!bestFourLines && candidate.lines.length <= 4) {
                bestFourLines = candidate;
            }
            if (!bestThreeLines && candidate.lines.length <= 3) {
                bestThreeLines = candidate;
                break;
            }
        }
    }

    // Ưu tiên bố cục 3-4 dòng trải rộng cân đối theo chiều ngang hộp chữ nếu là câu tự viết (prose)
    let layout = bestAny;
    if (!lucBatLines) {
        if (bestFourLines && bestFourLines.fontSize >= Math.max(Math.floor(45 * scale), bestAny.fontSize - Math.ceil(3 * scale))) {
            layout = bestFourLines;
        }
        if (bestThreeLines && bestThreeLines.fontSize >= layout.fontSize - Math.ceil(3 * scale)) {
            layout = bestThreeLines;
        }
    }

    if (layout) {
        if (layout.titleLines && layout.titleLines.length > 1) {
            ctx.font = recipientFont(layout.recFontSize);
            layout.titleLines = balanceWrapLines(ctx, recipientLine, maxWidth, layout.titleLines);
        }
        if (!lucBatLines && layout.lines && layout.lines.length > 1) {
            ctx.font = quoteFont(layout.fontSize);
            layout.lines = balanceWrapLines(ctx, text, maxWidth, layout.lines);
        }
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

    let quoteStartY = startBlockY + layout.fontSize * 0.56;

    if (layout.recipientLine && layout.titleLines && layout.titleLines.length > 0 && layout.recFontSize > 0) {
        ctx.save();
        ctx.font = recipientFont(layout.recFontSize);
        ctx.fillStyle = theme.recipientColor;
        ctx.shadowColor = theme.shadowRgba;
        ctx.shadowBlur = Math.floor(layout.recFontSize * 0.22);
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = Math.floor(layout.recFontSize * 0.05);

        const firstTitleY = startBlockY + layout.recFontSize * 0.54;
        layout.titleLines.forEach((tLine, idx) => {
            ctx.fillText(tLine, centerX, firstTitleY + idx * layout.titleLineHeight, layout.maxWidth);
        });
        ctx.restore();

        // Đường kẻ trang trí kim cương mảnh ngăn cách rõ ràng giữa Tiêu đề và Lời chúc
        const titleBottomY = startBlockY + layout.titleInkH;
        const divY = titleBottomY + layout.dividerSpace * 0.5;
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
        drawFourPointStarPath(ctx, centerX, divY, 5.2 * scale);
        ctx.fill();
        ctx.restore();

        quoteStartY = startBlockY + layout.recBlockH + layout.fontSize * 0.56;
    }

    const textGrad = ctx.createLinearGradient(0, quoteStartY - layout.fontSize * 0.56, 0, quoteStartY + (layout.lines.length - 1) * layout.lineHeight + layout.fontSize * 0.56);
    textGrad.addColorStop(0, theme.textTop);
    textGrad.addColorStop(0.5, theme.textMid);
    textGrad.addColorStop(1, theme.textBottom);

    ctx.shadowColor = theme.shadowRgba;
    ctx.shadowBlur = Math.floor(layout.fontSize * 0.28);
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