package main

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

type BaseMessage struct {
	Data  int    `json:"data"`
	Topic string `json:"topic"`
}

type Client struct {
	*threadSafeWriter

	hub *Hub

	send chan []byte
}

func (c *Client) writePump() {
	ticker := time.NewTicker(1 * time.Second)

	defer func() {
		c.Conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.send:
			if !ok {
				return
			}
			log.Println("sending..")
			w, err := c.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(msg)
		case <-ticker.C:
			sendMsg := &BaseMessage{Data: len(c.hub.clients), Topic: "user-info"}
			m, err := json.Marshal(sendMsg)
			if err != nil {
				return
			}
			w, err := c.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(m)
		}
	}
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.Conn.Close()
	}()

	for {
		_, msg, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			} else if websocket.IsCloseError(err, 1001) {
				log.Printf("connection close: %v", err)
				c.hub.unregister <- c
			}
			break
		}
		if len(c.hub.clients) > 1 {
			clientConnData := clientConn{}
			clientConnData.client = c
			clientConnData.msg = msg

			c.hub.broadcast <- clientConnData
		}
	}
}
