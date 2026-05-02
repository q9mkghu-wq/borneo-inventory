import { db } from './firebase.js'
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import * as XLSX from 'xlsx'

// ── 상태 ──────────────────────────────────────────────
const DOC_REF = doc(db, 'borneo', 'data')
let S = { parts:{}, products:{}, history:[], inHistory:[], drivers:[], cfg:null }
let gPeriod='일별', gOffset=0, selectedDriver=null, dPeriod='일별', dOffset=0
let bulkRows=[{part:'',qty:1}], partSlots=[{part:'',qty:1}]
let cart=[], batchDetailOpen=false
let unsubscribe=null

const DEFAULT_CFG = {
  categories:['침대','소파','행거'],
  pyunbaek:['편백','일반(원목)','일반(MDF)'],
  models:{'침대':['보르네오 A형','보르네오 B형','루체 1000'],'소파':['패밀리 3인','패밀리 2인'],'행거':['스탠다드형','와이드형']},
  sizes:['싱글(SS)','슈퍼싱글','더블(D)','퀸(Q)','킹(K)'],
  colors:['화이트','월넛','오크','블랙'],
  mattTypes:['본넬스프링','포켓스프링','메모리폼','라텍스'],
  mattSizes:['싱글(SS)','슈퍼싱글','더블(D)','퀸(Q)','킹(K)'],
  mattModels:['보르네오 A형','루체 1000']
}
let CFG = JSON.parse(JSON.stringify(DEFAULT_CFG))

// 단건 출고 선택 상태
let SEL_cat='', SEL_sub='', SEL_model='', SEL_size='', SEL_color=''
let SEL_mattyn='', SEL_matttype='', SEL_mattsize='', finalProdName=''

// 묶음 출고 선택 상태
let BSEL = {cat:'',sub:'',model:'',size:'',color:''}

const DP = {'프레임(대)':{qty:80,min:10},'프레임(소)':{qty:75,min:10},'사이드레일 L':{qty:60,min:8},'사이드레일 R':{qty:60,min:8},'헤드보드':{qty:45,min:5},'풋보드':{qty:40,min:5},'슬랫(12개입)':{qty:50,min:6},'중간지지대':{qty:55,min:8},'볼트세트A':{qty:120,min:20},'볼트세트B':{qty:110,min:20},'서랍(좌)':{qty:35,min:5},'서랍(우)':{qty:35,min:5},'다리(4개입)':{qty:48,min:6},'매트지지판':{qty:30,min:4},'조립설명서':{qty:200,min:30}}
const DPR = {'A형 침대 싱글':{'프레임(대)':1,'사이드레일 L':1,'사이드레일 R':1,'슬랫(12개입)':1,'볼트세트A':1,'조립설명서':1},'A형 침대 퀸':{'프레임(대)':1,'프레임(소)':1,'사이드레일 L':1,'사이드레일 R':1,'슬랫(12개입)':2,'볼트세트A':1,'조립설명서':1}}

// ── Firebase ──────────────────────────────────────────
function setSS(s,msg){const dot=document.getElementById('syncDot'),txt=document.getElementById('syncText');dot.className='dot '+s;txt.textContent=msg;if(s==='live')document.getElementById('syncTime').textContent='마지막 동기화 '+new Date().toLocaleTimeString('ko-KR');}

async function load(){
  try{
    setSS('loading','데이터 불러오는 중...')
    const r=await getDoc(DOC_REF)
    if(r.exists()){const d=r.data();S.parts=d.parts||DP;S.products=d.products||DPR;S.history=d.history||[];S.inHistory=d.inHistory||[];S.drivers=d.drivers||[];if(d.cfg)CFG=d.cfg;}
    else{S.parts=JSON.parse(JSON.stringify(DP));S.products=JSON.parse(JSON.stringify(DPR));S.history=[];S.inHistory=[];S.drivers=[];await save();}
    setSS('live','실시간 동기화 중')
    refreshUI()
    startRT()
  }catch(e){console.error(e);setSS('error','연결 실패 — 새로고침 해주세요')}
}

async function save(){
  await setDoc(DOC_REF,{parts:S.parts,products:S.products,history:S.history.slice(0,300),inHistory:S.inHistory.slice(0,300),drivers:S.drivers,cfg:CFG})
}

function startRT(){
  if(unsubscribe)unsubscribe()
  unsubscribe=onSnapshot(DOC_REF,snap=>{
    if(!snap.exists())return
    const d=snap.data()
    S.parts=d.parts||{};S.products=d.products||{};S.history=d.history||[];S.inHistory=d.inHistory||[];S.drivers=d.drivers||[]
    if(d.cfg)CFG=d.cfg
    setSS('live','실시간 동기화 중')
    refreshUI()
  })
}

// ── UI ────────────────────────────────────────────────
function refreshUI(){
  renderAlerts();popDriverSel();popBatchDriverSel();popInPartSel();renderBulkRows();initYearSel();
  populateCatSel();populateBatchCatSel()
  const act=document.querySelector('.section.active');if(!act)return
  const id=act.id
  if(id==='tab-재고'){renderSummary();renderInventory()}
  if(id==='tab-분석')renderAnalysis()
  if(id==='tab-전체통계')renderGlobal()
  if(id==='tab-기사통계')renderDriverStatPage()
  if(id==='tab-이력')renderHistory()
  if(id==='tab-입고이력')renderInHistory()
  if(id==='tab-관리'){renderDriverChips();renderPartMgmt();renderProdList();renderPartSlots();renderOptMgmt()}
}

window.showTab=function(name){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'))
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'))
  event.target.classList.add('active')
  document.getElementById('tab-'+name).classList.add('active')
  if(name==='재고'){renderSummary();renderInventory()}
  if(name==='분석')renderAnalysis()
  if(name==='전체통계')renderGlobal()
  if(name==='기사통계')renderDriverStatPage()
  if(name==='이력')renderHistory()
  if(name==='입고이력')renderInHistory()
  if(name==='관리'){renderDriverChips();renderPartMgmt();renderProdList();renderPartSlots();renderOptMgmt()}
}

function renderAlerts(){
  const empty=Object.entries(S.parts).filter(([,p])=>p.qty===0)
  const low=Object.entries(S.parts).filter(([,p])=>p.qty>0&&p.qty<=p.min)
  let h=''
  if(empty.length)h+=`<div class="alert-banner err">재고 소진 ${empty.length}종: ${empty.map(([n])=>n).join(', ')}</div>`
  if(low.length)h+=`<div class="alert-banner warn">재고 부족 ${low.length}종: ${low.map(([n])=>n).join(', ')}</div>`
  document.getElementById('alertBanners').innerHTML=h
}

// ── 단건 출고 계층 선택 ──────────────────────────────
function popSel(id,arr){const el=document.getElementById(id);if(!el)return;const cur=el.value;el.innerHTML='<option value="">-- 선택하세요 --</option>';arr.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;if(v===cur)o.selected=true;el.appendChild(o);})}
function showSW(n,v){const el=document.getElementById('sw'+n);if(el)el.style.display=v?'flex':'none'}
function setBadge(n,on){const el=document.getElementById('sb'+n);if(el)el.className='step-badge '+(on?'on':'off')}
function getModelName(){if(SEL_cat==='침대'){return SEL_sub.includes('편백')?SEL_sub:SEL_model}return SEL_sub}
function populateCatSel(){popSel('sc_cat',CFG.categories)}

window.step1_cat=function(){
  SEL_cat=document.getElementById('sc_cat').value;SEL_sub='';SEL_model='';SEL_size='';SEL_color='';SEL_mattyn='';SEL_matttype='';SEL_mattsize='';finalProdName=''
  for(let i=2;i<=8;i++)showSW(i,false)
  document.getElementById('resultSel').style.display='none';document.getElementById('shipBtn').disabled=true
  if(!SEL_cat)return;setBadge(1,true)
  if(SEL_cat==='침대'){document.getElementById('sl2').textContent='재질 선택 (편백 여부)';popSel('sc_sub',CFG.pyunbaek)}
  else{document.getElementById('sl2').textContent='모델 선택';popSel('sc_sub',CFG.models[SEL_cat]||[])}
  showSW(2,true);setBadge(2,true)
}

window.step2_sub=function(){
  SEL_sub=document.getElementById('sc_sub').value;SEL_model='';SEL_size='';SEL_color='';SEL_mattyn='';SEL_matttype='';SEL_mattsize='';finalProdName=''
  for(let i=3;i<=8;i++)showSW(i,false)
  document.getElementById('resultSel').style.display='none';document.getElementById('shipBtn').disabled=true
  if(!SEL_sub)return
  if(SEL_cat==='침대'){
    if(SEL_sub.includes('편백')){popSel('sc_size',CFG.sizes);showSW(4,true);setBadge(4,true)}
    else{popSel('sc_model',CFG.models['침대']||[]);showSW(3,true);setBadge(3,true)}
  }else{popSel('sc_size',CFG.sizes);showSW(4,true);setBadge(4,true)}
}

window.step3_model=function(){
  SEL_model=document.getElementById('sc_model').value;SEL_size='';SEL_color='';SEL_mattyn='';SEL_matttype='';SEL_mattsize='';finalProdName=''
  for(let i=4;i<=8;i++)showSW(i,false)
  document.getElementById('resultSel').style.display='none';document.getElementById('shipBtn').disabled=true
  if(!SEL_model)return;popSel('sc_size',CFG.sizes);showSW(4,true);setBadge(4,true)
}

window.step4_size=function(){
  SEL_size=document.getElementById('sc_size').value;SEL_color='';SEL_mattyn='';SEL_matttype='';SEL_mattsize='';finalProdName=''
  for(let i=5;i<=8;i++)showSW(i,false)
  document.getElementById('resultSel').style.display='none';document.getElementById('shipBtn').disabled=true
  if(!SEL_size)return;popSel('sc_color',CFG.colors);showSW(5,true);setBadge(5,true)
}

window.step5_color=function(){
  SEL_color=document.getElementById('sc_color').value;SEL_mattyn='';SEL_matttype='';SEL_mattsize='';finalProdName=''
  for(let i=6;i<=8;i++)showSW(i,false)
  document.getElementById('resultSel').style.display='none';document.getElementById('shipBtn').disabled=true
  if(!SEL_color)return;setBadge(5,true)
  const mk=getModelName()
  if(CFG.mattModels.includes(mk)){showSW(6,true);setBadge(6,true);document.getElementById('sc_mattyn').value=''}
  else showFinalResult()
}

window.step6_mattyn=function(){
  SEL_mattyn=document.getElementById('sc_mattyn').value;SEL_matttype='';SEL_mattsize='';finalProdName=''
  showSW(7,false);showSW(8,false)
  document.getElementById('resultSel').style.display='none';document.getElementById('shipBtn').disabled=true
  if(!SEL_mattyn)return
  if(SEL_mattyn==='있음'){popSel('sc_matttype',CFG.mattTypes);showSW(7,true);setBadge(7,true)}
  else showFinalResult()
}

window.step7_matttype=function(){
  SEL_matttype=document.getElementById('sc_matttype').value;SEL_mattsize='';finalProdName=''
  showSW(8,false);document.getElementById('resultSel').style.display='none';document.getElementById('shipBtn').disabled=true
  if(!SEL_matttype)return;popSel('sc_mattsize',CFG.mattSizes);showSW(8,true);setBadge(8,true)
}

window.step8_mattsize=function(){
  SEL_mattsize=document.getElementById('sc_mattsize').value
  if(!SEL_mattsize)return;showFinalResult()
}

function showFinalResult(){
  const mk=getModelName();let parts=[]
  if(SEL_cat==='침대'){parts.push(SEL_sub);if(!SEL_sub.includes('편백')&&SEL_model)parts.push(SEL_model)}
  else parts.push(mk)
  if(SEL_size)parts.push(SEL_size);if(SEL_color)parts.push(SEL_color)
  finalProdName=SEL_cat+' '+parts.join(' ')
  let mattStr='';if(SEL_mattyn==='있음'&&SEL_matttype&&SEL_mattsize)mattStr=` + 매트리스(${SEL_matttype} ${SEL_mattsize})`
  document.getElementById('rSelTitle').textContent='✅ '+finalProdName+mattStr
  document.getElementById('rSelPath').textContent='경로: '+[SEL_cat,...parts].join(' > ')+(mattStr?' + 매트':'')
  const partData=S.products[finalProdName]
  let partsHtml=''
  if(partData){partsHtml='<div style="font-size:12px;color:#6b7280;margin-top:8px;margin-bottom:4px;">구성 부품</div>';Object.entries(partData).forEach(([p,n])=>{partsHtml+=`<div class="prow"><span>${p}</span><span>${n}개</span></div>`})}
  else partsHtml='<div style="font-size:12px;color:#d97706;margin-top:8px;">⚠ 부품 구성이 등록되지 않았습니다. 제품 관리에서 등록하세요.</div>'
  document.getElementById('rSelParts').innerHTML=partsHtml
  document.getElementById('resultSel').style.display='block'
  document.getElementById('shipBtn').disabled=false
}

function popDriverSel(){const sel=document.getElementById('driverSelect'),cur=sel.value;sel.innerHTML='<option value="">-- 기사를 선택하세요 --</option>';S.drivers.slice().sort().forEach(d=>{const o=document.createElement('option');o.value=d;o.textContent=d;if(d===cur)o.selected=true;sel.appendChild(o)})}

window.processShipment=async function(){
  const driver=document.getElementById('driverSelect').value,qty=parseInt(document.getElementById('qty').value)||1
  const addr=document.getElementById('deliveryAddr').value.trim(),customer=document.getElementById('customerName').value.trim(),note=document.getElementById('shipNote').value.trim()
  if(!driver){showToast('기사를 선택해주세요.','warn');return}
  if(!finalProdName){showToast('제품을 선택해주세요.','warn');return}
  const btn=document.getElementById('shipBtn');btn.disabled=true;btn.innerHTML='<span class="spinner"></span>'
  const parts=S.products[finalProdName];let partsStr=''
  if(parts){Object.entries(parts).forEach(([part,n])=>{if(!S.parts[part])S.parts[part]={qty:0,min:0};S.parts[part].qty=Math.max(0,S.parts[part].qty-n*qty)});partsStr=Object.entries(parts).map(([p,n])=>`${p} x${n*qty}`).join(', ')}
  let mattStr='';if(SEL_mattyn==='있음'&&SEL_matttype&&SEL_mattsize)mattStr=` + 매트리스(${SEL_matttype} ${SEL_mattsize})`
  S.history.unshift({time:new Date().toLocaleString('ko-KR'),driver,prod:finalProdName+mattStr,qty,addr,customer,note,parts:partsStr||'부품 구성 미등록'})
  await save()
  document.getElementById('driverSelect').value='';document.getElementById('customerName').value='';document.getElementById('deliveryAddr').value='';document.getElementById('shipNote').value='';document.getElementById('qty').value=1
  document.getElementById('sc_cat').value='';SEL_cat='';SEL_sub='';SEL_model='';SEL_size='';SEL_color='';SEL_mattyn='';SEL_matttype='';SEL_mattsize='';finalProdName=''
  for(let i=2;i<=8;i++)showSW(i,false);document.getElementById('resultSel').style.display='none'
  btn.disabled=true;btn.textContent='출고 처리';renderAlerts()
  showToast(`${driver} 기사 — ${finalProdName}${mattStr} ${qty}세트 출고 완료`)
}

// ── 묶음 출고 ────────────────────────────────────────
function popBatchDriverSel(){const sel=document.getElementById('batchDriver'),cur=sel.value;sel.innerHTML='<option value="">-- 기사 선택 --</option>';S.drivers.slice().sort().forEach(d=>{const o=document.createElement('option');o.value=d;o.textContent=d;if(d===cur)o.selected=true;sel.appendChild(o)})}
function populateBatchCatSel(){const sel=document.getElementById('bc_cat');const cur=sel.value;sel.innerHTML='<option value="">선택</option>';CFG.categories.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;if(c===cur)o.selected=true;sel.appendChild(o)})}
function bShowW(id,v){const el=document.getElementById(id);if(el)el.style.display=v?'block':'none'}
function bPopSel(id,arr){const el=document.getElementById(id);if(!el)return;el.innerHTML='<option value="">선택</option>';arr.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;el.appendChild(o)})}
function bResetFrom(step){if(step<=2){BSEL.sub='';bShowW('bc_sub_w',false)}if(step<=3){BSEL.model='';bShowW('bc_model_w',false)}if(step<=4){BSEL.size='';bShowW('bc_size_w',false)}if(step<=5){BSEL.color='';bShowW('bc_color_w',false)}bShowW('bc_add_row',false);document.getElementById('bc_preview_name').textContent=''}

window.bOnCat=function(){BSEL.cat=document.getElementById('bc_cat').value;bResetFrom(2);if(!BSEL.cat)return;if(BSEL.cat==='침대'){document.getElementById('bc_sub_lbl').textContent='재질';bPopSel('bc_sub',CFG.pyunbaek)}else{document.getElementById('bc_sub_lbl').textContent='모델';bPopSel('bc_sub',CFG.models[BSEL.cat]||[])}bShowW('bc_sub_w',true)}
window.bOnSub=function(){BSEL.sub=document.getElementById('bc_sub').value;bResetFrom(3);if(!BSEL.sub)return;if(BSEL.cat==='침대'){if(BSEL.sub.includes('편백')){bPopSel('bc_size',CFG.sizes);bShowW('bc_size_w',true)}else{bPopSel('bc_model',CFG.models['침대']||[]);bShowW('bc_model_w',true)}}else{bPopSel('bc_size',CFG.sizes);bShowW('bc_size_w',true)}}
window.bOnModel=function(){BSEL.model=document.getElementById('bc_model').value;bResetFrom(4);if(!BSEL.model)return;bPopSel('bc_size',CFG.sizes);bShowW('bc_size_w',true)}
window.bOnSize=function(){BSEL.size=document.getElementById('bc_size').value;bResetFrom(5);if(!BSEL.size)return;bPopSel('bc_color',CFG.colors);bShowW('bc_color_w',true)}
window.bOnColor=function(){
  BSEL.color=document.getElementById('bc_color').value;bShowW('bc_add_row',false)
  if(!BSEL.color)return
  const name=bBuildName()
  document.getElementById('bc_preview_name').textContent='✅ '+name+(S.products[name]?'':'  ⚠ 부품 구성 미등록')
  bShowW('bc_add_row',true)
}
function bBuildName(){
  if(BSEL.cat==='침대'){if(BSEL.sub.includes('편백'))return`침대 ${BSEL.sub} ${BSEL.size} ${BSEL.color}`;return`침대 ${BSEL.sub} ${BSEL.model} ${BSEL.size} ${BSEL.color}`}
  return`${BSEL.cat} ${BSEL.sub} ${BSEL.color}`
}

window.addToCart=function(){
  const name=bBuildName(),qty=parseInt(document.getElementById('bc_qty').value)||1
  const customer=document.getElementById('bc_customer').value.trim(),addr=document.getElementById('bc_addr').value.trim()
  cart.push({name,qty,customer,addr,parts:S.products[name]||null})
  document.getElementById('bc_cat').value='';BSEL={cat:'',sub:'',model:'',size:'',color:''}
  bResetFrom(2);document.getElementById('bc_qty').value=1;document.getElementById('bc_customer').value='';document.getElementById('bc_addr').value=''
  renderCart();renderBatchSummary();showToast(name+' 담기 완료')
}
window.removeFromCart=(i)=>{cart.splice(i,1);renderCart();renderBatchSummary()}
window.clearCart=()=>{cart=[];renderCart();renderBatchSummary()}
window.changeCartQty=(i,v)=>{cart[i].qty=Math.max(1,parseInt(v)||1);renderBatchSummary()}

function renderCart(){
  const el=document.getElementById('cartCard')
  if(!cart.length){el.style.display='none';document.getElementById('batchSummaryCard').style.display='none';return}
  el.style.display='block'
  document.getElementById('cartCount').textContent='('+cart.length+'건)'
  document.getElementById('cartList').innerHTML=cart.map((item,i)=>`
    <div class="cart-item">
      <div class="cart-item-name">${item.name}${!item.parts?'<span style="font-size:11px;color:#d97706;margin-left:6px;">⚠부품미등록</span>':''}</div>
      <div style="display:flex;align-items:center;gap:6px;font-size:13px;"><input type="number" value="${item.qty}" min="1" style="width:55px;padding:5px 8px;" onchange="changeCartQty(${i},this.value)"><span>세트</span></div>
      <button class="danger" onclick="removeFromCart(${i})">✕</button>
      ${item.customer||item.addr?`<div class="cart-customer">${item.customer?'고객: '+item.customer:''} ${item.addr?'/ '+item.addr:''}</div>`:''}
    </div>`).join('')
}

function renderBatchSummary(){
  if(!cart.length){document.getElementById('batchSummaryCard').style.display='none';return}
  document.getElementById('batchSummaryCard').style.display='block'
  const total={}
  cart.forEach(item=>{
    if(!item.parts)return
    Object.entries(item.parts).forEach(([part,n])=>{
      if(!total[part])total[part]={need:0,usedBy:[]}
      total[part].need+=n*item.qty
      if(!total[part].usedBy.includes(item.name))total[part].usedBy.push(item.name)
    })
  })
  const alerts=[]
  const noParts=cart.filter(i=>!i.parts)
  if(noParts.length)alerts.push(`<div class="alert-box warn">⚠ 부품 구성 미등록 ${noParts.length}건: ${noParts.map(i=>i.name).join(', ')}</div>`)
  const short=Object.entries(total).filter(([p,d])=>(S.parts[p]?S.parts[p].qty:0)<d.need)
  if(short.length)alerts.push(`<div class="alert-box err">🚨 재고 부족 ${short.length}종: ${short.map(([p])=>p).join(', ')}</div>`)
  document.getElementById('batchAlerts').innerHTML=alerts.join('')
  const sorted=Object.entries(total).sort((a,b)=>a[0].localeCompare(b[0],'ko'))
  document.getElementById('batchPartsBody').innerHTML=sorted.map(([part,d])=>{
    const stock=S.parts[part]?S.parts[part].qty:0,isShort=stock<d.need,isEmpty=stock===0,isShared=d.usedBy.length>1
    const bc=isEmpty?'empty':isShort?'low':'ok',rc=isEmpty?'ps-err':isShort?'ps-warn':''
    const shBadge=isShared?`<span class="shared-badge">공통 ${d.usedBy.length}개</span>`:`<span class="unique-badge">단독</span>`
    return`<tr class="${rc}"><td><strong>${part}</strong>${shBadge}</td><td style="text-align:center;font-weight:700;font-size:15px;">${d.need}개</td><td style="text-align:center;color:${isEmpty?'#dc2626':isShort?'#d97706':'#6b7280'};">${stock}개</td><td style="text-align:center;"><span class="qty-badge ${bc}">${isEmpty?'소진':isShort?'부족':'OK'}</span></td><td style="font-size:12px;color:#6b7280;">${d.usedBy.join(', ')}</td></tr>`
  }).join('')
  document.getElementById('batchProductDetailList').innerHTML=cart.map(item=>{
    if(!item.parts)return`<div class="prod-parts-item"><div class="prod-parts-title">${item.name} ×${item.qty} — ⚠ 부품 구성 미등록</div></div>`
    const lines=Object.entries(item.parts).map(([p,n])=>{const t=n*item.qty;const st=S.parts[p]?S.parts[p].qty:0;const color=st<t?'#dc2626':'inherit';return`<div class="part-line"><span>${p}</span><span style="color:${color};font-weight:500;">${t}개</span></div>`}).join('')
    return`<div class="prod-parts-item"><div class="prod-parts-title">${item.name} ×${item.qty}세트${item.customer?' — '+item.customer:''}</div>${lines}</div>`
  }).join('')
}

window.toggleBatchDetail=function(){
  batchDetailOpen=!batchDetailOpen
  document.getElementById('batchProductDetail').style.display=batchDetailOpen?'block':'none'
  document.getElementById('detailToggleBtn').textContent=batchDetailOpen?'제품별 상세 닫기':'제품별 상세 보기'
}

window.processBatchShipment=async function(){
  if(!cart.length)return
  const driver=document.getElementById('batchDriver').value
  if(!driver){showToast('기사를 선택해주세요.','warn');return}
  const totalNeeded={}
  cart.forEach(item=>{if(!item.parts)return;Object.entries(item.parts).forEach(([p,n])=>{totalNeeded[p]=(totalNeeded[p]||0)+n*item.qty})})
  const short=Object.entries(totalNeeded).filter(([p,n])=>(S.parts[p]?S.parts[p].qty:0)<n).map(([p])=>p)
  if(short.length){if(!confirm(`재고 부족 부품이 있습니다:\n${short.join(', ')}\n\n그래도 출고 처리하시겠습니까?`))return}
  const btn=document.getElementById('batchShipBtn');btn.disabled=true;btn.innerHTML='<span class="spinner"></span>'
  Object.entries(totalNeeded).forEach(([p,n])=>{if(!S.parts[p])S.parts[p]={qty:0,min:0};S.parts[p].qty=Math.max(0,S.parts[p].qty-n)})
  const time=new Date().toLocaleString('ko-KR')
  cart.forEach(item=>{
    const partsStr=item.parts?Object.entries(item.parts).map(([p,n])=>p+' x'+(n*item.qty)).join(', '):'부품 구성 미등록'
    S.history.unshift({time,driver,prod:item.name,qty:item.qty,addr:item.addr||'',customer:item.customer||'',note:'묶음출고',parts:partsStr})
  })
  const cnt=cart.length
  await save()
  cart=[];renderCart();renderBatchSummary()
  btn.disabled=false;btn.textContent='✅ 일괄 출고 처리';renderAlerts()
  showToast(`${driver} 기사 — 묶음 출고 ${cnt}건 완료`)
}

// ── 입고 ─────────────────────────────────────────────
function popInPartSel(){const sel=document.getElementById('inPartSelect'),cur=sel.value;sel.innerHTML='<option value="">-- 부품을 선택하세요 --</option>';Object.keys(S.parts).sort().forEach(p=>{const o=document.createElement('option');o.value=p;o.textContent=p;if(p===cur)o.selected=true;sel.appendChild(o)})}
window.renderInPreview=function(){const part=document.getElementById('inPartSelect').value,qty=parseInt(document.getElementById('inQty').value)||0,el=document.getElementById('inPreview');if(!part||!S.parts[part]){el.innerHTML='';return}const cur=S.parts[part].qty;el.innerHTML=`<div class="preview-box"><div class="prow"><span>현재 재고</span><span>${cur}개</span></div><div class="prow"><span>입고 후 재고</span><span style="font-weight:500;color:#065f46;">${cur+qty}개</span></div></div>`}
window.processInbound=async function(){
  const part=document.getElementById('inPartSelect').value,qty=parseInt(document.getElementById('inQty').value)||0
  const supplier=document.getElementById('inSupplier').value.trim(),note=document.getElementById('inNote').value.trim()
  if(!part){showToast('부품을 선택해주세요.','warn');return}if(qty<=0){showToast('수량을 입력해주세요.','warn');return}
  const btn=document.getElementById('inBtn');btn.disabled=true;btn.innerHTML='<span class="spinner"></span>'
  if(!S.parts[part])S.parts[part]={qty:0,min:0};S.parts[part].qty+=qty
  S.inHistory.unshift({time:new Date().toLocaleString('ko-KR'),part,qty,supplier,note,type:'단건'})
  await save()
  document.getElementById('inPartSelect').value='';document.getElementById('inQty').value=1;document.getElementById('inSupplier').value='';document.getElementById('inNote').value='';document.getElementById('inPreview').innerHTML=''
  btn.disabled=false;btn.textContent='입고 처리';renderAlerts();showToast(`${part} ${qty}개 입고 완료`)
}
function renderBulkRows(){
  const pn=Object.keys(S.parts).sort()
  document.getElementById('bulkInRows').innerHTML=bulkRows.map((r,i)=>`
    <div class="part-row">
      <select id="bslot_${i}" style="flex:1;font-size:13px;" onchange="bulkRows[${i}].part=this.value">
        <option value="">-- 부품 선택 --</option>
        ${pn.map(p=>`<option value="${p}"${r.part===p?' selected':''}>${p}</option>`).join('')}
      </select>
      <input type="number" id="bslot_qty_${i}" min="1" value="${r.qty}" style="width:70px;"
        onchange="bulkRows[${i}].qty=parseInt(this.value)||1">
      <button class="danger" onclick="removeBulkRow(${i})">X</button>
    </div>`).join('')
}
function syncBulkRows(){
  bulkRows.forEach((r,i)=>{
    const sel=document.getElementById('bslot_'+i)
    const qty=document.getElementById('bslot_qty_'+i)
    if(sel)r.part=sel.value
    if(qty)r.qty=parseInt(qty.value)||1
  })
}
window.addBulkRow=()=>{syncBulkRows();bulkRows.push({part:'',qty:1});renderBulkRows()}
window.removeBulkRow=(i)=>{syncBulkRows();bulkRows.splice(i,1);if(!bulkRows.length)bulkRows.push({part:'',qty:1});renderBulkRows()}
window.processBulkInbound=async function(){
  const valid=bulkRows.filter(r=>r.part&&r.qty>0);if(!valid.length){showToast('부품을 선택해주세요.','warn');return}
  const time=new Date().toLocaleString('ko-KR')
  valid.forEach(r=>{if(!S.parts[r.part])S.parts[r.part]={qty:0,min:0};S.parts[r.part].qty+=r.qty;S.inHistory.unshift({time,part:r.part,qty:r.qty,supplier:'',note:'일괄입고',type:'일괄'})})
  await save();bulkRows=[{part:'',qty:1}];renderBulkRows();renderAlerts();showToast(`일괄 입고 완료 (${valid.length}종)`)
}
function renderInHistory(){const q=(document.getElementById('inHistSearch').value||'').toLowerCase(),el=document.getElementById('inHistoryList'),filtered=S.inHistory.filter(h=>!q||h.part.toLowerCase().includes(q)||(h.supplier||'').toLowerCase().includes(q));if(!filtered.length){el.innerHTML='<div class="empty-state">입고 이력이 없습니다.</div>';return}el.innerHTML=filtered.slice(0,100).map(h=>`<div class="history-item"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;"><span style="font-weight:500;">${h.part}</span><span class="tag-sm">+${h.qty}개</span>${h.supplier?`<span class="tag-sm">${h.supplier}</span>`:''}<span style="margin-left:auto;font-size:12px;color:#6b7280;">${h.time}</span></div>${h.note&&h.note!=='일괄입고'?`<div style="font-size:13px;color:#6b7280;">${h.note}</div>`:''}</div>`).join('')}
window.renderInHistory=renderInHistory

// ── 재고 현황 ────────────────────────────────────────
function renderSummary(){const vals=Object.values(S.parts),total=vals.length,low=vals.filter(p=>p.qty>0&&p.qty<=p.min).length,empty=vals.filter(p=>p.qty===0).length;document.getElementById('summaryCards').innerHTML=mc('전체 부품',total+'종')+mc('정상',(total-low-empty)+'종','#065f46')+mc('부족',low+'종','#92400e')+mc('소진',empty+'종','#991b1b')}
function renderInventory(){const q=(document.getElementById('searchPart').value||'').toLowerCase(),fs=document.getElementById('filterStatus').value,tbody=document.getElementById('inventoryBody');let entries=Object.entries(S.parts).filter(([n])=>n.toLowerCase().includes(q));if(fs==='정상')entries=entries.filter(([,p])=>p.qty>p.min);else if(fs==='부족')entries=entries.filter(([,p])=>p.qty>0&&p.qty<=p.min);else if(fs==='소진')entries=entries.filter(([,p])=>p.qty===0);if(!entries.length){tbody.innerHTML='<tr><td colspan="5" class="empty-state">검색 결과 없음</td></tr>';return}tbody.innerHTML=entries.map(([name,p])=>{const status=p.qty===0?'<span class="badge empty">소진</span>':p.qty<=p.min?'<span class="badge low">부족</span>':'<span class="badge ok">정상</span>';return`<tr><td>${name}</td><td style="font-weight:500;">${p.qty}</td><td style="color:#6b7280;">${p.min}</td><td>${status}</td><td><button class="warning" onclick="openEditPartModal('${name.replace(/'/g,"\\'")}')">수정</button></td></tr>`}).join('')}
window.renderInventory=renderInventory

// ── 분석 ─────────────────────────────────────────────
function parseDate(t){const p=t.split(/[.\s:/년월일]+/).filter(Boolean);if(p.length>=3)return{y:parseInt(p[0]),m:parseInt(p[1]),d:parseInt(p[2])};return null}
function parseDate2(t){const dt=parseDate(t);if(!dt)return null;return new Date(dt.y,dt.m-1,dt.d)}
function renderAnalysis(){renderPrediction();renderProductAnalysis();renderMonthlyChart();renderDriverReport()}

window.renderPrediction=function(){const days=parseInt(document.getElementById('predictDays').value)||30,now=new Date(),cutoff=new Date(now.getTime()-days*86400000),pu={};S.history.forEach(h=>{const dt=parseDate2(h.time);if(!dt||dt<cutoff||!S.products[h.prod])return;Object.entries(S.products[h.prod]).forEach(([part,n])=>{pu[part]=(pu[part]||0)+n*h.qty})});const res=[];Object.entries(S.parts).forEach(([name,p])=>{const used=pu[name]||0;if(used===0){res.push({name,stock:p.qty,daysLeft:Infinity,dailyRate:0});return}const dr=used/days;res.push({name,stock:p.qty,daysLeft:Math.floor(p.qty/dr),dailyRate:dr.toFixed(2)})});res.sort((a,b)=>a.daysLeft-b.daysLeft);const el=document.getElementById('predictionList'),finite=res.filter(r=>r.daysLeft!==Infinity),infinite=res.filter(r=>r.daysLeft===Infinity);let html='';if(!finite.length){html=`<div style="font-size:13px;color:#6b7280;">최근 ${days}일간 출고 이력이 없습니다.</div>`}else{finite.forEach(r=>{const cls=r.daysLeft<=7?'danger':r.daysLeft<=30?'warn':'ok';html+=`<div class="predict-card"><div class="predict-days ${cls}">${r.daysLeft<=0?'0':r.daysLeft<=999?r.daysLeft:'∞'}</div><div class="predict-info"><div class="predict-name">${r.name}</div><div class="predict-detail">현재 재고 ${r.stock}개 · 일평균 ${r.dailyRate}개 · ${r.daysLeft<=0?'소진됨':r.daysLeft+'일 후 소진'}</div></div></div>`})}if(infinite.length)html+=`<div style="font-size:13px;color:#6b7280;margin-top:8px;">미사용 부품 ${infinite.length}종: ${infinite.map(r=>r.name).join(', ')}</div>`;el.innerHTML=html}

window.renderProductAnalysis=function(){const p=parseInt(document.getElementById('productAnalysisPeriod').value)||0,now=new Date(),cutoff=p?new Date(now.getTime()-p*86400000):null,filtered=cutoff?S.history.filter(h=>{const dt=parseDate2(h.time);return dt&&dt>=cutoff}):S.history,pMap={};filtered.forEach(h=>{pMap[h.prod]=(pMap[h.prod]||0)+h.qty});Object.keys(S.products).forEach(p=>{if(!pMap[p])pMap[p]=0});const arr=Object.entries(pMap).sort((a,b)=>b[1]-a[1]);if(!arr.length){document.getElementById('productAnalysis').innerHTML='<div class="empty-state">데이터 없음</div>';return}const max=arr[0][1]||1;let html='<div style="margin-bottom:16px;">';arr.forEach(([name,qty],i)=>{const isHot=i<3&&qty>0,isCold=qty===0,color=isHot?'#E74C3C':isCold?'#AEB6BF':'#378ADD';html+=`<div class="bar-wrap"><span class="bar-label" style="min-width:150px;">${name}${isHot?' 🔥':isCold?' 🧊':''}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(qty/max*100)}%;background:${color};"></div></div><span class="bar-val">${qty}세트</span></div>`});html+='</div>';const hot=arr.slice(0,3).filter(h=>h[1]>0),cold=arr.filter(a=>a[1]===0);if(hot.length)html+=`<div style="margin-bottom:8px;"><span style="font-size:13px;font-weight:500;">🔥 인기: </span><span style="font-size:13px;color:#6b7280;">${hot.map(([n,q])=>n+' ('+q+'세트)').join(' · ')}</span></div>`;if(cold.length)html+=`<div><span style="font-size:13px;font-weight:500;">🧊 미출고: </span><span style="font-size:13px;color:#6b7280;">${cold.map(([n])=>n).join(', ')}</span></div>`;document.getElementById('productAnalysis').innerHTML=html}

function initYearSel(){const sel=document.getElementById('monthlyChartYear'),years=[...new Set(S.history.map(h=>{const dt=parseDate(h.time);return dt?dt.y:null}).filter(Boolean))].sort((a,b)=>b-a);if(!years.length)years.push(new Date().getFullYear());const cur=sel.value||String(years[0]);sel.innerHTML=years.map(y=>`<option value="${y}"${String(y)===cur?' selected':''}>${y}년</option>`).join('')}

window.renderMonthlyChart=function(){const year=parseInt(document.getElementById('monthlyChartYear').value)||new Date().getFullYear(),monthly=new Array(12).fill(0);S.history.forEach(h=>{const dt=parseDate(h.time);if(!dt||dt.y!==year)return;monthly[dt.m-1]+=h.qty});const canvas=document.getElementById('monthlyCanvas'),W=canvas.parentElement.offsetWidth||600;canvas.width=W;canvas.height=200;const ctx=canvas.getContext('2d'),pad={t:20,r:20,b:40,l:50},cw=W-pad.l-pad.r,ch=200-pad.t-pad.b,max=Math.max(...monthly,1),barW=cw/12*0.6,gap=cw/12;ctx.clearRect(0,0,W,200);for(let i=0;i<=5;i++){const y=pad.t+ch-ch*(i/5);ctx.strokeStyle='rgba(128,128,128,0.15)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+cw,y);ctx.stroke();ctx.fillStyle='rgba(128,128,128,0.7)';ctx.font='11px sans-serif';ctx.textAlign='right';ctx.fillText(Math.round(max*i/5),pad.l-6,y+4)}monthly.forEach((v,i)=>{const x=pad.l+i*gap+gap/2-barW/2,h2=v===0?0:Math.max(4,ch*(v/max)),y=pad.t+ch-h2,grad=ctx.createLinearGradient(0,y,0,y+h2);grad.addColorStop(0,'#378ADD');grad.addColorStop(1,'#1A5FA8');ctx.fillStyle=grad;if(ctx.roundRect)ctx.roundRect(x,y,barW,h2,3);else ctx.rect(x,y,barW,h2);ctx.fill();if(v>0){ctx.fillStyle='#111827';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText(v,x+barW/2,y-5)}ctx.fillStyle='rgba(128,128,128,0.8)';ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillText((i+1)+'월',x+barW/2,pad.t+ch+18)})}

window.renderDriverReport=function(){const p=parseInt(document.getElementById('reportPeriod').value)||0,now=new Date(),cutoff=p?new Date(now.getTime()-p*86400000):null,filtered=cutoff?S.history.filter(h=>{const dt=parseDate2(h.time);return dt&&dt>=cutoff}):S.history,allDrivers=[...new Set([...S.drivers,...filtered.map(h=>h.driver)])].sort();if(!allDrivers.length){document.getElementById('driverReport').innerHTML='<div class="empty-state">기사 데이터가 없습니다.</div>';return}const dStats={};allDrivers.forEach(d=>{dStats[d]={total:0,days:new Set(),products:{}}});filtered.forEach(h=>{if(!dStats[h.driver])dStats[h.driver]={total:0,days:new Set(),products:{}};dStats[h.driver].total+=h.qty;const dt=parseDate(h.time);if(dt)dStats[h.driver].days.add(`${dt.y}-${dt.m}-${dt.d}`);dStats[h.driver].products[h.prod]=(dStats[h.driver].products[h.prod]||0)+h.qty});const arr=Object.entries(dStats).sort((a,b)=>b[1].total-a[1].total),maxTotal=arr.length?arr[0][1].total:1,rc=['🥇','🥈','🥉'];let html='';arr.forEach(([name,d],i)=>{const ad=d.days.size,avg=ad?Math.round(d.total/ad*10)/10:0,top=Object.entries(d.products).sort((a,b)=>b[1]-a[1])[0],pct=Math.round(d.total/maxTotal*100);html+=`<div class="report-driver"><div class="report-driver-header"><span class="report-driver-name">${rc[i]||'👷'} ${name} 기사</span><span class="tag-sm">${d.total}세트</span></div><div class="report-grid"><div class="report-metric"><div class="report-metric-val" style="color:#1d4ed8;">${d.total}</div><div class="report-metric-label">총 출고 세트</div></div><div class="report-metric"><div class="report-metric-val">${ad}</div><div class="report-metric-label">출고 활동일</div></div><div class="report-metric"><div class="report-metric-val">${avg}</div><div class="report-metric-label">일평균 세트</div></div></div><div class="bar-wrap" style="margin-bottom:6px;"><div class="bar-track" style="height:10px;"><div class="bar-fill" style="width:${pct}%;background:#378ADD;height:10px;"></div></div><span class="bar-val">${pct}%</span></div>${top?`<div style="font-size:13px;color:#6b7280;">주력 제품: <strong>${top[0]}</strong> (${top[1]}세트)</div>`:''}</div>`});document.getElementById('driverReport').innerHTML=html}

// ── 통계 ─────────────────────────────────────────────
function dateKey(t,mode){const dt=parseDate(t);if(!dt)return t;if(mode==='년별')return String(dt.y);if(mode==='월별')return dt.y+'-'+String(dt.m).padStart(2,'0');return dt.y+'-'+String(dt.m).padStart(2,'0')+'-'+String(dt.d).padStart(2,'0')}
function currentKey(period,offset){const now=new Date();if(period==='일별'){const d=new Date(now);d.setDate(d.getDate()+offset);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}if(period==='월별'){const d=new Date(now.getFullYear(),now.getMonth()+offset,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}return String(now.getFullYear()+offset)}
function displayLabel(key,period){if(period==='년별')return key+'년';if(period==='월별'){const[y,m]=key.split('-');return y+'년 '+parseInt(m)+'월'}const[y,m,d]=key.split('-');return y+'년 '+parseInt(m)+'월 '+parseInt(d)+'일'}
window.setGlobalPeriod=function(p){gPeriod=p;gOffset=0;document.querySelectorAll('[id^="gp-"]').forEach(b=>b.classList.remove('active'));document.getElementById('gp-'+p).classList.add('active');renderGlobal()}
window.navGlobal=(dir)=>{gOffset+=dir;renderGlobal()}
function renderGlobal(){const key=currentKey(gPeriod,gOffset);document.getElementById('gNavLabel').textContent=displayLabel(key,gPeriod);const filtered=S.history.filter(h=>dateKey(h.time,gPeriod)===key),totalSets=filtered.reduce((s,h)=>s+h.qty,0);document.getElementById('gSummary').innerHTML=mc('총 출고',totalSets+'세트')+mc('출고 기사',new Set(filtered.map(h=>h.driver)).size+'명')+mc('출고 제품',new Set(filtered.map(h=>h.prod)).size+'종');const dMap={};filtered.forEach(h=>{if(!dMap[h.driver])dMap[h.driver]={total:0,products:{}};dMap[h.driver].total+=h.qty;dMap[h.driver].products[h.prod]=(dMap[h.driver].products[h.prod]||0)+h.qty});const dArr=Object.entries(dMap).sort((a,b)=>b[1].total-a[1].total),maxD=dArr.length?dArr[0][1].total:1,rc2=['gold','silver','bronze'];if(!dArr.length){['gDriverBars','gDriverTable','gProductBars'].forEach(id=>document.getElementById(id).innerHTML='<div class="empty-state">해당 기간 출고 내역이 없습니다.</div>');return}document.getElementById('gDriverBars').innerHTML=dArr.map(([name,d],i)=>`<div class="bar-wrap"><span class="rank-num ${rc2[i]||''}">${i+1}</span><span class="bar-label">${name}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(d.total/maxD*100)}%;background:#378ADD;"></div></div><span class="bar-val">${d.total}세트</span></div>`).join('');let tbl='<table><thead><tr><th>기사</th><th>총 출고</th><th>제품별 내역</th></tr></thead><tbody>';dArr.forEach(([name,d])=>{tbl+=`<tr><td style="font-weight:500;">${name}</td><td style="font-weight:500;color:#1d4ed8;">${d.total}세트</td><td style="font-size:13px;color:#6b7280;">${Object.entries(d.products).sort((a,b)=>b[1]-a[1]).map(([p,q])=>p+' '+q+'세트').join(', ')}</td></tr>`});document.getElementById('gDriverTable').innerHTML=tbl+'</tbody></table>';const pMap={};filtered.forEach(h=>{pMap[h.prod]=(pMap[h.prod]||0)+h.qty});const pArr=Object.entries(pMap).sort((a,b)=>b[1]-a[1]),maxP=pArr.length?pArr[0][1]:1;document.getElementById('gProductBars').innerHTML=pArr.map(([name,qty])=>`<div class="bar-wrap"><span class="bar-label" style="min-width:140px;">${name}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(qty/maxP*100)}%;background:#10b981;"></div></div><span class="bar-val">${qty}세트</span></div>`).join('')}

function renderDriverStatPage(){const wrap=document.getElementById('driverTabBtns'),all=[...new Set([...S.drivers,...S.history.map(h=>h.driver)])].sort();if(!all.length){wrap.innerHTML='<div class="empty-state" style="padding:.5rem 0;">등록된 기사가 없습니다.</div>';document.getElementById('driverStatContent').innerHTML='';return}if(!selectedDriver||!all.includes(selectedDriver))selectedDriver=all[0];wrap.innerHTML=all.map(d=>`<button class="driver-tab${d===selectedDriver?' active':''}" onclick="selectDriver('${d.replace(/'/g,"\\'")}'">${d}</button>`).join('');renderDriverStat()}
window.selectDriver=(name)=>{selectedDriver=name;dOffset=0;renderDriverStatPage()}
window.setDriverPeriod=(p)=>{dPeriod=p;dOffset=0;document.querySelectorAll('[id^="dp-"]').forEach(b=>b.classList.remove('active'));document.getElementById('dp-'+p).classList.add('active');renderDriverStat()}
window.navDriver=(dir)=>{dOffset+=dir;renderDriverStat()}
function renderDriverStat(){const key=currentKey(dPeriod,dOffset),dH=S.history.filter(h=>h.driver===selectedDriver),filtered=dH.filter(h=>dateKey(h.time,dPeriod)===key),totalAll=dH.reduce((s,h)=>s+h.qty,0),totalPeriod=filtered.reduce((s,h)=>s+h.qty,0),pMap={};filtered.forEach(h=>{pMap[h.prod]=(pMap[h.prod]||0)+h.qty});let html=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:1rem;flex-wrap:wrap;"><button class="pbtn${dPeriod==='일별'?' active':''}" id="dp-일별" onclick="setDriverPeriod('일별')">일별</button><button class="pbtn${dPeriod==='월별'?' active':''}" id="dp-월별" onclick="setDriverPeriod('월별')">월별</button><button class="pbtn${dPeriod==='년별'?' active':''}" id="dp-년별" onclick="setDriverPeriod('년별')">년별</button><div class="nav-row" style="margin-left:auto;"><button class="secondary" onclick="navDriver(-1)">◀</button><span class="nav-label">${displayLabel(key,dPeriod)}</span><button class="secondary" onclick="navDriver(1)">▶</button></div></div>`;html+=`<div class="grid3">${mc('기간 출고',totalPeriod+'세트')}${mc('누적 출고',totalAll+'세트')}${mc('취급 제품',Object.keys(pMap).length+'종')}</div>`;if(!filtered.length){html+='<div class="card"><div class="empty-state">해당 기간 출고 내역이 없습니다.</div></div>';document.getElementById('driverStatContent').innerHTML=html;return}const pArr=Object.entries(pMap).sort((a,b)=>b[1]-a[1]),maxP=pArr.length?pArr[0][1]:1;html+=`<div class="card"><h3>제품별 출고량</h3>${pArr.map(([name,qty])=>`<div class="bar-wrap"><span class="bar-label" style="min-width:150px;">${name}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(qty/maxP*100)}%;background:#534AB7;"></div></div><span class="bar-val">${qty}세트</span></div>`).join('')}</div>`;html+=`<div class="card"><h3>출고 내역</h3>${filtered.map(h=>`<div class="timeline-row"><span class="timeline-date">${h.time.split(' ')[0]}</span><span class="tag-sm">${h.prod} ${h.qty}세트</span>${h.customer?`<span style="font-size:13px;color:#6b7280;">${h.customer}</span>`:''}</div>`).join('')}</div>`;document.getElementById('driverStatContent').innerHTML=html}

function renderHistory(){const q=(document.getElementById('histSearch').value||'').toLowerCase(),el=document.getElementById('historyList'),filtered=S.history.filter(h=>!q||h.driver.toLowerCase().includes(q)||h.prod.toLowerCase().includes(q)||(h.customer||'').toLowerCase().includes(q));if(!filtered.length){el.innerHTML='<div class="empty-state">출고 이력이 없습니다.</div>';return}el.innerHTML=filtered.slice(0,100).map(h=>`<div class="history-item"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;"><span style="font-weight:500;">${h.driver} 기사</span><span class="tag-sm">${h.prod} ${h.qty}세트</span>${h.customer?`<span class="tag-sm">${h.customer}</span>`:''}<span style="margin-left:auto;font-size:12px;color:#6b7280;">${h.time}</span></div>${h.addr?`<div style="font-size:13px;color:#6b7280;">배송: ${h.addr}</div>`:''} ${h.note&&h.note!=='묶음출고'?`<div style="font-size:13px;color:#6b7280;">메모: ${h.note}</div>`:h.note==='묶음출고'?`<div style="font-size:12px;color:#1d4ed8;">🛒 묶음출고</div>`:''}<div style="font-size:12px;color:#9ca3af;margin-top:2px;">${h.parts}</div></div>`).join('')}
window.renderHistory=renderHistory

// ── 부품 관리 ────────────────────────────────────────
function renderPartMgmt(){const q=(document.getElementById('searchPartMgmt').value||'').toLowerCase(),tbody=document.getElementById('partMgmtBody'),entries=Object.entries(S.parts).filter(([n])=>n.toLowerCase().includes(q));if(!entries.length){tbody.innerHTML='<tr><td colspan="5" class="empty-state">검색 결과 없음</td></tr>';return}tbody.innerHTML=entries.map(([name,p])=>{const status=p.qty===0?'<span class="badge empty">소진</span>':p.qty<=p.min?'<span class="badge low">부족</span>':'<span class="badge ok">정상</span>';return`<tr><td style="font-weight:500;">${name}</td><td>${p.qty}</td><td style="color:#6b7280;">${p.min}</td><td>${status}</td><td><div style="display:flex;gap:6px;"><button class="warning" onclick="openEditPartModal('${name.replace(/'/g,"\\'")}')">수정</button><button class="danger" onclick="deletePartConfirm('${name.replace(/'/g,"\\'")}')">삭제</button></div></td></tr>`}).join('')}

window.openAddPartModal=function(){document.getElementById('modalContainer').innerHTML=`<div class="modal-bg" onclick="closeMBg(event)"><div class="modal"><h4>➕ 부품 추가</h4><div class="modal-field"><label class="modal-label">부품명 *</label><input type="text" id="mp_name" placeholder="예: 서랍레일(좌)"></div><div class="modal-grid"><div><label class="modal-label">현재 재고</label><input type="number" id="mp_qty" value="0" min="0"></div><div><label class="modal-label">최소 재고</label><input type="number" id="mp_min" value="5" min="0"></div></div><div class="modal-actions"><button class="secondary" onclick="closeM()">취소</button><button class="primary" onclick="confirmAddPart()">추가</button></div></div></div>`;setTimeout(()=>document.getElementById('mp_name').focus(),50)}
window.confirmAddPart=async function(){const name=document.getElementById('mp_name').value.trim(),qty=parseInt(document.getElementById('mp_qty').value)||0,min=parseInt(document.getElementById('mp_min').value)||0;if(!name){showToast('부품명을 입력하세요.','warn');return}if(S.parts[name]){showToast('이미 존재하는 부품명입니다.','warn');return}S.parts[name]={qty,min};await save();closeM();renderPartMgmt();renderInventory();renderSummary();popInPartSel();renderPartSlots();renderAlerts();showToast(name+' 부품 추가 완료')}
window.openEditPartModal=function(name){const p=S.parts[name];document.getElementById('modalContainer').innerHTML=`<div class="modal-bg" onclick="closeMBg(event)"><div class="modal"><h4>✏️ 부품 수정</h4><div class="modal-field"><label class="modal-label">부품명 변경</label><input type="text" id="mp_newname" value="${name}"></div><div class="modal-grid"><div><label class="modal-label">현재 재고</label><input type="number" id="mp_qty" value="${p.qty}" min="0"></div><div><label class="modal-label">최소 재고</label><input type="number" id="mp_min" value="${p.min}" min="0"></div></div><div class="modal-actions"><button class="secondary" onclick="closeM()">취소</button><button class="primary" onclick="confirmEditPart('${name.replace(/'/g,"\\'")}')">저장</button></div></div></div>`;setTimeout(()=>document.getElementById('mp_newname').focus(),50)}
window.confirmEditPart=async function(oldName){const newName=document.getElementById('mp_newname').value.trim(),qty=parseInt(document.getElementById('mp_qty').value)||0,min=parseInt(document.getElementById('mp_min').value)||0;if(!newName){showToast('부품명을 입력하세요.','warn');return}if(newName!==oldName&&S.parts[newName]){showToast('이미 존재하는 부품명입니다.','warn');return}if(newName!==oldName){delete S.parts[oldName];Object.keys(S.products).forEach(prod=>{if(S.products[prod][oldName]!==undefined){S.products[prod][newName]=S.products[prod][oldName];delete S.products[prod][oldName]}})}S.parts[newName]={qty,min};await save();closeM();renderPartMgmt();renderInventory();renderSummary();popInPartSel();renderPartSlots();renderAlerts();showToast(newName+' 수정 완료')}
window.deletePartConfirm=async function(name){const usedIn=Object.entries(S.products).filter(([,parts])=>parts[name]).map(([n])=>n);let msg=`"${name}" 부품을 삭제할까요?`;if(usedIn.length)msg+=`\n\n⚠️ 아래 제품에서 사용 중입니다:\n${usedIn.join(', ')}\n\n제품 구성에서도 자동 제거됩니다.`;if(!confirm(msg))return;delete S.parts[name];Object.keys(S.products).forEach(prod=>{delete S.products[prod][name]});await save();renderPartMgmt();renderInventory();renderSummary();popInPartSel();renderPartSlots();renderAlerts();showToast(name+' 삭제됨')}
window.closeM=()=>document.getElementById('modalContainer').innerHTML=''
window.closeMBg=(e)=>{if(e.target.classList.contains('modal-bg'))window.closeM()}

// ── 옵션 관리 ────────────────────────────────────────
function renderOptMgmt(){
  renderOptTags('opt-cat','categories')
  renderOptTags('opt-pyun','pyunbaek')
  renderOptTags('opt-size','sizes')
  renderOptTags('opt-color','colors')
  renderOptTags('opt-matt','mattTypes')
  renderOptTags('opt-mattsize','mattSizes')
  renderOptAllModels()   // ★ 드롭다운 대신 카테고리별 전체 표시
  renderOptMattModels()
  populateCatSel()
  populateBatchCatSel()
}

// 카테고리별 모델을 한눈에 펼쳐서 표시
function renderOptAllModels(){
  const wrap=document.getElementById('opt-model-all')
  if(!wrap)return
  if(!CFG.categories.length){wrap.innerHTML='<div style="font-size:13px;color:#6b7280;">카테고리를 먼저 추가하세요</div>';return}
  wrap.innerHTML=CFG.categories.map(cat=>{
    if(!CFG.models[cat])CFG.models[cat]=[]
    const models=CFG.models[cat]
    const modelRows=models.length
      ? models.map((m,i)=>`
          <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 10px;background:#fff;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:4px;font-size:13px;">
            <span>📦 ${m}</span>
            <button class="danger small" onclick="removeOptModel('${cat.replace(/'/g,"\\'")}',${i})">삭제</button>
          </div>`)
        .join('')
      : '<div style="font-size:13px;color:#9ca3af;padding:4px 0;">등록된 모델 없음</div>'

    return`
    <div style="margin-bottom:14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;">
      <div style="font-size:13px;font-weight:600;color:#374151;margin-bottom:8px;">
        📂 ${cat} <span style="font-size:12px;font-weight:400;color:#9ca3af;">(${models.length}개)</span>
      </div>
      ${modelRows}
      <div style="display:flex;gap:8px;margin-top:8px;">
        <input type="text" id="inp-model-${cat.replace(/\s/g,'_')}" placeholder="${cat} 모델명 입력" style="flex:1;font-size:13px;padding:6px 10px;">
        <button class="secondary small" onclick="addOptModelForCat('${cat.replace(/'/g,"\\'")}')">추가</button>
      </div>
    </div>`
  }).join('')
}

window.addOptModelForCat=async function(cat){
  const inputId='inp-model-'+cat.replace(/\s/g,'_')
  const v=document.getElementById(inputId).value.trim()
  if(!v)return
  if(!CFG.models[cat])CFG.models[cat]=[]
  if(CFG.models[cat].includes(v)){showToast('이미 존재합니다.','warn');return}
  CFG.models[cat].push(v)
  document.getElementById(inputId).value=''
  await save()
  renderOptAllModels()
  renderOptMattModels()
  populateCatSel()
  populateBatchCatSel()
  showToast(v+' 추가됨')
}

function renderOptTags(id,key){const w=document.getElementById(id);if(!CFG[key]||!CFG[key].length){w.innerHTML='<span style="font-size:13px;color:#6b7280;">항목 없음</span>';return}w.innerHTML=CFG[key].map((v,i)=>`<span class="opt-tag">${v}<button onclick="removeOptItem('${key}',${i})">×</button></span>`).join('')}
window.addOptItem=async function(key,inputId){const v=document.getElementById(inputId).value.trim();if(!v)return;if(CFG[key].includes(v)){showToast('이미 존재합니다.','warn');return}CFG[key].push(v);document.getElementById(inputId).value='';await save();renderOptMgmt();showToast(v+' 추가됨')}
window.removeOptItem=async function(key,i){CFG[key].splice(i,1);await save();renderOptMgmt()}
window.removeOptModel=async function(cat,i){CFG.models[cat].splice(i,1);await save();renderOptAllModels();renderOptMattModels()}
function renderOptMattModels(){const wrap=document.getElementById('opt-matt-models'),allModels=[];Object.entries(CFG.models).forEach(([cat,ms])=>ms.forEach(m=>allModels.push({cat,m})));CFG.pyunbaek.forEach(p=>allModels.push({cat:'침대(편백재질)',m:p}));if(!allModels.length){wrap.innerHTML='<div style="font-size:13px;color:#6b7280;">모델을 먼저 등록하세요</div>';return}wrap.innerHTML=allModels.map(({cat,m})=>{const uid='mc_'+m.replace(/[\s()\/]/g,'_');const checked=CFG.mattModels.includes(m);return`<div class="check-row"><input type="checkbox" id="${uid}" ${checked?'checked':''} onchange="toggleMattModel('${m.replace(/'/g,"\\'")}',this.checked)"><label for="${uid}">[${cat}] ${m}</label></div>`}).join('')}
window.toggleMattModel=async function(model,checked){if(checked){if(!CFG.mattModels.includes(model))CFG.mattModels.push(model)}else{CFG.mattModels=CFG.mattModels.filter(m=>m!==model)}await save()}

// ── 기사/제품 관리 ──────────────────────────────────
window.addDriver=async function(){const input=document.getElementById('newDriverName'),name=input.value.trim();if(!name){showToast('기사명을 입력하세요.','warn');return}if(S.drivers.includes(name)){showToast('이미 등록된 기사입니다.','warn');return}S.drivers.push(name);await save();input.value='';renderDriverChips();popDriverSel();popBatchDriverSel();showToast(name+' 기사 추가 완료')}
window.removeDriver=async function(name){if(!confirm(name+' 기사를 삭제할까요?'))return;S.drivers=S.drivers.filter(d=>d!==name);await save();renderDriverChips();popDriverSel();popBatchDriverSel();showToast(name+' 삭제됨')}
function renderDriverChips(){const wrap=document.getElementById('driverChips');if(!S.drivers.length){wrap.innerHTML='<div style="font-size:13px;color:#6b7280;padding:8px 0;">등록된 기사가 없습니다.</div>';return}wrap.innerHTML=S.drivers.slice().sort().map(d=>`<span class="driver-chip">${d}<button onclick="removeDriver('${d.replace(/'/g,"\\'")}')"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button></span>`).join('')}
function renderPartSlots(){
  const pn=Object.keys(S.parts).sort()
  const wrap=document.getElementById('prodPartsList')
  wrap.innerHTML=partSlots.map((s,i)=>`
    <div class="part-row">
      <select id="pslot_${i}" style="flex:1;font-size:13px;" onchange="partSlots[${i}].part=this.value">
        <option value="">-- 부품 선택 --</option>
        ${pn.map(p=>`<option value="${p}"${s.part===p?' selected':''}>${p}</option>`).join('')}
      </select>
      <input type="number" id="pslot_qty_${i}" min="1" value="${s.qty}" style="width:60px;"
        onchange="partSlots[${i}].qty=parseInt(this.value)||1">
      <button class="danger" onclick="removeSlot(${i})">X</button>
    </div>`).join('')
}
window.addPartSlot=function(){
  // ★ 현재 DOM에서 선택값 먼저 저장 후 추가
  syncPartSlots()
  partSlots.push({part:'',qty:1})
  renderPartSlots()
}
window.removeSlot=function(i){
  syncPartSlots()
  partSlots.splice(i,1)
  if(!partSlots.length)partSlots.push({part:'',qty:1})
  renderPartSlots()
}
// DOM → partSlots 동기화 (추가/삭제 전에 호출)
function syncPartSlots(){
  partSlots.forEach((s,i)=>{
    const sel=document.getElementById('pslot_'+i)
    const qty=document.getElementById('pslot_qty_'+i)
    if(sel)s.part=sel.value
    if(qty)s.qty=parseInt(qty.value)||1
  })
}
window.saveProduct=async function(){
  syncPartSlots()  // ★ 저장 전 DOM 값 동기화
  const name=document.getElementById('newProdName').value.trim()
  if(!name){showToast('제품명을 입력하세요.','warn');return}
  const c={};partSlots.forEach(s=>{if(s.part)c[s.part]=s.qty})
  if(!Object.keys(c).length){showToast('부품을 하나 이상 선택하세요.','warn');return}
  S.products[name]=c;await save()
  document.getElementById('newProdName').value='';partSlots=[{part:'',qty:1}];renderPartSlots();renderProdList()
  showToast(name+' 제품 저장 완료')
}
function renderProdList(){
  const tbody=document.getElementById('prodListBody'),entries=Object.entries(S.products).sort()
  if(!entries.length){tbody.innerHTML='<tr><td colspan="4" class="empty-state">등록된 제품 없음</td></tr>';return}
  tbody.innerHTML=entries.map(([name,parts])=>`
    <tr>
      <td style="font-size:13px;font-weight:500;">${name}</td>
      <td style="font-size:12px;color:#6b7280;">${Object.entries(parts).map(([p,n])=>p+(n>1?'×'+n:'')).join(', ')}</td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="warning" onclick="openEditProdModal('${name.replace(/'/g,"\\'")}')">수정</button>
          <button class="danger" onclick="deleteProd('${name.replace(/'/g,"\\'")}')">삭제</button>
        </div>
      </td>
    </tr>`).join('')
}

window.openEditProdModal=function(name){
  const parts=S.products[name]||{}
  const pn=Object.keys(S.parts).sort()
  // 현재 부품 구성을 editSlots로 변환
  const slots=Object.entries(parts).map(([p,n])=>({part:p,qty:n}))
  if(!slots.length)slots.push({part:'',qty:1})

  function slotsHtml(arr){
    return arr.map((s,i)=>`
      <div class="part-row" id="eslot_wrap_${i}">
        <select id="eslot_${i}" style="flex:1;font-size:13px;">
          <option value="">-- 부품 선택 --</option>
          ${pn.map(p=>`<option value="${p}"${s.part===p?' selected':''}>${p}</option>`).join('')}
        </select>
        <input type="number" id="eslot_qty_${i}" min="1" value="${s.qty}" style="width:60px;">
        <button class="danger" style="padding:5px 8px;font-size:12px;" onclick="removeESlot(${i})">X</button>
      </div>`).join('')
  }

  // eslots를 window에 저장
  window._editSlots=slots
  window._editProdName=name

  document.getElementById('modalContainer').innerHTML=`
  <div class="modal-bg" onclick="closeMBg(event)">
    <div class="modal" style="width:480px;max-width:95vw;">
      <h4>✏️ 제품 수정</h4>
      <div class="modal-field">
        <label class="modal-label">제품명</label>
        <input type="text" id="edit_prod_name" value="${name}" style="width:100%;">
      </div>
      <div class="modal-label" style="margin-bottom:6px;">부품 구성</div>
      <div id="eslots_wrap">${slotsHtml(slots)}</div>
      <button class="secondary" style="font-size:13px;margin-top:8px;margin-bottom:16px;" onclick="addESlot()">+ 부품 추가</button>
      <div class="modal-actions">
        <button class="secondary" onclick="closeM()">취소</button>
        <button class="primary" onclick="confirmEditProd('${name.replace(/'/g,"\\'")}')">저장</button>
      </div>
    </div>
  </div>`
}

window.addESlot=function(){
  // 현재 DOM 값 읽기
  syncESlots()
  window._editSlots.push({part:'',qty:1})
  reRenderESlots()
}

window.removeESlot=function(i){
  syncESlots()
  window._editSlots.splice(i,1)
  if(!window._editSlots.length)window._editSlots.push({part:'',qty:1})
  reRenderESlots()
}

function syncESlots(){
  window._editSlots.forEach((s,i)=>{
    const sel=document.getElementById('eslot_'+i)
    const qty=document.getElementById('eslot_qty_'+i)
    if(sel)s.part=sel.value
    if(qty)s.qty=parseInt(qty.value)||1
  })
}

function reRenderESlots(){
  const pn=Object.keys(S.parts).sort()
  const wrap=document.getElementById('eslots_wrap')
  if(!wrap)return
  wrap.innerHTML=window._editSlots.map((s,i)=>`
    <div class="part-row" id="eslot_wrap_${i}">
      <select id="eslot_${i}" style="flex:1;font-size:13px;">
        <option value="">-- 부품 선택 --</option>
        ${pn.map(p=>`<option value="${p}"${s.part===p?' selected':''}>${p}</option>`).join('')}
      </select>
      <input type="number" id="eslot_qty_${i}" min="1" value="${s.qty}" style="width:60px;">
      <button class="danger" style="padding:5px 8px;font-size:12px;" onclick="removeESlot(${i})">X</button>
    </div>`).join('')
}

window.confirmEditProd=async function(oldName){
  syncESlots()
  const newName=document.getElementById('edit_prod_name').value.trim()
  if(!newName){showToast('제품명을 입력하세요.','warn');return}
  const c={}
  window._editSlots.forEach(s=>{if(s.part)c[s.part]=s.qty})
  if(!Object.keys(c).length){showToast('부품을 하나 이상 선택하세요.','warn');return}
  // 이름이 바뀌면 기존 키 삭제
  if(newName!==oldName){delete S.products[oldName]}
  S.products[newName]=c
  await save()
  closeM()
  renderProdList()
  showToast(newName+' 수정 완료')
}

window.deleteProd=async function(name){if(!confirm(name+' 제품을 삭제할까요?'))return;delete S.products[name];await save();renderProdList();showToast(name+' 삭제됨')}

// ── 엑셀 ─────────────────────────────────────────────
window.exportExcel=function(){
  const wb=XLSX.utils.book_new()
  const od=[['날짜','기사','제품','수량(세트)','고객명','배송주소','메모','부품내역']]
  S.history.forEach(h=>od.push([h.time,h.driver,h.prod,h.qty,h.customer||'',h.addr||'',h.note||'',h.parts]))
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(od),'출고이력')
  const id2=[['날짜','부품명','수량','공급처','메모','구분']]
  S.inHistory.forEach(h=>id2.push([h.time,h.part,h.qty,h.supplier||'',h.note||'',h.type||'']))
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(id2),'입고이력')
  const sd=[['부품명','현재재고','최소재고','상태']]
  Object.entries(S.parts).forEach(([n,p])=>sd.push([n,p.qty,p.min,p.qty===0?'소진':p.qty<=p.min?'부족':'정상']))
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(sd),'재고현황')
  const dMap={};S.history.forEach(h=>{if(!dMap[h.driver])dMap[h.driver]=0;dMap[h.driver]+=h.qty})
  const stD=[['기사명','총 출고(세트)']];Object.entries(dMap).sort((a,b)=>b[1]-a[1]).forEach(([n,q])=>stD.push([n,q]))
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(stD),'기사별통계')
  XLSX.writeFile(wb,'보루네오_재고관리_'+new Date().toLocaleDateString('ko-KR').replace(/\.\s*/g,'-').replace(/-$/,'')+'.xlsx')
  showToast('엑셀 파일 다운로드 완료')
}

// ── 인쇄 ─────────────────────────────────────────────
window.openPrintModal=function(){
  if(!cart.length){showToast('담은 제품이 없습니다.','warn');return}
  const driver=document.getElementById('batchDriver').value
  const now=new Date().toLocaleString('ko-KR')
  const totalSets=cart.reduce((s,i)=>s+i.qty,0)

  // 부품 합산
  const total={}
  cart.forEach(item=>{
    if(!item.parts)return
    Object.entries(item.parts).forEach(([part,n])=>{
      if(!total[part])total[part]={need:0,usedBy:[]}
      total[part].need+=n*item.qty
      if(!total[part].usedBy.includes(item.name))total[part].usedBy.push(item.name)
    })
  })

  // 재고 부족 경고
  const shortParts=Object.entries(total).filter(([p,d])=>(S.parts[p]?S.parts[p].qty:0)<d.need)

  let html=`
  <div class="doc-header">
    <div class="doc-title">보루네오 가구 — 창고 픽업 목록</div>
    <div class="doc-sub">묶음 출고 부품 합산표</div>
  </div>
  <div class="doc-meta">
    <span>📅 출력일시: ${now}</span>
    <span>👷 담당기사: ${driver||'미지정'}</span>
    <span>📦 총 ${cart.length}건 / ${totalSets}세트</span>
  </div>`

  if(shortParts.length){
    html+=`<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#991b1b;font-weight:500;">🚨 재고 부족 부품 ${shortParts.length}종: ${shortParts.map(([p])=>p).join(', ')}</div>`
  }

  // ① 창고 픽업 목록 (합산)
  html+=`<div class="section-title">① 창고 픽업 목록 (부품 합산)</div>
  <table>
    <thead>
      <tr>
        <th style="width:28px;">✓</th>
        <th>부품명</th>
        <th style="text-align:center;width:80px;">필요 수량</th>
        <th style="text-align:center;width:70px;">현재 재고</th>
        <th style="text-align:center;width:60px;">상태</th>
        <th style="width:80px;">구분</th>
      </tr>
    </thead>
    <tbody>`

  Object.entries(total).sort((a,b)=>a[0].localeCompare(b[0],'ko')).forEach(([part,d])=>{
    const stock=S.parts[part]?S.parts[part].qty:0
    const isShort=stock<d.need, isEmpty=stock===0, isShared=d.usedBy.length>1
    const rowCls=isEmpty?'danger-row':isShort?'warning-row':''
    const stockCls=isEmpty?'stock-empty':isShort?'stock-low':'stock-ok'
    const status=isEmpty?'⚠ 소진':isShort?'⚠ 부족':'✓ OK'
    html+=`<tr class="${rowCls}">
      <td style="text-align:center;"><span class="check-box"></span></td>
      <td><strong>${part}</strong></td>
      <td style="text-align:center;"><span class="need-qty">${d.need}개</span></td>
      <td style="text-align:center;" class="${stockCls}">${stock}개</td>
      <td style="text-align:center;" class="${stockCls}">${status}</td>
      <td style="font-size:12px;">${isShared?`공통(${d.usedBy.length}개)`:' 단독'}</td>
    </tr>`
  })
  html+=`</tbody></table>`

  // ② 제품별 배송 목록
  html+=`<div class="section-title">② 제품별 배송 목록</div>`
  cart.forEach((item,idx)=>{
    if(!item.parts)return
    const partLines=Object.entries(item.parts).map(([p,n])=>`${p} × ${n*item.qty}개`).join(', ')
    html+=`<div class="prod-block">
      <div class="prod-block-title">${idx+1}. ${item.name} × ${item.qty}세트${item.customer?' — '+item.customer:''}</div>
      <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">${item.addr||'배송지 미입력'}</div>
      <div style="font-size:12px;color:#374151;">${partLines}</div>
    </div>`
  })

  // ③ 서명란
  html+=`
  <div class="sig-row">
    <div class="sig-box">창고 담당자 확인</div>
    <div class="sig-box">기사 수령 확인 (${driver||'　　　'})</div>
    <div class="sig-box">관리자 승인</div>
  </div>`

  document.getElementById('printDoc').innerHTML=html
  document.getElementById('printModalContainer').style.display='block'
}

// ── 유틸 ─────────────────────────────────────────────
function mc(label,val,color){return`<div class="metric"><div class="metric-label">${label}</div><div class="metric-val"${color?` style="color:${color}"`:''}>${val}</div></div>`}
let toastTimer
function showToast(msg,type){clearTimeout(toastTimer);let t=document.getElementById('_toast');if(!t){t=document.createElement('div');t.id='_toast';t.style.cssText='position:fixed;bottom:20px;right:20px;padding:10px 18px;border-radius:8px;font-size:14px;z-index:300;display:none;';document.body.appendChild(t)}if(type==='warn'){t.style.background='#fef3c7';t.style.color='#92400e';t.style.border='1px solid #f59e0b'}else{t.style.background='#d1fae5';t.style.color='#065f46';t.style.border='1px solid #10b981'}t.textContent=msg;t.style.display='block';toastTimer=setTimeout(()=>t.style.display='none',2500)}

window.addEventListener('resize',()=>{if(document.getElementById('tab-분석').classList.contains('active'))renderMonthlyChart()})
setGlobalPeriod('일별')
load()
