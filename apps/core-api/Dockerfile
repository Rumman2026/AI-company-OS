FROM node:20-alpine
WORKDIR /usr/src/app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@8.16.1 --activate
COPY . .
RUN pnpm install --frozen-lockfile
CMD ["pnpm", "dev"]
