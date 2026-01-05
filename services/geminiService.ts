
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Genre, Gender, Language, Asset, Scene, ThaiAccent } from "../types";

function pcmToWav(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
  const buffer = new ArrayBuffer(44 + pcmData.length);
  const view = new DataView(buffer);
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 32 + pcmData.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, pcmData.length, true);
  const pcmView = new Uint8Array(buffer, 44);
  pcmView.set(pcmData);
  return new Blob([buffer], { type: 'audio/wav' });
}

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const STYLE_SPECS: Record<Genre, string> = {
  [Genre.REALISTIC]: "Photorealistic, 8k resolution, detailed skin texture, natural cinematic lighting, masterpiece, documentary realism, shot on 35mm lens.",
  [Genre.PIXAR_3D]: "High-end 3D animation style similar to Pixar and Disney, adorable expressive characters, soft rim lighting, vibrant and saturated colors, stylized facial features, high-quality subsurface scattering for skin.",
  [Genre.ACTION]: "High-octane action cinema, dynamic dutch angles, motion blur, flying debris and sparks, cinematic teal and orange color grading, dramatic chiaroscuro lighting, blockbuster aesthetic.",
  [Genre.HORROR]: "Dark and gritty atmospheric horror, high contrast deep shadows, volumetric fog, unsettling compositions, eerie color palette of desaturated blues and sickly greens.",
  [Genre.SCIFI_FANTASY]: "Futuristic technology mixed with magical elements, epic otherworldly landscapes, glowing neon accents, holographic displays, intricate sci-fi or fantasy armor and architecture, imaginative world-building.",
  [Genre.MUSICAL]: "Theatrical stage lighting, vibrant and colorful costumes, joyful expressive poses, spotlight effects, Broadway stage aesthetic, cinematic musical film look with saturated colors and dramatic backlighting."
};

export const generateCharacterImage = async (description: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: `Character/Asset bible entry: ${description}. High quality artistic concept art, clean background.`,
    config: { 
      imageConfig: { aspectRatio: "1:1", imageSize: "1K" } 
    }
  });
  
  if (!response.candidates?.[0]?.content?.parts) throw new Error("Asset generation failed");
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData?.data) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("No image data returned");
};

export const generateStoryboard = async (
  genre: Genre,
  concept: string,
  selectedAssets: Asset[],
  sceneCount: number,
  targetLanguage: Language,
  accent: ThaiAccent,
  userHeadline?: string 
): Promise<{ scenes: Partial<Scene>[], suggestions: string[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const styleInstruction = STYLE_SPECS[genre];
  const langLabel = targetLanguage === Language.ENGLISH ? "ENGLISH" : "THAI";
  
  const headlineInstruction = userHeadline 
    ? `The user has provided a custom headline for Scene 1: "${userHeadline}". Ensure the storyboard for Scene 1 aligns with this title.`
    : `Generate a "headlineThai" for Scene 1 only, which is a creative, catchy, dramatic movie title in Thai text.`;

  // FORCE DIALECT VOCABULARY CHANGE
  const dialectInstruction = `
    CRITICAL DIALECT RULE:
    You are writing for the ${accent} dialect. Do NOT use central Thai words with regional particles. You MUST rewrite the core vocabulary:
    - If ${ThaiAccent.ISAN}: Use words like 'อีหลี', 'สิบ่', 'ข่อย', 'เจ้า', 'มัก', 'แซ่บ', 'เด้อ'.
    - If ${ThaiAccent.NORTHERN}: Use words like 'เจ้า', 'จิ่ม', 'ลำ', 'แต้ๆ', 'กะ', 'ฮัก', 'เฮา'.
    - If ${ThaiAccent.SOUTHERN}: Use words like 'ฉาว', 'หรอย', 'หยบ', 'นุ', 'หลาว', 'ตอเช้า'.
    - If ${ThaiAccent.BANGKOK}: Use standard formal/polite Thai.
    The 'scriptThai' field MUST be written entirely in this specific regional identity.
  `;

  const prompt = `
    Director Mode: Create a cinematic production script for a ${genre} project.
    Concept: "${concept}"
    Accent Chosen: ${accent}
    
    Bible References:
    ${selectedAssets.map(a => `- ${a.type.toUpperCase()}: ${a.name} | ${a.description}`).join('\n')}

    PRODUCTION REQUIREMENTS:
    1. ${headlineInstruction}
    2. ${dialectInstruction}
    3. scriptThai: AUTHENTIC regional dialogue for ${accent}.
    4. scriptEnglish: Professional translation.
    5. veoPrompt: Visual description matching the ${genre} style. No text on screen.

    Return JSON with 'scenes' (array of {number, scriptThai, scriptEnglish, headlineThai, veoPrompt, sfx}) and 'voiceSuggestions' (array of 3 strings).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                number: { type: Type.INTEGER },
                scriptThai: { type: Type.STRING },
                scriptEnglish: { type: Type.STRING },
                headlineThai: { type: Type.STRING },
                veoPrompt: { type: Type.STRING },
                sfx: { type: Type.STRING }
              },
              required: ['number', 'scriptThai', 'scriptEnglish', 'veoPrompt', 'sfx']
            }
          },
          voiceSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['scenes', 'voiceSuggestions']
      }
    }
  });

  const parsed = JSON.parse(response.text || '{}');
  return { 
    scenes: (parsed.scenes || []).slice(0, sceneCount),
    suggestions: (parsed.voiceSuggestions || []).slice(0, 3)
  };
};

export const generateSceneImage = async (
  scene: Partial<Scene>,
  selectedAssets: Asset[],
  genre: Genre
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const styleInstruction = STYLE_SPECS[genre];
  const assetParts = selectedAssets.map(asset => ({
    inlineData: { data: asset.imageData.split(',')[1], mimeType: 'image/png' }
  }));

  const prompt = `
    Cinematic vertical 9:16 frame. No text, no subtitles.
    Atmosphere: ${genre}. Details: ${styleInstruction}.
    Action: ${scene.veoPrompt}.
    Consistency: Match faces and outfits from provided references exactly.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [...assetParts, { text: prompt }] },
    config: { 
      imageConfig: { aspectRatio: "9:16", imageSize: "1K" } 
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData?.data) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("Visual render failed");
};

export const generateMasterAudio = async (
  scenes: Scene[],
  gender: Gender,
  style: string,
  genre: Genre,
  language: Language,
  accent: ThaiAccent
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const isEnglish = language === Language.ENGLISH;
  const rawText = scenes.map(s => isEnglish ? s.scriptEnglish : s.scriptThai).join(' . ');
  const voiceName = gender === Gender.MALE ? 'Puck' : 'Zephyr';

  const accentToneInstruction = isEnglish ? "" : `
    VOICE GUIDANCE:
    The text is already written in the ${accent} dialect. 
    You MUST perform the TTS with the authentic tonal melody and rhythm of ${accent}. 
    - ${ThaiAccent.ISAN}: High energy, rising tones at ends.
    - ${ThaiAccent.NORTHERN}: Gentle, prolonged 'Kam Mueang' tones.
    - ${ThaiAccent.SOUTHERN}: Sharp, fast, energetic.
    Tone: ${style}. Atmosphere: ${genre}.
  `;

  const toneInstruction = `
    ${accentToneInstruction}
    Script: "${rawText}"
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: toneInstruction }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName } },
      },
    },
  });
  
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) return URL.createObjectURL(pcmToWav(decodeBase64(base64Audio), 24000));
  throw new Error("Audio synthesis failed");
};
