import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSquarePen } from '@fortawesome/free-solid-svg-icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ElementReactionPicker } from './ElementReactionPicker';
import { HP_MAX, HP_MIN } from './characterDetailUtils';
import type { EditingField } from './characterDetailUtils';
import { StatusCyclePillButton, characterStatusPillClass, type CharacterStatus } from '../share';
import { cn } from '../../lib/utils';

type I18nField = 'name' | 'description';

const CHARACTER_STATUSES = ['enabled', 'disabled'] as const satisfies readonly CharacterStatus[];

interface CharacterDetailInfoProps {
  effectiveElement: string;
  displayName: string;
  displayHp: number;
  displayLevel: number;
  displayDescription: string;
  characterStatus: CharacterStatus;
  statusSaveLoading?: boolean;
  onSetCharacterStatus: (status: CharacterStatus) => void;
  editingField: EditingField;
  onOpenI18n: (field: I18nField) => void;
  onStartEdit: (field: EditingField) => void;
  onSetDisplayElementAndPersist: (el: string) => void;
  onOpenLevelEdit: () => void;
  onCommitHp: (value: number) => Promise<boolean>;
}

export function CharacterDetailInfo({
  effectiveElement,
  displayName,
  displayHp,
  displayLevel,
  displayDescription,
  characterStatus,
  statusSaveLoading,
  onSetCharacterStatus,
  editingField,
  onOpenI18n,
  onStartEdit,
  onSetDisplayElementAndPersist,
  onOpenLevelEdit,
  onCommitHp,
}: CharacterDetailInfoProps) {
  const [hpEditing, setHpEditing] = useState(false);
  const [hpDraft, setHpDraft] = useState(String(displayHp));
  const [hpError, setHpError] = useState<string | null>(null);

  useEffect(() => {
    setHpDraft(String(displayHp));
  }, [displayHp]);

  useEffect(() => {
    if (!hpError) return;
    const id = window.setTimeout(() => setHpError(null), 5000);
    return () => clearTimeout(id);
  }, [hpError]);

  const normalizeHpDigits = (raw: string) => raw.replace(/\D/g, '');

  const hpInvalidMsg = `HP only accepts integers from ${HP_MIN} to ${HP_MAX}.`;
  const hpSaveFailMsg = 'Cannot save. Check connection or try again.';

  const commitHpDraft = async () => {
    const t = hpDraft.trim();
    if (t === '') {
      setHpError(null);
      setHpDraft(String(displayHp));
      setHpEditing(false);
      return;
    }
    const n = parseInt(t, 10);
    if (!Number.isInteger(n) || n < HP_MIN || n > HP_MAX) {
      setHpError(hpInvalidMsg);
      setHpDraft(String(displayHp));
      return;
    }
    if (n === displayHp) {
      setHpError(null);
      setHpDraft(String(n));
      setHpEditing(false);
      return;
    }
    const ok = await onCommitHp(n);
    if (ok) {
      setHpError(null);
      setHpEditing(false);
    } else {
      setHpError(hpSaveFailMsg);
      setHpDraft(String(displayHp));
    }
  };

  return (
    <div className="flex flex-col">
      <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        Details
      </h2>
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <button
            type="button"
            onClick={() => onOpenI18n('name')}
            className="flex items-start gap-2 group/name w-full text-left rounded-md -m-1 p-1 hover:bg-gray-50 transition-colors cursor-pointer"
            aria-label="Edit name i18n"
          >
            <CardTitle className="text-2xl text-gray-700 flex-1">{displayName}</CardTitle>
            <span className="text-muted-foreground hover:text-foreground flex-shrink-0 opacity-0 group-hover/name:opacity-60 transition-opacity">
              <FontAwesomeIcon icon={faSquarePen} className="w-3.5 h-3.5" />
            </span>
          </button>
          <button
            type="button"
            onClick={() => onOpenI18n('description')}
            className="flex items-start gap-2 mt-2 group/desc w-full text-left rounded-md -m-1 p-1 hover:bg-gray-50 transition-colors cursor-pointer"
            aria-label="Edit description i18n"
          >
            <CardDescription className="text-base flex-1">{displayDescription}</CardDescription>
            <span className="text-muted-foreground hover:text-foreground flex-shrink-0 opacity-0 group-hover/desc:opacity-60 transition-opacity">
              <FontAwesomeIcon icon={faSquarePen} className="w-3.5 h-3.5" />
            </span>
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={cn(
              'flex flex-col gap-1.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between',
              statusSaveLoading && 'opacity-60'
            )}
          >
            <span className="text-xs font-medium text-muted-foreground">status</span>
            <div className={cn(statusSaveLoading && 'pointer-events-none')}>
              <StatusCyclePillButton
                value={characterStatus}
                options={CHARACTER_STATUSES}
                onChange={onSetCharacterStatus}
                getPillClassName={characterStatusPillClass}
                aria-label="status"
              />
            </div>
          </div>
          {hpEditing ? (
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="shrink-0 font-medium text-muted-foreground">❤️ HP</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-label="HP"
                  aria-invalid={hpError ? true : undefined}
                  aria-describedby={hpError ? 'hp-error-tip' : undefined}
                  value={hpDraft}
                  autoFocus
                  onChange={(e) => {
                    setHpError(null);
                    setHpDraft(normalizeHpDigits(e.target.value));
                  }}
                  onBlur={() => void commitHpDraft()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void commitHpDraft();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setHpError(null);
                      setHpDraft(String(displayHp));
                      setHpEditing(false);
                    }
                  }}
                  className={`w-20 max-w-[40%] rounded-md border bg-white px-2 py-1 text-right text-sm font-bold text-gray-600 tabular-nums focus:outline-none focus:ring-1 ${
                    hpError
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-300'
                      : 'border-gray-300 focus:border-blue-400 focus:ring-blue-300'
                  }`}
                />
              </div>
              {hpError && (
                <p
                  id="hp-error-tip"
                  role="alert"
                  className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700"
                >
                  {hpError}
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setHpError(null);
                setHpDraft(String(displayHp));
                setHpEditing(true);
              }}
              className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100"
            >
              <span className="font-medium text-muted-foreground flex items-center gap-2">
                ❤️ HP
                <FontAwesomeIcon
                  icon={faSquarePen}
                  className="w-3.5 h-3.5 opacity-0 transition-opacity group-hover:opacity-60"
                />
              </span>
              <span className="font-bold text-gray-600 tabular-nums">{displayHp}</span>
            </button>
          )}
          {editingField === 'element' ? (
            <div className="flex flex-col gap-3 rounded-lg bg-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => onStartEdit(null)}
                className="group flex shrink-0 items-center gap-2 text-left font-medium text-muted-foreground hover:text-foreground"
              >
                ⚡ Element
                <FontAwesomeIcon
                  icon={faSquarePen}
                  className="w-3.5 h-3.5 opacity-60 transition-opacity group-hover:opacity-100"
                />
              </button>
              <div
                className="min-w-0 w-full flex justify-center sm:w-auto sm:justify-end sm:pl-2"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <ElementReactionPicker
                  selectedElement={effectiveElement}
                  onSelect={onSetDisplayElementAndPersist}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-100 p-3">
              <button
                type="button"
                onClick={() => onStartEdit('element')}
                className="group flex min-w-0 flex-1 items-center gap-2 text-left font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                ⚡ Element
                <FontAwesomeIcon
                  icon={faSquarePen}
                  className="w-3.5 h-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60"
                />
              </button>
              <div
                className="min-w-0 shrink-0 flex justify-end pl-2"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <ElementReactionPicker
                  selectedElement={effectiveElement}
                  onSelect={onSetDisplayElementAndPersist}
                />
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onOpenLevelEdit}
            className="group flex w-full cursor-pointer items-center justify-between rounded-lg bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100"
          >
            <span className="font-medium text-muted-foreground flex items-center gap-2">
              ⭐ Level
              <FontAwesomeIcon
                icon={faSquarePen}
                className="w-3.5 h-3.5 opacity-0 transition-opacity group-hover:opacity-60"
              />
            </span>
            <span className="font-bold text-gray-600 tabular-nums">{displayLevel}</span>
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
