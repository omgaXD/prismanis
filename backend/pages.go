package main

import (
	"html/template"
	"log"
	"maps"
	"net/http"
	"path/filepath"
)

type DataProviderFunc func(r *http.Request) map[string]interface{}

type Page struct {
	Templates []string
	DataFunc  DataProviderFunc
}

func servePages() {
	registerPage("/", []string{"base.html", "index.html"}, func(r *http.Request) map[string]interface{} {
		return map[string]any{
			"Title": "Prismanis - Home",
		}
	})
	registerPage("/prismanis", []string{"base.html", "prismanis.html"}, func(r *http.Request) map[string]interface{} {
		return map[string]any{
			"Title":    "Prismanis - Canvas",
			"ViteHead": generateViteTags("ts/main.ts", "ts/prismanis/index.ts"),
		}
	})
}

func registerPage(path string, templateFiles []string, dataFunc DataProviderFunc) {
	config := GetConfig()

	http.HandleFunc(path, func(w http.ResponseWriter, r *http.Request) {
		var fullPaths []string
		for _, file := range templateFiles {
			fullPaths = append(fullPaths, filepath.Join(config.WebRoot, "templates", file))
		}

		tmpl, err := template.ParseFiles(fullPaths...)
		if err != nil {
			http.Error(w, "Could not load templates: "+err.Error(), http.StatusInternalServerError)
			return
		}

		data := map[string]interface{}{
			"ViteHead": generateViteTags("ts/main.ts"),
			"IsDev":    config.IsDev,
			"Page":     path,
			"Protocol": r.URL.Scheme,
			"Host":     r.Host,
		}

		if dataFunc != nil {
			pageData := dataFunc(r)
			maps.Copy(data, pageData)
		}

		err = tmpl.ExecuteTemplate(w, "base.html", data)
		if err != nil {
			log.Printf("Template execution error: %v", err)
		}
	})
}
