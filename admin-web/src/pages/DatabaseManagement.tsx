import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { fadeSlideCard } from '../components/animations/motionPresets';
import type { CollectionScanResult, ScanDatabaseRequest } from '../services/databaseManagementService';
import { databaseManagementService } from '../services/databaseManagementService';
import { aiService, type ChatMessage } from '../services/aiService';
import { AssistantMessageMarkdown } from '../components/ai/AssistantMessageMarkdown';

type UiMessage = ChatMessage & { id: string };

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function newSessionId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : createId();
}

const AI_MIGRATION_SYSTEM_PROMPT = `Bạn là AI chuyên tạo "migration script" cho MongoDB (quy ước updateMany/updatePipeline) để sửa cấu trúc dữ liệu.

Nhiệm vụ:
- Dựa trên snapshot MongoDB hiện tại (field inference + sample docs) do user cung cấp
- Hiểu rõ cấu trúc hiện tại và chỗ nào cần sửa theo prompt yêu cầu
- Sinh script migration an toàn và hợp lý (không xóa dữ liệu nếu không được yêu cầu rõ)
- Trình bày output ở dạng Markdown, ưu tiên nội dung có thể copy/paste

Ràng buộc output STRICT:
1) Trả về ONLY Markdown, không giải thích lan man ngoài cấu trúc yêu cầu.
2) Chèn ít nhất 2 khối code fence:
   - Một khối \`\`\`json\`\`\` chứa "operations" dạng mảng JSON, theo format:
     [
       { "type":"updateMany", "collection":"<name>", "filter":{...}, "update":{...}, "upsert":false }
     ]
   - Một khối \`\`\`js\`\`\` là pseudocode script Node/Mongoose để áp dụng operations lên MongoDB
3) Sau đó, mô phỏng áp dụng script lên sample docs:
   - Trả "before" và "after" cho từng doc (có thể rút gọn)
4) Tránh dùng field path có ký hiệu mảng placeholder kiểu "[]". Nếu cần thao tác mảng thực tế, hãy dùng arrayFilters/$[] và nêu rõ giả định.
`;

function buildAiContextMd(selectedCollection: CollectionScanResult | null): string {
  if (!selectedCollection) return 'No collection selected.';
  const fieldLines = selectedCollection.fieldSummaries.slice(0, 120).map((f) => {
    const ex = f.examples?.length ? ` examples=[${f.examples.slice(0, 3).join(', ')}]` : '';
    return `- ${f.path} (types=${f.types.join('|')})${ex}`;
  });
  const sampleJson = JSON.stringify(selectedCollection.sampleDocs ?? [], null, 2);
  return [
    '# Snapshot collection',
    '',
    `- collection: ${selectedCollection.name}`,
    `- totalDocuments: ${selectedCollection.totalDocuments ?? 'unknown'}`,
    `- sampleUsed: ${selectedCollection.sampleUsed}`,
    '',
    `## Field inference (top ${Math.min(120, selectedCollection.fieldSummaries.length)} paths)`,
    ...fieldLines,
    '',
    '## Sample docs',
    '',
    '```json',
    sampleJson,
    '```',
  ].join('\n');
}

export default function DatabaseManagement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{
    scannedAt: string;
    collections: CollectionScanResult[];
  } | null>(null);

  const [sampleSizePerCollection, setSampleSizePerCollection] = useState(60);
  const [scanAll, setScanAll] = useState(false);
  const [maxDocsTotal, setMaxDocsTotal] = useState(3000);
  const [maxDocsPerCollection, setMaxDocsPerCollection] = useState(500);
  const [includeSampleDocs, setIncludeSampleDocs] = useState(true);

  const [selectedCollectionName, setSelectedCollectionName] = useState<string | null>(null);
  const selectedCollection = useMemo(() => {
    if (!scanResult?.collections || !selectedCollectionName) return null;
    return scanResult.collections.find((c) => c.name === selectedCollectionName) ?? null;
  }, [scanResult, selectedCollectionName]);

  const [fieldSearch, setFieldSearch] = useState('');
  const aiSessionIdRef = useRef<string>(newSessionId());
  const [chatMessages, setChatMessages] = useState<UiMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!scanResult?.collections?.length) return;
    if (!selectedCollectionName) setSelectedCollectionName(scanResult.collections[0].name);
  }, [scanResult, selectedCollectionName]);

  useEffect(() => {
    // Mỗi lần đổi collection thì reset ngữ cảnh chat.
    aiSessionIdRef.current = newSessionId();
    setChatMessages([]);
    setChatInput('');
    setChatError(null);
  }, [selectedCollectionName]);

  useEffect(() => {
    if (!chatListRef.current) return;
    chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
  }, [chatMessages.length]);

  const aiContextMd = useMemo(() => buildAiContextMd(selectedCollection), [selectedCollection]);

  const handleSendChat = useCallback(async () => {
    if (!selectedCollectionName) return;
    if (!chatInput.trim()) return;
    if (chatLoading) return;

    const trimmed = chatInput.trim();
    setChatInput('');
    setChatError(null);
    setChatLoading(true);

    const userMessage: UiMessage = {
      id: createId(),
      role: 'user',
      content: trimmed,
    };

    const combinedUserContent = [
      trimmed,
      '',
      '---',
      'AI MIGRATION INSTRUCTIONS (Markdown):',
      AI_MIGRATION_SYSTEM_PROMPT,
      '',
      'CURRENT SNAPSHOT (Markdown):',
      aiContextMd,
    ].join('\n');

    const historyForApi: ChatMessage[] = [
      ...chatMessages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: combinedUserContent },
    ];

    setChatMessages((prev) => [...prev, userMessage]);

    try {
      const assistant = await aiService.chat(historyForApi, { sessionId: aiSessionIdRef.current });
      const assistantMessage: UiMessage = {
        id: createId(),
        role: assistant.role ?? 'assistant',
        content: assistant.content,
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (e: unknown) {
      setChatError(e instanceof Error ? e.message : 'AI request failed');
    } finally {
      setChatLoading(false);
    }
  }, [aiContextMd, chatInput, chatLoading, chatMessages, selectedCollectionName]);

  const runScan = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const body: ScanDatabaseRequest = {
        sampleSizePerCollection: Number(sampleSizePerCollection) || 60,
        scanAll,
        maxDocsTotal: Number(maxDocsTotal) || 3000,
        maxDocsPerCollection: Number(maxDocsPerCollection) || 500,
        includeSampleDocs,
      };
      const res = await databaseManagementService.scan(body);
      setScanResult({ scannedAt: res.scannedAt, collections: res.collections });
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? 'Scan failed');
      setScanResult(null);
    } finally {
      setLoading(false);
    }
  }, [includeSampleDocs, maxDocsPerCollection, maxDocsTotal, sampleSizePerCollection, scanAll]);

  const filteredFieldSummaries = useMemo(() => {
    const list = selectedCollection?.fieldSummaries ?? [];
    const q = fieldSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((f) => f.path.toLowerCase().includes(q));
  }, [fieldSearch, selectedCollection]);

  if (loading && !scanResult) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Database Management"
          description="Quét cấu trúc MongoDB theo document, hiển thị theo collection và chuẩn bị dữ liệu cho AI migration."
        />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="lg:col-span-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader
          title="Database Management"
          description="Quét/đọc structure MongoDB theo collection, suy luận field + loại giá trị. Bên phải: chat với AI để sinh migration script dựa trên sample docs."
        />
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={runScan} disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white">
            {loading ? 'Đang quét…' : 'Scan MongoDB'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6 min-w-0">
          <motion.div variants={fadeSlideCard} initial="hidden" animate="visible" className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Scan Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="min-w-[200px]">
                    <label className="block text-sm font-semibold text-slate-600 mb-1.5">Sample size/collection</label>
                    <input
                      type="number"
                      value={sampleSizePerCollection}
                      min={1}
                      onChange={(e) => setSampleSizePerCollection(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 bg-white/90 shadow-sm px-3.5 py-2.5 text-sm text-slate-800"
                    />
                  </div>

                  <div className="min-w-[220px]">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-1.5">
                      <input type="checkbox" checked={scanAll} onChange={(e) => setScanAll(e.target.checked)} />
                      Scan all (experimental)
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">Duyệt tối đa `maxDocsTotal` để tránh treo.</p>
                  </div>

                  <div className="min-w-[220px]">
                    <label className="block text-sm font-semibold text-slate-600 mb-1.5">maxDocsTotal</label>
                    <input
                      type="number"
                      value={maxDocsTotal}
                      min={1}
                      onChange={(e) => setMaxDocsTotal(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 bg-white/90 shadow-sm px-3.5 py-2.5 text-sm text-slate-800"
                      disabled={!scanAll}
                    />
                  </div>

                  <div className="min-w-[220px]">
                    <label className="block text-sm font-semibold text-slate-600 mb-1.5">maxDocsPerCollection</label>
                    <input
                      type="number"
                      value={maxDocsPerCollection}
                      min={1}
                      onChange={(e) => setMaxDocsPerCollection(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 bg-white/90 shadow-sm px-3.5 py-2.5 text-sm text-slate-800"
                      disabled={!scanAll}
                    />
                  </div>

                  <div className="min-w-[220px]">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-1.5">
                      <input type="checkbox" checked={includeSampleDocs} onChange={(e) => setIncludeSampleDocs(e.target.checked)} />
                      Include sample docs
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">Giúp kiểm tra nhanh structure.</p>
                  </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeSlideCard} initial="hidden" animate="visible" className="space-y-4">
            {!scanResult?.collections?.length ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-600">
                    Chưa có dữ liệu scan. Bấm <span className="font-semibold">Scan MongoDB</span> để bắt đầu.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm text-slate-600">
                      Scanned at: <span className="font-semibold">{new Date(scanResult.scannedAt).toLocaleString('vi-VN')}</span>
                    </p>
                  </div>
                  <div className="min-w-[240px]">
                    <label className="block text-sm font-semibold text-slate-600 mb-1.5">Search field path</label>
                    <input
                      type="text"
                      value={fieldSearch}
                      onChange={(e) => setFieldSearch(e.target.value)}
                      placeholder="vd: createdAt, levelStats[], nameId..."
                      className="w-full rounded-lg border border-slate-200 bg-white/90 shadow-sm px-3.5 py-2.5 text-sm text-slate-800"
                    />
                  </div>
                </div>

                {/* Tabs collections */}
                <div className="rounded-lg border border-slate-200 bg-white/60 p-2 overflow-x-auto">
                  <div className="flex items-center gap-2 min-w-max">
                    {scanResult.collections.map((c) => {
                      const active = c.name === selectedCollectionName;
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setSelectedCollectionName(c.name)}
                          className={`px-3 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                            active ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {c.name}
                          <span className="ml-2 inline-flex items-center rounded-full bg-white/50 px-2 py-0.5 text-xs font-normal">
                            {c.fieldSummaries.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedCollection ? (
                  <Card className="border-0 shadow-lg overflow-hidden">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-xl flex items-center gap-2 flex-wrap">
                        <span className="text-lg">🧩</span>
                        {selectedCollection.name}
                        <Badge variant="outline" className="text-xs">
                          sample: {selectedCollection.sampleUsed}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          total: {selectedCollection.totalDocuments ?? '—'}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gradient-to-r from-slate-50 to-blue-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Field</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Value types</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Docs with path</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Examples</th>
                            </tr>
                          </thead>
                          <tbody className="bg-card divide-y divide-border">
                            {filteredFieldSummaries.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground text-sm">
                                  Không tìm thấy field nào phù hợp.
                                </td>
                              </tr>
                            ) : (
                              filteredFieldSummaries.map((f) => {
                                return (
                                  <tr key={f.path} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-sm font-mono text-slate-800">
                                      <div className="flex items-center gap-2">
                                        <span className="text-slate-400">•</span>
                                        <span title={f.path} className="truncate max-w-[240px]">
                                          {f.path}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className="text-xs">
                                          {f.typeCount} types
                                        </Badge>
                                        <span className="text-slate-600">
                                          {f.types.slice(0, 3).join(', ')}
                                          {f.types.length > 3 ? ` +${f.types.length - 3}` : ''}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700">
                                      {f.docsWithPath}/{selectedCollection.sampleUsed}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700">
                                      {f.examples.length ? (
                                        <div className="flex flex-wrap gap-2">
                                          {f.examples.slice(0, 3).map((ex) => (
                                            <span
                                              key={ex}
                                              className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 max-w-[220px] truncate"
                                              title={ex}
                                            >
                                              {ex}
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </>
            )}
          </motion.div>
        </div>

        {/* Right panel: AI chat (migration script generator) */}
        <div className="lg:col-span-4 space-y-6 min-w-0">
          <motion.div variants={fadeSlideCard} initial="hidden" animate="visible" className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center justify-between gap-2 flex-wrap">
                  <span>AI Migration Assistant</span>
                  {selectedCollectionName && (
                    <Badge variant="outline" className="text-xs">
                      target: {selectedCollectionName}
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Nhập câu lệnh prompt để AI tạo migration script dựa trên snapshot + sample docs.
                </p>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 overflow-hidden">
                  <div
                    ref={chatListRef}
                    className="h-[48vh] min-h-[320px] max-h-[520px] overflow-y-auto px-3 py-3 space-y-3"
                  >
                    {chatMessages.length === 0 ? (
                      <div className="text-sm text-slate-500">
                        Chưa có chat. Ví dụ prompt:
                        <div className="mt-2 text-xs text-slate-600 leading-relaxed">
                          “Chuyển field <code>type</code> từ string sang enum; nếu thiếu/null thì set giá trị mặc định; mô phỏng trước/sau cho sample docs”.
                        </div>
                      </div>
                    ) : (
                      chatMessages.map((m) => (
                        <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[min(100%,28rem)] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                              m.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-sm'
                                : 'bg-white text-slate-800 rounded-bl-sm border border-slate-200'
                            }`}
                          >
                            {m.role === 'assistant' ? (
                              <AssistantMessageMarkdown content={m.content} variant="compact" />
                            ) : (
                              <div className="whitespace-pre-wrap break-words">{m.content}</div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {chatLoading && <div className="text-sm text-slate-500">AI đang viết script…</div>}
                  </div>

                  {chatError && (
                    <div className="px-3 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">
                      {chatError}
                    </div>
                  )}

                  <form
                    className="p-3 bg-white border-t border-slate-200"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleSendChat();
                    }}
                  >
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Prompt migration (cần AI viết script)
                    </label>
                    <textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      rows={3}
                      placeholder={selectedCollectionName ? 'Nhập prompt yêu cầu migration...' : 'Scan và chọn collection trước.'}
                      disabled={!selectedCollectionName || chatLoading}
                      className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono text-slate-900 outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/25 disabled:opacity-60"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void handleSendChat();
                        }
                      }}
                    />
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          aiSessionIdRef.current = newSessionId();
                          setChatMessages([]);
                          setChatInput('');
                          setChatError(null);
                        }}
                        disabled={chatLoading}
                      >
                        Clear chat
                      </Button>
                      <Button
                        type="submit"
                        disabled={chatLoading || !chatInput.trim() || !selectedCollectionName}
                        className="bg-slate-900 hover:bg-slate-800 text-white"
                      >
                        {chatLoading ? 'Đang gửi…' : 'Gửi'}
                      </Button>
                    </div>
                  </form>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeSlideCard} initial="hidden" animate="visible" className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Sample docs</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {!selectedCollection ? (
                  <p className="text-sm text-muted-foreground">Chọn collection để xem sample docs.</p>
                ) : selectedCollection.sampleDocs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Include sample docs đang tắt.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedCollection.sampleDocs.map((doc, idx) => (
                      <div key={idx} className="rounded-lg border border-slate-200 bg-white p-2">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            doc #{idx + 1}
                          </Badge>
                        </div>
                        <pre className="text-xs font-mono bg-slate-900 text-slate-100 p-3 rounded-lg whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto">
                          {JSON.stringify(doc, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

