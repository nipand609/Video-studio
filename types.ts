
export enum Genre {
  REALISTIC = 'Realistic (สมจริง)',
  PIXAR_3D = '3D Pixar / Disney (3D การ์ตูน)',
  ACTION = 'Action (บู๊ล้างผลาญ)',
  HORROR = 'Horror (สยองขวัญ)',
  SCIFI_FANTASY = 'Sci-Fi / Fantasy (ไซไฟ/แฟนตาซี)',
  MUSICAL = 'Musical (มิวสิคัล)'
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  ELDERLY = 'Elderly (คนแก่)',
  CHILD = 'Child (เด็ก)'
}

export enum ThaiAccent {
  BANGKOK = 'ภาษากลาง (สำเนียงกรุงเทพ)',
  ISAN = 'ภาษากลาง (สำเนียงอีสาน)',
  NORTHERN = 'ภาษากลาง (สำเนียงคำเมือง)',
  SOUTHERN = 'ภาษากลาง (สำเนียงปักษ์ใต้)'
}

export enum Language {
  BILINGUAL = 'Bilingual (ไทย + English)',
  THAI = 'Thai',
  ENGLISH = 'English'
}

export interface Asset {
  id: string;
  name: string;
  type: 'character' | 'product';
  imageData: string; // base64
  description: string;
  voiceProfile?: Gender;
}

export interface Scene {
  id: string;
  number: number;
  imageUrl?: string;
  scriptThai: string;
  scriptEnglish: string;
  headlineThai?: string; 
  veoPrompt: string;
  sfx: string;
  integratedMarkdown: string; 
  status: 'pending' | 'generating' | 'completed' | 'error';
}

export interface ProjectResult {
  scenes: Scene[];
  audioUrl?: string;
  voiceStyleSuggestions?: string[];
  status: 'idle' | 'storyboarding' | 'generating_scenes' | 'completed' | 'error';
  errorMessage?: string;
}