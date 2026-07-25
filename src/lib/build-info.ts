// THE BUILD-TIME BOUNDARY: the single module that reads the constant vite
// bakes in (see vite.config.js). Everything else works with a plain
// BuildInfo object, so the core stays testable without a bundler.

import type { BuildInfo } from "$lib/core/build-info";

export const BUILD_INFO: BuildInfo = __MYTODO_BUILD__;
