/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum GameMode {
  DISCRETE = "DISCRETE",
  COURNOT = "COURNOT",
  SEQUENTIAL = "SEQUENTIAL",
  EVOLUTIONARY = "EVOLUTIONARY",
}

// 1. Discrete Game Types
export interface Payoff {
  u1: number;
  u2: number;
}

export interface DiscreteGameConfig {
  rows: number;
  cols: number;
  rowLabels: string[];
  colLabels: string[];
  matrix: Payoff[][]; // matrix[row][col]
}

export interface DiscretePreset {
  name: string;
  rows: number;
  cols: number;
  rowLabels: string[];
  colLabels: string[];
  matrix: Payoff[][];
  description: string;
}

// 2. Cournot Game Types
export interface CournotConfig {
  a: number; // demand constant a (Price intercept)
  b: number; // demand slope b
  c1: number; // marginal cost of P1
  c2: number; // marginal cost of P2
}

// 3. Sequential Game Types
export interface TreeNode {
  id: string;
  label: string;
  player: 1 | 2 | 0; // 0 for terminal payoff node, 1 for Player 1 decision, 2 for Player 2 decision
  children: string[]; // child node IDs
  payoffs?: Payoff; // only for terminal nodes (player = 0)
  actionLabel?: string; // label of the branch leading to this node (e.g., "Cooperate", "Defect")
}

export interface SequentialGameConfig {
  nodes: Record<string, TreeNode>;
  rootId: string;
}

export interface SequentialPreset {
  name: string;
  description: string;
  config: SequentialGameConfig;
}

// 4. Evolutionary Game Types
export interface EvolutionaryConfig {
  V: number; // Product value / reward
  W: number; // Employee wage
  e: number; // Cost of employee effort (Work effort cost)
  h: number; // Employer inspection cost
  F: number; // Penalty/fine if employee caught shirking
  L: number; // Loss suffered by employer when employee shirks
  initX: number; // Initial Inspect probability
  initY: number; // Initial Work probability
}

// Sandbox Execution State
export interface SolverStepLog {
  id: string;
  stepIndex: number;
  message: string;
  timestamp: string;
  type: "info" | "success" | "warn";
}

export interface SolverState {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  logs: SolverStepLog[];
  highlightedCodeLine: number;
}
