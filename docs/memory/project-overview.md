# split-65 — 프로젝트 구조 개요

> 장기 재사용 지식. split-65 분리형 키보드의 **원본 생성물(KLE-NG/kbplacer)** 구조·파이프라인.
> ⚠️ 이 문서는 다운로드 당시의 **원본 자산**(left/right.jscad, leftplate/rightplate KiCad, keycaps, keyswitch_model)을 설명한다. 이후 세션에서 **직접 케이스를 모델링·렌더·export하는 코드(`src/`)** 를 구축했다 → **현재 구현·설계는 `docs/PROCESS.md`**.

## 1. 정체

- **무엇**: 좌(30키) + 우(35키) = **65키 분리형(split) 기계식 키보드**. 폴더명 `split-65` = 65키와 일치.
- **성격**: 직접 손으로 짠 프로젝트가 아니라, 온라인 도구로 **자동 생성된 산출물 묶음**.
- **스위치 규격**: Cherry MX (`cherry-mx-basic`).

## 2. 생성 파이프라인

```
KLE-NG 레이아웃 (keyboard-tools.xyz, 키 라벨이 row,col 매트릭스 주석)
   ├─→ 플레이트: OpenJSCAD v2(@jscad/modeling) export
   │       → left.jscad / right.jscad  (상판, 두께 1.5mm, openjscad.xyz에서 3D 렌더)
   │
   └─→ PCB: KiCad 9.0 + kbplacer 플러그인
           keyboard.json(KLE) 파싱 → "matrix annotated keyboard" 인식
           → SW/D 풋프린트 배치(다이오드 side=BACK, x=5.08 y=4.0)
           → COL/ROW/Net-(D#-A) 네트 추가
           → 내부 오토라우터: F.Cu(스위치-다이오드) + B.Cu(행/열 매트릭스)
           → 댕글링 트랙 제거
           → 렌더 SVG(front/back/schematic, keyboard.svg)
           → leftplate.zip / rightplate.zip 패키지
```

- **진입점 증거**: 루트 `README.md`의 Left/Right 링크가 `editor.keyboard-tools.xyz/#share=...` (KLE-NG 공유 URL).
- **PCB 생성기 특정 증거**: `build.log`의 kbplacer 시그니처 메시지(`Detected layout convertible to matrix annotated keyboard`, `Using internal autorouter method`, `Removing dangling tracks`, `Diode info: ... PositionOption.CUSTOM ... side=BACK`).
- **빌드 결과**: 에러/경고 0건. 좌우 각각 독립 수행. `/tmp/<uuid>` 임시 작업 후 zip 반환(2026-06-21).

## 3. 디렉토리 역할

| 경로                               | 역할                                                                                                | 빌드 산출물? |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- | :----------: |
| `left.jscad` · `right.jscad`       | 스위치 **상판 플레이트** 생성 코드 / **CNC 가공 파일의 소스(SSOT)** — 보강판+외벽 H빔으로 확장 예정 |      ✅      |
| `leftplate/` · `rightplate/`       | kbplacer 생성 **KiCad PCB 프로젝트**                                                                |      ✅      |
| `leftplate.zip` · `rightplate.zip` | 위 PCB 폴더의 **패키지 묶음**(동일 내용)                                                            |      ✅      |
| `keyswitch_model/`                 | KiCad **3D 뷰용 모델**(STEP 137 + WRL 33). `koktoh/keyswitch_model`, CC BY-NC-SA 4.0                | ⚠️ 보조 자산 |
| `keycaps/`                         | **KLE 레이아웃 3D 키캡 뷰어**(Three.js). `joric/keycaps`, Public Domain                             | ⚠️ 별개 도구 |

### PCB 프로젝트 내부 (`*/keyboard/`)

- `keyboard.json` — KLE 입력 레이아웃
- `keyboard.kicad_sch` — 매트릭스 회로 (SW + 다이오드)
- `keyboard.kicad_pcb` — 풋프린트 + 네트 + 라우팅
- `fp-lib-table` → `footprints/Switch_Keyboard_Cherry_MX.pretty/` (.kicad_mod 60개, KIPRJMOD 상대경로)
- `logs/` — build.log + front/back/schematic.svg

## 4. 좌/우 사양 비교

| 항목                | 좌측                     | 우측                            |
| ------------------- | ------------------------ | ------------------------------- |
| 스위치              | 30 (SW1~30)              | 35 (SW1~35)                     |
| 다이오드            | 30 (D_SOD-123 SMD, 뒷면) | 35 (동일)                       |
| 매트릭스            | 7열 × 5행 (COL0-6)       | 8열 × 5행 (COL0-7)              |
| 스태빌라이저        | 1 (키 4,4 / 2.75u)       | 2 (키 3,6 / 2u, 키 4,0 / 2.75u) |
| 플레이트 외곽       | 138.05 × 101.95 mm       | 157.1 × 101.95 mm               |
| PCB 풋프린트 / 네트 | 61 / 163                 | 72 / 189                        |

- **공통**: 플레이트 두께 1.5mm, roundRadius 1, 키 피치 19.05mm, 스위치 컷아웃 13.75×13.75mm, 2층 PCB(F.Cu/B.Cu, 1.6mm).
- **비대칭**: 우측이 더 크고 키가 많음. 좌측은 행2/행3이 우측보다 1키씩 적음.

## 5. 부가 자산 상세

### keyswitch_model (koktoh/keyswitch_model)

- STEP(정밀 원본·부품 분해) + WRL(KiCad 3D 뷰용). **.kicad_mod 풋프린트는 없음** — 3D 모델만 제공.
- 지원: Kailh Choc V1(6종)/V2(red·blue·brown + Lofree Wizard), Cherry MX Silent Alpaca(1종), 소켓(choc/mx), 스태빌라이저(choc / plate-mount / screw-in / snap-in, 각 2~10U).
- 라이선스 **CC BY-NC-SA 4.0 (비상업·동일조건공유)** 주의.

### keycaps (joric/keycaps)

- KLE JSON을 Three.js로 읽어 키캡 프로파일(DCS/DSA/SA/G20) 3D 메시 배치하는 뷰어/렌더러.
- 제작 파이프라인: OpenSCAD(rsheldiii key_v2) → STL → Blender → Three.js JSON(`models/keycaps.json`).
- `layouts/`에 15개 KLE 예시(Ergodox·Atreus·Mitosis 등 split 포함). **split-65 전용 레이아웃은 없음.** Public Domain/Unlicense.
- split-65 빌드 체인에 import되지 않는 **독립 참조 도구**.
