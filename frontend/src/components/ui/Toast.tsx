export function Toast({ message, type = 'success' }: { message: string | null; type?: 'success' | 'error' }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className={`fixed bottom-4 right-4 z-50 max-w-sm rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
        type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
      }`}
    >
      {message}
    </div>
  );
}
