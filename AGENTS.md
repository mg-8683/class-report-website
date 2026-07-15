# AGENTS.md

## 项目概览

班课阶段报告管理工具 - 内部教学管理网页应用。教师可填写每个课时的学员评价（基础能力、笔记、专注度、逻辑力、理解力、互动情况），管理者可导出/导入 JSON 备份数据。

## 技术栈

- Next.js 16 (App Router) + React 19 + TypeScript 5
- Tailwind CSS 4 + shadcn/ui
- 纯前端应用，数据存储在 localStorage

## 目录结构

```
src/
── app/
│   ├── page.tsx          # 主页面（全部 UI 逻辑）
│   ├── layout.tsx        # 根布局
│   └── globals.css       # 全局样式
├── lib/
│   ├── types.ts          # 类型定义与默认数据
│   └── utils.ts          # cn 工具函数
└── components/ui/        # shadcn/ui 组件
```

## 核心数据模型

- `AppData`: 课程名称、学员列表、反馈模块、课时列表、当前激活课时
- `LessonData`: 课时 ID、名称、内容概要、学员评价字典
- `StudentEvaluation`: 基础能力、笔记、专注度、逻辑力、理解力、互动情况

## 构建与测试

```bash
pnpm install      # 安装依赖
pnpm run dev      # 开发模式（HMR）
pnpm run build    # 生产构建
pnpm run lint     # ESLint 检查
pnpm ts-check     # TypeScript 类型检查
```

## 开发规范

- 纯客户端应用，所有交互在 `page.tsx` 中完成
- 数据通过 localStorage 持久化，key 为 `class-report-data`
- 修改代码后 HMR 自动热更新，无需重启
- 禁止使用 npm/yarn，仅使用 pnpm
