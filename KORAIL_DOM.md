# 코레일 예매 페이지 DOM 구조

조사일: 2026-04-22
페이지: korail.com/ticket/search/list

## price_box 클래스 매핑

각 열차(.tckList)마다 2개의 .price_box가 존재:
- 첫 번째: 일반실/입석/예약대기 상태
- 두 번째: 특실 상태

| 클래스 | 상태 | txt 텍스트 | inner 텍스트 | 클릭 가능 |
|--------|------|-----------|-------------|----------|
| `gen` | 일반실 예매가능 | (없음) | 일반실{가격}원 | O |
| `spe` | 특실 예매가능 | (없음) | 특실{가격}원 | O |
| `spe sold_out_soon` | 특실 매진임박 | (없음) | 특실(매진임박){가격}원 | O |
| `yms` | 입석+좌석 가능 | 입석 + 좌석 | 입석 + 좌석 | O (입석 체크 시) |
| `yms_wait` | 입석+좌석 예약대기 | 입석 + 좌석 | 입석 + 좌석예약대기 | O (입석 또는 예약대기 중 하나라도 체크 시) |
| `wait` | 일반실 예약대기 | 예약대기 | 예약대기 | O (예약대기 체크 시) |
| `sold_out` | 완전 매진 | 매진 | 매진 | X |
| `sold_out_wait` | 대기열차 특실 매진 | 매진 | 매진 | X |

## 열차별 조합 패턴

| 패턴 | box1 (일반실) | box2 (특실) | 의미 |
|------|-------------|-----------|------|
| 양쪽 가능 | `gen` | `spe` | 일반+특실 모두 예매가능 |
| 일반만 가능 | `gen` | `sold_out` | 일반실만 가능, 특실 매진 |
| 특실 매진임박 | `gen` | `spe sold_out_soon` | 일반 가능, 특실 매진임박 |
| 입석만 가능 | `yms` | `sold_out` | 입석+좌석만 가능, 특실 매진 |
| 입석 예약대기 | `yms_wait` | `sold_out_wait` | 입석 예약대기, 특실 매진 |
| 일반 예약대기 | `wait` | `sold_out_wait` | 일반실 예약대기, 특실 매진 |
| 일반 예약대기+특실 | `wait` | `spe` | 일반실 예약대기, 특실 가능 |
| 일반 매진+특실 | `sold_out` | `spe` | 일반실 매진, 특실 가능 |

## 공통 클래스

모든 price_box에 공통: `price_box fl-l`

## 하위 요소

```
.price_box
├── .inner          (가격/상태 텍스트: "일반실59,800원5%적립", "-", "매진", "예약대기")
├── .tck_etc_use    (상태 라벨: "입석 + 좌석", "예약대기", "매진", 또는 비어있음)
├── .txt_ch         (좌석 라벨)
├── .txt_price      (가격)
└── a               (클릭 대상 링크)
```

## 열차 컨테이너 구조

```
.tckList
├── .data_box
│   └── h3          (열차명 + 시간 "(HH:MM)")
├── .blind          (열차 타입, hidden)
├── .num            (열차 번호)
└── .price_box x2   (일반실 + 특실)
```

## 예매 버튼

```
.reservbtnWrap
└── button.reservbtn
    - 일반실: button.btn_bn-blue02.reservbtn (활성)
    - 입석+좌석: button.btn_by-blue02.reservbtn (활성)
    - 비활성: button.reservbtn.btn-disabled[disabled]
```

## 검색 조건 영역

```
input#startDate
├── type: text
├── name: startDate
├── class: data
└── value: "2026-04-29(수) 01:00"   ← 형식: YYYY-MM-DD(요) HH:MM
```

- 페이지에 시간 전용 select/input 없음. 날짜+시간이 `#startDate` 하나에 통합
- 시간 추출: value에서 마지막 `HH:MM` 패턴 매치

```
.search-option-bar__wrap
├── .search-option-bar__check-wrap  (왕복)
├── .search-option-bar__check-wrap  (인접역 보기)
├── .search-option-bar__check-wrap  (에스알티(SRT) 함께 보기)
└── .search-option-bar__check-wrap  (서울·용산 - 수서 함께 보기)
```

## 열차 시간 패턴

`.tckList .data_box h3` 텍스트 형식:
```
"서울 → 부산(05:13 ~ 07:50)"
```
- 출발시간: 괄호 안 첫 번째 HH:MM → `(05:13`
- 도착시간: 두 번째 HH:MM → `07:50)`

## 실제 데이터 예시 (2026-04-22)

```
0  | KTX 001     | gen            | 일반실59,800원
1  | KTX 001     | spe            | 특실83,700원
25 | KTX 011     | spe sold_out_soon | 특실(매진임박)83,700원
32 | KTX 121     | yms_wait       | 입석 + 좌석예약대기
33 | KTX 121     | sold_out_wait  | 매진
34 | KTX-산천 191 | yms            | 입석 + 좌석
35 | KTX-산천 191 | sold_out       | 매진
44 | KTX 123     | wait           | 예약대기
45 | KTX 123     | sold_out_wait  | 매진
62 | ITX-마음 1015| wait           | 예약대기
63 | ITX-마음 1015| spe            | -
```
