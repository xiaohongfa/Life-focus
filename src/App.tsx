import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import type { Life, Stability, WorldOverview, Essay } from './api/types';
import { api } from './api/client';
import { Header } from './components/Header';
import { StabilityModal } from './components/StabilityModal';
import { SettingsModal } from './components/SettingsModal';
import { EssayModal } from './components/EssayModal';
import { DashboardView } from './features/dashboard/DashboardView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider, useToast } from './components/ToastProvider';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

// Code-split heavy feature views to reduce initial bundle size (§16 启动加速)
const FocusCanvasView = React.lazy(() => import('./features/focus/FocusCanvasView').then(m => ({ default: m.FocusCanvasView })));
const LeaderView = React.lazy(() => import('./features/leader/LeaderView').then(m => ({ default: m.LeaderView })));
const CabinetView = React.lazy(() => import('./features/cabinet/CabinetView').then(m => ({ default: m.CabinetView })));
const IdeologyPhilosophyView = React.lazy(() => import('./features/ideology/IdeologyPhilosophyView').then(m => ({ default: m.IdeologyPhilosophyView })));
const NationalSpiritView = React.lazy(() => import('./features/spirit/NationalSpiritView').then(m => ({ default: m.NationalSpiritView })));
const ArchiveView = React.lazy(() => import('./features/archive/ArchiveView').then(m => ({ default: m.ArchiveView })));
const SnapshotsView = React.lazy(() => import('./features/snapshots/SnapshotsView').then(m => ({ default: m.SnapshotsView })));

const LazyFallback = () => (
  <div className="flex items-center justify-center h-full text-strategy-gold/60 space-x-2">
    <Loader2 className="w-5 h-5 animate-spin" />
    <span className="text-xs font-serif tracking-wider">加载战略模块中...</span>
  </div>
);

const AppContent: React.FC = () => {
  const [initState, setInitState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [initError, setInitError] = useState<string | null>(null);

  const [lives, setLives] = useState<Life[]>([]);
  const [currentLife, setCurrentLife] = useState<Life | null>(null);
  const [stability, setStability] = useState<Stability | null>(null);
  const [overview, setOverview] = useState<WorldOverview | null>(null);
  const [lifeLoadingId, setLifeLoadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [showStabilityModal, setShowStabilityModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Essay state
  const [essays, setEssays] = useState<Essay[]>([]);
  const [showEssayModal, setShowEssayModal] = useState(false);
  const [editingEssay, setEditingEssay] = useState<Essay | null>(null);

  // 竞态防护：记录最新生效的人生空间 ID 与请求序号，彻底消除快切覆写
  const currentLifeIdRef = useRef<string | null>(null);
  const reqSeqRef = useRef<number>(0);
  const toast = useToast();

  const loadLifeData = useCallback(async (lifeId: string) => {
    currentLifeIdRef.current = lifeId;
    const currentSeq = ++reqSeqRef.current;
    setLifeLoadingId(lifeId);
    try {
      const [overviewData, stabData, essaysData] = await Promise.all([
        api.getWorldOverview(lifeId),
        api.getStability(lifeId),
        api.getEssays(lifeId),
      ]);
      // 竞态守卫：若用户已快速切至其他人生或新请求已发射，丢弃过期响应
      if (currentLifeIdRef.current !== lifeId || reqSeqRef.current !== currentSeq) {
        return;
      }
      setOverview(overviewData);
      setStability(stabData);
      setEssays(essaysData);
      return true;
    } catch (err: unknown) {
      if (currentLifeIdRef.current === lifeId && reqSeqRef.current === currentSeq) {
        setOverview(null);
        setStability(null);
        setEssays([]);
      }
      throw err;
    } finally {
      if (currentLifeIdRef.current === lifeId && reqSeqRef.current === currentSeq) {
        setLifeLoadingId(null);
      }
    }
  }, []);

  // 初始化加载人生空间列表
  const initApp = useCallback(async () => {
    setInitState('loading');
    setInitError(null);
    try {
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
      setInitState('ready');
    } catch (err: unknown) {
      console.error('Failed to initialize app', err);
      const msg = err instanceof Error ? err.message : String(err);
      setInitError(msg);
      setInitState('error');
    }
  }, [loadLifeData]);

  useEffect(() => {
    initApp();
  }, [initApp]);

  const handleSelectLife = (lifeId: string) => {
    const target = lives.find((l) => l.id === lifeId);
    if (target) {
      // 立即失效上一个生命请求并清空当前视图，杜绝画面残留与竞态覆写
      currentLifeIdRef.current = target.id;
      reqSeqRef.current++;
      setOverview(null);
      setStability(null);
      setEssays([]);
      setShowEssayModal(false);
      setEditingEssay(null);
      setShowStabilityModal(false);
      setShowSettingsModal(false);
      setCurrentLife(target);
      loadLifeData(target.id).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`切换人生世界失败: ${msg}`);
      });
    }
  };

  const handleCreateLife = async (name: string) => {
    try {
      const created = await api.createLife(name);
      setLives((prev) => [...prev, created]);
      setCurrentLife(created);
      toast.success(`新战略人生【${created.name}】已建立`);
      await loadLifeData(created.id);
    } catch (err: unknown) {
      console.error('Failed to create life', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`创建人生世界失败: ${msg}`);
    }
  };

  const handleDeleteLife = async (lifeId: string) => {
    const deletingCurrent = currentLife?.id === lifeId;
    const previousLife = deletingCurrent ? currentLife : null;
    if (deletingCurrent) {
      // 先关闭所有可能继续提交旧 life_id 的界面，并让进行中的请求失效。
      reqSeqRef.current++;
      currentLifeIdRef.current = null;
      setShowEssayModal(false);
      setEditingEssay(null);
      setShowStabilityModal(false);
      setShowSettingsModal(false);
      setOverview(null);
      setStability(null);
      setEssays([]);
      setLifeLoadingId(null);
      setCurrentLife(null);
    }
    try {
      await api.deleteLife(lifeId);
      toast.success('人生世界已注销');
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
    } catch (err: unknown) {
      console.error('Failed to delete life', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`注销人生世界失败: ${msg}`);
      if (previousLife) {
        setCurrentLife(previousLife);
        loadLifeData(previousLife.id).catch(() => undefined);
      }
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
    if (saved.life_id !== currentLifeIdRef.current) return;
    setEssays((prev) => {
      const idx = prev.findIndex((e) => e.id === saved.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = saved;
        return updated;
      }
      return [saved, ...prev];
    });
    toast.success('战略随笔已保存');
  };

  const handleEssayDeleted = (id: string) => {
    setEssays((prev) => prev.filter((e) => e.id !== id));
    toast.info('随笔已撤除');
  };

  if (initState === 'error') {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#121519] text-strategy-gold p-6 select-none">
        <div className="max-w-md w-full border border-red-800/60 bg-[#1a1214]/90 p-6 rounded shadow-2xl flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-900/40 border border-red-500/50 flex items-center justify-center text-red-400 shadow-inner">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-serif font-bold tracking-widest text-red-200 uppercase">
            战略指挥所接入受阻
          </h2>
          <p className="text-xs text-red-300/80 font-mono leading-relaxed bg-black/50 p-3 rounded border border-red-900/40 w-full text-left break-all">
            {initError || '无法建立与本地数据枢纽的战略链路'}
          </p>
          <button
            onClick={() => initApp()}
            className="flex items-center space-x-2 px-5 py-2.5 border border-strategy-gold/70 bg-strategy-gold/10 hover:bg-strategy-gold/20 text-strategy-gold font-serif text-xs tracking-wider transition-colors rounded cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>重新连线战略中枢</span>
          </button>
        </div>
      </div>
    );
  }

  if (initState === 'loading' || !currentLife) {
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
        activeTab={activeTab}
        onSelectLife={handleSelectLife}
        onCreateLife={handleCreateLife}
        onDeleteLife={handleDeleteLife}
        onOpenStabilityModal={() => setShowStabilityModal(true)}
        onOpenSettingsModal={() => setShowSettingsModal(true)}
        onSelectTab={setActiveTab}
      />

      {/* Main Feature Content View with Isolated Error Containment */}
      <main className="flex-1 overflow-hidden relative">
        {lifeLoadingId === currentLife.id && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#121519]/90 text-strategy-gold space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs font-serif tracking-wider">正在切换人生战略档案...</span>
          </div>
        )}
        <ErrorBoundary
          key={`${currentLife.id}-${activeTab}`}
          onReset={() => loadLifeData(currentLife.id)}
        >
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

            {activeTab === 'archive' && (
              <ArchiveView
                lifeId={currentLife.id}
                onWriteEssay={handleOpenWriteEssay}
                onEditEssay={handleEditEssay}
              />
            )}

            {activeTab === 'snapshots' && <SnapshotsView lifeId={currentLife.id} />}
          </Suspense>
        </ErrorBoundary>
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

export const App: React.FC = () => (
  <ToastProvider>
    <AppContent />
  </ToastProvider>
);
