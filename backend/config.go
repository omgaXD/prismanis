package main

import (
	"os"
	"path/filepath"
	"sync"
)

type Config struct {
	IsDev      bool
	CertFile   string
	KeyFile    string
	DomainName string
	ViteOrigin string
	WebRoot    string
	Manifest   map[string]ManifestEntry
}

var (
	configInstance Config
	once           sync.Once
)

func GetConfig() Config {
	once.Do(func() {
		env := os.Getenv("APP_ENV")
		certFile := os.Getenv("CERT_FILE")
		keyFile := os.Getenv("KEY_FILE")
		domainName := os.Getenv("DOMAIN_NAME")

		isDev := env != "production"
		viteOrigin := "http://localhost:5173" // Default Vite port
		manifest := make(map[string]ManifestEntry)

		// Paths
		cwd, _ := os.Getwd()
		var webRoot string
		if isDev {
			webRoot = filepath.Join(cwd, "web", "src")
		} else {
			webRoot = filepath.Join(cwd, "web", "out")
			loadManifest(filepath.Join(webRoot, ".vite", "manifest.json"), &manifest)
		}

		configInstance = Config{
			IsDev:      isDev,
			CertFile:   certFile,
			KeyFile:    keyFile,
			DomainName: domainName,
			ViteOrigin: viteOrigin,
			WebRoot:    webRoot,
			Manifest:   manifest,
		}
	})
	return configInstance
}