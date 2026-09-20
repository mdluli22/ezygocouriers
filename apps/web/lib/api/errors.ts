import type { ApiErrorCode } from "@ezygo/contracts";

export class ApiProblem extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  constructor(code: ApiErrorCode, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
