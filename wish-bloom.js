/* =====================================================================================
 * wish-bloom.js — ĐẠI CẢNH ONE-SHOT 3D "NỤ HOA ƯỚC NGUYỆN" (AAA Botanical & Water Engine)
 * -------------------------------------------------------------------------------------
 * Cốt truyện liền mạch (One-Shot Camera Spline + Bullet-Time Speed-Ramp):
 *   1. Đêm/Bình minh tĩnh lặng trên Hồ Gương 3D (núi mờ sương khóa chuẩn chân trời,
 *      mây khối 3D, sóng phản quang Fresnel, cầu ánh trăng/mặt trời lấp lánh trên nước).
 *   2. Đốm sáng ước nguyện hoá sao băng lao xuống chạm mặt hồ (tau = 1.60s) -> Bullet-time
 *      slow-mo, cột sáng & sóng thuỷ tinh 3D lan toả đánh thức cả khu vườn hoa trên mặt hồ.
 *   3. Mỗi đoá hoa trong vườn nở 3D thật trên đài lá sen/lá súng nổi trên mặt nước (kèm
 *      vòng nước & bóng phản chiếu).
 *   4. Giữa tâm hồ, Đại Đoá Hoa Chủ Đạo vươn thân 3D liền mạch, lá & đài hoa 3D, sương mai
 *      đọng trên cánh, từng tầng cánh cong Bezier 3D tròn đầy bung nở với chiều sâu Ambient
 *      Occlusion (AO), tán xạ dưới bề mặt (SSS) và vương miện 42 nhụy vàng 3D.
 *   5. Phong bì 3D DOM (#u3d-env-back-rig & #u3d-env-front-rig) kết tinh êm ái trên đài hoa
 *      kèm bóng tiếp xúc vật lý, được nâng lên dâng tặng vào giữa màn hình để đóng ấn sáp 24K.
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

    function hexToRgbArr(hex) {
        const h = hex.replace('#', '');
        const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    function hexToRgb(hex) {
        const a = hexToRgbArr(hex);
        return `${a[0]},${a[1]},${a[2]}`;
    }

    function mixHex(hexA, hexB, t) {
        const a = hexToRgbArr(hexA), b = hexToRgbArr(hexB);
        const u = clamp01(t);
        const r = Math.round(a[0] + (b[0] - a[0]) * u);
        const g = Math.round(a[1] + (b[1] - a[1]) * u);
        const bl = Math.round(a[2] + (b[2] - a[2]) * u);
        return `rgb(${r},${g},${bl})`;
    }

    function makeCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w));
        c.height = Math.max(1, Math.round(h));
        return c;
    }

    // ---------------------------------------------------------------------------------
    // MỐC THỜI GIAN KỂ CHUYỆN (tau)
    // ---------------------------------------------------------------------------------
    const T = {
        FALL: 0.70,     // đốm sáng bắt đầu rơi
        IMPACT: 1.60,   // chạm mặt hồ gương
        BUD: 1.95,      // nụ hoa 3D trồi lên từ mặt nước
        OPEN: 2.50,     // cánh hoa bắt đầu bung nở từng lớp
        HEART: 3.05,    // lòng hoa & vương miện nhụy vàng 3D toả sáng
        ENV_IN: 3.55,   // phong bì 3D kết tinh trên đài hoa
        LIFT: 4.45,     // đài hoa nâng phong bì tiến về phía người xem
        LAND: 5.45,     // phong bì dừng đúng tâm màn hình
        END: 5.60
    };

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
        [2.60, -0.52, 465, 96, 70],
        [3.20, -0.24, 415, 185, 86],
        [3.75, -0.06, 330, 298, 96],
        [4.40, 0.00, 218, 354, 96],
        [5.00, 0.00, 264, 298, 100],
        [5.60, 0.00, 312, 246, 104]
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

    // Hàm lò xo giảm chấn vật lý (Underdamped Spring) cho chuyển động trồi mặt nước, bung cánh hoa & nhún tải trọng
    function springOut(t, freq, damp, amp) {
        t = clamp01(t);
        if (t <= 0) return 0;
        if (t >= 1) return 1;
        return 1 - Math.exp(-damp * t) * (Math.cos(freq * t) + (damp / freq) * Math.sin(freq * t)) * (amp || 1);
    }

    function springPetalOpen(u) {
        u = clamp01(u);
        if (u <= 0) return 0;
        const base = easeOutCubic(u);
        const bounce = Math.exp(-3.6 * u) * Math.sin(u * 10.5) * 0.11 * smooth(u / 0.22);
        return Math.max(0, base + bounce);
    }

    // ---------------------------------------------------------------------------------
    // 6 THẾ GIỚI CONCEPT (Bảng màu vật lý có AO sâu, sắc tố nhung đặc 100%, không cháy sáng)
    // ---------------------------------------------------------------------------------
    const THEMES = {
        // 🌺 Đại Hoa Trà — Đêm Nhung Hồng Mận & Hồ Gương Ánh Trăng
        bloom: {
            veil: '#08030e',
            skyTop: '#070310', skyMid: '#1f0926', horizon: '#6b234b', horizonGlow: '#ff9ebb',
            lakeHorizon: '#4e193d', lakeMid: '#1e0922', lakeDeep: '#07020c',
            waterSubsurface: '255,105,155', waterSpec: '255,230,210',
            mountainFar: '#240b2c', mountainNear: '#14051b', mist: '255,182,210',
            mote: [255, 200, 218], accent: '#ffd875', ripple: '255,200,220', firefly: '#ffe699',
            celestial: { dir: [0.68, 0.38, -0.62], size: 96, color: '#fff6ee', glow: '255,210,205', kind: 'moon' },
            stars: 95, stem: '#143d29', stemHi: '#58b37c', leaf: ['#0b291b', '#276b46', '#7ad49c'],
            pad: ['#0d2e20', '#1f5c3e', '#5cb883'],
            petal: {
                shape: 'camellia',
                ao: '#2d0212',       // bóng sâu trong hốc hoa
                base: '#940a3b',     // gốc cánh nhung đậm
                mid: '#de3b70',      // bụng cánh hồng nhung giàu sắc tố
                tip: '#f595b4',      // đầu cánh phấn hồng đậm đà (không cháy trắng)
                rim: '#ffd8e5',      // viền bắt sáng ngọc trai dịu
                backAo: '#21010d',   // mặt lưng khi khép nụ
                backBase: '#70072e',
                backTip: '#c9406d',
                vein: '255,215,228',
                roundness: 0.72      // độ tròn đầy của đầu cánh
            },
            center: 'stamen', groundCount: 34, driftCount: 28, fireflies: 46,
            hero: {
                H: 16, envLift: 80,
                layers: [
                    { n: 10, len: 126, wid: 86, a0: 14, a1: 66, a2: 72, curl: -14, cup: 0.36, rb: 16, delay: 0.00, off: 0.00 },
                    { n: 9,  len: 108, wid: 76, a0: 11, a1: 52, a2: 60, curl: -16, cup: 0.40, rb: 12, delay: 0.10, off: 0.33 },
                    { n: 8,  len: 90,  wid: 66, a0: 8,  a1: 38, a2: 46, curl: -16, cup: 0.44, rb: 9,  delay: 0.20, off: 0.16 },
                    { n: 7,  len: 72,  wid: 54, a0: 5,  a1: 26, a2: 34, curl: -14, cup: 0.48, rb: 6,  delay: 0.30, off: 0.52 },
                    { n: 6,  len: 54,  wid: 42, a0: 3,  a1: 16, a2: 24, curl: -12, cup: 0.52, rb: 3,  delay: 0.38, off: 0.25 }
                ]
            }
        },
        // 🦋 Hồ Điệp — Rừng Ngọc Lục Bảo & Đoá Sen Hoàng Kim Hồ Điệp
        butterflies: {
            veil: '#030b08',
            skyTop: '#020807', skyMid: '#07221d', horizon: '#1f5e48', horizonGlow: '#ffe082',
            lakeHorizon: '#164a39', lakeMid: '#08221b', lakeDeep: '#020a07',
            waterSubsurface: '80,235,180', waterSpec: '255,240,175',
            mountainFar: '#0a2921', mountainNear: '#051712', mist: '185,255,220',
            mote: [255, 230, 132], accent: '#ffe57f', ripple: '255,235,155', firefly: '#a8ffcb',
            celestial: { dir: [0.66, 0.42, -0.62], size: 94, color: '#fffce8', glow: '255,240,185', kind: 'moon' },
            stars: 105, stem: '#113d29', stemHi: '#5cd692', leaf: ['#09261a', '#1e6343', '#6ee0a1'],
            pad: ['#08291c', '#16593d', '#58c98e'],
            petal: {
                shape: 'lotus_wing',
                ao: '#261302',
                base: '#915105',
                mid: '#e0a416',
                tip: '#f7dc72',
                rim: '#fff2ba',
                backAo: '#241202',
                backBase: '#9e5b07',
                backTip: '#e3b629',
                vein: '255,240,185',
                roundness: 0.62
            },
            center: 'orb', groundCount: 32, driftCount: 30, fireflies: 58, butterflies: true,
            hero: {
                H: 16, envLift: 80,
                layers: [
                    { n: 9, len: 128, wid: 86, a0: 14, a1: 64, a2: 70, curl: -12, cup: 0.36, rb: 16, delay: 0.00, off: 0.00 },
                    { n: 8, len: 108, wid: 74, a0: 10, a1: 50, a2: 58, curl: -14, cup: 0.40, rb: 12, delay: 0.12, off: 0.38 },
                    { n: 7, len: 86,  wid: 60, a0: 7,  a1: 36, a2: 44, curl: -14, cup: 0.44, rb: 8,  delay: 0.24, off: 0.18 },
                    { n: 6, len: 64,  wid: 48, a0: 4,  a1: 22, a2: 30, curl: -12, cup: 0.48, rb: 4,  delay: 0.34, off: 0.55 }
                ]
            }
        },
        // 🎀 Ruy-băng — Mẫu Đơn Lụa Satin Pháp & Ngọc Trai Nam Hải
        ribbon: {
            veil: '#0a040d',
            skyTop: '#09040e', skyMid: '#240d29', horizon: '#8c3b64', horizonGlow: '#ffd8ae',
            lakeHorizon: '#4f1e3f', lakeMid: '#1f0a21', lakeDeep: '#09030b',
            waterSubsurface: '255,165,205', waterSpec: '255,238,215',
            mountainFar: '#240c2b', mountainNear: '#140519', mist: '255,210,228',
            mote: [255, 216, 232], accent: '#ffe4ad', ripple: '255,220,235', firefly: '#ffebc2',
            celestial: { dir: [0.66, 0.40, -0.63], size: 92, color: '#fff8f0', glow: '255,228,215', kind: 'moon' },
            stars: 85, stem: '#b8862d', stemHi: '#fff0be', leaf: ['#4a2e1b', '#8c5a32', '#e6c280'],
            pad: ['#2e1628', '#5e2b4c', '#b86b95'],
            petal: {
                shape: 'peony_silk',
                ao: '#2b0414',
                base: '#941146',
                mid: '#de5487',
                tip: '#f5a6c4',
                rim: '#ffdfec',
                backAo: '#1f020e',
                backBase: '#6e0c35',
                backTip: '#cc4e7d',
                vein: '255,225,238',
                roundness: 0.78
            },
            center: 'pearls', groundCount: 32, driftCount: 28, fireflies: 42,
            hero: {
                H: 16, envLift: 80,
                layers: [
                    { n: 10, len: 130, wid: 84, a0: 12, a1: 64, a2: 70, curl: -16, cup: 0.38, rb: 16, delay: 0.00, off: 0.00 },
                    { n: 8,  len: 108, wid: 72, a0: 9,  a1: 50, a2: 58, curl: -18, cup: 0.42, rb: 12, delay: 0.12, off: 0.32 },
                    { n: 7,  len: 84,  wid: 60, a0: 6,  a1: 36, a2: 44, curl: -16, cup: 0.46, rb: 8,  delay: 0.24, off: 0.14 },
                    { n: 6,  len: 62,  wid: 48, a0: 4,  a1: 22, a2: 30, curl: -14, cup: 0.50, rb: 4,  delay: 0.34, off: 0.50 }
                ]
            }
        },
        // 🌹 Hồng Pháp — Đêm Rượu Vang Bordeaux & Đại Đoá Hồng Nhung Centifolia
        galaxy: {
            veil: '#090204',
            skyTop: '#080205', skyMid: '#240511', horizon: '#751930', horizonGlow: '#ffb088',
            lakeHorizon: '#470d1f', lakeMid: '#1c040d', lakeDeep: '#070104',
            waterSubsurface: '245,55,95', waterSpec: '255,220,185',
            mountainFar: '#240610', mountainNear: '#120208', mist: '255,155,175',
            mote: [255, 165, 185], accent: '#ffd86b', ripple: '255,175,190', firefly: '#ffd97d',
            celestial: { dir: [0.68, 0.38, -0.62], size: 92, color: '#fff3e6', glow: '255,195,175', kind: 'moon' },
            stars: 95, stem: '#163822', stemHi: '#529e68', leaf: ['#0c2415', '#1f5432', '#62b87c'],
            pad: ['#14291b', '#265235', '#63a678'],
            petal: {
                shape: 'rose',
                ao: '#210107',
                base: '#70051c',
                mid: '#cc143d',
                tip: '#f06e8b',
                rim: '#ffc4d1',
                backAo: '#170005',
                backBase: '#4d0212',
                backTip: '#9e0e30',
                vein: '255,185,202',
                roundness: 0.80
            },
            center: 'stamen', groundCount: 34, driftCount: 28, fireflies: 46,
            hero: {
                H: 16, envLift: 80,
                layers: [
                    { n: 9, len: 124, wid: 88, a0: 15, a1: 64, a2: 70, curl: -16, cup: 0.40, rb: 16, delay: 0.00, off: 0.00 },
                    { n: 8, len: 106, wid: 78, a0: 12, a1: 50, a2: 58, curl: -18, cup: 0.44, rb: 12, delay: 0.10, off: 0.38 },
                    { n: 8, len: 88,  wid: 66, a0: 9,  a1: 38, a2: 46, curl: -18, cup: 0.48, rb: 9,  delay: 0.20, off: 0.62 },
                    { n: 7, len: 70,  wid: 54, a0: 6,  a1: 26, a2: 34, curl: -16, cup: 0.52, rb: 6,  delay: 0.30, off: 0.24 },
                    { n: 6, len: 52,  wid: 42, a0: 3,  a1: 16, a2: 24, curl: -14, cup: 0.56, rb: 3,  delay: 0.38, off: 0.76 }
                ]
            }
        },
        // 🌸 Anh Đào — Đêm Trăng Kyoto & Đoá Anh Đào Hoàng Gia
        sakura: {
            veil: '#060612',
            skyTop: '#050613', skyMid: '#161838', horizon: '#6b3e6e', horizonGlow: '#ffc4dc',
            lakeHorizon: '#3d244a', lakeMid: '#15122b', lakeDeep: '#050510',
            waterSubsurface: '255,175,215', waterSpec: '255,240,250',
            mountainFar: '#191736', mountainNear: '#0d0c21', mist: '255,205,230',
            mote: [255, 205, 228], accent: '#ffe49e', ripple: '255,210,232', firefly: '#ffe8a3',
            celestial: { dir: [0.64, 0.42, -0.64], size: 112, color: '#fff9f5', glow: '255,225,235', kind: 'moon' },
            stars: 110, stem: '#2b1d28', stemHi: '#7d566a', leaf: ['#172e24', '#2e634a', '#78c79e'],
            pad: ['#142b24', '#265747', '#6cc4a4'],
            petal: {
                shape: 'sakura',
                ao: '#33071c',
                base: '#b3205b',
                mid: '#eb679b',
                tip: '#fab1cf',
                rim: '#ffe0ed',
                backAo: '#240514',
                backBase: '#871a46',
                backTip: '#de6495',
                vein: '255,225,238',
                roundness: 0.68
            },
            center: 'stamen', groundCount: 36, driftCount: 38, fireflies: 48,
            hero: {
                H: 16, envLift: 80,
                layers: [
                    { n: 6, len: 126, wid: 90, a0: 14, a1: 64, a2: 70, curl: -12, cup: 0.34, rb: 15, delay: 0.00, off: 0.00 },
                    { n: 6, len: 106, wid: 76, a0: 10, a1: 50, a2: 58, curl: -14, cup: 0.38, rb: 11, delay: 0.12, off: 0.50 },
                    { n: 6, len: 84,  wid: 62, a0: 7,  a1: 36, a2: 44, curl: -14, cup: 0.42, rb: 7,  delay: 0.24, off: 0.25 },
                    { n: 6, len: 62,  wid: 48, a0: 4,  a1: 22, a2: 30, curl: -12, cup: 0.46, rb: 4,  delay: 0.34, off: 0.75 }
                ]
            }
        },
        // 🌷 Tulip Nắng Mai — Bình Minh Vàng Mật Ong & Đại Đoá Tulip Hoàng Gia
        hearts: {
            veil: '#0d060a',
            skyTop: '#120817', skyMid: '#42162b', horizon: '#c9564c', horizonGlow: '#ffe596',
            lakeHorizon: '#7a2e38', lakeMid: '#2b0e1d', lakeDeep: '#0c040a',
            waterSubsurface: '255,155,115', waterSpec: '255,242,185',
            mountainFar: '#301122', mountainNear: '#1a0813', mist: '255,215,175',
            mote: [255, 222, 145], accent: '#ffe57f', ripple: '255,215,155', firefly: '#fff0a8',
            celestial: { dir: [0.66, 0.34, -0.66], size: 108, color: '#fffbe6', glow: '255,220,145', kind: 'sun' },
            stars: 60, stem: '#1b4f2e', stemHi: '#78d68a', leaf: ['#123820', '#2b7a46', '#82e096'],
            pad: ['#143822', '#286b40', '#70c989'],
            petal: {
                shape: 'tulip',
                ao: '#300511',
                base: '#ab1845',
                mid: '#e84d62',
                tip: '#faa687',
                rim: '#ffe2bd',
                backAo: '#21030c',
                backBase: '#7d1033',
                backTip: '#db4b5e',
                vein: '255,225,195',
                roundness: 0.68
            },
            center: 'stamen', groundCount: 34, driftCount: 28, fireflies: 42,
            hero: {
                H: 16, envLift: 80,
                layers: [
                    { n: 6, len: 126, wid: 88, a0: 8, a1: 56, a2: 62, curl: -14, cup: 0.44, rb: 15, delay: 0.00, off: 0.00 },
                    { n: 6, len: 108, wid: 76, a0: 5, a1: 42, a2: 50, curl: -16, cup: 0.48, rb: 11, delay: 0.14, off: 0.50 },
                    { n: 6, len: 88,  wid: 64, a0: 3, a1: 28, a2: 36, curl: -14, cup: 0.52, rb: 7,  delay: 0.28, off: 0.25 }
                ]
            }
        }
    };

    // ---------------------------------------------------------------------------------
    // DANH SÁCH CÁNH HOA CHỦ ĐẠO 3D (KÈM GIỌT SƯƠNG MAI 3D TRÊN CÁNH)
    // ---------------------------------------------------------------------------------
    function buildPetalList(th) {
        const list = [];
        const layers = th.hero.layers;
        const L = layers.length;
        let idx = 0;
        layers.forEach((ly, li) => {
            const ld = L > 1 ? li / (L - 1) : 0; // 0 = ngoài cùng, 1 = tâm hoa
            for (let k = 0; k < ly.n; k++) {
                const az = ((k + ly.off) / ly.n) * TAU + ((idx % 3) - 1) * 0.018;
                const hasDew = (li <= 1 && (k % 3 === 0));
                list.push({
                    li,
                    ld,
                    az,
                    len: ly.len * (0.97 + (idx % 5) * 0.015),
                    wid: ly.wid * (0.97 + (idx % 4) * 0.018),
                    a0: ly.a0,
                    a1: ly.a1,
                    a2: ly.a2,
                    curl: ly.curl,
                    cup: ly.cup || 0.34,
                    rb: ly.rb,
                    delay: ly.delay + (k % 3) * 0.025,
                    hasDew,
                    dewU: 0.56 + (k % 2) * 0.12,
                    dewV: (k % 2 === 0 ? 0.32 : -0.32),
                    dewR: 3.6 + (k % 3) * 0.8
                });
                idx++;
            }
        });
        return list;
    }

    // ---------------------------------------------------------------------------------
    // BỘ TEXTURE KHÍ QUYỂN & ÁNH SÁNG DỰNG SẴN (PRE-BAKED ATMOSPHERIC SPRITES)
    // ---------------------------------------------------------------------------------
    const spriteCache = {};

    function buildGlow(rgb, hardCore) {
        const c = makeCanvas(128, 128), g = c.getContext('2d');
        const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        if (hardCore) {
            gr.addColorStop(0.00, 'rgba(255,255,255,1)');
            gr.addColorStop(0.16, `rgba(${rgb},0.92)`);
            gr.addColorStop(0.45, `rgba(${rgb},0.34)`);
            gr.addColorStop(1.00, `rgba(${rgb},0)`);
        } else {
            gr.addColorStop(0.00, `rgba(${rgb},0.78)`);
            gr.addColorStop(0.42, `rgba(${rgb},0.26)`);
            gr.addColorStop(1.00, `rgba(${rgb},0)`);
        }
        g.fillStyle = gr;
        g.fillRect(0, 0, 128, 128);
        return c;
    }

    function buildStarFlare() {
        const c = makeCanvas(160, 160), g = c.getContext('2d');
        g.translate(80, 80);
        const r0 = g.createRadialGradient(0, 0, 0, 0, 0, 74);
        r0.addColorStop(0, 'rgba(255,255,255,0.95)');
        r0.addColorStop(0.2, 'rgba(255,248,225,0.45)');
        r0.addColorStop(1, 'rgba(255,248,225,0)');
        g.fillStyle = r0;
        g.beginPath(); g.arc(0, 0, 74, 0, TAU); g.fill();
        for (let i = 0; i < 4; i++) {
            g.save();
            g.rotate((i * Math.PI) / 4);
            const len = i % 2 === 0 ? 76 : 44;
            const wid = i % 2 === 0 ? 3.2 : 2.0;
            const gr = g.createLinearGradient(-len, 0, len, 0);
            gr.addColorStop(0, 'rgba(255,255,255,0)');
            gr.addColorStop(0.5, 'rgba(255,255,255,0.95)');
            gr.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = gr;
            g.beginPath();
            g.ellipse(0, 0, len, wid, 0, 0, TAU);
            g.fill();
            g.restore();
        }
        return c;
    }

    // Luồng sáng elip mềm 100% không có cạnh cắt đa giác
    function buildVolumetricPlume(rgb) {
        const c = makeCanvas(256, 256), g = c.getContext('2d');
        g.save();
        g.translate(128, 148);
        g.scale(0.82, 1.15);
        const gr = g.createRadialGradient(0, 20, 4, 0, 0, 110);
        gr.addColorStop(0.00, 'rgba(255,255,255,0.82)');
        gr.addColorStop(0.28, `rgba(${rgb},0.46)`);
        gr.addColorStop(0.62, `rgba(${rgb},0.14)`);
        gr.addColorStop(1.00, `rgba(${rgb},0)`);
        g.fillStyle = gr;
        g.beginPath();
        g.arc(0, 0, 110, 0, TAU);
        g.fill();
        g.restore();
        return c;
    }

    function buildPillar(rgb) {
        const c = makeCanvas(128, 512), g = c.getContext('2d');
        const gx = g.createLinearGradient(0, 0, 128, 0);
        gx.addColorStop(0.00, `rgba(${rgb},0)`);
        gx.addColorStop(0.32, `rgba(${rgb},0.35)`);
        gx.addColorStop(0.50, 'rgba(255,255,255,0.98)');
        gx.addColorStop(0.68, `rgba(${rgb},0.35)`);
        gx.addColorStop(1.00, `rgba(${rgb},0)`);
        g.fillStyle = gx;
        g.fillRect(0, 0, 128, 512);
        g.globalCompositeOperation = 'destination-in';
        const gy = g.createLinearGradient(0, 0, 0, 512);
        gy.addColorStop(0.00, 'rgba(0,0,0,0)');
        gy.addColorStop(0.25, 'rgba(0,0,0,0.85)');
        gy.addColorStop(0.92, 'rgba(0,0,0,1)');
        gy.addColorStop(1.00, 'rgba(0,0,0,0)');
        g.fillStyle = gy;
        g.fillRect(0, 0, 128, 512);
        return c;
    }

    function buildMistSprite(rgb) {
        const c = makeCanvas(320, 120), g = c.getContext('2d');
        const gr = g.createRadialGradient(160, 60, 8, 160, 60, 155);
        gr.addColorStop(0.00, `rgba(${rgb},0.38)`);
        gr.addColorStop(0.55, `rgba(${rgb},0.14)`);
        gr.addColorStop(1.00, `rgba(${rgb},0)`);
        g.fillStyle = gr;
        g.save();
        g.translate(160, 60);
        g.scale(1, 0.36);
        g.beginPath(); g.arc(0, 0, 150, 0, TAU); g.fill();
        g.restore();
        return c;
    }

    function buildCloudSprite(topHex, glowHex) {
        const c = makeCanvas(360, 140), g = c.getContext('2d');
        const puffs = [
            [-95, 18, 68, 34], [-42, -6, 84, 44], [24, -4, 88, 46],
            [88, 16, 72, 36], [-12, 18, 96, 38]
        ];
        const rgbTop = hexToRgb(topHex);
        const rgbGlow = hexToRgb(glowHex);
        puffs.forEach(([ox, oy, rx, ry]) => {
            const cx = 180 + ox, cy = 76 + oy;
            const gr = g.createRadialGradient(cx, cy, 4, cx, cy, rx);
            gr.addColorStop(0.0, `rgba(${rgbGlow},0.34)`);
            gr.addColorStop(0.55, `rgba(${rgbTop},0.18)`);
            gr.addColorStop(1.0, `rgba(${rgbTop},0)`);
            g.fillStyle = gr;
            g.save();
            g.translate(cx, cy);
            g.scale(1, ry / rx);
            g.beginPath();
            g.arc(0, 0, rx, 0, TAU);
            g.fill();
            g.restore();
        });
        return c;
    }

    function buildCelestialDisc(cel) {
        const c = makeCanvas(256, 256), g = c.getContext('2d');
        const cx = 128, cy = 128;
        const outer = g.createRadialGradient(cx, cy, 24, cx, cy, 124);
        outer.addColorStop(0.00, 'rgba(255,255,255,0.95)');
        outer.addColorStop(0.28, `rgba(${cel.glow},0.62)`);
        outer.addColorStop(0.62, `rgba(${cel.glow},0.18)`);
        outer.addColorStop(1.00, `rgba(${cel.glow},0)`);
        g.fillStyle = outer;
        g.beginPath(); g.arc(cx, cy, 124, 0, TAU); g.fill();

        const discR = 42;
        const body = g.createRadialGradient(cx - 10, cy - 10, 4, cx, cy, discR);
        body.addColorStop(0.00, '#ffffff');
        body.addColorStop(0.75, cel.color);
        body.addColorStop(1.00, `rgba(${cel.glow},0.92)`);
        g.fillStyle = body;
        g.beginPath(); g.arc(cx, cy, discR, 0, TAU); g.fill();

        if (cel.kind === 'moon') {
            g.fillStyle = 'rgba(180,165,195,0.13)';
            g.beginPath(); g.ellipse(cx - 12, cy - 6, 13, 9, -0.3, 0, TAU); g.fill();
            g.beginPath(); g.ellipse(cx + 8, cy - 12, 10, 8, 0.4, 0, TAU); g.fill();
            g.beginPath(); g.ellipse(cx + 6, cy + 10, 14, 8, -0.2, 0, TAU); g.fill();
        }
        return c;
    }

    function buildPearlSprite() {
        const c = makeCanvas(64, 64), g = c.getContext('2d');
        const gr = g.createRadialGradient(24, 22, 2, 32, 32, 26);
        gr.addColorStop(0.00, '#ffffff');
        gr.addColorStop(0.32, '#fff9ee');
        gr.addColorStop(0.68, '#f5d4c2');
        gr.addColorStop(0.92, '#c48b76');
        gr.addColorStop(1.00, '#ffe3a8');
        g.fillStyle = gr;
        g.beginPath(); g.arc(32, 32, 26, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.92)';
        g.beginPath(); g.ellipse(23, 21, 6, 3.8, -0.6, 0, TAU); g.fill();
        return c;
    }

    function buildContactShadow() {
        const c = makeCanvas(256, 128), g = c.getContext('2d');
        g.save();
        g.translate(128, 64);
        g.scale(1, 0.48);
        const gr = g.createRadialGradient(0, 0, 6, 0, 0, 120);
        gr.addColorStop(0.00, 'rgba(6, 1, 10, 0.85)');
        gr.addColorStop(0.45, 'rgba(12, 2, 18, 0.48)');
        gr.addColorStop(0.78, 'rgba(12, 2, 18, 0.14)');
        gr.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
        g.fillStyle = gr;
        g.beginPath(); g.arc(0, 0, 120, 0, TAU); g.fill();
        g.restore();
        return c;
    }

    function buildThemeSprites(id) {
        if (spriteCache[id]) return spriteCache[id];
        const th = THEMES[id] || THEMES.bloom;
        const S = {
            glowMote: buildGlow(th.mote.join(','), true),
            glowFirefly: buildGlow(hexToRgb(th.firefly), true),
            glowAccent: buildGlow(hexToRgb(th.accent), true),
            softAccent: buildGlow(hexToRgb(th.accent), false),
            softRipple: buildGlow(th.ripple, false),
            softSubsurface: buildGlow(th.waterSubsurface, false),
            flare: buildStarFlare(),
            plume: buildVolumetricPlume(th.ripple),
            pillar: buildPillar(th.mote.join(',')),
            mist: buildMistSprite(th.mist),
            cloud: buildCloudSprite(th.horizon, th.horizonGlow),
            disc: buildCelestialDisc(th.celestial),
            pearl: buildPearlSprite(),
            shadow: buildContactShadow()
        };
        spriteCache[id] = S;
        return S;
    }

    // ---------------------------------------------------------------------------------
    // DỰNG CẢNH & KẾT XUẤT 3D MỖI KHUNG HÌNH
    // ---------------------------------------------------------------------------------
    const ENV_W = 128;
    const L_DIR = (() => {
        const x = -0.34, y = 0.80, z = 0.49;
        const l = Math.hypot(x, y, z);
        return [x / l, y / l, z / l];
    })();

    function createScene(motionId, stageEl) {
        const id = THEMES[motionId] ? motionId : 'bloom';
        const th = THEMES[id];
        const S = buildThemeSprites(id);
        const petals = buildPetalList(th);
        const R = rng(1337 + id.length * 4099 + id.charCodeAt(0) * 97);
        const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        const rgbRipple = th.ripple;
        const rgbSpec = th.waterSpec;

        // 1. Hai tầng núi mờ sương khóa chuẩn trên đường chân trời (Horizon-locked directional mountains)
        const mountainLayers = [
            { elBase: 0.042, amp1: 0.028, amp2: 0.014, freq1: 3, freq2: 7, phase: 0.4, color: th.mountainFar, mistA: 0.48 },
            { elBase: 0.024, amp1: 0.018, amp2: 0.009, freq1: 5, freq2: 11, phase: 2.1, color: th.mountainNear, mistA: 0.25 }
        ];

        // Đèn hoa đăng bờ xa
        const shoreLights = [];
        for (let i = 0; i < 26; i++) {
            const a = (i / 26) * TAU + (R() - 0.5) * 0.08;
            const dist = 1220 + R() * 160;
            shoreLights.push({
                x: Math.cos(a) * dist,
                z: Math.sin(a) * dist,
                y: 4 + R() * 14,
                sz: 0.8 + R() * 0.8,
                ph: R() * TAU
            });
        }

        // Mây khối 3D
        const skyClouds = [];
        for (let i = 0; i < 12; i++) {
            const az = (i / 12) * TAU + (R() - 0.5) * 0.2;
            const el = (9 + (i % 4) * 6 + R() * 5) * DEG;
            skyClouds.push({
                az,
                el,
                scale: 0.75 + R() * 0.65,
                spd: (i % 2 === 0 ? 1 : -1) * (0.004 + R() * 0.005),
                alpha: 0.34 + R() * 0.24
            });
        }

        // Bầu trời sao
        const stars = [];
        for (let i = 0; i < th.stars; i++) {
            const az = R() * TAU;
            const el = (5 + Math.pow(R(), 0.72) * 68) * DEG;
            stars.push({
                dx: Math.cos(el) * Math.cos(az),
                dy: Math.sin(el),
                dz: Math.cos(el) * Math.sin(az),
                s: R() < 0.16 ? 2.4 : 0.9 + R() * 1.1,
                tw: R() * TAU,
                sp: 1.4 + R() * 2.8
            });
        }

        // Vảy sóng phản quang phối cảnh trên mặt nước
        const waterFacets = [];
        for (let i = 0; i < 130; i++) {
            const spread = (R() - 0.5) * 1100;
            const depth = -1250 + R() * 1750;
            waterFacets.push({
                x: spread,
                z: depth,
                len: 12 + R() * 26,
                ph: R() * TAU,
                spd: 2.2 + R() * 2.8
            });
        }

        // Sương mù mặt hồ
        const lakeMists = [];
        for (let i = 0; i < 16; i++) {
            const a = (i / 16) * TAU + R() * 0.3;
            const r = 340 + R() * 760;
            lakeMists.push({
                x: Math.cos(a) * r,
                z: Math.sin(a) * r,
                y: 10 + R() * 22,
                w: 260 + R() * 200,
                ph: R() * TAU
            });
        }

        // Khu vườn hoa 3D trên mặt hồ
        const ground = [];
        for (let i = 0; i < th.groundCount; i++) {
            const t = i / th.groundCount;
            const r = 185 + 560 * Math.pow(t, 0.62) + (R() - 0.5) * 28;
            const a = i * 2.39996 + (R() - 0.5) * 0.22;
            ground.push({
                x: Math.cos(a) * r,
                z: Math.sin(a) * r,
                r,
                born: T.IMPACT + (r - 45) / 335,
                size: 30 + R() * 18,
                padSize: 44 + R() * 26,
                stemH: 7 + R() * 12,
                rot: R() * TAU,
                notchRot: R() * TAU,
                bob: R() * TAU,
                petalsCount: th.petal.shape === 'sakura' ? 5 : (th.petal.shape === 'tulip' ? 6 : 7),
                vis: false,
                sx: 0, sy: 0, sz: 0, k: 0, bloom: 0
            });
        }

        // Đom đóm
        const flies = [];
        for (let i = 0; i < th.fireflies; i++) {
            const r = 140 + 620 * Math.sqrt(R()), a = R() * TAU;
            flies.push({
                x: Math.cos(a) * r,
                z: Math.sin(a) * r,
                y: 16 + R() * 165,
                p1: R() * TAU, p2: R() * TAU, p3: R() * TAU,
                s: 0.65 + R() * 0.85
            });
        }

        // Cánh hoa 3D xoay lượn trong gió
        const drift = [];
        for (let i = 0; i < th.driftCount; i++) {
            const dr = 110 + 440 * Math.sqrt(R()), da = R() * TAU;
            drift.push({
                x0: Math.cos(da) * dr,
                z0: Math.sin(da) * dr,
                sp: 20 + R() * 26,
                ph: R(),
                rx: R() * TAU, ry: R() * TAU, rz: R() * TAU,
                vrx: (R() - 0.5) * 3.2, vry: (R() - 0.5) * 3.2,
                fs: 1.4 + R() * 2.2,
                sz: 0.75 + R() * 0.65
            });
        }

        // Đàn bướm 3D
        const flyers = [];
        const flyerCount = th.butterflies ? 16 : 5;
        for (let i = 0; i < flyerCount; i++) {
            const fromHeart = i >= Math.floor(flyerCount * 0.45);
            flyers.push({
                born: fromHeart ? 3.85 + (i % 6) * 0.06 : T.IMPACT + 0.35 + R() * 0.45,
                fromHeart,
                ox: (R() - 0.5) * 620,
                oz: (R() - 0.5) * 520,
                rad: fromHeart ? 145 + R() * 125 : 110 + R() * 175,
                h: 56 + R() * 155,
                dir: R() < 0.5 ? -1 : 1,
                ph: R() * TAU,
                sz: (th.butterflies ? 20 : 15) + R() * 9,
                fp: R() * TAU
            });
        }

        // Vương miện 42 sợi nhụy vàng 3D
        const stamens = [];
        for (let ring = 0; ring < 3; ring++) {
            const count = ring === 0 ? 18 : (ring === 1 ? 14 : 10);
            for (let k = 0; k < count; k++) {
                const az = ((k + (ring % 2) * 0.5) / count) * TAU;
                stamens.push({
                    ring,
                    az,
                    len: 28 - ring * 5 + (k % 3) * 2,
                    spread: (46 - ring * 13) * DEG,
                    rb: 11 - ring * 3.2,
                    ph: k * 0.7 + ring
                });
            }
        }

        // Hệ thống thuỷ động lực học khi sao băng chạm mặt nước:
        // 36 giọt nước văng parabol vật lý (tự sinh vòng sóng phụ khi rơi chạm lại mặt hồ!)
        const GRAV = 920;
        const splash = [];
        for (let i = 0; i < 36; i++) {
            const v = 220 + R() * 340;
            const el = (42 + R() * 38) * DEG;
            const az = (i / 36) * TAU + (R() - 0.5) * 0.14;
            const vh0 = Math.cos(el) * v;
            const vy0 = Math.sin(el) * v;
            const tLand = (2 * vy0) / GRAV;
            const rLand = vh0 * tLand;
            splash.push({
                v, el, az, vh0, vy0,
                tLand,
                rLand,
                xLand: Math.cos(az) * rLand,
                zLand: Math.sin(az) * rLand,
                sz: 2.2 + R() * 2.6
            });
        }

        // 14 phiến màng nước vương miện 3D (Liquid Crown Splash Sheets) bung lên quanh miệng hố va chạm
        const crownSheets = [];
        for (let i = 0; i < 14; i++) {
            const az = (i / 14) * TAU + (R() - 0.5) * 0.08;
            crownSheets.push({
                az,
                span: (0.16 + R() * 0.10),
                vRad: 115 + R() * 55,
                vUp: 245 + R() * 95,
                pearls: 2 + (i % 2)
            });
        }

        // 26 giọt nước hồ rũ rơi vật lý từ đầu các cánh hoa khi nụ hoa trồi lên và bung mở
        const bloomDrops = [];
        for (let i = 0; i < 26; i++) {
            const az = (i / 26) * TAU + (R() - 0.5) * 0.18;
            const layerIdx = i % 3;
            const tDetach = T.BUD + 0.16 + layerIdx * 0.24 + (i % 5) * 0.09;
            const r0 = 28 + layerIdx * 24 + R() * 22;
            const y0 = 22 + layerIdx * 14 + R() * 18;
            const vx = Math.cos(az) * (32 + R() * 44);
            const vz = Math.sin(az) * (32 + R() * 44);
            const vy = 48 + R() * 55;
            const dropG = 760;
            const tFall = (vy + Math.sqrt(vy * vy + 2 * dropG * y0)) / dropG;
            bloomDrops.push({
                tDetach,
                x0: Math.cos(az) * r0,
                y0,
                z0: Math.sin(az) * r0,
                vx, vy, vz,
                dropG,
                tFall,
                xLand: Math.cos(az) * r0 + vx * tFall,
                zLand: Math.sin(az) * r0 + vz * tFall,
                sz: 1.9 + R() * 1.5
            });
        }

        // 28 hạt phấn hoa hoàng kim bung nở vật lý khi tâm hoa thức tỉnh (tau = T.HEART)
        const pollenParticles = [];
        for (let i = 0; i < 28; i++) {
            const az = (i / 28) * TAU + (R() - 0.5) * 0.2;
            const el = (28 + R() * 52) * DEG;
            const spd = 55 + R() * 85;
            pollenParticles.push({
                az,
                vx: Math.cos(el) * Math.cos(az) * spd,
                vy: Math.sin(el) * spd,
                vz: Math.cos(el) * Math.sin(az) * spd,
                spin: (R() - 0.5) * 4.5,
                ph: R() * TAU,
                sz: 1.5 + R() * 1.8
            });
        }

        const sparks = [];
        for (let i = 0; i < 22; i++) {
            sparks.push({
                jx: (R() - 0.5) * 38,
                jy: 18 + R() * 42,
                jz: (R() - 0.5) * 38,
                sz: 0.7 + R() * 0.7
            });
        }
        const burst = [];
        for (let i = 0; i < 24; i++) {
            const az = R() * TAU, el = (12 + R() * 68) * DEG;
            burst.push({ dx: Math.cos(el) * Math.cos(az), dy: Math.sin(el), dz: Math.cos(el) * Math.sin(az), d: 0.6 + R() * 0.65 });
        }

        let finalCrown = 0;
        petals.forEach((p) => {
            const a = p.a2 * DEG, c = p.curl * DEG;
            const hm = Math.cos(a) * p.len * 0.55;
            finalCrown = Math.max(finalCrown, hm, hm + Math.cos(a + c) * p.len * 0.45);
        });

        const sc = {
            tau: reduced ? 4.25 : 0,
            clock: 0,
            impactClock: -1,
            skipFlash: 0,
            finished: false,
            quality: 1,
            frameAvg: 1 / 60,
            skipped: reduced,
            vw: 0, vh: 0,
            M0: null,
            vignette: null
        };

        let skipBtn = null;
        if (stageEl) {
            skipBtn = document.createElement('button');
            skipBtn.type = 'button';
            skipBtn.className = 'wish-skip-btn';
            skipBtn.innerHTML = 'Bỏ qua <span aria-hidden="true">›</span>';
            skipBtn.addEventListener('click', (e) => { e.stopPropagation(); api.skip(); });
            stageEl.appendChild(skipBtn);
        }

        // ---------- Hệ thống Máy quay 3D (kèm Chấn động Thuỷ lực Vật lý tần số thấp) ----------
        const cam = { x: 0, y: 0, z: 0, fx: 0, fy: 0, fz: 0, rx: 0, rz: 0, ux: 0, uy: 0, uz: 0, f: 600, cx: 0, cy: 0, yaw: 0, hy: 0, roll: 0 };
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
            let lookY = KS[4];
            const pz = Math.cos(yaw) * rad;

            // Chấn động thuỷ động lực học (Hydro-Shockwave Heave) khi sao băng phá vỡ mặt nước
            const dtImpact = sc.tau - T.IMPACT;
            if (dtImpact >= 0 && dtImpact < 1.35) {
                const envWave = Math.exp(-dtImpact * 3.4);
                // Cú sập áp suất ban đầu xuống mặt hồ + sóng dội ngược tần số thấp có sức nặng thật
                const heave = -14.0 * Math.sin(dtImpact * 16.5) * envWave;
                const swayX = 7.5 * Math.sin(dtImpact * 23.0 + 0.6) * Math.exp(-dtImpact * 4.2);
                py += heave;
                lookY += heave * 0.55;
                px += swayX;
            }
            // Nhịp dập dềnh nhẹ theo lực đẩy Archimedes khi Đại Đoá Hoa trồi lên khỏi mặt hồ
            const dtBud = sc.tau - T.BUD;
            if (dtBud >= 0 && dtBud < 1.1) {
                lookY += Math.sin(dtBud * 9.2) * Math.exp(-dtBud * 3.2) * 5.5;
            }
            // Nhịp nhún nhẹ khi phong bì đáp xuống đài hoa (tau = T.ENV_IN)
            const dtEnv = sc.tau - T.ENV_IN;
            if (dtEnv >= 0 && dtEnv < 0.85) {
                lookY -= Math.sin(dtEnv * 11.0) * Math.exp(-dtEnv * 4.0) * 4.5;
            }

            cam.yaw = yaw;
            setCamera(px, py, pz, lookY, vw, vh);
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

        const P0 = { x: 0, y: 0, z: 0, k: 0, v: false };
        const P1 = { ...P0 }, P2 = { ...P0 }, P2L = { ...P0 }, P3 = { ...P0 }, P4 = { ...P0 }, P4R = { ...P0 }, P5 = { ...P0 }, P6 = { ...P0 }, PTL = { ...P0 }, PTR = { ...P0 }, Q = { ...P0 }, Q2 = { ...P0 }, Q3 = { ...P0 };

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

        function rebuildViewCaches(vw, vh) {
            sc.vw = vw; sc.vh = vh;
            sc.M0 = computeM0(vw, vh);
            const vg = makeCanvas(vw, vh), vgg = vg.getContext('2d');
            const rg = vgg.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.34, vw / 2, vh / 2, Math.max(vw, vh) * 0.78);
            rg.addColorStop(0, 'rgba(0,0,0,0)');
            rg.addColorStop(1, 'rgba(0,0,0,0.50)');
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
            // Gia tốc trọng trường vật lý: bắt đầu trượt nhẹ rồi lao vút xuống mặt nước với vận tốc cực đại tại tau = T.IMPACT
            bez(Math.pow(p, 2.35), o);
        }

        function bez(s, o) {
            const M0 = sc.M0;
            const cx = M0.x * 0.32, cy = M0.y * 0.58, cz = M0.z * 0.32;
            const a = (1 - s) * (1 - s), b = 2 * (1 - s) * s;
            o.x = a * M0.x + b * cx;
            o.y = a * M0.y + b * cy;
            o.z = a * M0.z + b * cz;
        }

        // Luôn đóng gói độc lập cả globalCompositeOperation = 'lighter' và globalAlpha để KHÔNG BAO GIỜ rò rỉ sang cánh hoa/lá sen!
        function drawAdditive(g, img, x, y, w, h, a) {
            if (a <= 0.004) return;
            const prevA = g.globalAlpha;
            const prevOp = g.globalCompositeOperation;
            g.globalCompositeOperation = 'lighter';
            g.globalAlpha = a > 1 ? 1 : a;
            g.drawImage(img, x - w * 0.5, y - h * 0.5, w, h);
            g.globalCompositeOperation = prevOp;
            g.globalAlpha = prevA;
        }

        // =================================================================================
        // 1. VẼ BẦU TRỜI, MÂY KHỐI 3D, NÚI MỜ SƯƠNG KHÓA CHÂN TRỜI & MẶT HỒ FRESNEL
        // =================================================================================
        function drawAtmosphereAndLake(g, vw, vh, hy, wake) {
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = 1;
            const skyEnd = Math.max(2, Math.min(vh, hy + 2));

            // 1A. Bầu trời đa tầng chiều sâu
            const skyG = g.createLinearGradient(0, 0, 0, skyEnd);
            skyG.addColorStop(0.00, th.skyTop);
            skyG.addColorStop(0.52, th.skyMid);
            skyG.addColorStop(0.86, th.horizon);
            skyG.addColorStop(1.00, th.horizonGlow);
            g.fillStyle = skyG;
            g.fillRect(0, 0, vw, skyEnd);

            // 1B. Mặt hồ Fresnel (Xa sáng màu trời phản chiếu -> Gần sâu thẳm trong vắt)
            const lakeStart = Math.max(0, hy - 1);
            const lakeH = Math.max(4, vh - lakeStart);
            const lakeG = g.createLinearGradient(0, lakeStart, 0, vh);
            lakeG.addColorStop(0.00, th.horizonGlow);
            lakeG.addColorStop(0.05, th.lakeHorizon);
            lakeG.addColorStop(0.32, th.lakeMid);
            lakeG.addColorStop(0.75, th.lakeDeep);
            lakeG.addColorStop(1.00, th.veil);
            g.fillStyle = lakeG;
            g.fillRect(0, lakeStart, vw, lakeH);

            // 1C. Ánh sáng tán xạ dưới lòng hồ (Subsurface Water Glow) nơi hoa trồi lên
            if (project(0, 0, 0, Q)) {
                const subPulse = 0.35 + 0.65 * smooth((sc.tau - 1.55) / 1.2);
                const subW = Math.min(vw * 1.25, 580 * Q.k);
                const subH = subW * 0.52;
                drawAdditive(g, S.softSubsurface, Q.x, Q.y, subW, subH, 0.52 * subPulse);
                drawAdditive(g, S.softRipple, Q.x, Q.y, subW * 0.55, subH * 0.48, 0.38 * subPulse);
            }
            g.globalCompositeOperation = 'source-over';

            // 1D. Bầu trời sao
            g.fillStyle = '#ffffff';
            for (let i = 0; i < stars.length; i++) {
                const st = stars[i];
                if (!projectDir(st.dx, st.dy, st.dz, Q)) continue;
                if (Q.x < -10 || Q.x > vw + 10 || Q.y < -10 || Q.y > hy) continue;
                const tw = 0.32 + 0.68 * (0.5 + 0.5 * Math.sin(sc.clock * st.sp + st.tw));
                g.globalAlpha = tw * 0.88;
                g.fillRect(Q.x - st.s * 0.5, Q.y - st.s * 0.5, st.s, st.s);
                if (st.s > 2.0) {
                    drawAdditive(g, S.flare, Q.x, Q.y, st.s * 7.5, st.s * 7.5, tw * 0.45);
                }
            }
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = 1;

            // 1E. Mặt trăng / Mặt trời bình minh & cột ánh sáng phản chiếu dài trên mặt hồ
            const cd = th.celestial.dir;
            let celScreenX = vw * 0.72;
            let celVis = false;
            if (projectDir(cd[0], cd[1], cd[2], Q)) {
                celScreenX = Q.x;
                celVis = true;
                const sz = th.celestial.size * 2.2;
                drawAdditive(g, S.softAccent, Q.x, Q.y, sz * 2.4, sz * 2.4, 0.38);
                g.globalCompositeOperation = 'source-over';
                g.globalAlpha = 1;
                g.drawImage(S.disc, Q.x - sz * 0.5, Q.y - sz * 0.5, sz, sz);
            }
            if (celVis && hy < vh && hy > -80) {
                const colH = (vh - Math.max(0, hy)) * 0.88;
                const colW = th.celestial.size * 2.6;
                drawAdditive(g, S.softAccent, celScreenX, Math.max(0, hy) + colH * 0.28, colW, colH, 0.30);
                g.save();
                g.globalCompositeOperation = 'lighter';
                g.fillStyle = `rgba(${rgbSpec}, 0.44)`;
                for (let s = 0; s < 38; s++) {
                    const p = s / 38;
                    const sy = Math.max(0, hy) + 5 + Math.pow(p, 1.52) * colH * 0.80;
                    if (sy > vh) break;
                    const waveX = celScreenX + Math.sin(s * 1.9 + sc.clock * 2.5) * (5 + p * 20);
                    const w = (16 + Math.sin(s * 3.1 - sc.clock * 3.0) * 9) * (1 - p * 0.32) * (0.55 + p * 0.95);
                    const h = 0.8 + p * 1.3;
                    g.globalAlpha = (1 - p * 0.72) * (0.28 + 0.34 * Math.sin(s * 2.3 + sc.clock * 3.8));
                    g.beginPath();
                    g.ellipse(waveX, sy, w * 0.5, h, 0, 0, TAU);
                    g.fill();
                }
                g.restore();
                g.globalCompositeOperation = 'source-over';
                g.globalAlpha = 1;
            }

            // 1F. Mây khối 3D trôi nhẹ trên bầu trời
            for (let i = 0; i < skyClouds.length; i++) {
                const cl = skyClouds[i];
                const az = cl.az + sc.clock * cl.spd;
                const dx = Math.cos(cl.el) * Math.cos(az);
                const dy = Math.sin(cl.el);
                const dz = Math.cos(cl.el) * Math.sin(az);
                if (!projectDir(dx, dy, dz, Q)) continue;
                if (Q.y > hy + 10 || Q.x < -220 || Q.x > vw + 220) continue;
                const cw = 310 * cl.scale, ch = 118 * cl.scale;
                g.globalAlpha = cl.alpha;
                g.drawImage(S.cloud, Q.x - cw * 0.5, Q.y - ch * 0.5, cw, ch);
            }
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = 1;

            // 1G. Dãy núi mờ sương khóa chuẩn trên đường chân trời hy
            if (hy > 0 && hy < vh + 40) {
                for (let m = 0; m < mountainLayers.length; m++) {
                    const ml = mountainLayers[m];
                    const steps = 48;
                    g.save();
                    g.globalCompositeOperation = 'source-over';
                    g.globalAlpha = 1;
                    g.beginPath();
                    g.moveTo(-10, hy + 1);
                    for (let s = 0; s <= steps; s++) {
                        const sx = -10 + (vw + 20) * (s / steps);
                        const uAngle = cam.yaw + ((sx - cam.cx) / cam.f);
                        const el = Math.max(0.002, ml.elBase
                            + Math.sin(uAngle * ml.freq1 + ml.phase) * ml.amp1
                            + Math.cos(uAngle * ml.freq2 - ml.phase * 0.7) * ml.amp2);
                        const sy = hy - cam.f * Math.tan(el);
                        g.lineTo(sx, sy);
                    }
                    g.lineTo(vw + 10, hy + 1);
                    g.closePath();
                    const peakH = cam.f * (ml.elBase + ml.amp1 + ml.amp2);
                    const mg = g.createLinearGradient(0, hy - peakH, 0, hy + 1);
                    mg.addColorStop(0.0, ml.color);
                    mg.addColorStop(1.0, mixHex(ml.color, th.horizonGlow, ml.mistA));
                    g.fillStyle = mg;
                    g.fill();
                    g.restore();
                }
            }

            // 1H. Sương mù chân trời & đèn hoa đăng bờ xa
            g.save();
            g.globalCompositeOperation = 'source-over';
            const bandH = Math.max(42, vh * 0.09);
            const bandGrad = g.createLinearGradient(0, hy - bandH, 0, hy + bandH);
            bandGrad.addColorStop(0.0, `rgba(${th.mist}, 0)`);
            bandGrad.addColorStop(0.5, `rgba(${th.mist}, 0.22)`);
            bandGrad.addColorStop(1.0, `rgba(${th.mist}, 0)`);
            g.fillStyle = bandGrad;
            g.fillRect(0, hy - bandH, vw, bandH * 2);

            for (let i = 0; i < shoreLights.length; i++) {
                const sl = shoreLights[i];
                if (!project(sl.x, sl.y, sl.z, Q)) continue;
                if (Q.x < -20 || Q.x > vw + 20) continue;
                const pulse = (0.45 + 0.55 * Math.sin(sc.clock * 2.4 + sl.ph)) * (0.25 + 0.75 * wake);
                const r = Math.max(8, 22 * Q.k * sl.sz);
                drawAdditive(g, S.glowFirefly, Q.x, Q.y, r, r, pulse * 0.75);
                if (project(sl.x, -sl.y * 0.6, sl.z, Q2)) {
                    drawAdditive(g, S.glowFirefly, Q2.x, Q2.y + 4, r * 0.65, r * 2.8, pulse * 0.42);
                }
            }
            g.restore();
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = 1;

            // 1I. Sương mù trôi là là trên mặt hồ
            for (let i = 0; i < lakeMists.length; i++) {
                const lm = lakeMists[i];
                if (!project(lm.x, lm.y, lm.z, Q)) continue;
                if (Q.x < -200 || Q.x > vw + 200) continue;
                const w = lm.w * Q.k, h = w * 0.34;
                const a = (0.16 + 0.14 * wake) * (0.65 + 0.35 * Math.sin(sc.clock * 0.7 + lm.ph));
                g.globalAlpha = a;
                g.drawImage(S.mist, Q.x - w * 0.5, Q.y - h * 0.5, w, h);
            }
            g.globalAlpha = 1;

            // 1J. Gợn sóng lăn tăn 3D hữu cơ trên mặt hồ (Có hõm sóng tối & đỉnh sóng cong lấp lánh, không dùng fillRect!)
            g.save();
            g.globalCompositeOperation = 'source-over';
            for (let i = 0; i < waterFacets.length; i++) {
                const wf = waterFacets[i];
                if (!project(wf.x, 0, wf.z, Q)) continue;
                if (Q.y < hy + 3 || Q.y > vh + 10 || Q.x < -30 || Q.x > vw + 30) continue;
                const wave = Math.sin(wf.z * 0.045 - sc.clock * wf.spd + wf.ph);
                if (wave < 0.12) continue;
                const intensity = Math.pow((wave - 0.12) / 0.88, 1.7);
                const distToCel = Math.abs(Q.x - celScreenX) / (vw * 0.38);
                const celBoost = Math.max(0.26, Math.exp(-distToCel * distToCel));
                const alpha = intensity * celBoost * (0.28 + 0.44 * wake);
                if (alpha < 0.025) continue;

                const w = Math.max(4, wf.len * Q.k * (0.65 + 0.55 * intensity));
                const h = Math.max(0.9, 1.9 * Q.k);
                const bend = Math.sin(wf.ph + sc.clock * 1.6) * h * 0.9;

                // Hõm sóng tối tạo chiều sâu mặt nước thật
                g.fillStyle = `rgba(4, 2, 10, ${(alpha * 0.42).toFixed(3)})`;
                g.beginPath();
                g.moveTo(Q.x - w * 0.5, Q.y + h * 0.55);
                g.quadraticCurveTo(Q.x, Q.y + h * 1.45 + bend, Q.x + w * 0.5, Q.y + h * 0.55);
                g.quadraticCurveTo(Q.x, Q.y + h * 0.25 + bend * 0.5, Q.x - w * 0.5, Q.y + h * 0.55);
                g.fill();

                // Đỉnh sóng cong bắt sáng mượt hai đầu
                g.fillStyle = `rgba(${rgbSpec}, ${Math.min(0.76, alpha).toFixed(3)})`;
                g.beginPath();
                g.moveTo(Q.x - w * 0.5, Q.y);
                g.quadraticCurveTo(Q.x, Q.y - h + bend, Q.x + w * 0.5, Q.y);
                g.quadraticCurveTo(Q.x, Q.y + h * 0.35 + bend, Q.x - w * 0.5, Q.y);
                g.fill();
            }
            g.restore();
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = 1;
        }

        // =================================================================================
        // 2. SÓNG NƯỚC 3D, HỐ LÕM THUỶ LỰC (IMPACT CRATER), CỘT NƯỚC WORTHINGTON & GIỌT VĂNG PARABOL
        // =================================================================================
        const ripples = [
            { t0: T.IMPACT + 0.00, v: 335, life: 3.2, w: 3.2, main: true },
            { t0: T.IMPACT + 0.16, v: 275, life: 2.9, w: 2.4, main: false },
            { t0: T.IMPACT + 0.36, v: 220, life: 2.6, w: 1.9, main: false },
            { t0: T.IMPACT + 0.65, v: 170, life: 2.3, w: 1.4, main: false },
            { t0: T.BUD + 0.06,    v: 160, life: 2.3, w: 1.8, main: false },
            { t0: T.BUD + 0.42,    v: 130, life: 2.1, w: 1.4, main: false },
            { t0: T.OPEN + 0.18,   v: 115, life: 2.0, w: 1.2, main: false },
            { t0: T.ENV_IN + 0.06, v: 145, life: 1.9, w: 1.6, main: false }
        ];

        // Tính độ cao mặt sóng & độ nghiêng pháp tuyến mặt nước tại bán kính r để lá sen nhấp nhô vật lý
        function sampleWaveAtRadius(r, tau) {
            if (tau < T.IMPACT) return { y: 0, slope: 0 };
            let totalY = 0;
            let totalSlope = 0;
            for (let idx = 0; idx < 4; idx++) {
                const rp = ripples[idx];
                const dt = tau - rp.t0;
                if (dt <= 0 || dt >= rp.life) continue;
                const rWave = rp.v * dt;
                const dist = r - rWave;
                const packetW = 38 + idx * 8;
                if (Math.abs(dist) < packetW * 2.2) {
                    const env = Math.exp(-(dist * dist) / (packetW * packetW)) * (1 - dt / rp.life);
                    const phase = (dist / packetW) * Math.PI * 1.6;
                    const amp = (idx === 0 ? 6.5 : 3.6 - idx * 0.6) * env;
                    totalY += Math.cos(phase) * amp;
                    totalSlope += -Math.sin(phase) * (amp / packetW) * 1.8;
                }
            }
            return { y: totalY, slope: totalSlope };
        }

        function drawMiniRippleRing3D(g, cx, cz, r, alpha, lwScale) {
            if (alpha <= 0.02 || r <= 0.5) return;
            const segs = 20;
            g.beginPath();
            let pts = 0;
            for (let s = 0; s <= segs; s++) {
                const a = (s / segs) * TAU;
                if (project(cx + Math.cos(a) * r, 0.2, cz + Math.sin(a) * r, Q)) {
                    if (pts === 0) g.moveTo(Q.x, Q.y);
                    else g.lineTo(Q.x, Q.y);
                    pts++;
                }
            }
            if (pts > 6) {
                g.strokeStyle = `rgba(3, 1, 8, ${(alpha * 0.38).toFixed(3)})`;
                g.lineWidth = Math.max(0.8, 2.2 * lwScale);
                g.stroke();
                g.strokeStyle = `rgba(${rgbRipple}, ${(alpha * 0.68).toFixed(3)})`;
                g.lineWidth = Math.max(0.5, 1.0 * lwScale);
                g.stroke();
            }
        }

        function drawWaterRipples3D(g, tau) {
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = 1;

            // Áp suất gió nén lõm mặt nước ngay trước khi sao băng chạm hồ (tau = 1.36..1.60s)
            if (tau >= 1.36 && tau < T.IMPACT) {
                const preP = smooth((tau - 1.36) / (T.IMPACT - 1.36));
                const preR = 16 + 46 * preP;
                if (project(0, 0, 0, Q2)) {
                    g.save();
                    drawMiniRippleRing3D(g, 0, 0, preR, preP * 0.55, Q2.k);
                    drawMiniRippleRing3D(g, 0, 0, preR * 0.55, preP * 0.72, Q2.k);
                    g.restore();
                }
                return;
            }

            if (tau < T.IMPACT) return;
            g.save();
            g.lineCap = 'round';
            g.lineJoin = 'round';

            for (let idx = 0; idx < ripples.length; idx++) {
                const rp = ripples[idx];
                const dt = tau - rp.t0;
                if (dt <= 0 || dt >= rp.life) continue;
                const p = dt / rp.life;
                const r = rp.v * dt;
                const fade = (1 - p) * (1 - p * 0.58);
                const centerK = project(0, 0, 0, Q2) ? Q2.k : 1;

                // 2A. Hõm sóng tối (Wave Trough) tạo khối nước lồi lõm 3D thật sự
                const segs = 48;
                g.beginPath();
                let valid = 0;
                for (let s = 0; s <= segs; s++) {
                    const a = (s / segs) * TAU;
                    const rTrough = r * 0.965;
                    if (project(Math.cos(a) * rTrough, -1.4, Math.sin(a) * rTrough, Q)) {
                        if (valid === 0) g.moveTo(Q.x, Q.y);
                        else g.lineTo(Q.x, Q.y);
                        valid++;
                    }
                }
                if (valid > 12) {
                    g.strokeStyle = `rgba(3, 1, 8, ${(fade * 0.42).toFixed(3)})`;
                    g.lineWidth = Math.max(2.4, rp.w * 3.6 * centerK);
                    g.stroke();
                }

                // 2B. Đỉnh sóng bắt sáng biến thiên tự nhiên theo góc nhìn Fresnel
                g.save();
                g.globalCompositeOperation = 'lighter';
                const arcCount = 16;
                for (let ac = 0; ac < arcCount; ac++) {
                    const a0 = (ac / arcCount) * TAU;
                    const a1 = ((ac + 0.82) / arcCount) * TAU;
                    const aMid = (a0 + a1) * 0.5;
                    const fresnelMod = 0.22 + 0.78 * Math.pow(Math.sin(aMid), 2);
                    const waveMod = 0.55 + 0.45 * Math.sin(aMid * 4.0 + dt * 3.5 + idx * 1.7);
                    const localFade = fade * fresnelMod * waveMod;
                    if (localFade < 0.03) continue;

                    g.beginPath();
                    let pts = 0;
                    for (let step = 0; step <= 4; step++) {
                        const a = lerp(a0, a1, step / 4);
                        const rWobble = r + Math.sin(a * 6 + dt * 4) * 1.8;
                        if (project(Math.cos(a) * rWobble, 0.5, Math.sin(a) * rWobble, Q)) {
                            if (pts === 0) g.moveTo(Q.x, Q.y);
                            else g.lineTo(Q.x, Q.y);
                            pts++;
                        }
                    }
                    if (pts > 1) {
                        g.strokeStyle = `rgba(${th.waterSubsurface}, ${(localFade * 0.24).toFixed(3)})`;
                        g.lineWidth = Math.max(2.0, rp.w * 3.6 * centerK);
                        g.stroke();

                        g.strokeStyle = `rgba(${rgbRipple}, ${(localFade * 0.46).toFixed(3)})`;
                        g.lineWidth = Math.max(1.1, rp.w * 1.45 * centerK);
                        g.stroke();

                        if (localFade > 0.16) {
                            g.strokeStyle = `rgba(255, 255, 255, ${(localFade * 0.62).toFixed(3)})`;
                            g.lineWidth = Math.max(0.6, rp.w * 0.52 * centerK);
                            g.stroke();
                        }
                    }
                }

                if (rp.main && fade > 0.14) {
                    const sparkCount = 14;
                    for (let k = 0; k < sparkCount; k++) {
                        const a = (k / sparkCount) * TAU + dt * 0.45;
                        if (project(Math.cos(a) * r, 1.2, Math.sin(a) * r, Q)) {
                            const sz = Math.max(5, 16 * Q.k);
                            drawAdditive(g, S.glowMote, Q.x, Q.y, sz, sz, fade * 0.65);
                        }
                    }
                }
                g.restore();
                g.globalCompositeOperation = 'source-over';
            }

            // 2C. Các vòng sóng phụ (Secondary Mini-Ripples) sinh ra đúng tại vị trí từng giọt nước văng rơi chạm lại mặt hồ!
            const tSinceImpact = tau - T.IMPACT;
            if (tSinceImpact > 0.25 && tSinceImpact < 1.95) {
                for (let i = 0; i < splash.length; i++) {
                    const sp = splash[i];
                    const dtDrop = tSinceImpact - sp.tLand;
                    if (dtDrop <= 0 || dtDrop >= 0.75) continue;
                    const pDrop = dtDrop / 0.75;
                    const rDrop = 4 + 58 * easeOutCubic(pDrop);
                    const aDrop = (1 - pDrop) * (1 - pDrop) * 0.72;
                    if (project(sp.xLand, 0, sp.zLand, Q2)) {
                        drawMiniRippleRing3D(g, sp.xLand, sp.zLand, rDrop, aDrop, Q2.k);
                    }
                }
            }

            // 2D. Các vòng sóng nhỏ sinh ra khi giọt nước từ cánh hoa đang nở nhỏ xuống mặt hồ!
            if (tau > T.BUD + 0.25 && tau < T.ENV_IN + 0.6) {
                for (let i = 0; i < bloomDrops.length; i++) {
                    const bd = bloomDrops[i];
                    const dtHit = (tau - bd.tDetach) - bd.tFall;
                    if (dtHit <= 0 || dtHit >= 0.68) continue;
                    const pHit = dtHit / 0.68;
                    const rHit = 3 + 42 * easeOutCubic(pHit);
                    const aHit = (1 - pHit) * (1 - pHit) * 0.68;
                    if (project(bd.xLand, 0, bd.zLand, Q2)) {
                        drawMiniRippleRing3D(g, bd.xLand, bd.zLand, rHit, aHit, Q2.k);
                    }
                }
            }

            g.restore();
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = 1;
        }

        // Hố lõm mặt nước 3D (Concave Water Crater), Vương miện màng nước (Crown Splash) & Cột nước dội ngược (Worthington Jet)
        function drawImpactCraterAndSplash3D(g, tau) {
            const t = tau - T.IMPACT;
            if (t < 0 || t > 1.25) return;

            g.save();
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = 1;
            g.lineJoin = 'round';
            g.lineCap = 'round';

            // 1. Hố lõm thuỷ lực 3D (Water Cavity Depression) & thành nước dựng đứng quanh miệng hố (t = 0..0.58s)
            if (t < 0.58 && project(0, 0, 0, P0)) {
                const pC = t / 0.58;
                const craterR = (22 + 64 * easeOutCubic(pC));
                const depth = 22 * Math.sin(Math.pow(pC, 0.65) * Math.PI);
                const rimH = 15 * Math.sin(Math.pow(pC, 0.55) * Math.PI);
                const fadeC = 1 - smooth((pC - 0.55) / 0.45);

                const rimPts = [];
                const botPts = [];
                const segs = 28;
                for (let s = 0; s <= segs; s++) {
                    const a = (s / segs) * TAU;
                    const crownMod = 1 + 0.18 * Math.sin(a * 12 + t * 8);
                    if (project(Math.cos(a) * craterR, rimH * crownMod, Math.sin(a) * craterR, Q)) {
                        rimPts.push({ x: Q.x, y: Q.y });
                    }
                    if (project(Math.cos(a) * craterR * 0.52, -depth, Math.sin(a) * craterR * 0.52, Q2)) {
                        botPts.push({ x: Q2.x, y: Q2.y });
                    }
                }

                if (rimPts.length > 10 && botPts.length > 10 && project(0, -depth, 0, P1)) {
                    // Lòng hố nước lõm sâu thẳm
                    const cg = g.createRadialGradient(P1.x, P1.y, 2, P0.x, P0.y, craterR * P0.k * 1.1);
                    cg.addColorStop(0.00, th.veil);
                    cg.addColorStop(0.50, th.lakeDeep);
                    cg.addColorStop(0.84, th.lakeHorizon);
                    cg.addColorStop(1.00, `rgba(${rgbRipple}, 0.85)`);
                    g.globalAlpha = fadeC * 0.92;
                    g.fillStyle = cg;
                    g.beginPath();
                    g.moveTo(rimPts[0].x, rimPts[0].y);
                    for (let s = 1; s < rimPts.length; s++) g.lineTo(rimPts[s].x, rimPts[s].y);
                    g.closePath();
                    g.fill();

                    // Viền bọt sóng & màng nước vương miện quanh miệng hố
                    g.strokeStyle = `rgba(255, 255, 255, ${(fadeC * 0.85).toFixed(3)})`;
                    g.lineWidth = Math.max(1.2, 2.4 * P0.k);
                    g.stroke();
                }

                // 14 phiến màng nước vương miện 3D bung cong lên từ miệng hố
                for (let i = 0; i < crownSheets.length; i++) {
                    const cs = crownSheets[i];
                    const rBase = craterR * 0.92;
                    const rTip = rBase + cs.vRad * t * 0.65;
                    const yTip = Math.max(0, cs.vUp * t - 0.5 * GRAV * t * t);
                    if (yTip <= 0.5) continue;
                    const aL = cs.az - cs.span;
                    const aR = cs.az + cs.span;
                    if (project(Math.cos(aL) * rBase, 1.5, Math.sin(aL) * rBase, P1) &&
                        project(Math.cos(aR) * rBase, 1.5, Math.sin(aR) * rBase, P2) &&
                        project(Math.cos(cs.az) * rTip, yTip, Math.sin(cs.az) * rTip, P3)) {
                        const sg = g.createLinearGradient((P1.x + P2.x) * 0.5, (P1.y + P2.y) * 0.5, P3.x, P3.y);
                        sg.addColorStop(0.0, `rgba(${th.waterSubsurface}, ${(fadeC * 0.38).toFixed(3)})`);
                        sg.addColorStop(0.65, `rgba(${rgbRipple}, ${(fadeC * 0.72).toFixed(3)})`);
                        sg.addColorStop(1.0, `rgba(255, 255, 255, ${(fadeC * 0.92).toFixed(3)})`);
                        g.fillStyle = sg;
                        g.beginPath();
                        g.moveTo(P1.x, P1.y);
                        g.quadraticCurveTo((P1.x + P3.x) * 0.5, P3.y, P3.x, P3.y);
                        g.quadraticCurveTo((P2.x + P3.x) * 0.5, P3.y, P2.x, P2.y);
                        g.closePath();
                        g.fill();
                    }
                }
            }

            // 2. Cột nước dội ngược Worthington Jet 3D tại tâm hồ (t = 0.04..0.72s) nâng nụ hoa trồi lên!
            if (t >= 0.04 && t < 0.74) {
                const pJ = (t - 0.04) / 0.70;
                const jetEnv = Math.sin(Math.pow(pJ, 0.58) * Math.PI);
                const jetH = 82 * jetEnv;
                const baseR = (26 - 12 * pJ) * (0.4 + 0.6 * jetEnv);
                const neckR = Math.max(4.5, baseR * 0.34);
                const bulbR = Math.max(6.5, baseR * 0.52);

                if (jetH > 3 &&
                    project(-cam.rx * baseR, 0, -cam.rz * baseR, P1) &&
                    project( cam.rx * baseR, 0,  cam.rz * baseR, P2) &&
                    project(-cam.rx * neckR, jetH * 0.68, -cam.rz * neckR, P2L) &&
                    project( cam.rx * neckR, jetH * 0.68,  cam.rz * neckR, P4R) &&
                    project(0, jetH, 0, P3)) {

                    const fadeJ = (1 - smooth((pJ - 0.55) / 0.45)) * 0.90;
                    const jg = g.createLinearGradient(P3.x, (P1.y + P2.y) * 0.5, P3.x, P3.y);
                    jg.addColorStop(0.00, th.lakeMid);
                    jg.addColorStop(0.38, `rgba(${th.waterSubsurface}, 0.85)`);
                    jg.addColorStop(0.78, `rgba(${rgbRipple}, 0.92)`);
                    jg.addColorStop(1.00, '#ffffff');

                    g.globalAlpha = fadeJ;
                    g.fillStyle = jg;
                    g.beginPath();
                    g.moveTo(P1.x, P1.y);
                    g.bezierCurveTo(P1.x * 0.6 + P2L.x * 0.4, P1.y, P2L.x, P2L.y, P3.x - bulbR * P3.k, P3.y);
                    g.arc(P3.x, P3.y, bulbR * P3.k, Math.PI, 0, false);
                    g.bezierCurveTo(P4R.x, P4R.y, P2.x * 0.6 + P4R.x * 0.4, P2.y, P2.x, P2.y);
                    g.closePath();
                    g.fill();

                    // Sống phản quang nước dọc thân cột Worthington
                    g.strokeStyle = `rgba(255, 255, 255, ${(fadeJ * 0.82).toFixed(3)})`;
                    g.lineWidth = Math.max(1.2, 2.2 * P3.k);
                    g.beginPath();
                    g.moveTo((P1.x + P2.x) * 0.5, (P1.y + P2.y) * 0.5);
                    g.lineTo(P3.x, P3.y - bulbR * P3.k * 0.4);
                    g.stroke();
                }
            }

            // 3. 36 Giọt nước cầu thuỷ tinh 3D văng theo quỹ đạo Parabol trọng trường (t = 0..1.15s)
            g.globalAlpha = 1;
            for (let i = 0; i < splash.length; i++) {
                const sp = splash[i];
                if (t >= sp.tLand) continue;
                const y = sp.vy0 * t - 0.5 * GRAV * t * t;
                if (y < 0) continue;
                const r = sp.vh0 * t;
                const x = Math.cos(sp.az) * r, z = Math.sin(sp.az) * r;
                if (!project(x, y, z, Q)) continue;

                const fadeD = clamp01(1 - (t / sp.tLand) * 0.35);
                const tPrev = Math.max(0, t - 0.028);
                const yPrev = Math.max(0, sp.vy0 * tPrev - 0.5 * GRAV * tPrev * tPrev);
                const rPrev = sp.vh0 * tPrev;
                if (project(Math.cos(sp.az) * rPrev, yPrev, Math.sin(sp.az) * rPrev, Q2)) {
                    g.strokeStyle = `rgba(${rgbRipple}, ${(fadeD * 0.68).toFixed(3)})`;
                    g.lineWidth = Math.max(1.0, sp.sz * 0.85 * Q.k);
                    g.beginPath();
                    g.moveTo(Q2.x, Q2.y);
                    g.lineTo(Q.x, Q.y);
                    g.stroke();
                }

                // Hạt nước 3D có lõi khúc xạ tối & điểm loé sáng trắng
                const dr = Math.max(1.6, sp.sz * 1.35 * Q.k);
                g.fillStyle = `rgba(${th.waterSubsurface}, ${(fadeD * 0.85).toFixed(3)})`;
                g.beginPath();
                g.arc(Q.x, Q.y, dr, 0, TAU);
                g.fill();
                g.fillStyle = `rgba(255, 255, 255, ${(fadeD * 0.95).toFixed(3)})`;
                g.beginPath();
                g.arc(Q.x - dr * 0.25, Q.y - dr * 0.28, dr * 0.52, 0, TAU);
                g.fill();
            }

            g.restore();
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = 1;
        }

        // =================================================================================
        // 3. HOA 3D TRONG KHU VƯỜN MẶT HỒ (ĐÀI LÁ SEN DẬP DỀNH THEO SÓNG VẬT LÝ + CÁNH 3D ĐẶC SẮC TỐ)
        // =================================================================================
        function prepareGardenFlowers(tau) {
            for (let i = 0; i < ground.length; i++) {
                const gf = ground[i];
                const age = tau - gf.born;
                if (age <= 0) { gf.vis = false; continue; }
                // Nở theo lò xo giảm chấn vật lý và dập dềnh theo đúng đỉnh sóng lan qua bán kính gf.r!
                const bloom = springOut(clamp01(age / 0.82), 8.2, 3.4, 1);
                const wave = sampleWaveAtRadius(gf.r, tau);
                const emergeBob = Math.exp(-age * 2.8) * Math.sin(age * 9.5) * 4.5;
                const wy = Math.sin(sc.clock * 1.9 + gf.bob) * 1.5 + wave.y + emergeBob;
                if (!project(gf.x, wy, gf.z, Q)) { gf.vis = false; continue; }
                gf.vis = true;
                gf.sx = Q.x; gf.sy = Q.y; gf.sz = Q.z; gf.k = Q.k;
                gf.bloom = bloom;
                gf.waveTilt = clamp01(0.5 + wave.slope * 0.35) - 0.5;
            }
            ground.sort((a, b) => b.sz - a.sz);
        }

        function drawGardenFlower3D(g, gf) {
            if (!gf.vis || gf.bloom <= 0.01) return;
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = 1;

            const k = gf.k;
            const scale = gf.bloom;
            const padR = gf.padSize * 0.56 * k * scale;
            const flwR = gf.size * 0.60 * k * scale;
            if (padR < 1.8) return;

            const dx = gf.x - cam.x, dy = -cam.y, dz = gf.z - cam.z;
            const dist = Math.hypot(dx, dy, dz) || 1;
            const sinElev = clamp01(Math.max(0.22, Math.abs(dy / dist)));
            const stemPx = gf.stemH * 0.45 * k * scale * (0.45 + 0.55 * (1 - sinElev));

            g.save();
            g.translate(gf.sx, gf.sy);
            if (gf.waveTilt) g.rotate(gf.waveTilt * 0.45);
            g.lineJoin = 'round';
            g.lineCap = 'round';

            // 3A. Bóng tối tiếp xúc mặt nước dưới lá sen & vòng gợn nước mỏng
            g.fillStyle = 'rgba(3, 1, 8, 0.52)';
            g.beginPath();
            g.ellipse(0, 2.2 * k, padR * 1.06, padR * 1.06 * sinElev, 0, 0, TAU);
            g.fill();

            g.strokeStyle = `rgba(${rgbRipple}, 0.24)`;
            g.lineWidth = Math.max(0.6, 0.95 * k);
            g.beginPath();
            g.ellipse(0, 1.8 * k, padR * 1.24, padR * 1.24 * sinElev, 0, 0, TAU);
            g.stroke();

            // 3B. Bóng phản chiếu mờ của đoá hoa dưới mặt nước (đậm màu nước, không làm loá)
            g.save();
            g.translate(0, 3.5 * k + stemPx * 0.4);
            g.scale(1, -sinElev * 0.55);
            g.globalAlpha = 0.14;
            g.fillStyle = th.petal.ao;
            g.beginPath();
            g.arc(0, 0, flwR * 0.82, 0, TAU);
            g.fill();
            g.restore();

            // 3C. Đài lá sen / lá súng 3D nổi trên mặt nước (Có khe chữ V & gân lá toả tròn)
            g.save();
            g.scale(1, sinElev);
            g.rotate(gf.notchRot);
            const padGrad = g.createRadialGradient(0, 0, padR * 0.08, 0, 0, padR);
            padGrad.addColorStop(0.0, th.pad[0]);
            padGrad.addColorStop(0.68, th.pad[1]);
            padGrad.addColorStop(1.0, th.pad[2]);
            g.fillStyle = padGrad;
            g.beginPath();
            g.moveTo(0, 0);
            g.arc(0, 0, padR, 0.20, TAU - 0.20);
            g.closePath();
            g.fill();
            g.strokeStyle = th.pad[2];
            g.lineWidth = Math.max(0.6, 0.85 * k);
            g.stroke();

            // Gân lá sen 3D
            if (padR > 6) {
                g.strokeStyle = 'rgba(210, 255, 225, 0.22)';
                g.lineWidth = Math.max(0.4, 0.55 * k);
                for (let v = 1; v <= 7; v++) {
                    const va = 0.35 + (v / 8) * (TAU - 0.70);
                    g.beginPath();
                    g.moveTo(0, 0);
                    g.lineTo(Math.cos(va) * padR * 0.88, Math.sin(va) * padR * 0.88);
                    g.stroke();
                }
            }
            g.restore();

            // 3D. Đoá hoa 3D 3 lớp cánh khum tròn đầy hướng lên trên (100% đặc sắc tố nhung, có viền khối rõ ràng)
            g.translate(0, -stemPx);
            const nPetals = gf.petalsCount;
            const openAmt = springPetalOpen(clamp01((gf.bloom - 0.10) / 0.90));

            for (let ring = 0; ring < 3; ring++) {
                const rScale = ring === 0 ? 1.0 : (ring === 1 ? 0.76 : 0.50);
                const pLen = flwR * (0.68 + 0.50 * openAmt) * rScale;
                const pWid = pLen * (ring === 2 ? 0.70 : 0.62);
                const ringLift = ring === 0 ? 0.12 : (ring === 1 ? 0.32 : 0.58);
                for (let p = 0; p < nPetals; p++) {
                    const ang = gf.rot + (p + ring * 0.38) * (TAU / nPetals);
                    const ca = Math.cos(ang), sa = Math.sin(ang);
                    const spread = (1 - ringLift * 0.55) * pLen * 0.46;
                    const px = ca * spread;
                    const py = sa * spread * sinElev - ringLift * pLen * 0.45 - (1 - openAmt) * pLen * 0.30;
                    g.save();
                    g.translate(px, py);
                    g.rotate(Math.atan2(sa * sinElev, ca) + Math.PI * 0.5);
                    const pg = g.createLinearGradient(0, pLen * 0.42, 0, -pLen * 0.58);
                    pg.addColorStop(0.00, th.petal.ao);
                    pg.addColorStop(0.38, th.petal.base);
                    pg.addColorStop(0.75, th.petal.mid);
                    pg.addColorStop(0.95, th.petal.tip);
                    pg.addColorStop(1.00, th.petal.rim);
                    g.fillStyle = pg;
                    g.beginPath();
                    g.moveTo(0, pLen * 0.38);
                    g.bezierCurveTo(-pWid, pLen * 0.14, -pWid * 0.92, -pLen * 0.50, 0, -pLen * 0.56);
                    g.bezierCurveTo(pWid * 0.92, -pLen * 0.50, pWid, pLen * 0.14, 0, pLen * 0.38);
                    g.closePath();
                    g.fill();
                    g.strokeStyle = 'rgba(28, 2, 14, 0.28)';
                    g.lineWidth = Math.max(0.35, 0.55 * k);
                    g.stroke();
                    g.restore();
                }
            }

            // 3E. Vương miện nhụy vàng 3D ở tâm hoa nhỏ
            const coreR = Math.max(1.4, flwR * 0.20);
            const coreY = -flwR * 0.14;
            const cg = g.createRadialGradient(0, coreY, coreR * 0.1, 0, coreY, coreR * 1.25);
            cg.addColorStop(0.0, '#fffef4');
            cg.addColorStop(0.45, th.accent);
            cg.addColorStop(0.85, th.petal.base);
            cg.addColorStop(1.0, th.petal.ao);
            g.fillStyle = cg;
            g.beginPath();
            g.ellipse(0, coreY, coreR * 1.1, coreR * (0.65 + 0.35 * sinElev), 0, 0, TAU);
            g.fill();

            if (flwR > 5) {
                const stCount = 8;
                g.strokeStyle = th.accent;
                g.lineWidth = Math.max(0.5, 0.7 * k);
                g.fillStyle = '#fffbe0';
                for (let s = 0; s < stCount; s++) {
                    const sa = (s / stCount) * TAU + gf.rot;
                    const sx = Math.cos(sa) * coreR * 1.25;
                    const sy = coreY + Math.sin(sa) * coreR * 0.95 * sinElev - coreR * 0.45;
                    g.beginPath();
                    g.moveTo(sx * 0.3, coreY);
                    g.lineTo(sx, sy);
                    g.stroke();
                    g.beginPath();
                    g.arc(sx, sy, Math.max(0.6, coreR * 0.24), 0, TAU);
                    g.fill();
                }
            }
            g.restore();
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = 1;
        }

        // =================================================================================
        // 4. ĐẠI ĐOÁ HOA CHỦ ĐẠO 3D (ĐÀI LÁ SEN HOÀNG GIA + CƠ HỌC NỞ CÁNH ĐÀN HỒI + LỰC ĐẨY ARCHIMEDES)
        // =================================================================================
        const drawQueue = [];
        const roundness = th.petal.roundness || 0.72;

        // Đánh giá điểm 3D trên bề mặt cong của cánh hoa:
        // u in [0..1] (từ gốc tới đỉnh cánh), v in [-1..1] (từ mép trái qua sống giữa tới mép phải)
        function evalHeroPetalPoint(p, hs, u, v, out) {
            const open = hs.open;
            const cup = p.cup * (0.72 + 0.28 * open);
            const baseTheta = p.theta;
            // Sóng đàn hồi sinh học lan từ gốc cánh ra đầu cánh khi bung mở (Biomechanical Whip Wave)
            const whipWave = Math.sin((u - p.uOpen * 1.1) * Math.PI * 1.5) * 0.08 * (1 - p.uOpen) * smooth(p.uOpen / 0.15);
            // Bụng cánh căng đầy ở giữa (bellyArch > 0) và đầu cánh khum vòng lên bầu trời (p.curlRad < 0) tạo dáng chén ngọc 3D!
            const bellyArch = Math.sin(u * Math.PI) * (0.14 + 0.08 * open) + whipWave;
            const localTheta = Math.max(0.05, baseTheta + bellyArch + p.curlRad * Math.pow(u, 1.55));
            const sa = Math.sin(localTheta), ca = Math.cos(localTheta);

            const sDist = u * p.len * hs.scale;
            const shapeProfile = Math.sin(Math.pow(u, 0.62) * Math.PI * 0.86) * (0.85 + 0.15 * roundness);
            const halfW = p.wid * 0.5 * hs.scale * shapeProfile;

            // Độ khum lòng chảo 3D (Transverse Cupping: hai mép cánh ôm cong lên trên tạo chiều sâu khối)
            const cupLift = (v * v) * halfW * cup * Math.sin(u * Math.PI * 0.90);
            const lateral = v * halfW * (1 - 0.12 * cup * v * v);

            const radDist = p.rb * hs.scale + sa * sDist - ca * cupLift;
            const heightY = hs.H + ca * sDist + sa * cupLift;

            const cp = p.cp, sp = p.sp;
            const rx = -sp, rz = cp;
            const swayFactor = clamp01(heightY / Math.max(1, hs.H));
            out.x = hs.sway * swayFactor + cp * radDist + rx * lateral;
            out.y = heightY;
            out.z = sp * radDist + rz * lateral;
        }

        const W0 = { x: 0, y: 0, z: 0 }, W1 = { ...W0 }, W2 = { ...W0 }, W2L = { ...W0 }, W3 = { ...W0 }, W4 = { ...W0 }, W4R = { ...W0 }, W5 = { ...W0 }, W6 = { ...W0 }, WTL = { ...W0 }, WTR = { ...W0 };

        function computeHeroState(tau) {
            const tBud = tau - (T.BUD - 0.08);
            const grow = clamp01(tBud / 1.08);
            if (grow <= 0) return { visible: false, H: 0, padY: 0, scale: 0, open: 0, sway: 0, crownTop: 0 };

            // 1. Lực đẩy nổi Archimedes (Archimedes Buoyancy): Nụ hoa phóng vọt từ cột nước Worthington, nhô cao rồi nhún xuống mặt nước!
            const archimedesBounce = Math.exp(-tBud * 2.9) * Math.sin(tBud * 8.6) * 7.8;
            // 2. Độ nhún tải trọng vật lý (Weight Recoil) khi Phong bì 3D đáp xuống đài hoa tại tau = T.ENV_IN (3.55s)
            const tEnv = Math.max(0, tau - T.ENV_IN);
            const envWeightDip = (tau >= T.ENV_IN && tau < T.LIFT + 0.2)
                ? -9.2 * Math.exp(-tEnv * 3.8) * Math.sin(tEnv * 10.8)
                : 0;
            const envPetalFlex = (tau >= T.ENV_IN && tau < T.LIFT + 0.2)
                ? 5.6 * Math.exp(-tEnv * 3.6) * Math.sin(tEnv * 10.8)
                : 0;

            const waterBob = Math.sin(sc.clock * 1.85) * 1.1 * smooth(tBud / 0.8);
            const padY = Math.max(-2.5, 0.8 + archimedesBounce * 0.38 + envWeightDip * 0.35 + waterBob * 0.45);
            const H = Math.max(2.0, th.hero.H * easeOutCubic(grow) + archimedesBounce + envWeightDip + waterBob);

            const scale = 0.24 + 0.76 * springOut(clamp01(tBud / 1.18), 7.5, 3.5, 1);
            const open = clamp01((tau - (T.BUD + 0.14)) / 1.48);
            const sway = (Math.sin(sc.clock * 1.05) * 2.2 + Math.sin(tBud * 7.2) * Math.exp(-tBud * 2.6) * 3.5) * grow;
            const breathe = Math.sin(sc.clock * 1.65) * 1.4 * smooth((tau - 3.6) / 0.8);

            let crownTop = 0;
            for (let i = 0; i < petals.length; i++) {
                const p = petals[i];
                const uRaw = clamp01((open - p.delay) / Math.max(0.22, 0.88 - p.delay));
                // Cánh hoa bung mở theo đường cong đàn hồi lò xo sinh học (có độ nảy nhẹ khi bung cánh!)
                const uSpring = springPetalOpen(uRaw);
                let deg;
                if (uRaw < 0.62) deg = lerp(p.a0, p.a1, springPetalOpen(uRaw / 0.62));
                else deg = lerp(p.a1, p.a2, springPetalOpen((uRaw - 0.62) / 0.38));
                // Tải trọng phong bì đè nhẹ các lớp cánh mở rộng thêm vài độ rồi đàn hồi lại
                deg += envPetalFlex * (0.45 + 0.55 * (1 - p.ld));
                deg += breathe * (0.4 + 0.6 * (1 - p.ld));
                p.theta = deg * DEG;
                p.curlRad = p.curl * DEG * Math.min(1.12, uSpring);
                p.uOpen = uRaw;
                const phi = p.az + sc.clock * 0.018;
                p.cp = Math.cos(phi);
                p.sp = Math.sin(phi);

                evalHeroPetalPoint(p, { H, scale, open, sway }, 0.65, 0, W0);
                evalHeroPetalPoint(p, { H, scale, open, sway }, 1.00, 0, W1);
                crownTop = Math.max(crownTop, W0.y - H, W1.y - H);
            }

            return { visible: true, grow, H, padY, scale, open, sway, crownTop, envWeightDip };
        }

        function queueHeroFlower3D(hs, ms) {
            drawQueue.length = 0;
            if (!hs.visible) return;

            const isRefl = ms < 0;
            const elev = Math.atan2(cam.y - hs.H, Math.hypot(cam.x, cam.z));
            const centerZ = project(hs.sway, hs.H * ms, 0, P0) ? P0.z : 400;
            const hdx = cam.x - hs.sway, hdz = cam.z;
            const hLen = Math.hypot(hdx, hdz) || 1;
            const vx = hdx / hLen, vz = hdz / hLen;

            // 4A. Đài Lá Sen Hoàng Gia 3D (Royal Lotus Leaf Pad) nổi và nhún trên mặt nước ngay dưới chân Đại Đoá Hoa
            if (!isRefl && hs.grow > 0.05) {
                const padScale = springOut(clamp01(hs.grow / 0.82), 7.8, 3.4, 1) * hs.scale;
                const padWorldR = 98 * padScale;
                const padPts = [];
                const nSegs = 32;
                const notchAz = 0.85; // Khe chữ V duyên dáng phía bên phải
                const basePadY = hs.padY !== undefined ? hs.padY : 0.8;
                for (let s = 0; s <= nSegs; s++) {
                    const a = notchAz + 0.20 + (s / nSegs) * (TAU - 0.40);
                    const waveR = padWorldR * (1 + 0.03 * Math.sin(a * 6 + sc.clock * 1.2));
                    const waveY = basePadY + Math.sin(a * 5 + sc.clock * 1.5) * 1.2;
                    if (project(Math.cos(a) * waveR, waveY, Math.sin(a) * waveR, Q)) {
                        padPts.push({ x: Q.x, y: Q.y });
                    }
                }
                if (padPts.length > 10 && project(0, basePadY, 0, P0)) {
                    drawQueue.push({
                        kind: 'hero_pad',
                        key: centerZ + 220, // Luôn vẽ dưới đáy hoa và trên mặt nước
                        cx: P0.x,
                        cy: P0.y,
                        k: P0.k,
                        rPx: padWorldR * P0.k,
                        pts: padPts
                    });
                }
            }

            // 4B. Cuống hoa 3D ngắn thanh thoát nối từ tâm Đài Lá Sen Hoàng Gia lên Đế Hoa
            if (project(0, 0.8 * ms, 0, P0) &&
                project(hs.sway * 0.25, hs.H * 0.36 * ms, 0, P1) &&
                project(hs.sway * 0.65, hs.H * 0.72 * ms, 0, P2) &&
                project(hs.sway, hs.H * ms, 0, P3)) {
                drawQueue.push({
                    kind: 'stem_curve',
                    key: centerZ + 180,
                    x0: P0.x, y0: P0.y,
                    x1: P1.x, y1: P1.y,
                    x2: P2.x, y2: P2.y,
                    x3: P3.x, y3: P3.y,
                    wBase: 8.0 * P0.k * hs.scale,
                    wTop: 6.5 * P3.k * hs.scale,
                    refl: isRefl
                });
            }

            // 4C. Lá non 3D & Đài hoa 6 cánh xanh ngọc ôm sát chân đoá hoa
            if (th.leaf && hs.grow > 0.20) {
                const leafGrow = easeOutBack(clamp01((hs.grow - 0.20) / 0.65));
                for (let side = -1; side <= 1; side += 2) {
                    const ly = hs.H * (side < 0 ? 0.62 : 0.78);
                    const lx = hs.sway * (side < 0 ? 0.25 : 0.45);
                    const phi = side * 1.12 + Math.sin(sc.clock * 1.4 + side) * 0.08;
                    const len = 62 * leafGrow * hs.scale;
                    const wid = 28 * leafGrow * hs.scale;
                    const cp = Math.cos(phi), sp = Math.sin(phi);
                    const rx = -sp * wid * 0.5, rz = cp * wid * 0.5;
                    const mx = lx + cp * len * 0.52, my = ly + 10 * leafGrow;
                    const mz = sp * len * 0.52;
                    const tx = lx + cp * len, ty = ly + 4 * leafGrow, tz = sp * len;
                    if (project(lx, ly * ms, 0, P0) &&
                        project(mx - rx, (my + 4) * ms, mz - rz, P1) &&
                        project(tx, ty * ms, tz, P2) &&
                        project(mx + rx, (my - 2) * ms, mz + rz, P3)) {
                        drawQueue.push({
                            kind: 'leaf',
                            key: centerZ + 145,
                            bx: P0.x, by: P0.y,
                            lx: P1.x, ly: P1.y,
                            tx: P2.x, ty: P2.y,
                            rx: P3.x, ry: P3.y,
                            refl: isRefl
                        });
                    }
                }
            }

            if (!isRefl && hs.grow > 0.25) {
                for (let s = 0; s < 6; s++) {
                    const az = (s / 6) * TAU + 0.25;
                    const cp = Math.cos(az), sp = Math.sin(az);
                    const sLen = 48 * hs.scale;
                    const sWid = 22 * hs.scale;
                    const bx = hs.sway + cp * 8 * hs.scale, by = hs.H - 1 * hs.scale, bz = sp * 8 * hs.scale;
                    const tx = hs.sway + cp * sLen, ty = hs.H + 5 * hs.scale, tz = sp * sLen;
                    const mx = (bx + tx) * 0.5, my = hs.H - 3 * hs.scale, mz = (bz + tz) * 0.5;
                    const rx = -sp * sWid * 0.5, rz = cp * sWid * 0.5;
                    if (project(bx, by, bz, P0) && project(mx - rx, my, mz - rz, P1) && project(tx, ty, tz, P2) && project(mx + rx, my, mz + rz, P3)) {
                        drawQueue.push({
                            kind: 'sepal',
                            key: centerZ + 125,
                            bx: P0.x, by: P0.y,
                            lx: P1.x, ly: P1.y,
                            tx: P2.x, ty: P2.y,
                            rx: P3.x, ry: P3.y
                        });
                    }
                }
            }

            // 4D. Các cánh hoa 3D cong Bezier tròn đầy (Sắp xếp theo hình học vỏ trụ lồng nhau Nested Cylindrical Shells!)
            const highViewMix = !isRefl ? smooth((elev - 34 * DEG) / (16 * DEG)) : 0;
            for (let i = 0; i < petals.length; i++) {
                const p = petals[i];
                evalHeroPetalPoint(p, hs, 0.00,  0.00, W0);  // Q0: Gốc cánh
                evalHeroPetalPoint(p, hs, 0.26, -0.92, W1);  // Q1: Bụng dưới trái
                evalHeroPetalPoint(p, hs, 0.54, -1.00, W2L); // Q2: Bụng giữa trái
                evalHeroPetalPoint(p, hs, 0.80, -0.86, W2);  // Q3: Vai trên trái
                evalHeroPetalPoint(p, hs, 0.96, -0.46, WTL); // Q4: Vòm đỉnh trái
                evalHeroPetalPoint(p, hs, 1.00,  0.00, W3);  // Q5: Đỉnh giữa cánh
                evalHeroPetalPoint(p, hs, 0.96,  0.46, WTR); // Q6: Vòm đỉnh phải
                evalHeroPetalPoint(p, hs, 0.80,  0.86, W4);  // Q7: Vai trên phải
                evalHeroPetalPoint(p, hs, 0.54,  1.00, W4R); // Q8: Bụng giữa phải
                evalHeroPetalPoint(p, hs, 0.26,  0.92, W5);  // Q9: Bụng dưới phải
                evalHeroPetalPoint(p, hs, 0.52,  0.00, W6);  // Tâm lòng cánh

                if (!project(W0.x, W0.y * ms, W0.z, P0) ||
                    !project(W1.x, W1.y * ms, W1.z, P1) ||
                    !project(W2L.x, W2L.y * ms, W2L.z, P2L) ||
                    !project(W2.x, W2.y * ms, W2.z, P2) ||
                    !project(WTL.x, WTL.y * ms, WTL.z, PTL) ||
                    !project(W3.x, W3.y * ms, W3.z, P3) ||
                    !project(WTR.x, WTR.y * ms, WTR.z, PTR) ||
                    !project(W4.x, W4.y * ms, W4.z, P4) ||
                    !project(W4R.x, W4R.y * ms, W4R.z, P4R) ||
                    !project(W5.x, W5.y * ms, W5.z, P5) ||
                    !project(W6.x, W6.y * ms, W6.z, P6)) continue;

                const frontCos = p.cp * vx + p.sp * vz; // +1 = phía trước đối diện camera, -1 = phía sau
                const sa = Math.sin(p.theta), ca = Math.cos(p.theta);
                const nx = -ca * p.cp, ny = sa * ms, nz = -ca * p.sp;
                const vdx = cam.x - W6.x, vdy = cam.y - W6.y * ms, vdz = cam.z - W6.z;
                const vLen = Math.hypot(vdx, vdy, vdz) || 1;
                const viewDot = (nx * vdx + ny * vdy + nz * vdz) / vLen;
                // Khi hoa đã bung nở (uOpen > 0.35), luôn hiển thị sắc cánh nhung rực rỡ thay vì mảng tối mặt lưng
                const isFrontFace = viewDot >= -0.06 || p.uOpen > 0.32;

                const ndl = nx * L_DIR[0] + ny * L_DIR[1] + nz * L_DIR[2];
                const lightVal = clamp01(0.54 + 0.36 * ndl + 0.16 * hs.open);
                const sideLight = (-p.sp * L_DIR[0] + p.cp * L_DIR[2]);

                let dewScreen = null;
                // Chỉ đọng sương trên các cánh lớp ngoài hướng về phía người xem/hai bên để không bị lấp lửng ở đáy hoa
                if (!isRefl && p.hasDew && hs.open > 0.42 && frontCos > -0.25 && frontCos < 0.78) {
                    evalHeroPetalPoint(p, hs, 0.68, p.dewV, W0);
                    if (project(W0.x, W0.y + 1.8, W0.z, Q)) {
                        dewScreen = { x: Q.x, y: Q.y, r: Math.max(2.4, p.dewR * Q.k * hs.scale) };
                    }
                }

                // Định lý vỏ trụ lồng nhau (Nested Cylindrical Shell Depth):
                // - Nửa trước (frontCos > 0): Lớp ngoài (li=0, shellR=92) có key nhỏ nhất -> luôn vẽ SAU CÙNG, ôm trọn lớp trong (li=1..4) và nhụy!
                // - Nửa sau (frontCos < 0): Lớp ngoài (li=0, shellR=92) có key lớn nhất -> luôn vẽ ĐẦU TIÊN, nằm phía sau lớp trong và nhụy!
                const shellR = 92 - p.li * 16;
                const lateralWrap = (1 - p.ld) * 8 * (1 - highViewMix) - p.ld * 14 * highViewMix;
                const shellKey = centerZ - frontCos * shellR - lateralWrap;

                drawQueue.push({
                    kind: 'petal',
                    key: shellKey,
                    p0x: P0.x, p0y: P0.y,
                    p1x: P1.x, p1y: P1.y,
                    p2lx: P2L.x, p2ly: P2L.y,
                    p2x: P2.x, p2y: P2.y,
                    tlx: PTL.x, tly: PTL.y,
                    p3x: P3.x, p3y: P3.y,
                    trx: PTR.x, try: PTR.y,
                    p4x: P4.x, p4y: P4.y,
                    p4rx: P4R.x, p4ry: P4R.y,
                    p5x: P5.x, p5y: P5.y,
                    p6x: P6.x, p6y: P6.y,
                    k: P6.k,
                    ld: p.ld,
                    li: p.li,
                    uOpen: p.uOpen,
                    isFrontFace,
                    lightVal,
                    sideLight,
                    shape: th.petal.shape,
                    dew: dewScreen,
                    refl: isRefl
                });
            }

            // 4E. Vương miện 42 sợi nhụy vàng 3D & Đế nhuỵ (Receptacle) nằm đúng trong lòng chén hoa (shellR = 0..14 < 26)
            if (!isRefl && hs.open > 0.25) {
                const stOpen = clamp01((hs.open - 0.25) / 0.65);
                if (project(hs.sway, hs.H + 8 * hs.scale, 0, P0)) {
                    drawQueue.push({
                        kind: 'receptacle',
                        key: centerZ + 2 - 22 * highViewMix,
                        x: P0.x, y: P0.y,
                        r: 16 * hs.scale * P0.k * stOpen
                    });
                }
                for (let i = 0; i < stamens.length; i++) {
                    const st = stamens[i];
                    const cp = Math.cos(st.az + sc.clock * 0.02), sp = Math.sin(st.az + sc.clock * 0.02);
                    const stFrontCos = cp * vx + sp * vz;
                    const ang = st.spread * stOpen + Math.sin(sc.clock * 2.2 + st.ph) * 0.05;
                    const sa = Math.sin(ang), ca = Math.cos(ang);
                    const len = (st.len + 10) * hs.scale * stOpen;
                    const bx = hs.sway + cp * st.rb * hs.scale;
                    const by = hs.H + 6 * hs.scale;
                    const bz = sp * st.rb * hs.scale;
                    const mx = bx + cp * sa * len * 0.45;
                    const my = by + ca * len * 0.58;
                    const mz = bz + sp * sa * len * 0.45;
                    const tx = bx + cp * sa * len;
                    const ty = by + ca * len;
                    const tz = bz + sp * sa * len;
                    if (project(bx, by, bz, P0) && project(mx, my, mz, P1) && project(tx, ty, tz, P2)) {
                        const stShellR = 14 - st.ring * 3;
                        drawQueue.push({
                            kind: 'stamen',
                            key: centerZ - stFrontCos * stShellR - 24 * highViewMix,
                            bx: P0.x, by: P0.y,
                            mx: P1.x, my: P1.y,
                            tx: P2.x, ty: P2.y,
                            k: P2.k,
                            ring: st.ring
                        });
                    }
                }
            }

            drawQueue.sort((a, b) => b.key - a.key);
        }

        // Đường bao cánh hoa B-Spline bậc 2 qua trung điểm (Liên tục C1 tuyệt đối 100% tại mọi điểm, không bao giờ có góc gãy ở vai hay đỉnh!)
        function traceHeroPetalPath(g, s) {
            const tipX = s.shape === 'sakura' ? lerp(s.p6x, s.p3x, 0.84) : s.p3x;
            const tipY = s.shape === 'sakura' ? lerp(s.p6y, s.p3y, 0.84) : s.p3y;
            const kx = [s.p1x, s.p2lx, s.p2x, s.tlx, tipX, s.trx, s.p4x, s.p4rx, s.p5x];
            const ky = [s.p1y, s.p2ly, s.p2y, s.tly, tipY, s.try, s.p4y, s.p4ry, s.p5y];

            g.beginPath();
            g.moveTo(s.p0x, s.p0y);
            for (let k = 0; k < 8; k++) {
                const mx = (kx[k] + kx[k + 1]) * 0.5;
                const my = (ky[k] + ky[k + 1]) * 0.5;
                g.quadraticCurveTo(kx[k], ky[k], mx, my);
            }
            g.quadraticCurveTo(kx[8], ky[8], s.p0x, s.p0y);
            g.closePath();
        }

        // Đường bao mượt B-Spline bậc 2 cho Đài Lá Sen Hoàng Gia 3D
        function traceLotusPadPath(g, cx, cy, pts) {
            g.beginPath();
            g.moveTo(cx, cy);
            g.lineTo(pts[0].x, pts[0].y);
            for (let p = 1; p < pts.length - 1; p++) {
                const mx = (pts[p].x + pts[p + 1].x) * 0.5;
                const my = (pts[p].y + pts[p + 1].y) * 0.5;
                g.quadraticCurveTo(pts[p].x, pts[p].y, mx, my);
            }
            const last = pts[pts.length - 1];
            g.lineTo(last.x, last.y);
            g.closePath();
        }

        function renderHeroFlower3D(g, hs, isRefl) {
            if (!hs.visible) return;
            queueHeroFlower3D(hs, isRefl ? -1 : 1);

            g.save();
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = isRefl ? 0.14 : 1.0;
            g.lineJoin = 'round';
            g.lineCap = 'round';

            for (let i = 0; i < drawQueue.length; i++) {
                const it = drawQueue[i];

                if (it.kind === 'hero_pad') {
                    // Đài Lá Sen Hoàng Gia 3D nổi trên mặt nước ngay dưới chân Đại Đoá Hoa
                    const pts = it.pts;
                    // 1. Bóng tối tiếp xúc mặt nước dưới đài lá
                    g.save();
                    g.translate(0, 3.8 * it.k);
                    g.fillStyle = 'rgba(2, 1, 6, 0.58)';
                    traceLotusPadPath(g, it.cx, it.cy, pts);
                    g.fill();
                    g.restore();

                    // 2. Bề mặt lá sen 3D đặc 100% với Gradient toả tròn từ tâm
                    const padG = g.createRadialGradient(it.cx, it.cy, it.rPx * 0.06, it.cx, it.cy, it.rPx * 1.05);
                    padG.addColorStop(0.00, th.pad[0]);
                    padG.addColorStop(0.62, th.pad[1]);
                    padG.addColorStop(0.92, th.pad[2]);
                    padG.addColorStop(1.00, th.stemHi);
                    g.fillStyle = padG;
                    traceLotusPadPath(g, it.cx, it.cy, pts);
                    g.fill();

                    // 3. Viền mép lá bắt sáng & gân lá sen toả tròn
                    g.strokeStyle = th.pad[2];
                    g.lineWidth = Math.max(1.0, 1.4 * it.k);
                    g.stroke();

                    g.strokeStyle = 'rgba(215, 255, 230, 0.22)';
                    g.lineWidth = Math.max(0.7, 0.95 * it.k);
                    for (let p = 2; p < pts.length - 2; p += 4) {
                        g.beginPath();
                        g.moveTo(it.cx, it.cy);
                        const mx = (it.cx + pts[p].x) * 0.5;
                        const my = (it.cy + pts[p].y) * 0.5 - 1.8 * it.k;
                        g.quadraticCurveTo(mx, my, lerp(it.cx, pts[p].x, 0.92), lerp(it.cy, pts[p].y, 0.92));
                        g.stroke();
                    }
                    continue;
                }

                if (it.kind === 'stem_curve') {
                    // Cuống hoa 3D thanh thoát hoà vào tâm Đài Lá Sen
                    const wMid = Math.max(2.0, (it.wBase + it.wTop) * 0.5);
                    g.strokeStyle = th.pad[0];
                    g.lineWidth = wMid;
                    g.beginPath();
                    g.moveTo(it.x0, it.y0);
                    g.bezierCurveTo(it.x1, it.y1, it.x2, it.y2, it.x3, it.y3);
                    g.stroke();

                    g.strokeStyle = th.stem;
                    g.lineWidth = wMid * 0.76;
                    g.beginPath();
                    g.moveTo(it.x0 - wMid * 0.06, it.y0);
                    g.bezierCurveTo(it.x1 - wMid * 0.06, it.y1, it.x2 - wMid * 0.06, it.y2, it.x3 - wMid * 0.06, it.y3);
                    g.stroke();

                    if (!isRefl) {
                        g.strokeStyle = th.stemHi;
                        g.lineWidth = wMid * 0.30;
                        g.beginPath();
                        g.moveTo(it.x0 - wMid * 0.16, it.y0);
                        g.bezierCurveTo(it.x1 - wMid * 0.16, it.y1, it.x2 - wMid * 0.16, it.y2, it.x3 - wMid * 0.16, it.y3);
                        g.stroke();
                    }
                    continue;
                }

                if (it.kind === 'leaf' || it.kind === 'sepal') {
                    const lg = g.createLinearGradient(it.bx, it.by, it.tx, it.ty);
                    lg.addColorStop(0.0, th.leaf ? th.leaf[0] : '#0b291b');
                    lg.addColorStop(0.55, th.leaf ? th.leaf[1] : '#276b46');
                    lg.addColorStop(1.0, th.leaf ? th.leaf[2] : '#7ad49c');
                    g.fillStyle = lg;
                    g.beginPath();
                    g.moveTo(it.bx, it.by);
                    g.quadraticCurveTo(it.lx, it.ly, it.tx, it.ty);
                    g.quadraticCurveTo(it.rx, it.ry, it.bx, it.by);
                    g.closePath();
                    g.fill();
                    if (!isRefl) {
                        g.strokeStyle = 'rgba(255, 248, 215, 0.36)';
                        g.lineWidth = 0.9;
                        g.beginPath();
                        g.moveTo(it.bx, it.by);
                        g.quadraticCurveTo((it.lx + it.rx) * 0.5, (it.ly + it.ry) * 0.5, it.tx, it.ty);
                        g.stroke();
                    }
                    continue;
                }

                if (it.kind === 'petal') {
                    const pt = th.petal;
                    g.globalCompositeOperation = 'source-over';

                    if (isRefl) {
                        // Bóng phản chiếu dưới mặt nước: hấp thụ màu nước tối, không bao giờ hiện rõ như cánh hoa thật dưới lá sen
                        traceHeroPetalPath(g, it);
                        const rg = g.createLinearGradient(it.p0x, it.p0y, it.p3x, it.p3y);
                        rg.addColorStop(0.00, th.lakeDeep);
                        rg.addColorStop(0.55, mixHex(pt.ao, th.lakeMid, 0.55));
                        rg.addColorStop(1.00, mixHex(pt.base, th.lakeHorizon, 0.45));
                        g.fillStyle = rg;
                        g.fill();
                        continue;
                    }

                    g.globalAlpha = 1.0;

                    // Bóng đổ lớp cánh trên xuống lớp cánh dưới (Inter-petal 3D Drop Shadow)
                    if (it.li > 0) {
                        g.save();
                        g.translate(0, 3.4 * it.k);
                        traceHeroPetalPath(g, it);
                        g.fillStyle = 'rgba(10, 1, 6, 0.34)';
                        g.fill();
                        g.restore();
                    }

                    traceHeroPetalPath(g, it);

                    // Lớp lót sắc tố đặc 100% (Solid Undercoat) đảm bảo cánh hoa có độ dày vật lý tuyệt đối, không bao giờ nhìn xuyên thấu
                    g.fillStyle = pt.base;
                    g.fill();

                    // 1. Gradient dọc từ gốc cánh (Ambient Occlusion sâu) ra tới đỉnh cánh (Rim nhung mịn, không cháy trắng)
                    const pg = g.createLinearGradient(it.p0x, it.p0y, it.p3x, it.p3y);
                    if (it.isFrontFace) {
                        const aoStop = clamp01(0.18 + (1 - it.uOpen) * 0.14 + it.ld * 0.08);
                        pg.addColorStop(0.00, pt.ao);
                        pg.addColorStop(aoStop, mixHex(pt.ao, pt.base, it.lightVal * 0.85));
                        pg.addColorStop(0.62, mixHex(pt.base, pt.mid, clamp01(it.lightVal * 0.96)));
                        pg.addColorStop(0.90, mixHex(pt.mid, pt.tip, clamp01(0.55 + it.lightVal * 0.35)));
                        pg.addColorStop(1.00, pt.rim);
                    } else {
                        pg.addColorStop(0.00, pt.backAo);
                        pg.addColorStop(0.48, pt.backBase);
                        pg.addColorStop(0.88, pt.backTip);
                        pg.addColorStop(1.00, pt.tip);
                    }
                    g.fillStyle = pg;
                    g.fill();

                    // 2. Đổ bóng chiều sâu ngang (Lateral 3D Cup Curvature Shading)
                    g.save();
                    g.clip();
                    const latGrad = g.createLinearGradient(it.p2lx, it.p2ly, it.p4rx, it.p4ry);
                    const leftBright = it.sideLight > 0;
                    latGrad.addColorStop(0.00, leftBright ? 'rgba(255,235,242,0.14)' : 'rgba(16,1,9,0.32)');
                    latGrad.addColorStop(0.50, 'rgba(0,0,0,0)');
                    latGrad.addColorStop(1.00, leftBright ? 'rgba(16,1,9,0.32)' : 'rgba(255,235,242,0.14)');
                    g.fillStyle = latGrad;
                    const minX = Math.min(it.p0x, it.p2lx, it.p2x, it.p3x, it.p4x, it.p4rx) - 6;
                    const maxX = Math.max(it.p0x, it.p2lx, it.p2x, it.p3x, it.p4x, it.p4rx) + 6;
                    const minY = Math.min(it.p0y, it.p2ly, it.p2y, it.p3y, it.p4y, it.p4ry) - 6;
                    const maxY = Math.max(it.p0y, it.p2ly, it.p2y, it.p3y, it.p4y, it.p4ry) + 6;
                    g.fillRect(minX, minY, maxX - minX, maxY - minY);

                    // 3. Vân lụa hữu cơ uốn cong mềm theo lòng cánh
                    g.strokeStyle = `rgba(${pt.vein}, 0.14)`;
                    g.lineWidth = Math.max(0.5, 0.85 * it.k);
                    for (let v = -2; v <= 2; v++) {
                        const vf = v * 0.28;
                        const cx = lerp(it.p6x, vf < 0 ? it.p2lx : it.p4rx, Math.abs(vf));
                        const cy = lerp(it.p6y, vf < 0 ? it.p2ly : it.p4ry, Math.abs(vf));
                        const ex = lerp(it.p3x, vf < 0 ? it.p2x : it.p4x, Math.abs(vf) * 0.85);
                        const ey = lerp(it.p3y, vf < 0 ? it.p2y : it.p4y, Math.abs(vf) * 0.85);
                        g.beginPath();
                        g.moveTo(it.p0x, it.p0y);
                        g.quadraticCurveTo(cx, cy, ex, ey);
                        g.stroke();
                    }
                    g.restore();

                    // 4. Viền khối tối (Botanical Edge Contour) + Viền bắt sáng Fresnel dọc mép cánh giúp tách bạch từng lớp cánh
                    traceHeroPetalPath(g, it);
                    g.strokeStyle = 'rgba(28, 2, 14, 0.34)';
                    g.lineWidth = Math.max(0.9, 1.5 * it.k);
                    g.stroke();

                    const rimGrad = g.createLinearGradient(it.p0x, it.p0y, it.p3x, it.p3y);
                    rimGrad.addColorStop(0.00, 'rgba(255, 255, 255, 0)');
                    rimGrad.addColorStop(0.55, 'rgba(255, 240, 245, 0.05)');
                    rimGrad.addColorStop(0.84, it.isFrontFace ? 'rgba(255, 240, 245, 0.24)' : 'rgba(255, 225, 215, 0.14)');
                    rimGrad.addColorStop(1.00, it.isFrontFace ? 'rgba(255, 245, 248, 0.46)' : 'rgba(255, 225, 215, 0.26)');
                    g.strokeStyle = rimGrad;
                    g.lineWidth = Math.max(0.65, 1.05 * it.k);
                    g.stroke();

                    // 5. Giọt sương mai pha lê 3D đọng trên cánh hoa
                    if (it.dew) {
                        const dw = it.dew;
                        g.fillStyle = 'rgba(20, 2, 12, 0.42)';
                        g.beginPath();
                        g.ellipse(dw.x + dw.r * 0.2, dw.y + dw.r * 0.35, dw.r * 0.95, dw.r * 0.65, 0, 0, TAU);
                        g.fill();
                        const dg = g.createRadialGradient(dw.x - dw.r * 0.3, dw.y - dw.r * 0.3, dw.r * 0.1, dw.x, dw.y, dw.r);
                        dg.addColorStop(0.0, '#ffffff');
                        dg.addColorStop(0.45, 'rgba(255, 240, 246, 0.85)');
                        dg.addColorStop(0.85, pt.mid);
                        dg.addColorStop(1.0, 'rgba(255, 255, 255, 0.92)');
                        g.fillStyle = dg;
                        g.beginPath();
                        g.arc(dw.x, dw.y, dw.r, 0, TAU);
                        g.fill();
                        g.fillStyle = '#ffffff';
                        g.beginPath();
                        g.arc(dw.x - dw.r * 0.32, dw.y - dw.r * 0.32, dw.r * 0.28, 0, TAU);
                        g.fill();
                    }
                    continue;
                }

                if (it.kind === 'receptacle') {
                    const rg = g.createRadialGradient(it.x, it.y, 1, it.x, it.y, Math.max(4, it.r * 1.35));
                    rg.addColorStop(0.0, '#fffef2');
                    rg.addColorStop(0.48, th.accent);
                    rg.addColorStop(0.85, th.petal.base);
                    rg.addColorStop(1.0, 'rgba(45, 2, 18, 0)');
                    g.fillStyle = rg;
                    g.beginPath();
                    g.arc(it.x, it.y, Math.max(4, it.r * 1.35), 0, TAU);
                    g.fill();
                    continue;
                }

                if (it.kind === 'stamen') {
                    const sg = g.createLinearGradient(it.bx, it.by, it.tx, it.ty);
                    sg.addColorStop(0.0, th.petal.ao);
                    sg.addColorStop(0.45, '#e09f2d');
                    sg.addColorStop(1.0, '#fff6c2');
                    g.strokeStyle = sg;
                    g.lineWidth = Math.max(0.9, (1.6 - it.ring * 0.25) * it.k);
                    g.beginPath();
                    g.moveTo(it.bx, it.by);
                    g.quadraticCurveTo(it.mx, it.my, it.tx, it.ty);
                    g.stroke();

                    if (th.center === 'pearls') {
                        const pr = Math.max(3.5, (7.5 - it.ring * 1.2) * it.k);
                        g.drawImage(S.pearl, it.tx - pr, it.ty - pr, pr * 2, pr * 2);
                    } else {
                        const ar = Math.max(1.8, (3.4 - it.ring * 0.4) * it.k);
                        g.fillStyle = '#fff9d6';
                        g.beginPath();
                        g.arc(it.tx, it.ty, ar, 0, TAU);
                        g.fill();
                    }
                }
            }

            g.restore();
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = 1;
        }

        // Vẽ các giọt nước hồ rũ rơi vật lý từ đầu cánh hoa khi bung nở + hạt phấn hoa hoàng kim bay lên khi lòng hoa mở
        function drawBloomDropsAndPollen3D(g, tau, hs) {
            if (!hs.visible) return;
            g.save();
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = 1;
            g.lineCap = 'round';

            // 1. Giọt nước rũ rơi từ các tầng cánh hoa đang mở xuống mặt hồ (tau = 2.05..3.55s)
            if (tau > T.BUD + 0.12 && tau < T.ENV_IN + 0.35) {
                for (let i = 0; i < bloomDrops.length; i++) {
                    const bd = bloomDrops[i];
                    const dt = tau - bd.tDetach;
                    if (dt <= 0 || dt >= bd.tFall) continue;
                    const x = hs.sway + bd.x0 + bd.vx * dt;
                    const z = bd.z0 + bd.vz * dt;
                    const y = bd.y0 + bd.vy * dt - 0.5 * bd.dropG * dt * dt;
                    if (y <= 0 || !project(x, y, z, Q)) continue;

                    const dt0 = Math.max(0, dt - 0.025);
                    const y0 = Math.max(0, bd.y0 + bd.vy * dt0 - 0.5 * bd.dropG * dt0 * dt0);
                    if (project(hs.sway + bd.x0 + bd.vx * dt0, y0, bd.z0 + bd.vz * dt0, Q2)) {
                        g.strokeStyle = `rgba(${rgbRipple}, 0.62)`;
                        g.lineWidth = Math.max(0.8, bd.sz * 0.75 * Q.k);
                        g.beginPath();
                        g.moveTo(Q2.x, Q2.y);
                        g.lineTo(Q.x, Q.y);
                        g.stroke();
                    }

                    const dr = Math.max(1.4, bd.sz * 1.25 * Q.k);
                    g.fillStyle = `rgba(${th.waterSubsurface}, 0.82)`;
                    g.beginPath();
                    g.arc(Q.x, Q.y, dr, 0, TAU);
                    g.fill();
                    g.fillStyle = '#ffffff';
                    g.beginPath();
                    g.arc(Q.x - dr * 0.25, Q.y - dr * 0.25, dr * 0.48, 0, TAU);
                    g.fill();
                }
            }

            // 2. Hạt phấn hoa hoàng kim bung toả vật lý khi nhụy hoa thức tỉnh (tau >= T.HEART - 0.15)
            const dtPollen = tau - (T.HEART - 0.15);
            if (dtPollen > 0 && dtPollen < 1.85) {
                for (let i = 0; i < pollenParticles.length; i++) {
                    const pp = pollenParticles[i];
                    const dragT = (1 - Math.exp(-dtPollen * 2.2)) / 2.2;
                    const swirl = dtPollen * pp.spin;
                    const rx = pp.vx * dragT + Math.cos(swirl + pp.ph) * 8 * dtPollen;
                    const rz = pp.vz * dragT + Math.sin(swirl + pp.ph) * 8 * dtPollen;
                    const ry = hs.H + 14 + pp.vy * dragT + 14 * dtPollen;
                    if (!project(hs.sway + rx, ry, rz, Q)) continue;
                    const fadeP = (1 - dtPollen / 1.85) * (0.65 + 0.35 * Math.sin(sc.clock * 5 + pp.ph));
                    const pr = Math.max(2.0, pp.sz * 4.5 * Q.k);
                    drawAdditive(g, S.glowFirefly, Q.x, Q.y, pr, pr, fadeP * 0.85);
                }
            }

            g.restore();
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = 1;
        }

        // =================================================================================
        // 5. BƯỚM 3D CÁNH LỤA TRONG SUỐT CÓ GÂN CÁNH & ĐỐM NGỌC, CÁNH HOA BAY 3D & BOKEH
        // =================================================================================
        function drawButterfly3D(g, x, y, k, size, flap, yawAngle) {
            const s = size * k;
            if (s < 2) return;
            const wingFold = 0.20 + 0.80 * Math.abs(Math.cos(flap));
            g.save();
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = 1;
            g.translate(x, y);
            g.rotate(Math.sin(yawAngle) * 0.25);
            g.lineJoin = 'round';
            g.lineCap = 'round';

            drawAdditive(g, S.softAccent, 0, 0, s * 2.6, s * 2.6, 0.24);

            for (let side = -1; side <= 1; side += 2) {
                g.save();
                g.scale(side * wingFold, 1);
                g.globalAlpha = 0.94;

                // Cánh trên (Forewing) chuyển sắc ngũ sắc lụa mỏng
                const fg = g.createLinearGradient(0, 0, s * 1.15, -s * 0.85);
                fg.addColorStop(0.00, th.petal.ao);
                fg.addColorStop(0.28, th.petal.base);
                fg.addColorStop(0.62, th.petal.mid);
                fg.addColorStop(0.88, th.accent);
                fg.addColorStop(1.00, '#ffffff');
                g.fillStyle = fg;
                g.beginPath();
                g.moveTo(0, -s * 0.08);
                g.bezierCurveTo(s * 0.42, -s * 1.08, s * 1.28, -s * 0.88, s * 1.06, -s * 0.10);
                g.bezierCurveTo(s * 0.86, s * 0.18, s * 0.35, s * 0.14, 0, 0);
                g.closePath();
                g.fill();

                g.strokeStyle = 'rgba(255, 250, 230, 0.38)';
                g.lineWidth = Math.max(0.4, 0.55 * k);
                g.stroke();

                // Cánh dưới đuôi én (Hindwing)
                const hg = g.createLinearGradient(0, 0, s * 0.75, s * 1.05);
                hg.addColorStop(0.00, th.petal.ao);
                hg.addColorStop(0.45, th.petal.base);
                hg.addColorStop(0.82, th.petal.mid);
                hg.addColorStop(1.00, th.accent);
                g.fillStyle = hg;
                g.beginPath();
                g.moveTo(0, 0);
                g.bezierCurveTo(s * 0.45, s * 0.10, s * 0.92, s * 0.55, s * 0.58, s * 0.94);
                g.quadraticCurveTo(s * 0.45, s * 1.22, s * 0.38, s * 1.18);
                g.quadraticCurveTo(s * 0.35, s * 0.95, s * 0.28, s * 0.88);
                g.bezierCurveTo(s * 0.12, s * 0.74, s * 0.04, s * 0.35, 0, s * 0.12);
                g.closePath();
                g.fill();
                g.stroke();

                // Gân cánh lụa & đốm ngọc phát sáng ở mép cánh (tách từng arc để không có đường nối!)
                if (s > 6) {
                    g.strokeStyle = 'rgba(255, 248, 225, 0.28)';
                    g.lineWidth = Math.max(0.35, 0.45 * k);
                    g.beginPath();
                    g.moveTo(0, -s * 0.04);
                    g.quadraticCurveTo(s * 0.45, -s * 0.48, s * 0.92, -s * 0.42);
                    g.moveTo(s * 0.35, -s * 0.34);
                    g.lineTo(s * 0.82, -s * 0.18);
                    g.moveTo(0, s * 0.04);
                    g.quadraticCurveTo(s * 0.35, s * 0.38, s * 0.52, s * 0.82);
                    g.stroke();

                    g.fillStyle = 'rgba(255, 253, 240, 0.82)';
                    const r1 = Math.max(0.6, s * 0.055);
                    const r2 = Math.max(0.5, s * 0.042);
                    const r3 = Math.max(0.5, s * 0.045);
                    g.beginPath();
                    g.arc(s * 0.88, -s * 0.46, r1, 0, TAU);
                    g.moveTo(s * 0.86 + r2, -s * 0.24);
                    g.arc(s * 0.86, -s * 0.24, r2, 0, TAU);
                    g.moveTo(s * 0.56 + r3, s * 0.68);
                    g.arc(s * 0.56, s * 0.68, r3, 0, TAU);
                    g.fill();
                }
                g.restore();
            }

            // Thân bướm & 2 râu mảnh
            g.fillStyle = '#fff6d6';
            g.beginPath();
            g.ellipse(0, 0, Math.max(0.9, s * 0.065), Math.max(2.2, s * 0.38), 0, 0, TAU);
            g.fill();
            if (s > 6) {
                g.strokeStyle = 'rgba(255, 248, 220, 0.65)';
                g.lineWidth = Math.max(0.35, 0.45 * k);
                g.beginPath();
                g.moveTo(-s * 0.02, -s * 0.32);
                g.quadraticCurveTo(-s * 0.16, -s * 0.58, -s * 0.28, -s * 0.54);
                g.moveTo(s * 0.02, -s * 0.32);
                g.quadraticCurveTo(s * 0.16, -s * 0.58, s * 0.28, -s * 0.54);
                g.stroke();
            }
            g.restore();
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = 1;
        }

        function drawDriftingPetal3D(g, x, y, k, sz, rx, ry, rz, alpha) {
            const r = 11 * sz * k;
            if (r < 1.2) return;
            g.save();
            g.globalCompositeOperation = 'source-over';
            g.translate(x, y);
            g.rotate(rz);
            const squeeze = Math.max(0.28, Math.abs(Math.cos(rx)));
            g.scale(1, squeeze);
            g.globalAlpha = alpha;
            const pg = g.createLinearGradient(0, r, 0, -r);
            pg.addColorStop(0.0, th.petal.base);
            pg.addColorStop(0.6, th.petal.mid);
            pg.addColorStop(1.0, th.petal.rim);
            g.fillStyle = pg;
            g.beginPath();
            g.moveTo(0, r);
            g.bezierCurveTo(-r * 0.85, r * 0.2, -r * 0.75, -r * 0.85, 0, -r);
            g.bezierCurveTo(r * 0.75, -r * 0.85, r * 0.85, r * 0.2, 0, r);
            g.closePath();
            g.fill();
            g.restore();
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = 1;
        }

        function drawLivingEntities(gW, gF, pass, heroZ, envZ, hs, wake) {
            const tau = sc.tau, clock = sc.clock;
            if (wake <= 0.01) return;

            const nFlies = sc.quality ? flies.length : (flies.length >> 1);
            for (let i = 0; i < nFlies; i++) {
                const f = flies[i];
                const x = f.x + Math.sin(clock * 0.9 + f.p1) * 18;
                const y = f.y + Math.sin(clock * 1.4 + f.p2) * 12;
                const z = f.z + Math.cos(clock * 0.8 + f.p3) * 18;
                if (!project(x, y, z, Q)) continue;
                const isBehind = Q.z >= heroZ;
                if ((pass === 0) !== isBehind) continue;
                const tw = 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(clock * 3.1 + f.p1));
                const a = wake * tw;
                const isBokeh = Q.z < 175;
                const sz = Math.max(8, (isBokeh ? 42 : 24) * f.s * Q.k);
                const target = (pass === 1 && Q.z < envZ) ? gF : gW;
                drawAdditive(target, S.glowFirefly, Q.x, Q.y, sz, sz, isBokeh ? a * 0.45 : a);
            }

            if (tau > T.IMPACT + 0.25) {
                const dWake = smooth((tau - (T.IMPACT + 0.25)) / 0.8);
                const nDrift = sc.quality ? drift.length : (drift.length >> 1);
                for (let i = 0; i < nDrift; i++) {
                    const d = drift[i];
                    const cyc = (clock * 0.09 + d.ph) % 1;
                    const y = 8 + cyc * 240;
                    const fade = Math.sin(cyc * Math.PI) * dWake;
                    const sw = Math.sin(clock * d.fs + d.ph * 9) * 24;
                    const x = d.x0 + sw;
                    const z = d.z0 + Math.cos(clock * d.fs * 0.8 + d.ph * 6) * 20;
                    if (!project(x, y, z, Q)) continue;
                    const isBehind = Q.z >= heroZ;
                    if ((pass === 0) !== isBehind) continue;
                    const target = (pass === 1 && Q.z < envZ) ? gF : gW;
                    drawDriftingPetal3D(
                        target,
                        Q.x, Q.y, Q.k, d.sz,
                        d.rx + clock * d.vrx,
                        d.ry + clock * d.vry,
                        d.rz + clock * 0.9,
                        fade * 0.88
                    );
                }
            }

            for (let i = 0; i < flyers.length; i++) {
                const bf = flyers[i];
                const age = tau - bf.born;
                if (age <= 0) continue;
                const u = clamp01(age / 1.35);
                const a = bf.ph + age * 2.1 * bf.dir;
                let x, y, z;
                if (bf.fromHeart) {
                    const r = easeOutCubic(u) * bf.rad;
                    x = Math.cos(a) * r;
                    z = Math.sin(a) * r;
                    y = hs.H + 14 + easeOutCubic(u) * bf.h + Math.sin(age * 4.2 + bf.ph) * 8;
                } else {
                    const r = lerp(bf.rad * 1.4, bf.rad, easeOutCubic(u));
                    x = lerp(bf.ox, Math.cos(a) * r, easeOutCubic(u));
                    z = lerp(bf.oz, Math.sin(a) * r, easeOutCubic(u));
                    y = lerp(14, bf.h, easeOutCubic(u)) + Math.sin(age * 4 + bf.ph) * 8;
                }
                if (!project(x, y, z, Q)) continue;
                const isBehind = Q.z >= heroZ;
                if ((pass === 0) !== isBehind) continue;
                const target = (pass === 1 && Q.z < envZ) ? gF : gW;
                drawButterfly3D(target, Q.x, Q.y, Q.k, bf.sz, sc.clock * 15 + bf.fp, a);
            }
            gW.globalCompositeOperation = 'source-over';
            gW.globalAlpha = 1;
            gF.globalCompositeOperation = 'source-over';
            gF.globalAlpha = 1;
        }

        // =================================================================================
        // 6. TÍNH TOÁN VỊ TRÍ & MA TRẬN 3D CỦA PHONG BÌ DOM TRÊN ĐÀI HOA (CÓ ĐỘ NHÚN TẢI TRỌNG VẬT LÝ)
        // =================================================================================
        function computeEnvelope(tau, hs, vw, vh, envBaseW, idleY, idleRotZ) {
            if (tau < T.ENV_IN) return { visible: false, depth: 1e9 };
            const tEnv = tau - T.ENV_IN;
            const mat = springOut(clamp01(tEnv / 0.72), 8.5, 3.6, 1);
            const lift = easeInOutCubic(clamp01((tau - T.LIFT) / (T.LAND - T.LIFT)));
            // Phong bì hạ nhẹ từ trên xuống đài hoa khi kết tinh (dropSettle) tạo cảm giác có trọng lượng thật đè lên cánh hoa
            const dropSettle = 18 * Math.exp(-tEnv * 5.5) * Math.cos(tEnv * 10.5);
            const envY = hs.H + Math.max(10, finalCrown, hs.crownTop) + 12 + dropSettle + th.hero.envLift * smooth((tau - 3.95) / 0.55);
            const envX = hs.sway * 1.15 * (1 - lift);
            project(envX, envY, 0, P0);
            project(envX - cam.rx * ENV_W * 0.5, envY, -cam.rz * ENV_W * 0.5, P1);
            project(envX + cam.rx * ENV_W * 0.5, envY,  cam.rz * ENV_W * 0.5, P2);
            const cradleW = Math.hypot(P2.x - P1.x, P2.y - P1.y);
            const cradleScale = clamp01(cradleW / Math.max(200, envBaseW)) * (0.48 + 0.52 * mat);
            const cradleTx = P0.x - vw * 0.5;
            const cradleTy = P0.y - vh * 0.5;
            const elev = Math.atan2(cam.y - envY, Math.hypot(cam.x, cam.z)) / DEG;
            const cradleRx = Math.max(8, Math.min(54, elev * 0.82));
            const cradleRy = Math.sin(sc.clock * 1.4) * 3.5;
            const cradleRz = -cam.yaw * 10;

            return {
                visible: true,
                opacity: clamp01((tau - T.ENV_IN) / 0.35),
                tx: lerp(cradleTx, 0, lift),
                ty: lerp(cradleTy, idleY || 0, lift),
                scale: lerp(cradleScale, 1, lift),
                rotX: lerp(cradleRx, 6, lift),
                rotY: lerp(cradleRy, 0, lift),
                rotZ: lerp(cradleRz, idleRotZ || 0, lift),
                depth: lerp(P0.z, 120, lift),
                lift,
                worldY: envY
            };
        }

        function drawEnvContactShadow(g, env, hs) {
            if (!env.visible) return;
            const a = env.opacity * (1 - env.lift * 0.88) * 0.85;
            if (a <= 0.01) return;
            if (!project(hs.sway, hs.H + 10, 0, Q)) return;
            const w = ENV_W * 1.5 * Q.k, h = w * 0.52;
            g.save();
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = a;
            g.drawImage(S.shadow, Q.x - w * 0.5, Q.y - h * 0.5, w, h);
            g.restore();
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = 1;
        }

        // =================================================================================
        // 7. VÒNG LẶP KẾT XUẤT CHÍNH (RENDER FRAME)
        // =================================================================================
        function render(gW, gF, info) {
            const vw = info.vw, vh = info.vh, dpr = info.dpr || 1;
            const envBaseW = info.envW || 340;
            if (vw !== sc.vw || vh !== sc.vh || !sc.M0) rebuildViewCaches(vw, vh);

            const tau = sc.tau, clock = sc.clock;
            const wake = smooth((tau - T.IMPACT) / 1.15);

            updateCamera(vw, vh);
            const hy = cam.hy;

            gW.setTransform(dpr, 0, 0, dpr, 0, 0);
            gW.globalCompositeOperation = 'source-over';
            gW.globalAlpha = 1;
            gW.clearRect(0, 0, vw, vh);

            gF.setTransform(dpr, 0, 0, dpr, 0, 0);
            gF.globalCompositeOperation = 'source-over';
            gF.globalAlpha = 1;
            gF.clearRect(0, 0, vw, vh);

            // 1. Bầu trời, mây khối, núi mờ sương & mặt hồ phản quang Fresnel
            drawAtmosphereAndLake(gW, vw, vh, hy, wake);

            // 2. Tính trạng thái Đại Đoá Hoa Chủ Đạo & chuẩn bị vườn hoa 3D trên mặt hồ
            const hs = computeHeroState(tau);
            prepareGardenFlowers(tau);
            const heroZ = project(0, hs.H * 0.5, 0, Q) ? Q.z : 500;
            const env = computeEnvelope(tau, hs, vw, vh, envBaseW, info.idleY, info.idleRotZ);
            const envZ = env.visible ? env.depth : 1e9;

            // 3. Bóng phản chiếu của Đại Đoá Hoa Chủ Đạo dưới mặt nước
            if (hs.visible) {
                renderHeroFlower3D(gW, hs, true);
            }

            // 4. Sóng nước 3D lan toả trên mặt hồ + Vòng sóng phụ từ các giọt nước văng rơi xuống hồ
            drawWaterRipples3D(gW, tau);

            // 5. Các đoá hoa trong vườn ở phía xa hơn Đại Đoá Hoa Chủ Đạo
            let gi = 0;
            while (gi < ground.length && ground[gi].sz >= heroZ) {
                if (ground[gi].vis) drawGardenFlower3D(gW, ground[gi]);
                gi++;
            }

            // 6. Sinh vật bay phía sau Đại Đoá Hoa Chủ Đạo
            drawLivingEntities(gW, gF, 0, heroZ, envZ, hs, wake);

            // 7. Hố lõm mặt nước 3D (Impact Crater), Màng nước vương miện (Crown Splash), Cột nước Worthington & 36 Giọt nước Parabol
            drawImpactCraterAndSplash3D(gW, tau);

            // 8. Quầng sáng elip mềm mại toả lên phía sau trước khi vẽ Đại Đoá Hoa (không vẽ đè lên cánh hoa để giữ nguyên sắc nhung!)
            if (hs.visible && project(hs.sway, hs.H + 8, 0, Q)) {
                const plumeA = 0.28 * smooth((tau - 2.65) / 0.7) * (1 - 0.45 * smooth((tau - 4.6) / 0.8));
                if (plumeA > 0.01) {
                    const pw = 290 * Q.k, ph = 320 * Q.k;
                    drawAdditive(gW, S.plume, Q.x, Q.y - ph * 0.28, pw, ph, plumeA);
                }
            }

            // 9. Đại Đoá Hoa Chủ Đạo 3D (Thân Bezier liền mạch, Lá, Đài hoa, Cánh cong Bezier 3D đặc 100%, Sương mai, Nhụy vàng 3D)
            if (hs.visible) {
                renderHeroFlower3D(gW, hs, false);
                drawBloomDropsAndPollen3D(gW, tau, hs);
            }

            // 10. Bóng tiếp xúc vật lý của Phong bì trên đài hoa
            if (env.visible) {
                drawEnvContactShadow(gW, env, hs);
            }

            // 11. Các đoá hoa trong vườn ở phía gần ống kính hơn Đại Đoá Hoa Chủ Đạo
            for (; gi < ground.length; gi++) {
                if (ground[gi].vis) drawGardenFlower3D(gW, ground[gi]);
            }

            // 12. Tia sao kết tinh lúc bức thư vừa chạm đài hoa (không phủ glow trắng lên cánh hoa!)
            if (hs.visible && env.visible) {
                const bt = (tau - T.ENV_IN) / 0.72;
                if (bt > 0 && bt < 1) {
                    for (let i = 0; i < burst.length; i++) {
                        const b = burst[i];
                        const d = 68 + 125 * b.d * easeOutCubic(bt);
                        if (!project(b.dx * d, env.worldY + b.dy * d * 0.6, b.dz * d, Q2)) continue;
                        const w = 40 * Q2.k * (1 - bt * 0.5);
                        drawAdditive(gW, S.flare, Q2.x, Q2.y, w, w, (1 - bt) * 0.85);
                    }
                }
            }

            // 13. Sinh vật bay phía trước hoa
            drawLivingEntities(gW, gF, 1, heroZ, envZ, hs, wake);

            // 14. Cột sáng thiên đỉnh tại khoảnh khắc sao băng chạm mặt hồ (tau = 1.60s)
            const pillarA = smooth((tau - 1.585) / 0.03) * (1 - smooth((tau - 1.62) / 0.42));
            if (pillarA > 0.01 && project(0, 0, 0, Q)) {
                gW.save();
                gW.globalCompositeOperation = 'lighter';
                const w = 84 * Q.k, h = 720 * Q.k;
                gW.globalAlpha = pillarA;
                gW.drawImage(S.pillar, Q.x - w * 0.5, Q.y - h, w, h);
                gW.globalAlpha = pillarA * 0.38;
                gW.translate(Q.x, Q.y);
                gW.scale(1, -0.6);
                gW.drawImage(S.pillar, -w * 0.5, -h, w, h);
                gW.restore();
                gW.globalCompositeOperation = 'source-over';
                gW.globalAlpha = 1;
            }

            // 15. Viền tối điện ảnh (Vignette) & màn tối mở đầu
            gW.globalCompositeOperation = 'source-over';
            gW.globalAlpha = 1;
            if (sc.vignette) gW.drawImage(sc.vignette, 0, 0, vw, vh);
            const veil = 1 - smooth(tau / 0.58);
            if (veil > 0.002) {
                gW.globalAlpha = veil;
                gW.fillStyle = th.veil;
                gW.fillRect(0, 0, vw, vh);
                gW.globalAlpha = 1;
            }

            // 16. Đốm sáng ước nguyện & đuôi sao băng kéo dài theo gia tốc trọng trường (tau < 1.62s)
            if (tau < T.IMPACT + 0.02) {
                const p = clamp01((tau - T.FALL) / (T.IMPACT - T.FALL));
                const s = Math.pow(p, 2.35);
                for (let j = 0; j < sparks.length; j++) {
                    const sj = (j + 0.5) / sparks.length;
                    const tj = T.FALL + Math.pow(sj, 1 / 2.35) * (T.IMPACT - T.FALL);
                    const age = tau - tj;
                    if (age < 0 || age > 0.55) continue;
                    bez(sj, Q2);
                    const sparkY = Q2.y + sparks[j].jy * age - 140 * age * age;
                    if (!project(Q2.x + sparks[j].jx * age * 2.5, sparkY, Q2.z + sparks[j].jz * age * 2.5, Q)) continue;
                    drawAdditive(gW, S.glowMote, Q.x, Q.y, 24 * sparks[j].sz * Q.k, 24 * sparks[j].sz * Q.k, (1 - age / 0.55) * 0.9);
                }
                if (p > 0) {
                    for (let i = 22; i >= 1; i--) {
                        const si = s - i * 0.024 * (0.40 + s * 1.15);
                        if (si < 0) continue;
                        bez(si, Q2);
                        if (!project(Q2.x, Q2.y, Q2.z, Q)) continue;
                        const f = 1 - i / 23;
                        const w = Math.max(26, 128 * Q.k) * (0.28 + 0.72 * f);
                        drawAdditive(gW, S.glowMote, Q.x, Q.y, w, w, 0.64 * f * f);
                    }
                }
                motePos(tau, Q2);
                if (project(Q2.x, Q2.y, Q2.z, Q)) {
                    const tw = 0.88 + 0.12 * Math.sin(clock * 6);
                    const G = Math.max(78, 152 * Q.k) * tw;
                    drawAdditive(gW, S.glowMote, Q.x, Q.y, G, G, 1);
                    gW.save();
                    gW.globalCompositeOperation = 'lighter';
                    gW.translate(Q.x, Q.y);
                    gW.rotate(clock * 0.4);
                    gW.globalAlpha = 0.88;
                    gW.drawImage(S.flare, -G * 0.95, -G * 0.95, G * 1.9, G * 1.9);
                    gW.restore();
                    if (project(Q2.x, -Q2.y, Q2.z, Q)) {
                        drawAdditive(gW, S.glowMote, Q.x, Q.y, G * 0.85, G * (1.35 + p * 0.8), 0.38 * (1 - veil));
                    }
                }
                gW.globalCompositeOperation = 'source-over';
                gW.globalAlpha = 1;
            }

            // 17. Lớp trước (canvasFront): Chớp sáng va chạm & Letterbox điện ảnh
            const flash = sc.impactClock >= 0 && !sc.skipped ? Math.exp(-(clock - sc.impactClock) * 7.5) : 0;
            if (flash > 0.01 || sc.skipFlash > 0.01) {
                gF.save();
                gF.globalCompositeOperation = 'lighter';
                if (flash > 0.01 && project(0, 0, 0, Q)) {
                    const w = Math.max(vw, vh) * 1.5;
                    drawAdditive(gF, S.glowMote, Q.x, Q.y, w, w, flash * 0.68);
                    gF.globalAlpha = flash * 0.14;
                    gF.fillStyle = `rgb(${th.mote.join(',')})`;
                    gF.fillRect(0, 0, vw, vh);
                }
                if (sc.skipFlash > 0.01) {
                    gF.globalAlpha = sc.skipFlash * 0.68;
                    gF.fillStyle = `rgb(${th.mote.join(',')})`;
                    gF.fillRect(0, 0, vw, vh);
                }
                gF.restore();
                gF.globalCompositeOperation = 'source-over';
                gF.globalAlpha = 1;
            }

            const lb = vh * 0.068 * clamp01(smooth(tau / 0.35) - smooth((tau - 4.7) / 0.7));
            if (lb > 0.5) {
                gF.globalCompositeOperation = 'source-over';
                gF.globalAlpha = 1;
                gF.fillStyle = '#040206';
                gF.fillRect(0, 0, vw, lb);
                gF.fillRect(0, vh - lb, vw, lb + 1);
            }

            return env;
        }

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
    // MÀN CHUYỂN CẢNH TỨC THÌ KHI BẤM "NHẬN LỜI CHÚC" (GPU COMPOSITOR PRELUDE)
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
        prepare(motionId) {
            try { buildThemeSprites(THEMES[motionId] ? motionId : 'bloom'); } catch (e) { console.warn('WishBloom prepare', e); }
        },
        create: createScene,
        beginPrelude,
        endPrelude,
        hasPrelude: () => !!preludeEl
    };
})();
