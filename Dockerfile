FROM oven/bun as build

WORKDIR /usr/src/app

COPY package.json bun.lock ./
RUN bun i --production

COPY . .

RUN bun run build

FROM devforth/spa-to-http
ENV BROTLI=true
ENV THRESHOLD=512
COPY --from=build /usr/src/app/dist .
