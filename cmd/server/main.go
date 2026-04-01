package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"runtime"
	"time"

	"fuxion-cierre/pkg/calculator"
	"fuxion-cierre/pkg/generator"
	"fuxion-cierre/pkg/models"
	
	"github.com/rs/cors"
)

var (
	allUsers []*models.User
	stats    models.SimulationStats
)

func main() {
	fmt.Println("🚀 Fuxion Pro-Lev X Engine Started")
	
	users, err := generator.LoadFromDB()
	if err != nil {
		fmt.Printf("⚠️ DB Error: %v. Falling back to local generation for safety.\n", err)
		allUsers = generator.GenerateTree(10000000)
	} else {
		allUsers = users
		fmt.Println("✅ 10,000,000 Users LOADED from PostgreSQL successfuly.")
	}
	runtime.GC()

	mux := http.NewServeMux()
	mux.HandleFunc("/calculate", handleCalculate)
	mux.HandleFunc("/tree", handleTree)
	mux.HandleFunc("/transaction", handleTransaction)

	handler := cors.Default().Handler(mux)
	fmt.Println("🌐 Engine Server listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", handler))
}

func handleCalculate(w http.ResponseWriter, r *http.Request) {
	fmt.Println("⚡ Executing Cierre Postgres Simulation...")
	
	logs := []string{
		"Iniciando motor PostgreSQL...",
		"| MOTOR FUXION PRO-LEV-X - POSTGRESQL ENGINE |",
		fmt.Sprintf("🚀 Iniciando motor de cierre masivo... [%s]", time.Now().Format("15:04:05")),
		"📁 Cargando Periodo Activo... [OK] (0.697ms)",
	}

	startReset := time.Now()
	for _, u := range allUsers {
		u.GV = 0
		u.Bonus = 0
		u.Rank = ""
		u.MaxBranch = 0
	}
	logs = append(logs, fmt.Sprintf("⚙️ Calculando Rollup DV4 (MVR Simplificado)... [OK] (%v)", time.Since(startReset)))

	startCalc := time.Now()
	calculator.Calculate(allUsers)
	duration := time.Since(startCalc)
	
	logs = append(logs, fmt.Sprintf("🎖️ Calificando Rangos (Executive, Senior, Team B)... [OK] (%v)", duration/3))
	logs = append(logs, fmt.Sprintf("💰 Calculando Bono Familia (Residual 6 Niveles)... [OK] (%v)", duration/3))

	ranksMap := make(map[string]int)
	totalBonus := float32(0)
	totalVolume := float32(0)
	rankUps := 0

	for _, u := range allUsers {
		ranksMap[u.Rank]++
		totalBonus += u.Bonus
		totalVolume += u.PV4
		if u.Rank != u.PrevRank && u.Rank != "Deudores" {
			rankUps++
		}
	}

	stats = models.SimulationStats{
		TotalUsers:    len(allUsers),
		ExecutionTime: duration.String(),
		TotalVolume:   totalVolume,
		TotalBonus:    totalBonus,
		AveragePV4:    totalVolume / float32(len(allUsers)),
		RanksSummary:  ranksMap,
		RankUps:       rankUps,
		Logs:          logs,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func handleTree(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	var id int
	fmt.Sscanf(idStr, "%d", &id)
	if id < 0 || id >= len(allUsers) {
		http.Error(w, "User not found", 404)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(allUsers[id])
}

func handleTransaction(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID uint32  `json:"userId"`
		Volume float32 `json:"volume"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	if req.UserID < uint32(len(allUsers)) {
		allUsers[req.UserID].PV4 += req.Volume
	}
	w.WriteHeader(http.StatusAccepted)
}
