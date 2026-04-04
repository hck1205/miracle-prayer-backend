# 프로젝트 에이전트 노트

이 저장소에서 작업할 때는 repo-local skill인 `.codex/skills/repo-rulebook/SKILL.md`를 기준으로 따릅니다.

이 skill은 다음 내용을 제공합니다.

- NestJS + Prisma 백엔드 규칙
- 모듈 및 레이어 아키텍처 가드레일
- 구현 및 리뷰 체크리스트 레퍼런스

아래 규칙은 이 저장소에서 우선적으로 따르는 기준입니다.

- NestJS만 사용
- controller -> service -> repository -> Prisma 흐름 유지
- Prisma는 repository 레이어에서만 사용
- repository가 쿼리와 트랜잭션을 소유
- REST 경로는 `/api/v1/...` 아래로 구성
- DTO와 validation 필수
- 응답은 명시적인 타입 객체로 반환
- 목록 API는 `limit` + `cursor` 페이지네이션 지원 필수
- 스키마 변경은 Prisma migration 사용, 수동 DB 수정 금지
- `DATABASE_URL` 필수
- 쿼리 로깅은 개발 환경에서만 상세 허용, 운영 디버그 로그 금지
- global exception filter 필요
- centralized logger 필요
- 설정은 `.env`만 사용, 하드코딩 금지
- Docker 실행 가능 상태 유지
- JWT 인증 기준 유지
- 성능보다 유지보수성을 우선하고, 이후 측정 기반으로 최적화

현재 저장소 참고 사항:

- 아직 초기 스캐폴드 단계이며 현재 `src/health`, `src/prisma`, `test` 구조를 사용 중입니다.
- 기능 확장 시에는 불필요한 대규모 리팩터링 없이 `src/modules/<domain>` 방향으로 점진적으로 맞춰갑니다.
