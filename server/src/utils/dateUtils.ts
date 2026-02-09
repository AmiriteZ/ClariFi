export class DateUtils {
  // Mock date to November 30, 2025
  private static MOCKED_DATE = new Date("2025-11-30T12:00:00Z");
  private static USE_MOCK = true;

  static getCurrentDate(): Date {
    if (this.USE_MOCK) {
      return new Date(this.MOCKED_DATE);
    }
    return new Date();
  }

  static isMockEnabled(): boolean {
    return this.USE_MOCK;
  }
}
