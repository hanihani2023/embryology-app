// 시간 탭의 발생 단계 그림. 모든 그림은 viewBox 0 0 200 150의 도식(실제 비율 아님).
// 색은 배엽 색(styles.css 변수)을 class로 칠한다: f-ec 외배엽, f-me 중배엽, f-en 내배엽, f-ex 배외조직, f-root 초기 배아.
// img는 Canva로 만든 그림(app/stages/<id>.jpg, 4:3). w8은 Canva 안전 검사에 막혀 그림이 없어 도식을 그대로 쓴다. svg는 구조 이름이 붙은 도식으로, 앱에서 "도식"을 고르면 보인다.
// day는 수정 후 일수(대략값). 한 단계는 다음 단계의 day 전날까지 보여준다.

const zona = (r = 56, dashed = false) =>
  `<circle class="zp${dashed ? " dash" : ""}" cx="100" cy="75" r="${r}"/>`;
const cell = (x, y, r, nuc = true) =>
  `<circle class="cell" cx="${x}" cy="${y}" r="${r}"/>${nuc ? `<circle class="nuc" cx="${x}" cy="${y}" r="${(r * 0.28).toFixed(1)}"/>` : ""}`;
const lbl = (x, y, t, a = "start") => `<text class="lbl" x="${x}" y="${y}" text-anchor="${a}">${t}</text>`;
const lead = (x1, y1, x2, y2) => `<line class="lead" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;

// 육각 격자로 상실배 세포 배치
function morulaCells() {
  const out = [];
  for (let row = -3; row <= 3; row++) for (let col = -3; col <= 3; col++) {
    const x = 100 + col * 19 + (row % 2 ? 9.5 : 0), y = 75 + row * 16.5;
    if (Math.hypot(x - 100, y - 75) <= 40) out.push(cell(x, y, 11.5));
  }
  return out.join("");
}

// 4주 무렵 C자 배아 (옆에서 본 모습): 머리 왼쪽 위, 등 오른쪽, 꼬리 아래
const EMB4 = "M70 30 C110 10 160 35 160 80 C160 115 130 136 104 129 C94 126 97 115 108 116 C121 113 128 96 120 83 C112 71 96 73 88 78 C76 88 55 86 51 70 C47 55 55 37 70 30 Z";
function somites(cx, cy, r, a0, a1, n, w = 6, h = 4) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const a = (a0 + (a1 - a0) * i / (n - 1)) * Math.PI / 180;
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a), deg = (a * 180 / Math.PI) + 90;
    s += `<rect class="f-me" x="${(x - w / 2).toFixed(1)}" y="${(y - h / 2).toFixed(1)}" width="${w}" height="${h}" rx="1.5" transform="rotate(${deg.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }
  return s;
}

export const STAGES = [
  {
    id: "zyg", img: "app/stages/zyg.jpg", day: 0, ko: "접합자", en: "Zygote", ref: "zyg",
    note: "정자와 난자가 만나 세포 하나가 됩니다. 아직 두 전핵(엄마·아빠 쪽 염색체)이 따로 보여요.",
    svg: `${zona()}<circle class="cell" cx="100" cy="77" r="47"/>
      <circle class="nuc big" cx="86" cy="77" r="10"/><circle class="nuc big" cx="114" cy="77" r="10"/>
      <circle class="cell" cx="98" cy="24" r="4.5"/><circle class="cell" cx="107" cy="25.5" r="3.5"/>
      ${lead(114, 77, 160, 118)}${lbl(162, 124, "전핵")}${lead(103, 24, 150, 14)}${lbl(152, 16, "극체")}${lbl(28, 18, "투명대")}${lead(40, 22, 52, 42)}`
  },
  {
    id: "c2", img: "app/stages/c2.jpg", day: 1, ko: "2세포기", en: "2-cell stage", ref: "zyg",
    note: "수정 후 약 30시간에 첫 난할. 세포는 나뉘어도 전체 크기는 그대로입니다(투명대 안).",
    svg: `${zona()}${cell(77, 75, 26)}${cell(123, 75, 26)}${lbl(100, 142, "할구 2개", "middle")}`
  },
  {
    id: "c4", img: "app/stages/c4.jpg", day: 2, ko: "4세포기", en: "4-cell stage", ref: "zyg",
    note: "약 40시간에 4세포. 난할이 계속되며 세포는 점점 작아집니다.",
    svg: `${zona()}${cell(80, 57, 21)}${cell(120, 57, 21)}${cell(80, 95, 21)}${cell(120, 95, 21)}${lbl(100, 142, "할구 4개", "middle")}`
  },
  {
    id: "mor", img: "app/stages/mor.jpg", day: 3, ko: "상실배", en: "Morula", ref: "mor",
    note: "약 3일, 12–32개 세포가 뽕나무 열매처럼 뭉친 덩어리. 안쪽 세포는 내세포괴, 바깥 세포는 영양배엽이 됩니다.",
    svg: `${zona()}${morulaCells()}${lbl(100, 145, "세포 16개 안팎", "middle")}`
  },
  {
    id: "bla", img: "app/stages/bla.jpg", day: 5, ko: "포배", en: "Blastocyst", ref: "bla",
    note: "속에 빈 공간(포배강)이 생기고, 한쪽에 내세포괴(배아가 될 세포)가 모입니다. 투명대를 벗고 자궁에 도착해요.",
    svg: `${zona(60, true)}<circle class="cav" cx="100" cy="75" r="47"/><circle class="tro" cx="100" cy="75" r="47"/>
      <path class="f-root" d="M68 44 Q100 22 132 44 Q124 66 100 68 Q76 66 68 44 Z"/>
      ${lead(100, 52, 150, 16)}${lbl(152, 18, "내세포괴")}${lead(146, 82, 170, 112)}${lbl(160, 124, "영양배엽")}${lbl(100, 100, "포배강", "middle")}`
  },
  {
    id: "impl", img: "app/stages/impl.jpg", day: 6, ko: "착상 시작", en: "Implantation", ref: "impl",
    note: "6일 무렵 내세포괴 쪽 영양배엽이 자궁내막에 붙고, 합포체영양막이 내막 속으로 파고듭니다.",
    svg: `<rect class="endo-wall" x="0" y="0" width="200" height="58"/>
      <path class="gland" d="M30 0 Q24 20 34 40 M78 0 Q72 18 82 34 M150 0 Q156 22 146 42 M182 0 Q176 16 186 30"/>
      <path class="f-ex syn" d="M72 66 Q78 44 92 50 Q98 34 108 48 Q122 40 128 64 Z"/>
      <circle class="cav" cx="100" cy="95" r="38"/><circle class="tro" cx="100" cy="95" r="38"/>
      <path class="f-root" d="M74 70 Q100 54 126 70 Q118 86 100 88 Q82 86 74 70 Z"/>
      ${lbl(8, 14, "자궁내막")}${lead(116, 50, 160, 70)}${lbl(140, 82, "합포체영양막")}${lbl(100, 115, "포배강", "middle")}`
  },
  {
    id: "bil", img: "app/stages/bil.jpg", day: 9, ko: "이층배반", en: "Bilaminar disc", ref: "bil",
    note: "2주째. 배아는 배반엽상층과 배반엽하층 두 층의 원판입니다. 위로 양막강, 아래로 난황낭이 생겨요.",
    svg: `<rect class="endo-wall" x="0" y="0" width="200" height="150"/>
      <ellipse class="f-ex syn" cx="100" cy="76" rx="84" ry="66"/>
      <circle class="lac" cx="36" cy="60" r="6"/><circle class="lac" cx="160" cy="54" r="7"/><circle class="lac" cx="58" cy="122" r="6"/><circle class="lac" cx="148" cy="118" r="6"/><circle class="lac" cx="100" cy="20" r="5"/>
      <ellipse class="cyto" cx="100" cy="76" rx="64" ry="50"/>
      <path class="amc" d="M66 63 Q68 26 100 26 Q132 26 134 63 Z"/>
      <rect class="f-root" x="64" y="62" width="72" height="9" rx="3"/>
      <rect class="f-hyp" x="64" y="71" width="72" height="6" rx="2"/>
      <path class="ysc" d="M64 77 Q56 118 100 120 Q144 118 136 77 Z"/>
      ${lbl(100, 50, "양막강", "middle")}${lbl(100, 104, "일차난황낭", "middle")}
      ${lead(136, 66, 176, 22)}${lbl(196, 18, "배반엽상층", "end")}${lead(136, 75, 178, 140)}${lbl(196, 146, "배반엽하층", "end")}`
  },
  {
    id: "exm", img: "app/stages/exm.jpg", day: 13, ko: "2주 말: 융모막강", en: "Chorionic cavity", ref: "exm",
    note: "배외중배엽 사이에 융모막강이 넓게 열리고, 배아는 연결줄기 하나로 매달립니다(나중의 탯줄). 이차난황낭이 생겨요.",
    svg: `<circle class="chorion" cx="100" cy="76" r="66"/>
      <path class="villi" d="${Array.from({ length: 18 }, (_, i) => { const a = i / 18 * Math.PI * 2, x = 100 + 66 * Math.cos(a), y = 76 + 66 * Math.sin(a), x2 = 100 + 76 * Math.cos(a), y2 = 76 + 76 * Math.sin(a); return `M${x.toFixed(1)} ${y.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`; }).join(" ")}"/>
      <circle class="cav" cx="100" cy="76" r="60"/>
      <path class="stalk" d="M88 16 Q92 30 92 42 L108 42 Q108 30 112 16 Z"/>
      <path class="amc" d="M76 62 Q78 38 100 38 Q122 38 124 62 Z"/>
      <rect class="f-root" x="76" y="62" width="48" height="7" rx="3"/>
      <rect class="f-hyp" x="76" y="69" width="48" height="5" rx="2"/>
      <path class="ysc" d="M78 74 Q76 102 100 102 Q124 102 122 74 Z"/>
      ${lbl(100, 128, "융모막강", "middle")}${lead(112, 22, 150, 8)}${lbl(152, 10, "연결줄기")}${lead(122, 92, 168, 112)}${lbl(140, 124, "이차난황낭")}`
  },
  {
    id: "gas", img: "app/stages/gas.jpg", day: 15, ko: "낭배형성", en: "Gastrulation", ref: "gas",
    note: "3주째. 원시선을 통해 상층 세포가 안으로 들어가 외배엽·중배엽·내배엽 세 층이 됩니다.",
    svg: `<ellipse class="f-ec tint" cx="42" cy="74" rx="30" ry="58"/><ellipse class="edge" cx="42" cy="74" rx="30" ry="58"/>
      <circle class="mark" cx="42" cy="26" r="5"/><path class="streak" d="M42 78 L42 122"/><circle class="node" cx="42" cy="76" r="5"/>
      <circle class="mark" cx="42" cy="128" r="3.5"/>
      ${lbl(6, 12, "머리 쪽")}${lead(46, 104, 76, 112)}${lbl(76, 116, "원시선")}${lead(47, 74, 76, 64)}${lbl(76, 62, "원시결절")}
      <rect class="f-ec" x="118" y="52" width="78" height="12" rx="3"/>
      <rect class="f-me" x="118" y="68" width="78" height="14" rx="3"/>
      <rect class="f-en" x="118" y="86" width="78" height="10" rx="3"/>
      <path class="groove" d="M151 52 Q157 62 163 52"/><path class="arrow" d="M157 62 L157 72 M157 72 L139 76 M157 72 L175 76"/>
      ${lbl(157, 40, "단면", "middle")}${lbl(140, 112, "외배엽")}${lbl(140, 124, "중배엽")}${lbl(140, 136, "내배엽")}
      <circle class="f-ec" cx="132" cy="109" r="3"/><circle class="f-me" cx="132" cy="121" r="3"/><circle class="f-en" cx="132" cy="133" r="3"/>`
  },
  {
    id: "np", img: "app/stages/np.jpg", day: 18, ko: "신경판과 척삭", en: "Neural plate", ref: "ntc",
    note: "척삭이 위쪽 외배엽을 유도해 두꺼운 신경판이 생깁니다. 원시선은 꼬리 쪽으로 줄어들어요.",
    svg: `<path class="f-ec tint" d="M52 14 C88 14 92 60 82 96 C76 120 64 134 52 134 C40 134 28 120 22 96 C12 60 16 14 52 14 Z"/>
      <path class="f-ec" d="M52 22 C74 22 76 50 66 70 L60 96 L44 96 L38 70 C28 50 30 22 52 22 Z"/>
      <path class="streak" d="M52 108 L52 126"/><circle class="node" cx="52" cy="104" r="4"/>
      ${lead(66, 44, 92, 30)}${lbl(94, 30, "신경판")}
      <path class="f-ec tint" d="M104 60 L196 60 L196 70 L104 70 Z"/>
      <path class="f-ec" d="M126 56 Q150 52 174 56 L174 70 L126 70 Z"/>
      <circle class="f-me" cx="150" cy="80" r="6"/>
      <path class="f-me tint" d="M104 74 L140 74 L140 92 L104 92 Z M160 74 L196 74 L196 92 L160 92 Z"/>
      <rect class="f-en" x="104" y="94" width="92" height="7" rx="2"/>
      ${lbl(150, 46, "단면", "middle")}${lead(150, 86, 150, 118)}${lbl(150, 128, "척삭", "middle")}${lbl(108, 86, "중배엽")}${lbl(196, 142, "내배엽", "end")}`
  },
  {
    id: "nt", img: "app/stages/nt.jpg", day: 22, ko: "신경관과 체절", en: "Neural tube, somites", ref: "nt",
    note: "22일 무렵 신경주름이 가운데부터 붙어 신경관이 되고, 양옆에 체절이 쌍으로 생깁니다. 심장이 뛰기 시작해요.",
    svg: `<path class="f-ec tint" d="M50 8 C76 8 84 40 80 76 C78 110 66 142 50 142 C34 142 22 110 20 76 C16 40 24 8 50 8 Z"/>
      <path class="f-ec" d="M50 14 C66 14 70 34 62 50 L56 96 C60 112 58 128 50 132 C42 128 40 112 44 96 L38 50 C30 34 34 14 50 14 Z"/>
      <path class="seam" d="M50 52 L50 94"/>
      ${Array.from({ length: 7 }, (_, i) => `<rect class="f-me" x="30" y="${56 + i * 6}" width="8" height="4.5" rx="1.5"/><rect class="f-me" x="62" y="${56 + i * 6}" width="8" height="4.5" rx="1.5"/>`).join("")}
      ${lead(62, 24, 86, 14)}${lbl(88, 16, "앞신경구멍")}${lead(56, 126, 86, 136)}${lbl(88, 140, "뒤신경구멍")}${lead(70, 70, 92, 80)}${lbl(94, 84, "체절")}
      <circle class="f-ec" cx="160" cy="46" r="11"/><circle class="cav" cx="160" cy="46" r="3"/>
      <circle class="f-ec" cx="146" cy="38" r="2.5"/><circle class="f-ec" cx="174" cy="38" r="2.5"/>
      <path class="f-ec tint" d="M118 34 Q160 18 202 34 L202 38 Q160 24 118 38 Z"/>
      <circle class="f-me" cx="160" cy="64" r="4"/>
      <rect class="f-me" x="132" y="50" width="12" height="16" rx="4"/><rect class="f-me" x="176" y="50" width="12" height="16" rx="4"/>
      <path class="f-me tint" d="M118 74 Q140 70 150 86 L170 86 Q180 70 202 74 L202 80 Q182 78 172 94 L148 94 Q138 78 118 80 Z"/>
      <circle class="f-en" cx="160" cy="94" r="7"/><circle class="cav" cx="160" cy="94" r="3"/>
      ${lbl(160, 18, "단면", "middle")}${lbl(160, 118, "신경관·척삭·장관", "middle")}`
  },
  {
    id: "fold", img: "app/stages/fold.jpg", day: 26, ko: "배아 접힘", en: "Folding", ref: "fold",
    note: "4주째 원판이 머리–꼬리, 양옆으로 접혀 C자 몸통이 됩니다. 인두궁과 심장 돌출이 보이고, 난황낭은 가는 관으로 이어져요.",
    svg: `<path class="emb" d="${EMB4}"/>
      ${somites(115, 80, 40, -112, 40, 14)}
      <path class="arch" d="M56 56 q8 4 14 0 M54 64 q8 4 14 0 M56 72 q7 3 12 0"/>
      <ellipse class="f-me tint" cx="68" cy="82" rx="12" ry="8"/>
      <circle class="eye0" cx="66" cy="42" r="3"/>
      <path class="duct" d="M96 80 Q80 100 66 112"/><circle class="f-en tint" cx="58" cy="120" r="12"/>
      ${lbl(44, 140, "난황낭", "middle")}${lead(62, 64, 20, 54)}${lbl(4, 50, "인두궁")}${lead(66, 86, 22, 92)}${lbl(4, 98, "심장")}${lead(150, 56, 170, 44)}${lbl(172, 44, "체절")}`
  },
  {
    id: "w5", img: "app/stages/w5.jpg", day: 32, ko: "5주: 팔다리싹", en: "Limb buds", ref: "pa1",
    note: "팔싹, 이어서 다리싹이 돋습니다. 인두궁 네 쌍과 수정체판(눈)이 보이고, 뇌가 빠르게 커져요.",
    svg: `<path class="emb" d="M64 20 C108 0 166 30 162 82 C160 116 132 138 106 130 C96 127 98 116 110 116 C122 112 128 98 122 86 C114 74 98 76 90 82 C74 94 50 90 44 72 C38 54 44 30 64 20 Z"/>
      ${somites(112, 80, 42, -100, 38, 16, 5, 3.5)}
      <path class="arch" d="M50 54 q8 4 14 0 M48 62 q8 4 14 0 M50 70 q7 3 12 0 M54 77 q6 2 10 0"/>
      <ellipse class="f-me tint" cx="68" cy="88" rx="13" ry="8"/>
      <circle class="eye0" cx="62" cy="38" r="4"/>
      <ellipse class="limb" cx="128" cy="70" rx="7" ry="11" transform="rotate(-20 128 70)"/>
      <ellipse class="limb" cx="134" cy="112" rx="6" ry="9" transform="rotate(20 134 112)"/>
      <path class="duct" d="M98 84 Q86 104 76 116"/><circle class="f-en tint" cx="70" cy="124" r="9"/>
      ${lead(136, 66, 172, 56)}${lbl(198, 52, "팔싹", "end")}${lead(140, 112, 170, 120)}${lbl(198, 126, "다리싹", "end")}${lead(60, 36, 22, 22)}${lbl(4, 18, "눈")}`
  },
  {
    id: "w6", img: "app/stages/w6.jpg", day: 42, ko: "6주: 손판", en: "Hand plates", ref: "face",
    note: "팔다리 끝이 납작한 손판·발판이 되고 손가락 줄기가 보입니다. 얼굴 융기가 합쳐지기 시작하고 귓바퀴 언덕이 생겨요.",
    svg: `<path class="emb" d="M70 14 C120 -2 170 36 162 88 C156 122 128 140 104 132 C96 128 100 120 108 118 C120 114 124 100 118 90 C110 80 96 84 90 90 C70 100 44 92 40 70 C36 44 46 22 70 14 Z"/>
      <circle class="eye1" cx="62" cy="48" r="5.5"/>
      <path class="arch" d="M82 66 q4 -4 8 0 q-2 6 -8 6"/>
      <path class="limb" d="M118 70 Q130 72 132 84 L136 90 Q130 98 122 94 Q116 86 118 70 Z"/>
      <path class="rays" d="M128 86 L133 92 M126 89 L130 96 M123 90 L126 97"/>
      <path class="limb" d="M132 112 Q142 114 144 124 Q138 132 130 128 Q126 120 132 112 Z"/>
      <path class="cord" d="M98 92 Q86 110 80 132"/>
      <ellipse class="f-me tint" cx="68" cy="94" rx="11" ry="7"/>
      ${lead(134, 92, 176, 86)}${lbl(176, 82, "손판")}${lead(86, 64, 112, 12)}${lbl(114, 10, "귓바퀴 언덕")}${lbl(84, 146, "탯줄", "middle")}`
  },
  {
    id: "w8", day: 56, ko: "8주: 배아기 끝", en: "End of embryonic period", ref: null,
    note: "손가락·발가락이 갈라지고 눈꺼풀, 귓바퀴가 생깁니다. 주요 기관의 기본 꼴이 갖춰져 9주부터 태아라 부릅니다.",
    svg: `<circle class="emb" cx="80" cy="56" r="36"/>
      <path class="emb" d="M100 84 C128 82 150 98 148 122 C146 140 120 146 100 138 C84 132 80 110 92 96 Z"/>
            <path class="eyelid" d="M56 54 q8 -6 16 0"/><circle class="eye1" cx="64" cy="58" r="4"/>
      <path class="ear" d="M92 54 q8 -6 10 4 q0 8 -8 8"/>
      <path class="limb" d="M106 96 Q98 112 82 110"/><path class="rays" d="M80 110 l-6 -4 M80 110 l-7 0 M80 110 l-6 4"/>
      <path class="limb" d="M134 128 Q126 142 108 142"/><path class="rays" d="M108 142 l-5 -4 M108 142 l-6 0 M108 142 l-5 4"/>
      <path class="cord" d="M112 116 Q140 128 180 140"/>
      ${lead(64, 50, 30, 22)}${lbl(8, 18, "눈꺼풀")}${lead(98, 56, 130, 30)}${lbl(132, 28, "귓바퀴")}${lbl(176, 132, "탯줄", "end")}`
  },
  {
    id: "w12", img: "app/stages/w12.jpg", day: 84, ko: "12주: 태아기", en: "Fetus, 12 weeks", ref: "extg",
    note: "머리가 몸길이의 절반쯤. 탈장됐던 창자가 배 안으로 돌아오고, 바깥생식기로 성별을 구별할 수 있게 됩니다.",
    svg: `<ellipse class="sac" cx="100" cy="76" rx="92" ry="68"/>
      <circle class="emb" cx="70" cy="58" r="30"/>
      <path class="emb" d="M90 76 C120 70 150 84 150 108 C150 128 128 134 108 128 C92 122 84 100 90 76 Z"/>
      <circle class="eye1" cx="56" cy="58" r="3"/><path class="ear" d="M80 56 q6 -4 8 3 q0 6 -6 6"/>
      <path class="limb" d="M100 90 Q90 104 74 104"/><path class="rays" d="M74 104 l-5 -3 M74 104 l-6 1 M74 104 l-4 4"/>
      <path class="limb" d="M138 118 Q132 134 112 136"/><path class="rays" d="M112 136 l-5 -3 M112 136 l-5 2"/>
      <path class="cord" d="M112 110 Q150 126 176 98"/>
      ${lbl(100, 20, "양막", "middle")}`
  },
  {
    id: "w20", img: "app/stages/w20.jpg", day: 140, ko: "20주 무렵", en: "Fetus, ~20 weeks", ref: null,
    note: "엄마가 태동을 느끼기 시작하는 무렵(임신 약 18–20주). 몸에 솜털이 나고, 머리와 몸의 비율이 아기에 가까워져요.",
    svg: `<ellipse class="sac" cx="100" cy="76" rx="92" ry="68"/>
      <path class="emb" d="M66 62 C80 40 132 34 160 58 C182 80 172 118 140 126 C112 132 82 120 70 100 Z"/>
      <circle class="emb" cx="54" cy="66" r="24"/>
      <circle class="eye1" cx="40" cy="66" r="2.4"/><path class="ear" d="M62 62 q5 -4 7 3 q0 5 -5 6"/>
      <path class="limb" d="M92 70 Q80 92 50 90"/><path class="rays" d="M50 90 l-4 -3 M50 90 l-5 1"/>
      <path class="limb" d="M156 70 Q140 92 150 112 Q130 128 100 120"/><path class="rays" d="M100 120 l-5 -3 M100 120 l-5 2"/>
      <path class="cord" d="M108 104 Q130 140 180 118"/>
      ${lbl(100, 20, "솜털·태지", "middle")}`
  },
  {
    id: "birth", img: "app/stages/birth.jpg", day: 259, ko: "출생 무렵", en: "Near term", ref: null,
    note: "수정 후 약 38주(임신 40주). 대부분 머리를 아래로 두고, 폐가 숨 쉴 준비를 마칩니다.",
    svg: `<path class="uterus" d="M100 6 C162 6 186 50 178 90 C170 126 136 146 100 146 C64 146 30 126 22 90 C14 50 38 6 100 6 Z"/>
      <path class="emb" d="M78 104 C58 84 60 34 98 22 C136 12 160 44 152 76 C146 100 128 112 112 108 Z"/>
      <circle class="emb" cx="96" cy="118" r="22"/>
      <path class="limb" d="M126 30 Q96 44 110 70 Q116 84 104 92"/><path class="limb" d="M80 78 Q88 92 100 96"/>
      <path class="cord" d="M118 84 Q150 96 140 130"/>`
  }
];

export function stageIndex(day) {
  let i = 0;
  for (let k = 0; k < STAGES.length; k++) if (STAGES[k].day <= day) i = k;
  return i;
}

export function stageSvg(st) {
  return `<svg class="st-svg" viewBox="0 0 200 150" role="img" aria-label="${st.ko} 그림">${st.svg}</svg>`;
}
