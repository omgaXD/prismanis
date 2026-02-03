package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"os"
	"path/filepath"
)

type ManifestEntry struct {
	File    string   `json:"file"`
	Src     string   `json:"src"`
	Css     []string `json:"css"`
	IsEntry bool     `json:"isEntry"`
}


func loadManifest(path string, into *map[string]ManifestEntry) {
	data, err := os.ReadFile(path)
	if err != nil {
		// Try fallback path just in case (older vite versions put it in root of outDir)
		fallback := filepath.Join(filepath.Dir(filepath.Dir(path)), "manifest.json")
		data, err = os.ReadFile(fallback)
		if err != nil {
			log.Printf("Warning: Could not read manifest.json at %s: %v", path, err)
			return
		}
	}

	err = json.Unmarshal(data, into)
	if err != nil {
		log.Printf("Warning: Could not parse manifest.json: %v", err)
	}
}

func generateViteTags(entryPoints ...string) template.HTML {
	var html string
	config := GetConfig()	

	if config.IsDev {
		html += fmt.Sprintf(`<script type="module" src="%s/@vite/client"></script>`, config.ViteOrigin)
		for _, entry := range entryPoints {
			html += fmt.Sprintf(`<script type="module" src="%s/%s"></script>`, config.ViteOrigin, entry)
		}
		return template.HTML(html)
	}

	for _, entryPoint := range entryPoints {
		entry, ok := config.Manifest[entryPoint]
		if !ok {
			html += fmt.Sprintf("<!-- Vite entry '%s' not found in manifest -->", entryPoint)
			continue
		}

		html += fmt.Sprintf(`<script type="module" src="/%s"></script>`, entry.File)

		// Add CSS chunks
		for _, cssFile := range entry.Css {
			html += fmt.Sprintf(`<link rel="stylesheet" href="/%s">`, cssFile)
		}
	}

	return template.HTML(html)
}
