/* =========================================================
   الورشة الفنية — أكواد أعطال الأجهزة (app-fault-codes.js)
   =========================================================
   قسم مرجعي مستقل تمامًا عن الأقسام الأساسية (مش مربوط بعميل أو جهاز
   أو أمر شغل معين): كود العطل (زي E1) + نوع الجهاز + الماركة (اختياري،
   فاضي = "كل الماركات") + وصف قصير + السبب المحتمل + خطوات الفحص/الحل.

   المشاركة مع فنيين تانيين: كل فني بيثبّت نفس التطبيق على جهازه وعنده
   نسخته الخاصة من localStorage، فمفيش مزامنة تلقائية بين الأجهزة. الحل
   العملي: تصدير الأكواد بس (exportFaultCodesOnly) كملف JSON صغير منفصل
   عن النسخة الاحتياطية الكاملة (اللي فيها بيانات عملاء حساسة)، والفني
   التاني يستورده (importFaultCodesFile) وبيتضاف/يتدمج مع نسخته هو من
   غير ما يمسح اللي عنده، ومن غير تكرار لنفس الكود بالظبط.
   ========================================================= */

/* ---------------------------------------------------------------------
   تطبيع النص وكشف التكرار (نفس مبدأ normalizePartText بالظبط)
--------------------------------------------------------------------- */
function normalizeFaultText(v){
  return String(v||"").toLowerCase().normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g,"")
    .replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/[ـ]/g,"")
    .replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-0x0660))
    .replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-0x06F0))
    .replace(/[\s\-_./\\]+/g,"").trim();
}
function findDuplicateFaultCode(deviceType,brand,code,excludeId){
  let nc=normalizeFaultText(code);if(!nc)return null;
  let nt=normalizeFaultText(deviceType),nb=normalizeFaultText(brand);
  return arr(K.fc).find(f=>String(f.id)!==String(excludeId||"")
    &&normalizeFaultText(f.code)===nc
    &&normalizeFaultText(f.deviceType)===nt
    &&normalizeFaultText(f.brand)===nb)||null;
}

/* ---------------------------------------------------------------------
   القوائم المستخدمة (نفس أنواع/ماركات الأجهزة في باقي النظام، من ⚙️
   الإعدادات ← أنواع الأجهزة والتصنيفات / الماركات — مفيش قايمة منفصلة).
--------------------------------------------------------------------- */
function fillFaultDeviceTypes(el,selected=""){
  if(!el)return;
  el.innerHTML='<option value="">كل الأنواع (عام)</option>'+Object.keys(settings().types||{}).map(t=>`<option ${t===selected?"selected":""}>${esc(t)}</option>`).join("");
}
function fillFaultBrands(el,selected=""){
  if(!el)return;
  el.innerHTML='<option value="">كل الماركات (عام)</option>'+(settings().brands||[]).map(b=>`<option ${b===selected?"selected":""}>${esc(b)}</option>`).join("");
}

/* ---------------------------------------------------------------------
   الحفظ والحذف
--------------------------------------------------------------------- */
function collectFaultFormData(){
  return {
    deviceType:(fcDeviceType?.value||"").trim(),
    brand:(fcBrand?.value||"").trim(),
    code:(fcCode?.value||"").trim(),
    title:(fcTitle?.value||"").trim(),
    cause:(fcCause?.value||"").trim(),
    fix:(fcFix?.value||"").trim(),
    note:(fcNote?.value||"").trim(),
    addedBy:(fcAddedBy?.value||"").trim()
  };
}
function persistFaultRecord(formData,existing){
  let f=existing||{id:id(),source:"manual",createdAt:new Date().toISOString()};
  Object.assign(f,formData);f.updatedAt=new Date().toISOString();
  let a=arr(K.fc);
  if(!saveJSONSafe(K.fc,existing?a.map(x=>x.id===f.id?f:x):a.concat(f)))return{ok:false};
  return{ok:true,fault:f};
}
function saveFaultCode(e,existing=null){
  e.preventDefault();
  let formData=collectFaultFormData();
  if(!formData.code)return alert("اكتب كود العطل.");
  if(!formData.title)return alert("اكتب وصف قصير للعطل.");
  let dup=findDuplicateFaultCode(formData.deviceType,formData.brand,formData.code,existing?.id);
  if(dup)return alert(`⚠️ الكود «${dup.code}» مسجّل بالفعل لنفس النوع/الماركة (${dup.title||""}).\n\nعدّل الكود الموجود بدل ما تضيف نسخة تانية.`);
  let result=persistFaultRecord(formData,existing);
  if(!result.ok)return;
  location.href=`faultcode.html?id=${result.fault.id}`;
}
function deleteFaultCodeRecord(fid){
  let a=arr(K.fc),f=a.find(x=>x.id===fid);if(!f)return;
  if(!confirm(`حذف كود العطل «${f.code}» نهائيًا؟`))return;
  put(K.fc,a.filter(x=>x.id!==fid));
  renderFaultCodes?.();
  if(document.getElementById("faultCodeProfile"))location.href="faultcodes.html";
}

/* ---------------------------------------------------------------------
   العرض: صفحة القائمة الرئيسية (فلاتر نوع/ماركة/بحث + فورم إضافة)
--------------------------------------------------------------------- */
function initFaultCodes(){
  let f=document.getElementById("faultForm");if(!f)return;
  let q=new URLSearchParams(location.search),editId=q.get("edit"),existing=editId?arr(K.fc).find(x=>x.id===editId):null;
  fillFaultDeviceTypes(fcDeviceType,existing?.deviceType||"");
  fillFaultBrands(fcBrand,existing?.brand||"");
  if(existing){
    fcCode.value=existing.code||"";fcTitle.value=existing.title||"";fcCause.value=existing.cause||"";
    fcFix.value=existing.fix||"";fcNote.value=existing.note||"";fcAddedBy.value=existing.addedBy||"";
    f.classList.remove("hidden");f.querySelector(".primary").textContent="💾 حفظ التعديلات وفتح الكود";
  }
  f.onsubmit=e=>saveFaultCode(e,existing);
  let hint=document.getElementById("faultDuplicateHint");
  let checkDup=()=>{
    if(!hint)return;
    let dup=findDuplicateFaultCode(fcDeviceType.value,fcBrand.value,fcCode.value,existing?.id);
    if(dup){hint.innerHTML=`⚠️ نفس الكود مسجّل بالفعل لنفس النوع/الماركة: <b>${esc(dup.title||dup.code)}</b>.`;hint.className="hint negative";return}
    hint.textContent="";hint.className="hint";
  };
  fcCode.addEventListener("input",checkDup);fcDeviceType.addEventListener("change",checkDup);fcBrand.addEventListener("change",checkDup);
  let typeFilter=document.getElementById("fcFilterType"),brandFilter=document.getElementById("fcFilterBrand"),search=document.getElementById("faultSearch");
  if(typeFilter){typeFilter.innerHTML='<option value="">🔧 كل الأنواع</option>'+Object.keys(settings().types||{}).map(t=>`<option>${esc(t)}</option>`).join("");typeFilter.onchange=renderFaultCodes}
  if(brandFilter){brandFilter.innerHTML='<option value="">🏷️ كل الماركات</option>'+(settings().brands||[]).map(b=>`<option>${esc(b)}</option>`).join("");brandFilter.onchange=renderFaultCodes}
  if(search)search.oninput=renderFaultCodes;
  renderFaultCodes();
}
function renderFaultCodes(){
  let el=document.getElementById("faultList");if(!el)return;
  let q=(document.getElementById("faultSearch")?.value||"").toLowerCase();
  let typeFilter=document.getElementById("fcFilterType")?.value||"";
  let brandFilter=document.getElementById("fcFilterBrand")?.value||"";
  let a=arr(K.fc)
    .filter(f=>!typeFilter||f.deviceType===typeFilter)
    .filter(f=>!brandFilter||f.brand===brandFilter)
    .filter(f=>!q||(f.code+" "+f.title+" "+f.cause+" "+f.fix+" "+f.deviceType+" "+f.brand).toLowerCase().includes(q))
    .sort((x,y)=>(x.deviceType||"").localeCompare(y.deviceType||"","ar")||(x.brand||"").localeCompare(y.brand||"","ar")||(x.code||"").localeCompare(y.code||"","ar"));
  el.innerHTML=a.length?a.map(f=>`<div class="item ps-context-target" data-ps-title="كود عطل ${esc(f.code)}">
    <div class="item-head"><a href="faultcode.html?id=${f.id}"><b>🧯 ${esc(f.code)} — ${esc(f.title)}</b></a>${psActions("كود عطل "+f.code)}<button type="button" class="danger-btn small-btn" onclick="deleteFaultCodeRecord('${f.id}')">🗑️ حذف</button></div>
    <div>${esc(f.deviceType)||"كل الأنواع"} • 🏷️ ${esc(f.brand)||"كل الماركات"}</div>
    ${f.cause?`<div>السبب: ${esc(f.cause)}</div>`:""}
  </div>`).join(""):'<div class="item">لا توجد أكواد مسجّلة بهذا الفلتر بعد.</div>';
}

/* ---------------------------------------------------------------------
   العرض: صفحة ملف الكود الواحد
--------------------------------------------------------------------- */
function faultCodeProfile(){
  let el=document.getElementById("faultCodeProfile");if(!el)return;
  let f=arr(K.fc).find(x=>x.id===new URLSearchParams(location.search).get("id"));
  if(!f){el.innerHTML="<div class='item'>الكود غير موجود.</div>";return}
  el.classList.add("ps-context-target");el.setAttribute("data-ps-title",`كود عطل ${f.code}`);
  el.innerHTML=`<div class="profile">
    <div class="page-head"><h1 class="profile-title">🧯 ${esc(f.code)} — ${esc(f.title)}</h1>
      <div class="compact-actions"><a class="secondary" href="faultcodes.html?edit=${f.id}">✏️ تعديل</a><button class="danger-btn" onclick="deleteFaultCodeRecord('${f.id}')">🗑️ حذف</button>${psActions("كود عطل "+f.code)}</div>
    </div>
    <div class="profile-grid">
      <div class="kv"><b>نوع الجهاز</b>${esc(f.deviceType)||"كل الأنواع (عام)"}</div>
      <div class="kv"><b>الماركة</b>${esc(f.brand)||"كل الماركات (عام)"}</div>
      ${f.addedBy?`<div class="kv"><b>أضافه</b>${esc(f.addedBy)}</div>`:""}
    </div>
    ${f.cause?`<h3 class="expense-subtitle">🔍 السبب المحتمل</h3><div class="item">${esc(f.cause).replace(/\n/g,"<br>")}</div>`:""}
    ${f.fix?`<h3 class="expense-subtitle">🛠️ خطوات الفحص/الحل</h3><div class="item">${esc(f.fix).replace(/\n/g,"<br>")}</div>`:""}
    ${f.note?`<h3 class="expense-subtitle">📝 ملاحظات إضافية</h3><div class="item">${esc(f.note).replace(/\n/g,"<br>")}</div>`:""}
  </div>`;
}

/* ---------------------------------------------------------------------
   مشاركة الأكواد مع فنيين تانيين: تصدير/استيراد ملف منفصل تمامًا عن
   النسخة الاحتياطية الكاملة (اللي فيها بيانات عملاء حساسة). الاستيراد
   بيدمج (merge) مع الأكواد الموجودة أصلًا بدل ما يمسحها، ومش بيكرر
   كود موجود بالفعل لنفس النوع/الماركة.
--------------------------------------------------------------------- */
function exportFaultCodesOnly(){
  let data={faultCodes:arr(K.fc),_meta:{exportedAt:new Date().toISOString(),app:"الورشة الفنية — أكواد الأعطال",kind:"fault-codes-only"}};
  let blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  let url=URL.createObjectURL(blob);
  let stamp=new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
  let a=document.createElement("a");
  a.href=url;a.download=`اكواد-اعطال-الورشة-الفنية-${stamp}.json`;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function importFaultCodesFile(input){
  let file=input?.files?.[0];if(!file)return;
  let reader=new FileReader();
  reader.onload=()=>{
    try{
      let data=JSON.parse(reader.result);
      let incoming=Array.isArray(data)?data:(Array.isArray(data?.faultCodes)?data.faultCodes:null);
      if(!incoming)throw new Error("bad");
      let existing=arr(K.fc),added=0,skipped=0;
      incoming.forEach(raw=>{
        if(!raw||!raw.code)return;
        let dup=findDuplicateFaultCode(raw.deviceType,raw.brand,raw.code,null);
        if(dup){skipped++;return}
        existing.push({
          id:id(),deviceType:raw.deviceType||"",brand:raw.brand||"",code:raw.code||"",
          title:raw.title||"",cause:raw.cause||"",fix:raw.fix||"",note:raw.note||"",
          addedBy:raw.addedBy||"",source:"imported",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
        });
        added++;
      });
      put(K.fc,existing);
      alert(`تم استيراد ${added} كود جديد.${skipped?` (اتجاهل ${skipped} كود مكرر موجود عندك بالفعل).`:""}`);
      renderFaultCodes?.();
    }catch(err){alert("⚠️ ملف غير صالح. تأكد إنه ملف أكواد أعطال مُصدَّر من نفس النظام.")}
    input.value="";
  };
  reader.readAsText(file);
}
