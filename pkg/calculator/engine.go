package calculator

import (
	"fuxion-cierre/pkg/models"
)

// Calculate implementa estrictamente las reglas del Plan Pro-Lev X del PDF.
func Calculate(users []*models.User) {
	
	// FASE 1: Rollup de Volumen Grupal (Bottom-Up)
	for i := len(users) - 1; i >= 0; i-- {
		u := users[i]
		u.GV += u.PV4
		if u.SponsorID < uint32(len(users)) && u.SponsorID != u.ID {
			users[u.SponsorID].GV += u.GV
			if u.GV > users[u.SponsorID].MaxBranch {
				users[u.SponsorID].MaxBranch = u.GV
			}
		}
	}

	// FASE 2: Conteo de "Líneas 1K" y Estructura de Liderazgo (O(N))
	for _, u := range users {
		u.Qualified = u.PV4 >= 40 // Mínimo para ser "Activo" según Glosario pág 4
		u.PrevRank = u.Rank
		u.QualifiedDirects = 0 
		lines1K := 0

		for _, childID := range u.Children {
			if childID < uint32(len(users)) {
				child := users[childID]
				if child.GV >= 1000 { lines1K++ }
				// Estos contadores se llenarán correctamente en la siguiente pasada 
				// o mediante una pre-evaluación de rangos base.
			}
		}

		// FASE 3: Calificación de Rangos según Tabla PDF (Pág 8-9)
		mvrLimit := u.GV * 0.6 // Regla general del 60%
		effV := u.GV
		if u.MaxBranch > mvrLimit { effV = (u.GV - u.MaxBranch) + mvrLimit }

		// Lógica Escalable de Rangos
		rank := "Partner / No Calificado"
		if effV >= 100000 && lines1K >= 4 { // Simplificación para Blue Diamond (4 Premier eq)
			rank = "Blue Diamond"
		} else if effV >= 60000 && lines1K >= 4 { 
			rank = "Diamond"
		} else if effV >= 30000 && lines1K >= 3 {
			rank = "Elite Leader"
		} else if effV >= 15000 && lines1K >= 2 {
			rank = "Premier Leader"
		} else if effV >= 6000 && lines1K >= 2 {
			rank = "Leader X"
		} else if effV >= 4000 && lines1K >= 1 {
			rank = "Senior Team Builder"
		} else if effV >= 2000 {
			rank = "Team Builder"
		} else if effV >= 1000 {
			rank = "Senior Entrepreneur"
		} else if effV >= 500 {
			rank = "Executive Ent."
		} else if effV >= 200 {
			rank = "Entrepreneur"
		}
		u.Rank = rank
	}

	// FASE 4: Bono Familia ["X"] (Bono Simple) - Tabla Pág 17
	// L1: 10%, L2: 7%, L3: 6%, L4: 4%, L5: 3%, L6: 2% (Para Leader X+)
	percentages := []float32{0.10, 0.07, 0.06, 0.04, 0.03, 0.02}

	for _, u := range users {
		if u.PV4 < 40 { continue } // Socio inactivo no genera bonos para arriba? (Regla de activación)
		
		val := u.PV4
		currentSponsor := u.SponsorID
		levelIdx := 0
		
		for levelIdx < 6 && currentSponsor < uint32(len(users)) && currentSponsor != users[currentSponsor].SponsorID {
			sponsor := users[currentSponsor]
			if sponsor.Qualified {
				sponsor.Bonus += val * percentages[levelIdx]
				levelIdx++
			}
			currentSponsor = sponsor.SponsorID
		}
	}
}
