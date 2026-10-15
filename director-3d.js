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
    // Khung sáp chảy 3D hữu cơ (Organic Melted Wax Flange + Recessed Stamp Well + 3D Relief Shadow)
    const buildWaxSealShell = (idSuffix, rimStops, wellStops, emblemMarkup) => `
        <svg viewBox="-64 -64 128 128" width="94" height="94">
            <defs>
                <radialGradient id="waxRim_${idSuffix}" cx="30%" cy="24%" r="74%">
                    <stop offset="0%" stop-color="${rimStops[0]}"/>
                    <stop offset="26%" stop-color="${rimStops[1]}"/>
                    <stop offset="62%" stop-color="${rimStops[2]}"/>
                    <stop offset="88%" stop-color="${rimStops[3]}"/>
                    <stop offset="100%" stop-color="${rimStops[4]}"/>
                </radialGradient>
                <radialGradient id="waxWell_${idSuffix}" cx="68%" cy="72%" r="68%">
                    <stop offset="0%" stop-color="${wellStops[0]}"/>
                    <stop offset="48%" stop-color="${wellStops[1]}"/>
                    <stop offset="86%" stop-color="${wellStops[2]}"/>
                    <stop offset="100%" stop-color="${wellStops[3]}"/>
                </radialGradient>
                <linearGradient id="waxBevel_${idSuffix}" x1="15%" y1="15%" x2="85%" y2="85%">
                    <stop offset="0%" stop-color="#fff9db" stop-opacity="0.92"/>
                    <stop offset="50%" stop-color="${rimStops[2]}" stop-opacity="0.25"/>
                    <stop offset="100%" stop-color="#2b1200" stop-opacity="0.88"/>
                </linearGradient>
                <linearGradient id="goldRelief_${idSuffix}" x1="18%" y1="12%" x2="82%" y2="88%">
                    <stop offset="0%" stop-color="#ffffff"/>
                    <stop offset="28%" stop-color="#fff0b3"/>
                    <stop offset="64%" stop-color="#e5a928"/>
                    <stop offset="100%" stop-color="#8c5306"/>
                </linearGradient>
            </defs>
            <!-- Bóng đổ mềm dưới rìa sáp chảy -->
            <path d="M 0,-53 C 16,-55 31,-48 42,-38 C 53,-28 57,-13 55,3 C 53,19 49,34 38,44 C 27,54 12,57 -4,55 C -20,53 -35,48 -45,36 C -55,24 -57,8 -54,-8 C -51,-24 -44,-39 -30,-47 C -16,-55 -10,-52 0,-53 Z"
                  fill="rgba(18, 6, 10, 0.42)" transform="translate(1.5, 3.2)"/>
            <!-- Vành sáp chảy bất đối xứng 3D (Organic Molten Wax Rim) -->
            <path d="M 0,-53 C 16,-55 31,-48 42,-38 C 53,-28 57,-13 55,3 C 53,19 49,34 38,44 C 27,54 12,57 -4,55 C -20,53 -35,48 -45,36 C -55,24 -57,8 -54,-8 C -51,-24 -44,-39 -30,-47 C -16,-55 -10,-52 0,-53 Z"
                  fill="url(#waxRim_${idSuffix})" stroke="url(#waxBevel_${idSuffix})" stroke-width="2.2"/>
            <!-- Vệt phản quang vòm sáp phồng góc trên-trái -->
            <path d="M -36,-26 C -25,-41 -6,-48 14,-46 C 26,-45 36,-39 42,-30"
                  fill="none" stroke="#fffbe6" stroke-width="3.2" stroke-linecap="round" opacity="0.58"/>
            <!-- Vệt bóng tối chiều sâu góc dưới-phải -->
            <path d="M 44,-10 C 50,8 46,28 33,39 C 20,49 2,52 -16,48"
                  fill="none" stroke="#2d0f02" stroke-width="3.2" stroke-linecap="round" opacity="0.52"/>
            <!-- Lòng khuôn dập lõm sâu 3D (Recessed Stamp Impression) -->
            <circle cx="0" cy="0" r="37.5" fill="url(#waxWell_${idSuffix})" stroke="#3b1704" stroke-width="2.2"/>
            <circle cx="0" cy="0" r="36.2" fill="none" stroke="#ffefc2" stroke-width="1.1" opacity="0.62"/>
            <circle cx="0" cy="0" r="32.5" fill="none" stroke="url(#goldRelief_${idSuffix})" stroke-width="1.5" stroke-dasharray="2.4 3.4" opacity="0.88"/>
            <!-- Họa tiết dập nổi 3D ở tâm (có lớp bóng đổ tách khối) -->
            ${emblemMarkup}
        </svg>`;

    if (motionId === 'butterflies') {
        return buildWaxSealShell(
            'bf',
            ['#fff8d6', '#f7d06b', '#cf8916', '#854d04', '#b87914'],
            ['#f2c155', '#bf7c12', '#6e3f02', '#422300'],
            `<g>
                <g transform="translate(1.4, 2.2)" opacity="0.52" fill="#2b1200">
                    <path d="M-2,-1 C-16,-24 -38,-20 -33,2 C-29,14 -12,12 -2,3 Z"/>
                    <path d="M-2,3 C-19,9 -28,24 -17,30 C-8,33 -3,19 -2,7 Z"/>
                    <path d="M2,-1 C16,-24 38,-20 33,2 C29,14 12,12 2,3 Z"/>
                    <path d="M2,3 C19,9 28,24 17,30 C8,33 3,19 2,7 Z"/>
                </g>
                <path d="M-2,-1 C-16,-24 -38,-20 -33,2 C-29,14 -12,12 -2,3 Z" fill="url(#goldRelief_bf)" stroke="#6e3f02" stroke-width="0.9"/>
                <path d="M-2,3 C-19,9 -28,24 -17,30 C-8,33 -3,19 -2,7 Z" fill="url(#goldRelief_bf)" stroke="#6e3f02" stroke-width="0.9"/>
                <path d="M2,-1 C16,-24 38,-20 33,2 C29,14 12,12 2,3 Z" fill="url(#goldRelief_bf)" stroke="#6e3f02" stroke-width="0.9"/>
                <path d="M2,3 C19,9 28,24 17,30 C8,33 3,19 2,7 Z" fill="url(#goldRelief_bf)" stroke="#6e3f02" stroke-width="0.9"/>
                <path d="M-1.5,-9 Q-7,-20 -13,-18 M1.5,-9 Q7,-20 13,-18" fill="none" stroke="#fff8d6" stroke-width="1.2" stroke-linecap="round"/>
                <rect x="-2.1" y="-12" width="4.2" height="24" rx="2.1" fill="#fff6cc" stroke="#5c3302" stroke-width="0.9"/>
            </g>`
        );
    }
    if (motionId === 'ribbon') {
        return buildWaxSealShell(
            'rib',
            ['#ffe8f0', '#f472b6', '#be185d', '#700a34', '#9d174d'],
            ['#e85d9c', '#9d174d', '#590727', '#380317'],
            `<g>
                <g transform="translate(1.4, 2.2)" opacity="0.52" fill="#2d0414">
                    <path d="M-5,5 C-16,20 -25,31 -30,37 L-16,32 L-10,38 C-5,25 -2,14 0,6 Z"/>
                    <path d="M5,5 C16,20 25,31 30,37 L16,32 L10,38 C5,25 2,14 0,6 Z"/>
                    <path d="M0,0 C-18,-24 -40,-19 -38,3 C-36,22 -16,17 0,3 Z"/>
                    <path d="M0,0 C18,-24 40,-19 38,3 C36,22 16,17 0,3 Z"/>
                </g>
                <path d="M-5,5 C-16,20 -25,31 -30,37 L-16,32 L-10,38 C-5,25 -2,14 0,6 Z" fill="url(#goldRelief_rib)" stroke="#6e3b04" stroke-width="0.9"/>
                <path d="M5,5 C16,20 25,31 30,37 L16,32 L10,38 C5,25 2,14 0,6 Z" fill="url(#goldRelief_rib)" stroke="#6e3b04" stroke-width="0.9"/>
                <path d="M0,0 C-18,-24 -40,-19 -38,3 C-36,22 -16,17 0,3 Z" fill="url(#goldRelief_rib)" stroke="#6e3b04" stroke-width="1.1"/>
                <path d="M0,0 C18,-24 40,-19 38,3 C36,22 16,17 0,3 Z" fill="url(#goldRelief_rib)" stroke="#6e3b04" stroke-width="1.1"/>
                <circle cx="0" cy="1.5" r="8.5" fill="#fffdf5" stroke="#b47b12" stroke-width="1.2"/>
                <circle cx="-2.5" cy="-1" r="2.6" fill="#ffffff"/>
            </g>`
        );
    }
    if (motionId === 'galaxy') {
        return buildWaxSealShell(
            'rose',
            ['#ffd6e0', '#f43f5e', '#9f1239', '#4c0519', '#881337'],
            ['#e11d48', '#881337', '#4c0519', '#2b020d'],
            `<g>
                <circle cx="1.4" cy="2.2" r="24" fill="rgba(28, 2, 10, 0.50)"/>
                ${[0, 45, 90, 135, 180, 225, 270, 315].map(d => `
                    <g transform="rotate(${d})">
                        <path d="M0,3 C-12,-5 -14,-22 0,-26 C14,-22 12,-5 0,3 Z" fill="url(#goldRelief_rose)" stroke="#61071e" stroke-width="0.85"/>
                    </g>
                `).join('')}
                ${[22.5, 82.5, 142.5, 202.5, 262.5, 322.5].map(d => `
                    <g transform="rotate(${d})">
                        <path d="M0,2 C-9,-4 -10,-16 0,-19 C10,-16 9,-4 0,2 Z" fill="#ffe4e6" stroke="#b47b12" stroke-width="0.8"/>
                    </g>
                `).join('')}
                ${[0, 90, 180, 270].map(d => `
                    <g transform="rotate(${d + 15})">
                        <path d="M0,1 C-6,-3 -6,-10 0,-12 C6,-10 6,-3 0,1 Z" fill="#fffdf5" stroke="#d97706" stroke-width="0.75"/>
                    </g>
                `).join('')}
                <circle cx="0" cy="0" r="4.2" fill="#fff8d6" stroke="#881337" stroke-width="0.9"/>
            </g>`
        );
    }
    if (motionId === 'sakura') {
        return buildWaxSealShell(
            'sak',
            ['#fff0f5', '#f472b6', '#be185d', '#6b0f36', '#9d174d'],
            ['#ec4899', '#9d174d', '#500724', '#300315'],
            `<g>
                <g transform="translate(1.3, 2.0)" opacity="0.48" fill="#2d0313">
                    ${[0, 72, 144, 216, 288].map(d => `<path transform="rotate(${d})" d="M0,0 C-9,-8 -12,-23 -3,-28 L0,-23 L3,-28 C12,-23 9,-8 0,0 Z"/>`).join('')}
                </g>
                ${[0, 72, 144, 216, 288].map(d => `
                    <g transform="rotate(${d})">
                        <path d="M0,0 C-9,-8 -12,-23 -3,-28 L0,-23 L3,-28 C12,-23 9,-8 0,0 Z" fill="url(#goldRelief_sak)" stroke="#6e3b04" stroke-width="0.85"/>
                    </g>
                `).join('')}
                <circle cx="0" cy="0" r="5.5" fill="#fff9db" stroke="#8c5306" stroke-width="1"/>
            </g>`
        );
    }
    if (motionId === 'hearts') {
        return buildWaxSealShell(
            'tul',
            ['#fff9db', '#f5b841', '#c47612', '#703803', '#a35c0a'],
            ['#e59d2c', '#9e5808', '#542a02', '#331800'],
            `<g>
                <g transform="translate(1.4, 2.2)" opacity="0.50" fill="#291100">
                    <path d="M0,9 L0,25" stroke="#291100" stroke-width="3" stroke-linecap="round"/>
                    <path d="M-3,8 C-19,5 -22,-13 -11,-24 C-4,-16 -2,-3 -3,8 Z"/>
                    <path d="M3,8 C19,5 22,-13 11,-24 C4,-16 2,-3 3,8 Z"/>
                    <path d="M0,11 C-13,8 -14,-14 0,-27 C14,-14 13,8 0,11 Z"/>
                </g>
                <path d="M0,9 L0,25" stroke="url(#goldRelief_tul)" stroke-width="2.8" stroke-linecap="round"/>
                <path d="M0,23 C-14,20 -23,6 -17,-8 C-9,3 -3,14 0,22 Z" fill="url(#goldRelief_tul)" stroke="#6e3b04" stroke-width="0.8"/>
                <path d="M0,23 C14,20 23,6 17,-8 C9,3 3,14 0,22 Z" fill="url(#goldRelief_tul)" stroke="#6e3b04" stroke-width="0.8"/>
                <path d="M-3,8 C-19,5 -22,-13 -11,-24 C-4,-16 -2,-3 -3,8 Z" fill="#ffe4e6" stroke="#8c5306" stroke-width="0.9"/>
                <path d="M3,8 C19,5 22,-13 11,-24 C4,-16 2,-3 3,8 Z" fill="#ffe4e6" stroke="#8c5306" stroke-width="0.9"/>
                <path d="M0,11 C-13,8 -14,-14 0,-27 C14,-14 13,8 0,11 Z" fill="url(#goldRelief_tul)" stroke="#fff8dc" stroke-width="1"/>
            </g>`
        );
    }
    // Mặc định: bloom (Con dấu sáp vàng 24K dập nổi Đại Hoa Trà 3D)
    return buildWaxSealShell(
        'cam',
        ['#fff8d6', '#f7cf68', '#d18e18', '#824b04', '#b57612'],
        ['#f0be52', '#bd7a10', '#693c02', '#3d2000'],
        `<g>
            <circle cx="1.4" cy="2.2" r="24" fill="rgba(36, 16, 0, 0.48)"/>
            ${[0, 45, 90, 135, 180, 225, 270, 315].map(d => `
                <g transform="rotate(${d})">
                    <path d="M0,2 C-8,-8 -9,-21 0,-26 C9,-21 8,-8 0,2 Z" fill="url(#goldRelief_cam)" stroke="#6b3d03" stroke-width="0.85"/>
                </g>
            `).join('')}
            ${[22.5, 82.5, 142.5, 202.5, 262.5, 322.5].map(d => `
                <g transform="rotate(${d})">
                    <path d="M0,1 C-6,-6 -6,-15 0,-18 C6,-15 6,-6 0,1 Z" fill="#fff0f5" stroke="#9c6208" stroke-width="0.8"/>
                </g>
            `).join('')}
            <circle cx="0" cy="0" r="5.5" fill="#fff9db" stroke="#784504" stroke-width="1"/>
        </g>`
    );
}

function buildPocketBloomCamelliaSVG(motionId = 'bloom') {
    if (motionId === 'galaxy') {
        const renderFrenchRoseSVG = (cx, cy, scale, rotDeg) => {
            const leaves = [-52, 52, -135, 135].map(d => `
                <g transform="rotate(${d})">
                    <path d="M0,-20 C-26,-56 -22,-98 0,-112 C22,-98 26,-56 0,-20 Z" fill="url(#pkRoseLeaf)" stroke="#a7f3d0" stroke-width="0.9"/>
                </g>
            `).join('');
            const outer = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map(d => `
                <g transform="rotate(${d})">
                    <path d="M0,6 C-34,-18 -40,-82 0,-100 C40,-82 34,-18 0,6 Z" fill="url(#pkRoseOuter)" stroke="rgba(255,228,230,0.45)" stroke-width="0.9"/>
                </g>
            `).join('');
            const mid = [18, 63, 108, 153, 198, 243, 288, 333].map(d => `
                <g transform="rotate(${d})">
                    <path d="M0,4 C-26,-14 -30,-64 0,-78 C30,-64 26,-14 0,4 Z" fill="url(#pkRoseMid)" stroke="rgba(255,241,242,0.55)" stroke-width="0.85"/>
                </g>
            `).join('');
            const inner = [0, 60, 120, 180, 240, 300].map(d => `
                <g transform="rotate(${d + 12})">
                    <path d="M0,2 C-18,-10 -20,-42 0,-52 C20,-42 18,-10 0,2 Z" fill="url(#pkRoseInner)" stroke="rgba(254,240,138,0.65)" stroke-width="0.8"/>
                </g>
            `).join('');
            return `
                <g transform="translate(${cx}, ${cy}) scale(${scale}) rotate(${rotDeg})">
                    <circle cx="0" cy="6" r="88" fill="rgba(45, 4, 18, 0.32)"/>
                    ${leaves}${outer}${mid}${inner}
                    <circle cx="0" cy="0" r="9" fill="#fde047" stroke="#fffbeb" stroke-width="1.4"/>
                </g>`;
        };
        return `
            <svg viewBox="-150 -140 300 280" width="100%" height="100%">
                <defs>
                    <linearGradient id="pkRoseLeaf" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#064e3b"/>
                        <stop offset="65%" stop-color="#059669"/>
                        <stop offset="100%" stop-color="#6ee7b7"/>
                    </linearGradient>
                    <linearGradient id="pkRoseOuter" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#3b0414"/>
                        <stop offset="48%" stop-color="#9f1239"/>
                        <stop offset="85%" stop-color="#f43f5e"/>
                        <stop offset="100%" stop-color="#fecdd3"/>
                    </linearGradient>
                    <linearGradient id="pkRoseMid" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#680924"/>
                        <stop offset="55%" stop-color="#e11d48"/>
                        <stop offset="92%" stop-color="#fda4af"/>
                        <stop offset="100%" stop-color="#fff1f2"/>
                    </linearGradient>
                    <linearGradient id="pkRoseInner" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#9f1239"/>
                        <stop offset="65%" stop-color="#fb7185"/>
                        <stop offset="100%" stop-color="#fffbeb"/>
                    </linearGradient>
                </defs>
                ${renderFrenchRoseSVG(-64, 10, 0.54, -26)}
                ${renderFrenchRoseSVG(64, 10, 0.54, 26)}
                ${renderFrenchRoseSVG(0, -8, 0.86, 0)}
            </svg>`;
    }
    if (motionId === 'hearts') {
        const leaves = [-52, -28, 28, 52].map((deg, idx) => `
            <g transform="rotate(${deg})">
                <path d="M0,18 C${idx < 2 ? -26 : 26},-18 ${idx < 2 ? -32 : 32},-76 ${idx < 2 ? -9 : 9},-112 C0,-78 4,-30 0,18 Z" fill="url(#pkTulipLeaf)"/>
            </g>
        `).join('');
        const tulips = [
            { deg: -36, tx: -16, ty: 4, sc: 0.72 },
            { deg: 36, tx: 16, ty: 4, sc: 0.72 },
            { deg: 0, tx: 0, ty: -14, sc: 0.96 }
        ].map(t => `
            <g transform="translate(${t.tx}, ${t.ty}) rotate(${t.deg}) scale(${t.sc})">
                <path d="M0,24 L0,-12" stroke="#10b981" stroke-width="4.2" stroke-linecap="round"/>
                <path d="M-4,2 C-28,-8 -34,-56 -15,-86 C-4,-68 -2,-32 -4,2 Z" fill="url(#pkTulipSide)"/>
                <path d="M4,2 C28,-8 34,-56 15,-86 C4,-68 2,-32 4,2 Z" fill="url(#pkTulipSide)"/>
                <path d="M0,6 C-21,-8 -23,-64 0,-94 C23,-64 21,-8 0,6 Z" fill="url(#pkTulipMid)" stroke="#fffbeb" stroke-width="1.1"/>
            </g>
        `).join('');
        return `
            <svg viewBox="-145 -140 290 280" width="100%" height="100%">
                <defs>
                    <linearGradient id="pkTulipLeaf" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#064e3b"/>
                        <stop offset="60%" stop-color="#10b981"/>
                        <stop offset="100%" stop-color="#a7f3d0"/>
                    </linearGradient>
                    <linearGradient id="pkTulipMid" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#f59e0b"/>
                        <stop offset="28%" stop-color="#e11d48"/>
                        <stop offset="72%" stop-color="#fb7185"/>
                        <stop offset="100%" stop-color="#fffbeb"/>
                    </linearGradient>
                    <linearGradient id="pkTulipSide" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#9f1239"/>
                        <stop offset="62%" stop-color="#fda4af"/>
                        <stop offset="100%" stop-color="#fef3c7"/>
                    </linearGradient>
                </defs>
                ${leaves}
                ${tulips}
            </svg>`;
    }
    const outer = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map(d => `
        <g transform="rotate(${d})">
            <path d="M0,0 C-25,-26 -29,-82 0,-100 C29,-82 25,-26 0,0 Z" fill="url(#pkCamOuter)" stroke="rgba(255,240,245,0.55)" stroke-width="1"/>
        </g>
    `).join('');
    const mid = [18, 63, 108, 153, 198, 243, 288, 333].map(d => `
        <g transform="rotate(${d})">
            <path d="M0,0 C-19,-20 -21,-62 0,-76 C21,-62 19,-20 0,0 Z" fill="url(#pkCamMid)" stroke="rgba(255,248,225,0.65)" stroke-width="0.9"/>
        </g>
    `).join('');
    const inner = [0, 60, 120, 180, 240, 300].map(d => `
        <g transform="rotate(${d})">
            <path d="M0,0 C-13,-14 -14,-40 0,-50 C14,-40 13,-14 0,0 Z" fill="#fff0f5" stroke="#f5c242" stroke-width="0.85"/>
        </g>
    `).join('');
    return `
        <svg viewBox="-115 -115 230 230" width="100%" height="100%">
            <defs>
                <linearGradient id="pkCamOuter" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stop-color="#69082a"/>
                    <stop offset="45%" stop-color="#c9185b"/>
                    <stop offset="85%" stop-color="#f48fb1"/>
                    <stop offset="100%" stop-color="#fff5f8"/>
                </linearGradient>
                <linearGradient id="pkCamMid" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stop-color="#9c1043"/>
                    <stop offset="58%" stop-color="#f06292"/>
                    <stop offset="100%" stop-color="#ffffff"/>
                </linearGradient>
            </defs>
            <circle cx="0" cy="4" r="84" fill="rgba(48, 4, 20, 0.28)"/>
            ${outer}${mid}${inner}
            <circle cx="0" cy="0" r="14" fill="#f5c242" stroke="#fffbeb" stroke-width="1.6"/>
        </svg>`;
}

// Trạng thái toàn cục của Đạo diễn Phong Bì Vật Lý 3D Hợp Nhất
let u3dAnimFrameId = null;
let u3dAutoOpenTimerId = null;
let u3dCurrentDirectorState = 'hidden'; // 'hidden' | 'waiting' | 'opening'
let u3dOpenElapsed = 0;
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
        window.CardAudio?.playSealAttentionHint();
        if (sealBtn && typeof spawnTouchSparkle === 'function') {
            const rect = sealBtn.getBoundingClientRect();
            spawnTouchSparkle(rect.left + rect.width * 0.5, rect.top + rect.height * 0.5, 8);
        }
    });
})();

// ====== BỘ TEXTURE KIM HOÀN & VẬT LIỆU 3D CAO CẤP ĐƯỢC KẾT XUẤT SẴN (PRE-BAKED LUXURY 3D SPRITE ATLAS) ======
// Mọi thực thể Hoa 3D, Cánh Hoa Khum Lòng Chảo, Hồ Điệp Tách Cánh Trước/Sau, Ngọc Trai Nam Hải, Nơ Lụa Satin,
// Bokeh Quang Học & Đom Đóm Sinh Học đều được tiền kết xuất (Pre-baked) với Ambient Occlusion & Subsurface Scattering,
// giúp đạt độ nổi khối 3D chân thực tuyệt đối mà hoàn toàn KHÔNG tốn CPU/GPU vẽ lại mỗi frame (60fps Zero-Lag)!
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

    // 0. PRE-BAKED OPTICAL BOKEH, BIOLUMINESCENT FIREFLIES & 4-POINT CELESTIAL STARS (Zero-lag drawImage)
    const buildBokehSprite = (rCol, gCol, bCol) => {
        const { c, ctx } = makeCanvas(96, 96);
        const cx = 48, cy = 48, r = 42;
        const g = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r);
        g.addColorStop(0, `rgba(${rCol}, ${gCol}, ${bCol}, 0.42)`);
        g.addColorStop(0.58, `rgba(${rCol}, ${gCol}, ${bCol}, 0.24)`);
        g.addColorStop(0.82, `rgba(255, 250, 240, 0.34)`);
        g.addColorStop(0.92, `rgba(${rCol}, ${gCol}, ${bCol}, 0.12)`);
        g.addColorStop(1, `rgba(${rCol}, ${gCol}, ${bCol}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        return c;
    };
    atlas.bokehGold = buildBokehSprite(255, 224, 130);
    atlas.bokehRose = buildBokehSprite(255, 168, 198);
    atlas.bokehEmerald = buildBokehSprite(130, 240, 195);

    const buildFireflySprite = (coreHex, midRgba, outerRgba) => {
        const { c, ctx } = makeCanvas(64, 64);
        const g = ctx.createRadialGradient(32, 32, 1, 32, 32, 28);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.16, coreHex);
        g.addColorStop(0.45, midRgba);
        g.addColorStop(1, outerRgba);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(32, 32, 28, 0, Math.PI * 2);
        ctx.fill();
        return c;
    };
    atlas.fireflyGold = buildFireflySprite('#fff3b0', 'rgba(255, 213, 79, 0.42)', 'rgba(255, 213, 79, 0)');
    atlas.fireflyEmerald = buildFireflySprite('#d1fae5', 'rgba(52, 211, 153, 0.42)', 'rgba(52, 211, 153, 0)');
    atlas.fireflyRose = buildFireflySprite('#ffe4e6', 'rgba(251, 113, 133, 0.40)', 'rgba(251, 113, 133, 0)');

    // 1. NGỌC TRAI NAM HẢI XÀ CỪ 3D (Lustrous South Sea Mother-of-Pearl Sphere - 96x96)
    {
        const { c, ctx } = makeCanvas(96, 96);
        const cx = 48, cy = 48, r = 34;
        // Bóng đổ mềm phía dưới tạo cảm giác viên ngọc nổi khối 3D
        const drop = ctx.createRadialGradient(cx + 2, cy + 5, r * 0.2, cx + 2, cy + 5, r * 1.12);
        drop.addColorStop(0, 'rgba(42, 10, 24, 0.28)');
        drop.addColorStop(1, 'rgba(42, 10, 24, 0)');
        ctx.fillStyle = drop;
        ctx.beginPath();
        ctx.arc(cx + 2, cy + 5, r * 1.12, 0, Math.PI * 2);
        ctx.fill();

        // Thân ngọc trai xà cừ (Trắng kem ánh hồng đào -> Vàng champagne ấm -> Phản quang đáy)
        const body = ctx.createRadialGradient(cx - r * 0.34, cy - r * 0.34, r * 0.06, cx, cy, r);
        body.addColorStop(0, '#ffffff');
        body.addColorStop(0.26, '#fffaf2');
        body.addColorStop(0.56, '#fde6ee');
        body.addColorStop(0.82, '#e6b8c8');
        body.addColorStop(0.93, '#c993a6');
        body.addColorStop(1, '#fbe4b8');
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // Tán xạ ngũ sắc xà cừ (Iridescent Nacre Orient)
        const nacre = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        nacre.addColorStop(0, 'rgba(186, 242, 238, 0.24)');
        nacre.addColorStop(0.5, 'rgba(255, 192, 216, 0.26)');
        nacre.addColorStop(1, 'rgba(255, 240, 190, 0.24)');
        ctx.fillStyle = nacre;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.96, 0, Math.PI * 2);
        ctx.fill();

        // Điểm phản quang Studio Specular sắc nét
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.ellipse(cx - r * 0.34, cy - r * 0.36, r * 0.21, r * 0.13, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.beginPath();
        ctx.arc(cx - r * 0.14, cy - r * 0.52, r * 0.055, 0, Math.PI * 2);
        ctx.fill();
        atlas.pearl = c;
    }

    // 2. ĐẠI HOA TRÀ NHUNG ĐỎ 3D & CÁNH HOA TRÀ KHUM LÒNG CHẢO (3D Velvet Camellia Petal 136x136 & Full Bloom 210x210)
    {
        // 2A. Cánh Hoa Trà Nhung 3D khum lòng chảo (Không có viền mờ tròn hay đốm trắng giả trân ở đáy!)
        const { c, ctx } = makeCanvas(136, 136);
        ctx.translate(68, 72);
        const s = 44;

        // Bóng đổ mềm tách lớp
        ctx.fillStyle = 'rgba(38, 4, 18, 0.24)';
        ctx.beginPath();
        ctx.moveTo(1.5, s * 0.54 + 3);
        ctx.bezierCurveTo(-s * 0.94, s * 0.14 + 3, -s * 0.90, -s * 0.82 + 3, 1.5, -s * 1.0 + 3);
        ctx.bezierCurveTo(s * 0.90, -s * 0.82 + 3, s * 0.94, s * 0.14 + 3, 1.5, s * 0.54 + 3);
        ctx.closePath();
        ctx.fill();

        // Thân cánh hoa nhung đa sắc độ (Subsurface Scattering từ cuống đỏ thẫm lên mép hồng phấn ngọc trai)
        const pGrad = ctx.createRadialGradient(0, s * 0.32, 2, 0, -s * 0.24, s * 1.18);
        pGrad.addColorStop(0, '#4a051d');
        pGrad.addColorStop(0.26, '#9e0e40');
        pGrad.addColorStop(0.56, '#e02463');
        pGrad.addColorStop(0.82, '#f988b0');
        pGrad.addColorStop(0.94, '#ffdbe8');
        pGrad.addColorStop(1, '#fff7fa');

        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.52);
        ctx.bezierCurveTo(-s * 0.95, s * 0.14, -s * 0.92, -s * 0.84, 0, -s * 1.02);
        ctx.bezierCurveTo(s * 0.92, -s * 0.84, s * 0.95, s * 0.14, 0, s * 0.52);
        ctx.closePath();
        ctx.fill();

        // Lòng khum 3D (Concave Cupped Shadow) tạo độ trũng thật ở giữa cánh hoa
        const cupGrad = ctx.createRadialGradient(0, -s * 0.05, 2, 0, -s * 0.05, s * 0.62);
        cupGrad.addColorStop(0, 'rgba(88, 6, 36, 0.44)');
        cupGrad.addColorStop(0.65, 'rgba(180, 16, 68, 0.14)');
        cupGrad.addColorStop(1, 'rgba(255, 218, 232, 0)');
        ctx.fillStyle = cupGrad;
        ctx.fill();

        // Gân lụa sinh học mảnh mai
        ctx.strokeStyle = 'rgba(255, 238, 244, 0.32)';
        ctx.lineWidth = 0.9;
        for (let v = -2; v <= 2; v++) {
            ctx.beginPath();
            ctx.moveTo(0, s * 0.44);
            ctx.quadraticCurveTo(v * s * 0.18, -s * 0.14, v * s * 0.24, -s * (0.86 - Math.abs(v) * 0.07));
            ctx.stroke();
        }

        // Mép cánh uốn cong bắt sáng (3D Curled Specular Lip)
        ctx.strokeStyle = 'rgba(255, 248, 250, 0.82)';
        ctx.lineWidth = 1.35;
        ctx.beginPath();
        ctx.moveTo(-s * 0.72, -s * 0.42);
        ctx.bezierCurveTo(-s * 0.58, -s * 0.86, -s * 0.22, -s * 1.0, 0, -s * 1.02);
        ctx.bezierCurveTo(s * 0.22, -s * 1.0, s * 0.58, -s * 0.86, s * 0.72, -s * 0.42);
        ctx.stroke();

        // Giọt sương mai pha lê trên cánh hoa trà
        const dx = s * 0.24, dy = -s * 0.32, dr = 3.2;
        ctx.fillStyle = 'rgba(68, 4, 28, 0.38)';
        ctx.beginPath();
        ctx.arc(dx + 1, dy + 1.2, dr, 0, Math.PI * 2);
        ctx.fill();
        const dg = ctx.createRadialGradient(dx - 1, dy - 1, 0.3, dx, dy, dr);
        dg.addColorStop(0, '#ffffff');
        dg.addColorStop(0.55, '#ffe4ef');
        dg.addColorStop(1, 'rgba(244, 114, 182, 0.65)');
        ctx.fillStyle = dg;
        ctx.beginPath();
        ctx.arc(dx, dy, dr, 0, Math.PI * 2);
        ctx.fill();

        atlas.camelliaPetal = c;

        // 2B. Đại Đóa Hoa Trà Nhung Đỏ 3D Đa Tầng (3D Multi-Tiered Royal Camellia Blossom - 210x210)
        const { c: cbC, ctx: cbCtx } = makeCanvas(210, 210);
        cbCtx.translate(105, 105);
        const bs = 66;

        // 4 Lá Đài Lục Bảo đậm phía dưới tạo thế nâng đỡ 3D
        for (let l = 0; l < 4; l++) {
            cbCtx.save();
            cbCtx.rotate((l / 4) * Math.PI * 2 + Math.PI / 4);
            const lg = cbCtx.createLinearGradient(0, -bs * 0.3, 0, -bs * 1.18);
            lg.addColorStop(0, '#043927');
            lg.addColorStop(0.6, '#059669');
            lg.addColorStop(1, '#6ee7b7');
            cbCtx.fillStyle = lg;
            cbCtx.beginPath();
            cbCtx.moveTo(0, -bs * 0.25);
            cbCtx.bezierCurveTo(-bs * 0.32, -bs * 0.58, -bs * 0.26, -bs * 1.02, 0, -bs * 1.16);
            cbCtx.bezierCurveTo(bs * 0.26, -bs * 1.02, bs * 0.32, -bs * 0.58, 0, -bs * 0.25);
            cbCtx.closePath();
            cbCtx.fill();
            cbCtx.restore();
        }

        // 4 Tầng Cánh Hoa Trà Xếp Lớp Tổ Ong (Imbricate 3D Tiers) có bóng đổ Ambient Occlusion giữa các tầng
        const tiers = [
            { count: 10, rScale: 1.00, rotOff: 0,    c0: '#3d0318', c1: '#880e4f', c2: '#d81b60', c3: '#f886ac', c4: '#ffe4ef' },
            { count: 8,  rScale: 0.78, rotOff: 0.31, c0: '#4a051d', c1: '#ad1457', c2: '#ec407a', c3: '#fbb6ce', c4: '#fff0f6' },
            { count: 7,  rScale: 0.56, rotOff: 0.62, c0: '#68082a', c1: '#c2185b', c2: '#f472b6', c3: '#fed7e2', c4: '#ffffff' },
            { count: 5,  rScale: 0.35, rotOff: 0.95, c0: '#880e4f', c1: '#e91e63', c2: '#f9a8d4', c3: '#fff5f7', c4: '#ffffff' }
        ];
        tiers.forEach(t => {
            const tr = bs * t.rScale;
            // Bóng đổ Ambient Occlusion dưới mỗi tầng cánh
            const ao = cbCtx.createRadialGradient(0, 2, tr * 0.1, 0, 2, tr * 1.04);
            ao.addColorStop(0, 'rgba(32, 2, 12, 0.45)');
            ao.addColorStop(0.85, 'rgba(32, 2, 12, 0.22)');
            ao.addColorStop(1, 'rgba(32, 2, 12, 0)');
            cbCtx.fillStyle = ao;
            cbCtx.beginPath();
            cbCtx.arc(0, 2, tr * 1.04, 0, Math.PI * 2);
            cbCtx.fill();

            for (let i = 0; i < t.count; i++) {
                cbCtx.save();
                cbCtx.rotate((i / t.count) * Math.PI * 2 + t.rotOff);
                const pg = cbCtx.createLinearGradient(0, 4, 0, -tr);
                pg.addColorStop(0, t.c0);
                pg.addColorStop(0.32, t.c1);
                pg.addColorStop(0.68, t.c2);
                pg.addColorStop(0.90, t.c3);
                pg.addColorStop(1, t.c4);
                cbCtx.fillStyle = pg;
                cbCtx.beginPath();
                cbCtx.moveTo(0, 4);
                cbCtx.bezierCurveTo(-tr * 0.56, -tr * 0.14, -tr * 0.62, -tr * 0.86, 0, -tr);
                cbCtx.bezierCurveTo(tr * 0.62, -tr * 0.86, tr * 0.56, -tr * 0.14, 0, 4);
                cbCtx.closePath();
                cbCtx.fill();

                cbCtx.strokeStyle = 'rgba(255, 250, 252, 0.55)';
                cbCtx.lineWidth = 0.85;
                cbCtx.stroke();
                cbCtx.restore();
            }
        });

        // Vương miện nhụy vàng 24K立体 ở tâm hoa trà
        const cg = cbCtx.createRadialGradient(0, 0, 1, 0, 0, 14);
        cg.addColorStop(0, '#fffbeb');
        cg.addColorStop(0.5, '#fbbf24');
        cg.addColorStop(1, '#b45309');
        cbCtx.fillStyle = cg;
        cbCtx.beginPath();
        cbCtx.arc(0, 0, 9.5, 0, Math.PI * 2);
        cbCtx.fill();
        for (let st = 0; st < 12; st++) {
            const sa = (st / 12) * Math.PI * 2;
            const sr = 12.5 + (st % 2) * 2.5;
            cbCtx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
            cbCtx.lineWidth = 1.1;
            cbCtx.beginPath();
            cbCtx.moveTo(Math.cos(sa) * 6, Math.sin(sa) * 6);
            cbCtx.lineTo(Math.cos(sa) * sr, Math.sin(sa) * sr);
            cbCtx.stroke();
            cbCtx.fillStyle = '#fffbeb';
            cbCtx.beginPath();
            cbCtx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr, 1.7, 0, Math.PI * 2);
            cbCtx.fill();
        }
        atlas.camelliaBloom = cbC;
    }

    // 3. HOA ANH ĐÀO KYOTO 3D & CÁNH ANH ĐÀO CHẺ ĐÔI (3D Kyoto Sakura Petal 136x136 & Blossom 196x196)
    {
        const { c, ctx } = makeCanvas(136, 136);
        ctx.translate(68, 72);
        const s = 44;

        // Bóng đổ nhẹ tách nền
        ctx.fillStyle = 'rgba(56, 8, 28, 0.20)';
        ctx.beginPath();
        ctx.moveTo(1.2, s * 0.50 + 2.5);
        ctx.bezierCurveTo(-s * 0.80, s * 0.08 + 2.5, -s * 0.90, -s * 0.76 + 2.5, -s * 0.24, -s * 1.0 + 2.5);
        ctx.lineTo(1.2, -s * 0.74 + 2.5);
        ctx.lineTo(s * 0.24, -s * 1.0 + 2.5);
        ctx.bezierCurveTo(s * 0.90, -s * 0.76 + 2.5, s * 0.80, s * 0.08 + 2.5, 1.2, s * 0.50 + 2.5);
        ctx.closePath();
        ctx.fill();

        const sGrad = ctx.createLinearGradient(0, s * 0.5, 0, -s);
        sGrad.addColorStop(0, '#be185d');
        sGrad.addColorStop(0.28, '#f472b6');
        sGrad.addColorStop(0.65, '#fbcfe8');
        sGrad.addColorStop(0.90, '#fdf2f8');
        sGrad.addColorStop(1, '#ffffff');

        ctx.fillStyle = sGrad;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.48);
        ctx.bezierCurveTo(-s * 0.80, s * 0.06, -s * 0.90, -s * 0.76, -s * 0.24, -s * 1.02);
        ctx.lineTo(0, -s * 0.74);
        ctx.lineTo(s * 0.24, -s * 1.02);
        ctx.bezierCurveTo(s * 0.90, -s * 0.76, s * 0.80, s * 0.06, 0, s * 0.48);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.lineWidth = 0.95;
        ctx.stroke();
        for (let v = -2; v <= 2; v++) {
            if (v === 0) continue;
            ctx.beginPath();
            ctx.moveTo(0, s * 0.36);
            ctx.quadraticCurveTo(v * s * 0.16, -s * 0.2, v * s * 0.22, -s * 0.78);
            ctx.stroke();
        }
        atlas.sakuraPetal = c;

        // 3B. Đóa Hoa Anh Đào Kyoto 3D 5 Cánh Kép & Tua Nhụy Vàng (196x196)
        const { c: sbC, ctx: sbCtx } = makeCanvas(196, 196);
        sbCtx.translate(98, 98);
        const bs = 64;
        // Bóng đổ mềm dưới đóa hoa
        const sDrop = sbCtx.createRadialGradient(2, 4, bs * 0.1, 2, 4, bs * 0.95);
        sDrop.addColorStop(0, 'rgba(48, 6, 24, 0.32)');
        sDrop.addColorStop(1, 'rgba(48, 6, 24, 0)');
        sbCtx.fillStyle = sDrop;
        sbCtx.beginPath();
        sbCtx.arc(2, 4, bs * 0.95, 0, Math.PI * 2);
        sbCtx.fill();

        for (let tier = 0; tier < 2; tier++) {
            const tr = tier === 0 ? bs : bs * 0.66;
            const rotOff = tier === 0 ? 0 : Math.PI / 5;
            for (let i = 0; i < 5; i++) {
                sbCtx.save();
                sbCtx.rotate((i / 5) * Math.PI * 2 + rotOff);
                const pg = sbCtx.createLinearGradient(0, 4, 0, -tr);
                pg.addColorStop(0, tier === 0 ? '#be185d' : '#db2777');
                pg.addColorStop(0.32, '#f472b6');
                pg.addColorStop(0.68, '#fce7f3');
                pg.addColorStop(1, '#ffffff');
                sbCtx.fillStyle = pg;
                sbCtx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
                sbCtx.lineWidth = 1.0;
                sbCtx.beginPath();
                sbCtx.moveTo(0, 3);
                sbCtx.bezierCurveTo(-tr * 0.56, -tr * 0.14, -tr * 0.64, -tr * 0.78, -tr * 0.18, -tr);
                sbCtx.lineTo(0, -tr * 0.78);
                sbCtx.lineTo(tr * 0.18, -tr);
                sbCtx.bezierCurveTo(tr * 0.64, -tr * 0.78, tr * 0.56, -tr * 0.14, 0, 3);
                sbCtx.closePath();
                sbCtx.fill();
                sbCtx.stroke();
                sbCtx.restore();
            }
        }
        // Đài nhụy đỏ hồng & 15 sợi nhụy phấn vàng vươn từ tâm
        sbCtx.fillStyle = '#9d174d';
        sbCtx.beginPath();
        sbCtx.arc(0, 0, 6.5, 0, Math.PI * 2);
        sbCtx.fill();
        for (let st = 0; st < 15; st++) {
            const sa = (st / 15) * Math.PI * 2;
            const sr = 14 + (st % 2) * 5;
            sbCtx.strokeStyle = 'rgba(253, 224, 71, 0.82)';
            sbCtx.lineWidth = 0.95;
            sbCtx.beginPath();
            sbCtx.moveTo(Math.cos(sa) * 4, Math.sin(sa) * 4);
            sbCtx.lineTo(Math.cos(sa) * sr, Math.sin(sa) * sr);
            sbCtx.stroke();
            sbCtx.fillStyle = '#fef08a';
            sbCtx.beginPath();
            sbCtx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr, 1.8, 0, Math.PI * 2);
            sbCtx.fill();
        }
        atlas.sakuraBloom = sbC;
    }

    // 4. CÁNH HỒ ĐIỆP 3D TÁCH BIỆT CÁNH TRƯỚC (FOREWING) & CÁNH SAU (HINDWING) (Articulated 3D Butterfly Wings - 148x148)
    // Không vẽ quầng tròn mờ đục quanh cánh để khi vỗ cánh hoàn toàn trong trẻo, sắc nét!
    const buildButterflyWingPair = (isGold) => {
        const s = 48;
        // Cánh trước (Forewing)
        const { c: fwC, ctx: fwCtx } = makeCanvas(148, 148);
        fwCtx.translate(20, 72);
        const fg = fwCtx.createLinearGradient(0, -s, s * 1.1, s * 0.2);
        if (isGold) {
            fg.addColorStop(0, '#fffbeb');
            fg.addColorStop(0.26, '#fde047');
            fg.addColorStop(0.62, '#f59e0b');
            fg.addColorStop(0.88, '#10b981');
            fg.addColorStop(1, '#3b1704');
        } else {
            fg.addColorStop(0, '#fff1f2');
            fg.addColorStop(0.28, '#fda4af');
            fg.addColorStop(0.65, '#e11d48');
            fg.addColorStop(0.88, '#f59e0b');
            fg.addColorStop(1, '#3b0414');
        }
        fwCtx.fillStyle = fg;
        fwCtx.strokeStyle = isGold ? '#fef08a' : '#ffe4e6';
        fwCtx.lineWidth = 1.15;
        fwCtx.beginPath();
        fwCtx.moveTo(0, -s * 0.08);
        fwCtx.bezierCurveTo(s * 0.56, -s * 1.06, s * 1.24, -s * 0.62, s * 0.94, s * 0.08);
        fwCtx.bezierCurveTo(s * 0.68, s * 0.28, s * 0.28, s * 0.16, 0, s * 0.04);
        fwCtx.closePath();
        fwCtx.fill();
        fwCtx.stroke();

        fwCtx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
        fwCtx.lineWidth = 1.1;
        [[s * 0.42, -s * 0.45, s * 0.84, -s * 0.36], [s * 0.48, -s * 0.22, s * 0.88, -s * 0.06], [s * 0.35, -s * 0.08, s * 0.74, s * 0.10]].forEach(([cx1, cy1, ex, ey]) => {
            fwCtx.beginPath();
            fwCtx.moveTo(0, 0);
            fwCtx.quadraticCurveTo(cx1, cy1, ex, ey);
            fwCtx.stroke();
        });
        fwCtx.fillStyle = '#ffffff';
        [[s * 0.82, -s * 0.44, 2.3], [s * 0.88, -s * 0.20, 2.6], [s * 0.82, 0.00, 2.1]].forEach(([x, y, r]) => {
            fwCtx.beginPath();
            fwCtx.arc(x, y, r, 0, Math.PI * 2);
            fwCtx.fill();
        });

        // Cánh sau (Hindwing có đuôi Swallowtail thanh thoát)
        const { c: hwC, ctx: hwCtx } = makeCanvas(148, 148);
        hwCtx.translate(20, 72);
        const hg = hwCtx.createRadialGradient(s * 0.15, s * 0.15, 2, s * 0.35, s * 0.45, s * 0.92);
        if (isGold) {
            hg.addColorStop(0, '#ffffff');
            hg.addColorStop(0.42, '#fde047');
            hg.addColorStop(0.78, '#10b981');
            hg.addColorStop(1, '#064e3b');
        } else {
            hg.addColorStop(0, '#ffffff');
            hg.addColorStop(0.45, '#f472b6');
            hg.addColorStop(0.82, '#be123c');
            hg.addColorStop(1, '#4c0519');
        }
        hwCtx.fillStyle = hg;
        hwCtx.strokeStyle = isGold ? '#fef08a' : '#fecdd3';
        hwCtx.lineWidth = 1.05;
        hwCtx.beginPath();
        hwCtx.moveTo(0, s * 0.04);
        hwCtx.bezierCurveTo(s * 0.66, s * 0.20, s * 0.86, s * 0.86, s * 0.42, s * 1.02);
        hwCtx.lineTo(s * 0.34, s * 1.20); // Đuôi cánh bướm Swallowtail
        hwCtx.lineTo(s * 0.25, s * 0.98);
        hwCtx.bezierCurveTo(s * 0.12, s * 0.92, s * 0.04, s * 0.48, 0, s * 0.18);
        hwCtx.closePath();
        hwCtx.fill();
        hwCtx.stroke();

        hwCtx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
        hwCtx.lineWidth = 1.0;
        [[s * 0.32, s * 0.28, s * 0.60, s * 0.58], [s * 0.18, s * 0.38, s * 0.36, s * 0.86]].forEach(([cx1, cy1, ex, ey]) => {
            hwCtx.beginPath();
            hwCtx.moveTo(0, s * 0.06);
            hwCtx.quadraticCurveTo(cx1, cy1, ex, ey);
            hwCtx.stroke();
        });
        hwCtx.fillStyle = '#ffffff';
        [[s * 0.58, s * 0.54, 2.3], [s * 0.38, s * 0.78, 2.5]].forEach(([x, y, r]) => {
            hwCtx.beginPath();
            hwCtx.arc(x, y, r, 0, Math.PI * 2);
            hwCtx.fill();
        });

        // Cánh tổng hợp (cho tương thích ngược ở nơi cần 1 sprite)
        const { c: combC, ctx: combCtx } = makeCanvas(148, 148);
        combCtx.drawImage(hwC, 0, 0);
        combCtx.drawImage(fwC, 0, 0);

        return { fore: fwC, hind: hwC, combined: combC };
    };
    const bfGold = buildButterflyWingPair(true);
    const bfRose = buildButterflyWingPair(false);
    atlas.butterflyWingGold = bfGold.combined;
    atlas.butterflyWingRose = bfRose.combined;
    atlas.bfForewingGold = bfGold.fore;
    atlas.bfHindwingGold = bfGold.hind;
    atlas.bfForewingRose = bfRose.fore;
    atlas.bfHindwingRose = bfRose.hind;

    // 5. ĐẠI ĐÓA HỒNG NHUNG PHÁP CENTIFOLIA 3D, NỤ HỒNG PHÁP NGHIÊNG 3D & CÁNH HỒNG SƯƠNG MAI (Không có viền vàng hoạt hình hay quầng tròn mờ!)
    {
        // 5A. Cánh Hoa Hồng Nhung Pháp 3D khum lòng chảo & giọt sương mai pha lê (150x150)
        const { c: rpC, ctx: rpCtx } = makeCanvas(150, 150);
        rpCtx.translate(75, 78);
        const s = 48;

        // Bóng đổ mềm dưới cánh hồng
        rpCtx.fillStyle = 'rgba(38, 2, 12, 0.25)';
        rpCtx.beginPath();
        rpCtx.moveTo(1.5, s * 0.58 + 3);
        rpCtx.bezierCurveTo(-s * 1.10, s * 0.22 + 3, -s * 1.14, -s * 0.74 + 3, -s * 0.30, -s * 0.96 + 3);
        rpCtx.quadraticCurveTo(1.5, -s * 0.84 + 3, s * 0.34, -s * 0.96 + 3);
        rpCtx.bezierCurveTo(s * 1.14, -s * 0.74 + 3, s * 1.10, s * 0.22 + 3, 1.5, s * 0.58 + 3);
        rpCtx.closePath();
        rpCtx.fill();

        const rpGrad = rpCtx.createRadialGradient(0, s * 0.34, 2, 0, -s * 0.22, s * 1.18);
        rpGrad.addColorStop(0, '#2b020c');
        rpGrad.addColorStop(0.26, '#7a0c2e');
        rpGrad.addColorStop(0.56, '#be123c');
        rpGrad.addColorStop(0.80, '#f43f5e');
        rpGrad.addColorStop(0.94, '#fda4af');
        rpGrad.addColorStop(1, '#fff1f2');

        rpCtx.fillStyle = rpGrad;
        rpCtx.beginPath();
        rpCtx.moveTo(0, s * 0.58);
        rpCtx.bezierCurveTo(-s * 1.12, s * 0.22, -s * 1.16, -s * 0.74, -s * 0.32, -s * 0.98);
        rpCtx.quadraticCurveTo(0, -s * 0.86, s * 0.32, -s * 0.98);
        rpCtx.bezierCurveTo(s * 1.16, -s * 0.74, s * 1.12, s * 0.22, 0, s * 0.58);
        rpCtx.closePath();
        rpCtx.fill();

        const innerBowl = rpCtx.createRadialGradient(0, -s * 0.06, 2, 0, -s * 0.06, s * 0.66);
        innerBowl.addColorStop(0, 'rgba(76, 5, 25, 0.52)');
        innerBowl.addColorStop(0.65, 'rgba(159, 18, 57, 0.16)');
        innerBowl.addColorStop(1, 'rgba(255, 228, 230, 0)');
        rpCtx.fillStyle = innerBowl;
        rpCtx.fill();

        rpCtx.strokeStyle = 'rgba(255, 228, 230, 0.28)';
        rpCtx.lineWidth = 0.9;
        for (let v = -2; v <= 2; v++) {
            rpCtx.beginPath();
            rpCtx.moveTo(0, s * 0.48);
            rpCtx.quadraticCurveTo(v * s * 0.22, -s * 0.1, v * s * 0.28, -s * (0.82 - Math.abs(v) * 0.08));
            rpCtx.stroke();
        }

        // Mép cánh uốn lượn bắt sáng (Velvet Rolled Lip)
        rpCtx.strokeStyle = 'rgba(255, 241, 242, 0.82)';
        rpCtx.lineWidth = 1.4;
        rpCtx.beginPath();
        rpCtx.moveTo(-s * 0.84, -s * 0.32);
        rpCtx.bezierCurveTo(-s * 0.76, -s * 0.84, -s * 0.28, -s * 1.0, 0, -s * 0.88);
        rpCtx.bezierCurveTo(s * 0.28, -s * 1.0, s * 0.76, -s * 0.84, s * 0.84, -s * 0.32);
        rpCtx.stroke();

        // Giọt sương mai pha lê 3D
        [
            { dx: s * 0.30, dy: -s * 0.34, dr: 3.8 },
            { dx: -s * 0.22, dy: -s * 0.10, dr: 2.5 }
        ].forEach(dew => {
            rpCtx.fillStyle = 'rgba(64, 4, 20, 0.42)';
            rpCtx.beginPath();
            rpCtx.arc(dew.dx + 1.1, dew.dy + 1.3, dew.dr, 0, Math.PI * 2);
            rpCtx.fill();

            const dGrad = rpCtx.createRadialGradient(dew.dx - dew.dr * 0.3, dew.dy - dew.dr * 0.3, 0.3, dew.dx, dew.dy, dew.dr);
            dGrad.addColorStop(0, '#ffffff');
            dGrad.addColorStop(0.55, '#ffe4e6');
            dGrad.addColorStop(1, 'rgba(244, 63, 94, 0.68)');
            rpCtx.fillStyle = dGrad;
            rpCtx.beginPath();
            rpCtx.arc(dew.dx, dew.dy, dew.dr, 0, Math.PI * 2);
            rpCtx.fill();
        });
        atlas.rosePetal = rpC;

        // 5B. Đại Đóa Hồng Nhung Pháp 3D Xoáy Sâu Đa Tầng (210x210 — Xóa viền vàng hoạt hình, thêm Ambient Occlusion giữa các tầng cánh!)
        const { c: rbC, ctx: rbCtx } = makeCanvas(210, 210);
        rbCtx.translate(105, 105);
        const bs = 64;

        // 4 Lá Hồng Pháp răng cưa xanh lục bảo đậm phía dưới
        for (let l = 0; l < 4; l++) {
            rbCtx.save();
            rbCtx.rotate((l / 4) * Math.PI * 2 + Math.PI / 4);
            const lGrad = rbCtx.createLinearGradient(0, -bs * 0.3, 0, -bs * 1.20);
            lGrad.addColorStop(0, '#032e22');
            lGrad.addColorStop(0.58, '#047857');
            lGrad.addColorStop(0.92, '#10b981');
            lGrad.addColorStop(1, '#a7f3d0');
            rbCtx.fillStyle = lGrad;
            rbCtx.beginPath();
            rbCtx.moveTo(0, -bs * 0.28);
            rbCtx.bezierCurveTo(-bs * 0.32, -bs * 0.60, -bs * 0.26, -bs * 1.02, 0, -bs * 1.20);
            rbCtx.bezierCurveTo(bs * 0.26, -bs * 1.02, bs * 0.32, -bs * 0.60, 0, -bs * 0.28);
            rbCtx.closePath();
            rbCtx.fill();

            rbCtx.strokeStyle = 'rgba(167, 243, 208, 0.55)';
            rbCtx.lineWidth = 0.85;
            rbCtx.beginPath();
            rbCtx.moveTo(0, -bs * 0.35);
            rbCtx.lineTo(0, -bs * 1.12);
            rbCtx.stroke();
            rbCtx.restore();
        }

        // Bóng đổ tổng thể dưới đài hoa
        const baseShadow = rbCtx.createRadialGradient(2, 4, bs * 0.2, 2, 4, bs * 1.05);
        baseShadow.addColorStop(0, 'rgba(30, 2, 10, 0.45)');
        baseShadow.addColorStop(1, 'rgba(30, 2, 10, 0)');
        rbCtx.fillStyle = baseShadow;
        rbCtx.beginPath();
        rbCtx.arc(2, 4, bs * 1.05, 0, Math.PI * 2);
        rbCtx.fill();

        // Tầng 1 (Outer Guard Petals): 8 cánh nhung đỏ Bordeaux uốn mép tự nhiên
        for (let i = 0; i < 8; i++) {
            rbCtx.save();
            rbCtx.rotate((i / 8) * Math.PI * 2);
            // Bóng đổ của từng cánh lên cánh kế bên
            rbCtx.fillStyle = 'rgba(28, 2, 10, 0.34)';
            rbCtx.beginPath();
            rbCtx.arc(2, -bs * 0.46, bs * 0.42, 0, Math.PI * 2);
            rbCtx.fill();

            const g1 = rbCtx.createRadialGradient(0, -bs * 0.12, 4, 0, -bs * 0.52, bs * 0.94);
            g1.addColorStop(0, '#2b020c');
            g1.addColorStop(0.44, '#7a0c2e');
            g1.addColorStop(0.78, '#be123c');
            g1.addColorStop(0.94, '#f43f5e');
            g1.addColorStop(1, '#fecdd3');
            rbCtx.fillStyle = g1;
            rbCtx.beginPath();
            rbCtx.moveTo(0, 8);
            rbCtx.bezierCurveTo(-bs * 0.68, -bs * 0.12, -bs * 0.74, -bs * 0.88, -bs * 0.18, -bs * 1.02);
            rbCtx.quadraticCurveTo(0, -bs * 0.93, bs * 0.18, -bs * 1.02);
            rbCtx.bezierCurveTo(bs * 0.74, -bs * 0.88, bs * 0.68, -bs * 0.12, 0, 8);
            rbCtx.closePath();
            rbCtx.fill();

            // Chỉ highlight ở mép cuộn trên cùng của cánh hồng (Tạo khối 3D thật thay vì viền quanh toàn bộ cánh!)
            rbCtx.strokeStyle = 'rgba(255, 228, 230, 0.68)';
            rbCtx.lineWidth = 1.05;
            rbCtx.beginPath();
            rbCtx.moveTo(-bs * 0.50, -bs * 0.66);
            rbCtx.quadraticCurveTo(-bs * 0.25, -bs * 0.98, 0, -bs * 0.95);
            rbCtx.quadraticCurveTo(bs * 0.25, -bs * 0.98, bs * 0.50, -bs * 0.66);
            rbCtx.stroke();
            rbCtx.restore();
        }

        // Tầng 2 (Mid Cupped Petals): 7 cánh khum sâu có bóng Ambient Occlusion bên dưới
        const ao2 = rbCtx.createRadialGradient(0, 2, bs * 0.1, 0, 2, bs * 0.82);
        ao2.addColorStop(0, 'rgba(28, 2, 10, 0.55)');
        ao2.addColorStop(1, 'rgba(28, 2, 10, 0)');
        rbCtx.fillStyle = ao2;
        rbCtx.beginPath();
        rbCtx.arc(0, 2, bs * 0.82, 0, Math.PI * 2);
        rbCtx.fill();

        for (let i = 0; i < 7; i++) {
            rbCtx.save();
            rbCtx.rotate((i / 7) * Math.PI * 2 + 0.28);
            const ms = bs * 0.76;
            const g2 = rbCtx.createLinearGradient(0, 6, 0, -ms);
            g2.addColorStop(0, '#3b0414');
            g2.addColorStop(0.42, '#881337');
            g2.addColorStop(0.76, '#e11d48');
            g2.addColorStop(0.93, '#fda4af');
            g2.addColorStop(1, '#fff1f2');
            rbCtx.fillStyle = g2;
            rbCtx.beginPath();
            rbCtx.moveTo(0, 6);
            rbCtx.bezierCurveTo(-ms * 0.66, -ms * 0.10, -ms * 0.70, -ms * 0.88, 0, -ms);
            rbCtx.bezierCurveTo(ms * 0.70, -ms * 0.88, ms * 0.66, -ms * 0.10, 0, 6);
            rbCtx.closePath();
            rbCtx.fill();

            rbCtx.strokeStyle = 'rgba(255, 241, 242, 0.75)';
            rbCtx.lineWidth = 1.0;
            rbCtx.beginPath();
            rbCtx.moveTo(-ms * 0.46, -ms * 0.64);
            rbCtx.quadraticCurveTo(0, -ms * 1.02, ms * 0.46, -ms * 0.64);
            rbCtx.stroke();
            rbCtx.restore();
        }

        // Tầng 3 (Inner Velvet Whorl): 6 cánh khum ôm lấy tâm hoa
        const ao3 = rbCtx.createRadialGradient(0, 1, bs * 0.08, 0, 1, bs * 0.56);
        ao3.addColorStop(0, 'rgba(38, 2, 14, 0.58)');
        ao3.addColorStop(1, 'rgba(38, 2, 14, 0)');
        rbCtx.fillStyle = ao3;
        rbCtx.beginPath();
        rbCtx.arc(0, 1, bs * 0.56, 0, Math.PI * 2);
        rbCtx.fill();

        for (let i = 0; i < 6; i++) {
            rbCtx.save();
            rbCtx.rotate((i / 6) * Math.PI * 2 + 0.55);
            const ws = bs * 0.52;
            const g3 = rbCtx.createLinearGradient(0, 4, 0, -ws);
            g3.addColorStop(0, '#4c0519');
            g3.addColorStop(0.45, '#be123c');
            g3.addColorStop(0.84, '#fb7185');
            g3.addColorStop(1, '#ffe4e6');
            rbCtx.fillStyle = g3;
            rbCtx.beginPath();
            rbCtx.moveTo(0, 4);
            rbCtx.bezierCurveTo(-ws * 0.68, -ws * 0.14, -ws * 0.72, -ws * 0.90, 0, -ws);
            rbCtx.bezierCurveTo(ws * 0.72, -ws * 0.90, ws * 0.68, -ws * 0.14, 0, 4);
            rbCtx.closePath();
            rbCtx.fill();

            rbCtx.strokeStyle = 'rgba(255, 245, 247, 0.82)';
            rbCtx.lineWidth = 0.95;
            rbCtx.beginPath();
            rbCtx.moveTo(-ws * 0.45, -ws * 0.65);
            rbCtx.quadraticCurveTo(0, -ws * 1.02, ws * 0.45, -ws * 0.65);
            rbCtx.stroke();
            rbCtx.restore();
        }

        // Tầng 4 (Heart Spiral Core): 5 cánh nụ xoáy sát tâm
        for (let i = 0; i < 5; i++) {
            rbCtx.save();
            rbCtx.rotate((i / 5) * Math.PI * 2 + 0.9);
            const cs = bs * 0.29;
            const g4 = rbCtx.createLinearGradient(0, 2, 0, -cs);
            g4.addColorStop(0, '#881337');
            g4.addColorStop(0.55, '#f43f5e');
            g4.addColorStop(1, '#fff1f2');
            rbCtx.fillStyle = g4;
            rbCtx.beginPath();
            rbCtx.moveTo(0, 2);
            rbCtx.bezierCurveTo(-cs * 0.72, -cs * 0.2, -cs * 0.72, -cs * 0.92, 0, -cs);
            rbCtx.bezierCurveTo(cs * 0.72, -cs * 0.92, cs * 0.72, -cs * 0.2, 0, 2);
            rbCtx.closePath();
            rbCtx.fill();
            rbCtx.restore();
        }

        // Nhụy kim hoàn ấm áp ở tâm hoa
        const rgCore = rbCtx.createRadialGradient(0, 0, 1, 0, 0, 8);
        rgCore.addColorStop(0, '#fffbeb');
        rgCore.addColorStop(0.55, '#fbbf24');
        rgCore.addColorStop(1, 'rgba(159, 18, 57, 0)');
        rbCtx.fillStyle = rgCore;
        rbCtx.beginPath();
        rbCtx.arc(0, 0, 8, 0, Math.PI * 2);
        rbCtx.fill();
        atlas.roseBloom = rbC;

        // 5B-2. Nụ Hoa Hồng Pháp 3D Góc Nghiêng Đa Tầng (3D Side-Angled Sculpted French Rosebud - 168x168)
        const { c: rbudC, ctx: rbudCtx } = makeCanvas(168, 168);
        rbudCtx.translate(84, 96);
        const rbs = 48;
        // Cuống & đài xanh lục bảo 3D ôm búp hồng
        const stG = rbudCtx.createLinearGradient(-3, rbs * 0.15, 3, rbs * 0.80);
        stG.addColorStop(0, '#059669');
        stG.addColorStop(0.5, '#047857');
        stG.addColorStop(1, '#022c22');
        rbudCtx.strokeStyle = stG;
        rbudCtx.lineWidth = 4.2;
        rbudCtx.lineCap = 'round';
        rbudCtx.beginPath();
        rbudCtx.moveTo(0, rbs * 0.20);
        rbudCtx.quadraticCurveTo(3.5, rbs * 0.50, -1.5, rbs * 0.76);
        rbudCtx.stroke();

        // Tầng 2 cánh đài ngoài hé mở ôm lấy bầu hoa (Outer Guard Petals)
        [-1, 1].forEach(dir => {
            const og = rbudCtx.createLinearGradient(0, rbs * 0.24, dir * rbs * 0.85, -rbs * 0.82);
            og.addColorStop(0, '#2d020e');
            og.addColorStop(0.38, '#881337');
            og.addColorStop(0.76, '#e11d48');
            og.addColorStop(0.94, '#fda4af');
            og.addColorStop(1, '#fff1f2');
            rbudCtx.fillStyle = og;
            rbudCtx.beginPath();
            rbudCtx.moveTo(0, rbs * 0.24);
            rbudCtx.bezierCurveTo(dir * rbs * 0.96, rbs * 0.12, dir * rbs * 1.02, -rbs * 0.68, dir * rbs * 0.38, -rbs * 0.92);
            rbudCtx.bezierCurveTo(dir * rbs * 0.08, -rbs * 0.72, -dir * rbs * 0.12, -rbs * 0.25, 0, rbs * 0.24);
            rbudCtx.closePath();
            rbudCtx.fill();

            // Viền sáng mép cánh uốn cong
            rbudCtx.strokeStyle = 'rgba(255, 228, 230, 0.75)';
            rbudCtx.lineWidth = 1.0;
            rbudCtx.beginPath();
            rbudCtx.moveTo(dir * rbs * 0.74, -rbs * 0.28);
            rbudCtx.quadraticCurveTo(dir * rbs * 0.72, -rbs * 0.74, dir * rbs * 0.36, -rbs * 0.91);
            rbudCtx.stroke();
        });

        // Bóng đổ khe sâu (Ambient Occlusion) giữa cánh ngoài và lõi búp xoáy
        const budAo = rbudCtx.createRadialGradient(0, -rbs * 0.32, 4, 0, -rbs * 0.32, rbs * 0.68);
        budAo.addColorStop(0, 'rgba(30, 2, 10, 0.72)');
        budAo.addColorStop(1, 'rgba(30, 2, 10, 0)');
        rbudCtx.fillStyle = budAo;
        rbudCtx.beginPath();
        rbudCtx.arc(0, -rbs * 0.32, rbs * 0.68, 0, Math.PI * 2);
        rbudCtx.fill();

        // Lõi búp nhung cuộn xoáy ốc trung tâm (Inner Velvet Spiral Cone)
        const coneG = rbudCtx.createLinearGradient(-rbs * 0.38, rbs * 0.1, rbs * 0.38, -rbs * 1.08);
        coneG.addColorStop(0, '#3b0414');
        coneG.addColorStop(0.32, '#9f1239');
        coneG.addColorStop(0.68, '#f43f5e');
        coneG.addColorStop(0.90, '#fecdd3');
        coneG.addColorStop(1, '#ffffff');
        rbudCtx.fillStyle = coneG;
        rbudCtx.beginPath();
        rbudCtx.moveTo(0, rbs * 0.22);
        rbudCtx.bezierCurveTo(-rbs * 0.56, rbs * 0.08, -rbs * 0.52, -rbs * 0.82, 0, -rbs * 1.08);
        rbudCtx.bezierCurveTo(rbs * 0.52, -rbs * 0.82, rbs * 0.56, rbs * 0.08, 0, rbs * 0.22);
        rbudCtx.closePath();
        rbudCtx.fill();

        // Cánh nhung tiền cảnh ôm chéo qua bụng búp hồng (Front-Wrapping Overlapping Petal) tạo khối 3D thật
        const wrapG = rbudCtx.createLinearGradient(-rbs * 0.45, rbs * 0.24, rbs * 0.48, -rbs * 0.65);
        wrapG.addColorStop(0, '#4c0519');
        wrapG.addColorStop(0.35, '#be123c');
        wrapG.addColorStop(0.75, '#fb7185');
        wrapG.addColorStop(1, '#fff1f2');
        rbudCtx.fillStyle = wrapG;
        rbudCtx.beginPath();
        rbudCtx.moveTo(-rbs * 0.42, -rbs * 0.08);
        rbudCtx.bezierCurveTo(-rbs * 0.38, -rbs * 0.58, rbs * 0.26, -rbs * 0.72, rbs * 0.46, -rbs * 0.26);
        rbudCtx.bezierCurveTo(rbs * 0.48, rbs * 0.14, -rbs * 0.22, rbs * 0.32, -rbs * 0.42, -rbs * 0.08);
        rbudCtx.closePath();
        rbudCtx.fill();

        // Đường xoáy ốc ánh kim và mép cánh lật sáng ở đỉnh nụ hoa
        rbudCtx.strokeStyle = 'rgba(255, 241, 242, 0.90)';
        rbudCtx.lineWidth = 1.25;
        rbudCtx.beginPath();
        rbudCtx.moveTo(-rbs * 0.28, -rbs * 0.74);
        rbudCtx.quadraticCurveTo(0, -rbs * 1.08, rbs * 0.30, -rbs * 0.70);
        rbudCtx.moveTo(-rbs * 0.16, -rbs * 0.86);
        rbudCtx.quadraticCurveTo(rbs * 0.06, -rbs * 0.68, rbs * 0.22, -rbs * 0.82);
        rbudCtx.stroke();

        // Đài lá ngọc lục bảo 3 cánh ôm sát bầu hoa
        [-1, 0, 1].forEach(dir => {
            const sepG = rbudCtx.createLinearGradient(0, rbs * 0.30, dir * rbs * 0.42, -rbs * 0.18);
            sepG.addColorStop(0, '#022c22');
            sepG.addColorStop(0.5, '#059669');
            sepG.addColorStop(1, '#6ee7b7');
            rbudCtx.fillStyle = sepG;
            rbudCtx.beginPath();
            if (dir === 0) {
                rbudCtx.moveTo(-4, rbs * 0.26);
                rbudCtx.quadraticCurveTo(0, rbs * 0.02, 0, -rbs * 0.12);
                rbudCtx.quadraticCurveTo(0, rbs * 0.02, 4, rbs * 0.26);
            } else {
                rbudCtx.moveTo(0, rbs * 0.28);
                rbudCtx.quadraticCurveTo(dir * rbs * 0.46, rbs * 0.16, dir * rbs * 0.52, -rbs * 0.24);
                rbudCtx.quadraticCurveTo(dir * rbs * 0.20, rbs * 0.08, 0, rbs * 0.20);
            }
            rbudCtx.closePath();
            rbudCtx.fill();
        });
        atlas.roseBud3D = rbudC;
    }

    // 5C. ĐÓA TULIP HOÀNG GIA HÀ LAN 3D & CÁNH TULIP LỤA ĐÀO (Không có quầng tròn mờ đục!)
    {
        const { c: tpC, ctx: tpCtx } = makeCanvas(150, 150);
        tpCtx.translate(75, 80);
        const s = 46;

        // Bóng đổ mềm tách nền
        tpCtx.fillStyle = 'rgba(42, 6, 18, 0.22)';
        tpCtx.beginPath();
        tpCtx.moveTo(1.4, s * 0.52 + 2.5);
        tpCtx.bezierCurveTo(-s * 0.78, s * 0.24 + 2.5, -s * 0.84, -s * 0.70 + 2.5, 1.4, -s * 1.06 + 2.5);
        tpCtx.bezierCurveTo(s * 0.84, -s * 0.70 + 2.5, s * 0.78, s * 0.24 + 2.5, 1.4, s * 0.52 + 2.5);
        tpCtx.closePath();
        tpCtx.fill();

        const tpGrad = tpCtx.createLinearGradient(0, s * 0.52, 0, -s * 1.08);
        tpGrad.addColorStop(0, '#d97706');
        tpGrad.addColorStop(0.18, '#fbbf24');
        tpGrad.addColorStop(0.46, '#e11d48');
        tpGrad.addColorStop(0.76, '#fb7185');
        tpGrad.addColorStop(0.92, '#ffe4e6');
        tpGrad.addColorStop(1, '#ffffff');
        tpCtx.fillStyle = tpGrad;
        tpCtx.beginPath();
        tpCtx.moveTo(0, s * 0.52);
        tpCtx.bezierCurveTo(-s * 0.78, s * 0.24, -s * 0.84, -s * 0.70, 0, -s * 1.08);
        tpCtx.bezierCurveTo(s * 0.84, -s * 0.70, s * 0.78, s * 0.24, 0, s * 0.52);
        tpCtx.closePath();
        tpCtx.fill();

        // Lòng khum 3D
        const cupG = tpCtx.createRadialGradient(0, -s * 0.15, 2, 0, -s * 0.15, s * 0.58);
        cupG.addColorStop(0, 'rgba(136, 19, 55, 0.34)');
        cupG.addColorStop(1, 'rgba(136, 19, 55, 0)');
        tpCtx.fillStyle = cupG;
        tpCtx.fill();

        tpCtx.strokeStyle = 'rgba(255, 248, 235, 0.45)';
        tpCtx.lineWidth = 0.95;
        for (let v = -2; v <= 2; v++) {
            tpCtx.beginPath();
            tpCtx.moveTo(0, s * 0.46);
            tpCtx.quadraticCurveTo(v * s * 0.14, -s * 0.22, v * s * 0.16, -s * (0.94 - Math.abs(v) * 0.07));
            tpCtx.stroke();
        }
        atlas.tulipPetal = tpC;

        // 5D. Đóa Hoa Tulip Hoàng Gia 3D 6 Cánh Khum Ly Rượu (Royal Chalice - 196x196)
        const { c: tbC, ctx: tbCtx } = makeCanvas(196, 196);
        tbCtx.translate(98, 108);
        const ts = 54;

        // Cuống hoa 3D có ánh sáng trụ tròn & đôi lá lụa uốn cong tự nhiên
        const stemG = tbCtx.createLinearGradient(-3, 0, 3, 0);
        stemG.addColorStop(0, '#047857');
        stemG.addColorStop(0.45, '#34d399');
        stemG.addColorStop(1, '#064e3b');
        tbCtx.strokeStyle = stemG;
        tbCtx.lineWidth = 4.6;
        tbCtx.lineCap = 'round';
        tbCtx.beginPath();
        tbCtx.moveTo(0, ts * 0.26);
        tbCtx.quadraticCurveTo(2, ts * 0.50, 0, ts * 0.72);
        tbCtx.stroke();

        [-1, 1].forEach(dir => {
            tbCtx.save();
            const lGrad = tbCtx.createLinearGradient(0, ts * 0.58, dir * ts * 0.78, -ts * 0.48);
            lGrad.addColorStop(0, '#064e3b');
            lGrad.addColorStop(0.55, '#059669');
            lGrad.addColorStop(0.90, '#34d399');
            lGrad.addColorStop(1, '#a7f3d0');
            tbCtx.fillStyle = lGrad;
            tbCtx.beginPath();
            tbCtx.moveTo(0, ts * 0.58);
            tbCtx.bezierCurveTo(dir * ts * 0.62, ts * 0.42, dir * ts * 0.92, -ts * 0.06, dir * ts * 0.62, -ts * 0.54);
            tbCtx.bezierCurveTo(dir * ts * 0.30, -ts * 0.12, dir * ts * 0.16, ts * 0.26, 0, ts * 0.48);
            tbCtx.closePath();
            tbCtx.fill();
            tbCtx.restore();
        });

        // 3 Cánh Tulip lớp sau (Back Inner Chalice Petals)
        [-0.36, 0, 0.36].forEach((offsetX, idx) => {
            const backG = tbCtx.createLinearGradient(0, ts * 0.1, offsetX * ts, -ts * 1.14);
            backG.addColorStop(0, '#4c0519');
            backG.addColorStop(0.55, '#be123c');
            backG.addColorStop(0.88, '#fb7185');
            backG.addColorStop(1, '#fef08a');
            tbCtx.fillStyle = backG;
            const cx = offsetX * ts * 0.92;
            const topY = idx === 1 ? -ts * 1.14 : -ts * 1.04;
            tbCtx.beginPath();
            tbCtx.moveTo(cx * 0.25, ts * 0.15);
            tbCtx.bezierCurveTo(cx - ts * 0.32, -ts * 0.35, cx - ts * 0.26, -ts * 0.88, cx, topY);
            tbCtx.bezierCurveTo(cx + ts * 0.26, -ts * 0.88, cx + ts * 0.32, -ts * 0.35, cx * 0.25, ts * 0.15);
            tbCtx.closePath();
            tbCtx.fill();
        });

        // Hào quang nhụy phấn vàng ấm bên trong lòng ly Tulip
        const pollenGlow = tbCtx.createRadialGradient(0, -ts * 0.56, 2, 0, -ts * 0.56, ts * 0.40);
        pollenGlow.addColorStop(0, '#fffbeb');
        pollenGlow.addColorStop(0.48, 'rgba(253, 224, 71, 0.78)');
        pollenGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
        tbCtx.fillStyle = pollenGlow;
        tbCtx.beginPath();
        tbCtx.arc(0, -ts * 0.56, ts * 0.40, 0, Math.PI * 2);
        tbCtx.fill();

        // 2 Cánh bên lớp trước (Front Embracing Petals)
        [-1, 1].forEach(dir => {
            const sideG = tbCtx.createLinearGradient(0, ts * 0.38, dir * ts * 0.72, -ts * 0.98);
            sideG.addColorStop(0, '#d97706');
            sideG.addColorStop(0.22, '#9f1239');
            sideG.addColorStop(0.58, '#f43f5e');
            sideG.addColorStop(0.88, '#fecdd3');
            sideG.addColorStop(1, '#fffbeb');
            tbCtx.fillStyle = sideG;
            tbCtx.beginPath();
            tbCtx.moveTo(dir * 2, ts * 0.38);
            tbCtx.bezierCurveTo(dir * ts * 0.86, ts * 0.24, dir * ts * 0.92, -ts * 0.56, dir * ts * 0.42, -ts * 1.0);
            tbCtx.bezierCurveTo(dir * ts * 0.10, -ts * 0.72, dir * ts * 0.04, -ts * 0.15, dir * 2, ts * 0.38);
            tbCtx.closePath();
            tbCtx.fill();
        });

        // Bóng đổ tách lớp dưới cánh chính diện trung tâm
        tbCtx.fillStyle = 'rgba(48, 4, 18, 0.32)';
        tbCtx.beginPath();
        tbCtx.moveTo(0, ts * 0.44);
        tbCtx.bezierCurveTo(-ts * 0.65, ts * 0.26, -ts * 0.66, -ts * 0.66, 0, -ts * 1.08);
        tbCtx.bezierCurveTo(ts * 0.66, -ts * 0.66, ts * 0.65, ts * 0.26, 0, ts * 0.44);
        tbCtx.closePath();
        tbCtx.fill();

        // Cánh chính diện trung tâm (Hero Center Chalice Petal)
        const midG = tbCtx.createLinearGradient(0, ts * 0.42, 0, -ts * 1.10);
        midG.addColorStop(0, '#d97706');
        midG.addColorStop(0.18, '#fbbf24');
        midG.addColorStop(0.45, '#e11d48');
        midG.addColorStop(0.76, '#fb7185');
        midG.addColorStop(0.93, '#ffe4e6');
        midG.addColorStop(1, '#ffffff');
        tbCtx.fillStyle = midG;
        tbCtx.beginPath();
        tbCtx.moveTo(0, ts * 0.42);
        tbCtx.bezierCurveTo(-ts * 0.60, ts * 0.26, -ts * 0.62, -ts * 0.68, 0, -ts * 1.10);
        tbCtx.bezierCurveTo(ts * 0.62, -ts * 0.68, ts * 0.60, ts * 0.26, 0, ts * 0.42);
        tbCtx.closePath();
        tbCtx.fill();

        tbCtx.strokeStyle = 'rgba(255, 251, 235, 0.65)';
        tbCtx.lineWidth = 1.05;
        tbCtx.stroke();

        atlas.tulipBloom = tbC;
        atlas.diamond = tbC;
    }

    // 5E. NƠ LỤA SATIN HOÀNG GIA PHÁP 3D, DẢI LỤA UỐN SÓNG & BÓNG ĐỔ TIẾP XÚC GAUSSIAN MỀM
    {
        // Bóng đổ tiếp xúc Gaussian mềm mại (96x96 — Tuyệt đối không có viền tròn cứng!)
        const { c: csC, ctx: csCtx } = makeCanvas(96, 96);
        const csG = csCtx.createRadialGradient(48, 48, 2, 48, 48, 46);
        csG.addColorStop(0, 'rgba(26, 4, 14, 0.30)');
        csG.addColorStop(0.42, 'rgba(26, 4, 14, 0.14)');
        csG.addColorStop(0.75, 'rgba(26, 4, 14, 0.03)');
        csG.addColorStop(1, 'rgba(26, 4, 14, 0)');
        csCtx.fillStyle = csG;
        csCtx.beginPath();
        csCtx.arc(48, 48, 46, 0, Math.PI * 2);
        csCtx.fill();
        atlas.contactShadow = csC;

        const { c: sbC, ctx: sbCtx } = makeCanvas(188, 168);
        sbCtx.translate(94, 76);
        const bs = 50;

        // Bóng đổ Gaussian mềm dưới chiếc nơ lụa
        sbCtx.drawImage(csC, -bs * 1.1, -bs * 0.45, bs * 2.2, bs * 1.15);

        // Đuôi ruy-băng lụa mềm rủ xuống 2 bên (Swallowtail Silk Ribbons có độ bóng trụ lụa)
        [-1, 1].forEach(dir => {
            sbCtx.save();
            const tailG = sbCtx.createLinearGradient(0, 4, dir * bs * 0.75, bs * 1.25);
            tailG.addColorStop(0, '#590624');
            tailG.addColorStop(0.35, '#be185d');
            tailG.addColorStop(0.68, '#f472b6');
            tailG.addColorStop(0.88, '#fbcfe8');
            tailG.addColorStop(1, '#db2777');
            sbCtx.fillStyle = tailG;
            sbCtx.beginPath();
            sbCtx.moveTo(dir * 4, 6);
            sbCtx.bezierCurveTo(dir * bs * 0.44, bs * 0.45, dir * bs * 0.90, bs * 0.78, dir * bs * 0.74, bs * 1.28);
            sbCtx.lineTo(dir * bs * 0.48, bs * 1.08);
            sbCtx.lineTo(dir * bs * 0.30, bs * 1.24);
            sbCtx.bezierCurveTo(dir * bs * 0.34, bs * 0.75, dir * bs * 0.12, bs * 0.40, 0, 10);
            sbCtx.closePath();
            sbCtx.fill();

            // Viền chỉ vàng kim mảnh dọc mép dải lụa
            sbCtx.strokeStyle = 'rgba(253, 224, 71, 0.72)';
            sbCtx.lineWidth = 1.0;
            sbCtx.stroke();
            sbCtx.restore();
        });

        // 2 Cánh Nơ Lụa Phồng 3D (Có hốc tối bên trong vòng lụa + Ánh phản quang Anisotropic Satin ngang thân nơ!)
        [-1, 1].forEach(dir => {
            sbCtx.save();
            // Hốc bóng tối mặt trong vòng nơ (Interior Loop Hollow) tạo cảm giác dải lụa uốn vòng 3D thật
            sbCtx.fillStyle = '#3b0418';
            sbCtx.beginPath();
            sbCtx.ellipse(dir * bs * 0.62, -bs * 0.18, bs * 0.34, bs * 0.18, dir * -0.18, 0, Math.PI * 2);
            sbCtx.fill();

            // Mặt ngoài cánh nơ phồng có dải phản quang lụa Satin (Cylindrical Anisotropic Highlight)
            const loopG = sbCtx.createLinearGradient(0, -bs * 0.55, dir * bs * 1.15, bs * 0.35);
            loopG.addColorStop(0, '#6b082b');
            loopG.addColorStop(0.28, '#be185d');
            loopG.addColorStop(0.54, '#f472b6');
            loopG.addColorStop(0.72, '#fff1f2'); // Vệt bóng lụa Satin
            loopG.addColorStop(0.88, '#ec4899');
            loopG.addColorStop(1, '#831843');
            sbCtx.fillStyle = loopG;
            sbCtx.beginPath();
            sbCtx.moveTo(0, -2);
            sbCtx.bezierCurveTo(dir * bs * 0.48, -bs * 0.88, dir * bs * 1.28, -bs * 0.56, dir * bs * 1.14, bs * 0.08);
            sbCtx.bezierCurveTo(dir * bs * 0.98, bs * 0.58, dir * bs * 0.38, bs * 0.38, 0, 6);
            sbCtx.closePath();
            sbCtx.fill();

            sbCtx.strokeStyle = 'rgba(254, 240, 138, 0.68)';
            sbCtx.lineWidth = 1.05;
            sbCtx.stroke();

            // Rãnh nếp gấp lụa 3D sâu ở cổ nút thắt
            const pleatG = sbCtx.createLinearGradient(0, 0, dir * bs * 0.75, -bs * 0.08);
            pleatG.addColorStop(0, 'rgba(56, 3, 22, 0.65)');
            pleatG.addColorStop(1, 'rgba(56, 3, 22, 0)');
            sbCtx.strokeStyle = pleatG;
            sbCtx.lineWidth = 2.4;
            sbCtx.beginPath();
            sbCtx.moveTo(dir * 5, 1);
            sbCtx.quadraticCurveTo(dir * bs * 0.45, -bs * 0.18, dir * bs * 0.78, -bs * 0.05);
            sbCtx.stroke();
            sbCtx.restore();
        });

        // Nút thắt lụa trung tâm đính Ngọc Trai Nam Hải 3D
        sbCtx.drawImage(atlas.pearl, -15, -13, 30, 30);
        atlas.silkBow = sbC;

        // 5E-2. Dải Ruy-Băng Lụa Satin Uốn Sóng 3D (160x96 — Thay thế mảng màu phẳng trong hậu cảnh)
        const { c: stC, ctx: stCtx } = makeCanvas(160, 96);
        stCtx.translate(80, 48);
        const sw = 58, sh = 16;
        const sg = stCtx.createLinearGradient(-sw, 0, sw, 0);
        sg.addColorStop(0, '#831843');
        sg.addColorStop(0.28, '#ec4899');
        sg.addColorStop(0.52, '#ffe4e6');
        sg.addColorStop(0.76, '#db2777');
        sg.addColorStop(1, '#9d174d');
        stCtx.fillStyle = sg;
        stCtx.strokeStyle = 'rgba(253, 224, 71, 0.75)';
        stCtx.lineWidth = 1.1;
        stCtx.beginPath();
        stCtx.moveTo(-sw, -sh * 0.5);
        stCtx.bezierCurveTo(-sw * 0.35, -sh * 1.9, sw * 0.35, sh * 1.1, sw, -sh * 0.4);
        stCtx.lineTo(sw * 0.88, sh * 0.6);
        stCtx.bezierCurveTo(sw * 0.30, sh * 2.1, -sw * 0.38, -sh * 0.9, -sw * 0.88, sh * 0.5);
        stCtx.closePath();
        stCtx.fill();
        stCtx.stroke();
        atlas.silkStreamer = stC;
    }

    // 6. BIỂN MÂY 3D CELESTIA BẰNG THUẬT TOÁN PIXEL SHADER 5-OCTAVE FBM NOISE + NORMAL RIM-LIGHTING (280x140)
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
            const ny = (py / H) * 2 - 1;
            for (let px = 0; px < W; px++) {
                const nx = (px / W) * 2 - 1;
                const domeDist = Math.sqrt(nx * nx * 0.92 + Math.pow(ny + 0.08 * (1 - nx * nx), 2) * 1.35);
                if (domeDist >= 1.0) continue;
                const falloff = Math.pow(1 - domeDist, 1.55);

                const u = px * 0.026 + seedOffset;
                const v = py * 0.032 + seedOffset * 0.7;
                const nVal = fbm5Octaves(u, v);
                const density = Math.max(0, Math.min(1, (nVal - 0.28) * 2.25 * falloff));
                if (density <= 0.01) continue;

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

    let _cloudGold = null, _cloudRose = null, _cloudEmerald = null, _cloudAstral = null;
    Object.defineProperties(atlas, {
        cloudGold:    { get() { return _cloudGold    || (_cloudGold    = buildFBMVolumetricCloudSprite([255, 252, 225], [245, 190, 82],  [52, 34, 48],  11.3)); } },
        cloudRose:    { get() { return _cloudRose    || (_cloudRose    = buildFBMVolumetricCloudSprite([255, 235, 245], [228, 105, 158], [28, 22, 46],  27.8)); } },
        cloudEmerald: { get() { return _cloudEmerald || (_cloudEmerald = buildFBMVolumetricCloudSprite([230, 255, 245], [52, 198, 152],  [10, 38, 36],  43.1)); } },
        cloudAstral:  { get() { return _cloudAstral  || (_cloudAstral  = buildFBMVolumetricCloudSprite([255, 244, 230], [244, 132, 152], [44, 18, 36],  64.5)); } }
    });

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

// =================================================================================================
// ĐỘNG CƠ HÌNH HỌC 3D THẬT (TRUE 3D GEOMETRIC MESH & BEZIER SURFACE ENGINE — 60FPS ZERO-LAG)
// - Mỗi cánh hoa, đoá hoa đa tầng, cánh hồ điệp, nơ lụa Satin, dải ruy-băng xoắn và mảnh sáp vỡ
//   đều có toạ độ đỉnh 3D (x, y, z), ma trận xoay 3 chiều (rx, ry, rz), phép chiếu phối cảnh 3D,
//   vector pháp tuyến mặt cong N = (nx, ny, nz) tính ánh sáng thực theo hướng nguồn sáng L_DIR,
//   phân biệt rõ Mặt Trước (Ventral) / Mặt Lưng (Dorsal) và sắp xếp chiều sâu Z-Buffer (Painter's Algorithm)!
// =================================================================================================
const U3D_L_DIR = [-0.38, -0.62, 0.69]; // Nguồn sáng chính Studio (trên - trái - trước)

const U3D_BOTANICAL_PALETTES = {
    camellia: {
        ao: [52, 4, 22],
        base: [148, 14, 62],
        mid: [224, 38, 98],
        tip: [250, 142, 180],
        rim: [255, 240, 246],
        backAo: [42, 4, 18],
        backBase: [118, 12, 50],
        backTip: [218, 86, 132],
        vein: '255, 232, 240',
        sepal0: '#043927',
        sepal1: '#059669',
        sepal2: '#6ee7b7',
        stamenBase: '#d97706',
        stamenTip: '#fef08a',
        anther: '#fffbeb'
    },
    rose: {
        ao: [38, 2, 12],
        base: [122, 10, 42],
        mid: [196, 18, 62],
        tip: [248, 92, 122],
        rim: [255, 230, 236],
        backAo: [30, 2, 10],
        backBase: [96, 8, 34],
        backTip: [188, 32, 74],
        vein: '255, 218, 226',
        sepal0: '#032e22',
        sepal1: '#047857',
        sepal2: '#6ee7b7',
        stamenBase: '#b45309',
        stamenTip: '#fde047',
        anther: '#fffbeb'
    },
    sakura: {
        ao: [138, 18, 68],
        base: [216, 62, 124],
        mid: [248, 152, 194],
        tip: [253, 218, 236],
        rim: [255, 250, 253],
        backAo: [116, 14, 58],
        backBase: [192, 52, 110],
        backTip: [244, 168, 204],
        vein: '255, 245, 250',
        sepal0: '#4a0420',
        sepal1: '#831843',
        sepal2: '#be185d',
        stamenBase: '#db2777',
        stamenTip: '#fde047',
        anther: '#fef9c3'
    },
    tulip: {
        ao: [168, 58, 8],
        base: [225, 29, 72],
        mid: [251, 113, 133],
        tip: [254, 215, 170],
        rim: [255, 251, 235],
        backAo: [124, 18, 42],
        backBase: [190, 24, 64],
        backTip: [253, 186, 116],
        vein: '255, 248, 225',
        sepal0: '#064e3b',
        sepal1: '#10b981',
        sepal2: '#a7f3d0',
        stamenBase: '#b45309',
        stamenTip: '#fde047',
        anther: '#fffbeb'
    }
};

function u3dMixRgb(c1, c2, t) {
    const u = t < 0 ? 0 : (t > 1 ? 1 : t);
    const r = (c1[0] + (c2[0] - c1[0]) * u) | 0;
    const g = (c1[1] + (c2[1] - c1[1]) * u) | 0;
    const b = (c1[2] + (c2[2] - c1[2]) * u) | 0;
    return `rgb(${r},${g},${b})`;
}

// Bảng tra màu sắc tiền tính toán (Pre-computed Shading LUT) — Loại bỏ 100% cấp phát chuỗi rgb(...) trong vòng lặp 60fps
const _U3D_SHADE_LUT = (() => {
    const lut = {};
    const keys = Object.keys(U3D_BOTANICAL_PALETTES);
    for (let k = 0; k < keys.length; k++) {
        const palKey = keys[k];
        const pal = U3D_BOTANICAL_PALETTES[palKey];
        const isTulip = palKey === 'tulip';
        const front = [[], [], []];
        const back = [];
        for (let li = 0; li < 3; li++) {
            const c0 = u3dMixRgb(pal.ao, pal.base, isTulip ? 0.58 : (0.18 + li * 0.14));
            for (let b = 0; b <= 10; b++) {
                const lVal = Math.min(1, (b / 10) + li * 0.10);
                front[li].push({
                    c0,
                    c1: u3dMixRgb(pal.base, pal.mid, lVal * 0.85),
                    c2: u3dMixRgb(pal.mid, pal.tip, 0.42 + lVal * 0.52),
                    c3: u3dMixRgb(pal.tip, pal.rim, 0.55 + lVal * 0.45)
                });
            }
        }
        const bc0 = u3dMixRgb(pal.backAo, pal.backBase, isTulip ? 0.65 : 0.30);
        const bc3 = u3dMixRgb(pal.tip, pal.rim, 0.72);
        for (let b = 0; b <= 10; b++) {
            const lVal = b / 10;
            back.push({
                c0: bc0,
                c1: u3dMixRgb(pal.backBase, pal.backTip, lVal * 0.88),
                c2: u3dMixRgb(pal.backTip, pal.tip, 0.55 + lVal * 0.40),
                c3: bc3
            });
        }
        lut[palKey] = { front, back, veinStroke: `rgba(${pal.vein}, 0.24)` };
    }
    return lut;
})();

// Bộ đệm tái sử dụng (Zero Heap Allocation) cho phép chiếu 3D của từng đoá hoa / vật thể
const _u3dMat = { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0, m20: 0, m21: 0, m22: 1, fov: 220 };
function u3dSetMatrix(rx, ry, rz, fov) {
    const cx = Math.cos(rx), sx = Math.sin(rx);
    const cy = Math.cos(ry), sy = Math.sin(ry);
    const cz = Math.cos(rz), sz = Math.sin(rz);
    _u3dMat.m00 = cy * cz;
    _u3dMat.m01 = sx * sy * cz - cx * sz;
    _u3dMat.m02 = cx * sy * cz + sx * sz;
    _u3dMat.m10 = cy * sz;
    _u3dMat.m11 = sx * sy * sz + cx * cz;
    _u3dMat.m12 = cx * sy * sz - sx * cz;
    _u3dMat.m20 = -sy;
    _u3dMat.m21 = sx * cy;
    _u3dMat.m22 = cx * cy;
    _u3dMat.fov = fov;
}

function u3dProj(x, y, z, out) {
    const M = _u3dMat;
    const X = M.m00 * x + M.m01 * y + M.m02 * z;
    const Y = M.m10 * x + M.m11 * y + M.m12 * z;
    const Z = M.m20 * x + M.m21 * y + M.m22 * z;
    const k = M.fov / Math.max(M.fov * 0.36, M.fov - Z);
    out.x = X * k;
    out.y = Y * k;
    out.z = Z;
    out.k = k;
}

const _P0 = { x: 0, y: 0, z: 0, k: 1 };
const _P1 = { x: 0, y: 0, z: 0, k: 1 };
const _P2 = { x: 0, y: 0, z: 0, k: 1 };
const _P3 = { x: 0, y: 0, z: 0, k: 1 };
const _P4 = { x: 0, y: 0, z: 0, k: 1 };
const _P5 = { x: 0, y: 0, z: 0, k: 1 };
const _P6 = { x: 0, y: 0, z: 0, k: 1 };
const _PTL = { x: 0, y: 0, z: 0, k: 1 };
const _PTR = { x: 0, y: 0, z: 0, k: 1 };
const _PM = { x: 0, y: 0, z: 0, k: 1 };

// 1. CÁNH HOA 3D CONG KHUM LÒNG CHẢO & UỐN MÉP TRONG KHÔNG GIAN 3 CHIỀU (TRUE 3D CUPPED BEZIER PETAL — ZERO CLIP / ZERO ALLOC)
// Có sống lưng (Midrib Belly) cong lồi về -Z và hai mép cánh (Lateral Flanks) khum lên về +Z,
// giúp khi cánh hoa xoay nghiêng 90° vẫn thấy rõ bụng cánh cong 3D và lòng cánh trũng sâu (không bao giờ bị bẹp thành vạch phẳng!)
function drawTrue3DPetal(ctx, petalKind, s, rx, ry, rz) {
    if (s < 1.2) return;
    const palKey = U3D_BOTANICAL_PALETTES[petalKind] ? petalKind : 'camellia';
    const shadeLut = _U3D_SHADE_LUT[palKey];
    const isSakura = palKey === 'sakura';
    const isRose = palKey === 'rose';
    const isTulip = palKey === 'tulip';

    u3dSetMatrix(rx, ry, rz, Math.max(85, s * 3.8));
    const M = _u3dMat;

    const w = s * (isRose ? 0.98 : (isTulip ? 0.76 : 0.88));
    const cupZ = s * (isRose ? 0.36 : (isTulip ? 0.34 : 0.28));
    const bellyZ = -s * (isRose ? 0.32 : (isTulip ? 0.30 : 0.26));
    const tipZ = s * (isRose ? -0.14 : 0.22);

    // Chiếu các điểm điều khiển 3D của mặt cong cánh hoa
    u3dProj(0, s * 0.48, -s * 0.04, _P0);           // Gốc cánh
    u3dProj(0, -s * 0.14, bellyZ, _PM);             // Sống lưng bụng cánh cong sâu trong 3D
    u3dProj(-w * 0.86, s * 0.10, cupZ * 0.85, _P1); // Bụng dưới trái
    u3dProj(-w * 0.95, -s * 0.64, cupZ, _P2);       // Vai trên trái
    u3dProj(w * 0.95, -s * 0.64, cupZ, _P4);        // Vai trên phải
    u3dProj(w * 0.86, s * 0.10, cupZ * 0.85, _P5);  // Bụng dưới phải

    if (isSakura) {
        u3dProj(-w * 0.28, -s * 1.02, tipZ, _PTL);
        u3dProj(0, -s * 0.72, tipZ * 0.5, _P3);
        u3dProj(w * 0.28, -s * 1.02, tipZ, _PTR);
    } else {
        u3dProj(0, -s * 0.98, tipZ, _P3);
    }

    // Pháp tuyến 3D của tâm cánh hoa và tra cứu bảng màu tiền tính toán (Zero string allocation)
    const nx = M.m02, ny = M.m12, nz = M.m22;
    const isFrontFace = nz >= -0.05;
    const ndl = Math.max(0, Math.min(1, 0.52 + 0.48 * (nx * U3D_L_DIR[0] + ny * U3D_L_DIR[1] + nz * U3D_L_DIR[2])));
    const bucket = Math.min(10, Math.max(0, (ndl * 10 + 0.5) | 0));
    const backStops = shadeLut.back[bucket];
    const stops = isFrontFace ? shadeLut.front[1][bucket] : backStops;

    // A. Khi cánh hoa nghiêng 3D, sống lưng _PM nhô ra ngoài tạo đường cong bụng cánh 3D thật (Dorsal Belly Volume)
    if (Math.abs(M.m20) > 0.16 || Math.abs(M.m21) > 0.16) {
        const nearLeft = (_P1.z + _P2.z) >= (_P5.z + _P4.z);
        ctx.beginPath();
        ctx.moveTo(_P0.x, _P0.y);
        ctx.quadraticCurveTo(_PM.x, _PM.y, _P3.x, _P3.y);
        if (nearLeft) {
            ctx.bezierCurveTo(_P2.x, _P2.y, _P1.x, _P1.y, _P0.x, _P0.y);
        } else {
            ctx.bezierCurveTo(_P4.x, _P4.y, _P5.x, _P5.y, _P0.x, _P0.y);
        }
        ctx.closePath();
        ctx.fillStyle = backStops.c1;
        ctx.fill();
    }

    // B. Dựng đường bao Bezier 3D chính 1 LẦN DUY NHẤT (Dùng chung cho cả fill mặt cánh, bóng khum & viền Fresnel — Không dùng ctx.clip!)
    ctx.beginPath();
    ctx.moveTo(_P0.x, _P0.y);
    if (isSakura) {
        ctx.bezierCurveTo(_P1.x, _P1.y, _P2.x, _P2.y, _PTL.x, _PTL.y);
        ctx.lineTo(_P3.x, _P3.y);
        ctx.lineTo(_PTR.x, _PTR.y);
        ctx.bezierCurveTo(_P4.x, _P4.y, _P5.x, _P5.y, _P0.x, _P0.y);
    } else {
        ctx.bezierCurveTo(_P1.x, _P1.y, _P2.x, _P2.y, _P3.x, _P3.y);
        ctx.bezierCurveTo(_P4.x, _P4.y, _P5.x, _P5.y, _P0.x, _P0.y);
    }
    ctx.closePath();

    const pg = ctx.createLinearGradient(_P0.x, _P0.y, _P3.x, _P3.y);
    pg.addColorStop(0.00, stops.c0);
    if (s > 10) {
        pg.addColorStop(0.35, stops.c1);
        pg.addColorStop(0.74, stops.c2);
    } else {
        pg.addColorStop(0.55, stops.c2);
    }
    pg.addColorStop(1.00, stops.c3);
    ctx.fillStyle = pg;
    ctx.fill();

    // C. Viền khối & Mép cánh uốn cong bắt sáng Fresnel 3D trực tiếp trên path hiện hành (Zero path rebuild)
    if (s > 7) {
        ctx.strokeStyle = 'rgba(38, 3, 18, 0.34)';
        ctx.lineWidth = Math.max(0.75, s * 0.068);
        ctx.stroke();
    }
    ctx.strokeStyle = isFrontFace ? 'rgba(255, 245, 248, 0.62)' : 'rgba(255, 228, 236, 0.42)';
    ctx.lineWidth = Math.max(0.45, s * 0.036);
    ctx.stroke();

    // D. Gân lụa sinh học gộp thành 1 lệnh stroke duy nhất (Chỉ vẽ trên cánh đủ lớn s > 9.5)
    if (s > 9.5) {
        ctx.strokeStyle = shadeLut.veinStroke;
        ctx.lineWidth = Math.max(0.5, s * 0.045);
        ctx.beginPath();
        for (let v = -1; v <= 1; v++) {
            const av = Math.abs(v);
            const cx = _PM.x + (v < 0 ? (_P1.x - _PM.x) : (_P5.x - _PM.x)) * av * 0.48;
            const cy = _PM.y + (v < 0 ? (_P1.y - _PM.y) : (_P5.y - _PM.y)) * av * 0.48;
            const ex = _P3.x + (v < 0 ? (_P2.x - _P3.x) : (_P4.x - _P3.x)) * av * 0.55;
            const ey = _P3.y + (v < 0 ? (_P2.y - _P3.y) : (_P4.y - _P3.y)) * av * 0.55;
            ctx.moveTo(_P0.x, _P0.y);
            ctx.quadraticCurveTo(cx, cy, ex, ey);
        }
        ctx.stroke();
    }
}

// 2. ĐẠI ĐOÁ HOA 3D ĐA TẦNG CÓ SẮP XẾP CHIỀU SÂU Z-BUFFER & TỰ CHE KHUẤT VẬT LÝ (TRUE 3D MULTI-TIER FLOWER ENGINE)
// Hỗ trợ: 'camellia' (Đại Hoa Trà), 'rose' (Hồng Nhung Pháp), 'rose_bud' (Nụ Hồng Pháp 3D), 'sakura' (Anh Đào Kyoto), 'tulip' (Tulip Hà Lan)
const _f3dQueue = [];
const _f3dPool = [];
let _f3dPoolIdx = 0;

function _f3dAlloc() {
    if (_f3dPoolIdx < _f3dPool.length) {
        return _f3dPool[_f3dPoolIdx++];
    }
    const obj = {
        kind: '', key: 0, li: 0, isFrontFace: true, ndl: 0,
        x0: 0, y0: 0, x1: 0, y1: 0, x2: 0, y2: 0, w: 0,
        bx: 0, by: 0, lx: 0, ly: 0, tx: 0, ty: 0, rx: 0, ry: 0, mx: 0, my: 0,
        p0x: 0, p0y: 0, p1x: 0, p1y: 0, p2x: 0, p2y: 0, p3x: 0, p3y: 0,
        tlx: 0, tly: 0, trx: 0, try: 0, p4x: 0, p4y: 0, p5x: 0, p5y: 0, p6x: 0, p6y: 0,
        x: 0, y: 0, r: 0, k: 1
    };
    _f3dPool.push(obj);
    _f3dPoolIdx++;
    return obj;
}

function drawTrue3DFlower(ctx, flowerKind, s, rx, ry, rz, openAmt = 1.0) {
    if (s < 1.8) return;
    _f3dQueue.length = 0;
    _f3dPoolIdx = 0;

    const isTulip = flowerKind === 'tulip';
    const isBud = flowerKind === 'rose_bud';
    const isSakura = flowerKind === 'sakura';
    const isRose = flowerKind === 'rose' || isBud;
    const palKey = isTulip ? 'tulip' : (isRose ? 'rose' : (isSakura ? 'sakura' : 'camellia'));
    const pal = U3D_BOTANICAL_PALETTES[palKey];
    const shadeLut = _U3D_SHADE_LUT[palKey];

    // Thiết lập góc nhìn 3D:
    // - Với Hoa Trà / Hồng Pháp / Anh Đào: Trục hoa là +Z, luôn giữ góc nghiêng phối cảnh 3D (32°..58°) xoay quanh trục để thấy rõ cả độ sâu lòng chén hoa, đài hoa phía dưới, lẫn các cánh tiền cảnh che khuất nhụy!
    // - Với Hoa Tulip / Nụ Hồng: Trục hoa là -Y (vươn lên), nghiêng nhẹ miệng đài hoa về phía người xem (22°..34°) và xoay 3D quanh trục thân hoa!
    if (isTulip || isBud) {
        const pitch = 0.36 + 0.18 * Math.sin(rx * 1.4);
        const yaw = ry * 1.35 + rz * 0.5;
        const roll = Math.sin(rz) * 0.22;
        u3dSetMatrix(pitch, yaw, roll, Math.max(110, s * 4.2));
    } else {
        const tiltMag = 0.62 + 0.24 * Math.sin(rx * 1.2); // 35° .. 49° nghiêng 3D thật
        const tiltDir = ry * 1.15;
        const spin = rz;
        const pitch = Math.cos(tiltDir) * tiltMag;
        const yaw = Math.sin(tiltDir) * tiltMag;
        u3dSetMatrix(pitch, yaw, spin, Math.max(110, s * 4.0));
    }
    const M = _u3dMat;

    // Hàm chiếu điểm cánh hoa theo hệ trục của hoa:
    // - Upright mode (Tulip / Rosebud): trục vươn lên là -Y, mặt phẳng toả tròn là (X, Z)
    // - Radial dome mode (Camellia / Rose / Sakura): trục nở là +Z, mặt phẳng toả tròn là (X, Y)
    const evalFlowerPt = (cp, sp, rad, lat, hAxis, out) => {
        const rxLat = -sp * lat;
        const rzLat = cp * lat;
        if (isTulip || isBud) {
            u3dProj(cp * rad + rxLat, -hAxis, sp * rad + rzLat, out);
        } else {
            u3dProj(cp * rad + rxLat, sp * rad + rzLat, hAxis, out);
        }
    };

    // 2A. CUỐNG HOA 3D, LÁ LỤA UỐN CONG & ĐÀI HOA NGỌC LỤC BẢO (3D Stem, Leaves & Calyx Sepals)
    if (isTulip || isBud) {
        const stemTopH = -s * 0.22;
        const stemBotH = -s * (isTulip ? 0.92 : 0.86);
        u3dProj(0, -stemTopH, 0, _P0);
        u3dProj(s * 0.05, -(stemTopH + stemBotH) * 0.5, -s * 0.04, _P1);
        u3dProj(0, -stemBotH, 0, _P2);
        const stItem = _f3dAlloc();
        stItem.kind = 'stem';
        stItem.key = Math.min(_P0.z, _P2.z) - s * 0.25;
        stItem.x0 = _P0.x; stItem.y0 = _P0.y;
        stItem.x1 = _P1.x; stItem.y1 = _P1.y;
        stItem.x2 = _P2.x; stItem.y2 = _P2.y;
        stItem.w = Math.max(1.8, s * 0.11 * _P0.k);
        _f3dQueue.push(stItem);

        if (isTulip) {
            // 2 Lá Tulip 3D uốn vòm từ chân cuống ôm lên hai bên bầu hoa
            for (let l = 0; l < 2; l++) {
                const lAz = l * Math.PI + 0.35;
                const cp = Math.cos(lAz), sp = Math.sin(lAz);
                evalFlowerPt(cp, sp, s * 0.06, 0, -s * 0.78, _P0);
                evalFlowerPt(cp, sp, s * 0.58, -s * 0.16, -s * 0.18, _P1);
                evalFlowerPt(cp, sp, s * 0.52, 0, s * 0.36, _P2);
                evalFlowerPt(cp, sp, s * 0.58, s * 0.16, -s * 0.18, _P3);
                const spItem = _f3dAlloc();
                spItem.kind = 'sepal';
                spItem.key = (_P1.z + _P2.z) * 0.5 - s * 0.08;
                spItem.bx = _P0.x; spItem.by = _P0.y;
                spItem.lx = _P1.x; spItem.ly = _P1.y;
                spItem.tx = _P2.x; spItem.ty = _P2.y;
                spItem.rx = _P3.x; spItem.ry = _P3.y;
                _f3dQueue.push(spItem);
            }
        } else {
            // 3 Đài lá ngọc lục bảo ôm bầu Nụ Hồng 3D
            for (let l = 0; l < 3; l++) {
                const lAz = (l / 3) * Math.PI * 2 + 0.4;
                const cp = Math.cos(lAz), sp = Math.sin(lAz);
                evalFlowerPt(cp, sp, s * 0.08, 0, -s * 0.26, _P0);
                evalFlowerPt(cp, sp, s * 0.42, -s * 0.14, -s * 0.04, _P1);
                evalFlowerPt(cp, sp, s * 0.48, 0, s * 0.28, _P2);
                evalFlowerPt(cp, sp, s * 0.42, s * 0.14, -s * 0.04, _P3);
                const spItem = _f3dAlloc();
                spItem.kind = 'sepal';
                spItem.key = (_P1.z + _P2.z) * 0.5 - s * 0.05;
                spItem.bx = _P0.x; spItem.by = _P0.y;
                spItem.lx = _P1.x; spItem.ly = _P1.y;
                spItem.tx = _P2.x; spItem.ty = _P2.y;
                spItem.rx = _P3.x; spItem.ry = _P3.y;
                _f3dQueue.push(spItem);
            }
        }
    } else {
        // Đài lá 3D phía dưới đáy Hoa Trà / Hồng Pháp / Anh Đào
        const sepalCount = isSakura ? 5 : 4;
        const sLen = s * (isSakura ? 0.62 : 1.08);
        const sWid = s * (isSakura ? 0.22 : 0.36);
        for (let l = 0; l < sepalCount; l++) {
            const lAz = (l / sepalCount) * Math.PI * 2 + 0.38;
            const cp = Math.cos(lAz), sp = Math.sin(lAz);
            evalFlowerPt(cp, sp, s * 0.10, 0, -s * 0.18, _P0);
            evalFlowerPt(cp, sp, sLen * 0.58, -sWid, -s * 0.12, _P1);
            evalFlowerPt(cp, sp, sLen, 0, -s * 0.04, _P2);
            evalFlowerPt(cp, sp, sLen * 0.58, sWid, -s * 0.12, _P3);
            const spItem = _f3dAlloc();
            spItem.kind = 'sepal';
            spItem.key = (_P0.z + _P2.z) * 0.5 - s * 0.32;
            spItem.bx = _P0.x; spItem.by = _P0.y;
            spItem.lx = _P1.x; spItem.ly = _P1.y;
            spItem.tx = _P2.x; spItem.ty = _P2.y;
            spItem.rx = _P3.x; spItem.ry = _P3.y;
            _f3dQueue.push(spItem);
        }
    }

    // 2B. CÁC TẦNG CÁNH HOA 3D CONG BEZIER LỒNG NHAU (Nested 3D Cylindrical/Chalice Shells)
    let tiers;
    if (isTulip) {
        tiers = [
            { count: 3, rb: 0.14, len: 1.08, wid: 0.68, theta: 0.42 * openAmt, cup: 0.46, curl: -0.24, zBase: -0.22, rotOff: 0, li: 0 },
            { count: 3, rb: 0.10, len: 1.02, wid: 0.62, theta: 0.32 * openAmt, cup: 0.48, curl: -0.28, zBase: -0.18, rotOff: Math.PI / 3, li: 1 }
        ];
    } else if (isBud) {
        tiers = [
            { count: 3, rb: 0.12, len: 0.96, wid: 0.68, theta: 0.52 * openAmt, cup: 0.44, curl: 0.18, zBase: -0.20, rotOff: 0, li: 0 },
            { count: 4, rb: 0.06, len: 0.92, wid: 0.56, theta: 0.22 * openAmt, cup: 0.52, curl: -0.18, zBase: -0.14, rotOff: 0.65, li: 1 }
        ];
    } else if (isSakura) {
        tiers = [
            { count: 5, rb: 0.10, len: 0.96, wid: 0.72, theta: 1.06 * openAmt, cup: 0.32, curl: -0.16, zBase: -0.06, rotOff: 0, li: 0 },
            { count: 5, rb: 0.06, len: 0.70, wid: 0.56, theta: 0.68 * openAmt, cup: 0.36, curl: -0.20, zBase: 0.06, rotOff: Math.PI / 5, li: 1 }
        ];
    } else if (isRose) {
        tiers = s < 21 ? [
            { count: 6, rb: 0.14, len: 0.96, wid: 0.84, theta: 1.15 * openAmt, cup: 0.38, curl: 0.20, zBase: -0.08, rotOff: 0, li: 0 },
            { count: 5, rb: 0.08, len: 0.68, wid: 0.64, theta: 0.58 * openAmt, cup: 0.46, curl: -0.18, zBase: 0.06, rotOff: 0.52, li: 1 }
        ] : [
            { count: 7, rb: 0.15, len: 0.98, wid: 0.86, theta: 1.18 * openAmt, cup: 0.36, curl: 0.22, zBase: -0.10, rotOff: 0, li: 0 },
            { count: 6, rb: 0.10, len: 0.76, wid: 0.70, theta: 0.76 * openAmt, cup: 0.44, curl: 0.12, zBase: 0.02, rotOff: 0.42, li: 1 },
            { count: 5, rb: 0.05, len: 0.52, wid: 0.50, theta: 0.36 * openAmt, cup: 0.52, curl: -0.24, zBase: 0.12, rotOff: 0.95, li: 2 }
        ];
    } else {
        tiers = s < 21 ? [
            { count: 6, rb: 0.14, len: 0.96, wid: 0.76, theta: 1.16 * openAmt, cup: 0.34, curl: -0.16, zBase: -0.08, rotOff: 0, li: 0 },
            { count: 5, rb: 0.08, len: 0.66, wid: 0.56, theta: 0.62 * openAmt, cup: 0.38, curl: -0.22, zBase: 0.06, rotOff: 0.55, li: 1 }
        ] : [
            { count: 7, rb: 0.14, len: 0.98, wid: 0.78, theta: 1.18 * openAmt, cup: 0.32, curl: -0.14, zBase: -0.10, rotOff: 0, li: 0 },
            { count: 6, rb: 0.10, len: 0.76, wid: 0.64, theta: 0.78 * openAmt, cup: 0.38, curl: -0.20, zBase: 0.02, rotOff: 0.45, li: 1 },
            { count: 5, rb: 0.05, len: 0.52, wid: 0.46, theta: 0.42 * openAmt, cup: 0.42, curl: -0.24, zBase: 0.12, rotOff: 0.92, li: 2 }
        ];
    }

    const evalTierPetalPt = (t, cp, sp, u, v, out) => {
        const bellyArch = Math.sin(u * Math.PI) * 0.22;
        const localTheta = Math.max(0.06, t.theta + bellyArch + t.curl * u * u);
        const sa = Math.sin(localTheta), ca = Math.cos(localTheta);
        const sDist = u * t.len * s;
        const shapeProfile = Math.sin(Math.pow(u, 0.62) * Math.PI * 0.88);
        const halfW = t.wid * 0.5 * s * shapeProfile;
        const cupLift = (v * v) * halfW * t.cup * Math.sin(u * Math.PI * 0.92);
        const lat = v * halfW * (1 - 0.12 * t.cup * v * v);
        const rad = t.rb * s + sa * sDist - ca * cupLift;
        const hAxis = t.zBase * s + ca * sDist + sa * cupLift;
        evalFlowerPt(cp, sp, rad, lat, hAxis, out);
    };

    for (let ti = 0; ti < tiers.length; ti++) {
        const t = tiers[ti];
        for (let i = 0; i < t.count; i++) {
            const phi = (i / t.count) * Math.PI * 2 + t.rotOff;
            const cp = Math.cos(phi), sp = Math.sin(phi);

            evalTierPetalPt(t, cp, sp, 0.00,  0.00, _P0);
            evalTierPetalPt(t, cp, sp, 0.34, -0.94, _P1);
            evalTierPetalPt(t, cp, sp, 0.82, -0.88, _P2);
            evalTierPetalPt(t, cp, sp, 0.82,  0.88, _P4);
            evalTierPetalPt(t, cp, sp, 0.34,  0.94, _P5);
            evalTierPetalPt(t, cp, sp, 0.54,  0.00, _P6);

            if (isSakura) {
                evalTierPetalPt(t, cp, sp, 0.98, -0.34, _PTL);
                evalTierPetalPt(t, cp, sp, 0.78,  0.00, _P3);
                evalTierPetalPt(t, cp, sp, 0.98,  0.34, _PTR);
            } else {
                evalTierPetalPt(t, cp, sp, 1.00,  0.00, _P3);
            }

            const midTheta = t.theta + 0.18;
            const sa = Math.sin(midTheta), ca = Math.cos(midTheta);
            let lnx, lny, lnz;
            if (isTulip || isBud) {
                lnx = -ca * cp; lny = -sa; lnz = -ca * sp;
            } else {
                lnx = -ca * cp; lny = -ca * sp; lnz = sa;
            }
            const NX = M.m00 * lnx + M.m01 * lny + M.m02 * lnz;
            const NY = M.m10 * lnx + M.m11 * lny + M.m12 * lnz;
            const NZ = M.m20 * lnx + M.m21 * lny + M.m22 * lnz;

            const isFrontFace = NZ >= -0.08;
            const ndl = Math.max(0, Math.min(1, 0.50 + 0.50 * (NX * U3D_L_DIR[0] + NY * U3D_L_DIR[1] + NZ * U3D_L_DIR[2])));

            const zKey = (_P6.z * 0.65 + _P3.z * 0.35) + (t.li * s * 0.04 * (NZ >= 0 ? 1 : -1));

            const pItem = _f3dAlloc();
            pItem.kind = 'petal';
            pItem.key = zKey;
            pItem.li = t.li;
            pItem.isFrontFace = isFrontFace;
            pItem.ndl = ndl;
            pItem.p0x = _P0.x; pItem.p0y = _P0.y;
            pItem.p1x = _P1.x; pItem.p1y = _P1.y;
            pItem.p2x = _P2.x; pItem.p2y = _P2.y;
            pItem.p3x = _P3.x; pItem.p3y = _P3.y;
            pItem.tlx = _PTL.x; pItem.tly = _PTL.y;
            pItem.trx = _PTR.x; pItem.try = _PTR.y;
            pItem.p4x = _P4.x; pItem.p4y = _P4.y;
            pItem.p5x = _P5.x; pItem.p5y = _P5.y;
            pItem.p6x = _P6.x; pItem.p6y = _P6.y;
            pItem.k = _P6.k;
            _f3dQueue.push(pItem);
        }
    }

    // 2C. ĐẾ NHỤY & VƯƠNG MIỆN SỢI NHỤY VÀNG 3D VƯƠN LÊN TỪ LÒNG CHÉN HOA (3D Receptacle & Filaments)
    if (!isBud) {
        const coreH = (isTulip ? 0.05 : 0.16) * s;
        evalFlowerPt(1, 0, 0, 0, coreH, _P0);
        const cItem = _f3dAlloc();
        cItem.kind = 'core';
        cItem.key = _P0.z;
        cItem.x = _P0.x;
        cItem.y = _P0.y;
        cItem.r = Math.max(2.2, s * (isTulip ? 0.22 : (isSakura ? 0.16 : 0.20)) * _P0.k);
        _f3dQueue.push(cItem);

        const stCount = s < 20 ? 5 : (isSakura ? 8 : (isTulip ? 5 : 7));
        const stSpread = isSakura ? 0.56 : (isTulip ? 0.22 : 0.38);
        const stLen = s * (isSakura ? 0.52 : (isTulip ? 0.46 : 0.36));
        for (let st = 0; st < stCount; st++) {
            const sa = (st / stCount) * Math.PI * 2 + 0.2;
            const cp = Math.cos(sa), sp = Math.sin(sa);
            const rBase = s * 0.08;
            const rTip = rBase + Math.sin(stSpread) * stLen;
            const hTip = coreH + Math.cos(stSpread) * stLen;
            evalFlowerPt(cp, sp, rBase, 0, coreH, _P0);
            evalFlowerPt(cp, sp, (rBase + rTip) * 0.5, 0, (coreH + hTip) * 0.54, _P1);
            evalFlowerPt(cp, sp, rTip, 0, hTip, _P2);
            const smItem = _f3dAlloc();
            smItem.kind = 'stamen';
            smItem.key = (_P0.z + _P2.z) * 0.5 + s * 0.02;
            smItem.bx = _P0.x; smItem.by = _P0.y;
            smItem.mx = _P1.x; smItem.my = _P1.y;
            smItem.tx = _P2.x; smItem.ty = _P2.y;
            smItem.k = _P2.k;
            _f3dQueue.push(smItem);
        }
    }

    // Sắp xếp Z-Buffer từ xa nhất (Z nhỏ nhất) tới gần ống kính nhất (Z lớn nhất)
    _f3dQueue.sort((a, b) => a.key - b.key);

    // Kết xuất toàn bộ cấu trúc 3D của đoá hoa (Single-pass Bezier tracing + Adaptive LOD)
    const isHighDetail = s > 20;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (let i = 0; i < _f3dQueue.length; i++) {
        const it = _f3dQueue[i];
        if (it.kind === 'stem') {
            ctx.strokeStyle = pal.sepal0;
            ctx.lineWidth = it.w;
            ctx.beginPath();
            ctx.moveTo(it.x0, it.y0);
            ctx.quadraticCurveTo(it.x1, it.y1, it.x2, it.y2);
            ctx.stroke();

            ctx.strokeStyle = pal.sepal1;
            ctx.lineWidth = it.w * 0.68;
            ctx.stroke();

            if (isHighDetail) {
                ctx.strokeStyle = pal.sepal2;
                ctx.lineWidth = it.w * 0.28;
                ctx.stroke();
            }
        } else if (it.kind === 'sepal') {
            if (isHighDetail) {
                const sg = ctx.createLinearGradient(it.bx, it.by, it.tx, it.ty);
                sg.addColorStop(0, pal.sepal0);
                sg.addColorStop(0.58, pal.sepal1);
                sg.addColorStop(1, pal.sepal2);
                ctx.fillStyle = sg;
            } else {
                ctx.fillStyle = pal.sepal1;
            }
            ctx.beginPath();
            ctx.moveTo(it.bx, it.by);
            ctx.quadraticCurveTo(it.lx, it.ly, it.tx, it.ty);
            ctx.quadraticCurveTo(it.rx, it.ry, it.bx, it.by);
            ctx.closePath();
            ctx.fill();
            if (isHighDetail) {
                ctx.strokeStyle = 'rgba(209, 250, 229, 0.42)';
                ctx.lineWidth = Math.max(0.5, s * 0.035);
                ctx.stroke();
            }
        } else if (it.kind === 'petal') {
            ctx.beginPath();
            ctx.moveTo(it.p0x, it.p0y);
            if (isSakura) {
                ctx.bezierCurveTo(it.p1x, it.p1y, it.p2x, it.p2y, it.tlx, it.tly);
                ctx.lineTo(it.p3x, it.p3y);
                ctx.lineTo(it.trx, it.try);
                ctx.bezierCurveTo(it.p4x, it.p4y, it.p5x, it.p5y, it.p0x, it.p0y);
            } else {
                ctx.bezierCurveTo(it.p1x, it.p1y, it.p2x, it.p2y, it.p3x, it.p3y);
                ctx.bezierCurveTo(it.p4x, it.p4y, it.p5x, it.p5y, it.p0x, it.p0y);
            }
            ctx.closePath();

            const bucket = Math.min(10, Math.max(0, (it.ndl * 10 + 0.5) | 0));
            const stops = it.isFrontFace ? shadeLut.front[it.li][bucket] : shadeLut.back[bucket];
            const pg = ctx.createLinearGradient(it.p0x, it.p0y, it.p3x, it.p3y);
            if (isHighDetail) {
                pg.addColorStop(0.00, stops.c0);
                pg.addColorStop(0.42, stops.c1);
                pg.addColorStop(0.80, stops.c2);
                pg.addColorStop(1.00, stops.c3);
            } else {
                pg.addColorStop(0.00, stops.c0);
                pg.addColorStop(0.55, stops.c2);
                pg.addColorStop(1.00, stops.c3);
            }
            ctx.fillStyle = pg;
            ctx.fill();

            if (isHighDetail) {
                ctx.strokeStyle = 'rgba(26, 2, 12, 0.34)';
                ctx.lineWidth = Math.max(0.75, s * 0.062 * it.k);
                ctx.stroke();
            }

            ctx.strokeStyle = it.isFrontFace ? 'rgba(255, 245, 248, 0.58)' : 'rgba(255, 232, 238, 0.42)';
            ctx.lineWidth = Math.max(0.40, s * 0.034 * it.k);
            ctx.stroke();
        } else if (it.kind === 'core') {
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2);
            ctx.fill();
        } else if (it.kind === 'stamen') {
            ctx.strokeStyle = pal.stamenTip;
            ctx.lineWidth = Math.max(0.65, s * 0.045 * it.k);
            ctx.beginPath();
            ctx.moveTo(it.bx, it.by);
            ctx.quadraticCurveTo(it.mx, it.my, it.tx, it.ty);
            ctx.stroke();

            ctx.fillStyle = pal.anther;
            ctx.beginPath();
            ctx.arc(it.tx, it.ty, Math.max(1.1, s * 0.068 * it.k), 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// 3. HỒ ĐIỆP ÁNH KIM 3D KHỚP NỐI 4 CÁNH CONG CAMBER & SẮP XẾP CHIỀU SÂU Z-BUFFER (TRUE 3D ARTICULATED BUTTERFLY)
function drawTrue3DButterfly(ctx, s, rx, ry, rz, flapPhase, isGold) {
    if (s < 1.8) return;
    // Ma trận định hướng 3D của thân bướm trong không gian (Pitch nghiêng về trước + Roll nghiêng lượn + Yaw hướng bay)
    const pitch = -0.58 + 0.22 * Math.sin(rx);
    const roll = 0.46 * Math.sin(ry);
    const yaw = rz;
    u3dSetMatrix(pitch, yaw, roll, Math.max(110, s * 4.2));
    const M = _u3dMat;

    // Góc đập cánh 3D thực trong không gian (xoay quanh trục thân Y của bướm từ -62° tới +68°)
    const foreAngle = Math.sin(flapPhase) * 1.12;
    const hindAngle = Math.sin(flapPhase - 0.44) * 1.06;

    // Chiếu điểm trên cánh bướm có độ vồng khí động học 3D (Wing Camber Arch)
    const evalWingPt = (side, wAngle, xSpan, yChord, camberZ, out) => {
        const ca = Math.cos(wAngle), sa = Math.sin(wAngle);
        const wx = side * (xSpan * ca - camberZ * sa);
        const wz = xSpan * sa + camberZ * ca;
        u3dProj(wx, yChord, wz, out);
    };

    const drawSideWings = (side) => {
        // A. Cánh sau đuôi én 3D (Hindwing Swallowtail)
        evalWingPt(side, hindAngle, s * 0.04,  s * 0.04, 0, _P0);
        evalWingPt(side, hindAngle, s * 0.72,  s * 0.18, s * 0.14, _P1);
        evalWingPt(side, hindAngle, s * 0.92,  s * 0.84, s * 0.10, _P2);
        evalWingPt(side, hindAngle, s * 0.46,  s * 1.04, -s * 0.04, _P3);
        evalWingPt(side, hindAngle, s * 0.36,  s * 1.24, -s * 0.08, _PTL); // Đuôi cánh Swallowtail
        evalWingPt(side, hindAngle, s * 0.26,  s * 0.98, 0, _P4);
        evalWingPt(side, hindAngle, s * 0.06,  s * 0.46, 0, _P5);

        const hg = ctx.createLinearGradient(_P0.x, _P0.y, _P2.x, _P2.y);
        if (isGold) {
            hg.addColorStop(0.0, '#3b1704');
            hg.addColorStop(0.32, '#f59e0b');
            hg.addColorStop(0.68, '#fde047');
            hg.addColorStop(0.90, '#6ee7b7');
            hg.addColorStop(1.0, '#ffffff');
        } else {
            hg.addColorStop(0.0, '#4c0519');
            hg.addColorStop(0.35, '#be123c');
            hg.addColorStop(0.72, '#f472b6');
            hg.addColorStop(1.0, '#fff1f2');
        }
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.moveTo(_P0.x, _P0.y);
        ctx.bezierCurveTo(_P1.x, _P1.y, _P2.x, _P2.y, _P3.x, _P3.y);
        ctx.lineTo(_PTL.x, _PTL.y);
        ctx.lineTo(_P4.x, _P4.y);
        ctx.quadraticCurveTo(_P5.x, _P5.y, _P0.x, _P0.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = isGold ? 'rgba(254, 240, 138, 0.82)' : 'rgba(255, 228, 230, 0.82)';
        ctx.lineWidth = Math.max(0.6, s * 0.045);
        ctx.stroke();

        // B. Cánh trước 3D (Forewing) có độ vồng Camber và ánh kim theo góc pháp tuyến 3D
        evalWingPt(side, foreAngle, s * 0.04, -s * 0.06, 0, _P0);
        evalWingPt(side, foreAngle, s * 0.58, -s * 1.08, s * 0.22, _P1);
        evalWingPt(side, foreAngle, s * 1.32, -s * 0.68, s * 0.16, _P2);
        evalWingPt(side, foreAngle, s * 1.02,  s * 0.08, s * 0.08, _P3);
        evalWingPt(side, foreAngle, s * 0.56,  s * 0.24, s * 0.06, _P4);

        const ca = Math.cos(foreAngle), sa = Math.sin(foreAngle);
        const wnx = -side * sa, wnz = ca;
        const NZ = M.m20 * wnx + M.m22 * wnz;
        const sheen = Math.max(0, Math.min(1, 0.45 + 0.55 * Math.abs(NZ)));

        const fg = ctx.createLinearGradient(_P0.x, _P0.y, _P2.x, _P2.y);
        if (isGold) {
            fg.addColorStop(0.0, '#422006');
            fg.addColorStop(0.28, '#d97706');
            fg.addColorStop(0.62, sheen > 0.72 ? '#fef9c3' : '#fde047');
            fg.addColorStop(0.86, '#34d399');
            fg.addColorStop(1.0, '#ffffff');
        } else {
            fg.addColorStop(0.0, '#3b0414');
            fg.addColorStop(0.28, '#e11d48');
            fg.addColorStop(0.65, sheen > 0.72 ? '#ffe4e6' : '#fda4af');
            fg.addColorStop(0.88, '#fbbf24');
            fg.addColorStop(1.0, '#ffffff');
        }
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(_P0.x, _P0.y);
        ctx.bezierCurveTo(_P1.x, _P1.y, _P2.x, _P2.y, _P3.x, _P3.y);
        ctx.quadraticCurveTo(_P4.x, _P4.y, _P0.x, _P0.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Gân cánh 3D & đốm ngọc phát sáng chiếu đúng theo mặt cong 3D của cánh
        if (s > 6) {
            evalWingPt(side, foreAngle, s * 0.52, -s * 0.44, s * 0.16, _P5);
            evalWingPt(side, foreAngle, s * 0.92, -s * 0.38, s * 0.12, _P6);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.58)';
            ctx.lineWidth = Math.max(0.45, s * 0.035);
            ctx.beginPath();
            ctx.moveTo(_P0.x, _P0.y);
            ctx.quadraticCurveTo(_P5.x, _P5.y, _P6.x, _P6.y);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(_P6.x, _P6.y, Math.max(0.8, s * 0.055 * _P6.k), 0, Math.PI * 2);
            ctx.fill();
        }
    };

    const drawBody3D = () => {
        u3dProj(0, -s * 0.26, s * 0.05, _P0); // Đầu bướm
        u3dProj(0,  0.00,     s * 0.08, _P1); // Ngực bướm (Thorax)
        u3dProj(0,  s * 0.42, -s * 0.02, _P2); // Bụng bướm (Abdomen)

        ctx.strokeStyle = '#3b1d04';
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(2.0, s * 0.14 * _P1.k);
        ctx.beginPath();
        ctx.moveTo(_P0.x, _P0.y);
        ctx.quadraticCurveTo(_P1.x, _P1.y, _P2.x, _P2.y);
        ctx.stroke();

        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = Math.max(1.0, s * 0.07 * _P1.k);
        ctx.beginPath();
        ctx.moveTo(_P0.x, _P0.y);
        ctx.lineTo(_P1.x, _P1.y);
        ctx.stroke();

        if (s > 5) {
            u3dProj(-s * 0.28, -s * 0.56, s * 0.18, _PTL);
            u3dProj( s * 0.28, -s * 0.56, s * 0.18, _PTR);
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = Math.max(0.6, s * 0.035 * _P0.k);
            ctx.beginPath();
            ctx.moveTo(_P0.x, _P0.y);
            ctx.quadraticCurveTo((_P0.x + _PTL.x) * 0.5, _PTL.y, _PTL.x, _PTL.y);
            ctx.moveTo(_P0.x, _P0.y);
            ctx.quadraticCurveTo((_P0.x + _PTR.x) * 0.5, _PTR.y, _PTR.x, _PTR.y);
            ctx.stroke();
        }
    };

    // Sắp xếp chiều sâu 3D: Cánh ở xa camera vẽ trước -> Thân bướm 3D -> Cánh ở gần camera vẽ đè lên trên!
    evalWingPt(-1, foreAngle, s * 0.6, -s * 0.3, s * 0.12, _P5);
    const leftZ = _P5.z;
    evalWingPt(1, foreAngle, s * 0.6, -s * 0.3, s * 0.12, _P6);
    const rightZ = _P6.z;

    if (leftZ < rightZ) {
        drawSideWings(-1);
        drawBody3D();
        drawSideWings(1);
    } else {
        drawSideWings(1);
        drawBody3D();
        drawSideWings(-1);
    }
}

// 4. NƠ LỤA SATIN HOÀNG GIA PHÁP 3D & DẢI RUY-BĂNG LỤA XOẮN SÓNG 3D (TRUE 3D VOLUMETRIC SILK BOW & HELICAL STREAMER)
function drawTrue3DSilkBow(ctx, s, rx, ry, rz, atlas) {
    if (s < 2.0) return;
    const pitch = 0.28 * Math.sin(rx);
    const yaw = 0.46 * Math.sin(ry);
    const roll = rz;
    u3dSetMatrix(pitch, yaw, roll, Math.max(115, s * 4.0));
    const M = _u3dMat;

    // A. Vẽ 2 dải đuôi lụa Swallowtail uốn sóng 3D (có chiều sâu Z lượn sóng)
    const drawTail3D = (dir) => {
        u3dProj(dir * s * 0.08, s * 0.08, -s * 0.08, _P0);
        u3dProj(dir * s * 0.56, s * 0.52,  s * 0.24 * dir, _P1);
        u3dProj(dir * s * 0.88, s * 1.24, -s * 0.14 * dir, _P2);
        u3dProj(dir * s * 0.56, s * 1.06, -s * 0.10 * dir, _P3);
        u3dProj(dir * s * 0.34, s * 1.22, -s * 0.12 * dir, _P4);
        u3dProj(dir * s * 0.22, s * 0.58,  s * 0.18 * dir, _P5);

        const tg = ctx.createLinearGradient(_P0.x, _P0.y, _P2.x, _P2.y);
        tg.addColorStop(0.0, '#590624');
        tg.addColorStop(0.38, '#be185d');
        tg.addColorStop(0.68, '#f472b6');
        tg.addColorStop(0.86, '#fce7f3');
        tg.addColorStop(1.0, '#db2777');
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.moveTo(_P0.x, _P0.y);
        ctx.quadraticCurveTo(_P1.x, _P1.y, _P2.x, _P2.y);
        ctx.lineTo(_P3.x, _P3.y);
        ctx.lineTo(_P4.x, _P4.y);
        ctx.quadraticCurveTo(_P5.x, _P5.y, _P0.x, _P0.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.78)';
        ctx.lineWidth = Math.max(0.65, s * 0.042);
        ctx.stroke();
    };

    // B. Vẽ 2 Vòng Cánh Nơ Lụa Phồng 3D (Có mặt lụa vòng sau ở -Z, hốc tối chiều sâu ở khúc cua, và vòm lụa phồng trước ở +Z!)
    const drawBowLoop3D = (dir) => {
        // 1. Thành lụa phía sau của vòng nơ (z < 0)
        u3dProj(0, -s * 0.06, -s * 0.16, _P0);
        u3dProj(dir * s * 0.72, -s * 0.68, -s * 0.28, _P1);
        u3dProj(dir * s * 1.18, -s * 0.12, -s * 0.18, _P2);
        u3dProj(dir * s * 0.78,  s * 0.28, -s * 0.24, _P3);
        ctx.fillStyle = '#4a041e';
        ctx.beginPath();
        ctx.moveTo(_P0.x, _P0.y);
        ctx.bezierCurveTo(_P1.x, _P1.y, _P2.x, _P2.y, _P3.x, _P3.y);
        ctx.closePath();
        ctx.fill();

        // 2. Hốc tối bên trong vòng cuộn 3D của dải lụa (Interior 3D Loop Cavity)
        u3dProj(dir * s * 0.82, -s * 0.16, -s * 0.04, _PM);
        ctx.fillStyle = '#2d0212';
        ctx.beginPath();
        ctx.ellipse(_PM.x, _PM.y, Math.max(2, s * 0.28 * _PM.k), Math.max(1.2, s * 0.15 * _PM.k), dir * -0.2, 0, Math.PI * 2);
        ctx.fill();

        // 3. Vòm lụa phồng phía trước (z = +0.38*s) có vệt phản quang Anisotropic Satin dịch chuyển theo góc nghiêng 3D!
        u3dProj(0, -s * 0.04, s * 0.24, _P0);
        u3dProj(dir * s * 0.56, -s * 0.88, s * 0.42, _P1);
        u3dProj(dir * s * 1.32, -s * 0.48, s * 0.08, _P2);
        u3dProj(dir * s * 1.16,  s * 0.12, -s * 0.06, _P3);
        u3dProj(dir * s * 0.88,  s * 0.56, s * 0.34, _P4);
        u3dProj(0,  s * 0.12, s * 0.24, _P5);

        const sheenShift = Math.max(0.25, Math.min(0.82, 0.56 + dir * M.m02 * 0.32));
        const lg = ctx.createLinearGradient(_P0.x, _P0.y, _P3.x, _P3.y);
        lg.addColorStop(0.0, '#6b082b');
        lg.addColorStop(0.26, '#be185d');
        lg.addColorStop(sheenShift - 0.12, '#f472b6');
        lg.addColorStop(sheenShift, '#fff1f2'); // Vệt bóng lụa Satin trượt theo góc 3D
        lg.addColorStop(Math.min(0.95, sheenShift + 0.16), '#ec4899');
        lg.addColorStop(1.0, '#831843');

        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(_P0.x, _P0.y);
        ctx.bezierCurveTo(_P1.x, _P1.y, _P2.x, _P2.y, _P3.x, _P3.y);
        ctx.bezierCurveTo(_P4.x, _P4.y, _P5.x, _P5.y, _P0.x, _P0.y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(254, 240, 138, 0.78)';
        ctx.lineWidth = Math.max(0.7, s * 0.045);
        ctx.stroke();

        // Nếp gấp lụa 3D sâu tại cổ nút thắt
        u3dProj(dir * s * 0.62, -s * 0.08, s * 0.36, _P6);
        ctx.strokeStyle = 'rgba(56, 3, 22, 0.58)';
        ctx.lineWidth = Math.max(1.0, s * 0.07);
        ctx.beginPath();
        ctx.moveTo(_P0.x, (_P0.y + _P5.y) * 0.5);
        ctx.quadraticCurveTo(_P6.x * 0.6, _P6.y, _P6.x, _P6.y);
        ctx.stroke();
    };

    // Sắp xếp thứ tự Z-Buffer giữa cánh trái và cánh phải khi nơ nghiêng 3D
    const leftFirst = M.m20 > 0;
    drawTail3D(leftFirst ? -1 : 1);
    drawTail3D(leftFirst ? 1 : -1);
    drawBowLoop3D(leftFirst ? -1 : 1);
    drawBowLoop3D(leftFirst ? 1 : -1);

    // C. Nút thắt lụa trung tâm & Viên Ngọc Trai Nam Hải 3D nổi về phía trước (z = +0.38*s)
    u3dProj(0, s * 0.02, s * 0.38, _P0);
    const pr = Math.max(3.5, s * 0.34 * _P0.k);
    ctx.drawImage(atlas.pearl, _P0.x - pr, _P0.y - pr, pr * 2, pr * 2);
}

// Dải Ruy-Băng Lụa Satin Xoắn Sóng 3D (True 3D Multi-Segment Twisted Ribbon Strip)
const _ribPtsL = Array.from({ length: 9 }, () => ({ x: 0, y: 0, z: 0, k: 1 }));
const _ribPtsR = Array.from({ length: 9 }, () => ({ x: 0, y: 0, z: 0, k: 1 }));
const _ribSegOrder = [0, 1, 2, 3, 4, 5, 6, 7];

function drawTrue3DSilkStreamer(ctx, s, rx, ry, rz) {
    if (s < 2.0) return;
    u3dSetMatrix(rx * 0.45, ry * 0.45, rz, Math.max(110, s * 4.0));
    const M = _u3dMat;

    const N = 8;
    const span = s * 1.45;
    const halfW = s * 0.28;
    for (let i = 0; i <= N; i++) {
        const u = (i / N) * 2 - 1; // -1 .. +1
        const wavePhase = u * Math.PI * 1.35 + rx * 1.5;
        const cx = u * span;
        const cy = Math.sin(wavePhase) * s * 0.36;
        const cz = Math.cos(wavePhase) * s * 0.42;

        // Vector bề rộng dải lụa xoắn 3D dọc theo thân ruy-băng
        const twist = ry + u * 1.65;
        const wy = Math.cos(twist) * halfW * (1 - Math.abs(u) * 0.22);
        const wz = Math.sin(twist) * halfW * (1 - Math.abs(u) * 0.22);

        u3dProj(cx, cy - wy, cz - wz, _ribPtsL[i]);
        u3dProj(cx, cy + wy, cz + wz, _ribPtsR[i]);
    }

    // Sắp xếp các đốt ruy-băng 3D theo chiều sâu Z
    _ribSegOrder.sort((a, b) => {
        const za = _ribPtsL[a].z + _ribPtsR[a].z + _ribPtsL[a + 1].z + _ribPtsR[a + 1].z;
        const zb = _ribPtsL[b].z + _ribPtsR[b].z + _ribPtsL[b + 1].z + _ribPtsR[b + 1].z;
        return za - zb;
    });

    for (let idx = 0; idx < N; idx++) {
        const i = _ribSegOrder[idx];
        const L0 = _ribPtsL[i], R0 = _ribPtsR[i];
        const L1 = _ribPtsL[i + 1], R1 = _ribPtsR[i + 1];

        // tích có hướng 2D trên màn hình cho biết mặt trước (Satin bóng) hay mặt lưng (Nhung sẫm) đang hướng về camera
        const crossZ = (L1.x - L0.x) * (R0.y - L0.y) - (L1.y - L0.y) * (R0.x - L0.x);
        const isFront = crossZ >= 0;
        const sheen = Math.abs(Math.sin((i / N) * Math.PI * 2 + rx + ry));

        ctx.fillStyle = isFront
            ? (sheen > 0.72 ? '#ffe4ef' : (sheen > 0.38 ? '#f472b6' : '#db2777'))
            : (sheen > 0.60 ? '#be185d' : '#700a34');
        ctx.beginPath();
        ctx.moveTo(L0.x, L0.y);
        ctx.lineTo(L1.x, L1.y);
        ctx.lineTo(R1.x, R1.y);
        ctx.lineTo(R0.x, R0.y);
        ctx.closePath();
        ctx.fill();

        // Viền chỉ vàng 24K hai bên mép dải lụa 3D
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.85)';
        ctx.lineWidth = Math.max(0.65, s * 0.045);
        ctx.beginPath();
        ctx.moveTo(L0.x, L0.y);
        ctx.lineTo(L1.x, L1.y);
        ctx.moveTo(R0.x, R0.y);
        ctx.lineTo(R1.x, R1.y);
        ctx.stroke();
    }
}

// 5. KHỐI ĐA DIỆN MẢNH SÁP VÀNG 3D CÓ ĐỘ DÀY & CẠNH VÁT PHẢN QUANG (TRUE 3D EXTRUDED WAX POLYHEDRON)
const _shardBase = [
    [0, -1.0],
    [0.86, -0.22],
    [0.52, 0.88],
    [-0.68, 0.62],
    [-0.90, -0.38]
];
const _shTop = Array.from({ length: 5 }, () => ({ x: 0, y: 0, z: 0, k: 1 }));
const _shBot = Array.from({ length: 5 }, () => ({ x: 0, y: 0, z: 0, k: 1 }));

function drawTrue3DWaxShard(ctx, s, rx, ry, rz, baseColor) {
    if (s < 1.5) return;
    u3dSetMatrix(rx, ry, rz, Math.max(90, s * 4.0));
    const M = _u3dMat;
    const h = s * 0.34; // Độ dày vật lý 3D thật của mảnh sáp

    for (let i = 0; i < 5; i++) {
        const vx = _shardBase[i][0] * s;
        const vy = _shardBase[i][1] * s;
        u3dProj(vx, vy,  h, _shTop[i]);
        u3dProj(vx, vy, -h, _shBot[i]);
    }

    const topFacing = M.m22 >= 0;
    const backPts = topFacing ? _shBot : _shTop;
    const frontPts = topFacing ? _shTop : _shBot;

    // 1. Khối đế vát cạnh 3D phía sau (1 lệnh fill duy nhất thay cho 5 tứ giác rời, giảm 80% draw calls khi đóng sáp!)
    ctx.fillStyle = '#6e3f02';
    ctx.beginPath();
    ctx.moveTo(backPts[0].x, backPts[0].y);
    for (let i = 1; i < 5; i++) ctx.lineTo(backPts[i].x, backPts[i].y);
    ctx.closePath();
    ctx.fill();

    // 2. Mặt chính hướng về camera
    ctx.fillStyle = topFacing ? (baseColor || '#e5a928') : '#8c5306';
    ctx.strokeStyle = '#ffefc2';
    ctx.lineWidth = Math.max(0.6, s * 0.06);
    ctx.beginPath();
    ctx.moveTo(frontPts[0].x, frontPts[0].y);
    for (let i = 1; i < 5; i++) ctx.lineTo(frontPts[i].x, frontPts[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Mặt vát phản quang ánh kim
    if (topFacing) {
        ctx.fillStyle = 'rgba(255, 252, 230, 0.65)';
        ctx.beginPath();
        ctx.moveTo(frontPts[0].x, frontPts[0].y);
        ctx.lineTo(frontPts[1].x, frontPts[1].y);
        ctx.lineTo((frontPts[0].x + frontPts[2].x) * 0.5, (frontPts[0].y + frontPts[2].y) * 0.5);
        ctx.closePath();
        ctx.fill();
    }
}

// Hàm vẽ các thực thể Vật Lý 3D trên 2 lớp Canvas (Sau thiệp & Trước thiệp) bằng Hình học 3D Thật 100% (60fps Zero-Lag)
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
    const pAlpha = Math.max(0, Math.min(1, p.alpha));
    const is3DMesh = p.type !== 'bokeh' && p.type !== 'star' && p.type !== 'pearl';
    ctx.globalAlpha = is3DMesh ? (pAlpha > 0.14 ? 1.0 : pAlpha / 0.14) : pAlpha;

    const s = is3DMesh ? p.size * (0.34 + 0.66 * Math.min(1, pAlpha * 1.15)) : p.size;
    const rx = p.rx || 0;
    const ry = p.ry || 0;
    const rz = p.rz || 0;
    const openAmt = p.openAmt !== undefined ? p.openAmt : 1.0;

    if (p.type === 'shard') {
        drawTrue3DWaxShard(ctx, s, rx, ry, rz, p.color);
    } else if (p.type === 'butterfly') {
        const heading = Math.atan2(p.vy || -1, p.vx || 0) + Math.PI / 2;
        ctx.drawImage(p.isGold ? atlas.fireflyGold : atlas.fireflyRose, -s * 0.9, -s * 0.9, s * 1.8, s * 1.8);
        drawTrue3DButterfly(ctx, s, p.phase || rx, (p.phase || 0) * 0.7 + ry, heading * 0.35 + Math.sin((p.phase || 0) * 0.5) * 0.22, p.flapPhase || 0, p.isGold !== false);
    } else if (p.type === 'petal' || p.type === 'rose_petal' || p.type === 'tulip_petal') {
        const petalKind = p.type === 'rose_petal' ? 'rose' : (p.type === 'tulip_petal' ? 'tulip' : (p.isSakura ? 'sakura' : 'camellia'));
        drawTrue3DPetal(ctx, petalKind, s * 1.08, rx, ry, rz);
    } else if (p.type === 'camellia_bloom') {
        if (p.hasContactShadow) {
            const sr = s * 1.25;
            ctx.drawImage(atlas.contactShadow, -sr + 2, -sr + 4, sr * 2, sr * 2);
        }
        drawTrue3DFlower(ctx, 'camellia', s * 1.16, rx, ry, rz, openAmt);
    } else if (p.type === 'sakura_bloom') {
        if (p.hasContactShadow) {
            const sr = s * 1.18;
            ctx.drawImage(atlas.contactShadow, -sr + 2, -sr + 3.5, sr * 2, sr * 2);
        }
        drawTrue3DFlower(ctx, 'sakura', s * 1.16, rx, ry, rz, openAmt);
    } else if (p.type === 'rose_bloom' || p.type === 'rose_bud') {
        if (p.hasContactShadow) {
            const sr = s * 1.22;
            ctx.drawImage(atlas.contactShadow, -sr + 2, -sr + 4, sr * 2, sr * 2);
        }
        const isBud = p.type === 'rose_bud' || p.isBudVariant;
        drawTrue3DFlower(ctx, isBud ? 'rose_bud' : 'rose', s * (isBud ? 1.12 : 1.18), rx, ry, rz, openAmt);
    } else if (p.type === 'tulip_bloom' || p.type === 'diamond') {
        if (p.hasContactShadow) {
            const sr = s * 1.18;
            ctx.drawImage(atlas.contactShadow, -sr + 2, -sr + 4, sr * 2, sr * 2);
        }
        drawTrue3DFlower(ctx, 'tulip', s * 1.18, rx, ry, rz * 0.45, openAmt);
    } else if (p.type === 'silk_bow') {
        if (p.hasContactShadow) {
            const sr = s * 1.28;
            ctx.drawImage(atlas.contactShadow, -sr + 2, -sr * 0.7 + 4, sr * 2, sr * 1.4);
        }
        drawTrue3DSilkBow(ctx, s * 1.12, rx, ry, rz * 0.35, atlas);
    } else if (p.type === 'silk_streamer') {
        drawTrue3DSilkStreamer(ctx, s * 1.15, rx, ry, rz);
    } else if (p.type === 'pearl') {
        const drawR = s * 1.26;
        ctx.drawImage(atlas.pearl, -drawR, -drawR, drawR * 2, drawR * 2);
    } else if (p.type === 'bokeh') {
        const drawR = s * 1.45;
        const bSpr = (p.bokehColor && p.bokehColor.includes('133')) ? atlas.bokehRose : atlas.bokehGold;
        ctx.drawImage(bSpr, -drawR, -drawR, drawR * 2, drawR * 2);
    } else if (p.type === 'star') {
        if (p.hasTrail && (Math.abs(p.vx) + Math.abs(p.vy) > 40)) {
            const ang = Math.atan2(p.vy, p.vx);
            const tLen = Math.min(s * 3.8, Math.hypot(p.vx, p.vy) * 0.055);
            ctx.save();
            ctx.rotate(ang);
            ctx.fillStyle = 'rgba(255, 226, 122, 0.36)';
            ctx.beginPath();
            ctx.moveTo(0, -s * 0.24);
            ctx.lineTo(-tLen, 0);
            ctx.lineTo(0, s * 0.24);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        ctx.drawImage(atlas.fireflyGold, -s * 1.35, -s * 1.35, s * 2.7, s * 2.7);
        ctx.rotate(rz);
        ctx.fillStyle = '#fffef7';
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.quadraticCurveTo(s * 0.12, -s * 0.12, s, 0);
        ctx.quadraticCurveTo(s * 0.12, s * 0.12, 0, s);
        ctx.quadraticCurveTo(-s * 0.12, s * 0.12, -s, 0);
        ctx.quadraticCurveTo(-s * 0.12, -s * 0.12, 0, -s);
        ctx.closePath();
        ctx.fill();
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

            ctx.globalAlpha = Math.max(0, Math.min(1, ribbon.alpha * 0.92));
            ctx.strokeStyle = '#ffd54f';
            ctx.lineWidth = p1.w + 2.4 * mScale;
            ctx.beginPath();
            ctx.moveTo(p0.sx, p0.sy);
            ctx.lineTo(p1.sx, p1.sy);
            ctx.stroke();

            ctx.strokeStyle = ribbon.color;
            ctx.lineWidth = p1.w;
            ctx.beginPath();
            ctx.moveTo(p0.sx, p0.sy);
            ctx.lineTo(p1.sx, p1.sy);
            ctx.stroke();

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

// Vẽ Hiệu Ứng Khởi Động / Tụ Năng Lượng 3D quanh Con Dấu Sáp theo từng chế độ (0.00s -> 0.88s)
// Kết xuất bằng Hình học 3D Thật (True 3D Flowers, Petals, Butterflies & Bows bung nở trong không gian 3D quanh ấn sáp!)
function drawSealWindupEffect(ctx, modeId, w, cx, cy, sealScreenY, motionScale = 1) {
    if (w <= 0 || w >= 1) return;
    const atlas = getU3DLuxurySpriteAtlas();
    ctx.save();
    ctx.translate(cx, sealScreenY);
    ctx.scale(motionScale, motionScale);

    const fadeOut = w > 0.84 ? (1 - w) / 0.16 : 1;
    const baseAlpha = Math.min(1, w * 2.5) * fadeOut;
    const bloomGrow = 0.62 + Math.sin(w * Math.PI * 0.85) * 0.55;
    const openAmt = Math.min(1, 0.35 + w * 0.85);

    const auraR = 64 + Math.sin(w * Math.PI) * 34;
    const auraGrad = ctx.createRadialGradient(0, 0, 12, 0, 0, auraR);
    auraGrad.addColorStop(0, `rgba(255, 244, 196, ${(baseAlpha * 0.58).toFixed(3)})`);
    auraGrad.addColorStop(0.52, `rgba(244, 114, 182, ${(baseAlpha * 0.26).toFixed(3)})`);
    auraGrad.addColorStop(1, 'rgba(255, 244, 196, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = baseAlpha * 0.95;

    if (modeId === 'bloom') {
        const petalSpread = 34 + Math.sin(w * Math.PI) * 24;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + w * 2.4;
            ctx.save();
            ctx.translate(Math.cos(a) * petalSpread, Math.sin(a) * petalSpread);
            drawTrue3DPetal(ctx, 'camellia', 12 * bloomGrow, w * 3 + i, a, a + Math.PI * 0.5);
            ctx.restore();
        }
        for (let b = 0; b < 4; b++) {
            const ba = (b / 4) * Math.PI * 2 - w * 1.5 + Math.PI / 4;
            ctx.save();
            ctx.translate(Math.cos(ba) * petalSpread * 0.82, Math.sin(ba) * petalSpread * 0.82);
            drawTrue3DFlower(ctx, 'camellia', 14 * bloomGrow, b + w * 2, ba, ba, openAmt);
            ctx.restore();
        }
    } else if (modeId === 'butterflies') {
        for (let b = 0; b < 3; b++) {
            const ba = (b / 3) * Math.PI * 2 + w * 3.2;
            const r = 38 + Math.sin(w * Math.PI) * 16;
            ctx.save();
            ctx.translate(Math.cos(ba) * r, Math.sin(ba) * r);
            drawTrue3DButterfly(ctx, 16 * bloomGrow, w * 4 + b, ba, ba + Math.PI, w * 28 + b * 2, b % 2 === 0);
            ctx.restore();
        }
    } else if (modeId === 'ribbon') {
        const r = 42 + Math.sin(w * Math.PI) * 16;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + w * 2.2;
            ctx.save();
            ctx.translate(Math.cos(a) * r, Math.sin(a) * r);
            if (i % 2 === 0) {
                ctx.drawImage(atlas.pearl, -9, -9, 18, 18);
            } else {
                drawTrue3DSilkBow(ctx, 15 * bloomGrow, w * 2.5 + i, a, a + Math.PI * 0.5, atlas);
            }
            ctx.restore();
        }
    } else if (modeId === 'galaxy') {
        const petalSpread = 34 + Math.sin(w * Math.PI) * 26;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + w * 2.2;
            ctx.save();
            ctx.translate(Math.cos(a) * petalSpread, Math.sin(a) * petalSpread);
            if (i % 2 === 0) {
                drawTrue3DPetal(ctx, 'rose', 12 * bloomGrow, w * 3 + i, a, a + Math.PI * 0.5);
            } else {
                drawTrue3DFlower(ctx, 'rose_bud', 13 * bloomGrow, w * 2 + i, a * 1.4, a * 0.4, openAmt);
            }
            ctx.restore();
        }
        for (let b = 0; b < 3; b++) {
            const ba = (b / 3) * Math.PI * 2 - w * 1.6;
            ctx.save();
            ctx.translate(Math.cos(ba) * petalSpread * 0.78, Math.sin(ba) * petalSpread * 0.78);
            drawTrue3DFlower(ctx, 'rose', 15 * bloomGrow, b + w * 2.2, ba, ba, openAmt);
            ctx.restore();
        }
    } else if (modeId === 'sakura') {
        const ringR = 38 + Math.sin(w * Math.PI) * 20;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + w * 3.0;
            ctx.save();
            ctx.translate(Math.cos(a) * ringR, Math.sin(a) * ringR);
            if (i % 2 === 0) {
                drawTrue3DFlower(ctx, 'sakura', 14 * bloomGrow, i + w * 2.5, a, a, openAmt);
            } else {
                drawTrue3DPetal(ctx, 'sakura', 11 * bloomGrow, w * 4 + i, a, a + 0.5);
            }
            ctx.restore();
        }
    } else if (modeId === 'hearts') {
        const spread = 36 + Math.sin(w * Math.PI) * 24;
        const tulipAngles = [-1.05, -0.52, 0, 0.52, 1.05];
        for (let i = 0; i < tulipAngles.length; i++) {
            const ta = tulipAngles[i] * (0.75 + w * 0.45);
            ctx.save();
            ctx.rotate(ta);
            ctx.translate(0, -spread * (i === 2 ? 0.92 : 0.80));
            drawTrue3DFlower(ctx, 'tulip', (i === 2 ? 17 : 13.5) * bloomGrow, w * 2 + i, w * 3 + i, 0, openAmt);
            ctx.restore();
        }
    }

    ctx.restore();
}

// Vẽ Biểu Tượng Hoa & Kim Hoàn 3D Kết Tinh ở tâm màn hình bằng Hình học 3D Thật
function drawSummonCenterMotif(ctx, modeId, t, cx, cy, motionScale = 1) {
    const atlas = getU3DLuxurySpriteAtlas();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(motionScale, motionScale);

    const pulse = 1 + Math.sin(t * 4.5) * 0.10;
    const coreGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 96 * pulse);
    coreGrad.addColorStop(0, 'rgba(255, 253, 232, 0.94)');
    coreGrad.addColorStop(0.34, 'rgba(255, 224, 130, 0.52)');
    coreGrad.addColorStop(0.68, 'rgba(244, 143, 177, 0.25)');
    coreGrad.addColorStop(1, 'rgba(244, 143, 177, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 96 * pulse, 0, Math.PI * 2);
    ctx.fill();

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

    ctx.globalAlpha = 0.98;
    if (modeId === 'butterflies') {
        drawTrue3DButterfly(ctx, 32 * pulse, t * 2.2, t * 1.8, Math.sin(t * 2.5) * 0.25, t * 14, true);
    } else if (modeId === 'hearts') {
        [-0.46, 0.46, 0].forEach((angOffset, idx) => {
            ctx.save();
            ctx.rotate(angOffset + Math.sin(t * 2.2 + idx) * 0.08);
            ctx.translate(0, idx === 2 ? -4 : 6);
            drawTrue3DFlower(ctx, 'tulip', (idx === 2 ? 28 : 21) * pulse, t * 2 + idx, t * 1.6 + idx, 0, 1.0);
            ctx.restore();
        });
    } else if (modeId === 'galaxy') {
        drawTrue3DFlower(ctx, 'rose', 32 * pulse, t * 1.8, t * 1.4, t * 0.9, 1.0);
    } else if (modeId === 'ribbon') {
        drawTrue3DSilkBow(ctx, 28 * pulse, t * 2.0, t * 1.6, Math.sin(t * 2.5) * 0.16, atlas);
    } else {
        drawTrue3DFlower(ctx, modeId === 'sakura' ? 'sakura' : 'camellia', 30 * pulse, t * 1.8, t * 1.4, t * 1.1, 1.0);
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
    document.body.classList.toggle('u3d-wish-cinematic', !!(skyOracleMode && window.WishBloomCutscene));
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

    // Đồng bộ ảnh mặt trước của tấm thiệp 3D nằm trong phong bì (Chỉ gán khi đã có ảnh thật hợp lệ; với skyOracleMode hoặc khi đang hoãn kết xuất tới sau lúc đóng sáp thì đợi tới trạng thái 'waiting')
    if (cardImg && !isRealRecipient && !skyOracleMode && !window.hasPendingDeferredCardRender) {
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
        pocketBloomCore.innerHTML = '';
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

    // Chuẩn bị 2 lớp Canvas Vật Lý 3D theo Bộ Đo Hiệu Năng 3 Tầng (Tier 2: 1.35x, Tier 1: 1.2x, Tier 0: 1.0x)
    const perfProfile = (window.WishBloomCutscene && typeof window.WishBloomCutscene.getPerfProfile === 'function')
        ? window.WishBloomCutscene.getPerfProfile()
        : null;
    const perfTier = perfProfile ? perfProfile.tier : (((navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 4)) ? 0 : 1);
    const isLowEndDevice = perfTier === 0;
    const dpr = Math.min(window.devicePixelRatio || 1, perfProfile ? perfProfile.worldDpr : (isLowEndDevice ? 1.15 : 1.35));
    let curVw = window.innerWidth;
    let curVh = window.innerHeight;
    canvasBack.width = Math.round(curVw * dpr);
    canvasBack.height = Math.round(curVh * dpr);
    canvasFront.width = Math.round(curVw * dpr);
    canvasFront.height = Math.round(curVh * dpr);
    const ctxBack = canvasBack.getContext('2d');
    const ctxFront = canvasFront.getContext('2d');

    // Lớp Canvas Thế Giới (z: 2 — nằm DƯỚI phong bì) cho Đại cảnh One-Shot "Nụ Hoa Ước Nguyện"
    let canvasWorld = document.getElementById('u3d-canvas-world');
    if (!canvasWorld && stage) {
        canvasWorld = document.createElement('canvas');
        canvasWorld.id = 'u3d-canvas-world';
        canvasWorld.className = 'u3d-physics-canvas u3d-canvas-world';
        stage.insertBefore(canvasWorld, backRig);
    }
    const ctxWorld = canvasWorld ? canvasWorld.getContext('2d') : null;
    if (canvasWorld && ctxWorld) {
        canvasWorld.width = Math.round(curVw * dpr);
        canvasWorld.height = Math.round(curVh * dpr);
        canvasWorld.style.opacity = '1';
        ctxWorld.setTransform(1, 0, 0, 1, 0, 0);
        ctxWorld.clearRect(0, 0, canvasWorld.width, canvasWorld.height);
    }
    if (window.u3dWishBloomScene) {
        window.u3dWishBloomScene.destroy();
        window.u3dWishBloomScene = null;
    }
    let wishBloom = null;
    if (floorShadow) floorShadow.style.opacity = '1';

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
        cardActor.style.opacity = '0';
        if (cardInner) cardInner.style.transform = 'none';
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
    window.CardAudio?.setMotionTheme(cfg.id);

    if (skyOracleMode) {
        if (window.WishBloomCutscene && ctxWorld) {
            wishBloom = window.WishBloomCutscene.create(cfg.id, stage);
            window.u3dWishBloomScene = wishBloom;
            u3dCurrentDirectorState = 'wish_bloom';
            document.body.classList.add('u3d-wish-cinematic');
            if (floorShadow) floorShadow.style.opacity = '0';
        } else {
            document.body.classList.remove('u3d-wish-cinematic');
            u3dCurrentDirectorState = 'sky_oracle';
        }
        stage.classList.add('is-summoning');
        backRig.style.opacity = '0';
        frontRig.style.opacity = '0';
        frontRig.style.pointerEvents = 'none';
        if (sealBtn) {
            sealBtn.style.opacity = '0';
            sealBtn.style.pointerEvents = 'none';
            sealBtn.style.transform = 'translate3d(0, -40px, 0) scale(1.88)';
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
            sealBtn.style.transform = 'translate3d(0, -40px, 0) scale(1.88)';
        }
    } else if (!autoOpen) {
        u3dCurrentDirectorState = 'arriving';
        stage.classList.add('is-arriving');
        window.CardAudio?.setEnvelopeMuffle(true, 0.65);
        window.CardAudio?.playSilkPaperWhoosh(0.45, 320, 760, 0.16, 0, 0.02);
        backRig.style.opacity = '0';
        frontRig.style.opacity = '0';
        frontRig.style.pointerEvents = 'none';
        if (sealBtn) {
            sealBtn.style.opacity = '0';
            sealBtn.style.pointerEvents = 'none';
            sealBtn.style.transform = 'translate3d(0, -40px, 0) scale(1.88)';
        }
    } else {
        u3dCurrentDirectorState = 'waiting';
        window.CardAudio?.setEnvelopeMuffle(true, 0.5);
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

    // 3 Vòng Tinh Cầu 3D xoay quanh Cổng Trời Thiên Đỉnh (chỉ cấp phát khi dùng nhánh dự phòng sky_oracle)
    const skyZenithRings = [];
    const skyBgStars = [];
    const skyClouds3D = [];
    const skySpeedLines = [];
    if (u3dCurrentDirectorState === 'sky_oracle') {
        skyZenithRings.push(
            { cx: 0, cy: -420, cz: -920, radius: 145 * motionScale, rx: 1.18, ry: 0.22, rz: 0, vrx: 0.65, vry: 1.75, vrz: 3.1, color: skyTheme.ringColorA, glowColor: '#f5c242', lineWidth: 2.6 * motionScale, dashed: false, alpha: 0.96 },
            { cx: 0, cy: -420, cz: -920, radius: 210 * motionScale, rx: -1.05, ry: 0.68, rz: 0.4, vrx: -1.35, vry: 1.05, vrz: -2.4, color: skyTheme.ringColorB, glowColor: '#d84b7e', lineWidth: 2.1 * motionScale, dashed: true, alpha: 0.88 },
            { cx: 0, cy: -420, cz: -920, radius: 275 * motionScale, rx: 0.92, ry: -0.82, rz: -0.5, vrx: 0.95, vry: -1.45, vrz: 2.1, color: skyTheme.ringColorC, glowColor: '#fb7185', lineWidth: 1.8 * motionScale, dashed: false, alpha: 0.82 }
        );
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
        if (typeof window.ensureFinalCardRenderedOnce === 'function') {
            window.ensureFinalCardRenderedOnce();
        }
        if (isRealRecipient && !window.isRecipientCardImageReady) return;
        beginOpenSequence();
    };

    function beginOpenSequence() {
        if (u3dCurrentDirectorState === 'opening') return;
        if (typeof window.ensureFinalCardRenderedOnce === 'function') {
            window.ensureFinalCardRenderedOnce();
        }
        if (!cachedTargetRect || window.innerWidth !== curVw || window.innerHeight !== curVh) {
            measureTargetShowcaseOnce();
        }
        u3dCurrentDirectorState = 'opening';
        u3dOpenElapsed = 0;
        openStartTime = performance.now();
        stage.classList.add('is-opening');
        if (frontRig) frontRig.style.pointerEvents = 'none';
        if (sealBtn) sealBtn.style.pointerEvents = 'none';
        window.CardAudio?.playUnified3DEnvelopeOpenSequence(cfg.id);
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
            const bfCount = isLowEndDevice ? 16 : 22;
            for (let i = 0; i < bfCount; i++) {
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
                    size: (16 + Math.random() * 12) * motionScale,
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
                        size: 25 * motionScale
                    });
                });
            });
        } else if (cfg.id === 'ribbon') {
            // 🎀 VƯƠNG MIỆN NƠ LỤA PHÁP HAUTE COUTURE & SUỐI NGỌC TRAI NAM HẢI
            const ribbonCrownNodes = [
                { type: 'silk_bow', nx: 0, ny: -0.485, scale: 1.58, zOff: 34, baseTilt: 0 },
                { type: 'pearl', nx: -0.16, ny: -0.495, scale: 0.58, zOff: 30, baseTilt: 0 },
                { type: 'pearl', nx: 0.16, ny: -0.495, scale: 0.58, zOff: 30, baseTilt: 0 },
                { type: 'silk_bow', nx: -0.485, ny: -0.08, scale: 1.18, zOff: 28, baseTilt: -0.22 },
                { type: 'silk_bow', nx: 0.485, ny: -0.08, scale: 1.18, zOff: 28, baseTilt: 0.22 },
                { type: 'pearl', nx: -0.49, ny: 0.05, scale: 0.50, zOff: 26, baseTilt: 0 },
                { type: 'pearl', nx: 0.49, ny: 0.05, scale: 0.50, zOff: 26, baseTilt: 0 }
            ];
            ribbonCrownNodes.forEach((rn, idx) => {
                escortFlowers.push({
                    type: rn.type,
                    nx: rn.nx,
                    ny: rn.ny,
                    zOff: rn.zOff,
                    baseTilt: rn.baseTilt,
                    hasContactShadow: true,
                    phase: idx * 0.75,
                    rotSpeed: 1.35,
                    size: 20 * rn.scale * motionScale
                });
            });
            const ribTotal = isLowEndDevice ? 36 : 48;
            for (let i = 0; i < ribTotal; i++) {
                const pType = i % 5 === 0 ? 'silk_bow' : (i % 7 === 0 ? 'silk_streamer' : (i % 2 === 0 ? 'pearl' : 'star'));
                const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.35;
                const spd = (350 + Math.random() * 420) * motionScale;
                particles.push({
                    type: pType,
                    hasTrail: pType === 'star',
                    x: (Math.random() - 0.5) * 120 * motionScale,
                    y: mouthY + 15 * motionScale,
                    z: (Math.random() - 0.5) * 250,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd - 85 * motionScale,
                    vz: (Math.random() - 0.5) * 300,
                    gravity: (pType === 'pearl' ? 420 : (pType === 'silk_bow' || pType === 'silk_streamer' ? 88 : 150)) * motionScale,
                    drag: 1.15,
                    vortex: (pType === 'silk_bow' || pType === 'silk_streamer') ? 0.65 : 1.15,
                    flutter: (pType === 'silk_bow' || pType === 'silk_streamer' ? 98 : 55) * motionScale,
                    phase: Math.random() * 6.28,
                    size: (pType === 'silk_bow' ? (17 + Math.random() * 8) : (pType === 'silk_streamer' ? (15 + Math.random() * 7) : (pType === 'pearl' ? (6.5 + Math.random() * 5.5) : (9 + Math.random() * 7)))) * motionScale,
                    rx: Math.random() * 4,
                    ry: Math.random() * 4,
                    rz: (Math.random() - 0.5) * 0.8,
                    vrx: (Math.random() - 0.5) * 3.2,
                    vry: (Math.random() - 0.5) * 3.8,
                    vrz: (Math.random() - 0.5) * (pType === 'silk_bow' ? 1.8 : 5.5),
                    alpha: 1,
                    life: 0,
                    maxLife: 2.45 + Math.random() * 0.6
                });
            }
        } else if (cfg.id === 'galaxy') {
            // 🌹 CỤM HOA HỒNG NHUNG PHÁP CHÉO GÓC VƯƠNG GIẢ (Kết hợp Đóa Hồng Nở Đa Tầng + Nụ Hồng 3D Đài Lá Ngọc Lục Bảo + Cánh Hồng Nhung)
            const roseCornerBouquets = [
                // Cụm Hoa Hồng Pháp Góc Trên - Bên Trái
                { type: 'rose_bloom', nx: -0.44, ny: -0.45, scale: 1.46, zOff: 34, baseTilt: -0.18 },
                { type: 'rose_bud', nx: -0.25, ny: -0.485, scale: 1.16, zOff: 30, baseTilt: 0.48 },
                { type: 'rose_bud', nx: -0.485, ny: -0.27, scale: 1.12, zOff: 28, baseTilt: -0.55 },
                { type: 'rose_petal', nx: -0.13, ny: -0.49, scale: 0.86, zOff: 22, baseTilt: 0.2 },
                { type: 'rose_petal', nx: -0.49, ny: -0.14, scale: 0.86, zOff: 22, baseTilt: -0.3 },
                // Cụm Hoa Hồng Pháp Góc Dưới - Bên Phải
                { type: 'rose_bloom', nx: 0.44, ny: 0.45, scale: 1.46, zOff: 34, baseTilt: 0.18 },
                { type: 'rose_bud', nx: 0.25, ny: 0.485, scale: 1.16, zOff: 30, baseTilt: -0.48 },
                { type: 'rose_bud', nx: 0.485, ny: 0.27, scale: 1.12, zOff: 28, baseTilt: 0.55 },
                { type: 'rose_petal', nx: 0.13, ny: 0.49, scale: 0.86, zOff: 22, baseTilt: -0.2 },
                { type: 'rose_petal', nx: 0.49, ny: 0.14, scale: 0.86, zOff: 22, baseTilt: 0.3 }
            ];
            roseCornerBouquets.forEach((rc, idx) => {
                escortFlowers.push({
                    type: rc.type,
                    nx: rc.nx,
                    ny: rc.ny,
                    zOff: rc.zOff,
                    baseTilt: rc.baseTilt || 0,
                    hasContactShadow: true,
                    phase: idx * 0.85,
                    rotSpeed: (idx % 2 === 0 ? 1 : -1) * (1.1 + (idx % 3) * 0.3),
                    size: 20 * rc.scale * motionScale
                });
            });
            const roseTotal = isLowEndDevice ? 36 : 52;
            for (let i = 0; i < roseTotal; i++) {
                const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.68;
                const spd = (320 + Math.random() * 480) * motionScale;
                const pType = i % 5 === 0 ? 'rose_bloom' : (i % 6 === 0 ? 'rose_bud' : (i % 8 === 0 ? 'star' : (i % 10 === 0 ? 'bokeh' : 'rose_petal')));
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
                    size: (pType === 'rose_bloom' || pType === 'rose_bud' ? (19 + Math.random() * 11) : (pType === 'bokeh' ? (14 + Math.random() * 12) : (pType === 'star' ? (9 + Math.random() * 6) : (13 + Math.random() * 9)))) * motionScale,
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
            // 🌷 THẢM HOA TULIP HÀ LAN VƯƠN LÊN ÔM ĐÁY THIỆP & SUỐI NẮNG BAN MAI BAY LÊN
            const tulipMeadowRow = [
                { nx: -0.45, ny: 0.455, scale: 1.18, zOff: 32, baseTilt: -0.26 },
                { nx: -0.34, ny: 0.475, scale: 1.06, zOff: 26, baseTilt: -0.18 },
                { nx: -0.23, ny: 0.485, scale: 1.26, zOff: 34, baseTilt: -0.11 },
                { nx: -0.11, ny: 0.490, scale: 1.10, zOff: 28, baseTilt: -0.05 },
                { nx: 0.00, ny: 0.492, scale: 1.34, zOff: 36, baseTilt: 0.00 },
                { nx: 0.11, ny: 0.490, scale: 1.10, zOff: 28, baseTilt: 0.05 },
                { nx: 0.23, ny: 0.485, scale: 1.26, zOff: 34, baseTilt: 0.11 },
                { nx: 0.34, ny: 0.475, scale: 1.06, zOff: 26, baseTilt: 0.18 },
                { nx: 0.45, ny: 0.455, scale: 1.18, zOff: 32, baseTilt: 0.26 }
            ];
            tulipMeadowRow.forEach((tc, idx) => {
                escortFlowers.push({
                    type: 'tulip_bloom',
                    nx: tc.nx,
                    ny: tc.ny,
                    zOff: tc.zOff,
                    baseTilt: tc.baseTilt,
                    hasContactShadow: true,
                    phase: idx * 0.72,
                    rotSpeed: 1.65,
                    size: 20 * tc.scale * motionScale
                });
            });
            const tulipTotal = isLowEndDevice ? 36 : 52;
            for (let i = 0; i < tulipTotal; i++) {
                const pType = i % 3 === 0 ? 'tulip_bloom' : (i % 5 === 0 ? 'bokeh' : (i % 8 === 0 ? 'star' : 'tulip_petal'));
                const spreadX = (Math.random() - 0.5) * 220 * motionScale;
                particles.push({
                    type: pType,
                    hasTrail: pType === 'star',
                    x: spreadX,
                    y: mouthY + (10 + Math.random() * 35) * motionScale,
                    z: (Math.random() - 0.5) * 260,
                    vx: (Math.random() - 0.5) * 190 * motionScale,
                    vy: (-280 - Math.random() * 380) * motionScale,
                    vz: (Math.random() - 0.5) * 240,
                    gravity: (pType === 'bokeh' ? -95 : -55) * motionScale,
                    drag: 1.08,
                    vortex: 0,
                    flutter: 135 * motionScale,
                    phase: Math.random() * Math.PI * 2,
                    size: (pType === 'tulip_bloom' ? (19 + Math.random() * 11) : (pType === 'bokeh' ? (15 + Math.random() * 14) : (pType === 'star' ? (9 + Math.random() * 6) : (13 + Math.random() * 8)))) * motionScale,
                    tintA: '#fff8e1',
                    tintB: '#fce4ec',
                    bokehColor: i % 2 === 0 ? 'rgba(254, 240, 138, 0.56)' : 'rgba(251, 113, 133, 0.48)',
                    rx: Math.random() * 6,
                    ry: Math.random() * 6,
                    rz: (Math.random() - 0.5) * 0.65,
                    vrx: (Math.random() - 0.5) * 4.2,
                    vry: (Math.random() - 0.5) * 5.2,
                    vrz: (Math.random() - 0.5) * 2.2,
                    alpha: 1,
                    life: 0,
                    maxLife: 2.75 + Math.random() * 0.65
                });
            }
        } else {
            const isSakura = cfg.id === 'sakura';
            // 🌺🌸 Khung Hoa Hộ Tống 3D cho Đại Hoa Trà (bloom) và Anh Đào Kyoto (sakura)
            const floralCornerClusters = isSakura ? [
                { type: 'sakura_bloom', nx: -0.45, ny: -0.45, scale: 1.38, zOff: 32 },
                { type: 'sakura_bloom', nx: -0.28, ny: -0.485, scale: 1.04, zOff: 26 },
                { type: 'petal', nx: -0.485, ny: -0.29, scale: 0.85, zOff: 24 },
                { type: 'sakura_bloom', nx: 0.45, ny: 0.45, scale: 1.38, zOff: 32 },
                { type: 'sakura_bloom', nx: 0.28, ny: 0.485, scale: 1.04, zOff: 26 },
                { type: 'petal', nx: 0.485, ny: 0.29, scale: 0.85, zOff: 24 }
            ] : [
                { type: 'camellia_bloom', nx: 0.45, ny: -0.45, scale: 1.46, zOff: 34 },
                { type: 'camellia_bloom', nx: 0.27, ny: -0.485, scale: 1.08, zOff: 28 },
                { type: 'petal', nx: 0.485, ny: -0.28, scale: 0.88, zOff: 24 },
                { type: 'camellia_bloom', nx: -0.45, ny: 0.45, scale: 1.46, zOff: 34 },
                { type: 'camellia_bloom', nx: -0.27, ny: 0.485, scale: 1.08, zOff: 28 },
                { type: 'petal', nx: -0.485, ny: 0.28, scale: 0.88, zOff: 24 }
            ];
            floralCornerClusters.forEach((fc, idx) => {
                escortFlowers.push({
                    type: fc.type,
                    isSakura,
                    nx: fc.nx,
                    ny: fc.ny,
                    zOff: fc.zOff,
                    hasContactShadow: true,
                    phase: idx * 0.9,
                    rotSpeed: (idx % 2 === 0 ? 1 : -1) * 1.15,
                    size: 20 * fc.scale * motionScale
                });
            });

            const total = isLowEndDevice ? 36 : (isSakura ? 48 : 44);
            const bloomType = isSakura ? 'sakura_bloom' : 'camellia_bloom';
            for (let i = 0; i < total; i++) {
                const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.55;
                const spd = (330 + Math.random() * 440) * motionScale;
                const pType = i % 5 === 0 ? bloomType : (i % 7 === 0 ? 'star' : (i % 9 === 0 ? 'bokeh' : 'petal'));
                particles.push({
                    type: pType,
                    isSakura,
                    hasTrail: pType === 'star',
                    x: (Math.random() - 0.5) * 130 * motionScale,
                    y: mouthY + 22 * motionScale,
                    z: (Math.random() - 0.5) * 260,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd - 110 * motionScale,
                    vz: (Math.random() - 0.5) * 330,
                    gravity: (pType === 'star' || pType === 'bokeh' ? -45 : (isSakura ? -65 : 82)) * motionScale,
                    drag: 1.28,
                    vortex: isSakura ? 3.1 : 2.1,
                    flutter: 155 * motionScale,
                    phase: Math.random() * 6,
                    size: (pType === bloomType ? (18 + Math.random() * 10) : (pType === 'bokeh' ? (14 + Math.random() * 10) : (isSakura ? (11 + Math.random() * 8) : (13 + Math.random() * 9)))) * motionScale,
                    bokehColor: isSakura ? 'rgba(255, 182, 213, 0.48)' : 'rgba(255, 215, 102, 0.46)',
                    colorMid: isSakura ? '#ffb2c9' : '#f48fb1',
                    colorEnd: isSakura ? '#d83a6f' : '#ad1457',
                    rx: Math.random() * 6,
                    ry: Math.random() * 6,
                    rz: Math.random() * 6,
                    vrx: (Math.random() - 0.5) * (pType === bloomType ? 5.5 : 9),
                    vry: (Math.random() - 0.5) * (pType === bloomType ? 5.5 : 9),
                    vrz: (Math.random() - 0.5) * (pType === bloomType ? 4.5 : 7),
                    alpha: 1,
                    life: 0,
                    maxLife: 2.55 + Math.random() * 0.6
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
        let didResizeWorld = false;
        if (window.innerWidth !== curVw || window.innerHeight !== curVh) {
            measureTargetShowcaseOnce();
            canvasBack.width = Math.round(curVw * dpr);
            canvasBack.height = Math.round(curVh * dpr);
            canvasFront.width = Math.round(curVw * dpr);
            canvasFront.height = Math.round(curVh * dpr);
            if (canvasWorld) {
                canvasWorld.width = Math.round(curVw * dpr);
                canvasWorld.height = Math.round(curVh * dpr);
                didResizeWorld = true;
            }
        }

        const screenCx = curVw * 0.5;
        const screenCy = curVh * 0.5;
        const envBaseW = cachedEnvBaseW;
        const envBaseH = envBaseW * 0.694;
        const envBaseCy = curVh * 0.50;
        const focal = 920;

        // ====== TRẠNG THÁI WISH-A: ĐẠI CẢNH ONE-SHOT "NỤ HOA ƯỚC NGUYỆN" (~6 GIÂY LIỀN MẠCH, KHÔNG CẮT CẢNH) ======
        // Ước nguyện rơi xuống hồ gương -> khu vườn bừng nở -> nụ hoa khổng lồ nở ra -> bức thư nằm trong lòng hoa -> nâng lên dâng tặng
        if (u3dCurrentDirectorState === 'wish_bloom' && wishBloom) {
            const floatT = now * 0.0022;
            const idleY = Math.sin(floatT) * 7;
            const idleRotZ = Math.cos(floatT * 0.7) * 1.2;
            wishBloom.step(dt);
            let env = null;
            try {
                env = wishBloom.render(ctxWorld, ctxFront, { vw: curVw, vh: curVh, dpr, envW: envBaseW, idleY, idleRotZ });
            } catch (wishErr) {
                console.error('Wish Bloom frame error:', wishErr);
            }
            // Khung hình đầu tiên đã vẽ xong -> gỡ màn chuyển cảnh CSS (hai lớp trùng khớp nên không thấy đường nối)
            if (window.WishBloomCutscene.hasPrelude()) window.WishBloomCutscene.endPrelude();

            cardActor.style.opacity = '0';
            if (env && env.visible) {
                const tf = `perspective(1400px) translate3d(${env.tx.toFixed(1)}px, ${env.ty.toFixed(1)}px, 0px) scale(${env.scale.toFixed(4)}) rotateX(${env.rotX.toFixed(2)}deg) rotateY(${env.rotY.toFixed(2)}deg) rotateZ(${env.rotZ.toFixed(2)}deg)`;
                backRig.style.transform = tf;
                frontRig.style.transform = tf;
                const op = env.opacity.toFixed(3);
                backRig.style.opacity = op;
                frontRig.style.opacity = op;
            } else {
                backRig.style.opacity = '0';
                frontRig.style.opacity = '0';
            }

            if (wishBloom.finished) {
                u3dCurrentDirectorState = 'wish_stamp';
                arriveStartTime = now;
                hasSpawnedArrivalStamp = false;
                stage.classList.remove('is-summoning');
                stage.classList.add('is-arriving');
            }
            u3dAnimFrameId = requestAnimationFrame(stepPhysicsDirector);
            return;
        }

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

        // ====== TRẠNG THÁI WISH-B: ẤN SÁP VÀNG GIÁNG XUỐNG ĐÓNG DẤU LÊN BỨC THƯ VỪA ĐƯỢC DÂNG TẶNG (0.62 GIÂY) ======
        if (u3dCurrentDirectorState === 'wish_stamp' && wishBloom) {
            if (arriveStartTime === null) arriveStartTime = now;
            const e = Math.max(0, (now - arriveStartTime) / 1000);
            const STAMP_TOTAL = 0.62;
            const floatT = now * 0.0022;
            const idleY = Math.sin(floatT) * 7;
            const idleRotZ = Math.cos(floatT * 0.7) * 1.2;
            wishBloom.step(dt);
            try {
                wishBloom.render(ctxWorld, ctxFront, { vw: curVw, vh: curVh, dpr, envW: envBaseW, idleY, idleRotZ });
            } catch (_) {}

            const sealP = Math.min(1, e / 0.52);
            let sealScale = 1.88;
            let sealTy = -46 * motionScale;
            let sealOp = 0;
            let recoil = 0;
            if (sealP < 0.62) {
                const d = sealP / 0.62;
                const ed = d * d;
                sealScale = 1.88 - 0.96 * ed;
                sealTy = -46 * motionScale * (1 - ed);
                sealOp = Math.min(1, d * 1.85);
            } else {
                const b = (sealP - 0.62) / 0.38;
                sealScale = 0.92 + 0.08 * Math.sin(b * Math.PI * 0.5);
                sealTy = 0;
                sealOp = 1;
                recoil = Math.sin(b * Math.PI) * 6;
                if (!hasSpawnedArrivalStamp) {
                    hasSpawnedArrivalStamp = true;
                    const mouthY0 = (envBaseCy - envBaseH * 0.24) - screenCy;
                    spawnSealBreakExplosion(mouthY0 + envBaseH * 0.28);
                    window.CardAudio?.playWaxSealStampImpact();
                }
            }
            const tf = `perspective(1400px) translate3d(0px, ${(idleY + recoil).toFixed(1)}px, 0px) rotateX(6deg) rotateY(0deg) rotateZ(${idleRotZ.toFixed(2)}deg)`;
            backRig.style.transform = tf;
            frontRig.style.transform = tf;
            backRig.style.opacity = '1';
            frontRig.style.opacity = '1';
            if (sealBtn) {
                sealBtn.style.opacity = sealOp.toFixed(2);
                sealBtn.style.transform = `translate3d(0px, ${sealTy.toFixed(1)}px, 0px) scale(${sealScale.toFixed(3)})`;
            }
            if (floorShadow) floorShadow.style.opacity = Math.min(1, e / STAMP_TOTAL).toFixed(2);
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

            if (e >= STAMP_TOTAL) {
                u3dCurrentDirectorState = 'waiting';
                stage.classList.remove('is-arriving');
                frontRig.style.pointerEvents = 'none';
                if (sealBtn) {
                    sealBtn.style.opacity = '1';
                    sealBtn.style.transform = 'translate3d(0,0,0) scale(1)';
                    sealBtn.style.pointerEvents = 'auto';
                }
                if (typeof window.ensureFinalCardRenderedOnce === 'function') {
                    setTimeout(() => {
                        if (typeof window.ensureFinalCardRenderedOnce === 'function') {
                            window.ensureFinalCardRenderedOnce();
                        }
                    }, 60);
                }
            }
            u3dAnimFrameId = requestAnimationFrame(stepPhysicsDirector);
            return;
        }

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

            // Pha 2 (0.66s -> 1.18s): Phong Ấn Vàng 24K từ trên giáng xuống đóng dấu lên nắp phong bì (giữ scale < 2.0 để tránh tái rasterize SVG trên Chromium)
            const sealP = Math.max(0, Math.min(1, (arriveElapsed - 0.66) / 0.52));
            let sealScale = 1.88;
            let sealTy = -46;
            let sealOp = 0;
            let envRecoilY = 0;

            if (sealP > 0) {
                if (sealP < 0.62) {
                    const downP = sealP / 0.62;
                    const easeDown = downP * downP;
                    sealScale = 1.88 - 0.96 * easeDown;
                    sealTy = -46 * (1 - easeDown);
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
                        window.CardAudio?.playWaxSealStampImpact();
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
                if (typeof window.ensureFinalCardRenderedOnce === 'function') {
                    setTimeout(() => {
                        if (typeof window.ensureFinalCardRenderedOnce === 'function') {
                            window.ensureFinalCardRenderedOnce();
                        }
                    }, 60);
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

            // Pha 2 (0.36s -> 0.76s): Con dấu sáp vàng 3D từ trên cao giáng xuống đóng dấu vào nắp phong bì (giữ scale < 2.0 để GPU không tái rasterize SVG)
            const sealP = Math.max(0, Math.min(1, (arriveElapsed - 0.36) / 0.40));
            let sealScale = 1.88;
            let sealTy = -38;
            let sealOp = 0;
            let envRecoilY = 0;

            if (sealP > 0) {
                if (sealP < 0.62) {
                    const downP = sealP / 0.62;
                    const easeDown = downP * downP;
                    sealScale = 1.88 - 0.96 * easeDown; // 1.88 -> 0.92
                    sealTy = -38 * (1 - easeDown);
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
                        window.CardAudio?.playWaxSealStampImpact();
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
                // Ngay sau khi phong bì đã lướt vào và đóng dấu sáp xong 100% (đang đứng yên ở trạng thái 'waiting'),
                // mới kết xuất ngầm ảnh tấm thiệp (nếu đang chờ hoãn kết xuất) để những giây đầu đóng sáp mượt 60-120fps tuyệt đối!
                if (typeof window.ensureFinalCardRenderedOnce === 'function') {
                    setTimeout(() => {
                        if (typeof window.ensureFinalCardRenderedOnce === 'function') {
                            window.ensureFinalCardRenderedOnce();
                        }
                    }, 60);
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

            if (wishBloom) {
                wishBloom.step(dt);
                try {
                    wishBloom.render(ctxWorld, ctxFront, { vw: curVw, vh: curVh, dpr, envW: envBaseW, idleY, idleRotZ });
                } catch (_) {}
            }

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
            if (cardInner) cardInner.style.transform = 'none';
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
        u3dOpenElapsed = elapsed;

        if (wishBloom) {
            // Giữ nguyên u3d-wish-cinematic suốt pha rung ấn sáp (0.00s -> 0.92s) để #showcase-bg-canvas hoàn toàn nghỉ ngơi;
            // đồng thời đóng băng khung hình cuối của Ao Hoa trên canvasWorld và chỉ làm mờ mượt qua GPU opacity!
            if (elapsed >= 0.92 && document.body.classList.contains('u3d-wish-cinematic')) {
                document.body.classList.remove('u3d-wish-cinematic');
            }
            const worldFade = 1 - Math.min(1, Math.max(0, (elapsed - 0.95) / 1.3));
            if (canvasWorld) canvasWorld.style.opacity = worldFade.toFixed(3);
            if (didResizeWorld && worldFade > 0.01) {
                try {
                    wishBloom.render(ctxWorld, ctxWorld, { vw: curVw, vh: curVh, dpr, envW: envBaseW, idleY: 0, idleRotZ: 0 });
                } catch (_) {}
            }
        }
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
            // Sau t = 0.88s: Phong ấn vỡ tung thành các mảnh sáp 3D vật lý -> ẩn ngay bản nguyên để không tạo bóng mờ đè lên mặt thiệp
            if (sealBtn) {
                const sp = Math.min(1, (elapsed - WINDUP_END) / 0.07);
                sealBtn.style.opacity = `${(1 - sp).toFixed(3)}`;
                sealBtn.style.transform = `translate3d(0, ${(-sp * 16 * motionScale).toFixed(1)}px, 0) scale(${(1.12 + sp * 0.16).toFixed(2)})`;
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
            const streamInterval = (cfg.id === 'galaxy' || cfg.id === 'hearts' || cfg.id === 'ribbon') ? 0.044 : 0.062;
            if (streamSpawnAccum >= streamInterval) {
                streamSpawnAccum = 0;
                const rVal = Math.random();
                const pType = cfg.id === 'butterflies' ? 'butterfly'
                    : (cfg.id === 'galaxy' ? (rVal < 0.22 ? 'rose_bloom' : (rVal < 0.38 ? 'rose_bud' : (rVal < 0.50 ? 'star' : 'rose_petal')))
                        : (cfg.id === 'hearts' ? (rVal < 0.36 ? 'tulip_bloom' : (rVal < 0.54 ? 'bokeh' : (rVal < 0.64 ? 'star' : 'tulip_petal')))
                            : (cfg.id === 'ribbon' ? (rVal < 0.22 ? 'silk_bow' : (rVal < 0.36 ? 'silk_streamer' : (rVal < 0.72 ? 'pearl' : 'star')))
                                : (cfg.id === 'sakura' ? (rVal < 0.25 ? 'sakura_bloom' : (rVal < 0.38 ? 'star' : 'petal'))
                                    : (rVal < 0.25 ? 'camellia_bloom' : (rVal < 0.38 ? 'star' : 'petal'))))));
                const isTulipMode = cfg.id === 'hearts';
                const isFullBloom = pType === 'rose_bloom' || pType === 'rose_bud' || pType === 'tulip_bloom' || pType === 'silk_bow' || pType === 'silk_streamer' || pType === 'camellia_bloom' || pType === 'sakura_bloom';
                particles.push({
                    type: pType,
                    isGold: Math.random() > 0.35,
                    isSakura: cfg.id === 'sakura',
                    hasTrail: pType === 'star',
                    x: (Math.random() - 0.5) * (isTulipMode ? 195 : 155) * motionScale,
                    y: envMouthWorldY + 26 * motionScale,
                    z: (Math.random() - 0.5) * 280 * motionScale,
                    vx: (Math.random() - 0.5) * (isTulipMode ? 185 : 290) * motionScale,
                    vy: (-330 - Math.random() * 350) * motionScale,
                    vz: (Math.random() - 0.5) * (isTulipMode ? 220 : 320) * motionScale,
                    gravity: (pType === 'butterfly' || cfg.id === 'sakura' || pType === 'star' || isTulipMode) ? -55 : 95,
                    drag: isTulipMode ? 1.08 : 1.2,
                    vortex: isTulipMode ? 0 : ((pType === 'silk_bow' || pType === 'silk_streamer') ? 0.65 : 2.3),
                    flutter: 140 * motionScale,
                    phase: Math.random() * 6,
                    flapPhase: Math.random() * 6,
                    flapSpeed: 40,
                    size: (pType === 'butterfly' ? 16 : (isFullBloom ? (17 + Math.random() * 7) : (pType === 'bokeh' ? (14 + Math.random() * 10) : (pType === 'pearl' ? 6.5 : (pType === 'star' ? 9 : 12.5))))) * motionScale,
                    tintA: '#ffe5ec',
                    tintB: '#fff3b0',
                    bokehColor: rVal < 0.45 ? 'rgba(254, 240, 138, 0.54)' : 'rgba(251, 113, 133, 0.46)',
                    colorMid: cfg.id === 'sakura' ? '#ffb2c9' : '#f48fb1',
                    colorEnd: cfg.id === 'sakura' ? '#d83a6f' : '#ad1457',
                    rx: Math.random() * 6, ry: Math.random() * 6, rz: isTulipMode || pType === 'silk_bow' ? (Math.random() - 0.5) * 0.6 : Math.random() * 6,
                    vrx: (Math.random() - 0.5) * 5, vry: (Math.random() - 0.5) * 5, vrz: (Math.random() - 0.5) * (isTulipMode || pType === 'silk_bow' ? 2.0 : 6),
                    alpha: 1,
                    life: 0,
                    maxLife: 2.25
                });
            }
        }

        // ---------------------------------------------------------------------------------
        // PHA C: TÍNH TOÁN QUỸ ĐẠO PHONG BÌ & TẤM THIỆP ĐỂ THIỆP ĐI RA TỪ TỪ 0% -> 100% (KHÔNG BAO GIỜ NHẢY BẬC!)
        // ---------------------------------------------------------------------------------
        const targetCx = targetRect.left + baseW * 0.5;
        const targetCy = targetRect.top + baseH * 0.5;

        const extractedScale = pocketScale;
        const extractedH = baseH * extractedScale;
        const extractedCy = Math.max(extractedH * 0.52, targetCy - 18);
        const extractedBottomY = extractedCy + extractedH * 0.5;

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
            const ep = (elapsed - EXTRACT_START) / (EXTRACT_END - EXTRACT_START);
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

        if (['bloom', 'galaxy', 'hearts', 'sakura'].includes(cfg.id) && elapsed >= WINDUP_END + 0.02 && elapsed <= 1.38) {
            const bp = Math.min(1, (elapsed - (WINDUP_END + 0.02)) / 0.36);
            const easeBp = 1 - Math.pow(1 - bp, 3);
            const coreScaleOut = elapsed > 1.12 ? Math.max(0, 1 - (elapsed - 1.12) / 0.26) : 1;
            if (coreScaleOut > 0.08 && envOpacity > 0.2) {
                const pocketSpecies = cfg.id === 'galaxy' ? 'rose' : (cfg.id === 'hearts' ? 'tulip' : (cfg.id === 'sakura' ? 'sakura' : 'camellia'));
                const mouthSx = screenCx + envX;
                const mouthSy = envBaseCy + envY - (envBaseH * 0.14 * envScale) - easeBp * 52 * motionScale;
                const mainR = (18 + easeBp * 28) * coreScaleOut * motionScale * envScale;
                ctxBack.save();
                ctxBack.translate(mouthSx, mouthSy);
                ctxBack.globalAlpha = 1.0;
                drawTrue3DFlower(
                    ctxBack,
                    pocketSpecies,
                    mainR,
                    0.42 - easeBp * 0.24 + Math.sin(elapsed * 3.2) * 0.08,
                    (elapsed - WINDUP_END) * 1.45,
                    easeBp * 0.38,
                    0.22 + 0.78 * easeBp
                );
                ctxBack.restore();
                // 2 Đóa hoa 3D vệ tinh nghiêng góc sâu 3D hai bên miệng phong bì
                for (const side of [-1, 1]) {
                    ctxBack.save();
                    ctxBack.translate(
                        mouthSx + side * (28 + easeBp * 42) * motionScale * envScale,
                        mouthSy + (6 + easeBp * 4) * motionScale * envScale
                    );
                    ctxBack.globalAlpha = 1.0;
                    drawTrue3DFlower(
                        ctxBack,
                        pocketSpecies === 'rose' ? 'rose_bud' : pocketSpecies,
                        mainR * 0.72,
                        0.52 - easeBp * 0.16,
                        side * (0.62 + easeBp * 0.35),
                        side * (0.36 + easeBp * 0.25),
                        0.18 + 0.76 * easeBp
                    );
                    ctxBack.restore();
                }
            }
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
        let cardOpacity = elapsed < WINDUP_END ? 0 : Math.min(1, Math.max(0, (flapAngle - 28) / 36));
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
            cardOpacity = 1;
            const pp = (elapsed - EXTRACT_START) / (EXTRACT_END - EXTRACT_START);
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

            const curCardH = baseH * cardScale;
            bottomClipScreenPx = Math.max(0, (cardCy + curCardH * 0.5) - envBottomScreenY);
        } else {
            // (2.32s -> 2.94s): Toàn bộ 100% tấm thiệp đã ra khỏi miệng bì thư!
            if (!stage.classList.contains('pocket-cleared')) {
                stage.classList.add('pocket-cleared');
            }
            bottomClipScreenPx = 0;

            const fp = Math.min(1, (elapsed - EXTRACT_END) / (PRESENT_END - EXTRACT_END));
            const easeExpand = 1 - Math.pow(1 - fp, 3.2);
            const rem = Math.pow(1 - fp, 2.2);

            cardCx = screenCx + (targetCx - screenCx) * easeExpand;
            cardCy = extractedCy + (targetCy - extractedCy) * easeExpand;
            cardScale = pocketScale + (1.0 - pocketScale) * easeExpand;
            cardZ = 28 * (1 - easeExpand) + Math.sin(fp * Math.PI) * 38 * rem;

            cardRotX = -Math.sin(fp * Math.PI) * 6 * rem;
            cardRotY = Math.sin(fp * Math.PI) * (cfg.id === 'butterflies' ? -9 : 9) * rem;
            cardRotZ = Math.sin(fp * Math.PI) * 1.8 * rem;

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

        // Áp dụng vị trí & tỷ lệ cho Tấm Thiệp BẰNG THUẦN GPU TRANSFORM
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

        // Quét vệt ánh kim phản quang vật lý (Specular Glare) theo góc nghiêng 3D thực tế của thiệp
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
        const cardGrowRatio = cardScale / Math.max(0.28, pocketScale);

        // Cập nhật 4 Hồ Điệp Chúa Hộ Tống 4 góc tấm thiệp (Butterflies) — Khóa chuẩn 1:1 theo kích thước thực của thiệp
        if (escortButterflies.length > 0 && elapsed >= EXTRACT_START && elapsed <= 3.35) {
            const fadeEscort = elapsed > 2.68 ? Math.max(0, 1 - (elapsed - 2.68) / 0.65) : 1;
            const outroGlide = elapsed > 2.75 ? (elapsed - 2.75) * 0.18 : 0;
            escortButterflies.forEach(eb => {
                eb.flapPhase += eb.flapSpeed * dt;
                const ez = cardZ + 28;
                const projScale = focal / Math.max(120, focal - ez);
                const targetScreenX = cardCx + eb.sx * curCardW * (0.48 + outroGlide);
                const targetScreenY = cardCy + eb.sy * curCardH * (0.44 + outroGlide * 0.7);
                draw3DProjectedParticle(ctxFront, {
                    type: 'butterfly',
                    isGold: true,
                    hasContactShadow: true,
                    x: (targetScreenX - screenCx) / projScale,
                    y: (targetScreenY - screenCy) / projScale,
                    z: ez,
                    vx: eb.sx * 24,
                    vy: -65,
                    rx: 0.42 + Math.sin(eb.flapPhase * 0.25) * 0.18,
                    ry: eb.sx * 0.46 + Math.cos(eb.flapPhase * 0.2) * 0.22,
                    rz: eb.sx * 0.22,
                    flapPhase: eb.flapPhase,
                    phase: eb.flapPhase,
                    size: (eb.size * cardGrowRatio) / projScale,
                    alpha: fadeEscort
                }, screenCx, screenCy, focal);
            });
        }

        // Cập nhật Trang Trí 3D Bám Khít Khung Thiệp (Nơ Lụa Vương Miện / Cụm Hồng Pháp / Đại Hoa Trà / Anh Đào Kyoto / Thảm Tulip)
        if (escortFlowers.length > 0 && elapsed >= EXTRACT_START && elapsed <= 3.38) {
            const bloomIn = Math.min(1, (elapsed - EXTRACT_START) / 0.42);
            const easeBloomIn = 1 - Math.pow(1 - bloomIn, 3);
            const fadeEscort = elapsed > 2.68 ? Math.max(0, 1 - (elapsed - 2.68) / 0.68) : 1;
            const outroBreath = elapsed > 2.78 ? (elapsed - 2.78) * 0.08 : 0;
            escortFlowers.forEach((ef, idx) => {
                ef.phase += dt * ef.rotSpeed;
                const swayAmp = (ef.type === 'silk_bow' || ef.type === 'pearl') ? 3.5 : 5.8;
                const swayX = Math.sin(ef.phase * 1.35) * swayAmp * motionScale * cardGrowRatio;
                const swayY = Math.cos(ef.phase * 1.1) * (swayAmp * 0.75) * motionScale * cardGrowRatio;
                const ez = cardZ + ef.zOff;
                const projScale = focal / Math.max(120, focal - ez);
                const targetScreenX = cardCx + ef.nx * curCardW * (1 + outroBreath) + swayX;
                const targetScreenY = cardCy + ef.ny * curCardH * (1 + outroBreath) + swayY;
                const screenSize = ef.size * cardGrowRatio * (0.32 + 0.68 * easeBloomIn);
                const targetCtx = ez < cardZ ? ctxBack : ctxFront;
                const isStemmed = ef.type === 'tulip_bloom' || ef.type === 'rose_bud' || ef.type === 'silk_bow';
                draw3DProjectedParticle(targetCtx, {
                    type: ef.type,
                    x: (targetScreenX - screenCx) / projScale,
                    y: (targetScreenY - screenCy) / projScale,
                    z: ez,
                    isSakura: Boolean(ef.isSakura),
                    hasContactShadow: ef.hasContactShadow !== false,
                    openAmt: 0.24 + 0.76 * easeBloomIn,
                    tintA: '#fff0f5',
                    tintB: '#ffe4e6',
                    colorMid: '#fb7185',
                    colorEnd: '#be123c',
                    rx: isStemmed
                        ? 0.34 + Math.sin(ef.phase * 0.85 + idx) * 0.24
                        : 0.48 + Math.sin(ef.phase * 0.75 + idx * 0.7) * 0.32,
                    ry: isStemmed
                        ? (ef.nx >= 0 ? 0.38 : -0.38) + Math.cos(ef.phase * 0.95 + idx) * 0.32
                        : ef.phase * 0.85 + idx * 1.1,
                    rz: isStemmed
                        ? (ef.baseTilt || 0) + Math.sin(ef.phase) * 0.14
                        : (ef.baseTilt || 0) + ef.phase * 0.38,
                    size: screenSize / projScale,
                    alpha: fadeEscort * Math.min(1, bloomIn * 1.85)
                }, screenCx, screenCy, focal);
            });
        }

        // Cập nhật & vẽ Hệ Hạt Vật Lý 3D (z < cardZ vẽ ở ctxBack, z >= cardZ vẽ ở ctxFront)
        const isCardRising = elapsed >= EXTRACT_START && elapsed <= EXTRACT_END;
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life += dt;
            if (p.life >= p.maxLife) {
                particles[i] = particles[particles.length - 1];
                particles.pop();
                continue;
            }

            const dragFactor = Math.max(0, 1 - p.drag * dt);
            p.vx *= dragFactor;
            p.vy *= dragFactor;
            p.vz *= dragFactor;
            p.vy += p.gravity * dt;

            // Luồng khí động học (Card-Wake Aerodynamics): Khi tấm thiệp trồi lên khỏi bì thư, tạo lực nâng & rẽ sóng vật lý lên các cánh hoa/hồ điệp xung quanh mép thiệp
            if (isCardRising && Math.abs(p.z - cardZ) < 110) {
                const dxCard = p.x - cardWorldX;
                const dyCard = p.y - cardWorldY;
                const halfW = curCardW * 0.56;
                const halfH = curCardH * 0.54;
                if (Math.abs(dxCard) < halfW && Math.abs(dyCard) < halfH) {
                    const pushSign = dxCard >= 0 ? 1 : -1;
                    p.vx += pushSign * 85 * motionScale * dt;
                    p.vy -= 52 * motionScale * dt;
                }
            }

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
            if (wishBloom) {
                wishBloom.destroy();
                wishBloom = null;
                window.u3dWishBloomScene = null;
            }
            if (ctxWorld) {
                ctxWorld.setTransform(1, 0, 0, 1, 0, 0);
                ctxWorld.clearRect(0, 0, canvasWorld.width, canvasWorld.height);
                canvasWorld.style.opacity = '1';
            }
            document.body.classList.remove('u3d-wish-cinematic');
            stage.style.display = 'none';
            stage.classList.remove('is-summoning', 'is-arriving', 'is-opening', 'pocket-cleared', 'handing-off');
            document.body.classList.remove('u3d-stage-active');
            if (cardShowcase) cardShowcase.style.opacity = '1';
            u3dCurrentDirectorState = 'hidden';
            u3dOpenElapsed = 0;
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

    // 1. Lớp Hào Quang Bokeh Chiều Sâu Quang Học (Optical Depth-of-Field Bokeh Orbs) cho mọi thế giới
    const bokehVariantList = {
        bloom: ['rose', 'gold', 'rose', 'gold'],
        butterflies: ['gold', 'emerald', 'gold', 'emerald'],
        ribbon: ['rose', 'gold', 'rose', 'gold'],
        galaxy: ['rose', 'gold', 'rose', 'rose'],
        sakura: ['rose', 'gold', 'rose', 'rose'],
        hearts: ['gold', 'rose', 'gold', 'rose']
    }[motionId] || ['rose', 'gold'];

    for (let i = 0; i < 14; i++) {
        actors.push({
            kind: 'bokeh_orb',
            x: Math.random() * w,
            y: Math.random() * h,
            radius: (22 + Math.random() * 44) * bgScale,
            vx: (Math.random() - 0.5) * 0.22 * bgScale,
            vy: (-0.15 - Math.random() * 0.25) * bgScale,
            phase: Math.random() * Math.PI * 2,
            alpha: 0.16 + Math.random() * 0.22,
            variant: bokehVariantList[i % bokehVariantList.length]
        });
    }

    if (motionId === 'bloom') {
        // 🌺 VƯỜN THƯỢNG UYỂN ĐẠI HOA TRÀ 3D: Những đóa Hoa Trà nhiều tầng cánh nở xoay 3D + Cánh hoa nhung & Phấn hoàng kim
        for (let i = 0; i < 9; i++) {
            const isHero = i < 3;
            actors.push({
                kind: 'grand_camellia',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (isHero ? (22 + Math.random() * 10) : (14 + Math.random() * 11)) * bgScale,
                vx: (Math.random() - 0.5) * 0.35 * bgScale,
                vy: (-0.28 - Math.random() * 0.38) * bgScale,
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.014,
                tiltPhase: Math.random() * Math.PI * 2,
                alpha: isHero ? (0.76 + Math.random() * 0.18) : (0.50 + Math.random() * 0.34)
            });
        }
        for (let i = 0; i < 28; i++) {
            actors.push({
                kind: 'camellia_petal',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (10 + Math.random() * 11) * bgScale,
                vx: (-0.3 + Math.random() * 0.6) * bgScale,
                vy: (-0.45 - Math.random() * 0.65) * bgScale,
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.025,
                swayPhase: Math.random() * Math.PI * 2,
                alpha: 0.56 + Math.random() * 0.38
            });
        }
        for (let i = 0; i < 18; i++) {
            actors.push({
                kind: 'firefly_glow',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (3 + Math.random() * 4.5) * bgScale,
                vx: (Math.random() - 0.5) * 0.32 * bgScale,
                vy: (-0.28 - Math.random() * 0.38) * bgScale,
                pulsePhase: Math.random() * Math.PI * 2,
                variant: i % 3 === 0 ? 'rose' : 'gold'
            });
        }
    } else if (motionId === 'butterflies') {
        // 🦋 RỪNG THIÊNG HỒ ĐIỆP ÁNH KIM: Đàn Bướm Hoàng Kim 3D 4 cánh khớp nối độc lập + Đom đóm Ngọc Lục Bảo phát quang
        for (let i = 0; i < 16; i++) {
            const isClose = i < 5;
            actors.push({
                kind: 'monarch_butterfly',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (isClose ? (16 + Math.random() * 8) : (10 + Math.random() * 7)) * bgScale,
                vx: (Math.random() - 0.5) * 0.85 * bgScale,
                vy: (-0.55 - Math.random() * 0.75) * bgScale,
                flapPhase: Math.random() * Math.PI * 2,
                flapSpeed: 0.16 + Math.random() * 0.08,
                swayPhase: Math.random() * Math.PI * 2,
                alpha: isClose ? (0.82 + Math.random() * 0.16) : (0.52 + Math.random() * 0.35),
                isGold: i % 3 !== 0
            });
        }
        for (let i = 0; i < 28; i++) {
            actors.push({
                kind: 'firefly_glow',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (3 + Math.random() * 4.8) * bgScale,
                vx: (Math.random() - 0.5) * 0.45 * bgScale,
                vy: (-0.25 - Math.random() * 0.45) * bgScale,
                pulsePhase: Math.random() * Math.PI * 2,
                variant: i % 3 === 0 ? 'emerald' : 'gold'
            });
        }
    } else if (motionId === 'ribbon') {
        // 🎀 KHÁN PHÒNG LỤA HOÀNG GIA & NGỌC TRAI: Nơ Lụa 3D Satin + Dải Ruy-băng lượn sóng 3D + Ngọc Trai Nam Hải
        for (let i = 0; i < 9; i++) {
            actors.push({
                kind: 'couture_bow',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (15 + Math.random() * 11) * bgScale,
                vx: (Math.random() - 0.5) * 0.35 * bgScale,
                vy: (-0.32 - Math.random() * 0.45) * bgScale,
                rot: (Math.random() - 0.5) * 0.45,
                swayPhase: Math.random() * Math.PI * 2,
                alpha: 0.58 + Math.random() * 0.36
            });
        }
        for (let i = 0; i < 14; i++) {
            actors.push({
                kind: 'silk_petal_ribbon',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (15 + Math.random() * 12) * bgScale,
                vx: (Math.random() - 0.5) * 0.45 * bgScale,
                vy: (-0.38 - Math.random() * 0.5) * bgScale,
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.018,
                phase: Math.random() * Math.PI * 2,
                alpha: 0.52 + Math.random() * 0.36
            });
        }
        for (let i = 0; i < 24; i++) {
            actors.push({
                kind: 'lustrous_pearl',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (5 + Math.random() * 6.5) * bgScale,
                vy: (-0.28 - Math.random() * 0.45) * bgScale,
                swayPhase: Math.random() * Math.PI * 2,
                alpha: 0.62 + Math.random() * 0.35
            });
        }
    } else if (motionId === 'galaxy') {
        // 🌹 ĐẠI VƯỜN HỒNG NHUNG PHÁP CENTIFOLIA & SƯƠNG MAI HOÀNG KIM 3D
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
        for (let i = 0; i < 14; i++) {
            const isHeroForeground = i < 4;
            actors.push({
                kind: 'french_rose_bloom',
                isBud: i % 3 === 1,
                x: Math.random() * w,
                y: Math.random() * h,
                size: (isHeroForeground ? (24 + Math.random() * 11) : (15 + Math.random() * 12)) * bgScale,
                vx: (Math.random() - 0.5) * 0.42 * bgScale,
                vy: (-0.34 - Math.random() * 0.48) * bgScale,
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.015,
                tiltPhase: Math.random() * Math.PI * 2,
                alpha: isHeroForeground ? (0.80 + Math.random() * 0.18) : (0.56 + Math.random() * 0.34)
            });
        }
        for (let i = 0; i < 34; i++) {
            actors.push({
                kind: 'french_rose_petal',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (10.5 + Math.random() * 12) * bgScale,
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
                size: (3 + Math.random() * 4.5) * bgScale,
                vx: (Math.random() - 0.5) * 0.34 * bgScale,
                vy: (-0.26 - Math.random() * 0.38) * bgScale,
                pulsePhase: Math.random() * Math.PI * 2,
                variant: i % 3 === 0 ? 'rose' : 'gold'
            });
        }
        for (let i = 0; i < 12; i++) {
            actors.push({
                kind: 'gold_sparkle',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (4.8 + Math.random() * 6.0) * bgScale,
                vy: (-0.26 - Math.random() * 0.38) * bgScale,
                phase: Math.random() * Math.PI * 2,
                color: i % 2 === 0 ? '#fff1f2' : '#fde047'
            });
        }
    } else if (motionId === 'sakura') {
        // 🌸 ĐÊM TRĂNG MƯA HOA ANH ĐÀO KYOTO 3D: Đóa Anh Đào kép xoay 3D + Cánh hoa chẻ đôi bay lượn + Đom đóm ấm
        for (let i = 0; i < 10; i++) {
            const isHero = i < 3;
            actors.push({
                kind: 'sakura_blossom',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (isHero ? (20 + Math.random() * 9) : (13 + Math.random() * 9)) * bgScale,
                vx: (0.35 + Math.random() * 0.55) * bgScale,
                vy: (0.42 + Math.random() * 0.65) * bgScale,
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.022,
                tiltPhase: Math.random() * Math.PI * 2,
                alpha: isHero ? (0.78 + Math.random() * 0.18) : (0.55 + Math.random() * 0.35)
            });
        }
        for (let i = 0; i < 34; i++) {
            actors.push({
                kind: 'sakura_petal',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (9 + Math.random() * 9.5) * bgScale,
                vx: (0.5 + Math.random() * 0.85) * bgScale,
                vy: (0.58 + Math.random() * 0.9) * bgScale,
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.032,
                flipPhase: Math.random() * Math.PI * 2,
                alpha: 0.58 + Math.random() * 0.38
            });
        }
        for (let i = 0; i < 16; i++) {
            actors.push({
                kind: 'firefly_glow',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (2.8 + Math.random() * 4.2) * bgScale,
                vx: (Math.random() - 0.5) * 0.3 * bgScale,
                vy: (-0.25 - Math.random() * 0.35) * bgScale,
                pulsePhase: Math.random() * Math.PI * 2,
                variant: i % 2 === 0 ? 'gold' : 'rose'
            });
        }
    } else if (motionId === 'hearts') {
        // 🌷 ĐẠI VƯỜN TULIP HOÀNG GIA HÀ LAN NẮNG MAI 3D
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
                size: (3 + Math.random() * 4.4) * bgScale,
                vx: (Math.random() - 0.5) * 0.32 * bgScale,
                vy: (-0.25 - Math.random() * 0.36) * bgScale,
                pulsePhase: Math.random() * Math.PI * 2,
                variant: i % 2 === 0 ? 'gold' : 'rose'
            });
        }
        for (let i = 0; i < 20; i++) {
            actors.push({
                kind: 'gold_sparkle',
                x: Math.random() * w,
                y: Math.random() * h,
                size: (5.0 + Math.random() * 6.5) * bgScale,
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

    let atlas = null;
    let lastTime = performance.now();
    let bgFrameTick = 0;
    let hasRenderedInitialBgFrame = false;
    let cachedW = dims.w;
    let cachedH = dims.h;
    let cachedDpr = dims.dpr;

    const renderLoop = (now) => {
        showcaseBgAnimFrameId = requestAnimationFrame(renderLoop);
        if (document.hidden || !step3 || !step3.classList.contains('active')) return;
        if (document.body.classList.contains('u3d-wish-cinematic')) return;

        // Khi phong bì đang bay vào đóng dấu sáp (arriving / wish_stamp / sky_descending / summoning)
        // hoặc khi vừa bấm ấn sáp mở thiệp (0.00s -> 1.35s: lấy đà ấn sáp + vỡ sáp + đỉnh điểm phun trào túi chữ V),
        // đóng băng tạm thời khung hình nền #showcase-bg-canvas trên GPU (sau khi đã vẽ 1 frame nền tĩnh đầu tiên)
        // để nhường 100% chu kỳ CPU/GPU cho hiệu ứng 3D tiền cảnh mượt 60fps!
        if (hasRenderedInitialBgFrame) {
            if (
                u3dCurrentDirectorState === 'arriving' ||
                u3dCurrentDirectorState === 'wish_stamp' ||
                u3dCurrentDirectorState === 'sky_descending' ||
                u3dCurrentDirectorState === 'summoning'
            ) {
                return;
            }
            if (u3dCurrentDirectorState === 'opening') {
                if (u3dOpenElapsed < 1.35) return;
                bgFrameTick = (bgFrameTick + 1) % 3;
                if (bgFrameTick !== 0) return;
            }
        }
        if (!atlas) atlas = getU3DLuxurySpriteAtlas();
        hasRenderedInitialBgFrame = true;

        lastTime = now;
        const t = now * 0.001;

        if (window.innerWidth !== cachedW || window.innerHeight !== cachedH) {
            const nextDims = resizeCanvas();
            cachedW = nextDims.w;
            cachedH = nextDims.h;
            cachedDpr = nextDims.dpr;
        }
        const w = cachedW;
        const h = cachedH;
        const dpr = cachedDpr;

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
                if (!a._grad) {
                    const rayGrad = ctx.createLinearGradient(-a.width * 0.5, 0, a.width * 0.5, 0);
                    rayGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
                    rayGrad.addColorStop(0.5, a.color);
                    rayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    a._grad = rayGrad;
                }
                ctx.fillStyle = a._grad;
                ctx.fillRect(-a.width * 0.5, 0, a.width, a.length);
                ctx.restore();
            } else if (a.kind === 'bokeh_orb') {
                a.x += a.vx + Math.sin(t * 0.8 + a.phase) * 0.18;
                a.y += a.vy;
                if (a.y < -a.radius * 1.5) { a.y = h + a.radius; a.x = Math.random() * w; }
                if (a.x < -a.radius * 1.5) a.x = w + a.radius;
                if (a.x > w + a.radius * 1.5) a.x = -a.radius;

                const breathe = 0.72 + 0.28 * Math.sin(t * 1.6 + a.phase);
                const bokehSprite = a.variant === 'emerald' ? atlas.bokehEmerald : (a.variant === 'gold' ? atlas.bokehGold : atlas.bokehRose);
                const r = a.radius * (0.92 + 0.12 * breathe);
                ctx.save();
                ctx.globalAlpha = a.alpha * breathe;
                ctx.drawImage(bokehSprite, a.x - r, a.y - r, r * 2, r * 2);
                ctx.restore();
            } else if (a.kind === 'grand_camellia') {
                a.x += a.vx + Math.sin(t * 1.1 + a.tiltPhase) * 0.32;
                a.y += a.vy;
                a.rot += a.vRot;
                if (a.y < -52) { a.y = h + 46; a.x = Math.random() * w; }
                if (a.x < -52) a.x = w + 46;
                if (a.x > w + 52) a.x = -46;

                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.globalAlpha = a.alpha;
                drawTrue3DFlower(
                    ctx,
                    'camellia',
                    a.size * 1.18,
                    0.45 + 0.35 * Math.sin(t * 1.3 + a.tiltPhase),
                    t * 0.65 + a.tiltPhase,
                    a.rot,
                    0.78 + 0.18 * Math.sin(t * 1.1 + a.tiltPhase)
                );
                ctx.restore();
            } else if (a.kind === 'camellia_petal') {
                a.x += a.vx + Math.sin(t * 1.5 + a.swayPhase) * 0.42;
                a.y += a.vy;
                a.rot += a.vRot;
                if (a.y < -32) { a.y = h + 28; a.x = Math.random() * w; }
                if (a.x < -32) a.x = w + 28;
                if (a.x > w + 32) a.x = -28;

                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.globalAlpha = a.alpha;
                drawTrue3DPetal(
                    ctx,
                    'camellia',
                    a.size * 1.08,
                    t * 1.4 + a.swayPhase,
                    t * 1.85 + a.swayPhase * 0.7,
                    a.rot
                );
                ctx.restore();
            } else if (a.kind === 'monarch_butterfly') {
                a.flapPhase += a.flapSpeed;
                const sway = Math.sin(t * 1.8 + a.swayPhase) * 0.65;
                a.x += a.vx + sway;
                a.y += a.vy;
                if (a.y < -44) { a.y = h + 38; a.x = Math.random() * w; }
                if (a.x < -44) a.x = w + 38;
                if (a.x > w + 44) a.x = -38;

                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.globalAlpha = a.alpha;
                drawTrue3DButterfly(
                    ctx,
                    a.size * 1.18,
                    0.42 + 0.22 * Math.sin(t * 1.4 + a.swayPhase),
                    (a.vx + sway) * 0.55 + Math.cos(t * 1.2 + a.swayPhase) * 0.35,
                    (a.vx + sway) * 0.25,
                    a.flapPhase,
                    a.isGold
                );
                ctx.restore();
            } else if (a.kind === 'firefly_glow') {
                a.x += (a.vx || 0) + Math.sin(t * 1.5 + a.pulsePhase) * 0.35;
                a.y += (a.vy || -0.3);
                if (a.y < -24) { a.y = h + 20; a.x = Math.random() * w; }
                if (a.y > h + 24) { a.y = -20; a.x = Math.random() * w; }
                if (a.x < -24) a.x = w + 20;
                if (a.x > w + 24) a.x = -20;

                const pulse = 0.42 + 0.58 * Math.pow(0.5 + 0.5 * Math.sin(t * 2.8 + a.pulsePhase), 2);
                const ffSprite = a.variant === 'emerald' ? atlas.fireflyEmerald : (a.variant === 'rose' ? atlas.fireflyRose : atlas.fireflyGold);
                const r = a.size * (2.6 + 0.9 * pulse);
                ctx.save();
                ctx.globalAlpha = 0.88 * pulse;
                ctx.drawImage(ffSprite, a.x - r, a.y - r, r * 2, r * 2);
                ctx.restore();
            } else if (a.kind === 'couture_bow') {
                a.x += a.vx + Math.sin(t * 1.3 + a.swayPhase) * 0.35;
                a.y += a.vy;
                if (a.y < -44) { a.y = h + 38; a.x = Math.random() * w; }
                if (a.x < -44) a.x = w + 38;
                if (a.x > w + 44) a.x = -38;

                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.globalAlpha = a.alpha;
                drawTrue3DSilkBow(
                    ctx,
                    a.size * 1.18,
                    0.28 + Math.sin(t * 1.4 + a.swayPhase) * 0.22,
                    Math.cos(t * 1.6 + a.swayPhase) * 0.36,
                    a.rot + Math.sin(t * 1.6 + a.swayPhase) * 0.15,
                    atlas
                );
                ctx.restore();
            } else if (a.kind === 'silk_petal_ribbon') {
                a.x += a.vx + Math.sin(t * 1.4 + a.phase) * 0.45;
                a.y += a.vy;
                a.rot += a.vRot;
                if (a.y < -40) { a.y = h + 34; a.x = Math.random() * w; }
                if (a.x < -40) a.x = w + 34;
                if (a.x > w + 40) a.x = -34;

                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.globalAlpha = a.alpha;
                drawTrue3DSilkStreamer(
                    ctx,
                    a.size * 1.15,
                    t * 1.3 + a.phase,
                    t * 1.7 + a.phase * 0.6,
                    a.rot
                );
                ctx.restore();
            } else if (a.kind === 'lustrous_pearl') {
                a.x += Math.sin(t * 1.4 + a.swayPhase) * 0.32;
                a.y += a.vy;
                if (a.y < -24) { a.y = h + 20; a.x = Math.random() * w; }

                const s = a.size;
                ctx.save();
                ctx.globalAlpha = a.alpha;
                ctx.drawImage(atlas.pearl, a.x - s * 1.35, a.y - s * 1.35, s * 2.7, s * 2.7);
                ctx.restore();
            } else if (a.kind === 'french_rose_bloom') {
                a.x += a.vx + Math.sin(t * 1.1 + a.tiltPhase) * 0.36;
                a.y += a.vy;
                a.rot += a.vRot;
                if (a.y < -48) { a.y = h + 42; a.x = Math.random() * w; }
                if (a.x < -48) a.x = w + 42;
                if (a.x > w + 48) a.x = -42;

                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.globalAlpha = a.alpha;
                drawTrue3DFlower(
                    ctx,
                    a.isBud ? 'rose_bud' : 'rose',
                    a.size * 1.18,
                    0.42 + 0.28 * Math.sin(t * 1.4 + a.tiltPhase),
                    a.isBud ? Math.cos(t * 1.5 + a.tiltPhase) * 0.42 : (t * 0.72 + a.tiltPhase),
                    a.isBud ? Math.sin(t * 1.4 + a.tiltPhase) * 0.22 : a.rot,
                    a.isBud ? (0.48 + 0.16 * Math.sin(t + a.tiltPhase)) : (0.78 + 0.18 * Math.sin(t + a.tiltPhase))
                );
                ctx.restore();
            } else if (a.kind === 'french_rose_petal') {
                a.x += a.vx + Math.sin(t * 1.6 + a.swayPhase) * 0.45;
                a.y += a.vy;
                a.rot += a.vRot;
                if (a.y < -32) { a.y = h + 28; a.x = Math.random() * w; }
                if (a.x < -32) a.x = w + 28;
                if (a.x > w + 32) a.x = -28;

                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.globalAlpha = a.alpha;
                drawTrue3DPetal(
                    ctx,
                    'rose',
                    a.size * 1.08,
                    t * 1.5 + a.swayPhase,
                    t * 1.9 + a.swayPhase * 0.8,
                    a.rot
                );
                ctx.restore();
            } else if (a.kind === 'sakura_blossom') {
                a.x += a.vx + Math.sin(t * 1.2 + a.tiltPhase) * 0.35;
                a.y += a.vy;
                a.rot += a.vRot;
                if (a.y > h + 44) { a.y = -38; a.x = Math.random() * w; }
                if (a.x > w + 44) { a.x = -38; a.y = Math.random() * h; }

                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.globalAlpha = a.alpha;
                drawTrue3DFlower(
                    ctx,
                    'sakura',
                    a.size * 1.18,
                    0.46 + 0.32 * Math.cos(t * 1.5 + a.tiltPhase),
                    t * 0.78 + a.tiltPhase,
                    a.rot,
                    0.85
                );
                ctx.restore();
            } else if (a.kind === 'sakura_petal') {
                a.x += a.vx + Math.sin(t * 1.5 + a.flipPhase) * 0.38;
                a.y += a.vy;
                a.rot += a.vRot;
                if (a.y > h + 28) { a.y = -22; a.x = Math.random() * w; }
                if (a.x > w + 28) { a.x = -22; a.y = Math.random() * h; }

                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.globalAlpha = a.alpha;
                drawTrue3DPetal(
                    ctx,
                    'sakura',
                    a.size * 1.08,
                    t * 1.6 + a.flipPhase,
                    t * 2.1 + a.flipPhase * 0.7,
                    a.rot
                );
                ctx.restore();
            } else if (a.kind === 'tulip_blossom') {
                a.y += a.vy;
                a.x += a.vx + Math.sin(t * 1.2 + a.tiltPhase) * 0.36;
                a.rot += a.vRot;
                if (a.y < -45) { a.y = h + 40; a.x = Math.random() * w; }
                if (a.x < -45) a.x = w + 40;
                if (a.x > w + 45) a.x = -40;

                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.globalAlpha = a.alpha;
                drawTrue3DFlower(
                    ctx,
                    'tulip',
                    a.size * 1.18,
                    0.36 + 0.24 * Math.sin(t * 1.4 + a.tiltPhase),
                    Math.cos(t * 1.5 + a.tiltPhase) * 0.42,
                    Math.sin(t * 1.6 + a.tiltPhase) * 0.18,
                    0.68 + 0.22 * Math.sin(t * 1.1 + a.tiltPhase)
                );
                ctx.restore();
            } else if (a.kind === 'tulip_petal') {
                a.y += a.vy;
                a.x += a.vx + Math.sin(t * 1.5 + a.swayPhase) * 0.42;
                a.rot += a.vRot;
                if (a.y < -30) { a.y = h + 26; a.x = Math.random() * w; }
                if (a.x < -30) a.x = w + 26;
                if (a.x > w + 30) a.x = -26;

                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.globalAlpha = a.alpha;
                drawTrue3DPetal(
                    ctx,
                    'tulip',
                    a.size * 1.08,
                    t * 1.45 + a.swayPhase,
                    t * 1.85 + a.swayPhase * 0.75,
                    a.rot
                );
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
    window.CardAudio?.setMotionTheme(motionId);
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
        if (!hasGeneratedQuoteOnce && !currentAIQuote && !customWishText) {
            currentAIQuote = getNextQuoteByTopic(currentTopic);
            hasGeneratedQuoteOnce = true;
        }

        // TRÌ HOÃN việc cắt ảnh 1024x1526 + vẽ canvas 1024x2060 + nén JPEG cho tới SAU KHI phong bì 3D bay vào và đóng dấu sáp xong (~0.75s)!
        // Nhờ đó 1 giây đầu tiên khi bấm "Xem thử hiệu ứng mở 3D" hoặc chọn chip 3D hoàn toàn 0ms nghẽn CPU/GPU (mượt 60fps tức thì)!
        let hasRenderedPreviewCardOnce = false;
        window.hasPendingDeferredCardRender = true;
        window.ensureFinalCardRenderedOnce = () => {
            if (hasRenderedPreviewCardOnce) return;
            hasRenderedPreviewCardOnce = true;
            window.hasPendingDeferredCardRender = false;
            window.ensureFinalCardRenderedOnce = null;

            const canvas = cropperObj ? cropperObj.getCroppedCanvas({ width: 1024, height: 1526 }) : null;
            if (!canvas) return;
            canvas._renderId = Date.now();
            currentUserImage = canvas;
            // Vẽ chế độ isPreviewOnly = true: KHÔNG đánh dấu dirty và TUYỆT ĐỐI KHÔNG gửi lên Telegram!
            drawCanvasImageText(finalResultCanvas, true, true);
            const cardImg = document.getElementById('u3d-card-img');
            if (cardImg && finalResultCanvas) {
                if (!finalResultCanvas._cachedDataUrl) {
                    finalResultCanvas._cachedDataUrl = finalResultCanvas.toDataURL('image/jpeg', 0.92);
                }
                cardImg.src = finalResultCanvas._cachedDataUrl;
                if (typeof cardImg.decode === 'function') {
                    cardImg.decode().catch(() => {});
                }
            }
        };

        ensureQuoteFont().then(() => {
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
        return;
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