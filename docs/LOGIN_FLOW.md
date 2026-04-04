# 백엔드 로그인 흐름 가이드

이 문서는 `template-backend` 기준으로, 로그인 기능만 남겨 둔 템플릿 백엔드의 인증 흐름을 설명합니다.

## 포함된 기능

- Google ID 토큰 검증
- 사용자 upsert
- access token 발급
- refresh token 발급
- refresh token rotation
- 로그아웃 시 refresh token 무효화
- 현재 로그인 사용자 조회
- 헬스체크

## 관련 파일

- `src/modules/auth/auth.controller.ts`
- `src/modules/auth/auth.service.ts`
- `src/modules/auth/auth.dto.ts`
- `src/modules/auth/auth.repository.ts`
- `src/modules/auth/google-auth.client.ts`
- `src/modules/auth/jwt-auth.guard.ts`
- `prisma/schema.prisma`
- `.env.example`

## 환경변수

```env
PORT=3000
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/miracle_prayer?schema=public"
JWT_ACCESS_SECRET="local-dev-secret"
JWT_ACCESS_EXPIRES_IN="900"
JWT_REFRESH_SECRET="local-refresh-secret"
JWT_REFRESH_EXPIRES_IN="604800"
GOOGLE_CLIENT_IDS="your-google-client-id.apps.googleusercontent.com"
FRONTEND_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
```

## 인증 API

### `POST /api/v1/auth/google/login`
- Google ID 토큰 검증
- 사용자 upsert
- access/refresh token 발급
- refresh token hash 저장

### `POST /api/v1/auth/refresh`
- refresh token 검증
- DB에 저장된 refresh token hash와 비교
- 만료 여부 확인
- 새 access/refresh token 발급
- 새 refresh token hash로 DB 갱신

### `POST /api/v1/auth/logout`
- access token 인증 필요
- 현재 사용자 기준으로 저장된 refresh token hash 제거
- 이후 이전 refresh token 사용 불가

### `GET /api/v1/auth/me`
- access token 인증 필요
- 현재 사용자 정보 반환

### `GET /api/health`
- 템플릿 백엔드 상태 확인

## refresh token rotation 정책

현재 정책은 단일 세션 기준입니다.

- 로그인 성공 시 refresh token 1개 발급
- DB에는 원문이 아니라 해시만 저장
- refresh 요청 성공 시 새 refresh token을 발급
- 이전 refresh token은 즉시 무효화
- logout 시 저장된 refresh token 정보 제거

## DB 저장 필드

`User` 모델에는 현재 로그인 기능에 필요한 아래 필드만 포함됩니다.

- `email`
- `googleSubject`
- `name`
- `refreshTokenHash`
- `refreshTokenExpiresAt`

## 로컬 실행 순서

```powershell
npm install
npx prisma generate
$env:DATABASE_URL='postgresql://postgres:YOUR_PASSWORD@localhost:5432/miracle_prayer?schema=public'
npx prisma migrate dev --name init
npm run dev
```

헬스체크:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3000/api/health
```

## 테스트 포인트

- `/api/v1/auth/google/login`이 access/refresh token 둘 다 반환하는지 확인
- `/api/v1/auth/refresh` 호출 시 새 refresh token이 반환되는지 확인
- `/api/v1/auth/logout` 호출 후 이전 refresh token이 더 이상 동작하지 않는지 확인
- `/api/v1/auth/me` 호출이 정상인지 확인
