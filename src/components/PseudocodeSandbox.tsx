/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from "react";
import { Terminal, Code, HelpCircle } from "lucide-react";
import { GameMode, SolverStepLog } from "../types";

interface CodeLine {
  num: number;
  text: string;
  indent: number;
}

const PSEUDOCODES: Record<GameMode, CodeLine[]> = {
  [GameMode.DISCRETE]: [
    { num: 1, text: "def solve_discrete_game(matrix_A, matrix_B):", indent: 0 },
    { num: 2, text: "    # 1. 扫描行参与者 Player 1 的最优反应 (Best Responses)", indent: 0 },
    { num: 3, text: "    p1_best_responses = {}", indent: 0 },
    { num: 4, text: "    for col in range(cols):", indent: 0 },
    { num: 5, text: "        max_val = max(matrix_A[row][col] for row in range(rows))", indent: 0 },
    { num: 6, text: "        p1_best_responses[col] = [r for r in rows if matrix_A[r][col] == max_val]", indent: 0 },
    { num: 7, text: "        # 对最优策略单元格 [划底线] 标记", indent: 0 },
    { num: 8, text: "    ", indent: 0 },
    { num: 9, text: "    # 2. 扫描列参与者 Player 2 的最优反应", indent: 0 },
    { num: 10, text: "    p2_best_responses = {}", indent: 0 },
    { num: 11, text: "    for row in range(rows):", indent: 0 },
    { num: 12, text: "        max_val = max(matrix_B[row][col] for col in range(cols))", indent: 0 },
    { num: 13, text: "        p2_best_responses[row] = [c for c in cols if matrix_B[row][c] == max_val]", indent: 0 },
    { num: 14, text: "        # 对最优策略单元格 [画方框] 标记", indent: 0 },
    { num: 15, text: "    ", indent: 0 },
    { num: 16, text: "    # 3. 寻找交点：底线与方框重合处即为纯策略纳什均衡 (Pure NE)", indent: 0 },
    { num: 17, text: "    pure_equilibria = []", indent: 0 },
    { num: 18, text: "    for r in rows:", indent: 0 },
    { num: 19, text: "        for c in cols:", indent: 0 },
    { num: 20, text: "            if r in p1_best_responses[c] and c in p2_best_responses[r]:", indent: 0 },
    { num: 21, text: "                pure_equilibria.append((r, c))  # 爆发金黄色粒子特效！", indent: 0 },
  ],
  [GameMode.COURNOT]: [
    { num: 21, text: "def solve_cournot_duopoly(a, b, c1, c2):", indent: 0 },
    { num: 22, text: "    # 1. 建立利润方程：𝚷 = (P(Q) - c) * q", indent: 0 },
    { num: 23, text: "    P = a - b * (q1 + q2)", indent: 0 },
    { num: 24, text: "    profit1 = (P - c1) * q1", indent: 0 },
    { num: 25, text: "    profit2 = (P - c2) * q2", indent: 0 },
    { num: 26, text: "    # 2. 求一阶偏导数条件 (FOC = First Order Conditions)", indent: 0 },
    { num: 27, text: "    d_profit1_dq1 = diff(profit1, q1)  # a - 2b*q1 - b*q2 - c1 = 0", indent: 0 },
    { num: 28, text: "    d_profit2_dq2 = diff(profit2, q2)  # a - b*q1 - 2b*q2 - c2 = 0", indent: 0 },
    { num: 29, text: "    # 3. 求解最优反应函数曲线 (BR / Best Response Functions)", indent: 0 },
    { num: 30, text: "    br1_curve = solve(d_profit1_dq1, q1)  # q1*(q2) = (a - c1 - b*q2)/(2b)", indent: 0 },
    { num: 31, text: "    br2_curve = solve(d_profit2_dq2, q2)  # q2*(q1) = (a - c2 - b*q1)/(2b)", indent: 0 },
    { num: 32, text: "    # 4. 联立反应曲线方程组求出交点", indent: 0 },
    { num: 33, text: "    equilibrium = solve([d_profit1_dq1, d_profit2_dq2], (q1, q2))", indent: 0 },
    { num: 34, text: "    q1_star = (a - 2*c1 + c2) / (3*b)", indent: 0 },
    { num: 35, text: "    q2_star = (a - 2*c2 + c1) / (3*b)", indent: 0 },
  ],
  [GameMode.SEQUENTIAL]: [
    { num: 41, text: "def backwards_induction_solver(node):", indent: 0 },
    { num: 42, text: "    # 1. 深度优先后序遍历：如果到达叶子节点，返回原初博弈收益", indent: 0 },
    { num: 43, text: "    if node.is_terminal():", indent: 0 },
    { num: 44, text: "        return node.payoffs", indent: 0 },
    { num: 45, text: "    # 2. 递归遍历子节点，归纳出所有子博弈的最优结果", indent: 0 },
    { num: 46, text: "    child_payoffs = [backwards_induction_solver(child) for child in node.children]", indent: 0 },
    { num: 47, text: "    # 3. 当前决策局中人做出最理性选择，并将最大化利益向上回传 (Payoff Lifting)", indent: 0 },
    { num: 48, text: "    p = node.active_player", indent: 0 },
    { num: 49, text: "    best_child_idx = argmax(payoff[p] for payoff in child_payoffs)", indent: 0 },
    { num: 50, text: "    # 劣势策略分支渐隐为虚线剪枝 (Pruning)", indent: 0 },
    { num: 51, text: "    node.pruned_branches = [idx for idx in range(len(children)) if idx != best_child_idx]", indent: 0 },
    { num: 52, text: "    return child_payoffs[best_child_idx]", indent: 0 },
  ],
  [GameMode.EVOLUTIONARY]: [
    { num: 61, text: "def replicator_dynamics_ode(t, p_vector, params):", indent: 0 },
    { num: 62, text: "    # 1. 获取雇主检查比例 x 和雇员工作比例 y", indent: 0 },
    { num: 63, text: "    x, y = p_vector[0], p_vector[1]", indent: 0 },
    { num: 64, text: "    # 2. 计算雇主/雇员策略期望收益和平均期望收益", indent: 0 },
    { num: 65, text: "    e_inspect = y * (V - W - h) + (1-y) * (-W + F - h - L)", indent: 0 },
    { num: 66, text: "    e_no_inspect = y * (V - W) + (1-y) * (-W - L)", indent: 0 },
    { num: 67, text: "    # 3. 计算收益差值：ΔE_Employer = (1-y)F - h", indent: 0 },
    { num: 68, text: "    delta_employer = (1 - y) * F - h", indent: 0 },
    { num: 69, text: "    delta_employee = x * F - e", indent: 0 },
    { num: 70, text: "    # 4. 建立复制动态微分方程 (dx/dt, dy/dt)", indent: 0 },
    { num: 71, text: "    dxdt = x * (1 - x) * delta_employer", indent: 0 },
    { num: 72, text: "    dydt = y * (1 - y) * delta_employee", indent: 0 },
    { num: 73, text: "    return [dxdt, dydt]", indent: 0 },
    { num: 74, text: "    ", indent: 0 },
    { num: 75, text: "    # 5. 平衡奇点解：x* = e/F, y* = 1 - h/F (ESS)", indent: 0 },
  ],
};

interface PseudocodeSandboxProps {
  mode: GameMode;
  highlightedLine: number;
  logs: SolverStepLog[];
}

export default function PseudocodeSandbox({ mode, highlightedLine, logs }: PseudocodeSandboxProps) {
  const logEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll logs container to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const lines = PSEUDOCODES[mode] || [];

  return (
    <div id="pseudocode-sandbox" className="bg-slate-900 rounded-2xl p-4 shadow-lg text-white flex flex-col h-full overflow-hidden">
      {/* Header section */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
          <Code className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">算法控制台 & 沙盒联动</span>
        </div>
        <div className="flex gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
        </div>
      </div>

      {/* Code Display Area */}
      <div className="flex-1 min-h-[140px] overflow-y-auto bg-slate-950 rounded-xl p-3 font-mono text-[11px] leading-relaxed select-text relative border border-slate-800/60">
        <div className="space-y-1">
          {lines.map((line) => {
            const isHighlighted = line.num === highlightedLine;
            return (
              <div
                key={line.num}
                className={`flex rounded-sm px-1.5 py-0.5 transition-colors duration-200 ${
                  isHighlighted ? "bg-indigo-600/35 border-l-2 border-indigo-500 text-indigo-200 font-semibold" : "text-slate-400"
                }`}
              >
                <span className="w-6 text-right select-none text-slate-600 pr-2 font-mono">{line.num}</span>
                <span className="flex-1 whitespace-pre" style={{ paddingLeft: `${line.indent * 8}px` }}>
                  {line.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Running terminal logs output */}
      <div className="h-[180px] mt-4 shrink-0 bg-slate-950 rounded-xl border border-slate-800/60 p-3 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-800/80 shrink-0">
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            数理推导运行日志 (Execution Logs)
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-[11px] leading-relaxed">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center gap-1">
              <HelpCircle className="w-6 h-6 text-slate-700" />
              <span>暂无步骤日志</span>
              <span>请在左侧操作台运行单步/播放</span>
            </div>
          ) : (
            logs.map((log) => {
              let logColor = "text-slate-400";
              if (log.type === "success") logColor = "text-emerald-400 font-medium";
              if (log.type === "warn") logColor = "text-amber-400";

              return (
                <div key={log.id} className={`flex gap-1.5 ${logColor}`}>
                  <span className="text-[9px] text-slate-600 select-none shrink-0">{log.timestamp}</span>
                  <p className="flex-1 whitespace-pre-wrap">{log.message}</p>
                </div>
              );
            })
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}
