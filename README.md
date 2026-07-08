# keyboard

커스텀 키보드 제작 프로젝트 모음. 세대별로 브랜치를 나눠 진행한다.

| 브랜치 | 내용 | 뷰어 (GitHub Pages) |
| --- | --- | --- |
| [`v1`](https://github.com/B-HS/keyboard/tree/v1) | 49키 레이아웃 PCBA 뷰어 — React Three Fiber 기반 1세대 설계 | [b-hs.github.io/keyboard/v1](https://b-hs.github.io/keyboard/v1/) |
| [`v2`](https://github.com/B-HS/keyboard/tree/v2) | 49키 핸드와이어드 무선(BLE) + USB-C 키보드 빌드 — 2세대 | [b-hs.github.io/keyboard/v2](https://b-hs.github.io/keyboard/v2/) |
| [`split`](https://github.com/B-HS/keyboard/tree/split) | **현행** — split-65(65키 분리형) + split-keypad 모노레포. JSCAD 파라메트릭 케이스(FDM 7.5° 틸트, ESP32-C3 크래들), React 19 + three.js 뷰어, KiCad PCB(핫스왑·DO-35 손납땜·JLCPCB 발주본) | [b-hs.github.io/keyboard/split](https://b-hs.github.io/keyboard/split/) |

각 브랜치의 상세 문서는 해당 브랜치의 `docs/`(split은 `docs/PROCESS.md`)를 본다.

## 배포

`main`의 워크플로가 세 브랜치를 각각 빌드해 하나의 GitHub Pages 사이트에 `/v1` `/v2` `/split` 경로로 배포한다. 브랜치에 push하면 자동 재배포된다.
