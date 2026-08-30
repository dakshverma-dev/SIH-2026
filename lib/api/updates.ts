import type { FieldUpdate, ExecutionEvent } from '../types';
import { fieldUpdates } from '../mock-data/field-updates';
import { executionEvents } from '../mock-data/execution-events';

export async function getFieldUpdates(): Promise<FieldUpdate[]> {
  return fieldUpdates;
}

export async function getExecutionEvents(): Promise<ExecutionEvent[]> {
  return executionEvents;
}
