FROM golang:tip-alpine3.23
WORKDIR /app
COPY go.mod .
RUN go mod download
COPY backend/ .

RUN go build -o main .
CMD ["./main"]

FROM node:lts-alpine3.23
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY *config*.* .
COPY web/ web/
RUN npm run build

FROM scratch
WORKDIR /app
COPY --from=0 /app/main .
COPY --from=1 /app/web/out ./web/out
EXPOSE 8080
CMD ["./main"]