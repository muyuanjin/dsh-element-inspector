# dsh-element-inspector

English | [简体中文](README.zh.md)

Inspect a [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) UI element, identify the installed plugin that most likely owns it, and export or hide the selection.

> [!NOTE]
> This is an unofficial community project. It is not affiliated with or endorsed by DeepSeek.

Press `F1`, point at an element, and click to inspect it. The plugin compares stable DOM markers with the runtime source files of plugins installed in the active DSH profile, then presents the strongest matches and their supporting evidence.

![Element selection and attribution demo](assets/dsh-element-inspector-demo.gif)

## Features

- **Element picker**: highlights the element under the pointer and inspects it on click.
- **Evidence-based attribution**: ranks installed plugins using DOM markers, ancestor distance, and source-code matches instead of a hard-coded plugin catalog.
- **Source discovery**: shows matching plugin versions, source files, and evidence for each result.
- **Quick navigation**: opens an installed plugin directory or the source repository declared in its `package.json`.
- **Element export**: captures a local PNG screenshot, copies `outerHTML`, or converts the selection to GitHub Flavored Markdown.
- **Persistent hiding**: hides selected elements and lets you restore individual elements or clear all hiding rules.
- **Configurable shortcut**: uses `F1` by default; press it twice quickly to open settings and record a different shortcut.

## Screenshots

| Attribution result | Settings and hidden-element rules |
| --- | --- |
| ![Element attribution result](assets/dsh-element-inspector-result.png) | ![Plugin settings](assets/dsh-element-inspector-settings.png) |

## Compatibility

| Component | Supported versions or platforms |
| --- | --- |
| DeepSeek Harness | `>=0.1.0-rc.8 <0.2.0-0` |
| DSH platforms | Web and Desktop |
| Operating systems | Windows, Linux, and macOS |

The plugin locates the active profile from the DSH-provided `ctx.baseUrl` and resolves packages through Node.js module search paths. It supports regular npm/pnpm installs, local links, and workspace-hoisted packages without assuming a fixed user directory, drive letter, Desktop data directory, or process working directory.

## Installation

An existing DeepSeek Harness installation is required. Install the plugin from GitHub into the `web` profile:

```sh
dsh plugin --profile web add github:muyuanjin/dsh-element-inspector
```

This repository includes the built runtime entry points, so the GitHub installation does not require an install-time build script. Restart the corresponding DSH Web or Desktop instance after installation. You can inspect the composed profile before starting it:

```sh
dsh --profile web --dump-config
dsh web
```

### Local Checkout

To develop from a local checkout:

```sh
git clone https://github.com/muyuanjin/dsh-element-inspector.git
cd dsh-element-inspector
pnpm install
pnpm run build
dsh plugin --profile web add .
```

The profile remains linked to the checkout. Rebuild the browser bundle and restart DSH after changing client code.

## Usage

1. Press the configured shortcut once to enter selection mode.
2. Move the pointer to preview an element, then click to inspect it. Press `Esc` to cancel.
3. Review the preferred plugin and expand the evidence for other candidates.
4. Capture a screenshot, copy HTML or Markdown, open the plugin location, or hide the element.
5. Press the shortcut twice quickly to change the shortcut or manage hidden-element rules.

Screenshots are copied to the system clipboard when the browser allows image writes; otherwise, they are downloaded as PNG files. HTML and Markdown are copied to the clipboard. All capture and conversion work happens locally.

## How Attribution Works

The client collects stable signals from the selected element and up to seven ancestors, including IDs, classes, `data-*` attributes, ARIA labels, text, and React owner names. The host scans JavaScript, TypeScript, JSX, TSX, and CSS runtime files from dependencies declared in the active DSH profile.

Unique stable markers and nearer plugin boundaries receive more weight. Shared, generated, or generic markers are discounted. A result is marked as confirmed only when the available evidence is strong and unambiguous; otherwise, it remains a candidate.

## Privacy and Permissions

- Reads text runtime files only from plugins declared as dependencies of the active DSH profile.
- Opens verified installed-plugin directories with the operating system file manager. Repository URLs come from the installed plugin's `package.json`.
- Writes exported HTML, Markdown, or PNG data to the clipboard, with a local PNG download as the screenshot fallback.
- Stores the shortcut and hiding rules through the official DSH settings service and keeps a browser-local startup cache. Legacy browser settings are migrated once when possible.
- Does not upload inspected elements, source files, screenshots, conversations, or credentials. Opening a source repository launches its URL in the system browser.
- Requires no API keys.

See the `disclosure` field in [`package.json`](package.json) for the package-level permission declaration. To report a vulnerability, follow the [security policy](SECURITY.md).

## Updating and Uninstalling

To update a GitHub installation, run the installation command again and restart DSH:

```sh
dsh plugin --profile web add github:muyuanjin/dsh-element-inspector
```

To uninstall the plugin and remove its bundle layer from the profile:

```sh
dsh plugin --profile web remove dsh-element-inspector
```

The plugin does not modify conversations, credentials, or other plugin data. Before uninstalling, you can open its settings and clear all hidden-element rules.

## Development

The host entry point is [`index.js`](index.js). Browser code lives in [`src/client.js`](src/client.js) and is bundled to [`client.js`](client.js).

```sh
pnpm run test
pnpm run build
```

The test suite covers attribution scoring, portable package resolution, hiding rules, and element export helpers. The build command regenerates the browser bundle with esbuild.

## License

Licensed under the [MIT License](LICENSE).
