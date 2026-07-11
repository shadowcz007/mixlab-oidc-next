import React from "react";
import type { DocsThemeConfig } from "nextra-theme-docs";

const config: DocsThemeConfig = {
  logo: <span style={{ fontWeight: 700 }}>mixlab-oidc-next</span>,
  project: {
    link: "https://github.com/shadowcz007/mixlab-oidc-next",
  },
  chat: {
    link: "https://github.com/shadowcz007/mixlab-oidc-next/issues",
  },
  docsRepositoryBase:
    "https://github.com/shadowcz007/mixlab-oidc-next/blob/main/docs",
  footer: {
    text: (
      <span>
        MIT {new Date().getFullYear()} ©{" "}
        <a href="https://github.com/shadowcz007" target="_blank" rel="noreferrer">
          shadowcz007
        </a>
      </span>
    ),
  },
};

export default config;