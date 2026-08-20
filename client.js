(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/.pnpm/@joplin+turndown-plugin-gfm@1.0.67/node_modules/@joplin/turndown-plugin-gfm/lib/turndown-plugin-gfm.cjs.js
  var require_turndown_plugin_gfm_cjs = __commonJS({
    "node_modules/.pnpm/@joplin+turndown-plugin-gfm@1.0.67/node_modules/@joplin/turndown-plugin-gfm/lib/turndown-plugin-gfm.cjs.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var highlightRegExp = /highlight-(?:text|source)-([a-z0-9]+)/;
      function highlightedCodeBlock(turndownService) {
        turndownService.addRule("highlightedCodeBlock", {
          filter: function(node) {
            var firstChild = node.firstChild;
            return node.nodeName === "DIV" && highlightRegExp.test(node.className) && firstChild && firstChild.nodeName === "PRE";
          },
          replacement: function(content, node, options) {
            var className = node.className || "";
            var language = (className.match(highlightRegExp) || [null, ""])[1];
            return "\n\n" + options.fence + language + "\n" + node.firstChild.textContent + "\n" + options.fence + "\n\n";
          }
        });
      }
      function strikethrough(turndownService) {
        turndownService.addRule("strikethrough", {
          filter: ["del", "s", "strike"],
          replacement: function(content) {
            return "~~" + content + "~~";
          }
        });
      }
      var indexOf = Array.prototype.indexOf;
      var every = Array.prototype.every;
      var rules2 = {};
      var alignMap = { left: ":---", right: "---:", center: ":---:" };
      var isCodeBlock_ = null;
      var options_ = null;
      var tableShouldBeSkippedCache_ = /* @__PURE__ */ new WeakMap();
      function getAlignment(node) {
        return node ? (node.getAttribute("align") || node.style.textAlign || "").toLowerCase() : "";
      }
      function getBorder(alignment) {
        return alignment ? alignMap[alignment] : "---";
      }
      function getColumnAlignment(table, columnIndex) {
        var votes = {
          left: 0,
          right: 0,
          center: 0,
          "": 0
        };
        var align = "";
        for (var i = 0; i < table.rows.length; ++i) {
          var row = table.rows[i];
          if (columnIndex < row.childNodes.length) {
            var cellAlignment = getAlignment(row.childNodes[columnIndex]);
            ++votes[cellAlignment];
            if (votes[cellAlignment] > votes[align]) {
              align = cellAlignment;
            }
          }
        }
        return align;
      }
      rules2.tableCell = {
        filter: ["th", "td"],
        replacement: function(content, node) {
          if (tableShouldBeSkipped(nodeParentTable(node))) return content;
          return cell(content, node);
        }
      };
      rules2.tableRow = {
        filter: "tr",
        replacement: function(content, node) {
          const parentTable = nodeParentTable(node);
          if (tableShouldBeSkipped(parentTable)) return content;
          var borderCells = "";
          if (isHeadingRow(node)) {
            const colCount = tableColCount(parentTable);
            for (var i = 0; i < colCount; i++) {
              const childNode = i < node.childNodes.length ? node.childNodes[i] : null;
              var border = getBorder(getColumnAlignment(parentTable, i));
              borderCells += cell(border, childNode, i);
            }
          }
          return "\n" + content + (borderCells ? "\n" + borderCells : "");
        }
      };
      rules2.table = {
        filter: function(node, options) {
          return node.nodeName === "TABLE";
        },
        replacement: function(content, node) {
          if (tableShouldBeHtml(node, options_)) {
            let html = node.outerHTML;
            let divParent = nodeParentDiv(node);
            if (divParent === null || !divParent.classList.contains("joplin-table-wrapper")) {
              return `

<div class="joplin-table-wrapper">${html}</div>

`;
            } else {
              return html;
            }
          } else {
            if (tableShouldBeSkipped(node)) return content;
            content = content.replace(/\n+/g, "\n");
            var secondLine = content.trim().split("\n");
            if (secondLine.length >= 2) secondLine = secondLine[1];
            var secondLineIsDivider = /\| :?---/.test(secondLine);
            var columnCount = tableColCount(node);
            var emptyHeader = "";
            if (columnCount && !secondLineIsDivider) {
              emptyHeader = "|" + "     |".repeat(columnCount) + "\n|";
              for (var columnIndex = 0; columnIndex < columnCount; ++columnIndex) {
                emptyHeader += " " + getBorder(getColumnAlignment(node, columnIndex)) + " |";
              }
            }
            const captionNode = node.querySelector ? node.querySelector("caption") : node.caption;
            const captionContent = captionNode ? captionNode.textContent || "" : "";
            const caption = captionContent ? `${captionContent}

` : "";
            const tableContent = `${emptyHeader}${content}`.trimStart();
            return `

${caption}${tableContent}

`;
          }
        }
      };
      rules2.tableCaption = {
        filter: ["caption"],
        replacement: () => ""
      };
      rules2.tableColgroup = {
        filter: ["colgroup", "col"],
        replacement: () => ""
      };
      rules2.tableSection = {
        filter: ["thead", "tbody", "tfoot"],
        replacement: function(content) {
          return content;
        }
      };
      function isHeadingRow(tr) {
        var parentNode = tr.parentNode;
        return parentNode.nodeName === "THEAD" || parentNode.firstChild === tr && (parentNode.nodeName === "TABLE" || isFirstTbody(parentNode)) && every.call(tr.childNodes, function(n) {
          return n.nodeName === "TH";
        });
      }
      function isFirstTbody(element) {
        var previousSibling = element.previousSibling;
        return element.nodeName === "TBODY" && (!previousSibling || previousSibling.nodeName === "THEAD" && /^\s*$/i.test(previousSibling.textContent));
      }
      function cell(content, node = null, index = null) {
        if (index === null) index = indexOf.call(node.parentNode.childNodes, node);
        var prefix = " ";
        if (index === 0) prefix = "| ";
        let filteredContent = content.trim().replace(/\n\r/g, "<br>").replace(/\n/g, "<br>");
        filteredContent = filteredContent.replace(/\|+/g, "\\|");
        while (filteredContent.length < 3) filteredContent += " ";
        if (node) filteredContent = handleColSpan(filteredContent, node, " ");
        return prefix + filteredContent + " |";
      }
      function nodeContainsTable(node) {
        if (!node.childNodes) return false;
        for (let i = 0; i < node.childNodes.length; i++) {
          const child = node.childNodes[i];
          if (child.nodeName === "TABLE") return true;
          if (nodeContainsTable(child)) return true;
        }
        return false;
      }
      var nodeContains = (node, types) => {
        if (!node.childNodes) return false;
        for (let i = 0; i < node.childNodes.length; i++) {
          const child = node.childNodes[i];
          if (types === "code" && isCodeBlock_ && isCodeBlock_(child)) return true;
          if (types.includes(child.nodeName)) return true;
          if (nodeContains(child, types)) return true;
        }
        return false;
      };
      var customStyleProperties = [
        "background-color",
        "background",
        "border-color",
        "border",
        "border-top",
        "border-right",
        "border-bottom",
        "border-left",
        "border-style",
        "border-width",
        "padding",
        "padding-top",
        "padding-right",
        "padding-bottom",
        "padding-left",
        "float",
        "margin-left",
        "margin-right"
      ];
      var customAttributeNames = [
        "bgcolor",
        "bordercolor",
        "background"
      ];
      var nodeHasCustomStyle = (node) => {
        if (!node || !node.getAttribute) return false;
        const styleAttr = node.getAttribute("style");
        if (!styleAttr) return false;
        const properties = styleAttr.split(";").map((s) => s.split(":")[0].trim().toLowerCase()).filter((s) => s.length > 0);
        for (let i = 0; i < properties.length; i++) {
          if (customStyleProperties.includes(properties[i])) return true;
        }
        return false;
      };
      var hasNonDefaultSpacingAttribute = (node, name) => {
        if (!node || !node.getAttribute) return false;
        const value = node.getAttribute(name);
        if (value === null) return false;
        const normalisedValue = `${value}`.trim().toLowerCase();
        if (!normalisedValue) return false;
        if (normalisedValue === "0" || normalisedValue === "0px") return false;
        return true;
      };
      var nodeHasCustomAttributes = (node) => {
        if (!node || !node.getAttribute) return false;
        for (let i = 0; i < customAttributeNames.length; i++) {
          const value = node.getAttribute(customAttributeNames[i]);
          if (value !== null && `${value}`.trim() !== "") return true;
        }
        if (node.nodeName === "TABLE") {
          if (hasNonDefaultSpacingAttribute(node, "cellpadding")) return true;
          if (hasNonDefaultSpacingAttribute(node, "cellspacing")) return true;
        }
        return false;
      };
      var nodeHasCustomFormatting = (node) => {
        return nodeHasCustomStyle(node) || nodeHasCustomAttributes(node);
      };
      var tableHasCustomStyles = (tableNode) => {
        if (nodeHasCustomFormatting(tableNode)) return true;
        const rows = tableNode.rows;
        if (!rows) return false;
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (nodeHasCustomFormatting(row)) return true;
          for (let j = 0; j < row.childNodes.length; j++) {
            const cell2 = row.childNodes[j];
            if ((cell2.nodeName === "TD" || cell2.nodeName === "TH") && nodeHasCustomFormatting(cell2)) {
              return true;
            }
          }
        }
        return false;
      };
      var tableShouldBeHtml = (tableNode, options) => {
        const possibleTags = [
          "UL",
          "OL",
          "H1",
          "H2",
          "H3",
          "H4",
          "H5",
          "H6",
          "HR",
          "BLOCKQUOTE"
        ];
        if (options.preserveNestedTables) possibleTags.push("TABLE");
        return nodeContains(tableNode, "code") || nodeContains(tableNode, possibleTags) || options.preserveTableStyles && tableHasCustomStyles(tableNode);
      };
      function tableShouldBeSkipped(tableNode) {
        const cached = tableShouldBeSkippedCache_.get(tableNode);
        if (cached !== void 0) return cached;
        const result = tableShouldBeSkipped_(tableNode);
        tableShouldBeSkippedCache_.set(tableNode, result);
        return result;
      }
      function tableShouldBeSkipped_(tableNode) {
        if (!tableNode) return true;
        if (!tableNode.rows) return true;
        if (tableNode.rows.length === 1 && tableNode.rows[0].childNodes.length <= 1) return true;
        if (nodeContainsTable(tableNode)) return true;
        return false;
      }
      function nodeParentDiv(node) {
        let parent = node.parentNode;
        while (parent.nodeName !== "DIV") {
          parent = parent.parentNode;
          if (!parent) return null;
        }
        return parent;
      }
      function nodeParentTable(node) {
        let parent = node.parentNode;
        while (parent.nodeName !== "TABLE") {
          parent = parent.parentNode;
          if (!parent) return null;
        }
        return parent;
      }
      function handleColSpan(content, node, emptyChar) {
        const colspan = node.getAttribute("colspan") || 1;
        for (let i = 1; i < colspan; i++) {
          content += " | " + emptyChar.repeat(3);
        }
        return content;
      }
      function tableColCount(node) {
        let maxColCount = 0;
        for (let i = 0; i < node.rows.length; i++) {
          const row = node.rows[i];
          const colCount = row.childNodes.length;
          if (colCount > maxColCount) maxColCount = colCount;
        }
        return maxColCount;
      }
      function tables(turndownService) {
        isCodeBlock_ = turndownService.isCodeBlock;
        options_ = turndownService.options;
        turndownService.keep(function(node) {
          if (node.nodeName === "TABLE" && tableShouldBeHtml(node, turndownService.options)) return true;
          return false;
        });
        for (var key in rules2) turndownService.addRule(key, rules2[key]);
      }
      function taskListItems(turndownService) {
        turndownService.addRule("taskListItems", {
          filter: function(node) {
            const parent = node.parentNode;
            const grandparent = parent.parentNode;
            const grandparentIsListItem = !!grandparent && grandparent.nodeName === "LI";
            return (node.type === "checkbox" || node.getAttribute("role") === "checkbox") && (parent.nodeName === "LI" || parent.nodeName === "LABEL" && grandparentIsListItem || parent.nodeName === "SPAN" && grandparentIsListItem);
          },
          replacement: function(content, node) {
            const checked = node.nodeName === "INPUT" ? node.checked : node.getAttribute("aria-checked") === "true";
            return (checked ? "[x]" : "[ ]") + " ";
          }
        });
      }
      function gfm2(turndownService) {
        turndownService.use([
          highlightedCodeBlock,
          strikethrough,
          tables,
          taskListItems
        ]);
      }
      exports.gfm = gfm2;
      exports.highlightedCodeBlock = highlightedCodeBlock;
      exports.strikethrough = strikethrough;
      exports.tables = tables;
      exports.taskListItems = taskListItems;
    }
  });

  // node_modules/.pnpm/html-to-image@1.11.13/node_modules/html-to-image/es/util.js
  function resolveUrl(url, baseUrl) {
    if (url.match(/^[a-z]+:\/\//i)) {
      return url;
    }
    if (url.match(/^\/\//)) {
      return window.location.protocol + url;
    }
    if (url.match(/^[a-z]+:/i)) {
      return url;
    }
    const doc = document.implementation.createHTMLDocument();
    const base = doc.createElement("base");
    const a = doc.createElement("a");
    doc.head.appendChild(base);
    doc.body.appendChild(a);
    if (baseUrl) {
      base.href = baseUrl;
    }
    a.href = url;
    return a.href;
  }
  var uuid = /* @__PURE__ */ (() => {
    let counter = 0;
    const random = () => (
      // eslint-disable-next-line no-bitwise
      `0000${(Math.random() * 36 ** 4 << 0).toString(36)}`.slice(-4)
    );
    return () => {
      counter += 1;
      return `u${random()}${counter}`;
    };
  })();
  function toArray(arrayLike) {
    const arr = [];
    for (let i = 0, l = arrayLike.length; i < l; i++) {
      arr.push(arrayLike[i]);
    }
    return arr;
  }
  var styleProps = null;
  function getStyleProperties(options = {}) {
    if (styleProps) {
      return styleProps;
    }
    if (options.includeStyleProperties) {
      styleProps = options.includeStyleProperties;
      return styleProps;
    }
    styleProps = toArray(window.getComputedStyle(document.documentElement));
    return styleProps;
  }
  function px(node, styleProperty) {
    const win = node.ownerDocument.defaultView || window;
    const val = win.getComputedStyle(node).getPropertyValue(styleProperty);
    return val ? parseFloat(val.replace("px", "")) : 0;
  }
  function getNodeWidth(node) {
    const leftBorder = px(node, "border-left-width");
    const rightBorder = px(node, "border-right-width");
    return node.clientWidth + leftBorder + rightBorder;
  }
  function getNodeHeight(node) {
    const topBorder = px(node, "border-top-width");
    const bottomBorder = px(node, "border-bottom-width");
    return node.clientHeight + topBorder + bottomBorder;
  }
  function getImageSize(targetNode, options = {}) {
    const width = options.width || getNodeWidth(targetNode);
    const height = options.height || getNodeHeight(targetNode);
    return { width, height };
  }
  function getPixelRatio() {
    let ratio;
    let FINAL_PROCESS;
    try {
      FINAL_PROCESS = process;
    } catch (e) {
    }
    const val = FINAL_PROCESS && FINAL_PROCESS.env ? FINAL_PROCESS.env.devicePixelRatio : null;
    if (val) {
      ratio = parseInt(val, 10);
      if (Number.isNaN(ratio)) {
        ratio = 1;
      }
    }
    return ratio || window.devicePixelRatio || 1;
  }
  var canvasDimensionLimit = 16384;
  function checkCanvasDimensions(canvas) {
    if (canvas.width > canvasDimensionLimit || canvas.height > canvasDimensionLimit) {
      if (canvas.width > canvasDimensionLimit && canvas.height > canvasDimensionLimit) {
        if (canvas.width > canvas.height) {
          canvas.height *= canvasDimensionLimit / canvas.width;
          canvas.width = canvasDimensionLimit;
        } else {
          canvas.width *= canvasDimensionLimit / canvas.height;
          canvas.height = canvasDimensionLimit;
        }
      } else if (canvas.width > canvasDimensionLimit) {
        canvas.height *= canvasDimensionLimit / canvas.width;
        canvas.width = canvasDimensionLimit;
      } else {
        canvas.width *= canvasDimensionLimit / canvas.height;
        canvas.height = canvasDimensionLimit;
      }
    }
  }
  function canvasToBlob(canvas, options = {}) {
    if (canvas.toBlob) {
      return new Promise((resolve) => {
        canvas.toBlob(resolve, options.type ? options.type : "image/png", options.quality ? options.quality : 1);
      });
    }
    return new Promise((resolve) => {
      const binaryString = window.atob(canvas.toDataURL(options.type ? options.type : void 0, options.quality ? options.quality : void 0).split(",")[1]);
      const len = binaryString.length;
      const binaryArray = new Uint8Array(len);
      for (let i = 0; i < len; i += 1) {
        binaryArray[i] = binaryString.charCodeAt(i);
      }
      resolve(new Blob([binaryArray], {
        type: options.type ? options.type : "image/png"
      }));
    });
  }
  function createImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        img.decode().then(() => {
          requestAnimationFrame(() => resolve(img));
        });
      };
      img.onerror = reject;
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.src = url;
    });
  }
  async function svgToDataURL(svg) {
    return Promise.resolve().then(() => new XMLSerializer().serializeToString(svg)).then(encodeURIComponent).then((html) => `data:image/svg+xml;charset=utf-8,${html}`);
  }
  async function nodeToDataURL(node, width, height) {
    const xmlns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(xmlns, "svg");
    const foreignObject = document.createElementNS(xmlns, "foreignObject");
    svg.setAttribute("width", `${width}`);
    svg.setAttribute("height", `${height}`);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    foreignObject.setAttribute("width", "100%");
    foreignObject.setAttribute("height", "100%");
    foreignObject.setAttribute("x", "0");
    foreignObject.setAttribute("y", "0");
    foreignObject.setAttribute("externalResourcesRequired", "true");
    svg.appendChild(foreignObject);
    foreignObject.appendChild(node);
    return svgToDataURL(svg);
  }
  var isInstanceOfElement = (node, instance) => {
    if (node instanceof instance)
      return true;
    const nodePrototype = Object.getPrototypeOf(node);
    if (nodePrototype === null)
      return false;
    return nodePrototype.constructor.name === instance.name || isInstanceOfElement(nodePrototype, instance);
  };

  // node_modules/.pnpm/html-to-image@1.11.13/node_modules/html-to-image/es/clone-pseudos.js
  function formatCSSText(style) {
    const content = style.getPropertyValue("content");
    return `${style.cssText} content: '${content.replace(/'|"/g, "")}';`;
  }
  function formatCSSProperties(style, options) {
    return getStyleProperties(options).map((name) => {
      const value = style.getPropertyValue(name);
      const priority = style.getPropertyPriority(name);
      return `${name}: ${value}${priority ? " !important" : ""};`;
    }).join(" ");
  }
  function getPseudoElementStyle(className, pseudo, style, options) {
    const selector = `.${className}:${pseudo}`;
    const cssText = style.cssText ? formatCSSText(style) : formatCSSProperties(style, options);
    return document.createTextNode(`${selector}{${cssText}}`);
  }
  function clonePseudoElement(nativeNode, clonedNode, pseudo, options) {
    const style = window.getComputedStyle(nativeNode, pseudo);
    const content = style.getPropertyValue("content");
    if (content === "" || content === "none") {
      return;
    }
    const className = uuid();
    try {
      clonedNode.className = `${clonedNode.className} ${className}`;
    } catch (err) {
      return;
    }
    const styleElement = document.createElement("style");
    styleElement.appendChild(getPseudoElementStyle(className, pseudo, style, options));
    clonedNode.appendChild(styleElement);
  }
  function clonePseudoElements(nativeNode, clonedNode, options) {
    clonePseudoElement(nativeNode, clonedNode, ":before", options);
    clonePseudoElement(nativeNode, clonedNode, ":after", options);
  }

  // node_modules/.pnpm/html-to-image@1.11.13/node_modules/html-to-image/es/mimes.js
  var WOFF = "application/font-woff";
  var JPEG = "image/jpeg";
  var mimes = {
    woff: WOFF,
    woff2: WOFF,
    ttf: "application/font-truetype",
    eot: "application/vnd.ms-fontobject",
    png: "image/png",
    jpg: JPEG,
    jpeg: JPEG,
    gif: "image/gif",
    tiff: "image/tiff",
    svg: "image/svg+xml",
    webp: "image/webp"
  };
  function getExtension(url) {
    const match = /\.([^./]*?)$/g.exec(url);
    return match ? match[1] : "";
  }
  function getMimeType(url) {
    const extension = getExtension(url).toLowerCase();
    return mimes[extension] || "";
  }

  // node_modules/.pnpm/html-to-image@1.11.13/node_modules/html-to-image/es/dataurl.js
  function getContentFromDataUrl(dataURL) {
    return dataURL.split(/,/)[1];
  }
  function isDataUrl(url) {
    return url.search(/^(data:)/) !== -1;
  }
  function makeDataUrl(content, mimeType) {
    return `data:${mimeType};base64,${content}`;
  }
  async function fetchAsDataURL(url, init, process3) {
    const res = await fetch(url, init);
    if (res.status === 404) {
      throw new Error(`Resource "${res.url}" not found`);
    }
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onloadend = () => {
        try {
          resolve(process3({ res, result: reader.result }));
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsDataURL(blob);
    });
  }
  var cache = {};
  function getCacheKey(url, contentType, includeQueryParams) {
    let key = url.replace(/\?.*/, "");
    if (includeQueryParams) {
      key = url;
    }
    if (/ttf|otf|eot|woff2?/i.test(key)) {
      key = key.replace(/.*\//, "");
    }
    return contentType ? `[${contentType}]${key}` : key;
  }
  async function resourceToDataURL(resourceUrl, contentType, options) {
    const cacheKey = getCacheKey(resourceUrl, contentType, options.includeQueryParams);
    if (cache[cacheKey] != null) {
      return cache[cacheKey];
    }
    if (options.cacheBust) {
      resourceUrl += (/\?/.test(resourceUrl) ? "&" : "?") + (/* @__PURE__ */ new Date()).getTime();
    }
    let dataURL;
    try {
      const content = await fetchAsDataURL(resourceUrl, options.fetchRequestInit, ({ res, result }) => {
        if (!contentType) {
          contentType = res.headers.get("Content-Type") || "";
        }
        return getContentFromDataUrl(result);
      });
      dataURL = makeDataUrl(content, contentType);
    } catch (error) {
      dataURL = options.imagePlaceholder || "";
      let msg = `Failed to fetch resource: ${resourceUrl}`;
      if (error) {
        msg = typeof error === "string" ? error : error.message;
      }
      if (msg) {
        console.warn(msg);
      }
    }
    cache[cacheKey] = dataURL;
    return dataURL;
  }

  // node_modules/.pnpm/html-to-image@1.11.13/node_modules/html-to-image/es/clone-node.js
  async function cloneCanvasElement(canvas) {
    const dataURL = canvas.toDataURL();
    if (dataURL === "data:,") {
      return canvas.cloneNode(false);
    }
    return createImage(dataURL);
  }
  async function cloneVideoElement(video, options) {
    if (video.currentSrc) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;
      ctx === null || ctx === void 0 ? void 0 : ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataURL2 = canvas.toDataURL();
      return createImage(dataURL2);
    }
    const poster = video.poster;
    const contentType = getMimeType(poster);
    const dataURL = await resourceToDataURL(poster, contentType, options);
    return createImage(dataURL);
  }
  async function cloneIFrameElement(iframe, options) {
    var _a;
    try {
      if ((_a = iframe === null || iframe === void 0 ? void 0 : iframe.contentDocument) === null || _a === void 0 ? void 0 : _a.body) {
        return await cloneNode(iframe.contentDocument.body, options, true);
      }
    } catch (_b) {
    }
    return iframe.cloneNode(false);
  }
  async function cloneSingleNode(node, options) {
    if (isInstanceOfElement(node, HTMLCanvasElement)) {
      return cloneCanvasElement(node);
    }
    if (isInstanceOfElement(node, HTMLVideoElement)) {
      return cloneVideoElement(node, options);
    }
    if (isInstanceOfElement(node, HTMLIFrameElement)) {
      return cloneIFrameElement(node, options);
    }
    return node.cloneNode(isSVGElement(node));
  }
  var isSlotElement = (node) => node.tagName != null && node.tagName.toUpperCase() === "SLOT";
  var isSVGElement = (node) => node.tagName != null && node.tagName.toUpperCase() === "SVG";
  async function cloneChildren(nativeNode, clonedNode, options) {
    var _a, _b;
    if (isSVGElement(clonedNode)) {
      return clonedNode;
    }
    let children = [];
    if (isSlotElement(nativeNode) && nativeNode.assignedNodes) {
      children = toArray(nativeNode.assignedNodes());
    } else if (isInstanceOfElement(nativeNode, HTMLIFrameElement) && ((_a = nativeNode.contentDocument) === null || _a === void 0 ? void 0 : _a.body)) {
      children = toArray(nativeNode.contentDocument.body.childNodes);
    } else {
      children = toArray(((_b = nativeNode.shadowRoot) !== null && _b !== void 0 ? _b : nativeNode).childNodes);
    }
    if (children.length === 0 || isInstanceOfElement(nativeNode, HTMLVideoElement)) {
      return clonedNode;
    }
    await children.reduce((deferred, child) => deferred.then(() => cloneNode(child, options)).then((clonedChild) => {
      if (clonedChild) {
        clonedNode.appendChild(clonedChild);
      }
    }), Promise.resolve());
    return clonedNode;
  }
  function cloneCSSStyle(nativeNode, clonedNode, options) {
    const targetStyle = clonedNode.style;
    if (!targetStyle) {
      return;
    }
    const sourceStyle = window.getComputedStyle(nativeNode);
    if (sourceStyle.cssText) {
      targetStyle.cssText = sourceStyle.cssText;
      targetStyle.transformOrigin = sourceStyle.transformOrigin;
    } else {
      getStyleProperties(options).forEach((name) => {
        let value = sourceStyle.getPropertyValue(name);
        if (name === "font-size" && value.endsWith("px")) {
          const reducedFont = Math.floor(parseFloat(value.substring(0, value.length - 2))) - 0.1;
          value = `${reducedFont}px`;
        }
        if (isInstanceOfElement(nativeNode, HTMLIFrameElement) && name === "display" && value === "inline") {
          value = "block";
        }
        if (name === "d" && clonedNode.getAttribute("d")) {
          value = `path(${clonedNode.getAttribute("d")})`;
        }
        targetStyle.setProperty(name, value, sourceStyle.getPropertyPriority(name));
      });
    }
  }
  function cloneInputValue(nativeNode, clonedNode) {
    if (isInstanceOfElement(nativeNode, HTMLTextAreaElement)) {
      clonedNode.innerHTML = nativeNode.value;
    }
    if (isInstanceOfElement(nativeNode, HTMLInputElement)) {
      clonedNode.setAttribute("value", nativeNode.value);
    }
  }
  function cloneSelectValue(nativeNode, clonedNode) {
    if (isInstanceOfElement(nativeNode, HTMLSelectElement)) {
      const clonedSelect = clonedNode;
      const selectedOption = Array.from(clonedSelect.children).find((child) => nativeNode.value === child.getAttribute("value"));
      if (selectedOption) {
        selectedOption.setAttribute("selected", "");
      }
    }
  }
  function decorate(nativeNode, clonedNode, options) {
    if (isInstanceOfElement(clonedNode, Element)) {
      cloneCSSStyle(nativeNode, clonedNode, options);
      clonePseudoElements(nativeNode, clonedNode, options);
      cloneInputValue(nativeNode, clonedNode);
      cloneSelectValue(nativeNode, clonedNode);
    }
    return clonedNode;
  }
  async function ensureSVGSymbols(clone, options) {
    const uses = clone.querySelectorAll ? clone.querySelectorAll("use") : [];
    if (uses.length === 0) {
      return clone;
    }
    const processedDefs = {};
    for (let i = 0; i < uses.length; i++) {
      const use = uses[i];
      const id = use.getAttribute("xlink:href");
      if (id) {
        const exist = clone.querySelector(id);
        const definition = document.querySelector(id);
        if (!exist && definition && !processedDefs[id]) {
          processedDefs[id] = await cloneNode(definition, options, true);
        }
      }
    }
    const nodes = Object.values(processedDefs);
    if (nodes.length) {
      const ns = "http://www.w3.org/1999/xhtml";
      const svg = document.createElementNS(ns, "svg");
      svg.setAttribute("xmlns", ns);
      svg.style.position = "absolute";
      svg.style.width = "0";
      svg.style.height = "0";
      svg.style.overflow = "hidden";
      svg.style.display = "none";
      const defs = document.createElementNS(ns, "defs");
      svg.appendChild(defs);
      for (let i = 0; i < nodes.length; i++) {
        defs.appendChild(nodes[i]);
      }
      clone.appendChild(svg);
    }
    return clone;
  }
  async function cloneNode(node, options, isRoot) {
    if (!isRoot && options.filter && !options.filter(node)) {
      return null;
    }
    return Promise.resolve(node).then((clonedNode) => cloneSingleNode(clonedNode, options)).then((clonedNode) => cloneChildren(node, clonedNode, options)).then((clonedNode) => decorate(node, clonedNode, options)).then((clonedNode) => ensureSVGSymbols(clonedNode, options));
  }

  // node_modules/.pnpm/html-to-image@1.11.13/node_modules/html-to-image/es/embed-resources.js
  var URL_REGEX = /url\((['"]?)([^'"]+?)\1\)/g;
  var URL_WITH_FORMAT_REGEX = /url\([^)]+\)\s*format\((["']?)([^"']+)\1\)/g;
  var FONT_SRC_REGEX = /src:\s*(?:url\([^)]+\)\s*format\([^)]+\)[,;]\s*)+/g;
  function toRegex(url) {
    const escaped = url.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
    return new RegExp(`(url\\(['"]?)(${escaped})(['"]?\\))`, "g");
  }
  function parseURLs(cssText) {
    const urls = [];
    cssText.replace(URL_REGEX, (raw, quotation, url) => {
      urls.push(url);
      return raw;
    });
    return urls.filter((url) => !isDataUrl(url));
  }
  async function embed(cssText, resourceURL, baseURL, options, getContentFromUrl) {
    try {
      const resolvedURL = baseURL ? resolveUrl(resourceURL, baseURL) : resourceURL;
      const contentType = getMimeType(resourceURL);
      let dataURL;
      if (getContentFromUrl) {
        const content = await getContentFromUrl(resolvedURL);
        dataURL = makeDataUrl(content, contentType);
      } else {
        dataURL = await resourceToDataURL(resolvedURL, contentType, options);
      }
      return cssText.replace(toRegex(resourceURL), `$1${dataURL}$3`);
    } catch (error) {
    }
    return cssText;
  }
  function filterPreferredFontFormat(str, { preferredFontFormat }) {
    return !preferredFontFormat ? str : str.replace(FONT_SRC_REGEX, (match) => {
      while (true) {
        const [src, , format] = URL_WITH_FORMAT_REGEX.exec(match) || [];
        if (!format) {
          return "";
        }
        if (format === preferredFontFormat) {
          return `src: ${src};`;
        }
      }
    });
  }
  function shouldEmbed(url) {
    return url.search(URL_REGEX) !== -1;
  }
  async function embedResources(cssText, baseUrl, options) {
    if (!shouldEmbed(cssText)) {
      return cssText;
    }
    const filteredCSSText = filterPreferredFontFormat(cssText, options);
    const urls = parseURLs(filteredCSSText);
    return urls.reduce((deferred, url) => deferred.then((css) => embed(css, url, baseUrl, options)), Promise.resolve(filteredCSSText));
  }

  // node_modules/.pnpm/html-to-image@1.11.13/node_modules/html-to-image/es/embed-images.js
  async function embedProp(propName, node, options) {
    var _a;
    const propValue = (_a = node.style) === null || _a === void 0 ? void 0 : _a.getPropertyValue(propName);
    if (propValue) {
      const cssString = await embedResources(propValue, null, options);
      node.style.setProperty(propName, cssString, node.style.getPropertyPriority(propName));
      return true;
    }
    return false;
  }
  async function embedBackground(clonedNode, options) {
    ;
    await embedProp("background", clonedNode, options) || await embedProp("background-image", clonedNode, options);
    await embedProp("mask", clonedNode, options) || await embedProp("-webkit-mask", clonedNode, options) || await embedProp("mask-image", clonedNode, options) || await embedProp("-webkit-mask-image", clonedNode, options);
  }
  async function embedImageNode(clonedNode, options) {
    const isImageElement = isInstanceOfElement(clonedNode, HTMLImageElement);
    if (!(isImageElement && !isDataUrl(clonedNode.src)) && !(isInstanceOfElement(clonedNode, SVGImageElement) && !isDataUrl(clonedNode.href.baseVal))) {
      return;
    }
    const url = isImageElement ? clonedNode.src : clonedNode.href.baseVal;
    const dataURL = await resourceToDataURL(url, getMimeType(url), options);
    await new Promise((resolve, reject) => {
      clonedNode.onload = resolve;
      clonedNode.onerror = options.onImageErrorHandler ? (...attributes) => {
        try {
          resolve(options.onImageErrorHandler(...attributes));
        } catch (error) {
          reject(error);
        }
      } : reject;
      const image = clonedNode;
      if (image.decode) {
        image.decode = resolve;
      }
      if (image.loading === "lazy") {
        image.loading = "eager";
      }
      if (isImageElement) {
        clonedNode.srcset = "";
        clonedNode.src = dataURL;
      } else {
        clonedNode.href.baseVal = dataURL;
      }
    });
  }
  async function embedChildren(clonedNode, options) {
    const children = toArray(clonedNode.childNodes);
    const deferreds = children.map((child) => embedImages(child, options));
    await Promise.all(deferreds).then(() => clonedNode);
  }
  async function embedImages(clonedNode, options) {
    if (isInstanceOfElement(clonedNode, Element)) {
      await embedBackground(clonedNode, options);
      await embedImageNode(clonedNode, options);
      await embedChildren(clonedNode, options);
    }
  }

  // node_modules/.pnpm/html-to-image@1.11.13/node_modules/html-to-image/es/apply-style.js
  function applyStyle(node, options) {
    const { style } = node;
    if (options.backgroundColor) {
      style.backgroundColor = options.backgroundColor;
    }
    if (options.width) {
      style.width = `${options.width}px`;
    }
    if (options.height) {
      style.height = `${options.height}px`;
    }
    const manual = options.style;
    if (manual != null) {
      Object.keys(manual).forEach((key) => {
        style[key] = manual[key];
      });
    }
    return node;
  }

  // node_modules/.pnpm/html-to-image@1.11.13/node_modules/html-to-image/es/embed-webfonts.js
  var cssFetchCache = {};
  async function fetchCSS(url) {
    let cache2 = cssFetchCache[url];
    if (cache2 != null) {
      return cache2;
    }
    const res = await fetch(url);
    const cssText = await res.text();
    cache2 = { url, cssText };
    cssFetchCache[url] = cache2;
    return cache2;
  }
  async function embedFonts(data, options) {
    let cssText = data.cssText;
    const regexUrl = /url\(["']?([^"')]+)["']?\)/g;
    const fontLocs = cssText.match(/url\([^)]+\)/g) || [];
    const loadFonts = fontLocs.map(async (loc) => {
      let url = loc.replace(regexUrl, "$1");
      if (!url.startsWith("https://")) {
        url = new URL(url, data.url).href;
      }
      return fetchAsDataURL(url, options.fetchRequestInit, ({ result }) => {
        cssText = cssText.replace(loc, `url(${result})`);
        return [loc, result];
      });
    });
    return Promise.all(loadFonts).then(() => cssText);
  }
  function parseCSS(source) {
    if (source == null) {
      return [];
    }
    const result = [];
    const commentsRegex = /(\/\*[\s\S]*?\*\/)/gi;
    let cssText = source.replace(commentsRegex, "");
    const keyframesRegex = new RegExp("((@.*?keyframes [\\s\\S]*?){([\\s\\S]*?}\\s*?)})", "gi");
    while (true) {
      const matches = keyframesRegex.exec(cssText);
      if (matches === null) {
        break;
      }
      result.push(matches[0]);
    }
    cssText = cssText.replace(keyframesRegex, "");
    const importRegex = /@import[\s\S]*?url\([^)]*\)[\s\S]*?;/gi;
    const combinedCSSRegex = "((\\s*?(?:\\/\\*[\\s\\S]*?\\*\\/)?\\s*?@media[\\s\\S]*?){([\\s\\S]*?)}\\s*?})|(([\\s\\S]*?){([\\s\\S]*?)})";
    const unifiedRegex = new RegExp(combinedCSSRegex, "gi");
    while (true) {
      let matches = importRegex.exec(cssText);
      if (matches === null) {
        matches = unifiedRegex.exec(cssText);
        if (matches === null) {
          break;
        } else {
          importRegex.lastIndex = unifiedRegex.lastIndex;
        }
      } else {
        unifiedRegex.lastIndex = importRegex.lastIndex;
      }
      result.push(matches[0]);
    }
    return result;
  }
  async function getCSSRules(styleSheets, options) {
    const ret = [];
    const deferreds = [];
    styleSheets.forEach((sheet) => {
      if ("cssRules" in sheet) {
        try {
          toArray(sheet.cssRules || []).forEach((item, index) => {
            if (item.type === CSSRule.IMPORT_RULE) {
              let importIndex = index + 1;
              const url = item.href;
              const deferred = fetchCSS(url).then((metadata) => embedFonts(metadata, options)).then((cssText) => parseCSS(cssText).forEach((rule) => {
                try {
                  sheet.insertRule(rule, rule.startsWith("@import") ? importIndex += 1 : sheet.cssRules.length);
                } catch (error) {
                  console.error("Error inserting rule from remote css", {
                    rule,
                    error
                  });
                }
              })).catch((e) => {
                console.error("Error loading remote css", e.toString());
              });
              deferreds.push(deferred);
            }
          });
        } catch (e) {
          const inline = styleSheets.find((a) => a.href == null) || document.styleSheets[0];
          if (sheet.href != null) {
            deferreds.push(fetchCSS(sheet.href).then((metadata) => embedFonts(metadata, options)).then((cssText) => parseCSS(cssText).forEach((rule) => {
              inline.insertRule(rule, inline.cssRules.length);
            })).catch((err) => {
              console.error("Error loading remote stylesheet", err);
            }));
          }
          console.error("Error inlining remote css file", e);
        }
      }
    });
    return Promise.all(deferreds).then(() => {
      styleSheets.forEach((sheet) => {
        if ("cssRules" in sheet) {
          try {
            toArray(sheet.cssRules || []).forEach((item) => {
              ret.push(item);
            });
          } catch (e) {
            console.error(`Error while reading CSS rules from ${sheet.href}`, e);
          }
        }
      });
      return ret;
    });
  }
  function getWebFontRules(cssRules) {
    return cssRules.filter((rule) => rule.type === CSSRule.FONT_FACE_RULE).filter((rule) => shouldEmbed(rule.style.getPropertyValue("src")));
  }
  async function parseWebFontRules(node, options) {
    if (node.ownerDocument == null) {
      throw new Error("Provided element is not within a Document");
    }
    const styleSheets = toArray(node.ownerDocument.styleSheets);
    const cssRules = await getCSSRules(styleSheets, options);
    return getWebFontRules(cssRules);
  }
  function normalizeFontFamily(font) {
    return font.trim().replace(/["']/g, "");
  }
  function getUsedFonts(node) {
    const fonts = /* @__PURE__ */ new Set();
    function traverse(node2) {
      const fontFamily = node2.style.fontFamily || getComputedStyle(node2).fontFamily;
      fontFamily.split(",").forEach((font) => {
        fonts.add(normalizeFontFamily(font));
      });
      Array.from(node2.children).forEach((child) => {
        if (child instanceof HTMLElement) {
          traverse(child);
        }
      });
    }
    traverse(node);
    return fonts;
  }
  async function getWebFontCSS(node, options) {
    const rules2 = await parseWebFontRules(node, options);
    const usedFonts = getUsedFonts(node);
    const cssTexts = await Promise.all(rules2.filter((rule) => usedFonts.has(normalizeFontFamily(rule.style.fontFamily))).map((rule) => {
      const baseUrl = rule.parentStyleSheet ? rule.parentStyleSheet.href : null;
      return embedResources(rule.cssText, baseUrl, options);
    }));
    return cssTexts.join("\n");
  }
  async function embedWebFonts(clonedNode, options) {
    const cssText = options.fontEmbedCSS != null ? options.fontEmbedCSS : options.skipFonts ? null : await getWebFontCSS(clonedNode, options);
    if (cssText) {
      const styleNode = document.createElement("style");
      const sytleContent = document.createTextNode(cssText);
      styleNode.appendChild(sytleContent);
      if (clonedNode.firstChild) {
        clonedNode.insertBefore(styleNode, clonedNode.firstChild);
      } else {
        clonedNode.appendChild(styleNode);
      }
    }
  }

  // node_modules/.pnpm/html-to-image@1.11.13/node_modules/html-to-image/es/index.js
  async function toSvg(node, options = {}) {
    const { width, height } = getImageSize(node, options);
    const clonedNode = await cloneNode(node, options, true);
    await embedWebFonts(clonedNode, options);
    await embedImages(clonedNode, options);
    applyStyle(clonedNode, options);
    const datauri = await nodeToDataURL(clonedNode, width, height);
    return datauri;
  }
  async function toCanvas(node, options = {}) {
    const { width, height } = getImageSize(node, options);
    const svg = await toSvg(node, options);
    const img = await createImage(svg);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const ratio = options.pixelRatio || getPixelRatio();
    const canvasWidth = options.canvasWidth || width;
    const canvasHeight = options.canvasHeight || height;
    canvas.width = canvasWidth * ratio;
    canvas.height = canvasHeight * ratio;
    if (!options.skipAutoScale) {
      checkCanvasDimensions(canvas);
    }
    canvas.style.width = `${canvasWidth}`;
    canvas.style.height = `${canvasHeight}`;
    if (options.backgroundColor) {
      context.fillStyle = options.backgroundColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  }
  async function toBlob(node, options = {}) {
    const canvas = await toCanvas(node, options);
    const blob = await canvasToBlob(canvas);
    return blob;
  }

  // node_modules/.pnpm/turndown@7.2.4/node_modules/turndown/lib/turndown.browser.es.js
  function extend(destination) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) destination[key] = source[key];
      }
    }
    return destination;
  }
  function repeat(character, count) {
    return Array(count + 1).join(character);
  }
  function trimLeadingNewlines(string) {
    return string.replace(/^\n*/, "");
  }
  function trimTrailingNewlines(string) {
    var indexEnd = string.length;
    while (indexEnd > 0 && string[indexEnd - 1] === "\n") indexEnd--;
    return string.substring(0, indexEnd);
  }
  function trimNewlines(string) {
    return trimTrailingNewlines(trimLeadingNewlines(string));
  }
  var blockElements = ["ADDRESS", "ARTICLE", "ASIDE", "AUDIO", "BLOCKQUOTE", "BODY", "CANVAS", "CENTER", "DD", "DIR", "DIV", "DL", "DT", "FIELDSET", "FIGCAPTION", "FIGURE", "FOOTER", "FORM", "FRAMESET", "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HGROUP", "HR", "HTML", "ISINDEX", "LI", "MAIN", "MENU", "NAV", "NOFRAMES", "NOSCRIPT", "OL", "OUTPUT", "P", "PRE", "SECTION", "TABLE", "TBODY", "TD", "TFOOT", "TH", "THEAD", "TR", "UL"];
  function isBlock(node) {
    return is(node, blockElements);
  }
  var voidElements = ["AREA", "BASE", "BR", "COL", "COMMAND", "EMBED", "HR", "IMG", "INPUT", "KEYGEN", "LINK", "META", "PARAM", "SOURCE", "TRACK", "WBR"];
  function isVoid(node) {
    return is(node, voidElements);
  }
  function hasVoid(node) {
    return has(node, voidElements);
  }
  var meaningfulWhenBlankElements = ["A", "TABLE", "THEAD", "TBODY", "TFOOT", "TH", "TD", "IFRAME", "SCRIPT", "AUDIO", "VIDEO"];
  function isMeaningfulWhenBlank(node) {
    return is(node, meaningfulWhenBlankElements);
  }
  function hasMeaningfulWhenBlank(node) {
    return has(node, meaningfulWhenBlankElements);
  }
  function is(node, tagNames) {
    return tagNames.indexOf(node.nodeName) >= 0;
  }
  function has(node, tagNames) {
    return node.getElementsByTagName && tagNames.some(function(tagName) {
      return node.getElementsByTagName(tagName).length;
    });
  }
  var markdownEscapes = [[/\\/g, "\\\\"], [/\*/g, "\\*"], [/^-/g, "\\-"], [/^\+ /g, "\\+ "], [/^(=+)/g, "\\$1"], [/^(#{1,6}) /g, "\\$1 "], [/`/g, "\\`"], [/^~~~/g, "\\~~~"], [/\[/g, "\\["], [/\]/g, "\\]"], [/^>/g, "\\>"], [/_/g, "\\_"], [/^(\d+)\. /g, "$1\\. "]];
  function escapeMarkdown(string) {
    return markdownEscapes.reduce(function(accumulator, escape) {
      return accumulator.replace(escape[0], escape[1]);
    }, string);
  }
  var rules = {};
  rules.paragraph = {
    filter: "p",
    replacement: function(content) {
      return "\n\n" + content + "\n\n";
    }
  };
  rules.lineBreak = {
    filter: "br",
    replacement: function(content, node, options) {
      return options.br + "\n";
    }
  };
  rules.heading = {
    filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
    replacement: function(content, node, options) {
      var hLevel = Number(node.nodeName.charAt(1));
      if (options.headingStyle === "setext" && hLevel < 3) {
        var underline = repeat(hLevel === 1 ? "=" : "-", content.length);
        return "\n\n" + content + "\n" + underline + "\n\n";
      } else {
        return "\n\n" + repeat("#", hLevel) + " " + content + "\n\n";
      }
    }
  };
  rules.blockquote = {
    filter: "blockquote",
    replacement: function(content) {
      content = trimNewlines(content).replace(/^/gm, "> ");
      return "\n\n" + content + "\n\n";
    }
  };
  rules.list = {
    filter: ["ul", "ol"],
    replacement: function(content, node) {
      var parent = node.parentNode;
      if (parent.nodeName === "LI" && parent.lastElementChild === node) {
        return "\n" + content;
      } else {
        return "\n\n" + content + "\n\n";
      }
    }
  };
  rules.listItem = {
    filter: "li",
    replacement: function(content, node, options) {
      var prefix = options.bulletListMarker + "   ";
      var parent = node.parentNode;
      if (parent.nodeName === "OL") {
        var start = parent.getAttribute("start");
        var index = Array.prototype.indexOf.call(parent.children, node);
        prefix = (start ? Number(start) + index : index + 1) + ".  ";
      }
      var isParagraph = /\n$/.test(content);
      content = trimNewlines(content) + (isParagraph ? "\n" : "");
      content = content.replace(/\n/gm, "\n" + " ".repeat(prefix.length));
      return prefix + content + (node.nextSibling ? "\n" : "");
    }
  };
  rules.indentedCodeBlock = {
    filter: function(node, options) {
      return options.codeBlockStyle === "indented" && node.nodeName === "PRE" && node.firstChild && node.firstChild.nodeName === "CODE";
    },
    replacement: function(content, node, options) {
      return "\n\n    " + node.firstChild.textContent.replace(/\n/g, "\n    ") + "\n\n";
    }
  };
  rules.fencedCodeBlock = {
    filter: function(node, options) {
      return options.codeBlockStyle === "fenced" && node.nodeName === "PRE" && node.firstChild && node.firstChild.nodeName === "CODE";
    },
    replacement: function(content, node, options) {
      var className = node.firstChild.getAttribute("class") || "";
      var language = (className.match(/language-(\S+)/) || [null, ""])[1];
      var code = node.firstChild.textContent;
      var fenceChar = options.fence.charAt(0);
      var fenceSize = 3;
      var fenceInCodeRegex = new RegExp("^" + fenceChar + "{3,}", "gm");
      var match;
      while (match = fenceInCodeRegex.exec(code)) {
        if (match[0].length >= fenceSize) {
          fenceSize = match[0].length + 1;
        }
      }
      var fence = repeat(fenceChar, fenceSize);
      return "\n\n" + fence + language + "\n" + code.replace(/\n$/, "") + "\n" + fence + "\n\n";
    }
  };
  rules.horizontalRule = {
    filter: "hr",
    replacement: function(content, node, options) {
      return "\n\n" + options.hr + "\n\n";
    }
  };
  rules.inlineLink = {
    filter: function(node, options) {
      return options.linkStyle === "inlined" && node.nodeName === "A" && node.getAttribute("href");
    },
    replacement: function(content, node) {
      var href = escapeLinkDestination(node.getAttribute("href"));
      var title = escapeLinkTitle(cleanAttribute(node.getAttribute("title")));
      var titlePart = title ? ' "' + title + '"' : "";
      return "[" + content + "](" + href + titlePart + ")";
    }
  };
  rules.referenceLink = {
    filter: function(node, options) {
      return options.linkStyle === "referenced" && node.nodeName === "A" && node.getAttribute("href");
    },
    replacement: function(content, node, options) {
      var href = escapeLinkDestination(node.getAttribute("href"));
      var title = cleanAttribute(node.getAttribute("title"));
      if (title) title = ' "' + escapeLinkTitle(title) + '"';
      var replacement;
      var reference;
      switch (options.linkReferenceStyle) {
        case "collapsed":
          replacement = "[" + content + "][]";
          reference = "[" + content + "]: " + href + title;
          break;
        case "shortcut":
          replacement = "[" + content + "]";
          reference = "[" + content + "]: " + href + title;
          break;
        default:
          var id = this.references.length + 1;
          replacement = "[" + content + "][" + id + "]";
          reference = "[" + id + "]: " + href + title;
      }
      this.references.push(reference);
      return replacement;
    },
    references: [],
    append: function(options) {
      var references = "";
      if (this.references.length) {
        references = "\n\n" + this.references.join("\n") + "\n\n";
        this.references = [];
      }
      return references;
    }
  };
  rules.emphasis = {
    filter: ["em", "i"],
    replacement: function(content, node, options) {
      if (!content.trim()) return "";
      return options.emDelimiter + content + options.emDelimiter;
    }
  };
  rules.strong = {
    filter: ["strong", "b"],
    replacement: function(content, node, options) {
      if (!content.trim()) return "";
      return options.strongDelimiter + content + options.strongDelimiter;
    }
  };
  rules.code = {
    filter: function(node) {
      var hasSiblings = node.previousSibling || node.nextSibling;
      var isCodeBlock = node.parentNode.nodeName === "PRE" && !hasSiblings;
      return node.nodeName === "CODE" && !isCodeBlock;
    },
    replacement: function(content) {
      if (!content) return "";
      content = content.replace(/\r?\n|\r/g, " ");
      var extraSpace = /^`|^ .*?[^ ].* $|`$/.test(content) ? " " : "";
      var delimiter = "`";
      var matches = content.match(/`+/gm) || [];
      while (matches.indexOf(delimiter) !== -1) delimiter = delimiter + "`";
      return delimiter + extraSpace + content + extraSpace + delimiter;
    }
  };
  rules.image = {
    filter: "img",
    replacement: function(content, node) {
      var alt = escapeMarkdown(cleanAttribute(node.getAttribute("alt")));
      var src = escapeLinkDestination(node.getAttribute("src") || "");
      var title = cleanAttribute(node.getAttribute("title"));
      var titlePart = title ? ' "' + escapeLinkTitle(title) + '"' : "";
      return src ? "![" + alt + "](" + src + titlePart + ")" : "";
    }
  };
  function cleanAttribute(attribute) {
    return attribute ? attribute.replace(/(\n+\s*)+/g, "\n") : "";
  }
  function escapeLinkDestination(destination) {
    var escaped = destination.replace(/([<>()])/g, "\\$1");
    return escaped.indexOf(" ") >= 0 ? "<" + escaped + ">" : escaped;
  }
  function escapeLinkTitle(title) {
    return title.replace(/"/g, '\\"');
  }
  function Rules(options) {
    this.options = options;
    this._keep = [];
    this._remove = [];
    this.blankRule = {
      replacement: options.blankReplacement
    };
    this.keepReplacement = options.keepReplacement;
    this.defaultRule = {
      replacement: options.defaultReplacement
    };
    this.array = [];
    for (var key in options.rules) this.array.push(options.rules[key]);
  }
  Rules.prototype = {
    add: function(key, rule) {
      this.array.unshift(rule);
    },
    keep: function(filter) {
      this._keep.unshift({
        filter,
        replacement: this.keepReplacement
      });
    },
    remove: function(filter) {
      this._remove.unshift({
        filter,
        replacement: function() {
          return "";
        }
      });
    },
    forNode: function(node) {
      if (node.isBlank) return this.blankRule;
      var rule;
      if (rule = findRule(this.array, node, this.options)) return rule;
      if (rule = findRule(this._keep, node, this.options)) return rule;
      if (rule = findRule(this._remove, node, this.options)) return rule;
      return this.defaultRule;
    },
    forEach: function(fn) {
      for (var i = 0; i < this.array.length; i++) fn(this.array[i], i);
    }
  };
  function findRule(rules2, node, options) {
    for (var i = 0; i < rules2.length; i++) {
      var rule = rules2[i];
      if (filterValue(rule, node, options)) return rule;
    }
    return void 0;
  }
  function filterValue(rule, node, options) {
    var filter = rule.filter;
    if (typeof filter === "string") {
      if (filter === node.nodeName.toLowerCase()) return true;
    } else if (Array.isArray(filter)) {
      if (filter.indexOf(node.nodeName.toLowerCase()) > -1) return true;
    } else if (typeof filter === "function") {
      if (filter.call(rule, node, options)) return true;
    } else {
      throw new TypeError("`filter` needs to be a string, array, or function");
    }
  }
  function collapseWhitespace(options) {
    var element = options.element;
    var isBlock2 = options.isBlock;
    var isVoid2 = options.isVoid;
    var isPre = options.isPre || function(node2) {
      return node2.nodeName === "PRE";
    };
    if (!element.firstChild || isPre(element)) return;
    var prevText = null;
    var keepLeadingWs = false;
    var prev = null;
    var node = next(prev, element, isPre);
    while (node !== element) {
      if (node.nodeType === 3 || node.nodeType === 4) {
        var text = node.data.replace(/[ \r\n\t]+/g, " ");
        if ((!prevText || / $/.test(prevText.data)) && !keepLeadingWs && text[0] === " ") {
          text = text.substr(1);
        }
        if (!text) {
          node = remove(node);
          continue;
        }
        node.data = text;
        prevText = node;
      } else if (node.nodeType === 1) {
        if (isBlock2(node) || node.nodeName === "BR") {
          if (prevText) {
            prevText.data = prevText.data.replace(/ $/, "");
          }
          prevText = null;
          keepLeadingWs = false;
        } else if (isVoid2(node) || isPre(node)) {
          prevText = null;
          keepLeadingWs = true;
        } else if (prevText) {
          keepLeadingWs = false;
        }
      } else {
        node = remove(node);
        continue;
      }
      var nextNode = next(prev, node, isPre);
      prev = node;
      node = nextNode;
    }
    if (prevText) {
      prevText.data = prevText.data.replace(/ $/, "");
      if (!prevText.data) {
        remove(prevText);
      }
    }
  }
  function remove(node) {
    var next2 = node.nextSibling || node.parentNode;
    node.parentNode.removeChild(node);
    return next2;
  }
  function next(prev, current, isPre) {
    if (prev && prev.parentNode === current || isPre(current)) {
      return current.nextSibling || current.parentNode;
    }
    return current.firstChild || current.nextSibling || current.parentNode;
  }
  var root = typeof window !== "undefined" ? window : {};
  function canParseHTMLNatively() {
    var Parser = root.DOMParser;
    var canParse = false;
    try {
      if (new Parser().parseFromString("", "text/html")) {
        canParse = true;
      }
    } catch (e) {
    }
    return canParse;
  }
  function createHTMLParser() {
    var Parser = function() {
    };
    {
      if (shouldUseActiveX()) {
        Parser.prototype.parseFromString = function(string) {
          var doc = new window.ActiveXObject("htmlfile");
          doc.designMode = "on";
          doc.open();
          doc.write(string);
          doc.close();
          return doc;
        };
      } else {
        Parser.prototype.parseFromString = function(string) {
          var doc = document.implementation.createHTMLDocument("");
          doc.open();
          doc.write(string);
          doc.close();
          return doc;
        };
      }
    }
    return Parser;
  }
  function shouldUseActiveX() {
    var useActiveX = false;
    try {
      document.implementation.createHTMLDocument("").open();
    } catch (e) {
      if (root.ActiveXObject) useActiveX = true;
    }
    return useActiveX;
  }
  var HTMLParser = canParseHTMLNatively() ? root.DOMParser : createHTMLParser();
  function RootNode(input, options) {
    var root2;
    if (typeof input === "string") {
      var doc = htmlParser().parseFromString(
        // DOM parsers arrange elements in the <head> and <body>.
        // Wrapping in a custom element ensures elements are reliably arranged in
        // a single element.
        '<x-turndown id="turndown-root">' + input + "</x-turndown>",
        "text/html"
      );
      root2 = doc.getElementById("turndown-root");
    } else {
      root2 = input.cloneNode(true);
    }
    collapseWhitespace({
      element: root2,
      isBlock,
      isVoid,
      isPre: options.preformattedCode ? isPreOrCode : null
    });
    return root2;
  }
  var _htmlParser;
  function htmlParser() {
    _htmlParser = _htmlParser || new HTMLParser();
    return _htmlParser;
  }
  function isPreOrCode(node) {
    return node.nodeName === "PRE" || node.nodeName === "CODE";
  }
  function Node(node, options) {
    node.isBlock = isBlock(node);
    node.isCode = node.nodeName === "CODE" || node.parentNode.isCode;
    node.isBlank = isBlank(node);
    node.flankingWhitespace = flankingWhitespace(node, options);
    return node;
  }
  function isBlank(node) {
    return !isVoid(node) && !isMeaningfulWhenBlank(node) && /^\s*$/i.test(node.textContent) && !hasVoid(node) && !hasMeaningfulWhenBlank(node);
  }
  function flankingWhitespace(node, options) {
    if (node.isBlock || options.preformattedCode && node.isCode) {
      return {
        leading: "",
        trailing: ""
      };
    }
    var edges = edgeWhitespace(node.textContent);
    if (edges.leadingAscii && isFlankedByWhitespace("left", node, options)) {
      edges.leading = edges.leadingNonAscii;
    }
    if (edges.trailingAscii && isFlankedByWhitespace("right", node, options)) {
      edges.trailing = edges.trailingNonAscii;
    }
    return {
      leading: edges.leading,
      trailing: edges.trailing
    };
  }
  function edgeWhitespace(string) {
    var m = string.match(/^(([ \t\r\n]*)(\s*))(?:(?=\S)[\s\S]*\S)?((\s*?)([ \t\r\n]*))$/);
    return {
      leading: m[1],
      // whole string for whitespace-only strings
      leadingAscii: m[2],
      leadingNonAscii: m[3],
      trailing: m[4],
      // empty for whitespace-only strings
      trailingNonAscii: m[5],
      trailingAscii: m[6]
    };
  }
  function isFlankedByWhitespace(side, node, options) {
    var sibling;
    var regExp;
    var isFlanked;
    if (side === "left") {
      sibling = node.previousSibling;
      regExp = / $/;
    } else {
      sibling = node.nextSibling;
      regExp = /^ /;
    }
    if (sibling) {
      if (sibling.nodeType === 3) {
        isFlanked = regExp.test(sibling.nodeValue);
      } else if (options.preformattedCode && sibling.nodeName === "CODE") {
        isFlanked = false;
      } else if (sibling.nodeType === 1 && !isBlock(sibling)) {
        isFlanked = regExp.test(sibling.textContent);
      }
    }
    return isFlanked;
  }
  var reduce = Array.prototype.reduce;
  function TurndownService(options) {
    if (!(this instanceof TurndownService)) return new TurndownService(options);
    var defaults = {
      rules,
      headingStyle: "setext",
      hr: "* * *",
      bulletListMarker: "*",
      codeBlockStyle: "indented",
      fence: "```",
      emDelimiter: "_",
      strongDelimiter: "**",
      linkStyle: "inlined",
      linkReferenceStyle: "full",
      br: "  ",
      preformattedCode: false,
      blankReplacement: function(content, node) {
        return node.isBlock ? "\n\n" : "";
      },
      keepReplacement: function(content, node) {
        return node.isBlock ? "\n\n" + node.outerHTML + "\n\n" : node.outerHTML;
      },
      defaultReplacement: function(content, node) {
        return node.isBlock ? "\n\n" + content + "\n\n" : content;
      }
    };
    this.options = extend({}, defaults, options);
    this.rules = new Rules(this.options);
  }
  TurndownService.prototype = {
    /**
     * The entry point for converting a string or DOM node to Markdown
     * @public
     * @param {String|HTMLElement} input The string or DOM node to convert
     * @returns A Markdown representation of the input
     * @type String
     */
    turndown: function(input) {
      if (!canConvert(input)) {
        throw new TypeError(input + " is not a string, or an element/document/fragment node.");
      }
      if (input === "") return "";
      var output = process2.call(this, new RootNode(input, this.options));
      return postProcess.call(this, output);
    },
    /**
     * Add one or more plugins
     * @public
     * @param {Function|Array} plugin The plugin or array of plugins to add
     * @returns The Turndown instance for chaining
     * @type Object
     */
    use: function(plugin) {
      if (Array.isArray(plugin)) {
        for (var i = 0; i < plugin.length; i++) this.use(plugin[i]);
      } else if (typeof plugin === "function") {
        plugin(this);
      } else {
        throw new TypeError("plugin must be a Function or an Array of Functions");
      }
      return this;
    },
    /**
     * Adds a rule
     * @public
     * @param {String} key The unique key of the rule
     * @param {Object} rule The rule
     * @returns The Turndown instance for chaining
     * @type Object
     */
    addRule: function(key, rule) {
      this.rules.add(key, rule);
      return this;
    },
    /**
     * Keep a node (as HTML) that matches the filter
     * @public
     * @param {String|Array|Function} filter The unique key of the rule
     * @returns The Turndown instance for chaining
     * @type Object
     */
    keep: function(filter) {
      this.rules.keep(filter);
      return this;
    },
    /**
     * Remove a node that matches the filter
     * @public
     * @param {String|Array|Function} filter The unique key of the rule
     * @returns The Turndown instance for chaining
     * @type Object
     */
    remove: function(filter) {
      this.rules.remove(filter);
      return this;
    },
    /**
     * Escapes Markdown syntax
     * @public
     * @param {String} string The string to escape
     * @returns A string with Markdown syntax escaped
     * @type String
     */
    escape: function(string) {
      return escapeMarkdown(string);
    }
  };
  function process2(parentNode) {
    var self = this;
    return reduce.call(parentNode.childNodes, function(output, node) {
      node = new Node(node, self.options);
      var replacement = "";
      if (node.nodeType === 3) {
        replacement = node.isCode ? node.nodeValue : self.escape(node.nodeValue);
      } else if (node.nodeType === 1) {
        replacement = replacementForNode.call(self, node);
      }
      return join(output, replacement);
    }, "");
  }
  function postProcess(output) {
    var self = this;
    this.rules.forEach(function(rule) {
      if (typeof rule.append === "function") {
        output = join(output, rule.append(self.options));
      }
    });
    return output.replace(/^[\t\r\n]+/, "").replace(/[\t\r\n\s]+$/, "");
  }
  function replacementForNode(node) {
    var rule = this.rules.forNode(node);
    var content = process2.call(this, node);
    var whitespace = node.flankingWhitespace;
    if (whitespace.leading || whitespace.trailing) content = content.trim();
    return whitespace.leading + rule.replacement(content, node, this.options) + whitespace.trailing;
  }
  function join(output, replacement) {
    var s1 = trimTrailingNewlines(output);
    var s2 = trimLeadingNewlines(replacement);
    var nls = Math.max(output.length - s1.length, replacement.length - s2.length);
    var separator = "\n\n".substring(0, nls);
    return s1 + separator + s2;
  }
  function canConvert(input) {
    return input != null && (typeof input === "string" || input.nodeType && (input.nodeType === 1 || input.nodeType === 9 || input.nodeType === 11));
  }

  // src/selection-actions.js
  var import_turndown_plugin_gfm = __toESM(require_turndown_plugin_gfm_cjs(), 1);
  var MAX_TEXT_LENGTH = 2e6;
  var MAX_CAPTURE_EDGE = 8192;
  var MAX_CAPTURE_PIXELS = 24e6;
  var MIN_CAPTURE_RATIO = 0.2;
  var turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-"
  });
  turndown.use(import_turndown_plugin_gfm.gfm);
  turndown.remove(["script", "style", "noscript", "template"]);
  function requireElement(element) {
    if (!(element instanceof Element) || !element.isConnected) throw new Error("\u6240\u9009\u5143\u7D20\u5DF2\u4E0D\u5728\u9875\u9762\u4E2D\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9");
    return element;
  }
  function cloneWithoutInspector(element, inspectorRootId) {
    const clone = requireElement(element).cloneNode(true);
    if (clone instanceof Element && clone.id === inspectorRootId) throw new Error("\u4E0D\u80FD\u5BFC\u51FA\u5143\u7D20\u68C0\u67E5\u5668\u81EA\u8EAB\u754C\u9762");
    clone.querySelectorAll?.("[id]").forEach((node) => {
      if (node.id === inspectorRootId) node.remove();
    });
    return clone;
  }
  function boundedText(value, kind) {
    const text = String(value);
    if (text.length > MAX_TEXT_LENGTH) throw new Error(`\u5143\u7D20${kind}\u8D85\u8FC7 200 \u4E07\u5B57\u7B26\uFF0C\u8BF7\u9009\u62E9\u66F4\u5C0F\u7684\u8303\u56F4`);
    return text;
  }
  function parseCssColor(value) {
    if (value === "transparent") return { red: 0, green: 0, blue: 0, alpha: 0 };
    if (!/^rgba?\(/i.test(value)) return void 0;
    const numbers = value.match(/[\d.]+/g)?.map(Number);
    if (!numbers || numbers.length < 3 || numbers.some((number) => !Number.isFinite(number))) return void 0;
    return {
      red: Math.max(0, Math.min(numbers[0], 255)),
      green: Math.max(0, Math.min(numbers[1], 255)),
      blue: Math.max(0, Math.min(numbers[2], 255)),
      alpha: Math.max(0, Math.min(numbers[3] ?? 1, 1))
    };
  }
  function overlay(foreground, background) {
    const alpha = foreground.alpha + background.alpha * (1 - foreground.alpha);
    if (alpha === 0) return { red: 0, green: 0, blue: 0, alpha: 0 };
    const channel = (key) => (foreground[key] * foreground.alpha + background[key] * background.alpha * (1 - foreground.alpha)) / alpha;
    return { red: channel("red"), green: channel("green"), blue: channel("blue"), alpha };
  }
  function compositeCssColors(colors, fallback = "rgb(255, 255, 255)") {
    let result = parseCssColor(fallback) ?? { red: 255, green: 255, blue: 255, alpha: 1 };
    for (const value of colors) {
      const color = parseCssColor(value);
      if (color) result = overlay(color, result);
    }
    return `rgb(${Math.round(result.red)}, ${Math.round(result.green)}, ${Math.round(result.blue)})`;
  }
  function elementBackdrop(element) {
    const colors = [];
    for (let node = element.parentElement; node; node = node.parentElement) {
      const value = getComputedStyle(node).backgroundColor;
      const color = parseCssColor(value);
      if (!color || color.alpha === 0) continue;
      colors.unshift(value);
      if (color.alpha >= 0.999) break;
    }
    return compositeCssColors(colors);
  }
  function serializeElement(element, inspectorRootId) {
    return boundedText(cloneWithoutInspector(element, inspectorRootId).outerHTML, " HTML");
  }
  function htmlToMarkdown(html) {
    return boundedText(turndown.turndown(boundedText(html, " HTML")).trim(), " Markdown");
  }
  function elementToMarkdown(element, inspectorRootId) {
    return htmlToMarkdown(serializeElement(element, inspectorRootId));
  }
  async function captureElementPng(element, inspectorRootId, requestedPixelRatio) {
    const target = requireElement(element);
    const rect = target.getBoundingClientRect();
    const width = Math.ceil(rect.width);
    const height = Math.ceil(rect.height);
    if (width < 1 || height < 1) throw new Error("\u6240\u9009\u5143\u7D20\u6CA1\u6709\u53EF\u622A\u56FE\u7684\u53EF\u89C1\u5C3A\u5BF8");
    const preferredRatio = Math.max(1, Math.min(Number(requestedPixelRatio) || 1, 2));
    const pixelRatio = Math.min(
      preferredRatio,
      MAX_CAPTURE_EDGE / width,
      MAX_CAPTURE_EDGE / height,
      Math.sqrt(MAX_CAPTURE_PIXELS / (width * height))
    );
    if (!Number.isFinite(pixelRatio) || pixelRatio < MIN_CAPTURE_RATIO) throw new Error("\u6240\u9009\u5143\u7D20\u8FC7\u5927\uFF0C\u8BF7\u9009\u62E9\u66F4\u5C0F\u7684\u8303\u56F4");
    const blob = await toBlob(target, {
      backgroundColor: elementBackdrop(target),
      width,
      height,
      style: { overflow: "hidden" },
      pixelRatio,
      skipFonts: true,
      filter: (node) => !(node instanceof Element) || node.id !== inspectorRootId
    });
    if (!blob) throw new Error("\u6D4F\u89C8\u5668\u672A\u80FD\u751F\u6210\u622A\u56FE");
    return blob;
  }

  // src/hidden-rules.js
  var GENERATED_CLASS = /^(?:css-|sc-|jsx-|ng-|ant-|el-)/i;
  var GENERATED_TOKEN = /(?:^|[-_])[a-f0-9]{7,}(?:$|[-_])/i;
  var GENERIC_CLASSES = /* @__PURE__ */ new Set(["active", "button", "container", "content", "footer", "header", "hidden", "icon", "item", "label", "main", "panel", "root", "row", "text", "title", "wrapper"]);
  function normalizeHiddenText(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 180);
  }
  function stableHiddenClasses(value) {
    const tokens = Array.isArray(value) ? value : String(value || "").split(/\s+/);
    return [...new Set(tokens.filter((item) => item.length >= 3 && item.length <= 120 && !GENERATED_CLASS.test(item) && !GENERATED_TOKEN.test(item) && !/^[a-f0-9]{8,}$/i.test(item) && !GENERIC_CLASSES.has(item.toLowerCase())))].slice(0, 6);
  }
  function stableAttributes(attrs) {
    const output = {};
    for (const [name, rawValue] of Object.entries(attrs ?? {})) {
      if (!/^(?:data-|aria-|role$)/i.test(name)) continue;
      const value = String(rawValue ?? "").trim();
      if (!value || value.length > 160 || GENERATED_TOKEN.test(value)) continue;
      output[name.toLowerCase()] = value;
      if (Object.keys(output).length >= 6) break;
    }
    return output;
  }
  function nodeRule(info, includeText = false) {
    return {
      id: String(info?.id || "").slice(0, 120),
      classes: stableHiddenClasses(info?.classes),
      attrs: stableAttributes(info?.attrs),
      tag: String(info?.tag || "").toLowerCase(),
      nth: Number.isInteger(info?.nth) && info.nth >= 0 ? info.nth : 0,
      ...includeText ? { text: normalizeHiddenText(info?.text) } : {}
    };
  }
  function createHiddenRule(info) {
    return {
      ...nodeRule(info, true),
      version: 2,
      ancestors: (Array.isArray(info?.ancestors) ? info.ancestors : []).slice(0, 4).map((item) => nodeRule(item))
    };
  }
  function identityEvidence(actual, expected) {
    if (!actual || !expected) return { tag: false, id: false, attrs: false, classes: false, partialClass: false, text: false, nth: false };
    const actualTag = String(actual.tag || "").toLowerCase();
    const expectedTag = String(expected.tag || "").toLowerCase();
    const tag = !expectedTag || actualTag === expectedTag;
    if (!tag) return { tag, id: false, attrs: false, classes: false, partialClass: false, text: false, nth: false };
    const attrs = stableAttributes(expected.attrs);
    const attrKeys = Object.keys(attrs);
    const classes = stableHiddenClasses(expected.classes);
    const actualClasses = new Set(stableHiddenClasses(actual.classes));
    const classMatches = classes.filter((name) => actualClasses.has(name)).length;
    const text = normalizeHiddenText(expected.text);
    return {
      tag,
      id: Boolean(expected.id && actual.id === expected.id),
      attrs: Boolean(attrKeys.length && attrKeys.every((key) => String(actual.attrs?.[key] ?? "") === attrs[key])),
      classes: Boolean(classes.length && classMatches === classes.length),
      partialClass: Boolean(classMatches > 0),
      text: Boolean(text && normalizeHiddenText(actual.text) === text),
      nth: Boolean(Number.isInteger(expected.nth) && expected.nth > 0 && actual.nth === expected.nth)
    };
  }
  function ancestorMatches(actual, expected) {
    if (!actual || !expected) return false;
    const expectedTag = String(expected.tag || "").toLowerCase();
    if (expectedTag && String(actual.tag || "").toLowerCase() !== expectedTag) return false;
    if (expected.id && actual.id === expected.id) return true;
    const attrs = stableAttributes(expected.attrs);
    const attrKeys = Object.keys(attrs);
    if (attrKeys.length && attrKeys.every((key) => String(actual.attrs?.[key] ?? "") === attrs[key])) return true;
    const classes = stableHiddenClasses(expected.classes);
    const actualClasses = new Set(stableHiddenClasses(actual.classes));
    return Boolean(classes.length && classes.every((name) => actualClasses.has(name)));
  }
  function matchesHiddenInfo(info, rule) {
    const evidence = identityEvidence(info, rule);
    if (!evidence.tag) return false;
    if (evidence.id || evidence.attrs) return true;
    if (evidence.classes && evidence.text) return true;
    const expectedAncestors = Array.isArray(rule?.ancestors) ? rule.ancestors : [];
    const actualAncestors = Array.isArray(info?.ancestors) ? info.ancestors : [];
    let anchoredAncestor = false;
    let structuralDepth = 0;
    for (let index = 0; index < Math.min(expectedAncestors.length, actualAncestors.length, 4); index += 1) {
      if (ancestorMatches(actualAncestors[index], expectedAncestors[index])) anchoredAncestor = true;
      if (String(actualAncestors[index]?.tag || "").toLowerCase() === String(expectedAncestors[index]?.tag || "").toLowerCase() && actualAncestors[index]?.nth === expectedAncestors[index]?.nth) structuralDepth += 1;
    }
    if (evidence.partialClass && evidence.nth && anchoredAncestor) return true;
    return evidence.text && evidence.nth && (anchoredAncestor || structuralDepth >= 2);
  }
  function resolveUniqueHiddenMatches(candidates, rules2, matcher = matchesHiddenInfo) {
    const resolved = /* @__PURE__ */ new Set();
    for (const rule of rules2 ?? []) {
      let match;
      let ambiguous = false;
      for (const candidate of candidates ?? []) {
        if (!matcher(candidate, rule)) continue;
        if (match) {
          ambiguous = true;
          break;
        }
        match = candidate;
      }
      if (match && !ambiguous) resolved.add(match);
    }
    return resolved;
  }
  function nthOfType(element) {
    let index = 1;
    for (let sibling = element.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
      if (sibling.tagName === element.tagName) index += 1;
    }
    return index;
  }
  function elementNodeInfo(element, includeText = false) {
    const attrs = {};
    for (const attr of element.attributes ?? []) if (/^(?:data-|aria-|role$)/i.test(attr.name)) attrs[attr.name.toLowerCase()] = attr.value;
    return {
      id: element.id || "",
      classes: typeof element.className === "string" ? element.className.slice(0, 320) : "",
      attrs,
      tag: element.tagName || "",
      nth: nthOfType(element),
      ...includeText ? { text: normalizeHiddenText(element.innerText || element.textContent) } : {}
    };
  }
  function matchesHiddenElement(element, rule) {
    if (!(element instanceof Element)) return false;
    if (rule?.tag && element.tagName.toLowerCase() !== String(rule.tag).toLowerCase()) return false;
    const info = elementNodeInfo(element, true);
    let node = element.parentElement;
    info.ancestors = [];
    for (let depth = 0; node && depth < 4; depth += 1, node = node.parentElement) {
      info.ancestors.push(elementNodeInfo(node));
    }
    return matchesHiddenInfo(info, rule);
  }

  // src/runtime-registrations.js
  function functionSource(value) {
    if (typeof value !== "function") return "";
    try {
      return Function.prototype.toString.call(value);
    } catch {
      return "";
    }
  }
  function sourceSamples(value) {
    const source = functionSource(value).trim();
    if (source.length < 80 || source.includes("[native code]")) return [];
    if (source.length <= 900) return [source];
    const width = 320;
    return [...new Set([0, Math.floor((source.length - width) / 2), source.length - width].map((start) => source.slice(start, start + width)))].filter(Boolean);
  }
  function slotNames(slots) {
    let roots;
    try {
      roots = slots.snapshot();
    } catch {
      return [];
    }
    const names = /* @__PURE__ */ new Set();
    const visit = (node) => {
      if (!node || typeof node !== "object") return;
      if (typeof node.name === "string") names.add(node.name);
      for (const child of Array.isArray(node.children) ? node.children : []) visit(child);
    };
    for (const root2 of Array.isArray(roots) ? roots : []) visit(root2);
    return [...names];
  }
  function quotedInSource(source, value) {
    return [`"${value}"`, `'${value}'`, `\`${value}\``].some((quoted) => source.includes(quoted));
  }
  function slotsReferencedByFiber(fiber, names) {
    const direct = [fiber?.memoizedProps?.slotKey, fiber?.memoizedProps?.["data-slot"]].filter((value) => names.includes(value));
    const sources = [...new Set([functionSource(fiber?.type), functionSource(fiber?.elementType)].filter(Boolean))];
    return [.../* @__PURE__ */ new Set([...direct, ...names.filter((name) => sources.some((source) => quotedInSource(source, name)))])];
  }
  function nearestProjectedSlots(fibers, names) {
    for (const fiber of fibers) {
      if (typeof fiber.type === "string" && !fiber.key) continue;
      const referenced = slotsReferencedByFiber(fiber, names);
      if (referenced.length) return new Set(referenced);
    }
    return /* @__PURE__ */ new Set();
  }
  function collectEntries(slots, names) {
    const entries = [];
    for (const slot of names) {
      let slotEntries;
      try {
        slotEntries = slots.entries(slot);
      } catch {
        continue;
      }
      for (const entry of Array.isArray(slotEntries) ? slotEntries : []) entries.push({ slot, entry });
    }
    return entries;
  }
  function runtimeRegistrations(target, slots) {
    const fiberKey = Object.keys(target).find((key) => key.startsWith("__reactFiber$") || key.startsWith("__reactInternalInstance$"));
    let fiber = fiberKey ? target[fiberKey] : void 0;
    const fibers = [];
    for (let depth = 0; fiber && depth < 32; depth += 1, fiber = fiber.return) {
      fibers.push({ depth, key: typeof fiber.key === "string" ? fiber.key : fiber.key == null ? "" : String(fiber.key), type: fiber.type, elementType: fiber.elementType, memoizedProps: fiber.memoizedProps });
    }
    if (!fibers.length) return [];
    const names = slotNames(slots);
    const entries = collectEntries(slots, names);
    const projectedSlots = nearestProjectedSlots(fibers, names);
    const projectedKeyMatches = /* @__PURE__ */ new Map();
    for (const { slot, entry } of entries) {
      if (!projectedSlots.has(slot)) continue;
      const optionKey = entry?.options?.id ?? entry?.options?.key;
      if (optionKey === void 0) continue;
      for (const row of fibers) {
        if (typeof row.type !== "string" || row.key !== String(optionKey)) continue;
        const key = `${row.depth}\0${row.key}`;
        const current = projectedKeyMatches.get(key) ?? [];
        current.push({ slot, entry, depth: row.depth });
        projectedKeyMatches.set(key, current);
      }
    }
    const matches = [];
    for (const { slot, entry } of entries) {
      const optionKey = entry?.options?.id ?? entry?.options?.key;
      let depth = Number.POSITIVE_INFINITY;
      for (const row of fibers) {
        if (typeof row.type === "function" && (row.type === entry.component || row.elementType === entry.component)) depth = Math.min(depth, row.depth);
        if (optionKey === void 0 || typeof row.type !== "string" || row.key !== String(optionKey)) continue;
        const keyMatches = projectedKeyMatches.get(`${row.depth}\0${row.key}`) ?? [];
        if (keyMatches.length === 1 && keyMatches[0].slot === slot && keyMatches[0].entry === entry) depth = Math.min(depth, row.depth);
      }
      if (!Number.isFinite(depth)) continue;
      const sources = [.../* @__PURE__ */ new Set([...sourceSamples(entry.component), ...sourceSamples(entry.inject)])].slice(0, 4);
      if (!sources.length) continue;
      matches.push({
        slot: slot.slice(0, 160),
        key: optionKey === void 0 ? "" : String(optionKey).slice(0, 160),
        depth,
        sources
      });
    }
    return matches.sort((a, b) => a.depth - b.depth || a.slot.localeCompare(b.slot)).slice(0, 8);
  }

  // src/client.js
  window.__ModuleLoader__.load({
    id: "dsh-element-inspector",
    factory: (require2) => {
      const module = { exports: {} };
      const React = require2("react");
      const STYLE_ID = "dsh-element-inspector-style";
      const ROOT_ID = "dsh-element-inspector-root";
      const LEGACY_STORAGE_KEY = "dsh-element-inspector:v2";
      const STARTUP_CACHE_KEY = "dsh-element-inspector:settings-cache:v1";
      const SETTINGS_NAMESPACE = "dsh-element-inspector";
      const DEFAULT_HOTKEY = "F1";
      const BRAND = "dsh-element-inspector";
      function style() {
        if (document.getElementById(STYLE_ID)) return;
        const node = document.createElement("style");
        node.id = STYLE_ID;
        node.textContent = `
        #${ROOT_ID} { position: fixed; inset: 0; z-index: 2147483646; pointer-events: none; color: var(--dsw-alias-label-primary,#17181c); font-family: var(--dsw-font-family,-apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft YaHei',sans-serif); font-size: 14px; line-height: 22px; letter-spacing: 0; }
        #${ROOT_ID} * { box-sizing: border-box; letter-spacing: 0; }
        #${ROOT_ID} .dei-mask { position: fixed; pointer-events: none; border: 2px solid var(--dsw-alias-state-business-primary,#4d6bfe); border-radius: 6px; background: color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 12%,transparent); box-shadow: 0 0 0 1px var(--dsw-alias-bg-layer-1,#fff) inset,0 0 0 1px color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 20%,transparent); transition: left .05s ease,top .05s ease,width .05s ease,height .05s ease; }
        #${ROOT_ID} .dei-badge { position: fixed; top: 18px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; max-width: calc(100vw - 32px); height: 36px; padding: 0 14px; overflow: hidden; color: var(--dsw-alias-label-primary-foreground,#fff); background: var(--dsw-alias-button-primary-fill,#17181c); border-radius: 18px; box-shadow: var(--dsw-shadow-lv2,0 8px 24px rgba(0,0,0,.18)); font-size: 13px; line-height: 20px; white-space: nowrap; text-overflow: ellipsis; }
        #${ROOT_ID} .dei-radar-dot { width: 8px; height: 8px; flex: none; border: 2px solid currentColor; border-radius: 50%; box-shadow: 0 0 0 3px color-mix(in srgb,currentColor 22%,transparent); }
        #${ROOT_ID} .dei-scrim { position: fixed; inset: 0; pointer-events: auto; background: var(--dsw-alias-bg-mask-1,rgba(0,0,0,.24)); backdrop-filter: var(--dsw-mask-blur,blur(2px)); }
        #${ROOT_ID} .dei-panel { position: fixed; z-index: 1; left: 50%; top: 50%; transform: translate(-50%,-50%); display: flex; flex-direction: column; width: min(480px,calc(100vw - 32px)); max-height: min(680px,calc(100vh - 48px)); overflow: hidden; pointer-events: auto; border: 1px solid var(--dsw-alias-border-inverted,transparent); border-radius: 24px; background: var(--dsw-alias-bg-layer-2,#fff); box-shadow: var(--dsw-shadow-lv3,0 18px 48px rgba(0,0,0,.24)); }
        #${ROOT_ID} .dei-header { display: flex; align-items: center; gap: 8px; min-height: 58px; padding: 22px 14px 12px 24px; }
        #${ROOT_ID} .dei-heading { flex: 1; min-width: 0; } #${ROOT_ID} .dei-eyebrow { margin: 0; color: var(--dsw-alias-label-tertiary,#74777d); font-size: 11px; line-height: 16px; } #${ROOT_ID} .dei-title { margin: 0; overflow: hidden; color: var(--dsw-alias-label-primary,#17181c); font-size: 16px; font-weight: 500; line-height: 24px; text-overflow: ellipsis; white-space: nowrap; }
        #${ROOT_ID} .dei-body { min-width: 0; padding: 0 24px 20px; overflow: auto; scrollbar-width: thin; } #${ROOT_ID} .dei-body p { margin: 0; color: var(--dsw-alias-label-secondary,#545860); word-break: break-word; }
        #${ROOT_ID} code { padding: 2px 6px; border-radius: 6px; background: var(--dsw-alias-bg-module-platform,#f4f5f7); color: var(--dsw-alias-label-primary,#17181c); font-family: var(--ds-font-family-code,Consolas,monospace); font-size: 12px; overflow-wrap: anywhere; }
        #${ROOT_ID} .dei-close,#${ROOT_ID} .dei-back { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-secondary,#545860); cursor: pointer; font: inherit; font-size: 20px; line-height: 1; }
        #${ROOT_ID} .dei-back { margin-left: -10px; font-size: 22px; } #${ROOT_ID} .dei-close:hover,#${ROOT_ID} .dei-back:hover { background: var(--dsw-alias-interactive-bg-hover,rgba(38,49,72,.06)); }
        #${ROOT_ID} .dei-conclusion { padding: 16px; border: 1px solid color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 16%,transparent); border-radius: 12px; background: var(--dsw-alias-state-business-tertiary,#edf2ff); }
        #${ROOT_ID} .dei-conclusion-head { display: flex; align-items: center; gap: 10px; min-width: 0; } #${ROOT_ID} .dei-conclusion-mark { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex: none; border-radius: 50%; color: var(--dsw-alias-label-primary-foreground,#fff); background: var(--dsw-alias-state-business-primary,#4d6bfe); font-size: 14px; font-weight: 600; } #${ROOT_ID} .dei-plugin-name { flex: 1; min-width: 0; overflow: hidden; font-size: 15px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
        #${ROOT_ID} .dei-pill { flex: none; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 500; line-height: 16px; } #${ROOT_ID} .dei-pill-confirmed { color: var(--dsw-alias-state-success-primary,#26a269); background: var(--dsw-alias-state-success-tertiary,#e7f7ef); } #${ROOT_ID} .dei-pill-candidate { color: var(--dsw-alias-state-warn-label,#b66616); background: var(--dsw-alias-state-warn-tertiary,#fff4df); }
        #${ROOT_ID} .dei-meta { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 8px; color: var(--dsw-alias-label-tertiary,#74777d); font-size: 12px; line-height: 18px; }
        #${ROOT_ID} .dei-element { margin-top: 12px; padding: 10px 12px; border-radius: 8px; background: var(--dsw-alias-bg-module-platform,#f4f5f7); } #${ROOT_ID} .dei-element-label { color: var(--dsw-alias-label-tertiary,#74777d); font-size: 11px; line-height: 16px; } #${ROOT_ID} .dei-element-value { margin-top: 2px; overflow: hidden; color: var(--dsw-alias-label-primary,#17181c); text-overflow: ellipsis; white-space: nowrap; }
        #${ROOT_ID} .dei-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 14px; }
        #${ROOT_ID} button.dei-button { display: inline-flex; align-items: center; justify-content: center; height: 36px; padding: 0 14px; border: 0; border-radius: 18px; color: var(--dsw-alias-label-primary,#17181c); background: transparent; font: inherit; font-size: 14px; line-height: 22px; cursor: pointer; transition: background var(--ds-transition-duration-fast,.1s) ease; }
        #${ROOT_ID} button.dei-small { height: 28px; padding: 0 10px; border-radius: 14px; font-size: 12px; line-height: 18px; } #${ROOT_ID} button.dei-button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover,rgba(38,49,72,.06)); } #${ROOT_ID} button.dei-primary { color: var(--dsw-alias-label-primary-foreground,#fff); background: var(--dsw-alias-button-primary-fill,#17181c); } #${ROOT_ID} button.dei-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover,#36383e); } #${ROOT_ID} button.dei-outline { border: 1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1)); } #${ROOT_ID} button.dei-danger:hover:not(:disabled) { color: var(--dsw-alias-state-error-primary,#ec1313); background: var(--dsw-alias-interactive-bg-hover-danger,rgba(236,19,19,.05)); } #${ROOT_ID} button:disabled { cursor: not-allowed; opacity: .4; }
        #${ROOT_ID} .dei-section-title { margin: 20px 0 6px; color: var(--dsw-alias-label-tertiary,#74777d); font-size: 12px; font-weight: 500; line-height: 18px; }
        #${ROOT_ID} .dei-hit { border-top: 1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1)); } #${ROOT_ID} .dei-hit:last-child { border-bottom: 1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1)); } #${ROOT_ID} .dei-hit summary { display: flex; align-items: center; gap: 8px; min-height: 48px; cursor: pointer; list-style: none; } #${ROOT_ID} .dei-hit summary::-webkit-details-marker { display: none; } #${ROOT_ID} .dei-hit summary::after { content: '\u203A'; flex: none; color: var(--dsw-alias-label-tertiary,#74777d); font-size: 19px; transform: rotate(90deg); transition: transform .12s ease; } #${ROOT_ID} .dei-hit[open] summary::after { transform: rotate(-90deg); } #${ROOT_ID} .dei-hit-name { flex: 1; min-width: 0; overflow: hidden; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; } #${ROOT_ID} .dei-hit-score { color: var(--dsw-alias-label-tertiary,#74777d); font-size: 11px; }
        #${ROOT_ID} .dei-hit-body { padding: 0 0 14px; } #${ROOT_ID} .dei-file { margin-top: 7px; color: var(--dsw-alias-label-tertiary,#74777d); font-size: 12px; line-height: 18px; overflow-wrap: anywhere; }
        #${ROOT_ID} .dei-settings-group { border-top: 1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1)); } #${ROOT_ID} .dei-settings-row,#${ROOT_ID} .dei-rule-row { display: flex; align-items: center; gap: 12px; min-height: 64px; border-bottom: 1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1)); } #${ROOT_ID} .dei-row-main { flex: 1; min-width: 0; } #${ROOT_ID} .dei-row-title { overflow: hidden; color: var(--dsw-alias-label-primary,#17181c); font-weight: 500; text-overflow: ellipsis; white-space: nowrap; } #${ROOT_ID} .dei-row-description { margin-top: 2px!important; overflow: hidden; color: var(--dsw-alias-label-tertiary,#74777d)!important; font-size: 12px; line-height: 18px; text-overflow: ellipsis; white-space: nowrap; }
        #${ROOT_ID} .dei-hotkey { min-width: 44px; padding: 3px 8px; border: 1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1)); border-bottom-width: 2px; border-radius: 7px; background: var(--dsw-alias-bg-layer-1,#fff); color: var(--dsw-alias-label-primary,#17181c); text-align: center; font-family: var(--ds-font-family-code,Consolas,monospace); font-size: 12px; }
        #${ROOT_ID} .dei-empty { padding: 24px 0; color: var(--dsw-alias-label-tertiary,#74777d); text-align: center; font-size: 12px; }
        #${ROOT_ID} .dei-notice { position: sticky; bottom: 0; z-index: 2; margin: 12px 0 0; padding: 8px 12px; border: 1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1)); border-radius: 8px; color: var(--dsw-alias-label-primary,#17181c); background: var(--dsw-alias-bg-layer-3,#fff); box-shadow: var(--dsw-shadow-lv1,0 3px 12px rgba(0,0,0,.12)); font-size: 12px; } #${ROOT_ID} .dei-notice-error { color: var(--dsw-alias-state-error-primary,#ec1313); }
        #${ROOT_ID} .dei-error { color: var(--dsw-alias-state-error-primary,#ec1313)!important; }
        @media (max-width: 520px) { #${ROOT_ID} .dei-panel { width: calc(100vw - 20px); max-height: calc(100vh - 20px); } #${ROOT_ID} .dei-header { padding-left: 20px; } #${ROOT_ID} .dei-body { padding-right: 20px; padding-left: 20px; } #${ROOT_ID} .dei-actions button.dei-button { flex: 1 1 auto; } }
      `;
        document.head.append(node);
      }
      function esc(value) {
        return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
      }
      function normalizeText(value) {
        return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 180);
      }
      function normalizePrefs(value) {
        return {
          hotkey: typeof value?.hotkey === "string" && value.hotkey ? value.hotkey : DEFAULT_HOTKEY,
          hidden: Array.isArray(value?.hidden) ? value.hidden : []
        };
      }
      function readLegacyPrefs() {
        try {
          const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
          return raw ? normalizePrefs(JSON.parse(raw)) : void 0;
        } catch {
          return void 0;
        }
      }
      function readStartupCache() {
        try {
          const raw = localStorage.getItem(STARTUP_CACHE_KEY);
          return raw ? normalizePrefs(JSON.parse(raw)) : normalizePrefs();
        } catch {
          return normalizePrefs();
        }
      }
      function writeStartupCache(value) {
        try {
          localStorage.setItem(STARTUP_CACHE_KEY, JSON.stringify(normalizePrefs(value)));
        } catch {
        }
      }
      function eventHotkey(event) {
        const modifiers = [];
        if (event.ctrlKey) modifiers.push("Ctrl");
        if (event.altKey) modifiers.push("Alt");
        if (event.shiftKey) modifiers.push("Shift");
        if (event.metaKey) modifiers.push("Meta");
        const key = event.code?.startsWith("Key") ? event.code.slice(3).toUpperCase() : event.code?.startsWith("Digit") ? event.code.slice(5) : event.key;
        return [...modifiers, key].join("+");
      }
      async function callHost(ctx, endpoint, payload, signal) {
        const result = await ctx.connection.rpc.call("/dsh-element-inspector", endpoint, payload, signal);
        if (!result.ok) throw new Error(result.error?.message || "DSH Host \u62D2\u7EDD\u4E86\u8BF7\u6C42");
        return result.value;
      }
      function nthOfType2(element) {
        let index = 1;
        for (let sibling = element.previousElementSibling; sibling; sibling = sibling.previousElementSibling) if (sibling.tagName === element.tagName) index += 1;
        return index;
      }
      function targetInfo(target, slots) {
        const attrs = {};
        for (const attr of target.attributes ?? []) if (/^(data-|aria-|role$)/.test(attr.name)) attrs[attr.name] = attr.value;
        const fiberKey = Object.keys(target).find((key) => key.startsWith("__reactFiber$") || key.startsWith("__reactInternalInstance$"));
        const fiber = fiberKey ? target[fiberKey] : void 0;
        const owner = fiber?._debugOwner?.elementType?.displayName || fiber?._debugOwner?.elementType?.name || "";
        const ancestors = [];
        let node = target.parentElement;
        for (let i = 0; node && i < 7; i++, node = node.parentElement) {
          const ancestorAttrs = {};
          for (const attr of node.attributes ?? []) if (/^(data-|aria-|role$)/.test(attr.name)) ancestorAttrs[attr.name] = attr.value;
          ancestors.push({ id: node.id || "", classes: typeof node.className === "string" ? node.className.slice(0, 240) : "", attrs: ancestorAttrs, tag: node.tagName || "", nth: nthOfType2(node) });
        }
        return { text: normalizeText(target.innerText || target.textContent), aria: target.getAttribute("aria-label") || "", id: target.id || "", classes: typeof target.className === "string" ? target.className.slice(0, 240) : "", role: target.getAttribute("role") || "", tag: target.tagName || "", nth: nthOfType2(target), attrs, ancestors, owner, runtimeRegistrations: runtimeRegistrations(target, slots) };
      }
      async function writeText(text) {
        try {
          await navigator.clipboard.writeText(text);
          return;
        } catch {
        }
        const input = document.createElement("textarea");
        input.value = text;
        input.setAttribute("readonly", "");
        Object.assign(input.style, { position: "fixed", left: "-9999px", top: "0", opacity: "0" });
        document.body.append(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        if (!copied) throw new Error("\u6D4F\u89C8\u5668\u62D2\u7EDD\u5199\u5165\u526A\u8D34\u677F");
      }
      async function deliverScreenshot(blob) {
        if (typeof ClipboardItem === "function" && navigator.clipboard?.write) {
          try {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            return "clipboard";
          } catch {
          }
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `dsh-element-inspector-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.png`;
        link.hidden = true;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1e4);
        return "download";
      }
      function apply(ctx) {
        style();
        const preferenceScope = ctx.settingsScope.bind({ namespace: SETTINGS_NAMESPACE });
        const h = React.createElement;
        let active = false;
        let current;
        let root2;
        let mask;
        let prefs = readStartupCache();
        let settingsSnapshot = preferenceScope.getSnapshot();
        let migrationStarted = false;
        let selectedInfo;
        let selectedElement;
        let previousView = "";
        let captureHotkey = false;
        let hideScheduled = false;
        let settingsCardCapturing = false;
        let noticeTimer;
        const hiddenOriginalDisplay = /* @__PURE__ */ new WeakMap();
        const cardStyles = {
          card: { padding: "20px", border: "1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1))", borderRadius: "8px", background: "var(--dsw-alias-bg-layer-1,#fff)", color: "var(--dsw-alias-label-primary,#17181c)" },
          title: { margin: "0", fontSize: "16px", fontWeight: 600, lineHeight: "24px" },
          description: { margin: "4px 0 18px", color: "var(--dsw-alias-label-secondary,#545860)", fontSize: "13px", lineHeight: "20px" },
          row: { display: "flex", alignItems: "center", gap: "12px", minHeight: "52px", borderTop: "1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1))" },
          main: { flex: 1, minWidth: 0 },
          label: { fontSize: "14px", fontWeight: 500, lineHeight: "20px" },
          detail: { overflow: "hidden", color: "var(--dsw-alias-label-tertiary,#74777d)", fontSize: "12px", lineHeight: "18px", textOverflow: "ellipsis", whiteSpace: "nowrap" },
          key: { minWidth: "52px", padding: "3px 8px", border: "1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1))", borderRadius: "6px", fontFamily: "Consolas,monospace", fontSize: "12px", textAlign: "center" },
          button: { minHeight: "32px", padding: "0 12px", border: "1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1))", borderRadius: "6px", background: "transparent", color: "inherit", cursor: "pointer" },
          danger: { minHeight: "30px", width: "30px", padding: 0, border: 0, borderRadius: "6px", background: "transparent", color: "var(--dsw-alias-state-error-primary,#c5221f)", cursor: "pointer", fontSize: "18px" },
          footer: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginTop: "16px" },
          status: { minHeight: "18px", color: "var(--dsw-alias-label-tertiary,#74777d)", fontSize: "12px", lineHeight: "18px" }
        };
        function InspectorSettingsCard() {
          const subscribe = React.useCallback((listener) => preferenceScope.subscribe(listener), []);
          const getSnapshot = React.useCallback(() => preferenceScope.getSnapshot(), []);
          const snapshot = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
          const value = normalizePrefs(snapshot.value);
          const writable = snapshot.status === "ready" && snapshot.writable;
          const [recording, setRecording] = React.useState(false);
          const [status, setStatus] = React.useState("");
          const [saving, setSaving] = React.useState(false);
          const savingRef = React.useRef(false);
          const saveCardPreference = async (field, nextValue, successMessage) => {
            if (savingRef.current) return false;
            const before = preferenceScope.getSnapshot();
            if (before.status !== "ready" || !before.writable) {
              setStatus(before.status === "loading" ? "\u8BBE\u7F6E\u4ECD\u5728\u540C\u6B65\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5" : "\u5F53\u524D DSH \u8BBE\u7F6E\u4E0D\u53EF\u5199");
              return false;
            }
            savingRef.current = true;
            setSaving(true);
            try {
              await preferenceScope.set(field, nextValue);
              const accepted = preferenceScope.getSnapshot();
              const persisted = accepted.status === "ready" && accepted.writable && accepted.revision !== before.revision && JSON.stringify(accepted.value?.[field]) === JSON.stringify(nextValue);
              setStatus(persisted ? successMessage : "\u8BBE\u7F6E\u4FDD\u5B58\u5931\u8D25\uFF0C\u5DF2\u6062\u590D DSH \u4E2D\u7684\u503C");
              return persisted;
            } catch (error) {
              setStatus(`\u4FDD\u5B58\u5931\u8D25\uFF1A${error instanceof Error ? error.message : String(error)}`);
              return false;
            } finally {
              savingRef.current = false;
              setSaving(false);
            }
          };
          React.useEffect(() => {
            if (!recording) return void 0;
            settingsCardCapturing = true;
            const capture = (event) => {
              event.preventDefault();
              event.stopImmediatePropagation();
              if (["Control", "Shift", "Alt", "Meta"].includes(event.key)) return;
              if (event.key === "Escape") {
                setRecording(false);
                return;
              }
              const hotkey = eventHotkey(event);
              setRecording(false);
              void saveCardPreference("hotkey", hotkey, `\u5FEB\u6377\u952E\u5DF2\u66F4\u65B0\u4E3A ${hotkey}`);
            };
            document.addEventListener("keydown", capture, true);
            return () => {
              settingsCardCapturing = false;
              document.removeEventListener("keydown", capture, true);
            };
          }, [recording]);
          const removeHidden = (rule) => {
            const latest = normalizePrefs(preferenceScope.getSnapshot().value).hidden;
            const target = JSON.stringify(rule);
            const index = latest.findIndex((item) => JSON.stringify(item) === target);
            if (index === -1) return;
            const hidden = latest.filter((_, current2) => current2 !== index);
            void saveCardPreference("hidden", hidden, "\u9690\u85CF\u89C4\u5219\u5DF2\u79FB\u9664");
          };
          const clearHidden = () => {
            void saveCardPreference("hidden", [], "\u9690\u85CF\u89C4\u5219\u5DF2\u6E05\u7A7A");
          };
          return h(
            "li",
            { style: cardStyles.card, "data-dsh-element-inspector-settings-card": "" },
            h("h3", { style: cardStyles.title }, "\u5143\u7D20\u68C0\u67E5\u5668"),
            h("p", { style: cardStyles.description }, "\u7BA1\u7406\u5143\u7D20\u62FE\u53D6\u5FEB\u6377\u952E\u4E0E\u5F53\u524D profile \u7684\u9690\u85CF\u89C4\u5219\u3002"),
            h(
              "div",
              { style: cardStyles.row },
              h("div", { style: cardStyles.main }, h("div", { style: cardStyles.label }, "\u5524\u8D77\u5FEB\u6377\u952E"), h("div", { style: cardStyles.detail }, "\u5FEB\u901F\u6309\u4E24\u6B21\u4ECD\u53EF\u6253\u5F00\u68C0\u67E5\u5668\u8BBE\u7F6E")),
              h("span", { style: cardStyles.key }, value.hotkey),
              h("button", { type: "button", style: cardStyles.button, disabled: !writable || saving, onClick: () => setRecording(true) }, recording ? "\u8BF7\u6309\u952E\u2026" : "\u66F4\u6539")
            ),
            ...value.hidden.map((rule, index) => h(
              "div",
              { style: cardStyles.row, key: `${index}:${rule.text || rule.id || rule.tag}` },
              h("div", { style: cardStyles.main }, h("div", { style: cardStyles.label }, rule.text || rule.id || rule.classes?.join(" ") || "\u65E0\u6587\u672C\u5143\u7D20"), h("div", { style: cardStyles.detail }, `${rule.tag || "*"}${rule.id ? ` #${rule.id}` : ""}`)),
              h("button", { type: "button", style: cardStyles.danger, disabled: !writable || saving, title: "\u53D6\u6D88\u9690\u85CF", "aria-label": "\u53D6\u6D88\u9690\u85CF", onClick: () => removeHidden(rule) }, "\xD7")
            )),
            h(
              "div",
              { style: cardStyles.footer },
              h("span", { style: cardStyles.status, role: "status" }, status || (snapshot.status === "loading" ? "\u6B63\u5728\u540C\u6B65\u8BBE\u7F6E" : `${value.hidden.length} \u6761\u9690\u85CF\u89C4\u5219`)),
              value.hidden.length ? h("button", { type: "button", style: cardStyles.button, disabled: !writable || saving, onClick: clearHidden }, "\u5168\u90E8\u53D6\u6D88\u9690\u85CF") : null
            )
          );
        }
        ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
          name: "settings.plugin.item",
          key: SETTINGS_NAMESPACE
        }, InspectorSettingsCard));
        const close = () => {
          active = false;
          current = void 0;
          selectedInfo = void 0;
          selectedElement = void 0;
          previousView = "";
          clearTimeout(noticeTimer);
          root2?.remove();
          root2 = void 0;
          mask = void 0;
        };
        const render = (html) => {
          if (root2) root2.innerHTML = html;
        };
        const panel = (title, body, options = {}) => `<div class="dei-scrim"></div><section class="dei-panel" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header class="dei-header">${options.back ? '<button type="button" class="dei-back" aria-label="\u8FD4\u56DE" title="\u8FD4\u56DE">\u2039</button>' : ""}<div class="dei-heading"><p class="dei-eyebrow">${BRAND}</p><h3 class="dei-title">${esc(title)}</h3></div><button type="button" class="dei-close" aria-label="\u5173\u95ED" title="\u5173\u95ED">\xD7</button></header><div class="dei-body">${body}</div></section>`;
        const notify = (message, error = false) => {
          if (!root2) return;
          clearTimeout(noticeTimer);
          root2.querySelector(".dei-notice")?.remove();
          const notice = document.createElement("div");
          notice.className = `dei-notice${error ? " dei-notice-error" : ""}`;
          notice.setAttribute("role", "status");
          notice.textContent = message;
          root2.querySelector(".dei-body")?.append(notice);
          noticeTimer = setTimeout(() => notice.remove(), 3200);
        };
        const savePreference = async (field, value) => {
          const snapshot = preferenceScope.getSnapshot();
          if (snapshot.status !== "ready" || !snapshot.writable) {
            notify(snapshot.status === "loading" ? "\u8BBE\u7F6E\u4ECD\u5728\u540C\u6B65\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5" : "\u5F53\u524D DSH \u8BBE\u7F6E\u4E0D\u53EF\u5199", true);
            return false;
          }
          const previous = prefs;
          prefs = normalizePrefs({ ...prefs, [field]: value });
          await preferenceScope.set(field, value);
          const accepted = preferenceScope.getSnapshot();
          const persisted = accepted.status === "ready" && accepted.writable && accepted.revision !== snapshot.revision && JSON.stringify(accepted.value?.[field]) === JSON.stringify(value);
          if (!persisted) {
            prefs = accepted.status === "ready" ? normalizePrefs(accepted.value) : previous;
            notify("\u8BBE\u7F6E\u4FDD\u5B58\u5931\u8D25\uFF0C\u5DF2\u6062\u590D DSH \u4E2D\u7684\u503C", true);
            return false;
          }
          writeStartupCache(prefs);
          return true;
        };
        const applyHidden = () => {
          if (!document.body) return;
          const elements = [...document.body.querySelectorAll("*")].filter((element) => !element.closest(`#${ROOT_ID}`));
          const hiddenElements = resolveUniqueHiddenMatches(elements, prefs.hidden, matchesHiddenElement);
          for (const element of elements) {
            const hidden = hiddenElements.has(element);
            if (hidden) {
              if (element.getAttribute("data-dei-hidden") !== "1") hiddenOriginalDisplay.set(element, { value: element.style.getPropertyValue("display"), priority: element.style.getPropertyPriority("display") });
              element.setAttribute("data-dei-hidden", "1");
              element.style.setProperty("display", "none", "important");
            } else if (element.getAttribute("data-dei-hidden") === "1") {
              element.removeAttribute("data-dei-hidden");
              const original = hiddenOriginalDisplay.get(element);
              if (original?.value) element.style.setProperty("display", original.value, original.priority);
              else element.style.removeProperty("display");
              hiddenOriginalDisplay.delete(element);
            }
          }
        };
        const scheduleHidden = () => {
          if (hideScheduled) return;
          hideScheduled = true;
          queueMicrotask(() => {
            hideScheduled = false;
            applyHidden();
          });
        };
        const exportActions = () => '<div class="dei-section-title">\u5BFC\u51FA\u5143\u7D20</div><div class="dei-actions"><button type="button" class="dei-button dei-small dei-outline dei-screenshot">\u622A\u56FE</button><button type="button" class="dei-button dei-small dei-outline dei-copy-html">\u590D\u5236 HTML</button><button type="button" class="dei-button dei-small dei-outline dei-copy-markdown">\u590D\u5236 Markdown</button></div>';
        const settings = () => {
          active = false;
          if (!root2) {
            root2 = document.createElement("div");
            root2.id = ROOT_ID;
            document.body.append(root2);
          }
          if (root2.querySelector(".dei-panel") && !root2.querySelector(".dei-capture-hotkey")) previousView = root2.innerHTML;
          const rows = prefs.hidden.length ? prefs.hidden.map((rule, index) => `<div class="dei-rule-row"><div class="dei-row-main"><div class="dei-row-title">${esc(rule.text || rule.id || rule.classes?.join(" ") || "\u65E0\u6587\u672C\u5143\u7D20")}</div><p class="dei-row-description">${esc(rule.tag || "*")}${rule.id ? ` #${esc(rule.id)}` : ""}${rule.classes?.length ? ` \xB7 .${esc(rule.classes.join("."))}` : ""}</p></div><button type="button" class="dei-button dei-small dei-danger dei-remove-hidden" data-index="${index}">\u53D6\u6D88\u9690\u85CF</button></div>`).join("") : '<div class="dei-empty">\u6CA1\u6709\u9690\u85CF\u7684\u5143\u7D20</div>';
          const syncLabel = settingsSnapshot.status === "ready" ? settingsSnapshot.writable ? "\u5DF2\u540C\u6B65\u5230 DSH" : "DSH \u8BBE\u7F6E\u53EA\u8BFB" : settingsSnapshot.status === "loading" ? "\u6B63\u5728\u540C\u6B65 DSH \u8BBE\u7F6E" : "DSH \u8BBE\u7F6E\u4E0D\u53EF\u7528";
          const body = `<div class="dei-settings-group"><div class="dei-settings-row"><div class="dei-row-main"><div class="dei-row-title">\u5524\u8D77\u5FEB\u6377\u952E</div><p class="dei-row-description">\u6309\u4E00\u6B21\u62FE\u53D6\u5143\u7D20\uFF0C\u5FEB\u901F\u6309\u4E24\u6B21\u6253\u5F00\u8BBE\u7F6E \xB7 ${syncLabel}</p></div><span class="dei-hotkey">${esc(prefs.hotkey)}</span><button type="button" class="dei-button dei-small dei-outline dei-capture-hotkey"${settingsSnapshot.status === "ready" && settingsSnapshot.writable ? "" : " disabled"}>\u66F4\u6539</button></div></div><div class="dei-section-title">\u5DF2\u9690\u85CF (${prefs.hidden.length})</div><div class="dei-settings-group">${rows}</div>${prefs.hidden.length ? '<div class="dei-actions"><button type="button" class="dei-button dei-small dei-danger dei-clear-hidden">\u5168\u90E8\u53D6\u6D88\u9690\u85CF</button></div>' : ""}`;
          render(panel("\u8BBE\u7F6E", body, { back: Boolean(previousView) }));
        };
        const start = () => {
          if (active) return close();
          active = true;
          previousView = "";
          root2?.remove();
          root2 = document.createElement("div");
          root2.id = ROOT_ID;
          document.body.append(root2);
          render(`<div class="dei-badge"><span class="dei-radar-dot"></span><span>${BRAND}\u5DF2\u5F00\u542F \xB7 \u5355\u51FB\u9009\u62E9 \xB7 Esc \u9000\u51FA</span></div><div class="dei-mask"></div>`);
          mask = root2.querySelector(".dei-mask");
        };
        const move = (event) => {
          if (!active || !root2 || root2.contains(event.target)) return;
          current = event.target instanceof Element ? event.target : void 0;
          if (!current || !mask) return;
          const rect = current.getBoundingClientRect();
          Object.assign(mask.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
        };
        const pick = async (event) => {
          if (!active || !current || root2?.contains(event.target)) return;
          event.preventDefault();
          event.stopPropagation();
          active = false;
          selectedElement = current;
          const info = targetInfo(selectedElement, ctx.slots);
          selectedInfo = info;
          render(panel("\u6B63\u5728\u5206\u6790", '<div class="dei-summary"><p>\u6B63\u5728\u68C0\u67E5\u5143\u7D20\u6807\u8BB0\u4E0E\u5F53\u524D profile \u7684 DSH \u53CA\u63D2\u4EF6\u6E90\u7801\u2026</p></div>'));
          try {
            const data = await callHost(ctx, "resolve", info);
            const results = data.results || [];
            const hits = results.map((hit, index) => {
              const ownerName = hit.ownerName || hit.packageName;
              const sourceActions = hit.ownerType === "dsh" ? "" : `<div class="dei-actions"><button type="button" class="dei-button dei-small dei-outline dei-open-folder" data-package="${esc(hit.packageName)}">\u6253\u5F00\u63D2\u4EF6\u6587\u4EF6\u5939</button><button type="button" class="dei-button dei-small dei-open-repo" data-package="${esc(hit.packageName)}"${hit.repositoryUrl ? "" : " disabled"}>\u6253\u5F00\u6E90\u4ED3\u5E93</button></div>`;
              return `<details class="dei-hit"${index === 0 ? " open" : ""}><summary><span class="dei-hit-name">${esc(ownerName)} \xB7 v${esc(hit.version)}</span><span class="dei-hit-score">${esc(hit.score)} \u5206</span></summary><div class="dei-hit-body">${hit.files.map((file) => `<div class="dei-file"><code>${esc(file.file)}</code>${file.evidence?.length ? `<br>${esc(file.evidence.join(" \xB7 "))}` : ""}</div>`).join("")}${sourceActions}</div></details>`;
            }).join("");
            const top = results[0];
            const heading = top ? top.ownerType === "dsh" ? data.certainty === "confirmed" ? "\u5DF2\u786E\u8BA4\u6765\u81EA DSH" : "\u53EF\u80FD\u6765\u81EA DSH" : data.certainty === "confirmed" ? "\u5DF2\u786E\u8BA4\u5143\u7D20\u5F52\u5C5E" : "\u53EF\u80FD\u7684\u5143\u7D20\u5F52\u5C5E" : "\u6CA1\u6709\u627E\u5230\u5143\u7D20\u5F52\u5C5E";
            const owner = info.owner ? `<span>\u7EC4\u4EF6 ${esc(info.owner)}</span>` : "";
            const proposedRule = createHiddenRule(info);
            const canHide = Boolean(proposedRule.id || proposedRule.classes.length || Object.keys(proposedRule.attrs).length || proposedRule.text);
            const reason = data.reasons?.[0] ? `<span>${esc(data.reasons[0])}</span>` : "";
            const summary = top ? `<div class="dei-conclusion"><div class="dei-conclusion-head"><span class="dei-conclusion-mark">${data.certainty === "confirmed" ? "\u2713" : "?"}</span><div class="dei-plugin-name">${esc(top.ownerName || top.packageName)}</div><span class="dei-pill ${data.certainty === "confirmed" ? "dei-pill-confirmed" : "dei-pill-candidate"}">${data.certainty === "confirmed" ? "\u5DF2\u786E\u8BA4" : "\u5F85\u786E\u8BA4"}</span></div><div class="dei-meta"><span>v${esc(top.version)}</span><span>\u8BC1\u636E\u5206 ${esc(top.score)}</span>${owner}${reason}</div></div>` : '<div class="dei-conclusion"><p>\u8FD9\u4E2A\u5143\u7D20\u53EF\u80FD\u6765\u81EA\u52A8\u6001\u5185\u5BB9\u6216\u7EAF\u6837\u5F0F\uFF0C\u5F53\u524D profile \u4E2D\u6CA1\u6709\u8DB3\u591F\u7684\u5F52\u5C5E\u8BC1\u636E\u3002</p></div>';
            const elementLabel = info.text || info.aria || `${String(info.tag || "element").toLowerCase()} \u5143\u7D20`;
            const text = `<div class="dei-element"><div class="dei-element-label">\u6240\u9009\u5143\u7D20</div><div class="dei-element-value" title="${esc(elementLabel)}">${esc(elementLabel)}</div></div>`;
            const actions = `<div class="dei-actions">${canHide ? '<button type="button" class="dei-button dei-primary dei-hide-current">\u9690\u85CF\u6B64\u5143\u7D20</button>' : ""}<button type="button" class="dei-button dei-outline dei-settings">\u63D2\u4EF6\u8BBE\u7F6E</button></div>`;
            render(panel(heading, `${summary}${text}${actions}${exportActions()}${hits ? `<div class="dei-section-title">${data.certainty === "confirmed" ? "\u5224\u65AD\u4F9D\u636E" : "\u5019\u9009\u5F52\u5C5E"}</div>${hits}` : ""}`));
          } catch (error) {
            render(panel("\u5206\u6790\u5931\u8D25", `<p class="dei-error">${esc(error)}</p>${exportActions()}<div class="dei-actions"><button type="button" class="dei-button dei-primary dei-settings">\u6253\u5F00\u8BBE\u7F6E</button></div>`));
          }
        };
        const action = async (event) => {
          const element = event.target instanceof Element ? event.target : void 0;
          if (element?.classList.contains("dei-scrim")) return close();
          if (element?.closest(".dei-back")) {
            if (previousView) {
              const view = previousView;
              previousView = "";
              render(view);
            } else close();
            return;
          }
          if (element?.closest(".dei-settings")) return settings();
          if (element?.closest(".dei-capture-hotkey")) {
            captureHotkey = true;
            element.textContent = "\u8BF7\u6309\u4E0B\u65B0\u7684\u5FEB\u6377\u952E\u2026";
            return;
          }
          const remove2 = element?.closest(".dei-remove-hidden");
          if (remove2) {
            const hidden = prefs.hidden.filter((_, index) => index !== Number(remove2.dataset.index));
            if (await savePreference("hidden", hidden)) {
              scheduleHidden();
              settings();
            }
            ;
            return;
          }
          if (element?.closest(".dei-clear-hidden")) {
            if (await savePreference("hidden", [])) {
              scheduleHidden();
              settings();
            }
            ;
            return;
          }
          if (element?.closest(".dei-hide-current") && selectedInfo) {
            const rule = createHiddenRule(selectedInfo);
            const hidden = prefs.hidden.some((item) => JSON.stringify(item) === JSON.stringify(rule)) ? prefs.hidden : [...prefs.hidden, rule];
            if (await savePreference("hidden", hidden)) {
              applyHidden();
              settings();
            }
            ;
            return;
          }
          const exportButton = element?.closest(".dei-screenshot,.dei-copy-html,.dei-copy-markdown");
          if (exportButton && root2?.contains(exportButton)) {
            event.preventDefault();
            event.stopPropagation();
            if (!selectedElement) return notify("\u6240\u9009\u5143\u7D20\u5DF2\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9", true);
            const originalLabel2 = exportButton.textContent;
            exportButton.disabled = true;
            exportButton.textContent = "\u5904\u7406\u4E2D\u2026";
            try {
              if (exportButton.classList.contains("dei-screenshot")) {
                const destination = await deliverScreenshot(await captureElementPng(selectedElement, ROOT_ID, window.devicePixelRatio));
                notify(destination === "clipboard" ? "\u5143\u7D20\u622A\u56FE\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F" : "\u5143\u7D20\u622A\u56FE\u5DF2\u4E0B\u8F7D\u4E3A PNG");
              } else if (exportButton.classList.contains("dei-copy-html")) {
                await writeText(serializeElement(selectedElement, ROOT_ID));
                notify("\u5143\u7D20 HTML \u5DF2\u590D\u5236");
              } else {
                await writeText(elementToMarkdown(selectedElement, ROOT_ID));
                notify("\u5143\u7D20 Markdown \u5DF2\u590D\u5236");
              }
            } catch (error) {
              notify(`\u5BFC\u51FA\u5931\u8D25\uFF1A${error instanceof Error ? error.message : String(error)}`, true);
            } finally {
              exportButton.disabled = false;
              exportButton.textContent = originalLabel2;
            }
            return;
          }
          const button = element?.closest("button[data-package]");
          if (!button || !root2?.contains(button)) return;
          event.preventDefault();
          event.stopPropagation();
          const endpoint = button.classList.contains("dei-open-folder") ? "open-folder" : "open-repository";
          button.disabled = true;
          const originalLabel = button.textContent;
          button.textContent = "\u6B63\u5728\u6253\u5F00\u2026";
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5e3);
          try {
            await callHost(ctx, endpoint, { packageName: button.dataset.package }, controller.signal);
            button.disabled = false;
            button.textContent = originalLabel;
            notify(endpoint === "open-folder" ? "\u63D2\u4EF6\u6587\u4EF6\u5939\u5DF2\u5728\u6587\u4EF6\u7BA1\u7406\u5668\u4E2D\u6253\u5F00" : "\u6E90\u4ED3\u5E93\u5DF2\u5728\u6D4F\u89C8\u5668\u4E2D\u6253\u5F00");
          } catch (error) {
            button.disabled = false;
            button.textContent = originalLabel;
            notify(error?.name === "AbortError" ? "\u6253\u5F00\u64CD\u4F5C\u8D85\u65F6\uFF0C\u8BF7\u91CD\u8BD5" : `\u6253\u5F00\u5931\u8D25\uFF1A${error instanceof Error ? error.message : String(error)}`, true);
          } finally {
            clearTimeout(timeout);
          }
        };
        const click = (event) => {
          if (event.target instanceof Element && event.target.closest(".dei-close")) return close();
          return pick(event);
        };
        const key = (event) => {
          if (settingsCardCapturing) return;
          if (captureHotkey) {
            if (event.key === "Escape") {
              captureHotkey = false;
              return settings();
            }
            ;
            if (event.key === "Control" || event.key === "Shift" || event.key === "Alt" || event.key === "Meta") return;
            const hotkey = eventHotkey(event);
            captureHotkey = false;
            void savePreference("hotkey", hotkey).then(() => settings());
            return;
          }
          if (eventHotkey(event) === prefs.hotkey) {
            event.preventDefault();
            const now = Date.now();
            if (key.last && now - key.last < 550) return settings();
            key.last = now;
            return start();
          }
          if (event.key === "Escape" && (active || root2)) close();
        };
        key.last = 0;
        const observer = new MutationObserver(scheduleHidden);
        observer.observe(document.documentElement, { childList: true, subtree: true });
        const syncPreferences = () => {
          settingsSnapshot = preferenceScope.getSnapshot();
          if (settingsSnapshot.status !== "ready") return;
          prefs = normalizePrefs(settingsSnapshot.value);
          writeStartupCache(prefs);
          scheduleHidden();
          if (root2?.querySelector('.dei-panel[aria-label="\u8BBE\u7F6E"]') && !captureHotkey) settings();
          const user = settingsSnapshot.user;
          const hasUserPreference = user && typeof user === "object" && ("hotkey" in user || "hidden" in user);
          const legacy = !migrationStarted && !hasUserPreference ? readLegacyPrefs() : void 0;
          if (!legacy) return;
          migrationStarted = true;
          void (async () => {
            await preferenceScope.set("hotkey", legacy.hotkey);
            await preferenceScope.set("hidden", legacy.hidden);
            const accepted = preferenceScope.getSnapshot().value;
            if (accepted?.hotkey === legacy.hotkey && JSON.stringify(accepted?.hidden) === JSON.stringify(legacy.hidden)) {
              try {
                localStorage.removeItem(LEGACY_STORAGE_KEY);
              } catch {
              }
            }
          })();
        };
        const unsubscribePreferences = preferenceScope.subscribe(syncPreferences);
        syncPreferences();
        applyHidden();
        document.addEventListener("keydown", key, true);
        document.addEventListener("mousemove", move, true);
        document.addEventListener("click", action, true);
        document.addEventListener("click", click, true);
        ctx.effect(() => () => {
          unsubscribePreferences();
          observer.disconnect();
          document.removeEventListener("keydown", key, true);
          document.removeEventListener("mousemove", move, true);
          document.removeEventListener("click", action, true);
          document.removeEventListener("click", click, true);
          close();
          document.getElementById(STYLE_ID)?.remove();
        }, "dsh-element-inspector: listeners");
      }
      module.exports = { apply, inject: ["settingsScope", "connection", "slots"] };
      return module.exports;
    }
  });
})();
