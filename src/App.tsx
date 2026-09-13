import React, { useState, useEffect, useCallback, Suspense } from 'react';
import type { Life, Stability, WorldOverview, Essay } from './api/types';
import { api } from './api/client';
import { Header } from './components/Header';
import { StabilityModal } from './components/StabilityModal';
import { SettingsModal } from './components/SettingsModal';
import { EssayModal } from './components/EssayModal';
import { DashboardView } from './features/dashboard/DashboardView';
import { Loader2 } from 'lucide-react';

// Code-split heavy feature views to reduce initial bundle size (§16 启动加速)
const FocusCanvasView = React.lazy(() => import('./features/focus/FocusCanvasView').then(m => ({ default: m.FocusCanvasView })));
const LeaderView = React.lazy(() => import('./features/leader/LeaderView').then(m => ({ default: m.LeaderView })));
const CabinetView = React.lazy(() => import('./features/cabinet/CabinetView').then(m => ({ default: m.CabinetView })));
const IdeologyPhilosophyView = React.lazy(() => import('./features/ideology/IdeologyPhilosophyView').then(m => ({ default: m.IdeologyPhilosophyView })));
const NationalSpiritView = React.lazy(() => import('./features/spirit/NationalSpiritView').then(m => ({ default: m.NationalSpiritView })));
const DecisionView = React.lazy(() => import('./features/decisions/DecisionView').then(m => ({ default: m.DecisionView })));
const ArchiveView = React.lazy(() => import('./features/archive/ArchiveView').then(m => ({ default: m.ArchiveView })));
const SnapshotsView = React.lazy(() => import('./features/snapshots/SnapshotsView').then(m => ({ default: m.SnapshotsView })));

const LazyFallback = () => (
  <div className="flex items-center justify-center h-full text-strategy-gold/60 space-x-2">
    <Loader2 className="w-5 h-5 animate-spin" />
    <span className="text-xs font-serif tracking-wider">加载模块中...</span>
  </div>
);

export const App: React.FC = () => {
  const [lives, setLives] = useState<Life[]>([]);
  const [currentLife, setCurrentLife] = useState<Life | null>(null);
  const [stability, setStability] = useState<Stability | null>(null);
  const [overview, setOverview] = useState<WorldOverview | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [showStabilityModal, setShowStabilityModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Essay state
  const [essays, setEssays] = useState<Essay[]>([]);
  const [showEssayModal, setShowEssayModal] = useState(false);
  const [editingEssay, setEditingEssay] = useState<Essay | null>(null);

  // 初始化加载人生空间列表
  const initApp = useCallback(async () => {
    try {
      setLoading(true);
      let livesList = await api.listLives();
      if (livesList.length === 0) {
        // 初始无空间时创建默认空间
        const defaultLife = await api.createLife('第一人生 · 主线');
        livesList = [defaultLife];
      }
      setLives(livesList);
      const active = livesList[0];
      setCurrentLife(active);
      await loadLifeData(active.id);
    } catch (err) {
      console.error('Failed to initialize app', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLifeData = async (lifeId: string) => {
    try {
      const [overviewData, stabData, essaysData] = await Promise.all([
        api.getWorldOverview(lifeId),
        api.getStability(lifeId),
        api.getEssays(lifeId),
      ]);
      setOverview(overviewData);
      setStability(stabData);
      setEssays(essaysData);
    } catch (err) {
      console.error('Failed to load life overview', err);
    }
  };

  useEffect(() => {
    initApp();
  }, [initApp]);

  const handleSelectLife = (lifeId: string) => {
    const target = lives.find((l) => l.id === lifeId);
    if (target) {
      setCurrentLife(target);
      loadLifeData(target.id);
    }
  };

  const handleCreateLife = async (name: string) => {
    try {
      const created = await api.createLife(name);
      setLives((prev) => [...prev, created]);
      setCurrentLife(created);
      await loadLifeData(created.id);
    } catch (err) {
      console.error('Failed to create life', err);
    }
  };

  const handleDeleteLife = async (lifeId: string) => {
    try {
      await api.deleteLife(lifeId);
      const remaining = await api.listLives();
      if (remaining.length === 0) {
        const fresh = await api.createLife('第一人生 · 主线');
        setLives([fresh]);
        setCurrentLife(fresh);
        await loadLifeData(fresh.id);
      } else {
        setLives(remaining);
        const next = remaining.find((l) => l.id !== lifeId) || remaining[0];
        setCurrentLife(next);
        await loadLifeData(next.id);
      }
    } catch (err) {
      console.error('Failed to delete life', err);
    }
  };

  // Essay handlers
  const handleOpenWriteEssay = () => {
    setEditingEssay(null);
    setShowEssayModal(true);
  };

  const handleEditEssay = (essay: Essay) => {
    setEditingEssay(essay);
    setShowEssayModal(true);
  };

  const handleEssaySaved = (saved: Essay) => {
    setEssays((prev) => {
      const idx = prev.findIndex((e) => e.id === saved.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = saved;
        return updated;
      }
      return [saved, ...prev];
    });
  };

  const handleEssayDeleted = (id: string) => {
    setEssays((prev) => prev.filter((e) => e.id !== id));
  };

  if (loading || !currentLife) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#121519] text-strategy-gold space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-strategy-gold" />
        <span className="font-serif tracking-widest text-sm">正在载入人生战略指挥所...</span>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col bg-[#121519] text-slate-100 overflow-hidden font-sans">
      {/* Strategic Header & Navigation */}
      <Header
        lives={lives}
        currentLife={currentLife}
        stability={stability}
        overview={overview}
        activeTab={activeTab}
        onSelectLife={handleSelectLife}
        onCreateLife={handleCreateLife}
        onDeleteLife={handleDeleteLife}
        onOpenStabilityModal={() => setShowStabilityModal(true)}
        onOpenSettingsModal={() => setShowSettingsModal(true)}
        onSelectTab={setActiveTab}
      />

      {/* Main Feature Content View */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'dashboard' && overview && (
          <DashboardView
            overview={overview}
            onNavigateTab={setActiveTab}
            onOpenStabilityModal={() => setShowStabilityModal(true)}
            essays={essays}
            onWriteEssay={handleOpenWriteEssay}
            onEditEssay={handleEditEssay}
          />
        )}

        <Suspense fallback={<LazyFallback />}>
          {activeTab === 'focus' && <FocusCanvasView lifeId={currentLife.id} />}

          {activeTab === 'leader' && <LeaderView lifeId={currentLife.id} />}

          {activeTab === 'cabinet' && (
            <CabinetView
              lifeId={currentLife.id}
              onOpenSettings={() => setShowSettingsModal(true)}
            />
          )}

          {activeTab === 'ideology_philosophy' && <IdeologyPhilosophyView lifeId={currentLife.id} />}

          {activeTab === 'spirit' && <NationalSpiritView lifeId={currentLife.id} />}

          {activeTab === 'decisions' && <DecisionView lifeId={currentLife.id} />}

          {activeTab === 'archive' && (
            <ArchiveView
              lifeId={currentLife.id}
              onWriteEssay={handleOpenWriteEssay}
              onEditEssay={handleEditEssay}
            />
          )}

          {activeTab === 'snapshots' && <SnapshotsView lifeId={currentLife.id} />}
        </Suspense>
      </main>

      {/* Essay Modal */}
      <EssayModal
        isOpen={showEssayModal}
        onClose={() => { setShowEssayModal(false); setEditingEssay(null); }}
        lifeId={currentLife.id}
        initialEssay={editingEssay}
        onSaved={handleEssaySaved}
        onDeleted={handleEssayDeleted}
      />

      {/* Stability Modal */}
      {showStabilityModal && (
        <StabilityModal
          lifeId={currentLife.id}
          stability={stability}
          onClose={() => setShowStabilityModal(false)}
          onUpdated={(newStab) => {
            setStability(newStab);
            loadLifeData(currentLife.id);
          }}
        />
      )}

      {/* System Settings & Export Console (§12.5 & §16) */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        lifeId={currentLife.id}
        lifeName={currentLife.name}
        onDeleteLife={handleDeleteLife}
      />
    </div>
  );
};
