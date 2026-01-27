import React from 'react';
import { useTranslation } from 'react-i18next';
import UnifiedModal from './UnifiedModal';

interface Formula {
  int_formelid: number;
  var_name: string;
  var_formel?: string;
  int_typ?: number;
  discipline_count?: number;
}

interface FormData {
  var_name: string;
  var_formel: string;
  int_typ: number;
}

interface FormulaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingFormula: Formula | null;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

const FormulaFormModal: React.FC<FormulaFormModalProps> = ({
  isOpen,
  onClose,
  editingFormula,
  formData,
  setFormData,
  onSubmit,
  isSubmitting
}) => {
  const { t } = useTranslation();
  
  const getFormulaTypeLabel = (type: number) => {
    return t(`formulas.types.type${type}`, `Type ${type}`);
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={editingFormula ? t('formulas.editFormula', 'Edit Formula') : t('formulas.createFormula', 'Create New Formula')}
      size="md"
      showFooter={false}
    >
      <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('formulas.fields.name', 'Formula Name')} *
              </label>
              <input
                type="text"
                value={formData.var_name}
                onChange={(e) => setFormData(prev => ({ ...prev, var_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={t('formulas.fields.namePlaceholder', 'Enter formula name')}
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('formulas.fields.code', 'Formula Code')}
              </label>
              <textarea
                value={formData.var_formel}
                onChange={(e) => setFormData(prev => ({ ...prev, var_formel: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
                placeholder={t('formulas.fields.codePlaceholder', 'e.g., (10 + A) - B  or  A + B - C')}
                rows={3}
                disabled={isSubmitting}
              />
              
              {/* Help Box - Formula Syntax */}
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('formulas.help.syntaxTitle', 'Formula Syntax Rules')}
                </h4>
                <ul className="text-xs text-blue-800 space-y-1.5 list-disc list-inside">
                  <li><strong>{t('formulas.help.rule1Title', 'Use only uppercase letters:')}</strong> {t('formulas.help.rule1', 'A, B, C, D, E, ... (single letters only)')}</li>
                  <li><strong>{t('formulas.help.rule2Title', 'Variables map to fields by sort order:')}</strong> {t('formulas.help.rule2', 'A = 1st field, B = 2nd field, C = 3rd field, etc.')}</li>
                  <li><strong>{t('formulas.help.rule3Title', 'DO NOT use field names')}</strong> {t('formulas.help.rule3', 'like "Stufe" or "AbzugAusf." - use letters only')}</li>
                  <li><strong>{t('formulas.help.rule4Title', 'Numbers & Constants:')}</strong> {t('formulas.help.rule4', 'Numbers are allowed in formulas, e.g., (10 + A) - B')}</li>
                  <li><strong>{t('formulas.help.rule5Title', 'Operators:')}</strong> {t('formulas.help.rule5', '+ (add), - (subtract), * (multiply), / (divide), () (parentheses)')}</li>
                  <li><strong>{t('formulas.help.example1Title', 'Example P-Wettkampf:')}</strong> <code className="bg-blue-100 px-1 rounded">(10 + A) - B</code> {t('formulas.help.example1', 'where A=Stufe, B=AbzugAusf.')}</li>
                  <li><strong>{t('formulas.help.example2Title', 'Example LK:')}</strong> <code className="bg-blue-100 px-1 rounded">A + B - C</code> {t('formulas.help.example2', 'where A=D-Note, B=E-Note, C=N-Abzüge')}</li>
                </ul>
                <p className="text-xs text-blue-700 mt-2 italic">
                  {t('formulas.help.warning', '⚠️ The formula does NOT know field names - only letter variables (A, B, C) that are mapped automatically to discipline fields based on their sort order.')}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('formulas.fields.type', 'Type')}
              </label>
              <select
                value={formData.int_typ}
                onChange={(e) => setFormData(prev => ({ ...prev, int_typ: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isSubmitting}
              >
                <option value={0}>{t('formulas.types.type0', 'Standard')}</option>
                <option value={1}>{t('formulas.types.type1', 'Custom')}</option>
                <option value={2}>{t('formulas.types.type2', 'Advanced')}</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                {t('formulas.fields.typeDescription', 'Formula type is used for categorization and filtering. Standard formulas are pre-defined formulas like P-Wettkampf, LK, AK. Custom formulas are user-created variations. Advanced formulas use complex calculations.')}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {t('formulas.fields.typeCurrent', 'Current:')} {getFormulaTypeLabel(formData.int_typ)}
              </p>
            </div>

            {editingFormula && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="text-sm text-blue-800">
                  <p><strong>{t('formulas.fields.id', 'Formula ID:')}</strong> {editingFormula.int_formelid}</p>
                  <p><strong>{t('formulas.fields.usedBy', 'Used by:')}</strong> {editingFormula.discipline_count || 0} {t('formulas.fields.disciplines', 'disciplines')}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                disabled={isSubmitting}
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting 
                  ? t('common.saving', 'Saving...') 
                  : (editingFormula ? t('formulas.updateFormula', 'Update Formula') : t('formulas.createFormula', 'Create Formula'))}
              </button>
            </div>
          </form>
    </UnifiedModal>
  );
};

export default FormulaFormModal;
