export const MAX_LAYOUT_LAYER = 10;

export interface LayoutFieldLike {
  int_layer: number;
}

export const clampLayoutLayer = (layer: number) => {
  if (!Number.isFinite(layer)) {
    return 0;
  }

  return Math.max(0, Math.min(MAX_LAYOUT_LAYER, Math.floor(layer)));
};

export const getNextLayoutLayer = (fields: LayoutFieldLike[]) => {
  const currentMaxLayer = fields.reduce((maxLayer, field) => Math.max(maxLayer, field.int_layer), -1);
  return currentMaxLayer + 1;
};

export const getDefaultLayoutLayer = (selectedField: LayoutFieldLike | null) => {
  return selectedField ? clampLayoutLayer(selectedField.int_layer) : 0;
};