#!/bin/bash
# GitHub Pages 一键部署脚本
# 使用方法：pnpm run deploy

set -e

echo "🔨 构建项目..."
NEXT_PUBLIC_BASE_PATH=/class-report-website npx next build

echo "📦 部署到 gh-pages 分支..."
cd out

# 初始化 gh-pages 分支
git init
git add -A
git commit -m "Deploy to GitHub Pages - $(date '+%Y-%m-%d %H:%M:%S')"
git branch -M gh-pages

# 推送到远程 gh-pages 分支
git remote add origin https://github.com/shelley-98683/class-report-website.git
git push -f origin gh-pages

# 清理
cd ..
rm -rf out/.git

echo "✅ 部署完成！"
echo "🌐 访问地址：https://shelley-98683.github.io/class-report-website/"
