/* =====================================================================================
 * wish-bloom.js — ĐẠI CẢNH ONE-SHOT "NỤ HOA ƯỚC NGUYỆN" (Luồng "Lời chúc dành cho bạn")
 * -------------------------------------------------------------------------------------
 * Ánh sáng ước nguyện rơi xuống mặt hồ gương -> gợn sóng làm cả khu vườn bừng nở ->
 * một nụ hoa khổng lồ trồi lên & nở từng lớp cánh -> trong lòng hoa là bức thư ->
 * bức thư được nâng lên dâng tặng người xem.
 *
 * - Một đường máy quay liền mạch duy nhất (Hermite spline) + đường cong thời gian
 *   (speed-ramp / bullet-time) => không bao giờ "cắt cảnh" giật cục.
 * - Mọi chuyển động là hàm thuần của thời gian kể chuyện (tau) => khung hình rơi
 *   cũng không lệch nhịp, bỏ qua (skip) tức thì mà vẫn đúng trạng thái.
 * - Mọi texture (cánh hoa, quầng sáng, hàng cây, tia sáng...) được vẽ sẵn 1 lần.
 * - Cánh hoa là bề mặt 3D thật: mỗi cánh = 2 đoạn cong, chiếu phối cảnh + chiếu sáng
 *   theo pháp tuyến, phân lớp trước/sau phong bì DOM để phong bì "nằm trong lòng hoa".
 * ===================================================================================== */
(function () {
    'use strict';

    const TAU = Math.PI * 2;
    const DEG = Math.PI / 180;
    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const lerp = (a, b, t) => a + (b - a) * t;
    const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
    const easeOutCubic = (t) => { t = clamp01(t); const u = 1 - t; return 1 - u * u * u; };
    const easeInOutCubic = (t) => { t = clamp01(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    const easeOutBack = (t) => { t = clamp01(t); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

    function rng(seed) {
        let a = seed >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function hexToRgb(hex) {
        const h = hex.replace('#', '');
        const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
        return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
    }

    function makeCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w));
        c.height = Math.max(1, Math.round(h));
        return c;
    }

    // ---------------------------------------------------------------------------------
    // MỐC THỜI GIAN KỂ CHUYỆN (tau) — thời gian thực được co giãn bởi speedAt(tau)
    // ---------------------------------------------------------------------------------
    const T = {
        FALL: 0.70,     // đốm sáng bắt đầu rơi
        IMPACT: 1.60,   // chạm mặt hồ
        BUD: 1.95,      // nụ hoa trồi lên
        OPEN: 2.50,     // cánh hoa bắt đầu nở
        HEART: 3.05,    // lòng hoa mở rộng đón bức thư
        ENV_IN: 3.55,   // bức thư kết tinh trên vương miện hoa (khi các cánh đã mở hết)
        LIFT: 4.45,     // bức thư được nâng lên
        LAND: 5.45,     // bức thư dừng đúng tâm màn hình
        END: 5.60
    };

    // Speed-ramp: nhanh khi rơi, bullet-time khi chạm, chậm & ấm khi dâng tặng
    function speedAt(t) {
        if (t < 0.70) return 1.0;
        if (t < 1.50) return lerp(1.0, 1.75, smooth((t - 0.70) / 0.80));
        if (t < 1.60) return 1.75;
        if (t < 1.80) return 0.27;
        if (t < 2.30) return lerp(0.27, 1.10, smooth((t - 1.80) / 0.50));
        if (t < 3.60) return lerp(1.10, 1.25, smooth((t - 2.30) / 1.30));
        if (t < 4.40) return lerp(1.25, 0.95, smooth((t - 3.60) / 0.80));
        return lerp(0.95, 0.80, smooth((t - 4.40) / 1.20));
    }

    // ---------------------------------------------------------------------------------
    // ĐƯỜNG MÁY QUAY ONE-SHOT: [tau, yaw, bán kính, độ cao, độ cao điểm nhìn]
    // ---------------------------------------------------------------------------------
    const CAM_KEYS = [
        [0.00, -1.15, 720, 150, 330],
        [0.70, -1.10, 700, 145, 315],
        [1.25, -0.98, 610, 105, 125],
        [1.60, -0.90, 540, 62, 24],
        [1.95, -0.80, 500, 52, 36],
        [2.60, -0.52, 470, 88, 72],
        [3.20, -0.24, 430, 175, 88],
        [3.75, -0.06, 330, 300, 96],
        [4.40, 0.00, 215, 360, 96],
        [5.00, 0.00, 262, 300, 100],
        [5.60, 0.00, 310, 248, 104]
    ];
    const CAM_TAN = CAM_KEYS.map((k, i) => {
        const out = [0, 0, 0, 0, 0];
        if (i === 0 || i === CAM_KEYS.length - 1) return out;
        const prev = CAM_KEYS[i - 1], next = CAM_KEYS[i + 1];
        for (let ch = 1; ch < 5; ch++) out[ch] = (next[ch] - prev[ch]) / (next[0] - prev[0]);
        return out;
    });

    function sampleCam(tau, out) {
        const n = CAM_KEYS.length;
        if (tau <= CAM_KEYS[0][0]) { for (let ch = 1; ch < 5; ch++) out[ch] = CAM_KEYS[0][ch]; return; }
        if (tau >= CAM_KEYS[n - 1][0]) { for (let ch = 1; ch < 5; ch++) out[ch] = CAM_KEYS[n - 1][ch]; return; }
        let i = 0;
        while (i < n - 2 && tau >= CAM_KEYS[i + 1][0]) i++;
        const k0 = CAM_KEYS[i], k1 = CAM_KEYS[i + 1];
        const m0 = CAM_TAN[i], m1 = CAM_TAN[i + 1];
        const h = k1[0] - k0[0];
        const s = (tau - k0[0]) / h;
        const s2 = s * s, s3 = s2 * s;
        const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
        for (let ch = 1; ch < 5; ch++) {
            out[ch] = h00 * k0[ch] + h10 * h * m0[ch] + h01 * k1[ch] + h11 * h * m1[ch];
        }
    }

    // ---------------------------------------------------------------------------------
    // 6 THẾ GIỚI CONCEPT (giữ khóa nội bộ tương thích link cũ)
    // ---------------------------------------------------------------------------------
    const THEMES = {
        // 🌺 Đại Hoa Trà — đêm hồng mận, hoa trà nhiều tầng
        bloom: {
            veil: '#0c0612', skyTop: '#0b0614', skyMid: '#2a0d2b', horizon: '#8f3a63', horizonGlow: '#ffa3bb',
            lakeFar: '#3a1434', lakeNear: '#120818', shore: '#12081a', mist: '255,190,210',
            mote: [255, 196, 214], accent: '#ffd36e', ripple: '255,205,222', firefly: '#ffe39a',
            celestial: { dir: [0.72, 0.40, -0.56], size: 92, color: '#fff3ea', glow: '255,214,206', kind: 'moon' },
            stars: 90, stem: '#1d4d34', stemHi: '#6fbf8a', leaf: ['#123d29', '#4a9a66'],
            petal: { shape: 'round', base: '#a10f48', mid: '#ff5c8a', tip: '#ffd8e2', rim: '#fff3f6', back0: '#7c0c38', back1: '#e0517f', shade: '#22040f', vein: '#7a0a34' },
            center: 'stamen', ground: 'rosette', groundPetals: 8, groundCount: 38,
            drift: 'petal', driftCount: 26, fireflies: 44,
            hero: {
                H: 72, envLift: 26, layers: [
                    { n: 9, len: 118, wid: 70, a0: 12, a1: 82, a2: 86, curl: 12, rb: 16, delay: 0.00, off: 0.00 },
                    { n: 8, len: 98, wid: 62, a0: 9, a1: 64, a2: 78, curl: 14, rb: 12, delay: 0.12, off: 0.35 },
                    { n: 7, len: 76, wid: 52, a0: 6, a1: 44, a2: 66, curl: 16, rb: 8, delay: 0.24, off: 0.15 },
                    { n: 5, len: 54, wid: 42, a0: 4, a1: 26, a2: 56, curl: 18, rb: 4, delay: 0.36, off: 0.60 }
                ]
            }
        },
        // 🦋 Hồ Điệp — rừng ngọc lục bảo, đóa sen kết từ cánh bướm vàng
        butterflies: {
            veil: '#04100c', skyTop: '#030b0a', skyMid: '#0b2a24', horizon: '#2f6f57', horizonGlow: '#ffe08a',
            lakeFar: '#123a30', lakeNear: '#04110d', shore: '#04100c', mist: '200,255,225',
            mote: [255, 228, 130], accent: '#ffe27a', ripple: '255,236,160', firefly: '#b6ffcf',
            celestial: { dir: [0.70, 0.45, -0.55], size: 90, color: '#fffbe6', glow: '255,240,190', kind: 'moon' },
            stars: 100, stem: '#174a33', stemHi: '#6fd29a', leaf: ['#0f3a28', '#3f9a68'],
            petal: { shape: 'wing', base: '#05523c', mid: '#d9a521', tip: '#fff0a0', rim: '#fffbe0', back0: '#033d2c', back1: '#9a7f14', shade: '#03120c', vein: '#2e2104' },
            center: 'orb', ground: 'lotus', groundPetals: 9, groundCount: 34,
            drift: 'sparkle', driftCount: 30, fireflies: 56, butterflies: true,
            hero: {
                H: 70, envLift: 24, layers: [
                    { n: 8, len: 128, wid: 98, a0: 10, a1: 74, a2: 80, curl: -6, rb: 14, delay: 0.00, off: 0.00 },
                    { n: 6, len: 96, wid: 76, a0: 6, a1: 52, a2: 68, curl: -4, rb: 8, delay: 0.15, off: 0.40 }
                ]
            }
        },
        // 🎀 Ruy-băng — khán phòng lụa, đóa nơ lụa satin khổng lồ & ngọc trai
        ribbon: {
            veil: '#0e0710', skyTop: '#0d0712', skyMid: '#2c1230', horizon: '#a8527a', horizonGlow: '#ffd7a8',
            lakeFar: '#3a1838', lakeNear: '#13081a', shore: '#11070f', mist: '255,215,230',
            mote: [255, 214, 232], accent: '#ffe1a8', ripple: '255,222,236', firefly: '#ffe9c4',
            celestial: { dir: [0.70, 0.42, -0.58], size: 90, color: '#fff6ee', glow: '255,226,214', kind: 'moon' },
            stars: 80, stem: '#d8a64a', stemHi: '#fff0c2', leaf: null, silkStem: true,
            petal: { shape: 'ribbon', base: '#a3164f', mid: '#f27aa6', tip: '#ffe9f1', rim: '#fffafc', back0: '#7d103c', back1: '#d0628d', shade: '#25050f', vein: '#ffffff' },
            center: 'pearls', ground: 'pearl', groundCount: 34,
            drift: 'sparkle', driftCount: 28, fireflies: 40,
            hero: {
                H: 70, envLift: 24, layers: [
                    { n: 10, len: 146, wid: 58, a0: 10, a1: 78, a2: 82, curl: 46, rb: 14, delay: 0.00, off: 0.00 },
                    { n: 8, len: 110, wid: 52, a0: 8, a1: 58, a2: 72, curl: 42, rb: 10, delay: 0.14, off: 0.30 },
                    { n: 6, len: 72, wid: 42, a0: 6, a1: 34, a2: 58, curl: 32, rb: 6, delay: 0.28, off: 0.10 }
                ]
            }
        },
        // 🌹 Hồng Pháp — đêm rượu vang, hồng nhung xoắn ốc tỉ lệ vàng
        galaxy: {
            veil: '#0d0306', skyTop: '#0b0307', skyMid: '#2d0716', horizon: '#83223a', horizonGlow: '#ffb38a',
            lakeFar: '#3a0c1a', lakeNear: '#11040a', shore: '#0f0306', mist: '255,180,190',
            mote: [255, 170, 182], accent: '#ffd27a', ripple: '255,196,206', firefly: '#ffd9a0',
            celestial: { dir: [0.72, 0.40, -0.56], size: 92, color: '#fff1ea', glow: '255,206,196', kind: 'moon' },
            stars: 90, stem: '#1a4026', stemHi: '#5fa274', leaf: ['#0f3320', '#3f8552'],
            petal: { shape: 'rose', base: '#3a000e', mid: '#9a0626', tip: '#e0193f', rim: '#ff8da0', back0: '#2c000a', back1: '#7a0820', shade: '#0e0002', vein: '#2a0008' },
            center: 'none', ground: 'rosette', groundPetals: 7, groundRose: true, groundCount: 36,
            drift: 'petal', driftCount: 24, fireflies: 44,
            hero: { H: 74, envLift: 28, spiral: { n: 22 } }
        },
        // 🌸 Anh Đào — đêm trăng tím, đóa anh đào khổng lồ & mưa cánh hoa
        sakura: {
            veil: '#070612', skyTop: '#060614', skyMid: '#1b1638', horizon: '#64508a', horizonGlow: '#ffc8de',
            lakeFar: '#241c3e', lakeNear: '#0a0816', shore: '#080714', mist: '230,220,255',
            mote: [255, 205, 226], accent: '#fff0f6', ripple: '255,220,236', firefly: '#ffe6f0',
            celestial: { dir: [0.62, 0.50, -0.60], size: 150, color: '#fffaf2', glow: '255,230,240', kind: 'moon' },
            stars: 110, stem: '#3b2a2a', stemHi: '#8a6a60', leaf: ['#2a4a30', '#5c9a6a'],
            petal: { shape: 'sakura', base: '#ff7aa6', mid: '#ffc2d6', tip: '#fff6f9', rim: '#ffffff', back0: '#f28bb0', back1: '#ffd3e2', shade: '#2a0d1c', vein: '#e86a96' },
            center: 'stamen-pink', ground: 'rosette', groundPetals: 5, groundCount: 40,
            drift: 'petal', driftCount: 56, fireflies: 36,
            hero: {
                H: 70, envLift: 24, layers: [
                    { n: 5, len: 112, wid: 100, a0: 10, a1: 80, a2: 86, curl: 10, rb: 10, delay: 0.00, off: 0.00 },
                    { n: 5, len: 86, wid: 80, a0: 7, a1: 60, a2: 74, curl: 12, rb: 6, delay: 0.16, off: TAU / 10 }
                ]
            }
        },
        // 🌷 Tulip — bình minh đào cam, tulip hoàng gia đón nắng
        hearts: {
            veil: '#0b0710', skyTop: '#120b26', skyMid: '#4a2a52', horizon: '#e0805e', horizonGlow: '#ffd59a',
            lakeFar: '#6b3a4a', lakeNear: '#170c18', shore: '#1a0d18', mist: '255,215,190',
            mote: [255, 206, 150], accent: '#ffd166', ripple: '255,220,180', firefly: '#fff1b8',
            celestial: { dir: [0.55, 0.06, -0.83], size: 120, color: '#fff4dc', glow: '255,190,120', kind: 'sun' },
            stars: 30, stem: '#2a6a3a', stemHi: '#7cc48a', leaf: ['#1f5a30', '#62b070'],
            petal: { shape: 'tulip', base: '#ffd36a', mid: '#ff9473', tip: '#ff6a88', rim: '#fff4dc', back0: '#ff8a5c', back1: '#ffb8a0', shade: '#4a1a0c', vein: '#e0684a' },
            center: 'stamen', ground: 'tulip', groundCount: 34,
            drift: 'pollen', driftCount: 30, fireflies: 32,
            hero: {
                H: 96, envLift: 40, layers: [
                    { n: 3, len: 132, wid: 104, a0: 6, a1: 30, a2: 62, curl: -8, rb: 10, delay: 0.00, off: 0.00 },
                    { n: 3, len: 122, wid: 96, a0: 4, a1: 20, a2: 52, curl: -6, rb: 6, delay: 0.12, off: TAU / 6 }
                ]
            }
        }
    };

    function buildPetalList(th) {
        const list = [];
        const toneR = rng(13);
        if (th.hero.spiral) {
            const n = th.hero.spiral.n;
            for (let i = 0; i < n; i++) {
                const t = i / (n - 1);
                const a1 = 6 + 70 * Math.pow(t, 1.25);
                list.push({
                    phi: i * 137.508 * DEG,
                    len: 42 + 86 * t, wid: 42 + 48 * t,
                    a0: 2 + 8 * t, a1, a2: Math.max(a1 + 4, 34 + 46 * t),
                    curl: 20 + 12 * t, rb: 2 + 10 * t,
                    delay: (1 - t) * 0.42, tone: toneR() - 0.5, ld: 1 - t
                });
            }
            return list;
        }
        th.hero.layers.forEach((L, li, arr) => {
            for (let i = 0; i < L.n; i++) {
                list.push({
                    phi: L.off + (i / L.n) * TAU,
                    len: L.len, wid: L.wid, a0: L.a0, a1: L.a1, a2: L.a2,
                    curl: L.curl, rb: L.rb, delay: L.delay, tone: toneR() - 0.5,
                    ld: arr.length > 1 ? li / (arr.length - 1) : 0
                });
            }
        });
        return list;
    }

    // ---------------------------------------------------------------------------------
    // TEXTURE VẼ SẴN (Pre-baked) — mỗi concept build đúng 1 lần
    // ---------------------------------------------------------------------------------
    const PW = 128, PH = 256;

    function petalPath(shape, w = PW, h = PH) {
        const sx = w / PW, sy = h / PH;
        const p = new Path2D();
        const M = (x, y) => p.moveTo(x * sx, y * sy);
        const L = (x, y) => p.lineTo(x * sx, y * sy);
        const Cb = (a, b, c, d, e, f) => p.bezierCurveTo(a * sx, b * sy, c * sx, d * sy, e * sx, f * sy);
        switch (shape) {
            case 'rose':
                M(64, 254); Cb(16, 222, 0, 124, 8, 56); Cb(14, 16, 42, 6, 64, 20); Cb(86, 6, 114, 16, 120, 56); Cb(128, 124, 112, 222, 64, 254);
                break;
            case 'tulip':
                M(64, 254); Cb(12, 226, 4, 112, 24, 46); Cb(36, 16, 54, 4, 64, 0); Cb(74, 4, 92, 16, 104, 46); Cb(124, 112, 116, 226, 64, 254);
                break;
            case 'sakura':
                M(64, 254); Cb(14, 214, 2, 110, 20, 40); Cb(28, 14, 50, 8, 58, 22); L(64, 42); L(70, 22); Cb(78, 8, 100, 14, 108, 40); Cb(126, 110, 114, 214, 64, 254);
                break;
            case 'wing':
                M(64, 254); Cb(18, 230, 0, 150, 10, 82); Cb(18, 22, 70, 0, 102, 24); Cb(128, 46, 122, 122, 98, 170); Cb(86, 202, 76, 232, 64, 254);
                break;
            case 'ribbon':
                M(46, 256); Cb(40, 180, 26, 110, 30, 56); Cb(32, 12, 96, 12, 98, 56); Cb(102, 110, 88, 180, 82, 256);
                break;
            default: // round (hoa trà)
                M(64, 254); Cb(8, 210, -4, 92, 28, 30); Cb(46, 2, 82, 2, 100, 30); Cb(132, 92, 120, 210, 64, 254);
        }
        p.closePath();
        return p;
    }

    function buildPetalSprites(pal) {
        const path = petalPath(pal.shape);
        const front = makeCanvas(PW, PH), back = makeCanvas(PW, PH), shade = makeCanvas(PW, PH);

        // Mặt trong (rực rỡ)
        let g = front.getContext('2d');
        let lg = g.createLinearGradient(0, PH, 0, 0);
        lg.addColorStop(0, pal.base);
        lg.addColorStop(0.48, pal.mid);
        lg.addColorStop(1, pal.tip);
        g.fillStyle = lg;
        g.fill(path);
        g.save();
        g.clip(path);
        const cup = g.createLinearGradient(0, 0, PW, 0);
        cup.addColorStop(0, 'rgba(0,0,0,0.24)');
        cup.addColorStop(0.32, 'rgba(0,0,0,0)');
        cup.addColorStop(0.68, 'rgba(0,0,0,0)');
        cup.addColorStop(1, 'rgba(0,0,0,0.24)');
        g.fillStyle = cup;
        g.fillRect(0, 0, PW, PH);
        const baseSh = g.createLinearGradient(0, PH, 0, PH * 0.5);
        baseSh.addColorStop(0, 'rgba(0,0,0,0.36)');
        baseSh.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = baseSh;
        g.fillRect(0, 0, PW, PH);
        const hl = g.createRadialGradient(PW * 0.42, PH * 0.30, 4, PW * 0.42, PH * 0.30, PW * 0.72);
        hl.addColorStop(0, 'rgba(255,255,255,0.42)');
        hl.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = hl;
        g.fillRect(0, 0, PW, PH);

        if (pal.shape === 'ribbon') {
            // Vân satin bóng loáng chạy dọc dải lụa
            const sat = g.createLinearGradient(0, 0, PW, 0);
            sat.addColorStop(0.0, 'rgba(255,255,255,0)');
            sat.addColorStop(0.30, 'rgba(255,255,255,0.0)');
            sat.addColorStop(0.38, 'rgba(255,255,255,0.55)');
            sat.addColorStop(0.46, 'rgba(255,255,255,0.0)');
            sat.addColorStop(0.66, 'rgba(120,0,40,0.18)');
            sat.addColorStop(1.0, 'rgba(255,255,255,0)');
            g.fillStyle = sat;
            g.fillRect(0, 0, PW, PH);
            g.strokeStyle = 'rgba(255,240,200,0.75)';
            g.lineWidth = 2;
            g.stroke(path);
        } else {
            g.strokeStyle = pal.vein;
            g.globalAlpha = 0.2;
            g.lineWidth = 1.3;
            for (let i = -3; i <= 3; i++) {
                g.beginPath();
                g.moveTo(PW / 2, PH);
                g.quadraticCurveTo(PW / 2 + i * 9, PH * 0.56, PW / 2 + i * 16, PH * 0.12);
                g.stroke();
            }
            g.globalAlpha = 1;
        }

        if (pal.shape === 'wing') {
            // Viền cánh bướm sẫm + đốm mắt ngọc trai
            g.lineWidth = 18;
            g.strokeStyle = 'rgba(30,18,2,0.55)';
            g.stroke(path);
            g.fillStyle = 'rgba(255,252,230,0.9)';
            [[30, 70, 5], [44, 46, 4], [66, 34, 4.5], [88, 44, 4], [100, 96, 4.5], [92, 140, 3.5]].forEach(([x, y, r]) => {
                g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
            });
            const iri = g.createLinearGradient(0, PH * 0.2, PW, PH * 0.7);
            iri.addColorStop(0, 'rgba(120,255,210,0.0)');
            iri.addColorStop(0.5, 'rgba(160,255,220,0.22)');
            iri.addColorStop(1, 'rgba(255,220,120,0.0)');
            g.fillStyle = iri;
            g.fillRect(0, 0, PW, PH);
        }

        g.lineWidth = 7;
        g.strokeStyle = pal.rim;
        g.globalAlpha = 0.5;
        g.stroke(path);
        g.globalAlpha = 1;
        g.restore();

        // Mặt ngoài (trầm hơn)
        g = back.getContext('2d');
        lg = g.createLinearGradient(0, PH, 0, 0);
        lg.addColorStop(0, pal.back0);
        lg.addColorStop(1, pal.back1);
        g.fillStyle = lg;
        g.fill(path);
        g.save();
        g.clip(path);
        const cup2 = g.createLinearGradient(0, 0, PW, 0);
        cup2.addColorStop(0, 'rgba(255,255,255,0.10)');
        cup2.addColorStop(0.5, 'rgba(0,0,0,0.16)');
        cup2.addColorStop(1, 'rgba(255,255,255,0.10)');
        g.fillStyle = cup2;
        g.fillRect(0, 0, PW, PH);
        g.lineWidth = 6;
        g.strokeStyle = pal.rim;
        g.globalAlpha = 0.28;
        g.stroke(path);
        g.restore();

        // Lớp bóng đổ để chiếu sáng theo pháp tuyến
        g = shade.getContext('2d');
        g.fillStyle = pal.shade;
        g.fill(path);
        return { front, back, shade };
    }

    function buildLeafSprite(colors) {
        if (!colors) return null;
        const w = 64, h = 160;
        const c = makeCanvas(w, h), g = c.getContext('2d');
        const p = new Path2D();
        p.moveTo(32, 160);
        p.bezierCurveTo(2, 118, 2, 46, 32, 0);
        p.bezierCurveTo(62, 46, 62, 118, 32, 160);
        p.closePath();
        const lg = g.createLinearGradient(0, h, 0, 0);
        lg.addColorStop(0, colors[0]);
        lg.addColorStop(1, colors[1]);
        g.fillStyle = lg;
        g.fill(p);
        g.save();
        g.clip(p);
        g.strokeStyle = 'rgba(255,255,255,0.28)';
        g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(32, 158); g.lineTo(32, 8); g.stroke();
        g.lineWidth = 1;
        for (let i = 1; i < 7; i++) {
            const y = 150 - i * 20;
            g.beginPath(); g.moveTo(32, y); g.lineTo(10, y - 16); g.moveTo(32, y); g.lineTo(54, y - 16); g.stroke();
        }
        const sh = g.createLinearGradient(0, 0, w, 0);
        sh.addColorStop(0, 'rgba(0,0,0,0.25)');
        sh.addColorStop(0.5, 'rgba(0,0,0,0)');
        sh.addColorStop(1, 'rgba(255,255,255,0.12)');
        g.fillStyle = sh;
        g.fillRect(0, 0, w, h);
        g.restore();
        return c;
    }

    function buildGlow(rgb, core) {
        const s = 128, c = makeCanvas(s, s), g = c.getContext('2d');
        const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        if (core) {
            rg.addColorStop(0, 'rgba(255,255,255,1)');
            rg.addColorStop(0.09, 'rgba(255,255,255,0.95)');
            rg.addColorStop(0.22, `rgba(${rgb},0.72)`);
            rg.addColorStop(0.5, `rgba(${rgb},0.2)`);
            rg.addColorStop(1, `rgba(${rgb},0)`);
        } else {
            rg.addColorStop(0, `rgba(${rgb},0.62)`);
            rg.addColorStop(0.42, `rgba(${rgb},0.2)`);
            rg.addColorStop(1, `rgba(${rgb},0)`);
        }
        g.fillStyle = rg;
        g.fillRect(0, 0, s, s);
        return c;
    }

    function buildFlare() {
        const s = 256, c = makeCanvas(s, s), g = c.getContext('2d');
        g.globalCompositeOperation = 'lighter';
        const streak = (rot, len, thick, a) => {
            g.save();
            g.translate(128, 128);
            g.rotate(rot);
            g.scale(1, thick);
            const rg = g.createRadialGradient(0, 0, 0, 0, 0, len);
            rg.addColorStop(0, `rgba(255,255,255,${a})`);
            rg.addColorStop(0.28, `rgba(255,250,236,${a * 0.38})`);
            rg.addColorStop(1, 'rgba(255,240,220,0)');
            g.fillStyle = rg;
            g.beginPath(); g.arc(0, 0, len, 0, TAU); g.fill();
            g.restore();
        };
        streak(0, 128, 0.05, 1);
        streak(Math.PI / 2, 128, 0.05, 1);
        streak(Math.PI / 4, 76, 0.04, 0.5);
        streak(-Math.PI / 4, 76, 0.04, 0.5);
        return c;
    }

    function buildRays(rgb) {
        const s = 512, c = makeCanvas(s, s), g = c.getContext('2d');
        const R = rng(77);
        const rg = g.createRadialGradient(256, 256, 0, 256, 256, 256);
        rg.addColorStop(0, `rgba(${rgb},0.6)`);
        rg.addColorStop(0.3, `rgba(${rgb},0.24)`);
        rg.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = rg;
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 18; i++) {
            const ang = (i / 18) * TAU + R() * 0.2;
            const half = 0.022 + R() * 0.05;
            const len = 170 + R() * 86;
            g.beginPath();
            g.moveTo(256, 256);
            g.arc(256, 256, len, ang - half, ang + half);
            g.closePath();
            g.fill();
        }
        return c;
    }

    function buildPillar(rgb) {
        const w = 64, h = 512, c = makeCanvas(w, h), g = c.getContext('2d');
        const hg = g.createLinearGradient(0, 0, w, 0);
        hg.addColorStop(0, `rgba(${rgb},0)`);
        hg.addColorStop(0.32, `rgba(${rgb},0.45)`);
        hg.addColorStop(0.5, 'rgba(255,255,255,1)');
        hg.addColorStop(0.68, `rgba(${rgb},0.45)`);
        hg.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = hg;
        g.fillRect(0, 0, w, h);
        g.globalCompositeOperation = 'destination-in';
        const vg = g.createLinearGradient(0, h, 0, 0);
        vg.addColorStop(0, 'rgba(0,0,0,1)');
        vg.addColorStop(0.55, 'rgba(0,0,0,0.42)');
        vg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = vg;
        g.fillRect(0, 0, w, h);
        return c;
    }

    function buildHedge(th, seed) {
        const w = 512, h = 180, c = makeCanvas(w, h), g = c.getContext('2d');
        const R = rng(seed * 131 + 17);
        g.fillStyle = th.shore;
        for (let i = 0; i < 11; i++) {
            const x = R() * w, r = 28 + R() * 42;
            g.beginPath(); g.arc(x, h - r * 0.5, r, 0, TAU); g.fill();
        }
        for (let i = 0; i < 3; i++) {
            const x = 40 + R() * (w - 80);
            const ry = 44 + R() * 40;
            g.beginPath(); g.ellipse(x, h - 20 - ry * 0.85, 20 + R() * 14, ry, 0, 0, TAU); g.fill();
        }
        g.fillRect(0, h - 22, w, 22);
        g.globalCompositeOperation = 'source-atop';
        const rim = g.createLinearGradient(0, 0, 0, h);
        rim.addColorStop(0, `rgba(${hexToRgb(th.horizonGlow)},0.3)`);
        rim.addColorStop(0.4, `rgba(${hexToRgb(th.horizonGlow)},0.05)`);
        rim.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rim;
        g.fillRect(0, 0, w, h);
        const acc = hexToRgb(th.accent);
        for (let i = 0; i < 6; i++) {
            const x = R() * w, y = 110 + R() * 60, r = 3 + R() * 4;
            const lg = g.createRadialGradient(x, y, 0, x, y, r * 3);
            lg.addColorStop(0, `rgba(${acc},0.95)`);
            lg.addColorStop(1, `rgba(${acc},0)`);
            g.fillStyle = lg;
            g.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
        }
        return c;
    }

    function buildBand(rgb) {
        const c = makeCanvas(8, 128), g = c.getContext('2d');
        const lg = g.createLinearGradient(0, 0, 0, 128);
        lg.addColorStop(0, `rgba(${rgb},0)`);
        lg.addColorStop(0.5, `rgba(${rgb},0.55)`);
        lg.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = lg;
        g.fillRect(0, 0, 8, 128);
        return c;
    }

    function buildMist(rgb) {
        const c = makeCanvas(256, 64), g = c.getContext('2d');
        g.translate(128, 32);
        g.scale(1, 0.25);
        const rg = g.createRadialGradient(0, 0, 0, 0, 0, 128);
        rg.addColorStop(0, `rgba(${rgb},0.5)`);
        rg.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = rg;
        g.beginPath(); g.arc(0, 0, 128, 0, TAU); g.fill();
        return c;
    }

    function buildPearl() {
        const c = makeCanvas(64, 64), g = c.getContext('2d');
        const rg = g.createRadialGradient(24, 22, 2, 32, 32, 30);
        rg.addColorStop(0, '#ffffff');
        rg.addColorStop(0.35, '#fff4f8');
        rg.addColorStop(0.8, '#e8c6d4');
        rg.addColorStop(1, '#b4869c');
        g.fillStyle = rg;
        g.beginPath(); g.arc(32, 32, 28, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,236,200,0.6)';
        g.lineWidth = 1.5;
        g.stroke();
        return c;
    }

    function buildGroundSprite(th, P) {
        if (th.ground === 'pearl') return { img: buildPearl(), mode: 'sphere' };
        if (th.ground === 'tulip') {
            const w = 96, h = 160, c = makeCanvas(w, h), g = c.getContext('2d');
            g.strokeStyle = th.stem;
            g.lineWidth = 5;
            g.lineCap = 'round';
            g.beginPath(); g.moveTo(48, 160); g.quadraticCurveTo(44, 112, 48, 74); g.stroke();
            const leaf = buildLeafSprite(th.leaf);
            g.save(); g.translate(46, 150); g.rotate(-0.5); g.drawImage(leaf, -14, -78, 28, 78); g.restore();
            g.save(); g.translate(50, 156); g.rotate(0.42); g.drawImage(leaf, -12, -64, 24, 64); g.restore();
            g.save(); g.translate(48, 86); g.rotate(-0.34); g.drawImage(P.back, -21, -70, 42, 72); g.restore();
            g.save(); g.translate(48, 86); g.rotate(0.34); g.drawImage(P.back, -21, -70, 42, 72); g.restore();
            g.drawImage(P.front, 48 - 23, 86 - 72, 46, 74);
            return { img: c, mode: 'upright', aspect: h / w };
        }
        let PP = P;
        if (th.ground === 'lotus') {
            PP = buildPetalSprites({ shape: 'tulip', base: '#0e6a50', mid: '#f2cf63', tip: '#fff6c8', rim: '#ffffff', back0: '#0b5040', back1: '#c9a63c', shade: '#03140e', vein: '#6b5a12' });
        }
        const s = 128, c = makeCanvas(s, s), g = c.getContext('2d');
        g.translate(64, 64);
        const n = th.groundPetals || 8;
        const layers = th.groundRose ? [[n, 60, 40, 0], [n - 1, 46, 34, 0.4], [n - 2, 32, 28, 0.9], [4, 20, 20, 1.3]] : [[n, 60, 36, 0], [n, 44, 30, Math.PI / n], [Math.max(4, n - 3), 28, 22, 0.2]];
        layers.forEach(([cnt, len, wid, off]) => {
            for (let i = 0; i < cnt; i++) {
                g.save();
                g.rotate(off + (i / cnt) * TAU);
                g.drawImage(PP.front, -wid / 2, -len, wid, len);
                g.restore();
            }
        });
        const dk = g.createRadialGradient(0, 0, 0, 0, 0, 34);
        dk.addColorStop(0, 'rgba(0,0,0,0.28)');
        dk.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = dk;
        g.fillRect(-64, -64, 128, 128);
        g.globalCompositeOperation = 'source-over';
        if (!th.groundRose) {
            g.fillStyle = th.accent;
            for (let i = 0; i < 10; i++) {
                const a = (i / 10) * TAU;
                g.beginPath(); g.arc(Math.cos(a) * 7, Math.sin(a) * 7, 2.2, 0, TAU); g.fill();
            }
            g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill();
        }
        return { img: c, mode: 'flat' };
    }

    function buildCenterSprite(th) {
        if (th.center === 'none' || th.center === 'pearls') return null;
        const s = 128, c = makeCanvas(s, s), g = c.getContext('2d');
        const acc = hexToRgb(th.accent);
        const glow = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        glow.addColorStop(0, `rgba(${acc},0.95)`);
        glow.addColorStop(0.35, `rgba(${acc},0.35)`);
        glow.addColorStop(1, `rgba(${acc},0)`);
        g.fillStyle = glow;
        g.fillRect(0, 0, s, s);
        if (th.center === 'orb') {
            const core = g.createRadialGradient(64, 64, 0, 64, 64, 22);
            core.addColorStop(0, '#ffffff');
            core.addColorStop(1, 'rgba(255,240,180,0)');
            g.fillStyle = core;
            g.beginPath(); g.arc(64, 64, 22, 0, TAU); g.fill();
            return c;
        }
        const R = rng(5);
        const fil = th.center === 'stamen-pink' ? '#ffb3cc' : '#ffe39a';
        g.lineCap = 'round';
        for (let i = 0; i < 30; i++) {
            const a = (i / 30) * TAU + R() * 0.15;
            const len = 26 + R() * 24;
            const x = 64 + Math.cos(a) * len, y = 64 + Math.sin(a) * len;
            g.strokeStyle = fil;
            g.lineWidth = 1.6;
            g.beginPath(); g.moveTo(64, 64); g.lineTo(x, y); g.stroke();
            g.fillStyle = '#ffcf3d';
            g.beginPath(); g.arc(x, y, 3.2, 0, TAU); g.fill();
            g.fillStyle = 'rgba(255,255,255,0.8)';
            g.beginPath(); g.arc(x - 1, y - 1, 1.1, 0, TAU); g.fill();
        }
        const disc = g.createRadialGradient(60, 60, 1, 64, 64, 13);
        disc.addColorStop(0, '#fff7cf');
        disc.addColorStop(1, '#d99a1e');
        g.fillStyle = disc;
        g.beginPath(); g.arc(64, 64, 12, 0, TAU); g.fill();
        return c;
    }

    function buildShadow() {
        const s = 128, c = makeCanvas(s, s), g = c.getContext('2d');
        const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        rg.addColorStop(0, 'rgba(8,2,6,0.85)');
        rg.addColorStop(0.55, 'rgba(8,2,6,0.45)');
        rg.addColorStop(1, 'rgba(8,2,6,0)');
        g.fillStyle = rg;
        g.fillRect(0, 0, s, s);
        return c;
    }

    function buildDisc(ce) {
        const s = 128, c = makeCanvas(s, s), g = c.getContext('2d');
        const rg = g.createRadialGradient(54, 52, 4, 64, 64, 62);
        rg.addColorStop(0, '#ffffff');
        rg.addColorStop(0.55, ce.color);
        rg.addColorStop(0.92, `rgba(${ce.glow},0.95)`);
        rg.addColorStop(1, `rgba(${ce.glow},0)`);
        g.fillStyle = rg;
        g.beginPath(); g.arc(64, 64, 62, 0, TAU); g.fill();
        if (ce.kind === 'moon') {
            g.globalAlpha = 0.07;
            g.fillStyle = '#6a5a70';
            [[48, 50, 12], [78, 72, 9], [62, 88, 7], [86, 46, 6]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
        }
        return c;
    }

    function buildFlyWing(pal) {
        const w = 64, h = 96, c = makeCanvas(w, h), g = c.getContext('2d');
        const p = new Path2D();
        p.moveTo(64, 46); p.bezierCurveTo(40, 0, 0, 4, 6, 34); p.bezierCurveTo(10, 48, 36, 52, 64, 52);
        p.moveTo(64, 52); p.bezierCurveTo(30, 60, 14, 92, 40, 92); p.bezierCurveTo(54, 92, 62, 70, 64, 56);
        const lg = g.createLinearGradient(64, 48, 0, 20);
        lg.addColorStop(0, pal.base);
        lg.addColorStop(0.45, pal.mid);
        lg.addColorStop(1, pal.tip);
        g.fillStyle = lg;
        g.fill(p);
        g.save();
        g.clip(p);
        g.lineWidth = 7;
        g.strokeStyle = 'rgba(30,18,2,0.6)';
        g.stroke(p);
        g.fillStyle = 'rgba(255,252,230,0.95)';
        [[12, 30, 2.4], [22, 18, 2], [34, 82, 2.2]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
        g.restore();
        return c;
    }

    const spriteCache = {};
    function buildThemeSprites(id) {
        if (spriteCache[id]) return spriteCache[id];
        const th = THEMES[id];
        const S = {};
        S.petal = buildPetalSprites(th.petal);
        S.leaf = buildLeafSprite(th.leaf);
        S.glowMote = buildGlow(th.mote.join(','), true);
        S.glowAccent = buildGlow(hexToRgb(th.accent), true);
        S.softAccent = buildGlow(hexToRgb(th.accent), false);
        S.softRipple = buildGlow(th.ripple, false);
        S.softCelestial = buildGlow(th.celestial.glow, false);
        S.flare = buildFlare();
        S.rays = buildRays(th.ripple);
        S.pillar = buildPillar(th.mote.join(','));
        S.hedges = [buildHedge(th, 1), buildHedge(th, 2), buildHedge(th, 3)];
        S.band = buildBand(hexToRgb(th.horizonGlow));
        S.mist = buildMist(th.mist);
        S.ground = buildGroundSprite(th, S.petal);
        S.center = buildCenterSprite(th);
        S.pearl = buildPearl();
        S.wing = th.butterflies ? buildFlyWing(th.petal) : null;
        S.disc = buildDisc(th.celestial);
        S.shadow = buildShadow();
        spriteCache[id] = S;
        return S;
    }

    // Xuất các phần dùng chung cho phần 2 (scene) trong cùng file
    window.__WishBloomCore = {
        TAU, DEG, clamp01, lerp, smooth, easeOutCubic, easeInOutCubic, easeOutBack, rng, hexToRgb, makeCanvas,
        T, speedAt, sampleCam, THEMES, buildPetalList, buildThemeSprites
    };
})();

/* ====================== PHẦN 2: ĐẠO DIỄN CẢNH & KẾT XUẤT TỪNG KHUNG HÌNH ====================== */
(function () {
    'use strict';
    const C = window.__WishBloomCore;
    if (!C) return;
    const { TAU, DEG, clamp01, lerp, smooth, easeOutCubic, easeInOutCubic, easeOutBack, rng, makeCanvas, T, speedAt, sampleCam, THEMES, buildPetalList, buildThemeSprites } = C;

    const ENV_W = 128;           // bề ngang bức thư trong thế giới 3D
    const L_DIR = (() => { const x = -0.35, y = 0.82, z = 0.45, l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; })();
    const SEG1_SY = 256 * 0.44, SEG1_SH = 256 * 0.56, SEG2_SH = 256 * 0.44 + 6, SEG2_DH = 1 + 6 / (256 * 0.44);

    function createScene(motionId, stageEl) {
        const id = THEMES[motionId] ? motionId : 'bloom';
        const th = THEMES[id];
        const S = buildThemeSprites(id);
        const petals = buildPetalList(th);
        const R = rng(911 + id.length * 7919 + id.charCodeAt(0) * 31);
        const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        const rgbRipple = th.ripple;

        // ---------- Dựng thế giới (tất cả tất định theo seed) ----------
        const ground = [];
        for (let i = 0; i < th.groundCount; i++) {
            const r = 195 + 500 * Math.sqrt(R());
            const a = R() * TAU;
            ground.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, born: T.IMPACT + (r - 40) / 330, size: 36 + R() * 26, rot: R() * TAU, spin: (R() - 0.5) * 0.35, bob: R() * TAU, sx: 0, sy: 0, sz: 0, k: 0, sinE: 1, vis: false });
        }
        const flies = [];
        for (let i = 0; i < th.fireflies; i++) {
            const r = 185 + 600 * Math.sqrt(R()), a = R() * TAU;
            flies.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: 14 + R() * 150, p1: R() * TAU, p2: R() * TAU, p3: R() * TAU, s: 0.6 + R() * 0.8 });
        }
        const drift = [];
        for (let i = 0; i < th.driftCount; i++) {
            const dr = 190 + 420 * Math.sqrt(R()), da = R() * TAU;
            drift.push({ x0: Math.cos(da) * dr, z0: Math.sin(da) * dr, sp: 22 + R() * 26, ph: R(), rs: (R() - 0.5) * 3, fs: 1.5 + R() * 2.5, sz: 0.7 + R() * 0.6 });
        }
        const stars = [];
        for (let i = 0; i < th.stars; i++) {
            const az = R() * TAU, el = (4 + Math.pow(R(), 0.7) * 70) * DEG;
            stars.push({ dx: Math.cos(el) * Math.cos(az), dy: Math.sin(el), dz: Math.cos(el) * Math.sin(az), s: R() < 0.12 ? 2.2 : 1 + R() * 0.8, tw: R() * TAU, sp: 1 + R() * 2.5 });
        }
        const hedges = [];
        for (let i = 0; i < 26; i++) {
            const a = (i / 26) * TAU + R() * 0.12;
            hedges.push({ x: Math.cos(a) * 1500, z: Math.sin(a) * 1500, sc: 0.6 + R() * 0.5, v: i % 3 });
        }
        const shimmer = [];
        for (let i = 0; i < 64; i++) shimmer.push({ x: (R() - 0.5) * 1600, z: (R() - 0.5) * 1600, ph: R() * TAU, w: 6 + R() * 12 });
        const splash = [];
        for (let i = 0; i < 26; i++) splash.push({ v: 260 + R() * 300, el: (52 + R() * 34) * DEG, az: R() * TAU });
        const sparks = [];
        for (let i = 0; i < 14; i++) sparks.push({ jx: (R() - 0.5) * 30, jz: (R() - 0.5) * 30 });
        const burst = [];
        for (let i = 0; i < 22; i++) {
            const az = R() * TAU, el = (10 + R() * 70) * DEG;
            burst.push({ dx: Math.cos(el) * Math.cos(az), dy: Math.sin(el), dz: Math.cos(el) * Math.sin(az), d: 0.6 + R() * 0.6 });
        }
        const flyers = [];
        if (th.butterflies) {
            for (let i = 0; i < 14; i++) {
                const fromHeart = i >= 6;
                flyers.push({
                    born: fromHeart ? 4.05 + (i - 6) * 0.04 : T.IMPACT + 0.35 + R() * 0.45,
                    fromHeart, ox: (R() - 0.5) * 700, oz: (R() - 0.5) * 600,
                    rad: fromHeart ? 175 + R() * 130 : 120 + R() * 180, h: 60 + R() * 170, dir: R() < 0.5 ? -1 : 1, ph: R() * TAU, sz: 22 + R() * 12, fp: R() * TAU
                });
            }
        }

        // Độ cao vương miện hoa khi đã nở trọn vẹn (để bức thư luôn đậu PHÍA TRÊN mọi cánh hoa)
        let finalCrown = 0;
        petals.forEach((p) => {
            const a = p.a2 * DEG, c = p.curl * DEG;
            const hm = Math.cos(a) * p.len * 0.56;
            finalCrown = Math.max(finalCrown, hm, hm + Math.cos(a + c) * p.len * 0.44);
        });

        const sc = {
            tau: reduced ? 4.25 : 0, clock: 0, impactClock: -1, skipFlash: 0, finished: false,
            quality: 1, frameAvg: 1 / 60, skipped: reduced, vw: 0, vh: 0, M0: null,
            skyGrad: null, lakeGrad: null, vignette: null, gradCtx: null
        };

        // ---------- Nút Bỏ qua (kiểu game) ----------
        let skipBtn = null;
        if (stageEl) {
            skipBtn = document.createElement('button');
            skipBtn.type = 'button';
            skipBtn.className = 'wish-skip-btn';
            skipBtn.innerHTML = 'Bỏ qua <span aria-hidden="true">›</span>';
            skipBtn.addEventListener('click', (e) => { e.stopPropagation(); api.skip(); });
            stageEl.appendChild(skipBtn);
        }

        // ---------- Máy quay ----------
        const cam = { x: 0, y: 0, z: 0, fx: 0, fy: 0, fz: 0, rx: 0, rz: 0, ux: 0, uy: 0, uz: 0, f: 600, cx: 0, cy: 0, yaw: 0, hy: 0 };
        const KS = [0, 0, 0, 0, 0];

        function setCamera(px, py, pz, tY, vw, vh) {
            let fx = -px, fy = tY - py, fz = -pz;
            const fl = Math.hypot(fx, fy, fz) || 1;
            fx /= fl; fy /= fl; fz /= fl;
            let rx = -fz, rz = fx;
            const rl = Math.hypot(rx, rz) || 1;
            rx /= rl; rz /= rl;
            cam.x = px; cam.y = py; cam.z = pz;
            cam.fx = fx; cam.fy = fy; cam.fz = fz;
            cam.rx = rx; cam.rz = rz;
            cam.ux = -rz * fy; cam.uy = rz * fx - rx * fz; cam.uz = rx * fy;
            cam.f = Math.min(vw * 1.44, vh * 0.95);
            cam.cx = vw * 0.5;
            cam.cy = vh * 0.5;
            const pitch = Math.asin(Math.max(-0.999, Math.min(0.999, fy)));
            cam.hy = cam.cy + cam.f * Math.tan(pitch);
        }

        function updateCamera(vw, vh) {
            sampleCam(sc.tau, KS);
            const settle = smooth((sc.tau - 4.9) / 0.7);
            const yaw = KS[1] + Math.sin(sc.clock * 0.33) * 0.03 * settle;
            const rad = KS[2];
            const hgt = KS[3] + Math.sin(sc.clock * 0.47) * 4 * settle;
            let px = Math.sin(yaw) * rad + Math.sin(sc.clock * 0.8) * 2.0;
            let py = hgt + Math.sin(sc.clock * 1.1 + 1) * 1.4;
            const pz = Math.cos(yaw) * rad;
            if (sc.impactClock >= 0) {
                const e = sc.clock - sc.impactClock;
                if (e < 1.4) {
                    const amp = 8 * Math.exp(-e * 5);
                    px += Math.sin(e * 63) * amp;
                    py += Math.cos(e * 51) * amp * 0.6;
                }
            }
            cam.yaw = yaw;
            setCamera(px, py, pz, KS[4], vw, vh);
        }

        function project(x, y, z, o) {
            const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
            const zc = dx * cam.fx + dy * cam.fy + dz * cam.fz;
            if (zc < 6) { o.v = false; return false; }
            const k = cam.f / zc;
            o.x = cam.cx + (dx * cam.rx + dz * cam.rz) * k;
            o.y = cam.cy - (dx * cam.ux + dy * cam.uy + dz * cam.uz) * k;
            o.z = zc; o.k = k; o.v = true;
            return true;
        }
        function projectDir(dx, dy, dz, o) {
            const zc = dx * cam.fx + dy * cam.fy + dz * cam.fz;
            if (zc < 0.04) { o.v = false; return false; }
            const k = cam.f / zc;
            o.x = cam.cx + (dx * cam.rx + dz * cam.rz) * k;
            o.y = cam.cy - (dx * cam.ux + dy * cam.uy + dz * cam.uz) * k;
            o.v = true;
            return true;
        }

        const A = { x: 0, y: 0, z: 0, k: 0, v: false }, B = { ...A }, Cc = { ...A }, D = { ...A }, Q = { ...A }, Q2 = { ...A };

        // Vị trí khởi đầu của đốm sáng: khớp 100% với đốm sáng của màn chuyển cảnh CSS (50%, 26%)
        function computeM0(vw, vh) {
            sampleCam(0, KS);
            const yaw = KS[1];
            setCamera(Math.sin(yaw) * KS[2], KS[3], Math.cos(yaw) * KS[2], KS[4], vw, vh);
            const u = (0.5 * vw - cam.cx) / cam.f;
            const v = -(0.26 * vh - cam.cy) / cam.f;
            const Dd = 900;
            return {
                x: cam.x + Dd * (cam.fx + cam.rx * u + cam.ux * v),
                y: cam.y + Dd * (cam.fy + cam.uy * v),
                z: cam.z + Dd * (cam.fz + cam.rz * u + cam.uz * v)
            };
        }

        function rebuildViewCaches(g, vw, vh) {
            sc.vw = vw; sc.vh = vh;
            sc.M0 = computeM0(vw, vh);
            sc.gradCtx = g;
            sc.skyGrad = g.createLinearGradient(0, -vh * 1.25, 0, 0);
            sc.skyGrad.addColorStop(0, th.skyTop);
            sc.skyGrad.addColorStop(0.55, th.skyMid);
            sc.skyGrad.addColorStop(0.9, th.horizon);
            sc.skyGrad.addColorStop(1, th.horizonGlow);
            sc.lakeGrad = g.createLinearGradient(0, 0, 0, vh * 0.7);
            sc.lakeGrad.addColorStop(0, th.lakeFar);
            sc.lakeGrad.addColorStop(1, th.lakeNear);
            const vg = makeCanvas(vw, vh), vgg = vg.getContext('2d');
            const rg = vgg.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.32, vw / 2, vh / 2, Math.max(vw, vh) * 0.78);
            rg.addColorStop(0, 'rgba(0,0,0,0)');
            rg.addColorStop(1, 'rgba(0,0,0,0.58)');
            vgg.fillStyle = rg;
            vgg.fillRect(0, 0, vw, vh);
            sc.vignette = vg;
        }

        function motePos(tau, o) {
            const M0 = sc.M0;
            if (tau < T.FALL) {
                o.x = M0.x; o.y = M0.y + Math.sin(sc.clock * 1.8) * 5; o.z = M0.z;
                return;
            }
            const p = clamp01((tau - T.FALL) / (T.IMPACT - T.FALL));
            const s = Math.pow(p, 2.1);
            bez(s, o);
        }
        function bez(s, o) {
            const M0 = sc.M0;
            const cx = M0.x * 0.35, cy = M0.y * 0.55, cz = M0.z * 0.35;
            const a = (1 - s) * (1 - s), b = 2 * (1 - s) * s, c = s * s;
            o.x = a * M0.x + b * cx;
            o.y = a * M0.y + b * cy;
            o.z = a * M0.z + b * cz;
            void c;
        }

        // ---------- Hoa chủ (cánh hoa 3D thật) ----------
        const segPool = [];
        const segList = [];
        let segUsed = 0;
        function newSeg() {
            if (segUsed >= segPool.length) segPool.push({});
            const s = segPool[segUsed++];
            segList.push(s);
            return s;
        }

        function addPetalSeg(x0, y0, z0, x1, y1, z1, wx, wz, sa, ca, cp, sp, part, ms, open, tone) {
            const mx = (x0 + x1) * 0.5, my = (y0 + y1) * 0.5, mz = (z0 + z1) * 0.5;
            if (!project(x0, y0 * ms, z0, A) || !project(x1, y1 * ms, z1, B) || !project(mx + wx, my * ms, mz + wz, Cc) || !project(mx - wx, my * ms, mz - wz, D)) return;
            const s = newSeg();
            s.kind = 0;
            s.e = A.x; s.f = A.y;
            s.c = -(B.x - A.x); s.d = -(B.y - A.y);
            s.a = (Cc.x - D.x) * 0.5; s.b = (Cc.y - D.y) * 0.5;
            s.z = (A.z + B.z) * 0.5;
            s.part = part;
            // Pháp tuyến n = W x d (hướng về mặt trong của cánh)
            const dx = sa * cp, dy = ca, dz = sa * sp;
            let nx = -wz * dy, ny = (wz * dx - wx * dz) * ms, nz = wx * dy;
            const nl = Math.hypot(nx, ny, nz) || 1;
            nx /= nl; ny /= nl; nz /= nl;
            const facing = nx * (cam.x - mx) + ny * (cam.y - my * ms) + nz * (cam.z - mz);
            const sgn = facing >= 0 ? 1 : -1;
            const diff = Math.max(0, (nx * L_DIR[0] + ny * L_DIR[1] + nz * L_DIR[2]) * sgn);
            const bright = 0.46 + 0.56 * diff + 0.14 * open;
            s.shade = clamp01(clamp01(1 - bright) * 0.66 + (ms < 0 ? 0.18 : 0) + (tone || 0) * 0.14);
            s.img = facing >= 0 ? S.petal.front : S.petal.back;
        }

        function addLeafSeg(bx, by, bz, phi, al, len, wid, ms) {
            const cp = Math.cos(phi), sp = Math.sin(phi);
            const tx = bx + Math.sin(al) * cp * len, ty = by + Math.cos(al) * len, tz = bz + Math.sin(al) * sp * len;
            const wx = -sp * wid * 0.5, wz = cp * wid * 0.5;
            const mx = (bx + tx) * 0.5, my = (by + ty) * 0.5, mz = (bz + tz) * 0.5;
            if (!project(bx, by * ms, bz, A) || !project(tx, ty * ms, tz, B) || !project(mx + wx, my * ms, mz + wz, Cc) || !project(mx - wx, my * ms, mz - wz, D)) return;
            const s = newSeg();
            s.kind = 2;
            s.e = A.x; s.f = A.y;
            s.c = -(B.x - A.x); s.d = -(B.y - A.y);
            s.a = (Cc.x - D.x) * 0.5; s.b = (Cc.y - D.y) * 0.5;
            s.z = (A.z + B.z) * 0.5;
            s.shade = ms < 0 ? 0.3 : 0;
        }

        function heroState() {
            const grow = clamp01((sc.tau - T.BUD) / 0.8);
            return {
                visible: sc.tau >= T.BUD,
                H: th.hero.H * easeOutCubic(grow),
                bud: 0.22 + 0.78 * easeOutCubic(clamp01((sc.tau - T.BUD) / 0.7)),
                sway: Math.sin(sc.clock * 0.8) * 0.06
            };
        }

        // Thứ tự vẽ đúng vật lý cho hoa nhiều tầng cánh:
        // - Nhìn ngang: cánh gần ống kính che cánh xa (theo chiều sâu z).
        // - Nhìn từ trên xuống: tầng cánh bên trong luôn nằm TRÊN tầng ngoài (dù tầng ngoài gần ống kính hơn),
        //   nên cộng thêm "độ sâu tầng" theo mức độ nhìn từ trên (topness) => không bao giờ thấy cánh xuyên qua nhau.
        let heroCrownTop = 0;
        function tagKeys(from, ld, topBias) {
            for (let k = from; k < segList.length; k++) segList[k].key = segList[k].z - ld * topBias;
        }

        function buildHero(hs, ms) {
            segList.length = 0;
            segUsed = 0;
            const H = hs.H, bud = hs.bud, tau = sc.tau, clock = sc.clock;
            const isWing = th.petal.shape === 'wing';
            let topBias = 0;
            if (ms > 0) {
                const dist = Math.hypot(cam.x, cam.y - H, cam.z) || 1;
                const elev = Math.asin(Math.max(-1, Math.min(1, (cam.y - H) / dist))) / DEG;
                topBias = 320 * smooth((elev - 16) / 24);
            }
            let crownTop = 0;
            for (let i = 0; i < petals.length; i++) {
                const p = petals[i];
                const open = easeOutCubic((tau - (T.OPEN + p.delay)) / 0.95);
                const heart = easeInOutCubic((tau - (T.HEART + p.delay * 0.25)) / 0.6);
                const alStill = p.a0 + (p.a1 - p.a0) * open + (p.a2 - p.a1) * heart;
                let al = alStill + Math.sin(clock * 1.35 + p.phi * 2.0) * 1.3 * open;
                if (isWing) al += Math.sin(clock * 5.2 + p.phi * 3) * 4.5 * open;
                al *= DEG;
                const phi = p.phi + 0.6 * (1 - open) + hs.sway * 0.4;
                const len = p.len * bud * (0.8 + 0.2 * open);
                const wid = p.wid * bud * (0.66 + 0.34 * open);
                const curl = p.curl * DEG * (0.35 + 0.65 * open);
                // Đỉnh cao nhất của vương miện hoa (dùng tư thế tĩnh, không lẫn nhịp thở -> bức thư không rung)
                const hMid = Math.cos(alStill * DEG) * len * 0.56;
                const hTip = hMid + Math.cos(alStill * DEG + curl) * len * 0.44;
                if (hMid > crownTop) crownTop = hMid;
                if (hTip > crownTop) crownTop = hTip;

                const cp = Math.cos(phi), sp = Math.sin(phi);
                const bx = cp * p.rb * bud + hs.sway * 3, by = H, bz = sp * p.rb * bud;
                const s1 = Math.sin(al), c1 = Math.cos(al);
                const mx = bx + s1 * cp * len * 0.56, my = by + c1 * len * 0.56, mz = bz + s1 * sp * len * 0.56;
                const a2 = al + curl;
                const s2 = Math.sin(a2), c2 = Math.cos(a2);
                const tx = mx + s2 * cp * len * 0.44, ty = my + c2 * len * 0.44, tz = mz + s2 * sp * len * 0.44;
                const wx = -sp * wid * 0.5, wz = cp * wid * 0.5;
                const from = segList.length;
                addPetalSeg(bx, by, bz, mx, my, mz, wx, wz, s1, c1, cp, sp, 1, ms, open, p.tone);
                addPetalSeg(mx, my, mz, tx, ty, tz, wx, wz, s2, c2, cp, sp, 2, ms, open, p.tone);
                tagKeys(from, p.ld, topBias);
            }
            if (ms > 0) heroCrownTop = crownTop;
            // Lá xanh ôm thân khi nụ vừa trồi lên (luôn nằm dưới mọi tầng cánh)
            if (S.leaf && H > 4) {
                const lb = hs.bud;
                const from = segList.length;
                addLeafSeg(4, H * 0.3, 0, 0.9, 54 * DEG, 96 * lb, 48 * lb, ms);
                addLeafSeg(-4, H * 0.22, 0, 0.9 + Math.PI, 60 * DEG, 88 * lb, 44 * lb, ms);
                tagKeys(from, -0.6, topBias);
            }
            // Nhụy / ngọc trai trung tâm (nằm sâu nhất trong lòng hoa)
            const openC = easeOutCubic((tau - (T.OPEN + 0.2)) / 0.9);
            if (openC > 0.01) {
                const from = segList.length;
                if (th.center === 'pearls') {
                    for (let i = 0; i < 10; i++) {
                        const a = (i / 10) * TAU + clock * 0.2;
                        const r = 22 * bud;
                        if (!project(Math.cos(a) * r + hs.sway * 3, (H + 8) * ms, Math.sin(a) * r, Q)) continue;
                        const s = newSeg();
                        s.kind = 1; s.img = S.pearl; s.x = Q.x; s.y = Q.y; s.w = 13 * Q.k * openC; s.h = s.w; s.z = Q.z; s.alpha = ms < 0 ? 0.5 : 1;
                    }
                } else if (S.center && project(hs.sway * 3, (H + 6) * ms, 0, Q)) {
                    const sinE = clamp01((cam.y - (H + 6) * ms) / (Math.hypot(cam.x, cam.y - (H + 6) * ms, cam.z) || 1));
                    const s = newSeg();
                    s.kind = 1; s.img = S.center; s.x = Q.x; s.y = Q.y; s.w = 58 * bud * Q.k * openC; s.h = s.w * Math.max(0.35, sinE); s.z = Q.z - 1; s.alpha = ms < 0 ? 0.45 : 1;
                }
                tagKeys(from, 1.15, topBias);
            }
            segList.sort((a, b) => b.key - a.key);
        }

        function drawSegs(g, dpr, alpha) {
            for (let i = 0; i < segList.length; i++) {
                const s = segList[i];
                if (s.kind === 1) {
                    g.setTransform(dpr, 0, 0, dpr, 0, 0);
                    g.globalAlpha = alpha * s.alpha;
                    g.drawImage(s.img, s.x - s.w / 2, s.y - s.h / 2, s.w, s.h);
                    continue;
                }
                g.setTransform(dpr * s.a, dpr * s.b, dpr * s.c, dpr * s.d, dpr * s.e, dpr * s.f);
                g.globalAlpha = alpha;
                if (s.kind === 2) {
                    g.drawImage(S.leaf, -1, -1, 2, 1);
                    if (s.shade > 0.02) { g.globalAlpha = alpha * s.shade; g.drawImage(S.petal.shade, 0, 0, 128, 256, -1, -1, 2, 1); }
                    continue;
                }
                if (s.part === 1) g.drawImage(s.img, 0, SEG1_SY, 128, SEG1_SH, -1, -1, 2, 1);
                else g.drawImage(s.img, 0, 0, 128, SEG2_SH, -1, -1, 2, SEG2_DH);
                if (s.shade > 0.03) {
                    g.globalAlpha = alpha * s.shade;
                    if (s.part === 1) g.drawImage(S.petal.shade, 0, SEG1_SY, 128, SEG1_SH, -1, -1, 2, 1);
                    else g.drawImage(S.petal.shade, 0, 0, 128, SEG2_SH, -1, -1, 2, SEG2_DH);
                }
            }
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
            g.globalAlpha = 1;
        }

        // ---------- Bức thư thật (DOM) đặt trong thế giới 3D ----------
        // Bức thư nằm NGANG trên đỉnh vương miện hoa (cao hơn mọi cánh + khoảng hở an toàn),
        // khi cánh hoa mở rộng thì bức thư từ từ hạ xuống đậu êm vào lòng hoa => không bao giờ xuyên qua cánh.
        function computeEnvPose(view, hs, crownTop) {
            const env = { visible: false, opacity: 0, tx: 0, ty: 0, scale: 1, rotX: 6, rotY: 0, rotZ: 0, depth: -1, worldY: 0, nestP: 0, nestX: 0, nestY: 0, nestK: 0, nestRx: 0, nestRz: 0 };
            const tau = sc.tau;
            if (tau < T.ENV_IN) return env;
            const vw = view.vw, vh = view.vh;
            const envWpx = Math.max(120, view.envW);
            const ex = hs.sway * 3;
            const envY = hs.H + Math.max(8, finalCrown, crownTop) + 12;
            project(ex, envY, 0, Q);
            const dist = Math.hypot(cam.x - ex, cam.y - envY, cam.z) || 1;
            const elev = Math.asin(Math.max(-1, Math.min(1, (cam.y - envY) / dist))) / DEG;
            const nestS = (ENV_W * Q.k) / envWpx;
            const nestRx = Math.max(10, Math.min(64, 90 - elev));
            const nestRz = -cam.yaw / DEG;
            const p = easeInOutCubic((tau - T.LIFT) / (T.LAND - T.LIFT));
            const fy = vh / 2 + (view.idleY || 0);
            const x = lerp(Q.x, vw / 2, p);
            const y = lerp(Q.y, fy, p) - Math.sin(p * Math.PI) * vh * 0.045;
            const s = Math.exp(lerp(Math.log(Math.max(0.05, nestS)), 0, p));
            env.visible = true;
            env.opacity = smooth((tau - T.ENV_IN) / 0.3);
            env.tx = x - vw / 2;
            env.ty = y - vh / 2;
            env.scale = s;
            env.rotX = lerp(nestRx, 6, easeOutCubic(p));
            env.rotY = -Math.sin(p * Math.PI) * 12;
            env.rotZ = lerp(nestRz, view.idleRotZ || 0, p) + Math.sin(p * Math.PI) * 4;
            // Khoảng cách bức thư tới ống kính (để biết hạt nào bay TRƯỚC hay SAU bức thư)
            env.depth = cam.f * ENV_W / (envWpx * s);
            env.worldY = envY;
            env.nestP = p;
            return env;
        }

        // Bóng đổ mềm của bức thư lên lòng hoa (tạo cảm giác bức thư có khối & thực sự nằm trên hoa)
        function drawEnvContactShadow(g, env, hs) {
            const a = 0.5 * env.opacity * (1 - smooth(env.nestP * 2.2));
            if (a < 0.01) return;
            const sy = hs.H + Math.max(0, heroCrownTop) * 0.55;
            if (!project(hs.sway * 3, sy, 0, Q)) return;
            const dist = Math.hypot(cam.x, cam.y - sy, cam.z) || 1;
            const sinE = Math.max(0.2, (cam.y - sy) / dist);
            const spread = 1 + env.nestP * 0.8;
            const w = ENV_W * 1.12 * Q.k * spread, h = ENV_W * 0.72 * Q.k * sinE * spread;
            g.save();
            g.translate(Q.x, Q.y);
            g.globalAlpha = a;
            g.drawImage(S.shadow, -w / 2, -h / 2, w, h);
            g.restore();
            g.globalAlpha = 1;
        }

        // Đom đóm, bướm, cánh hoa bay: chia 2 lượt quanh hoa chủ & bức thư theo đúng chiều sâu
        function drawLiving(gW, gF, pass, heroZ, envZ, hs, wake) {
            const clock = sc.clock, tau = sc.tau;
            const pick = (z) => {
                const behind = z >= heroZ;
                if ((pass === 0) !== behind) return null;
                return (pass === 1 && envZ > 0 && z < envZ) ? gF : gW;
            };
            // Đom đóm
            const nf = sc.quality > 0 ? flies.length : (flies.length >> 1);
            for (let i = 0; i < nf; i++) {
                const f = flies[i];
                const x = f.x + Math.sin(clock * 0.6 + f.p1) * 26;
                const y = f.y + Math.sin(clock * 0.9 + f.p2) * 12;
                const z = f.z + Math.cos(clock * 0.5 + f.p3) * 26;
                if (!project(x, y, z, Q)) continue;
                const g = pick(Q.z);
                if (!g) continue;
                const tw = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(clock * 2.6 + f.p1 * 3), 2);
                const w = 26 * f.s * Q.k;
                g.globalCompositeOperation = 'lighter';
                drawAdditive(g, S.glowAccent, Q.x, Q.y, w, w, tw * wake * 0.85 * clamp01((2.4 - Q.k) / 0.8));
                g.globalCompositeOperation = 'source-over';
                g.globalAlpha = 1;
            }
            // Bướm vàng (Hồ Điệp): đàn bướm thức giấc + đàn bướm bay ra từ VÀNH NGOÀI cánh hoa (không xuyên bức thư)
            for (let i = 0; i < flyers.length; i++) {
                const b = flyers[i];
                const ap = smooth((tau - b.born) / 0.55);
                if (ap <= 0.01) continue;
                const th0 = b.ph + clock * 0.55 * b.dir;
                const rr = b.fromHeart ? lerp(118, b.rad, ap) : b.rad;
                const baseX = b.fromHeart ? 0 : b.ox, baseZ = b.fromHeart ? 0 : b.oz;
                const y = b.fromHeart ? lerp(hs.H + 6, b.h + 40, ap) : b.h * 0.6 + Math.sin(clock * 0.7 + b.ph) * 30;
                const x = baseX + Math.cos(th0) * rr, z = baseZ + Math.sin(th0) * rr;
                if (!project(x, y + Math.sin(clock * 2.3 + b.fp) * 8, z, Q) || Q.k > 2.2) continue;
                const g = pick(Q.z);
                if (!g) continue;
                const x2 = baseX + Math.cos(th0 + 0.05 * b.dir) * rr, z2 = baseZ + Math.sin(th0 + 0.05 * b.dir) * rr;
                project(x2, y, z2, Q2);
                const head = Math.atan2(Q2.y - Q.y, Q2.x - Q.x);
                const w = b.sz * Q.k, h = w * 1.5;
                const flap = 0.25 + 0.75 * Math.abs(Math.cos(clock * 13 + b.fp));
                const sx = Q.x, sy = Q.y;
                g.save();
                g.translate(sx, sy);
                g.rotate(head + Math.PI / 2);
                g.globalAlpha = ap;
                g.save(); g.scale(flap, 1); g.drawImage(S.wing, -w, -h / 2, w, h); g.restore();
                g.save(); g.scale(-flap, 1); g.drawImage(S.wing, -w, -h / 2, w, h); g.restore();
                g.restore();
                g.globalCompositeOperation = 'lighter';
                drawAdditive(g, S.softAccent, sx, sy, w * 2.4, w * 2.4, ap * 0.35);
                g.globalCompositeOperation = 'source-over';
                g.globalAlpha = 1;
            }
            // Cánh hoa / phấn nắng / lấp lánh trôi trong không khí
            const nd = sc.quality > 0 ? drift.length : (drift.length >> 1);
            for (let i = 0; i < nd; i++) {
                const d = drift[i];
                const y = 320 - ((clock * d.sp + d.ph * 360) % 360);
                if (y < 2) continue;
                const x = d.x0 + Math.sin(clock * 0.7 + d.ph * 6) * 40;
                const z = d.z0 + Math.cos(clock * 0.5 + d.ph * 5) * 30;
                if (!project(x, y, z, Q)) continue;
                const g = pick(Q.z);
                if (!g) continue;
                const a = wake * Math.min(1, y / 40) * clamp01((2.1 - Q.k) / 0.7);
                if (a < 0.01) continue;
                if (th.drift === 'petal') {
                    const hh = 18 * d.sz * Q.k, ww = hh * 0.55;
                    g.save();
                    g.translate(Q.x, Q.y);
                    g.rotate(clock * d.rs + d.ph * 6);
                    g.scale(1, Math.cos(clock * d.fs + d.ph * 9));
                    g.globalAlpha = a * 0.92;
                    g.drawImage(S.petal.front, -ww / 2, -hh / 2, ww, hh);
                    g.restore();
                } else {
                    g.globalCompositeOperation = 'lighter';
                    const w = (th.drift === 'pollen' ? 14 : 24) * d.sz * Q.k;
                    drawAdditive(g, th.drift === 'pollen' ? S.glowAccent : S.flare, Q.x, Q.y, w, w, a * (0.5 + 0.5 * Math.sin(clock * 3 + d.ph * 20)));
                    g.globalCompositeOperation = 'source-over';
                }
                g.globalAlpha = 1;
            }
        }

        function drawStem(g, hs, ms, alpha) {
            if (hs.H < 2) return;
            if (!project(0, 0, 0, A) || !project(hs.sway * 3, hs.H * ms, 0, B) || !project(hs.sway * 18, hs.H * 0.5 * ms, 0, Cc)) return;
            const kAvg = (A.k + B.k) * 0.5;
            g.globalAlpha = alpha;
            g.lineCap = 'round';
            g.strokeStyle = th.stem;
            g.lineWidth = Math.max(1.5, (th.silkStem ? 10 : 7) * kAvg);
            g.beginPath(); g.moveTo(A.x, A.y); g.quadraticCurveTo(Cc.x, Cc.y, B.x, B.y); g.stroke();
            g.strokeStyle = th.stemHi;
            g.globalAlpha = alpha * 0.55;
            g.lineWidth = Math.max(0.8, 2.2 * kAvg);
            g.beginPath(); g.moveTo(A.x - 1.5 * kAvg, A.y); g.quadraticCurveTo(Cc.x - 1.5 * kAvg, Cc.y, B.x - 1.5 * kAvg, B.y); g.stroke();
            g.globalAlpha = 1;
        }

        // ---------- Các lớp môi trường ----------
        function drawGroundCircle(g, r, y) {
            let started = false;
            for (let i = 0; i <= 56; i++) {
                const a = (i / 56) * TAU;
                if (!project(Math.cos(a) * r, y, Math.sin(a) * r, Q)) { started = false; continue; }
                if (!started) { g.moveTo(Q.x, Q.y); started = true; } else g.lineTo(Q.x, Q.y);
            }
        }

        function drawSkyAndLake(g, vw, vh) {
            const hy = cam.hy;
            if (hy > 0) {
                g.save(); g.translate(0, hy); g.fillStyle = sc.skyGrad; g.fillRect(0, -hy - 2, vw, hy + 3); g.restore();
            }
            if (hy < vh) {
                const top = Math.max(0, hy);
                g.save(); g.translate(0, hy); g.fillStyle = sc.lakeGrad; g.fillRect(0, top - hy - 1, vw, vh - top + 2); g.restore();
            }
            // Sao trời
            if (hy > 0 && stars.length) {
                g.fillStyle = '#ffffff';
                for (let i = 0; i < stars.length; i++) {
                    const st = stars[i];
                    if (!projectDir(st.dx, st.dy, st.dz, Q) || Q.y > hy || Q.x < -4 || Q.x > vw + 4 || Q.y < -4) continue;
                    const tw = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(sc.clock * st.sp + st.tw), 2);
                    g.globalAlpha = tw * 0.9;
                    g.fillRect(Q.x, Q.y, st.s, st.s);
                }
                g.globalAlpha = 1;
            }
            // Trăng / Mặt trời + phản chiếu trên mặt hồ
            const ce = th.celestial;
            const cl = Math.hypot(ce.dir[0], ce.dir[1], ce.dir[2]);
            const cdx = ce.dir[0] / cl, cdy = ce.dir[1] / cl, cdz = ce.dir[2] / cl;
            if (projectDir(cdx, cdy, cdz, Q)) {
                const sz = ce.size * cam.f / 600;
                g.globalCompositeOperation = 'lighter';
                g.globalAlpha = ce.kind === 'sun' ? 0.95 : 0.7;
                g.drawImage(S.softCelestial, Q.x - sz * 2.6, Q.y - sz * 2.6, sz * 5.2, sz * 5.2);
                g.globalCompositeOperation = 'source-over';
                g.globalAlpha = 1;
                g.drawImage(S.disc, Q.x - sz * 0.34, Q.y - sz * 0.34, sz * 0.68, sz * 0.68);
                if (projectDir(cdx, -cdy, cdz, Q2)) {
                    g.globalCompositeOperation = 'lighter';
                    g.globalAlpha = 0.32;
                    g.drawImage(S.softCelestial, Q2.x - sz * 0.9, Q2.y - sz * 2.6, sz * 1.8, sz * 5.2);
                    g.globalCompositeOperation = 'source-over';
                    g.globalAlpha = 1;
                }
            }
            // Dải sáng chân trời
            if (hy > -vh * 0.2 && hy < vh * 1.2) {
                g.globalCompositeOperation = 'lighter';
                g.globalAlpha = 0.55;
                g.drawImage(S.band, 0, hy - vh * 0.12, vw, vh * 0.24);
                g.globalCompositeOperation = 'source-over';
                g.globalAlpha = 1;
            }
        }

        function drawShore(g, vw, vh) {
            const hy = cam.hy;
            if (hy < -vh * 0.3 || hy > vh * 1.3) return;
            for (let i = 0; i < hedges.length; i++) {
                const hd = hedges[i];
                if (!project(hd.x, 0, hd.z, Q)) continue;
                const w = 560 * hd.sc * Q.k, h = 180 * hd.sc * Q.k;
                if (Q.x + w / 2 < 0 || Q.x - w / 2 > vw) continue;
                g.drawImage(S.hedges[hd.v], Q.x - w / 2, Q.y - h + 2, w, h);
                if (sc.quality > 0) {
                    g.save();
                    g.globalAlpha = 0.28;
                    g.translate(Q.x, Q.y + 2);
                    g.scale(1, -0.8);
                    g.drawImage(S.hedges[hd.v], -w / 2, -h, w, h);
                    g.restore();
                }
            }
            // Sương mù chân trời trôi chậm
            g.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 3; i++) {
                const off = ((sc.clock * (8 + i * 5) + i * 300) % (vw * 1.6)) - vw * 0.3;
                g.globalAlpha = 0.16;
                g.drawImage(S.mist, off - vw * 0.6, hy - vh * 0.05 + i * vh * 0.02, vw * 1.2, vh * 0.12);
            }
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = 1;
        }

        function drawShimmer(g) {
            const n = sc.quality > 0 ? shimmer.length : 24;
            g.fillStyle = `rgb(${rgbRipple})`;
            for (let i = 0; i < n; i++) {
                const p = shimmer[i];
                if (!project(p.x, 0, p.z, Q)) continue;
                const a = Math.max(0, Math.sin(sc.clock * 2.1 + p.ph));
                if (a < 0.05) continue;
                g.globalAlpha = a * 0.42;
                const w = p.w * Q.k;
                g.fillRect(Q.x - w / 2, Q.y, w, Math.max(1, 1.3 * Q.k));
            }
            g.globalAlpha = 1;
        }

        function drawRipples(g, hs) {
            const tau = sc.tau;
            g.lineCap = 'round';
            // Sóng xung kích lúc chạm
            if (tau >= T.IMPACT && tau < T.IMPACT + 0.7) {
                const p = (tau - T.IMPACT) / 0.7;
                const r = 30 + 900 * easeOutCubic(p);
                const a = Math.pow(1 - p, 1.5);
                g.strokeStyle = `rgba(${rgbRipple},${(a * 0.35).toFixed(3)})`;
                g.lineWidth = 14 * (1 - p) + 2;
                g.beginPath(); drawGroundCircle(g, r, 0.5); g.stroke();
                g.strokeStyle = `rgba(255,255,255,${(a * 0.85).toFixed(3)})`;
                g.lineWidth = 2;
                g.beginPath(); drawGroundCircle(g, r, 0.5); g.stroke();
            }
            // Gợn sóng lan tỏa làm khu vườn bừng nở
            const births = [T.IMPACT, T.IMPACT + 0.12, T.IMPACT + 0.26, T.IMPACT + 0.44, T.BUD];
            for (let j = 0; j < births.length; j++) {
                const age = tau - births[j];
                if (age <= 0) continue;
                const r = 330 * age + 10;
                if (r > 760) continue;
                const a = 0.55 * (1 - r / 760) * Math.min(1, age / 0.05);
                g.strokeStyle = `rgba(${rgbRipple},${a.toFixed(3)})`;
                g.lineWidth = 1.6;
                g.beginPath(); drawGroundCircle(g, r, 0.4); g.stroke();
            }
            // Gợn sóng dịu quanh thân hoa (vô tận)
            if (hs.visible) {
                for (let j = 0; j < 3; j++) {
                    const r = ((sc.clock * 34 + j * 62) % 186) + 26;
                    const a = 0.22 * (1 - (r - 26) / 186) * smooth((tau - T.BUD) / 0.6);
                    if (a < 0.01) continue;
                    g.strokeStyle = `rgba(${rgbRipple},${a.toFixed(3)})`;
                    g.lineWidth = 1.2;
                    g.beginPath(); drawGroundCircle(g, r, 0.3); g.stroke();
                }
            }
        }

        function prepGround() {
            for (let i = 0; i < ground.length; i++) {
                const gi = ground[i];
                gi.vis = false;
                if (sc.tau < gi.born) continue;
                const y = 1.5 * Math.sin(sc.clock * 1.2 + gi.bob);
                if (!project(gi.x, y, gi.z, Q)) continue;
                gi.vis = true;
                gi.sx = Q.x; gi.sy = Q.y; gi.sz = Q.z; gi.k = Q.k;
                const dist = Math.hypot(cam.x - gi.x, cam.y - y, cam.z - gi.z) || 1;
                gi.sinE = (cam.y - y) / dist;
            }
            ground.sort((a, b) => b.sz - a.sz);
        }

        function drawGroundItem(g, gi) {
            const grow = easeOutBack((sc.tau - gi.born) / 0.45);
            if (grow <= 0.01) return;
            const w = gi.size * grow * gi.k;
            const mode = S.ground.mode;
            if (mode === 'flat') {
                g.globalCompositeOperation = 'lighter';
                g.globalAlpha = 0.28;
                g.drawImage(S.softAccent, gi.sx - w * 0.8, gi.sy - w * 0.3, w * 1.6, w * 0.6);
                g.globalCompositeOperation = 'source-over';
                g.globalAlpha = 1;
                g.save();
                g.translate(gi.sx, gi.sy);
                g.scale(1, Math.max(0.24, gi.sinE));
                g.rotate(gi.rot + sc.clock * gi.spin);
                g.drawImage(S.ground.img, -w / 2, -w / 2, w, w);
                g.restore();
            } else if (mode === 'upright') {
                const h = w * S.ground.aspect;
                g.save();
                g.translate(gi.sx, gi.sy);
                g.rotate(Math.sin(sc.clock * 1.3 + gi.bob) * 0.06);
                g.drawImage(S.ground.img, -w / 2, -h, w, h);
                g.globalAlpha = 0.22;
                g.scale(1, -0.7);
                g.drawImage(S.ground.img, -w / 2, -h, w, h);
                g.restore();
                g.globalAlpha = 1;
            } else {
                const ww = w * 0.55;
                g.globalCompositeOperation = 'lighter';
                g.globalAlpha = 0.4;
                g.drawImage(S.softRipple, gi.sx - ww * 1.4, gi.sy - ww * 0.9, ww * 2.8, ww * 1.8);
                g.globalCompositeOperation = 'source-over';
                g.globalAlpha = 1;
                g.drawImage(S.ground.img, gi.sx - ww / 2, gi.sy - ww, ww, ww);
            }
        }

        function drawAdditive(g, img, x, y, w, h, a) {
            if (a <= 0.003 || w <= 0.5) return;
            g.globalAlpha = Math.min(1, a);
            g.drawImage(img, x - w / 2, y - h / 2, w, h);
        }

        // ---------- KẾT XUẤT TOÀN CẢNH ----------
        function render(gW, gF, view) {
            const vw = view.vw, vh = view.vh, dpr = view.dpr;
            if (vw !== sc.vw || vh !== sc.vh || sc.gradCtx !== gW) rebuildViewCaches(gW, vw, vh);
            updateCamera(vw, vh);
            const tau = sc.tau, clock = sc.clock;
            const hs = heroState();
            const wake = 0.3 + 0.7 * smooth((tau - T.IMPACT) / 0.9);

            gW.setTransform(dpr, 0, 0, dpr, 0, 0);
            gW.globalAlpha = 1;
            gW.globalCompositeOperation = 'source-over';

            // ===== 1. Trời, hồ gương, bờ vườn =====
            drawSkyAndLake(gW, vw, vh);
            drawShore(gW, vw, vh);
            drawShimmer(gW);

            // ===== 2. Ánh sáng loang trên mặt nước =====
            const bloomP = smooth((tau - T.OPEN) / 1.2);
            gW.globalCompositeOperation = 'lighter';
            if (hs.visible && project(0, 0, 0, Q)) {
                const sinE = clamp01((cam.y) / (Math.hypot(cam.x, cam.y, cam.z) || 1));
                const w = 520 * Q.k;
                drawAdditive(gW, S.softAccent, Q.x, Q.y, w, w * Math.max(0.25, sinE), 0.42 * (0.4 + 0.6 * bloomP));
            }
            if (tau >= T.IMPACT && tau < T.IMPACT + 0.9 && project(0, 0, 0, Q)) {
                const p = (tau - T.IMPACT) / 0.9;
                const w = (200 + 700 * easeOutCubic(p)) * Q.k;
                drawAdditive(gW, S.softRipple, Q.x, Q.y, w, w * 0.35, (1 - p) * 0.9);
            }
            gW.globalCompositeOperation = 'source-over';
            gW.globalAlpha = 1;

            // ===== 3. Phản chiếu của hoa trên hồ gương (nhìn từ dưới mặt nước) =====
            if (hs.visible && sc.quality > 0) {
                drawStem(gW, hs, -1, 0.32);
                buildHero(hs, -1);
                drawSegs(gW, dpr, 0.3);
            }

            // ===== 4. Gợn sóng =====
            drawRipples(gW, hs);

            // ===== 5. Dựng hình học hoa chủ trước -> biết đỉnh cánh cao nhất -> đặt bức thư NẰM TRÊN vương miện hoa =====
            //      (bức thư luôn cao hơn mọi cánh hoa => tuyệt đối không có cánh hoa nào xuyên qua bức thư)
            prepGround();
            const heroZ = project(0, hs.H * 0.5, 0, Q) ? Q.z : 1e9;
            if (hs.visible) buildHero(hs, 1);
            const env = computeEnvPose(view, hs, hs.visible ? heroCrownTop : 0);
            const envZ = env.visible ? env.depth : -1;

            // Vườn hoa phía xa -> sinh vật phía sau hoa -> thân + hoa -> bóng đổ của bức thư lên hoa -> vườn phía gần
            let gi = 0;
            for (; gi < ground.length; gi++) {
                if (!ground[gi].vis) continue;
                if (ground[gi].sz < heroZ) break;
                drawGroundItem(gW, ground[gi]);
            }
            drawLiving(gW, gF, 0, heroZ, envZ, hs, wake);
            if (hs.visible) {
                drawStem(gW, hs, 1, 1);
                drawSegs(gW, dpr, 1);
            }
            if (env.visible) drawEnvContactShadow(gW, env, hs);
            for (; gi < ground.length; gi++) {
                if (ground[gi].vis) drawGroundItem(gW, ground[gi]);
            }

            // ===== 6. Hào quang lòng hoa, tia sáng thần thánh, bức thư kết tinh =====
            gW.globalCompositeOperation = 'lighter';
            if (hs.visible && project(hs.sway * 3, hs.H + 10, 0, Q)) {
                const glowI = smooth((tau - 2.7) / 0.8);
                const matFlash = Math.exp(-Math.pow((tau - (T.ENV_IN + 0.12)) / 0.14, 2));
                drawAdditive(gW, S.glowAccent, Q.x, Q.y, (150 + 160 * matFlash) * Q.k, (150 + 160 * matFlash) * Q.k, glowI * 0.55 + matFlash * 0.9);
                const raysA = 0.55 * smooth((tau - 2.9) / 0.6) * (1 - 0.45 * smooth((tau - 4.6) / 0.8));
                if (raysA > 0.01) {
                    const sz = 560 * Q.k;
                    gW.save();
                    gW.translate(Q.x, Q.y);
                    gW.rotate(clock * 0.12);
                    gW.globalAlpha = raysA;
                    gW.drawImage(S.rays, -sz / 2, -sz / 2, sz, sz);
                    gW.restore();
                }
                // Tia lấp lánh bung ra khi bức thư kết tinh (toả ra từ chính vị trí bức thư)
                const bt = (tau - T.ENV_IN) / 0.7;
                if (bt > 0 && bt < 1 && env.visible) {
                    for (let i = 0; i < burst.length; i++) {
                        const b = burst[i];
                        const d = 70 + 120 * b.d * easeOutCubic(bt);
                        if (!project(b.dx * d, env.worldY + b.dy * d * 0.6, b.dz * d, Q2)) continue;
                        const w = 46 * Q2.k * (1 - bt * 0.5);
                        drawAdditive(gW, S.flare, Q2.x, Q2.y, w, w, (1 - bt));
                    }
                }
            }
            gW.globalCompositeOperation = 'source-over';
            gW.globalAlpha = 1;

            // ===== 7. Sinh vật phía trước hoa (hạt nào gần ống kính hơn bức thư thì vẽ ĐÈ LÊN bức thư) =====
            drawLiving(gW, gF, 1, heroZ, envZ, hs, wake);

            // Bụi nước ánh sáng bắn lên khi chạm (lúc này chưa có hoa & bức thư)
            gW.globalCompositeOperation = 'lighter';
            if (tau >= T.IMPACT && tau < T.IMPACT + 0.62) {
                const t = tau - T.IMPACT;
                const fade = 1 - t / 0.62;
                gW.strokeStyle = `rgba(${rgbRipple},${(fade * 0.8).toFixed(3)})`;
                for (let i = 0; i < splash.length; i++) {
                    const sp = splash[i];
                    const ch = Math.cos(sp.el) * sp.v, cv = Math.sin(sp.el) * sp.v;
                    const y = cv * t - 650 * t * t;
                    if (y < 0) continue;
                    const r = ch * t;
                    if (!project(Math.cos(sp.az) * r, y, Math.sin(sp.az) * r, Q)) continue;
                    const t0 = Math.max(0, t - 0.03);
                    const y0 = cv * t0 - 650 * t0 * t0, r0 = ch * t0;
                    if (project(Math.cos(sp.az) * r0, Math.max(0, y0), Math.sin(sp.az) * r0, Q2)) {
                        gW.globalAlpha = 1;
                        gW.lineWidth = Math.max(1, 2.2 * Q.k);
                        gW.beginPath(); gW.moveTo(Q2.x, Q2.y); gW.lineTo(Q.x, Q.y); gW.stroke();
                    }
                    drawAdditive(gW, S.glowMote, Q.x, Q.y, 18 * Q.k, 18 * Q.k, fade);
                }
            }
            // Cột sáng thiên đỉnh tại điểm chạm
            const pillarA = smooth((tau - 1.585) / 0.03) * (1 - smooth((tau - 1.62) / 0.4));
            if (pillarA > 0.01 && project(0, 0, 0, Q)) {
                const w = 80 * Q.k, h = 700 * Q.k;
                gW.globalAlpha = pillarA;
                gW.drawImage(S.pillar, Q.x - w / 2, Q.y - h, w, h);
                gW.globalAlpha = pillarA * 0.35;
                gW.save(); gW.translate(Q.x, Q.y); gW.scale(1, -0.6); gW.drawImage(S.pillar, -w / 2, -h, w, h); gW.restore();
            }
            gW.globalCompositeOperation = 'source-over';
            gW.globalAlpha = 1;

            // ===== 8. Viền tối điện ảnh =====
            gW.drawImage(sc.vignette, 0, 0, vw, vh);

            // ===== 9. Màn tối mở đầu (khớp với lớp chuyển cảnh CSS) =====
            const veil = 1 - smooth(tau / 0.6);
            if (veil > 0.002) {
                gW.globalAlpha = veil;
                gW.fillStyle = th.veil;
                gW.fillRect(0, 0, vw, vh);
                gW.globalAlpha = 1;
            }

            // ===== 10. Đốm sáng ước nguyện & vệt sao băng =====
            if (tau < T.IMPACT + 0.02) {
                gW.globalCompositeOperation = 'lighter';
                const p = clamp01((tau - T.FALL) / (T.IMPACT - T.FALL));
                const s = Math.pow(p, 2.1);
                // Bụi sáng rơi rớt dọc đường bay
                for (let j = 0; j < sparks.length; j++) {
                    const sj = (j + 0.5) / sparks.length;
                    const tj = T.FALL + Math.pow(sj, 1 / 2.1) * (T.IMPACT - T.FALL);
                    const age = tau - tj;
                    if (age < 0 || age > 0.6) continue;
                    bez(sj, Q2);
                    if (!project(Q2.x + sparks[j].jx * age * 3, Q2.y - 60 * age, Q2.z + sparks[j].jz * age * 3, Q)) continue;
                    drawAdditive(gW, S.glowMote, Q.x, Q.y, 22 * Q.k, 22 * Q.k, 1 - age / 0.6);
                }
                // Đuôi sao băng
                if (p > 0) {
                    for (let i = 18; i >= 1; i--) {
                        const si = s - i * 0.026 * (0.45 + s);
                        if (si < 0) continue;
                        bez(si, Q2);
                        if (!project(Q2.x, Q2.y, Q2.z, Q)) continue;
                        const f = 1 - i / 19;
                        const w = Math.max(30, 120 * Q.k) * (0.35 + 0.65 * f);
                        drawAdditive(gW, S.glowMote, Q.x, Q.y, w, w, 0.6 * f * f);
                    }
                }
                motePos(tau, Q2);
                if (project(Q2.x, Q2.y, Q2.z, Q)) {
                    const tw = 0.88 + 0.12 * Math.sin(clock * 6);
                    const G = Math.max(78, 150 * Q.k) * tw;
                    drawAdditive(gW, S.glowMote, Q.x, Q.y, G, G, 1);
                    gW.save();
                    gW.translate(Q.x, Q.y);
                    gW.rotate(clock * 0.4);
                    gW.globalAlpha = 0.85;
                    gW.drawImage(S.flare, -G * 0.95, -G * 0.95, G * 1.9, G * 1.9);
                    gW.restore();
                    // Phản chiếu đốm sáng trên mặt hồ
                    if (project(Q2.x, -Q2.y, Q2.z, Q)) {
                        drawAdditive(gW, S.glowMote, Q.x, Q.y, G * 0.8, G * 1.3, 0.3 * (1 - veil));
                    }
                }
                gW.globalCompositeOperation = 'source-over';
                gW.globalAlpha = 1;
            }

            // ===== Lớp trước (trên phong bì): khung điện ảnh & chớp sáng =====
            const flash = sc.impactClock >= 0 && !sc.skipped ? Math.exp(-(clock - sc.impactClock) * 7.5) : 0;
            if (flash > 0.01 || sc.skipFlash > 0.01) {
                gF.globalCompositeOperation = 'lighter';
                if (flash > 0.01 && project(0, 0, 0, Q)) {
                    const w = Math.max(vw, vh) * 1.5;
                    drawAdditive(gF, S.glowMote, Q.x, Q.y, w, w, flash * 0.75);
                    gF.globalAlpha = flash * 0.18;
                    gF.fillStyle = `rgb(${th.mote.join(',')})`;
                    gF.fillRect(0, 0, vw, vh);
                }
                if (sc.skipFlash > 0.01) {
                    gF.globalAlpha = sc.skipFlash * 0.7;
                    gF.fillStyle = `rgb(${th.mote.join(',')})`;
                    gF.fillRect(0, 0, vw, vh);
                }
                gF.globalCompositeOperation = 'source-over';
                gF.globalAlpha = 1;
            }
            const lb = vh * 0.072 * clamp01(smooth(tau / 0.35) - smooth((tau - 4.7) / 0.7));
            if (lb > 0.5) {
                gF.fillStyle = '#040206';
                gF.fillRect(0, 0, vw, lb);
                gF.fillRect(0, vh - lb, vw, lb + 1);
            }

            return env;
        }

        // ---------- Bước thời gian ----------
        function step(dt) {
            dt = Math.min(0.05, Math.max(0, dt));
            sc.clock += dt;
            sc.frameAvg = sc.frameAvg * 0.92 + dt * 0.08;
            if (sc.clock > 1.2 && sc.frameAvg > 0.026) sc.quality = 0;
            if (sc.tau < T.END) {
                sc.tau = Math.min(T.END, sc.tau + speedAt(sc.tau) * dt);
                if (sc.tau >= T.IMPACT && sc.impactClock < 0) sc.impactClock = sc.clock;
            }
            sc.finished = sc.tau >= T.END;
            if (sc.skipFlash > 0) sc.skipFlash = Math.max(0, sc.skipFlash - dt / 0.45);
            if (skipBtn) {
                const show = !sc.skipped && sc.clock > 0.9 && sc.tau < T.LIFT - 0.15;
                skipBtn.classList.toggle('show', show);
            }
        }

        const api = {
            get tau() { return sc.tau; },
            get finished() { return sc.finished; },
            step,
            render,
            debugSeek(tau, clock) {
                sc.tau = Math.max(0, Math.min(T.END, tau));
                sc.clock = clock == null ? sc.tau : clock;
                sc.impactClock = sc.tau >= T.IMPACT ? sc.clock - 10 : -1;
                sc.finished = sc.tau >= T.END;
            },
            skip() {
                if (sc.skipped || sc.tau >= T.LIFT - 0.1) return;
                sc.skipped = true;
                sc.tau = T.LIFT - 0.1;
                sc.impactClock = sc.clock - 10;
                sc.skipFlash = 1;
                if (skipBtn) skipBtn.classList.remove('show');
            },
            destroy() {
                if (skipBtn && skipBtn.parentNode) skipBtn.parentNode.removeChild(skipBtn);
                skipBtn = null;
            }
        };
        return api;
    }

    // ---------------------------------------------------------------------------------
    // MÀN CHUYỂN CẢNH TỨC THÌ KHI BẤM "NHẬN LỜI CHÚC" (chạy trên GPU compositor)
    // -> Kể cả khi luồng chính đang bận kết xuất ảnh thiệp, màn tối & đốm sáng vẫn mượt.
    // ---------------------------------------------------------------------------------
    let preludeEl = null;
    function beginPrelude(motionId) {
        const th = THEMES[motionId] || THEMES.bloom;
        endPreludeImmediate();
        const el = document.createElement('div');
        el.className = 'wish-prelude';
        el.style.background = th.veil;
        el.style.setProperty('--wp-glow', `rgba(${th.mote.join(',')},0.85)`);
        el.innerHTML = '<div class="wish-prelude-mote"><i></i></div>';
        document.body.appendChild(el);
        preludeEl = el;
        void el.offsetWidth;
        requestAnimationFrame(() => el.classList.add('is-on'));
        return new Promise((resolve) => setTimeout(resolve, 520));
    }
    function endPrelude() {
        const el = preludeEl;
        if (!el) return;
        preludeEl = null;
        el.classList.remove('is-on');
        el.classList.add('is-off');
        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 320);
    }
    function endPreludeImmediate() {
        if (preludeEl && preludeEl.parentNode) preludeEl.parentNode.removeChild(preludeEl);
        preludeEl = null;
    }

    window.WishBloomCutscene = {
        T,
        prepare(motionId) { try { buildThemeSprites(THEMES[motionId] ? motionId : 'bloom'); } catch (e) { console.warn('WishBloom prepare', e); } },
        create: createScene,
        beginPrelude,
        endPrelude,
        hasPrelude: () => !!preludeEl
    };
})();
