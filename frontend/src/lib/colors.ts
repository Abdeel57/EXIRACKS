import type { CSSProperties } from 'react';

// Mapa de nombre de color (catálogo) -> color CSS para los swatches.
export const COLOR_HEX: Record<string, string> = {
  negro: '#1a1a1a',
  blanco: '#f5f5f5',
  crema: '#efe7d6',
  dorado: '#c9a24b',
  oro: '#c9a24b',
  plata: '#cfcfcf',
  cromo: '#d8dadc',
  gris: '#9aa0a6',
  azul: '#2748a8',
  rojo: '#b4332a',
  rosa: '#e6a6b5',
  piel: '#e7c4a0',
  arena: '#d9c19a',
  madera: '#9c6b3f',
  vino: '#5e1f2b',
  menta: '#bfe3cf',
  beige: '#d8c7af',
  'mármol': '#e9e6e1',
  multicolor: 'conic-gradient(from 0deg, #b4332a, #c9a24b, #2748a8, #b4332a)',
};

export function colorStyle(name: string): React.CSSProperties {
  const v = COLOR_HEX[name.toLowerCase()] || '#888';
  return v.startsWith('conic') ? { backgroundImage: v } : { backgroundColor: v };
}
