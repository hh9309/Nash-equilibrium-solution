/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  BookOpen, 
  Activity, 
  HelpCircle, 
  Zap, 
  BrainCircuit, 
  Cpu, 
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  TrendingUp,
  Share2,
  RefreshCw,
  Terminal
} from "lucide-react";
import { 
  GameMode, 
  DiscreteGameConfig, 
  CournotConfig, 
  SequentialGameConfig, 
  EvolutionaryConfig, 
  SolverStepLog 
} from "./types";
import DiscreteGameTab from "./components/DiscreteGameTab";
import CournotGameTab from "./components/CournotGameTab";
import SequentialGameTab from "./components/SequentialGameTab";
import EvolutionaryGameTab from "./components/EvolutionaryGameTab";
import AcademicReportModal from "./components/AcademicReportModal";
import StudySuiteModal from "./components/StudySuiteModal";

export default function App() {
  const [activeMode, setActiveMode] = useState<GameMode>(GameMode.DISCRETE);
  
  // 1. Core States for Game Modes
  const [configDiscrete, setConfigDiscrete] = useState<DiscreteGameConfig>({
    rows: 2,
    cols: 2,
    rowLabels: ["合作 (Cooperate)", "背叛 (Defect)"],
    colLabels: ["合作 (Cooperate)", "背叛 (Defect)"],
    matrix: [
      [{ u1: 3, u2: 3 }, { u1: 0, u2: 5 }],
      [{ u1: 5, u2: 0 }, { u1: 1, u2: 1 }]
    ]
  });

  const [configCournot, setConfigCournot] = useState<CournotConfig>({
    a: 120,
    b: 2,
    c1: 20,
    c2: 30
  });

  const [configSequential, setConfigSequential] = useState<SequentialGameConfig>({
    rootId: "root",
    nodes: {
      "root": { id: "root", label: "阶段1 (P1)", player: 1, children: ["leaf1", "stage2"], actionLabel: "Terminate (T)" },
      "leaf1": { id: "leaf1", label: "T1 (2, 2)", player: 0, children: [], payoffs: { u1: 2, u2: 2 }, actionLabel: "Terminate (T)" },
      
      "stage2": { id: "stage2", label: "阶段2 (P2)", player: 2, children: ["leaf2", "stage3"], actionLabel: "Continue (C)" },
      "leaf2": { id: "leaf2", label: "T2 (1, 4)", player: 0, children: [], payoffs: { u1: 1, u2: 4 }, actionLabel: "Terminate (T)" },
      
      "stage3": { id: "stage3", label: "阶段3 (P1)", player: 1, children: ["leaf3", "stage4"], actionLabel: "Continue (C)" },
      "leaf3": { id: "leaf3", label: "T3 (4, 3)", player: 0, children: [], payoffs: { u1: 4, u2: 3 }, actionLabel: "Terminate (T)" },
      
      "stage4": { id: "stage4", label: "阶段4 (P2)", player: 2, children: ["leaf4", "leaf_end"], actionLabel: "Continue (C)" },
      "leaf4": { id: "leaf4", label: "T4 (3, 6)", player: 0, children: [], payoffs: { u1: 3, u2: 6 }, actionLabel: "Terminate (T)" },
      "leaf_end": { id: "leaf_end", label: "T5 (5, 5)", player: 0, children: [], payoffs: { u1: 5, u2: 5 }, actionLabel: "Continue (C)" },
    }
  });

  const [configEvolutionary, setConfigEvolutionary] = useState<EvolutionaryConfig>({
    V: 50,
    W: 25,
    e: 8,
    h: 4,
    F: 12,
    L: 20,
    initX: 0.5,
    initY: 0.5
  });

  // 2. Shared Solver & Debugger Animation States
  const [solverStep, setSolverStep] = useState<number>(0);
  const [totalSteps, setTotalSteps] = useState<number>(10);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [logs, setLogs] = useState<SolverStepLog[]>([]);
  const [highlightedCodeLine, setHighlightedCodeLine] = useState<number>(1);

  // 3. AI Insight states
  const [aiInsight, setAiInsight] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>("");

  // 4. Modal Exporter states
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isStudySuiteOpen, setIsStudySuiteOpen] = useState<boolean>(false);
  const [studySuiteTab, setStudySuiteTab] = useState<"guide" | "python" | "ai" | "visual">("guide");

  // Clear logs & reset step when switching tab modes
  useEffect(() => {
    setLogs([]);
    setSolverStep(0);
    setIsPlaying(false);
    setAiInsight("");
    setAiError("");
    
    // Set appropriate starting code lines for each tab
    if (activeMode === GameMode.DISCRETE) setHighlightedCodeLine(1);
    if (activeMode === GameMode.COURNOT) setHighlightedCodeLine(21);
    if (activeMode === GameMode.SEQUENTIAL) setHighlightedCodeLine(41);
    if (activeMode === GameMode.EVOLUTIONARY) setHighlightedCodeLine(61);
  }, [activeMode]);

  // Logging Helper
  const handleLog = (message: string, type: "info" | "success" | "warn" = "info") => {
    const timestamp = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    const logId = Math.random().toString(36).substring(7);
    const newLog: SolverStepLog = {
      id: logId,
      stepIndex: solverStep,
      message,
      timestamp,
      type
    };
    setLogs((prev) => [...prev, newLog]);
  };

  // 5. Trigger Server-side AI Diagnostics (Gemini)
  const generateAiDiagnostics = async () => {
    setIsAiLoading(true);
    setAiError("");
    setAiInsight("");

    try {
      // Gather active game context payload
      let payload: any = {};

      if (activeMode === GameMode.DISCRETE) {
        // Compute current discrete solutions for context
        const pureEqs: string[] = [];
        // Quick analytical pass
        for (let r = 0; r < configDiscrete.rows; r++) {
          for (let c = 0; c < configDiscrete.cols; c++) {
            // Find row/col max values for best response
            const maxU1InCol = Math.max(...configDiscrete.matrix.map(row => row[c].u1));
            const maxU2InRow = Math.max(...configDiscrete.matrix[r].map(cell => cell.u2));
            if (configDiscrete.matrix[r][c].u1 === maxU1InCol && configDiscrete.matrix[r][c].u2 === maxU2InRow) {
              pureEqs.push(`(${configDiscrete.rowLabels[r]}, ${configDiscrete.colLabels[c]})`);
            }
          }
        }

        payload = {
          game_type: "离散双人矩阵静态对抗博弈",
          player_names: ["行参与者 (Player 1)", "列参与者 (Player 2)"],
          structure: {
            dimensions: `${configDiscrete.rows}x${configDiscrete.cols}`,
            matrix: configDiscrete.matrix.map((row, r) => 
              row.map((cell, c) => `${configDiscrete.rowLabels[r]}/${configDiscrete.colLabels[c]}: (${cell.u1}, ${cell.u2})`)
            )
          },
          calculated_equilibrium: {
            type: "Nash_Equilibrium",
            pure_solutions: pureEqs.length > 0 ? pureEqs.join(", ") : "无纯策略均衡"
          }
        };
      } else if (activeMode === GameMode.COURNOT) {
        // Analytical outputs
        const { a, b, c1, c2 } = configCournot;
        const q1Raw = (a - 2 * c1 + c2) / (3 * b);
        const q2Raw = (a - 2 * c2 + c1) / (3 * b);

        let q1Star = q1Raw;
        let q2Star = q2Raw;

        if (q1Raw <= 0) {
          q1Star = 0;
          q2Star = Math.max(0, (a - c2) / (2 * b));
        } else if (q2Raw <= 0) {
          q2Star = 0;
          q1Star = Math.max(0, (a - c1) / (2 * b));
        }
        const price = Math.max(0, a - b * (q1Star + q2Star));

        payload = {
          game_type: "古诺（Cournot）连续函数产量竞争博弈",
          player_names: ["企业 1 (Firm 1)", "企业 2 (Firm 2)"],
          structure: {
            demand_function: `P = ${a} - ${b}(q1 + q2)`,
            marginal_costs: `c1 = ${c1}, c2 = ${c2}`
          },
          calculated_equilibrium: {
            type: "Cournot_Nash_Equilibrium",
            firm1_quantity: q1Star.toFixed(3),
            firm2_quantity: q2Star.toFixed(3),
            market_price: price.toFixed(3),
            firm1_profit: ((price - c1) * q1Star).toFixed(3),
            firm2_profit: ((price - c2) * q2Star).toFixed(3)
          }
        };
      } else if (activeMode === GameMode.SEQUENTIAL) {
        payload = {
          game_type: "多阶段动态顺序决策博弈 (Dynamic Tree Game)",
          player_names: ["局中人 1 (Player 1)", "局中人 2 (Player 2)"],
          structure: "顺序信息博弈树结构模型",
          calculated_equilibrium: {
            type: "Subgame_Perfect_Nash_Equilibrium",
            resolution_method: "逆向归纳法 (Backwards Induction)"
          }
        };
      } else if (activeMode === GameMode.EVOLUTIONARY) {
        const { e, h, F } = configEvolutionary;
        payload = {
          game_type: "复制动态（Replicator Dynamics）非对称演化博弈",
          player_names: ["监管方雇主 (Employers)", "被监管方雇员 (Employees)"],
          structure: {
            inspection_cost: h,
            worker_effort_cost: e,
            shirking_penalty: F,
            wage: configEvolutionary.W
          },
          calculated_equilibrium: {
            type: "Evolutionary_Stable_Strategy_ESS",
            interior_focus_x_inspect: (e / F).toFixed(3),
            interior_focus_y_work: (1 - h / F).toFixed(3)
          }
        };
      }

      // Call Express Backend API route proxying Gemini 3.5 Flash
      const response = await fetch("/api/gemini/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "获取 AI 诊断失败");
      }

      setAiInsight(data.insight);
      handleLog(`成功生成博弈 AI 诊断洞察报告`, "success");
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "无法呼叫 AI 诊断引擎");
      handleLog(`AI 诊断引擎呼叫异常: ${err.message}`, "warn");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F7] flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* 1. Global Navigation Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-xs shrink-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Logo & title brand */}
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white rounded-xl p-2 flex items-center justify-center shadow-md shadow-indigo-100">
              <BrainCircuit className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-bold font-display text-slate-800 flex items-center gap-2">
                纳什均衡求解与博弈演化
                <span className="text-[10px] bg-indigo-50 text-indigo-600 rounded-sm px-1.5 py-0.5 font-bold tracking-wider font-mono">
                  ACADEMIC V2.6
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 mt-0.5">
                集成式微观经济学符号推导、多维流相图数值积分与 AI 智能体决策论证
              </p>
            </div>
          </div>

          {/* Export & Action Panel */}
          <div className="flex items-center gap-3">
            {/* 4 Slices (知识导引, Python验证, AI洞察, 数据可视化) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/50">
              <button
                onClick={() => {
                  setStudySuiteTab("guide");
                  setIsStudySuiteOpen(true);
                }}
                className="px-3 py-1.5 hover:bg-white hover:text-slate-900 hover:shadow-xs text-slate-600 rounded-lg text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                <span>知识导引</span>
              </button>
              <button
                onClick={() => {
                  setStudySuiteTab("python");
                  setIsStudySuiteOpen(true);
                }}
                className="px-3 py-1.5 hover:bg-white hover:text-slate-900 hover:shadow-xs text-slate-600 rounded-lg text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                <span>Python验证</span>
              </button>
              <button
                onClick={() => {
                  setStudySuiteTab("ai");
                  setIsStudySuiteOpen(true);
                }}
                className="px-3 py-1.5 hover:bg-white hover:text-slate-900 hover:shadow-xs text-slate-600 rounded-lg text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span>AI洞察</span>
              </button>
              <button
                onClick={() => {
                  setStudySuiteTab("visual");
                  setIsStudySuiteOpen(true);
                }}
                className="px-3 py-1.5 hover:bg-white hover:text-slate-900 hover:shadow-xs text-slate-600 rounded-lg text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
              >
                <Activity className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                <span>数据可视化</span>
              </button>
            </div>

            <button
              onClick={() => setIsReportOpen(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl shadow-xs transition text-xs font-bold font-display flex items-center gap-1.5 active:scale-95"
            >
              <BookOpen className="w-4 h-4" />
              导出学术分析报告 (Export Report)
            </button>
          </div>
        </div>
      </header>

      {/* 2. Primary Three-Column Content Framework */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden">
        
        {/* Left + Middle Tab-controlled main workspace */}
        <div className="lg:col-span-12 flex flex-col gap-5 h-full">
          
          {/* Tabs bar selector */}
          <div className="bg-white p-1.5 rounded-xl border border-slate-100 shadow-xs flex items-center gap-1 shrink-0">
            <button
              onClick={() => setActiveMode(GameMode.DISCRETE)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold font-display transition flex items-center justify-center gap-2 ${
                activeMode === GameMode.DISCRETE
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              离散收益矩阵 (Matrix)
            </button>

            <button
              onClick={() => setActiveMode(GameMode.COURNOT)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold font-display transition flex items-center justify-center gap-2 ${
                activeMode === GameMode.COURNOT
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              古诺产量双寡头 (Cournot)
            </button>

            <button
              onClick={() => setActiveMode(GameMode.SEQUENTIAL)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold font-display transition flex items-center justify-center gap-2 ${
                activeMode === GameMode.SEQUENTIAL
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              动态博弈决策树 (Sequential)
            </button>

            <button
              onClick={() => setActiveMode(GameMode.EVOLUTIONARY)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold font-display transition flex items-center justify-center gap-2 ${
                activeMode === GameMode.EVOLUTIONARY
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              复制动态演化 (Evolutionary)
            </button>
          </div>

          {/* Active Tab render container */}
          <div className="flex-1 min-h-0 bg-transparent">
            {activeMode === GameMode.DISCRETE && (
              <DiscreteGameTab
                config={configDiscrete}
                setConfig={setConfigDiscrete}
                onLog={handleLog}
                onSelectCodeLine={setHighlightedCodeLine}
                solverStep={solverStep}
                setSolverStep={setSolverStep}
                setTotalSteps={setTotalSteps}
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
              />
            )}

            {activeMode === GameMode.COURNOT && (
              <CournotGameTab
                config={configCournot}
                setConfig={setConfigCournot}
                onLog={handleLog}
                onSelectCodeLine={setHighlightedCodeLine}
                solverStep={solverStep}
                setSolverStep={setSolverStep}
                setTotalSteps={setTotalSteps}
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
              />
            )}

            {activeMode === GameMode.SEQUENTIAL && (
              <SequentialGameTab
                config={configSequential}
                setConfig={setConfigSequential}
                onLog={handleLog}
                onSelectCodeLine={setHighlightedCodeLine}
                solverStep={solverStep}
                setSolverStep={setSolverStep}
                setTotalSteps={setTotalSteps}
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
              />
            )}

            {activeMode === GameMode.EVOLUTIONARY && (
              <EvolutionaryGameTab
                config={configEvolutionary}
                setConfig={setConfigEvolutionary}
                onLog={handleLog}
                onSelectCodeLine={setHighlightedCodeLine}
                solverStep={solverStep}
                setSolverStep={setSolverStep}
                setTotalSteps={setTotalSteps}
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
              />
            )}
          </div>
        </div>
      </main>

      {/* 3. Academic LaTeX Exporter Modal Overlay */}
      <AcademicReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        mode={activeMode}
        configDiscrete={configDiscrete}
        configCournot={configCournot}
        configSequential={configSequential}
        configEvolutionary={configEvolutionary}
        aiInsight={aiInsight}
        onGenerateAi={generateAiDiagnostics}
        isAiLoading={isAiLoading}
        aiError={aiError}
      />

      {/* 4. Academic Multi-Tab Study Suite (Knowledge, Python code replication, and AI Diagnostics) */}
      <StudySuiteModal
        isOpen={isStudySuiteOpen}
        onClose={() => setIsStudySuiteOpen(false)}
        activeTab={studySuiteTab}
        setActiveTab={setStudySuiteTab}
        mode={activeMode}
        configDiscrete={configDiscrete}
        configCournot={configCournot}
        configSequential={configSequential}
        configEvolutionary={configEvolutionary}
        aiInsight={aiInsight}
        onGenerateAi={generateAiDiagnostics}
        isAiLoading={isAiLoading}
        aiError={aiError}
      />
    </div>
  );
}
