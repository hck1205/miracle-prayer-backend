# 스택 및 범위

이 문서는 저장소 구조와 아키텍처 경계에 대한 프로젝트 계약입니다.

## 필수 스택

- 프레임워크: NestJS
- API 스타일: REST
- 데이터베이스: PostgreSQL
- ORM: Prisma
- 인증: JWT
- 런타임/설정: `.env`
- 배포/런타임 기대치: Docker

사용자가 저장소 규칙을 명시적으로 바꾸지 않는 한 이 선택을 유지합니다.

## 권장 최상위 구조

기본적으로 모듈형, 도메인 격리 구조를 사용합니다. 기존 저장소에 동등한 구조가 이미 있지 않다면 아래 형태를 우선합니다.

- `src/modules/auth`
- `src/modules/user`
- `src/modules/<domain>`
- `src/common`: filter, guard, interceptor, pipe, decorator, logger wiring, response helper, 진짜 cross-domain 유틸
- `src/config`: 검증된 환경 설정 및 config 셋업
- `src/prisma`: Prisma bootstrap, schema, migration, 공통 DB 설정
- `test`: e2e 테스트와 모듈 단위 integration 테스트

## 현재 스캐폴드 참고

이 저장소는 아직 초기 스캐폴드 단계이며 현재 다음과 같은 최상위 경로를 갖고 있습니다.

- `src/health`
- `src/prisma`
- `src/app.module.ts`
- `src/main.ts`

현재 동작하는 부트스트랩 구조는 유지하되, 새 비즈니스 기능은 가능하면 `src/modules/<domain>` 방향으로 맞춥니다.

## 권장 모듈 구조

특별한 분리 규칙이 이미 없으면 각 모듈은 다음 형태를 기본으로 합니다.

- `user/user.controller.ts`
- `user/user.service.ts`
- `user/user.repository.ts`
- `user/user.module.ts`
- `user/user.dto.ts`

다른 모듈도 같은 패턴을 따릅니다.

모듈이 커질 때는 소유권을 깨지 않으면서 분리합니다.

- write/read 메서드는 찾기 쉬워야 합니다.
- DTO는 모듈 경계 가까이에 둡니다.
- 재사용 가능한 내부 로직은 먼저 모듈 내부 helper로 분리하고, 꼭 필요할 때만 `src/common`으로 올립니다.

## 필수 레이어 흐름

의존 방향은 다음과 같습니다.

- controller -> service -> repository -> Prisma

레이어 책임은 아래와 같습니다.

- controller: 요청/응답 처리만 담당
- service: 비즈니스 로직과 오케스트레이션만 담당
- repository: Prisma 쿼리와 트랜잭션 경계만 담당
- Prisma: repository 내부에서만 사용

금지 흐름:

- controller -> prisma
- controller -> repository
- service -> prisma

## NestJS 백엔드 기본 설계

- 모듈의 public API는 작고 의도적으로 유지합니다.
- 강하게 결합된 공유 서비스보다 조합 가능한 구조를 선호합니다.
- config, auth, logging, exception handling은 중앙화합니다.
- 횡단 관심사는 guard, pipe, interceptor, filter로 처리합니다.
- background task, scheduler, 외부 연동은 request handler와 분리합니다.

## Prisma repository 기본 패턴

Prisma는 repository 클래스에서만 접근합니다. 최소 패턴 예시는 다음과 같습니다.

```ts
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(email: string) {
    return this.prisma.user.create({
      data: { email },
    });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}
```

## 변경 크기 원칙

가능하면 작업은 다음 범위에 맞춥니다.

- 테스트를 포함한 작은 기능 단위
- 동작 변경 없는 고립된 리팩터링
- 하나의 명확한 규칙을 세우는 스캐폴딩

명시적 요청이 없는 한, 필수 NestJS 모듈 경계를 넘는 광범위한 추측성 스캐폴딩은 피합니다.
