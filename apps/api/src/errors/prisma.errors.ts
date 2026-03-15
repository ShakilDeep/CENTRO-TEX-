export class SoftDeleteProhibitedError extends Error {
  constructor(message: string = 'Hard delete is prohibited on this model. Use soft delete instead.', public readonly statusCode: number = 403) {
    super(message);
    this.name = 'SoftDeleteProhibitedError';
    Object.setPrototypeOf(this, SoftDeleteProhibitedError.prototype);
  }
}
