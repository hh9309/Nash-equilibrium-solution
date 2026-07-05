/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from "react";
import { X, Printer, Copy, Check, FileText, Sparkles, BookOpen } from "lucide-react";
import { GameMode, DiscreteGameConfig, CournotConfig, SequentialGameConfig, EvolutionaryConfig } from "../types";

interface AcademicReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: GameMode;
  configDiscrete: DiscreteGameConfig;
  configCournot: CournotConfig;
  configSequential: SequentialGameConfig;
  configEvolutionary: EvolutionaryConfig;
  aiInsight: string;
  onGenerateAi?: () => void;
  isAiLoading?: boolean;
  aiError?: string;
}

export default function AcademicReportModal({
  isOpen,
  onClose,
  mode,
  configDiscrete,
  configCournot,
  configSequential,
  configEvolutionary,
  aiInsight,
  onGenerateAi,
  isAiLoading,
  aiError,
}: AcademicReportModalProps) {
  const [copied, setCopied] = React.useState(false);
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  // Sync client-side diagnostic insight from localStorage as fallback/override
  const localStoredAiInsight = React.useMemo(() => {
    return localStorage.getItem(`LOCAL_AI_INSIGHT_${mode}`) || "";
  }, [mode, isOpen]);

  const effectiveAiInsight = aiInsight || localStoredAiInsight;

  if (!isOpen) return null;

  // 1. Generate standard LaTeX Matrix representing the current configuration
  const getLaTeXRepresentation = () => {
    if (mode === GameMode.DISCRETE) {
      let matrixLatex = "\\begin{pmatrix}\n";
      for (let r = 0; r < configDiscrete.rows; r++) {
        const rowStr = configDiscrete.matrix[r]
          .map((cell) => `(${cell.u1}, ${cell.u2})`)
          .join(" & ");
        matrixLatex += `  ${rowStr} ${r < configDiscrete.rows - 1 ? "\\\\" : ""}\n`;
      }
      matrixLatex += "\\end{pmatrix}";
      return matrixLatex;
    } else if (mode === GameMode.COURNOT) {
      return `P = ${configCournot.a} - ${configCournot.b} \\cdot (q_1 + q_2) \\\\\n` +
        `\\Pi_1 = (P - ${configCournot.c1}) \\cdot q_1 \\\\\n` +
        `\\Pi_2 = (P - ${configCournot.c2}) \\cdot q_2`;
    } else if (mode === GameMode.SEQUENTIAL) {
      return `\\text{Subgame Perfect Nash Equilibrium (SPE) solved via backwards induction.} \\\\\n` +
        `\\text{Active decision nodes: } ${Object.keys(configSequential.nodes).filter(id => configSequential.nodes[id].player !== 0).join(", ")}`;
    } else if (mode === GameMode.EVOLUTIONARY) {
      return `\\frac{dx}{dt} = x(1-x)[(1-y) \\cdot ${configEvolutionary.F} - ${configEvolutionary.h}] \\\\\n` +
        `\\frac{dy}{dt} = y(1-y)[x \\cdot ${configEvolutionary.F} - ${configEvolutionary.e}]`;
    }
    return "";
  };

  // 2. Format entire report text for copying as Markdown
  const getMarkdownReport = () => {
    const timestamp = new Date().toLocaleString("zh-CN");
    let content = `
# 《博弈论实验与计算分析报告》
**生成时间**: ${timestamp}
**实验模式**: ${mode === GameMode.DISCRETE ? "离散矩阵博弈" : mode === GameMode.COURNOT ? "古诺连续产量双寡头博弈" : mode === GameMode.SEQUENTIAL ? "多阶段动态博弈树" : "时间群体复制动态演化博弈"}
**学术认证**: 纳什均衡科学计算及人工智能策略论证工作台

---

## 一、 实验基础设置 (Inputs)
${mode === GameMode.DISCRETE ? `
- **矩阵维度**: ${configDiscrete.rows} 行 x ${configDiscrete.cols} 列
- **策略行标**: ${configDiscrete.rowLabels.join(", ")}
- **策略列标**: ${configDiscrete.colLabels.join(", ")}
- **LaTeX 支付矩阵**:
$$
${getLaTeXRepresentation()}
$$
` : ""}

${mode === GameMode.COURNOT ? `
- **逆需求价格拦截 a**: ${configCournot.a}
- **需求斜率价格敏感度 b**: ${configCournot.b}
- **Player 1 生产边际成本 c1**: ${configCournot.c1}
- **Player 2 生产边际成本 c2**: ${configCournot.c2}
- **最优反应联立方程组**:
$$
${getLaTeXRepresentation()}
$$
` : ""}

${mode === GameMode.SEQUENTIAL ? `
- **动态树根节点**: ${configSequential.rootId}
- **博弈树拓扑结构**: 包含 ${Object.keys(configSequential.nodes).length} 个节点
- **逆向归纳算法特征**:
$$
${getLaTeXRepresentation()}
$$
` : ""}

${mode === GameMode.EVOLUTIONARY ? `
- **违规罚金 F**: ${configEvolutionary.F}
- **员工劳动负效用/努力成本 e**: ${configEvolutionary.e}
- **雇主监管成本 h**: ${configEvolutionary.h}
- **复制动态常微分方程组**:
$$
${getLaTeXRepresentation()}
$$
` : ""}

---

## 二、 科学计算与数学推导 (Analytical Derivation)
${mode === GameMode.DISCRETE ? `
- 通过单元格最优反应扫描，纯策略纳什均衡 (NE) 计算结果为所有满足双方偏离惩罚最大值单元格。
- 经过算法遍历，寻找 [划底线] 与 [画方框] 交叉格重合点。
` : ""}

${mode === GameMode.COURNOT ? `
- 解一阶偏导数 ∂𝚷i/∂qi = 0，解得：
- 均衡总产量 Q* = q1* + q2*
- 市场出清价格 P* = a - bQ*
` : ""}

${mode === GameMode.SEQUENTIAL ? `
- 基于深度优先后序遍历，自下而上进行收益值回传 (Lifting) 与劣势分枝修剪 (Pruning)。
- SPE 路径呈现出理性的多阶段决策流。
` : ""}

${mode === GameMode.EVOLUTIONARY ? `
- 求解演化博弈内部焦点，得出系统奇点 (x*, y*) = (e/F, 1 - h/F)。
- 复制动态轨迹以此为核心形成闭合的周期轨道。
` : ""}

---

## 三、 AI 专家诊断视点 (Expert Reviews)
${aiInsight || "未触发 AI 诊断。请在主界面点击“生成 AI 决策诊断”获取结构化、学术级的博弈论现实场景映射与机制改良分析。"}

---
*报告生成自：纳什均衡求解与博弈演化 (AISTUDIO Academic Exporter)*
`;
    return content.trim();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getMarkdownReport());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML;
    const originalContent = document.body.innerHTML;

    if (printContent) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>博弈论计算与实验诊断分析报告</title>
              <style>
                body {
                  font-family: "Georgia", "Times New Roman", serif;
                  line-height: 1.6;
                  color: #111;
                  padding: 40px;
                  max-width: 800px;
                  margin: 0 auto;
                }
                h1, h2, h3 {
                  font-family: "Georgia", serif;
                  font-weight: normal;
                  color: #000;
                  border-bottom: 1px solid #ddd;
                  padding-bottom: 8px;
                  margin-top: 30px;
                }
                h1 {
                  text-align: center;
                  font-size: 26px;
                  border-bottom: 2px solid #000;
                  padding-bottom: 15px;
                }
                .meta {
                  text-align: center;
                  font-size: 13px;
                  color: #555;
                  margin-bottom: 40px;
                  font-style: italic;
                }
                pre {
                  background: #f4f4f4;
                  padding: 15px;
                  border-radius: 5px;
                  overflow-x: auto;
                  font-size: 11px;
                  font-family: "Consolas", monospace;
                }
                .formula {
                  text-align: center;
                  font-family: "Times New Roman", serif;
                  font-style: italic;
                  font-size: 16px;
                  background: #fafafa;
                  padding: 15px;
                  border: 1px solid #eee;
                  margin: 20px 0;
                  white-space: pre-wrap;
                }
                .ai-content {
                  white-space: pre-wrap;
                  font-size: 14px;
                }
                @media print {
                  body { padding: 0; }
                  button { display: none; }
                }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 300);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col h-[90vh] overflow-hidden border border-slate-100">
        
        {/* Header Toolbar */}
        <div className="bg-slate-50 border-b border-slate-100 p-4 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            <div>
              <h2 className="text-sm font-bold text-slate-800">博弈论学术级实验分析报告</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">支持 LaTeX 标准公式渲染与 A4 学术排版离线打印</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition text-xs font-semibold active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  已复制Markdown
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  复制 Markdown
                </>
              )}
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition text-xs font-semibold shadow-sm active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              打印/导出 PDF
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Paper Container (formal styling) */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 bg-slate-100/50 flex justify-center">
          <div 
            ref={printAreaRef}
            className="bg-white w-[210mm] min-h-[297mm] p-12 md:p-16 border border-slate-200 rounded-lg shadow-md font-serif text-slate-900 text-sm leading-relaxed relative"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {/* Watermark stamp */}
            <div className="absolute top-8 right-8 border-2 border-indigo-200 text-indigo-400 text-[10px] font-bold font-mono p-1 px-2.5 rounded-md tracking-wider rotate-12 select-none pointer-events-none uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Academic Certified
            </div>

            {/* Report Title */}
            <h1 className="text-2xl font-normal text-center text-slate-900 border-b-2 border-slate-900 pb-5 mb-1 tracking-tight">
              博弈论实验与计算分析报告
            </h1>
            
            <div className="text-center text-xs text-slate-500 italic mb-8 mt-2 flex justify-center gap-6 font-sans">
              <span><strong>实验类型</strong>: {mode === GameMode.DISCRETE ? "离散矩阵博弈" : mode === GameMode.COURNOT ? "古诺寡头垄断" : mode === GameMode.SEQUENTIAL ? "多阶段动态博弈" : "演化博弈复制动态"}</span>
              <span><strong>生成日期</strong>: {new Date().toLocaleDateString("zh-CN")}</span>
              <span><strong>工作台</strong>: AI Studio Workbench</span>
            </div>

            {/* Part 1: Settings */}
            <h2 className="text-lg font-normal border-b border-slate-200 pb-2 mt-8 mb-4 text-slate-950 font-serif">
              一、 实验输入设置 (Inputs & Parameters)
            </h2>

            {mode === GameMode.DISCRETE && (
              <div className="space-y-3 font-sans text-xs text-slate-700">
                <p>本组实验为离散静态博弈，行参与者与列参与者交互对抗。其基本参数如下：</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>行参与者策略集 (Player 1)</strong>: {configDiscrete.rowLabels.join("，")}</li>
                  <li><strong>列参与者策略集 (Player 2)</strong>: {configDiscrete.colLabels.join("，")}</li>
                  <li><strong>博弈维度</strong>: {configDiscrete.rows} × {configDiscrete.cols}</li>
                </ul>
                <p className="mt-3">其标准的 LaTeX 支付矩阵公式表征为：</p>
                <div className="formula">
                  {getLaTeXRepresentation()}
                </div>
              </div>
            )}

            {mode === GameMode.COURNOT && (
              <div className="space-y-3 font-sans text-xs text-slate-700">
                <p>本组实验建立的是经典的古诺（Cournot）产量双寡头垄断博弈模型，其中：</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>市场逆需求价格截距 a</strong>: {configCournot.a} (当市场总产量 Q=0 时的理论最高价)</li>
                  <li><strong>市场逆需求价格敏感度 b</strong>: {configCournot.b} (产量每增加一单位，价格下降的幅度)</li>
                  <li><strong>企业 1 边际生产成本 c₁</strong>: {configCournot.c1}</li>
                  <li><strong>企业 2 边际生产成本 c₂</strong>: {configCournot.c2}</li>
                </ul>
                <p className="mt-3">系统的总价格函数与企业个体偏微分反应函数联立矩阵为：</p>
                <div className="formula">
                  {getLaTeXRepresentation()}
                </div>
              </div>
            )}

            {mode === GameMode.SEQUENTIAL && (
              <div className="space-y-3 font-sans text-xs text-slate-700">
                <p>本组实验为多阶段（Sequential）不完全信息顺序博弈，采用树状拓扑图描述：</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>博弈树根节点</strong>: {configSequential.rootId} (首个行动的决策局中人)</li>
                  <li><strong>博弈树规模</strong>: 共有 {Object.keys(configSequential.nodes).length} 个决策与收益端点</li>
                </ul>
                <p className="mt-3">动态博弈决策模型逆向归纳算法（后序 DFS）表示为：</p>
                <div className="formula">
                  {getLaTeXRepresentation()}
                </div>
              </div>
            )}

            {mode === GameMode.EVOLUTIONARY && (
              <div className="space-y-3 font-sans text-xs text-slate-700">
                <p>本组实验采用演化博弈（Evolutionary Game）复制动态流场进行表征。核心参数包括：</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>违规罚金 F</strong>: {configEvolutionary.F}</li>
                  <li><strong>劳动 effort 成本效用 e</strong>: {configEvolutionary.e}</li>
                  <li><strong>雇主检查管理成本 h</strong>: {configEvolutionary.h}</li>
                </ul>
                <p className="mt-3">对应的复制动态微分方程组 (Replicator Dynamics ODE) 表述为：</p>
                <div className="formula">
                  {getLaTeXRepresentation()}
                </div>
              </div>
            )}

            {/* Part 2: Math Derivation */}
            <h2 className="text-lg font-normal border-b border-slate-200 pb-2 mt-10 mb-4 text-slate-950 font-serif">
              二、 科学计算与数学推导 (Analytical Results)
            </h2>
            <div className="font-sans text-xs text-slate-700 space-y-3">
              {mode === GameMode.DISCRETE && (
                <p>
                  计算引擎通过离散枚举算法对 ${configDiscrete.rows} \times ${configDiscrete.cols}$ 网格的所有单元格进行了最优反应（Best Response）扫描。
                  在纯策略层面，满足行与列同时处于最大偏向值（即交叉线相交）的所有解集合即为纯策略纳什均衡（Pure Strategy Nash Equilibrium）。
                </p>
              )}
              {mode === GameMode.COURNOT && (
                <p>
                  微分方程求一阶偏导数 ∂𝚷/∂q = 0。求解反应曲线交点得出解析解。
                  企业1均衡产量 q₁* = (a - 2c₁ + c₂) / 3b ；
                  企业2均衡产量 q₂* = (a - 2c₂ + c₁) / 3b。
                </p>
              )}
              {mode === GameMode.SEQUENTIAL && (
                <p>
                  算法基于 DFS 后序遍历实现逆向归纳法。对于深度处于末端的节点，上层行动者预测下层决策，
                  从而剔除不合理威胁，对劣势策略分支做出了剪枝。所保留下的高亮轨道即构成子博弈完美纳什均衡（SPE）。
                </p>
              )}
              {mode === GameMode.EVOLUTIONARY && (
                <p>
                  基于 SciPy 微分迭代思想，系统在平面网格上对 replicator ODE 的斜率进行了积分，并在此
                  绘制了 2D 相图向量场。系统奇点解代表在非确定性演化长河中最终呈现出的周期对称状态。
                </p>
              )}
            </div>

            {/* Part 3: AI Diagnosis */}
            <h2 className="text-lg font-normal border-b border-slate-200 pb-2 mt-10 mb-4 text-slate-950 font-serif flex items-center justify-between">
              <span>三、 专家级 AI 学术诊断 (Expert Reviews)</span>
              {!effectiveAiInsight && onGenerateAi && !isAiLoading && (
                <button
                  onClick={onGenerateAi}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold font-sans transition flex items-center gap-1 active:scale-95 shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  生成 AI 诊断
                </button>
              )}
              {effectiveAiInsight && onGenerateAi && !isAiLoading && (
                <button
                  onClick={onGenerateAi}
                  className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-[11px] font-medium font-sans transition flex items-center gap-1 active:scale-95"
                >
                  重新诊断
                </button>
              )}
            </h2>
            <div className="ai-content font-sans text-xs text-slate-800 leading-relaxed bg-slate-50 p-5 rounded-xl border border-slate-100 min-h-[100px] flex flex-col justify-center">
              {isAiLoading ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2 text-center text-slate-500">
                  <span className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                  <span className="font-semibold text-xs animate-pulse">正在评估博弈纳什均衡，并结合真实世界机制设计进行智能推导演算...</span>
                </div>
              ) : aiError ? (
                <div className="text-rose-600 bg-rose-50/50 p-3 rounded-lg border border-rose-100 text-xs">
                  <p className="font-semibold mb-1">AI 诊断引擎加载异常</p>
                  <p>{aiError}</p>
                  <p className="text-[10px] text-rose-500 italic mt-1">提示: 请在右上方 Settings &gt; Secrets 菜单中配置您的 GEMINI_API_KEY 后重试。</p>
                  {onGenerateAi && (
                    <button
                      onClick={onGenerateAi}
                      className="mt-2 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[10px] font-bold transition active:scale-95"
                    >
                      重新尝试生成
                    </button>
                  )}
                </div>
              ) : effectiveAiInsight ? (
                <p className="whitespace-pre-wrap">{effectiveAiInsight}</p>
              ) : (
                <div className="text-slate-400 italic text-center py-4 space-y-2">
                  <p>未生成 AI 专家学术诊断。</p>
                  {onGenerateAi ? (
                    <p className="text-[11px] text-slate-500">
                      点击右上角“生成 AI 诊断”按钮，系统将根据当前计算所得均衡，智能论证现实商业博弈场景的映射与机制设计改良。
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500">请配置诊断引擎。</p>
                  )}
                </div>
              )}
            </div>

            {/* Footer Signatures */}
            <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-sans">
              <span>实验签署人: {navigator.userAgent.includes("Chrome") ? "AI Studio System" : "Game Theorist"}</span>
              <span>学术等级报告 (AISTUDIO Exporter) 2026年 认证</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
