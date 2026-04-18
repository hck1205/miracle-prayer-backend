import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
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

interface LoginResponseBody {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

interface RefreshResponseBody {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
}

interface FindUniqueArgs {
  where: {
    id: string;
  };
}

interface UpdateArgs {
  data: Partial<UserRecord>;
}

interface VerifiedGoogleUser {
  googleSubject: string | null;
  email: string;
  name: string | null;
}

describe("App e2e", () => {
  let app: INestApplication;
  let persistedUser: UserRecord;
  let prismaMock: {
    user: {
      upsert: jest.Mock<Promise<UserRecord>, [unknown]>;
      findUnique: jest.Mock<Promise<UserRecord | null>, [FindUniqueArgs]>;
      update: jest.Mock<Promise<UserRecord>, [UpdateArgs]>;
    };
  };
  let googleAuthClientMock: {
    verifyIdToken: jest.Mock<Promise<VerifiedGoogleUser>, [string]>;
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
        upsert: jest
          .fn<Promise<UserRecord>, [unknown]>()
          .mockImplementation(() => Promise.resolve(persistedUser)),
        findUnique: jest
          .fn<Promise<UserRecord | null>, [FindUniqueArgs]>()
          .mockImplementation(({ where }) => {
            if (where.id === persistedUser.id) {
              return Promise.resolve(persistedUser);
            }

            return Promise.resolve(null);
          }),
        update: jest.fn<Promise<UserRecord>, [UpdateArgs]>().mockImplementation(({ data }) => {
          persistedUser = {
            ...persistedUser,
            ...data,
          };

          return Promise.resolve(persistedUser);
        }),
      },
    };
    googleAuthClientMock = {
      verifyIdToken: jest
        .fn<Promise<VerifiedGoogleUser>, [string]>()
        .mockResolvedValue({
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
    const body = response.body as LoginResponseBody;

    expect(googleAuthClientMock.verifyIdToken).toHaveBeenCalledWith("google-id-token");
    expect(prismaMock.user.upsert).toHaveBeenCalled();
    expect(prismaMock.user.update).toHaveBeenCalled();
    expect(typeof body.accessToken).toBe("string");
    expect(body.tokenType).toBe("Bearer");
    expect(body.expiresIn).toBe(900);
    expect(typeof body.refreshToken).toBe("string");
    expect(body.refreshExpiresIn).toBe(604800);
    expect(body.user).toEqual({
      id: "user-1",
      email: "bride@example.com",
      name: "Bride",
    });
  });

  it("returns the current user for a valid bearer token", async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const loginResponse = await request(httpServer)
      .post("/api/v1/auth/google/login")
      .send({ idToken: "google-id-token" })
      .expect(201);
    const loginBody = loginResponse.body as LoginResponseBody;

    const response = await request(httpServer)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${loginBody.accessToken}`)
      .expect(200);
    const body = response.body as LoginResponseBody["user"];

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
    });
    expect(body).toEqual({
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
    const loginBody = loginResponse.body as LoginResponseBody;

    const response = await request(httpServer)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: loginBody.refreshToken })
      .expect(201);
    const body = response.body as RefreshResponseBody;

    expect(typeof body.accessToken).toBe("string");
    expect(body.tokenType).toBe("Bearer");
    expect(body.expiresIn).toBe(900);
    expect(typeof body.refreshToken).toBe("string");
    expect(body.refreshExpiresIn).toBe(604800);
    expect(body.refreshToken).not.toEqual(loginBody.refreshToken);
  });

  it("clears the refresh token on logout", async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const loginResponse = await request(httpServer)
      .post("/api/v1/auth/google/login")
      .send({ idToken: "google-id-token" })
      .expect(201);
    const loginBody = loginResponse.body as LoginResponseBody;

    await request(httpServer)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${loginBody.accessToken}`)
      .expect(201);

    await request(httpServer)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: loginBody.refreshToken })
      .expect(401);
  });
});
