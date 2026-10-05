const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');

// --- PHÁT HIỆN TRÌNH DUYỆT NỘI BỘ (IN-APP BROWSER) ---
function checkInAppBrowser() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const isInApp = /Telegram|FBAN|FBAV|Instagram|Messenger|Line|Zalo/i.test(ua);

    // Nếu là Telegram hoặc các app có trình duyệt nội bộ hạn chế
    if (isInApp) {
        const warning = document.getElementById('browser-warning');
        if (warning) warning.style.display = 'flex';
    }
}
window.addEventListener('DOMContentLoaded', checkInAppBrowser);

let bgWidth, bgHeight;
let particles = [];
function initBg() {
    bgWidth = bgCanvas.width = window.innerWidth;
    bgHeight = bgCanvas.height = window.innerHeight;
}
window.addEventListener('resize', initBg);
initBg();
class Particle {
    constructor() {
        this.x = Math.random() * bgWidth; this.y = Math.random() * bgHeight - bgHeight;
        this.size = Math.random() * 14 + 6; this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = Math.random() * 2 + 1.5; this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 4 - 2;
        this.color = ['#ffc0cb', '#ffb6c1', '#ffffff', '#ff99a8'][Math.floor(Math.random() * 4)];
        this.opacity = Math.random() * 0.6 + 0.4;
    }
    draw() {
        bgCtx.save(); bgCtx.translate(this.x, this.y); bgCtx.rotate((this.rotation * Math.PI) / 180);
        bgCtx.globalAlpha = this.opacity; bgCtx.fillStyle = this.color;
        // Make the petal shape slightly more elegant
        bgCtx.beginPath();
        bgCtx.moveTo(0, -this.size / 2);
        bgCtx.quadraticCurveTo(this.size / 2, 0, 0, this.size / 2);
        bgCtx.quadraticCurveTo(-this.size / 2, 0, 0, -this.size / 2);
        bgCtx.fill(); bgCtx.restore();
    }
    update() {
        this.x += this.vx; this.y += this.vy; this.rotation += this.rotationSpeed;
        if (this.y > bgHeight + this.size || this.x > bgWidth + this.size || this.x < -this.size) {
            this.y = -this.size; this.x = Math.random() * bgWidth; this.vy = Math.random() * 2 + 1.5;
        }
    }
}
for (let i = 0; i < 40; i++) particles.push(new Particle());
function animateBg() {
    bgCtx.clearRect(0, 0, bgWidth, bgHeight);
    particles.forEach(p => { p.draw(); p.update(); });
    requestAnimationFrame(animateBg);
}
animateBg();

// Khai báo danh sách khung thực tế từ thư mục
const framesConfig = [];
for (let i = 1; i <= 10; i++) {
    framesConfig.push({
        id: i - 1,
        path: `khung/khung ${i}.png`,
        label: `Khung ${i}`
    });
}

const uploadWrapper = document.getElementById('upload-wrapper');
uploadWrapper.classList.add('ready');

// Danh sách 200 lời chúc nằm trong wishes.js (biến wishes2010)

function getRandomQuote() {
    return wishes2010[Math.floor(Math.random() * wishes2010.length)];
}

let currentUserImage = null;
let cropperObj = null;
let currentAIQuote = "";
let currentSelectedFrameId = 0;
let loadedFrameImages = []; // Cache khung ảnh

const step1 = document.getElementById('step-1');
const step2 = document.getElementById('step-2');
const step3 = document.getElementById('step-3');
const finalResultCanvas = document.getElementById('final-result-canvas');
const aiQuoteDisplay = document.getElementById('ai-quote-display');
const frameList = document.getElementById('frame-list');

// Tải trước các hình ảnh khung để render canvas cho mượt
function preloadFrames() {
    framesConfig.forEach(config => {
        const img = new Image();
        img.src = config.path;
        loadedFrameImages[config.id] = img;
    });
}
preloadFrames();

function renderFrameList() {
    frameList.innerHTML = '';
    framesConfig.forEach((f, i) => {
        const div = document.createElement('div');
        div.className = `frame-item ${i === 0 ? 'active' : ''}`;

        // Sử dụng ảnh khung thật làm thumbnail nhỏ
        div.innerHTML = `
            <div style="width:100%; height:55px; background: url('${f.path}') center/contain no-repeat; margin-bottom:5px;"></div>
            <span style="font-size:0.75rem">${f.label}</span>
        `;

        div.onclick = () => {
            document.querySelectorAll('.frame-item').forEach(el => el.classList.remove('active'));
            div.classList.add('active');
            currentSelectedFrameId = i;
            updateFrameOverlay();
        };
        frameList.appendChild(div);
    });
}
renderFrameList();

let originalImgSrc = null;
let currentSelectedFilter = 'none';

function applyFilterToPreview() {
    const previewImgs = document.querySelectorAll('.cropper-canvas img, .cropper-view-box img');
    previewImgs.forEach(img => {
        img.style.filter = currentSelectedFilter;
    });
}

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentSelectedFilter = e.currentTarget.getAttribute('data-filter');
        applyFilterToPreview();
    });
});

async function handleImageInput(e) {
    const file = e.target.files[0];
    if (!file) return;

    step1.classList.remove('active');
    step2.classList.add('active');

    const reader = new FileReader();
    reader.onload = function (event) {
        originalImgSrc = event.target.result;
        setTimeout(() => {
            initCropper();
            initScrollHints(); // Kích hoạt gợi ý scroll cho carousel
        }, 100);
    };
    reader.readAsDataURL(file);
}

function initCropper() {
    const imageEl = document.getElementById('cropper-image');
    imageEl.src = originalImgSrc;

    const initialFrame = loadedFrameImages[currentSelectedFrameId];
    const initialRatio = (initialFrame && initialFrame.complete && initialFrame.naturalWidth) ? (initialFrame.naturalWidth / initialFrame.naturalHeight) : (1024 / 1536);

    if (cropperObj) cropperObj.destroy();
    cropperObj = new Cropper(imageEl, {
        aspectRatio: initialRatio,
        viewMode: 1, // Đảm bảo người dùng không thể kéo ảnh hụt ra ngoài viền khung
        dragMode: 'move', // Chế độ chỉ di chuyển ảnh
        autoCropArea: 1, // Kích thước khung crop che phủ 100% diện tích màn hình chứa
        cropBoxMovable: false, // Cố định hệ trục
        cropBoxResizable: false, // Cố định kích thước
        toggleDragModeOnDblclick: false,
        guides: false, // Tắt đường lưới
        center: false, // Tắt dấu thập tâm
        highlight: false, // Tắt làm mờ/sáng
        background: false, // Tắt nền caro
        modal: false, // Tắt bóng mờ bên ngoài góc crop
        ready: function () {
            updateFrameOverlay();
            applyFilterToPreview();

            // Hiện lại hướng dẫn kéo khi có ảnh mới
            const hint = document.getElementById('drag-hint');
            hint.classList.remove('hidden');

            // Ẩn hướng dẫn khi người dùng chạm vào ảnh
            const hideHint = () => hint.classList.add('hidden');
            const previewArea = document.getElementById('preview-area-wrap');
            previewArea.addEventListener('touchstart', hideHint, { once: true });
            previewArea.addEventListener('mousedown', hideHint, { once: true });
        }
    });
}

function updateFrameOverlay() {
    if (!cropperObj) return;
    const cropBox = document.querySelector('.cropper-crop-box');
    const frameImg = loadedFrameImages[currentSelectedFrameId];

    if (frameImg && frameImg.complete && frameImg.naturalWidth) {
        cropperObj.setAspectRatio(frameImg.naturalWidth / frameImg.naturalHeight);
    }

    if (cropBox) {
        let overlay = document.getElementById('frame-overlay');
        if (!overlay) {
            overlay = document.createElement('img');
            overlay.id = 'frame-overlay';
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = '10';
            cropBox.appendChild(overlay);
        }
        overlay.src = framesConfig[currentSelectedFrameId].path;
    }
}

document.getElementById('upload-btn').addEventListener('change', handleImageInput);
document.getElementById('selfie-btn').addEventListener('change', handleImageInput);

document.getElementById('cancel-btn').addEventListener('click', () => {
    step2.classList.remove('active'); step1.classList.add('active');
    document.getElementById('upload-btn').value = '';
    document.getElementById('selfie-btn').value = '';
});

document.getElementById('generate-final-btn').addEventListener('click', () => {
    if (!cropperObj) return;

    const btn = document.getElementById('generate-final-btn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = "🌸 Đang tạo thiệp...";
    btn.disabled = true;

    // === BẮN CÁNH HOA BAY TỨ PHÍA ===
    const overlay = document.getElementById('transition-overlay');
    // Xóa cánh hoa cũ nếu còn sót
    overlay.querySelectorAll('.fly-petal').forEach(el => el.remove());

    const petals = ['🌸', '🌺', '🌷', '🌹', '💮', '✿', '🌼', '💐'];
    const count = 14;
    for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'fly-petal';
        el.textContent = petals[i % petals.length];
        // Hướng bay ngẫu nhiên tứ phía, khoảng cách tăng dần
        const angle = (i / count) * Math.PI * 2;
        const d1 = 60 + Math.random() * 40;
        const d2 = 110 + Math.random() * 60;
        const d3 = 160 + Math.random() * 80;
        el.style.setProperty('--tx1', `${Math.cos(angle) * d1}px`);
        el.style.setProperty('--ty1', `${Math.sin(angle) * d1}px`);
        el.style.setProperty('--tx2', `${Math.cos(angle) * d2}px`);
        el.style.setProperty('--ty2', `${Math.sin(angle) * d2}px`);
        el.style.setProperty('--tx3', `${Math.cos(angle) * d3}px`);
        el.style.setProperty('--ty3', `${Math.sin(angle) * d3}px`);
        el.style.setProperty('--r1', `${Math.random() * 120 - 60}deg`);
        el.style.setProperty('--r2', `${Math.random() * 240 - 120}deg`);
        el.style.setProperty('--r3', `${Math.random() * 360 - 180}deg`);
        el.style.animationDelay = `${Math.random() * 0.25}s`;
        overlay.appendChild(el);
    }

    // Kích hoạt animation overlay
    overlay.classList.remove('playing');
    void overlay.offsetWidth;
    overlay.classList.add('playing');
    // Tự xóa sau khi animation xong → trả lại pointer-events cho các nút bên dưới
    setTimeout(() => overlay.classList.remove('playing'), 2300);

    setTimeout(() => {
        const frameImg = loadedFrameImages[currentSelectedFrameId];
        const targetW = (frameImg && frameImg.naturalWidth) ? frameImg.naturalWidth : 1024;
        const targetH = (frameImg && frameImg.naturalHeight) ? frameImg.naturalHeight : 1536;

        const canvas = cropperObj.getCroppedCanvas({ width: targetW, height: targetH });
        const img = new Image();
        img.onload = function () {
            currentUserImage = img;
            currentAIQuote = getRandomQuote();
            // Đợi font lời chúc tải xong rồi mới đo & vẽ, tránh lệch kích thước chữ
            ensureQuoteFont().then(() => drawCanvasImageText(finalResultCanvas, true));

            // Chuyển màn hình vào giữa animation (lúc overlay đang che khuất hoàn toàn)
            setTimeout(() => {
                step2.classList.remove('active');
                step3.classList.add('active');
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            }, 700);
        };
        img.src = canvas.toDataURL('image/jpeg', 0.95);
    }, 150);
});

document.getElementById('redo-btn').addEventListener('click', () => {
    step3.classList.remove('active'); step1.classList.add('active');
    document.getElementById('upload-btn').value = '';
    document.getElementById('selfie-btn').value = '';
    currentUserImage = null;
});

document.getElementById('download-btn').addEventListener('click', () => {
    try {
        const dataImage = finalResultCanvas.toDataURL('image/jpeg', 0.95);
        const link = document.createElement('a');
        link.download = `Thiep_20_10.jpg`;
        link.href = dataImage;
        link.click();
    } catch (e) {
        // Fallback for CORS: Open in new tab or show alert
        alert("Trình duyệt từ chối tự động tải do bạn đang mở trực tiếp file html. Xin hãy click chuột phải vào ảnh thiệp trên màn hình -> Chọn 'Lưu hình ảnh thành...' (Save image as) nhé!");
        console.error("Canvas export blocked by CORS/Tainted Canvas:", e);
    }
});

function drawCanvasImageText(targetCanvas, isFinal) {
    if (!currentUserImage) return;

    const frameImg = loadedFrameImages[currentSelectedFrameId];

    if (!frameImg || !frameImg.complete) {
        setTimeout(() => drawCanvasImageText(targetCanvas, isFinal), 100);
        return;
    }

    const targetW = frameImg.naturalWidth || 1024;
    const originH = frameImg.naturalHeight || 1536;

    // Tỷ lệ font dựa theo chiều rộng (targetW).
    const fontSize = Math.floor(55 * (targetW / 1024));
    // 35% textSpaceHeight: đủ chứa chữ mà không xa cách khung quá
    const textSpaceHeight = Math.floor(originH * 0.35);

    // Nếu là bước cuối cùng hiển thị trên giao diện (isFinal), thêm không gian cho text
    const targetH = isFinal ? originH + textSpaceHeight : originH;

    const ctx = targetCanvas.getContext('2d');
    targetCanvas.width = targetW;
    targetCanvas.height = targetH;

    // Vẽ nền 
    ctx.fillStyle = isFinal ? '#effaf5' : '#fff';
    ctx.fillRect(0, 0, targetW, targetH);

    // --- BƯỚC 1: VẼ ẢNH ĐO ĐÃ CẮT (LỚP DƯỚI KÈM HIỆU ỨNG MÀU) ---
    if (currentSelectedFilter !== 'none') {
        ctx.filter = currentSelectedFilter;
    }
    ctx.drawImage(currentUserImage, 0, 0, targetW, originH);
    ctx.filter = 'none';

    // --- BƯỚC 2: VẼ KHUNG ẢNH TRONG SUỐT PNG TRÙM LÊN (LỚP TRÊN) ---
    ctx.drawImage(frameImg, 0, 0, targetW, originH);

    // --- BƯỚC 3: VẼ TEXT LỜI CHÚC XUỐNG DƯỚI NẾU LÀ FINAL ---
    if (isFinal && currentAIQuote) {
        // === VẼ HỘP BACKGROUND CHARM ===
        const marginX = Math.floor(targetW * 0.06);
        const boxX = marginX;
        // Khoảng trắng đệm 10% -> sát hơn với khung
        const boxY = originH + Math.floor(textSpaceHeight * 0.1);
        const boxW = targetW - (marginX * 2);
        // Hộp chiếm 80% textSpaceHeight
        const boxH = Math.floor(textSpaceHeight * 0.8);
        const radius = Math.floor(targetW * 0.04);

        ctx.beginPath();
        ctx.moveTo(boxX + radius, boxY);
        ctx.lineTo(boxX + boxW - radius, boxY);
        ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + radius);
        ctx.lineTo(boxX + boxW, boxY + boxH - radius);
        ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - radius, boxY + boxH);
        ctx.lineTo(boxX + radius, boxY + boxH);
        ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - radius);
        ctx.lineTo(boxX, boxY + radius);
        ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
        ctx.closePath();

        // Màu hộp chữ: TRẮNG SỮA TRONG SUỐT NHẸ
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fill();
        // Cạnh viền: XANH NGỌC PASTEL
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#8fd1ba';
        ctx.stroke();

        // === THUẬT TOÁN AUTO SHRINK-TO-FIT ===
        // Đo bằng đúng font nghiêng sẽ dùng để vẽ, giảm dần cỡ chữ đến khi vừa cả ngang lẫn dọc
        const layout = fitQuoteInBox(ctx, currentAIQuote, boxW, boxH, targetW / 1024);
        const fontSize = layout.fontSize;

        // === GHI CHỮ VỚI HIỆU ỨNG CAO CẤP ===

        // 1. Vẽ lại hộp với gradient nền đẹp hơn
        ctx.beginPath();
        ctx.moveTo(boxX + radius, boxY);
        ctx.lineTo(boxX + boxW - radius, boxY);
        ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + radius);
        ctx.lineTo(boxX + boxW, boxY + boxH - radius);
        ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - radius, boxY + boxH);
        ctx.lineTo(boxX + radius, boxY + boxH);
        ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - radius);
        ctx.lineTo(boxX, boxY + radius);
        ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
        ctx.closePath();
        // Gradient nền: trắng ngà phía trên → xanh bạc hà nhẹ phía dưới
        const bgGrad = ctx.createLinearGradient(0, boxY, 0, boxY + boxH);
        bgGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        bgGrad.addColorStop(1, 'rgba(213, 241, 228, 0.9)');
        ctx.fillStyle = bgGrad;
        ctx.fill();
        // Viền nội dung hộp: gradient xanh ngọc
        const borderGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
        borderGrad.addColorStop(0, '#6fbfa3');
        borderGrad.addColorStop(0.5, '#b7e4d3');
        borderGrad.addColorStop(1, '#2f8f73');
        ctx.lineWidth = Math.floor(targetW * 0.004);
        ctx.strokeStyle = borderGrad;
        ctx.stroke();

        // 2. Dấu trang trí nhỏ (hoa ✿) hai bên — nằm trong vùng padding nên không đè lên chữ
        const decoSize = layout.decoSize;
        const decoY = boxY + Math.floor(boxH / 2);
        ctx.font = `${decoSize}px serif`;
        // Gradient màu cho dấu trang trí
        const decoGrad = ctx.createLinearGradient(0, decoY - decoSize, 0, decoY + decoSize);
        decoGrad.addColorStop(0, '#f48fb1');
        decoGrad.addColorStop(1, '#d81b60');
        ctx.fillStyle = decoGrad;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const decoLX = boxX + Math.floor(layout.padX / 2);
        const decoRX = boxX + boxW - Math.floor(layout.padX / 2);
        ctx.globalAlpha = 0.35;
        ctx.fillText('✿', decoLX, decoY);
        ctx.fillText('✿', decoRX, decoY);
        ctx.globalAlpha = 1.0;

        // 3. Gradient màu chữ dọc: xanh lục thẫm trên → xanh ngọc dưới
        const lineHeight = layout.lineHeight;
        const textBlockH = layout.lines.length * lineHeight;
        const textGrad = ctx.createLinearGradient(0, decoY - textBlockH / 2, 0, decoY + textBlockH / 2);
        textGrad.addColorStop(0, '#095241');
        textGrad.addColorStop(0.5, '#0f7b5f');
        textGrad.addColorStop(1, '#0a4f4a');

        // 4. Bóng chữ mờ nhẹ (shadow glow)
        ctx.shadowColor = 'rgba(15, 100, 80, 0.25)';
        ctx.shadowBlur = Math.floor(fontSize * 0.4);
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = Math.floor(fontSize * 0.08);

        // 5. Kiểu chữ: italic + đậm vừa (phải trùng font đã dùng để đo)
        ctx.font = quoteFont(fontSize);
        ctx.fillStyle = textGrad;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const centerY = boxY + (boxH / 2);
        drawLines(ctx, layout.lines, boxX + boxW / 2, centerY, lineHeight, layout.maxWidth);

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }
}

// ====== XỬ LÝ CHỮ LỜI CHÚC (đảm bảo không bao giờ tràn hộp) ======
const QUOTE_LINE_HEIGHT = 1.55;

function quoteFont(size) {
    return `italic 500 ${size}px "Playfair Display", serif`;
}

// Tải trước font Playfair Display (nghiêng) — tối đa chờ 2s rồi vẫn vẽ bằng font dự phòng
function ensureQuoteFont() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.race([
        document.fonts.load(quoteFont(60), 'Chúc mừng 20/10'),
        new Promise(resolve => setTimeout(resolve, 2000))
    ]).catch(() => { });
}
ensureQuoteFont();

// Độ rộng thực của nét chữ (tính cả phần nghiêng nhô ra ngoài)
function inkWidth(ctx, s) {
    const m = ctx.measureText(s);
    const ink = (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || 0);
    return Math.max(m.width, ink);
}

// Ngắt dòng theo từ; từ nào dài hơn cả dòng thì cắt theo ký tự
function wrapLines(ctx, text, maxWidth) {
    const words = text.split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
        const test = line ? line + ' ' + word : word;
        if (inkWidth(ctx, test) <= maxWidth) {
            line = test;
            continue;
        }
        if (line) lines.push(line);
        if (inkWidth(ctx, word) > maxWidth) {
            let chunk = '';
            for (const ch of word) {
                if (chunk && inkWidth(ctx, chunk + ch) > maxWidth) {
                    lines.push(chunk);
                    chunk = ch;
                } else {
                    chunk += ch;
                }
            }
            line = chunk;
        } else {
            line = word;
        }
    }
    if (line) lines.push(line);
    return lines;
}

// Tìm cỡ chữ lớn nhất sao cho toàn bộ lời chúc nằm gọn trong hộp (cả ngang lẫn dọc)
function fitQuoteInBox(ctx, text, boxW, boxH, scale) {
    const padY = Math.floor(boxH * 0.1);
    const maxH = boxH - padY * 2;
    const minSize = Math.max(8, Math.floor(12 * scale));
    let layout = null;
    for (let fontSize = Math.floor(60 * scale); fontSize >= minSize; fontSize--) {
        const decoSize = Math.floor(fontSize * 0.9);
        // Padding ngang đủ rộng để chứa hoa ✿ hai bên
        const padX = Math.max(Math.floor(boxW * 0.06), Math.ceil(decoSize * 1.3));
        const maxWidth = boxW - padX * 2;
        ctx.font = quoteFont(fontSize);
        const lines = wrapLines(ctx, text, maxWidth);
        const lineHeight = Math.floor(fontSize * QUOTE_LINE_HEIGHT);
        const widest = Math.max(...lines.map(l => inkWidth(ctx, l)));
        layout = { fontSize, lines, lineHeight, padX, decoSize, maxWidth, maxH, widest };
        if (lines.length * lineHeight <= maxH && widest <= maxWidth) break;
    }
    return layout;
}

// Vẽ các dòng căn giữa theo chiều dọc; maxWidth là chốt chặn cuối để chữ không vượt hộp
function drawLines(ctx, lines, x, centerY, lineHeight, maxWidth) {
    const startY = centerY - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight, maxWidth));
}

function drawFinalImage(canvasEl, isFinal) {
    if (document.fonts) {
        document.fonts.ready.then(() => { drawCanvasImageText(canvasEl, isFinal); });
    } else {
        drawCanvasImageText(canvasEl, isFinal);
    }
}

// ====== SCROLL HINT LOGIC ======
function setupScrollHint(scrollEl, wrapEl) {
    if (!scrollEl || !wrapEl) return;

    // Ẩn arrow khi đã scroll gần hết
    scrollEl.addEventListener('scroll', () => {
        const atEnd = scrollEl.scrollLeft + scrollEl.clientWidth >= scrollEl.scrollWidth - 10;
        wrapEl.classList.toggle('scrolled-end', atEnd);
    }, { passive: true });

    // Peek animation: scroll nhẹ sang phải rồi về, gợi ý có thể kéo
    setTimeout(() => {
        const maxPeek = Math.min(70, scrollEl.scrollWidth - scrollEl.clientWidth);
        if (maxPeek <= 0) {
            wrapEl.classList.add('scrolled-end'); // Không có gì để scroll, ẩn luôn
            return;
        }
        scrollEl.scrollTo({ left: maxPeek, behavior: 'smooth' });
        setTimeout(() => scrollEl.scrollTo({ left: 0, behavior: 'smooth' }), 500);
    }, 400);
}

// Gọi khi bước 2 xuất hiện (sau khi upload ảnh)
function initScrollHints() {
    setupScrollHint(
        document.getElementById('frame-carousel-scroll'),
        document.getElementById('frame-hint-wrap')
    );
    setupScrollHint(
        document.getElementById('filter-carousel-scroll'),
        document.getElementById('filter-hint-wrap')
    );
}
