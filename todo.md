# KTX 자동 예매 TODO

## 미구현

- [ ] 코레일 list 페이지의 검색 시간(`input#startDate`, 값 형식: `2026-04-29(수) 01:00`)을 퀵바 시작 시간으로 자동 매핑
  - `#startDate`에서 `HH:MM` 추출 → 퀵바 시작 시간 설정
  - React 하이드레이션 타이밍 이슈로 값을 못 읽는 문제 해결 필요
  - DOM 구조 참고: `KORAIL_DOM.md` > 검색 조건 영역
