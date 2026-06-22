import { createConfiguredApp } from './create-app';

async function bootstrap() {
  const app = await createConfiguredApp();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
}
bootstrap();
