import { loadData, LAYERS, BIRTH_DAY, path, haystack } from "./data.js";
import { bodySvg } from "./body.js";
import { makeQuiz, recordAnswer, wrongList, srsStats } from "./study.js";
import { STAGES, stageIndex, stageMarks } from "./stages.js";

/* ---------- 상태 ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem("emb:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("emb:" + k, JSON.stringify(v)); } catch { /* 저장 불가: 무시 */ } }
};
const state = {
  mode: store.get("mode", null),          // public | student | clinical
  base: store.get("base", "fert"),        // fert(수정 후) | ga(임신 주수)
  theme: store.get("theme", "auto"),
  tab: "home", module: null,
  day: 56, layer: null, treeQ: "", ganttAll: false, organ: store.get("organ", "heart"),
  week: store.get("week", 8), quiz: null, bookmarks: store.get("bookmarks", [])
};
let db = null;
const $ = s => document.querySelector(s);
const view = $("#view");

/* ---------- 도우미 ---------- */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rich = s => esc(s).replace(/&lt;(\/?)b&gt;/g, "<$1b>");      // 데이터 안의 <b>만 허용
const col = L => (LAYERS[L] ?? LAYERS.root).c;
const lname = L => (LAYERS[L] ?? LAYERS.root).ko;
const nameOf = id => db.S.get(id)?.name?.ko ?? db.A.get(id)?.name?.ko ?? id;
const MODE_KO = { public: "일반인", student: "학생", clinical: "임상" };

function fmtDay(d, { prefix = true } = {}) {
  if (d == null) return "—";
  if (state.base === "ga") {
    const g = d + 14, w = Math.floor(g / 7), r = g % 7;
    return `임신 ${w}주${r ? ` ${r}일` : ""}`;
  }
  const p = prefix ? "수정 후 " : "";
  if (d < 21) return `${p}${d}일`;
  const w = Math.floor(d / 7), r = d % 7;
  return `${p}${w}주${r ? ` ${r}일` : ""}`;
}
function period(s) {
  const st = s.days?.start, en = s.days?.end;
  if (st == null && en == null) return "—";
  const a = fmtDay(st), b = en != null ? fmtDay(en, { prefix: false }) : null;
  return (b ? `${a} – ${b}` : `${a}~`) + (s.days?.approx ? " (대략)" : "");
}
const stageAt = d => d < 1 ? "접합자" : d < 4 ? "난할" : d < 7 ? "포배" : d < 14 ? "착상·이층배반" : d < 21 ? "낭배형성"
  : d < 28 ? "신경배형성" : d < 57 ? "기관형성기 (배아기)" : d < BIRTH_DAY ? "태아기" : "출생";

function modeText(t) {
  if (!t) return "";
  const order = state.mode === "public" ? ["public"] : state.mode === "clinical" ? ["clinical", "student"] : ["student", "clinical"];
  return order.filter(k => t[k]).map((k, i) =>
    `<p class="prose ${k === "clinical" ? "clin" : ""}">${i && k === "clinical" ? "<b>임상</b> · " : ""}${rich(t[k])}</p>`).join("");
}
const chipFor = id => {
  const s = db.S.get(id), a = db.A.get(id);
  if (s) return `<button class="chip" data-open="s:${id}" style="--c:${col(s.layer)}"><span class="dot"></span>${esc(s.name.ko)}</button>`;
  if (a) return `<button class="chip" data-open="a:${id}">${esc(a.name.ko)}</button>`;
  return "";
};

/* ---------- 상세 시트 ---------- */
const sheet = $("#sheet"), sheetBody = $("#sheetBody");
let stack = [];
function open(ref, push = true) {
  const [kind, id] = ref.split(":");
  const html = kind === "s" ? structureHtml(id) : kind === "a" ? anomalyHtml(id) : kind === "t" ? tableHtml(id) : "";
  if (!html) return;
  if (push) stack.push(ref);
  sheetBody.innerHTML = html;
  $("#sheetBack").style.visibility = stack.length > 1 ? "visible" : "hidden";
  sheet.hidden = false;
  sheet.querySelector(".sheet-panel").scrollTop = 0;
  document.body.style.overflow = "hidden";
}
function closeSheet() { sheet.hidden = true; stack = []; document.body.style.overflow = ""; }
$("#sheetBack").onclick = () => { stack.pop(); stack.length ? open(stack.at(-1), false) : closeSheet(); };
sheet.addEventListener("click", e => { if (e.target.closest("[data-close]")) closeSheet(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") { if (!sheet.hidden) closeSheet(); else closeOverlay(); } });

function structureHtml(id) {
  const s = db.S.get(id); if (!s) return "";
  const crumbs = path(db, id).slice(0, -1).map(p => `<button data-open="s:${p}">${esc(nameOf(p))}</button>`).join("<span>›</span>");
  const kids = (db.children.get(id) ?? []).map(chipFor).join("");
  const anoms = [...new Set([...(s.anomalies ?? []), ...[...db.A.values()].filter(a => (a.cause ?? []).includes(id)).map(a => a.id)])].filter(a => db.A.has(a));
  const bm = state.bookmarks.includes("s:" + id);
  const arch = s.arch ? `<div class="d-sec"><h3>궁의 구성</h3><dl class="kv">${[["신경", "nerve"], ["근육", "muscles"], ["뼈·연골", "skeleton"], ["동맥", "artery"]]
    .filter(([, k]) => s.arch[k]?.length).map(([ko, k]) => `<dt>${ko}</dt><dd>${s.arch[k].map(esc).join(", ")}</dd>`).join("")}</dl></div>` : "";
  const comp = s.composition?.length ? `<div class="d-sec"><h3>구성 배엽</h3><div class="orig">${s.composition.map(c =>
    `<button data-open="s:${c.ref}" style="--c:${col(c.layer)}"><span class="dot"></span><span><b>${esc(c.part)}</b><small>${lname(c.layer)}</small></span></button>`).join("")}</div></div>` : "";
  const innerv = s.innervation?.length ? `<div class="d-sec"><h3>신경 분포</h3><div class="tbl"><table><tr><th>부위</th><th>일반감각</th><th>미각</th><th>기원</th></tr>${s.innervation.map(r =>
    `<tr><td>${esc(r.region)}</td><td>${esc(r.general)}</td><td>${esc(r.taste)}</td><td>${esc(r.origin)}</td></tr>`).join("")}</table></div></div>` : "";
  const flow = s.flow?.length ? `<div class="d-sec"><h3>흐름</h3><ol class="steps">${s.flow.map(f => `<li>${esc(f)}</li>`).join("")}</ol></div>` : "";
  const tables = db.tables.filter(t => t.rows.some(r => r.ref === id));
  return `<div style="--c:${col(s.layer)}">
    <div class="d-head">
      <div class="chips"><span class="pill"><span class="dot"></span>${lname(s.layer)}</span>
        ${s.examPoint && state.mode !== "public" ? `<span class="badge exam">시험</span>` : ""}
        ${s.verify ? `<span class="badge warn" title="교재 대조가 남은 항목">검수 중</span>` : ""}</div>
      <h2 id="sheetTitle">${esc(s.name.ko)}</h2>
      <div class="d-en">${esc(s.name.en)}</div>
      ${s.name.alt?.length ? `<div class="d-alt">다른 이름: ${s.name.alt.map(esc).join(", ")}</div>` : ""}
      ${crumbs ? `<div class="crumbs">${crumbs}</div>` : ""}
    </div>
    <div class="d-sec"><h3>시기</h3><div class="mono">${esc(period(s))}${s.carnegie?.length ? ` · CS ${s.carnegie.join("–")}` : ""}</div></div>
    <div class="d-sec"><h3>설명</h3>${modeText(s.text)}</div>
    ${s.derivatives?.length ? `<div class="d-sec"><h3>${kids ? "만드는 것" : "유래 구조"}</h3><ul class="derv">${s.derivatives.map(d => `<li>${rich(d)}</li>`).join("")}</ul></div>` : ""}
    ${arch}${comp}${innerv}${flow}
    ${anoms.length ? `<div class="d-sec"><h3>관련 기형</h3><div class="chips">${anoms.map(chipFor).join("")}</div></div>` : ""}
    ${kids ? `<div class="d-sec"><h3>다음 단계</h3><div class="chips">${kids}</div></div>` : ""}
    ${(s.links ?? []).filter(l => db.S.has(l) || db.A.has(l)).length ? `<div class="d-sec"><h3>함께 볼 것</h3><div class="chips">${s.links.map(chipFor).join("")}</div></div>` : ""}
    ${tables.length ? `<div class="d-sec"><h3>표</h3><div class="chips">${tables.map(t => `<button class="chip" data-open="t:${t.id}">${esc(t.title)}</button>`).join("")}</div></div>` : ""}
    <div class="d-sec"><button class="btn" data-bookmark="s:${id}">${bm ? "★ 북마크됨" : "☆ 북마크"}</button></div>
    ${sourcesHtml(s)}
  </div>`;
}
function anomalyHtml(id) {
  const a = db.A.get(id); if (!a) return "";
  const causes = [...(db.anomalyStructs.get(id) ?? [])];
  const pub = state.mode === "public";
  const bm = state.bookmarks.includes("a:" + id);
  return `<div style="--c:var(--meso)">
    <div class="d-head">
      <div class="chips"><span class="pill">기형</span>
        ${a.examPoint && !pub ? `<span class="badge exam">시험</span>` : ""}${a.verify ? `<span class="badge warn">검수 중</span>` : ""}</div>
      <h2 id="sheetTitle">${esc(a.name.ko)}</h2>
      <div class="d-en">${esc(a.name.en)}</div>
      ${a.name.alt?.length ? `<div class="d-alt">다른 이름: ${a.name.alt.map(esc).join(", ")}</div>` : ""}
    </div>
    ${a.public ? `<div class="d-sec"><h3>${pub ? "쉽게 말하면" : "요약"}</h3><p class="prose">${rich(a.public)}</p></div>` : ""}
    ${!pub && a.mechanism ? `<div class="d-sec"><h3>기전</h3><p class="prose">${rich(a.mechanism)}</p></div>` : ""}
    ${a.findings?.length ? `<div class="d-sec"><h3>${pub ? "주요 특징" : "소견"}</h3><ul class="derv">${a.findings.map(f => `<li>${rich(f)}</li>`).join("")}</ul></div>` : ""}
    ${!pub && a.genes?.length ? `<div class="d-sec"><h3>유전·연관</h3><ul class="derv">${a.genes.map(g => `<li>${rich(g)}</li>`).join("")}</ul></div>` : ""}
    ${a.period ? `<div class="d-sec"><h3>결정적 시기</h3><div class="mono">${esc(fmtDay(a.period.start))} – ${esc(fmtDay(a.period.end, { prefix: false }))}</div></div>` : ""}
    ${causes.length ? `<div class="d-sec"><h3>${pub ? "관련된 발생 구조" : "원인 구조"}</h3><div class="chips">${causes.map(chipFor).join("")}</div></div>` : ""}
    <div class="d-sec"><button class="btn" data-bookmark="a:${id}">${bm ? "★ 북마크됨" : "☆ 북마크"}</button></div>
    <div class="d-sec notice">교육용 정보이며 진단이나 치료를 대신하지 않습니다. 궁금한 점은 담당 의료진과 상의하세요.</div>
    ${sourcesHtml(a)}
  </div>`;
}
function tableHtml(id) {
  const t = db.tables.find(x => x.id === id); if (!t) return "";
  return `<div class="d-head"><span class="pill" style="--c:var(--muted)">표 · ${esc(db.moduleTitles[t.module])}</span><h2 id="sheetTitle">${esc(t.title)}</h2></div>
    <div class="d-sec">${tableBlock(t)}</div>${t.note ? `<p class="notice">${rich(t.note)}</p>` : ""}`;
}
function tableBlock(t) {
  return `<div class="tbl"><table><tr>${t.columns.map(c => `<th>${esc(c)}</th>`).join("")}</tr>${t.rows.map(r =>
    `<tr class="${db.S.has(r.ref) || db.A.has(r.ref) ? "rowlink" : ""}" data-open="${db.S.has(r.ref) ? "s:" : "a:"}${r.ref}">${r.cells.map(c => `<td>${rich(c)}</td>`).join("")}</tr>`).join("")}</table></div>`;
}
function sourcesHtml(x) {
  const src = x.sources ?? []; if (!src.length) return "";
  return `<div class="d-sec"><h3>출처</h3><div class="muted" style="font-size:13px">${src.map(s =>
    `${s.ref === "langman" ? "Langman 15판 (번역서)" : s.ref === "moore" ? "Moore" : esc(s.ref)}${s.p ? ` p.${esc(s.p)}` : ""}`).join(" · ")}</div></div>`;
}

/* ---------- 탭 ---------- */
const TABS = { home: renderHome, tree: renderTree, time: renderTime, body: renderBody, study: renderStudy, module: renderModule };
function go(tab, extra = {}) {
  Object.assign(state, extra); state.tab = tab;
  document.querySelectorAll(".tabs button").forEach(b => b.setAttribute("aria-current", b.dataset.tab === (tab === "module" ? "home" : tab) ? "page" : "false"));
  render();
  window.scrollTo(0, 0);
}
function render() {
  if (!state.mode) { view.innerHTML = welcomeHtml(); return; }
  view.innerHTML = TABS[state.tab]();
  afterRender[state.tab]?.();
}
const afterRender = {};

function welcomeHtml() {
  return `<div class="welcome"><h1>발생 지도</h1><p class="muted">수정란 하나가 사람이 되기까지, 언제·어디서·무엇이 생기는지 한곳에서 봅니다. 쓰는 목적에 맞는 모드를 골라 주세요. 설정에서 언제든 바꿀 수 있어요.</p>
    <button class="mode-opt" data-mode="public"><b>일반인 · 예비 부모</b><span>쉬운 말로, 임신 주수 기준으로 봅니다.</span></button>
    <button class="mode-opt" data-mode="student"><b>학생</b><span>배엽 계보와 시기, 시험 포인트, 퀴즈와 복습 카드.</span></button>
    <button class="mode-opt" data-mode="clinical"><b>임상</b><span>기형의 원인 구조와 결정적 시기, 임상 메모를 먼저 보여줍니다.</span></button></div>`;
}

/* 홈 */
function renderHome() {
  const m = state.mode;
  let main = "";
  if (m === "public") {
    const w = state.week, day = w * 7 - 14;
    const evs = db.events.filter(e => e.day >= day - 7 && e.day <= day + 3);
    const starting = [...db.S.values()].filter(s => s.days?.start != null && s.days.start > day - 7 && s.days.start <= day).slice(0, 12);
    main = `<section class="card"><p class="sec-title">지금 우리 아기는</p>
      <div class="toolbar"><button class="btn" data-week="-1" aria-label="한 주 전">−</button>
      <b style="font-family:var(--f-display);font-size:22px">임신 ${w}주</b>
      <button class="btn" data-week="1" aria-label="한 주 뒤">+</button><span class="muted" style="font-size:13px">수정 후 약 ${Math.max(0, day)}일 · ${stageAt(Math.max(0, day))}</span></div>
      ${w < 3 ? `<p class="muted">임신 주수는 마지막 생리 시작일부터 셉니다. 수정은 보통 임신 2주 무렵에 일어나요.</p>` : ""}
      ${evs.length ? `<p class="sec-title" style="margin-top:12px">이 무렵 일어나는 일</p><div class="ev-list">${evs.map(e => evHtml(e, day)).join("")}</div>` : `<p class="muted">이 주에 표시할 큰 사건은 없어요. 시간 탭에서 전체 흐름을 볼 수 있어요.</p>`}
      ${starting.length ? `<p class="sec-title" style="margin-top:12px">이번 주에 생기기 시작하는 것</p><div class="chips">${starting.map(s => chipFor(s.id)).join("")}</div>` : ""}
      </section>`;
  } else if (m === "student") {
    const st = srsStats(), traps = db.traps, t = traps[Math.floor(Math.random() * traps.length)];
    main = `<section class="grid">
      <div class="card"><p class="sec-title">오늘의 복습</p><p style="margin:0 0 10px">익힌 카드 <b>${st.learned}</b>개 · 오답 노트 <b>${st.wrong}</b>개</p>
        <button class="btn primary" data-tab="study">퀴즈 10문제 풀기</button></div>
      ${t ? `<div class="card trap"><span class="k">헷갈리기 쉬운 기원 · ${esc(t.layer)}</span><p class="q">${esc(t.q)}</p><p class="a">${esc(t.a)}</p></div>` : ""}
    </section>`;
  } else {
    const anoms = [...db.A.values()];
    main = `<section class="card"><p class="sec-title">기형으로 찾기</p>
      <input type="search" id="homeAnomQ" placeholder="기형 이름이나 소견 (예: 구개열, 청색증)" autocomplete="off">
      <div id="homeAnomR" class="chips" style="margin-top:10px">${anoms.filter(a => a.examPoint).slice(0, 18).map(a => chipFor(a.id)).join("")}</div></section>`;
    afterRender.home = () => {
      const q = $("#homeAnomQ"); if (!q) return;
      q.oninput = () => { const v = q.value.trim().toLowerCase();
        $("#homeAnomR").innerHTML = anoms.filter(a => !v || haystack(a).includes(v)).slice(0, 30).map(a => chipFor(a.id)).join("") || `<span class="muted">결과 없음</span>`; };
    };
  }
  if (m !== "clinical") afterRender.home = null;
  const mods = db.mods.map(md => `<button class="card chip" style="border-radius:var(--r);display:block;text-align:left" data-module="${md.module}">
    <b>${esc(md.title?.ko)}</b><br><span class="muted" style="font-size:12.5px">구조 ${md.structures?.length ?? 0} · 기형 ${md.anomalies?.length ?? 0} · 표 ${md.tables?.length ?? 0}</span></button>`).join("");
  const bms = state.bookmarks.filter(b => db.S.has(b.slice(2)) || db.A.has(b.slice(2)));
  return `<div class="page-head"><h1>${m === "public" ? "임신 주수로 보기" : m === "student" ? "공부하기" : "임상 빠른 찾기"}</h1>
    <p>${MODE_KO[m]} 모드 · 날짜는 ${state.base === "ga" ? "임신 주수" : "수정 후 나이"} 기준</p></div>
    ${main}
    ${bms.length ? `<section><p class="sec-title">북마크</p><div class="chips">${bms.map(b => chipFor(b.slice(2))).join("")}</div></section>` : ""}
    <section><p class="sec-title">주제별로 보기</p><div class="grid">${mods}</div></section>`;
}
function evHtml(e, day) {
  const cls = e.day < day - 3 ? "past" : Math.abs(e.day - day) <= 3 ? "now" : "";
  const ref = e.refs?.find(r => db.S.has(r));
  return `<button class="ev ${cls} ${e.major ? "major" : ""}" ${ref ? `data-open="s:${ref}"` : ""}><span class="when">${esc(fmtDay(e.day, { prefix: false }))}</span><span class="lbl">${esc(e.label)}</span></button>`;
}

/* 주제(모듈) */
function renderModule() {
  const md = db.mods.find(m => m.module === state.module); if (!md) return renderHome();
  return `<div class="page-head"><button class="btn" data-tab="home">← 홈</button><h1 style="margin-top:10px">${esc(md.title.ko)}</h1><p>${esc(md.title.en ?? "")}</p></div>
    ${(md.principles ?? []).length ? `<section><p class="sec-title">원리</p><div class="grid">${md.principles.map(p => `<div class="card"><b>${esc(p.name.ko)}</b>${modeText(p.text)}</div>`).join("")}</div></section>` : ""}
    ${(md.structures ?? []).length ? `<section><p class="sec-title">구조</p><div class="chips">${md.structures.map(s => chipFor(s.id)).join("")}</div></section>` : ""}
    ${(md.tables ?? []).map(t => `<section><p class="sec-title">${esc(t.title)}</p>${tableBlock(t)}${t.note ? `<p class="notice" style="margin-top:8px">${rich(t.note)}</p>` : ""}</section>`).join("")}
    ${(md.anomalies ?? []).length ? `<section><p class="sec-title">기형</p><div class="chips">${md.anomalies.map(a => chipFor(a.id)).join("")}</div></section>` : ""}`;
}

/* 계보 */
function renderTree() {
  const chips = [[null, "전체"], ["ec", "외배엽"], ["me", "중배엽"], ["en", "내배엽"], ["ex", "배외조직"], ["mix", "여러 배엽"]]
    .map(([L, ko]) => `<button class="chip" data-layer="${L ?? ""}" aria-pressed="${state.layer === L}">${L ? `<span class="dot" style="--c:${col(L)}"></span>` : ""}${ko}</button>`).join("");
  return `<div class="page-head"><h1>발생 계보</h1><p>접합자에서 배엽을 거쳐 각 기관까지. 항목을 누르면 자세히 볼 수 있어요.</p></div>
    <div class="toolbar"><input type="search" id="treeQ" placeholder="계보에서 찾기 (예: 흉선, 상아질)" value="${esc(state.treeQ)}" style="flex:1 1 220px"></div>
    <div class="toolbar chips">${chips}<button class="chip" id="openAll">모두 펼치기</button><button class="chip" id="closeAll">접기</button></div>
    <div class="tree" id="tree" role="tree">${db.roots.map(id => nodeHtml(id, 0)).join("")}</div>`;
}
function nodeHtml(id, depth) {
  const s = db.S.get(id), kids = db.children.get(id) ?? [];
  const big = ["ec", "me", "en"].includes(id);
  const towardLayers = ["ec", "me", "en"].some(L => path(db, L).includes(id));
  const closed = kids.length && depth >= 3 && !big && !towardLayers;
  return `<div class="node ${kids.length ? "" : "leaf"} ${big ? "big" : ""} ${closed ? "closed" : ""}" data-id="${id}" style="--c:${col(s.layer)}">
    <button class="row" role="treeitem"><span class="chev">›</span><span class="dot"></span><span class="ko">${esc(s.name.ko)}</span><span class="en">${esc(s.name.en)}</span>
    ${s.days?.start != null ? `<span class="badge">${esc(fmtDay(s.days.start, { prefix: false }))}</span>` : ""}</button>
    ${kids.length ? `<div class="kids" role="group">${kids.map(k => nodeHtml(k, depth + 1)).join("")}</div>` : ""}</div>`;
}
afterRender.tree = () => {
  const tree = $("#tree");
  tree.onclick = e => {
    const row = e.target.closest(".row"); if (!row) return;
    const node = row.parentElement;
    if (e.target.closest(".chev") && !node.classList.contains("leaf")) { node.classList.toggle("closed"); return; }
    open("s:" + node.dataset.id);
  };
  $("#openAll").onclick = () => tree.querySelectorAll(".node").forEach(n => n.classList.remove("closed"));
  $("#closeAll").onclick = () => tree.querySelectorAll(".node").forEach(n => { if (!n.classList.contains("leaf") && path(db, n.dataset.id).length > 3) n.classList.add("closed"); });
  const q = $("#treeQ");
  q.oninput = () => { state.treeQ = q.value; filterTree(); };
  filterTree();
};
function filterTree() {
  const q = state.treeQ.trim().toLowerCase(), L = state.layer;
  const keep = new Set();
  for (const s of db.S.values()) {
    const okQ = !q || haystack(s).includes(q), okL = !L || s.layer === L;
    if (okQ && okL) path(db, s.id).forEach(p => keep.add(p));
  }
  document.querySelectorAll("#tree .node").forEach(n => {
    const id = n.dataset.id, s = db.S.get(id);
    n.classList.toggle("dim", !keep.has(id));
    n.classList.toggle("hit", !!q && haystack(s).includes(q));
    if ((q || L) && keep.has(id)) n.classList.remove("closed");
  });
}

/* 시간 */
function renderTime() {
  const d = state.day;
  const near = db.events.filter(e => Math.abs(e.day - d) <= 10);
  const groups = new Map();
  for (const s of db.S.values()) {
    if (s.days?.start == null || (!state.ganttAll && !s.examPoint)) continue;
    const g = db.moduleOf.get(s.id); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(s);
  }
  const MAX = state.ganttAll ? BIRTH_DAY : 84, X = v => Math.min(100, (v / MAX) * 100);
  const gantt = [...groups].map(([g, list]) => `<div class="g-group">${esc(db.moduleTitles[g])}</div>` + list.sort((a, b) => a.days.start - b.days.start).map(s => {
    const st = s.days.start, en = s.days.end ?? st + 3;
    if (st > MAX) return "";
    return `<div class="g-row"><button class="g-name" data-open="s:${s.id}" title="${esc(s.name.ko)}">${esc(s.name.ko)}</button>
      <div class="g-track" style="--c:${col(s.layer)}"><span class="g-bar" style="left:${X(st)}%;width:${Math.max(1.2, X(en) - X(st))}%"></span><span class="g-now" style="left:${X(d)}%"></span></div></div>`;
  }).join("")).join("");
  return `<div class="page-head"><h1>발생 시기</h1><p>슬라이더를 움직이면 그 시기에 일어나는 일을 보여줍니다.</p></div>
    <section class="card">
      <div class="tl-read"><b id="dayLabel">${esc(fmtDay(d))}</b><span class="muted" id="stageLabel">${esc(stageAt(d))}</span>
        <span class="seg" style="margin-left:auto"><button data-base="fert" aria-pressed="${state.base === "fert"}">수정 후</button><button data-base="ga" aria-pressed="${state.base === "ga"}">임신 주수</button></span></div>
      <input type="range" id="day" min="0" max="${BIRTH_DAY}" value="${d}" aria-label="발생 시기">
      <p class="muted" style="font-size:12.5px;margin:4px 0 0">임신 주수 = 수정 후 나이 + 2주 (마지막 생리 시작일 기준)</p>
    </section>
    <section><div class="toolbar st-nav"><p class="sec-title" style="margin:0">단계 그림</p>
      <span style="margin-left:auto;display:flex;gap:6px"><button class="btn" id="stPrev" aria-label="이전 단계">‹</button><button class="btn" id="stNext" aria-label="다음 단계">›</button></span></div>
      <p class="muted" style="font-size:12.5px;margin:0 0 6px">옆으로 넘기거나 눌러서 그 시기로</p>
      <div class="stages" id="stages">${STAGES.map((st, i) => stageCard(st, i, d)).join("")}</div></section>
    <section><p class="sec-title">이 무렵 (±10일)</p><div class="ev-list" id="nearEv">${near.map(e => evHtml(e, d)).join("") || `<p class="muted">이 무렵에 표시할 사건이 없어요.</p>`}</div></section>
    <section><div class="toolbar"><p class="sec-title" style="margin:0">구조별 시기 (${state.ganttAll ? "출생까지" : "12주까지 · 시험 포인트"})</p>
      <button class="chip" id="ganttAll" aria-pressed="${state.ganttAll}">전체 보기</button></div><div class="gantt">${gantt}</div></section>`;
}
function stageCard(st, i, day) {
  const on = i === stageIndex(day);
  const ref = st.ref && db.S.has(st.ref) ? st.ref : null;
  return `<div class="stage ${on ? "on" : ""}" data-stage="${i}" role="button" tabindex="0" aria-current="${on}">
    <div class="st-fig"><img class="st-art" src="${st.img}" alt="${esc(st.ko)} 그림" loading="lazy" decoding="async">${stageMarks(st)}</div>
    <div class="st-head"><b>${esc(st.ko)}</b><span class="st-when">${esc(fmtDay(st.day))}</span></div>
    <span class="st-en">${esc(st.en)}</span>
    <p class="st-note">${esc(st.note)}</p>
    ${ref ? `<button class="st-more" data-open="s:${ref}">${esc(nameOf(ref))} 자세히 ›</button>` : ""}</div>`;
}
afterRender.time = () => {
  const r = $("#day"), strip = $("#stages");
  // 고른 단계 카드를 띠 안에서만 가운데로 옮긴다 (페이지 전체는 스크롤하지 않음).
  // auto: 코드가 띠를 움직이는 중(슬라이더·버튼). 이때 생기는 스크롤로는 날짜를 바꾸지 않는다.
  let auto = false, autoTimer = 0, swipeTimer = 0;
  const centerStage = (smooth = true) => {
    const card = strip.querySelector(".stage.on"); if (!card) return;
    auto = true; clearTimeout(autoTimer); autoTimer = setTimeout(() => { auto = false; }, smooth ? 700 : 50);
    strip.scrollTo({ left: card.offsetLeft - strip.offsetLeft - (strip.clientWidth - card.clientWidth) / 2, behavior: smooth ? "smooth" : "auto" });
  };
  // 손으로 띠를 넘기면 가운데 온 카드의 날짜로 슬라이더·날짜·사건 목록을 맞춘다.
  const syncFromSwipe = () => {
    if (auto) return;
    const mid = strip.scrollLeft + strip.clientWidth / 2;
    let best = 0, dist = Infinity;
    strip.querySelectorAll(".stage").forEach(c => {
      const d = Math.abs(c.offsetLeft - strip.offsetLeft + c.clientWidth / 2 - mid);
      if (d < dist) { dist = d; best = +c.dataset.stage; }
    });
    if (best !== stageIndex(state.day)) setDay(STAGES[best].day, { fromStage: true });
  };
  strip.onscroll = () => { clearTimeout(swipeTimer); swipeTimer = setTimeout(syncFromSwipe, 120); };
  const setDay = (day, { fromStage = false } = {}) => {
    state.day = day; r.value = day;
    $("#dayLabel").textContent = fmtDay(day); $("#stageLabel").textContent = stageAt(day);
    const near = db.events.filter(e => Math.abs(e.day - day) <= 10);
    $("#nearEv").innerHTML = near.map(e => evHtml(e, day)).join("") || `<p class="muted">이 무렵에 표시할 사건이 없어요.</p>`;
    const MAX = state.ganttAll ? BIRTH_DAY : 84;
    document.querySelectorAll(".g-now").forEach(n => n.style.left = Math.min(100, day / MAX * 100) + "%");
    const idx = stageIndex(day);
    strip.querySelectorAll(".stage").forEach(c => { const on = +c.dataset.stage === idx; c.classList.toggle("on", on); c.setAttribute("aria-current", on); });
    if (!fromStage) centerStage();
  };
  r.oninput = () => setDay(+r.value);
  const pick = i => { i = Math.max(0, Math.min(STAGES.length - 1, i)); setDay(STAGES[i].day, { fromStage: true }); centerStage(); };
  strip.onclick = e => { if (e.target.closest("[data-open]")) return; const c = e.target.closest(".stage"); if (c) pick(+c.dataset.stage); };
  strip.onkeydown = e => { const c = e.target.closest(".stage"); if (c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); pick(+c.dataset.stage); } };
  $("#stPrev").onclick = () => pick(stageIndex(state.day) - 1);
  $("#stNext").onclick = () => pick(stageIndex(state.day) + 1);
  centerStage(false);
  $("#ganttAll").onclick = () => { state.ganttAll = !state.ganttAll; render(); };
};

/* 몸 지도 */
function renderBody() {
  const o = db.organs.find(x => x.id === state.organ) ?? db.organs[0];
  const bySys = new Map(); db.organs.forEach(x => { if (!bySys.has(x.sys)) bySys.set(x.sys, []); bySys.get(x.sys).push(x); });
  return `<div class="page-head"><h1>기관으로 찾기</h1><p>점을 누르면 그 기관이 어느 배엽에서, 어떤 순서로 생기는지 보여줍니다. 점 색은 주된 기원 배엽입니다.</p></div>
    <div class="body-grid">
      <div class="body-fig">${bodySvg(db.organs, o?.id, col)}
        <div class="legend"><span><span class="dot" style="--c:var(--ecto)"></span>외배엽</span><span><span class="dot" style="--c:var(--meso)"></span>중배엽</span><span><span class="dot" style="--c:var(--endo)"></span>내배엽</span></div></div>
      <div class="card" style="--c:${col(o.origins?.[0]?.layer)}">
        <p class="sec-title">${esc(o.sys)}</p><h2 style="font-size:24px">${esc(o.ko)}</h2><p class="muted">${rich(o.summary)}</p>
        <p class="sec-title" style="margin-top:14px">어디서 · 기원</p>
        <div class="orig">${(o.origins ?? []).map(g => `<button ${db.S.has(g.ref) ? `data-open="s:${g.ref}"` : ""} style="--c:${col(g.layer)}"><span class="dot"></span><span><b>${esc(g.label)}</b><small>${lname(g.layer)} → ${esc(g.result)}</small></span></button>`).join("")}</div>
        <p class="sec-title" style="margin-top:14px">어떻게 · 발생 과정</p>
        <ol class="steps">${(o.steps ?? []).map(s => `<li><span class="when">${esc(s.when)}</span>${esc(s.text)}</li>`).join("")}</ol>
      </div>
    </div>
    <section>${[...bySys].map(([sys, list]) => `<p class="sec-title" style="margin-top:12px">${esc(sys)}</p><div class="chips">${list.map(x =>
      `<button class="chip" data-organ="${x.id}" aria-pressed="${x.id === o.id}">${esc(x.ko)}</button>`).join("")}</div>`).join("")}</section>`;
}
afterRender.body = () => {
  document.querySelectorAll(".hs").forEach(g => g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); g.dispatchEvent(new MouseEvent("click", { bubbles: true })); } }));
};

/* 학습 */
function renderStudy() {
  const q = state.quiz;
  if (q && q.i < q.items.length) {
    const it = q.items[q.i], done = q.answered != null;
    return `<div class="page-head"><h1>퀴즈</h1><p>${q.i + 1} / ${q.items.length}</p></div>
      <div class="progress"><i style="width:${(q.i / q.items.length) * 100}%"></i></div>
      <section class="card flash"><div class="q">${esc(it.q)}</div>${it.hint ? `<div class="muted">${esc(it.hint)}</div>` : ""}
        <div class="choices">${it.choices.map((c, k) => `<button class="choice ${done ? (k === it.answer ? "right" : k === q.answered ? "wrong" : "") : ""}" data-choice="${k}" ${done ? "disabled" : ""}>${esc(c)}</button>`).join("")}</div>
        ${done ? `<div class="a">${it.explain ? `<p class="muted">${rich(it.explain)}</p>` : ""}<div class="toolbar">${it.ref ? `<button class="btn" data-open="${it.ref}">자세히 보기</button>` : ""}<button class="btn primary" id="nextQ">${q.i + 1 < q.items.length ? "다음" : "결과 보기"}</button></div></div>` : ""}
      </section>`;
  }
  const res = q ? `<section class="card"><p class="sec-title">방금 결과</p><b style="font-size:22px">${q.score} / ${q.items.length}</b></section>` : "";
  const wrong = wrongList().filter(r => db.S.has(r.slice(2)) || db.A.has(r.slice(2)));
  const st = srsStats();
  return `<div class="page-head"><h1>${state.mode === "public" ? "상식 퀴즈" : "학습"}</h1><p>데이터에서 자동으로 만든 문제입니다. 틀린 문제는 오답 노트에 모였다가 다시 나옵니다.</p></div>
    ${res}
    <section class="grid">
      <div class="card"><p class="sec-title">퀴즈</p><p style="margin:0 0 10px">익힌 카드 ${st.learned}개 · 복습할 카드 ${st.wrong}개</p>
        <div class="toolbar"><button class="btn primary" data-quiz="mixed">10문제 풀기</button>
        ${state.mode !== "public" ? `<button class="btn" data-quiz="arch">인두궁만</button><button class="btn" data-quiz="anomaly">기형만</button>` : ""}</div></div>
      <div class="card"><p class="sec-title">오답 노트</p>${wrong.length ? `<div class="chips">${wrong.slice(0, 30).map(r => chipFor(r.slice(2))).join("")}</div>` : `<p class="muted" style="margin:0">아직 틀린 문제가 없어요.</p>`}</div>
    </section>
    <section><p class="sec-title">헷갈리기 쉬운 기원</p><div class="grid">${db.traps.map(t => `<div class="card trap"><span class="k">${esc(t.layer)}</span><p class="q">${esc(t.q)}</p><p class="a">${esc(t.a)}</p></div>`).join("")}</div></section>`;
}

/* ---------- 검색 · 설정 ---------- */
const overlay = $("#overlay");
function closeOverlay() { overlay.hidden = true; overlay.innerHTML = ""; }
function openSearch() {
  overlay.hidden = false;
  overlay.innerHTML = `<div class="overlay-inner"><div class="ov-head"><input type="search" id="gq" placeholder="구조·기형·기관 검색 (한/영)" autocomplete="off"><button class="icon-btn" id="ovClose" aria-label="닫기">✕</button></div><div id="gr"></div></div>`;
  const q = $("#gq"); q.focus();
  $("#ovClose").onclick = closeOverlay;
  q.oninput = () => {
    const v = q.value.trim().toLowerCase();
    if (!v) { $("#gr").innerHTML = ""; return; }
    const score = x => { const n = x.name; return [n.ko, n.en, ...(n.alt ?? [])].some(t => t?.toLowerCase().includes(v)) ? 0 : 1; };
    const hits = [...[...db.S.values()].map(x => ["s", x]), ...[...db.A.values()].map(x => ["a", x])]
      .filter(([, x]) => haystack(x).includes(v)).sort((a, b) => score(a[1]) - score(b[1])).slice(0, 40);
    const O = db.organs.filter(o => o.ko.includes(v));
    $("#gr").innerHTML = [...O.map(o => `<button class="result" data-organ="${o.id}" data-tab="body"><span class="dot" style="--c:var(--ink)"></span>${esc(o.ko)}<span class="badge kind">기관</span></button>`),
      ...hits.map(([k, x]) => k === "s"
        ? `<button class="result" data-open="s:${x.id}" style="--c:${col(x.layer)}"><span class="dot"></span><span>${esc(x.name.ko)} <span class="muted mono" style="font-size:11.5px">${esc(x.name.en)}</span></span><span class="badge kind">${lname(x.layer)}</span></button>`
        : `<button class="result" data-open="a:${x.id}"><span class="dot" style="--c:var(--meso)"></span>${esc(x.name.ko)}<span class="badge kind">기형</span></button>`)].join("") || `<p class="empty">결과가 없어요.</p>`;
  };
}
function openSettings() {
  overlay.hidden = false;
  const seg = (key, opts) => `<span class="seg">${opts.map(([v, ko]) => `<button data-set="${key}:${v}" aria-pressed="${state[key] === v}">${ko}</button>`).join("")}</span>`;
  overlay.innerHTML = `<div class="overlay-inner"><div class="ov-head"><h1 style="font-size:24px;flex:1">설정</h1><button class="icon-btn" id="ovClose" aria-label="닫기">✕</button></div>
    <section class="card"><p class="sec-title">모드</p>${seg("mode", [["public", "일반인"], ["student", "학생"], ["clinical", "임상"]])}</section>
    <section class="card"><p class="sec-title">날짜 기준</p>${seg("base", [["fert", "수정 후 나이"], ["ga", "임신 주수"]])}<p class="muted" style="font-size:13px">임신 주수는 마지막 생리 시작일부터 세며, 수정 후 나이보다 약 2주 많습니다.</p></section>
    <section class="card"><p class="sec-title">화면</p>${seg("theme", [["auto", "기기 설정"], ["light", "밝게"], ["dark", "어둡게"]])}</section>
    <section class="card"><p class="sec-title">학습 기록</p><button class="btn" id="resetSrs">퀴즈 기록 지우기</button></section>
    <section class="notice">교육용 정보이며 진단이나 치료를 대신하지 않습니다. 내용 기준: Langman 인체발생학 15판(번역서). 일부 항목은 교재 대조가 남아 '검수 중'으로 표시됩니다.<br>
      구조 ${db.S.size}개 · 기형 ${db.A.size}개 · 표 ${db.tables.length}개 · 사건 ${db.events.length}개</section></div>`;
  $("#ovClose").onclick = closeOverlay;
  $("#resetSrs").onclick = () => { store.set("srs", {}); store.set("wrong", []); state.quiz = null; alert("퀴즈 기록을 지웠어요."); };
}
function applyTheme() { if (state.theme === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.dataset.theme = state.theme; }

/* ---------- 이벤트 위임 ---------- */
document.addEventListener("click", e => {
  const t = e.target.closest("[data-open],[data-tab],[data-mode],[data-module],[data-layer],[data-organ],[data-week],[data-base],[data-quiz],[data-choice],[data-set],[data-bookmark],#nextQ,#searchBtn,#settingsBtn");
  if (!t) return;
  const d = t.dataset;
  if (t.id === "searchBtn") return openSearch();
  if (t.id === "settingsBtn") return openSettings();
  if (t.id === "nextQ") { state.quiz.i++; state.quiz.answered = null; return render(); }
  if (d.mode) { state.mode = d.mode; store.set("mode", d.mode); if (d.mode === "public") { state.base = "ga"; store.set("base", "ga"); } return go("home"); }
  if (d.set) { const [k, v] = d.set.split(":"); state[k] = v; store.set(k, v); applyTheme(); openSettings(); return render(); }
  if (d.bookmark) { const i = state.bookmarks.indexOf(d.bookmark); i < 0 ? state.bookmarks.push(d.bookmark) : state.bookmarks.splice(i, 1); store.set("bookmarks", state.bookmarks); return open(d.bookmark, false); }
  if (d.organ) { state.organ = d.organ; store.set("organ", d.organ); closeOverlay(); return go("body"); }
  if (d.open) { if (!overlay.hidden && t.classList.contains("result")) closeOverlay(); return open(d.open); }
  if (d.module) return go("module", { module: d.module });
  if (d.tab) { closeOverlay(); closeSheet(); if (d.tab === "study" && state.tab === "study") state.quiz = null; return go(d.tab); }
  if ("layer" in d) { state.layer = d.layer || null; document.querySelectorAll("[data-layer]").forEach(b => b.setAttribute("aria-pressed", (b.dataset.layer || null) === state.layer)); return filterTree(); }
  if (d.week) { state.week = Math.min(40, Math.max(3, state.week + +d.week)); store.set("week", state.week); return render(); }
  if (d.base) { state.base = d.base; store.set("base", d.base); return render(); }
  if (d.quiz) { state.quiz = makeQuiz(db, d.quiz, state.mode); return render(); }
  if (d.choice != null && state.quiz && state.quiz.answered == null) {
    const it = state.quiz.items[state.quiz.i], k = +d.choice;
    state.quiz.answered = k; if (k === it.answer) state.quiz.score++;
    recordAnswer(it, k === it.answer); return render();
  }
});

/* ---------- 시작 ---------- */
applyTheme();
loadData().then(d => { db = d; window.__emb = d; go("home"); }).catch(err => {
  view.innerHTML = `<div class="empty"><p>데이터를 불러오지 못했어요.</p><p class="mono" style="font-size:12px">${esc(err.message)}</p><p>파일을 직접 열었다면 로컬 서버로 열어 주세요.</p></div>`;
});
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
