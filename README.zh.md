# dsh-element-inspector

[English](README.md) | 简体中文

点选 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 界面元素，识别最可能拥有它的已安装插件，并导出或隐藏所选元素。

> [!NOTE]
> 这是非官方社区项目，与 DeepSeek 官方无隶属或背书关系。

按下 `F1`，指向元素并单击即可检查。插件会将稳定的 DOM 标记与当前 DSH profile 中已安装插件的运行时源码进行比对，并展示最强候选及其判断依据。

![元素选择与归属识别演示](assets/dsh-element-inspector-demo.gif)

## 功能

- **元素拾取**：高亮鼠标下的元素，单击后分析归属。
- **基于证据的归属判断**：根据 DOM 标记、祖先距离和源码匹配对已安装插件排序，不依赖硬编码的插件名单。
- **源码定位**：展示命中的插件版本、源码文件和每项判断依据。
- **快速导航**：打开已安装插件目录，或打开其 `package.json` 声明的源仓库。
- **元素导出**：在本地生成 PNG 截图、复制 `outerHTML`，或转换为 GitHub Flavored Markdown。
- **持久隐藏**：隐藏所选元素，并支持逐条恢复或清空全部隐藏规则。
- **自定义快捷键**：默认使用 `F1`；快速按两次可打开设置并录入新快捷键。

## 界面

| 归属识别结果 | 设置与隐藏规则 |
| --- | --- |
| ![元素归属识别结果](assets/dsh-element-inspector-result.png) | ![插件设置](assets/dsh-element-inspector-settings.png) |

## 兼容性

| 项目 | 支持范围 |
| --- | --- |
| DeepSeek Harness | `>=0.1.0-rc.8 <0.2.0-0` |
| DSH 平台 | Web、Desktop |
| 操作系统 | Windows、Linux、macOS |

插件通过 DSH 提供的 `ctx.baseUrl` 定位当前 profile，并沿 Node.js 模块搜索路径解析插件。它支持常规 npm/pnpm 安装、本地链接和 workspace 提升，不依赖固定的用户目录、盘符、Desktop 数据目录或进程工作目录。

## 安装

使用前需要先安装 DeepSeek Harness。通过 npm 将预构建插件安装到 `web` profile：

```sh
dsh plugin --profile web add dsh-element-inspector
```

安装时不需要授予构建脚本执行权限。安装后重启对应的 DSH Web 或 Desktop 实例。启动前可以先检查组合后的 profile：

```sh
dsh --profile web --dump-config
dsh web
```

也可以直接从 GitHub 安装本版本的源码快照：

```sh
dsh plugin --profile web add github:muyuanjin/dsh-element-inspector#v0.5.0
```

本仓库已包含构建后的运行时入口，因此这种安装方式同样不需要执行安装期构建脚本。

### 本地源码

从本地源码开发时：

```sh
git clone https://github.com/muyuanjin/dsh-element-inspector.git
cd dsh-element-inspector
pnpm install
pnpm run build
dsh plugin --profile web add .
```

profile 会继续链接到该源码目录。修改客户端代码后，请重新构建浏览器 bundle 并重启 DSH。

## 使用

1. 按一次当前快捷键进入元素选择模式。
2. 移动鼠标预览元素，单击确认；按 `Esc` 可取消。
3. 查看首选插件，并展开其他候选插件的判断依据。
4. 截图、复制 HTML 或 Markdown、打开插件位置，或者隐藏该元素。
5. 快速按两次快捷键，修改快捷键或管理隐藏规则。

浏览器允许写入图片时，截图会复制到系统剪贴板；否则自动下载为 PNG。HTML 和 Markdown 会写入剪贴板。截图和格式转换均在本地完成。

## 归属判断原理

客户端从所选元素及最多七层祖先中收集稳定信号，包括 ID、class、`data-*` 属性、ARIA 标签、文本和 React owner 名称。Host 会扫描当前 DSH profile 依赖中 JavaScript、TypeScript、JSX、TSX 和 CSS 运行时文件。

唯一稳定标记和距离更近的插件边界权重更高；共享、自动生成或过于通用的标记会被降权。只有证据足够强且不存在歧义时，结果才会标记为“已确认”，否则仅作为候选。

## 隐私与权限

- 只读取当前 DSH profile 依赖中已安装插件的文本运行时文件。
- 只通过系统文件管理器打开已验证的插件安装目录；源仓库地址来自对应插件的 `package.json`。
- 将导出的 HTML、Markdown 或 PNG 写入剪贴板；截图无法写入剪贴板时仅在本地下载 PNG。
- 通过 DSH 官方设置服务保存快捷键和隐藏规则，并在浏览器本地保留启动缓存；旧版浏览器设置会在条件允许时迁移一次。
- 不上传元素、源码、截图、会话或凭据。打开源仓库时，系统浏览器会访问相应 URL。
- 不需要 API Key。

包级权限声明见 [`package.json`](package.json) 的 `disclosure` 字段。安全漏洞请按[安全策略](SECURITY.md)私下报告。

## 更新与卸载

更新 npm 安装并重启 DSH：

```sh
dsh plugin --profile web update --latest dsh-element-inspector
```

从 GitHub 安装时，请用对应的 `github:` 命令安装所需的版本标签。

卸载插件并从 profile 中移除对应 bundle 层：

```sh
dsh plugin --profile web remove dsh-element-inspector
```

插件不会修改会话、凭据或其他插件的数据。卸载前可以打开插件设置，清空全部隐藏规则。

## 开发

Host 入口为 [`index.js`](index.js)。浏览器端源码位于 [`src/client.js`](src/client.js)，并构建到 [`client.js`](client.js)。

```sh
pnpm run test
pnpm run build
```

测试覆盖归属评分、跨平台包解析、隐藏规则和元素导出辅助函数；构建命令使用 esbuild 重新生成浏览器 bundle。

## 许可证

本项目采用 [MIT License](LICENSE)。
