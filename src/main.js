import { db } from './firebase.js'
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import * as XLSX from 'xlsx'

// ══════════════════════════════════════════════════════
// 상태
// ══════════════════════════════════════════════════════
const DOC_REF = doc(db, 'borneo', 'data')
let S = { parts:{}, products:{}, history:[], inHistory:[], drivers:[], cats:{} }
// cats 구조: { 카테고리명: { steps: [{name, type, vals}] } }
// type: 'select' | 'memo'

const DEFAULT_CATS = {
  '침대': { steps: [
    { name:'재질', type:'select', vals:['일반(원목)','편백','일반(MDF)'] },
    { name:'모델', type:'select', vals:['보르네오 A형','보르네오 B형','루체 1000'] },
    { name:'사이즈', type:'select', vals:['싱글(SS)','슈퍼싱글','더블(D)','퀸(Q)','킹(K)'] },
    { name:'색상', type:'select', vals:['화이트','월넛','오크','블랙'] },
  ]},
  '소파': { steps: [
    { name:'모델', type:'select', vals:['패밀리 3인','패밀리 2인'] },
    { name:'색상', type:'select', vals:['그레이','아이보리'] },
  ]},
  '슈랑크': { steps: [
    { name:'모델', type:'select', vals:['코너형','1단형','2단형'] },
    { name:'색상', type:'select', vals:['화이트','블랙','월넛'] },
  ]},
  '브로드': { steps: [
    { name:'모델', type:'select', vals:['준비된것'] },
    { name:'메모', type:'memo', vals:[] },
  ]},
  '기타': { steps: [
    { name:'품목', type:'select', vals:[] },
    { name:'메모', type:'memo', vals:[] },
  ]},
}

const DP = {'프레임(대)':{qty:80,min:10},'프레임(소)':{qty:75,min:10},'사이드레일 L':{qty:60,min:8},'사이드레일 R':{qty:60,min:8},'헤드보드':{qty:45,min:5},'풋보드':{qty:40,min:5},'슬랫(12개입)':{qty:50,min:6},'중간지지대':{qty:55,min:8},'볼트세트A':{qty:120,min:20},'볼트세트B':{qty:110,min:20},'서랍(좌)':{qty:35,min:5},'서랍(우)':{qty:35,min:5},'다리(4개입)':{qty:48,min:6},'매트지지판':{qty:30,min:4},'조립설명서':{qty:200,min:30}}

let gPeriod='일별', gOffset=0, selectedDriver=null, dPeriod='일별', dOffset=0
let bulkRows=[{part:'',qty:1}]
let cart=[], batchDetailOpen=false
let activeMgmtCat=''
let unsubscribe=null

// 출고 선택 상태
let shipSelVals = []  // [{stepName, val}]
let shipMemo = ''
let shipFinalProd = ''

// 묶음 출고 선택 상태
let batchSelVals = []
let batchMemo = ''
let batchFinalProd = ''

// ══════════════════════════════════════════════════════
// Firebase
// ══════════════════════════════════════════════════════
function setSS(s,msg){const dot=document.getElementById('syncDot'),txt=document.getElementById('syncText');dot.className='dot '+s;txt.textContent=msg;if(s==='live')document.getElementById('syncTime').textContent='마지막 동기화 '+new Date().toLocaleTimeString('ko-KR');}

async function load(){
  try{
    setSS('loading','데이터 불러오는 중...')
    const r = await getDoc(DOC_REF)
    if(r.exists()){
      const d=r.data()
      S.parts=d.parts||DP
      S.products=d.products||{}
      S.history=d.history||[]
      S.inHistory=d.inHistory||[]
      S.drivers=d.drivers||[]
      S.cats=d.cats||JSON.parse(JSON.stringify(DEFAULT_CATS))
    } else {
      S.parts=JSON.parse(JSON.stringify(DP))
      S.products={}
      S.history=[];S.inHistory=[];S.drivers=[]
      S.cats=JSON.parse(JSON.stringify(DEFAULT_CATS))
      await save()
    }
    setSS('live','실시간 동기화 중')
    refreshUI()
    startRT()
  } catch(e){
    console.error(e)
    setSS('error','연결 실패 — 새로고침 해주세요')
    S.parts=JSON.parse(JSON.stringify(DP));S.products={};S.history=[];S.inHistory=[];S.drivers=[]
    S.cats=JSON.parse(JSON.stringify(DEFAULT_CATS))
    refreshUI()
  }
}

async function save(){
  await setDoc(DOC_REF,{
    parts:S.parts, products:S.products,
    history:S.history.slice(0,300), inHistory:S.inHistory.slice(0,300),
    drivers:S.drivers, cats:S.cats
  })
}

function startRT(){
  if(unsubscribe)unsubscribe()
  unsubscribe=onSnapshot(DOC_REF,snap=>{
    if(!snap.exists())return
    const d=snap.data()
    S.parts=d.parts||{};S.products=d.products||{}
    S.history=d.history||[];S.inHistory=d.inHistory||[]
    S.drivers=d.drivers||[];S.cats=d.cats||S.cats
    setSS('live','실시간 동기화 중')
    refreshUI()
  })
}

// ══════════════════════════════════════════════════════
// 공통 헬퍼
// ══════════════════════════════════════════════════════
function getCatNames(){ return Object.keys(S.cats) }
function getCatSteps(cat){ return (S.cats[cat]||{steps:[]}).steps }

// 선택형 단계만 반환
function getSelectSteps(cat){ return getCatSteps(cat).filter(s=>s.type==='select') }
// 메모형 단계 반환
function getMemoStep(cat){ return getCatSteps(cat).find(s=>s.type==='memo') }

// 선택값으로 제품명 생성
function buildProdName(cat, selVals, memo){
  const parts=[cat, ...selVals.map(v=>v.val).filter(Boolean)]
  let name=parts.join(' ')
  if(memo) name+=` [${memo}]`
  return name
}

function renderAlerts(){
  const empty=Object.entries(S.parts).filter(([,p])=>p.qty===0)
  const low=Object.entries(S.parts).filter(([,p])=>p.qty>0&&p.qty<=p.min)
  let h=''
  if(empty.length)h+=`<div class="alert-banner err">재고 소진 ${empty.length}종: ${empty.map(([n])=>n).join(', ')}</div>`
  if(low.length)h+=`<div class="alert-banner warn">재고 부족 ${low.length}종: ${low.map(([n])=>n).join(', ')}</div>`
  document.getElementById('alertBanners').innerHTML=h
}

function refreshUI(){
  renderAlerts()
  popDriverSel()
  popBatchDriverSel()
  popInPartSel()
  renderBulkRows()
  initYearSel()
  populateShipCat()
  populateBatchCat()
  const act=document.querySelector('.section.active');if(!act)return
  const id=act.id
  if(id==='tab-재고'){renderSummary();renderInventory()}
  if(id==='tab-분석')renderAnalysis()
  if(id==='tab-전체통계')renderGlobal()
  if(id==='tab-기사통계')renderDriverStatPage()
  if(id==='tab-이력')renderHistory()
  if(id==='tab-입고이력')renderInHistory()
  if(id==='tab-관리'){renderDriverChips();renderPartMgmt();renderMgmtCatTabs();if(activeMgmtCat)renderMgmtSteps()}
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
  if(name==='관리'){renderDriverChips();renderPartMgmt();renderMgmtCatTabs();if(activeMgmtCat)renderMgmtSteps()}
}

// ══════════════════════════════════════════════════════
// 단건 출고 — 계층 선택
// ══════════════════════════════════════════════════════
function populateShipCat(){
  const sel=document.getElementById('sc_cat')
  const cur=sel.value
  sel.innerHTML='<option value="">-- 선택하세요 --</option>'
  getCatNames().forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;if(c===cur)o.selected=true;sel.appendChild(o)})
}

window.onShipCat=function(){
  const cat=document.getElementById('sc_cat').value
  shipSelVals=[];shipMemo='';shipFinalProd=''
  document.getElementById('shipStepDynamic').innerHTML=''
  document.getElementById('resultSel').style.display='none'
  document.getElementById('shipBtn').disabled=true
  if(!cat)return
  renderShipSteps(cat, 0)
}

function renderShipSteps(cat, fromStep){
  const steps=getSelectSteps(cat)
  const memoStep=getMemoStep(cat)
  const wrap=document.getElementById('shipStepDynamic')

  // fromStep 이후 기존 단계 제거
  const existing=wrap.querySelectorAll('.ship-dyn-step')
  existing.forEach((el,i)=>{ if(i>=fromStep) el.remove() })

  // fromStep부터 렌더 (이미 값 선택된 단계는 표시만)
  for(let si=fromStep; si<steps.length; si++){
    const step=steps[si]
    const stepEl=document.createElement('div')
    stepEl.className='step-wrap ship-dyn-step'
    stepEl.dataset.si=si
    const badge=document.createElement('div')
    badge.className='step-badge'
    badge.textContent=si+2
    const inner=document.createElement('div')
    inner.className='step-inner'
    const lbl=document.createElement('label')
    lbl.textContent=step.name
    const sel=document.createElement('select')
    sel.innerHTML='<option value="">-- 선택하세요 --</option>'
    step.vals.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;sel.appendChild(o)})
    // 이미 선택된 값 복원
    if(shipSelVals[si]) sel.value=shipSelVals[si].val
    sel.onchange=()=>onShipStepChange(cat, si, sel.value)
    inner.appendChild(lbl);inner.appendChild(sel)
    stepEl.appendChild(badge);stepEl.appendChild(inner)
    wrap.appendChild(stepEl)
    // 이 단계 값이 없으면 이후 렌더 중단
    if(!shipSelVals[si])break
  }

  // 모든 선택형 단계 완료 체크
  if(shipSelVals.length===steps.length && steps.every((_,i)=>shipSelVals[i]&&shipSelVals[i].val)){
    // 메모형 단계가 있으면 표시
    if(memoStep){
      let memoEl=wrap.querySelector('.ship-memo-wrap')
      if(!memoEl){
        memoEl=document.createElement('div')
        memoEl.className='step-wrap ship-dyn-step ship-memo-wrap'
        const badge=document.createElement('div')
        badge.className='step-badge'
        badge.textContent='📝'
        const inner=document.createElement('div')
        inner.className='step-inner'
        const lbl=document.createElement('label')
        lbl.textContent=memoStep.name
        const inp=document.createElement('input')
        inp.type='text'
        inp.placeholder='내용을 입력하세요 (선택)'
        inp.value=shipMemo||''
        inp.oninput=()=>{shipMemo=inp.value.trim();showShipResult(cat)}
        inner.appendChild(lbl);inner.appendChild(inp)
        memoEl.appendChild(badge);memoEl.appendChild(inner)
        wrap.appendChild(memoEl)
      }
      showShipResult(cat)
    } else {
      showShipResult(cat)
    }
  }
}

function onShipStepChange(cat, si, val){
  // si 이후 값 초기화
  shipSelVals=shipSelVals.slice(0,si)
  shipMemo='';shipFinalProd=''
  document.getElementById('resultSel').style.display='none'
  document.getElementById('shipBtn').disabled=true
  if(!val)return
  shipSelVals[si]={stepName:getSelectSteps(cat)[si].name, val}
  renderShipSteps(cat, si+1)
}

function showShipResult(cat){
  const name=buildProdName(cat, shipSelVals, shipMemo)
  shipFinalProd=name
  document.getElementById('rSelTitle').textContent='✅ '+name
  document.getElementById('rSelPath').textContent='경로: '+[cat,...shipSelVals.map(v=>v.val)].join(' > ')+(shipMemo?' + '+shipMemo:'')
  const partData=S.products[name]
  let ph=''
  if(partData&&Object.keys(partData).length){
    ph='<div style="font-size:12px;color:#6b7280;margin-top:8px;margin-bottom:4px;">구성 부품</div>'
    Object.entries(partData).forEach(([p,n])=>{ph+=`<div class="prow"><span>${p}</span><span>${n}개</span></div>`})
  } else {
    ph='<div style="font-size:12px;color:#d97706;margin-top:8px;">⚠ 부품 구성이 등록되지 않았습니다. 관리 탭에서 등록하세요.</div>'
  }
  document.getElementById('rSelParts').innerHTML=ph
  document.getElementById('resultSel').style.display='block'
  document.getElementById('shipBtn').disabled=false
}

function popDriverSel(){const sel=document.getElementById('driverSelect'),cur=sel.value;sel.innerHTML='<option value="">-- 기사를 선택하세요 --</option>';S.drivers.slice().sort().forEach(d=>{const o=document.createElement('option');o.value=d;o.textContent=d;if(d===cur)o.selected=true;sel.appendChild(o)})}

window.processShipment=async function(){
  const driver=document.getElementById('driverSelect').value
  const qty=parseInt(document.getElementById('qty').value)||1
  const addr=document.getElementById('deliveryAddr').value.trim()
  const customer=document.getElementById('customerName').value.trim()
  const note=document.getElementById('shipNote').value.trim()
  if(!driver){showToast('기사를 선택해주세요.','warn');return}
  if(!shipFinalProd){showToast('제품을 선택해주세요.','warn');return}
  const btn=document.getElementById('shipBtn');btn.disabled=true;btn.innerHTML='<span class="spinner"></span>'
  const parts=S.products[shipFinalProd];let partsStr=''
  if(parts){Object.entries(parts).forEach(([part,n])=>{if(!S.parts[part])S.parts[part]={qty:0,min:0};S.parts[part].qty=Math.max(0,S.parts[part].qty-n*qty)});partsStr=Object.entries(parts).map(([p,n])=>`${p} x${n*qty}`).join(', ')}
  S.history.unshift({time:new Date().toLocaleString('ko-KR'),driver,prod:shipFinalProd,qty,addr,customer,note,parts:partsStr||'부품 구성 미등록'})
  await save()
  document.getElementById('driverSelect').value='';document.getElementById('customerName').value='';document.getElementById('deliveryAddr').value='';document.getElementById('shipNote').value='';document.getElementById('qty').value=1
  document.getElementById('sc_cat').value='';shipSelVals=[];shipMemo='';shipFinalProd=''
  document.getElementById('shipStepDynamic').innerHTML='';document.getElementById('resultSel').style.display='none'
  btn.disabled=true;btn.textContent='출고 처리';renderAlerts()
  showToast(`${driver} 기사 — ${shipFinalProd} ${qty}세트 출고 완료`)
}

// ══════════════════════════════════════════════════════
// 묶음 출고
// ══════════════════════════════════════════════════════
function populateBatchCat(){
  const sel=document.getElementById('bc_cat')
  const cur=sel.value
  sel.innerHTML='<option value="">선택</option>'
  getCatNames().forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;if(c===cur)o.selected=true;sel.appendChild(o)})
}
function popBatchDriverSel(){const sel=document.getElementById('batchDriver'),cur=sel.value;sel.innerHTML='<option value="">-- 기사 선택 --</option>';S.drivers.slice().sort().forEach(d=>{const o=document.createElement('option');o.value=d;o.textContent=d;if(d===cur)o.selected=true;sel.appendChild(o)})}

window.onBatchCat=function(){
  const cat=document.getElementById('bc_cat').value
  batchSelVals=[];batchMemo='';batchFinalProd=''
  document.getElementById('batchStepDynamic').innerHTML=''
  document.getElementById('batchAddRow').style.display='none'
  if(!cat)return
  renderBatchSteps(cat,0)
}

function renderBatchSteps(cat, fromStep){
  const steps=getSelectSteps(cat)
  const memoStep=getMemoStep(cat)
  const wrap=document.getElementById('batchStepDynamic')
  const existing=wrap.querySelectorAll('.batch-dyn-step')
  existing.forEach((el,i)=>{if(i>=fromStep)el.remove()})

  for(let si=fromStep;si<steps.length;si++){
    const step=steps[si]
    const row=document.createElement('div')
    row.className='row batch-dyn-step'
    row.dataset.si=si
    const lbl=document.createElement('label')
    lbl.style.cssText='font-size:13px;color:#6b7280;min-width:60px;'
    lbl.textContent=step.name
    const sel=document.createElement('select')
    sel.style.cssText='width:180px;flex:none;font-size:13px;'
    sel.innerHTML='<option value="">선택</option>'
    step.vals.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;sel.appendChild(o)})
    if(batchSelVals[si])sel.value=batchSelVals[si].val
    sel.onchange=()=>onBatchStepChange(cat,si,sel.value)
    row.appendChild(lbl);row.appendChild(sel)
    wrap.appendChild(row)
    if(!batchSelVals[si])break
  }

  if(batchSelVals.length===steps.length&&steps.every((_,i)=>batchSelVals[i]&&batchSelVals[i].val)){
    if(memoStep){
      let memoRow=wrap.querySelector('.batch-memo-row')
      if(!memoRow){
        memoRow=document.createElement('div')
        memoRow.className='row batch-dyn-step batch-memo-row'
        const lbl=document.createElement('label')
        lbl.style.cssText='font-size:13px;color:#6b7280;min-width:60px;'
        lbl.textContent=memoStep.name
        const inp=document.createElement('input')
        inp.type='text';inp.placeholder='내용 입력 (선택)';inp.value=batchMemo||''
        inp.style='flex:1;font-size:13px;'
        inp.oninput=()=>{batchMemo=inp.value.trim();showBatchFinal(cat)}
        memoRow.appendChild(lbl);memoRow.appendChild(inp)
        wrap.appendChild(memoRow)
      }
      showBatchFinal(cat)
    } else {
      showBatchFinal(cat)
    }
  }
}

function onBatchStepChange(cat,si,val){
  batchSelVals=batchSelVals.slice(0,si);batchMemo='';batchFinalProd=''
  document.getElementById('batchAddRow').style.display='none'
  if(!val)return
  batchSelVals[si]={stepName:getSelectSteps(cat)[si].name,val}
  renderBatchSteps(cat,si+1)
}

function showBatchFinal(cat){
  const name=buildProdName(cat,batchSelVals,batchMemo)
  batchFinalProd=name
  document.getElementById('batchPreviewName').textContent='✅ '+name+(S.products[name]?'':'  ⚠ 부품 구성 미등록')
  document.getElementById('batchAddRow').style.display='block'
}

window.addToCart=function(){
  const cat=document.getElementById('bc_cat').value
  if(!batchFinalProd){showToast('제품을 선택하세요','warn');return}
  const qty=parseInt(document.getElementById('bc_qty').value)||1
  const customer=document.getElementById('bc_customer').value.trim()
  const addr=document.getElementById('bc_addr').value.trim()
  cart.push({name:batchFinalProd,qty,customer,addr,parts:S.products[batchFinalProd]||null})
  // 리셋
  document.getElementById('bc_cat').value='';batchSelVals=[];batchMemo='';batchFinalProd=''
  document.getElementById('batchStepDynamic').innerHTML=''
  document.getElementById('batchAddRow').style.display='none'
  document.getElementById('bc_qty').value=1
  document.getElementById('bc_customer').value=''
  document.getElementById('bc_addr').value=''
  renderCart();renderBatchSummary();showToast(cart[cart.length-1].name+' 담기 완료')
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
    if(!item.parts)return`<div style="padding:10px 12px;background:#f3f4f6;border-radius:8px;margin-bottom:8px;"><strong>${item.name}</strong> ×${item.qty} — ⚠ 부품 구성 미등록</div>`
    const lines=Object.entries(item.parts).map(([p,n])=>{const t=n*item.qty;const st=S.parts[p]?S.parts[p].qty:0;const color=st<t?'#dc2626':'inherit';return`<div class="prow"><span>${p}</span><span style="color:${color};font-weight:500;">${t}개</span></div>`}).join('')
    return`<div style="padding:10px 12px;background:#f3f4f6;border-radius:8px;margin-bottom:8px;"><div style="font-weight:600;font-size:13px;margin-bottom:6px;">${item.name} ×${item.qty}세트${item.customer?' — '+item.customer:''}</div>${lines}</div>`
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

// 인쇄
window.openPrintModal=function(){
  if(!cart.length)return
  const driver=document.getElementById('batchDriver').value
  const now=new Date().toLocaleString('ko-KR')
  const totalNeeded={}
  cart.forEach(item=>{
    if(!item.parts)return
    Object.entries(item.parts).forEach(([part,n])=>{
      if(!totalNeeded[part])totalNeeded[part]={need:0,usedBy:[]}
      totalNeeded[part].need+=n*item.qty
      if(!totalNeeded[part].usedBy.includes(item.name))totalNeeded[part].usedBy.push(item.name)
    })
  })
  const shortParts=Object.entries(totalNeeded).filter(([p,d])=>(S.parts[p]?S.parts[p].qty:0)<d.need)
  let html=`<div class="doc-header"><div class="doc-title">보루네오 가구 — 창고 픽업 목록</div><div class="doc-sub">묶음 출고 부품 합산표</div></div>`
  html+=`<div style="display:flex;gap:20px;margin-bottom:16px;font-size:12px;color:#374151;flex-wrap:wrap;"><span>📅 ${now}</span><span>👷 ${driver||'미지정'}</span><span>📦 총 ${cart.length}건</span></div>`
  if(shortParts.length)html+=`<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#991b1b;font-weight:500;">🚨 재고 부족: ${shortParts.map(([p])=>p).join(', ')}</div>`
  html+=`<div class="section-title">① 창고 픽업 목록</div><table><thead><tr><th>✓</th><th>부품명</th><th style="text-align:center;">필요 수량</th><th style="text-align:center;">현재 재고</th><th style="text-align:center;">상태</th></tr></thead><tbody>`
  Object.entries(totalNeeded).sort((a,b)=>a[0].localeCompare(b[0],'ko')).forEach(([part,d])=>{
    const stock=S.parts[part]?S.parts[part].qty:0,isShort=stock<d.need,isEmpty=stock===0
    const rowCls=isEmpty?'danger-row':isShort?'warning-row':''
    const stockCls=isEmpty?'stock-empty':isShort?'stock-low':'stock-ok'
    const status=isEmpty?'⚠ 소진':isShort?'⚠ 부족':'✓ OK'
    html+=`<tr class="${rowCls}"><td style="text-align:center;"><span class="check-box"></span></td><td><strong>${part}</strong></td><td style="text-align:center;" class="need-qty">${d.need}개</td><td style="text-align:center;" class="${stockCls}">${stock}개</td><td style="text-align:center;" class="${stockCls}">${status}</td></tr>`
  })
  html+=`</tbody></table><div class="section-title">② 제품별 배송 목록</div>`
  cart.forEach((item,idx)=>{
    if(!item.parts)return
    html+=`<div class="prod-block"><div class="prod-block-title">${idx+1}. ${item.name} × ${item.qty}세트${item.customer?' — '+item.customer:''}</div><div style="font-size:12px;color:#6b7280;">${item.addr||'배송지 미입력'}</div></div>`
  })
  html+=`<div class="sig-row"><div class="sig-box">창고 담당자 확인</div><div class="sig-box">기사 수령 확인 (${driver||'　　　'})</div><div class="sig-box">관리자 승인</div></div>`
  document.getElementById('printDoc').innerHTML=html
  document.getElementById('printModalContainer').style.display='block'
}

// ══════════════════════════════════════════════════════
// 입고
// ══════════════════════════════════════════════════════
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
function renderBulkRows(){const pn=Object.keys(S.parts).sort();document.getElementById('bulkInRows').innerHTML=bulkRows.map((r,i)=>`<div class="part-row"><select id="bslot_${i}" style="flex:1;font-size:13px;" onchange="bulkRows[${i}].part=this.value"><option value="">-- 부품 선택 --</option>${pn.map(p=>`<option value="${p}"${r.part===p?' selected':''}>${p}</option>`).join('')}</select><input type="number" id="bslot_qty_${i}" min="1" value="${r.qty}" style="width:70px;" onchange="bulkRows[${i}].qty=parseInt(this.value)||1"><button class="danger" onclick="removeBulkRow(${i})">X</button></div>`).join('')}
function syncBulkRows(){bulkRows.forEach((r,i)=>{const s=document.getElementById('bslot_'+i);const q=document.getElementById('bslot_qty_'+i);if(s)r.part=s.value;if(q)r.qty=parseInt(q.value)||1})}
window.addBulkRow=()=>{syncBulkRows();bulkRows.push({part:'',qty:1});renderBulkRows()}
window.removeBulkRow=(i)=>{syncBulkRows();bulkRows.splice(i,1);if(!bulkRows.length)bulkRows.push({part:'',qty:1});renderBulkRows()}
window.processBulkInbound=async function(){syncBulkRows();const valid=bulkRows.filter(r=>r.part&&r.qty>0);if(!valid.length){showToast('부품을 선택해주세요.','warn');return}const time=new Date().toLocaleString('ko-KR');valid.forEach(r=>{if(!S.parts[r.part])S.parts[r.part]={qty:0,min:0};S.parts[r.part].qty+=r.qty;S.inHistory.unshift({time,part:r.part,qty:r.qty,supplier:'',note:'일괄입고',type:'일괄'})});await save();bulkRows=[{part:'',qty:1}];renderBulkRows();renderAlerts();showToast(`일괄 입고 완료 (${valid.length}종)`)}
function renderInHistory(){const q=(document.getElementById('inHistSearch').value||'').toLowerCase(),el=document.getElementById('inHistoryList'),filtered=S.inHistory.filter(h=>!q||h.part.toLowerCase().includes(q)||(h.supplier||'').toLowerCase().includes(q));if(!filtered.length){el.innerHTML='<div class="empty-state">입고 이력이 없습니다.</div>';return}el.innerHTML=filtered.slice(0,100).map(h=>`<div class="history-item"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;"><span style="font-weight:500;">${h.part}</span><span class="tag-sm">+${h.qty}개</span>${h.supplier?`<span class="tag-sm">${h.supplier}</span>`:''}<span style="margin-left:auto;font-size:12px;color:#6b7280;">${h.time}</span></div></div>`).join('')}
window.renderInHistory=renderInHistory

// ══════════════════════════════════════════════════════
// 재고 현황
// ══════════════════════════════════════════════════════
function renderSummary(){const vals=Object.values(S.parts),total=vals.length,low=vals.filter(p=>p.qty>0&&p.qty<=p.min).length,empty=vals.filter(p=>p.qty===0).length;document.getElementById('summaryCards').innerHTML=mc('전체 부품',total+'종')+mc('정상',(total-low-empty)+'종','#065f46')+mc('부족',low+'종','#92400e')+mc('소진',empty+'종','#991b1b')}
function renderInventory(){const q=(document.getElementById('searchPart').value||'').toLowerCase(),fs=document.getElementById('filterStatus').value,tbody=document.getElementById('inventoryBody');let entries=Object.entries(S.parts).filter(([n])=>n.toLowerCase().includes(q));if(fs==='정상')entries=entries.filter(([,p])=>p.qty>p.min);else if(fs==='부족')entries=entries.filter(([,p])=>p.qty>0&&p.qty<=p.min);else if(fs==='소진')entries=entries.filter(([,p])=>p.qty===0);if(!entries.length){tbody.innerHTML='<tr><td colspan="5" class="empty-state">검색 결과 없음</td></tr>';return}tbody.innerHTML=entries.map(([name,p])=>{const status=p.qty===0?'<span class="badge empty">소진</span>':p.qty<=p.min?'<span class="badge low">부족</span>':'<span class="badge ok">정상</span>';return`<tr><td>${name}</td><td style="font-weight:500;">${p.qty}</td><td style="color:#6b7280;">${p.min}</td><td>${status}</td><td><button class="warning" onclick="openEditPartModal('${name.replace(/'/g,"\\'")}')">수정</button></td></tr>`}).join('')}
window.renderInventory=renderInventory

// ══════════════════════════════════════════════════════
// 분석
// ══════════════════════════════════════════════════════
function parseDate(t){const p=t.split(/[.\s:/년월일]+/).filter(Boolean);if(p.length>=3)return{y:parseInt(p[0]),m:parseInt(p[1]),d:parseInt(p[2])};return null}
function parseDate2(t){const dt=parseDate(t);if(!dt)return null;return new Date(dt.y,dt.m-1,dt.d)}
function renderAnalysis(){renderPrediction();renderProductAnalysis();renderMonthlyChart();renderDriverReport()}
window.renderPrediction=function(){const days=parseInt(document.getElementById('predictDays').value)||30,now=new Date(),cutoff=new Date(now.getTime()-days*86400000),pu={};S.history.forEach(h=>{const dt=parseDate2(h.time);if(!dt||dt<cutoff||!S.products[h.prod])return;Object.entries(S.products[h.prod]).forEach(([part,n])=>{pu[part]=(pu[part]||0)+n*h.qty})});const res=[];Object.entries(S.parts).forEach(([name,p])=>{const used=pu[name]||0;if(used===0){res.push({name,stock:p.qty,daysLeft:Infinity,dailyRate:0});return}const dr=used/days;res.push({name,stock:p.qty,daysLeft:Math.floor(p.qty/dr),dailyRate:dr.toFixed(2)})});res.sort((a,b)=>a.daysLeft-b.daysLeft);const el=document.getElementById('predictionList'),finite=res.filter(r=>r.daysLeft!==Infinity),infinite=res.filter(r=>r.daysLeft===Infinity);let html='';if(!finite.length)html=`<div style="font-size:13px;color:#6b7280;">최근 ${days}일간 출고 이력이 없습니다.</div>`;else finite.forEach(r=>{const cls=r.daysLeft<=7?'danger':r.daysLeft<=30?'warn':'ok';html+=`<div class="predict-card"><div class="predict-days ${cls}">${r.daysLeft<=0?'0':r.daysLeft<=999?r.daysLeft:'∞'}</div><div class="predict-info"><div class="predict-name">${r.name}</div><div class="predict-detail">현재 재고 ${r.stock}개 · 일평균 ${r.dailyRate}개 · ${r.daysLeft<=0?'소진됨':r.daysLeft+'일 후 소진'}</div></div></div>`});if(infinite.length)html+=`<div style="font-size:13px;color:#6b7280;margin-top:8px;">미사용 부품 ${infinite.length}종</div>`;el.innerHTML=html}
window.renderProductAnalysis=function(){const p=parseInt(document.getElementById('productAnalysisPeriod').value)||0,now=new Date(),cutoff=p?new Date(now.getTime()-p*86400000):null,filtered=cutoff?S.history.filter(h=>{const dt=parseDate2(h.time);return dt&&dt>=cutoff}):S.history,pMap={};filtered.forEach(h=>{pMap[h.prod]=(pMap[h.prod]||0)+h.qty});Object.keys(S.products).forEach(p=>{if(!pMap[p])pMap[p]=0});const arr=Object.entries(pMap).sort((a,b)=>b[1]-a[1]);if(!arr.length){document.getElementById('productAnalysis').innerHTML='<div class="empty-state">데이터 없음</div>';return}const max=arr[0][1]||1;let html='<div style="margin-bottom:16px;">';arr.forEach(([name,qty],i)=>{const isHot=i<3&&qty>0,isCold=qty===0,color=isHot?'#E74C3C':isCold?'#AEB6BF':'#378ADD';html+=`<div class="bar-wrap"><span class="bar-label" style="min-width:150px;">${name}${isHot?' 🔥':isCold?' 🧊':''}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(qty/max*100)}%;background:${color};"></div></div><span class="bar-val">${qty}세트</span></div>`});html+='</div>';document.getElementById('productAnalysis').innerHTML=html}
function initYearSel(){const sel=document.getElementById('monthlyChartYear'),years=[...new Set(S.history.map(h=>{const dt=parseDate(h.time);return dt?dt.y:null}).filter(Boolean))].sort((a,b)=>b-a);if(!years.length)years.push(new Date().getFullYear());const cur=sel.value||String(years[0]);sel.innerHTML=years.map(y=>`<option value="${y}"${String(y)===cur?' selected':''}>${y}년</option>`).join('')}
window.renderMonthlyChart=function(){const year=parseInt(document.getElementById('monthlyChartYear').value)||new Date().getFullYear(),monthly=new Array(12).fill(0);S.history.forEach(h=>{const dt=parseDate(h.time);if(!dt||dt.y!==year)return;monthly[dt.m-1]+=h.qty});const canvas=document.getElementById('monthlyCanvas'),W=canvas.parentElement.offsetWidth||600;canvas.width=W;canvas.height=200;const ctx=canvas.getContext('2d'),pad={t:20,r:20,b:40,l:50},cw=W-pad.l-pad.r,ch=200-pad.t-pad.b,max=Math.max(...monthly,1),barW=cw/12*0.6,gap=cw/12;ctx.clearRect(0,0,W,200);for(let i=0;i<=5;i++){const y=pad.t+ch-ch*(i/5);ctx.strokeStyle='rgba(128,128,128,0.15)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+cw,y);ctx.stroke();ctx.fillStyle='rgba(128,128,128,0.7)';ctx.font='11px sans-serif';ctx.textAlign='right';ctx.fillText(Math.round(max*i/5),pad.l-6,y+4)}monthly.forEach((v,i)=>{const x=pad.l+i*gap+gap/2-barW/2,h2=v===0?0:Math.max(4,ch*(v/max)),y=pad.t+ch-h2,grad=ctx.createLinearGradient(0,y,0,y+h2);grad.addColorStop(0,'#378ADD');grad.addColorStop(1,'#1A5FA8');ctx.fillStyle=grad;if(ctx.roundRect)ctx.roundRect(x,y,barW,h2,3);else ctx.rect(x,y,barW,h2);ctx.fill();if(v>0){ctx.fillStyle='#111827';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText(v,x+barW/2,y-5)}ctx.fillStyle='rgba(128,128,128,0.8)';ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillText((i+1)+'월',x+barW/2,pad.t+ch+18)})}
window.renderDriverReport=function(){const p=parseInt(document.getElementById('reportPeriod').value)||0,now=new Date(),cutoff=p?new Date(now.getTime()-p*86400000):null,filtered=cutoff?S.history.filter(h=>{const dt=parseDate2(h.time);return dt&&dt>=cutoff}):S.history,allDrivers=[...new Set([...S.drivers,...filtered.map(h=>h.driver)])].sort();if(!allDrivers.length){document.getElementById('driverReport').innerHTML='<div class="empty-state">기사 데이터가 없습니다.</div>';return}const dStats={};allDrivers.forEach(d=>{dStats[d]={total:0,days:new Set(),products:{}}});filtered.forEach(h=>{if(!dStats[h.driver])dStats[h.driver]={total:0,days:new Set(),products:{}};dStats[h.driver].total+=h.qty;const dt=parseDate(h.time);if(dt)dStats[h.driver].days.add(`${dt.y}-${dt.m}-${dt.d}`);dStats[h.driver].products[h.prod]=(dStats[h.driver].products[h.prod]||0)+h.qty});const arr=Object.entries(dStats).sort((a,b)=>b[1].total-a[1].total),maxTotal=arr.length?arr[0][1].total:1,rc=['🥇','🥈','🥉'];let html='';arr.forEach(([name,d],i)=>{const ad=d.days.size,avg=ad?Math.round(d.total/ad*10)/10:0,top=Object.entries(d.products).sort((a,b)=>b[1]-a[1])[0],pct=Math.round(d.total/maxTotal*100);html+=`<div class="report-driver"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;"><span style="font-size:16px;font-weight:500;">${rc[i]||'👷'} ${name} 기사</span><span class="tag-sm">${d.total}세트</span></div><div class="report-grid"><div class="report-metric"><div class="report-metric-val" style="color:#1d4ed8;">${d.total}</div><div class="report-metric-label">총 출고 세트</div></div><div class="report-metric"><div class="report-metric-val">${ad}</div><div class="report-metric-label">출고 활동일</div></div><div class="report-metric"><div class="report-metric-val">${avg}</div><div class="report-metric-label">일평균 세트</div></div></div><div class="bar-wrap" style="margin-bottom:6px;"><div class="bar-track" style="height:10px;"><div class="bar-fill" style="width:${pct}%;background:#378ADD;height:10px;"></div></div><span class="bar-val">${pct}%</span></div>${top?`<div style="font-size:13px;color:#6b7280;">주력 제품: <strong>${top[0]}</strong> (${top[1]}세트)</div>`:''}</div>`});document.getElementById('driverReport').innerHTML=html}

// ══════════════════════════════════════════════════════
// 통계
// ══════════════════════════════════════════════════════
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
function renderDriverStat(){const key=currentKey(dPeriod,dOffset),dH=S.history.filter(h=>h.driver===selectedDriver),filtered=dH.filter(h=>dateKey(h.time,dPeriod)===key),totalAll=dH.reduce((s,h)=>s+h.qty,0),totalPeriod=filtered.reduce((s,h)=>s+h.qty,0),pMap={};filtered.forEach(h=>{pMap[h.prod]=(pMap[h.prod]||0)+h.qty});let html=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:1rem;flex-wrap:wrap;"><button class="pbtn${dPeriod==='일별'?' active':''}" id="dp-일별" onclick="setDriverPeriod('일별')">일별</button><button class="pbtn${dPeriod==='월별'?' active':''}" id="dp-월별" onclick="setDriverPeriod('월별')">월별</button><button class="pbtn${dPeriod==='년별'?' active':''}" id="dp-년별" onclick="setDriverPeriod('년별')">년별</button><div class="nav-row" style="margin-left:auto;"><button class="secondary" onclick="navDriver(-1)">◀</button><span class="nav-label">${displayLabel(key,dPeriod)}</span><button class="secondary" onclick="navDriver(1)">▶</button></div></div>`;html+=`<div class="grid3">${mc('기간 출고',totalPeriod+'세트')}${mc('누적 출고',totalAll+'세트')}${mc('취급 제품',Object.keys(pMap).length+'종')}</div>`;if(!filtered.length){html+='<div class="card"><div class="empty-state">해당 기간 출고 내역이 없습니다.</div></div>';document.getElementById('driverStatContent').innerHTML=html;return}const pArr=Object.entries(pMap).sort((a,b)=>b[1]-a[1]),maxP=pArr.length?pArr[0][1]:1;html+=`<div class="card"><h3>제품별 출고량</h3>${pArr.map(([name,qty])=>`<div class="bar-wrap"><span class="bar-label" style="min-width:150px;">${name}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(qty/maxP*100)}%;background:#534AB7;"></div></div><span class="bar-val">${qty}세트</span></div>`).join('')}</div>`;html+=`<div class="card"><h3>출고 내역</h3>${filtered.map(h=>`<div class="timeline-row"><span style="min-width:90px;color:#6b7280;font-size:13px;">${h.time.split(' ')[0]}</span><span class="tag-sm">${h.prod} ${h.qty}세트</span>${h.customer?`<span style="font-size:13px;color:#6b7280;">${h.customer}</span>`:''}</div>`).join('')}</div>`;document.getElementById('driverStatContent').innerHTML=html}
function renderHistory(){const q=(document.getElementById('histSearch').value||'').toLowerCase(),el=document.getElementById('historyList'),filtered=S.history.filter(h=>!q||h.driver.toLowerCase().includes(q)||h.prod.toLowerCase().includes(q)||(h.customer||'').toLowerCase().includes(q));if(!filtered.length){el.innerHTML='<div class="empty-state">출고 이력이 없습니다.</div>';return}el.innerHTML=filtered.slice(0,100).map(h=>`<div class="history-item"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;"><span style="font-weight:500;">${h.driver} 기사</span><span class="tag-sm">${h.prod} ${h.qty}세트</span>${h.customer?`<span class="tag-sm">${h.customer}</span>`:''}<span style="margin-left:auto;font-size:12px;color:#6b7280;">${h.time}</span></div>${h.addr?`<div style="font-size:13px;color:#6b7280;">배송: ${h.addr}</div>`:''} ${h.note&&h.note!=='묶음출고'?`<div style="font-size:13px;color:#6b7280;">메모: ${h.note}</div>`:h.note==='묶음출고'?`<div style="font-size:12px;color:#1d4ed8;">🛒 묶음출고</div>`:''}<div style="font-size:12px;color:#9ca3af;margin-top:2px;">${h.parts}</div></div>`).join('')}
window.renderHistory=renderHistory

// ══════════════════════════════════════════════════════
// 관리 — 기사, 부품
// ══════════════════════════════════════════════════════
window.addDriver=async function(){const input=document.getElementById('newDriverName'),name=input.value.trim();if(!name){showToast('기사명을 입력하세요.','warn');return}if(S.drivers.includes(name)){showToast('이미 등록된 기사입니다.','warn');return}S.drivers.push(name);await save();input.value='';renderDriverChips();popDriverSel();popBatchDriverSel();showToast(name+' 기사 추가 완료')}
window.removeDriver=async function(name){if(!confirm(name+' 기사를 삭제할까요?'))return;S.drivers=S.drivers.filter(d=>d!==name);await save();renderDriverChips();popDriverSel();popBatchDriverSel();showToast(name+' 삭제됨')}
function renderDriverChips(){const wrap=document.getElementById('driverChips');if(!S.drivers.length){wrap.innerHTML='<div style="font-size:13px;color:#6b7280;padding:8px 0;">등록된 기사가 없습니다.</div>';return}wrap.innerHTML=S.drivers.slice().sort().map(d=>`<span class="driver-chip">${d}<button onclick="removeDriver('${d.replace(/'/g,"\\'")}')"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button></span>`).join('')}

function renderPartMgmt(){
  const q=(document.getElementById('searchPartMgmt').value||'').toLowerCase()
  const tbody=document.getElementById('partMgmtBody')
  const entries=Object.entries(S.parts).filter(([n])=>n.toLowerCase().includes(q)).sort((a,b)=>a[0].localeCompare(b[0],'ko'))
  if(!entries.length){tbody.innerHTML='<tr><td colspan="5" class="empty-state">검색 결과 없음</td></tr>';return}
  tbody.innerHTML=entries.map(([name,p])=>{
    const status=p.qty===0?'<span class="badge empty">소진</span>':p.qty<=p.min?'<span class="badge low">부족</span>':'<span class="badge ok">정상</span>'
    return`<tr><td style="font-weight:500;">${name}</td><td>${p.qty}</td><td style="color:#6b7280;">${p.min}</td><td>${status}</td><td><div style="display:flex;gap:6px;"><button class="warning" onclick="openEditPartModal('${name.replace(/'/g,"\\'")}')">수정</button><button class="danger" onclick="deletePartConfirm('${name.replace(/'/g,"\\'")}')">삭제</button></div></td></tr>`
  }).join('')
}

window.openAddPartModal=function(){
  document.getElementById('modalContainer').innerHTML=`
  <div class="modal-bg" onclick="closeMBg(event)"><div class="modal">
    <h4>➕ 부품 추가</h4>
    <div class="modal-field"><label class="modal-label">부품명 *</label><input type="text" id="mp_name" placeholder="예: 사이드레일 L"></div>
    <div class="modal-grid">
      <div><label class="modal-label">현재 재고</label><input type="number" id="mp_qty" value="0" min="0"></div>
      <div><label class="modal-label">최소 재고</label><input type="number" id="mp_min" value="5" min="0"></div>
    </div>
    <div class="modal-actions"><button class="secondary" onclick="closeM()">취소</button><button class="primary" onclick="confirmAddPart()">추가</button></div>
  </div></div>`
  setTimeout(()=>document.getElementById('mp_name').focus(),50)
}
window.confirmAddPart=async function(){
  const name=document.getElementById('mp_name').value.trim()
  const qty=parseInt(document.getElementById('mp_qty').value)||0
  const min=parseInt(document.getElementById('mp_min').value)||0
  if(!name){showToast('부품명을 입력하세요.','warn');return}
  if(S.parts[name]){showToast('이미 존재하는 부품명입니다.','warn');return}
  S.parts[name]={qty,min};await save();closeM();renderPartMgmt();renderInventory();renderSummary();popInPartSel();renderBulkRows();renderAlerts();showToast(name+' 부품 추가 완료')
}
window.openEditPartModal=function(name){
  const p=S.parts[name]
  document.getElementById('modalContainer').innerHTML=`
  <div class="modal-bg" onclick="closeMBg(event)"><div class="modal">
    <h4>✏️ 부품 수정</h4>
    <div class="modal-field"><label class="modal-label">부품명 변경</label><input type="text" id="mp_newname" value="${name}"></div>
    <div class="modal-grid">
      <div><label class="modal-label">현재 재고</label><input type="number" id="mp_qty" value="${p.qty}" min="0"></div>
      <div><label class="modal-label">최소 재고</label><input type="number" id="mp_min" value="${p.min}" min="0"></div>
    </div>
    <div class="modal-actions"><button class="secondary" onclick="closeM()">취소</button><button class="primary" onclick="confirmEditPart('${name.replace(/'/g,"\\'")}')">저장</button></div>
  </div></div>`
  setTimeout(()=>document.getElementById('mp_newname').focus(),50)
}
window.confirmEditPart=async function(oldName){
  const newName=document.getElementById('mp_newname').value.trim()
  const qty=parseInt(document.getElementById('mp_qty').value)||0
  const min=parseInt(document.getElementById('mp_min').value)||0
  if(!newName){showToast('부품명을 입력하세요.','warn');return}
  if(newName!==oldName&&S.parts[newName]){showToast('이미 존재하는 부품명입니다.','warn');return}
  if(newName!==oldName){
    delete S.parts[oldName]
    Object.keys(S.products).forEach(prod=>{if(S.products[prod][oldName]!==undefined){S.products[prod][newName]=S.products[prod][oldName];delete S.products[prod][oldName]}})
  }
  S.parts[newName]={qty,min};await save();closeM();renderPartMgmt();renderInventory();renderSummary();popInPartSel();renderBulkRows();renderAlerts();showToast(newName+' 수정 완료')
}
window.deletePartConfirm=async function(name){
  const usedIn=Object.entries(S.products).filter(([,parts])=>parts[name]).map(([n])=>n)
  let msg=`"${name}" 부품을 삭제할까요?`
  if(usedIn.length)msg+=`\n\n⚠️ 아래 제품에서 사용 중:\n${usedIn.join(', ')}`
  if(!confirm(msg))return
  delete S.parts[name]
  Object.keys(S.products).forEach(prod=>{delete S.products[prod][name]})
  await save();renderPartMgmt();renderInventory();renderSummary();popInPartSel();renderBulkRows();renderAlerts();showToast(name+' 삭제됨')
}
window.closeM=()=>document.getElementById('modalContainer').innerHTML=''
window.closeMBg=(e)=>{if(e.target.classList.contains('modal-bg'))window.closeM()}

// ══════════════════════════════════════════════════════
// 관리 — 카테고리별 제품 설정 (핵심!)
// ══════════════════════════════════════════════════════
function renderMgmtCatTabs(){
  const wrap=document.getElementById('mgmtCatTabs')
  const cats=getCatNames()
  if(!cats.length){wrap.innerHTML='<div style="font-size:13px;color:#6b7280;">카테고리가 없습니다. 아래에서 추가하세요.</div>';return}
  if(!activeMgmtCat||!cats.includes(activeMgmtCat))activeMgmtCat=cats[0]
  wrap.innerHTML=cats.map(c=>`<button class="cat-tab-btn${c===activeMgmtCat?' active':''}" onclick="selectMgmtCat('${c.replace(/'/g,"\\'")}'">${c}</button>`).join('')
}

window.selectMgmtCat=function(cat){
  activeMgmtCat=cat
  renderMgmtCatTabs()
  renderMgmtSteps()
  renderMgmtProdTable()
}

window.addMgmtCat=async function(){
  const name=document.getElementById('newCatName').value.trim()
  if(!name){showToast('카테고리 이름을 입력하세요.','warn');return}
  if(S.cats[name]){showToast('이미 존재합니다.','warn');return}
  S.cats[name]={steps:[]}
  document.getElementById('newCatName').value=''
  await save()
  activeMgmtCat=name
  renderMgmtCatTabs();renderMgmtSteps();renderMgmtProdTable()
  populateShipCat();populateBatchCat()
  showToast(name+' 카테고리 추가됨')
}

window.deleteMgmtCat=async function(){
  if(!activeMgmtCat)return
  if(!confirm(`"${activeMgmtCat}" 카테고리를 삭제할까요?\n이 카테고리로 생성된 제품도 함께 삭제됩니다.`))return
  // 관련 제품 삭제
  Object.keys(S.products).filter(n=>n.startsWith(activeMgmtCat+' ')||n===activeMgmtCat).forEach(n=>delete S.products[n])
  delete S.cats[activeMgmtCat]
  activeMgmtCat=getCatNames()[0]||''
  await save()
  renderMgmtCatTabs();renderMgmtSteps();renderMgmtProdTable()
  populateShipCat();populateBatchCat()
  showToast('카테고리 삭제됨')
}

function renderMgmtSteps(){
  const config=document.getElementById('mgmtCatConfig')
  const title=document.getElementById('mgmtCatTitle')
  if(!activeMgmtCat||!S.cats[activeMgmtCat]){config.style.display='none';return}
  config.style.display='block'
  title.textContent='⚙️ '+activeMgmtCat+' — 단계 설정'
  const steps=S.cats[activeMgmtCat].steps
  document.getElementById('mgmtStepList').innerHTML = steps.length===0
    ? '<div style="font-size:13px;color:#9ca3af;padding:8px 0;">단계가 없습니다. + 단계 추가를 눌러 시작하세요.</div>'
    : steps.map((s,si)=>`
      <div class="step-box">
        <div class="step-box-header">
          <div class="step-num-badge">${si+1}</div>
          <input type="text" value="${s.name}" onchange="updateStepName(${si},this.value)" style="width:110px;font-size:13px;font-weight:600;">
          <select onchange="updateStepType(${si},this.value)" style="font-size:12px;padding:4px 8px;width:90px;">
            <option value="select"${s.type==='select'?' selected':''}>선택형</option>
            <option value="memo"${s.type==='memo'?' selected':''}>메모형</option>
          </select>
          <button class="danger small" onclick="removeStep(${si})">삭제</button>
        </div>
        ${s.type==='select'?`
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;">
            ${s.vals.map((v,vi)=>`<span class="val-tag">${v}<button onclick="removeStepVal(${si},${vi})">×</button></span>`).join('')}
          </div>
          <div style="display:flex;gap:5px;">
            <input type="text" id="sv_${si}" placeholder="값 입력 후 Enter" style="flex:1;font-size:12px;padding:5px 8px;" onkeydown="if(event.key==='Enter')addStepVal(${si})">
            <button class="secondary small" onclick="addStepVal(${si})">추가</button>
          </div>`
        :`<div style="font-size:12px;color:#9ca3af;padding:4px 0;">📝 출고 시 자유 텍스트 입력 — 제품명에 [메모] 형태로 표시됩니다.</div>`}
      </div>`).join('')
}

window.addMgmtStep=function(){
  if(!activeMgmtCat)return
  S.cats[activeMgmtCat].steps.push({name:'단계'+(S.cats[activeMgmtCat].steps.length+1),type:'select',vals:[]})
  renderMgmtSteps()
}
window.removeStep=async function(si){
  S.cats[activeMgmtCat].steps.splice(si,1)
  await save();renderMgmtSteps()
}
window.updateStepName=function(si,v){S.cats[activeMgmtCat].steps[si].name=v}
window.updateStepType=async function(si,v){S.cats[activeMgmtCat].steps[si].type=v;await save();renderMgmtSteps()}
window.addStepVal=async function(si){
  const inp=document.getElementById('sv_'+si)
  const v=inp.value.trim();if(!v)return
  const s=S.cats[activeMgmtCat].steps[si]
  if(s.vals.includes(v)){showToast('이미 있습니다','warn');return}
  s.vals.push(v);inp.value=''
  await save();renderMgmtSteps()
}
window.removeStepVal=async function(si,vi){
  S.cats[activeMgmtCat].steps[si].vals.splice(vi,1)
  await save();renderMgmtSteps()
}

// 제품 목록 자동 생성
window.genProdList=async function(){
  if(!activeMgmtCat)return
  const steps=getSelectSteps(activeMgmtCat)
  if(!steps.length){showToast('선택형 단계를 먼저 추가하세요.','warn');return}
  const hasEmptyStep=steps.find(s=>!s.vals.length)
  if(hasEmptyStep){showToast(`"${hasEmptyStep.name}" 단계에 값을 추가하세요.`,'warn');return}
  // 모든 조합 생성
  let combos=[[]]
  steps.forEach(s=>{
    const next=[];combos.forEach(c=>s.vals.forEach(v=>next.push([...c,v])));combos=next
  })
  let count=0
  combos.forEach(combo=>{
    const name=activeMgmtCat+' '+combo.join(' ')
    if(!S.products[name]){S.products[name]={};count++}
  })
  await save();renderMgmtProdTable()
  if(count>0)showToast(count+'개 제품이 생성됐습니다.')
  else showToast('이미 모두 생성되어 있습니다.','warn')
}

// 제품 목록 테이블
function renderMgmtProdTable(){
  const card=document.getElementById('mgmtProdCard')
  if(!activeMgmtCat){card.style.display='none';return}
  const q=(document.getElementById('mgmtProdSearch')||{value:''}).value.toLowerCase()
  const entries=Object.entries(S.products)
    .filter(([n])=>n.startsWith(activeMgmtCat)&&n.toLowerCase().includes(q))
    .sort((a,b)=>a[0].localeCompare(b[0],'ko'))
  document.getElementById('mgmtProdTitle').textContent=`📦 ${activeMgmtCat} 제품 목록 (${entries.length}개)`
  card.style.display='block'
  const tbody=document.getElementById('mgmtProdBody')
  if(!entries.length){tbody.innerHTML=`<tr><td colspan="3" class="empty-state">제품이 없습니다.<br><small>"제품 목록 생성" 버튼을 눌러 자동 생성하세요.</small></td></tr>`;return}
  const pn=Object.keys(S.parts).sort()
  tbody.innerHTML=entries.map(([name,parts])=>{
    const hasParts=Object.keys(parts).length>0
    const chips=hasParts
      ? Object.entries(parts).map(([p,n])=>`<span class="part-chip">${p}${n>1?' ×'+n:''}<button onclick="removeProdPart('${name.replace(/'/g,"\\'")}','${p.replace(/'/g,"\\'")}')">×</button></span>`).join('')
      : '<span style="font-size:12px;color:#d97706;">⚠ 부품 없음</span>'
    const key=name.replace(/[^a-zA-Z0-9]/g,'_')
    const partOpts=pn.map(p=>`<option value="${p}">${p}</option>`).join('')
    return`<tr>
      <td style="font-size:13px;font-weight:500;">${name}</td>
      <td>
        <div style="flex-wrap:wrap;display:flex;gap:2px;margin-bottom:5px;">${chips}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;">
          <select id="pp_${key}" style="font-size:12px;padding:4px 8px;width:160px;">
            <option value="">부품 선택...</option>${partOpts}
          </select>
          <input type="number" id="pq_${key}" value="1" min="1" style="width:48px;font-size:12px;padding:4px 6px;">
          <button class="secondary small" onclick="addProdPart('${name.replace(/'/g,"\\'")}','${key}')">+ 추가</button>
        </div>
      </td>
      <td>
        <div style="display:flex;gap:5px;">
          <button class="danger small" onclick="deleteMgmtProd('${name.replace(/'/g,"\\'")}')">삭제</button>
        </div>
      </td>
    </tr>`
  }).join('')
}
window.renderMgmtProdTable=renderMgmtProdTable

window.addProdPart=async function(name,key){
  const sel=document.getElementById('pp_'+key)
  const qty=parseInt((document.getElementById('pq_'+key)||{value:1}).value)||1
  const part=sel?sel.value:''
  if(!part){showToast('부품을 선택하세요','warn');return}
  if(!S.products[name])S.products[name]={}
  S.products[name][part]=qty
  sel.value='';await save();renderMgmtProdTable();showToast(part+' 추가됨')
}
window.removeProdPart=async function(name,part){
  if(S.products[name])delete S.products[name][part]
  await save();renderMgmtProdTable()
}
window.deleteMgmtProd=async function(name){
  if(!confirm(name+' 제품을 삭제할까요?'))return
  delete S.products[name];await save();renderMgmtProdTable();showToast(name+' 삭제됨')
}

// ══════════════════════════════════════════════════════
// 엑셀
// ══════════════════════════════════════════════════════
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
  XLSX.writeFile(wb,'보루네오_재고관리_'+new Date().toLocaleDateString('ko-KR').replace(/\.\s*/g,'-').replace(/-$/,'')+'.xlsx')
  showToast('엑셀 파일 다운로드 완료')
}

// ══════════════════════════════════════════════════════
// 유틸
// ══════════════════════════════════════════════════════
function mc(label,val,color){return`<div class="metric"><div class="metric-label">${label}</div><div class="metric-val"${color?` style="color:${color}"`:''}>${val}</div></div>`}
let toastTimer
function showToast(msg,type){
  clearTimeout(toastTimer)
  let t=document.getElementById('_toast')
  if(!t){t=document.createElement('div');t.id='_toast';t.style.cssText='position:fixed;bottom:20px;right:20px;padding:10px 18px;border-radius:8px;font-size:14px;z-index:300;display:none;';document.body.appendChild(t)}
  if(type==='warn'){t.style.background='#fef3c7';t.style.color='#92400e';t.style.border='1px solid #f59e0b'}
  else{t.style.background='#d1fae5';t.style.color='#065f46';t.style.border='1px solid #10b981'}
  t.textContent=msg;t.style.display='block'
  toastTimer=setTimeout(()=>t.style.display='none',2500)
}

window.addEventListener('resize',()=>{if(document.getElementById('tab-분석').classList.contains('active'))renderMonthlyChart()})
setGlobalPeriod('일별')
load()
