/** Trạng thái item (DB) — chỉ enabled / disabled */
export type EnabledDisabledStatus = 'enabled' | 'disabled';

export function enabledDisabledStatusPillClass(status: EnabledDisabledStatus): string {
  return status === 'enabled'
    ? 'bg-emerald-500 text-emerald-50 hover:bg-emerald-600'
    : 'bg-red-500 text-red-50 hover:bg-red-600';
}

/** Adventure card: chỉ enabled / disabled */
export function adventureCardStatusPillClass(status: EnabledDisabledStatus): string {
  return enabledDisabledStatusPillClass(status);
}

/** Character (DB): chỉ enabled (xanh) / disabled (đỏ) — chỉ `enabled` mới đưa vào JSON client */
export type CharacterStatus = EnabledDisabledStatus;

export function characterStatusPillClass(status: CharacterStatus): string {
  return enabledDisabledStatusPillClass(status);
}
