.PHONY: run build test tidy

run:
	go run ./cmd/server/main.go

build:
	go build -o bin/server ./cmd/server/main.go

test:
	go test ./... -v

tidy:
	go mod tidy

test-unit:
	go test ./tests/unit/... -v

test-integration:
	go test ./tests/integration/... -v
