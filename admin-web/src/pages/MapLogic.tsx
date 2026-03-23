import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { mapLogicService, type MapLogic, type MapLogicLookupTable, type MapLogicLookupCase, type MapLogicStatus } from '../services/mapLogicService';

const MAX_SIZE = 6;
const MIN_SIZE = 2;

type NodeType = 'corner' | 'edge' | 'inner';

type Movement = { from: number; to: number };

type CalcResult = {
  first: number | null;
  chain: number[];
  formulaUsed: string;
  movement: Movement[];
};

type LookupCaseCalc = MapLogicLookupCase & {
  fromType: NodeType;
  toType: NodeType;
  calcResult: CalcResult;
  pass: boolean;
};

// Ground truth chỉ áp dụng cho 3x3 (để hiển thị “consistency” khi test).
// Nguồn: admin-web/public/ExtendedGridSupport.html
const MOVEMENT_TABLE_3x3: Record<number, Record<number, { chain: number[] }>> = {
  0: { 3: { chain: [1, 2] }, 1: { chain: [3, 6] } },
  2: { 5: { chain: [1, 0] }, 1: { chain: [5, 8] } },
  6: { 3: { chain: [7, 8] }, 7: { chain: [3, 0] } },
  8: { 5: { chain: [7, 6] }, 7: { chain: [5, 2] } },
  4: { 1: { chain: [7] }, 3: { chain: [5] }, 5: { chain: [3] }, 7: { chain: [1] } },
  5: { 2: { chain: [8] }, 8: { chain: [2] }, 4: { chain: [2] } },
  3: { 0: { chain: [6] }, 4: { chain: [6] }, 6: { chain: [0] } },
  1: { 0: { chain: [2] }, 2: { chain: [0] }, 4: { chain: [0] } },
  7: { 6: { chain: [8] }, 4: { chain: [8] }, 8: { chain: [6] } },
};

function getPos(idx: number, cols: number) {
  return { row: Math.floor(idx / cols), col: idx % cols };
}

function toIdx(row: number, col: number, cols: number) {
  return row * cols + col;
}

function isInBounds(row: number, col: number, cols: number, rows: number) {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

function getAdjacentPositions(idx: number, cols: number, rows: number) {
  const { row, col } = getPos(idx, cols);
  const adj: number[] = [];
  if (row > 0) adj.push(toIdx(row - 1, col, cols));
  if (row < rows - 1) adj.push(toIdx(row + 1, col, cols));
  if (col > 0) adj.push(toIdx(row, col - 1, cols));
  if (col < cols - 1) adj.push(toIdx(row, col + 1, cols));
  return adj;
}

function getNodeType(idx: number, cols: number, rows: number): NodeType {
  const { row, col } = getPos(idx, cols);
  const onRowEdge = row === 0 || row === rows - 1;
  const onColEdge = col === 0 || col === cols - 1;
  if (onRowEdge && onColEdge) return 'corner';
  if (onRowEdge || onColEdge) return 'edge';
  return 'inner';
}

function calculateMovementGeneral(from: number, to: number, cols: number, rows: number): CalcResult {
  const fromPos = getPos(from, cols);
  const toPos = getPos(to, cols);
  const nodeType = getNodeType(from, cols, rows);

  const drow = toPos.row - fromPos.row;
  const dcol = toPos.col - fromPos.col;

  let first: number | null;
  let formulaUsed: string;

  if (nodeType === 'corner') {
    const adj = getAdjacentPositions(from, cols, rows);
    first = adj.find((p) => p !== to) ?? null;
    formulaUsed = 'corner: adj(from) \\ {to}';
  } else {
    const candidateRow = fromPos.row - drow;
    const candidateCol = fromPos.col - dcol;

    if (isInBounds(candidateRow, candidateCol, cols, rows)) {
      first = toIdx(candidateRow, candidateCol, cols);
      formulaUsed = 'general: 2×from − to';
    } else {
      // out-of-bounds → edge nhìn vào trong: xoay 90° CW
      const r2 = dcol;
      const c2 = -drow;
      const candidateRow2 = fromPos.row + r2;
      const candidateCol2 = fromPos.col + c2;
      if (isInBounds(candidateRow2, candidateCol2, cols, rows)) {
        first = toIdx(candidateRow2, candidateCol2, cols);
        formulaUsed = 'edge→inner: CW rotate(dir)';
      } else {
        // thử CCW: (drow, dcol) → (-dcol, drow)
        const r3 = -dcol;
        const c3 = drow;
        const candidateRow3 = fromPos.row + r3;
        const candidateCol3 = fromPos.col + c3;
        if (isInBounds(candidateRow3, candidateCol3, cols, rows)) {
          first = toIdx(candidateRow3, candidateCol3, cols);
          formulaUsed = 'edge→inner: CCW rotate(dir)';
        } else {
          first = null;
          formulaUsed = 'no valid first found';
        }
      }
    }
  }

  const chain: number[] = [];

  if (first !== null) {
    const firstPos = getPos(first, cols);
    const chainDrow = firstPos.row - fromPos.row;
    const chainDcol = firstPos.col - fromPos.col;

    let cur = first;
    while (true) {
      chain.push(cur);
      const curPos = getPos(cur, cols);
      const nextRow = curPos.row + chainDrow;
      const nextCol = curPos.col + chainDcol;
      if (!isInBounds(nextRow, nextCol, cols, rows)) break;
      cur = toIdx(nextRow, nextCol, cols);
    }
  }

  const movement: Movement[] = [];
  movement.push({ from, to });
  if (chain.length > 0) {
    movement.push({ from: chain[0], to: from });
    for (let i = 1; i < chain.length; i++) {
      movement.push({ from: chain[i], to: chain[i - 1] });
    }
  }

  return { first, chain, formulaUsed, movement };
}

function buildLookupTable(width: number, height: number) {
  const cols = width;
  const rows = height;
  const total = cols * rows;

  const casesCalc: LookupCaseCalc[] = [];
  const cases: MapLogicLookupCase[] = [];

  for (let from = 0; from < total; from++) {
    const adj = getAdjacentPositions(from, cols, rows);
    for (const to of adj) {
      const calcResult = calculateMovementGeneral(from, to, cols, rows);

      const fromType = getNodeType(from, cols, rows);
      const toType = getNodeType(to, cols, rows);

      let pass: boolean;
      if (cols === 3 && rows === 3 && MOVEMENT_TABLE_3x3[from]?.[to]) {
        const groundTruth = MOVEMENT_TABLE_3x3[from][to].chain;
        pass = JSON.stringify(groundTruth) === JSON.stringify(calcResult.chain);
      } else {
        const adjFrom = getAdjacentPositions(from, cols, rows);
        const firstIsAdj = calcResult.first !== null && adjFrom.includes(calcResult.first);
        const chainInBounds = calcResult.chain.every((c) => c >= 0 && c < total);
        pass = firstIsAdj && chainInBounds && calcResult.chain.length > 0;
      }

      // Contract backend yêu cầu chain.length >= 1.
      // Với cấu hình lưới hợp lệ (>=2x2) thuật toán kỳ vọng sẽ không tạo chain rỗng.
      if (calcResult.chain.length === 0) continue;

      const entry: LookupCaseCalc = {
        from,
        to,
        chain: calcResult.chain,
        fromType,
        toType,
        calcResult,
        pass,
      };
      casesCalc.push(entry);
      cases.push({ from, to, chain: calcResult.chain });
    }
  }

  const lookupTable: MapLogicLookupTable = { width, height, cases };
  const totalGenerated = casesCalc.length;
  const passed = casesCalc.filter((c) => c.pass).length;

  return { lookupTable, casesCalc, totalGenerated, passed };
}

function clampInt(val: number, min: number, max: number) {
  if (Number.isNaN(val) || !Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, Math.trunc(val)));
}

export default function MapLogic() {
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [mapLogics, setMapLogics] = useState<MapLogic[]>([]);

  // Editor state
  const [name, setName] = useState('');
  const [width, setWidth] = useState(3);
  const [height, setHeight] = useState(3);
  const [status, setStatus] = useState<MapLogicStatus>('draft');

  const [lookupTable, setLookupTable] = useState<MapLogicLookupTable | null>(null);
  const [casesCalc, setCasesCalc] = useState<LookupCaseCalc[] | null>(null);
  const [genStats, setGenStats] = useState<{ totalGenerated: number; passed: number } | null>(null);

  const [selectedFrom, setSelectedFrom] = useState<number | null>(null);
  const [selectedTo, setSelectedTo] = useState<number | null>(null);

  const [genError, setGenError] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setListLoading(true);
        setListError(null);
        const data = await mapLogicService.getMapLogics();
        if (!cancelled) setMapLogics(data);
      } catch {
        if (!cancelled) setListError('Không tải được Map logic từ DB');
      } finally {
        if (!cancelled) setListLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const caseByPair = useMemo(() => {
    if (!casesCalc) return new Map<string, LookupCaseCalc>();
    return new Map(casesCalc.map((c) => [`${c.from}-${c.to}`, c]));
  }, [casesCalc]);

  const activeCase = useMemo(() => {
    if (selectedFrom === null || selectedTo === null) return null;
    return caseByPair.get(`${selectedFrom}-${selectedTo}`) ?? null;
  }, [caseByPair, selectedFrom, selectedTo]);

  const adjFrom = useMemo(() => {
    if (lookupTable && selectedFrom !== null) {
      return getAdjacentPositions(selectedFrom, lookupTable.width, lookupTable.height);
    }
    return [];
  }, [lookupTable, selectedFrom]);

  const doGenerate = async () => {
    setGenError(null);
    setSaveError(null);

    const nextWidth = clampInt(width, MIN_SIZE, MAX_SIZE);
    const nextHeight = clampInt(height, MIN_SIZE, MAX_SIZE);
    if (nextWidth !== width) setWidth(nextWidth);
    if (nextHeight !== height) setHeight(nextHeight);

    setGenLoading(true);
    try {
      const { lookupTable: lt, casesCalc: cc, totalGenerated, passed } = buildLookupTable(nextWidth, nextHeight);
      setLookupTable(lt);
      setCasesCalc(cc);
      setGenStats({ totalGenerated, passed });
      setSelectedFrom(null);
      setSelectedTo(null);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Không thể generate lookup table');
    } finally {
      setGenLoading(false);
    }
  };

  const handleCellClick = (idx: number) => {
    if (!lookupTable || !casesCalc) return;
    if (selectedFrom === null) {
      setSelectedFrom(idx);
      setSelectedTo(null);
      return;
    }
    if (idx === selectedFrom) {
      setSelectedFrom(null);
      setSelectedTo(null);
      return;
    }
    if (!adjFrom.includes(idx)) {
      setSelectedFrom(idx);
      setSelectedTo(null);
      return;
    }
    setSelectedTo(idx);
  };

  const handleSave = async () => {
    setSaveError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setSaveError('Vui lòng nhập name cho Map logic');
      return;
    }
    if (!lookupTable || !casesCalc) {
      setSaveError('Chưa generate lookup table');
      return;
    }

    setSaveLoading(true);
    try {
      await mapLogicService.createMapLogic({
        name: trimmedName,
        width: lookupTable.width,
        height: lookupTable.height,
        gridConfig: { width: lookupTable.width, height: lookupTable.height },
        status,
        lookupTable,
      });
      const data = await mapLogicService.getMapLogics();
      setMapLogics(data);
    } catch (e) {
      const err = e as any;
      const serverError = err?.response?.data?.error;
      if (serverError) {
        setSaveError(typeof serverError === 'string' ? serverError : JSON.stringify(serverError));
      } else {
        setSaveError(e instanceof Error ? e.message : 'Lưu Map logic thất bại');
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const statusToggleNext = () => {
    setStatus((s) => (s === 'draft' ? 'active' : 'draft'));
  };

  return (
    <div className="relative z-0 p-6 space-y-6 bg-gradient-to-br from-background to-slate-50/50 min-h-screen">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader title="Map logic" description="Tạo lưới theo width/height, test lookup table và lưu vào DB." />
        <div className="flex gap-2 items-center">
          <Button type="button" variant="outline" onClick={doGenerate} disabled={genLoading}>
            {genLoading ? 'Đang generate...' : 'Generate grid'}
          </Button>
          <Button type="button" onClick={handleSave} disabled={saveLoading || genLoading} className="bg-primary-600 hover:bg-primary-700">
            {saveLoading ? 'Đang lưu...' : 'Save to DB'}
          </Button>
        </div>
      </div>

      {genError && (
        <motion.div
          className="rounded-lg bg-destructive/10 text-destructive px-4 py-2 text-sm"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {genError}
        </motion.div>
      )}

      {saveError && (
        <motion.div
          className="rounded-lg bg-destructive/10 text-destructive px-4 py-2 text-sm"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {saveError}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-none border-border/60">
          <CardHeader>
            <h2 className="text-lg font-semibold">Input</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                placeholder="vd: maplogic_3x3_v1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Width</label>
                <input
                  type="number"
                  value={width}
                  min={MIN_SIZE}
                  max={MAX_SIZE}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Height</label>
                <input
                  type="number"
                  value={height}
                  min={MIN_SIZE}
                  max={MAX_SIZE}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Status</label>
              <button
                type="button"
                onClick={statusToggleNext}
                className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent select-none cursor-pointer ${
                  status === 'active'
                    ? 'bg-emerald-500 text-emerald-50 hover:bg-emerald-600'
                    : 'bg-slate-600 text-slate-50 hover:bg-slate-700'
                }`}
              >
                {status}
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Lookup</Badge>
                <Badge variant="secondary">
                  {lookupTable ? `${lookupTable.width}×${lookupTable.height}` : 'chưa generate'}
                </Badge>
              </div>
              {genStats ? (
                <div className="text-sm text-muted-foreground">
                  Cases: {genStats.totalGenerated} · Pass: {genStats.passed} · Accuracy:{' '}
                  {genStats.totalGenerated ? `${Math.round((genStats.passed / genStats.totalGenerated) * 100)}%` : '—'}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Bấm “Generate grid” để test trước khi lưu.</div>
              )}
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="text-sm font-medium mb-1">Tip</div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                Click ô trong grid để chọn `from`, sau đó click ô kề cạnh để chọn `to`. Hệ thống sẽ hiển thị `chain` và công thức dùng để suy ra bước tiếp theo.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-border/60 lg:col-span-2">
          <CardHeader>
            <h2 className="text-lg font-semibold">Test grid</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {!lookupTable || !casesCalc ? (
              <div className="text-sm text-muted-foreground">Chưa có lookup table. Hãy nhập width/height và bấm “Generate grid”.</div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="text-sm text-muted-foreground">
                    Grid: <span className="font-mono">{lookupTable.width}×{lookupTable.height}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Chọn: <span className="font-mono">{selectedFrom ?? '—'}</span> {selectedTo !== null ? <span className="font-mono">→ {selectedTo}</span> : null}
                  </div>
                </div>

                <div
                  className="grid gap-1 select-none"
                  style={{ gridTemplateColumns: `repeat(${lookupTable.width}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: lookupTable.width * lookupTable.height }, (_, i) => i).map((idx) => {
                    const type = getNodeType(idx, lookupTable.width, lookupTable.height);
                    const typeShort = type === 'corner' ? 'C' : type === 'edge' ? 'E' : 'I';

                    const isFrom = selectedFrom === idx;
                    const isTo = selectedFrom !== null && adjFrom.includes(idx) && selectedTo === null && !isFrom;
                    const isActiveTo = selectedTo === idx;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleCellClick(idx)}
                        className={[
                          'rounded border text-left p-2',
                          isFrom ? 'border-primary-400 bg-primary-50/70' : 'border-slate-200 bg-background',
                          isActiveTo ? 'border-emerald-400 bg-emerald-50/60' : '',
                          isTo ? 'ring-2 ring-primary-200' : '',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px]">{idx}</span>
                          <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                            {typeShort}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                  {!activeCase ? (
                    <div className="text-sm text-muted-foreground">
                      Chưa chọn cặp `from`/`to`. Chọn `from`, sau đó chọn `to` kề cạnh để xem chain.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2 items-center">
                        <Badge variant="outline">from</Badge>
                        <span className="font-mono text-sm">{activeCase.from}</span>
                        <Badge variant="secondary">({activeCase.fromType})</Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="outline">to</Badge>
                        <span className="font-mono text-sm">{activeCase.to}</span>
                        <Badge variant="secondary">({activeCase.toType})</Badge>
                        <Badge variant={activeCase.pass ? 'default' : 'destructive'}>{activeCase.pass ? 'pass' : 'fail'}</Badge>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        Formula: <span className="font-mono">{activeCase.calcResult.formulaUsed}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-sm font-medium">Chain</div>
                        <div className="flex flex-wrap gap-2">
                          {activeCase.chain.map((n, i) => (
                            <Badge key={i} variant="outline" className="font-mono">
                              {n}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        movement: {activeCase.calcResult.movement.map((m) => `${m.from}->${m.to}`).join(', ')}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Lưu ý: backend chỉ lưu `lookupTable.cases` (from/to/chain), không lưu `formulaUsed`/`pass`.
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Saved Map logic</h2>
        {listLoading ? (
          <div className="text-sm text-muted-foreground">Đang tải...</div>
        ) : listError ? (
          <div className="text-sm text-destructive">{listError}</div>
        ) : mapLogics.length === 0 ? (
          <div className="text-sm text-muted-foreground">Chưa có bản ghi nào.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {mapLogics.map((ml) => (
              <Card key={ml._id} className="shadow-none border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{ml.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{ml.width}×{ml.height}</div>
                    </div>
                    <Badge variant={ml.status === 'active' ? 'default' : 'secondary'}>{ml.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    cases: <span className="font-mono">{ml.lookupTable?.cases?.length ?? 0}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setName(ml.name);
                        setWidth(ml.width);
                        setHeight(ml.height);
                        setStatus(ml.status);
                        const { lookupTable: lt, casesCalc: cc, totalGenerated, passed } = buildLookupTable(ml.width, ml.height);
                        setLookupTable(lt);
                        setCasesCalc(cc);
                        setGenStats({ totalGenerated, passed });
                        setSelectedFrom(null);
                        setSelectedTo(null);
                      }}
                    >
                      Load & test
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

