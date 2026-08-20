# dsh-element-inspector｜点一下，找出界面元素属于哪个插件

> 非官方社区项目，与 DeepSeek 官方无隶属或背书关系。

项目地址：https://github.com/muyuanjin/dsh-element-inspector

dsh-element-inspector 是面向 DeepSeek Harness 的本地插件。按下 `F1` 后，鼠标会进入元素拾取模式；单击页面元素即可综合 DOM 标记、稳定类名、祖先信息和当前 profile 中的插件源码，给出插件归属与判断依据。

除了定位插件，它还可以截图、复制 HTML、复制 Markdown，或隐藏选中的界面元素；隐藏规则和可配置快捷键通过 DSH 官方 settings 服务保存在当前 profile，并可从快捷弹窗或“设置 → 插件配置”管理。识别结果支持直接打开插件安装目录或其 `package.json` 声明的源仓库。

![元素归属结果](../assets/dsh-element-inspector-result.png)

![元素拾取演示](../assets/dsh-element-inspector-demo.gif)

与 DSH 的集成方式：Host 以 `clientModules` 的当前权威图和实际已服务 bundle 为候选来源，通过 Connection 的 loopback-only RPC 执行识别与打开操作；Web client 注入拾取器、快捷弹窗和官方插件设置卡。兼容 DSH `0.1.0-rc.8`，支持 Windows、Linux、macOS，以及 npm/pnpm、tgz 和源码链接安装。
