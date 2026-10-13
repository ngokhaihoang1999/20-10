// ====== TRANG MỞ ĐẦU VẬT LÝ 3D: PHONG BÌ LỤA NGỌC BÍCH + CON DẤU SÁP SIÊU THỰC + 3 THIỆP MẪU XOAY VÒNG 4S ======
(function () {
    const step1El = document.getElementById('step-1');
    const physicalStage = document.getElementById('step1-physical-stage');
    const waxSealBtn = document.getElementById('env-wax-seal');
    const replayEnvBtn = document.getElementById('replay-envelope-btn');

    const fanCard0 = document.getElementById('fan-card-0');
    const fanCard1 = document.getElementById('fan-card-1');
    const fanCard2 = document.getElementById('fan-card-2');

    // Mảng quản lý 3 thẻ DOM đang ở vị trí [Trái, Giữa, Phải]
    let activeFanSlots = [fanCard0, fanCard1, fanCard2];

    let isAnimatingEnvelope = false;
    let currentCenterIndex = 0;
    let fanCycleIntervalId = null;

    // 5 tông màu luân phiên hài hòa quanh sắc Xanh Ngọc Bích chủ đạo
    const THEME_CYCLE = ['emerald', 'blush', 'champagne', 'emerald', 'rosegold', 'lavender'];

    // ====== 1. HIỆU ỨNG PHONG BÌ HIỆN LÊN KỲ DIỆU TRÊN NỀN HOA RƠI (MAGICAL APPEAR) ======
    function spawnMagicalAppearSparkles() {
        if (typeof spawnTouchSparkle !== 'function') return;
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const rx = cx + Math.cos(angle) * 72;
            const ry = cy + Math.sin(angle) * 46;
            setTimeout(() => {
                spawnTouchSparkle(rx, ry, 2);
            }, i * 45);
        }
    }

    function triggerInitialEnvelopeAppear() {
        // 0ms -> 680ms: Chỉ có background hoa rơi, chưa có phong bì
        setTimeout(() => {
            spawnMagicalAppearSparkles();
            step1El.classList.add('env-appeared');

            // Sau khi phong bì hiện lên hoàn tất (~960ms), bật nhịp lơ lửng nhẹ nhàng
            setTimeout(() => {
                if (!step1El.classList.contains('env-flap-open') && !step1El.classList.contains('envelope-opened')) {
                    step1El.classList.add('env-idle-float');
                }
            }, 960);
        }, 680);
    }

    // ====== 2. HOẠT ẢNH VẬT LÝ MỞ PHONG BÌ (CHỈ TÍNH KHI BẤM ĐÚNG VÀO CON DẤU SÁP) ======
    function openPhysicalEnvelope(e) {
        if (e) e.stopPropagation();
        if (isAnimatingEnvelope || step1El.classList.contains('envelope-opened')) return;
        isAnimatingEnvelope = true;

        step1El.classList.remove('env-idle-float');

        // Hiệu ứng bung sao vàng ngay tại vị trí con dấu sáp
        if (typeof spawnTouchSparkle === 'function' && waxSealBtn) {
            const rect = waxSealBtn.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            spawnTouchSparkle(cx, cy, 16);
        }

        // Pha 1 (0ms): Tách dấu sáp & Lật mở nắp phong bì 180 độ (lộ mặt lót kem nhũ vàng bên trong)
        step1El.classList.add('env-flap-open');

        // Đưa nắp phong bì ra lớp sau lá thư ngay khi nắp vừa lật qua góc 90 độ (240ms)
        setTimeout(() => {
            step1El.classList.add('env-flap-behind');
        }, 240);

        // Pha 2 (380ms): Rút tấm thiệp "Tháng 10 Rạng Rỡ" từ trong túi phong bì trượt vút lên trên
        setTimeout(() => {
            step1El.classList.add('env-letter-pull');
            if (typeof triggerCelebrationBurst === 'function') {
                triggerCelebrationBurst();
            }
        }, 380);

        // Pha 3 (960ms): Tấm thiệp vượt lên lớp trước (z-index: 14), hạ xuống giữa màn hình & phóng to 100%
        setTimeout(() => {
            step1El.classList.remove('env-letter-pull');
            step1El.classList.add('envelope-opened');
        }, 960);

        // Hoàn tất mở thư & bắt đầu chu kỳ 4 giây tự động trượt đổi mẫu 3 tấm hình
        setTimeout(() => {
            isAnimatingEnvelope = false;
            startFanAutoCycle();
        }, 1550);
    }

    // ====== 3. HOẠT ẢNH ĐẢO NGƯỢC VẬT LÝ: ĐÚT TẤM THIỆP VÀO LẠI PHONG BÌ & ĐÓNG DẤU SÁP ======
    function closePhysicalEnvelope(e) {
        if (e) e.stopPropagation();
        if (isAnimatingEnvelope || !step1El.classList.contains('envelope-opened')) return;
        isAnimatingEnvelope = true;

        stopFanAutoCycle();

        // Pha R1 (0ms): Hiện lại phong bì đang mở phía dưới; thu nhỏ tấm thiệp & nhấc lên ngang miệng phong bì (giữ ở lớp trước z:14)
        step1El.classList.add('env-letter-front', 'env-letter-pull');
        step1El.classList.remove('envelope-opened');

        // Pha R2 (540ms): Đưa tấm thiệp lùi vào khe giữa Lưng bao thư (z:2) và Túi chữ V (z:6), rồi trượt xuống đáy túi
        setTimeout(() => {
            step1El.classList.remove('env-letter-front');
            step1El.classList.remove('env-letter-pull');
        }, 540);

        // Pha R3 (1080ms): Gập nắp phong bì đóng lại & đóng con dấu sáp vàng trở lại
        setTimeout(() => {
            step1El.classList.remove('env-flap-behind');
            step1El.classList.remove('env-flap-open');

            if (typeof spawnTouchSparkle === 'function' && waxSealBtn) {
                const rect = waxSealBtn.getBoundingClientRect();
                if (rect.width > 0) {
                    spawnTouchSparkle(rect.left + rect.width / 2, rect.top + rect.height / 2, 8);
                }
            }
        }, 1080);

        // Pha R4 (1620ms): Trở về trạng thái phong bì lơ lửng nhẹ nhàng
        setTimeout(() => {
            step1El.classList.add('env-idle-float');
            isAnimatingEnvelope = false;
        }, 1620);
    }

    if (waxSealBtn) {
        waxSealBtn.addEventListener('click', openPhysicalEnvelope);
    }

    // Nếu người dùng bấm vào vùng phong bì nhưng lệch khỏi con dấu sáp -> nháy nhẹ con dấu sáp để hướng dẫn bấm vào sáp
    if (physicalStage) {
        physicalStage.addEventListener('click', (e) => {
            if (isAnimatingEnvelope || step1El.classList.contains('envelope-opened')) return;
            if (!step1El.classList.contains('env-appeared')) return;
            if (waxSealBtn && !waxSealBtn.contains(e.target)) {
                waxSealBtn.classList.remove('seal-attention');
                void waxSealBtn.offsetWidth;
                waxSealBtn.classList.add('seal-attention');
                if (typeof spawnTouchSparkle === 'function') {
                    const rect = waxSealBtn.getBoundingClientRect();
                    spawnTouchSparkle(rect.left + rect.width / 2, rect.top + rect.height / 2, 5);
                }
            }
        });
    }

    if (replayEnvBtn) {
        replayEnvBtn.addEventListener('click', closePhysicalEnvelope);
    }

    // ====== 4. BỘ 6 TRANH MINH HỌA CHÂN DUNG NGHỆ THUẬT CAO CẤP CHO 3 TẤM THIỆP MẪU ======
    function drawLuxuryMuseIllustration(ctx, w, h, styleIdx) {
        ctx.save();
        const variant = styleIdx % 6;

        const palettes = [
            // 0: Ngọc Bích Hoàng Gia & Hoa Sen Trắng
            { top: '#cff0e2', mid: '#f3fcf8', bot: '#9ad8c1', dress1: '#128568', dress2: '#074636', hair: '#1c2f29', flower: '#fff6f8', accent: '#e5b84b' },
            // 1: Vườn Đào Mùa Xuân Phấn Lụa
            { top: '#ffe2ee', mid: '#fff7fa', bot: '#f6bdd3', dress1: '#e05c8b', dress2: '#a82857', hair: '#38222b', flower: '#ffb7c5', accent: '#f4cf6d' },
            // 2: Nắng Thu Vàng Champagne & Hoa Trà
            { top: '#fdefd2', mid: '#fefbf3', bot: '#d9eee4', dress1: '#d19c32', dress2: '#966912', hair: '#2f231c', flower: '#ffffff', accent: '#0f7b5f' },
            // 3: Nàng Thơ Cúc Họa Mi & Lụa Mint
            { top: '#def4eb', mid: '#ffffff', bot: '#c1e6d6', dress1: '#1c9677', dress2: '#0b5c47', hair: '#26332e', flower: '#ffffff', accent: '#f2b73f' },
            // 4: Dạ Khúc Ánh Trăng & Ngọc Trai
            { top: '#d6ece5', mid: '#f5fbf9', bot: '#b0dcd0', dress1: '#0e6b54', dress2: '#063d2f', hair: '#1a2824', flower: '#ffd6e4', accent: '#f7df94' },
            // 5: Hồng Trà Rose-Gold & Hoa Tulip
            { top: '#fde7df', mid: '#fff8f6', bot: '#f4c8ba', dress1: '#c96a5b', dress2: '#8f3d30', hair: '#362320', flower: '#ffe5ec', accent: '#e5b84b' }
        ];
        const pal = palettes[variant];

        // 1. Nền lụa đa tầng
        const bgGrad = ctx.createLinearGradient(0, 0, w * 0.4, h);
        bgGrad.addColorStop(0, pal.top);
        bgGrad.addColorStop(0.52, pal.mid);
        bgGrad.addColorStop(1, pal.bot);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // 2. Vầng hào quang & Đốm sáng Bokeh phía sau nhân vật
        const haloX = w * 0.5;
        const haloY = h * 0.39;
        const haloR = w * 0.42;
        const haloGrad = ctx.createRadialGradient(haloX, haloY, haloR * 0.08, haloX, haloY, haloR);
        haloGrad.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
        haloGrad.addColorStop(0.55, 'rgba(255, 246, 224, 0.55)');
        haloGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(haloX, haloY, haloR, 0, Math.PI * 2);
        ctx.fill();

        const bokehCoords = [
            [0.2, 0.22, 0.07], [0.82, 0.25, 0.085], [0.16, 0.58, 0.06],
            [0.85, 0.62, 0.075], [0.32, 0.14, 0.045], [0.7, 0.16, 0.05]
        ];
        bokehCoords.forEach(([bx, by, br]) => {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.beginPath();
            ctx.arc(w * bx, h * by, w * br, 0, Math.PI * 2);
            ctx.fill();
        });

        // 3. Cành hoa lá trang trí phía sau vai
        ctx.strokeStyle = 'rgba(15, 123, 95, 0.28)';
        ctx.lineWidth = w * 0.006;
        ctx.beginPath();
        ctx.moveTo(w * 0.12, h * 0.72);
        ctx.quadraticCurveTo(w * 0.22, h * 0.42, w * 0.34, h * 0.22);
        ctx.moveTo(w * 0.88, h * 0.72);
        ctx.quadraticCurveTo(w * 0.78, h * 0.42, w * 0.66, h * 0.22);
        ctx.stroke();

        // 4. Vẽ Quý cô thanh lịch (Luxury Editorial Portrait)
        const cx = w * 0.5;
        const cy = h * 0.46;

        // Lớp tóc sau bồng bềnh
        ctx.fillStyle = pal.hair;
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.19, cy - h * 0.12);
        ctx.bezierCurveTo(cx - w * 0.28, cy - h * 0.27, cx + w * 0.28, cy - h * 0.27, cx + w * 0.19, cy - h * 0.12);
        ctx.bezierCurveTo(cx + w * 0.29, cy + h * 0.03, cx + w * 0.24, cy + h * 0.2, cx + w * 0.14, cy + h * 0.26);
        ctx.lineTo(cx - w * 0.14, cy + h * 0.26);
        ctx.bezierCurveTo(cx - w * 0.24, cy + h * 0.2, cx - w * 0.29, cy + h * 0.03, cx - w * 0.19, cy - h * 0.12);
        ctx.closePath();
        ctx.fill();

        // Cổ & Xương quai xanh thanh mảnh
        const skinGrad = ctx.createLinearGradient(cx, cy - h * 0.18, cx, cy + h * 0.16);
        skinGrad.addColorStop(0, '#fff3ef');
        skinGrad.addColorStop(1, '#fce2da');
        ctx.fillStyle = skinGrad;
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.048, cy - h * 0.02);
        ctx.lineTo(cx + w * 0.048, cy - h * 0.02);
        ctx.lineTo(cx + w * 0.062, cy + h * 0.09);
        ctx.lineTo(cx - w * 0.062, cy + h * 0.09);
        ctx.closePath();
        ctx.fill();

        // Đầm lụa / Áo dài cao cấp
        const dressGrad = ctx.createLinearGradient(cx, cy + h * 0.06, cx, h);
        dressGrad.addColorStop(0, pal.dress1);
        dressGrad.addColorStop(1, pal.dress2);
        ctx.fillStyle = dressGrad;
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.28, h * 0.96);
        ctx.quadraticCurveTo(cx - w * 0.23, cy + h * 0.075, cx - w * 0.06, cy + h * 0.075);
        ctx.quadraticCurveTo(cx, cy + h * 0.11, cx + w * 0.06, cy + h * 0.075);
        ctx.quadraticCurveTo(cx + w * 0.23, cy + h * 0.075, cx + w * 0.28, h * 0.96);
        ctx.closePath();
        ctx.fill();

        // Viền cổ áo kim tuyến vàng & chuỗi ngọc trai
        ctx.strokeStyle = pal.accent;
        ctx.lineWidth = w * 0.007;
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.1, cy + h * 0.082);
        ctx.quadraticCurveTo(cx, cy + h * 0.135, cx + w * 0.1, cy + h * 0.082);
        ctx.stroke();

        ctx.fillStyle = '#fffdf7';
        for (let p = -3; p <= 3; p++) {
            const px = cx + p * w * 0.018;
            const py = cy + h * 0.068 + (9 - p * p) * h * 0.0018;
            ctx.beginPath();
            ctx.arc(px, py, w * 0.0065, 0, Math.PI * 2);
            ctx.fill();
        }

        // Khuôn mặt V-line thanh tú
        ctx.fillStyle = skinGrad;
        ctx.beginPath();
        ctx.ellipse(cx, cy - h * 0.098, w * 0.112, h * 0.088, 0, 0, Math.PI * 2);
        ctx.fill();

        // Đôi bông tai ngọc trai
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx - w * 0.112, cy - h * 0.082, w * 0.012, 0, Math.PI * 2);
        ctx.arc(cx + w * 0.112, cy - h * 0.082, w * 0.012, 0, Math.PI * 2);
        ctx.fill();

        // Phấn má hồng tự nhiên
        ctx.fillStyle = 'rgba(238, 112, 148, 0.26)';
        ctx.beginPath();
        ctx.ellipse(cx - w * 0.055, cy - h * 0.085, w * 0.032, h * 0.016, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + w * 0.055, cy - h * 0.085, w * 0.032, h * 0.016, 0, 0, Math.PI * 2);
        ctx.fill();

        // Chân mày & Hàng mi cong
        ctx.strokeStyle = pal.hair;
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(1.3, w * 0.0055);
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.072, cy - h * 0.118);
        ctx.quadraticCurveTo(cx - w * 0.048, cy - h * 0.128, cx - w * 0.022, cy - h * 0.12);
        ctx.moveTo(cx + w * 0.022, cy - h * 0.12);
        ctx.quadraticCurveTo(cx + w * 0.048, cy - h * 0.128, cx + w * 0.072, cy - h * 0.118);
        ctx.stroke();

        ctx.lineWidth = Math.max(1.6, w * 0.007);
        ctx.beginPath();
        ctx.arc(cx - w * 0.046, cy - h * 0.102, w * 0.024, 0.12 * Math.PI, 0.88 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + w * 0.046, cy - h * 0.102, w * 0.024, 0.12 * Math.PI, 0.88 * Math.PI);
        ctx.stroke();

        // Đôi môi hồng
        ctx.fillStyle = '#d94b78';
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.026, cy - h * 0.06);
        ctx.quadraticCurveTo(cx, cy - h * 0.068, cx + w * 0.026, cy - h * 0.06);
        ctx.quadraticCurveTo(cx, cy - h * 0.046, cx - w * 0.026, cy - h * 0.06);
        ctx.fill();

        // Tóc mái bay mềm mại
        ctx.fillStyle = pal.hair;
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.115, cy - h * 0.115);
        ctx.quadraticCurveTo(cx - w * 0.03, cy - h * 0.2, cx + w * 0.115, cy - h * 0.115);
        ctx.quadraticCurveTo(cx + w * 0.06, cy - h * 0.155, cx - w * 0.01, cy - h * 0.15);
        ctx.quadraticCurveTo(cx - w * 0.07, cy - h * 0.15, cx - w * 0.115, cy - h * 0.115);
        ctx.fill();

        // Trâm cài tóc hoa
        ctx.fillStyle = pal.flower;
        ctx.beginPath();
        ctx.arc(cx + w * 0.105, cy - h * 0.145, w * 0.032, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = pal.accent;
        ctx.beginPath();
        ctx.arc(cx + w * 0.105, cy - h * 0.145, w * 0.011, 0, Math.PI * 2);
        ctx.fill();

        // 5. Bó hoa 20/10 rực rỡ phía trước ngực
        const bouquetY = cy + h * 0.24;
        ctx.fillStyle = '#1f8a6d';
        for (let l = -2; l <= 2; l++) {
            ctx.save();
            ctx.translate(cx + l * w * 0.055, bouquetY);
            ctx.rotate(l * 0.35);
            ctx.beginPath();
            ctx.ellipse(0, 0, w * 0.048, h * 0.018, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        const blossomPositions = [
            [-0.09, 0.01, 0.038, '#ffb7c5'],
            [-0.03, -0.015, 0.044, pal.flower],
            [0.035, -0.01, 0.042, '#ffd6e4'],
            [0.09, 0.012, 0.036, pal.flower],
            [0, 0.025, 0.046, '#ffffff']
        ];
        blossomPositions.forEach(([ox, oy, rRatio, fColor]) => {
            const bx = cx + ox * w;
            const by = bouquetY + oy * h;
            const br = rRatio * w;
            ctx.fillStyle = fColor;
            for (let p = 0; p < 5; p++) {
                const a = (p * Math.PI * 2) / 5;
                ctx.beginPath();
                ctx.arc(bx + Math.cos(a) * br * 0.52, by + Math.sin(a) * br * 0.52, br * 0.52, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = pal.accent;
            ctx.beginPath();
            ctx.arc(bx, by, br * 0.26, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    function drawSampleCardOnElement(cardEl, conceptIdx) {
        if (!cardEl) return;
        const canvas = cardEl.querySelector('canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const photoH = Math.floor(h * 0.742);
        const scale = w / 1024;

        const themeKey = THEME_CYCLE[conceptIdx % THEME_CYCLE.length];
        const theme = (typeof COLOR_THEMES !== 'undefined' && COLOR_THEMES[themeKey])
            ? COLOR_THEMES[themeKey]
            : {
                canvasBgStart: '#ffffff',
                canvasBgMid: '#f3fbf7',
                canvasBgEnd: '#ddf4ea',
                borderPrimary: '#2c9678',
                borderSecondary: '#a3dfc8',
                goldAccent: '#e2b049',
                textTop: '#074a3a',
                recipientColor: '#c23868'
            };

        const def = (typeof CONCEPT_DEFS !== 'undefined' && CONCEPT_DEFS[conceptIdx])
            ? CONCEPT_DEFS[conceptIdx]
            : { concept: 'arch', fullLabel: '✨ 01. Vòm Lụa' };

        ctx.clearRect(0, 0, w, h);

        // 1. Nền tổng thể tấm thiệp
        const cardGrad = ctx.createLinearGradient(0, 0, 0, h);
        cardGrad.addColorStop(0, theme.canvasBgStart);
        cardGrad.addColorStop(0.65, theme.canvasBgMid);
        cardGrad.addColorStop(1, theme.canvasBgEnd);
        ctx.fillStyle = cardGrad;
        ctx.fillRect(0, 0, w, h);

        // 2. Cắt clip chính xác theo hình dáng cửa sổ của từng mẫu khung trước khi vẽ chân dung
        ctx.save();
        if (typeof traceConceptPhotoWindow === 'function') {
            ctx.beginPath();
            traceConceptPhotoWindow(ctx, def.concept, w, photoH, scale);
            ctx.clip();
        }
        drawLuxuryMuseIllustration(ctx, w, photoH, conceptIdx);
        ctx.restore();

        // 3. Phủ khung thật từ bộ 20 mẫu Concept của script.js
        if (typeof renderConceptOverlayToCtx === 'function') {
            renderConceptOverlayToCtx(ctx, def.concept, w, photoH, theme, false);
        }

        // 4. Vẽ hộp lời chúc 20/10 sang trọng ở 26% đáy thiệp
        const boxX = Math.floor(w * 0.062);
        const boxY = photoH + Math.floor(h * 0.02);
        const boxW = w - boxX * 2;
        const boxH = h - boxY - Math.floor(h * 0.028);

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
        ctx.strokeStyle = theme.borderPrimary;
        ctx.lineWidth = Math.max(1.4, 3.2 * scale);
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 12 * scale * 2.2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = theme.borderSecondary;
        ctx.lineWidth = Math.max(0.9, 1.8 * scale);
        ctx.beginPath();
        ctx.roundRect(boxX + 5, boxY + 5, boxW - 10, boxH - 10, 8 * scale * 2.2);
        ctx.stroke();

        const centerX = w / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = theme.recipientColor;
        ctx.font = `700 ${Math.floor(w * 0.052)}px "Cormorant Garamond", serif`;
        ctx.fillText('Gửi người phụ nữ tuyệt vời 🌸', centerX, boxY + boxH * 0.27);

        ctx.strokeStyle = theme.goldAccent;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(centerX - boxW * 0.24, boxY + boxH * 0.45);
        ctx.lineTo(centerX + boxW * 0.24, boxY + boxH * 0.45);
        ctx.stroke();

        ctx.fillStyle = theme.textTop;
        ctx.font = `600 ${Math.floor(w * 0.04)}px "Cormorant Garamond", serif`;
        ctx.fillText('Chúc bạn luôn rạng rỡ như đóa hoa', centerX, boxY + boxH * 0.64);
        ctx.fillText('và ngập tràn hạnh phúc ngày 20/10!', centerX, boxY + boxH * 0.81);
        ctx.restore();
    }

    function applyFanSlotClasses() {
        const posClasses = ['fan-pos-left', 'fan-pos-center', 'fan-pos-right'];
        activeFanSlots.forEach((el, idx) => {
            if (!el) return;
            el.classList.remove('fan-pos-left', 'fan-pos-center', 'fan-pos-right');
            el.classList.add(posClasses[idx]);
        });
    }

    function initFanShowcaseTrio(centerIdx) {
        const total = (typeof CONCEPT_DEFS !== 'undefined' && CONCEPT_DEFS.length) ? CONCEPT_DEFS.length : 20;
        const leftIdx = (centerIdx + total - 1) % total;
        const rightIdx = (centerIdx + 1) % total;

        drawSampleCardOnElement(activeFanSlots[0], leftIdx);
        drawSampleCardOnElement(activeFanSlots[1], centerIdx);
        drawSampleCardOnElement(activeFanSlots[2], rightIdx);
        applyFanSlotClasses();
    }

    // ====== 5. CHU KỲ TỰ ĐỘNG TUẦN TỰ 4 GIÂY XOAY VÒNG 3 TẤM HÌNH TRONG KHÔNG GIAN 3D ======
    function advanceFanSequentially() {
        const total = (typeof CONCEPT_DEFS !== 'undefined' && CONCEPT_DEFS.length) ? CONCEPT_DEFS.length : 20;
        currentCenterIndex = (currentCenterIndex + 1) % total;
        const upcomingRightIdx = (currentCenterIndex + 1) % total;

        // Xoay vị trí 3 tấm thẻ:
        // - Thẻ đang ở Phải (activeFanSlots[2]) trượt lên Giữa
        // - Thẻ đang ở Giữa (activeFanSlots[1]) trượt sang Trái
        // - Thẻ đang ở Trái (activeFanSlots[0]) vòng ra Phải và vẽ mẫu khung tiếp theo
        const oldLeftCard = activeFanSlots[0];
        const oldCenterCard = activeFanSlots[1];
        const oldRightCard = activeFanSlots[2];

        drawSampleCardOnElement(oldLeftCard, upcomingRightIdx);
        activeFanSlots = [oldCenterCard, oldRightCard, oldLeftCard];
        applyFanSlotClasses();

        if (typeof selectFrameById === 'function') {
            selectFrameById(currentCenterIndex, false);
        }
    }

    function startFanAutoCycle() {
        stopFanAutoCycle();
        fanCycleIntervalId = setInterval(() => {
            if (document.hidden || !step1El.classList.contains('active') || !step1El.classList.contains('envelope-opened')) {
                return;
            }
            advanceFanSequentially();
        }, 4000);
    }

    function stopFanAutoCycle() {
        if (fanCycleIntervalId) {
            clearInterval(fanCycleIntervalId);
            fanCycleIntervalId = null;
        }
    }

    // Khởi tạo ngay khi tải trang
    function initStep1Experience() {
        initFanShowcaseTrio(0);
        triggerInitialEnvelopeAppear();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStep1Experience);
    } else {
        initStep1Experience();
    }
})();
