
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Video, Loader2, Volume2, CheckCircle2, XCircle, Sparkles, Layers,
  Clapperboard, Mic2, Copy, Image as ImageIcon, Wand2, Hash, AudioLines,
  RefreshCw, FileOutput, X, Type, Edit3, Palette, Maximize, Download, Languages, Key, Menu, Lock
} from 'lucide-react';
import { Genre, Gender, Language, Asset, ProjectResult, Scene, ThaiAccent } from './types';
import { generateStoryboard, generateSceneImage, generateMasterAudio, generateCharacterImage } from './services/geminiService';

const LOCAL_STORAGE_KEY = 'cv_studio_assets_v17_pro';
const APP_PASSWORD = 'r@tima';

interface HeadlineStyles {
  color: string;
  size: string;
  isHandwritten: boolean;
}

const COLOR_MAP: Record<string, string> = {
  'text-white': '#ffffff',
  'text-indigo-400': '#818cf8',
  'text-yellow-400': '#facc15',
  'text-emerald-400': '#34d399'
};

const Scene1Headline: React.FC<{ text?: string; styles: HeadlineStyles }> = ({ text, styles }) => {
  if (!text) return null;
  const colorClass = styles.color || 'text-white';
  const sizeClass = styles.size || 'text-3xl md:text-5xl lg:text-7xl';
  const fontClass = styles.isHandwritten ? 'thai-handwriting' : 'font-black uppercase tracking-tight';
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 md:p-12 text-center z-20 pointer-events-none">
      <div className="bg-black/40 backdrop-blur-md p-6 md:p-10 rounded-2xl md:rounded-[3rem] border border-white/10 shadow-2xl transform transition-all animate-in fade-in zoom-in duration-700">
        <h1 className={`${sizeClass} ${colorClass} ${fontClass} drop-shadow-2xl leading-tight`}>{text}</h1>
        <div className={`mt-4 md:mt-8 h-0.5 md:h-1 w-16 md:w-32 ${colorClass.includes('indigo') ? 'bg-indigo-500' : colorClass.includes('yellow') ? 'bg-yellow-400' : 'bg-white'} mx-auto rounded-full opacity-60 shadow-lg`}></div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [genre, setGenre] = useState<Genre>(Genre.REALISTIC);
  const [language, setLanguage] = useState<Language>(Language.THAI);
  const [sceneCount, setSceneCount] = useState(3);
  const [gender, setGender] = useState<Gender>(Gender.FEMALE);
  const [selectedStyle, setSelectedStyle] = useState('Narrative');
  const [selectedAccent, setSelectedAccent] = useState<ThaiAccent>(ThaiAccent.BANGKOK);
  const [concept, setConcept] = useState('');
  const [customHeadline, setCustomHeadline] = useState('');
  const [headlineStyles, setHeadlineStyles] = useState<HeadlineStyles>({
    color: 'text-white',
    size: 'text-5xl',
    isHandwritten: true
  });
  const [result, setResult] = useState<ProjectResult>({ scenes: [], status: 'idle' });
  const [isKeySelected, setIsKeySelected] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetDesc, setNewAssetDesc] = useState('');
  const [newAssetVoice, setNewAssetVoice] = useState<Gender>(Gender.FEMALE);
  const [isGeneratingAsset, setIsGeneratingAsset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<'character' | 'product'>('character');

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) { try { setAssets(JSON.parse(saved)); } catch (e) {} }
    const checkKey = async () => {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      setIsKeySelected(hasKey);
    };
    checkKey();
  }, []);

  useEffect(() => { 
    if (isAuthorized) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(assets)); 
    }
  }, [assets, isAuthorized]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === APP_PASSWORD) {
      setIsAuthorized(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 500);
    }
  };

  const handleOpenKey = async () => {
    await (window as any).aistudio.openSelectKey();
    setIsKeySelected(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const newAsset: Asset = {
        id: crypto.randomUUID(),
        name: newAssetName || 'Untitled',
        type: uploadType,
        imageData: base64,
        description: newAssetDesc,
        voiceProfile: newAssetVoice
      };
      setAssets(prev => [...prev, newAsset]);
      setNewAssetName('');
      setNewAssetDesc('');
    };
    reader.readAsDataURL(file);
  };

  const handleAiAssetGen = async () => {
    if (!isKeySelected) { await handleOpenKey(); return; }
    if (!newAssetDesc) return alert("กรุณาใส่รายละเอียดของ Asset เพื่อให้ AI วาดรูป!");
    setIsGeneratingAsset(true);
    try {
      const imageData = await generateCharacterImage(newAssetDesc);
      const newAsset: Asset = {
        id: crypto.randomUUID(),
        name: newAssetName || 'AI Generated',
        type: uploadType,
        imageData,
        description: newAssetDesc,
        voiceProfile: newAssetVoice
      };
      setAssets(prev => [...prev, newAsset]);
      setNewAssetName('');
      setNewAssetDesc('');
    } catch (err: any) {
      alert("Asset generation failed: " + err.message);
    } finally {
      setIsGeneratingAsset(false);
    }
  };

  const handleGenerateWorkflow = async () => {
    if (!isKeySelected) { await handleOpenKey(); return; }
    if (!concept) return alert("กรุณาใส่บทร่าง (Vision Script) ก่อน!");
    const selected = assets.filter(a => selectedAssetIds.includes(a.id));
    if (selected.length === 0) return alert("กรุณาเลือกตัวละครหรือสินค้าใน Bible ก่อน!");

    setIsSidebarOpen(false);
    setResult({ scenes: [], status: 'storyboarding' });
    try {
      const { scenes, suggestions } = await generateStoryboard(genre, concept, selected, sceneCount, language, selectedAccent, customHeadline);
      const initialScenes: Scene[] = scenes.map((s, idx) => ({
        id: crypto.randomUUID(),
        number: s.number || idx + 1,
        scriptThai: s.scriptThai || '',
        scriptEnglish: s.scriptEnglish || '',
        headlineThai: idx === 0 ? (customHeadline || s.headlineThai) : undefined,
        veoPrompt: s.veoPrompt || '',
        sfx: s.sfx || '',
        integratedMarkdown: '',
        status: 'pending'
      }));
      setResult({ scenes: initialScenes, voiceStyleSuggestions: suggestions, status: 'generating_scenes' });
      const finalScenes = [...initialScenes];
      for (let i = 0; i < finalScenes.length; i++) {
        setResult(prev => ({ ...prev, scenes: prev.scenes.map((s, idx) => idx === i ? { ...s, status: 'generating' } : s) }));
        try {
          const imageUrl = await generateSceneImage(finalScenes[i], selected, genre);
          finalScenes[i] = { ...finalScenes[i], imageUrl, status: 'completed' };
        } catch (err) { finalScenes[i] = { ...finalScenes[i], status: 'error' }; }
        setResult(prev => ({ ...prev, scenes: [...finalScenes] }));
      }
      setResult(prev => ({ ...prev, status: 'completed' }));
    } catch (err: any) { setResult({ scenes: [], status: 'error', errorMessage: err.message }); }
  };

  const handleRegenerateScene = async (index: number) => {
    if (!isKeySelected) { await handleOpenKey(); return; }
    const selected = assets.filter(a => selectedAssetIds.includes(a.id));
    setResult(prev => ({
      ...prev,
      scenes: prev.scenes.map((s, idx) => idx === index ? { ...s, status: 'generating' } : s)
    }));
    try {
      const imageUrl = await generateSceneImage(result.scenes[index], selected, genre);
      setResult(prev => ({
        ...prev,
        scenes: prev.scenes.map((s, idx) => idx === index ? { ...s, imageUrl, status: 'completed' } : s)
      }));
    } catch (err) {
      setResult(prev => ({
        ...prev,
        scenes: prev.scenes.map((s, idx) => idx === index ? { ...s, status: 'error' } : s)
      }));
    }
  };

  const copyFullPrompt = (scene: Scene) => {
    const spoken = language === Language.THAI ? scene.scriptThai : scene.scriptEnglish;
    const text = `PRODUCTION SCENE ${scene.number}\n` +
                 `DIALECT: ${selectedAccent}\n` +
                 `AUDIO SCRIPT: ${spoken}\n\n` +
                 `VISUAL PROMPT: ${scene.veoPrompt}`;
    navigator.clipboard.writeText(text);
    alert("คัดลอกรายละเอียดแล้ว!");
  };

  const downloadScene = async (scene: Scene) => {
    if (!scene.imageUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = scene.imageUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      if (scene.number === 1 && scene.headlineThai) {
        const fontSize = canvas.width * 0.08;
        ctx.font = `900 ${fontSize}px 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 20;
        ctx.fillStyle = COLOR_MAP[headlineStyles.color] || '#ffffff';
        ctx.fillText(scene.headlineThai, canvas.width / 2, canvas.height / 2);
      }
      const link = document.createElement('a');
      link.download = `cv_studio_scene_${scene.number}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-slate-950 to-slate-950"></div>
        <div className={`w-full max-w-md relative z-10 glass-panel p-10 rounded-[2.5rem] border border-white/5 shadow-2xl transition-all duration-300 ${passwordError ? 'animate-shake' : ''}`}>
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl mb-4">
              <Lock className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-widest text-white mb-2">Creative Studio</h1>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-[0.3em]">Identity Verification</p>
            </div>
            
            <form onSubmit={handleAuth} className="w-full space-y-4 pt-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Access Token</label>
                <input 
                  type="password" 
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full bg-slate-900/50 border ${passwordError ? 'border-red-500/50 focus:ring-red-500/20' : 'border-white/10 focus:ring-indigo-500/20'} rounded-2xl p-4 text-center text-xl tracking-[0.5em] outline-none focus:ring-4 transition-all text-white`}
                  autoFocus
                />
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.3em] shadow-xl active:scale-[0.98] transition-all"
              >
                Unlock Studio
              </button>
            </form>
            
            <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest pt-4">Version 1.0.0 Stable</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#020617] text-slate-100 overflow-hidden font-sans relative">
      {/* Sidebar - Bible */}
      <aside className={`fixed inset-y-0 left-0 w-80 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out glass-panel border-r border-white/5 flex flex-col shadow-2xl`}>
        <div className="p-6 bg-slate-900/40 border-b border-white/5 flex justify-between items-center">
          <h2 className="text-xs font-black flex items-center gap-2 tracking-widest uppercase text-slate-400"><Layers className="text-indigo-400" size={16} /> Production Bible</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white"><X size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-8 scrollbar-hide">
          <div className="space-y-4">
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
              {(['character', 'product'] as const).map(t => (<button key={t} onClick={() => setUploadType(t)} className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${uploadType === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{t}</button>))}
            </div>
            <div className="space-y-3">
              <input value={newAssetName} onChange={e => setNewAssetName(e.target.value)} placeholder="Name" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500/50 text-white" />
              <textarea value={newAssetDesc} onChange={e => setNewAssetDesc(e.target.value)} placeholder="Description..." className="w-full h-20 bg-white/5 border border-white/10 rounded-xl p-3 text-xs resize-none outline-none focus:ring-2 focus:ring-indigo-500/50 text-white" />
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 py-3 border border-white/10 rounded-xl bg-white/5 text-[10px] font-black uppercase hover:bg-white/10 transition-all">Upload</button>
                <button onClick={handleAiAssetGen} disabled={isGeneratingAsset} className="flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-indigo-500 transition-all shadow-lg disabled:opacity-50">{isGeneratingAsset ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} Build</button>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
            </div>
          </div>
          <div className="space-y-6 pt-6 border-t border-white/5">
            <div className="space-y-4">
              <div className="flex justify-between items-center"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Hash size={12} /> Frames</label><input type="number" min="1" max="15" value={sceneCount} onChange={e => setSceneCount(Number(e.target.value))} className="w-12 bg-white/5 border border-white/10 rounded-xl p-1.5 text-[10px] text-center font-black text-indigo-400" /></div>
              <input type="range" min="1" max="15" value={sceneCount} onChange={e => setSceneCount(Number(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Languages size={12}/> Accent</label>
              <div className="space-y-1">
                {Object.values(ThaiAccent).map(acc => (
                  <button key={acc} onClick={() => setSelectedAccent(acc)} className={`w-full py-2 px-3 rounded-lg text-[9px] font-black uppercase transition-all border text-left flex items-center justify-between ${selectedAccent === acc ? 'bg-indigo-600 border-indigo-400 text-white shadow-md' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'}`}>
                    {acc.split('(')[1]?.replace(')', '') || acc} {selectedAccent === acc && <CheckCircle2 size={10} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-3 pt-6 border-t border-white/5">
            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Library</h3>
            <div className="grid grid-cols-2 gap-2">
              {assets.map(asset => (
                <div key={asset.id} onClick={() => setSelectedAssetIds(prev => prev.includes(asset.id) ? prev.filter(i => i !== asset.id) : [...prev, asset.id])} className={`group relative aspect-[4/5] rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${selectedAssetIds.includes(asset.id) ? 'border-indigo-500 shadow-lg scale-95' : 'border-transparent opacity-60'}`}>
                  <img src={asset.imageData} className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-1.5 text-[8px] font-bold text-center uppercase">{asset.name}</div>
                  <button onClick={(e) => { e.stopPropagation(); setAssets(prev => prev.filter(a => a.id !== asset.id)); }} className="absolute top-1 left-1 bg-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100"><X size={10} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Studio Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#020617] overflow-y-auto scrollbar-hide">
        <header className="sticky top-0 h-16 md:h-20 border-b border-white/5 flex items-center justify-between px-4 md:px-10 bg-slate-950/80 backdrop-blur-2xl z-40">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 bg-white/5 rounded-lg text-indigo-400 active:scale-95 transition-all"><Menu size={24}/></button>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><Sparkles className="text-white" size={20} /></div>
            <div className="hidden sm:block">
              <h1 className="text-xs md:text-sm font-black tracking-widest uppercase text-white">Creative Studio</h1>
              <p className="text-[8px] md:text-[10px] font-bold text-slate-500 tracking-widest uppercase">Pro Edition</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isKeySelected ? (
              <button onClick={handleOpenKey} className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 text-[10px] font-black uppercase flex items-center gap-2 shadow-lg active:scale-95 transition-all"><Key size={12} /> Key Setup</button>
            ) : (
              <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500 text-[10px] font-black uppercase flex items-center gap-2"><CheckCircle2 size={12} /> Active</div>
            )}
          </div>
        </header>

        <div className="p-4 md:p-10 space-y-12">
          {/* Controls Section */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-3 space-y-4">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">World Style</label>
               <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                 {Object.values(Genre).map(g => (
                   <button key={g} onClick={() => setGenre(g)} className={`py-3 px-4 text-[10px] font-black uppercase rounded-xl border-2 transition-all text-left ${genre === g ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl scale-105' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}>
                     {g.split('(')[0]}
                   </button>
                 ))}
               </div>
            </div>

            <div className="lg:col-span-9 space-y-8">
              <div className="bg-slate-900/40 border border-white/5 p-5 md:p-10 rounded-[2.5rem] space-y-6 shadow-2xl">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2"><Type size={14}/> Scene 1 Title (Thai)</label>
                  <input type="text" value={customHeadline} onChange={e => setCustomHeadline(e.target.value)} placeholder="ชื่อหัวข้อภาษาไทย..." className="w-full bg-slate-950/60 border border-white/10 rounded-2xl p-5 md:p-7 outline-none text-base md:text-xl font-bold text-indigo-400 focus:ring-2 focus:ring-indigo-500/30 transition-all" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Clapperboard size={14}/> Vision Script</label>
                  <textarea value={concept} onChange={e => setConcept(e.target.value)} placeholder="Describe the story here..." className="w-full h-40 md:h-60 bg-slate-900/40 border border-white/5 rounded-[2rem] p-6 md:p-10 outline-none text-base leading-relaxed text-slate-200 focus:ring-2 focus:ring-indigo-500/30 transition-all" />
                </div>
                <div className="flex justify-center md:justify-end pt-4">
                  <button onClick={handleGenerateWorkflow} disabled={result.status !== 'idle' && result.status !== 'completed'} className="w-full md:w-auto px-16 py-6 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-full font-black text-[12px] uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
                    {result.status === 'idle' || result.status === 'completed' ? 'Start Production' : 'Processing...'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Visualization Area */}
          <section className="space-y-16">
            {result.status === 'storyboarding' && (<div className="py-20 text-center space-y-6 animate-pulse"><Loader2 className="animate-spin text-indigo-500 mx-auto" size={50} /><p className="text-[11px] font-black uppercase tracking-[0.5em] text-indigo-400">Locking Dialect & Continuity...</p></div>)}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-14">
              {result.scenes.map((scene, i) => (
                <div key={scene.id} className="bg-slate-900/50 rounded-[3rem] border border-white/5 overflow-hidden flex flex-col shadow-2xl transition-all duration-500 hover:border-indigo-500/40 hover:translate-y-[-5px]">
                  <div className="relative aspect-[9/16] bg-black flex items-center justify-center overflow-hidden">
                    {scene.status === 'generating' ? (
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-indigo-500/60" size={50} />
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500/60">Rendering Frame {scene.number}...</p>
                      </div>
                    ) : scene.imageUrl ? (
                      <div className="relative w-full h-full group">
                        <img src={scene.imageUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                        {scene.number === 1 && <Scene1Headline text={scene.headlineThai} styles={headlineStyles} />}
                        <div className="absolute top-6 left-6 bg-black/50 backdrop-blur-xl text-white text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-widest border border-white/10 shadow-2xl z-30">Scene {scene.number}</div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4 text-slate-800">
                        <ImageIcon size={80} />
                        <p className="text-[10px] font-black uppercase tracking-widest">Idle</p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-slate-950/60 border-t border-white/5 flex gap-3">
                    <button onClick={() => downloadScene(scene)} disabled={!scene.imageUrl} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-4 px-2 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg disabled:opacity-20">
                      <Download size={20}/><span className="text-[11px] font-black uppercase">Save</span>
                    </button>
                    <button onClick={() => copyFullPrompt(scene)} className="bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-2xl flex items-center justify-center active:scale-95 transition-all shadow-lg"><Copy size={20}/></button>
                    <button onClick={() => handleRegenerateScene(i)} disabled={scene.status === 'generating'} className="bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-2xl flex items-center justify-center active:scale-95 transition-all shadow-lg"><RefreshCw size={20}/></button>
                  </div>

                  <div className="p-8 pb-10 flex-1 flex flex-col justify-center">
                    <p className="text-xs md:text-sm text-slate-300 font-medium leading-relaxed italic line-clamp-4">"{language === Language.THAI ? scene.scriptThai : scene.scriptEnglish}"</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Audio Master */}
            {result.status === 'completed' && (
              <div className="flex flex-col items-center gap-12 py-16 border-t border-white/5 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                <div className="w-full max-w-4xl bg-slate-900/60 p-8 md:p-14 rounded-[4rem] border border-white/5 space-y-12 shadow-inner text-center">
                  <button onClick={async () => {
                    setResult(prev => ({ ...prev, status: 'generating_scenes' }));
                    try { const url = await generateMasterAudio(result.scenes, gender, selectedStyle, genre, language, selectedAccent); setResult(prev => ({ ...prev, audioUrl: url, status: 'completed' })); } catch (e: any) { alert(e.message); setResult(prev => ({ ...prev, status: 'completed' })); }
                  }} className="w-full md:w-auto px-20 py-7 bg-gradient-to-r from-indigo-500 to-indigo-700 text-white rounded-full font-black text-[13px] uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 mx-auto"><Mic2 size={24}/> Generate Master Audio</button>
                </div>

                {result.audioUrl && (
                  <div className="w-full max-w-3xl bg-indigo-500/10 border border-indigo-500/20 p-10 rounded-[3.5rem] flex flex-col md:flex-row items-center gap-10 shadow-2xl">
                    <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl"><Volume2 className="text-white" size={40} /></div>
                    <div className="flex-1 w-full space-y-5">
                      <p className="text-[13px] font-black uppercase tracking-[0.5em] text-indigo-300">Final Master Track</p>
                      <audio src={result.audioUrl} controls className="h-12 w-full invert brightness-150 opacity-90" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {result.status === 'idle' && (
            <div className="py-24 md:py-48 flex flex-col items-center justify-center text-slate-800 space-y-12 border-4 border-dashed border-white/[0.03] rounded-[5rem]">
              <Video size={120} className="text-slate-900/40" />
              <div className="text-center max-w-lg px-8">
                <h2 className="text-4xl font-black uppercase tracking-[0.5em] text-slate-800/40">Studio Idle</h2>
                <p className="mt-6 text-[14px] font-medium text-slate-600 leading-relaxed italic">Prepare your assets and vision to begin the cinematic production process.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Sidebar Mobile Overlay */}
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 md:hidden animate-in fade-in duration-300"></div>}
    </div>
  );
};

export default App;
