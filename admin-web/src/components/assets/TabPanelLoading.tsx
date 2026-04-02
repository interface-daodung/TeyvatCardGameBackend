import { AssetLoadingOverlay } from './AssetLoadingOverlay';

type TabPanelLoadingProps = {
  show: boolean;
  className?: string;
  label?: string;
};

/** Lớp phủ loading cho nội dung tab (parent cần `relative`). */
export function TabPanelLoading({ show, className, label }: TabPanelLoadingProps) {
  return <AssetLoadingOverlay show={show} label={label} className={className} variant="panel" />;
}
