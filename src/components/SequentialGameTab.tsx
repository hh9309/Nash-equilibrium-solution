/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Play, Pause, ChevronRight, RotateCcw, AlertCircle, Share2, CornerDownRight, Waves, Sparkles } from "lucide-react";
import { SequentialGameConfig, TreeNode, Payoff } from "../types";
import { motion } from "motion/react";

interface PresetItem {
  name: string;
  description: string;
  config: SequentialGameConfig;
  nodeCoordinates: Record<string, { x: number; y: number }>;
}

const SEQUENTIAL_PRESETS: PresetItem[] = [
  {
    name: "百足博弈 (Centipede Game - 4阶段)",
    description: "经典顺序博弈，合作本可共赢，但个体理性逆向归纳导致第一步即崩溃止损。",
    nodeCoordinates: {
      "root": { x: 70, y: 150 },
      "stage2": { x: 180, y: 150 },
      "stage3": { x: 290, y: 150 },
      "stage4": { x: 400, y: 150 },
      "leaf1": { x: 70, y: 300 },
      "leaf2": { x: 180, y: 300 },
      "leaf3": { x: 290, y: 300 },
      "leaf4": { x: 400, y: 300 },
      "leaf_end": { x: 510, y: 150 }
    },
    config: {
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
    }
  },
  {
    name: "信任投资博弈 (Trust Game)",
    description: "委托人决定是否信任投资，代理人决定是否合理分配回报。",
    nodeCoordinates: {
      "root": { x: 100, y: 150 },
      "distrust_leaf": { x: 100, y: 300 },
      "p2_node": { x: 300, y: 150 },
      "betray_leaf": { x: 300, y: 300 },
      "recip_leaf": { x: 450, y: 150 }
    },
    config: {
      rootId: "root",
      nodes: {
        "root": { id: "root", label: "委托人 (P1)", player: 1, children: ["distrust_leaf", "p2_node"], actionLabel: "不信任 (Keep)" },
        "distrust_leaf": { id: "distrust_leaf", label: "拒绝 (10, 10)", player: 0, children: [], payoffs: { u1: 10, u2: 10 }, actionLabel: "不信任 (Keep)" },
        
        "p2_node": { id: "p2_node", label: "代理人 (P2)", player: 2, children: ["betray_leaf", "recip_leaf"], actionLabel: "信任投资 (Trust)" },
        "betray_leaf": { id: "betray_leaf", label: "背叛 (0, 30)", player: 0, children: [], payoffs: { u1: 0, u2: 30 }, actionLabel: "独吞 (Betray)" },
        "recip_leaf": { id: "recip_leaf", label: "共赢 (15, 15)", player: 0, children: [], payoffs: { u1: 15, u2: 15 }, actionLabel: "分配 (Share)" },
      }
    }
  },
  {
    name: "市场进入威慑博弈 (Entry Deterrence)",
    description: "新进入者选择是否进入，在位垄断巨头选择价格战或容忍瓜分。",
    nodeCoordinates: {
      "root": { x: 100, y: 150 },
      "out_leaf": { x: 100, y: 300 },
      "p2_node": { x: 300, y: 150 },
      "war_leaf": { x: 300, y: 300 },
      "coll_leaf": { x: 450, y: 150 }
    },
    config: {
      rootId: "root",
      nodes: {
        "root": { id: "root", label: "进入者 (P1)", player: 1, children: ["out_leaf", "p2_node"], actionLabel: "不进入 (Stay Out)" },
        "out_leaf": { id: "out_leaf", label: "观望 (0, 10)", player: 0, children: [], payoffs: { u1: 0, u2: 10 }, actionLabel: "不进入 (Stay Out)" },
        
        "p2_node": { id: "p2_node", label: "在位者 (P2)", player: 2, children: ["war_leaf", "coll_leaf"], actionLabel: "强行进入 (Enter)" },
        "war_leaf": { id: "war_leaf", label: "打压 (-2, -2)", player: 0, children: [], payoffs: { u1: -2, u2: -2 }, actionLabel: "价格战 (Fight)" },
        "coll_leaf": { id: "coll_leaf", label: "共存 (3, 3)", player: 0, children: [], payoffs: { u1: 3, u2: 3 }, actionLabel: "默许 (Accommodate)" },
      }
    }
  }
];

interface SequentialGameTabProps {
  config: SequentialGameConfig;
  setConfig: React.Dispatch<React.SetStateAction<SequentialGameConfig>>;
  onLog: (msg: string, type?: "info" | "success" | "warn") => void;
  onSelectCodeLine: (lineNum: number) => void;
  solverStep: number;
  setSolverStep: React.Dispatch<React.SetStateAction<number>>;
  setTotalSteps: (steps: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
}

export default function SequentialGameTab({
  config,
  setConfig,
  onLog,
  onSelectCodeLine,
  solverStep,
  setSolverStep,
  setTotalSteps,
  isPlaying,
  setIsPlaying,
}: SequentialGameTabProps) {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const currentPreset = SEQUENTIAL_PRESETS[selectedPresetIndex];
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Map of Backwards Induction optimal decision choices at each decision node
  const [subgameChoices, setSubgameChoices] = useState<Record<string, string>>({}); // nodeId -> selectedChildNodeId
  const [nodeDerivedPayoffs, setNodeDerivedPayoffs] = useState<Record<string, Payoff>>({}); // nodeId -> lifted payoffs

  // 1. Solve Backwards Induction
  useEffect(() => {
    const choices: Record<string, string> = {};
    const derived: Record<string, Payoff> = {};

    // Post-order traversal to solve backwards induction
    function solveNode(nodeId: string): Payoff {
      const node = config.nodes[nodeId];
      if (!node) return { u1: 0, u2: 0 };

      // Terminal node: return original payoffs
      if (node.player === 0) {
        return node.payoffs || { u1: 0, u2: 0 };
      }

      // Solve all children first
      const childPayoffs = node.children.map((childId) => ({
        id: childId,
        payoff: solveNode(childId)
      }));

      // Active player: 1 or 2
      const activePlayer = node.player;
      let selectedChildId = "";
      let bestPayoff: Payoff = { u1: -Infinity, u2: -Infinity };

      if (activePlayer === 1) {
        let maxVal = -Infinity;
        childPayoffs.forEach((item) => {
          if (item.payoff.u1 > maxVal) {
            maxVal = item.payoff.u1;
            selectedChildId = item.id;
            bestPayoff = item.payoff;
          }
        });
      } else if (activePlayer === 2) {
        let maxVal = -Infinity;
        childPayoffs.forEach((item) => {
          if (item.payoff.u2 > maxVal) {
            maxVal = item.payoff.u2;
            selectedChildId = item.id;
            bestPayoff = item.payoff;
          }
        });
      }

      choices[nodeId] = selectedChildId;
      derived[nodeId] = bestPayoff;

      return bestPayoff;
    }

    if (config.rootId && config.nodes[config.rootId]) {
      solveNode(config.rootId);
    }

    setSubgameChoices(choices);
    setNodeDerivedPayoffs(derived);
  }, [config]);

  // Backwards induction step-by-step animation sequence setup
  // We want to go backwards from deepest levels
  // For Centipede Game, let's sequence the decision nodes backwards:
  // Step 0: Initial game tree shown
  // Step 1: Solve stage4 (P2 decision at x=400) -> Chooses leaf_end (5,5) over leaf4 (3,6) or vice-versa
  // Step 2: Solve stage3 (P1 decision at x=290)
  // Step 3: Solve stage2 (P2 decision at x=180)
  // Step 4: Solve root (P1 decision at x=70)
  // Step 5: Highlighting of final SPE path
  const [animationSequence, setAnimationSequence] = useState<string[]>([]);

  useEffect(() => {
    // Collect decision nodes, sorted by their X coordinate backwards (deepest first)
    const decisionNodes = Object.keys(config.nodes).filter(
      (id) => config.nodes[id].player !== 0
    );
    decisionNodes.sort((a, b) => {
      const coordA = currentPreset.nodeCoordinates[a]?.x || 0;
      const coordB = currentPreset.nodeCoordinates[b]?.x || 0;
      return coordB - coordA; // Descending x
    });

    setAnimationSequence(decisionNodes);
    setTotalSteps(decisionNodes.length + 2); // 0: init, 1..N: nodes, N+1: final path
  }, [config, selectedPresetIndex, setTotalSteps]);

  // Handle animation stepping log updates
  useEffect(() => {
    if (solverStep === 0) {
      onSelectCodeLine(41);
    } else if (solverStep >= 1 && solverStep <= animationSequence.length) {
      onSelectCodeLine(45);
      const nodeId = animationSequence[solverStep - 1];
      const node = config.nodes[nodeId];
      const selectedId = subgameChoices[nodeId];
      const selectedNode = config.nodes[selectedId];
      const selectedPayoff = nodeDerivedPayoffs[nodeId];

      if (node && selectedNode) {
        onLog(
          `[子博弈归纳] 决策节点 "${node.label}" (Player ${node.player}) 进行倒推选择：相比其它选择，"${selectedNode.actionLabel || selectedNode.label}" 带来更优的 Player ${node.player} 收益 (P1: ${selectedPayoff.u1}, P2: ${selectedPayoff.u2})。对劣势选择进行剪枝 (Pruned)，并将最优收益向上回传至父节点。`,
          "info"
        );
      }
    } else if (solverStep === animationSequence.length + 1) {
      onSelectCodeLine(52);
      // Final SPE trace
      let current = config.rootId;
      const pathNodes = [current];
      while (subgameChoices[current]) {
        current = subgameChoices[current];
        pathNodes.push(current);
      }
      const pathText = pathNodes
        .map((id) => config.nodes[id]?.actionLabel || config.nodes[id]?.label)
        .filter(Boolean)
        .join(" → ");

      const rootPayoff = nodeDerivedPayoffs[config.rootId];

      onLog(
        `[归纳完成] 子博弈完美纳什均衡 (SPE) 路径高亮：${pathText}。最终博弈收益为: Player 1 = ${rootPayoff?.u1}, Player 2 = ${rootPayoff?.u2}。`,
        "success"
      );
    }
  }, [solverStep, animationSequence, config, subgameChoices, nodeDerivedPayoffs]);

  // Autoplay loop
  useEffect(() => {
    let timer: any;
    if (isPlaying && animationSequence.length > 0) {
      timer = setInterval(() => {
        setSolverStep((prev) => {
          if (prev >= animationSequence.length + 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, animationSequence]);

  const selectPreset = (idx: number) => {
    setSelectedPresetIndex(idx);
    const p = SEQUENTIAL_PRESETS[idx];
    setConfig({
      rootId: p.config.rootId,
      nodes: JSON.parse(JSON.stringify(p.config.nodes))
    });
    setSolverStep(0);
    setIsPlaying(false);
    setIsDemoMode(false);
    onLog(`加载多阶段博弈预设: ${p.name}`, "success");
  };

  // Check if a specific link is in the active SPE path
  const isLinkInSpePath = (parentId: string, childId: string) => {
    let current = config.rootId;
    while (subgameChoices[current]) {
      const chosen = subgameChoices[current];
      if (current === parentId && chosen === childId) {
        return true;
      }
      current = chosen;
    }
    return false;
  };

  // Check if a link is pruned during the active backwards induction solver step
  const isLinkPruned = (parentId: string, childId: string) => {
    // If we haven't solved this parent's step yet, don't prune it
    const parentSeqIdx = animationSequence.indexOf(parentId);
    if (parentSeqIdx === -1 || solverStep <= parentSeqIdx) {
      return false;
    }

    // If solved, and this child was not chosen, it is pruned!
    const chosenChildId = subgameChoices[parentId];
    return chosenChildId !== childId;
  };

  // Check if a link is highlighted as solved in current steps
  const isLinkSolvedActive = (parentId: string, childId: string) => {
    const parentSeqIdx = animationSequence.indexOf(parentId);
    // If this node is being processed or was processed, and this child was chosen, highlight!
    if (parentSeqIdx !== -1 && solverStep > parentSeqIdx) {
      const chosenChildId = subgameChoices[parentId];
      return chosenChildId === childId;
    }
    return false;
  };

  // Check if a terminal node is in the final SPE path
  const isTerminalInSpe = (terminalId: string) => {
    if (solverStep !== animationSequence.length + 1) return false;
    let current = config.rootId;
    while (subgameChoices[current]) {
      current = subgameChoices[current];
    }
    return current === terminalId;
  };

  // Check if a terminal node is currently being selected as the best choice
  const isTerminalSelectedActive = (terminalId: string) => {
    if (solverStep <= 0 || solverStep > animationSequence.length) return false;
    const activeNodeId = animationSequence[solverStep - 1];
    return subgameChoices[activeNodeId] === terminalId;
  };

  return (
    <div id="sequential-game-tab" className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* 1. Left controls panel */}
      <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-500" />
            1. 动态博弈树选择
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            切换经典的多阶段动态博弈树结构模型
          </p>
        </div>

        {/* Presets Grid */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-slate-600 block">经典多阶段博弈预设</label>
          <div className="space-y-2">
            {SEQUENTIAL_PRESETS.map((preset, idx) => (
              <button
                key={preset.name}
                onClick={() => selectPreset(idx)}
                className={`w-full text-left p-3.5 rounded-xl border transition flex flex-col gap-1.5 ${
                  selectedPresetIndex === idx
                    ? "bg-indigo-50/60 border-indigo-200 ring-2 ring-indigo-100"
                    : "bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold ${selectedPresetIndex === idx ? "text-indigo-700" : "text-slate-700"}`}>
                    {preset.name}
                  </span>
                  {selectedPresetIndex === idx && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {preset.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Backwards Induction derivation summary card */}
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
          <span className="text-xs font-bold text-slate-700 block flex items-center gap-1">
            <CornerDownRight className="w-3.5 h-3.5 text-indigo-500" />
            逆向归纳推导步骤
          </span>
          <div className="space-y-1.5 text-xs text-slate-600 max-h-[160px] overflow-y-auto pr-1">
            {animationSequence.map((nodeId, idx) => {
              const node = config.nodes[nodeId];
              const chosenId = subgameChoices[nodeId];
              const chosenNode = config.nodes[chosenId];
              const isSolved = solverStep > idx;

              return (
                <div key={nodeId} className={`flex items-center justify-between p-1 px-2 rounded-md ${isSolved ? "bg-emerald-50 text-emerald-800" : "bg-white text-slate-500"}`}>
                  <span className="font-medium truncate max-w-[120px]">
                    {idx + 1}. 解决 {node?.label}
                  </span>
                  {isSolved ? (
                    <span className="font-mono text-[10px] font-bold">
                      选 {chosenNode?.actionLabel?.split(" ")[0]} ➡️ ({nodeDerivedPayoffs[nodeId]?.u1}, {nodeDerivedPayoffs[nodeId]?.u2})
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400">待计算</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Retrograde Wave Demo Mode controls */}
        <div className="p-4 bg-indigo-50/40 border border-indigo-100/80 rounded-xl space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
              <Waves className="w-4 h-4 text-indigo-600 animate-pulse" />
              2. 逆向归纳高级演示模式
            </span>
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isDemoMode ? "bg-indigo-400" : "bg-slate-300"}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isDemoMode ? "bg-indigo-500" : "bg-slate-400"}`}></span>
            </span>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            点击启动逆向归纳的学术演示模式，体验从最底层决策节点向上回溯传播的动态“水波纹”视觉流。
          </p>

          <button
            onClick={() => {
              const newMode = !isDemoMode;
              setIsDemoMode(newMode);
              setIsPlaying(false);
              if (newMode) {
                setSolverStep(animationSequence.length + 1);
                onLog("🔮 开启逆向归纳演示模式：水波纹正自底层叶子向根节点传播，自动淡化次优(非SPNE)路径！", "success");
              } else {
                setSolverStep(0);
                onLog("🔮 已关闭逆向归纳演示模式，恢复分步推导视图", "info");
              }
            }}
            className={`w-full py-2.5 px-4 rounded-lg font-semibold text-xs shadow-sm transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 ${
              isDemoMode
                ? "bg-indigo-600 hover:bg-indigo-700 text-white ring-2 ring-indigo-200"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600"
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${isDemoMode ? "animate-spin text-white" : "text-indigo-500"}`} />
            {isDemoMode ? "关闭高级水波演示" : "开启逆向归纳水波演示"}
          </button>

          <div className="text-[10px] text-slate-400 leading-relaxed pt-1 border-t border-slate-100 font-sans">
            💡 <strong>特征：</strong>开启后，不符合子博弈完美纳什均衡（SPNE）的路径与结点将被<strong>自动淡化</strong>（Opacity - 90%），仅保留发光的黄金 SPE 理性演进路径。
          </div>
        </div>
      </div>

      {/* 2. Middle Visual Canvas Panel */}
      <div className="lg:col-span-7 bg-slate-50/50 border border-slate-100 rounded-2xl p-5 flex flex-col justify-between h-full min-h-[500px]">
        {/* Visualizer header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              SVG 拓扑结构树状博弈图
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {solverStep === 0 && "初始博弈树已渲染。点击“单步倒推”查看逆向归纳剪枝与色彩流动"}
              {solverStep >= 1 && solverStep <= animationSequence.length && `正在对节点 "${config.nodes[animationSequence[solverStep - 1]]?.label}" 进行最优化归纳`}
              {solverStep > animationSequence.length && "子博弈完美纳什均衡 (SPE) 荧光蓝色高亮全路径显示！"}
            </p>
          </div>
          <div className="text-[11px] bg-indigo-50 text-indigo-600 rounded-full px-2.5 py-1 font-medium font-mono">
            步骤: {solverStep} / {animationSequence.length + 1}
          </div>
        </div>

        {/* SVG Game Tree rendering */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="relative bg-white border border-slate-100 rounded-2xl p-4 shadow-xs overflow-x-auto max-w-full">
            <svg width="580" height="380" className="overflow-visible">
              <style>{`
                @keyframes retrograde-pulse {
                  0% {
                    stroke-dashoffset: 100;
                  }
                  100% {
                    stroke-dashoffset: 0;
                  }
                }
                @keyframes prune-flash {
                  0% {
                    stroke: #f87171;
                    stroke-width: 4;
                    filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.8));
                    opacity: 1;
                  }
                  15% {
                    stroke: #ef4444;
                    stroke-width: 5;
                    filter: drop-shadow(0 0 10px rgba(239, 68, 68, 1));
                    opacity: 1;
                  }
                  40% {
                    stroke: #f97316;
                    stroke-width: 4.5;
                    filter: drop-shadow(0 0 8px rgba(249, 115, 22, 0.8));
                    opacity: 1;
                  }
                  60% {
                    stroke: #ef4444;
                    stroke-width: 3.5;
                    filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.6));
                    opacity: 0.8;
                  }
                  100% {
                    stroke: #cbd5e1;
                    stroke-width: 1.5;
                    opacity: 0.15;
                  }
                }
                @keyframes spe-glow {
                  0% {
                    filter: drop-shadow(0 0 3px rgba(59, 130, 246, 0.5));
                  }
                  50% {
                    filter: drop-shadow(0 0 9px rgba(59, 130, 246, 0.95)) drop-shadow(0 0 14px rgba(99, 102, 241, 0.7));
                  }
                  100% {
                    filter: drop-shadow(0 0 3px rgba(59, 130, 246, 0.5));
                  }
                }
                @keyframes ripple-wave {
                  0% {
                    r: 18;
                    opacity: 0.85;
                    stroke-width: 3.5;
                  }
                  100% {
                    r: 45;
                    opacity: 0;
                    stroke-width: 1;
                  }
                }
                @keyframes payoff-popup {
                  0% {
                    transform: scale(0.3) translateY(12px);
                    opacity: 0;
                  }
                  70% {
                    transform: scale(1.1) translateY(-2px);
                    opacity: 0.9;
                  }
                  100% {
                    transform: scale(1) translateY(0);
                    opacity: 1;
                  }
                }
                .animate-retrograde-flow {
                  stroke-dasharray: 18 82;
                  animation: retrograde-pulse 1.2s infinite linear;
                }
                .animate-prune-flash {
                  animation: prune-flash 2s forwards ease-in-out;
                }
                .animate-spe-glow {
                  animation: spe-glow 2.2s infinite ease-in-out;
                }
                .animate-ripple-wave {
                  animation: ripple-wave 1.6s infinite cubic-bezier(0.1, 0.8, 0.3, 1);
                }
                .animate-payoff-popup {
                  transform-origin: center bottom;
                  animation: payoff-popup 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
              `}</style>

              <defs>
                {/* Glow filter */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                
                {/* Glow filter for SPE path */}
                <filter id="spe-glow-filter" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Draw Connections/Branches first */}
              {Object.keys(config.nodes).map((nodeId) => {
                const parent = config.nodes[nodeId];
                if (parent.player === 0) return null; // terminal node has no children

                const pCoord = currentPreset.nodeCoordinates[nodeId];
                if (!pCoord) return null;

                const parentSeqIdx = animationSequence.indexOf(nodeId);
                const isCurrentlyProcessed =
                  solverStep > 0 &&
                  solverStep <= animationSequence.length &&
                  animationSequence[solverStep - 1] === nodeId;

                return parent.children.map((childId) => {
                  const child = config.nodes[childId];
                  const cCoord = currentPreset.nodeCoordinates[childId];
                  if (!child || !cCoord) return null;

                  // Determine line properties based on solver states
                  const isPruned = isLinkPruned(nodeId, childId);
                  const isSolvedActive = isLinkSolvedActive(nodeId, childId);
                  const isInFinalSpe = isLinkInSpePath(nodeId, childId);
                  const isChosenChild = subgameChoices[nodeId] === childId;
                  const isJustPruned = isCurrentlyProcessed && !isChosenChild;

                  const showSpeLine = solverStep === animationSequence.length + 1 && isInFinalSpe;

                  let strokeColor = "#cbd5e1"; // default slate-300
                  let strokeWidth = "2";
                  let isDashed = false;
                  let strokeClass = "transition-all duration-500";
                  let filterVal = undefined;

                  if (isDemoMode) {
                    if (isInFinalSpe) {
                      strokeColor = "#6366f1"; // neon indigo for SPNE
                      strokeWidth = "4";
                      strokeClass = "animate-spe-glow transition-all duration-500";
                      filterVal = "url(#spe-glow-filter)";
                    } else {
                      strokeColor = "#cbd5e1";
                      strokeWidth = "1";
                      isDashed = true;
                      strokeClass = "transition-all duration-500 opacity-10";
                    }
                  } else {
                    if (isJustPruned) {
                      strokeClass = "animate-prune-flash";
                    } else if (isPruned) {
                      strokeColor = "#cbd5e1";
                      strokeWidth = "1.5";
                      isDashed = true;
                      strokeClass = "transition-all duration-500 opacity-15";
                    } else if (showSpeLine) {
                      strokeColor = "#3b82f6"; // neon blue
                      strokeWidth = "4";
                      strokeClass = "animate-spe-glow transition-all duration-500";
                      filterVal = "url(#spe-glow-filter)";
                    } else if (isSolvedActive) {
                      strokeColor = parent.player === 1 ? "#10b981" : "#3b82f6";
                      strokeWidth = "3.5";
                    }
                  }

                  // Label coordinates for branch (midway)
                  const labelX = (pCoord.x + cCoord.x) / 2 + (pCoord.y === cCoord.y ? 0 : 8);
                  const labelY = (pCoord.y + cCoord.y) / 2 - 8;

                  return (
                    <g key={`${nodeId}-${childId}`}>
                      {/* Connection Line */}
                      <line
                        key={`${nodeId}-${childId}-${isJustPruned}`}
                        x1={pCoord.x}
                        y1={pCoord.y}
                        x2={cCoord.x}
                        y2={cCoord.y}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={isDashed ? "3 3" : "none"}
                        className={strokeClass}
                        filter={filterVal}
                      />

                      {/* Retrograde Payoff Pulse (flows from child to parent) */}
                      {(((isCurrentlyProcessed && isChosenChild) || 
                         (solverStep > parentSeqIdx + 1 && isChosenChild && solverStep <= animationSequence.length)) ||
                        (isDemoMode && isInFinalSpe)) && (
                        <line
                          x1={cCoord.x}
                          y1={cCoord.y}
                          x2={pCoord.x}
                          y2={pCoord.y}
                          stroke={isDemoMode ? "#818cf8" : parent.player === 1 ? "#059669" : "#2563eb"}
                          strokeWidth="4"
                          strokeLinecap="round"
                          className="animate-retrograde-flow"
                          filter="url(#glow)"
                        />
                      )}

                      {/* Final SPE Continuous flow path overlay */}
                      {showSpeLine && !isDemoMode && (
                        <line
                          x1={cCoord.x}
                          y1={cCoord.y}
                          x2={pCoord.x}
                          y2={pCoord.y}
                          stroke="#60a5fa"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeDasharray="6 12"
                          style={{ animation: "retrograde-pulse 1.5s infinite linear" }}
                        />
                      )}

                      {/* Branch Action Text Label */}
                      {child.actionLabel && (
                        <text
                          x={labelX}
                          y={labelY}
                          fontSize="9"
                          fontWeight="600"
                          fill={
                            isDemoMode
                              ? isInFinalSpe
                                ? "#4f46e5" // bright indigo
                                : "#cbd5e1"
                              : isJustPruned
                              ? "#ef4444"
                              : isPruned
                              ? "#cbd5e1"
                              : showSpeLine
                              ? "#2563eb"
                              : "#475569"
                          }
                          opacity={
                            isDemoMode
                              ? isInFinalSpe
                                ? 1
                                : 0.1
                              : isPruned
                              ? 0.25
                              : 1
                          }
                          className="transition-all duration-300 select-none text-shadow-xs"
                          textAnchor="middle"
                        >
                          {child.actionLabel}
                        </text>
                      )}
                    </g>
                  );
                });
              })}

              {/* Draw Nodes on top */}
              {Object.keys(config.nodes).map((nodeId) => {
                const node = config.nodes[nodeId];
                const coord = currentPreset.nodeCoordinates[nodeId];
                if (!coord) return null;

                const isTerminal = node.player === 0;

                // Processing/highlight state
                const isCurrentlyProcessed =
                  solverStep > 0 &&
                  solverStep <= animationSequence.length &&
                  animationSequence[solverStep - 1] === nodeId;

                const parentSeqIdx = animationSequence.indexOf(nodeId);
                const solved = parentSeqIdx !== -1 && solverStep > parentSeqIdx;

                return (
                  <g key={nodeId} className="transition-all duration-500">
                    {(() => {
                      // Trace if this node is on the active SPNE path
                      let isNodeInSpe = false;
                      if (isTerminal) {
                        let current = config.rootId;
                        while (subgameChoices[current]) {
                          current = subgameChoices[current];
                        }
                        isNodeInSpe = current === nodeId;
                      } else {
                        let current = config.rootId;
                        isNodeInSpe = current === nodeId;
                        while (subgameChoices[current] && !isNodeInSpe) {
                          current = subgameChoices[current];
                          if (current === nodeId) {
                            isNodeInSpe = true;
                          }
                        }
                      }

                      // horizontal propagation distance-based delay (leaf is rightmost, propagates to left)
                      const max_X = 550;
                      const rippleDelay = Math.max(0, (max_X - coord.x) * 0.0035);

                      return (
                        <>
                          {/* Framer Motion Ripple Overlay for Demo Mode */}
                          {isDemoMode && (
                            <motion.circle
                              cx={coord.x}
                              cy={coord.y}
                              r={18}
                              fill="none"
                              stroke={isNodeInSpe ? "#6366f1" : "#94a3b8"}
                              strokeWidth={isNodeInSpe ? 3.5 : 1.5}
                              initial={{ r: 18, opacity: 0 }}
                              animate={{
                                r: [18, 55],
                                opacity: [0, 0.85, 0],
                              }}
                              transition={{
                                duration: 2.0,
                                delay: rippleDelay,
                                repeat: Infinity,
                                repeatDelay: 0.6,
                                ease: "easeOut"
                              }}
                              style={{ pointerEvents: "none" }}
                            />
                          )}

                          {isTerminal ? (
                            // Payoff terminal node (small green/blue pill or text box)
                            <g>
                              <rect
                                x={coord.x - 35}
                                y={coord.y - 14}
                                width="70"
                                height="28"
                                rx="6"
                                fill={
                                  isDemoMode
                                    ? isNodeInSpe
                                      ? "#eff6ff"
                                      : "#f8fafc"
                                    : isTerminalInSpe(nodeId)
                                    ? "#eff6ff" // SPE terminal
                                    : isTerminalSelectedActive(nodeId)
                                    ? "#ecfdf5" // actively feeding back
                                    : "#f8fafc"
                                }
                                stroke={
                                  isDemoMode
                                    ? isNodeInSpe
                                      ? "#6366f1"
                                      : "#cbd5e1"
                                    : isTerminalInSpe(nodeId)
                                    ? "#3b82f6" // neon blue
                                    : isTerminalSelectedActive(nodeId)
                                    ? "#10b981" // emerald
                                    : "#cbd5e1"
                                }
                                strokeWidth={
                                  isDemoMode
                                    ? isNodeInSpe
                                      ? "3"
                                      : "1"
                                    : isTerminalInSpe(nodeId) || isTerminalSelectedActive(nodeId)
                                    ? "2.5"
                                    : "1.5"
                                }
                                className={`filter drop-shadow-2xs transition-all duration-500 ${
                                  isDemoMode
                                    ? isNodeInSpe
                                      ? "animate-pulse"
                                      : "opacity-20"
                                    : isTerminalInSpe(nodeId)
                                    ? "animate-pulse"
                                    : isTerminalSelectedActive(nodeId)
                                    ? "animate-bounce"
                                    : ""
                                }`}
                                style={
                                  isDemoMode && isNodeInSpe
                                    ? { animationDuration: "1.5s" }
                                    : isTerminalInSpe(nodeId)
                                    ? { animationDuration: "1.5s" }
                                    : undefined
                                }
                              />
                              <text
                                x={coord.x}
                                y={coord.y + 4}
                                fontSize="10"
                                fontWeight="bold"
                                fontFamily="monospace"
                                fill={
                                  isDemoMode
                                    ? isNodeInSpe
                                      ? "#4f46e5"
                                      : "#94a3b8"
                                    : isTerminalInSpe(nodeId)
                                    ? "#1e40af"
                                    : isTerminalSelectedActive(nodeId)
                                    ? "#065f46"
                                    : "#334155"
                                }
                                className={isDemoMode && !isNodeInSpe ? "opacity-20 transition-all duration-500" : "transition-all duration-500"}
                                textAnchor="middle"
                              >
                                {node.payoffs ? `(${node.payoffs.u1}, ${node.payoffs.u2})` : ""}
                              </text>
                            </g>
                          ) : (
                            // Decision Node (circle with player identity)
                            <g>
                              {isCurrentlyProcessed && !isDemoMode && (
                                <>
                                  {/* Water Ripple Layer 1 */}
                                  <circle
                                    cx={coord.x}
                                    cy={coord.y}
                                    r="18"
                                    fill="none"
                                    stroke={node.player === 1 ? "#10b981" : "#3b82f6"}
                                    className="animate-ripple-wave"
                                  />
                                  {/* Water Ripple Layer 2 */}
                                  <circle
                                    cx={coord.x}
                                    cy={coord.y}
                                    r="18"
                                    fill="none"
                                    stroke={node.player === 1 ? "#10b981" : "#3b82f6"}
                                    className="animate-ripple-wave"
                                    style={{ animationDelay: "0.8s" }}
                                  />
                                </>
                              )}
                              <circle
                                cx={coord.x}
                                cy={coord.y}
                                r="18"
                                fill={
                                  isDemoMode
                                    ? isNodeInSpe
                                      ? node.player === 1
                                        ? "#ecfdf5"
                                        : "#eff6ff"
                                      : "#f1f5f9"
                                    : isCurrentlyProcessed
                                    ? node.player === 1
                                      ? "#059669"
                                      : "#2563eb"
                                    : node.player === 1
                                    ? "#ecfdf5" // light emerald P1
                                    : "#eff6ff" // light blue P2
                                }
                                stroke={
                                  isDemoMode
                                    ? isNodeInSpe
                                      ? node.player === 1
                                        ? "#10b981"
                                        : "#3b82f6"
                                      : "#cbd5e1"
                                    : isCurrentlyProcessed
                                    ? "#fff"
                                    : node.player === 1
                                    ? "#10b981"
                                    : "#3b82f6"
                                }
                                strokeWidth={isDemoMode && isNodeInSpe ? "3.5" : "2.5"}
                                className={`filter drop-shadow-sm cursor-help transition-all duration-300 ${
                                  isDemoMode && !isNodeInSpe ? "opacity-20" : ""
                                }`}
                              />
                              <text
                                x={coord.x}
                                y={coord.y + 4}
                                fontSize="11"
                                fontWeight="bold"
                                fill={
                                  isDemoMode
                                    ? isNodeInSpe
                                      ? "#1e293b"
                                      : "#94a3b8"
                                    : isCurrentlyProcessed
                                    ? "#fff"
                                    : "#1e293b"
                                }
                                textAnchor="middle"
                                className={`select-none transition-all duration-300 ${
                                  isDemoMode && !isNodeInSpe ? "opacity-20" : ""
                                }`}
                              >
                                P{node.player}
                              </text>

                              {/* Title text hover tag on node */}
                              <text
                                x={coord.x}
                                y={coord.y - 24}
                                fontSize="9"
                                fontWeight="bold"
                                fill={
                                  isDemoMode
                                    ? isNodeInSpe
                                      ? "#334155"
                                      : "#cbd5e1"
                                    : "#475569"
                                }
                                textAnchor="middle"
                                className={`select-none text-shadow-xs transition-all duration-300 ${
                                  isDemoMode && !isNodeInSpe ? "opacity-20" : ""
                                }`}
                              >
                                {node.label.split(" ")[0]}
                              </text>

                              {/* Floating Derived Payoff Bubble for Solved Decision Nodes */}
                              {(solved || isDemoMode) && (
                                <g className={`animate-payoff-popup ${isDemoMode && !isNodeInSpe ? "opacity-25" : ""}`}>
                                  <rect
                                    x={coord.x - 26}
                                    y={coord.y + 20}
                                    width="52"
                                    height="16"
                                    rx="4"
                                    fill={node.player === 1 ? "#ecfdf5" : "#eff6ff"}
                                    stroke={node.player === 1 ? "#10b981" : "#3b82f6"}
                                    strokeWidth="1"
                                    className="filter drop-shadow-3xs"
                                  />
                                  <text
                                    x={coord.x}
                                    y={coord.y + 31}
                                    fontSize="8.5"
                                    fontWeight="bold"
                                    fontFamily="monospace"
                                    fill={node.player === 1 ? "#065f46" : "#1e40af"}
                                    textAnchor="middle"
                                  >
                                    {`(${nodeDerivedPayoffs[nodeId]?.u1}, ${nodeDerivedPayoffs[nodeId]?.u2})`}
                                  </text>
                                </g>
                              )}
                            </g>
                          )}
                        </>
                      );
                    })()}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Help banner explanatory legend */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-slate-600">
          <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-slate-700">逆向归纳剪枝规则:</span>
            <p className="leading-relaxed">
              顺序博弈通过逆向归纳求解。我们从叶子结点开始逆向向上倒推，在每一个决策节点：
              当前行动的参与者会选择使自己收益最大的那个分支，其余不被选择的分支（即不合理威胁/劣势策略）即被
              <span className="font-semibold text-rose-500">“剪枝”</span>，不再起作用。
            </p>
          </div>
        </div>

        {/* Tab Footer Controls */}
        <div className="flex items-center justify-end border-t border-slate-100 pt-4 mt-2 gap-2">
          <button
            onClick={() => {
              setSolverStep(0);
              setIsPlaying(false);
              onLog("重置顺序博弈求解器状态", "info");
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
                自动倒推
              </>
            )}
          </button>

          <button
            onClick={() => {
              setSolverStep((prev) => Math.min(animationSequence.length + 1, prev + 1));
              setIsPlaying(false);
            }}
            disabled={solverStep === animationSequence.length + 1}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
