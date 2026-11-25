export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}
export const badRequest = (message: string): HttpError => new HttpError(400, message);
export const unauthorized = (message = "Please log in again."): HttpError => new HttpError(401, message);
export const forbidden = (message = "You are not allowed to do that."): HttpError => new HttpError(403, message);
export const notFound = (message = "Not found."): HttpError => new HttpError(404, message);
export const conflict = (message: string): HttpError => new HttpError(409, message);
