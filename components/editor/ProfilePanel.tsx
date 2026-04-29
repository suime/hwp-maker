'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  getAllProfiles, 
  saveCustomProfile, 
  deleteCustomProfile, 
  getActiveProfile, 
  setActiveProfile,
  profileToYaml,
  yamlToProfile,
  AiProfile,
  BUILTIN_PROFILES
} from '@/lib/ai/profiles';

export default function ProfilePanel() {
  const [profiles, setProfiles] = useState<AiProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [editingProfile, setEditingProfile] = useState<Partial<AiProfile> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = () => {
    setProfiles(getAllProfiles());
    setActiveProfileId(getActiveProfile().id);
  };

  const handleSelect = (id: string) => {
    setActiveProfile(id);
    setActiveProfileId(id);
  };

  const handleAdd = () => {
    const newProfile: AiProfile = {
      id: `profile-${Date.now()}`,
      name: '새 프로필',
      description: '프로필 설명을 입력하세요.',
      systemPrompt: '당신은 도움이 되는 AI 어시스턴트입니다.',
      defaultStyle: {
        run: { fontSize: 10, fontFamily: '함초롬바탕' },
        paragraph: { alignment: 'justify', lineSpacing: 160 }
      },
      isCustom: true
    };
    setEditingProfile(newProfile);
  };

  const handleSave = () => {
    if (editingProfile && editingProfile.id) {
      saveCustomProfile(editingProfile as AiProfile);
      setEditingProfile(null);
      refresh();
    }
  };

  const handleDelete = (id: string) => {
    const isBuiltin = BUILTIN_PROFILES.some(p => p.id === id);
    const msg = isBuiltin 
      ? '이 프로필을 초기 상태로 되돌리시겠습니까?' 
      : '이 프로필을 삭제하시겠습니까?';
      
    if (confirm(msg)) {
      deleteCustomProfile(id);
      refresh();
    }
  };

  const handleExport = (profile: AiProfile) => {
    const yaml = profileToYaml(profile);
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.name || 'profile'}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const imported = yamlToProfile(content);
      if (imported.name) {
        const newProfile = {
          ...imported,
          id: `profile-${Date.now()}`,
          isCustom: true
        } as AiProfile;
        saveCustomProfile(newProfile);
        refresh();
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-panel)' }}>
      {/* 헤더 */}
      <div className="panel-header border-b border-[var(--color-bg-border)] flex justify-between items-center">
        <div>
          <h2 className="text-sm font-semibold">AI 프로필</h2>
          <p className="text-[11px] text-[var(--color-text-muted)]">문체와 양식을 관리하세요</p>
        </div>
        <div className="flex gap-1">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-surface2)] text-[var(--color-text-primary)] transition-colors"
            style={{ background: 'var(--color-bg-surface)' }}
            title="YAML 가져오기"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button 
            onClick={handleAdd}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)]"
            title="프로필 추가"
          >
            +
          </button>
          <input ref={fileInputRef} type="file" accept=".yaml,.yml" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {/* 목록 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {profiles.map((p) => (
          <div 
            key={p.id}
            onClick={() => handleSelect(p.id)}
            className={`group relative p-3 rounded-xl border cursor-pointer transition-all ${
              activeProfileId === p.id 
                ? 'border-[var(--color-brand)] bg-[color-mix(in_srgb,var(--color-brand)_8%,transparent)]' 
                : 'border-[var(--color-bg-border)] hover:bg-[var(--color-bg-surface)]'
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-sm font-bold truncate pr-16">{p.name}</h3>
              {p.isCustom && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] border border-[var(--color-bg-border)]">
                  Custom
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2">{p.description}</p>
            
            {/* 액션 버튼들 */}
            <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => { e.stopPropagation(); handleExport(p); }}
                className="w-6 h-6 flex items-center justify-center rounded border border-[var(--color-bg-border)] shadow-sm hover:text-[var(--color-brand)] transition-colors"
                style={{ background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)' }}
                title="YAML 내보내기"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); setEditingProfile(p); }}
                className="w-6 h-6 flex items-center justify-center rounded border border-[var(--color-bg-border)] shadow-sm hover:text-[var(--color-brand)] transition-colors"
                style={{ background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)' }}
                title="수정"
              >
                ✎
              </button>

              {(p.isCustom || BUILTIN_PROFILES.some(bp => bp.id === p.id && getAllProfiles().some(ap => ap.id === bp.id && ap.isCustom))) && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                  className="w-6 h-6 flex items-center justify-center rounded border border-[var(--color-bg-border)] shadow-sm hover:text-red-500 transition-colors"
                  style={{ background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)' }}
                  title={p.isCustom && !BUILTIN_PROFILES.some(bp => bp.id === p.id) ? "삭제" : "초기화"}
                >
                  {p.isCustom && !BUILTIN_PROFILES.some(bp => bp.id === p.id) ? '×' : '↺'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 편집 모달 (간이 구현) */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-bg-panel)] border border-[var(--color-bg-border)] rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-[var(--color-bg-border)] flex justify-between items-center">
              <h2 className="font-bold">프로필 편집</h2>
              <button onClick={() => setEditingProfile(null)} className="text-xl text-[var(--color-text-muted)] hover:text-red-500">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">프로필 이름</label>
                <input 
                  type="text" 
                  value={editingProfile.name || ''} 
                  onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                  className="w-full bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">설명</label>
                <input 
                  type="text" 
                  value={editingProfile.description || ''} 
                  onChange={(e) => setEditingProfile({ ...editingProfile, description: e.target.value })}
                  className="w-full bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">시스템 프롬프트</label>
                <textarea 
                  rows={8}
                  value={editingProfile.systemPrompt || ''} 
                  onChange={(e) => setEditingProfile({ ...editingProfile, systemPrompt: e.target.value })}
                  className="w-full bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)] font-mono"
                />
              </div>
            </div>
            <div className="p-4 border-t border-[var(--color-bg-border)] flex justify-end gap-2">
              <button onClick={() => setEditingProfile(null)} className="px-4 py-2 rounded-lg text-sm hover:bg-[var(--color-bg-surface)] transition-colors">취소</button>
              <button onClick={handleSave} className="px-4 py-2 rounded-lg text-sm bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)] transition-colors">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
