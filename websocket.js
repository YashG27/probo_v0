import express from 'express'
import { WebSocketServer } from 'ws'
import { createClient } from 'redis'

const client = createClient();
const app = express()
const httpServer = app.listen(8080)

let subscriptions = {
    stock : {
        connections : []
    }
};

function handleIncomingMessage(ws, data){
    // const { orderbook } = JSON.parse(data)
    // const symbol = Object.keys(orderbook)[0]
    const symbol = data.symbol
    if( !data.method || ! data.symbol){
        ws.send('Provide a method and symbol name');
        return;
    }
    if(data.method === 'SUBSCRIBE'){
        if(!subscriptions[symbol]){
            subscriptions[symbol] ={ connections : [] };
        }
        subscriptions[symbol]["connections"].push(ws)
        ws.send(`Subscribed to ${symbol}`)
    }
    if(data.method === 'UNSUBSCRIBE'){
        const index = subscriptions[symbol]["connections"].indexOf(ws);
        if(!index){
            ws.send('Subscription does not exist');
            return ;
        }
        delete subscriptions[symbol]["connections"][index];
        ws.send('Unsubscribed successful    ly')
    }
}

function onConnectionClose(ws){
    for ( let symbol in subscriptions){
        subscriptions[symbol].connections = subscriptions[symbol].connections.filter( (data) => data !== ws)
    }
    console.log('Client Disconnected')
}

async function sendUpdates(orderBook){
    const symbol = Object.keys(orderBook)[0];
    if (symbol){
        subscriptions[symbol]['connections'].forEach(ws => {
            if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify(orderBook));
            }
        });
    }
}

const wss = new WebSocketServer({ server: httpServer });
wss.on('connection', async function connection(ws) {
  ws.on('error', console.error);
  await client.connect();
  ws.on('message', function message(data) {
    data = JSON.parse(data);
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            handleIncomingMessage(ws, data);
        }
    });
  });

  ws.on('close', () => {
    onConnectionClose(ws)
  })
  ws.send('Hello! Message From Server!!');
});


async function startWorker() {
    try {
        await client.connect();
        console.log("Worker connected to Redis.");

        // Main loop
        while (true) {
            const response = await client.brPop('orderbookUpdate');
            if(response){
                let orderbook = JSON.parse(response.element);
                await sendUpdates(orderbook)
            }
        }
    }catch (error){
        console.error("Error processing submission:", error);
        // Implement your error handling logic here. For example, you might want to push
        // the submission back onto the queue or log the error to a file.
    }
}
startWorker();