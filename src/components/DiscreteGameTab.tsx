/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, ChevronRight, RotateCcw, AlertCircle, HelpCircle, Check, Sparkles, TrendingUp, Percent, Info } from "lucide-react";
import { DiscreteGameConfig, Payoff, DiscretePreset } from "../types";

const DISCRETE_PRESETS: DiscretePreset[] = [
  {
    name: "囚徒困境 (Prisoner's Dilemma)",
    description: "经典非合作博弈，个体理性导致集体非理性投降。",
    rows: 2,
    cols: 2,
    rowLabels: ["抵赖 (Cooperate)", "坦白 (Defect)"],
    colLabels: ["抵赖 (Cooperate)", "坦白 (Defect)"],
    matrix: [
      [{ u1: -1, u2: -1 }, { u1: -9, u2: 0 }],
      [{ u1: 0, u2: -9 }, { u1: -6, u2: -6 }]
    ]
  },
  {
    name: "懦夫博弈 (Chicken Game / Hawk-Dove)",
    description: "又称鹰鸽博弈，互不退让导致毁灭性灾难，一人妥协则获得相对优势。",
    rows: 2,
    cols: 2,
    rowLabels: ["妥协 (Dove/Cooperate)", "前进 (Hawk/Defect)"],
    colLabels: ["妥协 (Dove/Cooperate)", "前进 (Hawk/Defect)"],
    matrix: [
      [{ u1: 2, u2: 2 }, { u1: 0, u2: 5 }],
      [{ u1: 5, u2: 0 }, { u1: -10, u2: -10 }]
    ]
  },
  {
    name: "猎鹿博弈 (Stag Hunt)",
    description: "安全（小鹿）与高回报（大鹿）之间的信任博弈模型。",
    rows: 2,
    cols: 2,
    rowLabels: ["合作猎鹿 (Stag)", "独自捕兔 (Hare)"],
    colLabels: ["合作猎鹿 (Stag)", "独自捕兔 (Hare)"],
    matrix: [
      [{ u1: 5, u2: 5 }, { u1: 0, u2: 3 }],
      [{ u1: 3, u2: 0 }, { u1: 3, u2: 3 }]
    ]
  },
  {
    name: "智猪博弈 (Boxed Pigs)",
    description: "多劳不一定多得，弱者搭便车策略的均衡模型。",
    rows: 2,
    cols: 2,
    rowLabels: ["等待 (Wait)", "行动 (Act)"],
    colLabels: ["等待 (Wait)", "行动 (Act)"],
    matrix: [
      [{ u1: 0, u2: 0 }, { u1: 1, u2: 9 }],
      [{ u1: 4, u2: 1 }, { u1: 3, u2: 5 }]
    ]
  },
  {
    name: "性别战 (Battle of the Sexes)",
    description: "偏好不一的协调博弈，多重纯策略纳什均衡。",
    rows: 2,
    cols: 2,
    rowLabels: ["歌剧 (Opera)", "足球 (Football)"],
    colLabels: ["歌剧 (Opera)", "足球 (Football)"],
    matrix: [
      [{ u1: 3, u2: 2 }, { u1: 0, u2: 0 }],
      [{ u1: 0, u2: 0 }, { u1: 2, u2: 3 }]
    ]
  },
  {
    name: "便士匹配 (Matching Pennies)",
    description: "纯零和博弈，无纯策略纳什均衡，只有混合均衡。",
    rows: 2,
    cols: 2,
    rowLabels: ["正面 (Heads)", "反面 (Tails)"],
    colLabels: ["正面 (Heads)", "反面 (Tails)"],
    matrix: [
      [{ u1: 1, u2: -1 }, { u1: -1, u2: 1 }],
      [{ u1: -1, u2: 1 }, { u1: 1, u2: -1 }]
    ]
  }
];

interface DiscreteGameTabProps {
  config: DiscreteGameConfig;
  setConfig: React.Dispatch<React.SetStateAction<DiscreteGameConfig>>;
  onLog: (msg: string, type?: "info" | "success" | "warn") => void;
  onSelectCodeLine: (lineNum: number) => void;
  solverStep: number;
  setSolverStep: React.Dispatch<React.SetStateAction<number>>;
  setTotalSteps: (steps: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
}

export default function DiscreteGameTab({
  config,
  setConfig,
  onLog,
  onSelectCodeLine,
  solverStep,
  setSolverStep,
  setTotalSteps,
  isPlaying,
  setIsPlaying,
}: DiscreteGameTabProps) {
  const [pureNE, setPureNE] = useState<[number, number][]>([]);
  const [mixedNE, setMixedNE] = useState<{ p: number; q: number } | null>(null);
  const [p1BestResponses, setP1BestResponses] = useState<Record<number, number[]>>({}); // colIndex -> rowIndices
  const [p2BestResponses, setP2BestResponses] = useState<Record<number, number[]>>({}); // rowIndex -> colIndices
  const [sliderP, setSliderP] = useState<number>(0.5);
  const [sliderQ, setSliderQ] = useState<number>(0.5);

  useEffect(() => {
    if (config.rows === 2 && config.cols === 2) {
      if (mixedNE) {
        setSliderP(mixedNE.p);
        setSliderQ(mixedNE.q);
      } else {
        setSliderP(0.5);
        setSliderQ(0.5);
      }
    }
  }, [config, mixedNE]);

  // 1. Calculate Best Responses and NE
  useEffect(() => {
    // Player 1 Best Response: for each column, find rows that maximize u1
    const p1BR: Record<number, number[]> = {};
    for (let c = 0; c < config.cols; c++) {
      let maxVal = -Infinity;
      let maxRows: number[] = [];
      for (let r = 0; r < config.rows; r++) {
        const val = config.matrix[r][c].u1;
        if (val > maxVal) {
          maxVal = val;
          maxRows = [r];
        } else if (val === maxVal) {
          maxRows.push(r);
        }
      }
      p1BR[c] = maxRows;
    }

    // Player 2 Best Response: for each row, find columns that maximize u2
    const p2BR: Record<number, number[]> = {};
    for (let r = 0; r < config.rows; r++) {
      let maxVal = -Infinity;
      let maxCols: number[] = [];
      for (let c = 0; c < config.cols; c++) {
        const val = config.matrix[r][c].u2;
        if (val > maxVal) {
          maxVal = val;
          maxCols = [c];
        } else if (val === maxVal) {
          maxCols.push(c);
        }
      }
      p2BR[r] = maxCols;
    }

    setP1BestResponses(p1BR);
    setP2BestResponses(p2BR);

    // Pure Nash Equilibria
    const pure: [number, number][] = [];
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        // Cell is NE if Row r is a best response to Col c, AND Col c is a best response to Row r
        if (p1BR[c]?.includes(r) && p2BR[r]?.includes(c)) {
          pure.push([r, c]);
        }
      }
    }
    setPureNE(pure);

    // 2x2 Mixed strategy solving
    if (config.rows === 2 && config.cols === 2) {
      const u1_00 = config.matrix[0][0].u1;
      const u1_01 = config.matrix[0][1].u1;
      const u1_10 = config.matrix[1][0].u1;
      const u1_11 = config.matrix[1][1].u1;

      const u2_00 = config.matrix[0][0].u2;
      const u2_01 = config.matrix[0][1].u2;
      const u2_10 = config.matrix[1][0].u2;
      const u2_11 = config.matrix[1][1].u2;

      // P1 plays row 0 with prob p, row 1 with (1-p).
      // P2 indifferent between col 0 and col 1: p*u2_00 + (1-p)*u2_10 = p*u2_01 + (1-p)*u2_11
      const denP = (u2_00 - u2_10 - u2_01 + u2_11);
      const numP = u2_11 - u2_10;
      let p: number | null = null;
      if (Math.abs(denP) > 1e-6) {
        const tempP = numP / denP;
        if (tempP >= 0 && tempP <= 1) p = tempP;
      }

      // P2 plays col 0 with prob q, col 1 with (1-q).
      // P1 indifferent between row 0 and row 1: q*u1_00 + (1-q)*u1_01 = q*u1_10 + (1-q)*u1_11
      const denQ = (u1_00 - u1_01 - u1_10 + u1_11);
      const numQ = u1_11 - u1_01;
      let q: number | null = null;
      if (Math.abs(denQ) > 1e-6) {
        const tempQ = numQ / denQ;
        if (tempQ >= 0 && tempQ <= 1) q = tempQ;
      }

      if (p !== null && q !== null) {
        setMixedNE({ p, q });
      } else {
        setMixedNE(null);
      }
    } else {
      setMixedNE(null);
    }
  }, [config]);

  // Handle Dimension Change
  const handleDimensionChange = (type: "rows" | "cols", increment: boolean) => {
    setConfig((prev) => {
      const currentVal = prev[type];
      const newVal = increment ? Math.min(5, currentVal + 1) : Math.max(2, currentVal - 1);
      if (newVal === currentVal) return prev;

      const newRows = type === "rows" ? newVal : prev.rows;
      const newCols = type === "cols" ? newVal : prev.cols;

      // Rebuild labels
      const newRowLabels = [...prev.rowLabels];
      const newColLabels = [...prev.colLabels];

      if (type === "rows") {
        if (increment) {
          newRowLabels.push(`策略 A${newRows} (Strategy A${newRows})`);
        } else {
          newRowLabels.pop();
        }
      } else {
        if (increment) {
          newColLabels.push(`策略 B${newCols} (Strategy B${newCols})`);
        } else {
          newColLabels.pop();
        }
      }

      // Rebuild matrix
      const newMatrix: Payoff[][] = [];
      for (let r = 0; r < newRows; r++) {
        const rowArr: Payoff[] = [];
        for (let c = 0; c < newCols; c++) {
          if (prev.matrix[r] && prev.matrix[r][c]) {
            rowArr.push({ ...prev.matrix[r][c] });
          } else {
            rowArr.push({ u1: 2, u2: 2 });
          }
        }
        newMatrix.push(rowArr);
      }

      onLog(`调整博弈维度为 ${newRows} × ${newCols}`, "info");

      return {
        rows: newRows,
        cols: newCols,
        rowLabels: newRowLabels,
        colLabels: newColLabels,
        matrix: newMatrix
      };
    });
    setSolverStep(0);
  };

  // Preset Selection
  const applyPreset = (preset: DiscretePreset) => {
    setConfig({
      rows: preset.rows,
      cols: preset.cols,
      rowLabels: [...preset.rowLabels],
      colLabels: [...preset.colLabels],
      matrix: preset.matrix.map((row) => row.map((cell) => ({ ...cell })))
    });
    setSolverStep(0);
    setIsPlaying(false);
    onLog(`加载博弈预设: ${preset.name}`, "success");
  };

  // Matrix payoff edit
  const handlePayoffChange = (r: number, c: number, player: "u1" | "u2", val: string) => {
    const num = parseInt(val);
    if (isNaN(num)) return;

    setConfig((prev) => {
      const newMatrix = prev.matrix.map((rowArr, rowIndex) =>
        rowArr.map((cell, colIndex) => {
          if (rowIndex === r && colIndex === c) {
            return {
              ...cell,
              [player]: num
            };
          }
          return cell;
        })
      );
      return {
        ...prev,
        matrix: newMatrix
      };
    });
    setSolverStep(0);
  };

  // Step-by-Step Solver Animation Calculation
  // Step 0: Welcome & Initial Matrix Display
  // Step 1 to config.cols: Column scans for Player 1 (finding max of each column)
  // Step config.cols + 1 to config.cols + config.rows: Row scans for Player 2 (finding max of each row)
  // Last step: Intersection and highlighting of Nash Equilibria
  const totalAnimationSteps = config.cols + config.rows + 2;

  useEffect(() => {
    setTotalSteps(totalAnimationSteps);
  }, [config, setTotalSteps]);

  // Handle visual effects when solverStep changes
  useEffect(() => {
    if (solverStep === 0) {
      onSelectCodeLine(1);
    } else if (solverStep >= 1 && solverStep <= config.cols) {
      const colIdx = solverStep - 1;
      const bestRows = p1BestResponses[colIdx] || [];
      const bestVals = bestRows.map(r => config.matrix[r][colIdx].u1).join("/");
      onSelectCodeLine(6);
      onLog(`扫描第 ${colIdx + 1} 列 (Player 2 选择 ${config.colLabels[colIdx]})：Player 1 最优反应在策略 ${bestRows.map(r => r + 1).join(", ")}，最大收益为 ${bestVals}。对该格 Player 1 的收益 [划底线] 标记。`, "info");
    } else if (solverStep > config.cols && solverStep <= config.cols + config.rows) {
      const rowIdx = solverStep - config.cols - 1;
      const bestCols = p2BestResponses[rowIdx] || [];
      const bestVals = bestCols.map(c => config.matrix[rowIdx][c].u2).join("/");
      onSelectCodeLine(12);
      onLog(`扫描第 ${rowIdx + 1} 行 (Player 1 选择 ${config.rowLabels[rowIdx]})：Player 2 最优反应在策略 ${bestCols.map(c => c + 1).join(", ")}，最大收益为 ${bestVals}。对该格 Player 2 的收益 [画方框] 标记。`, "info");
    } else if (solverStep === config.cols + config.rows + 1) {
      onSelectCodeLine(18);
      if (pureNE.length > 0) {
        onLog(`求解完成！找到 ${pureNE.length} 个纯策略纳什均衡（[划底线] 与 [画方框] 相互重合的单元格）：${pureNE.map(([r, c]) => `(${config.rowLabels[r]}, ${config.colLabels[c]})`).join("，")}`, "success");
      } else {
        onLog(`求解完成！在当前的策略集中未发现纯策略纳什均衡。`, "warn");
      }
    }
  }, [solverStep, config, p1BestResponses, p2BestResponses, pureNE]);

  // Autoplay Loop
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setSolverStep((prev) => {
          if (prev >= totalAnimationSteps - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
    }
    return () => clearInterval(timer);
  }, [isPlaying, totalAnimationSteps]);

  // Reset solver
  const handleReset = () => {
    setSolverStep(0);
    setIsPlaying(false);
    onLog("重置离散博弈求解器状态", "info");
  };

  const activePreset = DISCRETE_PRESETS.find(p => {
    if (p.rows !== config.rows || p.cols !== config.cols) return false;
    for (let r = 0; r < config.rows; r++) {
      if (p.rowLabels[r] !== config.rowLabels[r]) return false;
    }
    for (let c = 0; c < config.cols; c++) {
      if (p.colLabels[c] !== config.colLabels[c]) return false;
    }
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        if (p.matrix[r][c].u1 !== config.matrix[r][c].u1 || p.matrix[r][c].u2 !== config.matrix[r][c].u2) return false;
      }
    }
    return true;
  })?.name || "custom";

  // 2x2 Expected utility calculations for mixed strategies
  const u1_00 = config.rows === 2 && config.cols === 2 ? config.matrix[0][0].u1 : 0;
  const u1_01 = config.rows === 2 && config.cols === 2 ? config.matrix[0][1].u1 : 0;
  const u1_10 = config.rows === 2 && config.cols === 2 ? config.matrix[1][0].u1 : 0;
  const u1_11 = config.rows === 2 && config.cols === 2 ? config.matrix[1][1].u1 : 0;

  const u2_00 = config.rows === 2 && config.cols === 2 ? config.matrix[0][0].u2 : 0;
  const u2_01 = config.rows === 2 && config.cols === 2 ? config.matrix[0][1].u2 : 0;
  const u2_10 = config.rows === 2 && config.cols === 2 ? config.matrix[1][0].u2 : 0;
  const u2_11 = config.rows === 2 && config.cols === 2 ? config.matrix[1][1].u2 : 0;

  const eu1_row1 = sliderQ * u1_00 + (1 - sliderQ) * u1_01;
  const eu1_row2 = sliderQ * u1_10 + (1 - sliderQ) * u1_11;
  const eu1_total = sliderP * eu1_row1 + (1 - sliderP) * eu1_row2;

  const eu2_col1 = sliderP * u2_00 + (1 - sliderP) * u2_10;
  const eu2_col2 = sliderP * u2_01 + (1 - sliderP) * u2_11;
  const eu2_total = sliderQ * eu2_col1 + (1 - sliderQ) * eu2_col2;

  return (
    <div id="discrete-game-tab" className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* 1. Left controls panel */}
      <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-semibold font-display text-slate-800 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            1. 博弈结构配置
          </h2>
          <p className="text-xs text-slate-500 mt-1">支持 2x2 到 5x5 的收益矩阵设定与微调</p>
        </div>

        {/* Scenic Dropdown Presets */}
        <div className="p-3.5 bg-indigo-50/50 border border-indigo-100/50 rounded-xl space-y-2.5">
          <label className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
            快速应用经典博弈场景 (Presets Selector)
          </label>
          <select
            value={activePreset}
            onChange={(e) => {
              const selected = DISCRETE_PRESETS.find(p => p.name === e.target.value);
              if (selected) {
                applyPreset(selected);
              }
            }}
            className="w-full bg-white border border-slate-200 hover:border-indigo-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition"
          >
            <option value="custom" disabled>-- 🎛️ 自定义修改的参数模型 --</option>
            {DISCRETE_PRESETS.map((preset) => (
              <option key={preset.name} value={preset.name}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>

        {/* Matrix Dimension Pickers */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-slate-600 block">矩阵维度设定</label>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-2 px-3">
              <span className="text-sm font-medium text-slate-700">行数 (Player 1)</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDimensionChange("rows", false)}
                  className="w-7 h-7 rounded-lg bg-white shadow-sm border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95 transition flex items-center justify-center font-bold"
                >
                  -
                </button>
                <span className="text-sm font-semibold text-slate-800 min-w-[12px] text-center">{config.rows}</span>
                <button
                  onClick={() => handleDimensionChange("rows", true)}
                  className="w-7 h-7 rounded-lg bg-white shadow-sm border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95 transition flex items-center justify-center font-bold"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-2 px-3">
              <span className="text-sm font-medium text-slate-700">列数 (Player 2)</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDimensionChange("cols", false)}
                  className="w-7 h-7 rounded-lg bg-white shadow-sm border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95 transition flex items-center justify-center font-bold"
                >
                  -
                </button>
                <span className="text-sm font-semibold text-slate-800 min-w-[12px] text-center">{config.cols}</span>
                <button
                  onClick={() => handleDimensionChange("cols", true)}
                  className="w-7 h-7 rounded-lg bg-white shadow-sm border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95 transition flex items-center justify-center font-bold"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-slate-600 block flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            微观经济学博弈经典预设
          </label>
          <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-1">
            {DISCRETE_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="text-left p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition group flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600 transition">
                    {preset.name.split(" ")[0]}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {preset.rows}x{preset.cols}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                  {preset.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Solver Indicator status */}
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
          <span className="text-xs font-semibold text-slate-700 block">求解结果速览</span>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200/60 text-slate-600">
              <span>纯策略纳什均衡 (Pure NE):</span>
              <span className="font-bold text-emerald-600">
                {pureNE.length > 0
                  ? pureNE.map(([r, c]) => `[A${r + 1}, B${c + 1}]`).join(", ")
                  : "无纯策略均衡"}
              </span>
            </div>
            {config.rows === 2 && config.cols === 2 && (
              <div className="flex justify-between py-1 text-slate-600">
                <span>混合策略均衡 (Mixed NE):</span>
                <span className="font-mono font-medium text-indigo-600">
                  {mixedNE
                    ? `p=${mixedNE.p.toFixed(2)}, q=${mixedNE.q.toFixed(2)}`
                    : "无混合策略均衡"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Middle Visual Canvas Panel */}
      <div className="lg:col-span-7 bg-slate-50/50 border border-slate-100 rounded-2xl p-5 flex flex-col justify-between h-full min-h-[500px]">
        {/* Visualizer header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold font-display text-slate-800">
              二维矩阵动态扫描画布
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {solverStep === 0 && "准备就绪。点击下方单步执行或播放，观看最优反应扫描机制"}
              {solverStep >= 1 && solverStep <= config.cols && `Player 1 在 Player 2 选择 Col ${solverStep} 时的最优反应`}
              {solverStep > config.cols && solverStep <= config.cols + config.rows && `Player 2 在 Player 1 选择 Row ${solverStep - config.cols} 时的最优反应`}
              {solverStep === config.cols + config.rows + 1 && "扫描完成！交会高亮单元格即为纳什均衡（金黄色闪烁）"}
            </p>
          </div>
          <div className="text-[11px] bg-indigo-50 text-indigo-600 rounded-full px-2.5 py-1 font-medium font-mono">
            步骤: {solverStep} / {totalAnimationSteps - 1}
          </div>
        </div>

        {/* Matrix central rendering */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="relative max-w-full">
            {/* Top axis label (Player 2) */}
            <div className="text-center mb-4">
              <span className="text-xs font-bold text-slate-500 tracking-widest uppercase bg-slate-100/80 px-2.5 py-0.5 rounded-md border border-slate-200">
                Player 2 (列参与者 - 蓝)
              </span>
            </div>

            {/* Matrix Container */}
            <div className="flex">
              {/* Left axis label (Player 1) */}
              <div className="flex items-center pr-4">
                <span className="text-xs font-bold text-slate-500 tracking-widest uppercase vertical-text bg-slate-100/80 px-1 py-2 rounded-md border border-slate-200" style={{ writingMode: "vertical-lr", transform: "rotate(180deg)" }}>
                  Player 1 (行参与者 - 绿)
                </span>
              </div>

              {/* Main Grid Wrapper */}
              <div>
                {/* Header labels for columns */}
                <div className="grid grid-cols-5 gap-3 mb-2" style={{ gridTemplateColumns: `repeat(${config.cols}, minmax(110px, 1fr))` }}>
                  {config.colLabels.map((label, c) => {
                    const isScanningCol = solverStep >= 1 && solverStep <= config.cols && (solverStep - 1) === c;
                    return (
                      <div
                        key={c}
                        className={`text-center py-1 px-2 rounded-lg border text-xs font-semibold transition-all duration-300 ${
                          isScanningCol
                            ? "bg-blue-50 border-blue-300 text-blue-700 shadow-sm font-bold scale-105"
                            : "bg-white border-slate-200 text-slate-600"
                        }`}
                      >
                        <div className="truncate">{label}</div>
                        <div className="text-[9px] text-slate-400 font-mono mt-0.5">Col {c + 1}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Rows with labels and cells */}
                <div className="space-y-3">
                  {Array.from({ length: config.rows }).map((_, r) => {
                    const isScanningRow = solverStep > config.cols && solverStep <= config.cols + config.rows && (solverStep - config.cols - 1) === r;

                    return (
                      <div key={r} className="flex gap-3">
                        {/* Row Header Label */}
                        <div
                          className={`w-[110px] flex flex-col justify-center px-3 py-2 rounded-lg border text-xs font-semibold transition-all duration-300 ${
                            isScanningRow
                              ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm font-bold scale-105"
                              : "bg-white border-slate-200 text-slate-600"
                          }`}
                        >
                          <div className="truncate text-left">{config.rowLabels[r]}</div>
                          <div className="text-[9px] text-slate-400 font-mono mt-0.5 text-left">Row {r + 1}</div>
                        </div>

                        {/* Payoff cells */}
                        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${config.cols}, minmax(110px, 1fr))` }}>
                          {Array.from({ length: config.cols }).map((_, c) => {
                            const val = config.matrix[r][c];

                            // Determine highlight states based on step animation
                            const isP1MaxInCol = p1BestResponses[c]?.includes(r);
                            const isP2MaxInRow = p2BestResponses[r]?.includes(c);

                            // Active scanning highlight flags
                            const showP1Highlight = (solverStep >= 1 && solverStep <= config.cols && (solverStep - 1) === c && isP1MaxInCol) ||
                              (solverStep > config.cols && isP1MaxInCol);

                            const showP2Highlight = (solverStep > config.cols && solverStep <= config.cols + config.rows && (solverStep - config.cols - 1) === r && isP2MaxInRow) ||
                              (solverStep > config.cols + config.rows && isP2MaxInRow);

                            const isEquilibrium = showP1Highlight && showP2Highlight;
                            const isCurrentlyScanningThisCell = (solverStep >= 1 && solverStep <= config.cols && (solverStep - 1) === c) ||
                              (solverStep > config.cols && solverStep <= config.cols + config.rows && (solverStep - config.cols - 1) === r);

                            return (
                              <div
                                key={c}
                                className={`relative h-20 bg-white border rounded-xl p-2.5 flex flex-col justify-between transition-all duration-300 ${
                                  isEquilibrium
                                    ? "ring-2 ring-amber-400 bg-amber-50/30 border-amber-300 shadow-md scale-[1.03] animate-pulse"
                                    : isCurrentlyScanningThisCell
                                    ? "border-indigo-400 bg-indigo-50/10 shadow-sm"
                                    : "border-slate-200 hover:border-slate-300 hover:shadow-xs"
                                }`}
                              >
                                {/* Top-Right: P2 payoff input */}
                                <div className="flex justify-between items-center w-full">
                                  <span className="text-[10px] text-slate-400">P1</span>
                                  <input
                                    type="number"
                                    value={val.u1}
                                    onChange={(e) => handlePayoffChange(r, c, "u1", e.target.value)}
                                    disabled={isPlaying || solverStep > 0}
                                    className={`w-10 text-right font-semibold text-sm bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-hidden transition-all text-emerald-600 ${
                                      showP1Highlight ? "underline decoration-emerald-500 decoration-2 underline-offset-4 font-bold" : ""
                                    }`}
                                  />
                                </div>

                                {/* Payoff separation dashed line diagonal */}
                                <div className="absolute inset-0 border-t border-dashed border-slate-100 pointer-events-none transform rotate-[30deg] origin-center scale-x-125 translate-y-[2px]" />

                                {/* Bottom-Right: P2 payoff input */}
                                <div className="flex justify-between items-center w-full mt-1">
                                  <input
                                    type="number"
                                    value={val.u2}
                                    onChange={(e) => handlePayoffChange(r, c, "u2", e.target.value)}
                                    disabled={isPlaying || solverStep > 0}
                                    className={`w-10 text-left font-semibold text-sm bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-hidden transition-all text-blue-600 ${
                                      showP2Highlight ? "ring-2 ring-blue-300 ring-offset-1 rounded-sm px-0.5 font-bold" : ""
                                    }`}
                                  />
                                  <span className="text-[10px] text-slate-400">P2</span>
                                </div>

                                {/* Equilibrium golden status badge */}
                                {isEquilibrium && solverStep >= config.cols + config.rows + 1 && (
                                  <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-white rounded-full p-0.5 shadow-sm scale-110 flex items-center justify-center animate-bounce">
                                    <Sparkles className="w-3.5 h-3.5" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic scanning instructions legend / mixed strategy details */}
        {config.rows === 2 && config.cols === 2 && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-indigo-800">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-indigo-900">💡 混合策略与最优反应分析已开启：</span>
              <p className="leading-relaxed">
                由于当前为 2×2 二维矩阵，下方已为您自动加载专属的<strong>「混合策略纳什均衡与最优反应曲线」互动探索面板</strong>。您可以上下滚动页面，在下方拖拽概率滑块，实时观察最优反应相交动力学与期望收益！
              </p>
            </div>
          </div>
        )}

        {/* Visualizer Footer Controls */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition text-xs flex items-center gap-1 active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重置
            </button>
            <span className="text-xs text-slate-400">
              提示: 双击网格数值可直接手动修改支付，重置后方可修改
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSolverStep((prev) => Math.max(0, prev - 1));
                setIsPlaying(false);
              }}
              disabled={solverStep === 0}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition"
            >
              <ChevronRight className="w-4 h-4 transform rotate-180" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition flex items-center gap-1.5 active:scale-95 ${
                isPlaying ? "bg-amber-500 hover:bg-amber-600" : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  暂停
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  自动演练
                </>
              )}
            </button>

            <button
              onClick={() => {
                setSolverStep((prev) => Math.min(totalAnimationSteps - 1, prev + 1));
                setIsPlaying(false);
              }}
              disabled={solverStep === totalAnimationSteps - 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Bottom Full-Width Mixed Strategy Dashboard (Only for 2x2 games) */}
      {config.rows === 2 && config.cols === 2 && (
        <div className="col-span-12 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-500">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-800 font-display">
                  2×2 混合策略纳什均衡 & 最优反应曲线可视化
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                互动调整概率 p, q 以模拟期望收益，观察最优反应折线（Best Response Correspondence）交叉所定义的全部纯策略与混合策略均衡
              </p>
            </div>
            
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-slate-500">当前经典博弈场景：</span>
              <span className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-bold">
                {activePreset === "custom" ? "自定义配置" : activePreset}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left Column: Canvas Chart */}
            <div className="md:col-span-5 flex flex-col items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5 self-start">
                📈 最优反应相图 (Best Response Correspondence Diagram)
              </span>
              
              <BestResponseChart config={config} sliderP={sliderP} sliderQ={sliderQ} />
              
              {/* Legend */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] font-medium text-slate-600 w-full pt-2 border-t border-slate-200/50">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-emerald-500 rounded-full" />
                  <span>P1最优反应 p*(q)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-blue-500 rounded-full" />
                  <span>P2最优反应 q*(p)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-emerald-100 border border-emerald-500 rounded-full" />
                  <span>纯策略均衡 (Pure NE)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-amber-100 border border-amber-500 rounded-full" />
                  <span>混合策略均衡 (Mixed NE)</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  <span className="w-2.5 h-2.5 bg-purple-500 border border-white rounded-full" />
                  <span className="text-purple-600 font-bold">当前设定坐标 (q, p) = ({sliderQ.toFixed(2)}, {sliderP.toFixed(2)})</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Sliders & Payoff calculations */}
            <div className="md:col-span-7 space-y-5">
              {/* Controls */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/80 space-y-4">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  🎛️ 策略概率选择模拟 (Probability Playgrounds)
                </h4>
                
                {/* Slider P */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-emerald-500" />
                      Player 1 选 Row 1 ({config.rowLabels[0].split(" ")[0]}) 的概率 p
                    </span>
                    <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                      {(sliderP * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex gap-3 items-center">
                    <span className="text-[10px] text-slate-400 font-mono">0%</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={sliderP}
                      onChange={(e) => setSliderP(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400 font-mono">100%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">
                    Player 1 选 Row 2 ({config.rowLabels[1].split(" ")[0]}) 的概率为 <span className="font-bold">{(100 - sliderP * 100).toFixed(0)}%</span>
                  </p>
                </div>

                {/* Slider Q */}
                <div className="space-y-1.5 pt-3 border-t border-slate-200/40">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-blue-700 flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-blue-500" />
                      Player 2 选 Col 1 ({config.colLabels[0].split(" ")[0]}) 的概率 q
                    </span>
                    <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">
                      {(sliderQ * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex gap-3 items-center">
                    <span className="text-[10px] text-slate-400 font-mono">0%</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={sliderQ}
                      onChange={(e) => setSliderQ(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <span className="text-[10px] text-slate-400 font-mono">100%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">
                    Player 2 选 Col 2 ({config.colLabels[1].split(" ")[0]}) 的概率为 <span className="font-bold">{(100 - sliderQ * 100).toFixed(0)}%</span>
                  </p>
                </div>
              </div>

              {/* Payoff Stats Display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Player 1 Payoffs */}
                <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800">Player 1 期望收益 (U1)</span>
                    <span className="text-xs font-mono font-bold text-emerald-600">
                      {eu1_total.toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-600">
                    <div className="flex justify-between">
                      <span>单玩 Row 1 ({config.rowLabels[0].split(" ")[0]}) 期望：</span>
                      <span className="font-mono font-medium">{eu1_row1.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>单玩 Row 2 ({config.rowLabels[1].split(" ")[0]}) 期望：</span>
                      <span className="font-mono font-medium">{eu1_row2.toFixed(2)}</span>
                    </div>
                    <div className="pt-1.5 border-t border-emerald-200/50 flex justify-between font-semibold text-emerald-900">
                      <span>综合加权期望收益：</span>
                      <span className="font-mono">{eu1_total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Player 2 Payoffs */}
                <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-800">Player 2 期望收益 (U2)</span>
                    <span className="text-xs font-mono font-bold text-blue-600">
                      {eu2_total.toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-600">
                    <div className="flex justify-between">
                      <span>单玩 Col 1 ({config.colLabels[0].split(" ")[0]}) 期望：</span>
                      <span className="font-mono font-medium">{eu2_col1.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>单玩 Col 2 ({config.colLabels[1].split(" ")[0]}) 期望：</span>
                      <span className="font-mono font-medium">{eu2_col2.toFixed(2)}</span>
                    </div>
                    <div className="pt-1.5 border-t border-blue-200/50 flex justify-between font-semibold text-blue-900">
                      <span>综合加权期望收益：</span>
                      <span className="font-mono">{eu2_total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic explanations */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs space-y-3">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-500" />
                  相图动力学实时解算 (Real-time Best Response Logic)
                </span>
                
                <div className="space-y-2 leading-relaxed text-slate-600">
                  <div>
                    <span className="font-bold text-emerald-600">Player 1 决策逻辑：</span>
                    {Math.abs(eu1_row1 - eu1_row2) < 0.01 ? (
                      <span>
                        当前 q = {sliderQ.toFixed(2)}，Row 1 与 Row 2 的期望收益完全相等 ({eu1_row1.toFixed(2)})。
                        Player 1 处于<strong>无差异 (Indifferent)</strong> 状态，选任何概率 p 都是最优反应（即折线上的垂直段）。
                      </span>
                    ) : eu1_row1 > eu1_row2 ? (
                      <span>
                        当前 q = {sliderQ.toFixed(2)}，Row 1 收益 ({eu1_row1.toFixed(2)}) 大于 Row 2 ({eu1_row2.toFixed(2)})。
                        Player 1 的唯一最优反应是<strong>选 Row 1 (p = 1)</strong>。
                      </span>
                    ) : (
                      <span>
                        当前 q = {sliderQ.toFixed(2)}，Row 2 收益 ({eu1_row2.toFixed(2)}) 大于 Row 1 ({eu1_row1.toFixed(2)})。
                        Player 1 的唯一最优反应是<strong>选 Row 2 (p = 0)</strong>。
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200/60">
                    <span className="font-bold text-blue-600">Player 2 决策逻辑：</span>
                    {Math.abs(eu2_col1 - eu2_col2) < 0.01 ? (
                      <span>
                        当前 p = {sliderP.toFixed(2)}，Col 1 与 Col 2 的期望收益完全相等 ({eu2_col1.toFixed(2)})。
                        Player 2 处于<strong>无差异 (Indifferent)</strong> 状态，选任何概率 q 都是最优反应（即折线上的水平段）。
                      </span>
                    ) : eu2_col1 > eu2_col2 ? (
                      <span>
                        当前 p = {sliderP.toFixed(2)}，Col 1 收益 ({eu2_col1.toFixed(2)}) 大于 Col 2 ({eu2_col2.toFixed(2)})。
                        Player 2 的唯一最优反应是<strong>选 Col 1 (q = 1)</strong>。
                      </span>
                    ) : (
                      <span>
                        当前 p = {sliderP.toFixed(2)}，Col 2 收益 ({eu2_col2.toFixed(2)}) 大于 Col 1 ({eu2_col1.toFixed(2)})。
                        Player 2 的唯一最优反应是<strong>选 Col 2 (q = 0)</strong>。
                      </span>
                    )}
                  </div>

                  {mixedNE && (
                    <div className="pt-2 border-t border-slate-200/60 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100 text-amber-900">
                      <span className="font-bold text-amber-700">📌 混合策略纳什均衡 (Mixed Strategy NE)：</span>
                      当 p* = {mixedNE.p.toFixed(3)} 且 q* = {mixedNE.q.toFixed(3)} 时，双方同时令对方处于无差异状态。这是一个均衡点。
                      {activePreset.includes("猎鹿博弈") && (
                        <span>
                          在<strong>猎鹿博弈</strong>中，这个混合策略均衡是一个<strong>不稳定的鞍点 (Saddle Point)</strong>：
                          如果哪怕有一点点偏离（比如 P2 选 Stag 概率 q &gt; 0.6），博弈各方就会迅速被引力拉向 (Stag, Stag) 纯策略帕累托优越均衡；
                          若 q &lt; 0.6，则会坠入 (Hare, Hare) 风险规避低效均衡。最优反应相图中的交叉点正清晰地刻画了这三个不动点！
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// BestResponseChart: Auxiliary Canvas Drawing
// ==========================================
interface BestResponseChartProps {
  config: DiscreteGameConfig;
  sliderP: number;
  sliderQ: number;
}

export function BestResponseChart({ config, sliderP, sliderQ }: BestResponseChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Apply high quality backing store / crisp lines
    const padding = 45;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Helper functions to map probability to pixel coordinates
    // q is on X-axis: q=0 mapped to padding, q=1 mapped to width - padding
    const toPxX = (q: number) => padding + q * chartWidth;
    // p is on Y-axis: p=0 mapped to height - padding, p=1 mapped to padding
    const toPxY = (p: number) => height - padding - p * chartHeight;

    // Draw background grid lines and axis
    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Grid lines for 0.25, 0.5, 0.75
    [0.25, 0.5, 0.75].forEach((val) => {
      // Horizontal
      ctx.moveTo(toPxX(0), toPxY(val));
      ctx.lineTo(toPxX(1), toPxY(val));
      // Vertical
      ctx.moveTo(toPxX(val), toPxY(0));
      ctx.lineTo(toPxX(val), toPxY(1));
    });
    ctx.stroke();

    // Draw solid axes bounding box
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // Bottom
    ctx.moveTo(toPxX(0), toPxY(0));
    ctx.lineTo(toPxX(1), toPxY(0));
    // Left
    ctx.moveTo(toPxX(0), toPxY(0));
    ctx.lineTo(toPxX(0), toPxY(1));
    // Top
    ctx.moveTo(toPxX(0), toPxY(1));
    ctx.lineTo(toPxX(1), toPxY(1));
    // Right
    ctx.moveTo(toPxX(1), toPxY(0));
    ctx.lineTo(toPxX(1), toPxY(1));
    ctx.stroke();

    // Axis ticks and labels
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    // X ticks (q)
    [0, 0.5, 1].forEach((val) => {
      ctx.fillText(val.toString(), toPxX(val), toPxY(0) + 6);
    });
    // Y ticks (p)
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    [0, 0.5, 1].forEach((val) => {
      ctx.fillText(val.toString(), toPxX(0) - 6, toPxY(val));
    });

    // Axis titles
    ctx.fillStyle = "#334155";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    // X axis title: q (Player 2)
    ctx.fillText("q (Player 2 选 Col 1 概率)", toPxX(0.5), toPxY(0) + 18);

    // Y axis title: p (Player 1)
    ctx.save();
    ctx.translate(toPxX(0) - 24, toPxY(0.5));
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("p (Player 1 选 Row 1 概率)", 0, 0);
    ctx.restore();

    // Now, let's calculate P1's Best Response p*(q)
    const u1_00 = config.matrix[0][0].u1;
    const u1_01 = config.matrix[0][1].u1;
    const u1_10 = config.matrix[1][0].u1;
    const u1_11 = config.matrix[1][1].u1;

    const A = u1_00 - u1_10 - u1_01 + u1_11;
    const B = u1_01 - u1_11;

    let qCrit: number | null = null;
    if (Math.abs(A) > 1e-6) {
      const temp = -B / A;
      if (temp > 0 && temp < 1) {
        qCrit = temp;
      }
    }

    // Draw P1's Best Response Curve (Green/Emerald)
    ctx.strokeStyle = "#10b981"; // Emerald-500
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    if (qCrit !== null) {
      const pLeft = B > 0 ? 1 : 0;
      const pRight = (A + B) > 0 ? 1 : 0;

      // Draw segment 1
      ctx.moveTo(toPxX(0), toPxY(pLeft));
      ctx.lineTo(toPxX(qCrit), toPxY(pLeft));
      // Draw vertical segment at qCrit
      ctx.lineTo(toPxX(qCrit), toPxY(pRight));
      // Draw segment 2
      ctx.lineTo(toPxX(1), toPxY(pRight));
    } else {
      // Flat curve
      const pVal = (A * 0.5 + B) > 0 ? 1 : 0;
      ctx.moveTo(toPxX(0), toPxY(pVal));
      ctx.lineTo(toPxX(1), toPxY(pVal));
    }
    ctx.stroke();

    // Draw P2's Best Response Curve (Royal Blue)
    const u2_00 = config.matrix[0][0].u2;
    const u2_01 = config.matrix[0][1].u2;
    const u2_10 = config.matrix[1][0].u2;
    const u2_11 = config.matrix[1][1].u2;

    const C = u2_00 - u2_10 - u2_01 + u2_11;
    const D = u2_10 - u2_11;

    let pCrit: number | null = null;
    if (Math.abs(C) > 1e-6) {
      const temp = -D / C;
      if (temp > 0 && temp < 1) {
        pCrit = temp;
      }
    }

    ctx.strokeStyle = "#3b82f6"; // Blue-500
    ctx.beginPath();

    if (pCrit !== null) {
      const qBottom = D > 0 ? 1 : 0;
      const qTop = (C + D) > 0 ? 1 : 0;

      ctx.moveTo(toPxX(qBottom), toPxY(0));
      ctx.lineTo(toPxX(qBottom), toPxY(pCrit));
      // Draw horizontal segment at pCrit
      ctx.lineTo(toPxX(qTop), toPxY(pCrit));
      // Draw segment 2
      ctx.lineTo(toPxX(qTop), toPxY(1));
    } else {
      // Flat vertical line in (q, p) space
      const qVal = (C * 0.5 + D) > 0 ? 1 : 0;
      ctx.moveTo(toPxX(qVal), toPxY(0));
      ctx.lineTo(toPxX(qVal), toPxY(1));
    }
    ctx.stroke();

    // Identify and highlight Nash Equilibria (intersections)
    const equilibria: { q: number; p: number; type: "pure" | "mixed" }[] = [];

    // Let's check the corners (pure strategies)
    const corners = [
      { r: 0, c: 0, p: 1, q: 1 },
      { r: 0, c: 1, p: 1, q: 0 },
      { r: 1, c: 0, p: 0, q: 1 },
      { r: 1, c: 1, p: 0, q: 0 },
    ];

    // Helper to check if a point is a best response
    const isP1BR = (qVal: number, pVal: number) => {
      const eu1_row1 = qVal * u1_00 + (1 - qVal) * u1_01;
      const eu1_row2 = qVal * u1_10 + (1 - qVal) * u1_11;
      if (Math.abs(eu1_row1 - eu1_row2) < 1e-4) return true;
      return pVal === (eu1_row1 > eu1_row2 ? 1 : 0);
    };

    const isP2BR = (qVal: number, pVal: number) => {
      const eu2_col1 = pVal * u2_00 + (1 - pVal) * u2_10;
      const eu2_col2 = pVal * u2_01 + (1 - pVal) * u2_11;
      if (Math.abs(eu2_col1 - eu2_col2) < 1e-4) return true;
      return qVal === (eu2_col1 > eu2_col2 ? 1 : 0);
    };

    corners.forEach((corner) => {
      if (isP1BR(corner.q, corner.p) && isP2BR(corner.q, corner.p)) {
        equilibria.push({ q: corner.q, p: corner.p, type: "pure" });
      }
    });

    // Check mixed NE inside (0, 1)
    if (qCrit !== null && pCrit !== null) {
      if (isP1BR(qCrit, pCrit) && isP2BR(qCrit, pCrit)) {
        equilibria.push({ q: qCrit, p: pCrit, type: "mixed" });
      }
    }

    // Draw Equilibrium points
    equilibria.forEach((eq) => {
      const px = toPxX(eq.q);
      const py = toPxY(eq.p);

      // Outer ring
      ctx.fillStyle = eq.type === "mixed" ? "rgba(245, 158, 11, 0.25)" : "rgba(16, 185, 129, 0.2)";
      ctx.beginPath();
      ctx.arc(px, py, 11, 0, 2 * Math.PI);
      ctx.fill();

      // Inner dot
      ctx.fillStyle = eq.type === "mixed" ? "#f59e0b" : "#10b981";
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Draw User's Current slider (p, q) crosshair
    const userPxX = toPxX(sliderQ);
    const userPxY = toPxY(sliderP);

    ctx.strokeStyle = "rgba(168, 85, 247, 0.4)"; // Purple-500
    ctx.setLineDash([2, 2]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(toPxX(0), userPxY);
    ctx.lineTo(toPxX(1), userPxY);
    ctx.moveTo(userPxX, toPxY(0));
    ctx.lineTo(userPxX, toPxY(1));
    ctx.stroke();
    ctx.setLineDash([]);

    // Current State marker (Purple pulsing dot)
    ctx.fillStyle = "#a855f7";
    ctx.beginPath();
    ctx.arc(userPxX, userPxY, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

  }, [config, sliderP, sliderQ]);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={280}
      className="bg-white rounded-2xl border border-slate-100 shadow-xs"
    />
  );
}
