// ====== TRANG MỞ ĐẦU WOW: PHONG BÌ LỤA NGỌC BÍCH 3D + 3 THIỆP MẪU XẾP QUẠT + LIVE QUOTE PILL ======
(function () {
    const step1El = document.getElementById('step-1');
    const envelopeStage = document.getElementById('envelope-stage');
    const emeraldEnvelope = document.getElementById('emerald-envelope');
    const waxSeal = document.getElementById('env-wax-seal');
    const replayEnvBtn = document.getElementById('replay-envelope-btn');

    const fanShowcase = document.getElementById('hero-fan-showcase');
    const fanCardsStage = document.getElementById('fan-cards-stage');
    const fanConceptNameEl = document.getElementById('fan-concept-name');
    const canvasLeft = document.getElementById('fan-canvas-left');
    const canvasCenter = document.getElementById('fan-canvas-center');
    const canvasRight = document.getElementById('fan-canvas-right');

    const liveQuotePill = document.getElementById('live-quote-pill');
    const liveQuoteTextEl = document.getElementById('step1-live-quote');

    let isEnvelopeOpening = false;
    let currentCenterIndex = 0;
    let quoteIntervalId = null;

    // 3 bảng màu phối hài hòa quanh trục Xanh Ngọc Bích chủ đạo cho 3 tấm thiệp mẫu
    const FAN_SLOT_THEMES = ['blush', 'emerald', 'champagne'];

    // ====== 1. NGHI THỨC MỞ PHONG BÌ LỤA NGỌC BÍCH & ẤN SÁP VÀNG 3D ======
    function openEmeraldEnvelope(e) {
        if (isEnvelopeOpening || step1El.classList.contains('envelope-opened')) return;
        isEnvelopeOpening = true;

        // Hiệu ứng bung sao vàng & hoa đào ngay tại con dấu sáp
        if (typeof spawnTouchSparkle === 'function') {
            let cx = window.innerWidth / 2;
            let cy = window.innerHeight / 2;
            if (waxSeal) {
                const rect = waxSeal.getBoundingClientRect();
                cx = rect.left + rect.width / 2;
                cy = rect.top + rect.height / 2;
            } else if (e && e.clientX) {
                cx = e.clientX;
                cy = e.clientY;
            }
            spawnTouchSparkle(cx, cy, 14);
        }
        if (typeof triggerCelebrationBurst === 'function') {
            triggerCelebrationBurst();
        }

        if (emeraldEnvelope) {
            emeraldEnvelope.classList.add('opening');
        }

        setTimeout(() => {
            step1El.classList.add('envelope-opened');
            isEnvelopeOpening = false;
            startLiveQuoteRotation();
        }, 560);
    }

    function replayEmeraldEnvelope(e) {
        if (e) e.stopPropagation();
        stopLiveQuoteRotation();
        step1El.classList.remove('envelope-opened');
        if (emeraldEnvelope) {
            emeraldEnvelope.classList.remove('opening');
        }
        isEnvelopeOpening = false;
    }

    if (envelopeStage) {
        envelopeStage.addEventListener('click', openEmeraldEnvelope);
        envelopeStage.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openEmeraldEnvelope(e);
            }
        });
    }

    if (replayEnvBtn) {
        replayEnvBtn.addEventListener('click', replayEmeraldEnvelope);
    }

    // ====== 2. VẼ BỘ 3 THIỆP MẪU 3D XẾP XÒE QUẠT (SỬ DỤNG KHUNG THẬT TRONG 20 CONCEPT) ======
    // Vẽ chân dung minh họa nghệ thuật (Fashion Muse Silhouette) làm nền ảnh mẫu bên trong khung
    function drawArtisticMusePortrait(ctx, w, h, variantIndex) {
        ctx.save();

        // Nền lụa pastel theo từng mẫu
        const bgGrad = ctx.createLinearGradient(0, 0, w, h);
        if (variantIndex % 3 === 0) {
            // Tông Ngọc Bích Sương Mai
            bgGrad.addColorStop(0, '#dff5ec');
            bgGrad.addColorStop(0.5, '#f5fcf9');
            bgGrad.addColorStop(1, '#bce6d5');
        } else if (variantIndex % 3 === 1) {
            // Tông Hồng Đào Phấn Lụa
            bgGrad.addColorStop(0, '#ffe8f0');
            bgGrad.addColorStop(0.5, '#fff7fa');
            bgGrad.addColorStop(1, '#f9cedf');
        } else {
            // Tông Nắng Thu Champagne & Mint
            bgGrad.addColorStop(0, '#fdf3dc');
            bgGrad.addColorStop(0.5, '#f6fcf9');
            bgGrad.addColorStop(1, '#d4efe3');
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Vầng hào quang mặt trời / ánh trăng mềm phía sau nhân vật
        const haloX = w * 0.5;
        const haloY = h * 0.42;
        const haloR = w * 0.36;
        const haloGrad = ctx.createRadialGradient(haloX, haloY, haloR * 0.1, haloX, haloY, haloR);
        haloGrad.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
        haloGrad.addColorStop(0.65, 'rgba(255, 240, 215, 0.45)');
        haloGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(haloX, haloY, haloR, 0, Math.PI * 2);
        ctx.fill();

        // Minh họa Quý cô thanh lịch (Editorial Muse) ở trung tâm
        const cx = w * 0.5;
        const cy = h * 0.48;

        // Mái tóc bồng bềnh mềm mại
        ctx.fillStyle = variantIndex % 2 === 0 ? '#243b35' : '#3a2730';
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.16, cy - h * 0.12);
        ctx.bezierCurveTo(cx - w * 0.24, cy - h * 0.24, cx + w * 0.24, cy - h * 0.24, cx + w * 0.17, cy - h * 0.1);
        ctx.bezierCurveTo(cx + w * 0.25, cy + h * 0.04, cx + w * 0.2, cy + h * 0.18, cx + w * 0.12, cy + h * 0.22);
        ctx.lineTo(cx - w * 0.12, cy + h * 0.22);
        ctx.bezierCurveTo(cx - w * 0.22, cy + h * 0.16, cx - w * 0.24, cy + h * 0.02, cx - w * 0.16, cy - h * 0.12);
        ctx.closePath();
        ctx.fill();

        // Cổ & Vai thanh mảnh
        ctx.fillStyle = '#ffe9e3';
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.045, cy - h * 0.02);
        ctx.lineTo(cx + w * 0.045, cy - h * 0.02);
        ctx.lineTo(cx + w * 0.055, cy + h * 0.09);
        ctx.lineTo(cx - w * 0.055, cy + h * 0.09);
        ctx.closePath();
        ctx.fill();

        // Khuôn mặt trái xoan dịu dàng
        ctx.fillStyle = '#fff0ec';
        ctx.beginPath();
        ctx.ellipse(cx, cy - h * 0.095, w * 0.105, h * 0.082, 0, 0, Math.PI * 2);
        ctx.fill();

        // Má hồng ửng nhẹ
        ctx.fillStyle = 'rgba(240, 120, 150, 0.28)';
        ctx.beginPath();
        ctx.arc(cx - w * 0.05, cy - h * 0.085, w * 0.028, 0, Math.PI * 2);
        ctx.arc(cx + w * 0.05, cy - h * 0.085, w * 0.028, 0, Math.PI * 2);
        ctx.fill();

        // Hàng mi cong & Nụ cười mỉm thanh tao
        ctx.strokeStyle = '#3a2730';
        ctx.lineWidth = Math.max(1.2, w * 0.007);
        ctx.lineCap = 'round';
        // Mắt trái
        ctx.beginPath();
        ctx.arc(cx - w * 0.042, cy - h * 0.102, w * 0.022, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
        // Mắt phải
        ctx.beginPath();
        ctx.arc(cx + w * 0.042, cy - h * 0.102, w * 0.022, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
        // Môi hồng
        ctx.strokeStyle = '#d84b7e';
        ctx.lineWidth = Math.max(1.4, w * 0.008);
        ctx.beginPath();
        ctx.arc(cx, cy - h * 0.062, w * 0.022, 0.18 * Math.PI, 0.82 * Math.PI);
        ctx.stroke();

        // Tóc mái bay nghệ thuật
        ctx.fillStyle = variantIndex % 2 === 0 ? '#243b35' : '#3a2730';
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.11, cy - h * 0.12);
        ctx.quadraticCurveTo(cx - w * 0.02, cy - h * 0.19, cx + w * 0.11, cy - h * 0.12);
        ctx.quadraticCurveTo(cx + w * 0.02, cy - h * 0.15, cx - w * 0.11, cy - h * 0.12);
        ctx.fill();

        // Đầm lụa ngọc bích / hồng phấn
        const dressGrad = ctx.createLinearGradient(cx, cy + h * 0.06, cx, h);
        if (variantIndex % 3 === 0) {
            dressGrad.addColorStop(0, '#128266');
            dressGrad.addColorStop(1, '#095241');
        } else if (variantIndex % 3 === 1) {
            dressGrad.addColorStop(0, '#e56b96');
            dressGrad.addColorStop(1, '#b83265');
        } else {
            dressGrad.addColorStop(0, '#199474');
            dressGrad.addColorStop(1, '#0b5e49');
        }
        ctx.fillStyle = dressGrad;
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.22, h * 0.92);
        ctx.quadraticCurveTo(cx - w * 0.18, cy + h * 0.07, cx, cy + h * 0.08);
        ctx.quadraticCurveTo(cx + w * 0.18, cy + h * 0.07, cx + w * 0.22, h * 0.92);
        ctx.closePath();
        ctx.fill();

        // Bó hoa nhỏ trước ngực & hoa cài tóc
        const flowerColors = ['#ffb7c5', '#ffd166', '#ffffff', '#f48fb1'];
        for (let i = 0; i < 5; i++) {
            const fx = cx + (i - 2) * w * 0.042;
            const fy = cy + h * 0.18 + Math.abs(i - 2) * h * 0.015;
            ctx.fillStyle = flowerColors[i % flowerColors.length];
            ctx.beginPath();
            ctx.arc(fx, fy, w * 0.032, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#e2b049';
            ctx.beginPath();
            ctx.arc(fx, fy, w * 0.01, 0, Math.PI * 2);
            ctx.fill();
        }

        // Hoa cài tóc
        ctx.fillStyle = '#ffb7c5';
        ctx.beginPath();
        ctx.arc(cx + w * 0.1, cy - h * 0.14, w * 0.028, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e2b049';
        ctx.beginPath();
        ctx.arc(cx + w * 0.1, cy - h * 0.14, w * 0.009, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function drawSampleCardOnCanvas(canvas, conceptIdx, themeKey, variantSeed) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const photoH = Math.floor(h * 0.74);

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

        ctx.clearRect(0, 0, w, h);

        // 1. Nền tổng thể tấm thiệp
        const cardGrad = ctx.createLinearGradient(0, 0, 0, h);
        cardGrad.addColorStop(0, theme.canvasBgStart);
        cardGrad.addColorStop(0.65, theme.canvasBgMid);
        cardGrad.addColorStop(1, theme.canvasBgEnd);
        ctx.fillStyle = cardGrad;
        ctx.fillRect(0, 0, w, h);

        // 2. Vẽ chân dung nghệ thuật bên trong vùng ảnh
        drawArtisticMusePortrait(ctx, w, photoH, variantSeed);

        // 3. Phủ khung thật từ 20 mẫu Concept (gọi trực tiếp hàm renderConceptOverlayToCtx của script.js)
        const def = (typeof CONCEPT_DEFS !== 'undefined' && CONCEPT_DEFS[conceptIdx])
            ? CONCEPT_DEFS[conceptIdx]
            : { concept: 'arch', fullLabel: '✨ 01. Vòm Lụa' };

        if (typeof renderConceptOverlayToCtx === 'function') {
            renderConceptOverlayToCtx(ctx, def.concept, w, photoH, theme, false);
        }

        // 4. Vẽ hộp lời chúc thu nhỏ ở 26% đáy thiệp (giống hệt bố cục Bước 3)
        const boxX = Math.floor(w * 0.065);
        const boxY = photoH + Math.floor(h * 0.022);
        const boxW = w - boxX * 2;
        const boxH = h - boxY - Math.floor(h * 0.032);

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
        ctx.strokeStyle = theme.borderPrimary;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 8);
        ctx.fill();
        ctx.stroke();

        // Viền đôi mảnh bên trong
        ctx.strokeStyle = theme.borderSecondary;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.roundRect(boxX + 3.5, boxY + 3.5, boxW - 7, boxH - 7, 5);
        ctx.stroke();

        // Tiêu đề nhỏ trên thiệp mẫu
        const centerX = w / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = theme.recipientColor;
        ctx.font = `700 ${Math.floor(w * 0.052)}px "Cormorant Garamond", serif`;
        ctx.fillText('Gửi người phụ nữ tuyệt vời 🌸', centerX, boxY + boxH * 0.27);

        // Đường kẻ vàng kim mảnh
        ctx.strokeStyle = theme.goldAccent;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(centerX - boxW * 0.22, boxY + boxH * 0.44);
        ctx.lineTo(centerX + boxW * 0.22, boxY + boxH * 0.44);
        ctx.stroke();

        // 2 dòng lời chúc thu nhỏ
        ctx.fillStyle = theme.textTop;
        ctx.font = `600 ${Math.floor(w * 0.039)}px "Cormorant Garamond", serif`;
        ctx.fillText('Chúc bạn luôn rạng rỡ như đóa hoa', centerX, boxY + boxH * 0.62);
        ctx.fillText('và ngập tràn hạnh phúc ngày 20/10!', centerX, boxY + boxH * 0.79);
        ctx.restore();
    }

    function renderFanShowcaseTrio(centerIdx) {
        const total = (typeof CONCEPT_DEFS !== 'undefined' && CONCEPT_DEFS.length) ? CONCEPT_DEFS.length : 20;
        const leftIdx = (centerIdx + total - 1) % total;
        const rightIdx = (centerIdx + 1) % total;

        drawSampleCardOnCanvas(canvasLeft, leftIdx, FAN_SLOT_THEMES[0], leftIdx);
        drawSampleCardOnCanvas(canvasCenter, centerIdx, FAN_SLOT_THEMES[1], centerIdx);
        drawSampleCardOnCanvas(canvasRight, rightIdx, FAN_SLOT_THEMES[2], rightIdx);

        if (fanConceptNameEl && typeof CONCEPT_DEFS !== 'undefined' && CONCEPT_DEFS[centerIdx]) {
            fanConceptNameEl.textContent = CONCEPT_DEFS[centerIdx].fullLabel;
        }
    }

    function cycleFanShowcase(e) {
        const total = (typeof CONCEPT_DEFS !== 'undefined' && CONCEPT_DEFS.length) ? CONCEPT_DEFS.length : 20;
        currentCenterIndex = (currentCenterIndex + 1) % total;

        if (e && typeof spawnTouchSparkle === 'function') {
            const rect = fanShowcase.getBoundingClientRect();
            const sx = e.clientX || (rect.left + rect.width / 2);
            const sy = e.clientY || (rect.top + rect.height / 2);
            spawnTouchSparkle(sx, sy, 7);
        }

        if (fanCardsStage) {
            fanCardsStage.classList.add('shuffling');
            setTimeout(() => {
                renderFanShowcaseTrio(currentCenterIndex);
                // Đồng bộ mẫu khung đang chọn ở giữa sang Bước 2
                if (typeof selectFrameById === 'function') {
                    selectFrameById(currentCenterIndex, false);
                }
                fanCardsStage.classList.remove('shuffling');
            }, 170);
        } else {
            renderFanShowcaseTrio(currentCenterIndex);
        }
    }

    if (fanShowcase) {
        fanShowcase.addEventListener('click', cycleFanShowcase);
        fanShowcase.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                cycleFanShowcase(e);
            }
        });
    }

    // ====== 3. THANH TRÍCH DẪN LỜI CHÚC SỐNG ĐỘNG (LIVE QUOTE PILL - TỰ ĐỔI MỖI 4 GIÂY) ======
    function pickRandomIntroWish() {
        if (typeof getNextQuoteByTopic === 'function') {
            return getNextQuoteByTopic('all');
        }
        if (typeof wishes2010 !== 'undefined' && wishes2010.length > 0) {
            return wishes2010[Math.floor(Math.random() * wishes2010.length)];
        }
        return 'Chúc bạn một ngày 20/10 thật nhiều niềm vui, luôn rạng rỡ và ngập tràn hạnh phúc!';
    }

    function updateLiveQuoteText(manualTapEvent) {
        if (!liveQuoteTextEl) return;

        if (manualTapEvent && typeof spawnTouchSparkle === 'function') {
            const rect = liveQuotePill.getBoundingClientRect();
            const sx = manualTapEvent.clientX || (rect.left + rect.width / 2);
            const sy = manualTapEvent.clientY || (rect.top + rect.height / 2);
            spawnTouchSparkle(sx, sy, 8);
        }

        liveQuoteTextEl.classList.add('quote-fading');
        setTimeout(() => {
            const nextWish = pickRandomIntroWish();
            liveQuoteTextEl.textContent = `“${nextWish}”`;
            // Lưu sẵn lời chúc đang hiển thị để nếu người dùng bấm chụp/tải ảnh sẽ giữ đúng lời chúc yêu thích
            if (typeof currentAIQuote !== 'undefined') {
                currentAIQuote = nextWish;
                hasGeneratedQuoteOnce = true;
            }
            liveQuoteTextEl.classList.remove('quote-fading');
        }, 220);
    }

    function startLiveQuoteRotation() {
        stopLiveQuoteRotation();
        quoteIntervalId = setInterval(() => {
            if (document.hidden || !step1El.classList.contains('active')) return;
            updateLiveQuoteText(null);
        }, 4000);
    }

    function stopLiveQuoteRotation() {
        if (quoteIntervalId) {
            clearInterval(quoteIntervalId);
            quoteIntervalId = null;
        }
    }

    if (liveQuotePill) {
        liveQuotePill.addEventListener('click', (e) => {
            updateLiveQuoteText(e);
            startLiveQuoteRotation();
        });
        liveQuotePill.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                updateLiveQuoteText(e);
                startLiveQuoteRotation();
            }
        });
    }

    // Khởi tạo bộ 3 tấm thiệp mẫu & câu chúc đầu tiên ngay khi tải trang
    function initStep1WowExperience() {
        renderFanShowcaseTrio(0);
        const firstWish = pickRandomIntroWish();
        if (liveQuoteTextEl) {
            liveQuoteTextEl.textContent = `“${firstWish}”`;
        }
        if (typeof currentAIQuote !== 'undefined') {
            currentAIQuote = firstWish;
            hasGeneratedQuoteOnce = true;
        }

        // Giữ nguyên câu chúc đang hiển thị trên Thanh Trích Dẫn khi người dùng chọn/chụp ảnh
        ['upload-btn', 'selfie-btn'].forEach(id => {
            const inputEl = document.getElementById(id);
            if (inputEl) {
                inputEl.addEventListener('change', () => {
                    if (typeof currentAIQuote !== 'undefined' && currentAIQuote) {
                        hasGeneratedQuoteOnce = true;
                    }
                });
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStep1WowExperience);
    } else {
        initStep1WowExperience();
    }
})();
