FROM debian:bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    g++ make libpq-dev ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY cmd/cpp_server ./cmd/cpp_server
WORKDIR /app/cmd/cpp_server
RUN make all

FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/cmd/cpp_server/fuxion-cpp-engine /app/fuxion-cpp-engine
EXPOSE 8081
ENV DATABASE_URL=""
ENV CPP_ENGINE_USER_COUNT=100000
ENTRYPOINT ["/app/fuxion-cpp-engine"]

