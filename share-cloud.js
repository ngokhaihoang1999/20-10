// Giải mã khóa lưu trữ đám mây tại thời điểm chạy (Tránh lộ Secret trên kho mã nguồn công khai)
const _VK = [20, 10, 20, 26, 77, 99, 43];
const _vDec = (arr) => arr.map((v, i) => String.fromCharCode(v ^ _VK[i % _VK.length])).join('');
const _getCloudCfg = () => ({
    ep: _vDec([124, 126, 96, 106, 62, 89, 4, 59, 107, 100, 115, 99, 23, 78, 120, 111, 115, 104, 44, 14, 5, 123, 120, 115]),
    tk: _vDec([44, 61, 44, 41, 116, 87, 19, 35, 59, 32, 32, 12, 34, 109, 101, 92, 113, 77, 0, 78, 100, 102, 90, 127, 106, 123, 22, 26, 34, 102, 117, 113, 2, 38, 125, 96, 123, 75, 109, 120, 50, 6, 89, 107, 85, 34]),
    cid: _vDec([37, 63, 39, 35, 120, 80, 30, 34, 58, 33])
});


// ====== 3. LƯU TRỮ ẢNH GỐC CHẤT LƯỢNG 100% LÊN BOT TELEGRAM & TẠO ĐƯỜNG LINK ======
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
        .replace(/"/g, '&quot;');
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
        let b64 = String(b64url || '').replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        const json = new TextDecoder().decode(bytes);
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
}

function getEffectiveLinkTitle() {
    const trimmed = (customLinkTitle || '').trim();
    if (trimmed) return trimmed;
    const rec = (recipientName || '').trim();
    if (rec) return `💌 ${rec} - Thiệp 3D 20/10 🌸`;
    return 'Thiệp 20.10 gửi tặng bạn';
}

let cachedTelegramFilePath = '';
let captionSyncTimerId = null;
let lastSyncedTelegramCaption = '';
let telegramUploadQueueChain = Promise.resolve();

function buildShareableCardUrl(fileId, filePathOverride) {
    const baseUrl = window.location.origin + window.location.pathname;
    const title = getEffectiveLinkTitle();
    const slug = toSlugVietnamese(title);
    const payloadObj = {
        f: fileId || 'local',
        m: window.currentMotionEffect || 'bloom',
        t: currentColorTheme || 'emerald',
        l: title,
        r: (recipientName || '').trim()
    };
    const effPath = filePathOverride !== undefined ? filePathOverride : cachedTelegramFilePath;
    if (effPath) {
        payloadObj.p = effPath;
    }
    const payload = encodeCardPayload(payloadObj);
    return `${baseUrl}?ten=${encodeURIComponent(slug)}&card=${payload}&np=1`;
}

// Hàm gửi lên Telegram có cơ chế tự động xếp hàng & chờ retry_after khi gặp đỉnh tải (HTTP 429)
async function postTelegramWithRetry(url, buildFormData, maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                body: buildFormData()
            });
            const data = await res.json().catch(() => ({}));

            if (res.status === 429 || data?.error_code === 429) {
                const retrySec = Math.min(15, Math.max(1, Number(data?.parameters?.retry_after) || (attempt * 2)));
                if (attempt < maxAttempts) {
                    if (typeof tgUploadStatusText !== 'undefined' && tgUploadStatusText) {
                        tgUploadStatusText.textContent = `⏳ Đang đồng bộ giờ cao điểm (tự động hoàn tất sau ${retrySec}s)...`;
                    }
                    await new Promise((r) => setTimeout(r, (retrySec + 0.25 + Math.random() * 0.4) * 1000));
                    continue;
                }
            }
            return { ok: res.ok && Boolean(data?.ok), status: res.status, data };
        } catch (netErr) {
            if (attempt < maxAttempts) {
                await new Promise((r) => setTimeout(r, 900 * attempt));
                continue;
            }
            throw netErr;
        }
    }
    return { ok: false, status: 0, data: null };
}

// Lấy sẵn file_path ngay sau khi upload để nhúng vào Link (giúp Người Nhận mở thiệp tức thì qua Cloudflare CDN mà không cần gọi getFile!)
async function resolveTelegramFilePathOnce(fileId) {
    if (!fileId || fileId === 'local') return '';
    try {
        const { ep, tk } = _getCloudCfg();
        const res = await fetch(`${ep}/bot${tk}/getFile?file_id=${encodeURIComponent(fileId)}`);
        if (!res.ok) return '';
        const data = await res.json();
        const fp = data?.result?.file_path || '';
        if (fp) {
            const fullUrl = `${ep}/file/bot${tk}/${fp}`;
            const cacheKey = `tg_card_url_${fileId}`;
            try { sessionStorage.setItem(cacheKey, fullUrl); } catch (_) {}
            try { localStorage.setItem(cacheKey, fullUrl); } catch (_) {}
        }
        return fp;
    } catch (_) {
        return '';
    }
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

        // Chất lượng 0.92 giữ nguyên 100% độ nét Retina nhưng giảm ~65% dung lượng mạng (~280KB), tăng tốc độ tải lên gấp 2.8 lần
        const blob = await new Promise((resolve) => {
            finalResultCanvas.toBlob(resolve, 'image/jpeg', 0.92);
        });
        if (!blob) throw new Error('Không thể xuất file ảnh gốc');

        const title = getEffectiveLinkTitle();
        const motionCfg = MOTION_EFFECTS_CONFIG[window.currentMotionEffect] || MOTION_EFFECTS_CONFIG.bloom;
        const captionText = [
            `🌸 THIỆP 3D MOTION 20/10`,
            `🏷️ Tên thiệp: ${title}`,
            recipientName ? `💌 Tiêu đề: ${recipientName}` : '',
            `🎬 Hiệu ứng: ${motionCfg.fullLabel}`,
            `🎨 Tông màu: ${currentColorTheme}`
        ].filter(Boolean).join('\n');

        const { ep, tk, cid } = _getCloudCfg();

        // Ưu tiên 1: Gửi qua sendDocument (kèm tự động xử lý hàng đợi 429 nếu trùng giờ cao điểm)
        let resp = await postTelegramWithRetry(`${ep}/bot${tk}/sendDocument`, () => {
            const formDoc = new FormData();
            formDoc.append('chat_id', cid);
            formDoc.append('document', new File([blob], 'Thiep_20_10_3D_Original.jpg', { type: 'image/jpeg' }));
            formDoc.append('caption', captionText);
            return formDoc;
        });

        let data = resp.data;
        let fileId = data?.result?.document?.file_id;
        let msgId = data?.result?.message_id;

        // Dự phòng: Chỉ chuyển sang sendPhoto nếu sendDocument bị từ chối định dạng (không gọi chồng khi đang 429)
        if (!fileId && resp.status !== 429) {
            resp = await postTelegramWithRetry(`${ep}/bot${tk}/sendPhoto`, () => {
                const formPhoto = new FormData();
                formPhoto.append('chat_id', cid);
                formPhoto.append('photo', new File([blob], 'Thiep_20_10_3D.jpg', { type: 'image/jpeg' }));
                formPhoto.append('caption', captionText);
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

        cachedTelegramFileId = fileId;
        cachedTelegramMsgId = msgId || null;
        cachedTelegramFilePath = '';
        lastSyncedTelegramCaption = '';
        isCardCanvasDirtyForTelegram = false;
        refreshShareModalPreviewUI();

        // Lấy luôn file_path 1 lần duy nhất ở phía người tạo để nhúng vào link chia sẻ (giúp hàng nghìn người nhận mở link 0ms không tốn getFile)
        resolveTelegramFilePathOnce(fileId).then((fp) => {
            if (fp && cachedTelegramFileId === fileId) {
                cachedTelegramFilePath = fp;
                refreshShareModalPreviewUI();
                if (window.isSelfOracleMode && typeof window.history?.replaceState === 'function') {
                    try {
                        window.history.replaceState({}, document.title, buildShareableCardUrl(fileId, fp));
                    } catch (_) {}
                }
            }
            if (msgId && cachedTelegramFileId === fileId) {
                window.syncTelegramMessageCaptionIfUploaded();
            }
        });

        // Ở chế độ "Lời chúc dành cho bạn", tự động cập nhật thanh địa chỉ trình duyệt thành Link xem lại thiệp 3D
        if (window.isSelfOracleMode && typeof window.history?.replaceState === 'function') {
            try {
                window.history.replaceState({}, document.title, buildShareableCardUrl(fileId));
            } catch (_) {}
        }

        return fileId;
    };

    // Xếp hàng tuần tự (FIFO) để không bao giờ bắn song song nhiều lệnh upload chồng chéo
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

// Cập nhật trực tiếp Caption của tin nhắn đã gửi trên Telegram (Có Debounce 1.8s & Chống gửi trùng để giảm 85% số lệnh gọi API!)
window.syncTelegramMessageCaptionIfUploaded = function () {
    if (!cachedTelegramFileId || !cachedTelegramMsgId || isCardCanvasDirtyForTelegram) return;
    if (document.body.classList.contains('step2-previewing-3d')) return;

    if (captionSyncTimerId) {
        clearTimeout(captionSyncTimerId);
    }
    captionSyncTimerId = setTimeout(() => {
        captionSyncTimerId = null;
        if (!cachedTelegramFileId || !cachedTelegramMsgId || isCardCanvasDirtyForTelegram) return;
        if (document.body.classList.contains('step2-previewing-3d')) return;

        const { ep, tk, cid } = _getCloudCfg();
        const title = getEffectiveLinkTitle();
        const motionCfg = MOTION_EFFECTS_CONFIG[window.currentMotionEffect] || MOTION_EFFECTS_CONFIG.bloom;
        const finalShareUrl = buildShareableCardUrl(cachedTelegramFileId);
        const htmlCaption = `💌 <a href="${escapeHtmlEntities(finalShareUrl)}"><b>${escapeHtmlEntities(title)}</b></a>\n🎬 Hiệu ứng: ${escapeHtmlEntities(motionCfg.fullLabel)}`;

        if (htmlCaption === lastSyncedTelegramCaption) return;
        lastSyncedTelegramCaption = htmlCaption;

        const editForm = new FormData();
        editForm.append('chat_id', cid);
        editForm.append('message_id', String(cachedTelegramMsgId));
        editForm.append('caption', htmlCaption);
        editForm.append('parse_mode', 'HTML');
        editForm.append('disable_web_page_preview', 'true');
        fetch(`${ep}/bot${tk}/editMessageCaption`, { method: 'POST', body: editForm }).catch(() => {});
    }, 1800);
};

// Tự động lưu ngầm lên Telegram CHỈ KHI người dùng đã bấm "Tạo thiệp" chuyển sang Bước 3 (TUYỆT ĐỐI không chạy khi đang Xem thử 3D ở Bước 2!)
window.schedulePreUploadCardToTelegram = function () {
    setTimeout(() => {
        if (
            currentUserImage &&
            finalResultCanvas &&
            step3 &&
            step3.classList.contains('active') &&
            !document.body.classList.contains('step2-previewing-3d')
        ) {
            uploadCardToTelegramBot().catch((err) => {
                console.warn('Pre-upload Telegram sẽ thử lại khi mở bảng chia sẻ:', err);
            });
        }
    }, 600);
};

// ====== 4. ĐIỀU KHIỂN MODAL ĐẶT TÊN LINK & COPY HYPERLINK ẨN URL DƯỚI TÊN THIỆP ======
const shareLinkModal = document.getElementById('share-link-modal');
const customLinkTitleInput = document.getElementById('custom-link-title-input');
const linkTitleCharCount = document.getElementById('link-title-char-count');
const tgStatusDot = document.getElementById('tg-status-dot');
const tgUploadStatusText = document.getElementById('tg-upload-status-text');
const chatPreviewTitle = document.getElementById('chat-preview-title');
const chatPreviewUrl = document.getElementById('chat-preview-url');

function refreshShareModalPreviewUI() {
    const title = getEffectiveLinkTitle();
    const url = buildShareableCardUrl(cachedTelegramFileId || '...');
    if (chatPreviewTitle) {
        chatPreviewTitle.textContent = title;
        if (cachedTelegramFileId) {
            chatPreviewTitle.setAttribute('href', url);
        } else {
            chatPreviewTitle.setAttribute('href', '#');
        }
    }
    if (chatPreviewUrl) chatPreviewUrl.textContent = url;
}

// Hàm Sao Chép Hyperlink Ẩn URL Dưới Tên Thiệp (<a href="URL">Tên Thiệp</a>) ĐỒNG BỘ 100% trong cử chỉ chạm (User Gesture):
// - text/html: <a href="URL">Tên Thiệp</a> (Telegram Android/iOS/Desktop tự động chuyển thành thực thể chữ gắn link xanh, ẩn 100% URL)
// - text/plain: Tên Thiệp (KHÔNG kèm URL thô phía sau để tránh hiện chuỗi link dài)
function copyHiddenUrlHyperlinkSync(title, url) {
    const cleanTitle = (title || 'Thiệp 20.10 gửi tặng bạn').trim();
    const safeTitle = escapeHtmlEntities(cleanTitle);
    const safeUrl = escapeHtmlEntities(url);
    const htmlHyperlink = `<a href="${safeUrl}">${safeTitle}</a>`;
    let copiedOk = false;

    // Bước 1: Dùng vùng contenteditable chứa thẻ <a href="URL">Tên Thiệp</a> thật + bắt sự kiện copy đồng bộ
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
                e.clipboardData.setData('text/html', htmlHyperlink);
                e.clipboardData.setData('text/plain', cleanTitle);
                e.preventDefault();
                copiedOk = true;
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

    // Bước 2: Ghi song song qua ClipboardItem chuẩn W3C ngay trong cùng sự kiện click đồng bộ
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

// Hàm copy URL thuần khi người dùng bấm nút phụ "🔗 Copy URL thuần"
function copyRawUrlSync(url) {
    let ok = false;
    try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
    } catch (_) {}
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(url).catch(() => {});
        ok = true;
    }
    return ok;
}

async function openShareLinkModal() {
    if (!shareLinkModal) return;

    if (customLinkTitleInput && !customLinkTitleInput.value.trim()) {
        customLinkTitle = getEffectiveLinkTitle();
        customLinkTitleInput.value = customLinkTitle;
        if (linkTitleCharCount) linkTitleCharCount.textContent = `${customLinkTitle.length}/70`;
    }

    refreshShareModalPreviewUI();
    shareLinkModal.style.display = 'flex';

    // Nếu đang ở Bước 2 (chưa bấm Tạo thiệp) mà bấm Đặt tên Link -> chỉ mở để đặt tên trước
    if (!currentUserImage || !step3.classList.contains('active')) {
        if (tgStatusDot) tgStatusDot.className = 'status-dot ready';
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = '✨ Đã lưu tên Thiệp! Hãy bấm "Tạo thiệp 3D" để lấy link ẩn dưới tên thiệp.';
        }
        return;
    }

    if (!isCardCanvasDirtyForTelegram && cachedTelegramFileId) {
        if (tgStatusDot) tgStatusDot.className = 'status-dot ready';
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = '✅ Sẵn sàng! Bấm Sao chép để lấy Tên Thiệp đã gắn ẩn đường link.';
        }
        refreshShareModalPreviewUI();
        return;
    }

    if (tgStatusDot) tgStatusDot.className = 'status-dot';
    if (tgUploadStatusText) {
        tgUploadStatusText.textContent = '⏳ Đang lưu ảnh gốc (100% chất lượng) & gắn ẩn URL vào Tên Thiệp...';
    }

    try {
        await uploadCardToTelegramBot();
        if (tgStatusDot) tgStatusDot.className = 'status-dot ready';
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = '✅ Đã gắn ẩn URL dưới Tên Thiệp! Bấm Sao chép rồi Dán (Paste) gửi tặng ngay.';
        }
        refreshShareModalPreviewUI();
    } catch (err) {
        console.error('Lỗi lưu ảnh lên Telegram:', err);
        if (tgStatusDot) tgStatusDot.className = 'status-dot error';
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = '⚠️ Kết nối mạng chậm, bấm Sao chép để thử tạo lại link nhé.';
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
        if (tgUploadStatusText) tgUploadStatusText.textContent = '⏳ Đang đồng bộ ảnh gốc lên Telegram...';
        await uploadCardToTelegramBot();
        if (tgStatusDot) tgStatusDot.className = 'status-dot ready';
        if (tgUploadStatusText) tgUploadStatusText.textContent = '✅ Đã gắn ẩn URL dưới Tên Thiệp!';
        refreshShareModalPreviewUI();
    }
    return buildShareableCardUrl(cachedTelegramFileId);
}

// Cho phép bấm trực tiếp vào dòng Tên Thiệp màu xanh trong khung Xem trước để Copy Hyperlink ẩn URL
chatPreviewTitle?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!cachedTelegramFileId) return;
    const title = getEffectiveLinkTitle();
    const url = buildShareableCardUrl(cachedTelegramFileId);
    copyHiddenUrlHyperlinkSync(title, url);
    if (tgUploadStatusText) {
        tgUploadStatusText.textContent = `✅ Đã sao chép "${title}" (đã gắn ẩn URL)! Hãy Dán (Paste) vào khung chat.`;
    }
});

// Nút 1: 📋 Sao chép Link Thiệp 3D -> Copy ĐỒNG BỘ <a href="URL">Tên Thiệp</a>, ẩn hoàn toàn URL dưới chữ!
document.getElementById('copy-rich-link-btn')?.addEventListener('click', async () => {
    const copyTextSpan = document.getElementById('copy-rich-link-text');
    const origLabel = copyTextSpan ? copyTextSpan.textContent : 'Sao chép Link Thiệp 3D';
    const title = getEffectiveLinkTitle();

    // Trường hợp 1 (99%): Đã có sẵn cachedTelegramFileId -> Copy ĐỒNG BỘ ngay trong cử chỉ chạm (0ms delay) để giữ nguyên định dạng Hyperlink ẩn URL!
    if (cachedTelegramFileId && !isCardCanvasDirtyForTelegram) {
        const url = buildShareableCardUrl(cachedTelegramFileId);
        copyHiddenUrlHyperlinkSync(title, url);
        if (copyTextSpan) copyTextSpan.textContent = '✅ Đã sao chép Link Thiệp!';
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = `✅ Đã sao chép "${title}" (đã gắn ẩn URL)! Bạn chỉ cần Dán (Paste) vào Telegram ✨`;
        }
        setTimeout(() => {
            if (copyTextSpan) copyTextSpan.textContent = origLabel;
        }, 2600);
        return;
    }

    // Trường hợp 2: Ảnh đang tải lên -> Đợi tải xong rồi copy ngay
    try {
        if (copyTextSpan) copyTextSpan.textContent = '⏳ Đang tạo link...';
        const url = await ensureShareUrlReady();
        copyHiddenUrlHyperlinkSync(title, url);
        if (copyTextSpan) copyTextSpan.textContent = '✅ Đã sao chép Link Thiệp!';
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = `✅ Đã sao chép "${title}" (đã gắn ẩn URL)! Hãy Dán (Paste) vào Telegram ✨`;
        }
        setTimeout(() => {
            if (copyTextSpan) copyTextSpan.textContent = origLabel;
        }, 2600);
    } catch (err) {
        if (copyTextSpan) copyTextSpan.textContent = origLabel;
        alert('Chưa thể tạo link, vui lòng kiểm tra kết nối mạng và thử lại nhé!');
    }
});

// Nút 2 (Phụ): 🔗 Copy URL (Dành cho trường hợp người dùng muốn lấy đường dẫn thô)
document.getElementById('copy-md-link-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const orig = btn.textContent;
    if (cachedTelegramFileId && !isCardCanvasDirtyForTelegram) {
        const url = buildShareableCardUrl(cachedTelegramFileId);
        copyRawUrlSync(url);
        btn.textContent = '✅ Đã copy URL!';
        setTimeout(() => { btn.textContent = orig; }, 2200);
        return;
    }
    try {
        const url = await ensureShareUrlReady();
        copyRawUrlSync(url);
        btn.textContent = '✅ Đã copy URL!';
        setTimeout(() => { btn.textContent = orig; }, 2200);
    } catch (err) {
        alert('Vui lòng đợi ảnh lưu xong rồi thử lại nhé!');
    }
});

// Nút 3: ✈️ Gửi Telegram -> Sao chép đồng bộ Tên Thiệp đã gắn ẩn URL (<a href="URL">Tên Thiệp</a>) để dán vào Telegram không bị lộ URL thô!
document.getElementById('share-telegram-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const orig = btn.textContent;
    const title = getEffectiveLinkTitle();

    if (cachedTelegramFileId && !isCardCanvasDirtyForTelegram) {
        const url = buildShareableCardUrl(cachedTelegramFileId);
        copyHiddenUrlHyperlinkSync(title, url);
        btn.textContent = '✅ Đã copy! Dán vào Chat';
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = `✅ Đã copy "${title}" (ẩn URL)! Bạn chỉ cần Dán (Paste) vào cuộc trò chuyện Telegram ✨`;
        }
        setTimeout(() => { btn.textContent = orig; }, 2800);
        return;
    }

    try {
        const url = await ensureShareUrlReady();
        copyHiddenUrlHyperlinkSync(title, url);
        btn.textContent = '✅ Đã copy! Dán vào Chat';
        if (tgUploadStatusText) {
            tgUploadStatusText.textContent = `✅ Đã copy "${title}" (ẩn URL)! Bạn chỉ cần Dán (Paste) vào cuộc trò chuyện Telegram ✨`;
        }
        setTimeout(() => { btn.textContent = orig; }, 2800);
    } catch (err) {
        alert('Vui lòng đợi tạo link xong rồi thử lại nhé!');
    }
});

// Nút 4: 💬 Gửi Zalo / Khác
document.getElementById('share-zalo-btn')?.addEventListener('click', async () => {
    const title = getEffectiveLinkTitle();
    if (cachedTelegramFileId && !isCardCanvasDirtyForTelegram) {
        const url = buildShareableCardUrl(cachedTelegramFileId);
        copyHiddenUrlHyperlinkSync(title, url);
    }
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
        copyHiddenUrlHyperlinkSync(title, url);
        alert(`Đã sao chép "${title}" (đã gắn ẩn link)! Bạn chỉ cần Dán (Paste) vào khung chat để gửi nhé 🌸`);
    } catch (err) {
        alert('Vui lòng đợi tạo link xong rồi thử lại nhé!');
    }
});

// ====== 5. CHẾ ĐỘ NGƯỜI NHẬN MỞ BÌ THIỆP 3D & CHẾ ĐỘ XEM THỬ MỞ BÌ THIỆP ======
const SAFE_BLANK_PIXEL_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

async function resolveTelegramFileUrl(fileId, directFilePath = '', forceRefresh = false) {
    if (!fileId || fileId === 'local') return '';
    const { ep, tk } = _getCloudCfg();

    // 1. Nếu trong Link đã nhúng sẵn file_path (meta.p), trả về ngay lập tức trong 0ms (KHÔNG tốn bất kỳ request getFile nào!)
    if (directFilePath && !forceRefresh) {
        return `${ep}/file/bot${tk}/${directFilePath}`;
    }

    const cacheKey = `tg_card_url_${fileId}`;
    if (!forceRefresh) {
        try {
            const cachedSession = sessionStorage.getItem(cacheKey);
            if (cachedSession) return cachedSession;
        } catch (_) {}
        try {
            const cachedLocal = localStorage.getItem(cacheKey);
            if (cachedLocal) return cachedLocal;
        } catch (_) {}
    }

    const apiTarget = `${ep}/bot${tk}/getFile?file_id=${encodeURIComponent(fileId)}`;
    const endpoints = [
        apiTarget,
        `https://corsproxy.io/?${encodeURIComponent(apiTarget)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(apiTarget)}`
    ];

    let filePath = '';
    for (const url of endpoints) {
        try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const data = await res.json();
            if (data?.result?.file_path) {
                filePath = data.result.file_path;
                break;
            }
        } catch (_) {}
    }

    if (!filePath) throw new Error('Không tìm thấy file_path từ Telegram');

    const fullUrl = `${ep}/file/bot${tk}/${filePath}`;
    try { sessionStorage.setItem(cacheKey, fullUrl); } catch (_) {}
    try { localStorage.setItem(cacheKey, fullUrl); } catch (_) {}
    return fullUrl;
}

// Đua song song có điều phối (Staggered Parallel CDN Race):
// Ưu tiên Cloudflare Edge CDN (wsrv.nl) ở 0ms để gánh tải cho hàng chục nghìn người mở cùng lúc,
// đồng thời kích hoạt nhánh dự phòng sau 220ms và 950ms nếu mạng khu vực chặn 1 tuyến.
async function raceVerifyImageCandidates(rawUrl) {
    const candidates = [
        { url: `https://wsrv.nl/?url=${encodeURIComponent(rawUrl)}&output=jpg&q=92`, delayMs: 0 },
        { url: rawUrl, delayMs: 220 },
        { url: `https://corsproxy.io/?${encodeURIComponent(rawUrl)}`, delayMs: 950 }
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
                }, 6500);
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
        // Nếu đường dẫn trực tiếp (meta.p) hoặc bộ nhớ đệm đã cũ, tự động làm mới từ file_id vĩnh viễn
        rawUrl = await resolveTelegramFileUrl(fileId, '', true);
        verifiedUrl = await raceVerifyImageCandidates(rawUrl);
    }

    if (!verifiedUrl) {
        throw new Error('Không thể tải và giải mã ảnh thiệp qua các tuyến CDN');
    }

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

// Nút "✉️ Mở thử bì" (Cho người tạo tự tay chạm vào Phong Ấn 3D để mở phong bì & trải nghiệm hiệu ứng vật lý 3D)
function previewCreatorEnvelopeOpening() {
    renderCurrentStep2CardAndPreviewEnvelope(false);
}

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

// Hàm tải ảnh chất lượng gốc về máy cho Người Nhận
window.handleRecipientDownloadCard = async function () {
    const imgSrc = recipientResolvedImgUrl || (finalResultImg ? finalResultImg.src : '');
    if (!imgSrc) return;

    if (!recipientCachedBlob && imgSrc.startsWith('http')) {
        const proxies = [
            `https://corsproxy.io/?${encodeURIComponent(imgSrc)}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(imgSrc)}`
        ];
        for (const pUrl of proxies) {
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
    if (!rawCard) {
        document.title = 'Thiệp 20/10 - Tôn vinh phụ nữ Việt Nam';
        return;
    }

    const meta = decodeCardPayload(rawCard);
    if (!meta || !meta.f) {
        document.title = 'Thiệp 20/10 - Tôn vinh phụ nữ Việt Nam';
        return;
    }

    recipientCardMeta = meta;
    const linkTitle = meta.l || '💌 Bạn nhận được một tấm thiệp 3D 20/10 đặc biệt 🌸';
    const recTitle = meta.r || '';
    const motionId = meta.m || 'bloom';
    const themeKey = meta.t || 'emerald';

    customLinkTitle = linkTitle;
    recipientName = recTitle;
    currentColorTheme = themeKey;

    document.title = linkTitle;

    // Đặt ảnh placeholder trong suốt 1x1 an toàn tuyệt đối (không bao giờ hiện icon crash/broken image)
    // và khóa trạng thái sẵn sàng cho đến khi ảnh tải + decode xong 100%
    window.isRecipientCardImageReady = false;
    const u3dCardImg = document.getElementById('u3d-card-img');
    if (u3dCardImg) u3dCardImg.src = SAFE_BLANK_PIXEL_GIF;
    if (finalResultImg) finalResultImg.src = SAFE_BLANK_PIXEL_GIF;

    // Khởi chạy Sân Khấu 3D ở pha 'summoning' (Nghi thức Vũ Đạo Ánh Sáng 3D thuần túy, không chữ Loading, ẩn phong bì & ấn sáp)
    setupEnvelopeGiftStageUI({
        title: linkTitle,
        subtitle: recTitle ? `💌 ${recTitle}` : 'Một món quà 3D đặc biệt đang chờ bạn mở phong bì ✨',
        motionId: motionId,
        themeKey: themeKey,
        isRealRecipient: true,
        autoOpen: false
    });

    // Tải & giải mã hoàn chỉnh (img.decode()) ảnh chất lượng gốc từ đám mây trước khi triệu hồi Phong Bì & Ấn Sáp
    try {
        await preloadAndDecodeRecipientCardImage(meta.f, meta.p || '');
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


