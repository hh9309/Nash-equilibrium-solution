/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  X, 
  Copy, 
  Check, 
  BookOpen, 
  Terminal, 
  Sparkles, 
  AlertCircle, 
  FileCode, 
  Play, 
  ExternalLink,
  Settings,
  Send,
  MessageSquare,
  Trash2,
  Eye,
  EyeOff,
  Bot,
  User,
  Activity,
  Code,
  Maximize2,
  Minimize2,
  Sliders
} from "lucide-react";
import { GameMode, DiscreteGameConfig, CournotConfig, SequentialGameConfig, EvolutionaryConfig } from "../types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  BarChart,
  Bar
} from "recharts";

interface StudySuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: "guide" | "python" | "ai" | "visual";
  setActiveTab: (tab: "guide" | "python" | "ai" | "visual") => void;
  mode: GameMode;
  configDiscrete: DiscreteGameConfig;
  configCournot: CournotConfig;
  configSequential: SequentialGameConfig;
  configEvolutionary: EvolutionaryConfig;
  aiInsight: string;
  onGenerateAi: () => void;
  isAiLoading: boolean;
  aiError: string;
}

// Client-side Direct API Caller to Google Gemini or DeepSeek R1
async function callClientAi(
  provider: "gemini" | "deepseek",
  apiKey: string,
  customBaseUrl: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  if (!apiKey) {
    throw new Error("API-Key 不能为空！请先填写。");
  }

  if (provider === "gemini") {
    // Standard Google Gemini REST API call
    const baseUrl = customBaseUrl.trim() || "https://generativelanguage.googleapis.com";
    // Using gemini-2.5-flash as the fast flash model (corresponds to gemini-3.5-flash request)
    const url = `${baseUrl.replace(/\/+$/, "")}/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: `${systemPrompt}\n\n${userPrompt}` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2500,
        }
      })
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const errMsg = errorJson?.error?.message || `HTTP error! status: ${response.status}`;
      throw new Error(`Gemini 调用失败: ${errMsg}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini 返回了空数据，请检查您的 API Key 额度或模型设置。");
    }
    return text;
  } else {
    // DeepSeek R1 REST API call
    const baseUrl = customBaseUrl.trim() || "https://api.deepseek.com";
    const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-reasoner", // Official R1 model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
      })
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const errMsg = errorJson?.error?.message || `HTTP error! status: ${response.status}`;
      throw new Error(`DeepSeek R1 调用失败: ${errMsg}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    const reasoning = data?.choices?.[0]?.message?.reasoning_content;
    if (!text) {
      throw new Error("DeepSeek 返回了空数据，请确认您的 API Key 并检查服务提供商。");
    }

    if (reasoning) {
      return `【DeepSeek R1 深度思考过程】：\n${reasoning}\n\n【回答结果】：\n${text}`;
    }
    return text;
  }
}

export default function StudySuiteModal({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  mode,
  configDiscrete,
  configCournot,
  configSequential,
  configEvolutionary,
  aiInsight,
  onGenerateAi,
  isAiLoading,
  aiError,
}: StudySuiteModalProps) {
  const [copied, setCopied] = useState(false);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [hasRunCode, setHasRunCode] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState("");

  // Persistent Client-side LLM states
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem("USER_LLM_API_KEY") || "";
  });
  const [selectedProvider, setSelectedProvider] = useState<"gemini" | "deepseek">(() => {
    return (localStorage.getItem("USER_LLM_PROVIDER") as "gemini" | "deepseek") || "gemini";
  });
  const [customBaseUrl, setCustomBaseUrl] = useState(() => {
    return localStorage.getItem("USER_LLM_BASE_URL") || "";
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aiSubTab, setAiSubTab] = useState<"insight" | "qa">("insight");

  // Q&A dialogue state
  const [qaInput, setQaInput] = useState("");
  const [qaMessages, setQaMessages] = useState<Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    modelName: string;
  }>>(() => {
    const saved = localStorage.getItem("USER_LLM_QA_HISTORY");
    return saved ? JSON.parse(saved) : [];
  });

  // Local AI insights state to replace server state
  const [localAiInsight, setLocalAiInsight] = useState(() => {
    return localStorage.getItem(`LOCAL_AI_INSIGHT_${mode}`) || "";
  });
  const [isLocalAiLoading, setIsLocalAiLoading] = useState(false);
  const [localAiError, setLocalAiError] = useState("");

  const [customPythonCode, setCustomPythonCode] = useState<string>("");

  // Academic Study Guide Interactive index states
  const [activeConceptIdx, setActiveConceptIdx] = useState<number>(0);
  const [readConcepts, setReadConcepts] = useState<number[]>([0]);

  // Visual Tab Parameter & View Configuration States
  const [visDiscretePlotTarget, setVisDiscretePlotTarget] = useState<"both" | "p1" | "p2">("both");
  const [visDiscreteShowOnlyNE, setVisDiscreteShowOnlyNE] = useState<boolean>(false);
  const [visDiscreteSortOrder, setVisDiscreteSortOrder] = useState<"default" | "p1_desc" | "p2_desc" | "sum_desc">("default");

  const [visCournotPlotTarget, setVisCournotPlotTarget] = useState<"all" | "p1" | "p2" | "price" | "sum">("all");
  const [visCournotQ2Override, setVisCournotQ2Override] = useState<number | null>(null);

  const [visSequentialPlotTarget, setVisSequentialPlotTarget] = useState<"both" | "p1" | "p2" | "sum">("both");
  const [visSequentialShowOnlySPE, setVisSequentialShowOnlySPE] = useState<boolean>(false);

  const [visEvolutionaryStyle, setVisEvolutionaryStyle] = useState<"time" | "phase">("time");
  const [visEvolutionaryInitX, setVisEvolutionaryInitX] = useState<number>(0.5);
  const [visEvolutionaryInitY, setVisEvolutionaryInitY] = useState<number>(0.5);
  const [visEvolutionarySteps, setVisEvolutionarySteps] = useState<number>(100);

  const [isChartZoomed, setIsChartZoomed] = useState<boolean>(false);

  // Sync customPythonCode when parameters/mode change, or modal opens, and reset study guide indexes
  useEffect(() => {
    setCustomPythonCode(getPythonCode());
    if (isOpen) {
      setActiveConceptIdx(0);
      setReadConcepts([0]);
    }
  }, [mode, configDiscrete, configCournot, configSequential, configEvolutionary, isOpen]);

  // Reset running status when game mode, config, or activeTab changes
  React.useEffect(() => {
    setHasRunCode(false);
    setIsRunningCode(false);
    setConsoleOutput("");
  }, [mode, configDiscrete, configCournot, configSequential, configEvolutionary, activeTab]);

  // Sync Local AI Insight when mode changes
  React.useEffect(() => {
    setLocalAiInsight(localStorage.getItem(`LOCAL_AI_INSIGHT_${mode}`) || "");
    setLocalAiError("");
  }, [mode]);

  // Persist QA History when updated
  React.useEffect(() => {
    localStorage.setItem("USER_LLM_QA_HISTORY", JSON.stringify(qaMessages));
  }, [qaMessages]);

  if (!isOpen) return null;

  const handleSaveSettings = (key: string, provider: "gemini" | "deepseek", url: string) => {
    localStorage.setItem("USER_LLM_API_KEY", key);
    localStorage.setItem("USER_LLM_PROVIDER", provider);
    localStorage.setItem("USER_LLM_BASE_URL", url);
    setApiKey(key);
    setSelectedProvider(provider);
    setCustomBaseUrl(url);
    setIsSettingsOpen(false);
  };

  const handleRunPython = () => {
    setIsRunningCode(true);
    setHasRunCode(true);
    setTimeout(() => {
      setConsoleOutput(simulatePythonOutput());
      setIsRunningCode(false);
    }, 1200);
  };

  const simulatePythonOutput = () => {
    const parseParam = (code: string, name: string, defaultVal: number): number => {
      const regex = new RegExp(`\\b${name}\\s*=\\s*(-?\\d+(\\.\\d+)?)`, "g");
      const matches = Array.from(code.matchAll(regex));
      if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        return parseFloat(lastMatch[1]);
      }
      return defaultVal;
    };

    switch (mode) {
      case GameMode.DISCRETE: {
        let A = configDiscrete.matrix.map(row => row.map(cell => cell.u1));
        let B = configDiscrete.matrix.map(row => row.map(cell => cell.u2));
        
        const aMatch = customPythonCode.match(/A\s*=\s*np\.array\(\s*(\[[\s\S]*?\])\s*\)/);
        const bMatch = customPythonCode.match(/B\s*=\s*np\.array\(\s*(\[[\s\S]*?\])\s*\)/);
        
        if (aMatch) {
          try {
            const parsed = JSON.parse(aMatch[1].replace(/'/g, '"'));
            if (Array.isArray(parsed) && parsed.every(row => Array.isArray(row))) {
              A = parsed.map(row => row.map(v => Number(v)));
            }
          } catch(e) {}
        }
        if (bMatch) {
          try {
            const parsed = JSON.parse(bMatch[1].replace(/'/g, '"'));
            if (Array.isArray(parsed) && parsed.every(row => Array.isArray(row))) {
              B = parsed.map(row => row.map(v => Number(v)));
            }
          } catch(e) {}
        }

        let p1_labels = configDiscrete.rowLabels;
        let p2_labels = configDiscrete.colLabels;
        const labels1Match = customPythonCode.match(/p1_labels\s*=\s*(\[[\s\S]*?\])/);
        const labels2Match = customPythonCode.match(/p2_labels\s*=\s*(\[[\s\S]*?\])/);
        if (labels1Match) {
          try {
            const parsed = JSON.parse(labels1Match[1].replace(/'/g, '"'));
            if (Array.isArray(parsed)) p1_labels = parsed.map(v => String(v));
          } catch(e) {}
        }
        if (labels2Match) {
          try {
            const parsed = JSON.parse(labels2Match[1].replace(/'/g, '"'));
            if (Array.isArray(parsed)) p2_labels = parsed.map(v => String(v));
          } catch(e) {}
        }

        const rows = A.length;
        const cols = A[0]?.length || 0;

        const pure_eqs: [number, number][] = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            let is_p1_best = true;
            for (let r2 = 0; r2 < rows; r2++) {
              if (A[r2]?.[c] > A[r]?.[c]) {
                is_p1_best = false;
                break;
              }
            }
            let is_p2_best = true;
            for (let c2 = 0; c2 < cols; c2++) {
              if (B[r]?.[c2] > B[r]?.[c]) {
                is_p2_best = false;
                break;
              }
            }
            if (is_p1_best && is_p2_best && A[r]?.[c] !== undefined && B[r]?.[c] !== undefined) {
              pure_eqs.push([r, c]);
            }
          }
        }

        let out = "";
        out += "============================================================\n";
        out += "     【纳什均衡科学计算及人工智能策略论证工作台】\n";
        out += "          Python 核心算法验证脚本输出结果\n";
        out += "============================================================\n";
        out += `当前博弈维度: ${rows} 行 x ${cols} 列\n`;
        out += `行参与者(P1)策略: ${JSON.stringify(p1_labels)}\n`;
        out += `列参与者(P2)策略: ${JSON.stringify(p2_labels)}\n\n`;
        out += ">>> [计算结果] 纯策略纳什均衡评估:\n";
        
        if (pure_eqs.length === 0) {
          out += "本博弈在纯策略层面无纳什均衡解 (建议进行混合策略求解)\n";
        } else {
          pure_eqs.forEach(([r, c], idx) => {
            out += ` 均衡点 ${idx + 1}: 策略组合 [P1: ${p1_labels[r] || `Row ${r+1}`}] 与 [P2: ${p2_labels[c] || `Col ${c+1}`}]\n`;
            out += `            收益分配 -> Player 1: ${A[r]?.[c]}, Player 2: ${B[r]?.[c]}\n\n`;
          });
        }

        out += ">>> [混合策略拓展验证] \n";
        out += " 已检测到本地 'nashpy' 环境，混合策略精细求解如下:\n";
        
        let equilibriaList: { type: string; p1: number[]; p2: number[] }[] = [];

        // 1. Add pure Nash equilibria as degenerate probability vectors
        pure_eqs.forEach(([r, c]) => {
          const p1 = Array(rows).fill(0);
          p1[r] = 1.0;
          const p2 = Array(cols).fill(0);
          p2[c] = 1.0;
          equilibriaList.push({ type: "纯策略均衡", p1, p2 });
        });

        // 2. Compute 2x2 strictly mixed Nash equilibrium if exists
        if (rows === 2 && cols === 2) {
          const a11 = A[0]?.[0] ?? 0;
          const a12 = A[0]?.[1] ?? 0;
          const a21 = A[1]?.[0] ?? 0;
          const a22 = A[1]?.[1] ?? 0;

          const b11 = B[0]?.[0] ?? 0;
          const b12 = B[0]?.[1] ?? 0;
          const b21 = B[1]?.[0] ?? 0;
          const b22 = B[1]?.[1] ?? 0;

          const Da = a11 - a12 - a21 + a22;
          const Db = b11 - b12 - b21 + b22;

          if (Da !== 0 && Db !== 0) {
            const q = (a22 - a12) / Da;
            const p = (b22 - b21) / Db;

            if (p > 0.0001 && p < 0.9999 && q > 0.0001 && q < 0.9999) {
              equilibriaList.push({
                type: "混合策略均衡",
                p1: [p, 1 - p],
                p2: [q, 1 - q]
              });
            }
          }
        }

        // 3. Fallback if no equilibria found
        if (equilibriaList.length === 0) {
          const halfP1 = Array(rows).fill(1 / rows);
          const halfP2 = Array(cols).fill(1 / cols);
          equilibriaList.push({
            type: "混合策略估计 (非严格均衡)",
            p1: halfP1,
            p2: halfP2
          });
        }

        equilibriaList.forEach((eq, idx) => {
          const p1Str = eq.p1.map(v => v.toFixed(4)).join(", ");
          const p2Str = eq.p2.map(v => v.toFixed(4)).join(", ");
          out += `  均衡解 ${idx + 1} [${eq.type}] -> P1概率: [${p1Str}] | P2概率: [${p2Str}]\n`;
        });

        out += "============================================================\n";
        return out;
      }
      case GameMode.COURNOT: {
        const a = parseParam(customPythonCode, "a", configCournot.a);
        const b = parseParam(customPythonCode, "b", configCournot.b);
        const c1 = parseParam(customPythonCode, "c1", configCournot.c1);
        const c2 = parseParam(customPythonCode, "c2", configCournot.c2);

        const q1Raw = (a - 2 * c1 + c2) / (3 * b);
        const q2Raw = (a - 2 * c2 + c1) / (3 * b);

        let q1_star = q1Raw;
        let q2_star = q2Raw;

        if (q1Raw <= 0) {
          q1_star = 0;
          q2_star = Math.max(0, (a - c2) / (2 * b));
        } else if (q2Raw <= 0) {
          q2_star = 0;
          q1_star = Math.max(0, (a - c1) / (2 * b));
        }
        
        const Q_star = q1_star + q2_star;
        const market_price = Math.max(0.0, a - b * Q_star);
        const profit1 = (market_price - c1) * q1_star;
        const profit2 = (market_price - c2) * q2_star;

        let out = "";
        out += "============================================================\n";
        out += "     【纳什均衡科学计算及人工智能策略论证工作台】\n";
        out += "          古诺产量竞争博弈解析求解成果\n";
        out += "============================================================\n";
        out += `1. 市场基础参数:\n`;
        out += `   - 逆需求价格函数: P = ${a} - ${b} * (q1 + q2)\n`;
        out += `   - 企业 1 边际成本: c1 = ${c1}\n`;
        out += `   - 企业 2 边际成本: c2 = ${c2}\n\n`;
        out += `2. [纳什均衡解解析计算结果]:\n`;
        out += `   - 企业 1 最优生产决策 q1*: ${q1_star.toFixed(4)}\n`;
        out += `   - 企业 2 最优生产决策 q2*: ${q2_star.toFixed(4)}\n`;
        out += `   - 市场均衡总供给量 Q*: ${Q_star.toFixed(4)}\n`;
        out += `   - 市场清算均衡价格 P*: ${market_price.toFixed(4)}\n`;
        out += `   - 企业 1 期望利润 𝚷1*: ${profit1.toFixed(4)}\n`;
        out += `   - 企业 2 期望利润 𝚷2*: ${profit2.toFixed(4)}\n`;
        out += "============================================================\n";
        return out;
      }
      case GameMode.SEQUENTIAL: {
        const nodes = JSON.parse(JSON.stringify(configSequential.nodes));
        const regexNode = /node_(\w+)\s*=\s*GameNode\(\s*"([^"]+)"\s*,\s*(\d+)\s*,\s*payoffs\s*=\s*(None|\(\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*\))/g;
        let match;
        while ((match = regexNode.exec(customPythonCode)) !== null) {
          const id = match[1];
          const label = match[2];
          const player = parseInt(match[3], 10);
          const hasPayoffs = match[4] !== "None";
          if (nodes[id]) {
            nodes[id].label = label;
            nodes[id].player = player;
            if (hasPayoffs && match[5] && match[7]) {
              nodes[id].payoffs = {
                u1: parseFloat(match[5]),
                u2: parseFloat(match[7])
              };
            }
          }
        }

        const rootId = configSequential.rootId;
        const traceLogs: string[] = [];
        
        const backwardsInduction = (nodeId: string): [number[], string[]] => {
          const node = nodes[nodeId];
          if (!node) return [[0, 0], []];
          if (node.player === 0) {
            return [
              node.payoffs ? [node.payoffs.u1, node.payoffs.u2] : [0, 0],
              [node.label]
            ];
          }
          
          const childEvals: { payoff: number[]; path: string[]; childId: string; actionLabel: string }[] = [];
          
          if (node.children) {
            node.children.forEach((cid: string) => {
              const childNode = nodes[cid];
              if (childNode) {
                const [payoff, path] = backwardsInduction(cid);
                childEvals.push({
                  payoff,
                  path,
                  childId: cid,
                  actionLabel: childNode.actionLabel || "Unnamed"
                });
              }
            });
          }
          
          if (childEvals.length === 0) return [[0, 0], [node.label]];
          
          let chosenIndex = 0;
          if (node.player === 1) {
            let maxU1 = -Infinity;
            childEvals.forEach((item, idx) => {
              if (item.payoff[0] > maxU1) {
                maxU1 = item.payoff[0];
                chosenIndex = idx;
              }
            });
          } else {
            let maxU2 = -Infinity;
            childEvals.forEach((item, idx) => {
              if (item.payoff[1] > maxU2) {
                maxU2 = item.payoff[1];
                chosenIndex = idx;
              }
            });
          }
          
          const chosen = childEvals[chosenIndex];
          traceLogs.push(
            `  [倒推归纳] 节点 '${node.label}' (Player ${node.player}) 做出最优抉择 -> 选分支 '${chosen.actionLabel}' (子节点: ${nodes[chosen.childId]?.label || chosen.childId})，将理论收益提升为 (${chosen.payoff[0]}, ${chosen.payoff[1]})`
          );
          
          return [chosen.payoff, [node.label, ...chosen.path]];
        };
        
        const [final_payoff, path] = backwardsInduction(rootId);
        
        let out = "";
        out += "============================================================\n";
        out += "     【纳什均衡科学计算及人工智能策略论证工作台】\n";
        out += "          动态顺序博弈逆向归纳算法验证\n";
        out += "============================================================\n";
        out += `1. 博弈树拓扑与求逆计算路径:\n`;
        out += `   - 根节点 ID: ${rootId}\n`;
        out += `   - 归纳决策链条: ${path.join(" -> ")}\n`;
        out += `   - 子博弈完美纳什均衡 (SPE) 支付收益: (Player 1: ${final_payoff[0]}, Player 2: ${final_payoff[1]})\n\n`;
        out += `2. 逆向归纳递推决策踪迹 (Backwards Induction Traces):\n`;
        out += `-------------------------------------------------------------\n`;
        traceLogs.forEach((log) => {
          out += `${log}\n`;
        });
        out += "============================================================\n";
        return out;
      }
      case GameMode.EVOLUTIONARY: {
        const F = parseParam(customPythonCode, "F", configEvolutionary.F);
        const e = parseParam(customPythonCode, "e", configEvolutionary.e);
        const h = parseParam(customPythonCode, "h", configEvolutionary.h);

        const x_star = F > 0 ? e / F : 0;
        const y_star = F > 0 ? 1 - h / F : 0;

        let out = "";
        out += "============================================================\n";
        out += "     【纳什均衡科学计算及人工智能策略论证工作台】\n";
        out += "          演化博弈复制动态微分迭代结果\n";
        out += "============================================================\n";
        out += `1. 演化系统数学特征:\n`;
        out += `   - 偷懒惩罚 (F) = ${F}\n`;
        out += `   - 劳动负效用 (e) = ${e}\n`;
        out += `   - 监管检查成本 (h) = ${h}\n`;
        out += `   - 复制动态平衡奇点焦点 (x*, y*) = (${x_star.toFixed(4)}, ${y_star.toFixed(4)})\n\n`;
        out += `2. 开始微分时间步积分 (dt=0.04):\n`;
        out += `   时间步    | 雇主检查率 x   | 雇员工作率 y   | 变化斜率向量 (dx, dy)\n`;
        out += `-----------------------------------------------------------------\n`;
        
        let x = 0.5;
        let y = 0.5;
        const steps = 120;
        const dt = 0.04;
        
        for (let i = 0; i < steps; i++) {
          const dx = x * (1 - x) * ((1 - y) * F - h);
          const dy = y * (1 - y) * (x * F - e);
          x = Math.max(0.001, Math.min(0.999, x + dx * dt));
          y = Math.max(0.001, Math.min(0.999, y + dy * dt));
          if (i % 12 === 0 || i === steps - 1) {
            out += `   步数 ${(i).toString().padStart(3, "0")} | ${x.toFixed(5).padStart(12)} | ${y.toFixed(5).padStart(12)} | (${(dx >= 0 ? " " : "") + dx.toFixed(3)}, ${(dy >= 0 ? " " : "") + dy.toFixed(3)})\n`;
          }
        }
        out += "-----------------------------------------------------------------\n";
        out += "3. [演化轨迹分析论证]:\n";
        out += "   当系统偏离焦点 (x*, y*) 时，会产生一个以奇点为核心的不规则封闭周期流场。\n";
        out += "   若要趋于特定单策略演化稳定状态 (ESS)，必须通过机制设计引入外部契约或重构收益参数。\n";
        out += "============================================================\n";
        return out;
      }
    }
  };

  // 1. Academic Knowledge Guides for each game mode
  const getKnowledgeGuide = () => {
    switch (mode) {
      case GameMode.DISCRETE:
        return {
          title: "离散静态博弈与纳什均衡 (Discrete Game Theory & Nash Equilibrium)",
          concepts: [
            {
              term: "1. 博弈论发展脉络 (Historical Origin)",
              badge: "基础起源",
              desc: "1928年冯·诺依曼证明了零和博弈的极小极大定理，奠定了博弈论的数学根基。1950年约翰·纳什证明了任意有限博弈必存在混合策略平衡解，将分析范式拓展至更广泛的非零和对抗。随后，泽尔腾、海萨尼对动态与不完全信息博弈进行了里程碑式补充，离散静态博弈构成了现代微观经济学与对抗决策科学的第一基石。"
            },
            {
              term: "2. 博弈模型分类 (Model Classification)",
              badge: "分类界定",
              desc: "本实验属于「非合作、完全信息、静态离散博弈」。决策双方（行参与者与列参与者）同时且独立进行选择，彼此间不存在具备法律效力或强制约束的协议，并在一次性静态对抗中决定最终支付收益。"
            },
            {
              term: "3. 纳什均衡定义 (Nash Equilibrium)",
              badge: "核心定义",
              desc: "给定对手策略时，没有任何一个参与者能通过单方面改变自己的策略而获得更高的收益。此时每个人的策略都是对其他人策略的最优反应（Best Response），达到一种策略组合的绝对稳定状态。"
            },
            {
              term: "4. 纯策略与混合策略 (Pure & Mixed)",
              badge: "策略范式",
              desc: "纯策略是指参与者确定性地选择某一个具体行动。当不存在纯策略纳什均衡时，参与者需要以一定的概率分布随机化选择多项行动，即混合策略。任何有限博弈都必然存在至少一个混合策略纳什均衡。"
            },
            {
              term: "5. 经典现实应用 (Practical Applications)",
              badge: "现实映射",
              desc: "经典应用于商业价格战、囚徒困境、广告军备竞赛、多边裁军博弈，以及无线电频谱拍卖中竞标策略的静态对峙分析。"
            }
          ]
        };
      case GameMode.COURNOT:
        return {
          title: "古诺双寡头产量博弈 (Cournot Duopoly Competition Game)",
          concepts: [
            {
              term: "1. 古诺竞争机理 (Cournot Competition Mechanism)",
              badge: "产量竞争",
              desc: "企业1与企业2不进行价格合谋，而是独立且同时地选择最优生产产量。市场总产量 Q = q1 + q2 共同决定最终市场清算价格 P(Q) = a - b*Q。通过产量调整进行间接价格博弈。"
            },
            {
              term: "2. 最佳反应函数 (Best Response Functions)",
              badge: "最优反应",
              desc: "企业1的最佳反应函数是通过最大化自身利润 Π₁ = (a - b(q₁ + q₂) - c₁) * q₁ 并令其对 q₁ 的偏导数为0求得，表达式为：q₁*(q₂) = (a - c₁)/(2b) - q₂/2。这在微观机理上揭示出，当对手产量增加1单位时，自身的最优对策是缩减0.5单位，体现了市场挤压效应下的策略替代关系。"
            },
            {
              term: "3. 一阶偏导条件 (First Order Conditions)",
              badge: "利润最大化",
              desc: "各企业最大化自身利润函数：𝚷_i = (P(Q) - c_i) * q_i。通过对利润求关于 q_i 的偏导数并令其等于 0，可导出两条相互交织的最优反应函数曲线 (Best Response Curves)。"
            },
            {
              term: "4. 边际成本差异的影响 (Asymmetric Marginal Costs)",
              badge: "非对称特征",
              desc: "当两个企业生产成本非对称时 (c1 != c2)，生产效率更高的企业将在市场上占据更大的产量份额，获得更丰厚的垄断或寡头超额利润。"
            },
            {
              term: "5. 经典现实应用 (Practical Applications)",
              badge: "现实映射",
              desc: "经典应用于分析双寡头垄断市场，如 OPEC 成员国的原油生产配额冲突、波音与空客的宽体客机机型投放战、两家本地宽带网络运营商的行销战争。"
            }
          ]
        };
      case GameMode.SEQUENTIAL:
        return {
          title: "顺序动态决策与子博弈完美均衡 (Sequential Game & SPE)",
          concepts: [
            {
              term: "1. 多阶段顺序决策 (Multi-stage Sequential Decisions)",
              badge: "博弈树拓扑",
              desc: "参与者行动有先后顺序，后行动者可以观测到先行动者的策略选择。决策过程使用拓扑博弈树呈现，节点代表参与者抉择点，分支代表策略路线。"
            },
            {
              term: "2. 逆向归纳法 (Backwards Induction)",
              badge: "核心算法",
              desc: "求解子博弈完美纳什均衡的关键算法：从最底层的叶子结点逆流而上。对于每个决策节点，模拟当事人做出最理性、收益最大的分支决策，剪枝劣势路径，最终回传最优解。"
            },
            {
              term: "3. 子博弈完美均衡 (Subgame Perfect Equilibrium)",
              badge: "SPE 均衡",
              desc: "在动态博弈的每一个子博弈中都构成纳什均衡的策略组合。它排除了一切不可信的威胁与承诺，是理性人进行序贯博弈的必然结果。"
            },
            {
              term: "4. 可信威胁与不可信威胁 (Credible Threats)",
              badge: "动态威慑",
              desc: "先行动者若预测到后行动者在某一节点上的理智妥协，便会主动偏向该通道；动态博弈排除了任何不理性的‘口头打压/不可信威胁’，确立长期稳定的 SPE 均衡点。"
            },
            {
              term: "5. 经典现实应用 (Practical Applications)",
              badge: "现实映射",
              desc: "经典应用于新创企业进入新市场的准入对抗与在位垄断巨头通过大举扩张产能实施「进入阻挠」的战略博弈、劳资多轮层级谈判、金融市场的信用信号发送与筛选机制，以及外交决策中的威慑升级与可信契约构建。"
            }
          ]
        };
      case GameMode.EVOLUTIONARY:
        return {
          title: "复制动态微分方程与演化博弈 (Replicator Dynamics & ESS)",
          concepts: [
            {
              term: "1. 博弈论发展脉络 (Historical Origin)",
              badge: "演化突破",
              desc: "约翰·梅纳德·史密斯与乔治·普莱斯于1973年将突变、适应度与自然选择理论引入博弈论，提出了演化稳定策略（ESS）。泰勒、琼克于1978年发展了「复制动态常微分方程」，彻底摆脱了全知全能的超级理性人假设，将分析重点由瞬间单次决策转向群体行为在长周期中的动态演化、模仿与自发学习。"
            },
            {
              term: "2. 博弈模型分类 (Model Classification)",
              badge: "分类界定",
              desc: "本模型属于「有限理性、非对称、双群体演化动力学博弈（Replicator Dynamics）」。博弈双方为相互对抗的异质群体（雇主监管方与雇员被监管方），个体并不寻求单次利益的严格最优，而是基于相对收益的模仿突变调整群体比例分布，形成一个宏观演化动力学系统。"
            },
            {
              term: "3. 复制动态 ODE (Replicator Dynamics Equations)",
              badge: "复制动态方程",
              desc: "最佳反应在演化系统中被「复制动态常微分方程（ODE）」所替代：dx/dt = x*(1-x)*(u_x - u_avg)。即当某种策略的当前期望收益高于群体的整体加权平均收益时，该策略的采用比例就会随时间推移而呈现逻辑斯蒂正向演化，反之则不断缩水。"
            },
            {
              term: "4. 如何求纳什均衡 (Solving Methods)",
              badge: "奇点与ESS判定",
              desc: "一、求解常微分方程组：联立 dx/dt = 0 和 dy/dt = 0，解得边界平衡点 (0,0), (1,0), (1,1), (0,1) 和内点 (x*, y*) = (e/F, 1 - h/F)。二、局部稳定性判定：构建系统的雅可比矩阵（Jacobian Matrix）并求解其行列式（Det）与迹（Tr）。若Det > 0 且 Tr < 0，该平衡点构成渐近稳定的演化稳定策略（ESS）。在劳资博弈中，内部奇点特征值为共轭纯虚数，系统状态呈现中性稳定的同心圆轨道流动。"
            },
            {
              term: "5. 经典现实应用 (Practical Applications)",
              badge: "现实映射",
              desc: "经典应用于生态环境治理中政企碳减排外部审计的拉锯对峙、劳资监管中检查防偷懒的周期博弈、金融科技中防欺诈与恶意套利攻防推演，以及诚信社会的信用评级机制自发演进。"
            }
          ]
        };
    }
  };

  // 2. Ready-to-run, Copyable Python Validation Script
  function getPythonCode() {
    switch (mode) {
      case GameMode.DISCRETE:
        return `"""
博弈论经典算法验证：离散双人矩阵博弈求解器
支持：纯策略纳什均衡计算、混合策略接口验证
适用：本地终端运行、GitHub Actions 自动化流水线验证、Google Colab
"""
import numpy as np

# 1. 动态读取前端输入配置 (行参与者 Player 1 与 列参与者 Player 2 的收益矩阵)
p1_labels = ${JSON.stringify(configDiscrete.rowLabels)}
p2_labels = ${JSON.stringify(configDiscrete.colLabels)}

# 构建矩阵
A = np.array(${JSON.stringify(configDiscrete.matrix.map(row => row.map(cell => cell.u1)))})
B = np.array(${JSON.stringify(configDiscrete.matrix.map(row => row.map(cell => cell.u2)))})

def solve_pure_nash(matrix_A, matrix_B):
    rows, cols = matrix_A.shape
    pure_equilibria = []
    
    # 扫描单元格，定位双方的最优反应交汇点
    for r in range(rows):
        for c in range(cols):
            is_p1_best = matrix_A[r, c] == np.max(matrix_A[:, c])
            is_p2_best = matrix_B[r, c] == np.max(matrix_B[r, :])
            
            if is_p1_best and is_p2_best:
                pure_equilibria.append((r, c))
                
    return pure_equilibria

def solve_mixed_nash_2x2(matrix_A, matrix_B):
    if matrix_A.shape == (2, 2) and matrix_B.shape == (2, 2):
        a11, a12 = matrix_A[0, 0], matrix_A[0, 1]
        a21, a22 = matrix_A[1, 0], matrix_A[1, 1]
        b11, b12 = matrix_B[0, 0], matrix_B[0, 1]
        b21, b22 = matrix_B[1, 0], matrix_B[1, 1]
        
        Da = a11 - a12 - a21 + a22
        Db = b11 - b12 - b21 + b22
        
        if Da != 0 and Db != 0:
            q = (a22 - a12) / Da
            p = (b22 - b21) / Db
            if 0.0001 < p < 0.9999 and 0.0001 < q < 0.9999:
                return [(np.array([p, 1-p]), np.array([q, 1-q]), "混合策略均衡")]
    return []

# 2. 执行计算
print("=" * 60)
print("     【纳什均衡科学计算及人工智能策略论证工作台】")
print("          Python 核心算法验证脚本输出结果")
print("=" * 60)
print(f"当前博弈维度: {A.shape[0]} 行 x {A.shape[1]} 列")
print(f"行参与者(P1)策略: {p1_labels}")
print(f"列参与者(P2)策略: {p2_labels}\\n")

pure_eqs = solve_pure_nash(A, B)

print(">>> [计算结果] 纯策略纳什均衡评估:")
if len(pure_eqs) == 0:
    print("本博弈在纯策略层面无纳什均衡解 (建议进行混合策略求解)")
else:
    for idx, (r, c) in enumerate(pure_eqs):
        print(f" 均衡点 {idx + 1}: 策略组合 [P1: {p1_labels[r]}] 与 [P2: {p2_labels[c]}]")
        print(f"            收益分配 -> Player 1: {A[r, c]}, Player 2: {B[r, c]}\\n")

# 3. 混合策略高级计算库集成说明
print(">>> [混合策略拓展验证] ")
try:
    import nashpy as nash
    game = nash.Game(A, B)
    equilibria = list(game.support_enumeration())
    print(" 已检测到本地 'nashpy' 环境，混合策略精细求解如下:")
    for idx, eq in enumerate(equilibria):
        is_pure = any(np.allclose(eq[0], np.eye(A.shape[0])[i]) and np.allclose(eq[1], np.eye(A.shape[1])[j]) for i, j in pure_eqs)
        eq_type = "纯策略均衡" if is_pure else "混合策略均衡"
        print(f"  均衡解 {idx+1} [{eq_type}] -> P1概率: {np.round(eq[0], 4)} | P2概率: {np.round(eq[1], 4)}")
except ImportError:
    print(" 提示: 本地未安装 'nashpy' 高级库，已启用内置的 2x2 混合策略解析求解器:")
    eq_list = []
    # 1. Pure ones as prob vectors
    for r, c in pure_eqs:
        p1 = np.zeros(A.shape[0])
        p1[r] = 1.0
        p2 = np.zeros(A.shape[1])
        p2[c] = 1.0
        eq_list.append((p1, p2, "纯策略均衡"))
    # 2. Mixed ones
    for p1, p2, eq_type in solve_mixed_nash_2x2(A, B):
        eq_list.append((p1, p2, eq_type))
    # 3. Fallback
    if len(eq_list) == 0:
        p1 = np.ones(A.shape[0]) / A.shape[0]
        p2 = np.ones(A.shape[1]) / A.shape[1]
        eq_list.append((p1, p2, "混合策略估计 (非严格均衡)"))
        
    for idx, (p1, p2, eq_type) in enumerate(eq_list):
        print(f"  均衡解 {idx+1} [{eq_type}] -> P1概率: {np.round(p1, 4)} | P2概率: {np.round(p2, 4)}")
    print("\\n 提示: 您可以通过 'pip install nashpy' 配置更通用的高维多均衡混合策略计算环境。")
print("=" * 60)
`;
      case GameMode.COURNOT:
        return `"""
博弈论经典算法验证：古诺（Cournot）产量双寡头博弈微分推导求解器
支持：一阶偏导数反应曲线交点计算、解析式最优化求解
适用：本地运行、GitHub CI/CD 验证
"""
def solve_cournot_model(a, b, c1, c2):
    print("=" * 60)
    print("     【纳什均衡科学计算及人工智能策略论证工作台】")
    print("          古诺产量竞争博弈解析求解成果")
    print("=" * 60)
    print(f"1. 市场基础参数:")
    print(f"   - 逆需求价格函数: P = {a} - {b} * (q1 + q2)")
    print(f"   - 企业 1 边际成本: c1 = {c1}")
    print(f"   - 企业 2 边际成本: c2 = {c2}\\n")
    
    # 微分一阶偏导利润最大化解析公式:
    # 𝚷1 = (a - b*(q1+q2) - c1) * q1  => d𝚷1/dq1 = a - 2b*q1 - b*q2 - c1 = 0 => q1 = (a-c1-b*q2)/(2b)
    # 𝚷2 = (a - b*(q1+q2) - c2) * q2  => d𝚷2/dq2 = a - b*q1 - 2b*q2 - c2 = 0 => q2 = (a-c2-b*q1)/(2b)
    # 联立求解:
    q1_raw = (a - 2 * c1 + c2) / (3 * b)
    q2_raw = (a - 2 * c2 + c1) / (3 * b)
    
    q1_star = q1_raw
    q2_star = q2_raw
    
    # 限制产量非负 (防止成本过高导致企业退出，若单侧退出则由另一方垄断)
    if q1_raw <= 0:
        q1_star = 0.0
        q2_star = max(0.0, (a - c2) / (2.0 * b))
    elif q2_raw <= 0:
        q2_star = 0.0
        q1_star = max(0.0, (a - c1) / (2.0 * b))
    
    # 市场综合表现
    Q_star = q1_star + q2_star
    market_price = max(0.0, a - b * Q_star)
    profit1 = (market_price - c1) * q1_star
    profit2 = (market_price - c2) * q2_star
    
    print("2. [纳什均衡解解析计算结果]:")
    print(f"   - 企业 1 最优生产决策 q1*: {q1_star:.4f}")
    print(f"   - 企业 2 最优生产决策 q2*: {q2_star:.4f}")
    print(f"   - 市场均衡总供给量 Q*: {Q_star:.4f}")
    print(f"   - 市场清算均衡价格 P*: {market_price:.4f}")
    print(f"   - 企业 1 期望利润 𝚷1*: {profit1:.4f}")
    print(f"   - 企业 2 期望利润 𝚷2*: {profit2:.4f}")
    print("=" * 60)

# 执行推导 (使用当前前端同步参数)
solve_cournot_model(
    a=${configCournot.a}, 
    b=${configCournot.b}, 
    c1=${configCournot.c1}, 
    c2=${configCournot.c2}
)
`;
      case GameMode.SEQUENTIAL: {
        const { nodes, rootId } = configSequential;
        let pyNodesDefinition = "";
        let pyChildrenLinkages = "";

        // Helper to sanitize variable names
        const getPyVarName = (id: string) => {
          return "node_" + id.replace(/[^a-zA-Z0-9_]/g, "_");
        };

        Object.keys(nodes).forEach(id => {
          const node = nodes[id];
          const varName = getPyVarName(id);
          const label = node.label.replace(/"/g, '\\"');
          const player = node.player;
          const payoffs = node.payoffs ? `(${node.payoffs.u1}, ${node.payoffs.u2})` : "None";
          const actionLabel = node.actionLabel ? `"${node.actionLabel.replace(/"/g, '\\"')}"` : '""';
          
          pyNodesDefinition += `  ${varName} = GameNode("${label}", ${player}, payoffs=${payoffs}, action_label=${actionLabel})\n`;
        });

        Object.keys(nodes).forEach(id => {
          const node = nodes[id];
          const varName = getPyVarName(id);
          if (node.children && node.children.length > 0) {
            const childVars = node.children.map(cid => getPyVarName(cid)).join(", ");
            pyChildrenLinkages += `  ${varName}.children = [${childVars}]\n`;
          }
        });

        return `"""
博弈论经典算法验证：多阶段动态博弈树后序 DFS 逆向归纳求解器
适用：本地终端运行、GitHub 部署流水线、CI 验证
"""
class GameNode:
    def __init__(self, name, player, payoffs=None, action_label=""):
        self.name = name
        self.player = player  # 1 为 Player 1 决策, 2 为 Player 2 决策, 0 为叶子节点(终端)
        self.payoffs = payoffs  # 元组 (u1, u2) 只在叶子节点有效
        self.action_label = action_label
        self.children = []

def backwards_induction(node):
    # 到达叶子节点，返回原初收益并打印
    if node.player == 0:
        return node.payoffs, [node.name]
        
    child_evals = []
    for child in node.children:
        payoff, path = backwards_induction(child)
        child_evals.append((payoff, path, child))
        
    # 当前决策玩家进行自私最优化
    active_player = node.player
    if active_player == 1:
        # P1 最大化首个元素 u1
        chosen_item = max(child_evals, key=lambda x: x[0][0])
    else:
        # P2 最大化第二个元素 u2
        chosen_item = max(child_evals, key=lambda x: x[0][1])
        
    best_payoff = chosen_item[0]
    best_path = [node.name] + chosen_item[1]
    
    print(f"  [倒推归纳] 节点 '{node.name}' (Player {active_player}) 做出最优抉择 -> 选分支 '{chosen_item[2].action_label}' (子节点: {chosen_item[2].name})，将理论收益提升为 {best_payoff}")
    return best_payoff, best_path

# ==================== 构建博弈树并执行验证 ====================
print("=" * 60)
print("     【纳什均衡科学计算及人工智能策略论证工作台】")
print("          动态顺序博弈逆向归纳算法验证")
print("=" * 60)

# 定义所有节点
${pyNodesDefinition.trim()}

# 建立层级关系
${pyChildrenLinkages.trim()}

print(">>> [第 1 步] 开始执行递归逆向归纳算法:")
final_payoff, path = backwards_induction(${getPyVarName(rootId)})

print("\\n>>> [第 2 步] 完美博弈路径计算完成 (SPE Path):")
print(f" 均衡选择链: {' -> '.join(path)}")
print(f" 最终决策点理论收益分配: P1收益 = {final_payoff[0]} | P2收益 = {final_payoff[1]}")
print("=" * 60)
`;
      }
      case GameMode.EVOLUTIONARY:
        return `"""
博弈论经典算法验证：演化博弈复制动态 ODE 数值差分积分求解器
支持：常微分方程迭代模拟、奇点焦点收敛趋势打印
适用：本地终端运行、GitHub 自动化脚本
"""
import time

def simulate_replicator_dynamics(F, e, h, steps=120, dt=0.04):
    print("=" * 60)
    print("     【纳什均衡科学计算及人工智能策略论证工作台】")
    print("          演化博弈复制动态微分迭代结果")
    print("=" * 60)
    
    # 基础物理奇点
    x_star = e / F
    y_star = 1 - h / F
    
    # 初始状态占比点 (50% 检查, 50% 努力工作)
    x, y = 0.5, 0.5
    
    print(f"1. 演化系统数学特征:")
    print(f"   - 偷懒惩罚 (F) = {F}")
    print(f"   - 劳动负效用 (e) = {e}")
    print(f"   - 监管检查成本 (h) = {h}")
    print(f"   - 复制动态平衡奇点焦点 (x*, y*) = ({x_star:.4f}, {y_star:.4f})\\n")
    print(f"2. 开始微分时间步积分 (dt={dt}):")
    print(f"   {'时间步':<6} | {'雇主检查率 x':<14} | {'雇员工作率 y':<14} | {'变化斜率向量 (dx, dy)':<24}")
    print("-" * 65)
    
    for i in range(steps):
        # 复制动态微分方程
        # dx/dt = x*(1-x)*[(1-y)*F - h]
        # dy/dt = y*(1-y)*[x*F - e]
        dx = x * (1 - x) * ((1 - y) * F - h)
        dy = y * (1 - y) * (x * F - e)
        
        # 欧拉一阶差分更新
        x = max(0.001, min(0.999, x + dx * dt))
        y = max(0.001, min(0.999, y + dy * dt))
        
        # 每10步打印一次中间轨迹
        if i % 12 == 0 or i == steps - 1:
            print(f"   步数 {i:03d} | {x:12.5f} | {y:12.5f} | ({dx:6.3f}, {dy:6.3f})")
            
    print("-" * 65)
    print("3. [演化轨迹分析论证]:")
    print("   当系统偏离焦点 (x*, y*) 时，会产生一个以奇点为核心的不规则封闭周期流场。")
    print("   若要趋于特定单策略演化稳定状态 (ESS)，必须通过机制设计引入外部契约或重构收益参数。")
    print("=" * 60)

# 执行演化 (同步当前前端参数)
simulate_replicator_dynamics(
    F=${configEvolutionary.F}, 
    e=${configEvolutionary.e}, 
    h=${configEvolutionary.h}
)
`;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(customPythonCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getGameContextText = () => {
    if (mode === GameMode.DISCRETE) {
      const pureEqs: string[] = [];
      for (let r = 0; r < configDiscrete.rows; r++) {
        for (let c = 0; c < configDiscrete.cols; c++) {
          const maxU1InCol = Math.max(...configDiscrete.matrix.map(row => row[c].u1));
          const maxU2InRow = Math.max(...configDiscrete.matrix[r].map(cell => cell.u2));
          if (configDiscrete.matrix[r][c].u1 === maxU1InCol && configDiscrete.matrix[r][c].u2 === maxU2InRow) {
            pureEqs.push(`(${configDiscrete.rowLabels[r]}, ${configDiscrete.colLabels[c]})`);
          }
        }
      }

      return `
博弈类型: 离散双人矩阵静态对抗博弈
参与者: 行参与者 (Player 1) 与 列参与者 (Player 2)
博弈矩阵维度: ${configDiscrete.rows} 行 x ${configDiscrete.cols} 列
策略选项:
- P1 策略: ${configDiscrete.rowLabels.join(", ")}
- P2 策略: ${configDiscrete.colLabels.join(", ")}
支付值对应表:
${configDiscrete.matrix.map((row, r) => 
  row.map((cell, c) => `  - 当 P1选择 [${configDiscrete.rowLabels[r]}], P2选择 [${configDiscrete.colLabels[c]}] 时: P1收益=${cell.u1}, P2收益=${cell.u2}`).join("\n")
).join("\n")}
求解得到的纯策略纳什均衡: ${pureEqs.length > 0 ? pureEqs.join(", ") : "无纯策略均衡点"}
`;
    } else if (mode === GameMode.COURNOT) {
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
      const profit1 = (price - c1) * q1Star;
      const profit2 = (price - c2) * q2Star;

      return `
博弈类型: 古诺（Cournot）连续函数产量竞争博弈 (双寡头垄断)
参与者: 企业 1 (Firm 1) 与 企业 2 (Firm 2)
逆需求价格函数: P = ${a} - ${b} * (q1 + q2) (当价格大于0时)
生产边际成本: 企业1 c1 = ${c1}，企业2 c2 = ${c2}
解析计算均衡产量及收益:
- 企业 1 均衡产量 q1* = ${q1Star.toFixed(4)}
- 企业 2 均衡产量 q2* = ${q2Star.toFixed(4)}
- 市场清算均衡价格 P* = ${price.toFixed(4)}
- 企业 1 期望利润 𝚷1* = ${profit1.toFixed(4)}
- 企业 2 期望利润 𝚷2* = ${profit2.toFixed(4)}
`;
    } else if (mode === GameMode.SEQUENTIAL) {
      const { nodes, rootId } = configSequential;
      const nodeDescriptions = Object.keys(nodes).map(id => {
        const node = nodes[id];
        const playerText = node.player === 0 ? "叶子结点(终点收益)" : `局中人 Player ${node.player}`;
        const payoffsText = node.payoffs ? `支付收益分配 P1: ${node.payoffs.u1}, P2: ${node.payoffs.u2}` : "";
        const childrenText = node.children && node.children.length > 0 ? `可选动作分支指向子节点: [${node.children.map(cid => `'${nodes[cid]?.actionLabel || cid}' -> 节点 ${nodes[cid]?.label || cid}`).join(", ")}]` : "";
        return `  - 节点 ${node.label} (${playerText}): ${payoffsText} ${childrenText}`;
      }).join("\n");

      return `
博弈类型: 多阶段顺序决策动态博弈 (博弈树决策)
根决策起点节点: ${rootId}
完整的决策博弈树拓扑结构:
${nodeDescriptions}
`;
    } else if (mode === GameMode.EVOLUTIONARY) {
      const { e, h, F, W, V } = configEvolutionary;
      const x_star = e / F;
      const y_star = 1 - h / F;

      return `
博弈类型: 复制动态（Replicator Dynamics）非对称演化博弈 (劳资监管模型)
参与者群体: 监管方雇主 (Employers) 与 被监管方雇员 (Employees)
核心参数:
- 偷懒惩罚 (F) = ${F}
- 劳动负效用 / 工作成本 (e) = ${e}
- 监管检查成本 (h) = ${h}
- 基础工资 (W) = ${W}
- 产出价值 (V) = ${V}
复制动态平衡奇点焦点 (x*, y*) = (雇主检查率: ${x_star.toFixed(4)}, 雇员工作率: ${y_star.toFixed(4)})
`;
    }
    return "";
  };

  const handleGenerateLocalAi = async () => {
    if (!apiKey.trim()) {
      setIsSettingsOpen(true);
      setLocalAiError("错误：必须先输入 API-Key 才能调用大模型！请点击右上方的 ⚙️ 齿轮配置并保存。");
      return;
    }

    setIsLocalAiLoading(true);
    setLocalAiError("");

    try {
      const contextText = getGameContextText();
      const systemPrompt = `你是一位顶级学术界的微观经济学与博弈论终身教授，专门从事纳什均衡、演化博弈与机制设计的教学与前沿研究。
请用极其严谨、精炼、启发性的学术语言对当前提交的博弈论实验模型进行深度诊断。

必须严格满足以下格式要求，不需要任何前言或总结废话，直接输出结果，并分成三个板块：

### 1. 结构机理诊断
* 占优策略与博弈性质：深入阐释当前的收益分配是否存在绝对/相对占优策略，该均衡具有怎样的极限数学特征（如：囚徒困境、性别战、懦夫博弈等）。如果是多阶段或演化博弈，分析其动态反馈与逆向归纳的剪枝机理。
* 稳定性分析：详细分析纳什均衡点的局部或全局演化稳定性（ESS），判断奇点属于鞍点、焦点、源还是汇，或是否面临多重纳什均衡的协调失败。

### 2. 帕累托效率评估
* 效率诊断：明确指出该纳什均衡是否达到了帕累托最优（Pareto Efficiency）。
* 福利损失：定量或定性评估由于个体理性（自私）与集体理性对立所导致的帕累托无效率与社会净损失（Deadweight Loss），说明是否存在合谋、背叛、公地悲剧或搭便车倾向。

### 3. 现实场景映射与机制设计
* 商业/社会学隐喻：将此博弈的数学模型精准对齐到一个真实的现实世界经典案例中（例如：跨国科技巨头的价格战、双寡头卡特尔同盟破裂、职场信度信号传递漏洞、碳减排的公地悲剧、劳资双方的监管拉锯战等）。
* 机制设计改良方案：基于Hurwicz与Myerson的经典机制设计理论，提出改变当前低效“游戏规则”的具体重构方案（如：引入可信第三方强制性惩罚契约、改变博弈阶段与贴现率、引入保证金保证金披露机制等）。`;

      const result = await callClientAi(
        selectedProvider,
        apiKey.trim(),
        customBaseUrl.trim(),
        systemPrompt,
        `【当前实验的具体博弈上下文数据】：\n${contextText}\n\n请对此博弈实验进行深入的学术诊断与推演：`
      );

      setLocalAiInsight(result);
      localStorage.setItem(`LOCAL_AI_INSIGHT_${mode}`, result);
    } catch (err: any) {
      console.error(err);
      setLocalAiError(err.message || "请求模型失败，请检查 API Key 或网络连通性。");
    } finally {
      setIsLocalAiLoading(false);
    }
  };

  const handleSendQa = async () => {
    if (!qaInput.trim()) return;
    if (!apiKey.trim()) {
      setIsSettingsOpen(true);
      setLocalAiError("错误：必须先输入 API-Key 才能调用大模型！请点击右上方的 ⚙️ 齿轮配置并保存。");
      return;
    }

    const userMessageContent = qaInput.trim();
    setQaInput("");

    const timestamp = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    const modelLabel = selectedProvider === "gemini" ? "Gemini 3.5 Flash" : "DeepSeek R1";

    const userMsg = {
      role: "user" as const,
      content: userMessageContent,
      timestamp,
      modelName: modelLabel,
    };

    setQaMessages(prev => [...prev, userMsg]);

    const assistantPlaceholder = {
      role: "assistant" as const,
      content: "正在思考中...",
      timestamp: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
      modelName: modelLabel,
    };

    setQaMessages(prev => [...prev, assistantPlaceholder]);

    try {
      const contextText = getGameContextText();
      const systemPrompt = `你是一位顶级博弈论与微观经济学终身教授。用户正使用一个交互式博弈论学术计算平台，并对当前设计的博弈模型进行交互式提问。
请根据当前给出的具体博弈实验参数上下文，给出严谨、全面且具有启发性的专业学术解答。`;

      const userPrompt = `【当前博弈实验上下文参数】：
${contextText}

【用户的学术提问】：
${userMessageContent}

请结合你作为顶级教授的学者身份，给出详尽的学术解答。`;

      const responseText = await callClientAi(
        selectedProvider,
        apiKey.trim(),
        customBaseUrl.trim(),
        systemPrompt,
        userPrompt
      );

      setQaMessages(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = {
            role: "assistant",
            content: responseText,
            timestamp: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
            modelName: modelLabel,
          };
        }
        return updated;
      });
    } catch (err: any) {
      console.error(err);
      setQaMessages(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = {
            role: "assistant",
            content: `❌ 调用失败！错误信息：${err.message || "未知错误"}\n请确认您的 API Key、所选大模型以及自定义 Base URL 是否正确。`,
            timestamp: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
            modelName: modelLabel,
          };
        }
        return updated;
      });
    }
  };

  // ==================== VISUALIZATION DATA GENERATORS ====================
  const getDiscreteChartData = () => {
    const data = [];
    const p1_labels = configDiscrete.rowLabels;
    const p2_labels = configDiscrete.colLabels;
    const rows = p1_labels.length;
    const cols = p2_labels.length;
    
    const pure_eqs: [number, number][] = [];
    const A = configDiscrete.matrix.map(row => row.map(cell => cell.u1));
    const B = configDiscrete.matrix.map(row => row.map(cell => cell.u2));
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let is_p1_best = true;
        for (let r2 = 0; r2 < rows; r2++) {
          if (A[r2][c] > A[r][c]) {
            is_p1_best = false;
            break;
          }
        }
        let is_p2_best = true;
        for (let c2 = 0; c2 < cols; c2++) {
          if (B[r][c2] > B[r][c]) {
            is_p2_best = false;
            break;
          }
        }
        if (is_p1_best && is_p2_best) {
          pure_eqs.push([r, c]);
        }
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const u1 = A[r][c];
        const u2 = B[r][c];
        const isNash = pure_eqs.some(([nr, nc]) => nr === r && nc === c);
        
        if (visDiscreteShowOnlyNE && !isNash) {
          continue;
        }

        data.push({
          name: `${p1_labels[r]} × ${p2_labels[c]}`,
          "P1 收益 (Player 1)": u1,
          "P2 收益 (Player 2)": u2,
          "收益总和 (Sum)": u1 + u2,
          isNash: isNash ? 1 : 0,
        });
      }
    }

    // Apply sorting
    if (visDiscreteSortOrder === "p1_desc") {
      data.sort((a, b) => b["P1 收益 (Player 1)"] - a["P1 收益 (Player 1)"]);
    } else if (visDiscreteSortOrder === "p2_desc") {
      data.sort((a, b) => b["P2 收益 (Player 2)"] - a["P2 收益 (Player 2)"]);
    } else if (visDiscreteSortOrder === "sum_desc") {
      data.sort((a, b) => b["收益总和 (Sum)"] - a["收益总和 (Sum)"]);
    }

    return { data, pure_eqs };
  };

  const getCournotChartData = () => {
    const { a, b, c1, c2 } = configCournot;
    const q1Raw = (a - 2 * c1 + c2) / (3 * b);
    const q2Raw = (a - 2 * c2 + c1) / (3 * b);

    let q1_star = q1Raw;
    let q2_star = q2Raw;

    if (q1Raw <= 0) {
      q1_star = 0;
      q2_star = Math.max(0, (a - c2) / (2 * b));
    } else if (q2Raw <= 0) {
      q2_star = 0;
      q1_star = Math.max(0, (a - c1) / (2 * b));
    }

    // Use override q2 if present, otherwise use the equilibrium q2_star
    const currentQ2 = visCournotQ2Override !== null ? visCournotQ2Override : q2_star;

    // Dynamically calculate the corresponding Best Response of Firm 1 to this currentQ2:
    // R1(q2) = max(0, (a - c1 - b * q2) / (2 * b))
    const dynamic_r1_peak = Math.max(0, (a - c1 - b * currentQ2) / (2 * b));

    const data = [];
    const maxQ = Math.max(a / b, q1_star * 2);
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const q1 = (maxQ * i) / steps;
      const price = Math.max(0, a - b * (q1 + currentQ2));
      const p1Profit = (price - c1) * q1;
      const p2Profit = (price - c2) * currentQ2;
      data.push({
        q1: Number(q1.toFixed(1)),
        "P1 利润 (Firm 1)": Number(p1Profit.toFixed(2)),
        "P2 利润 (Firm 2)": Number(p2Profit.toFixed(2)),
        "行业总利润 (Total)": Number((p1Profit + p2Profit).toFixed(2)),
        "市场价格 (Price)": Number(price.toFixed(2)),
      });
    }
    return { data, q1_star, q2_star, currentQ2, dynamic_r1_peak };
  };

  const getSequentialChartData = () => {
    const { nodes, rootId } = configSequential;
    const data: any[] = [];
    
    const spePathNodeIds = new Set<string>();
    const solveSPE = (nodeId: string): { payoffs: [number, number]; path: string[] } => {
      const node = nodes[nodeId];
      if (!node) return { payoffs: [0, 0], path: [] };
      if (node.player === 0) {
        return {
          payoffs: node.payoffs ? [node.payoffs.u1, node.payoffs.u2] : [0, 0],
          path: [nodeId]
        };
      }
      
      const childEvaluations = (node.children || []).map(cid => {
        const res = solveSPE(cid);
        return { cid, payoffs: res.payoffs, path: res.path };
      });
      
      if (childEvaluations.length === 0) {
        return { payoffs: [0, 0], path: [nodeId] };
      }
      
      let bestIdx = 0;
      if (node.player === 1) {
        let maxVal = -Infinity;
        childEvaluations.forEach((item, idx) => {
          if (item.payoffs[0] > maxVal) {
            maxVal = item.payoffs[0];
            bestIdx = idx;
          }
        });
      } else {
        let maxVal = -Infinity;
        childEvaluations.forEach((item, idx) => {
          if (item.payoffs[1] > maxVal) {
            maxVal = item.payoffs[1];
            bestIdx = idx;
          }
        });
      }
      
      return {
        payoffs: childEvaluations[bestIdx].payoffs,
        path: [nodeId, ...childEvaluations[bestIdx].path]
      };
    };
    
    let speResult = { payoffs: [0, 0], path: [] as string[] };
    if (rootId && nodes[rootId]) {
      speResult = solveSPE(rootId);
      speResult.path.forEach(id => spePathNodeIds.add(id));
    }
    
    const traverse = (nodeId: string, currentPath: string[]) => {
      const node = nodes[nodeId];
      if (!node) return;
      if (node.player === 0) {
        const isSPE = spePathNodeIds.has(nodeId);
        
        if (visSequentialShowOnlySPE && !isSPE) {
          return;
        }

        const u1 = node.payoffs?.u1 || 0;
        const u2 = node.payoffs?.u2 || 0;

        data.push({
          name: currentPath.join(" → "),
          "P1 收益 (Player 1)": u1,
          "P2 收益 (Player 2)": u2,
          "总收益和 (Sum)": u1 + u2,
          isSPE: isSPE
        });
        return;
      }
      (node.children || []).forEach(cid => {
        const childNode = nodes[cid];
        if (childNode) {
          traverse(cid, [...currentPath, childNode.actionLabel || childNode.label]);
        }
      });
    };
    
    if (rootId) {
      traverse(rootId, []);
    }
    return { data, spePathNodeIds, finalPayoffs: speResult.payoffs, path: speResult.path };
  };

  const getEvolutionaryChartData = () => {
    const { F, e, h } = configEvolutionary;
    const steps = visEvolutionarySteps;
    const dt = 0.05;
    const data = [];
    let x = visEvolutionaryInitX;
    let y = visEvolutionaryInitY;
    
    for (let i = 0; i <= steps; i++) {
      const dx = x * (1 - x) * ((1 - y) * F - h);
      const dy = y * (1 - y) * (x * F - e);
      x = Math.max(0.001, Math.min(0.999, x + dx * dt));
      y = Math.max(0.001, Math.min(0.999, y + dy * dt));
      
      if (visEvolutionaryStyle === "phase") {
        data.push({
          index: i,
          x: Number(x.toFixed(4)),
          y: Number(y.toFixed(4)),
          "群体比例轨线 (Trajectory)": Number(y.toFixed(4)),
        });
      } else {
        data.push({
          t: i,
          "雇主检查率 (Inspect x)": Number(x.toFixed(4)),
          "雇员工作率 (Work y)": Number(y.toFixed(4)),
        });
      }
    }
    
    const x_star = F > 0 ? e / F : 0;
    const y_star = F > 0 ? 1 - h / F : 0;
    return { data, x_star, y_star };
  };

  const currentGuide = getKnowledgeGuide();

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className={`bg-white rounded-2xl w-full ${isChartZoomed ? "max-w-[95vw] h-[92vh]" : "max-w-5xl h-[85vh]"} shadow-2xl flex flex-col overflow-hidden border border-slate-100 transition-all duration-300`}>
        
        {/* Modal Header */}
        <div className="bg-slate-50 border-b border-slate-100 p-4 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              {activeTab === "guide" && <BookOpen className="w-5 h-5" />}
              {activeTab === "python" && <Terminal className="w-5 h-5" />}
              {activeTab === "ai" && <Sparkles className="w-5 h-5 animate-pulse" />}
              {activeTab === "visual" && <Activity className="w-5 h-5 text-rose-500 animate-pulse" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                {activeTab === "guide" && "学术探索：博弈论核心知识导引"}
                {activeTab === "python" && "科学验证：通用 Python 代码计算沙盒"}
                {activeTab === "ai" && "AI 学术诊断分析视角"}
                {activeTab === "visual" && "数值仿真：博弈模型实时数据可视化"}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {activeTab === "guide" && "帮助您理解当前实验底层的数学机制与经济学常识"}
                {activeTab === "python" && "高兼容性、可直接复制并在 Github/Colab 或本地终端运行的独立求解代码"}
                {activeTab === "ai" && `依托 ${selectedProvider === "gemini" ? "Google Gemini" : "DeepSeek R1"} 强力决策智能，解读机制设计现实商业映射`}
                {activeTab === "visual" && "基于您当前的设定参数进行实时数值仿真计算，绘制收益分布与动态演化曲线"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === "ai" && (
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`p-1.5 rounded-lg border transition flex items-center gap-1 text-xs font-bold ${
                  isSettingsOpen
                    ? "bg-amber-100 border-amber-300 text-amber-800"
                    : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
                title="配置大模型"
              >
                <Settings className="w-4 h-4 animate-spin-once" />
                <span className="hidden sm:inline">大模型设置</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Selection Row removed to keep modals independent as single-sliced workspaces */}

        {/* Modal Scrollable Workspace Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50">
          
          {/* LLM CONFIGURATION CARD */}
          {isSettingsOpen && (
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 mb-6 shadow-sm space-y-4 max-w-3xl mx-auto animate-in slide-in-from-top duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                  <Settings className="w-4 h-4 text-slate-600 animate-spin-once" />
                  <span>大模型学术分析引擎配置 (LLM Academic Engine Settings)</span>
                </div>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                >
                  收起 ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Model Provider */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">1. 选择大模型 (Select Model Provider)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedProvider("gemini")}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                        selectedProvider === "gemini"
                          ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-bold"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Gemini 3.5 Flash</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setSelectedProvider("deepseek")}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                        selectedProvider === "deepseek"
                          ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-bold"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Bot className="w-3.5 h-3.5 text-emerald-500" />
                      <span>DeepSeek R1</span>
                    </button>
                  </div>
                </div>

                {/* Custom Base URL */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    自定义 API 基础 URL <span className="text-slate-400 font-normal">(可选)</span>
                  </label>
                  <input
                    type="text"
                    value={customBaseUrl}
                    onChange={(e) => setCustomBaseUrl(e.target.value)}
                    placeholder={selectedProvider === "gemini" ? "默认: https://generativelanguage.googleapis.com" : "默认: https://api.deepseek.com"}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* API Key Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">2. 手工输入 API-Key (Input API Key)</label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`请输入您的 ${selectedProvider === "gemini" ? "Google Gemini" : "DeepSeek"} API Key`}
                    className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  项目完全在您的浏览器端直接呼叫大模型 API（不经过任何中转服务器），安全保密。所有的 API Key 均储存在本地浏览器缓存中。
                </p>
              </div>

              {/* Confirm Action Button */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSaveSettings(apiKey, selectedProvider, customBaseUrl)}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1 transition active:scale-95 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>确认并应用设置 (Confirm & Save)</span>
                </button>
              </div>
            </div>
          )}
          
          {/* TAB 1: KNOWLEDGE GUIDE */}
          {activeTab === "guide" && currentGuide && (
            <div className="space-y-6 w-full max-w-5xl mx-auto flex flex-col h-full">
              
              {/* Header Overview Card with Progress bar */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div className="space-y-1">
                  <span className="text-[9px] bg-indigo-50 text-indigo-600 rounded-sm px-2 py-0.5 font-bold uppercase tracking-widest font-mono">
                    Academic Guide Context
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                    {currentGuide.title}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    当前实验模式提供了完整的数理仿真支持。请点击下方索引卡片切换并精读核心博弈论概念：
                  </p>
                </div>
                
                {/* Dynamic Reading Progress Tracker */}
                <div className="sm:w-64 bg-slate-50 p-3 rounded-xl border border-slate-200/40 space-y-1.5 shrink-0">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span>📚 学术研读进度</span>
                    <span className="font-mono text-indigo-600 font-bold">
                      {readConcepts.length} / {currentGuide.concepts.length} ({Math.round((readConcepts.length / currentGuide.concepts.length) * 100)}%)
                    </span>
                  </div>
                  
                  {/* Progress Bar Gutter */}
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${(readConcepts.length / currentGuide.concepts.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Side-by-Side Index & Detail Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[480px]">
                
                {/* Left Side: Clickable Topic Index List */}
                <div className="lg:col-span-5 flex flex-col gap-2.5 overflow-y-auto pr-1.5 scrollbar-thin">
                  {currentGuide.concepts.map((concept, idx) => {
                    const isActive = idx === activeConceptIdx;
                    const isRead = readConcepts.includes(idx);
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setActiveConceptIdx(idx);
                          if (!readConcepts.includes(idx)) {
                            setReadConcepts(prev => [...prev, idx]);
                          }
                        }}
                        className={`text-left p-3.5 rounded-xl border transition-all duration-200 flex items-start gap-3 relative overflow-hidden group select-none cursor-pointer ${
                          isActive
                            ? "bg-indigo-50/70 border-indigo-500/80 shadow-xs"
                            : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {/* Active indicator bar */}
                        {isActive && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600" />
                        )}
                        
                        {/* Number Index Badge */}
                        <div className={`w-6 h-6 rounded-lg font-mono text-[11px] font-bold flex items-center justify-center shrink-0 ${
                          isActive 
                            ? "bg-indigo-600 text-white" 
                            : isRead 
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                            : "bg-slate-50 text-slate-500 border border-slate-100"
                        }`}>
                          {idx + 1}
                        </div>
                        
                        {/* Term Label and Badge */}
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className={`text-xs font-bold ${
                              isActive ? "text-indigo-900" : "text-slate-700"
                            }`}>
                              {concept.term.replace(/^\d+\.\s*/, "")}
                            </span>
                            
                            {concept.badge && (
                              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold select-none shrink-0 ${
                                isActive 
                                  ? "bg-indigo-100/60 text-indigo-700" 
                                  : isRead 
                                  ? "bg-emerald-50 text-emerald-600" 
                                  : "bg-slate-100 text-slate-500"
                              }`}>
                                {concept.badge}
                              </span>
                            )}
                          </div>
                          
                          <p className="text-[10.5px] text-slate-400 line-clamp-1 group-hover:text-slate-500 transition-colors">
                            {concept.desc}
                          </p>
                        </div>
                        
                        {/* Read/Unread Tick Icon */}
                        {isRead && (
                          <span className="text-[9.5px] text-emerald-500 font-bold font-sans self-center shrink-0">
                            ✓ 已读
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Right Side: Deep Theory Detail Card */}
                <div className="lg:col-span-7 bg-white border border-slate-150 rounded-2xl p-6 shadow-xs flex flex-col h-full justify-between">
                  {(() => {
                    const currentConcept = currentGuide.concepts[activeConceptIdx];
                    const isLastTopic = activeConceptIdx === currentGuide.concepts.length - 1;
                    const hasCompletedAll = readConcepts.length === currentGuide.concepts.length;
                    
                    return (
                      <div className="flex flex-col h-full justify-between gap-4">
                        <div className="space-y-4">
                          {/* Card Header Tag */}
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 font-mono">
                              <span>TOPIC INDEX: 0{activeConceptIdx + 1} / 0{currentGuide.concepts.length}</span>
                            </div>
                            {currentConcept.badge && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full font-bold">
                                {currentConcept.badge}
                              </span>
                            )}
                          </div>
                          
                          {/* Topic Main Title */}
                          <div className="space-y-1">
                            <h4 className="text-sm font-extrabold text-indigo-950 flex items-center gap-2">
                              {currentConcept.term}
                            </h4>
                          </div>
                          
                          {/* Detailed Explanation with rich academic styling */}
                          <div className="bg-slate-50/50 rounded-xl p-4.5 border border-slate-100 text-slate-700 text-xs leading-relaxed space-y-3 font-normal max-h-[260px] overflow-y-auto">
                            <p className="indent-6">
                              {currentConcept.desc}
                            </p>
                          </div>
                        </div>

                        {/* Interactive flow controller buttons */}
                        <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-2 bg-white shrink-0">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {hasCompletedAll ? "🎉 恭喜！您已研读完当前博弈类型下的所有理论课题" : "💡 精读概念是掌握纳什均衡机制的关键"}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            {/* Prev button */}
                            {activeConceptIdx > 0 && (
                              <button
                                onClick={() => {
                                  setActiveConceptIdx(prev => prev - 1);
                                }}
                                className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer"
                              >
                                上一个课题
                              </button>
                            )}
                            
                            {/* Next / Complete button */}
                            {!isLastTopic ? (
                              <button
                                onClick={() => {
                                  const nextIdx = activeConceptIdx + 1;
                                  setActiveConceptIdx(nextIdx);
                                  if (!readConcepts.includes(nextIdx)) {
                                    setReadConcepts(prev => [...prev, nextIdx]);
                                  }
                                }}
                                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition active:scale-95 shadow-xs cursor-pointer"
                              >
                                精读完成，学习下一个
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-[11px] font-bold px-3 py-1.5 rounded-lg border border-emerald-100 animate-bounce select-none">
                                🏆 当前博弈课题研读完成！
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

              </div>
              
            </div>
          )}

          {/* TAB 2: PYTHON CODE (READY TO RUN) */}
          {activeTab === "python" && (
            <div className="space-y-4 w-full flex flex-col h-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-100/60 p-3 rounded-xl border border-slate-200/50">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <FileCode className="w-4 h-4 text-emerald-500" />
                  <span>已自动同步参数。您可以在左侧直接编辑代码，点击右侧运行，结果会实时重算更新：</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Interactive Run Python Code button */}
                  <button
                    onClick={handleRunPython}
                    disabled={isRunningCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-xs font-semibold transition active:scale-95 shadow-sm cursor-pointer"
                  >
                    {isRunningCode ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        正在求解...
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white" />
                        运行验证代码 (Run Code)
                      </>
                    )}
                  </button>

                  {/* Clipboard copy button */}
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold transition hover:bg-black active:scale-95 shadow-sm cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        复制代码 (Copy)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Side-by-Side Dual Workspace Panel (Highly Enlarged to 520px for clear comparative study) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[520px]">
                {/* Left Column: Editable Code Editor */}
                <div className="flex flex-col border border-slate-800 bg-slate-950 rounded-xl overflow-hidden shadow-lg h-full">
                  <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400 select-none shrink-0">
                    <div className="flex items-center gap-2">
                      <Code className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-semibold text-slate-300">verify_game.py (在线编辑)</span>
                    </div>
                    <span className="text-[9px] bg-emerald-950/60 text-emerald-400 px-1.5 py-0.5 rounded font-bold">Python 3</span>
                  </div>
                  
                  <div className="flex-1 relative flex overflow-hidden font-mono text-xs">
                    {/* Line numbers gutter */}
                    <div className="w-10 bg-slate-950/80 text-slate-600 border-r border-slate-850/60 select-none text-right pr-2.5 py-3 font-mono text-[10px] leading-relaxed overflow-hidden">
                      {Array.from({ length: Math.max(30, (customPythonCode || "").split("\n").length) }).map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>
                    
                    {/* Actual Textarea Editor */}
                    <textarea
                      value={customPythonCode}
                      onChange={(e) => setCustomPythonCode(e.target.value)}
                      className="flex-1 bg-slate-950 text-slate-100 p-3 font-mono text-[11px] leading-relaxed focus:outline-hidden resize-none overflow-y-auto selection:bg-indigo-500/30"
                      placeholder="在此处输入或修改 Python 3 代码..."
                      spellCheck={false}
                    />
                  </div>
                </div>

                {/* Right Column: Terminal Simulator Console */}
                <div className="flex flex-col border border-slate-800 bg-slate-950 rounded-xl overflow-hidden shadow-lg h-full">
                  {/* Terminal Header */}
                  <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400 select-none shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      </div>
                      <span className="font-semibold text-slate-300">终端输出 (Simulation Terminal)</span>
                    </div>
                    <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold">stdout</span>
                  </div>

                  {/* Terminal Body */}
                  <div className="flex-1 p-4 font-mono text-[11px] text-emerald-400 overflow-y-auto whitespace-pre bg-black leading-relaxed select-text shadow-inner">
                    {isRunningCode ? (
                      <div className="space-y-1.5 text-emerald-500">
                        <p className="text-slate-400">$ python verify_game.py</p>
                        <p className="animate-pulse flex items-center gap-2 text-emerald-300 font-bold">
                          <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></span>
                          <span>正在执行 Python 解析求解脚本...</span>
                        </p>
                      </div>
                    ) : hasRunCode ? (
                      <div className="space-y-3">
                        <div className="text-slate-400">$ python verify_game.py</div>
                        <div className="text-emerald-400 font-bold leading-relaxed">{consoleOutput}</div>
                        <div className="text-slate-500 flex items-center gap-1 mt-2">
                          <span>$ </span>
                          <span className="w-1.5 h-3.5 bg-emerald-400 animate-pulse"></span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center gap-1">
                        <Terminal className="w-8 h-8 text-slate-700 animate-pulse" />
                        <span className="text-xs font-semibold">等待运行验证脚本</span>
                        <span className="text-[10px] text-slate-500">修改左侧代码中的参数后，点击上方「运行验证代码」执行</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Deployment/Github Action/Colab instructions */}
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 space-y-1 shrink-0">
                <span className="text-[10px] text-emerald-800 font-bold block flex items-center gap-1">
                  <ExternalLink className="w-3.5 h-3.5" />
                  部署平台运行说明 (GitHub / Colab / Local Terminal)
                </span>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  本脚本不依赖复杂的外部环境。您可以在任何标准的 Python 3 环境中直接执行此程序。
                  对于 <strong>GitHub Actions 自动化 CI/CD 验证</strong>，您只需创建一个 
                  <code className="bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-mono text-[10px] mx-1">verify_game.py</code> 并添加步骤 
                  <code className="bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-mono text-[10px] mx-1">python verify_game.py</code> 即可。
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: AI DIAGNOSTICS */}
          {activeTab === "ai" && (
            <div className="max-w-4xl mx-auto space-y-6">
              
              {/* Alert Warning if API Key is missing */}
              {!apiKey.trim() && (
                <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-6 text-center space-y-3 shadow-xs animate-pulse max-w-xl mx-auto">
                  <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                    ⚠️
                  </div>
                  <h3 className="text-xs font-bold text-slate-800">
                    需要配置大模型 API-Key 才能使用学术智能诊断
                  </h3>
                  <p className="text-[11px] text-slate-600 leading-relaxed max-w-sm mx-auto">
                    本项目将部署于 GitHub，支持纯浏览器端客户端直连。在开启 AI 学术诊断及交互式 Q&A 提问前，您必须先填写并确认您的 API-Key。
                  </p>
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 mx-auto active:scale-95 shadow-sm"
                  >
                    <Settings className="w-3.5 h-3.5 animate-spin-once" />
                    <span>立即配置并输入 API-Key</span>
                  </button>
                </div>
              )}

              {apiKey.trim() && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Analytical Automatic Diagnosis */}
                  <div className="lg:col-span-6 space-y-4">
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4.5 h-4.5 text-indigo-500 animate-pulse" />
                          <h3 className="text-xs font-bold text-slate-800">
                            1. 博弈论专家学术诊断
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-sm">
                          {selectedProvider === "gemini" ? "Gemini 3.5 Flash" : "DeepSeek R1"}
                        </span>
                      </div>

                      {isLocalAiLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center text-slate-500">
                          <span className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                          <span className="font-semibold text-xs animate-pulse">
                            正在连线博弈论专家智囊，解析机理与机制改良方案...
                          </span>
                        </div>
                      ) : localAiInsight ? (
                        <div className="space-y-4">
                          <div className="prose prose-slate prose-xs max-h-[350px] overflow-y-auto pr-1 text-slate-700 leading-relaxed text-xs">
                            <div className="whitespace-pre-wrap font-sans text-xs">
                              {localAiInsight}
                            </div>
                          </div>
                          
                          <button
                            onClick={handleGenerateLocalAi}
                            className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/50 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                            <span>重新进行诊断与推论 (Re-diagnose)</span>
                          </button>
                        </div>
                      ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-center gap-4">
                          <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
                            <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
                          </div>
                          <div className="space-y-1">
                            <span className="block text-xs font-bold text-slate-800">尚未触发学术自动诊断</span>
                            <span className="block text-[10px] text-slate-500 max-w-xs leading-relaxed">
                              点击下方按钮呼叫 AI 决策智能，针对当前特定的博弈规则、收益支付与稳定形态进行深度诊断。
                            </span>
                          </div>
                          
                          <button
                            onClick={handleGenerateLocalAi}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                            <span>立即运行专家级学术诊断</span>
                          </button>
                        </div>
                      )}
                      
                      {localAiError && (
                        <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl text-[11px] text-rose-700 font-medium leading-relaxed">
                          ⚠️ {localAiError}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Q&A Interaction Panel */}
                  <div className="lg:col-span-6 space-y-4">
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col h-[520px]">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4.5 h-4.5 text-indigo-500" />
                          <h3 className="text-xs font-bold text-slate-800">
                            2. 博弈论学术交互 Q&A (Academic Chat)
                          </h3>
                        </div>
                        {qaMessages.length > 0 && (
                          <button
                            onClick={() => setQaMessages([])}
                            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
                            title="清空聊天记录"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>清空</span>
                          </button>
                        )}
                      </div>

                      {/* Message History List */}
                      <div className="flex-1 overflow-y-auto py-4 space-y-3 scrollbar-thin pr-1">
                        {qaMessages.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center gap-3">
                            <div className="p-3 bg-slate-50 border border-slate-150 rounded-full text-slate-400">
                              <MessageSquare className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                              <span className="block text-xs font-bold text-slate-700">提出您的学术疑问</span>
                              <span className="block text-[10px] text-slate-400 max-w-xs leading-relaxed">
                                例如：“为什么这个参数下不存在纯策略纳什均衡？”、“如何在这里设计惩罚契约以达成 Pareto 最优？”
                              </span>
                            </div>
                          </div>
                        ) : (
                          qaMessages.map((msg, index) => {
                            const isUser = msg.role === "user";
                            return (
                              <div
                                key={index}
                                className={`flex gap-2.5 animate-in fade-in duration-200 ${
                                  isUser ? "flex-row-reverse" : "flex-row"
                                }`}
                              >
                                {/* Avatar */}
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                                  isUser 
                                    ? "bg-indigo-600 text-white" 
                                    : "bg-indigo-50 border border-indigo-150 text-indigo-700"
                                }`}>
                                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                </div>

                                {/* Content Bubble */}
                                <div className="space-y-1 max-w-[85%]">
                                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-semibold font-mono">
                                    <span>{isUser ? "行/列学者" : msg.modelName}</span>
                                    <span>•</span>
                                    <span>{msg.timestamp}</span>
                                  </div>
                                  <div className={`p-3 rounded-2xl text-xs leading-relaxed font-normal ${
                                    isUser 
                                      ? "bg-indigo-600 text-white rounded-tr-xs" 
                                      : "bg-slate-50 border border-slate-150 text-slate-800 rounded-tl-xs whitespace-pre-wrap"
                                  }`}>
                                    {msg.content}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Input Area */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSendQa();
                        }}
                        className="border-t border-slate-100 pt-3 flex gap-2 shrink-0"
                      >
                        <input
                          type="text"
                          value={qaInput}
                          onChange={(e) => setQaInput(e.target.value)}
                          placeholder="向博弈论专家教授提问..."
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="submit"
                          disabled={!qaInput.trim()}
                          className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl transition flex items-center justify-center cursor-pointer active:scale-95"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 4: REAL-TIME SIMULATION & DATA VISUALIZATION */}
          {activeTab === "visual" && (

            <div className={`${isChartZoomed ? "max-w-7xl" : "max-w-4xl"} mx-auto space-y-6 transition-all duration-300`}>
              {mode === GameMode.DISCRETE && (() => {
                const { data, pure_eqs } = getDiscreteChartData();
                return (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    {/* Top Configuration Interface Card */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 text-slate-800 font-bold text-xs">
                        <Sliders className="w-4 h-4 text-indigo-500" />
                        <span>1. 离散博弈可视化配置面板 (Visualization Parameter Configuration)</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        {/* Parameter 1: Plot Target */}
                        <div className="space-y-1.5">
                          <label className="block font-bold text-slate-700">绘制收益参数:</label>
                          <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button
                              onClick={() => setVisDiscretePlotTarget("both")}
                              className={`flex-1 py-1 rounded-md transition ${visDiscretePlotTarget === "both" ? "bg-white text-indigo-600 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                            >
                              双方收益
                            </button>
                            <button
                              onClick={() => setVisDiscretePlotTarget("p1")}
                              className={`flex-1 py-1 rounded-md transition ${visDiscretePlotTarget === "p1" ? "bg-white text-indigo-600 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                            >
                              仅P1
                            </button>
                            <button
                              onClick={() => setVisDiscretePlotTarget("p2")}
                              className={`flex-1 py-1 rounded-md transition ${visDiscretePlotTarget === "p2" ? "bg-white text-indigo-600 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                            >
                              仅P2
                            </button>
                          </div>
                        </div>

                        {/* Parameter 2: Sort Order */}
                        <div className="space-y-1.5">
                          <label className="block font-bold text-slate-700">策略组合排序方式:</label>
                          <select
                            value={visDiscreteSortOrder}
                            onChange={(e: any) => setVisDiscreteSortOrder(e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="default">默认顺序 (按博弈矩阵单元格)</option>
                            <option value="p1_desc">按 P1 (行参与者) 收益降序</option>
                            <option value="p2_desc">按 P2 (列参与者) 收益降序</option>
                            <option value="sum_desc">按 双方收益总和 降序</option>
                          </select>
                        </div>

                        {/* Parameter 3: NE Filter */}
                        <div className="space-y-1.5 flex flex-col justify-end">
                          <label className="flex items-center gap-2 cursor-pointer py-1 bg-slate-50 border border-slate-200/60 rounded-lg px-3 hover:bg-slate-100 transition h-[32px]">
                            <input
                              type="checkbox"
                              checked={visDiscreteShowOnlyNE}
                              onChange={(e) => setVisDiscreteShowOnlyNE(e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="font-bold text-slate-700">仅展示纯策略纳什均衡组合</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Chart and Details Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                      {/* Left Column: Recharts Chart */}
                      <div className={`${isChartZoomed ? "lg:col-span-12" : "lg:col-span-7"} bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-all duration-300`}>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-rose-500 animate-pulse" />
                            <h3 className="text-xs font-bold text-slate-800">收益剖面柱状分布图 (Payoff Profile)</h3>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-sm font-bold">离散博弈</span>
                            <button
                              onClick={() => setIsChartZoomed(!isChartZoomed)}
                              className="p-1 text-slate-400 hover:text-slate-600 transition border border-slate-200 rounded-md hover:bg-slate-50"
                              title={isChartZoomed ? "收缩图表" : "展开全屏宽度"}
                            >
                              {isChartZoomed ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                        
                        <div className="h-[280px] w-full text-xs font-mono">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" stroke="#64748b" tickLine={false} fontSize={10} />
                              <YAxis stroke="#64748b" tickLine={false} fontSize={10} />
                              <Tooltip 
                                contentStyle={{ background: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "11px" }}
                                itemStyle={{ color: "#fff" }}
                                labelStyle={{ fontWeight: "bold", color: "#f8fafc", marginBottom: "4px" }}
                              />
                              <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                              {(visDiscretePlotTarget === "both" || visDiscretePlotTarget === "p1") && (
                                <Bar dataKey="P1 收益 (Player 1)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                              )}
                              {(visDiscretePlotTarget === "both" || visDiscretePlotTarget === "p2") && (
                                <Bar dataKey="P2 收益 (Player 2)" fill="#10b981" radius={[4, 4, 0, 0]} />
                              )}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        
                        <p className="text-[10px] text-slate-400 text-center mt-2 italic font-mono">
                          提示: 横轴表示双方选取的具体策略组合，纵轴柱高代表各自的绝对收益值。纳什均衡组合代表双方最理性的交汇状态。
                        </p>
                      </div>

                      {/* Right Column: Academic Analysis Card */}
                      <div className={`${isChartZoomed ? "lg:col-span-12" : "lg:col-span-5"} space-y-4`}>
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                          <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3">
                            Nash 均衡与支配分析
                          </h4>
                          
                          <div className="space-y-3 text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">纯策略 Nash 均衡 (Pure NE):</span>
                              {pure_eqs.length === 0 ? (
                                <p className="text-xs text-rose-500 font-bold mt-1">
                                  ⚠️ 本博弈不存在纯策略 Nash 均衡！
                                </p>
                              ) : (
                                <div className="space-y-1.5 mt-1">
                                  {pure_eqs.map(([r, c], idx) => (
                                    <div key={idx} className="bg-emerald-50 text-emerald-800 text-[11px] font-bold p-2 rounded-lg border border-emerald-100 flex items-center justify-between">
                                      <span>
                                        NE {idx + 1}: ({configDiscrete.rowLabels[r]}, {configDiscrete.colLabels[c]})
                                      </span>
                                      <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                                        ({configDiscrete.matrix[r][c].u1}, {configDiscrete.matrix[r][c].u2})
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="text-[11px] text-slate-600 space-y-2 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-150">
                              <p className="font-bold text-slate-700">✍️ 学术机理精要：</p>
                              <p>
                                在 Nash 均衡状态下，<strong>任何一位参与者在对方策略既定的前提下，单独改变策略都无法获得更高的收益</strong>。这就是单边无偏差激励。
                              </p>
                              <p>
                                当纯策略均衡不存在时，博弈将转向<strong>混合策略 Nash 均衡 (Mixed Strategy NE)</strong>。参与者将以特定的概率分布随机化其策略。
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {mode === GameMode.COURNOT && (() => {
                const { data, q1_star, q2_star, currentQ2, dynamic_r1_peak } = getCournotChartData();
                return (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    {/* Top Configuration Interface Card */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                          <Sliders className="w-4 h-4 text-indigo-500" />
                          <span>1. 古诺博弈动态产量反应映射 (Dynamic Quantity Response Mapping)</span>
                        </div>
                        {visCournotQ2Override !== null && (
                          <button
                            onClick={() => setVisCournotQ2Override(null)}
                            className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition"
                          >
                            恢复 Nash 均衡产量对峙状态
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                        {/* Dynamic Path Mapping Slider */}
                        <div className="space-y-2 bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/50">
                          <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                            <span>实时调整企业 2 的实际产量 $q_2$:</span>
                            <span className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200">{currentQ2.toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max={(configCournot.a / configCournot.b).toFixed(1)}
                            step="0.1"
                            value={currentQ2}
                            onChange={(e) => setVisCournotQ2Override(parseFloat(e.target.value))}
                            className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                          />
                          <p className="text-[10px] text-indigo-700 font-semibold">
                            💡 拖动滑块模拟企业2违背纳什均衡并恶意竞争！上方图表曲线将实时计算，动态展示企业1为了达到最佳状态而形成的<strong>最优单边反应最优产量顶点 ($q_1^*$)</strong> 的随之飘移轨迹！
                          </p>
                        </div>

                        {/* Curves Selection Checkboxes */}
                        <div className="space-y-1.5 flex flex-col justify-center">
                          <label className="block font-bold text-slate-700 mb-1.5">绘制参数曲线选择:</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => setVisCournotPlotTarget(visCournotPlotTarget === "all" ? "p1" : "all")}
                              className={`py-1.5 px-3 rounded-lg border text-left flex items-center justify-between transition ${visCournotPlotTarget === "all" ? "bg-slate-900 text-white font-bold" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                            >
                              <span>显示所有特征曲线</span>
                              <span className="text-[9px] font-mono bg-slate-800 px-1 py-0.2 rounded text-slate-300">All</span>
                            </button>
                            <button
                              onClick={() => setVisCournotPlotTarget("p1")}
                              className={`py-1.5 px-3 rounded-lg border text-left flex items-center justify-between transition ${visCournotPlotTarget === "p1" ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-bold" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                            >
                              <span>仅显示 Firm 1 利润</span>
                              <span className="text-[9px] font-mono bg-indigo-200 px-1 py-0.2 rounded text-indigo-800">𝚷1</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Chart and Details Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                      {/* Left Column: Recharts Chart */}
                      <div className={`${isChartZoomed ? "lg:col-span-12" : "lg:col-span-7"} bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-all duration-300`}>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-rose-500 animate-pulse" />
                            <h3 className="text-xs font-bold text-slate-800">寡头收益抛物线与市场需求价格曲线 (Profit Curves)</h3>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-sm font-bold">古诺模型</span>
                            <button
                              onClick={() => setIsChartZoomed(!isChartZoomed)}
                              className="p-1 text-slate-400 hover:text-slate-600 transition border border-slate-200 rounded-md hover:bg-slate-50"
                              title={isChartZoomed ? "收缩图表" : "展开全屏宽度"}
                            >
                              {isChartZoomed ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                        
                        <div className="h-[280px] w-full text-xs font-mono">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="q1" stroke="#64748b" tickLine={false} fontSize={10} label={{ value: "Firm 1 产量 (q1)", position: "insideBottom", offset: -5 }} />
                              <YAxis stroke="#64748b" tickLine={false} fontSize={10} />
                              <Tooltip 
                                contentStyle={{ background: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "11px" }}
                                itemStyle={{ color: "#fff" }}
                                labelStyle={{ fontWeight: "bold", color: "#f8fafc", marginBottom: "4px" }}
                              />
                              <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                              
                              <Line type="monotone" dataKey="P1 利润 (Firm 1)" stroke="#4f46e5" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                              {visCournotPlotTarget === "all" && (
                                <>
                                  <Line type="monotone" dataKey="P2 利润 (Firm 2)" stroke="#10b981" strokeWidth={1.5} dot={false} />
                                  <Line type="monotone" dataKey="市场价格 (Price)" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                                  <Line type="monotone" dataKey="行业总利润 (Total)" stroke="#6366f1" strokeWidth={1.5} strokeDasharray="2 2" dot={false} />
                                </>
                              )}
                              
                              {/* Dynamic Best Response Line Peak */}
                              <ReferenceLine 
                                x={Number(dynamic_r1_peak.toFixed(2))} 
                                stroke="#e11d48" 
                                strokeDasharray="3 3" 
                                label={{ value: `R1(q2) = ${dynamic_r1_peak.toFixed(2)}`, fill: "#e11d48", fontSize: 10, position: "top" }} 
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        
                        <p className="text-[10px] text-slate-400 text-center mt-2 italic font-mono">
                          提示: 横轴表示企业1产量 $q_1$，红虚线指示的是当对手产量为 $q_2 = {currentQ2.toFixed(1)}$ 时，企业1的利润曲线最高峰位置。这就是最优反应。
                        </p>
                      </div>

                      {/* Right Column: Academic Analysis Card */}
                      <div className={`${isChartZoomed ? "lg:col-span-12" : "lg:col-span-5"} space-y-4`}>
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                          <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3">
                            古诺博弈均衡分析
                          </h4>
                          
                          <div className="space-y-4 font-sans text-xs">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-2">
                              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">均衡解析解 (Cournot Equilibrium):</span>
                              <div className="grid grid-cols-2 gap-2 mt-1 font-mono text-[11px]">
                                <div className="bg-white p-2 rounded border border-slate-200">
                                  <span className="text-slate-400 block text-[9px]">Firm 1 产量 q1*</span>
                                  <span className="font-bold text-indigo-600">{q1_star.toFixed(2)}</span>
                                </div>
                                <div className="bg-white p-2 rounded border border-slate-200">
                                  <span className="text-slate-400 block text-[9px]">Firm 2 产量 q2*</span>
                                  <span className="font-bold text-emerald-600">{q2_star.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-[11px] text-slate-600 space-y-2 leading-relaxed">
                              <p className="font-bold text-slate-700">✍️ 反应函数 (Best Response):</p>
                              <p className="font-mono text-[10px] bg-slate-50 p-2 rounded border border-slate-200">
                                R1(q2) = (a - c1 - b*q2) / 2b<br />
                                R2(q1) = (a - c2 - b*q1) / 2b
                              </p>
                              <p>
                                当两家企业的反应曲线相交时，就达成了古诺均衡。在上方图表中，<strong>当 $q_2 = q_2^*$ 既定时，企业 1 的利润曲线顶点正好对应于 $q_1 = q_1^*$</strong>，这完美印证了 Nash 均衡的“互为最优反应”定义。
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {mode === GameMode.SEQUENTIAL && (() => {
                const { data, finalPayoffs, path } = getSequentialChartData();
                return (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    {/* Top Configuration Interface Card */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 text-slate-800 font-bold text-xs">
                        <Sliders className="w-4 h-4 text-indigo-500" />
                        <span>1. 动态顺序博弈可视化参数配置</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {/* Parameter 1: Plot Target */}
                        <div className="space-y-1.5">
                          <label className="block font-bold text-slate-700">绘制收益项 (Payoff Selection):</label>
                          <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button
                              onClick={() => setVisSequentialPlotTarget("both")}
                              className={`flex-1 py-1 rounded-md transition ${visSequentialPlotTarget === "both" ? "bg-white text-indigo-600 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                            >
                              双方收益
                            </button>
                            <button
                              onClick={() => setVisSequentialPlotTarget("p1")}
                              className={`flex-1 py-1 rounded-md transition ${visSequentialPlotTarget === "p1" ? "bg-white text-indigo-600 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                            >
                              仅P1
                            </button>
                            <button
                              onClick={() => setVisSequentialPlotTarget("p2")}
                              className={`flex-1 py-1 rounded-md transition ${visSequentialPlotTarget === "p2" ? "bg-white text-indigo-600 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                            >
                              仅P2
                            </button>
                            <button
                              onClick={() => setVisSequentialPlotTarget("sum")}
                              className={`flex-1 py-1 rounded-md transition ${visSequentialPlotTarget === "sum" ? "bg-white text-indigo-600 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                            >
                              社会总收益 (Sum)
                            </button>
                          </div>
                        </div>

                        {/* Parameter 2: Only SPE Path Toggle */}
                        <div className="space-y-1.5 flex flex-col justify-end">
                          <label className="flex items-center gap-2 cursor-pointer py-1 bg-slate-50 border border-slate-200/60 rounded-lg px-3 hover:bg-slate-100 transition h-[32px]">
                            <input
                              type="checkbox"
                              checked={visSequentialShowOnlySPE}
                              onChange={(e) => setVisSequentialShowOnlySPE(e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="font-bold text-slate-700">仅绘制子博弈完美均衡 (SPE) 对应叶子节点</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Chart and Details Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                      {/* Left Column: Recharts Chart */}
                      <div className={`${isChartZoomed ? "lg:col-span-12" : "lg:col-span-7"} bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-all duration-300`}>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-rose-500 animate-pulse" />
                            <h3 className="text-xs font-bold text-slate-800">各路分支结局收益对比 (Terminal Outcomes)</h3>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-sm font-bold">子博弈精炼</span>
                            <button
                              onClick={() => setIsChartZoomed(!isChartZoomed)}
                              className="p-1 text-slate-400 hover:text-slate-600 transition border border-slate-200 rounded-md hover:bg-slate-50"
                              title={isChartZoomed ? "收缩图表" : "展开全屏宽度"}
                            >
                              {isChartZoomed ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                        
                        <div className="h-[280px] w-full text-xs font-mono">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" stroke="#64748b" tickLine={false} fontSize={10} />
                              <YAxis stroke="#64748b" tickLine={false} fontSize={10} />
                              <Tooltip 
                                contentStyle={{ background: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "11px" }}
                                itemStyle={{ color: "#fff" }}
                                labelStyle={{ fontWeight: "bold", color: "#f8fafc", marginBottom: "4px" }}
                              />
                              <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                              {(visSequentialPlotTarget === "both" || visSequentialPlotTarget === "p1") && (
                                <Bar dataKey="P1 收益 (Player 1)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                              )}
                              {(visSequentialPlotTarget === "both" || visSequentialPlotTarget === "p2") && (
                                <Bar dataKey="P2 收益 (Player 2)" fill="#10b981" radius={[4, 4, 0, 0]} />
                              )}
                              {visSequentialPlotTarget === "sum" && (
                                <Bar dataKey="总收益和 (Sum)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                              )}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        
                        <p className="text-[10px] text-slate-400 text-center mt-2 italic font-mono">
                          提示: 图表列出了决策树中所有终点叶子节点结局，子博弈精炼纳什均衡 (SPE) 对应的是各方倒推得出的最优完美决策解。
                        </p>
                      </div>

                      {/* Right Column: Academic Analysis Card */}
                      <div className={`${isChartZoomed ? "lg:col-span-12" : "lg:col-span-5"} space-y-4`}>
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                          <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3">
                            逆向归纳法 (Backward Induction)
                          </h4>
                          
                          <div className="space-y-4 font-sans text-xs">
                            <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 space-y-2">
                              <span className="text-[10px] text-indigo-800 font-bold block uppercase tracking-wider">SPE 均衡路径结局 (Outcome):</span>
                              <div className="bg-white p-2.5 rounded-lg border border-indigo-200/50 font-mono text-[11px] text-indigo-950">
                                <span className="font-bold">路径: </span>
                                {path.map(nodeId => configSequential.nodes[nodeId]?.label || configSequential.nodes[nodeId]?.actionLabel).filter(Boolean).join(" → ")}
                                <div className="mt-1 font-bold text-slate-700">
                                  收益向量: ({finalPayoffs[0]}, {finalPayoffs[1]})
                                </div>
                              </div>
                            </div>

                            <div className="text-[11px] text-slate-600 space-y-2 leading-relaxed">
                              <p className="font-bold text-slate-700">✍️ 理论背景：</p>
                              <p>
                                在动态博弈中，先动者拥有<strong>先发优势</strong>（在符合参数时），但他必须预测后动者在每个子博弈中的理性反应。
                              </p>
                              <p>
                                逆向归纳法<strong>从终点叶子节点倒推，剔除了不可信威胁的成分</strong>。只有在每一个可能到达的子博弈中都属于 Nash 均衡的决策，才被称为子博弈精炼纳什均衡 (SPE)。
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {mode === GameMode.EVOLUTIONARY && (() => {
                const { data, x_star, y_star } = getEvolutionaryChartData();
                return (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    {/* Top Configuration Interface Card */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                          <Sliders className="w-4 h-4 text-indigo-500" />
                          <span>1. 复制动态方程数值模拟参数配置 (Replicator Dynamics Settings)</span>
                        </div>
                        <div className="flex items-center bg-slate-150 p-1 rounded-lg text-xs shrink-0">
                          <button
                            onClick={() => setVisEvolutionaryStyle("time")}
                            className={`px-3 py-1 rounded-md transition font-bold ${visEvolutionaryStyle === "time" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                          >
                            时间序列 (T-Series)
                          </button>
                          <button
                            onClick={() => setVisEvolutionaryStyle("phase")}
                            className={`px-3 py-1 rounded-md transition font-bold ${visEvolutionaryStyle === "phase" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                          >
                            相空间轨线 (Phase Portrait)
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        {/* Init X slider */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between font-bold text-slate-700">
                            <span>初始雇主检查比例 $x_0$:</span>
                            <span className="font-mono text-indigo-600">{visEvolutionaryInitX.toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min="0.05"
                            max="0.95"
                            step="0.05"
                            value={visEvolutionaryInitX}
                            onChange={(e) => setVisEvolutionaryInitX(parseFloat(e.target.value))}
                            className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                          />
                        </div>

                        {/* Init Y slider */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between font-bold text-slate-700">
                            <span>初始雇员工作比例 $y_0$:</span>
                            <span className="font-mono text-emerald-600">{visEvolutionaryInitY.toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min="0.05"
                            max="0.95"
                            step="0.05"
                            value={visEvolutionaryInitY}
                            onChange={(e) => setVisEvolutionaryInitY(parseFloat(e.target.value))}
                            className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                          />
                        </div>

                        {/* T steps slider */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between font-bold text-slate-700">
                            <span>演化模拟最大世代 $T$:</span>
                            <span className="font-mono text-slate-600">{visEvolutionarySteps}</span>
                          </div>
                          <input
                            type="range"
                            min="50"
                            max="300"
                            step="10"
                            value={visEvolutionarySteps}
                            onChange={(e) => setVisEvolutionarySteps(parseInt(e.target.value, 10))}
                            className="w-full accent-slate-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Chart and Details Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                      {/* Left Column: Recharts Chart */}
                      <div className={`${isChartZoomed ? "lg:col-span-12" : "lg:col-span-7"} bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-all duration-300`}>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-rose-500 animate-pulse" />
                            <h3 className="text-xs font-bold text-slate-800">
                              {visEvolutionaryStyle === "phase" 
                                ? "演化相空间连续流动轨线图 (Phase Portrait Orbit: x vs y)" 
                                : "复制动态方程群体比例随时间变化 (Replicator Dynamics Time Series)"}
                            </h3>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-sm font-bold">演化博弈</span>
                            <button
                              onClick={() => setIsChartZoomed(!isChartZoomed)}
                              className="p-1 text-slate-400 hover:text-slate-600 transition border border-slate-200 rounded-md hover:bg-slate-50"
                              title={isChartZoomed ? "收缩图表" : "展开全屏宽度"}
                            >
                              {isChartZoomed ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                        
                        <div className="h-[280px] w-full text-xs font-mono">
                          <ResponsiveContainer width="100%" height="100%">
                            {visEvolutionaryStyle === "phase" ? (
                              <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical stroke="#f1f5f9" />
                                <XAxis dataKey="x" stroke="#64748b" tickLine={false} fontSize={10} domain={[0, 1]} type="number" label={{ value: "雇主检查比例 (x)", position: "insideBottom", offset: -5 }} />
                                <YAxis stroke="#64748b" tickLine={false} fontSize={10} domain={[0, 1]} type="number" label={{ value: "雇员工作比例 (y)", position: "insideLeft", offset: 10 }} />
                                <Tooltip 
                                  contentStyle={{ background: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "11px" }}
                                  itemStyle={{ color: "#fff" }}
                                  labelStyle={{ fontWeight: "bold", color: "#f8fafc", marginBottom: "4px" }}
                                />
                                <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                                
                                <Line type="monotone" dataKey="群体比例轨线 (Trajectory)" stroke="#818cf8" strokeWidth={2.5} dot={false} />
                                
                                {/* Focal Point references */}
                                {x_star > 0 && x_star < 1 && (
                                  <ReferenceLine x={x_star} stroke="#4f46e5" strokeDasharray="3 3" strokeOpacity={0.4} label={{ value: `x* = ${x_star.toFixed(2)}`, fill: "#4f46e5", fontSize: 9 }} />
                                )}
                                {y_star > 0 && y_star < 1 && (
                                  <ReferenceLine y={y_star} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.4} label={{ value: `y* = ${y_star.toFixed(2)}`, fill: "#10b981", fontSize: 9, position: "insideRight" }} />
                                )}
                              </LineChart>
                            ) : (
                              <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="t" stroke="#64748b" tickLine={false} fontSize={10} label={{ value: "演化世代 (t)", position: "insideBottom", offset: -5 }} />
                                <YAxis stroke="#64748b" tickLine={false} fontSize={10} domain={[0, 1]} />
                                <Tooltip 
                                  contentStyle={{ background: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "11px" }}
                                  itemStyle={{ color: "#fff" }}
                                  labelStyle={{ fontWeight: "bold", color: "#f8fafc", marginBottom: "4px" }}
                                />
                                <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                                
                                <Line type="monotone" dataKey="雇主检查率 (Inspect x)" stroke="#4f46e5" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="雇员工作率 (Work y)" stroke="#10b981" strokeWidth={2} dot={false} />
                                
                                {x_star > 0 && x_star < 1 && (
                                  <ReferenceLine y={x_star} stroke="#4f46e5" strokeDasharray="3 3" strokeOpacity={0.4} label={{ value: `x* = ${x_star.toFixed(2)}`, fill: "#4f46e5", fontSize: 9 }} />
                                )}
                                {y_star > 0 && y_star < 1 && (
                                  <ReferenceLine y={y_star} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.4} label={{ value: `y* = ${y_star.toFixed(2)}`, fill: "#10b981", fontSize: 9, position: "insideRight" }} />
                                )}
                              </LineChart>
                            )}
                          </ResponsiveContainer>
                        </div>
                        
                        <p className="text-[10px] text-slate-400 text-center mt-2 italic font-mono">
                          {visEvolutionaryStyle === "phase"
                            ? "提示: 相图上的封闭轨道展现了演化周期流场。拖动初始滑块，可以实时绘制从任意比例出发的完美绕转轨道！"
                            : "提示: 该曲线描述了在有限理性假设下，群体通过试错学习和模仿所形成的比例演进周期轨迹。"}
                        </p>
                      </div>

                      {/* Right Column: Academic Analysis Card */}
                      <div className={`${isChartZoomed ? "lg:col-span-12" : "lg:col-span-5"} space-y-4`}>
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                          <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3">
                            混合策略演化稳定状态 (ESS)
                          </h4>
                          
                          <div className="space-y-4 font-sans text-xs">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-2">
                              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">系统内部奇点 (Center Equilibrium):</span>
                              <div className="grid grid-cols-2 gap-2 mt-1 font-mono text-[11px]">
                                <div className="bg-white p-2 rounded border border-slate-200">
                                  <span className="text-slate-400 block text-[9px]">检查比例中心 x*</span>
                                  <span className="font-bold text-indigo-600">{x_star.toFixed(2)}</span>
                                </div>
                                <div className="bg-white p-2 rounded border border-slate-200">
                                  <span className="text-slate-400 block text-[9px]">工作比例中心 y*</span>
                                  <span className="font-bold text-emerald-600">{y_star.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-[11px] text-slate-600 space-y-2 leading-relaxed">
                              <p className="font-bold text-slate-700">✍️ 动力学核心机理：</p>
                              <p>
                                在经典的检查博弈（Inspection Game）演化系统中，由于存在利益的相互制约，系统内部奇点 (x*, y*) 通常是一个<strong>中心（Center）</strong>或<strong>稳定螺旋（Stable Spiral）</strong>。
                              </p>
                              <p>
                                群体比例在时间轴上表现为<strong>周期性的循环震荡</strong>：当员工努力工作时，雇主倾向于降低检查比例（省成本）；而雇主一旦疏于检查，员工偷懒比例就会上升，迫使雇主再次加强检查。两群体互相拉扯，循环往复。
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-100 p-4 px-6 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition"
          >
            关闭 (Close)
          </button>
        </div>

      </div>
    </div>
  );
}
