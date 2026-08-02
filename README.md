# GitHub 高星新项目

面向开发者的 GitHub 新增高星项目速览，100%由DeepSeekv4Flash编写，按 Stars 排序，支持分类浏览，并通过 AI 模型自动翻译项目简介。

## 功能

- 从 GitHub Search API 拉取近 7 / 30 / 90 天创建的高星项目
- 按类型自动分类，每个分类默认展示 3 个项目，可展开全部
- 支持周期切换、加载更多、统计概览
- 通过本地 Ollama 或 OpenAI 兼容接口自动总结并翻译简介
- 模型地址、模型名、API Key 可在页面右上角设置，仅保存在浏览器 localStorage，不写入文件

## 使用

直接打开 `index.html` 即可浏览。AI 翻译默认连接本地 Ollama（`http://localhost:11434`），本地服务不可用时自动回退直连 Ollama。

如需本地代理（例如远程 API 在浏览器中受 CORS 限制时）：

```bash
node server.js
```

然后访问 `http://127.0.0.1:5173/`。
