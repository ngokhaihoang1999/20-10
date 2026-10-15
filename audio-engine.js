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

    // Cố định bản thu âm MP3 trích xuất từ video YouTube người dùng chọn xuyên suốt toàn bộ các bước & chủ đề
    const MAIN_BGM_SRC = 'bgm/custom-bgm.mp3?v=57.0';
    const BASE_BGM_VOLUME = 0.62;
    let bgmAudio = null;
    let fadeRafId = null;

    // Thang âm A Major Pentatonic / Add9 đồng điệu 100% với mọi hợp âm (F#m - D - A - E) của River Flows in You
    const RIVER_SCALE = ['A4', 'B4', 'Csharp5', 'E5', 'Fsharp5', 'A5', 'B5', 'Csharp6'];
    const RIVER_REVEAL_CHORD = ['D4', 'Fsharp4', 'A4', 'Csharp5', 'E5', 'Fsharp5', 'A5', 'Csharp6'];
    const RIVER_WARM_PAD = ['D4', 'Fsharp4', 'A4', 'Csharp5'];

    let lastSparkleSoundTime = 0;
    let sparkleNoteIndex = 0;
    let lastUiTapTime = 0;

    // Lưu trạng thái đồng bộ với wish-bloom.js
    let wishBloomCueState = {
        started: false,
        fall: false,
        impact: false,
        bud: false,
        open: false,
        heart: false,
        weave: false,
        envIn: false,
        lift: false
    };

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
    // 1. TRÌNH PHÁT NHẠC NỀN PIANO THẬT (RIVER FLOWS IN YOU — YIRUMA)
    // =========================================================================
    function getTargetBgmVolume() {
        if (isBgmMuted || isPageHidden) return 0;
        const envFactor = isEnvelopeClosedMuffled ? 0.80 : 1.0;
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
            bgmAudio = new Audio(MAIN_BGM_SRC);
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
            compressor.threshold.setValueAtTime(-14, ctx.currentTime);
            compressor.knee.setValueAtTime(18, ctx.currentTime);
            compressor.ratio.setValueAtTime(4, ctx.currentTime);
            compressor.attack.setValueAtTime(0.005, ctx.currentTime);
            compressor.release.setValueAtTime(0.18, ctx.currentTime);

            masterSfxGain = ctx.createGain();
            masterSfxGain.gain.setValueAtTime(0.84, ctx.currentTime);

            compressor.connect(masterSfxGain);
            masterSfxGain.connect(ctx.destination);

            dryBus = ctx.createGain();
            dryBus.gain.setValueAtTime(0.82, ctx.currentTime);
            dryBus.connect(compressor);

            reverbBus = ctx.createGain();
            reverbBus.gain.setValueAtTime(0.34, ctx.currentTime);

            convolver = ctx.createConvolver();
            convolver.buffer = createVelvetHallImpulse(ctx, 1.85, 3.0);
            reverbBus.connect(convolver);
            convolver.connect(compressor);

            sfxBus = ctx.createGain();
            sfxBus.gain.setValueAtTime(0.86, ctx.currentTime);

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

        for (let i = 0; i < len; i++) {
            const w = Math.random() * 2 - 1;
            whiteOut[i] = w;
            b0 = 0.99886 * b0 + w * 0.0555179;
            b1 = 0.99332 * b1 + w * 0.0750759;
            b2 = 0.96900 * b2 + w * 0.1538520;
            b3 = 0.86650 * b3 + w * 0.3104856;
            b4 = 0.55000 * b4 + w * 0.5329522;
            b5 = -0.7616 * b5 - w * 0.0168980;
            pinkOut[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.044;
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

    function setBgmDuck(duckFactor, holdSec = 0) {
        bgmDuckFactor = Math.max(0.32, Math.min(1.0, duckFactor));
        rampBgmVolume(getTargetBgmVolume(), 260);
        if (holdSec > 0) {
            setTimeout(() => {
                bgmDuckFactor = 1.0;
                rampBgmVolume(getTargetBgmVolume(), 650);
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

    // 5.5. Tiếng Lụa / Giấy Mỹ Thuật Trượt Mềm (Formant-Swept Pink Noise)
    function playSilkPaperWhoosh(duration = 0.38, startFreq = 360, endFreq = 920, peakGain = 0.18, pan = 0, delaySec = 0) {
        if (!canPlayAudio() || !pinkNoiseBuffer) return;
        const t0 = ctx.currentTime + Math.max(0.004, delaySec);

        const src = ctx.createBufferSource();
        src.buffer = pinkNoiseBuffer;
        src.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.setValueAtTime(2.2, t0);
        filter.frequency.setValueAtTime(startFreq, t0);
        filter.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration * 0.65);
        filter.frequency.exponentialRampToValueAtTime(Math.max(240, startFreq * 0.85), t0 + duration);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, t0);
        env.gain.linearRampToValueAtTime(peakGain, t0 + duration * 0.28);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

        src.connect(filter);
        filter.connect(env);
        connectWithPanAndReverb(env, 0.26, pan);

        src.start(t0, Math.random() * 0.4);
        src.stop(t0 + duration + 0.04);
    }

    // 5.6. Tiếng Tách Con Dấu Sáp Vàng 24K Giòn Tan & Chùm Harp Vàng A Major
    function playWaxSealCrack() {
        if (!canPlayAudio()) return;
        triggerSubtleHaptic('seal_pop');
        const t0 = ctx.currentTime + 0.005;

        // Lớp 1: Cộng hưởng thân sáp vàng tách giòn (Warm Body Thump 190Hz -> 68Hz)
        const bodyOsc = ctx.createOscillator();
        const bodyEnv = ctx.createGain();
        bodyOsc.type = 'triangle';
        bodyOsc.frequency.setValueAtTime(190, t0);
        bodyOsc.frequency.exponentialRampToValueAtTime(68, t0 + 0.065);
        bodyEnv.gain.setValueAtTime(0.0001, t0);
        bodyEnv.gain.exponentialRampToValueAtTime(0.30, t0 + 0.005);
        bodyEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.075);
        bodyOsc.connect(bodyEnv);
        bodyEnv.connect(sfxBus);
        bodyOsc.start(t0);
        bodyOsc.stop(t0 + 0.085);

        // Lớp 2: Tiếng nứt sáp giòn ở dải cao (Crisp Snap 2250Hz)
        if (noiseBuffer) {
            const snapSrc = ctx.createBufferSource();
            snapSrc.buffer = noiseBuffer;
            const snapFlt = ctx.createBiquadFilter();
            snapFlt.type = 'bandpass';
            snapFlt.frequency.setValueAtTime(2250, t0);
            snapFlt.Q.setValueAtTime(3.0, t0);
            const snapEnv = ctx.createGain();
            snapEnv.gain.setValueAtTime(0.0001, t0);
            snapEnv.gain.exponentialRampToValueAtTime(0.24, t0 + 0.003);
            snapEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.038);
            snapSrc.connect(snapFlt);
            snapFlt.connect(snapEnv);
            connectWithPanAndReverb(snapEnv, 0.24, 0);
            snapSrc.start(t0);
            snapSrc.stop(t0 + 0.045);
        }

        // Lớp 3: Chùm kim tuyến 24K bung sáng đồng điệu hợp âm Aadd9 (A4 - C#5 - E5 - F#5 - A5)
        const sparkleNotes = ['A4', 'Csharp5', 'E5', 'Fsharp5', 'A5'];
        playHarmonicChime(n(sparkleNotes[0]), t0 + 0.018, 0.65, 0.10, -0.35);
        setTimeout(() => {
            if (!canPlayAudio()) return;
            const tFollow = ctx.currentTime + 0.008;
            for (let idx = 1; idx < sparkleNotes.length; idx++) {
                playHarmonicChime(n(sparkleNotes[idx]), tFollow + (idx - 1) * 0.038, 0.72, 0.10, (idx - 2) * 0.2);
            }
        }, 18);
    }

    // 5.7. Tiếng Đóng Ấn Sáp Vàng 24K Uy Lực (Khi Phong Bì 3D vừa đáp xuống và đóng dấu sáp)
    function playWaxSealStampImpact() {
        if (!canPlayAudio()) return;
        triggerSubtleHaptic('stamp');
        const t0 = ctx.currentTime + 0.005;

        const subOsc = ctx.createOscillator();
        const subEnv = ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(142, t0);
        subOsc.frequency.exponentialRampToValueAtTime(48, t0 + 0.13);
        subEnv.gain.setValueAtTime(0.0001, t0);
        subEnv.gain.exponentialRampToValueAtTime(0.32, t0 + 0.008);
        subEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15);
        subOsc.connect(subEnv);
        subEnv.connect(sfxBus);
        subOsc.start(t0);
        subOsc.stop(t0 + 0.17);

        // Ngân quãng 5 ấm (A4 - E5) hòa quyện hoàn hảo với River Flows in You
        playHarmonicChime(n('A4'), t0 + 0.01, 0.95, 0.14, -0.18);
        playHarmonicChime(n('E5'), t0 + 0.045, 1.15, 0.15, 0.18);
    }

    // 5.8. Tiếng Mở Phong Bì Vật Lý Bước 1 (Full Choreography)
    function playStep1EnvelopeOpenSequence() {
        setEnvelopeSpatialMuffle(false, 0.95);
        if (!canPlayAudio()) return;

        playWaxSealCrack();
        setTimeout(() => {
            if (!canPlayAudio()) return;
            playSilkPaperWhoosh(0.32, 340, 820, 0.16, 0, 0.02);
            playSilkPaperWhoosh(0.48, 420, 1140, 0.20, 0, 0.39);
        }, 18);

        // 960ms: Thiệp xòe quạt ra chính giữa màn hình cùng hợp âm Harp Dmaj9 / Aadd9
        setTimeout(() => {
            if (!canPlayAudio()) return;
            playSilkPaperWhoosh(0.28, 680, 520, 0.14, 0, 0);
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
        playSilkPaperWhoosh(0.35, 520, 860, 0.15, 0, 0.02);
        playSilkPaperWhoosh(0.45, 920, 340, 0.18, 0, 0.55);

        setTimeout(() => {
            if (!canPlayAudio()) return;
            playSilkPaperWhoosh(0.25, 620, 280, 0.14, 0, 0);
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
            playSilkPaperWhoosh(0.22, 480, 920, 0.15, 0, 0);
            const noteName = RIVER_SCALE[Math.floor(Math.random() * 4)];
            playHarmonicChime(n(noteName), ctx.currentTime + 0.03, 0.42, 0.08, 0.12);
        }
    }

    function playCardWinkTwinkle() {
        if (!canPlayAudio()) return;
        const t0 = ctx.currentTime + 0.01;
        playHarmonicChime(n('E5'), t0, 0.32, 0.065, 0.1);
        playHarmonicChime(n('A5'), t0 + 0.07, 0.42, 0.075, 0.22);
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
    // 6. ĐẠI CẢNH 3D "NỤ HOA ƯỚC NGUYỆN" (wish-bloom.js) — ĐỒNG ĐIỆU VỚI RIVER FLOWS IN YOU
    // =========================================================================
    function resetWishBloomCues() {
        wishBloomCueState = {
            started: false,
            fall: false,
            impact: false,
            bud: false,
            open: false,
            heart: false,
            weave: false,
            envIn: false,
            lift: false
        };
    }

    function updateWishBloomAudioByTau(tau, isSkipped) {
        if (!ctx || !isUnlocked || isPageHidden) return;
        if (isSkipped) {
            if (!wishBloomCueState.lift) {
                wishBloomCueState.lift = true;
                setEnvelopeSpatialMuffle(true, 0.6);
                if (canPlayAudio()) {
                    playSilkPaperWhoosh(0.45, 380, 920, 0.16, 0, 0);
                }
            }
            return;
        }

        const now = ctx.currentTime;

        // 1. Khởi đầu đại cảnh Hồ Gương (tau >= 0.02s)
        if (!wishBloomCueState.started && tau >= 0.02) {
            wishBloomCueState.started = true;
            setBgmDuck(0.52, 7.6);
            setEnvelopeSpatialMuffle(false, 0.4);
            if (canPlayAudio()) {
                playWarmShimmerPad(RIVER_WARM_PAD, now, 2.2, 0.032);
            }
        }

        // 2. Đốm sáng ước nguyện hóa sao băng lao xuống (tau >= 0.70s = T.FALL)
        if (!wishBloomCueState.fall && tau >= 0.70) {
            wishBloomCueState.fall = true;
            if (canPlayAudio()) {
                const osc = ctx.createOscillator();
                const env = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(n('E6'), now);
                osc.frequency.exponentialRampToValueAtTime(n('A4'), now + 0.50);
                env.gain.setValueAtTime(0.0001, now);
                env.gain.linearRampToValueAtTime(0.085, now + 0.12);
                env.gain.exponentialRampToValueAtTime(0.0001, now + 0.54);
                osc.connect(env);
                connectWithPanAndReverb(env, 0.52, 0);
                osc.start(now);
                osc.stop(now + 0.56);

                playSilkPaperWhoosh(0.48, 920, 420, 0.13, 0, 0.02);
            }
        }

        // 3. Chạm mặt Hồ Gương & Bullet-Time Slow-Mo (tau >= 1.59s = T.IMPACT)
        if (!wishBloomCueState.impact && tau >= 1.59) {
            wishBloomCueState.impact = true;
            if (canPlayAudio()) {
                triggerSubtleHaptic('water_drop');

                // A. Giọt nước pha lê Minnaert (390Hz -> 1040Hz)
                const dropOsc = ctx.createOscillator();
                const dropEnv = ctx.createGain();
                dropOsc.type = 'sine';
                dropOsc.frequency.setValueAtTime(390, now);
                dropOsc.frequency.exponentialRampToValueAtTime(1040, now + 0.072);
                dropEnv.gain.setValueAtTime(0.0001, now);
                dropEnv.gain.exponentialRampToValueAtTime(0.28, now + 0.008);
                dropEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
                dropOsc.connect(dropEnv);
                connectWithPanAndReverb(dropEnv, 0.65, 0);
                dropOsc.start(now);
                dropOsc.stop(now + 0.22);

                // B. Sóng âm trầm mặt nước êm ái
                const subOsc = ctx.createOscillator();
                const subEnv = ctx.createGain();
                subOsc.type = 'sine';
                subOsc.frequency.setValueAtTime(110, now);
                subOsc.frequency.exponentialRampToValueAtTime(42, now + 0.48);
                subEnv.gain.setValueAtTime(0.0001, now);
                subEnv.gain.exponentialRampToValueAtTime(0.28, now + 0.02);
                subEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);
                subOsc.connect(subEnv);
                subEnv.connect(sfxBus);
                subOsc.start(now);
                subOsc.stop(now + 0.55);

                // C. Chùm Harp phản chiếu mặt nước theo đúng hợp âm Aadd9
                ['A4', 'B4', 'Csharp5', 'E5', 'A5'].forEach((noteName, idx) => {
                    playHarmonicChime(n(noteName), now + 0.05 + idx * 0.07, 1.15, 0.10, (idx - 2) * 0.22);
                });
            }
        }

        // 4. Nụ hoa 3D trồi lên từ mặt nước (tau >= 1.95s = T.BUD)
        if (!wishBloomCueState.bud && tau >= 1.95) {
            wishBloomCueState.bud = true;
            if (canPlayAudio()) {
                playSilkPaperWhoosh(0.42, 260, 640, 0.14, 0, 0);
                playHarpPluck(n('D4'), now, 1.5, 0.14, 0);
            }
        }

        // 5. Đại đóa hoa bung nở từng tầng cánh Bezier 3D (tau >= 2.50s = T.OPEN)
        if (!wishBloomCueState.open && tau >= 2.50) {
            wishBloomCueState.open = true;
            if (canPlayAudio()) {
                RIVER_REVEAL_CHORD.forEach((noteName, idx) => {
                    const pan = ((idx / Math.max(1, RIVER_REVEAL_CHORD.length - 1)) - 0.5) * 0.65;
                    playHarpPluck(n(noteName), now + idx * 0.072, 1.85, 0.14, pan);
                });
            }
        }

        // 6. Đại đóa hoa & vương miện 42 nhụy vàng bung mở trọn vẹn (tau >= 2.86s = T.HEART)
        if (!wishBloomCueState.heart && tau >= 2.86) {
            wishBloomCueState.heart = true;
            if (canPlayAudio()) {
                ['Csharp5', 'E5', 'Fsharp5', 'A5'].forEach((noteName, idx) => {
                    playHarmonicChime(n(noteName), now + idx * 0.06, 1.05, 0.10, (idx - 1.5) * 0.2);
                });
            }
        }

        // 6B. Các hạt nhị hoa rung động kỳ diệu kết tinh nên Lõi Thư ngay trên nhị hoa (tau >= 3.14s = T_CARD_WEAVE)
        if (!wishBloomCueState.weave && tau >= 3.14) {
            wishBloomCueState.weave = true;
            if (canPlayAudio()) {
                triggerSubtleHaptic('sparkle');
                playSilkPaperWhoosh(0.58, 460, 1020, 0.11, 0, 0.02);
                ['E5', 'Fsharp5', 'A5', 'B5', 'Csharp6', 'E6'].forEach((noteName, idx) => {
                    playHarmonicChime(n(noteName), now + idx * 0.085, 1.15, 0.095 + idx * 0.005, (idx - 2.5) * 0.18);
                });
            }
        }

        // 7. Sau khi Lõi Thư đã tạo xong trên nhị hoa, 4 cánh hoa tiến tới & gấp Origami 3D thành phong bì (tau >= 4.18s)
        if (!wishBloomCueState.envIn && tau >= 4.18) {
            wishBloomCueState.envIn = true;
            if (canPlayAudio()) {
                playSilkPaperWhoosh(1.15, 380, 880, 0.13, 0, 0.02);
                ['A4', 'B4', 'Csharp5', 'E5'].forEach((noteName, f) => {
                    playHarmonicChime(n(noteName), now + 0.25 + f * 0.34, 1.1, 0.11 + f * 0.01, (f - 1.5) * 0.2);
                });
            }
        }

        // 8. Đài hoa nâng phong bì dâng tặng về phía người xem (tau >= 6.50s = T.LIFT)
        if (!wishBloomCueState.lift && tau >= 6.50) {
            wishBloomCueState.lift = true;
            setEnvelopeSpatialMuffle(true, 0.9);
            if (canPlayAudio()) {
                playSilkPaperWhoosh(0.65, 320, 860, 0.16, 0, 0);
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
            if (target.closest('#generate-final-btn, #apply-text-modal-btn, #copy-rich-link-btn, #download-btn, #recipient-save-card-btn')) {
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
