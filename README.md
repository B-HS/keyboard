# split-65

좌(30키)·우(35키) = **65키 분리형(split) 핫스왑 기계식 키보드 케이스**.
JSCAD(`@jscad/modeling`)로 파라메트릭 모델링하고, three.js 실시간 뷰어로 보며 설계하고, CNC/레이저컷용 **2D DXF**로 export한다. **PCB만 빼고 전부 아크릴(cast).**

> **monorepo (v0.0.1~).** 공유 three.js 렌더러(`src/renderer`) + 셸(`src/main.js`) 위에 프로젝트가 독립적으로 올라간다 — `65/`(split-65) · `keypad/`(split-keypad, 저손실 prototype). 뷰어는 65+keypad를 한 화면에 동시 렌더. 변경 이력은 [CHANGELOG.md](CHANGELOG.md), 재편 계획은 [docs/acknowledge/monorepo-keypad-migration.md](docs/acknowledge/monorepo-keypad-migration.md).

## 구조 (stacked, 위→아래)

```
🟡🔵 일체형 상판  = 베젤(5.0mm) + 보강판(1.5mm) 을 간격0으로 본딩한 1유닛 (6.5mm)
        ┊ 3.5mm (에어갭 / 스위치가 유지 / 마운트는 좌우 벽이 받침)
🟢 PCB  (핫스왑, 흰색 솔더마스크)
        ┊ 5.0mm (바텀갭 / 좌우 벽)
⚫ 하판  (1.5mm)
```

- **결착 = M2 관통 볼트**: 마운트 6곳/측(코너4 + 좌우 변중점2)마다 M2 볼트가 **하판 밑→위로** 관통해, 일체형 상판의 **플랜지형 M2 인서트**에 체결된다. 상단은 구멍·너트 0(베젤 솔리드 → 깨끗), 하단 머리는 고무발에 숨는다.
- **간격재 = 좌·우 아크릴 벽**(에어갭 3.5 / 바텀갭 5.0 → 갭별 2규격): 앞·뒤는 개방. 벽이 클램프 하중을 받아 스위치를 보호한다.
- **M2 채택으로 컴팩트**: 케이스 좌 143.35×105.25 / 우 162.4×105.25 mm, 스택 높이 18.1mm.

## 준비물 (구매)

### 체결 부자재 (알리익스프레스 등)

| 부품               | 규격                             | 수량 | 비고                                                            |
| ------------------ | -------------------------------- | :--: | --------------------------------------------------------------- |
| **M2 볼트**        | 버튼헤드 **14~16mm**, 스테인리스 |  12  | 하단 진입. 스택 18.1에 맞춰(너무 길면 솔리드 베젤에 닿음)       |
| **M2 열간 인서트** | 황동, **플랜지형**, L3~4         |  12  | 일체형 상판에 압입(나사산). 플랜지가 보강판 위에 걸쳐 인장 받음 |
| **M2 평와셔**      | M2                               |  12  | 얇은 보강판(1.5)·하판 압력 분산용                               |
| **고무발**         | Ø8~~10, 높이 3~~4mm              |  8   | 하단 볼트머리 은닉 + 미끄럼 방지                                |
| **아크릴 접착제**  | 아크릴 솔벤트/시멘트(Weld-On 등) |  1   | 베젤+보강판 → 일체형 상판 본딩                                  |

> 스위치·소켓·다이오드·스태빌·컨트롤러·키캡 등 전체 빌드 목록은 **[docs/acknowledge/bom-aliexpress.md](docs/acknowledge/bom-aliexpress.md)**.

### 가공·발주 (별도)

- **CNC**(cast 아크릴): 일체형 상판(베젤5.0+보강판1.5)·하판(1.5)·벽(에어갭3.5·바텀5.0). `bun run export:65` → `65/export-out/*.dxf` 윤곽으로 발주.
- **PCB**: KiCad(`65/raw/leftplate`·`65/raw/rightplate`) → JLCPCB(흰색 솔더마스크, 핫스왑 풋프린트).

## 실행

```bash
bun install
bun run dev          # three.js 실시간 뷰어 (localhost:5173, 65 + keypad 한 화면 동시 렌더)
bun run export:65    # 65 DXF 10장 → 65/export-out/ (측당 5: bezel/plate/bottom/spacer-airgap/spacer-bottomgap)
bun run export:keypad# keypad DXF 5장 → keypad/export-out/
bun run smoke:65     # 65 부품 생성·치수 검증
bun run smoke:keypad # keypad 부품 생성·치수 검증
bun run build        # 뷰어 빌드
bun run format       # prettier
```

**뷰어**: 65(좌+우)와 keypad가 한 화면에 나란히 렌더. 통합 토글 7개(상판·PCB·하판·스페이서·볼트·스위치·키캡) + 비교(Zen 65·49, 기본 off) + 투명도 슬라이더(기본 80%). 드래그 회전 · 휠 확대 · 우클릭 이동.

## 문서

| 경로                                             | 내용                              |
| ------------------------------------------------ | --------------------------------- |
| `docs/PROCESS.md`                                | monorepo 현재 상태 단일 출처      |
| `keypad/docs/PROCESS.md`                         | split-keypad 프로젝트 단일 출처   |
| `docs/acknowledge/fastening-stacked-redesign.md` | 결착 설계 진화·확정(현재 v3)      |
| `docs/acknowledge/bom-aliexpress.md`             | 전체 구매 목록                    |
| `docs/acknowledge/case-construction.md`          | 케이스 구조(§13 현재, §1~12 이력) |
| `docs/memory/cherry-mx-dimensions.md`            | Cherry MX 표준 치수               |

## 원본 레이아웃 (KLE-NG)

- [Left](https://editor.keyboard-tools.xyz/#share=NrBEAYBp1SMgjLeAmZUDM7IBZsFZsA2UAXUjAWmSqTirXsiybycKZPOAG9QB3UAC4EAOhT4AvnBTUZiZLMahZLFbkWRC3PoJGiA7FLgY5oU3XORlptabZXtFUDjOu6u4WInSX12HwAHsLghvhweihhvq54pKRAA)
- [Right](https://editor.keyboard-tools.xyz/#share=NrBEAYBp1SMgjLeAmZUDM7IBZsFZsA2bAdlAF1JgBvUAD1AC5wA6fAXzgWmR6W6Q0grILyDCkOgHdmCdl1A8SVWg2ZtSnOCl47EyXcNC7RJ3IciSZc1im3mV1UBj0uDcV8ddnX499agskwoiq5OasEorFqKOHo2TPL2cULI8f7xkqDxJHDx5BQUQA)
