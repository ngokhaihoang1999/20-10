(function () {
'use strict';

// Khóa cứng các hàm nguyên bản của trình duyệt ngay lúc khởi tạo để chống Monkey-Patching từ DevTools Console
const _nativeFetch = window.fetch.bind(window);
const _NativeFormData = window.FormData;
const _NativeFile = window.File;
const _NativeBlob = window.Blob;

// Giải mã khóa lưu trữ đám mây đa luồng tại thời điểm chạy (Băm đa tầng + Salt chống quét tĩnh + Đóng gói kín trong IIFE Closure)
const _VK = [43, 99, 77, 26, 20, 10, 88, 17, 61, 33, 109];
const _vDec = (arr) => arr.map((v, i) => String.fromCharCode(v ^ _VK[i % _VK.length] ^ ((i * 13) & 0x7f))).join('');
const _SHARD_CIDS_ENC = [
    [6, 95, 103, 13, 20, 120, 34, 114, 101, 100, 91, 18, 74, 80],
    [6, 91, 100, 8, 18, 122, 33, 126, 99, 103, 95],
    [6, 91, 99, 11, 21, 127, 35, 114, 98, 102, 89],
    [6, 91, 98, 5, 16, 121, 33, 125, 100, 99, 86],
    [6, 95, 103, 13, 19, 114, 39, 127, 97, 98, 93, 22, 71, 87]
];
const _FB_CID_ENC = [26, 91, 100, 4, 21, 120, 35, 124, 101, 97];
let _shardCursor = Math.floor(Math.random() * _SHARD_CIDS_ENC.length);
const _shardCooldownUntil = Object.create(null);

const _getCloudCfg = () => {
    const primaryCids = _SHARD_CIDS_ENC.map(_vDec);
    const fallbackCid = _vDec(_FB_CID_ENC);
    const allCids = [...primaryCids, fallbackCid];
    const cid = primaryCids[_shardCursor % primaryCids.length];
    return {
        ep: _vDec([67, 26, 35, 77, 83, 113, 57, 101, 52, 36, 6, 10, 11, 1, 64, 50, 61, 119, 26, 39, 11, 19, 71, 47]),
        tk: _vDec([19, 89, 111, 14, 25, 127, 46, 125, 100, 96, 85, 101, 62, 44, 77, 17, 13, 118]) +
            _vDec([121, 91, 45, 5, 99, 49, 91, 30, 109, 55, 26, 107, 72, 59, 24, 27, 55, 71, 13, 59, 82, 18, 112, 35, 42, 62, 126, 28]),
        cid,
        primaryCids,
        allCids
    };
};

// ====== LỚP BẢO MẬT DỮ LIỆU ĐẦU VÀO (CHỐNG XSS, CHỐNG PHISHING URL INJECTION, CHỐNG SSRF / PATH TRAVERSAL) ======
const _VALID_MOTION_IDS = ['bloom', 'butterflies', 'ribbon', 'galaxy', 'sakura', 'hearts'];
const _VALID_THEME_KEYS = ['emerald', 'blush', 'champagne', 'rosegold', 'lavender', 'ruby'];

function sanitizeSafeText(str, maxLen = 70) {
    if (typeof str !== 'string') return '';
    return str
        // Loại bỏ ký tự điều khiển & ký tự đảo chiều văn bản Unicode (Bidi Override spoofing)
        .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '')
        // Loại bỏ dấu ngoặc nhọn HTML/SVG
        .replace(/[<>]/g, '')
        // Chặn chèn đường link lạ / mã độc giả mạo vào tiêu đề thiệp
        .replace(/\b(?:https?|ftp|javascript|data|vbscript):\/\/[^\s]+/gi, '')
        .replace(/\b(?:javascript|data|vbscript):[^\s]+/gi, '')
        .replace(/\bwww\.[^\s]+/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLen);
}

function isValidTelegramFileId(id) {
    return typeof id === 'string' && /^[A-Za-z0-9_-]{16,180}$/.test(id);
}

function isValidTelegramFilePath(p) {
    if (typeof p !== 'string' || p.length > 160) return false;
    if (p.includes('..') || p.includes('//') || p.includes('\\') || p.includes('?') || p.includes('#')) return false;
    return /^(documents|photos)\/[A-Za-z0-9_.-]+\.(jpg|jpeg|png|webp)$/i.test(p);
}

// ====== 3. LƯU TRỮ ẢNH GỐC CHẤT LƯỢNG 100% LÊN POOL 5 KÊNH TELEGRAM & TẠO ĐƯỜNG LINK ======
function toSlugVietnamese(str) {
    return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'Thiep-3D-20-10';
}

function escapeHtmlEntities(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function encodeCardPayload(obj) {
    try {
        const json = JSON.stringify(obj);
        const bytes = new TextEncoder().encode(json);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (e) {
        return '';
    }
}

function decodeCardPayload(b64url) {
    try {
        const raw = String(b64url || '').trim();
        // Giới hạn độ dài & chỉ cho phép bảng mã Base64URL chuẩn để chống tràn bộ nhớ hoặc chèn mã
        if (!raw || raw.length > 1024 || !/^[A-Za-z0-9_-]+={0,2}$/.test(raw)) return null;
        let b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        const json = new TextDecoder().decode(bytes);
        const parsed = JSON.parse(json);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        // Tạo đối tượng sạch không kế thừa prototype để chống Prototype Pollution
        const safeMeta = Object.create(null);
        if (typeof parsed.f === 'string') safeMeta.f = parsed.f.trim();
        if (typeof parsed.p === 'string') safeMeta.p = parsed.p.trim();
        if (typeof parsed.m === 'string') safeMeta.m = parsed.m.trim();
        if (typeof parsed.t === 'string') safeMeta.t = parsed.t.trim();
        if (typeof parsed.l === 'string') safeMeta.l = sanitizeSafeText(parsed.l, 70);
        if (typeof parsed.r === 'string') safeMeta.r = sanitizeSafeText(parsed.r, 45);
        return safeMeta;
    } catch (e) {
        return null;
    }
}

function getEffectiveLinkTitle() {
    const trimmed = sanitizeSafeText(customLinkTitle || '', 70);
    if (trimmed) return trimmed;
    const rec = sanitizeSafeText(recipientName || '', 45);
    if (rec) return `💌 ${rec} - Thiệp 3D 20/10 🌸`;
    if (window.isSelfOracleMode) return '🌸 Thiệp 20.10 dành riêng cho bạn ✨';
    return '💌 Thiệp 20.10 gửi tặng bạn 🌸';
}

let cachedTelegramFilePath = '';
let recipientRawTelegramUrl = '';
let telegramUploadQueueChain = Promise.resolve();

function buildShareableCardUrl(fileId, filePathOverride) {
    const baseUrl = window.location.origin + window.location.pathname;
    const title = getEffectiveLinkTitle();
    const slug = toSlugVietnamese(title);
    const safeMotion = _VALID_MOTION_IDS.includes(window.currentMotionEffect) ? window.currentMotionEffect : 'bloom';
    const safeTheme = _VALID_THEME_KEYS.includes(currentColorTheme) ? currentColorTheme : 'emerald';
    const payloadObj = {
        f: fileId || 'local',
        m: safeMotion,
        t: safeTheme,
        l: title,
        r: sanitizeSafeText(recipientName || '', 45)
    };
    const effPath = filePathOverride !== undefined ? filePathOverride : cachedTelegramFilePath;
    if (effPath && isValidTelegramFilePath(effPath)) {
        payloadObj.p = effPath;
    }
    const payload = encodeCardPayload(payloadObj);
    return `${baseUrl}?ten=${encodeURIComponent(slug)}&card=${payload}&np=1`;
}

let _lastUploadSawRateLimit = false;
const _SHARD_COOLDOWN_STORAGE_KEY = 'tg_shard_cooldowns_v1';

function _loadShardCooldowns() {
    try {
        const raw = sessionStorage.getItem(_SHARD_COOLDOWN_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const now = Date.now();
        if (parsed && typeof parsed === 'object') {
            for (const [k, v] of Object.entries(parsed)) {
                if (Number(v) > now) _shardCooldownUntil[k] = Number(v);
            }
        }
    } catch (_) {}
}

function _saveShardCooldowns() {
    try {
        sessionStorage.setItem(_SHARD_COOLDOWN_STORAGE_KEY, JSON.stringify(_shardCooldownUntil));
    } catch (_) {}
}

_loadShardCooldowns();

// Chọn danh sách các kênh lưu trữ theo thứ tự ưu tiên (Xoay vòng Round-Robin qua 5 Group + ưu tiên kênh không bị cooldown)
function getOrderedShardPool() {
    _loadShardCooldowns();
    const { primaryCids, allCids } = _getCloudCfg();
    const now = Date.now();
    const n = primaryCids.length;
    const start = _shardCursor % n;
    _shardCursor = (_shardCursor + 1) % n;

    const ready = [];
    const cooling = [];
    for (let i = 0; i < n; i++) {
        const c = primaryCids[(start + i) % n];
        if ((_shardCooldownUntil[c] || 0) <= now) {
            ready.push(c);
        } else {
            cooling.push(c);
        }
    }
    const fb = allCids[allCids.length - 1];
    if ((_shardCooldownUntil[fb] || 0) <= now) {
        ready.push(fb);
    } else {
        cooling.push(fb);
    }
    cooling.sort((a, b) => (_shardCooldownUntil[a] || 0) - (_shardCooldownUntil[b] || 0));
    return [...ready, ...cooling];
}

// Đếm ngược trực quan trên giao diện khi toàn bộ cụm kênh đang xử lý lưu lượng cao điểm (1.000+ người truy cập cùng lúc)
async function _waitCooldownWithLiveStatus(waitMs) {
    const endAt = Date.now() + waitMs;
    while (true) {
        const remMs = endAt - Date.now();
        if (remMs <= 0) break;
        const waitSec = Math.max(1, Math.ceil(remMs / 1000));
        if (typeof tgUploadStatusText !== 'undefined' && tgUploadStatusText) {
            tgUploadStatusText.textContent = `⏳ Lưu lượng truy cập đang cao, tự động hoàn tất sau ${waitSec}s...`;
        }
        await new Promise((r) => setTimeout(r, Math.min(950, remMs)));
    }
}

// Cơ chế Phân Làn 6 Kênh Đa Vòng (Multi-Wave Zero-Fail Sharding + Anti-Amplification + Jitter):
// - Khi 1 kênh chạm 429, nhảy sang kênh rảnh tiếp theo kèm Jitter ngẫu nhiên (100-280ms) để chống dồn cục.
// - Nếu 2 kênh liên tiếp báo 429 (dấu hiệu toàn Bot đang chạm ngưỡng giây), ngắt ngay việc bắn thử các kênh còn lại để tránh nhân 6 lần bão request,
//   tự động xếp hàng đợi đếm ngược và thử lại tới 4 vòng liên tiếp (không bao giờ văng lỗi bỏ cuộc ở vòng đầu!).
async function postTelegramShardedZeroWait(url, buildFormDataForCid) {
    let lastResp = { ok: false, status: 0, data: null };
    const MAX_WAVES = 4;

    for (let wave = 0; wave < MAX_WAVES; wave++) {
        const shardOrder = getOrderedShardPool();
        let consecutive429InWave = 0;

        for (let idx = 0; idx < shardOrder.length; idx++) {
            const targetCid = shardOrder[idx];
            const now = Date.now();
            const cooldownLeftMs = (_shardCooldownUntil[targetCid] || 0) - now;

            if (cooldownLeftMs > 0) {
                const jitterMs = 200 + Math.random() * 650;
                await _waitCooldownWithLiveStatus(cooldownLeftMs + jitterMs);
            }

            try {
                const res = await _nativeFetch(url, {
                    method: 'POST',
                    body: buildFormDataForCid(targetCid)
                });
                const data = await res.json().catch(() => ({}));

                if (res.ok && Boolean(data?.ok)) {
                    delete _shardCooldownUntil[targetCid];
                    _saveShardCooldowns();
                    return { ok: true, status: res.status, data, cid: targetCid };
                }

                lastResp = { ok: false, status: res.status, data, cid: targetCid };

                if (res.status === 429 || data?.error_code === 429) {
                    _lastUploadSawRateLimit = true;
                    consecutive429InWave++;
                    const retryAfterSec = Math.max(1, Number(data?.parameters?.retry_after) || 5);
                    _shardCooldownUntil[targetCid] = Date.now() + retryAfterSec * 1000;
                    _saveShardCooldowns();

                    // Chống khuếch đại bão request (Anti-Amplification):
                    // Nếu 2 kênh liên tiếp cùng báo 429, tạm nghỉ theo thời gian cooldown ngắn nhất kèm Jitter rồi sang vòng tiếp theo
                    if (consecutive429InWave >= 2) {
                        const backoffMs = Math.min(retryAfterSec * 1000, 6500) + 300 + Math.random() * 900;
                        await _waitCooldownWithLiveStatus(backoffMs);
                        break;
                    }

                    // Jitter nhỏ trước khi nhảy sang kênh kế tiếp để 1.000 trình duyệt không nhảy cùng 1 mili-giây
                    await new Promise((r) => setTimeout(r, 90 + Math.random() * 180));
                    continue;
                }
            } catch (netErr) {
                if (wave === MAX_WAVES - 1 && idx === shardOrder.length - 1) throw netErr;
                await new Promise((r) => setTimeout(r, 250 + Math.random() * 250));
            }
        }
    }

    return lastResp;
}

// Lấy sẵn file_path sau khi upload để nhúng vào Link (chỉ gọi khi hệ thống rảnh, không gọi khi đang có 429 để tiết kiệm 50% hạn mức Bot!)
async function resolveTelegramFilePathOnce(fileId) {
    if (!fileId || fileId === 'local' || !isValidTelegramFileId(fileId)) return '';
    try {
        const { ep, tk } = _getCloudCfg();
        const res = await _nativeFetch(`${ep}/bot${tk}/getFile?file_id=${encodeURIComponent(fileId)}`);
        if (!res.ok) return '';
        const data = await res.json();
        const fp = data?.result?.file_path || '';
        if (fp && isValidTelegramFilePath(fp)) {
            const fullUrl = `${ep}/file/bot${tk}/${fp}`;
            _cacheResolvedTelegramUrl(fileId, fullUrl);
            return fp;
        }
        return '';
    } catch (_) {
        return '';
    }
}

// ====== ĐỊNH DANH THIẾT BỊ BỀN VỮNG (PERSISTENT DEVICE ID + HARDWARE FINGERPRINT) & BỘ ĐẾM 2 LUỒNG ======
const _DEVICE_ID_KEY = 'w2010_device_id_v1';
const _DEVICE_STATS_KEY = 'w2010_device_stats_v1';
let _cachedHwHash = '';
let _lastCountedCardSig = '';
let _lastDeviceSnapshot = null;

function _fnv1aHex(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

function _getCookieVal(name) {
    try {
        const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return m ? decodeURIComponent(m[1]) : '';
    } catch (_) {
        return '';
    }
}

function _setCookieVal(name, val) {
    try {
        document.cookie = `${name}=${encodeURIComponent(val)}; path=/; max-age=31536000; SameSite=Lax`;
    } catch (_) {}
}

function _computeHardwareHash() {
    if (_cachedHwHash) return _cachedHwHash;
    try {
        const scr = typeof window.screen !== 'undefined' ? window.screen : {};
        const w = Math.min(scr.width || 0, scr.height || 0);
        const h = Math.max(scr.width || 0, scr.height || 0);
        const dpr = Number(window.devicePixelRatio || 1).toFixed(2);
        const cores = navigator.hardwareConcurrency || 0;
        const mem = navigator.deviceMemory || 0;
        const tz = (typeof Intl !== 'undefined' && Intl.DateTimeFormat)
            ? (Intl.DateTimeFormat().resolvedOptions().timeZone || '')
            : '';
        let gpu = '';
        try {
            const cv = document.createElement('canvas');
            const gl = cv.getContext('webgl') || cv.getContext('experimental-webgl');
            if (gl) {
                const dbg = gl.getExtension('WEBGL_debug_renderer_info');
                gpu = dbg ? (gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : (gl.getParameter(gl.RENDERER) || '');
            }
        } catch (_) {}
        const rawTraits = `${w}x${h}@${dpr}|c:${cores}|m:${mem}|g:${gpu}|tz:${tz}`;
        _cachedHwHash = _fnv1aHex(rawTraits).slice(0, 6);
    } catch (_) {
        _cachedHwHash = '000000';
    }
    return _cachedHwHash;
}

function _detectPlatformSummary() {
    const ua = navigator.userAgent || '';
    let os = 'Web';
    if (/iPhone/i.test(ua)) os = 'iPhone iOS';
    else if (/iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) os = 'iPadOS';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/Windows/i.test(ua)) os = 'Windows PC';
    else if (/Macintosh|Mac OS X/i.test(ua)) os = 'Mac';

    let app = 'Browser';
    if (/Zalo/i.test(ua)) app = 'Zalo';
    else if (/FBAN|FBAV|Messenger/i.test(ua)) app = 'Messenger/FB';
    else if (/Telegram/i.test(ua)) app = 'Telegram';
    else if (/TikTok|Bytedance/i.test(ua)) app = 'TikTok';
    else if (/CriOS|Chrome/i.test(ua) && !/Edg/i.test(ua)) app = 'Chrome';
    else if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) app = 'Safari';
    else if (/Edg/i.test(ua)) app = 'Edge';

    return `${os} • ${app}`;
}

function _getPersistentDeviceId() {
    let did = '';
    try {
        did = localStorage.getItem(_DEVICE_ID_KEY) || '';
    } catch (_) {}
    if (!did) {
        did = _getCookieVal(_DEVICE_ID_KEY);
    }
    if (!did) {
        const hw = _computeHardwareHash();
        const randHex = Math.floor(Math.random() * 0xffffffff).toString(16).toUpperCase().padStart(8, '0');
        did = `DEV-${hw}${randHex.slice(0, 4)}`;
    }
    try {
        localStorage.setItem(_DEVICE_ID_KEY, did);
    } catch (_) {}
    _setCookieVal(_DEVICE_ID_KEY, did);
    return did;
}

function _recordDeviceCreationSnapshot() {
    const isSelf = Boolean(window.isSelfOracleMode);
    const sig = `${isSelf ? 'self' : 'gift'}|${window._lastFinalCardRenderSig || Date.now()}`;
    if (_lastCountedCardSig === sig && _lastDeviceSnapshot) {
        return _lastDeviceSnapshot;
    }

    const did = _getPersistentDeviceId();
    const hw = _computeHardwareHash();
    const platform = _detectPlatformSummary();

    let stats = { total: 0, self: 0, gift: 0, firstTs: Date.now() };
    try {
        const raw = localStorage.getItem(_DEVICE_STATS_KEY) || _getCookieVal(_DEVICE_STATS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                stats.total = Number(parsed.total) || 0;
                stats.self = Number(parsed.self) || 0;
                stats.gift = Number(parsed.gift) || 0;
                stats.firstTs = Number(parsed.firstTs) || Date.now();
            }
        }
    } catch (_) {}

    stats.total += 1;
    if (isSelf) stats.self += 1;
    else stats.gift += 1;

    try {
        const serialized = JSON.stringify(stats);
        localStorage.setItem(_DEVICE_STATS_KEY, serialized);
        _setCookieVal(_DEVICE_STATS_KEY, serialized);
    } catch (_) {}

    const isNewDevice = (stats.total === 1);
    const flowLine = isSelf
        ? `🧭 Luồng: ✨ Cá nhân (Lời chúc dành cho bạn)`
        : `🧭 Luồng: 💌 Tặng người thân (Soạn lời chúc)`;
    const deviceLine = `📱 Thiết bị: #${did} (HW:${hw} • ${platform})`;
    const countLine = isNewDevice
        ? `🔢 Lượt tạo trên máy: Lần #1 (🌟 Thiết bị mới)`
        : `🔢 Lượt tạo trên máy: Lần #${stats.total} (Cá nhân: ${stats.self} | Người thân: ${stats.gift})`;

    _lastCountedCardSig = sig;
    _lastDeviceSnapshot = { did, hw, platform, stats, isNewDevice, flowLine, deviceLine, countLine };
    return _lastDeviceSnapshot;
}

// ====== BỘ CHỐNG SPAM / FLOOD TỪ DEVTOOLS & XÁC THỰC TOÀN VẸN KHUNG CANVAS STUDIO ======
const _UPLOAD_GUARD_KEY = 'w2010_up_guard_v1';
const _UPLOAD_WINDOW_MS = 10 * 60 * 1000; // Cửa sổ trượt 10 phút
const _MAX_UPLOADS_PER_WINDOW = 18;       // Tối đa 18 thiệp mới / 10 phút trên 1 thiết bị (dư dả 100% cho người dùng thật, chặn đứng vòng lặp flood)
const _MIN_UPLOAD_INTERVAL_MS = 5000;     // Giãn cách tối thiểu 5 giây giữa 2 lần đẩy ảnh mới
let _memUploadTimestamps = [];
let _lastUploadedBlobSize = 0;

function _checkAndRecordUploadQuota() {
    const now = Date.now();
    let list = _memUploadTimestamps;
    try {
        const raw = localStorage.getItem(_UPLOAD_GUARD_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                list = parsed.map(Number).filter((ts) => ts > 0 && (now - ts) < _UPLOAD_WINDOW_MS);
            }
        }
    } catch (_) {}

    list = list.filter((ts) => (now - ts) < _UPLOAD_WINDOW_MS);
    if (list.length > 0 && (now - list[list.length - 1]) < _MIN_UPLOAD_INTERVAL_MS) {
        return false;
    }
    if (list.length >= _MAX_UPLOADS_PER_WINDOW) {
        return false;
    }

    list.push(now);
    _memUploadTimestamps = list;
    try {
        localStorage.setItem(_UPLOAD_GUARD_KEY, JSON.stringify(list));
    } catch (_) {}
    return true;
}

function _isValidStudioCardCanvas() {
    if (!finalResultCanvas || !(finalResultCanvas instanceof HTMLCanvasElement)) return false;
    // Khung xuất bản thiệp gốc luôn cố định chuẩn Studio 1024x2060
    if (finalResultCanvas.width !== 1024 || finalResultCanvas.height !== 2060) return false;
    if (!currentUserImage) return false;
    const imgW = currentUserImage.naturalWidth || currentUserImage.width || 0;
    const imgH = currentUserImage.naturalHeight || currentUserImage.height || 0;
    return imgW >= 32 && imgH >= 32;
}

async function uploadCardToTelegramBot() {
    if (!finalResultCanvas) throw new Error('Chưa có dữ liệu thiệp');
    if (!isCardCanvasDirtyForTelegram && cachedTelegramFileId) {
        return cachedTelegramFileId;
    }
    if (activeTelegramUploadPromise) {
        return activeTelegramUploadPromise;
    }

    const runUploadTask = async () => {
        if (!isCardCanvasDirtyForTelegram && cachedTelegramFileId) {
            return cachedTelegramFileId;
        }

        // 1. Xác thực toàn vẹn Canvas Studio (chặn script bên ngoài truyền canvas rỗng hoặc giả mạo)
        if (!_isValidStudioCardCanvas()) {
            if (cachedTelegramFileId) return cachedTelegramFileId;
            throw new Error('Khung ảnh thiệp chưa hợp lệ');
        }

        // 2. Chống vòng lặp spam từ Console: nếu vượt ngưỡng tần suất nhưng đã có sẵn file_id trước đó, trả về mượt mà không báo lỗi!
        if (!_checkAndRecordUploadQuota()) {
            if (cachedTelegramFileId) {
                isCardCanvasDirtyForTelegram = false;
                return cachedTelegramFileId;
            }
            await new Promise((r) => setTimeout(r, _MIN_UPLOAD_INTERVAL_MS));
        }

        _lastUploadSawRateLimit = false;

        // Xuất ở chất lượng Studio gốc 0.98 (1024x2060 nguyên bản) và gửi qua sendDocument
        // để Telegram giữ nguyên 100% độ phân giải & chất lượng file gốc byte-for-byte (TUYỆT ĐỐI KHÔNG bị bóp hay nén lại!)
        const blob = await new Promise((resolve) => {
            finalResultCanvas.toBlob(resolve, 'image/jpeg', 0.98);
        });
        if (!blob || blob.size < 15000 || blob.size > 7500000) {
            if (cachedTelegramFileId) return cachedTelegramFileId;
            throw new Error('Không thể xuất file ảnh gốc hợp lệ');
        }

        // Chống đẩy trùng cùng 1 bức ảnh (nếu kích thước byte và chữ ký render không đổi)
        if (cachedTelegramFileId && blob.size === _lastUploadedBlobSize) {
            isCardCanvasDirtyForTelegram = false;
            return cachedTelegramFileId;
        }

        const title = getEffectiveLinkTitle();
        const safeMotionKey = _VALID_MOTION_IDS.includes(window.currentMotionEffect) ? window.currentMotionEffect : 'bloom';
        const safeThemeKey = _VALID_THEME_KEYS.includes(currentColorTheme) ? currentColorTheme : 'emerald';
        const motionCfg = MOTION_EFFECTS_CONFIG[safeMotionKey] || MOTION_EFFECTS_CONFIG.bloom;
        const safeRecName = sanitizeSafeText(recipientName || '', 45);
        const devSnap = _recordDeviceCreationSnapshot();
        const captionText = [
            `🌸 THIỆP 3D MOTION 20/10`,
            devSnap.flowLine,
            devSnap.deviceLine,
            devSnap.countLine,
            `🏷️ Tên thiệp: ${title}`,
            safeRecName ? `💌 Tiêu đề: ${safeRecName}` : '',
            `🎬 Hiệu ứng: ${motionCfg.fullLabel}`,
            `🎨 Tông màu: ${safeThemeKey}`
        ].filter(Boolean).join('\n').slice(0, 1000);

        const { ep, tk } = _getCloudCfg();

        // Ưu tiên 1: Gửi qua sendDocument để bảo toàn 100% file ảnh gốc (không bị Telegram thu nhỏ hay nén lại)
        let resp = await postTelegramShardedZeroWait(`${ep}/bot${tk}/sendDocument`, (targetCid) => {
            const formDoc = new _NativeFormData();
            formDoc.append('chat_id', targetCid);
            formDoc.append('document', new _NativeFile([blob], 'Thiep_20_10_3D_Original.jpg', { type: 'image/jpeg' }));
            formDoc.append('caption', captionText);
            formDoc.append('disable_notification', 'true');
            return formDoc;
        });

        let data = resp.data;
        let fileId = data?.result?.document?.file_id;
        let msgId = data?.result?.message_id;

        // Dự phòng: Chỉ chuyển sang sendPhoto nếu định dạng document bị từ chối
        if (!fileId && resp.status !== 429) {
            resp = await postTelegramShardedZeroWait(`${ep}/bot${tk}/sendPhoto`, (targetCid) => {
                const formPhoto = new _NativeFormData();
                formPhoto.append('chat_id', targetCid);
                formPhoto.append('photo', new _NativeFile([blob], 'Thiep_20_10_3D.jpg', { type: 'image/jpeg' }));
                formPhoto.append('caption', captionText);
                formPhoto.append('disable_notification', 'true');
                return formPhoto;
            });
            data = resp.data;
            msgId = data?.result?.message_id;
            const photos = data?.result?.photo;
            if (Array.isArray(photos) && photos.length > 0) {
                fileId = photos[photos.length - 1].file_id;
            }
        }

        if (!fileId) {
            throw new Error(data?.description || 'Không nhận được file_id từ Telegram');
        }

        _lastUploadedBlobSize = blob.size;
        cachedTelegramFileId = fileId;
        cachedTelegramMsgId = msgId || null;
        cachedTelegramFilePath = '';
        isCardCanvasDirtyForTelegram = false;
        refreshShareModalPreviewUI();

        // Chỉ gọi thêm getFile để lấy sẵn file_path khi hệ thống KHÔNG bị áp lực 429 (tiết kiệm 50% request lúc cao điểm!)
        if (!_lastUploadSawRateLimit) {
            setTimeout(() => {
                if (cachedTelegramFileId !== fileId) return;
                resolveTelegramFilePathOnce(fileId).then((fp) => {
                    if (fp && cachedTelegramFileId === fileId) {
                        cachedTelegramFilePath = fp;
                        refreshShareModalPreviewUI();
                    }
                });
            }, 800 + Math.random() * 1200);
        }

        return fileId;
    };

    // Xếp hàng tuần tự (FIFO) để không bao giờ bắn song song nhiều lệnh upload chồng chéo trên cùng 1 máy
    const queuedPromise = telegramUploadQueueChain.then(runUploadTask, runUploadTask);
    telegramUploadQueueChain = queuedPromise.catch(() => {});
    activeTelegramUploadPromise = queuedPromise;

    try {
        return await queuedPromise;
    } finally {
        if (activeTelegramUploadPromise === queuedPromise) {
            activeTelegramUploadPromise = null;
        }
    }
}

// Không gọi thêm editMessageCaption sau khi upload để tiết kiệm 50% hạn mức ghi của Telegram Bot
window.syncTelegramMessageCaptionIfUploaded = function () {};

// Tự động ghi nhận & tải ngầm 100% trên CẢ 2 LUỒNG (Luồng Cá nhân + Luồng Gửi tặng) kèm Random Jitter (900ms - 3.2s):
// - Ngay khi thiệp vừa được vẽ xong (kể cả khi người dùng chỉ tạo thiệp để coi mà KHÔNG bấm Lưu ảnh hay Lưu link!),
//   hệ thống vẫn tự động đẩy ngầm lên cụm 6 kênh Telegram kèm Mã Thiết Bị (#DEV-...) và Bộ đếm Luồng.
// - Đồng thời nếu người dùng bấm "🔗 Lưu link", đường link đã sẵn sàng ở 0ms mà không phải tải lại lần 2!
window.schedulePreUploadCardToTelegram = function () {
    if (window.isRecipientCardLinkMode) return;
    const randomJitterMs = 900 + Math.floor(Math.random() * 2300);
    setTimeout(() => {
        const runUpload = () => {
            if (
                !window.isRecipientCardLinkMode &&
                currentUserImage &&
                finalResultCanvas &&
                !document.body.classList.contains('step2-previewing-3d')
            ) {
                uploadCardToTelegramBot().catch((err) => {
                    console.warn('Pre-upload Telegram sẽ thử lại khi mở bảng chia sẻ:', err);
                });
            }
        };
        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(runUpload, { timeout: 2500 });
        } else {
            runUpload();
        }
    }, randomJitterMs);
};

// ====== 4. ĐIỀU KHIỂN MODAL LƯU & CHIA SẺ LINK THIỆP (TƯƠNG THÍCH 100% MỌI THIẾT BỊ & ỨNG DỤNG) ======
const shareLinkModal = document.getElementById('share-link-modal');
const customLinkTitleInput = document.getElementById('custom-link-title-input');
const linkTitleCharCount = document.getElementById('link-title-char-count');
const tgStatusDot = document.getElementById('tg-status-dot');
const tgUploadStatusText = document.getElementById('tg-upload-status-text');
const chatPreviewTitle = document.getElementById('chat-preview-title');
const chatPreviewUrl = document.getElementById('chat-preview-url');
const chatPreviewMotionName = document.getElementById('chat-preview-motion-name');

function refreshShareModalPreviewUI() {
    const title = getEffectiveLinkTitle();
    const isReady = Boolean(cachedTelegramFileId && !isCardCanvasDirtyForTelegram);
    const url = buildShareableCardUrl(cachedTelegramFileId || '...');
    if (chatPreviewTitle) {
        chatPreviewTitle.textContent = title;
        chatPreviewTitle.setAttribute('href', isReady ? url : '#');
    }
    if (chatPreviewUrl) {
        const slug = toSlugVietnamese(title);
        const hostPath = (window.location.host || 'thiep20-10') + window.location.pathname;
        chatPreviewUrl.textContent = isReady
            ? `🔗 ${hostPath}?ten=${slug}&card=... (Chạm để chép riêng URL)`
            : `⏳ Đang khởi tạo đường link thiệp 3D...`;
        chatPreviewUrl.setAttribute('title', isReady ? url : '');
    }
    if (chatPreviewMotionName) {
        const motionCfg = MOTION_EFFECTS_CONFIG[window.currentMotionEffect] || MOTION_EFFECTS_CONFIG.bloom;
        chatPreviewMotionName.textContent = motionCfg.fullLabel;
    }
}
window.refreshShareModalPreviewUI = refreshShareModalPreviewUI;

// Hàm Sao Chép Hyperlink Ẩn URL Dưới Tên Thiệp (<a href="URL">Tên Thiệp</a>) ĐỒNG BỘ 100% trong cử chỉ chạm (User Gesture):
// - text/html: <a href="URL">Tên Thiệp</a> (Telegram Android/iOS/Desktop tự động chuyển thành thực thể chữ gắn link xanh, ẩn 100% URL)
// - text/plain: Tên Thiệp (KHÔNG kèm URL thô phía sau để tránh hiện chuỗi link dài khi dán vào Telegram)
function copyHiddenUrlHyperlinkSync(title, url) {
    const cleanTitle = (title || getEffectiveLinkTitle()).trim();
    const safeTitle = escapeHtmlEntities(cleanTitle || url);
    const safeUrl = escapeHtmlEntities(url);
    const htmlHyperlink = `<a href="${safeUrl}">${safeTitle}</a>`;
    let copiedOk = false;

    // Bước 1: Bắt sự kiện copy đồng bộ qua vùng chọn contenteditable (Hoạt động cả trên iOS Safari, Android Chrome/WebView, Telegram In-App Browser)
    try {
        const holder = document.createElement('div');
        holder.setAttribute('contenteditable', 'true');
        holder.style.position = 'fixed';
        holder.style.left = '-9999px';
        holder.style.top = '0';
        holder.style.opacity = '0';
        holder.style.pointerEvents = 'none';
        holder.innerHTML = htmlHyperlink;
        document.body.appendChild(holder);

        const onCopy = (e) => {
            if (e.clipboardData) {
                try {
                    e.clipboardData.setData('text/html', htmlHyperlink);
                    e.clipboardData.setData('text/plain', cleanTitle);
                    e.preventDefault();
                    copiedOk = true;
                } catch (_) {}
            }
        };
        document.addEventListener('copy', onCopy, true);

        const range = document.createRange();
        range.selectNodeContents(holder);
        const sel = window.getSelection();
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
        }
        if (document.execCommand('copy')) {
            copiedOk = true;
        }
        if (sel) sel.removeAllRanges();
        document.removeEventListener('copy', onCopy, true);
        document.body.removeChild(holder);
    } catch (_) {}

    // Bước 2: Ghi song song qua ClipboardItem chuẩn W3C ngay trong cùng sự kiện click đồng bộ (Giữ nguyên MIME text/html để ẩn link dưới Tên Thiệp!)
    if (navigator.clipboard && window.ClipboardItem) {
        try {
            const item = new ClipboardItem({
                'text/html': new Blob([htmlHyperlink], { type: 'text/html' }),
                'text/plain': new Blob([cleanTitle], { type: 'text/plain' })
            });
            navigator.clipboard.write([item]).catch(() => {});
            copiedOk = true;
        } catch (_) {}
    }

    return copiedOk;
}

// Hàm copy URL thuần khi người dùng chạm vào dòng địa chỉ URL
function copyRawUrlSync(url) {
    let ok = false;
    try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
    } catch (_) {}
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(url).catch(() => {});
    }
    return ok;
}

async function openShareLinkModal() {
    if (!shareLinkModal) return;

    const headerTitleEl = document.getElementById('share-modal-header-title');
    const titleLabelEl = document.getElementById('share-title-label-text');
    const suggestionsEl = document.getElementById('link-title-suggestions');

    if (window.isSelfOracleMode) {
        if (headerTitleEl) headerTitleEl.textContent = '🔗 Lưu & Chia Sẻ Link Thiệp';
        if (titleLabelEl) titleLabelEl.textContent = '🏷️ Tên gợi nhớ cho link thiệp của bạn';
        if (suggestionsEl) suggestionsEl.style.display = 'none';
    } else {
        if (headerTitleEl) headerTitleEl.textContent = '🔗 Tạo Link Thiệp 3D Gửi Tặng';
        if (titleLabelEl) titleLabelEl.textContent = '🏷️ Lời nhắn hiển thị kèm link';
        if (suggestionsEl) suggestionsEl.style.display = 'flex';
    }

    if (customLinkTitleInput && !customLinkTitleInput.value.trim()) {
        customLinkTitle = getEffectiveLinkTitle();
        customLinkTitleInput.value = customLinkTitle;
        if (linkTitleCharCount) linkTitleCharCount.textContent = `${customLinkTitle.length}/70`;
    }

    refreshShareModalPreviewUI();
    shareLinkModal.style.display = 'flex';

    // Nếu đang ở Bước 2 (chưa sang Bước 3) mà mở bảng đặt tên trước
    if (!currentUserImage || !step3.classList.contains('active')) {
        if (tgStatusDot) tgStatusDot.className = 'status-dot ready';
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = '✨ Đã lưu lời nhắn! Hãy bấm "Tạo thiệp 3D" để hoàn tất đường link.';
        }
        return;
    }

    if (!isCardCanvasDirtyForTelegram && cachedTelegramFileId) {
        if (tgStatusDot) tgStatusDot.className = 'status-dot ready';
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = '✅ Link thiệp đã sẵn sàng! Bấm Sao chép hoặc chọn ứng dụng để gửi ngay.';
        }
        refreshShareModalPreviewUI();
        return;
    }

    if (tgStatusDot) tgStatusDot.className = 'status-dot';
    if (tgUploadStatusText) {
        tgUploadStatusText.textContent = '⏳ Đang khởi tạo đường link thiệp 3D...';
    }

    try {
        await uploadCardToTelegramBot();
        if (tgStatusDot) tgStatusDot.className = 'status-dot ready';
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = '✅ Link thiệp đã sẵn sàng! Bấm Sao chép hoặc chọn ứng dụng để gửi ngay.';
        }
        refreshShareModalPreviewUI();
    } catch (err) {
        console.error('Lỗi lưu ảnh lên Telegram:', err);
        if (tgStatusDot) tgStatusDot.className = 'status-dot error';
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = '⚠️ Kết nối mạng chậm, hãy bấm "Sao chép Link Thiệp" để thử lại nhé.';
        }
    }
}

document.getElementById('open-share-link-modal-btn')?.addEventListener('click', (e) => {
    if (e.clientX && e.clientY) spawnTouchSparkle(e.clientX, e.clientY, 8);
    openShareLinkModal();
});

document.getElementById('step2-preset-link-btn')?.addEventListener('click', (e) => {
    if (e.clientX && e.clientY) spawnTouchSparkle(e.clientX, e.clientY, 6);
    openShareLinkModal();
});

document.getElementById('close-share-link-modal')?.addEventListener('click', () => {
    if (shareLinkModal) shareLinkModal.style.display = 'none';
});

shareLinkModal?.addEventListener('click', (e) => {
    if (e.target === shareLinkModal) shareLinkModal.style.display = 'none';
});

customLinkTitleInput?.addEventListener('input', (e) => {
    customLinkTitle = e.target.value;
    if (linkTitleCharCount) linkTitleCharCount.textContent = `${customLinkTitle.length}/70`;
    refreshShareModalPreviewUI();
});

document.getElementById('clear-link-title-btn')?.addEventListener('click', () => {
    if (!customLinkTitleInput) return;
    customLinkTitleInput.value = '';
    customLinkTitle = '';
    if (linkTitleCharCount) linkTitleCharCount.textContent = '0/70';
    customLinkTitleInput.focus();
    refreshShareModalPreviewUI();
});

document.querySelectorAll('.link-suggest-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        const suggested = chip.getAttribute('data-title') || '';
        if (customLinkTitleInput) {
            customLinkTitleInput.value = suggested;
            customLinkTitle = suggested;
            if (linkTitleCharCount) linkTitleCharCount.textContent = `${suggested.length}/70`;
            refreshShareModalPreviewUI();
        }
    });
});

async function ensureShareUrlReady() {
    if (currentUserImage && (isCardCanvasDirtyForTelegram || !cachedTelegramFileId)) {
        if (tgStatusDot) tgStatusDot.className = 'status-dot';
        if (tgUploadStatusText) tgUploadStatusText.textContent = '⏳ Đang đồng bộ ảnh thiệp...';
        await uploadCardToTelegramBot();
        if (tgStatusDot) tgStatusDot.className = 'status-dot ready';
        if (tgUploadStatusText) tgUploadStatusText.textContent = '✅ Link thiệp đã sẵn sàng!';
        refreshShareModalPreviewUI();
    }
    return buildShareableCardUrl(cachedTelegramFileId);
}

// Chạm vào tiêu đề xanh trong khung xem trước -> Copy Tên Thiệp đã gắn ẩn link
chatPreviewTitle?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!cachedTelegramFileId) return;
    const title = getEffectiveLinkTitle();
    const url = buildShareableCardUrl(cachedTelegramFileId);
    copyHiddenUrlHyperlinkSync(title, url);
    if (tgUploadStatusText) {
        tgUploadStatusText.textContent = `✅ Đã sao chép "${title}" (đã gắn ẩn URL)! Hãy Dán (Paste) vào Telegram ✨`;
    }
});

// Chạm vào dòng URL trong khung xem trước -> Copy riêng đường dẫn URL thuần
chatPreviewUrl?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!cachedTelegramFileId) return;
    const url = buildShareableCardUrl(cachedTelegramFileId);
    copyRawUrlSync(url);
    if (tgUploadStatusText) {
        tgUploadStatusText.textContent = '✅ Đã sao chép riêng đường dẫn URL thuần vào bộ nhớ tạm!';
    }
});

// Nút 1 (Chính): 📋 Sao chép Link Thiệp -> Copy ĐỒNG BỘ <a href="URL">Tên Thiệp</a> (ẩn hoàn toàn URL dưới Tên Thiệp!)
document.getElementById('copy-rich-link-btn')?.addEventListener('click', async () => {
    const copyTextSpan = document.getElementById('copy-rich-link-text');
    const origLabel = 'Sao chép Link Thiệp';
    const title = getEffectiveLinkTitle();

    // Trường hợp 1 (99%): Đã có sẵn cachedTelegramFileId -> Copy ĐỒNG BỘ ngay trong cử chỉ chạm (0ms delay) để giữ nguyên định dạng Hyperlink ẩn URL!
    if (cachedTelegramFileId && !isCardCanvasDirtyForTelegram) {
        const url = buildShareableCardUrl(cachedTelegramFileId);
        copyHiddenUrlHyperlinkSync(title, url);
        if (copyTextSpan) copyTextSpan.textContent = '✅ Đã sao chép (Ẩn link)!';
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = `✅ Đã sao chép "${title}" (đã gắn ẩn URL)! Bạn chỉ cần Dán (Paste) vào Telegram ✨`;
        }
        setTimeout(() => {
            if (copyTextSpan) copyTextSpan.textContent = origLabel;
        }, 2800);
        return;
    }

    // Trường hợp 2: Ảnh đang tải lên -> Đợi tải xong rồi copy ngay
    try {
        if (copyTextSpan) copyTextSpan.textContent = '⏳ Đang chuẩn bị link...';
        const url = await ensureShareUrlReady();
        const syncOk = copyHiddenUrlHyperlinkSync(title, url);

        if (syncOk) {
            if (copyTextSpan) copyTextSpan.textContent = '✅ Đã sao chép (Ẩn link)!';
            if (tgUploadStatusText) {
                tgUploadStatusText.textContent = `✅ Đã sao chép "${title}" (đã gắn ẩn URL)! Bạn chỉ cần Dán (Paste) vào Telegram ✨`;
            }
            setTimeout(() => {
                if (copyTextSpan) copyTextSpan.textContent = origLabel;
            }, 2800);
        } else {
            if (copyTextSpan) copyTextSpan.textContent = '👉 Link đã xong! Chạm để Sao chép';
            if (tgUploadStatusText) {
                tgUploadStatusText.textContent = '✅ Link đã tạo xong! Hãy chạm lại nút bên dưới để sao chép Tên Thiệp ẩn link nhé ✨';
            }
        }
    } catch (err) {
        if (copyTextSpan) copyTextSpan.textContent = origLabel;
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = '⚠️ Kết nối đang bận, vui lòng bấm lại "Sao chép Link Thiệp" nhé!';
        }
    }
});

// Nút 2: 📱 Gửi Zalo / App khác (Mở bảng Chia sẻ hệ thống iOS/Android hoặc tự động Copy kèm URL cho Zalo)
document.getElementById('share-zalo-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const origText = '📱 Gửi Zalo / App khác';
    const title = getEffectiveLinkTitle();

    try {
        const url = await ensureShareUrlReady();

        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: title,
                    url: url
                });
                return;
            } catch (err) {
                if (err && err.name === 'AbortError') return;
            }
        }

        copyRawUrlSync(`${title}\n${url}`);
        if (btn) btn.textContent = '✅ Đã chép! Dán vào Zalo';
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = '✅ Đã sao chép Lời nhắn & Link! Hãy mở Zalo / Messenger và Dán (Paste) để gửi nhé 🌸';
        }
        setTimeout(() => {
            if (btn) btn.textContent = origText;
        }, 2800);
    } catch (err) {
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = '⚠️ Vui lòng đợi khởi tạo link xong rồi thử lại nhé!';
        }
    }
});

// Nút 3: ✈️ Gửi qua Telegram -> Sao chép ĐỒNG BỘ Tên Thiệp đã gắn ẩn URL (<a href="URL">Tên Thiệp</a>) để dán vào Telegram không bị lộ URL thô!
document.getElementById('share-telegram-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const origText = '✈️ Gửi qua Telegram';
    const title = getEffectiveLinkTitle();

    if (cachedTelegramFileId && !isCardCanvasDirtyForTelegram) {
        const url = buildShareableCardUrl(cachedTelegramFileId);
        copyHiddenUrlHyperlinkSync(title, url);
        if (btn) btn.textContent = '✅ Đã Copy! Dán vào Telegram';
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = `✅ Đã copy "${title}" (ẩn URL)! Bạn chỉ cần Dán (Paste) vào cuộc trò chuyện Telegram ✨`;
        }
        setTimeout(() => {
            if (btn) btn.textContent = origText;
        }, 2800);
        return;
    }

    try {
        if (btn) btn.textContent = '⏳ Đang chuẩn bị...';
        const url = await ensureShareUrlReady();
        copyHiddenUrlHyperlinkSync(title, url);
        if (btn) btn.textContent = '✅ Đã Copy! Dán vào Telegram';
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = `✅ Đã copy "${title}" (ẩn URL)! Bạn chỉ cần Dán (Paste) vào cuộc trò chuyện Telegram ✨`;
        }
        setTimeout(() => {
            if (btn) btn.textContent = origText;
        }, 2800);
    } catch (err) {
        if (btn) btn.textContent = origText;
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = '⚠️ Vui lòng đợi khởi tạo link xong rồi thử lại nhé!';
        }
    }
});

// ====== 5. CHẾ ĐỘ NGƯỜI NHẬN MỞ BÌ THIỆP 3D & CHẾ ĐỘ XEM THỬ MỞ BÌ THIỆP ======
const SAFE_BLANK_PIXEL_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const _TG_URL_CACHE_TTL_MS = 45 * 60 * 1000; // 45 phút (file_path của Telegram có hiệu lực ~60 phút)
const _inFlightGetFileMap = Object.create(null);

function _cacheResolvedTelegramUrl(fileId, fullUrl) {
    if (!fileId || !fullUrl) return;
    const cacheKey = `tg_card_url_v2_${fileId}`;
    const payload = JSON.stringify({ u: fullUrl, t: Date.now() });
    try { sessionStorage.setItem(cacheKey, payload); } catch (_) {}
    try { localStorage.setItem(cacheKey, payload); } catch (_) {}
}

function _readCachedTelegramUrl(fileId) {
    if (!fileId) return '';
    const cacheKey = `tg_card_url_v2_${fileId}`;
    const now = Date.now();
    for (const store of [sessionStorage, localStorage]) {
        try {
            const raw = store.getItem(cacheKey);
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            if (parsed && parsed.u && (now - Number(parsed.t || 0)) < _TG_URL_CACHE_TTL_MS) {
                return parsed.u;
            }
        } catch (_) {}
    }
    return '';
}

async function resolveTelegramFileUrl(fileId, directFilePath = '', forceRefresh = false) {
    if (!fileId || fileId === 'local' || !isValidTelegramFileId(fileId)) return '';
    const { ep, tk } = _getCloudCfg();

    // 1. Nếu trong Link đã nhúng sẵn file_path (meta.p) ĐÃ QUA KIỂM ĐỊNH CHỐNG PATH TRAVERSAL, trả về ngay lập tức trong 0ms!
    if (directFilePath && !forceRefresh && isValidTelegramFilePath(directFilePath)) {
        return `${ep}/file/bot${tk}/${directFilePath}`;
    }

    // 2. Kiểm tra bộ nhớ đệm có kiểm soát TTL 45 phút
    if (!forceRefresh) {
        const cached = _readCachedTelegramUrl(fileId);
        if (cached) return cached;
    }

    // 3. Chống gọi trùng lặp (In-flight Deduplication) nếu cùng 1 fileId đang được phân giải
    if (!forceRefresh && _inFlightGetFileMap[fileId]) {
        return _inFlightGetFileMap[fileId];
    }

    const fetchTask = (async () => {
        const apiTarget = `${ep}/bot${tk}/getFile?file_id=${encodeURIComponent(fileId)}`;
        const endpoints = [
            apiTarget,
            `https://corsproxy.io/?${encodeURIComponent(apiTarget)}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(apiTarget)}`
        ];

        let filePath = '';
        for (const url of endpoints) {
            try {
                const res = await _nativeFetch(url);
                if (!res.ok) continue;
                const data = await res.json();
                if (data?.result?.file_path && isValidTelegramFilePath(data.result.file_path)) {
                    filePath = data.result.file_path;
                    break;
                }
            } catch (_) {}
        }

        if (!filePath) throw new Error('Không tìm thấy file_path hợp lệ từ Telegram');

        const fullUrl = `${ep}/file/bot${tk}/${filePath}`;
        _cacheResolvedTelegramUrl(fileId, fullUrl);
        return fullUrl;
    })();

    _inFlightGetFileMap[fileId] = fetchTask;
    try {
        return await fetchTask;
    } finally {
        delete _inFlightGetFileMap[fileId];
    }
}

// Đua song song có điều phối (Staggered Parallel CDN Race):
// - Tuyến 1 (0ms): Ưu tiên tuyệt đối Cloudflare Edge CDN (wsrv.nl) để lưu cache tại trạm biên, gánh tải cho hàng chục nghìn người mở cùng lúc!
// - Tuyến 2 (1350ms): Chỉ kích hoạt trực tiếp nếu sau 1.35s tuyến CDN biên chưa phản hồi (tránh tải đúp 2 luồng trên mạng 4G!).
// - Tuyến 3 (2500ms): Nhánh dự phòng qua corsproxy.io.
async function raceVerifyImageCandidates(rawUrl) {
    const candidates = [
        { url: `https://wsrv.nl/?url=${encodeURIComponent(rawUrl)}&output=jpg&q=100`, delayMs: 0 },
        { url: rawUrl, delayMs: 1350 },
        { url: `https://corsproxy.io/?${encodeURIComponent(rawUrl)}`, delayMs: 2500 }
    ];

    let settled = false;
    return new Promise((resolve, reject) => {
        let failCount = 0;
        const timers = [];

        const cleanupTimers = () => {
            while (timers.length) clearTimeout(timers.pop());
        };

        candidates.forEach(({ url, delayMs }) => {
            const startTimer = setTimeout(() => {
                if (settled) return;
                const probe = new Image();
                probe.decoding = 'async';
                const timeoutTimer = setTimeout(() => {
                    probe.onload = null;
                    probe.onerror = null;
                    onFail();
                }, 7500);
                timers.push(timeoutTimer);

                const onFail = () => {
                    if (settled) return;
                    failCount++;
                    if (failCount >= candidates.length) {
                        cleanupTimers();
                        reject(new Error('All image CDN routes failed'));
                    }
                };

                probe.onload = async () => {
                    clearTimeout(timeoutTimer);
                    if (settled) return;
                    if (typeof probe.decode === 'function') {
                        await probe.decode().catch(() => {});
                    }
                    if (!settled && probe.naturalWidth > 2 && probe.naturalHeight > 2) {
                        settled = true;
                        cleanupTimers();
                        resolve(url);
                    } else {
                        onFail();
                    }
                };
                probe.onerror = () => {
                    clearTimeout(timeoutTimer);
                    onFail();
                };
                probe.src = url;
            }, delayMs);
            timers.push(startTimer);
        });
    });
}

// Tải và giải mã hoàn chỉnh (GPU Decode 100%) bức ảnh thiệp trước khi cho phép Phong Bì & Ấn Sáp xuất hiện
async function preloadAndDecodeRecipientCardImage(fileId, directFilePath = '') {
    let rawUrl = await resolveTelegramFileUrl(fileId, directFilePath, false);
    if (!rawUrl) throw new Error('URL ảnh rỗng');

    let verifiedUrl = '';
    try {
        verifiedUrl = await raceVerifyImageCandidates(rawUrl);
    } catch (_) {
        // Nếu đường dẫn trực tiếp (meta.p) hoặc bộ nhớ đệm đã hết hạn sau 1 giờ, tự động làm mới từ file_id vĩnh viễn
        rawUrl = await resolveTelegramFileUrl(fileId, '', true);
        verifiedUrl = await raceVerifyImageCandidates(rawUrl);
    }

    if (!verifiedUrl) {
        throw new Error('Không thể tải và giải mã ảnh thiệp qua các tuyến CDN');
    }

    recipientRawTelegramUrl = rawUrl;
    recipientResolvedImgUrl = verifiedUrl;

    const u3dCardImg = document.getElementById('u3d-card-img');
    const recLetterImg = document.getElementById('recipient-letter-img');
    const targetImgs = [u3dCardImg, finalResultImg].filter(Boolean);

    await Promise.all(targetImgs.map((imgEl) => new Promise((resolve) => {
        const done = () => {
            if (typeof imgEl.decode === 'function') {
                imgEl.decode().catch(() => {}).finally(resolve);
            } else {
                resolve();
            }
        };
        imgEl.onload = done;
        imgEl.onerror = () => resolve();
        imgEl.src = verifiedUrl;
        if (imgEl.complete && imgEl.naturalWidth > 2) {
            done();
        }
    })));

    if (recLetterImg) recLetterImg.src = verifiedUrl;
    if (saveModalImg) saveModalImg.src = verifiedUrl;

    fitCardShowcaseToWrap();
    if (typeof window.u3dRefreshTargetRect === 'function') {
        window.u3dRefreshTargetRect();
    }

    // Đánh dấu ảnh đã sẵn sàng 100% trên GPU -> Nghi thức Triệu Hồi 3D lập tức đưa Phong Bì & Ấn Sáp hạ xuống!
    window.isRecipientCardImageReady = true;

    // Tải ngầm sẵn Blob chất lượng gốc 100% qua tuyến có CORS (wsrv.nl q=100 / corsproxy) để khi Người Nhận bấm "📥 Lưu thiệp" trên iOS/Android sẽ mở bảng lưu ảnh ngay ở 0ms!
    setTimeout(async () => {
        if (recipientCachedBlob) return;
        const corsCandidates = [
            `https://wsrv.nl/?url=${encodeURIComponent(rawUrl)}&output=jpg&q=100`,
            `https://corsproxy.io/?${encodeURIComponent(rawUrl)}`
        ];
        for (const cUrl of corsCandidates) {
            try {
                const res = await fetch(cUrl);
                if (res.ok) {
                    const b = await res.blob();
                    if (b && b.size > 1000) {
                        recipientCachedBlob = b;
                        break;
                    }
                }
            } catch (_) {}
        }
    }, 800);

    return verifiedUrl;
}

function setupEnvelopeGiftStageUI({ title, subtitle, motionId, themeKey, isRealRecipient, autoOpen = false }) {
    window.launchUnified3DEnvelopeDirector({
        autoOpen,
        autoOpenDelay: 280,
        title: title || recipientCardMeta?.l || getEffectiveLinkTitle(),
        subtitle: subtitle || (recipientName ? `💌 Dành tặng: ${recipientName}` : 'Chạm vào Phong Ấn 3D ở giữa phong bì để mở thiệp ✨'),
        motionId: motionId || window.currentMotionEffect || 'bloom',
        themeKey: themeKey || currentColorTheme || 'emerald',
        isRealRecipient: !!isRealRecipient
    });
}

// Nút "✉️ Mở thử" (Đóng modal chia sẻ nếu đang mở, rồi cho người tạo tự tay chạm vào Phong Ấn 3D để mở phong bì)
function previewCreatorEnvelopeOpening() {
    if (shareLinkModal) shareLinkModal.style.display = 'none';
    renderCurrentStep2CardAndPreviewEnvelope(false);
}
window.previewCreatorEnvelopeOpening = previewCreatorEnvelopeOpening;

document.getElementById('step3-preview-envelope-btn')?.addEventListener('click', previewCreatorEnvelopeOpening);
document.getElementById('test-recipient-view-btn')?.addEventListener('click', previewCreatorEnvelopeOpening);

// Các nút điều khiển thanh lịch của Người Nhận ở Bước 3 (#recipient-luxury-dock)
function replayRecipientEnvelope() {
    setupEnvelopeGiftStageUI({
        title: recipientCardMeta?.l || getEffectiveLinkTitle(),
        subtitle: recipientCardMeta?.r ? `💌 ${recipientCardMeta.r}` : 'Chạm vào Phong Ấn 3D ở giữa phong bì để mở lại thiệp ✨',
        motionId: window.currentMotionEffect,
        themeKey: currentColorTheme,
        isRealRecipient: window.isRecipientCardLinkMode,
        autoOpen: false
    });
}

document.getElementById('recipient-replay-env-btn')?.addEventListener('click', replayRecipientEnvelope);

document.getElementById('recipient-save-card-btn')?.addEventListener('click', (e) => {
    if (e.clientX && e.clientY) spawnTouchSparkle(e.clientX, e.clientY, 10);
    window.handleRecipientDownloadCard();
});

window.restoreCreatorStep1UI = function (setOpenedState = true) {
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
    if (cardShowcase) {
        cardShowcase.style.opacity = '1';
        cardShowcase.style.transform = '';
    }

    window.isEnvelopeGiftMode = false;
    window.isRecipientCardLinkMode = false;
    if (setOpenedState) {
        window.isSelfOracleMode = false;
        window.skyOracleUserThumbCanvas = null;
        if (window.location.search && typeof window.history?.replaceState === 'function') {
            try {
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (_) {}
        }
    }
    document.body.classList.remove('recipient-mode', 'u3d-stage-active');

    const step1CardCol = document.getElementById('step1-card-column');
    const recLetterCol = document.getElementById('recipient-letter-column');
    const banner = document.getElementById('recipient-envelope-banner');
    const footer = document.getElementById('recipient-envelope-footer');
    if (step1CardCol) step1CardCol.style.display = 'flex';
    if (recLetterCol) recLetterCol.style.display = 'none';
    if (banner) banner.style.display = 'none';
    if (footer) footer.style.display = 'none';

    const creatorTopbar = document.getElementById('creator-topbar');
    const creatorQuickBar = document.getElementById('creator-quick-bar');
    const recipientLuxuryDock = document.getElementById('recipient-luxury-dock');
    const dlLabel = document.getElementById('download-btn-label');
    if (creatorTopbar) creatorTopbar.style.display = 'grid';
    if (creatorQuickBar) creatorQuickBar.style.display = 'grid';
    if (recipientLuxuryDock) recipientLuxuryDock.style.display = 'none';
    if (dlLabel) dlLabel.textContent = 'Lưu ảnh';

    applyEnvelopeThemeColors('emerald');
    if (setOpenedState && step1) {
        step1.classList.remove('env-flap-open', 'env-flap-behind', 'env-letter-pull');
        step1.classList.add('env-appeared', 'envelope-opened');
    }
};

// Nút "✨ Tạo thiệp" dành cho Người Nhận muốn tự làm một tấm thiệp mới
document.getElementById('recipient-make-own-btn')?.addEventListener('click', () => {
    window.restoreCreatorStep1UI(true);
    window.history.replaceState({}, document.title, window.location.pathname);

    step3.classList.remove('active');
    step2.classList.remove('active');
    step1.classList.add('active');
});

// Hàm tải ảnh chất lượng gốc về máy cho Người Nhận (Ưu tiên 1: Cloudflare Edge wsrv.nl có sẵn CORS *)
window.handleRecipientDownloadCard = async function () {
    const imgSrc = recipientResolvedImgUrl || (finalResultImg ? finalResultImg.src : '');
    if (!imgSrc) return;

    if (!recipientCachedBlob && imgSrc.startsWith('http')) {
        const rawSource = recipientRawTelegramUrl || imgSrc;
        const downloadCandidates = [];
        if (imgSrc.includes('wsrv.nl')) {
            downloadCandidates.push(imgSrc);
        }
        if (rawSource && !rawSource.includes('wsrv.nl')) {
            downloadCandidates.push(`https://wsrv.nl/?url=${encodeURIComponent(rawSource)}&output=jpg&q=100`);
        }
        downloadCandidates.push(
            `https://corsproxy.io/?${encodeURIComponent(rawSource)}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(rawSource)}`
        );

        for (const pUrl of downloadCandidates) {
            try {
                const res = await fetch(pUrl);
                if (res.ok) {
                    const b = await res.blob();
                    if (b && b.size > 1000) {
                        recipientCachedBlob = b;
                        break;
                    }
                }
            } catch (_) {}
        }
    }

    if (recipientCachedBlob) {
        const file = new File([recipientCachedBlob], 'Thiep_20_10_3D.jpg', { type: 'image/jpeg' });
        if (isMobileDevice() && navigator.canShare && navigator.share) {
            try {
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file] });
                    return;
                }
            } catch (err) {
                if (err && err.name === 'AbortError') return;
            }
        }
        if (!isInAppBrowser() && !isIOSDevice()) {
            try {
                const blobUrl = URL.createObjectURL(recipientCachedBlob);
                const link = document.createElement('a');
                link.download = 'Thiep_20_10_3D.jpg';
                link.href = blobUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
                return;
            } catch (_) {}
        }
    }

    showSaveFallbackModal();
};

// ====== 6. TỰ ĐỘNG KHỞI CHẠY CHẾ ĐỘ NGƯỜI NHẬN KHI MỞ ĐƯỜNG LINK ?card=... ======
async function checkAndInitRecipientLinkOnLoad() {
    const params = new URLSearchParams(window.location.search);
    const rawCard = params.get('card');
    if (!rawCard || rawCard.length > 1024) {
        document.title = 'Thiệp 20/10 - Tôn vinh phụ nữ Việt Nam';
        return;
    }

    const meta = decodeCardPayload(rawCard);
    if (!meta || !meta.f || !isValidTelegramFileId(meta.f)) {
        document.title = 'Thiệp 20/10 - Tôn vinh phụ nữ Việt Nam';
        return;
    }

    const safeLinkTitle = sanitizeSafeText(meta.l || '', 70) || '💌 Bạn nhận được một tấm thiệp 3D 20/10 đặc biệt 🌸';
    const safeRecTitle = sanitizeSafeText(meta.r || '', 45);
    const safeMotionId = _VALID_MOTION_IDS.includes(meta.m) ? meta.m : 'bloom';
    const safeThemeKey = _VALID_THEME_KEYS.includes(meta.t) ? meta.t : 'emerald';
    const safeFilePath = (meta.p && isValidTelegramFilePath(meta.p)) ? meta.p : '';

    meta.l = safeLinkTitle;
    meta.r = safeRecTitle;
    meta.m = safeMotionId;
    meta.t = safeThemeKey;
    meta.p = safeFilePath;

    recipientCardMeta = meta;
    customLinkTitle = safeLinkTitle;
    recipientName = safeRecTitle;
    window.currentMotionEffect = safeMotionId;
    currentColorTheme = safeThemeKey;

    document.title = safeLinkTitle;

    // Đặt ảnh placeholder trong suốt 1x1 an toàn tuyệt đối (không bao giờ hiện icon crash/broken image)
    // và khóa trạng thái sẵn sàng cho đến khi ảnh tải + decode xong 100%
    window.isRecipientCardImageReady = false;
    const u3dCardImg = document.getElementById('u3d-card-img');
    if (u3dCardImg) u3dCardImg.src = SAFE_BLANK_PIXEL_GIF;
    if (finalResultImg) finalResultImg.src = SAFE_BLANK_PIXEL_GIF;

    // Khởi chạy Sân Khấu 3D ở pha 'summoning' (Nghi thức Vũ Đạo Ánh Sáng 3D thuần túy, không chữ Loading, ẩn phong bì & ấn sáp)
    setupEnvelopeGiftStageUI({
        title: safeLinkTitle,
        subtitle: safeRecTitle ? `💌 ${safeRecTitle}` : 'Một món quà 3D đặc biệt đang chờ bạn mở phong bì ✨',
        motionId: safeMotionId,
        themeKey: safeThemeKey,
        isRealRecipient: true,
        autoOpen: false
    });

    // Tải & giải mã hoàn chỉnh (img.decode()) ảnh chất lượng gốc từ đám mây trước khi triệu hồi Phong Bì & Ấn Sáp
    try {
        await preloadAndDecodeRecipientCardImage(meta.f, safeFilePath);
    } catch (err) {
        console.error('Không thể tải ảnh thiệp:', err);
        // Thử lại lần 2 sau 1.0s (bỏ qua đường dẫn tĩnh để lấy mới từ file_id nếu mạng chập chờn)
        setTimeout(async () => {
            try {
                await preloadAndDecodeRecipientCardImage(meta.f, '');
            } catch (retryErr) {
                console.error('Thử tải lại ảnh thiệp thất bại:', retryErr);
            }
        }, 1000);
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', checkAndInitRecipientLinkOnLoad);
} else {
    checkAndInitRecipientLinkOnLoad();
}

})();



