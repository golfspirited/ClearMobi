/* =========================================================
 * app.js - ClearMobi Frontend Core Logic
 * รวมฟังก์ชันเทพๆ จากพี่กอล์ฟ: Security, Compressor, Lock, Quest
 * ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    // 1. เปิดใช้งานความปลอดภัยขั้นพื้นฐาน (ปิดคลิกขวา/F12)
    SecurityLite.init();

    // 2. ตรวจสอบการทำเควสค้าง (ล็อกคอ)
    enforceQuestRules();
});

// --- โมดูลความปลอดภัย (จาก security-lite.js) ---
const SecurityLite = {
    init: function() {
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('keydown', function(e) {
            if (e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                (e.ctrlKey && e.shiftKey && e.key === 'C') ||
                (e.ctrlKey && e.key === 'u')) {
                e.preventDefault();
                }
        });
    }
};

// --- โมดูลคุมกฎเควส (จาก app.js เดิม) ---
function enforceQuestRules() {
    const currentPath = window.location.pathname;
    const questStep = parseInt(localStorage.getItem('cm_quest_step') || '0');

    // ถ้าทำเควสอยู่ (step 1-6) ห้ามไปหน้าซื้อ/เทิร์น
    if (questStep > 0 && questStep < 7) {
        if (currentPath.includes("marketplace.html") || currentPath.includes("trade-in.html")) {
            alert("⚠️ ระบบตรวจพบภารกิจที่ยังไม่เสร็จสิ้น! กรุณาทำภารกิจให้สำเร็จเพื่อรับโล่ 28 วัน ระบบกำลังพากลับไปหน้าภารกิจ...");
            window.location.href = "quest.html";
        }
    }
}

// --- โมดูลโนติ FOMO จำลอง (จาก app.js เดิม) ---
// จะถูกเรียกใช้เฉพาะในหน้า index.html
function setupLiveNotifications() {
    const notifHTML = `<div id="autoNotif" style="position: fixed; top: calc(70px + env(safe-area-inset-top)); left: 50%; transform: translateX(-50%) translateY(-150px); background: rgba(15, 25, 45, 0.9); backdrop-filter: blur(10px); color: #fff; padding: 10px 20px; border-radius: 20px; font-size: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 9999; transition: transform 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55); border: 1px solid rgba(255,255,255,0.2); width: max-content; display: flex; align-items: center; gap: 8px; pointer-events: none;"><span id="notifIcon"></span> <span id="notifText"></span></div>`;
    document.body.insertAdjacentHTML('beforeend', notifHTML);

    const notifBox = document.getElementById('autoNotif');
    const notifText = document.getElementById('notifText');
    const notifIcon = document.getElementById('notifIcon');

    const messages = [
        { icon: "🛡️", text: "ระบบ: ปลดล็อกโล่ 28 วันให้ K. นุช สำเร็จ" },
        { icon: "✅", text: "AI อนุมัติสลิปของเบอร์ 089*** เรียบร้อย" },
        { icon: "📸", text: "มีลูกค้ากำลังประเมินราคา iPhone 14 Pro" },
        { icon: "🤝", text: "ปิดดีลเทิร์นเครื่องสำเร็จ! ยอดเงิน 5,500 บาท" }
    ];

    setInterval(() => {
        const msg = messages[Math.floor(Math.random() * messages.length)];
        notifIcon.innerText = msg.icon;
        notifText.innerText = msg.text;
        notifBox.style.transform = "translateX(-50%) translateY(0)";
        setTimeout(() => {
            notifBox.style.transform = "translateX(-50%) translateY(-150px)";
        }, 4000);
    }, 15000);
}

// --- โมดูลบีบอัดรูปภาพ (จาก compressor.js) ---
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
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = Math.round(height * maxWidth / width);
                        width = maxWidth;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // resolve ส่ง dataUrl กลับไป
                    resolve(canvas.toDataURL('image/jpeg', quality));
                }
            }
        });
    }
};

// --- โมดูลล็อกปุ่มกันกดเบิ้ล (จาก debouncer.js) ---
const ActionLock = {
    lock: function(buttonId, loadingText = "กำลังประมวลผล...") {
        const btn = document.getElementById(buttonId);
        if (!btn) return;
        btn.dataset.originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner"></span> ${loadingText}`;
        btn.style.opacity = "0.7";
        btn.style.cursor = "not-allowed";
    },
    unlock: function(buttonId) {
        const btn = document.getElementById(buttonId);
        if (!btn) return;
        btn.disabled = false;
        btn.innerHTML = btn.dataset.originalText;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
    }
};

// --- โมดูลจัดการสถานะแอป (จาก state.js) ---
const AppState = {
    set: (key, value) => localStorage.setItem(`cm_${key}`, value),
    get: (key) => localStorage.getItem(`cm_${key}`),
    clear: (key) => localStorage.removeItem(`cm_${key}`),
    // ล้างข้อมูลทั้งหมดเมื่อทำธุรกรรมจบ
    clearAll: () => {
        AppState.clear('quest_step');
        AppState.clear('eval_price');
        // เพิ่มรายการที่ต้องการล้างที่นี่
    }
};

// สไตล์ Spinner สำหรับปุ่มที่ถูกล็อก
const spinnerStyle = document.createElement('style');
spinnerStyle.textContent = `.spinner { display: inline-block; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #fff; animation: spin 1s ease-in-out infinite; margin-right: 8px; } @keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(spinnerStyle);

// --- โมดูลระบบกดซูมรูปเอกสาร (Image Lightbox Modal) ---
window.openDocument = function(imgSrc) {
    let modal = document.getElementById('imageModal');
    if(!modal) {
        const modalHtml = `
        <div id="imageModal" class="modal" onclick="closeDocument()">
        <div class="modal-close">&times;</div>
        <img class="modal-content" id="modalImg" onclick="event.stopPropagation()">
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modal = document.getElementById('imageModal');
    }
    document.getElementById('modalImg').src = imgSrc;
    modal.classList.add('show');
};

window.closeDocument = function() {
    const modal = document.getElementById('imageModal');
    if(modal) modal.classList.remove('show');
};

// ฟังก์ชันเช็คก่อนทำธุรกรรมสำคัญ
function requireLogin(nextActionFunction) {
    const userPhone = localStorage.getItem('cm_user_phone');

    if (userPhone) {
        // มีประวัติแคชอยู่แล้ว ทำรายการต่อได้เลย (อาจจะส่งไปเช็ค Token กับ Backend ก่อนเงียบๆ)
        console.log("Welcome back:", userPhone);
        nextActionFunction();
    } else {
        // ไม่มีแคช เด้งหน้าจอให้กรอกเบอร์และ OTP
        showLoginModal(nextActionFunction);
    }
}

// ทุกปุ่มที่สำคัญจะถูกหุ้มด้วย requireLogin
// เช่น: <button onclick="requireLogin(goToEvaluatePage)">ประเมินราคา</button>
