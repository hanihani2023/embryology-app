// 몸 지도: 도식형 실루엣 위에 기관 점을 찍는다. 좌표계는 기존 페이지와 같은 900 × 1273.
const ARM_L = "M300 262 Q250 282 236 362 L196 700 Q192 732 214 736 L242 736 L272 424 L302 334 Z";
const mirror = d => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${890 - +x} ${y}`);

export function bodySvg(organs, selected, col) {
  const dots = organs.map(o => {
    const [x, y] = o.bodyPos ?? o.pos ?? [0, 0];
    const L = o.origins?.[0]?.layer;
    return `<g class="hs ${o.id === selected ? "on" : ""}" data-organ="${o.id}" tabindex="0" role="button" aria-label="${o.ko}" style="--c:${col(L)}">
      <title>${o.ko}</title><circle class="halo" cx="${x}" cy="${y}" r="34"/><circle class="core" cx="${x}" cy="${y}" r="15"/><circle class="pip" cx="${x}" cy="${y}" r="6"/></g>`;
  }).join("");
  return `<svg viewBox="0 0 890 1273" role="group" aria-label="기관 위치 그림">
    <g class="silhouette">
      <ellipse cx="445" cy="115" rx="92" ry="105"/>
      <rect x="402" y="200" width="86" height="60" rx="20"/>
      <path d="M300 255 Q445 228 590 255 L600 520 Q592 700 562 772 L328 772 Q298 700 290 520 Z"/>
      <path d="${ARM_L}"/><path d="${mirror(ARM_L)}"/>
      <path d="M330 760 L440 760 L432 1242 L344 1242 Z"/><path d="M450 760 L560 760 L546 1242 L458 1242 Z"/>
    </g>${dots}</svg>`;
}
