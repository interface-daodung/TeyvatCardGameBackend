import { motion } from 'framer-motion';
import { PageHeader } from '../components/PageHeader';
import { LangDropdown } from '../components/LangDropdown';
import { EquipmentLoading } from '../components/equipment/EquipmentLoading';
import { EquipmentItemCard } from '../components/equipment/EquipmentItemCard';
import { EquipmentEditModal } from '../components/equipment/EquipmentEditModal';
import { useEquipment } from '../components/equipment/useEquipment';
import { fadeSlideCard, slideUpItem } from '../components/animations/motionPresets';

export { type GameItem, type LevelStat } from '../components/equipment/equipmentUtils';

export default function Equipment() {
  const eq = useEquipment();

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Equipment"
          description="Xem và quản lý các item trong game (đọc từ DB)"
        />
        <LangDropdown
          value={eq.editLang}
          onChange={eq.setEditLang}
          open={eq.langDropdownOpen}
          onOpenChange={eq.setLangDropdownOpen}
        />
      </div>

      {eq.error && (
        <motion.div
          className="rounded-lg bg-destructive/10 text-destructive px-4 py-2 text-sm"
          variants={fadeSlideCard}
          initial="hidden"
          animate="visible"
        >
          {eq.error}
        </motion.div>
      )}

      {eq.loading ? (
        <EquipmentLoading />
      ) : (
        <motion.div
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2"
          variants={fadeSlideCard}
          initial="hidden"
          animate="visible"
        >
          {eq.items.map((item, index) => (
            <motion.div key={item.nameId} variants={slideUpItem} initial="hidden" animate="visible" custom={index}>
              <EquipmentItemCard
                item={item}
                editLang={eq.editLang}
                getItemDisplayName={eq.getItemDisplayName}
                getItemDisplayDescription={eq.getItemDisplayDescription}
                onClick={() => eq.openEditModal(item)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {eq.editModalOpen && eq.selectedItem && (
        <EquipmentEditModal
          selectedItem={eq.selectedItem}
          formValues={eq.formValues}
          setFormValues={eq.setFormValues}
          editLang={eq.editLang}
          editingField={eq.editingField}
          setEditingField={eq.setEditingField}
          i18nPopupField={eq.i18nPopupField}
          expandedLevels={eq.expandedLevels}
          formLevelMax={eq.formLevelMax}
          formLevelStats={eq.formLevelStats}
          saveLoading={eq.saveLoading}
          getItemDisplayName={eq.getItemDisplayName}
          getDisplayName={eq.getDisplayName}
          getDisplayDescription={eq.getDisplayDescription}
          getFormI18n={eq.getFormI18n}
          setFormI18n={eq.setFormI18n}
          translateLoading={eq.translateLoading}
          i18nError={eq.i18nError}
          error={eq.error}
          onClose={eq.closeEditModal}
          onSave={eq.handleSave}
          onOpenI18nPopup={eq.openI18nPopup}
          onCloseI18nPopup={eq.closeI18nPopup}
          onLevelMaxChange={eq.handleLevelMaxChange}
          onToggleLevelExpanded={eq.toggleLevelExpanded}
          onUpdateLevelStat={eq.updateLevelStat}
          onLevelSave={eq.handleLevelSave}
          onI18nTranslate={eq.handleI18nTranslate}
          onI18nSave={eq.handleI18nSave}
        />
      )}
    </div>
  );
}
