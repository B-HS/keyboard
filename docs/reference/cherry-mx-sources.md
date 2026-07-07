# 레퍼런스 — Cherry MX 표준 치수 조사 출처

> `docs/memory/cherry-mx-dimensions.md` 확정 치수의 근거 출처. 멀티소스 조사 + 교차검증(adversarial verify)에 사용. 조사일: 2026-06-21.
> ⚠️ 1차 출처 접근 한계: `ai03.com`·`deskthority.net` 본도메인은 봇 차단(403)으로 일부는 미러/스니펫/교차로 검증. 가장 권위 있는 **Cherry 데이터시트 PDF**(SparkFun·Octopart·Maltron 호스팅)는 도면 직접 판독으로 핵심값 확정.

## 1차 출처 (공식 데이터시트 — 최우선)

| 출처                                    | URL                                                                       | 확인한 핵심값                                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Cherry MX1A 데이터시트 (Maltron 호스팅) | https://www.maltron.com/uploads/6/1/2/5/61250099/mx1a_11nn_data_sheet.pdf | 14.0 컷아웃, 1.5 plate, 5.0 plate-to-PCB, 15.6 하우징, 11.6 plate→stem, 3.6 stem노출, 3.30 핀돌출, travel 2/4 |
| Cherry MX Series (SparkFun 호스팅)      | https://cdn.sparkfun.com/datasheets/Components/Switches/MX%20Series.pdf   | Circuit Board Layout(풋프린트 홀 Ø), 동일 도면 교차                                                           |
| Cherry MX1A-11NW (Octopart)             | https://datasheet.octopart.com/MX1A-11NW-Cherry-datasheet-34676.pdf       | 0.60in(15.2) PCB→본체상단 교차                                                                                |
| Cherry MX Keymodule (Jameco)            | https://www.jameco.com/Jameco/Products/ProdDS/513471.pdf                  | plate 1.5+0.1, travel 2.0±0.6 / 4.0−0.4, 피치 19.05                                                           |

## 스위치 본체 치수

- https://deskthority.net/wiki/Cherry_MX — 마운트 핀 구성(3핀/5핀), stem
- https://deskthority.net/wiki/Cherry_MX_mount_recognition — stem cross 암 두께(가로 1.25–1.30 / 세로 1.05–1.10)
- https://deskauthority.saberkeebs.com/wiki.themk.org/index.php/Cherry_MX.html — Desktop Profile 0.60in
- https://wiki.ai03.com/books/case-and-plate-design/page/switch-dimensions-and-physical-specifications — 종합 치수
- https://geekhack.org/index.php?topic=94836.0 — DIY plate 실측 사례
- https://hackaday.io/project/185358/log/215107-critical-dimensions-for-plate-and-case — Lattice60 critical dimensions
- https://telcontar.net/KBK/Cherry/MX — 측정 자료

## 스위치 컷아웃 — 스냅핏 치수 + 레이저 kerf (13.95 결정 근거)

- Cherry 공식: 컷아웃 0.551 ±0.002 in = **13.9954 ±0.0508mm** (코너 R 0.012in max). → 13.95는 규격 공차의 타이트 쪽.
- https://geekhack.org/index.php?topic=59837.0 — **Plate cutouts** (40W Epilog 레이저, **6mm 아크릴 실측**): Cherry 스펙에서 **−0.05mm(13.95) = "단단한 솔리드 핏, 키캡 빼도 스위치 안 빠짐"**, −0.10mm(13.90)은 더 헐거움. **레이저 kerf ≈ 0.2mm** → CAD에서 그만큼 인셋 필요(머신·소재별 상이).
- https://wiki.ai03.com/books/case-and-plate-design/page/switch-dimensions-and-physical-specifications — ai03 plate generator(13.9995 기본 + 타이트핏 옵션). (본도메인 403, 검색 스니펫 교차)
- https://kbplate.ai03.com/ — ai03 Plate Generator (정밀 컷아웃 옵션)
- https://deskthority.net/viewtopic.php?t=20144 — Custom Cherry MX plate measurements

## 플레이트 ↔ PCB 스택업

- https://wiki.ai03.com/books/case-and-plate-design/page/switch-dimensions-and-physical-specifications — plate top→PCB top 5mm, plate 1.5
- https://golem.hu/blog/cutout-sizes/ — 컷아웃 크기 실측 테스트
- https://deskthority.net/viewtopic.php?t=12672 — plate thickness 논의
- https://deskthority.net/wiki/Unit — 1u 19.05
- https://deskthority.net/wiki/Switch_mount — plate/PCB 마운트
- https://deskthority.net/viewtopic.php?t=14546 — 커뮤니티(matt3o)
- https://geekhack.org/index.php?topic=94663.0 — 풋프린트 논의
- https://kbplate.ai03.com/ — ai03 plate generator
- http://builder-docs.swillkb.com/features/ — swillkb plate builder
- https://null-src.com/posts/keyboard-design-cheatsheet/ — 설계 치트시트
- https://telcontar.net/KBK/Cherry/MX

## Cherry 프로파일 키캡 (외벽/skirt 포함)

- https://yuzukeycaps.com/guides/keycap-profiles/cherry — row별 높이
- https://www.daskeyboard.com/blog/types-of-keycap-profiles — 프로파일별 전체높이 비교(SA/OEM/Cherry/XDA/DSA)
- https://www.jellykey.com/blog/a-fresh-update-on-our-treasured-cherry-profiles/ — Jelly Key R1 1차 실측
- https://blog.maxkeyboard.com/dwkb/keycap-profile-size-information/ — 프로파일 사이즈
- https://deskthority.net/wiki/Keycap_mount — 키캡 내부 cross 슬롯(4.1 / 1.17)
- https://keysium.com/gmk-clone-keycaps-complete-guide-affordable-cherry-profile-2026/ — GMK Cherry 사양
- https://akkogear.eu/blogs/news/cherry-keycaps-what-you-need-to-know
- https://github.com/ConstantinoSchillebeeckx/cherry-mx-keycaps — CAD 원본(STEP/STL 실측용)
- https://www.printables.com/model/397180-complete-cherry-mx-stem-keycap-set-optimized-for-3 — 3D 모델
- https://geekhack.org/index.php?topic=100313.0
- https://hhkeyboard.us/blog/keycap-profiles
- https://telcontar.net/KBK/Cherry/MX

## 전체 조립 스택업

- Cherry MX1A 데이터시트(위 1차) page 2 측면도 / page 3 KEYCAP DIMENSIONS
- https://wiki.ai03.com/books/case-and-plate-design/page/switch-dimensions-and-physical-specifications
- https://geekhack.org/index.php?topic=44110.0 — Findecanor 스커트~플레이트 간격 측정
- https://www.keychron.com/blogs/news/oem-vs-cherry-profile — OEM vs Cherry 높이
- https://null-src.com/posts/keyboard-design-cheatsheet/

## 케이스 베젤 / 하이프로파일 (plate→케이스벽 높이, 사용자 지정)

- https://geekhack.org/index.php?topic=104376.0 — **High Profile 케이스 치수**: plate 상면→케이스 최상단 벽 **7.5mm**(7mm 미만이면 키캡 하단 틈 보임), plate 하면→케이스 **3mm** 클리어런스(2mm 위험), 키캡↔벽 측면 **3mm/side**(외곽 스위치열 센터라인에서 10mm 안쪽 = 케이스 내벽). 출처: mike-y (커뮤니티 경험, 공식 규격 아님)
- https://www.reddit.com/r/MechanicalKeyboards/comments/b91bka/ — plate 상면↔키캡 하단 높이 질문 스레드. ⚠️ WebFetch/미러 모두 차단(403)으로 본문 직접 추출 실패. 주제는 본 확정 치수(plate→stem top 11.6, 키캡이 plate 위 ~2mm까지 하강)로 커버됨
