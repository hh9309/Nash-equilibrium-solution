/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Play, Pause, ChevronRight, RotateCcw, AlertCircle, TrendingUp, Sliders } from "lucide-react";
import { CournotConfig } from "../types";

interface CournotGameTabProps {
  config: CournotConfig;
  setConfig: React.Dispatch<React.SetStateAction<CournotConfig>>;
  onLog: (msg: string, type?: "info" | "success" | "warn") => void;
  onSelectCodeLine: (lineNum: number) => void;
  solverStep: number;
  setSolverStep: React.Dispatch<React.SetStateAction<number>>;
  setTotalSteps: (steps: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
}

export default function CournotGameTab({
  config,
  setConfig,
  onLog,
  onSelectCodeLine,
  solverStep,
  setSolverStep,
  setTotalSteps,
  isPlaying,
  setIsPlaying,
}: CournotGameTabProps) {
  // Analytical derivation results
  const [results, setResults] = useState({
    q1Star: 0,
    q2Star: 0,
    price: 0,
    profit1: 0,
    profit2: 0,
    br1_intercept_q1: 0, // when q2 = 0, q1 = ?
    br1_intercept_q2: 0, // when q1 = 0, q2 = ?
    br2_intercept_q1: 0, // when q2 = 0, q1 = ?
    br2_intercept_q2: 0, // when q1 = 0, q2 = ?
  });

  // Probe coordinates for Isoprofit curves and Cobweb starter point
  const [probeQ1, setProbeQ1] = useState(0);
  const [probeQ2, setProbeQ2] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showIsoprofit, setShowIsoprofit] = useState(true);
  const [showCobweb, setShowCobweb] = useState(true);

  // Initialize probe coordinates based on analytical results once
  useEffect(() => {
    if (results.q1Star > 0 && results.q2Star > 0 && probeQ1 === 0 && probeQ2 === 0) {
      setProbeQ1(results.q1Star * 0.4);
      setProbeQ2(results.q2Star * 1.5);
    }
  }, [results, probeQ1, probeQ2]);

  // 1. Compute Analytical Equilibrium
  useEffect(() => {
    const { a, b, c1, c2 } = config;

    // Equilibrium Quantities: q_i = (a - 2c_i + c_j) / 3b
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

    // Price P = a - b(q1 + q2)
    const price = Math.max(0, a - b * (q1Star + q2Star));

    // Profit_i = (P - c_i) * q_i
    const profit1 = Math.max(0, (price - c1) * q1Star);
    const profit2 = Math.max(0, (price - c2) * q2Star);

    // Reaction curves:
    // BR1: q1(q2) = (a - c1 - b*q2)/(2b) = (a - c1)/(2b) - q2/2
    // intercepts: (q1_max, 0) and (0, q2_max)
    const br1_intercept_q1 = (a - c1) / (2 * b);
    const br1_intercept_q2 = (a - c1) / b;

    // BR2: q2(q1) = (a - c2 - b*q1)/(2b) = (a - c2)/(2b) - q1/2
    // intercepts: (q1_max, 0) and (0, q2_max)
    const br2_intercept_q1 = (a - c2) / b;
    const br2_intercept_q2 = (a - c2) / (2 * b);

    setResults({
      q1Star,
      q2Star,
      price,
      profit1,
      profit2,
      br1_intercept_q1,
      br1_intercept_q2,
      br2_intercept_q1,
      br2_intercept_q2,
    });
  }, [config]);

  // Solver steps for Cournot
  const totalSteps = 5;
  useEffect(() => {
    setTotalSteps(totalSteps);
  }, [setTotalSteps]);

  useEffect(() => {
    const { a, b, c1, c2 } = config;
    if (solverStep === 0) {
      onSelectCodeLine(21);
    } else if (solverStep === 1) {
      onSelectCodeLine(23);
      onLog(`[第 1 步] 列出企业利润函数公式：\n企业1: 𝚷₁ = (P - c₁)q₁ = (${a} - ${b}(q₁ + q₂))q₁ - ${c1}q₁\n企业2: 𝚷₂ = (P - c₂)q₂ = (${a} - ${b}(q₁ + q₂))q₂ - ${c2}q₂`, "info");
    } else if (solverStep === 2) {
      onSelectCodeLine(26);
      onLog(`[第 2 步] 求解一阶偏导数条件 (FOC)：\n∂𝚷₁/∂q₁ = ${a} - 2×${b}q₁ - ${b}q₂ - ${c1} = 0\n∂𝚷₂/∂q₂ = ${a} - ${b}q₁ - 2×${b}q₂ - ${c2} = 0`, "info");
    } else if (solverStep === 3) {
      onSelectCodeLine(30);
      onLog(`[第 3 步] 导出最优反应曲线方程 (Reaction Functions)：\n企业1反应曲线: q₁*(q₂) = (${a} - ${c1} - ${b}q₂)/(2×${b}) = ${(a - c1)/(2*b)} - 0.5×q₂\n企业2反应曲线: q₂*(q₁) = (${a} - ${c2} - ${b}q₁)/(2×${b}) = ${(a - c2)/(2*b)} - 0.5×q₁`, "info");
    } else if (solverStep === 4) {
      onSelectCodeLine(34);
      onLog(`[第 4 步] 联立求解两条最优反应曲线交点，得出纳什均衡状态：\nq₁* = ${results.q1Star.toFixed(2)}，q₂* = ${results.q2Star.toFixed(2)}\n市场总产量 Q = ${(results.q1Star + results.q2Star).toFixed(2)}\n市场出清价格 P* = ${results.price.toFixed(2)}`, "success");
    }
  }, [solverStep, config, results]);

  // Autoplay Loop
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setSolverStep((prev) => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1800);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Handle Parameter change
  const handleSliderChange = (param: keyof CournotConfig, value: number) => {
    setConfig((prev) => {
      const updated = { ...prev, [param]: value };
      onLog(`更新古诺博弈参数 ${param} = ${value}`, "info");
      return updated;
    });
    setSolverStep(0);
    setIsPlaying(false);
  };

  // SVG coordinates calculations
  // Max q for graph axes
  const maxGraphQ = Math.max(
    10,
    results.br1_intercept_q1 * 1.5,
    results.br1_intercept_q2 * 1.2,
    results.br2_intercept_q1 * 1.2,
    results.br2_intercept_q2 * 1.5,
    (config.a / config.b) * 0.75
  );

  const padding = 50;
  const graphWidth = 400;
  const graphHeight = 400;

  // Convert (q1, q2) to SVG pixels
  const toSvgX = (q1: number) => padding + (q1 / maxGraphQ) * (graphWidth - 2 * padding);
  const toSvgY = (q2: number) => graphHeight - padding - (q2 / maxGraphQ) * (graphHeight - 2 * padding);

  // Probe profit levels
  const probeProfit1 = Math.max(0, (config.a - config.b * (probeQ1 + probeQ2) - config.c1) * probeQ1);
  const probeProfit2 = Math.max(0, (config.a - config.b * (probeQ1 + probeQ2) - config.c2) * probeQ2);

  // Translate client coordinates in SVG to (q1, q2) quantities
  const handleSvgInteraction = (e: React.MouseEvent<SVGSVGElement, MouseEvent> | React.TouchEvent<SVGSVGElement>) => {
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches && e.touches[0]) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        return;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    let q1 = ((x - padding) / (graphWidth - 2 * padding)) * maxGraphQ;
    let q2 = ((graphHeight - padding - y) / (graphHeight - 2 * padding)) * maxGraphQ;

    q1 = Math.max(0, Math.min(maxGraphQ, q1));
    q2 = Math.max(0, Math.min(maxGraphQ, q2));

    setProbeQ1(q1);
    setProbeQ2(q2);
  };

  // Generate path points for Player 1's Isoprofit curve: q2(q1) = (a-c1)/b - q1 - pi1/(b*q1)
  const getIsoprofitPathP1 = () => {
    const { a, b, c1 } = config;
    const pi1 = probeProfit1;
    if (pi1 <= 0.05) return "";

    const term = (a - c1) / b;
    const disc = term * term - (4 * pi1) / b;
    if (disc < 0) return "";

    const root1 = (term - Math.sqrt(disc)) / 2;
    const root2 = (term + Math.sqrt(disc)) / 2;

    const points: string[] = [];
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const q1 = root1 + t * (root2 - root1);
      if (q1 <= 0.001) continue;
      const q2 = term - q1 - pi1 / (b * q1);
      if (q2 >= 0 && q2 <= maxGraphQ && q1 <= maxGraphQ) {
        points.push(`${toSvgX(q1)},${toSvgY(q2)}`);
      }
    }
    return points.length > 0 ? `M ${points.join(" L ")}` : "";
  };

  // Generate path points for Player 2's Isoprofit curve: q1(q2) = (a-c2)/b - q2 - pi2/(b*q2)
  const getIsoprofitPathP2 = () => {
    const { a, b, c2 } = config;
    const pi2 = probeProfit2;
    if (pi2 <= 0.05) return "";

    const term = (a - c2) / b;
    const disc = term * term - (4 * pi2) / b;
    if (disc < 0) return "";

    const root1 = (term - Math.sqrt(disc)) / 2;
    const root2 = (term + Math.sqrt(disc)) / 2;

    const points: string[] = [];
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const q2 = root1 + t * (root2 - root1);
      if (q2 <= 0.001) continue;
      const q1 = term - q2 - pi2 / (b * q2);
      if (q1 >= 0 && q1 <= maxGraphQ && q2 <= maxGraphQ) {
        points.push(`${toSvgX(q1)},${toSvgY(q2)}`);
      }
    }
    return points.length > 0 ? `M ${points.join(" L ")}` : "";
  };

  // Calculate the peaks of the Isoprofit Contours
  // P1 Peak: q1_peak = sqrt(pi1/b), q2_peak = (a-c1)/b - 2*q1_peak
  const getP1Peak = () => {
    const { a, b, c1 } = config;
    const pi1 = probeProfit1;
    if (pi1 <= 0.05) return null;
    const q1_peak = Math.sqrt(pi1 / b);
    const q2_peak = (a - c1) / b - 2 * q1_peak;
    if (q1_peak >= 0 && q2_peak >= 0 && q1_peak <= maxGraphQ && q2_peak <= maxGraphQ) {
      return { q1: q1_peak, q2: q2_peak };
    }
    return null;
  };

  // P2 Peak: q2_peak = sqrt(pi2/b), q1_peak = (a-c2)/b - 2*q2_peak
  const getP2Peak = () => {
    const { a, b, c2 } = config;
    const pi2 = probeProfit2;
    if (pi2 <= 0.05) return null;
    const q2_peak = Math.sqrt(pi2 / b);
    const q1_peak = (a - c2) / b - 2 * q2_peak;
    if (q1_peak >= 0 && q2_peak >= 0 && q1_peak <= maxGraphQ && q2_peak <= maxGraphQ) {
      return { q1: q1_peak, q2: q2_peak };
    }
    return null;
  };

  // Generate Cobweb dynamic steps
  const getCobwebPoints = () => {
    const { a, b, c1, c2 } = config;
    const points: { q1: number; q2: number }[] = [];
    
    let curQ1 = probeQ1;
    let curQ2 = probeQ2;
    
    points.push({ q1: curQ1, q2: curQ2 });

    // 10 rounds of sequential reaction adjustments
    for (let r = 0; r < 8; r++) {
      // 1. Player 1 reacts to curQ2: q1' = (a - c1 - b*curQ2)/(2b)
      const nextQ1 = Math.max(0, (a - c1 - b * curQ2) / (2 * b));
      points.push({ q1: nextQ1, q2: curQ2 });
      curQ1 = nextQ1;

      // 2. Player 2 reacts to curQ1: q2' = (a - c2 - b*curQ1)/(2b)
      const nextQ2 = Math.max(0, (a - c2 - b * curQ1) / (2 * b));
      points.push({ q1: curQ1, q2: nextQ2 });
      curQ2 = nextQ2;
    }
    return points;
  };

  // Reaction Curve endpoints in SVG pixels
  // BR1 connects (br1_intercept_q1, 0) to (0, br1_intercept_q2)
  const br1_x1 = toSvgX(results.br1_intercept_q1);
  const br1_y1 = toSvgY(0);
  const br1_x2 = toSvgX(0);
  const br1_y2 = toSvgY(results.br1_intercept_q2);

  // BR2 connects (0, br2_intercept_q2) to (br2_intercept_q1, 0)
  const br2_x1 = toSvgX(0);
  const br2_y1 = toSvgY(results.br2_intercept_q2);
  const br2_x2 = toSvgX(results.br2_intercept_q1);
  const br2_y2 = toSvgY(0);

  // Intersection in SVG pixels
  const eqX = toSvgX(results.q1Star);
  const eqY = toSvgY(results.q2Star);

  return (
    <div id="cournot-game-tab" className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* 1. Left controls panel */}
      <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-500" />
            1. 古诺参数微调
          </h2>
          <p className="text-xs text-slate-500 mt-1">拖动滑块实时计算与渲染反应曲线的几何形变</p>
        </div>

        {/* Sliders */}
        <div className="space-y-4">
          {/* Intercept a */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">需求常数 a (价格上限)</span>
              <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-sm font-bold">{config.a}</span>
            </div>
            <input
              type="range"
              min="50"
              max="200"
              step="5"
              value={config.a}
              onChange={(e) => handleSliderChange("a", parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Min: 50</span>
              <span>Max: 200</span>
            </div>
          </div>

          {/* Slope b */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">需求斜率 b (价格弹性)</span>
              <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-sm font-bold">{config.b}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="4"
              step="0.1"
              value={config.b}
              onChange={(e) => handleSliderChange("b", parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Min: 0.5</span>
              <span>Max: 4.0</span>
            </div>
          </div>

          {/* Cost c1 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Player 1 边际成本 c₁
              </span>
              <span className="font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm font-bold">{config.c1}</span>
            </div>
            <input
              type="range"
              min="10"
              max="80"
              step="1"
              value={config.c1}
              onChange={(e) => handleSliderChange("c1", parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Min: 10</span>
              <span>Max: 80</span>
            </div>
          </div>

          {/* Cost c2 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                Player 2 边际成本 c₂
              </span>
              <span className="font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-sm font-bold">{config.c2}</span>
            </div>
            <input
              type="range"
              min="10"
              max="80"
              step="1"
              value={config.c2}
              onChange={(e) => handleSliderChange("c2", parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Min: 10</span>
              <span>Max: 80</span>
            </div>
          </div>
        </div>

        {/* Real-time formulas */}
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
          <span className="text-xs font-semibold text-slate-700 block">需求与收益数学模型</span>
          <div className="space-y-1 text-[11px] font-mono text-slate-600">
            <div className="flex justify-between border-b border-slate-150 py-1">
              <span>逆需求函数 P(Q):</span>
              <span className="text-indigo-600">P = {config.a} - {config.b}(q₁ + q₂)</span>
            </div>
            <div className="flex justify-between border-b border-slate-150 py-1">
              <span>q₁ 反应曲线 (BR₁):</span>
              <span className="text-emerald-600">q₁ = {((config.a - config.c1) / (2 * config.b)).toFixed(1)} - 0.5q₂</span>
            </div>
            <div className="flex justify-between py-1">
              <span>q₂ 反应曲线 (BR₂):</span>
              <span className="text-blue-600">q₂ = {((config.a - config.c2) / (2 * config.b)).toFixed(1)} - 0.5q₁</span>
            </div>
          </div>
        </div>

        {/* Dynamic Microeconomic Exploration Controls */}
        <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-4">
          <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-indigo-500" />
            2. 微观经济学高级几何交互
          </span>
          
          <div className="space-y-2">
            {/* Isoprofit contour toggle */}
            <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
              <input
                type="checkbox"
                checked={showIsoprofit}
                onChange={(e) => setShowIsoprofit(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="font-semibold text-slate-700">显示当前等利润曲线 (Isoprofit)</span>
            </label>

            {/* Cobweb toggle */}
            <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
              <input
                type="checkbox"
                checked={showCobweb}
                onChange={(e) => setShowCobweb(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="font-semibold text-slate-700">显示蛛网动态收敛路径 (Cobweb)</span>
            </label>
          </div>

          <div className="text-[10px] text-slate-500 leading-relaxed pt-1 border-t border-indigo-100/60">
            💡 <strong>使用方法：</strong>您可以在右侧图表上<strong>任意点击或拖拽鼠标</strong>，实时定位当前产量对 $(q_1, q_2)$。等利润曲线将动态扩张，且蛛网会从该点开始折叠收敛！
          </div>

          {/* Real-time Probe Stats */}
          <div className="bg-white border border-indigo-100/80 rounded-lg p-2.5 space-y-1.5 text-[11px] font-mono">
            <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider font-sans mb-1">
              🔎 当前探索点分析 (Probe Point)
            </span>
            <div className="flex justify-between text-slate-600">
              <span>探针产量对 (q₁, q₂):</span>
              <span className="font-bold text-slate-800">({probeQ1.toFixed(1)}, {probeQ2.toFixed(1)})</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>探索点价格 P(Q):</span>
              <span className="font-bold text-indigo-600">${Math.max(0, config.a - config.b * (probeQ1 + probeQ2)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>企业1 实时利润 𝚷₁:</span>
              <span className="font-bold text-emerald-600">${probeProfit1.toFixed(1)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>企业2 实时利润 𝚷₂:</span>
              <span className="font-bold text-blue-600">${probeProfit2.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Middle Visual Canvas Panel */}
      <div className="lg:col-span-7 bg-slate-50/50 border border-slate-100 rounded-2xl p-5 flex flex-col justify-between h-full min-h-[500px]">
        {/* Visualizer header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              最优反应曲线几何交互相图 (Cournot Phase Portrait)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              横轴表示企业1产量 $q_1$，纵轴表示企业2产量 $q_2$。两条曲线交点即为古诺纳什均衡产量。
            </p>
          </div>
          <div className="text-[11px] bg-indigo-50 text-indigo-600 rounded-full px-2.5 py-1 font-medium font-mono">
            步骤: {solverStep} / {totalSteps - 1}
          </div>
        </div>

        {/* SVG reaction curve graph rendering */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="relative bg-white border border-slate-100 rounded-2xl p-4 shadow-xs">
            <svg
              width={graphWidth}
              height={graphHeight}
              className="overflow-visible select-none cursor-crosshair"
              onMouseDown={(e) => {
                setIsDragging(true);
                handleSvgInteraction(e);
              }}
              onMouseMove={(e) => {
                if (isDragging || e.buttons === 1) {
                  handleSvgInteraction(e);
                }
              }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              onTouchStart={(e) => {
                setIsDragging(true);
                handleSvgInteraction(e);
              }}
              onTouchMove={(e) => {
                if (isDragging) {
                  handleSvgInteraction(e);
                }
              }}
              onTouchEnd={() => setIsDragging(false)}
            >
              <style>{`
                @keyframes cobweb-pulse {
                  0% {
                    stroke-dashoffset: 40;
                  }
                  100% {
                    stroke-dashoffset: 0;
                  }
                }
                .animate-cobweb-flow {
                  stroke-dasharray: 6 4;
                  animation: cobweb-pulse 3s linear infinite;
                }
                .animate-pulse-slow {
                  animation: pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
              `}</style>

              {/* Draw Gridlines */}
              {Array.from({ length: 6 }).map((_, i) => {
                const gridVal = (maxGraphQ / 5) * i;
                const gridX = toSvgX(gridVal);
                const gridY = toSvgY(gridVal);

                return (
                  <g key={i} className="opacity-40">
                    {/* Vertical grid line */}
                    <line
                      x1={gridX}
                      y1={padding}
                      x2={gridX}
                      y2={graphHeight - padding}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    {/* Horizontal grid line */}
                    <line
                      x1={padding}
                      y1={gridY}
                      x2={graphWidth - padding}
                      y2={gridY}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    {/* X-axis labels */}
                    <text
                      x={gridX}
                      y={graphHeight - padding + 15}
                      fontSize="9"
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontFamily="monospace"
                    >
                      {gridVal.toFixed(0)}
                    </text>
                    {/* Y-axis labels */}
                    <text
                      x={padding - 8}
                      y={gridY + 3}
                      fontSize="9"
                      textAnchor="end"
                      fill="#94a3b8"
                      fontFamily="monospace"
                    >
                      {gridVal.toFixed(0)}
                    </text>
                  </g>
                );
              })}

              {/* Draw main X and Y Axes */}
              <line
                x1={padding}
                y1={graphHeight - padding}
                x2={graphWidth - padding + 20}
                y2={graphHeight - padding}
                stroke="#475569"
                strokeWidth="1.5"
                markerEnd="url(#arrow)"
              />
              <line
                x1={padding}
                y1={graphHeight - padding}
                x2={padding}
                y2={padding - 20}
                stroke="#475569"
                strokeWidth="1.5"
                markerEnd="url(#arrow)"
              />

              {/* Axis Label Tags */}
              <text
                x={graphWidth - padding + 20}
                y={graphHeight - padding + 25}
                fontSize="10"
                fontWeight="bold"
                fill="#475569"
                textAnchor="end"
              >
                企业 1 产量 q₁
              </text>
              <text
                x={padding - 10}
                y={padding - 25}
                fontSize="10"
                fontWeight="bold"
                fill="#475569"
                textAnchor="start"
              >
                企业 2 产量 q₂
              </text>

              {/* 1. Isoprofit Contour Curves */}
              {showIsoprofit && probeProfit1 > 0 && (
                <g>
                  <path
                    d={getIsoprofitPathP1()}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                    opacity="0.6"
                    className="transition-all duration-300"
                  />
                  {/* P1 Peak Dot */}
                  {(() => {
                    const peak = getP1Peak();
                    if (!peak) return null;
                    return (
                      <g>
                        <circle
                          cx={toSvgX(peak.q1)}
                          cy={toSvgY(peak.q2)}
                          r="4"
                          fill="#10b981"
                          stroke="#fff"
                          strokeWidth="1.5"
                        />
                        {/* Peak to BR1 connector */}
                        <line
                          x1={toSvgX(peak.q1)}
                          y1={toSvgY(peak.q2)}
                          x2={toSvgX(peak.q1)}
                          y2={toSvgY(peak.q2) + 12}
                          stroke="#10b981"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                          opacity="0.5"
                        />
                      </g>
                    );
                  })()}
                </g>
              )}

              {showIsoprofit && probeProfit2 > 0 && (
                <g>
                  <path
                    d={getIsoprofitPathP2()}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                    opacity="0.6"
                    className="transition-all duration-300"
                  />
                  {/* P2 Peak Dot */}
                  {(() => {
                    const peak = getP2Peak();
                    if (!peak) return null;
                    return (
                      <g>
                        <circle
                          cx={toSvgX(peak.q1)}
                          cy={toSvgY(peak.q2)}
                          r="4"
                          fill="#3b82f6"
                          stroke="#fff"
                          strokeWidth="1.5"
                        />
                        {/* Peak to BR2 connector */}
                        <line
                          x1={toSvgX(peak.q1)}
                          y1={toSvgY(peak.q2)}
                          x2={toSvgX(peak.q1) - 12}
                          y2={toSvgY(peak.q2)}
                          stroke="#3b82f6"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                          opacity="0.5"
                        />
                      </g>
                    );
                  })()}
                </g>
              )}

              {/* 2. Cobweb Convergence Path */}
              {showCobweb && (
                <g>
                  <polyline
                    points={getCobwebPoints().map((p) => `${toSvgX(p.q1)},${toSvgY(p.q2)}`).join(" ")}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-cobweb-flow"
                    style={{ filter: "drop-shadow(0 0 3px rgba(245, 158, 11, 0.4))" }}
                  />
                  {/* Draw markers along the path to indicate steps */}
                  {getCobwebPoints().slice(0, 5).map((p, idx) => (
                    <circle
                      key={idx}
                      cx={toSvgX(p.q1)}
                      cy={toSvgY(p.q2)}
                      r="3"
                      fill="#f59e0b"
                      opacity={1 - idx * 0.15}
                    />
                  ))}
                </g>
              )}

              {/* 3. BR1 Curve (P1 reaction) - Emerald green */}
              {(solverStep === 0 || solverStep >= 3) && (
                <g className="transition-all duration-500">
                  <line
                    x1={br1_x1}
                    y1={br1_y1}
                    x2={br1_x2}
                    y2={br1_y2}
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="drop-shadow-xs"
                  />
                  {/* Label BR1 */}
                  <text
                    x={br1_x1 - 10}
                    y={br1_y1 - 10}
                    fontSize="9"
                    fontWeight="bold"
                    fill="#10b981"
                    textAnchor="middle"
                  >
                    BR₁ (q₁*)
                  </text>
                </g>
              )}

              {/* 4. BR2 Curve (P2 reaction) - Cobalt blue */}
              {(solverStep === 0 || solverStep >= 3) && (
                <g className="transition-all duration-500">
                  <line
                    x1={br2_x1}
                    y1={br2_y1}
                    x2={br2_x2}
                    y2={br2_y2}
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="drop-shadow-xs"
                  />
                  {/* Label BR2 */}
                  <text
                    x={br2_x2 + 20}
                    y={br2_y2 + 12}
                    fontSize="9"
                    fontWeight="bold"
                    fill="#3b82f6"
                    textAnchor="middle"
                  >
                    BR₂ (q₂*)
                  </text>
                </g>
              )}

              {/* 5. Equilibrium Crosshairs & pulsing dot - Amber gold */}
              {(solverStep === 0 || solverStep >= 4) && (
                <g className="transition-all duration-500">
                  {/* Dashed drop-lines */}
                  <line
                    x1={eqX}
                    y1={eqY}
                    x2={eqX}
                    y2={graphHeight - padding}
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1={eqX}
                    y1={eqY}
                    x2={padding}
                    y2={eqY}
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />

                  {/* Pulsing visual circle */}
                  <circle
                    cx={eqX}
                    cy={eqY}
                    r="8"
                    fill="#f59e0b"
                    className="animate-ping opacity-35"
                  />
                  <circle
                    cx={eqX}
                    cy={eqY}
                    r="5"
                    fill="#d97706"
                    stroke="#fff"
                    strokeWidth="1.5"
                    className="shadow-sm"
                  />
                </g>
              )}

              {/* 6. Draggable Handle for current Probe point */}
              <g className="cursor-grab active:cursor-grabbing">
                {/* Ambient pulsing ring */}
                <circle
                  cx={toSvgX(probeQ1)}
                  cy={toSvgY(probeQ2)}
                  r="14"
                  fill="rgba(99, 102, 241, 0.18)"
                  className="animate-pulse-slow"
                />
                {/* Outer white ring */}
                <circle
                  cx={toSvgX(probeQ1)}
                  cy={toSvgY(probeQ2)}
                  r="8"
                  fill="#6366f1"
                  stroke="#fff"
                  strokeWidth="2"
                  className="filter drop-shadow-sm"
                />
                {/* Small inner core */}
                <circle
                  cx={toSvgX(probeQ1)}
                  cy={toSvgY(probeQ2)}
                  r="3"
                  fill="#fff"
                />
                {/* Drag handle label */}
                <text
                  x={toSvgX(probeQ1)}
                  y={toSvgY(probeQ2) - 15}
                  fontSize="9"
                  fontWeight="bold"
                  fill="#4f46e5"
                  textAnchor="middle"
                  style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: "3px", strokeLinejoin: "round" }}
                >
                  探针 (q₁, q₂)
                </text>
              </g>

              {/* Define markers/defs for arrows */}
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="5"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
                </marker>
              </defs>
            </svg>

            {/* Bubble tooltip at equilibrium intersection */}
            {(solverStep === 0 || solverStep >= 4) && (
              <div
                className="absolute bg-slate-900 text-white rounded-lg p-2.5 shadow-lg text-[11px] font-mono pointer-events-none transition-all duration-300 border border-slate-700/50"
                style={{
                  left: `${eqX + 15}px`,
                  top: `${eqY - 45}px`,
                }}
              >
                <div className="font-bold text-amber-400 border-b border-slate-700 pb-0.5 mb-1 flex items-center gap-1">
                  <span>纳什均衡交汇点 (NE)</span>
                </div>
                <div>q₁* = {results.q1Star.toFixed(2)}</div>
                <div>q₂* = {results.q2Star.toFixed(2)}</div>
                <div>价格 P* = ${results.price.toFixed(2)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Real-time economic results metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white border border-slate-100 rounded-xl p-3.5 shadow-2xs">
          <div className="text-center border-r border-slate-100 last:border-r-0">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">企业1 产量 q₁*</span>
            <span className="text-sm font-bold text-emerald-600 block font-mono">{results.q1Star.toFixed(2)}</span>
          </div>
          <div className="text-center border-r border-slate-100 last:border-r-0">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">企业2 产量 q₂*</span>
            <span className="text-sm font-bold text-blue-600 block font-mono">{results.q2Star.toFixed(2)}</span>
          </div>
          <div className="text-center border-r border-slate-100 last:border-r-0">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">市场出清价 P*</span>
            <span className="text-sm font-bold text-slate-800 block font-mono">${results.price.toFixed(2)}</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">企业1/2 利润</span>
            <span className="text-xs font-bold text-indigo-600 block font-mono truncate">
              ${results.profit1.toFixed(0)} / ${results.profit2.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Tab Footer Controls */}
        <div className="flex items-center justify-end border-t border-slate-100 pt-4 mt-2 gap-2">
          <button
            onClick={() => {
              setSolverStep(0);
              setIsPlaying(false);
              onLog("重置古诺求解状态", "info");
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition text-xs flex items-center gap-1 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重置
          </button>

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
              setSolverStep((prev) => Math.min(totalSteps - 1, prev + 1));
              setIsPlaying(false);
            }}
            disabled={solverStep === totalSteps - 1}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
