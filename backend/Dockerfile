FROM golang:1.23-alpine AS build
WORKDIR /app
COPY backend/go.mod backend/go.sum* ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/backend ./cmd/server

FROM alpine:3.22
RUN adduser -D app
USER app
WORKDIR /home/app
COPY --from=build /bin/backend /usr/local/bin/backend
EXPOSE 8080
ENTRYPOINT ["backend"]
