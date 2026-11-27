// 몸 지도: Canva로 만든 몸 그림(app/body.jpg, 1000 × 1500) 위에 기관 점을 찍는다.
// 기관 좌표(data/lineage.json의 organs[].bodyPos)는 이 그림의 픽셀 좌표다. 그림을 바꾸면 좌표도 다시 맞출 것.
export const BODY_W = 1000, BODY_H = 1500;

export function bodySvg(organs, selected, col) {
  const dots = organs.map(o => {
    const [x, y] = o.bodyPos ?? o.pos ?? [0, 0];
    const L = o.origins?.[0]?.layer;
    return `<g class="hs ${o.id === selected ? "on" : ""}" data-organ="${o.id}" tabindex="0" role="button" aria-label="${o.ko}" style="--c:${col(L)}">
      <title>${o.ko}</title><circle class="halo" cx="${x}" cy="${y}" r="38"/><circle class="core" cx="${x}" cy="${y}" r="17"/><circle class="pip" cx="${x}" cy="${y}" r="7"/></g>`;
  }).join("");
  return `<svg viewBox="0 0 ${BODY_W} ${BODY_H}" role="group" aria-label="기관 위치 그림">
    <image class="body-img" href="app/body.jpg" x="0" y="0" width="${BODY_W}" height="${BODY_H}" preserveAspectRatio="xMidYMid meet"/>${dots}</svg>`;
}
