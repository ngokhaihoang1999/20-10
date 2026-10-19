// ====== TRANG MỞ ĐẦU VẬT LÝ 3D: PHONG BÌ LỤA NGỌC BÍCH + CON DẤU SÁP SIÊU THỰC + 3 THIỆP MẪU ĐA DẠNG KIỂU TÓC & NHÁY MẮT SỐNG ĐỘNG ======
(function () {
    const step1El = document.getElementById('step-1');
    const step2El = document.getElementById('step-2');
    const physicalStage = document.getElementById('step1-physical-stage');
    const waxSealBtn = document.getElementById('env-wax-seal');
    const replayEnvBtn = document.getElementById('replay-envelope-btn');
    const heroFanShowcase = document.getElementById('hero-fan-showcase');
    const uploadWrapperEl = document.getElementById('upload-wrapper');
    const startCreateCardBtn = document.getElementById('start-create-card-btn');
    const step1CtaChoices = document.getElementById('step1-cta-choices');

    const fanCard0 = document.getElementById('fan-card-0');
    const fanCard1 = document.getElementById('fan-card-1');
    const fanCard2 = document.getElementById('fan-card-2');

    // Mảng quản lý 3 thẻ DOM đang ở vị trí [Trái, Giữa, Phải]
    let activeFanSlots = [fanCard0, fanCard1, fanCard2];

    let isAnimatingEnvelope = false;
    let currentCenterIndex = 0;
    let fanCycleIntervalId = null;
    let blinkLoopTimerId = null;
    let blinkStepCount = 0;

    // 5 tông màu chuẩn từ COLOR_THEMES trong script.js (giữ sắc Xanh Ngọc Bích làm chủ đạo)
    const REAL_THEME_KEYS = ['emerald', 'blush', 'champagne', 'emerald', 'rosegold', 'lavender'];

    // Bộ tiêu đề & lời chúc 20/10 giàu cảm xúc cho các tấm thiệp mẫu
    const SAMPLE_RECIPIENTS = [
        'Thương gửi một nửa thế giới 🌸',
        'Gửi những đóa hoa rạng rỡ 20/10',
        'Rạng rỡ sắc hương tháng Mười ✨',
        'Mừng ngày Phụ nữ Việt Nam 20/10',
        'Gửi người phụ nữ tuyệt vời nhất 🌷',
        'Chúc mừng tháng 10 yêu thương 💖'
    ];

    const SAMPLE_WISHES = [
        'Chiều thu gió nhẹ ngang vai, trà thơm một tách, đường dài thảnh thơi. Tháng Mười rạng rỡ môi cười, tự do tỏa sáng giữa trời thanh xuân.',
        'Lên đồ xuống phố chiều nay, góc nào cũng đẹp, tháng ngày cũng tươi. Mắt trong lấp lánh nụ cười, ví tiền rủng rỉnh chẳng vơi chút nào.',
        'Sương mai chạm khẽ nụ hồng, nắng thu trải nhẹ, ấm nồng ban mai. Tháng năm rạng rỡ đường dài, trẻ trung cốt cách, miệt mài vươn cao.',
        'Ngoài kia trăm ngả bộn bề, tháng Mười giữ một lối về thảnh thơi. Trà thơm chạm khẽ môi cười, bình yên đậu xuống khoảng trời ấm êm.',
        'Nắng thu dịu nhẹ bên thềm, gửi lời chúc nhỏ dịu êm tháng Mười. Giữ cho ánh mắt luôn tươi, vững vàng sự nghiệp, rạng ngời nét duyên.',
        'Chẳng cần cố giống một ai, dịu dàng đúng chất, giữ hoài nét duyên. Mắt trong giữ ánh cười hiền, yêu mình trọn vẹn, bình yên ngập tràn.'
    ];

    function resetStep1CtaToInitial() {
        if (uploadWrapperEl) {
            uploadWrapperEl.classList.remove('cta-expanded');
        }
        if (startCreateCardBtn) {
            startCreateCardBtn.setAttribute('aria-expanded', 'false');
        }
        if (step1CtaChoices) {
            step1CtaChoices.setAttribute('aria-hidden', 'true');
        }
    }

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

    const envAuraGlow = step1El ? step1El.querySelector('.envelope-aura-glow') : null;
    const envBackLayer = step1El ? step1El.querySelector('.env-back-layer') : null;
    const envFrontPocketLayer = step1El ? step1El.querySelector('.env-front-pocket-layer') : null;
    const envTopFlapLayer = step1El ? step1El.querySelector('.env-top-flap-layer') : null;
    const envWaxSealLayer = step1El ? step1El.querySelector('.env-wax-seal-layer') : null;
    const step1CardColumn = document.getElementById('step1-card-column');

    let envRafId = 0;

    function clamp01(v) {
        return v < 0 ? 0 : (v > 1 ? 1 : v);
    }

    function smoothstep(a, b, x) {
        const u = clamp01((x - a) / (b - a));
        return u * u * (3 - 2 * u);
    }

    function smootherstep01(u) {
        return u * u * u * (u * (u * 6 - 15) + 10);
    }

    function cubicBezier(s, p0, p1, p2, p3) {
        const inv = 1 - s;
        const inv2 = inv * inv;
        const s2 = s * s;
        return inv2 * inv * p0 + 3 * inv2 * s * p1 + 3 * inv * s2 * p2 + s2 * s * p3;
    }

    function clearEnvelopeInlineStyles() {
        const els = [envAuraGlow, envBackLayer, envFrontPocketLayer, envTopFlapLayer, envWaxSealLayer, waxSealBtn, step1CardColumn];
        for (let i = 0; i < els.length; i++) {
            if (els[i]) {
                els[i].style.transform = '';
                els[i].style.opacity = '';
                els[i].style.visibility = '';
            }
        }
    }

    function readCurrentEnvelopeY() {
        if (!envBackLayer || typeof window.getComputedStyle !== 'function') return 0;
        try {
            const tf = window.getComputedStyle(envBackLayer).transform;
            if (!tf || tf === 'none') return 0;
            if (typeof DOMMatrixReadOnly === 'function') {
                return new DOMMatrixReadOnly(tf).m42 || 0;
            }
            const m = tf.match(/matrix\(([^)]+)\)/);
            if (m) {
                const parts = m[1].split(',');
                return parseFloat(parts[5]) || 0;
            }
        } catch (_) {}
        return 0;
    }

    // Hàm đặt lại phong bì 3D về trạng thái đóng lơ lửng (dùng khi Mở lại bì thiệp 3D hoặc Xem thử mở bì thư)
    window.resetEnvelopeToClosedIdle = function () {
        if (envRafId) {
            cancelAnimationFrame(envRafId);
            envRafId = 0;
        }
        isAnimatingEnvelope = false;
        stopFanAutoCycle();
        stopNaturalBlinkLoop();
        resetStep1CtaToInitial();
        clearEnvelopeInlineStyles();
        step1El.classList.remove('env-animating', 'env-flap-open', 'env-flap-behind', 'env-letter-pull', 'env-letter-front', 'env-closing-silk', 'envelope-opened');
        step1El.classList.add('env-appeared', 'env-idle-float');
    };

    // ====== 2. HOẠT ẢNH VẬT LÝ MỞ PHONG BÌ LỤA 3D LIỀN MẠCH 60FPS (SINGLE RAF POLYNOMIAL CURVES) ======
    function openPhysicalEnvelope(e) {
        if (e) e.stopPropagation();
        if (isAnimatingEnvelope || step1El.classList.contains('envelope-opened')) return;

        // Nếu đang ở Chế độ Người Nhận (mở từ Link Thiệp 3D) hoặc Chế độ Xem Thử Mở Bì Thiệp 3D:
        if (window.isEnvelopeGiftMode && typeof window.handleGiftEnvelopeOpen === 'function') {
            isAnimatingEnvelope = true;
            window.handleGiftEnvelopeOpen(waxSealBtn, () => {
                isAnimatingEnvelope = false;
            });
            return;
        }

        isAnimatingEnvelope = true;
        if (envRafId) {
            cancelAnimationFrame(envRafId);
            envRafId = 0;
        }

        // Đọc tọa độ con dấu sáp & vị trí lơ lửng hiện tại TRƯỚC khi ghi DOM để 0ms reflow và 0.00px giật
        let sealCx = window.innerWidth * 0.5;
        let sealCy = window.innerHeight * 0.5;
        if (waxSealBtn) {
            const rect = waxSealBtn.getBoundingClientRect();
            if (rect.width > 0) {
                sealCx = rect.left + rect.width * 0.5;
                sealCy = rect.top + rect.height * 0.5;
            }
        }
        const startEnvY = readCurrentEnvelopeY();

        window.CardAudio?.playStep1EnvelopeOpenSequence();

        step1El.classList.remove('env-idle-float', 'env-closing-silk', 'env-flap-behind', 'env-letter-front');
        step1El.classList.add('env-animating', 'env-flap-open');
        if (step1CardColumn) {
            step1CardColumn.style.visibility = 'visible';
        }

        if (typeof spawnTouchSparkle === 'function') {
            spawnTouchSparkle(sealCx, sealCy, 8);
        }

        const OPEN_DUR = 1.46;
        const t0 = performance.now();
        let flapBehindSet = false;
        let letterFrontSet = false;

        function stepOpen(now) {
            const t = Math.min(OPEN_DUR, Math.max(0, (now - t0) * 0.001));

            // 1. Con dấu sáp vàng: nhún nhẹ rồi bay vút lên & tan biến mượt mà (0.00s -> 0.44s)
            if (waxSealBtn) {
                const uSeal = clamp01(t / 0.44);
                const sSeal = 1 - Math.pow(1 - uSeal, 3);
                const sealY = cubicBezier(sSeal, 0, 2.5, -22, -32);
                const sealScale = cubicBezier(sSeal, 1.0, 0.94, 1.18, 1.28);
                const sealRot = sSeal * 10;
                const sealAlpha = 1 - smoothstep(0.14, 0.96, uSeal);
                waxSealBtn.style.transform = `translate3d(-50%, calc(-50% + ${sealY.toFixed(2)}px), 0) scale(${sealScale.toFixed(4)}) rotate(${sealRot.toFixed(2)}deg)`;
                waxSealBtn.style.opacity = sealAlpha.toFixed(4);
            }

            // 2. Nắp phong bì: lật mở 3D từ 0° -> 180° có độ đàn hồi lụa mềm (0.02s -> 0.62s)
            const uFlap = clamp01((t - 0.02) / 0.60);
            const flapEase = smootherstep01(uFlap);
            const flapOvershoot = Math.sin(uFlap * Math.PI) * 4.2 * smoothstep(0.45, 1.0, uFlap);
            const flapDeg = flapEase * 180 + flapOvershoot;

            // Đúng frame nắp đi qua góc vuông 90° (độ dày hình chiếu = 0px), chuyển nắp ra sau lá thư
            if (!flapBehindSet && flapDeg >= 90) {
                flapBehindSet = true;
                step1El.classList.add('env-flap-behind');
            }

            // 3. Thân phong bì: nhún nhẹ lấy đà rồi lướt êm xuống làm đối trọng cho lá thư bay lên (0.08s -> 1.02s)
            const uEnv = clamp01((t - 0.08) / 0.94);
            const sEnv = 0.45 * smootherstep01(uEnv) + 0.55 * (1 - Math.pow(1 - uEnv, 2.4));
            const pressDip = Math.sin(clamp01(t / 0.24) * Math.PI) * 3.5 * (1 - sEnv);
            const envY = cubicBezier(sEnv, startEnvY, startEnvY + 32, 148, 168) + pressDip;
            const envScale = cubicBezier(sEnv, 1.0, 0.985, 0.86, 0.84);
            const envAlpha = 1 - smoothstep(0.26, 0.94, uEnv);

            const bodyTf = `translate3d(0, ${envY.toFixed(2)}px, 0) scale(${envScale.toFixed(4)}) perspective(1100px) rotateX(0deg)`;
            const flapTf = `translate3d(0, ${envY.toFixed(2)}px, 0) scale(${envScale.toFixed(4)}) perspective(1100px) rotateX(${flapDeg.toFixed(2)}deg)`;
            const envAlphaStr = envAlpha.toFixed(4);

            if (envBackLayer) {
                envBackLayer.style.transform = bodyTf;
                envBackLayer.style.opacity = envAlphaStr;
            }
            if (envFrontPocketLayer) {
                envFrontPocketLayer.style.transform = bodyTf;
                envFrontPocketLayer.style.opacity = envAlphaStr;
            }
            if (envAuraGlow) {
                envAuraGlow.style.transform = bodyTf;
                envAuraGlow.style.opacity = envAlphaStr;
            }
            if (envWaxSealLayer) {
                envWaxSealLayer.style.transform = bodyTf;
            }
            if (envTopFlapLayer) {
                envTopFlapLayer.style.transform = flapTf;
                envTopFlapLayer.style.opacity = envAlphaStr;
            }

            // 4. Lá thư "Tháng 10 Rạng Rỡ": 1 đường cong Cubic Bezier C-infinity duy nhất từ trong túi lụa ra giữa màn hình (0.12s -> 1.46s)
            const uCard = clamp01((t - 0.12) / 1.34);
            const sCard = 0.50 * smootherstep01(uCard) + 0.50 * (1 - Math.pow(1 - uCard, 2.55));
            const cardY = cubicBezier(sCard, 16, -172, -20, 0);
            const cardScale = cubicBezier(sCard, 0.46, 0.46, 0.97, 1.00);
            const cardRotX = cubicBezier(sCard, 7.0, -4.2, 0.6, 0.0);
            const cardAlpha = smoothstep(0.0, 0.14, uCard);

            // Tại sCard >= 0.42, đáy lá thư đã vượt cao hơn miệng túi phong bì hơn 20px (0px giao cắt) -> chuyển lên z-index: 14
            if (!letterFrontSet && sCard >= 0.42) {
                letterFrontSet = true;
                step1El.classList.add('env-letter-front');
            }

            if (step1CardColumn) {
                step1CardColumn.style.opacity = cardAlpha.toFixed(4);
                step1CardColumn.style.transform = `translate3d(0, ${cardY.toFixed(2)}px, 0) scale(${cardScale.toFixed(4)}) perspective(1100px) rotateX(${cardRotX.toFixed(2)}deg)`;
            }

            if (t < OPEN_DUR) {
                envRafId = requestAnimationFrame(stepOpen);
            } else {
                envRafId = 0;
                step1El.classList.add('envelope-opened');
                step1El.classList.remove('env-animating', 'env-flap-open', 'env-letter-front', 'env-letter-pull');
                clearEnvelopeInlineStyles();
                isAnimatingEnvelope = false;
                triggerCardBlink(activeFanSlots[1], true);
                window.CardAudio?.playCardWinkTwinkle();
                startFanAutoCycle();
                startNaturalBlinkLoop();
            }
        }

        envRafId = requestAnimationFrame(stepOpen);
    }

    // ====== 3. HOẠT ẢNH ĐẢO NGƯỢC VẬT LÝ 60FPS: ĐÚT TẤM THIỆP VÀO LẠI PHONG BÌ & ĐÓNG DẤU SÁP MƯỢT MÀ ======
    function closePhysicalEnvelope(e) {
        if (e) e.stopPropagation();
        if (isAnimatingEnvelope || !step1El.classList.contains('envelope-opened')) return;
        isAnimatingEnvelope = true;
        if (envRafId) {
            cancelAnimationFrame(envRafId);
            envRafId = 0;
        }

        stopFanAutoCycle();
        stopNaturalBlinkLoop();
        window.CardAudio?.playStep1EnvelopeCloseSequence();

        step1El.classList.remove('envelope-opened', 'env-flap-open', 'env-letter-pull', 'env-idle-float');
        step1El.classList.add('env-animating', 'env-closing-silk', 'env-letter-front', 'env-flap-behind');
        if (step1CardColumn) {
            step1CardColumn.style.visibility = 'visible';
        }

        const CLOSE_DUR = 1.38;
        const t0 = performance.now();
        let letterFrontCleared = false;
        let flapFrontRestored = false;

        function stepClose(now) {
            const t = Math.min(CLOSE_DUR, Math.max(0, (now - t0) * 0.001));

            // 1. Lá thư lướt vòng cung 3D thu gọn vào lòng túi chữ V (0.00s -> 1.04s)
            const uCard = clamp01(t / 1.04);
            const sCard = 1 - (0.52 * smootherstep01(uCard) + 0.48 * Math.pow(uCard, 2.2));
            const cardY = cubicBezier(sCard, 16, -172, -20, 0);
            const cardScale = cubicBezier(sCard, 0.46, 0.46, 0.97, 1.00);
            const cardRotX = cubicBezier(sCard, 7.0, -4.2, 0.6, 0.0);
            const cardAlpha = smoothstep(0.0, 0.14, 1 - uCard);

            if (!letterFrontCleared && sCard <= 0.42) {
                letterFrontCleared = true;
                step1El.classList.remove('env-letter-front');
                resetStep1CtaToInitial();
            }

            if (step1CardColumn) {
                step1CardColumn.style.opacity = cardAlpha.toFixed(4);
                step1CardColumn.style.transform = `translate3d(0, ${cardY.toFixed(2)}px, 0) scale(${cardScale.toFixed(4)}) perspective(1100px) rotateX(${cardRotX.toFixed(2)}deg)`;
            }

            // 2. Thân phong bì trỗi dậy đón lá thư (0.08s -> 1.06s)
            const uEnv = 1 - clamp01((t - 0.08) / 0.98);
            const sEnv = smootherstep01(uEnv);
            const settleBounce = Math.sin(clamp01((t - 0.96) / 0.36) * Math.PI) * 2.5;
            const envY = cubicBezier(sEnv, 0, 28, 148, 168) + settleBounce;
            const envScale = cubicBezier(sEnv, 1.0, 0.985, 0.86, 0.84);
            const envAlpha = 1 - smoothstep(0.30, 0.95, uEnv);

            // 3. Nắp phong bì khép từ 180° về 0° (0.68s -> 1.24s)
            const uFlap = 1 - clamp01((t - 0.68) / 0.56);
            const flapDeg = smootherstep01(uFlap) * 180;

            if (!flapFrontRestored && flapDeg <= 90) {
                flapFrontRestored = true;
                step1El.classList.remove('env-flap-behind');
            }

            const bodyTf = `translate3d(0, ${envY.toFixed(2)}px, 0) scale(${envScale.toFixed(4)}) perspective(1100px) rotateX(0deg)`;
            const flapTf = `translate3d(0, ${envY.toFixed(2)}px, 0) scale(${envScale.toFixed(4)}) perspective(1100px) rotateX(${flapDeg.toFixed(2)}deg)`;
            const envAlphaStr = envAlpha.toFixed(4);

            if (envBackLayer) {
                envBackLayer.style.transform = bodyTf;
                envBackLayer.style.opacity = envAlphaStr;
            }
            if (envFrontPocketLayer) {
                envFrontPocketLayer.style.transform = bodyTf;
                envFrontPocketLayer.style.opacity = envAlphaStr;
            }
            if (envAuraGlow) {
                envAuraGlow.style.transform = bodyTf;
                envAuraGlow.style.opacity = envAlphaStr;
            }
            if (envWaxSealLayer) {
                envWaxSealLayer.style.transform = bodyTf;
            }
            if (envTopFlapLayer) {
                envTopFlapLayer.style.transform = flapTf;
                envTopFlapLayer.style.opacity = envAlphaStr;
            }

            // 4. Con dấu sáp vàng đóng ấn khóa chặt nắp thư (1.02s -> 1.38s)
            if (waxSealBtn) {
                const uSeal = 1 - clamp01((t - 1.02) / 0.36);
                const sSeal = smootherstep01(uSeal);
                const sealY = cubicBezier(sSeal, 0, 2, -20, -32);
                const sealScale = cubicBezier(sSeal, 1.0, 0.95, 1.18, 1.28);
                const sealRot = sSeal * 10;
                const sealAlpha = 1 - smoothstep(0.10, 0.92, uSeal);
                waxSealBtn.style.transform = `translate3d(-50%, calc(-50% + ${sealY.toFixed(2)}px), 0) scale(${sealScale.toFixed(4)}) rotate(${sealRot.toFixed(2)}deg)`;
                waxSealBtn.style.opacity = sealAlpha.toFixed(4);
            }

            if (t < CLOSE_DUR) {
                envRafId = requestAnimationFrame(stepClose);
            } else {
                envRafId = 0;
                step1El.classList.remove('env-animating', 'env-closing-silk', 'env-letter-front', 'env-flap-behind');
                clearEnvelopeInlineStyles();
                step1El.classList.add('env-idle-float');
                isAnimatingEnvelope = false;
                if (typeof spawnTouchSparkle === 'function' && waxSealBtn) {
                    const rect = waxSealBtn.getBoundingClientRect();
                    if (rect.width > 0) {
                        spawnTouchSparkle(rect.left + rect.width * 0.5, rect.top + rect.height * 0.5, 6);
                    }
                }
            }
        }

        envRafId = requestAnimationFrame(stepClose);
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
                window.CardAudio?.playSealAttentionHint();
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

    // ====== 4. TRANH MINH HỌA CHÂN DUNG NÀNG THƠ: 6 KIỂU TÓC ĐA DẠNG & ĐÔI MẮT CHỚP NHÁY SỐNG ĐỘNG ======
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

    function drawSmallBlossom(ctx, cx, cy, r, petalColor, coreColor, petalCount = 5) {
        ctx.save();
        for (let p = 0; p < petalCount; p++) {
            const a = (p * Math.PI * 2) / petalCount;
            drawSoulfulPetal(
                ctx,
                cx + Math.cos(a) * r * 0.55,
                cy + Math.sin(a) * r * 0.55,
                r * 0.48,
                r * 0.65,
                a + Math.PI / 2,
                petalColor,
                0.96
            );
        }
        ctx.fillStyle = coreColor;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Vẽ lớp tóc phía sau đầu/vai theo 6 kiểu tóc hoàn toàn khác nhau
    function drawBackHairstyle(ctx, cx, cy, w, h, hairStyle, hairGrad, pal) {
        ctx.save();
        ctx.fillStyle = hairGrad;

        if (hairStyle === 0) {
            // Kiểu 0: Tóc dài suôn thẳng truyền thống mượt mà qua vai
            ctx.beginPath();
            ctx.moveTo(cx - w * 0.19, cy - h * 0.13);
            ctx.bezierCurveTo(cx - w * 0.28, cy - h * 0.28, cx + w * 0.28, cy - h * 0.28, cx + w * 0.19, cy - h * 0.13);
            ctx.bezierCurveTo(cx + w * 0.26, cy + h * 0.04, cx + w * 0.25, cy + h * 0.22, cx + w * 0.19, cy + h * 0.32);
            ctx.lineTo(cx - w * 0.19, cy + h * 0.32);
            ctx.bezierCurveTo(cx - w * 0.25, cy + h * 0.22, cx - w * 0.26, cy + h * 0.04, cx - w * 0.19, cy - h * 0.13);
            ctx.closePath();
            ctx.fill();

            // Ánh lụa phản chiếu trên mái tóc dài suôn mượt
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
            ctx.lineWidth = w * 0.008;
            ctx.beginPath();
            ctx.moveTo(cx - w * 0.15, cy - h * 0.04);
            ctx.quadraticCurveTo(cx - w * 0.18, cy + h * 0.1, cx - w * 0.15, cy + h * 0.24);
            ctx.moveTo(cx + w * 0.15, cy - h * 0.04);
            ctx.quadraticCurveTo(cx + w * 0.18, cy + h * 0.1, cx + w * 0.15, cy + h * 0.24);
            ctx.stroke();

        } else if (hairStyle === 1) {
            // Kiểu 1: Tóc búi cao quý phái (High Couture Chignon Bun) + Nơ lụa hồng xoè hai bên
            // Dải ruy-băng lụa cài sau búi tóc
            ctx.fillStyle = pal.flower;
            ctx.beginPath();
            ctx.moveTo(cx, cy - h * 0.21);
            ctx.quadraticCurveTo(cx - w * 0.16, cy - h * 0.26, cx - w * 0.19, cy - h * 0.16);
            ctx.quadraticCurveTo(cx - w * 0.1, cy - h * 0.17, cx, cy - h * 0.2);
            ctx.moveTo(cx, cy - h * 0.21);
            ctx.quadraticCurveTo(cx + w * 0.16, cy - h * 0.26, cx + w * 0.19, cy - h * 0.16);
            ctx.quadraticCurveTo(cx + w * 0.1, cy - h * 0.17, cx, cy - h * 0.2);
            ctx.fill();

            // Khối búi tóc tròn đầy trên đỉnh đầu
            ctx.fillStyle = hairGrad;
            ctx.beginPath();
            ctx.ellipse(cx, cy - h * 0.235, w * 0.105, h * 0.058, 0, 0, Math.PI * 2);
            ctx.fill();

            // Đường vân tóc xoắn trên búi cao
            ctx.strokeStyle = pal.hairHi;
            ctx.lineWidth = w * 0.005;
            ctx.beginPath();
            ctx.arc(cx, cy - h * 0.235, w * 0.068, Math.PI * 1.1, Math.PI * 1.9);
            ctx.stroke();

            // Phần tóc ôm gọn sau đầu (khoe trọn cổ cao thanh thoát)
            ctx.fillStyle = hairGrad;
            ctx.beginPath();
            ctx.ellipse(cx, cy - h * 0.12, w * 0.145, h * 0.095, 0, 0, Math.PI * 2);
            ctx.fill();

            // Trâm ngọc trai đính chân búi tóc
            for (let i = -2; i <= 2; i++) {
                ctx.fillStyle = '#fffdf7';
                ctx.beginPath();
                ctx.arc(cx + i * w * 0.024, cy - h * 0.192 + Math.abs(i) * h * 0.003, w * 0.0085, 0, Math.PI * 2);
                ctx.fill();
            }

        } else if (hairStyle === 2) {
            // Kiểu 2: Tóc xoăn sóng nước bồng bềnh (Glamorous Cascading S-Waves)
            ctx.beginPath();
            ctx.moveTo(cx - w * 0.2, cy - h * 0.14);
            ctx.bezierCurveTo(cx - w * 0.3, cy - h * 0.28, cx + w * 0.3, cy - h * 0.28, cx + w * 0.2, cy - h * 0.14);
            // 3 nhịp sóng uốn lượn bên phải
            ctx.bezierCurveTo(cx + w * 0.33, cy - h * 0.06, cx + w * 0.23, cy + h * 0.02, cx + w * 0.31, cy + h * 0.1);
            ctx.bezierCurveTo(cx + w * 0.36, cy + h * 0.17, cx + w * 0.22, cy + h * 0.23, cx + w * 0.26, cy + h * 0.3);
            ctx.lineTo(cx - w * 0.26, cy + h * 0.3);
            // 3 nhịp sóng uốn lượn bên trái
            ctx.bezierCurveTo(cx - w * 0.22, cy + h * 0.23, cx - w * 0.36, cy + h * 0.17, cx - w * 0.31, cy + h * 0.1);
            ctx.bezierCurveTo(cx - w * 0.23, cy + h * 0.02, cx - w * 0.33, cy - h * 0.06, cx - w * 0.2, cy - h * 0.14);
            ctx.closePath();
            ctx.fill();

            // Sợi highlight uốn sóng bồng bềnh
            ctx.strokeStyle = 'rgba(255, 240, 210, 0.22)';
            ctx.lineWidth = w * 0.007;
            ctx.beginPath();
            ctx.moveTo(cx - w * 0.19, cy - h * 0.05);
            ctx.bezierCurveTo(cx - w * 0.27, cy + h * 0.02, cx - w * 0.16, cy + h * 0.1, cx - w * 0.24, cy + h * 0.2);
            ctx.moveTo(cx + w * 0.19, cy - h * 0.05);
            ctx.bezierCurveTo(cx + w * 0.27, cy + h * 0.02, cx + w * 0.16, cy + h * 0.1, cx + w * 0.24, cy + h * 0.2);
            ctx.stroke();

        } else if (hairStyle === 3) {
            // Kiểu 3: Tóc ngắn Bob uốn cụp ngang cằm trẻ trung (Chic C-Curl Short Bob)
            ctx.beginPath();
            ctx.moveTo(cx - w * 0.18, cy - h * 0.15);
            ctx.bezierCurveTo(cx - w * 0.26, cy - h * 0.27, cx + w * 0.26, cy - h * 0.27, cx + w * 0.18, cy - h * 0.15);
            // Đuôi tóc Bob uốn cụp chữ C ôm vừa ngang cằm, khoe trọn cổ và vai
            ctx.bezierCurveTo(cx + w * 0.26, cy - h * 0.05, cx + w * 0.22, cy + h * 0.025, cx + w * 0.09, cy + h * 0.015);
            ctx.lineTo(cx - w * 0.09, cy + h * 0.015);
            ctx.bezierCurveTo(cx - w * 0.22, cy + h * 0.025, cx - w * 0.26, cy - h * 0.05, cx - w * 0.18, cy - h * 0.15);
            ctx.closePath();
            ctx.fill();

        } else if (hairStyle === 4) {
            // Kiểu 4: Tóc tiểu thư vắt lệch một bên vai (One-Shoulder Asymmetric Sweep)
            ctx.beginPath();
            ctx.moveTo(cx - w * 0.16, cy - h * 0.14);
            ctx.bezierCurveTo(cx - w * 0.24, cy - h * 0.27, cx + w * 0.26, cy - h * 0.27, cx + w * 0.19, cy - h * 0.13);
            // Bên phải buông lơi dày bồng bềnh qua vai phải
            ctx.bezierCurveTo(cx + w * 0.3, cy + h * 0.02, cx + w * 0.28, cy + h * 0.2, cx + w * 0.18, cy + h * 0.3);
            ctx.lineTo(cx + w * 0.02, cy + h * 0.28);
            // Bên trái vén gọn sau tai khoe bờ vai trái
            ctx.bezierCurveTo(cx - w * 0.08, cy + h * 0.08, cx - w * 0.16, cy - h * 0.01, cx - w * 0.16, cy - h * 0.14);
            ctx.closePath();
            ctx.fill();

        } else {
            // Kiểu 5: Tóc búi thấp trễ nải kiểu Pháp lệch bên gáy (Romantic Low Side Chignon)
            ctx.beginPath();
            ctx.moveTo(cx - w * 0.17, cy - h * 0.14);
            ctx.bezierCurveTo(cx - w * 0.25, cy - h * 0.27, cx + w * 0.25, cy - h * 0.27, cx + w * 0.17, cy - h * 0.14);
            ctx.bezierCurveTo(cx + w * 0.2, cy - h * 0.04, cx + w * 0.13, cy + h * 0.01, cx, cy + h * 0.01);
            ctx.bezierCurveTo(cx - w * 0.15, cy + h * 0.02, cx - w * 0.22, cy - h * 0.03, cx - w * 0.17, cy - h * 0.14);
            ctx.closePath();
            ctx.fill();

            // Khối búi tóc thấp tròn đầy lệch bên trái gáy
            ctx.beginPath();
            ctx.ellipse(cx - w * 0.135, cy - h * 0.028, w * 0.075, h * 0.048, -0.25, 0, Math.PI * 2);
            ctx.fill();

            // Hoa hồng Pháp & lá vàng cài trên búi tóc thấp
            drawSoulfulPetal(ctx, cx - w * 0.18, cy - h * 0.055, w * 0.016, h * 0.024, -0.8, '#2b9376', 0.85);
            drawSmallBlossom(ctx, cx - w * 0.145, cy - h * 0.048, w * 0.034, pal.flower, pal.accent, 6);
        }

        ctx.restore();
    }

    // Vẽ phần tóc mái phía trước trán/má & phụ kiện cài tóc theo đúng 6 kiểu tóc
    function drawFrontHairstyle(ctx, w, h, hairStyle, hairGrad, pal) {
        ctx.save();
        ctx.fillStyle = hairGrad;

        if (hairStyle === 0) {
            // Kiểu 0: Mái chéo dịu dàng + lọn tóc mai dài + Trâm Hoa Sen cài bên phải
            ctx.beginPath();
            ctx.moveTo(-w * 0.118, -h * 0.012);
            ctx.quadraticCurveTo(-w * 0.03, -h * 0.108, w * 0.118, -h * 0.012);
            ctx.quadraticCurveTo(w * 0.055, -h * 0.06, -w * 0.015, -h * 0.054);
            ctx.quadraticCurveTo(-w * 0.075, -h * 0.05, -w * 0.118, -h * 0.012);
            ctx.fill();

            // Lọn tóc mai mềm ôm má trái
            ctx.beginPath();
            ctx.moveTo(-w * 0.114, -h * 0.018);
            ctx.quadraticCurveTo(-w * 0.13, h * 0.035, -w * 0.095, h * 0.082);
            ctx.quadraticCurveTo(-w * 0.105, h * 0.03, -w * 0.098, -h * 0.018);
            ctx.fill();

            // Trâm Hoa Sen cài tóc + tua rua ngọc vàng
            drawSmallBlossom(ctx, w * 0.102, -h * 0.046, w * 0.032, pal.flower, pal.accent, 5);
            ctx.strokeStyle = pal.accent;
            ctx.lineWidth = w * 0.0035;
            ctx.beginPath();
            ctx.moveTo(w * 0.112, -h * 0.03);
            ctx.lineTo(w * 0.112, h * 0.018);
            ctx.stroke();
            ctx.fillStyle = '#fffdf8';
            ctx.beginPath();
            ctx.arc(w * 0.112, h * 0.022, w * 0.006, 0, Math.PI * 2);
            ctx.fill();

        } else if (hairStyle === 1) {
            // Kiểu 1: Mái bay rẽ ngôi + 2 lọn tóc mai uốn xoăn chữ S mềm mại hai bên má
            ctx.beginPath();
            ctx.moveTo(-w * 0.116, -h * 0.014);
            ctx.quadraticCurveTo(0, -h * 0.108, w * 0.116, -h * 0.014);
            ctx.quadraticCurveTo(w * 0.06, -h * 0.042, 0, -h * 0.074);
            ctx.quadraticCurveTo(-w * 0.06, -h * 0.042, -w * 0.116, -h * 0.014);
            ctx.fill();

            // Lọn tóc mai uốn lơi hai bên thái dương
            ctx.strokeStyle = pal.hair;
            ctx.lineWidth = w * 0.0085;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-w * 0.11, -h * 0.015);
            ctx.bezierCurveTo(-w * 0.138, h * 0.015, -w * 0.095, h * 0.045, -w * 0.118, h * 0.075);
            ctx.moveTo(w * 0.11, -h * 0.015);
            ctx.bezierCurveTo(w * 0.138, h * 0.015, w * 0.095, h * 0.045, w * 0.118, h * 0.075);
            ctx.stroke();

        } else if (hairStyle === 2) {
            // Kiểu 2: Mái bay phồng Hàn Quốc rẽ ngôi giữa + Kẹp ngọc trai đôi bên thái dương trái
            ctx.beginPath();
            ctx.moveTo(-w * 0.124, h * 0.004);
            ctx.bezierCurveTo(-w * 0.13, -h * 0.085, -w * 0.02, -h * 0.105, 0, -h * 0.075);
            ctx.bezierCurveTo(w * 0.02, -h * 0.105, w * 0.13, -h * 0.085, w * 0.124, h * 0.004);
            ctx.quadraticCurveTo(w * 0.085, -h * 0.045, 0, -h * 0.068);
            ctx.quadraticCurveTo(-w * 0.085, -h * 0.045, -w * 0.124, h * 0.004);
            ctx.fill();

            // Kẹp tóc ngọc trai đính vàng bên trái
            ctx.strokeStyle = pal.accent;
            ctx.lineWidth = w * 0.006;
            ctx.beginPath();
            ctx.moveTo(-w * 0.115, -h * 0.036);
            ctx.lineTo(-w * 0.072, -h * 0.046);
            ctx.stroke();
            for (let k = 0; k < 3; k++) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(-w * 0.11 + k * w * 0.016, -h * 0.037 - k * h * 0.003, w * 0.0065, 0, Math.PI * 2);
                ctx.fill();
            }

        } else if (hairStyle === 3) {
            // Kiểu 3: Tóc Bob mái thưa Hàn Quốc (Airy See-Through Bangs) + Kẹp hoa cúc họa mi
            // Phần vòm tóc trên trán
            ctx.beginPath();
            ctx.moveTo(-w * 0.12, -h * 0.018);
            ctx.quadraticCurveTo(0, -h * 0.11, w * 0.12, -h * 0.018);
            ctx.quadraticCurveTo(0, -h * 0.068, -w * 0.12, -h * 0.018);
            ctx.fill();

            // Các lọn mái thưa mảnh rơi nhẹ trên trán
            ctx.strokeStyle = pal.hair;
            ctx.lineWidth = w * 0.0075;
            ctx.lineCap = 'round';
            const wisps = [-0.065, -0.038, -0.012, 0.014, 0.04, 0.066];
            wisps.forEach((wx, idx) => {
                ctx.beginPath();
                ctx.moveTo(w * wx, -h * 0.072);
                ctx.quadraticCurveTo(w * (wx + (idx < 3 ? -0.006 : 0.006)), -h * 0.045, w * wx, -h * 0.026);
                ctx.stroke();
            });

            // Hai nhánh tóc Bob ôm sát hai bên má và uốn cụp vào cằm
            ctx.fillStyle = hairGrad;
            ctx.beginPath();
            ctx.moveTo(-w * 0.112, -h * 0.025);
            ctx.quadraticCurveTo(-w * 0.145, h * 0.045, -w * 0.075, h * 0.088);
            ctx.quadraticCurveTo(-w * 0.108, h * 0.04, -w * 0.102, -h * 0.025);
            ctx.moveTo(w * 0.112, -h * 0.025);
            ctx.quadraticCurveTo(w * 0.145, h * 0.045, w * 0.075, h * 0.088);
            ctx.quadraticCurveTo(w * 0.108, h * 0.04, w * 0.102, -h * 0.025);
            ctx.fill();

            // Kẹp Hoa Cúc Họa Mi trắng nhụy vàng cài bên mái phải
            drawSmallBlossom(ctx, w * 0.096, -h * 0.042, w * 0.028, '#ffffff', '#f2b73f', 8);

        } else if (hairStyle === 4) {
            // Kiểu 4: Bím tóc tết vương miện đính ngọc trai (Braided Pearl Crown)
            ctx.beginPath();
            ctx.moveTo(-w * 0.116, -h * 0.016);
            ctx.quadraticCurveTo(w * 0.02, -h * 0.105, w * 0.118, -h * 0.012);
            ctx.quadraticCurveTo(w * 0.04, -h * 0.056, -w * 0.116, -h * 0.016);
            ctx.fill();

            // Vòng bím tóc tết vương miện đính ngọc trai lấp lánh trên đỉnh đầu
            for (let b = -4; b <= 4; b++) {
                const bx = b * w * 0.022;
                const by = -h * 0.078 + (b * b) * h * 0.0022;
                ctx.fillStyle = pal.hairHi;
                ctx.beginPath();
                ctx.ellipse(bx, by, w * 0.015, h * 0.009, b * 0.12, 0, Math.PI * 2);
                ctx.fill();

                if (b % 2 === 0) {
                    ctx.fillStyle = '#fffdf7';
                    ctx.beginPath();
                    ctx.arc(bx, by - h * 0.002, w * 0.006, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Lọn tóc uốn sóng vắt qua vai phải
            ctx.fillStyle = hairGrad;
            ctx.beginPath();
            ctx.moveTo(w * 0.102, h * 0.02);
            ctx.bezierCurveTo(w * 0.155, h * 0.08, w * 0.12, h * 0.16, w * 0.065, h * 0.22);
            ctx.bezierCurveTo(w * 0.095, h * 0.14, w * 0.11, h * 0.07, w * 0.092, h * 0.02);
            ctx.fill();

        } else {
            // Kiểu 5: Mái uốn sóng cổ điển Pháp (French Vintage S-Wave Bang)
            ctx.beginPath();
            ctx.moveTo(-w * 0.118, -h * 0.01);
            ctx.bezierCurveTo(-w * 0.08, -h * 0.11, w * 0.08, -h * 0.105, w * 0.118, -h * 0.006);
            ctx.bezierCurveTo(w * 0.065, -h * 0.032, w * 0.015, -h * 0.068, -w * 0.045, -h * 0.056);
            ctx.quadraticCurveTo(-w * 0.09, -h * 0.048, -w * 0.118, -h * 0.01);
            ctx.fill();
        }

        ctx.restore();
    }

    // Vẽ đôi mắt có hồn với 3 trạng thái: Mở long lanh (1.0) -> Chớp nửa mắt (0.45) -> Nhắm dịu dàng (0.0)
    function drawExpressiveEyes(ctx, w, h, pal, eyeOpenness) {
        const eyePositions = [-w * 0.046, w * 0.046];
        const eyeY = -h * 0.002;

        eyePositions.forEach((ex, idx) => {
            const isLeft = idx === 0;
            const dir = isLeft ? -1 : 1;

            // Nếp mí mắt đôi dịu dàng phía trên
            ctx.strokeStyle = 'rgba(160, 105, 95, 0.38)';
            ctx.lineWidth = Math.max(0.9, w * 0.0032);
            ctx.beginPath();
            ctx.arc(ex, eyeY - h * 0.002, w * 0.022, 1.15 * Math.PI, 1.85 * Math.PI);
            ctx.stroke();

            if (eyeOpenness > 0.15) {
                // Trạng thái MỞ MẮT (1.0) hoặc ĐANG CHỚP (0.45)
                const openScale = eyeOpenness;
                const rx = w * 0.021;
                const ry = h * 0.0115 * openScale;

                ctx.save();
                // 1. Tròng trắng mắt hạnh nhân
                ctx.beginPath();
                ctx.ellipse(ex, eyeY, rx, ry, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#fffdfa';
                ctx.fill();
                ctx.clip();

                // 2. Con ngươi (Iris) sâu thẳm giàu cảm xúc
                const irisR = w * 0.0138;
                const irisGrad = ctx.createLinearGradient(ex, eyeY - irisR, ex, eyeY + irisR);
                irisGrad.addColorStop(0, pal.hair);
                irisGrad.addColorStop(0.65, pal.hairHi);
                irisGrad.addColorStop(1, '#7a5244');
                ctx.fillStyle = irisGrad;
                ctx.beginPath();
                ctx.arc(ex, eyeY, irisR, 0, Math.PI * 2);
                ctx.fill();

                // 3. Đồng tử (Pupil)
                ctx.fillStyle = '#121715';
                ctx.beginPath();
                ctx.arc(ex, eyeY, irisR * 0.48, 0, Math.PI * 2);
                ctx.fill();

                // 4. Hai đốm sáng long lanh trong mắt (Dual Catchlights)
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(ex + w * 0.0048, eyeY - h * 0.0038, w * 0.0046, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                ctx.beginPath();
                ctx.arc(ex - w * 0.0042, eyeY + h * 0.0032, w * 0.0024, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // 5. Đường viền mí trên sắc nét & lông mi cong vút ở đuôi mắt
                ctx.strokeStyle = pal.hair;
                ctx.lineCap = 'round';
                ctx.lineWidth = Math.max(1.6, w * 0.0065);
                ctx.beginPath();
                ctx.ellipse(ex, eyeY + h * 0.001, rx * 1.04, ry * 1.02, 0, 1.08 * Math.PI, 1.92 * Math.PI);
                ctx.stroke();

                // Lông mi cong ở đuôi mắt
                ctx.lineWidth = Math.max(1.2, w * 0.0045);
                ctx.beginPath();
                ctx.moveTo(ex + dir * rx * 0.92, eyeY - ry * 0.2);
                ctx.quadraticCurveTo(ex + dir * rx * 1.22, eyeY - ry * 0.55, ex + dir * rx * 1.32, eyeY - ry * 0.95);
                ctx.moveTo(ex + dir * rx * 0.65, eyeY - ry * 0.72);
                ctx.quadraticCurveTo(ex + dir * rx * 0.9, eyeY - ry * 1.1, ex + dir * rx * 1.02, eyeY - ry * 1.38);
                ctx.stroke();
            } else {
                // Trạng thái NHẮM MẮT DỊU DÀNG (0.0) với hàng mi dài cong vút
                ctx.strokeStyle = pal.hair;
                ctx.lineCap = 'round';
                ctx.lineWidth = Math.max(1.6, w * 0.0066);
                ctx.beginPath();
                ctx.arc(ex, eyeY - h * 0.003, w * 0.022, 0.14 * Math.PI, 0.86 * Math.PI);
                ctx.stroke();

                // Hàng mi rủ nhẹ khi nhắm mắt
                ctx.lineWidth = Math.max(1.1, w * 0.0042);
                const lashAngles = [0.24, 0.42, 0.6, 0.78];
                lashAngles.forEach(la => {
                    const a = la * Math.PI;
                    const sx = ex + Math.cos(a) * w * 0.022;
                    const sy = (eyeY - h * 0.003) + Math.sin(a) * w * 0.022;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(sx + dir * w * 0.004, sy + h * 0.0055);
                    ctx.stroke();
                });
            }
        });
    }

    function drawLuxuryMuseIllustration(ctx, w, h, styleIdx, eyeOpenness = 1.0) {
        ctx.save();
        const variant = styleIdx % 6;

        const palettes = [
            // 0: Ngọc Bích Hoàng Gia & Bạch Liên Hoa (Tóc Dài Suôn Thẳng & Trâm Sen)
            {
                top: '#c3ecdc', mid: '#f2fbf7', bot: '#8ed3b9',
                sun: 'rgba(255, 244, 206, 0.72)',
                dress1: '#128769', dress2: '#074837',
                hair: '#192a24', hairHi: '#355449',
                flower: '#fff7fa', petal: '#ffb7c5', accent: '#e5b84b'
            },
            // 1: Vườn Đào Kyoto Mùa Xuân (Tóc Búi Cao & Nơ Lụa Hồng)
            {
                top: '#ffdce9', mid: '#fff6fa', bot: '#f4b6ce',
                sun: 'rgba(255, 247, 222, 0.75)',
                dress1: '#de5b8a', dress2: '#9e2451',
                hair: '#341d26', hairHi: '#633949',
                flower: '#ffb7c5', petal: '#ffd4e0', accent: '#f0c659'
            },
            // 2: Nắng Thu Vàng Champagne (Tóc Xoăn Sóng Nước Bồng Bềnh & Kẹp Ngọc Trai)
            {
                top: '#fcedcc', mid: '#fffcf4', bot: '#cfeadd',
                sun: 'rgba(255, 236, 179, 0.8)',
                dress1: '#cf992e', dress2: '#8c610e',
                hair: '#382417', hairHi: '#6b4932',
                flower: '#ffffff', petal: '#ffe4ec', accent: '#0f7b5f'
            },
            // 3: Thảo Nguyên Cúc Họa Mi (Tóc Ngắn Bob Uốn Cụp & Mái Thưa Hàn Quốc)
            {
                top: '#d5f2e6', mid: '#ffffff', bot: '#b5e2ce',
                sun: 'rgba(255, 249, 219, 0.75)',
                dress1: '#1a9474', dress2: '#0a5743',
                hair: '#22302b', hairHi: '#425e54',
                flower: '#ffffff', petal: '#fff3b8', accent: '#f2b73f'
            },
            // 4: Dạ Khúc Ánh Trăng (Tóc Tết Vương Miện Ngọc Trai & Vắt Lệch Vai)
            {
                top: '#cde7df', mid: '#f4fbf8', bot: '#a3d5c6',
                sun: 'rgba(255, 245, 214, 0.7)',
                dress1: '#0e6b54', dress2: '#05382b',
                hair: '#182521', hairHi: '#345249',
                flower: '#ffd6e4', petal: '#ffffff', accent: '#f7df94'
            },
            // 5: Vườn Hồng Pháp Rose-Gold (Tóc Búi Thấp Trễ Nải & Hoa Hồng Cài Gáy)
            {
                top: '#fde2d9', mid: '#fff8f5', bot: '#f2bfb0',
                sun: 'rgba(255, 242, 209, 0.76)',
                dress1: '#c96557', dress2: '#8a392d',
                hair: '#36201d', hairHi: '#633c36',
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

        // 2. Luồng nắng thu chiếu xiên (Golden Hour Sunbeams)
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

        // Đốm sáng Bokeh lung linh
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

        // 4. Vòm cành lá phía sau vai nhân vật
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

        // 5. Vẽ Nàng Thơ Thanh Lịch với 6 Kiểu Tóc Đa Dạng
        const cx = w * 0.5;
        const cy = h * 0.47;
        const headTilt = (variant % 2 === 0 ? -0.028 : 0.028);

        const hairGrad = ctx.createLinearGradient(cx, cy - h * 0.26, cx, cy + h * 0.28);
        hairGrad.addColorStop(0, pal.hairHi);
        hairGrad.addColorStop(0.35, pal.hair);
        hairGrad.addColorStop(1, '#101a17');

        // Lớp tóc sau lưng/đầu theo từng kiểu tóc (0..5)
        drawBackHairstyle(ctx, cx, cy, w, h, variant, hairGrad, pal);

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

        // Nếp gấp lụa mềm mại trên áo
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

        // Gương mặt trái xoan thanh tú
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
        const blushL = ctx.createRadialGradient(-w * 0.056, h * 0.015, 0, -w * 0.056, h * 0.015, w * 0.038);
        blushL.addColorStop(0, 'rgba(238, 108, 146, 0.34)');
        blushL.addColorStop(1, 'rgba(238, 108, 146, 0)');
        ctx.fillStyle = blushL;
        ctx.beginPath();
        ctx.arc(-w * 0.056, h * 0.015, w * 0.038, 0, Math.PI * 2);
        ctx.fill();

        const blushR = ctx.createRadialGradient(w * 0.056, h * 0.015, 0, w * 0.056, h * 0.015, w * 0.038);
        blushR.addColorStop(0, 'rgba(238, 108, 146, 0.34)');
        blushR.addColorStop(1, 'rgba(238, 108, 146, 0)');
        ctx.fillStyle = blushR;
        ctx.beginPath();
        ctx.arc(w * 0.056, h * 0.015, w * 0.038, 0, Math.PI * 2);
        ctx.fill();

        // Đôi mày lá liễu thanh thoát
        ctx.strokeStyle = pal.hair;
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(1.3, w * 0.0052);
        ctx.beginPath();
        ctx.moveTo(-w * 0.074, -h * 0.022);
        ctx.quadraticCurveTo(-w * 0.048, -h * 0.033, -w * 0.02, -h * 0.023);
        ctx.moveTo(w * 0.02, -h * 0.023);
        ctx.quadraticCurveTo(w * 0.048, -h * 0.033, w * 0.074, -h * 0.022);
        ctx.stroke();

        // Vẽ đôi mắt có hồn (hỗ trợ cả Mở mắt long lanh & Nhắm mắt mỉm cười)
        drawExpressiveEyes(ctx, w, h, pal, eyeOpenness);

        // Sống mũi thanh tú
        ctx.strokeStyle = 'rgba(205, 145, 130, 0.45)';
        ctx.lineWidth = Math.max(1, w * 0.0038);
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.008);
        ctx.quadraticCurveTo(-w * 0.005, h * 0.015, 0, h * 0.02);
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

        // Vẽ phần tóc mái phía trước & trâm/kẹp/bím tóc theo đúng kiểu tóc (0..5)
        drawFrontHairstyle(ctx, w, h, variant, hairGrad, pal);

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

        // 7. Cánh hoa anh đào bay lơ lửng ở tiền cảnh (Foreground Petals)
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

    // ====== 5. VẼ THIỆP MẪU & ĐỆM 3 TRẠNG THÁI NHÁY MẮT (MỞ - NỬA NHẮM - NHẮM) SIÊU MƯỢT ======
    function createOffscreenBuffer(w, h) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    }

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

        if (!theme) return;

        // Vẽ 1 lần lớp Khung Concept + Cầu nối + Hộp lời chúc vào overlayCanvas để tái sử dụng cho 3 pha nháy mắt
        const overlayCanvas = createOffscreenBuffer(targetW, targetH);
        const oCtx = overlayCanvas.getContext('2d');

        if (typeof drawBottomAmbientDecor === 'function') {
            drawBottomAmbientDecor(oCtx, targetW, originH, textSpaceHeight, scale, theme);
        }
        if (typeof renderConceptOverlayToCtx === 'function') {
            renderConceptOverlayToCtx(oCtx, concept, targetW, originH, theme, false);
        }

        const marginX = Math.floor(targetW * 0.056);
        const boxX = marginX;
        const boxY = originH + Math.floor(textSpaceHeight * 0.085);
        const boxW = targetW - marginX * 2;
        const boxH = Math.floor(textSpaceHeight * 0.82);
        const radius = Math.floor(targetW * 0.034);

        const recipientLine = SAMPLE_RECIPIENTS[conceptIdx % SAMPLE_RECIPIENTS.length];
        const activeQuote = SAMPLE_WISHES[conceptIdx % SAMPLE_WISHES.length];

        if (typeof drawOrnamentalBridge === 'function') {
            drawOrnamentalBridge(oCtx, targetW / 2, originH, boxY, scale, theme, concept);
        }
        if (typeof drawRomanticQuoteBox === 'function') {
            drawRomanticQuoteBox(oCtx, boxX, boxY, boxW, boxH, radius, scale, theme, borderStyle, concept);
        }
        if (typeof fitQuoteInBox === 'function' && typeof drawQuoteContent === 'function') {
            const layout = fitQuoteInBox(oCtx, activeQuote, recipientLine, boxW, boxH, scale, borderStyle);
            drawQuoteContent(oCtx, boxX, boxY, boxW, boxH, layout, theme, scale);
        }

        // Hàm nội bộ dựng nhanh 1 frame hoàn chỉnh ứng với độ mở mắt (1.0 = mở, 0.45 = chớp, 0.0 = nhắm)
        function buildEyeStateCanvas(eyeOpenness) {
            const buf = createOffscreenBuffer(targetW, targetH);
            const bCtx = buf.getContext('2d');
            const cornerR = 30;

            bCtx.save();
            bCtx.beginPath();
            if (typeof bCtx.roundRect === 'function') {
                bCtx.roundRect(0, 0, targetW, targetH, cornerR);
            } else {
                bCtx.moveTo(cornerR, 0);
                bCtx.arcTo(targetW, 0, targetW, targetH, cornerR);
                bCtx.arcTo(targetW, targetH, 0, targetH, cornerR);
                bCtx.arcTo(0, targetH, 0, 0, cornerR);
                bCtx.arcTo(0, 0, targetW, 0, cornerR);
                bCtx.closePath();
            }
            bCtx.clip();

            const fullGrad = bCtx.createLinearGradient(0, 0, 0, targetH);
            fullGrad.addColorStop(0, theme.canvasBgStart);
            fullGrad.addColorStop(0.5, theme.canvasBgMid);
            fullGrad.addColorStop(1, theme.canvasBgEnd);
            bCtx.fillStyle = fullGrad;
            bCtx.fillRect(0, 0, targetW, targetH);

            bCtx.save();
            if (typeof traceConceptPhotoWindow === 'function') {
                bCtx.beginPath();
                traceConceptPhotoWindow(bCtx, concept, targetW, originH, scale);
                bCtx.clip();
            }
            drawLuxuryMuseIllustration(bCtx, targetW, originH, conceptIdx, eyeOpenness);
            bCtx.restore();

            bCtx.drawImage(overlayCanvas, 0, 0);
            bCtx.restore();
            return buf;
        }

        cardEl._eyeFrames = {
            open: buildEyeStateCanvas(1.0),
            half: buildEyeStateCanvas(0.45),
            closed: buildEyeStateCanvas(0.0)
        };
        cardEl._isBlinking = false;

        // Mặc định hiển thị trạng thái mắt mở long lanh
        ctx.clearRect(0, 0, targetW, targetH);
        ctx.drawImage(cardEl._eyeFrames.open, 0, 0);
    }

    // Hiệu ứng nháy mắt tự nhiên trên 1 tấm thiệp (Mở -> Nửa nhắm -> Nhắm -> Nửa nhắm -> Mở)
    function triggerCardBlink(cardEl, isDoubleBlink = false) {
        if (!cardEl || !cardEl._eyeFrames || cardEl._isBlinking) return;
        const canvas = cardEl.querySelector('canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const frames = cardEl._eyeFrames;

        cardEl._isBlinking = true;

        const paintFrame = (img) => {
            if (!img) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };

        // Nhịp chớp mắt 1
        paintFrame(frames.half);
        setTimeout(() => paintFrame(frames.closed), 55);
        setTimeout(() => paintFrame(frames.half), 185);
        setTimeout(() => {
            paintFrame(frames.open);
            if (!isDoubleBlink) {
                cardEl._isBlinking = false;
            }
        }, 240);

        // Nếu là nháy mắt kép (Double-Blink duyên dáng khi thiệp vừa trượt ra giữa)
        if (isDoubleBlink) {
            setTimeout(() => paintFrame(frames.half), 360);
            setTimeout(() => paintFrame(frames.closed), 410);
            setTimeout(() => paintFrame(frames.half), 550);
            setTimeout(() => {
                paintFrame(frames.open);
                cardEl._isBlinking = false;
            }, 605);
        }
    }

    function startNaturalBlinkLoop() {
        stopNaturalBlinkLoop();
        blinkLoopTimerId = setInterval(() => {
            if (document.hidden || !step1El.classList.contains('active') || !step1El.classList.contains('envelope-opened')) {
                return;
            }
            blinkStepCount++;
            // Luôn ưu tiên nháy mắt cho tấm thiệp chính giữa, xen kẽ nháy mắt cho 2 tấm thiệp hai bên
            const centerCard = activeFanSlots[1];
            const leftCard = activeFanSlots[0];
            const rightCard = activeFanSlots[2];

            triggerCardBlink(centerCard, blinkStepCount % 3 === 0);

            if (blinkStepCount % 2 === 0) {
                setTimeout(() => triggerCardBlink(leftCard, false), 420);
            } else {
                setTimeout(() => triggerCardBlink(rightCard, false), 520);
            }
        }, 2350);
    }

    function stopNaturalBlinkLoop() {
        if (blinkLoopTimerId) {
            clearInterval(blinkLoopTimerId);
            blinkLoopTimerId = null;
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

        // Khi tấm thiệp mới vừa trượt vào chính giữa -> chớp mắt duyên dáng chào người xem
        setTimeout(() => {
            triggerCardBlink(activeFanSlots[1], false);
        }, 380);

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

        setTimeout(() => {
            triggerCardBlink(activeFanSlots[1], false);
        }, 380);

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
            window.CardAudio?.playCardFanSwipe(false);
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
            window.CardAudio?.playCardFanSwipe(true);

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
                window.CardAudio?.playCardFanSwipe(true);
                startFanAutoCycle();
            }
        });
    }

    // ====== 7. NÚT "TẠO THIỆP MỪNG 20.10" -> CHỌN CHẾ ĐỘ ("LỜI CHÚC DÀNH CHO BẠN" / "SOẠN CHO NGƯỜI THÂN") -> 2 NÚT CHỌN HÌNH ======
    const step1CtaModes = document.getElementById('step1-cta-modes');
    const modeSelfWishBtn = document.getElementById('mode-self-wish-btn');
    const modeCustomGiftBtn = document.getElementById('mode-custom-gift-btn');
    const step1BackModeBtn = document.getElementById('step1-back-mode-btn');

    window.selectedCreationFlow = 'gift'; // 'self' ("Lời chúc dành cho bạn") | 'gift' ("Soạn lời chúc cho người thân")

    if (startCreateCardBtn && uploadWrapperEl) {
        startCreateCardBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            uploadWrapperEl.classList.remove('cta-expanded');
            uploadWrapperEl.classList.add('cta-stage-modes');
            startCreateCardBtn.setAttribute('aria-expanded', 'true');
            if (step1CtaModes) step1CtaModes.setAttribute('aria-hidden', 'false');
            if (step1CtaChoices) step1CtaChoices.setAttribute('aria-hidden', 'true');
            if (typeof spawnTouchSparkle === 'function') {
                const rect = startCreateCardBtn.getBoundingClientRect();
                spawnTouchSparkle(rect.left + rect.width / 2, rect.top + rect.height / 2, 10);
            }
        });
    }

    function selectStep1FlowMode(mode, triggerBtn) {
        window.selectedCreationFlow = mode === 'self' ? 'self' : 'gift';
        if (uploadWrapperEl) {
            uploadWrapperEl.classList.remove('cta-stage-modes');
            uploadWrapperEl.classList.add('cta-expanded');
        }
        if (step1CtaModes) step1CtaModes.setAttribute('aria-hidden', 'true');
        if (step1CtaChoices) step1CtaChoices.setAttribute('aria-hidden', 'false');
        if (triggerBtn && typeof spawnTouchSparkle === 'function') {
            const rect = triggerBtn.getBoundingClientRect();
            spawnTouchSparkle(rect.left + rect.width / 2, rect.top + rect.height / 2, 10);
        }
    }

    if (modeSelfWishBtn) {
        modeSelfWishBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectStep1FlowMode('self', modeSelfWishBtn);
        });
    }

    if (modeCustomGiftBtn) {
        modeCustomGiftBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectStep1FlowMode('gift', modeCustomGiftBtn);
        });
    }

    if (step1BackModeBtn && uploadWrapperEl) {
        step1BackModeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            uploadWrapperEl.classList.remove('cta-expanded');
            uploadWrapperEl.classList.add('cta-stage-modes');
            if (step1CtaModes) step1CtaModes.setAttribute('aria-hidden', 'false');
            if (step1CtaChoices) step1CtaChoices.setAttribute('aria-hidden', 'true');
        });
    }

    let activeMorphCleanupTimers = [];
    let pendingMorphOrigin = null;
    let morphHasStarted = false;

    function clearActiveMorphTimers() {
        activeMorphCleanupTimers.forEach((t) => clearTimeout(t));
        activeMorphCleanupTimers = [];
    }

    function captureStep1OriginForMorph() {
        clearActiveMorphTimers();
        morphHasStarted = false;
        stopFanAutoCycle();
        stopNaturalBlinkLoop();

        let originCx = window.innerWidth / 2;
        let originCy = window.innerHeight * 0.44;
        let originW = Math.min(window.innerWidth * 0.48, 190);

        const centerCard = activeFanSlots[1] || heroFanShowcase;
        if (centerCard) {
            const cRect = centerCard.getBoundingClientRect();
            if (cRect.width > 20 && cRect.height > 20) {
                originCx = cRect.left + cRect.width / 2;
                originCy = cRect.top + cRect.height * 0.44;
                originW = Math.max(cRect.width * 1.06, 156);
            }
        }

        let boxCy = window.innerHeight / 2;
        let boxW = Math.min(window.innerWidth * 0.92, 430);
        let boxH = Math.min(window.innerHeight * 0.72, 540);
        if (step1MainCard) {
            const bRect = step1MainCard.getBoundingClientRect();
            if (bRect.width > 80 && bRect.height > 80) {
                boxCy = bRect.top + bRect.height / 2;
                boxW = bRect.width;
                boxH = bRect.height;
            }
        }

        pendingMorphOrigin = { originCx, originCy, originW, boxCy, boxW, boxH };

        // Phòng hờ ảnh quá lớn giải mã lâu hơn 1200ms thì vẫn tự động chạy chuyển cảnh mượt
        activeMorphCleanupTimers.push(setTimeout(() => {
            if (!morphHasStarted && typeof window.onStep2CropperReadyForMorph === 'function') {
                window.onStep2CropperReadyForMorph();
            }
        }, 1200));
    }

    // Được gọi từ initCropper.ready() trong script.js sau khi toàn bộ tác vụ nặng (Cropper + giải mã ảnh GPU .decode() + vẽ Canvas) đã xong 100%
    window.onStep2CropperReadyForMorph = function () {
        if (morphHasStarted || !step2El) return;
        morphHasStarted = true;
        window.isStep2Morphing = true;
        clearActiveMorphTimers();
        if (window.DevicePerfGovernor && typeof window.DevicePerfGovernor.beginTransition === 'function') {
            window.DevicePerfGovernor.beginTransition('step2-morph', 680);
        }

        // Nhịp RAF 1: Khi #step-2 vẫn đang ở trạng thái .step2-preloading (opacity: 0.001 nằm dưới #step-1),
        // đo kích thước đích và áp sẵn .step2-morph-from để trình duyệt commit trạng thái xuất phát lên GPU Layer mà KHÔNG cần ép reflow đồng bộ!
        requestAnimationFrame(() => {
            const previewAreaWrap = document.getElementById('preview-area-wrap');
            const mainContainer = step2El.querySelector('.main-container');
            const destRect = previewAreaWrap ? previewAreaWrap.getBoundingClientRect() : null;
            const mainRect = mainContainer ? mainContainer.getBoundingClientRect() : null;

            const origin = pendingMorphOrigin || {
                originCx: window.innerWidth / 2,
                originCy: window.innerHeight * 0.44,
                originW: Math.min(window.innerWidth * 0.48, 190),
                boxCy: window.innerHeight / 2,
                boxW: Math.min(window.innerWidth * 0.92, 430),
                boxH: Math.min(window.innerHeight * 0.72, 540)
            };

            if (mainRect && mainRect.width > 80 && mainRect.height > 80) {
                const boxDy = origin.boxCy - (mainRect.top + mainRect.height / 2);
                const boxSx = Math.max(0.84, Math.min(1.0, origin.boxW / mainRect.width));
                const boxSy = Math.max(0.58, Math.min(0.92, origin.boxH / mainRect.height));
                step2El.style.setProperty('--morph-box-dy', `${boxDy.toFixed(1)}px`);
                step2El.style.setProperty('--morph-box-sx', boxSx.toFixed(3));
                step2El.style.setProperty('--morph-box-sy', boxSy.toFixed(3));
            }

            if (destRect && destRect.width > 40 && destRect.height > 40) {
                const destCx = destRect.left + destRect.width / 2;
                const destCy = destRect.top + destRect.height / 2;
                const imgDx = origin.originCx - destCx;
                const imgDy = origin.originCy - destCy;
                const imgScale = Math.max(0.56, Math.min(0.88, origin.originW / destRect.width));
                step2El.style.setProperty('--morph-img-dx', `${imgDx.toFixed(1)}px`);
                step2El.style.setProperty('--morph-img-dy', `${imgDy.toFixed(1)}px`);
                step2El.style.setProperty('--morph-img-scale', imgScale.toFixed(3));
            }

            // Đặt toàn bộ Khung nền, Tấm hình và các Element Edit vào vị trí xuất phát (.step2-morph-from) ngay khi vẫn đang ẩn dưới Bước 1
            step2El.classList.remove('step2-morph-to');
            step2El.classList.add('step2-morph-from');

            // Nhịp RAF 2: Trình duyệt đã commit trạng thái .step2-morph-from ở frame trước ->
            // Gỡ .step2-preloading, ẩn Bước 1 và kích hoạt ngay .step2-morph-to trong cùng 1 frame để chuyển động bung ra liền mạch 0ms trễ!
            requestAnimationFrame(() => {
                step2El.classList.remove('step2-preloading', 'step2-morph-from');
                if (step1El) step1El.classList.remove('active');
                step2El.classList.add('step2-morph-to');

                activeMorphCleanupTimers.push(setTimeout(() => {
                    window.isStep2Morphing = false;
                    if (window.DevicePerfGovernor && typeof window.DevicePerfGovernor.endTransition === 'function') {
                        window.DevicePerfGovernor.endTransition('step2-morph');
                    }
                    if (typeof window.onStep2MorphComplete === 'function') {
                        window.onStep2MorphComplete();
                    }
                }, 660));
            });
        });
    };

    const selfieInputEl = document.getElementById('selfie-btn');
    const uploadInputEl = document.getElementById('upload-btn');

    [selfieInputEl, uploadInputEl].forEach((inputEl) => {
        if (!inputEl) return;
        inputEl.addEventListener('change', (e) => {
            const file = e.target && e.target.files && e.target.files[0];
            if (!file) return;
            captureStep1OriginForMorph();
        }, true);
    });

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

