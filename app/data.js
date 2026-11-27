// 데이터 불러오기와 색인. data/*.json 모듈을 모두 읽어 하나의 그래프로 묶는다.
export const MODULES = [
  "early", "lineage", "folding", "pharyngeal", "face",
  "cardiovascular", "cavities", "urogenital", "teratology"
];

export const LAYERS = {
  root: { ko: "초기 배아", c: "var(--root)" },
  ex: { ko: "배외조직", c: "var(--extra)" },
  ec: { ko: "외배엽", c: "var(--ecto)" },
  me: { ko: "중배엽", c: "var(--meso)" },
  en: { ko: "내배엽", c: "var(--endo)" },
  mix: { ko: "여러 배엽", c: "var(--mix)" }
};

export const BIRTH_DAY = 266; // 수정 후 약 38주

export async function loadData(base = "data/") {
  const mods = await Promise.all(MODULES.map(async id => {
    const res = await fetch(`${base}${id}.json`);
    if (!res.ok) throw new Error(`${id}.json을 불러오지 못했습니다 (${res.status})`);
    return res.json();
  }));
  return buildIndex(mods);
}

export function buildIndex(mods) {
  const S = new Map(), A = new Map(), moduleOf = new Map();
  const events = [], tables = [], organs = [], traps = [], principles = [];
  for (const m of mods) {
    for (const s of m.structures ?? []) { S.set(s.id, s); moduleOf.set(s.id, m.module); }
    for (const a of m.anomalies ?? []) { A.set(a.id, a); moduleOf.set(a.id, m.module); }
    for (const e of m.events ?? []) events.push({ ...e, module: m.module });
    for (const t of m.tables ?? []) tables.push({ ...t, module: m.module });
    organs.push(...(m.organs ?? []));
    traps.push(...(m.traps ?? []).map(t => ({ ...t, module: m.module })));
    principles.push(...(m.principles ?? []).map(p => ({ ...p, module: m.module })));
  }
  // 트리 부모: parent가 없으면 attachTo의 첫 구조에 붙여 계보 트리에서 찾을 수 있게 한다.
  const treeParent = new Map(), children = new Map();
  for (const s of S.values()) {
    const p = s.parent ?? (s.attachTo ?? []).find(id => S.has(id)) ?? null;
    if (p && S.has(p) && p !== s.id) {
      treeParent.set(s.id, p);
      if (!children.has(p)) children.set(p, []);
      children.get(p).push(s.id);
    }
  }
  const byStart = (a, b) => (S.get(a).days?.start ?? 999) - (S.get(b).days?.start ?? 999);
  for (const list of children.values()) list.sort(byStart);
  const roots = [...S.keys()].filter(id => !treeParent.has(id)).sort(byStart);

  // 기형 → 연결된 구조 (구조.anomalies + 기형.cause)
  const anomalyStructs = new Map();
  const link = (a, s) => {
    if (!A.has(a) || !S.has(s)) return;
    if (!anomalyStructs.has(a)) anomalyStructs.set(a, new Set());
    anomalyStructs.get(a).add(s);
  };
  for (const s of S.values()) (s.anomalies ?? []).forEach(a => link(a, s.id));
  for (const a of A.values()) (a.cause ?? []).forEach(s => link(a.id, s));

  events.sort((a, b) => a.day - b.day);
  const moduleTitles = Object.fromEntries(mods.map(m => [m.module, m.title?.ko ?? m.module]));
  return { mods, S, A, moduleOf, moduleTitles, treeParent, children, roots, anomalyStructs, events, tables, organs, traps, principles };
}

export function path(db, id) {
  const p = [];
  for (let cur = id, guard = 0; cur && guard < 40; cur = db.treeParent.get(cur), guard++) p.unshift(cur);
  return p;
}

// 검색용 문자열
export function haystack(x) {
  const n = x.name ?? {};
  return [n.ko, n.en, ...(n.alt ?? []), ...(x.derivatives ?? []), ...(x.findings ?? []),
    x.text?.public, x.text?.student, x.text?.clinical, x.public, x.mechanism]
    .filter(Boolean).join(" ").replace(/<[^>]+>/g, "").toLowerCase();
}
