import { useState, useEffect, useRef } from 'react';
import {
  Coins,
  Database,
  Zap,
  Award,
  AlertCircle,
  Network,
  ShoppingCart,
  LayoutDashboard,
  User,
  Users,
  Rocket,
  TrendingUp,
  ShieldCheck,
  ArrowLeft,
  Moon,
  Sun,
  Cpu,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_BASES = {
  go: import.meta.env.VITE_GO_API_BASE || 'http://localhost:8080',
  cpp: import.meta.env.VITE_CPP_API_BASE || 'http://localhost:8081',
} as const;

type EngineType = keyof typeof API_BASES;
type ThemeType = 'dark' | 'light';

const RANKS_LIST = [
  { name: "Partner / No Calificado", icon: AlertCircle, color: "text-blue-200" },
  { name: "Entrepreneur", icon: Award, color: "text-amber-500" },
  { name: "Executive Ent.", icon: Award, color: "text-amber-500" },
  { name: "Senior Entrepreneur", icon: Award, color: "text-amber-500" },
  { name: "Team Builder", icon: Award, color: "text-amber-500" },
  { name: "Leader X", icon: Award, color: "text-blue-400" },
  { name: "Premier Leader", icon: Award, color: "text-blue-400" },
  { name: "Elite Leader", icon: Award, color: "text-blue-400" },
  { name: "Diamond", icon: Award, color: "text-blue-400" },
  { name: "Blue Diamond", icon: Award, color: "text-blue-500" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [engine, setEngine] = useState<EngineType>('go');
  const [theme, setTheme] = useState<ThemeType>('dark');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [txLog, setTxLog] = useState<any[]>([]);
  
  const [treeUser, setTreeUser] = useState<any>(null);
  const [searchId, setSearchId] = useState("0");
  const [history, setHistory] = useState<string[]>([]);
  
  const [simId, setSimId] = useState("");
  const [simVolume, setSimVolume] = useState("100");
  const [simCount, setSimCount] = useState("1"); // For massive injection

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const apiBase = API_BASES[engine];

  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', theme === 'light');
  }, [theme]);

  const runClosure = async () => {
    setLoading(true);
    setTerminalLogs(["Iniciando motor PostgreSQL..."]);
    try {
      const res = await axios.get(`${apiBase}/calculate`, { timeout: 120000 });
      let currentLogs: string[] = [];
      for (const log of res.data.logs) {
        currentLogs.push(log);
        setTerminalLogs([...currentLogs]);
        await new Promise(r => setTimeout(r, 60));
      }
      setStats(res.data);
    } catch (err) {
      setTerminalLogs(prev => [...prev, "❌ Error fatal en el motor de cierre."]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTreeUser = async (id: string, pushHistory = true) => {
    try {
      const res = await axios.get(`${apiBase}/tree?id=${id}`);
      if (pushHistory && treeUser) {
        setHistory(prev => [...prev, treeUser.id.toString()]);
      }
      setTreeUser(res.data);
      setSearchId(id);
    } catch (err) {
      alert("Usuario no encontrado");
    }
  };

  const goBack = () => {
    const prevId = history[history.length - 1];
    if (prevId !== undefined) {
      setHistory(prev => prev.slice(0, -1));
      fetchTreeUser(prevId, false);
    }
  };

  const createTransaction = async () => {
    if (!simId) return;
    try {
      const count = parseInt(simCount) || 1;
      const baseId = parseInt(simId);
      
      // If count > 1, simulate massive injection at backend (mocked here but sending signals)
      for (let i = 0; i < Math.min(count, 5); i++) { // Only show 5 in log
        await axios.post(`${apiBase}/transaction`, {
          userId: baseId + i,
          volume: parseFloat(simVolume)
        });
      }
      
      setTxLog([{ id: Date.now(), userId: baseId, volume: simVolume, count: count, time: new Date().toLocaleTimeString() }, ...txLog].slice(0, 5));
      alert(`¡Inyección de ${count} transacciones completada!`);
    } catch (err) {
      alert("Error en la transacción");
    }
  };

  useEffect(() => {
    if (terminalEndRef.current) {
       terminalEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [terminalLogs]);

  useEffect(() => { fetchTreeUser("0", false); }, [engine]);

  const themeClasses =
    theme === 'dark'
      ? {
          page: 'bg-[#020617] text-slate-200',
          panel: 'bg-slate-900/40 border border-slate-800/50',
          softPanel: 'bg-slate-950/70 border border-slate-800',
          terminal: 'bg-slate-950/80',
          textMuted: 'text-slate-500',
          textStrong: 'text-white',
          input: 'bg-slate-950 border border-slate-800',
        }
      : {
          page: 'bg-slate-100 text-slate-900',
          panel: 'bg-white border border-slate-200 shadow-sm',
          softPanel: 'bg-slate-50 border border-slate-200',
          terminal: 'bg-slate-50',
          textMuted: 'text-slate-600',
          textStrong: 'text-slate-900',
          input: 'bg-white border border-slate-300',
        };

  return (
    <div className={`min-h-screen p-6 lg:p-12 font-sans relative overflow-x-hidden transition-colors ${themeClasses.page}`}>
      {/* Mesh Background */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-cyan-700/20 rounded-full blur-[200px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-700/20 rounded-full blur-[200px]"></div>
      </div>

      <div className="relative z-10 max-w-[1500px] mx-auto flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider ${themeClasses.softPanel}`}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          </button>
          <div className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider ${themeClasses.softPanel}`}>
            <Cpu size={14} />
            <span>Motor</span>
            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value as EngineType)}
              className={`rounded-md px-2 py-1 text-xs ${themeClasses.input}`}
            >
              <option value="go">Go</option>
              <option value="cpp">C++</option>
            </select>
          </div>
        </div>
        
        {/* Main Header / Start Closure */}
        <div className={`flex flex-col items-center justify-center py-12 rounded-[48px] backdrop-blur-xl mb-4 relative overflow-hidden group ${themeClasses.panel}`}>
          <button 
            onClick={runClosure}
            disabled={loading}
            className="group relative flex items-center gap-6 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-900 text-white px-16 py-6 rounded-3xl font-black text-2xl uppercase tracking-widest transition-all shadow-[0_20px_60px_rgba(8,145,178,0.4)] active:scale-95 z-10"
          >
            <Zap className={`fill-current ${loading ? 'animate-pulse' : 'group-hover:animate-bounce'}`} size={28} />
            {loading ? "PROCESANDO 10,000,000..." : "EJECUTAR CIERRE MASIVO"}
          </button>
          <div className={`flex items-center gap-6 mt-8 font-mono text-[10px] tracking-[0.5em] z-10 ${themeClasses.textMuted}`}>
             <span className="flex items-center gap-2"><Database size={12}/> DB: POSTGRESQL</span>
             <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
             <span className="flex items-center gap-2 text-emerald-500/80"><ShieldCheck size={12}/> MOTOR: {engine.toUpperCase()}</span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex justify-center mb-4">
          <div className={`p-2 rounded-2xl flex gap-1 shadow-2xl backdrop-blur-md ${themeClasses.softPanel}`}>
            {[
              { id: 'dashboard', label: 'Monitor Global', icon: LayoutDashboard },
              { id: 'tree', label: 'Árbol Genealógico', icon: Network },
              { id: 'simulation', label: 'Inyector Masivo', icon: ShoppingCart },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-8 py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-cyan-600 text-white shadow-[0_10px_20px_rgba(8,145,178,0.2)]' : `${themeClasses.textMuted} hover:text-cyan-500`}`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'SÍNTESIS DE RED', value: '10,000,000', icon: Users, color: 'text-cyan-400', desc: 'Sincronizados via Postgres' },
                  { label: 'TIEMPO DE CIERRE', value: stats?.executionTime || '--', icon: Zap, color: 'text-indigo-400', desc: 'Incluye MVR + Compression' },
                  { label: 'CALIFICADOS (DIAMANTE+)', value: stats?.ranksSummary?.["Diamond"]?.toLocaleString() || '0', icon: Rocket, color: 'text-amber-400', desc: 'Rango Élite' },
                  { label: 'TOTAL BONOS', value: stats?.totalBonus?.toLocaleString() || '-', icon: Coins, color: 'text-emerald-400', desc: 'Residuables Pagados' },
                ].map((card, i) => (
                  <div key={i} className={`p-8 rounded-[36px] backdrop-blur-md ${themeClasses.panel}`}>
                    <div className="flex justify-between items-start mb-6">
                      <div className={`p-4 rounded-2xl bg-slate-950 border border-slate-800 ${card.color}`}><card.icon size={24} /></div>
                      <div className="text-right">
                        <p className={`text-[9px] font-black tracking-widest mb-1 uppercase ${themeClasses.textMuted}`}>{card.label}</p>
                        <p className={`text-3xl font-black tracking-tighter ${themeClasses.textStrong}`}>{card.value}</p>
                      </div>
                    </div>
                    <p className={`text-[10px] font-bold ${themeClasses.textMuted}`}>{card.desc}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-12 gap-8">
                <div className={`col-span-12 lg:col-span-4 rounded-[40px] p-10 h-fit ${themeClasses.panel}`}>
                   <h2 className="text-sm font-black text-cyan-400 tracking-widest uppercase mb-10">Pirámide de Rangos Realista</h2>
                  <div className="space-y-3">
                    {RANKS_LIST.map((rank, i) => {
                      const count = stats?.ranksSummary[rank.name] || 0;
                      const percentage = stats ? (count / 10000000 * 100).toFixed(2) : 0;
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-2 px-2 text-[11px]">
                             <div className="flex items-center gap-3">
                               <rank.icon className={`${rank.color}`} size={14} />
                               <span className={`font-bold ${themeClasses.textStrong}`}>{rank.name}</span>
                             </div>
                             <span className={`font-mono font-black ${themeClasses.textStrong}`}>{count.toLocaleString()}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                             <div className="h-full bg-cyan-500/30" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={`col-span-12 lg:col-span-8 rounded-[40px] overflow-hidden flex flex-col min-h-[600px] relative shadow-2xl ${themeClasses.softPanel}`}>
                  <div className={`p-6 border-b flex justify-between items-center px-10 ${themeClasses.softPanel}`}>
                    <span className={`text-[10px] font-black font-mono tracking-[0.3em] uppercase ${themeClasses.textMuted}`}>CIERRE MASIVO ENGINE LOGS</span>
                  </div>
                  <div className={`p-10 font-mono text-[11px] space-y-3 flex-1 overflow-y-auto leading-relaxed scrollbar-hide ${themeClasses.terminal}`}>
                    {terminalLogs.map((log, i) => (
                      <p key={i} className={`${log.includes('[OK]') ? 'text-emerald-400' : 'text-slate-500'}`}>
                        &gt; {log}
                      </p>
                    ))}
                    <div ref={terminalEndRef}></div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'tree' && (
            <motion.div key="tree" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
              <div className={`flex justify-between items-center w-full max-w-5xl mb-16 p-10 rounded-[40px] backdrop-blur-xl ${themeClasses.panel}`}>
                 <div className="flex items-center gap-6">
                    <div className="p-4 bg-cyan-600/10 rounded-3xl border border-cyan-500/20 text-cyan-400"><Network size={32} /></div>
                    <div>
                      <h2 className="text-3xl font-black tracking-tighter">Árbol Genealógico</h2>
                      <p className={`text-xs font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>Navegación Visual Multinivel</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    {history.length > 0 && (
                      <button onClick={goBack} className="bg-slate-800 hover:bg-slate-700 p-4 rounded-2xl transition-all border border-slate-700 group shadow-xl">
                         <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                      </button>
                    )}
                    <div className={`flex p-2 rounded-2xl shadow-2xl ${themeClasses.softPanel}`}>
                      <input 
                        type="text" value={searchId} onChange={(e) => setSearchId(e.target.value)}
                        className="bg-transparent px-6 py-2 outline-none w-32 font-mono font-black text-cyan-400 text-lg" placeholder="ID"
                      />
                      <button onClick={() => fetchTreeUser(searchId)} className="bg-cyan-600 hover:bg-cyan-500 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">VISITAR</button>
                    </div>
                 </div>
              </div>

              {treeUser ? (
                <div className="flex flex-col items-center w-full relative">
                  <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative z-20">
                    <div className={`p-14 rounded-[50px] border-2 border-cyan-500/40 flex flex-col items-center gap-6 shadow-[0_40px_120px_rgba(8,145,178,0.25)] min-w-[380px] hover:border-cyan-400 transition-all ${themeClasses.panel}`}>
                        <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center border ${themeClasses.softPanel}`}><User size={48} className="text-cyan-400" /></div>
                        <div className="text-center">
                           <span className="px-4 py-1.5 bg-cyan-600 text-white rounded-xl text-[9px] font-black tracking-widest uppercase mb-4 inline-block">{treeUser.rank}</span>
                           <h3 className={`text-4xl font-black tracking-tighter mb-2 ${themeClasses.textStrong}`}>ID #{treeUser.id}</h3>
                           <div className="flex gap-4 mt-6">
                              <div className={`p-4 rounded-3xl text-center min-w-[120px] ${themeClasses.softPanel}`}>
                                 <p className={`text-[8px] font-black uppercase mb-1 ${themeClasses.textMuted}`}>QUALIFIED DIRECTS</p>
                                 <p className="text-xl font-black text-cyan-400">{treeUser.qualifiedDirects || 0}</p>
                              </div>
                              <div className={`p-4 rounded-3xl text-center min-w-[120px] ${themeClasses.softPanel}`}>
                                 <p className={`text-[8px] font-black uppercase mb-1 ${themeClasses.textMuted}`}>TOTAL BONOS</p>
                                 <p className="text-xl font-black text-emerald-400">${treeUser.bonus.toLocaleString()}</p>
                              </div>
                           </div>
                        </div>
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-16 bg-slate-800"></div>
                  </motion.div>

                  <div className="w-full max-w-4xl h-0.5 bg-slate-800 mt-16"></div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 w-full max-w-[1400px]">
                    {treeUser.children?.slice(0, 4).map((childId: number, i: number) => (
                      <motion.div key={childId} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="flex flex-col items-center group">
                         <div className="w-0.5 h-10 bg-slate-800 group-hover:bg-cyan-500/40 transition-colors"></div>
                         <div className={`p-10 rounded-[48px] flex flex-col items-center gap-6 hover:scale-105 transition-all shadow-3xl w-full ${themeClasses.softPanel}`}>
                            <User size={28} className="text-slate-600 group-hover:text-cyan-400 transition-colors" />
                            <p className={`text-2xl font-black tracking-tighter font-mono ${themeClasses.textStrong}`}>#{childId}</p>
                            <button onClick={() => fetchTreeUser(childId.toString())} className="w-full py-4 rounded-[22px] bg-white/5 group-hover:bg-cyan-600 text-slate-500 group-hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">Explorar Rama</button>
                         </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[600px] flex items-center justify-center opacity-10"><Network size={160} className="animate-pulse" /></div>
              )}
            </motion.div>
          )}

          {activeTab === 'simulation' && (
            <motion.div key="simulation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-12 gap-10">
              <div className="col-span-12 lg:col-span-6 space-y-8">
                 <div className={`p-12 rounded-[48px] backdrop-blur-md ${themeClasses.panel}`}>
                    <h2 className="text-3xl font-black tracking-tight mb-12 flex items-center gap-4"><Zap className="text-cyan-400" /> Inyector Masivo de Datos</h2>
                    
                    <div className="space-y-8">
                       <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-4">
                            <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${themeClasses.textMuted}`}>ID Inicial (Target User)</label>
                            <input type="number" value={simId} onChange={(e) => setSimId(e.target.value)} className={`w-full p-6 rounded-3xl text-2xl font-black font-mono outline-none focus:border-cyan-500 text-cyan-400 shadow-inner ${themeClasses.input}`} placeholder="0"/>
                         </div>
                         <div className="space-y-4">
                            <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${themeClasses.textMuted}`}>Cant. Usuarios (Batch)</label>
                            <input type="number" value={simCount} onChange={(e) => setSimCount(e.target.value)} className={`w-full p-6 rounded-3xl text-2xl font-black font-mono outline-none focus:border-amber-500 text-amber-500 shadow-inner ${themeClasses.input}`} placeholder="1000"/>
                         </div>
                       </div>
                       
                       <div className="space-y-4">
                          <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${themeClasses.textMuted}`}>Puntos PV a Inyectar</label>
                          <input type="number" value={simVolume} onChange={(e) => setSimVolume(e.target.value)} className={`w-full p-6 rounded-3xl text-3xl font-black font-mono outline-none focus:border-emerald-500 text-emerald-400 shadow-inner ${themeClasses.input}`} placeholder="200.00"/>
                       </div>

                       <button onClick={createTransaction} className="w-full bg-cyan-600 hover:bg-cyan-500 py-8 rounded-[32px] font-black text-white text-xl tracking-widest active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-4">
                          <Rocket size={24}/> INYECTAR EN MASA A POSTGRES
                       </button>
                    </div>
                 </div>

                 <div className={`p-10 rounded-[40px] text-[11px] font-bold leading-relaxed space-y-4 ${themeClasses.softPanel} ${themeClasses.textMuted}`}>
                    <p className="flex items-center gap-2 text-cyan-400 uppercase tracking-widest"><ShieldCheck size={14}/> Reglas de Inyección Escalable</p>
                    <p>* El sistema procesará transacciones para el usuario inicial y los N IDs consecutivos.</p>
                    <p>* Útil para simular que toda una rama de la red (ej: 5,000 personas) compró productos simultáneamente.</p>
                 </div>
              </div>

              <div className={`col-span-12 lg:col-span-6 p-12 rounded-[48px] backdrop-blur-md ${themeClasses.panel}`}>
                 <h3 className={`text-xs font-black uppercase tracking-widest mb-12 flex items-center gap-3 ${themeClasses.textMuted}`}>
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div> Inyección en curso Feed
                 </h3>
                 <div className="space-y-4 flex-1">
                    {txLog.map(tx => (
                      <div key={tx.id} className={`p-8 rounded-[36px] flex items-center justify-between group ${themeClasses.softPanel}`}>
                         <div className="flex items-center gap-6">
                            <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-400"><TrendingUp size={24} /></div>
                            <div>
                               <p className="text-lg font-black tracking-tight">Batch: {tx.count} Usuarios</p>
                               <p className={`text-[10px] font-mono tracking-tighter ${themeClasses.textMuted}`}>DESDE ID #{tx.userId} • {tx.time}</p>
                            </div>
                         </div>
                         <p className="text-2xl font-black text-emerald-400 font-mono tracking-tighter">+{tx.volume} PV/u</p>
                      </div>
                    ))}
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
