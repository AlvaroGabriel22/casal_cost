import { HttpException, HttpStatus } from '@nestjs/common';
import { err } from './api-response';

export function throwForbiddenAccess(message: string): never {
  throw new HttpException(
    err('UNAUTHORIZED_ACCESS', message),
    HttpStatus.FORBIDDEN,
  );
}
