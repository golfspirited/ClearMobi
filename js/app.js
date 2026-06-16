/* =========================================================
 * app.js - ClearMobi Frontend Core Logic
 * ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    SecurityLite.init();
    enforceQuestRules();
});

// --- 1. โมดูลความปลอดภัยขั้นพื้นฐาน ---
const SecurityLite = {
    init: function() {
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('keydown', function(e) {
            if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C')) || (e.ctrlKey && e.key === 'u')) {
                e.preventDefault();
            }
        });
    }
};

// --- 2. โมดูลคุมกฎเควส ---
function enforceQuestRules() {
    const currentPath = window.location.pathname;
    const questStep = parseInt(localStorage.getItem('cm_quest_step') || '0');
    if (questStep > 0 && questStep < 7) {
        if (currentPath.includes("marketplace.html") || currentPath.includes("trade-in.html")) {
            alert("⚠️ ระบบตรวจพบภารกิจที่ยังไม่เสร็จสิ้น! กรุณาทำภารกิจให้สำเร็จเพื่อรับโล่ 28 วัน ระบบกำลังพากลับไปหน้าภารกิจ...");
            window.location.href = "quest.html";
        }
    }
}

// --- 3. โมดูลบีบอัดรูปภาพอัปโหลดให้เป็น .webp (ประหยัดเน็ต) ---
const ImageOptimizer = {
    compress: function(file, quality = 0.7, maxWidth = 1000) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = event => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width, height = img.height;
                    if (width > maxWidth) {
                        height = Math.round(height * maxWidth / width);
                        width = maxWidth;
                    }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    // บังคับแปลงไฟล์อัปโหลดทั้งหมดเป็น image/webp
                    resolve(canvas.toDataURL('image/webp', quality));
                }
            }
        });
    }
};

// --- 4. โมดูลล็อกปุ่มกันกดเบิ้ล ---
const ActionLock = {
    lock: function(buttonId, loadingText = "กำลังประมวลผล...") {
        const btn = document.getElementById(buttonId);
        if (!btn) return;
        btn.dataset.originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner"></span> ${loadingText}`;
        btn.style.opacity = "0.7"; btn.style.cursor = "not-allowed";
    },
    unlock: function(buttonId) {
        const btn = document.getElementById(buttonId);
        if (!btn) return;
        btn.disabled = false;
        btn.innerHTML = btn.dataset.originalText;
        btn.style.opacity = "1"; btn.style.cursor = "pointer";
    }
};

// --- 5. โมดูลจัดการสถานะแอป ---
const AppState = {
    set: (key, value) => localStorage.setItem(`cm_${key}`, value),
    get: (key) => localStorage.getItem(`cm_${key}`),
    clear: (key) => localStorage.removeItem(`cm_${key}`),
    clearAll: () => { AppState.clear('quest_step'); AppState.clear('eval_price'); }
};

// สไตล์ Spinner
const spinnerStyle = document.createElement('style');
spinnerStyle.textContent = `.spinner { display: inline-block; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #fff; animation: spin 1s ease-in-out infinite; margin-right: 8px; } @keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(spinnerStyle);

// --- 6. โมดูลระบบกดซูมรูปเอกสาร ---
window.openDocument = function(imgSrc) {
    let modal = document.getElementById('imageModal');
    if(!modal) {
        document.body.insertAdjacentHTML('beforeend', `<div id="imageModal" class="modal" onclick="closeDocument()"><div class="modal-close">&times;</div><img class="modal-content" id="modalImg" onclick="event.stopPropagation()"></div>`);
        modal = document.getElementById('imageModal');
    }
    document.getElementById('modalImg').src = imgSrc;
    modal.classList.add('show');
};
window.closeDocument = function() {
    const modal = document.getElementById('imageModal');
    if(modal) modal.classList.remove('show');
};

// --- 7. ระบบ Smart Auth & Device Fingerprint (เตรียมไว้คุยกับ Backend) ---
async function generateDeviceFingerprint() {
    const screenRes = `${window.screen.width}x${window.screen.height}`;
    const colorDepth = window.screen.colorDepth;
    const userAgent = navigator.userAgent;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    const rawData = `${screenRes}-${colorDepth}-${userAgent}-${timezone}-${language}`;

    const msgBuffer = new TextEncoder().encode(rawData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

window.requireLogin = async function(nextActionFunction) {
    const userPhone = localStorage.getItem('cm_user_phone');
    if (userPhone) {
        console.log("Welcome back:", userPhone);
        nextActionFunction();
    } else {
        const deviceId = await generateDeviceFingerprint();
        console.log("No Session. Device ID for anti-bot:", deviceId);
        // TODO: เด้ง Modal ให้กรอกเบอร์โทรศัพท์และส่ง OTP
        alert("🔒 กรุณายืนยันเบอร์โทรศัพท์ก่อนทำรายการ (จำลอง)");
    }
};
