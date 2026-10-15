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
    // HỆ THỐNG ĐO LƯỜNG & NHẬN DIỆN HIỆU NĂNG THIẾT BỊ 3 TẦNG (3-LAYER DEVICE PROFILER)
    //   Tầng 1: Nhận diện GPU thực tế qua WebGL Renderer + CPU/RAM + Môi trường WebView
    //   Tầng 2: Đo nhịp khung hình nền (phát hiện Low Power Mode 30Hz) + Micro-Benchmark Canvas 2D
    //   Tầng 3: Giám sát thời gian vẽ thực tế (renderMs & frameAvg) + Hạ cấp đa bậc (Tier 2 -> 1 -> 0)
    // ---------------------------------------------------------------------------------
    const rafProbe = {
        samples: [],
        lastTs: 0,
        done: false,
        running: false,
        medianMs: 16.7,
        p85Ms: 16.7,
        is30HzCapped: false,
        isJittery: false
    };

    function startPassiveFrameProbe() {
        if (rafProbe.running || rafProbe.done || typeof requestAnimationFrame !== 'function') return;
        rafProbe.running = true;
        function tick(now) {
            if (document.hidden) {
                rafProbe.lastTs = 0;
                requestAnimationFrame(tick);
                return;
            }
            if (rafProbe.lastTs > 0) {
                const dtMs = now - rafProbe.lastTs;
                if (dtMs > 4 && dtMs < 120) {
                    rafProbe.samples.push(dtMs);
                }
            }
            rafProbe.lastTs = now;
            if (rafProbe.samples.length < 22) {
                requestAnimationFrame(tick);
            } else {
                const sorted = rafProbe.samples.slice().sort((a, b) => a - b);
                const mid = sorted[sorted.length >> 1] || 16.7;
                const p85 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.85))] || mid;
                rafProbe.medianMs = mid;
                rafProbe.p85Ms = p85;
                // Phát hiện Chế độ Tiết kiệm Pin (Low Power Mode trên iOS/Android khóa RAF ở ~30fps = 33.3ms)
                rafProbe.is30HzCapped = mid > 26.5 && mid < 42.0;
                rafProbe.isJittery = !rafProbe.is30HzCapped && p85 > 22.5;
                rafProbe.done = true;
                rafProbe.running = false;
                if (cachedPerfProfile) {
                    recomputePerfTier(cachedPerfProfile);
                }
            }
        }
        requestAnimationFrame(tick);
    }

    function detectGpuCapability() {
        let renderer = '';
        let gpuTier = 2; // 0: Low, 1: Mid, 2: High
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
        let isUltraFlagship = false;
        // GPU phần mềm hoặc dòng GPU di động/tích hợp yếu
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
            /immortalis|mali-g(9\d\d|720|715)|adreno[^0-9]*(730|735|740|750|8\d\d)|xclipse\s*9\d\d|apple m[1-9]|apple a(15|16|17|18|19)|rtx|radeon rx/i.test(r)
        ) {
            gpuTier = 2;
            isUltraFlagship = true;
        } else if (/apple gpu/i.test(r)) {
            // Safari iOS 14+ ẩn số hiệu chip thành "Apple GPU" -> dựa thêm vào kích thước màn hình & DPR
            const maxDim = Math.max(window.screen ? window.screen.width : 390, window.screen ? window.screen.height : 844);
            const rawDpr = window.devicePixelRatio || 2;
            if (maxDim <= 736 || rawDpr < 2.5) {
                gpuTier = 1; // iPhone SE / XR / 11 / 8 Plus
            } else if (maxDim >= 844 && rawDpr >= 3) {
                isUltraFlagship = true;
            }
        } else {
            // Chrome Android 110+ trên các flagship mới (OPPO Find X8/X9, Vivo X200, Xiaomi 15, Galaxy S24/S25)
            // thường che tên GPU cụ thể thành chuỗi chung ("ANGLE (ARM, Mali, ...)" hoặc "Vulkan").
            const cores = navigator.hardwareConcurrency || 4;
            const mem = navigator.deviceMemory || 0;
            const rawDpr = window.devicePixelRatio || 1;
            if (cores >= 8 && (mem === 0 || mem >= 6) && rawDpr >= 2.2) {
                gpuTier = 2;
                isUltraFlagship = true;
            }
        }
        return { renderer, gpuTier, isUltraFlagship };
    }

    function runCanvasMicroBenchmark() {
        try {
            const w = 200, h = 200;
            const c = makeCanvas(w, h);
            const g = c.getContext('2d');
            if (!g) return 2.5;

            const glow = makeCanvas(32, 32);
            const gg = glow.getContext('2d');
            const rg = gg.createRadialGradient(16, 16, 0, 16, 16, 16);
            rg.addColorStop(0, 'rgba(255, 220, 180, 1)');
            rg.addColorStop(1, 'rgba(255, 220, 180, 0)');
            gg.fillStyle = rg;
            gg.fillRect(0, 0, 32, 32);

            const drawPass = (iters) => {
                g.globalCompositeOperation = 'source-over';
                const bg = g.createLinearGradient(0, 0, 0, h);
                bg.addColorStop(0, '#070310');
                bg.addColorStop(0.5, '#1f0926');
                bg.addColorStop(1, '#4e193d');
                g.fillStyle = bg;
                g.fillRect(0, 0, w, h);

                for (let i = 0; i < iters; i++) {
                    const x0 = 20 + (i % 6) * 26;
                    const y0 = 25 + ((i / 6) | 0) * 32;
                    const x3 = x0 + 28, y3 = y0 - 24;
                    const pg = g.createLinearGradient(x0, y0, x3, y3);
                    pg.addColorStop(0.0, '#2d0212');
                    pg.addColorStop(0.3, '#940a3b');
                    pg.addColorStop(0.7, '#de3b70');
                    pg.addColorStop(1.0, '#ffd8e5');
                    g.fillStyle = pg;
                    g.beginPath();
                    g.moveTo(x0, y0);
                    g.quadraticCurveTo(x0 - 14, y0 - 12, x3, y3);
                    g.quadraticCurveTo(x0 + 14, y0 - 12, x0, y0);
                    g.closePath();
                    g.fill();
                    g.strokeStyle = 'rgba(255, 240, 245, 0.35)';
                    g.lineWidth = 1.1;
                    g.stroke();
                }

                g.globalCompositeOperation = 'lighter';
                for (let j = 0; j < 10; j++) {
                    g.drawImage(glow, (j * 17) % 160, (j * 23) % 160, 36, 36);
                }
            };

            // Làm nóng JIT 2 vòng trước khi bấm giờ
            drawPass(4);
            const t0 = performance.now();
            drawPass(22);
            return Math.max(0.1, performance.now() - t0);
        } catch (_) {
            return 2.5;
        }
    }

    let cachedPerfProfile = null;

    function recomputePerfTier(prof) {
        const gov = window.DevicePerfGovernor;
        const govProf = (gov && typeof gov.getProfile === 'function') ? gov.getProfile() : null;
        if (govProf) {
            const mappedTier = typeof govProf.tier === 'number'
                ? Math.min(2, Math.max(0, govProf.tier >= 2 ? 2 : govProf.tier))
                : 2;
            prof.tier = mappedTier;
            prof.isUltraFlagship = !!govProf.isUltraFlagship || (govProf.qualityTier >= 3);
            prof.isLowEnd = mappedTier === 0;
            prof.is30HzCapped = !!govProf.is30HzCapped || rafProbe.is30HzCapped;
            prof.rafMedianMs = govProf.rafMedianMs || rafProbe.medianMs;
            prof.worldDpr = govProf.worldDpr || (mappedTier === 2 ? Math.min(window.devicePixelRatio || 1, prof.isMobile ? 1.35 : 1.45) : (mappedTier === 1 ? 1.0 : 0.85));
            prof.directorDpr = govProf.directorDpr || (mappedTier === 2 ? Math.min(window.devicePixelRatio || 1, 1.55) : (mappedTier === 1 ? 1.22 : 1.0));
            return prof;
        }

        const rawDpr = window.devicePixelRatio || 1;
        let tier = 2; // 2: High, 1: Medium/Balanced, 0: Low/Performance

        if (
            prof.gpuTier === 0 ||
            prof.cores <= 4 ||
            (prof.memory > 0 && prof.memory <= 3) ||
            prof.benchMs > 3.6 ||
            (rafProbe.is30HzCapped && prof.benchMs > 2.2) ||
            (prof.isInApp && (prof.cores <= 6 || (prof.memory > 0 && prof.memory <= 4)) && prof.benchMs > 2.3)
        ) {
            tier = 0;
        } else if (
            !prof.isUltraFlagship && (
                prof.gpuTier === 1 ||
                rafProbe.is30HzCapped ||
                prof.benchMs > 1.85 ||
                (prof.isMobile && prof.memory > 0 && prof.memory <= 4)
            )
        ) {
            tier = 1;
        }

        prof.tier = tier;
        prof.isUltraFlagship = !!(prof.isUltraFlagship && tier === 2 && !rafProbe.is30HzCapped);
        prof.isLowEnd = tier === 0;
        prof.is30HzCapped = rafProbe.is30HzCapped;
        prof.rafMedianMs = rafProbe.medianMs;
        prof.worldDpr = tier === 2
            ? Math.min(rawDpr, prof.isMobile ? (prof.isUltraFlagship ? 1.35 : 1.25) : 1.45)
            : (tier === 1 ? Math.min(rawDpr, 1.0) : Math.min(rawDpr, 0.82));
        prof.directorDpr = tier === 2
            ? Math.min(rawDpr, prof.isUltraFlagship ? 1.6 : 1.5)
            : (tier === 1 ? Math.min(rawDpr, 1.22) : Math.min(rawDpr, 1.0));
        return prof;
    }

    function getDevicePerfProfile() {
        if (cachedPerfProfile) {
            if (window.DevicePerfGovernor && typeof window.DevicePerfGovernor.getProfile === 'function') {
                return recomputePerfTier(cachedPerfProfile);
            }
            return cachedPerfProfile;
        }
        const ua = navigator.userAgent || navigator.vendor || window.opera || '';
        const isInApp = /Telegram|FBAN|FBAV|Instagram|Messenger|Line|Zalo|TikTok/i.test(ua);
        const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || isIOS;
        const cores = navigator.hardwareConcurrency || 4;
        const memory = navigator.deviceMemory || 0;
        const gpu = detectGpuCapability();
        const benchMs = runCanvasMicroBenchmark();

        cachedPerfProfile = {
            cores,
            memory,
            isInApp,
            isIOS,
            isMobile,
            gpuRenderer: gpu.renderer,
            gpuTier: gpu.gpuTier,
            isUltraFlagship: !!gpu.isUltraFlagship || (cores >= 8 && memory >= 8 && benchMs <= 1.25),
            benchMs,
            tier: 1,
            isLowEnd: false,
            is30HzCapped: rafProbe.is30HzCapped,
            rafMedianMs: rafProbe.medianMs,
            worldDpr: 1.0,
            directorDpr: 1.25
        };
        return recomputePerfTier(cachedPerfProfile);
    }

    // Khởi chạy đo nhịp khung hình thụ động ngay khi nạp script
    startPassiveFrameProbe();

    // ---------------------------------------------------------------------------------
    // MỐC THỜI GIAN KỂ CHUYỆN (tau)
    // ---------------------------------------------------------------------------------
    const T = {
        FALL: 0.70,     // đốm sáng bắt đầu rơi
        IMPACT: 1.60,   // chạm mặt hồ gương
        BUD: 1.95,      // nụ hoa 3D trồi lên từ mặt nước
        OPEN: 2.50,     // cánh hoa bắt đầu bung nở từng lớp
        HEART: 2.88,    // đại đóa hoa nở trọn vẹn & vương miện 42 nhụy vàng 3D tỏa sáng rực rỡ
        ENV_IN: 4.62,   // 4 cánh hoa lớp trong cùng gấp Origami 3D thành 4 vạt phong bì
        LIFT: 6.50,     // đài hoa nâng phong bì tiến về phía người xem
        LAND: 7.45,     // phong bì dừng đúng tâm màn hình
        END: 7.60
    };
    const T_CARD_WEAVE    = 3.12; // Khi người xem đã thấy rõ nhụy vàng, các hạt nhị hoa rung động kết tinh nên Lõi Thư trên nhị hoa
    const T_ORIGAMI_START = 4.15; // Sau khi Lõi Thư đã được tạo xong trên nhị hoa, 4 cánh hoa trong mới tách ra tiến tới bao quanh
    const T_ORIGAMI_LOCK  = 6.14; // 4 vạt thư gấp khớp 180° hoàn chỉnh và bàn giao 1:1 sang DOM

    function speedAt(t) {
        if (t < 0.70) return 1.0;
        if (t < 1.50) return lerp(1.0, 1.75, smooth((t - 0.70) / 0.80));
        if (t < 1.60) return 1.75;
        if (t < 1.80) return 0.27;
        if (t < 2.30) return lerp(0.27, 1.08, smooth((t - 1.80) / 0.50));
        if (t < 2.80) return lerp(1.08, 0.82, smooth((t - 2.30) / 0.50));
        if (t < 3.40) return lerp(0.82, 0.64, smooth((t - 2.80) / 0.60));
        if (t < 6.10) return 0.64;
        if (t < 6.60) return lerp(0.64, 0.86, smooth((t - 6.10) / 0.50));
        return lerp(0.86, 0.78, smooth((t - 6.60) / 1.00));
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
        [3.12, -0.26, 415, 178, 86],
        [4.10, -0.12, 362, 242, 92],
        [5.30, -0.04, 304, 316, 96],
        [6.40, 0.00, 218, 354, 96],
        [7.00, 0.00, 264, 298, 100],
        [7.60, 0.00, 312, 246, 104]
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
        // 🌺 Đại Hoa Trà — Hồng Nhung Phấn Đào (Velvet Blush Pink)
        bloom: {
            envTheme: 'blush',
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
                ao: '#38071b',       // bóng sâu trong hốc hoa đồng điệu với blush envelope
                base: '#91224c',     // gốc cánh hồng nhung đậm
                mid: '#d84b7e',      // bụng cánh hồng phấn đào rực rỡ
                tip: '#f598b9',      // đầu cánh phấn hồng dịu
                rim: '#ffdce8',      // viền bắt sáng ngọc trai
                backAo: '#290413',   // mặt lưng khi khép nụ
                backBase: '#6e1638',
                backTip: '#b83265',
                vein: '255,215,230',
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
        // 🦋 Hồ Điệp — Đoá Sen Hoàng Kim (Imperial Champagne Gold)
        butterflies: {
            envTheme: 'champagne',
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
                ao: '#2b1b03',
                base: '#876314',
                mid: '#c99b32',
                tip: '#f5d97a',
                rim: '#fff3bd',
                backAo: '#211502',
                backBase: '#66490d',
                backTip: '#ad8221',
                vein: '255,242,190',
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
        // 🎀 Ruy-băng — Mẫu Đơn Lụa Tím Oải Hương Hoàng Gia (Royal Amethyst Lavender)
        ribbon: {
            envTheme: 'lavender',
            veil: '#07030e',
            skyTop: '#06030d', skyMid: '#1a0c2e', horizon: '#5e3287', horizonGlow: '#e5c4ff',
            lakeHorizon: '#3d1d5c', lakeMid: '#160926', lakeDeep: '#06020b',
            waterSubsurface: '185,125,255', waterSpec: '245,230,255',
            mountainFar: '#1e0d33', mountainNear: '#10061c', mist: '225,198,255',
            mote: [228, 198, 255], accent: '#ffe4ad', ripple: '225,195,255', firefly: '#ffebc2',
            celestial: { dir: [0.66, 0.40, -0.63], size: 92, color: '#faf5ff', glow: '225,195,255', kind: 'moon' },
            stars: 92, stem: '#183d2c', stemHi: '#62bf8e', leaf: ['#0d261b', '#235e42', '#75d1a1'],
            pad: ['#1a1430', '#38245e', '#7c56b8'],
            petal: {
                shape: 'peony_silk',
                ao: '#1f0b33',
                base: '#5e3187',
                mid: '#9860c9',
                tip: '#d2abf5',
                rim: '#f2e0ff',
                backAo: '#160726',
                backBase: '#48226b',
                backTip: '#7e48ad',
                vein: '238,218,255',
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
        // 🌹 Hồng Pháp — Đại Đoá Hồng Nhung Đỏ Rượu Vang Bordeaux (Royal Ruby Crimson)
        galaxy: {
            envTheme: 'ruby',
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
                ao: '#24020a',
                base: '#7a0b25',
                mid: '#c4193f',
                tip: '#f06583',
                rim: '#ffc7d4',
                backAo: '#1a0107',
                backBase: '#540618',
                backTip: '#9e1132',
                vein: '255,190,206',
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
        // 🌸 Thanh Liên Ngọc Bích — Đêm Trăng Hồ Ngọc Lục Bảo & Đoá Hoa Ngọc Bích (Celestial Jade Emerald)
        sakura: {
            envTheme: 'emerald',
            veil: '#030d0b',
            skyTop: '#030d0b', skyMid: '#082620', horizon: '#166351', horizonGlow: '#a8ffdf',
            lakeHorizon: '#0f4a3c', lakeMid: '#06211b', lakeDeep: '#020a08',
            waterSubsurface: '65,225,180', waterSpec: '220,255,242',
            mountainFar: '#092922', mountainNear: '#041713', mist: '175,250,225',
            mote: [175, 250, 225], accent: '#ffe49e', ripple: '170,248,222', firefly: '#ffe8a3',
            celestial: { dir: [0.64, 0.42, -0.64], size: 112, color: '#f2fffb', glow: '180,250,225', kind: 'moon' },
            stars: 110, stem: '#123d2e', stemHi: '#56c49b', leaf: ['#0a291f', '#1c634b', '#68cfa8'],
            pad: ['#09261d', '#175440', '#52b893'],
            petal: {
                shape: 'sakura',
                ao: '#04261d',
                base: '#0b614b',
                mid: '#199e7c',
                tip: '#7ce0c3',
                rim: '#dcfff4',
                backAo: '#031c15',
                backBase: '#074837',
                backTip: '#118064',
                vein: '205,255,238',
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
        // 🌷 Tulip Nắng Mai — Bình Minh Cam Đào & Đại Đoá Tulip Vàng Hồng (Sunset Coral Rose-Gold)
        hearts: {
            envTheme: 'rosegold',
            veil: '#0d0605',
            skyTop: '#120807', skyMid: '#3d1812', horizon: '#bf5a45', horizonGlow: '#ffe596',
            lakeHorizon: '#753124', lakeMid: '#2b100b', lakeDeep: '#0c0403',
            waterSubsurface: '255,155,115', waterSpec: '255,242,185',
            mountainFar: '#2e120d', mountainNear: '#1a0906', mist: '255,215,185',
            mote: [255, 222, 165], accent: '#ffe57f', ripple: '255,215,175', firefly: '#fff0a8',
            celestial: { dir: [0.66, 0.34, -0.66], size: 108, color: '#fffbe6', glow: '255,220,145', kind: 'sun' },
            stars: 60, stem: '#1b4f2e', stemHi: '#78d68a', leaf: ['#123820', '#2b7a46', '#82e096'],
            pad: ['#143822', '#286b40', '#70c989'],
            petal: {
                shape: 'tulip',
                ao: '#2e100a',
                base: '#8c3f30',
                mid: '#cf705c',
                tip: '#f7b299',
                rim: '#ffe6d9',
                backAo: '#210b06',
                backBase: '#63281d',
                backTip: '#b35744',
                vein: '255,228,210',
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

    // Pre-bake Đài Lá Sen 3D (có khe chữ V & 7 gân lá toả tròn) để vẽ 34 hoa mặt hồ bằng 1 lệnh GPU drawImage thay vì tạo Gradient + 8 đường Bezier mỗi frame
    function buildGardenPadSprite(th) {
        const sz = 128, cx = 64, cy = 64, padR = 56;
        const c = makeCanvas(sz, sz), g = c.getContext('2d');
        g.save();
        g.translate(cx, cy);
        g.lineJoin = 'round';
        g.lineCap = 'round';
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
        g.lineWidth = 1.6;
        g.stroke();

        g.strokeStyle = 'rgba(210, 255, 225, 0.24)';
        g.lineWidth = 1.1;
        g.beginPath();
        for (let v = 1; v <= 7; v++) {
            const va = 0.35 + (v / 8) * (TAU - 0.70);
            g.moveTo(0, 0);
            g.lineTo(Math.cos(va) * padR * 0.88, Math.sin(va) * padR * 0.88);
        }
        g.stroke();
        g.restore();
        return c;
    }

    // Pre-bake Đoá Hoa Vườn 3D 3 tầng cánh nhung + nhụy vàng hoàng kim để loại bỏ ~750 CanvasGradient + ~1,000 Bezier mỗi frame trên máy yếu
    function buildGardenFlowerSprite(th) {
        const sz = 160, cx = 80, cy = 84, flwR = 52;
        const c = makeCanvas(sz, sz), g = c.getContext('2d');
        g.save();
        g.translate(cx, cy);
        g.lineJoin = 'round';
        g.lineCap = 'round';
        const nPetals = th.petal.shape === 'sakura' ? 5 : (th.petal.shape === 'tulip' ? 6 : 7);
        const sinElev = 0.58;

        for (let ring = 0; ring < 3; ring++) {
            const rScale = ring === 0 ? 1.0 : (ring === 1 ? 0.76 : 0.50);
            const pLen = flwR * 1.18 * rScale;
            const pWid = pLen * (ring === 2 ? 0.70 : 0.62);
            const ringLift = ring === 0 ? 0.12 : (ring === 1 ? 0.32 : 0.58);
            for (let p = 0; p < nPetals; p++) {
                const ang = (p + ring * 0.38) * (TAU / nPetals);
                const ca = Math.cos(ang), sa = Math.sin(ang);
                const spread = (1 - ringLift * 0.55) * pLen * 0.46;
                const px = ca * spread;
                const py = sa * spread * sinElev - ringLift * pLen * 0.45;
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
                g.lineWidth = 1.05;
                g.stroke();
                g.restore();
            }
        }

        const coreR = flwR * 0.20;
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

        const stCount = 8;
        g.strokeStyle = th.accent;
        g.lineWidth = 1.25;
        g.fillStyle = '#fffbe0';
        for (let s = 0; s < stCount; s++) {
            const sa = (s / stCount) * TAU;
            const sx = Math.cos(sa) * coreR * 1.25;
            const sy = coreY + Math.sin(sa) * coreR * 0.95 * sinElev - coreR * 0.45;
            g.beginPath();
            g.moveTo(sx * 0.3, coreY);
            g.lineTo(sx, sy);
            g.stroke();
            g.beginPath();
            g.arc(sx, sy, coreR * 0.24, 0, TAU);
            g.fill();
        }
        g.restore();
        return c;
    }

    // Pre-bake Cánh Hoa Bay 3D (Drifting Petal) và Cánh Bướm Lụa 3D (Butterfly Wing) để loại bỏ tạo Gradient mỗi frame
    function buildDriftingPetalSprite(th) {
        const sz = 64, r = 26;
        const c = makeCanvas(sz, sz), g = c.getContext('2d');
        g.translate(sz * 0.5, sz * 0.5);
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
        return c;
    }

    function buildButterflyWingSprite(th) {
        const w = 96, h = 144, s = 54, ox = 8, oy = 68;
        const c = makeCanvas(w, h), g = c.getContext('2d');
        g.save();
        g.translate(ox, oy);
        g.lineJoin = 'round';
        g.lineCap = 'round';

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
        g.lineWidth = 1.1;
        g.stroke();

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

        g.strokeStyle = 'rgba(255, 248, 225, 0.28)';
        g.lineWidth = 0.9;
        g.beginPath();
        g.moveTo(0, -s * 0.04);
        g.quadraticCurveTo(s * 0.45, -s * 0.48, s * 0.92, -s * 0.42);
        g.moveTo(s * 0.35, -s * 0.34);
        g.lineTo(s * 0.82, -s * 0.18);
        g.moveTo(0, s * 0.04);
        g.quadraticCurveTo(s * 0.35, s * 0.38, s * 0.52, s * 0.82);
        g.stroke();

        g.fillStyle = 'rgba(255, 253, 240, 0.82)';
        const r1 = s * 0.055, r2 = s * 0.042, r3 = s * 0.045;
        g.beginPath();
        g.arc(s * 0.88, -s * 0.46, r1, 0, TAU);
        g.moveTo(s * 0.86 + r2, -s * 0.24);
        g.arc(s * 0.86, -s * 0.24, r2, 0, TAU);
        g.moveTo(s * 0.56 + r3, s * 0.68);
        g.arc(s * 0.56, s * 0.68, r3, 0, TAU);
        g.fill();
        g.restore();
        return c;
    }

    // Pre-bake Vảy Sóng Mặt Nước (Water Facet Sprite) gồm hõm sóng tối + đỉnh sóng bắt sáng
    function buildWaterFacetSprite(rgbSpec) {
        const w = 64, h = 24, cx = 32, cy = 11, hw = 28, hh = 5;
        const c = makeCanvas(w, h), g = c.getContext('2d');
        g.fillStyle = 'rgba(4, 2, 10, 0.42)';
        g.beginPath();
        g.moveTo(cx - hw, cy + hh * 0.55);
        g.quadraticCurveTo(cx, cy + hh * 1.65, cx + hw, cy + hh * 0.55);
        g.quadraticCurveTo(cx, cy + hh * 0.28, cx - hw, cy + hh * 0.55);
        g.fill();

        g.fillStyle = `rgba(${rgbSpec}, 0.88)`;
        g.beginPath();
        g.moveTo(cx - hw, cy);
        g.quadraticCurveTo(cx, cy - hh, cx + hw, cy);
        g.quadraticCurveTo(cx, cy + hh * 0.38, cx - hw, cy);
        g.fill();
        return c;
    }

    // Bảng màu 6 Tông Phong Bì Lụa Hoàng Gia (đồng bộ 100% với ENVELOPE_THEME_PALETTES trong director-3d.js & màu hoa THEMES)
    const ENV_THEME_PALETTES = {
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
        },
        ruby: {
            back: ['#4a0616', '#6b0b22', '#36030f'],
            pocketL: ['#9e1132', '#7a0b25', '#540618'],
            pocketR: ['#910e2d', '#6e0920', '#4a0414'],
            pocketB: ['#b81438', '#8a0d2a', '#5c071b'],
            topFlap: ['#c4193f', '#940f2e', '#63081e'],
            lining: ['#fff8f9', '#fde6ea', '#f7c8d1']
        }
    };

    // Pre-bake Bảng Tra Màu Sắc Cánh Hoa (17 mức ánh sáng) + Bảng Chuyển Hoá Sắc Tố Nhung Hoa -> Lụa Phong Bì (Origami LUT)
    function buildPetalShadeLUT(th) {
        const pt = th.petal;
        const steps = 16;
        const c1 = new Array(steps + 1);
        const c2 = new Array(steps + 1);
        const c3 = new Array(steps + 1);
        for (let i = 0; i <= steps; i++) {
            const lv = i / steps;
            c1[i] = mixHex(pt.ao, pt.base, lv * 0.85);
            c2[i] = mixHex(pt.base, pt.mid, clamp01(lv * 0.96));
            c3[i] = mixHex(pt.mid, pt.tip, clamp01(0.55 + lv * 0.35));
        }
        const mSteps = 12;
        const origami = {};
        const slotKeys = ['pocketL', 'pocketR', 'pocketB', 'topFlap'];
        Object.keys(ENV_THEME_PALETTES).forEach((tKey) => {
            const pal = ENV_THEME_PALETTES[tKey];
            const slots = new Array(4);
            for (let s = 0; s < 4; s++) {
                const fl = pal[slotKeys[s]];
                const arr = new Array(mSteps + 1);
                for (let m = 0; m <= mSteps; m++) {
                    const u = m / mSteps;
                    arr[m] = {
                        s0: mixHex(pt.ao,   fl[2], u),
                        s1: mixHex(pt.base, fl[1], u),
                        s2: mixHex(pt.mid,  fl[0], u),
                        s3: mixHex(pt.tip,  fl[0], u),
                        rim: mixHex(pt.rim, '#f6df8c', u),
                        back0: mixHex(pt.backAo,   pal.lining[2], u),
                        back1: mixHex(pt.backBase, pal.lining[1], u),
                        back2: mixHex(pt.backTip,  pal.lining[0], u)
                    };
                }
                slots[s] = arr;
            }
            origami[tKey] = { pal, slots, mSteps };
        });
        return {
            steps,
            c1,
            c2,
            c3,
            origami,
            reflMid: mixHex(pt.ao, th.lakeMid, 0.55),
            reflTip: mixHex(pt.base, th.lakeHorizon, 0.45),
            mtnFarMist: mixHex(th.mountainFar, th.horizonGlow, 0.48),
            mtnNearMist: mixHex(th.mountainNear, th.horizonGlow, 0.25)
        };
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
            shadow: buildContactShadow(),
            gardenPad: buildGardenPadSprite(th),
            gardenFlower: buildGardenFlowerSprite(th),
            driftingPetal: buildDriftingPetalSprite(th),
            butterflyWing: buildButterflyWingSprite(th),
            waterFacet: buildWaterFacetSprite(th.waterSpec),
            shadeLUT: buildPetalShadeLUT(th)
        };
        spriteCache[id] = S;
        return S;
    }

    // ---------------------------------------------------------------------------------
    // DỰNG CẢNH & KẾT XUẤT 3D MỖI KHUNG HÌNH
    // ---------------------------------------------------------------------------------
    const ENV_W = 128;
    const ENV_H = ENV_W * (472 / 680);
    const L_DIR = (() => {
        const x = -0.34, y = 0.80, z = 0.49;
        const l = Math.hypot(x, y, z);
        return [x / l, y / l, z / l];
    })();

    function createScene(motionId, stageEl) {
        const id = THEMES[motionId] ? motionId : 'bloom';
        window.CardAudio?.setMotionTheme(id);
        window.CardAudio?.resetWishBloomCues();
        const th = THEMES[id];
        const S = buildThemeSprites(id);
        const shadeLUT = S.shadeLUT;
        const petals = buildPetalList(th);
        // 4 cánh hoa sứ giả ở lớp trong cùng (Đông, Tây, Nam, Bắc) sẽ tách khỏi nhụy và gấp Origami 3D thành 4 vạt chiếc phong bì
        const innerLy = th.hero.layers[th.hero.layers.length - 1];
        const origamiAzimuths = [Math.PI, 0, Math.PI * 0.5, -Math.PI * 0.5]; // 0: Trái, 1: Phải, 2: Đáy (Trước), 3: Nắp trên (Sau)
        const origamiPetals = origamiAzimuths.map((az, slot) => ({
            slot,
            li: th.hero.layers.length - 1,
            ld: 1.0,
            az,
            len: Math.max(60, innerLy.len * 1.08),
            wid: Math.max(46, innerLy.wid * 1.06),
            a0: innerLy.a0,
            a1: innerLy.a1 + 6,
            a2: innerLy.a2 + 14,
            curl: 24,
            cup: innerLy.cup || 0.44,
            rb: innerLy.rb,
            delay: innerLy.delay,
            hasDew: false,
            theta: 0,
            curlRad: 0,
            uOpen: 0,
            cp: Math.cos(az),
            sp: Math.sin(az)
        }));
        const R = rng(1337 + id.length * 4099 + id.charCodeAt(0) * 97);
        const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        const perfProfile = getDevicePerfProfile();
        const perfTier = reduced ? 0 : perfProfile.tier; // 2: Cao cấp, 1: Tầm trung, 0: Tiết kiệm
        const rgbRipple = th.ripple;
        const rgbSpec = th.waterSpec;

        // 1. Hai tầng núi mờ sương khóa chuẩn trên đường chân trời (Horizon-locked directional mountains)
        const mountainLayers = [
            { elBase: 0.042, amp1: 0.028, amp2: 0.014, freq1: 3, freq2: 7, phase: 0.4, color: th.mountainFar, mistColor: shadeLUT.mtnFarMist },
            { elBase: 0.024, amp1: 0.018, amp2: 0.009, freq1: 5, freq2: 11, phase: 2.1, color: th.mountainNear, mistColor: shadeLUT.mtnNearMist }
        ];

        // Đèn hoa đăng bờ xa
        const shoreLights = [];
        const shoreLightCount = perfTier === 2 ? 26 : (perfTier === 1 ? 18 : 12);
        for (let i = 0; i < shoreLightCount; i++) {
            const a = (i / shoreLightCount) * TAU + (R() - 0.5) * 0.08;
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
        const cloudCount = perfTier === 2 ? 12 : (perfTier === 1 ? 9 : 6);
        for (let i = 0; i < cloudCount; i++) {
            const az = (i / cloudCount) * TAU + (R() - 0.5) * 0.2;
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
        const facetCount = perfTier === 2 ? 120 : (perfTier === 1 ? 84 : 52);
        for (let i = 0; i < facetCount; i++) {
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
        const mistCount = perfTier === 2 ? 16 : (perfTier === 1 ? 12 : 8);
        for (let i = 0; i < mistCount; i++) {
            const a = (i / mistCount) * TAU + R() * 0.3;
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
        const groundTotal = Math.max(12, Math.round(th.groundCount * (perfTier === 2 ? 1.0 : (perfTier === 1 ? 0.78 : 0.55))));
        for (let i = 0; i < groundTotal; i++) {
            const t = i / groundTotal;
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
        const fireflyTotal = Math.max(10, Math.round(th.fireflies * (perfTier === 2 ? 1.0 : (perfTier === 1 ? 0.76 : 0.52))));
        for (let i = 0; i < fireflyTotal; i++) {
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
        const driftTotal = Math.max(8, Math.round(th.driftCount * (perfTier === 2 ? 1.0 : (perfTier === 1 ? 0.76 : 0.52))));
        for (let i = 0; i < driftTotal; i++) {
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

        // Đàn bướm 3D lượn tự nhiên trong khu vườn (không bao giờ xoáy tròn như lốc cuốn)
        const flyers = [];
        const baseFlyers = th.butterflies ? 14 : 5;
        const flyerCount = perfTier === 2 ? baseFlyers : (perfTier === 1 ? Math.max(4, Math.round(baseFlyers * 0.75)) : Math.max(3, Math.round(baseFlyers * 0.55)));
        for (let i = 0; i < flyerCount; i++) {
            const fromHeart = i >= Math.floor(flyerCount * 0.50);
            const az0 = ((i / flyerCount) + (R() - 0.5) * 0.16) * TAU;
            const startR = 95 + R() * 195;
            const heading = az0 + (i % 2 === 0 ? 1 : -1) * (0.42 + R() * 0.52);
            const spd = 26 + R() * 22;
            flyers.push({
                born: fromHeart ? (T.HEART + 0.08 + (i % 5) * 0.14) : (T.BUD + 0.35 + R() * 0.65),
                fromHeart,
                az0,
                ox: Math.cos(az0) * startR,
                oz: Math.sin(az0) * startR,
                vx: Math.cos(heading) * spd,
                vz: Math.sin(heading) * spd,
                rad: fromHeart ? 115 + R() * 95 : 85 + R() * 110,
                h: 58 + R() * 115,
                dir: i % 2 === 0 ? 1 : -1,
                ph: R() * TAU,
                flapSpd: 9.0 + R() * 2.4,
                sz: (th.butterflies ? 19 : 15) + R() * 8,
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

        // Hệ thống thuỷ động lực học nghiêng (Oblique Impact Hydrodynamics) khi vì tinh tú lao chéo góc ~22° xuống mặt hồ:
        // Hướng quán tính ngang (impX, impZ) tiếp nối phương rơi từ trên-phải xuống dưới-trái tại thời điểm va chạm tau = T.IMPACT (yaw = -0.90)
        const GRAV = 920;
        const yawImpact = -0.90;
        const impX = -Math.cos(yawImpact);
        const impZ =  Math.sin(yawImpact);
        const splash = [];
        const splashCount = perfTier === 2 ? 32 : (perfTier === 1 ? 22 : 14);
        for (let i = 0; i < splashCount; i++) {
            const az = (i / splashCount) * TAU + (R() - 0.5) * 0.14;
            const fDot = Math.cos(az) * impX + Math.sin(az) * impZ; // +1 ở phía thuận chiều lao tới (bên trái), -1 ở phía lưng sao rơi
            const dirBoost = 1 + 0.36 * fDot;
            const v = (215 + R() * 330) * dirBoost;
            const el = (40 + R() * 36 - fDot * 7) * DEG;
            const vh0 = Math.cos(el) * v;
            const vy0 = Math.sin(el) * v * (1 + 0.18 * Math.max(0, fDot));
            // Cộng thêm vận tốc trượt ngang theo quán tính của vì tinh tú (92 px/s) để chùm hạt nước văng chéo tự nhiên
            const vx = Math.cos(az) * vh0 + impX * 92;
            const vz = Math.sin(az) * vh0 + impZ * 92;
            const tLand = (2 * vy0) / GRAV;
            splash.push({
                v, el, az, vh0, vy0,
                vx, vz,
                tLand,
                xLand: vx * tLand,
                zLand: vz * tLand,
                sz: (2.1 + R() * 2.5) * (0.92 + 0.20 * Math.max(0, fDot))
            });
        }

        // Phiến màng nước vương miện 3D bất đối xứng (Oblique Liquid Crown Splash Sheets) bung cao và vươn xa hơn ở phía đón quán tính sao rơi
        const crownSheets = [];
        const crownSheetCount = perfTier === 2 ? 14 : (perfTier === 1 ? 10 : 7);
        for (let i = 0; i < crownSheetCount; i++) {
            const az = (i / crownSheetCount) * TAU + (R() - 0.5) * 0.08;
            const fDot = Math.cos(az) * impX + Math.sin(az) * impZ;
            crownSheets.push({
                az,
                fDot,
                span: (0.16 + R() * 0.10),
                vRad: (115 + R() * 55) * (1 + 0.42 * fDot),
                vUp: (240 + R() * 92) * (1 + 0.40 * fDot),
                pearls: 2 + (i % 2)
            });
        }

        // Giọt nước hồ rũ rơi vật lý từ đầu các cánh hoa khi nụ hoa trồi lên và bung mở
        const bloomDrops = [];
        const bloomDropCount = perfTier === 2 ? 24 : (perfTier === 1 ? 16 : 10);
        for (let i = 0; i < bloomDropCount; i++) {
            const az = (i / bloomDropCount) * TAU + (R() - 0.5) * 0.18;
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

        // Hạt phấn hoa hoàng kim bung nở vật lý khi tâm hoa thức tỉnh (tau = T.HEART)
        const pollenParticles = [];
        const pollenCount = perfTier === 2 ? 26 : (perfTier === 1 ? 18 : 12);
        for (let i = 0; i < pollenCount; i++) {
            const az = (i / pollenCount) * TAU + (R() - 0.5) * 0.2;
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
        const sparkCount = perfTier === 2 ? 18 : (perfTier === 1 ? 14 : 10);
        for (let i = 0; i < sparkCount; i++) {
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
            tau: reduced ? 4.95 : 0,
            postClock: 0,
            clock: 0,
            impactClock: -1,
            skipFlash: 0,
            finished: false,
            quality: perfTier,
            slowFrames: 0,
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
            const settle = smooth((sc.tau - 5.6) / 0.7);
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
                z: cam.z + Dd * (cam.fz + cam.rz * u + cam.uz * v),
                rx: cam.rx,
                rz: cam.rz
            };
        }

        function rebuildViewCaches(vw, vh) {
            sc.vw = vw; sc.vh = vh;
            sc.M0 = computeM0(vw, vh);
            if (!sc.vignette) {
                const vg = makeCanvas(256, 256), vgg = vg.getContext('2d');
                const rg = vgg.createRadialGradient(128, 128, 44, 128, 128, 148);
                rg.addColorStop(0, 'rgba(0,0,0,0)');
                rg.addColorStop(1, 'rgba(0,0,0,0.50)');
                vgg.fillStyle = rg;
                vgg.fillRect(0, 0, 256, 256);
                sc.vignette = vg;
            }
        }

        function motePos(tau, o) {
            const M0 = sc.M0;
            if (tau < T.FALL) {
                const preDrift = smooth((tau - 0.08) / 0.62) * 155;
                o.x = M0.x + M0.rx * preDrift;
                o.y = M0.y + Math.sin(sc.clock * 1.8) * 5;
                o.z = M0.z + M0.rz * preDrift;
                return;
            }
            const p = clamp01((tau - T.FALL) / (T.IMPACT - T.FALL));
            // Gia tốc trọng trường vật lý kết hợp vận tốc trượt nghiêng mượt mà xuống tâm mặt hồ
            const s = 0.24 * p + 0.76 * Math.pow(p, 2.15);
            bez(s, o);
        }

        function bez(s, o) {
            const M0 = sc.M0;
            const sx = M0.x + M0.rx * 155;
            const sy = M0.y;
            const sz = M0.z + M0.rz * 155;
            const cx = sx * 0.44, cy = sy * 0.52, cz = sz * 0.44;
            const a = (1 - s) * (1 - s), b = 2 * (1 - s) * s;
            o.x = a * sx + b * cx;
            o.y = a * sy + b * cy;
            o.z = a * sz + b * cz;
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
            const nStars = sc.quality ? stars.length : Math.min(stars.length, 52);
            for (let i = 0; i < nStars; i++) {
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
                const colSteps = sc.quality ? 38 : 22;
                for (let s = 0; s < colSteps; s++) {
                    const p = s / colSteps;
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
                    const steps = sc.quality ? 48 : 32;
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
                    mg.addColorStop(1.0, ml.mistColor);
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

            // 1J. Gợn sóng lăn tăn 3D hữu cơ trên mặt hồ (Sử dụng Sprite vảy sóng pre-baked tốc độ cao!)
            g.save();
            g.globalCompositeOperation = 'source-over';
            const nFacets = sc.quality ? waterFacets.length : (waterFacets.length >> 1);
            for (let i = 0; i < nFacets; i++) {
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

                const w = Math.max(5, wf.len * Q.k * (0.72 + 0.58 * intensity));
                const h = Math.max(2.2, 4.6 * Q.k);
                g.globalAlpha = Math.min(0.86, alpha * 1.12);
                g.drawImage(S.waterFacet, Q.x - w * 0.5, Q.y - h * 0.45, w, h);
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
            const segs = sc.quality ? 20 : 14;
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
                const segs = sc.quality ? 48 : 32;
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
                if (valid > 10) {
                    g.strokeStyle = `rgba(3, 1, 8, ${(fade * 0.42).toFixed(3)})`;
                    g.lineWidth = Math.max(2.4, rp.w * 3.6 * centerK);
                    g.stroke();
                }

                // 2B. Đỉnh sóng bắt sáng biến thiên tự nhiên theo góc nhìn Fresnel
                g.save();
                g.globalCompositeOperation = 'lighter';
                const arcCount = sc.quality ? 16 : 10;
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

            // 2E. Sóng gợn sinh thái liên tục dưới chân Đại Đoá Hoa trong lúc đóng dấu sáp, chờ mở và mở thiệp
            if (tau > T.ENV_IN + 0.45 && project(0, 0, 0, Q2)) {
                for (let ar = 0; ar < 3; ar++) {
                    const cyc = ((sc.clock * 0.48 + ar * 0.333) % 1);
                    const rAmb = 42 + cyc * 245;
                    const aAmb = Math.sin(cyc * Math.PI) * (1 - cyc * 0.45) * 0.42;
                    drawMiniRippleRing3D(g, 0, 0, rAmb, aAmb, Q2.k);
                }
            }

            g.restore();
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = 1;
        }

        // Hố lõm mặt nước 3D bất đối xứng (Oblique Concave Water Crater), Vương miện màng nước phóng nghiêng (Asymmetric Crown Splash),
        // Tia nước phóng chéo theo quán tính (Forward Ballistic Plume) & Cột nước hồi lưu Worthington nghiêng động học
        function drawImpactCraterAndSplash3D(g, tau) {
            const t = tau - T.IMPACT;
            if (t < 0 || t > 1.25) return;

            g.save();
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = 1;
            g.lineJoin = 'round';
            g.lineCap = 'round';

            // 1. Hố lõm thuỷ lực 3D & thành nước vương miện bất đối xứng theo phương sao rơi (t = 0..0.58s)
            if (t < 0.58 && project(0, 0, 0, P0)) {
                const pC = t / 0.58;
                const craterR = (22 + 64 * easeOutCubic(pC));
                const depth = 22 * Math.sin(Math.pow(pC, 0.65) * Math.PI);
                const rimH = 15 * Math.sin(Math.pow(pC, 0.55) * Math.PI);
                const fadeC = 1 - smooth((pC - 0.55) / 0.45);
                const cavShift = 10 * easeOutCubic(pC);

                const rimPts = [];
                const botPts = [];
                const segs = 28;
                for (let s = 0; s <= segs; s++) {
                    const a = (s / segs) * TAU;
                    const ca = Math.cos(a), sa = Math.sin(a);
                    const fDot = ca * impX + sa * impZ;
                    const crownMod = (1 + 0.18 * Math.sin(a * 12 + t * 8)) * (1 + 0.44 * fDot);
                    const rLocal = craterR * (1 + 0.16 * fDot);
                    const rx = ca * rLocal + impX * cavShift * 0.55;
                    const rz = sa * rLocal + impZ * cavShift * 0.55;
                    if (project(rx, Math.max(0.5, rimH * crownMod), rz, Q)) {
                        rimPts.push({ x: Q.x, y: Q.y });
                    }
                    if (project(ca * craterR * 0.50 + impX * cavShift, -depth, sa * craterR * 0.50 + impZ * cavShift, Q2)) {
                        botPts.push({ x: Q2.x, y: Q2.y });
                    }
                }

                if (rimPts.length > 10 && botPts.length > 10 && project(impX * cavShift, -depth, impZ * cavShift, P1)) {
                    // Lòng hố nước lõm sâu thẳm lệch tâm theo hướng quán tính sao đâm xuống
                    const cg = g.createRadialGradient(P1.x, P1.y, 2, P0.x, P0.y, craterR * P0.k * 1.18);
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

                // 14 phiến màng nước vương miện 3D vọt cao và vươn chéo mạnh hơn ở phía đón quán tính sao rơi
                for (let i = 0; i < crownSheets.length; i++) {
                    const cs = crownSheets[i];
                    const rBase = craterR * 0.90 * (1 + 0.14 * cs.fDot);
                    const rTip = rBase + cs.vRad * t * 0.68;
                    const yTip = Math.max(0, cs.vUp * t - 0.5 * GRAV * t * t);
                    if (yTip <= 0.5) continue;
                    const aL = cs.az - cs.span;
                    const aR = cs.az + cs.span;
                    const driftX = impX * 54 * t;
                    const driftZ = impZ * 54 * t;
                    const tipX = Math.cos(cs.az) * rTip + driftX;
                    const tipZ = Math.sin(cs.az) * rTip + driftZ;
                    if (project(Math.cos(aL) * rBase + driftX * 0.25, 1.5, Math.sin(aL) * rBase + driftZ * 0.25, P1) &&
                        project(Math.cos(aR) * rBase + driftX * 0.25, 1.5, Math.sin(aR) * rBase + driftZ * 0.25, P2) &&
                        project(tipX, yTip, tipZ, P3)) {
                        const sg = g.createLinearGradient((P1.x + P2.x) * 0.5, (P1.y + P2.y) * 0.5, P3.x, P3.y);
                        sg.addColorStop(0.0, `rgba(${th.waterSubsurface}, ${(fadeC * 0.38).toFixed(3)})`);
                        sg.addColorStop(0.65, `rgba(${rgbRipple}, ${(fadeC * 0.74).toFixed(3)})`);
                        sg.addColorStop(1.0, `rgba(255, 255, 255, ${(fadeC * 0.94).toFixed(3)})`);
                        g.fillStyle = sg;
                        g.beginPath();
                        g.moveTo(P1.x, P1.y);
                        g.quadraticCurveTo((P1.x + P3.x) * 0.5, P3.y, P3.x, P3.y);
                        g.quadraticCurveTo((P2.x + P3.x) * 0.5, P3.y, P2.x, P2.y);
                        g.closePath();
                        g.fill();

                        // Giọt ngọc bọt nước tách ra ở đỉnh phiến vương miện
                        const pr = Math.max(1.2, (2.0 + 0.8 * Math.max(0, cs.fDot)) * P3.k);
                        g.fillStyle = `rgba(255, 255, 255, ${(fadeC * 0.90).toFixed(3)})`;
                        g.beginPath();
                        g.arc(P3.x, P3.y, pr, 0, TAU);
                        g.fill();
                    }
                }
            }

            // 2A. Tia nước phóng chéo sơ cấp (Forward Ballistic Splash Plume, t = 0.01..0.48s) vọt tiếp nối góc rơi ~22° của vì tinh tú
            if (t >= 0.01 && t < 0.48) {
                const pF = (t - 0.01) / 0.47;
                const fEnv = Math.sin(Math.pow(pF, 0.52) * Math.PI);
                const fwdH = 66 * fEnv;
                const fwdDist = (14 + 38 * easeOutCubic(pF));
                const fBaseR = 16 * (1 - 0.35 * pF) * fEnv;
                const fTipR = Math.max(3.8, fBaseR * 0.38);
                if (fwdH > 3 &&
                    project(-cam.rx * fBaseR, 0, -cam.rz * fBaseR, P1) &&
                    project( cam.rx * fBaseR, 0,  cam.rz * fBaseR, P2) &&
                    project(impX * fwdDist * 0.52, fwdH * 0.64, impZ * fwdDist * 0.52, P2L) &&
                    project(impX * fwdDist, fwdH, impZ * fwdDist, P3)) {
                    const fadeF = (1 - smooth((pF - 0.48) / 0.52)) * 0.78;
                    const fg = g.createLinearGradient((P1.x + P2.x) * 0.5, (P1.y + P2.y) * 0.5, P3.x, P3.y);
                    fg.addColorStop(0.00, `rgba(${th.waterSubsurface}, 0.55)`);
                    fg.addColorStop(0.65, `rgba(${rgbRipple}, 0.88)`);
                    fg.addColorStop(1.00, '#ffffff');
                    g.globalAlpha = fadeF;
                    g.fillStyle = fg;
                    const tipRadPx = fTipR * P3.k;
                    g.beginPath();
                    g.moveTo(P1.x, P1.y);
                    g.quadraticCurveTo(P2L.x - tipRadPx * 1.3, P2L.y, P3.x - tipRadPx, P3.y);
                    g.arc(P3.x, P3.y, tipRadPx, Math.PI, 0, false);
                    g.quadraticCurveTo(P2L.x + tipRadPx * 1.3, P2L.y + tipRadPx * 0.6, P2.x, P2.y);
                    g.closePath();
                    g.fill();
                }
            }

            // 2B. Cột nước dội ngược Worthington Jet 3D nghiêng động học (t = 0.04..0.74s) nâng nụ hoa trồi lên!
            if (t >= 0.04 && t < 0.74) {
                const pJ = (t - 0.04) / 0.70;
                const jetEnv = Math.sin(Math.pow(pJ, 0.58) * Math.PI);
                const jetH = 82 * jetEnv;
                const baseR = (26 - 12 * pJ) * (0.4 + 0.6 * jetEnv);
                const neckR = Math.max(4.5, baseR * 0.34);
                const bulbR = Math.max(6.5, baseR * 0.52);
                // Cột nước Worthington nghiêng theo phương động lượng ngang của sao rơi rồi dần hồi tâm khi nụ hoa trồi lên
                const tiltDist = jetH * 0.27 * (1 - 0.32 * pJ);
                const tiltX = impX * tiltDist;
                const tiltZ = impZ * tiltDist;

                if (jetH > 3 &&
                    project(-cam.rx * baseR, 0, -cam.rz * baseR, P1) &&
                    project( cam.rx * baseR, 0,  cam.rz * baseR, P2) &&
                    project(tiltX * 0.56 - cam.rx * neckR, jetH * 0.68, tiltZ * 0.56 - cam.rz * neckR, P2L) &&
                    project(tiltX * 0.56 + cam.rx * neckR, jetH * 0.68, tiltZ * 0.56 + cam.rz * neckR, P4R) &&
                    project(tiltX, jetH, tiltZ, P3)) {

                    const fadeJ = (1 - smooth((pJ - 0.55) / 0.45)) * 0.90;
                    const jg = g.createLinearGradient((P1.x + P2.x) * 0.5, (P1.y + P2.y) * 0.5, P3.x, P3.y);
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

                    // Sống phản quang nước uốn cong dọc thân cột Worthington nghiêng
                    g.strokeStyle = `rgba(255, 255, 255, ${(fadeJ * 0.82).toFixed(3)})`;
                    g.lineWidth = Math.max(1.2, 2.2 * P3.k);
                    g.beginPath();
                    g.moveTo((P1.x + P2.x) * 0.5, (P1.y + P2.y) * 0.5);
                    g.quadraticCurveTo((P2L.x + P4R.x) * 0.5, (P2L.y + P4R.y) * 0.5, P3.x, P3.y - bulbR * P3.k * 0.4);
                    g.stroke();
                }
            }

            // 3. 32 Giọt nước cầu thuỷ tinh 3D văng chéo theo quỹ đạo Parabol trọng trường + quán tính sao rơi (t = 0..1.15s)
            g.globalAlpha = 1;
            for (let i = 0; i < splash.length; i++) {
                const sp = splash[i];
                if (t >= sp.tLand) continue;
                const y = sp.vy0 * t - 0.5 * GRAV * t * t;
                if (y < 0) continue;
                const x = sp.vx * t, z = sp.vz * t;
                if (!project(x, y, z, Q)) continue;

                const fadeD = clamp01(1 - (t / sp.tLand) * 0.35);
                const tPrev = Math.max(0, t - 0.028);
                const yPrev = Math.max(0, sp.vy0 * tPrev - 0.5 * GRAV * tPrev * tPrev);
                if (project(sp.vx * tPrev, yPrev, sp.vz * tPrev, Q2)) {
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

            // 3B. Đài lá sen 3D nổi trên mặt nước (Sử dụng Sprite pre-baked tốc độ cao)
            g.save();
            g.scale(1, sinElev);
            g.rotate(gf.notchRot);
            const padDrawR = padR * (64 / 56);
            g.drawImage(S.gardenPad, -padDrawR, -padDrawR, padDrawR * 2, padDrawR * 2);
            g.restore();

            // 3C. Đoá hoa 3D 3 lớp cánh nhung + nhụy vàng (Sử dụng Sprite pre-baked tốc độ cao)
            const openAmt = springPetalOpen(clamp01((gf.bloom - 0.10) / 0.90));
            const flwScale = (flwR / 52) * (0.68 + 0.32 * openAmt);
            const fw = 160 * flwScale;
            const fh = fw * (0.78 + 0.22 * sinElev);
            g.translate(0, -stemPx - (1 - openAmt) * flwR * 0.18);
            if (gf.rot > Math.PI) g.scale(-1, 1);
            g.drawImage(S.gardenFlower, -fw * 0.5, -fh * (84 / 160), fw, fh);

            g.restore();
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = 1;
        }

        // =================================================================================
        // 4. ĐẠI ĐOÁ HOA CHỦ ĐẠO 3D (ĐÀI LÁ SEN HOÀNG GIA + CƠ HỌC NỞ CÁNH ĐÀN HỒI + LỰC ĐẨY ARCHIMEDES)
        // =================================================================================
        const drawQueue = [];
        const queuePool = [];
        let queuePoolIdx = 0;
        function allocQItem() {
            if (queuePoolIdx >= queuePool.length) queuePool.push({});
            return queuePool[queuePoolIdx++];
        }
        const heroPadPtsPool = [];
        for (let s = 0; s <= 32; s++) heroPadPtsPool.push({ x: 0, y: 0 });
        const heroPadPtsActive = [];
        const dewPool = [];
        let dewPoolIdx = 0;
        function allocDew(x, y, r) {
            if (dewPoolIdx >= dewPool.length) dewPool.push({ x: 0, y: 0, r: 0 });
            const d = dewPool[dewPoolIdx++];
            d.x = x; d.y = y; d.r = r;
            return d;
        }
        const roundness = th.petal.roundness || 0.72;

        // Đánh giá điểm 3D trên bề mặt cong của cánh hoa:
        // u in [0..1] (từ gốc tới đỉnh cánh), v in [-1..1] (từ mép trái qua sống giữa tới mép phải)
        function evalHeroPetalPoint(p, hs, u, v, out) {
            const open = hs.open;
            const cup = p.cup * (0.72 + 0.28 * open);
            const baseTheta = p.theta;
            // Sóng đàn hồi sinh học lan từ gốc cánh ra đầu cánh khi bung mở (Biomechanical Whip Wave)
            const whipWave = Math.sin((u - p.uOpen * 1.1) * Math.PI * 1.5) * 0.08 * (1 - p.uOpen) * smooth(p.uOpen / 0.15);
            // Bụng cánh căng đầy ở giữa (bellyArch > 0) và đầu cánh khum vòng lên bầu trời (p.curlRad < 0) hoặc uốn ngọn hướng ra ngoài (p.curl > 0)
            const bellyArch = Math.sin(u * Math.PI) * (p.curl > 0 ? -0.09 : (0.14 + 0.08 * open)) + whipWave;
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
        const hsEvalTmp = { H: 0, scale: 0, open: 0, sway: 0 };

        function computeHeroState(tau) {
            const tBud = tau - (T.BUD - 0.08);
            const grow = clamp01(tBud / 1.08);
            if (grow <= 0) return { visible: false, H: 0, padY: 0, scale: 0, open: 0, sway: 0, crownTop: 0 };

            // 1. Lực đẩy nổi Archimedes (Archimedes Buoyancy): Nụ hoa phóng vọt từ cột nước Worthington, nhô cao rồi nhún xuống mặt nước!
            const archimedesBounce = Math.exp(-tBud * 2.9) * Math.sin(tBud * 8.6) * 7.8;
            // 2. Nhịp rung nhẹ khi nhụy hoa cộng hưởng dệt Lõi Thư (tau = 3.12s), phản lực khi 4 cánh tách ra (tau = 4.15s) & độ nhún khi 4 vạt thư khép lại (tau = 6.02s)
            const tDet = Math.max(0, tau - T_ORIGAMI_START);
            const detachDip = (tau >= T_ORIGAMI_START && tau < 4.95)
                ? -3.6 * Math.exp(-tDet * 4.4) * Math.sin(tDet * 10.5)
                : 0;
            const tLock = Math.max(0, tau - 6.02);
            const lockDip = (tau >= 6.02 && tau < T.LIFT + 0.25)
                ? -8.8 * Math.exp(-tLock * 3.9) * Math.sin(tLock * 11.2)
                : 0;
            const envWeightDip = detachDip + lockDip;
            const envPetalFlex = (tau >= 6.02 && tau < T.LIFT + 0.25)
                ? 5.6 * Math.exp(-tLock * 3.6) * Math.sin(tLock * 11.2)
                : (tau >= T_ORIGAMI_START && tau < 4.95 ? 2.2 * Math.exp(-tDet * 4.2) * Math.sin(tDet * 10.5) : 0);

            const waterBob = Math.sin(sc.clock * 1.85) * 1.1 * smooth(tBud / 0.8);
            const padY = Math.max(-2.5, 0.8 + archimedesBounce * 0.38 + envWeightDip * 0.35 + waterBob * 0.45);
            const H = Math.max(2.0, th.hero.H * easeOutCubic(grow) + archimedesBounce + envWeightDip + waterBob);

            const scale = 0.24 + 0.76 * springOut(clamp01(tBud / 1.18), 7.5, 3.5, 1);
            // Hoa trung tâm bung nở hoàn chỉnh 100% ở tau = 3.08s để người xem thấy rõ toàn diện đóa hoa và 42 hạt nhị hoa vàng trước khi nhị hoa rung động tạo Lõi Thư!
            const open = clamp01((tau - (T.BUD + 0.09)) / 1.04);
            const sway = (Math.sin(sc.clock * 1.05) * 2.2 + Math.sin(tBud * 7.2) * Math.exp(-tBud * 2.6) * 3.5) * grow;
            const breathe = Math.sin(sc.clock * 1.65) * 1.4 * smooth((tau - 2.90) / 0.7);

            hsEvalTmp.H = H; hsEvalTmp.scale = scale; hsEvalTmp.open = open; hsEvalTmp.sway = sway;
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

                evalHeroPetalPoint(p, hsEvalTmp, 0.65, 0, W0);
                evalHeroPetalPoint(p, hsEvalTmp, 1.00, 0, W1);
                crownTop = Math.max(crownTop, W0.y - H, W1.y - H);
            }

            for (let s = 0; s < 4; s++) {
                const op = origamiPetals[s];
                const uRaw = clamp01((open - op.delay) / Math.max(0.22, 0.88 - op.delay));
                const uSpring = springPetalOpen(uRaw);
                let deg;
                if (uRaw < 0.62) deg = lerp(op.a0, op.a1, springPetalOpen(uRaw / 0.62));
                else deg = lerp(op.a1, op.a2, springPetalOpen((uRaw - 0.62) / 0.38));
                op.theta = deg * DEG;
                op.curlRad = op.curl * DEG * Math.min(1.12, uSpring);
                op.uOpen = uRaw;
                const phi = op.az + sc.clock * 0.018 * (1 - smooth((tau - T_ORIGAMI_START) / 0.35));
                op.cp = Math.cos(phi);
                op.sp = Math.sin(phi);
            }

            return { visible: true, grow, H, padY, scale, open, sway, crownTop, envWeightDip };
        }

        function queueHeroFlower3D(hs, ms) {
            drawQueue.length = 0;
            queuePoolIdx = 0;
            dewPoolIdx = 0;
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
                heroPadPtsActive.length = 0;
                const nSegs = 32;
                const notchAz = 0.85; // Khe chữ V duyên dáng phía bên phải
                const basePadY = hs.padY !== undefined ? hs.padY : 0.8;
                for (let s = 0; s <= nSegs; s++) {
                    const a = notchAz + 0.20 + (s / nSegs) * (TAU - 0.40);
                    const waveR = padWorldR * (1 + 0.03 * Math.sin(a * 6 + sc.clock * 1.2));
                    const waveY = basePadY + Math.sin(a * 5 + sc.clock * 1.5) * 1.2;
                    if (project(Math.cos(a) * waveR, waveY, Math.sin(a) * waveR, Q)) {
                        const pt = heroPadPtsPool[s];
                        pt.x = Q.x; pt.y = Q.y;
                        heroPadPtsActive.push(pt);
                    }
                }
                if (heroPadPtsActive.length > 10 && project(0, basePadY, 0, P0)) {
                    const it = allocQItem();
                    it.kind = 'hero_pad';
                    it.key = centerZ + 220;
                    it.cx = P0.x;
                    it.cy = P0.y;
                    it.k = P0.k;
                    it.rPx = padWorldR * P0.k;
                    it.pts = heroPadPtsActive;
                    drawQueue.push(it);
                }
            }

            // 4B. Cuống hoa 3D ngắn thanh thoát nối từ tâm Đài Lá Sen Hoàng Gia lên Đế Hoa
            if (project(0, 0.8 * ms, 0, P0) &&
                project(hs.sway * 0.25, hs.H * 0.36 * ms, 0, P1) &&
                project(hs.sway * 0.65, hs.H * 0.72 * ms, 0, P2) &&
                project(hs.sway, hs.H * ms, 0, P3)) {
                const it = allocQItem();
                it.kind = 'stem_curve';
                it.key = centerZ + 180;
                it.x0 = P0.x; it.y0 = P0.y;
                it.x1 = P1.x; it.y1 = P1.y;
                it.x2 = P2.x; it.y2 = P2.y;
                it.x3 = P3.x; it.y3 = P3.y;
                it.wBase = 8.0 * P0.k * hs.scale;
                it.wTop = 6.5 * P3.k * hs.scale;
                it.refl = isRefl;
                drawQueue.push(it);
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
                        const it = allocQItem();
                        it.kind = 'leaf';
                        it.key = centerZ + 145;
                        it.bx = P0.x; it.by = P0.y;
                        it.lx = P1.x; it.ly = P1.y;
                        it.tx = P2.x; it.ty = P2.y;
                        it.rx = P3.x; it.ry = P3.y;
                        it.refl = isRefl;
                        drawQueue.push(it);
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
                        const it = allocQItem();
                        it.kind = 'sepal';
                        it.key = centerZ + 125;
                        it.bx = P0.x; it.by = P0.y;
                        it.lx = P1.x; it.ly = P1.y;
                        it.tx = P2.x; it.ty = P2.y;
                        it.rx = P3.x; it.ry = P3.y;
                        drawQueue.push(it);
                    }
                }
            }

            // 4D. Các cánh hoa 3D cong Bezier tròn đầy (Sắp xếp theo hình học vỏ trụ lồng nhau Nested Cylindrical Shells!)
            const highViewMix = !isRefl ? smooth((elev - 34 * DEG) / (16 * DEG)) : 0;
            const totalPetals = (!isRefl && sc.tau < T_ORIGAMI_START) ? petals.length + 4 : petals.length;
            for (let i = 0; i < totalPetals; i++) {
                const p = i < petals.length ? petals[i] : origamiPetals[i - petals.length];
                // Trong bóng nước phản chiếu mờ (globalAlpha = 0.14), chỉ cần vẽ 2 tầng cánh ngoài tạo dáng phản chiếu, tiết kiệm 55% phép chiếu 3D
                if (isRefl && p.li >= 2) continue;

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
                        dewScreen = allocDew(Q.x, Q.y, Math.max(2.4, p.dewR * Q.k * hs.scale));
                    }
                }

                // Định lý vỏ trụ lồng nhau (Nested Cylindrical Shell Depth):
                // - Nửa trước (frontCos > 0): Lớp ngoài (li=0, shellR=92) có key nhỏ nhất -> luôn vẽ SAU CÙNG, ôm trọn lớp trong (li=1..4) và nhụy!
                // - Nửa sau (frontCos < 0): Lớp ngoài (li=0, shellR=92) có key lớn nhất -> luôn vẽ ĐẦU TIÊN, nằm phía sau lớp trong và nhụy!
                const shellR = 92 - p.li * 16;
                const lateralWrap = (1 - p.ld) * 8 * (1 - highViewMix) - p.ld * 14 * highViewMix;
                const shellKey = centerZ - frontCos * shellR - lateralWrap;

                const it = allocQItem();
                it.kind = 'petal';
                it.key = shellKey;
                it.p0x = P0.x; it.p0y = P0.y;
                it.p1x = P1.x; it.p1y = P1.y;
                it.p2lx = P2L.x; it.p2ly = P2L.y;
                it.p2x = P2.x; it.p2y = P2.y;
                it.tlx = PTL.x; it.tly = PTL.y;
                it.p3x = P3.x; it.p3y = P3.y;
                it.trx = PTR.x; it.try = PTR.y;
                it.p4x = P4.x; it.p4y = P4.y;
                it.p4rx = P4R.x; it.p4ry = P4R.y;
                it.p5x = P5.x; it.p5y = P5.y;
                it.p6x = P6.x; it.p6y = P6.y;
                it.k = P6.k;
                it.ld = p.ld;
                it.li = p.li;
                it.uOpen = p.uOpen;
                it.isFrontFace = isFrontFace;
                it.lightVal = lightVal;
                it.sideLight = sideLight;
                it.shape = th.petal.shape;
                it.dew = dewScreen;
                it.refl = isRefl;
                drawQueue.push(it);
            }

            // 4E. Vương miện 42 sợi nhụy vàng 3D & Đế nhuỵ (Receptacle) nằm đúng trong lòng chén hoa (shellR = 0..14 < 26)
            // Khi người xem đã nhìn thấy rõ các hạt nhị hoa (tau >= T_CARD_WEAVE = 3.12s), 42 hạt nhị hoa ngân rung cộng hưởng tinh tế theo sóng hài đồng tâm để kết tinh Lõi Thư!
            if (!isRefl && hs.open > 0.16) {
                const stOpen = springOut(clamp01((hs.open - 0.16) / 0.56), 7.2, 3.2, 1);
                const stamenVib = smooth((sc.tau - T_CARD_WEAVE) / 0.24) * (1 - smooth((sc.tau - 4.06) / 0.32));
                if (project(hs.sway, hs.H + 8 * hs.scale, 0, P0)) {
                    const it = allocQItem();
                    it.kind = 'receptacle';
                    it.key = centerZ + 2 - 22 * highViewMix;
                    it.x = P0.x; it.y = P0.y;
                    it.r = 18.5 * hs.scale * P0.k * stOpen;
                    it.vib = stamenVib;
                    drawQueue.push(it);
                }
                const stStep = sc.quality ? 1 : 2;
                for (let i = 0; i < stamens.length; i += stStep) {
                    const st = stamens[i];
                    // Sóng cộng hưởng lan toả mềm mại từ vòng nhị trong ra vòng nhị ngoài (không giật lắc thô)
                    const harmonicPhase = sc.clock * 20.0 - st.ring * 1.15 + st.az * 2.0 + st.ph * 0.5;
                    const vibWave = stamenVib * Math.sin(harmonicPhase);
                    const vibPulse = 0.5 + 0.5 * Math.sin(sc.clock * 16.0 - st.ring * 0.9 + i * 0.85);
                    const vibAz = stamenVib * Math.cos(sc.clock * 18.0 + st.ph) * 0.018;
                    const cp = Math.cos(st.az + sc.clock * 0.02 + vibAz), sp = Math.sin(st.az + sc.clock * 0.02 + vibAz);
                    const stFrontCos = cp * vx + sp * vz;
                    // Các sợi chỉ nhị khẽ hướng nhẹ đầu bao phấn vào tâm (5%..6%) và rung vi mô thanh thoát
                    const vibGather = stamenVib * (0.045 + 0.015 * vibPulse);
                    const ang = st.spread * stOpen * (1 - vibGather) + Math.sin(sc.clock * 2.2 + st.ph) * 0.045 + vibWave * 0.024;
                    const sa = Math.sin(ang), ca = Math.cos(ang);
                    const len = (st.len + 12 + stamenVib * 0.85 * vibPulse) * hs.scale * stOpen;
                    const bx = hs.sway + cp * st.rb * hs.scale;
                    const by = hs.H + 6.5 * hs.scale;
                    const bz = sp * st.rb * hs.scale;
                    const mx = bx + cp * sa * len * 0.45;
                    const my = by + ca * len * 0.58 + stamenVib * 0.25 * vibWave * hs.scale;
                    const mz = bz + sp * sa * len * 0.45;
                    const vibTipJit = vibWave * 0.36 * hs.scale;
                    const vibLift = stamenVib * (0.55 + 0.35 * vibPulse) * hs.scale;
                    const tx = bx + cp * (sa * len + vibTipJit);
                    const ty = by + ca * len + vibLift;
                    const tz = bz + sp * (sa * len + vibTipJit);
                    if (project(bx, by, bz, P0) && project(mx, my, mz, P1) && project(tx, ty, tz, P2)) {
                        const stShellR = 14 - st.ring * 3;
                        const it = allocQItem();
                        it.kind = 'stamen';
                        it.key = centerZ - stFrontCos * stShellR - 24 * highViewMix;
                        it.bx = P0.x; it.by = P0.y;
                        it.mx = P1.x; it.my = P1.y;
                        it.tx = P2.x; it.ty = P2.y;
                        it.k = P2.k;
                        it.ring = st.ring;
                        it.vib = stamenVib;
                        it.vibPulse = vibPulse;
                        drawQueue.push(it);
                    }
                }
            }

            drawQueue.sort((a, b) => b.key - a.key);
        }

        // Đường bao cánh hoa B-Spline bậc 2 qua trung điểm (Liên tục C1 tuyệt đối 100% tại mọi điểm, không bao giờ có góc gãy ở vai hay đỉnh!)
        const kxTmp = new Float64Array(9);
        const kyTmp = new Float64Array(9);
        function traceHeroPetalPath(g, s) {
            const tipX = s.shape === 'sakura' ? lerp(s.p6x, s.p3x, 0.84) : s.p3x;
            const tipY = s.shape === 'sakura' ? lerp(s.p6y, s.p3y, 0.84) : s.p3y;
            kxTmp[0] = s.p1x; kxTmp[1] = s.p2lx; kxTmp[2] = s.p2x; kxTmp[3] = s.tlx; kxTmp[4] = tipX; kxTmp[5] = s.trx; kxTmp[6] = s.p4x; kxTmp[7] = s.p4rx; kxTmp[8] = s.p5x;
            kyTmp[0] = s.p1y; kyTmp[1] = s.p2ly; kyTmp[2] = s.p2y; kyTmp[3] = s.tly; kyTmp[4] = tipY; kyTmp[5] = s.try; kyTmp[6] = s.p4y; kyTmp[7] = s.p4ry; kyTmp[8] = s.p5y;

            g.beginPath();
            g.moveTo(s.p0x, s.p0y);
            for (let k = 0; k < 8; k++) {
                const mx = (kxTmp[k] + kxTmp[k + 1]) * 0.5;
                const my = (kyTmp[k] + kyTmp[k + 1]) * 0.5;
                g.quadraticCurveTo(kxTmp[k], kyTmp[k], mx, my);
            }
            g.quadraticCurveTo(kxTmp[8], kyTmp[8], s.p0x, s.p0y);
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

                    // 3. Viền mép lá bắt sáng & gân lá sen toả tròn (tận dụng luôn path vừa trace và gộp gân lá vào 1 lệnh stroke!)
                    g.strokeStyle = th.pad[2];
                    g.lineWidth = Math.max(1.0, 1.4 * it.k);
                    g.stroke();

                    g.strokeStyle = 'rgba(215, 255, 230, 0.22)';
                    g.lineWidth = Math.max(0.7, 0.95 * it.k);
                    g.beginPath();
                    for (let p = 2; p < pts.length - 2; p += 4) {
                        g.moveTo(it.cx, it.cy);
                        const mx = (it.cx + pts[p].x) * 0.5;
                        const my = (it.cy + pts[p].y) * 0.5 - 1.8 * it.k;
                        g.quadraticCurveTo(mx, my, lerp(it.cx, pts[p].x, 0.92), lerp(it.cy, pts[p].y, 0.92));
                    }
                    g.stroke();
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
                        // Bóng phản chiếu dưới mặt nước: hấp thụ màu nước tối (dùng màu LUT tính sẵn, không gọi mixHex)
                        traceHeroPetalPath(g, it);
                        g.fillStyle = shadeLUT.reflMid;
                        g.fill();
                        continue;
                    }

                    g.globalAlpha = 1.0;

                    // Bóng đổ lớp cánh trên xuống lớp cánh dưới (Inter-petal 3D Drop Shadow)
                    if (it.li > 0 && (sc.quality || it.li <= 2)) {
                        g.save();
                        g.translate(0, 3.4 * it.k);
                        traceHeroPetalPath(g, it);
                        g.fillStyle = 'rgba(10, 1, 6, 0.34)';
                        g.fill();
                        g.restore();
                    }

                    // Trace đường bao B-Spline của cánh hoa 1 LẦN DUY NHẤT cho cả Undercoat, Gradient chính, Lateral Shading và 2 lớp Viền!
                    traceHeroPetalPath(g, it);

                    // Lớp lót sắc tố đặc 100% (Solid Undercoat) đảm bảo cánh hoa có độ dày vật lý tuyệt đối, không bao giờ nhìn xuyên thấu
                    g.fillStyle = pt.base;
                    g.fill();

                    // 1. Gradient dọc từ gốc cánh (Ambient Occlusion sâu) ra tới đỉnh cánh (Tra bảng LUT thay vì gọi mixHex)
                    const pg = g.createLinearGradient(it.p0x, it.p0y, it.p3x, it.p3y);
                    if (it.isFrontFace) {
                        const aoStop = clamp01(0.18 + (1 - it.uOpen) * 0.14 + it.ld * 0.08);
                        const lIdx = Math.min(shadeLUT.steps, Math.max(0, Math.round(it.lightVal * shadeLUT.steps)));
                        pg.addColorStop(0.00, pt.ao);
                        pg.addColorStop(aoStop, shadeLUT.c1[lIdx]);
                        pg.addColorStop(0.62, shadeLUT.c2[lIdx]);
                        pg.addColorStop(0.90, shadeLUT.c3[lIdx]);
                        pg.addColorStop(1.00, pt.rim);
                    } else {
                        pg.addColorStop(0.00, pt.backAo);
                        pg.addColorStop(0.48, pt.backBase);
                        pg.addColorStop(0.88, pt.backTip);
                        pg.addColorStop(1.00, pt.tip);
                    }
                    g.fillStyle = pg;
                    g.fill();

                    // 2. Đổ bóng chiều sâu ngang (Lateral 3D Cup Curvature Shading) — tô trực tiếp trên path hiện hành, KHÔNG dùng g.clip() gây nghẽn GPU!
                    const latGrad = g.createLinearGradient(it.p2lx, it.p2ly, it.p4rx, it.p4ry);
                    const leftBright = it.sideLight > 0;
                    latGrad.addColorStop(0.00, leftBright ? 'rgba(255,235,242,0.14)' : 'rgba(16,1,9,0.32)');
                    latGrad.addColorStop(0.50, 'rgba(0,0,0,0)');
                    latGrad.addColorStop(1.00, leftBright ? 'rgba(16,1,9,0.32)' : 'rgba(255,235,242,0.14)');
                    g.fillStyle = latGrad;
                    g.fill();

                    // 3. Viền khối tối (Botanical Edge Contour) + Viền bắt sáng Fresnel dọc mép cánh (tận dụng ngay path đang mở!)
                    g.strokeStyle = 'rgba(28, 2, 14, 0.34)';
                    g.lineWidth = Math.max(0.9, 1.5 * it.k);
                    g.stroke();

                    if (sc.quality || it.li <= 1) {
                        const rimGrad = g.createLinearGradient(it.p0x, it.p0y, it.p3x, it.p3y);
                        rimGrad.addColorStop(0.00, 'rgba(255, 255, 255, 0)');
                        rimGrad.addColorStop(0.55, 'rgba(255, 240, 245, 0.05)');
                        rimGrad.addColorStop(0.84, it.isFrontFace ? 'rgba(255, 240, 245, 0.24)' : 'rgba(255, 225, 215, 0.14)');
                        rimGrad.addColorStop(1.00, it.isFrontFace ? 'rgba(255, 245, 248, 0.46)' : 'rgba(255, 225, 215, 0.26)');
                        g.strokeStyle = rimGrad;
                        g.lineWidth = Math.max(0.65, 1.05 * it.k);
                        g.stroke();
                    }

                    // 4. Vân lụa hữu cơ uốn cong mềm theo lòng cánh (Gộp toàn bộ 5 đường vân vào 1 lệnh beginPath/stroke duy nhất!)
                    if (sc.quality || it.li <= 1) {
                        g.strokeStyle = `rgba(${pt.vein}, 0.14)`;
                        g.lineWidth = Math.max(0.5, 0.85 * it.k);
                        g.beginPath();
                        const vMax = sc.quality ? 2 : 1;
                        for (let v = -vMax; v <= vMax; v++) {
                            const vf = v * 0.28;
                            const absVf = Math.abs(vf);
                            const cx = lerp(it.p6x, vf < 0 ? it.p2lx : it.p4rx, absVf);
                            const cy = lerp(it.p6y, vf < 0 ? it.p2ly : it.p4ry, absVf);
                            const ex = lerp(it.p3x, vf < 0 ? it.p2x : it.p4x, absVf * 0.85);
                            const ey = lerp(it.p3y, vf < 0 ? it.p2y : it.p4y, absVf * 0.85);
                            g.moveTo(it.p0x, it.p0y);
                            g.quadraticCurveTo(cx, cy, ex, ey);
                        }
                        g.stroke();
                    }

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
                    // Quầng sáng hoàng kim ấm áp toả ra từ tâm đài nhụy, ấm lên dịu dàng khi nhị hoa ngân rung kết tinh Lõi Thư
                    const vibBoost = it.vib || 0;
                    const haloR = Math.max(8, it.r * (2.15 + 0.24 * vibBoost));
                    const hg = g.createRadialGradient(it.x, it.y, 1, it.x, it.y, haloR);
                    hg.addColorStop(0.0, `rgba(255, 250, 212, ${(0.64 + 0.12 * vibBoost).toFixed(3)})`);
                    hg.addColorStop(0.45, `rgba(245, 190, 66, ${(0.30 + 0.10 * vibBoost).toFixed(3)})`);
                    hg.addColorStop(1.0, 'rgba(45, 2, 18, 0)');
                    g.fillStyle = hg;
                    g.beginPath();
                    g.arc(it.x, it.y, haloR, 0, TAU);
                    g.fill();

                    const rg = g.createRadialGradient(it.x, it.y, 1, it.x, it.y, Math.max(4, it.r * 1.38));
                    rg.addColorStop(0.0, '#fffef4');
                    rg.addColorStop(0.45, '#fbd36b');
                    rg.addColorStop(0.78, th.accent);
                    rg.addColorStop(1.0, 'rgba(45, 2, 18, 0)');
                    g.fillStyle = rg;
                    g.beginPath();
                    g.arc(it.x, it.y, Math.max(4, it.r * 1.38), 0, TAU);
                    g.fill();
                    continue;
                }

                if (it.kind === 'stamen') {
                    const vib = it.vib || 0;
                    const vibP = it.vibPulse || 0;
                    const sg = g.createLinearGradient(it.bx, it.by, it.tx, it.ty);
                    sg.addColorStop(0.0, th.petal.ao);
                    sg.addColorStop(clamp01(0.38 - vib * 0.08 * vibP), '#e8a835');
                    sg.addColorStop(0.82, '#f9d86c');
                    sg.addColorStop(1.0, '#fffbe8');
                    g.strokeStyle = sg;
                    g.lineWidth = Math.max(0.95, (1.75 - it.ring * 0.24 + vib * 0.16 * vibP) * it.k);
                    g.beginPath();
                    g.moveTo(it.bx, it.by);
                    g.quadraticCurveTo(it.mx, it.my, it.tx, it.ty);
                    g.stroke();

                    if (th.center === 'pearls') {
                        const pr = Math.max(3.6, (7.4 - it.ring * 1.1) * it.k * (1 + vib * 0.10 * vibP));
                        g.drawImage(S.pearl, it.tx - pr, it.ty - pr, pr * 2, pr * 2);
                    } else {
                        // Hạt bao phấn vàng 24K 3 lớp (Quầng phấn dịu + Thân hạt nhị vàng ròng + Điểm bắt sáng ngọc)
                        const ar = Math.max(2.0, (3.45 - it.ring * 0.38) * it.k * (1 + vib * (0.06 + 0.09 * vibP)));
                        g.fillStyle = `rgba(248, 194, 58, ${(0.34 + 0.18 * vib * vibP).toFixed(3)})`;
                        g.beginPath();
                        g.arc(it.tx, it.ty, ar * (1.42 + 0.18 * vib * vibP), 0, TAU);
                        g.fill();

                        g.fillStyle = vib > 0.05 ? '#fbd65c' : '#f4c242';
                        g.beginPath();
                        g.arc(it.tx, it.ty, ar, 0, TAU);
                        g.fill();

                        g.fillStyle = '#fffef4';
                        g.beginPath();
                        g.arc(it.tx - ar * 0.20, it.ty - ar * 0.22, ar * 0.54, 0, TAU);
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

            // 2. Hạt phấn hoa hoàng kim bung toả vật lý khi nhụy hoa thức tỉnh (tau >= T.HEART - 0.22) và lơ lửng liên tục
            const dtPollenRaw = tau - (T.HEART - 0.22);
            if (dtPollenRaw > 0) {
                for (let i = 0; i < pollenParticles.length; i++) {
                    const pp = pollenParticles[i];
                    const dtPollen = dtPollenRaw < 2.35 ? dtPollenRaw : 1.15 + ((dtPollenRaw - 1.15 + i * 0.17) % 1.2);
                    const dragT = (1 - Math.exp(-dtPollen * 2.2)) / 2.2;
                    const swirl = dtPollenRaw * pp.spin;
                    const rx = pp.vx * dragT + Math.cos(swirl + pp.ph) * 8 * dtPollen;
                    const rz = pp.vz * dragT + Math.sin(swirl + pp.ph) * 8 * dtPollen;
                    const ry = hs.H + 14 + pp.vy * dragT + 14 * dtPollen;
                    if (!project(hs.sway + rx, ry, rz, Q)) continue;
                    const fadeP = (dtPollenRaw < 2.35 ? (1 - dtPollenRaw / 2.8) : 0.72) * (0.65 + 0.35 * Math.sin(sc.clock * 5 + pp.ph));
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
        function evalButterflyPos3D(bf, age, hs, out) {
            const lift = 1 - Math.exp(-age * 0.55);
            const flapBob = Math.sin(age * bf.flapSpd + bf.fp) * 1.8;
            if (bf.fromHeart) {
                // Bướm từ nhụy hoa bay toả nhẹ nhàng ra không gian theo đường lượn chữ S mềm mại (không xoáy vòng lốc cuốn)
                const az = bf.az0 + Math.sin(age * 0.72 + bf.ph) * 0.28 + age * 0.14 * bf.dir;
                const r = 16 + lift * bf.rad + age * 22;
                out.x = hs.sway + Math.cos(az) * r;
                out.z = Math.sin(az) * r;
                out.y = hs.H + 18 + lift * bf.h + Math.sin(age * 1.65 + bf.ph) * 8 + flapBob;
            } else {
                // Bướm trong vườn hoa mặt hồ bay lượn tự nhiên theo hướng riêng (vx, vz) kết hợp sóng lượn nhẹ
                const weave = Math.sin(age * 0.88 + bf.ph) * 28;
                const perpX = -bf.vz / 32, perpZ = bf.vx / 32;
                out.x = bf.ox + bf.vx * age + perpX * weave;
                out.z = bf.oz + bf.vz * age + perpZ * weave;
                out.y = 14 + lift * bf.h + Math.sin(age * 1.55 + bf.ph) * 9 + flapBob;
            }
        }

        function drawButterfly3D(g, x, y, k, size, flapPhase, dxScr, dyScr, alpha) {
            const s = size * k;
            if (s < 2 || alpha <= 0.02) return;
            // Nhịp đập cánh sinh học mượt mà (nhịp vỗ xuống nhanh, lướt mở cánh êm, không dùng abs(cos) giật góc)
            const wave = Math.sin(flapPhase) + 0.22 * Math.cos(2 * flapPhase);
            const wingOpen = 0.24 + 0.76 * (0.5 + 0.5 * wave);
            const wScale = s / 54;

            // Xoay đầu và thân bướm hướng chuẩn xác theo vector vận tốc bay trên màn hình (không bao giờ đập cánh bay ngang!)
            const headingAng = Math.atan2(dxScr, Math.max(3.5, -dyScr * 0.9 + Math.hypot(dxScr, dyScr) * 0.32));
            const bank = Math.sin(headingAng);

            g.save();
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = alpha;
            g.translate(x, y - wave * 1.6 * k);
            g.rotate(headingAng);

            drawAdditive(g, S.softAccent, 0, 0, s * 2.5, s * 2.5, 0.22 * alpha);

            for (let side = -1; side <= 1; side += 2) {
                g.save();
                // Phối cảnh 3D khi bướm nghiêng người lượn sang trái/phải
                const perspWing = Math.max(0.18, wingOpen * (1 - 0.16 * side * bank));
                g.scale(side * perspWing, 1);
                g.globalAlpha = 0.94 * alpha;
                g.drawImage(S.butterflyWing, -8 * wScale, -68 * wScale, 96 * wScale, 144 * wScale);
                g.restore();
            }

            // Thân bướm & 2 râu mảnh luôn hướng về phía trước theo chiều bay
            g.fillStyle = '#fff6d6';
            g.beginPath();
            g.ellipse(0, 0, Math.max(0.9, s * 0.065), Math.max(2.2, s * 0.38), 0, 0, TAU);
            g.fill();
            if (s > 6) {
                g.strokeStyle = `rgba(255, 248, 220, ${(0.65 * alpha).toFixed(3)})`;
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
            const dSize = r * (64 / 26);
            g.save();
            g.globalCompositeOperation = 'source-over';
            g.translate(x, y);
            g.rotate(rz);
            const squeeze = Math.max(0.28, Math.abs(Math.cos(rx)));
            g.scale(1, squeeze);
            g.globalAlpha = alpha;
            g.drawImage(S.driftingPetal, -dSize * 0.5, -dSize * 0.5, dSize, dSize);
            g.restore();
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = 1;
        }

        function drawLivingEntities(gW, gF, pass, heroZ, envZ, hs, wake) {
            const tau = sc.tau, clock = sc.clock;
            const liveTau = tau + (sc.postClock || 0);
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
                const age = liveTau - bf.born;
                if (age <= 0) continue;
                evalButterflyPos3D(bf, age, hs, W0);
                if (!project(W0.x, W0.y, W0.z, Q)) continue;
                const isBehind = Q.z >= heroZ;
                if ((pass === 0) !== isBehind) continue;
                evalButterflyPos3D(bf, age + 0.08, hs, W1);
                const hasNext = project(W1.x, W1.y, W1.z, Q2);
                const dxScr = hasNext ? (Q2.x - Q.x) : (bf.dir * 3);
                const dyScr = hasNext ? (Q2.y - Q.y) : -4;
                const bfAlpha = smooth(age / 0.35);
                const target = (pass === 1 && Q.z < envZ) ? gF : gW;
                drawButterfly3D(target, Q.x, Q.y, Q.k, bf.sz, sc.clock * bf.flapSpd + bf.fp, dxScr, dyScr, bfAlpha);
            }
            gW.globalCompositeOperation = 'source-over';
            gW.globalAlpha = 1;
            gF.globalCompositeOperation = 'source-over';
            gF.globalAlpha = 1;
        }

        // =================================================================================
        // 6. ĐẠI CẢNH 4 CÁNH HOA LỚP TRONG GẤP ORIGAMI 3D THÀNH PHONG BÌ & ĐỒNG BỘ DOM 1:1
        // =================================================================================
        // Điểm điều khiển B-Spline của Cánh Hoa (m = 0..10): gốc cánh thon tự nhiên (u = 0.22), bụng cánh bầu tròn đầy (u = 0.48..0.74) và ngọn cánh vươn cong hướng ra ngoài (u = 1.04)
        const U_PET  = [0.00, 0.22, 0.48, 0.74, 0.92, 1.04, 0.92, 0.74, 0.48, 0.22, 0.50];
        const V_PET  = [0.00, -0.72, -1.00, -0.90, -0.44, 0.00, 0.44, 0.90, 1.00, 0.72, 0.00];
        // Điểm điều khiển Vạt Phong Bì: m=2,3,4 và m=6,7,8 thẳng hàng tuyệt đối trên đường chéo u + |v| = 1.00 để cạnh chữ V phẳng căng 100% như SVG DOM!
        const U_FLAP = [0.00, 0.00, 0.035, 0.50, 0.92, 1.00, 0.92, 0.50, 0.035, 0.00, 0.48];
        const V_FLAP = [0.00, -0.985, -0.965, -0.50, -0.08, 0.00, 0.08, 0.50, 0.965, 0.985, 0.00];
        const FOLD_STARTS = [4.62, 4.84, 5.12, 5.42]; // Sau khi Lõi Thư kết tinh xong trên nhị hoa (3.12s -> 4.12s) và 4 cánh hoa tiến tới bao quanh (4.15s -> 4.62s): Vạt Trái -> Vạt Phải -> Vạt Đáy -> Nắp Trên
        const FOLD_DURS   = [0.76, 0.76, 0.74, 0.72];
        const origamiPts = Array.from({ length: 11 }, () => ({ x: 0, y: 0, z: 0, k: 0, v: false }));
        const corePts    = Array.from({ length: 8 },  () => ({ x: 0, y: 0, z: 0, k: 0, v: false }));
        const origamiPathObj = {
            shape: 'camellia',
            p0x: 0, p0y: 0, p1x: 0, p1y: 0, p2lx: 0, p2ly: 0, p2x: 0, p2y: 0,
            tlx: 0, tly: 0, p3x: 0, p3y: 0, trx: 0, try: 0, p4x: 0, p4y: 0,
            p4rx: 0, p4ry: 0, p5x: 0, p5y: 0, p6x: 0, p6y: 0
        };

        function computeEnvelope(tau, hs, vw, vh, envBaseW, idleY, idleRotZ) {
            if (tau < T_CARD_WEAVE) return { visible: false, origamiActive: false, shadowAlpha: 0, depth: 1e9 };
            const lift = easeInOutCubic(clamp01((tau - T.LIFT) / (T.LAND - T.LIFT)));
            // Khi 4 vạt thư vừa gấp khép lại tại tau = 6.02s, phong bì nhún nhẹ xuống đài hoa tạo cảm giác có sức nặng vật lý thật
            const tLock = Math.max(0, tau - 6.02);
            const dropSettle = (tau >= 6.02)
                ? -10.5 * Math.exp(-tLock * 5.2) * Math.sin(tLock * 11.2)
                : 0;
            const envY = hs.H + Math.max(10, finalCrown, hs.crownTop) + 12 + dropSettle + th.hero.envLift * smooth((tau - 6.10) / 0.52);
            const envX = hs.sway * 1.15 * (1 - lift);
            project(envX, envY, 0, P0);
            project(envX - cam.rx * ENV_W * 0.5, envY, -cam.rz * ENV_W * 0.5, P1);
            project(envX + cam.rx * ENV_W * 0.5, envY,  cam.rz * ENV_W * 0.5, P2);
            const cradleW = Math.hypot(P2.x - P1.x, P2.y - P1.y);
            const lockPulse = (tau >= 6.02 && tau < 6.48)
                ? 1 + 0.022 * Math.exp(-tLock * 6.2) * Math.sin(tLock * 14.0)
                : 1;
            const cradleScale = clamp01(cradleW / Math.max(200, envBaseW)) * lockPulse;
            const cradleTx = P0.x - vw * 0.5;
            const cradleTy = P0.y - vh * 0.5;
            const elev = Math.atan2(cam.y - envY, Math.hypot(cam.x, cam.z)) / DEG;
            const cradleRx = Math.max(8, Math.min(54, elev * 0.82));
            const cradleRy = Math.sin(sc.clock * 1.4) * 3.5;
            const cradleRz = -cam.yaw * 10;

            const rotX = lerp(cradleRx, 6, lift);
            const rotY = lerp(cradleRy, 0, lift);
            const rotZ = lerp(cradleRz, idleRotZ || 0, lift);

            // Hệ trục trực chuẩn 3D (E_R, E_U, E_N) của mặt phẳng phong bì tại tâm (envX, envY, 0)
            const rzRad = -rotZ * DEG;
            const rxRad = rotX * DEG;
            const cZ = Math.cos(rzRad), sZ = Math.sin(rzRad);
            const cX = Math.cos(rxRad), sX = Math.sin(rxRad);
            const r1x = cZ * cam.rx - sZ * cam.ux;
            const r1y = -sZ * cam.uy;
            const r1z = cZ * cam.rz - sZ * cam.uz;
            const u1x = sZ * cam.rx + cZ * cam.ux;
            const u1y = cZ * cam.uy;
            const u1z = sZ * cam.rz + cZ * cam.uz;

            const erx = r1x, ery = r1y, erz = r1z;
            const eux = cX * u1x + sX * cam.fx;
            const euy = cX * u1y + sX * cam.fy;
            const euz = cX * u1z + sX * cam.fz;
            const enx = sX * u1x - cX * cam.fx;
            const eny = sX * u1y - cX * cam.fy;
            const enz = sX * u1z - cX * cam.fz;

            // Chỉ bật DOM Envelope khi 4 cánh hoa trên Canvas 3D đã gấp khép 180° thành hình phong bì (tau >= T_ORIGAMI_LOCK = 6.14s)
            const domVisible = tau >= T_ORIGAMI_LOCK;
            const domOpacity = domVisible ? smooth((tau - T_ORIGAMI_LOCK) / 0.26) : 0;
            const shadowAlpha = smooth((tau - 3.30) / 0.65) * (1 - lift * 0.88) * 0.85;

            return {
                visible: domVisible,
                opacity: domOpacity,
                origamiActive: tau >= T_CARD_WEAVE && tau < 6.50,
                shadowAlpha,
                tx: lerp(cradleTx, 0, lift),
                ty: lerp(cradleTy, idleY || 0, lift),
                scale: lerp(cradleScale, 1, lift),
                rotX,
                rotY,
                rotZ,
                depth: lerp(P0.z, 120, lift),
                lift,
                worldX: envX,
                worldY: envY,
                erx, ery, erz,
                eux, euy, euz,
                enx, eny, enz,
                lockPulse
            };
        }

        function evalEnvWorldPoint(env, u, v, w, perspDamp, out) {
            // perspDamp giảm nhẹ độ chênh chiều sâu theo trục nhìn khi vạt thư đã khép phẳng để khớp sub-pixel với CSS perspective(1400px)
            const ux = env.eux - cam.fx * perspDamp * (env.eux * cam.fx + env.euy * cam.fy + env.euz * cam.fz);
            const uy = env.euy - cam.fy * perspDamp * (env.eux * cam.fx + env.euy * cam.fy + env.euz * cam.fz);
            const uz = env.euz - cam.fz * perspDamp * (env.eux * cam.fx + env.euy * cam.fy + env.euz * cam.fz);
            out.x = env.worldX + u * env.erx + v * ux + w * env.enx;
            out.y = env.worldY + u * env.ery + v * uy + w * env.eny;
            out.z = u * env.erz + v * uz + w * env.enz;
        }

        function traceProjectedRoundedRect(g, env, hw, hh, wOff, perspDamp, rFrac) {
            const rx = hw * rFrac, ry = hh * rFrac;
            const coords = [
                [-hw + rx,  hh], [ hw - rx,  hh],
                [ hw,  hh - ry], [ hw, -hh + ry],
                [ hw - rx, -hh], [-hw + rx, -hh],
                [-hw, -hh + ry], [-hw,  hh - ry]
            ];
            for (let i = 0; i < 8; i++) {
                evalEnvWorldPoint(env, coords[i][0], coords[i][1], wOff, perspDamp, W0);
                if (!project(W0.x, W0.y, W0.z, corePts[i])) return false;
            }
            evalEnvWorldPoint(env, -hw,  hh, wOff, perspDamp, W0); project(W0.x, W0.y, W0.z, P0);
            evalEnvWorldPoint(env,  hw,  hh, wOff, perspDamp, W0); project(W0.x, W0.y, W0.z, P1);
            evalEnvWorldPoint(env,  hw, -hh, wOff, perspDamp, W0); project(W0.x, W0.y, W0.z, P2);
            evalEnvWorldPoint(env, -hw, -hh, wOff, perspDamp, W0); project(W0.x, W0.y, W0.z, P3);

            g.beginPath();
            g.moveTo(corePts[0].x, corePts[0].y);
            g.lineTo(corePts[1].x, corePts[1].y);
            g.quadraticCurveTo(P1.x, P1.y, corePts[2].x, corePts[2].y);
            g.lineTo(corePts[3].x, corePts[3].y);
            g.quadraticCurveTo(P2.x, P2.y, corePts[4].x, corePts[4].y);
            g.lineTo(corePts[5].x, corePts[5].y);
            g.quadraticCurveTo(P3.x, P3.y, corePts[6].x, corePts[6].y);
            g.lineTo(corePts[7].x, corePts[7].y);
            g.quadraticCurveTo(P0.x, P0.y, corePts[0].x, corePts[0].y);
            g.closePath();
            return true;
        }

        function drawPetalOrigamiEnvelope3D(gW, gF, tau, hs, env) {
            if (!env.origamiActive || !hs.visible) return;
            const canvasAlpha = 1 - smooth((tau - 6.26) / 0.20);
            if (canvasAlpha <= 0.005) return;

            const themeAttr = th.envTheme || (stageEl && stageEl.getAttribute('data-theme')) || 'emerald';
            const envThemeObj = shadeLUT.origami[themeAttr] || shadeLUT.origami.emerald;
            const pal = envThemeObj.pal;
            const mSteps = envThemeObj.mSteps;

            const hw = ENV_W * 0.5 * env.lockPulse;
            const hh = ENV_H * 0.5 * env.lockPulse;
            const detachP = easeInOutCubic(clamp01((tau - T_ORIGAMI_START) / 0.54));

            gW.save();
            gW.globalCompositeOperation = 'source-over';
            gW.lineJoin = 'round';
            gW.lineCap = 'round';

            // 1. HIỆU ỨNG KẾT TINH TINH TẾ: Các hạt phấn vàng li ti tách nhẹ từ 3 vòng bao phấn đang ngân rung, bay lượn mềm mại lên kết tinh thành Lõi Thư (tau = 3.12s -> 4.30s)
            const weaveAuraFade = smooth((tau - T_CARD_WEAVE) / 0.24) * (1 - smooth((tau - 5.15) / 0.45)) * canvasAlpha;
            const pollenRiseFade = smooth((tau - T_CARD_WEAVE) / 0.20) * (1 - smooth((tau - 4.10) / 0.28)) * canvasAlpha;
            if (weaveAuraFade > 0.01 && project(hs.sway, hs.H + 12 * hs.scale, 0, P0)) {
                const auraW = 126 * P0.k, auraH = 88 * P0.k;
                drawAdditive(gW, S.softAccent, P0.x, P0.y - auraH * 0.18, auraW, auraH, weaveAuraFade * 0.34);

                if (pollenRiseFade > 0.01) {
                    const nPollen = sc.quality ? 20 : 12;
                    for (let f = 0; f < nPollen; f++) {
                        const cyc = ((tau - T_CARD_WEAVE) * 1.38 + f / nPollen) % 1;
                        const a = (f / nPollen) * TAU + sc.clock * 0.45 + (f % 3) * 0.35;
                        const stR = (10.5 + (f % 3) * 5.2) * hs.scale;
                        const sx = hs.sway + Math.cos(a) * stR;
                        const sy = hs.H + (15.5 + (f % 3) * 1.8) * hs.scale;
                        const sz = Math.sin(a) * stR;

                        // Điểm hội tụ mềm trên bề mặt Lõi Thư đang kết tinh từ dưới lên trên
                        const uTarget = Math.cos(a + 0.55) * hw * 0.56 * (0.20 + 0.80 * cyc);
                        const vTarget = lerp(-hh * 0.52, hh * 0.48, cyc) + Math.sin(a * 2.0) * hh * 0.12;
                        evalEnvWorldPoint(env, uTarget, vTarget, 0.20, 0, W2);

                        const mProg = easeInOutCubic(cyc);
                        const swirl = Math.sin(cyc * Math.PI) * 3.2 * hs.scale;
                        const wx = lerp(sx, W2.x, mProg) - Math.sin(a) * swirl;
                        const wy = lerp(sy, W2.y, mProg) + Math.sin(cyc * Math.PI) * 4.8;
                        const wz = lerp(sz, W2.z, mProg) + Math.cos(a) * swirl;

                        if (project(wx, wy, wz, P2)) {
                            const envBell = Math.sin(cyc * Math.PI);
                            const mSz = Math.max(4.5, (10.5 - (f % 3) * 1.5) * P2.k) * envBell;
                            drawAdditive(gW, S.glowFirefly, P2.x, P2.y, mSz, mSz, pollenRiseFade * 0.62);
                            // Hạt nhân phấn vàng 24K nhỏ xinh đồng điệu với đầu hạt nhị hoa
                            const grainR = Math.max(0.9, 1.75 * P2.k) * envBell;
                            gW.globalCompositeOperation = 'source-over';
                            gW.globalAlpha = pollenRiseFade * envBell * 0.85;
                            gW.fillStyle = '#fff6cf';
                            gW.beginPath();
                            gW.arc(P2.x, P2.y, grainR, 0, TAU);
                            gW.fill();
                        }
                    }
                }
                gW.globalCompositeOperation = 'source-over';
                gW.globalAlpha = 1;
            }

            // 2. Lõi Lót Lụa Ngọc Trai (Inner Lining):
            // QUAN TRỌNG: Trong suốt lúc Lõi Thư đang được tạo trên nhị hoa (3.12s -> 4.15s) và lúc 4 cánh hoa bay tới (4.15s -> 4.60s),
            // tuyệt đối KHÔNG vẽ khung lót chữ nhật phía sau để Lõi Thư lơ lửng thuần khiết ngay trên các hạt nhị hoa!
            // Khung lót chỉ mở rộng khi 4 cánh hoa bắt đầu gấp khép vào nhau (tau = 4.64s -> 5.52s).
            const sideFoldProgress = clamp01((tau - 4.64) / 0.88);
            const liningAppear = smooth((tau - 4.48) / 0.30) * canvasAlpha;
            if (liningAppear > 0.01) {
                const perspDamp = 0.45 * sideFoldProgress;
                const lHw = hw * lerp(0.56, 1.00, easeInOutCubic(sideFoldProgress));
                const lHh = hh * lerp(0.56, 1.00, easeInOutCubic(sideFoldProgress));
                const rCorner = lerp(0.42, 0.082, easeInOutCubic(sideFoldProgress));
                const innerLiningAlpha = smooth((tau - 4.52) / 0.34) * canvasAlpha;

                // 2A. Nền lưng & Lót lụa ngọc trai (bo tròn mềm như đài sen khi mới hé, chỉ vuông góc cạnh khi Vạt Trái & Phải gấp vào!)
                if (sideFoldProgress > 0.25 && traceProjectedRoundedRect(gW, env, lHw, lHh, 0, perspDamp, rCorner)) {
                    gW.globalAlpha = innerLiningAlpha * smooth((sideFoldProgress - 0.25) / 0.45);
                    const bg = gW.createLinearGradient(corePts[0].x, corePts[0].y, corePts[4].x, corePts[4].y);
                    bg.addColorStop(0.0, pal.back[0]);
                    bg.addColorStop(0.5, pal.back[1]);
                    bg.addColorStop(1.0, pal.back[2]);
                    gW.fillStyle = bg;
                    gW.fill();
                    gW.strokeStyle = '#f6df8c';
                    gW.lineWidth = Math.max(1.0, 1.8 * corePts[0].k);
                    gW.stroke();
                }

                if (innerLiningAlpha > 0.02 && traceProjectedRoundedRect(gW, env, lHw * 0.95, lHh * 0.93, 0.12, perspDamp, rCorner * 0.85)) {
                    gW.globalAlpha = innerLiningAlpha * (0.65 + 0.35 * sideFoldProgress);
                    const lg = gW.createLinearGradient(corePts[0].x, corePts[0].y, corePts[5].x, corePts[5].y);
                    lg.addColorStop(0.0, pal.lining[0]);
                    lg.addColorStop(0.5, pal.lining[1]);
                    lg.addColorStop(1.0, pal.lining[2]);
                    gW.fillStyle = lg;
                    gW.fill();
                }
            }

            // Hàm nội bộ vẽ tấm Lõi Thư Ước Nguyện Hoàng Gia được kết tinh kỳ diệu ngay trên nhị hoa (tau = 3.16s -> 4.12s), sau đó 4 cánh hoa mới tiến tới!
            function renderSymbolicWishCard3D() {
                const cardVis = smooth((tau - 3.16) / 0.24) * (1 - smooth((tau - 5.92) / 0.22));
                if (cardVis <= 0.02) return;

                // Quá trình kết tinh mượt mà từ tinh hoa nhị hoa (tau = 3.18s -> 3.84s):
                // Lõi thư dâng nhẹ từ đỉnh nhị hoa lên (wCard: -3.2 -> 0.22) và ngưng tụ dần từ đáy thiệp lên đỉnh thiệp
                const cardFormP = clamp01((tau - 3.18) / 0.66);
                const cardFormEase = easeInOutCubic(cardFormP);
                const cardGrow = lerp(0.68, 1.00, cardFormEase);
                const cHw = hw * 0.72 * cardGrow;
                const cHh = hh * 0.68 * cardGrow;
                const wCard = lerp(-3.2, 0.22, cardFormEase);
                const cardPersp = 0.45 * sideFoldProgress;

                // Bóng đổ chiều sâu của tấm thiệp
                if (traceProjectedRoundedRect(gW, env, cHw, cHh, wCard - 0.10, cardPersp, 0.11)) {
                    gW.globalAlpha = canvasAlpha * cardVis * 0.28 * cardFormEase;
                    gW.fillStyle = 'rgba(18, 4, 12, 0.82)';
                    gW.fill();
                }

                // Thân giấy lụa ngọc trai kết tinh mượt mà từ dưới đáy (nơi chạm các hạt nhị hoa) lan dần lên đỉnh thiệp!
                if (traceProjectedRoundedRect(gW, env, cHw, cHh, wCard, cardPersp, 0.11)) {
                    const ck = corePts[0].k;
                    const bodyAlpha = canvasAlpha * cardVis * smooth((tau - 3.20) / 0.42);
                    gW.globalAlpha = bodyAlpha;

                    // corePts[0] là đỉnh trên, corePts[4] là đáy dưới (sát nhị hoa)
                    const cg = gW.createLinearGradient(corePts[4].x, corePts[4].y, corePts[0].x, corePts[0].y);
                    if (cardFormP < 0.98) {
                        const waveStop = clamp01(cardFormEase);
                        const softLead = Math.max(0.02, waveStop - 0.14);
                        const softTail = Math.min(0.99, waveStop + 0.12);
                        cg.addColorStop(0.00, '#fde4ec');
                        cg.addColorStop(softLead, '#fff6ee');
                        cg.addColorStop(clamp01(waveStop), 'rgba(255, 245, 200, 0.90)');
                        cg.addColorStop(softTail, 'rgba(255, 244, 192, 0.18)');
                        cg.addColorStop(1.00, 'rgba(255, 244, 192, 0.02)');
                    } else {
                        cg.addColorStop(0.00, '#fde4ec');
                        cg.addColorStop(0.48, '#fff5ec');
                        cg.addColorStop(1.00, '#fffdf9');
                    }
                    gW.fillStyle = cg;
                    gW.fill();

                    // Viền vàng 24K của tấm thiệp cũng được dệt sáng dần từ đáy lên đỉnh theo cùng gradient
                    const bgStroke = gW.createLinearGradient(corePts[4].x, corePts[4].y, corePts[0].x, corePts[0].y);
                    if (cardFormP < 0.98) {
                        const wS = clamp01(cardFormEase);
                        bgStroke.addColorStop(0.00, '#e5b84b');
                        bgStroke.addColorStop(clamp01(wS), '#fbe48e');
                        bgStroke.addColorStop(Math.min(1.00, wS + 0.10), 'rgba(249, 223, 123, 0.08)');
                        bgStroke.addColorStop(1.00, 'rgba(249, 223, 123, 0)');
                    } else {
                        bgStroke.addColorStop(0.00, '#e5b84b');
                        bgStroke.addColorStop(1.00, '#f3cd65');
                    }
                    gW.strokeStyle = bgStroke;
                    gW.lineWidth = Math.max(0.95, 1.55 * ck);
                    gW.stroke();

                    // Đôi đốm sáng tinh hoa nhỏ nhắn chạy dọc hai mép viền thiệp từ đáy nhị hoa lên đỉnh thiệp (không dùng vạch ngang thô)
                    if (cardFormP > 0.04 && cardFormP < 0.96) {
                        const edgeV = lerp(-cHh * 0.90, cHh * 0.90, cardFormEase);
                        evalEnvWorldPoint(env, -cHw * 0.94, edgeV, wCard + 0.04, cardPersp, W0);
                        evalEnvWorldPoint(env,  cHw * 0.94, edgeV, wCard + 0.04, cardPersp, W2);
                        if (project(W0.x, W0.y, W0.z, P0) && project(W2.x, W2.y, W2.z, P2)) {
                            const edgeGlowA = Math.sin(cardFormP * Math.PI) * canvasAlpha * 0.78;
                            const sparkSz = Math.max(6, 13 * P0.k);
                            drawAdditive(gW, S.glowFirefly, P0.x, P0.y, sparkSz, sparkSz, edgeGlowA);
                            drawAdditive(gW, S.glowFirefly, P2.x, P2.y, sparkSz, sparkSz, edgeGlowA);
                            gW.globalCompositeOperation = 'source-over';
                            gW.globalAlpha = bodyAlpha;
                        }
                    }

                    // Khung viền ép kim 24K bên trong (Inner Filigree Frame) + 4 chấm ngọc góc thiệp
                    const innerFrameAlpha = smooth((tau - 3.42) / 0.34);
                    if (innerFrameAlpha > 0.02 && traceProjectedRoundedRect(gW, env, cHw * 0.86, cHh * 0.82, wCard + 0.02, cardPersp, 0.08)) {
                        gW.globalAlpha = canvasAlpha * cardVis * innerFrameAlpha;
                        gW.strokeStyle = 'rgba(216, 158, 44, 0.78)';
                        gW.lineWidth = Math.max(0.65, 0.95 * ck);
                        gW.stroke();
                        gW.fillStyle = '#e5b84b';
                        const cr = Math.max(1.1, 1.8 * ck);
                        for (let c = 0; c < 8; c += 2) {
                            gW.beginPath();
                            gW.arc(corePts[c].x, corePts[c].y, cr, 0, TAU);
                            gW.fill();
                        }
                    }

                    // Huy hiệu Vương Miện Trái Tim Hoa & Đôi Cánh Hoa Văn Ép Kim tại đỉnh thiệp (v = +0.33 * cHh)
                    const emblemAppear = smooth((tau - 3.52) / 0.28);
                    if (emblemAppear > 0.02) {
                        const crestV = cHh * 0.33;
                        evalEnvWorldPoint(env, 0, crestV, wCard + 0.04, cardPersp, W0);
                        evalEnvWorldPoint(env, -cHw * 0.44 * emblemAppear, crestV - cHh * 0.03, wCard + 0.04, cardPersp, W1);
                        evalEnvWorldPoint(env,  cHw * 0.44 * emblemAppear, crestV - cHh * 0.03, wCard + 0.04, cardPersp, W2);
                        if (project(W0.x, W0.y, W0.z, P0) && project(W1.x, W1.y, W1.z, P1) && project(W2.x, W2.y, W2.z, P2)) {
                            gW.globalAlpha = canvasAlpha * cardVis * emblemAppear;
                            const rEmblem = Math.max(3.6, 7.2 * P0.k * cardGrow * (0.65 + 0.35 * emblemAppear));
                            gW.strokeStyle = 'rgba(216, 158, 44, 0.85)';
                            gW.lineWidth = Math.max(0.75, 1.15 * P0.k);
                            gW.beginPath();
                            gW.moveTo(P1.x, P1.y);
                            gW.quadraticCurveTo(lerp(P1.x, P0.x, 0.55), P0.y - rEmblem * 0.55, P0.x - rEmblem * 1.15, P0.y);
                            gW.moveTo(P2.x, P2.y);
                            gW.quadraticCurveTo(lerp(P2.x, P0.x, 0.55), P0.y - rEmblem * 0.55, P0.x + rEmblem * 1.15, P0.y);
                            gW.stroke();

                            gW.fillStyle = 'rgba(255, 244, 214, 0.94)';
                            gW.strokeStyle = '#d89e2c';
                            gW.lineWidth = Math.max(0.85, 1.3 * P0.k);
                            gW.beginPath();
                            gW.arc(P0.x, P0.y, rEmblem, 0, TAU);
                            gW.fill();
                            gW.stroke();

                            const hsSz = rEmblem * 0.62;
                            const hx = P0.x, hy = P0.y + hsSz * 0.22;
                            gW.fillStyle = pal.topFlap[0];
                            gW.beginPath();
                            gW.moveTo(hx, hy + hsSz * 0.65);
                            gW.bezierCurveTo(hx - hsSz * 1.2, hy + hsSz * 0.1, hx - hsSz * 0.95, hy - hsSz * 0.95, hx, hy - hsSz * 0.35);
                            gW.bezierCurveTo(hx + hsSz * 0.95, hy - hsSz * 0.95, hx + hsSz * 1.2, hy + hsSz * 0.1, hx, hy + hsSz * 0.65);
                            gW.fill();

                            // Chớp sao hoàn tất kết tinh Huy Hiệu Trái Tim trên đỉnh Lõi Thư (tau = 3.62s -> 3.98s)
                            const crestBloom = smooth((tau - 3.60) / 0.14) * (1 - smooth((tau - 3.82) / 0.20));
                            if (crestBloom > 0.02) {
                                const flSz = Math.max(16, 38 * P0.k);
                                drawAdditive(gW, S.flare, P0.x, P0.y, flSz, flSz, crestBloom * 0.85);
                                gW.globalCompositeOperation = 'source-over';
                                gW.globalAlpha = canvasAlpha * cardVis;
                            }
                        }
                    }

                    // 4 Dòng chữ thư pháp ánh kim tự khắc mềm mại từ trái sang phải ngay trên nhị hoa (tau = 3.56s -> 4.08s)
                    for (let ln = 0; ln < 4; ln++) {
                        const writeP = clamp01((tau - (3.56 + ln * 0.09)) / 0.32);
                        if (writeP <= 0.02) continue;
                        const lv = cHh * (0.04 - ln * 0.165);
                        const uStart = ln === 0 ? -cHw * 0.32 : (ln === 3 ? -cHw * 0.48 : -cHw * 0.60);
                        const uFull  = ln === 0 ?  cHw * 0.32 : (ln === 3 ?  cHw * 0.20 : (ln === 1 ? cHw * 0.60 : cHw * 0.52));
                        const uEnd   = lerp(uStart, uFull, easeOutCubic(writeP));
                        const uMid   = (uStart + uEnd) * 0.5;
                        const waveV  = (ln === 0 ? 0.015 : (ln % 2 === 1 ? 0.028 : -0.024)) * cHh;

                        evalEnvWorldPoint(env, uStart, lv, wCard + 0.04, cardPersp, W0);
                        evalEnvWorldPoint(env, uMid, lv + waveV, wCard + 0.04, cardPersp, W1);
                        evalEnvWorldPoint(env, uEnd, lv, wCard + 0.04, cardPersp, W2);
                        if (project(W0.x, W0.y, W0.z, P0) && project(W1.x, W1.y, W1.z, P1) && project(W2.x, W2.y, W2.z, P2)) {
                            gW.globalAlpha = canvasAlpha * cardVis;
                            gW.strokeStyle = ln === 0 ? pal.topFlap[0] : 'rgba(188, 128, 34, 0.88)';
                            gW.lineWidth = Math.max(0.8, (ln === 0 ? 1.65 : 1.20) * P0.k);
                            gW.beginPath();
                            gW.moveTo(P0.x, P0.y);
                            gW.quadraticCurveTo(P1.x, P1.y, P2.x, P2.y);
                            gW.stroke();

                            if (writeP < 0.96) {
                                const nibSz = Math.max(5, 13 * P2.k);
                                drawAdditive(gW, S.glowFirefly, P2.x, P2.y, nibSz, nibSz, cardVis * 0.88);
                                gW.globalCompositeOperation = 'source-over';
                                gW.globalAlpha = canvasAlpha * cardVis;
                            }
                        }
                    }

                    // Con dấu mộc đỏ-vàng tượng trưng ở góc dưới bên phải tấm thiệp (hoàn tất trước khi 4 cánh hoa tách ra lúc 4.15s)
                    const sealAppear = smooth((tau - 3.88) / 0.22);
                    if (sealAppear > 0.02) {
                        evalEnvWorldPoint(env, cHw * 0.42, -cHh * 0.44, wCard + 0.04, cardPersp, W0);
                        if (project(W0.x, W0.y, W0.z, P0)) {
                            gW.globalAlpha = canvasAlpha * cardVis * sealAppear;
                            const sr = Math.max(2.2, 4.2 * P0.k * cardGrow) * sealAppear;
                            gW.fillStyle = pal.topFlap[0];
                            gW.strokeStyle = '#f6df8c';
                            gW.lineWidth = Math.max(0.6, 0.95 * P0.k);
                            gW.beginPath();
                            gW.arc(P0.x, P0.y, sr, 0, TAU);
                            gW.fill();
                            gW.stroke();
                        }
                    }
                }
            }

            // 3. KHI LÕI THƯ ĐÃ ĐƯỢC TẠO XONG TRÊN NHỊ HOA (tau >= T_ORIGAMI_START = 4.15s):
            // Bốn cánh hoa lớp trong cùng mới tách khỏi đài hoa tiến tới bao quanh Lõi Thư với ngọn cánh uốn cong hướng ra ngoài, rồi gấp Origami 3D (Trái -> Phải -> Đáy -> Nắp Trên)
            const pt = th.petal;
            origamiPathObj.shape = 'camellia';

            function renderOrigamiSlot(slot) {
                const op = origamiPetals[slot];
                const foldRaw = clamp01((tau - FOLD_STARTS[slot]) / FOLD_DURS[slot]);
                const foldEase = easeInOutCubic(foldRaw);
                const foldSettle = Math.sin(foldRaw * Math.PI) * 0.035 * smooth((foldRaw - 0.5) / 0.5);
                const foldP = clamp01(foldEase + foldSettle);

                // Khi bắt đầu gấp vào (foldRaw: 0 -> 1), sóng biến hình chạy từ Gốc bản lề (baseMorph) -> Thân cạnh (midMorph) -> Đỉnh chữ V (tipMorph)
                // giúp cánh hoa giữ nguyên dáng cong mềm tự nhiên khi chờ gấp, rồi vuốt thẳng thành vạt thư tam giác khi gập qua góc 90°!
                const baseMorph = smooth(clamp01(foldRaw / 0.48));
                const midMorph  = smooth(clamp01((foldRaw - 0.06) / 0.52));
                const tipMorph  = smooth(clamp01((foldRaw - 0.12) / 0.58));
                const perspDamp = 0.45 * tipMorph;

                // Nhịp thở sinh học & lấy đà mở ngọn cánh hướng ra ngoài ngay trước khi bắt đầu gấp vào
                const preWait = clamp01((FOLD_STARTS[slot] - tau) / 0.55);
                const preAnticipate = Math.sin(clamp01((tau - (FOLD_STARTS[slot] - 0.30)) / 0.30) * Math.PI) * (1 - clamp01(foldRaw * 3.5));
                const preBreathe = Math.sin(sc.clock * 2.8 + slot * 1.4) * 0.035 * preWait;
                const preFoldOpen = preBreathe + preAnticipate * 0.11;

                // Bản lề gốc cánh đặt ngay sát mép ngoài tấm thiệp (0.68 -> 1.00) để trọn vẹn thân & ngọn cánh hoa xoè cong ra ngoài quanh thiệp
                const hingeExpand = lerp(0.68, 1.00, smooth(clamp01(foldRaw / 0.44)));
                let Hu = 0, Hv = 0, Inu = 0, Inv = 0, Tu = 0, Tv = 0, halfSpan = 0, flapReach = 0, apexShiftV = 0;
                let petSpanTarget = 0, petReachTarget = 0;
                if (slot === 0) {
                    Hu = -hw * hingeExpand; Hv = 0; Inu = 1; Inv = 0; Tu = 0; Tv = 1;
                    halfSpan = hh * 0.96; flapReach = hw * 1.058; apexShiftV = -hh * 0.11;
                    petSpanTarget = hh * 0.84; petReachTarget = hw * 0.90;
                } else if (slot === 1) {
                    Hu = hw * hingeExpand; Hv = 0; Inu = -1; Inv = 0; Tu = 0; Tv = -1;
                    halfSpan = hh * 0.96; flapReach = hw * 1.058; apexShiftV = -hh * 0.11;
                    petSpanTarget = hh * 0.84; petReachTarget = hw * 0.90;
                } else if (slot === 2) {
                    Hu = 0; Hv = -hh * hingeExpand; Inu = 0; Inv = 1; Tu = -1; Tv = 0;
                    halfSpan = hw * 0.99; flapReach = hh * 1.11; apexShiftV = 0;
                    petSpanTarget = hw * 0.78; petReachTarget = hh * 1.02;
                } else {
                    Hu = 0; Hv = hh * hingeExpand; Inu = 0; Inv = -1; Tu = 1; Tv = 0;
                    halfSpan = hw * 0.99; flapReach = hh * 1.175; apexShiftV = 0;
                    petSpanTarget = hw * 0.78; petReachTarget = hh * 1.04;
                }

                let allProjected = true;
                for (let m = 0; m < 11; m++) {
                    const uP = U_PET[m], vP = V_PET[m];
                    const uF = U_FLAP[m], vF = V_FLAP[m];
                    const localMorph = (m === 1 || m === 2 || m === 8 || m === 9)
                        ? baseMorph
                        : ((m === 3 || m === 7 || m === 10) ? midMorph : tipMorph);

                    const uClamped = Math.min(1.06, uP);
                    evalHeroPetalPoint(op, hs, Math.min(1.0, uClamped), vP, W1);

                    const shapeProf = (0.18 + 0.82 * Math.sin(Math.pow(Math.min(1, uClamped), 0.56) * Math.PI * 0.88)) * (0.88 + 0.12 * roundness);
                    const petHalfW = petSpanTarget * shapeProf;
                    // Phần vai trên & ngọn cánh mở xoè nhẹ hướng ra ngoài
                    const tipFlareW = 1 + 0.12 * Math.pow(Math.max(0, uClamped - 0.45) / 0.60, 1.5);
                    const petLat = vP * petHalfW * tipFlareW;

                    // Đường cong sinh học 3D của cánh hoa:
                    // - Gốc cánh (uP < 0.45) nâng cao ôm lấy thiệp
                    // - Thân trên & ngọn cánh (uP = 0.48 -> 1.04) uốn cong vươn mạnh hướng ra ngoài (Outward Reflex Curve)!
                    const petalOut = petReachTarget * (0.18 * uClamped + 0.96 * Math.pow(uClamped, 1.78)) * (1 + preFoldOpen);
                    const archUp = Math.sin(Math.min(1.0, uClamped * 0.88) * Math.PI);
                    const tipReflex = Math.pow(Math.max(0, uClamped - 0.34) / 0.70, 1.85);
                    const petalUp = petReachTarget * Math.max(0.06, (0.64 * archUp - 0.24 * tipReflex) * (1 - 0.35 * preFoldOpen));

                    // Lòng cánh khum nhẹ ở gốc và uốn ngửa ra ngoài ở phía ngọn cánh
                    const cupProfile = Math.sin(Math.min(1, uClamped) * Math.PI * 0.85) - 0.55 * tipReflex;
                    const petCup = (vP * vP) * petHalfW * 0.32 * cupProfile;

                    // Quay cực quanh bản lề: gốc cánh dẫn nhịp gấp vào trước, ngọn cánh đang cong hướng ra ngoài uốn mềm theo sau
                    const rPet = Math.hypot(petalOut, petalUp);
                    const angPet = Math.atan2(petalUp, Math.max(0.001, petalOut));
                    const rCurr = lerp(rPet, uF * flapReach, localMorph);
                    const angCurr = lerp(angPet, Math.PI, foldP);
                    const lat = lerp(petLat, vF * halfSpan, localMorph);

                    const inDist = -Math.cos(angCurr) * rCurr;
                    const wDist = Math.max(0, Math.sin(angCurr) * rCurr + petCup * (1 - localMorph) * (1 - foldP)) + (slot + 1) * 0.18;
                    const sideArchV = (slot <= 1 ? (archUp * 0.15 - tipReflex * 0.20) * hh : 0) * (1 - localMorph) * (1 - foldP);
                    const envU = Hu + Inu * inDist + Tu * lat;
                    const envV = Hv + Inv * inDist + Tv * lat + sideArchV + apexShiftV * uF * localMorph;

                    evalEnvWorldPoint(env, envU, envV, wDist, perspDamp, W2);

                    const liftArc = Math.sin(detachP * Math.PI) * (9.5 + slot * 1.2);
                    const wx = lerp(W1.x, W2.x, detachP);
                    const wy = lerp(W1.y, W2.y, detachP) + liftArc;
                    const wz = lerp(W1.z, W2.z, detachP);

                    if (!project(wx, wy, wz, origamiPts[m])) {
                        allProjected = false;
                        break;
                    }
                }
                if (!allProjected) return;

                origamiPathObj.p0x  = origamiPts[0].x;  origamiPathObj.p0y  = origamiPts[0].y;
                origamiPathObj.p1x  = origamiPts[1].x;  origamiPathObj.p1y  = origamiPts[1].y;
                origamiPathObj.p2lx = origamiPts[2].x;  origamiPathObj.p2ly = origamiPts[2].y;
                origamiPathObj.p2x  = origamiPts[3].x;  origamiPathObj.p2y  = origamiPts[3].y;
                origamiPathObj.tlx  = origamiPts[4].x;  origamiPathObj.tly  = origamiPts[4].y;
                origamiPathObj.p3x  = origamiPts[5].x;  origamiPathObj.p3y  = origamiPts[5].y;
                origamiPathObj.trx  = origamiPts[6].x;  origamiPathObj.try  = origamiPts[6].y;
                origamiPathObj.p4x  = origamiPts[7].x;  origamiPathObj.p4y  = origamiPts[7].y;
                origamiPathObj.p4rx = origamiPts[8].x;  origamiPathObj.p4ry = origamiPts[8].y;
                origamiPathObj.p5x  = origamiPts[9].x;  origamiPathObj.p5y  = origamiPts[9].y;
                origamiPathObj.p6x  = origamiPts[10].x; origamiPathObj.p6y  = origamiPts[10].y;
                const kScale = origamiPts[10].k;

                gW.globalAlpha = canvasAlpha;

                // 3A. Bóng đổ 3D của cánh hoa/vạt thư lên lớp lót ngọc trai bên dưới khi đang gấp
                if (foldP > 0.12) {
                    const shDist = (1 - foldP * 0.72) * 6.0 * kScale;
                    const shDy = slot === 3 ? Math.max(2.0 * kScale, shDist) : (slot === 2 ? -Math.max(1.5 * kScale, shDist * 0.7) : shDist * 0.5);
                    gW.save();
                    gW.translate(0, shDy);
                    traceHeroPetalPath(gW, origamiPathObj);
                    gW.fillStyle = `rgba(4, 10, 12, ${(0.16 + 0.18 * foldP).toFixed(3)})`;
                    gW.fill();
                    gW.restore();
                }

                // 3B. Trace đường bao B-Spline của cánh hoa / vạt thư 1 lần duy nhất
                traceHeroPetalPath(gW, origamiPathObj);

                const colorMix = smooth(clamp01((foldP - 0.06) / 0.84));
                const mIdx = Math.min(mSteps, Math.max(0, Math.round(colorMix * mSteps)));
                const cSlot = envThemeObj.slots[slot][mIdx];

                gW.fillStyle = cSlot.s1;
                gW.fill();

                // Gradient khối 3D: khi còn là cánh hoa (colorMix nhỏ), nhấn sáng đỉnh vòm bụng (0.48) và chuyển sắc độ uốn ngửa về phía ngọn (0.78 -> 1.00)
                const pg = gW.createLinearGradient(origamiPathObj.p0x, origamiPathObj.p0y, origamiPathObj.p3x, origamiPathObj.p3y);
                pg.addColorStop(0.00, cSlot.s0);
                pg.addColorStop(0.24, cSlot.s1);
                pg.addColorStop(0.50, colorMix < 0.45 ? cSlot.s3 : cSlot.s2);
                pg.addColorStop(0.78, cSlot.s2);
                pg.addColorStop(0.93, cSlot.s3);
                pg.addColorStop(1.00, cSlot.rim);
                gW.fillStyle = pg;
                gW.fill();

                const latGrad = gW.createLinearGradient(origamiPathObj.p2lx, origamiPathObj.p2ly, origamiPathObj.p4rx, origamiPathObj.p4ry);
                const sheen = Math.sin(foldP * Math.PI) * 0.22 + (1 - colorMix) * 0.12;
                latGrad.addColorStop(0.00, 'rgba(255, 244, 218, 0.14)');
                latGrad.addColorStop(0.50, sheen > 0.02 ? `rgba(255, 248, 220, ${sheen.toFixed(3)})` : 'rgba(0, 0, 0, 0)');
                latGrad.addColorStop(1.00, 'rgba(8, 2, 10, 0.26)');
                gW.fillStyle = latGrad;
                gW.fill();

                // 3D. Viền mép cánh hoa kết tinh thành Viền Lá Vàng 24K (Gold Foil Bevel Seam)
                gW.strokeStyle = cSlot.rim;
                gW.lineWidth = Math.max(0.95, lerp(1.20, 1.85, colorMix) * kScale);
                gW.stroke();

                // 3E. Vân lụa hữu cơ của cánh hoa mờ dần và hoá thành Đường Chỉ Vàng Khâu Nổi (Couture Dashed Gold Stitch)
                const veinAlpha = (1 - colorMix * 0.85) * 0.22 * canvasAlpha;
                if (veinAlpha > 0.02) {
                    gW.strokeStyle = `rgba(${pt.vein}, ${veinAlpha.toFixed(3)})`;
                    gW.lineWidth = Math.max(0.5, 0.85 * kScale);
                    gW.beginPath();
                    for (let v = -1; v <= 1; v++) {
                        const vf = v * 0.34;
                        const absVf = Math.abs(vf);
                        const cx = lerp(origamiPathObj.p6x, vf < 0 ? origamiPathObj.p2lx : origamiPathObj.p4rx, absVf);
                        const cy = lerp(origamiPathObj.p6y, vf < 0 ? origamiPathObj.p2ly : origamiPathObj.p4ry, absVf);
                        const ex = lerp(origamiPathObj.p3x, vf < 0 ? origamiPathObj.p2x : origamiPathObj.p4x, absVf * 0.85);
                        const ey = lerp(origamiPathObj.p3y, vf < 0 ? origamiPathObj.p2y : origamiPathObj.p4y, absVf * 0.85);
                        gW.moveTo(origamiPathObj.p0x, origamiPathObj.p0y);
                        gW.quadraticCurveTo(cx, cy, ex, ey);
                    }
                    gW.stroke();
                }

                if (colorMix > 0.35 && (slot === 2 || slot === 3)) {
                    const stitchAlpha = smooth((colorMix - 0.35) / 0.65) * 0.68 * canvasAlpha;
                    gW.save();
                    gW.strokeStyle = `rgba(248, 225, 142, ${stitchAlpha.toFixed(3)})`;
                    gW.lineWidth = Math.max(0.75, 1.05 * kScale);
                    gW.setLineDash([4.5 * kScale, 3.8 * kScale]);
                    gW.beginPath();
                    gW.moveTo(lerp(origamiPathObj.p1x, origamiPathObj.p6x, 0.10), lerp(origamiPathObj.p1y, origamiPathObj.p6y, 0.10));
                    gW.lineTo(lerp(origamiPathObj.tlx, origamiPathObj.p0x, 0.09), lerp(origamiPathObj.tly, origamiPathObj.p0y, 0.09));
                    gW.quadraticCurveTo(
                        lerp(origamiPathObj.p3x, origamiPathObj.p0x, 0.08),
                        lerp(origamiPathObj.p3y, origamiPathObj.p0y, 0.08),
                        lerp(origamiPathObj.trx, origamiPathObj.p0x, 0.09),
                        lerp(origamiPathObj.try, origamiPathObj.p0y, 0.09)
                    );
                    gW.lineTo(lerp(origamiPathObj.p5x, origamiPathObj.p6x, 0.10), lerp(origamiPathObj.p5y, origamiPathObj.p6y, 0.10));
                    gW.stroke();
                    gW.restore();
                }

                // 3F. Đốm phấn vàng dịu dọc đầu cánh hoa khi đang gấp trên lớp trước (gF)
                const motionGlow = Math.sin(foldRaw * Math.PI) * canvasAlpha;
                if (motionGlow > 0.05) {
                    const spSz = Math.max(8, 18 * kScale);
                    drawAdditive(gF, S.glowFirefly, origamiPathObj.p3x, origamiPathObj.p3y, spSz, spSz, motionGlow * 0.65);
                }
            }

            // Sắp xếp chiều sâu 3D chuẩn xác (Painter's Algorithm):
            // 1. Khi 4 cánh hoa đã tách ra và còn mở ngửa quanh lõi thư (foldRaw < 0.24), vẽ TRƯỚC để gốc cánh lồng mượt dưới mép thiệp.
            if (tau >= T_ORIGAMI_START) {
                for (let slot = 0; slot < 4; slot++) {
                    const foldRaw = clamp01((tau - FOLD_STARTS[slot]) / FOLD_DURS[slot]);
                    const isBehindCard = slot === 3 ? (foldRaw < 0.34) : (foldRaw < 0.24);
                    if (isBehindCard) renderOrigamiSlot(slot);
                }
            }
            // 2. Vẽ Tấm Thiệp Ước Nguyện Hoàng Gia (được dệt kỳ diệu trên nhị hoa từ 3.16s, rồi nằm giữa 4 cánh hoa khi 4 cánh tiến tới lúc 4.15s).
            renderSymbolicWishCard3D();
            // 3. Khi từng cánh hoa dựng qua góc 90° và gập vào trong (foldRaw >= 0.24), vẽ đè lên mặt trước tấm thiệp theo đúng thứ tự (Trái -> Phải -> Đáy -> Nắp Trên).
            if (tau >= T_ORIGAMI_START) {
                for (let slot = 0; slot < 4; slot++) {
                    const foldRaw = clamp01((tau - FOLD_STARTS[slot]) / FOLD_DURS[slot]);
                    const isBehindCard = slot === 3 ? (foldRaw < 0.34) : (foldRaw < 0.24);
                    if (!isBehindCard) renderOrigamiSlot(slot);
                }
            }

            // 4. Ánh sao kết tinh tại đỉnh Nắp Chữ V đúng khoảnh khắc 4 cánh hoa vừa khép kín thành Phong Bì (tau = 6.04s -> 6.42s)
            const lockGlow = smooth((tau - 6.04) / 0.16) * (1 - smooth((tau - 6.32) / 0.20));
            if (lockGlow > 0.01) {
                evalEnvWorldPoint(env, 0, -hh * 0.16, 1.2, 0.45, W0);
                if (project(W0.x, W0.y, W0.z, Q)) {
                    const fw = 52 * Q.k * (0.85 + 0.25 * lockGlow);
                    drawAdditive(gF, S.glowMote, Q.x, Q.y, fw, fw, lockGlow * 0.65);
                    drawAdditive(gF, S.flare, Q.x, Q.y, fw * 1.15, fw * 1.15, lockGlow * 0.78);
                }
            }

            gW.restore();
            gW.globalCompositeOperation = 'source-over';
            gW.globalAlpha = 1;
        }

        function drawEnvContactShadow(g, env, hs) {
            if (!env || env.shadowAlpha <= 0.01) return;
            if (!project(hs.sway, hs.H + 10, 0, Q)) return;
            const w = ENV_W * 1.5 * Q.k, h = w * 0.52;
            g.save();
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = env.shadowAlpha;
            g.drawImage(S.shadow, Q.x - w * 0.5, Q.y - h * 0.5, w, h);
            g.restore();
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = 1;
        }

        // =================================================================================
        // 7. VÒNG LẶP KẾT XUẤT CHÍNH (RENDER FRAME)
        // =================================================================================
        function render(gW, gF, info) {
            const renderStartMs = performance.now();
            const vw = info.vw, vh = info.vh, dpr = info.dpr || 1;
            const envBaseW = info.envW || 340;
            if (vw !== sc.vw || vh !== sc.vh || !sc.M0) rebuildViewCaches(vw, vh);

            const tau = sc.tau, clock = sc.clock;
            const liveTau = tau + (sc.postClock || 0);
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
            prepareGardenFlowers(liveTau);
            const heroZ = project(0, hs.H * 0.5, 0, Q) ? Q.z : 500;
            const env = computeEnvelope(tau, hs, vw, vh, envBaseW, info.idleY, info.idleRotZ);
            const envZ = (env.visible || env.origamiActive) ? env.depth : 1e9;

            // 3. Bóng phản chiếu của Đại Đoá Hoa Chủ Đạo dưới mặt nước
            if (hs.visible) {
                renderHeroFlower3D(gW, hs, true);
            }

            // 4. Sóng nước 3D lan toả trên mặt hồ + Vòng sóng phụ từ các giọt nước văng rơi xuống hồ
            drawWaterRipples3D(gW, liveTau);

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
                const plumeA = 0.28 * smooth((tau - 2.65) / 0.7) * (1 - 0.45 * smooth((tau - 6.6) / 0.8));
                if (plumeA > 0.01) {
                    const pw = 290 * Q.k, ph = 320 * Q.k;
                    drawAdditive(gW, S.plume, Q.x, Q.y - ph * 0.28, pw, ph, plumeA);
                }
            }

            // 9. Đại Đoá Hoa Chủ Đạo 3D (Thân Bezier liền mạch, Lá, Đài hoa, Cánh cong Bezier 3D đặc 100%, Sương mai, Nhụy vàng 3D)
            if (hs.visible) {
                renderHeroFlower3D(gW, hs, false);
                drawBloomDropsAndPollen3D(gW, liveTau, hs);
            }

            // 10. Bóng tiếp xúc vật lý & Đại Cảnh 4 Cánh Hoa Lớp Trong Cùng Gấp Origami 3D Thành Phong Bì
            if (env.shadowAlpha > 0.01) {
                drawEnvContactShadow(gW, env, hs);
            }
            if (env.origamiActive) {
                drawPetalOrigamiEnvelope3D(gW, gF, tau, hs, env);
            }

            // 11. Các đoá hoa trong vườn ở phía gần ống kính hơn Đại Đoá Hoa Chủ Đạo
            for (; gi < ground.length; gi++) {
                if (ground[gi].vis) drawGardenFlower3D(gW, ground[gi]);
            }

            // 12. Hạt phấn hoa ánh kim bung nhẹ quanh mép phong bì lúc 4 vạt thư vừa gấp khép lại trên đài hoa
            if (hs.visible && tau >= 6.00) {
                const bt = (tau - 6.00) / 0.68;
                if (bt > 0 && bt < 1) {
                    for (let i = 0; i < burst.length; i++) {
                        const b = burst[i];
                        const d = 42 + 68 * b.d * easeOutCubic(bt);
                        if (!project(b.dx * d, env.worldY + b.dy * d * 0.45, b.dz * d, Q2)) continue;
                        const w = 16 * Q2.k * (1 - bt * 0.4);
                        drawAdditive(gW, S.glowFirefly, Q2.x, Q2.y, w, w, (1 - bt) * 0.72);
                    }
                }
            }

            // 13. Sinh vật bay phía trước hoa
            drawLivingEntities(gW, gF, 1, heroZ, envZ, hs, wake);

            // 14. Vệt cột sáng nghiêng chuẩn xác theo phương rơi của vì tinh tú tại khoảnh khắc chạm mặt hồ (tau = 1.60s)
            const pillarA = smooth((tau - 1.585) / 0.03) * (1 - smooth((tau - 1.62) / 0.42));
            if (pillarA > 0.01 && project(0, 0, 0, Q)) {
                bez(0.68, Q2);
                const skyAngle = project(Q2.x, Q2.y, Q2.z, P0)
                    ? Math.atan2(P0.x - Q.x, Math.max(8, Q.y - P0.y))
                    : 0.38;
                const reflAngle = project(Q2.x, -Q2.y, Q2.z, P1)
                    ? Math.atan2(P1.x - Q.x, Q.y - P1.y)
                    : (Math.PI - 0.38);

                gW.save();
                gW.globalCompositeOperation = 'lighter';
                const w = 84 * Q.k, h = 720 * Q.k;
                // Vệt sáng trên bầu trời nghiêng đúng theo quỹ đạo sao rơi
                gW.save();
                gW.translate(Q.x, Q.y);
                gW.rotate(skyAngle);
                gW.globalAlpha = pillarA;
                gW.drawImage(S.pillar, -w * 0.5, -h, w, h);
                gW.restore();

                // Vệt sáng phản chiếu dưới mặt ao nghiêng đối xứng chuẩn xác theo góc khúc xạ/phản xạ mặt nước
                const reflH = h * 0.62;
                gW.save();
                gW.translate(Q.x, Q.y);
                gW.rotate(reflAngle);
                gW.globalAlpha = pillarA * 0.40;
                gW.drawImage(S.pillar, -w * 0.52, -reflH, w * 1.04, reflH);
                gW.restore();
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

            // 16. Đốm sáng ước nguyện & đuôi sao băng nghiêng đồng bộ trên trời và dưới mặt ao (tau < 1.62s)
            if (tau < T.IMPACT + 0.02) {
                const p = clamp01((tau - T.FALL) / (T.IMPACT - T.FALL));
                const s = 0.24 * p + 0.76 * Math.pow(p, 2.15);
                for (let j = 0; j < sparks.length; j++) {
                    const pj = (j + 0.5) / sparks.length;
                    const sj = 0.24 * pj + 0.76 * Math.pow(pj, 2.15);
                    const tj = T.FALL + pj * (T.IMPACT - T.FALL);
                    const age = tau - tj;
                    if (age < 0 || age > 0.55) continue;
                    bez(sj, Q2);
                    const sparkY = Q2.y + sparks[j].jy * age - 140 * age * age;
                    if (!project(Q2.x + sparks[j].jx * age * 2.5, sparkY, Q2.z + sparks[j].jz * age * 2.5, Q)) continue;
                    drawAdditive(gW, S.glowMote, Q.x, Q.y, 24 * sparks[j].sz * Q.k, 24 * sparks[j].sz * Q.k, (1 - age / 0.55) * 0.9);
                }
                if (p > 0) {
                    const trailSteps = sc.quality === 2 ? 14 : (sc.quality === 1 ? 11 : 8);
                    for (let i = trailSteps; i >= 1; i--) {
                        const si = s - i * (0.48 / trailSteps) * (0.38 + s * 1.12);
                        if (si < 0) continue;
                        bez(si, Q2);
                        const f = 1 - i / (trailSteps + 1);
                        if (project(Q2.x, Q2.y, Q2.z, Q)) {
                            const w = Math.max(24, 122 * Q.k) * (0.28 + 0.72 * f);
                            drawAdditive(gW, S.glowMote, Q.x, Q.y, w, w, 0.66 * f * f);
                        }
                        // Vệt đuôi sao băng phản chiếu nghiêng tương ứng dưới mặt ao
                        if (project(Q2.x, -Q2.y, Q2.z, Q3)) {
                            const rw = Math.max(18, 96 * Q3.k) * (0.25 + 0.75 * f);
                            drawAdditive(gW, S.glowMote, Q3.x, Q3.y, rw, rw * 0.78, 0.22 * f * f * (1 - veil));
                        }
                    }
                }
                motePos(tau, Q2);
                const sTail = Math.max(0, s - 0.22);
                bez(sTail, Q3);
                if (project(Q2.x, Q2.y, Q2.z, Q)) {
                    const tw = 0.88 + 0.12 * Math.sin(clock * 6);
                    const G = Math.max(78, 152 * Q.k) * tw;
                    const hasTailSky = p > 0.02 && project(Q3.x, Q3.y, Q3.z, P0);
                    const skyTrailAng = hasTailSky
                        ? Math.atan2(P0.x - Q.x, Math.max(6, Q.y - P0.y))
                        : 0.38;

                    if (p > 0.02) {
                        const streakW = Math.max(28, 64 * Q.k);
                        const streakH = Math.max(90, 340 * Q.k) * smooth(p / 0.25);
                        gW.save();
                        gW.globalCompositeOperation = 'lighter';
                        gW.translate(Q.x, Q.y);
                        gW.rotate(skyTrailAng);
                        gW.globalAlpha = 0.58 * smooth(p / 0.18);
                        gW.drawImage(S.pillar, -streakW * 0.5, -streakH, streakW, streakH);
                        gW.restore();
                    }

                    drawAdditive(gW, S.glowMote, Q.x, Q.y, G, G, 1);
                    gW.save();
                    gW.globalCompositeOperation = 'lighter';
                    gW.translate(Q.x, Q.y);
                    gW.rotate(clock * 0.4);
                    gW.globalAlpha = 0.88;
                    gW.drawImage(S.flare, -G * 0.95, -G * 0.95, G * 1.9, G * 1.9);
                    gW.restore();

                    // Phản chiếu của vì tinh tú & vệt sáng dưới mặt ao nghiêng chuẩn xác theo phương rơi 3D (không bao giờ thẳng đứng)
                    if (project(Q2.x, -Q2.y, Q2.z, P1)) {
                        const hasTailRefl = p > 0.02 && project(Q3.x, -Q3.y, Q3.z, P2);
                        const reflTrailAng = hasTailRefl
                            ? Math.atan2(P2.x - P1.x, P1.y - P2.y)
                            : (Math.PI - skyTrailAng);
                        const reflAlpha = 0.38 * (1 - veil);

                        gW.save();
                        gW.globalCompositeOperation = 'lighter';
                        gW.translate(P1.x, P1.y);
                        gW.rotate(reflTrailAng);
                        if (p > 0.02) {
                            const rStreakW = Math.max(24, 56 * P1.k);
                            const rStreakH = Math.max(70, 240 * P1.k) * smooth(p / 0.25);
                            gW.globalAlpha = reflAlpha * 0.72 * smooth(p / 0.18);
                            gW.drawImage(S.pillar, -rStreakW * 0.5, -rStreakH, rStreakW, rStreakH);
                        }
                        gW.globalAlpha = reflAlpha;
                        const rW = G * 0.82, rH = G * (1.15 + p * 0.55);
                        gW.drawImage(S.glowMote, -rW * 0.5, -rH * 0.5, rW, rH);
                        gW.restore();
                    }
                }
                gW.globalCompositeOperation = 'source-over';
                gW.globalAlpha = 1;
            }

            // 17. Lớp trước (canvasFront): Chớp sáng va chạm & Letterbox điện ảnh (Giới hạn bán kính để không gây nghẽn fill-rate GPU ở t=1.60s)
            const flash = sc.impactClock >= 0 && !sc.skipped ? Math.exp(-(clock - sc.impactClock) * 8.2) : 0;
            if (flash > 0.01 || sc.skipFlash > 0.01) {
                gF.save();
                gF.globalCompositeOperation = 'lighter';
                if (flash > 0.01 && project(0, 0, 0, Q)) {
                    const w = Math.min(vw, vh) * 0.92;
                    drawAdditive(gF, S.glowMote, Q.x, Q.y, w, w, flash * 0.72);
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

            const lb = vh * 0.068 * clamp01(smooth(tau / 0.35) - smooth((tau - 6.75) / 0.7));
            if (lb > 0.5) {
                gF.globalCompositeOperation = 'source-over';
                gF.globalAlpha = 1;
                gF.fillStyle = '#040206';
                gF.fillRect(0, 0, vw, lb);
                gF.fillRect(0, vh - lb, vw, lb + 1);
            }

            const renderMs = performance.now() - renderStartMs;
            sc.lastRenderMs = renderMs;
            if (window.DevicePerfGovernor && typeof window.DevicePerfGovernor.reportFrame === 'function') {
                window.DevicePerfGovernor.reportFrame((sc.lastDt || 0.0167) * 1000, renderMs);
            }

            return env;
        }

        function step(dt) {
            dt = Math.min(0.05, Math.max(0, dt));
            sc.lastDt = dt;
            sc.clock += dt;
            sc.frameAvg = sc.frameAvg * 0.88 + dt * 0.12;
            const isUltra = !!(perfProfile && perfProfile.isUltraFlagship);
            // Tầng 3 (Runtime Frame-Time Guardrail): Chỉ hạ bậc trên thiết bị không phải Ultra Flagship nếu hụt khung hình liên tục
            if (!isUltra && sc.clock > 0.45 && sc.quality > 0) {
                const slowDtLimit = 0.026;
                const slowAvgLimit = 0.023;
                const slowCountLimit = 7;
                if (dt > slowDtLimit) sc.slowFrames++;
                else if (sc.slowFrames > 0) sc.slowFrames--;
                if (sc.frameAvg > slowAvgLimit || sc.slowFrames >= slowCountLimit) {
                    sc.quality = Math.max(0, sc.quality - 1);
                    sc.slowFrames = 0;
                    sc.frameAvg = 1 / 60;
                }
            }
            if (sc.tau < T.END) {
                sc.tau = Math.min(T.END, sc.tau + speedAt(sc.tau) * dt);
                if (sc.tau >= T.IMPACT && sc.impactClock < 0) sc.impactClock = sc.clock;
            } else {
                sc.postClock = (sc.postClock || 0) + dt;
            }
            window.CardAudio?.updateWishBloomAudioByTau(sc.tau, sc.skipped);
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
            get quality() { return sc.quality; },
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
        window.CardAudio?.setMotionTheme(motionId);
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
        return new Promise((resolve) => setTimeout(resolve, 240));
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
        getPerfProfile: getDevicePerfProfile,
        prepare(motionId) {
            try { buildThemeSprites(THEMES[motionId] ? motionId : 'bloom'); } catch (e) { console.warn('WishBloom prepare', e); }
        },
        create: createScene,
        beginPrelude,
        endPrelude,
        hasPrelude: () => !!preludeEl
    };
})();
