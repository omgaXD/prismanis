package main

import (
	"fmt"
	"log"
	"net/http"
)

func serveStaticFiles() {
	config := GetConfig()

	fs := http.FileServer(http.Dir(config.WebRoot))
	http.Handle("/static/", fs)
	if !config.IsDev {
		http.Handle("/assets/", fs) // Vite builds to /assets inside outDir
	}
	serveFavicon()
}

func serveFavicon() {
	http.HandleFunc("/favicon.ico", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/static/assets/img/favicon.ico", http.StatusMovedPermanently)
	})
}


func listenAndServe() {
	config := GetConfig()

	devPort := ":8080"
	fmt.Printf("Server starting on http://localhost%s (Mode: %s)\n", devPort, map[bool]string{true: "Development", false: "Production"}[config.IsDev])
	if config.IsDev {
		fmt.Printf("Ensure 'npm run dev' is running in another terminal.\n")
	}
	if !config.IsDev && config.CertFile != "" && config.KeyFile != "" && config.DomainName != "" {
		// Redirect HTTP to HTTPS
		go func() {
			http.ListenAndServe(":80", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				http.Redirect(w, r, "https://"+config.DomainName+r.RequestURI, http.StatusMovedPermanently)
			}))
		}()
		fmt.Printf("Running with TLS on https://%s\n", config.DomainName)
		log.Fatal(http.ListenAndServeTLS(":443", config.CertFile, config.KeyFile, nil))
		return
	} else {
		fmt.Printf("Warning: TLS not configured, running over HTTP.\n")
		log.Fatal(http.ListenAndServe(devPort, nil))
	}
}
