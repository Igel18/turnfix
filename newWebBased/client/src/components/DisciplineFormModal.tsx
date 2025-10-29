import React from 'react';
import { useTranslation } from 'react-i18next';
import { getIconUrl } from '../utils/iconUtils';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface Discipline {
  id: number;
  name: string;
  short_name: string;
  display_name?: string;
  formula?: string;
  input_mask?: string;
  attempts: number;
  icon?: string;
  shortcut?: string;
  calculation_type: number;
  unit?: string;
  lanes_division: boolean;
  male_allowed: boolean;
  female_allowed: boolean;
  sport_id: number;
  formula_id?: number;
  should_calculate: boolean;
  gender_text: string;
  category_id?: number;
  available_from?: string;
  available_to?: string;
  active?: boolean;
}

interface Formula {
  int_formelid: number;
  var_name: string;
  var_formel?: string;
  int_typ?: number;
  discipline_count: number;
}

interface Sport {
  int_sportid: number;
  var_name: string;
  discipline_count: number;
}

interface FormData {
  name: string;
  shortName: string;
  displayName: string;
  formula: string;
  inputMask: string;
  attempts: number;
  icon: string;
  shortcut: string;
  calculationType: number;
  unit: string;
  lanesDivision: boolean;
  maleAllowed: boolean;
  femaleAllowed: boolean;
  sportId: number;
  formulaId: number | undefined;
  shouldCalculate: boolean;
}

interface DisciplineFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingDiscipline: Discipline | null;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onSubmit: (e: React.FormEvent) => void;
  formulas: Formula[];
  sports: Sport[];
}

const DisciplineFormModal: React.FC<DisciplineFormModalProps> = ({
  isOpen,
  onClose,
  editingDiscipline,
  formData,
  setFormData,
  onSubmit,
  formulas,
  sports
}) => {
  const { t } = useTranslation();
  
  // ESC key to close modal
  useEscapeKey(onClose, isOpen);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {editingDiscipline ? t('disciplines.editDiscipline') : t('disciplines.createDiscipline')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Basic Information */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('disciplines.form.basicInformation')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('disciplines.form.name')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('disciplines.form.namePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('disciplines.form.shortName')} *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={formData.shortName}
                    onChange={(e) => setFormData({...formData, shortName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('disciplines.form.shortNamePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('disciplines.form.displayName')}
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    value={formData.displayName}
                    onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('disciplines.form.displayNamePlaceholder')}
                  />
                </div>
              </div>
            </div>

            {/* Calculation Settings */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Calculation & Formula</h3>
              
              {/* Help Text Section */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">{t('disciplines.form.formulaGuide.title')}</h4>
                <div className="text-sm text-blue-800 space-y-2">
                  <p><strong>{t('disciplines.form.formulaGuide.howItWorks').split(':')[0]}:</strong> {t('disciplines.form.formulaGuide.howItWorks').split(':').slice(1).join(':')}</p>
                  
                  <p><strong>{t('disciplines.form.formulaGuide.variableX').split(':')[0]}:</strong> {t('disciplines.form.formulaGuide.variableX').split(':').slice(1).join(':')}</p>
                  
                  <p><strong>{t('disciplines.form.formulaGuide.twoOptions')}</strong></p>
                  <ul className="text-xs ml-4 space-y-1">
                    <li>• <strong>{t('disciplines.form.formulaGuide.customFormulaOption').split(':')[0]}:</strong> {t('disciplines.form.formulaGuide.customFormulaOption').split(':').slice(1).join(':')}</li>
                    <li>• <strong>{t('disciplines.form.formulaGuide.predefinedFormulaOption').split(':')[0]}:</strong> {t('disciplines.form.formulaGuide.predefinedFormulaOption').split(':').slice(1).join(':')}</li>
                    <li>• <strong>{t('disciplines.form.formulaGuide.priority').split(':')[0]}:</strong> {t('disciplines.form.formulaGuide.priority').split(':').slice(1).join(':')}</li>
                  </ul>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <p className="font-medium mb-1">{t('disciplines.form.formulaGuide.supportedFunctions')}</p>
                      <ul className="text-xs space-y-1">
                        <li>• {t('disciplines.form.formulaGuide.basicOps')}</li>
                        <li>• {t('disciplines.form.formulaGuide.mathFunctions')}</li>
                        <li>• {t('disciplines.form.formulaGuide.logarithms')}</li>
                        <li>• {t('disciplines.form.formulaGuide.conditionals')}</li>
                        <li>• {t('disciplines.form.formulaGuide.constants')}</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium mb-1">{t('disciplines.form.formulaGuide.exampleFormulas')}</p>
                      <ul className="text-xs space-y-1">
                        <li>• <code>x</code> - {t('disciplines.form.formulaGuide.exampleDirect')}</li>
                        <li>• <code>x*2</code> - {t('disciplines.form.formulaGuide.exampleDouble')}</li>
                        <li>• <code>20-x</code> - {t('disciplines.form.formulaGuide.exampleGymnastics')}</li>
                        <li>• <code>if(x&gt;0,sqrt(x)*10,0)</code> - {t('disciplines.form.formulaGuide.exampleTrackField')}</li>
                        <li>• <code>sin(x*pi/180)</code> - {t('disciplines.form.formulaGuide.exampleAngle')}</li>
                      </ul>
                    </div>
                  </div>
                  
                  <p className="mt-2"><strong>{t('disciplines.form.formulaGuide.note').split(':')[0]}:</strong> {t('disciplines.form.formulaGuide.note').split(':').slice(1).join(':')}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('disciplines.form.customFormula')}
                    <span className="text-xs text-gray-500 ml-1">({t('disciplines.form.help.mathematicalExpression')})</span>
                  </label>
                  <textarea
                    maxLength={300}
                    rows={3}
                    value={formData.formula}
                    onChange={(e) => setFormData({...formData, formula: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('disciplines.form.customFormulaPlaceholder')}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('disciplines.form.help.customFormulaHelp')}
                    {formData.formulaId ? (
                      <span className="text-orange-600 block mt-1">
                        {t('disciplines.form.help.customFormulaIgnored')}
                      </span>
                    ) : (
                      <span className="text-green-600 block mt-1">
                        {t('disciplines.form.help.customFormulaActive')}
                      </span>
                    )}
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('disciplines.form.calculationType')}
                      <span className="text-xs text-gray-500 ml-1">({t('disciplines.form.help.resultPrecision')})</span>
                    </label>
                    <select
                      value={formData.calculationType}
                      onChange={(e) => setFormData({...formData, calculationType: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={0}>{t('disciplines.form.help.decimals0')}</option>
                      <option value={1}>{t('disciplines.form.help.decimals1')}</option>
                      <option value={2}>{t('disciplines.form.help.decimals2')}</option>
                      <option value={3}>{t('disciplines.form.help.decimals3')}</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('disciplines.form.help.decimalPlaces')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('disciplines.form.formula')}
                      <span className="text-xs text-gray-500 ml-1">({t('disciplines.form.selectFormula')})</span>
                    </label>
                    <select
                      value={formData.formulaId || ''}
                      onChange={(e) => setFormData({...formData, formulaId: e.target.value ? parseInt(e.target.value) : undefined})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t('disciplines.form.help.noPredefinedFormula')}</option>
                      {Array.isArray(formulas) && formulas.map(formula => (
                        <option key={formula.int_formelid} value={formula.int_formelid}>
                          {formula.var_name}
                          {formula.var_formel && (
                            ` - ${formula.var_formel.length > 30 ? formula.var_formel.substring(0, 30) + '...' : formula.var_formel}`
                          )}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('disciplines.form.help.selectPredefinedFormula', { count: formulas.length })}
                      {formData.formulaId && (
                        <>
                          <br />
                          <span className="text-blue-600">
                            {t('disciplines.form.help.usingPredefinedFormula')}
                          </span>
                        </>
                      )}
                      {formulas.length === 0 && (
                        <>
                          <br />
                          <span className="text-orange-600">
                            {t('disciplines.form.help.noFormulasAvailable')}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  
                  {/* Should Calculate Toggle */}
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.shouldCalculate}
                        onChange={(e) => setFormData({...formData, shouldCalculate: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{t('disciplines.form.shouldCalculate')}</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('disciplines.form.help.autoCalculate')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Settings */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('disciplines.form.settings')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('disciplines.form.inputMask')}
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={formData.inputMask}
                    onChange={(e) => setFormData({...formData, inputMask: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('disciplines.form.inputMaskPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('disciplines.form.attempts')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.attempts}
                    onChange={(e) => setFormData({...formData, attempts: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('disciplines.form.unit')}
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('disciplines.form.unitPlaceholder')}
                  />
                </div>
              </div>
            </div>

            {/* Visual & Organization */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('disciplines.form.advanced')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('disciplines.form.icon')}
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      maxLength={20}
                      value={formData.icon}
                      onChange={(e) => setFormData({...formData, icon: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={t('disciplines.form.iconPlaceholder')}
                    />
                    {formData.icon && (
                      <div className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center bg-gray-50">
                        <img 
                          src={getIconUrl(formData.icon) || ''} 
                          alt="Icon preview"
                          className="w-6 h-6 object-contain"
                          onError={(e) => { 
                            e.currentTarget.style.display = 'none';
                            const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                            if (nextElement) nextElement.style.display = 'block';
                          }}
                        />
                        <span className="text-xs text-gray-400 hidden">❌</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('disciplines.form.shortcut')}
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={formData.shortcut}
                    onChange={(e) => setFormData({...formData, shortcut: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('disciplines.form.shortcutPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('disciplines.form.sport')} *
                  </label>
                  <select
                    required
                    value={formData.sportId}
                    onChange={(e) => setFormData({...formData, sportId: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>Select Sport</option>
                    {Array.isArray(sports) && sports.map(sport => (
                      <option key={sport.int_sportid} value={sport.int_sportid}>
                        {sport.var_name} ({sport.discipline_count} disciplines)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Gender & Configuration */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('disciplines.form.gender')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.maleAllowed}
                        onChange={(e) => setFormData({...formData, maleAllowed: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{t('disciplines.form.maleAllowed')}</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.femaleAllowed}
                        onChange={(e) => setFormData({...formData, femaleAllowed: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{t('disciplines.form.femaleAllowed')}</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.lanesDivision}
                      onChange={(e) => setFormData({...formData, lanesDivision: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{t('disciplines.form.lanesDivision')}</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Enable if this discipline uses lane-based competition format.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {t('disciplines.form.cancel')}
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {t('disciplines.form.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DisciplineFormModal;
