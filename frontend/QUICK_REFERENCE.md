# Frontend 快速参考指南

> 本文档提供 frontend 文件夹的快速参考，适合新开发者快速了解项目结构

## 📚 文档导航

1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 详细的架构分析文档
   - 完整目录结构
   - 文件调用关系
   - 网站形成过程
   - 依赖说明

2. **[CALL_GRAPH.md](./CALL_GRAPH.md)** - 文件调用关系图
   - 可视化调用流程
   - 数据流向图
   - 渲染流程图

3. **本文档** - 快速参考指南

## ⚡ 快速开始

### 安装和运行
```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm start
# 访问 http://localhost:3000

# 3. 构建生产版本
npm run build
# 输出到 build/ 目录
```

### 项目技术栈
- **框架**: React 19.2.0
- **语言**: TypeScript 4.9.5
- **构建工具**: Create React App (react-scripts 5.0.1)
- **包管理器**: npm

## 📂 核心文件说明

### 入口文件
| 文件 | 作用 | 重要程度 |
|------|------|----------|
| `public/index.html` | HTML 模板，包含 `<div id="root">` | ⭐⭐⭐⭐⭐ |
| `src/index.tsx` | JavaScript 入口，创建 React 根节点 | ⭐⭐⭐⭐⭐ |
| `src/App.tsx` | 主应用组件 | ⭐⭐⭐⭐⭐ |

### 样式文件
| 文件 | 作用 | 作用域 |
|------|------|--------|
| `src/index.css` | 全局样式 | 整个应用 |
| `src/App.css` | App 组件样式 | App 组件 |

### 配置文件
| 文件 | 作用 |
|------|------|
| `package.json` | 依赖管理和脚本配置 |
| `tsconfig.json` | TypeScript 编译配置 |
| `.gitignore` | Git 忽略规则 |

### 其他文件
| 文件 | 作用 |
|------|------|
| `src/reportWebVitals.ts` | 性能监控 |
| `src/setupTests.ts` | 测试环境配置 |
| `src/App.test.tsx` | App 组件测试 |
| `src/react-app-env.d.ts` | TypeScript 类型引用 |

## 🔄 三步渲染流程

```
第一步：HTML 加载
public/index.html → 浏览器

第二步：JavaScript 执行
src/index.tsx → 创建 React 根节点

第三步：组件渲染
src/App.tsx → 显示界面
```

## 🎯 关键代码片段

### 1. index.html - HTML 模板
```html
<div id="root"></div>
<!-- React 应用将挂载到这里 -->
```

### 2. index.tsx - 应用入口
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**关键点**:
- `createRoot`: React 18 新 API，支持并发特性
- `StrictMode`: 开发模式下的额外检查
- `getElementById('root')`: 查找 HTML 中的挂载点

### 3. App.tsx - 主组件
```typescript
import React from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>Edit <code>src/App.tsx</code> and save to reload.</p>
      </header>
    </div>
  );
}

export default App;
```

**关键点**:
- 函数组件（推荐方式）
- JSX 语法（HTML-like）
- 导入图片和样式

## 🛠️ 常用命令

```bash
# 开发
npm start              # 启动开发服务器
npm test               # 运行测试
npm run build          # 生产构建

# 代码检查
npx tsc --noEmit      # TypeScript 类型检查（不生成文件）

# 清理
rm -rf node_modules   # 删除依赖
rm -rf build          # 删除构建产物
npm install           # 重新安装依赖
```

## 📦 依赖分类

### 核心依赖（必需）
```json
{
  "react": "^19.2.0",           // React 核心
  "react-dom": "^19.2.0",       // DOM 渲染
  "react-scripts": "5.0.1",     // CRA 脚本
  "typescript": "^4.9.5"        // TypeScript
}
```

### 类型定义（TypeScript 支持）
```json
{
  "@types/react": "^19.2.2",
  "@types/react-dom": "^19.2.1",
  "@types/node": "^16.18.126",
  "@types/jest": "^27.5.2"
}
```

### 测试工具
```json
{
  "@testing-library/react": "^16.3.0",
  "@testing-library/jest-dom": "^6.9.1",
  "@testing-library/user-event": "^13.5.0"
}
```

## 🌐 开发服务器工作原理

```
1. 运行 npm start
   ↓
2. Webpack Dev Server 启动
   ↓
3. 编译 TypeScript → JavaScript
   ↓
4. 打包所有模块（内存中）
   ↓
5. 启动 http://localhost:3000
   ↓
6. 监听文件变化
   ↓
7. 热模块替换 (HMR) - 无需刷新页面
```

## 🔧 添加新功能的步骤

### 1. 添加新组件
```bash
# 在 src/ 下创建组件文件
src/
  components/
    MyComponent/
      MyComponent.tsx      # 组件代码
      MyComponent.css      # 组件样式
      MyComponent.test.tsx # 组件测试
```

```typescript
// MyComponent.tsx
import React from 'react';
import './MyComponent.css';

function MyComponent() {
  return (
    <div className="my-component">
      Hello from MyComponent
    </div>
  );
}

export default MyComponent;
```

### 2. 在 App.tsx 中使用
```typescript
import MyComponent from './components/MyComponent/MyComponent';

function App() {
  return (
    <div className="App">
      <MyComponent />
    </div>
  );
}
```

## 🎨 样式组织建议

```css
/* index.css - 全局样式 */
body {
  margin: 0;
  font-family: -apple-system, ...;
}

/* App.css - 组件样式 */
.App {
  text-align: center;
}

/* MyComponent.css - 子组件样式 */
.my-component {
  padding: 20px;
}
```

**建议**:
- 全局样式放在 `index.css`
- 组件样式放在组件同名 CSS 文件
- 使用 BEM 命名规范避免样式冲突

## 🚀 针对区块链项目的扩展

### 需要添加的库
```bash
# Web3 库
npm install ethers           # 以太坊交互
npm install @metamask/sdk    # MetaMask 集成

# UI 库（可选）
npm install @mui/material    # Material-UI
npm install antd             # Ant Design
```

### 建议的文件结构
```
src/
├── components/        # UI 组件
│   ├── Navbar/       # 导航栏
│   ├── ConnectWallet/# 钱包连接
│   └── BettingCard/  # 投注卡片
├── pages/            # 页面
│   ├── Home/
│   ├── Betting/
│   └── Results/
├── hooks/            # 自定义 Hooks
│   ├── useContract.ts   # 合约交互
│   └── useWallet.ts     # 钱包状态
├── utils/            # 工具函数
│   ├── contracts.ts     # 合约配置
│   └── formatters.ts    # 数据格式化
├── types/            # TypeScript 类型
│   └── index.ts
└── constants/        # 常量
    └── addresses.ts     # 合约地址
```

### 合约交互示例
```typescript
// hooks/useContract.ts
import { ethers, Contract, InterfaceAbi } from 'ethers';
import { useState, useEffect } from 'react';

export function useContract(address: string, abi: InterfaceAbi) {
  const [contract, setContract] = useState<Contract | null>(null);
  
  useEffect(() => {
    async function setupContract() {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contractInstance = new ethers.Contract(address, abi, signer);
        setContract(contractInstance);
      }
    }
    
    setupContract();
  }, [address, abi]);
  
  return contract;
}
```

## 🐛 常见问题

### 1. 端口被占用
```bash
# 错误: Port 3000 is already in use
# 解决:
lsof -ti:3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000   # Windows
```

### 2. 依赖安装失败
```bash
# 清除缓存并重装
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### 3. TypeScript 类型错误
```bash
# 忽略类型检查（临时）
// @ts-ignore

# 或者添加类型定义
npm install --save-dev @types/[package-name]
```

## 📖 学习资源

- **React 官方文档**: https://react.dev/
- **TypeScript 手册**: https://www.typescriptlang.org/docs/
- **Create React App**: https://create-react-app.dev/
- **Web3.js**: https://web3js.readthedocs.io/
- **Ethers.js**: https://docs.ethers.org/

## ✅ 检查清单

开发前检查:
- [ ] 已安装 Node.js (推荐 v16+)
- [ ] 已安装 npm
- [ ] 已运行 `npm install`
- [ ] 能正常运行 `npm start`
- [ ] 浏览器能访问 localhost:3000

提交前检查:
- [ ] 代码通过 TypeScript 检查
- [ ] 测试通过 `npm test`
- [ ] 能成功构建 `npm run build`
- [ ] 没有 console.log 等调试代码
- [ ] 已更新相关文档

## 🔗 相关文档链接

- [详细架构文档](./ARCHITECTURE.md)
- [调用关系图](./CALL_GRAPH.md)
- [项目 README](./README.md)

---

**最后更新**: 2025-10-31  
**维护者**: ZJU Blockchain Course Team
