https://www.keyboard-layout-editor.com/
http://builder.swillkb.com/

(WIP)
# Project 14u: High-Performance Custom Keyboard

## Phase 1: PCB Design (KiCad)
- [ ] 14u Layout Matrix 설계 (KLE 데이터 기반)
    - [ ] Row 1: 14 keys (Esc to Backspace)
    - [ ] Row 2: 13 keys (1.5u Caps/Enter 포함)
    - [ ] Row 3: 12 keys (2.0u L/R Shift 포함)
    - [ ] Row 4: 10 keys (2.75u Split Space 포함)
- [ ] 회로도(Schematic) 작성
    - [ ] MCU: nRF52840 (유선 1000Hz / 무선 BLE)
    - [ ] 정전기 방지: USB-C 라인 TVS 다이오드 배치
    - [ ] 전원부: AAA 2알 -> 3.3V 승압(Boost) 및 전압 측정(ADC) 회로
    - [ ] 스위치: 핫스왑 소켓(Kailh/Gateron) 및 고속 스캔 다이오드 매트릭스
- [ ] 레이아웃 설계
    - [ ] 2.75u, 2.0u 스태빌라이저 홀 및 핫스왑 소켓 배치 (간섭 체크 필수)
    - [ ] 가스켓 마운트용 기판 탭(Tab) 설계
    - [ ] RF 안테나 영역 동박 제거 및 신호 경로 확보
- [ ] 제작 파일 추출 (Gerber, BOM, CPL)

## Phase 2: Housing & Gasket Design (Fusion 360)
- [ ] 14u 전용 가스켓 마운트 케이스 설계
    - [ ] 상/하판 결합 구조 및 포론 가스켓 안착 부위 설계
    - [ ] AAA 배터리 베이(10.5mm x 2) 공간 확보 및 커버 설계
- [ ] 물리 인터페이스
    - [ ] USB-C 도터보드(Unified C3 등) 고정 홀 설계
    - [ ] 알루미늄 하우징 신호 간섭 방지용 비금속 안테나 창 설계
- [ ] 공차 및 타건감 최적화
    - [ ] 스위치-보강판 유격(0.1mm) 및 기판-하우징 유격 조정
    - [ ] 가공용 STEP 파일 추출

## Phase 3: Firmware (QMK/Vial)
- [ ] nRF52840 유선/무선 하이브리드 환경 구축
- [ ] 고성능 최적화
    - [ ] 유선 모드 1000Hz 폴링 레이트 설정
    - [ ] 지연 최소화(Asym Eager Debounce) 알고리즘 적용
- [ ] Vial 설정 및 배터리 보고
    - [ ] 실시간 키맵 수정을 위한 Vial 전용 JSON 정의
    - [ ] OS 무선 잔량 보고(HOGP Battery Service) 연동
- [ ] 14u 특수 레이어(FN1, FN2) 맵핑

## Phase 4: Prototyping & Production
- [ ] 3D 프린팅/아크릴 시제품 제작 및 14u 배열 파지법 검증
- [ ] PCB 샘플 제작 및 핫스왑/승압 회로 정상 작동 확인
- [ ] 정전기 방지 테스트 및 무선 도달 거리 확인
- [ ] 최종 수정 후 본 발주
