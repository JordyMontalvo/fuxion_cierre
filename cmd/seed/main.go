package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
)

func main() {
	// DB Connection string (adjust as needed)
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/fuxion"
	}

	conn, err := pgx.Connect(context.Background(), dbURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to connect to database: %v\n", err)
		os.Exit(1)
	}
	defer conn.Close(context.Background())

	fmt.Println("🚀 Starting 10,000,000 users DB seeding...")
	start := time.Now()

	// Initial root user
	_, err = conn.Exec(context.Background(), "INSERT INTO users (id, sponsor_id, name, pv4, level) VALUES (1, 1, 'Root', 500, 0)")
	if err != nil {
		log.Printf("Root might exist: %v", err)
	}

	// Fastest way to insert 10M: COPY command
	// We'll simulate 10M rows in memory and stream them to Postgres
	copyData := [][]interface{}{}
	batchSize := 100000

	for i := 2; i <= 10000000; i++ {
		sponsorID := rand.Intn(i-1) + 1
		pv4 := 0
		if rand.Float32() > 0.2 {
			pv4 = rand.Intn(100) + 10
		}
		
		copyData = append(copyData, []interface{}{
			int32(i),
			int32(sponsorID),
			fmt.Sprintf("User_%d", i),
			float32(pv4),
			int32(0), // level updated later or during generation
		})

		if len(copyData) == batchSize {
			_, err = conn.CopyFrom(
				context.Background(),
				pgx.Identifier{"users"},
				[]string{"id", "sponsor_id", "name", "pv4", "level"},
				pgx.CopyFromRows(copyData),
			)
			if err != nil {
				log.Fatal("Copy failed: ", err)
			}
			fmt.Printf("✅ Inserted %d users...\n", i)
			copyData = [][]interface{}{}
		}
	}

	fmt.Printf("💎 Successfully seeded 10,000,000 users in %v\n", time.Since(start))
}
