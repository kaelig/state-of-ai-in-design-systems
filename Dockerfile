# The image Render builds and runs. See render.yaml.
#
# Two runtimes, both pinned, because the build needs both: Node 24 from .nvmrc
# and Python 3.12 from runtime.txt. Netlify reads those two files itself; Render's
# native runtimes pin one language per service, so the pinning moves in here.
# Ubuntu 24.04 is the base because its python3 is 3.12 with no third-party
# archive involved, and Node comes from the tarball nodejs.org publishes, which
# pins a whole version rather than the head of a major.
#
# Bump NODE_VERSION and .nvmrc together, and the build is the check: prerender.mjs
# calls RegExp.escape, which is Node 24 and above.
#
# linux-x64 rather than a $TARGETARCH lookup because Render builds and runs on
# amd64. Building this image on an arm64 laptop needs the arch in the URL changed.

FROM ubuntu:24.04 AS node
ARG NODE_VERSION=24.11.1
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl xz-utils \
  && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
    | tar -xJ -C /usr/local --strip-components=1 \
      --exclude CHANGELOG.md --exclude LICENSE --exclude README.md \
  && apt-get purge -y --auto-remove curl xz-utils \
  && rm -rf /var/lib/apt/lists/* \
  && node --version && npm --version

# ---------------------------------------------------------------------------
# Build. The same ./scripts/build.sh the Netlify deploy runs, so this deploy
# proves the same thing: that every published surface is reproducible from
# data/, and that a record failing its schema fails the deploy rather than
# reaching the site.
# ---------------------------------------------------------------------------
FROM node AS build
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 \
  && rm -rf /var/lib/apt/lists/* \
  && python3 --version

WORKDIR /app

# Dependencies first: this layer is rebuilt when the lockfile moves, not on every
# data correction. Not --omit=dev — scripts/build_dashboard.py reads three
# platform marks out of node_modules/simple-icons, which is a build-time
# dependency no JavaScript import accounts for.
COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .
RUN ./scripts/build.sh

# ---------------------------------------------------------------------------
# Runtime. No Python: the build is over, and server/index.mjs is Node.
# ---------------------------------------------------------------------------
FROM node AS runtime
ENV NODE_ENV=production
WORKDIR /app

# build/ is not a leftover here. netlify/functions/mcp.mjs imports payload.json
# and md-map.json out of it and server/index.mjs imports md-routes.json; on
# Netlify esbuild inlines the first two into the function bundle, and nothing
# bundles anything here.
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/dashboard ./dashboard
COPY --from=build /app/netlify/functions ./netlify/functions
COPY --from=build /app/server ./server

# Render sets PORT and expects the process to bind it on every interface;
# server/index.mjs reads both. This is the local default, for `docker run -p`.
EXPOSE 8888
CMD ["node", "server/index.mjs"]
