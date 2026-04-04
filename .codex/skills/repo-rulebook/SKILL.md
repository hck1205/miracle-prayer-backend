---
name: repo-rulebook
description: 이 NestJS + Prisma 백엔드 저장소에서 따라야 하는 저장소 전용 작업 규칙, 아키텍처 가드레일, 전달 워크플로우입니다. 모듈형 NestJS 구조, REST API, PostgreSQL/Prisma 영속성, DTO 검증, JWT 인증, Docker 런타임, Prisma 스키마 및 마이그레이션, 쿼리 성능, 트랜잭션, 타입 응답, 관측성, 테스트 전략, repository 레이어 구현 판단이 필요한 작업에 사용합니다.
---

# 저장소 규칙집

이 skill은 이 저장소에서 작업할 때 기본 작업 가이드로 사용합니다.

## 관련 레퍼런스를 먼저 확인합니다

규모가 있거나 영향 범위가 있는 작업 전에는 다음 문서를 읽고 진행합니다.

- `references/stack-and-scope.md`: NestJS 모듈 구조와 레이어 경계를 유지하기 위한 기준
- `references/coding-rules.md`: 프로덕션 코드 추가/수정 전에 따를 코딩 규칙
- `references/workflow-checklist.md`: 큰 변경, 리뷰, 핸드오프 전에 확인할 체크리스트

## 절대 아키텍처 규칙을 지킵니다

- NestJS만 사용합니다. 직접적인 Express 패턴 도입은 금지합니다.
- 코드는 모듈형이며 도메인 격리를 유지합니다. 새로운 비즈니스 기능은 가능하면 `src/modules/...` 아래에 둡니다.
- 저장소가 아직 부분 스캐폴드 상태이므로 `src/app.module.ts`, `src/main.ts`, `src/prisma/...` 같은 기존 부트스트랩 파일은 보존합니다.
- 새 기능 모듈은 controller, service, repository, module, DTO 파일 중심으로 구성합니다.
- 의존 흐름은 반드시 `controller -> service -> repository -> Prisma`를 따릅니다.
- controller가 repository나 Prisma를 직접 호출하면 안 됩니다.
- service가 Prisma를 직접 호출하면 안 됩니다.
- Prisma 접근은 repository 레이어 안에서만 허용합니다.

## 백엔드 플랫폼 규칙을 지킵니다

- 데이터베이스는 PostgreSQL만 사용합니다.
- DB 접근은 Prisma ORM으로만 수행합니다.
- Prisma schema에는 비즈니스 로직을 넣지 않고, 모델명과 필드명은 명확하게 유지합니다.
- API는 REST만 노출합니다.
- API 버전은 `/api/v1/...` 아래로 맞춥니다.
- 모든 요청 경계에는 DTO를 사용합니다.
- 입력 데이터에는 validation을 적용합니다.
- 응답은 항상 명시적인 타입 객체를 반환합니다.
- 목록 엔드포인트를 추가할 때는 `limit`, `cursor` 페이지네이션을 지원합니다.
- Prisma 트랜잭션은 repository 레이어에서만 사용합니다.
- 자주 조회되는 필드는 인덱스를 고려합니다.
- 스키마 변경은 Prisma migration으로 관리하며 수동 DB 수정에 의존하지 않습니다.
- 필요 시 초기 데이터용 seed 경로 또는 seed 스크립트를 제공합니다.
- `.env` 기반으로 `DATABASE_URL`을 필수 설정으로 둡니다.
- 상세 쿼리 로깅은 개발 환경에서만 허용하고 운영 환경 디버그 로그는 금지합니다.
- 인증은 JWT 기준으로 설계합니다.
- global exception filter를 사용합니다.
- 중앙화된 logger를 사용합니다.
- 설정은 `.env`에서 읽고, 비밀값이나 환경별 값을 하드코딩하지 않습니다.
- 애플리케이션은 Docker 안에서 실행 가능해야 합니다.

## 일반 백엔드 베스트 프랙티스를 적용합니다

- handler와 service는 한 가지 이유로만 변경되도록 작게 유지합니다.
- 모듈 경계에서는 명시적인 인터페이스와 타입 반환 계약을 선호합니다.
- 부수 효과는 로그, 추적 가능한 이벤트, 명확한 에러 전파를 통해 관찰 가능해야 합니다.
- 목록 API는 응답 크기와 쿼리 비용이 제한되도록 설계합니다.
- 재시도가 발생할 수 있는 쓰기 작업은 가능한 한 멱등적으로 설계합니다.
- 느리거나 실패 가능성이 있는 외부 연동은 분리와 테스트가 쉬워야 합니다.
- guard, interceptor, filter, pipe, decorator 같은 횡단 관심사는 중복 구현하지 말고 공통 메커니즘으로 모읍니다.
- 유지보수성을 우선하고, 핫패스 최적화는 측정 결과를 바탕으로 진행합니다.

## 금지 규칙을 유지합니다

- controller에 비즈니스 로직을 넣지 않습니다.
- controller에서 Prisma를 직접 사용하지 않습니다.
- service에서 Prisma를 직접 사용하지 않습니다.
- Prisma schema에 비즈니스 로직을 넣지 않습니다.
- repository에 비즈니스 정책 로직을 넣지 않습니다.
- 전역 mutable state를 도입하지 않습니다.

## 네이밍 스타일을 유지합니다

service와 repository 메서드는 의미가 분명한 이름을 선호합니다.

- `createUser`
- `getUserById`
- `updateUser`

## Prisma 사용 원칙을 유지합니다

- N+1 쿼리 패턴을 피합니다.
- 더 좁은 결과 형태로 충분하면 `include`보다 `select`를 우선합니다.
- 복잡한 쿼리는 service가 아니라 repository에 둡니다.

## 문서화 기준을 명시합니다

- 복잡한 비즈니스 규칙, 중요한 인증/보안 처리, 트랜잭션 경계, 외부 계약이 드러나는 public 메서드에는 필요할 때마다 JSDoc을 작성합니다.
- 모든 함수에 기계적으로 JSDoc을 붙이지는 않되, 코드만 읽고 의도를 바로 파악하기 어려운 지점에는 JSDoc을 우선 고려합니다.
- DTO 변환 규칙, 예외 조건, 부수 효과, 반환 계약이 중요한 함수는 JSDoc으로 보강합니다.

## 컨텍스트가 부족하면 보수적으로 판단합니다

이 저장소는 아직 부분 스캐폴드 상태입니다. 구체 구현이 부족할 때는 다음 원칙을 따릅니다.

- 가장 작은 NestJS 네이티브 관례를 추론해 적용합니다.
- 필요한 모듈/레이어 경계를 유지합니다.
- 명시된 규칙을 넘는 추상화를 추측해서 추가하지 않습니다.
- 중요한 가정은 최종 핸드오프에 기록합니다.

## 검증 기준

작업 종료 전에는 아래를 확인합니다.

- 가능한 범위에서 가장 좁고 의미 있는 검증을 수행합니다.
- 실행하지 못한 테스트가 있으면 명시합니다.
- 인증, validation, repository 경계, Prisma migration, 쿼리 성능, 페이지네이션, 트랜잭션, Docker/runtime 설정 관련 리스크를 필요 시 함께 알립니다.
