# dsh-element-inspector

> 非官方 DeepSeek Harness 社区项目，与 DeepSeek 官方无隶属或背书关系。

按一下 `F1`，点选页面元素，找出它属于哪个已安装插件。所选元素还可以截图、复制为 HTML 或 Markdown，或者隐藏。

![元素选择与归属识别演示](assets/dsh-element-inspector-demo.gif)

## 功能

- 元素拾取：高亮鼠标下的元素，单击后分析归属。
- 归属判断：根据运行时 DOM 标记、嵌套距离和当前 profile 的插件运行时代码建立证据，不依赖预置的第三方插件名单。
- 定位源码：展示命中的插件版本、源码文件和判断依据。
- 快速打开：直接打开已安装插件文件夹或其 `package.json` 声明的源仓库。
- 元素导出：在本地生成所选元素的 PNG 截图，复制 `outerHTML`，或转换为 GitHub Flavored Markdown。
- 元素隐藏：隐藏选中元素，并在设置中逐条或全部取消。
- 自定义快捷键：默认 `F1`；快速按两次打开设置，设置页也可重新录入快捷键。

## 界面

识别结果：

![元素归属结果](assets/dsh-element-inspector-result.png)

设置与隐藏规则：

![插件设置](assets/dsh-element-inspector-settings.png)

## 兼容性

- DeepSeek Harness：`>=0.1.0-rc.8 <0.2.0-0`
- Desktop：anywhere-labs `2.0.1-rc8.1` 已验证
- 操作系统：Windows、Linux、macOS
- 安装布局：npm/pnpm 普通安装、tgz、`file:`、`link:`、源码目录链接和 npm workspace 提升

插件通过 DSH 提供的 `ctx.baseUrl` 定位当前 profile，并沿 Node 标准模块搜索路径解析插件。它不依赖固定的用户名、用户目录、盘符、Desktop 数据目录或进程工作目录。

## 安装

推荐使用 DSH 插件命令安装发布包：

```sh
dsh plugin --profile web add ./dsh-element-inspector-0.5.0.tgz
```

从源码目录开发时可以建立链接：

```sh
dsh plugin --profile web add link:.
```

也可以在目标 DSH profile 目录中使用 npm 或 pnpm：

```sh
npm install ./dsh-element-inspector-0.5.0.tgz
# 或
pnpm add ./dsh-element-inspector-0.5.0.tgz
```

直接使用 npm/pnpm 时，确认 `dsh.profile.bundles` 包含插件名：

```json
{
  "dsh": {
    "profile": {
      "bundles": ["dsh-element-inspector"]
    }
  }
}
```

重启对应 DSH Web/Desktop 实例后按 `F1` 使用。

## 使用

1. 按一次快捷键进入拾取模式。
2. 移动鼠标预览目标范围，单击确认元素；按 `Esc` 可退出。
3. 查看首选插件和可展开的判断依据。
4. 截图、复制 HTML、复制 Markdown、打开插件位置，或隐藏该元素。
5. 快速按两次快捷键进入设置，修改快捷键并管理隐藏规则。

截图会优先写入系统剪贴板；浏览器不允许写入图片时自动下载 PNG。HTML 和 Markdown 写入系统剪贴板。截图、DOM 和转换结果均在本地处理，不会上传。

## 禁用与卸载

禁用时，从 `dsh.profile.bundles` 移除 `dsh-element-inspector` 并重启。卸载时再从 profile dependencies 中移除该包。插件不会修改会话、凭据或其他插件数据。

隐藏规则和快捷键保存在 DSH 官方设置文件的 `dsh-element-inspector` 命名空间中。卸载前可在插件设置中“全部取消隐藏”。

## 权限与隐私

- 本地读取：只扫描当前 DSH profile 的 `dependencies` 中已安装插件的文本源码，用于匹配归属。
- 本地打开：只允许打开 profile 中已安装插件的真实目录；Windows 使用系统文件管理器，macOS 使用 Launch Services，Linux 使用 XDG/GIO。源仓库地址来自对应插件的 `package.json`。
- 剪贴板与下载：HTML 和 Markdown 仅写入系统剪贴板；截图在当前页面本地渲染，并复制到剪贴板或下载为 PNG。
- 本地存储：快捷键和隐藏规则通过 DSH 官方 `settingsScope` 写入 Host 设置文档；旧版浏览器配置只做一次性迁移。
- 网络：插件不上传元素、源码、截图、会话或凭据。点击“打开源仓库”后，系统浏览器会访问相应 URL。
- API Key：不需要。

详细披露包含在 `package.json` 的 `disclosure` 字段中。

## DSH 集成

Host 入口 `index.js` 注册本机分析和打开路由，并通过 `dsh-settings` 注册持久化 schema。Web 入口通过官方 `settingsScope` 同步快捷键和隐藏规则。接口包通过 `peerDependencies` 使用，不会把 DSH runtime 打进插件包。

## 市场提交

仓库根目录包含 `package.json` 的 `dsh` 字段和 `dsh-plugin.json`。`marketplace/` 提供 dsh.pub、Awesome DSH Plugins 和 DeepSeek Harness Discussion #2004 的提交文件。

## License

[MIT](LICENSE)
