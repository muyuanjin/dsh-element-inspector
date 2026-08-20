# dsh-element-inspector

[English](README.md) | 简体中文

点选 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 界面元素，识别它来自 DSH 官方界面还是某个已安装插件，并导出或隐藏所选元素。

> [!NOTE]
> 这是非官方社区项目，与 DeepSeek 官方无隶属或背书关系。

> [!IMPORTANT]
> 归属结果来自本地证据评分检测算法，不是 DSH 或插件提供的权威归属声明。“已确认”仅表示当前证据达到算法阈值，不保证绝对正确，也不代表插件可信、安全或由某个作者签名发布。

按下 `F1`，指向元素并单击即可检查。插件会将稳定的 DOM 标记与当前运行时中 DSH 及插件模块的客户端入口文件进行比对，并展示最强候选及其判断依据。

![元素选择与归属识别演示](assets/dsh-element-inspector-demo.gif)

## 功能

- **元素拾取**：高亮鼠标下的元素，单击后分析归属。
- **基于证据的归属判断**：根据 DOM 标记、祖先距离和源码匹配区分 DSH 官方界面与已安装插件；只内置 DSH 身份，不维护插件名单。
- **源码定位**：展示命中的归属、版本、源码文件和每项判断依据。
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
3. 查看首选归属，并展开其他候选归属的判断依据。
4. 截图、复制 HTML 或 Markdown、打开命中插件的位置，或者隐藏该元素。
5. 快速按两次快捷键，修改快捷键或管理隐藏规则。

浏览器允许写入图片时，截图会复制到系统剪贴板；否则自动下载为 PNG。HTML 和 Markdown 会写入剪贴板。截图和格式转换均在本地完成。

## 归属判断原理

客户端从所选元素及最多七层祖先中收集稳定信号，包括 ID、class、`data-*` 属性、ARIA 标签、文本和 React owner 名称。对于由 DSH shell 代为渲染的设置导航等控件，算法还会沿 React key/组件与当前 Cordis slot registration 建立联系，再用实际注册组件的函数源码确认来源。Host 会解析当前浏览器 Boot module 与活动 Cordis Loader entry，并扫描可解析包声明的客户端入口文件及约定位置的客户端 CSS。

DSH 官方包会按内置身份聚合为一个宿主候选，其他活动运行时模块仍按插件包独立参与比较。浏览器 Boot entry 与活动 Cordis Loader entry 可覆盖 npm/pnpm 安装、链接、workspace、`file:` 来源，以及能解析到 package root 和客户端入口的动态加载项；已禁用、纯 Host 和检查器自身 entry 会被排除。运行时注册源码、唯一稳定标记和距离更近的归属边界权重更高；共享、自动生成或过于通用的标记会被降权。只有独占的运行时注册源码、稳定 ID/测试标记，或多个相互独立的独占标记，才会标记为“已确认”。仅命中较远的 DSH 外层容器不会判为官方，证据不足时返回候选或无法确认。

## 检测局限

- 这是启发式归属检测，不是代码签名、调用链追踪或 DSH 官方审计接口。即使显示“已确认”，插件包装、运行时改写或多个来源共同组成一个控件时仍可能归错层级。
- 只比较当前运行时中活动且能解析到本地 package root 的模块。未加载、已禁用、纯 Host、远程脚本、无法解析来源的动态代码，以及未包含在声明入口或约定 CSS 中的懒加载文件可能不会成为候选。
- 单个客户端入口文件超过 1 MB 时不会扫描。源码刚被 HMR 或外部工具替换后，短时间内也可能命中缓存中的旧内容。
- shell 代渲染控件的溯源依赖当前 DSH slots inspection API 和 React fiber/key 结构。DSH 或 React 升级后，这条证据链可能失效，算法会退回 DOM/源码标记，结果可能从“已确认”降为候选或无法确认。
- 文本、class、`data-*` 名称和函数源码都可能被多个插件复用或复制。算法会尽量保留多个候选，但不能在没有独占证据时推断真实作者。
- iframe、闭合 Shadow DOM、canvas 绘制内容和 CSS 伪元素不是当前文档中的普通可选 DOM 节点，通常只能检测其外层容器或无法检测。
- “DSH 官方界面”按内置 DSH 包名身份规则聚合，不进行发布者签名验证；本地或非标准来源若伪装成同一包名空间，可能被归入官方候选。
- 结果只描述当前页面、当前 profile 和当前激活状态。切换 profile、启停插件、升级或重建 bundle 后，同一视觉元素的候选和分数可能变化。

## 隐私与权限

- 只读取当前浏览器/Cordis 运行时中活动 DSH 及插件模块的客户端入口文件；已禁用和纯 Host entry 会被排除。
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
