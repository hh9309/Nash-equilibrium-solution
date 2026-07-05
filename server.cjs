var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.");
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
app.post("/api/gemini/insight", async (req, res) => {
  try {
    const { game_type, player_names, structure, calculated_equilibrium } = req.body;
    if (!game_type) {
      res.status(400).json({ error: "Missing game_type parameter" });
      return;
    }
    const client = getGeminiClient();
    const prompt = `
[Role] \u4F60\u662F\u9876\u7EA7\u5FAE\u89C2\u7ECF\u6D4E\u5B66\u4E0E\u535A\u5F08\u8BBA\u6559\u6388\u3002
[Task] \u8BF7\u9488\u5BF9\u7528\u6237\u63D0\u4EA4\u7684\u535A\u5F08\u6A21\u578B\u53CA\u8BA1\u7B97\u51FA\u7684\u7EB3\u4EC0\u5747\u8861\u7ED3\u679C\uFF0C\u8FDB\u884C\u6DF1\u5EA6\u591A\u7EF4\u5B66\u672F\u8BCA\u65AD\u3002
[Rules] 
1. \u7EDD\u5BF9\u4E0D\u8981\u91CD\u590D\u9648\u8FF0\u5DF2\u77E5\u7684\u6570\u503C\uFF0C\u76F4\u63A5\u8F93\u51FA\u6838\u5FC3\u6D1E\u5BDF\u3002
2. \u5FC5\u987B\u5305\u542B\u4E09\u4E2A\u677F\u5757\uFF1A\u3010\u7ED3\u6784\u673A\u7406\u8BCA\u65AD\u3011\u3001\u3010\u5E15\u7D2F\u6258\u6548\u7387\u8BC4\u4F30\u3011\u3001\u3010\u73B0\u5B9E\u573A\u666F\u6620\u5C04\u3011\u3002
3. \u8BED\u6C14\u4FDD\u6301\u4E25\u8C28\u3001\u4E00\u9488\u89C1\u8840\u3001\u542F\u53D1\u6027\u3002

[Game Context]
- \u535A\u5F08\u7C7B\u578B: ${game_type}
- \u53C2\u4E0E\u8005\u89D2\u8272: ${JSON.stringify(player_names || ["Player 1", "Player 2"])}
- \u7ED3\u6784\u7279\u5F81/\u652F\u4ED8\u53C2\u6570: ${typeof structure === "object" ? JSON.stringify(structure) : structure}
- \u6C42\u89E3\u8BA1\u7B97\u5F97\u5230\u7684\u5747\u8861\u7ED3\u679C: ${typeof calculated_equilibrium === "object" ? JSON.stringify(calculated_equilibrium) : calculated_equilibrium}

[Format Requirements]
### 1. \u7ED3\u6784\u673A\u7406\u8BCA\u65AD
* \u5360\u4F18\u7B56\u7565\u4E0E\u535A\u5F08\u6027\u8D28\uFF1A\u5206\u6790\u662F\u5426\u5B58\u5728\u7EDD\u5BF9/\u76F8\u5BF9\u5360\u4F18\u7B56\u7565\uFF0C\u8BE5\u5747\u8861\u662F\u7531\u4E8E\u4FE1\u606F\u4E0D\u5BF9\u79F0\uFF08\u8D1D\u53F6\u65AF\uFF09\u3001\u8FD8\u662F\u7531\u4E8E\u4E2A\u4F53\u7406\u6027\u5BFC\u81F4\u7684\u6781\u9650\u60E9\u7F5A\uFF08\u9006\u5411\u5F52\u7EB3\uFF09\u3002
* \u7A33\u5B9A\u6027\u5206\u6790\uFF1A\u5BF9\u4E8E\u6F14\u5316\u535A\u5F08\uFF0C\u8BCA\u65AD\u8BE5\u70B9\u662F\u978D\u70B9\u3001\u7A33\u5B9A\u6E90\u8FD8\u662F\u6C47\u70B9\uFF1B\u5BF9\u4E8E\u79BB\u6563\u535A\u5F08\uFF0C\u5206\u6790\u662F\u5426\u5B58\u5728\u534F\u8C03\u5931\u8D25\u3002

### 2. \u5E15\u7D2F\u6258\u6548\u7387\u8BC4\u4F30
* \u6548\u7387\u8BCA\u65AD\uFF1A\u660E\u786E\u6307\u51FA\u8BE5\u7EB3\u4EC0\u5747\u8861\u662F\u5426\u8FBE\u5230\u4E86\u5E15\u7D2F\u6258\u6700\u4F18\uFF08Pareto Efficiency\uFF09\u3002
* \u798F\u5229\u635F\u5931\uFF1A\u82E5\u5B58\u5728\u6548\u7387\u51C0\u635F\u5931\uFF08Deadweight Loss\uFF09\uFF0C\u8BA1\u7B97\u6216\u5B9A\u6027\u5206\u6790\u7531\u4E8E\u4E2A\u4F53\u81EA\u79C1\u5BFC\u81F4\u7684\u96C6\u4F53\u798F\u5229\u574D\u584C\u3002\u662F\u5426\u6709\u5361\u7279\u5C14\uFF08\u5408\u8C0B\uFF09\u7834\u88C2\u503E\u5411\uFF1F

### 3. \u73B0\u5B9E\u573A\u666F\u6620\u5C04\u4E0E\u673A\u5236\u8BBE\u8BA1
* \u5546\u4E1A/\u793E\u4F1A\u5B66\u9690\u55BB\uFF1A\u5C06\u6B64\u6570\u503C\u6A21\u578B\u7CBE\u51C6\u5BF9\u9F50\u5230\u4E00\u4E2A\u771F\u5B9E\u7684\u73B0\u5B9E\u4E16\u754C\u6848\u4F8B\u4E2D\uFF08\u4F8B\u5982\uFF1A\u8DE8\u56FD\u5DE8\u5934\u7684\u4EF7\u683C\u6218\u3001\u804C\u573A\u4FE1\u53F7\u4F20\u9012\u9677\u9631\u3001\u78B3\u51CF\u6392\u7684\u516C\u5730\u60B2\u5267\uFF09\u3002
* \u673A\u5236\u8BBE\u8BA1\u6539\u826F\u65B9\u6848\uFF1A\u57FA\u4E8E\u535A\u5F08\u8BBA\u673A\u5236\u8BBE\u8BA1\uFF08Mechanism Design\uFF09\uFF0C\u63D0\u51FA\u6539\u53D8\u6E38\u620F\u89C4\u5219\uFF08\u5982\u5F15\u5165\u7B2C\u4E09\u65B9\u60E9\u7F5A\u3001\u6539\u53D8\u8D34\u73B0\u7387\u3001\u5F3A\u5236\u4FE1\u606F\u62AB\u9732\uFF09\u4EE5\u6539\u5584\u5F53\u524D\u4F4E\u6548\u5747\u8861\u7684\u5177\u4F53\u5EFA\u8BAE\u3002
`;
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });
    res.json({ insight: response.text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({
      error: error.message || "Internal server error calling Gemini API",
      hint: "\u8BF7\u786E\u4FDD\u5DF2\u5728 AI Studio \u7684 Settings > Secrets \u4E2D\u6B63\u786E\u914D\u7F6E\u4E86 GEMINI_API_KEY\u3002"
    });
  }
});
async function configureServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Configuring development server with Vite middleware...");
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("Configuring production server serving dist files...");
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
configureServer().catch((err) => {
  console.error("Failed to start server:", err);
});
//# sourceMappingURL=server.cjs.map
