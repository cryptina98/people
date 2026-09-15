/** An error whose message is safe to show to the user. */
export class AppError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.details = details;
  }
}

export function toMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && process.env.NODE_ENV !== "production") {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
