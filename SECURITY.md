# Security Policy

## Supported versions

Security fixes are provided for the latest release only.

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub Security Advisories for this repository. Do not include credentials, private conversation content, or local profile files in a public issue.

dsh-element-inspector runs locally. It reads only the exact client bundles in DSH's current server-side client module graph. Identification and native open actions use DSH Connection's loopback-only RPC, and every open action revalidates the package against the current graph, bundle path, and manifest identity. Preferences use the official DSH settings service. The plugin does not upload inspected element data, source, screenshots, HTML, or Markdown.
