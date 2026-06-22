import { BrowserRouter } from 'react-router-dom';
import { useEffect } from 'react';
import { AppRoutes } from './app/AppRoutes';
import { useAuthStore } from './stores/auth.store';

export default function App() {
  const recover = useAuthStore((s) => s.recover);

  useEffect(() => {
    void recover();
  }, [recover]);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
