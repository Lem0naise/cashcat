import { ImportPreset } from './types';
import { nationwidePreset } from './nationwide';
import { trading212Preset } from './trading212';
import { ynabPreset } from './ynab';

export const importPresets: ImportPreset[] = [
    nationwidePreset,
    trading212Preset,
    ynabPreset,
];

export function getPresetByName(name: string): ImportPreset | undefined {
    return importPresets.find(preset => preset.name === name);
}

export * from './types';
export { nationwidePreset, trading212Preset, ynabPreset };
