import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import * as request from "supertest";

import { AppModule } from "../src/app.module";
import { GoogleAuthClient } from "../src/modules/auth/google-auth.client";
import { PrismaService } from "../src/prisma/prisma.service";

interface HealthResponseBody {
  status: string;
  service: string;
}

interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  googleSubject: string | null;
  refreshTokenHash: string | null;
  refreshTokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

describe("App e2e", () => {
  let app: INestApplication;
  let persistedUser: UserRecord;
  let prismaMock: {
    user: {
      upsert: jest.Mock<Promise<UserRecord>, [unknown]>;
      findUnique: jest.Mock<Promise<UserRecord | null>, [unknown]>;
      update: jest.Mock<Promise<UserRecord>, [unknown]>;
    };
  };
  let googleAuthClientMock: {
    verifyIdToken: jest.Mock;
  };

  beforeEach(async () => {
    process.env.JWT_ACCESS_SECRET = "test-secret";
    process.env.JWT_ACCESS_EXPIRES_IN = "900";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
    process.env.JWT_REFRESH_EXPIRES_IN = String(60 * 60 * 24 * 7);
    process.env.GOOGLE_CLIENT_IDS = "test-google-client-id";

    persistedUser = {
      id: "user-1",
      email: "bride@example.com",
      name: "Bride",
      googleSubject: "google-subject-123",
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
      createdAt: new Date("2026-03-29T00:00:00.000Z"),
      updatedAt: new Date("2026-03-29T00:00:00.000Z"),
    };

    prismaMock = {
      user: {
        upsert: jest.fn().mockImplementation(async () => persistedUser),
        findUnique: jest.fn().mockImplementation(async ({ where }: { where: { id: string } }) => {
          if (where.id === persistedUser.id) {
            return persistedUser;
          }

          return null;
        }),
        update: jest.fn().mockImplementation(async ({ data }: { data: Partial<UserRecord> }) => {
          persistedUser = {
            ...persistedUser,
            ...data,
          };

          return persistedUser;
        }),
      },
    };
    googleAuthClientMock = {
      verifyIdToken: jest.fn().mockResolvedValue({
        googleSubject: persistedUser.googleSubject,
        email: persistedUser.email,
        name: persistedUser.name,
      }),
    };

    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(GoogleAuthClient)
      .useValue(googleAuthClientMock)
      .compile();

    app = testingModule.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("returns health status", async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await request(httpServer).get("/api/health").expect(200);
    const body = response.body as HealthResponseBody;

    expect(body.status).toBe("ok");
    expect(body.service).toBe("template-backend");
  });

  it("logs in with Google and returns an application token pair", async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await request(httpServer)
      .post("/api/v1/auth/google/login")
      .send({ idToken: "google-id-token" })
      .expect(201);

    expect(googleAuthClientMock.verifyIdToken).toHaveBeenCalledWith("google-id-token");
    expect(prismaMock.user.upsert).toHaveBeenCalled();
    expect(prismaMock.user.update).toHaveBeenCalled();
    expect(response.body).toEqual({
      accessToken: expect.any(String),
      tokenType: "Bearer",
      expiresIn: 900,
      refreshToken: expect.any(String),
      refreshExpiresIn: 604800,
      user: {
        id: "user-1",
        email: "bride@example.com",
        name: "Bride",
      },
    });
  });

  it("returns the current user for a valid bearer token", async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const loginResponse = await request(httpServer)
      .post("/api/v1/auth/google/login")
      .send({ idToken: "google-id-token" })
      .expect(201);

    const response = await request(httpServer)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${String(loginResponse.body.accessToken)}`)
      .expect(200);

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
    });
    expect(response.body).toEqual({
      id: "user-1",
      email: "bride@example.com",
      name: "Bride",
    });
  });

  it("rotates the refresh token and returns a new token pair", async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const loginResponse = await request(httpServer)
      .post("/api/v1/auth/google/login")
      .send({ idToken: "google-id-token" })
      .expect(201);

    const response = await request(httpServer)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: loginResponse.body.refreshToken })
      .expect(201);

    expect(response.body).toEqual({
      accessToken: expect.any(String),
      tokenType: "Bearer",
      expiresIn: 900,
      refreshToken: expect.any(String),
      refreshExpiresIn: 604800,
    });
    expect(String(response.body.refreshToken)).not.toEqual(loginResponse.body.refreshToken);
  });

  it("clears the refresh token on logout", async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const loginResponse = await request(httpServer)
      .post("/api/v1/auth/google/login")
      .send({ idToken: "google-id-token" })
      .expect(201);

    await request(httpServer)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${String(loginResponse.body.accessToken)}`)
      .expect(201);

    await request(httpServer)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: loginResponse.body.refreshToken })
      .expect(401);
  });
});