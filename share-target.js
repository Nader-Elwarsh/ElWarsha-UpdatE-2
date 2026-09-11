/* share-target.js — منطق صفحة استقبال "مشاركة" مكالمة من تطبيق تاني (زي
   تطبيق تسجيل المكالمات) وتحويلها لبداية أمر شغل بسرعة، من غير ما
   المستخدم يفتح النظام ويدور يدويًا بنفسه.
   راجع: manifest.json (share_target) — service-worker.js (استقبال
   الـ POST الفعلي وحفظه) — share-store.js (تمرير البيانات للصفحة دي). */

// بيتحط فيه dataURL لملف التسجيل (لو موجود) بعد قراءته، وبيتخزن فعليًا
// في IndexedDB بس لما المستخدم يضغط "إنشاء أمر شغل" (مش قبل كده، عشان
// لو قفل الصفحة من غير ما يكمّل منتخزنش حاجة يتيمة).
let __shareRecordingDataURL = "";

// بحث مبدئي عن رقم موبايل مصري جوه أي نص (عنوان/تفاصيل المشاركة أو اسم
// الملف) — 01 وبعدها 0/1/2/5 وبعدين 8 أرقام، مع تجاهل أي +20 أو 0020
// أو صفر إضافي قبلها. أفضل مجهود، مش تحقق رسمي من صحة الرقم.
function extractPhoneFromText(s) {
  if (!s) return "";
  let m = String(s).match(/(?:\+?20|0)?1[0125]\d{8}/g);
  if (!m || !m.length) return "";
  let raw = m[0].replace(/\D/g, "");
  if (raw.startsWith("20")) raw = raw.slice(2);
  if (!raw.startsWith("0")) raw = "0" + raw;
  return raw;
}

// قراءة ملف عادي (مش صورة) كـ dataURL من غير أي تصغير/إعادة ترميز —
// imageToDataURL في app-shared.js مخصصة للصور (بتعيد رسمها في canvas)
// وهتكسر أي ملف صوت لو استخدمناها.
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file) { resolve(""); return; }
    let r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function initShareTarget() {
  let box = document.getElementById("shareSummaryBox");
  if (!box) return; // الصفحة دي مش share-target.html

  let q = new URLSearchParams(location.search);
  if (q.get("shared") !== "1") { box.classList.add("hidden"); return; }

  let payload = (typeof shareTake === "function") ? await shareTake() : null;
  if (!payload) {
    box.innerHTML = '<div class="hint">مفيش بيانات مشاركة جديدة قدرنا نقراها (ممكن الصفحة اتفتحت تاني بعد أول مرة). تقدر تكمّل أمر شغل عادي من الفورم تحت براحتك.</div>';
    return;
  }

  let combinedText = [payload.title, payload.text, payload.url].filter(Boolean).join("\n");
  let phone = extractPhoneFromText(combinedText) || extractPhoneFromText(payload.fileName);

  let summary = [];
  if (combinedText) summary.push(`<div class="kv"><b>📄 بيانات من تطبيق المشاركة</b><div>${esc(combinedText).replace(/\n/g, "<br>")}</div></div>`);
  if (payload.fileName) summary.push(`<div class="kv"><b>🎙️ الملف المرفق</b>${esc(payload.fileName)}</div>`);
  box.innerHTML = summary.join("") || '<div class="hint">اتشاركت من غير نص أو اسم ملف واضح — كمّل البيانات يدويًا تحت.</div>';

  if (payload.file) {
    let audioBox = document.getElementById("shareAudioPreview");
    if (audioBox) {
      try {
        let url = URL.createObjectURL(payload.file);
        audioBox.innerHTML = `<audio controls src="${url}" style="width:100%"></audio>`;
        audioBox.classList.remove("hidden");
      } catch (e) { console.error("[share-target] تعذرت معاينة الملف", e); }
    }
    __shareRecordingDataURL = await fileToDataURL(payload.file).catch(() => "");
  }

  let faultEl = document.getElementById("qoFault");
  if (faultEl && !faultEl.value.trim()) {
    faultEl.value = "📞 بلاغ عن طريق مكالمة" + (combinedText ? ("\n" + combinedText) : "");
  }

  let note = document.getElementById("sharePhoneNote");
  if (phone) {
    let existing = (typeof duplicateCustomerByPhone === "function") ? duplicateCustomerByPhone(phone) : null;
    if (existing) {
      fillCustomerAutocomplete("qoCustomer", existing.id);
      fillDevice(document.getElementById("qoDevice"), existing.id, "");
      if (note) note.textContent = `✅ الرقم ${phone} متسجل عندك للعميل: ${existing.name || "—"} (اتحدد تلقائيًا تحت).`;
    } else {
      if (note) note.textContent = `🆕 الرقم ${phone} مش متسجل عندك — دوس "➕ عميل" واتملى لك تلقائيًا.`;
      let phoneEl = document.getElementById("qoPhone");
      if (phoneEl) phoneEl.value = phone;
      toggleQuickAdd("qoCustomerBox");
    }
  } else if (note) {
    note.textContent = "ℹ️ مقدرناش نطلع رقم تليفون من المشاركة تلقائيًا — اختار العميل يدويًا تحت.";
  }
}

// نسخة من quickCreateRequest (app-quick-add.js) بنفس المنطق بالظبط، بس
// بتلحق مرجع تسجيل المكالمة (لو موجود) على الأمر بعد إنشائه. اتعملت
// نسخة منفصلة بدل تعديل quickCreateRequest الأصلية عشان الأخيرة دي
// مستخدمة في "أمر شغل سريع" بالشاشة الرئيسية ومالهاش أي علاقة بمشاركة
// المكالمات — تعديلها كان هيوسّع مساحة التأثير من غير داعي.
async function createRequestFromCallShare() {
  let cid = document.getElementById("qoCustomer")?.value, did = document.getElementById("qoDevice")?.value, fault = (document.getElementById("qoFault")?.value || "").trim();
  if (!cid) return alert("اختر العميل أولاً.");
  if (!did) return alert("اختر الجهاز أولاً.");
  if (!fault) return alert("اكتب وصف العطل.");
  let s = settings();
  let r = { id: id(), no: orderNo(), customerId: cid, deviceId: did, addressKey: "main", visit: "", status: "جديد", executionPlace: (s.executionPlaces || [])[0] || "عند العميل", workshopStatus: (s.workshopStatuses || [])[0] || "غير مطلوب", partsWaiting: false, tag: "", fault, work: "", labor: 0, parts: [], partsTotal: 0, partsCost: 0, total: 0, deposit: 0, remain: 0, closed: false, createdAt: new Date().toISOString() };
  if (__shareRecordingDataURL) {
    try { r.callRecordingRef = await window.ImageStore.save(__shareRecordingDataURL); }
    catch (e) { console.error("[share-target] فشل حفظ تسجيل المكالمة، هيتحفظ الأمر من غيره", e); }
  }
  recordStatusHistory(r, "", r.status);
  applyStatusTimestamp(r, r.status);
  put(K.r, arr(K.r).concat(r));
  location.href = `request.html?id=${r.id}`;
}

// لازم نستنى initQuickOrder (بتاعة app-quick-add.js) تخلص الأول، لأنها
// بترجّع قايمة الجهاز لحالتها الفاضية عند تحميل الصفحة (خاصة بأمر الشغل
// السريع في الشاشة الرئيسية) — لو initShareTarget اشتغلت قبلها كانت
// هتمسح العميل/الجهاز اللي حددناهم تلقائيًا من رقم التليفون.
if (typeof window.initQuickOrder === "function") {
  const _oldInitQuickOrderForShare = window.initQuickOrder;
  window.initQuickOrder = function () {
    _oldInitQuickOrderForShare();
    initShareTarget();
  };
}
