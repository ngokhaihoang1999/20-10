/* =====================================================================================
 * audio-engine.js — HỆ THỐNG ÂM THANH HAUTE COUTURE 3D & HỘP NHẠC THÍCH ỨNG (WEB AUDIO API)
 * -------------------------------------------------------------------------------------
 * Kiến trúc Phòng Thu Thời Gian Thực (Zero External MP3 Dependency, 0ms Latency):
 *   1. Master Studio Bus: Stereo Algorithmic Hall Reverb (2.3s Velvet Impulse) +
 *      Spatial Envelope Low-Pass Filter (hiệu ứng nhạc phát ra từ trong phong bì lúc đóng) +
 *      Soft-Knee Dynamics Compressor (chống vỡ tiếng tuyệt đối trên loa điện thoại).
 *   2. 6 Bản Hòa Tấu Hộp Nhạc & Đàn Harp/Piano/Celesta/Koto riêng biệt theo 6 Chủ đề Motion:
 *      - bloom (🌺 Hoa Trà): F Major 9 — Warm Felt Piano + Concert Harp + Lush Strings
 *      - butterflies (🦋 Hồ Điệp): G Lydian — Celesta Pha Lê + Fairy Harp + Chuông Gió
 *      - ribbon (🎀 Nơ Lụa): Eb Major Waltz — Swiss Music Box + Pizzicato Lụa Pháp
 *      - galaxy (🌹 Hồng Pháp): D Major Romantic — Velvet Piano + Harp Glissando
 *      - sakura (🌸 Anh Đào): Ab Major Pentatonic — Đàn Koto/Tranh + Chuông Trăng Kyoto
 *      - hearts (🌷 Hoa Tulip): A Major Sunlit — Hộp Nhạc Nắng Mai + Acoustic Harp
 *   3. Foley Vật Lý & Đại Cảnh 3D khớp chính xác từng mili-giây:
 *      - Đại cảnh "Nụ Hoa Ước Nguyện" (wish-bloom.js): Gió hồ gương, Sao băng rơi,
 *        Giọt nước Bullet-time (Minnaert bubble + Sub-bass), Hoa nở 5 tầng Harp, Nhụy vàng.
 *      - Đại cảnh "Sky Oracle 5 Sao" (director-3d.js): Tụ ảnh, Cổng trời 5 sao, Biển mây, Khắc chữ vàng.
 *      - Vật lý Phong bì 3D: Đóng ấn sáp 24K, Nhịp tim khởi động sáp, Tháo ruy-băng lụa,
 *        Tách sáp vàng, Lật nắp thư, Rút thiệp giấy mỹ thuật, Pháo hoa & Chạm tay nở hoa Ngũ cung.
 * ===================================================================================== */
(function () {
    'use strict';

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    let ctx = null;
    let masterGain = null;
    let compressor = null;
    let dryBus = null;
    let reverbBus = null;
    let convolver = null;
    let bgmBus = null;
    let bgmMuffleFilter = null;
    let bgmMuteGain = null;
    let bgmReverbBus = null;
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
    let isEnvelopeClosedMuffled = true; // true khi phong bì đang đóng -> nhạc nền ấm dịu như phát ra từ trong phong bì
    let bgmDuckFactor = 1.0;

    // Trạng thái bộ lập lịch Nhạc nền (Lookahead Scheduler)
    let bgmTimerId = null;
    let nextNoteTime = 0;
    let currentStep = 0;
    let isBgmRunning = false;

    // Chống dội âm khi chạm tay liên tục
    let lastSparkleSoundTime = 0;
    let sparkleNoteIndex = 0;
    let lastUiTapTime = 0;

    // Lưu trạng thái đồng bộ với wish-bloom.js và director-3d.js
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

    // Bộ giải mã tần số nốt nhạc chuẩn xác 100% cho mọi quãng tám & dấu thăng/giáng (A4 = 440Hz)
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
    // 1. 6 BẢN HÒA TẤU PIANO & ACOUSTIC LÃNG MẠN CHUẨN YIRUMA (RIVER FLOWS IN YOU / KISS THE RAIN / CANON IN D)
    // Hoàn toàn loại bỏ hợp âm thứ u ám, tiếng hộp nhạc dây cót kim loại và drone trầm.
    // Sử dụng Concert Grand Piano ấm áp + Acoustic Guitar/Harp ở quãng trung đẹp nhất (Octave 4 - 5).
    // =========================================================================
    const THEME_SUITES = {
        // 🌺 Đại Hoa Trà (Mặc định): "River Flows in You" (Yiruma — A Major / Dadd9 Bright Romantic Grand Piano)
        bloom: {
            stepDur: 0.185, // Nhịp Piano Ballad uyển chuyển, giàu cảm xúc (~81 BPM)
            leadStyle: 'grand_piano',
            pentatonic: ['A4', 'B4', 'Csharp5', 'D5', 'E5', 'Fsharp5', 'A5', 'B5', 'Csharp6'],
            revealChord: ['D4', 'Fsharp4', 'A4', 'Csharp5', 'E5', 'A5'],
            bars: [
                // Phrase 1: Giai điệu mở đầu đặc trưng của River Flows in You
                {
                    pad: ['D4', 'Fsharp4', 'A4'],
                    arp: ['D3', 'A3', 'D4', 'Fsharp4', 'A4', 'Fsharp4', 'D4', 'A3'],
                    mel: { 0: 'A4', 2: 'E5', 4: ['A5', 'Gsharp5'], 6: 'A5' }
                },
                {
                    pad: ['Csharp4', 'E4', 'A4'],
                    arp: ['A3', 'E4', 'A4', 'B4', 'Csharp5', 'B4', 'A4', 'E4'],
                    mel: { 0: ['A5', 'Gsharp5'], 2: ['A5', 'E5'], 4: 'A5', 6: 'D5' }
                },
                {
                    pad: ['D4', 'Fsharp4', 'A4'],
                    arp: ['D3', 'A3', 'D4', 'E4', 'Fsharp4', 'E4', 'D4', 'A3'],
                    mel: { 0: 'D5', 2: ['Csharp5', 'D5'], 4: 'E5', 6: ['Csharp5', 'B4'] }
                },
                {
                    pad: ['E4', 'Gsharp4', 'B4'],
                    arp: ['E3', 'B3', 'E4', 'Gsharp4', 'B4', 'Gsharp4', 'E4', 'B3'],
                    mel: { 0: 'A4', 2: 'B4', 4: 'Csharp5', 6: 'E5' }
                },
                // Phrase 2: Điệp khúc luyến láy kinh điển của River Flows in You
                {
                    pad: ['D4', 'Fsharp4', 'A4'],
                    arp: ['D3', 'A3', 'D4', 'Fsharp4', 'A4', 'D5', 'A4', 'Fsharp4'],
                    mel: { 0: ['A5', 'Gsharp5'], 2: ['A5', 'Gsharp5'], 4: ['A5', 'E5'], 6: ['A5', 'D5'] }
                },
                {
                    pad: ['Csharp4', 'E4', 'A4'],
                    arp: ['A3', 'E4', 'A4', 'Csharp5', 'E5', 'Csharp5', 'A4', 'E4'],
                    mel: { 0: ['A5', 'Gsharp5'], 2: ['A5', 'Gsharp5'], 4: ['A5', 'E5'], 6: ['A5', 'B5'] }
                },
                {
                    pad: ['E4', 'Gsharp4', 'B4'],
                    arp: ['E3', 'B3', 'E4', 'Gsharp4', 'B4', 'E5', 'B4', 'Gsharp4'],
                    mel: { 0: ['Csharp6', 'B5'], 2: ['A5', 'Gsharp5'], 4: 'Fsharp5', 6: 'E5' }
                },
                {
                    pad: ['Csharp4', 'E4', 'A4'],
                    arp: ['A3', 'E4', 'A4', 'B4', 'Csharp5', 'E5', 'Csharp5', 'A4'],
                    mel: { 0: 'Fsharp5', 2: 'Gsharp5', 4: 'A5', 6: 'E5' }
                }
            ]
        },

        // 🌹 Vườn Hồng Pháp: "Kiss The Rain" (Yiruma — G Major Lyrical Piano Ballad)
        galaxy: {
            stepDur: 0.19,
            leadStyle: 'grand_piano',
            pentatonic: ['G4', 'A4', 'B4', 'D5', 'E5', 'G5', 'A5', 'B5', 'D6'],
            revealChord: ['G4', 'B4', 'D5', 'Fsharp5', 'A5', 'B5'],
            bars: [
                {
                    pad: ['G4', 'B4', 'D5'],
                    arp: ['G3', 'D4', 'G4', 'A4', 'B4', 'A4', 'G4', 'D4'],
                    mel: { 0: 'B4', 1: 'C5', 2: 'D5', 4: 'G5', 6: ['Fsharp5', 'G5'], 7: 'D5' }
                },
                {
                    pad: ['Fsharp4', 'A4', 'D5'],
                    arp: ['Fsharp3', 'D4', 'Fsharp4', 'A4', 'D5', 'A4', 'Fsharp4', 'D4'],
                    mel: { 0: 'D5', 1: 'E5', 2: 'Fsharp5', 4: 'G5', 6: 'Fsharp5', 7: 'D5' }
                },
                {
                    pad: ['G4', 'B4', 'E5'],
                    arp: ['E3', 'B3', 'E4', 'G4', 'B4', 'G4', 'E4', 'B3'],
                    mel: { 0: 'B4', 1: 'C5', 2: 'D5', 4: 'E5', 6: 'Fsharp5', 7: 'G5' }
                },
                {
                    pad: ['Fsharp4', 'A4', 'D5'],
                    arp: ['D3', 'A3', 'D4', 'Fsharp4', 'A4', 'Fsharp4', 'D4', 'A3'],
                    mel: { 0: 'Fsharp5', 2: ['G5', 'Fsharp5'], 4: 'D5', 6: 'A4' }
                },
                {
                    pad: ['E4', 'G4', 'C5'],
                    arp: ['C3', 'G3', 'C4', 'D4', 'E4', 'G4', 'E4', 'C4'],
                    mel: { 0: 'E5', 2: 'Fsharp5', 4: 'G5', 6: 'B5', 7: 'A5' }
                },
                {
                    pad: ['D4', 'G4', 'B4'],
                    arp: ['B2', 'G3', 'B3', 'D4', 'G4', 'D4', 'B3', 'G3'],
                    mel: { 0: 'G5', 2: 'D5', 4: ['E5', 'D5'], 6: 'B4' }
                },
                {
                    pad: ['E4', 'A4', 'C5'],
                    arp: ['A3', 'E4', 'A4', 'B4', 'C5', 'B4', 'A4', 'E4'],
                    mel: { 0: 'C5', 2: 'D5', 4: 'E5', 6: ['G5', 'Fsharp5'] }
                },
                {
                    pad: ['D4', 'G4', 'A4'],
                    arp: ['D3', 'A3', 'D4', 'G4', 'Fsharp4', 'D4', 'A3', 'D4'],
                    mel: { 0: 'A5', 2: ['B5', 'A5'], 4: 'G5', 6: 'D5' }
                }
            ]
        },

        // 🎀 Nơ Lụa Hoàng Gia: "Canon in D" (Pachelbel x Yiruma — D Major Joyful Piano & Harp)
        ribbon: {
            stepDur: 0.185,
            leadStyle: 'grand_piano',
            pentatonic: ['D5', 'E5', 'Fsharp5', 'A5', 'B5', 'D6', 'E6', 'Fsharp6'],
            revealChord: ['D4', 'Fsharp4', 'A4', 'D5', 'Fsharp5', 'A5'],
            bars: [
                {
                    pad: ['D4', 'Fsharp4', 'A4'],
                    arp: ['D3', 'A3', 'D4', 'Fsharp4', 'A4', 'Fsharp4', 'D4', 'A3'],
                    mel: { 0: 'Fsharp5', 2: 'A5', 4: 'D6', 6: 'A5' }
                },
                {
                    pad: ['Csharp4', 'E4', 'A4'],
                    arp: ['A2', 'E3', 'A3', 'Csharp4', 'E4', 'Csharp4', 'A3', 'E3'],
                    mel: { 0: 'E5', 2: 'Csharp5', 4: 'E5', 6: 'A5' }
                },
                {
                    pad: ['D4', 'Fsharp4', 'B4'],
                    arp: ['B2', 'Fsharp3', 'B3', 'D4', 'Fsharp4', 'D4', 'B3', 'Fsharp3'],
                    mel: { 0: 'D5', 2: 'Fsharp5', 4: 'B5', 6: 'Fsharp5' }
                },
                {
                    pad: ['Csharp4', 'Fsharp4', 'A4'],
                    arp: ['Fsharp2', 'Csharp3', 'Fsharp3', 'A3', 'Csharp4', 'A3', 'Fsharp3', 'Csharp3'],
                    mel: { 0: 'Csharp5', 2: 'A4', 4: 'Csharp5', 6: 'Fsharp5' }
                },
                {
                    pad: ['D4', 'G4', 'B4'],
                    arp: ['G2', 'D3', 'G3', 'B3', 'D4', 'B3', 'G3', 'D3'],
                    mel: { 0: 'B4', 1: 'D5', 2: 'G5', 4: 'B5', 6: 'A5', 7: 'G5' }
                },
                {
                    pad: ['D4', 'Fsharp4', 'A4'],
                    arp: ['D3', 'A3', 'D4', 'Fsharp4', 'A4', 'Fsharp4', 'D4', 'A3'],
                    mel: { 0: 'A5', 1: 'Fsharp5', 2: 'D5', 4: 'Fsharp5', 6: 'A5', 7: 'G5' }
                },
                {
                    pad: ['D4', 'G4', 'B4'],
                    arp: ['G2', 'D3', 'G3', 'B3', 'D4', 'G4', 'D4', 'B3'],
                    mel: { 0: 'G5', 1: 'B5', 2: 'A5', 3: 'G5', 4: 'Fsharp5', 5: 'E5', 6: 'D5', 7: 'E5' }
                },
                {
                    pad: ['Csharp4', 'E4', 'A4'],
                    arp: ['A2', 'E3', 'A3', 'Csharp4', 'E4', 'A4', 'E4', 'Csharp4'],
                    mel: { 0: 'Fsharp5', 2: 'G5', 4: 'E5', 6: 'A5' }
                }
            ]
        },

        // 🌷 Vườn Tulip Nắng Mai: "May Be / Spring Time" (Yiruma — A Major Sunlit Piano & Acoustic Guitar)
        hearts: {
            stepDur: 0.18,
            leadStyle: 'acoustic_guitar',
            pentatonic: ['A4', 'B4', 'Csharp5', 'E5', 'Fsharp5', 'A5', 'B5', 'Csharp6'],
            revealChord: ['A4', 'Csharp5', 'E5', 'Gsharp5', 'B5', 'E6'],
            bars: [
                {
                    pad: ['Csharp4', 'E4', 'A4'],
                    arp: ['A3', 'E4', 'A4', 'B4', 'Csharp5', 'B4', 'A4', 'E4'],
                    mel: { 0: 'E5', 2: ['Fsharp5', 'Gsharp5'], 4: 'A5', 6: 'E5' }
                },
                {
                    pad: ['E4', 'Gsharp4', 'B4'],
                    arp: ['E3', 'B3', 'E4', 'Gsharp4', 'B4', 'Gsharp4', 'E4', 'B3'],
                    mel: { 0: 'Gsharp5', 2: ['A5', 'Gsharp5'], 4: 'E5', 6: 'B4' }
                },
                {
                    pad: ['Csharp4', 'Fsharp4', 'A4'],
                    arp: ['Fsharp3', 'Csharp4', 'Fsharp4', 'A4', 'Csharp5', 'A4', 'Fsharp4', 'Csharp4'],
                    mel: { 0: 'Csharp5', 2: 'E5', 4: 'Fsharp5', 6: 'A5' }
                },
                {
                    pad: ['Csharp4', 'E4', 'A4'],
                    arp: ['Csharp3', 'Gsharp3', 'Csharp4', 'E4', 'Gsharp4', 'E4', 'Csharp4', 'Gsharp3'],
                    mel: { 0: 'Gsharp5', 2: 'Fsharp5', 4: 'E5', 6: 'Csharp5' }
                },
                {
                    pad: ['D4', 'Fsharp4', 'A4'],
                    arp: ['D3', 'A3', 'D4', 'E4', 'Fsharp4', 'A4', 'Fsharp4', 'D4'],
                    mel: { 0: 'Fsharp5', 2: 'Gsharp5', 4: 'A5', 6: 'B5' }
                },
                {
                    pad: ['Csharp4', 'E4', 'A4'],
                    arp: ['A3', 'E4', 'A4', 'Csharp5', 'E5', 'Csharp5', 'A4', 'E4'],
                    mel: { 0: 'A5', 2: 'E5', 4: ['Fsharp5', 'E5'], 6: 'Csharp5' }
                },
                {
                    pad: ['D4', 'Fsharp4', 'B4'],
                    arp: ['B2', 'Fsharp3', 'B3', 'D4', 'Fsharp4', 'D4', 'B3', 'Fsharp3'],
                    mel: { 0: 'D5', 2: 'E5', 4: 'Fsharp5', 6: 'A5' }
                },
                {
                    pad: ['E4', 'Gsharp4', 'B4'],
                    arp: ['E3', 'B3', 'E4', 'A4', 'Gsharp4', 'E4', 'B3', 'E4'],
                    mel: { 0: 'Gsharp5', 2: ['A5', 'B5'], 4: 'Gsharp5', 6: 'E5' }
                }
            ]
        },

        // 🦋 Hồ Điệp Ánh Kim: "Love Me" (Yiruma — C Major Pure Crystal Piano)
        butterflies: {
            stepDur: 0.185,
            leadStyle: 'grand_piano',
            pentatonic: ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6'],
            revealChord: ['C4', 'E4', 'G4', 'B4', 'D5', 'G5'],
            bars: [
                {
                    pad: ['E4', 'G4', 'C5'],
                    arp: ['C3', 'G3', 'C4', 'D4', 'E4', 'G4', 'E4', 'C4'],
                    mel: { 0: 'E5', 1: 'F5', 2: 'G5', 4: 'C5', 6: 'G5', 7: 'A5' }
                },
                {
                    pad: ['D4', 'G4', 'B4'],
                    arp: ['B2', 'G3', 'B3', 'D4', 'G4', 'D4', 'B3', 'G3'],
                    mel: { 0: 'G5', 2: 'D5', 4: 'B4', 6: 'G4' }
                },
                {
                    pad: ['E4', 'A4', 'C5'],
                    arp: ['A2', 'E3', 'A3', 'B3', 'C4', 'E4', 'C4', 'A3'],
                    mel: { 0: 'C5', 1: 'D5', 2: 'E5', 4: 'A5', 6: 'G5', 7: 'E5' }
                },
                {
                    pad: ['D4', 'G4', 'B4'],
                    arp: ['G2', 'D3', 'G3', 'B3', 'D4', 'B3', 'G3', 'D3'],
                    mel: { 0: 'D5', 2: ['E5', 'D5'], 4: 'B4', 6: 'D5' }
                },
                {
                    pad: ['F4', 'A4', 'C5'],
                    arp: ['F3', 'C4', 'F4', 'G4', 'A4', 'C5', 'A4', 'F4'],
                    mel: { 0: 'F5', 2: 'G5', 4: 'A5', 6: 'C6' }
                },
                {
                    pad: ['E4', 'G4', 'C5'],
                    arp: ['E3', 'C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'C4'],
                    mel: { 0: 'G5', 2: 'E5', 4: 'C5', 6: 'E5' }
                },
                {
                    pad: ['D4', 'F4', 'A4'],
                    arp: ['D3', 'A3', 'D4', 'F4', 'A4', 'F4', 'D4', 'A3'],
                    mel: { 0: 'F5', 2: 'E5', 4: 'D5', 6: 'A5' }
                },
                {
                    pad: ['D4', 'G4', 'B4'],
                    arp: ['G2', 'D3', 'G3', 'C4', 'B3', 'G3', 'D3', 'G3'],
                    mel: { 0: 'G5', 2: ['A5', 'G5'], 4: 'D5', 6: 'B4' }
                }
            ]
        },

        // 🌸 Lốc Anh Đào: "First Love / Spring Blossom" (Yiruma — F Major Warm Piano & Harp)
        sakura: {
            stepDur: 0.185,
            leadStyle: 'grand_piano',
            pentatonic: ['F4', 'G4', 'A4', 'C5', 'D5', 'F5', 'G5', 'A5', 'C6'],
            revealChord: ['F4', 'A4', 'C5', 'E5', 'G5', 'C6'],
            bars: [
                {
                    pad: ['F4', 'A4', 'C5'],
                    arp: ['F3', 'C4', 'F4', 'G4', 'A4', 'G4', 'F4', 'C4'],
                    mel: { 0: 'A5', 2: 'G5', 4: 'F5', 6: 'C5' }
                },
                {
                    pad: ['E4', 'G4', 'C5'],
                    arp: ['E3', 'C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'C4'],
                    mel: { 0: 'G5', 2: ['A5', 'G5'], 4: 'E5', 6: 'C5' }
                },
                {
                    pad: ['D4', 'F4', 'A4'],
                    arp: ['D3', 'A3', 'D4', 'F4', 'A4', 'F4', 'D4', 'A3'],
                    mel: { 0: 'F5', 2: 'G5', 4: 'A5', 6: 'C6' }
                },
                {
                    pad: ['E4', 'G4', 'C5'],
                    arp: ['C3', 'G3', 'C4', 'E4', 'G4', 'E4', 'C4', 'G3'],
                    mel: { 0: 'G5', 2: 'F5', 4: 'E5', 6: 'C5' }
                },
                {
                    pad: ['D4', 'F4', 'Bb4'],
                    arp: ['Bb2', 'F3', 'Bb3', 'C4', 'D4', 'F4', 'D4', 'Bb3'],
                    mel: { 0: 'D5', 2: 'F5', 4: 'Bb5', 6: 'A5' }
                },
                {
                    pad: ['C4', 'F4', 'A4'],
                    arp: ['A2', 'F3', 'A3', 'C4', 'F4', 'C4', 'A3', 'F3'],
                    mel: { 0: 'A5', 2: 'F5', 4: 'C5', 6: 'F5' }
                },
                {
                    pad: ['D4', 'G4', 'Bb4'],
                    arp: ['G2', 'D3', 'G3', 'Bb3', 'D4', 'Bb3', 'G3', 'D3'],
                    mel: { 0: 'G5', 2: 'A5', 4: 'Bb5', 6: 'D5' }
                },
                {
                    pad: ['E4', 'G4', 'C5'],
                    arp: ['C3', 'G3', 'C4', 'F4', 'E4', 'C4', 'G3', 'C4'],
                    mel: { 0: 'G5', 2: ['A5', 'G5'], 4: 'F5', 6: 'E5' }
                }
            ]
        }
    };

    // =========================================================================
    // 2. KHỞI TẠO PHÒNG THU WEB AUDIO API & IMPULSE RESPONSE REVERB ẤM SÁNG
    // =========================================================================
    function ensureAudioContext() {
        if (ctx) return ctx;
        if (!AudioCtx) return null;

        try {
            ctx = new AudioCtx();

            // Master Compressor chống rè/vỡ tiếng tuyệt đối khi nhiều hiệu ứng nổ cùng lúc
            compressor = ctx.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(-14, ctx.currentTime);
            compressor.knee.setValueAtTime(18, ctx.currentTime);
            compressor.ratio.setValueAtTime(4, ctx.currentTime);
            compressor.attack.setValueAtTime(0.005, ctx.currentTime);
            compressor.release.setValueAtTime(0.18, ctx.currentTime);

            masterGain = ctx.createGain();
            masterGain.gain.setValueAtTime(0.85, ctx.currentTime);

            compressor.connect(masterGain);
            masterGain.connect(ctx.destination);

            // Dry & Reverb Buses (Tăng tỉ lệ Dry để tiếng đàn Piano & Guitar trong trẻo, gần gũi, không bị vang ma mị)
            dryBus = ctx.createGain();
            dryBus.gain.setValueAtTime(0.84, ctx.currentTime);
            dryBus.connect(compressor);

            reverbBus = ctx.createGain();
            reverbBus.gain.setValueAtTime(0.26, ctx.currentTime);

            convolver = ctx.createConvolver();
            convolver.buffer = createVelvetHallImpulse(ctx, 1.75, 3.2);
            reverbBus.connect(convolver);
            convolver.connect(compressor);

            // Kênh 1: Nhạc nền (BGM Bus) — Mở sáng tự nhiên (12000Hz -> 18000Hz), tuyệt đối không lọc nghẹt 880Hz gây cảm giác bí ẩn/kinh dị
            bgmBus = ctx.createGain();
            bgmBus.gain.setValueAtTime(0.50, ctx.currentTime);

            bgmMuffleFilter = ctx.createBiquadFilter();
            bgmMuffleFilter.type = 'lowpass';
            bgmMuffleFilter.frequency.setValueAtTime(isEnvelopeClosedMuffled ? 12000 : 18000, ctx.currentTime);
            bgmMuffleFilter.Q.setValueAtTime(0.5, ctx.currentTime);

            bgmMuteGain = ctx.createGain();
            bgmMuteGain.gain.setValueAtTime(isBgmMuted ? 0.0001 : 1.0, ctx.currentTime);

            bgmReverbBus = ctx.createGain();
            bgmReverbBus.gain.setValueAtTime(isBgmMuted ? 0.0001 : 1.0, ctx.currentTime);

            bgmBus.connect(bgmMuffleFilter);
            bgmMuffleFilter.connect(bgmMuteGain);
            bgmMuteGain.connect(dryBus);
            bgmMuteGain.connect(reverbBus);
            bgmReverbBus.connect(reverbBus);

            // Kênh 2: Hiệu ứng âm thanh (SFX Bus) có khóa Mute hoàn toàn độc lập với Nhạc nền
            sfxBus = ctx.createGain();
            sfxBus.gain.setValueAtTime(0.88, ctx.currentTime);

            sfxMuteGain = ctx.createGain();
            sfxMuteGain.gain.setValueAtTime(isSfxMuted ? 0.0001 : 1.0, ctx.currentTime);

            sfxReverbBus = ctx.createGain();
            sfxReverbBus.gain.setValueAtTime(isSfxMuted ? 0.0001 : 1.0, ctx.currentTime);

            sfxBus.connect(sfxMuteGain);
            sfxMuteGain.connect(dryBus);
            sfxReverbBus.connect(reverbBus);

            // Tạo sẵn bộ đệm White Noise & Pink/Velvet Noise cho hiệu ứng Lụa, Giấy & Sáp
            buildNoiseBuffers(ctx);
        } catch (err) {
            console.warn('Web Audio init skipped:', err);
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
                // Phòng thu Acoustic sáng ấm, tự nhiên
                b0 = 0.99 * b0 + 0.01 * white;
                b1 = 0.90 * b1 + 0.10 * white;
                b2 = 0.68 * b2 + 0.32 * white;
                const warmNoise = (b1 * 0.55 + b2 * 0.45 - b0 * 0.35);
                const env = Math.pow(1 - t, decayRate) * (1 - Math.exp(-i / (rate * 0.012)));
                data[i] = warmNoise * env * 0.55;
            }
            const erTimes = [0.014, 0.027, 0.041];
            const erGains = [0.18, 0.12, 0.08];
            erTimes.forEach((et, idx) => {
                const sampleIdx = Math.floor(et * rate) + (ch * 97);
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
            pinkOut[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.045;
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

    function connectWithPanAndReverb(sourceNode, destBus, reverbSendAmount, panValue) {
        if (!ctx) return;
        let outNode = sourceNode;
        const panner = createStereoPan(panValue);
        if (panner) {
            sourceNode.connect(panner);
            outNode = panner;
        }
        const targetBus = destBus || sfxBus;
        outNode.connect(targetBus);
        if (reverbSendAmount > 0) {
            const revTarget = (targetBus === bgmBus) ? bgmReverbBus : sfxReverbBus;
            if (revTarget) {
                const sendGain = ctx.createGain();
                sendGain.gain.setValueAtTime(reverbSendAmount, ctx.currentTime);
                outNode.connect(sendGain);
                sendGain.connect(revTarget);
            }
        }
    }

    // =========================================================================
    // 3. MÔ HÌNH NHẠC CỤ CONCERT GRAND PIANO (YIRUMA STYLE) & ACOUSTIC GUITAR/HARP
    // (Bỏ hoàn toàn tiếng hộp nhạc dây cót kim loại 3.008f & drone trầm u ám)
    // =========================================================================

    // Tiếng Đại Dương Cầm (Concert Grand Piano) & Acoustic Guitar ấm sáng, ngân legato
    function playMelodyNote(freq, startTime, duration, velocity = 0.22, style = 'grand_piano', pan = 0, targetBus = null) {
        const outBus = targetBus || bgmBus;
        const channelMuted = (outBus === bgmBus) ? isBgmMuted : isSfxMuted;
        if (!ctx || channelMuted || isPageHidden) return;
        const t0 = Math.max(ctx.currentTime + 0.004, startTime);

        // Giới hạn tần số an toàn ở quãng ấm (không bao giờ vượt quá 1760Hz gây chói/lạnh lẽo)
        const safeFreq = freq > 1760 ? freq * 0.5 : freq;
        const sustainDur = Math.max(0.45, duration * 1.38);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, t0);

        if (style === 'acoustic_guitar') {
            // Acoustic Fingerstyle Guitar: Tiếng dây gảy mộc mạc, ấm áp, tươi sáng
            env.gain.exponentialRampToValueAtTime(velocity * 1.05, t0 + 0.010);
            env.gain.exponentialRampToValueAtTime(velocity * 0.45, t0 + 0.22);
            env.gain.exponentialRampToValueAtTime(0.0001, t0 + sustainDur);

            const flt = ctx.createBiquadFilter();
            flt.type = 'lowpass';
            flt.frequency.setValueAtTime(Math.min(5800, safeFreq * 5.2), t0);
            flt.frequency.exponentialRampToValueAtTime(Math.max(520, safeFreq * 1.65), t0 + sustainDur * 0.72);

            const osc1 = ctx.createOscillator();
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(safeFreq, t0);

            const osc2 = ctx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(safeFreq * 2, t0);
            const g2 = ctx.createGain();
            g2.gain.setValueAtTime(0.22, t0);
            g2.gain.exponentialRampToValueAtTime(0.01, t0 + 0.28);

            osc1.connect(flt);
            osc2.connect(g2);
            g2.connect(flt);
            flt.connect(env);

            connectWithPanAndReverb(env, outBus, 0.30, pan);
            osc1.start(t0);
            osc2.start(t0);
            osc1.stop(t0 + sustainDur + 0.05);
            osc2.stop(t0 + 0.32);
        } else {
            // Yiruma Concert Grand Piano: Búa đàn nỉ mềm + dây đôi cộng hưởng + bồi âm thùng đàn ấm áp
            env.gain.exponentialRampToValueAtTime(velocity, t0 + 0.012);
            env.gain.exponentialRampToValueAtTime(velocity * 0.52, t0 + 0.24);
            env.gain.exponentialRampToValueAtTime(0.0001, t0 + sustainDur);

            const flt = ctx.createBiquadFilter();
            flt.type = 'lowpass';
            flt.frequency.setValueAtTime(Math.min(5200, safeFreq * 4.8), t0);
            flt.frequency.exponentialRampToValueAtTime(Math.max(480, safeFreq * 1.55), t0 + sustainDur * 0.82);

            // Dây đôi Piano lệch nhẹ ±1.8 cents tạo độ dày tự nhiên (không bị detune ma mị)
            const osc1 = ctx.createOscillator();
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(safeFreq, t0);
            osc1.detune.setValueAtTime(-1.8, t0);

            const osc2 = ctx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(safeFreq, t0);
            osc2.detune.setValueAtTime(1.8, t0);

            // Bồi âm bậc 2 (Octave Harmonic) làm tiếng Piano trong trẻo, sang trọng
            const oscHarm = ctx.createOscillator();
            oscHarm.type = 'sine';
            oscHarm.frequency.setValueAtTime(safeFreq * 2, t0);
            const gHarm = ctx.createGain();
            gHarm.gain.setValueAtTime(0.18, t0);
            gHarm.gain.exponentialRampToValueAtTime(0.008, t0 + 0.28);

            osc1.connect(flt);
            osc2.connect(flt);
            oscHarm.connect(gHarm);
            gHarm.connect(flt);
            flt.connect(env);

            connectWithPanAndReverb(env, outBus, 0.32, pan);
            osc1.start(t0);
            osc2.start(t0);
            oscHarm.start(t0);
            osc1.stop(t0 + sustainDur + 0.05);
            osc2.stop(t0 + sustainDur + 0.05);
            oscHarm.stop(t0 + 0.32);
        }
    }

    // Bè Tay Trái Piano & Acoustic Harp rải hợp âm (Left-Hand Flowing Arpeggio)
    function playHarpPluck(freq, startTime, duration = 1.45, velocity = 0.13, pan = 0, targetBus = null) {
        const outBus = targetBus || bgmBus;
        const channelMuted = (outBus === bgmBus) ? isBgmMuted : isSfxMuted;
        if (!ctx || channelMuted || isPageHidden) return;
        const t0 = Math.max(ctx.currentTime + 0.004, startTime);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, t0);
        env.gain.exponentialRampToValueAtTime(velocity, t0 + 0.015);
        env.gain.exponentialRampToValueAtTime(velocity * 0.42, t0 + 0.28);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

        const flt = ctx.createBiquadFilter();
        flt.type = 'lowpass';
        flt.frequency.setValueAtTime(Math.min(4800, freq * 4.0), t0);
        flt.frequency.exponentialRampToValueAtTime(Math.max(380, freq * 1.35), t0 + duration * 0.75);

        const osc1 = ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(freq, t0);

        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2, t0);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.14, t0);
        g2.gain.exponentialRampToValueAtTime(0.002, t0 + 0.22);

        osc1.connect(flt);
        osc2.connect(g2);
        g2.connect(flt);
        flt.connect(env);

        connectWithPanAndReverb(env, outBus, 0.28, pan);
        osc1.start(t0);
        osc2.start(t0);
        osc1.stop(t0 + duration + 0.04);
        osc2.stop(t0 + 0.25);
    }

    // Lớp Strings Ấm Sáng Ở Quãng Trung-Cao (Octave 4 — Không bao giờ dùng Drone Trầm Octave 3)
    function playWarmPadChord(noteNames, startTime, duration, velocity = 0.024, targetBus = null) {
        const outBus = targetBus || bgmBus;
        const channelMuted = (outBus === bgmBus) ? isBgmMuted : isSfxMuted;
        if (!ctx || channelMuted || isPageHidden || !Array.isArray(noteNames)) return;
        const t0 = Math.max(ctx.currentTime + 0.005, startTime);

        const flt = ctx.createBiquadFilter();
        flt.type = 'lowpass';
        flt.frequency.setValueAtTime(2200, t0);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, t0);
        env.gain.linearRampToValueAtTime(velocity, t0 + Math.min(0.45, duration * 0.3));
        env.gain.setValueAtTime(velocity * 0.82, t0 + duration * 0.72);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration + 0.35);

        flt.connect(env);
        connectWithPanAndReverb(env, outBus, 0.35, 0);

        noteNames.forEach((name, idx) => {
            const f = n(name);
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, t0);
            osc.detune.setValueAtTime((idx - 1) * 2.0, t0);
            osc.connect(flt);
            osc.start(t0);
            osc.stop(t0 + duration + 0.4);
        });
    }

    // =========================================================================
    // 4. BỘ LẬP LỊCH NHẠC NỀN PIANO BALLAD (YIRUMA LEGATO SEQUENCER)
    // =========================================================================
    function scheduleBgmTick() {
        if (!isBgmRunning || !ctx || isBgmMuted || isPageHidden) return;
        if (ctx.state !== 'running') return;

        const suite = THEME_SUITES[currentMotionTheme] || THEME_SUITES.bloom;
        const lookaheadSec = 0.20;

        while (nextNoteTime < ctx.currentTime + lookaheadSec) {
            const barIdx = Math.floor(currentStep / 8) % suite.bars.length;
            const stepInBar = currentStep % 8;
            const bar = suite.bars[barIdx];

            // Humanize nhẹ độ lệch thời gian (±4ms) để tiếng đàn mềm mại như nghệ sĩ biểu diễn thật
            const humanizeT = (Math.random() - 0.5) * 0.008;
            const noteTime = Math.max(ctx.currentTime + 0.005, nextNoteTime + humanizeT);
            const velScale = bgmDuckFactor * (isEnvelopeClosedMuffled ? 0.86 : 1.0);

            // 1. Đầu mỗi ô nhịp (stepInBar === 0): Lớp nền Strings sáng dịu ở Octave 4
            if (stepInBar === 0 && bar.pad) {
                playWarmPadChord(bar.pad, noteTime, suite.stepDur * 8.0, 0.022 * velScale, bgmBus);
            }

            // 2. Bè Tay Trái Piano rải hợp âm (Root - 5th - 8ve - 9th - 10th chuẩn Yiruma)
            if (bar.arp && bar.arp[stepInBar]) {
                const arpNote = bar.arp[stepInBar];
                const pan = ((stepInBar / 7) - 0.5) * 0.36;
                const arpVel = (stepInBar === 0 ? 0.125 : (stepInBar === 4 ? 0.105 : 0.082)) * velScale * (0.94 + Math.random() * 0.12);
                playHarpPluck(n(arpNote), noteTime, suite.stepDur * 5.8, arpVel, pan, bgmBus);
            }

            // 3. Bè Giai Điệu Tay Phải Piano (Hỗ trợ cả nốt đơn và nốt luyến 16th-note đặc trưng của River Flows in You)
            if (bar.mel && bar.mel[stepInBar]) {
                const melEntry = bar.mel[stepInBar];
                const melPan = Math.sin(currentStep * 0.35) * 0.18;
                if (Array.isArray(melEntry)) {
                    const firstNote = melEntry[0];
                    const graceNote = melEntry[1];
                    const melVel1 = 0.21 * velScale * (0.95 + Math.random() * 0.10);
                    const melVel2 = 0.185 * velScale * (0.95 + Math.random() * 0.10);
                    playMelodyNote(n(firstNote), noteTime, suite.stepDur * 4.2, melVel1, suite.leadStyle, melPan, bgmBus);
                    if (graceNote) {
                        playMelodyNote(n(graceNote), noteTime + suite.stepDur * 0.5, suite.stepDur * 4.2, melVel2, suite.leadStyle, melPan + 0.06, bgmBus);
                    }
                } else {
                    const melVel = 0.215 * velScale * (0.95 + Math.random() * 0.10);
                    playMelodyNote(n(melEntry), noteTime, suite.stepDur * 6.2, melVel, suite.leadStyle, melPan, bgmBus);
                }
            }

            nextNoteTime += suite.stepDur;
            currentStep = (currentStep + 1) % (suite.bars.length * 8);
        }
    }

    function startBgmScheduler() {
        if (isBgmRunning) return;
        const c = ensureAudioContext();
        if (!c) return;
        isBgmRunning = true;
        nextNoteTime = c.currentTime + 0.08;
        if (bgmTimerId) clearInterval(bgmTimerId);
        bgmTimerId = setInterval(scheduleBgmTick, 70);
    }

    function setEnvelopeSpatialMuffle(muffled, rampSec = 0.85) {
        isEnvelopeClosedMuffled = !!muffled;
        if (!ctx || !bgmMuffleFilter) return;
        const now = ctx.currentTime;
        // Giữ dải cao luôn trong sáng (12000Hz -> 18000Hz), tuyệt đối không làm nghẹt tiếng kiểu hộp nhạc cũ
        const targetFreq = isEnvelopeClosedMuffled ? 12000 : 18000;
        try {
            bgmMuffleFilter.frequency.cancelScheduledValues(now);
            bgmMuffleFilter.frequency.setValueAtTime(Math.max(4000, bgmMuffleFilter.frequency.value || 12000), now);
            bgmMuffleFilter.frequency.exponentialRampToValueAtTime(targetFreq, now + Math.max(0.08, rampSec));
        } catch (_) {}
    }

    function setBgmDuck(duckFactor, holdSec = 0) {
        bgmDuckFactor = Math.max(0.15, Math.min(1.0, duckFactor));
        if (holdSec > 0) {
            setTimeout(() => {
                bgmDuckFactor = 1.0;
            }, holdSec * 1000);
        }
    }

    // =========================================================================
    // 4B. HỆ THỐNG RUNG XÚC GIÁC TINH TẾ (SUBTLE HAPTIC & OPTICAL MICRO-PULSE)
    // =========================================================================
    // Kết hợp nhịp rung Taptic ngắn (7ms-18ms) trên thiết bị hỗ trợ navigator.vibrate
    // và xung nhịp quang học siêu nhẹ (1.5px) cho iOS Safari / Desktop để cảm nhận rõ lực vật lý mà vẫn cực kỳ tinh tế.
    let lastHapticTime = 0;

    function triggerSubtleHaptic(kind = 'light') {
        if (isSfxMuted || isPageHidden) return;
        const nowPerf = performance.now();
        if (kind === 'light' && nowPerf - lastHapticTime < 45) return;
        lastHapticTime = nowPerf;

        // 1. Hardware Haptic Vibration (Android / Supported Mobile Browsers)
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try {
                if (kind === 'light') {
                    navigator.vibrate(7);
                } else if (kind === 'nudge') {
                    navigator.vibrate([10, 45, 12]);
                } else if (kind === 'heartbeat') {
                    navigator.vibrate(11);
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

        // 2. Optical Micro-Pulse (1.4px, 115ms) cho các khoảnh khắc vật lý trọng tâm (Dấu sáp & Giọt nước)
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
    // 5. HIỆU ỨNG FOLEY VẬT LÝ & TƯƠNG TÁC VI MÔ (SFX SYNTHESIZERS)
    // =========================================================================

    // 5.1. Chạm tay nở hoa Ngũ cung (Warm Piano Droplet Touch)
    function playTouchSparkle(clientX) {
        if (!canPlayAudio()) return;
        const nowPerf = performance.now();
        if (nowPerf - lastSparkleSoundTime < 68) return; // Chống dội âm khi vuốt liên tục
        lastSparkleSoundTime = nowPerf;

        const suite = THEME_SUITES[currentMotionTheme] || THEME_SUITES.bloom;
        const scale = suite.pentatonic;
        const noteName = scale[sparkleNoteIndex % scale.length];
        sparkleNoteIndex = (sparkleNoteIndex + 1 + (Math.random() > 0.65 ? 1 : 0)) % scale.length;

        const vw = window.innerWidth || 1;
        const pan = typeof clientX === 'number' ? ((clientX / vw) * 2 - 1) * 0.45 : 0;

        playMelodyNote(n(noteName), ctx.currentTime, 0.55, 0.09, 'grand_piano', pan, sfxBus);
    }

    // 5.2. Tiếng chạm UI Ngọc Trai / Pha Lê (Tabs, Chips, Buttons, Camera Tools)
    function playUiTap(kind = 'chip', index = 0) {
        if (!canPlayAudio()) return;
        const nowPerf = performance.now();
        if (nowPerf - lastUiTapTime < 35) return;
        lastUiTapTime = nowPerf;
        triggerSubtleHaptic('light');

        const t0 = ctx.currentTime + 0.003;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();

        if (kind === 'tab') {
            // Chuyển Tab: Tiếng chạm phím đàn ấm sáng
            const baseF = 587.33 + (index % 5) * 65;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseF, t0);
            osc.frequency.exponentialRampToValueAtTime(baseF * 1.25, t0 + 0.055);
            env.gain.setValueAtTime(0.0001, t0);
            env.gain.exponentialRampToValueAtTime(0.10, t0 + 0.006);
            env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.075);
            osc.connect(env);
            connectWithPanAndReverb(env, sfxBus, 0.20, 0);
            osc.start(t0);
            osc.stop(t0 + 0.085);
        } else if (kind === 'camera') {
            // Lật gương / Xoay ảnh / Căn giữa: Tiếng cơ học ống kính mềm
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(520, t0);
            osc.frequency.exponentialRampToValueAtTime(240, t0 + 0.045);
            env.gain.setValueAtTime(0.0001, t0);
            env.gain.exponentialRampToValueAtTime(0.13, t0 + 0.004);
            env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.055);
            osc.connect(env);
            connectWithPanAndReverb(env, sfxBus, 0.1, 0);
            osc.start(t0);
            osc.stop(t0 + 0.065);
        } else {
            // Chọn Khung / Viền / Màu / Chủ đề: Tiếng chạm Ngọc Trai (Lustrous Pearl Tap)
            const suite = THEME_SUITES[currentMotionTheme] || THEME_SUITES.bloom;
            const noteName = suite.pentatonic[Math.abs(index) % suite.pentatonic.length];
            const f = n(noteName);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, t0);
            env.gain.setValueAtTime(0.0001, t0);
            env.gain.exponentialRampToValueAtTime(0.105, t0 + 0.006);
            env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
            osc.connect(env);
            connectWithPanAndReverb(env, sfxBus, 0.24, 0);
            osc.start(t0);
            osc.stop(t0 + 0.16);
        }
    }

    // 5.3. Tiếng Chuông Nhắc Nhẹ khi bấm lệch ngoài Con Dấu Sáp ("Ting-ting~")
    function playSealAttentionHint() {
        if (!canPlayAudio()) return;
        triggerSubtleHaptic('nudge');
        const t0 = ctx.currentTime + 0.01;
        playMelodyNote(n('E5'), t0, 0.42, 0.14, 'grand_piano', -0.15, sfxBus);
        playMelodyNote(n('A5'), t0 + 0.09, 0.60, 0.16, 'grand_piano', 0.15, sfxBus);
    }

    // 5.4. Tiếng Đũa Thần "🪄 Tự phối gu" & "🎲 Đổi câu chúc"
    function playMagicGlissando(isReroll = false) {
        if (!canPlayAudio()) return;
        triggerSubtleHaptic('light');
        const suite = THEME_SUITES[currentMotionTheme] || THEME_SUITES.bloom;
        const notes = isReroll
            ? suite.pentatonic.slice(0, 4)
            : suite.pentatonic.slice(0, 6);
        const t0 = ctx.currentTime + 0.01;
        notes.forEach((name, idx) => {
            const pan = ((idx / Math.max(1, notes.length - 1)) - 0.5) * 0.55;
            playHarpPluck(n(name), t0 + idx * 0.048, 0.85, 0.13, pan, sfxBus);
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
        connectWithPanAndReverb(env, sfxBus, 0.24, pan);

        src.start(t0, Math.random() * 0.4);
        src.stop(t0 + duration + 0.04);
    }

    // 5.6. Tiếng Tách Con Dấu Sáp Vàng 24K Giòn Tan & Bụi Kim Tuyến (Crisp Wax Seal Pop)
    function playWaxSealCrack() {
        if (!canPlayAudio()) return;
        triggerSubtleHaptic('seal_pop');
        const t0 = ctx.currentTime + 0.005;

        // Lớp 1: Cộng hưởng thân sáp vàng tách giòn (Warm Body Thump 195Hz -> 68Hz)
        const bodyOsc = ctx.createOscillator();
        const bodyEnv = ctx.createGain();
        bodyOsc.type = 'triangle';
        bodyOsc.frequency.setValueAtTime(195, t0);
        bodyOsc.frequency.exponentialRampToValueAtTime(68, t0 + 0.065);
        bodyEnv.gain.setValueAtTime(0.0001, t0);
        bodyEnv.gain.exponentialRampToValueAtTime(0.30, t0 + 0.005);
        bodyEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.075);
        bodyOsc.connect(bodyEnv);
        bodyEnv.connect(sfxBus);
        bodyOsc.start(t0);
        bodyOsc.stop(t0 + 0.085);

        // Lớp 2: Tiếng nứt sáp giòn ở dải cao (Crisp Snap 2200Hz)
        if (noiseBuffer) {
            const snapSrc = ctx.createBufferSource();
            snapSrc.buffer = noiseBuffer;
            const snapFlt = ctx.createBiquadFilter();
            snapFlt.type = 'bandpass';
            snapFlt.frequency.setValueAtTime(2350, t0);
            snapFlt.Q.setValueAtTime(3.2, t0);
            const snapEnv = ctx.createGain();
            snapEnv.gain.setValueAtTime(0.0001, t0);
            snapEnv.gain.exponentialRampToValueAtTime(0.24, t0 + 0.003);
            snapEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.038);
            snapSrc.connect(snapFlt);
            snapFlt.connect(snapEnv);
            connectWithPanAndReverb(snapEnv, sfxBus, 0.22, 0);
            snapSrc.start(t0);
            snapSrc.stop(t0 + 0.045);
        }

        // Lớp 3: Hợp âm Piano & Harp bung sáng ấm áp
        const suite = THEME_SUITES[currentMotionTheme] || THEME_SUITES.bloom;
        const sparkleNotes = suite.pentatonic.slice(1, 6);
        if (sparkleNotes.length > 0) {
            playHarpPluck(n(sparkleNotes[0]), t0 + 0.018, 0.85, 0.12, -0.35, sfxBus);
        }
        setTimeout(() => {
            if (!canPlayAudio()) return;
            const tFollow = ctx.currentTime + 0.008;
            for (let idx = 1; idx < sparkleNotes.length; idx++) {
                playHarpPluck(n(sparkleNotes[idx]), tFollow + (idx - 1) * 0.038, 0.85, 0.12, (idx - 2) * 0.2, sfxBus);
            }
        }, 18);
    }

    // 5.7. Tiếng Đóng Ấn Sáp Vàng 24K Uy Lực (Khi Phong Bì 3D vừa đáp xuống và đóng dấu sáp)
    function playWaxSealStampImpact() {
        if (!canPlayAudio()) return;
        triggerSubtleHaptic('stamp');
        const t0 = ctx.currentTime + 0.005;

        // Âm trầm đóng dấu ấm
        const subOsc = ctx.createOscillator();
        const subEnv = ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(145, t0);
        subOsc.frequency.exponentialRampToValueAtTime(54, t0 + 0.13);
        subEnv.gain.setValueAtTime(0.0001, t0);
        subEnv.gain.exponentialRampToValueAtTime(0.32, t0 + 0.008);
        subEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15);
        subOsc.connect(subEnv);
        subEnv.connect(sfxBus);
        subOsc.start(t0);
        subOsc.stop(t0 + 0.17);

        // Tiếng ngân Piano ấm khi ấn sáp khóa chặt
        const suite = THEME_SUITES[currentMotionTheme] || THEME_SUITES.bloom;
        const rootNote = suite.pentatonic[0];
        const fifthNote = suite.pentatonic[3];
        playMelodyNote(n(rootNote), t0 + 0.01, 0.9, 0.16, 'grand_piano', -0.2, sfxBus);
        playMelodyNote(n(fifthNote), t0 + 0.04, 1.1, 0.18, 'grand_piano', 0.2, sfxBus);
    }

    // 5.8. Tiếng Mở Phong Bì Vật Lý Bước 1 (Full Choreography)
    function playStep1EnvelopeOpenSequence() {
        // Mở khóa bộ lọc âm thanh BGM từ trong phong bì ra toàn dải sáng rõ (ngay cả khi tắt SFX)
        setEnvelopeSpatialMuffle(false, 0.95);
        if (!canPlayAudio()) return;

        // 0ms: Tách dấu sáp vàng ngay lập tức; đẩy các lớp tiếng giấy trượt sang frame kế tiếp để tránh dồn WebAudio node vào frame click
        playWaxSealCrack();
        setTimeout(() => {
            if (!canPlayAudio()) return;
            playSilkPaperWhoosh(0.32, 340, 820, 0.16, 0, 0.02);
            playSilkPaperWhoosh(0.48, 420, 1180, 0.22, 0, 0.39);
        }, 18);

        // 980ms: Thiệp bung ra chính giữa màn hình
        setTimeout(() => {
            if (!canPlayAudio()) return;
            const suite = THEME_SUITES[currentMotionTheme] || THEME_SUITES.bloom;
            playSilkPaperWhoosh(0.28, 680, 520, 0.14, 0, 0);
            suite.revealChord.slice(0, 5).forEach((noteName, i) => {
                playHarpPluck(n(noteName), ctx.currentTime + i * 0.045, 1.4, 0.13, (i - 2) * 0.2, sfxBus);
            });
        }, 960);
    }

    // 5.9. Tiếng Đóng Thiệp Vào Lại Phong Bì Bước 1 (Reverse Choreography)
    function playStep1EnvelopeCloseSequence() {
        setTimeout(() => {
            setEnvelopeSpatialMuffle(true, 0.85);
        }, 1100);
        if (!canPlayAudio()) return;
        // 0ms: Nhấc tấm thiệp lên ngang miệng phong bì
        playSilkPaperWhoosh(0.35, 520, 860, 0.15, 0, 0.02);

        // 550ms: Trượt tấm thiệp sâu vào lòng túi chữ V
        playSilkPaperWhoosh(0.45, 920, 340, 0.19, 0, 0.55);

        // 1100ms: Gập nắp phong bì & khóa con dấu sáp vàng
        setTimeout(() => {
            if (!canPlayAudio()) return;
            playSilkPaperWhoosh(0.25, 620, 280, 0.14, 0, 0);
            playWaxSealStampImpact();
        }, 1100);
    }

    // 5.10. Tiếng Pháo Hoa & Hợp Âm Chúc Mừng (Celebration Burst)
    function playCelebrationBurst() {
        if (!canPlayAudio()) return;
        const suite = THEME_SUITES[currentMotionTheme] || THEME_SUITES.bloom;
        const t0 = ctx.currentTime + 0.01;
        suite.revealChord.forEach((noteName, idx) => {
            const pan = ((idx / Math.max(1, suite.revealChord.length - 1)) - 0.5) * 0.7;
            playHarpPluck(n(noteName), t0 + idx * 0.042, 1.85, 0.14, pan, sfxBus);
            if (idx >= 2) {
                playMelodyNote(n(noteName), t0 + 0.10 + (idx - 2) * 0.048, 1.05, 0.11, 'grand_piano', -pan, sfxBus);
            }
        });
    }

    // 5.11. Tiếng Xòe Quạt 3 Tấm Thiệp Mẫu & Nháy Mắt Chào
    function playCardFanSwipe(isManual = true) {
        if (!canPlayAudio()) return;
        if (isManual) triggerSubtleHaptic('light');
        const gain = isManual ? 0.16 : 0.055; // Tự động chuyển mỗi 4s thì cực khẽ để không làm phiền
        playSilkPaperWhoosh(0.22, 480, 960, gain, 0, 0);
        if (isManual) {
            const suite = THEME_SUITES[currentMotionTheme] || THEME_SUITES.bloom;
            const noteName = suite.pentatonic[Math.floor(Math.random() * 4)];
            playMelodyNote(n(noteName), ctx.currentTime + 0.03, 0.42, 0.10, 'grand_piano', 0.15, sfxBus);
        }
    }

    function playCardWinkTwinkle() {
        if (!canPlayAudio()) return;
        const t0 = ctx.currentTime + 0.01;
        playMelodyNote(n('E5'), t0, 0.35, 0.09, 'grand_piano', 0.1, sfxBus);
        playMelodyNote(n('A5'), t0 + 0.07, 0.45, 0.10, 'grand_piano', 0.25, sfxBus);
    }

    // 5.12. Hợp âm Hoàn Tất Sang Trọng (Khi bấm Tạo Thiệp / Sao chép Link / Lưu Ảnh)
    function playSuccessChime() {
        if (!canPlayAudio()) return;
        triggerSubtleHaptic('success');
        const suite = THEME_SUITES[currentMotionTheme] || THEME_SUITES.bloom;
        const t0 = ctx.currentTime + 0.01;
        const notes = suite.revealChord.slice(1, 5);
        notes.forEach((name, idx) => {
            playMelodyNote(n(name), t0 + idx * 0.055, 0.9, 0.15, 'grand_piano', (idx - 1.5) * 0.2, sfxBus);
        });
    }

    // =========================================================================
    // 6. ĐẠI CẢNH 3D "NỤ HOA ƯỚC NGUYỆN" (wish-bloom.js) — ĐỒNG BỘ THEO TRỤC TAU
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
        if (!ctx || !isUnlocked || isPageHidden) return;
        if (isSkipped) {
            if (!wishBloomCueState.lift) {
                wishBloomCueState.lift = true;
                setEnvelopeSpatialMuffle(true, 0.6);
                if (canPlayAudio()) {
                    playSilkPaperWhoosh(0.45, 380, 960, 0.18, 0, 0);
                }
            }
            return;
        }

        const suite = THEME_SUITES[currentMotionTheme] || THEME_SUITES.bloom;
        const now = ctx.currentTime;

        // 1. Khởi đầu đại cảnh Hồ Gương (tau >= 0.02s)
        if (!wishBloomCueState.started && tau >= 0.02) {
            wishBloomCueState.started = true;
            setBgmDuck(0.36, 8.0);
            setEnvelopeSpatialMuffle(false, 0.4);
            if (canPlayAudio()) {
                playWarmPadChord(suite.bars[0].pad, now, 2.2, 0.035, sfxBus);
            }
        }

        // 2. Đốm sáng ước nguyện hóa sao băng lao xuống (tau >= 0.70s = T.FALL)
        if (!wishBloomCueState.fall && tau >= 0.70) {
            wishBloomCueState.fall = true;
            if (canPlayAudio()) {
                playSilkPaperWhoosh(0.50, 980, 420, 0.14, 0, 0.02);
                playHarpPluck(n(suite.pentatonic[4] || 'E5'), now, 0.9, 0.12, 0, sfxBus);
            }
        }

        // 3. Chạm mặt Hồ Gương & Bullet-Time Slow-Mo (tau >= 1.60s = T.IMPACT)
        if (!wishBloomCueState.impact && tau >= 1.59) {
            wishBloomCueState.impact = true;
            if (canPlayAudio()) {
                triggerSubtleHaptic('water_drop');

                // A. Giọt nước pha lê Minnaert (tần số bọt nước quét cong lên 390Hz -> 980Hz)
                const dropOsc = ctx.createOscillator();
                const dropEnv = ctx.createGain();
                dropOsc.type = 'sine';
                dropOsc.frequency.setValueAtTime(390, now);
                dropOsc.frequency.exponentialRampToValueAtTime(980, now + 0.072);
                dropEnv.gain.setValueAtTime(0.0001, now);
                dropEnv.gain.exponentialRampToValueAtTime(0.28, now + 0.008);
                dropEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
                dropOsc.connect(dropEnv);
                connectWithPanAndReverb(dropEnv, sfxBus, 0.55, 0);
                dropOsc.start(now);
                dropOsc.stop(now + 0.22);

                // B. Chùm Piano & Harp phản chiếu sóng nước ấm sáng
                suite.pentatonic.slice(0, 5).forEach((noteName, idx) => {
                    playMelodyNote(n(noteName), now + 0.05 + idx * 0.07, 1.25, 0.13, 'grand_piano', (idx - 2) * 0.22, sfxBus);
                });
            }
        }

        // 4. Nụ hoa 3D trồi lên từ mặt nước (tau >= 1.95s = T.BUD)
        if (!wishBloomCueState.bud && tau >= 1.95) {
            wishBloomCueState.bud = true;
            if (canPlayAudio()) {
                playSilkPaperWhoosh(0.42, 260, 640, 0.15, 0, 0);
                playHarpPluck(n(suite.bars[0].pad[0]), now, 1.6, 0.15, 0, sfxBus);
            }
        }

        // 5. Đại đóa hoa bung nở từng tầng cánh Bezier 3D (tau >= 2.50s = T.OPEN)
        if (!wishBloomCueState.open && tau >= 2.50) {
            wishBloomCueState.open = true;
            if (canPlayAudio()) {
                suite.revealChord.forEach((noteName, idx) => {
                    const pan = ((idx / Math.max(1, suite.revealChord.length - 1)) - 0.5) * 0.65;
                    playHarpPluck(n(noteName), now + idx * 0.075, 1.9, 0.15, pan, sfxBus);
                });
            }
        }

        // 6. Vương miện 42 nhụy vàng tỏa sáng rực rỡ giữa lòng hoa mãn khai (tau >= 2.88s)
        if (!wishBloomCueState.heart && tau >= 2.88) {
            wishBloomCueState.heart = true;
            if (canPlayAudio()) {
                playSilkPaperWhoosh(0.42, 340, 760, 0.11, 0, 0);
                suite.pentatonic.slice(2, 7).forEach((noteName, idx) => {
                    playMelodyNote(n(noteName), now + idx * 0.055, 1.25, 0.13, 'grand_piano', (idx - 2) * 0.2, sfxBus);
                });
            }
        }

        // 7. 4 Cánh hoa gấp Origami 3D thong thả thành 4 vạt chiếc phong bì trên đài hoa (tau >= 4.12s)
        if (!wishBloomCueState.envIn && tau >= 4.12) {
            wishBloomCueState.envIn = true;
            if (canPlayAudio()) {
                playSilkPaperWhoosh(1.05, 380, 880, 0.13, 0, 0.02);
                const foldNotes = [2, 3, 4, 5];
                foldNotes.forEach((pIdx, f) => {
                    const noteName = suite.pentatonic[pIdx % suite.pentatonic.length];
                    playMelodyNote(n(noteName), now + f * 0.34, 1.15, 0.13 + f * 0.01, 'grand_piano', (f - 1.5) * 0.2, sfxBus);
                });
            }
        }

        // 8. Đài hoa nâng phong bì dâng tặng về phía người xem (tau >= 6.05s = T.LIFT)
        if (!wishBloomCueState.lift && tau >= 6.05) {
            wishBloomCueState.lift = true;
            setEnvelopeSpatialMuffle(true, 0.9);
            if (canPlayAudio()) {
                playSilkPaperWhoosh(0.68, 320, 880, 0.17, 0, 0);
            }
        }
    }

    // =========================================================================
    // 7. SÂN KHẤU ĐẠO DIỄN PHONG BÌ 3D HỢP NHẤT (director-3d.js)
    // =========================================================================

    // Khi bấm vào Con Dấu Sáp 3D (#u3d-seal-btn): Pha Khởi Động Lãng Mạn (0.00s -> 0.88s)
    // followed by Vỡ Phong Ấn (0.88s) -> Phun Trào & Rút Thiệp (0.98s -> 2.32s) -> Đáp Sân Khấu (2.32s -> 2.94s)
    function playUnified3DEnvelopeOpenSequence(motionId) {
        if (motionId && THEME_SUITES[motionId]) {
            currentMotionTheme = motionId;
        }
        // Mở khóa dần bộ lọc không gian BGM khi nắp phong bì hé mở (kể cả khi tắt SFX)
        setEnvelopeSpatialMuffle(false, 1.0);

        if (!canPlayAudio()) return;

        const suite = THEME_SUITES[currentMotionTheme] || THEME_SUITES.bloom;
        const t0 = ctx.currentTime + 0.005;

        // Nhịp rung xúc giác nhẹ nhàng khi con dấu sáp xoay mở
        triggerSubtleHaptic('heartbeat');
        setTimeout(() => {
            if (canPlayAudio()) triggerSubtleHaptic('heartbeat');
        }, 280);

        // --- PHA A (0.00s -> 0.88s): Hợp âm rải Piano & Harp nâng cảm xúc ấm áp (Thay thế hoàn toàn tiếng nhịp tim trầm 110Hz->52Hz cũ!) ---
        const firstNote = suite.pentatonic[0];
        playHarpPluck(n(firstNote), t0 + 0.01, 0.95, 0.12, -0.3, sfxBus);
        setTimeout(() => {
            if (!canPlayAudio()) return;
            const tFollow = ctx.currentTime + 0.005;
            suite.pentatonic.slice(1, 6).forEach((noteName, i) => {
                playHarpPluck(n(noteName), tFollow + i * 0.13, 0.95, 0.11 + i * 0.01, (i - 2) * 0.2, sfxBus);
            });
            playSilkPaperWhoosh(0.65, 420, 1080, 0.15, 0, 0.05);
        }, 18);

        // --- PHA B (t = 0.88s = WINDUP_END): Nổ Vỡ Phong Ấn Sáp Vàng & Bật Lò Xo Nắp Thư ---
        setTimeout(() => {
            if (!canPlayAudio()) return;
            playWaxSealCrack();
            playSilkPaperWhoosh(0.32, 380, 920, 0.20, 0, 0.02);
        }, 870);

        // --- PHA C (t = 0.98s = EXTRACT_START): Phun Trào Vật Lý Từ Miệng Túi & Rút Thiệp 3D (0.98s -> 2.32s) ---
        setTimeout(() => {
            if (!canPlayAudio()) return;
            // Tiếng lá thư giấy mỹ thuật trượt êm qua miệng túi lụa suốt 1.25s + nốt Harp đầu tiên
            playSilkPaperWhoosh(1.18, 360, 1080, 0.22, 0, 0);
            if (suite.revealChord.length > 0) {
                playHarpPluck(n(suite.revealChord[0]), ctx.currentTime + 0.005, 1.95, 0.15, -0.4, sfxBus);
            }
            // Rải các nốt Harp còn lại ở nhịp kế tiếp để nhường trọn frame phun trào t=0.98s cho đồ họa 3D
            setTimeout(() => {
                if (!canPlayAudio()) return;
                const tChord = ctx.currentTime + 0.005;
                for (let idx = 1; idx < suite.revealChord.length; idx++) {
                    const pan = ((idx / Math.max(1, suite.revealChord.length - 1)) - 0.5) * 0.75;
                    playHarpPluck(n(suite.revealChord[idx]), tChord + (idx - 1) * 0.065 + 0.035, 1.95, 0.15, pan, sfxBus);
                }
            }, 26);
        }, 980);

        // --- PHA D (t = 2.32s = EXTRACT_END -> 2.94s = PRESENT_END): Mở Rộng Tấm Thiệp Ra Giữa Sân Khấu ---
        setTimeout(() => {
            if (!canPlayAudio()) return;
            playSilkPaperWhoosh(0.45, 720, 480, 0.15, 0, 0);
            const now2 = ctx.currentTime + 0.02;
            playWarmPadChord(suite.bars[0].pad, now2, 2.6, 0.035, sfxBus);
            suite.pentatonic.slice(2, 7).forEach((noteName, idx) => {
                playMelodyNote(n(noteName), now2 + idx * 0.06, 1.25, 0.14, suite.leadStyle, (idx - 2) * 0.22, sfxBus);
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

        // 1. Nút Nhạc Nền (BGM) độc lập
        const bgmBtn = document.createElement('button');
        bgmBtn.type = 'button';
        bgmBtn.id = 'luxury-bgm-toggle';
        bgmBtn.className = 'luxury-audio-btn luxury-bgm-btn' + (isBgmMuted ? ' is-muted' : ' is-playing');
        bgmBtn.setAttribute('aria-pressed', String(!isBgmMuted));
        bgmBtn.setAttribute('aria-label', isBgmMuted ? 'Bật nhạc nền' : 'Tắt nhạc nền');
        bgmBtn.setAttribute('title', isBgmMuted ? 'Bật nhạc nền giao hưởng' : 'Tắt nhạc nền');
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

        // 2. Nút Âm Thanh Hiệu Ứng (SFX & Rung Tinh Tế) độc lập
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

        // Cập nhật lại đo đạc khung thiệp nếu đang ở Bước 2 hoặc Bước 3
        try {
            window.dispatchEvent(new Event('resize'));
        } catch (_) {}
    }

    function updateBgmButtonUI() {
        if (!bgmToggleBtn) return;
        bgmToggleBtn.classList.toggle('is-muted', isBgmMuted);
        bgmToggleBtn.classList.toggle('is-playing', !isBgmMuted);
        bgmToggleBtn.setAttribute('aria-pressed', String(!isBgmMuted));
        bgmToggleBtn.setAttribute('aria-label', isBgmMuted ? 'Bật nhạc nền' : 'Tắt nhạc nền');
        bgmToggleBtn.setAttribute('title', isBgmMuted ? 'Bật nhạc nền giao hưởng' : 'Tắt nhạc nền');
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

        if (!ctx || !bgmMuteGain) return;
        const now = ctx.currentTime;
        bgmMuteGain.gain.cancelScheduledValues(now);
        if (isBgmMuted) {
            bgmMuteGain.gain.setValueAtTime(Math.max(0.0001, bgmMuteGain.gain.value), now);
            bgmMuteGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
        } else {
            if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
                ctx.resume().catch(() => {});
            }
            bgmMuteGain.gain.setValueAtTime(0.0001, now);
            bgmMuteGain.gain.exponentialRampToValueAtTime(1.0, now + 0.24);
            nextNoteTime = Math.max(ctx.currentTime + 0.05, nextNoteTime);
            startBgmScheduler();
            if (!isSfxMuted) {
                playUiTap('tab', 1);
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
            playUiTap('tab', 3);
        }
    }

    // =========================================================================
    // 9. TỰ ĐỘNG MỞ KHÓA WEB AUDIO TRÊN IOS / ZALO / TELEGRAM & KẾT NỐI SỰ KIỆN
    // =========================================================================
    function unlockAudioOnFirstGesture() {
        const c = ensureAudioContext();
        if (!c) return;

        if (c.state === 'suspended' || c.state === 'interrupted') {
            c.resume().catch(() => {});
        }

        if (!isUnlocked) {
            isUnlocked = true;
            try {
                // Phát 1 xung 1-sample im lặng để mở khóa phần cứng âm thanh iOS Safari ngay ở pointerdown/touchstart
                const silentBuf = c.createBuffer(1, 1, 22050);
                const src = c.createBufferSource();
                src.buffer = silentBuf;
                src.connect(c.destination);
                src.start(0);
            } catch (_) {}
            startBgmScheduler();
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

        // Tự động tạm dừng âm thanh khi người dùng ẩn trình duyệt / chuyển sang ứng dụng khác
        document.addEventListener('visibilitychange', () => {
            isPageHidden = document.hidden;
            if (!ctx) return;
            if (document.hidden) {
                if (ctx.state === 'running') {
                    ctx.suspend().catch(() => {});
                }
            } else if ((!isBgmMuted || !isSfxMuted) && isUnlocked) {
                ctx.resume().then(() => {
                    nextNoteTime = ctx.currentTime + 0.08;
                }).catch(() => {});
            }
        });

        // Gắn âm thanh tự động cho toàn bộ các nút tương tác UI thông qua Event Delegation
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (!target || typeof target.closest !== 'function') return;

            // Bỏ qua cụm 2 nút bật/tắt âm thanh hoặc con dấu sáp (đã có âm thanh riêng)
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

    // Khởi tạo giao diện & sự kiện
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            createFloatingAudioCluster();
            bindGlobalInteractionSounds();
        });
    } else {
        createFloatingAudioCluster();
        bindGlobalInteractionSounds();
    }

    // Xuất API toàn cục để intro.js, script.js, wish-bloom.js và director-3d.js gọi trực tiếp
    window.CardAudio = {
        unlock: unlockAudioOnFirstGesture,
        setMotionTheme(motionId) {
            if (motionId && THEME_SUITES[motionId] && currentMotionTheme !== motionId) {
                currentMotionTheme = motionId;
                currentStep = 0;
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
