// ====== TRANG MỞ ĐẦU VẬT LÝ 3D: PHONG BÌ LỤA NGỌC BÍCH + CON DẤU SÁP SIÊU THỰC + 3 THIỆP MẪU CÓ HỒN ======
(function () {
    const step1El = document.getElementById('step-1');
    const physicalStage = document.getElementById('step1-physical-stage');
    const waxSealBtn = document.getElementById('env-wax-seal');
    const replayEnvBtn = document.getElementById('replay-envelope-btn');
    const heroFanShowcase = document.getElementById('hero-fan-showcase');

    const fanCard0 = document.getElementById('fan-card-0');
    const fanCard1 = document.getElementById('fan-card-1');
    const fanCard2 = document.getElementById('fan-card-2');

    // Mảng quản lý 3 thẻ DOM đang ở vị trí [Trái, Giữa, Phải]
    let activeFanSlots = [fanCard0, fanCard1, fanCard2];

    let isAnimatingEnvelope = false;
    let currentCenterIndex = 0;
    let fanCycleIntervalId = null;

    // 5 tông màu chuẩn từ COLOR_THEMES trong script.js (giữ sắc Xanh Ngọc Bích làm chủ đạo)
    const REAL_THEME_KEYS = ['emerald', 'blush', 'champagne', 'emerald', 'rosegold', 'lavender'];

    // Bộ tiêu đề & lời chúc 20/10 giàu cảm xúc cho các tấm thiệp mẫu
    const SAMPLE_RECIPIENTS = [
        'Thương gửi chị em BTLMVN 🌸',
        'Gửi những đóa hoa rạng rỡ 20/10',
        'Thân gửi phái đẹp BTLMVN ✨',
        'Mừng ngày Phụ nữ Việt Nam 20/10',
        'Gửi người phụ nữ tuyệt vời nhất 🌷',
        'Chúc mừng tháng 10 yêu thương 💖'
    ];

    const SAMPLE_WISHES = [
        'Chúc các chị em luôn rạng rỡ như nắng thu, hạnh phúc đong đầy và tỏa sáng theo cách riêng tuyệt vời nhất!',
        'Nhân ngày 20/10, chúc một nửa thế giới luôn xinh đẹp, bình an, được yêu thương và nâng niu mỗi ngày.',
        'Cảm ơn những đóa hoa BTLMVN đã luôn dịu dàng, bản lĩnh và truyền cảm hứng tích cực đến mọi người xung quanh!',
        'Chúc bạn mỗi ngày đều nở nụ cười thật tươi, tâm hồn thanh thản như gió mùa thu và ngập tràn niềm vui mới.',
        'Chúc chị em 20/10 vẹn tròn niềm vui, công việc hanh thông, nhan sắc thăng hạng và luôn ngập tràn yêu thương!',
        'Mong bạn luôn giữ trọn nét duyên dáng, tự tin tỏa sáng và gặt hái thật nhiều điều ngọt ngào trong cuộc sống.'
    ];

    // ====== 1. HIỆU ỨNG PHONG BÌ HIỆN LÊN KỲ DIỆU TRÊN NỀN HOA RƠI (MAGICAL APPEAR) ======
    function spawnMagicalAppearSparkles() {
        if (typeof spawnTouchSparkle !== 'function') return;
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const rx = cx + Math.cos(angle) * 78;
            const ry = cy + Math.sin(angle) * 50;
            setTimeout(() => {
                spawnTouchSparkle(rx, ry, 2);
            }, i * 45);
        }
    }

    function triggerInitialEnvelopeAppear() {
        // 0ms -> 680ms: Chỉ có background hoa rơi, lá thư ẩn tuyệt đối 100%
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

        // Pha 1 (0ms): Tách dấu sáp & Lật mở nắp phong bì 180 độ.
        // Lúc này lá thư mới xuất hiện bên trong lòng túi chữ V (z:4, bị che bởi túi trước z:6 và cắt gọn trong khung bao thư)
        step1El.classList.add('env-flap-open');

        // Đưa nắp phong bì ra lớp sau lá thư (z:3) ngay khi nắp vừa lật qua góc thẳng đứng 90 độ (230ms)
        setTimeout(() => {
            step1El.classList.add('env-flap-behind');
        }, 230);

        // Pha 2 (410ms): Rút tấm thiệp "Tháng 10 Rạng Rỡ" từ trong túi chữ V trượt vút lên trên miệng bao thư
        setTimeout(() => {
            step1El.classList.add('env-letter-pull');
            if (typeof triggerCelebrationBurst === 'function') {
                triggerCelebrationBurst();
            }
        }, 410);

        // Pha 3 (980ms): Khi thiệp đã rút lên khỏi miệng túi, chuyển khe chứa thư lên lớp trước (z-index: 14),
        // mở khóa clip-path toàn màn hình và đưa tấm thiệp về chính giữa màn hình ở tỷ lệ 100%
        setTimeout(() => {
            step1El.classList.remove('env-letter-pull');
            step1El.classList.add('envelope-opened');
        }, 980);

        // Hoàn tất mở thư & bắt đầu chu kỳ 4 giây tự động trượt đổi mẫu 3 tấm hình
        setTimeout(() => {
            isAnimatingEnvelope = false;
            startFanAutoCycle();
        }, 1560);
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

        // Pha R2 (550ms): Đưa tấm thiệp vào khe giữa Lưng bao thư (z:2)/Nắp mở (z:3) và Túi chữ V (z:6), rồi trượt sâu vào lòng túi
        setTimeout(() => {
            step1El.classList.remove('env-letter-front');
            step1El.classList.remove('env-letter-pull');
        }, 550);

        // Pha R3 (1100ms): Ẩn lá thư trong lòng túi, gập nắp phong bì đóng lại & đóng con dấu sáp vàng trở lại
        setTimeout(() => {
            step1El.classList.remove('env-flap-open');

            // Ngay khi nắp gập qua góc 90 độ (sau ~210ms), trả nắp về z-index: 8 đè lên trên túi chữ V trước
            setTimeout(() => {
                step1El.classList.remove('env-flap-behind');
            }, 210);

            if (typeof spawnTouchSparkle === 'function' && waxSealBtn) {
                const rect = waxSealBtn.getBoundingClientRect();
                if (rect.width > 0) {
                    spawnTouchSparkle(rect.left + rect.width / 2, rect.top + rect.height / 2, 8);
                }
            }
        }, 1100);

        // Pha R4 (1660ms): Trở về trạng thái phong bì lơ lửng nhẹ nhàng
        setTimeout(() => {
            step1El.classList.add('env-idle-float');
            isAnimatingEnvelope = false;
        }, 1660);
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

    // ====== 4. TRANH MINH HỌA CHÂN DUNG NÀNG THƠ CÓ HỒN (WATERCOLOR & GOLDEN HOUR PORTRAIT) ======
    function drawSoulfulPetal(ctx, x, y, rx, ry, rot, color, alpha) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, ry);
        ctx.bezierCurveTo(-rx, ry * 0.3, -rx * 0.9, -ry * 0.8, 0, -ry);
        ctx.bezierCurveTo(rx * 0.9, -ry * 0.8, rx, ry * 0.3, 0, ry);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawLuxuryMuseIllustration(ctx, w, h, styleIdx) {
        ctx.save();
        const variant = styleIdx % 6;

        const palettes = [
            // 0: Ngọc Bích Hoàng Gia & Bạch Liên Hoa
            {
                top: '#c3ecdc', mid: '#f2fbf7', bot: '#8ed3b9',
                sun: 'rgba(255, 244, 206, 0.72)',
                dress1: '#128769', dress2: '#074837',
                hair: '#1c2d27', hairHi: '#355449',
                flower: '#fff7fa', petal: '#ffb7c5', accent: '#e5b84b'
            },
            // 1: Vườn Đào Kyoto Mùa Xuân
            {
                top: '#ffdce9', mid: '#fff6fa', bot: '#f4b6ce',
                sun: 'rgba(255, 247, 222, 0.75)',
                dress1: '#de5b8a', dress2: '#9e2451',
                hair: '#341e27', hairHi: '#5e3847',
                flower: '#ffb7c5', petal: '#ffd4e0', accent: '#f0c659'
            },
            // 2: Nắng Thu Vàng Champagne & Hoa Trà Trắng
            {
                top: '#fcedcc', mid: '#fffcf4', bot: '#cfeadd',
                sun: 'rgba(255, 236, 179, 0.8)',
                dress1: '#cf992e', dress2: '#8c610e',
                hair: '#2d2119', hairHi: '#594233',
                flower: '#ffffff', petal: '#ffe4ec', accent: '#0f7b5f'
            },
            // 3: Thảo Nguyên Cúc Họa Mi & Lụa Mint
            {
                top: '#d5f2e6', mid: '#ffffff', bot: '#b5e2ce',
                sun: 'rgba(255, 249, 219, 0.75)',
                dress1: '#1a9474', dress2: '#0a5743',
                hair: '#22302b', hairHi: '#3d574e',
                flower: '#ffffff', petal: '#fff3b8', accent: '#f2b73f'
            },
            // 4: Dạ Khúc Ánh Trăng & Chuỗi Ngọc Trai
            {
                top: '#cde7df', mid: '#f4fbf8', bot: '#a3d5c6',
                sun: 'rgba(255, 245, 214, 0.7)',
                dress1: '#0e6b54', dress2: '#05382b',
                hair: '#182521', hairHi: '#314a42',
                flower: '#ffd6e4', petal: '#ffffff', accent: '#f7df94'
            },
            // 5: Vườn Hồng Pháp Rose-Gold
            {
                top: '#fde2d9', mid: '#fff8f5', bot: '#f2bfb0',
                sun: 'rgba(255, 242, 209, 0.76)',
                dress1: '#c96557', dress2: '#8a392d',
                hair: '#36211e', hairHi: '#5e3b36',
                flower: '#ffe3ec', petal: '#ffb7c5', accent: '#e5b84b'
            }
        ];
        const pal = palettes[variant];

        // 1. Nền màu nước đa tầng
        const bgGrad = ctx.createLinearGradient(0, 0, w * 0.35, h);
        bgGrad.addColorStop(0, pal.top);
        bgGrad.addColorStop(0.5, pal.mid);
        bgGrad.addColorStop(1, pal.bot);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // 2. Luồng nắng thu chiếu xiên (Golden Hour Sunbeams) tạo chiều sâu tâm hồn
        ctx.save();
        const beamGrad = ctx.createLinearGradient(0, 0, w * 0.85, h * 0.75);
        beamGrad.addColorStop(0, pal.sun);
        beamGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.22)');
        beamGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w * 0.65, 0);
        ctx.lineTo(w, h * 0.72);
        ctx.lineTo(w * 0.28, h);
        ctx.lineTo(0, h * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // 3. Vầng hào quang ấm áp phía sau nàng thơ
        const haloX = w * 0.5;
        const haloY = h * 0.41;
        const haloR = w * 0.45;
        const haloGrad = ctx.createRadialGradient(haloX, haloY, haloR * 0.06, haloX, haloY, haloR);
        haloGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
        haloGrad.addColorStop(0.5, 'rgba(255, 245, 222, 0.62)');
        haloGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(haloX, haloY, haloR, 0, Math.PI * 2);
        ctx.fill();

        // Đốm sáng Bokeh lung linh nhiều kích cỡ
        const bokehs = [
            [0.18, 0.2, 0.068, 0.52], [0.83, 0.22, 0.082, 0.48],
            [0.15, 0.55, 0.055, 0.44], [0.86, 0.58, 0.072, 0.5],
            [0.3, 0.13, 0.042, 0.62], [0.72, 0.15, 0.048, 0.58],
            [0.24, 0.76, 0.05, 0.4], [0.78, 0.78, 0.06, 0.42]
        ];
        bokehs.forEach(([bx, by, br, ba]) => {
            const bg = ctx.createRadialGradient(w * bx, h * by, 0, w * bx, h * by, w * br);
            bg.addColorStop(0, `rgba(255, 255, 255, ${ba})`);
            bg.addColorStop(0.7, `rgba(255, 248, 230, ${ba * 0.5})`);
            bg.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = bg;
            ctx.beginPath();
            ctx.arc(w * bx, h * by, w * br, 0, Math.PI * 2);
            ctx.fill();
        });

        // 4. Vòm cành lá & hoa nở phía sau vai nhân vật
        ctx.strokeStyle = 'rgba(15, 123, 95, 0.32)';
        ctx.lineWidth = w * 0.0055;
        ctx.beginPath();
        ctx.moveTo(w * 0.1, h * 0.74);
        ctx.quadraticCurveTo(w * 0.2, h * 0.42, w * 0.34, h * 0.2);
        ctx.moveTo(w * 0.9, h * 0.74);
        ctx.quadraticCurveTo(w * 0.8, h * 0.42, w * 0.66, h * 0.2);
        ctx.stroke();

        const bgLeaves = [
            [0.18, 0.54, -0.7], [0.23, 0.4, -0.5], [0.29, 0.28, -0.35],
            [0.82, 0.54, 0.7], [0.77, 0.4, 0.5], [0.71, 0.28, 0.35]
        ];
        bgLeaves.forEach(([lx, ly, rot]) => {
            drawSoulfulPetal(ctx, w * lx, h * ly, w * 0.022, h * 0.028, rot, '#2b9376', 0.36);
        });

        // 5. Vẽ Nàng Thơ Thanh Lịch (Soulful Editorial Muse)
        const cx = w * 0.5;
        const cy = h * 0.47;
        const headTilt = (variant % 2 === 0 ? -0.035 : 0.035);

        // Suối tóc bồng bềnh phía sau lưng
        const hairGrad = ctx.createLinearGradient(cx, cy - h * 0.26, cx, cy + h * 0.28);
        hairGrad.addColorStop(0, pal.hairHi);
        hairGrad.addColorStop(0.35, pal.hair);
        hairGrad.addColorStop(1, '#101a17');
        ctx.fillStyle = hairGrad;
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.2, cy - h * 0.12);
        ctx.bezierCurveTo(cx - w * 0.3, cy - h * 0.28, cx + w * 0.3, cy - h * 0.28, cx + w * 0.2, cy - h * 0.12);
        ctx.bezierCurveTo(cx + w * 0.31, cy + h * 0.04, cx + w * 0.27, cy + h * 0.22, cx + w * 0.16, cy + h * 0.29);
        ctx.lineTo(cx - w * 0.16, cy + h * 0.29);
        ctx.bezierCurveTo(cx - w * 0.27, cy + h * 0.22, cx - w * 0.31, cy + h * 0.04, cx - w * 0.2, cy - h * 0.12);
        ctx.closePath();
        ctx.fill();

        // Cổ cao & bờ vai mềm mại
        const skinGrad = ctx.createLinearGradient(cx, cy - h * 0.2, cx, cy + h * 0.16);
        skinGrad.addColorStop(0, '#fff5f1');
        skinGrad.addColorStop(0.6, '#fde8e0');
        skinGrad.addColorStop(1, '#f7d5c9');
        ctx.fillStyle = skinGrad;
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.046, cy - h * 0.025);
        ctx.lineTo(cx + w * 0.046, cy - h * 0.025);
        ctx.lineTo(cx + w * 0.064, cy + h * 0.095);
        ctx.lineTo(cx - w * 0.064, cy + h * 0.095);
        ctx.closePath();
        ctx.fill();

        // Tà Áo Dài Lụa / Đầm Haute Couture thướt tha
        const dressGrad = ctx.createLinearGradient(cx - w * 0.2, cy + h * 0.06, cx + w * 0.2, h);
        dressGrad.addColorStop(0, pal.dress1);
        dressGrad.addColorStop(1, pal.dress2);
        ctx.fillStyle = dressGrad;
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.3, h * 0.98);
        ctx.quadraticCurveTo(cx - w * 0.24, cy + h * 0.072, cx - w * 0.064, cy + h * 0.074);
        ctx.quadraticCurveTo(cx, cy + h * 0.112, cx + w * 0.064, cy + h * 0.074);
        ctx.quadraticCurveTo(cx + w * 0.24, cy + h * 0.072, cx + w * 0.3, h * 0.98);
        ctx.closePath();
        ctx.fill();

        // Nếp gấp lụa mềm mại và họa tiết thêu kim tuyến trên áo
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
        ctx.lineWidth = w * 0.004;
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.08, cy + h * 0.11);
        ctx.quadraticCurveTo(cx - w * 0.12, cy + h * 0.28, cx - w * 0.16, h * 0.92);
        ctx.moveTo(cx + w * 0.08, cy + h * 0.11);
        ctx.quadraticCurveTo(cx + w * 0.12, cy + h * 0.28, cx + w * 0.16, h * 0.92);
        ctx.stroke();

        // Viền cổ ngọc trai & dây chuyền ánh kim
        ctx.strokeStyle = pal.accent;
        ctx.lineWidth = w * 0.0065;
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.105, cy + h * 0.082);
        ctx.quadraticCurveTo(cx, cy + h * 0.136, cx + w * 0.105, cy + h * 0.082);
        ctx.stroke();

        ctx.fillStyle = '#fffdf8';
        for (let p = -4; p <= 4; p++) {
            const px = cx + p * w * 0.015;
            const py = cy + h * 0.068 + (16 - p * p) * h * 0.0012;
            ctx.beginPath();
            ctx.arc(px, py, w * 0.0058, 0, Math.PI * 2);
            ctx.fill();
        }

        // Khuôn mặt nghiêng nhẹ duyên dáng
        ctx.save();
        ctx.translate(cx, cy - h * 0.1);
        ctx.rotate(headTilt);

        // Gương mặt trái xoan
        ctx.fillStyle = skinGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.114, h * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();

        // Đôi bông tai ngọc trai ánh kim
        ctx.fillStyle = pal.accent;
        ctx.beginPath();
        ctx.arc(-w * 0.114, h * 0.012, w * 0.008, 0, Math.PI * 2);
        ctx.arc(w * 0.114, h * 0.012, w * 0.008, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-w * 0.114, h * 0.025, w * 0.012, 0, Math.PI * 2);
        ctx.arc(w * 0.114, h * 0.025, w * 0.012, 0, Math.PI * 2);
        ctx.fill();

        // Má hồng ửng nắng tự nhiên
        const blushL = ctx.createRadialGradient(-w * 0.056, h * 0.014, 0, -w * 0.056, h * 0.014, w * 0.038);
        blushL.addColorStop(0, 'rgba(238, 108, 146, 0.34)');
        blushL.addColorStop(1, 'rgba(238, 108, 146, 0)');
        ctx.fillStyle = blushL;
        ctx.beginPath();
        ctx.arc(-w * 0.056, h * 0.014, w * 0.038, 0, Math.PI * 2);
        ctx.fill();

        const blushR = ctx.createRadialGradient(w * 0.056, h * 0.014, 0, w * 0.056, h * 0.014, w * 0.038);
        blushR.addColorStop(0, 'rgba(238, 108, 146, 0.34)');
        blushR.addColorStop(1, 'rgba(238, 108, 146, 0)');
        ctx.fillStyle = blushR;
        ctx.beginPath();
        ctx.arc(w * 0.056, h * 0.014, w * 0.038, 0, Math.PI * 2);
        ctx.fill();

        // Đôi mày lá liễu thanh thoát
        ctx.strokeStyle = pal.hair;
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(1.3, w * 0.0052);
        ctx.beginPath();
        ctx.moveTo(-w * 0.074, -h * 0.02);
        ctx.quadraticCurveTo(-w * 0.048, -h * 0.031, -w * 0.02, -h * 0.021);
        ctx.moveTo(w * 0.02, -h * 0.021);
        ctx.quadraticCurveTo(w * 0.048, -h * 0.031, w * 0.074, -h * 0.02);
        ctx.stroke();

        // Đôi mắt có hồn (nhắm hờ mỉm cười hoặc long lanh ánh sáng)
        if (variant % 2 === 1) {
            // Đôi mắt long lanh có đốm sáng catchlight
            ctx.fillStyle = pal.hair;
            ctx.beginPath();
            ctx.ellipse(-w * 0.046, -h * 0.002, w * 0.015, h * 0.0095, 0, 0, Math.PI * 2);
            ctx.ellipse(w * 0.046, -h * 0.002, w * 0.015, h * 0.0095, 0, 0, Math.PI * 2);
            ctx.fill();

            // Đốm sáng trong mắt (Catchlight)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-w * 0.041, -h * 0.005, w * 0.0048, 0, Math.PI * 2);
            ctx.arc(w * 0.051, -h * 0.005, w * 0.0048, 0, Math.PI * 2);
            ctx.fill();

            // Mi trên cong vút
            ctx.strokeStyle = pal.hair;
            ctx.lineWidth = Math.max(1.6, w * 0.0065);
            ctx.beginPath();
            ctx.arc(-w * 0.046, h * 0.002, w * 0.022, 1.12 * Math.PI, 1.88 * Math.PI);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(w * 0.046, h * 0.002, w * 0.022, 1.12 * Math.PI, 1.88 * Math.PI);
            ctx.stroke();
        } else {
            // Đôi mắt cong hạnh phúc với hàng mi dài
            ctx.strokeStyle = pal.hair;
            ctx.lineWidth = Math.max(1.6, w * 0.0068);
            ctx.beginPath();
            ctx.arc(-w * 0.046, -h * 0.004, w * 0.023, 0.12 * Math.PI, 0.88 * Math.PI);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(w * 0.046, -h * 0.004, w * 0.023, 0.12 * Math.PI, 0.88 * Math.PI);
            ctx.stroke();
        }

        // Sống mũi thanh tú
        ctx.strokeStyle = 'rgba(205, 145, 130, 0.45)';
        ctx.lineWidth = Math.max(1, w * 0.0038);
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.01);
        ctx.quadraticCurveTo(-w * 0.005, h * 0.014, 0, h * 0.019);
        ctx.stroke();

        // Nụ cười rạng rỡ dịu dàng
        ctx.fillStyle = '#d94876';
        ctx.beginPath();
        ctx.moveTo(-w * 0.028, h * 0.038);
        ctx.quadraticCurveTo(0, h * 0.031, w * 0.028, h * 0.038);
        ctx.quadraticCurveTo(0, h * 0.054, -w * 0.028, h * 0.038);
        ctx.fill();

        // Khóe môi mỉm cười tươi tắn
        ctx.strokeStyle = '#b8335e';
        ctx.lineWidth = Math.max(1.1, w * 0.004);
        ctx.beginPath();
        ctx.moveTo(-w * 0.033, h * 0.036);
        ctx.quadraticCurveTo(0, h * 0.046, w * 0.033, h * 0.036);
        ctx.stroke();

        // Tóc mái bay mềm mại ôm gương mặt
        ctx.fillStyle = hairGrad;
        ctx.beginPath();
        ctx.moveTo(-w * 0.118, -h * 0.012);
        ctx.quadraticCurveTo(-w * 0.03, -h * 0.105, w * 0.118, -h * 0.012);
        ctx.quadraticCurveTo(w * 0.06, -h * 0.058, -w * 0.01, -h * 0.052);
        ctx.quadraticCurveTo(-w * 0.072, -h * 0.052, -w * 0.118, -h * 0.012);
        ctx.fill();

        // Cành hoa cài mái tóc duyên dáng
        const hairFlowerX = w * 0.098;
        const hairFlowerY = -h * 0.046;
        for (let p = 0; p < 5; p++) {
            const a = (p * Math.PI * 2) / 5;
            drawSoulfulPetal(
                ctx,
                hairFlowerX + Math.cos(a) * w * 0.016,
                hairFlowerY + Math.sin(a) * w * 0.016,
                w * 0.015,
                w * 0.02,
                a + Math.PI / 2,
                pal.flower,
                0.95
            );
        }
        ctx.fillStyle = pal.accent;
        ctx.beginPath();
        ctx.arc(hairFlowerX, hairFlowerY, w * 0.009, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore(); // Kết thúc vẽ phần đầu nghiêng

        // 6. Bó hoa 20/10 đầy sức sống ôm trước ngực
        const bouquetY = cy + h * 0.24;

        // Giấy gói hoa lụa kem ánh kim
        ctx.fillStyle = 'rgba(255, 250, 242, 0.88)';
        ctx.strokeStyle = pal.accent;
        ctx.lineWidth = w * 0.0045;
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.16, bouquetY - h * 0.01);
        ctx.quadraticCurveTo(cx, bouquetY + h * 0.15, cx + w * 0.16, bouquetY - h * 0.01);
        ctx.quadraticCurveTo(cx, bouquetY + h * 0.05, cx - w * 0.16, bouquetY - h * 0.01);
        ctx.fill();
        ctx.stroke();

        // Lá xanh ngọc đan xen
        for (let l = -3; l <= 3; l++) {
            drawSoulfulPetal(
                ctx,
                cx + l * w * 0.044,
                bouquetY - Math.abs(l) * h * 0.004,
                w * 0.022,
                h * 0.032,
                l * 0.32,
                '#1b876a',
                0.85
            );
        }

        // Những đóa hoa nhiều lớp cánh nở rộ trong bó hoa
        const blossoms = [
            [-0.1, 0.008, 0.04, '#ffb7c5'],
            [-0.048, -0.018, 0.046, pal.flower],
            [0.048, -0.016, 0.045, '#ffd6e4'],
            [0.1, 0.01, 0.039, pal.flower],
            [0, 0.014, 0.052, '#ffffff']
        ];
        blossoms.forEach(([ox, oy, rRatio, fColor]) => {
            const bx = cx + ox * w;
            const by = bouquetY + oy * h;
            const br = rRatio * w;
            for (let p = 0; p < 6; p++) {
                const a = (p * Math.PI * 2) / 6;
                ctx.fillStyle = fColor;
                ctx.beginPath();
                ctx.arc(bx + Math.cos(a) * br * 0.5, by + Math.sin(a) * br * 0.5, br * 0.48, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = pal.accent;
            ctx.beginPath();
            ctx.arc(bx, by, br * 0.25, 0, Math.PI * 2);
            ctx.fill();
        });

        // 7. Cánh hoa anh đào bay lơ lửng ở tiền cảnh (Foreground Petals) tạo chiều sâu sống động
        const fgPetals = [
            [0.14, 0.18, 0.018, 0.026, 0.6],
            [0.86, 0.32, 0.02, 0.028, -0.8],
            [0.2, 0.82, 0.022, 0.03, 1.1],
            [0.82, 0.85, 0.017, 0.025, -0.5]
        ];
        fgPetals.forEach(([px, py, rx, ry, rot]) => {
            drawSoulfulPetal(ctx, w * px, h * py, w * rx, w * ry, rot, pal.petal, 0.78);
        });

        ctx.restore();
    }

    // ====== 5. VẼ THIỆP MẪU CHUẨN 100% BỐ CỤC BƯỚC 3 (KHUNG CONCEPT + CẦU NỐI + HỘP LỜI CHÚC HAUTE COUTURE) ======
    function drawSampleCardOnElement(cardEl, conceptIdx) {
        if (!cardEl) return;
        const canvas = cardEl.querySelector('canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const targetW = canvas.width;   // 420
        const targetH = canvas.height;  // 846
        const scale = targetW / 1024;
        const originH = Math.floor(1526 * scale); // 625
        const textSpaceHeight = targetH - originH; // 221

        const def = (typeof CONCEPT_DEFS !== 'undefined' && CONCEPT_DEFS[conceptIdx])
            ? CONCEPT_DEFS[conceptIdx]
            : { concept: 'arch', fullLabel: '✨ 01. Vòm Lụa' };
        const concept = def.concept || 'arch';

        // Lấy đúng tông màu & kiểu viền hộp lời chúc của mẫu khung từ script.js
        const mappedThemeKey = (typeof CONCEPT_THEME_MAP !== 'undefined' && CONCEPT_THEME_MAP[concept])
            ? CONCEPT_THEME_MAP[concept]
            : REAL_THEME_KEYS[conceptIdx % REAL_THEME_KEYS.length];
        const themeKey = (conceptIdx % 2 === 0) ? 'emerald' : mappedThemeKey;

        const theme = (typeof COLOR_THEMES !== 'undefined' && COLOR_THEMES[themeKey])
            ? COLOR_THEMES[themeKey]
            : (typeof COLOR_THEMES !== 'undefined' ? COLOR_THEMES.emerald : null);

        const borderStyle = (typeof CONCEPT_BORDER_MAP !== 'undefined' && CONCEPT_BORDER_MAP[concept])
            ? CONCEPT_BORDER_MAP[concept]
            : 'sakura';

        ctx.clearRect(0, 0, targetW, targetH);
        if (!theme) return;

        // 1. Nền lụa liền mạch toàn tấm thiệp
        const fullGrad = ctx.createLinearGradient(0, 0, 0, targetH);
        fullGrad.addColorStop(0, theme.canvasBgStart);
        fullGrad.addColorStop(0.5, theme.canvasBgMid);
        fullGrad.addColorStop(1, theme.canvasBgEnd);
        ctx.fillStyle = fullGrad;
        ctx.fillRect(0, 0, targetW, targetH);

        if (typeof drawBottomAmbientDecor === 'function') {
            drawBottomAmbientDecor(ctx, targetW, originH, textSpaceHeight, scale, theme);
        }

        // 2. Cắt cửa sổ ảnh theo đúng hình dáng Concept và vẽ chân dung nàng thơ có hồn
        ctx.save();
        if (typeof traceConceptPhotoWindow === 'function') {
            ctx.beginPath();
            traceConceptPhotoWindow(ctx, concept, targetW, originH, scale);
            ctx.clip();
        }
        drawLuxuryMuseIllustration(ctx, targetW, originH, conceptIdx);
        ctx.restore();

        // 3. Phủ thiết kế khung Concept thật từ script.js
        if (typeof renderConceptOverlayToCtx === 'function') {
            renderConceptOverlayToCtx(ctx, concept, targetW, originH, theme, false);
        }

        // 4. Vẽ Cầu nối trang sức (Ornamental Bridge) & Hộp lời chúc Haute Couture thật của Bước 3
        const marginX = Math.floor(targetW * 0.056);
        const boxX = marginX;
        const boxY = originH + Math.floor(textSpaceHeight * 0.085);
        const boxW = targetW - marginX * 2;
        const boxH = Math.floor(textSpaceHeight * 0.82);
        const radius = Math.floor(targetW * 0.034);

        const recipientLine = SAMPLE_RECIPIENTS[conceptIdx % SAMPLE_RECIPIENTS.length];
        const activeQuote = SAMPLE_WISHES[conceptIdx % SAMPLE_WISHES.length];

        if (typeof drawOrnamentalBridge === 'function') {
            drawOrnamentalBridge(ctx, targetW / 2, originH, boxY, scale, theme, concept);
        }

        if (typeof drawRomanticQuoteBox === 'function') {
            drawRomanticQuoteBox(ctx, boxX, boxY, boxW, boxH, radius, scale, theme, borderStyle, concept);
        }

        if (typeof fitQuoteInBox === 'function' && typeof drawQuoteContent === 'function') {
            const layout = fitQuoteInBox(ctx, activeQuote, recipientLine, boxW, boxH, scale, borderStyle);
            drawQuoteContent(ctx, boxX, boxY, boxW, boxH, layout, theme, scale);
        }
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

    // ====== 6. XOAY VÒNG 3 TẤM THIỆP (TỰ ĐỘNG 4 GIÂY HOẶC CHẠM ĐỂ ĐỔI NHANH NGAY LẬP TỨC) ======
    function advanceFanSequentially() {
        const total = (typeof CONCEPT_DEFS !== 'undefined' && CONCEPT_DEFS.length) ? CONCEPT_DEFS.length : 20;
        currentCenterIndex = (currentCenterIndex + 1) % total;
        const upcomingRightIdx = (currentCenterIndex + 1) % total;

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

    function advanceFanBackward() {
        const total = (typeof CONCEPT_DEFS !== 'undefined' && CONCEPT_DEFS.length) ? CONCEPT_DEFS.length : 20;
        currentCenterIndex = (currentCenterIndex + total - 1) % total;
        const upcomingLeftIdx = (currentCenterIndex + total - 1) % total;

        const oldLeftCard = activeFanSlots[0];
        const oldCenterCard = activeFanSlots[1];
        const oldRightCard = activeFanSlots[2];

        drawSampleCardOnElement(oldRightCard, upcomingLeftIdx);
        activeFanSlots = [oldRightCard, oldLeftCard, oldCenterCard];
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

    // Cho phép người dùng bấm trực tiếp vào bộ 3 tấm thiệp để chuyển nhanh sang thiệp khác ngay lập tức
    if (heroFanShowcase) {
        heroFanShowcase.addEventListener('click', (e) => {
            if (!step1El.classList.contains('envelope-opened')) return;

            const clickedLeft = activeFanSlots[0] && activeFanSlots[0].contains(e.target);
            if (clickedLeft) {
                advanceFanBackward();
            } else {
                advanceFanSequentially();
            }

            // Reset bộ đếm 4 giây để không bị nhảy kép ngay sau khi người dùng vừa bấm
            startFanAutoCycle();

            if (typeof spawnTouchSparkle === 'function') {
                const rect = heroFanShowcase.getBoundingClientRect();
                const sx = e.clientX || (rect.left + rect.width / 2);
                const sy = e.clientY || (rect.top + rect.height / 2);
                spawnTouchSparkle(sx, sy, 7);
            }
        });

        heroFanShowcase.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!step1El.classList.contains('envelope-opened')) return;
                advanceFanSequentially();
                startFanAutoCycle();
            }
        });
    }

    // Khởi tạo ngay khi tải trang
    function initStep1Experience() {
        initFanShowcaseTrio(0);
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
                initFanShowcaseTrio(currentCenterIndex);
            });
        }
        triggerInitialEnvelopeAppear();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStep1Experience);
    } else {
        initStep1Experience();
    }
})();
