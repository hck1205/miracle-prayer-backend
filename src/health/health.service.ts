import { Injectable } from "@nestjs/common";

export interface HealthStatus {
  status: "ok";
  service: string;
  timestamp: string;
}

@Injectable()
export class HealthService {
  getStatus(): HealthStatus {
    return {
      status: "ok",
      service: "template-backend",
      timestamp: new Date().toISOString(),
    };
  }
}

