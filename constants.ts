
import { Key } from './types';

export const CHROMATIC_SCALE: Key[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const ENHARMONIC_MAP: Record<string, Key> = {
  'Db': 'C#',
  'Eb': 'D#',
  'Gb': 'F#',
  'Ab': 'G#',
  'Bb': 'A#',
};

export const ALL_KEYS: Key[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const NASHVILLE_NUMBERS = ['1', '2', '3', '4', '5', '6', '7'];

export const SAMPLE_SONGS = [
  {
    id: '1',
    title: 'Amazing Grace',
    artist: 'John Newton',
    originalKey: 'G' as Key,
    content: 'G           C      G\nAmazing grace! how sweet the sound,\n           G             D7\nThat saved a wretch like me!\n  G               C      G\nI once was lost, but now am found,\n     G      D7      G\nWas blind, but now I see.',
    createdAt: Date.now()
  }
];
