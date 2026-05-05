<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>보루네오 재고 관리</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;color:#111827;}
    .container{max-width:1100px;margin:0 auto;padding:1.5rem;}
    .tabs{display:flex;gap:3px;margin-bottom:1.5rem;border-bottom:1px solid #e5e7eb;flex-wrap:wrap;}
    .tab{padding:7px 11px;font-size:13px;cursor:pointer;border:none;background:none;color:#6b7280;border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap;}
    .tab.active{color:#111827;border-bottom-color:#111827;font-weight:500;}
    .section{display:none;}.section.active{display:block;}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1rem 1.25rem;margin-bottom:1rem;}
    .row{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;}
    select,input[type=text],input[type=number]{font-size:14px;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;background:#fff;color:#111827;}
    select{flex:1;}select:disabled{opacity:0.35;cursor:not-allowed;}
    button.primary{background:#111827;color:#fff;border:none;padding:9px 20px;border-radius:8px;font-size:14px;cursor:pointer;font-weight:500;}
    button.secondary{background:none;color:#111827;border:1px solid #d1d5db;padding:8px 14px;border-radius:8px;font-size:14px;cursor:pointer;}
    button.success{background:none;color:#065f46;border:1px solid #10b981;padding:8px 14px;border-radius:8px;font-size:13px;cursor:pointer;font-weight:500;}
    button.warning{background:none;color:#92400e;border:1px solid #f59e0b;padding:6px 12px;border-radius:8px;font-size:13px;cursor:pointer;}
    button.danger{background:none;color:#dc2626;border:1px solid #fca5a5;padding:6px 12px;border-radius:8px;font-size:13px;cursor:pointer;}
    button.small{padding:5px 10px;font-size:12px;}
    button:disabled{opacity:0.35;cursor:not-allowed;}
    .badge{font-size:12px;padding:3px 10px;border-radius:20px;font-weight:500;}
    .badge.ok{background:#d1fae5;color:#065f46;}.badge.low{background:#fef3c7;color:#92400e;}.badge.empty{background:#fee2e2;color:#991b1b;}
    .grid4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:1.5rem;}
    .grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:1rem;}
    .metric{background:#f3f4f6;border-radius:8px;padding:1rem;}
    .metric-label{font-size:13px;color:#6b7280;margin-bottom:6px;}
    .metric-val{font-size:22px;font-weight:500;}
    table{width:100%;border-collapse:collapse;font-size:14px;}
    th{text-align:left;padding:8px 10px;font-weight:500;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;}
    td{padding:9px 10px;border-bottom:1px solid #f3f4f6;vertical-align:middle;}
    tr:last-child td{border-bottom:none;}
    .part-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
    .sync-bar{display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f3f4f6;border-radius:8px;margin-bottom:1rem;font-size:13px;}
    .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
    .dot.live{background:#10b981;animation:pulse 2s infinite;}.dot.loading{background:#f59e0b;}.dot.error{background:#ef4444;}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
    .preview-box{background:#f3f4f6;border-radius:8px;padding:1rem;margin-top:10px;}
    .prow{display:flex;justify-content:space-between;font-size:14px;padding:4px 0;border-bottom:1px solid #e5e7eb;}
    .prow:last-child{border-bottom:none;}
    .alert-banner{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;margin-bottom:8px;font-size:13px;}
    .alert-banner.warn{background:#fef3c7;color:#92400e;border:1px solid #f59e0b;}
    .alert-banner.err{background:#fee2e2;color:#991b1b;border:1px solid #ef4444;}
    .history-item{padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;}
    .history-item:last-child{border-bottom:none;}
    .tag-sm{font-size:12px;background:#f3f4f6;color:#6b7280;padding:2px 8px;border-radius:12px;}
    h3{font-size:15px;font-weight:500;margin-bottom:12px;}
    .empty-state{text-align:center;padding:2rem;color:#9ca3af;font-size:14px;}
    .spinner{display:inline-block;width:14px;height:14px;border:2px solid #e5e7eb;border-top-color:#111827;border-radius:50%;animation:spin .7s linear infinite;}
    @keyframes spin{to{transform:rotate(360deg)}}
    .pbtn{padding:6px 14px;font-size:13px;border:1px solid #d1d5db;border-radius:8px;background:none;color:#6b7280;cursor:pointer;}
    .pbtn.active{background:#111827;color:#fff;border-color:#111827;}
    .bar-wrap{display:flex;align-items:center;gap:8px;margin-bottom:7px;}
    .bar-label{font-size:13px;min-width:90px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .bar-track{flex:1;background:#f3f4f6;border-radius:4px;height:14px;overflow:hidden;}
    .bar-fill{height:14px;border-radius:4px;transition:width .3s;}
    .bar-val{font-size:13px;color:#6b7280;min-width:42px;text-align:right;}
    .rank-num{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;font-size:12px;font-weight:500;flex-shrink:0;margin-right:4px;background:#f3f4f6;color:#6b7280;}
    .rank-num.gold{background:#fef3c7;color:#92400e;}.rank-num.silver{background:#f3f4f6;color:#6b7280;}.rank-num.bronze{background:#fee2e2;color:#991b1b;}
    .driver-chip{display:inline-flex;align-items:center;gap:6px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:20px;padding:5px 10px 5px 12px;font-size:14px;margin:4px;}
    .driver-chip button{background:none;border:none;cursor:pointer;color:#9ca3af;padding:0;line-height:1;display:flex;align-items:center;}
    .nav-row{display:flex;align-items:center;gap:8px;}
    .nav-row button{padding:5px 12px;font-size:13px;}
    .nav-label{font-size:14px;font-weight:500;min-width:110px;text-align:center;}
    .driver-tab{padding:7px 14px;font-size:13px;cursor:pointer;border:1px solid #d1d5db;border-radius:8px;background:none;color:#6b7280;margin:3px;}
    .driver-tab.active{background:#eff6ff;color:#1d4ed8;border-color:#93c5fd;}
    .timeline-row{display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #f3f4f6;font-size:14px;flex-wrap:wrap;}
    .timeline-row:last-child{border-bottom:none;}
    .chart-wrap{width:100%;overflow-x:auto;margin-top:8px;}
    .predict-card{border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;}
    .predict-days{font-size:24px;font-weight:600;min-width:50px;text-align:center;}
    .predict-days.danger{color:#dc2626;}.predict-days.warn{color:#d97706;}.predict-days.ok{color:#10b981;}
    .predict-info{flex:1;}.predict-name{font-size:14px;font-weight:500;margin-bottom:3px;}.predict-detail{font-size:12px;color:#6b7280;}
    .report-driver{border:1px solid #e5e7eb;border-radius:12px;padding:1rem;margin-bottom:1rem;}
    .report-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;}
    .report-metric{background:#f3f4f6;border-radius:8px;padding:10px;text-align:center;}
    .report-metric-val{font-size:20px;font-weight:600;margin-bottom:2px;}
    .report-metric-label{font-size:11px;color:#6b7280;}
    .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:200;}
    .modal{background:#fff;border-radius:12px;padding:1.5rem;width:420px;max-width:95vw;box-shadow:0 8px 32px rgba(0,0,0,0.18);max-height:90vh;overflow-y:auto;}
    .modal h4{font-size:16px;font-weight:500;margin-bottom:1.2rem;}
    .modal-label{font-size:13px;color:#6b7280;margin-bottom:4px;display:block;}
    .modal-field{margin-bottom:12px;}
    .modal-field input,.modal-field select{width:100%;}
    .modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;}
    .modal-actions{display:flex;gap:8px;justify-content:flex-end;}
    /* 계층 선택 */
    .step-wrap{display:flex;gap:10px;align-items:flex-start;margin-bottom:10px;}
    .step-badge{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0;margin-top:20px;background:#111827;color:#fff;}
    .step-inner{flex:1;}.step-inner label{display:block;font-size:13px;color:#6b7280;margin-bottom:5px;font-weight:500;}
    .result-sel{background:#f0fdf4;border-radius:8px;padding:1rem;margin-top:10px;border:1px solid #bbf7d0;}
    .result-sel-title{font-size:15px;font-weight:600;color:#065f46;margin-bottom:4px;}
    .result-sel-path{font-size:12px;color:#6b7280;margin-bottom:8px;}
    /* 묶음 출고 */
    .cart-item{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#f3f4f6;border-radius:8px;margin-bottom:6px;flex-wrap:wrap;}
    .cart-item-name{flex:1;font-size:14px;font-weight:500;min-width:150px;}
    .cart-customer{font-size:12px;color:#6b7280;flex-basis:100%;margin-top:2px;}
    .parts-summary{width:100%;border-collapse:collapse;font-size:14px;}
    .parts-summary th{text-align:left;padding:8px 10px;font-size:13px;font-weight:500;color:#6b7280;border-bottom:1px solid #e5e7eb;}
    .parts-summary td{padding:9px 10px;border-bottom:1px solid #f3f4f6;vertical-align:middle;}
    .parts-summary tr.ps-warn td{background:#fff7ed;}.parts-summary tr.ps-err td{background:#fef2f2;}
    .qty-badge{display:inline-block;font-size:12px;font-weight:600;padding:2px 10px;border-radius:12px;}
    .qty-badge.ok{background:#d1fae5;color:#065f46;}.qty-badge.low{background:#fef3c7;color:#92400e;}.qty-badge.empty{background:#fee2e2;color:#991b1b;}
    .shared-badge{font-size:11px;padding:2px 7px;border-radius:10px;margin-left:6px;background:#eef2ff;color:#3730a3;}
    .unique-badge{font-size:11px;padding:2px 7px;border-radius:10px;margin-left:6px;background:#f0fdf4;color:#166534;}
    .divider{border:none;border-top:1px solid #e5e7eb;margin:14px 0;}
    .alert-box{padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:8px;}
    .alert-box.warn{background:#fef3c7;color:#92400e;border:1px solid #f59e0b;}
    .alert-box.err{background:#fee2e2;color:#991b1b;border:1px solid #ef4444;}
    /* 인쇄 */
    .print-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:500;padding:1rem;}
    .print-modal{background:#fff;border-radius:12px;width:100%;max-width:720px;max-height:92vh;overflow-y:auto;}
    .print-modal-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.5rem;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:#fff;z-index:10;}
    .print-modal-header h2{font-size:16px;font-weight:600;}
    .print-modal-body{padding:1.5rem;}
    .print-doc{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#111;font-size:13px;line-height:1.5;}
    .print-doc .doc-header{text-align:center;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #111;}
    .print-doc .doc-title{font-size:20px;font-weight:700;margin-bottom:4px;}
    .print-doc .section-title{font-size:14px;font-weight:700;margin:16px 0 8px;padding:4px 10px;background:#f3f4f6;border-left:3px solid #111;}
    .print-doc table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;}
    .print-doc th{background:#f3f4f6;text-align:left;padding:7px 10px;border:1px solid #d1d5db;font-weight:600;}
    .print-doc td{padding:7px 10px;border:1px solid #d1d5db;}
    .print-doc .need-qty{font-size:16px;font-weight:700;}
    .print-doc .check-box{width:16px;height:16px;border:1.5px solid #6b7280;display:inline-block;border-radius:2px;vertical-align:middle;}
    .print-doc .prod-block{margin-bottom:10px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:6px;}
    .print-doc .prod-block-title{font-weight:600;font-size:13px;margin-bottom:4px;}
    .print-doc .sig-row{display:flex;gap:30px;margin-top:24px;}
    .print-doc .sig-box{flex:1;border-top:1.5px solid #6b7280;padding-top:6px;text-align:center;font-size:12px;color:#6b7280;}
    .print-doc .warning-row td{background:#fff7ed;}.print-doc .danger-row td{background:#fef2f2;}
    .stock-ok{color:#065f46;font-weight:500;}.stock-low{color:#92400e;font-weight:500;}.stock-empty{color:#991b1b;font-weight:500;}
    /* 관리탭 */
    .cat-tab-btn{padding:6px 14px;font-size:13px;border:1px solid #d1d5db;border-radius:20px;background:none;cursor:pointer;color:#6b7280;margin:3px;}
    .cat-tab-btn.active{background:#111827;color:#fff;border-color:#111827;}
    .step-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;margin-bottom:8px;}
    .step-box-header{display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;}
    .step-num-badge{width:22px;height:22px;border-radius:50%;background:#111827;color:#fff;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
    .val-tag{display:inline-flex;align-items:center;gap:4px;background:#fff;border:1px solid #e5e7eb;border-radius:20px;padding:3px 10px;font-size:12px;margin:2px;}
    .val-tag button{background:none;border:none;cursor:pointer;color:#9ca3af;padding:0;font-size:14px;line-height:1;}
    .note{font-size:12px;color:#6b7280;margin-top:4px;margin-bottom:8px;}
    .part-chip{display:inline-flex;align-items:center;gap:3px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:12px;padding:2px 8px;font-size:11px;margin:2px;}
    .part-chip button{background:none;border:none;cursor:pointer;color:#9ca3af;padding:0;font-size:12px;}
    .prod-table{width:100%;border-collapse:collapse;font-size:13px;}
    .prod-table th{text-align:left;padding:8px 10px;font-size:12px;font-weight:600;color:#6b7280;border-bottom:1px solid #e5e7eb;background:#f9fafb;}
    .prod-table td{padding:8px 10px;border-bottom:1px solid #f3f4f6;vertical-align:top;}
    .mgmt-sec{margin-bottom:1.2rem;}
    .mgmt-sec h4{font-size:14px;font-weight:500;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;}
    .tag-wrap{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;}
    .opt-tag{display:inline-flex;align-items:center;gap:5px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:20px;padding:4px 10px;font-size:13px;}
    .opt-tag button{background:none;border:none;cursor:pointer;color:#9ca3af;padding:0;font-size:15px;line-height:1;}
    .check-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
    .check-row input[type=checkbox]{width:16px;height:16px;}
    .check-row label{font-size:13px;color:#6b7280;}
    @media print{
      .print-modal-bg,.print-modal{position:static;background:none;padding:0;max-height:none;box-shadow:none;border-radius:0;overflow:visible;}
      .print-modal-header{display:none;}.print-modal-body{padding:0;}
      body>.container{display:none;}
      #printModalContainer .print-modal-bg{display:flex !important;}
    }
  </style>
</head>
<body>
<div id="modalContainer"></div>
<div id="printModalContainer" style="display:none;">
  <div class="print-modal-bg">
    <div class="print-modal">
      <div class="print-modal-header">
        <h2>🖨️ 창고 픽업 목록 — 인쇄 미리보기</h2>
        <div style="display:flex;gap:8px;">
          <button class="primary" onclick="window.print()">🖨️ 인쇄 실행</button>
          <button class="secondary" onclick="document.getElementById('printModalContainer').style.display='none'">닫기</button>
        </div>
      </div>
      <div class="print-modal-body"><div class="print-doc" id="printDoc"></div></div>
    </div>
  </div>
</div>

<div class="container">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:8px;">
    <div><div style="font-size:18px;font-weight:500;">보루네오 재고 관리</div><div style="font-size:13px;color:#6b7280;margin-top:2px;">가구 배송 부품 재고 시스템</div></div>
    <div style="display:flex;gap:8px;"><button class="success" onclick="exportExcel()">엑셀 다운로드</button><button class="secondary" style="font-size:13px;" onclick="location.reload()">새로고침</button></div>
  </div>
  <div id="alertBanners"></div>
  <div class="sync-bar"><div class="dot loading" id="syncDot"></div><span id="syncText">Firebase 연결 중...</span><span style="margin-left:auto;font-size:12px;color:#6b7280;" id="syncTime"></span></div>

  <div class="tabs">
    <button class="tab active" onclick="showTab('출고')">단건 출고</button>
    <button class="tab" onclick="showTab('묶음')">🛒 묶음 출고</button>
    <button class="tab" onclick="showTab('입고')">입고 처리</button>
    <button class="tab" onclick="showTab('재고')">재고 현황</button>
    <button class="tab" onclick="showTab('분석')">📊 분석</button>
    <button class="tab" onclick="showTab('전체통계')">전체 통계</button>
    <button class="tab" onclick="showTab('기사통계')">기사별 통계</button>
    <button class="tab" onclick="showTab('이력')">출고 이력</button>
    <button class="tab" onclick="showTab('입고이력')">입고 이력</button>
    <button class="tab" onclick="showTab('관리')">관리</button>
  </div>

  <!-- 단건 출고 -->
  <div class="section active" id="tab-출고">
    <div class="card">
      <h3>단건 출고 처리</h3>
      <div class="row"><label style="font-size:14px;color:#6b7280;min-width:70px;">기사 선택</label><select id="driverSelect"><option value="">-- 기사를 선택하세요 --</option></select></div>
      <div class="row"><label style="font-size:14px;color:#6b7280;min-width:70px;">고객명</label><input type="text" id="customerName" placeholder="고객명 (선택)" style="width:180px;"></div>
      <div class="row"><label style="font-size:14px;color:#6b7280;min-width:70px;">배송 주소</label><input type="text" id="deliveryAddr" placeholder="배송 주소 (선택)" style="flex:1;"></div>
      <div class="row"><label style="font-size:14px;color:#6b7280;min-width:70px;">메모</label><input type="text" id="shipNote" placeholder="메모 (선택)" style="flex:1;"></div>
      <div style="border-top:1px solid #e5e7eb;margin-top:8px;padding-top:14px;">
        <div style="font-size:14px;font-weight:500;margin-bottom:12px;">제품 선택</div>
        <div class="step-wrap">
          <div class="step-badge" id="sb0">1</div>
          <div class="step-inner"><label>카테고리</label><select id="sc_cat" onchange="onShipCat()"><option value="">-- 선택하세요 --</option></select></div>
        </div>
        <div id="shipStepDynamic"></div>
        <div class="result-sel" id="resultSel" style="display:none;">
          <div class="result-sel-title" id="rSelTitle"></div>
          <div class="result-sel-path" id="rSelPath"></div>
          <div id="rSelParts"></div>
        </div>
      </div>
      <div style="margin-top:1rem;display:flex;align-items:center;gap:10px;">
        <label style="font-size:14px;color:#6b7280;">수량</label>
        <input type="number" id="qty" value="1" min="1" max="50" style="width:80px;">
        <span style="font-size:14px;color:#6b7280;">세트</span>
      </div>
      <div style="margin-top:1rem;"><button class="primary" id="shipBtn" onclick="processShipment()" disabled>출고 처리</button></div>
    </div>
  </div>

  <!-- 묶음 출고 -->
  <div class="section" id="tab-묶음">
    <div class="card">
      <h3>🛒 묶음 출고 처리</h3>
      <p style="font-size:13px;color:#6b7280;margin-bottom:14px;">여러 제품을 담아 공통 부품을 합산 → 창고에서 한 번에 가져오세요.</p>
      <div class="row"><label style="font-size:14px;color:#6b7280;min-width:60px;">기사</label><select id="batchDriver" style="width:220px;flex:none;"><option value="">-- 기사 선택 --</option></select></div>
      <hr class="divider">
      <div style="font-size:14px;font-weight:500;margin-bottom:10px;">제품 추가</div>
      <div class="row"><label style="font-size:13px;color:#6b7280;min-width:60px;">카테고리</label><select id="bc_cat" onchange="onBatchCat()" style="width:180px;flex:none;"><option value="">선택</option></select></div>
      <div id="batchStepDynamic"></div>
      <div id="batchAddRow" style="display:none;">
        <div style="font-size:12px;color:#065f46;margin-bottom:8px;font-weight:500;" id="batchPreviewName"></div>
        <div class="row">
          <input type="number" id="bc_qty" value="1" min="1" style="width:70px;">
          <span style="font-size:13px;color:#6b7280;">세트</span>
          <input type="text" id="bc_customer" placeholder="고객명 (선택)" style="flex:1;min-width:80px;">
          <input type="text" id="bc_addr" placeholder="배송주소 (선택)" style="flex:1;min-width:100px;">
          <button class="primary" onclick="addToCart()">+ 담기</button>
        </div>
      </div>
    </div>
    <div class="card" id="cartCard" style="display:none;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <h3 style="margin-bottom:0;">담은 제품 <span id="cartCount" style="font-size:13px;color:#6b7280;font-weight:400;"></span></h3>
        <button class="danger" onclick="clearCart()">전체 비우기</button>
      </div>
      <div id="cartList"></div>
    </div>
    <div class="card" id="batchSummaryCard" style="display:none;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <h3 style="margin-bottom:0;">🔧 창고 픽업 목록 <span style="font-size:12px;color:#6b7280;font-weight:400;">(공통 부품 합산)</span></h3>
        <div style="display:flex;gap:8px;">
          <button class="secondary" style="font-size:12px;" id="detailToggleBtn" onclick="toggleBatchDetail()">제품별 상세 보기</button>
          <button class="primary" style="font-size:13px;" onclick="openPrintModal()">🖨️ 인쇄 / 출력</button>
        </div>
      </div>
      <div id="batchAlerts"></div>
      <table class="parts-summary">
        <thead><tr><th>부품명</th><th style="text-align:center;">필요</th><th style="text-align:center;">재고</th><th style="text-align:center;">상태</th><th>사용 제품</th></tr></thead>
        <tbody id="batchPartsBody"></tbody>
      </table>
      <hr class="divider">
      <div id="batchProductDetail" style="display:none;">
        <div style="font-size:14px;font-weight:500;margin-bottom:10px;">제품별 부품 상세</div>
        <div id="batchProductDetailList"></div>
        <hr class="divider">
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <button class="success" id="batchShipBtn" onclick="processBatchShipment()">✅ 일괄 출고 처리</button>
        <span style="font-size:12px;color:#6b7280;">※ 출고 처리 시 모든 항목의 재고가 차감됩니다.</span>
      </div>
    </div>
  </div>

  <!-- 입고 -->
  <div class="section" id="tab-입고">
    <div class="card"><h3>단건 입고</h3>
      <div class="row"><label style="font-size:14px;color:#6b7280;min-width:70px;">부품 선택</label><select id="inPartSelect" onchange="renderInPreview()"><option value="">-- 부품을 선택하세요 --</option></select></div>
      <div class="row"><label style="font-size:14px;color:#6b7280;min-width:70px;">입고 수량</label><input type="number" id="inQty" value="1" min="1" style="width:100px;" oninput="renderInPreview()"><span style="font-size:14px;color:#6b7280;">개</span></div>
      <div class="row"><label style="font-size:14px;color:#6b7280;min-width:70px;">공급처</label><input type="text" id="inSupplier" placeholder="공급처 (선택)" style="flex:1;"></div>
      <div class="row"><label style="font-size:14px;color:#6b7280;min-width:70px;">메모</label><input type="text" id="inNote" placeholder="메모 (선택)" style="flex:1;"></div>
      <div id="inPreview"></div>
      <div style="margin-top:1rem;"><button class="primary" id="inBtn" onclick="processInbound()">입고 처리</button></div>
    </div>
    <div class="card"><h3>일괄 입고</h3>
      <div id="bulkInRows"></div>
      <div style="display:flex;gap:8px;margin-top:8px;"><button class="secondary" style="font-size:13px;" onclick="addBulkRow()">+ 부품 추가</button><button class="primary" onclick="processBulkInbound()">일괄 입고 처리</button></div>
    </div>
  </div>

  <!-- 재고 현황 -->
  <div class="section" id="tab-재고">
    <div class="grid4" id="summaryCards"></div>
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:8px;">
        <h3 style="margin-bottom:0;">부품 재고 현황</h3>
        <div style="display:flex;gap:8px;"><input type="text" placeholder="부품명 검색..." id="searchPart" oninput="renderInventory()" style="width:150px;"><select id="filterStatus" onchange="renderInventory()" style="width:90px;flex:none;"><option value="전체">전체</option><option value="정상">정상</option><option value="부족">부족</option><option value="소진">소진</option></select></div>
      </div>
      <table><thead><tr><th>부품명</th><th>현재 재고</th><th>최소 재고</th><th>상태</th><th>수정</th></tr></thead><tbody id="inventoryBody"></tbody></table>
    </div>
  </div>

  <!-- 분석 -->
  <div class="section" id="tab-분석">
    <div class="card"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;"><h3 style="margin-bottom:0;">⏱ 부품 소진 예측</h3><select id="predictDays" onchange="renderPrediction()" style="width:100px;flex:none;font-size:13px;"><option value="7">최근 7일</option><option value="14">최근 14일</option><option value="30" selected>최근 30일</option></select></div><div style="font-size:13px;color:#6b7280;margin-bottom:12px;">현재 출고 속도 기반으로 부품 소진 예상일을 계산합니다.</div><div id="predictionList"></div></div>
    <div class="card"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;"><h3 style="margin-bottom:0;">🔥 잘 나가는 / 안 나가는 제품</h3><select id="productAnalysisPeriod" onchange="renderProductAnalysis()" style="width:110px;flex:none;font-size:13px;"><option value="30">최근 30일</option><option value="90">최근 90일</option><option value="0">전체</option></select></div><div id="productAnalysis"></div></div>
    <div class="card"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;"><h3 style="margin-bottom:0;">📈 월별 출고량 추이</h3><select id="monthlyChartYear" onchange="renderMonthlyChart()" style="width:100px;flex:none;font-size:13px;"></select></div><div class="chart-wrap"><canvas id="monthlyCanvas" height="180"></canvas></div></div>
    <div class="card"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;"><h3 style="margin-bottom:0;">👷 기사별 성과 비교 리포트</h3><select id="reportPeriod" onchange="renderDriverReport()" style="width:110px;flex:none;font-size:13px;"><option value="7">최근 7일</option><option value="30" selected>최근 30일</option><option value="90">최근 90일</option><option value="0">전체</option></select></div><div id="driverReport"></div></div>
  </div>

  <!-- 전체통계 -->
  <div class="section" id="tab-전체통계">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:1rem;flex-wrap:wrap;">
      <button class="pbtn active" id="gp-일별" onclick="setGlobalPeriod('일별')">일별</button>
      <button class="pbtn" id="gp-월별" onclick="setGlobalPeriod('월별')">월별</button>
      <button class="pbtn" id="gp-년별" onclick="setGlobalPeriod('년별')">년별</button>
      <div class="nav-row" style="margin-left:auto;"><button class="secondary" onclick="navGlobal(-1)">◀</button><span class="nav-label" id="gNavLabel"></span><button class="secondary" onclick="navGlobal(1)">▶</button></div>
    </div>
    <div class="grid3" id="gSummary"></div>
    <div class="card"><h3>기사별 출고량 순위</h3><div id="gDriverBars"></div></div>
    <div class="card"><h3>기사별 상세</h3><div id="gDriverTable"></div></div>
    <div class="card"><h3>제품별 출고량</h3><div id="gProductBars"></div></div>
  </div>

  <!-- 기사통계 -->
  <div class="section" id="tab-기사통계">
    <div style="margin-bottom:1rem;"><div style="font-size:13px;color:#6b7280;margin-bottom:8px;">기사 선택</div><div id="driverTabBtns" style="display:flex;flex-wrap:wrap;gap:4px;"></div></div>
    <div id="driverStatContent"><div class="empty-state">기사를 선택하세요.</div></div>
  </div>

  <!-- 출고 이력 -->
  <div class="section" id="tab-이력">
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:8px;"><h3 style="margin-bottom:0;">출고 이력</h3><input type="text" placeholder="기사/제품/고객 검색..." id="histSearch" oninput="renderHistory()" style="width:190px;font-size:13px;"></div>
      <div id="historyList"><div class="empty-state">출고 이력이 없습니다.</div></div>
    </div>
  </div>

  <!-- 입고 이력 -->
  <div class="section" id="tab-입고이력">
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:8px;"><h3 style="margin-bottom:0;">입고 이력</h3><input type="text" placeholder="부품명/공급처 검색..." id="inHistSearch" oninput="renderInHistory()" style="width:190px;font-size:13px;"></div>
      <div id="inHistoryList"><div class="empty-state">입고 이력이 없습니다.</div></div>
    </div>
  </div>

  <!-- 관리 -->
  <div class="section" id="tab-관리">
    <!-- 기사 관리 -->
    <div class="card"><h3>기사 관리</h3><div class="row"><input type="text" id="newDriverName" placeholder="기사명 입력" style="width:200px;"><button class="secondary" onclick="addDriver()">추가</button></div><div id="driverChips" style="margin-top:4px;"></div></div>

    <!-- 부품 관리 -->
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:8px;">
        <h3 style="margin-bottom:0;">부품 관리</h3>
        <div style="display:flex;gap:8px;"><input type="text" id="searchPartMgmt" placeholder="검색..." oninput="renderPartMgmt()" style="width:140px;font-size:13px;"><button class="primary" style="font-size:13px;" onclick="openAddPartModal()">+ 부품 추가</button></div>
      </div>
      <table><thead><tr><th>부품명</th><th>재고</th><th>최소</th><th>상태</th><th style="width:130px;">관리</th></tr></thead><tbody id="partMgmtBody"></tbody></table>
    </div>

    <!-- 카테고리별 제품 설정 (핵심) -->
    <div class="card">
      <h3>⚙️ 카테고리별 제품 설정</h3>
      <p style="font-size:13px;color:#6b7280;margin-bottom:14px;">카테고리마다 단계를 자유롭게 설정하세요. 단계 값의 조합이 자동으로 제품명이 됩니다.</p>
      <!-- 카테고리 탭 -->
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;align-items:center;" id="mgmtCatTabs"></div>
      <div style="display:flex;gap:8px;margin-bottom:14px;">
        <input type="text" id="newCatName" placeholder="새 카테고리 이름" style="width:180px;font-size:13px;">
        <button class="secondary small" onclick="addMgmtCat()">+ 카테고리 추가</button>
      </div>
      <!-- 단계 설정 -->
      <div id="mgmtCatConfig" style="display:none;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
          <div style="font-size:14px;font-weight:500;" id="mgmtCatTitle"></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="secondary small" onclick="addMgmtStep()">+ 단계 추가</button>
            <button class="success" onclick="genProdList()">🔄 제품 목록 생성</button>
            <button class="danger small" onclick="deleteMgmtCat()">카테고리 삭제</button>
          </div>
        </div>
        <p style="font-size:12px;color:#6b7280;margin-bottom:10px;">단계 이름과 값을 입력하세요. <strong>선택형</strong>은 드롭다운, <strong>메모형</strong>은 자유 입력란이 됩니다.</p>
        <div id="mgmtStepList"></div>
      </div>
    </div>

    <!-- 제품 목록 & 부품 등록 -->
    <div class="card" id="mgmtProdCard" style="display:none;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
        <h3 style="margin-bottom:0;" id="mgmtProdTitle">📦 제품 목록</h3>
        <input type="text" id="mgmtProdSearch" placeholder="검색..." oninput="renderMgmtProdTable()" style="width:150px;font-size:13px;">
      </div>
      <p style="font-size:12px;color:#6b7280;margin-bottom:10px;">각 제품 행에서 <strong>부품 등록</strong> 버튼으로 부품을 설정하세요.</p>
      <table class="prod-table">
        <thead><tr><th style="width:40%;">제품명</th><th>구성 부품</th><th style="width:80px;">관리</th></tr></thead>
        <tbody id="mgmtProdBody"></tbody>
      </table>
    </div>
  </div>

</div>
<script type="module" src="/src/main.js"></script>
</body>
</html>
