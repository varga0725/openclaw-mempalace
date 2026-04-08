import { runPythonJson } from "./runtime-bridge.ts";
import type { MempalaceAdapter, RecallResult, SaveResult } from "./mempalace-adapter.ts";

export type MempalaceBackendKind = "python-bridge" | "http" | "mcp";

const recallScript = `
import sys, json
from mempalace.searcher import search_memories
payload = json.loads(sys.stdin.read())
res = search_memories(payload['query'], palace_path=payload['palace_path'], n_results=payload['max_results'])
print(json.dumps(res))
`.trim();

const saveMessageScript = `
import sys, json, hashlib
from datetime import datetime
import chromadb
payload = json.loads(sys.stdin.read())
client = chromadb.PersistentClient(path=payload['palace_path'])
try:
    col = client.get_collection('mempalace_drawers')
except Exception:
    col = client.create_collection('mempalace_drawers')
content = payload['content']
wing = payload['wing']
room = payload['room']
source_file = payload['source_file']
content_hash = hashlib.md5(content.encode()).hexdigest()
drawer_id = f"drawer_{wing}_{room}_{content_hash[:16]}"
try:
    existing = col.get(ids=[drawer_id])
    if existing and existing.get('ids'):
        print(json.dumps({'ok': True, 'duplicate': True}))
        raise SystemExit(0)
except Exception:
    pass
try:
    col.add(documents=[content], ids=[drawer_id], metadatas=[{
        'wing': wing,
        'room': room,
        'source_file': source_file,
        'content_hash': content_hash,
        'chunk_index': 0,
        'added_by': 'openclaw-mempalace-plugin',
        'filed_at': datetime.now().isoformat(),
    }])
except Exception:
    pass
print(json.dumps({'ok': True, 'duplicate': False}))
`.trim();

const saveSessionSnapshotScript = `
import sys, json, hashlib
from datetime import datetime
import chromadb

payload = json.loads(sys.stdin.read())
palace_path = payload["palace_path"]
wing = payload["wing"]
room = payload["room"]
source_file = payload["source_file"]
content = payload["content"]
chunk_size = 800
overlap = 100
min_chunk = 50

client = chromadb.PersistentClient(path=palace_path)
try:
    col = client.get_collection("mempalace_drawers")
except Exception:
    col = client.create_collection("mempalace_drawers")

start = 0
idx = 0
while start < len(content):
    end = min(start + chunk_size, len(content))
    chunk = content[start:end].strip()
    if len(chunk) >= min_chunk:
        chunk_hash = hashlib.md5(chunk.encode()).hexdigest()
        drawer_id = f"drawer_{wing}_{room}_{idx}_{chunk_hash[:16]}"
        try:
            existing = col.get(ids=[drawer_id])
            if existing and existing.get("ids"):
                start = end - overlap if end < len(content) else end
                idx += 1
                continue
        except Exception:
            pass
        try:
            col.add(
                documents=[chunk],
                ids=[drawer_id],
                metadatas=[{
                    "wing": wing,
                    "room": room,
                    "source_file": source_file,
                    "content_hash": chunk_hash,
                    "chunk_index": idx,
                    "added_by": "openclaw-hook",
                    "filed_at": datetime.now().isoformat(),
                }],
            )
        except Exception:
            pass
        idx += 1
    start = end - overlap if end < len(content) else end

print(json.dumps({"ok": True, "chunks": idx}))
`.trim();

export class PythonBridgeMempalaceAdapter implements MempalaceAdapter {
  async recall(params: { query: string; palacePath: string; maxResults: number }): Promise<RecallResult> {
    const result = await runPythonJson(recallScript, {
      query: params.query,
      palace_path: params.palacePath,
      max_results: params.maxResults,
    });
    return {
      ok: result?.ok !== false,
      results: Array.isArray(result?.results) ? result.results : [],
      error: result?.error,
    };
  }

  async saveMessage(params: { palacePath: string; wing: string; room: string; sourceFile: string; content: string }): Promise<SaveResult> {
    const result = await runPythonJson(saveMessageScript, {
      palace_path: params.palacePath,
      wing: params.wing,
      room: params.room,
      source_file: params.sourceFile,
      content: params.content,
    });
    return {
      ok: result?.ok !== false,
      duplicate: result?.duplicate,
      error: result?.error,
    };
  }

  async saveSessionSnapshot(params: { palacePath: string; wing: string; room: string; sourceFile: string; content: string }): Promise<SaveResult> {
    const result = await runPythonJson(saveSessionSnapshotScript, {
      palace_path: params.palacePath,
      wing: params.wing,
      room: params.room,
      source_file: params.sourceFile,
      content: params.content,
    });
    return {
      ok: result?.ok !== false,
      chunks: result?.chunks,
      error: result?.error,
    };
  }
}

export class UnimplementedMempalaceAdapter implements MempalaceAdapter {
  constructor(private backend: Exclude<MempalaceBackendKind, "python-bridge">) {}

  async recall(): Promise<RecallResult> {
    return { ok: false, results: [], error: `${this.backend} backend not implemented yet` };
  }

  async saveMessage(): Promise<SaveResult> {
    return { ok: false, error: `${this.backend} backend not implemented yet` };
  }

  async saveSessionSnapshot(): Promise<SaveResult> {
    return { ok: false, error: `${this.backend} backend not implemented yet` };
  }
}
