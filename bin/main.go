package main

import (
	"flag"
	"net/http"
	"os"
	"strconv"
	"sync"
	"text/template"

	"github.com/gorilla/websocket"
)

// Helper to make Gorilla Websocket threadsafe
type threadSafeWriter struct {
	*websocket.Conn
	sync.Mutex
}

func (t *threadSafeWriter) WriteJSON(v interface{}) error {
	t.Lock()
	defer t.Unlock()

	return t.Conn.WriteJSON(v)
}

func httpServer(hub *Hub) {
	port := flag.Int("port", 8080, "http server port")
	fs := http.FileServer(http.Dir("../static"))

	http.Handle("/static/", http.StripPrefix("/static", fs))

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		indexHTML, err := os.ReadFile("../static/index.html")
		if err != nil {
			panic(err)
		}
		homeTemplate := template.Must(template.New("").Parse(string(indexHTML)))
		homeTemplate.Execute(w, "wss://"+r.Host+"/ws")
	})

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serverWs(w, r, hub)
	})

	http.ListenAndServe(":"+strconv.Itoa(*port), nil)
}

func serverWs(w http.ResponseWriter, r *http.Request, h *Hub) {
	upgrader := websocket.Upgrader{}
	unsafeConn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		panic(err)
	}

	c := &threadSafeWriter{unsafeConn, sync.Mutex{}}

	client := &Client{hub: h, threadSafeWriter: c, send: make(chan []byte, 256)}
	client.hub.register <- client

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go client.writePump()
	go client.readPump()
}

func main() {
	hub := newHub()
	go hub.run()

	httpServer(hub)
}
