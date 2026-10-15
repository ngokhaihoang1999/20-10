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

    let isBgmMuted = false;
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
            skyTwinkle2: false,
            fall: false,
            fallSpark1: false,
            fallSpark2: false,
            preImpact: false,
            impact: false,
            droplet1: false,
            droplet2: false,
            droplet3: false,
            bud: false,
            dewdrop1: false,
            dewdrop2: false,
            openLayer1: false,
            openLayer2: false,
            openLayer3: false,
            heart: false,
            weave: false,
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

    // 5.1. Chạm tay nở hoa trên thiệp (Giọt sương Đàn Harp đồng điệu tông A Major)
    function playTouchSparkle(clientX) {
        if (!canPlayAudio()) return;
        const nowPerf = performance.now();
        if (nowPerf - lastSparkleSoundTime < 145) return; // Giãn nhịp 145ms để êm dịu, không bao giờ dồn dập
        lastSparkleSoundTime = nowPerf;

        const noteName = RIVER_SCALE[sparkleNoteIndex % RIVER_SCALE.length];
        sparkleNoteIndex = (sparkleNoteIndex + 1) % RIVER_SCALE.length;

        const vw = window.innerWidth || 1;
        const pan = typeof clientX === 'number' ? ((clientX / vw) * 2 - 1) * 0.45 : 0;

        playHarmonicChime(n(noteName), ctx.currentTime, 0.65, 0.068, pan);
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

    // 5.5. Tiếng Lụa / Giấy Mỹ Thuật Trượt Mềm (Dual-Formant Physical Friction)
    function playSilkPaperWhoosh(duration = 0.38, startFreq = 360, endFreq = 920, peakGain = 0.24, pan = 0, delaySec = 0) {
        if (!canPlayAudio() || !pinkNoiseBuffer) return;
        const t0 = ctx.currentTime + Math.max(0.004, delaySec);

        // Lớp 1: Thân giấy/lụa ấm (Low-Mid Formant Body, Q = 1.25 để giữ trọn năng lượng dải trung)
        const src = ctx.createBufferSource();
        src.buffer = pinkNoiseBuffer;
        src.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.setValueAtTime(1.25, t0);
        filter.frequency.setValueAtTime(startFreq, t0);
        filter.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration * 0.62);
        filter.frequency.exponentialRampToValueAtTime(Math.max(220, startFreq * 0.82), t0 + duration);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, t0);
        env.gain.linearRampToValueAtTime(peakGain, t0 + duration * 0.26);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

        src.connect(filter);
        filter.connect(env);
        connectWithPanAndReverb(env, 0.16, pan);

        // Lớp 2: Sớ sợi giấy ngọc trai sột soạt sắc nét ở dải cao (Crisp Fiber Sheen 2200Hz -> 3600Hz)
        if (noiseBuffer) {
            const crispSrc = ctx.createBufferSource();
            crispSrc.buffer = noiseBuffer;
            crispSrc.loop = true;

            const crispFlt = ctx.createBiquadFilter();
            crispFlt.type = 'bandpass';
            crispFlt.Q.setValueAtTime(1.6, t0);
            crispFlt.frequency.setValueAtTime(Math.min(4200, startFreq * 3.2), t0);
            crispFlt.frequency.exponentialRampToValueAtTime(Math.min(5400, endFreq * 3.0), t0 + duration * 0.58);

            const crispEnv = ctx.createGain();
            crispEnv.gain.setValueAtTime(0.0001, t0);
            crispEnv.gain.linearRampToValueAtTime(peakGain * 0.34, t0 + duration * 0.22);
            crispEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + duration * 0.92);

            crispSrc.connect(crispFlt);
            crispFlt.connect(crispEnv);
            connectWithPanAndReverb(crispEnv, 0.10, pan);

            crispSrc.start(t0, Math.random() * 0.5);
            crispSrc.stop(t0 + duration + 0.03);
        }

        src.start(t0, Math.random() * 0.5);
        src.stop(t0 + duration + 0.04);
    }

    // 5.6. Tiếng Tách Con Dấu Sáp Vàng 24K Giòn Tan & Chùm Harp Vàng A Major
    function playWaxSealCrack() {
        if (!canPlayAudio()) return;
        triggerSubtleHaptic('seal_pop');
        const t0 = ctx.currentTime + 0.005;

        // Lớp 1: Cộng hưởng thân sáp vàng tách giòn (Warm Body Thump 240Hz -> 72Hz rõ trên loa điện thoại)
        const bodyOsc = ctx.createOscillator();
        const bodyEnv = ctx.createGain();
        bodyOsc.type = 'triangle';
        bodyOsc.frequency.setValueAtTime(240, t0);
        bodyOsc.frequency.exponentialRampToValueAtTime(72, t0 + 0.072);
        bodyEnv.gain.setValueAtTime(0.0001, t0);
        bodyEnv.gain.exponentialRampToValueAtTime(0.42, t0 + 0.005);
        bodyEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.085);
        bodyOsc.connect(bodyEnv);
        bodyEnv.connect(sfxBus);
        bodyOsc.start(t0);
        bodyOsc.stop(t0 + 0.095);

        // Lớp 2: Tiếng nứt sáp giòn tan 2 nhịp ("tách-rắc!") ở dải cao (Crisp Double-Snap 2400Hz & 3400Hz)
        if (noiseBuffer) {
            [0, 0.018].forEach((offset, idx) => {
                const snapSrc = ctx.createBufferSource();
                snapSrc.buffer = noiseBuffer;
                const snapFlt = ctx.createBiquadFilter();
                snapFlt.type = 'bandpass';
                snapFlt.frequency.setValueAtTime(idx === 0 ? 2350 : 3350, t0 + offset);
                snapFlt.Q.setValueAtTime(1.5, t0 + offset);
                const snapEnv = ctx.createGain();
                snapEnv.gain.setValueAtTime(0.0001, t0 + offset);
                snapEnv.gain.exponentialRampToValueAtTime(idx === 0 ? 0.44 : 0.34, t0 + offset + 0.0025);
                snapEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.036);
                snapSrc.connect(snapFlt);
                snapFlt.connect(snapEnv);
                connectWithPanAndReverb(snapEnv, 0.16, idx === 0 ? -0.12 : 0.14);
                snapSrc.start(t0 + offset, Math.random() * 0.4);
                snapSrc.stop(t0 + offset + 0.045);
            });
        }

        // Lớp 3: Chùm kim tuyến 24K bung sáng đồng điệu hợp âm Aadd9
        const sparkleNotes = ['A4', 'Csharp5', 'E5', 'A5'];
        sparkleNotes.forEach((noteName, idx) => {
            playHarmonicChime(n(noteName), t0 + 0.016 + idx * 0.038, 0.58, 0.11, (idx - 1.5) * 0.22);
        });
    }

    // 5.6B. Tiếng Con Dấu Sáp Vàng 24K Xé Gió Giáng Xuống Từ Trên Cao (Wax Seal Descent Whoosh)
    function playWaxSealDescentWhoosh(durationSec = 0.28) {
        if (!canPlayAudio()) return;
        const t0 = ctx.currentTime + 0.004;
        const dur = Math.max(0.18, Math.min(0.42, durationSec));

        // Lớp 1: Luồng gió nén tăng tốc từ cao xuống thấp (Focused Air Whoosh 2200Hz -> 280Hz, Q = 1.15)
        if (pinkNoiseBuffer) {
            const src = ctx.createBufferSource();
            src.buffer = pinkNoiseBuffer;
            src.loop = true;

            const flt = ctx.createBiquadFilter();
            flt.type = 'bandpass';
            flt.Q.setValueAtTime(1.15, t0);
            flt.frequency.setValueAtTime(2200, t0);
            flt.frequency.exponentialRampToValueAtTime(280, t0 + dur);

            const env = ctx.createGain();
            env.gain.setValueAtTime(0.0001, t0);
            env.gain.exponentialRampToValueAtTime(0.36, t0 + dur * 0.72);
            env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.025);

            src.connect(flt);
            flt.connect(env);
            connectWithPanAndReverb(env, 0.14, 0);
            src.start(t0, Math.random() * 0.4);
            src.stop(t0 + dur + 0.04);
        }

        // Lớp 2: Âm rít kim loại khuôn đồng lao xuống (Brass Signet Doppler Sweep 980Hz -> 195Hz)
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(980, t0);
        osc.frequency.exponentialRampToValueAtTime(195, t0 + dur);
        env.gain.setValueAtTime(0.0001, t0);
        env.gain.exponentialRampToValueAtTime(0.20, t0 + dur * 0.78);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.02);
        osc.connect(env);
        connectWithPanAndReverb(env, 0.18, 0);
        osc.start(t0);
        osc.stop(t0 + dur + 0.03);
    }

    // 5.7. Tiếng Đóng Ấn Sáp Vàng 24K Uy Lực & Chân Thực (Khi Ấn Sáp Vàng chạm Nắp Thư 3D)
    function playWaxSealStampImpact() {
        if (!canPlayAudio()) return;
        triggerSubtleHaptic('stamp');
        const t0 = ctx.currentTime + 0.004;

        // Khôi phục dần nhạc nền sau khi đóng ấn hoàn tất
        setBgmDuck(0.28, 1.35);

        // Lớp 1A: Lực đầm vật lý của khuôn đồng ép xuống bàn/phong bì (Heavy Low-Mid Punch 210Hz -> 52Hz)
        const subOsc = ctx.createOscillator();
        const subEnv = ctx.createGain();
        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(210, t0);
        subOsc.frequency.exponentialRampToValueAtTime(52, t0 + 0.15);
        subEnv.gain.setValueAtTime(0.0001, t0);
        subEnv.gain.exponentialRampToValueAtTime(0.56, t0 + 0.005);
        subEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
        subOsc.connect(subEnv);
        subEnv.connect(sfxBus);
        subOsc.start(t0);
        subOsc.stop(t0 + 0.20);

        // Lớp 1B: Tiếng "CỘP!" đanh chắc của khuôn ấn chạm giấy bìa (Wood/Parchment Knock 520Hz -> 135Hz)
        // Giúp loa điện thoại (vốn cắt tần dưới 150Hz) vẫn nghe rõ lực đóng dấu cực kỳ uy lực!
        const knockOsc = ctx.createOscillator();
        const knockEnv = ctx.createGain();
        knockOsc.type = 'sine';
        knockOsc.frequency.setValueAtTime(520, t0);
        knockOsc.frequency.exponentialRampToValueAtTime(135, t0 + 0.055);
        knockEnv.gain.setValueAtTime(0.0001, t0);
        knockEnv.gain.exponentialRampToValueAtTime(0.46, t0 + 0.003);
        knockEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.068);
        knockOsc.connect(knockEnv);
        knockEnv.connect(sfxBus);
        knockOsc.start(t0);
        knockOsc.stop(t0 + 0.08);

        // Lớp 2A: Tiếng mặt dấu kim loại chạm giấy (Crisp Surface Smack 2150Hz, Q = 1.3)
        if (noiseBuffer) {
            const impSrc = ctx.createBufferSource();
            impSrc.buffer = noiseBuffer;
            const impFlt = ctx.createBiquadFilter();
            impFlt.type = 'bandpass';
            impFlt.frequency.setValueAtTime(2150, t0);
            impFlt.Q.setValueAtTime(1.3, t0);
            const impEnv = ctx.createGain();
            impEnv.gain.setValueAtTime(0.0001, t0);
            impEnv.gain.exponentialRampToValueAtTime(0.48, t0 + 0.003);
            impEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.045);
            impSrc.connect(impFlt);
            impFlt.connect(impEnv);
            connectWithPanAndReverb(impEnv, 0.14, 0);
            impSrc.start(t0, Math.random() * 0.4);
            impSrc.stop(t0 + 0.055);
        }

        // Lớp 2B: Tiếng sáp vàng nóng chảy phì nhẹ & tràn viền quanh khuôn đồng (Molten Wax Squish & Sizzle)
        if (pinkNoiseBuffer) {
            const waxSrc = ctx.createBufferSource();
            waxSrc.buffer = pinkNoiseBuffer;
            waxSrc.loop = true;
            const waxFlt = ctx.createBiquadFilter();
            waxFlt.type = 'bandpass';
            waxFlt.Q.setValueAtTime(1.4, t0 + 0.012);
            waxFlt.frequency.setValueAtTime(1450, t0 + 0.012);
            waxFlt.frequency.exponentialRampToValueAtTime(420, t0 + 0.165);
            const waxEnv = ctx.createGain();
            waxEnv.gain.setValueAtTime(0.0001, t0 + 0.012);
            waxEnv.gain.linearRampToValueAtTime(0.36, t0 + 0.035);
            waxEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.175);
            waxSrc.connect(waxFlt);
            waxFlt.connect(waxEnv);
            connectWithPanAndReverb(waxEnv, 0.16, 0);
            waxSrc.start(t0 + 0.012, Math.random() * 0.4);
            waxSrc.stop(t0 + 0.19);
        }

        // Lớp 3: Tiếng ngân kim loại hoàng gia của khuôn ấn vàng 24K (Brass Signet Ring: A4 + E5 + C#6)
        playHarmonicChime(n('A4'), t0 + 0.006, 0.92, 0.20, -0.14);
        playHarmonicChime(n('E5'), t0 + 0.022, 0.98, 0.18, 0.14);
        playHarmonicChime(n('A5'), t0 + 0.045, 1.05, 0.16, 0.0);
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
    // 6. ĐẠI CẢNH 3D "NỤ HOA ƯỚC NGUYỆN" (wish-bloom.js) — PHYSICAL FOLEY & FRAME-LOCKED TAU
    // =========================================================================
    function resetWishBloomCues(preservePreludeStar = false) {
        const hadPrelude = preservePreludeStar && wishBloomCueState && wishBloomCueState.preludeStar;
        wishBloomCueState = createEmptyWishBloomCueState();
        if (hadPrelude) wishBloomCueState.preludeStar = true;
    }

    // 6.0A. Tiếng Giọt Nước Thật Rơi Xuống Mặt Hồ (2-Stage Meniscus Pitch-Dip + Bubble Pop: "Plip-bloop!")
    function playWaterDropletPlink(baseFreq = 520, endFreq = 1380, duration = 0.095, peakGain = 0.28, pan = 0, delaySec = 0) {
        if (!canPlayAudio()) return;
        const t0 = ctx.currentTime + Math.max(0.003, delaySec);

        // 1. Bọt khí Minnaert thật: Khi giọt nước chạm mặt hồ, khoang khí lõm xuống (tần số hạ nhẹ 0->18ms)
        // rồi khép cổ phóng bọt khí lên (tần số vọt nhanh từ baseFreq -> endFreq tạo tiếng "plip!" ướt át đặc trưng)
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * 1.35, t0);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.82, t0 + duration * 0.22);
        osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration * 0.88);

        env.gain.setValueAtTime(0.0001, t0);
        env.gain.exponentialRampToValueAtTime(peakGain, t0 + 0.005);
        env.gain.exponentialRampToValueAtTime(peakGain * 0.65, t0 + duration * 0.35);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

        osc.connect(env);
        connectWithPanAndReverb(env, 0.28, pan);
        osc.start(t0);
        osc.stop(t0 + duration + 0.02);

        // 2. Tiếng màng nước tách nhẹ trên bề mặt (Wet Surface Transient 2800Hz)
        if (noiseBuffer) {
            const popSrc = ctx.createBufferSource();
            popSrc.buffer = noiseBuffer;
            const popFlt = ctx.createBiquadFilter();
            popFlt.type = 'bandpass';
            popFlt.frequency.setValueAtTime(2800, t0);
            popFlt.Q.setValueAtTime(1.8, t0);
            const popEnv = ctx.createGain();
            popEnv.gain.setValueAtTime(0.0001, t0);
            popEnv.gain.exponentialRampToValueAtTime(peakGain * 0.45, t0 + 0.002);
            popEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.018);
            popSrc.connect(popFlt);
            popFlt.connect(popEnv);
            connectWithPanAndReverb(popEnv, 0.15, pan);
            popSrc.start(t0, Math.random() * 0.5);
            popSrc.stop(t0 + 0.024);
        }
    }

    // 6.0B. Tiếng Đập Cánh Bướm Lụa Rõ Nét Trên Mặt Hồ (4 nhịp vỗ cánh "phập-phập-phập-phập")
    function playButterflyWingFlutter(pan = 0, delaySec = 0) {
        if (!canPlayAudio() || !pinkNoiseBuffer) return;
        for (let w = 0; w < 4; w++) {
            const tFlap = ctx.currentTime + Math.max(0.004, delaySec + w * 0.056);
            const flapPan = Math.max(-0.85, Math.min(0.85, pan + (w - 1.5) * 0.14));

            // Tiếng cánh bướm quạt không khí (Low-Mid Wing Beat + Soft Silk Rustle)
            const src = ctx.createBufferSource();
            src.buffer = pinkNoiseBuffer;
            const flt = ctx.createBiquadFilter();
            flt.type = 'bandpass';
            flt.Q.setValueAtTime(1.4, tFlap);
            flt.frequency.setValueAtTime(480 + w * 90, tFlap);
            flt.frequency.exponentialRampToValueAtTime(1350 + w * 140, tFlap + 0.042);

            const env = ctx.createGain();
            env.gain.setValueAtTime(0.0001, tFlap);
            env.gain.linearRampToValueAtTime(0.22 - w * 0.025, tFlap + 0.012);
            env.gain.exponentialRampToValueAtTime(0.0001, tFlap + 0.048);

            src.connect(flt);
            flt.connect(env);
            connectWithPanAndReverb(env, 0.14, flapPan);
            src.start(tFlap, Math.random() * 0.5);
            src.stop(tFlap + 0.055);
        }
    }

    // 6.0C. Tiếng Bụi Sao Lấp Lánh Nổ Nhẹ Dọc Đuôi Sao Băng (Crisp Stardust Sparkle Crackle)
    function playStardustSparkCrackle(freq = 2400, pan = 0) {
        if (!canPlayAudio()) return;
        const t0 = ctx.currentTime + 0.003;

        // 2 hạt tia lửa sao nổ lách tách cực ngắn ("tách-tinh!")
        if (noiseBuffer) {
            for (let i = 0; i < 2; i++) {
                const ts = t0 + i * 0.026;
                const src = ctx.createBufferSource();
                src.buffer = noiseBuffer;
                const flt = ctx.createBiquadFilter();
                flt.type = 'bandpass';
                flt.Q.setValueAtTime(2.2, ts);
                flt.frequency.setValueAtTime(3400 + i * 900, ts);
                const env = ctx.createGain();
                env.gain.setValueAtTime(0.0001, ts);
                env.gain.exponentialRampToValueAtTime(0.24, ts + 0.002);
                env.gain.exponentialRampToValueAtTime(0.0001, ts + 0.022);
                src.connect(flt);
                flt.connect(env);
                connectWithPanAndReverb(env, 0.18, pan + (i === 0 ? -0.08 : 0.08));
                src.start(ts, Math.random() * 0.6);
                src.stop(ts + 0.028);
            }
        }

        // Tiếng ngân pha lê siêu ngắn ở tần số cao
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t0);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.45, t0 + 0.065);
        env.gain.setValueAtTime(0.0001, t0);
        env.gain.exponentialRampToValueAtTime(0.11, t0 + 0.004);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
        osc.connect(env);
        connectWithPanAndReverb(env, 0.24, pan);
        osc.start(t0);
        osc.stop(t0 + 0.10);
    }

    // 6.0D. Tiếng Cánh Hoa Nhung Bung Nở Đa Tầng (Organic Velvet Petal Unfurl Swell)
    function playVelvetPetalUnfurl(layerIdx = 0, pan = 0) {
        if (!canPlayAudio() || !pinkNoiseBuffer) return;
        const t0 = ctx.currentTime + 0.004;

        // Cánh hoa nhung tách mở có 2 nhịp ma sát mềm ("phựt-xòe" tự nhiên như cánh sen/cánh hồng bung nở)
        const baseF = 340 + layerIdx * 110;
        const peakF = 980 + layerIdx * 180;

        const src = ctx.createBufferSource();
        src.buffer = pinkNoiseBuffer;
        src.loop = true;

        const flt = ctx.createBiquadFilter();
        flt.type = 'bandpass';
        flt.Q.setValueAtTime(1.3, t0);
        flt.frequency.setValueAtTime(baseF, t0);
        flt.frequency.exponentialRampToValueAtTime(peakF, t0 + 0.09);
        flt.frequency.exponentialRampToValueAtTime(baseF * 1.25, t0 + 0.16);
        flt.frequency.exponentialRampToValueAtTime(peakF * 1.15, t0 + 0.28);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, t0);
        env.gain.linearRampToValueAtTime(0.28, t0 + 0.045);
        env.gain.linearRampToValueAtTime(0.14, t0 + 0.13);
        env.gain.linearRampToValueAtTime(0.24, t0 + 0.21);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.34);

        src.connect(flt);
        flt.connect(env);
        connectWithPanAndReverb(env, 0.18, pan);
        src.start(t0, Math.random() * 0.4);
        src.stop(t0 + 0.36);

        // Nốt đàn Harp ấm áp đi kèm đúng tầng cánh hoa (chỉ 1 nốt rõ ràng cho mỗi tầng cánh để không bị rối)
        const layerNotes = ['A4', 'Csharp5', 'E5'];
        playHarpPluck(n(layerNotes[layerIdx % layerNotes.length]), t0 + 0.015, 0.95, 0.15, pan);
    }

    // 6.0E. Tiếng Ngòi Bút Máy Vàng Khắc Thư Pháp ASMR Lên Giấy Ngọc Trai (Fountain-Pen Nib Scratch)
    function playGoldenNibStroke(lineIdx = 0) {
        if (!canPlayAudio()) return;
        const t0 = ctx.currentTime + 0.003;
        const pan = -0.26 + lineIdx * 0.17; // Quét stereo từ trái sang phải theo từng dòng chữ

        // 3 nhịp nét bút thanh-đậm liên tiếp ("sột-soạt-sẹt!") mô phỏng ngòi bút kim loại lướt trên mặt giấy nhám
        const subStrokes = [
            { offset: 0.000, dur: 0.032, f1: 2400, f2: 3500, gain: 0.30 },
            { offset: 0.036, dur: 0.026, f1: 3100, f2: 2200, gain: 0.22 },
            { offset: 0.066, dur: 0.038, f1: 2600, f2: 3900, gain: 0.32 }
        ];

        subStrokes.forEach((st) => {
            const ts = t0 + st.offset;
            const buf = noiseBuffer || pinkNoiseBuffer;
            if (!buf) return;

            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.loop = true;

            const flt = ctx.createBiquadFilter();
            flt.type = 'bandpass';
            flt.Q.setValueAtTime(1.8, ts);
            flt.frequency.setValueAtTime(st.f1 + lineIdx * 120, ts);
            flt.frequency.exponentialRampToValueAtTime(st.f2 + lineIdx * 120, ts + st.dur);

            const env = ctx.createGain();
            env.gain.setValueAtTime(0.0001, ts);
            env.gain.linearRampToValueAtTime(st.gain, ts + 0.006);
            env.gain.exponentialRampToValueAtTime(0.0001, ts + st.dur);

            src.connect(flt);
            flt.connect(env);
            connectWithPanAndReverb(env, 0.10, pan);
            src.start(ts, Math.random() * 0.5);
            src.stop(ts + st.dur + 0.01);
        });

        // Cộng hưởng thân ngòi bút kim loại chạm giấy (Metallic Nib Tick 1450Hz -> 920Hz)
        const nibOsc = ctx.createOscillator();
        const nibEnv = ctx.createGain();
        nibOsc.type = 'triangle';
        nibOsc.frequency.setValueAtTime(1380 + lineIdx * 110, t0);
        nibOsc.frequency.exponentialRampToValueAtTime(860 + lineIdx * 80, t0 + 0.035);
        nibEnv.gain.setValueAtTime(0.0001, t0);
        nibEnv.gain.exponentialRampToValueAtTime(0.12, t0 + 0.003);
        nibEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.042);
        nibOsc.connect(nibEnv);
        connectWithPanAndReverb(nibEnv, 0.12, pan);
        nibOsc.start(t0);
        nibOsc.stop(t0 + 0.05);
    }

    // 6.0F. Tiếng Gấp Từng Cánh Hoa Origami 3D Thành Vạt Phong Bì (Crisp Cardstock Fold & Crease)
    function playOrigamiFlapFold(slotIdx = 0, pan = 0) {
        if (!canPlayAudio()) return;
        const t0 = ctx.currentTime + 0.004;
        triggerSubtleHaptic('light');

        // 1. Tiếng vạt giấy bìa mỹ thuật uốn cong qua không khí (0 -> 140ms)
        const startF = 420 + slotIdx * 65;
        const endF = 1280 + slotIdx * 110;
        playSilkPaperWhoosh(0.24, startF, endF, 0.34, pan, 0);

        // 2. Tiếng miết gáy giấy vào nếp sắc lẹm ("xoẹt-cụp!" ở 135ms khi cánh hoa khép vào cạnh thiệp)
        const tCrease = t0 + 0.135;
        if (noiseBuffer) {
            const crSrc = ctx.createBufferSource();
            crSrc.buffer = noiseBuffer;
            const crFlt = ctx.createBiquadFilter();
            crFlt.type = 'bandpass';
            crFlt.Q.setValueAtTime(1.5, tCrease);
            crFlt.frequency.setValueAtTime(2100 + slotIdx * 180, tCrease);
            crFlt.frequency.exponentialRampToValueAtTime(920, tCrease + 0.075);

            const crEnv = ctx.createGain();
            crEnv.gain.setValueAtTime(0.0001, tCrease);
            crEnv.gain.linearRampToValueAtTime(0.36, tCrease + 0.008);
            crEnv.gain.exponentialRampToValueAtTime(0.0001, tCrease + 0.085);

            crSrc.connect(crFlt);
            crFlt.connect(crEnv);
            connectWithPanAndReverb(crEnv, 0.12, pan * 0.7);
            crSrc.start(tCrease, Math.random() * 0.4);
            crSrc.stop(tCrease + 0.095);
        }

        // Lực đập nhẹ của vạt giấy khi ôm sát vào thân thiệp (Paper Flap Settle Thump 260Hz -> 95Hz)
        const thumpOsc = ctx.createOscillator();
        const thumpEnv = ctx.createGain();
        thumpOsc.type = 'triangle';
        thumpOsc.frequency.setValueAtTime(260 + slotIdx * 20, tCrease);
        thumpOsc.frequency.exponentialRampToValueAtTime(95, tCrease + 0.055);
        thumpEnv.gain.setValueAtTime(0.0001, tCrease);
        thumpEnv.gain.exponentialRampToValueAtTime(0.26, tCrease + 0.004);
        thumpEnv.gain.exponentialRampToValueAtTime(0.0001, tCrease + 0.065);
        thumpOsc.connect(thumpEnv);
        connectWithPanAndReverb(thumpEnv, 0.10, pan * 0.6);
        thumpOsc.start(tCrease);
        thumpOsc.stop(tCrease + 0.075);

        // 3. Điểm 1 nốt Harp gọn gàng nâng dần theo 4 vạt (Trái A4 -> Phải C#5 -> Đáy E5 -> Nắp A5)
        const foldNotes = ['A4', 'Csharp5', 'E5', 'A5'];
        playHarpPluck(n(foldNotes[slotIdx % foldNotes.length]), t0 + 0.02, 0.72, 0.14, pan);
    }

    // 6.0G. Tiếng Khóa Khép Kín 4 Vạt Phong Bì & Nhún Đài Hoa (tau = 6.02s)
    function playOrigamiEnvelopeLockBurst() {
        if (!canPlayAudio()) return;
        const t0 = ctx.currentTime + 0.004;
        triggerSubtleHaptic('seal_pop');

        // 1. Tiếng khóa khít đỉnh chữ V & phong bì nhún nhẹ lên đài hoa (Crisp Latch Snap + Bounce 240Hz -> 68Hz)
        const lockOsc = ctx.createOscillator();
        const lockEnv = ctx.createGain();
        lockOsc.type = 'triangle';
        lockOsc.frequency.setValueAtTime(240, t0);
        lockOsc.frequency.exponentialRampToValueAtTime(68, t0 + 0.105);
        lockEnv.gain.setValueAtTime(0.0001, t0);
        lockEnv.gain.exponentialRampToValueAtTime(0.42, t0 + 0.005);
        lockEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
        lockOsc.connect(lockEnv);
        lockEnv.connect(sfxBus);
        lockOsc.start(t0);
        lockOsc.stop(t0 + 0.135);

        // Tiếng mép giấy bìa ăn khớp giòn tan ("tách-khít!")
        if (noiseBuffer) {
            const snapSrc = ctx.createBufferSource();
            snapSrc.buffer = noiseBuffer;
            const snapFlt = ctx.createBiquadFilter();
            snapFlt.type = 'bandpass';
            snapFlt.Q.setValueAtTime(1.6, t0);
            snapFlt.frequency.setValueAtTime(2450, t0);
            const snapEnv = ctx.createGain();
            snapEnv.gain.setValueAtTime(0.0001, t0);
            snapEnv.gain.exponentialRampToValueAtTime(0.38, t0 + 0.003);
            snapEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.042);
            snapSrc.connect(snapFlt);
            snapFlt.connect(snapEnv);
            connectWithPanAndReverb(snapEnv, 0.14, 0);
            snapSrc.start(t0, Math.random() * 0.5);
            snapSrc.stop(t0 + 0.05);
        }

        // 2. Hợp âm 3 nốt gọn sáng báo hiệu phong bì hoàn chỉnh (A4 - E5 - A5)
        playHarmonicChime(n('A4'), t0 + 0.012, 0.78, 0.15, -0.22);
        playHarmonicChime(n('E5'), t0 + 0.045, 0.85, 0.15, 0.22);
        playHarmonicChime(n('A5'), t0 + 0.082, 0.95, 0.16, 0.0);
    }

    // 6.1. Tiếng Tinh Tú Bừng Sáng Ngay Khoảnh Khắc Bấm Mở Đầu (beginPrelude / tau = 0.01s)
    function playPreludeStarAppear() {
        if (!canPlayAudio()) return;
        if (wishBloomCueState.preludeStar) return;
        wishBloomCueState.preludeStar = true;
        const t0 = ctx.currentTime + 0.004;

        // Hạ nhạc nền xuống ngưỡng 20% trong suốt 8.5s cutscene để toàn bộ Foley & SFX nổi bật rõ nét 100%
        setBgmDuck(0.20, 8.6);
        triggerSubtleHaptic('light');

        // 1. Tia sáng tinh tú lóe lên giữa bầu trời đêm (Crystal Ignition Shimmer Sweep 1400Hz -> 4800Hz)
        if (noiseBuffer) {
            const ignSrc = ctx.createBufferSource();
            ignSrc.buffer = noiseBuffer;
            const ignFlt = ctx.createBiquadFilter();
            ignFlt.type = 'bandpass';
            ignFlt.Q.setValueAtTime(1.8, t0);
            ignFlt.frequency.setValueAtTime(1400, t0);
            ignFlt.frequency.exponentialRampToValueAtTime(4800, t0 + 0.24);
            const ignEnv = ctx.createGain();
            ignEnv.gain.setValueAtTime(0.0001, t0);
            ignEnv.gain.linearRampToValueAtTime(0.28, t0 + 0.035);
            ignEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
            ignSrc.connect(ignFlt);
            ignFlt.connect(ignEnv);
            connectWithPanAndReverb(ignEnv, 0.26, 0.28);
            ignSrc.start(t0, Math.random() * 0.4);
            ignSrc.stop(t0 + 0.30);
        }

        // 2. Chuông Pha Lê Tinh Tú (Astral Bell Ping A5 + E6 + A6 ngân trong trẻo ở góc phải trên bầu trời)
        playHarmonicChime(n('A5'), t0, 1.05, 0.22, 0.28);
        playHarmonicChime(n('E6'), t0 + 0.042, 1.15, 0.18, 0.34);
    }

    function updateWishBloomAudioByTau(tau, isSkipped) {
        if (!ctx || !isUnlocked || isPageHidden) return;
        if (isSkipped) {
            if (!wishBloomCueState.lift) {
                wishBloomCueState.lift = true;
                setEnvelopeSpatialMuffle(true, 0.6);
                if (canPlayAudio()) {
                    playSilkPaperWhoosh(0.45, 380, 920, 0.24, 0, 0);
                }
            }
            return;
        }

        const now = ctx.currentTime;

        // =====================================================================
        // GIAI ĐOẠN 1: VÌ TINH TÚ XUẤT HIỆN & LẤP LÁNH TRÊN TRỜI ĐÊM (tau = 0.01s -> 0.68s)
        // =====================================================================
        if (!wishBloomCueState.started && tau >= 0.01) {
            wishBloomCueState.started = true;
            setBgmDuck(0.20, 8.5);
            setEnvelopeSpatialMuffle(false, 0.4);
            if (canPlayAudio()) {
                playPreludeStarAppear();
            }
        }

        // Nhịp mạch sáng của ngôi sao khi lướt nhẹ và soi bóng xuống mặt hồ (tau = 0.34s)
        if (!wishBloomCueState.skyTwinkle1 && tau >= 0.34 && tau < 0.68) {
            wishBloomCueState.skyTwinkle1 = true;
            if (canPlayAudio()) {
                playStardustSparkCrackle(n('Csharp6'), 0.26);
                playHarmonicChime(n('Csharp6'), now + 0.01, 0.65, 0.14, 0.24);
            }
        }

        // =====================================================================
        // GIAI ĐOẠN 2: TINH TÚ HÓA SAO BĂNG XÉ GIÓ LAO CHÉO XUỐNG HỒ (tau = 0.70s -> 1.58s)
        // (Lưu ý: speedAt(0.70..1.60) tăng tốc 1.0 -> 1.75x nên 0.89 tau diễn ra trong ~0.62s thực tế!)
        // =====================================================================
        if (!wishBloomCueState.fall && tau >= 0.70) {
            wishBloomCueState.fall = true;
            if (canPlayAudio()) {
                const fallDur = 0.60;

                // 1. Tiếng gió sao băng lao vút từ cao xuống thấp (Accelerating Meteor Whoosh: 2600Hz -> 260Hz)
                // Âm lượng tăng dần (ease-in) đúng theo gia tốc rơi của sao băng, cực đại ngay trước mặt nước!
                if (pinkNoiseBuffer) {
                    const whooshSrc = ctx.createBufferSource();
                    whooshSrc.buffer = pinkNoiseBuffer;
                    whooshSrc.loop = true;

                    const whooshFlt = ctx.createBiquadFilter();
                    whooshFlt.type = 'bandpass';
                    whooshFlt.Q.setValueAtTime(1.1, now);
                    whooshFlt.frequency.setValueAtTime(2600, now);
                    whooshFlt.frequency.exponentialRampToValueAtTime(260, now + fallDur);

                    const whooshEnv = ctx.createGain();
                    whooshEnv.gain.setValueAtTime(0.01, now);
                    whooshEnv.gain.exponentialRampToValueAtTime(0.42, now + fallDur * 0.86);
                    whooshEnv.gain.exponentialRampToValueAtTime(0.0001, now + fallDur + 0.04);

                    whooshSrc.connect(whooshFlt);
                    whooshFlt.connect(whooshEnv);
                    connectWithPanAndReverb(whooshEnv, 0.18, 0.16);
                    whooshSrc.start(now, Math.random() * 0.4);
                    whooshSrc.stop(now + fallDur + 0.05);
                }

                // 2. Tiếng còi sao băng Doppler (Whistling Meteor Core: E6 -> A4 -> D3)
                const whistleOsc = ctx.createOscillator();
                const whistleEnv = ctx.createGain();
                whistleOsc.type = 'triangle';
                whistleOsc.frequency.setValueAtTime(n('E6'), now);
                whistleOsc.frequency.exponentialRampToValueAtTime(n('A4'), now + fallDur * 0.65);
                whistleOsc.frequency.exponentialRampToValueAtTime(146, now + fallDur);

                whistleEnv.gain.setValueAtTime(0.0001, now);
                whistleEnv.gain.linearRampToValueAtTime(0.18, now + fallDur * 0.35);
                whistleEnv.gain.linearRampToValueAtTime(0.24, now + fallDur * 0.85);
                whistleEnv.gain.exponentialRampToValueAtTime(0.0001, now + fallDur + 0.03);

                whistleOsc.connect(whistleEnv);
                connectWithPanAndReverb(whistleEnv, 0.22, 0.14);
                whistleOsc.start(now);
                whistleOsc.stop(now + fallDur + 0.04);
            }
        }

        // Các hạt lửa sao (sparks) nổ lách tách dọc đuôi sao băng (tau = 0.92s & 1.18s)
        if (!wishBloomCueState.fallSpark1 && tau >= 0.92 && tau < 1.55) {
            wishBloomCueState.fallSpark1 = true;
            playStardustSparkCrackle(2800, 0.18);
        }
        if (!wishBloomCueState.fallSpark2 && tau >= 1.18 && tau < 1.58) {
            wishBloomCueState.fallSpark2 = true;
            playStardustSparkCrackle(2100, 0.06);
        }

        // Áp suất không khí ép lõm mặt nước ngay trước khi sao chạm hồ (preIndent tại tau = 1.38s..1.58s)
        if (!wishBloomCueState.preImpact && tau >= 1.38 && tau < 1.59) {
            wishBloomCueState.preImpact = true;
            if (canPlayAudio()) {
                playSilkPaperWhoosh(0.16, 240, 780, 0.28, 0, 0);
            }
        }

        // =====================================================================
        // GIAI ĐOẠN 3: CHẠM MẶT HỒ GƯƠNG, BÙNG CỘT SÁNG & CROWN SPLASH SLOW-MO (tau = 1.59s -> 2.08s)
        // =====================================================================
        if (!wishBloomCueState.impact && tau >= 1.59) {
            wishBloomCueState.impact = true;
            if (canPlayAudio()) {
                triggerSubtleHaptic('water_drop');

                // A. Tiếng vỗ mặt nước sắc gọn ngay khoảnh khắc sao băng xuyên qua mặt hồ ("CHÕM / PLash!")
                if (noiseBuffer) {
                    const slapSrc = ctx.createBufferSource();
                    slapSrc.buffer = noiseBuffer;
                    const slapFlt = ctx.createBiquadFilter();
                    slapFlt.type = 'bandpass';
                    slapFlt.Q.setValueAtTime(1.2, now);
                    slapFlt.frequency.setValueAtTime(2400, now);
                    slapFlt.frequency.exponentialRampToValueAtTime(680, now + 0.065);
                    const slapEnv = ctx.createGain();
                    slapEnv.gain.setValueAtTime(0.0001, now);
                    slapEnv.gain.exponentialRampToValueAtTime(0.48, now + 0.003);
                    slapEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
                    slapSrc.connect(slapFlt);
                    slapFlt.connect(slapEnv);
                    connectWithPanAndReverb(slapEnv, 0.22, 0);
                    slapSrc.start(now, Math.random() * 0.4);
                    slapSrc.stop(now + 0.085);
                }

                // B. Lực trầm sâu khi sao băng lao vào lòng nước (Hydro-Cavitation Plunge 220Hz -> 48Hz)
                const subOsc = ctx.createOscillator();
                const subEnv = ctx.createGain();
                subOsc.type = 'triangle';
                subOsc.frequency.setValueAtTime(220, now);
                subOsc.frequency.exponentialRampToValueAtTime(48, now + 0.38);
                subEnv.gain.setValueAtTime(0.0001, now);
                subEnv.gain.exponentialRampToValueAtTime(0.50, now + 0.008);
                subEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
                subOsc.connect(subEnv);
                subEnv.connect(sfxBus);
                subOsc.start(now);
                subOsc.stop(now + 0.45);

                // C. Cặp bọt khí lớn sục lên từ tâm va chạm ("Blub-Bloop!" đặc trưng của vật thể rơi xuống nước sâu)
                playWaterDropletPlink(290, 960, 0.14, 0.44, -0.06, 0.012);
                playWaterDropletPlink(460, 1420, 0.11, 0.36, 0.08, 0.068);

                // D. Tiếng vương miện nước (Crown Splash) bung xòe trong Bullet-Time Slow-Mo (Pink Noise + LFO 14Hz)
                if (pinkNoiseBuffer) {
                    const spSrc = ctx.createBufferSource();
                    spSrc.buffer = pinkNoiseBuffer;
                    spSrc.loop = true;
                    const spFlt = ctx.createBiquadFilter();
                    spFlt.type = 'bandpass';
                    spFlt.Q.setValueAtTime(1.15, now + 0.02);
                    spFlt.frequency.setValueAtTime(1850, now + 0.02);
                    spFlt.frequency.exponentialRampToValueAtTime(480, now + 0.42);

                    const spEnv = ctx.createGain();
                    spEnv.gain.setValueAtTime(0.0001, now + 0.02);
                    spEnv.gain.linearRampToValueAtTime(0.38, now + 0.055);
                    spEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.44);

                    spSrc.connect(spFlt);
                    spFlt.connect(spEnv);
                    connectWithPanAndReverb(spEnv, 0.28, 0);
                    spSrc.start(now + 0.02, Math.random() * 0.4);
                    spSrc.stop(now + 0.46);
                }

                // E. Âm ngân Cột Sáng Thiên Đỉnh (chỉ điểm 2 nốt A4 & E5 trong vắt để không lấn át tiếng nước!)
                playHarmonicChime(n('A4'), now + 0.025, 1.10, 0.16, -0.20);
                playHarmonicChime(n('E5'), now + 0.075, 1.15, 0.15, 0.20);
            }
        }

        // 36 hạt nước văng Parabol rơi lộp bộp trở lại mặt hồ tạo vòng sóng phụ (tau = 1.72s, 1.83s, 1.93s)
        // Không gắn thêm tiếng chuông vào đây để người nghe cảm nhận rõ 100% tiếng giọt nước "plip-plop" chân thực!
        if (!wishBloomCueState.droplet1 && tau >= 1.72 && tau < 2.10) {
            wishBloomCueState.droplet1 = true;
            playWaterDropletPlink(560, 1480, 0.078, 0.30, -0.38, 0);
            playWaterDropletPlink(740, 1720, 0.068, 0.25, 0.34, 0.048);
        }
        if (!wishBloomCueState.droplet2 && tau >= 1.83 && tau < 2.15) {
            wishBloomCueState.droplet2 = true;
            playWaterDropletPlink(520, 1360, 0.082, 0.28, 0.42, 0);
            playWaterDropletPlink(680, 1620, 0.066, 0.24, -0.28, 0.052);
        }
        if (!wishBloomCueState.droplet3 && tau >= 1.93 && tau < 2.20) {
            wishBloomCueState.droplet3 = true;
            playWaterDropletPlink(640, 1540, 0.072, 0.24, -0.20, 0.008);
            playWaterDropletPlink(820, 1820, 0.062, 0.20, 0.24, 0.055);
        }

        // =====================================================================
        // GIAI ĐOẠN 4: NỤ HOA 3D TRỔI DẬY TỪ LÒNG NƯỚC & GIỌT SƯƠNG RƠI (tau = 1.95s -> 2.48s)
        // =====================================================================
        if (!wishBloomCueState.bud && tau >= 1.95) {
            wishBloomCueState.bud = true;
            if (canPlayAudio()) {
                // 1. Tiếng mặt nước rẽ đôi & thân hoa vươn lên từ tâm hồ (Upward Water-Parting Surge 220Hz -> 1080Hz)
                playSilkPaperWhoosh(0.46, 220, 1080, 0.34, 0, 0);

                // 2. Âm trầm sinh học của thân cây và đài hoa trồi lên (Botanical Stem Swell 130Hz -> 260Hz)
                const stemOsc = ctx.createOscillator();
                const stemEnv = ctx.createGain();
                stemOsc.type = 'triangle';
                stemOsc.frequency.setValueAtTime(130, now);
                stemOsc.frequency.exponentialRampToValueAtTime(260, now + 0.42);
                stemEnv.gain.setValueAtTime(0.0001, now);
                stemEnv.gain.linearRampToValueAtTime(0.22, now + 0.16);
                stemEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.46);
                stemOsc.connect(stemEnv);
                connectWithPanAndReverb(stemEnv, 0.20, 0);
                stemOsc.start(now);
                stemOsc.stop(now + 0.48);

                playHarpPluck(n('D4'), now + 0.02, 1.35, 0.16, -0.15);
            }
        }

        // Giọt sương mai (bloomDrops) trượt khỏi búp hoa rơi xuống hồ & cánh bướm vỗ nhẹ (tau = 2.15s & 2.34s)
        if (!wishBloomCueState.dewdrop1 && tau >= 2.15 && tau < 2.55) {
            wishBloomCueState.dewdrop1 = true;
            playWaterDropletPlink(580, 1460, 0.080, 0.28, -0.26, 0);
            playButterflyWingFlutter(0.28, 0.03);
        }
        if (!wishBloomCueState.dewdrop2 && tau >= 2.34 && tau < 2.65) {
            wishBloomCueState.dewdrop2 = true;
            playWaterDropletPlink(710, 1640, 0.074, 0.26, 0.26, 0);
        }

        // =====================================================================
        // GIAI ĐOẠN 5: ĐẠI ĐÓA HOA BUNG NỞ 3 LỚP CÁNH NHUNG & NHỤY VÀNG (tau = 2.50s -> 3.08s)
        // =====================================================================
        // Tầng cánh ngoài bung mở (tau >= 2.50s = T.OPEN)
        if (!wishBloomCueState.openLayer1 && tau >= 2.50) {
            wishBloomCueState.openLayer1 = true;
            playVelvetPetalUnfurl(0, -0.22);
        }
        // Tầng cánh giữa bung mở (tau >= 2.62s)
        if (!wishBloomCueState.openLayer2 && tau >= 2.62) {
            wishBloomCueState.openLayer2 = true;
            playVelvetPetalUnfurl(1, 0.22);
        }
        // Tầng cánh lụa trong cùng bung mở (tau >= 2.74s)
        if (!wishBloomCueState.openLayer3 && tau >= 2.74) {
            wishBloomCueState.openLayer3 = true;
            playVelvetPetalUnfurl(2, 0.0);
        }

        // Vương miện 42 nhụy vàng & đàn bướm bay lên từ tâm hoa (tau >= 2.88s = T.HEART)
        if (!wishBloomCueState.heart && tau >= 2.88) {
            wishBloomCueState.heart = true;
            if (canPlayAudio()) {
                triggerSubtleHaptic('light');
                playStardustSparkCrackle(n('A5'), -0.18);
                playStardustSparkCrackle(n('E6'), 0.18);
                playHarmonicChime(n('A5'), now + 0.01, 0.95, 0.16, -0.15);
                playHarmonicChime(n('Csharp6'), now + 0.055, 1.05, 0.15, 0.15);
                playButterflyWingFlutter(-0.24, 0.04);
            }
        }

        // =====================================================================
        // GIAI ĐOẠN 6: DỆT LÕI THƯ TỪ TƠ VÀNG, KHẮC 4 DÒNG THƯ PHÁP & ĐÓNG ẤN GÓC (tau = 3.12s -> 4.05s)
        // =====================================================================
        // 36 hạt phấn hoa bay lên dệt thành tấm thiệp ngọc trai từ đáy lên đỉnh (tau >= 3.12s = T_CARD_WEAVE)
        if (!wishBloomCueState.weave && tau >= 3.12) {
            wishBloomCueState.weave = true;
            if (canPlayAudio()) {
                triggerSubtleHaptic('light');
                // Tiếng tơ lụa vàng đan nhanh từ đáy lên đỉnh tấm thiệp (420Hz -> 1680Hz)
                playSilkPaperWhoosh(0.44, 420, 1680, 0.30, 0, 0);
                playHarpPluck(n('A4'), now + 0.01, 1.10, 0.14, -0.18);
                playHarpPluck(n('E5'), now + 0.08, 1.15, 0.14, 0.18);
            }
        }

        // 4 dòng thư pháp ánh kim tự động khắc lên thiệp (lineStart = 3.56, 3.65, 3.74, 3.83)
        // Mỗi dòng phát ra tiếng ngòi bút máy vàng khắc sột soạt ASMR rõ nét trên giấy mỹ thuật!
        if (!wishBloomCueState.calligraphy1 && tau >= 3.56) {
            wishBloomCueState.calligraphy1 = true;
            playGoldenNibStroke(0);
        }
        if (!wishBloomCueState.calligraphy2 && tau >= 3.65) {
            wishBloomCueState.calligraphy2 = true;
            playGoldenNibStroke(1);
        }
        if (!wishBloomCueState.calligraphy3 && tau >= 3.74) {
            wishBloomCueState.calligraphy3 = true;
            playGoldenNibStroke(2);
        }
        if (!wishBloomCueState.calligraphy4 && tau >= 3.83) {
            wishBloomCueState.calligraphy4 = true;
            playGoldenNibStroke(3);
        }

        // Con dấu sáp đỏ ánh vàng đóng cốp nhẹ vào góc phải dưới tấm thiệp (sealAppear tại tau = 3.88s)
        if (!wishBloomCueState.cardSeal && tau >= 3.88) {
            wishBloomCueState.cardSeal = true;
            if (canPlayAudio()) {
                triggerSubtleHaptic('light');
                // Tiếng đóng dấu mini gọn đanh ("cộp-tinh!") ở góc phải tấm thiệp
                const stampOsc = ctx.createOscillator();
                const stampEnv = ctx.createGain();
                stampOsc.type = 'triangle';
                stampOsc.frequency.setValueAtTime(340, now);
                stampOsc.frequency.exponentialRampToValueAtTime(110, now + 0.055);
                stampEnv.gain.setValueAtTime(0.0001, now);
                stampEnv.gain.exponentialRampToValueAtTime(0.32, now + 0.004);
                stampEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
                stampOsc.connect(stampEnv);
                connectWithPanAndReverb(stampEnv, 0.14, 0.22);
                stampOsc.start(now);
                stampOsc.stop(now + 0.075);

                playHarmonicChime(n('A5'), now + 0.012, 0.68, 0.15, 0.22);
            }
        }

        // =====================================================================
        // GIAI ĐOẠN 7: 4 CÁNH HOA TÁCH KHỎI ĐÀI, GẤP ORIGAMI 4 VẠT & KHÓA PHONG BÌ (tau = 4.15s -> 6.14s)
        // =====================================================================
        // 4 cánh hoa sứ giả tách khỏi đài hoa và bay ra 4 cạnh tấm thiệp (tau >= 4.15s = T_ORIGAMI_START)
        if (!wishBloomCueState.origamiDetach && tau >= 4.15) {
            wishBloomCueState.origamiDetach = true;
            if (canPlayAudio()) {
                playSilkPaperWhoosh(0.42, 340, 1120, 0.30, 0, 0);
                playHarpPluck(n('D4'), now + 0.01, 1.15, 0.14, -0.25);
                playHarpPluck(n('A4'), now + 0.06, 1.15, 0.14, 0.25);
            }
        }

        // Cánh Trái (Slot 0) dựng lên & gập vào ôm tấm thiệp (FOLD_STARTS[0] = 4.62s)
        if (!wishBloomCueState.foldLeft && tau >= 4.62) {
            wishBloomCueState.foldLeft = true;
            playOrigamiFlapFold(0, -0.48);
        }

        // Cánh Phải (Slot 1) dựng lên & gập vào đan chéo (FOLD_STARTS[1] = 4.84s)
        if (!wishBloomCueState.foldRight && tau >= 4.84) {
            wishBloomCueState.foldRight = true;
            playOrigamiFlapFold(1, 0.48);
        }

        // Cánh Đáy (Slot 2) gập lên tạo túi phong bì (FOLD_STARTS[2] = 5.12s)
        if (!wishBloomCueState.foldBottom && tau >= 5.12) {
            wishBloomCueState.foldBottom = true;
            playOrigamiFlapFold(2, 0.0);
        }

        // Nắp Hoàng Gia Phía Trên (Slot 3) gập xuống khép kín phong bì (FOLD_STARTS[3] = 5.42s)
        if (!wishBloomCueState.foldTop && tau >= 5.42) {
            wishBloomCueState.foldTop = true;
            playOrigamiFlapFold(3, 0.0);
        }

        // Khoảnh khắc 4 vạt phong bì vừa khóa khít, nhún nhẹ lên đài hoa & bung phấn vàng (tau >= 6.02s)
        if (!wishBloomCueState.origamiLock && tau >= 6.02) {
            wishBloomCueState.origamiLock = true;
            playOrigamiEnvelopeLockBurst();
        }

        // =====================================================================
        // GIAI ĐOẠN 8: ĐÀI HOA NÂNG PHONG BÌ DÂNG TẶNG LÊN GIỮA MÀN HÌNH (tau = 6.50s -> 7.45s)
        // =====================================================================
        if (!wishBloomCueState.lift && tau >= 6.50) {
            wishBloomCueState.lift = true;
            setEnvelopeSpatialMuffle(true, 0.9);
            if (canPlayAudio()) {
                // Tiếng gió lụa nâng phong bì bay lên từ mặt hồ về phía người nhận
                playSilkPaperWhoosh(0.65, 300, 1080, 0.32, 0, 0);
                playHarpPluck(n('D4'), now + 0.02, 1.35, 0.14, -0.20);
                playHarpPluck(n('A4'), now + 0.09, 1.35, 0.14, 0.20);
            }
        }

        // Phong bì vừa dừng êm giữa sân khấu, tạo đệm không khí trước khi Ấn Sáp Vàng 24K giáng xuống (tau >= 7.35s)
        if (!wishBloomCueState.presentSettle && tau >= 7.35) {
            wishBloomCueState.presentSettle = true;
            if (canPlayAudio()) {
                playSilkPaperWhoosh(0.24, 680, 320, 0.24, 0, 0);
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
        ensureBgmPlayer();

        if (!isUnlocked) {
            isUnlocked = true;
            startOrResumeBgm();
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
