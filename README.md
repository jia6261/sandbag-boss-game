# 丢沙包击败Boss

一个用React开发的休闲射击游戏，玩家通过拖拽鼠标投掷沙包来击败移动的Boss。

## 游戏特色

- 🎯 **直观操作**：拖拽鼠标来瞄准和投掷沙包
- 🤖 **智能Boss**：Boss会移动并发射投射物攻击玩家
- 💥 **碰撞检测**：精确的碰撞检测和伤害系统
- 🎨 **视觉效果**：击中特效和粒子系统
- 📱 **响应式设计**：支持桌面和移动设备

## 游戏玩法

1. 点击"开始游戏"进入游戏界面
2. 拖拽鼠标从玩家角色（蓝色方块）向Boss方向来瞄准
3. 松开鼠标投掷沙包
4. 击中Boss造成伤害，同时躲避Boss的攻击
5. 将Boss血量降为零即可获胜

## 技术栈

- **前端框架**：React 18
- **构建工具**：Vite
- **样式**：Tailwind CSS
- **UI组件**：shadcn/ui
- **游戏渲染**：HTML5 Canvas
- **语言**：JavaScript

## 本地开发

### 安装依赖

```bash
npm install
# 或
pnpm install
```

### 启动开发服务器

```bash
npm run dev
# 或
pnpm run dev
```

游戏将在 `http://localhost:5173` 运行

### 构建生产版本

```bash
npm run build
# 或
pnpm run build
```

## 游戏截图

游戏包含以下界面：
- 主菜单界面
- 游戏进行界面（显示血量、得分、瞄准线等）
- 胜利/失败界面

## 部署

项目已配置为可以轻松部署到各种静态网站托管平台：

- Vercel
- Netlify
- GitHub Pages
- 或任何支持静态文件的服务器

## 贡献

欢迎提交Issue和Pull Request来改进游戏！

## 许可证

MIT License

