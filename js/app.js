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

// --- 7. ระบบ Smart Auth & OTP Modal (อัปเกรดใหม่) ---
window.requireLogin = function(nextActionFunction) {
    const userPhone = AppState.get('user_phone');
    if (userPhone) {
        console.log("ผู้ใช้ล็อกอินแล้ว:", userPhone);
        nextActionFunction(); // ถ้ามีเบอร์แล้ว ให้ทำรายการต่อได้เลย
    } else {
        showLoginModal(nextActionFunction); // ถ้ายังไม่มีเบอร์ ให้แสดง Popup OTP
    }
};

function showLoginModal(nextAction) {
    // 1. ตรวจสอบว่าเคยสร้าง Modal ไว้หรือยัง ถ้ายังให้สร้างใหม่แทรกเข้าไปใน HTML
    if (!document.getElementById('authModal')) {
        const modalHtml = `
        <div id="authModal" class="modal" style="z-index: 3000;">
        <div class="glass-card-light" style="width: 90%; max-width: 400px; text-align: center; position: relative;">
        <div class="modal-close" onclick="closeAuthModal()" style="top: 10px; right: 15px; font-size: 30px;">&times;</div>
        <div style="font-size: 40px; margin-bottom: 10px;">🔐</div>
        <h3 style="color: #fff; margin-bottom: 10px; font-size: 18px;">เข้าสู่ระบบ</h3>
        <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 20px;">กรุณายืนยันเบอร์โทรศัพท์เพื่อทำรายการต่อ</p>

        <div id="phoneStep">
        <input type="tel" id="loginPhone" class="search-box" placeholder="เบอร์โทรศัพท์ 10 หลัก" maxlength="10" style="background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.3);">
        <button class="btn-glow-blue" id="btnReqOtp" onclick="requestOtp()">📩 ขอรับรหัส OTP</button>
        </div>

        <div id="otpStep" style="display: none; margin-top: 15px;">
        <p style="font-size: 11px; color: var(--accent-green); margin-bottom: 10px;">ส่งรหัสไปที่เบอร์ของคุณแล้ว</p>
        <input type="number" id="loginOtp" class="search-box" placeholder="รหัส OTP 6 หลัก" maxlength="6" style="background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.3); letter-spacing: 5px;">
        <button class="btn-glow-green" id="btnConfirmOtp" onclick="confirmOtp()">✅ ยืนยัน OTP</button>
        </div>
        </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // 2. แสดง Modal และเก็บฟังก์ชันที่รอทำงานไว้
    document.getElementById('authModal').classList.add('show');
    document.getElementById('phoneStep').style.display = 'block';
    document.getElementById('otpStep').style.display = 'none';
    window.pendingAuthAction = nextAction;
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('show');
}

function requestOtp() {
    const phone = document.getElementById('loginPhone').value;
    if (phone.length < 10) {
        alert("⚠️ กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก");
        return;
    }
    ActionLock.lock('btnReqOtp', 'กำลังส่ง OTP...');
    setTimeout(() => {
        ActionLock.unlock('btnReqOtp');
        document.getElementById('phoneStep').style.display = 'none';
        document.getElementById('otpStep').style.display = 'block';
    }, 1000); // จำลองการดีเลย์ 1 วินาที
}

function confirmOtp() {
    const otp = document.getElementById('loginOtp').value;
    if (otp.length < 6) {
        alert("⚠️ กรุณากรอก OTP ให้ครบ 6 หลัก");
        return;
    }
    ActionLock.lock('btnConfirmOtp', 'ตรวจสอบรหัส...');
    setTimeout(() => {
        ActionLock.unlock('btnConfirmOtp');
        const phone = document.getElementById('loginPhone').value;

        // บันทึกการเข้าระบบลง LocalStorage
        AppState.set('user_phone', phone);
        alert("🎉 เข้าสู่ระบบสำเร็จ!");
        closeAuthModal();

        // รันคำสั่งที่โดนดักไว้ต่อได้เลย!
        if (typeof window.pendingAuthAction === 'function') {
            window.pendingAuthAction();
        }
    }, 1000);
}
