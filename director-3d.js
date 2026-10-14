// Danh sách 6 Hiệu ứng 3D Motion khi mở bì thiệp
const MOTION_EFFECTS_CONFIG = {
    bloom: {
        id: 'bloom',
        shortLabel: '🌺 Hoa Trà',
        fullLabel: '🌺 Đại Hoa Trà 3D',
        badge: '🌺 HIỆU ỨNG ĐẠI HOA TRÀ 3D',
        revealClass: 'reveal-playing',
        veilBg: 'radial-gradient(circle at center, rgba(255,246,250,0.97) 0%, rgba(253,214,229,0.9) 24%, rgba(182,236,216,0.82) 52%, rgba(15,123,95,0.28) 74%, transparent 90%)',
        orbs: ['🌸', '✦', '✿', '✦', '🌸']
    },
    butterflies: {
        id: 'butterflies',
        shortLabel: '🦋 Hồ Điệp',
        fullLabel: '🦋 Vũ Điệu Hồ Điệp 3D',
        badge: '🦋 VŨ ĐIỆU HỒ ĐIỆP ÁNH KIM 3D',
        revealClass: 'reveal-butterflies',
        veilBg: 'radial-gradient(circle at center, rgba(255,252,235,0.96) 0%, rgba(255,228,168,0.88) 28%, rgba(248,187,208,0.8) 54%, rgba(15,123,95,0.25) 76%, transparent 92%)',
        orbs: ['🦋', '✨', '🦋', '✦', '🌸']
    },
    ribbon: {
        id: 'ribbon',
        shortLabel: '🎀 Nơ Lụa',
        fullLabel: '🎀 Hộp Quà Nơ Lụa 3D',
        badge: '🎀 HỘP QUÀ NƠ LỤA HOÀNG GIA 3D',
        revealClass: 'reveal-ribbon',
        veilBg: 'radial-gradient(circle at center, rgba(255,245,248,0.97) 0%, rgba(248,187,208,0.9) 28%, rgba(255,236,179,0.82) 54%, rgba(180,45,95,0.26) 76%, transparent 92%)',
        orbs: ['🎀', '🦪', '✦', '✨', '🌸']
    },
    galaxy: {
        id: 'galaxy',
        shortLabel: '🌹 Hồng Pháp',
        fullLabel: '🌹 Vườn Hồng Pháp 3D',
        badge: '🌹 VƯỜN HỒNG PHÁP & SƯƠNG MAI 3D',
        revealClass: 'reveal-galaxy',
        veilBg: 'radial-gradient(circle at center, rgba(255,245,247,0.97) 0%, rgba(254,205,211,0.92) 28%, rgba(251,113,133,0.84) 54%, rgba(159,18,57,0.30) 76%, transparent 92%)',
        orbs: ['🌹', '🌸', '✨', '🌷', '✦']
    },
    sakura: {
        id: 'sakura',
        shortLabel: '🌸 Anh Đào',
        fullLabel: '🌸 Cơn Lốc Anh Đào 3D',
        badge: '🌸 CƠN LỐC HOA ANH ĐÀO 3D',
        revealClass: 'reveal-sakura',
        veilBg: 'radial-gradient(circle at center, rgba(255,248,251,0.97) 0%, rgba(255,196,214,0.92) 30%, rgba(255,228,238,0.84) 56%, rgba(216,75,126,0.26) 76%, transparent 92%)',
        orbs: ['🌸', '💮', '✿', '🌸', '✨']
    },
    hearts: {
        id: 'hearts',
        shortLabel: '🌷 Hoa Tulip',
        fullLabel: '🌷 Vườn Tulip Nắng Mai 3D',
        badge: '🌷 HOA TULIP NẮNG MAI & PHẤN VÀNG 3D',
        revealClass: 'reveal-hearts',
        veilBg: 'radial-gradient(circle at center, rgba(255,253,245,0.97) 0%, rgba(255,224,189,0.92) 28%, rgba(255,154,162,0.84) 54%, rgba(212,115,65,0.28) 76%, transparent 92%)',
        orbs: ['🌷', '🌼', '✨', '🌸', '✦']
    }
};

const MOTION_KEYS_ORDER = ['bloom', 'butterflies', 'ribbon', 'galaxy', 'sakura', 'hearts'];

window.currentMotionEffect = 'bloom';
window.isEnvelopeGiftMode = false;      // true khi đang ở màn hình mở phong bì 3D của người nhận hoặc xem thử
window.isRecipientCardLinkMode = false; // true khi mở trang từ đường link ?card=...

let customLinkTitle = '';
let cachedTelegramFileId = null;
let cachedTelegramMsgId = null;
let isCardCanvasDirtyForTelegram = true;
let activeTelegramUploadPromise = null;
let recipientResolvedImgUrl = '';
let recipientCachedBlob = null;
let recipientCardMeta = null;

window.markCardCanvasDirty = function () {
    isCardCanvasDirtyForTelegram = true;
    cachedTelegramFileId = null;
    cachedTelegramMsgId = null;
};

// ====== 1. ĐỒNG BỘ MÀU SẮC PHONG BÌ 3D THEO TÔNG MÀU THIỆP ĐÃ CHỌN ======
const ENVELOPE_THEME_PALETTES = {
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
    }
};

function setGradientStops(gradId, colors) {
    const grad = document.getElementById(gradId);
    if (!grad || !colors) return;
    const stops = grad.querySelectorAll('stop');
    colors.forEach((c, idx) => {
        if (stops[idx]) stops[idx].setAttribute('stop-color', c);
    });
}

function applyEnvelopeThemeColors(themeKey) {
    const pal = ENVELOPE_THEME_PALETTES[themeKey] || ENVELOPE_THEME_PALETTES.emerald;
    // Đồng bộ cho cả phong bì Bước 1 và Phong bì Vật lý 3D Hợp nhất (#u3d-envelope-stage)
    setGradientStops('envBackGrad', pal.back);
    setGradientStops('pocketLeftGrad', pal.pocketL);
    setGradientStops('pocketRightGrad', pal.pocketR);
    setGradientStops('pocketBottomGrad', pal.pocketB);
    setGradientStops('topFlapGrad', pal.topFlap);
    setGradientStops('envLiningGrad', pal.lining);

    setGradientStops('u3dBackGrad', pal.back);
    setGradientStops('u3dLiningGrad', pal.lining);
    setGradientStops('u3dPocketLeftGrad', [pal.pocketL[0], pal.pocketL[2]]);
    setGradientStops('u3dPocketRightGrad', [pal.pocketR[0], pal.pocketR[2]]);
    setGradientStops('u3dPocketBottomGrad', pal.pocketB);
    setGradientStops('u3dFlapOuterGrad', pal.topFlap);

    const u3dStage = document.getElementById('u3d-envelope-stage');
    if (u3dStage) {
        u3dStage.setAttribute('data-theme', themeKey || 'emerald');
    }
}

// ====== 2. ĐỘNG CƠ VẬT LÝ 3D 60FPS HỢP NHẤT: MỞ BÌ THƯ + PHUN TRÀO TỪ TÚI + RÚT THIỆP BAY 3D ======

function getSealEmblemSVG(motionId) {
    if (motionId === 'butterflies') {
        return `
            <svg viewBox="-60 -60 120 120" width="92" height="92">
                <defs>
                    <radialGradient id="sWaxBf" cx="35%" cy="30%" r="70%">
                        <stop offset="0%" stop-color="#ffe89e"/>
                        <stop offset="50%" stop-color="#d4941c"/>
                        <stop offset="100%" stop-color="#6e4304"/>
                    </radialGradient>
                    <linearGradient id="sWingBf" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#fffdf2"/>
                        <stop offset="50%" stop-color="#ffd54f"/>
                        <stop offset="100%" stop-color="#c67c0a"/>
                    </linearGradient>
                </defs>
                <circle cx="0" cy="0" r="42" fill="url(#sWaxBf)" stroke="#fff3b8" stroke-width="2.5"/>
                <circle cx="0" cy="0" r="34" fill="none" stroke="#fff3b8" stroke-width="1.2" stroke-dasharray="4 3"/>
                <path d="M-2,0 C-18,-28 -44,-24 -38,2 C-34,16 -14,14 -2,4 Z" fill="url(#sWingBf)" stroke="#7a4905" stroke-width="1.2"/>
                <path d="M-2,4 C-22,10 -32,28 -20,34 C-10,38 -4,22 -2,8 Z" fill="url(#sWingBf)" stroke="#7a4905" stroke-width="1.2"/>
                <path d="M2,0 C18,-28 44,-24 38,2 C34,16 14,14 2,4 Z" fill="url(#sWingBf)" stroke="#7a4905" stroke-width="1.2"/>
                <path d="M2,4 C22,10 32,28 20,34 C10,38 4,22 2,8 Z" fill="url(#sWingBf)" stroke="#7a4905" stroke-width="1.2"/>
                <rect x="-2.2" y="-14" width="4.4" height="28" rx="2.2" fill="#523002"/>
            </svg>`;
    }
    if (motionId === 'ribbon') {
        return `
            <svg viewBox="-65 -65 130 130" width="98" height="98">
                <defs>
                    <linearGradient id="sBowG" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#ff9ebb"/>
                        <stop offset="50%" stop-color="#d82b68"/>
                        <stop offset="100%" stop-color="#7c0d36"/>
                    </linearGradient>
                    <radialGradient id="sPearlG" cx="35%" cy="30%" r="65%">
                        <stop offset="0%" stop-color="#ffffff"/>
                        <stop offset="60%" stop-color="#fff1c2"/>
                        <stop offset="100%" stop-color="#c98f1e"/>
                    </radialGradient>
                </defs>
                <path d="M-8,8 C-24,32 -38,52 -46,62 L-24,54 L-16,64 C-8,42 -4,24 0,10 Z" fill="url(#sBowG)" stroke="#fbe298" stroke-width="2"/>
                <path d="M8,8 C24,32 38,52 46,62 L24,54 L16,64 C8,42 4,24 0,10 Z" fill="url(#sBowG)" stroke="#fbe298" stroke-width="2"/>
                <path d="M0,0 C-26,-36 -60,-30 -58,4 C-56,34 -24,26 0,4 Z" fill="url(#sBowG)" stroke="#fbe298" stroke-width="2.4"/>
                <path d="M0,0 C26,-36 60,-30 58,4 C56,34 24,26 0,4 Z" fill="url(#sBowG)" stroke="#fbe298" stroke-width="2.4"/>
                <circle cx="0" cy="2" r="14" fill="url(#sPearlG)" stroke="#ffffff" stroke-width="2"/>
            </svg>`;
    }
    if (motionId === 'galaxy') {
        // 🌹 Hồng Pháp: Ấn sáp Vàng 24K & Đỏ Ruby chạm nổi Đại Đóa Hồng Nhung Pháp Centifolia Kèm Lá Vàng Kim
        return `
            <svg viewBox="-60 -60 120 120" width="92" height="92">
                <defs>
                    <radialGradient id="sRoseWax" cx="34%" cy="28%" r="72%">
                        <stop offset="0%" stop-color="#ffc1d3"/>
                        <stop offset="42%" stop-color="#be123c"/>
                        <stop offset="82%" stop-color="#881337"/>
                        <stop offset="100%" stop-color="#3b0414"/>
                    </radialGradient>
                    <linearGradient id="sRosePetalOuter" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#fff1f2"/>
                        <stop offset="48%" stop-color="#fb7185"/>
                        <stop offset="100%" stop-color="#9f1239"/>
                    </linearGradient>
                    <linearGradient id="sRosePetalInner" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#e11d48"/>
                        <stop offset="58%" stop-color="#fda4af"/>
                        <stop offset="100%" stop-color="#fffbeb"/>
                    </linearGradient>
                </defs>
                <circle cx="0" cy="0" r="43" fill="url(#sRoseWax)" stroke="#ffe58f" stroke-width="2.6"/>
                ${[-45, 45, -135, 135].map(d => `
                    <g transform="rotate(${d})">
                        <path d="M0,-24 C-10,-32 -8,-41 0,-43 C8,-41 10,-32 0,-24 Z" fill="#ffd54f" opacity="0.9"/>
                    </g>
                `).join('')}
                ${[0, 45, 90, 135, 180, 225, 270, 315].map(d => `
                    <g transform="rotate(${d})">
                        <path d="M0,4 C-15,-6 -18,-28 0,-33 C18,-28 15,-6 0,4 Z" fill="url(#sRosePetalOuter)" stroke="#ffe58f" stroke-width="1.05"/>
                    </g>
                `).join('')}
                ${[22.5, 82.5, 142.5, 202.5, 262.5, 322.5].map(d => `
                    <g transform="rotate(${d})">
                        <path d="M0,2 C-11,-5 -13,-20 0,-23 C13,-20 11,-5 0,2 Z" fill="url(#sRosePetalInner)" stroke="#fde68a" stroke-width="0.95"/>
                    </g>
                `).join('')}
                ${[0, 90, 180, 270].map(d => `
                    <g transform="rotate(${d + 15})">
                        <path d="M0,1 C-7,-4 -8,-12 0,-14 C8,-12 7,-4 0,1 Z" fill="#fff1f2" stroke="#f59e0b" stroke-width="0.85"/>
                    </g>
                `).join('')}
                <circle cx="0" cy="0" r="5.2" fill="#ffe58f" stroke="#9f1239" stroke-width="1.1"/>
            </svg>`;
    }
    if (motionId === 'sakura') {
        return `
            <svg viewBox="-60 -60 120 120" width="92" height="92">
                <defs>
                    <radialGradient id="sSakG" cx="35%" cy="30%" r="70%">
                        <stop offset="0%" stop-color="#ffdbe6"/>
                        <stop offset="55%" stop-color="#e0487b"/>
                        <stop offset="100%" stop-color="#7c1438"/>
                    </radialGradient>
                </defs>
                <circle cx="0" cy="0" r="42" fill="url(#sSakG)" stroke="#ffe799" stroke-width="2.5"/>
                ${[0, 72, 144, 216, 288].map(d => `
                    <g transform="rotate(${d})">
                        <path d="M0,0 C-11,-10 -14,-28 -4,-34 L0,-29 L4,-34 C14,-28 11,-10 0,0 Z" fill="#fff5f8" stroke="#f5c242" stroke-width="1.1"/>
                    </g>
                `).join('')}
                <circle cx="0" cy="0" r="7" fill="#f5c242"/>
            </svg>`;
    }
    if (motionId === 'hearts') {
        // 🌷 Hoa Tulip: Ấn sáp Hoàng Kim & Hồng Cam Đào chạm nổi Bó Hoa Tulip Hoàng Gia Nắng Mai
        return `
            <svg viewBox="-60 -60 120 120" width="92" height="92">
                <defs>
                    <radialGradient id="sTulipGold" cx="35%" cy="28%" r="70%">
                        <stop offset="0%" stop-color="#fff9db"/>
                        <stop offset="45%" stop-color="#e5a93b"/>
                        <stop offset="82%" stop-color="#9e580b"/>
                        <stop offset="100%" stop-color="#4f2402"/>
                    </radialGradient>
                    <linearGradient id="sTulipCenter" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#be123c"/>
                        <stop offset="48%" stop-color="#fb7185"/>
                        <stop offset="85%" stop-color="#fde68a"/>
                        <stop offset="100%" stop-color="#ffffff"/>
                    </linearGradient>
                    <linearGradient id="sTulipSide" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#9f1239"/>
                        <stop offset="55%" stop-color="#fda4af"/>
                        <stop offset="100%" stop-color="#fffbeb"/>
                    </linearGradient>
                </defs>
                <circle cx="0" cy="0" r="43" fill="url(#sTulipGold)" stroke="#fff5c0" stroke-width="2.6"/>
                <path d="M0,12 L0,33" stroke="#fff3b8" stroke-width="3.2" stroke-linecap="round"/>
                <path d="M0,30 C-18,26 -30,8 -22,-10 C-12,4 -4,18 0,28 Z" fill="#fde68a" stroke="#b45309" stroke-width="1"/>
                <path d="M0,30 C18,26 30,8 22,-10 C12,4 4,18 0,28 Z" fill="#fde68a" stroke="#b45309" stroke-width="1"/>
                <path d="M-4,10 C-24,6 -28,-16 -14,-30 C-5,-20 -2,-4 -4,10 Z" fill="url(#sTulipSide)" stroke="#fff3b8" stroke-width="1.2"/>
                <path d="M4,10 C24,6 28,-16 14,-30 C5,-20 2,-4 4,10 Z" fill="url(#sTulipSide)" stroke="#fff3b8" stroke-width="1.2"/>
                <path d="M0,14 C-16,10 -18,-18 0,-34 C18,-18 16,10 0,14 Z" fill="url(#sTulipCenter)" stroke="#fff8dc" stroke-width="1.4"/>
                <circle cx="0" cy="-26" r="3.2" fill="#fffbeb"/>
            </svg>`;
    }
    // Mặc định: bloom (Con dấu sáp vàng 24K chạm nổi Đại Hoa Trà)
    return `
        <svg viewBox="-60 -60 120 120" width="92" height="92">
            <defs>
                <radialGradient id="sCamG" cx="34%" cy="28%" r="70%">
                    <stop offset="0%" stop-color="#fff6c4"/>
                    <stop offset="42%" stop-color="#e2a829"/>
                    <stop offset="78%" stop-color="#a86d0c"/>
                    <stop offset="100%" stop-color="#5c3602"/>
                </radialGradient>
            </defs>
            <circle cx="0" cy="0" r="43" fill="url(#sCamG)" stroke="#fff3b8" stroke-width="2.5"/>
            ${[0, 45, 90, 135, 180, 225, 270, 315].map(d => `
                <g transform="rotate(${d})">
                    <path d="M0,0 C-9,-10 -10,-25 0,-30 C10,-25 9,-10 0,0 Z" fill="#fff0f5" fill-opacity="0.9" stroke="#b87d14" stroke-width="1"/>
                </g>
            `).join('')}
            ${[22.5, 82.5, 142.5, 202.5, 262.5, 322.5].map(d => `
                <g transform="rotate(${d})">
                    <path d="M0,0 C-7,-7 -7,-18 0,-21 C7,-18 7,-7 0,0 Z" fill="#ff9ebb" stroke="#fff3b8" stroke-width="0.9"/>
                </g>
            `).join('')}
            <circle cx="0" cy="0" r="6.5" fill="#fff6c4" stroke="#8c5808" stroke-width="1.2"/>
        </svg>`;
}

function buildPocketBloomCamelliaSVG(motionId = 'bloom') {
    if (motionId === 'galaxy') {
        // 🌹 ĐẠI ĐÓA HỒNG NHUNG PHÁP HOÀNG GIA 5 BÔNG & LÁ LỤC BẢO VÀNG KIM NỞ RỘ TỪ MIỆNG PHONG BÌ
        const renderFrenchRoseSVG = (cx, cy, scale, rotDeg) => {
            const leaves = [-52, 52, -135, 135].map(d => `
                <g transform="rotate(${d})">
                    <path d="M0,-20 C-26,-56 -22,-98 0,-112 C22,-98 26,-56 0,-20 Z" fill="url(#pkRoseLeaf)" stroke="#fde68a" stroke-width="1.4"/>
                    <path d="M0,-24 L0,-104" stroke="#fef08a" stroke-width="1.2" opacity="0.8"/>
                </g>
            `).join('');
            const outer = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map(d => `
                <g transform="rotate(${d})">
                    <path d="M0,6 C-34,-18 -40,-82 0,-100 C40,-82 34,-18 0,6 Z" fill="url(#pkRoseOuter)" stroke="#fde68a" stroke-width="1.35"/>
                </g>
            `).join('');
            const mid = [18, 63, 108, 153, 198, 243, 288, 333].map(d => `
                <g transform="rotate(${d})">
                    <path d="M0,4 C-26,-14 -30,-64 0,-78 C30,-64 26,-14 0,4 Z" fill="url(#pkRoseMid)" stroke="#fff3c4" stroke-width="1.2"/>
                </g>
            `).join('');
            const inner = [0, 60, 120, 180, 240, 300].map(d => `
                <g transform="rotate(${d + 12})">
                    <path d="M0,2 C-18,-10 -20,-42 0,-52 C20,-42 18,-10 0,2 Z" fill="url(#pkRoseInner)" stroke="#fbbf24" stroke-width="1.1"/>
                </g>
            `).join('');
            const core = [0, 90, 180, 270].map(d => `
                <g transform="rotate(${d + 35})">
                    <path d="M0,1 C-10,-6 -12,-24 0,-28 C12,-24 10,-6 0,1 Z" fill="#fff1f2" stroke="#f59e0b" stroke-width="1"/>
                </g>
            `).join('');
            return `
                <g transform="translate(${cx}, ${cy}) scale(${scale}) rotate(${rotDeg})">
                    ${leaves}${outer}${mid}${inner}${core}
                    <circle cx="0" cy="0" r="10" fill="#fde047" stroke="#ffffff" stroke-width="1.8"/>
                </g>`;
        };
        return `
            <svg viewBox="-150 -140 300 280" width="100%" height="100%">
                <defs>
                    <linearGradient id="pkRoseLeaf" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#064e3b"/>
                        <stop offset="58%" stop-color="#10b981"/>
                        <stop offset="100%" stop-color="#fde68a"/>
                    </linearGradient>
                    <linearGradient id="pkRoseOuter" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#4c0519"/>
                        <stop offset="45%" stop-color="#be123c"/>
                        <stop offset="82%" stop-color="#fb7185"/>
                        <stop offset="100%" stop-color="#ffe4e6"/>
                    </linearGradient>
                    <linearGradient id="pkRoseMid" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#881337"/>
                        <stop offset="55%" stop-color="#f43f5e"/>
                        <stop offset="90%" stop-color="#fecdd3"/>
                        <stop offset="100%" stop-color="#fff1f2"/>
                    </linearGradient>
                    <linearGradient id="pkRoseInner" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#be123c"/>
                        <stop offset="65%" stop-color="#fda4af"/>
                        <stop offset="100%" stop-color="#fffbeb"/>
                    </linearGradient>
                </defs>
                ${renderFrenchRoseSVG(-68, 12, 0.56, -28)}
                ${renderFrenchRoseSVG(68, 12, 0.56, 28)}
                ${renderFrenchRoseSVG(-38, -28, 0.68, -14)}
                ${renderFrenchRoseSVG(38, -28, 0.68, 14)}
                ${renderFrenchRoseSVG(0, -6, 0.92, 0)}
            </svg>`;
    }
    if (motionId === 'hearts') {
        // 🌷 ĐẠI BÓ HOA TULIP HOÀNG GIA HÀ LAN 5 BÔNG NẮNG MAI KÈM ĐÔI LÁ LỤC BẢO ÁNH KIM
        const leaves = [-58, -32, 32, 58].map((deg, idx) => `
            <g transform="rotate(${deg})">
                <path d="M0,18 C${idx < 2 ? -28 : 28},-18 ${idx < 2 ? -34 : 34},-78 ${idx < 2 ? -10 : 10},-118 C0,-82 4,-32 0,18 Z" fill="url(#pkTulipLeaf)" stroke="#fef08a" stroke-width="1.3"/>
            </g>
        `).join('');
        const tulips = [
            { deg: -46, tx: -18, ty: 6, sc: 0.72 },
            { deg: 46, tx: 18, ty: 6, sc: 0.72 },
            { deg: -22, tx: -8, ty: -8, sc: 0.86 },
            { deg: 22, tx: 8, ty: -8, sc: 0.86 },
            { deg: 0, tx: 0, ty: -18, sc: 1.02 }
        ].map(t => `
            <g transform="translate(${t.tx}, ${t.ty}) rotate(${t.deg}) scale(${t.sc})">
                <path d="M0,26 L0,-12" stroke="#34d399" stroke-width="4.5" stroke-linecap="round"/>
                <path d="M-12,-14 C-24,-44 -20,-78 -6,-96 C2,-78 4,-44 -12,-14 Z" fill="url(#pkTulipBack)" opacity="0.92"/>
                <path d="M12,-14 C24,-44 20,-78 6,-96 C-2,-78 -4,-44 12,-14 Z" fill="url(#pkTulipBack)" opacity="0.92"/>
                <path d="M-4,2 C-30,-8 -36,-58 -16,-88 C-4,-70 -2,-34 -4,2 Z" fill="url(#pkTulipSide)" stroke="#fde68a" stroke-width="1.4"/>
                <path d="M4,2 C30,-8 36,-58 16,-88 C4,-70 2,-34 4,2 Z" fill="url(#pkTulipSide)" stroke="#fde68a" stroke-width="1.4"/>
                <path d="M0,6 C-22,-8 -24,-66 0,-96 C24,-66 22,-8 0,6 Z" fill="url(#pkTulipMid)" stroke="#fffbeb" stroke-width="1.6"/>
                <circle cx="0" cy="-76" r="4.5" fill="#fef08a"/>
            </g>
        `).join('');
        return `
            <svg viewBox="-145 -140 290 280" width="100%" height="100%">
                <defs>
                    <linearGradient id="pkTulipLeaf" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#065f46"/>
                        <stop offset="55%" stop-color="#10b981"/>
                        <stop offset="100%" stop-color="#fde68a"/>
                    </linearGradient>
                    <linearGradient id="pkTulipBack" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#881337"/>
                        <stop offset="65%" stop-color="#f43f5e"/>
                        <stop offset="100%" stop-color="#fde68a"/>
                    </linearGradient>
                    <linearGradient id="pkTulipMid" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#fde047"/>
                        <stop offset="24%" stop-color="#e11d48"/>
                        <stop offset="62%" stop-color="#fb7185"/>
                        <stop offset="90%" stop-color="#fde68a"/>
                        <stop offset="100%" stop-color="#ffffff"/>
                    </linearGradient>
                    <linearGradient id="pkTulipSide" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#be123c"/>
                        <stop offset="58%" stop-color="#fda4af"/>
                        <stop offset="100%" stop-color="#fef3c7"/>
                    </linearGradient>
                </defs>
                ${leaves}
                ${tulips}
                <circle cx="0" cy="12" r="13" fill="#ffd54f" stroke="#ffffff" stroke-width="2"/>
            </svg>`;
    }
    const outer = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map(d => `
        <g transform="rotate(${d})">
            <path d="M0,0 C-26,-28 -30,-84 0,-102 C30,-84 26,-28 0,0 Z" fill="url(#pkCamOuter)" stroke="#f6d57a" stroke-width="1.5"/>
        </g>
    `).join('');
    const mid = [18, 63, 108, 153, 198, 243, 288, 333].map(d => `
        <g transform="rotate(${d})">
            <path d="M0,0 C-20,-22 -22,-64 0,-78 C22,-64 20,-22 0,0 Z" fill="url(#pkCamMid)" stroke="#fff3c4" stroke-width="1.3"/>
        </g>
    `).join('');
    const inner = [0, 60, 120, 180, 240, 300].map(d => `
        <g transform="rotate(${d})">
            <path d="M0,0 C-14,-15 -15,-42 0,-52 C15,-42 14,-15 0,0 Z" fill="#fff9fb" stroke="#f0c45a" stroke-width="1.2"/>
        </g>
    `).join('');
    return `
        <svg viewBox="-115 -115 230 230" width="100%" height="100%">
            <defs>
                <linearGradient id="pkCamOuter" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stop-color="#c92a62"/>
                    <stop offset="55%" stop-color="#f8bbd0"/>
                    <stop offset="100%" stop-color="#ffffff"/>
                </linearGradient>
                <linearGradient id="pkCamMid" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stop-color="#e0487b"/>
                    <stop offset="65%" stop-color="#fde4ec"/>
                    <stop offset="100%" stop-color="#ffffff"/>
                </linearGradient>
            </defs>
            ${outer}${mid}${inner}
            <circle cx="0" cy="0" r="16" fill="#f5c242" stroke="#ffffff" stroke-width="2"/>
        </svg>`;
}

// Trạng thái toàn cục của Đạo diễn Phong Bì Vật Lý 3D Hợp Nhất
let u3dAnimFrameId = null;
let u3dAutoOpenTimerId = null;
let u3dCurrentDirectorState = 'hidden'; // 'hidden' | 'waiting' | 'opening'
let u3dActiveOnComplete = null;
let u3dTriggerOpenFn = null;
let u3dPointerTargetRotX = 0;
let u3dPointerTargetRotY = 0;
let u3dPointerCurRotX = 0;
let u3dPointerCurRotY = 0;

// Gắn sự kiện tương tác nghiêng 3D (Cảm ứng + Con quay hồi chuyển) và chạm mở phong bì trên #u3d-envelope-stage
(function initUnified3DStageEvents() {
    const stage = document.getElementById('u3d-envelope-stage');
    const sealBtn = document.getElementById('u3d-seal-btn');
    const frontRig = document.getElementById('u3d-env-front-rig');
    if (!stage) return;

    // Cho phép con quay hồi chuyển nghiêng nhẹ cả bì thư 3D khi đang chờ mở
    window.applyEnvelopeGyroTilt = (rx, ry) => {
        if (u3dCurrentDirectorState !== 'waiting') return;
        u3dPointerTargetRotX = rx * 0.72;
        u3dPointerTargetRotY = ry * 0.72;
    };

    const handleMove = (clientX, clientY) => {
        if (u3dCurrentDirectorState !== 'waiting') return;
        const vw = window.innerWidth || 1;
        const vh = window.innerHeight || 1;
        const nx = (clientX / vw - 0.5) * 2; // -1 .. 1
        const ny = (clientY / vh - 0.5) * 2; // -1 .. 1
        u3dPointerTargetRotY = nx * 14;
        u3dPointerTargetRotX = -ny * 11;
    };

    stage.addEventListener('pointermove', (e) => {
        handleMove(e.clientX, e.clientY);
    }, { passive: true });

    stage.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches[0]) {
            handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });

    stage.addEventListener('pointerleave', () => {
        u3dPointerTargetRotX = 0;
        u3dPointerTargetRotY = 0;
    });

    // CHỈ KHI ẤN ĐÚNG VÀO CON DẤU SÁP (#u3d-seal-btn) THÌ MỚI MỞ BÌ THƯ!
    const triggerFromSealTap = (e) => {
        if (e) {
            e.stopPropagation();
            if (sealBtn && typeof e.clientX === 'number' && typeof e.clientY === 'number' && (e.clientX !== 0 || e.clientY !== 0)) {
                const rect = sealBtn.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    const cx = rect.left + rect.width * 0.5;
                    const cy = rect.top + rect.height * 0.5;
                    const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
                    const maxRadius = Math.max(rect.width, rect.height) * 0.58;
                    if (dist > maxRadius) return;
                }
            }
        }
        // Kích hoạt quyền cảm biến Con Quay Hồi Chuyển (iOS 13+ yêu cầu gọi trong sự kiện chạm của người dùng)
        if (typeof window.requestCardGyroscopePermission === 'function') {
            window.requestCardGyroscopePermission();
        }
        if (typeof window.recenterCardGyroscope === 'function') {
            window.recenterCardGyroscope();
        }
        if (u3dCurrentDirectorState === 'waiting' && typeof u3dTriggerOpenFn === 'function') {
            u3dTriggerOpenFn();
        }
    };

    sealBtn?.addEventListener('click', triggerFromSealTap);

    // Nếu người dùng bấm ra ngoài con dấu sáp (vào thân bì thư hoặc nền sân khấu) -> Tuyệt đối KHÔNG mở bì thư, mà làm con dấu sáp nảy sáng lấp lánh nhắc người dùng ấn vào sáp!
    stage.addEventListener('click', (e) => {
        if (u3dCurrentDirectorState !== 'waiting') return;
        if (sealBtn && (e.target === sealBtn || sealBtn.contains(e.target))) return;
        const emblem = document.getElementById('u3d-seal-emblem');
        if (emblem) {
            emblem.classList.remove('seal-attention');
            void emblem.offsetWidth;
            emblem.classList.add('seal-attention');
        }
        if (sealBtn && typeof spawnTouchSparkle === 'function') {
            const rect = sealBtn.getBoundingClientRect();
            spawnTouchSparkle(rect.left + rect.width * 0.5, rect.top + rect.height * 0.5, 8);
        }
    });
})();

// ====== BỘ TEXTURE KIM HOÀN & VẬT LIỆU 3D CAO CẤP ĐƯỢC KẾT XUẤT SẴN (PRE-BAKED LUXURY SPRITE ATLAS) ======
// Giúp mọi Cánh Hoa Nhung, Cánh Bướm Khảm Vàng, Ngọc Trai Nam Hải, Kim Cương 57 Giác Cắt, Mây Tinh Vân & Trăng Rằm
// có độ chi tiết vân bề mặt (texture/veins/iridescence/specular) sống động tuyệt đối mà vẫn chạy 60fps mượt mà!
let _u3dLuxuryAtlas = null;
function getU3DLuxurySpriteAtlas() {
    if (_u3dLuxuryAtlas) return _u3dLuxuryAtlas;
    const atlas = {};
    const makeCanvas = (w, h) => {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return { c, ctx: c.getContext('2d') };
    };

    // 1. NGỌC TRAI NAM HẢI XÀ CỪ 3D (Mother-of-Pearl Sphere Texture - 96x96)
    {
        const { c, ctx } = makeCanvas(96, 96);
        const cx = 48, cy = 48, r = 38;
        // Hào quang xà cừ mỏng quanh viên ngọc
        const glow = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 1.22);
        glow.addColorStop(0, 'rgba(255, 244, 214, 0.55)');
        glow.addColorStop(1, 'rgba(255, 244, 214, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.22, 0, Math.PI * 2);
        ctx.fill();

        // Thân ngọc trai đa lớp (Subsurface Scattering: Hồng phấn xà cừ -> Kem hoàng kim -> Bóng phản quang đáy)
        const body = ctx.createRadialGradient(cx - r * 0.32, cy - r * 0.32, r * 0.08, cx, cy, r);
        body.addColorStop(0, '#ffffff');
        body.addColorStop(0.24, '#fff8ea');
        body.addColorStop(0.55, '#f7d9c4');
        body.addColorStop(0.82, '#d9a78c');
        body.addColorStop(0.94, '#b87d6a');
        body.addColorStop(1, '#f3d299'); // Rim light vàng kim ở đáy ngọc
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // Lớp ánh xà cừ ngũ sắc (Iridescent Nacre Sheen)
        const nacre = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        nacre.addColorStop(0, 'rgba(178, 235, 242, 0.26)');
        nacre.addColorStop(0.5, 'rgba(255, 182, 208, 0.28)');
        nacre.addColorStop(1, 'rgba(255, 236, 179, 0.25)');
        ctx.fillStyle = nacre;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.96, 0, Math.PI * 2);
        ctx.fill();

        // Điểm phản광 Studio Specular sắc nét
        ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
        ctx.beginPath();
        ctx.ellipse(cx - r * 0.34, cy - r * 0.36, r * 0.22, r * 0.14, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.beginPath();
        ctx.arc(cx - r * 0.14, cy - r * 0.52, r * 0.06, 0, Math.PI * 2);
        ctx.fill();
        atlas.pearl = c;
    }

    // 2. CÁNH ĐẠI HOA TRÀ NHUNG ĐỎ DÁT GÂN VÀNG 24K + HÀO QUANG BLOOM (Velvet Camellia Petal with HDR Aura - 128x128)
    {
        const { c, ctx } = makeCanvas(128, 128);
        ctx.translate(64, 68);
        const s = 40;
        // Hào quang phát sáng lân tinh mềm quanh cánh hoa (xóa bỏ viền cứng)
        const aura = ctx.createRadialGradient(0, -s * 0.15, s * 0.2, 0, -s * 0.15, s * 1.45);
        aura.addColorStop(0, 'rgba(255, 110, 156, 0.55)');
        aura.addColorStop(0.55, 'rgba(245, 194, 66, 0.22)');
        aura.addColorStop(1, 'rgba(255, 110, 156, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, -s * 0.15, s * 1.45, 0, Math.PI * 2);
        ctx.fill();

        const pGrad = ctx.createRadialGradient(0, s * 0.25, 2, 0, -s * 0.2, s * 1.15);
        pGrad.addColorStop(0, '#880e4f');
        pGrad.addColorStop(0.28, '#d81b60');
        pGrad.addColorStop(0.64, '#ff5c8d');
        pGrad.addColorStop(0.88, '#ffc1d6');
        pGrad.addColorStop(1, '#fff8fb');

        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.52);
        ctx.bezierCurveTo(-s * 0.92, s * 0.12, -s * 0.88, -s * 0.84, 0, -s * 1.02);
        ctx.bezierCurveTo(s * 0.88, -s * 0.84, s * 0.92, s * 0.12, 0, s * 0.52);
        ctx.closePath();
        ctx.fill();

        // Gân cánh hoa nhung ánh kim mềm
        ctx.strokeStyle = 'rgba(255, 240, 190, 0.45)';
        ctx.lineWidth = 1.05;
        for (let v = -3; v <= 3; v++) {
            ctx.beginPath();
            ctx.moveTo(0, s * 0.42);
            ctx.quadraticCurveTo(v * s * 0.18, -s * 0.15, v * s * 0.24, -s * (0.85 - Math.abs(v) * 0.07));
            ctx.stroke();
        }

        // Nhụy sáng vàng kim ở gốc cánh hoa
        const baseGlow = ctx.createRadialGradient(0, s * 0.22, 1, 0, s * 0.22, s * 0.34);
        baseGlow.addColorStop(0, '#ffffff');
        baseGlow.addColorStop(0.4, '#ffe082');
        baseGlow.addColorStop(1, 'rgba(245, 194, 66, 0)');
        ctx.fillStyle = baseGlow;
        ctx.beginPath();
        ctx.arc(0, s * 0.22, s * 0.34, 0, Math.PI * 2);
        ctx.fill();
        atlas.camelliaPetal = c;
    }

    // 3. CÁNH HOA ANH ĐÀO PHA LÊ KYOTO + HÀO QUANG ÁNH TRĂNG (Translucent Sakura Petal Texture - 128x128)
    {
        const { c, ctx } = makeCanvas(128, 128);
        ctx.translate(64, 68);
        const s = 40;
        const aura = ctx.createRadialGradient(0, -s * 0.2, s * 0.15, 0, -s * 0.2, s * 1.4);
        aura.addColorStop(0, 'rgba(255, 182, 210, 0.58)');
        aura.addColorStop(0.6, 'rgba(255, 236, 179, 0.22)');
        aura.addColorStop(1, 'rgba(255, 182, 210, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, -s * 0.2, s * 1.4, 0, Math.PI * 2);
        ctx.fill();

        const sGrad = ctx.createLinearGradient(0, s * 0.5, 0, -s);
        sGrad.addColorStop(0, '#ec407a');
        sGrad.addColorStop(0.32, '#ff80ab');
        sGrad.addColorStop(0.70, '#ffdde8');
        sGrad.addColorStop(1, '#ffffff');

        ctx.fillStyle = sGrad;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.48);
        ctx.bezierCurveTo(-s * 0.78, s * 0.06, -s * 0.88, -s * 0.76, -s * 0.24, -s * 1.0);
        ctx.lineTo(0, -s * 0.74);
        ctx.lineTo(s * 0.24, -s * 1.0);
        ctx.bezierCurveTo(s * 0.88, -s * 0.76, s * 0.78, s * 0.06, 0, s * 0.48);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
        ctx.lineWidth = 0.95;
        for (let v = -2; v <= 2; v++) {
            if (v === 0) continue;
            ctx.beginPath();
            ctx.moveTo(0, s * 0.36);
            ctx.quadraticCurveTo(v * s * 0.16, -s * 0.2, v * s * 0.22, -s * 0.78);
            ctx.stroke();
        }
        atlas.sakuraPetal = c;
    }

    // 4. CÁNH HỒ ĐIỆP ÁNH SÁNG NGUYÊN TỐ (Genshin Crystalfly / Luminescent Filigree Butterfly Wing - 148x148)
    const buildButterflyWingSprite = (isGold) => {
        const { c, ctx } = makeCanvas(148, 148);
        ctx.translate(20, 72);
        const s = 48;

        // Hào quang nguyên tố phát sáng quanh cánh bướm (như Tinh Điệp Crystalfly trong Genshin)
        const wingAura = ctx.createRadialGradient(s * 0.45, -s * 0.05, 4, s * 0.45, -s * 0.05, s * 1.25);
        wingAura.addColorStop(0, isGold ? 'rgba(255, 230, 102, 0.62)' : 'rgba(255, 128, 171, 0.58)');
        wingAura.addColorStop(0.55, isGold ? 'rgba(52, 211, 153, 0.28)' : 'rgba(255, 213, 79, 0.25)');
        wingAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = wingAura;
        ctx.beginPath();
        ctx.arc(s * 0.45, -s * 0.05, s * 1.25, 0, Math.PI * 2);
        ctx.fill();

        // Cánh trên (Forewing)
        const fg = ctx.createLinearGradient(0, -s, s * 1.1, s * 0.2);
        if (isGold) {
            fg.addColorStop(0, '#ffffff');
            fg.addColorStop(0.28, '#fff08a');
            fg.addColorStop(0.65, '#fbbf24');
            fg.addColorStop(0.90, '#10b981');
            fg.addColorStop(1, '#a7f3d0');
        } else {
            fg.addColorStop(0, '#ffffff');
            fg.addColorStop(0.30, '#ff9ebb');
            fg.addColorStop(0.68, '#ec407a');
            fg.addColorStop(0.90, '#f59e0b');
            fg.addColorStop(1, '#fff3b0');
        }
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.08);
        ctx.bezierCurveTo(s * 0.58, -s * 1.02, s * 1.22, -s * 0.58, s * 0.92, s * 0.08);
        ctx.bezierCurveTo(s * 0.68, s * 0.28, s * 0.28, s * 0.16, 0, s * 0.05);
        ctx.closePath();
        ctx.fill();

        // Cánh dưới (Hindwing có đuôi ánh sáng)
        const hg = ctx.createRadialGradient(s * 0.15, s * 0.15, 2, s * 0.35, s * 0.45, s * 0.85);
        if (isGold) {
            hg.addColorStop(0, '#ffffff');
            hg.addColorStop(0.45, '#fde047');
            hg.addColorStop(0.82, '#34d399');
            hg.addColorStop(1, '#fef08a');
        } else {
            hg.addColorStop(0, '#ffffff');
            hg.addColorStop(0.5, '#f472b6');
            hg.addColorStop(0.85, '#fbbf24');
            hg.addColorStop(1, '#ffe4ef');
        }
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.05);
        ctx.bezierCurveTo(s * 0.65, s * 0.22, s * 0.84, s * 0.88, s * 0.38, s * 0.96);
        ctx.bezierCurveTo(s * 0.14, s * 0.98, s * 0.04, s * 0.48, 0, s * 0.2);
        ctx.closePath();
        ctx.fill();

        // Mạch cánh ánh sáng nguyên tố (Luminous Elemental Veins)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
        ctx.lineWidth = 1.3;
        const veins = [
            [s * 0.42, -s * 0.45, s * 0.82, -s * 0.35],
            [s * 0.48, -s * 0.22, s * 0.86, -s * 0.06],
            [s * 0.35, -s * 0.08, s * 0.72, s * 0.12],
            [s * 0.32, s * 0.28, s * 0.60, s * 0.58],
            [s * 0.18, s * 0.38, s * 0.36, s * 0.84]
        ];
        for (let v = 0; v < veins.length; v++) {
            const [cx1, cy1, ex, ey] = veins[v];
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(cx1, cy1, ex, ey);
            ctx.stroke();
        }

        // Đốm ngọc phát sáng dọc viền cánh
        ctx.fillStyle = '#ffffff';
        const spots = [
            [s * 0.82, -s * 0.42, 2.4],
            [s * 0.88, -s * 0.20, 2.7],
            [s * 0.82, 0.00, 2.2],
            [s * 0.58, s * 0.54, 2.4],
            [s * 0.38, s * 0.78, 2.6]
        ];
        for (let i = 0; i < spots.length; i++) {
            ctx.beginPath();
            ctx.arc(spots[i][0], spots[i][1], spots[i][2], 0, Math.PI * 2);
            ctx.fill();
        }
        return c;
    };
    atlas.butterflyWingGold = buildButterflyWingSprite(true);
    atlas.butterflyWingRose = buildButterflyWingSprite(false);

    // 5. ĐẠI ĐÓA HỒNG NHUNG PHÁP CENTIFOLIA 26 CÁNH XOÁY 3D & CÁNH HỒNG SƯƠNG MAI (French Velvet Rose Bloom 196x196 & Petal 160x160)
    {
        // 5A. Cánh Hoa Hồng Nhung Pháp 3D khum lòng chảo, viền cuộn Champagne Vàng Kim & 2 giọt sương mai pha lê
        const { c: rpC, ctx: rpCtx } = makeCanvas(160, 160);
        rpCtx.translate(80, 84);
        const s = 48;
        const rAura = rpCtx.createRadialGradient(0, -s * 0.12, s * 0.12, 0, -s * 0.12, s * 1.48);
        rAura.addColorStop(0, 'rgba(244, 63, 94, 0.56)');
        rAura.addColorStop(0.55, 'rgba(251, 191, 36, 0.24)');
        rAura.addColorStop(1, 'rgba(244, 63, 94, 0)');
        rpCtx.fillStyle = rAura;
        rpCtx.beginPath();
        rpCtx.arc(0, -s * 0.12, s * 1.48, 0, Math.PI * 2);
        rpCtx.fill();

        // Thân cánh hồng nhung đỏ Bordeaux -> Đỏ Ruby -> Hồng Phấn -> Mép Vàng Champagne
        const rpGrad = rpCtx.createRadialGradient(0, s * 0.34, 2, 0, -s * 0.22, s * 1.18);
        rpGrad.addColorStop(0, '#3b0414');
        rpGrad.addColorStop(0.24, '#881337');
        rpGrad.addColorStop(0.54, '#be123c');
        rpGrad.addColorStop(0.78, '#f43f5e');
        rpGrad.addColorStop(0.92, '#fda4af');
        rpGrad.addColorStop(1, '#fff1f2');

        rpCtx.fillStyle = rpGrad;
        rpCtx.beginPath();
        rpCtx.moveTo(0, s * 0.58);
        rpCtx.bezierCurveTo(-s * 1.12, s * 0.22, -s * 1.16, -s * 0.74, -s * 0.32, -s * 0.98);
        rpCtx.quadraticCurveTo(0, -s * 0.86, s * 0.32, -s * 0.98);
        rpCtx.bezierCurveTo(s * 1.16, -s * 0.74, s * 1.12, s * 0.22, 0, s * 0.58);
        rpCtx.closePath();
        rpCtx.fill();

        // Lòng khum 3D Subsurface Scattering ấm ở tâm cánh hồng
        const innerBowl = rpCtx.createRadialGradient(0, -s * 0.08, 2, 0, -s * 0.08, s * 0.68);
        innerBowl.addColorStop(0, 'rgba(136, 19, 55, 0.55)');
        innerBowl.addColorStop(0.65, 'rgba(225, 29, 72, 0.18)');
        innerBowl.addColorStop(1, 'rgba(255, 228, 230, 0)');
        rpCtx.fillStyle = innerBowl;
        rpCtx.fill();

        // Gân lụa mịn tỏa từ cuống cánh hoa
        rpCtx.strokeStyle = 'rgba(255, 228, 230, 0.32)';
        rpCtx.lineWidth = 0.95;
        for (let v = -2; v <= 2; v++) {
            rpCtx.beginPath();
            rpCtx.moveTo(0, s * 0.48);
            rpCtx.quadraticCurveTo(v * s * 0.22, -s * 0.1, v * s * 0.28, -s * (0.82 - Math.abs(v) * 0.08));
            rpCtx.stroke();
        }

        // Mép cánh uốn cong (Curled Velvet Lip) bắt sáng vàng hồng 24K
        rpCtx.strokeStyle = 'rgba(255, 243, 199, 0.88)';
        rpCtx.lineWidth = 1.6;
        rpCtx.beginPath();
        rpCtx.moveTo(-s * 0.86, -s * 0.32);
        rpCtx.bezierCurveTo(-s * 0.78, -s * 0.84, -s * 0.28, -s * 1.02, 0, -s * 0.90);
        rpCtx.bezierCurveTo(s * 0.28, -s * 1.02, s * 0.78, -s * 0.84, s * 0.86, -s * 0.32);
        rpCtx.stroke();

        // 2 Giọt sương mai pha lê 3D có bóng khúc xạ và điểm lóe sáng
        [
            { dx: s * 0.32, dy: -s * 0.36, dr: 4.2 },
            { dx: -s * 0.24, dy: -s * 0.12, dr: 2.8 }
        ].forEach(dew => {
            rpCtx.fillStyle = 'rgba(76, 5, 25, 0.42)';
            rpCtx.beginPath();
            rpCtx.arc(dew.dx + 1.2, dew.dy + 1.4, dew.dr, 0, Math.PI * 2);
            rpCtx.fill();

            const dGrad = rpCtx.createRadialGradient(dew.dx - dew.dr * 0.3, dew.dy - dew.dr * 0.3, 0.4, dew.dx, dew.dy, dew.dr);
            dGrad.addColorStop(0, '#ffffff');
            dGrad.addColorStop(0.55, '#fef08a');
            dGrad.addColorStop(1, 'rgba(251, 113, 133, 0.65)');
            rpCtx.fillStyle = dGrad;
            rpCtx.beginPath();
            rpCtx.arc(dew.dx, dew.dy, dew.dr, 0, Math.PI * 2);
            rpCtx.fill();
        });
        atlas.rosePetal = rpC;

        // 5B. Đại Đóa Hồng Nhung Pháp 3D Xoáy Đa Tầng Kèm 4 Lá Lục Bảo Vàng Kim (Grand 3D French Centifolia Rose - 196x196)
        const { c: rbC, ctx: rbCtx } = makeCanvas(196, 196);
        rbCtx.translate(98, 98);
        const bs = 60;
        const bGlow = rbCtx.createRadialGradient(0, 0, bs * 0.18, 0, 0, bs * 1.56);
        bGlow.addColorStop(0, 'rgba(255, 241, 242, 0.85)');
        bGlow.addColorStop(0.45, 'rgba(225, 29, 72, 0.44)');
        bGlow.addColorStop(0.76, 'rgba(251, 191, 36, 0.22)');
        bGlow.addColorStop(1, 'rgba(225, 29, 72, 0)');
        rbCtx.fillStyle = bGlow;
        rbCtx.beginPath();
        rbCtx.arc(0, 0, bs * 1.56, 0, Math.PI * 2);
        rbCtx.fill();

        // Đài lá Hồng Pháp Lục Bảo viền Vàng 24K (4 lá vươn nhẹ ở 4 góc tạo khối 3D hoành tráng)
        for (let l = 0; l < 4; l++) {
            rbCtx.save();
            rbCtx.rotate((l / 4) * Math.PI * 2 + Math.PI / 4);
            const lGrad = rbCtx.createLinearGradient(0, -bs * 0.3, 0, -bs * 1.24);
            lGrad.addColorStop(0, '#064e3b');
            lGrad.addColorStop(0.58, '#059669');
            lGrad.addColorStop(0.88, '#34d399');
            lGrad.addColorStop(1, '#fde68a');
            rbCtx.fillStyle = lGrad;
            rbCtx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
            rbCtx.lineWidth = 1.2;
            rbCtx.beginPath();
            rbCtx.moveTo(0, -bs * 0.28);
            rbCtx.bezierCurveTo(-bs * 0.34, -bs * 0.62, -bs * 0.28, -bs * 1.06, 0, -bs * 1.24);
            rbCtx.bezierCurveTo(bs * 0.28, -bs * 1.06, bs * 0.34, -bs * 0.62, 0, -bs * 0.28);
            rbCtx.closePath();
            rbCtx.fill();
            rbCtx.stroke();

            // Sống lá ánh kim
            rbCtx.strokeStyle = 'rgba(255, 251, 235, 0.72)';
            rbCtx.lineWidth = 0.9;
            rbCtx.beginPath();
            rbCtx.moveTo(0, -bs * 0.35);
            rbCtx.lineTo(0, -bs * 1.15);
            rbCtx.stroke();
            rbCtx.restore();
        }

        // Tầng 1 (Outer Guard Petals): 8 cánh nhung đỏ Bordeaux - Ruby lớn uốn cong mép
        for (let i = 0; i < 8; i++) {
            rbCtx.save();
            rbCtx.rotate((i / 8) * Math.PI * 2);
            const g1 = rbCtx.createRadialGradient(0, -bs * 0.15, 4, 0, -bs * 0.52, bs * 0.95);
            g1.addColorStop(0, '#3b0414');
            g1.addColorStop(0.42, '#881337');
            g1.addColorStop(0.76, '#e11d48');
            g1.addColorStop(0.94, '#fb7185');
            g1.addColorStop(1, '#ffe4e6');
            rbCtx.fillStyle = g1;
            rbCtx.strokeStyle = 'rgba(254, 240, 138, 0.78)';
            rbCtx.lineWidth = 1.25;
            rbCtx.beginPath();
            rbCtx.moveTo(0, 8);
            rbCtx.bezierCurveTo(-bs * 0.68, -bs * 0.12, -bs * 0.74, -bs * 0.88, -bs * 0.18, -bs * 1.02);
            rbCtx.quadraticCurveTo(0, -bs * 0.94, bs * 0.18, -bs * 1.02);
            rbCtx.bezierCurveTo(bs * 0.74, -bs * 0.88, bs * 0.68, -bs * 0.12, 0, 8);
            rbCtx.closePath();
            rbCtx.fill();
            rbCtx.stroke();
            rbCtx.restore();
        }

        // Tầng 2 (Mid Cupped Petals): 7 cánh hồng nhung xoáy lệch góc tạo độ sâu 3D dày dặn
        for (let i = 0; i < 7; i++) {
            rbCtx.save();
            rbCtx.rotate((i / 7) * Math.PI * 2 + 0.28);
            const ms = bs * 0.78;
            const g2 = rbCtx.createLinearGradient(0, 6, 0, -ms);
            g2.addColorStop(0, '#4c0519');
            g2.addColorStop(0.38, '#9f1239');
            g2.addColorStop(0.74, '#f43f5e');
            g2.addColorStop(0.92, '#fda4af');
            g2.addColorStop(1, '#fff1f2');
            rbCtx.fillStyle = g2;
            rbCtx.strokeStyle = 'rgba(255, 248, 220, 0.86)';
            rbCtx.lineWidth = 1.15;
            rbCtx.beginPath();
            rbCtx.moveTo(0, 6);
            rbCtx.bezierCurveTo(-ms * 0.66, -ms * 0.10, -ms * 0.70, -ms * 0.88, 0, -ms);
            rbCtx.bezierCurveTo(ms * 0.70, -ms * 0.88, ms * 0.66, -ms * 0.10, 0, 6);
            rbCtx.closePath();
            rbCtx.fill();
            rbCtx.stroke();
            rbCtx.restore();
        }

        // Tầng 3 (Inner Velvet Whorl): 6 cánh khum tròn ôm lấy tâm hoa
        for (let i = 0; i < 6; i++) {
            rbCtx.save();
            rbCtx.rotate((i / 6) * Math.PI * 2 + 0.55);
            const ws = bs * 0.54;
            const g3 = rbCtx.createLinearGradient(0, 4, 0, -ws);
            g3.addColorStop(0, '#881337');
            g3.addColorStop(0.48, '#e11d48');
            g3.addColorStop(0.84, '#fecdd3');
            g3.addColorStop(1, '#ffffff');
            rbCtx.fillStyle = g3;
            rbCtx.strokeStyle = 'rgba(253, 224, 71, 0.88)';
            rbCtx.lineWidth = 1.05;
            rbCtx.beginPath();
            rbCtx.moveTo(0, 4);
            rbCtx.bezierCurveTo(-ws * 0.68, -ws * 0.14, -ws * 0.72, -ws * 0.90, 0, -ws);
            rbCtx.bezierCurveTo(ws * 0.72, -ws * 0.90, ws * 0.68, -ws * 0.14, 0, 4);
            rbCtx.closePath();
            rbCtx.fill();
            rbCtx.stroke();
            rbCtx.restore();
        }

        // Tầng 4 (Heart Spiral Core): 5 cánh nụ xoáy sát tâm & vương miện nhụy vàng 24K
        for (let i = 0; i < 5; i++) {
            rbCtx.save();
            rbCtx.rotate((i / 5) * Math.PI * 2 + 0.9);
            const cs = bs * 0.31;
            rbCtx.fillStyle = '#ffe4e6';
            rbCtx.strokeStyle = '#fbbf24';
            rbCtx.lineWidth = 1.0;
            rbCtx.beginPath();
            rbCtx.moveTo(0, 2);
            rbCtx.bezierCurveTo(-cs * 0.72, -cs * 0.2, -cs * 0.72, -cs * 0.92, 0, -cs);
            rbCtx.bezierCurveTo(cs * 0.72, -cs * 0.92, cs * 0.72, -cs * 0.2, 0, 2);
            rbCtx.closePath();
            rbCtx.fill();
            rbCtx.stroke();
            rbCtx.restore();
        }

        // Nhụy kim hoàn 24K & sương mai ở tâm hoa
        rbCtx.fillStyle = '#fde047';
        rbCtx.beginPath();
        rbCtx.arc(0, 0, 6.2, 0, Math.PI * 2);
        rbCtx.fill();
        for (let st = 0; st < 8; st++) {
            const sa = (st / 8) * Math.PI * 2;
            rbCtx.fillStyle = '#fffbeb';
            rbCtx.beginPath();
            rbCtx.arc(Math.cos(sa) * 9.5, Math.sin(sa) * 9.5, 1.8, 0, Math.PI * 2);
            rbCtx.fill();
        }
        atlas.roseBloom = rbC;
    }

    // 5C. ĐÓA TULIP HOÀNG GIA HÀ LAN 6 CÁNH KHUM 3D & CÁNH TULIP LỤA ĐÀO (3D Royal Dutch Tulip Chalice 196x196 & Petal 160x160)
    {
        // Cánh Hoa Tulip Hoàng Gia khum bầu dục chuyển sắc Mật Ong Vàng -> Hồng Cam Đào -> Trắng Ngọc Trai
        const { c: tpC, ctx: tpCtx } = makeCanvas(160, 160);
        tpCtx.translate(80, 86);
        const s = 48;
        const tAura = tpCtx.createRadialGradient(0, -s * 0.18, s * 0.14, 0, -s * 0.18, s * 1.46);
        tAura.addColorStop(0, 'rgba(254, 240, 138, 0.62)');
        tAura.addColorStop(0.55, 'rgba(251, 113, 133, 0.30)');
        tAura.addColorStop(1, 'rgba(251, 113, 133, 0)');
        tpCtx.fillStyle = tAura;
        tpCtx.beginPath();
        tpCtx.arc(0, -s * 0.18, s * 1.46, 0, Math.PI * 2);
        tpCtx.fill();

        const tpGrad = tpCtx.createLinearGradient(0, s * 0.52, 0, -s * 1.08);
        tpGrad.addColorStop(0, '#f59e0b');
        tpGrad.addColorStop(0.18, '#fde047');
        tpGrad.addColorStop(0.45, '#fb7185');
        tpGrad.addColorStop(0.76, '#e11d48');
        tpGrad.addColorStop(0.92, '#fecdd3');
        tpGrad.addColorStop(1, '#ffffff');
        tpCtx.fillStyle = tpGrad;
        tpCtx.beginPath();
        tpCtx.moveTo(0, s * 0.52);
        tpCtx.bezierCurveTo(-s * 0.78, s * 0.24, -s * 0.84, -s * 0.70, 0, -s * 1.08);
        tpCtx.bezierCurveTo(s * 0.84, -s * 0.70, s * 0.78, s * 0.24, 0, s * 0.52);
        tpCtx.closePath();
        tpCtx.fill();

        // Viền lụa ánh kim & gân sọc dọc đặc trưng của cánh hoa Tulip Hà Lan
        tpCtx.strokeStyle = 'rgba(255, 251, 235, 0.86)';
        tpCtx.lineWidth = 1.3;
        tpCtx.stroke();

        tpCtx.strokeStyle = 'rgba(255, 248, 220, 0.52)';
        tpCtx.lineWidth = 1.05;
        for (let v = -3; v <= 3; v++) {
            tpCtx.beginPath();
            tpCtx.moveTo(0, s * 0.46);
            tpCtx.quadraticCurveTo(v * s * 0.14, -s * 0.22, v * s * 0.16, -s * (0.94 - Math.abs(v) * 0.07));
            tpCtx.stroke();
        }

        // Giọt sương nắng mai trên cánh Tulip
        tpCtx.fillStyle = '#ffffff';
        tpCtx.beginPath();
        tpCtx.arc(s * 0.22, -s * 0.42, 3.2, 0, Math.PI * 2);
        tpCtx.fill();
        atlas.tulipPetal = tpC;

        // 5D. Đóa Hoa Tulip Hoàng Gia 3D 6 cánh khum ly rượu (Royal Chalice) kèm cuống & đôi lá lụa lục bảo vươn cao (196x196)
        const { c: tbC, ctx: tbCtx } = makeCanvas(196, 196);
        tbCtx.translate(98, 106);
        const ts = 54;
        const tbAura = tbCtx.createRadialGradient(0, -ts * 0.28, ts * 0.14, 0, -ts * 0.28, ts * 1.54);
        tbAura.addColorStop(0, 'rgba(254, 249, 195, 0.82)');
        tbAura.addColorStop(0.52, 'rgba(251, 113, 133, 0.40)');
        tbAura.addColorStop(1, 'rgba(251, 113, 133, 0)');
        tbCtx.fillStyle = tbAura;
        tbCtx.beginPath();
        tbCtx.arc(0, -ts * 0.28, ts * 1.54, 0, Math.PI * 2);
        tbCtx.fill();

        // Cuống hoa ngọc bích & Đôi lá Tulip thon dài uốn lượn 3D ôm lấy đài hoa
        const stemG = tbCtx.createLinearGradient(0, ts * 0.25, 0, ts * 0.72);
        stemG.addColorStop(0, '#fde047');
        stemG.addColorStop(0.4, '#10b981');
        stemG.addColorStop(1, '#047857');
        tbCtx.strokeStyle = stemG;
        tbCtx.lineWidth = 4.6;
        tbCtx.lineCap = 'round';
        tbCtx.beginPath();
        tbCtx.moveTo(0, ts * 0.26);
        tbCtx.lineTo(0, ts * 0.68);
        tbCtx.stroke();

        [-1, 1].forEach(dir => {
            tbCtx.save();
            const lGrad = tbCtx.createLinearGradient(0, ts * 0.56, dir * ts * 0.84, -ts * 0.54);
            lGrad.addColorStop(0, '#065f46');
            lGrad.addColorStop(0.48, '#10b981');
            lGrad.addColorStop(0.85, '#6ee7b7');
            lGrad.addColorStop(1, '#fef08a');
            tbCtx.fillStyle = lGrad;
            tbCtx.strokeStyle = 'rgba(254, 240, 138, 0.78)';
            tbCtx.lineWidth = 1.15;
            tbCtx.beginPath();
            tbCtx.moveTo(0, ts * 0.56);
            tbCtx.bezierCurveTo(dir * ts * 0.68, ts * 0.42, dir * ts * 1.02, -ts * 0.08, dir * ts * 0.68, -ts * 0.58);
            tbCtx.bezierCurveTo(dir * ts * 0.34, -ts * 0.14, dir * ts * 0.18, ts * 0.26, 0, ts * 0.48);
            tbCtx.closePath();
            tbCtx.fill();
            tbCtx.stroke();
            tbCtx.restore();
        });

        // 3 Cánh Tulip lớp sau (Back Inner Chalice Petals) tạo chiều sâu lòng ly 3D phát sáng
        [-0.38, 0, 0.38].forEach((offsetX, idx) => {
            const backG = tbCtx.createLinearGradient(0, ts * 0.1, offsetX * ts, -ts * 1.16);
            backG.addColorStop(0, '#881337');
            backG.addColorStop(0.55, '#e11d48');
            backG.addColorStop(0.88, '#fda4af');
            backG.addColorStop(1, '#fef08a');
            tbCtx.fillStyle = backG;
            tbCtx.strokeStyle = 'rgba(254, 240, 138, 0.75)';
            tbCtx.lineWidth = 1.1;
            const cx = offsetX * ts * 0.95;
            const topY = idx === 1 ? -ts * 1.16 : -ts * 1.06;
            tbCtx.beginPath();
            tbCtx.moveTo(cx * 0.25, ts * 0.15);
            tbCtx.bezierCurveTo(cx - ts * 0.32, -ts * 0.35, cx - ts * 0.26, -ts * 0.88, cx, topY);
            tbCtx.bezierCurveTo(cx + ts * 0.26, -ts * 0.88, cx + ts * 0.32, -ts * 0.35, cx * 0.25, ts * 0.15);
            tbCtx.closePath();
            tbCtx.fill();
            tbCtx.stroke();
        });

        // Nhụy phấn hoàng kim tỏa sáng từ lòng ly Tulip
        const pollenGlow = tbCtx.createRadialGradient(0, -ts * 0.58, 2, 0, -ts * 0.58, ts * 0.42);
        pollenGlow.addColorStop(0, '#ffffff');
        pollenGlow.addColorStop(0.45, '#fde047');
        pollenGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
        tbCtx.fillStyle = pollenGlow;
        tbCtx.beginPath();
        tbCtx.arc(0, -ts * 0.58, ts * 0.42, 0, Math.PI * 2);
        tbCtx.fill();

        // 2 Cánh bên lớp trước (Front Embracing Petals) ôm khum 3D
        [-1, 1].forEach(dir => {
            const sideG = tbCtx.createLinearGradient(0, ts * 0.38, dir * ts * 0.72, -ts * 0.98);
            sideG.addColorStop(0, '#fde047');
            sideG.addColorStop(0.22, '#be123c');
            sideG.addColorStop(0.58, '#fb7185');
            sideG.addColorStop(0.88, '#fde68a');
            sideG.addColorStop(1, '#ffffff');
            tbCtx.fillStyle = sideG;
            tbCtx.strokeStyle = 'rgba(255, 251, 235, 0.9)';
            tbCtx.lineWidth = 1.3;
            tbCtx.beginPath();
            tbCtx.moveTo(dir * 2, ts * 0.38);
            tbCtx.bezierCurveTo(dir * ts * 0.86, ts * 0.24, dir * ts * 0.92, -ts * 0.56, dir * ts * 0.42, -ts * 1.0);
            tbCtx.bezierCurveTo(dir * ts * 0.10, -ts * 0.72, dir * ts * 0.04, -ts * 0.15, dir * 2, ts * 0.38);
            tbCtx.closePath();
            tbCtx.fill();
            tbCtx.stroke();
        });

        // Cánh chính diện trung tâm (Hero Center Chalice Petal) với đáy mật ong vàng rực rỡ
        const midG = tbCtx.createLinearGradient(0, ts * 0.42, 0, -ts * 1.10);
        midG.addColorStop(0, '#f59e0b');
        midG.addColorStop(0.18, '#fde047');
        midG.addColorStop(0.45, '#e11d48');
        midG.addColorStop(0.75, '#fb7185');
        midG.addColorStop(0.92, '#fef08a');
        midG.addColorStop(1, '#ffffff');
        tbCtx.fillStyle = midG;
        tbCtx.strokeStyle = '#fffbeb';
        tbCtx.lineWidth = 1.45;
        tbCtx.beginPath();
        tbCtx.moveTo(0, ts * 0.42);
        tbCtx.bezierCurveTo(-ts * 0.62, ts * 0.26, -ts * 0.64, -ts * 0.68, 0, -ts * 1.10);
        tbCtx.bezierCurveTo(ts * 0.64, -ts * 0.68, ts * 0.62, ts * 0.26, 0, ts * 0.42);
        tbCtx.closePath();
        tbCtx.fill();
        tbCtx.stroke();

        // Gân lụa mảnh trên cánh chính diện
        tbCtx.strokeStyle = 'rgba(255, 251, 235, 0.48)';
        tbCtx.lineWidth = 0.95;
        for (let v = -2; v <= 2; v++) {
            tbCtx.beginPath();
            tbCtx.moveTo(0, ts * 0.36);
            tbCtx.quadraticCurveTo(v * ts * 0.12, -ts * 0.25, v * ts * 0.14, -ts * (0.94 - Math.abs(v) * 0.06));
            tbCtx.stroke();
        }

        atlas.tulipBloom = tbC;
        atlas.diamond = tbC; // Tương thích ngược hoàn toàn cho mọi thực thể cũ
    }

    // 6. BIỂN MÂY 3D CELESTIA BẰNG THUẬT TOÁN PIXEL SHADER 5-OCTAVE FBM NOISE + NORMAL RIM-LIGHTING (320x160)
    // Tạo đám mây khối 3D thật như trong game Genshin Impact (có đỉnh mây bắt sáng bạc/vàng và đáy mây tán xạ khí quyển sâu)
    const hash2D = (ix, iy) => {
        const n = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123;
        return n - Math.floor(n);
    };
    const valueNoise2D = (x, y) => {
        const ix = Math.floor(x), iy = Math.floor(y);
        const fx = x - ix, fy = y - iy;
        const ux = fx * fx * (3 - 2 * fx);
        const uy = fy * fy * (3 - 2 * fy);
        const a = hash2D(ix, iy);
        const b = hash2D(ix + 1, iy);
        const c = hash2D(ix, iy + 1);
        const d = hash2D(ix + 1, iy + 1);
        return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
    };
    const fbm5Octaves = (x, y) => {
        let v = 0, amp = 0.52, freq = 1.0;
        for (let o = 0; o < 5; o++) {
            v += amp * valueNoise2D(x * freq, y * freq);
            freq *= 2.05;
            amp *= 0.48;
        }
        return v;
    };

    const buildFBMVolumetricCloudSprite = (rimRGB, midRGB, shadowRGB, seedOffset) => {
        const W = 280, H = 140;
        const { c, ctx } = makeCanvas(W, H);
        const imgData = ctx.createImageData(W, H);
        const data = imgData.data;

        for (let py = 0; py < H; py++) {
            const ny = (py / H) * 2 - 1; // -1 .. 1
            for (let px = 0; px < W; px++) {
                const nx = (px / W) * 2 - 1; // -1 .. 1
                // Hình dáng vòm mây Cumulonimbus (phồng ở trên, thoải rộng ở đáy)
                const domeDist = Math.sqrt(nx * nx * 0.92 + Math.pow(ny + 0.08 * (1 - nx * nx), 2) * 1.35);
                if (domeDist >= 1.0) continue;
                const falloff = Math.pow(1 - domeDist, 1.55);

                const u = px * 0.026 + seedOffset;
                const v = py * 0.032 + seedOffset * 0.7;
                const nVal = fbm5Octaves(u, v);
                const density = Math.max(0, Math.min(1, (nVal - 0.28) * 2.25 * falloff));
                if (density <= 0.01) continue;

                // Tính đạo hàm theo phương đứng (Normal Y) để tạo Rim-Lighting ở rìa trên đám mây chuẩn Shader 3D!
                const nAbove = fbm5Octaves(u, v - 0.14);
                const topLight = Math.max(0, Math.min(1, (density - (nAbove - 0.28) * 2.25 * falloff) * 2.4 + (0.48 - py / H) * 0.75));
                const bellyShadow = Math.max(0, Math.min(1, (py / H - 0.35) * 1.45));

                const r = midRGB[0] * (1 - bellyShadow) + shadowRGB[0] * bellyShadow + (rimRGB[0] - midRGB[0]) * topLight;
                const g = midRGB[1] * (1 - bellyShadow) + shadowRGB[1] * bellyShadow + (rimRGB[1] - midRGB[1]) * topLight;
                const b = midRGB[2] * (1 - bellyShadow) + shadowRGB[2] * bellyShadow + (rimRGB[2] - midRGB[2]) * topLight;

                const idx = (py * W + px) * 4;
                data[idx]     = Math.min(255, Math.max(0, r | 0));
                data[idx + 1] = Math.min(255, Math.max(0, g | 0));
                data[idx + 2] = Math.min(255, Math.max(0, b | 0));
                data[idx + 3] = Math.min(255, (Math.pow(density, 0.82) * 235) | 0);
            }
        }
        ctx.putImageData(imgData, 0, 0);
        return c;
    };

    // 4 Biển Mây 3D FBM với Normal Rim-Lighting chuẩn Celestia Genshin Impact
    atlas.cloudGold    = buildFBMVolumetricCloudSprite([255, 252, 225], [245, 190, 82],  [52, 34, 48],  11.3);
    atlas.cloudRose    = buildFBMVolumetricCloudSprite([255, 235, 245], [228, 105, 158], [28, 22, 46],  27.8);
    atlas.cloudEmerald = buildFBMVolumetricCloudSprite([230, 255, 245], [52, 198, 152],  [10, 38, 36],  43.1);
    atlas.cloudAstral  = buildFBMVolumetricCloudSprite([255, 244, 230], [244, 132, 152], [44, 18, 36],  64.5);

    // 7. TRĂNG RẰM HOÀNG KIM CÓ VÂN ĐÁ QUÝ FBM SHADER (Textured Celestial Full Moon - 256x256)
    {
        const { c, ctx } = makeCanvas(256, 256);
        const cx = 128, cy = 128, r = 82;
        const corona = ctx.createRadialGradient(cx, cy, r * 0.82, cx, cy, 126);
        corona.addColorStop(0, 'rgba(255, 250, 220, 0.92)');
        corona.addColorStop(0.42, 'rgba(255, 204, 112, 0.42)');
        corona.addColorStop(1, 'rgba(255, 182, 208, 0)');
        ctx.fillStyle = corona;
        ctx.beginPath();
        ctx.arc(cx, cy, 126, 0, Math.PI * 2);
        ctx.fill();

        const mGrad = ctx.createRadialGradient(cx - 22, cy - 22, 8, cx, cy, r);
        mGrad.addColorStop(0, '#ffffff');
        mGrad.addColorStop(0.45, '#fff9e2');
        mGrad.addColorStop(0.82, '#ffe094');
        mGrad.addColorStop(1, '#f5b041');
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = mGrad;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

        const maria = [
            { x: cx - 24, y: cy - 12, rx: 28, ry: 20, rot: 0.3 },
            { x: cx + 16, y: cy - 24, rx: 22, ry: 16, rot: -0.4 },
            { x: cx + 22, y: cy + 14, rx: 26, ry: 22, rot: 0.5 },
            { x: cx - 12, y: cy + 28, rx: 18, ry: 14, rot: -0.2 }
        ];
        for (let m = 0; m < maria.length; m++) {
            const mr = maria[m];
            const mg = ctx.createRadialGradient(mr.x, mr.y, 2, mr.x, mr.y, mr.rx);
            mg.addColorStop(0, 'rgba(198, 138, 56, 0.32)');
            mg.addColorStop(1, 'rgba(198, 138, 56, 0)');
            ctx.fillStyle = mg;
            ctx.beginPath();
            ctx.ellipse(mr.x, mr.y, mr.rx, mr.ry, mr.rot, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        atlas.fullMoon = c;
    }

    _u3dLuxuryAtlas = atlas;
    return atlas;
}

// Hàm vẽ các thực thể Vật Lý 3D trên 2 lớp Canvas (Sau thiệp & Trước thiệp) với Texture Hoa Lụa & Kim Hoàn Pre-Baked
function draw3DProjectedParticle(ctx, p, cx, cy, focal) {
    const depth = focal - p.z;
    if (depth <= 80) return;
    const scale = focal / depth;
    const sx = cx + p.x * scale;
    const sy = cy + p.y * scale;
    const atlas = getU3DLuxurySpriteAtlas();

    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(scale, scale);
    ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));

    if (p.type === 'shard') {
        ctx.rotate(p.rz);
        ctx.scale(Math.max(0.24, Math.cos(p.rx)), Math.max(0.24, Math.sin(p.ry)));
        const s = p.size;
        ctx.fillStyle = p.color || '#f5c242';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.85, -s * 0.2);
        ctx.lineTo(s * 0.5, s * 0.9);
        ctx.lineTo(-s * 0.7, s * 0.6);
        ctx.lineTo(-s * 0.9, -s * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.85);
        ctx.lineTo(s * 0.65, -s * 0.15);
        ctx.lineTo(0, s * 0.25);
        ctx.closePath();
        ctx.fill();
    } else if (p.type === 'butterfly') {
        const heading = Math.atan2(p.vy, p.vx) + Math.PI / 2;
        ctx.rotate(heading * 0.35 + Math.sin(p.phase * 0.5) * 0.2);
        const wingCos = Math.max(0.14, Math.abs(Math.cos(p.flapPhase)));
        const s = p.size;
        const wingSprite = p.isGold ? atlas.butterflyWingGold : atlas.butterflyWingRose;
        const drawScale = s / 48;

        [-1, 1].forEach(dir => {
            ctx.save();
            ctx.scale(dir * wingCos * drawScale, drawScale);
            ctx.drawImage(wingSprite, -18, -68);
            ctx.restore();
        });

        ctx.fillStyle = '#fff3b0';
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.max(1.5, s * 0.09), s * 0.36, 0, 0, Math.PI * 2);
        ctx.fill();
    } else if (p.type === 'petal' || p.type === 'rose_petal' || p.type === 'tulip_petal') {
        ctx.rotate(p.rz);
        const tiltX = Math.max(0.28, Math.abs(Math.cos(p.rx)));
        const tiltY = Math.max(0.32, Math.abs(Math.sin(p.ry)));
        ctx.scale(tiltX, tiltY);
        const s = p.size;
        const sprite = p.type === 'rose_petal'
            ? atlas.rosePetal
            : (p.type === 'tulip_petal'
                ? atlas.tulipPetal
                : (p.isSakura ? atlas.sakuraPetal : atlas.camelliaPetal));
        const drawR = s * 1.38;
        ctx.drawImage(sprite, -drawR, -drawR, drawR * 2, drawR * 2);
    } else if (p.type === 'rose_bloom') {
        ctx.rotate(p.rz);
        const tiltX = 0.68 + 0.32 * Math.abs(Math.cos(p.rx));
        const tiltY = 0.68 + 0.32 * Math.abs(Math.sin(p.ry));
        ctx.scale(tiltX, tiltY);
        const drawR = p.size * 1.48;
        ctx.drawImage(atlas.roseBloom, -drawR, -drawR, drawR * 2, drawR * 2);
    } else if (p.type === 'tulip_bloom' || p.type === 'diamond') {
        ctx.rotate(p.rz * 0.45);
        const turnX = 0.65 + 0.35 * Math.abs(Math.cos(p.ry));
        const s = p.size;
        const drawR = s * 1.48;
        ctx.save();
        ctx.scale(turnX, 1);
        ctx.drawImage(atlas.tulipBloom, -drawR, -drawR, drawR * 2, drawR * 2);
        ctx.restore();
    } else if (p.type === 'pearl') {
        const drawR = p.size * 1.28;
        ctx.drawImage(atlas.pearl, -drawR, -drawR, drawR * 2, drawR * 2);
    } else if (p.type === 'bokeh') {
        const r = p.size;
        ctx.fillStyle = p.bokehColor || 'rgba(255, 232, 156, 0.38)';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 250, 224, 0.52)';
        ctx.lineWidth = 0.85;
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
        ctx.beginPath();
        ctx.arc(-r * 0.22, -r * 0.22, r * 0.36, 0, Math.PI * 2);
        ctx.fill();
    } else if (p.type === 'star') {
        if (p.hasTrail && (Math.abs(p.vx) + Math.abs(p.vy) > 40)) {
            const ang = Math.atan2(p.vy, p.vx);
            ctx.save();
            ctx.rotate(ang);
            ctx.strokeStyle = 'rgba(255, 232, 142, 0.38)';
            ctx.lineWidth = p.size * 0.56;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-p.size * 4.2, 0);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.lineWidth = p.size * 0.22;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-p.size * 2.8, 0);
            ctx.stroke();
            ctx.restore();
        }
        ctx.rotate(p.rz);
        const s = p.size;
        ctx.fillStyle = 'rgba(255, 230, 128, 0.38)';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.72, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fffef5';
        ctx.strokeStyle = p.color || '#f5c242';
        ctx.lineWidth = 0.95;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.18, -s * 0.18);
        ctx.lineTo(s, 0);
        ctx.lineTo(s * 0.18, s * 0.18);
        ctx.lineTo(0, s);
        ctx.lineTo(-s * 0.18, s * 0.18);
        ctx.lineTo(-s, 0);
        ctx.lineTo(-s * 0.18, -s * 0.18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    ctx.restore();
}

// Vẽ Vòng Quỹ Đạo Thiên Văn Khắc Vạch Độ & Chòm Sao 3D (Engraved Astrolabe Gyroscope Ring)
function drawSplit3DRing(ctxBack, ctxFront, ring, cx, cy, focal, cardZ) {
    if (ring.alpha <= 0.01) return;
    const steps = 64;
    const cosX = Math.cos(ring.rx), sinX = Math.sin(ring.rx);
    const cosY = Math.cos(ring.ry), sinY = Math.sin(ring.ry);
    const cosZ = Math.cos(ring.rz), sinZ = Math.sin(ring.rz);

    const pts = [];
    for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const x0 = Math.cos(a) * ring.radius;
        const y0 = Math.sin(a) * ring.radius;

        const y1 = y0 * cosX;
        const z1 = y0 * sinX;
        const x1 = x0;

        const x2 = x1 * cosY + z1 * sinY;
        const z2 = -x1 * sinY + z1 * cosY;
        const y2 = y1;

        const x3 = x2 * cosZ - y2 * sinZ + ring.cx;
        const y3 = x2 * sinZ + y2 * cosZ + ring.cy;
        const z3 = z2 + ring.cz;

        const depth = Math.max(120, focal - z3);
        const s = focal / depth;
        pts.push({
            sx: cx + x3 * s,
            sy: cy + y3 * s,
            z: z3,
            s
        });
    }

    [
        { ctx: ctxBack, isFront: false },
        { ctx: ctxFront, isFront: true }
    ].forEach(({ ctx, isFront }) => {
        ctx.save();
        // 1. Dải chỉ vàng kim liên kết chòm sao (Engraved Celestial Filigree Arc)
        ctx.lineCap = 'round';
        for (let i = 1; i < pts.length; i++) {
            const p0 = pts[i - 1];
            const p1 = pts[i];
            const belongs = isFront ? (p1.z >= cardZ) : (p1.z < cardZ);
            if (!belongs) continue;
            if (ring.dashed && i % 3 === 0) continue;
            ctx.globalAlpha = Math.max(0, Math.min(1, ring.alpha * 0.42));
            ctx.strokeStyle = ring.color;
            ctx.lineWidth = Math.max(0.8, ring.lineWidth * p1.s * 0.65);
            ctx.beginPath();
            ctx.moveTo(p0.sx, p0.sy);
            ctx.lineTo(p1.sx, p1.sy);
            ctx.stroke();
        }

        // 2. Các nút tinh tú & hạt kim hoàn đính dọc trên vành thiên văn
        for (let i = 0; i < pts.length - 1; i += 2) {
            const p = pts[i];
            const belongs = isFront ? (p.z >= cardZ) : (p.z < cardZ);
            if (!belongs) continue;
            const isMajorNode = i % 8 === 0;
            const wave = 0.5 + 0.5 * Math.sin((i / pts.length) * Math.PI * 4 + ring.rz * 2);
            const rSize = (ring.lineWidth * (isMajorNode ? 1.55 : 0.95)) * (0.7 + 0.45 * wave) * p.s;

            ctx.globalAlpha = Math.max(0, Math.min(1, ring.alpha * 0.30 * wave));
            ctx.fillStyle = ring.glowColor || ring.color;
            ctx.beginPath();
            ctx.arc(p.sx, p.sy, rSize * 2.3, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = Math.max(0, Math.min(1, ring.alpha * (0.65 + 0.35 * wave)));
            ctx.fillStyle = isMajorNode ? '#ffffff' : ring.color;
            ctx.beginPath();
            ctx.arc(p.sx, p.sy, rSize * 0.92, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    });
}

// Vẽ Dải Lụa Satin Thêu Chỉ Vàng 24K 3D (3D Woven Silk Satin & Gold-Thread Ribbon Streamer)
function drawSplit3DRibbonHelix(ctxBack, ctxFront, ribbon, cx, cy, focal, cardZ) {
    if (ribbon.alpha <= 0.01) return;
    const segs = 38;
    const mScale = ribbon.motionScale || 1;
    const pts = [];
    for (let i = 0; i <= segs; i++) {
        const u = i / segs;
        if (u > ribbon.progress) break;
        const theta = ribbon.baseAngle + u * Math.PI * 3.2 + ribbon.phase;
        const rad = ribbon.startRadius * (1 - u * 0.25) + Math.sin(u * Math.PI) * 55 * mScale;
        const wx = ribbon.originX + Math.cos(theta) * rad;
        const wy = ribbon.originY - u * ribbon.heightSpan + Math.sin(u * Math.PI * 2) * 18 * mScale;
        const wz = Math.sin(theta) * rad;

        const depth = Math.max(120, focal - wz);
        const s = focal / depth;
        // Độ nghiêng mặt lụa theo góc xoắn 3D để tạo hiệu ứng lụa lật mặt (3D Twist Ribbon Width)
        const ribbonTwist = 0.38 + 0.62 * Math.abs(Math.cos(theta * 0.85));
        pts.push({
            sx: cx + wx * s,
            sy: cy + wy * s,
            z: wz,
            w: (15 * mScale * (1 - u * 0.42)) * s * ribbonTwist,
            sheen: Math.pow(Math.max(0, Math.sin(theta)), 2)
        });
    }

    [
        { ctx: ctxBack, isFront: false },
        { ctx: ctxFront, isFront: true }
    ].forEach(({ ctx, isFront }) => {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 1; i < pts.length; i++) {
            const p0 = pts[i - 1];
            const p1 = pts[i];
            const belongs = isFront ? (p1.z >= cardZ) : (p1.z < cardZ);
            if (!belongs) continue;

            // 1. Viền chỉ vàng kim 24K hai bên mép dải lụa
            ctx.globalAlpha = Math.max(0, Math.min(1, ribbon.alpha * 0.92));
            ctx.strokeStyle = '#ffd54f';
            ctx.lineWidth = p1.w + 2.4 * mScale;
            ctx.beginPath();
            ctx.moveTo(p0.sx, p0.sy);
            ctx.lineTo(p1.sx, p1.sy);
            ctx.stroke();

            // 2. Thân lụa satin chính
            ctx.strokeStyle = ribbon.color;
            ctx.lineWidth = p1.w;
            ctx.beginPath();
            ctx.moveTo(p0.sx, p0.sy);
            ctx.lineTo(p1.sx, p1.sy);
            ctx.stroke();

            // 3. Bóng phản quang lụa (Satin Specular Highlight khi mặt lụa đón ánh sáng)
            ctx.globalAlpha = Math.max(0, Math.min(1, ribbon.alpha * (0.35 + 0.60 * p1.sheen)));
            ctx.strokeStyle = '#fff8dc';
            ctx.lineWidth = Math.max(1.1, p1.w * 0.34);
            ctx.beginPath();
            ctx.moveTo(p0.sx, p0.sy);
            ctx.lineTo(p1.sx, p1.sy);
            ctx.stroke();
        }
        ctx.restore();
    });
}

// Vẽ Hiệu Ứng Khởi Động / Tụ Năng Lượng Hồi Hộp quanh Con Dấu Sáp theo từng chế độ (0.00s -> 0.88s) - Có Responsive Scale!
function drawSealWindupEffect(ctx, modeId, w, cx, cy, sealScreenY, motionScale = 1) {
    if (w <= 0 || w >= 1) return;
    const atlas = getU3DLuxurySpriteAtlas();
    ctx.save();
    ctx.translate(cx, sealScreenY);
    ctx.scale(motionScale, motionScale);

    const fadeOut = w > 0.84 ? (1 - w) / 0.16 : 1;
    const baseAlpha = Math.min(1, w * 2.5) * fadeOut;

    // Vầng hào quang năng lượng ấm áp lan tỏa từ tâm ấn sáp
    const auraR = 52 + Math.sin(w * Math.PI) * 30;
    ctx.globalAlpha = baseAlpha * 0.28;
    ctx.fillStyle = '#ffe58f';
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, Math.PI * 2);
    ctx.fill();

    if (modeId === 'bloom') {
        // Đại Hoa Trà: 2 tầng cánh hoa trà hồng-vàng bung nở xoay quanh ấn sáp
        ctx.rotate(w * Math.PI * 1.8);
        const petalCount = 8;
        const ringR = 40 + Math.sin(w * Math.PI) * 18;
        for (let i = 0; i < petalCount; i++) {
            const a = (i / petalCount) * Math.PI * 2;
            ctx.save();
            ctx.rotate(a);
            ctx.globalAlpha = baseAlpha * 0.88;
            ctx.fillStyle = i % 2 === 0 ? '#ff80ab' : '#ffd54f';
            ctx.beginPath();
            ctx.moveTo(0, -ringR + 10);
            ctx.bezierCurveTo(-10, -ringR, -9, -ringR - 15, 0, -ringR - 20);
            ctx.bezierCurveTo(9, -ringR - 15, 10, -ringR, 0, -ringR + 10);
            ctx.fill();
            ctx.restore();
        }
    } else if (modeId === 'butterflies') {
        // Hồ Điệp Vàng: Đôi cánh ánh kim khổng lồ vỗ nhịp nhàng hai bên ấn sáp trước khi hóa đàn bướm bay lên
        const wingFlap = Math.max(0.18, Math.abs(Math.cos(w * Math.PI * 9.5)));
        const span = (48 + w * 40);
        ctx.globalAlpha = baseAlpha * 0.85;
        ctx.strokeStyle = '#fff59d';
        ctx.fillStyle = 'rgba(255, 213, 79, 0.34)';
        ctx.lineWidth = 1.8;

        [-1, 1].forEach(dir => {
            ctx.save();
            ctx.scale(dir * wingFlap, 1);
            ctx.beginPath();
            ctx.moveTo(0, -6);
            ctx.bezierCurveTo(span * 0.65, -span * 1.05, span * 1.25, -span * 0.5, span * 0.92, span * 0.12);
            ctx.bezierCurveTo(span * 0.65, span * 0.35, span * 0.25, span * 0.2, 0, span * 0.08);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, span * 0.08);
            ctx.bezierCurveTo(span * 0.7, span * 0.28, span * 0.82, span * 0.9, span * 0.38, span * 0.95);
            ctx.bezierCurveTo(span * 0.15, span * 0.95, span * 0.05, span * 0.5, 0, span * 0.2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        });
    } else if (modeId === 'ribbon') {
        // Ruy-Băng Lụa: Cánh nơ lụa hồng hoàng gia & chuỗi hạt ngọc trai phát sáng xoay hội tụ
        ctx.rotate(w * Math.PI * 1.6);
        const pearlCount = 10;
        const r = 46 + Math.sin(w * Math.PI) * 15;
        for (let i = 0; i < pearlCount; i++) {
            const a = (i / pearlCount) * Math.PI * 2;
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r;
            ctx.globalAlpha = baseAlpha * 0.35;
            ctx.fillStyle = '#ff80ab';
            ctx.beginPath();
            ctx.arc(px, py, 8.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = baseAlpha * 0.92;
            ctx.fillStyle = i % 2 === 0 ? '#fff9e6' : '#ffb2c9';
            ctx.beginPath();
            ctx.arc(px, py, 4.5, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (modeId === 'galaxy') {
        // 🌹 Hồng Pháp: Đại Đóa Hồng Nhung Pháp 2 tầng & Cánh Hồng Sương Mai bung nở lộng lẫy từ ấn sáp
        const bloomGrow = 0.65 + Math.sin(w * Math.PI * 0.85) * 0.55;
        const petalSpread = 34 + Math.sin(w * Math.PI) * 28;
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2 + w * 2.2;
            ctx.save();
            ctx.rotate(a);
            ctx.translate(0, -petalSpread);
            ctx.rotate(Math.sin(w * 6 + i) * 0.35);
            ctx.globalAlpha = baseAlpha * 0.90;
            const pR = (15 + (i % 2) * 5) * bloomGrow;
            ctx.drawImage(atlas.rosePetal, -pR, -pR, pR * 2, pR * 2);
            ctx.restore();
        }
        for (let b = 0; b < 4; b++) {
            const ba = (b / 4) * Math.PI * 2 - w * 1.6 + Math.PI / 4;
            ctx.save();
            ctx.rotate(ba);
            ctx.translate(0, -petalSpread * 0.78);
            ctx.globalAlpha = baseAlpha * 0.95;
            const bR = 20 * bloomGrow;
            ctx.drawImage(atlas.roseBloom, -bR, -bR, bR * 2, bR * 2);
            ctx.restore();
        }
    } else if (modeId === 'sakura') {
        // Lốc Anh Đào: 5 cánh hoa anh đào 3D hồng phấn xoáy tròn quanh ấn sáp
        ctx.rotate(w * Math.PI * 3.2);
        const petals = 5;
        const ringR = 42 + Math.sin(w * Math.PI) * 15;
        for (let i = 0; i < petals; i++) {
            ctx.save();
            ctx.rotate((i / petals) * Math.PI * 2);
            ctx.translate(0, -ringR);
            ctx.rotate(0.45);
            ctx.globalAlpha = baseAlpha * 0.88;
            ctx.fillStyle = '#ffb2c9';
            const s = 10.5;
            ctx.beginPath();
            ctx.moveTo(0, s);
            ctx.bezierCurveTo(-s * 0.85, s * 0.3, -s * 0.75, -s * 0.75, -s * 0.22, -s);
            ctx.lineTo(0, -s * 0.65);
            ctx.lineTo(s * 0.22, -s);
            ctx.bezierCurveTo(s * 0.75, -s * 0.75, s * 0.85, s * 0.3, 0, s);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    } else if (modeId === 'hearts') {
        // 🌷 Hoa Tulip: Bó Hoa Tulip Hoàng Gia & Cánh Lụa Đào vươn nở đón nắng từ ấn sáp
        const bloomGrow = 0.68 + Math.sin(w * Math.PI * 0.85) * 0.52;
        const spread = 36 + Math.sin(w * Math.PI) * 24;
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 - w * 1.5;
            ctx.save();
            ctx.rotate(a);
            ctx.translate(0, -spread * 1.05);
            ctx.globalAlpha = baseAlpha * 0.88;
            const pR = 15 * bloomGrow;
            ctx.drawImage(atlas.tulipPetal, -pR, -pR, pR * 2, pR * 2);
            ctx.restore();
        }
        const tulipAngles = [-1.1, -0.55, 0, 0.55, 1.1];
        for (let i = 0; i < tulipAngles.length; i++) {
            ctx.save();
            ctx.rotate(tulipAngles[i] * (0.75 + w * 0.45));
            ctx.translate(0, -spread * (i === 2 ? 0.95 : 0.82));
            ctx.globalAlpha = baseAlpha * 0.96;
            const tR = (i === 2 ? 24 : 19) * bloomGrow;
            ctx.drawImage(atlas.tulipBloom, -tR, -tR, tR * 2, tR * 2);
            ctx.restore();
        }
    }

    ctx.restore();
}

// Vẽ Biểu Tượng Hoa & Kim Hoàn 3D Kết Tinh ở tâm màn hình (Có Responsive Scale theo kích thước thiệp!)
function drawSummonCenterMotif(ctx, modeId, t, cx, cy, motionScale = 1) {
    const atlas = getU3DLuxurySpriteAtlas();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(motionScale, motionScale);

    const pulse = 1 + Math.sin(t * 4.5) * 0.10;
    // 1. Hào quang lõi kim hoàn đa lớp
    const coreGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 96 * pulse);
    coreGrad.addColorStop(0, 'rgba(255, 253, 232, 0.94)');
    coreGrad.addColorStop(0.34, 'rgba(255, 224, 130, 0.52)');
    coreGrad.addColorStop(0.68, 'rgba(244, 143, 177, 0.25)');
    coreGrad.addColorStop(1, 'rgba(244, 143, 177, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 96 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // 2. Vương Miện Tinh Hoa & Giọt Sương Ngọc Trai 3D (Thay thế hoàn toàn vòng tròn cũ!)
    for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * Math.PI * 2 + t * 0.85;
        const dist = (52 + Math.sin(t * 3.2 + k * 1.3) * 14) * pulse;
        const px = Math.cos(ang) * dist;
        const py = Math.sin(ang) * dist;
        ctx.save();
        ctx.globalAlpha = 0.65 + 0.35 * Math.sin(t * 4 + k);
        ctx.drawImage(atlas.pearl, px - 7, py - 7, 14, 14);
        ctx.restore();
    }

    // 3. Biểu tượng chủ đề 3D với Texture Hoa Lụa / Nhung / Kim Hoàn thật ở chính tâm
    ctx.globalAlpha = 0.98;
    if (modeId === 'butterflies') {
        const wingCos = Math.max(0.18, Math.abs(Math.cos(t * 11)));
        const drawScale = (38 * pulse) / 48;
        ctx.rotate(Math.sin(t * 2.5) * 0.18);
        [-1, 1].forEach(dir => {
            ctx.save();
            ctx.scale(dir * wingCos * drawScale, drawScale);
            ctx.drawImage(atlas.butterflyWingGold, -18, -68);
            ctx.restore();
        });
        ctx.fillStyle = '#fff3b0';
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.2, 14 * pulse, 0, 0, Math.PI * 2);
        ctx.fill();
    } else if (modeId === 'hearts') {
        // 🌷 Đại Bó Hoa Tulip Hoàng Gia Nắng Mai 3D nở rộ ở tâm
        const tulipPetals = 8;
        const pR = 26 * pulse;
        for (let i = 0; i < tulipPetals; i++) {
            ctx.save();
            ctx.rotate((i / tulipPetals) * Math.PI * 2 + t * 0.9);
            ctx.translate(0, -pR * 0.88);
            ctx.drawImage(atlas.tulipPetal, -pR, -pR, pR * 2, pR * 2);
            ctx.restore();
        }
        [-0.48, 0.48, 0].forEach((angOffset, idx) => {
            ctx.save();
            ctx.rotate(angOffset + Math.sin(t * 2.2 + idx) * 0.08);
            const cR = (idx === 2 ? 42 : 32) * pulse;
            ctx.translate(0, idx === 2 ? -4 : 4);
            ctx.drawImage(atlas.tulipBloom, -cR, -cR, cR * 2, cR * 2);
            ctx.restore();
        });
    } else if (modeId === 'galaxy') {
        // 🌹 Đại Đóa Hồng Nhung Pháp Centifolia 3D xoáy đa tầng ở tâm
        const rosePetals = 8;
        const pR = 28 * pulse;
        for (let i = 0; i < rosePetals; i++) {
            ctx.save();
            ctx.rotate((i / rosePetals) * Math.PI * 2 - t * 1.1);
            ctx.translate(0, -pR * 0.86);
            ctx.drawImage(atlas.rosePetal, -pR, -pR, pR * 2, pR * 2);
            ctx.restore();
        }
        ctx.save();
        ctx.rotate(t * 0.95);
        const bloomR = 46 * pulse;
        ctx.drawImage(atlas.roseBloom, -bloomR, -bloomR, bloomR * 2, bloomR * 2);
        ctx.restore();
    } else if (modeId === 'ribbon') {
        ctx.rotate(Math.sin(t * 3) * 0.15);
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + t * 1.5;
            ctx.drawImage(atlas.pearl, Math.cos(a) * 32 - 8, Math.sin(a) * 32 - 8, 16, 16);
        }
        [-1, 1].forEach(dir => {
            ctx.save();
            ctx.scale(dir, 1);
            ctx.drawImage(atlas.camelliaPetal, 4, -22, 34, 34);
            ctx.restore();
        });
        ctx.drawImage(atlas.pearl, -14, -14, 28, 28);
    } else {
        // bloom hoặc sakura: Đóa Đại Hoa Trà 8 cánh nhung đỏ hoặc Hoa Anh Đào 5 cánh pha lê nở bung đa lớp
        ctx.rotate(t * 1.35);
        const petals = modeId === 'sakura' ? 5 : 8;
        const sprite = modeId === 'sakura' ? atlas.sakuraPetal : atlas.camelliaPetal;
        const pSize = (modeId === 'sakura' ? 26 : 24) * pulse;
        for (let i = 0; i < petals; i++) {
            ctx.save();
            ctx.rotate((i / petals) * Math.PI * 2);
            ctx.translate(0, -pSize * 0.62);
            ctx.drawImage(sprite, -pSize, -pSize, pSize * 2, pSize * 2);
            ctx.restore();
        }
        ctx.drawImage(atlas.pearl, -11, -11, 22, 22);
    }

    ctx.restore();
}


// Trạng thái sẵn sàng 100% của ảnh thiệp người nhận (Chống tuyệt đối hiện tượng mở ra ảnh đen hoặc icon lỗi ảnh)
window.isRecipientCardImageReady = false;

// ====== ĐẠO DIỄN SÂN KHẤU PHONG BÌ VẬT LÝ 3D HỢP NHẤT ======
window.launchUnified3DEnvelopeDirector = function (options = {}) {
    const {
        autoOpen = false,
        autoOpenDelay = 320,
        title = '',
        motionId = window.currentMotionEffect || 'bloom',
        themeKey = currentColorTheme || 'emerald',
        isRealRecipient = window.isRecipientCardLinkMode || false,
        isStep2Preview = false,
        waitForCardReady = false,
        skyOracleMode = false,
        onComplete = null
    } = options;

    const stage = document.getElementById('u3d-envelope-stage');
    const backdrop = document.getElementById('u3d-backdrop');
    const backRig = document.getElementById('u3d-env-back-rig');
    const frontRig = document.getElementById('u3d-env-front-rig');
    const floorShadow = document.getElementById('u3d-env-floor-shadow');
    const flapFront = document.getElementById('u3d-flap-front-actor');
    const flapBack = document.getElementById('u3d-flap-back-actor');
    const pocketLight = document.getElementById('u3d-pocket-light');
    const pocketBloomCore = document.getElementById('u3d-pocket-bloom-core');
    const sealBtn = document.getElementById('u3d-seal-btn');
    const sealEmblem = document.getElementById('u3d-seal-emblem');
    const ribbonStraps = document.getElementById('u3d-ribbon-straps');
    const cardActor = document.getElementById('u3d-card-actor');
    const cardInner = document.getElementById('u3d-card-inner');
    const cardImg = document.getElementById('u3d-card-img');
    const cardSpecular = document.getElementById('u3d-card-specular');
    const backSpecular = document.getElementById('u3d-back-specular');
    const canvasBack = document.getElementById('u3d-canvas-back');
    const canvasFront = document.getElementById('u3d-canvas-front');

    if (!stage || !backRig || !frontRig || !cardActor || !canvasBack || !canvasFront) return;

    // Hủy vòng lặp cũ nếu đang chạy
    if (u3dAnimFrameId) {
        cancelAnimationFrame(u3dAnimFrameId);
        u3dAnimFrameId = null;
    }
    if (u3dAutoOpenTimerId) {
        clearTimeout(u3dAutoOpenTimerId);
        u3dAutoOpenTimerId = null;
    }

    u3dActiveOnComplete = onComplete;
    setMotionEffect(motionId, false);
    applyEnvelopeThemeColors(themeKey);

    const cfg = MOTION_EFFECTS_CONFIG[motionId] || MOTION_EFFECTS_CONFIG.bloom;
    stage.setAttribute('data-motion', cfg.id);
    stage.setAttribute('data-theme', themeKey);
    document.body.setAttribute('data-recipient-theme', themeKey);

    // Ẩn tuyệt đối 100% các nút chức năng bên dưới trong lúc đang ở màn hình Bì Thư 3D
    document.body.classList.add('u3d-stage-active');
    document.body.classList.toggle('step2-previewing-3d', !!isStep2Preview);

    // Đồng bộ giao diện Bước 3 nằm ngay bên dưới sân khấu 3D để đo tọa độ đích 1 lần duy nhất
    window.isEnvelopeGiftMode = true;
    window.isRecipientCardLinkMode = !!isRealRecipient;
    document.body.classList.toggle('recipient-mode', !!isRealRecipient);

    const creatorTopbar = document.getElementById('creator-topbar');
    const creatorQuickBar = document.getElementById('creator-quick-bar');
    const recipientLuxuryDock = document.getElementById('recipient-luxury-dock');
    const dlLabel = document.getElementById('download-btn-label');
    const backStep2Btn = document.getElementById('back-step2-btn');
    const step3MainTitle = document.getElementById('step3-main-title');
    const step3FloatingBadge = document.getElementById('step3-floating-badge');
    const openShareLinkModalBtn = document.getElementById('open-share-link-modal-btn');

    if (isStep2Preview) {
        if (creatorTopbar) creatorTopbar.style.display = 'none';
        if (creatorQuickBar) creatorQuickBar.style.display = 'none';
        if (recipientLuxuryDock) recipientLuxuryDock.style.display = 'none';
    } else if (isRealRecipient) {
        if (creatorTopbar) creatorTopbar.style.display = 'none';
        if (creatorQuickBar) creatorQuickBar.style.display = 'none';
        if (recipientLuxuryDock) recipientLuxuryDock.style.display = 'flex';
        if (dlLabel) dlLabel.textContent = 'Lưu thiệp';
    } else if (window.isSelfOracleMode) {
        // Chế độ "Lời chúc dành cho bạn": Mọi thứ ngẫu nhiên 100%, ẩn thanh sửa nhanh, giữ nút Lưu link xem lại & Mở lại
        if (creatorTopbar) creatorTopbar.style.display = 'grid';
        if (creatorQuickBar) creatorQuickBar.style.display = 'none';
        if (recipientLuxuryDock) recipientLuxuryDock.style.display = 'none';
        if (step3FloatingBadge) step3FloatingBadge.style.display = 'none';
        if (backStep2Btn) backStep2Btn.innerHTML = '✉️ Mở lại';
        if (step3MainTitle) step3MainTitle.textContent = '✨ Dành Cho Bạn 🌸';
        if (openShareLinkModalBtn) openShareLinkModalBtn.innerHTML = '<span class="icon">🔗</span> Lưu link xem lại';
        if (dlLabel) dlLabel.textContent = 'Lưu ảnh';
    } else {
        if (creatorTopbar) creatorTopbar.style.display = 'grid';
        if (creatorQuickBar) creatorQuickBar.style.display = 'grid';
        if (recipientLuxuryDock) recipientLuxuryDock.style.display = 'none';
        if (step3FloatingBadge) step3FloatingBadge.style.display = '';
        if (backStep2Btn) backStep2Btn.innerHTML = '‹ Sửa thiệp';
        if (step3MainTitle) step3MainTitle.textContent = '✨ Thiệp 20/10 🌸';
        if (openShareLinkModalBtn) openShareLinkModalBtn.innerHTML = '<span class="icon">🔗</span> Tạo link gửi tặng';
        if (dlLabel) dlLabel.textContent = 'Lưu ảnh';
    }

    step1?.classList.remove('active');
    step2?.classList.remove('active', 'step2-preloading', 'step2-morph-from');
    step3?.classList.add('active');
    fitCardShowcaseToWrap();

    // Giữ #card-showcase ở mức opacity 0.001 (thay vì 0) để trình duyệt di động luôn giữ sẵn texture ảnh trên GPU, không bao giờ bị chớp màn hình khi bàn giao!
    if (cardShowcase) {
        cardShowcase.classList.remove('is-tilting');
        cardShowcase.style.opacity = '0.001';
        cardShowcase.style.transform = 'translate3d(0, 0, 0) scale(1)';
    }
    if (cardSpecular) {
        cardSpecular.style.opacity = '0';
    }

    // Đồng bộ ảnh mặt trước của tấm thiệp 3D nằm trong phong bì (Chỉ gán khi đã có ảnh thật hợp lệ)
    if (cardImg && !isRealRecipient) {
        const finalSrc = finalResultImg ? finalResultImg.getAttribute('src') : '';
        if (finalSrc && !finalSrc.startsWith('data:image/gif')) {
            cardImg.src = finalResultImg.src;
        } else if (finalResultCanvas && finalResultCanvas.width > 0) {
            try {
                cardImg.src = finalResultCanvas.toDataURL('image/jpeg', 0.92);
            } catch (_) {}
        }
    }

    if (sealEmblem) {
        sealEmblem.innerHTML = getSealEmblemSVG(cfg.id);
        sealEmblem.style.transform = '';
    }
    if (pocketBloomCore) {
        pocketBloomCore.innerHTML = ['bloom', 'galaxy', 'hearts'].includes(cfg.id) ? buildPocketBloomCamelliaSVG(cfg.id) : '';
        pocketBloomCore.style.opacity = '0';
        pocketBloomCore.style.transform = 'scale(0.15)';
    }

    // Kiểm tra xem cần chạy Pha Triệu Hồi 3D (Summoning) chờ tải xong ảnh thiệp trước khi hiện Phong Bì & Ấn Sáp hay không
    const needSummonPrelude = !!(waitForCardReady || (isRealRecipient && !window.isRecipientCardImageReady));

    stage.classList.remove('is-summoning', 'is-arriving', 'is-opening', 'pocket-cleared', 'handing-off');
    stage.style.display = 'block';
    if (backdrop) backdrop.style.opacity = '0';
    if (flapFront) {
        flapFront.style.display = 'block';
        flapFront.style.transform = 'perspective(1200px) rotateX(0deg)';
    }
    if (flapBack) {
        flapBack.style.display = 'none';
        flapBack.style.transform = 'perspective(1200px) rotateX(180deg)';
    }
    if (pocketLight) {
        pocketLight.style.opacity = '0';
        pocketLight.style.transform = 'scaleY(0.2) scaleX(0.6)';
    }
    const strapEls = {
        hL: ribbonStraps ? ribbonStraps.querySelector('.u3d-strap-h-left') : null,
        hR: ribbonStraps ? ribbonStraps.querySelector('.u3d-strap-h-right') : null,
        vT: ribbonStraps ? ribbonStraps.querySelector('.u3d-strap-v-top') : null,
        vB: ribbonStraps ? ribbonStraps.querySelector('.u3d-strap-v-bottom') : null
    };
    Object.values(strapEls).forEach(s => {
        if (s) {
            s.style.transform = '';
            s.style.opacity = '1';
        }
    });

    // Chuẩn bị 2 lớp Canvas Vật Lý 3D (Giới hạn dpr <= 1.5 để đạt tốc độ 60-120fps mượt tuyệt đối trên điện thoại)
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let curVw = window.innerWidth;
    let curVh = window.innerHeight;
    canvasBack.width = Math.round(curVw * dpr);
    canvasBack.height = Math.round(curVh * dpr);
    canvasFront.width = Math.round(curVw * dpr);
    canvasFront.height = Math.round(curVh * dpr);
    const ctxBack = canvasBack.getContext('2d');
    const ctxFront = canvasFront.getContext('2d');

    // ĐO TỌA ĐỘ ĐÍCH #card-showcase & ĐỒNG BỘ TỶ LỆ RESPONSIVE (motionScale) VỚI KÍCH THƯỚC THIỆP TRÊN MỌI THIẾT BỊ
    let cachedTargetRect = null;
    let cachedEnvBaseW = 356;
    let motionScale = 1.0;
    function measureTargetShowcaseOnce() {
        curVw = window.innerWidth;
        curVh = window.innerHeight;
        if (cardShowcase) {
            cardShowcase.classList.remove('is-tilting');
            cardShowcase.style.transform = 'translate3d(0, 0, 0) scale(1)';
        }
        fitCardShowcaseToWrap();
        const rawRect = cardShowcase ? cardShowcase.getBoundingClientRect() : null;
        if (rawRect && rawRect.width > 40 && rawRect.height > rawRect.width * 1.3) {
            cachedTargetRect = {
                left: rawRect.left,
                top: rawRect.top,
                width: rawRect.width,
                height: rawRect.height
            };
        } else {
            const wrap = document.querySelector('.result-canvas-wrap');
            const wrapRect = wrap ? wrap.getBoundingClientRect() : null;
            if (wrapRect && wrapRect.width > 60 && wrapRect.height > 60) {
                const availW = wrapRect.width - 8;
                const availH = wrapRect.height - 6;
                let w = availH * FULL_CARD_ASPECT_RATIO;
                let h = availH;
                if (w > availW) {
                    w = availW;
                    h = availW / FULL_CARD_ASPECT_RATIO;
                }
                if (cardShowcase) {
                    cardShowcase.style.width = `${Math.floor(w)}px`;
                    cardShowcase.style.height = `${Math.floor(h)}px`;
                }
                cachedTargetRect = {
                    left: wrapRect.left + (wrapRect.width - w) * 0.5,
                    top: wrapRect.top + (wrapRect.height - h) * 0.5,
                    width: w,
                    height: h
                };
            } else {
                const fallbackH = Math.min(curVh * 0.72, 620);
                const fallbackW = fallbackH * FULL_CARD_ASPECT_RATIO;
                cachedTargetRect = {
                    left: (curVw - fallbackW) * 0.5,
                    top: (curVh - fallbackH) * 0.5,
                    width: fallbackW,
                    height: fallbackH
                };
            }
        }
        // Đồng bộ kích thước Phong Bì 3D (--u3d-env-w) và hệ số motionScale tỷ lệ thuận 100% với kích thước Thiệp thực tế!
        const idealEnvW = Math.round(Math.max(310, Math.min(curVw * 0.88, curVh * 0.66, cachedTargetRect.width * 1.26)));
        stage.style.setProperty('--u3d-env-w', `${idealEnvW}px`);
        cachedEnvBaseW = idealEnvW;
        motionScale = Math.max(0.85, Math.min(2.1, cachedEnvBaseW / 348));

        // Khóa cố định width/height của cardActor 1 lần duy nhất; mọi biến thiên kích thước dùng GPU scale()!
        cardActor.style.width = `${cachedTargetRect.width.toFixed(1)}px`;
        cardActor.style.height = `${cachedTargetRect.height.toFixed(1)}px`;
    }
    measureTargetShowcaseOnce();
    window.u3dRefreshTargetRect = measureTargetShowcaseOnce;

    // Các biến trạng thái Vật Lý 60fps:
    let summonStartTime = null;
    let arriveStartTime = null;
    let openStartTime = null;
    let lastFrameTime = null;
    let summonSpawnAccum = 0;
    let hasSpawnedArrivalStamp = false;

    if (skyOracleMode) {
        u3dCurrentDirectorState = 'sky_oracle';
        stage.classList.add('is-summoning');
        backRig.style.opacity = '0';
        frontRig.style.opacity = '0';
        frontRig.style.pointerEvents = 'none';
        if (sealBtn) {
            sealBtn.style.opacity = '0';
            sealBtn.style.pointerEvents = 'none';
            sealBtn.style.transform = 'translate3d(0, -40px, 0) scale(2.4)';
        }
    } else if (needSummonPrelude) {
        u3dCurrentDirectorState = 'summoning';
        stage.classList.add('is-summoning');
        backRig.style.opacity = '0';
        frontRig.style.opacity = '0';
        frontRig.style.pointerEvents = 'none';
        if (sealBtn) {
            sealBtn.style.opacity = '0';
            sealBtn.style.pointerEvents = 'none';
            sealBtn.style.transform = 'translate3d(0, -40px, 0) scale(2.4)';
        }
    } else if (!autoOpen) {
        u3dCurrentDirectorState = 'arriving';
        stage.classList.add('is-arriving');
        backRig.style.opacity = '0';
        frontRig.style.opacity = '0';
        frontRig.style.pointerEvents = 'none';
        if (sealBtn) {
            sealBtn.style.opacity = '0';
            sealBtn.style.pointerEvents = 'none';
            sealBtn.style.transform = 'translate3d(0, -40px, 0) scale(2.4)';
        }
    } else {
        u3dCurrentDirectorState = 'waiting';
        backRig.style.opacity = '1';
        frontRig.style.opacity = '1';
        frontRig.style.pointerEvents = 'none';
        if (sealBtn) {
            sealBtn.style.opacity = '1';
            sealBtn.style.pointerEvents = 'auto';
            sealBtn.style.transform = 'translate3d(0,0,0) scale(1)';
        }
    }

    u3dPointerTargetRotX = 0;
    u3dPointerTargetRotY = 0;
    u3dPointerCurRotX = 0;
    u3dPointerCurRotY = 0;

    // Biến vật lý Bản lề Nắp Thư (Damped Spring Oscillator)
    let flapAngle = 0;
    let flapVel = 0;

    // Danh sách thực thể Vật Lý 3D
    const particles = [];
    const rings3D = [];
    const ribbons3D = [];
    const escortButterflies = [];
    const escortFlowers = [];
    const summonRings = [];
    // ====== HỆ THỐNG ĐẠO DIỄN GÓC QUAY 3D GACHA 5 SAO (6 CHỦ ĐỀ HOA & LỤA LÃNG MẠN CHO PHÁI ĐẸP) ======
    const SKY_GACHA_THEMES = {
        bloom: {
            skyTopGlow: 'rgba(255, 226, 152, 0.56)',
            skyMidNebula: 'rgba(216, 58, 111, 0.36)',
            skyDeepVeil: 'rgba(8, 38, 30, 0.68)',
            beamCore: 'rgba(255, 245, 210, 1)',
            beamMid: 'rgba(255, 138, 178, 0.85)',
            beamEdge: 'rgba(216, 58, 111, 0.42)',
            cometAwakenCore: '#fffef5',
            cometAwakenHalo: '#ff5c8d',
            cometAwakenGold: '#ffd54f',
            trailHelixA: '#ff6f9c',
            trailHelixB: '#ffd54f',
            ringColorA: '#ffd54f',
            ringColorB: '#ff80ab',
            ringColorC: '#ffb2c9',
            petalMid: '#ff6f9c',
            petalEnd: '#ad1457',
            isSakura: false
        },
        butterflies: {
            skyTopGlow: 'rgba(255, 244, 178, 0.58)',
            skyMidNebula: 'rgba(16, 185, 129, 0.36)',
            skyDeepVeil: 'rgba(4, 34, 26, 0.72)',
            beamCore: 'rgba(255, 252, 218, 1)',
            beamMid: 'rgba(255, 213, 79, 0.88)',
            beamEdge: 'rgba(52, 211, 153, 0.46)',
            cometAwakenCore: '#fffff4',
            cometAwakenHalo: '#ffd54f',
            cometAwakenGold: '#34d399',
            trailHelixA: '#ffd54f',
            trailHelixB: '#34d399',
            ringColorA: '#ffe57f',
            ringColorB: '#6ee7b7',
            ringColorC: '#ffd54f',
            petalMid: '#ffd54f',
            petalEnd: '#d97706',
            isSakura: false
        },
        ribbon: {
            skyTopGlow: 'rgba(255, 238, 206, 0.56)',
            skyMidNebula: 'rgba(236, 72, 153, 0.35)',
            skyDeepVeil: 'rgba(12, 36, 30, 0.68)',
            beamCore: 'rgba(255, 248, 228, 1)',
            beamMid: 'rgba(244, 114, 182, 0.86)',
            beamEdge: 'rgba(251, 191, 36, 0.44)',
            cometAwakenCore: '#fffdf9',
            cometAwakenHalo: '#f472b6',
            cometAwakenGold: '#fbbf24',
            trailHelixA: '#f472b6',
            trailHelixB: '#fde68a',
            ringColorA: '#fde68a',
            ringColorB: '#f472b6',
            ringColorC: '#ffffff',
            petalMid: '#f48fb1',
            petalEnd: '#c2185b',
            isSakura: false
        },
        galaxy: {
            // 🌹 VƯỜN HỒNG PHÁP 3D (French Velvet Rose & Golden Dew)
            skyTopGlow: 'rgba(255, 228, 181, 0.60)',
            skyMidNebula: 'rgba(216, 27, 96, 0.42)',
            skyDeepVeil: 'rgba(26, 6, 16, 0.74)',
            beamCore: 'rgba(255, 250, 230, 1)',
            beamMid: 'rgba(244, 63, 94, 0.88)',
            beamEdge: 'rgba(251, 191, 36, 0.46)',
            cometAwakenCore: '#fffdf7',
            cometAwakenHalo: '#f43f5e',
            cometAwakenGold: '#ffd700',
            trailHelixA: '#fb7185',
            trailHelixB: '#ffd700',
            ringColorA: '#ffd700',
            ringColorB: '#fb7185',
            ringColorC: '#fda4af',
            petalMid: '#e11d48',
            petalEnd: '#881337',
            isSakura: false
        },
        sakura: {
            skyTopGlow: 'rgba(255, 240, 218, 0.60)',
            skyMidNebula: 'rgba(255, 164, 196, 0.38)',
            skyDeepVeil: 'rgba(9, 34, 30, 0.68)',
            beamCore: 'rgba(255, 250, 235, 1)',
            beamMid: 'rgba(255, 182, 208, 0.88)',
            beamEdge: 'rgba(255, 224, 130, 0.44)',
            cometAwakenCore: '#fff9fb',
            cometAwakenHalo: '#ffb2c9',
            cometAwakenGold: '#ffe082',
            trailHelixA: '#ffb2c9',
            trailHelixB: '#ffe082',
            ringColorA: '#ffb2c9',
            ringColorB: '#ffe082',
            ringColorC: '#ffdce8',
            petalMid: '#ffb2c9',
            petalEnd: '#e91e63',
            isSakura: true
        },
        hearts: {
            // 🌷 VƯỜN TULIP NẮNG MAI 3D (Sunlit Royal Tulip & Golden Pollen)
            skyTopGlow: 'rgba(255, 243, 196, 0.62)',
            skyMidNebula: 'rgba(251, 113, 133, 0.38)',
            skyDeepVeil: 'rgba(22, 12, 24, 0.70)',
            beamCore: 'rgba(255, 253, 240, 1)',
            beamMid: 'rgba(255, 138, 128, 0.88)',
            beamEdge: 'rgba(255, 213, 79, 0.48)',
            cometAwakenCore: '#fffef8',
            cometAwakenHalo: '#ff8a80',
            cometAwakenGold: '#ffd54f',
            trailHelixA: '#ff8a80',
            trailHelixB: '#ffd54f',
            ringColorA: '#ffe082',
            ringColorB: '#ff8a80',
            ringColorC: '#f8bbd0',
            petalMid: '#ff8a80',
            petalEnd: '#d81b60',
            isSakura: false
        }
    };
    const skyTheme = SKY_GACHA_THEMES[cfg.id] || SKY_GACHA_THEMES.bloom;

    // 3 Vòng Tinh Cầu 3D xoay quanh Cổng Trời Thiên Đỉnh (tọa độ thế giới 3D: x=0, y=-420, z=-920)
    const skyZenithRings = [
        { cx: 0, cy: -420, cz: -920, radius: 145 * motionScale, rx: 1.18, ry: 0.22, rz: 0, vrx: 0.65, vry: 1.75, vrz: 3.1, color: skyTheme.ringColorA, glowColor: '#f5c242', lineWidth: 2.6 * motionScale, dashed: false, alpha: 0.96 },
        { cx: 0, cy: -420, cz: -920, radius: 210 * motionScale, rx: -1.05, ry: 0.68, rz: 0.4, vrx: -1.35, vry: 1.05, vrz: -2.4, color: skyTheme.ringColorB, glowColor: '#d84b7e', lineWidth: 2.1 * motionScale, dashed: true, alpha: 0.88 },
        { cx: 0, cy: -420, cz: -920, radius: 275 * motionScale, rx: 0.92, ry: -0.82, rz: -0.5, vrx: 0.95, vry: -1.45, vrz: 2.1, color: skyTheme.ringColorC, glowColor: '#fb7185', lineWidth: 1.8 * motionScale, dashed: false, alpha: 0.82 }
    ];

    // Khởi tạo 96 Ngôi Sao Vũ Trụ 3D đa tầng chiều sâu (Parallax Depth Layers)
    const skyBgStars = [];
    for (let s = 0; s < 96; s++) {
        skyBgStars.push({
            x: (Math.random() - 0.5) * 2400,
            y: -1050 + Math.random() * 1850,
            z: -1600 + Math.random() * 1800,
            u: Math.random(),
            v: Math.random(),
            depthLayer: 0.28 + (s % 6) * 0.18,
            size: (1.4 + Math.random() * 3.2) * Math.sqrt(motionScale),
            twinklePhase: Math.random() * Math.PI * 2,
            twinkleSpeed: 3.0 + Math.random() * 5.0,
            isCross: s % 5 === 0,
            color: s % 3 === 0 ? skyTheme.ringColorA : (s % 3 === 1 ? '#ffffff' : skyTheme.ringColorB)
        });
    }

    // Khởi tạo 22 Tầng Biển Mây Khối 3D FBM (Volumetric FBM Cloud Sea & Diagonal Cloud Corridor)
    const skyClouds3D = [];
    for (let c = 0; c < 22; c++) {
        const layerT = c / 21;
        skyClouds3D.push({
            x: (c % 2 === 0 ? -1 : 1) * (140 + (c % 5) * 135) + (Math.random() - 0.5) * 140,
            y: -460 + layerT * 680 + (Math.random() - 0.5) * 60,
            z: -1200 + layerT * 1320,
            u: (c / 22 + Math.random() * 0.08) % 1,
            v: 0.08 + (c % 7) * 0.13 + (Math.random() - 0.5) * 0.05,
            depthLayer: 0.45 + (c % 5) * 0.28,
            w: (480 + (c % 4) * 135) * motionScale,
            h: (270 + (c % 4) * 75) * motionScale,
            driftSpd: (c % 2 === 0 ? 1 : -1) * (20 + (c % 4) * 8),
            variant: c % 3 === 0 ? 'gold' : 'primary',
            alpha: 0.48 + (c % 3) * 0.14
        });
    }

    // Khởi tạo 58 Vệt Xé Gió Chéo Gacha
    const skySpeedLines = [];
    for (let l = 0; l < 58; l++) {
        const ang = (l / 58) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
        const rad = 110 + Math.random() * 420;
        skySpeedLines.push({
            ang,
            rad,
            u: Math.random(),
            laneOffset: (Math.random() - 0.5) * 1.35,
            zOffset: Math.random() * 1400,
            speed: 1850 + Math.random() * 1350,
            len: (190 + Math.random() * 290) * motionScale,
            thickness: (1.2 + Math.random() * 2.4) * Math.sqrt(motionScale),
            color: l % 3 === 0 ? '#ffffff' : (l % 3 === 1 ? skyTheme.trailHelixA : '#ffd700')
        });
    }

    const skyMeteorTrailPts = [];
    const skyRipples = [];
    const skyShockwaves = [];
    let skyRippleAccum = 0.48;
    let skyParticleAccum = 0;
    let skyWhipScrollDist = 0;
    let hasTriggeredZenithFlash = false;
    let hasTriggeredCut2Flash = false;
    let hasTriggeredAwakeningBoom = false;
    let hasTriggeredCut3Flash = false;
    let hasTriggeredLensCrash = false;
    let hasTriggeredImpactSupernova = false;
    let hasSpawnedSealBreak = false;
    let hasSpawnedMainBurst = false;
    let hasHandedOffCard = false;
    let streamSpawnAccum = 0;
    let windupSpawnAccum = 0;
    let isClipPathNone = false;

    // Mốc thời gian Đạo Diễn lúc mở bì thư:
    const WINDUP_END = 0.88;
    const EXTRACT_START = 0.98;
    const EXTRACT_END = 2.32;
    const PRESENT_END = 2.94;

    // Khởi tạo 14 hạt đom đóm / ánh sao lơ lửng nhẹ quanh phong bì lúc chờ mở (Scale theo kích thước Phong Bì!)
    for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * Math.PI * 2;
        const radX = (140 + (i % 3) * 42) * motionScale;
        const radY = (105 + (i % 4) * 30) * motionScale;
        particles.push({
            type: i % 3 === 0 ? 'star' : 'bokeh',
            hasTrail: false,
            x: Math.cos(ang) * radX,
            y: Math.sin(ang) * radY,
            z: (Math.random() - 0.5) * 160,
            vx: (Math.random() - 0.5) * 16 * motionScale,
            vy: (-12 - Math.random() * 16) * motionScale,
            vz: (Math.random() - 0.5) * 18,
            gravity: -6,
            drag: 0.2,
            vortex: 0.4,
            flutter: 22 * motionScale,
            phase: Math.random() * Math.PI * 2,
            size: (i % 3 === 0 ? (6 + Math.random() * 4) : (9 + Math.random() * 9)) * motionScale,
            bokehColor: i % 2 === 0 ? 'rgba(255, 232, 156, 0.42)' : 'rgba(255, 182, 208, 0.38)',
            rx: 0, ry: 0, rz: Math.random() * 6,
            vrx: 0, vry: 0, vrz: 1.5,
            alpha: 0.85,
            life: 0,
            maxLife: 12
        });
    }

    // Khởi tạo hàm kích hoạt mở phong bì vật lý 3D (CHỈ cho phép mở khi đã ở trạng thái 'waiting' và ảnh đã sẵn sàng 100%)
    const startEnvelopePhysicsOpen = () => {
        if (u3dCurrentDirectorState !== 'waiting') return;
        if (isRealRecipient && !window.isRecipientCardImageReady) return;
        beginOpenSequence();
    };

    function beginOpenSequence() {
        if (u3dCurrentDirectorState === 'opening') return;
        measureTargetShowcaseOnce();
        u3dCurrentDirectorState = 'opening';
        openStartTime = performance.now();
        stage.classList.add('is-opening');
        if (frontRig) frontRig.style.pointerEvents = 'none';
        if (sealBtn) sealBtn.style.pointerEvents = 'none';
    }

    u3dTriggerOpenFn = startEnvelopePhysicsOpen;

    if (autoOpen && u3dCurrentDirectorState === 'waiting') {
        u3dAutoOpenTimerId = setTimeout(() => {
            startEnvelopePhysicsOpen();
        }, autoOpenDelay);
    }

    // ====== BỘ PHÉP CHIẾU CAMERA ĐIỆN ẢNH 3D (VIRTUAL 3D CINEMATIC CAMERA RIG) ======
    function project3DWithCam(wx, wy, wz, cam, screenCx, screenCy) {
        let dx = wx - cam.x;
        let dy = wy - cam.y;
        let dz = wz - cam.z;

        if (cam.yaw !== 0) {
            const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
            const nx = dx * cy - dz * sy;
            const nz = dx * sy + dz * cy;
            dx = nx;
            dz = nz;
        }
        if (cam.pitch !== 0) {
            const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
            const ny = dy * cp - dz * sp;
            const nz = dy * sp + dz * cp;
            dy = ny;
            dz = nz;
        }
        if (cam.roll !== 0) {
            const cr = Math.cos(cam.roll), sr = Math.sin(cam.roll);
            const nx = dx * cr - dy * sr;
            const ny = dx * sr + dy * cr;
            dx = nx;
            dy = ny;
        }

        const depth = cam.fov - dz;
        if (depth <= 65) return null;
        const scale = cam.fov / depth;
        return {
            sx: screenCx + dx * scale + (cam.shakeX || 0),
            sy: screenCy + dy * scale + (cam.shakeY || 0),
            scale,
            depth,
            cz: dz
        };
    }

    // ====== KỊCH BẢN ONE-SHOT CAMERA LIỀN MẠCH CÓ SPEED-RAMPING (6.20 GIÂY - KHÔNG HARD CUT!) ======
    // Pha 1 (0.00s -> 1.45s): Bức Ảnh Chữ Nhật cuộn hoá thành Lõi Sao (Slow-Mo 0.42x) rồi bay vút lên Cổng Trời Thiên Đỉnh (Fast 1.82x)
    // Pha 2 (1.45s -> 2.65s): Lõi Sao chạm Cổng Trời, nhận Lời Chúc Vàng 5 Sao & uốn vòng cung 180° (Apex U-Turn) trong Bullet-Time Slow-Mo (0.28x)
    // Pha 3 (2.65s -> 4.85s): Máy quay tăng tốc vượt mặt & BỌC QUA ĐẦU SAO (Front-Lead Orbit), luôn nhìn ngược về Đầu Sao để quay trọn cả Đầu Sao lẫn Biển Mây 3D cuồn cuộn phía dưới (Nhanh 1.78x -> Chậm 0.34x -> Nhanh 1.92x)
    // Pha 4 (4.85s -> 6.20s): Sao băng 5 Sao lao tới tâm ống kính và mở tung từ Lõi Sao thành Lá Thư Ánh Kim trước khi gói vào Phong Bì 3D!
    function computeSkyGachaCamera(elapsed) {
        const cam = {
            x: 0, y: 0, z: 0,
            pitch: 0, yaw: 0, roll: 0,
            fov: 700,
            shakeX: 0, shakeY: 0,
            cut: 1,
            zoom: 1.0,
            whipSpeedMult: 1.0,
            orbitBlend: 0
        };

        if (elapsed < 1.45) {
            cam.cut = 1;
            // 0.00s -> 0.50s: Slow-Mo (0.42x) ngắm Bức Ảnh cuộn thành Lõi Sao; 0.50s -> 1.45s: Speed-Ramp (1.82x) Tilt-Up mượt mà theo Sao bay lên Cổng Trời!
            const p = Math.max(0, Math.min(1, (elapsed - 0.36) / 1.09));
            const whipEase = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
            cam.whipSpeedMult = elapsed < 0.48 ? 0.42 : (0.42 + 1.40 * Math.sin(p * Math.PI * 0.5));
            cam.x = Math.sin(elapsed * 2.2) * 10 * (1 - whipEase);
            cam.y = 48 - 102 * whipEase;
            cam.z = 115 - 175 * whipEase;
            cam.pitch = 0.15 - 0.53 * whipEase; // Từ +0.15 (nhìn ngang biển mây) ngước mượt lên -0.38 (Cổng Trời Thiên Đỉnh)
            cam.roll = -0.035 * Math.sin(p * Math.PI);
            cam.fov = 680 + 60 * whipEase;
        } else if (elapsed < 2.65) {
            cam.cut = 2;
            // PHA 2 (1.45s -> 2.65s): ĐỈNH TRỜI BULLET-TIME SLOW-MOTION & VÒNG CUNG U-TURN 180° (KHÔNG CẮT CẢNH!)
            const p = (elapsed - 1.45) / 1.20; // 0 -> 1
            const smoothP = p * p * (3 - 2 * p);
            // Speed-Ramp: Chậm lại ở đỉnh cổng trời (1.55s -> 2.15s: 0.28x) để ngắm Sao nhận Phép Màu Vàng 5 Sao & uốn vòng cung 180°, sau đó tăng tốc lao xuống!
            if (elapsed < 2.15) {
                cam.whipSpeedMult = 0.28;
            } else {
                const accelP = (elapsed - 2.15) / 0.50;
                cam.whipSpeedMult = 0.28 + 1.50 * (accelP * accelP);
            }
            cam.x = Math.sin(smoothP * Math.PI) * 26;
            cam.y = -54 + 34 * smoothP;
            cam.z = -60 + 40 * smoothP;
            // Máy quay nâng nhẹ lên đỉnh rồi nghiêng dần theo vòng cung U-Turn của ngôi sao
            cam.pitch = -0.38 + 0.22 * smoothP;
            cam.roll = -0.07 * Math.sin(smoothP * Math.PI);
            cam.fov = 740 - 30 * smoothP;
            cam.zoom = 1.0 + 0.28 * Math.sin(smoothP * Math.PI);

            if (elapsed >= 1.88 && elapsed < 2.32) {
                const damper = Math.pow(1 - (elapsed - 1.88) / 0.44, 2);
                cam.shakeX = Math.sin(elapsed * 135) * 12 * damper;
                cam.shakeY = Math.cos(elapsed * 120) * 10 * damper;
            }
        } else if (elapsed < 4.85) {
            cam.cut = 3;
            // PHA 3 (2.65s -> 4.85s): MÁY QUAY VƯỢT MẶT & BỌC QUA ĐẦU SAO (FRONT-LEAD ORBIT), LUÔN NHÌN VỀ ĐẦU SAO & CẢNH VẬT BIỂN MÂY PHÍA DƯỚI!
            const p = (elapsed - 2.65) / 2.20; // 0 -> 1
            // orbitBlend: 0 -> 1 trong 0.65s đầu (2.65s -> 3.30s) khi máy quay vượt lên bọc qua mũi sao băng!
            const orbitP = Math.min(1, (elapsed - 2.65) / 0.68);
            cam.orbitBlend = orbitP * orbitP * (3 - 2 * orbitP);

            // Speed-Ramping Nghệ Thuật:
            // - 2.65s -> 3.32s: Tăng tốc vượt mặt & bọc đầu sao (1.78x)
            // - 3.32s -> 4.18s: Slow-Motion Điện Ảnh (0.34x) cận cảnh đối diện Đầu Sao 5 Sao & Biển Mây Khối 3D cuồn cuộn phía dưới
            // - 4.18s -> 4.85s: Vọt tốc độ cao (1.92x) lao về điểm kết tinh!
            if (elapsed < 3.32) {
                cam.whipSpeedMult = 1.78;
                cam.zoom = 1.12 + 0.52 * cam.orbitBlend;
            } else if (elapsed < 4.18) {
                const slowP = (elapsed - 3.32) / 0.86;
                cam.whipSpeedMult = 0.34 + 0.12 * Math.cos(slowP * Math.PI);
                cam.zoom = 1.64 + 0.14 * Math.sin(slowP * Math.PI);
            } else {
                const fastP = (elapsed - 4.18) / 0.67;
                cam.whipSpeedMult = 0.46 + 1.48 * (fastP * fastP);
                cam.zoom = 1.64 - 0.48 * (fastP * fastP);
            }

            cam.pitch = -0.16 + 0.28 * cam.orbitBlend;
            cam.roll = 0.16 * Math.sin(p * Math.PI * 2);
            cam.fov = 710;
            cam.shakeX = Math.sin(elapsed * 78) * (2.4 * Math.min(1.2, cam.whipSpeedMult));
            cam.shakeY = Math.cos(elapsed * 72) * (2.0 * Math.min(1.2, cam.whipSpeedMult));
        } else {
            cam.cut = 4;
            // PHA 4 (4.85s -> 6.20s): ĐÓN ĐẦU SAO BĂNG TẠI TÂM ỐNG KÍNH & MỞ TUNG THÀNH LÁ THƯ ÁNH KIM (STAR-TO-LETTER UNVEIL)
            const p = (elapsed - 4.85) / 1.35;
            const settleEase = Math.min(1, p / 0.35);
            cam.orbitBlend = 1 - settleEase * 0.5;
            cam.x = 0;
            cam.y = 0;
            cam.z = 0;
            cam.pitch = 0.12 * (1 - settleEase);
            cam.roll = 0;
            cam.fov = 690;
            cam.whipSpeedMult = elapsed < 5.26 ? 1.65 : 0.35;
            if (elapsed < 5.26) {
                const cp = (elapsed - 4.85) / 0.41;
                const tremor = cp * cp * 10;
                cam.shakeX = Math.sin(elapsed * 135) * tremor;
                cam.shakeY = Math.cos(elapsed * 120) * tremor;
            } else if (elapsed < 5.62) {
                const damper = Math.pow(1 - (elapsed - 5.26) / 0.36, 2);
                cam.shakeX = Math.sin(elapsed * 125) * 14 * damper;
                cam.shakeY = Math.cos(elapsed * 110) * 11 * damper;
            }
        }
        return cam;
    }

    // ====== THấu KÍNH QUANG HỌC ANAMORPHIC & LỤC GIÁC GENSHIN (HDR ADDITIVE OPTICAL LENS FLARE) ======
    function drawGenshinOpticalLensFlare(ctx, fx, fy, screenCx, screenCy, intensity, isGold5Star, scaleMult = 1) {
        if (intensity <= 0.02) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const primaryHex = isGold5Star ? '#ffd700' : '#38bdf8';
        const secondaryHex = isGold5Star ? skyTheme.cometAwakenHalo : '#c084fc';
        const coreWhite = isGold5Star ? '#fffef2' : '#e0f7fa';

        // 1. Tia chớp ngang Anamorphic xuyên màn hình (Horizontal Anamorphic Streak)
        const streakW = (isGold5Star ? 460 : 290) * scaleMult * (0.7 + 0.3 * intensity);
        const streakH = (isGold5Star ? 8.5 : 5.2) * scaleMult;
        const hGrad = ctx.createRadialGradient(fx, fy, 1, fx, fy, streakW);
        hGrad.addColorStop(0, coreWhite);
        hGrad.addColorStop(0.18, primaryHex);
        hGrad.addColorStop(0.55, isGold5Star ? 'rgba(255, 160, 0, 0.32)' : 'rgba(56, 189, 248, 0.28)');
        hGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.globalAlpha = Math.min(1, intensity * 0.95);
        ctx.save();
        ctx.translate(fx, fy);
        ctx.scale(1, streakH / streakW);
        ctx.fillStyle = hGrad;
        ctx.beginPath();
        ctx.arc(0, 0, streakW, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 2. Tia chớp chéo chữ X sắc lẹm (4-Point Starburst Spikes)
        for (let k = 0; k < 2; k++) {
            ctx.save();
            ctx.translate(fx, fy);
            ctx.rotate(k === 0 ? -0.66 : 0.91);
            const diagW = streakW * (k === 0 ? 0.58 : 0.38);
            const diagH = streakH * 0.55;
            ctx.scale(1, diagH / diagW);
            ctx.globalAlpha = Math.min(1, intensity * 0.72);
            ctx.fillStyle = hGrad;
            ctx.beginPath();
            ctx.arc(0, 0, diagW, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 3. Chuỗi 6 Bóng Ma Thấu Kính Lục Giác (Hexagonal Aperture Ghost Reflections) dọc trục tâm ống kính
        const axisDx = screenCx - fx;
        const axisDy = screenCy - fy;
        const ghostFactors = [-0.28, 0.35, 0.68, 1.15, 1.52, 1.95];
        const ghostRadii = [22, 14, 34, 18, 46, 28];
        for (let g = 0; g < ghostFactors.length; g++) {
            const gf = ghostFactors[g];
            const gx = fx + axisDx * gf;
            const gy = fy + axisDy * gf;
            const gr = ghostRadii[g] * scaleMult;
            ctx.save();
            ctx.translate(gx, gy);
            ctx.rotate(gf * 1.4);
            ctx.globalAlpha = Math.min(1, intensity * (g % 2 === 0 ? 0.26 : 0.18));
            ctx.fillStyle = g % 2 === 0 ? primaryHex : secondaryHex;
            ctx.strokeStyle = coreWhite;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            for (let v = 0; v < 6; v++) {
                const va = (v / 6) * Math.PI * 2;
                const vx = Math.cos(va) * gr;
                const vy = Math.sin(va) * gr;
                if (v === 0) ctx.moveTo(vx, vy);
                else ctx.lineTo(vx, vy);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();
    }

    // ====== DẢI ĐUÔI SAO BĂNG PLASMA 3 LỚP VUỐT NHỌN HDR (3-LAYER TAPERED HDR PLASMA COMET RIBBON) ======
    function drawGenshinTaperedCometRibbon(ctx, headX, headY, tailDirX, tailDirY, tailLen, headRadius, elapsed, isGold5Star) {
        const atlas = getU3DLuxurySpriteAtlas();
        const perpX = -tailDirY;
        const perpY = tailDirX;
        const segments = 28;

        const spinePts = [];
        for (let i = 0; i <= segments; i++) {
            const u = i / segments; // 0 = tại đầu sao băng, 1 = chót đuôi xa tắp
            const dist = u * tailLen;
            // Sóng nhiễu động FBM Plasma cuộn dọc theo thân đuôi sao băng
            const wave = Math.sin(u * 11.5 - elapsed * 24.0) * (u * 22) + Math.cos(u * 6.2 - elapsed * 15.0) * (u * 12);
            spinePts.push({
                x: headX + tailDirX * dist + perpX * wave,
                y: headY + tailDirY * dist + perpY * wave,
                u
            });
        }

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Ba lớp dải lụa năng lượng vuốt nhọn (Tapered Polygon Strips):
        // Lớp 0: Hào quang Tinh Vân Nguyên Tố rộng ngoài cùng
        // Lớp 1: Thân Plasma Hoàng Kim 24K / Thiên Thanh rực cháy ở giữa
        // Lớp 2: Lõi Laser Trắng Kim Cương sắc lẹm ở chính tâm
        const layers = [
            {
                widthMult: 2.35,
                alpha: 0.44,
                c0: isGold5Star ? skyTheme.cometAwakenHalo : '#a855f7',
                c1: isGold5Star ? skyTheme.trailHelixA : '#38bdf8',
                c2: 'rgba(0, 0, 0, 0)'
            },
            {
                widthMult: 1.18,
                alpha: 0.85,
                c0: isGold5Star ? '#ffd700' : '#38bdf8',
                c1: isGold5Star ? '#ff9900' : '#6366f1',
                c2: 'rgba(0, 0, 0, 0)'
            },
            {
                widthMult: 0.42,
                alpha: 0.98,
                c0: '#ffffff',
                c1: isGold5Star ? '#fff6b3' : '#bae6fd',
                c2: 'rgba(0, 0, 0, 0)'
            }
        ];

        const endPt = spinePts[segments];
        for (let l = 0; l < layers.length; l++) {
            const ly = layers[l];
            const grad = ctx.createLinearGradient(headX, headY, endPt.x, endPt.y);
            grad.addColorStop(0, ly.c0);
            grad.addColorStop(0.42, ly.c1);
            grad.addColorStop(1, ly.c2);

            ctx.globalAlpha = ly.alpha;
            ctx.fillStyle = grad;
            ctx.beginPath();
            for (let i = 0; i <= segments; i++) {
                const pt = spinePts[i];
                const taper = Math.pow(1 - pt.u, 0.72) * (0.9 + 0.1 * Math.sin(pt.u * 18 - elapsed * 28));
                const halfW = headRadius * ly.widthMult * taper;
                const lx = pt.x + perpX * halfW;
                const lyPos = pt.y + perpY * halfW;
                if (i === 0) ctx.moveTo(lx, lyPos);
                else ctx.lineTo(lx, lyPos);
            }
            for (let i = segments; i >= 0; i--) {
                const pt = spinePts[i];
                const taper = Math.pow(1 - pt.u, 0.72) * (0.9 + 0.1 * Math.sin(pt.u * 18 - elapsed * 28));
                const halfW = headRadius * ly.widthMult * taper;
                const rx = pt.x - perpX * halfW;
                const ryPos = pt.y - perpY * halfW;
                ctx.lineTo(rx, ryPos);
            }
            ctx.closePath();
            ctx.fill();
        }

        // 2 Dải Xoắn Kép Lụa Ánh Sáng (Double-Helix Energy Ribbons) quấn quanh đuôi sao băng
        for (let strand = 0; strand < 2; strand++) {
            ctx.beginPath();
            for (let i = 0; i <= segments; i++) {
                const pt = spinePts[i];
                const helixPhase = pt.u * 15.0 - elapsed * 22.0 + strand * Math.PI;
                const amp = headRadius * 1.45 * Math.pow(1 - pt.u, 0.65) * Math.sin(helixPhase);
                const hx = pt.x + perpX * amp;
                const hy = pt.y + perpY * amp;
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.globalAlpha = 0.78;
            ctx.strokeStyle = strand === 0 ? (isGold5Star ? '#fffef0' : '#e0f7fa') : (isGold5Star ? skyTheme.trailHelixB : '#f472b6');
            ctx.lineWidth = Math.max(1.5, headRadius * 0.16);
            ctx.stroke();
        }

        ctx.restore();

        // Đính các thực thể 3D Hoa & Lụa (Hoa Trà, Hồng Pháp, Hoa Tulip, Anh Đào, Ngọc Trai, Hồ Điệp) cuốn dọc theo luồng khí xoáy của đuôi sao băng!
        ctx.save();
        for (let i = 2; i < segments; i += 3) {
            const pt = spinePts[i];
            const swirl = Math.cos(pt.u * 14 - elapsed * 20 + i) * headRadius * 1.15 * (1 - pt.u * 0.6);
            const sx = pt.x + perpX * swirl;
            const sy = pt.y + perpY * swirl;
            const spSize = Math.max(6, headRadius * 0.52 * (1 - pt.u * 0.65));
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(elapsed * 8 + i * 1.3);
            ctx.globalAlpha = (1 - pt.u) * 0.92;
            if (cfg.id === 'bloom' || cfg.id === 'sakura') {
                const spr = cfg.id === 'sakura' ? atlas.sakuraPetal : atlas.camelliaPetal;
                ctx.drawImage(spr, -spSize, -spSize, spSize * 2, spSize * 2);
            } else if (cfg.id === 'galaxy') {
                const spr = i % 2 === 0 ? atlas.rosePetal : atlas.roseBloom;
                ctx.drawImage(spr, -spSize, -spSize, spSize * 2, spSize * 2);
            } else if (cfg.id === 'hearts') {
                const spr = i % 2 === 0 ? atlas.tulipPetal : atlas.tulipBloom;
                ctx.drawImage(spr, -spSize, -spSize, spSize * 2, spSize * 2);
            } else if (cfg.id === 'ribbon') {
                ctx.drawImage(atlas.pearl, -spSize * 0.65, -spSize * 0.65, spSize * 1.3, spSize * 1.3);
            } else if (cfg.id === 'butterflies') {
                const wingSpr = isGold5Star ? atlas.butterflyWingGold : atlas.butterflyWingRose;
                ctx.drawImage(wingSpr, -spSize, -spSize, spSize * 2, spSize * 2);
            }
            ctx.restore();
        }
        ctx.restore();
    }

    // Vẽ bầu trời 3D One-Shot, Biển Mây Khối FBM Celestia phía dưới, Cổng Trời Thiên Đỉnh & Hiện tượng Thiên Văn đặc trưng của 6 Chủ Đề 3D
    function drawHeavenlySkyBeamsAndPortal(ctxB, ctxF, elapsed, intensity, screenCx, screenCy, vw, vh, camOverride) {
        if (intensity <= 0.01) return;
        const atlas = getU3DLuxurySpriteAtlas();
        const cam = camOverride || { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0, fov: 700, shakeX: 0, shakeY: 0, cut: 1, zoom: 1.0, orbitBlend: 0 };
        const gateProj = project3DWithCam(0, -420, -920, cam, screenCx, screenCy) || { sx: screenCx, sy: vh * 0.16, scale: 0.44 };
        // Ở Pha 3 (khi máy quay bọc qua đầu sao nhìn ngược lên đầu sao và biển mây phía dưới), Cổng Trời nằm ở phía trên đầu sao băng!
        const orbitBlend = cam.orbitBlend || 0;
        const skyCx = gateProj.sx * (1 - orbitBlend * 0.35) + (vw * 0.56) * (orbitBlend * 0.35);
        const skyCy = gateProj.sy * (1 - orbitBlend * 0.45) + (vh * 0.14) * (orbitBlend * 0.45);

        // 1. Nền vòm trời đêm vũ trụ 3D sâu thẳm & tinh vân theo từng chủ đề (ctxBack)
        ctxB.save();
        const skyVeilGrad = ctxB.createRadialGradient(skyCx, skyCy, 14, screenCx, vh * 0.5, Math.max(vw, vh) * 0.96);
        skyVeilGrad.addColorStop(0, skyTheme.skyTopGlow);
        skyVeilGrad.addColorStop(0.30, skyTheme.skyMidNebula);
        skyVeilGrad.addColorStop(0.66, `rgba(6, 28, 38, ${(0.76 * intensity).toFixed(3)})`);
        skyVeilGrad.addColorStop(1, skyTheme.skyDeepVeil);
        ctxB.globalAlpha = intensity;
        ctxB.fillStyle = skyVeilGrad;
        ctxB.fillRect(0, 0, vw, vh);

        // 1B. Hiện tượng Bầu Trời Độc Bản có Texture cao cấp theo từng Chủ Đề 3D
        if (cfg.id === 'sakura') {
            const moonDrawR = Math.min(vw, vh) * 0.25 * (0.85 + gateProj.scale * 0.5);
            ctxB.save();
            ctxB.globalAlpha = intensity * 0.94;
            ctxB.drawImage(atlas.fullMoon, skyCx - moonDrawR, skyCy - moonDrawR * 0.78, moonDrawR * 2, moonDrawR * 2);
            ctxB.restore();
        } else if (cfg.id === 'butterflies') {
            ctxB.save();
            ctxB.globalCompositeOperation = 'lighter';
            for (let a = 0; a < 3; a++) {
                ctxB.globalAlpha = (0.32 - a * 0.07) * intensity;
                ctxB.strokeStyle = a % 2 === 0 ? '#34d399' : '#ffd54f';
                ctxB.lineWidth = (46 - a * 9) * gateProj.scale * 1.8 * motionScale;
                ctxB.lineCap = 'round';
                ctxB.beginPath();
                const baseY = skyCy + (a - 1) * 48 * motionScale;
                ctxB.moveTo(0, baseY + Math.sin(elapsed * 1.8 + a) * 35);
                ctxB.bezierCurveTo(
                    vw * 0.33, baseY - 70 * Math.cos(elapsed * 1.4 + a),
                    vw * 0.66, baseY + 70 * Math.sin(elapsed * 1.6 + a),
                    vw, baseY - Math.cos(elapsed * 1.5 + a) * 35
                );
                ctxB.stroke();
            }
            ctxB.restore();
        } else if (cfg.id === 'galaxy') {
            // 🌹 Vòm Cực Quang Hồng Ngọc & Sương Vàng Ban Mai (Velvet Rose Aurora)
            ctxB.save();
            ctxB.globalCompositeOperation = 'lighter';
            for (let a = 0; a < 3; a++) {
                ctxB.globalAlpha = (0.28 - a * 0.06) * intensity;
                ctxB.strokeStyle = a % 2 === 0 ? '#fb7185' : '#ffd54f';
                ctxB.lineWidth = (42 - a * 8) * gateProj.scale * 1.75 * motionScale;
                ctxB.lineCap = 'round';
                ctxB.beginPath();
                const baseY = skyCy + (a - 1) * 44 * motionScale;
                ctxB.moveTo(0, baseY + Math.cos(elapsed * 1.6 + a) * 32);
                ctxB.bezierCurveTo(
                    vw * 0.35, baseY - 64 * Math.sin(elapsed * 1.3 + a),
                    vw * 0.65, baseY + 64 * Math.cos(elapsed * 1.5 + a),
                    vw, baseY - Math.sin(elapsed * 1.4 + a) * 32
                );
                ctxB.stroke();
            }
            ctxB.restore();
        } else if (cfg.id === 'hearts') {
            // 🌷 Cột Nắng Sớm Ban Mai Hoàng Kim & Hồng Đào (Sunlit Tulip Golden Sunbeams)
            ctxB.save();
            ctxB.globalCompositeOperation = 'lighter';
            for (let c = -2; c <= 2; c++) {
                const px = skyCx + c * vw * 0.14;
                const pilH = vh * (0.48 - Math.abs(c) * 0.06);
                const pilW = (24 - Math.abs(c) * 3) * motionScale * (0.85 + 0.15 * Math.sin(elapsed * 4 + c));
                const pilGrad = ctxB.createLinearGradient(px, skyCy - 40, px, skyCy + pilH);
                pilGrad.addColorStop(0, `rgba(255, 243, 196, ${(0.58 * intensity).toFixed(3)})`);
                pilGrad.addColorStop(0.5, `rgba(255, 138, 128, ${(0.30 * intensity).toFixed(3)})`);
                pilGrad.addColorStop(1, 'rgba(255, 243, 196, 0)');
                ctxB.fillStyle = pilGrad;
                ctxB.fillRect(px - pilW * 0.5, skyCy - 40, pilW, pilH);
            }
            ctxB.restore();
        }

        const primaryCloudSprite = (cfg.id === 'butterflies') ? atlas.cloudEmerald : atlas.cloudRose;

        // ====== PHA 3 (2.65s -> 4.85s): GÓC MÁY BỌC QUA ĐẦU SAO NHÌN NGƯỢC VỀ ĐẦU SAO & TOÀN CẢNH BIỂN MÂY 3D CUỒN CUỘN PHÍA DƯỚI! ======
        if (cam.cut === 3) {
            const isGoldNow = true;

            // 1. Vẽ 96 Ngôi Sao Vũ Trụ lao vút từ dưới lên trên tạo cảm giác Đầu Sao đang bổ nhào xuống thế giới bên dưới!
            ctxB.save();
            ctxB.globalCompositeOperation = 'lighter';
            for (let s = 0; s < skyBgStars.length; s++) {
                const st = skyBgStars[s];
                const laneX = (st.v - 0.5) * vw * 1.25;
                const flowY = vh - ((st.u * vh * 1.3 + skyWhipScrollDist * st.depthLayer * 0.48) % (vh * 1.3));
                const sx = screenCx + laneX + (cam.shakeX || 0);
                const sy = flowY + (cam.shakeY || 0);
                if (sx < -40 || sx > vw + 40 || sy < -40 || sy > vh + 40) continue;

                const streakLen = Math.max(4, 26 * st.depthLayer * cam.whipSpeedMult);
                ctxB.globalAlpha = Math.min(1, intensity * (0.45 + 0.45 * st.depthLayer));
                ctxB.strokeStyle = s % 2 === 0 ? '#ffe57f' : st.color;
                ctxB.lineWidth = Math.max(1.0, st.size * 0.68 * st.depthLayer);
                ctxB.beginPath();
                ctxB.moveTo(sx, sy);
                ctxB.lineTo(sx - laneX * 0.04, sy + streakLen);
                ctxB.stroke();
            }
            ctxB.restore();

            // 2. Vẽ Thung Lũng Biển Mây Khối 3D FBM Phía Dưới Đầu Sao
            for (let c = 0; c < skyClouds3D.length; c++) {
                const cl = skyClouds3D[c];
                const cycle = ((cl.u + (skyWhipScrollDist * 0.00038 * cl.depthLayer)) % 1);
                const persp = 0.42 + cycle * 1.15;
                const sideSign = c % 2 === 0 ? -1 : 1;
                const cx = screenCx + sideSign * (0.12 + Math.abs(cl.v - 0.5) * 0.85) * vw * persp + (cam.shakeX || 0);
                const cy = vh * (0.98 - cycle * 0.72) + (cam.shakeY || 0);
                const cw = cl.w * (0.48 + cl.depthLayer * 0.55) * persp;
                const ch = cl.h * (0.48 + cl.depthLayer * 0.55) * persp;
                if (cx + cw * 0.5 < -90 || cx - cw * 0.5 > vw + 90 || cy + ch * 0.5 < -90 || cy - ch * 0.5 > vh + 90) continue;

                const targetCtx = (c % 5 === 0 && cycle > 0.62) ? ctxF : ctxB;
                targetCtx.save();
                targetCtx.translate(cx, cy);
                targetCtx.rotate(-cam.roll * 0.55);
                targetCtx.globalAlpha = Math.min(1, cl.alpha * intensity * Math.sin(cycle * Math.PI) * (targetCtx === ctxF ? 0.58 : 0.92));
                const spr = (isGoldNow && (cl.variant === 'gold' || c % 2 === 0)) ? atlas.cloudGold : primaryCloudSprite;
                targetCtx.drawImage(spr, -cw * 0.5, -ch * 0.5, cw, ch);
                targetCtx.restore();
            }
            ctxB.restore();
            return;
        }

        // ====== PHA 1, PHA 2 & PHA 4: BIỂN MÂY KHỐI FBM CELESTIA (3D CLOUD SEA HORIZON) & CỔNG TRỜI THIÊN ĐỈNH ======
        const horizonY = screenCy + (cam.pitch + 0.08) * vh * 1.45;

        // Vẽ 22 Tầng Mây Khối FBM trải dài tạo thành Đại Hải Vân Celestia
        for (let c = 0; c < skyClouds3D.length; c++) {
            const cl = skyClouds3D[c];
            const curX = cl.x + Math.sin(elapsed * 0.55 + c) * cl.driftSpd;
            const pr = project3DWithCam(curX, cl.y, cl.z, cam, screenCx, screenCy);
            if (!pr) continue;
            const cw = cl.w * pr.scale * 1.15;
            const ch = cl.h * pr.scale * 1.10;
            if (pr.sx + cw < -60 || pr.sx - cw > vw + 60 || pr.sy + ch < -60 || pr.sy - ch > vh + 60) continue;

            ctxB.save();
            ctxB.translate(pr.sx, pr.sy);
            ctxB.rotate(-cam.roll * 0.75);
            ctxB.globalAlpha = Math.min(1, cl.alpha * intensity);
            const sprite = (cl.variant === 'gold' || elapsed >= 4.80) ? atlas.cloudGold : primaryCloudSprite;
            ctxB.drawImage(sprite, -cw * 0.5, -ch * 0.5, cw, ch);
            ctxB.restore();
        }

        // Vẽ Dải Đại Hải Vân Chân Trời ở Cut 1 & Cut 4
        if (horizonY < vh + 220) {
            for (let b = -2; b <= 2; b++) {
                const bx = screenCx + b * vw * 0.26 + Math.sin(elapsed * 0.8 + b) * 28 + (cam.shakeX || 0);
                const by = horizonY + Math.abs(b) * 18 + (b % 2) * 22 + (cam.shakeY || 0);
                const bw = vw * 0.52;
                const bh = bw * 0.56;
                ctxB.save();
                ctxB.globalAlpha = Math.min(1, 0.88 * intensity);
                const seaSprite = (Math.abs(b) % 2 === 1 || elapsed >= 4.80) ? atlas.cloudGold : primaryCloudSprite;
                ctxB.drawImage(seaSprite, bx - bw * 0.5, by - bh * 0.35, bw, bh);
                ctxB.restore();
            }
        }

        // 5 Luồng Ánh Sáng Thiên Sứ (Volumetric God Rays) chiếu từ Cổng Trời Thiên Đỉnh
        const beamConfigs = [
            { spread: -0.38, topW: 18 * motionScale, botW: vw * 0.34, alpha: 0.22, phase: 0.2 },
            { spread: -0.18, topW: 24 * motionScale, botW: vw * 0.44, alpha: 0.32, phase: 1.4 },
            { spread: 0.00,  topW: 38 * motionScale, botW: vw * 0.58, alpha: 0.48, phase: 2.7 },
            { spread: 0.18,  topW: 24 * motionScale, botW: vw * 0.44, alpha: 0.32, phase: 4.1 },
            { spread: 0.38,  topW: 18 * motionScale, botW: vw * 0.34, alpha: 0.22, phase: 5.3 }
        ];
        const beamEndY = vh * 0.96;
        ctxB.save();
        ctxB.globalCompositeOperation = 'lighter';
        for (let b = 0; b < beamConfigs.length; b++) {
            const bc = beamConfigs[b];
            const sway = Math.sin(elapsed * 2.1 + bc.phase) * 0.045 - cam.roll * 0.45;
            const endCx = skyCx + (bc.spread + sway) * vw;
            const breathe = 0.82 + 0.18 * Math.sin(elapsed * 3.4 + bc.phase);
            const bAlpha = bc.alpha * breathe * intensity;

            const beamGrad = ctxB.createLinearGradient(skyCx, skyCy - 10, endCx, beamEndY);
            beamGrad.addColorStop(0, skyTheme.beamCore.replace('1)', `${Math.min(1, bAlpha * 1.35).toFixed(3)})`));
            beamGrad.addColorStop(0.34, skyTheme.beamMid.replace(/0\.\d+\)/, `${(bAlpha * 0.92).toFixed(3)})`));
            beamGrad.addColorStop(0.70, skyTheme.beamEdge.replace(/0\.\d+\)/, `${(bAlpha * 0.48).toFixed(3)})`));
            beamGrad.addColorStop(1, 'rgba(255, 232, 166, 0)');

            ctxB.fillStyle = beamGrad;
            ctxB.beginPath();
            ctxB.moveTo(skyCx - bc.topW * 0.5, skyCy - 8);
            ctxB.lineTo(skyCx + bc.topW * 0.5, skyCy - 8);
            ctxB.lineTo(endCx + bc.botW * 0.5, beamEndY);
            ctxB.lineTo(endCx - bc.botW * 0.5, beamEndY);
            ctxB.closePath();
            ctxB.fill();
        }
        ctxB.restore();

        // Vẽ 96 Ngôi Sao Vũ Trụ 3D có Parallax thật theo Camera
        for (let s = 0; s < skyBgStars.length; s++) {
            const st = skyBgStars[s];
            const sp = project3DWithCam(st.x, st.y, st.z, cam, screenCx, screenCy);
            if (!sp || sp.sx < -20 || sp.sx > vw + 20 || sp.sy < -20 || sp.sy > vh + 20) continue;
            const tw = 0.45 + 0.55 * Math.sin(elapsed * st.twinkleSpeed + st.twinklePhase);
            const r = Math.max(0.8, st.size * sp.scale * tw);
            ctxB.globalAlpha = Math.min(1, intensity * tw * 0.92);
            ctxB.fillStyle = st.color;
            ctxB.beginPath();
            ctxB.arc(sp.sx, sp.sy, r, 0, Math.PI * 2);
            ctxB.fill();
            if (st.isCross && r > 1.3) {
                ctxB.strokeStyle = '#ffffff';
                ctxB.lineWidth = 0.9;
                ctxB.beginPath();
                ctxB.moveTo(sp.sx - r * 3.0, sp.sy);
                ctxB.lineTo(sp.sx + r * 3.0, sp.sy);
                ctxB.moveTo(sp.sx, sp.sy - r * 3.0);
                ctxB.lineTo(sp.sx, sp.sy + r * 3.0);
                ctxB.stroke();
            }
        }
        ctxB.restore();

        // 2. Tâm Cổng Trời Thiên Đỉnh (Celestia Astral Gate) trên ctxFront
        ctxF.save();
        ctxF.translate(skyCx, skyCy);
        ctxF.rotate(-cam.roll);
        ctxF.globalCompositeOperation = 'lighter';
        const corePulse = (1 + 0.16 * Math.sin(elapsed * 6.2)) * (0.78 + gateProj.scale * 0.68) * Math.sqrt(motionScale);
        const coronaR = 138 * corePulse;
        const coronaGrad = ctxF.createRadialGradient(0, 0, 3, 0, 0, coronaR);
        coronaGrad.addColorStop(0, `rgba(255, 255, 245, ${(0.98 * intensity).toFixed(3)})`);
        coronaGrad.addColorStop(0.26, `rgba(255, 232, 148, ${(0.82 * intensity).toFixed(3)})`);
        coronaGrad.addColorStop(0.60, skyTheme.skyMidNebula.replace(/0\.\d+\)/, `${(0.46 * intensity).toFixed(3)})`));
        coronaGrad.addColorStop(1, 'rgba(255, 232, 148, 0)');
        ctxF.fillStyle = coronaGrad;
        ctxF.beginPath();
        ctxF.arc(0, 0, coronaR, 0, Math.PI * 2);
        ctxF.fill();

        ctxF.save();
        ctxF.globalAlpha = Math.min(1, intensity * 0.88);
        ctxF.rotate(elapsed * 0.65);
        if (cfg.id === 'bloom' || cfg.id === 'sakura') {
            const pCount = cfg.id === 'sakura' ? 5 : 8;
            const pSpr = cfg.id === 'sakura' ? atlas.sakuraPetal : atlas.camelliaPetal;
            const pR = 28 * corePulse;
            for (let i = 0; i < pCount; i++) {
                ctxF.save();
                ctxF.rotate((i / pCount) * Math.PI * 2);
                ctxF.translate(0, -pR * 0.72);
                ctxF.drawImage(pSpr, -pR, -pR, pR * 2, pR * 2);
                ctxF.restore();
            }
        } else if (cfg.id === 'galaxy') {
            const dR = 38 * corePulse;
            ctxF.drawImage(atlas.roseBloom, -dR, -dR, dR * 2, dR * 2);
        } else if (cfg.id === 'hearts') {
            const dR = 38 * corePulse;
            ctxF.drawImage(atlas.tulipBloom, -dR, -dR, dR * 2, dR * 2);
        } else if (cfg.id === 'ribbon') {
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2;
                ctxF.drawImage(atlas.pearl, Math.cos(a) * 36 * corePulse - 7, Math.sin(a) * 36 * corePulse - 7, 14, 14);
            }
        }

        for (let k = 0; k < 2; k++) {
            ctxF.save();
            if (k === 1) ctxF.rotate(Math.PI / 4);
            const rayLen = (k === 0 ? 66 : 42) * corePulse;
            const rayW = k === 0 ? 6.2 : 4.0;
            ctxF.fillStyle = k === 0 ? '#fffef4' : skyTheme.ringColorA;
            ctxF.beginPath();
            ctxF.moveTo(0, -rayLen);
            ctxF.quadraticCurveTo(rayW, -rayW, rayLen, 0);
            ctxF.quadraticCurveTo(rayW, rayW, 0, rayLen);
            ctxF.quadraticCurveTo(-rayW, rayW, -rayLen, 0);
            ctxF.quadraticCurveTo(-rayW, -rayW, 0, -rayLen);
            ctxF.closePath();
            ctxF.fill();
            ctxF.restore();
        }
        ctxF.restore();
        ctxF.restore();
    }

    // Vẽ Vòng Tinh Cầu Khắc Chòm Sao 3D qua Phép Chiếu Camera 3D (có HDR Additive Glow)
    function drawCamera3DRing(ctxB, ctxF, ring, cam, screenCx, screenCy) {
        if (ring.alpha <= 0.01) return;
        const steps = 56;
        const cosX = Math.cos(ring.rx), sinX = Math.sin(ring.rx);
        const cosY = Math.cos(ring.ry), sinY = Math.sin(ring.ry);
        const cosZ = Math.cos(ring.rz), sinZ = Math.sin(ring.rz);

        const projPts = [];
        for (let i = 0; i <= steps; i++) {
            const a = (i / steps) * Math.PI * 2;
            const x0 = Math.cos(a) * ring.radius;
            const y0 = Math.sin(a) * ring.radius;

            const y1 = y0 * cosX;
            const z1 = y0 * sinX;
            const x1 = x0;

            const x2 = x1 * cosY + z1 * sinY;
            const z2 = -x1 * sinY + z1 * cosY;
            const y2 = y1;

            const wx = x2 * cosZ - y2 * sinZ + ring.cx;
            const wy = x2 * sinZ + y2 * cosZ + ring.cy;
            const wz = z2 + ring.cz;

            const pr = project3DWithCam(wx, wy, wz, cam, screenCx, screenCy);
            projPts.push(pr);
        }

        for (let i = 1; i < projPts.length; i++) {
            const p0 = projPts[i - 1];
            const p1 = projPts[i];
            if (!p0 || !p1) continue;
            if (ring.dashed && i % 3 === 0) continue;
            const ctx = p1.cz < ring.cz ? ctxB : ctxF;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.max(0, Math.min(1, ring.alpha * 0.52));
            ctx.strokeStyle = ring.color;
            ctx.lineWidth = Math.max(0.95, ring.lineWidth * p1.scale * 0.9);
            ctx.beginPath();
            ctx.moveTo(p0.sx, p0.sy);
            ctx.lineTo(p1.sx, p1.sy);
            ctx.stroke();
            ctx.restore();
        }

        for (let i = 0; i < projPts.length - 1; i += 2) {
            const pr = projPts[i];
            if (!pr) continue;
            const ctx = pr.cz < ring.cz ? ctxB : ctxF;
            const isMajor = i % 8 === 0;
            const wave = 0.45 + 0.55 * Math.sin((i / steps) * Math.PI * 4 + ring.rz * 2);
            const rSize = Math.max(1.2, ring.lineWidth * pr.scale * (isMajor ? 1.95 : 1.3) * (0.65 + 0.55 * wave));

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.max(0, Math.min(1, ring.alpha * 0.42 * wave));
            ctx.fillStyle = ring.glowColor || ring.color;
            ctx.beginPath();
            ctx.arc(pr.sx, pr.sy, rSize * 2.4, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = Math.max(0, Math.min(1, ring.alpha * (0.68 + 0.32 * wave)));
            ctx.fillStyle = isMajor ? '#ffffff' : ring.color;
            ctx.beginPath();
            ctx.arc(pr.sx, pr.sy, rSize * 0.95, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // ====== VẼ ĐẦU SAO BĂNG 5 SAO GENSHIN IMPACT (CÓ CHÂN DUNG NGƯỜI DÙNG TRONG LÕI SAO) & HỘ VỆ NGUYÊN TỐ 3D ĐỘC BẢN ======
    function drawGenshin5StarMeteorScreenCore(ctxF, sx, sy, scale, elapsed, isAwakened5Star, cam, screenCx, screenCy) {
        const atlas = getU3DLuxurySpriteAtlas();
        const s = Math.max(0.35, Math.min(9.5, scale * Math.sqrt(motionScale)));

        // 1. Vẽ Thấu Kính Quang Học Anamorphic & 6 Bóng Ma Lục Giác (Hexagonal Optical Lens Flare)
        drawGenshinOpticalLensFlare(ctxF, sx, sy, screenCx, screenCy, isAwakened5Star ? 0.96 : 0.72, isAwakened5Star, Math.min(2.6, s * 0.95));

        // 2. Vẽ Đoàn Hộ Tống Hoa & Bướm 3D Quay Quanh Đầu Sao Băng theo từng Chủ Đề (Không dùng vòng tròn cũ)
        if (cfg.id === 'butterflies') {
            const bCount = cam.cut === 3 ? 6 : 4;
            for (let b = 0; b < bCount; b++) {
                const orbAng = elapsed * 5.8 + (b * Math.PI * 2) / bCount;
                const orbRad = (58 + (b % 2) * 18) * s;
                const bx = Math.cos(orbAng) * orbRad;
                const by = Math.sin(orbAng * 1.3) * (orbRad * 0.64);
                const bz = Math.sin(orbAng) * 45;
                draw3DProjectedParticle(ctxF, {
                    type: 'butterfly',
                    isGold: b % 2 === 0 || isAwakened5Star,
                    x: bx,
                    y: by,
                    z: bz,
                    vx: -Math.sin(orbAng) * 140,
                    vy: Math.cos(orbAng) * 140,
                    phase: elapsed * 4.5 + b,
                    flapPhase: elapsed * 42 + b * 1.7,
                    size: (18 + (b % 2) * 6) * Math.min(1.85, s * 0.85),
                    alpha: 0.98
                }, sx, sy, 680);
            }
        } else {
            const fCount = cam.cut === 3 ? 6 : 4;
            const fType = cfg.id === 'galaxy' ? 'rose_bloom' : (cfg.id === 'hearts' ? 'tulip_bloom' : (cfg.id === 'ribbon' ? 'pearl' : 'petal'));
            for (let f = 0; f < fCount; f++) {
                const orbAng = elapsed * 4.6 + (f * Math.PI * 2) / fCount;
                const orbRad = (54 + (f % 2) * 18) * s;
                const fx = Math.cos(orbAng) * orbRad;
                const fy = Math.sin(orbAng * 1.25) * (orbRad * 0.66);
                const fz = Math.sin(orbAng) * 42;
                draw3DProjectedParticle(ctxF, {
                    type: fType,
                    isSakura: cfg.id === 'sakura',
                    x: fx,
                    y: fy,
                    z: fz,
                    rx: elapsed * 2.2 + f,
                    ry: elapsed * 1.8 + f,
                    rz: orbAng * 0.5,
                    size: (fType === 'pearl' ? 10 : 18) * Math.min(1.85, s * 0.85),
                    alpha: 0.96
                }, sx, sy, 680);
            }
        }

        // 3. Hào Quang Đa Lớp HDR Additive ('lighter') của Lõi Sao 5 Sao
        ctxF.save();
        ctxF.translate(sx, sy);
        ctxF.scale(s, s);
        ctxF.globalCompositeOperation = 'lighter';

        const coreColor = '#ffffff';
        const midColor = isAwakened5Star ? '#ffd700' : skyTheme.ringColorA;
        const outerColor = isAwakened5Star ? skyTheme.cometAwakenHalo : skyTheme.ringColorB;

        // Quả cầu Plasma HDR 3 lớp
        const haloR = isAwakened5Star ? 112 : 78;
        const grad = ctxF.createRadialGradient(0, 0, 4, 0, 0, haloR);
        grad.addColorStop(0, coreColor);
        grad.addColorStop(0.22, midColor);
        grad.addColorStop(0.56, outerColor);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctxF.fillStyle = grad;
        ctxF.beginPath();
        ctxF.arc(0, 0, haloR, 0, Math.PI * 2);
        ctxF.fill();

        // Biểu tượng 3D Hoa & Lụa xoay ở chính tâm Lõi Sao Băng
        ctxF.save();
        ctxF.rotate(elapsed * 5.2);
        if (cfg.id === 'bloom' || cfg.id === 'sakura') {
            const petalCount = cfg.id === 'sakura' ? 5 : 8;
            const pSprite = cfg.id === 'sakura' ? atlas.sakuraPetal : atlas.camelliaPetal;
            const pR = 28;
            for (let i = 0; i < petalCount; i++) {
                ctxF.save();
                ctxF.rotate((i / petalCount) * Math.PI * 2);
                ctxF.translate(0, -22);
                ctxF.drawImage(pSprite, -pR, -pR, pR * 2, pR * 2);
                ctxF.restore();
            }
        } else if (cfg.id === 'galaxy') {
            ctxF.drawImage(atlas.roseBloom, -42, -42, 84, 84);
        } else if (cfg.id === 'hearts') {
            ctxF.drawImage(atlas.tulipBloom, -42, -42, 84, 84);
        } else if (cfg.id === 'ribbon') {
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                ctxF.drawImage(atlas.pearl, Math.cos(a) * 28 - 8, Math.sin(a) * 28 - 8, 16, 16);
            }
        }

        // Ngôi sao 8 cánh Hoàng Kim 24K sắc lẹm ở tâm
        for (let k = 0; k < 2; k++) {
            ctxF.save();
            if (k === 1) ctxF.rotate(Math.PI / 4);
            const rL = k === 0 ? 58 : 38;
            const rW = k === 0 ? 7.2 : 4.6;
            ctxF.fillStyle = k === 0 ? '#ffffff' : '#ffd700';
            ctxF.beginPath();
            ctxF.moveTo(0, -rL);
            ctxF.quadraticCurveTo(rW, -rW, rL, 0);
            ctxF.quadraticCurveTo(rW, rW, 0, rL);
            ctxF.quadraticCurveTo(-rW, rW, -rL, 0);
            ctxF.quadraticCurveTo(-rW, -rW, 0, -rL);
            ctxF.closePath();
            ctxF.fill();
            ctxF.restore();
        }
        ctxF.restore();
        ctxF.restore();

        // 4. Huy Chương Chân Dung Người Dùng nằm gọn trong Lõi Sao Băng
        if (window.skyOracleUserThumbCanvas && s < 3.6) {
            ctxF.save();
            ctxF.translate(sx, sy);
            ctxF.scale(s, s);
            ctxF.globalAlpha = Math.max(0.18, Math.min(0.92, 1 - (s - 1.8) * 0.45));
            const portR = 23;
            ctxF.drawImage(window.skyOracleUserThumbCanvas, -portR, -portR, portR * 2, portR * 2);
            ctxF.strokeStyle = '#ffd700';
            ctxF.lineWidth = 2.2;
            ctxF.beginPath();
            ctxF.arc(0, 0, portR, 0, Math.PI * 2);
            ctxF.stroke();
            ctxF.restore();
        }
    }

    // ====== VẼ QUÁ TRÌNH HOÁ THÂN LOGIC Ở CUỐI CẢNH 4: LÕI SAO MỞ TUNG THÀNH LÁ THƯ ÁNH KIM (ẢNH + DÒNG CHỮ VÀNG) & GẤP PHONG BÌ LỤA 3D ======
    function drawStarToLetterEnvelopeWeave(ctxF, cx, cy, wp, elapsed) {
        // wp: 0.0 -> 1.0 (từ 5.26s -> 6.20s)
        const unfoldP = Math.min(1, wp / 0.58);
        const easeUnfold = 1 - Math.pow(1 - unfoldP, 3);
        const envWrapP = Math.max(0, Math.min(1, (wp - 0.42) / 0.58));

        const targetBaseW = Math.max(190, Math.min(340, cachedTargetRect ? cachedTargetRect.width * 0.72 : 190 * motionScale));
        const targetBaseH = targetBaseW / FULL_CARD_ASPECT_RATIO;
        const cardW = targetBaseW * (0.28 + 0.72 * easeUnfold);
        const cardH = targetBaseH * (0.28 + 0.72 * easeUnfold);
        const cornerR = (18 + (1 - easeUnfold) * 65) * motionScale;

        ctxF.save();
        ctxF.translate(cx, cy);

        // 1. Hào quang kết tinh phía sau Lá Thư Ánh Kim
        ctxF.save();
        ctxF.globalCompositeOperation = 'lighter';
        const glowGrad = ctxF.createRadialGradient(0, 0, 12, 0, 0, Math.max(cardW, cardH) * 0.95);
        glowGrad.addColorStop(0, 'rgba(255, 255, 240, 0.95)');
        glowGrad.addColorStop(0.45, 'rgba(255, 215, 0, 0.65)');
        glowGrad.addColorStop(1, 'rgba(255, 180, 0, 0)');
        ctxF.fillStyle = glowGrad;
        ctxF.beginPath();
        ctxF.arc(0, 0, Math.max(cardW, cardH) * 0.95, 0, Math.PI * 2);
        ctxF.fill();
        ctxF.restore();

        // 2. Thân Lá Thư Ngọc Trai Ánh Kim mở ra từ Lõi Sao
        ctxF.save();
        traceRoundedWindowPath(ctxF, -cardW * 0.5, -cardH * 0.5, cardW, cardH, cornerR);
        const paperGrad = ctxF.createLinearGradient(-cardW * 0.5, -cardH * 0.5, cardW * 0.5, cardH * 0.5);
        paperGrad.addColorStop(0, '#fffdf7');
        paperGrad.addColorStop(0.5, '#fff6dc');
        paperGrad.addColorStop(1, '#f9e8b2');
        ctxF.fillStyle = paperGrad;
        ctxF.fill();
        ctxF.lineWidth = 3.2 * motionScale;
        ctxF.strokeStyle = '#d4af37';
        ctxF.stroke();
        ctxF.clip();

        // 2A. Hiển thị Bức Ảnh đã chỉnh Filter của người dùng ở nửa trên Lá Thư
        const photoSrc = window.skyOracleUserCardPhotoCanvas || window.skyOracleUserThumbCanvas;
        if (photoSrc) {
            const pw = cardW * 0.84;
            const ph = cardH * 0.58;
            ctxF.drawImage(photoSrc, -pw * 0.5, -cardH * 0.44, pw, ph);
            ctxF.strokeStyle = 'rgba(212, 175, 55, 0.85)';
            ctxF.lineWidth = 1.8 * motionScale;
            ctxF.strokeRect(-pw * 0.5, -cardH * 0.44, pw, ph);
        }

        // 2B. Ba dòng Thư Pháp Ánh Vàng 24K đang tự động khắc lời chúc 20.10 lên nửa dưới Lá Thư
        const writeP = Math.max(0, Math.min(1, (wp - 0.16) / 0.62));
        for (let line = 0; line < 3; line++) {
            const lineP = Math.max(0, Math.min(1, (writeP - line * 0.22) / 0.48));
            if (lineP <= 0) continue;
            const maxLineW = cardW * (line === 2 ? 0.52 : 0.72);
            const curLineW = maxLineW * lineP;
            const ly = cardH * (0.21 + line * 0.085);
            ctxF.strokeStyle = line === 0 ? '#b8861b' : '#d4af37';
            ctxF.lineWidth = (line === 0 ? 3.2 : 2.2) * motionScale;
            ctxF.lineCap = 'round';
            ctxF.beginPath();
            ctxF.moveTo(-maxLineW * 0.5, ly);
            ctxF.lineTo(-maxLineW * 0.5 + curLineW, ly);
            ctxF.stroke();
        }
        ctxF.restore();

        // 3. Cánh Phong Bì Lụa Ánh Kim bắt đầu ôm lấy Lá Thư ở nửa cuối (wp: 0.42 -> 1.0) để chuyển giao mượt sang Phong Bì 3D thật!
        if (envWrapP > 0.01) {
            const envW = cardW * (1.16 + 0.14 * envWrapP);
            const envH = cardH * 0.62;
            const pocketY = cardH * 0.52 * (1 - envWrapP);
            ctxF.save();
            ctxF.globalAlpha = Math.min(1, envWrapP * 1.15);
            ctxF.translate(0, pocketY);
            ctxF.fillStyle = 'rgba(15, 92, 70, 0.88)';
            ctxF.strokeStyle = '#ffd700';
            ctxF.lineWidth = 2.6 * motionScale;
            traceRoundedWindowPath(ctxF, -envW * 0.5, -envH * 0.35, envW, envH, 14 * motionScale);
            ctxF.fill();
            ctxF.stroke();
            ctxF.restore();
        }

        ctxF.restore();
    }

    // Sinh các hạt Tinh Tú & Hoa 3D (Hồ điệp vàng, Hoa Trà, Hồng Pháp, Hoa Tulip, Anh Đào, Ngọc trai)
    function spawnSkyMeteorWakeParticle(originX, originY, originZ, isAwakened5Star, burstMultiplier = 1) {
        let pType = 'star';
        const r = Math.random();
        if (cfg.id === 'butterflies') {
            pType = r < 0.62 ? 'butterfly' : (r < 0.86 ? 'star' : 'bokeh');
        } else if (cfg.id === 'bloom') {
            pType = r < 0.65 ? 'petal' : (r < 0.88 ? 'star' : 'bokeh');
        } else if (cfg.id === 'sakura') {
            pType = r < 0.70 ? 'petal' : (r < 0.90 ? 'star' : 'bokeh');
        } else if (cfg.id === 'ribbon') {
            pType = r < 0.56 ? 'pearl' : (r < 0.84 ? 'star' : 'petal');
        } else if (cfg.id === 'galaxy') {
            pType = r < 0.52 ? 'rose_petal' : (r < 0.78 ? 'rose_bloom' : 'star');
        } else if (cfg.id === 'hearts') {
            pType = r < 0.52 ? 'tulip_petal' : (r < 0.78 ? 'tulip_bloom' : 'star');
        }

        const spread = 28 * burstMultiplier * motionScale;
        const spd = (110 + Math.random() * 165) * burstMultiplier * motionScale;
        const ang1 = Math.random() * Math.PI * 2;
        const ang2 = (Math.random() - 0.5) * Math.PI;

        const baseSize = pType === 'butterfly'
            ? (15 + Math.random() * 8)
            : ((pType === 'rose_bloom' || pType === 'tulip_bloom')
                ? (14 + Math.random() * 7)
                : (pType === 'pearl' ? (7 + Math.random() * 4) : (10 + Math.random() * 6)));

        particles.push({
            type: pType,
            isGold: isAwakened5Star || Math.random() < 0.68,
            isSakura: skyTheme.isSakura,
            hasTrail: pType === 'star',
            x: originX + (Math.random() - 0.5) * spread,
            y: originY + (Math.random() - 0.5) * spread,
            z: originZ + (Math.random() - 0.5) * spread,
            vx: Math.cos(ang1) * Math.cos(ang2) * spd,
            vy: Math.sin(ang2) * spd - 20,
            vz: Math.sin(ang1) * Math.cos(ang2) * spd,
            gravity: (pType === 'petal' || pType === 'rose_petal' || pType === 'tulip_petal') ? 28 : 14,
            drag: 0.65,
            vortex: 1.35,
            flutter: 76 * motionScale,
            phase: Math.random() * 6,
            flapPhase: Math.random() * 6,
            flapSpeed: 46,
            size: baseSize * motionScale,
            color: isAwakened5Star ? '#ffd700' : '#ff80ab',
            colorMid: skyTheme.petalMid,
            colorEnd: skyTheme.petalEnd,
            tintA: '#fff8e1',
            tintB: '#fce4ec',
            bokehColor: isAwakened5Star ? 'rgba(255, 230, 128, 0.52)' : 'rgba(255, 182, 208, 0.48)',
            rx: Math.random() * 5, ry: Math.random() * 5, rz: Math.random() * 5,
            vrx: (Math.random() - 0.5) * 8, vry: (Math.random() - 0.5) * 8, vrz: (Math.random() - 0.5) * 8,
            alpha: 1,
            life: 0,
            maxLife: 1.30 + Math.random() * 0.55
        });
    }


    // Hàm tạo hạt năng lượng xoáy hội tụ vào tâm trong pha Triệu Hồi (Summoning Prelude)
    function spawnSummonVortexParticle() {
        const ang = Math.random() * Math.PI * 2;
        const dist = (185 + Math.random() * 95) * motionScale;
        const px = Math.cos(ang) * dist;
        const py = Math.sin(ang) * dist;
        const tangX = -Math.sin(ang);
        const tangY = Math.cos(ang);
        const inwardSpd = (190 + Math.random() * 75) * motionScale;
        const swirlSpd = (155 + Math.random() * 65) * motionScale;

        let pType = 'petal';
        if (cfg.id === 'butterflies') pType = Math.random() < 0.65 ? 'butterfly' : 'star';
        else if (cfg.id === 'ribbon') pType = Math.random() < 0.65 ? 'pearl' : 'star';
        else if (cfg.id === 'galaxy') pType = Math.random() < 0.72 ? 'rose_petal' : 'star';
        else if (cfg.id === 'hearts') pType = Math.random() < 0.72 ? 'tulip_petal' : 'star';
        else pType = Math.random() < 0.75 ? 'petal' : 'star';

        particles.push({
            type: pType,
            isGold: true,
            isSakura: cfg.id === 'sakura',
            hasTrail: pType === 'star',
            x: px,
            y: py,
            z: (Math.random() - 0.5) * 180,
            vx: -Math.cos(ang) * inwardSpd + tangX * swirlSpd,
            vy: -Math.sin(ang) * inwardSpd + tangY * swirlSpd,
            vz: (Math.random() - 0.5) * 90,
            gravity: 0,
            drag: 0.45,
            vortex: 0,
            flutter: 35 * motionScale,
            phase: Math.random() * 6,
            flapPhase: Math.random() * 6,
            flapSpeed: 42,
            size: (pType === 'butterfly' ? 13 : (pType === 'pearl' ? 6 : 10)) * motionScale,
            colorMid: cfg.id === 'sakura' ? '#ffb2c9' : '#f48fb1',
            colorEnd: cfg.id === 'sakura' ? '#d83a6f' : '#ad1457',
            tintA: '#fff8e1',
            tintB: '#fce4ec',
            rx: Math.random() * 5, ry: Math.random() * 5, rz: Math.random() * 5,
            vrx: 5, vry: 6, vrz: 5,
            alpha: 1,
            life: 0,
            maxLife: 0.88
        });
    }

    // Hàm tạo hạt năng lượng hội tụ / thức tỉnh quanh Con Dấu Sáp trong pha Khởi Động (0.00s -> 0.88s)
    function spawnWindupSealParticle(sealWorldY, w) {
        const ang = Math.random() * Math.PI * 2;
        if (cfg.id === 'butterflies') {
            particles.push({
                type: 'butterfly',
                isGold: true,
                x: (Math.random() - 0.5) * 32 * motionScale,
                y: sealWorldY + (Math.random() - 0.5) * 24 * motionScale,
                z: 50 + Math.random() * 35,
                vx: Math.cos(ang) * (70 + w * 90) * motionScale,
                vy: (-80 - Math.random() * 90) * motionScale,
                vz: 60 + Math.random() * 60,
                gravity: -40,
                drag: 0.9,
                vortex: 1.5,
                flutter: 110 * motionScale,
                phase: Math.random() * 6,
                flapPhase: Math.random() * 6,
                flapSpeed: 46,
                size: (10 + Math.random() * 6) * motionScale,
                rx: 0, ry: 0, rz: 0, vrx: 0, vry: 0, vrz: 0,
                alpha: 1,
                life: 0,
                maxLife: 0.95
            });
        } else if (cfg.id === 'galaxy' || cfg.id === 'hearts') {
            const dist = (68 + Math.random() * 48) * motionScale;
            const px = Math.cos(ang) * dist;
            const py = sealWorldY + Math.sin(ang) * dist;
            const isRose = cfg.id === 'galaxy';
            particles.push({
                type: Math.random() < 0.72 ? (isRose ? 'rose_petal' : 'tulip_petal') : 'star',
                hasTrail: false,
                x: px,
                y: py,
                z: 45 + Math.random() * 30,
                vx: -Math.cos(ang) * 165 * motionScale - Math.sin(ang) * 95 * motionScale,
                vy: -(py - sealWorldY) * 1.9 + Math.cos(ang) * 95 * motionScale,
                vz: 30,
                gravity: -15,
                drag: 0.55,
                vortex: 0,
                flutter: 45 * motionScale,
                phase: Math.random() * 6,
                size: (8 + Math.random() * 4) * motionScale,
                tintA: '#fff8e1',
                tintB: '#fce4ec',
                rx: Math.random() * 4, ry: Math.random() * 4, rz: Math.random() * 4,
                vrx: 5, vry: 6, vrz: 6,
                alpha: 1,
                life: 0,
                maxLife: 0.62
            });
        } else {
            const r = (24 + Math.random() * 28) * motionScale;
            particles.push({
                type: cfg.id === 'ribbon' ? 'pearl' : 'petal',
                isSakura: cfg.id === 'sakura',
                x: Math.cos(ang) * r,
                y: sealWorldY + Math.sin(ang) * r,
                z: 48 + Math.random() * 30,
                vx: -Math.sin(ang) * 140 * motionScale,
                vy: (Math.cos(ang) * 140 - 40) * motionScale,
                vz: 40,
                gravity: -20,
                drag: 0.8,
                vortex: 0,
                flutter: 60 * motionScale,
                phase: Math.random() * 6,
                size: (cfg.id === 'ribbon' ? 5 : 8) * motionScale,
                colorMid: cfg.id === 'sakura' ? '#ffb2c9' : '#f48fb1',
                colorEnd: cfg.id === 'sakura' ? '#d83a6f' : '#ad1457',
                rx: Math.random() * 5, ry: Math.random() * 5, rz: Math.random() * 5,
                vrx: 6, vry: 6, vrz: 6,
                alpha: 1,
                life: 0,
                maxLife: 0.72
            });
        }
    }

    // Hàm tạo vụ nổ Mảnh Sáp Vàng / Cánh Hoa 3D khi phong ấn vỡ tung (t = WINDUP_END)
    function spawnSealBreakExplosion(originY) {
        const count = 18;
        for (let i = 0; i < count; i++) {
            const ang = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
            const spd = (230 + Math.random() * 340) * motionScale;
            const pType = cfg.id === 'ribbon'
                ? 'pearl'
                : (cfg.id === 'galaxy'
                    ? (i % 2 === 0 ? 'rose_petal' : 'shard')
                    : (cfg.id === 'hearts'
                        ? (i % 2 === 0 ? 'tulip_petal' : 'shard')
                        : 'shard'));
            particles.push({
                type: pType,
                x: (Math.random() - 0.5) * 16 * motionScale,
                y: originY + 10 * motionScale,
                z: 45 + Math.random() * 40,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd - 220 * motionScale,
                vz: 120 + Math.random() * 220,
                gravity: 920 * motionScale,
                drag: 1.4,
                vortex: 0,
                flutter: 0,
                phase: Math.random() * 6,
                size: (cfg.id === 'ribbon' ? (5 + Math.random() * 4) : (7 + Math.random() * 5)) * motionScale,
                tintA: '#fff8e1',
                tintB: '#fce4ec',
                rx: Math.random() * Math.PI * 2,
                ry: Math.random() * Math.PI * 2,
                rz: Math.random() * Math.PI * 2,
                vrx: (Math.random() - 0.5) * 14,
                vry: (Math.random() - 0.5) * 14,
                vrz: (Math.random() - 0.5) * 12,
                color: i % 2 === 0 ? '#f5c242' : '#d84b7e',
                alpha: 1,
                life: 0,
                maxLife: 1.05 + Math.random() * 0.35
            });
        }
    }

    // Hàm phun trào Vật Lý 3D từ chính Miệng Túi Chữ V của Phong Bì (t = EXTRACT_START)
    function spawnPocketMouthEruption(mouthY) {
        if (cfg.id === 'butterflies') {
            for (let i = 0; i < 24; i++) {
                const fanAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.45;
                const spd = (330 + Math.random() * 390) * motionScale;
                particles.push({
                    type: 'butterfly',
                    isGold: i % 3 !== 0,
                    x: (Math.random() - 0.5) * 115 * motionScale,
                    y: mouthY + 20 * motionScale,
                    z: (Math.random() - 0.5) * 230,
                    vx: Math.cos(fanAngle) * spd,
                    vy: Math.sin(fanAngle) * spd - 130 * motionScale,
                    vz: (Math.random() - 0.5) * 320,
                    gravity: -65 * motionScale,
                    drag: 1.25,
                    vortex: 2.2,
                    flutter: 170 * motionScale,
                    phase: Math.random() * Math.PI * 2,
                    flapPhase: Math.random() * Math.PI * 2,
                    flapSpeed: 38 + Math.random() * 14,
                    size: (15 + Math.random() * 12) * motionScale,
                    rx: 0, ry: 0, rz: 0, vrx: 0, vry: 0, vrz: 0,
                    alpha: 1,
                    life: 0,
                    maxLife: 2.5 + Math.random() * 0.6
                });
            }
            [-1, 1].forEach(sx => {
                [-1, 1].forEach(sy => {
                    escortButterflies.push({
                        sx, sy,
                        flapPhase: Math.random() * Math.PI,
                        flapSpeed: 42,
                        size: 24 * motionScale
                    });
                });
            });
        } else if (cfg.id === 'ribbon') {
            const colors = ['#e02f6e', '#f5c242', '#ff74a4', '#d49b27'];
            for (let r = 0; r < 4; r++) {
                ribbons3D.push({
                    baseAngle: (r * Math.PI) / 2,
                    phase: 0,
                    originX: 0,
                    originY: mouthY + 40 * motionScale,
                    startRadius: (132 + (r % 2) * 26) * motionScale,
                    heightSpan: 430 * motionScale,
                    progress: 0,
                    alpha: 1,
                    color: colors[r]
                });
            }
            for (let i = 0; i < 32; i++) {
                const isPearl = i % 2 === 0;
                const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.3;
                const spd = (360 + Math.random() * 400) * motionScale;
                particles.push({
                    type: isPearl ? 'pearl' : 'star',
                    hasTrail: false,
                    x: (Math.random() - 0.5) * 110 * motionScale,
                    y: mouthY + 15 * motionScale,
                    z: (Math.random() - 0.5) * 240,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd,
                    vz: (Math.random() - 0.5) * 300,
                    gravity: (isPearl ? 500 : 170) * motionScale,
                    drag: 1.1,
                    vortex: 1.8,
                    flutter: 55 * motionScale,
                    phase: Math.random() * 6,
                    size: (isPearl ? (6 + Math.random() * 5) : (9 + Math.random() * 7)) * motionScale,
                    rx: 0, ry: 0, rz: Math.random() * 6,
                    vrx: 0, vry: 0, vrz: (Math.random() - 0.5) * 8,
                    alpha: 1,
                    life: 0,
                    maxLife: 2.3 + Math.random() * 0.6
                });
            }
        } else if (cfg.id === 'galaxy') {
            // 🌹 ĐẠI TIỆC VƯỜN HỒNG NHUNG PHÁP HOÀNG GIA 3D (Bỏ hoàn toàn vòng tròn cũ -> Thay bằng Vòm Hoa Hồng Pháp Hộ Tống + Dải Lụa Vàng Hồng + Suối Hoa 68 Hạt 3D!)
            const roseRibbonColors = ['#e11d48', '#fbbf24'];
            for (let r = 0; r < 2; r++) {
                ribbons3D.push({
                    baseAngle: r * Math.PI,
                    phase: r * 0.8,
                    originX: 0,
                    originY: mouthY + 36 * motionScale,
                    startRadius: (136 + r * 22) * motionScale,
                    heightSpan: 440 * motionScale,
                    progress: 0,
                    alpha: 0.92,
                    color: roseRibbonColors[r]
                });
            }
            const roseArchCoords = [
                { sx: -1.04, sy: -0.45, scale: 1.18, zOff: 32 },
                { sx: 1.04, sy: -0.45, scale: 1.18, zOff: 32 },
                { sx: -1.12, sy: -0.14, scale: 0.96, zOff: -18 },
                { sx: 1.12, sy: -0.14, scale: 0.96, zOff: -18 },
                { sx: -1.10, sy: 0.18, scale: 1.08, zOff: 26 },
                { sx: 1.10, sy: 0.18, scale: 1.08, zOff: 26 },
                { sx: -0.96, sy: 0.46, scale: 1.22, zOff: 36 },
                { sx: 0.96, sy: 0.46, scale: 1.22, zOff: 36 }
            ];
            roseArchCoords.forEach((rc, idx) => {
                escortFlowers.push({
                    type: 'rose_bloom',
                    sx: rc.sx,
                    sy: rc.sy,
                    zOff: rc.zOff,
                    phase: idx * 0.9,
                    rotSpeed: (idx % 2 === 0 ? 1 : -1) * (1.2 + (idx % 3) * 0.35),
                    size: 24 * rc.scale * motionScale
                });
            });
            for (let i = 0; i < 68; i++) {
                const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.68;
                const spd = (320 + Math.random() * 480) * motionScale;
                const pType = i % 3 === 0 ? 'rose_bloom' : (i % 7 === 0 ? 'star' : (i % 9 === 0 ? 'bokeh' : 'rose_petal'));
                particles.push({
                    type: pType,
                    hasTrail: pType === 'star',
                    x: (Math.random() - 0.5) * 145 * motionScale,
                    y: mouthY + 18 * motionScale,
                    z: (Math.random() - 0.5) * 290,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd - 120 * motionScale,
                    vz: (Math.random() - 0.5) * 360,
                    gravity: (pType === 'star' || pType === 'bokeh' ? -45 : 62) * motionScale,
                    drag: 1.24,
                    vortex: 2.45,
                    flutter: 165 * motionScale,
                    phase: Math.random() * 6.28,
                    size: (pType === 'rose_bloom' ? (19 + Math.random() * 12) : (pType === 'bokeh' ? (14 + Math.random() * 12) : (pType === 'star' ? (9 + Math.random() * 6) : (13 + Math.random() * 9)))) * motionScale,
                    bokehColor: i % 2 === 0 ? 'rgba(251, 113, 133, 0.46)' : 'rgba(253, 224, 71, 0.44)',
                    rx: Math.random() * 6,
                    ry: Math.random() * 6,
                    rz: Math.random() * 6,
                    vrx: (Math.random() - 0.5) * 7.5,
                    vry: (Math.random() - 0.5) * 7.5,
                    vrz: (Math.random() - 0.5) * 5.5,
                    alpha: 1,
                    life: 0,
                    maxLife: 2.65 + Math.random() * 0.65
                });
            }
        } else if (cfg.id === 'hearts') {
            // 🌷 ĐẠI TIỆC VƯỜN TULIP HOÀNG GIA HÀ LAN NẮNG MAI 3D (Bỏ hoàn toàn vòng tròn cũ -> Thay bằng Khung Vườn Tulip Hộ Tống + Lụa Nắng Mai + Suối Hoa 68 Hạt 3D!)
            const tulipRibbonColors = ['#fb7185', '#fde047'];
            for (let r = 0; r < 2; r++) {
                ribbons3D.push({
                    baseAngle: r * Math.PI + Math.PI / 4,
                    phase: r * 1.1,
                    originX: 0,
                    originY: mouthY + 36 * motionScale,
                    startRadius: (134 + r * 22) * motionScale,
                    heightSpan: 435 * motionScale,
                    progress: 0,
                    alpha: 0.90,
                    color: tulipRibbonColors[r]
                });
            }
            const tulipGardenCoords = [
                { sx: -1.02, sy: -0.44, scale: 1.16, zOff: 30, baseTilt: -0.22 },
                { sx: 1.02, sy: -0.44, scale: 1.16, zOff: 30, baseTilt: 0.22 },
                { sx: -1.12, sy: -0.12, scale: 0.98, zOff: -16, baseTilt: -0.30 },
                { sx: 1.12, sy: -0.12, scale: 0.98, zOff: -16, baseTilt: 0.30 },
                { sx: -1.08, sy: 0.18, scale: 1.10, zOff: 28, baseTilt: -0.25 },
                { sx: 1.08, sy: 0.18, scale: 1.10, zOff: 28, baseTilt: 0.25 },
                { sx: -0.94, sy: 0.46, scale: 1.24, zOff: 36, baseTilt: -0.18 },
                { sx: 0.94, sy: 0.46, scale: 1.24, zOff: 36, baseTilt: 0.18 }
            ];
            tulipGardenCoords.forEach((tc, idx) => {
                escortFlowers.push({
                    type: 'tulip_bloom',
                    sx: tc.sx,
                    sy: tc.sy,
                    zOff: tc.zOff,
                    baseTilt: tc.baseTilt,
                    phase: idx * 0.85,
                    rotSpeed: 1.8,
                    size: 24 * tc.scale * motionScale
                });
            });
            for (let i = 0; i < 68; i++) {
                const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.65;
                const spd = (320 + Math.random() * 465) * motionScale;
                const pType = i % 3 === 0 ? 'tulip_bloom' : (i % 6 === 0 ? 'bokeh' : (i % 7 === 0 ? 'star' : 'tulip_petal'));
                particles.push({
                    type: pType,
                    hasTrail: pType === 'star',
                    x: (Math.random() - 0.5) * 145 * motionScale,
                    y: mouthY + 18 * motionScale,
                    z: (Math.random() - 0.5) * 285,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd - 112 * motionScale,
                    vz: (Math.random() - 0.5) * 350,
                    gravity: (pType === 'bokeh' ? -68 : -28) * motionScale,
                    drag: 1.22,
                    vortex: 2.05,
                    flutter: 150 * motionScale,
                    phase: Math.random() * Math.PI * 2,
                    size: (pType === 'tulip_bloom' ? (19 + Math.random() * 12) : (pType === 'bokeh' ? (14 + Math.random() * 12) : (pType === 'star' ? (9 + Math.random() * 6) : (13 + Math.random() * 9)))) * motionScale,
                    tintA: '#fff8e1',
                    tintB: '#fce4ec',
                    bokehColor: i % 2 === 0 ? 'rgba(254, 240, 138, 0.54)' : 'rgba(251, 113, 133, 0.48)',
                    rx: Math.random() * 6,
                    ry: Math.random() * 6,
                    rz: (Math.random() - 0.5) * 1.1,
                    vrx: (Math.random() - 0.5) * 5.8,
                    vry: (Math.random() - 0.5) * 6.8,
                    vrz: (Math.random() - 0.5) * 3.8,
                    alpha: 1,
                    life: 0,
                    maxLife: 2.65 + Math.random() * 0.65
                });
            }
        } else {
            const isSakura = cfg.id === 'sakura';
            const total = isSakura ? 48 : 42;
            for (let i = 0; i < total; i++) {
                const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
                const spd = (330 + Math.random() * 440) * motionScale;
                particles.push({
                    type: (!isSakura && i % 6 === 0) ? 'star' : 'petal',
                    isSakura,
                    hasTrail: false,
                    x: (Math.random() - 0.5) * 125 * motionScale,
                    y: mouthY + 24 * motionScale,
                    z: (Math.random() - 0.5) * 250,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd - 110 * motionScale,
                    vz: (Math.random() - 0.5) * 330,
                    gravity: (isSakura ? -70 : 90) * motionScale,
                    drag: 1.3,
                    vortex: isSakura ? 3.2 : 2.1,
                    flutter: 155 * motionScale,
                    phase: Math.random() * 6,
                    size: (isSakura ? (10 + Math.random() * 8) : (12 + Math.random() * 9)) * motionScale,
                    colorMid: isSakura ? '#ffb2c9' : '#f48fb1',
                    colorEnd: isSakura ? '#d83a6f' : '#ad1457',
                    rx: Math.random() * 6,
                    ry: Math.random() * 6,
                    rz: Math.random() * 6,
                    vrx: (Math.random() - 0.5) * 9,
                    vry: (Math.random() - 0.5) * 9,
                    vrz: (Math.random() - 0.5) * 7,
                    alpha: 1,
                    life: 0,
                    maxLife: 2.5 + Math.random() * 0.6
                });
            }
        }
    }

    // Vòng lặp Vật Lý 60fps chính của Đạo Diễn Phong Bì 3D Hợp Nhất (ZERO REFLOW, ZERO ALLOCATION)
    function stepPhysicsDirector(now) {
        if (lastFrameTime === null) lastFrameTime = now;
        const dt = Math.min(0.033, Math.max(0.004, (now - lastFrameTime) / 1000));
        lastFrameTime = now;

        // Tự động đồng bộ Responsive ngay lập tức nếu người dùng xoay màn hình hoặc thay đổi kích thước cửa sổ!
        if (window.innerWidth !== curVw || window.innerHeight !== curVh) {
            measureTargetShowcaseOnce();
            canvasBack.width = Math.round(curVw * dpr);
            canvasBack.height = Math.round(curVh * dpr);
            canvasFront.width = Math.round(curVw * dpr);
            canvasFront.height = Math.round(curVh * dpr);
        }

        const screenCx = curVw * 0.5;
        const screenCy = curVh * 0.5;
        const envBaseW = cachedEnvBaseW;
        const envBaseH = envBaseW * 0.694;
        const envBaseCy = curVh * 0.50;
        const focal = 920;

        ctxBack.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctxBack.clearRect(0, 0, curVw, curVh);
        ctxFront.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctxFront.clearRect(0, 0, curVw, curVh);

        const targetRect = cachedTargetRect;
        const baseW = targetRect.width;
        const baseH = targetRect.height;

        const pocketScale = Math.min(0.86, (envBaseW * 0.76) / baseW);
        const cardInPocketW = baseW * pocketScale;
        const cardInPocketH = baseH * pocketScale;

        // ====== TRẠNG THÁI 0-SKY-A: ĐẠI CẢNH ONE-SHOT SPEED-RAMP "TỪ BỨC ẢNH HOÁ THÀNH BỨC THƯ 3D" (6.20 GIÂY LIỀN MẠCH) ======
        if (u3dCurrentDirectorState === 'sky_oracle') {
            if (summonStartTime === null) summonStartTime = now;
            const summonElapsed = Math.max(0, (now - summonStartTime) / 1000);
            const SKY_ORACLE_TOTAL = 6.20;
            const atlas = getU3DLuxurySpriteAtlas();

            backRig.style.opacity = '0';
            frontRig.style.opacity = '0';
            cardActor.style.opacity = '0';

            try {
            // 1. Tính Góc Máy One-Shot Liền Mạch & Speed-Ramping (Nhanh - Chậm tuỳ cảnh)
            const cam = computeSkyGachaCamera(summonElapsed);
            const isAwakened5Star = summonElapsed >= 1.92;
            if (cam.cut === 2 || cam.cut === 3) {
                skyWhipScrollDist += dt * 2250 * cam.whipSpeedMult;
            }

            // 2. Vẽ Bầu Trời Vũ Trụ, Biển Mây Khối FBM Celestia phía dưới & Cổng Trời Thiên Đỉnh (Hiển thị rõ ngay từ Frame 1!)
            const portalIntensity = Math.max(0.28, Math.min(1, (summonElapsed + 0.08) / 0.30));
            drawHeavenlySkyBeamsAndPortal(ctxBack, ctxFront, summonElapsed, portalIntensity, screenCx, screenCy, curVw, curVh, cam);

            // =========================================================================
            // PHA 1 (0.00s -> 1.45s): "PHOTO CONDENSATION & SKYWARD ASCENT"
            // 0.00s -> 0.52s (Slow-Mo 0.42x): Bức ảnh chữ nhật của người dùng được dải lụa vàng quấn quanh, cuộn hoá thành Lõi Tinh Tú!
            // 0.52s -> 1.45s (Speed-Ramp 1.82x): Lõi Tinh Tú mang theo bức ảnh phóng vút từ Biển Mây lên thẳng Cổng Trời Thiên Đỉnh!
            // =========================================================================
            if (cam.cut === 1) {
                const condenseP = Math.max(0, Math.min(1, summonElapsed / 0.52));
                const easeCondense = condenseP * condenseP * (3 - 2 * condenseP);
                const ascendP = Math.max(0, Math.min(1, (summonElapsed - 0.42) / 1.03));
                const easeAscend = ascendP < 0.5 ? 2 * ascendP * ascendP : 1 - Math.pow(-2 * ascendP + 2, 2) / 2;

                const medWx = Math.sin(ascendP * Math.PI) * 24 * (1 - easeAscend);
                const medWy = 110 + (-420 - 110) * easeAscend;
                const medWz = 150 + (-920 - 150) * easeAscend;
                const medProj = project3DWithCam(medWx, medWy, medWz, cam, screenCx, screenCy);

                if (medProj) {
                    const medScale = Math.max(0.22, medProj.scale * Math.max(0.36, Math.min(1, (summonElapsed + 0.05) / 0.14)));

                    // Khi bắt đầu phóng lên (ascendP > 0.02), vẽ Dải Đuôi Sao Băng phóng thẳng từ dưới biển mây lên theo Lõi Tinh Tú
                    if (ascendP > 0.02) {
                        drawGenshinTaperedCometRibbon(
                            ctxFront,
                            medProj.sx,
                            medProj.sy,
                            0,
                            1,
                            Math.min(curVh * 0.55, 390 * medScale * (0.25 + ascendP)),
                            Math.max(14, 46 * medScale),
                            summonElapsed,
                            false
                        );
                    }

                    ctxFront.save();
                    ctxFront.translate(medProj.sx, medProj.sy);

                    // Hào quang hội tụ khi Bức Ảnh cuộn thành Lõi Sao
                    ctxFront.save();
                    ctxFront.globalCompositeOperation = 'lighter';
                    const haloR = Math.max(24, (115 - 22 * easeCondense) * medScale);
                    const haloGrad = ctxFront.createRadialGradient(0, 0, 4, 0, 0, haloR);
                    haloGrad.addColorStop(0, 'rgba(255, 255, 245, 1)');
                    haloGrad.addColorStop(0.38, 'rgba(255, 215, 0, 0.82)');
                    haloGrad.addColorStop(0.72, 'rgba(56, 189, 248, 0.46)');
                    haloGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
                    ctxFront.fillStyle = haloGrad;
                    ctxFront.beginPath();
                    ctxFront.arc(0, 0, haloR, 0, Math.PI * 2);
                    ctxFront.fill();
                    ctxFront.restore();

                    // Giai đoạn 0.00s -> 0.52s: Bức ảnh chữ nhật (window.skyOracleUserCardPhotoCanvas) thu gọn & bo tròn dần thành Huy Chương Tinh Tú!
                    if (condenseP < 0.96 && window.skyOracleUserCardPhotoCanvas) {
                        const rectAlpha = 1 - Math.pow(condenseP, 1.8);
                        const rectScale = Math.max(0.18, (1 - easeCondense * 0.52) * medScale);
                        const rw = 165 * rectScale;
                        const rh = 246 * rectScale;
                        ctxFront.save();
                        ctxFront.globalAlpha = rectAlpha;
                        ctxFront.rotate(easeCondense * 0.35);
                        ctxFront.drawImage(window.skyOracleUserCardPhotoCanvas, -rw * 0.5, -rh * 0.5, rw, rh);
                        ctxFront.restore();
                    }

                    // Huy chương tròn chứa ảnh chân dung trong Lõi Sao Băng hiện rõ dần khi ảnh chữ nhật cuộn lại
                    if (window.skyOracleUserThumbCanvas) {
                        const drawR = Math.max(2, (66 - 14 * easeAscend) * medScale * (0.45 + 0.55 * easeCondense));
                        ctxFront.save();
                        ctxFront.globalAlpha = Math.max(0, Math.min(1, condenseP * 1.45));
                        ctxFront.drawImage(window.skyOracleUserThumbCanvas, -drawR, -drawR, drawR * 2, drawR * 2);
                        ctxFront.strokeStyle = '#ffd700';
                        ctxFront.lineWidth = Math.max(1.8, 3.4 * medScale);
                        ctxFront.beginPath();
                        ctxFront.arc(0, 0, drawR, 0, Math.PI * 2);
                        ctxFront.stroke();
                        for (let b = 0; b < 8; b++) {
                            const ba = (b / 8) * Math.PI * 2 + summonElapsed * 3.4;
                            const pr = Math.max(1.5, 5.6 * medScale);
                            ctxFront.drawImage(atlas.pearl, Math.cos(ba) * drawR - pr, Math.sin(ba) * drawR - pr, pr * 2, pr * 2);
                        }
                        ctxFront.restore();
                    }
                    ctxFront.restore();

                    if (Math.random() < 0.72) {
                        spawnSkyMeteorWakeParticle(medWx, medWy, medWz, false, 0.55);
                    }
                }
            }

            // =========================================================================
            // PHA 2 (1.45s -> 2.65s): "BULLET-TIME APEX BLESSING & 180° U-TURN AT CELESTIAL GATE"
            // Không cắt cảnh! Lõi Sao bay vào tâm Cổng Trời Thiên Đỉnh trong Slow-Motion (0.28x),
            // hấp thụ Dải Lời Chúc Vàng 20.10 tại t=1.92s để thức tỉnh thành Sao Băng 5 Sao Hoàng Kim,
            // rồi uốn một vòng cung Parabol 180° mượt mà ngay trên đỉnh trời để chúc mũi lao xuống thế giới bên dưới!
            // =========================================================================
            if (cam.cut === 2) {
                const uP = (summonElapsed - 1.45) / 1.20; // 0 -> 1
                const gateProj = project3DWithCam(0, -420, -920, cam, screenCx, screenCy) || { sx: screenCx, sy: curVh * 0.22, scale: 0.52 };

                // Quỹ đạo Vòng Cung Parabol 180° (Apex U-Turn Arch) ngay tại Cổng Trời:
                // uP = 0.0 -> 0.40: Bay lên chạm đỉnh Cổng Trời; uP = 0.40 -> 1.0: Uốn vòng cung 180° hướng mũi xuống dưới!
                const archAngle = Math.PI - uP * Math.PI; // PI (trái-dưới cổng trời) -> PI/2 (đỉnh cổng trời) -> 0 (phải-dưới cổng trời)
                const archRx = Math.min(curVw * 0.22, 135);
                const archRy = Math.min(curVh * 0.14, 92);
                const meteorSx = gateProj.sx - Math.cos(archAngle) * archRx * Math.sin(uP * Math.PI) + (cam.shakeX || 0);
                const meteorSy = gateProj.sy - Math.sin(archAngle) * archRy + (uP > 0.55 ? Math.pow((uP - 0.55) / 0.45, 2) * curVh * 0.22 : 0) + (cam.shakeY || 0);

                // Hướng vận tốc tiếp tuyến dọc theo vòng cung 180° (từ bay lên -> ngang ở đỉnh -> chúc đầu lao xuống!)
                const tangentAngle = -Math.PI * 0.5 + uP * Math.PI * 0.92; // -90° (bay lên) -> +75° (chúc đầu lao xuống)
                const tailAngle = tangentAngle + Math.PI; // Đuôi sao băng luôn vươn ngược lại phía sau theo đúng tiếp tuyến vòng cung!
                const tailDirX = Math.cos(tailAngle);
                const tailDirY = Math.sin(tailAngle);

                // Vẽ Dải Đuôi Sao Băng uốn theo vòng cung U-Turn trên đỉnh trời
                drawGenshinTaperedCometRibbon(
                    ctxFront,
                    meteorSx,
                    meteorSy,
                    tailDirX,
                    tailDirY,
                    Math.min(curVh * 0.65, (isAwakened5Star ? 420 : 280) * cam.zoom),
                    (isAwakened5Star ? 38 : 28) * cam.zoom,
                    summonElapsed,
                    isAwakened5Star
                );

                // Từ 1.50s -> 1.92s: Dải Lụa Chữ Vàng Lời Chúc 20.10 từ Cổng Trời Thiên Đỉnh xoáy hội tụ vào Lõi Sao (Singularity Blessing)
                if (summonElapsed >= 1.50 && summonElapsed < 1.92) {
                    const sp = (summonElapsed - 1.50) / 0.42;
                    const implosionR = (1 - sp * sp) * 165 + 16;
                    ctxFront.save();
                    ctxFront.translate(meteorSx, meteorSy);
                    ctxFront.globalCompositeOperation = 'lighter';
                    ctxFront.strokeStyle = '#ffd700';
                    ctxFront.lineWidth = 3.2 + sp * 5.0;
                    ctxFront.beginPath();
                    ctxFront.arc(0, 0, implosionR, 0, Math.PI * 2);
                    ctxFront.stroke();
                    ctxFront.restore();
                }

                // TẠI ĐỈNH VÒNG CUNG (t = 1.92s): THỨC TỈNH 5 SAO HOÀNG KIM (5-STAR GOLDEN AWAKENING SUPERNOVA)!
                if (isAwakened5Star && !hasTriggeredAwakeningBoom) {
                    hasTriggeredAwakeningBoom = true;
                    for (let k = 0; k < 34; k++) {
                        spawnSkyMeteorWakeParticle(0, -420, -920, true, 1.75);
                    }
                    skyShockwaves.push({
                        wx: 0, wy: -420, wz: -920,
                        rx: 1.05, ry: -0.25, rz: 0.2,
                        radius: 24, maxRadius: 560,
                        life: 0, maxLife: 0.82,
                        color: '#ffd700', glow: '#ffffff'
                    });
                    skyShockwaves.push({
                        wx: 0, wy: -420, wz: -920,
                        rx: -0.82, ry: 0.45, rz: -0.3,
                        radius: 18, maxRadius: 440,
                        life: 0, maxLife: 0.72,
                        color: skyTheme.ringColorA, glow: '#ffd700'
                    });
                }

                if (summonElapsed >= 1.92 && summonElapsed < 2.36) {
                    const ap = (summonElapsed - 1.92) / 0.44;
                    const aAlpha = Math.pow(1 - ap, 1.85);
                    ctxFront.save();
                    ctxFront.globalCompositeOperation = 'lighter';
                    const goldWash = ctxFront.createRadialGradient(meteorSx, meteorSy, 10, meteorSx, meteorSy, Math.max(curVw, curVh) * 0.78);
                    goldWash.addColorStop(0, `rgba(255, 255, 240, ${(aAlpha * 0.92).toFixed(3)})`);
                    goldWash.addColorStop(0.34, `rgba(255, 215, 0, ${(aAlpha * 0.68).toFixed(3)})`);
                    goldWash.addColorStop(1, 'rgba(255, 160, 0, 0)');
                    ctxFront.fillStyle = goldWash;
                    ctxFront.fillRect(0, 0, curVw, curVh);
                    ctxFront.restore();
                }

                drawGenshin5StarMeteorScreenCore(ctxFront, meteorSx, meteorSy, (isAwakened5Star ? 1.15 : 0.88) * cam.zoom, summonElapsed, isAwakened5Star, cam, screenCx, screenCy);
            }

            // =========================================================================
            // PHA 3 (2.65s -> 4.85s): "CAMERA OVERTAKE & FRONT-LEAD ORBIT LOOKING BACK AT METEOR HEAD + CLOUD SEA BELOW"
            // Máy quay tăng tốc vượt qua thân sao, BỌC QUA ĐẦU SAO và luôn khoá ống kính nhìn ngược về Đầu Sao,
            // giúp thấy rõ Đầu Sao Băng 5 Sao (cùng bức ảnh chân dung & hộ vệ 3D) đang lao tới trên nền Biển Mây Khối 3D cuồn cuộn phía dưới!
            // =========================================================================
            if (cam.cut === 3) {
                const c3p = (summonElapsed - 2.65) / 2.20; // 0 -> 1
                const orbitBlend = cam.orbitBlend || 0;

                // Khi máy quay bọc qua đầu sao (orbitBlend: 0 -> 1):
                // Đầu Sao Băng được đặt ở tỷ lệ vàng phía trên-giữa khung hình (để toàn bộ 60% khung hình phía dưới mở rộng quay cảnh Biển Mây 3D cuồn cuộn bên dưới!),
                // còn Đuôi Sao Băng vươn ngược lên đỉnh trời phía sau Đầu Sao!
                const swayX = Math.sin(c3p * Math.PI * 2) * curVw * 0.06;
                const swayY = Math.cos(c3p * Math.PI * 2) * curVh * 0.04;
                const meteorSx = screenCx + swayX + (cam.shakeX || 0);
                const meteorSy = curVh * (0.44 - 0.05 * orbitBlend) + swayY + (cam.shakeY || 0);

                // Hướng đuôi sao băng: khi mới vào Pha 3 hơi nghiêng chéo (-1.15 rad), sau khi máy quay bọc ra chính diện đầu sao thì vươn ngược lên bầu trời phía sau (-PI/2)
                const tailAngle = -1.12 * (1 - orbitBlend) + (-Math.PI * 0.5 + Math.sin(c3p * Math.PI * 2) * 0.16) * orbitBlend;
                const tailDirX = Math.cos(tailAngle);
                const tailDirY = Math.sin(tailAngle);
                const tailPerpX = -tailDirY;
                const tailPerpY = tailDirX;

                // 1. Vẽ Vệt Xé Gió Điện Ảnh (Speed-Lines) biến thiên theo Speed-Ramping (Nhanh 1.78x -> Chậm 0.34x -> Nhanh 1.92x)
                const spanDiag = Math.hypot(curVw, curVh) * 1.35;
                ctxFront.save();
                ctxFront.globalCompositeOperation = 'lighter';
                ctxFront.lineCap = 'round';
                for (let l = 0; l < skySpeedLines.length; l++) {
                    const sl = skySpeedLines[l];
                    const distAlong = ((sl.u * spanDiag + skyWhipScrollDist * (sl.speed / 1850)) % spanDiag) - spanDiag * 0.5;
                    const laneDist = sl.laneOffset * Math.max(curVw, curVh) * 0.58;
                    const lx = screenCx + tailDirX * distAlong + tailPerpX * laneDist;
                    const ly = screenCy + tailDirY * distAlong + tailPerpY * laneDist;
                    const sLen = sl.len * cam.whipSpeedMult * 1.15;
                    ctxFront.globalAlpha = 0.42 * Math.min(1, cam.whipSpeedMult * 0.85);
                    ctxFront.strokeStyle = sl.color;
                    ctxFront.lineWidth = sl.thickness * 1.25;
                    ctxFront.beginPath();
                    ctxFront.moveTo(lx, ly);
                    ctxFront.lineTo(lx + tailDirX * sLen, ly + tailDirY * sLen);
                    ctxFront.stroke();
                }
                ctxFront.restore();

                // 2. Vẽ Dải Đuôi Sao Băng Plasma 3 Lớp vươn ngược từ Đầu Sao lên phía Cổng Trời phía sau
                const tailLength = curVh * (0.78 - 0.18 * orbitBlend);
                const headBaseRadius = 44 * cam.zoom;
                drawGenshinTaperedCometRibbon(
                    ctxFront,
                    meteorSx,
                    meteorSy,
                    tailDirX,
                    tailDirY,
                    tailLength,
                    headBaseRadius,
                    summonElapsed,
                    true
                );

                // 3. Phun các Thực Thể 3D Chủ Đề (Hồ điệp vàng, Cánh hoa nhung, Anh đào, Kim cương, Ngọc trai) bay tạt qua ống kính!
                skyParticleAccum += dt;
                const spawnInterval = 0.022;
                if (skyParticleAccum >= spawnInterval) {
                    skyParticleAccum = 0;
                    const worldX = (meteorSx - screenCx);
                    const worldY = (meteorSy - screenCy);
                    spawnSkyMeteorWakeParticle(worldX, worldY, (Math.random() - 0.5) * 140, true, 1.25);
                    const newestP = particles[particles.length - 1];
                    if (newestP) {
                        const slipSpd = (520 + Math.random() * 440) * Math.max(0.45, cam.whipSpeedMult);
                        newestP.vx += tailDirX * slipSpd;
                        newestP.vy += tailDirY * slipSpd;
                    }
                }

                // 4. Vẽ Đầu Sao Băng 5 Sao (chứa Chân Dung Người Dùng & Hộ Vệ Nguyên Tố 3D xoay quanh mũi sao) đang lao thẳng về phía máy quay!
                drawGenshin5StarMeteorScreenCore(ctxFront, meteorSx, meteorSy, cam.zoom, summonElapsed, true, cam, screenCx, screenCy);
            }

            // =========================================================================
            // PHA 4 (4.85s -> 6.20s): "LENS ARRIVAL & STAR-TO-LETTER ALCHEMY"
            // 4.85s -> 5.26s: Sao băng 5 Sao lao tới chính giữa ống kính!
            // 5.26s -> 6.20s: Từ tâm Hào Quang 5 Sao, Lõi Sao mở tung thành Lá Thư Ánh Kim (có ảnh của bạn + 3 dòng chữ vàng lời chúc)
            // và được Cánh Phong Bì Lụa ôm lấy trước khi bàn giao sang Phong Bì 3D đóng dấu sáp vàng 24K!
            // =========================================================================
            if (cam.cut === 4) {
                if (summonElapsed < 5.26) {
                    const cp = (summonElapsed - 4.85) / 0.41;
                    const expScale = 1.25 + Math.pow(cp, 2.4) * 5.6;
                    const crashSx = screenCx + (cam.shakeX || 0);
                    const crashSy = screenCy - (1 - cp * cp) * curVh * 0.12 + (cam.shakeY || 0);

                    ctxFront.save();
                    ctxFront.globalCompositeOperation = 'lighter';
                    ctxFront.lineCap = 'round';
                    for (let l = 0; l < 32; l++) {
                        const sl = skySpeedLines[l];
                        const rInner = (45 + (l % 5) * 32) * (0.4 + cp * 1.6);
                        const rOuter = rInner + (135 + (l % 4) * 80) * (0.5 + cp * 2.0);
                        ctxFront.globalAlpha = Math.min(1, (0.35 + cp * 0.65));
                        ctxFront.strokeStyle = l % 2 === 0 ? '#ffd700' : '#ffffff';
                        ctxFront.lineWidth = 1.6 + cp * 3.2;
                        ctxFront.beginPath();
                        ctxFront.moveTo(crashSx + Math.cos(sl.ang) * rInner, crashSy + Math.sin(sl.ang) * rInner);
                        ctxFront.lineTo(crashSx + Math.cos(sl.ang) * rOuter, crashSy + Math.sin(sl.ang) * rOuter);
                        ctxFront.stroke();
                    }
                    ctxFront.restore();

                    drawGenshin5StarMeteorScreenCore(ctxFront, crashSx, crashSy, expScale, summonElapsed, true, cam, screenCx, screenCy);
                } else {
                    if (!hasTriggeredImpactSupernova) {
                        hasTriggeredImpactSupernova = true;
                        for (let k = 0; k < 36; k++) {
                            spawnSkyMeteorWakeParticle(0, 0, (Math.random() - 0.5) * 200, true, 1.95);
                        }
                        skyShockwaves.push({
                            wx: 0, wy: 0, wz: 0,
                            rx: 1.12, ry: 0.18, rz: 0,
                            radius: 26, maxRadius: 540,
                            life: 0, maxLife: 0.72,
                            color: '#ffd700', glow: '#ffffff'
                        });
                    }

                    const wp = (summonElapsed - 5.26) / 0.94; // 0 -> 1
                    ctxFront.save();
                    const washAlpha = wp < 0.22 ? (0.68 + (wp / 0.22) * 0.24) : (0.92 - (wp - 0.22) * 0.45);
                    const washGrad = ctxFront.createRadialGradient(screenCx, screenCy, 10, screenCx, screenCy, Math.max(curVw, curVh) * 0.85);
                    washGrad.addColorStop(0, `rgba(255, 254, 245, ${washAlpha.toFixed(3)})`);
                    washGrad.addColorStop(0.45, `rgba(255, 232, 145, ${(washAlpha * 0.82).toFixed(3)})`);
                    washGrad.addColorStop(1, `rgba(255, 195, 55, ${(washAlpha * 0.55).toFixed(3)})`);
                    ctxFront.fillStyle = washGrad;
                    ctxFront.fillRect(0, 0, curVw, curVh);
                    ctxFront.restore();

                    // Vẽ Đại Pháp Trận Kim Hoàn 3D làm nền và quá trình Lõi Sao mở tung thành Lá Thư Ánh Kim!
                    drawSummonCenterMotif(ctxFront, cfg.id, summonElapsed - 5.05, screenCx + (cam.shakeX || 0), screenCy + (cam.shakeY || 0), motionScale);
                    drawStarToLetterEnvelopeWeave(ctxFront, screenCx + (cam.shakeX || 0), screenCy + (cam.shakeY || 0), wp, summonElapsed);
                }
            }

            // 7. Cập nhật & Vẽ các Vòng Sóng Xung Kích 3D (skyShockwaves)
            const ringCam = (cam.cut === 3)
                ? { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: cam.roll || 0, fov: 700, shakeX: cam.shakeX, shakeY: cam.shakeY }
                : cam;
            for (let sIdx = skyShockwaves.length - 1; sIdx >= 0; sIdx--) {
                const sw = skyShockwaves[sIdx];
                sw.life += dt;
                if (sw.life >= sw.maxLife) {
                    skyShockwaves.splice(sIdx, 1);
                    continue;
                }
                const prog = sw.life / sw.maxLife;
                const easeSw = 1 - Math.pow(1 - prog, 2.6);
                sw.radius = 24 + (sw.maxRadius - 24) * easeSw;
                sw.rz += dt * 2.8;
                drawCamera3DRing(ctxBack, ctxFront, {
                    cx: sw.wx, cy: sw.wy, cz: sw.wz,
                    radius: sw.radius,
                    rx: sw.rx, ry: sw.ry, rz: sw.rz,
                    color: sw.color,
                    glowColor: sw.glow,
                    lineWidth: 3.4 * (1 - prog * 0.65),
                    dashed: false,
                    alpha: (1 - prog) * 0.96
                }, ringCam, screenCx, screenCy);
            }

            // 8. Cập nhật & Vẽ toàn bộ Hạt Vật Lý 3D có Texture Kim Hoàn (ZERO HEAP ALLOCATION!)
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.life += dt;
                if (p.life >= p.maxLife) {
                    particles.splice(i, 1);
                    continue;
                }
                const dragFactor = Math.max(0, 1 - p.drag * dt);
                p.vx *= dragFactor;
                p.vy *= dragFactor;
                p.vz *= dragFactor;
                p.vy += p.gravity * dt;
                if (p.flutter > 0) {
                    p.phase += dt * 5.2;
                    p.vx += Math.sin(p.phase) * p.flutter * dt;
                }
                if (p.type === 'butterfly') p.flapPhase += p.flapSpeed * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.z += p.vz * dt;
                p.rx += p.vrx * dt;
                p.ry += p.vry * dt;
                p.rz += p.vrz * dt;
                const lr = p.life / p.maxLife;
                p.alpha = lr < 0.14 ? lr / 0.14 : (lr > 0.72 ? (1 - lr) / 0.28 : 1);

                const pr = project3DWithCam(p.x, p.y, p.z, ringCam, screenCx, screenCy);
                if (pr) {
                    const origX = p.x, origY = p.y, origZ = p.z;
                    p.x = (pr.sx - screenCx) / pr.scale;
                    p.y = (pr.sy - screenCy) / pr.scale;
                    p.z = ringCam.fov - ringCam.fov / pr.scale;
                    draw3DProjectedParticle(pr.cz < 0 ? ctxBack : ctxFront, p, screenCx, screenCy, ringCam.fov);
                    p.x = origX;
                    p.y = origY;
                    p.z = origZ;
                }
            }

            } catch (skyErr) {
                console.error('Sky Oracle frame error:', skyErr);
            }

            // Khi hoàn tất trọn vẹn 6.20 giây Đại Cảnh One-Shot 3D & ảnh thiệp đã kết xuất xong 100% -> Chuyển sang Pha Phong Bì 3D Khép Lại & Đóng Dấu Sáp Vàng 24K!
            if (window.isRecipientCardImageReady && summonElapsed >= SKY_ORACLE_TOTAL) {
                if (cardImg && finalResultImg && finalResultImg.src) {
                    cardImg.src = finalResultImg.src;
                }
                u3dCurrentDirectorState = 'sky_descending';
                arriveStartTime = now;
                stage.classList.remove('is-summoning');
                stage.classList.add('is-arriving');
            }

            u3dAnimFrameId = requestAnimationFrame(stepPhysicsDirector);
            return;
        }

        // ====== TRẠNG THÁI 0-SKY-B: MÀN SƯƠNG HOÀNG KIM 5 SAO TAN MỞ, PHONG BÌ 3D HIỆN RA & ĐÓNG DẤU SÁP VÀNG 24K (1.18 GIÂY) ======
        if (u3dCurrentDirectorState === 'sky_descending') {
            if (arriveStartTime === null) arriveStartTime = now;
            const arriveElapsed = Math.max(0, (now - arriveStartTime) / 1000);
            const SKY_DESCEND_TOTAL = 1.18;

            // Giữ nền trời 3D dịu dần mượt mà khi Phong Bì 3D hiện ra ở chính tâm sân khấu
            const beamFade = Math.max(0, 1 - Math.pow(arriveElapsed / SKY_DESCEND_TOTAL, 1.55));
            drawHeavenlySkyBeamsAndPortal(ctxBack, ctxFront, 6.20 + arriveElapsed, beamFade, screenCx, screenCy, curVw, curVh);

            // Màn Sương Hoàng Kim 5 Sao (Golden Washout Veil) từ cuối Cut 4 tan dần mượt mà trong 0.58s đầu của sky_descending
            if (arriveElapsed < 0.58) {
                const veilFade = Math.pow(1 - arriveElapsed / 0.58, 1.75) * 0.72;
                ctxFront.save();
                ctxFront.globalCompositeOperation = 'lighter';
                const veilGrad = ctxFront.createRadialGradient(screenCx, screenCy, 12, screenCx, screenCy, Math.max(curVw, curVh) * 0.8);
                veilGrad.addColorStop(0, `rgba(255, 254, 240, ${veilFade.toFixed(3)})`);
                veilGrad.addColorStop(0.5, `rgba(255, 224, 130, ${(veilFade * 0.75).toFixed(3)})`);
                veilGrad.addColorStop(1, 'rgba(255, 195, 55, 0)');
                ctxFront.fillStyle = veilGrad;
                ctxFront.fillRect(0, 0, curVw, curVh);
                ctxFront.restore();
            }

            // Pha 1 (0.00s -> 0.84s): Phong bì 3D kết tinh từ tâm Hào Quang 5 Sao và xoay 3D uyển chuyển vào giữa màn hình
            const envP = Math.min(1, arriveElapsed / 0.84);
            const easeEnv = 1 - Math.pow(1 - envP, 3);

            // Pha 2 (0.66s -> 1.18s): Phong Ấn Vàng 24K từ trên giáng xuống đóng dấu lên nắp phong bì
            const sealP = Math.max(0, Math.min(1, (arriveElapsed - 0.66) / 0.52));
            let sealScale = 2.5;
            let sealTy = -56;
            let sealOp = 0;
            let envRecoilY = 0;

            if (sealP > 0) {
                if (sealP < 0.62) {
                    const downP = sealP / 0.62;
                    const easeDown = downP * downP;
                    sealScale = 2.5 - 1.58 * easeDown;
                    sealTy = -56 * (1 - easeDown);
                    sealOp = Math.min(1, downP * 1.85);
                } else {
                    const bounceP = (sealP - 0.62) / 0.38;
                    sealScale = 0.92 + 0.08 * Math.sin(bounceP * Math.PI * 0.5);
                    sealTy = 0;
                    sealOp = 1;
                    envRecoilY = Math.sin(bounceP * Math.PI) * 6;
                    if (!hasSpawnedArrivalStamp) {
                        hasSpawnedArrivalStamp = true;
                        const envMouthWorldY0 = (envBaseCy - envBaseH * 0.24) - screenCy;
                        const sealWorldY0 = envMouthWorldY0 + envBaseH * 0.28;
                        spawnSealBreakExplosion(sealWorldY0);
                    }
                }
            }

            const envScale = 0.32 + 0.68 * easeEnv;
            const envTx = Math.sin(envP * Math.PI) * 14 * (1 - easeEnv);
            const envTy = -52 * (1 - easeEnv) + envRecoilY;
            const envRx = 34 * (1 - easeEnv) + 6;
            const envRy = -20 * (1 - easeEnv);
            const envRz = 6 * (1 - easeEnv);
            const envOp = Math.min(1, envP * 2.4);

            const envTransform = `perspective(1400px) translate3d(${envTx.toFixed(1)}px, ${envTy.toFixed(1)}px, 0px) scale(${envScale.toFixed(3)}) rotateX(${envRx.toFixed(2)}deg) rotateY(${envRy.toFixed(2)}deg) rotateZ(${envRz.toFixed(2)}deg)`;
            backRig.style.transform = envTransform;
            frontRig.style.transform = envTransform;
            backRig.style.opacity = envOp.toFixed(2);
            frontRig.style.opacity = envOp.toFixed(2);

            if (sealBtn) {
                sealBtn.style.opacity = sealOp.toFixed(2);
                sealBtn.style.transform = `translate3d(0px, ${sealTy.toFixed(1)}px, 0px) scale(${sealScale.toFixed(3)})`;
            }

            if (floorShadow) {
                floorShadow.style.opacity = (envOp * easeEnv).toFixed(2);
                floorShadow.style.transform = `scale(${envScale.toFixed(3)})`;
            }

            cardActor.style.opacity = '0';

            if (envP < 0.84 && Math.random() < 0.72) {
                spawnSkyMeteorWakeParticle(envTx + (Math.random() - 0.5) * 140 * envScale, envTy + (Math.random() - 0.5) * 60 * envScale, (Math.random() - 0.5) * 120, true, 0.75);
            }

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.life += dt;
                if (p.life >= p.maxLife) {
                    particles.splice(i, 1);
                    continue;
                }
                const dragFactor = Math.max(0, 1 - p.drag * dt);
                p.vx *= dragFactor;
                p.vy *= dragFactor;
                p.vz *= dragFactor;
                p.vy += p.gravity * dt;
                if (p.type === 'butterfly') p.flapPhase += p.flapSpeed * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.z += p.vz * dt;
                p.rx += p.vrx * dt;
                p.ry += p.vry * dt;
                p.rz += p.vrz * dt;
                const lr = p.life / p.maxLife;
                p.alpha = lr < 0.15 ? lr / 0.15 : (lr > 0.7 ? (1 - lr) / 0.3 : 1);
                draw3DProjectedParticle(p.z < 0 ? ctxBack : ctxFront, p, screenCx, screenCy, focal);
            }

            if (arriveElapsed >= SKY_DESCEND_TOTAL) {
                u3dCurrentDirectorState = 'waiting';
                stage.classList.remove('is-arriving');
                frontRig.style.pointerEvents = 'none';
                if (sealBtn) {
                    sealBtn.style.opacity = '1';
                    sealBtn.style.transform = 'translate3d(0,0,0) scale(1)';
                    sealBtn.style.pointerEvents = 'auto';
                }
            }

            u3dAnimFrameId = requestAnimationFrame(stepPhysicsDirector);
            return;
        }


        // ====== TRẠNG THÁI 0A: TRIỆU HỒI THIỆP BẰNG MOTION 3D (KHI ĐANG TẢI ẢNH TỪ LINK - KHÔNG DÙNG CHỮ LOADING!) ======
        if (u3dCurrentDirectorState === 'summoning') {
            if (summonStartTime === null) summonStartTime = now;
            const summonElapsed = Math.max(0, (now - summonStartTime) / 1000);
            backRig.style.opacity = '0';
            frontRig.style.opacity = '0';
            cardActor.style.opacity = '0';

            // 1. Vẽ 3 Vòng Quỹ Đạo Ánh Sáng 3D xoay kết tinh quanh tâm sân khấu
            for (let r = 0; r < summonRings.length; r++) {
                const sr = summonRings[r];
                sr.rx += sr.vrx * dt;
                sr.ry += sr.vry * dt;
                sr.rz += sr.vrz * dt;
                sr.radius = ((88 + r * 26) + Math.sin(summonElapsed * 3.4 + r) * 12) * motionScale;
                drawSplit3DRing(ctxBack, ctxFront, sr, screenCx, screenCy, focal, 0);
            }

            // 2. Sinh các hạt 3D theo chủ đề xoáy hội tụ từ ngoài vào tâm
            summonSpawnAccum += dt;
            if (summonSpawnAccum >= 0.045) {
                summonSpawnAccum = 0;
                spawnSummonVortexParticle();
                spawnSummonVortexParticle();
            }

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.life += dt;
                if (p.life >= p.maxLife) {
                    particles.splice(i, 1);
                    continue;
                }
                const dragFactor = Math.max(0, 1 - p.drag * dt);
                p.vx *= dragFactor;
                p.vy *= dragFactor;
                p.vz *= dragFactor;
                if (p.type === 'butterfly') p.flapPhase += p.flapSpeed * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.z += p.vz * dt;
                p.rx += p.vrx * dt;
                p.ry += p.vry * dt;
                p.rz += p.vrz * dt;
                const lr = p.life / p.maxLife;
                p.alpha = lr < 0.18 ? lr / 0.18 : (lr > 0.72 ? (1 - lr) / 0.28 : 1);
                draw3DProjectedParticle(p.z < 0 ? ctxBack : ctxFront, p, screenCx, screenCy, focal);
            }

            // 3. Vẽ Biểu Tượng Ánh Sáng 3D của chủ đề đang kết tinh tại tâm
            drawSummonCenterMotif(ctxFront, cfg.id, summonElapsed, screenCx, screenCy, motionScale);

            // Ngay khi ảnh thiệp đã tải & giải mã xong 100% (và hoàn thành tối thiểu 0.72s nhịp điệu mở màn) -> Chuyển sang pha Phong Bì Lướt Vào & Đóng Dấu Sáp!
            if (window.isRecipientCardImageReady && summonElapsed >= 0.72) {
                u3dCurrentDirectorState = 'arriving';
                arriveStartTime = now;
                stage.classList.remove('is-summoning');
                stage.classList.add('is-arriving');
                spawnSealBreakExplosion(0);
            }

            u3dAnimFrameId = requestAnimationFrame(stepPhysicsDirector);
            return;
        }

        // ====== TRẠNG THÁI 0B: PHONG BÌ 3D LƯỚT VÀO & CON DẤU SÁP VÀNG GIÁNG XUỐNG ĐÓNG DẤU SẴN SÀNG ======
        if (u3dCurrentDirectorState === 'arriving') {
            if (arriveStartTime === null) arriveStartTime = now;
            const arriveElapsed = Math.max(0, (now - arriveStartTime) / 1000);
            const ARRIVE_TOTAL = 0.76;

            // Pha 1 (0.00s -> 0.48s): Phong bì 3D kết tinh và lướt từ chiều sâu 3D vào giữa sân khấu
            const envP = Math.min(1, arriveElapsed / 0.48);
            const easeEnv = 1 - Math.pow(1 - envP, 3);

            // Pha 2 (0.36s -> 0.76s): Con dấu sáp vàng 3D từ trên cao giáng xuống đóng dấu vào nắp phong bì (tại t = 0.60s)
            const sealP = Math.max(0, Math.min(1, (arriveElapsed - 0.36) / 0.40));
            let sealScale = 2.45;
            let sealTy = -42;
            let sealOp = 0;
            let envRecoilY = 0;

            if (sealP > 0) {
                if (sealP < 0.62) {
                    const downP = sealP / 0.62;
                    const easeDown = downP * downP;
                    sealScale = 2.45 - 1.53 * easeDown; // 2.45 -> 0.92
                    sealTy = -42 * (1 - easeDown);
                    sealOp = Math.min(1, downP * 1.8);
                } else {
                    const bounceP = (sealP - 0.62) / 0.38;
                    sealScale = 0.92 + 0.08 * Math.sin(bounceP * Math.PI * 0.5);
                    sealTy = 0;
                    sealOp = 1;
                    envRecoilY = Math.sin(bounceP * Math.PI) * 5.5;
                    if (!hasSpawnedArrivalStamp) {
                        hasSpawnedArrivalStamp = true;
                        const envMouthWorldY0 = (envBaseCy - envBaseH * 0.24) - screenCy;
                        const sealWorldY0 = envMouthWorldY0 + envBaseH * 0.28;
                        spawnSealBreakExplosion(sealWorldY0);
                    }
                }
            }

            const envScale = 0.54 + 0.46 * easeEnv;
            const envTy = (1 - easeEnv) * -36 + envRecoilY;
            const envRx = 32 * (1 - easeEnv) + 6;
            const envRy = -16 * (1 - easeEnv);
            const envRz = (1 - easeEnv) * -6;
            const envOp = Math.min(1, envP * 1.65);

            const envTransform = `perspective(1400px) translate3d(0px, ${envTy.toFixed(1)}px, 0px) scale(${envScale.toFixed(3)}) rotateX(${envRx.toFixed(2)}deg) rotateY(${envRy.toFixed(2)}deg) rotateZ(${envRz.toFixed(2)}deg)`;
            backRig.style.transform = envTransform;
            frontRig.style.transform = envTransform;
            backRig.style.opacity = envOp.toFixed(2);
            frontRig.style.opacity = envOp.toFixed(2);

            if (sealBtn) {
                sealBtn.style.opacity = sealOp.toFixed(2);
                sealBtn.style.transform = `translate3d(0px, ${sealTy.toFixed(1)}px, 0px) scale(${sealScale.toFixed(3)})`;
            }

            if (floorShadow) {
                floorShadow.style.opacity = envOp.toFixed(2);
                floorShadow.style.transform = `scale(${envScale.toFixed(3)})`;
            }

            cardActor.style.opacity = '0';

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.life += dt;
                if (p.life >= p.maxLife) {
                    particles.splice(i, 1);
                    continue;
                }
                const dragFactor = Math.max(0, 1 - p.drag * dt);
                p.vx *= dragFactor;
                p.vy *= dragFactor;
                p.vz *= dragFactor;
                p.vy += p.gravity * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.z += p.vz * dt;
                p.rx += p.vrx * dt;
                p.ry += p.vry * dt;
                p.rz += p.vrz * dt;
                const lr = p.life / p.maxLife;
                p.alpha = lr < 0.15 ? lr / 0.15 : (lr > 0.7 ? (1 - lr) / 0.3 : 1);
                draw3DProjectedParticle(p.z < 0 ? ctxBack : ctxFront, p, screenCx, screenCy, focal);
            }

            if (arriveElapsed >= ARRIVE_TOTAL) {
                u3dCurrentDirectorState = 'waiting';
                stage.classList.remove('is-arriving');
                frontRig.style.pointerEvents = 'none';
                if (sealBtn) {
                    sealBtn.style.opacity = '1';
                    sealBtn.style.transform = 'translate3d(0,0,0) scale(1)';
                    sealBtn.style.pointerEvents = 'auto';
                }
            }

            u3dAnimFrameId = requestAnimationFrame(stepPhysicsDirector);
            return;
        }

        // ====== TRẠNG THÁI 1: PHONG BÌ & ẤN SÁP ĐÃ SẴN SÀNG 100%, CHỜ NGƯỜI NHẬN CHẠM MỞ ======
        if (u3dCurrentDirectorState === 'waiting') {
            const floatT = now * 0.0022;
            const idleY = Math.sin(floatT) * 7;
            const idleRotZ = Math.cos(floatT * 0.7) * 1.2;

            u3dPointerCurRotX += (u3dPointerTargetRotX - u3dPointerCurRotX) * Math.min(1, dt * 10);
            u3dPointerCurRotY += (u3dPointerTargetRotY - u3dPointerCurRotY) * Math.min(1, dt * 10);

            const rx = 6 + u3dPointerCurRotX;
            const ry = u3dPointerCurRotY;
            const rz = idleRotZ;

            const envTransform = `perspective(1400px) translate3d(0px, ${idleY.toFixed(1)}px, 0px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
            backRig.style.transform = envTransform;
            frontRig.style.transform = envTransform;
            backRig.style.opacity = '1';
            frontRig.style.opacity = '1';

            if (floorShadow) {
                floorShadow.style.transform = `translate3d(${(ry * 1.4).toFixed(1)}px, ${(-idleY * 0.5).toFixed(1)}px, 0) scale(${(1 - idleY * 0.006).toFixed(3)})`;
            }

            // Đặt tấm thiệp nằm gọn bên trong túi chữ V của phong bì bằng GPU transform + scale
            const cardLeft = screenCx - cardInPocketW * 0.5;
            const cardTop = envBaseCy - envBaseH * 0.36 + idleY;
            const envBottomY = envBaseCy + envBaseH * 0.445 + idleY;
            const bottomClipUnscaled = Math.max(0, ((cardTop + cardInPocketH) - envBottomY) / pocketScale);

            cardActor.style.opacity = '0';
            cardActor.style.transform = `translate3d(${cardLeft.toFixed(1)}px, ${cardTop.toFixed(1)}px, 0px) scale(${pocketScale.toFixed(4)})`;
            cardActor.style.clipPath = `inset(0px 0px ${bottomClipUnscaled.toFixed(1)}px 0px)`;
            isClipPathNone = false;

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.phase += dt * 2.2;
                p.x += Math.sin(p.phase) * 14 * dt;
                p.y += Math.cos(p.phase * 0.8) * 12 * dt;
                p.rz += p.vrz * dt;
                draw3DProjectedParticle(ctxBack, p, screenCx, screenCy, focal);
            }

            u3dAnimFrameId = requestAnimationFrame(stepPhysicsDirector);
            return;
        }

        // ====== TRẠNG THÁI 2: KHỞI ĐỘNG SÁP THƯ HỒI HỘP -> BẬT NẮP -> RÚT THIỆP TỪ TỪ 0%->100% KHỎI BÌ THƯ ======
        if (!openStartTime) openStartTime = now;
        const elapsed = Math.max(0, (now - openStartTime) / 1000);
        const envMouthWorldY = (envBaseCy - envBaseH * 0.24) - screenCy;
        const sealWorldY = envMouthWorldY + envBaseH * 0.28;

        // ---------------------------------------------------------------------------------
        // PHA A (0.00s -> 0.88s): KHỞI ĐỘNG / VẬN ĐỘNG HỒI HỘP TRÊN CON DẤU SÁP THEO TỪNG CHẾ ĐỘ
        // ---------------------------------------------------------------------------------
        const w = Math.min(1, elapsed / WINDUP_END);

        if (elapsed < WINDUP_END) {
            // Con dấu sáp & biểu tượng trung tâm vận động riêng biệt theo đúng chủ đề hiệu ứng đã chọn
            let sealScale = 1;
            let sealRotZ = 0;
            let sealTx = 0;
            let sealTy = 0;
            let emblemTransform = '';

            if (cfg.id === 'bloom') {
                // Đại Hoa Trà: 3 nhịp đập trái tim dồn dập + hoa trà xoay lấy đà ngược chiều kim đồng hồ rồi bùng nở
                const beat = Math.abs(Math.sin(w * Math.PI * 3.5));
                sealScale = 1 + 0.22 * beat * w;
                sealRotZ = w < 0.35 ? (w / 0.35) * 16 : 16 - ((w - 0.35) / 0.65) * 52;
                sealTx = Math.sin(elapsed * 55) * 2.5 * w * w;
            } else if (cfg.id === 'butterflies') {
                // Hồ Điệp Vàng: Cánh bướm vàng trên ấn sáp vỗ cánh nhanh dần như đang thức giấc muốn bay vọt khỏi sáp
                const wingScaleX = 0.32 + 0.68 * Math.abs(Math.cos(w * Math.PI * 10));
                sealScale = 1 + 0.18 * w;
                sealTy = -Math.abs(Math.sin(w * Math.PI * 5)) * 8 * w;
                sealRotZ = Math.sin(w * Math.PI * 8) * 6 * w;
                emblemTransform = `scaleX(${wingScaleX.toFixed(2)}) scaleY(${(1 + 0.12 * w).toFixed(2)})`;
            } else if (cfg.id === 'ribbon') {
                // Ruy-Băng Lụa: (0 -> 0.42) Nút nơ thắt căng lấy đà; (0.42 -> 1.0) 4 dải lụa tuột mở bay vút ra 4 phía!
                if (w < 0.42) {
                    const tw = w / 0.42;
                    sealScale = 1 - 0.08 * Math.sin(tw * Math.PI) + 0.15 * tw;
                    sealRotZ = -18 * Math.sin(tw * Math.PI * 0.5);
                } else {
                    const uw = (w - 0.42) / 0.58;
                    const easeUw = 1 - Math.pow(1 - uw, 2.6);
                    sealScale = 1.07 + 0.25 * easeUw;
                    sealRotZ = -18 + easeUw * 140;
                    const op = `${Math.max(0, 1 - easeUw * 1.15).toFixed(2)}`;
                    if (strapEls.hL) { strapEls.hL.style.transform = `translateX(${(-easeUw * 115 * motionScale).toFixed(1)}px) rotateZ(${(-easeUw * 22).toFixed(1)}deg) scaleX(${(1 - easeUw * 0.65).toFixed(2)})`; strapEls.hL.style.opacity = op; }
                    if (strapEls.hR) { strapEls.hR.style.transform = `translateX(${(easeUw * 115 * motionScale).toFixed(1)}px) rotateZ(${(easeUw * 22).toFixed(1)}deg) scaleX(${(1 - easeUw * 0.65).toFixed(2)})`; strapEls.hR.style.opacity = op; }
                    if (strapEls.vT) { strapEls.vT.style.transform = `translateY(${(-easeUw * 95 * motionScale).toFixed(1)}px) scaleY(${(1 - easeUw * 0.65).toFixed(2)})`; strapEls.vT.style.opacity = op; }
                    if (strapEls.vB) { strapEls.vB.style.transform = `translateY(${(easeUw * 95 * motionScale).toFixed(1)}px) scaleY(${(1 - easeUw * 0.65).toFixed(2)})`; strapEls.vB.style.opacity = op; }
                }
            } else if (cfg.id === 'galaxy') {
                // Hồng Nhung Pháp: Đóa hồng nhung đập nhịp tim nồng nàn + xoay nở cánh hoa lấy đà rồi bung tỏa
                const roseBeat = Math.abs(Math.sin(w * Math.PI * 3.5));
                sealScale = 1 + 0.24 * roseBeat * w;
                sealRotZ = Math.pow(w, 2.0) * 340;
                sealTx = Math.sin(elapsed * 52) * 2.2 * w * w;
            } else if (cfg.id === 'sakura') {
                // Lốc Anh Đào: Con dấu xoay cuốn theo tâm bão hoa anh đào + rung nhịp gió xuân
                sealScale = 1 + 0.20 * Math.sin(w * Math.PI * 0.8);
                sealRotZ = Math.pow(w, 1.9) * 320;
                sealTx = Math.cos(elapsed * 42) * 3.5 * w;
                sealTy = Math.sin(elapsed * 42) * 3.5 * w;
            } else if (cfg.id === 'hearts') {
                // Tulip Nắng Mai: Búp hoa Tulip Hoàng Gia hé nở nhịp nhàng đón nắng sớm + tỏa nhụy vàng
                const tulipPulse = Math.sin(w * Math.PI * 5);
                sealScale = 1 + 0.22 * w + 0.08 * Math.abs(tulipPulse);
                sealRotZ = tulipPulse * 12 * w;
                sealTy = -Math.abs(Math.sin(w * Math.PI * 4)) * 6 * w;
                emblemTransform = `scaleX(${(1 + 0.14 * w).toFixed(2)}) scaleY(${(1 + 0.10 * Math.abs(tulipPulse)).toFixed(2)})`;
            }

            if (sealBtn) {
                sealBtn.style.opacity = '1';
                sealBtn.style.transform = `translate3d(${sealTx.toFixed(1)}px, ${sealTy.toFixed(1)}px, 0) scale(${sealScale.toFixed(3)}) rotateZ(${sealRotZ.toFixed(1)}deg)`;
            }
            if (sealEmblem) {
                sealEmblem.style.transform = emblemTransform;
            }

            // Phun các hạt mồi thức tỉnh quanh con dấu sáp trong lúc khởi động hồi hộp
            windupSpawnAccum += dt;
            if (windupSpawnAccum >= 0.065) {
                windupSpawnAccum = 0;
                spawnWindupSealParticle(sealWorldY, w);
            }
        } else {
            // Sau t = 0.88s: Phong ấn vỡ tung & bay vọt lên khi nắp thư bật mở
            if (sealBtn) {
                const sp = Math.min(1, (elapsed - WINDUP_END) / 0.22);
                sealBtn.style.opacity = `${(1 - sp).toFixed(2)}`;
                sealBtn.style.transform = `translate3d(0, ${(-sp * 48 * motionScale).toFixed(1)}px, 0) scale(${(1.25 + sp * 0.75).toFixed(2)})`;
            }
        }

        // Kích hoạt vụ nổ vỡ phong ấn tại đúng thời khắc kết thúc pha khởi động (t = WINDUP_END = 0.88s)
        if (!hasSpawnedSealBreak && elapsed >= WINDUP_END) {
            hasSpawnedSealBreak = true;
            spawnSealBreakExplosion(sealWorldY);
        }

        // ---------------------------------------------------------------------------------
        // PHA B: CHUYỂN ĐỘNG BẢN LỀ NẮP PHONG BÌ (Hé mở hồi hộp lúc khởi động -> Bật mở lò xo tại 0.88s)
        // ---------------------------------------------------------------------------------
        if (elapsed < WINDUP_END) {
            // Trong lúc khởi động sáp thư (0.00s -> 0.88s): Nắp phong bì hé nhẹ 0° -> 18° kèm nhịp rung nội lực, ánh sáng vàng hé lộ từ khe nắp
            flapAngle = 18 * Math.pow(w, 2.2) + Math.sin(elapsed * 45) * 2.2 * (w * w);
        } else {
            // Từ 0.88s: Lò xo bản lề bật mở dứt khoát từ 18° lên 184°
            const targetFlap = 184;
            const springK = 175;
            const dampingC = 13.5;
            const accel = springK * (targetFlap - flapAngle) - dampingC * flapVel;
            flapVel += accel * dt;
            flapAngle += flapVel * dt;
        }

        if (flapAngle < 89.5) {
            if (flapFront) {
                flapFront.style.display = 'block';
                flapFront.style.transform = `perspective(1200px) rotateX(${flapAngle.toFixed(1)}deg)`;
            }
            if (flapBack) flapBack.style.display = 'none';
        } else {
            if (flapFront) flapFront.style.display = 'none';
            if (flapBack) {
                flapBack.style.display = 'block';
                flapBack.style.transform = `perspective(1200px) rotateX(${(180 - flapAngle).toFixed(1)}deg)`;
            }
        }

        // Kích hoạt Phun Trào Vật Lý 3D từ trong Miệng Túi Chữ V ngay khi nắp thư mở qua 90° (t = EXTRACT_START = 0.98s)
        if (!hasSpawnedMainBurst && elapsed >= EXTRACT_START) {
            hasSpawnedMainBurst = true;
            spawnPocketMouthEruption(envMouthWorldY);
        }

        // Luồng hạt 3D phun liên tục từ miệng phong bì trong lúc thiệp đang từ trong bì thư đi ra (1.00s -> 2.25s)
        if (elapsed >= EXTRACT_START && elapsed <= EXTRACT_END) {
            streamSpawnAccum += dt;
            const streamInterval = (cfg.id === 'galaxy' || cfg.id === 'hearts') ? 0.042 : 0.065;
            if (streamSpawnAccum >= streamInterval) {
                streamSpawnAccum = 0;
                const rVal = Math.random();
                const pType = cfg.id === 'butterflies' ? 'butterfly'
                    : (cfg.id === 'galaxy' ? (rVal < 0.36 ? 'rose_bloom' : (rVal < 0.48 ? 'star' : 'rose_petal'))
                        : (cfg.id === 'hearts' ? (rVal < 0.38 ? 'tulip_bloom' : (rVal < 0.50 ? 'star' : 'tulip_petal'))
                            : (cfg.id === 'ribbon' ? 'pearl' : 'petal')));
                particles.push({
                    type: pType,
                    isGold: Math.random() > 0.35,
                    isSakura: cfg.id === 'sakura',
                    hasTrail: pType === 'star',
                    x: (Math.random() - 0.5) * 155 * motionScale,
                    y: envMouthWorldY + 26 * motionScale,
                    z: (Math.random() - 0.5) * 280 * motionScale,
                    vx: (Math.random() - 0.5) * 290 * motionScale,
                    vy: (-330 - Math.random() * 350) * motionScale,
                    vz: (Math.random() - 0.5) * 320 * motionScale,
                    gravity: (pType === 'butterfly' || cfg.id === 'sakura' || pType === 'star') ? -45 : 95,
                    drag: 1.2,
                    vortex: 2.3,
                    flutter: 140 * motionScale,
                    phase: Math.random() * 6,
                    flapPhase: Math.random() * 6,
                    flapSpeed: 40,
                    size: (pType === 'butterfly' ? 16 : (pType === 'rose_bloom' || pType === 'tulip_bloom' ? (17 + Math.random() * 7) : (pType === 'pearl' ? 6 : (pType === 'star' ? 9 : 12.5)))) * motionScale,
                    tintA: '#ffe5ec',
                    tintB: '#fff3b0',
                    colorMid: cfg.id === 'sakura' ? '#ffb2c9' : '#f48fb1',
                    colorEnd: cfg.id === 'sakura' ? '#d83a6f' : '#ad1457',
                    rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6,
                    vrx: (Math.random() - 0.5) * 7, vry: (Math.random() - 0.5) * 7, vrz: (Math.random() - 0.5) * 6,
                    alpha: 1,
                    life: 0,
                    maxLife: 2.2
                });
            }
        }

        // ---------------------------------------------------------------------------------
        // PHA C: TÍNH TOÁN QUỸ ĐẠO PHONG BÌ & TẤM THIỆP ĐỂ THIỆP ĐI RA TỪ TỪ 0% -> 100% (KHÔNG BAO GIỜ NHẢY BẬC!)
        // ---------------------------------------------------------------------------------
        // Để bức thư rút ra khỏi phong bì từ từ đến hết 100% chiều dài mà KHÔNG bị biến ra đột ngột ở 1/3 cuối:
        // Tại thời điểm kết thúc pha rút (t = EXTRACT_END = 2.32s), cạnh đáy của tấm thiệp (cardBottomY)
        // PHẢI VƯỢT LÊN TRÊN miệng trên của túi phong bì (envTopMouthY)!
        // Khi cardBottomY <= envTopMouthY, toàn bộ 100% tấm thiệp đã ở phía trên túi trước (#u3d-env-front-rig),
        // nên không có bất kỳ phần nào của tấm thiệp bị nhảy lớp z-index!
        const targetCx = targetRect.left + baseW * 0.5;
        const targetCy = targetRect.top + baseH * 0.5;

        const extractedScale = pocketScale;
        const extractedH = baseH * extractedScale;
        const extractedCy = Math.max(extractedH * 0.52, targetCy - 18);
        const extractedBottomY = extractedCy + extractedH * 0.5;

        // Khoảng lùi xuống của phong bì tại t = EXTRACT_END sao cho miệng trên của túi phong bì (envTopMouthY)
        // nằm thấp hơn cạnh đáy của tấm thiệp (extractedBottomY) đúng 14px -> Thiệp đi ra từ từ 0% đến 100% trọn vẹn!
        const envScaleExtractEnd = 0.94;
        const envTopOffsetFromCenter = envBaseH * 0.43 * envScaleExtractEnd;
        const envExtractDropY = Math.max(240, (extractedBottomY + 14) - (envBaseCy - envTopOffsetFromCenter));

        let envX = 0;
        let envY = 0;
        let envZ = 0;
        let envRotX = 6;
        let envRotZ = 0;
        let envScale = 1;
        let envOpacity = 1;

        if (elapsed < WINDUP_END) {
            // Phong bì gồng mình tụ lực và rung nhẹ theo nhịp khởi động của con dấu sáp (0.00s -> 0.88s)
            const chargeCurve = Math.sin(w * Math.PI * 0.5);
            const rumble = w > 0.25 ? Math.pow((w - 0.25) / 0.75, 2) : 0;
            envX = Math.sin(elapsed * 58) * 3.2 * rumble;
            envY = -10 * Math.sin(w * Math.PI * 0.85);
            envZ = -34 * chargeCurve;
            envRotX = 6 - 12 * chargeCurve;
            envRotZ = Math.cos(elapsed * 46) * 1.4 * rumble;
            envScale = 1 - 0.035 * chargeCurve;
        } else if (elapsed < EXTRACT_START) {
            // Phản lực nhún nhẹ khi phong ấn nổ tung & nắp bật mở (0.88s -> 0.98s)
            const bp = (elapsed - WINDUP_END) / (EXTRACT_START - WINDUP_END);
            envY = 14 * bp;
            envZ = -34 + 10 * bp;
            envRotX = -6 + 6 * bp;
            envScale = 0.965;
        } else if (elapsed < EXTRACT_END) {
            // (0.98s -> 2.32s): Trong lúc tấm thiệp trượt lên, phong bì lùi mượt xuống dưới đến envExtractDropY
            // để miệng túi phong bì quét dọc hết 100% thân thiệp từ đỉnh thiệp xuống tận đáy thiệp!
            const ep = (elapsed - EXTRACT_START) / (EXTRACT_END - EXTRACT_START);
            // Đường cong S-curve siêu mượt (C1/C2 continuous)
            const easeEp = ep * ep * (3 - 2 * ep);
            envY = 14 + (envExtractDropY - 14) * easeEp;
            envZ = -24 + easeEp * 10;
            envRotX = easeEp * 16;
            envScale = 0.965 - easeEp * 0.025;
        } else {
            // Sau khi 100% tấm thiệp đã ra khỏi miệng bì thư (t >= 2.32s): Phong bì rỗng lùi mờ xuống dưới
            const dp = Math.min(1, (elapsed - EXTRACT_END) / (PRESENT_END - EXTRACT_END));
            const easeDp = dp * dp;
            envY = envExtractDropY + easeDp * 180;
            envZ = -14 - easeDp * 260;
            envRotX = 16 + easeDp * 22;
            envScale = 0.94 - easeDp * 0.26;
            envOpacity = Math.max(0, 1 - Math.pow(dp, 1.25));
        }

        const envMat = `perspective(1400px) translate3d(${envX.toFixed(1)}px, ${envY.toFixed(1)}px, ${envZ.toFixed(1)}px) rotateX(${envRotX.toFixed(2)}deg) rotateZ(${envRotZ.toFixed(2)}deg) scale(${envScale.toFixed(3)})`;
        backRig.style.transform = envMat;
        frontRig.style.transform = envMat;
        backRig.style.opacity = `${envOpacity.toFixed(3)}`;
        frontRig.style.opacity = `${envOpacity.toFixed(3)}`;

        // Ánh sáng Volumetric hé lộ từ khe nắp thư trong lúc khởi động và bùng sáng khi nắp mở
        if (pocketLight) {
            if (elapsed < WINDUP_END) {
                const glowW = Math.pow(w, 1.8) * 0.55;
                pocketLight.style.opacity = `${glowW.toFixed(3)}`;
                pocketLight.style.transform = `scaleY(${(0.25 + w * 0.35).toFixed(2)}) scaleX(${(0.65 + w * 0.25).toFixed(2)})`;
            } else {
                const lp = Math.min(1, (elapsed - WINDUP_END) / 0.42);
                const fadeL = elapsed > 1.95 ? Math.max(0, 1 - (elapsed - 1.95) / 0.65) : 1;
                pocketLight.style.opacity = `${((0.55 + 0.45 * Math.sin(lp * Math.PI * 0.5)) * fadeL).toFixed(3)}`;
                pocketLight.style.transform = `scaleY(${(0.60 + lp * 0.80).toFixed(2)}) scaleX(${(0.90 + lp * 0.30).toFixed(2)})`;
            }
        }
        if (pocketBloomCore && ['bloom', 'galaxy', 'hearts'].includes(cfg.id) && elapsed >= WINDUP_END + 0.04) {
            const bp = Math.min(1, (elapsed - (WINDUP_END + 0.04)) / 0.68);
            const easeBp = 1 - Math.pow(1 - bp, 3);
            pocketBloomCore.style.opacity = `${(Math.min(1, bp * 2.2) * envOpacity).toFixed(3)}`;
            pocketBloomCore.style.transform = `translate3d(0, ${(-easeBp * 48 * motionScale).toFixed(1)}px, 0) scale(${(0.18 + easeBp * 1.12).toFixed(3)}) rotateZ(${(easeBp * 28).toFixed(1)}deg)`;
        }

        // ---------------------------------------------------------------------------------
        // PHA D: QUỸ ĐẠO VẬT LÝ 3D CỦA TẤM THIỆP (RÚT MƯỢT 0% -> 100% KHỎI TÚI -> MỞ RỘNG RA SÂN KHẤU)
        // ---------------------------------------------------------------------------------
        let cardCx = screenCx;
        let cardCy = envBaseCy;
        let cardScale = pocketScale;
        let cardZ = 0;
        let cardRotX = envRotX;
        let cardRotY = 0;
        let cardRotZ = envRotZ;
        let cardOpacity = flapAngle < 8 ? 0 : Math.min(1, (flapAngle - 8) / 24);
        let bottomClipScreenPx = 0;

        const envBottomScreenY = envBaseCy + envY + (envBaseH * 0.445) * envScale;
        const startTopY = (envBaseCy - envBaseH * 0.36);
        const startCy = startTopY + cardInPocketH * 0.5;

        if (elapsed < EXTRACT_START) {
            // (0.00s -> 0.98s): Tấm thiệp nằm gọn bên trong túi chữ V, nhấp nhô cùng phong bì khi nắp hé mở
            cardCx = screenCx + envX;
            cardCy = startCy + envY;
            cardScale = pocketScale;
            bottomClipScreenPx = Math.max(0, (cardCy + cardInPocketH * 0.5) - envBottomScreenY);
        } else if (elapsed < EXTRACT_END) {
            // (0.98s -> 2.32s): BỨC THƯ TỪ TỪ ĐI RA KHỎI PHONG BÌ TỪ 0% ĐẾN ĐÚNG 100% CHIỀU DÀI!
            // Giữ nguyên bề ngang lọt lòng túi (pocketScale) trong suốt quá trình trượt qua miệng túi
            // và kết hợp phong bì lùi xuống để cạnh đáy bức thư vượt lên trên miệng túi tại đúng p = 1.0!
            cardOpacity = 1;
            const pp = (elapsed - EXTRACT_START) / (EXTRACT_END - EXTRACT_START);
            // Hàm S-curve mượt liên tục (không gãy vận tốc):
            const easePull = pp * pp * (3 - 2 * pp);

            const inEnvCy = startCy + envY;
            cardCx = screenCx;
            cardCy = inEnvCy + (extractedCy - inEnvCy) * easePull;
            cardScale = pocketScale;

            // Nghiêng 3D nhẹ nhàng sang trọng khi tấm thiệp trượt qua miệng túi
            const tiltWave = Math.sin(pp * Math.PI);
            cardRotX = envRotX * (1 - easePull) + 8 * tiltWave;
            cardRotY = tiltWave * (cfg.id === 'butterflies' ? -9 : 8);
            cardRotZ = tiltWave * (cfg.id === 'sakura' ? 2.5 : -2.0);
            cardZ = easePull * 28;

            // Cắt phần chân thiệp nếu còn thấp hơn đáy phong bì (tự động giảm mượt về 0 khi chân thiệp rút lên cao hơn đáy phong bì)
            const curCardH = baseH * cardScale;
            bottomClipScreenPx = Math.max(0, (cardCy + curCardH * 0.5) - envBottomScreenY);
        } else {
            // (2.32s -> 2.94s): Toàn bộ 100% tấm thiệp đã ra khỏi miệng bì thư!
            // Bây giờ tấm thiệp mới phóng to mượt mà từ kích thước lọt lòng túi (pocketScale) lên 1.000 khớp vào #card-showcase!
            if (!stage.classList.contains('pocket-cleared')) {
                stage.classList.add('pocket-cleared');
            }
            bottomClipScreenPx = 0;

            const fp = Math.min(1, (elapsed - EXTRACT_END) / (PRESENT_END - EXTRACT_END));
            // Quintic smooth-out để đáp vào khung đích êm như nhung, không khựng
            const easeExpand = 1 - Math.pow(1 - fp, 3.2);
            const rem = Math.pow(1 - fp, 2.2);

            cardCx = screenCx + (targetCx - screenCx) * easeExpand;
            cardCy = extractedCy + (targetCy - extractedCy) * easeExpand;
            cardScale = pocketScale + (1.0 - pocketScale) * easeExpand;
            cardZ = 28 * (1 - easeExpand) + Math.sin(fp * Math.PI) * 38 * rem;

            cardRotX = -Math.sin(fp * Math.PI) * 6 * rem;
            cardRotY = Math.sin(fp * Math.PI) * (cfg.id === 'butterflies' ? -9 : 9) * rem;
            cardRotZ = Math.sin(fp * Math.PI) * 1.8 * rem;

            // Pre-reveal #card-showcase nằm ngay bên dưới #u3d-card-actor từ t = PRESENT_END - 0.14s (khi thiệp đã trùng khớp 99.6% vị trí đích)
            // để đến đúng t = PRESENT_END, #card-showcase đã hiện 100% ở dưới, sau đó #u3d-card-actor tan nhẹ từ 1 -> 0 trong 0.24s mà KHÔNG HỀ CHỚP HAY GIẬT CỤC!
            if (cardShowcase && elapsed >= PRESENT_END - 0.14) {
                const underOp = Math.min(1, (elapsed - (PRESENT_END - 0.14)) / 0.12);
                cardShowcase.style.opacity = `${underOp.toFixed(3)}`;
            }

            if (elapsed < PRESENT_END) {
                cardOpacity = 1;
            } else {
                const handoffFade = Math.max(0, 1 - (elapsed - PRESENT_END) / 0.24);
                cardOpacity = handoffFade;
            }
        }

        // Áp dụng vị trí & tỷ lệ cho Tấm Thiệp BẰNG THUẦN GPU TRANSFORM (Không chạm vào style.width / style.height!)
        const curCardW = baseW * cardScale;
        const curCardH = baseH * cardScale;
        const cardLeft = cardCx - curCardW * 0.5;
        const cardTop = cardCy - curCardH * 0.5;

        cardActor.style.opacity = `${cardOpacity.toFixed(3)}`;
        cardActor.style.transform = `translate3d(${cardLeft.toFixed(2)}px, ${cardTop.toFixed(2)}px, 0px) scale(${cardScale.toFixed(4)})`;

        if (bottomClipScreenPx > 1.0) {
            const clipUnscaled = bottomClipScreenPx / cardScale;
            cardActor.style.clipPath = `inset(0px 0px ${clipUnscaled.toFixed(1)}px 0px)`;
            isClipPathNone = false;
        } else if (!isClipPathNone) {
            cardActor.style.clipPath = 'none';
            isClipPathNone = true;
        }

        if (cardInner) {
            cardInner.style.transform = `translateZ(${cardZ.toFixed(1)}px) rotateX(${cardRotX.toFixed(2)}deg) rotateY(${cardRotY.toFixed(2)}deg) rotateZ(${cardRotZ.toFixed(2)}deg)`;
        }

        // Quét vệt ánh kim phản quang vật lý (Specular Glare) theo góc nghiêng 3D thực tế của thiệp (Tự động tắt = 0 khi thiệp đáp phẳng để không tạo vệt trắng chớp màn hình!)
        const glareShift = ((cardRotY % 360) * 2.2 + cardRotX * 1.6);
        const tiltMagnitude = Math.min(1, (Math.abs(cardRotX) + Math.abs(cardRotY)) / 10);
        const specAlpha = elapsed < PRESENT_END ? (tiltMagnitude * 0.42) : 0;
        if (cardSpecular) {
            cardSpecular.style.opacity = `${specAlpha.toFixed(3)}`;
            cardSpecular.style.transform = `translateX(${glareShift.toFixed(1)}%) rotate(15deg)`;
        }
        if (backSpecular) {
            backSpecular.style.transform = `translateX(${(-glareShift).toFixed(1)}%) rotate(15deg)`;
        }

        // ---------------------------------------------------------------------------------
        // PHA E: VẼ VÒNG NĂNG LƯỢNG KHỞI ĐỘNG SÁP THƯ & CÁC CẤU TRÚC 3D BAO QUANH THIỆP
        // ---------------------------------------------------------------------------------
        if (elapsed < WINDUP_END) {
            const sealScreenY = screenCy + sealWorldY + envY;
            drawSealWindupEffect(ctxFront, cfg.id, w, screenCx + envX, screenCy, sealScreenY, motionScale);
        }

        const cardWorldX = cardCx - screenCx;
        const cardWorldY = cardCy - screenCy;

        // Cập nhật Dải Lụa Hoàng Kim & Hoa Lụa Xoắn 3D (Ribbon / Hồng Pháp / Tulip Nắng Mai)
        for (let i = 0; i < ribbons3D.length; i++) {
            const rb = ribbons3D[i];
            rb.originX = cardWorldX;
            rb.originY = cardWorldY + curCardH * 0.42;
            rb.progress = Math.min(1, (elapsed - EXTRACT_START) / 0.95);
            rb.phase += dt * 4.2;
            if (elapsed > 2.40) {
                rb.alpha = Math.max(0, 1 - (elapsed - 2.40) / 0.85);
            }
            drawSplit3DRibbonHelix(ctxBack, ctxFront, rb, screenCx, screenCy, focal, cardZ);
        }

        // Cập nhật 4 Hồ Điệp Chúa Hộ Tống 4 góc tấm thiệp (Butterflies)
        if (escortButterflies.length > 0 && elapsed >= EXTRACT_START && elapsed <= 3.35) {
            const fadeEscort = elapsed > 2.60 ? Math.max(0, 1 - (elapsed - 2.60) / 0.75) : 1;
            const spread = elapsed > 2.45 ? (elapsed - 2.45) * 135 : 0;
            escortButterflies.forEach(eb => {
                eb.flapPhase += eb.flapSpeed * dt;
                const ex = cardWorldX + eb.sx * (curCardW * 0.48 + spread);
                const ey = cardWorldY + eb.sy * (curCardH * 0.44 + spread * 0.6);
                const ez = cardZ + 28;
                draw3DProjectedParticle(ctxFront, {
                    type: 'butterfly',
                    isGold: true,
                    x: ex,
                    y: ey,
                    z: ez,
                    vx: eb.sx * 20,
                    vy: -60,
                    flapPhase: eb.flapPhase,
                    phase: eb.flapPhase,
                    size: eb.size,
                    alpha: fadeEscort
                }, screenCx, screenCy, focal);
            });
        }

        // Cập nhật 8 Đại Đóa Hồng Pháp / Tulip Hoàng Gia Hộ Tống 2 bên & 4 góc tấm thiệp (Galaxy / Hearts)
        if (escortFlowers.length > 0 && elapsed >= EXTRACT_START && elapsed <= 3.38) {
            const bloomIn = Math.min(1, (elapsed - EXTRACT_START) / 0.36);
            const easeBloomIn = 1 - Math.pow(1 - bloomIn, 3);
            const fadeEscort = elapsed > 2.58 ? Math.max(0, 1 - (elapsed - 2.58) / 0.78) : 1;
            const spread = elapsed > 2.42 ? (elapsed - 2.42) * 115 : 0;
            escortFlowers.forEach(ef => {
                ef.phase += dt * ef.rotSpeed;
                const swayX = Math.sin(ef.phase * 1.4) * 10 * motionScale;
                const swayY = Math.cos(ef.phase * 1.1) * 8 * motionScale;
                const ex = cardWorldX + ef.sx * (curCardW * 0.49 + spread) + swayX;
                const ey = cardWorldY + ef.sy * (curCardH * 0.45 + spread * 0.45) + swayY;
                const ez = cardZ + ef.zOff;
                const targetCtx = ez < cardZ ? ctxBack : ctxFront;
                draw3DProjectedParticle(targetCtx, {
                    type: ef.type,
                    x: ex,
                    y: ey,
                    z: ez,
                    rx: Math.sin(ef.phase * 0.7) * 0.25,
                    ry: Math.cos(ef.phase * 0.9) * 0.32,
                    rz: ef.type === 'tulip_bloom' ? (ef.baseTilt || 0) + Math.sin(ef.phase) * 0.18 : ef.phase * 0.65,
                    size: ef.size * (0.25 + 0.75 * easeBloomIn),
                    alpha: fadeEscort * Math.min(1, bloomIn * 1.8)
                }, screenCx, screenCy, focal);
            });
        }

        // Cập nhật & vẽ Hệ Hạt Vật Lý 3D (z < cardZ vẽ ở ctxBack, z >= cardZ vẽ ở ctxFront)
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life += dt;
            if (p.life >= p.maxLife) {
                particles.splice(i, 1);
                continue;
            }

            const dragFactor = Math.max(0, 1 - p.drag * dt);
            p.vx *= dragFactor;
            p.vy *= dragFactor;
            p.vz *= dragFactor;
            p.vy += p.gravity * dt;

            if (p.vortex > 0 && elapsed >= EXTRACT_START) {
                const dx = p.x - cardWorldX;
                const dz = p.z - cardZ;
                const dist = Math.max(35, Math.hypot(dx, dz));
                const tangX = -dz / dist;
                const tangZ = dx / dist;
                const pullIn = (145 - dist) * 0.85;
                p.vx += (tangX * p.vortex * 115 + (dx / dist) * pullIn) * dt;
                p.vz += (tangZ * p.vortex * 115 + (dz / dist) * pullIn) * dt;
            }

            if (p.flutter > 0) {
                p.phase += dt * 5.5;
                p.vx += Math.sin(p.phase) * p.flutter * dt;
                p.vz += Math.cos(p.phase * 0.8) * p.flutter * dt;
            }

            if (p.type === 'butterfly') {
                p.flapPhase += p.flapSpeed * dt;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            p.rx += p.vrx * dt;
            p.ry += p.vry * dt;
            p.rz += p.vrz * dt;

            const lifeRatio = p.life / p.maxLife;
            p.alpha = lifeRatio < 0.12
                ? lifeRatio / 0.12
                : (lifeRatio > 0.72 ? Math.max(0, (1 - lifeRatio) / 0.28) : 1);

            const targetCtx = p.z < cardZ ? ctxBack : ctxFront;
            draw3DProjectedParticle(targetCtx, p, screenCx, screenCy, focal);
        }

        // Bàn giao êm như nhung sang #card-showcase tại t >= PRESENT_END (2.94s):
        // - #card-showcase ở dưới đã hiện sẵn 100% từ t = 2.80s -> 2.92s
        // - #u3d-card-actor ở trên đang giảm mượt opacity từ 1 -> 0 (2.94s -> 3.18s)
        // - Không gọi lại updateShowcaseAmbientForMotion để tránh khởi tạo lại Canvas nền gây chớp màn hình!
        if (!hasHandedOffCard && elapsed >= PRESENT_END) {
            hasHandedOffCard = true;
            stage.classList.add('handing-off');
            if (frontRig) frontRig.style.pointerEvents = 'none';
            if (sealBtn) sealBtn.style.pointerEvents = 'none';
            if (cardShowcase) {
                cardShowcase.style.opacity = '1';
                cardShowcase.style.transform = 'translate3d(0, 0, 0) scale(1)';
            }
            if (!isStep2Preview) {
                document.body.classList.remove('u3d-stage-active');
                if (typeof window.recenterCardGyroscope === 'function') {
                    window.recenterCardGyroscope();
                }
                if (typeof startGyroShowcaseLoop === 'function') {
                    startGyroShowcaseLoop();
                }
                if (typeof u3dActiveOnComplete === 'function') {
                    u3dActiveOnComplete();
                    u3dActiveOnComplete = null;
                }
            }
        }

        // Kết thúc hoàn toàn sân khấu khi các hạt 3D cuối cùng đã tan hết (t >= 3.65s)
        if (elapsed >= 3.65) {
            stage.style.display = 'none';
            stage.classList.remove('is-summoning', 'is-arriving', 'is-opening', 'pocket-cleared', 'handing-off');
            document.body.classList.remove('u3d-stage-active');
            if (cardShowcase) cardShowcase.style.opacity = '1';
            u3dCurrentDirectorState = 'hidden';
            u3dAnimFrameId = null;

            // Nếu đang Xem thử mở 3D từ Bước 2 -> Tự động trả ngay về màn hình Edit Bước 2 (không ở lại Bước 3!)
            if (isStep2Preview && typeof window.finishStep2MotionPreview === 'function') {
                window.finishStep2MotionPreview();
            }
            return;
        }

        u3dAnimFrameId = requestAnimationFrame(stepPhysicsDirector);
    }

    u3dAnimFrameId = requestAnimationFrame(stepPhysicsDirector);
};

// Tương thích ngược với các lệnh gọi cũ: Tất cả đều quy về Sân Khấu Phong Bì Vật Lý 3D Hợp Nhất (Bắt buộc ấn vào dấu sáp mới mở)!
window.play3DMotionTransition = function (motionId = 'bloom') {
    window.launchUnified3DEnvelopeDirector({
        autoOpen: false,
        motionId: motionId || window.currentMotionEffect || 'bloom',
        themeKey: currentColorTheme || 'emerald',
        isRealRecipient: window.isRecipientCardLinkMode
    });
};

window.triggerShowcaseMotionReveal = function (motionId = 'bloom') {
    updateShowcaseAmbientForMotion(motionId || window.currentMotionEffect || 'bloom');
};

// ====== THẾ GIỚI NỀN HẬU CẢNH 3D SỐNG ĐỘNG & HOÀNH TRÁNG RIÊNG CHO TỪNG KIỂU MOTION ======
let showcaseBgAnimFrameId = null;
let showcaseBgCurrentMotion = '';
let showcaseBgActors = [];

function initShowcaseBgActors(motionId, width, height) {
    const actors = [];
    const w = Math.max(width, 320);
    const h = Math.max(height, 480);
    const bgScale = Math.max(0.88, Math.min(1.85, Math.min(w, h) / 420));

    // 1. Lớp Hào Quang Bokeh Chiều Sâu (Optical Depth-of-Field Bokeh Orbs) cho mọi thế giới
    const bokehPalette = {
        bloom: ['#ffb3c6', '#ffd166', '#ff8fab', '#ffe5ec'],
        butterflies: ['#ffe169', '#7ae582', '#ffd166', '#a8f0c6'],
        ribbon: ['#ff9ebb', '#ffe5ec', '#ffd166', '#f48fb1'],
        galaxy: ['#ff4d6d', '#ffb3c1', '#ffd166', '#ff8fa3'],
        sakura: ['#ffb7d5', '#ffe5ec', '#ffd166', '#ffc2d1'],
        hearts: ['#ff8fa3', '#ffd166', '#ffe5ec', '#ff9ebb']
    }[motionId] || ['#ffb3c6', '#ffd166'];

    for (let i = 0; i < 16; i++) {
        actors.push({
            kind: 'bokeh_orb',
            x: Math.random() * w,
            y: Math.random() * h,
            radius: (18 + Math.random() * 42) * bgScale,
            vx: (Math.random() - 0.5) * 0.22 * bgScale,
            vy: (-0.15 - Math.random() * 0.25) * bgScale,
            phase: Math.random() * Math.PI * 2,
            alpha: 0.08 + Math.random() * 0.14,
            color: bokehPalette[i % bokehPalette.length]
        });
    }

    if (motionId === 'bloom') {
        // 🌺 VƯỜN THƯỢNG UYỂN ĐẠI HOA TRÀ 3D: Những đóa Hoa Trà nhiều tầng cánh nở xoay 3D + Cánh hoa nhung & Phấn hoàng kim
        for (let i = 0; i < 7; i++) {
            actors.push({
                kind: 'grand_camellia',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (16 + Math.random() * 18) * bgScale,
                vx: (Math.random() - 0.5) * 0.35 * bgScale,
                vy: (-0.28 - Math.random() * 0.38) * bgScale,
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.014,
                tiltPhase: Math.random() * Math.PI * 2,
                alpha: 0.45 + Math.random() * 0.38,
                outerColor: i % 2 === 0 ? '#ff5c8a' : '#ff85a1',
                innerColor: '#ffe5ec'
            });
        }
        for (let i = 0; i < 26; i++) {
            actors.push({
                kind: 'camellia_petal',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (9 + Math.random() * 11) * bgScale,
                vx: (-0.3 + Math.random() * 0.6) * bgScale,
                vy: (-0.45 - Math.random() * 0.65) * bgScale,
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.025,
                swayPhase: Math.random() * Math.PI * 2,
                alpha: 0.5 + Math.random() * 0.42,
                color: ['#ff4d79', '#ff8fab', '#ffb3c6', '#ffd166'][i % 4]
            });
        }
        for (let i = 0; i < 18; i++) {
            actors.push({
                kind: 'gold_sparkle',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (4 + Math.random() * 6) * bgScale,
                vy: (-0.3 - Math.random() * 0.4) * bgScale,
                phase: Math.random() * Math.PI * 2,
                color: '#ffe58f'
            });
        }
    } else if (motionId === 'butterflies') {
        // 🦋 RỪNG THIÊNG HỒ ĐIỆP ÁNH KIM: Đàn Bướm Hoàng Kim 3D 4 cánh chi tiết + Đom đóm phát quang rực rỡ
        for (let i = 0; i < 16; i++) {
            const isClose = i < 5;
            actors.push({
                kind: 'monarch_butterfly',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (isClose ? (15 + Math.random() * 8) : (9 + Math.random() * 7)) * bgScale,
                vx: (Math.random() - 0.5) * 0.85 * bgScale,
                vy: (-0.55 - Math.random() * 0.75) * bgScale,
                flapPhase: Math.random() * Math.PI * 2,
                flapSpeed: 0.15 + Math.random() * 0.08,
                swayPhase: Math.random() * Math.PI * 2,
                alpha: isClose ? (0.78 + Math.random() * 0.2) : (0.48 + Math.random() * 0.35),
                primaryColor: i % 3 === 0 ? '#ff9ebb' : '#ffd54f',
                innerColor: '#fff9db'
            });
        }
        for (let i = 0; i < 28; i++) {
            actors.push({
                kind: 'firefly_glow',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (2.5 + Math.random() * 4.5) * bgScale,
                vx: (Math.random() - 0.5) * 0.45 * bgScale,
                vy: (-0.25 - Math.random() * 0.45) * bgScale,
                pulsePhase: Math.random() * Math.PI * 2,
                color: i % 3 === 0 ? '#69f0ae' : '#ffe57f'
            });
        }
    } else if (motionId === 'ribbon') {
        // 🎀 KHÁN PHÒNG LỤA HOÀNG GIA & NGỌC TRAI: Nơ Lụa 3D bồng bềnh + Dải Ruy-băng Satin lượn sóng + Ngọc Trai phát sáng
        for (let i = 0; i < 8; i++) {
            actors.push({
                kind: 'couture_bow',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (13 + Math.random() * 11) * bgScale,
                vx: (Math.random() - 0.5) * 0.35 * bgScale,
                vy: (-0.32 - Math.random() * 0.45) * bgScale,
                rot: (Math.random() - 0.5) * 0.5,
                swayPhase: Math.random() * Math.PI * 2,
                alpha: 0.52 + Math.random() * 0.38,
                color: i % 2 === 0 ? '#ff6b9d' : '#ff9ebb'
            });
        }
        for (let i = 0; i < 12; i++) {
            actors.push({
                kind: 'silk_petal_ribbon',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (14 + Math.random() * 12) * bgScale,
                vx: (Math.random() - 0.5) * 0.45 * bgScale,
                vy: (-0.38 - Math.random() * 0.5) * bgScale,
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.02,
                phase: Math.random() * Math.PI * 2,
                alpha: 0.45 + Math.random() * 0.35,
                color: i % 2 === 0 ? '#ff80ab' : '#ffd54f'
            });
        }
        for (let i = 0; i < 24; i++) {
            actors.push({
                kind: 'lustrous_pearl',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (3.5 + Math.random() * 5.5) * bgScale,
                vy: (-0.28 - Math.random() * 0.45) * bgScale,
                swayPhase: Math.random() * Math.PI * 2,
                alpha: 0.55 + Math.random() * 0.4
            });
        }
    } else if (motionId === 'galaxy') {
        // 🌹 ĐẠI VƯỜN HỒNG NHUNG PHÁP CENTIFOLIA & SƯƠNG MAI HOÀNG KIM 3D: Tia sáng Vàng Hồng + Bokeh + 14 Đại Đóa Hồng Pháp đa tầng chiều sâu + 36 Cánh hồng nhung + Sương mai kim cương
        for (let i = 0; i < 4; i++) {
            actors.push({
                kind: 'sunbeam_ray',
                x: w * (0.18 + i * 0.22),
                y: -h * 0.1,
                width: (75 + Math.random() * 55) * bgScale,
                length: h * 1.35,
                angle: 0.32 + (Math.random() - 0.5) * 0.12,
                phase: i * 1.4,
                color: i % 2 === 0 ? 'rgba(255, 228, 181, 0.11)' : 'rgba(251, 113, 133, 0.10)'
            });
        }
        for (let i = 0; i < 8; i++) {
            actors.push({
                kind: 'bokeh_orb',
                x: Math.random() * w,
                y: Math.random() * h,
                radius: (24 + Math.random() * 44) * bgScale,
                vx: (Math.random() - 0.5) * 0.22 * bgScale,
                vy: (-0.15 - Math.random() * 0.25) * bgScale,
                phase: Math.random() * Math.PI * 2,
                alpha: 0.14 + Math.random() * 0.16,
                color: i % 2 === 0 ? '#fda4af' : '#fde68a'
            });
        }
        for (let i = 0; i < 14; i++) {
            const isHeroForeground = i < 4;
            actors.push({
                kind: 'french_rose_bloom',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (isHeroForeground ? (26 + Math.random() * 11) : (15 + Math.random() * 13)) * bgScale,
                vx: (Math.random() - 0.5) * 0.42 * bgScale,
                vy: (-0.34 - Math.random() * 0.48) * bgScale,
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.016,
                tiltPhase: Math.random() * Math.PI * 2,
                alpha: isHeroForeground ? (0.78 + Math.random() * 0.20) : (0.56 + Math.random() * 0.34)
            });
        }
        for (let i = 0; i < 36; i++) {
            actors.push({
                kind: 'french_rose_petal',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (10.5 + Math.random() * 12.5) * bgScale,
                vx: (-0.38 + Math.random() * 0.76) * bgScale,
                vy: (-0.44 - Math.random() * 0.66) * bgScale,
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.028,
                swayPhase: Math.random() * Math.PI * 2,
                alpha: 0.64 + Math.random() * 0.34
            });
        }
        for (let i = 0; i < 20; i++) {
            actors.push({
                kind: 'firefly_glow',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (2.8 + Math.random() * 4.4) * bgScale,
                vx: (Math.random() - 0.5) * 0.34 * bgScale,
                vy: (-0.26 - Math.random() * 0.38) * bgScale,
                pulsePhase: Math.random() * Math.PI * 2,
                color: i % 3 === 0 ? '#ffb3c1' : '#ffe57f'
            });
        }
        for (let i = 0; i < 14; i++) {
            actors.push({
                kind: 'gold_sparkle',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (4.8 + Math.random() * 6.2) * bgScale,
                vy: (-0.26 - Math.random() * 0.38) * bgScale,
                phase: Math.random() * Math.PI * 2,
                color: i % 2 === 0 ? '#fff1f2' : '#fde047'
            });
        }
    } else if (motionId === 'sakura') {
        // 🌸 ĐÊM TRĂNG MƯA HOA ANH ĐÀO: Đóa Anh Đào 5 cánh xoay 3D + Cánh hoa chẻ đôi bay lượn + Đèn lồng đom đóm ấm
        for (let i = 0; i < 9; i++) {
            actors.push({
                kind: 'sakura_blossom',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (13 + Math.random() * 11) * bgScale,
                vx: (0.35 + Math.random() * 0.55) * bgScale,
                vy: (0.42 + Math.random() * 0.65) * bgScale,
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.022,
                tiltPhase: Math.random() * Math.PI * 2,
                alpha: 0.55 + Math.random() * 0.38
            });
        }
        for (let i = 0; i < 34; i++) {
            actors.push({
                kind: 'sakura_petal',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (7.5 + Math.random() * 8.5) * bgScale,
                vx: (0.5 + Math.random() * 0.85) * bgScale,
                vy: (0.58 + Math.random() * 0.9) * bgScale,
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.032,
                flipPhase: Math.random() * Math.PI * 2,
                alpha: 0.52 + Math.random() * 0.42,
                color: i % 2 === 0 ? '#ffb7d5' : '#ffe5ec'
            });
        }
        for (let i = 0; i < 16; i++) {
            actors.push({
                kind: 'firefly_glow',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (2.5 + Math.random() * 3.8) * bgScale,
                vx: (Math.random() - 0.5) * 0.3 * bgScale,
                vy: (-0.25 - Math.random() * 0.35) * bgScale,
                pulsePhase: Math.random() * Math.PI * 2,
                color: '#ffe58f'
            });
        }
    } else if (motionId === 'hearts') {
        // 🌷 ĐẠI VƯỜN TULIP HOÀNG GIA HÀ LAN NẮNG MAI 3D: Tia Nắng Mật Ong + Bokeh Nắng Sớm + 14 Đóa Tulip Hoàng Gia đa tầng + 34 Cánh Tulip lụa đào + Phấn nắng lấp lánh
        for (let i = 0; i < 4; i++) {
            actors.push({
                kind: 'sunbeam_ray',
                x: w * (0.16 + i * 0.23),
                y: -h * 0.1,
                width: (82 + Math.random() * 60) * bgScale,
                length: h * 1.35,
                angle: -0.28 + (Math.random() - 0.5) * 0.12,
                phase: i * 1.3,
                color: i % 2 === 0 ? 'rgba(254, 240, 138, 0.13)' : 'rgba(253, 164, 175, 0.11)'
            });
        }
        for (let i = 0; i < 9; i++) {
            actors.push({
                kind: 'bokeh_orb',
                x: Math.random() * w,
                y: Math.random() * h,
                radius: (24 + Math.random() * 46) * bgScale,
                vx: (Math.random() - 0.5) * 0.22 * bgScale,
                vy: (-0.16 - Math.random() * 0.26) * bgScale,
                phase: Math.random() * Math.PI * 2,
                alpha: 0.15 + Math.random() * 0.16,
                color: i % 2 === 0 ? '#fef08a' : '#fda4af'
            });
        }
        for (let i = 0; i < 14; i++) {
            const isHeroForeground = i < 4;
            actors.push({
                kind: 'tulip_blossom',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (isHeroForeground ? (25 + Math.random() * 11) : (15 + Math.random() * 13)) * bgScale,
                vx: (Math.random() - 0.5) * 0.38 * bgScale,
                vy: (-0.36 - Math.random() * 0.48) * bgScale,
                rot: (Math.random() - 0.5) * 0.52,
                vRot: (Math.random() - 0.5) * 0.012,
                tiltPhase: Math.random() * Math.PI * 2,
                alpha: isHeroForeground ? (0.80 + Math.random() * 0.18) : (0.60 + Math.random() * 0.32)
            });
        }
        for (let i = 0; i < 34; i++) {
            actors.push({
                kind: 'tulip_petal',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (10 + Math.random() * 12) * bgScale,
                vx: (-0.35 + Math.random() * 0.70) * bgScale,
                vy: (-0.42 - Math.random() * 0.62) * bgScale,
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.025,
                swayPhase: Math.random() * Math.PI * 2,
                alpha: 0.62 + Math.random() * 0.36
            });
        }
        for (let i = 0; i < 16; i++) {
            actors.push({
                kind: 'firefly_glow',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (2.8 + Math.random() * 4.2) * bgScale,
                vx: (Math.random() - 0.5) * 0.32 * bgScale,
                vy: (-0.25 - Math.random() * 0.36) * bgScale,
                pulsePhase: Math.random() * Math.PI * 2,
                color: i % 2 === 0 ? '#fef08a' : '#fda4af'
            });
        }
        for (let i = 0; i < 24; i++) {
            actors.push({
                kind: 'gold_sparkle',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (5.0 + Math.random() * 6.8) * bgScale,
                vy: (-0.26 - Math.random() * 0.42) * bgScale,
                phase: Math.random() * Math.PI * 2,
                color: i % 2 === 0 ? '#ffe5ec' : '#ffd166'
            });
        }
    }
    return actors;
}

function startShowcaseBackgroundWorld(motionId = 'bloom') {
    const canvas = document.getElementById('showcase-bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const w = window.innerWidth || 390;
        const h = window.innerHeight || 844;
        if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
        }
        return { w, h, dpr };
    };

    const dims = resizeCanvas();
    if (showcaseBgCurrentMotion === motionId && showcaseBgAnimFrameId && showcaseBgActors.length > 0) {
        return;
    }

    showcaseBgCurrentMotion = motionId;
    let lastActorInitW = dims.w;
    let lastActorInitH = dims.h;
    showcaseBgActors = initShowcaseBgActors(motionId, dims.w, dims.h);

    if (showcaseBgAnimFrameId) {
        cancelAnimationFrame(showcaseBgAnimFrameId);
        showcaseBgAnimFrameId = null;
    }

    let lastTime = performance.now();
    const renderLoop = (now) => {
        showcaseBgAnimFrameId = requestAnimationFrame(renderLoop);
        if (!step3 || !step3.classList.contains('active')) return;

        const dt = Math.min(0.05, Math.max(0.008, (now - lastTime) / 1000));
        lastTime = now;
        const t = now * 0.001;

        const { w, h, dpr } = resizeCanvas();
        if (Math.abs(w - lastActorInitW) > 64 || Math.abs(h - lastActorInitH) > 64) {
            lastActorInitW = w;
            lastActorInitH = h;
            showcaseBgActors = initShowcaseBgActors(showcaseBgCurrentMotion, w, h);
        }
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        for (let i = 0; i < showcaseBgActors.length; i++) {
            const a = showcaseBgActors[i];

            if (a.kind === 'sunbeam_ray') {
                const sway = Math.sin(t * 0.55 + a.phase) * 0.04;
                const breathe = 0.65 + 0.35 * Math.sin(t * 0.9 + a.phase);
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.rotate(a.angle + sway);
                ctx.globalAlpha = breathe;
                const rayGrad = ctx.createLinearGradient(-a.width * 0.5, 0, a.width * 0.5, 0);
                rayGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
                rayGrad.addColorStop(0.5, a.color);
                rayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = rayGrad;
                ctx.fillRect(-a.width * 0.5, 0, a.width, a.length);
                ctx.restore();
            } else if (a.kind === 'bokeh_orb') {
                a.x += a.vx + Math.sin(t * 0.8 + a.phase) * 0.18;
                a.y += a.vy;
                if (a.y < -a.radius * 1.5) { a.y = h + a.radius; a.x = Math.random() * w; }
                if (a.x < -a.radius * 1.5) a.x = w + a.radius;
                if (a.x > w + a.radius * 1.5) a.x = -a.radius;

                const breathe = 0.7 + 0.3 * Math.sin(t * 1.6 + a.phase);
                ctx.save();
                ctx.fillStyle = a.color;
                ctx.globalAlpha = a.alpha * breathe * 0.45;
                ctx.beginPath();
                ctx.arc(a.x, a.y, a.radius * 1.25, 0, Math.PI * 2);
                ctx.fill();

                ctx.globalAlpha = a.alpha * breathe;
                ctx.beginPath();
                ctx.arc(a.x, a.y, a.radius * 0.72, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (a.kind === 'grand_camellia') {
                a.x += a.vx + Math.sin(t * 1.1 + a.tiltPhase) * 0.32;
                a.y += a.vy;
                a.rot += a.vRot;
                if (a.y < -45) { a.y = h + 40; a.x = Math.random() * w; }
                if (a.x < -45) a.x = w + 40;
                if (a.x > w + 45) a.x = -40;

                const s = a.size;
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.rotate(a.rot);
                ctx.scale(1, 0.72 + 0.25 * Math.sin(t * 1.5 + a.tiltPhase));
                ctx.globalAlpha = a.alpha;

                // Tầng 8 cánh hoa trà lớn bên ngoài
                ctx.fillStyle = a.outerColor;
                for (let p = 0; p < 8; p++) {
                    ctx.save();
                    ctx.rotate((p / 8) * Math.PI * 2);
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.bezierCurveTo(-s * 0.42, -s * 0.35, -s * 0.48, -s * 0.92, 0, -s);
                    ctx.bezierCurveTo(s * 0.48, -s * 0.92, s * 0.42, -s * 0.35, 0, 0);
                    ctx.fill();
                    ctx.restore();
                }
                // Tầng 6 cánh hoa hồng phấn bên trong
                ctx.fillStyle = a.innerColor;
                for (let p = 0; p < 6; p++) {
                    ctx.save();
                    ctx.rotate((p / 6) * Math.PI * 2 + 0.26);
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.bezierCurveTo(-s * 0.28, -s * 0.22, -s * 0.32, -s * 0.62, 0, -s * 0.68);
                    ctx.bezierCurveTo(s * 0.32, -s * 0.62, s * 0.28, -s * 0.22, 0, 0);
                    ctx.fill();
                    ctx.restore();
                }
                // Nhụy hoàng kim phát sáng
                ctx.fillStyle = '#ffd54f';
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (a.kind === 'camellia_petal') {
                a.x += a.vx + Math.sin(t * 1.5 + a.swayPhase) * 0.42;
                a.y += a.vy;
                a.rot += a.vRot;
                if (a.y < -30) { a.y = h + 25; a.x = Math.random() * w; }
                if (a.x < -30) a.x = w + 25;
                if (a.x > w + 30) a.x = -25;

                const s = a.size;
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.rotate(a.rot);
                ctx.scale(1, 0.58 + 0.38 * Math.sin(t * 2.1 + a.swayPhase));
                ctx.globalAlpha = a.alpha;
                ctx.fillStyle = a.color;
                ctx.beginPath();
                ctx.moveTo(0, s * 0.85);
                ctx.bezierCurveTo(-s * 0.9, s * 0.35, -s * 0.85, -s * 0.72, 0, -s);
                ctx.bezierCurveTo(s * 0.85, -s * 0.72, s * 0.9, s * 0.35, 0, s * 0.85);
                ctx.fill();

                ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
                ctx.beginPath();
                ctx.arc(-s * 0.15, -s * 0.25, s * 0.32, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (a.kind === 'monarch_butterfly') {
                a.flapPhase += a.flapSpeed;
                const sway = Math.sin(t * 1.8 + a.swayPhase) * 0.65;
                a.x += a.vx + sway;
                a.y += a.vy;
                if (a.y < -40) { a.y = h + 35; a.x = Math.random() * w; }
                if (a.x < -40) a.x = w + 35;
                if (a.x > w + 40) a.x = -35;

                const wingScale = 0.18 + 0.82 * Math.abs(Math.cos(a.flapPhase));
                const s = a.size;
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.rotate((a.vx + sway) * 0.28);

                // Hào quang hoàng kim quanh thân bướm
                ctx.globalAlpha = a.alpha * 0.22;
                ctx.fillStyle = a.primaryColor;
                ctx.beginPath();
                ctx.arc(0, 0, s * 1.45, 0, Math.PI * 2);
                ctx.fill();

                ctx.globalAlpha = a.alpha;
                for (const dir of [-1, 1]) {
                    ctx.save();
                    ctx.scale(dir * wingScale, 1);
                    // Cánh trên & Cánh dưới điêu khắc 3D
                    ctx.fillStyle = a.primaryColor;
                    ctx.beginPath();
                    ctx.moveTo(0, -s * 0.12);
                    ctx.bezierCurveTo(s * 0.65, -s * 1.15, s * 1.45, -s * 0.55, s * 1.05, s * 0.12);
                    ctx.bezierCurveTo(s * 0.72, s * 0.32, s * 0.28, s * 0.18, 0, s * 0.06);
                    ctx.closePath();
                    ctx.fill();

                    ctx.beginPath();
                    ctx.moveTo(0, s * 0.06);
                    ctx.bezierCurveTo(s * 0.75, s * 0.26, s * 0.92, s * 0.98, s * 0.42, s * 1.04);
                    ctx.bezierCurveTo(s * 0.16, s * 1.02, s * 0.06, s * 0.52, 0, s * 0.22);
                    ctx.closePath();
                    ctx.fill();

                    // Vân sáng ngọc trai bên trong cánh
                    ctx.fillStyle = a.innerColor;
                    ctx.globalAlpha = a.alpha * 0.75;
                    ctx.beginPath();
                    ctx.ellipse(s * 0.48, -s * 0.26, s * 0.26, s * 0.16, -0.35, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
                // Thân bướm ánh đồng
                ctx.fillStyle = '#fff3b8';
                ctx.beginPath();
                ctx.ellipse(0, s * 0.1, s * 0.09, s * 0.42, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (a.kind === 'firefly_glow') {
                a.x += (a.vx || 0) + Math.sin(t * 1.5 + a.pulsePhase) * 0.35;
                a.y += (a.vy || -0.3);
                if (a.y < -24) { a.y = h + 20; a.x = Math.random() * w; }
                if (a.y > h + 24) { a.y = -20; a.x = Math.random() * w; }
                if (a.x < -24) a.x = w + 20;
                if (a.x > w + 24) a.x = -20;

                const pulse = 0.45 + 0.55 * Math.pow(0.5 + 0.5 * Math.sin(t * 2.8 + a.pulsePhase), 2);
                ctx.save();
                ctx.fillStyle = a.color;
                ctx.globalAlpha = 0.18 * pulse;
                ctx.beginPath();
                ctx.arc(a.x, a.y, a.size * 3.4, 0, Math.PI * 2);
                ctx.fill();

                ctx.globalAlpha = 0.42 * pulse;
                ctx.beginPath();
                ctx.arc(a.x, a.y, a.size * 1.7, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = 0.92 * pulse;
                ctx.beginPath();
                ctx.arc(a.x, a.y, a.size * 0.65, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (a.kind === 'couture_bow') {
                a.x += a.vx + Math.sin(t * 1.3 + a.swayPhase) * 0.35;
                a.y += a.vy;
                if (a.y < -40) { a.y = h + 35; a.x = Math.random() * w; }
                if (a.x < -40) a.x = w + 35;
                if (a.x > w + 40) a.x = -35;

                const s = a.size;
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.rotate(a.rot + Math.sin(t * 1.6 + a.swayPhase) * 0.16);
                ctx.globalAlpha = a.alpha;
                ctx.fillStyle = a.color;

                for (const dir of [-1, 1]) {
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.bezierCurveTo(dir * s * 0.65, -s * 0.85, dir * s * 1.35, -s * 0.45, dir * s * 1.15, s * 0.15);
                    ctx.bezierCurveTo(dir * s * 0.95, s * 0.55, dir * s * 0.35, s * 0.35, 0, s * 0.08);
                    ctx.closePath();
                    ctx.fill();

                    // Đuôi ruy-băng lụa mềm rủ xuống
                    ctx.beginPath();
                    ctx.moveTo(dir * s * 0.1, s * 0.08);
                    ctx.quadraticCurveTo(dir * s * 0.55, s * 0.65, dir * s * 0.78, s * 1.15);
                    ctx.lineTo(dir * s * 0.38, s * 1.05);
                    ctx.quadraticCurveTo(dir * s * 0.22, s * 0.58, 0, s * 0.12);
                    ctx.closePath();
                    ctx.fill();
                }
                // Viên ngọc trai tâm nơ
                ctx.fillStyle = '#fff9e6';
                ctx.beginPath();
                ctx.arc(0, s * 0.05, s * 0.24, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (a.kind === 'silk_petal_ribbon') {
                a.x += a.vx + Math.sin(t * 1.4 + a.phase) * 0.45;
                a.y += a.vy;
                a.rot += a.vRot;
                if (a.y < -35) { a.y = h + 30; a.x = Math.random() * w; }

                const s = a.size;
                const wave = Math.sin(t * 2.4 + a.phase) * s * 0.35;
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.rotate(a.rot);
                ctx.globalAlpha = a.alpha;
                ctx.fillStyle = a.color;
                ctx.beginPath();
                ctx.moveTo(-s, -s * 0.22);
                ctx.bezierCurveTo(-s * 0.3, -s * 0.65 + wave, s * 0.3, s * 0.25 - wave, s, -s * 0.18);
                ctx.lineTo(s * 0.85, s * 0.24);
                ctx.bezierCurveTo(s * 0.25, s * 0.68 - wave, -s * 0.35, -s * 0.2 + wave, -s * 0.85, s * 0.22);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else if (a.kind === 'lustrous_pearl') {
                a.x += Math.sin(t * 1.4 + a.swayPhase) * 0.32;
                a.y += a.vy;
                if (a.y < -20) { a.y = h + 18; a.x = Math.random() * w; }

                ctx.save();
                ctx.globalAlpha = a.alpha * 0.28;
                ctx.fillStyle = '#ff9ebb';
                ctx.beginPath();
                ctx.arc(a.x, a.y, a.size * 1.8, 0, Math.PI * 2);
                ctx.fill();

                ctx.globalAlpha = a.alpha;
                ctx.fillStyle = '#fff5f8';
                ctx.beginPath();
                ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(a.x - a.size * 0.3, a.y - a.size * 0.3, a.size * 0.35, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (a.kind === 'french_rose_bloom') {
                a.x += a.vx + Math.sin(t * 1.1 + a.tiltPhase) * 0.36;
                a.y += a.vy;
                a.rot += a.vRot;
                if (a.y < -48) { a.y = h + 42; a.x = Math.random() * w; }
                if (a.x < -48) a.x = w + 42;
                if (a.x > w + 48) a.x = -42;

                const atlas = getU3DLuxurySpriteAtlas();
                const s = a.size;
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.rotate(a.rot);
                ctx.scale(1, 0.76 + 0.24 * Math.sin(t * 1.5 + a.tiltPhase));
                ctx.globalAlpha = a.alpha;
                ctx.drawImage(atlas.roseBloom, -s * 1.35, -s * 1.35, s * 2.7, s * 2.7);
                ctx.restore();
            } else if (a.kind === 'french_rose_petal') {
                a.x += a.vx + Math.sin(t * 1.6 + a.swayPhase) * 0.45;
                a.y += a.vy;
                a.rot += a.vRot;
                if (a.y < -32) { a.y = h + 28; a.x = Math.random() * w; }
                if (a.x < -32) a.x = w + 28;
                if (a.x > w + 32) a.x = -28;

                const atlas = getU3DLuxurySpriteAtlas();
                const s = a.size;
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.rotate(a.rot);
                ctx.scale(1, 0.56 + 0.44 * Math.sin(t * 2.2 + a.swayPhase));
                ctx.globalAlpha = a.alpha;
                ctx.drawImage(atlas.rosePetal, -s * 1.3, -s * 1.3, s * 2.6, s * 2.6);
                ctx.restore();
            } else if (a.kind === 'sakura_blossom') {
                a.x += a.vx + Math.sin(t * 1.2 + a.tiltPhase) * 0.35;
                a.y += a.vy;
                a.rot += a.vRot;
                if (a.y > h + 40) { a.y = -35; a.x = Math.random() * w; }
                if (a.x > w + 40) { a.x = -35; a.y = Math.random() * h; }

                const s = a.size;
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.rotate(a.rot);
                ctx.scale(1, 0.72 + 0.25 * Math.cos(t * 1.8 + a.tiltPhase));
                ctx.globalAlpha = a.alpha;
                ctx.fillStyle = '#ffc2d4';
                for (let p = 0; p < 5; p++) {
                    ctx.save();
                    ctx.rotate((p / 5) * Math.PI * 2);
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.bezierCurveTo(-s * 0.42, -s * 0.28, -s * 0.45, -s * 0.85, -s * 0.12, -s);
                    ctx.lineTo(0, -s * 0.76);
                    ctx.lineTo(s * 0.12, -s);
                    ctx.bezierCurveTo(s * 0.45, -s * 0.85, s * 0.42, -s * 0.28, 0, 0);
                    ctx.fill();
                    ctx.restore();
                }
                ctx.fillStyle = '#ffe58f';
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.16, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (a.kind === 'sakura_petal') {
                a.x += a.vx + Math.sin(t * 1.5 + a.flipPhase) * 0.38;
                a.y += a.vy;
                a.rot += a.vRot;
                if (a.y > h + 25) { a.y = -20; a.x = Math.random() * w; }
                if (a.x > w + 25) { a.x = -20; a.y = Math.random() * h; }

                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.rotate(a.rot);
                ctx.scale(1, 0.55 + 0.45 * Math.cos(t * 2.2 + a.flipPhase));
                ctx.globalAlpha = a.alpha;
                ctx.fillStyle = a.color;
                ctx.beginPath();
                ctx.moveTo(0, a.size);
                ctx.bezierCurveTo(-a.size * 0.85, a.size * 0.3, -a.size * 0.75, -a.size * 0.75, -a.size * 0.22, -a.size);
                ctx.lineTo(0, -a.size * 0.68);
                ctx.lineTo(a.size * 0.22, -a.size);
                ctx.bezierCurveTo(a.size * 0.75, -a.size * 0.75, a.size * 0.85, a.size * 0.3, 0, a.size);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else if (a.kind === 'tulip_blossom') {
                a.y += a.vy;
                a.x += a.vx + Math.sin(t * 1.2 + a.tiltPhase) * 0.36;
                a.rot += a.vRot;
                if (a.y < -45) { a.y = h + 40; a.x = Math.random() * w; }
                if (a.x < -45) a.x = w + 40;
                if (a.x > w + 45) a.x = -40;

                const atlas = getU3DLuxurySpriteAtlas();
                const s = a.size;
                const swayRot = Math.sin(t * 1.6 + a.tiltPhase) * 0.18;
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.rotate(a.rot * 0.25 + swayRot);
                ctx.scale(0.88 + 0.14 * Math.sin(t * 1.8 + a.tiltPhase), 1);
                ctx.globalAlpha = a.alpha;
                ctx.drawImage(atlas.tulipBloom, -s * 1.35, -s * 1.35, s * 2.7, s * 2.7);
                ctx.restore();
            } else if (a.kind === 'tulip_petal') {
                a.y += a.vy;
                a.x += a.vx + Math.sin(t * 1.5 + a.swayPhase) * 0.42;
                a.rot += a.vRot;
                if (a.y < -30) { a.y = h + 26; a.x = Math.random() * w; }
                if (a.x < -30) a.x = w + 26;
                if (a.x > w + 30) a.x = -26;

                const atlas = getU3DLuxurySpriteAtlas();
                const s = a.size;
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.rotate(a.rot);
                ctx.scale(1, 0.58 + 0.42 * Math.sin(t * 2.1 + a.swayPhase));
                ctx.globalAlpha = a.alpha;
                ctx.drawImage(atlas.tulipPetal, -s * 1.3, -s * 1.3, s * 2.6, s * 2.6);
                ctx.restore();
            } else if (a.kind === 'gold_sparkle') {
                a.y += a.vy;
                if (a.y < -20) { a.y = h + 18; a.x = Math.random() * w; }
                const twinkle = 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(t * 3.2 + a.phase), 2);
                const s = a.size * (0.65 + 0.55 * twinkle);
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.globalAlpha = 0.88 * twinkle;
                ctx.fillStyle = a.color;
                ctx.beginPath();
                ctx.moveTo(0, -s);
                ctx.lineTo(s * 0.22, -s * 0.22);
                ctx.lineTo(s, 0);
                ctx.lineTo(s * 0.22, s * 0.22);
                ctx.lineTo(0, s);
                ctx.lineTo(-s * 0.22, s * 0.22);
                ctx.lineTo(-s, 0);
                ctx.lineTo(-s * 0.22, -s * 0.22);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }
        ctx.restore();
    };

    showcaseBgAnimFrameId = requestAnimationFrame(renderLoop);
}

function updateShowcaseAmbientForMotion(motionId) {
    const validMotion = MOTION_EFFECTS_CONFIG[motionId] ? motionId : 'bloom';
    const cfg = MOTION_EFFECTS_CONFIG[validMotion];

    // Đồng bộ thuộc tính data-motion cho toàn bộ Thánh Đường Hậu Cảnh Bước 3 & Sân Khấu Phong Bì 3D
    if (step3) step3.setAttribute('data-motion', validMotion);
    const sanctuary = document.getElementById('showcase-motion-sanctuary');
    if (sanctuary) sanctuary.setAttribute('data-motion', validMotion);
    const u3dStage = document.getElementById('u3d-envelope-stage');
    if (u3dStage) u3dStage.setAttribute('data-motion', validMotion);

    // Khởi chạy Thế Giới Hậu Cảnh Canvas 60fps riêng cho từng chủ đề Motion (Không dùng vòng nét đứt / đường kẻ vô nghĩa)
    startShowcaseBackgroundWorld(validMotion);

    const container = document.getElementById('showcase-ambient-orbs');
    if (!container) return;
    const spans = container.querySelectorAll('.showcase-orb');
    spans.forEach((sp, idx) => {
        sp.textContent = cfg.orbs[idx % cfg.orbs.length];
    });
}

function setMotionEffect(motionId, showToast = true) {
    if (!MOTION_EFFECTS_CONFIG[motionId]) motionId = 'bloom';
    window.currentMotionEffect = motionId;
    const cfg = MOTION_EFFECTS_CONFIG[motionId];

    document.querySelectorAll('.motion-chip').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-motion') === motionId);
    });

    const cycleBtn = document.getElementById('step3-cycle-motion-btn');
    if (cycleBtn) {
        cycleBtn.textContent = cfg.shortLabel;
    }

    const previewMotionName = document.getElementById('chat-preview-motion-name');
    if (previewMotionName) {
        previewMotionName.textContent = cfg.fullLabel;
    }

    updateShowcaseAmbientForMotion(motionId);
    if (typeof refreshShareModalPreviewUI === 'function') {
        refreshShareModalPreviewUI();
    }

    if (showToast) {
        showCardFloatingBadge(`🎬 Hiệu ứng mở thư: ${cfg.fullLabel}`);
    }
}

// Hàm kết thúc Xem thử 3D Motion ở Bước 2 -> Trả ngay về màn hình đang Edit (#step-2) giữ nguyên mọi tùy chỉnh
window.finishStep2MotionPreview = function () {
    if (u3dAnimFrameId) {
        cancelAnimationFrame(u3dAnimFrameId);
        u3dAnimFrameId = null;
    }
    if (u3dAutoOpenTimerId) {
        clearTimeout(u3dAutoOpenTimerId);
        u3dAutoOpenTimerId = null;
    }
    u3dCurrentDirectorState = 'hidden';

    const stage = document.getElementById('u3d-envelope-stage');
    if (stage) {
        stage.style.display = 'none';
        stage.classList.remove('is-summoning', 'is-arriving', 'is-opening', 'pocket-cleared', 'handing-off');
    }

    document.body.classList.remove('u3d-stage-active', 'step2-previewing-3d');
    window.isEnvelopeGiftMode = false;

    const creatorTopbar = document.getElementById('creator-topbar');
    const creatorQuickBar = document.getElementById('creator-quick-bar');
    if (creatorTopbar) creatorTopbar.style.display = 'grid';
    if (creatorQuickBar) creatorQuickBar.style.display = 'grid';

    step3?.classList.remove('active');
    step1?.classList.remove('active');
    if (step2) {
        step2.classList.remove('step2-preloading', 'step2-morph-from');
        step2.classList.add('active', 'step2-morph-to');
    }

    requestAnimationFrame(() => {
        fitPreviewAreaToStage();
        renderStep2WishPreview();
        const cfg = MOTION_EFFECTS_CONFIG[window.currentMotionEffect] || MOTION_EFFECTS_CONFIG.bloom;
        showCardFloatingBadge(`✨ Đã xem thử: ${cfg.fullLabel}`);
    });
};

// Helper kết xuất nhanh thiệp hiện tại ở Bước 2 để XEM THỬ hiệu ứng mở 3D (KHÔNG lưu Telegram, ấn vào sáp để mở, xem xong trả về màn hình Edit Bước 2)
function renderCurrentStep2CardAndPreviewEnvelope(autoOpen = false) {
    if (shareLinkModal) shareLinkModal.style.display = 'none';
    const isFromStep2 = (step2 && step2.classList.contains('active')) || document.body.classList.contains('step2-previewing-3d');

    if (isFromStep2 && cropperObj) {
        const canvas = cropperObj.getCroppedCanvas({ width: 1024, height: 1526 });
        if (canvas) {
            const img = new Image();
            img.onload = function () {
                currentUserImage = img;
                if (!hasGeneratedQuoteOnce && !currentAIQuote && !customWishText) {
                    currentAIQuote = getNextQuoteByTopic(currentTopic);
                    hasGeneratedQuoteOnce = true;
                }
                ensureQuoteFont().then(() => {
                    // Vẽ chế độ isPreviewOnly = true: KHÔNG đánh dấu dirty và TUYỆT ĐỐI KHÔNG gửi lên Telegram!
                    drawCanvasImageText(finalResultCanvas, true, true);
                    document.body.classList.add('step2-previewing-3d');
                    step2.classList.remove('active', 'step2-preloading', 'step2-morph-from');
                    step3.classList.add('active');
                    fitCardShowcaseToWrap();
                    window.launchUnified3DEnvelopeDirector({
                        autoOpen: false,
                        motionId: window.currentMotionEffect,
                        themeKey: currentColorTheme,
                        isRealRecipient: false,
                        isStep2Preview: true
                    });
                });
            };
            img.src = canvas.toDataURL('image/jpeg', 0.95);
            return;
        }
    }

    // Trường hợp đang ở Bước 3 (sau khi đã bấm Tạo thiệp) và bấm "✉️ Mở thử bì"
    window.launchUnified3DEnvelopeDirector({
        autoOpen: false,
        motionId: window.currentMotionEffect,
        themeKey: currentColorTheme,
        isRealRecipient: window.isRecipientCardLinkMode,
        isStep2Preview: isFromStep2
    });
}

// Sự kiện chọn Hiệu ứng 3D Motion ở Bước 2 & trong Modal Tạo Link
document.querySelectorAll('.motion-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
        const m = chip.getAttribute('data-motion');
        if (!m) return;
        setMotionEffect(m, true);
        if (typeof window.syncTelegramMessageCaptionIfUploaded === 'function') {
            window.syncTelegramMessageCaptionIfUploaded();
        }
        if (e.clientX && e.clientY) {
            spawnTouchSparkle(e.clientX, e.clientY, 6);
        }
    });
});

// Nút "👁️ Xem thử hiệu ứng mở 3D" ở Bước 2 & trong Modal -> Hiện Phong Bì Vật Lý 3D để người dùng ấn vào dấu sáp mở thử rồi trả về màn hình Edit Bước 2!
document.getElementById('step2-preview-motion-btn')?.addEventListener('click', () => {
    renderCurrentStep2CardAndPreviewEnvelope(false);
});

document.getElementById('modal-test-motion-btn')?.addEventListener('click', () => {
    renderCurrentStep2CardAndPreviewEnvelope(false);
});

// Nút "🌺 Hoa Trà" ở Bước 3 -> Đổi sang hiệu ứng tiếp theo & hiện Phong Bì Vật Lý 3D để ấn vào dấu sáp mở thử!
document.getElementById('step3-cycle-motion-btn')?.addEventListener('click', () => {
    const idx = MOTION_KEYS_ORDER.indexOf(window.currentMotionEffect);
    const nextKey = MOTION_KEYS_ORDER[(idx + 1) % MOTION_KEYS_ORDER.length];
    setMotionEffect(nextKey, false);
    if (typeof window.syncTelegramMessageCaptionIfUploaded === 'function') {
        window.syncTelegramMessageCaptionIfUploaded();
    }
    window.launchUnified3DEnvelopeDirector({
        autoOpen: false,
        motionId: nextKey,
        themeKey: currentColorTheme,
        isRealRecipient: window.isRecipientCardLinkMode,
        isStep2Preview: false,
        onComplete: () => {
            const cfg = MOTION_EFFECTS_CONFIG[nextKey];
            if (cfg) showCardFloatingBadge(`🎬 Đã mở thư với: ${cfg.fullLabel}`);
        }
    });
});