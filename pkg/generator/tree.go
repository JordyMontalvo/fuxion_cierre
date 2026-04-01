package generator

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"os"

	"fuxion-cierre/pkg/models"
	"github.com/jackc/pgx/v5"
)

func GenerateTree(count int) []*models.User {
	users := make([]*models.User, count)
	users[0] = &models.User{ID: 0, SponsorID: 0, PV4: float32(rand.Intn(500)), Level: 0}
	for i := 1; i < count; i++ {
		sponsorID := uint32(rand.Intn(i))
		pv4 := float32(0)
		if rand.Float32() > 0.2 { pv4 = float32(rand.Intn(100) + 50) }
		users[i] = &models.User{ID: uint32(i), SponsorID: sponsorID, PV4: pv4, Level: users[sponsorID].Level + 1}
		users[sponsorID].Children = append(users[sponsorID].Children, uint32(i))
	}
	return users
}

func LoadFromDB() ([]*models.User, error) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" { dbURL = "postgres://postgres:postgres@localhost:5432/fuxion" }
	
	conn, err := pgx.Connect(context.Background(), dbURL)
	if err != nil { return nil, err }
	defer conn.Close(context.Background())

	fmt.Println("🔍 Fetching 10,000,000 users from PostgreSQL...")
	rows, err := conn.Query(context.Background(), "SELECT id, COALESCE(sponsor_id, 0), pv4, level FROM users ORDER BY id ASC")
	if err != nil { return nil, err }
	defer rows.Close()

	users := []*models.User{}
	for rows.Next() {
		u := &models.User{}
		if err := rows.Scan(&u.ID, &u.SponsorID, &u.PV4, &u.Level); err != nil {
			log.Printf("Scan error: %v", err)
			continue
		}
		users = append(users, u)
	}

	// Rebuild in-memory children tree for O(n) traversal
	fmt.Println("🌳 Rebuilding tree structure in memory...")
	for i, u := range users {
		if u.ID != 0 && u.SponsorID < uint32(len(users)) && u.SponsorID != u.ID {
			users[u.SponsorID].Children = append(users[u.SponsorID].Children, u.ID)
		}
		if i % 1000000 == 0 { fmt.Printf("✅ Processed %d nodes...\n", i) }
	}

	return users, nil
}
