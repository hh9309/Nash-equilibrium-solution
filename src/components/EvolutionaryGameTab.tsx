/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, AlertCircle, RefreshCw, MousePointerClick, ChevronRight, Info } from "lucide-react";
import { EvolutionaryConfig } from "../types";

interface EvolutionaryGameTabProps {
  config: EvolutionaryConfig;
  setConfig: React.Dispatch<React.SetStateAction<EvolutionaryConfig>>;
  onLog: (msg: string, type?: "info" | "success" | "warn") => void;
  onSelectCodeLine: (lineNum: number) => void;
  solverStep: number;
  setSolverStep: React.Dispatch<React.SetStateAction<number>>;
  setTotalSteps: (steps: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
}

export default function EvolutionaryGameTab({
  config,
  setConfig,
  onLog,
  onSelectCodeLine,
  solverStep,
  setSolverStep,
  setTotalSteps,
  isPlaying,
  setIsPlaying,
}: EvolutionaryGameTabProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [equilibriumPoint, setEquilibriumPoint] = useState({ x: 0, y: 0 });
  const [hoveredEq, setHoveredEq] = useState<any | null>(null);
  const [vectorFieldStyle, setVectorFieldStyle] = useState<"arrows" | "streamlines" | "hybrid">("hybrid");
  const [showVelocityColor, setShowVelocityColor] = useState(true);
  const [vectorDensity, setVectorDensity] = useState(12);

  // Compute key equilibrium values for the model
  const { e, h, F } = config;
  const xStar = e / F;
  const yStar = 1 - h / F;

  // List of the 5 Nash Equilibrium points in the replicator dynamics of the "Inspect-Work" game
  const eqPoints = [
    {
      id: "eq00",
      name: "局部非合作博弈低效状态",
      math: "E1 (0, 0)",
      x: 0,
      y: 0,
      stability: "非演化稳定点 (不稳定鞍点)",
      condition: "当 F > h 时为极不稳定的鞍点。一旦雇主为减少损失有微弱动机启动检查，就会产生向右下方 (1,0) 转移的演化倾向。",
      desc: "雇主零检查、雇员全偷懒。由于不检查使得雇员偷懒期望收益更高，但雇主抓到偷懒的罚款收益 F 大于成本 h，会迫使雇主变放任为严格监管。"
    },
    {
      id: "eq10",
      name: "单边强力监管惩罚状态",
      math: "E2 (1, 0)",
      x: 1,
      y: 0,
      stability: "非演化稳定点 (不稳定鞍点)",
      condition: "当 F > e 时为不稳定的鞍点。雇员承受极高的惩罚威胁 F，其选择工作的期望收益大于偷懒，被迫开始自省奋斗，向 (1,1) 转化。",
      desc: "雇主实施百分之百监管，而雇员暂处于全偷懒状态。此时偷懒被逮住的损失惊人，雇员作为理性人会以极快速度转入工作状态。"
    },
    {
      id: "eq11",
      name: "社会监管高负荷帕累托次优状态",
      math: "E3 (1, 1)",
      x: 1,
      y: 1,
      stability: "非演化稳定点 (不稳定鞍点)",
      condition: "当 h > 0 时为不稳定鞍点。由于雇员百分百在自觉努力工作，雇主检查不仅无法增加监督效率，反而虚耗成本 h，具有单边减少检查力度的倾向，向 (0,1) 退化。",
      desc: "雇主拼命检查而雇员全然自觉工作。此时的高强度检查是虚耗社会资源的帕累托低效，雇主为了省去检查成本 h 会逐步减少监督频率。"
    },
    {
      id: "eq01",
      name: "无监管自觉诚信理想状态",
      math: "E4 (0, 1)",
      x: 0,
      y: 1,
      stability: "非演化稳定点 (不稳定鞍点)",
      condition: "当工作成本 e > 0 时为不稳定鞍点。在雇主零检查下，雇员若付出努力代价 e 则得不偿失，其偷懒收益最高，使契约瞬间崩塌，向 (0,0) 崩解。",
      desc: "零监督下的全员自觉工作。这是一种脆弱的‘大同理想’，因为一旦缺乏威慑，个体的机会主义就会驱使雇员投机偷懒，导致诚信社会在一夜之间瓦解。"
    },
    {
      id: "eq_star",
      name: "混合策略演化均衡中心",
      math: `E* (${xStar.toFixed(3)}, ${yStar.toFixed(3)})`,
      x: xStar,
      y: yStar,
      stability: "中性稳定 (Center 稳定中心点)",
      condition: "系统雅可比矩阵特征值为共轭纯虚数。不具有渐近稳定性，系统状态将以该混合点为同心圆心在四周形成闭合圆轨道，呈现周而复始的波动循环。",
      desc: "唯一的内点平衡。在此比例下，双方进入纳什均衡均势，各策略期望收益无差异。任何初态微扰都会让博弈群体围绕其展开持久的、波澜起伏的周期博弈。"
    }
  ];

  // Trajectory points state for custom click injection
  const [trajectory, setTrajectory] = useState<{ x: number; y: number }[]>([]);
  const [isTracing, setIsTracing] = useState(false);
  const traceRef = useRef<{ x: number; y: number }[]>([]);
  const currentPosRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  // Calculate Equilibrium
  useEffect(() => {
    const { e, h, F } = config;
    // x* = e / F
    const xStar = e / F;
    // y* = 1 - h / F
    const yStar = 1 - h / F;

    setEquilibriumPoint({ x: xStar, y: yStar });
  }, [config]);

  // Solver steps for Evolutionary
  const totalSteps = 5;
  useEffect(() => {
    setTotalSteps(totalSteps);
  }, [setTotalSteps]);

  useEffect(() => {
    const { e, h, F } = config;
    const xStar = e / F;
    const yStar = 1 - h / F;

    if (solverStep === 0) {
      onSelectCodeLine(61);
    } else if (solverStep === 1) {
      onSelectCodeLine(63);
      onLog(`[第 1 步] 计算雇主检查策略与不检查的期望收益差值：\nΔE_Employer = E(I) - E(NI) = (1 - y) × F - h = (1 - y) × ${F} - ${h}`, "info");
    } else if (solverStep === 2) {
      onSelectCodeLine(67);
      onLog(`[第 2 步] 计算雇员努力工作与偷懒的期望收益差值：\nΔE_Employee = E(W) - E(S) = x × F - e = x × ${F} - ${e}`, "info");
    } else if (solverStep === 3) {
      onSelectCodeLine(71);
      onLog(`[第 3 步] 建立复制动态常微分方程组 (Replicator Dynamics ODE)：\ndx/dt = x(1-x)[(1-y)×${F} - ${h}]\ndy/dt = y(1-y)[x×${F} - ${e}]`, "info");
    } else if (solverStep === 4) {
      onSelectCodeLine(75);
      onLog(`[第 4 步] 求解演化博弈奇点/稳定状态 (ESS)：\n系统除四角外存在内部平衡点 (x*, y*) = (e/F, 1 - h/F) = (${xStar.toFixed(3)}, ${yStar.toFixed(3)})。系统以此为核心呈闭合轨道旋转！`, "success");
    }
  }, [solverStep, config]);

  // Autoplay ODE timer
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

  // Render Vector Field & Trajectory
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    // Clear Canvas
    ctx.clearRect(0, 0, width, height);

    // Draw coordinate lines
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw Axes labels
    ctx.fillStyle = "#475569";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText("雇主检查比例 x", width - padding - 65, height - padding + 25);
    ctx.save();
    ctx.translate(padding - 25, padding + 70);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("雇员工作比例 y", 0, 0);
    ctx.restore();

    // Convert values in [0, 1] to pixels
    const toPxX = (val: number) => padding + val * (width - 2 * padding);
    const toPxY = (val: number) => height - padding - val * (height - 2 * padding);

    const { e, h, F } = config;
    const xStar = e / F;
    const yStar = 1 - h / F;

    // Replicator dynamics derivatives helper
    const getDerivatives = (cx: number, cy: number) => {
      const dx = cx * (1 - cx) * ((1 - cy) * F - h);
      const dy = cy * (1 - cy) * (cx * F - e);
      return { dx, dy };
    };

    // Velocity color mapping
    const getSpeedColor = (speed: number) => {
      if (!showVelocityColor) return "rgba(148, 163, 184, 0.45)";
      
      const maxEstimated = Math.max(1, F * 0.15);
      const ratio = Math.min(1, speed / maxEstimated);
      
      if (ratio < 0.3) {
        // Slow: Cool teal/blue
        const alpha = 0.35 + ratio * 0.5;
        return `rgba(14, 165, 233, ${alpha})`; // sky-500
      } else if (ratio < 0.7) {
        // Medium: Indigo
        const alpha = 0.5 + (ratio - 0.3) * 0.5;
        return `rgba(99, 102, 241, ${alpha})`; // indigo-500
      } else {
        // High: Vibrant violet/rose
        const alpha = 0.7 + (ratio - 0.7) * 0.8;
        return `rgba(168, 85, 247, ${alpha})`; // violet-500
      }
    };

    // 1. Draw Streamline Layer if selected (streamlines or hybrid)
    if (vectorFieldStyle === "streamlines" || vectorFieldStyle === "hybrid") {
      ctx.lineWidth = 1.0;
      
      // Concentric orbital streamlines around the equilibrium center (x*, y*)
      const orbitRadii = [0.08, 0.16, 0.24, 0.32, 0.40];
      
      orbitRadii.forEach((r) => {
        const sx = xStar;
        const sy = yStar + r;
        
        if (sy > 0.02 && sy < 0.98) {
          let cx = sx;
          let cy = sy;
          const pts: { x: number; y: number }[] = [];
          
          // Use Heun's RK2 to draw closed loops accurately without artificial spiraling out!
          const steps = 180;
          const dt = 0.04;
          
          for (let s = 0; s < steps; s++) {
            pts.push({ x: cx, y: cy });
            
            const k1 = getDerivatives(cx, cy);
            
            const tx = Math.max(0.001, Math.min(0.999, cx + k1.dx * dt));
            const ty = Math.max(0.001, Math.min(0.999, cy + k1.dy * dt));
            
            const k2 = getDerivatives(tx, ty);
            
            const dx = 0.5 * (k1.dx + k2.dx);
            const dy = 0.5 * (k1.dy + k2.dy);
            
            cx = cx + dx * dt;
            cy = cy + dy * dt;
            
            if (cx < 0.001 || cx > 0.999 || cy < 0.001 || cy > 0.999) break;
            
            if (s > 15) {
              const distToStart = Math.sqrt((cx - sx) ** 2 + (cy - sy) ** 2);
              if (distToStart < 0.015) {
                pts.push({ x: sx, y: sy });
                break;
              }
            }
          }
          
          if (pts.length > 2) {
            ctx.beginPath();
            ctx.moveTo(toPxX(pts[0].x), toPxY(pts[0].y));
            for (let k = 1; k < pts.length; k++) {
              ctx.lineTo(toPxX(pts[k].x), toPxY(pts[k].y));
            }
            
            ctx.strokeStyle = showVelocityColor 
              ? "rgba(99, 102, 241, 0.18)" 
              : "rgba(148, 163, 184, 0.15)";
            ctx.stroke();
            
            // Draw directional chevrons along the closed streamline
            const arrowIndices = [Math.floor(pts.length * 0.25), Math.floor(pts.length * 0.75)];
            arrowIndices.forEach((idx) => {
              if (idx >= pts.length - 1) return;
              const pCurr = pts[idx];
              const pNext = pts[idx + 1];
              const dx = pNext.x - pCurr.x;
              const dy = pNext.y - pCurr.y;
              const len = Math.sqrt(dx * dx + dy * dy);
              if (len > 0.0001) {
                const px = toPxX(pCurr.x);
                const py = toPxY(pCurr.y);
                const angle = Math.atan2(-dy, dx);
                
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(angle);
                
                ctx.fillStyle = showVelocityColor ? "rgba(79, 70, 229, 0.45)" : "rgba(100, 116, 139, 0.35)";
                ctx.beginPath();
                ctx.moveTo(-5, -3);
                ctx.lineTo(0, 0);
                ctx.lineTo(-5, 3);
                ctx.lineTo(-3, 0);
                ctx.closePath();
                ctx.fill();
                
                ctx.restore();
              }
            });
          }
        }
      });
      
      // Boundary flow streamlines near saddle points (corners)
      const boundarySeeds = [
        { x: 0.05, y: 0.15 },
        { x: 0.15, y: 0.05 },
        { x: 0.95, y: 0.15 },
        { x: 0.85, y: 0.05 },
        { x: 0.95, y: 0.85 },
        { x: 0.85, y: 0.95 },
        { x: 0.05, y: 0.85 },
        { x: 0.15, y: 0.95 },
      ];
      
      boundarySeeds.forEach((seed) => {
        let cx = seed.x;
        let cy = seed.y;
        const pts: { x: number; y: number }[] = [];
        
        const steps = 45;
        const dt = 0.05;
        
        for (let s = 0; s < steps; s++) {
          pts.push({ x: cx, y: cy });
          
          const k1 = getDerivatives(cx, cy);
          
          const tx = Math.max(0.001, Math.min(0.999, cx + k1.dx * dt));
          const ty = Math.max(0.001, Math.min(0.999, cy + k1.dy * dt));
          
          const k2 = getDerivatives(tx, ty);
          
          const dx = 0.5 * (k1.dx + k2.dx);
          const dy = 0.5 * (k1.dy + k2.dy);
          
          cx = cx + dx * dt;
          cy = cy + dy * dt;
          
          if (cx < 0.001 || cx > 0.999 || cy < 0.001 || cy > 0.999) break;
        }
        
        if (pts.length > 2) {
          ctx.beginPath();
          ctx.moveTo(toPxX(pts[0].x), toPxY(pts[0].y));
          for (let k = 1; k < pts.length; k++) {
            ctx.lineTo(toPxX(pts[k].x), toPxY(pts[k].y));
          }
          ctx.strokeStyle = showVelocityColor 
            ? "rgba(99, 102, 241, 0.12)" 
            : "rgba(148, 163, 184, 0.08)";
          ctx.stroke();
        }
      });
    }

    // 2. Draw Vector Field Grid if selected (arrows or hybrid)
    if (vectorFieldStyle === "arrows" || vectorFieldStyle === "hybrid") {
      ctx.lineWidth = 0.9;
      const gridSize = vectorDensity;
      
      for (let i = 1; i <= gridSize; i++) {
        for (let j = 1; j <= gridSize; j++) {
          const x = i / (gridSize + 1);
          const y = j / (gridSize + 1);
          
          const { dx, dy } = getDerivatives(x, y);
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len === 0) continue;
          
          const maxArrowLen = 14;
          const scaleX = (dx / len) * maxArrowLen;
          const scaleY = (dy / len) * maxArrowLen;
          
          const px = toPxX(x);
          const py = toPxY(y);
          
          const arrowColor = getSpeedColor(len);
          ctx.strokeStyle = arrowColor;
          
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + scaleX, py - scaleY);
          ctx.stroke();
          
          const angle = Math.atan2(scaleY, scaleX);
          ctx.fillStyle = arrowColor;
          ctx.beginPath();
          ctx.arc(px + scaleX, py - scaleY, 1.8, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    }

    // 3. Draw all 5 Nash Equilibrium Points with Hover Highlights
    eqPoints.forEach((pt) => {
      const px = toPxX(pt.x);
      const py = toPxY(pt.y);
      const isHovered = hoveredEq && hoveredEq.id === pt.id;

      if (isHovered) {
        ctx.fillStyle = pt.id === "eq_star" ? "rgba(245, 158, 11, 0.15)" : "rgba(99, 102, 241, 0.15)";
        ctx.beginPath();
        ctx.arc(px, py, 24, 0, 2 * Math.PI);
        ctx.fill();

        ctx.strokeStyle = pt.id === "eq_star" ? "rgba(245, 158, 11, 0.45)" : "rgba(99, 102, 241, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.strokeStyle = pt.id === "eq_star" ? "#d97706" : "#4f46e5";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, 2 * Math.PI);
        ctx.stroke();
      }

      if (pt.id === "eq_star" || isHovered) {
        ctx.strokeStyle = pt.id === "eq_star" ? "rgba(245, 158, 11, 0.35)" : "rgba(99, 102, 241, 0.35)";
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, height - padding);
        ctx.moveTo(px, py);
        ctx.lineTo(padding, py);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = pt.id === "eq_star" ? "#f59e0b" : "#475569";
      if (isHovered) {
        ctx.fillStyle = pt.id === "eq_star" ? "#d97706" : "#6366f1";
      }
      ctx.beginPath();
      ctx.arc(px, py, pt.id === "eq_star" ? 6 : 4.5, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // 4. Draw Trajectory Trail
    if (trajectory.length > 1) {
      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(toPxX(trajectory[0].x), toPxY(trajectory[0].y));
      for (let k = 1; k < trajectory.length; k++) {
        ctx.lineTo(toPxX(trajectory[k].x), toPxY(trajectory[k].y));
      }
      ctx.stroke();

      const lead = trajectory[trajectory.length - 1];
      ctx.fillStyle = "#4f46e5";
      ctx.beginPath();
      ctx.arc(toPxX(lead.x), toPxY(lead.y), 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [config, equilibriumPoint, trajectory, hoveredEq, vectorFieldStyle, showVelocityColor, vectorDensity]);

  // Numerical Euler integration loop for particle tracking animation
  useEffect(() => {
    let animFrame: number;
    const { e, h, F } = config;
    const dt = 0.05; // small time step

    const stepSimulation = () => {
      if (!isTracing) return;

      const pos = currentPosRef.current;

      // Replicator Dynamics equations
      const dx = pos.x * (1 - pos.x) * ((1 - pos.y) * F - h);
      const dy = pos.y * (1 - pos.y) * (pos.x * F - e);

      // Euler update
      const nextX = Math.max(0.001, Math.min(0.999, pos.x + dx * dt));
      const nextY = Math.max(0.001, Math.min(0.999, pos.y + dy * dt));

      const nextPos = { x: nextX, y: nextY };
      currentPosRef.current = nextPos;

      // Append to trace lists
      const currentTrace = [...traceRef.current, nextPos];
      if (currentTrace.length > 180) {
        currentTrace.shift(); // truncate to limit history trail size
      }
      traceRef.current = currentTrace;
      setTrajectory(currentTrace);

      // Stop tracing if we completed a closed orbit or hit boundaries (approx)
      animFrame = requestAnimationFrame(stepSimulation);
    };

    if (isTracing) {
      animFrame = requestAnimationFrame(stepSimulation);
    }

    return () => cancelAnimationFrame(animFrame);
  }, [isTracing, config]);

  // Handle Canvas Click to seed custom point
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const padding = 40;
    const width = canvas.width;
    const height = canvas.height;

    // Convert pixels to values in [0, 1]
    const xVal = (clickX - padding) / (width - 2 * padding);
    const yVal = (height - padding - clickY) / (height - 2 * padding);

    // Safeguard boundaries
    if (xVal >= 0 && xVal <= 1 && yVal >= 0 && yVal <= 1) {
      setIsTracing(false);
      setTimeout(() => {
        const seedPoint = { x: xVal, y: yVal };
        currentPosRef.current = seedPoint;
        traceRef.current = [seedPoint];
        setTrajectory([seedPoint]);
        setIsTracing(true);
        onLog(`在画布注入初始群体比例点：(雇主检查 x = ${xVal.toFixed(3)}, 雇员工作 y = ${yVal.toFixed(3)})，开始演算动力学轨迹`, "success");
      }, 50);
    }
  };

  // Handle Mouse movement to detect hovering over any of the 5 Nash Equilibrium points
  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const padding = 40;
    const width = canvas.width;
    const height = canvas.height;

    const toPxX = (val: number) => padding + val * (width - 2 * padding);
    const toPxY = (val: number) => height - padding - val * (height - 2 * padding);

    let closestPt: any = null;
    let minDistance = Infinity;

    eqPoints.forEach((pt) => {
      const px = toPxX(pt.x);
      const py = toPxY(pt.y);
      const dist = Math.sqrt((mouseX - px) ** 2 + (mouseY - py) ** 2);
      if (dist < minDistance) {
        minDistance = dist;
        closestPt = pt;
      }
    });

    // Detect if mouse is close enough (e.g., within 22px radius)
    if (minDistance < 22) {
      if (!hoveredEq || hoveredEq.id !== closestPt.id) {
        setHoveredEq(closestPt);
      }
    } else {
      if (hoveredEq !== null) {
        setHoveredEq(null);
      }
    }
  };

  const handleCanvasMouseLeave = () => {
    setHoveredEq(null);
  };

  // Reset custom seed tracing
  const handleClearTrace = () => {
    setIsTracing(false);
    setTrajectory([]);
    traceRef.current = [];
    setSolverStep(0);
    onLog("重置演化轨迹与相图", "info");
  };

  const handleSliderChange = (param: keyof EvolutionaryConfig, value: number) => {
    setConfig((prev) => {
      const updated = { ...prev, [param]: value };
      onLog(`更新演化模型参数 ${param} = ${value}`, "info");
      return updated;
    });
    handleClearTrace();
  };

  return (
    <div id="evolutionary-game-tab" className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* 1. Left controls panel */}
      <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin-slow" />
            1. 演化机制参数
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            动态博弈参数将塑造局部相空间轨迹与稳定平衡点
          </p>
        </div>

        {/* Sliders list */}
        <div className="space-y-4">
          {/* F: Penalty */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">偷懒惩罚 F (Penalty)</span>
              <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-sm font-bold">{config.F}</span>
            </div>
            <input
              type="range"
              min="10"
              max="40"
              step="1"
              value={config.F}
              onChange={(e) => handleSliderChange("F", parseInt(e.target.value))}
              className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          {/* e: effort cost */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">努力负效用 e (Effort Cost)</span>
              <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-sm font-bold">{config.e}</span>
            </div>
            <input
              type="range"
              min="2"
              max="20"
              step="1"
              value={config.e}
              onChange={(e) => handleSliderChange("e", parseInt(e.target.value))}
              className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          {/* h: inspect cost */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">检查成本 h (Inspect Cost)</span>
              <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-sm font-bold">{config.h}</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={config.h}
              onChange={(e) => handleSliderChange("h", parseInt(e.target.value))}
              className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
        </div>

        {/* Phase Portrait Layers Settings */}
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3.5">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            🌀 相图矢量与流线场叠加图层
          </span>
          
          <div className="space-y-3">
            {/* Style Toggle */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 block">流场呈现样式 (Flow Field Style)</label>
              <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setVectorFieldStyle("arrows")}
                  className={`py-1 text-[10px] font-bold rounded-lg transition-all ${
                    vectorFieldStyle === "arrows"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  经典矢量
                </button>
                <button
                  type="button"
                  onClick={() => setVectorFieldStyle("streamlines")}
                  className={`py-1 text-[10px] font-bold rounded-lg transition-all ${
                    vectorFieldStyle === "streamlines"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  连续流线
                </button>
                <button
                  type="button"
                  onClick={() => setVectorFieldStyle("hybrid")}
                  className={`py-1 text-[10px] font-bold rounded-lg transition-all ${
                    vectorFieldStyle === "hybrid"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  双重叠合
                </button>
              </div>
            </div>

            {/* Velocity coloring & Density */}
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 pt-1 border-t border-slate-200/50">
              <span>演化速度强弱着色 (Velocity Coloring)</span>
              <button
                type="button"
                onClick={() => setShowVelocityColor(!showVelocityColor)}
                className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showVelocityColor ? "bg-indigo-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    showVelocityColor ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="space-y-1.5 pt-1.5 border-t border-slate-200/50">
              <div className="flex justify-between text-[11px] font-bold text-slate-500">
                <span>流场矢量密度 (Density Grid)</span>
                <span className="font-mono text-indigo-600">{vectorDensity} × {vectorDensity}</span>
              </div>
              <input
                type="range"
                min="8"
                max="16"
                step="2"
                value={vectorDensity}
                onChange={(e) => setVectorDensity(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Dynamic ESS & 5 Equilibria Interactive List */}
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              🎯 演化特征与博弈均衡点 (ESS)
            </span>
            <span className="text-[10px] font-medium text-slate-400">
              可悬停互动
            </span>
          </div>

          <div className="space-y-1.5">
            {eqPoints.map((pt) => {
              const isActive = hoveredEq && hoveredEq.id === pt.id;
              return (
                <div
                  key={pt.id}
                  onMouseEnter={() => setHoveredEq(pt)}
                  onMouseLeave={() => setHoveredEq(null)}
                  onClick={() => setHoveredEq(pt)}
                  className={`p-2.5 rounded-xl border text-[11px] transition-all duration-200 cursor-pointer ${
                    isActive
                      ? pt.id === "eq_star"
                        ? "bg-amber-50/75 border-amber-300 shadow-xs ring-1 ring-amber-200/50"
                        : "bg-indigo-50/75 border-indigo-300 shadow-xs ring-1 ring-indigo-200/50"
                      : "bg-white hover:bg-slate-50/80 border-slate-200/60"
                  }`}
                >
                  <div className="flex justify-between items-center font-semibold mb-1">
                    <span className={isActive ? (pt.id === "eq_star" ? "text-amber-700" : "text-indigo-700") : "text-slate-700"}>
                      {pt.math}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-bold ${
                      pt.id === "eq_star"
                        ? isActive ? "bg-amber-200 text-amber-800" : "bg-amber-100/70 text-amber-700"
                        : isActive ? "bg-indigo-200 text-indigo-800" : "bg-slate-100 text-slate-500"
                    }`}>
                      {pt.id === "eq_star" ? "中性稳定" : "不演化稳定 (鞍点)"}
                    </span>
                  </div>
                  <p className={`text-[10px] ${isActive ? "text-slate-700 font-medium" : "text-slate-500"} line-clamp-1`}>
                    {pt.name}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="text-[10px] text-slate-400 bg-white border border-slate-100 p-2 rounded-lg leading-relaxed flex gap-1.5 items-start">
            <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
            <span>
              提示：您可以<strong>悬停上方列表项</strong>，或直接在<strong>右侧相图极值点</strong>周围移动，来高亮并解锁对应的纳什均衡点和其帕累托稳定性条件。
            </span>
          </div>
        </div>
      </div>

      {/* 2. Middle Visual Canvas Panel */}
      <div className="lg:col-span-7 bg-slate-50/50 border border-slate-100 rounded-2xl p-5 flex flex-col justify-between h-full min-h-[500px]">
        {/* Visualizer header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <MousePointerClick className="w-4 h-4 text-indigo-500 animate-bounce" />
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                2D 演化博弈相图与复制动态向量场
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                直接在画布任意空白处<span className="font-semibold text-indigo-600">点击鼠标</span>，可注入一个初始群体比例点，实时动画展示收敛轨迹
              </p>
            </div>
          </div>
          <div className="text-[11px] bg-indigo-50 text-indigo-600 rounded-full px-2.5 py-1 font-medium font-mono">
            步骤: {solverStep} / {totalSteps - 1}
          </div>
        </div>

        {/* HTML5 Canvas Area */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="relative bg-white border border-slate-100 rounded-2xl p-3 shadow-xs">
            <canvas
              ref={canvasRef}
              width={380}
              height={380}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={handleCanvasMouseLeave}
              className="cursor-crosshair overflow-hidden block rounded-lg hover:shadow-inner transition-shadow"
            />

            {/* Floating details badge when hovering over an equilibrium point */}
            {hoveredEq && (
              <div className="absolute inset-x-4 bottom-4 bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl border border-slate-700/50 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-250 z-10 select-text">
                <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-amber-400 font-mono">
                      {hoveredEq.math} 纳什均衡点
                    </span>
                    <h4 className="text-[11px] font-bold text-slate-100">
                      {hoveredEq.name}
                    </h4>
                  </div>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm shrink-0 ${
                    hoveredEq.id === "eq_star"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  }`}>
                    {hoveredEq.id === "eq_star" ? "中性稳定中心" : "不稳定鞍点"}
                  </span>
                </div>
                
                <div className="space-y-1.5 text-[10px] leading-relaxed">
                  <div>
                    <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">⚖️ 稳定及演化收敛条件 (Stability Condition)：</span>
                    <p className="text-emerald-300 font-medium">{hoveredEq.condition}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">📖 博弈机制深度解析 (Economic Analysis)：</span>
                    <p className="text-slate-300">{hoveredEq.desc}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Float badge displaying coordinates during hover/active trace (only shown when not hovering on equilibrium points for cleaner UI) */}
            {!hoveredEq && trajectory.length > 0 && (
              <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-xs text-white p-2.5 rounded-lg text-[10px] font-mono border border-slate-700/50 shadow-md">
                <span className="text-amber-400 font-bold block mb-1">当前比例 (t)</span>
                <div>雇主检查 x: {trajectory[trajectory.length - 1].x.toFixed(3)}</div>
                <div>雇员工作 y: {trajectory[trajectory.length - 1].y.toFixed(3)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Explanation banner */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-600">
          <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            此模型模拟的是<span className="font-semibold">“检查者-工作者”</span>博弈。
            雇主检查比例过高时，雇员倾向工作；雇员普遍工作时，雇主倾向减少检查；
            检查过少，雇员转而偷懒；偷懒过多，雇主被迫再次增加检查。从而在相图中形成完美的循环涡流。
          </p>
        </div>

        {/* Tab Footer Controls */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
          <button
            onClick={handleClearTrace}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition text-xs flex items-center gap-1 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重置画布
          </button>

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
                  自适应求解步
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
    </div>
  );
}
