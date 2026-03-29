/** Trạng thái item (DB) — chỉ enabled / disabled */
export type EnabledDisabledStatus = 'enabled' | 'disabled';

export function enabledDisabledStatusPillClass(status: EnabledDisabledStatus): string {
  return status === 'enabled'
    ? 'bg-emerald-500 text-emerald-50 hover:bg-emerald-600'
    : 'bg-red-500 text-red-50 hover:bg-red-600';
}

/** Adventure card: enabled / disabled / hidden */
export function adventureCardStatusPillClass(
  status: 'enabled' | 'disabled' | 'hidden'
): string {
  if (status === 'enabled') {
    return 'bg-emerald-500 text-emerald-50 hover:bg-emerald-600';
  }
  if (status === 'hidden') {
    return 'bg-slate-600 text-slate-50 hover:bg-slate-700';
  }
  return 'bg-red-500 text-red-50 hover:bg-red-600';
}

/** Character (DB): chỉ enabled (xanh) / disabled (đỏ) — chỉ `enabled` mới đưa vào JSON client */
export type CharacterStatus = EnabledDisabledStatus;

export function characterStatusPillClass(status: CharacterStatus): string {
  return enabledDisabledStatusPillClass(status);
}
