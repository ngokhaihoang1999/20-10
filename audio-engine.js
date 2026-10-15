/* =====================================================================================
 * audio-engine.js — HỆ THỐNG ÂM THANH PIANO PHÒNG THU THẬT (YIRUMA STUDIO BGM & PHYSICAL FOLEY)
 * -------------------------------------------------------------------------------------
 * 1. Nhạc nền (BGM): Phát trực tiếp bản thu âm Đại Dương Cầm (Concert Grand Piano) thật
 *    của Yiruma (River Flows in You, Kiss The Rain, Spring Waltz, It's Your Day) từ ./bgm/.
 *    - Tuyệt đối KHÔNG dùng bộ gảy oscillator tự động gây loạn âm hay tiếng hộp nhạc kinh dị.
 *    - Crossfade mượt mà khi chuyển chủ đề Motion, tự động giảm âm nhẹ (ducking) hoặc
 *      mở sáng âm lượng khi mở phong bì.
 * 2. Hiệu ứng vật lý (SFX): Chỉ giữ lại tiếng giấy lụa trượt nhẹ & tiếng tách sáp tự nhiên
 *    (không phát nốt nhạc điện tử đè lên bản Piano để tránh lệch tông/loạn nhạc).
 * ===================================================================================== */
(function () {
    'use strict';

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    let ctx = null;
    let sfxBus = null;
    let sfxMuteGain = null;
    let noiseBuffer = null;
    let pinkNoiseBuffer = null;

    let isBgmMuted = false;
    let isSfxMuted = false;
    let isUnlocked = false;
    let isPageHidden = false;
    let currentMotionTheme = 'bloom';
    let isEnvelopeClosedMuffled = true;
    let bgmDuckFactor = 1.0;

    // Danh sách bản thu âm Grand Piano thật của Yiruma theo từng chủ đề
    const BGM_TRACKS = {
        bloom: {
            title: 'River Flows in You — Yiruma',
            src: 'bgm/river-flows-in-you.mp3'
        },
        butterflies: {
            title: 'River Flows in You — Yiruma',
            src: 'bgm/river-flows-in-you.mp3'
        },
        galaxy: {
            title: 'Kiss The Rain — Yiruma',
            src: 'bgm/kiss-the-rain.mp3'
        },
        ribbon: {
            title: 'Spring Waltz — Yiruma',
            src: 'bgm/spring-waltz.mp3'
        },
        sakura: {
            title: 'Spring Waltz — Yiruma',
            src: 'bgm/spring-waltz.mp3'
        },
        hearts: {
            title: "It's Your Day — Yiruma",
            src: 'bgm/its-your-day.mp3'
        }
    };

    const BASE_BGM_VOLUME = 0.62;
    let bgmAudio = null;
    let currentTrackSrc = '';
    let fadeRafId = null;

    // Lưu trạng thái đồng bộ với wish-bloom.js
    let wishBloomCueState = {
        started: false,
        fall: false,
        impact: false,
        bud: false,
        open: false,
        heart: false,
        envIn: false,
        lift: false
    };

    function getTargetBgmVolume() {
        if (isBgmMuted || isPageHidden) return 0;
        const envFactor = isEnvelopeClosedMuffled ? 0.78 : 1.0;
        return Math.max(0, Math.min(1, BASE_BGM_VOLUME * envFactor * bgmDuckFactor));
    }

    function rampBgmVolume(targetVol, durationMs = 420, onDone = null) {
        if (!bgmAudio) {
            if (typeof onDone === 'function') onDone();
            return;
        }
        if (fadeRafId) {
            cancelAnimationFrame(fadeRafId);
            fadeRafId = null;
        }
        const startVol = bgmAudio.volume;
        const delta = targetVol - startVol;
        if (Math.abs(delta) < 0.005 || durationMs <= 16) {
            try {
                bgmAudio.volume = Math.max(0, Math.min(1, targetVol));
            } catch (_) {}
            if (typeof onDone === 'function') onDone();
            return;
        }
        const startTime = performance.now();
        function step(now) {
            const p = Math.min(1, (now - startTime) / durationMs);
            const ease = p * (2 - p);
            try {
                bgmAudio.volume = Math.max(0, Math.min(1, startVol + delta * ease));
            } catch (_) {}
            if (p < 1) {
                fadeRafId = requestAnimationFrame(step);
            } else {
                fadeRafId = null;
                if (typeof onDone === 'function') onDone();
            }
        }
        fadeRafId = requestAnimationFrame(step);
    }

    function ensureBgmPlayer() {
        if (bgmAudio) return bgmAudio;
        try {
            const track = BGM_TRACKS[currentMotionTheme] || BGM_TRACKS.bloom;
            currentTrackSrc = track.src;
            bgmAudio = new Audio(track.src);
            bgmAudio.loop = true;
            bgmAudio.preload = 'auto';
            bgmAudio.playsInline = true;
            bgmAudio.volume = 0;
        } catch (err) {
            console.warn('BGM Audio init skipped:', err);
        }
        return bgmAudio;
    }

    function startOrResumeBgm() {
        if (isBgmMuted || isPageHidden) return;
        const player = ensureBgmPlayer();
        if (!player) return;

        const playPromise = player.play();
        if (playPromise && typeof playPromise.then === 'function') {
            playPromise.then(() => {
                rampBgmVolume(getTargetBgmVolume(), 650);
            }).catch(() => {
                // Trình duyệt chờ tương tác người dùng đầu tiên
            });
        } else {
            rampBgmVolume(getTargetBgmVolume(), 650);
        }
    }

    function switchBgmTrackForTheme(motionId) {
        const track = BGM_TRACKS[motionId] || BGM_TRACKS.bloom;
        if (!bgmAudio) {
            currentMotionTheme = motionId;
            return;
        }
        if (currentTrackSrc === track.src) {
            return;
        }
        currentTrackSrc = track.src;

        // Crossfade mượt sang bài Piano mới
        rampBgmVolume(0, 260, () => {
            if (!bgmAudio) return;
            try {
                bgmAudio.src = track.src;
                bgmAudio.load();
                if (!isBgmMuted && !isPageHidden && isUnlocked) {
                    const p = bgmAudio.play();
                    if (p && typeof p.then === 'function') {
                        p.then(() => rampBgmVolume(getTargetBgmVolume(), 520)).catch(() => {});
                    } else {
                        rampBgmVolume(getTargetBgmVolume(), 520);
                    }
                }
            } catch (_) {}
        });
    }

    // =========================================================================
    // 2. KHỞI TẠO WEB AUDIO API CHO TIẾNG GIẤY LỤA & CON DẤU SÁP VẬT LÝ (SFX)
    // =========================================================================
    function ensureAudioContext() {
        if (ctx) return ctx;
        if (!AudioCtx) return null;

        try {
            ctx = new AudioCtx();

            sfxBus = ctx.createGain();
            sfxBus.gain.setValueAtTime(0.75, ctx.currentTime);

            sfxMuteGain = ctx.createGain();
            sfxMuteGain.gain.setValueAtTime(isSfxMuted ? 0.0001 : 1.0, ctx.currentTime);

            sfxBus.connect(sfxMuteGain);
            sfxMuteGain.connect(ctx.destination);

            buildNoiseBuffers(ctx);
        } catch (err) {
            console.warn('Web Audio SFX init skipped:', err);
        }
        return ctx;
    }

    function buildNoiseBuffers(audioCtx) {
        const rate = audioCtx.sampleRate;
        const len = Math.floor(rate * 1.5);
        noiseBuffer = audioCtx.createBuffer(1, len, rate);
        pinkNoiseBuffer = audioCtx.createBuffer(1, len, rate);

        const whiteOut = noiseBuffer.getChannelData(0);
        const pinkOut = pinkNoiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

        for (let i = 0; i < len; i++) {
            const w = Math.random() * 2 - 1;
            whiteOut[i] = w;
            b0 = 0.99886 * b0 + w * 0.0555179;
            b1 = 0.99332 * b1 + w * 0.0750759;
            b2 = 0.96900 * b2 + w * 0.1538520;
            b3 = 0.86650 * b3 + w * 0.3104856;
            b4 = 0.55000 * b4 + w * 0.5329522;
            b5 = -0.7616 * b5 - w * 0.0168980;
            pinkOut[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.042;
            b6 = w * 0.115926;
        }
    }

    function canPlayAudio() {
        if (isSfxMuted || isPageHidden) return false;
        const c = ensureAudioContext();
        if (!c) return false;
        if (c.state === 'suspended' || c.state === 'interrupted') {
            c.resume().catch(() => {});
        }
        return true;
    }

    function setEnvelopeSpatialMuffle(muffled, rampSec = 0.85) {
        isEnvelopeClosedMuffled = !!muffled;
        rampBgmVolume(getTargetBgmVolume(), Math.max(150, rampSec * 1000));
    }

    function setBgmDuck(duckFactor, holdSec = 0) {
        bgmDuckFactor = Math.max(0.25, Math.min(1.0, duckFactor));
        rampBgmVolume(getTargetBgmVolume(), 280);
        if (holdSec > 0) {
            setTimeout(() => {
                bgmDuckFactor = 1.0;
                rampBgmVolume(getTargetBgmVolume(), 600);
            }, holdSec * 1000);
        }
    }

    // =========================================================================
    // 3. HỆ THỐNG RUNG XÚC GIÁC TINH TẾ (SUBTLE HAPTIC & OPTICAL MICRO-PULSE)
    // =========================================================================
    let lastHapticTime = 0;

    function triggerSubtleHaptic(kind = 'light') {
        if (isSfxMuted || isPageHidden) return;
        const nowPerf = performance.now();
        if (kind === 'light' && nowPerf - lastHapticTime < 55) return;
        lastHapticTime = nowPerf;

        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try {
                if (kind === 'light') {
                    navigator.vibrate(6);
                } else if (kind === 'nudge') {
                    navigator.vibrate([8, 45, 10]);
                } else if (kind === 'heartbeat') {
                    navigator.vibrate(9);
                } else if (kind === 'seal_pop') {
                    navigator.vibrate(15);
                } else if (kind === 'stamp') {
                    navigator.vibrate([15, 30, 8]);
                } else if (kind === 'water_drop') {
                    navigator.vibrate([14, 35, 8]);
                } else if (kind === 'success') {
                    navigator.vibrate([8, 30, 12]);
                }
            } catch (_) {}
        }

        if (kind === 'stamp' || kind === 'seal_pop' || kind === 'water_drop') {
            const isU3d = Boolean(document.body && document.body.classList && document.body.classList.contains('u3d-stage-active'));
            const targetEl = kind === 'water_drop'
                ? document.getElementById('u3d-canvas-world')
                : (isU3d
                    ? document.getElementById('u3d-envelope-stage')
                    : document.getElementById('step1-physical-stage'));
            if (targetEl && targetEl.classList) {
                if (targetEl.style && typeof targetEl.style.setProperty === 'function') {
                    targetEl.style.setProperty('--haptic-amp', kind === 'stamp' ? '1.1' : '0.9');
                }
                targetEl.classList.remove('haptic-micro-pulse');
                void targetEl.offsetWidth;
                targetEl.classList.add('haptic-micro-pulse');
                setTimeout(() => {
                    targetEl.classList.remove('haptic-micro-pulse');
                }, 140);
            }
        }
    }

    // =========================================================================
    // 4. HIỆU ỨNG FOLEY VẬT LÝ THUẦN TÚY (KHÔNG PHÁT NỐT NHẠC GÂY LOẠN BGM)
    // =========================================================================

    function playTouchSparkle() {
        // Không phát tiếng chuông điện tử khi chạm/vuốt để giữ trọn vẹn sự trong trẻo của bản Piano Yiruma
    }

    function playUiTap() {
        if (!canPlayAudio()) return;
        triggerSubtleHaptic('light');
    }

    function playSealAttentionHint() {
        if (!canPlayAudio()) return;
        triggerSubtleHaptic('nudge');
    }

    function playMagicGlissando() {
        if (!canPlayAudio()) return;
        triggerSubtleHaptic('light');
    }

    // Tiếng Lụa / Giấy Mỹ Thuật Trượt Mềm Tự Nhiên
    function playSilkPaperWhoosh(duration = 0.36, startFreq = 360, endFreq = 860, peakGain = 0.14, pan = 0, delaySec = 0) {
        if (!canPlayAudio() || !pinkNoiseBuffer) return;
        const t0 = ctx.currentTime + Math.max(0.004, delaySec);

        const src = ctx.createBufferSource();
        src.buffer = pinkNoiseBuffer;
        src.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.setValueAtTime(2.4, t0);
        filter.frequency.setValueAtTime(startFreq, t0);
        filter.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration * 0.65);
        filter.frequency.exponentialRampToValueAtTime(Math.max(240, startFreq * 0.85), t0 + duration);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, t0);
        env.gain.linearRampToValueAtTime(peakGain * 0.75, t0 + duration * 0.28);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

        src.connect(filter);
        filter.connect(env);
        env.connect(sfxBus);

        src.start(t0, Math.random() * 0.4);
        src.stop(t0 + duration + 0.04);
    }

    // Tiếng Tách Con Dấu Sáp Vật Lý (Không kèm chùm nốt chuông điện tử)
    function playWaxSealCrack() {
        if (!canPlayAudio()) return;
        triggerSubtleHaptic('seal_pop');
        const t0 = ctx.currentTime + 0.005;

        const bodyOsc = ctx.createOscillator();
        const bodyEnv = ctx.createGain();
        bodyOsc.type = 'triangle';
        bodyOsc.frequency.setValueAtTime(175, t0);
        bodyOsc.frequency.exponentialRampToValueAtTime(65, t0 + 0.055);
        bodyEnv.gain.setValueAtTime(0.0001, t0);
        bodyEnv.gain.exponentialRampToValueAtTime(0.22, t0 + 0.005);
        bodyEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.065);
        bodyOsc.connect(bodyEnv);
        bodyEnv.connect(sfxBus);
        bodyOsc.start(t0);
        bodyOsc.stop(t0 + 0.075);

        if (noiseBuffer) {
            const snapSrc = ctx.createBufferSource();
            snapSrc.buffer = noiseBuffer;
            const snapFlt = ctx.createBiquadFilter();
            snapFlt.type = 'bandpass';
            snapFlt.frequency.setValueAtTime(2100, t0);
            snapFlt.Q.setValueAtTime(3.0, t0);
            const snapEnv = ctx.createGain();
            snapEnv.gain.setValueAtTime(0.0001, t0);
            snapEnv.gain.exponentialRampToValueAtTime(0.18, t0 + 0.003);
            snapEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.035);
            snapSrc.connect(snapFlt);
            snapFlt.connect(snapEnv);
            snapEnv.connect(sfxBus);
            snapSrc.start(t0);
            snapSrc.stop(t0 + 0.042);
        }
    }

    function playWaxSealStampImpact() {
        if (!canPlayAudio()) return;
        triggerSubtleHaptic('stamp');
        const t0 = ctx.currentTime + 0.005;

        const subOsc = ctx.createOscillator();
        const subEnv = ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(135, t0);
        subOsc.frequency.exponentialRampToValueAtTime(52, t0 + 0.11);
        subEnv.gain.setValueAtTime(0.0001, t0);
        subEnv.gain.exponentialRampToValueAtTime(0.22, t0 + 0.008);
        subEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);
        subOsc.connect(subEnv);
        subEnv.connect(sfxBus);
        subOsc.start(t0);
        subOsc.stop(t0 + 0.15);
    }

    function playStep1EnvelopeOpenSequence() {
        setEnvelopeSpatialMuffle(false, 0.85);
        if (!canPlayAudio()) return;

        playWaxSealCrack();
        setTimeout(() => {
            if (!canPlayAudio()) return;
            playSilkPaperWhoosh(0.32, 340, 780, 0.14, 0, 0.02);
            playSilkPaperWhoosh(0.45, 420, 1020, 0.18, 0, 0.38);
        }, 18);
    }

    function playStep1EnvelopeCloseSequence() {
        setTimeout(() => {
            setEnvelopeSpatialMuffle(true, 0.85);
        }, 1100);
        if (!canPlayAudio()) return;
        playSilkPaperWhoosh(0.32, 520, 820, 0.12, 0, 0.02);
        playSilkPaperWhoosh(0.42, 860, 340, 0.15, 0, 0.55);

        setTimeout(() => {
            if (!canPlayAudio()) return;
            playWaxSealStampImpact();
        }, 1100);
    }

    function playCelebrationBurst() {
        if (!canPlayAudio()) return;
        triggerSubtleHaptic('success');
    }

    function playCardFanSwipe(isManual = true) {
        if (!canPlayAudio()) return;
        if (isManual) {
            triggerSubtleHaptic('light');
            playSilkPaperWhoosh(0.20, 460, 880, 0.11, 0, 0);
        }
    }

    function playCardWinkTwinkle() {
        // Giữ yên lặng để không làm gián đoạn giai điệu Piano
    }

    function playSuccessChime() {
        if (!canPlayAudio()) return;
        triggerSubtleHaptic('success');
    }

    // =========================================================================
    // 5. ĐẠI CẢNH 3D "NỤ HOA ƯỚC NGUYỆN" (wish-bloom.js)
    // =========================================================================
    function resetWishBloomCues() {
        wishBloomCueState = {
            started: false,
            fall: false,
            impact: false,
            bud: false,
            open: false,
            heart: false,
            envIn: false,
            lift: false
        };
    }

    function updateWishBloomAudioByTau(tau, isSkipped) {
        if (!isUnlocked || isPageHidden) return;
        if (isSkipped) {
            if (!wishBloomCueState.lift) {
                wishBloomCueState.lift = true;
                setEnvelopeSpatialMuffle(true, 0.6);
                if (canPlayAudio()) {
                    playSilkPaperWhoosh(0.42, 380, 880, 0.14, 0, 0);
                }
            }
            return;
        }

        if (!wishBloomCueState.started && tau >= 0.02) {
            wishBloomCueState.started = true;
            setEnvelopeSpatialMuffle(false, 0.5);
        }

        if (!wishBloomCueState.impact && tau >= 1.59) {
            wishBloomCueState.impact = true;
            if (canPlayAudio()) {
                triggerSubtleHaptic('water_drop');
            }
        }

        if (!wishBloomCueState.envIn && tau >= 3.42) {
            wishBloomCueState.envIn = true;
            if (canPlayAudio()) {
                playSilkPaperWhoosh(0.85, 380, 820, 0.11, 0, 0.02);
            }
        }

        if (!wishBloomCueState.lift && tau >= 5.35) {
            wishBloomCueState.lift = true;
            setEnvelopeSpatialMuffle(true, 0.9);
            if (canPlayAudio()) {
                playSilkPaperWhoosh(0.55, 320, 820, 0.14, 0, 0);
            }
        }
    }

    // =========================================================================
    // 6. SÂN KHẤU ĐẠO DIỄN PHONG BÌ 3D HỢP NHẤT (director-3d.js)
    // =========================================================================
    function playUnified3DEnvelopeOpenSequence(motionId) {
        if (motionId && BGM_TRACKS[motionId]) {
            switchBgmTrackForTheme(motionId);
            currentMotionTheme = motionId;
        }
        setEnvelopeSpatialMuffle(false, 0.9);

        if (!canPlayAudio()) return;

        triggerSubtleHaptic('heartbeat');
        playSilkPaperWhoosh(0.55, 380, 880, 0.12, 0, 0.04);

        // t = 0.88s: Tách con dấu sáp vàng & mở nắp thư
        setTimeout(() => {
            if (!canPlayAudio()) return;
            playWaxSealCrack();
            playSilkPaperWhoosh(0.30, 380, 880, 0.16, 0, 0.02);
        }, 870);

        // t = 0.98s: Rút tấm thiệp giấy mỹ thuật khỏi túi phong bì
        setTimeout(() => {
            if (!canPlayAudio()) return;
            playSilkPaperWhoosh(0.95, 360, 960, 0.16, 0, 0);
        }, 980);
    }

    // =========================================================================
    // 7. CỤM 2 NÚT ĐỘC LẬP: TẮT/BẬT NHẠC NỀN (BGM) & TẮT/BẬT HIỆU ỨNG (SFX)
    // =========================================================================
    let audioClusterEl = null;
    let bgmToggleBtn = null;
    let sfxToggleBtn = null;

    function createFloatingAudioCluster() {
        if (document.getElementById('luxury-audio-cluster')) return;

        try {
            const savedBgmMute = sessionStorage.getItem('btlmvn_2010_bgm_muted');
            const savedSfxMute = sessionStorage.getItem('btlmvn_2010_sfx_muted');
            if (savedBgmMute === '1') isBgmMuted = true;
            if (savedSfxMute === '1') isSfxMuted = true;
        } catch (_) {}

        const cluster = document.createElement('div');
        cluster.id = 'luxury-audio-cluster';
        cluster.className = 'luxury-audio-cluster';
        cluster.setAttribute('role', 'group');
        cluster.setAttribute('aria-label', 'Điều khiển Nhạc nền và Âm thanh hiệu ứng');

        const bgmBtn = document.createElement('button');
        bgmBtn.type = 'button';
        bgmBtn.id = 'luxury-bgm-toggle';
        bgmBtn.className = 'luxury-audio-btn luxury-bgm-btn' + (isBgmMuted ? ' is-muted' : ' is-playing');
        bgmBtn.setAttribute('aria-pressed', String(!isBgmMuted));
        bgmBtn.setAttribute('aria-label', isBgmMuted ? 'Bật nhạc nền Piano' : 'Tắt nhạc nền Piano');
        bgmBtn.setAttribute('title', isBgmMuted ? 'Bật nhạc nền Piano Yiruma' : 'Tắt nhạc nền');
        bgmBtn.innerHTML = `
            <span class="audio-orb-ring" aria-hidden="true"></span>
            <span class="audio-icon-wrap" aria-hidden="true">
                <svg class="audio-svg-on" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18V6L19 4V16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="6.5" cy="18" r="2.8" fill="currentColor"/>
                    <circle cx="16.5" cy="16" r="2.8" fill="currentColor"/>
                </svg>
                <svg class="audio-svg-off" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18V6L19 4V16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.52"/>
                    <circle cx="6.5" cy="18" r="2.6" fill="currentColor" opacity="0.52"/>
                    <circle cx="16.5" cy="16" r="2.6" fill="currentColor" opacity="0.52"/>
                    <path d="M4 4L20 20" stroke="#ff6b8b" stroke-width="2.3" stroke-linecap="round"/>
                </svg>
            </span>
            <span class="audio-bars" aria-hidden="true">
                <i></i><i></i><i></i>
            </span>
            <span class="audio-pill-label" id="luxury-bgm-label">${isBgmMuted ? 'Tắt nhạc' : 'Nhạc nền'}</span>
        `;

        const sfxBtn = document.createElement('button');
        sfxBtn.type = 'button';
        sfxBtn.id = 'luxury-sfx-toggle';
        sfxBtn.className = 'luxury-audio-btn luxury-sfx-btn' + (isSfxMuted ? ' is-muted' : ' is-playing');
        sfxBtn.setAttribute('aria-pressed', String(!isSfxMuted));
        sfxBtn.setAttribute('aria-label', isSfxMuted ? 'Bật âm thanh hiệu ứng' : 'Tắt âm thanh hiệu ứng');
        sfxBtn.setAttribute('title', isSfxMuted ? 'Bật hiệu ứng âm thanh & rung nhẹ' : 'Tắt hiệu ứng âm thanh & rung nhẹ');
        sfxBtn.innerHTML = `
            <span class="audio-icon-wrap" aria-hidden="true">
                <svg class="audio-svg-on" viewBox="0 0 24 24" fill="none">
                    <path d="M11 5L6 9H2V15H6L11 19V5Z" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M15.5 8.5C16.8 9.8 16.8 14.2 15.5 15.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
                    <path d="M19 5.5L20.2 3.2L21.4 5.5L23.7 6.7L21.4 7.9L20.2 10.2L19 7.9L16.7 6.7L19 5.5Z" fill="currentColor"/>
                </svg>
                <svg class="audio-svg-off" viewBox="0 0 24 24" fill="none">
                    <path d="M11 5L6 9H2V15H6L11 19V5Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.52"/>
                    <path d="M22 9L16 15" stroke="#ff6b8b" stroke-width="2.3" stroke-linecap="round"/>
                    <path d="M16 9L22 15" stroke="#ff6b8b" stroke-width="2.3" stroke-linecap="round"/>
                </svg>
            </span>
            <span class="audio-pill-label" id="luxury-sfx-label">${isSfxMuted ? 'Tắt SFX' : 'Hiệu ứng'}</span>
        `;

        bgmBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            unlockAudioOnFirstGesture();
            toggleBgmMute();
        });

        sfxBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            unlockAudioOnFirstGesture();
            toggleSfxMute();
        });

        cluster.appendChild(bgmBtn);
        cluster.appendChild(sfxBtn);
        document.body.appendChild(cluster);

        audioClusterEl = cluster;
        bgmToggleBtn = bgmBtn;
        sfxToggleBtn = sfxBtn;

        try {
            window.dispatchEvent(new Event('resize'));
        } catch (_) {}
    }

    function updateBgmButtonUI() {
        if (!bgmToggleBtn) return;
        bgmToggleBtn.classList.toggle('is-muted', isBgmMuted);
        bgmToggleBtn.classList.toggle('is-playing', !isBgmMuted);
        bgmToggleBtn.setAttribute('aria-pressed', String(!isBgmMuted));
        bgmToggleBtn.setAttribute('aria-label', isBgmMuted ? 'Bật nhạc nền Piano' : 'Tắt nhạc nền Piano');
        bgmToggleBtn.setAttribute('title', isBgmMuted ? 'Bật nhạc nền Piano Yiruma' : 'Tắt nhạc nền');
        const lbl = document.getElementById('luxury-bgm-label');
        if (lbl) lbl.textContent = isBgmMuted ? 'Tắt nhạc' : 'Nhạc nền';
    }

    function updateSfxButtonUI() {
        if (!sfxToggleBtn) return;
        sfxToggleBtn.classList.toggle('is-muted', isSfxMuted);
        sfxToggleBtn.classList.toggle('is-playing', !isSfxMuted);
        sfxToggleBtn.setAttribute('aria-pressed', String(!isSfxMuted));
        sfxToggleBtn.setAttribute('aria-label', isSfxMuted ? 'Bật âm thanh hiệu ứng' : 'Tắt âm thanh hiệu ứng');
        sfxToggleBtn.setAttribute('title', isSfxMuted ? 'Bật hiệu ứng âm thanh & rung nhẹ' : 'Tắt hiệu ứng âm thanh & rung nhẹ');
        const lbl = document.getElementById('luxury-sfx-label');
        if (lbl) lbl.textContent = isSfxMuted ? 'Tắt SFX' : 'Hiệu ứng';
    }

    function toggleBgmMute(forceState) {
        isBgmMuted = typeof forceState === 'boolean' ? forceState : !isBgmMuted;
        try {
            sessionStorage.setItem('btlmvn_2010_bgm_muted', isBgmMuted ? '1' : '0');
        } catch (_) {}

        updateBgmButtonUI();

        const player = ensureBgmPlayer();
        if (!player) return;

        if (isBgmMuted) {
            rampBgmVolume(0, 220, () => {
                if (isBgmMuted && bgmAudio) {
                    try { bgmAudio.pause(); } catch (_) {}
                }
            });
        } else {
            startOrResumeBgm();
        }
    }

    function toggleSfxMute(forceState) {
        isSfxMuted = typeof forceState === 'boolean' ? forceState : !isSfxMuted;
        try {
            sessionStorage.setItem('btlmvn_2010_sfx_muted', isSfxMuted ? '1' : '0');
        } catch (_) {}

        updateSfxButtonUI();

        if (!ctx || !sfxMuteGain) return;
        const now = ctx.currentTime;
        sfxMuteGain.gain.cancelScheduledValues(now);
        if (isSfxMuted) {
            sfxMuteGain.gain.setValueAtTime(Math.max(0.0001, sfxMuteGain.gain.value), now);
            sfxMuteGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        } else {
            if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
                ctx.resume().catch(() => {});
            }
            sfxMuteGain.gain.setValueAtTime(0.0001, now);
            sfxMuteGain.gain.exponentialRampToValueAtTime(1.0, now + 0.14);
            triggerSubtleHaptic('light');
        }
    }

    // =========================================================================
    // 8. TỰ ĐỘNG MỞ KHÓA ÂM THANH TRÊN IOS / ZALO / TELEGRAM & KẾT NỐI SỰ KIỆN
    // =========================================================================
    function unlockAudioOnFirstGesture() {
        ensureBgmPlayer();

        if (!isUnlocked) {
            isUnlocked = true;
            startOrResumeBgm();
        } else if (bgmAudio && bgmAudio.paused && !isBgmMuted && !isPageHidden) {
            startOrResumeBgm();
        }

        const c = ensureAudioContext();
        if (c && (c.state === 'suspended' || c.state === 'interrupted')) {
            c.resume().catch(() => {});
        }
    }

    function bindGlobalInteractionSounds() {
        // Khởi tạo trước bộ phát nhạc để tải sẵn buffer MP3 ngay khi mở trang
        ensureBgmPlayer();

        const unlockEvents = ['pointerdown', 'touchstart', 'keydown', 'click'];
        const onFirstGesture = () => {
            unlockAudioOnFirstGesture();
        };
        unlockEvents.forEach((evt) => {
            window.addEventListener(evt, onFirstGesture, { capture: true, passive: true });
        });

        document.addEventListener('visibilitychange', () => {
            isPageHidden = document.hidden;
            if (document.hidden) {
                if (bgmAudio && !bgmAudio.paused) {
                    try { bgmAudio.pause(); } catch (_) {}
                }
                if (ctx && ctx.state === 'running') {
                    ctx.suspend().catch(() => {});
                }
            } else {
                if (!isBgmMuted && isUnlocked) {
                    startOrResumeBgm();
                }
                if (ctx && !isSfxMuted && isUnlocked) {
                    ctx.resume().catch(() => {});
                }
            }
        });

        document.addEventListener('click', (e) => {
            const target = e.target;
            if (!target || typeof target.closest !== 'function') return;

            if (target.closest('#luxury-audio-cluster') || target.closest('#env-wax-seal') || target.closest('#u3d-seal-btn')) {
                return;
            }

            if (target.closest('#replay-envelope-btn')) {
                playStep1EnvelopeCloseSequence();
                return;
            }

            if (target.closest('button, .deck-tab, .concept-chip, .topic-chip, .style-chip, .color-swatch-btn, .filter-btn, .motion-chip, .frame-page-btn, .wish-mode-btn, .link-suggest-chip')) {
                triggerSubtleHaptic('light');
            }
        }, { passive: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            createFloatingAudioCluster();
            bindGlobalInteractionSounds();
        });
    } else {
        createFloatingAudioCluster();
        bindGlobalInteractionSounds();
    }

    window.CardAudio = {
        unlock: unlockAudioOnFirstGesture,
        setMotionTheme(motionId) {
            if (motionId && BGM_TRACKS[motionId]) {
                switchBgmTrackForTheme(motionId);
                currentMotionTheme = motionId;
            }
        },
        toggleBgmMute,
        toggleSfxMute,
        isBgmMuted: () => isBgmMuted,
        isSfxMuted: () => isSfxMuted,
        triggerSubtleHaptic,
        setEnvelopeMuffle: setEnvelopeSpatialMuffle,
        setBgmDuck,
        playTouchSparkle,
        playUiTap,
        playSealAttentionHint,
        playWaxSealCrack,
        playWaxSealStampImpact,
        playStep1EnvelopeOpenSequence,
        playStep1EnvelopeCloseSequence,
        playCelebrationBurst,
        playCardFanSwipe,
        playCardWinkTwinkle,
        playSuccessChime,
        playSilkPaperWhoosh,
        resetWishBloomCues,
        updateWishBloomAudioByTau,
        playUnified3DEnvelopeOpenSequence
    };
})();
