import { HealthService } from "./health.service";

describe("HealthService", () => {
  let service: HealthService;

  beforeEach(() => {
    service = new HealthService();
  });

  it("returns an ok health payload", () => {
    const result = service.getStatus();

    expect(result.status).toBe("ok");
    expect(result.service).toBe("template-backend");
    expect(new Date(result.timestamp).toString()).not.toBe("Invalid Date");
  });
});

