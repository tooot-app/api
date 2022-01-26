# [tooot](https://github.com/tooot-app/app) API monorepo

[![GPL-3.0](https://img.shields.io/github/license/tooot-app/api)](LICENSE) ![GitHub Workflow Status (branch)](https://img.shields.io/github/workflow/status/tooot-app/api/Deploy%20tooot%20API%20services/release) ![Chromium HSTS preload](https://img.shields.io/hsts/preload/api.tooot.app)

<a href="https://www.buymeacoffee.com/xmflsct" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-yellow.png" alt="Buy Me A Coffee" height="50" width="217"></a>

This mono contains the following services:

- [push service](/packages/push) for [tooot app](https://github.com/tooot-app/app)
- [translate service](/packages/translate) for [tooot app](https://github.com/tooot-app/app)

Both services are running on [Cloudflare Workers](https://workers.cloudflare.com/). The data needed for the push service are stored in [Durable Objects](https://developers.cloudflare.com/workers/runtime-apis/durable-objects).