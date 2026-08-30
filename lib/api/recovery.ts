import type { RecoveryOption } from '../types';
import { recoveryOptions } from '../mock-data/recovery-options';

export async function getRecoveryOptions(): Promise<RecoveryOption[]> {
  return recoveryOptions;
}
