# 🧠 闪念笔记 - AI 驱动的知识管理工具

一个手机端优先的个人知识管理应用，使用 AI 自动整理笔记。

## ✨ 功能特点

- 📱 **手机端优先设计** - 完美适配手机屏幕，可添加到主屏幕
- 🤖 **AI 智能整理** - 自动分类、打标签、生成摘要
- 🔍 **快速搜索** - 支持标题、内容、标签搜索
- 💾 **本地存储** - 数据保存在本地，安全私密
- 📤 **数据导出** - 支持导出为 JSON 文件
- 🌐 **PWA 支持** - 可离线使用

## 🚀 快速开始

### 方式一：本地运行（推荐新手）

1. **直接用浏览器打开**
   ```
   双击 index.html 文件即可在浏览器中打开
   ```

2. **配置 API Key**
   - 点击右上角设置图标 ⚙️
   - 输入你的通义千问 API Key
   - 点击保存

3. **开始使用**
   - 点击底部 ➕ 按钮创建笔记
   - 输入标题和内容
   - 点击 "AI 智能整理" 按钮
   - AI 会自动分类、打标签、生成摘要

### 方式二：部署上线（分享给别人）

#### 使用 Vercel 部署（免费）

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 进入项目目录
cd knowledge-notes

# 3. 部署
vercel --prod
```

#### 使用 GitHub Pages 部署（免费）

```bash
# 1. 创建 GitHub 仓库
# 2. 推送代码
git init
git add .
git commit -m "初始版本"
git branch -M main
git remote add origin https://github.com/你的用户名/knowledge-notes.git
git push -u origin main

# 3. 在 GitHub 仓库设置中启用 GitHub Pages
# Settings → Pages → Source → main branch → Save
```

## 📱 添加到手机主屏幕

### iPhone (Safari)
1. 用 Safari 打开网页
2. 点击底部分享按钮
3. 选择"添加到主屏幕"
4. 点击添加

### Android (Chrome)
1. 用 Chrome 打开网页
2. 点击右上角菜单（三个点）
3. 选择"添加到主屏幕"
4. 点击添加

## 🔑 获取 API Key

1. 访问阿里云百炼控制台：https://bailian.console.aliyun.com
2. 进入 API-KEY 管理页面
3. 创建新的 API Key
4. 复制 Key 到应用设置中

## 📁 项目结构

```
knowledge-notes/
├── index.html      # 主页面
├── app.js          # 应用逻辑
├── manifest.json   # PWA 配置
├── sw.js           # Service Worker
└── README.md       # 说明文档
```

## 💡 使用技巧

1. **快速记录** - 有想法立刻记下来，后续再用 AI 整理
2. **批量整理** - 可以先记录多篇笔记，空闲时统一用 AI 整理
3. **标签管理** - AI 会自动打标签，也可以手动修改
4. **定期回顾** - 使用搜索功能快速找到相关笔记
5. **数据备份** - 定期导出数据到本地备份

## 🛠️ 技术栈

- **前端**: HTML + CSS + JavaScript
- **样式**: Tailwind CSS (CDN)
- **存储**: localStorage
- **AI**: 通义千问 API
- **PWA**: Service Worker + manifest.json

## 📊 数据统计

在设置页面可以查看：
- 总笔记数
- 各分类笔记数量
- 标签使用情况

## 🔒 隐私说明

- 所有数据存储在本地（浏览器 localStorage）
- 只有 AI 整理时会发送内容到阿里云 API
- 不会上传到任何服务器
- 可以随时导出和清空数据

## 🎨 界面预览

### 首页
- 搜索框
- 统计信息
- 笔记卡片列表
- 底部导航栏

### 添加笔记
- 标题输入
- 内容输入
- AI 智能整理按钮

### 笔记详情
- 完整内容
- AI 摘要
- 分类和标签
- 编辑/删除操作

## 🚧 后续迭代计划

- [ ] 笔记关联推荐
- [ ] 知识图谱可视化
- [ ] 多设备同步
- [ ] 语音输入
- [ ] 模板功能
- [ ] 导出为 Markdown/PDF
- [ ] 深色模式

## 📝 更新日志

### v1.0.0 (2026-04-03)
- ✅ 基础笔记功能
- ✅ AI 智能整理
- ✅ 搜索功能
- ✅ PWA 支持
- ✅ 数据导出

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**Made with ❤️ by AI + Human**
