/* =====================================================================================
 * audio-engine.js — HỆ THỐNG ÂM THANH PIANO YIRUMA THẬT & HIỆU ỨNG FOLEY ĐỒNG ĐIỆU (A MAJOR)
 * -------------------------------------------------------------------------------------
 * 1. Nhạc nền (BGM):
 *    - Phát xuyên suốt bản thu âm Đại Dương Cầm (Concert Grand Piano) thật:
 *      "River Flows in You — Yiruma" (bgm/river-flows-in-you.mp3) từ đầu đến cuối,
 *      không tự ý đổi bài khi chuyển sang luồng cá nhân hay đổi chủ đề.
 * 2. Hiệu ứng âm thanh (SFX) hòa quyện 100% theo đúng tông A Major / F#m của River Flows in You:
 *    - Mọi âm sắc Đàn Harp, Piano giọt sương, Chuông pha lê khi mở phong bì, chạm nút,
 *      nụ hoa ước nguyện nở, pháo hoa chúc mừng đều được lên dây chuẩn xác theo hợp âm
 *      Aadd9 / Dmaj9 (A - B - C# - D - E - F#) của bài River Flows in You, đi qua buồng vang
 *      Velvet Hall Reverb 1.8s nên luôn êm ái, sang trọng và tuyệt đối không lệch tông!
 * ===================================================================================== */
(function () {
    'use strict';

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    let ctx = null;
    let masterSfxGain = null;
    let compressor = null;
    let dryBus = null;
    let reverbBus = null;
    let convolver = null;
    let sfxBus = null;
    let sfxMuteGain = null;
    let sfxReverbBus = null;
    let noiseBuffer = null;
    let pinkNoiseBuffer = null;

    let isBgmMuted = true;
    let isSfxMuted = false;
    let isUnlocked = false;
    let isPageHidden = false;
    let currentMotionTheme = 'bloom';
    let isEnvelopeClosedMuffled = true;
    let bgmDuckFactor = 1.0;

    // Phát nguyên bản 100% chất lượng gốc (bit-exact HTML5 Audio, không nén lại) bản Giao hưởng Violet Evergarden
    // Ưu tiên 1: Multi-CDN Toàn Cầu (Cloudflare + Fastly + Bunny qua jsDelivr) -> Tốn 0 byte băng thông GitHub Pages, cache vĩnh viễn (immutable 1 năm), hỗ trợ HTTP 206 Byte-Range Streaming
    // Ưu tiên 2: Tự động chuyển mạch (Failover) về file nội bộ nếu mạng cục bộ hoặc chạy offline
    const CDN_BGM_SRC = 'https://cdn.jsdelivr.net/gh/ngokhaihoang1999/20-10@a75267b/bgm/custom-bgm.mp3';
    const LOCAL_BGM_SRC = 'bgm/custom-bgm.mp3?v=63.0';
    const isLocalEnv = typeof location !== 'undefined' && (
        location.protocol === 'file:' ||
        location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1'
    );
    const BGM_CANDIDATE_URLS = isLocalEnv ? [LOCAL_BGM_SRC, CDN_BGM_SRC] : [CDN_BGM_SRC, LOCAL_BGM_SRC];
    let bgmSourceIndex = 0;
    const BASE_BGM_VOLUME = 0.88;
    let bgmAudio = null;
    let fadeRafId = null;

    // Thang âm A Major Pentatonic / Add9 đồng điệu 100% với dàn nhạc giao hưởng
    const RIVER_SCALE = ['A4', 'B4', 'Csharp5', 'E5', 'Fsharp5', 'A5', 'B5', 'Csharp6'];
    const RIVER_REVEAL_CHORD = ['D4', 'Fsharp4', 'A4', 'Csharp5', 'E5', 'Fsharp5', 'A5', 'Csharp6'];
    const RIVER_WARM_PAD = ['D4', 'Fsharp4', 'A4', 'Csharp5'];

    let lastSparkleSoundTime = 0;
    let sparkleNoteIndex = 0;
    let lastUiTapTime = 0;

    // Lưu trạng thái đồng bộ từng khung hình theo trục thời gian tau với wish-bloom.js
    function createEmptyWishBloomCueState() {
        return {
            preludeStar: false,
            started: false,
            skyTwinkle1: false,
            fall: false,
            preImpact: false,
            impact: false,
            bud: false,
            openLayer1: false,
            openLayer2: false,
            openLayer3: false,
            openLayer4: false,
            heart: false,
            weave: false,
            crestFlare: false,
            calligraphy1: false,
            calligraphy2: false,
            calligraphy3: false,
            calligraphy4: false,
            cardSeal: false,
            origamiDetach: false,
            foldLeft: false,
            foldRight: false,
            foldBottom: false,
            foldTop: false,
            origamiLock: false,
            lift: false,
            presentSettle: false
        };
    }
    let wishBloomCueState = createEmptyWishBloomCueState();

    // Bộ giải mã tần số nốt nhạc chuẩn xác (A4 = 440Hz)
    const NOTE_CACHE = {};
    const SEMITONE_MAP = {
        C: 0, 'C#': 1, Csharp: 1, Db: 1,
        D: 2, 'D#': 3, Dsharp: 3, Eb: 3,
        E: 4,
        F: 5, 'F#': 6, Fsharp: 6, Gb: 6,
        G: 7, 'G#': 8, Gsharp: 8, Ab: 8,
        A: 9, 'A#': 10, Asharp: 10, Bb: 10,
        B: 11
    };

    function n(name) {
        if (!name) return 440;
        if (NOTE_CACHE[name]) return NOTE_CACHE[name];
        const m = /^([A-G](?:#|sharp|b)?)(-?\d+)$/.exec(String(name).trim());
        if (!m) return 440;
        const semi = SEMITONE_MAP[m[1]];
        const oct = parseInt(m[2], 10);
        if (semi === undefined || isNaN(oct)) return 440;
        const midi = (oct + 1) * 12 + semi;
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        NOTE_CACHE[name] = freq;
        return freq;
    }

    // =========================================================================
    // 1. TRÌNH PHÁT NHẠC NỀN GIAO HƯỞNG CHẤT LƯỢNG GỐC (VIOLET EVERGARDEN)
    // =========================================================================
    function getTargetBgmVolume() {
        if (isBgmMuted || isPageHidden) return 0;
        const envFactor = isEnvelopeClosedMuffled ? 0.92 : 1.0;
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
            bgmAudio = new Audio();
            bgmAudio.crossOrigin = 'anonymous';
            bgmAudio.loop = true;
            bgmAudio.preload = 'metadata';
            bgmAudio.playsInline = true;
            bgmAudio.volume = 0;

            bgmAudio.addEventListener('error', () => {
                if (bgmSourceIndex + 1 < BGM_CANDIDATE_URLS.length) {
                    bgmSourceIndex++;
                    const nextSrc = BGM_CANDIDATE_URLS[bgmSourceIndex];
                    try {
                        if (nextSrc.indexOf('http') !== 0) {
                            bgmAudio.removeAttribute('crossorigin');
                        }
                        bgmAudio.src = nextSrc;
                        bgmAudio.load();
                        if (isUnlocked && !isBgmMuted && !isPageHidden) {
                            bgmAudio.play().catch(() => {});
                        }
                    } catch (_) {}
                }
            });

            const initialSrc = BGM_CANDIDATE_URLS[bgmSourceIndex];
            if (initialSrc.indexOf('http') !== 0) {
                bgmAudio.removeAttribute('crossorigin');
            }
            bgmAudio.src = initialSrc;
        } catch (err) {
            console.warn('BGM Audio init skipped:', err);
        }
        return bgmAudio;
    }

    function startOrResumeBgm() {
        if (isBgmMuted || isPageHidden) return;
        const player = ensureBgmPlayer();
        if (!player) return;

        if (player.preload !== 'auto') {
            player.preload = 'auto';
        }

        if (!player.paused) {
            rampBgmVolume(getTargetBgmVolume(), 420);
            return;
        }

        const playPromise = player.play();
        if (playPromise && typeof playPromise.then === 'function') {
            playPromise.then(() => {
                rampBgmVolume(getTargetBgmVolume(), 650);
            }).catch(() => {});
        } else {
            rampBgmVolume(getTargetBgmVolume(), 650);
        }
    }

    // =========================================================================
    // 2. PHÒNG THU WEB AUDIO API CHO HIỆU ỨNG FOLEY & ĐÀN HARP/PIANO ĐỒNG ĐIỆU
    // =========================================================================
    function ensureAudioContext() {
        if (ctx) return ctx;
        if (!AudioCtx) return null;

        try {
            ctx = new AudioCtx();

            compressor = ctx.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(-12, ctx.currentTime);
            compressor.knee.setValueAtTime(14, ctx.currentTime);
            compressor.ratio.setValueAtTime(3.5, ctx.currentTime);
            compressor.attack.setValueAtTime(0.004, ctx.currentTime);
            compressor.release.setValueAtTime(0.16, ctx.currentTime);

            masterSfxGain = ctx.createGain();
            masterSfxGain.gain.setValueAtTime(0.98, ctx.currentTime);

            compressor.connect(masterSfxGain);
            masterSfxGain.connect(ctx.destination);

            dryBus = ctx.createGain();
            dryBus.gain.setValueAtTime(0.96, ctx.currentTime);
            dryBus.connect(compressor);

            reverbBus = ctx.createGain();
            reverbBus.gain.setValueAtTime(0.26, ctx.currentTime);

            convolver = ctx.createConvolver();
            convolver.buffer = createVelvetHallImpulse(ctx, 1.65, 3.2);
            reverbBus.connect(convolver);
            convolver.connect(compressor);

            sfxBus = ctx.createGain();
            sfxBus.gain.setValueAtTime(0.98, ctx.currentTime);

            sfxMuteGain = ctx.createGain();
            sfxMuteGain.gain.setValueAtTime(isSfxMuted ? 0.0001 : 1.0, ctx.currentTime);

            sfxReverbBus = ctx.createGain();
            sfxReverbBus.gain.setValueAtTime(isSfxMuted ? 0.0001 : 1.0, ctx.currentTime);

            sfxBus.connect(sfxMuteGain);
            sfxMuteGain.connect(dryBus);
            sfxReverbBus.connect(reverbBus);

            buildNoiseBuffers(ctx);
        } catch (err) {
            console.warn('Web Audio SFX init skipped:', err);
        }
        return ctx;
    }

    function createVelvetHallImpulse(audioCtx, durationSec, decayRate) {
        const rate = audioCtx.sampleRate;
        const length = Math.floor(rate * durationSec);
        const impulse = audioCtx.createBuffer(2, length, rate);

        for (let ch = 0; ch < 2; ch++) {
            const data = impulse.getChannelData(ch);
            let b0 = 0, b1 = 0, b2 = 0;
            for (let i = 0; i < length; i++) {
                const t = i / length;
                const white = Math.random() * 2 - 1;
                b0 = 0.99 * b0 + 0.01 * white;
                b1 = 0.90 * b1 + 0.10 * white;
                b2 = 0.68 * b2 + 0.32 * white;
                const warmNoise = (b1 * 0.58 + b2 * 0.42 - b0 * 0.35);
                const env = Math.pow(1 - t, decayRate) * (1 - Math.exp(-i / (rate * 0.014)));
                data[i] = warmNoise * env * 0.58;
            }
            const erTimes = [0.015, 0.029, 0.045];
            const erGains = [0.18, 0.12, 0.08];
            erTimes.forEach((et, idx) => {
                const sampleIdx = Math.floor(et * rate) + (ch * 101);
                if (sampleIdx < length) {
                    data[sampleIdx] += (ch === 0 ? 1 : -1) * erGains[idx];
                }
            });
        }
        return impulse;
    }

    function buildNoiseBuffers(audioCtx) {
        const rate = audioCtx.sampleRate;
        const len = Math.floor(rate * 1.5);
        noiseBuffer = audioCtx.createBuffer(1, len, rate);
        pinkNoiseBuffer = audioCtx.createBuffer(1, len, rate);

        const whiteOut = noiseBuffer.getChannelData(0);
        const pinkOut = pinkNoiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        let maxPink = 0.001;

        for (let i = 0; i < len; i++) {
            const w = Math.random() * 2 - 1;
            whiteOut[i] = w * 0.90;
            b0 = 0.99886 * b0 + w * 0.0555179;
            b1 = 0.99332 * b1 + w * 0.0750759;
            b2 = 0.96900 * b2 + w * 0.1538520;
            b3 = 0.86650 * b3 + w * 0.3104856;
            b4 = 0.55000 * b4 + w * 0.5329522;
            b5 = -0.7616 * b5 - w * 0.0168980;
            const pVal = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
            pinkOut[i] = pVal;
            const absP = Math.abs(pVal);
            if (absP > maxPink) maxPink = absP;
            b6 = w * 0.115926;
        }
        // Chuẩn hóa biên độ Pink Noise về ngưỡng 0.88 để mọi hiệu ứng Foley (gió, nước, giấy lụa, ngòi bút, sáp) rõ nét và sống động trên loa điện thoại
        const normScale = 0.88 / maxPink;
        for (let i = 0; i < len; i++) {
            pinkOut[i] *= normScale;
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

    function createStereoPan(panValue) {
        if (!ctx) return null;
        if (typeof ctx.createStereoPanner === 'function') {
            const panner = ctx.createStereoPanner();
            panner.pan.setValueAtTime(Math.max(-1, Math.min(1, panValue || 0)), ctx.currentTime);
            return panner;
        }
        return null;
    }

    function connectWithPanAndReverb(sourceNode, reverbSendAmount = 0.32, panValue = 0) {
        if (!ctx || !sfxBus) return;
        let outNode = sourceNode;
        const panner = createStereoPan(panValue);
        if (panner) {
            sourceNode.connect(panner);
            outNode = panner;
        }
        outNode.connect(sfxBus);
        if (reverbSendAmount > 0 && sfxReverbBus) {
            const sendGain = ctx.createGain();
            sendGain.gain.setValueAtTime(reverbSendAmount, ctx.currentTime);
            outNode.connect(sendGain);
            sendGain.connect(sfxReverbBus);
        }
    }

    function setEnvelopeSpatialMuffle(muffled, rampSec = 0.85) {
        isEnvelopeClosedMuffled = !!muffled;
        rampBgmVolume(getTargetBgmVolume(), Math.max(150, rampSec * 1000));
    }

    let bgmDuckTimerId = null;
    function setBgmDuck(duckFactor, holdSec = 0) {
        if (bgmDuckTimerId) {
            clearTimeout(bgmDuckTimerId);
            bgmDuckTimerId = null;
        }
        bgmDuckFactor = Math.max(0.16, Math.min(1.0, duckFactor));
        rampBgmVolume(getTargetBgmVolume(), 220);
        if (holdSec > 0) {
            bgmDuckTimerId = setTimeout(() => {
                bgmDuckTimerId = null;
                bgmDuckFactor = 1.0;
                rampBgmVolume(getTargetBgmVolume(), 750);
            }, holdSec * 1000);
        }
    }

    // =========================================================================
    // 3. NHẠC CỤ HIỆU ỨNG ĐỒNG ĐIỆU VỚI RIVER FLOWS IN YOU (CONCERT HARP & PIANO CHIME)
    // =========================================================================

    // Tiếng Đàn Harp & Piano Giọt Sương (Lên dây chuẩn A Major của River Flows in You)
    function playHarmonicChime(freq, startTime, duration = 0.95, velocity = 0.14, pan = 0) {
        if (!ctx || isSfxMuted || isPageHidden) return;
        const t0 = Math.max(ctx.currentTime + 0.004, startTime);
        const safeFreq = Math.min(1568, Math.max(110, freq));

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, t0);
        env.gain.exponentialRampToValueAtTime(velocity, t0 + 0.012);
        env.gain.exponentialRampToValueAtTime(velocity * 0.38, t0 + 0.22);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

        const flt = ctx.createBiquadFilter();
        flt.type = 'lowpass';
        flt.frequency.setValueAtTime(Math.min(5200, safeFreq * 4.5), t0);
        flt.frequency.exponentialRampToValueAtTime(Math.max(420, safeFreq * 1.4), t0 + duration * 0.78);

        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(safeFreq, t0);

        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(safeFreq * 2, t0);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.14, t0);
        g2.gain.exponentialRampToValueAtTime(0.002, t0 + 0.18);

        osc1.connect(flt);
        osc2.connect(g2);
        g2.connect(flt);
        flt.connect(env);

        connectWithPanAndReverb(env, 0.42, pan);
        osc1.start(t0);
        osc2.start(t0);
        osc1.stop(t0 + duration + 0.05);
        osc2.stop(t0 + 0.22);
    }

    // Tiếng gảy Đàn Harp (Concert Harp Pluck) ấm áp cho lúc mở phong bì & hoa nở
    function playHarpPluck(freq, startTime, duration = 1.45, velocity = 0.14, pan = 0) {
        if (!ctx || isSfxMuted || isPageHidden) return;
        const t0 = Math.max(ctx.currentTime + 0.004, startTime);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, t0);
        env.gain.exponentialRampToValueAtTime(velocity, t0 + 0.014);
        env.gain.exponentialRampToValueAtTime(velocity * 0.36, t0 + 0.26);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

        const flt = ctx.createBiquadFilter();
        flt.type = 'lowpass';
        flt.frequency.setValueAtTime(Math.min(4800, freq * 4.2), t0);
        flt.frequency.exponentialRampToValueAtTime(Math.max(360, freq * 1.25), t0 + duration * 0.75);

        const osc1 = ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(freq, t0);

        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2, t0);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.15, t0);
        g2.gain.exponentialRampToValueAtTime(0.002, t0 + 0.22);

        osc1.connect(flt);
        osc2.connect(g2);
        g2.connect(flt);
        flt.connect(env);

        connectWithPanAndReverb(env, 0.38, pan);
        osc1.start(t0);
        osc2.start(t0);
        osc1.stop(t0 + duration + 0.04);
        osc2.stop(t0 + 0.25);
    }

    // Lớp Strings Ấm Sáng (Dmaj9 / Aadd9 ở Octave 4) nâng cảm xúc khi thiệp bung mở
    function playWarmShimmerPad(noteNames, startTime, duration = 2.2, velocity = 0.032) {
        if (!ctx || isSfxMuted || isPageHidden || !Array.isArray(noteNames)) return;
        const t0 = Math.max(ctx.currentTime + 0.005, startTime);

        const flt = ctx.createBiquadFilter();
        flt.type = 'lowpass';
        flt.frequency.setValueAtTime(2200, t0);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, t0);
        env.gain.linearRampToValueAtTime(velocity, t0 + Math.min(0.45, duration * 0.3));
        env.gain.setValueAtTime(velocity * 0.8, t0 + duration * 0.7);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration + 0.35);

        flt.connect(env);
        connectWithPanAndReverb(env, 0.48, 0);

        noteNames.forEach((name, idx) => {
            const f = n(name);
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, t0);
            osc.detune.setValueAtTime((idx - 1.5) * 2.0, t0);
            osc.connect(flt);
            osc.start(t0);
            osc.stop(t0 + duration + 0.4);
        });
    }

    // =========================================================================
    // 4. HỆ THỐNG RUNG XÚC GIÁC TINH TẾ (SUBTLE HAPTIC & OPTICAL MICRO-PULSE)
    // =========================================================================
    let lastHapticTime = 0;

    function triggerSubtleHaptic(kind = 'light') {
        if (isSfxMuted || isPageHidden) return;
        const nowPerf = performance.now();
        if (kind === 'light' && nowPerf - lastHapticTime < 45) return;
        lastHapticTime = nowPerf;

        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try {
                if (kind === 'light') {
                    navigator.vibrate(7);
                } else if (kind === 'nudge') {
                    navigator.vibrate([10, 45, 12]);
                } else if (kind === 'heartbeat') {
                    navigator.vibrate(10);
                } else if (kind === 'seal_pop') {
                    navigator.vibrate(18);
                } else if (kind === 'stamp') {
                    navigator.vibrate([18, 32, 10]);
                } else if (kind === 'water_drop') {
                    navigator.vibrate([16, 38, 10]);
                } else if (kind === 'success') {
                    navigator.vibrate([10, 35, 14]);
                }
            } catch (_) {}
        }

        if (kind === 'stamp' || kind === 'seal_pop' || kind === 'water_drop' || kind === 'heartbeat') {
            const isU3d = Boolean(document.body && document.body.classList && document.body.classList.contains('u3d-stage-active'));
            const targetEl = kind === 'water_drop'
                ? document.getElementById('u3d-canvas-world')
                : (isU3d
                    ? document.getElementById('u3d-envelope-stage')
                    : document.getElementById('step1-physical-stage'));
            if (targetEl && targetEl.classList) {
                if (targetEl.style && typeof targetEl.style.setProperty === 'function') {
                    const amp = kind === 'stamp' ? '1.15' : (kind === 'heartbeat' ? '0.65' : '1');
                    targetEl.style.setProperty('--haptic-amp', amp);
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
    // 5. HIỆU ỨNG FOLEY VẬT LÝ & TƯƠNG TÁC ĐỒNG ĐIỆU VỚI RIVER FLOWS IN YOU
    // =========================================================================

    // 5.1. Chạm tay nở hoa trên thiệp (Đã tắt tiếng giọt sương lẻ tẻ theo yêu cầu để giữ không gian thanh lịch)
    function playTouchSparkle(_clientX) {
        // Không phát tiếng giọt nước / giọt sương khi chạm hoặc vuốt màn hình
    }

    // 5.2. Tiếng chạm UI Ngọc Trai / Phím Đàn (Tabs, Chips, Buttons, Camera Tools)
    function playUiTap(kind = 'chip', index = 0) {
        if (!canPlayAudio()) return;
        const nowPerf = performance.now();
        if (nowPerf - lastUiTapTime < 40) return;
        lastUiTapTime = nowPerf;
        triggerSubtleHaptic('light');

        const t0 = ctx.currentTime + 0.003;

        if (kind === 'tab') {
            // Chuyển Tab: Nốt đôi quãng 5 ấm sáng trên hợp âm A Major (A4 -> E5)
            const tabNotes = ['A4', 'B4', 'Csharp5', 'E5', 'Fsharp5'];
            const f = n(tabNotes[Math.abs(index) % tabNotes.length]);
            playHarmonicChime(f, t0, 0.28, 0.085, 0);
        } else if (kind === 'camera') {
            // Lật gương / Xoay ảnh / Căn giữa: Tiếng cơ học ống kính máy ảnh mềm mại
            const osc = ctx.createOscillator();
            const env = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(520, t0);
            osc.frequency.exponentialRampToValueAtTime(240, t0 + 0.045);
            env.gain.setValueAtTime(0.0001, t0);
            env.gain.exponentialRampToValueAtTime(0.12, t0 + 0.004);
            env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.055);
            osc.connect(env);
            connectWithPanAndReverb(env, 0.12, 0);
            osc.start(t0);
            osc.stop(t0 + 0.065);
        } else {
            // Chọn Khung / Viền / Màu / Chủ đề: Tiếng chạm Ngọc Trai theo đúng thang âm A Major của River Flows in You
            const noteName = RIVER_SCALE[Math.abs(index) % RIVER_SCALE.length];
            playHarmonicChime(n(noteName), t0, 0.24, 0.075, 0);
        }
    }

    // 5.3. Tiếng Chuông Nhắc Nhẹ khi bấm lệch ngoài Con Dấu Sáp ("Ting-ting~" E5 -> A5 chuẩn tông A Major)
    function playSealAttentionHint() {
        if (!canPlayAudio()) return;
        triggerSubtleHaptic('nudge');
        const t0 = ctx.currentTime + 0.01;
        playHarmonicChime(n('E5'), t0, 0.42, 0.12, -0.15);
        playHarmonicChime(n('A5'), t0 + 0.095, 0.62, 0.14, 0.15);
    }

    // 5.4. Tiếng Đũa Thần "🪄 Tự phối gu" & "🎲 Đổi câu chúc" (Rải Harp Aadd9 lấp lánh)
    function playMagicGlissando(isReroll = false) {
        if (!canPlayAudio()) return;
        triggerSubtleHaptic('light');
        const notes = isReroll
            ? ['A4', 'Csharp5', 'E5', 'A5']
            : ['D4', 'Fsharp4', 'A4', 'Csharp5', 'E5', 'A5'];
        const t0 = ctx.currentTime + 0.01;
        notes.forEach((name, idx) => {
            const pan = ((idx / Math.max(1, notes.length - 1)) - 0.5) * 0.55;
            playHarpPluck(n(name), t0 + idx * 0.048, 0.95, 0.11, pan);
        });
    }

    // 5.5. Tiếng Lụa / Giấy Mỹ Thuật Trượt Mềm (Warm Lowpass-Tamed Silk & Parchment Friction)
    function playSilkPaperWhoosh(duration = 0.38, startFreq = 340, endFreq = 860, peakGain = 0.22, pan = 0, delaySec = 0) {
        if (!canPlayAudio() || !pinkNoiseBuffer) return;
        const t0 = ctx.currentTime + Math.max(0.004, delaySec);

        const src = ctx.createBufferSource();
        src.buffer = pinkNoiseBuffer;
        src.loop = true;

        const bpFilter = ctx.createBiquadFilter();
        bpFilter.type = 'bandpass';
        bpFilter.Q.setValueAtTime(1.2, t0);
        bpFilter.frequency.setValueAtTime(startFreq, t0);
        bpFilter.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration * 0.60);
        bpFilter.frequency.exponentialRampToValueAtTime(Math.max(200, startFreq * 0.80), t0 + duration);

        // Bộ lọc thông thấp (Warmth Lowpass) gọt bỏ hoàn toàn dải tần chói gắt trên 2600Hz để tiếng lụa/giấy luôn mượt như nhung
        const lpFilter = ctx.createBiquadFilter();
        lpFilter.type = 'lowpass';
        lpFilter.frequency.setValueAtTime(2400, t0);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, t0);
        env.gain.linearRampToValueAtTime(peakGain, t0 + duration * 0.28);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

        src.connect(bpFilter);
        bpFilter.connect(lpFilter);
        lpFilter.connect(env);
        connectWithPanAndReverb(env, 0.22, pan);

        src.start(t0, Math.random() * 0.6);
        src.stop(t0 + duration + 0.04);
    }

    // 5.6. Tiếng Tách Con Dấu Sáp Vàng 24K Giòn Tan & Chùm Harp Vàng A Major
    function playWaxSealCrack() {
        if (!canPlayAudio()) return;
        triggerSubtleHaptic('seal_pop');
        const t0 = ctx.currentTime + 0.005;

        // Lớp 1: Cộng hưởng thân sáp vàng tách giòn (Warm Body Thump 220Hz -> 68Hz)
        const bodyOsc = ctx.createOscillator();
        const bodyEnv = ctx.createGain();
        bodyOsc.type = 'triangle';
        bodyOsc.frequency.setValueAtTime(220, t0);
        bodyOsc.frequency.exponentialRampToValueAtTime(68, t0 + 0.075);
        bodyEnv.gain.setValueAtTime(0.0001, t0);
        bodyEnv.gain.exponentialRampToValueAtTime(0.38, t0 + 0.005);
        bodyEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.088);
        bodyOsc.connect(bodyEnv);
        bodyEnv.connect(sfxBus);
        bodyOsc.start(t0);
        bodyOsc.stop(t0 + 0.098);

        // Lớp 2: Tiếng nứt sáp ấm gọn (Warm Wax Snap 1850Hz)
        if (pinkNoiseBuffer) {
            const snapSrc = ctx.createBufferSource();
            snapSrc.buffer = pinkNoiseBuffer;
            const snapFlt = ctx.createBiquadFilter();
            snapFlt.type = 'bandpass';
            snapFlt.frequency.setValueAtTime(1850, t0);
            snapFlt.Q.setValueAtTime(1.8, t0);
            const snapEnv = ctx.createGain();
            snapEnv.gain.setValueAtTime(0.0001, t0);
            snapEnv.gain.exponentialRampToValueAtTime(0.34, t0 + 0.003);
            snapEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.042);
            snapSrc.connect(snapFlt);
            snapFlt.connect(snapEnv);
            connectWithPanAndReverb(snapEnv, 0.20, 0);
            snapSrc.start(t0, Math.random() * 0.4);
            snapSrc.stop(t0 + 0.05);
        }

        // Lớp 3: Chùm kim tuyến 24K bung sáng đồng điệu hợp âm Aadd9
        const sparkleNotes = ['A4', 'Csharp5', 'E5', 'A5'];
        sparkleNotes.forEach((noteName, idx) => {
            playHarmonicChime(n(noteName), t0 + 0.016 + idx * 0.042, 0.72, 0.12, (idx - 1.5) * 0.22);
        });
    }

    // 5.6B. Tiếng Dòng Sáp Vàng & Khuôn Ấn Hạ Xuống Nắp Phong Bì (Không dùng sine trượt tần số để tuyệt đối không giống giọt nước)
    function playWaxSealDescentWhoosh(durationSec = 0.31) {
        if (!canPlayAudio()) return;
        const t0 = ctx.currentTime + 0.004;
        const dur = Math.max(0.20, Math.min(0.42, durationSec));

        if (pinkNoiseBuffer) {
            const src = ctx.createBufferSource();
            src.buffer = pinkNoiseBuffer;
            src.loop = true;

            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.Q.setValueAtTime(1.15, t0);
            bp.frequency.setValueAtTime(1180, t0);
            bp.frequency.exponentialRampToValueAtTime(260, t0 + dur);

            const lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.setValueAtTime(1750, t0);

            const env = ctx.createGain();
            env.gain.setValueAtTime(0.002, t0);
            env.gain.exponentialRampToValueAtTime(0.34, t0 + dur * 0.88);
            env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.025);

            src.connect(bp);
            bp.connect(lp);
            lp.connect(env);
            connectWithPanAndReverb(env, 0.16, 0);
            src.start(t0, Math.random() * 0.4);
            src.stop(t0 + dur + 0.04);
        }
    }

    // 5.7. Tiếng Đóng Ấn Sáp Vàng 24K Đầm Chắc & Sang Trọng (Cao trào kết thúc chuỗi đóng thư)
    function playWaxSealStampImpact() {
        if (!canPlayAudio()) return;
        triggerSubtleHaptic('stamp');
        const t0 = ctx.currentTime + 0.004;

        setBgmDuck(0.32, 1.25);

        // Lớp 1: Lực đầm trầm sâu của khuôn đồng ép xuống phong bì (Dải Sub-Bass 110Hz -> 42Hz, không dùng dải trung 390Hz để không bao giờ nghe giống giọt nước)
        const subOsc = ctx.createOscillator();
        const subEnv = ctx.createGain();
        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(110, t0);
        subOsc.frequency.exponentialRampToValueAtTime(42, t0 + 0.13);
        subEnv.gain.setValueAtTime(0.0001, t0);
        subEnv.gain.exponentialRampToValueAtTime(0.50, t0 + 0.006);
        subEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15);
        subOsc.connect(subEnv);
        subEnv.connect(sfxBus);
        subOsc.start(t0);
        subOsc.stop(t0 + 0.17);

        // Lớp 2: Tiếng khuôn ấn chạm giấy bìa & sáp vàng nóng ấm dàn đều (Filtered Pink Noise 880Hz -> 280Hz)
        if (pinkNoiseBuffer) {
            const waxSrc = ctx.createBufferSource();
            waxSrc.buffer = pinkNoiseBuffer;
            waxSrc.loop = true;

            const waxBp = ctx.createBiquadFilter();
            waxBp.type = 'bandpass';
            waxBp.Q.setValueAtTime(1.25, t0);
            waxBp.frequency.setValueAtTime(880, t0);
            waxBp.frequency.exponentialRampToValueAtTime(280, t0 + 0.16);

            const waxLp = ctx.createBiquadFilter();
            waxLp.type = 'lowpass';
            waxLp.frequency.setValueAtTime(1650, t0);

            const waxEnv = ctx.createGain();
            waxEnv.gain.setValueAtTime(0.0001, t0);
            waxEnv.gain.linearRampToValueAtTime(0.38, t0 + 0.012);
            waxEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.175);

            waxSrc.connect(waxBp);
            waxBp.connect(waxLp);
            waxLp.connect(waxEnv);
            connectWithPanAndReverb(waxEnv, 0.18, 0);
            waxSrc.start(t0, Math.random() * 0.4);
            waxSrc.stop(t0 + 0.19);
        }

        // Lớp 3: Hợp âm Đàn Harp Hoàng Gia ngân vang ấm áp khi hoàn tất phong ấn (Aadd9 Resolution)
        playWarmShimmerPad(['A4', 'Csharp5', 'E5'], t0 + 0.01, 1.8, 0.042);
        playHarpPluck(n('A3'), t0 + 0.006, 1.75, 0.18, 0.0);
        playHarpPluck(n('E4'), t0 + 0.032, 1.65, 0.16, -0.22);
        playHarpPluck(n('A4'), t0 + 0.062, 1.60, 0.16, 0.22);
        playHarpPluck(n('Csharp5'), t0 + 0.095, 1.55, 0.15, -0.12);
        playHarpPluck(n('E5'), t0 + 0.130, 1.65, 0.15, 0.12);
    }

    // 5.8. Tiếng Mở Phong Bì Vật Lý Bước 1 (Full Choreography)
    function playStep1EnvelopeOpenSequence() {
        setEnvelopeSpatialMuffle(false, 0.95);
        if (!canPlayAudio()) return;

        playWaxSealCrack();
        setTimeout(() => {
            if (!canPlayAudio()) return;
            playSilkPaperWhoosh(0.32, 340, 820, 0.22, 0, 0.02);
            playSilkPaperWhoosh(0.48, 420, 1140, 0.26, 0, 0.39);
        }, 18);

        // 960ms: Thiệp xòe quạt ra chính giữa màn hình cùng hợp âm Harp Dmaj9 / Aadd9
        setTimeout(() => {
            if (!canPlayAudio()) return;
            playSilkPaperWhoosh(0.28, 680, 520, 0.20, 0, 0);
            RIVER_REVEAL_CHORD.slice(0, 5).forEach((noteName, i) => {
                playHarpPluck(n(noteName), ctx.currentTime + i * 0.048, 1.45, 0.12, (i - 2) * 0.2);
            });
        }, 960);
    }

    // 5.9. Tiếng Đóng Thiệp Vào Lại Phong Bì Bước 1
    function playStep1EnvelopeCloseSequence() {
        setTimeout(() => {
            setEnvelopeSpatialMuffle(true, 0.85);
        }, 1100);
        if (!canPlayAudio()) return;
        playSilkPaperWhoosh(0.35, 520, 860, 0.22, 0, 0.02);
        playSilkPaperWhoosh(0.45, 920, 340, 0.24, 0, 0.55);

        setTimeout(() => {
            if (!canPlayAudio()) return;
            playSilkPaperWhoosh(0.25, 620, 280, 0.20, 0, 0);
            playWaxSealDescentWhoosh(0.24);
        }, 840);

        setTimeout(() => {
            if (!canPlayAudio()) return;
            playWaxSealStampImpact();
        }, 1100);
    }

    // 5.10. Tiếng Pháo Hoa & Hợp Âm Chúc Mừng (Celebration Burst)
    function playCelebrationBurst() {
        if (!canPlayAudio()) return;
        const t0 = ctx.currentTime + 0.01;
        RIVER_REVEAL_CHORD.forEach((noteName, idx) => {
            const pan = ((idx / Math.max(1, RIVER_REVEAL_CHORD.length - 1)) - 0.5) * 0.7;
            playHarpPluck(n(noteName), t0 + idx * 0.042, 1.85, 0.13, pan);
        });
    }

    // 5.11. Tiếng Xòe Quạt 3 Tấm Thiệp Mẫu
    function playCardFanSwipe(isManual = true) {
        if (!canPlayAudio()) return;
        if (isManual) {
            triggerSubtleHaptic('light');
            playSilkPaperWhoosh(0.22, 480, 920, 0.22, 0, 0);
            const noteName = RIVER_SCALE[Math.floor(Math.random() * 4)];
            playHarmonicChime(n(noteName), ctx.currentTime + 0.03, 0.42, 0.09, 0.12);
        }
    }

    function playCardWinkTwinkle() {
        if (!canPlayAudio()) return;
        const t0 = ctx.currentTime + 0.01;
        playHarmonicChime(n('E5'), t0, 0.32, 0.075, 0.1);
        playHarmonicChime(n('A5'), t0 + 0.07, 0.42, 0.085, 0.22);
    }

    // 5.12. Hợp âm Hoàn Tất Sang Trọng (Khi bấm Tạo Thiệp / Sao chép Link / Lưu Ảnh)
    function playSuccessChime() {
        if (!canPlayAudio()) return;
        triggerSubtleHaptic('success');
        const t0 = ctx.currentTime + 0.01;
        const notes = ['A4', 'Csharp5', 'E5', 'A5'];
        notes.forEach((name, idx) => {
            playHarmonicChime(n(name), t0 + idx * 0.055, 0.9, 0.13, (idx - 1.5) * 0.2);
        });
    }

    // =========================================================================
    // 6. ĐẠI CẢNH 3D "NỤ HOA ƯỚC NGUYỆN" (wish-bloom.js) — 7 DIỄN BIẾN CHÍNH ĐIỆN ẢNH
    //    (Đã căn chỉnh 100% theo thời gian thực dt_real = d_tau / speedAt(tau) của wish-bloom.js)
    // =========================================================================
    function resetWishBloomCues(preservePreludeStar = false) {
        const hadPrelude = preservePreludeStar && wishBloomCueState && wishBloomCueState.preludeStar;
        wishBloomCueState = createEmptyWishBloomCueState();
        if (hadPrelude) wishBloomCueState.preludeStar = true;
    }

    // 6.0A. Tiếng Cánh Hoa Nhung Bung Mở Đa Tầng (Velvet Botanical Unfurl + Concert Harp Bloom)
    function playVelvetPetalBloomLayer(layerIdx = 0, pan = 0) {
        if (!canPlayAudio()) return;
        const t0 = ctx.currentTime + 0.004;

        // 1. Tiếng cánh hoa nhung tách mở mượt mà (Warm Velvet Unfurl 260Hz -> 720Hz, lowpass 1850Hz êm ái)
        if (pinkNoiseBuffer) {
            const src = ctx.createBufferSource();
            src.buffer = pinkNoiseBuffer;
            src.loop = true;

            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.Q.setValueAtTime(1.1, t0);
            const fStart = 250 + layerIdx * 60;
            const fPeak = 680 + layerIdx * 100;
            bp.frequency.setValueAtTime(fStart, t0);
            bp.frequency.exponentialRampToValueAtTime(fPeak, t0 + 0.22);
            bp.frequency.exponentialRampToValueAtTime(fStart * 1.1, t0 + 0.44);

            const lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.setValueAtTime(1850, t0);

            const env = ctx.createGain();
            env.gain.setValueAtTime(0.0001, t0);
            env.gain.linearRampToValueAtTime(0.22, t0 + 0.08);
            env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);

            src.connect(bp);
            bp.connect(lp);
            lp.connect(env);
            connectWithPanAndReverb(env, 0.24, pan);
            src.start(t0, Math.random() * 0.5);
            src.stop(t0 + 0.47);
        }

        // 2. Nốt Đàn Harp ấm áp nở dần từ trầm lên trung theo từng đợt bung cánh
        const bloomNotes = ['D4', 'Fsharp4', 'A4', 'Csharp5'];
        playHarpPluck(n(bloomNotes[layerIdx % bloomNotes.length]), t0 + 0.01, 1.65, 0.14, pan * 0.75);
    }

    // 6.0B. Tiếng Nét Bút Lông Vũ Ánh Kim Lướt Êm Trên Giấy Lụa (Velvet Quill Glide — Chỉ dùng tiếng lướt giấy + Harp trầm ấm)
    function playGoldenQuillGlide(lineIdx = 0) {
        if (!canPlayAudio()) return;
        const t0 = ctx.currentTime + 0.004;
        const pan = -0.18 + lineIdx * 0.36;

        if (pinkNoiseBuffer) {
            const src = ctx.createBufferSource();
            src.buffer = pinkNoiseBuffer;
            src.loop = true;

            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.Q.setValueAtTime(1.3, t0);
            bp.frequency.setValueAtTime(480 + lineIdx * 70, t0);
            bp.frequency.exponentialRampToValueAtTime(920 + lineIdx * 80, t0 + 0.22);
            bp.frequency.exponentialRampToValueAtTime(540, t0 + 0.38);

            const lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.setValueAtTime(1700, t0);

            const env = ctx.createGain();
            env.gain.setValueAtTime(0.0001, t0);
            env.gain.linearRampToValueAtTime(0.18, t0 + 0.05);
            env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.40);

            src.connect(bp);
            bp.connect(lp);
            lp.connect(env);
            connectWithPanAndReverb(env, 0.20, pan);
            src.start(t0, Math.random() * 0.5);
            src.stop(t0 + 0.42);
        }

        const inkNotes = ['A4', 'Csharp5'];
        playHarpPluck(n(inkNotes[lineIdx % inkNotes.length]), t0 + 0.015, 1.35, 0.12, pan);
    }

    // 6.0C. Tiếng Gấp Vạt Phong Bì Origami 3D Hai Giai Đoạn (Khớp 100% với FOLD_DURS = 0.74 tau = 1.15s thực tế, tuyệt đối không có âm bụp/giọt nước)
    function playOrigamiFlapFold(slotIdx = 0, pan = 0) {
        if (!canPlayAudio()) return;
        const t0 = ctx.currentTime + 0.004;
        triggerSubtleHaptic('light');

        // PHA 1 (0.00s -> 0.48s): Tiếng cánh hoa lụa uốn cong và quạt qua không khí khi bắt đầu dựng bản lề
        const startF = 280 + slotIdx * 40;
        const peakF = 760 + slotIdx * 65;
        playSilkPaperWhoosh(0.48, startF, peakF, 0.23, pan, 0);

        // Nốt Harp ấm áp nâng cánh hoa lên (D4 -> F#4 -> A4 -> C#5)
        const liftNotes = ['D4', 'Fsharp4', 'A4', 'Csharp5'];
        playHarpPluck(n(liftNotes[slotIdx % liftNotes.length]), t0 + 0.02, 1.35, 0.13, pan);

        // PHA 2 (+0.45s thực tế = đúng lúc vạt thư gập qua góc 90° và ép phẳng xuống mặt thiệp):
        // Chỉ dùng tiếng miết nếp giấy bìa mỹ thuật ấm êm (Filtered Pink Noise), bỏ hoàn toàn oscillator trượt tần số
        const tCrease = t0 + 0.45;
        if (pinkNoiseBuffer) {
            const crSrc = ctx.createBufferSource();
            crSrc.buffer = pinkNoiseBuffer;
            crSrc.loop = true;

            const crBp = ctx.createBiquadFilter();
            crBp.type = 'bandpass';
            crBp.Q.setValueAtTime(1.25, tCrease);
            crBp.frequency.setValueAtTime(860 + slotIdx * 60, tCrease);
            crBp.frequency.exponentialRampToValueAtTime(320, tCrease + 0.25);

            const crLp = ctx.createBiquadFilter();
            crLp.type = 'lowpass';
            crLp.frequency.setValueAtTime(1750, tCrease);

            const crEnv = ctx.createGain();
            crEnv.gain.setValueAtTime(0.0001, tCrease);
            crEnv.gain.linearRampToValueAtTime(0.26, tCrease + 0.035);
            crEnv.gain.exponentialRampToValueAtTime(0.0001, tCrease + 0.27);

            crSrc.connect(crBp);
            crBp.connect(crLp);
            crLp.connect(crEnv);
            connectWithPanAndReverb(crEnv, 0.16, pan * 0.65);
            crSrc.start(tCrease, Math.random() * 0.5);
            crSrc.stop(tCrease + 0.29);
        }
    }

    // 6.0D. Tiếng Khóa Khép Kín 4 Vạt Phong Bì (tau = 6.02s — Thuần tiếng giấy bìa khép nếp & Hợp âm Harp ấm)
    function playOrigamiEnvelopeLockBurst() {
        if (!canPlayAudio()) return;
        const t0 = ctx.currentTime + 0.004;
        triggerSubtleHaptic('seal_pop');

        // 1. Tiếng mép giấy bìa khóa khít êm ái (Warm Cardstock Latch)
        playSilkPaperWhoosh(0.28, 840, 340, 0.26, 0, 0);

        // 2. Hợp âm Đàn Harp ấm áp ngân vang khi 4 vạt phong bì khép hoàn chỉnh
        playWarmShimmerPad(['D4', 'Fsharp4', 'A4', 'Csharp5'], t0 + 0.01, 1.5, 0.038);
        const lockChord = ['D4', 'A4', 'Csharp5', 'E5'];
        lockChord.forEach((noteName, idx) => {
            const pan = ((idx / (lockChord.length - 1)) - 0.5) * 0.55;
            playHarpPluck(n(noteName), t0 + 0.015 + idx * 0.055, 1.55, 0.14, pan);
        });
    }

    // 6.1. DIỄN BIẾN 1: VÌ TINH TÚ THỨC TỈNH TRÊN BẦU TRỜI ĐÊM (beginPrelude / tau = 0.01s -> 0.68s)
    function playPreludeStarAppear() {
        if (!canPlayAudio()) return;
        if (wishBloomCueState.preludeStar) return;
        wishBloomCueState.preludeStar = true;
        const t0 = ctx.currentTime + 0.004;

        setBgmDuck(0.22, 8.8);
        triggerSubtleHaptic('light');

        // Quầng sáng tinh tú ngân vang lấp lánh trên bầu trời đêm
        playWarmShimmerPad(['D4', 'Fsharp4', 'A4', 'Csharp5'], t0, 2.2, 0.046);
        playHarmonicChime(n('A5'), t0, 1.35, 0.18, 0.22);
        playHarpPluck(n('E5'), t0 + 0.055, 1.55, 0.16, 0.28);
        playHarpPluck(n('Csharp5'), t0 + 0.12, 1.65, 0.14, 0.16);
        playSilkPaperWhoosh(0.52, 380, 960, 0.18, 0.20, 0.02);
    }

    function updateWishBloomAudioByTau(tau, isSkipped) {
        if (!ctx || !isUnlocked || isPageHidden) return;
        if (isSkipped) {
            if (!wishBloomCueState.lift) {
                wishBloomCueState.lift = true;
                setEnvelopeSpatialMuffle(true, 0.6);
                if (canPlayAudio()) {
                    playSilkPaperWhoosh(0.45, 380, 920, 0.22, 0, 0);
                }
            }
            return;
        }

        const now = ctx.currentTime;

        // =====================================================================
        // DIỄN BIẾN 1: VÌ TINH TÚ THỨC TỈNH TRÊN BẦU TRỜI ĐÊM (tau = 0.01s -> 0.68s)
        // =====================================================================
        if (!wishBloomCueState.started && tau >= 0.01) {
            wishBloomCueState.started = true;
            setBgmDuck(0.22, 8.6);
            setEnvelopeSpatialMuffle(false, 0.4);
            if (canPlayAudio()) {
                playPreludeStarAppear();
            }
        }

        // Nhịp lóe sáng lấy đà ngay trước khi tinh tú rời vòm trời (tau = 0.38s)
        if (!wishBloomCueState.skyTwinkle1 && tau >= 0.38 && tau < 0.68) {
            wishBloomCueState.skyTwinkle1 = true;
            if (canPlayAudio()) {
                playHarpPluck(n('Fsharp5'), now, 1.15, 0.14, 0.24);
                playHarmonicChime(n('A5'), now + 0.05, 1.15, 0.15, 0.18);
            }
        }

        // =====================================================================
        // DIỄN BIẾN 2: TIẾNG RƠI CỦA VÌ TINH TÚ — SAO BĂNG XÉ GIÓ LAO XUỐNG HỒ (tau = 0.70s -> 1.58s, ~0.62s thực tế)
        // =====================================================================
        if (!wishBloomCueState.fall && tau >= 0.70) {
            wishBloomCueState.fall = true;
            if (canPlayAudio()) {
                const fallDur = 0.60;

                // 1. Luồng gió khí động học của sao băng lao vút từ bầu trời xuống mặt hồ (1950Hz -> 220Hz, tăng tốc mạnh về cuối)
                if (pinkNoiseBuffer) {
                    const whooshSrc = ctx.createBufferSource();
                    whooshSrc.buffer = pinkNoiseBuffer;
                    whooshSrc.loop = true;

                    const whooshBp = ctx.createBiquadFilter();
                    whooshBp.type = 'bandpass';
                    whooshBp.Q.setValueAtTime(1.0, now);
                    whooshBp.frequency.setValueAtTime(1950, now);
                    whooshBp.frequency.exponentialRampToValueAtTime(220, now + fallDur);

                    const whooshLp = ctx.createBiquadFilter();
                    whooshLp.type = 'lowpass';
                    whooshLp.frequency.setValueAtTime(2600, now);

                    const whooshEnv = ctx.createGain();
                    whooshEnv.gain.setValueAtTime(0.018, now);
                    whooshEnv.gain.exponentialRampToValueAtTime(0.48, now + fallDur * 0.88);
                    whooshEnv.gain.exponentialRampToValueAtTime(0.0001, now + fallDur + 0.05);

                    whooshSrc.connect(whooshBp);
                    whooshBp.connect(whooshLp);
                    whooshLp.connect(whooshEnv);
                    connectWithPanAndReverb(whooshEnv, 0.25, 0.18);
                    whooshSrc.start(now, Math.random() * 0.5);
                    whooshSrc.stop(now + fallDur + 0.06);
                }

                // 2. Âm vệt sáng sao băng lao xuống rõ nét (Dual-Detuned Shimmer Fall Glide: 880Hz A5 -> 520Hz -> 196Hz G3)
                const fallFlt = ctx.createBiquadFilter();
                fallFlt.type = 'lowpass';
                fallFlt.frequency.setValueAtTime(2400, now);
                fallFlt.frequency.exponentialRampToValueAtTime(480, now + fallDur);

                const fallEnv = ctx.createGain();
                fallEnv.gain.setValueAtTime(0.0001, now);
                fallEnv.gain.linearRampToValueAtTime(0.18, now + 0.08);
                fallEnv.gain.linearRampToValueAtTime(0.22, now + fallDur * 0.82);
                fallEnv.gain.exponentialRampToValueAtTime(0.0001, now + fallDur + 0.04);

                fallFlt.connect(fallEnv);
                connectWithPanAndReverb(fallEnv, 0.30, 0.12);

                ['sine', 'triangle'].forEach((waveType, idx) => {
                    const osc = ctx.createOscillator();
                    osc.type = waveType;
                    osc.detune.setValueAtTime(idx === 0 ? -4 : 4, now);
                    osc.frequency.setValueAtTime(880, now);
                    osc.frequency.exponentialRampToValueAtTime(520, now + fallDur * 0.50);
                    osc.frequency.exponentialRampToValueAtTime(196, now + fallDur);
                    const g = ctx.createGain();
                    g.gain.setValueAtTime(idx === 0 ? 0.65 : 0.35, now);
                    osc.connect(g);
                    g.connect(fallFlt);
                    osc.start(now);
                    osc.stop(now + fallDur + 0.05);
                });

                // 3. Đuôi bụi sao Harp lướt theo quỹ đạo rơi (A5 -> E5 -> C#5 -> A4)
                ['A5', 'E5', 'Csharp5', 'A4'].forEach((noteName, idx) => {
                    const pan = 0.26 - idx * 0.08;
                    playHarpPluck(n(noteName), now + idx * 0.12, 0.85, 0.12, pan);
                });
            }
        }

        // =====================================================================
        // DIỄN BIẾN 3: TIẾNG ĐÁP XUỐNG CỦA MẶT NƯỚC & SÓNG NƯỚC DÂNG TRÀN (tau = 1.59s -> 1.86s)
        // (Có đầy đủ tiếng chạm mặt nước "ÀO!" + sóng nước lan rộng Slow-Motion, nhưng TUYỆT ĐỐI KHÔNG có tiếng giọt nước nhỏ rơi lẻ tẻ!)
        // =====================================================================
        if (!wishBloomCueState.impact && tau >= 1.59) {
            wishBloomCueState.impact = true;
            if (canPlayAudio()) {
                triggerSubtleHaptic('water_drop');

                // A. Lực trầm sâu khi sao băng đáp xuống lòng hồ (Deep Lake Displacement 135Hz -> 40Hz — dải Sub-Bass uy lực, không có tiếng "tõm" giọt nước)
                const subOsc = ctx.createOscillator();
                const subEnv = ctx.createGain();
                subOsc.type = 'triangle';
                subOsc.frequency.setValueAtTime(135, now);
                subOsc.frequency.exponentialRampToValueAtTime(40, now + 0.48);
                subEnv.gain.setValueAtTime(0.0001, now);
                subEnv.gain.exponentialRampToValueAtTime(0.56, now + 0.008);
                subEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.54);
                subOsc.connect(subEnv);
                subEnv.connect(sfxBus);
                subOsc.start(now);
                subOsc.stop(now + 0.58);

                // B. Tiếng cú chạm mặt nước tung bọt trắng xóa ngay khoảnh khắc tiếp nước (Crisp Water-Surface Splash Strike 0.00s -> 0.18s)
                const splashBuf = noiseBuffer || pinkNoiseBuffer;
                if (splashBuf) {
                    const strikeSrc = ctx.createBufferSource();
                    strikeSrc.buffer = splashBuf;
                    strikeSrc.loop = true;

                    const strikeBp = ctx.createBiquadFilter();
                    strikeBp.type = 'bandpass';
                    strikeBp.Q.setValueAtTime(0.85, now);
                    strikeBp.frequency.setValueAtTime(1850, now);
                    strikeBp.frequency.exponentialRampToValueAtTime(420, now + 0.16);

                    const strikeLp = ctx.createBiquadFilter();
                    strikeLp.type = 'lowpass';
                    strikeLp.frequency.setValueAtTime(2800, now);

                    const strikeEnv = ctx.createGain();
                    strikeEnv.gain.setValueAtTime(0.0001, now);
                    strikeEnv.gain.exponentialRampToValueAtTime(0.46, now + 0.006);
                    strikeEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

                    strikeSrc.connect(strikeBp);
                    strikeBp.connect(strikeLp);
                    strikeLp.connect(strikeEnv);
                    connectWithPanAndReverb(strikeEnv, 0.30, 0);
                    strikeSrc.start(now, Math.random() * 0.4);
                    strikeSrc.stop(now + 0.20);
                }

                // C. Tiếng sóng nước mặt hồ dâng trào và lan rộng sang 2 bên trong Bullet-Time Slow-Motion (0.86s Wide Stereo Water Wave Wash)
                if (pinkNoiseBuffer) {
                    [-0.45, 0.45].forEach((panSide, idx) => {
                        const waveSrc = ctx.createBufferSource();
                        waveSrc.buffer = pinkNoiseBuffer;
                        waveSrc.loop = true;

                        const waveBp = ctx.createBiquadFilter();
                        waveBp.type = 'bandpass';
                        waveBp.Q.setValueAtTime(0.95, now);
                        waveBp.frequency.setValueAtTime(1520 - idx * 140, now);
                        waveBp.frequency.exponentialRampToValueAtTime(220, now + 0.82);

                        const waveLp = ctx.createBiquadFilter();
                        waveLp.type = 'lowpass';
                        waveLp.frequency.setValueAtTime(2200, now);

                        const waveEnv = ctx.createGain();
                        waveEnv.gain.setValueAtTime(0.0001, now);
                        waveEnv.gain.linearRampToValueAtTime(0.42, now + 0.030 + idx * 0.018);
                        waveEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.86);

                        waveSrc.connect(waveBp);
                        waveBp.connect(waveLp);
                        waveLp.connect(waveEnv);
                        connectWithPanAndReverb(waveEnv, 0.36, panSide);
                        waveSrc.start(now, Math.random() * 0.5);
                        waveSrc.stop(now + 0.90);
                    });
                }

                // D. Hợp âm Cột Sáng & Sóng Nước Ngân Vang (Dmaj9 / Aadd9)
                playWarmShimmerPad(['D4', 'Fsharp4', 'A4', 'E5'], now + 0.03, 1.8, 0.046);
                ['D4', 'A4', 'Csharp5', 'E5', 'A5'].forEach((noteName, idx) => {
                    const pan = ((idx / 4) - 0.5) * 0.65;
                    playHarpPluck(n(noteName), now + 0.03 + idx * 0.068, 1.75, 0.15, pan);
                });
            }
        }

        // =====================================================================
        // DIỄN BIẾN 4: ĐẠI ĐÓA HOA TRỒI LÊN & BUNG NỞ 5 TẦNG CÁNH NHUNG (tau = 1.87s -> 2.88s)
        // (Không dùng sine trượt lên 105->215Hz để không tạo tiếng bong bóng/giọt nước nhỏ)
        // =====================================================================
        if (!wishBloomCueState.bud && tau >= 1.87) {
            wishBloomCueState.bud = true;
            if (canPlayAudio()) {
                // Tiếng mặt nước rẽ đôi nâng Nụ Hoa & Đài Sen vươn lên (200Hz -> 740Hz)
                playSilkPaperWhoosh(0.50, 200, 740, 0.34, 0, 0);
                playHarpPluck(n('D4'), now + 0.015, 1.65, 0.16, -0.15);
                playHarpPluck(n('A4'), now + 0.090, 1.55, 0.15, 0.15);
            }
        }

        if (!wishBloomCueState.openLayer1 && tau >= 2.04) {
            wishBloomCueState.openLayer1 = true;
            playVelvetPetalBloomLayer(0, -0.30);
        }
        if (!wishBloomCueState.openLayer2 && tau >= 2.20) {
            wishBloomCueState.openLayer2 = true;
            playVelvetPetalBloomLayer(1, 0.30);
        }
        if (!wishBloomCueState.openLayer3 && tau >= 2.36) {
            wishBloomCueState.openLayer3 = true;
            playVelvetPetalBloomLayer(2, -0.20);
        }
        if (!wishBloomCueState.openLayer4 && tau >= 2.52) {
            wishBloomCueState.openLayer4 = true;
            playVelvetPetalBloomLayer(3, 0.20);
        }

        // Đại đóa hoa bung nở rực rỡ 100% (tau >= 2.72s)
        if (!wishBloomCueState.heart && tau >= 2.72) {
            wishBloomCueState.heart = true;
            if (canPlayAudio()) {
                triggerSubtleHaptic('light');
                playWarmShimmerPad(RIVER_WARM_PAD, now, 2.3, 0.046);
                playSilkPaperWhoosh(0.48, 340, 880, 0.24, 0, 0);
                ['A4', 'Csharp5', 'E5', 'A5'].forEach((noteName, idx) => {
                    const pan = ((idx / 3) - 0.5) * 0.55;
                    playHarpPluck(n(noteName), now + idx * 0.065, 1.65, 0.15, pan);
                });
            }
        }

        // =====================================================================
        // DIỄN BIẾN 5: KẾT TINH TẤM THIỆP LỤA & NÉT BÚT KHẮC CHỮ (tau = 3.14s -> 3.92s)
        // =====================================================================
        if (!wishBloomCueState.weave && tau >= 3.14) {
            wishBloomCueState.weave = true;
            if (canPlayAudio()) {
                triggerSubtleHaptic('light');
                playSilkPaperWhoosh(0.88, 300, 980, 0.28, 0, 0);
                playWarmShimmerPad(['Fsharp4', 'A4', 'Csharp5', 'E5'], now + 0.02, 1.6, 0.042);
                ['A4', 'Csharp5', 'E5'].forEach((noteName, idx) => {
                    playHarpPluck(n(noteName), now + idx * 0.14, 1.45, 0.13, (idx - 1) * 0.22);
                });
            }
        }

        // 2 nhịp lướt bút thư pháp êm dịu trên mặt giấy lụa (tau = 3.58s và 3.80s)
        if (!wishBloomCueState.calligraphy1 && tau >= 3.58) {
            wishBloomCueState.calligraphy1 = true;
            playGoldenQuillGlide(0);
        }
        if (!wishBloomCueState.calligraphy3 && tau >= 3.80) {
            wishBloomCueState.calligraphy3 = true;
            playGoldenQuillGlide(1);
        }

        // =====================================================================
        // DIỄN BIẾN 6: 4 CÁNH HOA TÁCH ĐÀI & GẤP ORIGAMI 3D THÀNH 4 VẠT PHONG BÌ (tau = 4.15s -> 6.14s)
        // =====================================================================
        if (!wishBloomCueState.origamiDetach && tau >= 4.15) {
            wishBloomCueState.origamiDetach = true;
            if (canPlayAudio()) {
                playSilkPaperWhoosh(0.65, 280, 780, 0.28, 0, 0.01);
                ['D4', 'A4', 'E5'].forEach((noteName, idx) => {
                    playHarpPluck(n(noteName), now + idx * 0.08, 1.35, 0.14, (idx - 1) * 0.25);
                });
            }
        }

        if (!wishBloomCueState.foldLeft && tau >= 4.62) {
            wishBloomCueState.foldLeft = true;
            playOrigamiFlapFold(0, -0.42);
        }
        if (!wishBloomCueState.foldRight && tau >= 4.84) {
            wishBloomCueState.foldRight = true;
            playOrigamiFlapFold(1, 0.42);
        }
        if (!wishBloomCueState.foldBottom && tau >= 5.12) {
            wishBloomCueState.foldBottom = true;
            playOrigamiFlapFold(2, 0.0);
        }
        if (!wishBloomCueState.foldTop && tau >= 5.42) {
            wishBloomCueState.foldTop = true;
            playOrigamiFlapFold(3, 0.0);
        }

        if (!wishBloomCueState.origamiLock && tau >= 6.02) {
            wishBloomCueState.origamiLock = true;
            playOrigamiEnvelopeLockBurst();
        }

        // =====================================================================
        // DIỄN BIẾN 7: ĐÀI HOA DÂNG PHONG BÌ LÊN GIỮA SÂN KHẤU & ĐÓN ẤN SÁP VÀNG 24K (tau = 6.50s -> 7.45s)
        // =====================================================================
        if (!wishBloomCueState.lift && tau >= 6.50) {
            wishBloomCueState.lift = true;
            setEnvelopeSpatialMuffle(true, 0.9);
            if (canPlayAudio()) {
                playSilkPaperWhoosh(0.92, 260, 840, 0.30, 0, 0);
                ['D4', 'Fsharp4', 'A4', 'Csharp5', 'E5'].forEach((noteName, idx) => {
                    playHarpPluck(n(noteName), now + idx * 0.085, 1.55, 0.13, (idx - 2) * 0.20);
                });
            }
        }

        if (!wishBloomCueState.presentSettle && tau >= 7.36) {
            wishBloomCueState.presentSettle = true;
            if (canPlayAudio()) {
                playSilkPaperWhoosh(0.28, 580, 280, 0.22, 0, 0);
            }
        }
    }

    // =========================================================================
    // 7. SÂN KHẤU ĐẠO DIỄN PHONG BÌ 3D HỢP NHẤT (director-3d.js)
    // =========================================================================
    function playUnified3DEnvelopeOpenSequence(motionId) {
        if (motionId) {
            currentMotionTheme = motionId;
        }
        setEnvelopeSpatialMuffle(false, 1.0);

        if (!canPlayAudio()) return;

        const t0 = ctx.currentTime + 0.005;

        // Xúc giác nhẹ nhàng khi con dấu sáp xoay tụ lực
        triggerSubtleHaptic('heartbeat');
        setTimeout(() => {
            if (canPlayAudio()) triggerSubtleHaptic('heartbeat');
        }, 280);

        // --- PHA A (0.00s -> 0.88s): Hợp âm rải Đàn Harp Aadd9 nâng cảm xúc ấm áp ---
        playHarpPluck(n('A4'), t0 + 0.01, 0.95, 0.11, -0.3);
        setTimeout(() => {
            if (!canPlayAudio()) return;
            const tFollow = ctx.currentTime + 0.005;
            ['B4', 'Csharp5', 'E5', 'Fsharp5', 'A5'].forEach((noteName, i) => {
                playHarpPluck(n(noteName), tFollow + i * 0.13, 0.95, 0.10 + i * 0.01, (i - 2) * 0.2);
            });
            playSilkPaperWhoosh(0.65, 420, 1080, 0.15, 0, 0.05);
        }, 18);

        // --- PHA B (t = 0.88s = WINDUP_END): Nổ Vỡ Phong Ấn Sáp Vàng & Bật Lò Xo Nắp Thư ---
        setTimeout(() => {
            if (!canPlayAudio()) return;
            playWaxSealCrack();
            playSilkPaperWhoosh(0.32, 380, 920, 0.19, 0, 0.02);
        }, 870);

        // --- PHA C (t = 0.98s = EXTRACT_START): Phun Trào Vật Lý Từ Miệng Túi & Rút Thiệp 3D (0.98s -> 2.32s) ---
        setTimeout(() => {
            if (!canPlayAudio()) return;
            playSilkPaperWhoosh(1.18, 360, 1060, 0.21, 0, 0);
            playHarpPluck(n(RIVER_REVEAL_CHORD[0]), ctx.currentTime + 0.005, 1.9, 0.14, -0.4);
            setTimeout(() => {
                if (!canPlayAudio()) return;
                const tChord = ctx.currentTime + 0.005;
                for (let idx = 1; idx < RIVER_REVEAL_CHORD.length; idx++) {
                    const pan = ((idx / Math.max(1, RIVER_REVEAL_CHORD.length - 1)) - 0.5) * 0.75;
                    playHarpPluck(n(RIVER_REVEAL_CHORD[idx]), tChord + (idx - 1) * 0.065 + 0.035, 1.9, 0.14, pan);
                }
            }, 26);
        }, 980);

        // --- PHA D (t = 2.32s = EXTRACT_END -> 2.94s = PRESENT_END): Mở Rộng Tấm Thiệp Ra Giữa Sân Khấu ---
        setTimeout(() => {
            if (!canPlayAudio()) return;
            playSilkPaperWhoosh(0.45, 720, 480, 0.14, 0, 0);
            const now2 = ctx.currentTime + 0.02;
            playWarmShimmerPad(RIVER_WARM_PAD, now2, 2.5, 0.032);
            ['A4', 'Csharp5', 'E5', 'Fsharp5', 'A5'].forEach((noteName, idx) => {
                playHarmonicChime(n(noteName), now2 + idx * 0.06, 1.2, 0.12, (idx - 2) * 0.22);
            });
        }, 2320);
    }

    // =========================================================================
    // 8. CỤM 2 NÚT ĐỘC LẬP: TẮT/BẬT NHẠC NỀN (BGM) & TẮT/BẬT HIỆU ỨNG (SFX)
    // =========================================================================
    let audioClusterEl = null;
    let bgmToggleBtn = null;
    let sfxToggleBtn = null;

    function createFloatingAudioCluster() {
        if (document.getElementById('luxury-audio-cluster')) return;

        // Mặc định khi vào trang luôn tắt nhạc nền (isBgmMuted = true); người dùng muốn nghe sẽ chủ động bấm nút mở
        isBgmMuted = true;
        try {
            const savedSfxMute = sessionStorage.getItem('btlmvn_2010_sfx_muted');
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
        bgmBtn.setAttribute('title', isBgmMuted ? 'Bật nhạc nền River Flows in You' : 'Tắt nhạc nền');
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
        bgmToggleBtn.setAttribute('title', isBgmMuted ? 'Bật nhạc nền River Flows in You' : 'Tắt nhạc nền');
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
            if (!isSfxMuted) {
                playUiTap('tab', 0);
            }
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
            playUiTap('tab', 2);
        }
    }

    // =========================================================================
    // 9. TỰ ĐỘNG MỞ KHÓA ÂM THANH TRÊN IOS / ZALO / TELEGRAM & KẾT NỐI SỰ KIỆN
    // =========================================================================
    function unlockAudioOnFirstGesture() {
        if (!isUnlocked) {
            isUnlocked = true;
            if (!isBgmMuted) {
                ensureBgmPlayer();
                startOrResumeBgm();
            }
        } else if (bgmAudio && bgmAudio.paused && !isBgmMuted && !isPageHidden) {
            startOrResumeBgm();
        }

        const c = ensureAudioContext();
        if (c) {
            if (c.state === 'suspended' || c.state === 'interrupted') {
                c.resume().catch(() => {});
            }
            try {
                const silentBuf = c.createBuffer(1, 1, 22050);
                const src = c.createBufferSource();
                src.buffer = silentBuf;
                src.connect(c.destination);
                src.start(0);
            } catch (_) {}
        }
    }

    function bindGlobalInteractionSounds() {
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

            // 1. Nút Đóng thiệp lại vào phong bì ở Bước 1
            if (target.closest('#replay-envelope-btn')) {
                playStep1EnvelopeCloseSequence();
                return;
            }

            // 2. Nút Tự phối gu & Đổi câu chúc ngẫu nhiên
            if (target.closest('#magic-harmony-btn')) {
                playMagicGlissando(false);
                return;
            }
            if (target.closest('#shuffle-quote-btn, #modal-random-wish-btn, #step3-reroll-quote-btn')) {
                playMagicGlissando(true);
                return;
            }

            // 3. Nút Hoàn tất / Tạo thiệp / Sao chép Link / Lưu ảnh
            if (target.closest('#generate-final-btn')) {
                if (!window.isSelfOracleMode) {
                    playSuccessChime();
                }
                return;
            }
            if (target.closest('#apply-text-modal-btn, #copy-rich-link-btn, #download-btn, #recipient-save-card-btn')) {
                playSuccessChime();
                return;
            }

            // 4. Các nút công cụ xoay/lật/căn giữa ảnh
            if (target.closest('#flip-h-btn, #rotate-btn, #flip-h-btn-2, #rotate-btn-2, #reset-crop-btn')) {
                playUiTap('camera', 0);
                return;
            }

            // 5. Chuyển Tab ở Bước 2
            const tabBtn = target.closest('.deck-tab');
            if (tabBtn) {
                const allTabs = Array.from(document.querySelectorAll('.deck-tab'));
                playUiTap('tab', Math.max(0, allTabs.indexOf(tabBtn)));
                return;
            }

            // 6. Các Chip chọn Khung, Chủ đề lời chúc, Viền, Tông màu, Bộ lọc, Hiệu ứng Motion
            const chipBtn = target.closest('.concept-chip, .topic-chip, .style-chip, .color-swatch-btn, .filter-btn, .motion-chip, .frame-page-btn, .wish-mode-btn, .link-suggest-chip');
            if (chipBtn) {
                const parent = chipBtn.parentElement;
                const idx = parent ? Array.from(parent.children).indexOf(chipBtn) : 0;
                playUiTap('chip', idx);
                return;
            }

            // 7. Các nút điều hướng / nút chính khác
            if (target.closest('button, .btn-primary, .btn-secondary')) {
                playUiTap('chip', 2);
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
            // Chỉ ghi nhận chủ đề hiệu ứng, tuyệt đối giữ nguyên bài River Flows in You đang phát!
            if (motionId) {
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
        playWaxSealDescentWhoosh,
        playWaxSealStampImpact,
        playStep1EnvelopeOpenSequence,
        playStep1EnvelopeCloseSequence,
        playCelebrationBurst,
        playCardFanSwipe,
        playCardWinkTwinkle,
        playSuccessChime,
        playSilkPaperWhoosh,
        resetWishBloomCues,
        playPreludeStarAppear,
        updateWishBloomAudioByTau,
        playUnified3DEnvelopeOpenSequence
    };
})();
