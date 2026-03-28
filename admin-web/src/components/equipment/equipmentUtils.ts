/**
 * Re-export from .tsx implementation so that resolution to equipmentUtils.ts
 * (e.g. by Vite or tooling that tries .ts before .tsx) still works.
 */
export {
  onlyPositiveInt,
  getDisplayPower,
  getDisplayCooldown,
  renderColoredDescription,
  getItemImageSrcFromDb,
  getDefaultItemImageUrl,
  toGameItem,
  type LevelStat,
  type GameItem,
  type EditingField,
  type I18nPopupField,
} from './equipmentUtils.tsx';
