// 데이터에서 퀴즈 문제를 만들고, 맞고 틀린 기록(간단한 상자 방식 간격 반복)을 관리한다.
const store = {
  get(k, d) { try { const v = localStorage.getItem("emb:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("emb:" + k, JSON.stringify(v)); } catch { /* 무시 */ } }
};
const LAYER_CHOICES = [["ec", "외배엽"], ["me", "중배엽"], ["en", "내배엽"], ["ex", "배외조직"], ["mix", "여러 배엽"]];
const clean = s => String(s).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const short = s => { const c = clean(s); return c.length > 70 ? c.slice(0, 68) + "…" : c; };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, n) => shuffle([...a]).slice(0, n);

function withChoices(q, correct, wrongs, extra) {
  const opts = shuffle([correct, ...wrongs.slice(0, 3)]);
  return { q, choices: opts, answer: opts.indexOf(correct), ...extra };
}

function layerQ(s) {
  const opts = LAYER_CHOICES.map(([, ko]) => ko);
  const ans = LAYER_CHOICES.findIndex(([L]) => L === s.layer);
  return { id: "L:" + s.id, ref: "s:" + s.id, q: `‘${s.name.ko}’은(는) 어느 배엽에서 생길까요?`, choices: opts, answer: ans,
    explain: s.derivatives?.length ? "만드는 것: " + s.derivatives.slice(0, 2).map(clean).join(" · ") : "" };
}
function derivQ(db, s) {
  const right = pick(s.derivatives, 1)[0];
  const others = pick([...db.S.values()].filter(o => o.id !== s.id && o.derivatives?.length && o.layer !== s.layer), 3)
    .map(o => short(pick(o.derivatives, 1)[0]));
  return withChoices(`다음 중 ‘${s.name.ko}’에서 생기는 것은?`, short(right), others, { id: "D:" + s.id, ref: "s:" + s.id });
}
function archQs(db, s) {
  const arches = [...db.S.values()].filter(o => o.arch && o.id !== s.id && o.arch.nerve?.length);
  return [["nerve", "신경"], ["muscles", "근육"], ["skeleton", "뼈·연골"]].filter(([k]) => s.arch[k]?.length).map(([k, ko]) =>
    withChoices(`‘${s.name.ko}’의 ${ko}은(는)?`, short(s.arch[k].join(", ")),
      pick(arches.filter(o => o.arch[k]?.length), 3).map(o => short(o.arch[k].join(", "))), { id: `R:${s.id}:${k}`, ref: "s:" + s.id }));
}
function anomalyQ(db, a) {
  const causes = [...(db.anomalyStructs.get(a.id) ?? [])];
  if (!causes.length) return null;
  const right = db.S.get(causes[0]).name.ko;
  const wrongs = pick([...db.S.values()].filter(s => !causes.includes(s.id)), 3).map(s => s.name.ko);
  return withChoices(`‘${a.name.ko}’과(와) 관련된 발생 구조는?`, right, wrongs,
    { id: "A:" + a.id, ref: "a:" + a.id, explain: a.mechanism ? clean(a.mechanism) : "" });
}

export function makeQuiz(db, kind, mode) {
  const S = [...db.S.values()], exam = s => mode === "public" || s.examPoint;
  let pool = [];
  if (kind === "arch") pool = S.filter(s => s.arch).flatMap(s => archQs(db, s));
  else if (kind === "anomaly") pool = [...db.A.values()].map(a => anomalyQ(db, a)).filter(Boolean);
  else {
    pool = [
      ...S.filter(s => exam(s) && LAYER_CHOICES.some(([L]) => L === s.layer)).map(layerQ),
      ...S.filter(s => exam(s) && s.derivatives?.length).map(s => derivQ(db, s)),
      ...(mode === "public" ? [] : [...db.A.values()].filter(a => a.examPoint).map(a => anomalyQ(db, a)).filter(Boolean))
    ];
  }
  const srs = store.get("srs", {});
  pool.forEach(it => { it.w = 1 / (1 + (srs[it.id]?.box ?? 0)) + Math.random() * 0.5; });
  const items = pool.filter(it => it.answer >= 0 && it.choices.length >= 2).sort((a, b) => b.w - a.w).slice(0, 10);
  return { kind, items, i: 0, score: 0, answered: null };
}

export function recordAnswer(item, ok) {
  const srs = store.get("srs", {}), wrong = new Set(store.get("wrong", []));
  const box = srs[item.id]?.box ?? 0;
  srs[item.id] = { box: ok ? box + 1 : 0, t: Date.now() };
  if (!ok) wrong.add(item.ref);
  else if (srs[item.id].box >= 2) wrong.delete(item.ref);
  store.set("srs", srs); store.set("wrong", [...wrong]);
}
export const wrongList = () => store.get("wrong", []);
export function srsStats() {
  const srs = store.get("srs", {});
  return { learned: Object.values(srs).filter(v => v.box >= 2).length, wrong: store.get("wrong", []).length };
}
