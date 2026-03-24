import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Highlight, themes } from 'prism-react-renderer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faCompress,
  faCopy,
  faExpand,
  faFloppyDisk,
  faFolderOpen,
  faRotateLeft,
} from '@fortawesome/free-solid-svg-icons';
import { Button } from '../ui/button';
import { fadeInOverlay, scaleInModal } from '../animations/motionPresets';
import { filesService } from '../../services/filesService';

interface SourceClassEditorProps {
  type: string;
  className: string;
}

export function SourceClassEditor({ type, className }: SourceClassEditorProps) {
  const [editableClassCode, setEditableClassCode] = useState('');
  const [classCodeError, setClassCodeError] = useState<string | null>(null);
  const [classCodeLoading, setClassCodeLoading] = useState(false);
  const [classCodeActionLoading, setClassCodeActionLoading] = useState(false);
  const [classCodeSaveLoading, setClassCodeSaveLoading] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [classCodeHistory, setClassCodeHistory] = useState<string[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isCommentInputVisible, setIsCommentInputVisible] = useState(false);
  const [commentInputValue, setCommentInputValue] = useState('');
  const [commentInsertLine, setCommentInsertLine] = useState<number>(0);
  const [commentReplaceLine, setCommentReplaceLine] = useState<number | null>(null);
  const [isEditingExistingComment, setIsEditingExistingComment] = useState(false);
  const commentInputRef = useRef<HTMLInputElement | null>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement | null>(null);
  const codeContainerRef = useRef<HTMLDivElement | null>(null);
  const [isCodeFullscreen, setIsCodeFullscreen] = useState(false);

  const relativePath = useMemo(() => `${type}/${className}.ts`, [type, className]);
  const displayPath = useMemo(
    () => `TeyvatCard/src/models/cards/${type}/${className}.ts`,
    [type, className]
  );

  useEffect(() => {
    if (!className || !type) return;
    setClassCodeLoading(true);
    setClassCodeError(null);
    setEditableClassCode('');
    setClassCodeHistory([]);
    setIsCommentInputVisible(false);
    setCommentInputValue('');
    setCommentReplaceLine(null);
    setIsEditingExistingComment(false);
    const loadClassCode = async () => {
      try {
        const data = await filesService.getCardClassSource(relativePath, className);
        setEditableClassCode(data.sourceText);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Không đọc được source class từ server';
        setClassCodeError(message);
      } finally {
        setClassCodeLoading(false);
      }
    };
    loadClassCode();
  }, [relativePath, className, type]);

  const insertCommentAtLine = (lineIndex: number) => {
    const lines = editableClassCode.split('\n');
    const selectedLine = lines[lineIndex] ?? '';
    const trimmed = selectedLine.trim();
    const isCommentLine =
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*') ||
      trimmed.endsWith('*/');
    const initialValue = isCommentLine ? selectedLine : '';
    setClassCodeError(null);
    setCommentInsertLine(lineIndex);
    setCommentReplaceLine(isCommentLine ? lineIndex : null);
    setIsEditingExistingComment(isCommentLine);
    setCommentInputValue(initialValue);
    setIsCommentInputVisible(true);
  };

  const applyNewComment = () => {
    const rawValue = commentInputValue.replace(/\\t/g, '\t');
    if (!rawValue.trim()) return;
    const leadingWhitespace = rawValue.match(/^[\t ]*/)?.[0] ?? '';
    const body = rawValue.slice(leadingWhitespace.length);
    if (!body.trim()) return;
    const commentText = body.trimEnd();
    setClassCodeHistory((prev) => [...prev, editableClassCode]);
    const lines = editableClassCode.split('\n');
    const insertAt = Math.max(0, Math.min(commentInsertLine, lines.length));
    lines.splice(insertAt, 0, `${leadingWhitespace}/*${commentText}*/`);
    setEditableClassCode(lines.join('\n'));
    setCommentInputValue('');
    setCommentReplaceLine(null);
    setIsEditingExistingComment(false);
    setIsCommentInputVisible(false);
  };

  const applyExistingCommentEdit = () => {
    const rawValue = commentInputValue.replace(/\\t/g, '\t');
    if (commentReplaceLine === null || rawValue.length === 0) return;
    setClassCodeHistory((prev) => [...prev, editableClassCode]);
    const lines = editableClassCode.split('\n');
    if (commentReplaceLine >= 0 && commentReplaceLine < lines.length) {
      lines[commentReplaceLine] = rawValue;
    }
    setEditableClassCode(lines.join('\n'));
    setCommentInputValue('');
    setCommentReplaceLine(null);
    setIsEditingExistingComment(false);
    setIsCommentInputVisible(false);
  };

  const applyInlineComment = () => {
    if (isEditingExistingComment) {
      applyExistingCommentEdit();
      return;
    }
    applyNewComment();
  };

  const undoClassCodeChange = () => {
    setClassCodeHistory((prev) => {
      if (prev.length === 0) return prev;
      const nextHistory = [...prev];
      const lastValue = nextHistory.pop();
      if (typeof lastValue === 'string') setEditableClassCode(lastValue);
      return nextHistory;
    });
  };

  const generateTsDoc = async () => {
    if (!className || !type) return;
    setClassCodeActionLoading(true);
    setClassCodeError(null);
    try {
      const data = await filesService.buildCardClassTsDoc(relativePath, className);
      setEditableClassCode(data.sourceText);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Không tạo được TSDoc bằng ts-morph';
      setClassCodeError(message);
    } finally {
      setClassCodeActionLoading(false);
    }
  };

  const saveClassSource = async () => {
    setClassCodeSaveLoading(true);
    setClassCodeError(null);
    try {
      const data = await filesService.saveCardClassSource(relativePath, editableClassCode, className);
      setEditableClassCode(data.sourceText);
      setClassCodeHistory([]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Không lưu được source xuống file .ts';
      setClassCodeError(message);
    } finally {
      setClassCodeSaveLoading(false);
      setSaveConfirmOpen(false);
    }
  };

  const copyClassCode = async () => {
    if (!editableClassCode) return;
    try {
      await navigator.clipboard.writeText(editableClassCode);
      setCopySuccess(true);
    } catch {
      setClassCodeError('Không copy được code vào clipboard');
      setCopySuccess(false);
    }
  };

  const toggleCodeFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await fullscreenContainerRef.current?.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      setClassCodeError('Không chuyển được chế độ toàn màn hình');
    }
  };

  useEffect(() => {
    if (!copySuccess) return;
    const timer = window.setTimeout(() => setCopySuccess(false), 1000);
    return () => window.clearTimeout(timer);
  }, [copySuccess]);

  useEffect(() => {
    const onFullscreenChange = () => setIsCodeFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isUndo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z';
      if (!isUndo) return;
      event.preventDefault();
      undoClassCodeChange();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [classCodeHistory, editableClassCode]);

  useEffect(() => {
    if (!isCommentInputVisible) return;
    const raf1 = window.requestAnimationFrame(() => {
      commentInputRef.current?.focus();
      const len = commentInputRef.current?.value.length ?? 0;
      commentInputRef.current?.setSelectionRange(len, len);
    });
    const raf2 = window.requestAnimationFrame(() => commentInputRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [isCommentInputVisible]);

  return (
    <div ref={fullscreenContainerRef} className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <FontAwesomeIcon icon={faFolderOpen} className="text-sky-500" />
        <a
          href="#"
          className="font-mono text-sky-400 hover:text-sky-300 hover:underline"
          onClick={(e) => e.preventDefault()}
        >
          {displayPath}
        </a>
      </div>
      {classCodeLoading && <p className="text-sm text-slate-500">Đang tải source class...</p>}
      {classCodeError && <p className="text-sm text-red-600">{classCodeError}</p>}
      {!classCodeLoading && !classCodeError && editableClassCode && (
        <div
          ref={codeContainerRef}
          className={`relative rounded-lg border border-slate-700 bg-[#0f172a] ${
            isCodeFullscreen
              ? 'h-screen max-h-screen overflow-auto'
              : 'max-h-[500px] overflow-y-auto overflow-x-hidden'
          }`}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700 bg-[#0f172a]/95 p-2">
            <Button
              onClick={generateTsDoc}
              className="bg-violet-700 hover:bg-violet-800 text-white"
              disabled={classCodeLoading || classCodeActionLoading || classCodeSaveLoading}
            >
              {classCodeActionLoading ? 'Đang tạo...' : 'Tạo TSDoc'}
            </Button>
            <div className="flex items-center gap-2">
              <Button
                onClick={toggleCodeFullscreen}
                className="bg-zinc-600 hover:bg-zinc-700 text-white"
                title={isCodeFullscreen ? 'Thoát toàn màn hình' : 'Mở toàn màn hình'}
                disabled={classCodeSaveLoading || classCodeActionLoading}
              >
                <FontAwesomeIcon icon={isCodeFullscreen ? faCompress : faExpand} />
              </Button>
              <Button
                onClick={copyClassCode}
                className="bg-sky-600 hover:bg-sky-700 text-white"
                title={copySuccess ? 'Đã copy' : 'Copy code'}
                disabled={!editableClassCode || classCodeSaveLoading || classCodeActionLoading}
              >
                <FontAwesomeIcon icon={copySuccess ? faCheck : faCopy} />
              </Button>
              <Button
                onClick={undoClassCodeChange}
                className="bg-slate-600 hover:bg-slate-700 text-white"
                title="Undo"
                disabled={classCodeHistory.length === 0 || classCodeSaveLoading || classCodeActionLoading}
              >
                <FontAwesomeIcon icon={faRotateLeft} />
              </Button>
              <Button
                onClick={() => setSaveConfirmOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                title="Lưu .ts"
                disabled={classCodeSaveLoading || classCodeActionLoading}
              >
                <FontAwesomeIcon icon={faFloppyDisk} />
              </Button>
            </div>
          </div>
          <Highlight theme={themes.vsDark} code={editableClassCode} language="tsx">
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
              <pre className={className} style={{ ...style, margin: 0, padding: '1rem' }}>
                {tokens.map((line, i) => (
                  <div key={i}>
                    {isCommentInputVisible && commentInsertLine === i && (
                      <div className="flex items-center bg-[#0f172a]">
                        <input
                          ref={commentInputRef}
                          autoFocus
                          value={commentInputValue}
                          onChange={(e) => setCommentInputValue(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              applyInlineComment();
                            }
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              setIsCommentInputVisible(false);
                              setCommentInputValue('');
                              setCommentReplaceLine(null);
                              setIsEditingExistingComment(false);
                            }
                            if (e.key === 'Tab') {
                              e.preventDefault();
                              const input = e.currentTarget;
                              const start = input.selectionStart ?? commentInputValue.length;
                              const end = input.selectionEnd ?? commentInputValue.length;
                              const nextValue =
                                commentInputValue.slice(0, start) + '\\t' + commentInputValue.slice(end);
                              setCommentInputValue(nextValue);
                              requestAnimationFrame(() => {
                                input.selectionStart = input.selectionEnd = start + 2;
                              });
                            }
                          }}
                          placeholder="/* nhập comment */"
                          className="w-full bg-[#0f172a] px-0 py-0.5 font-mono text-base text-[#8aa549] outline-none border-none shadow-none"
                        />
                      </div>
                    )}
                    {!(isCommentInputVisible && isEditingExistingComment && commentReplaceLine === i) && (
                      <div
                        {...getLineProps({ line })}
                        onClick={() => insertCommentAtLine(i)}
                        className="cursor-pointer hover:bg-slate-800/70"
                        title="Click để nhập và chèn comment trước dòng này"
                      >
                        {line.map((token, key) => (
                          <span key={key} {...getTokenProps({ token })} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {isCommentInputVisible && commentInsertLine >= tokens.length && (
                  <div className="flex items-center bg-[#0f172a]">
                    <input
                      ref={commentInputRef}
                      autoFocus
                      value={commentInputValue}
                      onChange={(e) => setCommentInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          applyInlineComment();
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          setIsCommentInputVisible(false);
                          setCommentInputValue('');
                          setCommentReplaceLine(null);
                          setIsEditingExistingComment(false);
                        }
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          const input = e.currentTarget;
                          const start = input.selectionStart ?? commentInputValue.length;
                          const end = input.selectionEnd ?? commentInputValue.length;
                          const nextValue =
                            commentInputValue.slice(0, start) + '\\t' + commentInputValue.slice(end);
                          setCommentInputValue(nextValue);
                          requestAnimationFrame(() => {
                            input.selectionStart = input.selectionEnd = start + 2;
                          });
                        }
                      }}
                      placeholder="/* nhập comment */"
                      className="w-full bg-[#0f172a] px-0 py-0.5 font-mono text-base text-[#8aa549] outline-none border-none shadow-none"
                    />
                  </div>
                )}
              </pre>
            )}
          </Highlight>
        </div>
      )}

      <AnimatePresence>
        {saveConfirmOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            variants={fadeInOverlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setSaveConfirmOpen(false)}
          >
            <motion.div
              className="w-full max-w-lg rounded-xl border border-slate-700 bg-[#111827] p-5 shadow-2xl"
              variants={scaleInModal}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white">Xác nhận lưu file .ts</h3>
              <p className="mt-2 text-sm text-slate-300 break-all">
                Bạn sắp ghi đè file:
                <br />
                <span className="font-mono text-sky-300">{displayPath}</span>
              </p>
              <p className="mt-2 text-xs text-amber-300">
                Thao tác này sẽ lưu vĩnh viễn nội dung code hiện tại.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <Button
                  onClick={() => setSaveConfirmOpen(false)}
                  className="bg-slate-600 hover:bg-slate-700 text-white"
                  disabled={classCodeSaveLoading}
                >
                  Hủy
                </Button>
                <Button
                  onClick={saveClassSource}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={classCodeSaveLoading}
                >
                  {classCodeSaveLoading ? 'Đang lưu...' : 'Xác nhận lưu'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

