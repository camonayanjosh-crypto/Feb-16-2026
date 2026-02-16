
import { CHROMATIC_SCALE, ENHARMONIC_MAP } from '../constants';
import { Key } from '../types';

const chordRegex = /^[A-G](?:#|b)?(?:maj|min|m|sus|aug|dim|add)?[0-9]*(?:(?:#|b)[0-9]+)*(?:\/[A-G](?:#|b)?)?$/;

export function isChordLine(line: string): boolean {
  const parts = line.trim().split(/\s+/);
  if (parts.length === 0 || line.trim() === '') return false;
  
  // A line is likely a chord line if most parts match chord patterns
  const chordCount = parts.filter(p => {
    // Basic chord detection
    return /^[A-G][#b]?(m|maj|min|sus|dim|aug|add|7|9|11|13)*(\/[A-G][#b]?)?$/.test(p);
  }).length;

  return chordCount / parts.length > 0.5;
}

export function normalizeKey(key: string): Key {
  return (ENHARMONIC_MAP[key] || key) as Key;
}

export function transposeChord(chord: string, fromKey: Key, toKey: Key, useNashville: boolean = false): string {
  const normalizedFrom = normalizeKey(fromKey);
  const normalizedTo = normalizeKey(toKey);
  
  const fromIndex = CHROMATIC_SCALE.indexOf(normalizedFrom);
  const toIndex = CHROMATIC_SCALE.indexOf(normalizedTo);
  const diff = (toIndex - fromIndex + 12) % 12;

  // Split slash chords (e.g., C/E)
  const parts = chord.split('/');
  
  const transposedParts = parts.map(part => {
    const match = part.match(/^([A-G][#b]?)(.*)$/);
    if (!match) return part;
    
    const root = match[1];
    const suffix = match[2];
    
    const rootNormalized = normalizeKey(root);
    const rootIndex = CHROMATIC_SCALE.indexOf(rootNormalized);
    
    if (rootIndex === -1) return part;

    if (useNashville) {
      const interval = (rootIndex - fromIndex + 12) % 12;
      // Map semitone interval to major scale degree (simplified)
      const degreeMap: Record<number, string> = {
        0: '1', 1: 'b2', 2: '2', 3: 'b3', 4: '3', 5: '4', 
        6: 'b5', 7: '5', 8: 'b6', 9: '6', 10: 'b7', 11: '7'
      };
      return degreeMap[interval] + suffix;
    }

    const newRootIndex = (rootIndex + diff) % 12;
    return CHROMATIC_SCALE[newRootIndex] + suffix;
  });

  return transposedParts.join('/');
}

export function getTransposedContent(content: string, fromKey: Key, toKey: Key, useNashville: boolean = false): string {
  const lines = content.split('\n');
  return lines.map(line => {
    if (!isChordLine(line)) return line;

    // Use regex to find chords while preserving spacing
    return line.replace(/([A-G][#b]?[^ \n\t]*)/g, (match) => {
      // Basic check if it's likely a chord (to avoid false positives in mixed lines)
      if (/^[A-G][#b]?(m|maj|min|sus|dim|aug|add|7|9|11|13)*(\/[A-G][#b]?)?$/.test(match)) {
        return transposeChord(match, fromKey, toKey, useNashville);
      }
      return match;
    });
  }).join('\n');
}
