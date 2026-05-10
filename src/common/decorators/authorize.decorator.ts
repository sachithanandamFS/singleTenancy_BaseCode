import { SetMetadata } from '@nestjs/common';

export const AUTHORIZE_KEY = 'authorize';

export interface AuthorizeMetadata {
  mod_id: number;
  respo_id: number;
}

export const Authorize = (mod_id: number, respo_id: number) =>
  SetMetadata(AUTHORIZE_KEY, { mod_id, respo_id });
