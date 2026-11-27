// 몸 지도: Canva로 만든 몸 그림(app/body.jpg, 1000 × 1500) 위에 기관 점을 찍는다.
// 기관 좌표(data/lineage.json의 organs[].bodyPos)는 이 그림의 픽셀 좌표다. 그림을 바꾸면 좌표도 다시 맞출 것.
export const BODY_W = 1000, BODY_H = 1500;

// 그림에 없는 기관(뼈, 골격근, 혈액, 피부)을 몸 그림 위에 겹쳐 그린다. 좌표는 body.jpg 픽셀 기준.
// 뼈: 오른다리(보는 쪽 오른쪽) / 골격근: 왼허벅지 / 혈관: 오른팔 / 피부: 왼팔 확대 원.
const EXTRAS = `
  <g class="bx-vessel" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".85">
    <path stroke="#D8363A" stroke-width="7" d="M505 365 C560 330 620 325 660 340 C690 400 705 520 718 620 C732 720 750 820 770 895 M770 895 l-8 34 M770 895 l6 36 M770 895 l18 28"/>
    <path stroke="#3E6FD8" stroke-width="7" d="M522 378 C572 350 626 350 674 356 C702 414 718 520 734 620 C748 720 764 815 786 890 M786 890 l14 30 M786 890 l24 20"/>
  </g>
  <g class="bx-bone" fill="#F4EDDD" stroke="#A8977A" stroke-width="3" stroke-linejoin="round">
    <path d="M566 888 q-14 -6 -12 10 q4 14 18 12 L583 1092 q-10 8 -2 18 q10 6 20 -2 q10 6 16 -6 q2 -12 -12 -14 L594 905 q12 -6 6 -18 q-10 -10 -22 0 q-6 -4 -12 1 z"/>
    <ellipse cx="600" cy="1118" rx="13" ry="11"/>
    <path d="M582 1136 q-6 -10 8 -12 l26 0 q12 4 4 14 L606 1418 q10 12 -2 18 l-16 0 q-10 -6 -2 -18 z"/>
    <path d="M626 1146 q2 -10 10 -4 L638 1410 q4 10 -4 12 q-8 -2 -6 -12 z"/>
  </g>
  <g class="bx-muscle" stroke="#A83B33" stroke-width="2.5" stroke-linejoin="round">
    <path fill="#D9655B" d="M360 900 C342 980 348 1060 382 1104 C394 1060 394 980 386 900 Z"/>
    <path fill="#E07368" d="M398 884 C384 960 392 1040 405 1096 C420 1040 430 960 420 884 Z"/>
    <path fill="#D9655B" d="M444 960 C468 1012 464 1072 432 1106 C424 1060 428 1000 444 960 Z"/>
    <path fill="none" stroke="#F2A79F" stroke-width="2" d="M368 930 l6 140 M410 900 l-2 180 M447 990 l-8 90"/>
    <path fill="#F3EEE6" stroke="#B9A99A" d="M398 1094 l14 0 l-2 20 l-10 0 z"/>
  </g>
  <g class="bx-skin">
    <circle cx="297" cy="610" r="26" fill="none" stroke="#7A5648" stroke-width="3" stroke-dasharray="7 5"/>
    <line x1="275" y1="596" x2="214" y2="560" stroke="#7A5648" stroke-width="3"/>
    <clipPath id="skinClip"><circle cx="150" cy="490" r="86"/></clipPath>
    <g clip-path="url(#skinClip)">
      <rect x="60" y="400" width="180" height="60" fill="#F7D9C9"/>
      <rect x="60" y="460" width="180" height="60" fill="#EDB6A3"/>
      <rect x="60" y="520" width="180" height="60" fill="#F8E6BE"/>
      <path d="M60 460 q15 -10 30 0 t30 0 t30 0 t30 0 t30 0 t30 0" fill="none" stroke="#C98471" stroke-width="2.5"/>
      <g fill="#F2D49A" stroke="#D8B56E" stroke-width="1.5"><circle cx="85" cy="545" r="10"/><circle cx="110" cy="555" r="9"/><circle cx="190" cy="548" r="11"/><circle cx="215" cy="560" r="9"/></g>
      <path d="M150 400 L150 446" stroke="#5A3A30" stroke-width="4"/>
      <path d="M144 446 q6 -6 12 0 L160 512 q-10 12 -20 0 z" fill="#E8A48E" stroke="#9C5E4C" stroke-width="2"/>
      <path d="M196 410 L196 470 q0 22 10 30 q10 8 0 18 q-14 4 -14 -10" fill="none" stroke="#6E8FC8" stroke-width="3"/>
      <path d="M60 438 L240 438" stroke="#E9C2B1" stroke-width="2" opacity=".7"/>
    </g>
    <circle cx="150" cy="490" r="86" fill="none" stroke="#7A5648" stroke-width="4"/>
  </g>`;

export function bodySvg(organs, selected, col) {
  const dots = organs.map(o => {
    const [x, y] = o.bodyPos ?? o.pos ?? [0, 0];
    const L = o.origins?.[0]?.layer;
    return `<g class="hs ${o.id === selected ? "on" : ""}" data-organ="${o.id}" tabindex="0" role="button" aria-label="${o.ko}" style="--c:${col(L)}">
      <title>${o.ko}</title><circle class="halo" cx="${x}" cy="${y}" r="38"/><circle class="core" cx="${x}" cy="${y}" r="17"/><circle class="pip" cx="${x}" cy="${y}" r="7"/></g>`;
  }).join("");
  return `<svg viewBox="0 0 ${BODY_W} ${BODY_H}" role="group" aria-label="기관 위치 그림">
    <image class="body-img" href="app/body.jpg" x="0" y="0" width="${BODY_W}" height="${BODY_H}" preserveAspectRatio="xMidYMid meet"/>${EXTRAS}${dots}</svg>`;
}
