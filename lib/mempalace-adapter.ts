import type { MempalaceBackendKind } from "./mempalace-backends.ts";
import { PythonBridgeMempalaceAdapter, UnimplementedMempalaceAdapter } from "./mempalace-backends.ts";

export type RecallHit = {
  wing?: string;
  room?: string;
  source_file?: string;
  text?: string;
};

export type RecallResult = {
  ok: boolean;
  results: RecallHit[];
  error?: string;
};

export type SaveResult = {
  ok: boolean;
  duplicate?: boolean;
  chunks?: number;
  error?: string;
};

export interface MempalaceAdapter {
  recall(params: { query: string; palacePath: string; maxResults: number }): Promise<RecallResult>;
  saveMessage(params: { palacePath: string; wing: string; room: string; sourceFile: string; content: string }): Promise<SaveResult>;
  saveSessionSnapshot(params: { palacePath: string; wing: string; room: string; sourceFile: string; content: string }): Promise<SaveResult>;
}

export function createMempalaceAdapter(backend: MempalaceBackendKind = "python-bridge"): MempalaceAdapter {
  if (backend === "python-bridge") {
    return new PythonBridgeMempalaceAdapter();
  }
  return new UnimplementedMempalaceAdapter(backend);
}
