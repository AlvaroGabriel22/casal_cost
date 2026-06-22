export function ok<T>(data: T, message = 'Operation completed successfully') {
  return { success: true as const, data, message };
}

export function err(code: string, message: string) {
  return { success: false as const, error: { code, message } };
}
