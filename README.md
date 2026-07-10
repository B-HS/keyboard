# split-65

좌(30키)·우(35키) = **65키 분리형(split) 핫스왑 기계식 키보드 케이스**.
JSCAD(`@jscad/modeling`)로 파라메트릭 모델링하고, three.js 실시간 뷰어로 보며 설계하고, **FDM(A1 mini)용 3D STL**과 CNC/레이저컷용 **2D DXF** 두 경로로 export한다. **현재 제작 경로는 FDM 3D 프린트**(나사·인서트 외 전부 출력) — 아크릴 DXF 경로는 병행 보존.

> **monorepo (v0.0.1~).** React + TypeScript 뷰어(`src/`, FSD) 위에 프로젝트가 독립적으로 올라간다 — `65/`(split-65) · `keypad/`(split-keypad, 저손실 prototype). 뷰어는 현재 **65만 렌더**(keypad 코드·export·CI는 유지). 변경 이력은 [CHANGELOG.md](CHANGELOG.md), 재편 계획은 [docs/acknowledge/monorepo-keypad-migration.md](docs/acknowledge/monorepo-keypad-migration.md).

## 구조 (FDM, 위→아래)

```
top     베젤(5.0mm) + 지지 기둥 6개(Ø4.8, 일체 프린트)
plate   보강판(1.5mm) — 스위치 클립으로 PCB와 샌드위치, 기둥 홀 Ø6.4 통과
PCB     핫스왑, 마운트홀 Ø5.4 — 기둥 캡(Ø5.8)에 안착
bottom  평판(1.5mm) + 보스 + ESP32-C3 크래들
```

- **결착 = M1 하단 진입**: 마운트 6곳/측 — M1 나사가 하판 밑에서 기둥의 열간 인서트에 체결. **상면 구멍 0**, 무틸트, 총 스택 16.6mm.
- **조립**: plate에 스위치 체결 + PCB 결합(샌드위치) → 뒤집은 top의 기둥에 삽입(plate는 전부 통과, PCB는 캡에 정지) → bottom 덮고 M1 체결.
- 케이스 좌 146.4×108.2 / 우 165.4×108.3 mm. 상세: [65/docs/fdm-m1-case.md](65/docs/fdm-m1-case.md)(개정 2차) · [docs/PROCESS.md](docs/PROCESS.md).
- 이전 **아크릴 stacked 설계**(M2 관통 볼트, 스택 18.1mm)는 이력 — [docs/acknowledge/case-construction.md](docs/acknowledge/case-construction.md).

## 준비물 (구매)

### 체결 부자재 — FDM 경로 (현행)

| 부품               | 규격          | 수량 | 비고                             |
| ------------------ | ------------- | :--: | -------------------------------- |
| **M1 나사**        | M1×4mm        |  12  | 하단 진입, 기둥 인서트에 체결    |
| **M1 열간 인서트** | OD 2.0, L 2.5 |  12  | 기둥 하단 포켓(Ø1.75)에 압입     |
| **고무발**         | 높이 3~4mm    |  8   | 하단 나사머리 은닉 + 미끄럼 방지 |

> 스위치·소켓·다이오드·스태빌·컨트롤러·키캡 등 전체 빌드 목록은 **[docs/acknowledge/bom-aliexpress.md](docs/acknowledge/bom-aliexpress.md)**. 아크릴 경로(M2 관통 볼트·인서트·접착제)는 이력 — [docs/acknowledge/case-construction.md](docs/acknowledge/case-construction.md).

### 가공·발주 (별도)

- **FDM**(현행): `bun run export:65-fdm` → `65/export-out/fdm/*.stl` 측당 3장(top/plate/bottom)을 A1 mini로 출력. 1/5 검증 모형은 `export:65-fdm-mini`.
- **PCB**: KiCad(`65/pcb/{left,right}`) → JLCPCB 발주 파일 `65/pcb/order/jlcpcb-{left,right}.zip` (핫스왑 풋프린트, 사양 [65/docs/pcb-build.md](65/docs/pcb-build.md)).
- **CNC**(cast 아크릴, 병행 보존): `bun run export:65` → `65/export-out/*.dxf` 윤곽으로 발주.

## 실행

```bash
bun install
bun run dev                # three.js 실시간 뷰어 (localhost:5173, 65 좌+우)
bun run export:65-fdm      # 65 FDM STL 6장 → 65/export-out/fdm/ (측당 3: top/plate/bottom)
bun run export:65-fdm-mini # 1/5(SCALE=0.2) 검증 모형 → 65/export-out/fdm-mini/
bun run export:65          # 65 DXF 10장 → 65/export-out/ (아크릴 경로, 병행 보존)
bun run export:keypad      # keypad DXF 5장 → keypad/export-out/
bun run smoke:65           # 65 부품 생성·치수 검증
bun run smoke:keypad       # keypad 부품 생성·치수 검증
bun run typecheck          # tsc --noEmit
bun run build              # 뷰어 빌드
bun run format             # prettier
```

**뷰어**: 65(좌+우) 렌더. 부품 레이어 8개(상판·플레이트·PCB·하판·ESP32·볼트·스위치·키캡) 각각 표시·색·투명도 제어 + 비교 레퍼런스(Zen 65·49, 기본 off) + **웹 STL Export**(스케일 지정, 좌우 8장: top/plate/bottom/mock-pcb). 설정은 자동 저장. 드래그 회전 · 휠 확대 · 우클릭 이동.

## 문서

| 경로                                    | 내용                                  |
| --------------------------------------- | ------------------------------------- |
| `docs/PROCESS.md`                       | monorepo 현재 상태 단일 출처          |
| `65/docs/fdm-m1-case.md`                | FDM 케이스 설계 정본(개정 2차 = 현행) |
| `65/docs/pcb-build.md`                  | PCB 설계·JLCPCB 발주 사양             |
| `keypad/docs/PROCESS.md`                | split-keypad 프로젝트 단일 출처       |
| `docs/acknowledge/bom-aliexpress.md`    | 전체 구매 목록                        |
| `docs/acknowledge/case-construction.md` | 아크릴 케이스 구조(이력)              |
| `docs/memory/cherry-mx-dimensions.md`   | Cherry MX 표준 치수                   |

## 원본 레이아웃 (KLE-NG)

- [Left](https://editor.keyboard-tools.xyz/#share=NrBEAYBp1SMgjLeAmZUDM7IBZsFZsA2UAXUjAWmSqTirXsiybycKZPOAG9QB3UAC4EAOhT4AvnBTUZiZLMahZLFbkWRC3PoJGiA7FLgY5oU3XORlptabZXtFUDjOu6u4WInSX12HwAHsLghvhweihhvq54pKRAA)
- [Right](https://editor.keyboard-tools.xyz/#share=NrBEAYBp1SMgjLeAmZUDM7IBZsFZsA2bAdlAF1JgBvUAD1AC5wA6fAXzgWmR6W6Q0grILyDCkOgHdmCdl1A8SVWg2ZtSnOCl47EyXcNC7RJ3IciSZc1im3mV1UBj0uDcV8ddnX499agskwoiq5OasEorFqKOHo2TPL2cULI8f7xkqDxJHDx5BQUQA)
