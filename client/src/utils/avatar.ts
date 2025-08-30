import { createAvatar } from '@dicebear/core';
import { 
  adventurer, 
  avataaars, 
  bigSmile, 
  bottts, 
  initials, 
  lorelei, 
  micah, 
  personas, 
  shapes 
} from '@dicebear/collection';

// 9 avatar styles to choose from
const avatarStyles = [
  { name: 'adventurer', style: adventurer, label: 'Adventurer' },
  { name: 'avataaars', style: avataaars, label: 'Avataaars' },
  { name: 'bigSmile', style: bigSmile, label: 'Big Smile' },
  { name: 'bottts', style: bottts, label: 'Robots' },
  { name: 'initials', style: initials, label: 'Initials' },
  { name: 'lorelei', style: lorelei, label: 'Lorelei' },
  { name: 'micah', style: micah, label: 'Micah' },
  { name: 'personas', style: personas, label: 'Personas' },
  { name: 'shapes', style: shapes, label: 'Shapes' }
];

export function generateAvatarOptions(userId: string): Array<{ style: string, label: string, svg: string, seed: string }> {
  const baseSeed = userId + Math.random().toString(36).substring(2, 9);
  
  return avatarStyles.map(({ name, style, label }) => {
    const fullSeed = baseSeed + name;
    const avatar = createAvatar(style, {
      seed: fullSeed,
      size: 64
    });
    
    return {
      style: name,
      label,
      svg: avatar.toString(),
      seed: fullSeed
    };
  });
}

export function generateAvatarFromConfig(config: string): string {
  if (!config) return '';
  
  try {
    const { style, seed } = JSON.parse(config);
    const selectedStyle = avatarStyles.find(s => s.name === style)?.style || avataaars;
    
    const avatar = createAvatar(selectedStyle, {
      seed,
      size: 64
    });
    
    return avatar.toString();
  } catch {
    return '';
  }
}

export function createAvatarConfig(style: string, seed: string): string {
  return JSON.stringify({ style, seed });
}