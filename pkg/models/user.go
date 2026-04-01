package models

type User struct {
	ID        uint32    `json:"id"`
	SponsorID uint32    `json:"sponsorId"`
	PV4       float32   `json:"pv4"` // Total 4 weeks personal volume
	GV        float32   `json:"gv"` // Group Volume
	MaxBranch float32   `json:"maxBranch"` // Largest leg volume (for MVR)
	Rank      string    `json:"rank"`
	PrevRank  string    `json:"prevRank"`
	Bonus     float32   `json:"bonus"`
	Children  []uint32  `json:"children"`
	Level     int       `json:"level"`
	Qualified bool      `json:"qualified"` // Activity status (PV4 >= 50)
	QualifiedDirects int `json:"qualifiedDirects"` // Number of direct partners with a rank >= Executive
}

type SimulationStats struct {
	TotalUsers    int            `json:"totalUsers"`
	ExecutionTime string         `json:"executionTime"`
	TotalVolume   float32        `json:"totalVolume"`
	TotalBonus    float32        `json:"totalBonus"`
	AveragePV4    float32        `json:"avgPv4"`
	RanksSummary  map[string]int `json:"ranksSummary"`
	RankUps       int            `json:"rankUps"`
	Logs          []string       `json:"logs"`
}
