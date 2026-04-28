// src/main.js
import { db } from './firebase.js'
import {
  doc, getDoc, setDoc, onSnapshot
} from 'firebase/firestore'
import * as XLSX from 'xlsx'

// ─── 상태 ───────────────────────────────────────────
const DOC_REF = doc(db, 'borneo', 'data')

let S = { parts: {}, products: {}, history: [], inHistory: [], drivers: [] }
let gPeriod = '일별', gOffset = 0
let selectedDriver = null, dPeriod = '일별', dOffset = 0
let bulkRows = [{ part: '', qty: 1 }]
let unsubscribe = null

const DP = {
  '프레임(대)': { qty: 80, min: 10 }, '프레임(소)': { qty: 75, min: 10 },
  '사이드레일 L': { qty: 60, min: 8 }, '사이드레일 R': { qty: 60, min: 8 },
  '헤드보드': { qty: 45, min: 5 }, '풋보드': { qty: 40, min: 5 },
  '슬랫(12개입)': { qty: 50, min: 6 }, '중간지지대': { qty: 55, min: 8 },
  '볼트세트A': { qty: 120, min: 20 }, '볼트세트B': { qty: 110, min: 20 },
  '서랍(좌)': { qty: 35, min: 5 }, '서랍(우)': { qty: 35, min: 5 },
  '다리(4개입)': { qty: 48, min: 6 }, '매트지지판': { qty: 30, min: 4 },
  '조립설명서': { qty: 200, min: 30 }
}
const DPR = {
  'A형 침대 싱글': { '프레임(대)': 1, '사이드레일 L': 1, '사이드레일 R': 1, '슬랫(12개입)': 1, '볼트세트A': 1, '조립설명서': 1 },
  'A형 침대 퀸': { '프레임(대)': 1, '프레임(소)': 1, '사이드레일 L': 1, '사이드레일 R': 1, '슬랫(12개입)': 2, '볼트세트A': 1, '조립설명서': 1 },
  'B형 침대 서랍형': { '프레임(대)': 1, '사이드레일 L': 1, '사이드레일 R': 1, '서랍(좌)': 1, '서랍(우)': 1, '볼트세트B': 1, '조립설명서': 1 },
  'C형 침대 헤드보드형': { '프레임(대)': 1, '헤드보드': 1, '풋보드': 1, '사이드레일 L': 1, '사이드레일 R': 1, '슬랫(12개입)': 1, '볼트세트A': 1, '중간지지대': 1, '조립설명서': 1 },
  'D형 침대 다리형': { '매트지지판': 1, '다리(4개입)': 1, '볼트세트B': 1, '조립설명서': 1 }
}

// ─── Firebase 저장/불러오기 ──────────────────────────
async function loadFromFirestore() {
  setSS('loading', '데이터 불러오는 중...')
  try {
    const snap = await getDoc(DOC_REF)
    if (snap.exists()) {
      const d = snap.data()
      S.parts = d.parts || DP
      S.products = d.products || DPR
      S.history = d.history || []
      S.inHistory = d.inHistory || []
      S.drivers = d.drivers || []
    } else {
      S.parts = JSON.parse(JSON.stringify(DP))
      S.products = JSON.parse(JSON.stringify(DPR))
      S.history = []; S.inHistory = []; S.drivers = []
      await saveToFirestore()
    }
    setSS('live', '실시간 동기화 중')
    refreshUI()
    startRealtime()
  } catch (e) {
    console.error(e)
    setSS('error', '연결 실패 — 새로고침 해주세요')
  }
}

async function saveToFirestore() {
  await setDoc(DOC_REF, {
    parts: S.parts,
    products: S.products,
    history: S.history.slice(0, 300),
    inHistory: S.inHistory.slice(0, 300),
    drivers: S.drivers
  })
}

function startRealtime() {
  if (unsubscribe) unsubscribe()
  unsubscribe = onSnapshot(DOC_REF, (snap) => {
    if (!snap.exists()) return
    const d = snap.data()
    S.parts = d.parts || {}
    S.products = d.products || {}
    S.history = d.history || []
    S.inHistory = d.inHistory || []
    S.drivers = d.drivers || []
    setSS('live', '실시간 동기화 중')
    refreshUI()
  })
}

// ─── UI 상태 ────────────────────────────────────────
function setSS(s, msg) {
  const dot = document.getElementById('syncDot')
  const txt = document.getElementById('syncText')
  dot.className = 'dot ' + s
  txt.textContent = msg
  if (s === 'live') {
    document.getElementById('syncTime').textContent =
      '마지막 동기화 ' + new Date().toLocaleTimeString('ko-KR')
  }
}

function refreshUI() {
  renderAlerts()
  populateDriverSelect()
  populateProductSelect()
  populateInPartSelect()
  renderBulkRows()
  initYearSelect()
  const act = document.querySelector('.section.active')
  if (!act) return
  const id = act.id
  if (id === 'tab-재고') { renderSummary(); renderInventory() }
  if (id === 'tab-분석') renderAnalysis()
  if (id === 'tab-전체통계') renderGlobal()
  if (id === 'tab-기사통계') renderDriverStatPage()
  if (id === 'tab-이력') renderHistory()
  if (id === 'tab-입고이력') renderInHistory()
  if (id === 'tab-관리') { renderDriverChips(); renderProdList(); renderPartSlots() }
  updatePreview()
}

window.showTab = function (name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'))
  event.target.classList.add('active')
  document.getElementById('tab-' + name).classList.add('active')
  if (name === '재고') { renderSummary(); renderInventory() }
  if (name === '분석') renderAnalysis()
  if (name === '전체통계') renderGlobal()
  if (name === '기사통계') renderDriverStatPage()
  if (name === '이력') renderHistory()
  if (name === '입고이력') renderInHistory()
  if (name === '관리') { renderDriverChips(); renderProdList(); renderPartSlots() }
}

// ─── 알림 배너 ──────────────────────────────────────
function renderAlerts() {
  const empty = Object.entries(S.parts).filter(([, p]) => p.qty === 0)
  const low = Object.entries(S.parts).filter(([, p]) => p.qty > 0 && p.qty <= p.min)
  let h = ''
  if (empty.length) h += `<div class="alert-banner err">재고 소진 ${empty.length}종: ${empty.map(([n]) => n).join(', ')}</div>`
  if (low.length) h += `<div class="alert-banner warn">재고 부족 ${low.length}종: ${low.map(([n]) => n).join(', ')}</div>`
  document.getElementById('alertBanners').innerHTML = h
}

// ─── 출고 처리 ──────────────────────────────────────
function populateDriverSelect() {
  const sel = document.getElementById('driverSelect'), cur = sel.value
  sel.innerHTML = '<option value="">-- 기사를 선택하세요 --</option>'
  S.drivers.slice().sort().forEach(d => {
    const o = document.createElement('option')
    o.value = d; o.textContent = d
    if (d === cur) o.selected = true
    sel.appendChild(o)
  })
}

function populateProductSelect() {
  const sel = document.getElementById('productSelect'), cur = sel.value
  sel.innerHTML = '<option value="">-- 제품을 선택하세요 --</option>'
  Object.keys(S.products).sort().forEach(p => {
    const o = document.createElement('option')
    o.value = p; o.textContent = p
    if (p === cur) o.selected = true
    sel.appendChild(o)
  })
}

window.updatePreview = function () {
  const prod = document.getElementById('productSelect').value
  const qty = parseInt(document.getElementById('qty').value) || 1
  const area = document.getElementById('previewArea')
  if (!prod || !S.products[prod]) { area.innerHTML = ''; return }
  const parts = S.products[prod]
  let html = `<div class="preview-box"><div style="font-size:13px;font-weight:500;color:var(--color-text-secondary);margin-bottom:8px;">차감될 부품 (${qty}세트)</div>`
  let hasShort = false
  Object.entries(parts).forEach(([part, n]) => {
    const total = n * qty, stock = S.parts[part] ? S.parts[part].qty : 0
    const short = stock < total; if (short) hasShort = true
    html += `<div class="prow"><span>${part}</span><span style="color:${short ? 'var(--color-text-danger)' : 'var(--color-text-primary)'};">${total}개 (재고 ${stock})</span></div>`
  })
  html += '</div>'
  if (hasShort) html += '<div class="warn-text">재고 부족 부품이 있습니다.</div>'
  area.innerHTML = html
}

window.processShipment = async function () {
  const prod = document.getElementById('productSelect').value
  const qty = parseInt(document.getElementById('qty').value) || 1
  const driver = document.getElementById('driverSelect').value
  const addr = document.getElementById('deliveryAddr').value.trim()
  const customer = document.getElementById('customerName').value.trim()
  const note = document.getElementById('shipNote').value.trim()
  if (!driver) { showToast('기사를 선택해주세요.', 'warn'); return }
  if (!prod) { showToast('제품을 선택해주세요.', 'warn'); return }
  const btn = document.getElementById('shipBtn')
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>'
  const parts = S.products[prod]
  Object.entries(parts).forEach(([part, n]) => {
    if (!S.parts[part]) S.parts[part] = { qty: 0, min: 0 }
    S.parts[part].qty = Math.max(0, S.parts[part].qty - n * qty)
  })
  S.history.unshift({
    time: new Date().toLocaleString('ko-KR'),
    driver, prod, qty, addr, customer, note,
    parts: Object.entries(parts).map(([p, n]) => `${p} x${n * qty}`).join(', ')
  })
  await saveToFirestore()
  ;['driverSelect', 'productSelect', 'deliveryAddr', 'customerName', 'shipNote'].forEach(id => document.getElementById(id).value = '')
  document.getElementById('qty').value = 1
  document.getElementById('previewArea').innerHTML = ''
  btn.disabled = false; btn.textContent = '출고 처리'
  showToast(`${driver} 기사 — ${prod} ${qty}세트 출고 완료`)
}

// ─── 입고 처리 ──────────────────────────────────────
function populateInPartSelect() {
  const sel = document.getElementById('inPartSelect'), cur = sel.value
  sel.innerHTML = '<option value="">-- 부품을 선택하세요 --</option>'
  Object.keys(S.parts).sort().forEach(p => {
    const o = document.createElement('option')
    o.value = p; o.textContent = p
    if (p === cur) o.selected = true
    sel.appendChild(o)
  })
}

window.renderInPreview = function () {
  const part = document.getElementById('inPartSelect').value
  const qty = parseInt(document.getElementById('inQty').value) || 0
  const el = document.getElementById('inPreview')
  if (!part || !S.parts[part]) { el.innerHTML = ''; return }
  const cur = S.parts[part].qty
  el.innerHTML = `<div class="preview-box"><div class="prow"><span>현재 재고</span><span>${cur}개</span></div><div class="prow"><span>입고 후 재고</span><span style="font-weight:500;color:var(--color-text-success);">${cur + qty}개</span></div></div>`
}

window.processInbound = async function () {
  const part = document.getElementById('inPartSelect').value
  const qty = parseInt(document.getElementById('inQty').value) || 0
  const supplier = document.getElementById('inSupplier').value.trim()
  const note = document.getElementById('inNote').value.trim()
  if (!part) { showToast('부품을 선택해주세요.', 'warn'); return }
  if (qty <= 0) { showToast('수량을 입력해주세요.', 'warn'); return }
  const btn = document.getElementById('inBtn')
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>'
  if (!S.parts[part]) S.parts[part] = { qty: 0, min: 0 }
  S.parts[part].qty += qty
  S.inHistory.unshift({ time: new Date().toLocaleString('ko-KR'), part, qty, supplier, note, type: '단건' })
  await saveToFirestore()
  document.getElementById('inPartSelect').value = ''
  document.getElementById('inQty').value = 1
  document.getElementById('inSupplier').value = ''
  document.getElementById('inNote').value = ''
  document.getElementById('inPreview').innerHTML = ''
  btn.disabled = false; btn.textContent = '입고 처리'
  showToast(`${part} ${qty}개 입고 완료`)
}

function renderBulkRows() {
  const pn = Object.keys(S.parts).sort()
  document.getElementById('bulkInRows').innerHTML = bulkRows.map((r, i) =>
    `<div class="part-row"><select onchange="bulkRows[${i}].part=this.value" style="flex:1;font-size:13px;"><option value="">-- 부품 선택 --</option>${pn.map(p => `<option value="${p}"${r.part === p ? ' selected' : ''}>${p}</option>`).join('')}</select><input type="number" min="1" value="${r.qty}" style="width:70px;" onchange="bulkRows[${i}].qty=parseInt(this.value)||1"><button class="danger" onclick="removeBulkRow(${i})">X</button></div>`
  ).join('')
}
window.addBulkRow = () => { bulkRows.push({ part: '', qty: 1 }); renderBulkRows() }
window.removeBulkRow = (i) => { bulkRows.splice(i, 1); if (!bulkRows.length) bulkRows.push({ part: '', qty: 1 }); renderBulkRows() }

window.processBulkInbound = async function () {
  const valid = bulkRows.filter(r => r.part && r.qty > 0)
  if (!valid.length) { showToast('부품을 선택해주세요.', 'warn'); return }
  const time = new Date().toLocaleString('ko-KR')
  valid.forEach(r => {
    if (!S.parts[r.part]) S.parts[r.part] = { qty: 0, min: 0 }
    S.parts[r.part].qty += r.qty
    S.inHistory.unshift({ time, part: r.part, qty: r.qty, supplier: '', note: '일괄입고', type: '일괄' })
  })
  await saveToFirestore()
  bulkRows = [{ part: '', qty: 1 }]; renderBulkRows()
  showToast(`일괄 입고 완료 (${valid.length}종)`)
}

function renderInHistory() {
  const q = (document.getElementById('inHistSearch').value || '').toLowerCase()
  const el = document.getElementById('inHistoryList')
  const filtered = S.inHistory.filter(h => !q || h.part.toLowerCase().includes(q) || (h.supplier || '').toLowerCase().includes(q))
  if (!filtered.length) { el.innerHTML = '<div class="empty-state">입고 이력이 없습니다.</div>'; return }
  el.innerHTML = filtered.slice(0, 100).map(h =>
    `<div class="history-item"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;"><span style="font-weight:500;">${h.part}</span><span class="tag">+${h.qty}개</span>${h.supplier ? `<span class="tag">${h.supplier}</span>` : ''}<span style="margin-left:auto;font-size:12px;color:var(--color-text-secondary);">${h.time}</span></div>${h.note && h.note !== '일괄입고' ? `<div style="font-size:13px;color:var(--color-text-secondary);">${h.note}</div>` : ''}</div>`
  ).join('')
}
window.renderInHistory = renderInHistory

// ─── 재고 현황 ──────────────────────────────────────
function renderSummary() {
  const vals = Object.values(S.parts), total = vals.length
  const low = vals.filter(p => p.qty > 0 && p.qty <= p.min).length
  const empty = vals.filter(p => p.qty === 0).length
  document.getElementById('summaryCards').innerHTML =
    mc('전체 부품', total + '종') + mc('정상', (total - low - empty) + '종', 'var(--color-text-success)') +
    mc('부족', low + '종', 'var(--color-text-warning)') + mc('소진', empty + '종', 'var(--color-text-danger)')
}

function renderInventory() {
  const q = (document.getElementById('searchPart').value || '').toLowerCase()
  const fs = document.getElementById('filterStatus').value
  const tbody = document.getElementById('inventoryBody')
  let entries = Object.entries(S.parts).filter(([n]) => n.toLowerCase().includes(q))
  if (fs === '정상') entries = entries.filter(([, p]) => p.qty > p.min)
  else if (fs === '부족') entries = entries.filter(([, p]) => p.qty > 0 && p.qty <= p.min)
  else if (fs === '소진') entries = entries.filter(([, p]) => p.qty === 0)
  if (!entries.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state">검색 결과 없음</td></tr>'; return }
  tbody.innerHTML = entries.map(([name, p]) => {
    const status = p.qty === 0 ? '<span class="badge empty">소진</span>' : p.qty <= p.min ? '<span class="badge low">부족</span>' : '<span class="badge ok">정상</span>'
    return `<tr><td>${name}</td><td style="font-weight:500;">${p.qty}</td><td style="color:var(--color-text-secondary);">${p.min}</td><td>${status}</td><td><button class="danger" onclick="quickEdit('${name.replace(/'/g, "\\'")}')">수정</button></td></tr>`
  }).join('')
}
window.renderInventory = renderInventory

window.quickEdit = async function (name) {
  const p = S.parts[name]
  const nq = prompt(name + ' 현재 재고 수정:', p.qty)
  if (nq === null) return
  const n = parseInt(nq)
  if (isNaN(n) || n < 0) { alert('올바른 숫자를 입력하세요.'); return }
  S.parts[name].qty = n
  await saveToFirestore()
  renderSummary(); renderInventory(); renderAlerts()
  showToast(name + ' 수정 완료')
}

// ─── 분석 리포트 ────────────────────────────────────
function renderAnalysis() {
  renderPrediction(); renderProductAnalysis(); renderMonthlyChart(); renderDriverReport()
}

function parseDate(t) {
  const p = t.split(/[.\s:/년월일]+/).filter(Boolean)
  if (p.length >= 3) return { y: parseInt(p[0]), m: parseInt(p[1]), d: parseInt(p[2]) }
  return null
}
function parseDate2(t) {
  const dt = parseDate(t); if (!dt) return null
  return new Date(dt.y, dt.m - 1, dt.d)
}

window.renderPrediction = function () {
  const days = parseInt(document.getElementById('predictDays').value) || 30
  const now = new Date(), cutoff = new Date(now.getTime() - days * 86400000)
  const partUsage = {}
  S.history.forEach(h => {
    const dt = parseDate2(h.time); if (!dt || dt < cutoff) return
    if (!S.products[h.prod]) return
    Object.entries(S.products[h.prod]).forEach(([part, n]) => {
      partUsage[part] = (partUsage[part] || 0) + n * h.qty
    })
  })
  const results = []
  Object.entries(S.parts).forEach(([name, p]) => {
    const used = partUsage[name] || 0
    if (used === 0) { results.push({ name, stock: p.qty, daysLeft: Infinity, dailyRate: 0 }); return }
    const dailyRate = used / days
    results.push({ name, stock: p.qty, daysLeft: Math.floor(p.qty / dailyRate), dailyRate: dailyRate.toFixed(2) })
  })
  results.sort((a, b) => a.daysLeft - b.daysLeft)
  const el = document.getElementById('predictionList')
  const finite = results.filter(r => r.daysLeft !== Infinity)
  const infinite = results.filter(r => r.daysLeft === Infinity)
  let html = ''
  if (!finite.length) { html = `<div style="font-size:13px;color:var(--color-text-secondary);">최근 ${days}일간 출고 이력이 없습니다.</div>` }
  else {
    finite.forEach(r => {
      const cls = r.daysLeft <= 7 ? 'danger' : r.daysLeft <= 30 ? 'warn' : 'ok'
      html += `<div class="predict-card"><div class="predict-days ${cls}">${r.daysLeft <= 0 ? '0' : r.daysLeft <= 999 ? r.daysLeft : '∞'}</div><div class="predict-info"><div class="predict-name">${r.name}</div><div class="predict-detail">현재 재고 ${r.stock}개 · 일평균 ${r.dailyRate}개 · ${r.daysLeft <= 0 ? '소진됨' : r.daysLeft + '일 후 소진'}</div></div></div>`
    })
  }
  if (infinite.length) html += `<div style="font-size:13px;color:var(--color-text-secondary);margin-top:8px;">미사용 부품 ${infinite.length}종: ${infinite.map(r => r.name).join(', ')}</div>`
  el.innerHTML = html
}

window.renderProductAnalysis = function () {
  const p = parseInt(document.getElementById('productAnalysisPeriod').value) || 0
  const now = new Date(), cutoff = p ? new Date(now.getTime() - p * 86400000) : null
  const filtered = cutoff ? S.history.filter(h => { const dt = parseDate2(h.time); return dt && dt >= cutoff }) : S.history
  const pMap = {}
  filtered.forEach(h => { pMap[h.prod] = (pMap[h.prod] || 0) + h.qty })
  Object.keys(S.products).forEach(p => { if (!pMap[p]) pMap[p] = 0 })
  const arr = Object.entries(pMap).sort((a, b) => b[1] - a[1])
  if (!arr.length) { document.getElementById('productAnalysis').innerHTML = '<div class="empty-state">데이터 없음</div>'; return }
  const max = arr[0][1] || 1
  let html = '<div style="margin-bottom:16px;">'
  arr.forEach(([name, qty], i) => {
    const isHot = i < 3 && qty > 0, isCold = qty === 0
    const color = isHot ? '#E74C3C' : isCold ? '#AEB6BF' : '#378ADD'
    html += `<div class="bar-wrap"><span class="bar-label" style="min-width:150px;">${name}${isHot ? ' 🔥' : isCold ? ' 🧊' : ''}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(qty / max * 100)}%;background:${color};"></div></div><span class="bar-val">${qty}세트</span></div>`
  })
  html += '</div>'
  const hot = arr.slice(0, 3).filter(h => h[1] > 0)
  const cold = arr.filter(a => a[1] === 0)
  if (hot.length) html += `<div style="margin-bottom:8px;"><span style="font-size:13px;font-weight:500;">🔥 인기: </span><span style="font-size:13px;color:var(--color-text-secondary);">${hot.map(([n, q]) => n + ' (' + q + '세트)').join(' · ')}</span></div>`
  if (cold.length) html += `<div><span style="font-size:13px;font-weight:500;">🧊 미출고: </span><span style="font-size:13px;color:var(--color-text-secondary);">${cold.map(([n]) => n).join(', ')}</span></div>`
  document.getElementById('productAnalysis').innerHTML = html
}

function initYearSelect() {
  const sel = document.getElementById('monthlyChartYear')
  const years = [...new Set(S.history.map(h => { const dt = parseDate(h.time); return dt ? dt.y : null }).filter(Boolean))].sort((a, b) => b - a)
  if (!years.length) years.push(new Date().getFullYear())
  const cur = sel.value || String(years[0])
  sel.innerHTML = years.map(y => `<option value="${y}"${String(y) === cur ? ' selected' : ''}>${y}년</option>`).join('')
}

window.renderMonthlyChart = function () {
  const year = parseInt(document.getElementById('monthlyChartYear').value) || new Date().getFullYear()
  const monthly = new Array(12).fill(0)
  S.history.forEach(h => {
    const dt = parseDate(h.time)
    if (!dt || dt.y !== year) return
    monthly[dt.m - 1] += h.qty
  })
  const canvas = document.getElementById('monthlyCanvas')
  const W = canvas.parentElement.offsetWidth || 600
  canvas.width = W; canvas.height = 200
  const ctx = canvas.getContext('2d')
  const pad = { t: 20, r: 20, b: 40, l: 50 }
  const cw = W - pad.l - pad.r, ch = 200 - pad.t - pad.b
  const max = Math.max(...monthly, 1)
  const barW = cw / 12 * 0.6, gap = cw / 12
  ctx.clearRect(0, 0, W, 200)
  for (let i = 0; i <= 5; i++) {
    const y = pad.t + ch - ch * (i / 5)
    ctx.strokeStyle = 'rgba(128,128,128,0.15)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cw, y); ctx.stroke()
    ctx.fillStyle = 'rgba(128,128,128,0.7)'; ctx.font = '11px sans-serif'; ctx.textAlign = 'right'
    ctx.fillText(Math.round(max * i / 5), pad.l - 6, y + 4)
  }
  monthly.forEach((v, i) => {
    const x = pad.l + i * gap + gap / 2 - barW / 2
    const h2 = v === 0 ? 0 : Math.max(4, ch * (v / max))
    const y = pad.t + ch - h2
    const grad = ctx.createLinearGradient(0, y, 0, y + h2)
    grad.addColorStop(0, '#378ADD'); grad.addColorStop(1, '#1A5FA8')
    ctx.fillStyle = grad
    if (ctx.roundRect) ctx.roundRect(x, y, barW, h2, 3); else ctx.rect(x, y, barW, h2)
    ctx.fill()
    if (v > 0) { ctx.fillStyle = 'var(--color-text-primary)'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(v, x + barW / 2, y - 5) }
    ctx.fillStyle = 'rgba(128,128,128,0.8)'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText((i + 1) + '월', x + barW / 2, pad.t + ch + 18)
  })
}

window.renderDriverReport = function () {
  const p = parseInt(document.getElementById('reportPeriod').value) || 0
  const now = new Date(), cutoff = p ? new Date(now.getTime() - p * 86400000) : null
  const filtered = cutoff ? S.history.filter(h => { const dt = parseDate2(h.time); return dt && dt >= cutoff }) : S.history
  const allDrivers = [...new Set([...S.drivers, ...filtered.map(h => h.driver)])].sort()
  if (!allDrivers.length) { document.getElementById('driverReport').innerHTML = '<div class="empty-state">기사 데이터가 없습니다.</div>'; return }
  const dStats = {}
  allDrivers.forEach(d => { dStats[d] = { total: 0, days: new Set(), products: {} } })
  filtered.forEach(h => {
    if (!dStats[h.driver]) dStats[h.driver] = { total: 0, days: new Set(), products: {} }
    dStats[h.driver].total += h.qty
    const dt = parseDate(h.time); if (dt) dStats[h.driver].days.add(`${dt.y}-${dt.m}-${dt.d}`)
    dStats[h.driver].products[h.prod] = (dStats[h.driver].products[h.prod] || 0) + h.qty
  })
  const arr = Object.entries(dStats).sort((a, b) => b[1].total - a[1].total)
  const maxTotal = arr.length ? arr[0][1].total : 1
  const rc = ['🥇', '🥈', '🥉']
  let html = ''
  arr.forEach(([name, d], i) => {
    const activeDays = d.days.size
    const avg = activeDays ? Math.round(d.total / activeDays * 10) / 10 : 0
    const topProd = Object.entries(d.products).sort((a, b) => b[1] - a[1])[0]
    const pct = Math.round(d.total / maxTotal * 100)
    html += `<div class="report-driver"><div class="report-driver-header"><span class="report-driver-name">${rc[i] || '👷'} ${name} 기사</span><span class="tag">${d.total}세트</span></div><div class="report-grid"><div class="report-metric"><div class="report-metric-val" style="color:var(--color-text-info);">${d.total}</div><div class="report-metric-label">총 출고 세트</div></div><div class="report-metric"><div class="report-metric-val">${activeDays}</div><div class="report-metric-label">출고 활동일</div></div><div class="report-metric"><div class="report-metric-val">${avg}</div><div class="report-metric-label">일평균 세트</div></div></div><div class="bar-wrap" style="margin-bottom:6px;"><div class="bar-track" style="height:10px;"><div class="bar-fill" style="width:${pct}%;background:#378ADD;height:10px;"></div></div><span class="bar-val">${pct}%</span></div>${topProd ? `<div style="font-size:13px;color:var(--color-text-secondary);">주력 제품: <strong>${topProd[0]}</strong> (${topProd[1]}세트)</div>` : ''}</div>`
  })
  document.getElementById('driverReport').innerHTML = html
}

// ─── 전체/기사 통계 ─────────────────────────────────
function dateKey(t, mode) {
  const dt = parseDate(t); if (!dt) return t
  if (mode === '년별') return String(dt.y)
  if (mode === '월별') return dt.y + '-' + String(dt.m).padStart(2, '0')
  return dt.y + '-' + String(dt.m).padStart(2, '0') + '-' + String(dt.d).padStart(2, '0')
}
function currentKey(period, offset) {
  const now = new Date()
  if (period === '일별') { const d = new Date(now); d.setDate(d.getDate() + offset); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }
  if (period === '월별') { const d = new Date(now.getFullYear(), now.getMonth() + offset, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') }
  return String(now.getFullYear() + offset)
}
function displayLabel(key, period) {
  if (period === '년별') return key + '년'
  if (period === '월별') { const [y, m] = key.split('-'); return y + '년 ' + parseInt(m) + '월' }
  const [y, m, d] = key.split('-'); return y + '년 ' + parseInt(m) + '월 ' + parseInt(d) + '일'
}
window.setGlobalPeriod = function (p) {
  gPeriod = p; gOffset = 0
  document.querySelectorAll('[id^="gp-"]').forEach(b => b.classList.remove('active'))
  document.getElementById('gp-' + p).classList.add('active')
  renderGlobal()
}
window.navGlobal = (dir) => { gOffset += dir; renderGlobal() }

function renderGlobal() {
  const key = currentKey(gPeriod, gOffset)
  document.getElementById('gNavLabel').textContent = displayLabel(key, gPeriod)
  const filtered = S.history.filter(h => dateKey(h.time, gPeriod) === key)
  const totalSets = filtered.reduce((s, h) => s + h.qty, 0)
  document.getElementById('gSummary').innerHTML = mc('총 출고', totalSets + '세트') + mc('출고 기사', new Set(filtered.map(h => h.driver)).size + '명') + mc('출고 제품', new Set(filtered.map(h => h.prod)).size + '종')
  const dMap = {}
  filtered.forEach(h => {
    if (!dMap[h.driver]) dMap[h.driver] = { total: 0, products: {} }
    dMap[h.driver].total += h.qty
    dMap[h.driver].products[h.prod] = (dMap[h.driver].products[h.prod] || 0) + h.qty
  })
  const dArr = Object.entries(dMap).sort((a, b) => b[1].total - a[1].total), maxD = dArr.length ? dArr[0][1].total : 1
  const rc = ['gold', 'silver', 'bronze']
  if (!dArr.length) { ['gDriverBars', 'gDriverTable', 'gProductBars'].forEach(id => document.getElementById(id).innerHTML = '<div class="empty-state">해당 기간 출고 내역이 없습니다.</div>'); return }
  document.getElementById('gDriverBars').innerHTML = dArr.map(([name, d], i) => `<div class="bar-wrap"><span class="rank-num ${rc[i] || ''}">${i + 1}</span><span class="bar-label">${name}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(d.total / maxD * 100)}%;background:#378ADD;"></div></div><span class="bar-val">${d.total}세트</span></div>`).join('')
  let tbl = '<table><thead><tr><th>기사</th><th>총 출고</th><th>제품별 내역</th></tr></thead><tbody>'
  dArr.forEach(([name, d]) => { tbl += `<tr><td style="font-weight:500;">${name}</td><td style="font-weight:500;color:var(--color-text-info);">${d.total}세트</td><td style="font-size:13px;color:var(--color-text-secondary);">${Object.entries(d.products).sort((a, b) => b[1] - a[1]).map(([p, q]) => p + ' ' + q + '세트').join(', ')}</td></tr>` })
  document.getElementById('gDriverTable').innerHTML = tbl + '</tbody></table>'
  const pMap = {}; filtered.forEach(h => { pMap[h.prod] = (pMap[h.prod] || 0) + h.qty })
  const pArr = Object.entries(pMap).sort((a, b) => b[1] - a[1]), maxP = pArr.length ? pArr[0][1] : 1
  document.getElementById('gProductBars').innerHTML = pArr.map(([name, qty]) => `<div class="bar-wrap"><span class="bar-label" style="min-width:140px;">${name}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(qty / maxP * 100)}%;background:#1D9E75;"></div></div><span class="bar-val">${qty}세트</span></div>`).join('')
}

function renderDriverStatPage() {
  const wrap = document.getElementById('driverTabBtns')
  const all = [...new Set([...S.drivers, ...S.history.map(h => h.driver)])].sort()
  if (!all.length) { wrap.innerHTML = '<div class="empty-state" style="padding:.5rem 0;">등록된 기사가 없습니다.</div>'; document.getElementById('driverStatContent').innerHTML = ''; return }
  if (!selectedDriver || !all.includes(selectedDriver)) selectedDriver = all[0]
  wrap.innerHTML = all.map(d => `<button class="driver-tab${d === selectedDriver ? ' active' : ''}" onclick="selectDriver('${d.replace(/'/g, "\\'")}')">${d}</button>`).join('')
  renderDriverStat()
}
window.selectDriver = (name) => { selectedDriver = name; dOffset = 0; renderDriverStatPage() }
window.setDriverPeriod = (p) => { dPeriod = p; dOffset = 0; document.querySelectorAll('[id^="dp-"]').forEach(b => b.classList.remove('active')); document.getElementById('dp-' + p).classList.add('active'); renderDriverStat() }
window.navDriver = (dir) => { dOffset += dir; renderDriverStat() }

function renderDriverStat() {
  const key = currentKey(dPeriod, dOffset)
  const dH = S.history.filter(h => h.driver === selectedDriver)
  const filtered = dH.filter(h => dateKey(h.time, dPeriod) === key)
  const totalAll = dH.reduce((s, h) => s + h.qty, 0), totalPeriod = filtered.reduce((s, h) => s + h.qty, 0)
  const pMap = {}; filtered.forEach(h => { pMap[h.prod] = (pMap[h.prod] || 0) + h.qty })
  let html = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:1rem;flex-wrap:wrap;"><button class="pbtn${dPeriod === '일별' ? ' active' : ''}" id="dp-일별" onclick="setDriverPeriod('일별')">일별</button><button class="pbtn${dPeriod === '월별' ? ' active' : ''}" id="dp-월별" onclick="setDriverPeriod('월별')">월별</button><button class="pbtn${dPeriod === '년별' ? ' active' : ''}" id="dp-년별" onclick="setDriverPeriod('년별')">년별</button><div class="nav-row" style="margin-left:auto;"><button class="secondary" onclick="navDriver(-1)">◀</button><span class="nav-label">${displayLabel(key, dPeriod)}</span><button class="secondary" onclick="navDriver(1)">▶</button></div></div>`
  html += `<div class="grid3">${mc('기간 출고', totalPeriod + '세트')}${mc('누적 출고', totalAll + '세트')}${mc('취급 제품', Object.keys(pMap).length + '종')}</div>`
  if (!filtered.length) { html += '<div class="card"><div class="empty-state">해당 기간 출고 내역이 없습니다.</div></div>'; document.getElementById('driverStatContent').innerHTML = html; return }
  const pArr = Object.entries(pMap).sort((a, b) => b[1] - a[1]), maxP = pArr.length ? pArr[0][1] : 1
  html += `<div class="card"><h3>제품별 출고량</h3>${pArr.map(([name, qty]) => `<div class="bar-wrap"><span class="bar-label" style="min-width:150px;">${name}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(qty / maxP * 100)}%;background:#534AB7;"></div></div><span class="bar-val">${qty}세트</span></div>`).join('')}</div>`
  html += `<div class="card"><h3>출고 내역</h3>${filtered.map(h => `<div class="timeline-row"><span class="timeline-date">${h.time.split(' ')[0]}</span><span class="tag">${h.prod} ${h.qty}세트</span>${h.customer ? `<span style="font-size:13px;color:var(--color-text-secondary);">${h.customer}</span>` : ''}</div>`).join('')}</div>`
  document.getElementById('driverStatContent').innerHTML = html
}

function renderHistory() {
  const q = (document.getElementById('histSearch').value || '').toLowerCase()
  const el = document.getElementById('historyList')
  const filtered = S.history.filter(h => !q || h.driver.toLowerCase().includes(q) || h.prod.toLowerCase().includes(q) || (h.customer || '').toLowerCase().includes(q))
  if (!filtered.length) { el.innerHTML = '<div class="empty-state">출고 이력이 없습니다.</div>'; return }
  el.innerHTML = filtered.slice(0, 100).map(h =>
    `<div class="history-item"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;"><span style="font-weight:500;">${h.driver} 기사</span><span class="tag">${h.prod} ${h.qty}세트</span>${h.customer ? `<span class="tag">${h.customer}</span>` : ''}<span style="margin-left:auto;font-size:12px;color:var(--color-text-secondary);">${h.time}</span></div>${h.addr ? `<div style="font-size:13px;color:var(--color-text-secondary);">배송: ${h.addr}</div>` : ''}${h.note ? `<div style="font-size:13px;color:var(--color-text-secondary);">메모: ${h.note}</div>` : ''}<div style="font-size:12px;color:var(--color-text-secondary);margin-top:2px;">${h.parts}</div></div>`
  ).join('')
}
window.renderHistory = renderHistory

// ─── 관리 ──────────────────────────────────────────
window.addDriver = async function () {
  const input = document.getElementById('newDriverName'), name = input.value.trim()
  if (!name) { showToast('기사명을 입력하세요.', 'warn'); return }
  if (S.drivers.includes(name)) { showToast('이미 등록된 기사입니다.', 'warn'); return }
  S.drivers.push(name); await saveToFirestore()
  input.value = ''; renderDriverChips(); populateDriverSelect()
  showToast(name + ' 기사 추가 완료')
}
window.removeDriver = async function (name) {
  if (!confirm(name + ' 기사를 삭제할까요?')) return
  S.drivers = S.drivers.filter(d => d !== name); await saveToFirestore()
  renderDriverChips(); populateDriverSelect()
  showToast(name + ' 삭제됨')
}
function renderDriverChips() {
  const wrap = document.getElementById('driverChips')
  if (!S.drivers.length) { wrap.innerHTML = '<div style="font-size:13px;color:var(--color-text-secondary);padding:8px 0;">등록된 기사가 없습니다.</div>'; return }
  wrap.innerHTML = S.drivers.slice().sort().map(d =>
    `<span class="driver-chip">${d}<button onclick="removeDriver('${d.replace(/'/g, "\\'")}')"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button></span>`
  ).join('')
}

window.addPart = async function () {
  const name = document.getElementById('newPartName').value.trim()
  const qty = parseInt(document.getElementById('newPartQty').value) || 0
  const min = parseInt(document.getElementById('newPartMin').value) || 0
  if (!name) { showToast('부품명을 입력하세요.', 'warn'); return }
  S.parts[name] = { qty, min }; await saveToFirestore()
  document.getElementById('newPartName').value = ''; document.getElementById('newPartQty').value = ''; document.getElementById('newPartMin').value = ''
  renderPartSlots(); populateInPartSelect(); renderAlerts()
  showToast(name + ' 저장 완료')
}

let partSlots = [{ part: '', qty: 1 }]
function renderPartSlots() {
  const pn = Object.keys(S.parts).sort()
  document.getElementById('prodPartsList').innerHTML = partSlots.map((s, i) =>
    `<div class="part-row"><select onchange="partSlots[${i}].part=this.value" style="flex:1;font-size:13px;"><option value="">-- 부품 선택 --</option>${pn.map(p => `<option value="${p}"${s.part === p ? ' selected' : ''}>${p}</option>`).join('')}</select><input type="number" min="1" value="${s.qty}" style="width:60px;" onchange="partSlots[${i}].qty=parseInt(this.value)||1"><button class="danger" onclick="removeSlot(${i})">X</button></div>`
  ).join('')
}
window.addPartSlot = () => { partSlots.push({ part: '', qty: 1 }); renderPartSlots() }
window.removeSlot = (i) => { partSlots.splice(i, 1); if (!partSlots.length) partSlots.push({ part: '', qty: 1 }); renderPartSlots() }
window.saveProduct = async function () {
  const name = document.getElementById('newProdName').value.trim()
  if (!name) { showToast('제품명을 입력하세요.', 'warn'); return }
  const c = {}; partSlots.forEach(s => { if (s.part) c[s.part] = s.qty })
  if (!Object.keys(c).length) { showToast('부품을 하나 이상 선택하세요.', 'warn'); return }
  S.products[name] = c; await saveToFirestore()
  document.getElementById('newProdName').value = ''; partSlots = [{ part: '', qty: 1 }]
  renderPartSlots(); renderProdList(); populateProductSelect()
  showToast(name + ' 제품 저장 완료')
}
function renderProdList() {
  const tbody = document.getElementById('prodListBody'), entries = Object.entries(S.products).sort()
  if (!entries.length) { tbody.innerHTML = '<tr><td colspan="3" class="empty-state">등록된 제품 없음</td></tr>'; return }
  tbody.innerHTML = entries.map(([name, parts]) =>
    `<tr><td>${name}</td><td style="font-size:13px;color:var(--color-text-secondary);">${Object.entries(parts).map(([p, n]) => p + (n > 1 ? 'x' + n : '')).join(', ')}</td><td><button class="danger" onclick="deleteProd('${name.replace(/'/g, "\\'")}')">삭제</button></td></tr>`
  ).join('')
}
window.deleteProd = async function (name) {
  if (!confirm(name + ' 제품을 삭제할까요?')) return
  delete S.products[name]; await saveToFirestore()
  renderProdList(); populateProductSelect()
  showToast(name + ' 삭제됨')
}

// ─── 엑셀 다운로드 ──────────────────────────────────
window.exportExcel = function () {
  const wb = XLSX.utils.book_new()
  const od = [['날짜', '기사', '제품', '수량(세트)', '고객명', '배송주소', '메모', '부품내역']]
  S.history.forEach(h => od.push([h.time, h.driver, h.prod, h.qty, h.customer || '', h.addr || '', h.note || '', h.parts]))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(od), '출고이력')
  const id2 = [['날짜', '부품명', '수량', '공급처', '메모', '구분']]
  S.inHistory.forEach(h => id2.push([h.time, h.part, h.qty, h.supplier || '', h.note || '', h.type || '']))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(id2), '입고이력')
  const sd = [['부품명', '현재재고', '최소재고', '상태']]
  Object.entries(S.parts).forEach(([n, p]) => sd.push([n, p.qty, p.min, p.qty === 0 ? '소진' : p.qty <= p.min ? '부족' : '정상']))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sd), '재고현황')
  const dMap = {}; S.history.forEach(h => { if (!dMap[h.driver]) dMap[h.driver] = 0; dMap[h.driver] += h.qty })
  const stD = [['기사명', '총 출고(세트)']]; Object.entries(dMap).sort((a, b) => b[1] - a[1]).forEach(([n, q]) => stD.push([n, q]))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(stD), '기사별통계')
  const date = new Date().toLocaleDateString('ko-KR').replace(/\.\s*/g, '-').replace(/-$/, '')
  XLSX.writeFile(wb, '보루네오_재고관리_' + date + '.xlsx')
  showToast('엑셀 파일 다운로드 완료')
}

// ─── 유틸 ───────────────────────────────────────────
function mc(label, val, color) {
  return `<div class="metric"><div class="metric-label">${label}</div><div class="metric-val"${color ? ` style="color:${color}"` : ''}>${val}</div></div>`
}

let toastTimer
function showToast(msg, type) {
  clearTimeout(toastTimer)
  let t = document.getElementById('_toast')
  if (!t) {
    t = document.createElement('div'); t.id = '_toast'
    t.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:10px 18px;border-radius:8px;font-size:14px;z-index:99;display:none;'
    document.body.appendChild(t)
  }
  if (type === 'warn') { t.style.background = '#FEF3C7'; t.style.color = '#92400E'; t.style.border = '1px solid #F59E0B' }
  else { t.style.background = '#D1FAE5'; t.style.color = '#065F46'; t.style.border = '1px solid #10B981' }
  t.textContent = msg; t.style.display = 'block'
  toastTimer = setTimeout(() => t.style.display = 'none', 2500)
}

// ─── 시작 ───────────────────────────────────────────
window.addEventListener('resize', () => {
  if (document.getElementById('tab-분석').classList.contains('active')) renderMonthlyChart()
})

loadFromFirestore()
