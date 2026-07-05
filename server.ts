import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini Client helper to prevent startup crashes
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// AI Insight Engine API Route
app.post("/api/gemini/insight", async (req, res) => {
  try {
    const { game_type, player_names, structure, calculated_equilibrium } = req.body;

    if (!game_type) {
      res.status(400).json({ error: "Missing game_type parameter" });
      return;
    }

    const client = getGeminiClient();

    // Construct the academic structural prompt
    const prompt = `
[Role] 你是顶级微观经济学与博弈论教授。
[Task] 请针对用户提交的博弈模型及计算出的纳什均衡结果，进行深度多维学术诊断。
[Rules] 
1. 绝对不要重复陈述已知的数值，直接输出核心洞察。
2. 必须包含三个板块：【结构机理诊断】、【帕累托效率评估】、【现实场景映射】。
3. 语气保持严谨、一针见血、启发性。

[Game Context]
- 博弈类型: ${game_type}
- 参与者角色: ${JSON.stringify(player_names || ["Player 1", "Player 2"])}
- 结构特征/支付参数: ${typeof structure === "object" ? JSON.stringify(structure) : structure}
- 求解计算得到的均衡结果: ${typeof calculated_equilibrium === "object" ? JSON.stringify(calculated_equilibrium) : calculated_equilibrium}

[Format Requirements]
### 1. 结构机理诊断
* 占优策略与博弈性质：分析是否存在绝对/相对占优策略，该均衡是由于信息不对称（贝叶斯）、还是由于个体理性导致的极限惩罚（逆向归纳）。
* 稳定性分析：对于演化博弈，诊断该点是鞍点、稳定源还是汇点；对于离散博弈，分析是否存在协调失败。

### 2. 帕累托效率评估
* 效率诊断：明确指出该纳什均衡是否达到了帕累托最优（Pareto Efficiency）。
* 福利损失：若存在效率净损失（Deadweight Loss），计算或定性分析由于个体自私导致的集体福利坍塌。是否有卡特尔（合谋）破裂倾向？

### 3. 现实场景映射与机制设计
* 商业/社会学隐喻：将此数值模型精准对齐到一个真实的现实世界案例中（例如：跨国巨头的价格战、职场信号传递陷阱、碳减排的公地悲剧）。
* 机制设计改良方案：基于博弈论机制设计（Mechanism Design），提出改变游戏规则（如引入第三方惩罚、改变贴现率、强制信息披露）以改善当前低效均衡的具体建议。
`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ insight: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ 
      error: error.message || "Internal server error calling Gemini API",
      hint: "请确保已在 AI Studio 的 Settings > Secrets 中正确配置了 GEMINI_API_KEY。"
    });
  }
});

// Setup Vite Dev server or Serve Static files for production
async function configureServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Configuring development server with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Configuring production server serving dist files...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

configureServer().catch((err) => {
  console.error("Failed to start server:", err);
});
